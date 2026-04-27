"""Churvox checklist automation boot layer.

Makes job checklist completion a real automation event.
When every checklist item on a job is ticked, Churvox emits
`job_checklist_completed` and repairs a default owner-alert rule per business.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

from bson import ObjectId
from fastapi import APIRouter

_INSTALLED = False
_TASK = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_id(value: Any) -> str:
    if not value:
        return ""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return str(value.get("$oid") or value.get("id") or value.get("_id") or "")
    return str(value)


def _json_safe(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


def _business_id_from_user(user: Dict[str, Any]) -> str:
    return _safe_id(user.get("business_id") or user.get("owner_id") or user.get("id") or user.get("_id"))


def _business_id_from_record(record: Dict[str, Any]) -> str:
    return _safe_id(record.get("business_id") or record.get("owner_id") or record.get("user_id"))


def _normalise_checklist(items: Any) -> List[Dict[str, Any]]:
    if not isinstance(items, list):
        return []
    normalised: List[Dict[str, Any]] = []
    for index, item in enumerate(items):
        if isinstance(item, str):
            label = item.strip()
            if label:
                normalised.append({"id": f"item-{index}", "label": label, "done": False})
            continue
        if isinstance(item, dict):
            label = str(item.get("label") or item.get("title") or item.get("text") or "Checklist item").strip()
            if label:
                normalised.append({
                    "id": _safe_id(item.get("id") or item.get("_id") or f"item-{index}"),
                    "label": label,
                    "done": bool(item.get("done") or item.get("completed") or item.get("checked")),
                    "completed_at": item.get("completed_at"),
                })
    return normalised


def _checklist_progress(job: Dict[str, Any]) -> Tuple[int, int, int]:
    items = _normalise_checklist(job.get("checklist_items") or job.get("checklist") or [])
    total = len(items)
    done = len([item for item in items if item.get("done")])
    percent = round((done / total) * 100) if total else 0
    return total, done, percent


async def _business_ids(db) -> List[str]:
    ids = set()
    try:
        cursor = db.users.find({"role": {"$in": ["owner", "employer", "admin", "manager", "office_admin"]}}).limit(500)
        async for user in cursor:
            bid = _business_id_from_user(user)
            if bid:
                ids.add(bid)
    except Exception as exc:
        print(f"CHECKLIST_AUTOMATION_BUSINESS_IDS_ERR {exc}")
    return sorted(ids)


async def _ensure_default_rule(db) -> int:
    created = 0
    base = {
        "system_rule_key": "job_checklist_completed_notify_owner",
        "name": "Job checklist completed → owner alert",
        "description": "Notifies owners/admins when a worker finishes every checklist item on a job.",
        "trigger": "job_checklist_completed",
        "actions": [
            {"type": "notify_owner", "config": {"title": "Checklist completed", "message": "A job checklist has been completed and is ready for review."}},
        ],
    }
    for business_id in await _business_ids(db):
        rule = {
            **base,
            "business_id": business_id,
            "enabled": True,
            "condition_mode": "all",
            "conditions": [],
            "source": "system_checklist_default",
            "updated_at": _now(),
        }
        existing = await db.automation_rules.find_one({"business_id": business_id, "system_rule_key": base["system_rule_key"]})
        if existing:
            await db.automation_rules.update_one({"_id": existing["_id"]}, {"$set": {k: v for k, v in rule.items() if k != "enabled"}})
        else:
            rule["created_at"] = _now()
            await db.automation_rules.insert_one(rule)
            created += 1
    return created


async def _emit_completed_checklists(db, auto) -> int:
    emitted = 0
    query = {
        "$or": [
            {"checklist_items.0": {"$exists": True}},
            {"checklist.0": {"$exists": True}},
        ],
        "$or": [
            {"automation_checklist_completed_emitted": {"$ne": True}},
            {"automation_checklist_completed_emitted": {"$exists": False}},
        ],
    }
    cursor = db.jobs.find(query).sort("updated_at", -1).limit(100)
    async for job in cursor:
        total, done, percent = _checklist_progress(job)
        if not total or done < total:
            await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"checklist_progress_done": done, "checklist_progress_total": total, "checklist_progress_percent": percent}})
            continue

        business_id = _business_id_from_record(job)
        if not business_id:
            await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"automation_checklist_completed_emitted": True, "automation_emit_skipped": "missing_business_id"}})
            continue

        payload = {
            "business_id": business_id,
            "job_id": _safe_id(job.get("_id")),
            "job": _json_safe({**job, "id": _safe_id(job.get("_id"))}),
            "checklist_total": total,
            "checklist_done": done,
            "checklist_percent": percent,
            "actor": {"role": "system", "source": "checklist_completion_sweep"},
        }
        summary = await auto.emit_event(db, "job_checklist_completed", payload)
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": {
            "automation_checklist_completed_emitted": True,
            "automation_checklist_completed_summary": _json_safe(summary),
            "automation_checklist_completed_at": _now(),
            "checklist_progress_done": done,
            "checklist_progress_total": total,
            "checklist_progress_percent": percent,
        }})
        emitted += 1
    return emitted


async def _sweep_once(db, auto) -> Dict[str, Any]:
    created_rules = await _ensure_default_rule(db)
    checklist_events = await _emit_completed_checklists(db, auto)
    return {"success": True, "created_rules": created_rules, "checklist_events": checklist_events, "checked_at": _now().isoformat()}


async def _loop(db, auto):
    await asyncio.sleep(10)
    while True:
        try:
            summary = await _sweep_once(db, auto)
            if summary.get("created_rules") or summary.get("checklist_events"):
                print(f"CHECKLIST_AUTOMATION_SWEEP {summary}")
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"CHECKLIST_AUTOMATION_SWEEP_ERR {exc}")
        await asyncio.sleep(60)


def install_checklist_automation_boot(server_module) -> None:
    global _INSTALLED, _TASK
    if _INSTALLED:
        return

    app = getattr(server_module, "app", None)
    db = getattr(server_module, "db", None)
    auto = getattr(server_module, "auto", None)
    if app is None or db is None or auto is None:
        return

    _INSTALLED = True

    @app.on_event("startup")
    async def _start_checklist_automation_sweep():
        global _TASK
        if _TASK is None or _TASK.done():
            _TASK = asyncio.create_task(_loop(db, auto))

    @app.on_event("shutdown")
    async def _stop_checklist_automation_sweep():
        global _TASK
        if _TASK is not None and not _TASK.done():
            _TASK.cancel()

    router = APIRouter(prefix="/api/checklist-automation", tags=["checklist-automation"])

    @router.get("/health")
    async def checklist_automation_health():
        return {"success": True, "installed": True, "running": bool(_TASK and not _TASK.done())}

    @router.post("/sweep-now")
    async def checklist_automation_sweep_now():
        return await _sweep_once(db, auto)

    app.include_router(router)
    print("CHECKLIST_AUTOMATION_BOOT_INSTALLED")
