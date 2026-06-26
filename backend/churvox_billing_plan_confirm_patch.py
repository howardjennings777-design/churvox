from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import os
import sys

import stripe
from fastapi import HTTPException

PLAN_ALIASES = {
    "start": ("solo", "start"),
    "solo": ("solo", "start"),
    "crew": ("team", "crew"),
    "team": ("team", "crew"),
    "operator": ("pro", "operator"),
    "pro": ("pro", "operator"),
    "command": ("enterprise", "command"),
    "enterprise": ("enterprise", "command"),
}
PLAN_LABELS = {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command"}
TARGETS = {"server", "backend.server"}
INSTALLED = set()
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


def normal_plan(value):
    return PLAN_ALIASES.get(str(value or "operator").strip().lower(), PLAN_ALIASES["operator"])


def truthy(value):
    if value is True or value == 1:
        return True
    text = str(value or "").strip().lower()
    return text in {"1", "true", "yes", "on", "active", "included"}


def positive_int(value, default=0):
    try:
        return max(0, int(value or default))
    except Exception:
        return int(default or 0)


def session_metadata(session):
    meta = {}
    try:
        meta.update(dict(getattr(session, "metadata", {}) or {}))
    except Exception:
        pass
    try:
        meta.update(dict(getattr(getattr(session, "subscription", None), "metadata", {}) or {}))
    except Exception:
        pass
    return meta


def value_list(raw, ObjectId):
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
    return value_list(user.get("business_id") or user.get("id"), ObjectId)


def business_id_string(values, user):
    return str(values[0]) if values else str(user.get("business_id") or user.get("id") or "")


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


async def owner_for(db, values):
    if not values:
        return None
    owner = await db.users.find_one({"_id": {"$in": values}})
    if owner:
        return owner
    return await db.users.find_one({"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}})


async def apply_bundled_addons(db, user, values, backend_plan, payload, session, now):
    meta = session_metadata(session)
    business_id = business_id_string(values, user)
    session_id = str((payload or {}).get("session_id") or getattr(session, "id", "") or "")
    accounting_requested = backend_plan == "enterprise" or truthy((payload or {}).get("accounting_sync")) or truthy((payload or {}).get("xero_addon")) or truthy(meta.get("accounting_sync")) or truthy(meta.get("xero_addon"))
    growth_packs = positive_int((payload or {}).get("growth_packs") or (payload or {}).get("packs") or meta.get("growth_packs") or meta.get("packs"), 0)

    if accounting_requested:
        await db.users.update_one({"$or": [{"_id": {"$in": values}}, {"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}}]}, {"$set": {"xero_addon_active": True, "accounting_sync": True, "xero_addon_started_at": now, "updated_at": now}})
        exists = await db.billing_addons.find_one({"business_id": business_id, "stripe_session_id": session_id, "addon_key": "xero_addon"})
        if not exists:
            await db.billing_addons.insert_one({"business_id": business_id, "user_id": str(user.get("id")), "addon_key": "xero_addon", "stripe_session_id": session_id, "quantity": 1, "status": "active", "source": "plan_checkout", "created_at": now})

    if backend_plan == "enterprise" and growth_packs > 0:
        exists = await db.billing_addons.find_one({"business_id": business_id, "stripe_session_id": session_id, "addon_key": "command_growth_pack"})
        if not exists:
            await db.users.update_one({"$or": [{"_id": {"$in": values}}, {"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}}]}, {"$inc": {"extra_user_blocks": growth_packs}, "$set": {"updated_at": now}})
            await db.billing_addons.insert_one({"business_id": business_id, "user_id": str(user.get("id")), "addon_key": "command_growth_pack", "stripe_session_id": session_id, "quantity": growth_packs, "status": "active", "source": "plan_checkout", "created_at": now})
    return {"accounting_sync": accounting_requested, "growth_packs": growth_packs if backend_plan == "enterprise" else 0}


async def save_plan(db, user, ObjectId, backend_plan, ui_plan, payload, session=None):
    now = datetime.now(timezone.utc)
    values = business_values(user, ObjectId)
    session_id = str((payload or {}).get("session_id") or getattr(session, "id", "") or "")
    subscription_id = str(getattr(session, "subscription", "") or "") if session is not None else ""
    customer_id = str(getattr(session, "customer", "") or "") if session is not None else ""
    country = str((payload or {}).get("country") or (payload or {}).get("billing_country") or session_metadata(session).get("country") or "NZ").upper()
    update = {
        "plan": backend_plan,
        "ui_plan": ui_plan,
        "current_plan": backend_plan,
        "subscription_plan": backend_plan,
        "billing_plan": backend_plan,
        "plan_label": PLAN_LABELS.get(backend_plan, "Operator"),
        "billing_country": country,
        "subscription_status": "trialing",
        "has_app_access": True,
        "billing_lock_reason": "",
        "plan_choice_required": False,
        "stripe_checkout_session_id": session_id,
        "plan_updated_at": now,
        "updated_at": now,
    }
    unset = {"plan_required": "", "payment_required": "", "requires_plan_choice": "", "trial_locked": ""}
    if subscription_id:
        update["stripe_subscription_id"] = subscription_id
    if customer_id:
        update["stripe_customer_id"] = customer_id
    result = await db.users.update_one({"$or": [{"_id": {"$in": values}}, {"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}}]}, {"$set": update, "$unset": unset})
    if not getattr(result, "matched_count", 0) and values:
        await db.users.update_one({"_id": values[0]}, {"$set": update, "$unset": unset})
    addon_summary = await apply_bundled_addons(db, user, values, backend_plan, payload, session, now)
    try:
        await db.billing_events.insert_one({"business_id": business_id_string(values, user), "event_type": "plan_confirmed", "plan": backend_plan, "ui_plan": ui_plan, "stripe_session_id": session_id, "has_app_access": True, "addons": addon_summary, "created_at": now})
    except Exception:
        pass
    update.update(addon_summary)
    return update


def session_plan(session, payload):
    meta = session_metadata(session)
    raw = (payload or {}).get("plan") or (payload or {}).get("ui_plan") or meta.get("plan") or meta.get("ui_plan") or "operator"
    return normal_plan(raw)


def session_is_complete(session):
    if session is None:
        return True
    status = str(getattr(session, "status", "") or "").lower()
    payment = str(getattr(session, "payment_status", "") or "").lower()
    return status == "complete" or payment in {"paid", "no_payment_required"}


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

    remove_route(app, "/api/billing/confirm-checkout", "POST")
    remove_route(app, "/api/billing/subscription-status", "GET")

    async def confirm_checkout_endpoint(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        session_id = str((payload or {}).get("session_id") or "").strip()
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        session = None
        if STRIPE_SECRET_KEY:
            try:
                session = stripe.checkout.Session.retrieve(session_id, expand=["subscription"])
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Stripe checkout could not be verified: {exc}")
            if not session_is_complete(session):
                raise HTTPException(status_code=400, detail="Checkout is not complete yet")
        backend_plan, ui_plan = session_plan(session, payload)
        saved = await save_plan(db, user, ObjectId, backend_plan, ui_plan, payload, session)
        return {"success": True, "plan": backend_plan, "ui_plan": ui_plan, "plan_label": PLAN_LABELS.get(backend_plan, "Operator"), "saved": True, "has_app_access": True, "subscription_status": saved.get("subscription_status"), "accounting_sync": saved.get("accounting_sync"), "growth_packs": saved.get("growth_packs", 0), "stripe_session_id": session_id}

    async def subscription_status_endpoint(request: Request):
        user = await get_current_user(request)
        values = business_values(user, ObjectId)
        owner = await owner_for(db, values) or user
        backend_plan, ui_plan = normal_plan(owner.get("plan") or owner.get("ui_plan") or owner.get("subscription_plan") or "solo")
        has_access = bool(owner.get("has_app_access", True))
        packs = int((owner or {}).get("extra_user_blocks", 0) or 0)
        return {"success": True, "plan": backend_plan, "ui_plan": ui_plan, "current_plan": backend_plan, "plan_label": PLAN_LABELS.get(backend_plan, "Start"), "subscription_status": owner.get("subscription_status") or "trialing", "has_app_access": has_access, "billing_lock_reason": owner.get("billing_lock_reason") or "", "billing_country": owner.get("billing_country") or "NZ", "accounting_sync": bool(owner.get("accounting_sync") or owner.get("xero_addon_active") or backend_plan == "enterprise"), "xero_addon_active": bool(owner.get("xero_addon_active") or backend_plan == "enterprise"), "growth_packs": packs, "extra_user_blocks": packs, "stripe_subscription_id": owner.get("stripe_subscription_id"), "stripe_customer_id": owner.get("stripe_customer_id")}

    app.add_api_route("/api/billing/confirm-checkout", confirm_checkout_endpoint, methods=["POST"])
    app.add_api_route("/api/billing/subscription-status", subscription_status_endpoint, methods=["GET"])
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
