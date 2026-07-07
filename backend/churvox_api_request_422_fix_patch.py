from datetime import datetime, timezone, timedelta
import os
from urllib.parse import urlencode

from fastapi import Body, HTTPException, Request

INSTALLED = set()
OWNER_EMAILS = {"hello@churvox.com", "howardjennings77@gmail.com"}
PLAN_ALIAS = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
PLAN_VALUE = {"solo": 39, "team": 89, "pro": 149, "enterprise": 299}
PLAN_LABELS = {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command", "none": "No plan", "": "No plan"}
PACK_LABELS = {"full_access": "Full tester access", "operator_pack": "Operator free pack", "command_pack": "Command free pack", "command_growth_pack": "Command Growth Pack", "accounting_sync": "Accounting Sync Add-on"}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def configured_owner_emails():
    raw = os.environ.get("PLATFORM_OWNER_EMAILS") or os.environ.get("CHURVOX_PLATFORM_OWNER_EMAILS") or ""
    return OWNER_EMAILS | {lower(item) for item in raw.replace(";", ",").split(",") if lower(item)}


def front_url():
    return clean(os.environ.get("FRONTEND_URL") or os.environ.get("CHURVOX_FRONTEND_URL") or "https://www.churvox.com").rstrip("/")


def plan_key(value, default="pro"):
    return PLAN_ALIAS.get(lower(value), default)


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


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            key_text = str(key).lower()
            if any(word in key_text for word in ["password", "hash", "token", "secret"]):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def email_of(doc):
    return lower((doc or {}).get("email") or (doc or {}).get("user_email") or (doc or {}).get("owner_email"))


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]


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
    item["hq_record_type"] = "internal" if email_of(item) in configured_owner_emails() else "customer"
    item["hq_can_remove"] = email_of(item) not in configured_owner_emails()
    return item


def make_user_payload(user_doc):
    uid = str(user_doc.get("_id") or user_doc.get("id") or "")
    bid = str(user_doc.get("business_id") or user_doc.get("business") or user_doc.get("_id") or "")
    payload = safe({
        "success": True,
        "id": uid,
        "email": user_doc.get("email"),
        "name": user_doc.get("name") or user_doc.get("business_name") or "Churvox user",
        "business_name": user_doc.get("business_name"),
        "role": user_doc.get("role") or "employer",
        "plan": user_doc.get("plan") or "none",
        "subscription_status": user_doc.get("subscription_status") or "none",
        "trial_ends_at": user_doc.get("trial_ends_at"),
        "free_tester_access": bool(user_doc.get("free_tester_access")),
        "free_tester_until": user_doc.get("free_tester_until"),
        "has_app_access": bool(user_doc.get("has_app_access")),
        "billing_lock_reason": user_doc.get("billing_lock_reason"),
        "email_verified": user_doc.get("email_verified"),
        "gst_rate": user_doc.get("gst_rate"),
        "trade_type": user_doc.get("trade_type", "other"),
        "business_id": bid,
    })
    payload["user"] = dict(payload)
    payload["user"].pop("user", None)
    return payload


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

    def oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def get_user_doc(request: Request):
        current = await get_current_user(request)
        uid = oid(current.get("id") or current.get("_id") or current.get("user_id"))
        user_doc = await db.users.find_one({"_id": uid}) if uid else None
        if not user_doc and current.get("email"):
            user_doc = await db.users.find_one({"email": lower(current.get("email"))})
        if not user_doc:
            user_doc = dict(current)
        return user_doc

    async def grant_if_tester(user_doc):
        email = email_of(user_doc)
        if not email or "_id" not in user_doc:
            return user_doc
        tester = await db.app_owner_testers.find_one({"email": email})
        if not tester:
            return user_doc
        until = parse_dt(tester.get("free_until")) or parse_dt(tester.get("free_tester_until")) or (now_utc() + timedelta(days=int(tester.get("days") or 90)))
        if until and until < now_utc():
            return user_doc
        pack = lower(tester.get("pack") or "full_access") or "full_access"
        update = {
            "free_tester_access": True,
            "free_tester_until": until,
            "free_tester_note": clean(tester.get("note")),
            "plan": plan_key(tester.get("plan") or "operator"),
            "subscription_status": "tester_free",
            "checkout_verified_by_stripe": True,
            "billing_lock_reason": None,
            "has_app_access": True,
            "app_owner_free_pack": pack,
            "app_owner_free_pack_label": tester.get("pack_label") or PACK_LABELS.get(pack, pack),
            "updated_at": now_utc(),
        }
        await db.users.update_one({"_id": user_doc["_id"]}, {"$set": update})
        await db.app_owner_testers.update_one({"email": email}, {"$set": {"status": "access_granted", "user_id": str(user_doc["_id"]), "updated_at": now_utc()}})
        user_doc.update(update)
        return user_doc

    async def require_owner(request: Request):
        user = await get_user_doc(request)
        email = email_of(user)
        allowed = email in configured_owner_emails() or bool(user.get("is_platform_owner") or user.get("is_admin")) or lower(user.get("role")) in {"platform_owner", "superadmin"}
        checker = getattr(module, "is_platform_owner", None)
        if not allowed and checker:
            try:
                allowed = bool(checker(user))
            except Exception:
                allowed = False
        if not allowed:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to the platform owner account")
        return user

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

    async def patched_me(request: Request):
        user_doc = await get_user_doc(request)
        user_doc = await grant_if_tester(user_doc)
        return make_user_payload(user_doc)

    async def patched_billing_status(request: Request):
        user_doc = await get_user_doc(request)
        user_doc = await grant_if_tester(user_doc)
        plan = user_doc.get("plan") or "none"
        return safe({
            "success": True,
            "plan": plan,
            "plan_name": PLAN_LABELS.get(plan, plan),
            "subscription_status": user_doc.get("subscription_status") or "none",
            "trial_ends_at": user_doc.get("trial_ends_at"),
            "stripe_customer_id": user_doc.get("stripe_customer_id"),
            "stripe_subscription_id": user_doc.get("stripe_subscription_id"),
            "free_tester_access": bool(user_doc.get("free_tester_access")),
            "free_tester_until": user_doc.get("free_tester_until"),
            "has_app_access": bool(user_doc.get("has_app_access")),
            "billing_lock_reason": user_doc.get("billing_lock_reason"),
            "billing_country": user_doc.get("billing_country", "NZ"),
        })

    async def overview(request: Request):
        await require_owner(request)
        users_raw = await list_collection("users", 2500)
        users = [safe_doc(user) for user in users_raw]
        businesses = [safe_doc(item) for item in await list_collection("businesses", 1000)]
        jobs = [safe_doc(item) for item in await list_collection("jobs", 1200)]
        clients = [safe_doc(item) for item in await list_collection("clients", 1200)]
        events = [safe_doc(item) for item in await list_collection("platform_visits", 300)]
        paid = [u for u in users if is_paid(u)]
        testers = [u for u in users if is_free_tester(u)]
        active_now = [u for u in users if parse_dt(u.get("last_active") or u.get("last_seen") or u.get("updated_at")) and (now_utc() - parse_dt(u.get("last_active") or u.get("last_seen") or u.get("updated_at"))).total_seconds() < 3600]
        active_today = [u for u in users if parse_dt(u.get("last_active") or u.get("last_seen") or u.get("updated_at")) and (now_utc() - parse_dt(u.get("last_active") or u.get("last_seen") or u.get("updated_at"))).total_seconds() < 86400]
        return safe({
            "success": True,
            "generated_at": now_utc(),
            "metrics": {
                "total_users": len(users),
                "customer_users": len([u for u in users if u.get("hq_record_type") != "internal"]),
                "internal_users": len([u for u in users if u.get("hq_record_type") == "internal"]),
                "paid_users": len(paid),
                "free_tester_users": len(testers),
                "active_now": len(active_now),
                "active_today": len(active_today),
                "total_businesses": len(businesses),
                "total_jobs": len(jobs),
                "total_clients": len(clients),
                "monthly_revenue_estimate": sum(PLAN_VALUE.get(user_plan(user), 0) for user in paid),
            },
            "lists": {"all_users": users, "users": [u for u in users if u.get("hq_record_type") != "internal"], "free_testers": testers, "paid_users": paid, "active_now": active_now, "businesses": businesses, "jobs": jobs, "clients": clients, "events": events, "activity": events},
        })

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
            existing = await grant_if_tester(existing)
            tester_doc["status"] = "access_granted"
            tester_doc["user_id"] = str(existing.get("_id"))
        link_path = "/login" if existing else "/signup"
        query = {"email": email}
        if not existing:
            query["tester"] = "1"
        access_link = f"{front_url()}{link_path}?{urlencode(query)}"
        await db.app_owner_control_log.insert_one({"created_at": now_utc(), "owner_email": email_of(owner), "action": "tester_intake", "target_email": email, "payload": safe(payload), "result": safe({"tester": tester_doc, "access_link": access_link})})
        return safe({"success": True, "message": "Tester access granted" if existing else "Tester saved; send them the signup link", "tester": tester_doc, "user": existing, "signup_link": None if existing else access_link, "login_link": access_link if existing else None})

    async def control_access(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        ident = lower(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
        clauses = []
        if ident:
            clauses.append({"email": ident})
            maybe = oid(ident)
            if maybe:
                clauses.append({"_id": maybe})
        user = await db.users.find_one({"$or": clauses}) if clauses else None
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if email_of(user) in configured_owner_emails():
            raise HTTPException(status_code=403, detail="Cannot change a platform owner account")
        action = lower(payload.get("action") or "grant")
        if action in {"revoke", "remove", "disable"}:
            update = {"free_tester_access": False, "has_app_access": False, "subscription_status": "access_revoked", "billing_lock_reason": "revoked_by_hq", "updated_at": now_utc()}
            message = "Access revoked"
        else:
            pack = lower(payload.get("pack") or "full_access") or "full_access"
            update = {"free_tester_access": True, "free_tester_until": now_utc() + timedelta(days=max(1, min(int(payload.get("days") or 90), 1095))), "plan": plan_key(payload.get("plan") or user.get("plan") or "operator"), "subscription_status": "tester_free", "checkout_verified_by_stripe": True, "billing_lock_reason": None, "has_app_access": True, "app_owner_free_pack": pack, "app_owner_free_pack_label": PACK_LABELS.get(pack, pack), "updated_at": now_utc()}
            message = "Access granted"
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        user.update(update)
        await db.app_owner_control_log.insert_one({"created_at": now_utc(), "owner_email": email_of(owner), "action": "control_access", "target_email": email_of(user), "payload": safe(payload), "result": {"message": message}})
        return safe({"success": True, "message": message, "user": user})

    routes = [
        ("/api/auth/me", "GET", patched_me),
        ("/api/billing/subscription-status", "GET", patched_billing_status),
        ("/api/admin/owner-overview", "GET", overview),
        ("/api/admin/owner/plan-report", "GET", plan_report),
        ("/api/admin/owner/control-log", "GET", control_log),
        ("/api/admin/owner/retention-email-status", "GET", retention_status),
        ("/api/admin/owner/tester-intake", "POST", tester_intake),
        ("/api/admin/owner/control-access", "POST", control_access),
    ]
    for path, method, endpoint in routes:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(name)
