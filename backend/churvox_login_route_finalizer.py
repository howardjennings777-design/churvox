from __future__ import annotations

import asyncio
import hashlib
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any

VERSION = "churvox-login-route-finalizer-20260712"
DB_WARM_TIMEOUT_SECONDS = 25
DB_QUERY_TIMEOUT_SECONDS = 20
LOCKOUT_FAILURES = 5
LOCKOUT_MINUTES = 15
PLAIN_PASSWORD_FIELDS = ("password", "plain_password", "temp_password", "temporary_password", "invite_password")
DISABLED_STATUSES = {"revoked", "locked", "disabled", "expired", "cancelled", "canceled", "removed", "archived", "inactive"}


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
    raw = f"owner-login|{_client_host(request)}|{_lower(email)}"
    return hashlib.sha256(raw.encode("utf-8", "ignore")).hexdigest()


def _disabled(user: dict | None) -> bool:
    user = user or {}
    status = _lower(user.get("status") or user.get("account_status") or user.get("subscription_status"))
    return bool(
        status in DISABLED_STATUSES
        or user.get("active") is False
        or user.get("is_active") is False
        or user.get("account_locked") is True
        or user.get("revoked_at")
        or user.get("removed_at")
        or user.get("disabled_at")
    )


def install(module) -> None:
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    UserLogin = getattr(module, "UserLogin", None)
    Response = getattr(module, "Response", None)
    Request = getattr(module, "Request", None)
    clear_auth_cookies = getattr(module, "clear_auth_cookies", None)
    set_auth_cookies = getattr(module, "set_auth_cookies", None)
    create_access_token = getattr(module, "create_access_token", None)
    create_refresh_token = getattr(module, "create_refresh_token", None)
    normal_email = getattr(module, "_auth_normal_email", None)
    check_password = getattr(module, "_auth_check_password", None)
    user_response = getattr(module, "_auth_user_response", None)
    bcrypt = getattr(module, "bcrypt", None)

    required = (
        app, db, UserLogin, Response, Request, clear_auth_cookies, set_auth_cookies,
        create_access_token, create_refresh_token, normal_email, check_password,
        user_response, bcrypt,
    )
    if any(item is None for item in required):
        return

    async def _wait(awaitable, seconds: int):
        return await asyncio.wait_for(awaitable, timeout=seconds)

    async def _warm_database() -> tuple[bool, str, int]:
        started = time.perf_counter()
        try:
            await _wait(db.command("ping"), DB_WARM_TIMEOUT_SECONDS)
            app.state.churvox_login_mongo_ready = True
            elapsed = int((time.perf_counter() - started) * 1000)
            return True, "ready", elapsed
        except asyncio.TimeoutError:
            app.state.churvox_login_mongo_ready = False
            return False, "mongo-ping-timeout", int((time.perf_counter() - started) * 1000)
        except Exception as exc:
            app.state.churvox_login_mongo_ready = False
            return False, f"mongo-ping-{exc.__class__.__name__}", int((time.perf_counter() - started) * 1000)

    async def _find_user(email: str):
        exact = await _wait(db.users.find_one({"email": email}), DB_QUERY_TIMEOUT_SECONDS)
        if exact:
            return exact
        pattern = re.compile(f"^{re.escape(email)}$", re.IGNORECASE)
        return await _wait(db.users.find_one({"email": pattern}), DB_QUERY_TIMEOUT_SECONDS)

    async def _read_attempt(key: str) -> dict:
        try:
            return await _wait(db.login_attempts.find_one({"identifier": key}), 5) or {}
        except Exception:
            return {}

    async def _record_failure(key: str, previous: dict) -> None:
        count = int((previous or {}).get("count") or 0) + 1
        now = _now()
        locked_until = now + timedelta(minutes=LOCKOUT_MINUTES) if count >= LOCKOUT_FAILURES else None
        try:
            await _wait(
                db.login_attempts.update_one(
                    {"identifier": key},
                    {"$set": {
                        "identifier": key,
                        "count": count,
                        "last_failed_at": now,
                        "locked_until": locked_until,
                        "version": VERSION,
                    }},
                    upsert=True,
                ),
                5,
            )
        except Exception:
            pass

    async def _clear_failure(key: str) -> None:
        try:
            await _wait(db.login_attempts.delete_one({"identifier": key}), 5)
        except Exception:
            pass

    def _headers(response, stage: str = "complete") -> None:
        response.headers["X-Churvox-Login-Route"] = VERSION
        response.headers["X-Churvox-Login-Stage"] = stage
        response.headers["Cache-Control"] = "no-store"

    async def definitive_login(user_data: UserLogin, response: Response, request: Request):
        clear_auth_cookies(response)
        _headers(response, "input")
        email = normal_email(getattr(user_data, "email", ""))
        password = _text(getattr(user_data, "password", ""))
        if not email or not password:
            response.status_code = 400
            return {"success": False, "detail": "Enter your email and password.", "version": VERSION}

        key = _attempt_key(request, email)
        attempt = await _read_attempt(key)
        locked_until = _aware(attempt.get("locked_until"))
        if int(attempt.get("count") or 0) >= LOCKOUT_FAILURES and locked_until and locked_until > _now():
            _headers(response, "lockout")
            response.status_code = 429
            return {"success": False, "detail": "Too many failed attempts. Try again in 15 minutes.", "version": VERSION}

        ready, db_stage, elapsed_ms = await _warm_database()
        if not ready:
            _headers(response, db_stage)
            response.headers["Retry-After"] = "5"
            response.status_code = 503
            return {
                "success": False,
                "detail": "Login database is unavailable. Please try again shortly.",
                "stage": db_stage,
                "elapsed_ms": elapsed_ms,
                "version": VERSION,
            }

        try:
            _headers(response, "user-lookup")
            user = await _find_user(email)
        except asyncio.TimeoutError:
            _headers(response, "mongo-user-lookup-timeout")
            response.headers["Retry-After"] = "5"
            response.status_code = 503
            return {
                "success": False,
                "detail": "Login database lookup timed out. Please try again shortly.",
                "stage": "mongo-user-lookup-timeout",
                "version": VERSION,
            }
        except Exception as exc:
            stage = f"mongo-user-lookup-{exc.__class__.__name__}"
            _headers(response, stage)
            response.headers["Retry-After"] = "5"
            response.status_code = 503
            return {
                "success": False,
                "detail": "Login database lookup is unavailable. Please try again shortly.",
                "stage": stage,
                "version": VERSION,
            }

        valid = False
        matched_field = None
        if user:
            try:
                valid, matched_field = check_password(password, user)
            except Exception:
                valid = False
        else:
            try:
                bcrypt.checkpw(password.encode("utf-8"), bcrypt.hashpw(b"churvox-login-timing-check", bcrypt.gensalt()))
            except Exception:
                pass

        if not user or not valid:
            await _record_failure(key, attempt)
            clear_auth_cookies(response)
            _headers(response, "invalid-credentials")
            response.status_code = 401
            return {"success": False, "detail": "Invalid email or password.", "version": VERSION}

        status = _lower(user.get("status") or user.get("subscription_status"))
        if status == "invited":
            clear_auth_cookies(response)
            _headers(response, "invite-required")
            response.status_code = 403
            return {
                "success": False,
                "detail": "Complete your account setup using the invite link sent to your email.",
                "version": VERSION,
            }
        if _disabled(user):
            clear_auth_cookies(response)
            _headers(response, "account-disabled")
            response.status_code = 403
            return {"success": False, "detail": "Account access is disabled. Contact Churvox support.", "version": VERSION}

        await _clear_failure(key)
        user_id = str(user["_id"])
        access = create_access_token(user_id, email)
        refresh = create_refresh_token(user_id)
        set_auth_cookies(response, access, refresh)
        now = _now()
        updates = {"last_login_at": now, "updated_at": now}

        owner_business_id = user.get("business_id") or user.get("_id")
        if str(owner_business_id) == str(user.get("_id")) and _lower(user.get("role")) in {"worker", "payroll", "payroll_user"}:
            updates.update({
                "role": "employer",
                "user_role": "employer",
                "worker_role": None,
                "is_worker": False,
                "worker": False,
                "worker_login": False,
            })
        if matched_field and matched_field != "password_hash":
            try:
                updates["password_hash"] = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            except Exception:
                pass
        if not user.get("business_id"):
            updates["business_id"] = user["_id"]

        try:
            await _wait(
                db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": updates, "$unset": {field: "" for field in PLAIN_PASSWORD_FIELDS}},
                ),
                8,
            )
        except Exception:
            pass
        user.update(updates)
        result = user_response(user, access)
        if isinstance(result, dict):
            result["version"] = VERSION
            result["login_route"] = VERSION
        _headers(response, "complete")
        return result

    async def login_health():
        ready, stage, elapsed_ms = await _warm_database()
        route_count = sum(
            1 for route in list(getattr(app.router, "routes", []) or [])
            if _route_matches(route, "/api/auth/login", "POST")
        )
        return {
            "success": True,
            "ready": ready,
            "database_stage": stage,
            "elapsed_ms": elapsed_ms,
            "login_route": VERSION,
            "login_route_count": route_count,
            "jwt_source": _text(getattr(module, "CHURVOX_JWT_SECRET_SOURCE", "unknown")),
            "version": VERSION,
        }

    definitive_login.__annotations__ = {
        "user_data": UserLogin,
        "response": Response,
        "request": Request,
    }

    _remove_route(app, "/api/auth/login", "POST")
    _remove_route(app, "/api/auth/login-health", "GET")
    app.add_api_route("/api/auth/login", definitive_login, methods=["POST"])
    app.add_api_route("/api/auth/login-health", login_health, methods=["GET"])
    app.state.churvox_login_route_finalizer = VERSION
