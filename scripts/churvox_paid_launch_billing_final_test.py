from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace

from fastapi import FastAPI

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
for path in (str(ROOT), str(BACKEND)):
    if path not in sys.path:
        sys.path.insert(0, path)

import churvox_paid_launch_billing_final_patch as patch


class FakeRequest:
    def __init__(self, payload=None, user=None):
        self._payload = payload or {}
        self.user = user or {}

    async def json(self):
        return self._payload


class FakeCheckoutDebug:
    def __init__(self):
        self.rows = []

    async def insert_one(self, row):
        self.rows.append(row)
        return SimpleNamespace(inserted_id="debug")


class FakeDB:
    def __init__(self):
        self.checkout_debug = FakeCheckoutDebug()


class FakeSessionApi:
    calls = []
    fail = False

    @classmethod
    def create(cls, **kwargs):
        cls.calls.append(kwargs)
        if cls.fail:
            error = RuntimeError("private Stripe message must not escape")
            error.code = "safe_test_code"
            error.param = "line_items"
            raise error
        return SimpleNamespace(id=f"cs_test_{len(cls.calls)}", url=f"https://checkout.stripe.test/session/{len(cls.calls)}")


class FakeStripe:
    api_key = ""
    checkout = SimpleNamespace(Session=FakeSessionApi)


def route(app, path, method="POST"):
    matches = [item for item in app.router.routes if getattr(item, "path", "") == path and method in set(getattr(item, "methods", set()) or set())]
    assert len(matches) == 1, (path, method, [(getattr(item, "path", ""), getattr(item, "methods", set()), getattr(getattr(item, "endpoint", None), "__name__", "")) for item in app.router.routes])
    return matches[0].endpoint


async def main():
    os.environ["STRIPE_SECRET_KEY"] = "sk_test_not_real"
    for key in list(os.environ):
        if key.startswith("STRIPE_PRICE_"):
            os.environ.pop(key, None)

    app = FastAPI()
    db = FakeDB()

    async def current_user(request):
        return request.user

    module = SimpleNamespace(app=app, db=db, get_current_user=current_user, stripe=FakeStripe)
    assert patch.install(module, force=True) is True

    owner = {
        "id": "owner-1",
        "business_id": "business-1",
        "email": "owner@example.com",
        "role": "employer",
        "plan": "enterprise",
    }
    worker = {**owner, "id": "worker-1", "role": "worker"}

    plan_endpoint = route(app, "/api/billing/create-checkout-session")
    plan_response = await plan_endpoint(FakeRequest({"plan": "start", "country": "NZ"}, owner))
    assert plan_response["success"] is True
    assert plan_response["url"].startswith("https://")
    assert plan_response["plan"] == "solo"
    assert plan_response["trial_days"] == 14
    plan_call = FakeSessionApi.calls[-1]
    assert plan_call["payment_method_collection"] == "if_required"
    assert plan_call["subscription_data"]["trial_period_days"] == 14
    assert plan_call["line_items"][0]["price_data"]["unit_amount"] == 3900
    assert plan_call["line_items"][0]["price_data"]["currency"] == "nzd"

    alias_endpoint = route(app, "/api/stripe/create-checkout-session")
    alias_response = await alias_endpoint(FakeRequest({"plan": "operator", "country": "NZ"}, owner))
    assert alias_response["plan"] == "pro"
    assert FakeSessionApi.calls[-1]["line_items"][0]["price_data"]["unit_amount"] == 14900

    addon_endpoint = route(app, "/api/billing/create-addon-checkout-session")
    addon_response = await addon_endpoint(FakeRequest({"addon": "command_growth_pack", "quantity": 9, "country": "NZ"}, owner))
    assert addon_response["success"] is True
    assert addon_response["quantity"] == 5
    addon_call = FakeSessionApi.calls[-1]
    assert addon_call["line_items"][0]["quantity"] == 5
    assert addon_call["line_items"][0]["price_data"]["unit_amount"] == 9900

    try:
        await plan_endpoint(FakeRequest({"plan": "start"}, worker))
        raise AssertionError("worker checkout should be denied")
    except Exception as error:
        assert getattr(error, "status_code", None) == 403

    FakeSessionApi.fail = True
    failure = await plan_endpoint(FakeRequest({"plan": "crew", "country": "NZ"}, owner))
    assert failure.status_code == 503
    payload = json.loads(failure.body)
    assert payload["success"] is False
    assert payload["stage"] == "plan_session_create"
    assert payload["code"] == "safe_test_code"
    assert payload["error_type"] == "RuntimeError"
    assert "private Stripe message" not in failure.body.decode()
    FakeSessionApi.fail = False

    readiness_endpoint = route(app, "/api/billing/checkout-readiness", "GET")
    readiness = await readiness_endpoint()
    assert readiness["success"] is True
    assert readiness["ready"] is True
    assert readiness["dynamic_locked_price_fallback"] is True
    assert readiness["route_owners"]["/api/billing/create-checkout-session"] == ["POST:create_plan_checkout"]
    assert readiness["route_owners"]["/api/billing/create-addon-checkout-session"] == ["POST:create_addon_checkout"]

    assert len(db.checkout_debug.rows) >= 2
    print("PAID_LAUNCH_BILLING_FINAL_BEHAVIOR_PASS")


if __name__ == "__main__":
    asyncio.run(main())
