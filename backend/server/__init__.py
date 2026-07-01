from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys
from datetime import datetime, timezone
from fastapi import Body, Request, Response

backend_dir = Path(__file__).resolve().parents[1]
legacy_path = backend_dir / "server.py"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

spec = spec_from_file_location("churvox_legacy_server", legacy_path)
legacy = module_from_spec(spec)
sys.modules["churvox_legacy_server"] = legacy

source = legacy_path.read_text(encoding="utf-8")
source = source.replace(
    "app.include_router(api_router) moved to bottom after all routes",
    "# app.include_router(api_router) moved to bottom after all routes",
)
source = source.replace(
    "register_command_hub_routes(api_router, db, get_current_user, get_user_business_id)",
    "globals().get('register_command_hub_routes', lambda *args, **kwargs: None)(api_router, db, get_current_user, get_user_business_id)",
)

code = compile(source, str(legacy_path), "exec")
exec(code, legacy.__dict__)

app = getattr(legacy, "app", None)
if app is None:
    raise RuntimeError("Churvox backend boot failed: backend/server.py did not expose app")


def _cv_text(value):
    if value is None:
        return ""
    if isinstance(value, dict):
        return _cv_text(value.get("$oid") or value.get("id") or value.get("_id") or value.get("worker_id") or value.get("user_id") or value.get("email") or value.get("name"))
    return str(value or "").strip()


def _cv_lower(value):
    return _cv_text(value).lower()


def _cv_safe(value):
    if isinstance(value, list):
        return [_cv_safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            k = str(key)
            if any(word in k.lower() for word in ["password", "hash", "secret", "token"]):
                continue
            out["id" if k == "_id" else k] = _cv_safe(item)
        return out
    if isinstance(value, datetime):
        return value.isoformat()
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def _cv_route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def _cv_remove_route(path, method="POST"):
    try:
        app.router.routes = [route for route in app.router.routes if not _cv_route_matches(route, path, method)]
    except Exception:
        pass


def _cv_business_from(doc):
    for key in ["business_id", "businessId", "owner_business_id", "owner_id", "contractor_id", "employer_id", "company_id", "parent_user_id", "created_by"]:
        value = _cv_text((doc or {}).get(key))
        if value:
            return value
    return ""


def _cv_worker_id(doc):
    for key in ["worker_id", "team_member_id", "staff_id", "id", "_id", "user_id"]:
        value = _cv_text((doc or {}).get(key))
        if value:
            return value
    return ""


def _cv_check_password(password, doc):
    bcrypt = getattr(legacy, "bcrypt", None)
    if not bcrypt:
        return False, None
    for field in ["password_hash", "hashed_password", "passwordHash", "bcrypt_hash", "pass_hash"]:
        stored = (doc or {}).get(field)
        if not isinstance(stored, str) or not stored.strip():
            continue
        try:
            if bcrypt.checkpw(str(password or "").encode("utf-8"), stored.encode("utf-8")):
                return True, stored
        except Exception:
            pass
    for field in ["password", "plain_password", "temp_password", "temporary_password", "invite_password"]:
        stored = (doc or {}).get(field)
        if isinstance(stored, str) and stored and stored == password:
            return True, None
    return False, None


async def _cv_find_worker(email):
    db = getattr(legacy, "db", None)
    if db is None:
        return None, None
    try:
        existing = await db.users.find_one({"email": email})
        if existing and (_cv_lower(existing.get("role")) in {"worker", "staff", "employee", "team_member"} or existing.get("is_worker") is True or existing.get("worker_login") is True or existing.get("worker_id") or existing.get("team_member_id")):
            return "users", existing
    except Exception:
        pass
    for collection_name in ["workers", "team", "team_members", "staff", "employees", "users"]:
        collection = getattr(db, collection_name, None)
        if collection is None:
            continue
        for field in ["email", "user_email", "worker_email", "staff_email", "contact_email"]:
            try:
                doc = await collection.find_one({field: email})
            except Exception:
                doc = None
            if doc:
                return collection_name, doc
    return None, None


async def _cv_worker_jobs_for(user):
    db = getattr(legacy, "db", None)
    ObjectId = getattr(legacy, "ObjectId", None)
    if db is None:
        return []
    ids = {_cv_text(user.get(k)) for k in ["id", "_id", "user_id", "worker_id", "staff_id", "team_member_id"] if _cv_text(user.get(k))}
    email = _cv_lower(user.get("email"))
    names = {_cv_lower(user.get(k)) for k in ["name", "full_name", "worker_name", "staff_name"] if _cv_lower(user.get(k))}
    business_id = _cv_text(user.get("business_id") or user.get("businessId"))
    business_values = [business_id] if business_id else []
    if ObjectId and business_id:
        try:
            business_values.append(ObjectId(business_id))
        except Exception:
            pass
    queries = []
    if business_values:
        queries.append({"$or": [{"business_id": {"$in": business_values}}, {"businessId": {"$in": business_values}}, {"owner_id": {"$in": business_values}}, {"contractor_id": {"$in": business_values}}]})
    if email:
        queries.append({"$or": [{"worker_email": email}, {"assigned_worker_email": email}, {"assigned_to_email": email}, {"staff_email": email}]})
    rows = []
    seen = set()
    for query in queries or [{}]:
        try:
            cursor = db.jobs.find(query).limit(500)
            async for job in cursor:
                jid = _cv_text(job.get("_id") or job.get("id") or job.get("job_id"))
                if not jid or jid in seen:
                    continue
                seen.add(jid)
                status = _cv_lower(job.get("status") or job.get("job_status") or job.get("workflow_status"))
                if any(word in status for word in ["archived", "deleted", "cancelled"]):
                    continue
                values = []
                for key in ["assigned_worker_id", "worker_id", "assigned_to", "assignedWorkerId", "workerId", "staff_id", "team_member_id", "assigned_user_id", "worker", "assigned_worker", "worker_email", "assigned_worker_email", "assigned_to_email", "staff_email", "worker_name", "assigned_worker_name", "assigned_to_name", "staff_name"]:
                    values.append(_cv_text(job.get(key)))
                ok = any(v and (v in ids or _cv_lower(v) == email or _cv_lower(v) in names) for v in values)
                for row in job.get("workers") or job.get("assigned_workers") or job.get("team") or []:
                    if isinstance(row, dict):
                        if _cv_text(row.get("id") or row.get("_id") or row.get("worker_id") or row.get("user_id")) in ids or _cv_lower(row.get("email")) == email or _cv_lower(row.get("name") or row.get("full_name")) in names:
                            ok = True
                    else:
                        v = _cv_text(row)
                        if v in ids or _cv_lower(v) == email or _cv_lower(v) in names:
                            ok = True
                if ok:
                    rows.append(_cv_safe(job))
        except Exception:
            pass
    return rows


async def _cv_worker_login(payload: dict = Body(default={}), response: Response = None):
    db = getattr(legacy, "db", None)
    email = _cv_lower((payload or {}).get("email"))
    password = _cv_text((payload or {}).get("password"))
    if not email or not password:
        if response:
            response.status_code = 400
        return {"success": False, "detail": "Enter worker email and password."}
    clear = getattr(legacy, "clear_auth_cookies", None)
    if response and clear:
        clear(response)
    collection_name, worker_doc = await _cv_find_worker(email)
    if not worker_doc:
        if response:
            response.status_code = 401
        return {"success": False, "detail": "Worker account not found."}
    ok, stored_hash = _cv_check_password(password, worker_doc)
    if not ok:
        if response:
            response.status_code = 401
        return {"success": False, "detail": "Invalid worker email or password."}
    ObjectId = getattr(legacy, "ObjectId", None)
    create_access_token = getattr(legacy, "create_access_token", None)
    create_refresh_token = getattr(legacy, "create_refresh_token", None)
    set_auth_cookies = getattr(legacy, "set_auth_cookies", None)
    hash_password = getattr(legacy, "hash_password", None)
    if not all([db, ObjectId, create_access_token, create_refresh_token, set_auth_cookies, hash_password]):
        if response:
            response.status_code = 503
        return {"success": False, "detail": "Worker login service unavailable."}
    existing = await db.users.find_one({"email": email})
    password_hash = stored_hash or hash_password(password)
    business_id = _cv_business_from(worker_doc) or _cv_business_from(existing or {})
    worker_id = _cv_worker_id(worker_doc)
    update = {
        "email": email,
        "password_hash": password_hash,
        "name": _cv_text(worker_doc.get("name") or worker_doc.get("full_name") or worker_doc.get("worker_name") or worker_doc.get("staff_name") or email.split("@")[0]),
        "business_name": _cv_text(worker_doc.get("business_name") or worker_doc.get("company") or (existing or {}).get("business_name") or "Worker account"),
        "role": "worker",
        "user_role": "worker",
        "worker_role": "worker",
        "is_worker": True,
        "worker": True,
        "worker_login": True,
        "worker_id": worker_id,
        "team_member_id": _cv_text(worker_doc.get("team_member_id") or worker_doc.get("staff_id") or worker_id),
        "status": "active",
        "email_verified": True,
        "has_app_access": True,
        "billing_lock_reason": None,
        "source_worker_collection": collection_name,
        "last_login_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    if business_id:
        update["business_id"] = str(business_id)
    if existing:
        await db.users.update_one({"_id": existing["_id"]}, {"$set": update})
        existing.update(update)
        user = existing
    else:
        update["created_at"] = datetime.now(timezone.utc)
        result = await db.users.insert_one(update)
        update["_id"] = result.inserted_id
        user = update
    token = create_access_token(str(user["_id"]), email)
    refresh = create_refresh_token(str(user["_id"]))
    if response:
        set_auth_cookies(response, token, refresh)
    safe_user = {
        "id": str(user.get("_id") or user.get("id")),
        "email": email,
        "name": update.get("name") or "Worker",
        "business_name": update.get("business_name"),
        "business_id": str(user.get("business_id") or user.get("_id")),
        "role": "worker",
        "user_role": "worker",
        "worker_role": "worker",
        "is_worker": True,
        "worker": True,
        "worker_login": True,
        "worker_id": update.get("worker_id") or str(user.get("_id")),
        "team_member_id": update.get("team_member_id") or update.get("worker_id") or str(user.get("_id")),
        "plan": user.get("plan") or "worker",
        "subscription_status": "worker",
        "has_app_access": True,
        "email_verified": True,
        "token": token,
    }
    return {"success": True, **safe_user, "user": safe_user}


async def _cv_worker_jobs(request: Request):
    get_current_user = getattr(legacy, "get_current_user", None)
    if not get_current_user:
        return {"success": False, "detail": "Worker jobs unavailable."}
    user = await get_current_user(request)
    rows = await _cv_worker_jobs_for(user)
    return {"success": True, "jobs": rows, "items": rows, "data": rows, "count": len(rows), "worker": _cv_safe(user)}


async def _cv_worker_debug(request: Request):
    get_current_user = getattr(legacy, "get_current_user", None)
    user = await get_current_user(request) if get_current_user else {}
    rows = await _cv_worker_jobs_for(user)
    return {"success": True, "worker": _cv_safe(user), "job_count": len(rows), "sample_jobs": rows[:5]}


for path, method in [("/api/worker/auth/login", "POST"), ("/api/auth/worker-login", "POST"), ("/api/worker/jobs", "GET"), ("/api/worker/debug", "GET")]:
    _cv_remove_route(path, method)
app.add_api_route("/api/worker/auth/login", _cv_worker_login, methods=["POST"])
app.add_api_route("/api/auth/worker-login", _cv_worker_login, methods=["POST"])
app.add_api_route("/api/worker/jobs", _cv_worker_jobs, methods=["GET"])
app.add_api_route("/api/worker/debug", _cv_worker_debug, methods=["GET"])

try:
    app.router.on_startup.clear()
except Exception:
    pass
