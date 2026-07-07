from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import os
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
OWNER_ROLES = {"owner", "admin", "manager", "employer", "business_owner", "superadmin", "office_admin"}
PAYMENT_PLANS = {"operator", "pro", "professional", "command", "enterprise"}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def env(*names):
    for name in names:
        value = clean(os.environ.get(name))
        if value:
            return value
    return ""


def stripe_key():
    return env("STRIPE_CONNECT_SECRET_KEY", "STRIPE_SECRET_KEY", "CHURVOX_STRIPE_SECRET_KEY")


def configured_account_id():
    return env("STRIPE_ONSITE_ACCOUNT_ID", "STRIPE_CONNECTED_ACCOUNT_ID", "CHURVOX_STRIPE_ACCOUNT_ID")


def frontend_url():
    return env("FRONTEND_URL", "CHURVOX_FRONTEND_URL") or "https://www.churvox.com"


def backend_url():
    return env("BACKEND_PUBLIC_URL", "CHURVOX_BACKEND_URL", "RENDER_EXTERNAL_URL") or "https://grassley-backend.onrender.com"


def json_safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {("id" if key == "_id" else key): json_safe(item) for key, item in value.items() if key not in {"password_hash", "hashed_password"}}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def user_id(user):
    return clean(user.get("id") or user.get("_id") or user.get("user_id") or user.get("email"))


def business_id(user):
    return clean(user.get("business_id") or user.get("businessId") or user.get("owner_business_id") or user.get("contractor_id") or user_id(user))


def role(user):
    return lower(user.get("role") or user.get("user_role") or user.get("account_role"))


def owner_allowed(user):
    return bool(
        user.get("is_platform_owner")
        or user.get("is_admin")
        or role(user) in OWNER_ROLES
        or business_id(user)
    )


def normalize_plan(value):
    plan = lower(value)
    if "command" in plan or "enterprise" in plan:
        return "command"
    if "operator" in plan or plan in {"pro", "professional"}:
        return "operator"
    if "crew" in plan or "team" in plan:
        return "crew"
    if "start" in plan or "solo" in plan or "trial" in plan or "basic" in plan:
        return "start"
    return plan or "none"


def plan_allowed(plan, user=None):
    if user and (user.get("is_platform_owner") or user.get("is_admin")):
        return True
    return normalize_plan(plan) in PAYMENT_PLANS or normalize_plan(plan) in {"operator", "command"}


def stripe_client():
    key = stripe_key()
    if not key:
        return None
    try:
        import stripe
        stripe.api_key = key
        return stripe
    except Exception:
        return None


async def find_owner(db, user, ObjectId):
    bid = business_id(user)
    queries = []
    if bid:
        queries.extend([{"business_id": bid}, {"businessId": bid}, {"id": bid}])
        try:
            queries.append({"_id": ObjectId(bid)})
        except Exception:
            pass
    email = lower(user.get("email"))
    if email:
        queries.append({"email": email})
    for query in queries:
        try:
            row = await db.users.find_one(query)
            if row:
                return row
        except Exception:
            pass
    return user


async def plan_for(db, user, ObjectId):
    direct = normalize_plan(user.get("plan") or user.get("plan_key") or user.get("business_plan") or user.get("subscription_plan") or user.get("tier") or user.get("selected_plan"))
    if direct not in {"", "none"}:
        return direct
    owner = await find_owner(db, user, ObjectId)
    return normalize_plan((owner or {}).get("plan") or (owner or {}).get("plan_key") or (owner or {}).get("business_plan") or (owner or {}).get("subscription_plan") or "start")


async def payment_settings(db, user, ObjectId):
    bid = business_id(user)
    try:
        settings = await db.payment_settings.find_one({"business_id": bid}) or {}
    except Exception:
        settings = {}
    owner = await find_owner(db, user, ObjectId)
    account_id = clean(
        settings.get("stripe_account_id")
        or settings.get("stripe_connected_account_id")
        or (owner or {}).get("stripe_account_id")
        or (owner or {}).get("stripe_connected_account_id")
        or configured_account_id()
    )
    if account_id and not settings.get("stripe_account_id"):
        await save_payment_settings(db, user, account_id, "existing_config")
        try:
            settings = await db.payment_settings.find_one({"business_id": bid}) or settings
        except Exception:
            pass
    return settings, owner or {}, account_id


async def save_payment_settings(db, user, account_id, source, extra=None):
    bid = business_id(user)
    if not account_id:
        return
    payload = {
        "business_id": bid,
        "provider": "stripe",
        "stripe_account_id": account_id,
        "stripe_connected_account_id": account_id,
        "setup_source": source,
        "worker_can_change_bank": False,
        "charges_go_to": "business_account",
        "updated_at": now_utc(),
    }
    if extra:
        payload.update(extra)
    try:
        await db.payment_settings.update_one(
            {"business_id": bid},
            {"$set": payload, "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )
    except Exception:
        pass


def account_state(stripe, account_id):
    state = {
        "stripe_account_id": account_id,
        "connected": bool(account_id),
        "details_submitted": False,
        "charges_enabled": False,
        "payouts_enabled": False,
        "requirements_due": [],
        "disabled_reason": "",
        "account_checked": False,
    }
    if not stripe or not account_id:
        return state
    try:
        account = stripe.Account.retrieve(account_id)
        req = account.get("requirements") or {}
        state.update({
            "connected": True,
            "details_submitted": bool(account.get("details_submitted")),
            "charges_enabled": bool(account.get("charges_enabled")),
            "payouts_enabled": bool(account.get("payouts_enabled")),
            "requirements_due": req.get("currently_due") or [],
            "disabled_reason": clean(req.get("disabled_reason")),
            "account_checked": True,
            "country": clean(account.get("country")),
            "default_currency": clean(account.get("default_currency")),
        })
    except Exception as exc:
        state.update({"account_error": str(exc)})
    return state


def cents(value):
    raw = clean(value).replace(",", "")
    try:
        return int(round(float("".join(ch for ch in raw if ch.isdigit() or ch == ".")) * 100))
    except Exception:
        return 0


def payload_amount(payload):
    for key in ["amount_cents", "payment_cents"]:
        try:
            amount = int(payload.get(key) or 0)
            if amount > 0:
                return amount
        except Exception:
            pass
    for key in ["amount", "payment_due", "amount_due", "invoice_total", "total", "price"]:
        amount = cents(payload.get(key))
        if amount > 0:
            return amount
    return 0


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def add_route(app, path, endpoint, method):
    remove_route(app, path, method)
    app.add_api_route(path, endpoint, methods=[method])
    try:
        matches = [route for route in app.router.routes if route_matches(route, path, method)]
        others = [route for route in app.router.routes if not route_matches(route, path, method)]
        app.router.routes = matches[-1:] + others
    except Exception:
        pass


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_current_user or ObjectId is None or Request is None or HTTPException is None:
        return

    async def status(request: Request):
        user = await get_current_user(request)
        plan = await plan_for(db, user, ObjectId)
        allowed = plan_allowed(plan, user)
        settings, owner, account_id = await payment_settings(db, user, ObjectId)
        stripe = stripe_client()
        key = stripe_key()
        state = account_state(stripe, account_id)
        setup_complete = bool(state.get("details_submitted") and state.get("charges_enabled"))
        return json_safe({
            "success": True,
            "feature": "on_site_card_payments",
            "required_plan": "operator",
            "plan": plan,
            "enabled_for_plan": allowed,
            "owner_allowed": owner_allowed(user),
            "stripe_configured": bool(key),
            "stripe_key_mode": "live" if key.startswith("sk_live_") else "test" if key.startswith("sk_test_") else "unknown" if key else "missing",
            "connected": bool(account_id),
            "setup_complete": setup_complete,
            "terminal_ready": bool(key and account_id and allowed and setup_complete),
            "charges_go_to": "business_account",
            "worker_can_change_bank": False,
            "frontend_url": frontend_url(),
            "backend_url": backend_url(),
            "next_step": "ready" if setup_complete else "finish_stripe_onboarding" if account_id else "connect_stripe",
            "payment_settings": settings,
            **state,
        })

    async def setup_link(request: Request):
        user = await get_current_user(request)
        if not owner_allowed(user):
            raise HTTPException(status_code=403, detail="Owner access required")
        plan = await plan_for(db, user, ObjectId)
        if not plan_allowed(plan, user):
            raise HTTPException(status_code=403, detail="On-site payments require Operator or Command")
        stripe = stripe_client()
        if stripe is None:
            raise HTTPException(status_code=503, detail="Stripe is not configured. Add STRIPE_SECRET_KEY in Render first.")
        settings, owner, account_id = await payment_settings(db, user, ObjectId)
        email = clean((owner or {}).get("email") or user.get("email"))
        business_name = clean((owner or {}).get("business_name") or (owner or {}).get("company_name") or user.get("business_name") or "Churvox business")
        if not account_id:
            try:
                account = stripe.Account.create(
                    type="express",
                    country=clean((owner or {}).get("country_code") or user.get("country_code") or "NZ")[:2].upper() or "NZ",
                    email=email or None,
                    business_profile={"name": business_name, "product_description": "Job management and service business payments"},
                    capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}},
                    metadata={"business_id": business_id(user), "source": "churvox_payment_setup"},
                )
            except Exception as exc:
                raise HTTPException(status_code=502, detail=f"Stripe account could not be created: {exc}")
            account_id = clean(account.get("id"))
            await save_payment_settings(db, user, account_id, "created_by_churvox_payment_setup")
        base = frontend_url().rstrip("/")
        refresh_url = f"{base}/payments/setup?refresh=1"
        return_url = f"{base}/dashboard#xero"
        try:
            link = stripe.AccountLink.create(account=account_id, refresh_url=refresh_url, return_url=return_url, type="account_onboarding")
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Stripe onboarding link could not be created: {exc}")
        await save_payment_settings(db, user, account_id, "onboarding_link_created", {"last_onboarding_link_at": now_utc(), "last_onboarding_return_url": return_url})
        return json_safe({"success": True, "url": link.get("url"), "stripe_account_id": account_id, "return_url": return_url})

    async def refresh_setup(request: Request):
        user = await get_current_user(request)
        settings, owner, account_id = await payment_settings(db, user, ObjectId)
        stripe = stripe_client()
        state = account_state(stripe, account_id)
        await save_payment_settings(db, user, account_id, "refreshed_status", {
            "details_submitted": state.get("details_submitted"),
            "charges_enabled": state.get("charges_enabled"),
            "payouts_enabled": state.get("payouts_enabled"),
            "requirements_due": state.get("requirements_due"),
            "disabled_reason": state.get("disabled_reason"),
        })
        return json_safe({"success": True, **state})

    async def payment_intent(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        plan = await plan_for(db, user, ObjectId)
        if not plan_allowed(plan, user):
            raise HTTPException(status_code=403, detail="On-site payments require Operator or Command")
        stripe = stripe_client()
        if stripe is None:
            raise HTTPException(status_code=503, detail="Stripe is not configured")
        settings, owner, account_id = await payment_settings(db, user, ObjectId)
        state = account_state(stripe, account_id)
        if not account_id:
            raise HTTPException(status_code=409, detail="Owner must connect Stripe first")
        if not state.get("details_submitted") or not state.get("charges_enabled"):
            raise HTTPException(status_code=409, detail="Stripe onboarding must be completed before collecting card payments")
        amount = payload_amount(payload)
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Payment amount is required")
        currency = lower(payload.get("currency") or settings.get("currency") or state.get("default_currency") or "nzd")[:3] or "nzd"
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                payment_method_types=["card_present"],
                capture_method="automatic",
                metadata={"business_id": business_id(user), "job_id": clean(payload.get("job_id")), "worker_id": user_id(user), "source": "churvox_on_site"},
                stripe_account=account_id,
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Stripe payment intent could not be created: {exc}")
        try:
            await db.on_site_payment_events.insert_one({"business_id": business_id(user), "job_id": clean(payload.get("job_id")), "payment_intent_id": intent.get("id"), "amount_cents": amount, "currency": currency, "stripe_account_id": account_id, "status": intent.get("status"), "created_at": now_utc(), "updated_at": now_utc()})
        except Exception:
            pass
        return json_safe({"success": True, "payment_intent_id": intent.get("id"), "client_secret": intent.get("client_secret"), "amount_cents": amount, "currency": currency, "stripe_account_id": account_id})

    routes = [
        ("GET", "/api/payments/on-site/status", status),
        ("GET", "/api/payments/on-site/debug", status),
        ("GET", "/api/payments/setup/status", status),
        ("POST", "/api/payments/on-site/setup-link", setup_link),
        ("POST", "/api/payments/setup/link", setup_link),
        ("POST", "/api/payments/on-site/refresh", refresh_setup),
        ("POST", "/api/payments/on-site/payment-intent", payment_intent),
    ]
    for method, path, endpoint in routes:
        add_route(app, path, endpoint, method)
    INSTALLED.add(name)


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


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
