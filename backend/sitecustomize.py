"""
Churvox runtime Stripe checkout repair.

Loaded automatically by Python before server.py. This patches the live FastAPI app
so both normal server:app and churvox_start:app can create Stripe checkout.
"""

from __future__ import annotations

import importlib.abc
import importlib.machinery
import os
import sys
from datetime import datetime, timezone
from urllib.parse import parse_qs

try:
    from pathlib import Path
    from base64 import b64decode
    p = Path(__file__).with_name("server.py")
    data = p.read_bytes()
    old_due = b64decode("e2YnIGZvciB7aHlkcmF0ZWQuZ2V0KCdhbW91bnRfZHVlJyl9JyBpZiBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBlbHNlICcnfQ==")
    new_due = b64decode("eycgZm9yICcgKyBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBpZiBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBlbHNlICcnfQ==")
    old_total = b64decode("e2YnIGZvciB7aHlkcmF0ZWQuZ2V0KCd0b3RhbCcpfScgaWYgaHlkcmF0ZWQuZ2V0KCd0b3RhbCcpIGVsc2UgJyd9")
    new_total = b64decode("eycgZm9yICcgKyBoeWRyYXRlZC5nZXQoJ3RvdGFsJykgaWYgaHlkcmF0ZWQuZ2V0KCd0b3RhbCcpIGVsc2UgJyd9")
    fixed = data.replace(old_due, new_due).replace(old_total, new_total)
    if fixed != data:
        p.write_bytes(fixed)
except Exception:
    pass

_checkout_patched = False
_checkout_finding = False

PLAN_ALIASES = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
PLAN_LABELS = {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command"}
PLAN_ENV_NAMES = {"solo": "START", "team": "CREW", "pro": "OPERATOR", "enterprise": "COMMAND"}
LEGACY_ENV_NAMES = {"solo": "SOLO", "team": "TEAM", "pro": "PRO", "enterprise": "ENTERPRISE"}
COUNTRY_ALIASES = {"NZ": "NZ", "NZL": "NZ", "NEW ZEALAND": "NZ", "AU": "AU", "AUS": "AU", "AUSTRALIA": "AU", "US": "US", "USA": "US", "UNITED STATES": "US", "UNITED STATES OF AMERICA": "US", "UK": "UK", "GB": "UK", "GBR": "UK", "UNITED KINGDOM": "UK"}
PLAN_PRICES = {"solo": {"NZ": 39, "AU": 39, "US": 29, "UK": 25}, "team": {"NZ": 89, "AU": 89, "US": 69, "UK": 59}, "pro": {"NZ": 149, "AU": 149, "US": 119, "UK": 99}, "enterprise": {"NZ": 299, "AU": 299, "US": 239, "UK": 199}}
CURRENCIES = {"NZ": "nzd", "AU": "aud", "US": "usd", "UK": "gbp"}
OWNER_ROLES = {"employer", "admin", "owner", "business_owner", "superadmin", "manager", "office_admin"}


def _s(value):
    return "" if value is None else str(value)


def _plan(value=None):
    return PLAN_ALIASES.get(_s(value or "pro").strip().lower(), "pro")


def _country(value=None):
    raw = _s(value or os.environ.get("CHURVOX_BILLING_COUNTRY") or os.environ.get("DEFAULT_BILLING_COUNTRY") or "NZ").strip().upper()
    return COUNTRY_ALIASES.get(raw, "NZ")


def _amount_cents(plan, country):
    amount = PLAN_PRICES.get(plan, PLAN_PRICES["pro"]).get(country, PLAN_PRICES.get(plan, PLAN_PRICES["pro"])["NZ"])
    return int(round(float(amount) * 100))


def _price_id(plan, country):
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


def _checkout_line_item(plan, country):
    price_id, source = _price_id(plan, country)
    if price_id:
        return {"price": price_id, "quantity": 1}, source
    return {
        "price_data": {
            "currency": CURRENCIES.get(country, "nzd"),
            "unit_amount": _amount_cents(plan, country),
            "recurring": {"interval": "month"},
            "product_data": {"name": f"Churvox {PLAN_LABELS.get(plan, 'Operator')}", "description": "Churvox monthly subscription plan"},
        },
        "quantity": 1,
    }, source


def _remove_checkout_routes(app):
    old_paths = {"/api/billing/create-checkout-session", "/api/billing/start-checkout", "/api/billing/start-checkout-form"}
    app.router.routes = [route for route in list(app.router.routes) if getattr(route, "path", "") not in old_paths]


def _billing_allowed(user):
    role = _s((user or {}).get("role") or "employer").strip().lower()
    return role in OWNER_ROLES or bool((user or {}).get("is_admin") or (user or {}).get("is_platform_owner"))


async def _user_from_token(module, token):
    token = _s(token).strip()
    if not token:
        raise module.HTTPException(status_code=401, detail="Missing checkout token")
    try:
        payload = module.jwt.decode(token, module.JWT_SECRET, algorithms=[module.JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise module.HTTPException(status_code=401, detail="Invalid token type")
        user = await module.db.users.find_one({"_id": module.ObjectId(payload["sub"])})
        if not user:
            raise module.HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        if "business_id" in user and isinstance(user["business_id"], module.ObjectId):
            user["business_id"] = str(user["business_id"])
        elif "business_id" not in user:
            user["business_id"] = user["id"]
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except Exception as exc:
        if exc.__class__.__name__ == "HTTPException":
            raise
        raise module.HTTPException(status_code=401, detail="Invalid checkout token")


async def _make_checkout(module, request, payload):
    payload = dict(payload or {})
    token = payload.get("token") or payload.get("access_token")
    user = await _user_from_token(module, token) if token else await module.get_current_user(request)
    if not _billing_allowed(user):
        raise module.HTTPException(status_code=403, detail="Only business owners and admins can start billing checkout")

    secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not secret:
        raise module.HTTPException(status_code=500, detail="Stripe secret key not configured in Render")
    module.stripe.api_key = secret

    plan = _plan(payload.get("plan") or payload.get("plan_type") or payload.get("ui_plan") or payload.get("backend_plan") or payload.get("legacy_plan"))
    country = _country(payload.get("country") or payload.get("region") or payload.get("billing_country"))
    line_item, price_source = _checkout_line_item(plan, country)
    frontend = (os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
    metadata = {"user_id": _s(user.get("id") or user.get("_id")), "business_id": _s(user.get("business_id") or user.get("id")), "plan": plan, "country": country, "source": "sitecustomize_checkout"}

    try:
        session = module.stripe.checkout.Session.create(
            mode="subscription",
            payment_method_collection="if_required",
            customer_email=user.get("email"),
            line_items=[line_item],
            subscription_data={"trial_period_days": 14, "trial_settings": {"end_behavior": {"missing_payment_method": "cancel"}}, "metadata": metadata},
            metadata=metadata,
            success_url=f"{frontend}/billing/success?session_id={{CHECKOUT_SESSION_ID}}&plan={plan}&country={country}",
            cancel_url=f"{frontend}/dashboard?checkout=cancelled&plan={plan}&country={country}#plans",
        )
    except Exception as exc:
        raise module.HTTPException(status_code=500, detail=f"Stripe checkout error: {str(exc)}")

    try:
        await module.db.checkout_debug.insert_one({**metadata, "session_id": session.id, "price_source": price_source, "created_at": datetime.now(timezone.utc)})
    except Exception:
        pass

    return session, plan, country, price_source


def _patch_server(module):
    global _checkout_patched
    if _checkout_patched or not hasattr(module, "app"):
        return
    _checkout_patched = True

    app = module.app
    _remove_checkout_routes(app)
    Body = module.Body
    Request = module.Request
    RedirectResponse = module.RedirectResponse

    @app.get("/api/billing/start-checkout")
    async def start_checkout(request: Request, plan: str = "pro", country: str = "NZ"):
        session, _plan_value, _country_value, _source = await _make_checkout(module, request, {"plan": plan, "country": country})
        return RedirectResponse(session.url, status_code=303)

    @app.post("/api/billing/start-checkout-form")
    async def start_checkout_form(request: Request):
        raw = (await request.body()).decode("utf-8", errors="ignore")
        payload = {key: values[0] for key, values in parse_qs(raw).items() if values}
        session, _plan_value, _country_value, _source = await _make_checkout(module, request, payload)
        return RedirectResponse(session.url, status_code=303)

    @app.post("/api/billing/create-checkout-session")
    async def create_checkout_session(request: Request, payload: dict = Body(default_factory=dict)):
        session, plan, country, price_source = await _make_checkout(module, request, payload)
        return {"success": True, "url": session.url, "checkout_url": session.url, "session_id": session.id, "plan": plan, "country": country, "price_source": price_source}

    try:
        module.logger.info("[Churvox] Stripe checkout routes installed by sitecustomize")
    except Exception:
        pass


class _CheckoutLoader(importlib.abc.Loader):
    def __init__(self, wrapped):
        self.wrapped = wrapped

    def create_module(self, spec):
        if hasattr(self.wrapped, "create_module"):
            return self.wrapped.create_module(spec)
        return None

    def exec_module(self, module):
        self.wrapped.exec_module(module)
        _patch_server(module)


class _CheckoutFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        global _checkout_finding
        if fullname != "server" or _checkout_finding:
            return None
        _checkout_finding = True
        try:
            spec = importlib.machinery.PathFinder.find_spec(fullname, path)
            if spec and spec.loader:
                spec.loader = _CheckoutLoader(spec.loader)
                return spec
            return None
        finally:
            _checkout_finding = False


try:
    if "server" in sys.modules:
        _patch_server(sys.modules["server"])
    else:
        sys.meta_path.insert(0, _CheckoutFinder())
except Exception:
    pass
