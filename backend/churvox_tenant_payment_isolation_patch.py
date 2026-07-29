from __future__ import annotations

import importlib
import sys

from churvox_tenant_isolation_security_patch import (
    OWNER_ROLES,
    business_id,
    is_owner,
    strict_business_query,
    text,
    user_id,
    variants,
)

VERSION = "churvox-tenant-payment-isolation-20260729-v1"


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
            strict_business_query(user, ObjectId),
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


def install(_legacy_module=None):
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

    for name in ("churvox_terminal_reader_patch", "backend.churvox_terminal_reader_patch"):
        terminal = sys.modules.get(name)
        if terminal is not None:
            terminal.payment_account = secure_payment_account

    return True


__all__ = ["VERSION", "install", "secure_find_owner", "secure_payment_account"]
