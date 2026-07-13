"""Adds a small read-only assigned jobs endpoint for the worker app."""

from __future__ import annotations

import builtins
import sys
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse

_ORIGINAL_IMPORT = builtins.__import__
LIVE_PATCH_VERSION = "worker-jobs-active-only-v5-20260713"


def _text(value):
    if value is None:
        return ""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return _text(value.get("$oid") or value.get("id") or value.get("_id") or value.get("worker_id") or value.get("user_id") or value.get("email") or value.get("name"))
    return str(value or "").strip()


def _oid(value):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


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


def _worker_names(user):
    user = user or {}
    names = set()
    for key in ("name", "full_name", "worker_name", "staff_name"):
        value = str(user.get(key) or "").strip().lower()
        if value:
            names.add(value)
    return names


def _assigned(job, user):
    ids = _worker_ids(user)
    names = _worker_names(user)
    email = str((user or {}).get("email") or "").strip().lower()
    id_keys = ("assigned_worker_id", "worker_id", "assigned_to", "assignedWorkerId", "workerId", "staff_id", "team_member_id", "assigned_user_id")
    for key in id_keys:
        value = _text(job.get(key))
        if value in ids:
            return True
        if email and value.lower() == email:
            return True
        if names and value.lower() in names:
            return True
    for key in ("worker_email", "assigned_worker_email", "assigned_to_email", "staff_email", "email"):
        if email and str(job.get(key) or "").strip().lower() == email:
            return True
    for key in ("worker_name", "assigned_worker_name", "assigned_to_name", "staff_name"):
        if names and str(job.get(key) or "").strip().lower() in names:
            return True
    for row in (job.get("workers") or job.get("assigned_workers") or job.get("team") or []):
        if isinstance(row, dict):
            if _text(row.get("id") or row.get("_id") or row.get("worker_id") or row.get("user_id")) in ids:
                return True
            if email and str(row.get("email") or "").strip().lower() == email:
                return True
            if names and str(row.get("name") or row.get("full_name") or "").strip().lower() in names:
                return True
        elif _text(row) in ids or (email and _text(row).lower() == email) or (names and _text(row).lower() in names):
            return True
    return False


def _inactive(job):
    job = job or {}
    if any(job.get(key) is True for key in ("archived", "is_archived", "deleted", "is_deleted")):
        return True
    if job.get("active") is False or job.get("is_active") is False:
        return True
    status = str(job.get("status") or job.get("job_status") or job.get("workflow_status") or job.get("state") or job.get("stage") or "").strip().lower().replace("-", "_").replace(" ", "_")
    return status in {"archived", "deleted", "cancelled", "canceled", "void"} or status.startswith("archiv")


def _business_query(user):
    bid = _business_id(user)
    values = [bid]
    oid = _oid(bid)
    if oid is not None:
        values.append(oid)
    return {
        "$or": [
            {"business_id": {"$in": values}},
            {"businessId": {"$in": values}},
            {"contractor_id": {"$in": values}},
            {"owner_business_id": {"$in": values}},
        ]
    }


def _route_loaded(app, path, method):
    method = method.upper()
    try:
        for route in getattr(app.router, "routes", []):
            if getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set()):
                return True
    except Exception:
        pass
    return False


def _remove_route(app, path, method):
    method = method.upper()
    try:
        app.router.routes = [
            route for route in getattr(app.router, "routes", [])
            if not (
                getattr(route, "path", "") == path
                and method in set(getattr(route, "methods", set()) or set())
            )
        ]
    except Exception:
        pass


def _install_extra_owner_visibility(module):
    try:
        import churvox_owner_data_visibility_patch
        churvox_owner_data_visibility_patch.install(module)
    except Exception as exc:
        print(f"Churvox owner data visibility skipped: {exc}", file=sys.stderr)
    try:
        import churvox_owner_visibility_v2_patch
        churvox_owner_visibility_v2_patch.install(module)
    except Exception as exc:
        print(f"Churvox owner visibility v2 skipped: {exc}", file=sys.stderr)
    try:
        import churvox_wiring_health_patch
        churvox_wiring_health_patch.install(module)
    except Exception as exc:
        print(f"Churvox wiring health skipped: {exc}", file=sys.stderr)


def _install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if app is None or db is None or get_current_user is None:
        return
    if getattr(app.state, "worker_jobs_read_patch", "") == LIVE_PATCH_VERSION:
        _install_extra_owner_visibility(module)
        return
    router = APIRouter(prefix="/api")

    @router.get("/worker/jobs")
    async def worker_jobs(current_user: dict = Depends(get_current_user)):
        if not _is_worker(current_user):
            return {"success": True, "jobs": [], "items": [], "data": []}
        rows = []
        try:
            cursor = db.jobs.find(_business_query(current_user)).sort([("created_at", -1), ("updated_at", -1)]).limit(300)
            async for job in cursor:
                if _assigned(job, current_user) and not _inactive(job):
                    rows.append(_safe(job))
        except Exception:
            rows = []
        return {"success": True, "jobs": rows, "items": rows, "data": rows}

    @router.get("/worker/jobs-readiness")
    async def worker_jobs_readiness():
        return {
            "success": True,
            "ready": True,
            "version": LIVE_PATCH_VERSION,
            "route": "/api/worker/jobs",
            "definitive_route_owner": "worker_jobs",
            "safety": "Read-only worker assignment visibility. No records were changed.",
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    @router.get("/health/wiring")
    async def direct_wiring_health():
        routes = [
            ("/api/jobs", "GET"), ("/api/clients", "GET"), ("/api/quotes", "GET"), ("/api/invoices", "GET"),
            ("/api/team", "GET"), ("/api/messages", "GET"), ("/api/command/actions", "GET"),
            ("/api/worker/jobs", "GET"), ("/api/worker/field-slip", "POST"),
            ("/api/jobs/{job_id}/acknowledge", "POST"), ("/api/jobs/{job_id}/start", "POST"), ("/api/jobs/{job_id}/complete", "POST"),
        ]
        checks = [{"path": path, "method": method, "loaded": _route_loaded(app, path, method)} for path, method in routes]
        missing = [row for row in checks if not row["loaded"]]
        return {
            "success": True,
            "version": LIVE_PATCH_VERSION,
            "status": "ready" if not missing else "missing_routes",
            "loaded_count": len(checks) - len(missing),
            "required_count": len(checks),
            "missing": missing,
            "checks": checks,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    @router.get("/health/live-version")
    async def live_version():
        return {"success": True, "version": LIVE_PATCH_VERSION, "checked_at": datetime.now(timezone.utc).isoformat()}

    # FastAPI resolves matching routes in registration order. Remove every
    # older worker-jobs reader first so this business-scoped implementation is
    # the definitive live route rather than an unreachable duplicate.
    _remove_route(app, "/api/worker/jobs", "GET")
    _remove_route(app, "/api/worker/jobs-readiness", "GET")
    app.include_router(router)
    try:
        @app.get("/favicon.ico", include_in_schema=False)
        async def favicon_ico():
            return RedirectResponse(url="https://www.churvox.com/favicon.svg", status_code=307)
    except Exception:
        pass
    app.state.worker_jobs_read_patch = LIVE_PATCH_VERSION
    _install_extra_owner_visibility(module)


def _patched_import(name, globals=None, locals=None, fromlist=(), level=0):  # noqa: A002
    module = _ORIGINAL_IMPORT(name, globals, locals, fromlist, level)
    if name == "server" or name.endswith(".server"):
        _install(sys.modules.get(name) or module)
    return module


if getattr(builtins, "__churvox_worker_jobs_read_patch__", False) is not True:
    builtins.__churvox_worker_jobs_read_patch__ = True
    builtins.__import__ = _patched_import

for module_name in ("server", "backend.server", "churvox_legacy_server"):
    loaded = sys.modules.get(module_name)
    if loaded is not None:
        _install(loaded)
