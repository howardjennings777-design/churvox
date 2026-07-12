from __future__ import annotations

from datetime import datetime, timedelta, timezone

VERSION = "churvox-session-token-precision-20260712"


def _text(value):
    return str(value or "").strip()


def _route_matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def _remove_route(app, path: str, method: str) -> None:
    try:
        app.router.routes = [route for route in app.router.routes if not _route_matches(route, path, method)]
    except Exception:
        pass


def install(module) -> None:
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    jwt = getattr(module, "jwt", None)
    secret = getattr(module, "JWT_SECRET", None)
    algorithm = getattr(module, "JWT_ALGORITHM", "HS256")
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    Request = getattr(module, "Request", None)
    Response = getattr(module, "Response", None)
    set_auth_cookies = getattr(module, "set_auth_cookies", None)
    clear_auth_cookies = getattr(module, "clear_auth_cookies", None)
    responder = getattr(module, "_auth_user_response", None)
    if any(item is None for item in (app, db, jwt, secret, ObjectId, HTTPException, Request, Response, set_auth_cookies, clear_auth_cookies)):
        return

    try:
        recovery = __import__("churvox_password_recovery_paid_launch_patch")
    except Exception:
        try:
            recovery = __import__("backend.churvox_password_recovery_paid_launch_patch", fromlist=["*"])
        except Exception:
            recovery = None
    if recovery is None:
        return

    def create_access_token(user_id: str, email: str) -> str:
        now = datetime.now(timezone.utc)
        return jwt.encode(
            {
                "sub": str(user_id),
                "email": _text(email).lower(),
                "iat": now.timestamp(),
                "exp": now + timedelta(hours=24),
                "type": "access",
                "session_version": 2,
            },
            secret,
            algorithm=algorithm,
        )

    def create_refresh_token(user_id: str) -> str:
        now = datetime.now(timezone.utc)
        return jwt.encode(
            {
                "sub": str(user_id),
                "iat": now.timestamp(),
                "exp": now + timedelta(days=7),
                "type": "refresh",
                "session_version": 2,
            },
            secret,
            algorithm=algorithm,
        )

    module.create_access_token = create_access_token
    module.create_refresh_token = create_refresh_token

    async def precise_refresh(request: Request, response: Response):
        token = _text(request.cookies.get("refresh_token"))
        if not token:
            raise HTTPException(status_code=401, detail="No refresh token")
        try:
            payload = jwt.decode(token, secret, algorithms=[algorithm])
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=401, detail="Invalid token type")
            user = await db.users.find_one({"_id": ObjectId(str(payload.get("sub") or ""))})
            if not user or recovery.account_disabled(user) or recovery.session_is_revoked(user, payload):
                raise HTTPException(status_code=401, detail="Session expired. Sign in again.")
            access = create_access_token(str(user["_id"]), user.get("email"))
            refresh = create_refresh_token(str(user["_id"]))
            set_auth_cookies(response, access, refresh)
            if callable(responder):
                result = responder(user, access)
                if isinstance(result, dict):
                    result["version"] = VERSION
                return result
            return {"success": True, "token": access, "version": VERSION}
        except HTTPException:
            clear_auth_cookies(response)
            raise
        except getattr(jwt, "ExpiredSignatureError", Exception):
            clear_auth_cookies(response)
            raise HTTPException(status_code=401, detail="Session expired. Sign in again.")
        except getattr(jwt, "InvalidTokenError", Exception):
            clear_auth_cookies(response)
            raise HTTPException(status_code=401, detail="Invalid refresh token")

    precise_refresh.__annotations__ = {"request": Request, "response": Response}
    _remove_route(app, "/api/auth/refresh", "POST")
    app.add_api_route("/api/auth/refresh", precise_refresh, methods=["POST"])
    app.state.churvox_session_token_precision = VERSION
