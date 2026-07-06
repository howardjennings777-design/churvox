from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys
from fastapi import Request as FastAPIRequest

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def json_safe(value):
    if isinstance(value, dict):
        return {("id" if key == "_id" else key): json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def business_id(user):
    return clean(user.get("business_id") or user.get("owner_business_id") or user.get("contractor_id") or user.get("id") or user.get("_id"))


def user_id(user):
    return clean(user.get("id") or user.get("_id") or user.get("worker_id") or user.get("email"))


async def read_payload(request):
    try:
        return await request.json()
    except Exception:
        return {}


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def command_item_from_slip(slip):
    summary = clean(slip.get("summary") or slip.get("text") or slip.get("note") or "Worker message needs owner review.")
    return {
        "id": clean(slip.get("id")),
        "source": "worker-general-field-slip",
        "category": "Command",
        "action": "Approve, edit or park",
        "type": "Worker message",
        "title": "Worker message needs owner review",
        "summary": summary,
        "status": "waiting_owner_review",
        "prepared": "Churvox saved the worker message as a Command slip. Nothing is sent to a customer or accounting system without owner approval.",
        "requires_owner_approval": True,
        "auto_sent": False,
        "accounting_synced": False,
        "details": json_safe({"record_type": "worker_field_slip", "slip": slip}),
    }


async def create_general_slip(db, user, payload):
    now = now_utc()
    text = clean(
        (payload or {}).get("text")
        or (payload or {}).get("note")
        or (payload or {}).get("summary")
        or (payload or {}).get("message")
        or "Worker sent a field message."
    )
    slip_id = clean((payload or {}).get("id")) or f"general-field-slip-{int(now.timestamp() * 1000)}"
    doc = {
        "id": slip_id,
        "business_id": business_id(user),
        "job_id": clean((payload or {}).get("job_id") or (payload or {}).get("jobId") or ""),
        "worker_id": user_id(user),
        "worker_name": clean(user.get("name") or user.get("full_name") or user.get("email")),
        "type": clean((payload or {}).get("type") or (payload or {}).get("kind") or "worker_message"),
        "kind": clean((payload or {}).get("kind") or (payload or {}).get("type") or "worker_message"),
        "text": text,
        "note": text,
        "summary": text,
        "status": "waiting_owner_review",
        "source": clean((payload or {}).get("source") or "worker_general_message"),
        "requires_owner_approval": True,
        "owner_approved": False,
        "auto_sent": False,
        "accounting_synced": False,
        "created_at": now,
        "updated_at": now,
    }
    try:
        await db.worker_field_slips.update_one(
            {"business_id": doc["business_id"], "id": slip_id},
            {"$set": doc, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
    except Exception:
        pass
    try:
        await db.ai_operator_audit_log.insert_one({
            "business_id": doc["business_id"],
            "user_id": doc["worker_id"],
            "source": "worker_general_field_slip",
            "action": "field_slip_created",
            "summary": text,
            "slip_id": slip_id,
            "created_at": now,
        })
    except Exception:
        pass
    return doc


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    if not app or db is None or not get_current_user or Request is None:
        return

    async def general_worker_field_slip_endpoint(request: FastAPIRequest):
        user = await get_current_user(request)
        payload = await read_payload(request)
        slip = await create_general_slip(db, user, payload)
        item = command_item_from_slip(slip)
        return json_safe({"success": True, "slip": slip, "command_item": item, "item": item, "action": item})

    remove_route(app, "/api/worker/field-slip", "POST")
    app.add_api_route("/api/worker/field-slip", general_worker_field_slip_endpoint, methods=["POST"])
    INSTALLED.add(name)


class _Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
        install(module)


class _Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, _Loader):
            spec.loader = _Loader(spec.loader)
        return spec


if not any(isinstance(finder, _Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
