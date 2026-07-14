#!/usr/bin/env python3
"""One-time source hardening for the persisted Job Done product workflow."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Could not find {label}")
    return text.replace(old, new, 1)


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"Could not find start of {label}")
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f"Could not find end of {label}")
    end += len(end_marker)
    return text[:start] + replacement + text[end:]


def harden_routes() -> None:
    path = ROOT / "backend/churvox_job_done_routes.py"
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        "from datetime import datetime, timezone\nfrom typing import Any, Dict, Optional\n",
        "from datetime import datetime, timezone\nimport hashlib\nimport json\nfrom typing import Any, Dict, Optional\n",
        "Job Done imports",
    )

    text = replace_once(
        text,
        "    async def scoped_rows(user, collection_names, limit=250):\n",
        """    def revision_for(value):
        payload = json.dumps(serial(value), sort_keys=True, separators=(",", ":"), default=str)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:24]

    async def scoped_rows(user, collection_names, limit=250):
""",
        "revision helper",
    )

    text = replace_once(
        text,
        """    async def linked_rows(user, collections, job, limit=80):
        job_id = record_id(job)
        client_id = safe_text(first_value(job, ["client_id", "customer_id", "clientId", "customerId"], ""), "")
        conditions = []
        for value in id_values(job_id):
            conditions.extend([
                {"job_id": value}, {"jobId": value}, {"source_job_id": value},
                {"linked_job_id": value}, {"record_id": value},
            ])
        for value in id_values(client_id):
            conditions.extend([{"client_id": value}, {"customer_id": value}])
        if not conditions:
            return []
        query = {"$and": [business_scope(user), {"$or": conditions}]}
        rows = []
        for name in collections:
            try:
                items = await db[name].find(query).sort("updated_at", -1).limit(limit).to_list(limit)
                rows.extend([{**dict(item), "_collection": name} for item in items])
            except Exception:
                continue
        return rows
""",
        """    async def linked_rows(user, collections, job, limit=80):
        job_id = record_id(job)
        conditions = []
        for value in id_values(job_id):
            conditions.extend([
                {"job_id": value}, {"jobId": value}, {"source_job_id": value},
                {"linked_job_id": value}, {"record_id": value},
            ])
        direct_values = []
        if any(name in INVOICE_COLLECTIONS for name in collections):
            direct_values.append(first_value(job, ["invoice_id", "invoiceId", "linked_invoice_id"], ""))
        if any(name in TIME_COLLECTIONS for name in collections):
            raw_time_ids = first_value(job, ["time_entry_ids", "timer_ids", "timesheet_ids"], [])
            direct_values.extend(raw_time_ids if isinstance(raw_time_ids, list) else [raw_time_ids])
        for direct in direct_values:
            for value in id_values(direct):
                conditions.extend([
                    {"_id": value}, {"id": value}, {"invoice_id": value},
                    {"time_entry_id": value}, {"timer_id": value},
                ])
        if not conditions:
            return []
        query = {"$and": [business_scope(user), {"$or": conditions}]}
        rows = []
        for name in collections:
            try:
                items = await db[name].find(query).sort("updated_at", -1).limit(limit).to_list(limit)
                rows.extend([{**dict(item), "_collection": name} for item in items])
            except Exception:
                continue
        return rows
""",
        "strict ID-only linked records",
    )

    text = replace_between(
        text,
        '        closeout_state = "needs_owner" if risks else "ready"',
        "        return await db.job_closeouts.find_one(key)",
        """        calculated_state = "needs_owner" if risks else "ready"
        job_value = amount_value(first_value(job, ["price", "total", "amount", "quoted_total", "job_total"], 0))
        source_snapshot = {
            "scheduled_date": serial(first_value(job, ["scheduled_date", "date", "start_date", "due_date"], None)),
            "completed_at": serial(first_value(job, ["completed_at", "finished_at", "updated_at"], None)),
            "notes": safe_text(first_value(job, ["completion_note", "worker_note", "notes"], ""), "", 2000),
        }
        source_core = {
            "job_id": job_id,
            "client_id": client_id,
            "worker_ids": [safe_text(item, "") for item in worker_ids if safe_text(item, "")],
            "proof": proof,
            "worker_time": worker_time,
            "extras": extras,
            "invoice": invoice,
            "recurring": recurring,
            "job_value": job_value,
            "source_job_status": status_text(job),
            "source_snapshot": source_snapshot,
        }
        source_revision = revision_for(source_core)
        job_collection = safe_text(job.get("_collection"), "jobs")
        key = {"business_id": business_id, "job_collection": job_collection, "job_id": job_id}
        existing = await db.job_closeouts.find_one(key)
        same_revision = bool(existing and existing.get("source_revision") == source_revision)
        existing_status = safe_text((existing or {}).get("status"), "open")
        existing_execution = (existing or {}).get("execution") if isinstance((existing or {}).get("execution"), dict) else {}
        if same_revision and existing_status == "approved" and existing_execution.get("applied"):
            next_status = "approved"
            next_state = "approved"
        elif same_revision and existing_status == "waiting_proof" and proof.get("status") == "missing":
            next_status = "waiting_proof"
            next_state = "waiting_proof"
        elif same_revision and existing_status == "in_command":
            next_status = "in_command"
            next_state = calculated_state
        else:
            next_status = "open"
            next_state = calculated_state
        payload = {
            "business_id": business_id,
            "contractor_id": business_oid or business_id,
            "job_id": job_id,
            "job_collection": job_collection,
            "job_title": record_title(job),
            "client_id": client_id,
            "worker_ids": source_core["worker_ids"],
            "proof": proof,
            "worker_time": worker_time,
            "extras": extras,
            "invoice": invoice,
            "recurring": recurring,
            "job_value": job_value,
            "risk_keys": risks,
            "risk_count": len(risks),
            "closeout_state": next_state,
            "status": next_status,
            "source_job_status": source_core["source_job_status"],
            "source_snapshot": source_snapshot,
            "source_revision": source_revision,
            "updated_at": now(),
            "version": 1,
        }
        await db.job_closeouts.update_one(
            key,
            {"$set": payload, "$setOnInsert": {"created_at": now(), "owner_decisions": [], "execution": {}}},
            upsert=True,
        )
        return await db.job_closeouts.find_one(key)""",
        "revision-aware closeout upsert",
    )

    text = replace_once(
        text,
        """    async def scan_closeouts(user):
        jobs = await scoped_rows(user, JOB_COLLECTIONS, 300)
""",
        """    async def scan_closeouts(user):
        try:
            await db.job_closeouts.create_index(
                [("business_id", 1), ("job_collection", 1), ("job_id", 1)],
                unique=True,
                name="one_closeout_per_job",
            )
        except Exception:
            pass
        jobs = await scoped_rows(user, JOB_COLLECTIONS, 300)
""",
        "closeout unique index",
    )

    text = replace_once(
        text,
        """        existing = await db.command_slips.find_one({
            "business_id": business_id,
            "source_type": "job_done",
            "source_id": closeout_id,
            "status": {"$in": OPEN_COMMAND_STATUSES},
        })
        if existing:
            return existing, True
        risks = closeout.get("risk_keys") or []
""",
        """        execution = closeout.get("execution") if isinstance(closeout.get("execution"), dict) else {}
        if closeout.get("status") == "approved" and execution.get("applied"):
            raise HTTPException(status_code=409, detail="This Job Done closeout is already approved. No duplicate draft was created.")
        existing = await db.command_slips.find_one({
            "business_id": business_id,
            "source_type": "job_done",
            "source_id": closeout_id,
            "status": {"$in": OPEN_COMMAND_STATUSES},
        })
        current_revision = safe_text(closeout.get("source_revision"), "")
        if existing:
            existing_payload = existing.get("payload") if isinstance(existing.get("payload"), dict) else {}
            existing_revision = safe_text(existing_payload.get("closeout_revision"), "")
            if not current_revision or not existing_revision or existing_revision == current_revision:
                return existing, True
            await db.command_slips.update_one(
                {"_id": existing["_id"]},
                {"$set": {"status": "superseded", "updated_at": now(), "superseded_reason": "Job Done source records changed before approval."}},
            )
        risks = closeout.get("risk_keys") or []
        proof_status = safe_text((closeout.get("proof") or {}).get("status"), "check")
        invoice_state = closeout.get("invoice") if isinstance(closeout.get("invoice"), dict) else {}
        invoice_amount = amount_value(invoice_state.get("amount") or closeout.get("job_value"))
        required_fields = []
        if proof_status != "missing" and not invoice_state.get("invoice_id") and invoice_amount <= 0:
            required_fields.append("invoice amount")
""",
        "fresh Command slip protection",
    )

    text = replace_once(
        text,
        '                "job_done_closeout_id": closeout_id,\n                "job_id": closeout.get("job_id") or "",\n',
        '                "job_done_closeout_id": closeout_id,\n                "closeout_revision": current_revision,\n                "job_id": closeout.get("job_id") or "",\n',
        "closeout revision in Command",
    )
    text = replace_once(
        text,
        '                "risk_keys": risks,\n                "prepared_form": prepared_form(closeout, intent),\n',
        '                "risk_keys": risks,\n                "required_fields": required_fields,\n                "approval_blocked": bool(required_fields),\n                "prepared_form": prepared_form(closeout, intent),\n',
        "required approval fields",
    )

    text = replace_once(
        text,
        """    def radar_from(closeouts, invoices):
        items = []
        for closeout in closeouts:
""",
        """    def radar_from(closeouts, invoices):
        active_closeouts = [item for item in closeouts if item.get("status") not in {"approved", "closed"}]
        items = []
        for closeout in active_closeouts:
""",
        "Money Radar active queue",
    )
    text = replace_once(
        text,
        '                "type": "Earned, not closed" if closeout.get("status") not in {"approved", "closed"} else "Closed work",\n',
        '                "type": "Earned, not closed",\n',
        "Money Radar item type",
    )
    text = replace_once(
        text,
        '            {"label": "Finished, not closed", "value": sum(1 for item in closeouts if item.get("status") not in {"approved", "closed"}), "note": "Persisted job closeouts waiting for a final owner-controlled step"},\n',
        '            {"label": "Finished, not closed", "value": len(active_closeouts), "note": "Persisted job closeouts waiting for a final owner-controlled step"},\n',
        "Money Radar closeout count",
    )
    text = replace_once(
        text,
        '            {"label": "Worker cost checks", "value": sum(1 for item in closeouts if (item.get("worker_time") or {}).get("status") in {"review", "missing"}), "note": "Completed jobs whose hours still need review"},\n',
        '            {"label": "Worker cost checks", "value": sum(1 for item in active_closeouts if (item.get("worker_time") or {}).get("status") in {"review", "missing"}), "note": "Completed jobs whose hours still need review"},\n',
        "Money Radar worker count",
    )

    path.write_text(text, encoding="utf-8")


def harden_executor() -> None:
    path = ROOT / "backend/churvox_command_apply_routes.py"
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '["invoices", "invoice_reviews", "payroll_reviews", "message_drafts", "jobs", "accounting_reviews"]',
        '["invoices", "invoice_reviews", "payroll_reviews", "quality_reviews", "message_drafts", "jobs", "accounting_reviews"]',
        "Job Done artifact indexes",
    )

    text = replace_once(
        text,
        """        if not closeout:
            return {"applied": False, "message": "The persisted Job Done closeout could not be found. Nothing was applied."}
        previous = closeout.get("execution") if isinstance(closeout.get("execution"), dict) else {}
""",
        """        if not closeout:
            return {"applied": False, "message": "The persisted Job Done closeout could not be found. Nothing was applied."}
        expected_revision = safe_text(payload.get("closeout_revision"), "")
        current_revision = safe_text(closeout.get("source_revision"), "")
        if expected_revision and current_revision and expected_revision != current_revision:
            raise HTTPException(status_code=409, detail="This Job Done closeout changed after Command prepared it. Refresh Job Done and review the new evidence before approval. Nothing was applied.")
        previous = closeout.get("execution") if isinstance(closeout.get("execution"), dict) else {}
""",
        "stale closeout approval guard",
    )

    text = replace_once(
        text,
        """        recurring_state = closeout.get("recurring") if isinstance(closeout.get("recurring"), dict) else {}
        job_title = safe_text(closeout.get("job_title") or pick(form, "job", "title"), "Completed job")
""",
        """        recurring_state = closeout.get("recurring") if isinstance(closeout.get("recurring"), dict) else {}
        proof_state = closeout.get("proof") if isinstance(closeout.get("proof"), dict) else {}
        proof_missing = safe_text(proof_state.get("status"), "check").lower() == "missing"
        job_title = safe_text(closeout.get("job_title") or pick(form, "job", "title"), "Completed job")
""",
        "proof gate state",
    )

    text = replace_between(
        text,
        "        artifacts = {}",
        "        execution = {",
        """        artifacts = {}

        if worker_hours > 0 or time_state.get("status") in {"review", "missing"}:
            artifacts["payroll_review_id"] = await upsert_job_done_artifact(user, "payroll_reviews", closeout_id, "job_done_hours_review", {
                "title": f"Hours review: {job_title}",
                "job_id": job_id,
                "worker_ids": closeout.get("worker_ids") or [],
                "time_entry_ids": time_state.get("entry_ids") or [],
                "hours": worker_hours,
                "status": "draft_approved",
                "command_slip_id": str(slip.get("_id")),
                "gross_only": True,
            })

        if proof_missing:
            artifacts["quality_review_id"] = await upsert_job_done_artifact(user, "quality_reviews", closeout_id, "job_done_proof_review", {
                "title": f"Completion proof needed: {job_title}",
                "job_id": job_id,
                "client_id": client_id,
                "proof_status": "missing",
                "status": "draft_approved",
                "command_slip_id": str(slip.get("_id")),
                "note": safe_text(proof_state.get("note"), "Required completion proof is missing."),
            })
            artifacts["worker_proof_request_id"] = await upsert_job_done_artifact(user, "message_drafts", closeout_id, "worker_proof_request", {
                "title": f"Proof request: {job_title}",
                "job_id": job_id,
                "worker_ids": closeout.get("worker_ids") or [],
                "body": f"Please add the required completion proof for {job_title}.",
                "status": "draft_approved",
                "command_slip_id": str(slip.get("_id")),
                "sent": False,
            })
            final_status = "waiting_proof"
            final_state = "waiting_proof"
            execution_type = "job_done_proof_hold"
        else:
            if invoice_state.get("invoice_id"):
                artifacts["invoice_review_id"] = await upsert_job_done_artifact(user, "invoice_reviews", closeout_id, "linked_invoice_review", {
                    "title": f"Invoice review: {job_title}",
                    "job_id": job_id,
                    "client_id": client_id,
                    "invoice_id": safe_text(invoice_state.get("invoice_id"), ""),
                    "amount": invoice_total,
                    "extras_amount": extras_amount,
                    "status": "draft_approved",
                    "command_slip_id": str(slip.get("_id")),
                    "prepared_form": serial(form),
                })
            else:
                artifacts["invoice_draft_id"] = await upsert_job_done_artifact(user, "invoices", closeout_id, "job_done_invoice_draft", {
                    "title": f"Draft invoice: {job_title}",
                    "job_id": job_id,
                    "client_id": client_id,
                    "total": invoice_total,
                    "amount": invoice_total,
                    "extras_amount": extras_amount,
                    "status": "draft_approved",
                    "command_slip_id": str(slip.get("_id")),
                    "prepared_form": serial(form),
                    "sent": False,
                    "synced": False,
                })
            artifacts["message_draft_id"] = await upsert_job_done_artifact(user, "message_drafts", closeout_id, "job_done_customer_message", {
                "title": f"Completion message: {job_title}",
                "job_id": job_id,
                "client_id": client_id,
                "body": customer_message,
                "status": "draft_approved",
                "command_slip_id": str(slip.get("_id")),
                "sent": False,
            })
            if recurring_state.get("recurring") and next_date:
                artifacts["next_job_draft_id"] = await upsert_job_done_artifact(user, "jobs", closeout_id, "recurring_next_job_draft", {
                    "title": job_title,
                    "source_job_id": job_id,
                    "client_id": client_id,
                    "scheduled_date": next_date,
                    "status": "draft_approved",
                    "recurring": True,
                    "command_slip_id": str(slip.get("_id")),
                })
            artifacts["accounting_review_id"] = await upsert_job_done_artifact(user, "accounting_reviews", closeout_id, "job_done_accounting_review", {
                "title": f"Accounting review: {job_title}",
                "job_id": job_id,
                "invoice_id": invoice_state.get("invoice_id") or artifacts.get("invoice_draft_id") or "",
                "amount": invoice_total,
                "status": "draft_approved",
                "command_slip_id": str(slip.get("_id")),
                "sync_status": "locked_pending_owner_action",
            })
            final_status = "approved"
            final_state = "approved"
            execution_type = "job_done_closeout"

        execution = {""",
        "proof-gated artifact execution",
    )

    text = replace_once(
        text,
        '            "type": "job_done_closeout",\n',
        '            "type": execution_type,\n',
        "Job Done execution type",
    )
    text = replace_once(
        text,
        '                    "status": "approved",\n                    "closeout_state": "approved",\n',
        '                    "status": final_status,\n                    "closeout_state": final_state,\n',
        "Job Done final state",
    )

    path.write_text(text, encoding="utf-8")


def harden_worker_completion() -> None:
    path = ROOT / "backend/churvox_worker_complete_elapsed_patch.py"
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        "async def _seed_job_done(db, user, job, now):\n",
        """def safe_existing_status(existing):
    status = _text((existing or {}).get("status"), "open")
    return status if status in {"open", "in_command", "waiting_proof"} else "open"


async def _seed_job_done(db, user, job, now):
""",
        "worker closeout status helper",
    )
    text = replace_once(
        text,
        '        key = {"business_id": business_id, "job_collection": "jobs", "job_id": job_id}\n        await db.job_closeouts.update_one(\n',
        '        key = {"business_id": business_id, "job_collection": "jobs", "job_id": job_id}\n        existing = await db.job_closeouts.find_one(key)\n        existing_execution = (existing or {}).get("execution") if isinstance((existing or {}).get("execution"), dict) else {}\n        preserve_approved = bool((existing or {}).get("status") == "approved" and existing_execution.get("applied"))\n        seed_status = "approved" if preserve_approved else safe_existing_status(existing)\n        seed_state = "approved" if preserve_approved else ("waiting_proof" if seed_status == "waiting_proof" else "scanning")\n        await db.job_closeouts.update_one(\n',
        "worker completion approved-state protection",
    )
    text = replace_once(
        text,
        '                    "closeout_state": "scanning",\n                    "status": "open",\n',
        '                    "closeout_state": seed_state,\n                    "status": seed_status,\n',
        "worker completion closeout state",
    )

    path.write_text(text, encoding="utf-8")


def include_browser_contract() -> None:
    path = ROOT / "frontend/package.json"
    package = json.loads(path.read_text(encoding="utf-8"))
    spec = "tests/e2e/churvox-job-done-reality.spec.js"
    for name in ["test:ui:full", "test:ui:desktop", "test:ui:mobile"]:
        command = package["scripts"][name]
        if spec in command:
            continue
        if " --project=" in command:
            command = command.replace(" --project=", f" {spec} --project=", 1)
        elif " --workers=" in command:
            command = command.replace(" --workers=", f" {spec} --workers=", 1)
        else:
            command = f"{command} {spec}"
        package["scripts"][name] = command
    path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    harden_routes()
    harden_executor()
    harden_worker_completion()
    include_browser_contract()
    print("Job Done product hardening applied.")


if __name__ == "__main__":
    main()
