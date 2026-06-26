from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

for _bridge_module in ["churvox_team_client_limit_patch", "churvox_plan_usage_routes", "churvox_billing_plan_confirm_patch", "churvox_plan_checkout_form_patch"]:
    try:
        importlib.import_module(_bridge_module)
    except Exception:
        try:
            importlib.import_module("backend." + _bridge_module)
        except Exception:
            pass

PLAN_ALIASES = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
JOB_LIMITS = {"solo": 50, "team": 150, "pro": 500, "enterprise": 1500}
JOBS_PER_COMMAND_GROWTH_PACK = 1500
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


def job_values(document, ObjectId):
    raw = document.get("contractor_id") or document.get("business_id") or document.get("owner_business_id") or document.get("user_id")
    return values_from_raw(raw, ObjectId)


async def owner_for(database, values):
    if not values:
        return None
    owner = await database.users.find_one({"_id": {"$in": values}})
    if owner:
        return owner
    return await database.users.find_one({"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}})


async def job_count_this_month(database, values):
    if not values:
        return 0
    start = month_start_utc()
    return await database.jobs.count_documents({
        "$or": [{"contractor_id": {"$in": values}}, {"business_id": {"$in": values}}, {"owner_business_id": {"$in": values}}],
        "$and": [{"$or": [{"created_at": {"$gte": start}}, {"createdAt": {"$gte": start}}, {"created": {"$gte": start}}, {"scheduled_at": {"$gte": start}}, {"scheduled": {"$gte": start}}]}],
        "archived": {"$ne": True},
        "is_archived": {"$ne": True},
        "status": {"$nin": ["archived", "cancelled", "canceled"]},
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
    if getattr(original_insert_one, "_churvox_monthly_job_limit_wrapped", False):
        INSTALLED.add(name)
        return

    async def limit_checked_insert_one(self, document, *args, **kwargs):
        if getattr(self, "name", "") == "jobs" and isinstance(document, dict):
            values = job_values(document, ObjectId)
            owner = await owner_for(self.database, values)
            plan = normal_plan((owner or {}).get("plan") or (owner or {}).get("ui_plan") or (owner or {}).get("subscription_plan") or document.get("plan") or "solo")
            max_jobs = int(JOB_LIMITS.get(plan, JOB_LIMITS["solo"]) or 0)
            packs = int((owner or {}).get("extra_user_blocks", 0) or 0)
            if plan == "enterprise":
                max_jobs += packs * JOBS_PER_COMMAND_GROWTH_PACK
            used = await job_count_this_month(self.database, values)
            if used >= max_jobs:
                raise HTTPException(status_code=403, detail=f"Monthly job limit reached ({used}/{max_jobs} jobs this month). Upgrade your plan or add a Command Growth Pack before adding more jobs.")
        return await original_insert_one(self, document, *args, **kwargs)

    limit_checked_insert_one._churvox_monthly_job_limit_wrapped = True
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
