"""Prepared Command slips for Churvox.

This is safe groundwork for the Command engine: it does not auto-approve, auto-send,
file tax, or create payout files. It only gathers owner-review items.
"""

from __future__ import annotations

import builtins
import sys
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

_ORIGINAL_IMPORT = builtins.__import__


def _text(value):
    if value is None:
        return ""
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return str(value or "").strip()


def _business_id(user):
    return _text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or (user or {}).get("id") or (user or {}).get("_id"))


def _safe_dt(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return _text(value)


def _job_needs_review(job):
    missing = []
    if not _text(job.get("scheduled_date") or job.get("date") or job.get("start")):
        missing.append("date")
    if not _text(job.get("scheduled_time") or job.get("time")):
        missing.append("time")
    if not _text(job.get("price") or job.get("amount") or job.get("total")):
        missing.append("price")
    if not _text(job.get("assigned_worker_name") or job.get("assigned_to") or job.get("worker_name")):
        missing.append("worker")
    return missing


def _slip(kind, title, detail, source, priority="normal", record_id="", facts=None):
    return {
        "id": f"{kind}:{record_id or title}"[:120],
        "kind": kind,
        "title": title,
        "detail": detail,
        "source": source,
        "priority": priority,
        "record_id": record_id,
        "facts": facts or [],
        "actions": ["Approve", "Edit", "Park"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "guardrails": [
            "Owner approval required",
            "No automatic invoice sending",
            "No tax filing",
            "No bank payout files",
        ],
    }


def _install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if app is None or db is None or get_current_user is None or getattr(app.state, "command_prepared_slips_patch", False):
        return

    router = APIRouter(prefix="/api")

    @router.get("/command/prepared-slips")
    async def prepared_command_slips(current_user: dict = Depends(get_current_user)):
        bid = _business_id(current_user)
        slips = []

        try:
            cursor = db.jobs.find({"business_id": bid}).sort("updated_at", -1).limit(50)
            async for job in cursor:
                job_id = _text(job.get("_id"))
                title = _text(job.get("title") or job.get("job_name") or job.get("service_type") or "Job")
                client = _text(job.get("client_name") or job.get("customer_name") or job.get("client") or "Client")
                missing = _job_needs_review(job)
                status = _text(job.get("status") or job.get("job_status") or "")
                if missing:
                    slips.append(_slip(
                        "missing_detail",
                        f"{title} needs {', '.join(missing)}",
                        "Churvox found missing details before this work moves forward.",
                        "Jobs",
                        "high",
                        job_id,
                        [f"Client: {client}", f"Missing: {', '.join(missing)}", f"Status: {status or 'Not set'}"],
                    ))
                if _text(job.get("worker_notes") or job.get("completion_note") or job.get("completed_at")) and "complete" in status.lower():
                    slips.append(_slip(
                        "worker_update",
                        f"{title} sent from worker",
                        "Worker update is ready for office review.",
                        "Workers",
                        "normal",
                        job_id,
                        [f"Client: {client}", f"Updated: {_safe_dt(job.get('updated_at') or job.get('completed_at'))}"],
                    ))
        except Exception:
            pass

        try:
            cursor = db.os_v2_saved_records.find({"business_id": bid}).sort("created_at", -1).limit(30)
            async for row in cursor:
                kind = _text(row.get("kind") or "record")
                action = _text(row.get("action") or "save")
                slips.append(_slip(
                    "saved_record",
                    f"Saved {kind} ready for review",
                    "A saved record change is waiting in the admin trail.",
                    "Saved records",
                    "normal",
                    _text(row.get("_id")),
                    [f"Action: {action}", f"Saved: {_safe_dt(row.get('created_at'))}"],
                ))
        except Exception:
            pass

        try:
            cursor = db.messages.find({"business_id": bid}).sort("created_at", -1).limit(30)
            async for message in cursor:
                body = _text(message.get("message") or message.get("body") or message.get("text") or message.get("detail"))
                if body:
                    slips.append(_slip(
                        "message",
                        "Message ready for office",
                        body[:220],
                        _text(message.get("source") or "Messages"),
                        "normal",
                        _text(message.get("_id")),
                        [f"From: {_text(message.get('from') or message.get('sender') or 'Worker/customer')}"]
                    ))
        except Exception:
            pass

        return {"success": True, "slips": slips[:80], "items": slips[:80], "count": len(slips[:80])}

    app.include_router(router)
    app.state.command_prepared_slips_patch = True


def _patched_import(name, globals=None, locals=None, fromlist=(), level=0):  # noqa: A002
    module = _ORIGINAL_IMPORT(name, globals, locals, fromlist, level)
    if name == "server" or name.endswith(".server"):
        _install(sys.modules.get(name) or module)
    return module


if getattr(builtins, "__churvox_command_prepared_slips_patch__", False) is not True:
    builtins.__churvox_command_prepared_slips_patch__ = True
    builtins.__import__ = _patched_import

for module_name in ("server", "backend.server"):
    loaded = sys.modules.get(module_name)
    if loaded is not None:
        _install(loaded)
