from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import importlib
import importlib.abc
import importlib.machinery
import sys

from starlette.requests import Request as StarletteRequest


VERSION = "churvox-worker-help-command-20260720a"
TARGETS = {"server", "backend.server"}
PARTICIPANT_ROLES = {
    "employer", "admin", "owner", "business_owner", "manager", "office_admin",
    "worker", "staff", "employee", "subcontractor", "contractor", "technician", "field_worker",
}
OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed", "waiting_owner_review"]


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


def deterministic_object_id(ObjectId, business, request_id):
    digest = hashlib.sha256(f"{business}:{request_id}".encode("utf-8")).hexdigest()[:24]
    return ObjectId(digest)


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_current_user or ObjectId is None or HTTPException is None:
        return

    async def worker_update_request(request: StarletteRequest):
        user = await get_current_user(request)
        role = lower(
            (user or {}).get("role")
            or (user or {}).get("user_role")
            or (user or {}).get("account_type")
        )
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
        slip_id = deterministic_object_id(ObjectId, business, request_id)

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

        worker_id = text(payload.get("worker_id") or (user or {}).get("id") or (user or {}).get("_id"), 120)
        worker_name = text(payload.get("worker_name") or (user or {}).get("name") or (user or {}).get("full_name") or (user or {}).get("email"), 160)
        worker_email = text(payload.get("worker_email") or (user or {}).get("email"), 200)
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
            "found": f"{worker_name or 'A worker'} sent an update for {job_title}: {update_text}",
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
                "worker_id": worker_id,
                "worker_name": worker_name,
                "worker_email": worker_email,
                "prepared_only": True,
                "owner_review_only": True,
                "no_auto_send": True,
                "no_auto_sync": True,
                "no_auto_charge": True,
                "no_auto_record_change": True,
            },
            "requested_by_worker": role in {"worker", "staff", "employee", "subcontractor", "contractor", "technician", "field_worker"},
            "worker_user_id": worker_id,
            "worker_name": worker_name,
            "worker_email": worker_email,
            "job_id": job_id,
            "job_title": job_title,
            "prepared_only": True,
            "owner_review_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            "created_by": worker_id or worker_email,
            "created_at": now,
            "updated_at": now,
            "route_version": VERSION,
            "audit": [{
                "by": worker_id or worker_email,
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

    path = "/api/command/worker-update-request"
    remove_route(app, path, "POST")
    app.add_api_route(path, worker_update_request, methods=["POST"])
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
