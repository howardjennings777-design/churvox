from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import os
import sys
from typing import Any

from fastapi import HTTPException
from starlette.requests import Request

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()
ALLOWED_PLANS = {"operator", "pro", "command", "enterprise"}


def now_utc():
    return datetime.now(timezone.utc)


def text(value: Any) -> str:
    try:
        return str(value or "").strip()
    except Exception:
        return ""


def lower(value: Any) -> str:
    return text(value).lower()


def safe(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, dict):
        return {k: safe(v) for k, v in value.items() if not any(word in str(k).lower() for word in ["password", "token", "secret", "hash"])}
    if isinstance(value, list):
        return [safe(v) for v in value]
    return value


def read(user: Any, *names: str):
    for name in names:
        try:
            if isinstance(user, dict) and user.get(name) not in (None, ""):
                return user.get(name)
            value = getattr(user, name, None)
            if value not in (None, ""):
                return value
        except Exception:
            pass
    return ""


def user_id(user: Any) -> str:
    return text(read(user, "id", "_id", "user_id"))


def business_id(user: Any) -> str:
    return text(read(user, "business_id", "businessId", "owner_business_id", "contractor_id", default=user_id(user))) if False else text(read(user, "business_id", "businessId", "owner_business_id", "contractor_id") or user_id(user))


def user_plan(user: Any) -> str:
    return lower(read(user, "plan", "business_plan", "subscription_plan"))


def role(user: Any) -> str:
    return lower(read(user, "role", "user_role"))


def is_allowed_plan(plan: str) -> bool:
    return lower(plan) in ALLOWED_PLANS


def stripe_key() -> str:
    return text(os.environ.get("STRIPE_CONNECT_SECRET_KEY") or os.environ.get("STRIPE_SECRET_KEY") or os.environ.get("CHURVOX_STRIPE_SECRET_KEY"))


def frontend_url() -> str:
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


def cents(value: Any) -> int:
    raw = text(value).replace(",", "")
    try:
        return int(round(float("".join(ch for ch in raw if ch.isdigit() or ch == ".")) * 100))
    except Exception:
        return 0


def payload_amount(payload: dict) -> int:
    for field in ["amount_cents", "payment_cents"]:
        try:
            amount = int(payload.get(field) or 0)
            if amount > 0:
                return amount
        except Exception:
            pass
    for field in ["amount", "payment_due", "amount_due", "invoice_total", "total", "price"]:
        amount = cents(payload.get(field))
        if amount > 0:
            return amount
    return 0


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    def remove_route(path: str, method: str):
        try:
            app.router.routes = [r for r in app.router.routes if not (getattr(r, "path", "") == path and method.upper() in set(getattr(r, "methods", set()) or set()))]
        except Exception:
            pass

    async def get_user(request: Request):
        try:
            return await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated")

    async def find_owner(user: Any):
        bid = business_id(user)
        clauses = []
        if bid:
            clauses.extend([{"business_id": bid}, {"id": bid}])
            try:
                clauses.append({"_id": ObjectId(bid)})
            except Exception:
                pass
        email = lower(read(user, "email"))
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

    async def business_plan(user: Any) -> str:
        plan = user_plan(user)
        if is_allowed_plan(plan):
            return plan
        owner = await find_owner(user)
        return lower(read(owner, "plan", "business_plan") or plan or "solo")

    async def payment_account(user: Any):
        bid = business_id(user)
        settings = None
        try:
            settings = await db.payment_settings.find_one({"business_id": bid})
        except Exception:
            settings = None
        owner = await find_owner(user)
        account_id = text((settings or {}).get("stripe_account_id") or (owner or {}).get("stripe_account_id") or (owner or {}).get("stripe_connected_account_id") or os.environ.get("STRIPE_ONSITE_ACCOUNT_ID"))
        return settings or {}, owner or {}, account_id

    async def save_payment_account(user: Any, account_id: str, source: str):
        bid = business_id(user)
        if not account_id:
            return
        try:
            await db.payment_settings.update_one(
                {"business_id": bid},
                {"$set": {"business_id": bid, "provider": "stripe", "stripe_account_id": account_id, "setup_source": source, "updated_at": now_utc()}, "$setOnInsert": {"created_at": now_utc()}},
                upsert=True,
            )
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

    async def status(request: Request):
        user = await get_user(request)
        plan = await business_plan(user)
        settings, owner, account_id = await payment_account(user)
        return safe({
            "success": True,
            "source": "churvox_on_site_payments_request_signature_fix",
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
        user = await get_user(request)
        if role(user) not in {"owner", "admin", "manager", "employer", "business_owner", "superadmin"}:
            raise HTTPException(status_code=403, detail="Owner access required")
        plan = await business_plan(user)
        if not is_allowed_plan(plan):
            raise HTTPException(status_code=403, detail="On-site payments require Operator or Command")
        stripe = stripe_client()
        if stripe is None:
            raise HTTPException(status_code=503, detail="Stripe is not configured")
        settings, owner, account_id = await payment_account(user)
        if not account_id:
            account_id = first_existing_connected_account(stripe)
            if account_id:
                await save_payment_account(user, account_id, "reused_existing_connected_account")
        if not account_id:
            account = stripe.Account.create(type="express", email=text(read(owner, "email") or read(user, "email")), capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}})
            account_id = account.get("id")
            await save_payment_account(user, account_id, "created_by_churvox")
        base = frontend_url()
        link = stripe.AccountLink.create(account=account_id, refresh_url=f"{base}/dashboard#xero", return_url=f"{base}/dashboard#xero", type="account_onboarding")
        return safe({"success": True, "url": link.get("url"), "stripe_account_id": account_id})

    async def payment_intent(request: Request):
        user = await get_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        if not isinstance(payload, dict):
            payload = {}
        plan = await business_plan(user)
        if not is_allowed_plan(plan):
            raise HTTPException(status_code=403, detail="On-site payments require Operator or Command")
        stripe = stripe_client()
        if stripe is None:
            raise HTTPException(status_code=503, detail="Stripe is not configured")
        settings, owner, account_id = await payment_account(user)
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
        remove_route(path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None

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
