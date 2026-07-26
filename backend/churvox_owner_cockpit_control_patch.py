from __future__ import annotations

from datetime import datetime, timezone, timedelta
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
OWNER_EMAIL = "hello@churvox.com"
PLAN_ALIAS = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
PACK_LABELS = {"full_access": "Full tester access", "command_growth_pack": "Command Growth Pack", "accounting_sync": "Accounting Sync Add-on", "operator_pack": "Operator free pack", "command_pack": "Command free pack"}
PREPARED_COLLECTIONS = {
    "message_drafts",
    "payroll_reviews",
    "accounting_reviews",
    "quality_reviews",
    "client_memory_reviews",
    "operations_reviews",
    "invoice_reviews",
}


def now_utc():
    return datetime.now(timezone.utc)


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def plan_key(value, default="pro"):
    return PLAN_ALIAS.get(lower(value), default)


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "hash", "token", "secret"]):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [r for r in app.router.routes if not route_matches(r, path, method)]
    except Exception:
        pass


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    Body = getattr(module, "Body", None)
    HTTPException = getattr(module, "HTTPException", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or not get_current_user or Request is None or Body is None or HTTPException is None or ObjectId is None:
        return

    def oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def require_owner(request: Request):
        user = await get_current_user(request)
        if lower(user.get("email")) != OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="App owner cockpit is locked to hello@churvox.com")
        return user

    async def require_business_owner(request: Request):
        user = await get_current_user(request)
        role = lower(user.get("role") or user.get("user_role") or user.get("account_type"))
        allowed = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}
        if role not in allowed and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can read prepared Command records")
        return user

    def business_query(user):
        business_id = text(user.get("business_id") or user.get("businessId") or user.get("id") or user.get("_id"))
        if not business_id:
            raise HTTPException(status_code=400, detail="Business id is missing")
        values = [business_id]
        maybe = oid(business_id)
        if maybe is not None:
            values.append(maybe)
        return {
            "$or": [
                {"business_id": {"$in": values}},
                {"businessId": {"$in": values}},
                {"contractor_id": {"$in": values}},
                {"owner_business_id": {"$in": values}},
            ]
        }

    async def find_user(identifier):
        ident = lower(identifier)
        if not ident:
            return None
        clauses = [{"email": ident}]
        maybe = oid(ident)
        if maybe:
            clauses.append({"_id": maybe})
        return await db.users.find_one({"$or": clauses})

    async def log(owner, action, payload, target=None, result=None):
        doc = {"created_at": now_utc(), "owner_email": owner.get("email"), "action": action, "target_email": lower((target or {}).get("email") or payload.get("email") or payload.get("identifier")), "payload": safe(payload), "result": safe(result or {})}
        try:
            await db.app_owner_control_log.insert_one(doc)
        except Exception:
            pass
        return doc

    async def tester_intake(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        email = lower(payload.get("email"))
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="Tester email is required")
        plan = plan_key(payload.get("plan") or "operator")
        days = max(1, min(int(payload.get("days") or 60), 1095))
        pack = lower(payload.get("pack") or "full_access") or "full_access"
        until = now_utc() + timedelta(days=days)
        tester_doc = {"email": email, "name": text(payload.get("name")), "business_name": text(payload.get("business_name")), "plan": plan, "pack": pack, "pack_label": PACK_LABELS.get(pack, pack), "days": days, "free_until": until, "note": text(payload.get("note")), "status": "pending_signup", "created_by": owner.get("email"), "updated_at": now_utc()}
        existing_user = await find_user(email)
        if existing_user:
            update = {"free_tester_access": True, "free_tester_until": until, "free_tester_note": tester_doc["note"], "plan": plan, "subscription_status": "tester_free", "checkout_verified_by_stripe": True, "billing_lock_reason": None, "has_app_access": True, "app_owner_free_pack": pack, "app_owner_free_pack_label": tester_doc["pack_label"], "app_owner_last_controlled_at": now_utc(), "updated_at": now_utc()}
            await db.users.update_one({"_id": existing_user["_id"]}, {"$set": update, "$push": {"hq_free_packs": {"pack": pack, "label": tester_doc["pack_label"], "plan": plan, "until": until, "granted_at": now_utc(), "granted_by": owner.get("email")}}})
            existing_user.update(update)
            tester_doc["status"] = "access_granted"
            tester_doc["user_id"] = str(existing_user["_id"])
        await db.app_owner_testers.update_one({"email": email}, {"$set": tester_doc, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
        await log(owner, "tester_intake", payload, existing_user, tester_doc)
        return {"success": True, "message": "Tester saved and access granted" if existing_user else "Tester saved. They need to sign up with this email, then access can be granted.", "tester": safe(tester_doc), "user": safe(existing_user)}

    async def control_access(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        user = await find_user(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
        if not user:
            raise HTTPException(status_code=404, detail="User not found. Add them as a tester first or ask them to sign up.")
        if lower(user.get("email")) == OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Cannot change the platform owner account")
        action = lower(payload.get("action") or "grant")
        plan = plan_key(payload.get("plan") or user.get("plan") or "operator")
        days = max(1, min(int(payload.get("days") or 60), 1095))
        until = now_utc() + timedelta(days=days)
        pack = lower(payload.get("pack") or "full_access") or "full_access"
        update = {"app_owner_last_controlled_at": now_utc(), "app_owner_last_controlled_by": owner.get("email"), "updated_at": now_utc()}
        push = None
        if action in {"grant", "grant_free", "grant_pack", "free_pack"}:
            update.update({"free_tester_access": True, "free_tester_until": until, "free_tester_note": text(payload.get("note")), "plan": plan, "subscription_status": "tester_free", "checkout_verified_by_stripe": True, "billing_lock_reason": None, "has_app_access": True, "app_owner_free_pack": pack, "app_owner_free_pack_label": PACK_LABELS.get(pack, pack)})
            push = {"pack": pack, "label": PACK_LABELS.get(pack, pack), "plan": plan, "until": until, "granted_at": now_utc(), "granted_by": owner.get("email")}
        elif action in {"revoke", "revoke_free"}:
            update.update({"free_tester_access": False, "free_tester_revoked_at": now_utc()})
            if not user.get("stripe_subscription_id"):
                update.update({"subscription_status": "payment_required", "checkout_verified_by_stripe": False, "billing_lock_reason": "payment_required", "has_app_access": False})
        elif action in {"lock", "disable"}:
            update.update({"free_tester_access": False, "subscription_status": "locked", "checkout_verified_by_stripe": False, "billing_lock_reason": "app_owner_locked", "has_app_access": False, "locked_by_app_owner": True, "locked_at": now_utc(), "locked_note": text(payload.get("note"))})
        else:
            raise HTTPException(status_code=400, detail="Unknown action")
        command = {"$set": update}
        if push:
            command["$push"] = {"hq_free_packs": push}
        await db.users.update_one({"_id": user["_id"]}, command)
        user.update(update)
        await log(owner, action, payload, user, update)
        return {"success": True, "message": "Access updated", "user": safe(user), "update": safe(update)}

    async def control_log(request: Request):
        await require_owner(request)
        rows = await db.app_owner_control_log.find({}).sort("created_at", -1).limit(200).to_list(length=200)
        testers = await db.app_owner_testers.find({}).sort("updated_at", -1).limit(500).to_list(length=500)
        return {"success": True, "items": safe(rows), "testers": safe(testers)}

    async def prepared_records(collection_name: str, request: Request, limit: int = 30):
        user = await require_business_owner(request)
        collection = lower(collection_name)
        if collection not in PREPARED_COLLECTIONS:
            raise HTTPException(status_code=404, detail="Prepared record collection is not available")
        bounded_limit = max(1, min(int(limit or 30), 100))
        rows = await db[collection].find(business_query(user)).sort("created_at", -1).limit(bounded_limit).to_list(length=bounded_limit)
        clean_rows = safe(rows)
        return {
            "success": True,
            "collection": collection,
            "records": clean_rows,
            "items": clean_rows,
            "data": clean_rows,
            "count": len(clean_rows),
            "safety": "Owner-only business-scoped read. No record was changed, sent, paid, filed or synced.",
        }

    async def prepared_records_readiness(request: Request):
        await require_business_owner(request)
        return {
            "success": True,
            "ready": True,
            "collections": sorted(PREPARED_COLLECTIONS),
            "route": "/api/command/prepared-records/{collection_name}",
            "safety": "Read-only and business-scoped.",
        }

    routes = [
        ("POST", "/api/admin/owner/tester-intake", tester_intake),
        ("POST", "/api/admin/owner/control-access", control_access),
        ("GET", "/api/admin/owner/control-log", control_log),
        ("GET", "/api/command/prepared-records/{collection_name}", prepared_records),
        ("GET", "/api/command/prepared-records-readiness", prepared_records_readiness),
    ]
    for method, route_path, endpoint in routes:
        remove_route(app, route_path, method)
        app.add_api_route(route_path, endpoint, methods=[method])
    INSTALLED.add(name)


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
