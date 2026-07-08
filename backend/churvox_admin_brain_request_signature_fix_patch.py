from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import Request

import churvox_admin_brain_patch as admin_brain

try:
    import churvox_admin_brain_owner_decision_patch as owner_decision
except Exception:  # pragma: no cover
    owner_decision = None

INSTALLED = set()


def now():
    return datetime.now(timezone.utc)


def text(value: Any) -> str:
    try:
        return str(value or "").strip()
    except Exception:
        return ""


def safe(value: Any):
    return admin_brain.safe(value)


def business_id(user):
    return admin_brain.bid(user)


async def read_payload(request: Request) -> Dict[str, Any]:
    try:
        body = await request.json()
        return body if isinstance(body, dict) else {}
    except Exception:
        return {}


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


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

    async def scan_endpoint(request: Request):
        user = await get_current_user(request)
        bid = business_id(user)
        actions, counts, errors = await admin_brain.scan(db, user, ObjectId)
        stored = await admin_brain.store(db, bid, actions)
        return safe({
            "success": True,
            "source": "churvox_admin_brain_request_signature_fix",
            "message": "Admin Brain scan complete. Churvox found owner-review admin decisions only.",
            "business_id": bid,
            "counts": counts,
            "action_count": len(actions),
            "stored_count": stored,
            "errors": errors,
            "actions": actions,
            "items": actions,
            "data": {"actions": actions, "items": actions, "counts": counts},
            "updated_at": now(),
        })

    async def execute_endpoint(request: Request):
        if owner_decision is None:
            return safe({"success": False, "message": "Owner decision router unavailable."})
        user = await get_current_user(request)
        payload = await read_payload(request)
        return safe(await owner_decision.write_owner_decision(db, user, None, payload))

    async def execute_by_id_endpoint(request: Request, action_id: str):
        if owner_decision is None:
            return safe({"success": False, "message": "Owner decision router unavailable."})
        user = await get_current_user(request)
        payload = await read_payload(request)
        return safe(await owner_decision.write_owner_decision(db, user, action_id, payload))

    async def decisions_endpoint(request: Request):
        if owner_decision is None:
            return safe({"success": True, "items": [], "decisions": []})
        user = await get_current_user(request)
        return safe(await owner_decision.recent_decisions(db, user))

    routes = [
        ("GET", "/api/admin-brain/scan", scan_endpoint),
        ("POST", "/api/admin-brain/scan", scan_endpoint),
        ("GET", "/api/ai/actions", scan_endpoint),
        ("GET", "/api/ai-operator/actions", scan_endpoint),
        ("GET", "/api/ai-operator/command-snapshot", scan_endpoint),
        ("GET", "/api/ai/operator/slips", scan_endpoint),
        ("GET", "/api/command/readiness", scan_endpoint),
        ("POST", "/api/command/execute-approved", execute_endpoint),
        ("POST", "/api/command/approvals/{action_id}/execute", execute_by_id_endpoint),
        ("POST", "/api/admin-brain/decide", execute_endpoint),
        ("POST", "/api/admin-brain/actions/{action_id}/decide", execute_by_id_endpoint),
        ("GET", "/api/command/approval-executions", decisions_endpoint),
        ("GET", "/api/admin-brain/decisions", decisions_endpoint),
    ]
    for method, path, endpoint in routes:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])
    INSTALLED.add(name)
