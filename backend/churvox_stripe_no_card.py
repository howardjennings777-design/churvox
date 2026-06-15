"""Stripe Checkout policy for Churvox.

This is loaded early by sms_provider.py.  Keep it small and deliberate:
- trial subscriptions do not require a card upfront
- Stripe Checkout uses dynamic exclusive prices so $149 stays $149 + GST,
  instead of depending on old Stripe Price IDs that may be GST-inclusive
"""

from __future__ import annotations

import os


PLAN_ALIASES = {
    "start": "solo",
    "solo": "solo",
    "crew": "team",
    "team": "team",
    "operator": "pro",
    "pro": "pro",
    "command": "enterprise",
    "enterprise": "enterprise",
}

PLAN_NAMES = {
    "solo": "Start",
    "team": "Crew",
    "pro": "Operator",
    "enterprise": "Command",
}

PLAN_AMOUNTS = {
    "solo": {"NZ": 3900, "AU": 3900, "US": 2900, "UK": 2500},
    "team": {"NZ": 8900, "AU": 8900, "US": 6900, "UK": 5900},
    "pro": {"NZ": 14900, "AU": 14900, "US": 11900, "UK": 9900},
    "enterprise": {"NZ": 29900, "AU": 29900, "US": 23900, "UK": 19900},
}

COUNTRY_CURRENCY = {"NZ": "nzd", "AU": "aud", "US": "usd", "UK": "gbp"}


def _normal_plan(value):
    key = str(value or "pro").strip().lower().replace(" ", "_").replace("-", "_")
    return PLAN_ALIASES.get(key, "pro")


def _country(value):
    code = str(value or "NZ").strip().upper()
    aliases = {
        "NZL": "NZ",
        "NEW ZEALAND": "NZ",
        "AUS": "AU",
        "AUSTRALIA": "AU",
        "USA": "US",
        "UNITED STATES": "US",
        "GB": "UK",
        "GBR": "UK",
        "UNITED KINGDOM": "UK",
    }
    code = aliases.get(code, code)
    return code if code in COUNTRY_CURRENCY else "NZ"


def _dynamic_line_item(plan, country):
    plan = _normal_plan(plan)
    country = _country(country)
    return {
        "price_data": {
            "currency": COUNTRY_CURRENCY[country],
            "unit_amount": PLAN_AMOUNTS[plan][country],
            "tax_behavior": "exclusive",
            "recurring": {"interval": "month"},
            "product_data": {
                "name": f"Churvox {PLAN_NAMES[plan]}",
                "description": "Monthly plan price, plus GST/tax where applicable.",
            },
        },
        "quantity": 1,
    }


def install_no_card_trial_defaults():
    try:
        import stripe
    except Exception:
        return True

    session_api = getattr(getattr(stripe, "checkout", None), "Session", None)
    original_create = getattr(session_api, "create", None)
    if not original_create or getattr(original_create, "_churvox_checkout_policy", False):
        return True

    def create_with_churvox_policy(*args, **kwargs):
        if kwargs.get("mode") == "subscription":
            metadata = dict(kwargs.get("metadata") or {})
            plan = _normal_plan(metadata.get("plan") or metadata.get("plan_type"))
            country = _country(metadata.get("country") or metadata.get("billing_country"))

            # Always use dynamic exclusive prices for Churvox plans. This avoids
            # old dashboard Price IDs that may be GST-inclusive.
            kwargs["line_items"] = [_dynamic_line_item(plan, country)]

            kwargs["payment_method_collection"] = "if_required"
            kwargs["automatic_tax"] = {"enabled": True}
            kwargs["billing_address_collection"] = "required"

            subscription_data = dict(kwargs.get("subscription_data") or {})
            subscription_data.setdefault("trial_period_days", 14)
            subscription_data.setdefault("trial_settings", {"end_behavior": {"missing_payment_method": "cancel"}})
            subscription_data.setdefault("metadata", metadata)
            kwargs["subscription_data"] = subscription_data

        return original_create(*args, **kwargs)

    create_with_churvox_policy._churvox_checkout_policy = True
    create_with_churvox_policy._churvox_original_create = original_create
    session_api.create = create_with_churvox_policy
    return True
