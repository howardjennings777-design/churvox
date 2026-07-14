#!/usr/bin/env python3
"""Static, dependency-free contract gate for the persisted Job Done workflow."""

from __future__ import annotations

import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        raise AssertionError(f"Missing required Job Done file: {path}")
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
    routes = parse_python("backend/churvox_job_done_routes.py")
    executor = parse_python("backend/churvox_command_apply_routes.py")
    completion = parse_python("backend/churvox_worker_complete_elapsed_patch.py")
    backend_hook = parse_python("backend/usercustomize.py")
    root_hook = parse_python("usercustomize.py")

    for route in [
        '@router.get("/job-done/marker")',
        '@router.post("/job-done/scan")',
        '@router.get("/job-done/closeouts")',
        '@router.get("/job-done/closeouts/{closeout_id}")',
        '@router.post("/job-done/closeouts/{closeout_id}/prepare")',
        '@router.get("/job-done/money-radar")',
        '@router.post("/job-done/money-radar/prepare")',
    ]:
        require(routes, route, "persisted API route")

    for invariant in [
        'JOB_DONE_REALITY_BUILD = "job-done-reality-v2-20260714"',
        'JOB_DONE_ROUTE_GUARD = "startup-mount-confirmed-v1"',
        '"business_id": business_id',
        '"job_id": job_id',
        '"job_collection":',
        'db.job_closeouts.update_one',
        'upsert=True',
        'name="one_closeout_per_job"',
        '"source_type": "job_done"',
        '"action_type": "apply_job_closeout"',
        '"job_done_reality_v1": True',
        '"source_revision": source_revision',
        '"closeout_revision": current_revision',
        '"required_fields": required_fields',
        '"approval_blocked": bool(required_fields)',
        '"status": "superseded"',
        'active_closeouts = [item for item in closeouts if item.get("status") not in {"approved", "closed"}]',
        '"no_auto_send": True',
        '"no_auto_sync": True',
        '"no_auto_charge": True',
    ]:
        require(routes, invariant, "Job Done persistence/safety invariant")

    require(routes, 'direct_values = []', "explicit linked-record IDs")
    require(routes, 'first_value(job, ["invoice_id", "invoiceId", "linked_invoice_id"]', "direct invoice ID link")
    require(routes, 'first_value(job, ["time_entry_ids", "timer_ids", "timesheet_ids"]', "direct time-entry ID link")
    forbid(routes, 'conditions.extend([{"client_id": value}, {"customer_id": value}])', "client-only invoice/time matching")
    forbid(routes, 'findRelated', "title-based record joining")

    for invariant in [
        '"trigger": "worker_completion"',
        '"job_done_closeout_id"',
        'await _seed_job_done',
        'preserve_approved = bool(',
        'seed_status = "approved" if preserve_approved',
    ]:
        require(completion, invariant, "worker completion invariant")

    for invariant in [
        'async def apply_job_done_closeout',
        'payload.get("job_done_reality_v1")',
        'expected_revision = safe_text(payload.get("closeout_revision")',
        'expected_revision != current_revision',
        '"source_job_closeout_id"',
        '"record_kind"',
        'unique=True',
        'if closeout.get("status") == "approved" and previous.get("applied")',
        'proof_missing = safe_text(proof_state.get("status")',
        '"quality_review_id"',
        '"worker_proof_request_id"',
        'final_status = "waiting_proof"',
        'execution_type = "job_done_proof_hold"',
        '"invoice_draft_id"',
        '"payroll_review_id"',
        '"message_draft_id"',
        '"next_job_draft_id"',
        '"accounting_review_id"',
        '"no_auto_pay": True',
    ]:
        require(executor, invariant, "idempotent approval invariant")

    for hook in [backend_hook, root_hook]:
        require(hook, "build_job_done_router", "Job Done runtime registration")
        require(hook, "Mount Job Done immediately after the public build marker", "early Job Done mount")
        require(hook, 'getattr(route, "path", "") == "/api/job-done/closeouts"', "Job Done closeout mount verification")
        require(hook, 'getattr(route, "path", "") == "/api/job-done/marker"', "Job Done marker mount verification")
        require(hook, "self.state.churvox_job_done_routes_installed = True", "verified Job Done startup state")
        require(hook, "self.state.churvox_real_ai_operator_routes_installed = True", "late installed flag")
        require(hook, "self.state.churvox_real_ai_operator_routes_installed = False", "failed install retry reset")

    command_marker = read("backend/churvox_command_human_mimic_marker_routes.py")
    require(command_marker, '"job_done_reality_build": JOB_DONE_REALITY_BUILD', "public backend deploy fingerprint")
    require(command_marker, '"job_done_route_guard": JOB_DONE_ROUTE_GUARD', "public route guard fingerprint")
    frontend_entry = read("frontend/src/index.js")
    require(frontend_entry, "churvox-job-done-live-v2-20260714", "eager frontend deploy fingerprint")

    live_deploy = read("scripts/churvox-live-job-done-deploy.cjs")
    for invariant in [
        "churvox-job-done-live-v2-20260714",
        "job-done-reality-v2-20260714",
        "startup-mount-confirmed-v1",
        "/asset-manifest.json",
        "/api/command/human-mimic-marker",
        "/api/job-done/marker",
        "/api/job-done/closeouts",
        "[401, 403].includes",
    ]:
        require(live_deploy, invariant, "live Job Done deployment proof")
    full_workflow = read(".github/workflows/playwright-full-site.yml")
    require(full_workflow, "Verify live Job Done deployment fingerprints", "main deploy proof workflow step")
    require(full_workflow, "node ../scripts/churvox-live-job-done-deploy.cjs", "main deploy proof command")
    require(full_workflow, "PLAYWRIGHT_API_BASE", "live backend workflow URL")

    api = read("frontend/src/churvox-office-lab/OfficeTeamJobDoneApi.js")
    component = read("frontend/src/churvox-office-lab/OfficeTeamJobDone.js")
    site = read("frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx")
    for endpoint in [
        "/api/job-done/closeouts?limit=120",
        "/api/job-done/money-radar",
        "/api/job-done/money-radar/prepare",
    ]:
        require(api, endpoint, "frontend persisted endpoint")
    require(api, "owner_review_only: true", "frontend owner approval flag")
    require(component, "fetchJobDoneCloseouts", "persisted closeout reader")
    require(component, "prepareJobDoneCloseout(selected.id", "ID-based closeout preparation")
    require(component, "Money Radar · {state.source}", "Money Radar source disclosure")
    require(component, "Preview review opened. Proof, time and extras remain editable", "preview review outcome")
    require(component, "Preview Job Done closeout prepared. Nothing was sent, synced, charged or changed.", "preview closeout outcome")
    require(site, 'WorkScreen appMode={appMode} go={props.go}', "Jobs Command navigation prop")
    require(site, 'MoneyScreen appMode={appMode} go={props.go}', "Money Radar Command navigation prop")
    forbid(component, 'useOfficeTeamRows("work"', "display-row closeout inference")
    forbid(component, "findRelated", "title-based record joining")

    package = json.loads(read("frontend/package.json"))
    spec_path = "tests/e2e/churvox-job-done-reality.spec.js"
    for script_name in ["test:ui:full", "test:ui:desktop", "test:ui:mobile"]:
        require(package["scripts"][script_name], spec_path, f"{script_name} Job Done browser contract")

    spec = read("frontend/tests/e2e/churvox-job-done-reality.spec.js")
    require(spec, "closeout.id", "browser ID assertion")
    require(spec, "owner_review_only", "browser owner-control assertion")
    require(spec, "already waiting in Command", "browser duplicate-slip assertion")

    for temporary_path in [
        ".github/workflows/job-done-reality-patch.yml",
        ".github/workflows/job-done-reality-indent-repair.yml",
        ".github/workflows/job-done-id-link-repair.yml",
        ".github/workflows/job-done-product-hardening.yml",
        ".github/workflows/repair-job-done-hardening-workflow.yml",
        ".github/workflows/apply-job-done-product-hardening.yml",
        ".github/workflows/apply-job-done-button-outcomes-fix.yml",
        "scripts/churvox-job-done-product-hardening.py",
        "scripts/churvox-job-done-button-outcomes-fix.py",
    ]:
        if (ROOT / temporary_path).exists():
            raise AssertionError(f"Temporary Job Done patch file was not removed: {temporary_path}")

    print("Job Done reality contract passed: persistence, explicit IDs, stale-data protection, proof gating, idempotency, safety, owner control, button outcomes and live deploy proof are wired.")


if __name__ == "__main__":
    main()
