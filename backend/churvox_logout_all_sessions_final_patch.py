from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

VERSION = "churvox-logout-all-sessions-final-20260713a"


def _text(value: Any, limit: int = 240) -> str:
    try:
        return str(value or "").strip()[:limit]
    except Exception:
        return ""


def _remove_route(app, path: str, method: str) -> None:
    app.router.routes = [
        route for route in list(getattr(app.router, "routes", []) or [])
        if not (
            getattr(route, "path", "") == path
            and method.upper() in set(getattr(route, "methods", set()) or set())
        )
    ]


def install(module, force: bool = False) -> bool:
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    clear_auth_cookies = getattr(module, "clear_auth_cookies", None)
    if any(value is None for value in (app, db, get_current_user, ObjectId)):
        return False
    if getattr(app.state, "churvox_logout_all_sessions_final", False) and not force:
        return True

    path = "/api/auth/logout-all"
    _remove_route(app, path, "POST")

    async def logout_all_sessions(request: Request):
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Sign in before logging out other sessions")
        if not isinstance(user, dict):
            raise HTTPException(status_code=401, detail="Session is no longer valid")

        raw_id = _text(user.get("id") or user.get("_id"), 180)
        if not raw_id:
            raise HTTPException(status_code=400, detail="Account id is missing")
        try:
            user_id = ObjectId(raw_id)
        except Exception:
            user_id = raw_id

        # Existing access tokens store issued-at timestamps with second precision.
        # A one-second safety margin invalidates every older token while allowing a
        # fresh login immediately after this response to issue a newer session.
        now = datetime.now(timezone.utc)
        invalid_before = now - timedelta(seconds=1)
        result = await db.users.update_one(
            {"_id": user_id},
            {"$set": {
                "session_invalid_before": invalid_before,
                "sessions_revoked_at": now,
                "updated_at": now,
            }},
        )
        if int(getattr(result, "matched_count", 0) or 0) != 1:
            raise HTTPException(status_code=404, detail="Account not found")

        response = JSONResponse({
            "success": True,
            "message": "All previous Churvox sessions were logged out. Sign in again on this device.",
            "sessions_revoked": True,
            "version": VERSION,
        })
        if callable(clear_auth_cookies):
            try:
                clear_auth_cookies(response)
            except Exception:
                pass
        return response

    async def logout_all_readiness():
        owners = []
        for route in list(getattr(app.router, "routes", []) or []):
            if getattr(route, "path", "") != path:
                continue
            endpoint = getattr(route, "endpoint", None)
            methods = sorted(str(value) for value in (getattr(route, "methods", set()) or set()))
            owners.append(f"{','.join(methods)}:{getattr(endpoint, '__name__', 'unknown')}")
        return {"success": True, "ready": True, "version": VERSION, "route_owners": owners}

    _remove_route(app, "/api/auth/logout-all-readiness", "GET")
    app.add_api_route(path, logout_all_sessions, methods=["POST"])
    app.add_api_route("/api/auth/logout-all-readiness", logout_all_readiness, methods=["GET"])
    app.state.churvox_logout_all_sessions_final = VERSION
    return True
