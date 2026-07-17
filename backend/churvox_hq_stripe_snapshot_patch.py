from __future__ import annotations

from datetime import datetime, timezone
import os

CACHE = {"at": None, "signature": "", "value": None}
CACHE_SECONDS = 300


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


def _safe_period_end(value):
    try:
        raw = int(value or 0)
    except Exception:
        raw = 0
    return datetime.fromtimestamp(raw, tz=timezone.utc).isoformat() if raw else None


def _monthly_amount(unit_amount, interval, interval_count, quantity):
    try:
        amount = float(unit_amount or 0) * max(1, int(quantity or 1))
        count = max(1, int(interval_count or 1))
    except Exception:
        return 0.0
    interval = _low(interval)
    if interval == "month":
        return amount / count
    if interval == "year":
        return amount / (12 * count)
    if interval == "week":
        return amount * (52 / 12) / count
    if interval == "day":
        return amount * (365 / 12) / count
    return 0.0


def _empty_value(now, signature, *, configured, source, errors):
    value = {
        "configured": configured,
        "available": False,
        "credential_verified": False,
        "account_id": "",
        "source": source,
        "generated_at": now.isoformat(),
        "subscriptions_checked": 0,
        "mrr_by_currency": {},
        "active_subscriptions": [],
        "checked_subscriptions": [],
        "errors": list(errors or [])[:30],
    }
    CACHE.update({"at": now, "signature": signature, "value": value})
    return value


def stripe_snapshot(subscription_ids):
    ids = sorted(set(_text(value) for value in subscription_ids if _text(value)))[:500]
    signature = "|".join(ids)
    now = datetime.now(timezone.utc)
    if CACHE.get("value") is not None and CACHE.get("signature") == signature:
        cached_at = CACHE.get("at")
        if cached_at and (now - cached_at).total_seconds() < CACHE_SECONDS:
            return CACHE["value"]

    secret = _text(os.environ.get("STRIPE_SECRET_KEY"))
    if not secret:
        return _empty_value(
            now,
            signature,
            configured=False,
            source="stripe_not_configured",
            errors=["STRIPE_SECRET_KEY is not configured"],
        )

    try:
        import stripe
        stripe.api_key = secret
    except Exception as exc:
        return _empty_value(
            now,
            signature,
            configured=True,
            source="stripe_import_failed",
            errors=[str(exc)],
        )

    try:
        account = stripe.Account.retrieve()
        account_id = _text(_obj_get(account, "id"))
    except Exception as exc:
        return _empty_value(
            now,
            signature,
            configured=True,
            source="stripe_credential_verification_failed",
            errors=[f"Stripe credential verification failed: {exc}"],
        )

    totals = {}
    active = []
    checked_rows = []
    errors = []
    checked = 0
    for subscription_id in ids:
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            checked += 1
            status = _low(_obj_get(subscription, "status")) or "unknown"
            items_obj = _obj_get(subscription, "items", {}) or {}
            items = _obj_get(items_obj, "data", []) or []
            subscription_totals = {}
            for item in items:
                price = _obj_get(item, "price", {}) or {}
                recurring = _obj_get(price, "recurring", {}) or {}
                currency = _low(_obj_get(price, "currency", "nzd")) or "nzd"
                monthly_minor = _monthly_amount(
                    _obj_get(price, "unit_amount", 0),
                    _obj_get(recurring, "interval", ""),
                    _obj_get(recurring, "interval_count", 1),
                    _obj_get(item, "quantity", 1),
                )
                subscription_totals[currency] = subscription_totals.get(currency, 0.0) + monthly_minor
                if status in {"active", "trialing"}:
                    totals[currency] = totals.get(currency, 0.0) + monthly_minor
            row = {
                "subscription_id": subscription_id,
                "customer_id": _text(_obj_get(subscription, "customer")),
                "status": status,
                "cancel_at_period_end": bool(_obj_get(subscription, "cancel_at_period_end", False)),
                "current_period_end": _safe_period_end(_obj_get(subscription, "current_period_end", 0)),
                "mrr_by_currency": {key: round(value / 100, 2) for key, value in subscription_totals.items()},
            }
            checked_rows.append(row)
            if status in {"active", "trialing"}:
                active.append(row)
        except Exception as exc:
            errors.append(f"{subscription_id}: {exc}")

    value = {
        "configured": True,
        "available": not errors,
        "credential_verified": True,
        "account_id": account_id,
        "source": "stripe_account_and_subscription_api",
        "generated_at": now.isoformat(),
        "subscriptions_checked": checked,
        "mrr_by_currency": {key: round(value / 100, 2) for key, value in totals.items()},
        "active_subscriptions": active,
        "checked_subscriptions": checked_rows,
        "errors": errors[:30],
    }
    CACHE.update({"at": now, "signature": signature, "value": value})
    return value


def install(_module=None):
    try:
        import churvox_hq_paid_launch_report_patch as report
    except Exception:
        from backend import churvox_hq_paid_launch_report_patch as report
    report._stripe_snapshot = stripe_snapshot
    return report
