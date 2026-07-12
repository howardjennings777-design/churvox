from __future__ import annotations

import json
from urllib.parse import parse_qs

VERSION = "churvox-checkout-token-session-guard-20260712c"
CHECKOUT_PATHS = {
    "/api/billing/create-checkout-session",
    "/api/billing/start-checkout",
    "/api/billing/start-checkout-form",
    "/api/billing/create-addon-checkout-session",
}


def _text(value):
    return str(value or "").strip()


def _extract_token(body: bytes, content_type: str) -> str:
    if not body:
        return ""
    try:
        if "application/json" in content_type:
            payload = json.loads(body.decode("utf-8"))
        else:
            parsed = parse_qs(body.decode("utf-8"), keep_blank_values=True)
            payload = {key: values[-1] if values else "" for key, values in parsed.items()}
    except Exception:
        return ""
    if not isinstance(payload, dict):
        return ""
    return _text(payload.get("token") or payload.get("access_token") or payload.get("auth_token"))


class CheckoutBodyTokenGuard:
    def __init__(self, app, module):
        self.app = app
        self.module = module

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http" or scope.get("path") not in CHECKOUT_PATHS or scope.get("method", "GET").upper() not in {"POST", "PUT", "PATCH"}:
            return await self.app(scope, receive, send)

        chunks = []
        more = True
        while more:
            message = await receive()
            if message.get("type") != "http.request":
                continue
            chunks.append(message.get("body", b""))
            more = bool(message.get("more_body"))
        body = b"".join(chunks)
        sent = False

        async def replay():
            nonlocal sent
            if sent:
                return {"type": "http.request", "body": b"", "more_body": False}
            sent = True
            return {"type": "http.request", "body": body, "more_body": False}

        headers = {key.decode("latin1").lower(): value.decode("latin1") for key, value in scope.get("headers", [])}
        token = _extract_token(body, headers.get("content-type", ""))
        if not token:
            return await self.app(scope, replay, send)

        jwt = getattr(self.module, "jwt", None)
        secret = getattr(self.module, "JWT_SECRET", None)
        algorithm = getattr(self.module, "JWT_ALGORITHM", "HS256")
        db = getattr(self.module, "db", None)
        ObjectId = getattr(self.module, "ObjectId", None)
        clear_auth_cookies = getattr(self.module, "clear_auth_cookies", None)
        JSONResponse = getattr(self.module, "JSONResponse", None)
        if any(item is None for item in (jwt, secret, db, ObjectId, JSONResponse)):
            return await self.app(scope, replay, send)

        try:
            recovery = __import__("churvox_password_recovery_paid_launch_patch")
        except Exception:
            try:
                recovery = __import__("backend.churvox_password_recovery_paid_launch_patch", fromlist=["*"])
            except Exception:
                recovery = None
        try:
            revocation = __import__("churvox_token_revocation_paid_launch_patch")
        except Exception:
            try:
                revocation = __import__("backend.churvox_token_revocation_paid_launch_patch", fromlist=["*"])
            except Exception:
                revocation = None

        try:
            payload = jwt.decode(token, secret, algorithms=[algorithm])
            if payload.get("type") != "access":
                raise ValueError("Invalid token type")
            user = await db.users.find_one({"_id": ObjectId(str(payload.get("sub") or ""))})
            password_revoked = bool(recovery and recovery.session_is_revoked(user, payload))
            disabled = bool(recovery and recovery.account_disabled(user))
            logged_out = bool(revocation and await revocation.token_is_revoked(db, payload, token))
            if not user or password_revoked or disabled or logged_out:
                raise ValueError("Session revoked")
        except Exception:
            response = JSONResponse(
                {"success": False, "detail": "Session expired. Sign in again before changing billing.", "version": VERSION},
                status_code=401,
            )
            if callable(clear_auth_cookies):
                try:
                    clear_auth_cookies(response)
                except Exception:
                    pass
            return await response(scope, replay, send)

        return await self.app(scope, replay, send)


def install(module) -> None:
    app = getattr(module, "app", None)
    if app is None or getattr(app.state, "churvox_checkout_token_session_guard", False):
        return
    try:
        app.add_middleware(CheckoutBodyTokenGuard, module=module)
    except Exception:
        return
    app.state.churvox_checkout_token_session_guard = VERSION
