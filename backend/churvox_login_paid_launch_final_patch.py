from __future__ import annotations

import asyncio
import hashlib
import importlib
import importlib.abc
import importlib.machinery
import re
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

VERSION = "churvox-login-paid-launch-final-20260712"
TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()
WORKER_COLLECTIONS = ("users", "workers", "team", "team_members", "staff", "employees")
PASSWORD_FIELDS = ("password_hash", "hashed_password", "passwordHash", "bcrypt_hash", "pass_hash")
PLAIN_FIELDS = ("password", "plain_password", "temp_password", "temporary_password", "invite_password")
DISABLED_STATUSES = {"revoked", "locked", "disabled", "expired", "cancelled", "canceled", "removed", "archived", "inactive"}
LOCKOUT_FAILURES = 5
LOCKOUT_MINUTES = 15


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


def lockout_active(attempt: dict | None, now: datetime | None = None) -> bool:
    attempt = attempt or {}
    if int(attempt.get("count") or 0) < LOCKOUT_FAILURES:
        return False
    locked_until = _aware(attempt.get("locked_until"))
    return bool(locked_until and locked_until > (now or _now()))


def next_failure_state(attempt: dict | None, now: datetime | None = None) -> dict:
    current = int((attempt or {}).get("count") or 0)
    failed_at = now or _now()
    count = current + 1
    return {
        "count": count,
        "last_failed_at": failed_at,
        "locked_until": failed_at + timedelta(minutes=LOCKOUT_MINUTES) if count >= LOCKOUT_FAILURES else None,
        "version": VERSION,
    }


def worker_disabled(document: dict | None) -> bool:
    document = document or {}
    status = _lower(document.get("status") or document.get("account_status"))
    return bool(
        status in DISABLED_STATUSES
        or document.get("active") is False
        or document.get("is_active") is False
        or document.get("account_locked") is True
        or document.get("revoked_at")
        or document.get("removed_at")
        or document.get("disabled_at")
    )


def _safe(value: Any):
    if isinstance(value, dict):
        output = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(word in lowered for word in ("password", "hash", "token", "secret")):
                continue
            output["id" if key == "_id" else key] = _safe(item)
        return output
    if isinstance(value, list):
        return [_safe(item) for item in value]
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def _route_matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def _remove_route(app, path: str, method: str = "POST") -> None:
    try:
        app.router.routes = [route for route in app.router.routes if not _route_matches(route, path, method)]
    except Exception:
        pass


def _first(*values: Any) -> str:
    for value in values:
        cleaned = _text(value)
        if cleaned:
            return cleaned
    return ""


def _client_host(request) -> str:
    try:
        forwarded = _text(request.headers.get("x-forwarded-for")).split(",")[0].strip()
    except Exception:
        forwarded = ""
    try:
        direct = _text(request.client.host)
    except Exception:
        direct = ""
    return forwarded or direct or "unknown"


def _attempt_key(request, email: str, kind: str = "login") -> str:
    material = f"{kind}|{_client_host(request)}|{_lower(email)}"
    return hashlib.sha256(material.encode("utf-8", "ignore")).hexdigest()


def install(module) -> None:
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    UserLogin = getattr(module, "UserLogin", None)
    Response = getattr(module, "Response", None)
    Request = getattr(module, "Request", None)
    Body = getattr(module, "Body", None)
    bcrypt = getattr(module, "bcrypt", None)
    clear_auth_cookies = getattr(module, "clear_auth_cookies", None)
    set_auth_cookies = getattr(module, "set_auth_cookies", None)
    create_access_token = getattr(module, "create_access_token", None)
    create_refresh_token = getattr(module, "create_refresh_token", None)
    auth_normal_email = getattr(module, "_auth_normal_email", None)
    auth_check_password = getattr(module, "_auth_check_password", None)
    auth_user_response = getattr(module, "_auth_user_response", None)
    hash_password = getattr(module, "hash_password", None)

    required = (
        app, db, UserLogin, Response, Request, Body, bcrypt, clear_auth_cookies,
        set_auth_cookies, create_access_token, create_refresh_token,
        auth_normal_email, auth_check_password, auth_user_response,
    )
    if any(item is None for item in required):
        return

    try:
        dummy_hash = bcrypt.hashpw(b"churvox-login-timing-check", bcrypt.gensalt())
    except Exception:
        dummy_hash = None

    async def _with_timeout(awaitable, seconds=7):
        return await asyncio.wait_for(awaitable, timeout=seconds)

    async def _find_case_insensitive(collection, email: str):
        try:
            exact = await _with_timeout(collection.find_one({"email": email}), 6)
            if exact:
                return exact
        except Exception:
            pass
        try:
            pattern = re.compile(f"^{re.escape(email)}$", re.IGNORECASE)
            return await _with_timeout(collection.find_one({"email": pattern}), 6)
        except Exception:
            return None

    async def _attempt(request, email: str, kind: str):
        key = _attempt_key(request, email, kind)
        try:
            row = await _with_timeout(db.login_attempts.find_one({"identifier": key}), 3)
        except Exception:
            row = None
        return key, row or {}

    async def _record_failure(key: str, previous: dict | None):
        state = next_failure_state(previous)
        try:
            await _with_timeout(
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

    async def _clear_failure(key: str):
        try:
            await _with_timeout(db.login_attempts.delete_one({"identifier": key}), 3)
        except Exception:
            pass

    def _generic_invalid(response):
        clear_auth_cookies(response)
        response.status_code = 401
        return {"success": False, "detail": "Invalid email or password.", "version": VERSION}

    def _too_many(response):
        clear_auth_cookies(response)
        response.status_code = 429
        return {"success": False, "detail": "Too many failed attempts. Try again in 15 minutes.", "version": VERSION}

    def _check_worker_password(password: str, document: dict):
        for field in PASSWORD_FIELDS:
            stored = document.get(field)
            if not isinstance(stored, str) or not stored.strip():
                continue
            try:
                if bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8")):
                    return True, field, stored
            except Exception:
                continue
        for field in PLAIN_FIELDS:
            stored = document.get(field)
            if isinstance(stored, str) and stored and stored == password:
                return True, field, None
        return False, None, None

    async def _worker_collections():
        try:
            return set(await _with_timeout(db.list_collection_names(), 5))
        except Exception:
            return set(WORKER_COLLECTIONS)

    async def _find_worker(email: str):
        names = await _worker_collections()
        fields = ("email", "user_email", "worker_email", "staff_email", "contact_email")
        pattern = re.compile(f"^{re.escape(email)}$", re.IGNORECASE)
        for collection_name in WORKER_COLLECTIONS:
            if collection_name not in names:
                continue
            collection = db[collection_name]
            for field in fields:
                try:
                    document = await _with_timeout(collection.find_one({field: pattern}), 5)
                except Exception:
                    document = None
                if document:
                    return collection_name, document
        return None, None

    def _business_id(document: dict):
        return _first(
            document.get("business_id"), document.get("owner_business_id"), document.get("owner_id"),
            document.get("contractor_id"), document.get("employer_id"), document.get("company_id"),
            document.get("parent_user_id"), document.get("created_by"),
        )

    def _make_hash(password: str) -> str:
        if callable(hash_password):
            return hash_password(password)
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    async def _sync_worker(collection_name: str, document: dict, email: str, password: str, stored_hash: str | None):
        existing = await _find_case_insensitive(db.users, email)
        password_hash = stored_hash or _make_hash(password)
        business_id = _business_id(document)
        if not business_id and existing:
            business_id = _first(existing.get("business_id"), existing.get("owner_business_id"), existing.get("_id"))
        now = _now()
        update = {
            "email": email,
            "password_hash": password_hash,
            "name": _first(document.get("name"), document.get("full_name"), document.get("worker_name"), document.get("staff_name"), email.split("@")[0]),
            "business_name": _first(document.get("business_name"), document.get("company"), "Worker account"),
            "role": "worker",
            "user_role": "worker",
            "worker_role": "worker",
            "is_worker": True,
            "worker": True,
            "worker_login": True,
            "worker_id": _first(document.get("worker_id"), document.get("id"), document.get("_id")),
            "team_member_id": _first(document.get("team_member_id"), document.get("staff_id"), document.get("id"), document.get("_id")),
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
            await db.users.update_one({"_id": existing["_id"]}, {"$set": update})
            existing.update(update)
            user = existing
        else:
            update["created_at"] = now
            result = await db.users.insert_one(update)
            update["_id"] = result.inserted_id
            user = update

        if collection_name != "users":
            try:
                await db[collection_name].update_one(
                    {"_id": document["_id"]},
                    {
                        "$set": {"password_hash": password_hash, "last_login_at": now, "updated_at": now},
                        "$unset": {field: "" for field in PLAIN_FIELDS},
                    },
                )
            except Exception:
                pass
        return user

    def _worker_response(user: dict, token: str):
        user_id = str(user.get("_id") or user.get("id") or "")
        payload = {
            "id": user_id,
            "email": _lower(user.get("email")),
            "name": _first(user.get("name"), user.get("full_name"), "Worker"),
            "business_name": user.get("business_name"),
            "business_id": str(user.get("business_id") or user_id),
            "role": "worker",
            "user_role": "worker",
            "worker_role": "worker",
            "is_worker": True,
            "worker": True,
            "worker_login": True,
            "worker_id": _first(user.get("worker_id"), user_id),
            "team_member_id": _first(user.get("team_member_id"), user.get("staff_id"), user_id),
            "plan": "worker",
            "subscription_status": "worker",
            "has_app_access": True,
            "billing_lock_reason": None,
            "email_verified": True,
            "token": token,
        }
        clean = _safe(payload)
        clean["token"] = token
        return {"success": True, "token": token, **clean, "user": clean, "version": VERSION}

    async def _worker_sign_in(email: str, password: str, response, request, require_worker=True):
        key, attempt = await _attempt(request, email, "worker-login")
        if lockout_active(attempt):
            return _too_many(response)
        collection_name, document = await _find_worker(email)
        if not document:
            if dummy_hash:
                try:
                    bcrypt.checkpw(password.encode("utf-8"), dummy_hash)
                except Exception:
                    pass
            await _record_failure(key, attempt)
            return _generic_invalid(response)
        valid, _matched_field, stored_hash = _check_worker_password(password, document)
        if not valid:
            await _record_failure(key, attempt)
            return _generic_invalid(response)
        if worker_disabled(document):
            clear_auth_cookies(response)
            response.status_code = 403
            return {"success": False, "detail": "Account access is disabled. Contact Churvox support.", "version": VERSION}
        user = await _sync_worker(collection_name, document, email, password, stored_hash)
        await _clear_failure(key)
        token = create_access_token(str(user["_id"]), email)
        refresh = create_refresh_token(str(user["_id"]))
        set_auth_cookies(response, token, refresh)
        try:
            await db.worker_login_events.insert_one({
                "created_at": _now(), "email": email, "collection": collection_name,
                "user_id": str(user.get("_id")), "business_id": str(user.get("business_id") or ""),
                "version": VERSION,
            })
        except Exception:
            pass
        return _worker_response(user, token)

    async def final_login(user_data: UserLogin, response: Response, request: Request):
        clear_auth_cookies(response)
        email = auth_normal_email(getattr(user_data, "email", ""))
        password = _text(getattr(user_data, "password", ""))
        if not email or not password:
            response.status_code = 400
            return {"success": False, "detail": "Enter your email and password.", "version": VERSION}

        key, attempt = await _attempt(request, email, "owner-login")
        if lockout_active(attempt):
            return _too_many(response)

        try:
            user = await _find_case_insensitive(db.users, email)
        except asyncio.TimeoutError:
            response.status_code = 503
            return {"success": False, "detail": "Login is taking too long. Please try again.", "version": VERSION}
        except Exception:
            response.status_code = 503
            return {"success": False, "detail": "Login service is unavailable. Please try again.", "version": VERSION}

        password_ok = False
        matched_field = None
        if user:
            try:
                password_ok, matched_field = auth_check_password(password, user)
            except Exception:
                password_ok = False
        elif dummy_hash:
            try:
                bcrypt.checkpw(password.encode("utf-8"), dummy_hash)
            except Exception:
                pass

        if not user or not password_ok:
            worker_result = await _worker_sign_in(email, password, response, request)
            if getattr(response, "status_code", 200) == 200 and isinstance(worker_result, dict) and worker_result.get("success") is True:
                await _clear_failure(key)
                return worker_result
            await _record_failure(key, attempt)
            return _generic_invalid(response)

        status = _lower(user.get("status") or user.get("subscription_status"))
        if status == "invited":
            clear_auth_cookies(response)
            response.status_code = 403
            return {"success": False, "detail": "Complete your account setup using the invite link sent to your email.", "version": VERSION}
        if worker_disabled(user):
            clear_auth_cookies(response)
            response.status_code = 403
            return {"success": False, "detail": "Account access is disabled. Contact Churvox support.", "version": VERSION}

        await _clear_failure(key)
        user_id = str(user["_id"])
        access = create_access_token(user_id, email)
        refresh = create_refresh_token(user_id)
        set_auth_cookies(response, access, refresh)
        updates = {"last_login_at": _now()}

        try:
            owner_business_id = user.get("business_id") or user.get("_id")
            self_owned = str(owner_business_id) == str(user.get("_id"))
            saved_role = _lower(user.get("role"))
            if self_owned and saved_role in {"worker", "payroll", "payroll_user"}:
                updates.update({
                    "role": "employer", "user_role": "employer", "worker_role": None,
                    "is_worker": False, "worker": False, "worker_login": False,
                })
        except Exception:
            pass

        if matched_field and matched_field != "password_hash":
            try:
                updates["password_hash"] = _make_hash(password)
            except Exception:
                pass
        if not user.get("business_id"):
            updates["business_id"] = user["_id"]
        try:
            await _with_timeout(db.users.update_one({"_id": user["_id"]}, {"$set": updates, "$unset": {field: "" for field in PLAIN_FIELDS}}), 4)
        except Exception:
            pass
        user.update(updates)
        result = auth_user_response(user, access)
        if isinstance(result, dict):
            result["version"] = VERSION
        return result

    async def final_worker_login(payload: dict = Body(default={}), response: Response = None, request: Request = None):
        email = auth_normal_email((payload or {}).get("email", ""))
        password = _text((payload or {}).get("password", ""))
        if not email or not password:
            if response:
                response.status_code = 400
            return {"success": False, "detail": "Enter your email and password.", "version": VERSION}
        return await _worker_sign_in(email, password, response, request)

    final_login.__annotations__ = {"user_data": UserLogin, "response": Response, "request": Request}
    final_worker_login.__annotations__ = {"payload": dict, "response": Response, "request": Request}

    _remove_route(app, "/api/auth/login", "POST")
    app.add_api_route("/api/auth/login", final_login, methods=["POST"])
    for path in ("/api/worker/auth/login", "/api/auth/worker-login"):
        _remove_route(app, path, "POST")
        app.add_api_route(path, final_worker_login, methods=["POST"])

    app.state.churvox_login_paid_launch_final = VERSION
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
