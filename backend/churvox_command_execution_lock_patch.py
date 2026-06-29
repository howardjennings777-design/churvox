from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_logic_audit_idempotency_patch as idempotency
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


def json_safe(value):
    return logic_audit.json_safe(value)


async def read_payload(request):
    return await logic_audit.read_payload(request)


def action_key(user, action_id, item):
    raw = "|".join([
        business_id(user),
        clean(action_id),
        clean((item or {}).get("kind")),
        clean((item or {}).get("type")),
        clean((item or {}).get("title") or (item or {}).get("record")),
        clean((item or {}).get("client")),
        clean((item or {}).get("amount")),
    ])
    return hashlib.sha256(raw.encode("utf-8", errors="ignore")).hexdigest()


async def reserve_execution(db, user, key, action_id, item):
    doc = {
        "idempotency_key": key,
        "business_id": business_id(user),
        "action_id": clean(action_id),
        "status": "running",
        "item": json_safe(item or {}),
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        result = await db.command_execution_locks.update_one(
            {"business_id": business_id(user), "idempotency_key": key},
            {"$setOnInsert": doc},
            upsert=True,
        )
        if getattr(result, "upserted_id", None):
            return {"reserved": True, "lock": doc}
    except Exception:
        return {"reserved": True, "lock": doc, "lock_warning": "lock_write_failed"}
    try:
        existing = await db.command_execution_locks.find_one({"business_id": business_id(user), "idempotency_key": key})
    except Exception:
        existing = None
    return {"reserved": False, "lock": existing or doc}


async def complete_execution(db, user, key, status, result=None, error=None):
    try:
        await db.command_execution_locks.update_one(
            {"business_id": business_id(user), "idempotency_key": key},
            {"$set": {"status": status, "result": json_safe(result or {}), "error": clean(error), "updated_at": now_utc()}},
        )
    except Exception:
        pass


async def locked_manual_command_decision(db, user, ObjectId, payload):
    action = lower(payload.get("decision") or payload.get("action") or payload.get("owner_action") or "approve")
    item = payload.get("item") if isinstance(payload.get("item"), dict) else dict(payload)
    action_id = clean(payload.get("action_id") or item.get("id") or item.get("record") or item.get("title") or f"manual-command-{int(now_utc().timestamp() * 1000)}")
    if action not in {"approve", "approved", "send", "execute"}:
        return await logic_audit.manual_command_decision(db, user, ObjectId, payload)
    prior = await idempotency.existing_execution(db, user, action_id)
    if prior:
        return {"success": True, "duplicate_guard": True, "message": "Already approved. Churvox did not send it twice.", "decision": json_safe(prior)}
    item.setdefault("kind", logic_audit.infer_kind_from_payload(item))
    item.setdefault("source", "manual_command_button")
    key = action_key(user, action_id, item)
    reservation = await reserve_execution(db, user, key, action_id, item)
    if not reservation.get("reserved"):
        return {
            "success": True,
            "duplicate_guard": True,
            "message": "Approval is already running or already completed. Churvox did not send it twice.",
            "lock": json_safe(reservation.get("lock") or {}),
        }
    try:
        result = await approval_execution.execute_approval(db, user, ObjectId, action_id, {"action_id": action_id, "kind": item.get("kind"), "item": item})
        await complete_execution(db, user, key, "completed", result=result)
        try:
            await db.command_decisions.update_many(
                {"business_id": business_id(user), "action_id": action_id, "decision": "approved_and_executed"},
                {"$set": {"idempotency_key": key, "updated_at": now_utc()}},
            )
        except Exception:
            pass
        return result
    except Exception as exc:
        await complete_execution(db, user, key, "failed", error=str(exc))
        raise


idempotency.idempotent_manual_command_decision = locked_manual_command_decision
logic_audit.manual_command_decision = locked_manual_command_decision


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
        return json_safe(await locked_manual_command_decision(db, user, ObjectId, await read_payload(request)))

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
