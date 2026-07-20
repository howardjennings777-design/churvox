#!/usr/bin/env python3
from pathlib import Path
import ast

ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "backend" / "churvox_job_completion_final_patch.py"
LOADER = ROOT / "backend" / "churvox_startup_patch_loader.py"
SERVER = ROOT / "backend" / "server.py"

patch = PATCH.read_text(encoding="utf-8")
loader = LOADER.read_text(encoding="utf-8")
server = SERVER.read_text(encoding="utf-8")
ast.parse(patch, filename=str(PATCH))
ast.parse(loader, filename=str(LOADER))

failures = []


def check(name, condition, detail):
    if condition:
        print(f"PASS — {name}")
    else:
        print(f"FAIL — {name}: {detail}")
        failures.append(f"{name}: {detail}")


check(
    "both completion routes use one final engine",
    '("/api/jobs/{job_id}/complete", owner_complete)' in patch
    and '("/api/worker/jobs/{job_id}/complete", worker_complete)' in patch
    and "return await complete(request, job_id, require_worker=False)" in patch
    and "return await complete(request, job_id, require_worker=True)" in patch,
    "owner and worker completion must not drift into separate implementations",
)
check(
    "job lookup is scoped to the signed-in business",
    "ownership_clause(ObjectId, business)" in patch
    and 'values = [{"business_id": business}, {"contractor_id": business}]' in patch
    and "query = job_query(ObjectId, job_id, business, user" in patch,
    "a job ID alone must never be enough to complete another business's job",
)
check(
    "workers can only complete assigned jobs",
    "assigned_clause(ObjectId, user)" in patch
    and "if require_worker or role in WORKER_ROLES" in patch
    and "Only assigned workers can complete field jobs" in patch,
    "worker completion needs an assignment filter and role check",
)
check(
    "completion has an atomic retry claim",
    '"completion_state": "processing"' in patch
    and '"completion_processing_started_at": now' in patch
    and '"completion_state": {"$nin": ["processing", "complete"]}' in patch
    and '"completion_processing_started_at": {"$lt": stale_before}' in patch,
    "parallel clicks must not prepare the follow-up records twice",
)
check(
    "completed requests return idempotently",
    'if lower(job.get("completion_state")) == "complete"' in patch
    and "idempotent=True" in patch
    and "Another completion request is already preparing" in patch,
    "retries need a truthful completed or processing response",
)
check(
    "recurring generation is deterministic",
    'deterministic_id(ObjectId, "recurring-job", business, source_id, next_date.isoformat())' in patch
    and "existing_next_job" in patch
    and '"next_generated_job_id": created["_id"]' in patch,
    "the same completed occurrence must always resolve to one next job",
)
check(
    "next recurring job starts clean",
    '"status": "assigned"' in patch
    and '"completed": False' in patch
    and '"time_entries": []' in patch
    and '"timer_running": False' in patch
    and "TRANSIENT_RECURRING_FIELDS" in patch,
    "completion evidence, timers and invoice links must not leak into the next occurrence",
)
check(
    "calendar recurrence stays centralised",
    'calculator = getattr(module, "calculate_next_recurring_date", None)' in patch
    and 'calculator(next_date, frequency, custom_days)' in patch
    and 'timedelta(days=30)' not in patch,
    "monthly work must keep using the calendar-aware server calculator",
)
check(
    "one draft invoice is prepared for owner review",
    "async def ensure_invoice" in patch
    and '"status": {"$ne": "void"}' in patch
    and 'create_draft_invoice_for_completed_job' in patch
    and '"owner_approval_required": True' in patch,
    "completion may prepare a draft but may not send or mark it paid",
)
check(
    "Job Done closeout still starts",
    "async def seed_job_done" in patch
    and 'getattr(patch, "_seed_job_done", None)' in patch
    and '"job_done_closeout_id"' in patch,
    "unifying completion must not remove the existing owner closeout workflow",
)
check(
    "follow-up failures are retryable",
    'final_state = "needs_retry" if warnings else "complete"' in patch
    and '"completion_warnings": warnings' in patch
    and '"completion_error": "; ".join(warnings)' in patch,
    "a completed job must remain completed while missing follow-up records can be retried",
)
check(
    "completion never claims an automatic customer action",
    "Nothing was sent, synced, charged or paid" in patch
    and "auto_send" not in patch
    and "send_email" not in patch
    and "stripe" not in patch.lower(),
    "the route may only prepare owner-review records",
)
check(
    "final patch wins route precedence",
    '"churvox_worker_complete_elapsed_patch"' in loader
    and '"churvox_job_completion_final_patch"' in loader
    and loader.index('"churvox_job_completion_final_patch"') > loader.index('"churvox_worker_complete_elapsed_patch"'),
    "the secure final engine must load after the older worker completion route",
)
check(
    "legacy main route remains detectable for replacement",
    '@api_router.post("/jobs/{job_id}/complete")' in server
    and 'job = await db.jobs.find_one({"id": job_id})' in server,
    "the contract should fail loudly if the underlying legacy route changes and the patch assumptions need review",
)

if failures:
    print(f"\nFinal job completion contract failed: {len(failures)} issue(s).")
    for failure in failures:
        print(f"- {failure}")
    raise SystemExit(1)

print("\nFinal job completion contract passed: business isolation, worker assignment, retry safety, one recurring job, one draft invoice and Job Done owner review are enforced.")
