import os
from datetime import datetime, timezone
import stripe
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.churvox.com")
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PRICE_XERO_ADDON = os.environ.get("STRIPE_PRICE_XERO_ADDON", "")
STRIPE_PRICE_COMMAND_GROWTH_PACK = os.environ.get("STRIPE_PRICE_COMMAND_GROWTH_PACK", "")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

ADDONS = {
    "xero_addon": {"key": "xero_addon", "name": "Xero Sync Add-on", "price": "$39/month + GST", "stripe_env": "STRIPE_PRICE_XERO_ADDON", "price_id": STRIPE_PRICE_XERO_ADDON},
    "command_growth_pack": {"key": "command_growth_pack", "name": "Command Growth Pack", "price": "$99/month + GST", "stripe_env": "STRIPE_PRICE_COMMAND_GROWTH_PACK", "price_id": STRIPE_PRICE_COMMAND_GROWTH_PACK},
}

PLAN_ALIASES = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
PLAN_LABELS = {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command"}
BASE_LIMITS = {
    "solo": {"workers": 1, "clients": 250, "jobs_month": 50, "ai_actions_month": 25},
    "team": {"workers": 5, "clients": 1000, "jobs_month": 150, "ai_actions_month": 100},
    "pro": {"workers": 15, "clients": 3000, "jobs_month": 500, "ai_actions_month": 500},
    "enterprise": {"workers": 50, "clients": 10000, "jobs_month": 1500, "ai_actions_month": 2000},
}
PACK_ADDS = {"workers": 50, "jobs_month": 1500, "ai_actions_month": 1000}


def _safe(doc):
    out = dict(doc or {})
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for k, v in list(out.items()):
        if isinstance(v, ObjectId): out[k] = str(v)
        elif isinstance(v, datetime): out[k] = v.isoformat()
    return out

def _bid(user): return str(user.get("business_id") or user.get("id") or user.get("_id"))
def _plan(user): return str(user.get("plan") or user.get("ui_plan") or user.get("subscription_plan") or "").lower()
def _normal_plan(value): return PLAN_ALIASES.get(str(value or "solo").strip().lower(), "solo")
def _month_start():
    now = datetime.now(timezone.utc)
    return datetime(now.year, now.month, 1, tzinfo=timezone.utc)
def _limit_row(name, used, limit):
    used = int(used or 0); limit = int(limit or 0)
    return {"name": name, "used": used, "limit": limit, "left": max(0, limit - used), "locked": used >= limit}
def _id_values(raw):
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

def _business_values(user): return _id_values(user.get("business_id") or user.get("id") or user.get("_id"))
def _quantity(payload):
    try:
        return max(1, int((payload or {}).get("quantity") or (payload or {}).get("growth_packs") or (payload or {}).get("packs") or 1))
    except Exception:
        return 1

def _allowed(addon, user):
    plan = _plan(user)
    if addon == "command_growth_pack": return plan in ["enterprise", "command"], "Command Growth Pack needs the Command plan."
    if addon == "xero_addon": return plan in ["solo", "start", "team", "crew", "pro", "operator", "enterprise", "command"], "Xero Sync Add-on needs an active Churvox plan."
    return False, "Unknown add-on."

async def _owner_for(db, values):
    if not values:
        return None
    owner = await db.users.find_one({"_id": {"$in": values}})
    if owner:
        return owner
    return await db.users.find_one({"business_id": {"$in": values}, "role": {"$in": ["employer", "admin", "owner", "business_owner"]}})

async def _safe_count(coro, fallback=0):
    try:
        return await coro
    except Exception:
        return fallback

async def _usage_payload(db, user):
    values = _business_values(user)
    owner = await _owner_for(db, values) or user
    plan = _normal_plan(owner.get("plan") or owner.get("ui_plan") or owner.get("subscription_plan") or user.get("plan") or "solo")
    packs = int((owner or {}).get("extra_user_blocks", 0) or 0)
    limits = dict(BASE_LIMITS.get(plan, BASE_LIMITS["solo"]))
    if plan == "enterprise":
        limits["workers"] += packs * PACK_ADDS["workers"]
        limits["jobs_month"] += packs * PACK_ADDS["jobs_month"]
        limits["ai_actions_month"] += packs * PACK_ADDS["ai_actions_month"]
    start = _month_start()
    workers = await _safe_count(db.users.count_documents({"business_id": {"$in": values}, "role": "worker", "active": {"$ne": False}, "is_active": {"$ne": False}, "status": {"$nin": ["inactive", "disabled", "paused", "removed", "archived"]}}))
    clients = await _safe_count(db.clients.count_documents({"$or": [{"contractor_id": {"$in": values}}, {"business_id": {"$in": values}}, {"owner_business_id": {"$in": values}}], "archived": {"$ne": True}, "is_archived": {"$ne": True}, "deleted": {"$ne": True}, "is_deleted": {"$ne": True}}))
    jobs = await _safe_count(db.jobs.count_documents({"$or": [{"contractor_id": {"$in": values}}, {"business_id": {"$in": values}}, {"owner_business_id": {"$in": values}}], "$and": [{"$or": [{"created_at": {"$gte": start}}, {"createdAt": {"$gte": start}}, {"created": {"$gte": start}}, {"scheduled_at": {"$gte": start}}, {"scheduled": {"$gte": start}}]}], "archived": {"$ne": True}, "is_archived": {"$ne": True}, "status": {"$nin": ["archived", "cancelled", "canceled"]}}))
    ai_actions = await _safe_count(db.ai_review_items.count_documents({"$or": [{"business_id": {"$in": values}}, {"contractor_id": {"$in": values}}, {"owner_business_id": {"$in": values}}], "$and": [{"$or": [{"created_at": {"$gte": start}}, {"createdAt": {"$gte": start}}, {"created": {"$gte": start}}]}], "status": {"$nin": ["deleted", "archived"]}}))
    return {"success": True, "plan": plan, "plan_label": PLAN_LABELS.get(plan, "Start"), "growth_packs": packs, "limits": limits, "usage": {"workers": _limit_row("Active workers", workers, limits["workers"]), "clients": _limit_row("Clients", clients, limits["clients"]), "jobs_month": _limit_row("Jobs this month", jobs, limits["jobs_month"]), "ai_actions_month": _limit_row("AI Operator Actions", ai_actions, limits["ai_actions_month"])}, "pack_adds": PACK_ADDS, "period": {"month_start": start.isoformat()}, "fallback_source": "billing_addon_routes"}

async def _apply(db, addon, user, session_id, quantity=1):
    bid = _bid(user); now = datetime.now(timezone.utc); qty = max(1, int(quantity or 1))
    if addon == "command_growth_pack":
        await db.users.update_one({"_id": ObjectId(bid)}, {"$inc": {"extra_user_blocks": qty}, "$set": {"updated_at": now}})
    if addon == "xero_addon":
        await db.users.update_one({"_id": ObjectId(bid)}, {"$set": {"xero_addon_active": True, "accounting_sync": True, "xero_addon_started_at": now, "updated_at": now}})
    await db.billing_addons.insert_one({"business_id": bid, "user_id": str(user.get("id")), "addon_key": addon, "stripe_session_id": session_id, "quantity": qty, "status": "active", "created_at": now})

def _install_real_ai_review_routes(app, db, get_current_user):
    if getattr(app.state, "churvox_real_ai_operator_routes_installed", False):
        return
    try:
        from churvox_ai_operator_routes import build_ai_operator_router
    except Exception:
        from .churvox_ai_operator_routes import build_ai_operator_router
    app.include_router(build_ai_operator_router(db, get_current_user, ObjectId), prefix="/api")
    app.state.churvox_real_ai_operator_routes_installed = True

def install(app, db, get_current_user):
    _install_real_ai_review_routes(app, db, get_current_user)
    if getattr(app.state, "billing_addon_routes_installed", False): return
    router = APIRouter(prefix="/api")

    @router.get("/plan/usage")
    async def plan_usage_fallback(current_user: dict = Depends(get_current_user)):
        return await _usage_payload(db, current_user)

    @router.get("/billing/addons")
    async def billing_addons(current_user: dict = Depends(get_current_user)):
        bid = _bid(current_user)
        owner = await db.users.find_one({"_id": ObjectId(bid)})
        active = await db.billing_addons.find({"business_id": bid}).sort("created_at", -1).to_list(100)
        blocks = int((owner or {}).get("extra_user_blocks", 0) or 0)
        return {"success": True, "addons": ADDONS, "active": [_safe(x) for x in active], "xero_addon_active": bool((owner or {}).get("xero_addon_active") or (owner or {}).get("accounting_sync")), "extra_user_blocks": blocks, "growth_packs": blocks, "max_extra_team_members": blocks * 50, "extra_jobs_per_month": blocks * 1500, "extra_ai_actions_per_month": blocks * 1000}

    @router.post("/billing/create-addon-checkout-session")
    async def create_addon_checkout(payload: dict, current_user: dict = Depends(get_current_user)):
        addon = str((payload or {}).get("addon") or "").strip().lower()
        if addon not in ADDONS: raise HTTPException(status_code=400, detail="Unknown add-on")
        ok, reason = _allowed(addon, current_user)
        if not ok: raise HTTPException(status_code=403, detail=reason)
        price_id = ADDONS[addon]["price_id"]
        if not STRIPE_SECRET_KEY: raise HTTPException(status_code=400, detail="Stripe secret key is not configured")
        if not price_id: raise HTTPException(status_code=400, detail=f"Missing Stripe price ID env var: {ADDONS[addon]['stripe_env']}")
        qty = _quantity(payload) if addon == "command_growth_pack" else 1
        country = str((payload or {}).get("country") or "NZ").upper()
        success_url = f"{FRONTEND_URL}/plans?addon_success=1&addon={addon}&quantity={qty}&country={country}&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{FRONTEND_URL}/plans?addon_cancelled={addon}"
        metadata = {"user_id": str(current_user.get("id")), "business_id": _bid(current_user), "addon": addon, "quantity": str(qty), "country": country}
        session = stripe.checkout.Session.create(mode="subscription", line_items=[{"price": price_id, "quantity": qty}], success_url=success_url, cancel_url=cancel_url, client_reference_id=str(current_user.get("id")), metadata=metadata, subscription_data={"metadata": metadata})
        return {"success": True, "url": session.url, "checkout_url": session.url, "quantity": qty, "addon": addon}

    @router.post("/billing/confirm-addon-checkout")
    async def confirm_addon_checkout(payload: dict, current_user: dict = Depends(get_current_user)):
        addon = str((payload or {}).get("addon") or "").strip().lower()
        session_id = str((payload or {}).get("session_id") or "").strip()
        if addon not in ADDONS or not session_id: raise HTTPException(status_code=400, detail="Valid addon and session_id are required")
        ok, reason = _allowed(addon, current_user)
        if not ok: raise HTTPException(status_code=403, detail=reason)
        session = stripe.checkout.Session.retrieve(session_id)
        meta = getattr(session, "metadata", {}) or {}
        if meta.get("addon") != addon or str(meta.get("business_id") or "") != _bid(current_user): raise HTTPException(status_code=403, detail="Checkout does not match this business")
        if getattr(session, "status", "") != "complete" and getattr(session, "payment_status", "") not in ["paid", "no_payment_required"]: raise HTTPException(status_code=400, detail="Checkout is not complete yet")
        qty = max(1, int(meta.get("quantity") or _quantity(payload)))
        exists = await db.billing_addons.find_one({"business_id": _bid(current_user), "stripe_session_id": session_id})
        if not exists: await _apply(db, addon, current_user, session_id, qty)
        return {"success": True, "message": f"{ADDONS[addon]['name']} activated", "addon": addon, "quantity": qty}

    app.include_router(router)
    app.state.billing_addon_routes_installed = True
