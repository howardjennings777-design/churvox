"""Churvox top-player automation boot layer.

This is intentionally small and defensive. It does not replace the main API.
It quietly adds the missing launch wiring that turns real actions into automation:
- quote accepted -> automation quote_accepted
- job completed -> automation job_completed
- invoice overdue -> automation invoice_overdue
- default system automation rules per business

The sweep is best-effort and never blocks customer/worker actions.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List

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
    return _safe_id(user.get("business_id") or user.get("id") or user.get("_id"))


def _business_id_from_record(record: Dict[str, Any]) -> str:
    return _safe_id(record.get("business_id") or record.get("owner_id") or record.get("user_id"))


def _system_rules_for_business(business_id: str) -> List[Dict[str, Any]]:
    return [
        {
            "system_rule_key": "quote_accepted_create_job",
            "name": "Quote accepted → create job",
            "description": "Automatically creates a job when a customer accepts a quote.",
            "trigger": "quote_accepted",
            "actions": [
                {"type": "create_job_from_quote", "config": {}},
                {"type": "notify_owner", "config": {"title": "Quote accepted", "message": "A customer accepted a quote. Churvox created a job for review."}},
            ],
        },
        {
            "system_rule_key": "job_completed_create_invoice",
            "name": "Completed job → draft invoice",
            "description": "Automatically creates a draft invoice when a job is completed.",
            "trigger": "job_completed",
            "actions": [
                {"type": "create_invoice_from_job", "config": {}},
                {"type": "notify_owner", "config": {"title": "Job completed", "message": "A completed job has a draft invoice ready for review."}},
            ],
        },
        {
            "system_rule_key": "job_assigned_notify_worker",
            "name": "Job assigned → notify worker",
            "description": "Notifies the assigned worker when a job is assigned.",
            "trigger": "job_assigned",
            "actions": [
                {"type": "notify_worker", "config": {"title": "New assigned job", "message": "You have a new job assigned in Churvox."}},
            ],
        },
        {
            "system_rule_key": "worker_update_notify_owner",
            "name": "Worker update → owner/admin alert",
            "description": "Notifies owners/admins when workers add notes or photos.",
            "trigger": "worker_note_added",
            "actions": [
                {"type": "notify_owner", "config": {"title": "Worker update", "message": "A worker added an update to a job."}},
            ],
        },
        {
            "system_rule_key": "worker_photo_notify_owner",
            "name": "Worker photo → owner/admin alert",
            "description": "Notifies owners/admins when workers upload photos.",
            "trigger": "worker_photo_uploaded",
            "actions": [
                {"type": "notify_owner", "config": {"title": "Worker photo uploaded", "message": "A worker uploaded a job photo."}},
            ],
        },
        {
            "system_rule_key": "invoice_overdue_followup",
            "name": "Invoice overdue → follow-up",
            "description": "Creates a follow-up task and owner alert for overdue invoices.",
            "trigger": "invoice_overdue",
            "actions": [
                {"type": "create_follow_up_task_stub", "config": {"title": "Follow up overdue invoice", "description": "An invoice is overdue and needs follow-up.", "related_type": "invoice"}},
                {"type": "notify_owner", "config": {"title": "Invoice overdue", "message": "An invoice is overdue and needs follow-up."}},
            ],
        },
        {
            "system_rule_key": "payroll_ready_alert",
            "name": "Payroll ready → payroll alert",
            "description": "Alerts payroll/admin users when payroll is ready for review.",
            "trigger": "payroll_status_updated",
            "actions": [
                {"type": "payroll_admin_alert", "config": {"title": "Payroll ready", "message": "Payroll is ready for review."}},
            ],
        },
    ]


async def _business_ids(db) -> List[str]:
    ids = set()
    try:
        cursor = db.users.find({"role": {"$in": ["owner", "employer", "admin", "manager", "office_admin"]}}).limit(500)
        async for user in cursor:
            bid = _business_id_from_user(user)
            if bid:
                ids.add(bid)
    except Exception as exc:
        print(f"TOP_PLAYER_BUSINESS_IDS_ERR {exc}")
    return sorted(ids)


async def _ensure_default_rules(db) -> int:
    created = 0
    for business_id in await _business_ids(db):
        for base in _system_rules_for_business(business_id):
            rule = {
                **base,
                "business_id": business_id,
                "enabled": True,
                "condition_mode": "all",
                "conditions": [],
                "source": "system_top_player_default",
                "updated_at": _now(),
            }
            existing = await db.automation_rules.find_one({
                "business_id": business_id,
                "system_rule_key": base["system_rule_key"],
            })
            if existing:
                # Keep user pause choice, but repair trigger/actions/name if a previous default was weak.
                await db.automation_rules.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {k: v for k, v in rule.items() if k != "enabled"}},
                )
            else:
                rule["created_at"] = _now()
                await db.automation_rules.insert_one(rule)
                created += 1
    return created


async def _emit_quote_accepts(db, auto) -> int:
    emitted = 0
    query = {
        "status": "accepted",
        "$or": [
            {"automation_quote_accepted_emitted": {"$ne": True}},
            {"automation_quote_accepted_emitted": {"$exists": False}},
        ],
    }
    cursor = db.quotes.find(query).sort("updated_at", -1).limit(50)
    async for quote in cursor:
        business_id = _business_id_from_record(quote)
        if not business_id:
            await db.quotes.update_one({"_id": quote["_id"]}, {"$set": {"automation_quote_accepted_emitted": True, "automation_emit_skipped": "missing_business_id"}})
            continue
        payload = {
            "business_id": business_id,
            "quote_id": _safe_id(quote.get("_id")),
            "quote": _json_safe({**quote, "id": _safe_id(quote.get("_id"))}),
            "actor": {"role": "customer", "source": "public_quote"},
        }
        summary = await auto.emit_event(db, "quote_accepted", payload)
        await db.quotes.update_one({"_id": quote["_id"]}, {"$set": {
            "automation_quote_accepted_emitted": True,
            "automation_quote_accepted_summary": _json_safe(summary),
            "automation_quote_accepted_at": _now(),
        }})
        emitted += 1
    return emitted


async def _emit_job_completions(db, auto) -> int:
    emitted = 0
    query = {
        "$or": [
            {"status": "completed"},
            {"job_status": "completed"},
            {"workflow_status": "completed"},
            {"completed": True},
            {"completed_at": {"$exists": True, "$ne": None}},
        ],
        "$and": [
            {"$or": [
                {"automation_job_completed_emitted": {"$ne": True}},
                {"automation_job_completed_emitted": {"$exists": False}},
            ]}
        ],
    }
    cursor = db.jobs.find(query).sort("updated_at", -1).limit(50)
    async for job in cursor:
        business_id = _business_id_from_record(job)
        if not business_id:
            await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"automation_job_completed_emitted": True, "automation_emit_skipped": "missing_business_id"}})
            continue
        payload = {
            "business_id": business_id,
            "job_id": _safe_id(job.get("_id")),
            "job": _json_safe({**job, "id": _safe_id(job.get("_id"))}),
            "actor": {"role": "system", "source": "job_completion_sweep"},
        }
        summary = await auto.emit_event(db, "job_completed", payload)
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": {
            "automation_job_completed_emitted": True,
            "automation_job_completed_summary": _json_safe(summary),
            "automation_job_completed_at": _now(),
        }})
        emitted += 1
    return emitted


async def _emit_invoice_overdues(db, auto) -> int:
    emitted = 0
    now = _now()
    query = {
        "status": {"$in": ["sent", "overdue"]},
        "due_date": {"$lt": now},
        "$or": [
            {"automation_invoice_overdue_emitted": {"$ne": True}},
            {"automation_invoice_overdue_emitted": {"$exists": False}},
        ],
    }
    cursor = db.invoices.find(query).sort("due_date", 1).limit(50)
    async for invoice in cursor:
        business_id = _business_id_from_record(invoice)
        if not business_id:
            await db.invoices.update_one({"_id": invoice["_id"]}, {"$set": {"automation_invoice_overdue_emitted": True, "automation_emit_skipped": "missing_business_id"}})
            continue
        await db.invoices.update_one({"_id": invoice["_id"]}, {"$set": {"status": "overdue", "updated_at": now}})
        payload = {
            "business_id": business_id,
            "invoice_id": _safe_id(invoice.get("_id")),
            "invoice": _json_safe({**invoice, "id": _safe_id(invoice.get("_id")), "status": "overdue"}),
            "actor": {"role": "system", "source": "invoice_overdue_sweep"},
        }
        summary = await auto.emit_event(db, "invoice_overdue", payload)
        await db.invoices.update_one({"_id": invoice["_id"]}, {"$set": {
            "automation_invoice_overdue_emitted": True,
            "automation_invoice_overdue_summary": _json_safe(summary),
            "automation_invoice_overdue_at": now,
        }})
        emitted += 1
    return emitted


async def _sweep_once(db, auto) -> Dict[str, Any]:
    created_rules = await _ensure_default_rules(db)
    quote_events = await _emit_quote_accepts(db, auto)
    job_events = await _emit_job_completions(db, auto)
    overdue_events = await _emit_invoice_overdues(db, auto)
    return {
        "created_rules": created_rules,
        "quote_events": quote_events,
        "job_events": job_events,
        "overdue_events": overdue_events,
        "checked_at": _now().isoformat(),
    }


async def _loop(db, auto):
    await asyncio.sleep(4)
    while True:
        try:
            summary = await _sweep_once(db, auto)
            if any(summary.get(k, 0) for k in ["created_rules", "quote_events", "job_events", "overdue_events"]):
                print(f"TOP_PLAYER_SWEEP {summary}")
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"TOP_PLAYER_SWEEP_ERR {exc}")
        await asyncio.sleep(30)


def install_top_player_boot(server_module) -> None:
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
    async def _start_top_player_sweep():
        global _TASK
        if _TASK is None or _TASK.done():
            _TASK = asyncio.create_task(_loop(db, auto))

    @app.on_event("shutdown")
    async def _stop_top_player_sweep():
        global _TASK
        if _TASK is not None and not _TASK.done():
            _TASK.cancel()

    router = APIRouter(prefix="/api/top-player", tags=["top-player"])

    @router.get("/health")
    async def top_player_health():
        return {"success": True, "installed": True, "running": bool(_TASK and not _TASK.done())}

    @router.post("/sweep-now")
    async def top_player_sweep_now():
        return {"success": True, "data": await _sweep_once(db, auto)}

    app.include_router(router)
    print("TOP_PLAYER_BOOT_INSTALLED")
