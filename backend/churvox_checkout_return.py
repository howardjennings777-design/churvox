import os
import sys
from datetime import datetime, timezone, timedelta

from fastapi import Request
from fastapi.responses import RedirectResponse


PLAN_ALIAS = {
    "start": "solo",
    "solo": "solo",
    "crew": "team",
    "team": "team",
    "operator": "pro",
    "pro": "pro",
    "command": "enterprise",
    "enterprise": "enterprise",
}

PLAN_NAME = {
    "solo": "Start",
    "team": "Crew",
    "pro": "Operator",
    "enterprise": "Command",
}

PLAN_PRICE = {
    "solo": 39,
    "team": 89,
    "pro": 149,
    "enterprise": 299,
}

COUNTRIES = {"NZ", "AU", "US", "UK"}


def _server():
    return (
        sys.modules.get("churvox_legacy_server")
        or sys.modules.get("backend.server")
        or sys.modules.get("server")
        or sys.modules.get("main")
    )


def _clean(value, fallback=""):
    text = str(value or "").strip()
    return text or fallback


def _plan(value):
    key = _clean(value, "pro").lower().replace(" ", "_").replace("-", "_")
    return PLAN_ALIAS.get(key, "pro")


def _country(value):
    code = _clean(value, "NZ").upper()
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
    return code if code in COUNTRIES else "NZ"


def _oid(value):
    app = _server()
    ObjectId = getattr(app, "ObjectId", None)
    try:
        return ObjectId(str(value)) if value and ObjectId else None
    except Exception:
        return None


def _frontend():
    app = _server()
    return (getattr(app, "FRONTEND_URL", "") or os.environ.get("FRONTEND_URL", "https://www.churvox.com")).rstrip("/")


def _backend():
    return (os.environ.get("BACKEND_PUBLIC_URL") or os.environ.get("API_PUBLIC_URL") or "https://grassley-backend.onrender.com").rstrip("/")


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


async def _save_from_session(session):
    app = _server()
    db = getattr(app, "db", None)
    if db is None:
        return {"success": False, "error": "Database not ready"}

    meta = dict(getattr(session, "metadata", {}) or {})
    plan = _plan(meta.get("plan"))
    country = _country(meta.get("country"))
    user_id = _clean(meta.get("user_id"))
    business_id = _clean(meta.get("business_id") or user_id)

    owner_oid = _oid(business_id) or _oid(user_id)
    user_oid = _oid(user_id)
    if not owner_oid and not user_oid:
        return {"success": False, "error": "No usable user_id/business_id in Stripe metadata", "metadata": meta}

    owner_oid = owner_oid or user_oid
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

    targets = []
    if owner_oid:
        targets.append(owner_oid)
    if user_oid and user_oid != owner_oid:
        targets.append(user_oid)

    matched = 0
    for oid in targets:
        result = await db.users.update_one({"_id": oid}, {"$set": update})
        matched += int(getattr(result, "matched_count", 0) or 0)

    await db.billing_plan_sessions.update_one(
        {"stripe_session_id": _clean(getattr(session, "id", ""))},
        {"$set": {
            "business_id": str(owner_oid),
            "owner_user_id": user_id,
            "plan": plan,
            "country": country,
            "status": "confirmed",
            "matched_users": matched,
            "stripe_customer_id": update["stripe_customer_id"],
            "stripe_subscription_id": update["stripe_subscription_id"],
            "trial_ends_at": trial_ends_at,
            "confirmed_at": now,
            "source": "checkout_return_backend_save",
        }},
        upsert=True,
    )

    if matched <= 0:
        return {"success": False, "error": "No user document matched Stripe metadata", "metadata": meta}
    return {"success": True, "plan": plan, "country": country, "matched": matched, "subscription_status": "trialing", "trial_ends_at": trial_ends_at.isoformat(), "has_app_access": True}


async def _retrieve_and_save(session_id):
    app = _server()
    stripe = getattr(app, "stripe", None)
    secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not session_id:
        return {"success": False, "error": "Missing Stripe session id"}
    if not stripe or not secret:
        return {"success": False, "error": "Stripe not ready"}
    try:
        stripe.api_key = secret
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as exc:
        return {"success": False, "error": f"Could not verify Stripe session: {exc}"}
    return await _save_from_session(session)


def install(router):
    if getattr(router, "churvox_checkout_return_installed", False):
        return

    @router.get("/billing/checkout-save")
    async def checkout_save_get(request: Request):
        session_id = _clean(request.query_params.get("session_id"))
        return await _retrieve_and_save(session_id)

    @router.post("/billing/checkout-save")
    async def checkout_save_post(payload: dict, request: Request):
        session_id = _clean((payload or {}).get("session_id") or request.query_params.get("session_id"))
        return await _retrieve_and_save(session_id)

    @router.get("/billing/checkout-return")
    async def checkout_return(request: Request):
        frontend = _frontend()
        session_id = _clean(request.query_params.get("session_id"))
        saved = await _retrieve_and_save(session_id)
        if not saved.get("success"):
            return RedirectResponse(f"{frontend}/plans?checkout=save_failed&reason=metadata_save_failed", status_code=303)
        return RedirectResponse(
            f"{frontend}/plans?checkout=saved&plan={saved.get('plan')}&country={saved.get('country')}",
            status_code=303,
        )

    router.churvox_checkout_return_installed = True


def backend_success_url():
    return f"{_backend()}/api/billing/checkout-return?session_id={{CHECKOUT_SESSION_ID}}"
