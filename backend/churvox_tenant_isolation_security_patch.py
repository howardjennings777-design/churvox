from __future__ import annotations

from datetime import datetime, timezone
import importlib
import secrets
import sys
from typing import Any, Dict, Iterable, List, Tuple

VERSION = "churvox-tenant-isolation-security-20260729-v1"
ALLOWED_ORIGINS = {
    "https://www.churvox.com",
    "https://churvox.com",
    "https://www.churvox.onrender.com",
    "https://churvox.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
}
OWNER_ROLES = {
    "owner", "employer", "business_owner", "manager", "office_admin", "admin",
}
PLATFORM_ROLES = {"platform_owner", "platform_admin", "super_admin", "superadmin"}
PLATFORM_OWNER_EMAILS = {
    "hello@churvox.com",
    "howardjennings77@gmail.com",
    "howardjennings777@gmail.com",
}
OWNERSHIP_FIELDS = (
    "business_id", "businessId", "company_id", "tenant_id",
    "owner_business_id", "contractor_id", "business.id",
)
OWNER_ID_FIELDS = ("owner_id", "user_id", "created_by", "created_by_id", "employer_id")
OWNER_DATA = {
    "jobs": ("jobs", ("id", "job_id", "record_id", "uuid")),
    "clients": ("clients", ("id", "client_id", "customer_id", "record_id", "uuid")),
    "quotes": ("quotes", ("id", "quote_id", "record_id", "uuid")),
    "invoices": ("invoices", ("id", "invoice_id", "invoice_number", "number", "record_id", "uuid")),
}
RECORD_TARGETS = {
    "job": (("jobs", "job_records", "business_jobs"), ("id", "job_id", "record_id", "uuid")),
    "client": (("clients", "customers", "client_records"), ("id", "client_id", "customer_id", "record_id", "uuid")),
    "quote": (("quotes", "quote_records"), ("id", "quote_id", "record_id", "uuid")),
    "invoice": (("invoices", "invoice_records"), ("id", "invoice_id", "invoice_number", "number", "record_id", "uuid")),
    "worker": (("team_workers", "workers", "team", "staff", "users"), ("id", "worker_id", "team_member_id", "user_id", "email", "record_id")),
    "message": (("messages", "approved_notifications", "notifications", "worker_messages", "customer_messages", "client_messages"), ("id", "message_id", "notification_id", "source_id", "record_id", "thread_id", "conversation_id")),
    "approval": (("ai_actions", "command_approvals", "owner_actions", "approved_notifications", "ai_approval_actions"), ("id", "action_id", "approval_id", "record_id", "source_id")),
    "support_ticket": (("support_tickets",), ("id", "ticket_id", "record_id")),
}
OWNERSHIP_KEYS = {
    "business_id", "businessId", "company_id", "tenant_id", "owner_business_id",
    "contractor_id", "owner_id", "user_id", "created_by", "created_by_id", "employer_id",
    "owner_email", "user_email", "created_by_email", "business_email",
}


def text(value: Any, limit: int = 10000) -> str:
    try:
        return str(value or "").strip()[:limit]
    except Exception:
        return ""


def lower(value: Any) -> str:
    return text(value).lower()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def role_of(user: Dict[str, Any] | None) -> str:
    user = user or {}
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    return lower(
        user.get("role") or user.get("user_role") or user.get("account_type")
        or user.get("staff_role") or user.get("worker_role")
        or business.get("role") or business.get("user_role")
    ).replace("-", "_").replace(" ", "_")


def user_id(user: Dict[str, Any] | None) -> str:
    user = user or {}
    return text(user.get("id") or user.get("_id") or user.get("user_id"))


def business_id(user: Dict[str, Any] | None) -> str:
    user = user or {}
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    return text(
        user.get("business_id") or user.get("businessId") or user.get("owner_business_id")
        or user.get("contractor_id") or user.get("company_id") or user.get("tenant_id")
        or business.get("business_id") or business.get("id") or user_id(user)
    )


def is_owner(user: Dict[str, Any] | None) -> bool:
    user = user or {}
    return role_of(user) in OWNER_ROLES or user.get("is_business_owner") is True


def is_platform_owner(user: Dict[str, Any] | None, checker=None) -> bool:
    user = user or {}
    allowed = (
        lower(user.get("email")) in PLATFORM_OWNER_EMAILS
        or role_of(user) in PLATFORM_ROLES
        or user.get("is_platform_owner") is True
        or user.get("is_platform_admin") is True
        or user.get("is_super_admin") is True
    )
    if not allowed and callable(checker):
        try:
            allowed = bool(checker(user))
        except Exception:
            allowed = False
    return allowed


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
            key_lower = lower(key)
            if any(word in key_lower for word in ("password", "token", "secret", "hash", "cookie", "authorization")):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    return value


def variants(ObjectId, value: Any) -> List[Any]:
    raw = text(value)
    if not raw:
        return []
    values: List[Any] = [raw]
    try:
        if ObjectId.is_valid(raw):
            values.append(ObjectId(raw))
    except Exception:
        try:
            values.append(ObjectId(raw))
        except Exception:
            pass
    unique: List[Any] = []
    for item in values:
        if item not in unique:
            unique.append(item)
    return unique


def strict_business_query(user: Dict[str, Any], ObjectId) -> Dict[str, Any]:
    bid_values = variants(ObjectId, business_id(user))
    uid_values = variants(ObjectId, user_id(user))
    clauses: List[Dict[str, Any]] = []
    if bid_values:
        for field in OWNERSHIP_FIELDS:
            clauses.append({field: {"$in": bid_values}})
    owner_values = []
    for value in bid_values + uid_values:
        if value not in owner_values:
            owner_values.append(value)
    if owner_values:
        for field in OWNER_ID_FIELDS:
            clauses.append({field: {"$in": owner_values}})
    # Email and missing ownership fields are intentionally excluded. A contact email
    # is not tenant identity, and an unowned legacy record is not safe to expose by ID.
    return {"$or": clauses} if clauses else {"_id": "__tenant_missing__"}


def identity_query(record_id: str, ObjectId, fields: Iterable[str]) -> Dict[str, Any]:
    clauses: List[Dict[str, Any]] = []
    for value in variants(ObjectId, record_id):
        clauses.append({"_id": value})
        for field in fields:
            clauses.append({field: value})
    return {"$or": clauses} if clauses else {"_id": "__record_missing__"}


def strict_record_query(user: Dict[str, Any], ObjectId, record_id: str, fields: Iterable[str]) -> Dict[str, Any]:
    return {"$and": [strict_business_query(user, ObjectId), identity_query(record_id, ObjectId, fields)]}


def origin_allowed(origin: str) -> bool:
    origin = text(origin).rstrip("/")
    return bool(origin and (origin in ALLOWED_ORIGINS or (origin.startswith("https://") and origin.endswith(".churvox.com"))))


def apply_cors(response, request):
    origin = text(request.headers.get("origin")).rstrip("/")
    for header in (
        "Access-Control-Allow-Origin", "Access-Control-Allow-Credentials",
        "Access-Control-Allow-Methods", "Access-Control-Allow-Headers",
        "Access-Control-Max-Age",
    ):
        try:
            del response.headers[header]
        except Exception:
            pass
    if origin_allowed(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers") or "Authorization,Content-Type,Accept,X-Requested-With"
        response.headers["Access-Control-Max-Age"] = "86400"
        response.headers["Vary"] = "Origin"
    return response


def remove_route(app, path: str, method: str):
    method = method.upper()
    try:
        app.router.routes = [
            route for route in app.router.routes
            if not (
                getattr(route, "path", "") == path
                and method in set(getattr(route, "methods", set()) or set())
            )
        ]
    except Exception:
        pass


def normal_record_type(value: str) -> str:
    raw = lower(value).replace("-", "_").replace(" ", "_")
    aliases = {
        "jobs": "job", "clients": "client", "customer": "client", "customers": "client",
        "quotes": "quote", "invoices": "invoice", "workers": "worker", "staff": "worker",
        "team": "worker", "messages": "message", "notification": "message",
        "approved_notification": "message", "action": "approval", "command": "approval",
        "support": "support_ticket", "ticket": "support_ticket", "tickets": "support_ticket",
    }
    return aliases.get(raw, raw)


async def request_json(request) -> Dict[str, Any]:
    try:
        value = await request.json()
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


async def current_user_or_response(module, request):
    JSONResponse = module.JSONResponse
    try:
        user = await module.get_current_user(request)
    except Exception:
        return None, JSONResponse({"success": False, "detail": "Not authenticated"}, status_code=401)
    if not isinstance(user, dict):
        return None, JSONResponse({"success": False, "detail": "Not authenticated"}, status_code=401)
    return user, None


async def find_first(db, collections: Iterable[str], query: Dict[str, Any]) -> Tuple[str, Dict[str, Any] | None]:
    for name in collections:
        try:
            row = await db[name].find_one(query)
            if row:
                return name, row
        except Exception:
            continue
    return "", None


def clean_payload(payload: Dict[str, Any], *, remove_identity: bool = False) -> Dict[str, Any]:
    out = dict(payload or {})
    out.pop("_id", None)
    if remove_identity:
        out.pop("id", None)
    for key in OWNERSHIP_KEYS:
        out.pop(key, None)
    return out


async def secure_owner_data(module, request, path: str, method: str):
    JSONResponse = module.JSONResponse
    ObjectId = module.ObjectId
    db = module.db
    user, error = await current_user_or_response(module, request)
    if error:
        return error
    if not is_owner(user):
        return JSONResponse({"success": False, "detail": "Owner access required"}, status_code=403)

    for kind, (collection_name, id_fields) in OWNER_DATA.items():
        base = f"/api/{kind}"
        if path == base and method == "GET":
            rows = await db[collection_name].find(strict_business_query(user, ObjectId)).sort("created_at", -1).limit(500).to_list(length=500)
            items = [safe(row) for row in rows]
            return JSONResponse({"success": True, kind: items, "items": items, "data": items})
        if path == base and method == "POST":
            payload = clean_payload(await request_json(request), remove_identity=True)
            payload["business_id"] = business_id(user)
            payload["owner_id"] = user_id(user)
            payload["created_at"] = now_utc()
            payload["updated_at"] = now_utc()
            result = await db[collection_name].insert_one(payload)
            row = await db[collection_name].find_one({"_id": result.inserted_id})
            return JSONResponse({"success": True, "record": safe(row), kind[:-1]: safe(row), "data": safe(row)})
        prefix = f"{base}/"
        if path.startswith(prefix) and method in {"PATCH", "PUT"}:
            remainder = path[len(prefix):]
            record_id = remainder.split("/", 1)[0]
            if not record_id or "/" in remainder and not remainder.endswith("/field-update"):
                continue
            payload = clean_payload(await request_json(request))
            payload["updated_at"] = now_utc()
            query = strict_record_query(user, ObjectId, record_id, id_fields)
            result = await db[collection_name].update_one(query, {"$set": payload})
            if not getattr(result, "matched_count", 0):
                return JSONResponse({"success": False, "detail": "Record not found"}, status_code=404)
            row = await db[collection_name].find_one(query)
            return JSONResponse({"success": True, "record": safe(row), "data": safe(row)})
    return None


async def secure_team(module, request, path: str, method: str):
    if method != "GET" or path not in {"/api/team", "/api/team/workers", "/api/workers"}:
        return None
    JSONResponse = module.JSONResponse
    ObjectId = module.ObjectId
    user, error = await current_user_or_response(module, request)
    if error:
        return error
    if not is_owner(user):
        return JSONResponse({"success": False, "detail": "Owner access required"}, status_code=403)
    scope = strict_business_query(user, ObjectId)
    role_filter = {"role": {"$in": ["worker", "staff", "employee", "subcontractor", "contractor", "field_worker", "payroll"]}}
    query = {"$and": [scope, role_filter]}
    rows: List[Dict[str, Any]] = []
    for collection in ("workers", "team_workers", "team_members", "users"):
        try:
            found = await module.db[collection].find(query).sort("created_at", -1).limit(500).to_list(length=500)
            rows.extend(found)
        except Exception:
            continue
    seen = set()
    items = []
    for row in rows:
        key = text(row.get("_id") or row.get("id") or row.get("worker_id") or row.get("email"))
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        items.append(safe(row))
    return JSONResponse({"success": True, "workers": items, "team": items, "items": items, "data": items})


async def secure_messages(module, request, path: str, method: str):
    paths = {"/api/messages", "/api/command/actions", "/api/command/approvals", "/api/ai/actions"}
    if method != "GET" or path not in paths:
        return None
    JSONResponse = module.JSONResponse
    ObjectId = module.ObjectId
    user, error = await current_user_or_response(module, request)
    if error:
        return error
    if not is_owner(user):
        return JSONResponse({"success": False, "detail": "Owner access required"}, status_code=403)
    query = strict_business_query(user, ObjectId)
    rows: List[Dict[str, Any]] = []
    for collection in ("messages", "notifications", "approved_notifications", "worker_messages", "worker_field_slips", "ai_approval_actions"):
        try:
            found = await module.db[collection].find(query).sort("created_at", -1).limit(150).to_list(length=150)
            rows.extend(found)
        except Exception:
            continue
    rows.sort(key=lambda row: text(row.get("created_at")), reverse=True)
    items = [safe(row) for row in rows[:200]]
    if path == "/api/messages":
        return JSONResponse({"success": True, "messages": items, "items": items, "data": items})
    actions = [
        {
            "id": item.get("id") or item.get("source_id") or item.get("title"),
            "type": item.get("type") or item.get("kind") or "Owner check",
            "title": item.get("title") or item.get("summary") or item.get("message") or "Owner check",
            "summary": item.get("summary") or item.get("message") or "Review this update.",
            "status": item.get("status") or "waiting",
            "record": item,
        }
        for item in items[:100]
    ]
    return JSONResponse({"success": True, "actions": actions, "items": actions, "data": actions})


async def secure_delete(module, request, record_type: str, record_id: str):
    JSONResponse = module.JSONResponse
    ObjectId = module.ObjectId
    user, error = await current_user_or_response(module, request)
    if error:
        return error
    if not is_owner(user):
        return JSONResponse({"success": False, "detail": "Owner access required"}, status_code=403)
    target = RECORD_TARGETS.get(normal_record_type(record_type))
    if not target:
        return JSONResponse({"success": False, "detail": "Unknown record type"}, status_code=404)
    collections, fields = target
    query = strict_record_query(user, ObjectId, record_id, fields)
    collection_name, row = await find_first(module.db, collections, query)
    if not row:
        return JSONResponse({"success": False, "detail": "Record not found"}, status_code=404)
    if normal_record_type(record_type) == "worker" and role_of(row) not in {"worker", "staff", "employee", "subcontractor", "contractor", "field_worker", "payroll"}:
        return JSONResponse({"success": False, "detail": "Worker not found"}, status_code=404)
    result = await module.db[collection_name].delete_one({"_id": row.get("_id"), **({"business_id": row.get("business_id")} if row.get("business_id") is not None else {})})
    if not getattr(result, "deleted_count", 0):
        return JSONResponse({"success": False, "detail": "Record not found"}, status_code=404)
    return JSONResponse({"success": True, "deleted": 1, "record_type": normal_record_type(record_type), "record_id": record_id})


async def secure_message_reply(module, request, record_id: str):
    JSONResponse = module.JSONResponse
    ObjectId = module.ObjectId
    user, error = await current_user_or_response(module, request)
    if error:
        return error
    if not is_owner(user):
        return JSONResponse({"success": False, "detail": "Owner access required"}, status_code=403)
    body = await request_json(request)
    reply_text = text(body.get("reply") or body.get("message") or body.get("body"), 6000)
    if not reply_text:
        return JSONResponse({"success": False, "detail": "Reply message is required"}, status_code=400)
    collections, fields = RECORD_TARGETS["message"]
    query = strict_record_query(user, ObjectId, record_id, fields)
    original_collection, original = await find_first(module.db, collections, query)
    if not original:
        return JSONResponse({"success": False, "detail": "Message not found"}, status_code=404)
    now = now_utc()
    bid = business_id(user)
    doc = {
        "business_id": bid,
        "owner_id": user_id(user),
        "message_id": record_id,
        "thread_id": text(body.get("thread_id") or original.get("thread_id") or original.get("conversation_id") or record_id),
        "conversation_id": text(body.get("conversation_id") or original.get("conversation_id") or original.get("thread_id") or record_id),
        "reply": reply_text,
        "body": reply_text,
        "direction": "owner_to_recipient",
        "channel": text(body.get("channel") or original.get("channel") or "Inside Churvox"),
        "status": "sent_inside_churvox",
        "original_collection": original_collection,
        "original_subject": text(original.get("subject") or original.get("title") or body.get("subject")),
        "to": text(body.get("to") or original.get("from") or original.get("sender") or "recipient"),
        "created_at": now,
        "updated_at": now,
        "source": "tenant_isolation_security",
    }
    result = await module.db.message_replies.insert_one(doc)
    await module.db[original_collection].update_one(query, {"$set": {"last_reply": reply_text, "last_reply_at": now, "replied": True, "read": True, "is_read": True, "status": "replied"}})
    return JSONResponse({"success": True, "reply": safe({**doc, "_id": result.inserted_id})})


async def secure_quote_action(module, request, quote_id: str, action: str):
    JSONResponse = module.JSONResponse
    ObjectId = module.ObjectId
    user, error = await current_user_or_response(module, request)
    if error:
        return error
    if not is_owner(user):
        return JSONResponse({"success": False, "detail": "Owner access required"}, status_code=403)
    collections, fields = RECORD_TARGETS["quote"]
    query = strict_record_query(user, ObjectId, quote_id, fields)
    collection_name, quote = await find_first(module.db, collections, query)
    if not quote:
        return JSONResponse({"success": False, "detail": "Quote not found"}, status_code=404)
    now = now_utc()
    if action == "accept":
        update = {"status": "Accepted", "quote_status": "accepted", "accepted_at": now, "updated_at": now, "accepted_by_owner": True, "owner_approved": True}
        await module.db[collection_name].update_one(query, {"$set": update})
        return JSONResponse({"success": True, "status": "accepted", "quote": safe({**quote, **update})})

    status = lower(quote.get("status") or quote.get("quote_status"))
    if status not in {"accepted", "converted"}:
        return JSONResponse({"success": False, "detail": "Accept the quote before converting it to a job"}, status_code=409)
    source_id = text(quote.get("quote_id") or quote.get("id") or quote.get("_id") or quote_id)
    existing = await module.db.jobs.find_one({"$and": [strict_business_query(user, ObjectId), {"$or": [{"source_quote_id": source_id}, {"quote_id": source_id}, {"converted_from_quote_id": source_id}]}]})
    if existing:
        return JSONResponse({"success": True, "status": "converted", "idempotent": True, "job": safe(existing), "job_id": text(existing.get("_id") or existing.get("id"))})
    amount = quote.get("amount") or quote.get("total") or quote.get("price") or 0
    job = {
        "business_id": business_id(user),
        "owner_id": user_id(user),
        "title": text(quote.get("job_title") or quote.get("title") or quote.get("quote_title") or quote.get("service") or quote.get("description") or f"Job from quote {quote_id}"),
        "client_id": quote.get("client_id") or quote.get("customer_id") or "",
        "customer_id": quote.get("customer_id") or quote.get("client_id") or "",
        "client_name": text(quote.get("client_name") or quote.get("customer_name") or quote.get("client") or quote.get("customer") or "No client selected"),
        "customer_name": text(quote.get("customer_name") or quote.get("client_name") or quote.get("customer") or quote.get("client") or "No client selected"),
        "customer_email": text(quote.get("customer_email") or quote.get("client_email")),
        "address": quote.get("address") or quote.get("site_address") or quote.get("service_address") or "",
        "job_type": quote.get("job_type") or quote.get("service") or quote.get("trade_type") or "other",
        "description": quote.get("scope") or quote.get("description") or quote.get("notes") or "",
        "notes": quote.get("notes") or quote.get("scope") or "",
        "price": amount,
        "amount": amount,
        "pricing_type": quote.get("pricing_type") or quote.get("billing") or "fixed",
        "status": "assigned",
        "job_status": "assigned",
        "workflow_status": "assigned",
        "scheduled_date": quote.get("scheduled_date") or quote.get("service_date") or quote.get("date") or "",
        "scheduled_time": quote.get("scheduled_time") or quote.get("service_time") or quote.get("time") or "",
        "source_quote_id": source_id,
        "quote_id": source_id,
        "created_from_quote": True,
        "conversion_source": "tenant_isolation_security",
        "created_at": now,
        "updated_at": now,
    }
    inserted = await module.db.jobs.insert_one(job)
    job_id = text(inserted.inserted_id)
    quote_update = {"status": "Converted", "quote_status": "converted", "converted": True, "converted_at": now, "converted_job_id": job_id, "linked_job_id": job_id, "job_id": job_id, "updated_at": now}
    await module.db[collection_name].update_one(query, {"$set": quote_update})
    return JSONResponse({"success": True, "status": "converted", "quote_id": source_id, "job_id": job_id, "job": safe({**job, "_id": inserted.inserted_id})})


async def secure_job_assignment(module, request, job_id: str):
    JSONResponse = module.JSONResponse
    ObjectId = module.ObjectId
    user, error = await current_user_or_response(module, request)
    if error:
        return error
    if not is_owner(user):
        return JSONResponse({"success": False, "detail": "Owner access required"}, status_code=403)
    payload = await request_json(request)
    job_query = strict_record_query(user, ObjectId, job_id, RECORD_TARGETS["job"][1])
    job_collection, job = await find_first(module.db, RECORD_TARGETS["job"][0], job_query)
    if not job:
        return JSONResponse({"success": False, "detail": "Job not found"}, status_code=404)
    worker_id = text(payload.get("assigned_worker_id") or payload.get("worker_id") or payload.get("team_member_id"))
    worker_email = lower(payload.get("worker_email") or payload.get("assigned_worker_email"))
    identity_parts: List[Dict[str, Any]] = []
    if worker_id:
        identity_parts.append(identity_query(worker_id, ObjectId, RECORD_TARGETS["worker"][1]))
    if worker_email:
        identity_parts.append({"$or": [{"email": worker_email}, {"user_email": worker_email}, {"worker_email": worker_email}, {"login_email": worker_email}]})
    if not identity_parts:
        return JSONResponse({"success": False, "detail": "A worker is required for assignment"}, status_code=400)
    worker_query = {"$and": [strict_business_query(user, ObjectId), {"$or": identity_parts}]}
    worker_collection, worker = await find_first(module.db, RECORD_TARGETS["worker"][0], worker_query)
    if not worker or role_of(worker) not in {"worker", "staff", "employee", "subcontractor", "contractor", "field_worker"}:
        return JSONResponse({"success": False, "detail": "Worker not found in this business team"}, status_code=404)
    wid = text(worker.get("worker_id") or worker.get("id") or worker.get("_id") or worker.get("user_id"))
    wname = text(worker.get("name") or worker.get("full_name") or worker.get("worker_name") or worker.get("email") or "Worker")
    wemail = lower(worker.get("email") or worker.get("user_email") or worker.get("worker_email"))
    now = now_utc()
    update = {
        "assigned_worker_id": wid,
        "worker_id": wid,
        "assigned_to": wid,
        "assigned_worker_name": wname,
        "worker_name": wname,
        "assigned_worker_email": wemail,
        "worker_email": wemail,
        "status": lower(payload.get("status") or "assigned"),
        "job_status": lower(payload.get("status") or "assigned"),
        "workflow_status": lower(payload.get("status") or "assigned"),
        "assigned_at": now,
        "updated_at": now,
        "assignment_source": "tenant_isolation_security",
    }
    await module.db[job_collection].update_one(job_query, {"$set": update})
    return JSONResponse({"success": True, "job": safe({**job, **update}), "worker": safe(worker)})


def assigned_to_user(job: Dict[str, Any], user: Dict[str, Any]) -> bool:
    ids = {text(user.get(key)) for key in ("id", "_id", "worker_id", "staff_id", "team_member_id", "user_id") if text(user.get(key))}
    email = lower(user.get("email"))
    for key in ("assigned_worker_id", "worker_id", "assigned_to", "assigned_user_id", "staff_id", "team_member_id"):
        value = text(job.get(key))
        if value in ids or (email and lower(value) == email):
            return True
    for key in ("assigned_worker_email", "worker_email", "assigned_to_email", "staff_email"):
        if email and lower(job.get(key)) == email:
            return True
    return False


async def secure_proof_pack(module, request):
    JSONResponse = module.JSONResponse
    ObjectId = module.ObjectId
    user, error = await current_user_or_response(module, request)
    if error:
        return error
    job_id = text(request.query_params.get("job_id") or request.query_params.get("id"))
    if not job_id:
        return JSONResponse({"success": True, "job_id": "", "proof_pack": [], "items": []})
    job_query = strict_record_query(user, ObjectId, job_id, RECORD_TARGETS["job"][1])
    _collection, job = await find_first(module.db, RECORD_TARGETS["job"][0], job_query)
    if not job:
        return JSONResponse({"success": False, "detail": "Job not found"}, status_code=404)
    if not is_owner(user) and not assigned_to_user(job, user):
        return JSONResponse({"success": False, "detail": "Job not found"}, status_code=404)
    pack_query = {"$and": [strict_business_query(user, ObjectId), {"$or": [{"job_id": job_id}, {"source_job_id": job_id}, {"record_id": job_id}]}]}
    rows: List[Dict[str, Any]] = []
    for collection in ("job_proof_packs", "proof_packs", "worker_proof_files"):
        try:
            found = await module.db[collection].find(pack_query).sort("updated_at", -1).limit(50).to_list(length=50)
            rows.extend(found)
        except Exception:
            continue
    items = [safe(row) for row in rows]
    return JSONResponse({"success": True, "job_id": job_id, "proof_pack": items, "items": items})


def parse_sensitive_path(path: str, method: str):
    parts = [part for part in text(path).split("/") if part]
    method = method.upper()
    if method == "DELETE":
        if len(parts) == 4 and parts[:2] == ["api", "records"]:
            return ("delete", normal_record_type(parts[2]), parts[3])
        if len(parts) == 3 and parts[0] == "api":
            direct = {"jobs": "job", "clients": "client", "quotes": "quote", "invoices": "invoice", "workers": "worker"}.get(parts[1])
            if direct:
                return ("delete", direct, parts[2])
    if method == "POST":
        if len(parts) == 5 and parts[:2] == ["api", "records"] and parts[4] == "reply":
            return ("reply", normal_record_type(parts[2]), parts[3])
        if len(parts) == 4 and parts[0] == "api" and parts[1] in {"messages", "approved-notifications"} and parts[3] == "reply":
            return ("reply", "message", parts[2])
        if len(parts) == 4 and parts[:2] == ["api", "quotes"] and parts[3] in {"accept", "convert", "convert-to-job"}:
            return (parts[3], "quote", parts[2])
        if len(parts) == 4 and parts[:2] == ["api", "jobs"] and parts[3] == "assign":
            return ("assign", "job", parts[2])
    return None


async def secure_sms_phone(module, job: Dict[str, Any]):
    if not isinstance(job, dict):
        return None
    get_phone = getattr(module, "get_phone_from_dict", lambda _value: None)
    phone = get_phone(job)
    if phone:
        return phone
    for key in ("client", "customer"):
        nested = job.get(key)
        phone = get_phone(nested)
        if phone:
            return phone
    bid = text(job.get("business_id") or job.get("businessId") or job.get("owner_business_id") or job.get("contractor_id"))
    if not bid:
        return None
    ObjectId = module.ObjectId
    fake_user = {"business_id": bid, "id": bid}
    scope = strict_business_query(fake_user, ObjectId)
    client_id = job.get("client_id") or job.get("customer_id")
    if client_id:
        query = {"$and": [scope, identity_query(text(client_id), ObjectId, ("id", "client_id", "customer_id", "record_id"))]}
        client = await module.db.clients.find_one(query)
        phone = get_phone(client)
        if phone:
            return phone
    client_name = job.get("client_name") or job.get("customer_name")
    if client_name:
        query = {"$and": [scope, {"$or": [{"name": client_name}, {"business_name": client_name}, {"company_name": client_name}, {"client_name": client_name}]}]}
        client = await module.db.clients.find_one(query)
        phone = get_phone(client)
        if phone:
            return phone
    return None


def harden_payment_module(legacy_module):
    try:
        payments = importlib.import_module("churvox_on_site_payments_patch")
    except Exception:
        try:
            payments = importlib.import_module("backend.churvox_on_site_payments_patch")
        except Exception:
            return

    async def secure_find_owner(db, user, ObjectId):
        uid = user_id(user)
        bid = business_id(user)
        if uid:
            for value in variants(ObjectId, uid):
                try:
                    row = await db.users.find_one({"_id": value})
                    if row and business_id(row) == bid:
                        return row
                except Exception:
                    continue
        query = {"$and": [strict_business_query(user, ObjectId), {"role": {"$in": list(OWNER_ROLES)}}]}
        try:
            row = await db.users.find_one(query)
            if row:
                return row
        except Exception:
            pass
        return user

    async def secure_payment_account(db, user, ObjectId):
        bid = business_id(user)
        settings = None
        if bid:
            try:
                settings = await db.payment_settings.find_one({"business_id": bid})
            except Exception:
                settings = None
        owner = await secure_find_owner(db, user, ObjectId)
        account_id = text((settings or {}).get("stripe_account_id") or (owner or {}).get("stripe_account_id") or (owner or {}).get("stripe_connected_account_id"))
        return settings or {}, owner or {}, account_id

    payments.find_owner = secure_find_owner
    payments.payment_account = secure_payment_account
    payments.first_existing_connected_account = lambda _stripe: ""
    for name in ("churvox_terminal_reader_patch", "backend.churvox_terminal_reader_patch"):
        terminal = sys.modules.get(name)
        if terminal is not None:
            terminal.payment_account = secure_payment_account


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    JSONResponse = getattr(module, "JSONResponse", None)
    Response = getattr(module, "Response", None)
    if any(value is None for value in (app, db, get_current_user, ObjectId, JSONResponse, Response)):
        return
    if getattr(app.state, "churvox_tenant_isolation_security", "") == VERSION:
        return

    # Patch shared helpers used by already-registered routes.
    module.resolve_job_sms_phone = lambda job: secure_sms_phone(module, job)
    harden_payment_module(module)

    @app.middleware("http")
    async def churvox_tenant_isolation_guard(request, call_next):
        path = request.url.path.rstrip("/") or "/"
        method = request.method.upper()
        origin = text(request.headers.get("origin")).rstrip("/")

        if path.startswith("/api") and origin and not origin_allowed(origin):
            return JSONResponse({"success": False, "detail": "Origin not allowed"}, status_code=403)
        if path.startswith("/api") and method == "OPTIONS" and origin_allowed(origin):
            return apply_cors(Response(status_code=204), request)

        owner_response = await secure_owner_data(module, request, path, method)
        if owner_response is not None:
            return apply_cors(owner_response, request)
        team_response = await secure_team(module, request, path, method)
        if team_response is not None:
            return apply_cors(team_response, request)
        message_response = await secure_messages(module, request, path, method)
        if message_response is not None:
            return apply_cors(message_response, request)

        parsed = parse_sensitive_path(path, method)
        if parsed:
            action, record_type, record_id = parsed
            if action == "delete":
                response = await secure_delete(module, request, record_type, record_id)
            elif action == "reply" and record_type == "message":
                response = await secure_message_reply(module, request, record_id)
            elif action in {"accept", "convert", "convert-to-job"}:
                response = await secure_quote_action(module, request, record_id, "accept" if action == "accept" else "convert")
            elif action == "assign":
                response = await secure_job_assignment(module, request, record_id)
            else:
                response = JSONResponse({"success": False, "detail": "Record action not allowed"}, status_code=405)
            return apply_cors(response, request)

        if path == "/api/jobs/proof-pack" and method == "GET":
            return apply_cors(await secure_proof_pack(module, request), request)

        if (
            path == "/api/admin/owner/delete-account"
            or path.startswith("/api/admin/owner/accounts/")
            or path.startswith("/api/admin/owner/support-tickets/")
        ) and method in {"POST", "PATCH", "DELETE"}:
            user, error = await current_user_or_response(module, request)
            if error:
                return apply_cors(error, request)
            if not is_platform_owner(user, getattr(module, "is_platform_owner", None)):
                return apply_cors(JSONResponse({"success": False, "detail": "Platform owner access required"}, status_code=403), request)

        response = await call_next(request)
        if path.startswith("/api"):
            response.headers.setdefault("Cache-Control", "no-store")
            response = apply_cors(response, request)
        return response

    app.state.churvox_tenant_isolation_security = VERSION


__all__ = [
    "VERSION", "install", "strict_business_query", "strict_record_query",
    "origin_allowed", "is_platform_owner", "secure_sms_phone", "harden_payment_module",
]
