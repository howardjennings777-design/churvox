from __future__ import annotations

from datetime import datetime

from fastapi import Request

BUILD = "churvox-final-owner-messages-v17-20260714"
INSTALLED = set()
COLLECTIONS = ["notifications", "approved_notifications", "worker_messages", "worker_field_slips"]


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def user_id(user):
    return text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("user_id"))


def business_id(user):
    return text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or user_id(user))


def email(user):
    return lower((user or {}).get("email"))


def safe(value):
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
        result = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(word in lowered for word in ("password", "token", "secret", "hash", "content_base64")):
                continue
            result["id" if key == "_id" else key] = safe(item)
        return result
    return value


def scope(user, ObjectId):
    values = {user_id(user), business_id(user)}
    values = {value for value in values if value}
    expanded = list(values)
    for value in list(values):
        try:
            expanded.append(ObjectId(value))
        except Exception:
            pass
    mail = email(user)
    ors = [
        {"business_id": {"$in": expanded}},
        {"businessId": {"$in": expanded}},
        {"contractor_id": {"$in": expanded}},
        {"owner_business_id": {"$in": expanded}},
        {"owner_id": {"$in": expanded}},
        {"user_id": {"$in": expanded}},
        {"created_by": {"$in": expanded}},
        {"created_by_id": {"$in": expanded}},
        {"employer_id": {"$in": expanded}},
    ]
    if mail:
        ors.extend([{"owner_email": mail}, {"email": mail}, {"created_by_email": mail}])
    return {"$or": ors}


def remove_route(app, path, method):
    try:
        app.router.routes = [
            route for route in app.router.routes
            if not (
                getattr(route, "path", "") == path
                and method.upper() in set(getattr(route, "methods", set()) or set())
            )
        ]
    except Exception:
        pass


def event_key(row):
    row = row or {}
    kind = lower(row.get("type") or row.get("kind") or row.get("event_type") or row.get("action_type"))
    job_id = text(row.get("job_id") or row.get("source_id") or row.get("record_id"))
    title = lower(row.get("title") or row.get("subject"))
    if kind in {"job_complete", "job_completed"} or "finished the job" in title:
        return f"job_completion:{job_id or title}"
    body = lower(row.get("message") or row.get("body") or row.get("detail") or row.get("summary"))
    if job_id and kind and body:
        return f"{job_id}:{kind}:{body}"
    return text(row.get("id") or row.get("_id") or row.get("message_id") or row.get("notification_id") or f"{kind}:{title}:{body}")


def dedupe(rows):
    seen = set()
    result = []
    for row in rows:
        key = event_key(row)
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        result.append(row)
    return result


def install(module, force=False):
    name = getattr(module, "__name__", "") or f"module-{id(module)}"
    if name in INSTALLED and not force:
        return True
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if app is None or db is None or get_current_user is None or ObjectId is None:
        return False

    async def list_messages(request: Request):
        user = await get_current_user(request)
        rows = []
        raw_counts = {}
        query = scope(user, ObjectId)
        for collection_name in COLLECTIONS:
            count = 0
            try:
                cursor = getattr(db, collection_name).find(query).sort("created_at", -1).limit(160)
                async for raw in cursor:
                    rows.append(safe(raw))
                    count += 1
            except Exception:
                count = 0
            raw_counts[collection_name] = count
        rows = sorted(rows, key=lambda row: text(row.get("created_at")), reverse=True)
        rows = dedupe(rows)[:200]
        return {
            "success": True,
            "messages": rows,
            "items": rows,
            "data": rows,
            "dedupe_version": BUILD,
            "dedupe_strategy": "logical_job_event",
            "route_owner": "final_owner_messages_wrapper",
            "raw_counts": raw_counts,
        }

    async def readiness():
        return {
            "success": True,
            "ready": True,
            "version": BUILD,
            "route_owner": "final_owner_messages_wrapper",
            "strategy": "logical_job_event",
            "completion_key": "job_completion:job_id",
            "collections": COLLECTIONS,
        }

    remove_route(app, "/api/messages", "GET")
    remove_route(app, "/api/messages/readiness", "GET")
    app.add_api_route("/api/messages", list_messages, methods=["GET"])
    app.add_api_route("/api/messages/readiness", readiness, methods=["GET"])
    INSTALLED.add(name)
    return True
