from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

INSTALLED = set()
OWNER_EMAILS = {"hello@churvox.com", "howardjennings77@gmail.com", "howardjennings777@gmail.com"}


def now_utc():
    return datetime.now(timezone.utc)


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def email_of(user):
    return lower((user or {}).get("email") or (user or {}).get("user_email") or (user or {}).get("owner_email"))


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


def is_owner(user):
    role = lower((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type")).replace("-", "_").replace(" ", "_")
    return email_of(user) in OWNER_EMAILS or role in {"platform_owner", "platform_admin", "super_admin", "superadmin", "admin"} or bool((user or {}).get("is_platform_owner") or (user or {}).get("is_platform_admin") or (user or {}).get("is_super_admin") or (user or {}).get("is_admin"))


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or get_current_user is None or Request is None or HTTPException is None:
        return

    def remove_route(path, method):
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass

    async def ensure_indexes():
        try:
            await db.support_tickets.create_index("created_at")
            await db.support_tickets.create_index("status")
            await db.support_tickets.create_index("business_id")
            await db.support_tickets.create_index("user_email")
        except Exception:
            pass

    async def current_user(request: Request):
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated")
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return user

    async def create_ticket(request: Request):
        await ensure_indexes()
        user = await current_user(request)
        body: Dict[str, Any] = await request.json()
        subject = text(body.get("subject"))[:180]
        message = text(body.get("message") or body.get("details"))[:6000]
        category = text(body.get("category") or "General")[:80]
        priority = text(body.get("priority") or "Normal")[:40]
        page = text(body.get("page") or body.get("path"))[:300]
        industry = text(body.get("industry") or body.get("industry_mode") or (user or {}).get("industry_mode") or (user or {}).get("trade_industry_type"))[:120]
        if not subject:
            raise HTTPException(status_code=400, detail="Support subject is required")
        if not message:
            raise HTTPException(status_code=400, detail="Support message is required")
        now = now_utc()
        doc = {
            "created_at": now,
            "updated_at": now,
            "status": "open",
            "category": category,
            "priority": priority,
            "subject": subject,
            "message": message,
            "page": page,
            "industry_mode": industry,
            "user_id": (user or {}).get("id") or (user or {}).get("_id"),
            "user_email": email_of(user),
            "user_name": text((user or {}).get("name")),
            "business_id": text((user or {}).get("business_id")),
            "business_name": text((user or {}).get("business_name") or (user or {}).get("company_name")),
            "source": "internal_app_support",
            "reply_channel": "inside_churvox",
            "user_agent": text(request.headers.get("user-agent"))[:500],
        }
        result = await db.support_tickets.insert_one(doc)
        return {"success": True, "ticket": safe({**doc, "_id": result.inserted_id}), "message": "Support ticket saved inside Churvox."}

    async def my_tickets(request: Request):
        await ensure_indexes()
        user = await current_user(request)
        query = {"user_email": email_of(user)}
        business_id = text((user or {}).get("business_id"))
        if business_id:
            query = {"$or": [{"user_email": email_of(user)}, {"business_id": business_id}]}
        rows = []
        try:
            rows = await db.support_tickets.find(query).sort("created_at", -1).limit(80).to_list(length=80)
        except Exception:
            rows = []
        return {"success": True, "tickets": safe(rows), "items": safe(rows)}

    async def owner_tickets(request: Request):
        await ensure_indexes()
        user = await current_user(request)
        if not is_owner(user):
            raise HTTPException(status_code=403, detail="Support tickets are locked to Churvox HQ")
        rows = []
        try:
            rows = await db.support_tickets.find({}).sort("created_at", -1).limit(300).to_list(length=300)
        except Exception:
            rows = []
        open_count = len([row for row in rows if lower(row.get("status")) in {"open", "new", "waiting", "needs_reply"}])
        return {"success": True, "open_count": open_count, "tickets": safe(rows), "items": safe(rows)}

    async def update_owner_ticket(request: Request, ticket_id: str):
        await ensure_indexes()
        user = await current_user(request)
        if not is_owner(user):
            raise HTTPException(status_code=403, detail="Support tickets are locked to Churvox HQ")
        body: Dict[str, Any] = await request.json()
        status = lower(body.get("status") or "")
        note = text(body.get("note") or body.get("owner_note"))[:3000]
        update = {"updated_at": now_utc()}
        if status:
            update["status"] = status
        if note:
            update["owner_note"] = note
            update["last_owner_email"] = email_of(user)
        try:
            from bson import ObjectId
            query = {"_id": ObjectId(ticket_id)}
        except Exception:
            query = {"id": ticket_id}
        await db.support_tickets.update_one(query, {"$set": update})
        return {"success": True, "message": "Support ticket updated."}

    for path, endpoint, methods in [
        ("/api/support/tickets", create_ticket, ["POST"]),
        ("/api/support/tickets", my_tickets, ["GET"]),
        ("/api/admin/owner/support-tickets", owner_tickets, ["GET"]),
        ("/api/admin/owner/support-tickets/{ticket_id}", update_owner_ticket, ["PATCH"]),
    ]:
        for method in methods:
            remove_route(path, method)
        app.add_api_route(path, endpoint, methods=methods)

    INSTALLED.add(name)
