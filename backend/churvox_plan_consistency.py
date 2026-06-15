import os
import sys
from datetime import datetime, timezone
from urllib.parse import parse_qs

from fastapi import Request
from fastapi.responses import RedirectResponse


def _server():
    # Render starts backend as uvicorn server:app. Because backend/server/ is a
    # package, backend/server/__init__.py loads backend/server.py as
    # churvox_legacy_server. The billing routes need the legacy module because it
    # owns db, stripe, auth helpers and ObjectId.
    return (
        sys.modules.get("churvox_legacy_server")
        or sys.modules.get("backend.server")
        or sys.modules.get("main")
        or sys.modules.get("server")
    )


def _clean(value):
    return str(value or "").strip()


def _normal_plan(value):
    key = _clean(value).lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "start": "solo",
        "solo": "solo",
        "crew": "team",
        "team": "team",
        "operator": "pro",
        "pro": "pro",
        "command": "enterprise",
        "enterprise": "enterprise",
    }
    return aliases.get(key, key if key in ["solo", "team", "pro", "enterprise"] else "solo")


def _country(value):
    code = _clean(value).upper() or "NZ"
    aliases = {
        "NZL": "NZ",
        "NEW ZEALAND": "NZ",
        "AUS": "AU",
        "AUSTRALIA": "AU",
        "USA": "US",
        "UNITED STATES": "US",
        "GB": "UK",
        "GBR": "UK",
        "UNITED KINGDOM": "UK",
    }
    code = aliases.get(code, code)
    return code if code in ["NZ", "AU", "US", "UK"] else "NZ"


COUNTRY_META = {
    "NZ": {"currency": "NZD", "symbol": "NZ$", "tax": "+ GST", "prices": {"solo": 39, "team": 89, "pro": 149, "enterprise": 299}},
    "AU": {"currency": "AUD", "symbol": "A$", "tax": "+ GST", "prices": {"solo": 39, "team": 89, "pro": 149, "enterprise": 299}},
    "US": {"currency": "USD", "symbol": "US$", "tax": "plus applicable tax", "prices": {"solo": 29, "team": 69, "pro": 119, "enterprise": 239}},
    "UK": {"currency": "GBP", "symbol": "£", "tax": "+ VAT", "prices": {"solo": 29, "team": 69, "pro": 119, "enterprise": 239}},
}


BASE_PLAN_META = {
    "solo": {"name": "Start", "max_workers": 0, "max_team_members": 1, "max_clients": 20, "sms": False, "xero_addon_available": False, "myob": False, "team": False, "payroll": False, "ai_operator": False, "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "team": {"name": "Crew", "max_workers": 5, "max_team_members": 6, "max_clients": 30, "sms": False, "xero_addon_available": False, "myob": False, "team": True, "payroll": False, "ai_operator": False, "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "pro": {"name": "Operator", "max_workers": 20, "max_team_members": 21, "max_clients": 40, "sms": False, "xero_addon_available": True, "myob": False, "team": True, "payroll": False, "ai_operator": True, "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True},
    "enterprise": {"name": "Command", "max_workers": 50, "max_team_members": 50, "max_clients": 50, "sms": False, "xero_addon_available": True, "myob": False, "team": True, "payroll": True, "ai_operator": True, "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True, "extra_blocks": True, "growth_pack_price": 99},
}


def _price_label(plan, country="NZ"):
    code = _country(country)
    meta = COUNTRY_META[code]
    amount = meta["prices"].get(_normal_plan(plan), 0)
    return f"{meta['symbol']}{amount}/month {meta['tax']}"


def _meta_for(plan, country="NZ"):
    p = _normal_plan(plan)
    c = _country(country)
    meta = dict(BASE_PLAN_META[p])
    meta.update({
        "price": COUNTRY_META[c]["prices"][p],
        "price_label": _price_label(p, c),
        "country": c,
        "currency": COUNTRY_META[c]["currency"],
        "tax_label": COUNTRY_META[c]["tax"],
    })
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
    return [
        f"STRIPE_PRICE_{display}_{c}",
        f"STRIPE_PRICE_{c}_{display}",
        f"STRIPE_PRICE_{legacy}_{c}",
        f"STRIPE_PRICE_{c}_{legacy}",
        *_base_envs(p),
    ]


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


async def _user(request: Request):
    return await getattr(_server(), "get_current_user")(request)


async def _owner_doc(db, user):
    business_id = str(user.get("business_id") or user.get("id") or user.get("_id"))
    owner = await db.users.find_one({"_id": _obj(business_id)})
    if not owner:
        owner = await db.users.find_one({"_id": _obj(user.get("id"))})
    return owner or {}


def _remove_route(router, suffix, method):
    try:
        router.routes = [
            r for r in router.routes
            if not (getattr(r, "path", "").endswith(suffix) and method in getattr(r, "methods", set()))
        ]
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
            msg = f"Missing Stripe price ID for {_meta_for(normal, code)['name']} {code}. Add {env_name} in Render."
            if HTTPException:
                raise HTTPException(status_code=400, detail=msg)
            raise RuntimeError(msg)
        return price_id

    async def set_business_plan_from_checkout(user_id: str, plan: str, stripe_customer_id: str = None, stripe_subscription_id: str = None, country: str = "NZ"):
        db = getattr(app, "db", None)
        if db is None:
            return None
        user_obj_id = _obj(user_id)
        user_doc = await db.users.find_one({"_id": user_obj_id}) if user_obj_id else None
        if not user_doc:
            return None
        normal = _normal_plan(plan)
        code = _country(country or user_doc.get("country") or user_doc.get("business_country") or "NZ")
        meta = _meta_for(normal, code)
        business_id = user_doc.get("business_id", user_obj_id)
        if isinstance(business_id, str):
            business_id = _obj(business_id)
        update = {
            "plan": normal,
            "plan_name": meta["name"],
            "plan_price": meta["price"],
            "plan_price_label": meta["price_label"],
            "country": code,
            "business_country": code,
            "billing_country": code,
            "stripe_customer_id": stripe_customer_id,
            "stripe_subscription_id": stripe_subscription_id,
            "subscription_status": "trialing",
            "trial_started_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.users.update_one({"_id": business_id}, {"$set": update})
        await db.users.update_many(
            {"business_id": business_id, "role": {"$in": ["worker", "manager", "office_admin", "payroll"]}},
            {"$set": {"plan": normal, "plan_name": meta["name"], "country": code, "business_country": code}},
        )
        return {"plan": normal, "plan_name": meta["name"], "country": code, "plan_price": meta["price"], "plan_price_label": meta["price_label"]}

    app.get_stripe_price_id = get_stripe_price_id
    app.set_business_plan_from_checkout = set_business_plan_from_checkout


def _stripe_line_item(plan, country):
    meta = _meta_for(plan, country)
    price_id, _ = _first_env(_price_envs(plan, country))
    if price_id:
        return {"price": price_id, "quantity": 1}
    return {
        "price_data": {
            "currency": str(meta["currency"]).lower(),
            "unit_amount": int(round(float(meta["price"]) * 100)),
            "recurring": {"interval": "month"},
            "product_data": {
                "name": f"Churvox {meta['name']}",
                "description": "Churvox monthly subscription plan",
            },
        },
        "quantity": 1,
    }


def install(router):
    if getattr(router, "churvox_plan_consistency_installed", False):
        return

    _patch_globals()
    _remove_route(router, "/billing/start-checkout-form", "POST")
    _remove_route(router, "/billing/create-checkout-session", "POST")
    _remove_route(router, "/billing/confirm-checkout", "POST")
    _remove_route(router, "/billing/subscription-status", "GET")
    _remove_route(router, "/billing/plan-metadata", "GET")

    @router.get("/billing/plan-metadata")
    async def plan_metadata():
        return {"success": True, "plans": PLAN_META, "countries": COUNTRY_META, "key_map": {"Start": "solo", "Crew": "team", "Operator": "pro", "Command": "enterprise"}}

    @router.get("/billing/subscription-status")
    async def subscription_status(request: Request):
        app = _server()
        db = getattr(app, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        user = await _user(request)
        owner = await _owner_doc(db, user)
        country = _country(owner.get("billing_country") or owner.get("business_country") or owner.get("country") or user.get("country") or "NZ")
        plan = _normal_plan(owner.get("plan") or user.get("plan") or "solo")
        meta = _meta_for(plan, country)
        return {"success": True, "data": {"plan": plan, "plan_name": meta["name"], "plan_price": meta["price"], "plan_price_label": meta["price_label"], "country": country, "billing_country": country, "currency": meta["currency"], "tax_label": meta["tax_label"], "limits": meta, "stripe_customer_id": owner.get("stripe_customer_id"), "stripe_subscription_id": owner.get("stripe_subscription_id"), "subscription_status": owner.get("subscription_status")}}

    @router.post("/billing/start-checkout-form")
    async def start_checkout_form(request: Request):
        app = _server()
        db = getattr(app, "db", None)
        stripe = getattr(app, "stripe", None)
        HTTPException = getattr(app, "HTTPException", Exception)
        if db is None or stripe is None:
            raise HTTPException(status_code=500, detail="Billing route not ready")

        try:
            user = await getattr(app, "require_employer")(request)
        except Exception:
            raise HTTPException(status_code=401, detail="Please sign in again before opening Stripe checkout")

        raw = (await request.body()).decode("utf-8", errors="ignore")
        form = {k: v[0] for k, v in parse_qs(raw).items() if v}
        owner = await _owner_doc(db, user)
        plan = _normal_plan(form.get("plan") or form.get("plan_type") or form.get("ui_plan") or "pro")
        country = _country(form.get("country") or owner.get("billing_country") or owner.get("business_country") or owner.get("country") or user.get("country") or "NZ")
        meta = _meta_for(plan, country)
        stripe_secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        if not stripe_secret:
            raise HTTPException(status_code=500, detail="Missing STRIPE_SECRET_KEY in Render")

        stripe.api_key = stripe_secret
        frontend = (getattr(app, "FRONTEND_URL", "") or os.environ.get("FRONTEND_URL", "https://www.churvox.com")).rstrip("/")
        business_id = str(user.get("business_id") or user.get("id"))
        await db.users.update_one({"_id": _obj(business_id)}, {"$set": {"billing_country": country, "business_country": country, "country": country, "updated_at": datetime.now(timezone.utc)}})
        metadata = {"user_id": str(user.get("id")), "business_id": business_id, "plan": plan, "plan_name": meta["name"], "country": country, "currency": meta["currency"], "purpose": "plan_subscription", "source": "clean_form_checkout"}
        args = {
            "mode": "subscription",
            "payment_method_collection": "if_required",
            "line_items": [_stripe_line_item(plan, country)],
            "success_url": f"{os.environ.get('BACKEND_PUBLIC_URL', 'https://grassley-backend.onrender.com').rstrip('/')}/api/billing/checkout-return?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{frontend}/plans?checkout=cancelled&plan={plan}&country={country}",
            "metadata": metadata,
            "subscription_data": {"trial_period_days": 14, "trial_settings": {"end_behavior": {"missing_payment_method": "cancel"}}, "metadata": metadata},
        }
        if owner.get("stripe_customer_id"):
            args["customer"] = owner.get("stripe_customer_id")
        elif user.get("email"):
            args["customer_email"] = user.get("email")
        try:
            session = stripe.checkout.Session.create(**args)
            await db.billing_plan_sessions.update_one(
                {"stripe_session_id": session.id},
                {"$setOnInsert": {"business_id": business_id, "owner_user_id": str(user.get("id")), "plan": plan, "country": country, "stripe_session_id": session.id, "status": "created", "created_at": datetime.now(timezone.utc)}},
                upsert=True,
            )
            return RedirectResponse(session.url, status_code=303)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Stripe checkout failed: {exc}")

    @router.post("/billing/create-checkout-session")
    async def create_checkout(payload: dict, request: Request):
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
        stripe_secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        if not stripe_secret:
            return {"success": False, "error": "Missing STRIPE_SECRET_KEY in Render."}

        stripe.api_key = stripe_secret
        frontend = (getattr(app, "FRONTEND_URL", "") or os.environ.get("FRONTEND_URL", "https://www.churvox.com")).rstrip("/")
        business_id = str(user.get("business_id") or user.get("id"))
        await db.users.update_one({"_id": _obj(business_id)}, {"$set": {"billing_country": country, "business_country": country, "country": country, "updated_at": datetime.now(timezone.utc)}})
        metadata = {"user_id": str(user.get("id")), "business_id": business_id, "plan": plan, "plan_name": meta["name"], "country": country, "currency": meta["currency"], "purpose": "plan_subscription", "source": "clean_json_checkout_legacy_module_fix"}
        args = {
            "mode": "subscription",
            "payment_method_collection": "if_required",
            "line_items": [_stripe_line_item(plan, country)],
            "success_url": f"{os.environ.get('BACKEND_PUBLIC_URL', 'https://grassley-backend.onrender.com').rstrip('/')}/api/billing/checkout-return?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{frontend}/plans?checkout=cancelled&plan={plan}&country={country}",
            "metadata": metadata,
            "subscription_data": {"trial_period_days": 14, "trial_settings": {"end_behavior": {"missing_payment_method": "cancel"}}, "metadata": metadata},
        }
        if owner.get("stripe_customer_id"):
            args["customer"] = owner.get("stripe_customer_id")
        elif user.get("email"):
            args["customer_email"] = user.get("email")
        try:
            session = stripe.checkout.Session.create(**args)
            await db.billing_plan_sessions.update_one(
                {"stripe_session_id": session.id},
                {"$setOnInsert": {"business_id": business_id, "owner_user_id": str(user.get("id")), "plan": plan, "country": country, "stripe_session_id": session.id, "status": "created", "created_at": datetime.now(timezone.utc)}},
                upsert=True,
            )
            return {"success": True, "url": session.url, "checkout_url": session.url, "session_id": session.id, "plan": plan, "plan_name": meta["name"], "country": country, "trial_days": 14, "no_card_required": True}
        except Exception as exc:
            return {"success": False, "error": f"Stripe checkout failed: {exc}"}

    @router.post("/billing/confirm-checkout")
    async def confirm_checkout(payload: dict, request: Request):
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
        existing = await db.billing_plan_sessions.find_one({"stripe_session_id": session_id})
        if existing and existing.get("status") == "confirmed":
            return {"success": True, "message": "Plan already activated", "plan": existing.get("plan"), "country": existing.get("country"), "already_confirmed": True}
        stripe_secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        if not stripe_secret:
            return {"success": False, "error": "Missing STRIPE_SECRET_KEY in Render."}
        stripe.api_key = stripe_secret
        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except Exception as exc:
            return {"success": False, "error": f"Could not verify Stripe session: {exc}"}
        if getattr(session, "payment_status", None) not in ["paid", "no_payment_required"]:
            return {"success": False, "error": "Stripe checkout is not complete yet"}
        meta = getattr(session, "metadata", {}) or {}
        plan = _normal_plan(meta.get("plan") or payload.get("plan"))
        country = _country(meta.get("country") or payload.get("country") or "NZ")
        owner_user_id = meta.get("user_id") or user.get("id")
        apply_plan = getattr(app, "set_business_plan_from_checkout", None)
        if not apply_plan:
            return {"success": False, "error": "Plan save helper not ready"}
        saved = await apply_plan(owner_user_id, plan, getattr(session, "customer", None), getattr(session, "subscription", None), country)
        await db.billing_plan_sessions.update_one(
            {"stripe_session_id": session_id},
            {"$set": {"business_id": str(user.get("business_id") or user.get("id")), "owner_user_id": str(owner_user_id), "plan": plan, "country": country, "status": "confirmed", "stripe_subscription_id": getattr(session, "subscription", None), "stripe_customer_id": getattr(session, "customer", None), "confirmed_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        return {"success": True, "message": "Plan activated", "plan": plan, "country": country, "saved": saved or {}}

    router.churvox_plan_consistency_installed = True
