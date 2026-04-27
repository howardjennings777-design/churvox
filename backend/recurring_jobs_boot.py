"""Churvox recurring jobs boot layer.

Turns recurring job settings into real future jobs.
This is deliberately defensive and idempotent:
- creates the next instance only once per recurrence date
- copies practical job fields
- resets worker-progress fields, photos, invoice links and completion state
- keeps business isolation fields intact
"""
from __future__ import annotations

import asyncio
from calendar import monthrange
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Tuple

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

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


def _role(user: Dict[str, Any]) -> str:
    return str(user.get("role") or "").lower().strip()


def _business_id(user: Dict[str, Any]) -> str:
    return _safe_id(user.get("business_id") or user.get("owner_id") or user.get("id") or user.get("_id"))


def _allowed(user: Dict[str, Any] | None) -> bool:
    if not user:
        return False
    if user.get("is_admin") or user.get("is_platform_owner"):
        return True
    return _role(user) in {"owner", "employer", "admin", "manager", "office_admin"}


def _parse_date(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value.strip():
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            try:
                return datetime.fromisoformat(value[:16]).replace(tzinfo=timezone.utc)
            except Exception:
                return None
    return None


def _iso_minute(value: datetime) -> str:
    return value.replace(second=0, microsecond=0).isoformat()


def _add_month(value: datetime) -> datetime:
    month = value.month + 1
    year = value.year
    if month > 12:
        month = 1
        year += 1
    day = min(value.day, monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def _next_date(value: datetime, frequency: str) -> datetime:
    freq = str(frequency or "weekly").lower().strip()
    if freq in {"fortnightly", "biweekly", "two_weekly", "2_weekly"}:
        return value + timedelta(days=14)
    if freq in {"monthly", "month"}:
        return _add_month(value)
    if freq in {"daily", "day"}:
        return value + timedelta(days=1)
    return value + timedelta(days=7)


def _series_id(job: Dict[str, Any]) -> str:
    return _safe_id(job.get("recurring_series_id") or job.get("recurring_source_job_id") or job.get("_id"))


def _generation_key(series_id: str, run_at: datetime) -> str:
    return f"{series_id}:{_iso_minute(run_at)}"


def _business_id_from_record(record: Dict[str, Any]) -> str:
    return _safe_id(record.get("business_id") or record.get("owner_id") or record.get("user_id"))


def _copy_for_next(source: Dict[str, Any], run_at: datetime, series_id: str, generation_key: str) -> Dict[str, Any]:
    drop_fields = {
        "_id", "id", "created_at", "updated_at", "accepted_at", "started_at", "paused_at", "resumed_at", "completed_at",
        "invoice_id", "invoice_number", "invoice_created_at", "quote_id", "photos", "worker_notes", "time_entries",
        "time_spent_minutes", "total_time_seconds", "worked_seconds", "net_worked_seconds", "pause_periods",
        "start_lat", "start_lng", "location_status", "location_captured_at",
        "automation_job_completed_emitted", "automation_job_completed_summary", "automation_job_completed_at",
        "automation_job_assigned_emitted", "automation_job_assigned_summary", "automation_job_assigned_at",
        "automation_worker_notes_fingerprint", "automation_worker_note_summary", "automation_worker_note_at",
        "automation_worker_photos_count", "automation_worker_photo_summary", "automation_worker_photo_at",
        "recurring_next_generated_key", "recurring_next_generated_at", "recurring_child_job_id",
    }
    doc = {k: v for k, v in source.items() if k not in drop_fields}
    doc.update({
        "title": source.get("title") or "Recurring job",
        "scheduled_date": _iso_minute(run_at),
        "status": "assigned",
        "is_recurring": True,
        "recurring": True,
        "recurring_frequency": source.get("recurring_frequency") or source.get("frequency") or "weekly",
        "recurring_series_id": series_id,
        "recurring_parent_job_id": _safe_id(source.get("_id")),
        "recurring_source_job_id": series_id,
        "recurring_generation_key": generation_key,
        "created_from_recurring": True,
        "created_at": _now(),
        "updated_at": _now(),
        "photos": [],
        "worker_notes": "",
        "time_spent_minutes": 0,
        "checklist_items": source.get("checklist_items") or source.get("checklist") or [],
    })
    return doc


async def _ensure_indexes(db) -> None:
    try:
        await db.jobs.create_index("recurring_generation_key", unique=True, sparse=True)
        await db.jobs.create_index([("recurring_series_id", 1), ("scheduled_date", 1)])
    except Exception as exc:
        print(f"RECURRING_JOBS_INDEX_ERR {exc}")


async def _generate_for_job(db, job: Dict[str, Any], lookahead_days: int = 35) -> Tuple[bool, str]:
    if str(job.get("status") or "").lower() == "cancelled":
        return False, "cancelled"
    if not (job.get("is_recurring") or job.get("recurring") or job.get("recurrence")):
        return False, "not_recurring"

    scheduled = _parse_date(job.get("scheduled_date") or job.get("date") or job.get("start_date"))
    if not scheduled:
        return False, "missing_scheduled_date"

    next_run = _next_date(scheduled, job.get("recurring_frequency") or job.get("frequency") or "weekly")
    if next_run > _now() + timedelta(days=lookahead_days):
        return False, "outside_lookahead"

    series_id = _series_id(job)
    key = _generation_key(series_id, next_run)
    if job.get("recurring_next_generated_key") == key:
        return False, "already_marked"

    existing = await db.jobs.find_one({"recurring_generation_key": key})
    if existing:
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"recurring_next_generated_key": key, "recurring_child_job_id": _safe_id(existing.get("_id")), "recurring_next_generated_at": _now()}})
        return False, "duplicate_exists"

    doc = _copy_for_next(job, next_run, series_id, key)
    try:
        result = await db.jobs.insert_one(doc)
    except Exception as exc:
        if "duplicate" in str(exc).lower():
            return False, "duplicate_race"
        raise

    await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"recurring_series_id": series_id, "recurring_next_generated_key": key, "recurring_child_job_id": _safe_id(result.inserted_id), "recurring_next_generated_at": _now()}})
    return True, _safe_id(result.inserted_id)


async def _sweep_once(db, lookahead_days: int = 35) -> Dict[str, Any]:
    await _ensure_indexes(db)
    created = 0
    checked = 0
    skipped: Dict[str, int] = {}
    created_ids: List[str] = []
    query = {
        "$or": [
            {"is_recurring": True},
            {"recurring": True},
            {"recurrence": {"$exists": True, "$nin": [None, ""]}},
        ]
    }
    cursor = db.jobs.find(query).sort("scheduled_date", 1).limit(300)
    async for job in cursor:
        checked += 1
        made, reason = await _generate_for_job(db, job, lookahead_days=lookahead_days)
        if made:
            created += 1
            created_ids.append(reason)
        else:
            skipped[reason] = skipped.get(reason, 0) + 1
    return {"success": True, "checked": checked, "created": created, "created_job_ids": created_ids[:50], "skipped": skipped, "checked_at": _now().isoformat()}


async def _loop(db):
    await asyncio.sleep(8)
    while True:
        try:
            summary = await _sweep_once(db)
            if summary.get("created", 0):
                print(f"RECURRING_JOBS_SWEEP {summary}")
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"RECURRING_JOBS_SWEEP_ERR {exc}")
        await asyncio.sleep(6 * 60 * 60)


def install_recurring_jobs_boot(server_module) -> None:
    global _INSTALLED, _TASK
    if _INSTALLED:
        return

    app = getattr(server_module, "app", None)
    db = getattr(server_module, "db", None)
    get_current_user = getattr(server_module, "get_current_user", None)
    if app is None or db is None:
        return

    _INSTALLED = True

    @app.on_event("startup")
    async def _start_recurring_jobs_sweep():
        global _TASK
        if _TASK is None or _TASK.done():
            _TASK = asyncio.create_task(_loop(db))

    @app.on_event("shutdown")
    async def _stop_recurring_jobs_sweep():
        global _TASK
        if _TASK is not None and not _TASK.done():
            _TASK.cancel()

    router = APIRouter(prefix="/api/recurring-jobs", tags=["recurring-jobs"])

    if get_current_user:
        async def require_user(current_user: Dict[str, Any] = Depends(get_current_user)):
            if not _allowed(current_user):
                raise HTTPException(status_code=403, detail="Recurring jobs access required")
            return current_user
    else:
        async def require_user():
            raise HTTPException(status_code=503, detail="Auth dependency unavailable")

    @router.get("/health")
    async def recurring_jobs_health(_: Dict[str, Any] = Depends(require_user)):
        return {"success": True, "installed": True, "running": bool(_TASK and not _TASK.done())}

    @router.post("/sweep-now")
    async def recurring_jobs_sweep_now(_: Dict[str, Any] = Depends(require_user)):
        return await _sweep_once(db)

    app.include_router(router)
    print("RECURRING_JOBS_BOOT_INSTALLED")
