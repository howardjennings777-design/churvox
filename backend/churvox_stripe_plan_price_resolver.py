from __future__ import annotations

import os

PLAN_PRICE_EXPECTATIONS = {
    "solo": {"plan": "Start", "display": "START", "legacy": "SOLO", "amount_minor": 3900},
    "team": {"plan": "Crew", "display": "CREW", "legacy": "TEAM", "amount_minor": 8900},
    "pro": {"plan": "Operator", "display": "OPERATOR", "legacy": "PRO", "amount_minor": 14900},
    "enterprise": {"plan": "Command", "display": "COMMAND", "legacy": "ENTERPRISE", "amount_minor": 29900},
}

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


def _text(value):
    return str(value or "").strip()


def normal_plan(value):
    return PLAN_ALIASES.get(_text(value).lower(), "solo")


def normal_country(value):
    code = _text(value).upper() or "NZ"
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
    return code if code in {"NZ", "AU", "US", "UK"} else "NZ"


def plan_price_env_candidates(plan, country="NZ"):
    key = normal_plan(plan)
    code = normal_country(country)
    meta = PLAN_PRICE_EXPECTATIONS[key]
    display = meta["display"]
    legacy = meta["legacy"]
    candidates = [
        f"STRIPE_PRICE_{display}_{code}",
        f"STRIPE_PRICE_{code}_{display}",
        f"STRIPE_PRICE_{legacy}_{code}",
        f"STRIPE_PRICE_{code}_{legacy}",
        f"STRIPE_PRICE_{display}",
        f"STRIPE_PRICE_{legacy}",
        f"STRIPE_{display}_PRICE_ID",
        f"STRIPE_PRICE_ID_{display}",
        f"STRIPE_PRICE_{legacy}_MONTHLY",
    ]
    seen = set()
    output = []
    for name in candidates:
        if name not in seen:
            seen.add(name)
            output.append(name)
    return output


def resolve_plan_price_env(plan, country="NZ"):
    candidates = plan_price_env_candidates(plan, country)
    for env_name in candidates:
        value = _text(os.environ.get(env_name))
        if value:
            return value, env_name, candidates
    return "", candidates[0], candidates


def price_env_signature_values(country="NZ"):
    values = []
    for plan in PLAN_PRICE_EXPECTATIONS:
        for env_name in plan_price_env_candidates(plan, country):
            values.append(f"{env_name}={_text(os.environ.get(env_name))}")
    return values
