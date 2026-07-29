from __future__ import annotations

import importlib
import sys

import churvox_tenant_isolation_security_patch as tenant_security
from churvox_tenant_isolation_security_patch import (
    OWNER_ROLES,
    OWNERSHIP_FIELDS,
    business_id,
    is_owner,
    text,
    user_id,
    variants,
)

VERSION = "churvox-tenant-payment-isolation-20260729-v2"


def strict_business_scope(user, ObjectId):
    values = variants(ObjectId, business_id(user))
    if not values:
        return {"_id": "__tenant_missing__"}
    # A record with an explicit business id must match that id. Owner/user ids and
    # email fields are never allowed to override a different tenant id.
    return {"$or": [{field: {"$in": values}} for field in OWNERSHIP_FIELDS]}


def owner_route(path, method):
    method = str(method or "").upper()
    for kind in tenant_security.OWNER_DATA:
        base = f"/api/{kind}"
        if path == base and method in {"GET", "POST"}:
            return True
        if path.startswith(f"{base}/") and method in {"PATCH", "PUT"}:
            remainder = path[len(base) + 1:]
            return bool(remainder and ("/" not in remainder or remainder.endswith("/field-update")))
    return False


async def secure_find_owner(db, user, ObjectId):
    bid = business_id(user)
    uid = user_id(user)

    # Owners may use their exact authenticated identity. Workers must resolve the
    # owner through the same business boundary rather than their own user record.
    if is_owner(user) and uid:
        for value in variants(ObjectId, uid):
            try:
                row = await db.users.find_one({"_id": value})
                if row and business_id(row) == bid and is_owner(row):
                    return row
            except Exception:
                continue

    query = {
        "$and": [
            strict_business_scope(user, ObjectId),
            {"role": {"$in": sorted(OWNER_ROLES)}},
        ]
    }
    try:
        row = await db.users.find_one(query)
        if row:
            return row
    except Exception:
        pass
    return user if is_owner(user) else {}


async def secure_payment_account(db, user, ObjectId):
    bid = business_id(user)
    settings = None
    if bid:
        try:
            settings = await db.payment_settings.find_one({"business_id": bid})
        except Exception:
            settings = None
    owner = await secure_find_owner(db, user, ObjectId)
    account_id = text(
        (settings or {}).get("stripe_account_id")
        or (owner or {}).get("stripe_account_id")
        or (owner or {}).get("stripe_connected_account_id")
    )
    return settings or {}, owner or {}, account_id


def harden_accounting_payment_module():
    try:
        accounting = importlib.import_module("churvox_accounting_routes")
    except Exception:
        try:
            accounting = importlib.import_module("backend.churvox_accounting_routes")
        except Exception:
            return False

    class AccountingObjectId:
        @staticmethod
        def is_valid(value):
            if not getattr(accounting.ObjectIdShim, "available", False):
                return False
            try:
                accounting.ObjectIdShim.make(value)
                return True
            except Exception:
                return False

        def __new__(cls, value):
            return accounting.ObjectIdShim.make(value)

    async def accounting_owner_doc(db, user):
        return await secure_find_owner(db, user, AccountingObjectId)

    async def accounting_payment_settings(db, user, owner=None):
        bid = business_id(user)
        try:
            settings = await db.payment_settings.find_one({"business_id": bid}) or {}
        except Exception:
            settings = {}
        owner = owner or await accounting_owner_doc(db, user)
        account_id = text(
            settings.get("stripe_account_id")
            or (owner or {}).get("stripe_account_id")
            or (owner or {}).get("stripe_connected_account_id")
        )
        return settings, owner or {}, account_id

    accounting._owner_doc = accounting_owner_doc
    accounting._payment_settings = accounting_payment_settings
    return True


def install(_legacy_module=None):
    # Strengthen the shared tenant query and keep public API routes out of the
    # owner-data interceptor before the middleware processes any request.
    original_owner_data = tenant_security.secure_owner_data

    async def filtered_owner_data(module, request, path, method):
        if not owner_route(path, method):
            return None
        return await original_owner_data(module, request, path, method)

    tenant_security.strict_business_query = strict_business_scope
    tenant_security.secure_owner_data = filtered_owner_data

    try:
        payments = importlib.import_module("churvox_on_site_payments_patch")
    except Exception:
        try:
            payments = importlib.import_module("backend.churvox_on_site_payments_patch")
        except Exception:
            return False

    payments.find_owner = secure_find_owner
    payments.payment_account = secure_payment_account
    # Never bind a business to the first Stripe account in the platform list.
    payments.first_existing_connected_account = lambda _stripe: ""
    harden_accounting_payment_module()

    for name in ("churvox_terminal_reader_patch", "backend.churvox_terminal_reader_patch"):
        terminal = sys.modules.get(name)
        if terminal is not None:
            terminal.payment_account = secure_payment_account

    return True


__all__ = [
    "VERSION", "install", "strict_business_scope", "owner_route",
    "secure_find_owner", "secure_payment_account", "harden_accounting_payment_module",
]
