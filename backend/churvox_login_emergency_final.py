from __future__ import annotations

import asyncio
import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi.responses import JSONResponse

VERSION = "churvox-login-emergency-final-20260712"
LOCKOUT_FAILURES = 5
LOCKOUT_MINUTES = 15
LOOKUP_TIMEOUT_SECONDS = 6
DISABLED_STATUSES = {
    "revoked", "locked", "disabled", "expired", "cancelled", "canceled",
    "removed", "archived", "inactive",
}


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


def _route_matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def _remove_route(app, path: str, method: str) -> None:
    app.router.routes = [
        route for route in list(getattr(app.router, "routes", []) or [])
        if not _route_matches(route, path, method)
    ]


def _client_host(request) -> str:
    forwarded = _text(request.headers.get("x-forwarded-for")).split(",")[0].strip()
    direct = _text(getattr(getattr(request, "client", None), "host", ""))
    return forwarded or direct or "unknown"


def _attempt_key(request, email: str) -> str:
    raw = f"paid-login|{_client_host(request)}|{email}"
    return hashlib.sha256(raw.encode("utf-8", "ignore")).hexdigest()


def _disabled(user: dict[str, Any]) -> bool:
    status = _lower(user.get("status") or user.get("account_status") or user.get("subscription_status"))
    return bool(
        status in DISABLED_STATUSES
        or user.get("active") is False
        or user.get("is_active") is False
        or user.get("account_locked") is True
        or user.get("revoked_at")
        or user.get("removed_at")
        or user.get("disabled_at")
        or user.get("free_tester_revoked_at")
    )


def _headers(stage: str) -> dict[str, str]:
    return {
        "Cache-Control": "no-store",
        "X-Churvox-Login-Route": VERSION,
        "X-Churvox-Login-Stage": stage,
    }


def _json(status: int, stage: str, body: dict[str, Any]) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        headers=_headers(stage),
        content={**body, "stage": stage, "version": VERSION},
    )


def _clear_cookies(response: JSONResponse) -> None:
    response.delete_cookie("access_token", path="/", secure=True, httponly=True, samesite="none")
    response.delete_cookie("refresh_token", path="/", secure=True, httponly=True, samesite="none")


def _set_cookies(response: JSONResponse, access: str, refresh: str) -> None:
    response.set_cookie(
        "access_token", access, httponly=True, secure=True,
        samesite="none", max_age=86400, path="/",
    )
    response.set_cookie(
        "refresh_token", refresh, httponly=True, secure=True,
        samesite="none", max_age=604800, path="/",
    )


def install(module) -> None:
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    Request = getattr(module, "Request", None)
    bcrypt = getattr(module, "bcrypt", None)
    jwt = getattr(module, "jwt", None)
    ObjectId = getattr(module, "ObjectId", None)
    algorithm = getattr(module, "JWT_ALGORITHM", "HS256")
    password_checker = getattr(module, "_auth_check_password", None)
    access_checker = getattr(module, "_auth_has_app_access", None)
    if any(item is None for item in (app, db, Request, bcrypt, jwt, ObjectId)):
        return

    async def _wait(awaitable, seconds: int):
        return await asyncio.wait_for(awaitable, timeout=seconds)

    async def _find_user(email: str):
        exact_query = {
            "$or": [
                {"email": email},
                {"canonical_email": email},
                {"normalized_email": email},
                {"login_email": email},
            ]
        }
        user = await _wait(db.users.find_one(exact_query), LOOKUP_TIMEOUT_SECONDS)
        if user:
            return user, "exact"

        # Legacy records may contain mixed-case email values. Keep this fallback
        # bounded so a collection scan can never hold the login request open.
        pattern = re.compile(f"^{re.escape(email)}$", re.IGNORECASE)
        user = await _wait(db.users.find_one({"email": pattern}), LOOKUP_TIMEOUT_SECONDS)
        return user, "case-insensitive"

    async def _read_attempt(key: str) -> dict[str, Any]:
        try:
            return await _wait(db.login_attempts.find_one({"identifier": key}), 3) or {}
        except Exception:
            return {}

    async def _record_failure(key: str, previous: dict[str, Any]) -> None:
        count = int(previous.get("count") or 0) + 1
        now = _now()
        try:
            await _wait(
                db.login_attempts.update_one(
                    {"identifier": key},
                    {"$set": {
                        "identifier": key,
                        "count": count,
                        "last_failed_at": now,
                        "locked_until": now + timedelta(minutes=LOCKOUT_MINUTES) if count >= LOCKOUT_FAILURES else None,
                        "version": VERSION,
                    }},
                    upsert=True,
                ),
                3,
            )
        except Exception:
            pass

    async def _clear_failure(key: str) -> None:
        try:
            await _wait(db.login_attempts.delete_one({"identifier": key}), 3)
        except Exception:
            pass

    def _password_ok(password: str, user: dict[str, Any]):
        if callable(password_checker):
            try:
                result = password_checker(password, user)
                if isinstance(result, tuple):
                    return bool(result[0]), result[1] if len(result) > 1 else None
                return bool(result), None
            except Exception:
                pass

        for field in ("password_hash", "hashed_password", "passwordHash", "bcrypt_hash", "pass_hash"):
            stored = user.get(field)
            if not isinstance(stored, str) or not stored:
                continue
            try:
                if bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8")):
                    return True, field
            except Exception:
                continue
        for field in ("password", "plain_password", "temp_password", "temporary_password"):
            if isinstance(user.get(field), str) and user.get(field) == password:
                return True, field
        return False, None

    def _tokens(user_id: str, email: str):
        secret = _text(getattr(module, "JWT_SECRET", ""))
        if len(secret) < 32:
            raise RuntimeError("JWT signing secret unavailable")
        now = _now()
        access = jwt.encode({
            "sub": user_id,
            "email": email,
            "iat": now.timestamp(),
            "exp": now + timedelta(hours=24),
            "type": "access",
            "jti": secrets.token_urlsafe(18),
            "session_version": 4,
        }, secret, algorithm=algorithm)
        refresh = jwt.encode({
            "sub": user_id,
            "iat": now.timestamp(),
            "exp": now + timedelta(days=7),
            "type": "refresh",
            "jti": secrets.token_urlsafe(18),
            "session_version": 4,
        }, secret, algorithm=algorithm)
        return access, refresh

    def _public_user(user: dict[str, Any], access: str) -> dict[str, Any]:
        user_id = _text(user.get("_id") or user.get("id"))
        business_id = _text(user.get("business_id") or user_id)
        try:
            has_access = bool(access_checker(user)) if callable(access_checker) else bool(user.get("has_app_access"))
        except Exception:
            has_access = bool(user.get("has_app_access"))
        safe_user = {
            "id": user_id,
            "email": _lower(user.get("email")),
            "name": user.get("name") or user.get("business_name") or "Churvox user",
            "business_name": user.get("business_name"),
            "role": user.get("role") or "employer",
            "plan": user.get("plan") or "none",
            "subscription_status": user.get("subscription_status") or "none",
            "trial_ends_at": user.get("trial_ends_at").isoformat() if isinstance(user.get("trial_ends_at"), datetime) else user.get("trial_ends_at"),
            "email_verified": user.get("email_verified", True),
            "business_id": business_id,
            "gst_rate": user.get("gst_rate", 15),
            "trade_type": user.get("trade_type", "other"),
            "billing_country": user.get("billing_country") or user.get("country") or "NZ",
            "country": user.get("country") or user.get("billing_country") or "NZ",
            "has_app_access": has_access,
            "token": access,
        }
        return safe_user

    async def emergency_login(request: Request):
        try:
            try:
                payload = await request.json()
            except Exception:
                return _json(400, "invalid-json", {"success": False, "detail": "Login request must be valid JSON."})

            email = _lower((payload or {}).get("email"))
            password = _text((payload or {}).get("password"))
            if not email or not password:
                return _json(400, "input", {"success": False, "detail": "Enter your email and password."})

            key = _attempt_key(request, email)
            attempt = await _read_attempt(key)
            locked_until = _aware(attempt.get("locked_until"))
            if int(attempt.get("count") or 0) >= LOCKOUT_FAILURES and locked_until and locked_until > _now():
                return _json(429, "lockout", {"success": False, "detail": "Too many failed attempts. Try again in 15 minutes."})

            try:
                user, lookup_mode = await _find_user(email)
            except asyncio.TimeoutError:
                return _json(503, "user-lookup-timeout", {"success": False, "detail": "Login database lookup timed out. Please try again shortly.", "retryable": True})
            except Exception as exc:
                return _json(503, "user-lookup-error", {"success": False, "detail": "Login database lookup is unavailable. Please try again shortly.", "error_type": exc.__class__.__name__, "retryable": True})

            valid, matched_field = _password_ok(password, user or {}) if user else (False, None)
            if not user or not valid:
                await _record_failure(key, attempt)
                response = _json(401, "invalid-credentials", {"success": False, "detail": "Invalid email or password."})
                _clear_cookies(response)
                return response

            status = _lower(user.get("status") or user.get("subscription_status"))
            if status == "invited":
                response = _json(403, "invite-required", {"success": False, "detail": "Complete your account setup using the invite link sent to your email."})
                _clear_cookies(response)
                return response
            if _disabled(user):
                response = _json(403, "account-disabled", {"success": False, "detail": "Account access is disabled. Contact Churvox support."})
                _clear_cookies(response)
                return response

            user_id = _text(user.get("_id"))
            try:
                access, refresh = _tokens(user_id, email)
            except Exception as exc:
                return _json(503, "token-create", {"success": False, "detail": "Secure login token creation failed.", "error_type": exc.__class__.__name__, "retryable": True})

            safe_user = _public_user(user, access)
            response = _json(200, "complete", {
                "success": True,
                **safe_user,
                "user": dict(safe_user),
                "login_route": VERSION,
                "lookup_mode": lookup_mode,
            })
            _set_cookies(response, access, refresh)
            await _clear_failure(key)

            now = _now()
            updates: dict[str, Any] = {
                "last_login_at": now,
                "updated_at": now,
                "canonical_email": email,
                "normalized_email": email,
            }
            unset = {}
            if matched_field and matched_field in {"password", "plain_password", "temp_password", "temporary_password"}:
                try:
                    updates["password_hash"] = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                    unset = {"password": "", "plain_password": "", "temp_password": "", "temporary_password": ""}
                except Exception:
                    unset = {}
            try:
                await _wait(db.users.update_one({"_id": user["_id"]}, {"$set": updates, **({"$unset": unset} if unset else {})}), 4)
            except Exception:
                pass
            return response
        except Exception as exc:
            return _json(503, "unhandled-login-error", {
                "success": False,
                "detail": "Login could not be completed. Please try again shortly.",
                "error_type": exc.__class__.__name__,
                "retryable": True,
            })

    async def emergency_health():
        route_count = sum(
            1 for route in list(getattr(app.router, "routes", []) or [])
            if _route_matches(route, "/api/auth/login", "POST")
        )
        try:
            await _wait(db.command("ping"), 5)
            database_ready = True
            database_stage = "ready"
        except Exception as exc:
            database_ready = False
            database_stage = f"{exc.__class__.__name__}"
        secret_ready = len(_text(getattr(module, "JWT_SECRET", ""))) >= 32
        return {
            "success": True,
            "ready": bool(database_ready and secret_ready and route_count == 1),
            "database_ready": database_ready,
            "database_stage": database_stage,
            "jwt_ready": secret_ready,
            "login_route": VERSION,
            "login_route_count": route_count,
            "version": VERSION,
        }

    emergency_login.__annotations__ = {"request": Request}
    _remove_route(app, "/api/auth/login", "POST")
    _remove_route(app, "/api/auth/login-health", "GET")
    app.add_api_route("/api/auth/login", emergency_login, methods=["POST"])
    app.add_api_route("/api/auth/login-health", emergency_health, methods=["GET"])
    app.state.churvox_login_emergency_final = VERSION
