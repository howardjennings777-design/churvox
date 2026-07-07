from datetime import datetime, timezone
import os

from fastapi import HTTPException, Request

INSTALLED = set()
OWNER_EMAILS = {"hello@churvox.com", "howardjennings77@gmail.com"}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def owner_emails():
    raw = os.environ.get("PLATFORM_OWNER_EMAILS") or os.environ.get("CHURVOX_PLATFORM_OWNER_EMAILS") or ""
    return OWNER_EMAILS | {lower(item) for item in raw.replace(";", ",").split(",") if lower(item)}


def mask_email(email):
    email = clean(email)
    if not email or "@" not in email:
        return ""
    name, domain = email.split("@", 1)
    if len(name) <= 2:
        masked = name[:1] + "*"
    else:
        masked = name[:2] + "***" + name[-1:]
    return f"{masked}@{domain}"


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "hash", "token", "secret", "server_token"]):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or not get_current_user or ObjectId is None:
        return

    def oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def current_user_doc(request: Request):
        current = await get_current_user(request)
        uid = oid(current.get("id") or current.get("_id") or current.get("user_id"))
        user_doc = await db.users.find_one({"_id": uid}) if uid else None
        if not user_doc and current.get("email"):
            user_doc = await db.users.find_one({"email": lower(current.get("email"))})
        return user_doc or dict(current)

    async def require_owner(request: Request):
        user = await current_user_doc(request)
        email = lower(user.get("email"))
        allowed = email in owner_emails() or bool(user.get("is_platform_owner") or user.get("is_admin")) or lower(user.get("role")) in {"platform_owner", "superadmin"}
        checker = getattr(module, "is_platform_owner", None)
        if not allowed and checker:
            try:
                allowed = bool(checker(user))
            except Exception:
                allowed = False
        if not allowed:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to the platform owner account")
        return user

    async def email_provider_status(request: Request):
        await require_owner(request)
        token_present = bool(clean(os.environ.get("POSTMARK_SERVER_TOKEN")))
        from_email = clean(os.environ.get("POSTMARK_FROM_EMAIL"))
        configured = bool(token_present and from_email)
        missing = []
        if not token_present:
            missing.append("POSTMARK_SERVER_TOKEN")
        if not from_email:
            missing.append("POSTMARK_FROM_EMAIL")
        logs = []
        try:
            cursor = db.app_owner_control_log.find({"action": "tester_intake"}).sort("created_at", -1).limit(20)
            logs = await cursor.to_list(length=20)
        except Exception:
            logs = []
        return safe({
            "success": True,
            "provider": "postmark",
            "configured": configured,
            "postmark_server_token_present": token_present,
            "postmark_from_email_present": bool(from_email),
            "from_email_masked": mask_email(from_email),
            "missing": missing,
            "checked_at": now_utc(),
            "recent_tester_email_results": logs,
            "message": "Postmark email is configured" if configured else "Postmark email is not fully configured",
        })

    remove_route(app, "/api/admin/owner/email-provider-status", "GET")
    app.add_api_route("/api/admin/owner/email-provider-status", email_provider_status, methods=["GET"])
    INSTALLED.add(name)
