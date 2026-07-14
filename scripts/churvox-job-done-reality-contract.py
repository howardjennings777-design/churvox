#!/usr/bin/env python3
"""Static, dependency-free contract gate for the persisted Job Done workflow."""

from __future__ import annotations

import ast
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
        '@router.post("/job-done/scan")',
        '@router.get("/job-done/closeouts")',
        '@router.post("/job-done/closeouts/{closeout_id}/prepare")',
        '@router.get("/job-done/money-radar")',
        '@router.post("/job-done/money-radar/prepare")',
    ]:
        require(routes, route, "persisted API route")

    for invariant in [
        '"business_id": business_id',
        '"job_id": job_id',
        '"job_collection":',
        'db.job_closeouts.update_one',
        'upsert=True',
        '"source_type": "job_done"',
        '"action_type": "apply_job_closeout"',
        '"job_done_reality_v1": True',
        '"no_auto_send": True',
        '"no_auto_sync": True',
        '"no_auto_charge": True',
    ]:
        require(routes, invariant, "Job Done persistence/safety invariant")

    require(completion, '"trigger": "worker_completion"', "worker completion trigger")
    require(completion, '"job_done_closeout_id"', "worker completion closeout response")
    require(completion, 'await _seed_job_done', "worker completion closeout write")

    for invariant in [
        'async def apply_job_done_closeout',
        'payload.get("job_done_reality_v1")',
        '"source_job_closeout_id"',
        '"record_kind"',
        'unique=True',
        'if closeout.get("status") == "approved" and previous.get("applied")',
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
        require(hook, "build_job_done_router(local_db, local_get_current_user, ObjectId)", "Job Done router install")

    api = read("frontend/src/churvox-office-lab/OfficeTeamJobDoneApi.js")
    component = read("frontend/src/churvox-office-lab/OfficeTeamJobDone.js")
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
    forbid(component, 'useOfficeTeamRows("work"', "display-row closeout inference")
    forbid(component, "findRelated", "title-based record joining")

    spec = read("frontend/tests/e2e/churvox-job-done-reality.spec.js")
    require(spec, "closeout.id", "browser ID assertion")
    require(spec, "owner_review_only", "browser owner-control assertion")

    print("Job Done reality contract passed: persistence, explicit IDs, idempotency, safety and owner control are wired.")


if __name__ == "__main__":
    main()
