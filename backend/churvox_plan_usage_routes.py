from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

from starlette.requests import Request as StarletteRequest

PLAN_ALIASES = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
PLAN_LABELS = {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command"}
BASE_LIMITS = {
    "solo": {"workers": 1, "clients": 250, "jobs_month": 50, "ai_actions_month": 25},
    "team": {"workers": 5, "clients": 1000, "jobs_month": 150, "ai_actions_month": 100},
    "pro": {"workers": 15, "clients": 3000, "jobs_month": 500, "ai_actions_month": 500},
    "enterprise": {"workers": 50, "clients": 10000, "jobs_month": 1500, "ai_actions_month": 2000},
}
PACK_ADDS = {"workers": 50, "jobs_month": 1500, "ai_actions_month": 1000}
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


def business_values(user, ObjectId):
    raw = user.get("business_id") or user.get("id")
    return values_from_raw(raw, ObjectId)


async def owner_for(database, values):
    if not values:
        return None
    owner = await database.users.find_one({"_id": {"$in": values}})
    if owner:
        return owner
    return await database.users.find_one({"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}})


async def worker_count(database, values):
    return await database.users.count_documents({"business_id": {"$in": values}, "role": "worker", "active": {"$ne": False}, "is_active": {"$ne": False}, "status": {"$nin": ["inactive", "disabled", "paused", "removed", "archived"]}})


async def client_count(database, values):
    return await database.clients.count_documents({"$or": [{"contractor_id": {"$in": values}}, {"business_id": {"$in": values}}, {"owner_business_id": {"$in": values}}], "archived": {"$ne": True}, "is_archived": {"$ne": True}, "deleted": {"$ne": True}, "is_deleted": {"$ne": True}})


async def job_count_month(database, values):
    start = month_start_utc()
    return await database.jobs.count_documents({"$or": [{"contractor_id": {"$in": values}}, {"business_id": {"$in": values}}, {"owner_business_id": {"$in": values}}], "$and": [{"$or": [{"created_at": {"$gte": start}}, {"createdAt": {"$gte": start}}, {"created": {"$gte": start}}, {"scheduled_at": {"$gte": start}}, {"scheduled": {"$gte": start}}]}], "archived": {"$ne": True}, "is_archived": {"$ne": True}, "status": {"$nin": ["archived", "cancelled", "canceled"]}})


async def ai_action_count_month(database, values):
    start = month_start_utc()
    return await database.ai_review_items.count_documents({"$or": [{"business_id": {"$in": values}}, {"contractor_id": {"$in": values}}, {"owner_business_id": {"$in": values}}], "$and": [{"$or": [{"created_at": {"$gte": start}}, {"createdAt": {"$gte": start}}, {"created": {"$gte": start}}]}], "status": {"$nin": ["deleted", "archived"]}})


def limit_row(name, used, limit):
    left = max(0, int(limit or 0) - int(used or 0))
    return {"name": name, "used": int(used or 0), "limit": int(limit or 0), "left": left, "locked": int(used or 0) >= int(limit or 0)}


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or not get_current_user or ObjectId is None:
        return
    existing = {getattr(route, "path", "") for route in getattr(app, "routes", [])}
    if "/api/plan/usage" in existing:
        INSTALLED.add(name)
        return

    async def plan_usage_endpoint(request: StarletteRequest):
        user = await get_current_user(request)
        values = business_values(user, ObjectId)
        owner = await owner_for(db, values) or user
        plan = normal_plan(owner.get("plan") or owner.get("ui_plan") or owner.get("subscription_plan") or user.get("plan") or "solo")
        packs = int((owner or {}).get("extra_user_blocks", 0) or 0)
        limits = dict(BASE_LIMITS.get(plan, BASE_LIMITS["solo"]))
        if plan == "enterprise":
            limits["workers"] += packs * PACK_ADDS["workers"]
            limits["jobs_month"] += packs * PACK_ADDS["jobs_month"]
            limits["ai_actions_month"] += packs * PACK_ADDS["ai_actions_month"]
        used_workers, used_clients, used_jobs, used_ai = await worker_count(db, values), await client_count(db, values), await job_count_month(db, values), await ai_action_count_month(db, values)
        usage = {
            "workers": limit_row("Active workers", used_workers, limits["workers"]),
            "clients": limit_row("Clients", used_clients, limits["clients"]),
            "jobs_month": limit_row("Jobs this month", used_jobs, limits["jobs_month"]),
            "ai_actions_month": limit_row("AI Operator Actions this month", used_ai, limits["ai_actions_month"]),
        }
        return {"success": True, "plan": plan, "plan_label": PLAN_LABELS.get(plan, "Start"), "growth_packs": packs, "limits": limits, "usage": usage, "pack_adds": PACK_ADDS, "period": {"month_start": month_start_utc().isoformat()}}

    app.add_api_route("/api/plan/usage", plan_usage_endpoint, methods=["GET"])
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
