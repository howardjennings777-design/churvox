from __future__ import annotations

import hashlib
import importlib
import importlib.abc
import importlib.machinery
import re
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

VERSION = "churvox-password-recovery-paid-launch-20260712"
TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()
DISABLED_ACCOUNT_STATUSES = {"revoked", "locked", "disabled", "removed", "archived"}
AUTH_EXEMPT_PATHS = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/worker-login",
    "/api/worker/auth/login",
}
AUTH_EXEMPT_PREFIXES = (
    "/api/auth/verify-email/",
    "/api/public/",
    "/api/health",
    "/api/security/",
    "/api/billing/webhook",
    "/api/billing/stripe-webhook",
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: Any) -> str:
    return _text(value).lower()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: Any):
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


def _token_time(payload: dict | None):
    payload = payload or {}
    raw = payload.get("iat")
    if raw is None:
        return None
    try:
        return datetime.fromtimestamp(float(raw), tz=timezone.utc)
    except Exception:
        return None


def session_is_revoked(user: dict | None, payload: dict | None) -> bool:
    user = user or {}
    invalid_before = _aware(user.get("session_invalid_before") or user.get("password_changed_at"))
    if not invalid_before:
        return False
    issued_at = _token_time(payload)
    return issued_at is None or issued_at <= invalid_before


def account_disabled(user: dict | None) -> bool:
    user = user or {}
    status = _lower(user.get("status") or user.get("account_status"))
    return bool(
        status in DISABLED_ACCOUNT_STATUSES
        or user.get("account_locked") is True
        or user.get("revoked_at")
        or user.get("disabled_at")
        or user.get("removed_at")
    )


def _hash_token(token: str) -> str:
    return hashlib.sha256(_text(token).encode("utf-8", "ignore")).hexdigest()


def _route_matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def _remove_route(app, path: str, method: str) -> None:
    try:
        app.router.routes = [route for route in app.router.routes if not _route_matches(route, path, method)]
    except Exception:
        pass


def _auth_exempt(path: str) -> bool:
    return path in AUTH_EXEMPT_PATHS or any(path.startswith(prefix) for prefix in AUTH_EXEMPT_PREFIXES)


def install(module) -> None:
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    jwt = getattr(module, "jwt", None)
    JWT_SECRET = getattr(module, "JWT_SECRET", None)
    JWT_ALGORITHM = getattr(module, "JWT_ALGORITHM", "HS256")
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    Response = getattr(module, "Response", None)
    Request = getattr(module, "Request", None)
    ForgotPassword = getattr(module, "ForgotPassword", None)
    ResetPassword = getattr(module, "ResetPassword", None)
    hash_password = getattr(module, "hash_password", None)
    clear_auth_cookies = getattr(module, "clear_auth_cookies", None)
    set_auth_cookies = getattr(module, "set_auth_cookies", None)
    email_provider = getattr(module, "email_provider", None)
    build_password_reset_email = getattr(module, "build_password_reset_email", None)
    secrets = getattr(module, "secrets", None)
    os = getattr(module, "os", None)
    FRONTEND_URL = getattr(module, "FRONTEND_URL", "https://www.churvox.com")

    required = (
        app, db, jwt, JWT_SECRET, ObjectId, HTTPException, Response, Request,
        ForgotPassword, ResetPassword, hash_password, clear_auth_cookies,
        set_auth_cookies, email_provider, build_password_reset_email, secrets, os,
    )
    if any(item is None for item in required):
        return

    def create_access_token(user_id: str, email: str) -> str:
        now = _now()
        payload = {
            "sub": str(user_id),
            "email": _lower(email),
            "iat": int(now.timestamp()),
            "exp": now + timedelta(hours=24),
            "type": "access",
            "session_version": 2,
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    def create_refresh_token(user_id: str) -> str:
        now = _now()
        payload = {
            "sub": str(user_id),
            "iat": int(now.timestamp()),
            "exp": now + timedelta(days=7),
            "type": "refresh",
            "session_version": 2,
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    module.create_access_token = create_access_token
    module.create_refresh_token = create_refresh_token

    async def _find_user_by_email(email: str):
        try:
            exact = await db.users.find_one({"email": email})
            if exact:
                return exact
        except Exception:
            pass
        try:
            return await db.users.find_one({"email": re.compile(f"^{re.escape(email)}$", re.IGNORECASE)})
        except Exception:
            return None

    def _token_from_request(request):
        header = _text(request.headers.get("Authorization"))
        if header.startswith("Bearer "):
            return header[7:].strip()
        return _text(request.cookies.get("access_token"))

    @app.middleware("http")
    async def password_change_session_guard(request, call_next):
        path = request.url.path
        if request.method.upper() == "OPTIONS" or not path.startswith("/api") or _auth_exempt(path):
            return await call_next(request)
        token = _token_from_request(request)
        if not token:
            return await call_next(request)
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("type") != "access":
                return await call_next(request)
            user = await db.users.find_one({"_id": ObjectId(str(payload.get("sub") or ""))})
            if not user:
                response = module.JSONResponse({"success": False, "detail": "Session is no longer valid.", "version": VERSION}, status_code=401)
                clear_auth_cookies(response)
                return response
            if account_disabled(user) or session_is_revoked(user, payload):
                response = module.JSONResponse({"success": False, "detail": "Session expired. Sign in again.", "version": VERSION}, status_code=401)
                clear_auth_cookies(response)
                return response
        except getattr(jwt, "ExpiredSignatureError", Exception):
            response = module.JSONResponse({"success": False, "detail": "Session expired. Sign in again.", "version": VERSION}, status_code=401)
            clear_auth_cookies(response)
            return response
        except getattr(jwt, "InvalidTokenError", Exception):
            return await call_next(request)
        except Exception:
            return await call_next(request)
        return await call_next(request)

    async def final_forgot_password(data: ForgotPassword):
        email = _lower(getattr(data, "email", ""))
        generic = {
            "success": True,
            "message": "If the email exists, a reset link has been sent.",
            "email_sent": True,
            "version": VERSION,
        }
        user = await _find_user_by_email(email)
        if not user:
            return generic

        now = _now()
        try:
            await db.password_reset_tokens.update_many(
                {"user_id": user["_id"], "used": False},
                {"$set": {"used": True, "replaced_at": now}},
            )
        except Exception:
            pass

        raw_token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token_hash": _hash_token(raw_token),
            "user_id": user["_id"],
            "expires_at": now + timedelta(hours=1),
            "used": False,
            "created_at": now,
            "version": VERSION,
        })

        frontend = _text(os.environ.get("FRONTEND_URL") or FRONTEND_URL).rstrip("/")
        reset_link = f"{frontend}/reset-password?token={raw_token}"
        content = build_password_reset_email(user.get("name", "there"), reset_link)
        try:
            result = await email_provider.send(to=email, subject=content["subject"], html=content["html"])
            success = bool(result.success)
            provider = result.provider
            email_id = result.email_id
            error = result.error
        except Exception as exc:
            success = False
            provider = ""
            email_id = ""
            error = str(exc)

        try:
            await db.password_reset_emails.insert_one({
                "to": email,
                "user_id": user["_id"],
                "status": "sent" if success else "failed",
                "provider": provider,
                "email_id": email_id,
                "error": error,
                "created_at": now,
                "version": VERSION,
            })
        except Exception:
            pass
        return generic

    async def final_reset_password(data: ResetPassword, response: Response):
        raw_token = _text(getattr(data, "token", ""))
        password = _text(getattr(data, "new_password", ""))
        if not raw_token or len(raw_token) > 512:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        now = _now()
        token_hash = _hash_token(raw_token)
        token_doc = await db.password_reset_tokens.find_one({
            "$or": [{"token_hash": token_hash}, {"token": raw_token}],
            "used": False,
            "expires_at": {"$gt": now},
        })
        if not token_doc:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        claimed = await db.password_reset_tokens.update_one(
            {"_id": token_doc["_id"], "used": False, "expires_at": {"$gt": now}},
            {"$set": {"used": True, "used_at": now}},
        )
        if int(getattr(claimed, "modified_count", 0) or 0) != 1:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        user_update = {
            "$set": {
                "password_hash": hash_password(password),
                "password_changed_at": now,
                "session_invalid_before": now,
                "updated_at": now,
            },
            "$unset": {
                "password": "",
                "plain_password": "",
                "temp_password": "",
                "temporary_password": "",
                "invite_password": "",
                "hashed_password": "",
                "passwordHash": "",
                "bcrypt_hash": "",
                "pass_hash": "",
            },
        }
        updated = await db.users.update_one({"_id": token_doc["user_id"]}, user_update)
        if int(getattr(updated, "matched_count", 0) or 0) != 1:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        try:
            await db.password_reset_tokens.update_many(
                {"user_id": token_doc["user_id"], "used": False},
                {"$set": {"used": True, "invalidated_at": now}},
            )
            await db.auth_security_events.insert_one({
                "kind": "password_reset_completed",
                "user_id": str(token_doc["user_id"]),
                "created_at": now,
                "version": VERSION,
            })
        except Exception:
            pass

        clear_auth_cookies(response)
        return {
            "success": True,
            "message": "Password reset successfully. All older sessions have been signed out.",
            "sessions_revoked": True,
            "version": VERSION,
        }

    async def final_refresh(request: Request, response: Response):
        token = _text(request.cookies.get("refresh_token"))
        if not token:
            raise HTTPException(status_code=401, detail="No refresh token")
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=401, detail="Invalid token type")
            user = await db.users.find_one({"_id": ObjectId(str(payload.get("sub") or ""))})
            if not user or account_disabled(user) or session_is_revoked(user, payload):
                raise HTTPException(status_code=401, detail="Session expired. Sign in again.")
            access = create_access_token(str(user["_id"]), user.get("email"))
            refresh = create_refresh_token(str(user["_id"]))
            set_auth_cookies(response, access, refresh)
            responder = getattr(module, "_auth_user_response", None)
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

    final_forgot_password.__annotations__ = {"data": ForgotPassword}
    final_reset_password.__annotations__ = {"data": ResetPassword, "response": Response}
    final_refresh.__annotations__ = {"request": Request, "response": Response}

    _remove_route(app, "/api/auth/forgot-password", "POST")
    _remove_route(app, "/api/auth/reset-password", "POST")
    _remove_route(app, "/api/auth/refresh", "POST")
    app.add_api_route("/api/auth/forgot-password", final_forgot_password, methods=["POST"])
    app.add_api_route("/api/auth/reset-password", final_reset_password, methods=["POST"])
    app.add_api_route("/api/auth/refresh", final_refresh, methods=["POST"])

    app.state.churvox_password_recovery_paid_launch = VERSION
    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        if hasattr(self.original, "create_module"):
            return self.original.create_module(spec)
        return None

    def exec_module(self, module):
        self.original.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
