import os
import sys
from datetime import datetime, timezone


def _server():
    return sys.modules.get("server") or sys.modules.get("backend.server") or sys.modules.get("main")


def _clean(value):
    return str(value or "").strip()


def _normal_plan(value):
    key = _clean(value).lower().replace(" ", "_").replace("-", "_")
    aliases = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
    return aliases.get(key, key if key in ["solo", "team", "pro", "enterprise"] else "solo")


def _country(value):
    code = _clean(value).upper() or "NZ"
    return code if code in ["NZ", "AU", "US", "UK"] else "NZ"


COUNTRY_META = {
    "NZ": {"currency": "NZD", "symbol": "NZ$", "tax": "+ GST", "prices": {"solo": 39, "team": 89, "pro": 149, "enterprise": 299}},
    "AU": {"currency": "AUD", "symbol": "A$", "tax": "+ GST", "prices": {"solo": 39, "team": 89, "pro": 149, "enterprise": 299}},
    "US": {"currency": "USD", "symbol": "US$", "tax": "plus applicable tax", "prices": {"solo": 29, "team": 69, "pro": 119, "enterprise": 239}},
    "UK": {"currency": "GBP", "symbol": "£", "tax": "+ VAT", "prices": {"solo": 29, "team": 69, "pro": 119, "enterprise": 239}},
}


def _price_label(plan, country="NZ"):
    code = _country(country)
    meta = COUNTRY_META[code]
    amount = meta["prices"].get(_normal_plan(plan), 0)
    return f"{meta['symbol']}{amount}/month {meta['tax']}"


BASE_PLAN_META = {
    "solo": {"name": "Start", "max_workers": 0, "max_team_members": 1, "max_clients": 20, "sms": False, "xero_addon_available": False, "myob": False, "team": False, "payroll": False, "ai_operator": False, "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "team": {"name": "Crew", "max_workers": 5, "max_team_members": 6, "max_clients": 30, "sms": False, "xero_addon_available": False, "myob": False, "team": True, "payroll": False, "ai_operator": False, "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "pro": {"name": "Operator", "max_workers": 20, "max_team_members": 21, "max_clients": 40, "sms": False, "xero_addon_available": True, "myob": False, "team": True, "payroll": False, "ai_operator": True, "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "enterprise": {"name": "Command", "max_workers": 50, "max_team_members": 50, "max_clients": 50, "sms": False, "xero_addon_available": True, "myob": False, "team": True, "payroll": True, "ai_operator": True, "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True, "extra_blocks": True, "growth_pack_price": 99},
}


def _meta_for(plan, country="NZ"):
    p = _normal_plan(plan)
    c = _country(country)
    meta = dict(BASE_PLAN_META[p])
    amount = COUNTRY_META[c]["prices"][p]
    meta.update({"price": amount, "price_label": _price_label(p, c), "country": c, "currency": COUNTRY_META[c]["currency"], "tax_label": COUNTRY_META[c]["tax"]})
    return meta


PLAN_META = {key: _meta_for(key, "NZ") for key in BASE_PLAN_META.keys()}


def _base_envs(plan):
    p = _normal_plan(plan)
    if p == "solo":
        return ["STRIPE_PRICE_START", "STRIPE_PRICE_SOLO"]
    if p == "team":
        return ["STRIPE_PRICE_CREW", "STRIPE_PRICE_TEAM"]
    if p == "pro":
        return ["STRIPE_PRICE_OPERATOR", "STRIPE_PRICE_PRO"]
    if p == "enterprise":
        return ["STRIPE_PRICE_COMMAND", "STRIPE_PRICE_ENTERPRISE"]
    return []


def _price_envs(plan, country="NZ"):
    p = _normal_plan(plan)
    c = _country(country)
    display = {"solo": "START", "team": "CREW", "pro": "OPERATOR", "enterprise": "COMMAND"}[p]
    legacy = {"solo": "SOLO", "team": "TEAM", "pro": "PRO", "enterprise": "ENTERPRISE"}[p]
    return [f"STRIPE_PRICE_{display}_{c}", f"STRIPE_PRICE_{c}_{display}", f"STRIPE_PRICE_{legacy}_{c}", f"STRIPE_PRICE_{c}_{legacy}", *_base_envs(p)]


def _first_env(names):
    for name in names:
        value = os.environ.get(name, "").strip()
        if value:
            return value, name
    return "", names[0] if names else ""


def _obj(value):
    ObjectId = getattr(_server(), "ObjectId", None)
    try:
        return ObjectId(str(value)) if value and ObjectId else None
    except Exception:
        return None


async def _user(request):
    return await getattr(_server(), "get_current_user")(request)


async def _owner_doc(db, user):
    business_id = str(user.get("business_id") or user.get("id") or user.get("_id"))
    owner = await db.users.find_one({"_id": _obj(business_id)})
    if not owner:
        owner = await db.users.find_one({"_id": _obj(user.get("id"))})
    return owner or {}


def _remove_post(router, suffix):
    try:
        router.routes = [r for r in router.routes if not (getattr(r, "path", "").endswith(suffix) and "POST" in getattr(r, "methods", set()))]
    except Exception:
        pass


def _remove_get(router, suffix):
    try:
        router.routes = [r for r in router.routes if not (getattr(r, "path", "").endswith(suffix) and "GET" in getattr(r, "methods", set()))]
    except Exception:
        pass


def _patch_globals():
    app = _server()
    if not app:
        return
    app.PLAN_LIMITS = {key: dict(value) for key, value in PLAN_META.items()}
    app.PLAN_PRICE_IDS = {key: _first_env(_price_envs(key, "NZ"))[0] for key in BASE_PLAN_META.keys()}

    def get_stripe_price_id(plan, country="NZ"):
        normal = _normal_plan(plan)
        code = _country(country)
        price_id, env_name = _first_env(_price_envs(normal, code))
        if not price_id:
            HTTPException = getattr(app, "HTTPException", None)
            if HTTPException:
                raise HTTPException(status_code=400, detail=f"Missing Stripe price ID for {_meta_for(normal, code)['name']} {code}. Add {env_name} in Render.")
            raise RuntimeError(f"Missing Stripe price ID for {normal} {code}")
        return price_id

    async def set_business_plan_from_checkout(user_id: str, plan: str, stripe_customer_id: str = None, stripe_subscription_id: str = None, country: str = "NZ"):
        db = getattr(app, "db", None)
        if db is None:
            return
        user_obj_id = _obj(user_id)
        user_doc = await db.users.find_one({"_id": user_obj_id}) if user_obj_id else None
        if not user_doc:
            return
        normal = _normal_plan(plan)
        code = _country(country or user_doc.get("country") or user_doc.get("business_country") or "NZ")
        meta = _meta_for(normal, code)
        business_id = user_doc.get("business_id", user_obj_id)
        if isinstance(business_id, str):
            business_id = _obj(business_id)
        update = {"plan": normal, "plan_name": meta["name"], "plan_price": meta["price"], "plan_price_label": meta["price_label"], "country": code, "business_country": code, "billing_country": code, "stripe_customer_id": stripe_customer_id, "stripe_subscription_id": stripe_subscription_id, "updated_at": datetime.now(timezone.utc)}
        await db.users.update_one({"_id": business_id}, {"$set": update})
        await db.users.update_many({"business_id": business_id, "role": {"$in": ["worker", "manager", "office_admin", "payroll"]}}, {"$set": {"plan": normal, "plan_name": meta["name"], "country": code, "business_country": code}})

    app.get_stripe_price_id = get_stripe_price_id
    app.set_business_plan_from_checkout = set_business_plan_from_checkout


def install(router):
    if getattr(router, "churvox_plan_consistency_installed", False):
        return
    _patch_globals()
    _remove_post(router, "/billing/create-checkout-session")
    _remove_get(router, "/billing/subscription-status")
    _remove_get(router, "/billing/plan-metadata")

    @router.get("/billing/plan-metadata")
    async def plan_metadata():
        return {"success": True, "plans": PLAN_META, "countries": COUNTRY_META, "key_map": {"Start": "solo", "Crew": "team", "Operator": "pro", "Command": "enterprise"}}

    @router.get("/billing/subscription-status")
    async def subscription_status(request):
        app = _server()
        db = getattr(app, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        user = await _user(request)
        owner = await _owner_doc(db, user)
        country = _country(owner.get("billing_country") or owner.get("business_country") or owner.get("country") or user.get("country") or "NZ")
        plan = _normal_plan(owner.get("plan") or user.get("plan") or "solo")
        meta = _meta_for(plan, country)
        return {"success": True, "data": {"plan": plan, "plan_name": meta["name"], "plan_price": meta["price"], "plan_price_label": meta["price_label"], "country": country, "billing_country": country, "currency": meta["currency"], "tax_label": meta["tax_label"], "limits": meta, "stripe_customer_id": owner.get("stripe_customer_id"), "stripe_subscription_id": owner.get("stripe_subscription_id")}}

    @router.post("/billing/create-checkout-session")
    async def create_checkout(payload: dict, request):
        app = _server()
        db = getattr(app, "db", None)
        stripe = getattr(app, "stripe", None)
        if db is None or stripe is None:
            return {"success": False, "error": "Billing route not ready"}
        try:
            user = await getattr(app, "require_employer")(request)
        except Exception:
            return {"success": False, "error": "Only owners can change plans"}
        owner = await _owner_doc(db, user)
        plan = _normal_plan(payload.get("plan") or payload.get("plan_type") or payload.get("planKey"))
        country = _country(payload.get("country") or owner.get("billing_country") or owner.get("business_country") or owner.get("country") or user.get("country") or "NZ")
        meta = _meta_for(plan, country)
        price_id, env_name = _first_env(_price_envs(plan, country))
        if not price_id:
            return {"success": False, "error": f"Missing Stripe price ID for {meta['name']} {country}. Add {env_name} in Render."}
        stripe_secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        if not stripe_secret:
            return {"success": False, "error": "Missing STRIPE_SECRET_KEY in Render."}
        stripe.api_key = stripe_secret
        frontend = (getattr(app, "FRONTEND_URL", "") or os.environ.get("FRONTEND_URL", "https://www.churvox.com")).rstrip("/")
        business_id = str(user.get("business_id") or user.get("id"))
        await db.users.update_one({"_id": _obj(business_id)}, {"$set": {"billing_country": country, "business_country": country, "country": country, "updated_at": datetime.now(timezone.utc)}})
        args = {"mode": "subscription", "line_items": [{"price": price_id, "quantity": 1}], "success_url": f"{frontend}/billing/success?session_id={{CHECKOUT_SESSION_ID}}&plan={plan}&country={country}", "cancel_url": f"{frontend}/billing/cancel", "metadata": {"user_id": user.get("id"), "business_id": business_id, "plan": plan, "plan_name": meta["name"], "country": country, "currency": meta["currency"], "purpose": "plan_subscription"}, "subscription_data": {"metadata": {"user_id": user.get("id"), "business_id": business_id, "plan": plan, "country": country, "purpose": "plan_subscription"}}}
        if owner.get("stripe_customer_id"):
            args["customer"] = owner.get("stripe_customer_id")
        else:
            args["customer_email"] = user.get("email")
        try:
            session = stripe.checkout.Session.create(**args)
            return {"success": True, "url": session.url, "checkout_url": session.url, "session_id": session.id, "plan": plan, "plan_name": meta["name"], "country": country}
        except Exception as exc:
            return {"success": False, "error": f"Stripe checkout failed: {exc}"}

    router.churvox_plan_consistency_installed = True
