from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import os
import sys

import stripe
from fastapi import HTTPException
from fastapi.responses import RedirectResponse

try:
    from churvox_stripe_plan_price_resolver import resolve_plan_price_env
except Exception:
    from backend.churvox_stripe_plan_price_resolver import resolve_plan_price_env

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.churvox.com")
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

TARGETS = {"server", "backend.server"}
INSTALLED = set()
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
PRICE_ENV_ALIASES = {
    "xero_addon": ["STRIPE_PRICE_XERO_ADDON", "STRIPE_XERO_ADDON_PRICE_ID", "STRIPE_PRICE_ACCOUNTING_SYNC", "STRIPE_ACCOUNTING_SYNC_PRICE_ID"],
    "command_growth_pack": ["STRIPE_PRICE_COMMAND_GROWTH_PACK", "STRIPE_COMMAND_GROWTH_PACK_PRICE_ID", "STRIPE_PRICE_GROWTH_PACK", "STRIPE_GROWTH_PACK_PRICE_ID"],
}


def normal_plan(value):
    return PLAN_ALIASES.get(str(value or "operator").strip().lower(), PLAN_ALIASES["operator"])


def truthy(value):
    if value is True or value == 1:
        return True
    return str(value or "").strip().lower() in {"1", "true", "yes", "on", "active", "included"}


def positive_int(value, default=0):
    try:
        return max(0, int(value or default))
    except Exception:
        return int(default or 0)


def env_price(key, country="NZ"):
    if key in {"solo", "team", "pro", "enterprise"}:
        value, env_name, candidates = resolve_plan_price_env(key, country)
        return value, env_name if value else ", ".join(candidates)
    for env_name in PRICE_ENV_ALIASES.get(key, []):
        value = os.environ.get(env_name, "").strip()
        if value:
            return value, env_name
    return "", ", ".join(PRICE_ENV_ALIASES.get(key, []))


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


async def current_user_for_request(module, request, form):
    get_current_user = getattr(module, "get_current_user", None)
    if get_current_user:
        try:
            return await get_current_user(request)
        except Exception:
            pass

    token = str((form or {}).get("token") or "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Sign in again before checkout.")

    db = getattr(module, "db", None)
    ObjectId = getattr(module, "ObjectId", None)
    jwt_lib = getattr(module, "jwt", None)
    if not db or not ObjectId or not jwt_lib:
        raise HTTPException(status_code=401, detail="Checkout token could not be verified.")

    secrets = [
        getattr(module, "SECRET_KEY", ""),
        getattr(module, "JWT_SECRET", ""),
        getattr(module, "JWT_SECRET_KEY", ""),
        os.environ.get("SECRET_KEY", ""),
        os.environ.get("JWT_SECRET", ""),
        os.environ.get("JWT_SECRET_KEY", ""),
    ]
    claims = None
    for secret in [s for s in secrets if s]:
        try:
            claims = jwt_lib.decode(token, secret, algorithms=["HS256"])
            break
        except Exception:
            continue
    if not isinstance(claims, dict):
        raise HTTPException(status_code=401, detail="Checkout token could not be verified.")

    user_id = str(claims.get("id") or claims.get("user_id") or claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip().lower()
    user = None
    if user_id:
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            user = await db.users.find_one({"id": user_id})
    if not user and email:
        user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Checkout user could not be found.")
    user["id"] = str(user.get("_id") or user.get("id") or user_id)
    return user


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    if not app:
        return

    remove_route(app, "/api/billing/start-checkout-form", "POST")

    async def start_checkout_form_endpoint(request):
        try:
            form = await request.form()
        except Exception:
            form = {}
        user = await current_user_for_request(module, request, form)
        backend_plan, ui_plan = normal_plan(form.get("plan") or form.get("ui_plan") or "operator")
        country = str(form.get("country") or "NZ").upper()
        accounting_sync = truthy(form.get("accounting_sync")) or truthy(form.get("xero_addon")) or backend_plan == "enterprise"
        growth_packs = positive_int(form.get("growth_packs") or form.get("packs"), 0) if backend_plan == "enterprise" else 0

        if not STRIPE_SECRET_KEY:
            raise HTTPException(status_code=400, detail="Stripe secret key is not configured")
        plan_price, plan_envs = env_price(backend_plan, country)
        if not plan_price:
            raise HTTPException(status_code=400, detail=f"Missing Stripe plan price env var for {ui_plan}: {plan_envs}")

        line_items = [{"price": plan_price, "quantity": 1}]
        if accounting_sync and backend_plan != "enterprise":
            xero_price, xero_envs = env_price("xero_addon", country)
            if not xero_price:
                raise HTTPException(status_code=400, detail=f"Missing Stripe Xero add-on price env var: {xero_envs}")
            line_items.append({"price": xero_price, "quantity": 1})
        if growth_packs > 0:
            growth_price, growth_envs = env_price("command_growth_pack", country)
            if not growth_price:
                raise HTTPException(status_code=400, detail=f"Missing Stripe Command Growth Pack price env var: {growth_envs}")
            line_items.append({"price": growth_price, "quantity": growth_packs})

        bid = str(user.get("business_id") or user.get("id") or user.get("_id") or "")
        uid = str(user.get("id") or user.get("_id") or "")
        metadata = {
            "user_id": uid,
            "business_id": bid,
            "plan": backend_plan,
            "ui_plan": ui_plan,
            "country": country,
            "accounting_sync": "1" if accounting_sync else "0",
            "xero_addon": "1" if accounting_sync and backend_plan != "enterprise" else "0",
            "growth_packs": str(growth_packs),
            "packs": str(growth_packs),
            "source": "churvox_plan_checkout_form_patch",
        }
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=line_items,
            success_url=f"{FRONTEND_URL}/plans?checkout=success&plan={backend_plan}&country={country}&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/plans?checkout=cancelled",
            client_reference_id=uid,
            metadata=metadata,
            subscription_data={"metadata": metadata, "trial_period_days": 14, "trial_settings": {"end_behavior": {"missing_payment_method": "cancel"}}},
            payment_method_collection="if_required",
        )
        return RedirectResponse(session.url, status_code=303)

    app.add_api_route("/api/billing/start-checkout-form", start_checkout_form_endpoint, methods=["POST"])
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
