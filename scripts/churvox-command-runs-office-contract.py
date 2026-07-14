from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import importlib
import sys
import types


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

# The contract exercises pure decision logic without installing the web stack.
starlette = types.ModuleType("starlette")
starlette_requests = types.ModuleType("starlette.requests")
starlette_requests.Request = type("Request", (), {})
starlette.requests = starlette_requests
sys.modules.setdefault("starlette", starlette)
sys.modules.setdefault("starlette.requests", starlette_requests)

engine = importlib.import_module("churvox_command_runs_office_patch")
finalizer = importlib.import_module("churvox_command_runs_office_finalizer_patch")
engine.load_context = finalizer.fast_load_context
engine.enrich_worker_decision = finalizer.enhanced_worker_decision
engine.enrich_generic_decision = finalizer.enhanced_generic_decision
engine.enrich_slip = finalizer.enhanced_enrich_slip


def fake_object_id(value=None):
    if value is None:
        return "generated-object-id"
    raw = str(value)
    if not raw:
        raise ValueError("empty id")
    return raw


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def worker_job(worker_id, title, status, client_id="client-1", scheduled="2026-07-20T09:00:00+00:00", row_id="job-history"):
    return {
        "id": row_id,
        "worker_id": worker_id,
        "title": title,
        "service_type": title,
        "client_id": client_id,
        "status": status,
        "scheduled_at": scheduled,
    }


def base_assignment_slip():
    return {
        "id": "slip-1",
        "source_id": "job-target",
        "source_type": "booking",
        "action_type": "assign_worker_review",
        "title": "Job needs worker: Lawn mowing",
        "prepared": "Receptionist prepared a staff assignment slip for owner review.",
        "payload": {
            "prepared_form": {
                "Job": "Lawn mowing",
                "Worker": "Owner to choose worker",
                "Owner check before approval": "Choose a worker before assignment.",
            },
            "field_sources": {},
            "required_fields": ["Worker"],
            "missing": ["Choose a worker before assignment."],
            "approval_blocked": True,
            "actions": ["Approve job setup", "Ask staff", "Park"],
            "evidence": ["Open job found", "Worker assignment checked"],
            "confidence": {"score": 0.9, "why": ["Live job checked"]},
            "will_do": ["Create an internal job setup draft"],
        },
    }


def test_worker_ranking_and_backup_approval():
    job = {
        "id": "job-target",
        "title": "Lawn mowing",
        "service_type": "Lawn mowing and garden tidy",
        "client_id": "client-1",
        "status": "scheduled",
        "scheduled_at": "2026-07-20T09:00:00+00:00",
    }
    workers = [
        {"id": "worker-cam", "name": "Cam", "status": "active", "role": "worker", "skills": ["lawn mowing", "garden tidy"], "available_days": "monday tuesday wednesday thursday friday"},
        {"id": "worker-stuart", "name": "Stuart", "status": "active", "role": "worker", "skills": ["lawn mowing"], "available_days": "monday tuesday wednesday thursday friday"},
        {"id": "worker-old", "name": "Former worker", "status": "inactive", "role": "worker", "skills": ["lawn mowing"]},
    ]
    jobs = [job]
    jobs.extend([
        worker_job("worker-cam", "Lawn mowing", "completed", row_id="cam-1", scheduled="2026-06-01T09:00:00+00:00"),
        worker_job("worker-cam", "Garden tidy", "completed", row_id="cam-2", scheduled="2026-06-15T09:00:00+00:00"),
        worker_job("worker-cam", "Lawn mowing", "completed", row_id="cam-3", scheduled="2026-07-01T09:00:00+00:00"),
        worker_job("worker-stuart", "Lawn mowing", "completed", client_id="client-2", row_id="stuart-1", scheduled="2026-06-10T09:00:00+00:00"),
        worker_job("worker-stuart", "Hedge trim", "assigned", client_id="client-3", row_id="stuart-clash", scheduled="2026-07-20T09:15:00+00:00"),
    ])

    ranked = engine.rank_workers(fake_object_id, job, workers, jobs)
    require(ranked, "worker ranking returned no active workers")
    require(ranked[0]["name"] == "Cam", f"expected Cam to rank first, got {ranked[0]['name']}")
    require(ranked[0]["same_client_jobs"] >= 2, "same-client continuity was not counted")
    require(any(item["name"] == "Stuart" and item["schedule_clashes"] >= 1 for item in ranked), "schedule clash was not detected")
    require(all(item["name"] != "Former worker" for item in ranked), "inactive worker entered the ranking")

    slip = base_assignment_slip()
    enriched = engine.enrich_slip(fake_object_id, slip, {"jobs": jobs, "workers": workers})
    payload = enriched["payload"]
    form = payload["prepared_form"]
    require(payload.get("command_runs_office") is True, "Command decision contract marker is missing")
    require(payload.get("recommended_worker", {}).get("name") == "Cam", "legacy assign_worker_review source did not receive a worker recommendation")
    require(form.get("Worker") == "Cam", "original Worker field still hands selection back to the owner")
    require(form.get("Recommended worker") == "Cam", "recommended worker is not visible in the prepared form")
    require("Why this worker" in form and "Backup workers" in form and "Schedule / capacity check" in form, "worker reasoning is incomplete")
    require("Worker" not in payload.get("required_fields", []), "owner is still being handed the worker-selection task")
    require(payload.get("approval_blocked") is False, "a complete worker recommendation still blocks approval")
    require(payload.get("actions", [""])[0] == "Approve Cam", "primary action does not approve the recommended worker")
    require("Approve Stuart" in payload.get("actions", []), "ranked backup is not directly approvable")
    require(payload.get("owner_review_only") and payload.get("no_auto_record_change"), "owner-control safety was weakened")

    approval = {
        "action": "Approve Stuart",
        "fields": [
            {"label": "Worker", "value": "Cam", "long": False},
            {"label": "Recommended worker", "value": "Cam", "long": False},
            {"label": "Churvox recommends", "value": "Assign Cam to this job", "long": False},
        ],
    }
    mapped = finalizer.apply_worker_action(deepcopy(approval), enriched)
    selected_fields = {item["label"]: item["value"] for item in mapped["fields"]}
    require(selected_fields.get("Worker") == "Stuart", "backup approval did not replace the original Worker field")
    require(selected_fields.get("Recommended worker") == "Stuart", "backup approval did not select the backup worker")
    require(mapped.get("selected_worker", {}).get("name") == "Stuart", "approved backup worker was not attached to the approval payload")


def test_generic_slip_contract():
    slip = {
        "id": "invoice-slip",
        "source_id": "invoice-1",
        "source_type": "money",
        "action_type": "prepare_overdue_followup",
        "title": "Payment follow-up ready",
        "prepared": "Bookkeeper prepared a reminder using the confirmed balance and due date.",
        "payload": {
            "prepared_form": {"Outstanding amount": "$120.00"},
            "field_sources": {},
            "evidence": ["Outstanding balance: $120.00", "Due date confirmed"],
            "confidence": {"score": 0.93, "why": ["Balance checked", "Due date checked"]},
            "actions": ["Approve follow-up draft", "Call client", "Park"],
            "will_do": ["Create an internal reminder draft", "Keep it unsent"],
        },
    }
    enriched = engine.enrich_slip(fake_object_id, slip, {"jobs": [], "workers": []})
    payload = enriched["payload"]
    form = payload["prepared_form"]
    for label in ["Churvox recommends", "Why this is the best next step", "Other safe options", "What approval will do"]:
        require(label in form, f"generic Command slip is missing {label}")
    require(form["Churvox recommends"].startswith("Approve follow-up draft."), "generic recommendation does not lead with the actual prepared action")
    require(payload.get("recommended_decision"), "generic recommendation was not stored")
    require(payload.get("recommendation_reason"), "generic recommendation reason was not stored")
    require(payload.get("approval_effect"), "generic approval effect was not stored")


def test_safe_no_worker_fallback():
    job = {
        "id": "job-target",
        "title": "Roof inspection",
        "service_type": "Roof inspection",
        "client_id": "client-1",
        "status": "scheduled",
        "scheduled_at": "2026-07-21T10:00:00+00:00",
    }
    slip = base_assignment_slip()
    enriched = engine.enrich_slip(fake_object_id, slip, {"jobs": [job], "workers": []})
    payload = enriched["payload"]
    require("availability check" in payload.get("recommended_decision", "").lower(), "no-worker fallback did not prepare an availability check")
    require(payload.get("actions", [""])[0] == "Approve availability check", "fallback still asks the owner to invent a worker")
    require(payload.get("prepared_form", {}).get("Worker", "").startswith("Unassigned"), "fallback leaves the Worker field as an owner task")
    require(not payload.get("recommended_worker"), "fallback invented a worker")


def test_installation_and_source_contract():
    loader = (BACKEND / "churvox_startup_patch_loader.py").read_text(encoding="utf-8")
    main_source = (BACKEND / "churvox_command_runs_office_patch.py").read_text(encoding="utf-8")
    final_source = (BACKEND / "churvox_command_runs_office_finalizer_patch.py").read_text(encoding="utf-8")
    command_sources = (BACKEND / "churvox_command_routes.py").read_text(encoding="utf-8")
    require(loader.index('"churvox_command_runs_office_patch"') < loader.index('"churvox_command_runs_office_finalizer_patch"'), "Command finalizer is not loaded after the recommendation engine")
    require('"assign_worker_review"' in command_sources, "legacy worker-assignment source disappeared from Command routes")
    for token in ["same_client", "same_service", "worker_skill_text", "workload", "clashes", "available_days", "recommended_decision", "recommendation_reason", "approval_effect"]:
        require(token in main_source, f"Command recommendation source is missing {token}")
    for token in ["asyncio.gather", "Approve {name}", "worker_action_map", "apply_worker_action", "enhanced_generic_decision", '"Worker", top_name', "WORKER_ASSIGNMENT_ACTIONS", '"assign_worker_review"', "enhanced_enrich_slip"]:
        require(token in final_source, f"Command finalizer is missing {token}")


if __name__ == "__main__":
    test_worker_ranking_and_backup_approval()
    test_generic_slip_contract()
    test_safe_no_worker_fallback()
    test_installation_and_source_contract()
    print("Command runs-office contract passed: every slip recommends an actionable decision; every active worker-assignment source, including assign_worker_review, ranks the real team, exposes backups, maps backup approval correctly, and preserves owner-control safety.")
