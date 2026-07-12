from __future__ import annotations

from datetime import datetime, timezone, timedelta
import importlib
import importlib.abc
import importlib.machinery
import sys

from fastapi import Body, HTTPException, Request

TARGETS = {"server", "backend.server"}
INSTALLED = set()
OWNER_EMAIL = "hello@churvox.com"
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
PACK_LABELS = {
    "full_access": "Full tester access",
    "operator_pack": "Operator free pack",
    "command_pack": "Command free pack",
    "command_growth_pack": "Command Growth Pack",
    "accounting_sync": "Accounting Sync Add-on",
}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def plan_key(value, default="pro"):
    return PLAN_ALIAS.get(lower(value), default)


def display_email_of(doc):
    return clean(
        (doc or {}).get("display_email")
        or (doc or {}).get("original_email")
        or (doc or {}).get("typed_email")
        or (doc or {}).get("email")
        or (doc or {}).get("canonical_email")
        or (doc or {}).get("user_email")
        or (doc or {}).get("target_email")
    )


def email_of(doc):
    return lower(
        (doc or {}).get("email")
        or (doc or {}).get("canonical_email")
        or (doc or {}).get("user_email")
        or (doc or {}).get("owner_email")
        or (doc or {}).get("target_email")
        or display_email_of(doc)
    )


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        output = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "hash", "token", "secret"]):
                continue
            output["id" if key == "_id" else key] = safe(item)
        return output
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module):
    module_name = getattr(module, "__name__", "")
    if module_name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None:
        return

    def oid(value):
        try:
            if ObjectId:
                return ObjectId(str(value))
        except Exception:
            return None
        return None

    async def current_user_doc(request: Request):
        current = await get_current_user(request)
        uid = oid(current.get("id") or current.get("_id") or current.get("user_id")) if isinstance(current, dict) else None
        user_doc = await db.users.find_one({"_id": uid}) if uid else None
        if not user_doc and isinstance(current, dict) and current.get("email"):
            user_doc = await db.users.find_one({"email": lower(current.get("email"))})
        return user_doc or dict(current or {})

    async def require_owner(request: Request):
        user = await current_user_doc(request)
        if email_of(user) != OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to hello@churvox.com")
        return user

    async def find_user(identifier):
        ident = lower(identifier)
        if not ident:
            return None
        clauses = [{"email": ident}, {"canonical_email": ident}]
        maybe = oid(ident)
        if maybe:
            clauses.append({"_id": maybe})
        return await db.users.find_one({"$or": clauses})

    async def hq_control_access(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        identifier = clean(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
        canonical = lower(identifier)
        display_email = clean(payload.get("display_email") or payload.get("original_email") or identifier)
        if not canonical:
            raise HTTPException(status_code=400, detail="User email or identifier is required")
        if canonical == OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Cannot change the platform owner account")

        action = lower(payload.get("action") or "grant")
        plan = plan_key(payload.get("plan") or "operator")
        days = max(1, min(int(payload.get("days") or 90), 1095))
        until = now_utc() + timedelta(days=days)
        pack = lower(payload.get("pack") or "full_access") or "full_access"
        pack_label = PACK_LABELS.get(pack, pack)
        note = clean(payload.get("note"))
        user_doc = await find_user(canonical)

        tester_update = {
            "email": canonical,
            "canonical_email": canonical,
            "display_email": display_email or canonical,
            "original_email": display_email or canonical,
            "plan": plan,
            "pack": pack,
            "pack_label": pack_label,
            "days": days,
            "note": note,
            "updated_at": now_utc(),
            "controlled_by": email_of(owner),
            "last_control_action": action,
        }

        if action in {"grant", "grant_free", "grant_pack", "free_pack"}:
            tester_update.update({
                "status": "access_granted" if user_doc else "pending_signup",
                "free_until": until,
                "free_tester_until": until,
                "revoked_at": None,
            })
            if user_doc:
                user_update = {
                    "free_tester_access": True,
                    "free_tester_until": until,
                    "free_tester_note": note,
                    "plan": plan,
                    "subscription_status": "tester_free",
                    "checkout_verified_by_stripe": True,
                    "billing_lock_reason": None,
                    "has_app_access": True,
                    "app_owner_free_pack": pack,
                    "app_owner_free_pack_label": pack_label,
                    "canonical_email": canonical,
                    "display_email": display_email or canonical,
                    "original_email": display_email or canonical,
                    "updated_at": now_utc(),
                }
                await db.users.update_one({"_id": user_doc["_id"]}, {"$set": user_update, "$push": {"hq_free_packs": {"pack": pack, "label": pack_label, "plan": plan, "until": until, "granted_at": now_utc(), "granted_by": email_of(owner)}}})
                user_doc.update(user_update)
        elif action in {"revoke", "revoke_free"}:
            tester_update.update({
                "status": "revoked",
                "revoked_at": now_utc(),
                "free_until": None,
                "free_tester_until": None,
            })
            if user_doc:
                user_update = {
                    "free_tester_access": False,
                    "free_tester_revoked_at": now_utc(),
                    "updated_at": now_utc(),
                }
                if not user_doc.get("stripe_subscription_id"):
                    user_update.update({
                        "subscription_status": "payment_required",
                        "checkout_verified_by_stripe": False,
                        "billing_lock_reason": "payment_required",
                        "has_app_access": False,
                    })
                await db.users.update_one({"_id": user_doc["_id"]}, {"$set": user_update})
                user_doc.update(user_update)
        elif action in {"lock", "disable"}:
            tester_update.update({"status": "locked", "locked_at": now_utc()})
            if user_doc:
                user_update = {
                    "free_tester_access": False,
                    "subscription_status": "locked",
                    "checkout_verified_by_stripe": False,
                    "billing_lock_reason": "app_owner_locked",
                    "has_app_access": False,
                    "locked_by_app_owner": True,
                    "locked_at": now_utc(),
                    "locked_note": note,
                    "updated_at": now_utc(),
                }
                await db.users.update_one({"_id": user_doc["_id"]}, {"$set": user_update})
                user_doc.update(user_update)
        else:
            raise HTTPException(status_code=400, detail="Unknown control action")

        await db.app_owner_testers.update_one({"email": canonical}, {"$set": tester_update, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
        result = {"action": action, "target_email": canonical, "display_email": display_email or canonical, "user_found": bool(user_doc), "tester": tester_update, "user": user_doc}
        try:
            await db.app_owner_control_log.insert_one({"created_at": now_utc(), "owner_email": email_of(owner), "action": action, "target_email": canonical, "display_email": display_email or canonical, "payload": safe(payload), "result": safe(result)})
        except Exception:
            pass

        message = "Access updated" if user_doc else "Tester invite updated. They need to sign up with this email before app access can be activated."
        return safe({"success": True, "message": message, **result})

    remove_route(app, "/api/admin/owner/control-access", "POST")
    app.add_api_route("/api/admin/owner/control-access", hq_control_access, methods=["POST"])
    INSTALLED.add(module_name)


class Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        return self.original_loader.create_module(spec) if hasattr(self.original_loader, "create_module") else None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
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
