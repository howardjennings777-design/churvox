from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

VERSION = "churvox-token-revocation-paid-launch-20260712"
EXEMPT_EXACT = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/refresh",
    "/api/auth/worker-login",
    "/api/worker/auth/login",
    "/api/auth/launch-status",
}
EXEMPT_PREFIXES = (
    "/api/auth/verify-email/",
    "/api/invite/verify/",
    "/api/invite/accept",
    "/api/public/",
    "/api/health",
    "/api/security/",
    "/api/billing/webhook",
    "/api/billing/stripe-webhook",
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def token_fingerprint(payload: dict | None, raw_token: str) -> str:
    payload = payload or {}
    jti = _text(payload.get("jti"))
    if jti:
        return f"{_text(payload.get('type') or 'token')}:{jti}"
    digest = hashlib.sha256(_text(raw_token).encode("utf-8", "ignore")).hexdigest()
    return f"{_text(payload.get('type') or 'token')}:sha256:{digest}"


def _expiry(payload: dict | None):
    payload = payload or {}
    raw = payload.get("exp")
    try:
        return datetime.fromtimestamp(float(raw), tz=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


async def token_is_revoked(db, payload: dict | None, raw_token: str) -> bool:
    if db is None or not raw_token:
        return False
    fingerprint = token_fingerprint(payload, raw_token)
    try:
        return bool(await db.revoked_auth_tokens.find_one({"_id": fingerprint, "expires_at": {"$gt": datetime.now(timezone.utc)}}))
    except Exception:
        return False


async def revoke_token(db, payload: dict | None, raw_token: str, reason: str = "logout") -> bool:
    if db is None or not raw_token:
        return False
    payload = payload or {}
    fingerprint = token_fingerprint(payload, raw_token)
    now = datetime.now(timezone.utc)
    try:
        await db.revoked_auth_tokens.update_one(
            {"_id": fingerprint},
            {"$set": {
                "_id": fingerprint,
                "user_id": _text(payload.get("sub")),
                "token_type": _text(payload.get("type") or "token"),
                "expires_at": _expiry(payload),
                "revoked_at": now,
                "reason": reason,
                "version": VERSION,
            }},
            upsert=True,
        )
        await db.revoked_auth_tokens.delete_many({"expires_at": {"$lte": now}})
        return True
    except Exception:
        return False


def _route_matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def _remove_route(app, path: str, method: str) -> None:
    try:
        app.router.routes = [route for route in app.router.routes if not _route_matches(route, path, method)]
    except Exception:
        pass


def _request_access_token(request) -> str:
    header = _text(request.headers.get("Authorization"))
    if header.startswith("Bearer "):
        return header[7:].strip()
    return _text(request.cookies.get("access_token"))


def _exempt(path: str) -> bool:
    return path in EXEMPT_EXACT or any(path == prefix or path.startswith(prefix) for prefix in EXEMPT_PREFIXES)


class RevokedAccessTokenGuard:
    def __init__(self, app, module):
        self.app = app
        self.module = module

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        if scope.get("type") != "http" or scope.get("method", "GET").upper() == "OPTIONS" or not path.startswith("/api") or _exempt(path):
            return await self.app(scope, receive, send)

        headers = {key.decode("latin1").lower(): value.decode("latin1") for key, value in scope.get("headers", [])}
        raw = ""
        authorization = _text(headers.get("authorization"))
        if authorization.startswith("Bearer "):
            raw = authorization[7:].strip()
        if not raw:
            cookie_header = headers.get("cookie", "")
            for part in cookie_header.split(";"):
                key, _, value = part.strip().partition("=")
                if key == "access_token":
                    raw = value
                    break
        if not raw:
            return await self.app(scope, receive, send)

        jwt = getattr(self.module, "jwt", None)
        secret = getattr(self.module, "JWT_SECRET", None)
        algorithm = getattr(self.module, "JWT_ALGORITHM", "HS256")
        db = getattr(self.module, "db", None)
        JSONResponse = getattr(self.module, "JSONResponse", None)
        clear_auth_cookies = getattr(self.module, "clear_auth_cookies", None)
        if any(item is None for item in (jwt, secret, db, JSONResponse)):
            return await self.app(scope, receive, send)
        try:
            payload = jwt.decode(raw, secret, algorithms=[algorithm])
            if await token_is_revoked(db, payload, raw):
                response = JSONResponse({"success": False, "detail": "Session has been signed out. Sign in again.", "version": VERSION}, status_code=401)
                if callable(clear_auth_cookies):
                    clear_auth_cookies(response)
                return await response(scope, receive, send)
        except Exception:
            return await self.app(scope, receive, send)
        return await self.app(scope, receive, send)


def install(module) -> None:
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    jwt = getattr(module, "jwt", None)
    secret = getattr(module, "JWT_SECRET", None)
    algorithm = getattr(module, "JWT_ALGORITHM", "HS256")
    Request = getattr(module, "Request", None)
    Response = getattr(module, "Response", None)
    clear_auth_cookies = getattr(module, "clear_auth_cookies", None)
    if any(item is None for item in (app, db, jwt, secret, Request, Response, clear_auth_cookies)):
        return
    if getattr(app.state, "churvox_token_revocation_paid_launch", False):
        return

    async def secure_logout(request: Request, response: Response):
        access = _request_access_token(request)
        refresh = _text(request.cookies.get("refresh_token"))
        revoked = []
        for raw in (access, refresh):
            if not raw:
                continue
            try:
                payload = jwt.decode(raw, secret, algorithms=[algorithm], options={"verify_exp": False})
            except Exception:
                payload = {"type": "unknown"}
            if await revoke_token(db, payload, raw, "logout"):
                revoked.append(_text(payload.get("type") or "token"))
        clear_auth_cookies(response)
        return {"success": True, "message": "Logged out", "revoked": revoked, "version": VERSION}

    secure_logout.__annotations__ = {"request": Request, "response": Response}
    _remove_route(app, "/api/auth/logout", "POST")
    app.add_api_route("/api/auth/logout", secure_logout, methods=["POST"])
    try:
        app.add_middleware(RevokedAccessTokenGuard, module=module)
    except Exception:
        pass
    app.state.churvox_token_revocation_paid_launch = VERSION
