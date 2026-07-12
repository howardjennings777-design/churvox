from __future__ import annotations

import importlib.abc
import importlib.machinery
import os
import sys
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, Request

VERSION = "churvox-account-deletion-paid-launch-20260712"
TARGETS = {"server", "backend.server", "churvox_legacy_server"}
ROUTES = {
    ("/api/account/self-delete", "DELETE"),
    ("/api/account/self-delete", "POST"),
    ("/api/account/delete", "DELETE"),
    ("/api/account/delete", "POST"),
}
BUSINESS_COLLECTIONS = (
    "clients",
    "jobs",
    "quotes",
    "invoices",
    "workers",
    "team_members",
    "messages",
    "worker_messages",
    "worker_field_slips",
    "worker_proof_files",
    "job_proof_packs",
    "public_proof_packs",
    "client_portals",
    "public_client_portals",
    "customer_requests",
    "command_slips",
    "command_events",
    "timesheets",
    "payroll_runs",
    "business_profiles",
    "business_settings",
    "accounting_exports",
    "xero_connections",
    "xero_settings",
)
INSTALLED = set()


def _text(value: Any) -> str:
    return str(value or "").strip()


def _remove_routes(app) -> None:
    kept = []
    for route in list(getattr(app.router, "routes", []) or []):
        path = getattr(route, "path", "")
        methods = set(getattr(route, "methods", set()) or set())
        if any(path == target and method in methods for target, method in ROUTES):
            continue
        kept.append(route)
    app.router.routes = kept


def _ids(module, user: dict[str, Any]):
    user_id = user.get("_id") or user.get("id")
    business_id = user.get("business_id") or user_id
    values = []
    for value in (business_id, user_id):
        if value is None:
            continue
        if value not in values:
            values.append(value)
        try:
            oid = module.ObjectId(str(value))
            if oid not in values:
                values.append(oid)
        except Exception:
            pass
    return user_id, business_id, values


def _business_filter(values):
    return {"$or": [
        {"business_id": {"$in": values}},
        {"contractor_id": {"$in": values}},
        {"owner_business_id": {"$in": values}},
    ]}


async def _cancel_stripe(module, user: dict[str, Any]) -> dict[str, Any]:
    subscription_id = _text(user.get("stripe_subscription_id"))
    customer_id = _text(user.get("stripe_customer_id"))
    if not subscription_id:
        return {"required": False, "cancelled": False, "customer_id": customer_id}

    secret = _text(os.environ.get("STRIPE_SECRET_KEY"))
    stripe_module = getattr(module, "stripe", None)
    if not secret.startswith("sk_") or stripe_module is None:
        raise HTTPException(status_code=503, detail="Stripe billing is unavailable, so the subscription could not be safely cancelled. Contact support before deleting the account.")

    stripe_module.api_key = secret
    try:
        cancelled = stripe_module.Subscription.delete(subscription_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Stripe subscription cancellation failed. The account was not deleted: {str(exc)[:400]}")

    status = _text(getattr(cancelled, "status", "") or (cancelled.get("status") if isinstance(cancelled, dict) else ""))
    return {
        "required": True,
        "cancelled": True,
        "subscription_id": subscription_id,
        "customer_id": customer_id,
        "status": status or "canceled",
    }


async def _payload(request: Request) -> dict[str, Any]:
    try:
        value = await request.json()
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def install(module) -> None:
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if app is None or db is None or not callable(get_current_user):
        return

    _remove_routes(app)

    async def delete_account(request: Request):
        user = await get_current_user(request)
        if not isinstance(user, dict):
            raise HTTPException(status_code=401, detail="Not authenticated")
        email = _text(user.get("email")).lower()
        if email == "hello@churvox.com":
            raise HTTPException(status_code=403, detail="The platform owner account cannot be deleted from the customer deletion flow")

        body = await _payload(request)
        confirmation = _text(body.get("confirmation") or body.get("confirm") or body.get("confirm_email") or body.get("email")).lower()
        if confirmation not in {email, "delete my account", "delete"}:
            raise HTTPException(status_code=400, detail="Confirm deletion using the account email or the words DELETE MY ACCOUNT")

        user_id, business_id, values = _ids(module, user)
        if not values:
            raise HTTPException(status_code=400, detail="The authenticated account id is missing")

        stripe_result = await _cancel_stripe(module, user)
        now = datetime.now(timezone.utc)
        deletion_id = f"deleted-{int(now.timestamp())}-{str(user_id or business_id)[-8:]}"

        counts = {}
        business_filter = _business_filter(values)
        for collection_name in BUSINESS_COLLECTIONS:
            try:
                result = await db[collection_name].delete_many(business_filter)
                counts[collection_name] = int(getattr(result, "deleted_count", 0))
            except Exception:
                counts[collection_name] = -1

        try:
            await db.users.delete_many({"$or": [
                {"_id": {"$in": values}},
                {"business_id": {"$in": values}},
            ]})
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Account data deletion was incomplete: {str(exc)[:400]}")

        try:
            await db.businesses.delete_many({"$or": [
                {"_id": {"$in": values}},
                {"business_id": {"$in": values}},
            ]})
        except Exception:
            pass

        try:
            await db.account_deletion_audit.insert_one({
                "deletion_id": deletion_id,
                "email_hash": __import__("hashlib").sha256(email.encode("utf-8")).hexdigest(),
                "stripe_subscription_cancelled": bool(stripe_result.get("cancelled")),
                "stripe_subscription_status": stripe_result.get("status"),
                "collection_counts": counts,
                "deleted_at": now,
                "version": VERSION,
            })
        except Exception:
            pass

        return {
            "success": True,
            "message": "The account subscription was cancelled where required and the Churvox business data was deleted.",
            "deletion_id": deletion_id,
            "stripe_cancelled": bool(stripe_result.get("cancelled")),
            "version": VERSION,
        }

    for path, method in sorted(ROUTES):
        app.add_api_route(path, delete_account, methods=[method])
    INSTALLED.add(name)


class _Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
        install(module)


class _Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, _Loader):
            spec.loader = _Loader(spec.loader)
        return spec


if not any(isinstance(finder, _Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
