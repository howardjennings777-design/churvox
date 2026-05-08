"""Churvox server-side AI Autopilot cron runner.

This is the real automatic layer: it runs from the backend/cron environment and does not
require the owner to open the Jobs page or press a button.

Safe actions performed automatically:
- create draft invoices from completed jobs that have not been invoiced
- prepare invoice reminder drafts for overdue/unpaid invoices
- prepare quote follow-up drafts for sent/pending quotes
- prepare owner approval records for unassigned job worker matching

Approval-first actions only:
- worker assignment
- sending customer messages
- deleting records
- charging customers
- MYOB/accounting writes
- payroll changes
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId


MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
DEFAULT_GST_RATE = float(os.environ.get("DEFAULT_GST_RATE", "15"))


SAFE_INVOICE_STATUSES = {"draft", "sent", "awaiting payment", "awaiting_payment", "unpaid", "overdue"}
PAID_INVOICE_STATUSES = {"paid", "cancelled", "void"}
ACTIVE_JOB_STATUSES = {"assigned", "acknowledged", "scheduled", "in_progress", "paused"}
DONE_JOB_STATUSES = {"completed", "done"}
QUOTE_FOLLOWUP_STATUSES = {"sent", "pending", "viewed"}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def safe_text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def record_id(record: Dict[str, Any]) -> str:
    return safe_text(record.get("id") or record.get("_id") or record.get("job_number") or record.get("invoice_number") or record.get("quote_number"))


def serialise(record: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(record or {})
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if isinstance(value, ObjectId):
            out[key] = str(value)
        elif hasattr(value, "isoformat"):
            out[key] = value.isoformat()
    return out


def business_id_from(record: Dict[str, Any]) -> str:
    return safe_text(record.get("business_id") or record.get("owner_id") or record.get("user_id"))


def job_status(job: Dict[str, Any]) -> str:
    return safe_text(job.get("status") or job.get("job_status") or job.get("workflow_status"), "scheduled").lower().replace(" ", "_")


def is_completed_job(job: Dict[str, Any]) -> bool:
    return job_status(job) in DONE_JOB_STATUSES or bool(job.get("completed") is True or job.get("completed_at"))


def is_unassigned_job(job: Dict[str, Any]) -> bool:
    worker = job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_to") or job.get("assigned_worker_name")
    return not worker and job_status(job) not in DONE_JOB_STATUSES and job_status(job) not in {"cancelled", "paid", "archived"}


def invoice_is_overdue(invoice: Dict[str, Any]) -> bool:
    status = safe_text(invoice.get("status")).lower().replace(" ", "_")
    if status == "overdue":
        return True
    if status in PAID_INVOICE_STATUSES:
        return False
    due = invoice.get("due_date") or invoice.get("due_at")
    if not due:
        return False
    try:
        if isinstance(due, str):
            due_dt = datetime.fromisoformat(due.replace("Z", "+00:00"))
        else:
            due_dt = due
        if due_dt.tzinfo is None:
            due_dt = due_dt.replace(tzinfo=timezone.utc)
        return due_dt < now_utc()
    except Exception:
        return False


def quote_needs_followup(quote: Dict[str, Any]) -> bool:
    status = safe_text(quote.get("status")).lower().replace(" ", "_")
    return status in QUOTE_FOLLOWUP_STATUSES and not quote.get("accepted_at") and not quote.get("declined_at")


def invoice_description_from_job(job: Dict[str, Any]) -> str:
    persisted = safe_text(job.get("ai_invoice_description") or job.get("invoice_description_draft"))
    if persisted:
        return persisted
    title = safe_text(job.get("title") or job.get("name") or job.get("job_type") or job.get("service_type"), "Service work")
    client = safe_text(job.get("client_name") or job.get("customer_name"), "the client")
    address = safe_text(job.get("address") or job.get("job_address") or job.get("service_address"))
    notes = safe_text(job.get("completion_notes") or job.get("worker_completion_notes") or job.get("notes") or job.get("description"))
    location = f" at {address}" if address else ""
    detail = f" Notes: {notes}" if notes else ""
    return f"{title} completed for {client}{location}. Work has been marked complete and is ready for billing.{detail}"


def worker_name(worker: Optional[Dict[str, Any]]) -> str:
    if not worker:
        return "best available worker"
    return safe_text(worker.get("name") or worker.get("full_name") or worker.get("display_name") or worker.get("email"), "best available worker")


def worker_key(worker: Dict[str, Any]) -> str:
    return safe_text(worker.get("id") or worker.get("_id") or worker.get("user_id") or worker.get("email") or worker.get("name"))


def worker_skills(worker: Dict[str, Any]) -> str:
    raw = worker.get("skills") or worker.get("trades") or worker.get("job_types") or worker.get("experience") or []
    if isinstance(raw, list):
        return " ".join(str(x).lower() for x in raw)
    return str(raw or "").lower()


def day_key(value: Any) -> str:
    return safe_text(value)[:10]


def score_worker(worker: Dict[str, Any], job: Dict[str, Any], all_jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
    wid = worker_key(worker)
    status = safe_text(worker.get("status") or worker.get("availability") or worker.get("work_status")).lower()
    w_region = safe_text(worker.get("region") or worker.get("area") or worker.get("suburb") or worker.get("city")).lower()
    j_region = safe_text(job.get("region") or job.get("area") or job.get("suburb") or job.get("city")).lower()
    j_address = safe_text(job.get("address") or job.get("job_address") or job.get("service_address")).lower()
    j_type = safe_text(job.get("job_type") or job.get("service_type") or job.get("trade") or job.get("title") or job.get("name")).lower()
    skills = worker_skills(worker)
    j_day = day_key(job.get("scheduled_date") or job.get("start_time") or job.get("date"))
    assigned = [j for j in all_jobs if safe_text(j.get("assigned_worker_id") or j.get("worker_id") or j.get("assigned_to")) == wid and job_status(j) in ACTIVE_JOB_STATUSES]
    same_day = [j for j in assigned if j_day and day_key(j.get("scheduled_date") or j.get("start_time") or j.get("date")) == j_day]

    score = 50
    reasons: List[str] = []
    warnings: List[str] = []

    if status in {"active", "available", "online", "ready"}:
        score += 18
        reasons.append("available")
    elif status in {"inactive", "offline", "unavailable", "away"}:
        score -= 35
        warnings.append("may be unavailable")

    if j_region and w_region and j_region == w_region:
        score += 24
        reasons.append("same region")
    elif w_region and j_address and w_region in j_address:
        score += 16
        reasons.append("near address")
    elif j_region and w_region:
        score -= 7
        warnings.append("different region")

    if j_type and skills and any(part in skills for part in j_type.split() if len(part) >= 4):
        score += 22
        reasons.append("skill match")

    if not assigned:
        score += 18
        reasons.append("no active workload")
    elif len(assigned) <= 2:
        score += 8
        reasons.append("light workload")
    else:
        score -= min(28, len(assigned) * 5)
        warnings.append(f"{len(assigned)} active jobs")

    if same_day:
        score -= min(35, len(same_day) * 15)
        warnings.append(f"{len(same_day)} same-day possible clash")
    else:
        reasons.append("no same-day clash found")

    return {"worker": worker, "score": max(0, min(100, score)), "reasons": reasons, "warnings": warnings}


async def existing_pending_action(db, business_id: str, action_type: str, target_record_id: str) -> Optional[Dict[str, Any]]:
    return await db.ai_operator_actions.find_one({
        "business_id": str(business_id),
        "action_type": action_type,
        "target_record_id": str(target_record_id),
        "status": "pending",
    })


async def create_action(db, business_id: str, action_type: str, module: str, title: str, summary: str, reason: str, target_type: str, target_id: str, payload: Dict[str, Any], preview_text: str = "", confidence: int = 82) -> Optional[Dict[str, Any]]:
    if await existing_pending_action(db, business_id, action_type, target_id):
        return None
    action = {
        "id": str(uuid4()),
        "business_id": str(business_id),
        "action_type": action_type,
        "module": module,
        "title": title,
        "summary": summary,
        "reason": reason,
        "confidence": confidence,
        "risk_level": "low" if confidence >= 75 else "medium",
        "status": "pending",
        "target_record_type": target_type,
        "target_record_id": str(target_id),
        "suggested_payload": payload,
        "preview_text": preview_text,
        "created_by_ai": True,
        "created_at": now_iso(),
        "autopilot_prepared": True,
    }
    await db.ai_operator_actions.insert_one(action)
    return serialise(action)


async def create_draft_invoice_for_job(db, business_id: str, job: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    job_id = record_id(job)
    existing = await db.invoices.find_one({
        "business_id": str(business_id),
        "$or": [
            {"source_job_id": str(job_id)},
            {"job_id": str(job_id)},
            {"linked_job_id": str(job_id)},
        ],
    })
    if existing or job.get("invoice_id") or job.get("invoice_created"):
        return None

    subtotal = float(job.get("price") or job.get("job_price") or job.get("fixed_price") or job.get("subtotal") or 0)
    hourly_rate = float(job.get("hourly_rate") or 0)
    hours_worked = float(job.get("hours_worked") or job.get("total_hours") or 0)
    if subtotal <= 0 and hourly_rate > 0 and hours_worked > 0:
        subtotal = round(hourly_rate * hours_worked, 2)
    gst_rate = float(job.get("gst_rate") or DEFAULT_GST_RATE)
    gst_amount = round(subtotal * gst_rate / 100, 2)
    total = round(subtotal + gst_amount, 2)

    invoice = {
        "id": str(uuid4()),
        "invoice_number": f"INV-{now_utc().strftime('%Y%m%d')}-{str(uuid4())[:5]}",
        "business_id": str(business_id),
        "source": "ai_autopilot",
        "source_job_id": str(job_id),
        "job_id": str(job_id),
        "linked_job_id": str(job_id),
        "client_id": job.get("client_id") or job.get("customer_id") or "",
        "customer_name": safe_text(job.get("customer_name") or job.get("client_name"), "Unknown client"),
        "customer_email": safe_text(job.get("customer_email") or job.get("client_email")),
        "address": job.get("address") or job.get("job_address") or "",
        "description": invoice_description_from_job(job),
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "total": total,
        "status": "draft",
        "pricing_type": job.get("pricing_type") or job.get("price_type") or "fixed",
        "hourly_rate": hourly_rate,
        "hours_worked": hours_worked,
        "notes": "Automatically drafted by Churvox AI Autopilot. Review before sending.",
        "ai_generated": True,
        "autopilot_created": True,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.invoices.insert_one(invoice)
    await db.jobs.update_many({"business_id": str(business_id), "$or": [{"id": str(job_id)}, {"_id": job.get("_id")}]}, {"$set": {"invoice_created": True, "invoice_id": invoice["id"], "updated_at": now_utc()}})
    return serialise(invoice)


async def create_message_draft(db, business_id: str, module: str, action_type: str, target_id: str, title: str, message: str, reason: str) -> Optional[Dict[str, Any]]:
    existing = await db.ai_prepared_messages.find_one({
        "business_id": str(business_id),
        "action_type": action_type,
        "target_record_id": str(target_id),
        "status": "draft",
    })
    if existing:
        return None
    draft = {
        "id": str(uuid4()),
        "business_id": str(business_id),
        "source": "ai_autopilot",
        "status": "draft",
        "module": module,
        "action_type": action_type,
        "target_record_id": str(target_id),
        "title": title,
        "message": message,
        "reason": reason,
        "autopilot_created": True,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.ai_prepared_messages.insert_one(draft)
    return serialise(draft)


async def write_event(db, business_id: str, title: str, message: str, payload: Dict[str, Any]) -> None:
    event = {
        "id": str(uuid4()),
        "business_id": str(business_id),
        "source": "ai_autopilot",
        "title": title,
        "message": message,
        "payload": payload,
        "read": False,
        "created_at": now_utc(),
    }
    for name in ("ai_operator_events", "notifications"):
        try:
            await getattr(db, name).insert_one(dict(event))
        except Exception:
            pass


async def run_for_business(db, business_id: str) -> Dict[str, int]:
    jobs = await db.jobs.find({"business_id": str(business_id)}).limit(500).to_list(length=500)
    workers = await db.workers.find({"business_id": str(business_id)}).limit(200).to_list(length=200)
    if not workers:
        workers = await db.users.find({"business_id": str(business_id), "role": {"$in": ["worker", "manager"]}}).limit(200).to_list(length=200)
    invoices = await db.invoices.find({"business_id": str(business_id)}).limit(500).to_list(length=500)
    quotes = await db.quotes.find({"business_id": str(business_id)}).limit(500).to_list(length=500)

    created_invoices = 0
    prepared_assignments = 0
    reminder_drafts = 0
    quote_drafts = 0

    for job in jobs:
        if is_completed_job(job):
            invoice = await create_draft_invoice_for_job(db, business_id, job)
            if invoice:
                created_invoices += 1
        if is_unassigned_job(job):
            scored = [score_worker(w, job, jobs) for w in workers]
            scored.sort(key=lambda x: x["score"], reverse=True)
            best = scored[0] if scored else None
            worker = best.get("worker") if best else None
            name = worker_name(worker)
            action = await create_action(
                db,
                business_id,
                "assign_worker_to_job",
                "dispatch",
                f"Assign {name}",
                f"{safe_text(job.get('title') or job.get('name'), 'Job')} needs crew. Autopilot found the best match.",
                "; ".join((best or {}).get("reasons", []) + (best or {}).get("warnings", [])) or "Autopilot checked worker availability, area, workload and job type.",
                "job",
                record_id(job),
                {
                    "job_id": record_id(job),
                    "worker_id": worker_key(worker or {}),
                    "worker_name": name,
                    "match_score": (best or {}).get("score", 60),
                    "match_reasons": (best or {}).get("reasons", []),
                    "match_warnings": (best or {}).get("warnings", []),
                },
                f"Assign {name} to {safe_text(job.get('title') or job.get('name'), 'this job')}.",
                int((best or {}).get("score", 60)),
            )
            if action:
                prepared_assignments += 1

    for invoice in invoices:
        if invoice_is_overdue(invoice):
            iid = record_id(invoice)
            client = safe_text(invoice.get("customer_name") or invoice.get("client_name"), "there")
            draft = await create_message_draft(
                db,
                business_id,
                "invoices",
                "create_invoice_reminder",
                iid,
                f"Payment reminder for {client}",
                f"Hi {client}, just a friendly reminder that invoice {safe_text(invoice.get('invoice_number') or iid)} is now due. Please let us know if you need anything.",
                "Autopilot found an overdue invoice and prepared a reminder draft.",
            )
            if draft:
                reminder_drafts += 1

    for quote in quotes:
        if quote_needs_followup(quote):
            qid = record_id(quote)
            client = safe_text(quote.get("customer_name") or quote.get("client_name"), "there")
            draft = await create_message_draft(
                db,
                business_id,
                "quotes",
                "create_quote_followup",
                qid,
                f"Quote follow-up for {client}",
                f"Hi {client}, just checking whether you had any questions about the quote. Happy to help.",
                "Autopilot found a sent quote waiting for a customer decision.",
            )
            if draft:
                quote_drafts += 1

    if created_invoices or prepared_assignments or reminder_drafts or quote_drafts:
        await write_event(
            db,
            business_id,
            "AI Autopilot completed background admin",
            f"Created {created_invoices} draft invoice(s), prepared {prepared_assignments} crew approval(s), {reminder_drafts} invoice reminder(s), and {quote_drafts} quote follow-up(s).",
            {
                "created_invoices": created_invoices,
                "prepared_assignments": prepared_assignments,
                "reminder_drafts": reminder_drafts,
                "quote_drafts": quote_drafts,
            },
        )

    return {
        "created_invoices": created_invoices,
        "prepared_assignments": prepared_assignments,
        "reminder_drafts": reminder_drafts,
        "quote_drafts": quote_drafts,
    }


async def run_all_businesses() -> Dict[str, Any]:
    if not MONGO_URL or not DB_NAME:
        raise RuntimeError("MONGO_URL and DB_NAME are required")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    try:
        business_ids = set()
        for collection_name in ("jobs", "invoices", "quotes"):
            values = await getattr(db, collection_name).distinct("business_id")
            business_ids.update(str(v) for v in values if v)

        totals = {"created_invoices": 0, "prepared_assignments": 0, "reminder_drafts": 0, "quote_drafts": 0}
        per_business = {}
        for bid in sorted(business_ids):
            result = await run_for_business(db, bid)
            per_business[bid] = result
            for key in totals:
                totals[key] += result.get(key, 0)
        return {"ok": True, "business_count": len(business_ids), "totals": totals, "per_business": per_business, "ran_at": now_iso()}
    finally:
        client.close()


def main() -> None:
    result = asyncio.run(run_all_businesses())
    print(result)


if __name__ == "__main__":
    main()
