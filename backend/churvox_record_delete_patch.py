from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List

INSTALLED = set()


def now_utc():
    return datetime.now(timezone.utc)


def text(value: Any) -> str:
    try:
        return str(value or "").strip()
    except Exception:
        return ""


def lower(value: Any) -> str:
    return text(value).lower()


def normal_type(value: Any) -> str:
    raw = lower(value).replace("-", "_").replace(" ", "_")
    aliases = {
        "support": "support_ticket",
        "ticket": "support_ticket",
        "tickets": "support_ticket",
        "staff": "worker",
        "team": "worker",
        "team_member": "worker",
        "approval": "approval",
        "command": "approval",
        "action": "approval",
        "notification": "message",
        "approved_notification": "message",
        "messages": "message",
        "clients": "client",
        "customers": "client",
        "customer": "client",
        "jobs": "job",
        "appointments": "job",
        "appointment": "job",
        "quotes": "quote",
        "invoices": "invoice",
        "workers": "worker",
    }
    return aliases.get(raw, raw)


def user_value(user: Dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = (user or {}).get(key)
        if value not in (None, ""):
            return text(value)
    business = (user or {}).get("business") or {}
    if isinstance(business, dict):
        for key in keys:
            value = business.get(key)
            if value not in (None, ""):
                return text(value)
    return ""


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


def id_variants(record_id: str):
    values = [text(record_id)]
    try:
        from bson import ObjectId
        if ObjectId.is_valid(text(record_id)):
            values.append(ObjectId(text(record_id)))
    except Exception:
        pass
    return [value for value in values if value not in (None, "")]


def id_query(record_id: str, fields: Iterable[str]) -> Dict[str, Any]:
    variants = id_variants(record_id)
    ors = []
    for value in variants:
        ors.append({"_id": value})
        for field in fields:
            ors.append({field: value})
    return {"$or": ors} if ors else {"_id": "__missing__"}


def ownership_query(user: Dict[str, Any]) -> Dict[str, Any]:
    business_id = user_value(user, "business_id", "company_id", "tenant_id")
    email = lower(user_value(user, "email", "user_email", "owner_email"))
    user_id = user_value(user, "id", "_id", "user_id")
    ors: List[Dict[str, Any]] = []
    if business_id:
        ors += [{"business_id": business_id}, {"company_id": business_id}, {"tenant_id": business_id}, {"business.id": business_id}]
    if email:
        ors += [{"user_email": email}, {"owner_email": email}, {"created_by_email": email}, {"email": email}]
    if user_id:
        ors += [{"user_id": user_id}, {"owner_id": user_id}, {"created_by": user_id}]
    # Some early beta records were saved without ownership fields. Allow those by ID only after auth.
    ors += [
        {"business_id": {"$exists": False}, "user_email": {"$exists": False}, "owner_email": {"$exists": False}},
        {"business_id": None, "user_email": None, "owner_email": None},
    ]
    return {"$or": ors}


def combined_query(record_id: str, id_fields: Iterable[str], user: Dict[str, Any]) -> Dict[str, Any]:
    return {"$and": [id_query(record_id, id_fields), ownership_query(user)]}


TARGETS = {
    "job": {
        "paths": ["/api/jobs/{record_id}"],
        "collections": ["jobs", "job_records", "business_jobs"],
        "id_fields": ["id", "job_id", "record_id"],
        "label": "job",
    },
    "client": {
        "paths": ["/api/clients/{record_id}"],
        "collections": ["clients", "customers", "client_records"],
        "id_fields": ["id", "client_id", "customer_id", "record_id"],
        "label": "client",
    },
    "quote": {
        "paths": ["/api/quotes/{record_id}"],
        "collections": ["quotes", "quote_records"],
        "id_fields": ["id", "quote_id", "record_id"],
        "label": "quote",
    },
    "invoice": {
        "paths": ["/api/invoices/{record_id}"],
        "collections": ["invoices", "invoice_records"],
        "id_fields": ["id", "invoice_id", "invoice_number", "number", "record_id"],
        "label": "invoice",
    },
    "worker": {
        "paths": ["/api/team/workers/{record_id}", "/api/team/{record_id}", "/api/workers/{record_id}"],
        "collections": ["team_workers", "workers", "team", "staff", "users"],
        "id_fields": ["id", "worker_id", "team_member_id", "user_id", "email", "record_id"],
        "label": "worker",
    },
    "message": {
        "paths": ["/api/messages/{record_id}", "/api/approved-notifications/{record_id}"],
        "collections": ["messages", "approved_notifications", "notifications", "worker_messages", "customer_messages", "client_messages"],
        "id_fields": ["id", "message_id", "notification_id", "source_id", "record_id", "thread_id", "conversation_id"],
        "label": "message",
    },
    "approval": {
        "paths": ["/api/ai/actions/{record_id}", "/api/command/approvals/{record_id}"],
        "collections": ["ai_actions", "command_approvals", "owner_actions", "approved_notifications", "ai_approval_actions"],
        "id_fields": ["id", "action_id", "approval_id", "record_id", "source_id"],
        "label": "approval",
    },
    "support_ticket": {
        "paths": ["/api/support/tickets/{record_id}", "/api/admin/owner/support-tickets/{record_id}"],
        "collections": ["support_tickets"],
        "id_fields": ["id", "ticket_id", "record_id"],
        "label": "support ticket",
    },
}


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

    def remove_route(path: str, method: str):
        try:
            app.router.routes = [
                route for route in app.router.routes
                if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))
            ]
        except Exception:
            pass

    async def delete_from_target(target: Dict[str, Any], record_id: str, request: Request):
        user = await current_user(request)
        query = combined_query(record_id, target["id_fields"], user)
        deleted = 0
        matched = None
        touched = []
        for collection_name in target["collections"]:
            try:
                collection = db[collection_name]
                found = await collection.find_one(query)
                if not found:
                    continue
                result = await collection.delete_one({"_id": found.get("_id")})
                if result.deleted_count:
                    deleted += int(result.deleted_count)
                    matched = matched or found
                    touched.append(collection_name)
            except Exception:
                continue
        return {
            "success": True,
            "deleted": deleted,
            "record_id": record_id,
            "record_type": target["label"],
            "collections": touched,
            "record": safe(matched) if matched else None,
            "message": f"{target['label'].capitalize()} deleted." if deleted else f"No matching {target['label']} found to delete.",
        }

    async def reply_to_message(record_id: str, request: Request):
        user = await current_user(request)
        body = await request.json()
        reply_text = text(body.get("reply") or body.get("message") or body.get("body"))[:6000]
        if not reply_text:
            raise HTTPException(status_code=400, detail="Reply message is required")
        now = now_utc()
        target = TARGETS["message"]
        query = combined_query(record_id, target["id_fields"], user)
        original = None
        original_collection = ""
        for collection_name in target["collections"]:
            try:
                original = await db[collection_name].find_one(query)
                if original:
                    original_collection = collection_name
                    break
            except Exception:
                continue
        doc = {
            "created_at": now,
            "updated_at": now,
            "message_id": record_id,
            "thread_id": text(body.get("thread_id") or (original or {}).get("thread_id") or (original or {}).get("conversation_id") or record_id),
            "conversation_id": text(body.get("conversation_id") or (original or {}).get("conversation_id") or (original or {}).get("thread_id") or record_id),
            "reply": reply_text,
            "body": reply_text,
            "direction": "owner_to_recipient",
            "channel": text(body.get("channel") or (original or {}).get("channel") or "Inside Churvox"),
            "status": "sent_inside_churvox",
            "original_collection": original_collection,
            "original_subject": text((original or {}).get("subject") or (original or {}).get("title") or body.get("subject")),
            "to": text(body.get("to") or (original or {}).get("from") or (original or {}).get("sender") or "recipient"),
            "user_email": lower(user_value(user, "email")),
            "user_id": user_value(user, "id", "_id", "user_id"),
            "business_id": user_value(user, "business_id", "company_id", "tenant_id"),
            "business_name": user_value(user, "business_name", "company_name"),
            "source": "churvox_record_drawer_reply",
        }
        result = await db.message_replies.insert_one(doc)
        if original and original_collection:
            try:
                await db[original_collection].update_one({"_id": original.get("_id")}, {"$set": {"last_reply": reply_text, "last_reply_at": now, "replied": True, "read": True, "is_read": True, "status": "replied"}})
            except Exception:
                pass
        return {"success": True, "reply": safe({**doc, "_id": result.inserted_id}), "message": "Reply saved inside Churvox."}

    async def generic_delete(record_type: str, record_id: str, request: Request):
        target_key = normal_type(record_type)
        target = TARGETS.get(target_key)
        if not target:
            raise HTTPException(status_code=404, detail=f"Unknown record type: {record_type}")
        return await delete_from_target(target, record_id, request)

    async def generic_reply(record_type: str, record_id: str, request: Request):
        target_key = normal_type(record_type)
        if target_key != "message":
            raise HTTPException(status_code=400, detail="Replies are only available for message records")
        return await reply_to_message(record_id, request)

    # Generic routes avoid legacy route validators that were returning 422 before this patch was reached.
    remove_route("/api/records/{record_type}/{record_id}", "DELETE")
    app.add_api_route("/api/records/{record_type}/{record_id}", generic_delete, methods=["DELETE"])
    remove_route("/api/records/{record_type}/{record_id}/reply", "POST")
    app.add_api_route("/api/records/{record_type}/{record_id}/reply", generic_reply, methods=["POST"])

    for target in TARGETS.values():
        async def endpoint(record_id: str, request: Request, target=target):
            return await delete_from_target(target, record_id, request)
        for path in target["paths"]:
            remove_route(path, "DELETE")
            app.add_api_route(path, endpoint, methods=["DELETE"])

    for path in ["/api/messages/{record_id}/reply", "/api/approved-notifications/{record_id}/reply"]:
        remove_route(path, "POST")
        app.add_api_route(path, reply_to_message, methods=["POST"])

    INSTALLED.add(name)
