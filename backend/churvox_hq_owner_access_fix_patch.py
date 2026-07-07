from __future__ import annotations

from datetime import datetime, timezone, timedelta
import os
from urllib.parse import urlencode

INSTALLED = set()
PLAN_ALIAS = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
PLAN_VALUE = {"solo": 39, "team": 89, "pro": 149, "enterprise": 299}
PLAN_LABELS = {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command", "none": "No plan", "": "No plan"}
PACK_LABELS = {"full_access": "Full tester access", "operator_pack": "Operator free pack", "command_pack": "Command free pack", "command_growth_pack": "Command Growth Pack", "accounting_sync": "Accounting Sync Add-on"}
DEFAULT_OWNER_EMAILS = {"hello@churvox.com", "howardjennings77@gmail.com"}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def owner_emails():
    raw = os.environ.get("PLATFORM_OWNER_EMAILS") or os.environ.get("CHURVOX_PLATFORM_OWNER_EMAILS") or ""
    configured = {lower(item) for item in raw.replace(";", ",").split(",") if lower(item)}
    return DEFAULT_OWNER_EMAILS | configured


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
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


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


def email_of(doc):
    return lower((doc or {}).get("email") or (doc or {}).get("user_email") or (doc or {}).get("owner_email"))


def is_free_tester(user):
    if not (user or {}).get("free_tester_access"):
        return False
    until = parse_dt((user or {}).get("free_tester_until") or (user or {}).get("free_until"))
    return not until or until >= now_utc()


def status_of(user):
    return lower((user or {}).get("subscription_status") or (user or {}).get("billing_status") or (user or {}).get("status"))


def user_plan(user):
    return PLAN_ALIAS.get(lower((user or {}).get("plan") or (user or {}).get("subscription_plan") or (user or {}).get("plan_type")), "none")


def is_paid(user):
    return not is_free_tester(user) and status_of(user) in {"active", "paid"}


def is_trial(user):
    return status_of(user) == "trialing"


def safe_doc(doc):
    if not doc:
        return None
    item = safe(dict(doc))
    plan = user_plan(item)
    item["plan_name"] = PLAN_LABELS.get(plan, plan.title() if plan else "No plan")
    item["is_free_tester"] = is_free_tester(item)
    item["is_paid_plan"] = is_paid(item)
    item["is_trialing"] = is_trial(item)
    item["hq_record_type"] = "internal" if email_of(item) in owner_emails() else "customer"
    item["hq_can_remove"] = email_of(item) not in owner_emails()
    return item


def front_url():
    return clean(os.environ.get("FRONTEND_URL") or os.environ.get("CHURVOX_FRONTEND_URL") or "https://www.churvox.com").rstrip("/")


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

    async def require_owner(request: Request):
        user = await get_current_user(request)
        email = email_of(user)
        allowed = email in owner_emails() or bool(user.get("is_platform_owner") or user.get("is_admin")) or lower(user.get("role")) in {"platform_owner", "superadmin"}
        checker = getattr(module, "is_platform_owner", None)
        if not allowed and checker:
            try:
                allowed = bool(checker(user))
            except Exception:
                allowed = False
        if not allowed:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to the platform owner account")
        return user

    def oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def list_collection(name, limit=1000):
        try:
            cursor = db[name].find({})
            try:
                cursor = cursor.sort("created_at", -1)
            except Exception:
                cursor = cursor.sort("_id", -1)
            return await cursor.limit(limit).to_list(length=limit)
        except Exception:
            return []

    async def find_user(identifier):
        ident = lower(identifier)
        clauses = []
        if ident:
            clauses.append({"email": ident})
            maybe = oid(ident)
            if maybe:
                clauses.append({"_id": maybe})
        if not clauses:
            return None
        return await db.users.find_one({"$or": clauses})

    async def log(owner, action, payload, target=None, result=None):
        doc = {"created_at": now_utc(), "owner_email": email_of(owner), "action": action, "target_email": email_of(target) or lower((payload or {}).get("email") or (payload or {}).get("identifier")), "payload": safe(payload or {}), "result": safe(result or {})}
        try:
            await db.app_owner_control_log.insert_one(doc)
        except Exception:
            pass
        return doc

    async def overview(request: Request):
        await require_owner(request)
        users_raw = await list_collection("users", 2000)
        users = [safe_doc(user) for user in users_raw]
        businesses = [safe_doc(item) for item in await list_collection("businesses", 1000)]
        jobs = [safe_doc(item) for item in await list_collection("jobs", 1200)]
        clients = [safe_doc(item) for item in await list_collection("clients", 1200)]
        events = [safe_doc(item) for item in await list_collection("platform_visits", 300)]
        active_now = [u for u in users if parse_dt(u.get("last_active") or u.get("last_seen") or u.get("updated_at")) and (now_utc() - parse_dt(u.get("last_active") or u.get("last_seen") or u.get("updated_at"))).total_seconds() < 3600]
        active_today = [u for u in users if parse_dt(u.get("last_active") or u.get("last_seen") or u.get("updated_at")) and (now_utc() - parse_dt(u.get("last_active") or u.get("last_seen") or u.get("updated_at"))).total_seconds() < 86400]
        paid = [u for u in users if is_paid(u)]
        testers = [u for u in users if is_free_tester(u)]
        revenue = sum(PLAN_VALUE.get(user_plan(user), 0) for user in paid)
        return safe({"success": True, "generated_at": now_utc(), "metrics": {"total_users": len(users), "customer_users": len([u for u in users if u.get("hq_record_type") != "internal"]), "internal_users": len([u for u in users if u.get("hq_record_type") == "internal"]), "paid_users": len(paid), "free_tester_users": len(testers), "active_now": len(active_now), "active_today": len(active_today), "total_businesses": len(businesses), "total_jobs": len(jobs), "total_clients": len(clients), "monthly_revenue_estimate": revenue}, "lists": {"all_users": users, "users": [u for u in users if u.get("hq_record_type") != "internal"], "free_testers": testers, "paid_users": paid, "active_now": active_now, "businesses": businesses, "jobs": jobs, "clients": clients, "events": events, "activity": events}, "collections_seen": ["users", "businesses", "jobs", "clients", "platform_visits"]})

    async def plan_report(request: Request):
        await require_owner(request)
        users = [safe_doc(user) for user in await list_collection("users", 2500)]
        paid = [u for u in users if is_paid(u)]
        trials = [u for u in users if is_trial(u)]
        testers = [u for u in users if is_free_tester(u)]
        counts = {}
        for user in users:
            key = user_plan(user)
            counts[key] = counts.get(key, 0) + 1
        return safe({"success": True, "generated_at": now_utc(), "plan_counts": counts, "paid_users": paid, "trial_users": trials, "free_testers": testers, "monthly_revenue_estimate": sum(PLAN_VALUE.get(user_plan(user), 0) for user in paid)})

    async def control_log(request: Request):
        await require_owner(request)
        items = [safe_doc(item) for item in await list_collection("app_owner_control_log", 300)]
        return {"success": True, "items": items, "count": len(items)}

    async def retention_status(request: Request):
        await require_owner(request)
        logs = [safe_doc(item) for item in await list_collection("lifecycle_email_log", 120)]
        failures = [item for item in logs if item and (item.get("error") or item.get("success") is False or item.get("email_sent") is False)]
        return {"success": True, "enabled": True, "items": logs, "failures": failures[:20], "last_result": {"success": True, "checked": len(logs), "sent": len([x for x in logs if x and x.get("email_sent")]), "failures": failures[:20]}, "message": "Retention status loaded"}

    async def tester_intake(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        email = lower(payload.get("email"))
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="Tester email is required")
        plan = plan_key(payload.get("plan") or "operator")
        days = max(1, min(int(payload.get("days") or 90), 1095))
        pack = lower(payload.get("pack") or "full_access") or "full_access"
        until = now_utc() + timedelta(days=days)
        tester_doc = {"email": email, "name": clean(payload.get("name")), "business_name": clean(payload.get("business_name")), "plan": plan, "pack": pack, "pack_label": PACK_LABELS.get(pack, pack), "days": days, "free_until": until, "note": clean(payload.get("note")), "status": "pending_signup", "created_by": email_of(owner), "updated_at": now_utc()}
        existing = await db.users.find_one({"email": email})
        await db.app_owner_testers.update_one({"email": email}, {"$set": tester_doc, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
        if existing:
            update = {"free_tester_access": True, "free_tester_until": until, "free_tester_note": tester_doc["note"], "plan": plan, "subscription_status": "tester_free", "checkout_verified_by_stripe": True, "billing_lock_reason": None, "has_app_access": True, "app_owner_free_pack": pack, "app_owner_free_pack_label": tester_doc["pack_label"], "app_owner_last_controlled_at": now_utc(), "updated_at": now_utc()}
            await db.users.update_one({"_id": existing["_id"]}, {"$set": update})
            existing.update(update)
            tester_doc["status"] = "access_granted"
            tester_doc["user_id"] = str(existing["_id"])
            await db.app_owner_testers.update_one({"email": email}, {"$set": {"status": "access_granted", "user_id": str(existing["_id"]), "updated_at": now_utc()}})
        path = "/login" if existing else "/signup"
        query = {"email": email}
        if not existing:
            query["tester"] = "1"
        access_link = f"{front_url()}{path}?{urlencode(query)}"
        result = {"tester": tester_doc, "signup_link": None if existing else access_link, "login_link": access_link if existing else None}
        await log(owner, "tester_intake", payload, existing, result)
        return safe({"success": True, "message": "Tester access granted" if existing else "Tester saved; send them the signup link", "tester": tester_doc, "user": existing, "signup_link": None if existing else access_link, "login_link": access_link if existing else None})

    async def control_access(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        user = await find_user(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if email_of(user) in owner_emails():
            raise HTTPException(status_code=403, detail="Cannot change a platform owner account")
        action = lower(payload.get("action") or "grant")
        if action in {"revoke", "remove", "disable"}:
            update = {"free_tester_access": False, "has_app_access": False, "subscription_status": "access_revoked", "billing_lock_reason": "revoked_by_hq", "updated_at": now_utc()}
            message = "Access revoked"
        else:
            plan = plan_key(payload.get("plan") or user.get("plan") or "operator")
            days = max(1, min(int(payload.get("days") or 90), 1095))
            pack = lower(payload.get("pack") or "full_access") or "full_access"
            update = {"free_tester_access": True, "free_tester_until": now_utc() + timedelta(days=days), "free_tester_note": clean(payload.get("note")), "plan": plan, "subscription_status": "tester_free", "checkout_verified_by_stripe": True, "billing_lock_reason": None, "has_app_access": True, "app_owner_free_pack": pack, "app_owner_free_pack_label": PACK_LABELS.get(pack, pack), "updated_at": now_utc()}
            message = "Access granted"
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        user.update(update)
        await log(owner, "control_access", payload, user, {"message": message})
        return safe({"success": True, "message": message, "user": user})

    for path, method, endpoint in [
        ("/api/admin/owner-overview", "GET", overview),
        ("/api/admin/owner/plan-report", "GET", plan_report),
        ("/api/admin/owner/control-log", "GET", control_log),
        ("/api/admin/owner/retention-email-status", "GET", retention_status),
        ("/api/admin/owner/tester-intake", "POST", tester_intake),
        ("/api/admin/owner/control-access", "POST", control_access),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(name)
