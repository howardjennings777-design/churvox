from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import os

try:
    from churvox_stripe_plan_price_resolver import (
        PLAN_PRICE_EXPECTATIONS,
        price_env_signature_values,
        resolve_plan_price_env,
    )
except Exception:
    from backend.churvox_stripe_plan_price_resolver import (
        PLAN_PRICE_EXPECTATIONS,
        price_env_signature_values,
        resolve_plan_price_env,
    )


def _text(value):
    return str(value or "").strip()


def _low(value):
    return _text(value).lower()


def _obj_get(obj, key, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    try:
        return getattr(obj, key, default)
    except Exception:
        return default


def _postguard():
    try:
        import churvox_hq_paid_launch_postguard_patch as postguard
    except Exception:
        from backend import churvox_hq_paid_launch_postguard_patch as postguard
    return postguard


def _signature(secret):
    fingerprint = hashlib.sha256(secret.encode("utf-8")).hexdigest()[:16] if secret else "missing"
    return "|".join([fingerprint, *price_env_signature_values("NZ")])


def _result(now, signature, *, configured, available, valid, prices=None, missing=None, errors=None):
    postguard = _postguard()
    value = {
        "configured": configured,
        "available": available,
        "valid": valid,
        "source": "stripe_price_api_shared_resolver",
        "generated_at": now.isoformat(),
        "checked": len(prices or []),
        "expected": len(PLAN_PRICE_EXPECTATIONS),
        "prices": list(prices or []),
        "missing": list(missing or []),
        "errors": list(errors or [])[:30],
    }
    postguard.PRICE_CACHE.update({"at": now, "signature": signature, "value": value})
    return value


def validate_live_prices():
    postguard = _postguard()
    now = datetime.now(timezone.utc)
    secret = _text(os.environ.get("STRIPE_SECRET_KEY"))
    signature = _signature(secret)
    if postguard.PRICE_CACHE.get("value") is not None and postguard.PRICE_CACHE.get("signature") == signature:
        cached_at = postguard.PRICE_CACHE.get("at")
        if cached_at and (now - cached_at).total_seconds() < postguard.PRICE_CACHE_SECONDS:
            return postguard.PRICE_CACHE["value"]

    selected = {}
    missing = []
    for plan_key, expected in PLAN_PRICE_EXPECTATIONS.items():
        price_id, env_key, candidates = resolve_plan_price_env(plan_key, "NZ")
        selected[plan_key] = (price_id, env_key, candidates)
        if not price_id:
            missing.append(f"{expected['plan']} ({candidates[0]})")

    if not secret:
        return _result(
            now,
            signature,
            configured=False,
            available=False,
            valid=False,
            missing=missing,
            errors=["STRIPE_SECRET_KEY is not configured"],
        )

    try:
        import stripe
        stripe.api_key = secret
    except Exception as exc:
        return _result(
            now,
            signature,
            configured=not missing,
            available=False,
            valid=False,
            missing=missing,
            errors=[f"Stripe price validation could not start: {exc}"],
        )

    prices = []
    errors = []
    retrieval_errors = 0
    for plan_key, expected in PLAN_PRICE_EXPECTATIONS.items():
        price_id, env_key, candidates = selected[plan_key]
        if not price_id:
            continue
        try:
            price = stripe.Price.retrieve(price_id)
            recurring = _obj_get(price, "recurring", {}) or {}
            active = bool(_obj_get(price, "active", False))
            currency = _low(_obj_get(price, "currency"))
            try:
                unit_amount = int(_obj_get(price, "unit_amount", 0) or 0)
            except Exception:
                unit_amount = 0
            interval = _low(_obj_get(recurring, "interval"))
            try:
                interval_count = int(_obj_get(recurring, "interval_count", 1) or 1)
            except Exception:
                interval_count = 0
            valid = (
                active
                and currency == "nzd"
                and unit_amount == expected["amount_minor"]
                and interval == "month"
                and interval_count == 1
            )
            row = {
                "plan_key": plan_key,
                "plan": expected["plan"],
                "price_id": price_id,
                "env_key": env_key,
                "selected_env_key": env_key,
                "candidate_env_keys": candidates,
                "active": active,
                "currency": currency,
                "unit_amount": unit_amount,
                "interval": interval,
                "interval_count": interval_count,
                "expected_currency": "nzd",
                "expected_unit_amount": expected["amount_minor"],
                "expected_interval": "month",
                "valid": valid,
            }
            prices.append(row)
            if not valid:
                errors.append(
                    f"{expected['plan']} price mismatch via {env_key}: active={active}, "
                    f"currency={currency or 'missing'}, amount={unit_amount}, "
                    f"interval={interval or 'missing'}/{interval_count}"
                )
        except Exception as exc:
            retrieval_errors += 1
            errors.append(f"{expected['plan']} price from {env_key} could not be retrieved: {exc}")

    valid = (
        not missing
        and len(prices) == len(PLAN_PRICE_EXPECTATIONS)
        and all(row.get("valid") for row in prices)
        and not errors
    )
    return _result(
        now,
        signature,
        configured=not missing,
        available=len(prices) > 0 and retrieval_errors == 0,
        valid=valid,
        prices=prices,
        missing=missing,
        errors=errors,
    )


def install(_module=None):
    postguard = _postguard()
    postguard._validate_live_prices = validate_live_prices
    return postguard
