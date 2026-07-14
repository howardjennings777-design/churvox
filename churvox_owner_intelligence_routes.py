"""Runtime compatibility shim for the Churvox Intelligence router.

The backend implementation remains canonical. This root import path is preferred by
Churvox startup and guarantees that every What Happens If? result explicitly says
it is simulation-only before the router is mounted.
"""

from backend import churvox_owner_intelligence_routes as _implementation


_original_simulate_scenario = _implementation.simulate_scenario


def simulate_scenario(kind, payload, baseline):
    result = _original_simulate_scenario(kind, payload, baseline)
    return {
        **result,
        "simulation_only": True,
        "no_records_changed": True,
    }


_implementation.simulate_scenario = simulate_scenario

OWNER_INTELLIGENCE_BUILD = _implementation.OWNER_INTELLIGENCE_BUILD
PLAN_FEATURES = _implementation.PLAN_FEATURES
SAFE_RESULT = _implementation.SAFE_RESULT
build_owner_intelligence_router = _implementation.build_owner_intelligence_router
evaluate_proof = _implementation.evaluate_proof
parse_voice_to_business = _implementation.parse_voice_to_business
proof_checklist_for = _implementation.proof_checklist_for
