from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List

INSTALLED = set()
ALLOWED_ORIGINS = {
    "https://www.churvox.com",
    "https://churvox.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
}
PLATFORM_OWNER_EMAILS = {
    "hello@churvox.com",
    "howardjennings77@gmail.com",
    "howardjennings777@gmail.com",
}
DIRECT_RECORD_TYPES = {
    "jobs": "job",
    "clients": "client",
    "quotes": "quote",
    "invoices": "invoice",
}


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


def cors_origin(request):
    origin = request.headers.get("origin") or ""
    if origin in ALLOWED_ORIGINS:
        return origin
    if origin.endswith(".onrender.com") or origin.endswith(".vercel.app"):
        return origin
    return "https://www.churvox.com"


def add_cors(response, request):
    response.headers["Access-Control-Allow-Origin"] = cors_origin(request)
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers") or "Authorization,Content-Type,Accept,X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "86400"
    response.headers["Vary"] = "Origin"
    return response


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
    emails = PLATFORM_OWNER_EMAILS if email in PLATFORM_OWNER_EMAILS else {email} if email else set()
    for allowed_email in emails:
        ors += [{"user_email": allowed_email}, {"owner_email": allowed_email}, {"created_by_email": allowed_email}, {"email": allowed_email}]
    if user_id:
        ors += [{"user_id": user_id}, {"owner_id": user_id}, {"created_by": user_id}]
    ors += [
        {"business_id": {"$exists": False}, "user_email": {"$exists": False}, "owner_email": {"$exists": False}},
        {"business_id": None, "user_email": None, "owner_email": None},
    ]
    return {"$or": ors}


def combined_query(record_id: str, id_fields: Iterable[str], user: Dict[str, Any]) -> Dict[str, Any]:
    return {"$and": [id_query(record_id, id_fields), ownership_query(user)]}


TARGETS = {
    "job": {"collections": ["jobs", "job_records", "business_jobs"], "id_fields": ["id", "job_id", "record_id"], "label": "job"},
    "client": {"collections": ["clients", "customers", "client_records"], "id_fields": ["id", "client_id", "customer_id", "record_id"], "label": "client"},
    "quote": {"collections": ["quotes", "quote_records"], "id_fields": ["id", "quote_id", "record_id"], "label": "quote"},
    "invoice": {"collections": ["invoices", "invoice_records"], "id_fields": ["id", "invoice_id", "invoice_number", "number", "record_id"], "label": "invoice"},
    "worker": {"collections": ["team_workers", "workers", "team", "staff", "users"], "id_fields": ["id", "worker_id", "team_member_id", "user_id", "email", "record_id"], "label": "worker"},
    "message": {"collections": ["messages", "approved_notifications", "notifications", "worker_messages", "customer_messages", "client_messages"], "id_fields": ["id", "message_id", "notification_id", "source_id", "record_id", "thread_id", "conversation_id"], "label": "message"},
    "approval": {"collections": ["ai_actions", "command_approvals", "owner_actions", "approved_notifications", "ai_approval_actions"], "id_fields": ["id", "action_id", "approval_id", "record_id", "source_id"], "label": "approval"},
    "support_ticket": {"collections": ["support_tickets"], "id_fields": ["id", "ticket_id", "record_id"], "label": "support ticket"},
}


def split_record_path(path: str):
    parts = [part for part in text(path).split("/") if part]
    if len(parts) not in (4, 5):
        return None
    if parts[0] != "api" or parts[1] != "records":
        return None
    action = "reply" if len(parts) == 5 and parts[4] == "reply" else "delete" if len(parts) == 4 else ""
    if not action:
        return None
    return normal_type(parts[2]), parts[3], action


def split_direct_record_path(path: str):
    parts = [part for part in text(path).split("/") if part]
    if len(parts) != 3 or parts[0] != "api":
        return None
    record_type = DIRECT_RECORD_TYPES.get(parts[1])
    if not record_type:
        return None
    return record_type, parts[2], "delete"


def split_quote_accept_path(path: str):
    parts = [part for part in text(path).split("/") if part]
    if len(parts) == 4 and parts[0] == "api" and parts[1] == "quotes" and parts[3] == "accept":
        return parts[2]
    return None


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

    async def current_user_or_response(request):
        try:
            user = await get_current_user(request)
        except Exception as exc:
            return None, JSONResponse({"success": False, "message": "Login required", "detail": str(exc)[:180]}, status_code=401)
        if not user:
            return None, JSONResponse({"success": False, "message": "Login required"}, status_code=401)
        return user, None

    async def delete_from_target(target: Dict[str, Any], record_id: str, user: Dict[str, Any]):
        query = combined_query(record_id, target["id_fields"], user)
        deleted = 0
        matched = None
        touched = []
        for collection_name in target["collections"]:
            try:
                found = await db[collection_name].find_one(query)
                if not found:
                    continue
                result = await db[collection_name].delete_one({"_id": found.get("_id")})
                if result.deleted_count:
                    deleted += int(result.deleted_count)
                    matched = matched or found
                    touched.append(collection_name)
            except Exception:
                continue
        return {
            "success": deleted > 0,
            "deleted": deleted,
            "record_id": record_id,
            "record_type": target["label"],
            "collections": touched,
            "record": safe(matched) if matched else None,
            "message": f"{target['label'].capitalize()} deleted." if deleted else f"No matching {target['label']} found to delete.",
        }

    async def accept_quote(record_id: str, request, user: Dict[str, Any]):
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        target = TARGETS["quote"]
        query = combined_query(record_id, target["id_fields"], user)
        accepted_at = now_utc()
        accepted_by_email = lower(user_value(user, "email", "user_email", "owner_email"))
        accepted_by_id = user_value(user, "id", "_id", "user_id")
        update = {
            "status": "Accepted",
            "accepted_at": accepted_at,
            "updated_at": accepted_at,
            "accepted_by_owner": True,
            "owner_approved": True,
            "accepted_by_email": accepted_by_email,
            "accepted_by_id": accepted_by_id,
            "acceptance_source": "owner_record_drawer",
        }
        note = text(payload.get("note") or payload.get("acceptance_note"))[:2000]
        if note:
            update["acceptance_note"] = note
        for collection_name in target["collections"]:
            try:
                found = await db[collection_name].find_one(query)
                if not found:
                    continue
                result = await db[collection_name].update_one({"_id": found.get("_id")}, {"$set": update})
                matched_count = int(getattr(result, "matched_count", 0) or 0)
                if not matched_count:
                    continue
                return {
                    "success": True,
                    "status": "accepted",
                    "record_id": record_id,
                    "record_type": "quote",
                    "collection": collection_name,
                    "quote": safe({**found, **update}),
                    "message": "Quote accepted by owner.",
                }
            except Exception:
                continue
        return {
            "success": False,
            "status": "not_found",
            "record_id": record_id,
            "record_type": "quote",
            "message": "No matching quote was found for this business.",
        }

    async def reply_to_message(record_id: str, request, user: Dict[str, Any]):
        try:
            body = await request.json()
        except Exception:
            body = {}
        reply_text = text(body.get("reply") or body.get("message") or body.get("body"))[:6000]
        if not reply_text:
            return JSONResponse({"success": False, "message": "Reply message is required"}, status_code=400)
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
            "source": "churvox_records_exact_bypass_reply",
        }
        result = await db.message_replies.insert_one(doc)
        if original and original_collection:
            try:
                await db[original_collection].update_one({"_id": original.get("_id")}, {"$set": {"last_reply": reply_text, "last_reply_at": now, "replied": True, "read": True, "is_read": True, "status": "replied"}})
            except Exception:
                pass
        return JSONResponse({"success": True, "reply": safe({**doc, "_id": result.inserted_id}), "message": "Reply saved inside Churvox."})

    @app.middleware("http")
    async def records_exact_bypass(request, call_next):
        quote_accept_id = split_quote_accept_path(request.url.path)
        parsed = split_record_path(request.url.path) or split_direct_record_path(request.url.path)
        if (parsed or quote_accept_id) and request.method.upper() == "OPTIONS":
            return add_cors(JSONResponse({"ok": True, "source": "records_exact_bypass"}), request)
        if quote_accept_id:
            if request.method.upper() != "POST":
                return add_cors(JSONResponse({"success": False, "message": "Quote acceptance requires POST."}, status_code=405), request)
            user, error = await current_user_or_response(request)
            if error:
                return add_cors(error, request)
            body = await accept_quote(quote_accept_id, request, user)
            return add_cors(JSONResponse(body, status_code=200 if body.get("success") else 404), request)
        if parsed:
            record_type, record_id, action = parsed
            user, error = await current_user_or_response(request)
            if error:
                return add_cors(error, request)
            target = TARGETS.get(record_type)
            if not target:
                return add_cors(JSONResponse({"success": False, "message": f"Unknown record type: {record_type}"}, status_code=404), request)
            if request.method.upper() == "DELETE" and action == "delete":
                body = await delete_from_target(target, record_id, user)
                return add_cors(JSONResponse(body, status_code=200 if body.get("deleted") else 404), request)
            if request.method.upper() == "POST" and action == "reply" and record_type == "message":
                return add_cors(await reply_to_message(record_id, request, user), request)
            return add_cors(JSONResponse({"success": False, "message": "Record action not allowed"}, status_code=405), request)
        return await call_next(request)

    INSTALLED.add(name)
