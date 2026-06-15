from datetime import datetime, timezone
import os
import sys


def _server():
    return sys.modules.get("server") or sys.modules.get("backend.server") or sys.modules.get("main")


def _clean(value):
    return str(value or "").strip()


def _plan(value):
    raw = _clean(value).lower() or "pro"
    return {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}.get(raw, "pro")


def _country(value):
    code = _clean(value).upper() or "NZ"
    return code if code in ["NZ", "AU", "US", "UK"] else "NZ"


def _amount_cents(plan, country):
    prices = {
        "solo": {"NZ": 3900, "AU": 3900, "US": 2900, "UK": 2500},
        "team": {"NZ": 8900, "AU": 8900, "US": 6900, "UK": 5900},
        "pro": {"NZ": 14900, "AU": 14900, "US": 11900, "UK": 9900},
        "enterprise": {"NZ": 29900, "AU": 29900, "US": 23900, "UK": 19900},
    }
    return prices.get(plan, prices["pro"]).get(country, prices["pro"]["NZ"])


def _currency(country):
    return {"NZ": "nzd", "AU": "aud", "US": "usd", "UK": "gbp"}.get(country, "nzd")


def _label(plan):
    return {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command"}.get(plan, "Operator")


def _price_id(plan, country):
    env = {"solo": "START", "team": "CREW", "pro": "OPERATOR", "enterprise": "COMMAND"}.get(plan, "OPERATOR")
    legacy = {"solo": "SOLO", "team": "TEAM", "pro": "PRO", "enterprise": "ENTERPRISE"}.get(plan, "PRO")
    for key in [f"STRIPE_PRICE_{env}_{country}", f"STRIPE_PRICE_{legacy}_{country}", f"STRIPE_PRICE_{env}", f"STRIPE_PRICE_{legacy}"]:
        value = os.environ.get(key, "").strip()
        if value:
            return value, key
    return "", "dynamic_price_data"


def _line_item(plan, country):
    price_id, source = _price_id(plan, country)
    if price_id:
        return {"price": price_id, "quantity": 1}, source
    return {"price_data": {"currency": _currency(country), "unit_amount": _amount_cents(plan, country), "recurring": {"interval": "month"}, "product_data": {"name": f"Churvox {_label(plan)}"}}, "quantity": 1}, source


def _remove_existing(router, suffix):
    try:
        router.routes = [r for r in router.routes if not (getattr(r, "path", "").endswith(suffix) and "POST" in getattr(r, "methods", set()))]
    except Exception:
        pass


async def _user(request):
    return await getattr(_server(), "get_current_user")(request)


def _business_id(user):
    return str(user.get("business_id") or user.get("id") or user.get("_id"))


def _allowed(user):
    role = _clean(user.get("role") or "employer").lower()
    return role in ["employer", "owner", "admin", "business_owner", "superadmin", "manager", "office_admin"] or bool(user.get("is_admin") or user.get("is_platform_owner"))


def install(router):
    if getattr(router, "churvox_billing_checkout_fix_installed", False):
        return

    _remove_existing(router, "/billing/create-checkout-session")
    _remove_existing(router, "/stripe/create-checkout-session")

    @router.post("/billing/create-checkout-session")
    async def create_checkout(payload: dict, request):
        app = _server()
        db = getattr(app, "db", None)
        stripe = getattr(app, "stripe", None)
        if db is None or stripe is None:
            return {"success": False, "error": "Billing route not ready"}
        try:
            user = await _user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}
        if not _allowed(user):
            return {"success": False, "error": "Only business owners and admins can start checkout"}
        secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        if not secret:
            return {"success": False, "error": "Missing STRIPE_SECRET_KEY in Render"}
        stripe.api_key = secret
        plan = _plan(payload.get("plan") or payload.get("plan_type") or payload.get("ui_plan"))
        country = _country(payload.get("country") or payload.get("billing_country") or "NZ")
        line_item, source = _line_item(plan, country)
        frontend = (os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
        business_id = _business_id(user)
        metadata = {"user_id": str(user.get("id") or user.get("_id")), "business_id": business_id, "plan": plan, "country": country, "source": "billing_checkout_fix"}
        args = {
            "mode": "subscription",
            "payment_method_collection": "if_required",
            "customer_email": user.get("email"),
            "line_items": [line_item],
            "subscription_data": {"trial_period_days": 14, "trial_settings": {"end_behavior": {"missing_payment_method": "cancel"}}, "metadata": metadata},
            "metadata": metadata,
            "success_url": f"{frontend}/plans?checkout=success&session_id={{CHECKOUT_SESSION_ID}}&plan={plan}",
            "cancel_url": f"{frontend}/plans?checkout=cancelled&plan={plan}",
        }
        try:
            session = stripe.checkout.Session.create(**args)
            await db.checkout_debug.insert_one({**metadata, "session_id": session.id, "price_source": source, "created_at": datetime.now(timezone.utc)})
            return {"success": True, "url": session.url, "checkout_url": session.url, "session_id": session.id, "plan": plan, "country": country, "price_source": source}
        except Exception as exc:
            return {"success": False, "error": f"Stripe checkout failed: {exc}"}

    @router.post("/stripe/create-checkout-session")
    async def create_checkout_legacy(payload: dict, request):
        return await create_checkout(payload, request)

    router.churvox_billing_checkout_fix_installed = True
