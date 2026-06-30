"""Adds a small read-only assigned jobs endpoint for the worker app."""

from __future__ import annotations

import builtins
import sys
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends

_ORIGINAL_IMPORT = builtins.__import__


def _text(value):
    if value is None:
        return ""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return _text(value.get("$oid") or value.get("id") or value.get("_id") or value.get("worker_id") or value.get("user_id"))
    return str(value or "").strip()


def _safe(doc):
    out = dict(doc or {})
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if isinstance(value, ObjectId):
            out[key] = str(value)
        elif isinstance(value, datetime):
            out[key] = value.isoformat()
    return out


def _role(user):
    user = user or {}
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    for key in ("role", "user_role", "account_type", "staff_role", "worker_role", "type", "worker_type"):
        if user.get(key):
            return str(user.get(key)).strip().lower().replace(" ", "_").replace("-", "_")
    return str(business.get("role") or business.get("user_role") or "").strip().lower().replace(" ", "_").replace("-", "_")


def _is_worker(user):
    user = user or {}
    worker_roles = {"worker", "staff", "employee", "team_member", "teammember", "subcontractor", "contractor", "field_worker", "fieldworker", "field_staff", "fieldstaff", "technician", "tech"}
    return bool(_role(user) in worker_roles or user.get("is_worker") is True or user.get("worker_id") or user.get("staff_id") or user.get("team_member_id"))


def _business_id(user):
    return _text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("contractor_id") or (user or {}).get("id") or (user or {}).get("_id"))


def _worker_ids(user):
    user = user or {}
    return {value for value in (_text(user.get(key)) for key in ("id", "_id", "worker_id", "staff_id", "team_member_id", "user_id")) if value}


def _assigned(job, user):
    ids = _worker_ids(user)
    email = str((user or {}).get("email") or "").strip().lower()
    for key in ("assigned_worker_id", "worker_id", "assigned_to", "assignedWorkerId", "workerId", "staff_id", "team_member_id", "assigned_user_id"):
        if _text(job.get(key)) in ids:
            return True
    for key in ("worker_email", "assigned_worker_email", "assigned_to_email", "staff_email"):
        if email and str(job.get(key) or "").strip().lower() == email:
            return True
    for row in (job.get("workers") or job.get("assigned_workers") or []):
        if isinstance(row, dict):
            if _text(row.get("id") or row.get("_id") or row.get("worker_id") or row.get("user_id")) in ids:
                return True
            if email and str(row.get("email") or "").strip().lower() == email:
                return True
        elif _text(row) in ids:
            return True
    return False


def _install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if app is None or db is None or get_current_user is None or getattr(app.state, "worker_jobs_read_patch", False):
        return
    router = APIRouter(prefix="/api")

    @router.get("/worker/jobs")
    async def worker_jobs(current_user: dict = Depends(get_current_user)):
        if not _is_worker(current_user):
            return {"success": True, "jobs": [], "items": [], "data": []}
        bid = _business_id(current_user)
        query = {"$or": [{"business_id": bid}, {"businessId": bid}, {"contractor_id": bid}]}
        rows = []
        try:
            cursor = db.jobs.find(query).limit(300)
            async for job in cursor:
                if _assigned(job, current_user):
                    rows.append(_safe(job))
        except Exception:
            rows = []
        return {"success": True, "jobs": rows, "items": rows, "data": rows}

    app.include_router(router)
    app.state.worker_jobs_read_patch = True


def _patched_import(name, globals=None, locals=None, fromlist=(), level=0):  # noqa: A002
    module = _ORIGINAL_IMPORT(name, globals, locals, fromlist, level)
    if name == "server" or name.endswith(".server"):
        _install(sys.modules.get(name) or module)
    return module


if getattr(builtins, "__churvox_worker_jobs_read_patch__", False) is not True:
    builtins.__churvox_worker_jobs_read_patch__ = True
    builtins.__import__ = _patched_import

for module_name in ("server", "backend.server"):
    loaded = sys.modules.get(module_name)
    if loaded is not None:
        _install(loaded)
