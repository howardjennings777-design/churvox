from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

VERSION = "churvox-paid-launch-billing-final-20260713a"
FRONTEND_DEFAULT = "https://www.churvox.com"
OWNER_ROLES = {"employer", "owner", "admin", "business_owner", "superadmin", "manager", "office_admin"}

PLAN_ALIASES = {
    "start": "solo", "solo": "solo",
    "crew": "team", "team": "team",
    "operator": "pro", "pro": "pro",
    "command": "enterprise", "enterprise": "enterprise",
}
PLAN_LABELS = {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command"}
PLAN_ENV = {"solo": "START", "team": "CREW", "pro": "OPERATOR", "enterprise": "COMMAND"}
PLAN_LEGACY_ENV = {"solo": "SOLO", "team": "TEAM", "pro": "PRO", "enterprise": "ENTERPRISE"}
PLAN_CENTS = {
    "solo": {"NZ": 3900, "AU": 3900, "US": 2900, "UK": 2500},
    "team": {"NZ": 8900, "AU": 8900, "US": 6900, "UK": 5900},
    "pro": {"NZ": 14900, "AU": 14900, "US": 11900, "UK": 9900},
    "enterprise": {"NZ": 29900, "AU": 29900, "US": 23900, "UK": 19900},
}
CURRENCIES = {"NZ": "nzd", "AU": "aud", "US": "usd", "UK": "gbp"}
ADDONS = {
    "command_growth_pack": {
        "label": "Command Growth Pack",
        "price_env": "STRIPE_PRICE_COMMAND_GROWTH_PACK",
        "cents": {"NZ": 9900, "AU": 9900, "US": 7900, "UK": 6900},
        "requires": {"enterprise", "command"},
    },
    "xero_addon": {
        "label": "Accounting Sync Add-on",
        "price_env": "STRIPE_PRICE_XERO_ADDON",
        "cents": {"NZ": 3900, "AU": 3900, "US": 2900, "UK": 2500},
        "requires": {"solo", "start", "team", "crew", "pro", "operator", "enterprise", "command"},
    },
}


def _text(value: Any, limit: int = 600) -> str:
    try:
        return str(value or "").strip()[:limit]
    except Exception:
        return ""


def _normal_plan(value: Any) -> str:
    return PLAN_ALIASES.get(_text(value).lower() or "pro", "pro")


def _normal_country(value: Any) -> str:
    raw = _text(value).upper() or "NZ"
    aliases = {"NZL": "NZ", "AUS": "AU", "USA": "US", "GB": "UK", "GBR": "UK"}
    code = aliases.get(raw, raw)
    return code if code in CURRENCIES else "NZ"


def _business_id(user: dict[str, Any]) -> str:
    return _text(user.get("business_id") or user.get("id") or user.get("_id"), 180)


def _user_id(user: dict[str, Any]) -> str:
    return _text(user.get("id") or user.get("_id"), 180)


def _is_owner(user: dict[str, Any]) -> bool:
    role = _text(user.get("role") or user.get("user_role") or "").lower()
    return role in OWNER_ROLES or bool(user.get("is_admin") or user.get("is_platform_owner"))


def _remove_route(app, path: str, method: str) -> None:
    app.router.routes = [
        route for route in list(getattr(app.router, "routes", []) or [])
        if not (
            getattr(route, "path", "") == path
            and method.upper() in set(getattr(route, "methods", set()) or set())
        )
    ]


def _route_owners(app, path: str) -> list[str]:
    owners = []
    for route in list(getattr(app.router, "routes", []) or []):
        if getattr(route, "path", "") != path:
            continue
        methods = sorted(str(value) for value in (getattr(route, "methods", set()) or set()))
        endpoint = getattr(route, "endpoint", None)
        owners.append(f"{','.join(methods)}:{getattr(endpoint, '__name__', 'unknown')}")
    return owners


def _price_id(plan: str, country: str) -> tuple[str, str]:
    current = PLAN_ENV.get(plan, "OPERATOR")
    legacy = PLAN_LEGACY_ENV.get(plan, "PRO")
    for key in (
        f"STRIPE_PRICE_{current}_{country}",
        f"STRIPE_PRICE_{legacy}_{country}",
        f"STRIPE_PRICE_{current}",
        f"STRIPE_PRICE_{legacy}",
    ):
        value = _text(os.environ.get(key), 240)
        if value:
            return value, key
    return "", "locked_dynamic_price_data"


def _plan_line_item(plan: str, country: str) -> tuple[dict[str, Any], str]:
    price_id, source = _price_id(plan, country)
    if price_id:
        return {"price": price_id, "quantity": 1}, source
    return {
        "price_data": {
            "currency": CURRENCIES[country],
            "unit_amount": PLAN_CENTS[plan][country],
            "recurring": {"interval": "month"},
            "product_data": {
                "name": f"Churvox {PLAN_LABELS[plan]}",
                "description": "Churvox monthly subscription plan",
            },
        },
        "quantity": 1,
    }, source


def _addon_line_item(addon: str, country: str, quantity: int) -> tuple[dict[str, Any], str]:
    config = ADDONS[addon]
    price_id = _text(os.environ.get(config["price_env"]), 240)
    if price_id:
        return {"price": price_id, "quantity": quantity}, config["price_env"]
    return {
        "price_data": {
            "currency": CURRENCIES[country],
            "unit_amount": config["cents"][country],
            "recurring": {"interval": "month"},
            "product_data": {
                "name": config["label"],
                "description": "Monthly Churvox add-on",
            },
        },
        "quantity": quantity,
    }, "locked_dynamic_price_data"


def _quantity(payload: dict[str, Any]) -> int:
    try:
        value = int(payload.get("quantity") or payload.get("growth_packs") or payload.get("packs") or 1)
    except Exception:
        value = 1
    return max(1, min(value, 5))


def _safe_stripe_failure(exc: Exception, stage: str) -> JSONResponse:
    code = _text(getattr(exc, "code", ""), 120)
    param = _text(getattr(exc, "param", ""), 120)
    error_type = type(exc).__name__
    return JSONResponse(
        {
            "success": False,
            "detail": "Secure checkout is temporarily unavailable. No subscription or charge was created.",
            "code": code or "stripe_checkout_unavailable",
            "stage": stage,
            "error_type": error_type,
            "param": param or None,
            "version": VERSION,
        },
        status_code=503,
    )


async def _payload(request: Request) -> dict[str, Any]:
    try:
        body = await request.json()
    except Exception:
        body = {}
    return body if isinstance(body, dict) else {}


def install(module, force: bool = False) -> bool:
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    stripe_module = getattr(module, "stripe", None)
    if stripe_module is None:
        try:
            import stripe as stripe_module  # type: ignore
        except Exception:
            stripe_module = None
    if app is None or db is None or get_current_user is None:
        return False
    if getattr(app.state, "churvox_paid_launch_billing_final", False) and not force:
        return True

    plan_paths = [
        "/api/billing/create-checkout-session",
        "/api/stripe/create-checkout-session",
        "/api/billing/checkout",
        "/api/stripe/checkout",
    ]
    addon_path = "/api/billing/create-addon-checkout-session"
    readiness_path = "/api/billing/checkout-readiness"
    for path in [*plan_paths, addon_path]:
        _remove_route(app, path, "POST")
    _remove_route(app, readiness_path, "GET")

    async def require_owner(request: Request) -> dict[str, Any]:
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Sign in before starting checkout")
        if not isinstance(user, dict) or not _is_owner(user):
            raise HTTPException(status_code=403, detail="Only business owners and admins can start checkout")
        return user

    async def create_plan_checkout(request: Request):
        user = await require_owner(request)
        body = await _payload(request)
        if stripe_module is None:
            return JSONResponse({"success": False, "detail": "Stripe checkout module is unavailable.", "code": "stripe_module_missing", "stage": "startup", "version": VERSION}, status_code=503)
        secret = _text(os.environ.get("STRIPE_SECRET_KEY"), 500)
        if not secret:
            return JSONResponse({"success": False, "detail": "Secure checkout is not configured yet.", "code": "stripe_secret_missing", "stage": "configuration", "version": VERSION}, status_code=503)
        stripe_module.api_key = secret
        plan = _normal_plan(body.get("plan") or body.get("plan_key") or body.get("selected_plan") or body.get("tier") or body.get("plan_name"))
        country = _normal_country(body.get("country") or body.get("billing_country"))
        line_item, price_source = _plan_line_item(plan, country)
        frontend = _text(os.environ.get("FRONTEND_URL") or FRONTEND_DEFAULT, 400).rstrip("/")
        metadata = {
            "user_id": _user_id(user),
            "business_id": _business_id(user),
            "plan": plan,
            "country": country,
            "source": "paid_launch_billing_final",
        }
        kwargs = {
            "mode": "subscription",
            "payment_method_collection": "if_required",
            "customer_email": user.get("email"),
            "client_reference_id": _user_id(user),
            "line_items": [line_item],
            "subscription_data": {"trial_period_days": 14, "metadata": metadata},
            "metadata": metadata,
            "success_url": f"{frontend}/dashboard?checkout=success&session_id={{CHECKOUT_SESSION_ID}}&plan={plan}&country={country}#plans",
            "cancel_url": f"{frontend}/dashboard?checkout=cancelled&plan={plan}&country={country}#plans",
        }
        try:
            session = await asyncio.wait_for(
                asyncio.to_thread(stripe_module.checkout.Session.create, **kwargs),
                timeout=20,
            )
        except Exception as exc:
            return _safe_stripe_failure(exc, "plan_session_create")
        session_id = _text(getattr(session, "id", ""), 240)
        checkout_url = _text(getattr(session, "url", ""), 1200)
        if not session_id or not checkout_url.startswith("https://"):
            return JSONResponse({"success": False, "detail": "Stripe did not return a secure checkout URL. No subscription was created.", "code": "stripe_url_missing", "stage": "plan_session_response", "version": VERSION}, status_code=503)
        try:
            await db.checkout_debug.insert_one({
                **metadata,
                "session_id": session_id,
                "price_source": price_source,
                "created_at": datetime.now(timezone.utc),
                "version": VERSION,
            })
        except Exception:
            pass
        return {
            "success": True,
            "url": checkout_url,
            "checkout_url": checkout_url,
            "session_id": session_id,
            "plan": plan,
            "plan_label": PLAN_LABELS[plan],
            "country": country,
            "price_source": price_source,
            "trial_days": 14,
            "version": VERSION,
        }

    async def create_addon_checkout(request: Request):
        user = await require_owner(request)
        body = await _payload(request)
        addon = _text(body.get("addon") or body.get("addon_key")).lower()
        if addon not in ADDONS:
            raise HTTPException(status_code=400, detail="Unknown Churvox add-on")
        current_plan = _text(user.get("plan") or user.get("ui_plan") or user.get("subscription_plan")).lower()
        if current_plan not in ADDONS[addon]["requires"]:
            raise HTTPException(status_code=403, detail="Command Growth Pack needs the Command plan." if addon == "command_growth_pack" else "This add-on needs an active Churvox plan.")
        if stripe_module is None:
            return JSONResponse({"success": False, "detail": "Stripe checkout module is unavailable.", "code": "stripe_module_missing", "stage": "startup", "version": VERSION}, status_code=503)
        secret = _text(os.environ.get("STRIPE_SECRET_KEY"), 500)
        if not secret:
            return JSONResponse({"success": False, "detail": "Secure checkout is not configured yet.", "code": "stripe_secret_missing", "stage": "configuration", "version": VERSION}, status_code=503)
        stripe_module.api_key = secret
        country = _normal_country(body.get("country") or body.get("billing_country"))
        quantity = _quantity(body) if addon == "command_growth_pack" else 1
        line_item, price_source = _addon_line_item(addon, country, quantity)
        frontend = _text(os.environ.get("FRONTEND_URL") or FRONTEND_DEFAULT, 400).rstrip("/")
        metadata = {
            "user_id": _user_id(user),
            "business_id": _business_id(user),
            "addon": addon,
            "quantity": str(quantity),
            "country": country,
            "source": "paid_launch_billing_final",
        }
        kwargs = {
            "mode": "subscription",
            "customer_email": user.get("email"),
            "client_reference_id": _user_id(user),
            "line_items": [line_item],
            "subscription_data": {"metadata": metadata},
            "metadata": metadata,
            "success_url": f"{frontend}/dashboard?addon_success=1&addon={addon}&quantity={quantity}&country={country}&session_id={{CHECKOUT_SESSION_ID}}#plans",
            "cancel_url": f"{frontend}/dashboard?addon_cancelled={addon}#plans",
        }
        try:
            session = await asyncio.wait_for(
                asyncio.to_thread(stripe_module.checkout.Session.create, **kwargs),
                timeout=20,
            )
        except Exception as exc:
            return _safe_stripe_failure(exc, "addon_session_create")
        session_id = _text(getattr(session, "id", ""), 240)
        checkout_url = _text(getattr(session, "url", ""), 1200)
        if not session_id or not checkout_url.startswith("https://"):
            return JSONResponse({"success": False, "detail": "Stripe did not return a secure add-on checkout URL. Nothing was charged.", "code": "stripe_url_missing", "stage": "addon_session_response", "version": VERSION}, status_code=503)
        return {
            "success": True,
            "url": checkout_url,
            "checkout_url": checkout_url,
            "session_id": session_id,
            "addon": addon,
            "quantity": quantity,
            "country": country,
            "price_source": price_source,
            "version": VERSION,
        }

    async def checkout_readiness():
        price_ids = {
            plan: bool(_price_id(plan, "NZ")[0])
            for plan in PLAN_LABELS
        }
        return {
            "success": True,
            "ready": stripe_module is not None and bool(_text(os.environ.get("STRIPE_SECRET_KEY"), 500)),
            "version": VERSION,
            "stripe_module": stripe_module is not None,
            "stripe_secret_configured": bool(_text(os.environ.get("STRIPE_SECRET_KEY"), 500)),
            "plan_price_ids": price_ids,
            "growth_pack_price_id": bool(_text(os.environ.get("STRIPE_PRICE_COMMAND_GROWTH_PACK"), 240)),
            "dynamic_locked_price_fallback": True,
            "route_owners": {
                path: _route_owners(app, path)
                for path in [plan_paths[0], addon_path]
            },
        }

    for path in plan_paths:
        app.add_api_route(path, create_plan_checkout, methods=["POST"])
    app.add_api_route(addon_path, create_addon_checkout, methods=["POST"])
    app.add_api_route(readiness_path, checkout_readiness, methods=["GET"])
    app.state.churvox_paid_launch_billing_final = VERSION
    return True
