from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

PLAN_ALIASES = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
WORKER_LIMITS = {"solo": 1, "team": 5, "pro": 15, "enterprise": 50}
CLIENT_LIMITS = {"solo": 250, "team": 1000, "pro": 3000, "enterprise": 10000}
WORKERS_PER_COMMAND_GROWTH_PACK = 50
TARGETS = {"server", "backend.server"}
INSTALLED = set()


def normal_plan(value):
    return PLAN_ALIASES.get(str(value or "solo").strip().lower(), "solo")


def values_from_raw(raw, ObjectId):
    values = []
    if raw is not None:
        values.append(str(raw))
        try:
            values.append(ObjectId(str(raw)))
        except Exception:
            pass
    out = []
    for value in values:
        if value not in out:
            out.append(value)
    return out


def business_values(user, ObjectId):
    return values_from_raw(user.get("business_id") or user.get("id") or user.get("_id"), ObjectId)


def document_business_values(document, ObjectId):
    return values_from_raw(document.get("contractor_id") or document.get("business_id") or document.get("owner_business_id") or document.get("user_id"), ObjectId)


async def owner_for(database, values):
    if not values:
        return None
    owner = await database.users.find_one({"_id": {"$in": values}})
    if owner:
        return owner
    return await database.users.find_one({"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}})


async def active_worker_count(database, values):
    if not values:
        return 0
    return await database.users.count_documents({
        "business_id": {"$in": values},
        "role": "worker",
        "active": {"$ne": False},
        "is_active": {"$ne": False},
        "status": {"$nin": ["inactive", "disabled", "paused", "removed", "archived"]},
    })


async def active_client_count(database, values):
    if not values:
        return 0
    return await database.clients.count_documents({
        "$or": [{"contractor_id": {"$in": values}}, {"business_id": {"$in": values}}, {"owner_business_id": {"$in": values}}],
        "archived": {"$ne": True},
        "is_archived": {"$ne": True},
        "deleted": {"$ne": True},
        "is_deleted": {"$ne": True},
    })


async def worker_capacity(database, user, ObjectId):
    values = business_values(user, ObjectId)
    owner = await owner_for(database, values) or user
    plan = normal_plan(owner.get("plan") or owner.get("ui_plan") or owner.get("subscription_plan") or user.get("plan") or "solo")
    max_workers = int(WORKER_LIMITS.get(plan, WORKER_LIMITS["solo"]) or 0)
    packs = int((owner or {}).get("extra_user_blocks", 0) or 0)
    if plan == "enterprise":
        max_workers += packs * WORKERS_PER_COMMAND_GROWTH_PACK
    used = await active_worker_count(database, values)
    return values, plan, max_workers, packs, used


async def assert_worker_slot(database, user, ObjectId, HTTPException):
    values, plan, max_workers, packs, used = await worker_capacity(database, user, ObjectId)
    if used >= max_workers:
        raise HTTPException(status_code=403, detail=f"Team limit reached ({used}/{max_workers} active workers). Upgrade your plan or add a Command Growth Pack before adding more workers.")
    return values, plan, max_workers, packs, used


async def assert_client_slot(database, document, ObjectId, HTTPException):
    values = document_business_values(document, ObjectId)
    owner = await owner_for(database, values)
    plan = normal_plan((owner or {}).get("plan") or (owner or {}).get("ui_plan") or (owner or {}).get("subscription_plan") or document.get("plan") or "solo")
    max_clients = int(CLIENT_LIMITS.get(plan, CLIENT_LIMITS["solo"]) or 0)
    used = await active_client_count(database, values)
    if used >= max_clients:
        raise HTTPException(status_code=403, detail=f"Client limit reached ({used}/{max_clients} clients). Upgrade your plan before adding more clients.")


def route_exists(app, path):
    try:
        return any(getattr(route, "path", "") == path for route in getattr(app, "routes", []))
    except Exception:
        return False


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    db = getattr(module, "db", None)
    app = getattr(module, "app", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    Request = getattr(module, "Request", None)
    if db is None or ObjectId is None or HTTPException is None:
        return

    async def locked_check_team_limits(user):
        values, _plan, _max_workers, _packs, _used = await assert_worker_slot(db, user, ObjectId, HTTPException)
        return values[0] if values else user.get("business_id") or user.get("id")

    module.check_team_limits = locked_check_team_limits

    original_invite = getattr(module, "create_invite_for_worker", None)
    if original_invite and not getattr(original_invite, "_churvox_team_limit_wrapped", False):
        async def limited_create_invite_for_worker(email, name, phone, user, biz_id):
            await assert_worker_slot(db, user, ObjectId, HTTPException)
            return await original_invite(email, name, phone, user, biz_id)
        limited_create_invite_for_worker._churvox_team_limit_wrapped = True
        module.create_invite_for_worker = limited_create_invite_for_worker

    try:
        from motor.motor_asyncio import AsyncIOMotorCollection
        original_insert_one = AsyncIOMotorCollection.insert_one
        if not getattr(original_insert_one, "_churvox_team_client_limit_wrapped", False):
            async def limited_insert_one(self, document, *args, **kwargs):
                name = getattr(self, "name", "")
                if isinstance(document, dict):
                    if name == "clients":
                        await assert_client_slot(self.database, document, ObjectId, HTTPException)
                    elif name == "users" and str(document.get("role") or "").lower() == "worker":
                        values = document_business_values(document, ObjectId)
                        owner = await owner_for(self.database, values)
                        if owner:
                            await assert_worker_slot(self.database, owner, ObjectId, HTTPException)
                return await original_insert_one(self, document, *args, **kwargs)
            limited_insert_one._churvox_team_client_limit_wrapped = True
            AsyncIOMotorCollection.insert_one = limited_insert_one
    except Exception:
        pass

    if app is not None and get_current_user is not None and Request is not None and not route_exists(app, "/api/team/limits"):
        async def team_limits_endpoint(request: Request):
            user = await get_current_user(request)
            _values, plan, max_workers, packs, used = await worker_capacity(db, user, ObjectId)
            return {"success": True, "plan": plan, "max_workers": max_workers, "usage": {"workers": used}, "extra_user_blocks": packs, "growth_packs": packs, "slots_left": max(0, max_workers - used), "updated_at": datetime.now(timezone.utc).isoformat()}
        app.add_api_route("/api/team/limits", team_limits_endpoint, methods=["GET"])

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
