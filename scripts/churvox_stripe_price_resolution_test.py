from __future__ import annotations

import os
import sys
from types import SimpleNamespace

from backend import churvox_hq_paid_launch_postguard_patch as postguard
from backend import churvox_hq_stripe_price_resolution_patch as price_patch
from backend import churvox_stripe_plan_price_resolver as resolver


class FakePriceAPI:
    calls = []
    prices = {
        "price_start_current": {"active": True, "currency": "nzd", "unit_amount": 3900, "recurring": {"interval": "month", "interval_count": 1}},
        "price_crew_current": {"active": True, "currency": "nzd", "unit_amount": 8900, "recurring": {"interval": "month", "interval_count": 1}},
        "price_operator_current": {"active": True, "currency": "nzd", "unit_amount": 14900, "recurring": {"interval": "month", "interval_count": 1}},
        "price_command_current": {"active": True, "currency": "nzd", "unit_amount": 29900, "recurring": {"interval": "month", "interval_count": 1}},
        "price_start_old": {"active": True, "currency": "nzd", "unit_amount": 3000, "recurring": {"interval": "month", "interval_count": 1}},
        "price_crew_old": {"active": True, "currency": "nzd", "unit_amount": 7000, "recurring": {"interval": "month", "interval_count": 1}},
        "price_operator_old": {"active": True, "currency": "nzd", "unit_amount": 11000, "recurring": {"interval": "month", "interval_count": 1}},
        "price_command_old": {"active": True, "currency": "nzd", "unit_amount": 24000, "recurring": {"interval": "month", "interval_count": 1}},
    }

    @classmethod
    def retrieve(cls, price_id):
        cls.calls.append(price_id)
        if price_id not in cls.prices:
            raise RuntimeError(f"Unexpected Stripe price lookup: {price_id}")
        return dict(cls.prices[price_id])


def _all_env_names():
    names = {"STRIPE_SECRET_KEY"}
    for plan in resolver.PLAN_PRICE_EXPECTATIONS:
        names.update(resolver.plan_price_env_candidates(plan, "NZ"))
    return names


def _clear_price_cache():
    postguard.PRICE_CACHE.update({"at": None, "signature": "", "value": None})
    FakePriceAPI.calls = []


def run():
    env_names = _all_env_names()
    saved_env = {name: os.environ.get(name) for name in env_names}
    original_stripe = sys.modules.get("stripe")
    fake_stripe = SimpleNamespace(api_key="", Price=FakePriceAPI)

    try:
        for name in env_names:
            os.environ.pop(name, None)
        os.environ["STRIPE_SECRET_KEY"] = "sk_live_test_only"

        # Current/country-specific variables must beat stale legacy variables.
        os.environ.update({
            "STRIPE_PRICE_START_NZ": "price_start_current",
            "STRIPE_PRICE_SOLO": "price_start_old",
            "STRIPE_PRICE_CREW": "price_crew_current",
            "STRIPE_PRICE_TEAM": "price_crew_old",
            "STRIPE_PRICE_NZ_OPERATOR": "price_operator_current",
            "STRIPE_PRICE_PRO": "price_operator_old",
            "STRIPE_PRICE_COMMAND": "price_command_current",
            "STRIPE_PRICE_ENTERPRISE": "price_command_old",
        })
        sys.modules["stripe"] = fake_stripe

        expected_selection = {
            "solo": ("price_start_current", "STRIPE_PRICE_START_NZ"),
            "team": ("price_crew_current", "STRIPE_PRICE_CREW"),
            "pro": ("price_operator_current", "STRIPE_PRICE_NZ_OPERATOR"),
            "enterprise": ("price_command_current", "STRIPE_PRICE_COMMAND"),
        }
        for plan, expected in expected_selection.items():
            selected_id, selected_env, _candidates = resolver.resolve_plan_price_env(plan, "NZ")
            assert (selected_id, selected_env) == expected, (plan, selected_id, selected_env)

        price_patch.install()
        _clear_price_cache()
        result = postguard._validate_live_prices()
        assert result["valid"] is True, result
        assert result["source"] == "stripe_price_api_shared_resolver"
        assert result["checked"] == 4
        assert set(FakePriceAPI.calls) == {value[0] for value in expected_selection.values()}
        assert all(row["selected_env_key"] == expected_selection[row["plan_key"]][1] for row in result["prices"])
        assert not any(price_id.endswith("_old") for price_id in FakePriceAPI.calls)

        # When the current Start variable disappears, the selected stale legacy
        # price must still fail rather than being accepted or silently rewritten.
        os.environ.pop("STRIPE_PRICE_START_NZ", None)
        _clear_price_cache()
        stale_result = postguard._validate_live_prices()
        assert stale_result["valid"] is False, stale_result
        assert "price_start_old" in FakePriceAPI.calls
        assert any("Start price mismatch via STRIPE_PRICE_SOLO" in error for error in stale_result["errors"])

        print("Stripe price resolution passed: checkout/HQ share priority, current prices beat stale legacy IDs, and genuinely stale selected prices fail.")
    finally:
        for name, value in saved_env.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value
        if original_stripe is None:
            sys.modules.pop("stripe", None)
        else:
            sys.modules["stripe"] = original_stripe
        _clear_price_cache()


if __name__ == "__main__":
    run()
