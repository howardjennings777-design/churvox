from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

from bson import ObjectId


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def safe_text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def serialise(record: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not record:
        return {}
    out = dict(record)
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if isinstance(value, ObjectId):
            out[key] = str(value)
        elif hasattr(value, "isoformat"):
            out[key] = value.isoformat()
    return out


def parse_due_time(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        if isinstance(value, datetime):
            dt = value
        else:
            dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


async def write_event(db, business_id: str, action: Dict[str, Any], message: str, payload: Optional[Dict[str, Any]] = None) -> None:
    event = {
        "id": str(uuid4()),
        "business_id": str(business_id),
        "source": "ai_scheduled_deploy",
        "action_id": action.get("id"),
        "action_type": action.get("action_type"),
        "module": action.get("module"),
        "title": action.get("title"),
        "message": message,
        "payload": payload or {},
        "read": False,
        "created_at": now_utc(),
    }
    for collection_name in ("ai_operator_events", "notifications"):
        try:
            await getattr(db, collection_name).insert_one(dict(event))
        except Exception:
            pass


async def send_deploy_warning_if_due(db, action: Dict[str, Any], due: datetime, current_time: datetime) -> bool:
    business_id = safe_text(action.get("business_id"))
    action_id = safe_text(action.get("id"))
    if not business_id or not action_id or action.get("deploy_warning_sent_at"):
        return False

    warning_window = timedelta(minutes=int(action.get("deploy_warning_minutes") or 60))
    time_until_due = due - current_time
    if time_until_due <= timedelta(0) or time_until_due > warning_window:
        return False

    deploy_label = action.get("deploy_window_label") or "7:00pm weeknight deploy"
    message = f"AI deploy warning: {safe_text(action.get('title'), 'an AI action')} is scheduled to deploy at {due.isoformat()}. You have about 1 hour to edit, reject, or reschedule it."
    await write_event(
        db,
        business_id,
        action,
        message,
        {
            "warning_type": "one_hour_before_deploy",
            "scheduled_for": due.isoformat(),
            "deploy_window_label": deploy_label,
            "action_id": action_id,
        },
    )
    await db.ai_operator_actions.update_one(
        {"business_id": business_id, "id": action_id},
        {"$set": {"deploy_warning_sent_at": now_iso(), "updated_at": now_iso()}},
    )
    return True


async def find_record(db, collection_name: str, business_id: str, record_id: str) -> Optional[Dict[str, Any]]:
    if not record_id:
        return None
    candidates = [
        {"id": str(record_id)},
        {"job_number": str(record_id)},
        {"invoice_number": str(record_id)},
        {"quote_number": str(record_id)},
    ]
    try:
        candidates.append({"_id": ObjectId(str(record_id))})
    except Exception:
        pass
    collection = getattr(db, collection_name)
    for extra in candidates:
        try:
            found = await collection.find_one({"business_id": str(business_id), **extra})
            if found:
                return found
        except Exception:
            continue
    return None


async def execute_assign_worker(db, business_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
    payload = action.get("suggested_payload") or {}
    job_id = safe_text(payload.get("job_id") or action.get("target_record_id"))
    worker_id = safe_text(payload.get("worker_id"))
    worker_name = safe_text(payload.get("worker_name"), "assigned worker")
    if not job_id or not worker_id:
        return {"executed": False, "message": "Missing job or worker for scheduled assignment."}

    job = await find_record(db, "jobs", business_id, job_id)
    if not job:
        return {"executed": False, "message": "Scheduled assignment job not found.", "job_id": job_id}

    update = {
        "assigned_worker_id": worker_id,
        "assigned_worker_name": worker_name,
        "worker_id": worker_id,
        "status": "assigned",
        "job_status": "assigned",
        "workflow_status": "assigned",
        "ai_assigned": True,
        "ai_assignment_reason": action.get("reason") or "Scheduled AI approval deployed.",
        "updated_at": now_utc(),
    }
    await db.jobs.update_one({"_id": job.get("_id"), "business_id": str(business_id)}, {"$set": update})
    await write_event(db, business_id, action, f"Scheduled AI deploy assigned {worker_name} to {safe_text(job.get('title') or job.get('name'), 'job')}.", {"job_id": job_id, "worker_id": worker_id})
    return {"executed": True, "message": "Scheduled worker assignment deployed.", "job_id": job_id, "worker_id": worker_id}


async def execute_invoice_draft(db, business_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
    payload = action.get("suggested_payload") or {}
    job_id = safe_text(payload.get("source_job_id") or payload.get("job_id") or action.get("target_record_id"))
    if not job_id:
        return {"executed": False, "message": "Missing source job for scheduled invoice draft."}
    job = await find_record(db, "jobs", business_id, job_id)
    if not job:
        return {"executed": False, "message": "Scheduled invoice source job not found.", "job_id": job_id}

    existing = await db.invoices.find_one({"business_id": str(business_id), "$or": [{"source_job_id": str(job_id)}, {"job_id": str(job_id)}, {"linked_job_id": str(job_id)}]})
    if existing:
        return {"executed": True, "message": "Invoice already exists for this job.", "invoice": serialise(existing)}

    subtotal = float(job.get("price") or job.get("job_price") or job.get("fixed_price") or job.get("subtotal") or 0)
    hourly_rate = float(job.get("hourly_rate") or 0)
    hours_worked = float(job.get("hours_worked") or job.get("total_hours") or 0)
    if subtotal <= 0 and hourly_rate > 0 and hours_worked > 0:
        subtotal = round(hourly_rate * hours_worked, 2)
    gst_rate = float(job.get("gst_rate") or 15)
    gst_amount = round(subtotal * gst_rate / 100, 2)
    total = round(subtotal + gst_amount, 2)
    client = safe_text(job.get("customer_name") or job.get("client_name") or payload.get("customer_name"), "Unknown client")

    invoice = {
        "id": str(uuid4()),
        "invoice_number": f"INV-{now_utc().strftime('%Y%m%d')}-{str(uuid4())[:5]}",
        "business_id": str(business_id),
        "source": "ai_scheduled_deploy",
        "source_job_id": str(job_id),
        "job_id": str(job_id),
        "linked_job_id": str(job_id),
        "client_id": job.get("client_id") or job.get("customer_id") or "",
        "customer_name": client,
        "customer_email": safe_text(job.get("customer_email") or job.get("client_email")),
        "address": job.get("address") or job.get("job_address") or "",
        "description": safe_text(action.get("preview_text") or job.get("ai_invoice_description") or job.get("invoice_description_draft"), f"Service work completed for {client}."),
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "total": total,
        "status": "draft",
        "pricing_type": job.get("pricing_type") or job.get("price_type") or "fixed",
        "hourly_rate": hourly_rate,
        "hours_worked": hours_worked,
        "notes": "Draft created by scheduled Churvox AI approval. Review before sending.",
        "ai_generated": True,
        "scheduled_ai_deploy": True,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.invoices.insert_one(invoice)
    await db.jobs.update_one({"_id": job.get("_id"), "business_id": str(business_id)}, {"$set": {"invoice_created": True, "invoice_id": invoice["id"], "updated_at": now_utc()}})
    await write_event(db, business_id, action, f"Scheduled AI deploy created draft invoice for {client}.", {"job_id": job_id, "invoice_id": invoice["id"]})
    return {"executed": True, "message": "Scheduled invoice draft deployed.", "invoice": serialise(invoice)}


async def execute_message_draft(db, business_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
    message = {
        "id": str(uuid4()),
        "business_id": str(business_id),
        "source": "ai_scheduled_deploy",
        "status": "draft",
        "module": action.get("module"),
        "action_type": action.get("action_type"),
        "target_record_type": action.get("target_record_type"),
        "target_record_id": action.get("target_record_id"),
        "title": action.get("title"),
        "message": action.get("preview_text") or action.get("summary") or "AI prepared message.",
        "reason": action.get("reason"),
        "scheduled_ai_deploy": True,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.ai_prepared_messages.insert_one(message)
    await write_event(db, business_id, action, "Scheduled AI deploy prepared a message draft.", {"message_id": message["id"]})
    return {"executed": True, "message": "Scheduled message draft deployed.", "prepared_message": serialise(message)}


async def execute_scheduled_action(db, action: Dict[str, Any]) -> Dict[str, Any]:
    business_id = safe_text(action.get("business_id"))
    action_type = safe_text(action.get("action_type"))
    if not business_id:
        return {"executed": False, "message": "Missing business id."}
    if action_type == "assign_worker_to_job":
        return await execute_assign_worker(db, business_id, action)
    if action_type == "create_invoice_draft":
        return await execute_invoice_draft(db, business_id, action)
    if action_type in {"create_quote_followup", "create_invoice_reminder", "prepare_customer_message", "create_client_followup"}:
        return await execute_message_draft(db, business_id, action)
    await write_event(db, business_id, action, "Scheduled AI action moved to history for manual workflow.", {})
    return {"executed": True, "message": "Scheduled action moved to history for manual workflow."}


async def run_due_scheduled_ai_actions(db, limit: int = 50) -> Dict[str, int]:
    now = now_utc()
    rows = await db.ai_operator_actions.find({"status": "scheduled"}).limit(limit).to_list(length=limit)
    checked = 0
    deployed = 0
    failed = 0
    skipped = 0
    warnings_sent = 0

    for action in rows:
        checked += 1
        action = serialise(action)
        action_id = safe_text(action.get("id"))
        business_id = safe_text(action.get("business_id"))
        due = parse_due_time(action.get("scheduled_for"))
        if not due:
            skipped += 1
            continue

        if due > now:
            warned = await send_deploy_warning_if_due(db, action, due, now)
            if warned:
                warnings_sent += 1
            skipped += 1
            continue

        try:
            result = await execute_scheduled_action(db, action)
            if result.get("executed"):
                deployed += 1
                await db.ai_operator_actions.update_one(
                    {"business_id": business_id, "id": action_id},
                    {"$set": {"status": "completed", "executed_at": now_iso(), "execution_result": result, "updated_at": now_iso()}},
                )
            else:
                failed += 1
                await db.ai_operator_actions.update_one(
                    {"business_id": business_id, "id": action_id},
                    {"$set": {"status": "failed", "failure_reason": result.get("message", "Scheduled deploy failed."), "execution_result": result, "updated_at": now_iso()}},
                )
        except Exception as exc:
            failed += 1
            await db.ai_operator_actions.update_one(
                {"business_id": business_id, "id": action_id},
                {"$set": {"status": "failed", "failure_reason": str(exc), "updated_at": now_iso()}},
            )

    return {
        "scheduled_checked": checked,
        "scheduled_deployed": deployed,
        "scheduled_failed": failed,
        "scheduled_skipped": skipped,
        "scheduled_warning_notifications": warnings_sent,
    }
