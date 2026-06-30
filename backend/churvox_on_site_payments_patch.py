from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import os
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
ALLOWED_PLANS = {"operator", "pro", "command", "enterprise"}


def now_utc():
    return datetime.now(timezone.utc)


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, dict):
        return {k: safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [safe(v) for v in value]
    return value


def user_id(user):
    return text(user.get("id") or user.get("_id") or user.get("user_id"))


def business_id(user):
    return text(user.get("business_id") or user.get("owner_business_id") or user.get("contractor_id") or user_id(user))


def user_plan(user):
    return lower(user.get("plan") or user.get("business_plan") or user.get("subscription_plan"))


def role(user):
    return lower(user.get("role") or user.get("user_role"))


def is_allowed_plan(plan):
    return lower(plan) in ALLOWED_PLANS


def stripe_key():
    return text(
        os.environ.get("STRIPE_CONNECT_SECRET_KEY")
        or os.environ.get("STRIPE_SECRET_KEY")
        or os.environ.get("CHURVOX_STRIPE_SECRET_KEY")
    )


def frontend_url():
    return text(os.environ.get("FRONTEND_URL") or os.environ.get("CHURVOX_FRONTEND_URL") or "https://www.churvox.com")


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
    clauses = []
    if bid:
        clauses.extend([{"business_id": bid}, {"id": bid}])
        try:
            clauses.append({"_id": ObjectId(bid)})
        except Exception:
            pass
    email = lower(user.get("email"))
    if email and role(user) in {"owner", "admin", "manager"}:
        clauses.append({"email": email})
    if clauses:
        try:
            row = await db.users.find_one({"$or": clauses})
            if row:
                return row
        except Exception:
            pass
    return user


async def business_plan(db, user, ObjectId):
    plan = user_plan(user)
    if is_allowed_plan(plan):
        return plan
    owner = await find_owner(db, user, ObjectId)
    return lower((owner or {}).get("plan") or (owner or {}).get("business_plan") or plan or "solo")


async def payment_account(db, user, ObjectId):
    bid = business_id(user)
    settings = None
    try:
        settings = await db.payment_settings.find_one({"business_id": bid})
    except Exception:
        settings = None
    owner = await find_owner(db, user, ObjectId)
    account_id = text(
        (settings or {}).get("stripe_account_id")
        or (owner or {}).get("stripe_account_id")
        or (owner or {}).get("stripe_connected_account_id")
        or os.environ.get("STRIPE_ONSITE_ACCOUNT_ID")
    )
    return settings or {}, owner or {}, account_id


async def save_payment_account(db, user, account_id, source):
    bid = business_id(user)
    if not account_id:
        return
    await db.payment_settings.update_one(
        {"business_id": bid},
        {
            "$set": {
                "business_id": bid,
                "provider": "stripe",
                "stripe_account_id": account_id,
                "setup_source": source,
                "updated_at": now_utc(),
            },
            "$setOnInsert": {"created_at": now_utc()},
        },
        upsert=True,
    )


def cents(value):
    raw = text(value).replace(",", "")
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
        app.router.routes = [r for r in app.router.routes if not route_matches(r, path, method)]
    except Exception:
        pass


def first_existing_connected_account(stripe):
    try:
        accounts = stripe.Account.list(limit=10)
        for account in accounts.get("data") or []:
            account_id = text(account.get("id"))
            if account_id:
                return account_id
    except Exception:
        return ""
    return ""


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
        plan = await business_plan(db, user, ObjectId)
        settings, owner, account_id = await payment_account(db, user, ObjectId)
        return safe({
            "success": True,
            "feature": "on_site_card_payments",
            "required_plan": "operator",
            "enabled_for_plan": is_allowed_plan(plan),
            "plan": plan,
            "stripe_configured": bool(stripe_key()),
            "connected": bool(account_id),
            "terminal_ready": bool(stripe_key() and account_id and is_allowed_plan(plan)),
            "stripe_account_id": account_id,
            "charges_go_to": "business_account",
            "worker_can_change_bank": False,
        })

    async def setup_link(request: Request):
        user = await get_current_user(request)
        if role(user) not in {"owner", "admin", "manager", "employer", "business_owner", "superadmin"}:
            raise HTTPException(status_code=403, detail="Owner access required")
        plan = await business_plan(db, user, ObjectId)
        if not is_allowed_plan(plan):
            raise HTTPException(status_code=403, detail="On-site payments require Operator or Command")
        stripe = stripe_client()
        if stripe is None:
            raise HTTPException(status_code=503, detail="Stripe is not configured")
        settings, owner, account_id = await payment_account(db, user, ObjectId)
        if not account_id:
            account_id = first_existing_connected_account(stripe)
            if account_id:
                await save_payment_account(db, user, account_id, "reused_existing_connected_account")
        if not account_id:
            account = stripe.Account.create(type="express", email=text(owner.get("email") or user.get("email")), capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}})
            account_id = account.get("id")
            await save_payment_account(db, user, account_id, "created_by_churvox")
        base = frontend_url()
        link = stripe.AccountLink.create(account=account_id, refresh_url=f"{base}/dashboard#xero", return_url=f"{base}/dashboard#xero", type="account_onboarding")
        return safe({"success": True, "url": link.get("url"), "stripe_account_id": account_id})

    async def payment_intent(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        plan = await business_plan(db, user, ObjectId)
        if not is_allowed_plan(plan):
            raise HTTPException(status_code=403, detail="On-site payments require Operator or Command")
        stripe = stripe_client()
        if stripe is None:
            raise HTTPException(status_code=503, detail="Stripe is not configured")
        settings, owner, account_id = await payment_account(db, user, ObjectId)
        if not account_id:
            raise HTTPException(status_code=409, detail="Owner must connect Stripe first")
        amount = payload_amount(payload)
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Payment amount is required")
        currency = lower(payload.get("currency") or (settings or {}).get("currency") or "nzd")[:3] or "nzd"
        intent = stripe.PaymentIntent.create(amount=amount, currency=currency, payment_method_types=["card_present"], capture_method="automatic", metadata={"business_id": business_id(user), "job_id": text(payload.get("job_id")), "worker_id": user_id(user), "source": "churvox_on_site"}, stripe_account=account_id)
        try:
            await db.on_site_payment_events.insert_one({"business_id": business_id(user), "job_id": text(payload.get("job_id")), "payment_intent_id": intent.get("id"), "amount_cents": amount, "currency": currency, "stripe_account_id": account_id, "status": intent.get("status"), "created_at": now_utc(), "updated_at": now_utc()})
        except Exception:
            pass
        return safe({"success": True, "payment_intent_id": intent.get("id"), "client_secret": intent.get("client_secret"), "amount_cents": amount, "currency": currency, "stripe_account_id": account_id})

    for path, endpoint, method in [
        ("/api/payments/on-site/status", status, "GET"),
        ("/api/payments/on-site/setup-link", setup_link, "POST"),
        ("/api/payments/on-site/payment-intent", payment_intent, "POST"),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])
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


if not any(isinstance(f, Finder) for f in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
