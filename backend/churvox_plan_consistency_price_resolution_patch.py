from __future__ import annotations

import os

try:
    from churvox_stripe_plan_price_resolver import plan_price_env_candidates
except Exception:
    from backend.churvox_stripe_plan_price_resolver import plan_price_env_candidates


def _first_env(names):
    for name in names or []:
        value = str(os.environ.get(name, "") or "").strip()
        if value:
            return value, name
    names = list(names or [])
    return "", names[0] if names else ""


def install():
    try:
        import churvox_plan_consistency as consistency
    except Exception:
        from backend import churvox_plan_consistency as consistency

    consistency._price_envs = lambda plan, country="NZ": plan_price_env_candidates(plan, country)
    consistency._first_env = _first_env
    try:
        consistency._patch_globals()
    except Exception:
        pass
    return consistency


install()
