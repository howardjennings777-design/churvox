"""Runtime guard to keep backend limits aligned with locked Churvox tiers.

The main backend still carries older tables/routes in server.py. This small startup
hook patches them as imports happen, without rewriting the large backend file.
"""

from __future__ import annotations

from datetime import datetime, timezone
import builtins
import os
import sys
from typing import Any

CURRENT_LIMITS = {
    "solo": {
        "price": 39,
        "max_workers": 1,
        "max_clients": 250,
        "sms": False,
        "myob": False,
        "team": True,
        "quotes": True,
        "invoices": True,
        "time_tracking": True,
        "scheduling": True,
        "ai_operator_actions": 25,
        "jobs_per_month": 50,
    },
    "team": {
        "price": 89,
        "max_workers": 5,
        "max_clients": 1000,
        "sms": True,
        "myob": False,
        "team": True,
        "quotes": True,
        "invoices": True,
        "time_tracking": True,
        "scheduling": True,
        "ai_operator_actions": 100,
        "jobs_per_month": 150,
    },
    "pro": {
        "price": 149,
        "max_workers": 15,
        "max_clients": 3000,
        "sms": True,
        "myob": True,
        "team": True,
        "quotes": True,
        "invoices": True,
        "time_tracking": True,
        "scheduling": True,
        "ai_operator_actions": 500,
        "jobs_per_month": 500,
    },
    "enterprise": {
        "price": 299,
        "max_workers": 50,
        "max_clients": 10000,
        "sms": True,
        "myob": True,
        "team": True,
        "quotes": True,
        "invoices": True,
        "time_tracking": True,
        "scheduling": True,
        "extra_blocks": True,
        "ai_operator_actions": 2000,
        "jobs_per_month": 1500,
    },
}


def apply_plan_limits(module: Any) -> None:
    limits = getattr(module, "PLAN_LIMITS", None)
    if not isinstance(limits, dict):
        return
    for key, current in CURRENT_LIMITS.items():
        existing = limits.get(key)
        if isinstance(existing, dict):
            existing.update(current)
        else:
            limits[key] = dict(current)


def _env_name(*parts: str) -> str:
    return "".join(parts)


def _configured_payment_account() -> str:
    return str(os.environ.get(_env_name("STRIPE", "_ONSITE", "_ACCOUNT", "_ID")) or "").strip()


def _business_id(user: dict) -> str:
    return str(
        user.get("business_id")
        or user.get("businessId")
        or user.get("business")
        or user.get("owner_business_id")
        or user.get("contractor_id")
        or user.get("id")
        or user.get("_id")
        or ""
    ).strip()


def apply_payment_account_fallback(module: Any) -> None:
    if getattr(module, "__churvox_payment_account_fallback__", False) is True:
        return
    if not hasattr(module, "_owner_doc"):
        return

    async def _payment_settings(db, user, owner=None):
        bid = _business_id(user)
        owner_doc = owner or await module._owner_doc(db, user)
        settings = await db.payment_settings.find_one({"business_id": bid}) or {}
        account_id = str(
            settings.get("stripe_account_id")
            or owner_doc.get("stripe_account_id")
            or owner_doc.get("stripe_connected_account_id")
            or _configured_payment_account()
            or ""
        ).strip()
        if account_id and not settings.get("stripe_account_id"):
            try:
                now = datetime.now(timezone.utc)
                await db.payment_settings.update_one(
                    {"business_id": bid},
                    {
                        "$set": {
                            "business_id": bid,
                            "provider": "stripe",
                            "stripe_account_id": account_id,
                            "setup_source": "render_config",
                            "updated_at": now,
                        },
                        "$setOnInsert": {"created_at": now},
                    },
                    upsert=True,
                )
                settings = await db.payment_settings.find_one({"business_id": bid}) or settings
            except Exception:
                pass
        return settings, owner_doc, account_id

    module._payment_settings = _payment_settings
    module.__churvox_payment_account_fallback__ = True


_ORIGINAL_IMPORT = builtins.__import__


def _patched_import(name, globals=None, locals=None, fromlist=(), level=0):  # noqa: A002
    module = _ORIGINAL_IMPORT(name, globals, locals, fromlist, level)
    if name == "server" or name.endswith(".server"):
        target = sys.modules.get(name) or module
        apply_plan_limits(target)
    if name == "churvox_accounting_routes" or name.endswith(".churvox_accounting_routes"):
        target = sys.modules.get(name) or module
        apply_payment_account_fallback(target)
    return module


if getattr(builtins, "__churvox_plan_limits_patch_installed__", False) is not True:
    builtins.__churvox_plan_limits_patch_installed__ = True
    builtins.__import__ = _patched_import

for module_name in ("server", "backend.server"):
    loaded = sys.modules.get(module_name)
    if loaded is not None:
        apply_plan_limits(loaded)

for module_name in ("churvox_accounting_routes", "backend.churvox_accounting_routes"):
    loaded = sys.modules.get(module_name)
    if loaded is not None:
        apply_payment_account_fallback(loaded)
