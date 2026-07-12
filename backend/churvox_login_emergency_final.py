from __future__ import annotations

import asyncio
import hashlib
import importlib
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

try:
    from fastapi.responses import JSONResponse
except Exception:  # Unit tests for pure helpers do not need FastAPI installed.
    JSONResponse = None

VERSION = "churvox-login-emergency-final-20260712c"
LOCKOUT_FAILURES = 5
LOCKOUT_MINUTES = 15
LOOKUP_TIMEOUT_SECONDS = 6
PLATFORM_OWNER_EMAIL = "hello@churvox.com"

OWNER_ROLES = {
    "owner", "business_owner", "employer", "admin", "manager",
    "office_admin", "superadmin",
}
WORKER_ROLES = {
    "worker", "staff", "field_worker", "technician", "subcontractor",
}
PAYROLL_ROLES = {"payroll", "payroll_user", "payroll_admin"}
ACCOUNT_DISABLED_STATUSES = {"revoked", "locked", "disabled", "removed", "archived"}
WORKER_DISABLED_STATUSES = ACCOUNT_DISABLED_STATUSES | {
    "expired", "cancelled", "canceled", "inactive",
}
PAID_STATUSES = {"active", "paid", "past_due"}
BILLING_LOCKED_STATUSES = {
    "cancelled", "canceled", "unpaid", "incomplete", "incomplete_expired",
    "expired", "payment_required", "plan_required",
}
WORKER_COLLECTIONS = ("workers", "team", "team_members", "staff", "employees")
WORKER_EMAIL_FIELDS = ("email", "user_email", "worker_email", "staff_email", "contact_email")
PASSWORD_HASH_FIELDS = ("password_hash", "hashed_password", "passwordHash", "bcrypt_hash", "pass_hash")
PLAIN_PASSWORD_FIELDS = (
    "password", "plain_password", "temp_password", "temporary_password", "invite_password",
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


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return _lower(value) in {"1", "true", "yes", "on", "active", "enabled", "verified", "granted"}


def _role(user: dict[str, Any] | None) -> str:
    user = user or {}
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    return _lower(
        user.get("role")
        or user.get("user_role")
        or user.get("account_type")
        or user.get("worker_role")
        or business.get("role")
    ).replace("-", "_").replace(" ", "_")


def account_disabled(user: dict[str, Any] | None) -> bool:
    """Block identity revocation, not ordinary billing loss.

    Cancelled/expired owners must still be able to sign in and reach Plans.
    Worker and payroll identities may use those same values as terminal
    employment states, so they remain blocked.
    """
    user = user or {}
    role = _role(user)
    identity_status = _lower(
        user.get("account_status")
        or user.get("login_status")
        or user.get("access_status")
        or user.get("status")
    )
    if identity_status in ACCOUNT_DISABLED_STATUSES:
        return True
    if role in WORKER_ROLES | PAYROLL_ROLES and identity_status in WORKER_DISABLED_STATUSES:
        return True
    return bool(
        user.get("active") is False
        or user.get("is_active") is False
        or user.get("account_locked") is True
        or user.get("revoked_at")
        or user.get("removed_at")
        or user.get("disabled_at")
    )


def tester_access(user: dict[str, Any] | None, now: datetime | None = None) -> bool:
    user = user or {}
    if (
        user.get("free_tester_revoked_at")
        or user.get("tester_revoked_at")
        or user.get("revoked_at")
        or user.get("disabled_at")
        or user.get("account_locked") is True
    ):
        return False
    identity_status = _lower(user.get("account_status") or user.get("login_status") or user.get("status"))
    if identity_status in ACCOUNT_DISABLED_STATUSES:
        return False
    billing_status = _lower(
        user.get("subscription_status")
        or user.get("billing_status")
        or user.get("plan_status")
    )
    tester = (
        _truthy(user.get("free_tester_access"))
        or _truthy(user.get("is_tester"))
        or billing_status == "tester_free"
    )
    if not tester:
        return False
    until = _aware(user.get("free_tester_until") or user.get("free_until"))
    return until is None or until > (now or _now())


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


def paid_app_access(user: dict[str, Any] | None, now: datetime | None = None) -> bool:
    user = user or {}
    email = _lower(user.get("email"))
    role = _role(user)
    if email == PLATFORM_OWNER_EMAIL:
        return True
    if role in WORKER_ROLES | PAYROLL_ROLES:
        return not account_disabled(user)
    if tester_access(user, now):
        return True
    if role and role not in OWNER_ROLES:
        return False
    if user.get("email_verified") is False:
        return False
    if account_disabled(user):
        return False

    status = _lower(
        user.get("subscription_status")
        or user.get("plan_status")
        or user.get("billing_status")
        or user.get("stripe_status")
    )
    if status in BILLING_LOCKED_STATUSES:
        return False
    current_time = now or _now()
    if status in {"trial", "trialing"}:
        plan = _lower(user.get("plan") or user.get("subscription_plan") or user.get("plan_type"))
        trial_end = _aware(
            user.get("trial_ends_at")
            or user.get("trial_end")
            or user.get("trial_end_date")
        )
        return bool(
            plan
            and plan not in {"none", "free", "null", "undefined"}
            and trial_end
            and trial_end > current_time
        )
    return status in PAID_STATUSES and _billing_proof(user)


def lockout_active(attempt: dict[str, Any] | None, now: datetime | None = None) -> bool:
    attempt = attempt or {}
    if int(attempt.get("count") or 0) < LOCKOUT_FAILURES:
        return False
    locked_until = _aware(attempt.get("locked_until"))
    return bool(locked_until and locked_until > (now or _now()))


def next_failure_state(attempt: dict[str, Any] | None, now: datetime | None = None) -> dict[str, Any]:
    attempt = attempt or {}
    failed_at = now or _now()
    locked_until = _aware(attempt.get("locked_until"))
    previous_count = int(attempt.get("count") or 0)
    if previous_count >= LOCKOUT_FAILURES and locked_until and locked_until <= failed_at:
        previous_count = 0
    count = previous_count + 1
    return {
        "count": count,
        "last_failed_at": failed_at,
        "locked_until": failed_at + timedelta(minutes=LOCKOUT_MINUTES) if count >= LOCKOUT_FAILURES else None,
        "version": VERSION,
    }


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


def _attempt_key(request, email: str, kind: str = "login") -> str:
    raw = f"{kind}|{_client_host(request)}|{email}"
    return hashlib.sha256(raw.encode("utf-8", "ignore")).hexdigest()


def _headers(stage: str) -> dict[str, str]:
    return {
        "Cache-Control": "no-store",
        "X-Churvox-Login-Route": VERSION,
        "X-Churvox-Login-Stage": stage,
    }


def _json(status: int, stage: str, body: dict[str, Any]):
    if JSONResponse is None:
        raise RuntimeError("FastAPI JSONResponse unavailable")
    return JSONResponse(
        status_code=status,
        headers=_headers(stage),
        content={**body, "stage": stage, "version": VERSION},
    )


def _clear_cookies(response) -> None:
    try:
        response.delete_cookie("access_token", path="/", secure=True, httponly=True, samesite="none")
        response.delete_cookie("refresh_token", path="/", secure=True, httponly=True, samesite="none")
    except Exception:
        response.raw_headers.append((
            b"set-cookie",
            b"access_token=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=None",
        ))
        response.raw_headers.append((
            b"set-cookie",
            b"refresh_token=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=None",
        ))


def _set_cookies(response, access: str, refresh: str) -> None:
    response.set_cookie(
        "access_token", access, httponly=True, secure=True,
        samesite="none", max_age=86400, path="/",
    )
    response.set_cookie(
        "refresh_token", refresh, httponly=True, secure=True,
        samesite="none", max_age=604800, path="/",
    )


def _first(*values: Any) -> str:
    for value in values:
        cleaned = _text(value)
        if cleaned:
            return cleaned
    return ""


def _patch_worker_lockout_helpers() -> None:
    """Repair the worker endpoint's expired-lockout counter without reinstalling routes."""
    for module_name in (
        "churvox_login_paid_launch_final_patch",
        "backend.churvox_login_paid_launch_final_patch",
    ):
        try:
            patch = importlib.import_module(module_name)
        except Exception:
            continue
        try:
            patch.next_failure_state = next_failure_state
            patch._attempt_key = lambda request, email, kind="login": _attempt_key(
                request, email, "paid-login"
            )
            patch.LOCKOUT_FAILURES = LOCKOUT_FAILURES
            patch.LOCKOUT_MINUTES = LOCKOUT_MINUTES
        except Exception:
            pass


def install(module) -> None:
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    Request = getattr(module, "Request", None)
    bcrypt = getattr(module, "bcrypt", None)
    jwt = getattr(module, "jwt", None)
    ObjectId = getattr(module, "ObjectId", None)
    algorithm = getattr(module, "JWT_ALGORITHM", "HS256")
    if any(item is None for item in (app, db, Request, bcrypt, jwt, ObjectId, JSONResponse)):
        return

    _patch_worker_lockout_helpers()

    # HQ access is always derived from the exact account email. A stale database
    # flag or unexpected environment list must never create another HQ owner.
    module.PLATFORM_OWNER_EMAILS = [PLATFORM_OWNER_EMAIL]
    module.is_platform_owner = lambda user: _lower((user or {}).get("email")) == PLATFORM_OWNER_EMAIL
    module._auth_has_app_access = paid_app_access

    try:
        dummy_hash = bcrypt.hashpw(b"churvox-login-timing-check", bcrypt.gensalt())
    except Exception:
        dummy_hash = None

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

        pattern = re.compile(f"^{re.escape(email)}$", re.IGNORECASE)
        user = await _wait(db.users.find_one({"email": pattern}), LOOKUP_TIMEOUT_SECONDS)
        return user, "case-insensitive"

    async def _find_worker(email: str):
        pattern = re.compile(f"^{re.escape(email)}$", re.IGNORECASE)
        query = {"$or": [{field: pattern} for field in WORKER_EMAIL_FIELDS]}

        async def lookup(collection_name: str):
            try:
                document = await db[collection_name].find_one(query)
                return collection_name, document, None
            except Exception as exc:
                return collection_name, None, exc

        tasks = [lookup(name) for name in WORKER_COLLECTIONS]
        results = await _wait(asyncio.gather(*tasks), LOOKUP_TIMEOUT_SECONDS)
        errors = []
        for collection_name, document, error in results:
            if document:
                return collection_name, document
            if error is not None:
                errors.append(error)
        if len(errors) == len(WORKER_COLLECTIONS):
            raise errors[0]
        return None, None

    async def _read_attempt(key: str) -> dict[str, Any]:
        try:
            attempt = await _wait(db.login_attempts.find_one({"identifier": key}), 3) or {}
        except Exception:
            return {}
        if attempt and not lockout_active(attempt):
            locked_until = _aware(attempt.get("locked_until"))
            if int(attempt.get("count") or 0) >= LOCKOUT_FAILURES and locked_until and locked_until <= _now():
                try:
                    await _wait(db.login_attempts.delete_one({"identifier": key}), 3)
                except Exception:
                    pass
                return {}
        return attempt

    async def _record_failure(key: str, previous: dict[str, Any]) -> dict[str, Any]:
        state = next_failure_state(previous)
        try:
            await _wait(
                db.login_attempts.update_one(
                    {"identifier": key},
                    {"$set": {"identifier": key, **state}},
                    upsert=True,
                ),
                3,
            )
        except Exception:
            pass
        return state

    async def _clear_failure(key: str) -> None:
        try:
            await _wait(db.login_attempts.delete_one({"identifier": key}), 3)
        except Exception:
            pass

    def _password_ok(password: str, user: dict[str, Any]):
        password_checker = getattr(module, "_auth_check_password", None)
        if callable(password_checker):
            try:
                result = password_checker(password, user)
                if isinstance(result, tuple):
                    return bool(result[0]), result[1] if len(result) > 1 else None, None
                return bool(result), None, None
            except Exception:
                pass

        for field in PASSWORD_HASH_FIELDS:
            stored = user.get(field)
            if not isinstance(stored, str) or not stored:
                continue
            try:
                if bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8")):
                    return True, field, stored
            except Exception:
                continue
        for field in PLAIN_PASSWORD_FIELDS:
            if isinstance(user.get(field), str) and user.get(field) == password:
                return True, field, None
        return False, None, None

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
            "session_version": 5,
        }, secret, algorithm=algorithm)
        refresh = jwt.encode({
            "sub": user_id,
            "iat": now.timestamp(),
            "exp": now + timedelta(days=7),
            "type": "refresh",
            "jti": secrets.token_urlsafe(18),
            "session_version": 5,
        }, secret, algorithm=algorithm)
        return access, refresh

    def _public_user(user: dict[str, Any], access: str) -> dict[str, Any]:
        user_id = _text(user.get("_id") or user.get("id"))
        business_id = _text(user.get("business_id") or user_id)
        return {
            "id": user_id,
            "email": _lower(user.get("email")),
            "name": user.get("name") or user.get("business_name") or "Churvox user",
            "business_name": user.get("business_name"),
            "role": user.get("role") or "employer",
            "user_role": user.get("user_role") or user.get("role") or "employer",
            "worker_role": user.get("worker_role"),
            "is_worker": bool(user.get("is_worker") or _role(user) in WORKER_ROLES),
            "worker": bool(user.get("worker") or _role(user) in WORKER_ROLES),
            "worker_login": bool(user.get("worker_login") or _role(user) in WORKER_ROLES),
            "worker_id": _text(user.get("worker_id")) or None,
            "team_member_id": _text(user.get("team_member_id") or user.get("staff_id")) or None,
            "plan": user.get("plan") or ("worker" if _role(user) in WORKER_ROLES else "none"),
            "subscription_status": user.get("subscription_status") or ("worker" if _role(user) in WORKER_ROLES else "none"),
            "trial_ends_at": user.get("trial_ends_at").isoformat() if isinstance(user.get("trial_ends_at"), datetime) else user.get("trial_ends_at"),
            "email_verified": user.get("email_verified", True),
            "business_id": business_id,
            "gst_rate": user.get("gst_rate", 15),
            "trade_type": user.get("trade_type", "other"),
            "billing_country": user.get("billing_country") or user.get("country") or "NZ",
            "country": user.get("country") or user.get("billing_country") or "NZ",
            "has_app_access": paid_app_access(user),
            "billing_lock_reason": user.get("billing_lock_reason"),
            "token": access,
        }

    async def _sync_worker(collection_name: str, document: dict[str, Any], email: str, password: str, stored_hash: str | None):
        existing = await _wait(
            db.users.find_one({
                "$or": [
                    {"email": email},
                    {"canonical_email": email},
                    {"normalized_email": email},
                ]
            }),
            LOOKUP_TIMEOUT_SECONDS,
        )
        password_hash = stored_hash
        if not password_hash:
            password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        business_id = _first(
            document.get("business_id"), document.get("owner_business_id"), document.get("owner_id"),
            document.get("contractor_id"), document.get("employer_id"), document.get("company_id"),
            document.get("parent_user_id"), document.get("created_by"),
        )
        if not business_id and existing:
            business_id = _first(existing.get("business_id"), existing.get("owner_business_id"))
        now = _now()
        update = {
            "email": email,
            "canonical_email": email,
            "normalized_email": email,
            "password_hash": password_hash,
            "name": _first(
                document.get("name"), document.get("full_name"), document.get("worker_name"),
                document.get("staff_name"), email.split("@")[0],
            ),
            "business_name": _first(document.get("business_name"), document.get("company"), "Worker account"),
            "role": "worker",
            "user_role": "worker",
            "worker_role": "worker",
            "is_worker": True,
            "worker": True,
            "worker_login": True,
            "worker_id": _first(document.get("worker_id"), document.get("id"), document.get("_id")),
            "team_member_id": _first(
                document.get("team_member_id"), document.get("staff_id"), document.get("id"), document.get("_id"),
            ),
            "status": "active",
            "email_verified": True,
            "has_app_access": True,
            "billing_lock_reason": None,
            "source_worker_collection": collection_name,
            "last_login_at": now,
            "updated_at": now,
        }
        if business_id:
            update["business_id"] = str(business_id)
        if existing:
            await _wait(db.users.update_one({"_id": existing["_id"]}, {"$set": update}), 4)
            existing.update(update)
            user = existing
        else:
            update["created_at"] = now
            result = await _wait(db.users.insert_one(update), 4)
            update["_id"] = result.inserted_id
            user = update

        try:
            await _wait(
                db[collection_name].update_one(
                    {"_id": document["_id"]},
                    {
                        "$set": {"password_hash": password_hash, "last_login_at": now, "updated_at": now},
                        "$unset": {field: "" for field in PLAIN_PASSWORD_FIELDS},
                    },
                ),
                4,
            )
        except Exception:
            pass
        return user

    def _error(status: int, stage: str, detail: str, **extra):
        response = _json(status, stage, {"success": False, "detail": detail, **extra})
        _clear_cookies(response)
        return response

    async def emergency_login(request: Request):
        try:
            try:
                payload = await request.json()
            except Exception:
                return _error(400, "invalid-json", "Login request must be valid JSON.")
            if not isinstance(payload, dict):
                return _error(400, "invalid-json-object", "Login request must be a JSON object.")

            email = _lower(payload.get("email"))
            raw_password = payload.get("password")
            password = str(raw_password) if raw_password is not None else ""
            if not email or not password:
                return _error(400, "input", "Enter your email and password.")
            if len(email) > 320 or len(password) > 128:
                return _error(400, "input-size", "Invalid email or password.")

            key = _attempt_key(request, email, "paid-login")
            attempt = await _read_attempt(key)
            if lockout_active(attempt):
                return _error(429, "lockout", "Too many failed attempts. Try again in 15 minutes.")

            try:
                user, lookup_mode = await _find_user(email)
            except asyncio.TimeoutError:
                return _error(
                    503, "user-lookup-timeout",
                    "Login database lookup timed out. Please try again shortly.",
                    retryable=True,
                )
            except Exception as exc:
                return _error(
                    503, "user-lookup-error",
                    "Login database lookup is unavailable. Please try again shortly.",
                    error_type=exc.__class__.__name__,
                    retryable=True,
                )

            valid, matched_field, stored_hash = _password_ok(password, user or {}) if user else (False, None, None)
            if not user:
                try:
                    collection_name, worker_document = await _find_worker(email)
                except asyncio.TimeoutError:
                    return _error(
                        503, "worker-lookup-timeout",
                        "Worker login lookup timed out. Please try again shortly.",
                        retryable=True,
                    )
                except Exception as exc:
                    return _error(
                        503, "worker-lookup-error",
                        "Worker login lookup is unavailable. Please try again shortly.",
                        error_type=exc.__class__.__name__,
                        retryable=True,
                    )

                if worker_document:
                    worker_valid, worker_field, worker_hash = _password_ok(password, worker_document)
                    if worker_valid:
                        worker_status = _lower(worker_document.get("status") or worker_document.get("account_status"))
                        if worker_status == "invited":
                            return _error(
                                403, "invite-required",
                                "Complete your account setup using the invite link sent to your email.",
                            )
                        if account_disabled({**worker_document, "role": "worker"}):
                            return _error(
                                403, "account-disabled",
                                "Account access is disabled. Contact Churvox support.",
                            )
                        try:
                            user = await _sync_worker(
                                collection_name, worker_document, email, password, worker_hash,
                            )
                            lookup_mode = f"worker:{collection_name}"
                            valid = True
                            matched_field = worker_field
                            stored_hash = worker_hash
                        except Exception as exc:
                            return _error(
                                503, "worker-sync-error",
                                "Worker account setup could not be completed. Please try again shortly.",
                                error_type=exc.__class__.__name__,
                                retryable=True,
                            )

            if not user or not valid:
                if not user and dummy_hash:
                    try:
                        bcrypt.checkpw(password.encode("utf-8"), dummy_hash)
                    except Exception:
                        pass
                state = await _record_failure(key, attempt)
                if lockout_active(state):
                    return _error(429, "lockout", "Too many failed attempts. Try again in 15 minutes.")
                return _error(401, "invalid-credentials", "Invalid email or password.")

            status = _lower(user.get("status") or user.get("account_status"))
            if status == "invited":
                return _error(
                    403, "invite-required",
                    "Complete your account setup using the invite link sent to your email.",
                )
            if account_disabled(user):
                return _error(
                    403, "account-disabled",
                    "Account access is disabled. Contact Churvox support.",
                )

            user_id = _text(user.get("_id") or user.get("id"))
            if not user_id:
                return _error(
                    503, "user-id",
                    "Login account identity is unavailable. Please contact Churvox support.",
                    retryable=False,
                )

            now = _now()
            updates: dict[str, Any] = {
                "last_login_at": now,
                "updated_at": now,
                "canonical_email": email,
                "normalized_email": email,
            }
            owner_business_id = user.get("business_id") or user.get("_id")
            if (
                str(owner_business_id) == str(user.get("_id"))
                and _role(user) in WORKER_ROLES | PAYROLL_ROLES
                and not user.get("owner_id")
                and not user.get("employer_id")
            ):
                updates.update({
                    "role": "employer",
                    "user_role": "employer",
                    "worker_role": None,
                    "is_worker": False,
                    "worker": False,
                    "worker_login": False,
                })
            if not user.get("business_id"):
                updates["business_id"] = user.get("_id")
            unset = {}
            if matched_field in PLAIN_PASSWORD_FIELDS:
                try:
                    updates["password_hash"] = bcrypt.hashpw(
                        password.encode("utf-8"), bcrypt.gensalt(),
                    ).decode("utf-8")
                    unset = {field: "" for field in PLAIN_PASSWORD_FIELDS}
                except Exception:
                    unset = {}
            try:
                await _wait(
                    db.users.update_one(
                        {"_id": user["_id"]},
                        {"$set": updates, **({"$unset": unset} if unset else {})},
                    ),
                    4,
                )
            except Exception:
                pass
            user.update(updates)

            try:
                access, refresh = _tokens(user_id, email)
            except Exception as exc:
                return _error(
                    503, "token-create",
                    "Secure login token creation failed.",
                    error_type=exc.__class__.__name__,
                    retryable=True,
                )

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
            return response
        except Exception as exc:
            return _error(
                503, "unhandled-login-error",
                "Login could not be completed. Please try again shortly.",
                error_type=exc.__class__.__name__,
                retryable=True,
            )

    async def emergency_logout(request: Request):
        response = _json(200, "logout-complete", {
            "success": True,
            "message": "Logged out successfully.",
            "sessions_revoked": True,
            "login_route": VERSION,
        })
        token = _text(request.headers.get("Authorization"))
        token = token[7:].strip() if token.startswith("Bearer ") else _text(request.cookies.get("access_token"))
        if token:
            try:
                secret = _text(getattr(module, "JWT_SECRET", ""))
                payload = jwt.decode(token, secret, algorithms=[algorithm])
                user_id = _text(payload.get("sub"))
                if user_id:
                    now = _now()
                    await _wait(
                        db.users.update_one(
                            {"_id": ObjectId(user_id)},
                            {"$set": {
                                "session_invalid_before": now,
                                "last_logout_at": now,
                                "updated_at": now,
                            }},
                        ),
                        4,
                    )
                    try:
                        await _wait(db.auth_security_events.insert_one({
                            "kind": "logout_sessions_revoked",
                            "user_id": user_id,
                            "created_at": now,
                            "version": VERSION,
                        }), 3)
                    except Exception:
                        pass
            except Exception:
                pass
        _clear_cookies(response)
        return response

    async def emergency_health():
        route_count = sum(
            1 for route in list(getattr(app.router, "routes", []) or [])
            if _route_matches(route, "/api/auth/login", "POST")
        )
        logout_route_count = sum(
            1 for route in list(getattr(app.router, "routes", []) or [])
            if _route_matches(route, "/api/auth/logout", "POST")
        )
        try:
            await _wait(db.command("ping"), 5)
            database_ready = True
            database_stage = "ready"
        except Exception as exc:
            database_ready = False
            database_stage = exc.__class__.__name__
        secret_ready = len(_text(getattr(module, "JWT_SECRET", ""))) >= 32
        jwt_source = _text(
            getattr(
                module,
                "CHURVOX_JWT_SECRET_SOURCE",
                "environment" if _text(os.environ.get("JWT_SECRET")) else "unknown",
            )
        )
        return {
            "success": True,
            "ready": bool(database_ready and secret_ready and route_count == 1 and logout_route_count == 1),
            "database_ready": database_ready,
            "database_stage": database_stage,
            "jwt_ready": secret_ready,
            "jwt_source": jwt_source,
            "jwt_persistent": jwt_source == "environment",
            "restart_persistence_ready": jwt_source == "environment",
            "login_route": VERSION,
            "login_route_count": route_count,
            "logout_route_count": logout_route_count,
            "version": VERSION,
        }

    emergency_login.__annotations__ = {"request": Request}
    emergency_logout.__annotations__ = {"request": Request}
    _remove_route(app, "/api/auth/login", "POST")
    _remove_route(app, "/api/auth/logout", "POST")
    _remove_route(app, "/api/auth/login-health", "GET")
    app.add_api_route("/api/auth/login", emergency_login, methods=["POST"])
    app.add_api_route("/api/auth/logout", emergency_logout, methods=["POST"])
    app.add_api_route("/api/auth/login-health", emergency_health, methods=["GET"])
    app.state.churvox_login_emergency_final = VERSION
