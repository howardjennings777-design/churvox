"""Churvox Python startup patches."""

from __future__ import annotations

import os

try:
    from . import churvox_monthly_job_limit  # noqa: F401
except Exception:
    try:
        import churvox_monthly_job_limit  # noqa: F401
    except Exception:
        pass

# Xero rejects the OAuth request if any scope is invalid. Let Render's XERO_SCOPES
# win when it is configured, and only fall back to the minimum phase-one scope set.
os.environ.setdefault("XERO_SCOPES", "openid profile email offline_access accounting.invoices")
os.environ.setdefault("BACKEND_PUBLIC_URL", "https://churvox-backend.onrender.com")
os.environ.setdefault("FRONTEND_URL", "https://www.churvox.com")

LOCKED_PLAN_LIMITS = {
    "solo": {"price": 39, "max_workers": 1, "max_clients": 250, "jobs_per_month": 50, "ai_operator_actions": 25, "team": True, "sms": False, "myob": False, "xero": False, "accounting_sync": "add_on", "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "team": {"price": 89, "max_workers": 5, "max_clients": 1000, "jobs_per_month": 150, "ai_operator_actions": 100, "team": True, "sms": True, "myob": False, "xero": False, "accounting_sync": "add_on", "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "pro": {"price": 149, "max_workers": 15, "max_clients": 3000, "jobs_per_month": 500, "ai_operator_actions": 500, "team": True, "sms": True, "myob": False, "xero": False, "accounting_sync": "add_on", "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "enterprise": {"price": 299, "max_workers": 50, "max_clients": 10000, "jobs_per_month": 1500, "ai_operator_actions": 2000, "team": True, "sms": True, "myob": True, "xero": True, "accounting_sync": "included", "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True, "extra_blocks": True},
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


def patch_team_limit_runtime(module):
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
            deduped = []
            for value in values:
                if value not in deduped:
                    deduped.append(value)
            return deduped

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
            raw = doc.get("contractor_id") or doc.get("business_id") or doc.get("owner_business_id") or doc.get("user_id")
            return values_from_raw(raw)

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

        async def active_worker_count(user):
            raw, obj, values = business_values(user)
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

        async def owner_doc_from_values(database, values):
            if not values:
                return None
            owner = await database.users.find_one({"_id": {"$in": values}})
            if owner:
                return owner
            return await database.users.find_one({"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}})

        async def capacity_for(user):
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
            plan, limits, max_workers, packs, count = await capacity_for(user)
            if count >= max_workers:
                raise HTTPException(status_code=403, detail=f"Team limit reached ({count}/{max_workers} active workers). Add a Command Growth Pack or remove inactive workers.")
            return plan, limits, max_workers, packs, count

        async def assert_client_slot(database, doc):
            values = client_business_values(doc)
            owner = await owner_doc_from_values(database, values)
            plan = normal_plan((owner or {}).get("plan") or (owner or {}).get("ui_plan") or (owner or {}).get("subscription_plan") or doc.get("plan") or "solo")
            limits = LOCKED_PLAN_LIMITS.get(plan, LOCKED_PLAN_LIMITS["solo"])
            max_clients = int(limits.get("max_clients", 0) or 0)
            count = await active_client_count_from_values(database, values)
            if max_clients >= 0 and count >= max_clients:
                raise HTTPException(status_code=403, detail=f"Client limit reached ({count}/{max_clients} clients). Upgrade your plan before adding more clients.")
            return plan, max_clients, count

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
                async def team_limits(current_user: dict = None):
                    user = current_user or {}
                    plan, limits, max_workers, packs, count = await capacity_for(user)
                    return {"success": True, "plan": plan, "limits": limits, "usage": {"workers": count}, "max_workers": max_workers, "extra_user_blocks": packs, "growth_packs": packs, "slots_left": max(0, max_workers - count)}

                async def team_limits_endpoint(request: Request):
                    user = await get_current_user(request)
                    return await team_limits(user)

                app.add_api_route("/api/team/limits", team_limits_endpoint, methods=["GET"])
    except Exception:
        pass


try:
    import importlib.abc
    import importlib.machinery
    import sys

    TARGETS = {"server", "backend.server"}

    class ChurvoxPlanLimitLoader(importlib.abc.Loader):
        def __init__(self, original_loader):
            self.original_loader = original_loader

        def create_module(self, spec):
            if hasattr(self.original_loader, "create_module"):
                return self.original_loader.create_module(spec)
            return None

        def exec_module(self, module):
            self.original_loader.exec_module(module)
            patch_locked_plan_limits(module)
            patch_team_limit_runtime(module)

    class ChurvoxPlanLimitFinder(importlib.abc.MetaPathFinder):
        def find_spec(self, fullname, path=None, target=None):
            if fullname not in TARGETS:
                return None
            spec = importlib.machinery.PathFinder.find_spec(fullname, path)
            if spec and spec.loader and not isinstance(spec.loader, ChurvoxPlanLimitLoader):
                spec.loader = ChurvoxPlanLimitLoader(spec.loader)
            return spec

    if not any(isinstance(finder, ChurvoxPlanLimitFinder) for finder in sys.meta_path):
        sys.meta_path.insert(0, ChurvoxPlanLimitFinder())

    for module_name in list(TARGETS):
        loaded = sys.modules.get(module_name)
        if loaded:
            patch_locked_plan_limits(loaded)
            patch_team_limit_runtime(loaded)
except Exception:
    pass

try:
    from churvox_stripe_no_card import install_no_card_trial_defaults
    install_no_card_trial_defaults()
except Exception:
    pass

try:
    from pathlib import Path
    from base64 import b64decode

    p = Path(__file__).with_name("server.py")
    data = p.read_bytes()
    old_due = b64decode("e2YnIGZvciB7aHlkcmF0ZWQuZ2V0KCdhbW91bnRfZHVlJyl9JyBpZiBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBlbHNlICcnfQ==")
    new_due = b64decode("eycgZm9yICcgKyBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBpZiBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBlbHNlICcnfQ==")
    old_total = b64decode("e2YnIGZvciB7aHlkcmF0ZWQuZ2V0KCd0b3RhbCcpfScgaWYgaHlkcmF0ZWQuZ2V0KCd0b3RhbCcpIGVsc2UgJyd9")
    new_total = b64decode("eycgZm9yICcgKyBoeWRyYXRlZC5nZXQoJ3RvdGFsJykgaWYgaHlkcmF0ZWQuZ2V0KCd0b3RhbCcpIGVsc2UgJyd9")
    fixed = data.replace(old_due, new_due).replace(old_total, new_total)
    if fixed != data:
        p.write_bytes(fixed)
except Exception:
    pass

try:
    import stripe

    create_original = stripe.checkout.Session.create

    def create_checkout_session(*args, **kwargs):
        if kwargs.get("mode") == "subscription":
            kwargs["payment_method_collection"] = "if_required"
            subscription_data = dict(kwargs.get("subscription_data") or {})
            if not subscription_data.get("trial_period_days"):
                subscription_data["trial_period_days"] = 14
            if not subscription_data.get("trial_settings"):
                subscription_data["trial_settings"] = {"end_behavior": {"missing_payment_method": "cancel"}}
            kwargs["subscription_data"] = subscription_data
        return create_original(*args, **kwargs)

    stripe.checkout.Session.create = create_checkout_session
except Exception:
    pass
