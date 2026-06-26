from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

PLAN_ALIASES = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
AI_ACTION_LIMITS = {"solo": 25, "team": 100, "pro": 500, "enterprise": 2000}
AI_ACTIONS_PER_COMMAND_GROWTH_PACK = 1000
TARGETS = {"server", "backend.server"}
INSTALLED = set()


def normal_plan(value):
    return PLAN_ALIASES.get(str(value or "solo").strip().lower(), "solo")


def month_start_utc():
    now = datetime.now(timezone.utc)
    return datetime(now.year, now.month, 1, tzinfo=timezone.utc)


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


def action_values(document, ObjectId):
    raw = document.get("business_id") or document.get("contractor_id") or document.get("owner_business_id") or document.get("user_id") or document.get("created_by")
    return values_from_raw(raw, ObjectId)


async def owner_for(database, values):
    if not values:
        return None
    owner = await database.users.find_one({"_id": {"$in": values}})
    if owner:
        return owner
    return await database.users.find_one({"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}})


async def ai_actions_this_month(database, values):
    if not values:
        return 0
    start = month_start_utc()
    return await database.ai_review_items.count_documents({
        "$or": [{"business_id": {"$in": values}}, {"contractor_id": {"$in": values}}, {"owner_business_id": {"$in": values}}],
        "$and": [{"$or": [{"created_at": {"$gte": start}}, {"createdAt": {"$gte": start}}, {"created": {"$gte": start}}]}],
        "status": {"$nin": ["deleted", "archived"]},
    })


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    if ObjectId is None or HTTPException is None:
        return
    try:
        from motor.motor_asyncio import AsyncIOMotorCollection
    except Exception:
        return

    original_insert_one = AsyncIOMotorCollection.insert_one
    if getattr(original_insert_one, "_churvox_ai_action_limit_wrapped", False):
        INSTALLED.add(name)
        return

    async def limit_checked_insert_one(self, document, *args, **kwargs):
        if getattr(self, "name", "") == "ai_review_items" and isinstance(document, dict):
            values = action_values(document, ObjectId)
            owner = await owner_for(self.database, values)
            plan = normal_plan((owner or {}).get("plan") or (owner or {}).get("ui_plan") or (owner or {}).get("subscription_plan") or document.get("plan") or "solo")
            max_actions = int(AI_ACTION_LIMITS.get(plan, AI_ACTION_LIMITS["solo"]) or 0)
            packs = int((owner or {}).get("extra_user_blocks", 0) or 0)
            if plan == "enterprise":
                max_actions += packs * AI_ACTIONS_PER_COMMAND_GROWTH_PACK
            used = await ai_actions_this_month(self.database, values)
            if used >= max_actions:
                raise HTTPException(status_code=403, detail=f"Monthly AI Operator Action limit reached ({used}/{max_actions} actions this month). Upgrade your plan or add a Command Growth Pack.")
        return await original_insert_one(self, document, *args, **kwargs)

    limit_checked_insert_one._churvox_ai_action_limit_wrapped = True
    AsyncIOMotorCollection.insert_one = limit_checked_insert_one
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
