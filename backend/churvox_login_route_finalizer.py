from __future__ import annotations

import asyncio
import hashlib
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any

VERSION = "churvox-login-route-finalizer-20260712b"
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


def _safe(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    if isinstance(value, list):
        return [_safe(item) for item in value]
    if isinstance(value, dict):
        output = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(word in lowered for word in ("password", "hash", "secret", "refresh_token")):
                continue
            output["id" if key == "_id" else key] = _safe(item)
        return output
    return value


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
    jwt = getattr(module, "jwt", None)
    algorithm = getattr(module, "JWT_ALGORITHM", "HS256")
    secrets_module = getattr(module, "secrets", None)

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

    def _service_error(response, stage: str, detail: str, exc: Exception | None = None):
        error_type = exc.__class__.__name__ if exc is not None else "Unavailable"
        _headers(response, stage)
        response.headers["Retry-After"] = "5"
        response.status_code = 503
        return {
            "success": False,
            "detail": detail,
            "stage": stage,
            "error_type": error_type,
            "version": VERSION,
        }

    def _fallback_access_token(user_id: str, email: str) -> str:
        if jwt is None:
            raise RuntimeError("JWT library unavailable")
        secret = _text(getattr(module, "JWT_SECRET", ""))
        if len(secret) < 32:
            raise RuntimeError("JWT signing secret unavailable")
        now = _now()
        payload = {
            "sub": str(user_id),
            "email": _lower(email),
            "iat": now.timestamp(),
            "exp": now + timedelta(hours=24),
            "type": "access",
            "session_version": 3,
        }
        if secrets_module is not None:
            payload["jti"] = secrets_module.token_urlsafe(18)
        return jwt.encode(payload, secret, algorithm=algorithm)

    def _fallback_refresh_token(user_id: str) -> str:
        if jwt is None:
            raise RuntimeError("JWT library unavailable")
        secret = _text(getattr(module, "JWT_SECRET", ""))
        if len(secret) < 32:
            raise RuntimeError("JWT signing secret unavailable")
        now = _now()
        payload = {
            "sub": str(user_id),
            "iat": now.timestamp(),
            "exp": now + timedelta(days=7),
            "type": "refresh",
            "session_version": 3,
        }
        if secrets_module is not None:
            payload["jti"] = secrets_module.token_urlsafe(18)
        return jwt.encode(payload, secret, algorithm=algorithm)

    def _tokens(user_id: str, email: str):
        try:
            access = create_access_token(user_id, email)
        except Exception:
            access = _fallback_access_token(user_id, email)
        try:
            refresh = create_refresh_token(user_id)
        except Exception:
            refresh = _fallback_refresh_token(user_id)
        if not _text(access) or not _text(refresh):
            raise RuntimeError("Token creation returned an empty value")
        return access, refresh

    def _write_cookies(response, access: str, refresh: str) -> None:
        try:
            set_auth_cookies(response, access, refresh)
            return
        except Exception:
            pass
        response.set_cookie(
            key="access_token", value=access, httponly=True, secure=True,
            samesite="none", max_age=86400, path="/",
        )
        response.set_cookie(
            key="refresh_token", value=refresh, httponly=True, secure=True,
            samesite="none", max_age=604800, path="/",
        )

    def _fallback_user_response(user: dict, access: str) -> dict:
        user_id = _text(user.get("_id") or user.get("id"))
        business_id = _text(user.get("business_id") or user_id)
        safe_user = {
            "id": user_id,
            "email": _lower(user.get("email")),
            "name": user.get("name") or user.get("business_name") or "Churvox user",
            "business_name": user.get("business_name"),
            "role": user.get("role") or "employer",
            "plan": user.get("plan") or "none",
            "subscription_status": user.get("subscription_status") or "none",
            "trial_ends_at": _safe(user.get("trial_ends_at")),
            "email_verified": user.get("email_verified", True),
            "business_id": business_id,
            "gst_rate": user.get("gst_rate", 15),
            "trade_type": user.get("trade_type", "other"),
            "billing_country": user.get("billing_country") or user.get("country") or "NZ",
            "country": user.get("country") or user.get("billing_country") or "NZ",
            "has_app_access": bool(user.get("has_app_access")),
            "token": access,
        }
        return {"success": True, **safe_user, "user": dict(safe_user), "version": VERSION, "login_route": VERSION}

    async def definitive_login(user_data: UserLogin, response: Response, request: Request):
        try:
            clear_auth_cookies(response)
        except Exception:
            pass
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
            result = _service_error(response, db_stage, "Login database is unavailable. Please try again shortly.")
            result["elapsed_ms"] = elapsed_ms
            return result

        try:
            _headers(response, "user-lookup")
            user = await _find_user(email)
        except asyncio.TimeoutError as exc:
            return _service_error(response, "mongo-user-lookup-timeout", "Login database lookup timed out. Please try again shortly.", exc)
        except Exception as exc:
            return _service_error(response, f"mongo-user-lookup-{exc.__class__.__name__}", "Login database lookup is unavailable. Please try again shortly.", exc)

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
            try:
                clear_auth_cookies(response)
            except Exception:
                pass
            _headers(response, "invalid-credentials")
            response.status_code = 401
            return {"success": False, "detail": "Invalid email or password.", "version": VERSION}

        status = _lower(user.get("status") or user.get("subscription_status"))
        if status == "invited":
            try:
                clear_auth_cookies(response)
            except Exception:
                pass
            _headers(response, "invite-required")
            response.status_code = 403
            return {
                "success": False,
                "detail": "Complete your account setup using the invite link sent to your email.",
                "version": VERSION,
            }
        if _disabled(user):
            try:
                clear_auth_cookies(response)
            except Exception:
                pass
            _headers(response, "account-disabled")
            response.status_code = 403
            return {"success": False, "detail": "Account access is disabled. Contact Churvox support.", "version": VERSION}

        await _clear_failure(key)
        user_id = _text(user.get("_id"))
        try:
            _headers(response, "token-create")
            access, refresh = _tokens(user_id, email)
        except Exception as exc:
            return _service_error(response, f"token-create-{exc.__class__.__name__}", "Secure login token creation failed. Please try again shortly.", exc)

        try:
            _headers(response, "cookie-write")
            _write_cookies(response, access, refresh)
        except Exception as exc:
            return _service_error(response, f"cookie-write-{exc.__class__.__name__}", "Secure login cookie creation failed. Please try again shortly.", exc)

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

        try:
            _headers(response, "response-build")
            result = user_response(user, access)
            if not isinstance(result, dict):
                result = _fallback_user_response(user, access)
        except Exception:
            result = _fallback_user_response(user, access)
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
        token_ready = False
        cookie_ready = False
        response_ready = False
        token_stage = "not-tested"
        try:
            probe_user_id = "000000000000000000000001"
            probe_access, probe_refresh = _tokens(probe_user_id, "login-health@churvox.invalid")
            token_ready = bool(probe_access and probe_refresh)
            token_stage = "ready"
            probe_response = Response()
            _write_cookies(probe_response, probe_access, probe_refresh)
            cookie_ready = len(getattr(probe_response, "raw_headers", []) or []) > 0
            synthetic = {
                "_id": probe_user_id,
                "business_id": probe_user_id,
                "email": "login-health@churvox.invalid",
                "name": "Login health",
                "role": "employer",
                "plan": "none",
                "subscription_status": "none",
                "email_verified": True,
            }
            try:
                built = user_response(synthetic, probe_access)
            except Exception:
                built = _fallback_user_response(synthetic, probe_access)
            response_ready = isinstance(built, dict) and built.get("success") is True
        except Exception as exc:
            token_stage = f"{exc.__class__.__name__}"
        return {
            "success": True,
            "ready": bool(ready and token_ready and cookie_ready and response_ready),
            "database_ready": ready,
            "database_stage": stage,
            "elapsed_ms": elapsed_ms,
            "token_ready": token_ready,
            "cookie_ready": cookie_ready,
            "response_ready": response_ready,
            "token_stage": token_stage,
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
