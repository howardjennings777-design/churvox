from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

try:
    import churvox_approval_execution_patch as approval_execution
except Exception:  # pragma: no cover
    approval_execution = None

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def json_safe(value):
    if approval_execution is not None:
        try:
            return approval_execution.json_safe(value)
        except Exception:
            pass
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


async def read_payload(request):
    try:
        data = await request.json()
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def business_id(user):
    if approval_execution is not None:
        try:
            return approval_execution.business_id(user)
        except Exception:
            pass
    return clean(user.get("business_id") or user.get("owner_business_id") or user.get("contractor_id") or user.get("id") or user.get("_id"))


def user_id(user):
    if approval_execution is not None:
        try:
            return approval_execution.user_id(user)
        except Exception:
            pass
    return clean(user.get("id") or user.get("_id") or user.get("email"))


def action_from_payload(payload):
    return clean(payload.get("action") or payload.get("decision") or payload.get("owner_action") or "approve").lower()


def item_from_payload(payload, action_id):
    item = payload.get("item") if isinstance(payload.get("item"), dict) else {}
    if not item:
        item = dict(payload)
    fields = item.get("fields") if isinstance(item.get("fields"), dict) else {}
    cleaned_fields = {clean(k): v for k, v in fields.items() if clean(k)}
    item = {**item, "fields": cleaned_fields}
    item.setdefault("id", action_id)
    item.setdefault("source_id", action_id)
    item.setdefault("kind", clean(payload.get("kind") or item.get("kind") or item.get("type") or "command_record"))
    item.setdefault("safe_source", "command_approval_tolerant_routes")
    return item


async def record_decision(db, user, action_id, action, item, status="updated"):
    doc = {
        "business_id": business_id(user),
        "user_id": user_id(user),
        "action_id": clean(action_id),
        "decision": action,
        "status": status,
        "source": "command_approval_tolerant_routes",
        "item": json_safe(item),
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        await db.command_decisions.insert_one(dict(doc))
    except Exception:
        pass
    try:
        await db.command_audit_trail.insert_one(dict(doc))
    except Exception:
        pass
    return doc


async def execute_or_record(db, user, ObjectId, action_id, payload):
    payload = payload or {}
    action = action_from_payload(payload)
    item = item_from_payload(payload, action_id)

    if action in {"edit", "save", "save edit", "save_edit", "park", "parking", "hold"}:
        status = "parked" if action in {"park", "parking", "hold"} else "edited"
        doc = await record_decision(db, user, action_id, action, item, status=status)
        try:
            await db.ai_approval_actions.update_one(
                {"business_id": business_id(user), "$or": [{"id": clean(action_id)}, {"action_id": clean(action_id)}, {"source_id": clean(action_id)}]},
                {"$set": {"status": status, "owner_action": action, "fields": item.get("fields") or {}, "updated_at": now_utc()}},
            )
        except Exception:
            pass
        return {"success": True, "kind": "command_record", "status": status, "message": "Command slip saved.", "decision": json_safe(doc)}

    if approval_execution is not None and hasattr(approval_execution, "execute_approval"):
        return await approval_execution.execute_approval(db, user, ObjectId, action_id, {**payload, "action": action, "kind": item.get("kind") or "command_record", "item": item})

    doc = await record_decision(db, user, action_id, action, item, status="approved")
    return {"success": True, "kind": "command_record", "status": "approved", "message": "Command slip approved.", "decision": json_safe(doc)}


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="POST"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    if not app or db is None or not get_current_user or ObjectId is None or Request is None:
        return

    async def execute_endpoint(request: Request):
        user = await get_current_user(request)
        payload = await read_payload(request)
        action_id = clean(payload.get("action_id") or payload.get("id") or payload.get("source_id") or (payload.get("item") or {}).get("id") or f"approval-{int(now_utc().timestamp() * 1000)}")
        return json_safe(await execute_or_record(db, user, ObjectId, action_id, payload))

    async def execute_by_id_endpoint(request: Request, action_id: str):
        user = await get_current_user(request)
        payload = await read_payload(request)
        payload.setdefault("action_id", action_id)
        return json_safe(await execute_or_record(db, user, ObjectId, action_id, payload))

    remove_route(app, "/api/command/execute-approved", "POST")
    remove_route(app, "/api/command/approvals/{action_id}/execute", "POST")
    app.add_api_route("/api/command/execute-approved", execute_endpoint, methods=["POST"])
    app.add_api_route("/api/command/approvals/{action_id}/execute", execute_by_id_endpoint, methods=["POST"])
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
