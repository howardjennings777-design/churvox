from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_logic_audit_hardening_patch as logic_audit
import churvox_approval_execution_patch as approval_execution

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def business_id(user):
    return logic_audit.business_id(user)


def user_id(user):
    return logic_audit.user_id(user)


def json_safe(value):
    return logic_audit.json_safe(value)


async def read_payload(request):
    return await logic_audit.read_payload(request)


async def existing_execution(db, user, action_id):
    bid = business_id(user)
    query = {
        "business_id": bid,
        "action_id": clean(action_id),
        "decision": {"$in": ["approved_and_executed", "approved"]},
    }
    try:
        return await db.command_decisions.find_one(query, sort=[("created_at", -1)])
    except Exception:
        try:
            rows = await db.command_decisions.find(query).sort("created_at", -1).limit(1).to_list(length=1)
            return rows[0] if rows else None
        except Exception:
            return None


async def idempotent_manual_command_decision(db, user, ObjectId, payload):
    action = lower(payload.get("decision") or payload.get("action") or payload.get("owner_action") or "approve")
    item = payload.get("item") if isinstance(payload.get("item"), dict) else dict(payload)
    action_id = clean(payload.get("action_id") or item.get("id") or item.get("record") or item.get("title") or f"manual-command-{int(now_utc().timestamp() * 1000)}")
    if action in {"approve", "approved", "send", "execute"}:
        prior = await existing_execution(db, user, action_id)
        if prior:
            return {"success": True, "duplicate_guard": True, "message": "Already approved. Churvox did not send it twice.", "decision": json_safe(prior)}
        item.setdefault("kind", logic_audit.infer_kind_from_payload(item))
        item.setdefault("source", "manual_command_button")
        result = await approval_execution.execute_approval(db, user, ObjectId, action_id, {"action_id": action_id, "kind": item.get("kind"), "item": item})
        try:
            await db.command_decisions.update_many(
                {"business_id": business_id(user), "action_id": action_id, "decision": "approved_and_executed"},
                {"$set": {"idempotency_key": f"manual-command:{business_id(user)}:{action_id}", "updated_at": now_utc()}},
            )
        except Exception:
            pass
        return result
    return await logic_audit.manual_command_decision(db, user, ObjectId, payload)


logic_audit.manual_command_decision = idempotent_manual_command_decision


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
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

    async def command_manual_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await idempotent_manual_command_decision(db, user, ObjectId, await read_payload(request)))

    remove_route(app, "/api/command/manual-decision", "POST")
    app.add_api_route("/api/command/manual-decision", command_manual_endpoint, methods=["POST"])
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
