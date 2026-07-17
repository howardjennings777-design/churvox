from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import os

INSTALLED = set()
ROUTE = "/api/admin/owner/paid-launch-report"
PRICE_EXPECTATIONS = {
    "STRIPE_PRICE_SOLO": {"plan": "Start", "amount_minor": 3900},
    "STRIPE_PRICE_TEAM": {"plan": "Crew", "amount_minor": 8900},
    "STRIPE_PRICE_PRO": {"plan": "Operator", "amount_minor": 14900},
    "STRIPE_PRICE_ENTERPRISE": {"plan": "Command", "amount_minor": 29900},
}
PRICE_CACHE = {"at": None, "signature": "", "value": None}
PRICE_CACHE_SECONDS = 300
BILLING_ATTENTION_STATUSES = {
    "active", "paid", "trial", "trialing", "past_due", "unpaid",
    "incomplete", "incomplete_expired", "paused", "canceled", "cancelled",
}


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


def _truthy(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return _low(value) not in {"", "0", "false", "no", "off", "none", "null"}


def _key(row):
    row = row or {}
    return _text(
        row.get("stripe_subscription_id")
        or row.get("id")
        or row.get("email")
        or row.get("business_name")
    )


def _dedupe(rows):
    seen = set()
    output = []
    for row in rows or []:
        key = _key(row)
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        output.append(row)
    return output


def _route_matches(route):
    return getattr(route, "path", "") == ROUTE and "GET" in set(getattr(route, "methods", set()) or set())


def _with_stripe_status(row, status):
    output = dict(row or {})
    database_status = _low(output.get("subscription_status"))
    output["database_subscription_status"] = database_status
    output["stripe_subscription_status"] = status
    output["subscription_status"] = status
    return output


def _price_signature(secret):
    secret_fingerprint = hashlib.sha256(secret.encode("utf-8")).hexdigest()[:16] if secret else "missing"
    values = [secret_fingerprint]
    values.extend(_text(os.environ.get(key)) for key in PRICE_EXPECTATIONS)
    return "|".join(values)


def _price_result(now, signature, *, configured, available, valid, prices=None, missing=None, errors=None):
    value = {
        "configured": configured,
        "available": available,
        "valid": valid,
        "source": "stripe_price_api",
        "generated_at": now.isoformat(),
        "checked": len(prices or []),
        "expected": len(PRICE_EXPECTATIONS),
        "prices": list(prices or []),
        "missing": list(missing or []),
        "errors": list(errors or [])[:30],
    }
    PRICE_CACHE.update({"at": now, "signature": signature, "value": value})
    return value


def _validate_live_prices():
    now = datetime.now(timezone.utc)
    secret = _text(os.environ.get("STRIPE_SECRET_KEY"))
    signature = _price_signature(secret)
    if PRICE_CACHE.get("value") is not None and PRICE_CACHE.get("signature") == signature:
        cached_at = PRICE_CACHE.get("at")
        if cached_at and (now - cached_at).total_seconds() < PRICE_CACHE_SECONDS:
            return PRICE_CACHE["value"]

    missing = [key for key in PRICE_EXPECTATIONS if not _text(os.environ.get(key))]
    if not secret:
        return _price_result(
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
        return _price_result(
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
    for env_key, expected in PRICE_EXPECTATIONS.items():
        price_id = _text(os.environ.get(env_key))
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
                "env_key": env_key,
                "plan": expected["plan"],
                "price_id": price_id,
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
                    f"{expected['plan']} price mismatch: active={active}, currency={currency or 'missing'}, "
                    f"amount={unit_amount}, interval={interval or 'missing'}/{interval_count}"
                )
        except Exception as exc:
            errors.append(f"{expected['plan']} price could not be retrieved: {exc}")

    valid = not missing and len(prices) == len(PRICE_EXPECTATIONS) and all(row.get("valid") for row in prices) and not errors
    return _price_result(
        now,
        signature,
        configured=not missing,
        available=len(prices) > 0 and not any("could not be retrieved" in item for item in errors),
        valid=valid,
        prices=prices,
        missing=missing,
        errors=errors,
    )


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    if not app or db is None:
        return

    original = None
    for route in list(getattr(app.router, "routes", []) or []):
        if _route_matches(route):
            original = getattr(route, "endpoint", None)
    if original is None:
        return

    try:
        from churvox_hq_paid_launch_filter_patch import is_internal_record
    except Exception:
        from backend.churvox_hq_paid_launch_filter_patch import is_internal_record
    try:
        from churvox_hq_paid_launch_report_patch import (
            PLAN_MONTHLY_NZD,
            _billing_row,
            _now,
            _parse_dt,
            _status,
            _stripe_snapshot,
            _subscription_id,
        )
    except Exception:
        from backend.churvox_hq_paid_launch_report_patch import (
            PLAN_MONTHLY_NZD,
            _billing_row,
            _now,
            _parse_dt,
            _status,
            _stripe_snapshot,
            _subscription_id,
        )

    def is_tester_record(row):
        flags = any(_truthy((row or {}).get(key)) for key in (
            "free_tester_access", "is_free_tester", "is_tester", "app_owner_free_pack"
        ))
        if flags:
            until = _parse_dt((row or {}).get("free_tester_until") or (row or {}).get("free_until"))
            return not until or until >= _now()
        return "tester" in _status(row)

    async def filtered_business_count():
        try:
            rows = await db.businesses.find({}).limit(5000).to_list(length=5000)
        except Exception:
            return None
        return len([row for row in rows if not is_internal_record(row)])

    async def billing_population():
        try:
            rows = await db.users.find({}).limit(5000).to_list(length=5000)
        except Exception:
            return [], [], []
        candidates = []
        attention = []
        testers = []
        for row in rows:
            if is_internal_record(row):
                continue
            if is_tester_record(row):
                testers.append(_billing_row(row))
                continue
            subscription_id = _subscription_id(row)
            if subscription_id:
                candidates.append(_billing_row(row))
            elif _status(row) in BILLING_ATTENTION_STATUSES:
                attention.append(_billing_row(row))
        return _dedupe(candidates), _dedupe(attention), _dedupe(testers)

    async def guarded(request):
        source = await original(request)
        report = deepcopy(source or {})
        billing = report.setdefault("billing", {})
        counts = report.setdefault("counts", {})
        truth = report.setdefault("truth", {})

        subscription_candidates, database_attention, tester_rows = await billing_population()
        stripe = _stripe_snapshot([row.get("stripe_subscription_id") for row in subscription_candidates])
        price_validation = _validate_live_prices()
        billing["stripe"] = stripe
        billing["stripe_price_validation"] = price_validation

        stripe_errors = list(stripe.get("errors") or [])
        stripe_complete = (
            stripe.get("available") is True
            and stripe.get("credential_verified") is True
            and not stripe_errors
        )
        stripe_subscriptions = list(stripe.get("active_subscriptions") or []) if stripe_complete else []
        live_status_by_id = {
            _text(item.get("subscription_id")): _low(item.get("status"))
            for item in stripe_subscriptions
            if _text(item.get("subscription_id"))
        }

        confirmed_paid = []
        confirmed_trials = []
        rejected_candidates = []
        for row in subscription_candidates:
            subscription_id = _text(row.get("stripe_subscription_id"))
            live_status = live_status_by_id.get(subscription_id, "not_confirmed")
            classified = _with_stripe_status(row, live_status)
            if live_status == "active":
                confirmed_paid.append(classified)
            elif live_status == "trialing":
                confirmed_trials.append(classified)
            else:
                rejected_candidates.append(classified)

        tester_keys = {_key(row) for row in tester_rows if _key(row)}
        existing_unverified = [
            row for row in list(billing.get("needs_verification") or [])
            if not _key(row) or _key(row) not in tester_keys
        ]
        needs_verification = _dedupe(existing_unverified + database_attention + rejected_candidates)

        paid_mrr_by_currency = {}
        for item in stripe_subscriptions:
            if _low(item.get("status")) != "active":
                continue
            for currency, amount in (item.get("mrr_by_currency") or {}).items():
                key = _low(currency) or "unknown"
                try:
                    paid_mrr_by_currency[key] = paid_mrr_by_currency.get(key, 0.0) + float(amount or 0)
                except Exception:
                    continue
        paid_mrr_by_currency = {key: round(value, 2) for key, value in paid_mrr_by_currency.items()}
        stripe["paid_mrr_by_currency"] = paid_mrr_by_currency

        billing["subscription_candidates"] = subscription_candidates
        billing["verified_paid_users"] = _dedupe(confirmed_paid)
        billing["verified_trial_users"] = _dedupe(confirmed_trials)
        billing["tester_users"] = tester_rows
        billing["needs_verification"] = needs_verification
        billing["subscription_candidates_checked"] = len(subscription_candidates)
        billing["stripe_confirmed_subscriptions"] = len(confirmed_paid) + len(confirmed_trials)
        billing["actual_mrr_nzd"] = paid_mrr_by_currency.get("nzd", 0.0) if stripe_complete else None
        billing["estimated_mrr_nzd"] = round(sum(
            PLAN_MONTHLY_NZD.get(_low(row.get("plan")), 0)
            for row in confirmed_paid
        ), 2)

        counts["verified_paid_users"] = len(confirmed_paid)
        counts["verified_trial_users"] = len(confirmed_trials)
        counts["tester_users"] = len(tester_rows)
        counts["billing_needs_verification"] = len(needs_verification)

        businesses = await filtered_business_count()
        if businesses is not None:
            counts["businesses_total"] = businesses
            counts["businesses_source"] = "filtered_businesses_collection"

        actual_mrr_nzd = billing.get("actual_mrr_nzd")
        truth.update({
            "paid_definition": "stripe_subscription_status_active",
            "trial_definition": "stripe_subscription_status_trialing",
            "mrr_definition": "active_stripe_subscription_price_items_only",
            "mrr_source": "active_stripe_subscription_price_items" if actual_mrr_nzd is not None else "unavailable",
            "price_definition": "active_nzd_monthly_prices_matching_locked_plan_amounts",
            "subscription_id_alone_is_not_paid": True,
            "database_status_is_not_billing_truth": True,
            "stripe_credentials_verified": stripe.get("credential_verified") is True,
            "prices_live_verified": price_validation.get("valid") is True,
            "zero_mrr_is_zero": True,
            "testers_excluded_from_billing": True,
            "postguard": "paid_launch_stripe_confirmation_v3",
        })
        report["source"] = "live_database_and_stripe_v3"

        launch_checks = list(report.get("launch_checks") or [])
        check_by_key = {item.get("key"): item for item in launch_checks if isinstance(item, dict)}
        webhook_secret = _text(
            os.environ.get("STRIPE_WEBHOOK_SECRET")
            or os.environ.get("STRIPE_WEBHOOK_SIGNING_SECRET")
        )
        check_by_key["stripe"] = {
            "key": "stripe",
            "label": "Stripe",
            "status": "pass" if stripe_complete else "fail",
            "detail": (
                f"Stripe account {_text(stripe.get('account_id')) or 'verified'} confirmed; "
                f"{stripe.get('subscriptions_checked', 0)} subscription candidate(s) checked"
                if stripe_complete
                else "; ".join(stripe_errors or ["Stripe credentials or subscription status could not be confirmed"])
            ),
        }
        check_by_key["prices"] = {
            "key": "prices",
            "label": "Stripe plan prices",
            "status": "pass" if price_validation.get("valid") is True else "fail",
            "detail": (
                "Start $39, Crew $89, Operator $149 and Command $299 are active monthly NZD prices in Stripe"
                if price_validation.get("valid") is True
                else "; ".join(
                    list(price_validation.get("errors") or [])
                    + ([f"Missing: {', '.join(price_validation.get('missing') or [])}"] if price_validation.get("missing") else [])
                    or ["Stripe plan prices could not be verified"]
                )
            ),
        }
        check_by_key["billing_truth"] = {
            "key": "billing_truth",
            "label": "Billing truth",
            "status": "fail" if needs_verification else "pass",
            "detail": (
                f"{len(needs_verification)} billing record(s) are not confirmed active/trialing by Stripe"
                if needs_verification
                else "Every billing record is either confirmed by Stripe or correctly outside paid/trial metrics"
            ),
        }
        check_by_key["webhooks"] = {
            "key": "webhooks",
            "label": "Stripe webhooks",
            "status": "pass" if webhook_secret else "fail",
            "detail": (
                "Stripe webhook signing secret is configured"
                if webhook_secret
                else "STRIPE_WEBHOOK_SECRET is not configured"
            ),
        }
        ordered_keys = ["database", "owner_lock", "stripe", "prices", "billing_truth", "webhooks", "email"]
        report["launch_checks"] = [check_by_key[key] for key in ordered_keys if key in check_by_key]
        report["ready_to_take_payments"] = all(item.get("status") != "fail" for item in report["launch_checks"])
        return report

    app.router.routes = [route for route in app.router.routes if not _route_matches(route)]
    app.add_api_route(ROUTE, guarded, methods=["GET"])
    INSTALLED.add(name)
