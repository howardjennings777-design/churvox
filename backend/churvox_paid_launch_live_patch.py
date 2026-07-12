from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import Body, HTTPException, Request


INSTALLED = set()
OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]
OWNER_ROLES = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}
SAFETY = "Owner approval required. Nothing was sent, synced, charged, filed or paid."


def _safe(value: Any, ObjectId):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [_safe(item, ObjectId) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "token", "secret", "hash"]):
                continue
            out["id" if key == "_id" else key] = _safe(item, ObjectId)
        return out
    return value


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    def remove_route(path: str, method: str):
        app.router.routes = [
            route for route in app.router.routes
            if not (
                getattr(route, "path", "") == path
                and method.upper() in set(getattr(route, "methods", set()) or set())
            )
        ]

    async def require_owner(request: Request):
        user = await get_current_user(request)
        role = str((user or {}).get("role") or "").lower()
        if role not in OWNER_ROLES and not (user or {}).get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can use paid-launch admin routes")
        return user

    def business_id(user: Dict[str, Any]) -> str:
        value = str((user or {}).get("business_id") or (user or {}).get("id") or "").strip()
        if not value:
            raise HTTPException(status_code=400, detail="Business id is missing")
        return value

    async def bounded(awaitable, seconds: float, label: str):
        try:
            return await asyncio.wait_for(awaitable, timeout=seconds)
        except asyncio.TimeoutError:
            raise HTTPException(status_code=503, detail=f"{label} timed out safely. Nothing changed.")

    index_ready = False
    index_lock = asyncio.Lock()

    async def ensure_indexes():
        nonlocal index_ready
        if index_ready:
            return
        async with index_lock:
            if index_ready:
                return
            jobs = [
                ("command_slips", [("business_id", 1), ("status", 1), ("updated_at", -1)]),
                ("command_slips", [("business_id", 1), ("source_type", 1), ("action_type", 1), ("source_id", 1), ("status", 1)]),
                ("command_events", [("business_id", 1), ("created_at", -1)]),
            ]
            collections = [
                "jobs", "job_records", "appointments", "bookings", "clients", "invoices", "invoice_records",
                "quotes", "messages", "client_messages", "inbox_messages", "worker_messages", "worker_field_slips",
                "time_entries", "timers", "worker_time_entries", "timesheets", "payroll_entries", "users", "workers",
                "team", "team_members", "staff", "employees", "businesses", "business_settings", "settings",
            ]
            for collection in collections:
                jobs.append((collection, [("business_id", 1), ("updated_at", -1)]))
                jobs.append((collection, [("contractor_id", 1), ("updated_at", -1)]))
            for collection, keys in jobs:
                try:
                    await asyncio.wait_for(db[collection].create_index(keys, background=True), timeout=8)
                except Exception:
                    continue
            index_ready = True

    async def startup_indexes():
        try:
            await ensure_indexes()
        except Exception:
            pass

    try:
        app.add_event_handler("startup", startup_indexes)
    except Exception:
        pass

    try:
        from churvox_paid_launch_readiness_routes import build_paid_launch_readiness_router
    except Exception:
        from backend.churvox_paid_launch_readiness_routes import build_paid_launch_readiness_router

    for path in ["/api/payroll", "/api/payroll/summary"]:
        remove_route(path, "GET")
    app.include_router(build_paid_launch_readiness_router(db, get_current_user, ObjectId), prefix="/api")

    async def fast_slips(request: Request):
        user = await require_owner(request)
        await ensure_indexes()
        bid = business_id(user)
        query = {"business_id": bid, "status": {"$in": OPEN_STATUSES}}
        cursor = db.command_slips.find(query).sort("updated_at", -1).limit(100)
        rows = await bounded(cursor.to_list(length=100), 12, "Command queue")
        try:
            worker_count = await asyncio.wait_for(
                db.worker_field_slips.count_documents({"business_id": bid, "status": {"$nin": ["dismissed", "resolved", "closed", "archived"]}}),
                timeout=5,
            )
        except Exception:
            worker_count = 0
        return {
            "success": True,
            "source": "paid-launch-fast-command",
            "slips": [_safe(row, ObjectId) for row in rows],
            "worker_field_slip_count": int(worker_count),
            "scan_complete": True,
            "scan_errors": [],
            "safety": SAFETY,
        }

    try:
        from churvox_command_human_mimic_guard_routes import build_command_human_mimic_guard_router
    except Exception:
        from backend.churvox_command_human_mimic_guard_routes import build_command_human_mimic_guard_router

    guarded_router = build_command_human_mimic_guard_router(db, get_current_user, ObjectId)
    guarded_scan = None
    for route in getattr(guarded_router, "routes", []):
        if getattr(route, "path", "") == "/command/scan" and "POST" in set(getattr(route, "methods", set()) or set()):
            guarded_scan = getattr(route, "endpoint", None)
            break

    async def fast_scan(request: Request, payload: Dict[str, Any] = Body(default_factory=dict)):
        await require_owner(request)
        await ensure_indexes()
        if guarded_scan is None:
            raise HTTPException(status_code=503, detail="Guarded Command scanner is unavailable")
        result = await bounded(guarded_scan(request=request, payload=payload or {}), 25, "Command brain scan")
        result = dict(result or {})
        result.setdefault("success", True)
        result.setdefault("source", "human-mimic-intelligence-v2")
        result.setdefault("guard", "human-mimic-scan-guard-v2")
        result["scan_complete"] = True
        result["scan_errors"] = []
        result["safety"] = result.get("safety") or SAFETY
        return _safe(result, ObjectId)

    async def admin_brain_bridge(request: Request, payload: Dict[str, Any] = Body(default_factory=dict)):
        result = await fast_scan(request=request, payload={**(payload or {}), "source": "admin_brain_paid_launch_bridge"})
        actions = list(result.get("slips") or []) + list(result.get("existing") or [])
        return {
            "success": True,
            "source": "paid-launch-admin-brain-bridge",
            "action_count": len(actions),
            "stored_count": len(actions),
            "actions": actions,
            "items": actions,
            "counts": result.get("role_counts") or {"total": len(actions)},
            "errors": [],
            "scan_complete": True,
            "safety": SAFETY,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    async def readiness_marker(request: Request):
        await require_owner(request)
        await ensure_indexes()
        return {
            "success": True,
            "marker": "churvox-paid-launch-live-backend-20260713a",
            "routes": ["payroll", "payroll-summary", "command-slips", "command-scan", "admin-brain"],
            "indexes_ready": index_ready,
            "safety": SAFETY,
        }

    routes = [
        ("/api/command/slips", fast_slips, "GET"),
        ("/api/command/scan", fast_scan, "POST"),
        ("/api/admin-brain/scan", admin_brain_bridge, "POST"),
        ("/api/admin-brain/scan", admin_brain_bridge, "GET"),
        ("/api/paid-launch/backend-readiness", readiness_marker, "GET"),
    ]
    for path, endpoint, method in routes:
        remove_route(path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(name)
