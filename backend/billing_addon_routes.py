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
    "xero_addon": {"key": "xero_addon", "name": "Xero add-on", "price": "$39/month + GST", "stripe_env": "STRIPE_PRICE_XERO_ADDON", "price_id": STRIPE_PRICE_XERO_ADDON},
    "command_growth_pack": {"key": "command_growth_pack", "name": "Command Growth Pack", "price": "$99/month + GST", "stripe_env": "STRIPE_PRICE_COMMAND_GROWTH_PACK", "price_id": STRIPE_PRICE_COMMAND_GROWTH_PACK},
}

def _safe(doc):
    out = dict(doc or {})
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for k, v in list(out.items()):
        if isinstance(v, ObjectId): out[k] = str(v)
        elif isinstance(v, datetime): out[k] = v.isoformat()
    return out

def _bid(user): return str(user.get("business_id") or user.get("id"))
def _plan(user): return str(user.get("plan") or "").lower()
def _allowed(addon, user):
    if addon == "command_growth_pack": return _plan(user) == "enterprise", "Command Growth Pack needs the Command plan."
    if addon == "xero_addon": return _plan(user) in ["pro", "enterprise"], "Xero add-on needs Operator or Command."
    return False, "Unknown add-on."

async def _apply(db, addon, user, session_id):
    bid = _bid(user); now = datetime.now(timezone.utc)
    if addon == "command_growth_pack":
        await db.users.update_one({"_id": ObjectId(bid)}, {"$inc": {"extra_user_blocks": 1}, "$set": {"updated_at": now}})
    if addon == "xero_addon":
        await db.users.update_one({"_id": ObjectId(bid)}, {"$set": {"xero_addon_active": True, "xero_addon_started_at": now, "updated_at": now}})
    await db.billing_addons.insert_one({"business_id": bid, "user_id": str(user.get("id")), "addon_key": addon, "stripe_session_id": session_id, "status": "active", "created_at": now})

def install(app, db, get_current_user):
    if getattr(app.state, "billing_addon_routes_installed", False): return
    router = APIRouter(prefix="/api")

    @router.get("/billing/addons")
    async def billing_addons(current_user: dict = Depends(get_current_user)):
        bid = _bid(current_user)
        owner = await db.users.find_one({"_id": ObjectId(bid)})
        active = await db.billing_addons.find({"business_id": bid}).sort("created_at", -1).to_list(100)
        blocks = int((owner or {}).get("extra_user_blocks", 0) or 0)
        return {"success": True, "addons": ADDONS, "active": [_safe(x) for x in active], "xero_addon_active": bool((owner or {}).get("xero_addon_active")), "extra_user_blocks": blocks, "max_extra_team_members": blocks * 50}

    @router.post("/billing/create-addon-checkout-session")
    async def create_addon_checkout(payload: dict, current_user: dict = Depends(get_current_user)):
        addon = str((payload or {}).get("addon") or "").strip().lower()
        if addon not in ADDONS: raise HTTPException(status_code=400, detail="Unknown add-on")
        ok, reason = _allowed(addon, current_user)
        if not ok: raise HTTPException(status_code=403, detail=reason)
        price_id = ADDONS[addon]["price_id"]
        if not STRIPE_SECRET_KEY: raise HTTPException(status_code=400, detail="Stripe secret key is not configured")
        if not price_id: raise HTTPException(status_code=400, detail=f"Missing Stripe price ID env var: {ADDONS[addon]['stripe_env']}")
        session = stripe.checkout.Session.create(mode="subscription", line_items=[{"price": price_id, "quantity": 1}], success_url=f"{FRONTEND_URL}/billing?addon={addon}&session_id={{CHECKOUT_SESSION_ID}}", cancel_url=f"{FRONTEND_URL}/plans?addon_cancelled={addon}", client_reference_id=str(current_user.get("id")), metadata={"user_id": str(current_user.get("id")), "business_id": _bid(current_user), "addon": addon}, subscription_data={"metadata": {"user_id": str(current_user.get("id")), "business_id": _bid(current_user), "addon": addon}})
        return {"success": True, "url": session.url, "checkout_url": session.url}

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
        exists = await db.billing_addons.find_one({"business_id": _bid(current_user), "stripe_session_id": session_id})
        if not exists: await _apply(db, addon, current_user, session_id)
        return {"success": True, "message": f"{ADDONS[addon]['name']} activated", "addon": addon}

    app.include_router(router)
    app.state.billing_addon_routes_installed = True
