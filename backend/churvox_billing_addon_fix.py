from datetime import datetime, timezone
import os
import sys


def _server():
    return sys.modules.get("server") or sys.modules.get("backend.server") or sys.modules.get("main")


def _clean(value):
    return str(value or "").strip()


def _obj(value):
    ObjectId = getattr(_server(), "ObjectId", None)
    try:
        return ObjectId(str(value)) if value and ObjectId else None
    except Exception:
        return None


async def _user(request):
    return await getattr(_server(), "get_current_user")(request)


def _business_id(user):
    return str(user.get("business_id") or user.get("id") or user.get("_id"))


def _rank(plan):
    return {"solo": 1, "team": 2, "pro": 3, "enterprise": 4}.get(_clean(plan).lower(), 0)


def _addon(addon):
    key = _clean(addon).lower()
    if key in ["xero", "xero_addon", "xero_sync"]:
        return {
            "key": "xero_addon",
            "name": "Xero add-on",
            "requires_plan": "pro",
            "price_envs": ["STRIPE_PRICE_XERO_ADDON", "STRIPE_PRICE_XERO", "STRIPE_XERO_ADDON_PRICE_ID"],
            "active_field": "xero_addon_active",
            "subscription_field": "stripe_xero_addon_subscription_id",
        }
    if key in ["command_growth_pack", "growth_pack", "command_growth"]:
        return {
            "key": "command_growth_pack",
            "name": "Command Growth Pack",
            "requires_plan": "enterprise",
            "price_envs": ["STRIPE_PRICE_COMMAND_GROWTH_PACK", "STRIPE_PRICE_GROWTH_PACK", "STRIPE_COMMAND_GROWTH_PACK_PRICE_ID"],
            "active_field": "command_growth_pack_active",
            "subscription_field": "stripe_command_growth_pack_subscription_id",
        }
    return None


def _first_env(names):
    for name in names:
        value = os.environ.get(name, "").strip()
        if value:
            return value, name
    return "", names[0] if names else ""


async def _owner(db, user):
    biz_oid = _obj(_business_id(user))
    owner = await db.users.find_one({"_id": biz_oid}) if biz_oid else None
    if not owner:
        owner = await db.users.find_one({"_id": _obj(user.get("id"))})
    return owner or {}


def _remove_existing(router, suffix):
    try:
        router.routes = [r for r in router.routes if not (getattr(r, "path", "").endswith(suffix) and "POST" in getattr(r, "methods", set()))]
    except Exception:
        pass


def install(router):
    if getattr(router, "churvox_billing_addon_fix_installed", False):
        return

    _remove_existing(router, "/billing/create-addon-checkout-session")
    _remove_existing(router, "/billing/confirm-addon-checkout")

    @router.post("/billing/create-addon-checkout-session")
    async def create_addon_checkout(payload: dict, request):
        app = _server()
        db = getattr(app, "db", None)
        stripe = getattr(app, "stripe", None)
        if db is None or stripe is None:
            return {"success": False, "error": "Billing route not ready"}
        try:
            user = await _user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}

        cfg = _addon(payload.get("addon") or payload.get("addonKey") or payload.get("key"))
        if not cfg:
            return {"success": False, "error": "Unknown add-on"}
        owner = await _owner(db, user)
        plan = _clean(owner.get("plan") or user.get("plan") or "solo").lower()
        if _rank(plan) < _rank(cfg["requires_plan"]):
            need = "Operator or Command" if cfg["requires_plan"] == "pro" else "Command"
            return {"success": False, "error": f"{cfg['name']} needs {need}."}

        stripe_secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        if not stripe_secret:
            return {"success": False, "error": "Missing STRIPE_SECRET_KEY in Render."}
        stripe.api_key = stripe_secret
        price_id, env_name = _first_env(cfg["price_envs"])
        if not price_id:
            return {"success": False, "error": f"Missing Stripe price env for {cfg['name']}. Add {env_name} in Render."}

        frontend = _clean(getattr(app, "FRONTEND_URL", "")) or os.environ.get("FRONTEND_URL", "https://www.churvox.com")
        frontend = frontend.rstrip("/")
        business_id = _business_id(user)
        owner_id = str(owner.get("_id") or user.get("id"))
        args = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": f"{frontend}/billing/success?addon={cfg['key']}&session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{frontend}/plans?addon_cancelled=1&addon={cfg['key']}",
            "metadata": {"purpose": "addon_subscription", "addon": cfg["key"], "business_id": business_id, "owner_user_id": owner_id},
            "subscription_data": {"metadata": {"purpose": "addon_subscription", "addon": cfg["key"], "business_id": business_id, "owner_user_id": owner_id}},
        }
        if owner.get("stripe_customer_id"):
            args["customer"] = owner.get("stripe_customer_id")
        else:
            args["customer_email"] = owner.get("email") or user.get("email")
        try:
            session = stripe.checkout.Session.create(**args)
            await db.billing_addon_sessions.update_one({"stripe_session_id": session.id}, {"$setOnInsert": {"business_id": business_id, "owner_user_id": owner_id, "addon": cfg["key"], "stripe_session_id": session.id, "status": "created", "created_at": datetime.now(timezone.utc)}}, upsert=True)
            return {"success": True, "url": session.url, "checkout_url": session.url, "session_id": session.id}
        except Exception as exc:
            return {"success": False, "error": f"Stripe add-on checkout failed: {exc}"}

    @router.post("/billing/confirm-addon-checkout")
    async def confirm_addon_checkout(payload: dict, request):
        app = _server()
        db = getattr(app, "db", None)
        stripe = getattr(app, "stripe", None)
        if db is None or stripe is None:
            return {"success": False, "error": "Billing route not ready"}
        try:
            user = await _user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}
        session_id = _clean(payload.get("session_id"))
        if not session_id:
            return {"success": False, "error": "Missing Stripe session id"}

        existing = await db.billing_addon_sessions.find_one({"stripe_session_id": session_id})
        if existing and existing.get("status") == "confirmed":
            return {"success": True, "message": "Add-on already activated", "addon": existing.get("addon"), "already_confirmed": True}

        stripe_secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        if not stripe_secret:
            return {"success": False, "error": "Missing STRIPE_SECRET_KEY in Render."}
        stripe.api_key = stripe_secret
        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except Exception as exc:
            return {"success": False, "error": f"Could not verify Stripe session: {exc}"}
        if getattr(session, "payment_status", None) not in ["paid", "no_payment_required"]:
            return {"success": False, "error": "Stripe checkout is not paid yet"}

        meta = getattr(session, "metadata", {}) or {}
        cfg = _addon(meta.get("addon") or payload.get("addon"))
        if not cfg:
            return {"success": False, "error": "Unknown add-on from Stripe session"}
        business_id = _business_id(user)
        biz_oid = _obj(business_id)
        subscription_id = getattr(session, "subscription", None)
        customer_id = getattr(session, "customer", None)
        update = {cfg["active_field"]: True, cfg["subscription_field"]: subscription_id, "updated_at": datetime.now(timezone.utc)}
        if customer_id:
            update["stripe_customer_id"] = customer_id

        if cfg["key"] == "command_growth_pack":
            await db.users.update_one({"_id": biz_oid}, {"$set": {**update, "command_growth_pack_active": True}, "$inc": {"extra_user_blocks": 1}})
        else:
            await db.users.update_one({"_id": biz_oid}, {"$set": update})
        await db.billing_addon_sessions.update_one({"stripe_session_id": session_id}, {"$set": {"business_id": business_id, "addon": cfg["key"], "status": "confirmed", "stripe_subscription_id": subscription_id, "stripe_customer_id": customer_id, "confirmed_at": datetime.now(timezone.utc)}}, upsert=True)
        return {"success": True, "message": f"{cfg['name']} activated", "addon": cfg["key"]}

    router.churvox_billing_addon_fix_installed = True
