from __future__ import annotations

from datetime import datetime, timezone, timedelta
import importlib
import importlib.abc
import importlib.machinery
import os
import sys
from typing import Any

from fastapi import HTTPException
from starlette.requests import Request

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()
DEFAULT_OWNER_EMAILS = {
    "hello@churvox.com",
    "howardjennings777@gmail.com",
    "howardjennings77@gmail.com",
}
PLAN_ALIAS = {
    "start": "solo",
    "solo": "solo",
    "crew": "team",
    "team": "team",
    "operator": "pro",
    "pro": "pro",
    "command": "enterprise",
    "enterprise": "enterprise",
}


def now_utc():
    return datetime.now(timezone.utc)


def text(value: Any) -> str:
    try:
        return str(value or "").strip()
    except Exception:
        return ""


def lower(value: Any) -> str:
    return text(value).lower()


def safe(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, list):
        return [safe(v) for v in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "token", "secret", "hash"]):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    return value


def parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def owner_emails():
    raw = os.environ.get("CHURVOX_OWNER_ACCESS_EMAILS") or os.environ.get("CHURVOX_OWNER_EMAILS") or ""
    emails = {lower(item) for item in raw.replace(";", ",").split(",") if lower(item)}
    return DEFAULT_OWNER_EMAILS | emails


def plan_key(value: Any, default: str = "pro") -> str:
    return PLAN_ALIAS.get(lower(value), default)


def is_truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return lower(value) in {"1", "true", "yes", "active", "enabled"}


def route_matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path: str, method: str):
    try:
        app.router.routes = [r for r in app.router.routes if not route_matches(r, path, method)]
    except Exception:
        pass


def user_payload(user_doc: dict):
    bid = text(user_doc.get("business_id") or user_doc.get("_id") or user_doc.get("id"))
    uid = text(user_doc.get("_id") or user_doc.get("id") or bid)
    email = lower(user_doc.get("email"))
    plan = user_doc.get("plan") or "none"
    status = user_doc.get("subscription_status") or "none"
    payload = {
        "success": True,
        "id": uid,
        "email": email,
        "name": user_doc.get("name") or user_doc.get("business_name") or "Churvox user",
        "business_name": user_doc.get("business_name"),
        "role": user_doc.get("role") or "employer",
        "plan": plan,
        "subscription_status": status,
        "trial_ends_at": user_doc.get("trial_ends_at"),
        "free_tester_access": bool(user_doc.get("free_tester_access")),
        "free_tester_until": user_doc.get("free_tester_until"),
        "has_app_access": bool(user_doc.get("has_app_access")),
        "billing_lock_reason": user_doc.get("billing_lock_reason"),
        "email_verified": user_doc.get("email_verified"),
        "gst_rate": user_doc.get("gst_rate"),
        "trade_type": user_doc.get("trade_type", "other"),
        "business_id": bid,
    }
    payload["user"] = dict(payload)
    return safe(payload)


def access_update(plan="pro", days=90, source="owner_access_safety"):
    until = now_utc() + timedelta(days=days)
    return {
        "free_tester_access": True,
        "free_tester_until": until,
        "plan": plan_key(plan),
        "subscription_status": "tester_free",
        "checkout_verified_by_stripe": True,
        "billing_lock_reason": None,
        "locked_reason": None,
        "account_locked": False,
        "has_app_access": True,
        "owner_access_source": source,
        "updated_at": now_utc(),
    }


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    def obj_id(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def current_user_doc(request: Request):
        try:
            current = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated")
        uid = obj_id((current or {}).get("id") or (current or {}).get("_id") or (current or {}).get("user_id"))
        email = lower((current or {}).get("email"))
        user_doc = None
        if uid:
            try:
                user_doc = await db.users.find_one({"_id": uid})
            except Exception:
                user_doc = None
        if not user_doc and email:
            try:
                user_doc = await db.users.find_one({"email": email})
            except Exception:
                user_doc = None
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        return user_doc

    async def maybe_unlock(user_doc: dict):
        email = lower(user_doc.get("email"))
        should_unlock = email in owner_emails()
        tester = None
        try:
            tester = await db.app_owner_testers.find_one({"email": email}) if email else None
        except Exception:
            tester = None
        if tester:
            until = parse_dt(tester.get("free_until")) or parse_dt(tester.get("free_tester_until"))
            if not until or until >= now_utc():
                should_unlock = True
        if not should_unlock:
            return user_doc
        plan = (tester or {}).get("plan") or user_doc.get("plan") or "operator"
        days = int((tester or {}).get("days") or 90)
        update = access_update(plan=plan, days=max(1, min(days, 1095)), source="owner_or_tester_access_safety")
        try:
            await db.users.update_one({"_id": user_doc["_id"]}, {"$set": update})
            if tester:
                await db.app_owner_testers.update_one({"email": email}, {"$set": {"status": "access_granted", "user_id": str(user_doc["_id"]), "updated_at": now_utc()}})
        except Exception:
            pass
        user_doc.update(update)
        return user_doc

    async def patched_me(request: Request):
        user_doc = await current_user_doc(request)
        user_doc = await maybe_unlock(user_doc)
        return user_payload(user_doc)

    async def patched_billing_status(request: Request):
        user_doc = await current_user_doc(request)
        user_doc = await maybe_unlock(user_doc)
        plan = user_doc.get("plan") or "none"
        status = user_doc.get("subscription_status") or "none"
        return safe({
            "success": True,
            "source": "churvox_owner_access_safety_patch",
            "plan": plan,
            "plan_name": {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command"}.get(plan, plan),
            "subscription_status": status,
            "trial_ends_at": user_doc.get("trial_ends_at"),
            "stripe_customer_id": user_doc.get("stripe_customer_id"),
            "stripe_subscription_id": user_doc.get("stripe_subscription_id"),
            "free_tester_access": bool(user_doc.get("free_tester_access")),
            "free_tester_until": user_doc.get("free_tester_until"),
            "has_app_access": bool(user_doc.get("has_app_access")),
            "billing_lock_reason": user_doc.get("billing_lock_reason"),
            "billing_country": user_doc.get("billing_country", "NZ"),
        })

    for path, method, endpoint in [
        ("/api/auth/me", "GET", patched_me),
        ("/api/billing/subscription-status", "GET", patched_billing_status),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])

    try:
        try:
            from churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router
            from churvox_command_human_mimic_live_routes import build_command_human_mimic_live_router
        except Exception:
            from backend.churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router
            from backend.churvox_command_human_mimic_live_routes import build_command_human_mimic_live_router

        remove_route(app, "/api/command/human-mimic-marker", "GET")
        remove_route(app, "/api/command/human-mimic-marker", "POST")
        remove_route(app, "/api/command/scan", "POST")
        app.include_router(build_command_human_mimic_marker_router(), prefix="/api")
        app.include_router(build_command_human_mimic_live_router(db, get_current_user, ObjectId), prefix="/api")
        app.state.churvox_guarded_human_office_routes_installed = True
        app.state.churvox_human_mimic_version = "human-mimic-intelligence-v3"
    except Exception as exc:
        print(f"Churvox strict human-office route install skipped: {exc}", file=sys.stderr)

    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None

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


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())
for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
