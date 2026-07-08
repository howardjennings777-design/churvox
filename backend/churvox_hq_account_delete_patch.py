from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

INSTALLED = set()
OWNER_EMAILS = {"hello@churvox.com", "howardjennings77@gmail.com", "howardjennings777@gmail.com"}
ALLOWED_ORIGINS = {"https://www.churvox.com", "https://churvox.com", "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"}


def now_utc():
    return datetime.now(timezone.utc)


def text(value: Any) -> str:
    try:
        return str(value or "").strip()
    except Exception:
        return ""


def low(value: Any) -> str:
    return text(value).lower()


def email_of(doc: Dict[str, Any] | None) -> str:
    return low((doc or {}).get("email") or (doc or {}).get("user_email") or (doc or {}).get("owner_email"))


def role_of(doc: Dict[str, Any] | None) -> str:
    return low((doc or {}).get("role") or (doc or {}).get("user_role") or (doc or {}).get("account_type")).replace("-", "_").replace(" ", "_")


def safe(value: Any):
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "token", "secret", "hash"]):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    return value


def id_values(identifier: str):
    raw = text(identifier)
    values = [raw]
    try:
        from bson import ObjectId
        if ObjectId.is_valid(raw):
            values.append(ObjectId(raw))
    except Exception:
        pass
    return [value for value in values if value not in (None, "")]


def owner_allowed(user: Dict[str, Any] | None, checker=None) -> bool:
    user = user or {}
    allowed = email_of(user) in OWNER_EMAILS or role_of(user) in {"platform_owner", "platform_admin", "super_admin", "superadmin", "admin"} or bool(user.get("is_platform_owner") or user.get("is_platform_admin") or user.get("is_super_admin") or user.get("is_admin"))
    if not allowed and checker:
        try:
            allowed = bool(checker(user))
        except Exception:
            allowed = False
    return allowed


def cors_origin(request):
    origin = request.headers.get("origin") or ""
    if origin in ALLOWED_ORIGINS:
        return origin
    if origin.endswith(".onrender.com") or origin.endswith(".vercel.app"):
        return origin
    return "https://www.churvox.com"


def with_cors(response, request):
    response.headers["Access-Control-Allow-Origin"] = cors_origin(request)
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers") or "Authorization,Content-Type,Accept,X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "86400"
    response.headers["Vary"] = "Origin"
    return response


def user_query(identifier: str, email: str = ""):
    vals = id_values(identifier)
    ors: List[Dict[str, Any]] = []
    for value in vals:
        ors.extend([{ "_id": value }, { "id": value }, { "user_id": value }, { "owner_id": value }, { "business_id": value }])
    candidate_email = low(email or identifier)
    if "@" in candidate_email:
        ors.extend([{ "email": candidate_email }, { "user_email": candidate_email }, { "owner_email": candidate_email }])
    return {"$or": ors} if ors else {"_id": "__missing__"}


def business_query(user: Dict[str, Any] | None, identifier: str, email: str):
    user = user or {}
    ids = {text(identifier), text(user.get("id")), text(user.get("_id")), text(user.get("user_id")), text(user.get("business_id")), text(user.get("owner_id"))}
    ids = {item for item in ids if item}
    vals = []
    for item in ids:
        vals.extend(id_values(item))
    candidate_email = low(email or user.get("email") or identifier)
    ors: List[Dict[str, Any]] = []
    for value in vals:
        ors.extend([{ "_id": value }, { "id": value }, { "business_id": value }, { "owner_id": value }, { "user_id": value }, { "created_by": value }])
    if "@" in candidate_email:
        ors.extend([{ "email": candidate_email }, { "business_email": candidate_email }, { "owner_email": candidate_email }, { "user_email": candidate_email }, { "created_by_email": candidate_email }])
    return {"$or": ors} if ors else {"_id": "__missing__"}


async def delete_matching(db, collection_name: str, query: Dict[str, Any], limit: int = 200):
    deleted = 0
    samples = []
    try:
        rows = await db[collection_name].find(query).limit(limit).to_list(length=limit)
    except Exception:
        rows = []
    for row in rows:
        try:
            result = await db[collection_name].delete_one({"_id": row.get("_id")})
            if result.deleted_count:
                deleted += int(result.deleted_count)
                samples.append(safe(row))
        except Exception:
            pass
    return deleted, samples[:12]


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    JSONResponse = getattr(module, "JSONResponse", None)
    if not app or db is None or get_current_user is None or JSONResponse is None:
        return

    async def handle_delete(request, identifier_from_path: str = ""):
        try:
            actor = await get_current_user(request)
        except Exception as exc:
            return with_cors(JSONResponse({"success": False, "message": "HQ auth required", "detail": str(exc)[:160]}, status_code=401), request)
        if not owner_allowed(actor, getattr(module, "is_platform_owner", None)):
            return with_cors(JSONResponse({"success": False, "message": "HQ owner access required"}, status_code=403), request)
        try:
            body = await request.json()
        except Exception:
            body = {}
        identifier = text(body.get("identifier") or body.get("id") or identifier_from_path)
        email = low(body.get("email") or identifier)
        confirm = text(body.get("confirm") or body.get("confirmation"))
        if not identifier:
            return with_cors(JSONResponse({"success": False, "message": "Account identifier is required"}, status_code=400), request)
        if email in OWNER_EMAILS or low(identifier) in OWNER_EMAILS:
            return with_cors(JSONResponse({"success": False, "message": "Platform owner accounts are protected and cannot be deleted."}, status_code=403), request)
        if confirm not in {"DELETE", "delete", "Delete", "yes", "true", "1"}:
            return with_cors(JSONResponse({"success": False, "message": "Delete confirmation is required."}, status_code=400), request)

        uq = user_query(identifier, email)
        matched_users = []
        try:
            matched_users = await db.users.find(uq).limit(20).to_list(length=20)
        except Exception:
            matched_users = []
        target_user = matched_users[0] if matched_users else {}
        target_email = email_of(target_user) or email
        if target_email in OWNER_EMAILS:
            return with_cors(JSONResponse({"success": False, "message": "Platform owner accounts are protected and cannot be deleted."}, status_code=403), request)

        bq = business_query(target_user, identifier, target_email)
        deleted = {}
        samples = {}
        for collection, query in [
            ("users", uq),
            ("businesses", bq),
            ("business_profiles", bq),
            ("tester_intake", uq),
            ("platform_tester_intake", uq),
            ("sessions", uq),
            ("user_sessions", uq),
            ("password_reset_tokens", uq),
            ("email_verification_tokens", uq),
        ]:
            count, sample = await delete_matching(db, collection, query)
            deleted[collection] = count
            if sample:
                samples[collection] = sample

        audit = {
            "created_at": now_utc(),
            "action": "delete_account",
            "identifier": identifier,
            "email": target_email,
            "actor_email": email_of(actor),
            "actor_id": text(actor.get("id") or actor.get("_id") or actor.get("user_id")),
            "deleted": deleted,
            "samples": samples,
            "source": "churvox_hq_account_delete",
        }
        try:
            await db.hq_deleted_accounts_audit.insert_one(audit)
        except Exception:
            pass
        total_deleted = sum(int(value or 0) for value in deleted.values())
        return with_cors(JSONResponse({"success": True, "message": f"Account deleted from HQ. {total_deleted} record(s) removed.", "deleted": deleted, "audit": safe(audit)}), request)

    @app.middleware("http")
    async def hq_account_delete_middleware(request, call_next):
        path = request.url.path
        method = request.method.upper()
        if path == "/api/admin/owner/delete-account" and method == "OPTIONS":
            return with_cors(JSONResponse({"ok": True}), request)
        if path.startswith("/api/admin/owner/accounts/") and method == "OPTIONS":
            return with_cors(JSONResponse({"ok": True}), request)
        if path == "/api/admin/owner/delete-account" and method == "POST":
            return await handle_delete(request)
        if path.startswith("/api/admin/owner/accounts/") and method == "DELETE":
            identifier = path.split("/api/admin/owner/accounts/", 1)[-1]
            return await handle_delete(request, identifier)
        return await call_next(request)

    INSTALLED.add(name)
