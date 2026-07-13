from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import Body, HTTPException, Request


INSTALLED = set()
COMMAND_QUEUE_CACHES: Dict[str, Dict[str, Dict[str, Any]]] = {}


def invalidate_command_queue(business_id: str):
    bid = str(business_id or "").strip()
    if not bid:
        return
    for cache in list(COMMAND_QUEUE_CACHES.values()):
        try:
            cache.pop(bid, None)
        except Exception:
            continue


OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]
OWNER_ROLES = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}
SAFETY = "Owner approval required. Nothing was sent, synced, charged, filed or paid."
QUEUE_CACHE_TTL_SECONDS = 20
QUEUE_CACHE_STALE_SECONDS = 15 * 60
QUEUE_STATUS_LIMIT = 12
QUEUE_QUERY_TIMEOUT_SECONDS = 2.2
COMMAND_FORCE_REFRESH_BUILD = "churvox-command-force-refresh-v4-20260713"


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


def install(module, force=False):
    name = getattr(module, "__name__", "")
    if name in INSTALLED and not force:
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
                ("command_slips", [("business_id", 1), ("updated_at", -1)]),
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

    queue_cache: Dict[str, Dict[str, Any]] = {}
    queue_refresh_tasks: Dict[str, asyncio.Task] = {}
    COMMAND_QUEUE_CACHES[name or f"module-{id(module)}"] = queue_cache

    def queue_sort_value(row: Dict[str, Any]):
        source = str(row.get("source_type") or "").strip().lower()
        urgency = str(row.get("urgency") or row.get("level") or row.get("priority") or "").strip().lower()
        payload = row.get("payload") if isinstance(row.get("payload"), dict) else {}
        worker_problem = source == "worker_field_problem" or bool(payload.get("worker_field_problem"))
        payload_source = str(payload.get("source") or "").strip().lower()
        owner_manual = payload_source in {"manual_form", "quick_intake", "csv_import"}
        priority = 100 if worker_problem else 95 if owner_manual else 80 if any(word in urgency for word in ("urgent", "top", "high")) else 40
        value = row.get("updated_at") or row.get("created_at") or row.get("_id") or ""
        if isinstance(value, datetime):
            value = value.isoformat()
        return priority, str(value)

    async def read_queue_status(bid: str, status: str):
        query = {"business_id": bid, "status": status}
        cursor = db.command_slips.find(query, {"audit": 0}).sort("updated_at", -1).limit(QUEUE_STATUS_LIMIT)
        try:
            cursor = cursor.hint([("business_id", 1), ("status", 1), ("updated_at", -1)])
        except Exception:
            pass
        try:
            cursor = cursor.max_time_ms(900)
        except Exception:
            pass
        return await cursor.to_list(length=QUEUE_STATUS_LIMIT)

    async def load_queue_rows(bid: str):
        started = time.monotonic()
        batches = await bounded(
            asyncio.gather(*(read_queue_status(bid, status) for status in OPEN_STATUSES)),
            QUEUE_QUERY_TIMEOUT_SECONDS,
            "Command queue",
        )
        rows = [row for batch in batches for row in batch]
        rows.sort(key=queue_sort_value, reverse=True)
        rows = rows[:50]
        queue_cache[bid] = {"at": time.monotonic(), "rows": rows}
        return rows, round((time.monotonic() - started) * 1000)

    async def refresh_queue_cache(bid: str):
        try:
            await load_queue_rows(bid)
        except Exception:
            pass
        finally:
            queue_refresh_tasks.pop(bid, None)

    def schedule_queue_refresh(bid: str):
        task = queue_refresh_tasks.get(bid)
        if task and not task.done():
            return
        try:
            queue_refresh_tasks[bid] = asyncio.create_task(refresh_queue_cache(bid))
        except Exception:
            pass

    def queue_response(rows, *, source: str, elapsed_ms: int = 0, cached: bool = False, stale: bool = False):
        return {
            "success": True,
            "source": source,
            "slips": [_safe(row, ObjectId) for row in rows],
            "cached": cached,
            "stale": stale,
            "elapsed_ms": elapsed_ms,
            "scan_complete": not stale,
            "scan_errors": ["Command queue is showing the last confirmed server cache while a live refresh retries."] if stale else [],
            "safety": SAFETY,
        }

    async def fast_slips(request: Request):
        user = await require_owner(request)
        bid = business_id(user)
        if not index_ready:
            try:
                asyncio.create_task(ensure_indexes())
            except Exception:
                pass

        force_live = str(request.query_params.get("refresh") or "").lower() in {"1", "true", "yes"} \
            or request.headers.get("x-churvox-command-refresh") == COMMAND_FORCE_REFRESH_BUILD
        if force_live:
            queue_cache.pop(bid, None)

        cached = queue_cache.get(bid)
        age = time.monotonic() - float((cached or {}).get("at") or 0)
        if cached and age <= QUEUE_CACHE_TTL_SECONDS and not force_live:
            if age > 5:
                schedule_queue_refresh(bid)
            return queue_response(cached.get("rows") or [], source="paid-launch-command-server-cache-v3", cached=True)

        try:
            rows, elapsed_ms = await load_queue_rows(bid)
            return queue_response(rows, source="paid-launch-fast-command-v3", elapsed_ms=elapsed_ms)
        except HTTPException:
            if cached and age <= QUEUE_CACHE_STALE_SECONDS:
                schedule_queue_refresh(bid)
                return queue_response(cached.get("rows") or [], source="paid-launch-command-stale-cache-v3", cached=True, stale=True)
            raise

    try:
        from churvox_command_human_mimic_v3_routes import build_command_human_mimic_v3_router
    except Exception:
        from backend.churvox_command_human_mimic_v3_routes import build_command_human_mimic_v3_router

    guarded_router = build_command_human_mimic_v3_router(db, get_current_user, ObjectId)
    guarded_scan = None
    for route in getattr(guarded_router, "routes", []):
        if getattr(route, "path", "") == "/command/scan" and "POST" in set(getattr(route, "methods", set()) or set()):
            guarded_scan = getattr(route, "endpoint", None)
            break

    async def fast_scan(request: Request, payload: Dict[str, Any] = Body(default_factory=dict)):
        await require_owner(request)
        if not index_ready:
            try:
                asyncio.create_task(ensure_indexes())
            except Exception:
                pass
        if guarded_scan is None:
            raise HTTPException(status_code=503, detail="Guarded Command scanner is unavailable")
        result = await bounded(guarded_scan(request=request, payload=payload or {}), 25, "Command brain scan")
        result = dict(result or {})
        result.setdefault("success", True)
        result.setdefault("source", "human-mimic-intelligence-v3")
        result.setdefault("guard", "human-mimic-strict-preflight-v3")
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
            "marker": "churvox-command-v3-live-backend-20260713g",
            "command_force_refresh": COMMAND_FORCE_REFRESH_BUILD,
            "worker_field_command_bridge": "churvox-worker-field-command-bridge-v10-20260713",
            "worker_command_priority": "churvox-worker-command-priority-v10-20260713",
            "owner_manual_command_priority": "churvox-owner-manual-command-priority-v12-20260713",
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
