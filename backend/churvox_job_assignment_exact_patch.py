from __future__ import annotations

from datetime import datetime, timezone
import sys
from typing import Any, Dict, Iterable, List, Tuple

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
JOB_COLLECTIONS = ("jobs", "job_records", "business_jobs")
WORKER_COLLECTIONS = ("team_workers", "workers", "team", "staff", "users")


def now_utc():
    return datetime.now(timezone.utc)


def text(value: Any) -> str:
    try:
        if isinstance(value, dict):
            value = value.get("$oid") or value.get("id") or value.get("_id") or value.get("worker_id") or value.get("user_id") or value.get("email")
        return str(value or "").strip()
    except Exception:
        return ""


def lower(value: Any) -> str:
    return text(value).lower()


def first(*values: Any):
    for value in values:
        if value not in (None, ""):
            return value
    return ""


def user_value(user: Dict[str, Any], *keys: str) -> str:
    user = user or {}
    for key in keys:
        value = user.get(key)
        if value not in (None, ""):
            return text(value)
    business = user.get("business") or {}
    if isinstance(business, dict):
        for key in keys:
            value = business.get(key)
            if value not in (None, ""):
                return text(value)
    return ""


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
            if any(word in str(key).lower() for word in ("password", "token", "secret", "hash")):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    return value


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
    clauses = []
    for value in id_variants(raw, ObjectId):
        clauses.append({"_id": value})
        for field in fields:
            clauses.append({field: value})
    return {"$or": clauses} if clauses else {"_id": "__missing__"}


def owner_context(user: Dict[str, Any]) -> Tuple[str, str, str]:
    business_id = user_value(user, "business_id", "businessId", "company_id", "tenant_id", "owner_business_id", "contractor_id")
    owner_id = user_value(user, "id", "_id", "user_id", "owner_id")
    owner_email = lower(user_value(user, "email", "user_email", "owner_email", "login_email"))
    return business_id, owner_id, owner_email


def job_ownership_query(user: Dict[str, Any]) -> Dict[str, Any]:
    business_id, owner_id, owner_email = owner_context(user)
    clauses: List[Dict[str, Any]] = []
    for value in (business_id, owner_id):
        if not value:
            continue
        clauses.extend([
            {"business_id": value},
            {"businessId": value},
            {"company_id": value},
            {"tenant_id": value},
            {"owner_business_id": value},
            {"contractor_id": value},
            {"user_id": value},
            {"owner_id": value},
            {"created_by": value},
            {"business.id": value},
        ])
    allowed_emails = PLATFORM_OWNER_EMAILS if owner_email in PLATFORM_OWNER_EMAILS else ({owner_email} if owner_email else set())
    for email in allowed_emails:
        clauses.extend([
            {"owner_email": email},
            {"user_email": email},
            {"created_by_email": email},
            {"business_owner_email": email},
        ])
    return {"$or": clauses} if clauses else {"_id": "__unauthorised__"}


def worker_link_query(user: Dict[str, Any]) -> Dict[str, Any]:
    business_id, owner_id, owner_email = owner_context(user)
    if owner_email in PLATFORM_OWNER_EMAILS:
        return {}
    clauses: List[Dict[str, Any]] = []
    for value in (business_id, owner_id):
        if not value:
            continue
        clauses.extend([
            {"business_id": value},
            {"businessId": value},
            {"company_id": value},
            {"tenant_id": value},
            {"owner_business_id": value},
            {"contractor_id": value},
            {"owner_id": value},
            {"business_owner_id": value},
            {"created_by": value},
        ])
    if owner_email:
        clauses.extend([
            {"owner_email": owner_email},
            {"business_owner_email": owner_email},
            {"invited_by_email": owner_email},
            {"created_by_email": owner_email},
        ])
    return {"$or": clauses} if clauses else {"_id": "__not_linked__"}


def route_job_id(path: str) -> Tuple[str, str]:
    parts = [part for part in text(path).split("/") if part]
    if len(parts) == 3 and parts[0] == "api" and parts[1] == "jobs":
        return parts[2], "patch"
    if len(parts) == 4 and parts[0] == "api" and parts[1] == "jobs" and parts[3] == "assign":
        return parts[2], "assign"
    return "", ""


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
    response.headers["Access-Control-Allow-Methods"] = "PATCH,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers") or "Authorization,Content-Type,Accept,X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "86400"
    response.headers["Vary"] = "Origin"
    return response


def combined_worker_query(payload: Dict[str, Any], user: Dict[str, Any], ObjectId) -> Dict[str, Any]:
    worker_id = first(payload.get("assigned_worker_id"), payload.get("worker_id"), payload.get("assigned_to"), payload.get("team_member_id"))
    worker_email = lower(first(payload.get("worker_email"), payload.get("assigned_worker_email"), payload.get("assigned_to_email")))
    identity = []
    if worker_id:
        identity.append(id_query(worker_id, ObjectId, ("id", "worker_id", "user_id", "team_member_id", "staff_id", "record_id")))
    if worker_email:
        identity.append({"$or": [
            {"email": worker_email},
            {"user_email": worker_email},
            {"worker_email": worker_email},
            {"login_email": worker_email},
        ]})
    identity_query = {"$or": identity} if identity else {"_id": "__missing_worker__"}
    link = worker_link_query(user)
    return identity_query if not link else {"$and": [identity_query, link]}


async def find_worker(db, payload: Dict[str, Any], user: Dict[str, Any], ObjectId):
    query = combined_worker_query(payload, user, ObjectId)
    for collection_name in WORKER_COLLECTIONS:
        try:
            worker = await db[collection_name].find_one(query)
            if worker:
                return collection_name, worker
        except Exception:
            continue
    return "", None


async def find_job(db, job_id: str, user: Dict[str, Any], ObjectId):
    query = {
        "$and": [
            id_query(job_id, ObjectId, ("id", "job_id", "record_id", "uuid")),
            job_ownership_query(user),
        ]
    }
    for collection_name in JOB_COLLECTIONS:
        try:
            job = await db[collection_name].find_one(query)
            if job:
                return collection_name, job
        except Exception:
            continue
    return "", None


def assignment_update(payload: Dict[str, Any], worker: Dict[str, Any]) -> Dict[str, Any]:
    now = now_utc()
    worker_id = text(first(worker.get("worker_id"), worker.get("id"), worker.get("_id"), worker.get("user_id"), worker.get("team_member_id"), payload.get("assigned_worker_id"), payload.get("worker_id")))
    worker_email = lower(first(worker.get("email"), worker.get("user_email"), worker.get("worker_email"), payload.get("worker_email"), payload.get("assigned_worker_email")))
    worker_name = text(first(worker.get("name"), worker.get("full_name"), worker.get("worker_name"), worker.get("display_name"), payload.get("assigned_worker_name"), payload.get("worker_name"), worker_email))
    update = {
        "assigned_worker_id": worker_id,
        "worker_id": worker_id,
        "assigned_to": worker_id,
        "assigned_user_id": text(first(worker.get("user_id"), worker_id)),
        "assigned_worker_name": worker_name,
        "worker_name": worker_name,
        "assigned_worker_email": worker_email,
        "worker_email": worker_email,
        "status": text(payload.get("status") or "assigned").lower(),
        "job_status": text(payload.get("status") or "assigned").lower(),
        "workflow_status": text(payload.get("status") or "assigned").lower(),
        "assigned_at": now,
        "updated_at": now,
        "assignment_source": "owner_exact_job_assignment",
    }
    for key in ("scheduled_date", "scheduled_time", "worker_instructions", "notes", "instructions", "start_time", "end_time"):
        if payload.get(key) not in (None, ""):
            update[key] = payload.get(key)
    return update


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    JSONResponse = getattr(module, "JSONResponse", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or JSONResponse is None or ObjectId is None:
        return

    async def current_user_or_response(request):
        try:
            user = await get_current_user(request)
        except Exception as exc:
            return None, JSONResponse({"success": False, "message": "Login required", "detail": str(exc)[:180]}, status_code=401)
        if not user:
            return None, JSONResponse({"success": False, "message": "Login required"}, status_code=401)
        return user, None

    @app.middleware("http")
    async def exact_job_assignment(request, call_next):
        job_id, route_kind = route_job_id(request.url.path)
        method = request.method.upper()
        should_handle = bool(job_id) and ((route_kind == "patch" and method == "PATCH") or (route_kind == "assign" and method == "POST"))
        if job_id and method == "OPTIONS":
            return add_cors(JSONResponse({"ok": True, "source": "churvox_job_assignment_exact_patch"}), request)
        if not should_handle:
            return await call_next(request)

        user, error = await current_user_or_response(request)
        if error:
            return add_cors(error, request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}

        requested_worker = first(payload.get("assigned_worker_id"), payload.get("worker_id"), payload.get("worker_email"), payload.get("assigned_worker_email"))
        if not requested_worker:
            return add_cors(JSONResponse({"success": False, "message": "A worker is required for assignment."}, status_code=400), request)

        worker_collection, worker = await find_worker(db, payload, user, ObjectId)
        if not worker:
            return add_cors(JSONResponse({"success": False, "message": "Worker not found in this business team."}, status_code=404), request)

        job_collection, job = await find_job(db, job_id, user, ObjectId)
        if not job:
            return add_cors(JSONResponse({"success": False, "message": "Job not found for this business."}, status_code=404), request)

        update = assignment_update(payload, worker)
        try:
            result = await db[job_collection].update_one({"_id": job.get("_id")}, {"$set": update})
            matched = int(getattr(result, "matched_count", 0) or 0)
        except Exception as exc:
            return add_cors(JSONResponse({"success": False, "message": "Job assignment could not be saved.", "detail": str(exc)[:180]}, status_code=500), request)
        if not matched:
            return add_cors(JSONResponse({"success": False, "message": "Job assignment did not match a live job."}, status_code=409), request)

        assigned = {**job, **update}
        return add_cors(JSONResponse({
            "success": True,
            "job": safe(assigned),
            "record": safe(assigned),
            "worker": safe(worker),
            "job_id": job_id,
            "worker_collection": worker_collection,
            "job_collection": job_collection,
            "message": "Job assigned to worker.",
            "source": "churvox_job_assignment_exact_patch",
        }), request)

    INSTALLED.add(name)
