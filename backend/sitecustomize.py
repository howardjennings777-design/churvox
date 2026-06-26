"""Churvox Python startup patches."""

from __future__ import annotations

import os

# Xero rejects the OAuth request if any scope is invalid. Let Render's XERO_SCOPES
# win when it is configured, and only fall back to the minimum phase-one scope set.
os.environ.setdefault("XERO_SCOPES", "openid profile email offline_access accounting.invoices")
os.environ.setdefault("BACKEND_PUBLIC_URL", "https://churvox-backend.onrender.com")
os.environ.setdefault("FRONTEND_URL", "https://www.churvox.com")

LOCKED_PLAN_LIMITS = {
    "solo": {
        "price": 39,
        "max_workers": 1,
        "max_clients": 250,
        "jobs_per_month": 50,
        "ai_operator_actions": 25,
        "team": True,
        "sms": False,
        "myob": False,
        "xero": False,
        "accounting_sync": "add_on",
        "quotes": True,
        "invoices": True,
        "time_tracking": True,
        "scheduling": True,
    },
    "team": {
        "price": 89,
        "max_workers": 5,
        "max_clients": 1000,
        "jobs_per_month": 150,
        "ai_operator_actions": 100,
        "team": True,
        "sms": True,
        "myob": False,
        "xero": False,
        "accounting_sync": "add_on",
        "quotes": True,
        "invoices": True,
        "time_tracking": True,
        "scheduling": True,
    },
    "pro": {
        "price": 149,
        "max_workers": 15,
        "max_clients": 3000,
        "jobs_per_month": 500,
        "ai_operator_actions": 500,
        "team": True,
        "sms": True,
        "myob": False,
        "xero": False,
        "accounting_sync": "add_on",
        "quotes": True,
        "invoices": True,
        "time_tracking": True,
        "scheduling": True,
    },
    "enterprise": {
        "price": 299,
        "max_workers": 50,
        "max_clients": 10000,
        "jobs_per_month": 1500,
        "ai_operator_actions": 2000,
        "team": True,
        "sms": True,
        "myob": True,
        "xero": True,
        "accounting_sync": "included",
        "quotes": True,
        "invoices": True,
        "time_tracking": True,
        "scheduling": True,
        "extra_blocks": True,
    },
}


def patch_locked_plan_limits(module):
    try:
        plan_limits = getattr(module, "PLAN_LIMITS", None)
        if not isinstance(plan_limits, dict):
            return
        for plan_key, locked in LOCKED_PLAN_LIMITS.items():
            current = dict(plan_limits.get(plan_key) or {})
            current.update(locked)
            plan_limits[plan_key] = current
    except Exception:
        pass


try:
    import importlib.abc
    import importlib.machinery
    import sys

    TARGETS = {"server", "backend.server"}

    class ChurvoxPlanLimitLoader(importlib.abc.Loader):
        def __init__(self, original_loader):
            self.original_loader = original_loader

        def create_module(self, spec):
            if hasattr(self.original_loader, "create_module"):
                return self.original_loader.create_module(spec)
            return None

        def exec_module(self, module):
            self.original_loader.exec_module(module)
            patch_locked_plan_limits(module)

    class ChurvoxPlanLimitFinder(importlib.abc.MetaPathFinder):
        def find_spec(self, fullname, path=None, target=None):
            if fullname not in TARGETS:
                return None
            spec = importlib.machinery.PathFinder.find_spec(fullname, path)
            if spec and spec.loader and not isinstance(spec.loader, ChurvoxPlanLimitLoader):
                spec.loader = ChurvoxPlanLimitLoader(spec.loader)
            return spec

    if not any(isinstance(finder, ChurvoxPlanLimitFinder) for finder in sys.meta_path):
        sys.meta_path.insert(0, ChurvoxPlanLimitFinder())

    for module_name in list(TARGETS):
        loaded = sys.modules.get(module_name)
        if loaded:
            patch_locked_plan_limits(loaded)
except Exception:
    pass

try:
    from churvox_stripe_no_card import install_no_card_trial_defaults
    install_no_card_trial_defaults()
except Exception:
    pass

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

try:
    import stripe

    create_original = stripe.checkout.Session.create

    def create_checkout_session(*args, **kwargs):
        if kwargs.get("mode") == "subscription":
            kwargs["payment_method_collection"] = "if_required"
            subscription_data = dict(kwargs.get("subscription_data") or {})
            if not subscription_data.get("trial_period_days"):
                subscription_data["trial_period_days"] = 14
            if not subscription_data.get("trial_settings"):
                subscription_data["trial_settings"] = {"end_behavior": {"missing_payment_method": "cancel"}}
            kwargs["subscription_data"] = subscription_data
        return create_original(*args, **kwargs)

    stripe.checkout.Session.create = create_checkout_session
except Exception:
    pass
