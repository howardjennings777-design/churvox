"""
Clean Churvox production entrypoint.

This imports the existing server app, then installs a reliable Stripe checkout
route on top of it before Uvicorn serves the app.

Why this exists:
- The old checkout route was brittle around plan aliases, roles and Stripe price envs.
- Browser fetch handling made it hard to tell if checkout failed or just never redirected.
- This adds /api/billing/start-checkout as a real browser redirect to Stripe.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from fastapi import Body, HTTPException, Request
from starlette.responses import RedirectResponse

import server

app = server.app

PLAN_ALIASES = {
    "start": "solo",
    "solo": "solo",
    "crew": "team",
    "team": "team",
    "operator": "pro",
    "pro": "pro",
    "command": "enterprise",
    "enterprise": "enterprise",
}
PLAN_LABELS = {
    "solo": "Start",
    "team": "Crew",
    "pro": "Operator",
    "enterprise": "Command",
}
PLAN_ENV_NAMES = {
    "solo": "START",
    "team": "CREW",
    "pro": "OPERATOR",
    "enterprise": "COMMAND",
}
LEGACY_ENV_NAMES = {
    "solo": "SOLO",
    "team": "TEAM",
    "pro": "PRO",
    "enterprise": "ENTERPRISE",
}
COUNTRY_ALIASES = {
    "NZ": "NZ",
    "NZL": "NZ",
    "NEW ZEALAND": "NZ",
    "AU": "AU",
    "AUS": "AU",
    "AUSTRALIA": "AU",
    "US": "US",
    "USA": "US",
    "UNITED STATES": "US",
    "UNITED STATES OF AMERICA": "US",
    "UK": "UK",
    "GB": "UK",
    "GBR": "UK",
    "UNITED KINGDOM": "UK",
}
PLAN_PRICES = {
    "solo": {"NZ": 39, "AU": 39, "US": 29, "UK": 25},
    "team": {"NZ": 89, "AU": 89, "US": 69, "UK": 59},
    "pro": {"NZ": 149, "AU": 149, "US": 119, "UK": 99},
    "enterprise": {"NZ": 299, "AU": 299, "US": 239, "UK": 199},
}
CURRENCIES = {
    "NZ": "nzd",
    "AU": "aud",
    "US": "usd",
    "UK": "gbp",
}
OWNER_BILLING_ROLES = {
    "employer",
    "admin",
    "owner",
    "business_owner",
    "superadmin",
    "manager",
    "office_admin",
}


def _s(value: Any) -> str:
    return "" if value is None else str(value)


def _normal_plan(value: Any = None) -> str:
    raw = _s(value or "pro").strip().lower()
    return PLAN_ALIASES.get(raw, "pro")


def _normal_country(value: Any = None) -> str:
    raw = _s(value or os.environ.get("CHURVOX_BILLING_COUNTRY") or os.environ.get("DEFAULT_BILLING_COUNTRY") or "NZ").strip().upper()
    return COUNTRY_ALIASES.get(raw, "NZ")


def _price_env(plan: str, country: str) -> tuple[str, str]:
    candidates = [
        f"STRIPE_PRICE_{PLAN_ENV_NAMES.get(plan, 'OPERATOR')}_{country}",
        f"STRIPE_PRICE_{LEGACY_ENV_NAMES.get(plan, 'PRO')}_{country}",
        f"STRIPE_PRICE_{PLAN_ENV_NAMES.get(plan, 'OPERATOR')}",
        f"STRIPE_PRICE_{LEGACY_ENV_NAMES.get(plan, 'PRO')}",
    ]
    for key in candidates:
        value = os.environ.get(key, "").strip()
        if value:
            return value, key
    return "", "dynamic_price_data"


def _amount_cents(plan: str, country: str) -> int:
    amount = PLAN_PRICES.get(plan, PLAN_PRICES["pro"]).get(country, PLAN_PRICES.get(plan, PLAN_PRICES["pro"])["NZ"])
    return int(round(float(amount) * 100))


def _checkout_line_item(plan: str, country: str) -> tuple[dict[str, Any], str]:
    price_id, source = _price_env(plan, country)
    if price_id:
        return {"price": price_id, "quantity": 1}, source

    return {
        "price_data": {
            "currency": CURRENCIES.get(country, "nzd"),
            "unit_amount": _amount_cents(plan, country),
            "recurring": {"interval": "month"},
            "product_data": {
                "name": f"Churvox {PLAN_LABELS.get(plan, 'Operator')}",
                "description": "Churvox monthly subscription plan",
            },
        },
        "quantity": 1,
    }, source


def _remove_checkout_routes() -> None:
    remove_paths = {
        "/api/billing/create-checkout-session",
        "/api/billing/start-checkout",
    }
    kept = []
    for route in list(app.router.routes):
        if getattr(route, "path", "") in remove_paths:
            continue
        kept.append(route)
    app.router.routes = kept


def _billing_allowed(user: dict[str, Any]) -> bool:
    role = _s((user or {}).get("role") or "employer").strip().lower()
    return bool(
        role in OWNER_BILLING_ROLES
        or (user or {}).get("is_admin")
        or (user or {}).get("is_platform_owner")
    )


async def _make_checkout(request: Request, payload: dict[str, Any]) -> tuple[Any, str, str, str]:
    user = await server.get_current_user(request)
    if not _billing_allowed(user):
        raise HTTPException(status_code=403, detail="Only business owners and admins can start billing checkout")

    secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not secret:
        raise HTTPException(status_code=500, detail="Stripe secret key not configured in Render")
    server.stripe.api_key = secret

    payload = dict(payload or {})
    plan = _normal_plan(
        payload.get("plan")
        or payload.get("plan_type")
        or payload.get("ui_plan")
        or payload.get("backend_plan")
        or payload.get("legacy_plan")
    )
    country = _normal_country(payload.get("country") or payload.get("region") or payload.get("billing_country"))
    line_item, price_source = _checkout_line_item(plan, country)
    frontend = (os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")

    metadata = {
        "user_id": _s(user.get("id") or user.get("_id")),
        "business_id": _s(user.get("business_id") or user.get("id")),
        "plan": plan,
        "country": country,
        "source": "churvox_start_checkout",
    }

    try:
        session = server.stripe.checkout.Session.create(
            mode="subscription",
            customer_email=user.get("email"),
            line_items=[line_item],
            subscription_data={"trial_period_days": 14, "metadata": metadata},
            metadata=metadata,
            success_url=f"{frontend}/billing/success?session_id={{CHECKOUT_SESSION_ID}}&plan={plan}&country={country}",
            cancel_url=f"{frontend}/dashboard?checkout=cancelled&plan={plan}&country={country}#plans",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Stripe checkout error: {str(exc)}")

    try:
        await server.db.checkout_debug.insert_one({
            "business_id": metadata["business_id"],
            "user_id": metadata["user_id"],
            "plan": plan,
            "country": country,
            "session_id": session.id,
            "price_source": price_source,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass

    return session, plan, country, price_source


_remove_checkout_routes()


@app.get("/api/billing/start-checkout")
async def start_checkout(request: Request, plan: str = "pro", country: str = "NZ"):
    session, _plan, _country, _source = await _make_checkout(request, {"plan": plan, "country": country})
    return RedirectResponse(session.url, status_code=303)


@app.post("/api/billing/create-checkout-session")
async def create_checkout_session(request: Request, payload: dict = Body(default_factory=dict)):
    session, plan, country, price_source = await _make_checkout(request, payload)
    return {
        "success": True,
        "url": session.url,
        "checkout_url": session.url,
        "session_id": session.id,
        "plan": plan,
        "country": country,
        "price_source": price_source,
    }

try:
    server.logger.info("[Churvox] Clean production checkout entrypoint loaded")
except Exception:
    pass
