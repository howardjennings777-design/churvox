"""Churvox Python startup patches.

This file is intentionally small but important. It is loaded automatically by
Python on backend startup and installs safe runtime patches without replacing
large backend/server.py through the GitHub connector.
"""

from __future__ import annotations

import os

# Keep startup modules loaded from both package and direct backend cwd paths.
def _safe_import(module_name: str) -> None:
    try:
        __import__(f"backend.{module_name}")
        return
    except Exception:
        pass
    try:
        __import__(module_name)
    except Exception:
        pass


for _module in [
    "churvox_monthly_job_limit",
    "churvox_ai_action_limit",
    "churvox_plan_usage_routes",
    "churvox_billing_plan_confirm_patch",
]:
    _safe_import(_module)

# Xero rejects OAuth requests with invalid scopes. Render env wins when set.
os.environ.setdefault("XERO_SCOPES", "openid profile email offline_access accounting.invoices")
os.environ.setdefault("BACKEND_PUBLIC_URL", "https://churvox-backend.onrender.com")
os.environ.setdefault("FRONTEND_URL", "https://www.churvox.com")

LOCKED_PLAN_LIMITS = {
    "solo": {"price": 39, "max_workers": 1, "max_clients": 250, "jobs_per_month": 50, "ai_operator_actions": 25, "team": True, "sms": False, "myob": False, "xero": False, "accounting_sync": "add_on", "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "team": {"price": 89, "max_workers": 5, "max_clients": 1000, "jobs_per_month": 150, "ai_operator_actions": 100, "team": True, "sms": True, "myob": False, "xero": False, "accounting_sync": "add_on", "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "pro": {"price": 149, "max_workers": 15, "max_clients": 3000, "jobs_per_month": 500, "ai_operator_actions": 500, "team": True, "sms": True, "myob": False, "xero": False, "accounting_sync": "add_on", "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "enterprise": {"price": 299, "max_workers": 50, "max_clients": 10000, "jobs_per_month": 1500, "ai_operator_actions": 2000, "team": True, "sms": True, "myob": False, "xero": True, "accounting_sync": "included", "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True, "extra_blocks": True},
}

PLAN_ALIASES = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}


def patch_locked_plan_limits(module):
    try:
        plan_limits = getattr(module, "PLAN_LIMITS", None)
        if not isinstance(plan_limits, dict):
            return
        for plan_key, locked in LOCKED_PLAN_LIMITS.items():
            current = dict(plan_limits.get(plan_key) or {})
            current.update(locked)
            plan_limits[plan_key] = current
    except Exception:
        pass


def patch_team_and_client_limits(module):
    try:
        app = getattr(module, "app", None)
        db = getattr(module, "db", None)
        get_current_user = getattr(module, "get_current_user", None)
        ObjectId = getattr(module, "ObjectId", None)
        HTTPException = getattr(module, "HTTPException", None)
        Request = getattr(module, "Request", None)
        if not db or not ObjectId or not HTTPException:
            return

        def normal_plan(value):
            return PLAN_ALIASES.get(str(value or "solo").strip().lower(), "solo")

        def values_from_raw(raw):
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

        def business_values(user):
            raw = user.get("business_id") or user.get("id")
            values = values_from_raw(raw)
            obj = None
            try:
                obj = ObjectId(str(raw))
            except Exception:
                obj = None
            return raw, obj, values

        def client_business_values(doc):
            return values_from_raw(doc.get("contractor_id") or doc.get("business_id") or doc.get("owner_business_id") or doc.get("user_id"))

        async def owner_doc_for(user):
            raw, obj, values = business_values(user)
            owner = None
            if obj:
                owner = await db.users.find_one({"_id": obj})
            if not owner:
                owner = await db.users.find_one({"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}})
            if not owner and obj:
                owner = await db.users.find_one({"_id": obj})
            return owner

        async def owner_doc_from_values(database, values):
            if not values:
                return None
            owner = await database.users.find_one({"_id": {"$in": values}})
            if owner:
                return owner
            return await database.users.find_one({"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}})

        async def active_worker_count(user):
            raw, obj, values = business_values(user)
            if not values:
                return 0
            return await db.users.count_documents({
                "business_id": {"$in": values},
                "role": "worker",
                "active": {"$ne": False},
                "is_active": {"$ne": False},
                "status": {"$nin": ["inactive", "disabled", "paused", "removed", "archived"]},
            })

        async def active_client_count_from_values(database, values):
            if not values:
                return 0
            return await database.clients.count_documents({
                "$or": [{"contractor_id": {"$in": values}}, {"business_id": {"$in": values}}, {"owner_business_id": {"$in": values}}],
                "archived": {"$ne": True},
                "is_archived": {"$ne": True},
                "deleted": {"$ne": True},
                "is_deleted": {"$ne": True},
            })

        async def worker_capacity_for(user):
            plan = normal_plan(user.get("plan") or user.get("ui_plan") or user.get("subscription_plan") or "solo")
            limits = LOCKED_PLAN_LIMITS.get(plan, LOCKED_PLAN_LIMITS["solo"])
            max_workers = int(limits.get("max_workers", 0) or 0)
            owner = await owner_doc_for(user)
            packs = int((owner or {}).get("extra_user_blocks", 0) or 0)
            if plan == "enterprise":
                max_workers += packs * 50
            count = await active_worker_count(user)
            return plan, limits, max_workers, packs, count

        async def assert_worker_slot(user):
            plan, limits, max_workers, packs, count = await worker_capacity_for(user)
            if count >= max_workers:
                raise HTTPException(status_code=403, detail=f"Team limit reached ({count}/{max_workers} active workers). Add a Command Growth Pack or remove inactive workers.")
            return plan, limits, max_workers, packs, count

        async def assert_client_slot(database, document):
            values = client_business_values(document)
            owner = await owner_doc_from_values(database, values)
            plan = normal_plan((owner or {}).get("plan") or (owner or {}).get("ui_plan") or (owner or {}).get("subscription_plan") or document.get("plan") or "solo")
            limits = LOCKED_PLAN_LIMITS.get(plan, LOCKED_PLAN_LIMITS["solo"])
            max_clients = int(limits.get("max_clients", 0) or 0)
            count = await active_client_count_from_values(database, values)
            if count >= max_clients:
                raise HTTPException(status_code=403, detail=f"Client limit reached ({count}/{max_clients} clients). Upgrade your plan before adding more clients.")

        async def locked_check_team_limits(user):
            raw, obj, values = business_values(user)
            await assert_worker_slot(user)
            return obj or raw

        module.check_team_limits = locked_check_team_limits

        original_create_invite = getattr(module, "create_invite_for_worker", None)
        if original_create_invite and not getattr(original_create_invite, "_churvox_limit_wrapped", False):
            async def locked_create_invite_for_worker(email, name, phone, user, biz_id):
                await assert_worker_slot(user)
                return await original_create_invite(email, name, phone, user, biz_id)
            locked_create_invite_for_worker._churvox_limit_wrapped = True
            module.create_invite_for_worker = locked_create_invite_for_worker

        try:
            from motor.motor_asyncio import AsyncIOMotorCollection
            old_insert_one = AsyncIOMotorCollection.insert_one
            if not getattr(old_insert_one, "_churvox_client_limit_wrapped", False):
                async def limit_checked_insert_one(self, document, *args, **kwargs):
                    if getattr(self, "name", "") == "clients" and isinstance(document, dict):
                        await assert_client_slot(self.database, document)
                    return await old_insert_one(self, document, *args, **kwargs)
                limit_checked_insert_one._churvox_client_limit_wrapped = True
                AsyncIOMotorCollection.insert_one = limit_checked_insert_one
        except Exception:
            pass

        if app is not None and get_current_user is not None and Request is not None:
            existing_paths = {getattr(route, "path", "") for route in getattr(app, "routes", [])}
            if "/api/team/limits" not in existing_paths:
                async def team_limits_endpoint(request: Request):
                    user = await get_current_user(request)
                    plan, limits, max_workers, packs, count = await worker_capacity_for(user)
                    return {"success": True, "plan": plan, "limits": limits, "usage": {"workers": count}, "max_workers": max_workers, "extra_user_blocks": packs, "growth_packs": packs, "slots_left": max(0, max_workers - count)}
                app.add_api_route("/api/team/limits", team_limits_endpoint, methods=["GET"])
    except Exception:
        pass


try:
    import importlib.abc
    import importlib.machinery
    import sys

    TARGETS = {"server", "backend.server"}

    class ChurvoxStartupLoader(importlib.abc.Loader):
        def __init__(self, original_loader):
            self.original_loader = original_loader

        def create_module(self, spec):
            if hasattr(self.original_loader, "create_module"):
                return self.original_loader.create_module(spec)
            return None

        def exec_module(self, module):
            self.original_loader.exec_module(module)
            patch_locked_plan_limits(module)
            patch_team_and_client_limits(module)

    class ChurvoxStartupFinder(importlib.abc.MetaPathFinder):
        def find_spec(self, fullname, path=None, target=None):
            if fullname not in TARGETS:
                return None
            spec = importlib.machinery.PathFinder.find_spec(fullname, path)
            if spec and spec.loader and not isinstance(spec.loader, ChurvoxStartupLoader):
                spec.loader = ChurvoxStartupLoader(spec.loader)
            return spec

    if not any(isinstance(finder, ChurvoxStartupFinder) for finder in sys.meta_path):
        sys.meta_path.insert(0, ChurvoxStartupFinder())

    for module_name in list(TARGETS):
        loaded = sys.modules.get(module_name)
        if loaded:
            patch_locked_plan_limits(loaded)
            patch_team_and_client_limits(loaded)
except Exception:
    pass

try:
    from churvox_stripe_no_card import install_no_card_trial_defaults
    install_no_card_trial_defaults()
except Exception:
    pass
