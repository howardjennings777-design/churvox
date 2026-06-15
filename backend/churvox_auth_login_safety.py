"""Safety override for Churvox auth login.

This is intentionally small and loaded early. It protects real-user sign-in from
older account records that may have used legacy password hash field names, and
it returns a frontend-friendly user envelope for both /auth/login and /auth/me.
"""

from __future__ import annotations

import inspect
from datetime import datetime, timezone


def _route_matches(route, suffix: str, method: str) -> bool:
    try:
        return str(getattr(route, "path", "")).endswith(suffix) and method in (getattr(route, "methods", set()) or set())
    except Exception:
        return False


def _context_ready(context: dict | None) -> bool:
    context = context or {}
    required = ["db", "ObjectId", "bcrypt", "create_access_token", "create_refresh_token", "set_auth_cookies", "clear_auth_cookies"]
    return all(context.get(key) is not None for key in required)


def _find_server_context(preferred: dict | None = None) -> dict:
    if _context_ready(preferred):
        return preferred or {}

    frame = inspect.currentframe()
    seen = set()
    while frame:
        glob = frame.f_globals or {}
        ident = id(glob)
        if ident not in seen and _context_ready(glob):
            return glob
        seen.add(ident)
        frame = frame.f_back

    return preferred or {}


def _serial(value):
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _json_safe(doc):
    if isinstance(doc, dict):
        return {key: _json_safe(value) for key, value in doc.items()}
    if isinstance(doc, list):
        return [_json_safe(value) for value in doc]
    return _serial(doc)


def _looks_bcrypt(value: str) -> bool:
    value = str(value or "")
    return value.startswith("$2a$") or value.startswith("$2b$") or value.startswith("$2y$")


def _normal_email(value) -> str:
    return str(value or "").strip().lower()


def _trial_expired(user_doc: dict) -> bool:
    trial_ends_at = user_doc.get("trial_ends_at")
    if not trial_ends_at:
        return False
    try:
        if isinstance(trial_ends_at, str):
            trial_ends_at = datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
        if trial_ends_at.tzinfo is None:
            trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
        return trial_ends_at < datetime.now(timezone.utc)
    except Exception:
        return False


def _has_app_access(user_doc: dict) -> bool:
    role = str(user_doc.get("role") or "").strip().lower()
    if role in {"worker", "payroll", "payroll_user"}:
        return True

    plan = str(user_doc.get("plan") or "").strip().lower()
    if not plan or plan in {"none", "free", "null", "undefined"}:
        return False

    status = str(user_doc.get("subscription_status") or "trialing").strip().lower()
    if status in {"active", "paid"}:
        return True
    if status == "trialing" and not _trial_expired(user_doc):
        return True
    return False


def _user_response(user_doc: dict, user_id: str, token: str | None, build_user_response=None) -> dict:
    if build_user_response:
        try:
            base = build_user_response(user_doc, user_id, token)
        except Exception:
            base = {}
    else:
        base = {}

    if not base:
        base = {
            "id": user_id,
            "email": user_doc.get("email"),
            "name": user_doc.get("name") or user_doc.get("business_name") or "Churvox user",
            "business_name": user_doc.get("business_name"),
            "role": user_doc.get("role", "employer"),
            "plan": user_doc.get("plan", "none"),
            "business_id": str(user_doc.get("business_id") or user_id),
        }
        if token:
            base["token"] = token

    base["subscription_status"] = user_doc.get("subscription_status") or base.get("subscription_status")
    base["trial_ends_at"] = _serial(user_doc.get("trial_ends_at") or base.get("trial_ends_at"))
    base["email_verified"] = user_doc.get("email_verified", base.get("email_verified", True))
    base["has_app_access"] = _has_app_access(user_doc)
    base["business_id"] = str(base.get("business_id") or user_doc.get("business_id") or user_id)

    clean = _json_safe(base)
    return {"success": True, **clean, "user": clean}


def _verify_password(password: str, user_doc: dict, bcrypt_module) -> tuple[bool, str | None]:
    hash_fields = ["password_hash", "hashed_password", "passwordHash", "bcrypt_hash", "pass_hash"]

    for field in hash_fields:
        stored = user_doc.get(field)
        if not isinstance(stored, str) or not stored.strip():
            continue
        try:
            if bcrypt_module.checkpw(str(password or "").encode("utf-8"), stored.encode("utf-8")):
                return True, field
        except Exception:
            continue

    for field in ["password", "plain_password"]:
        stored = user_doc.get(field)
        if isinstance(stored, str) and stored and not _looks_bcrypt(stored) and stored == password:
            return True, field

    return False, None


def install(router, context: dict | None = None) -> bool:
    context = _find_server_context(context)
    if router is None or getattr(router, "churvox_auth_login_safety_installed", False):
        return False

    db = context.get("db")
    ObjectId = context.get("ObjectId")
    bcrypt_module = context.get("bcrypt")
    create_access_token = context.get("create_access_token")
    create_refresh_token = context.get("create_refresh_token")
    set_auth_cookies = context.get("set_auth_cookies")
    clear_auth_cookies = context.get("clear_auth_cookies")
    build_user_response = context.get("build_user_response")

    if not all([db, ObjectId, bcrypt_module, create_access_token, create_refresh_token, set_auth_cookies, clear_auth_cookies]):
        return False

    from fastapi import HTTPException, Request, Response

    router.routes = [
        route
        for route in getattr(router, "routes", [])
        if not (_route_matches(route, "/auth/login", "POST") or _route_matches(route, "/auth/me", "GET"))
    ]

    async def _current_user_from_request(request: Request):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header[7:] if auth_header.startswith("Bearer ") else None
        if not token:
            token = request.cookies.get("access_token")
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            import jwt
            jwt_secret = context.get("JWT_SECRET") or "default_secret_change_me"
            jwt_algorithm = context.get("JWT_ALGORITHM") or "HS256"
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
            if payload.get("type") != "access":
                raise HTTPException(status_code=401, detail="Invalid token type")
            user_doc = await db.users.find_one({"_id": ObjectId(payload["sub"])})
            if not user_doc:
                raise HTTPException(status_code=401, detail="User not found")
            return user_doc, str(user_doc["_id"]), token
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")

    @router.post("/auth/login")
    async def churvox_safe_login(request: Request, response: Response):
        clear_auth_cookies(response)
        try:
            body = await request.json()
        except Exception:
            body = {}

        email = _normal_email(body.get("email"))
        password = str(body.get("password") or "")
        if not email or not password:
            response.status_code = 400
            return {"success": False, "detail": "Enter your email and password."}

        user_doc = await db.users.find_one({"email": email})
        password_ok = False
        matched_field = None
        if user_doc:
            password_ok, matched_field = _verify_password(password, user_doc, bcrypt_module)

        if not user_doc or not password_ok:
            response.status_code = 401
            return {"success": False, "detail": "Invalid email or password"}

        if user_doc.get("status") == "invited":
            response.status_code = 403
            return {"success": False, "detail": "Please complete your account setup using the invite link sent to your email."}

        user_id = str(user_doc["_id"])
        access_token = create_access_token(user_id, email)
        refresh_token = create_refresh_token(user_id)
        set_auth_cookies(response, access_token, refresh_token)

        updates = {}
        if matched_field and matched_field != "password_hash":
            try:
                salt = bcrypt_module.gensalt()
                updates["password_hash"] = bcrypt_module.hashpw(password.encode("utf-8"), salt).decode("utf-8")
            except Exception:
                pass
        if "business_id" not in user_doc or not user_doc.get("business_id"):
            updates["business_id"] = user_doc["_id"]
        if updates:
            await db.users.update_one({"_id": user_doc["_id"]}, {"$set": updates})
            user_doc.update(updates)

        return _user_response(user_doc, user_id, access_token, build_user_response)

    @router.get("/auth/me")
    async def churvox_safe_me(request: Request):
        user_doc, user_id, token = await _current_user_from_request(request)
        return _user_response(user_doc, user_id, token, build_user_response)

    router.churvox_auth_login_safety_installed = True
    return True


def install_include_router_hook() -> bool:
    try:
        from fastapi import FastAPI
    except Exception:
        return False

    original = getattr(FastAPI, "include_router", None)
    if not original or getattr(original, "_churvox_auth_login_safety_hook", False):
        return True

    def include_router_with_auth_safety(self, router, *args, **kwargs):
        try:
            routes = getattr(router, "routes", []) or []
            has_login = any(_route_matches(route, "/auth/login", "POST") for route in routes)
            if has_login:
                install(router, _find_server_context())
        except Exception:
            pass
        return original(self, router, *args, **kwargs)

    include_router_with_auth_safety._churvox_auth_login_safety_hook = True
    include_router_with_auth_safety._churvox_original_include_router = original
    FastAPI.include_router = include_router_with_auth_safety
    return True


install_include_router_hook()
