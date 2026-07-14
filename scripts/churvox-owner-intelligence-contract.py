#!/usr/bin/env python3
"""Dependency-free contract for Churvox's eight connected intelligence features."""

from __future__ import annotations

import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        raise AssertionError(f"Missing required intelligence file: {path}")
    return target.read_text(encoding="utf-8")


def parse_python(path: str) -> str:
    text = read(path)
    ast.parse(text, filename=path)
    return text


def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise AssertionError(f"Missing {label}: {needle}")


def forbid(text: str, needle: str, label: str) -> None:
    if needle in text:
        raise AssertionError(f"Forbidden {label}: {needle}")


def main() -> None:
    routes = parse_python("backend/churvox_owner_intelligence_routes.py")
    simulation_shim = parse_python("churvox_owner_intelligence_routes.py")
    behaviour = parse_python("backend/test_churvox_owner_intelligence.py")
    tier_guard = parse_python("backend/churvox_feature_tier_paid_launch_guard.py")
    root_hook = parse_python("usercustomize.py")
    backend_hook = parse_python("backend/usercustomize.py")

    for endpoint in [
        '@router.get("/owner-intelligence/marker")',
        '@router.get("/owner-intelligence/features")',
        '@router.get("/owner-intelligence/summary")',
        '@router.get("/owner-intelligence/money-left-behind")',
        '@router.post("/owner-intelligence/money-left-behind/{finding_id}/prepare")',
        '@router.get("/owner-intelligence/job-truth-receipts")',
        '@router.get("/owner-intelligence/job-truth-receipts/{job_id}")',
        '@router.get("/owner-intelligence/promise-memory")',
        '@router.post("/owner-intelligence/promise-memory")',
        '@router.post("/owner-intelligence/voice-to-business")',
        '@router.get("/owner-intelligence/worker-proof-coach")',
        '@router.get("/owner-intelligence/explain-my-week")',
        '@router.get("/owner-intelligence/approval-budget")',
        '@router.post("/owner-intelligence/approval-budget")',
        '@router.post("/owner-intelligence/what-if")',
        '@router.get("/worker/proof-coach/{job_id}")',
        '@router.post("/worker/proof-coach/{job_id}/check")',
    ]:
        require(routes, endpoint, "persisted intelligence route")

    for key, minimum in {
        "money_left_behind": "start",
        "job_truth_receipt": "start",
        "promise_memory": "start",
        "voice_to_business": "start",
        "worker_proof_coach": "crew",
        "explain_my_week": "operator",
        "approval_budget": "operator",
        "what_if": "command",
    }.items():
        require(routes, f'"{key}": {{"label":', f"{key} tier rule")
        start = routes.index(f'"{key}": {{"label":')
        require(routes[start:start + 180], f'"minimum_plan": "{minimum}"', f"{key} minimum tier")

    for safety in [
        '"owner_review_required": True',
        '"no_auto_send": True',
        '"no_auto_sync": True',
        '"no_auto_charge": True',
        '"no_auto_change": True',
        '"no_records_changed": True',
    ]:
        require(routes, safety, "owner-control safety")

    require(simulation_shim, '"simulation_only": True', "explicit simulation-only runtime response")
    require(simulation_shim, '"no_records_changed": True', "runtime non-mutation response")
    require(simulation_shim, "_implementation.simulate_scenario = simulate_scenario", "startup simulation wrapper")
    require(simulation_shim, "build_owner_intelligence_router = _implementation.build_owner_intelligence_router", "canonical router re-export")

    for persisted in [
        "db.owner_intelligence_drafts.update_one",
        "db.job_truth_receipts.update_one",
        "db.client_promises.update_one",
        "db.approval_budgets.update_one",
        '"business_id": business_id',
        "_business_scope(user, ObjectId)",
    ]:
        require(routes, persisted, "business-scoped persistence")

    for intelligence in [
        "proof_checklist_for",
        "evaluate_proof",
        "parse_voice_to_business",
        "simulate_scenario",
        '"completed_not_invoiced"',
        '"extras_not_invoiced"',
        '"recurring_gap"',
        '"overdue_invoice"',
        '"quote_follow_up"',
    ]:
        require(routes, intelligence, "strong intelligence behaviour")

    require(behaviour, "test_tier_shape_keeps_core_intelligence_open", "tier behaviour test")
    require(behaviour, "test_proof_check_blocks_missing_confirmation", "proof gating behaviour test")
    require(behaviour, "test_voice_to_business_prepares_not_executes", "voice safety behaviour test")
    require(behaviour, "test_what_if_is_deterministic_and_non_mutating", "simulation behaviour test")

    for hook in [root_hook, backend_hook]:
        require(hook, "build_owner_intelligence_router", "runtime intelligence router import")
        require(hook, "build_owner_intelligence_router(local_db, local_get_current_user, ObjectId)", "runtime intelligence router mount")
        require(hook, 'getattr(route, "path", "") == "/api/owner-intelligence/summary"', "runtime route verification")

    for fragment in [
        '(FeatureAccess("owner_intelligence_core", "Churvox Intelligence core", "start")',
        '(FeatureAccess("worker_proof_coach", "Worker Proof Coach", "crew")',
        '(FeatureAccess("owner_intelligence_operator", "Owner Intelligence analysis", "operator")',
        '(FeatureAccess("owner_intelligence_scenarios", "What Happens If?", "command")',
    ]:
        require(tier_guard, fragment, "backend tier enforcement")

    api = read("frontend/src/churvox-office-lab/OfficeTeamIntelligenceApi.js")
    component = read("frontend/src/churvox-office-lab/OfficeTeamIntelligence.jsx")
    styles = read("frontend/src/churvox-office-lab/OfficeTeamIntelligence.css")
    site = read("frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx")
    nav = read("frontend/src/churvox-office-lab/OfficeTeamOwnerNavigation.jsx")
    access = read("frontend/src/churvox-office-lab/OfficeTeamAccess.js")
    plan_rules = read("frontend/src/churvox-fresh/planRules.js")
    plans = read("frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx")
    worker = read("frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx")

    for endpoint in [
        "/api/owner-intelligence/summary",
        "/api/owner-intelligence/money-left-behind/",
        "/api/owner-intelligence/promise-memory",
        "/api/owner-intelligence/voice-to-business",
        "/api/owner-intelligence/approval-budget",
        "/api/owner-intelligence/what-if",
        "/api/worker/proof-coach/",
    ]:
        require(api, endpoint, "frontend intelligence endpoint")

    for label in [
        "Money Left Behind",
        "Job Truth Receipt",
        "Promise Memory",
        "Voice-to-Business",
        "Worker Proof Coach",
        "Explain My Week",
        "Approval Budget",
        "What Happens If?",
    ]:
        require(component, label, "visible intelligence tool")
    require(component, "data-churvox-intelligence=\"v1\"", "intelligence workspace marker")
    require(component, 'className="cvSiteScreen cvIntel"', "standard owner page position")
    require(api, "simulation_only: true", "frontend simulation-only flag")
    require(api, "owner_review_only: true", "frontend prepared-only owner flag")
    require(styles, ".cvIntelHero", "intelligence workspace styling")

    require(site, 'import OfficeTeamIntelligence from "./OfficeTeamIntelligence";', "owner workspace import")
    require(site, 'if (screen === "intelligence") return <OfficeTeamIntelligence', "owner workspace route")
    require(nav, '["intelligence", "Intelligence"]', "owner navigation")
    require(access, 'intelligence: "intelligence"', "owner access map")
    require(plan_rules, 'intelligence: { area: "Churvox Intelligence", open: "start"', "Start intelligence access")

    for plan_copy in ["Money Left Behind", "Worker Proof Coach", "Explain My Week", "Approval Budget", "What Happens If?"]:
        require(plans, plan_copy, "honest in-app plan inclusion")

    for worker_contract in [
        "fetchWorkerProofCoach",
        "checkWorkerProofCoach",
        "proofCoach",
        "proofConfirmations",
        "Worker Proof Coach",
        "Finish blocked",
    ]:
        require(worker, worker_contract, "worker proof coach integration")

    package = json.loads(read("frontend/package.json"))
    spec_path = "tests/e2e/churvox-owner-intelligence.spec.js"
    for script_name in ["test:ui:full", "test:ui:desktop", "test:ui:mobile"]:
        require(package["scripts"][script_name], spec_path, f"{script_name} intelligence browser contract")

    spec = read("frontend/tests/e2e/churvox-owner-intelligence.spec.js")
    require(spec, "Command owner can use all eight tools", "all-eight browser contract")
    require(spec, "Start gets the four core tools", "tier browser contract")
    require(spec, "owner_review_only", "browser owner approval assertion")
    require(spec, "no_records_changed", "browser simulation assertion")

    build_workflow = read(".github/workflows/churvox-build-check.yml")
    paid_workflow = read(".github/workflows/churvox-paid-launch-gate.yml")
    require(build_workflow, "churvox-owner-intelligence-contract.py", "Build Check intelligence contract")
    require(paid_workflow, "backend.test_churvox_owner_intelligence", "Paid Launch intelligence behaviour test")

    for temporary in [
        ".github/workflows/apply-owner-intelligence.yml",
        "scripts/apply_churvox_owner_intelligence.py",
        ".github/workflows/fix-intelligence-simulation-flag.yml",
        "scripts/fix_owner_intelligence_simulation_flag.py",
    ]:
        if (ROOT / temporary).exists():
            raise AssertionError(f"Temporary intelligence patch file was not removed: {temporary}")

    forbid(routes, "auto_send = True", "automatic sending")
    forbid(routes, "auto_charge = True", "automatic charging")
    print("Churvox Intelligence contract passed: all eight features, tier rules, persistence, owner control, worker proof gating, simulation safety and permanent tests are wired.")


if __name__ == "__main__":
    main()
