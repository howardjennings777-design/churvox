"""Stripe Checkout defaults for Churvox trials.

Importing this module patches Stripe Checkout session creation so every
subscription checkout starts as a 14-day trial without collecting a card.
"""

from __future__ import annotations


def install_no_card_trial_defaults():
    try:
        import stripe
    except Exception:
        return False

    create_original = stripe.checkout.Session.create
    if getattr(create_original, "_churvox_no_card_trial", False):
        return True

    def create_checkout_session(*args, **kwargs):
        if kwargs.get("mode") == "subscription":
            kwargs["payment_method_collection"] = "if_required"
            subscription_data = dict(kwargs.get("subscription_data") or {})
            subscription_data["trial_period_days"] = 14
            subscription_data.setdefault(
                "trial_settings",
                {"end_behavior": {"missing_payment_method": "cancel"}},
            )
            kwargs["subscription_data"] = subscription_data
        return create_original(*args, **kwargs)

    create_checkout_session._churvox_no_card_trial = True
    stripe.checkout.Session.create = create_checkout_session
    return True


install_no_card_trial_defaults()
