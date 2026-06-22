"""Churvox Python startup patches."""

from __future__ import annotations

import os

# Xero rejects the OAuth request if any scope is invalid. Force the launch-safe
# phase-one scope set before xero_routes reads XERO_SCOPES from the environment.
# Do not request accounting.settings here; draft invoice/contact sync does not
# need it and some Xero app setups reject it.
os.environ["XERO_SCOPES"] = "openid profile email offline_access accounting.invoices accounting.contacts"
os.environ.setdefault("BACKEND_PUBLIC_URL", "https://churvox-backend.onrender.com")
os.environ.setdefault("FRONTEND_URL", "https://www.churvox.com")

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
