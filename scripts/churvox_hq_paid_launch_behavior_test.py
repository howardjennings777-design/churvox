from __future__ import annotations

import asyncio
import os
from types import SimpleNamespace

from backend import churvox_hq_paid_launch_filter_patch as filter_patch
from backend import churvox_hq_paid_launch_postguard_patch as postguard_patch
from backend import churvox_hq_paid_launch_report_patch as patch


class TestHTTPException(Exception):
    def __init__(self, status_code: int, detail: str = ""):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class FakeRequest:
    def __init__(self, user):
        self.user = user


class FakeCursor:
    def __init__(self, rows):
        self.rows = list(rows)
        self.limit_value = len(self.rows)

    def sort(self, *_args, **_kwargs):
        return self

    def limit(self, value):
        self.limit_value = int(value)
        return self

    async def to_list(self, length=None):
        limit = self.limit_value if length is None else min(self.limit_value, int(length))
        return [dict(row) for row in self.rows[:limit]]


class FakeCollection:
    def __init__(self, rows=None):
        self.rows = list(rows or [])

    def find(self, _query=None):
        return FakeCursor(self.rows)

    async def count_documents(self, _query=None):
        return len(self.rows)

    async def find_one(self, _query=None, sort=None):
        if not self.rows:
            return None
        return dict(self.rows[-1] if sort else self.rows[0])


class FakeDB:
    def __init__(self, collections):
        self.collections = {name: FakeCollection(rows) for name, rows in collections.items()}
        self.users = self.collections.setdefault("users", FakeCollection())

    def __getitem__(self, name):
        return self.collections.setdefault(name, FakeCollection())

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self[name]

    async def list_collection_names(self):
        return list(self.collections.keys())


class FakeRoute:
    def __init__(self, path, endpoint, methods):
        self.path = path
        self.endpoint = endpoint
        self.methods = set(methods)


class FakeApp:
    def __init__(self):
        self.router = SimpleNamespace(routes=[])

    def add_api_route(self, path, endpoint, methods):
        self.router.routes.append(FakeRoute(path, endpoint, methods))


async def get_current_user(request):
    return request.user


def endpoint_for(app, path):
    for route in app.router.routes:
        if route.path == path and "GET" in route.methods:
            return route.endpoint
    raise AssertionError(f"Missing route {path}")


def fake_price_validation():
    return {
        "configured": True,
        "available": True,
        "valid": True,
        "source": "stripe_price_api",
        "generated_at": "2026-07-18T00:00:00+00:00",
        "checked": 4,
        "expected": 4,
        "prices": [
            {"plan": "Start", "valid": True},
            {"plan": "Crew", "valid": True},
            {"plan": "Operator", "valid": True},
            {"plan": "Command", "valid": True},
        ],
        "missing": [],
        "errors": [],
    }


def fake_stripe_snapshot(subscription_ids):
    ids = set(subscription_ids)
    assert ids == {"sub_paid", "sub_trial"}, ids
    return {
        "configured": True,
        "available": True,
        "credential_verified": True,
        "account_id": "acct_live_truth",
        "source": "stripe_account_and_subscription_api",
        "generated_at": "2026-07-18T00:00:00+00:00",
        "subscriptions_checked": 2,
        "mrr_by_currency": {"nzd": 238.0},
        "active_subscriptions": [
            {"subscription_id": "sub_paid", "customer_id": "cus_paid", "status": "active", "mrr_by_currency": {"nzd": 89.0}},
            {"subscription_id": "sub_trial", "customer_id": "cus_trial", "status": "trialing", "mrr_by_currency": {"nzd": 149.0}},
        ],
        "checked_subscriptions": [],
        "errors": [],
    }


def fake_empty_stripe_snapshot(subscription_ids):
    assert list(subscription_ids) == [], subscription_ids
    return {
        "configured": True,
        "available": True,
        "credential_verified": True,
        "account_id": "acct_live_truth",
        "source": "stripe_account_and_subscription_api",
        "generated_at": "2026-07-18T00:00:00+00:00",
        "subscriptions_checked": 0,
        "mrr_by_currency": {},
        "active_subscriptions": [],
        "checked_subscriptions": [],
        "errors": [],
    }


def install_report(name, db, stripe_snapshot):
    patch.INSTALLED.clear()
    postguard_patch.INSTALLED.clear()
    patch.CACHE.update({"at": None, "signature": "", "value": None})
    postguard_patch.PRICE_CACHE.update({"at": None, "signature": "", "value": None})
    patch._stripe_snapshot = stripe_snapshot
    postguard_patch._validate_live_prices = fake_price_validation
    filter_patch.install()

    app = FakeApp()
    module = SimpleNamespace(
        __name__=name,
        app=app,
        db=db,
        get_current_user=get_current_user,
        Request=FakeRequest,
        HTTPException=TestHTTPException,
    )
    patch.install(module)
    postguard_patch.install(module)
    return endpoint_for(app, "/api/admin/owner/paid-launch-report")


async def main():
    os.environ["STRIPE_SECRET_KEY"] = "sk_live_test_only"
    os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test_only"
    for key in (
        "STRIPE_PRICE_SOLO",
        "STRIPE_PRICE_TEAM",
        "STRIPE_PRICE_PRO",
        "STRIPE_PRICE_ENTERPRISE",
    ):
        os.environ[key] = f"configured_{key.lower()}"

    users = [
        {"_id": "owner", "email": "hello@churvox.com", "role": "platform_owner", "business_name": "Churvox"},
        {"_id": "paid", "email": "paid@customer.nz", "business_name": "Paid Customer", "plan": "team", "subscription_status": "active", "stripe_customer_id": "cus_paid", "stripe_subscription_id": "sub_paid", "business_id": "biz-paid"},
        {"_id": "unverified", "email": "unverified@customer.nz", "business_name": "Unverified Customer", "plan": "solo", "subscription_status": "active", "stripe_customer_id": "cus_only", "business_id": "biz-unverified"},
        {"_id": "trial", "email": "trial@customer.nz", "business_name": "Trial Customer", "plan": "pro", "subscription_status": "trialing", "stripe_subscription_id": "sub_trial", "business_id": "biz-trial"},
        {"_id": "tester", "email": "tester@customer.nz", "business_name": "Tester Customer", "plan": "pro", "subscription_status": "tester_free", "free_tester_access": True, "business_id": "biz-tester"},
        {"_id": "mixed-tester", "email": "mixedtester@customer.nz", "business_name": "Mixed Tester", "plan": "enterprise", "subscription_status": "active", "stripe_subscription_id": "sub_tester_hidden", "free_tester_access": False, "is_tester": "true", "business_id": "biz-mixed-tester"},
        {"_id": "sample", "email": "sample@example.com", "business_name": "Sample Business", "plan": "enterprise", "subscription_status": "active", "stripe_subscription_id": "sub_sample"},
    ]
    db = FakeDB({
        "users": users,
        "businesses": [
            {"_id": "biz-paid", "business_name": "Paid Customer"},
            {"_id": "biz-unverified", "business_name": "Unverified Customer"},
            {"_id": "biz-trial", "business_name": "Trial Customer"},
            {"_id": "biz-tester", "business_name": "Tester Customer"},
            {"_id": "biz-mixed-tester", "business_name": "Mixed Tester"},
            {"_id": "biz-sample", "business_name": "Sample Business", "is_sample": True},
        ],
        "jobs": [{"_id": "job-1"}],
        "clients": [{"_id": "client-1"}],
        "quotes": [],
        "invoices": [{"_id": "invoice-1"}],
        "stripe_webhook_events": [{"_id": "event-1", "created_at": "2026-07-18T00:00:00+00:00"}],
        "support_messages": [],
        "lifecycle_emails": [],
    })
    endpoint = install_report("churvox_hq_paid_launch_behavior_test", db, fake_stripe_snapshot)
    report = await endpoint(FakeRequest({"email": "hello@churvox.com", "role": "platform_owner"}))

    assert filter_patch.is_internal_record({"email": "tester@customer.nz", "business_name": "Tester Customer"}) is False
    assert filter_patch.is_internal_record({"email": "test@example.com", "business_name": "Demo Business"}) is True
    assert report["success"] is True
    assert report["source"] == "live_database_and_stripe_v3"
    assert report["truth"]["sample_records_included"] is False
    assert report["truth"]["paid_definition"] == "stripe_subscription_status_active"
    assert report["truth"]["trial_definition"] == "stripe_subscription_status_trialing"
    assert report["truth"]["mrr_definition"] == "active_stripe_subscription_price_items_only"
    assert report["truth"]["price_definition"] == "active_nzd_monthly_prices_matching_locked_plan_amounts"
    assert report["truth"]["subscription_id_alone_is_not_paid"] is True
    assert report["truth"]["stripe_credentials_verified"] is True
    assert report["truth"]["prices_live_verified"] is True
    assert report["truth"]["zero_mrr_is_zero"] is True
    assert report["truth"]["testers_excluded_from_billing"] is True
    assert report["counts"]["verified_paid_users"] == 1, report["counts"]
    assert report["counts"]["verified_trial_users"] == 1, report["counts"]
    assert report["counts"]["tester_users"] == 2, report["counts"]
    assert report["counts"]["billing_needs_verification"] == 1, report["counts"]
    assert report["counts"]["internal_users_excluded"] == 2, report["counts"]
    assert report["counts"]["businesses_total"] == 5, report["counts"]
    assert report["counts"]["businesses_source"] == "filtered_businesses_collection"
    assert report["billing"]["actual_mrr_nzd"] == 89.0
    assert report["billing"]["estimated_mrr_nzd"] == 89
    assert report["billing"]["stripe"]["paid_mrr_by_currency"]["nzd"] == 89.0
    assert report["billing"]["stripe_confirmed_subscriptions"] == 2
    assert report["billing"]["stripe_price_validation"]["valid"] is True
    assert len(report["billing"]["verified_paid_users"]) == 1
    assert report["billing"]["verified_paid_users"][0]["email"] == "paid@customer.nz"
    assert {row["email"] for row in report["billing"]["tester_users"]} == {"tester@customer.nz", "mixedtester@customer.nz"}
    assert report["billing"]["needs_verification"][0]["email"] == "unverified@customer.nz"
    assert all(row["email"] != "sample@example.com" for row in report["billing"]["verified_paid_users"])
    assert report["collections"]["counts"]["businesses"] == 6
    assert report["collections"]["counts"]["jobs"] == 1
    assert report["collections"]["counts"]["clients"] == 1

    check_by_key = {item["key"]: item for item in report["launch_checks"]}
    assert check_by_key["stripe"]["status"] == "pass"
    assert check_by_key["prices"]["status"] == "pass"
    assert check_by_key["webhooks"]["status"] == "pass"
    assert check_by_key["billing_truth"]["status"] == "fail"
    assert report["ready_to_take_payments"] is False

    try:
        await endpoint(FakeRequest({"email": "customer@customer.nz", "role": "owner"}))
    except TestHTTPException as exc:
        assert exc.status_code == 403
    else:
        raise AssertionError("Non-platform owner reached paid launch HQ report")

    empty_db = FakeDB({
        "users": [{"_id": "owner", "email": "hello@churvox.com", "role": "platform_owner"}],
        "businesses": [],
        "stripe_webhook_events": [],
    })
    empty_endpoint = install_report("churvox_hq_paid_launch_zero_mrr_test", empty_db, fake_empty_stripe_snapshot)
    empty_report = await empty_endpoint(FakeRequest({"email": "hello@churvox.com", "role": "platform_owner"}))
    empty_checks = {item["key"]: item for item in empty_report["launch_checks"]}
    assert empty_report["source"] == "live_database_and_stripe_v3"
    assert empty_report["counts"]["verified_paid_users"] == 0
    assert empty_report["counts"]["verified_trial_users"] == 0
    assert empty_report["counts"]["billing_needs_verification"] == 0
    assert empty_report["billing"]["actual_mrr_nzd"] == 0.0
    assert empty_report["billing"]["stripe"]["credential_verified"] is True
    assert empty_checks["stripe"]["status"] == "pass"
    assert empty_checks["prices"]["status"] == "pass"
    assert empty_checks["billing_truth"]["status"] == "pass"
    assert empty_checks["webhooks"]["status"] == "pass"
    assert empty_report["ready_to_take_payments"] is True

    print("HQ paid launch behavior passed: live Stripe credentials, live locked prices, active-only MRR, zero-MRR truth, tester exclusion, filtered businesses and owner lock.")


if __name__ == "__main__":
    asyncio.run(main())
