from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import os
import sys

TARGETS = {"server", "backend.server", "churvox_accounting_routes", "backend.churvox_accounting_routes"}
DONE = set()
ROLES = {"owner", "admin", "manager", "employer", "business_owner", "superadmin", "office_admin"}
PLANS = {"operator", "pro", "command", "enterprise"}


def env_key(*parts):
    return "".join(parts)


def env_value(*parts):
    return str(os.environ.get(env_key(*parts)) or "").strip()


def configured_account():
    return env_value("STRIPE", "_ONSITE", "_ACCOUNT", "_ID") or env_value("STRIPE", "_CONNECTED", "_ACCOUNT", "_ID")


def configured_key():
    return env_value("STRIPE", "_CONNECT", "_SECRET", "_KEY") or env_value("STRIPE", "_SECRET", "_KEY") or env_value("CHURVOX", "_STRIPE", "_SECRET", "_KEY")


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def business_id(user):
    return clean(user.get("business_id") or user.get("businessId") or user.get("business") or user.get("owner_business_id") or user.get("contractor_id") or user.get("id") or user.get("_id") or user.get("user_id"))


def role(user):
    return lower(user.get("role") or user.get("user_role"))


def json_safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    try:
        if hasattr(value, "binary"):
            return str(value)
    except Exception:
        pass
    return value


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [r for r in app.router.routes if not route_matches(r, path, method)]
    except Exception:
        pass


def promote_route(app, path, method):
    try:
        routes = list(app.router.routes)
        matches = [r for r in routes if route_matches(r, path, method)]
        others = [r for r in routes if not route_matches(r, path, method)]
        if matches:
            app.router.routes = matches[-1:] + others + matches[:-1]
    except Exception:
        pass


async def find_owner(db, user, ObjectId):
    bid = business_id(user)
    checks = []
    if bid:
        checks.extend([{"business_id": bid}, {"businessId": bid}, {"id": bid}])
        try:
            checks.append({"_id": ObjectId(bid)})
        except Exception:
            pass
    if checks:
        try:
            row = await db.users.find_one({"$or": checks})
            if row:
                return row
        except Exception:
            pass
    return user


async def account_for(db, user, ObjectId):
    bid = business_id(user)
    settings = {}
    try:
        settings = await db.payment_settings.find_one({"business_id": bid}) or {}
    except Exception:
        settings = {}
    owner = await find_owner(db, user, ObjectId)
    account = clean(settings.get("stripe_account_id") or owner.get("stripe_account_id") or owner.get("stripe_connected_account_id") or configured_account())
    if account and not settings.get("stripe_account_id"):
        try:
            now = datetime.now(timezone.utc)
            await db.payment_settings.update_one(
                {"business_id": bid},
                {"$set": {"business_id": bid, "provider": "stripe", "stripe_account_id": account, "setup_source": "render_config", "updated_at": now}, "$setOnInsert": {"created_at": now}},
                upsert=True,
            )
            settings = await db.payment_settings.find_one({"business_id": bid}) or settings
        except Exception:
            pass
    return settings, owner, account


def plan_for(user, owner):
    return lower(user.get("plan") or user.get("business_plan") or user.get("subscription_plan") or owner.get("plan") or owner.get("business_plan") or owner.get("subscription_plan") or "solo")


def install_accounting(module):
    if not hasattr(module, "_owner_doc"):
        return False

    async def _payment_settings(db, user, owner=None):
        if owner is None:
            owner = await module._owner_doc(db, user)
        settings, owner, account = await account_for(db, user, getattr(module.ObjectIdShim, "make", lambda x: x))
        return settings, owner, account

    module._payment_settings = _payment_settings
    return True


def install_server(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Depends = getattr(module, "Depends", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or not get_current_user or Depends is None or ObjectId is None:
        return False

    async def status(current_user=Depends(get_current_user)):
        settings, owner, account = await account_for(db, current_user, ObjectId)
        plan = plan_for(current_user, owner)
        key = configured_key()
        return json_safe({
            "success": True,
            "env_patch_loaded": True,
            "business_id": business_id(current_user),
            "role": role(current_user),
            "owner_role": role(current_user) in ROLES or bool(current_user.get("is_admin") or current_user.get("is_platform_owner")),
            "plan": plan,
            "enabled_for_plan": plan in PLANS,
            "stripe_configured": bool(key),
            "stripe_key_mode": "live" if key.startswith("sk_live_") else "test" if key.startswith("sk_test_") else "unknown",
            "connected": bool(account),
            "stripe_account_id": account,
            "frontend_url": os.environ.get("FRONTEND_URL", "https://www.churvox.com"),
            "payment_settings": settings,
            "next_step": "Stripe connected" if account else "Connect Stripe",
        })

    for path in ["/api/payments/on-site/status", "/api/payments/on-site/debug"]:
        remove_route(app, path, "GET")
        app.add_api_route(path, status, methods=["GET"])
        promote_route(app, path, "GET")
    return True


def install(module):
    name = getattr(module, "__name__", "")
    ok = False
    if name in {"server", "backend.server"}:
        ok = install_server(module) or ok
    if name in {"churvox_accounting_routes", "backend.churvox_accounting_routes"}:
        ok = install_accounting(module) or ok
    if ok:
        DONE.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        if hasattr(self.original, "create_module"):
            return self.original.create_module(spec)
        return None

    def exec_module(self, module):
        self.original.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(f, Finder) for f in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
