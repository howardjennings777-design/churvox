"""Runtime compatibility shim for the Churvox Intelligence router.

The backend implementation remains canonical. This root import path is preferred by
Churvox startup and strengthens natural spoken instructions while guaranteeing that
every What Happens If? result explicitly says it is simulation-only.
"""

import re

from backend import churvox_owner_intelligence_routes as _implementation


_original_simulate_scenario = _implementation.simulate_scenario
_original_parse_voice_to_business = _implementation.parse_voice_to_business
_SPOKEN_NUMBERS = {
    "one": 1.0,
    "two": 2.0,
    "three": 3.0,
    "four": 4.0,
    "five": 5.0,
    "six": 6.0,
    "seven": 7.0,
    "eight": 8.0,
    "nine": 9.0,
    "ten": 10.0,
    "half": 0.5,
}


def simulate_scenario(kind, payload, baseline):
    result = _original_simulate_scenario(kind, payload, baseline)
    return {
        **result,
        "simulation_only": True,
        "no_records_changed": True,
    }


def parse_voice_to_business(text):
    result = _original_parse_voice_to_business(text)
    if not result.get("estimated_hours"):
        source = str(result.get("source_text") or text or "").lower()
        match = re.search(r"\b(one|two|three|four|five|six|seven|eight|nine|ten|half)\s+(?:hours?|hrs?)\b", source)
        if match:
            result["estimated_hours"] = _SPOKEN_NUMBERS[match.group(1)]
    return result


_implementation.simulate_scenario = simulate_scenario
_implementation.parse_voice_to_business = parse_voice_to_business

OWNER_INTELLIGENCE_BUILD = _implementation.OWNER_INTELLIGENCE_BUILD
PLAN_FEATURES = _implementation.PLAN_FEATURES
SAFE_RESULT = _implementation.SAFE_RESULT
build_owner_intelligence_router = _implementation.build_owner_intelligence_router
evaluate_proof = _implementation.evaluate_proof
proof_checklist_for = _implementation.proof_checklist_for
