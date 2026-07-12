from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from starlette.responses import JSONResponse

VERSION = "churvox-auth-paid-launch-hardening-20260712d"
PASSWORD_PATH_FIELDS = {
    ("/api/auth/register", "POST"): "password",
    ("/api/auth/reset-password", "POST"): "new_password",
    ("/api/invite/accept", "POST"): "password",
}
LOGIN_PATHS = {"/api/auth/login", "/api/worker/auth/login", "/api/auth/worker-login"}
FORGOT_PATHS = {"/api/auth/forgot-password"}
LOCKED_STATUSES = {"revoked", "locked", "disabled", "expired", "cancelled", "canceled", "unpaid", "incomplete_expired"}
OWNER_ROLES = {"owner", "business_owner", "employer", "admin", "manager", "office_admin", "superadmin"}
WORKER_ROLES = {"worker", "staff", "field_worker", "technician", "subcontractor"}
PAYROLL_ROLES = {"payroll", "payroll_user", "payroll_admin"}
PAID_STATUSES = {"active", "paid", "trialing", "trial", "past_due"}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return _text(value).lower() in {"1", "true", "yes", "on", "active", "enabled", "verified", "granted"}


def _date(value: Any):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    raw = _text(value)
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _role(user: dict[str, Any]) -> str:
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    return _text(
        user.get("role")
        or user.get("user_role")
        or user.get("account_type")
        or user.get("worker_role")
        or business.get("role")
    ).lower().replace("-", "_").replace(" ", "_")


def _tester_access(user: dict[str, Any]) -> bool:
    status = _text(user.get("subscription_status") or user.get("billing_status") or user.get("status")).lower()
    if status in LOCKED_STATUSES or user.get("free_tester_revoked_at") or user.get("revoked_at") or user.get("locked_at"):
        return False
    tester = _truthy(user.get("free_tester_access")) or _truthy(user.get("is_tester")) or status == "tester_free"
    if not tester:
        return False
    until = _date(user.get("free_tester_until") or user.get("free_until"))
    return until is None or until > datetime.now(timezone.utc)


def _billing_proof(user: dict[str, Any]) -> bool:
    return bool(
        _text(user.get("stripe_subscription_id"))
        or _text(user.get("stripe_checkout_session_id"))
        or _text(user.get("checkout_session_id"))
        or _truthy(user.get("checkout_verified_by_stripe"))
        or _truthy(user.get("billing_verified"))
        or _truthy(user.get("subscription_verified"))
        or _truthy(user.get("manual_access_granted_by_app_owner"))
        or _truthy(user.get("access_granted_by_app_owner"))
    )


def paid_launch_app_access(user: dict[str, Any]) -> bool:
    if not isinstance(user, dict):
        return False
    email = _text(user.get("email")).lower()
    role = _role(user)
    status = _text(user.get("subscription_status") or user.get("plan_status") or user.get("billing_status") or user.get("stripe_status") or user.get("status")).lower()

    if email == "hello@churvox.com":
        return True
    if role in WORKER_ROLES or role in PAYROLL_ROLES:
        return status not in LOCKED_STATUSES and user.get("account_locked") is not True
    if _tester_access(user):
        return True
    if role and role not in OWNER_ROLES:
        return False
    if status in LOCKED_STATUSES or user.get("billing_lock_reason") or user.get("account_locked") is True or user.get("has_app_access") is False:
        return False
    if user.get("email_verified") is False:
        return False
    trial_end = _date(user.get("trial_ends_at"))
    if status in {"trial", "trialing"} and trial_end and trial_end <= datetime.now(timezone.utc):
        return False
    return status in PAID_STATUSES and _billing_proof(user)


def _client_key(scope, payload: dict[str, Any]) -> str:
    headers = {key.decode("latin1").lower(): value.decode("latin1") for key, value in scope.get("headers", [])}
    forwarded = _text(headers.get("x-forwarded-for")).split(",")[0].strip()
    client = scope.get("client") or ("unknown", 0)
    host = forwarded or _text(client[0]) or "unknown"
    email = _text(payload.get("email")).lower()
    return hashlib.sha256(f"{host}|{email}".encode("utf-8", "ignore")).hexdigest()


def _json_response(message: str, status: int):
    return JSONResponse({"success": False, "detail": message, "version": VERSION}, status_code=status)


class AuthPaidLaunchMiddleware:
    def __init__(self, app, module):
        self.app = app
        self.module = module

    async def _read_body(self, receive):
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

        return body, replay

    async def _strict_auth_me(self, scope, receive, send):
        messages = []

        async def capture(message):
            messages.append(message)

        await self.app(scope, receive, capture)
        start = next((message for message in messages if message.get("type") == "http.response.start"), None)
        body = b"".join(
            message.get("body", b"")
            for message in messages
            if message.get("type") == "http.response.body"
        )
        signed_out = False
        if start and int(start.get("status") or 0) == 200:
            try:
                payload = json.loads(body.decode("utf-8")) if body else {}
                signed_out = isinstance(payload, dict) and payload.get("authenticated") is False
            except Exception:
                signed_out = False
        if signed_out and start:
            start["status"] = 401
            headers = [
                (key, value)
                for key, value in list(start.get("headers", []) or [])
                if key.lower() not in {b"cache-control", b"x-churvox-auth-gate"}
            ]
            headers.extend([
                (b"cache-control", b"no-store"),
                (b"x-churvox-auth-gate", b"signed-out"),
            ])
            start["headers"] = headers
        for message in messages:
            await send(message)

    async def _rate_limited(self, kind: str, key: str, limit: int, minutes: int) -> bool:
        db = getattr(self.module, "db", None)
        if db is None:
            return False
        since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        try:
            count = await db.auth_security_events.count_documents({"kind": kind, "key": key, "created_at": {"$gte": since}})
            await db.auth_security_events.insert_one({"kind": kind, "key": key, "created_at": datetime.now(timezone.utc), "version": VERSION})
            return count >= limit
        except Exception:
            return False

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        method = scope.get("method", "GET").upper()

        if path == "/api/auth/me" and method == "GET":
            return await self._strict_auth_me(scope, receive, send)

        if path == "/api/auth/login":
            return await self.app(scope, receive, send)

        needs_body = (path, method) in PASSWORD_PATH_FIELDS or path in LOGIN_PATHS or path in FORGOT_PATHS or (path == "/api/auth/register" and method == "POST")
        if not needs_body:
            return await self.app(scope, receive, send)

        body, replay = await self._read_body(receive)
        try:
            payload = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            response = _json_response("Request body must be valid JSON.", 400)
            return await response(scope, replay, send)
        if not isinstance(payload, dict):
            response = _json_response("Request body must be an object.", 400)
            return await response(scope, replay, send)

        password_field = PASSWORD_PATH_FIELDS.get((path, method))
        if password_field:
            password = str(payload.get(password_field) or "")
            if len(password) < 8:
                response = _json_response("Password must be at least 8 characters.", 400)
                return await response(scope, replay, send)
            if len(password) > 128:
                response = _json_response("Password must be no more than 128 characters.", 400)
                return await response(scope, replay, send)

        key = _client_key(scope, payload)
        if path == "/api/auth/register" and method == "POST":
            if await self._rate_limited("register", key, 5, 60):
                response = _json_response("Too many account creation attempts. Try again later.", 429)
                return await response(scope, replay, send)
            if not _text(payload.get("name")):
                response = _json_response("Name is required.", 400)
                return await response(scope, replay, send)

        if path in FORGOT_PATHS:
            if await self._rate_limited("forgot_password", key, 5, 15):
                response = JSONResponse({"success": True, "message": "If the email exists, a reset link has been sent", "email_sent": True, "version": VERSION})
                return await response(scope, replay, send)

        if path in LOGIN_PATHS and await self._rate_limited("login_request", key, 30, 15):
            response = _json_response("Too many login requests. Try again in 15 minutes.", 429)
            return await response(scope, replay, send)

        return await self.app(scope, replay, send)


def install(module) -> None:
    app = getattr(module, "app", None)
    if app is None or getattr(app.state, "churvox_auth_paid_launch_hardening", False):
        return

    module._auth_has_app_access = paid_launch_app_access
    try:
        app.add_middleware(AuthPaidLaunchMiddleware, module=module)
    except Exception:
        pass
    app.state.churvox_auth_paid_launch_hardening = True
