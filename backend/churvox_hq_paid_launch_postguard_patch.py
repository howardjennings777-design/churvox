from __future__ import annotations

from copy import deepcopy
import os

INSTALLED = set()
ROUTE = "/api/admin/owner/paid-launch-report"


def _text(value):
    return str(value or "").strip()


def _low(value):
    return _text(value).lower()


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
        from churvox_hq_paid_launch_report_patch import PLAN_MONTHLY_NZD
    except Exception:
        from backend.churvox_hq_paid_launch_report_patch import PLAN_MONTHLY_NZD

    async def filtered_business_count():
        try:
            rows = await db.businesses.find({}).limit(5000).to_list(length=5000)
        except Exception:
            return None
        return len([row for row in rows if not is_internal_record(row)])

    async def guarded(request):
        source = await original(request)
        report = deepcopy(source or {})
        billing = report.setdefault("billing", {})
        counts = report.setdefault("counts", {})
        truth = report.setdefault("truth", {})
        stripe = billing.get("stripe") or {}
        stripe_subscriptions = list(stripe.get("active_subscriptions") or [])

        active_by_id = {
            _text(item.get("subscription_id")): _low(item.get("status"))
            for item in stripe_subscriptions
            if _text(item.get("subscription_id"))
        }
        candidate_paid = list(billing.get("verified_paid_users") or [])
        candidate_trials = list(billing.get("verified_trial_users") or [])
        existing_unverified = list(billing.get("needs_verification") or [])

        confirmed_paid = [
            row for row in candidate_paid
            if active_by_id.get(_text(row.get("stripe_subscription_id"))) == "active"
        ]
        confirmed_trials = [
            row for row in candidate_trials
            if active_by_id.get(_text(row.get("stripe_subscription_id"))) == "trialing"
        ]
        rejected_candidates = [
            row for row in candidate_paid + candidate_trials
            if row not in confirmed_paid and row not in confirmed_trials
        ]
        needs_verification = _dedupe(existing_unverified + rejected_candidates)

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

        billing["verified_paid_users"] = confirmed_paid
        billing["verified_trial_users"] = confirmed_trials
        billing["needs_verification"] = needs_verification
        billing["subscription_candidates_checked"] = len(candidate_paid) + len(candidate_trials)
        billing["stripe_confirmed_subscriptions"] = len(confirmed_paid) + len(confirmed_trials)
        billing["actual_mrr_nzd"] = paid_mrr_by_currency.get("nzd") if stripe.get("available") is True else None
        billing["estimated_mrr_nzd"] = round(sum(
            PLAN_MONTHLY_NZD.get(_low(row.get("plan")), 0)
            for row in confirmed_paid
        ), 2)

        counts["verified_paid_users"] = len(confirmed_paid)
        counts["verified_trial_users"] = len(confirmed_trials)
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
            "subscription_id_alone_is_not_paid": True,
            "postguard": "paid_launch_stripe_confirmation_v1",
        })
        report["source"] = "live_database_and_stripe_v2"

        launch_checks = list(report.get("launch_checks") or [])
        check_by_key = {item.get("key"): item for item in launch_checks if isinstance(item, dict)}
        stripe_available = stripe.get("available") is True
        stripe_errors = list(stripe.get("errors") or [])
        webhook_secret = _text(
            os.environ.get("STRIPE_WEBHOOK_SECRET")
            or os.environ.get("STRIPE_WEBHOOK_SIGNING_SECRET")
        )
        check_by_key["stripe"] = {
            "key": "stripe",
            "label": "Stripe",
            "status": "pass" if stripe_available and not stripe_errors else "fail",
            "detail": (
                f"{stripe.get('subscriptions_checked', 0)} subscriptions checked against live Stripe status"
                if stripe_available and not stripe_errors
                else "; ".join(stripe_errors or ["Stripe subscription status could not be confirmed"])
            ),
        }
        check_by_key["billing_truth"] = {
            "key": "billing_truth",
            "label": "Billing truth",
            "status": "fail" if needs_verification else "pass",
            "detail": (
                f"{len(needs_verification)} billing record(s) are not confirmed active/trialing by Stripe"
                if needs_verification
                else "Every paid/trial metric is confirmed by live Stripe subscription status"
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
        ordered_keys = ["database", "owner_lock", "stripe", "billing_truth", "webhooks", "email"]
        report["launch_checks"] = [check_by_key[key] for key in ordered_keys if key in check_by_key]
        report["ready_to_take_payments"] = all(item.get("status") != "fail" for item in report["launch_checks"])
        return report

    app.router.routes = [route for route in app.router.routes if not _route_matches(route)]
    app.add_api_route(ROUTE, guarded, methods=["GET"])
    INSTALLED.add(name)
