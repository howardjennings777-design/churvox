from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import os
import sys

TARGETS = {"server", "backend.server"}
DONE = set()
ROLES = {"owner", "admin", "manager", "employer", "business_owner", "superadmin", "office_admin"}
PLANS = {"operator", "pro", "command", "enterprise"}


def t(value):
    return str(value or "").strip()


def low(value):
    return t(value).lower()


def env_name(*parts):
    return "".join(parts)


def configured_account():
    return t(os.environ.get(env_name("STRIPE", "_ONSITE", "_ACCOUNT", "_ID")) or os.environ.get(env_name("STRIPE", "_CONNECTED", "_ACCOUNT", "_ID")))


def configured_key():
    return t(
        os.environ.get(env_name("STRIPE", "_CONNECT", "_SECRET", "_KEY"))
        or os.environ.get(env_name("STRIPE", "_SECRET", "_KEY"))
        or os.environ.get(env_name("CHURVOX", "_STRIPE", "_SECRET", "_KEY"))
    )


def bid(user):
    return t(user.get("business_id") or user.get("businessId") or user.get("owner_business_id") or user.get("contractor_id") or user.get("id") or user.get("_id") or user.get("user_id"))


def uid(user):
    return t(user.get("id") or user.get("_id") or user.get("user_id"))


def role(user):
    return low(user.get("role") or user.get("user_role"))


def frontend():
    return t(os.environ.get("FRONTEND_URL") or os.environ.get("CHURVOX_FRONTEND_URL") or "https://www.churvox.com").rstrip("/")


def js(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: js(v) for k, v in value.items()}
    if isinstance(value, list):
        return [js(v) for v in value]
    try:
        if hasattr(value, "binary"):
            return str(value)
    except Exception:
        pass
    return value


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [r for r in app.router.routes if not route_matches(r, path, method)]
    except Exception:
        pass


async def owner_doc(db, user, ObjectId):
    business = bid(user)
    checks = []
    if business:
        checks.extend([{"business_id": business}, {"businessId": business}, {"id": business}])
        try:
            checks.append({"_id": ObjectId(business)})
        except Exception:
            pass
    if checks:
        try:
            row = await db.users.find_one({"$or": checks})
            if row:
                return row
        except Exception:
            pass
    return user


async def account_doc(db, user, ObjectId):
    business = bid(user)
    settings = {}
    try:
        settings = await db.payment_settings.find_one({"business_id": business}) or {}
    except Exception:
        settings = {}
    owner = await owner_doc(db, user, ObjectId)
    account = t(settings.get("stripe_account_id") or owner.get("stripe_account_id") or owner.get("stripe_connected_account_id") or configured_account())
    if account and not settings.get("stripe_account_id"):
        try:
            await db.payment_settings.update_one(
                {"business_id": business},
                {"$set": {"business_id": business, "provider": "stripe", "stripe_account_id": account, "setup_source": "render_config", "updated_at": datetime.now(timezone.utc)}, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
                upsert=True,
            )
        except Exception:
            pass
    return settings, owner, account


def plan_for(user, owner):
    return low(user.get("plan") or user.get("business_plan") or user.get("subscription_plan") or owner.get("plan") or owner.get("business_plan") or owner.get("subscription_plan") or "solo")


def get_stripe():
    key = configured_key()
    if not key:
        return None
    try:
        import stripe
        stripe.api_key = key
        return stripe
    except Exception:
        return None


def amount_cents(payload):
    payload = payload or {}
    for key in ["amount_cents", "payment_cents"]:
        try:
            val = int(payload.get(key) or 0)
            if val > 0:
                return val
        except Exception:
            pass
    for key in ["amount", "payment_due", "amount_due", "invoice_total", "total", "price", "job_price"]:
        raw = t(payload.get(key)).replace(",", "")
        try:
            val = int(round(float("".join(ch for ch in raw if ch.isdigit() or ch == ".")) * 100))
            if val > 0:
                return val
        except Exception:
            pass
    return 0


def install(module):
    name = getattr(module, "__name__", "")
    if name in DONE:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Depends = getattr(module, "Depends", None)
    Request = getattr(module, "Request", None)
    HTTPException = getattr(module, "HTTPException", None)
    RedirectResponse = getattr(module, "RedirectResponse", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not all([app, db is not None, get_current_user, Depends, Request, HTTPException, RedirectResponse, ObjectId]):
        return

    async def status(current_user=Depends(get_current_user)):
        owner = await owner_doc(db, current_user, ObjectId)
        settings, owner, account = await account_doc(db, current_user, ObjectId)
        plan = plan_for(current_user, owner)
        return js({
            "success": True,
            "business_id": bid(current_user),
            "role": role(current_user),
            "owner_role": role(current_user) in ROLES or bool(current_user.get("is_admin") or current_user.get("is_platform_owner")),
            "plan": plan,
            "enabled_for_plan": plan in PLANS,
            "stripe_configured": bool(configured_key()),
            "stripe_key_mode": "live" if configured_key().startswith("sk_live_") else "test" if configured_key().startswith("sk_test_") else "unknown",
            "connected": bool(account),
            "stripe_account_id": account,
            "frontend_url": frontend(),
            "payment_settings": settings,
            "next_step": "Stripe connected" if account else "Connect Stripe",
        })

    async def setup_link(current_user=Depends(get_current_user)):
        if role(current_user) not in ROLES and not bool(current_user.get("is_admin") or current_user.get("is_platform_owner")):
            raise HTTPException(status_code=403, detail="Owner access required")
        owner = await owner_doc(db, current_user, ObjectId)
        settings, owner, account = await account_doc(db, current_user, ObjectId)
        if not account:
            raise HTTPException(status_code=400, detail="No connected payment account is configured yet")
        stripe = get_stripe()
        if stripe is None:
            raise HTTPException(status_code=503, detail="Payment provider is not configured")
        try:
            link = stripe.AccountLink.create(account=account, refresh_url=f"{frontend()}/dashboard#xero", return_url=f"{frontend()}/dashboard#xero", type="account_onboarding")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Payment onboarding error: {str(exc)}")
        return {"success": True, "url": link.get("url"), "stripe_account_id": account}

    async def setup_start(request: Request):
        user = await get_current_user(request)
        result = await setup_link(user)
        return RedirectResponse(result["url"], status_code=303)

    async def payment_intent(payload: dict, current_user=Depends(get_current_user)):
        owner = await owner_doc(db, current_user, ObjectId)
        settings, owner, account = await account_doc(db, current_user, ObjectId)
        if not account:
            raise HTTPException(status_code=409, detail="Owner must connect payments first")
        stripe = get_stripe()
        if stripe is None:
            raise HTTPException(status_code=503, detail="Payment provider is not configured")
        amount = amount_cents(payload)
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Payment amount is required")
        currency = low((payload or {}).get("currency") or (settings or {}).get("currency") or "nzd")[:3] or "nzd"
        intent = stripe.PaymentIntent.create(amount=amount, currency=currency, payment_method_types=["card_present"], capture_method="automatic", metadata={"business_id": bid(current_user), "job_id": t((payload or {}).get("job_id")), "worker_id": uid(current_user), "source": "churvox_on_site"}, stripe_account=account)
        return js({"success": True, "payment_intent_id": intent.get("id"), "client_secret": intent.get("client_secret"), "amount_cents": amount, "currency": currency, "stripe_account_id": account})

    routes = [
        ("/api/payments/on-site/status", status, "GET"),
        ("/api/payments/on-site/debug", status, "GET"),
        ("/api/payments/on-site/setup-link", setup_link, "POST"),
        ("/api/payments/on-site/setup-start", setup_start, "GET"),
        ("/api/payments/on-site/payment-intent", payment_intent, "POST"),
    ]
    for path, endpoint, method in routes:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])
    DONE.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original
    def create_module(self, spec):
        if hasattr(self.original, "create_module"):
            return self.original.create_module(spec)
        return None
    def exec_module(self, module):
        self.original.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(f, Finder) for f in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
