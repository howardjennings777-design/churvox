"""Ensure worker completion preserves elapsed timer time and starts Job Done."""

from __future__ import annotations

import builtins
import sys
from datetime import datetime, timezone

try:
    import churvox_os_v2_saved_records_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_command_prepared_slips_patch  # noqa: F401
except Exception:
    pass

_ORIGINAL_IMPORT = builtins.__import__
PATH = "/api/worker/jobs/{job_id}/complete"


def _utc():
    return datetime.now(timezone.utc)


def _parse_dt(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


def _seconds(job, now):
    base = int((job or {}).get("total_time_seconds") or (job or {}).get("time_seconds") or (job or {}).get("time_spent_seconds") or 0)
    if not (job or {}).get("timer_running"):
        return base
    started = _parse_dt((job or {}).get("timer_started_at") or (job or {}).get("current_timer_started_at") or (job or {}).get("started_at"))
    if not started:
        return base
    try:
        return max(base, base + max(0, int((now - started).total_seconds())))
    except Exception:
        return base


def _safe(doc):
    out = dict(doc or {})
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if isinstance(value, datetime):
            out[key] = value.isoformat()
        elif value.__class__.__name__ == "ObjectId":
            out[key] = str(value)
    return out


def _text(value, fallback=""):
    value = " ".join(str(value or "").strip().split())
    return value or fallback


def _route_matches(route):
    return getattr(route, "path", "") == PATH and "POST" in set(getattr(route, "methods", set()) or set())


def safe_existing_status(existing):
    status = _text((existing or {}).get("status"), "open")
    return status if status in {"open", "in_command", "waiting_proof"} else "open"


async def _seed_job_done(db, user, job, now):
    """Create the durable closeout identity at the exact worker-completion moment."""
    try:
        business_id = _text((job or {}).get("business_id") or (job or {}).get("businessId") or (job or {}).get("owner_id") or (user or {}).get("business_id") or (user or {}).get("id"), "")
        job_id = _text((job or {}).get("_id") or (job or {}).get("id"), "")
        if not business_id or not job_id:
            return None
        title = _text((job or {}).get("title") or (job or {}).get("job_title") or (job or {}).get("name") or (job or {}).get("service") or (job or {}).get("description"), "Completed job")
        client_id = _text((job or {}).get("client_id") or (job or {}).get("customer_id"), "")
        worker_id = _text((job or {}).get("worker_id") or (job or {}).get("assigned_worker_id") or (user or {}).get("id"), "")
        key = {"business_id": business_id, "job_collection": "jobs", "job_id": job_id}
        existing = await db.job_closeouts.find_one(key)
        existing_execution = (existing or {}).get("execution") if isinstance((existing or {}).get("execution"), dict) else {}
        preserve_approved = bool((existing or {}).get("status") == "approved" and existing_execution.get("applied"))
        seed_status = "approved" if preserve_approved else safe_existing_status(existing)
        seed_state = "approved" if preserve_approved else ("waiting_proof" if seed_status == "waiting_proof" else "scanning")
        await db.job_closeouts.update_one(
            key,
            {
                "$set": {
                    **key,
                    "contractor_id": (job or {}).get("contractor_id") or business_id,
                    "job_title": title,
                    "client_id": client_id,
                    "worker_ids": [worker_id] if worker_id else [],
                    "source_job_status": "completed",
                    "source_snapshot": {
                        "completed_at": now,
                        "scheduled_date": (job or {}).get("scheduled_date") or (job or {}).get("date"),
                        "notes": _text((job or {}).get("worker_notes") or (job or {}).get("completion_note") or (job or {}).get("notes"), ""),
                    },
                    "closeout_state": seed_state,
                    "status": seed_status,
                    "trigger": "worker_completion",
                    "updated_at": now,
                    "version": 1,
                },
                "$setOnInsert": {
                    "created_at": now,
                    "owner_decisions": [],
                    "execution": {},
                },
            },
            upsert=True,
        )
        stored = await db.job_closeouts.find_one(key)
        try:
            await db.field_activity_events.insert_one({
                "business_id": business_id,
                "contractor_id": (job or {}).get("contractor_id") or business_id,
                "event_type": "job_done_started",
                "title": title,
                "detail": "Worker completed the job. A persisted Job Done closeout was started for owner review.",
                "record_type": "job_closeout",
                "record_id": str((stored or {}).get("_id") or ""),
                "source_job_id": job_id,
                "status": "new",
                "source": "worker_completion",
                "created_at": now,
            })
        except Exception:
            pass
        return stored
    except Exception:
        # Completion must never fail because the follow-up closeout seed could not be written.
        return None


def _install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    HTTPException = getattr(module, "HTTPException", None)
    Request = getattr(module, "Request", None)
    if app is None or db is None or get_current_user is None or HTTPException is None or Request is None:
        return
    try:
        if hasattr(churvox_os_v2_saved_records_patch, "_install"):
            churvox_os_v2_saved_records_patch._install(module)
    except Exception:
        pass
    try:
        if hasattr(churvox_command_prepared_slips_patch, "_install"):
            churvox_command_prepared_slips_patch._install(module)
    except Exception:
        pass
    if getattr(app.state, "worker_complete_elapsed_patch", False):
        return
    try:
        import xero_routes
    except Exception:
        try:
            from backend import xero_routes  # type: ignore
        except Exception:
            return
    find_job = getattr(xero_routes, "_find_accessible_job", None)
    is_worker = getattr(xero_routes, "_is_worker_role", None)
    if not callable(find_job) or not callable(is_worker):
        return

    async def complete_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        if not is_worker(user):
            raise HTTPException(status_code=403, detail="Only assigned workers can complete field jobs")
        job = await find_job(db, job_id, user)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        now = _utc()
        total = _seconds(job, now)
        update = {
            "status": "completed",
            "job_status": "Completed",
            "completed": True,
            "completed_at": now,
            "timer_running": False,
            "timer_status": "stopped",
            "timer_started_at": None,
            "current_timer_started_at": None,
            "total_time_seconds": total,
            "time_seconds": total,
            "time_spent_seconds": total,
            "updated_at": now,
        }
        if isinstance(payload, dict) and "worker_notes" in payload:
            update["worker_notes"] = str(payload.get("worker_notes") or "")
        if isinstance(payload, dict):
            for source_key, target_key in [
                ("completion_photos", "completion_photos"),
                ("photos", "completion_photos"),
                ("completion_checklist", "completion_checklist"),
                ("extras", "extras"),
                ("extras_total", "extras_total"),
                ("materials", "materials"),
            ]:
                if source_key in payload:
                    update[target_key] = payload.get(source_key)
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": update})
        updated = await db.jobs.find_one({"_id": job["_id"]})
        closeout = await _seed_job_done(db, user, updated or {**job, **update}, now)
        return {
            "success": True,
            "status": "completed",
            "completed": True,
            "total_time_seconds": total,
            "job": _safe(updated),
            "job_done_started": bool(closeout),
            "job_done_closeout_id": str((closeout or {}).get("_id") or ""),
        }

    try:
        app.router.routes = [route for route in app.router.routes if not _route_matches(route)]
        app.add_api_route(PATH, complete_endpoint, methods=["POST"])
        app.state.worker_complete_elapsed_patch = True
    except Exception:
        pass


def _patched_import(name, globals=None, locals=None, fromlist=(), level=0):  # noqa: A002
    module = _ORIGINAL_IMPORT(name, globals, locals, fromlist, level)
    if name == "server" or name.endswith(".server"):
        _install(sys.modules.get(name) or module)
    return module


if getattr(builtins, "__churvox_worker_complete_elapsed_patch__", False) is not True:
    builtins.__churvox_worker_complete_elapsed_patch__ = True
    builtins.__import__ = _patched_import

for module_name in ("server", "backend.server"):
    loaded = sys.modules.get(module_name)
    if loaded is not None:
        _install(loaded)
