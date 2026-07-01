from __future__ import annotations

from datetime import datetime, timezone
from fastapi import Body, Request, Response

WORKER_COLLECTIONS = ("users", "workers", "team", "team_members", "staff", "employees")
EMAIL_FIELDS = ("email", "user_email", "worker_email", "staff_email", "contact_email")
PASS_HASH_FIELDS = ("password_hash", "hashed_password", "passwordHash", "bcrypt_hash", "pass_hash")
PASS_TEXT_FIELDS = ("password", "plain_password", "temp_password", "temporary_password", "invite_password")
WORKER_ROLES = {"worker", "staff", "employee", "team_member", "team-member", "subcontractor", "contractor", "field_worker", "technician"}


def _text(value):
    if value is None:
        return ""
    if isinstance(value, dict):
        return _text(value.get("$oid") or value.get("id") or value.get("_id") or value.get("worker_id") or value.get("user_id") or value.get("email") or value.get("name"))
    return str(value or "").strip()


def _lower(value):
    return _text(value).lower()


def _safe(value):
    if isinstance(value, list):
        return [_safe(item) for item in value]
    if isinstance(value, dict):
        output = {}
        for key, item in value.items():
            key_text = str(key)
            if any(word in key_text.lower() for word in ("password", "hash", "secret", "token")):
                continue
            output["id" if key_text == "_id" else key_text] = _safe(item)
        return output
    if isinstance(value, datetime):
        return value.isoformat()
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def _remove_route(app, path, method):
    method = method.upper()
    try:
        app.router.routes = [
            route for route in app.router.routes
            if not (getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set()))
        ]
    except Exception:
        pass


def _role(doc):
    business = doc.get("business") if isinstance(doc.get("business"), dict) else {}
    raw = doc.get("role") or doc.get("user_role") or doc.get("worker_role") or doc.get("staff_role") or doc.get("type") or doc.get("account_type") or business.get("role") or ""
    return _lower(raw).replace(" ", "_")


def _is_worker_doc(doc):
    if not doc:
        return False
    role = _role(doc)
    return bool(role in WORKER_ROLES or doc.get("is_worker") is True or doc.get("worker_login") is True or doc.get("worker") is True or doc.get("worker_id") or doc.get("staff_id") or doc.get("team_member_id"))


def _business_id(doc):
    for key in ("business_id", "businessId", "owner_business_id", "owner_id", "contractor_id", "employer_id", "company_id", "parent_user_id", "created_by"):
        value = _text((doc or {}).get(key))
        if value:
            return value
    return ""


def _worker_id(doc):
    for key in ("worker_id", "team_member_id", "staff_id", "id", "_id", "user_id"):
        value = _text((doc or {}).get(key))
        if value:
            return value
    return ""


def _worker_name(doc):
    return _text(doc.get("name") or doc.get("full_name") or doc.get("worker_name") or doc.get("staff_name") or doc.get("display_name"))


def _verify_password(legacy, password, doc):
    bcrypt = getattr(legacy, "bcrypt", None)
    if not bcrypt:
        return False, None
    for field in PASS_HASH_FIELDS:
        stored = doc.get(field)
        if not isinstance(stored, str) or not stored.strip():
            continue
        try:
            if bcrypt.checkpw(str(password or "").encode("utf-8"), stored.encode("utf-8")):
                return True, stored
        except Exception:
            pass
    for field in PASS_TEXT_FIELDS:
        stored = doc.get(field)
        if isinstance(stored, str) and stored and stored == password:
            return True, None
    return False, None


async def _find_worker(db, email):
    try:
        user = await db.users.find_one({"email": email})
        if user and _is_worker_doc(user):
            return "users", user
    except Exception:
        pass
    for collection_name in WORKER_COLLECTIONS:
        collection = getattr(db, collection_name, None)
        if collection is None:
            continue
        for field in EMAIL_FIELDS:
            try:
                found = await collection.find_one({field: email})
            except Exception:
                found = None
            if found:
                return collection_name, found
    return None, None


def _worker_public_user(user, token):
    email = _lower(user.get("email"))
    user_id = _text(user.get("_id") or user.get("id"))
    public = {
        "id": user_id,
        "email": email,
        "name": _worker_name(user) or email.split("@")[0],
        "business_name": _text(user.get("business_name") or user.get("company") or "Worker account"),
        "business_id": _text(user.get("business_id") or user.get("businessId") or user.get("owner_id") or user.get("_id")),
        "role": "worker",
        "user_role": "worker",
        "worker_role": "worker",
        "is_worker": True,
        "worker": True,
        "worker_login": True,
        "worker_id": _worker_id(user) or user_id,
        "team_member_id": _text(user.get("team_member_id") or user.get("staff_id") or _worker_id(user) or user_id),
        "plan": user.get("plan") or "worker",
        "subscription_status": "worker",
        "has_app_access": True,
        "email_verified": True,
        "token": token,
    }
    return public


async def _sync_worker_user(legacy, source_collection, worker_doc, email, password, stored_hash):
    db = legacy.db
    existing = await db.users.find_one({"email": email})
    password_hash = stored_hash or legacy.hash_password(password)
    business_id = _business_id(worker_doc) or _business_id(existing or {})
    worker_id = _worker_id(worker_doc) or _worker_id(existing or {})
    update = {
        "email": email,
        "password_hash": password_hash,
        "name": _worker_name(worker_doc) or _worker_name(existing or {}) or email.split("@")[0],
        "business_name": _text(worker_doc.get("business_name") or worker_doc.get("company") or (existing or {}).get("business_name") or "Worker account"),
        "role": "worker",
        "user_role": "worker",
        "worker_role": "worker",
        "is_worker": True,
        "worker": True,
        "worker_login": True,
        "worker_id": worker_id,
        "team_member_id": _text(worker_doc.get("team_member_id") or worker_doc.get("staff_id") or worker_id),
        "status": "active",
        "email_verified": True,
        "has_app_access": True,
        "billing_lock_reason": None,
        "source_worker_collection": source_collection,
        "last_login_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    if business_id:
        update["business_id"] = str(business_id)
    if existing:
        await db.users.update_one({"_id": existing["_id"]}, {"$set": update})
        existing.update(update)
        return existing
    update["created_at"] = datetime.now(timezone.utc)
    result = await db.users.insert_one(update)
    update["_id"] = result.inserted_id
    return update


def _job_assigned(job, worker):
    ids = {_text(worker.get(k)) for k in ("id", "_id", "user_id", "worker_id", "staff_id", "team_member_id") if _text(worker.get(k))}
    email = _lower(worker.get("email"))
    names = {_lower(worker.get(k)) for k in ("name", "full_name", "worker_name", "staff_name") if _lower(worker.get(k))}
    values = []
    for key in ("assigned_worker_id", "worker_id", "assigned_to", "assignedWorkerId", "workerId", "staff_id", "team_member_id", "assigned_user_id", "worker", "assigned_worker", "worker_email", "assigned_worker_email", "assigned_to_email", "staff_email", "worker_name", "assigned_worker_name", "assigned_to_name", "staff_name"):
        values.append(_text(job.get(key)))
    if any(value and (value in ids or _lower(value) == email or _lower(value) in names) for value in values):
        return True
    for row in job.get("workers") or job.get("assigned_workers") or job.get("team") or []:
        if isinstance(row, dict):
            if _text(row.get("id") or row.get("_id") or row.get("worker_id") or row.get("user_id")) in ids:
                return True
            if _lower(row.get("email")) == email:
                return True
            if _lower(row.get("name") or row.get("full_name")) in names:
                return True
        else:
            value = _text(row)
            if value in ids or _lower(value) == email or _lower(value) in names:
                return True
    return False


async def _worker_jobs(legacy, worker):
    db = legacy.db
    ObjectId = getattr(legacy, "ObjectId", None)
    business_id = _text(worker.get("business_id") or worker.get("businessId"))
    email = _lower(worker.get("email"))
    queries = []
    if business_id:
        business_values = [business_id]
        if ObjectId:
            try:
                business_values.append(ObjectId(business_id))
            except Exception:
                pass
        queries.append({"$or": [{"business_id": {"$in": business_values}}, {"businessId": {"$in": business_values}}, {"owner_id": {"$in": business_values}}, {"contractor_id": {"$in": business_values}}]})
    if email:
        queries.append({"$or": [{"worker_email": email}, {"assigned_worker_email": email}, {"assigned_to_email": email}, {"staff_email": email}]})
    rows = []
    seen = set()
    for query in queries or [{}]:
        try:
            cursor = db.jobs.find(query).limit(500)
            async for job in cursor:
                job_id = _text(job.get("_id") or job.get("id") or job.get("job_id"))
                if not job_id or job_id in seen:
                    continue
                seen.add(job_id)
                status = _lower(job.get("status") or job.get("job_status") or job.get("workflow_status"))
                if any(word in status for word in ("archived", "deleted", "cancelled")):
                    continue
                if _job_assigned(job, worker):
                    rows.append(_safe(job))
        except Exception:
            pass
    return rows


def install(app, legacy):
    db = getattr(legacy, "db", None)
    required = [db, getattr(legacy, "bcrypt", None), getattr(legacy, "hash_password", None), getattr(legacy, "create_access_token", None), getattr(legacy, "create_refresh_token", None), getattr(legacy, "set_auth_cookies", None), getattr(legacy, "clear_auth_cookies", None), getattr(legacy, "get_current_user", None)]
    if any(item is None for item in required):
        return False

    async def worker_login(response: Response, payload: dict | None = Body(default=None)):
        payload = payload or {}
        email = _lower(payload.get("email"))
        password = _text(payload.get("password"))
        if not email or not password:
            response.status_code = 400
            return {"success": False, "detail": "Enter worker email and password."}
        legacy.clear_auth_cookies(response)
        collection_name, worker_doc = await _find_worker(db, email)
        if not worker_doc:
            response.status_code = 401
            return {"success": False, "detail": "Worker account not found."}
        ok, stored_hash = _verify_password(legacy, password, worker_doc)
        if not ok:
            response.status_code = 401
            return {"success": False, "detail": "Invalid worker email or password."}
        user = await _sync_worker_user(legacy, collection_name, worker_doc, email, password, stored_hash)
        token = legacy.create_access_token(str(user["_id"]), email)
        refresh = legacy.create_refresh_token(str(user["_id"]))
        legacy.set_auth_cookies(response, token, refresh)
        public = _worker_public_user(user, token)
        return {"success": True, **public, "user": public}

    async def worker_jobs(request: Request):
        user = await legacy.get_current_user(request)
        rows = await _worker_jobs(legacy, user)
        return {"success": True, "jobs": rows, "items": rows, "data": rows, "count": len(rows), "worker": _safe(user)}

    async def worker_debug(request: Request):
        user = await legacy.get_current_user(request)
        rows = await _worker_jobs(legacy, user)
        return {"success": True, "worker": _safe(user), "job_count": len(rows), "sample_jobs": rows[:5]}

    for path, method in (("/api/worker/auth/login", "POST"), ("/api/auth/worker-login", "POST"), ("/api/worker/jobs", "GET"), ("/api/worker/debug", "GET")):
        _remove_route(app, path, method)
    app.add_api_route("/api/worker/auth/login", worker_login, methods=["POST"])
    app.add_api_route("/api/auth/worker-login", worker_login, methods=["POST"])
    app.add_api_route("/api/worker/jobs", worker_jobs, methods=["GET"])
    app.add_api_route("/api/worker/debug", worker_debug, methods=["GET"])
    return True
