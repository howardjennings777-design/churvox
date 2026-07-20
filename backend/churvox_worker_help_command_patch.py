from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import importlib
import importlib.abc
import importlib.machinery
import sys

from starlette.requests import Request as StarletteRequest


VERSION = "churvox-worker-help-command-20260720b"
TARGETS = {"server", "backend.server"}
PARTICIPANT_ROLES = {
    "employer", "admin", "owner", "business_owner", "manager", "office_admin",
    "worker", "staff", "employee", "subcontractor", "contractor", "technician", "field_worker",
}
WORKER_ROLES = {"worker", "staff", "employee", "subcontractor", "contractor", "technician", "field_worker"}


def text(value, limit=600):
    return " ".join(str(value or "").strip().split())[:limit]


def lower(value):
    return text(value).lower()


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
        output = {}
        for key, item in value.items():
            if key in {"password", "password_hash", "hashed_password", "token", "access_token", "refresh_token"}:
                continue
            output["id" if key == "_id" else key] = safe(item)
        return output
    return value


def business_id(user):
    return text(
        (user or {}).get("business_id")
        or (user or {}).get("businessId")
        or (user or {}).get("owner_business_id")
        or (user or {}).get("id")
        or (user or {}).get("_id")
    )


def remove_route(app, path, method):
    method = method.upper()
    app.router.routes = [
        route
        for route in app.router.routes
        if not (
            getattr(route, "path", "") == path
            and method in set(getattr(route, "methods", set()) or set())
        )
    ]


def promote_route(app, path, method):
    method = method.upper()
    preferred = [
        route
        for route in app.router.routes
        if getattr(route, "path", "") == path
        and method in set(getattr(route, "methods", set()) or set())
    ]
    if preferred:
        app.router.routes = preferred + [route for route in app.router.routes if route not in preferred]


def deterministic_object_id(ObjectId, business, request_id, scope):
    digest = hashlib.sha256(f"{scope}:{business}:{request_id}".encode("utf-8")).hexdigest()[:24]
    return ObjectId(digest)


def worker_context(user, payload):
    return {
        "worker_id": text(payload.get("worker_id") or (user or {}).get("id") or (user or {}).get("_id"), 120),
        "worker_name": text(payload.get("worker_name") or (user or {}).get("name") or (user or {}).get("full_name") or (user or {}).get("email"), 160),
        "worker_email": text(payload.get("worker_email") or (user or {}).get("email"), 200),
    }


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_current_user or ObjectId is None or HTTPException is None:
        return

    async def worker_contact_office(request: StarletteRequest):
        user = await get_current_user(request)
        role = lower((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type"))
        if role not in WORKER_ROLES:
            raise HTTPException(status_code=403, detail="Worker access required")

        try:
            payload = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="A JSON worker message is required")
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Worker message must be an object")

        message = text(payload.get("message") or payload.get("update") or payload.get("note"))
        if not message:
            raise HTTPException(status_code=400, detail="Worker message is required")

        business = business_id(user)
        if not business:
            raise HTTPException(status_code=400, detail="Business id is missing")

        now = datetime.now(timezone.utc)
        request_id = text(payload.get("request_id") or payload.get("source_id"), 180)
        if not request_id:
            request_id = f"worker-help-{text((user or {}).get('id') or (user or {}).get('_id'), 80)}-{int(now.timestamp() * 1000)}"
        context = worker_context(user, payload)
        job_id = text(payload.get("job_id") or payload.get("jobId"), 120)
        job = None
        job_oid = None
        job_title = text(payload.get("job_title") or payload.get("title"), 200) or "General help request"

        if job_id:
            try:
                job_oid = ObjectId(job_id)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid job id")
            job = await db.jobs.find_one({"_id": job_oid})
            if not job:
                raise HTTPException(status_code=404, detail="Assigned job not found")
            if text(job.get("assigned_worker_id") or job.get("worker_id")) not in {"", context["worker_id"]}:
                raise HTTPException(status_code=404, detail="Assigned job not found")
            job_business = text(job.get("business_id") or job.get("contractor_id"))
            if job_business and job_business != business:
                raise HTTPException(status_code=404, detail="Assigned job not found")
            job_title = text(job.get("title") or job.get("job_name") or job.get("job_title"), 200) or job_title

        event = {
            "request_id": request_id,
            "type": "worker_message",
            "message": message,
            "body": message,
            **context,
            "created_at": now,
            "read": False,
            "is_read": False,
        }

        if job_oid:
            push_result = await db.jobs.update_one(
                {"_id": job_oid, "worker_messages.request_id": {"$ne": request_id}},
                {
                    "$set": {
                        "worker_message": message,
                        "last_worker_message": message,
                        "worker_message_preview": message,
                        "worker_message_at": now,
                        "last_worker_message_at": now,
                        "worker_message_unread": True,
                        "owner_unread_worker_message": True,
                        "worker_needs_owner_attention": True,
                        "updated_at": now,
                    },
                    "$push": {"worker_messages": event, "owner_visible_messages": event},
                },
            )
            if not getattr(push_result, "matched_count", 0):
                await db.jobs.update_one({"_id": job_oid}, {"$set": {
                    "worker_message_unread": True,
                    "owner_unread_worker_message": True,
                    "worker_needs_owner_attention": True,
                    "updated_at": now,
                }})

        notification_id = deterministic_object_id(ObjectId, business, request_id, "office-notification")
        owner_id = text((job or {}).get("created_by") or (job or {}).get("contractor_id") or (job or {}).get("business_id") or business, 120)
        notification = {
            "_id": notification_id,
            "request_id": request_id,
            "type": "worker_message",
            "source": "worker_office_contact",
            "title": f"Message from {context['worker_name'] or 'worker'}",
            "message": f"{context['worker_name'] or 'Worker'}: {message}",
            "body": message,
            "summary": message,
            "job_id": str(job_oid) if job_oid else "",
            "job_title": job_title,
            **context,
            "business_id": business,
            "user_id": owner_id,
            "owner_id": owner_id,
            "read": False,
            "is_read": False,
            "status": "unread",
            "route": "/dashboard#worker",
            "url": "/dashboard#worker",
            "href": "/dashboard#worker",
            "created_at": now,
            "updated_at": now,
            "route_version": VERSION,
        }

        existing_notification = await db.notifications.find_one({"_id": notification_id})
        if existing_notification:
            notification = existing_notification
            idempotent = True
        else:
            try:
                await db.notifications.insert_one(notification)
                idempotent = False
            except Exception:
                existing_notification = await db.notifications.find_one({"_id": notification_id})
                if not existing_notification:
                    raise
                notification = existing_notification
                idempotent = True

        return {
            "success": True,
            "idempotent": idempotent,
            "request_id": request_id,
            "job_id": str(job_oid) if job_oid else "",
            "worker_message": message,
            "notification": safe(notification),
            "route_version": VERSION,
            "message": "Message saved for the office.",
        }

    async def worker_update_request(request: StarletteRequest):
        user = await get_current_user(request)
        role = lower((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type"))
        if role not in PARTICIPANT_ROLES and not (user or {}).get("is_admin"):
            raise HTTPException(status_code=403, detail="Business user access required")

        business = business_id(user)
        if not business:
            raise HTTPException(status_code=400, detail="Business id is missing")

        try:
            payload = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="A JSON worker update is required")
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Worker update must be an object")

        update_text = text(payload.get("update") or payload.get("message") or payload.get("note"))
        if not update_text:
            raise HTTPException(status_code=400, detail="Worker update message is required")

        now = datetime.now(timezone.utc)
        request_id = text(payload.get("request_id") or payload.get("source_id"), 180)
        if not request_id:
            request_id = f"worker-update-{text((user or {}).get('id') or (user or {}).get('_id'), 80)}-{int(now.timestamp() * 1000)}"
        slip_id = deterministic_object_id(ObjectId, business, request_id, "command-slip")

        existing = await db.command_slips.find_one({"_id": slip_id})
        if existing:
            return {
                "success": True,
                "idempotent": True,
                "slip": safe(existing),
                "route_version": VERSION,
                "message": "Worker update was already waiting in Command.",
                "safety": "Owner review required. Nothing was sent, synced, charged or changed.",
            }

        context = worker_context(user, payload)
        job_id = text(payload.get("job_id"), 120)
        job_title = text(payload.get("job_title") or payload.get("title"), 200) or "Worker help request"
        update_type = text(payload.get("update_type") or payload.get("type"), 120) or "worker_help_request"
        urgency = text(payload.get("status") or payload.get("urgency"), 80) or "Top priority"

        row = {
            "_id": slip_id,
            "business_id": business,
            "owner_id": business,
            "source_type": "worker_update",
            "source_id": request_id,
            "request_id": request_id,
            "action_type": "review_worker_update",
            "title": f"Worker needs help: {job_title}" if update_type == "worker_help_request" else f"Worker update: {job_title}",
            "found": f"{context['worker_name'] or 'A worker'} sent an update for {job_title}: {update_text}",
            "prepared": "Churvox placed the worker update in Command for owner review. Nothing was sent, synced, charged or changed.",
            "why": "The owner needs the field update before deciding what happens next.",
            "urgency": urgency,
            "status": "pending",
            "payload": {
                "request_id": request_id,
                "message": update_text,
                "update": update_text,
                "update_type": update_type,
                "job_id": job_id,
                "job_title": job_title,
                **context,
                "prepared_only": True,
                "owner_review_only": True,
                "no_auto_send": True,
                "no_auto_sync": True,
                "no_auto_charge": True,
                "no_auto_record_change": True,
            },
            "requested_by_worker": role in WORKER_ROLES,
            "worker_user_id": context["worker_id"],
            **context,
            "job_id": job_id,
            "job_title": job_title,
            "prepared_only": True,
            "owner_review_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            "created_by": context["worker_id"] or context["worker_email"],
            "created_at": now,
            "updated_at": now,
            "route_version": VERSION,
            "audit": [{
                "by": context["worker_id"] or context["worker_email"],
                "role": role or "worker",
                "action": "worker_update_created",
                "note": "Worker update prepared for owner review only",
                "at": now,
            }],
        }

        try:
            await db.command_slips.insert_one(row)
            idempotent = False
        except Exception:
            existing = await db.command_slips.find_one({"_id": slip_id})
            if not existing:
                raise
            row = existing
            idempotent = True

        return {
            "success": True,
            "idempotent": idempotent,
            "slip": safe(row),
            "route_version": VERSION,
            "message": "Worker update sent to Command. Nothing was sent, synced, charged or changed.",
            "safety": "Owner review required. Nothing was sent, synced, charged or changed.",
        }

    routes = [
        ("/api/worker/contact-office", worker_contact_office),
        ("/api/command/worker-update-request", worker_update_request),
    ]
    for path, endpoint in routes:
        remove_route(app, path, "POST")
        app.add_api_route(path, endpoint, methods=["POST"])
        promote_route(app, path, "POST")


class Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
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
