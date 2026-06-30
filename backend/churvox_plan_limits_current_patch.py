"""Runtime guard to keep backend limits aligned with locked Churvox tiers.

The main backend still carries an older PLAN_LIMITS table in server.py. This small
startup hook patches that table after server import so route checks use the current
Start/Crew/Operator/Command limits without rewriting the large backend file.
"""

from __future__ import annotations

import builtins
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


_ORIGINAL_IMPORT = builtins.__import__


def _patched_import(name, globals=None, locals=None, fromlist=(), level=0):  # noqa: A002
    module = _ORIGINAL_IMPORT(name, globals, locals, fromlist, level)
    if name == "server" or name.endswith(".server"):
        target = sys.modules.get(name) or module
        apply_plan_limits(target)
    return module


if getattr(builtins, "__churvox_plan_limits_patch_installed__", False) is not True:
    builtins.__churvox_plan_limits_patch_installed__ = True
    builtins.__import__ = _patched_import

for module_name in ("server", "backend.server"):
    loaded = sys.modules.get(module_name)
    if loaded is not None:
        apply_plan_limits(loaded)
