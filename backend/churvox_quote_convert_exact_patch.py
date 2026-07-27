from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys
from typing import Any, Dict, Iterable, List

from fastapi.responses import JSONResponse

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
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
QUOTE_COLLECTIONS = ("quotes", "quote_records")


def now_utc():
    return datetime.now(timezone.utc)


def text(value: Any) -> str:
    try:
        return str(value or "").strip()
    except Exception:
        return ""


def lower(value: Any) -> str:
    return text(value).lower()


def safe(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
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


def first(*values: Any):
    for value in values:
        if value not in (None, ""):
            return value
    return ""


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


def id_variants(raw: Any, ObjectId) -> List[Any]:
    value = text(raw)
    if not value:
        return []
    variants: List[Any] = [value]
    try:
        if ObjectId.is_valid(value):
            variants.append(ObjectId(value))
    except Exception:
        try:
            variants.append(ObjectId(value))
        except Exception:
            pass
    unique = []
    for item in variants:
        if item not in unique:
            unique.append(item)
    return unique


def id_query(raw: Any, ObjectId, fields: Iterable[str]) -> Dict[str, Any]:
    variants = id_variants(raw, ObjectId)
    clauses = []
    for value in variants:
        clauses.append({"_id": value})
        for field in fields:
            clauses.append({field: value})
    return {"$or": clauses} if clauses else {"_id": "__missing__"}


def ownership_query(user: Dict[str, Any]) -> Dict[str, Any]:
    business_id = user_value(user, "business_id", "company_id", "tenant_id", "owner_business_id", "contractor_id")
    user_id = user_value(user, "id", "_id", "user_id")
    email = lower(user_value(user, "email", "user_email", "owner_email"))
    clauses: List[Dict[str, Any]] = []
    if business_id:
        clauses.extend([
            {"business_id": business_id},
            {"company_id": business_id},
            {"tenant_id": business_id},
            {"owner_business_id": business_id},
            {"contractor_id": business_id},
            {"business.id": business_id},
        ])
    allowed_emails = PLATFORM_OWNER_EMAILS if email in PLATFORM_OWNER_EMAILS else ({email} if email else set())
    for allowed_email in allowed_emails:
        clauses.extend([
            {"user_email": allowed_email},
            {"owner_email": allowed_email},
            {"created_by_email": allowed_email},
            {"email": allowed_email},
        ])
    if user_id:
        clauses.extend([
            {"user_id": user_id},
            {"owner_id": user_id},
            {"created_by": user_id},
        ])
    return {"$or": clauses} if clauses else {"_id": "__unauthorised__"}


def combined_query(record_id: str, user: Dict[str, Any], ObjectId) -> Dict[str, Any]:
    return {
        "$and": [
            id_query(record_id, ObjectId, ["id", "quote_id", "record_id", "uuid"]),
            ownership_query(user),
        ]
    }


def route_id(path: str) -> str:
    parts = [part for part in text(path).split("/") if part]
    if len(parts) != 4 or parts[0] != "api" or parts[1] != "quotes":
        return ""
    if parts[3] not in {"convert", "convert-to-job"}:
        return ""
    return parts[2]


def cors_origin(request) -> str:
    origin = request.headers.get("origin") or ""
    if origin in ALLOWED_ORIGINS:
        return origin
    if origin.endswith(".onrender.com") or origin.endswith(".vercel.app"):
        return origin
    return "https://www.churvox.com"


def add_cors(response, request):
    response.headers["Access-Control-Allow-Origin"] = cors_origin(request)
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers") or "Authorization,Content-Type,Accept,X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "86400"
    response.headers["Vary"] = "Origin"
    return response


def status_of(quote: Dict[str, Any]) -> str:
    return lower(first(quote.get("status"), quote.get("quote_status"), quote.get("state")))


def quote_job_payload(quote: Dict[str, Any], user: Dict[str, Any], quote_id: str) -> Dict[str, Any]:
    now = now_utc()
    business_id = text(first(
        quote.get("business_id"),
        quote.get("company_id"),
        quote.get("tenant_id"),
        quote.get("owner_business_id"),
        quote.get("contractor_id"),
        user_value(user, "business_id", "company_id", "tenant_id", "owner_business_id", "contractor_id"),
        user_value(user, "id", "_id", "user_id"),
    ))
    user_id = text(first(quote.get("user_id"), quote.get("owner_id"), quote.get("created_by"), user_value(user, "id", "_id", "user_id")))
    owner_email = lower(first(quote.get("owner_email"), quote.get("user_email"), user_value(user, "email", "user_email", "owner_email")))
    client_name = text(first(quote.get("client_name"), quote.get("customer_name"), quote.get("client"), quote.get("customer"), "No client selected"))
    title = text(first(quote.get("job_title"), quote.get("title"), quote.get("quote_title"), quote.get("service"), quote.get("description"), f"Job from quote {quote_id}"))
    amount = first(quote.get("amount"), quote.get("total"), quote.get("price"), quote.get("quote_total"), 0)
    scope = text(first(quote.get("scope"), quote.get("description"), quote.get("notes"), quote.get("line_item")))
    scheduled_date = first(quote.get("scheduled_date"), quote.get("service_date"), quote.get("date"), "")
    scheduled_time = first(quote.get("scheduled_time"), quote.get("service_time"), quote.get("time"), "")
    quote_source_id = text(first(quote.get("quote_id"), quote.get("id"), quote.get("_id"), quote_id))
    return {
        "business_id": business_id,
        "user_id": user_id,
        "owner_id": user_id,
        "owner_email": owner_email,
        "user_email": owner_email,
        "title": title,
        "job_title": title,
        "client_id": first(quote.get("client_id"), quote.get("customer_id"), ""),
        "customer_id": first(quote.get("customer_id"), quote.get("client_id"), ""),
        "client_name": client_name,
        "customer_name": client_name,
        "customer_email": first(quote.get("customer_email"), quote.get("client_email"), quote.get("email"), ""),
        "client_email": first(quote.get("client_email"), quote.get("customer_email"), quote.get("email"), ""),
        "address": first(quote.get("address"), quote.get("site_address"), quote.get("service_address"), ""),
        "site_address": first(quote.get("site_address"), quote.get("address"), quote.get("service_address"), ""),
        "service": first(quote.get("service"), quote.get("job_type"), quote.get("trade_type"), "other"),
        "job_type": first(quote.get("job_type"), quote.get("service"), quote.get("trade_type"), "other"),
        "scope": scope,
        "description": scope,
        "notes": scope,
        "price": amount,
        "amount": amount,
        "total": amount,
        "billing": first(quote.get("billing"), quote.get("pricing_type"), "fixed"),
        "pricing_type": first(quote.get("pricing_type"), quote.get("billing"), "fixed"),
        "status": "assigned",
        "job_status": "assigned",
        "workflow_status": "assigned",
        "scheduled_date": scheduled_date,
        "scheduled_time": scheduled_time,
        "assigned_worker_id": first(quote.get("assigned_worker_id"), quote.get("worker_id"), ""),
        "assigned_worker_name": first(quote.get("assigned_worker_name"), quote.get("worker_name"), quote.get("worker"), "Unassigned"),
        "source_quote_id": quote_source_id,
        "quote_id": quote_source_id,
        "created_from_quote": True,
        "conversion_source": "owner_quote_conversion",
        "created_at": now,
        "updated_at": now,
    }


async def find_quote(db, query):
    for collection_name in QUOTE_COLLECTIONS:
        try:
            quote = await db[collection_name].find_one(query)
            if quote:
                return collection_name, quote
        except Exception:
            continue
    return "", None


async def find_existing_job(db, quote: Dict[str, Any], quote_id: str, user: Dict[str, Any], ObjectId):
    linked = first(quote.get("converted_job_id"), quote.get("job_id"), quote.get("linked_job_id"))
    ownership = ownership_query(user)
    queries = []
    if linked:
        queries.append({"$and": [id_query(linked, ObjectId, ["id", "job_id", "record_id", "uuid"]), ownership]})
    quote_values = id_variants(first(quote.get("quote_id"), quote.get("id"), quote.get("_id"), quote_id), ObjectId)
    if quote_values:
        source_clauses = []
        for value in quote_values:
            for field in ["source_quote_id", "quote_id", "converted_from_quote_id"]:
                source_clauses.append({field: value})
        queries.append({"$and": [{"$or": source_clauses}, ownership]})
    for query in queries:
        try:
            job = await db.jobs.find_one(query)
            if job:
                return job
        except Exception:
            continue
    return None


async def convert_quote(db, user: Dict[str, Any], ObjectId, quote_id: str):
    query = combined_query(quote_id, user, ObjectId)
    collection_name, quote = await find_quote(db, query)
    if not quote:
        return {"success": False, "status": "not_found", "message": "No matching quote was found for this business."}, 404

    existing_job = await find_existing_job(db, quote, quote_id, user, ObjectId)
    if existing_job:
        return {
            "success": True,
            "status": "converted",
            "idempotent": True,
            "quote_id": text(first(quote.get("quote_id"), quote.get("id"), quote.get("_id"), quote_id)),
            "job_id": text(first(existing_job.get("job_id"), existing_job.get("id"), existing_job.get("_id"))),
            "quote": safe(quote),
            "job": safe(existing_job),
            "message": "Quote was already converted to this job.",
        }, 200

    if status_of(quote) not in {"accepted", "converted"}:
        return {
            "success": False,
            "status": "not_accepted",
            "quote_id": quote_id,
            "message": "Accept the quote before converting it to a job.",
        }, 409

    job_payload = quote_job_payload(quote, user, quote_id)
    inserted_id = None
    try:
        result = await db.jobs.insert_one(dict(job_payload))
        inserted_id = getattr(result, "inserted_id", None)
    except Exception as exc:
        return {"success": False, "status": "job_create_failed", "message": f"The job could not be created: {type(exc).__name__}"}, 500

    job_id = text(inserted_id)
    converted_at = now_utc()
    quote_update = {
        "status": "Converted",
        "quote_status": "converted",
        "converted": True,
        "converted_at": converted_at,
        "converted_job_id": job_id,
        "linked_job_id": job_id,
        "job_id": job_id,
        "updated_at": converted_at,
        "conversion_source": "owner_quote_conversion",
    }
    try:
        update_result = await db[collection_name].update_one({"_id": quote.get("_id")}, {"$set": quote_update})
        if int(getattr(update_result, "matched_count", 0) or 0) < 1:
            raise RuntimeError("quote_update_not_matched")
    except Exception as exc:
        if inserted_id is not None:
            try:
                await db.jobs.delete_one({"_id": inserted_id})
            except Exception:
                pass
        return {"success": False, "status": "quote_update_failed", "message": f"The quote could not be linked to the new job: {type(exc).__name__}"}, 500

    job = {**job_payload, "_id": inserted_id}
    updated_quote = {**quote, **quote_update}
    return {
        "success": True,
        "status": "converted",
        "idempotent": False,
        "quote_id": text(first(quote.get("quote_id"), quote.get("id"), quote.get("_id"), quote_id)),
        "job_id": job_id,
        "quote": safe(updated_quote),
        "job": safe(job),
        "message": "Quote converted to a job.",
    }, 200


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    ResponseClass = getattr(module, "JSONResponse", None) or JSONResponse
    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    async def current_user(request):
        try:
            user = await get_current_user(request)
        except Exception as exc:
            return None, ResponseClass({"success": False, "message": "Login required", "detail": text(exc)[:180]}, status_code=401)
        if not user:
            return None, ResponseClass({"success": False, "message": "Login required"}, status_code=401)
        return user, None

    @app.middleware("http")
    async def quote_convert_exact(request, call_next):
        quote_id = route_id(request.url.path)
        if not quote_id:
            return await call_next(request)
        if request.method.upper() == "OPTIONS":
            return add_cors(ResponseClass({"ok": True, "source": "churvox_quote_convert_exact"}), request)
        if request.method.upper() != "POST":
            return add_cors(ResponseClass({"success": False, "message": "Quote conversion requires POST."}, status_code=405), request)
        user, error = await current_user(request)
        if error:
            return add_cors(error, request)
        body, status_code = await convert_quote(db, user, ObjectId, quote_id)
        return add_cors(ResponseClass(body, status_code=status_code), request)

    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None

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
