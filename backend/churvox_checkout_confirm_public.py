import os
import sys
from datetime import datetime, timezone, timedelta
from fastapi import Request

PLAN_ALIAS = {
    "start": "solo", "solo": "solo",
    "crew": "team", "team": "team",
    "operator": "pro", "pro": "pro",
    "command": "enterprise", "enterprise": "enterprise",
}
PLAN_NAME = {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command"}
PLAN_PRICE = {"solo": 39, "team": 89, "pro": 149, "enterprise": 299}


def _server():
    return sys.modules.get("churvox_legacy_server") or sys.modules.get("backend.server") or sys.modules.get("server") or sys.modules.get("main")


def _clean(value):
    return str(value or "").strip()


def _plan(value):
    key = _clean(value).lower().replace(" ", "_").replace("-", "_")
    return PLAN_ALIAS.get(key, "pro")


def _country(value):
    code = (_clean(value) or "NZ").upper()
    aliases = {"NZL": "NZ", "NEW ZEALAND": "NZ", "AUS": "AU", "AUSTRALIA": "AU", "USA": "US", "UNITED STATES": "US", "GB": "UK", "GBR": "UK", "UNITED KINGDOM": "UK"}
    code = aliases.get(code, code)
    return code if code in {"NZ", "AU", "US", "UK"} else "NZ"


def _oid(value):
    app = _server()
    ObjectId = getattr(app, "ObjectId", None)
    try:
        return ObjectId(str(value)) if value and ObjectId else None
    except Exception:
        return None


def _remove_route(router, suffix, method):
    router.routes = [
        route for route in getattr(router, "routes", [])
        if not (str(getattr(route, "path", "")).endswith(suffix) and method in (getattr(route, "methods", set()) or set()))
    ]


def _user_filter(user_id, business_id, email):
    clauses = []
    for raw in [business_id, user_id]:
        value = _clean(raw)
        if not value:
            continue
        oid = _oid(value)
        if oid:
            clauses.extend([{"_id": oid}, {"business_id": oid}, {"owner_id": oid}])
        clauses.extend([{"id": value}, {"business_id": value}, {"owner_id": value}])
    if _clean(email):
        clauses.append({"email": _clean(email).lower()})
    return {"$or": clauses} if clauses else {"_id": "__no_user_match__"}


def _trial_ends_from_session(session, now):
    try:
        subscription = getattr(session, "subscription", None)
        app = _server()
        stripe = getattr(app, "stripe", None)
        secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        if subscription and stripe and secret:
            stripe.api_key = secret
            sub = stripe.Subscription.retrieve(subscription)
            trial_end = getattr(sub, "trial_end", None) or (sub.get("trial_end") if isinstance(sub, dict) else None)
            if trial_end:
                return datetime.fromtimestamp(int(trial_end), tz=timezone.utc)
    except Exception:
        pass
    return now + timedelta(days=14)


async def _save_session(session_id):
    app = _server()
    db = getattr(app, "db", None)
    stripe = getattr(app, "stripe", None)
    secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not session_id:
        return {"success": False, "error": "Missing Stripe session id"}
    if db is None or stripe is None or not secret:
        return {"success": False, "error": "Billing save route not ready"}

    try:
        stripe.api_key = secret
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as exc:
        return {"success": False, "error": f"Could not verify Stripe session: {exc}"}

    meta = dict(getattr(session, "metadata", {}) or {})
    plan = _plan(meta.get("plan"))
    country = _country(meta.get("country"))
    user_id = _clean(meta.get("user_id"))
    business_id = _clean(meta.get("business_id") or user_id)
    email = _clean(getattr(session, "customer_email", "") or meta.get("email") or meta.get("customer_email"))

    now = datetime.now(timezone.utc)
    trial_ends_at = _trial_ends_from_session(session, now)
    update = {
        "plan": plan,
        "subscription_plan": plan,
        "plan_name": PLAN_NAME.get(plan, "Operator"),
        "plan_price": PLAN_PRICE.get(plan, 149),
        "billing_country": country,
        "business_country": country,
        "country": country,
        "subscription_status": "trialing",
        "plan_status": "trialing",
        "has_app_access": True,
        "billing_lock_reason": None,
        "stripe_customer_id": _clean(getattr(session, "customer", "")),
        "stripe_subscription_id": _clean(getattr(session, "subscription", "")),
        "trial_started_at": now,
        "trial_ends_at": trial_ends_at,
        "trial_days": 14,
        "updated_at": now,
    }

    result = await db.users.update_many(_user_filter(user_id, business_id, email), {"$set": update})
    matched = int(getattr(result, "matched_count", 0) or 0)

    await db.billing_plan_sessions.update_one(
        {"stripe_session_id": session_id},
        {"$set": {"status": "confirmed" if matched else "save_failed", "matched_users": matched, "plan": plan, "country": country, "business_id": business_id, "owner_user_id": user_id, "customer_email": email, "trial_ends_at": trial_ends_at, "updated_at": now}},
        upsert=True,
    )

    if matched < 1:
        return {"success": False, "error": "No user matched Stripe metadata", "metadata": meta, "customer_email": email}
    return {"success": True, "plan": plan, "country": country, "matched_users": matched, "subscription_status": "trialing", "trial_ends_at": trial_ends_at.isoformat(), "has_app_access": True}


def install(router):
    if getattr(router, "churvox_checkout_confirm_public_installed", False):
        return

    _remove_route(router, "/billing/confirm-checkout", "POST")
    _remove_route(router, "/billing/checkout-save", "POST")
    _remove_route(router, "/billing/checkout-save", "GET")

    @router.post("/billing/confirm-checkout")
    async def confirm_checkout_public(payload: dict, request: Request):
        session_id = _clean((payload or {}).get("session_id") or request.query_params.get("session_id"))
        return await _save_session(session_id)

    @router.post("/billing/checkout-save")
    async def checkout_save_public(payload: dict, request: Request):
        session_id = _clean((payload or {}).get("session_id") or request.query_params.get("session_id"))
        return await _save_session(session_id)

    @router.get("/billing/checkout-save")
    async def checkout_save_public_get(request: Request):
        return await _save_session(_clean(request.query_params.get("session_id")))

    router.churvox_checkout_confirm_public_installed = True
