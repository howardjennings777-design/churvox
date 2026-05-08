from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException


DEFAULT_GST_RATE = 15.0


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return now_utc().isoformat()


def safe_text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def safe_float(value: Any, fallback: float = 0.0) -> float:
    try:
        number = float(value or 0)
        if number != number:
            return fallback
        return number
    except Exception:
        return fallback


def serialise_record(record: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not record:
        return {}
    out = dict(record)
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if hasattr(value, "isoformat"):
            out[key] = value.isoformat()
    return out


def business_query(business_id: str, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    query = {"business_id": str(business_id)}
    if extra:
        query.update(extra)
    return query


def is_completed_job(job: Dict[str, Any]) -> bool:
    status = safe_text(job.get("status") or job.get("job_status") or job.get("workflow_status")).lower()
    return status in {"completed", "done"} or bool(job.get("completed") or job.get("completed_at"))


def has_invoice(job: Dict[str, Any]) -> bool:
    return bool(job.get("invoice_id") or job.get("invoice_created") or job.get("linked_invoice_id"))


def invoice_number() -> str:
    return "INV-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S") + "-" + str(uuid4())[:4].upper()


def public_token() -> str:
    return "inv_" + uuid4().hex


def build_description(job: Dict[str, Any], client_name: str) -> str:
    persisted = safe_text(job.get("ai_invoice_description") or job.get("invoice_description_draft"))
    if persisted:
        return persisted
    title = safe_text(job.get("title") or job.get("name") or job.get("job_type") or job.get("service_type"), "Service work")
    address = safe_text(job.get("address") or job.get("job_address") or job.get("service_address"))
    notes = safe_text(job.get("completion_notes") or job.get("worker_completion_notes") or job.get("notes") or job.get("description"))
    location = f" at {address}" if address else ""
    base = f"{title} completed for {client_name or 'the client'}{location}."
    if notes:
        base = f"{base} Work notes: {notes}."
    return f"{base} Prepared by Churvox AI for owner review before sending."


def calculate_invoice_amounts(job: Dict[str, Any]) -> Dict[str, float]:
    fixed_price = safe_float(job.get("price") or job.get("job_price") or job.get("fixed_price") or job.get("subtotal"))
    hourly_rate = safe_float(job.get("hourly_rate"))
    hours_worked = safe_float(job.get("hours_worked") or job.get("total_hours") or job.get("net_hours"))
    extras = job.get("extras") or []
    extras_total = 0.0
    if isinstance(extras, list):
        for item in extras:
            if isinstance(item, dict):
                extras_total += safe_float(item.get("amount") or item.get("price") or item.get("total"))
    subtotal = fixed_price
    if subtotal <= 0 and hourly_rate > 0 and hours_worked > 0:
        subtotal = round(hourly_rate * hours_worked, 2)
    subtotal = round(subtotal + extras_total, 2)
    gst_rate = safe_float(job.get("gst_rate"), DEFAULT_GST_RATE)
    gst_amount = round(subtotal * gst_rate / 100, 2)
    total = round(subtotal + gst_amount, 2)
    return {"subtotal": subtotal, "gst_rate": gst_rate, "gst_amount": gst_amount, "total": total, "hourly_rate": hourly_rate, "hours_worked": hours_worked}


async def find_job(db, business_id: str, job_id: str):
    candidates = [{"id": str(job_id)}, {"job_number": str(job_id)}]
    try:
        from bson import ObjectId
        candidates.append({"_id": ObjectId(str(job_id))})
    except Exception:
        pass
    for extra in candidates:
        found = await db.jobs.find_one(business_query(business_id, extra))
        if found:
            return found
    return None


async def write_event(db, business_id: str, actor_id: str, title: str, message: str, payload: Optional[Dict[str, Any]] = None):
    event = {
        "id": str(uuid4()),
        "business_id": str(business_id),
        "actor_id": actor_id,
        "source": "invoice_automation",
        "title": title,
        "message": message,
        "payload": payload or {},
        "read": False,
        "created_at": now_utc(),
    }
    for collection_name in ["invoice_automation_events", "notifications"]:
        try:
            await getattr(db, collection_name).insert_one(dict(event))
        except Exception:
            pass
    return serialise_record(event)


async def create_draft_invoice_from_job(db, business_id: str, actor_id: str, job: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not is_completed_job(job) or has_invoice(job):
        return None

    job_id = str(job.get("id") or job.get("_id") or job.get("job_number") or "")
    existing = await db.invoices.find_one({
        "business_id": str(business_id),
        "$or": [
            {"source_job_id": job_id},
            {"job_id": job_id},
            {"linked_job_id": job_id},
        ],
    })
    if existing:
        await db.jobs.update_one({"_id": job.get("_id"), "business_id": str(business_id)}, {"$set": {"invoice_created": True, "invoice_id": str(existing.get("id") or existing.get("_id")), "updated_at": now_utc()}})
        return serialise_record(existing)

    client_name = safe_text(job.get("customer_name") or job.get("client_name") or job.get("client"), "Unknown client")
    amounts = calculate_invoice_amounts(job)
    token = public_token()
    invoice = {
        "id": str(uuid4()),
        "business_id": str(business_id),
        "invoice_number": invoice_number(),
        "source": "invoice_automation",
        "source_job_id": job_id,
        "job_id": job_id,
        "linked_job_id": job_id,
        "client_id": job.get("client_id") or job.get("customer_id") or "",
        "customer_name": client_name,
        "customer_email": job.get("customer_email") or job.get("client_email") or "",
        "address": job.get("address") or job.get("job_address") or "",
        "description": build_description(job, client_name),
        "subtotal": amounts["subtotal"],
        "gst_rate": amounts["gst_rate"],
        "gst_amount": amounts["gst_amount"],
        "total": amounts["total"],
        "status": "draft",
        "payment_status": "draft",
        "public_token": token,
        "payment_link": "",
        "public_invoice_url": "",
        "pricing_type": job.get("pricing_type") or job.get("price_type") or "fixed",
        "hourly_rate": amounts["hourly_rate"],
        "hours_worked": amounts["hours_worked"],
        "extras": job.get("extras") or [],
        "notes": "Draft created automatically from a completed job. Owner must review before sending.",
        "ai_generated": True,
        "automation_status": "draft_created",
        "official_invoice_source": "churvox",
        "myob_sync_status": "not_synced",
        "created_by": actor_id,
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "due_date": now_utc() + timedelta(days=7),
    }
    await db.invoices.insert_one(invoice)
    try:
        await db.jobs.update_one(
            {"_id": job.get("_id"), "business_id": str(business_id)},
            {"$set": {
                "invoice_created": True,
                "invoice_id": invoice["id"],
                "linked_invoice_id": invoice["id"],
                "invoice_status": "draft",
                "ai_invoice_description": invoice["description"],
                "updated_at": now_utc(),
            }},
        )
    except Exception:
        pass
    await write_event(db, business_id, actor_id, "Draft invoice created", f"Churvox created a draft invoice for {client_name} from a completed job.", {"invoice_id": invoice["id"], "job_id": job_id})
    return serialise_record(invoice)


async def create_missing_drafts(db, business_id: str, actor_id: str) -> List[Dict[str, Any]]:
    cursor = db.jobs.find(business_query(business_id)).sort("completed_at", -1).limit(120)
    jobs = await cursor.to_list(length=120)
    created: List[Dict[str, Any]] = []
    for job in jobs:
        invoice = await create_draft_invoice_from_job(db, business_id, actor_id, job)
        if invoice:
            created.append(invoice)
    return created


async def mark_overdue_invoices(db, business_id: str, actor_id: str) -> List[Dict[str, Any]]:
    now = now_utc()
    query = {
        "business_id": str(business_id),
        "status": {"$in": ["sent", "unpaid", "pending"]},
        "due_date": {"$lt": now},
    }
    cursor = db.invoices.find(query).limit(100)
    invoices = await cursor.to_list(length=100)
    updated: List[Dict[str, Any]] = []
    for invoice in invoices:
        await db.invoices.update_one({"_id": invoice.get("_id"), "business_id": str(business_id)}, {"$set": {"status": "overdue", "payment_status": "overdue", "updated_at": now}})
        invoice["status"] = "overdue"
        invoice["payment_status"] = "overdue"
        updated.append(serialise_record(invoice))
    if updated:
        await write_event(db, business_id, actor_id, "Invoices marked overdue", f"{len(updated)} invoice(s) were marked overdue automatically.", {"invoice_ids": [x.get("id") for x in updated]})
    return updated


async def prepare_invoice_reminders(db, business_id: str, actor_id: str) -> List[Dict[str, Any]]:
    query = {"business_id": str(business_id), "status": {"$in": ["sent", "unpaid", "pending", "overdue"]}}
    cursor = db.invoices.find(query).sort("due_date", 1).limit(80)
    invoices = await cursor.to_list(length=80)
    drafts: List[Dict[str, Any]] = []
    for invoice in invoices:
        invoice_id = str(invoice.get("id") or invoice.get("_id") or invoice.get("invoice_number") or "")
        existing = await db.ai_prepared_messages.find_one({"business_id": str(business_id), "source": "invoice_automation", "target_record_id": invoice_id, "status": "draft"})
        if existing:
            drafts.append(serialise_record(existing))
            continue
        client = safe_text(invoice.get("customer_name") or invoice.get("client_name"), "there")
        message = {
            "id": str(uuid4()),
            "business_id": str(business_id),
            "source": "invoice_automation",
            "module": "invoices",
            "status": "draft",
            "channel": "email_or_sms",
            "target_record_type": "invoice",
            "target_record_id": invoice_id,
            "customer_name": client,
            "customer_email": invoice.get("customer_email") or "",
            "title": f"Invoice reminder for {client}",
            "message": f"Hi {client}, just a friendly reminder that invoice {invoice.get('invoice_number') or invoice_id} for ${safe_float(invoice.get('total')):.2f} is waiting. Please let us know if you need anything.",
            "created_by": actor_id,
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
        await db.ai_prepared_messages.insert_one(message)
        drafts.append(serialise_record(message))
    if drafts:
        await write_event(db, business_id, actor_id, "Invoice reminders prepared", f"{len(drafts)} invoice reminder draft(s) are ready for owner review.", {"message_ids": [x.get("id") for x in drafts]})
    return drafts


async def collect_invoice_status(db, business_id: str) -> Dict[str, Any]:
    invoices = await db.invoices.find(business_query(business_id)).limit(500).to_list(length=500)
    jobs_without_invoice = []
    completed_jobs = await db.jobs.find(business_query(business_id)).limit(300).to_list(length=300)
    for job in completed_jobs:
        if is_completed_job(job) and not has_invoice(job):
            jobs_without_invoice.append(job)
    outstanding = sum(safe_float(i.get("total")) for i in invoices if safe_text(i.get("status")).lower() in {"sent", "unpaid", "pending", "overdue"})
    return {
        "invoice_count": len(invoices),
        "draft_count": sum(1 for i in invoices if safe_text(i.get("status")).lower() == "draft"),
        "sent_unpaid_count": sum(1 for i in invoices if safe_text(i.get("status")).lower() in {"sent", "unpaid", "pending"}),
        "overdue_count": sum(1 for i in invoices if safe_text(i.get("status")).lower() == "overdue"),
        "paid_count": sum(1 for i in invoices if safe_text(i.get("status")).lower() == "paid"),
        "outstanding": round(outstanding, 2),
        "completed_jobs_missing_invoice": len(jobs_without_invoice),
        "needs_owner_attention": len(jobs_without_invoice) > 0 or outstanding > 0,
    }


def create_invoice_automation_router(db, get_current_user, get_user_business_id):
    router = APIRouter(prefix="/invoices/automation", tags=["Invoice Automation"])

    async def ctx(current_user: dict):
        business_id = await get_user_business_id(current_user)
        actor_id = str(current_user.get("id") or current_user.get("_id") or current_user.get("email") or "")
        return str(business_id), actor_id

    @router.get("/status")
    async def automation_status(current_user: dict = Depends(get_current_user)):
        business_id, _actor_id = await ctx(current_user)
        status = await collect_invoice_status(db, business_id)
        return {"ok": True, "status": status, "checked_at": iso_now()}

    @router.post("/create-drafts")
    async def create_drafts(current_user: dict = Depends(get_current_user)):
        business_id, actor_id = await ctx(current_user)
        created = await create_missing_drafts(db, business_id, actor_id)
        return {"ok": True, "created_count": len(created), "created": created, "message": f"{len(created)} invoice draft(s) created from completed jobs."}

    @router.post("/prepare-reminders")
    async def prepare_reminders(current_user: dict = Depends(get_current_user)):
        business_id, actor_id = await ctx(current_user)
        updated = await mark_overdue_invoices(db, business_id, actor_id)
        drafts = await prepare_invoice_reminders(db, business_id, actor_id)
        return {"ok": True, "overdue_marked": len(updated), "reminder_count": len(drafts), "reminders": drafts, "message": f"Prepared {len(drafts)} invoice reminder draft(s)."}

    @router.post("/run")
    async def run_invoice_automation(current_user: dict = Depends(get_current_user)):
        business_id, actor_id = await ctx(current_user)
        drafts = await create_missing_drafts(db, business_id, actor_id)
        overdue = await mark_overdue_invoices(db, business_id, actor_id)
        reminders = await prepare_invoice_reminders(db, business_id, actor_id)
        status = await collect_invoice_status(db, business_id)
        return {
            "ok": True,
            "message": "Invoice automation complete. Drafts, overdue status and reminder drafts are up to date.",
            "drafts_created": len(drafts),
            "overdue_marked": len(overdue),
            "reminders_prepared": len(reminders),
            "status": status,
            "created": drafts,
            "reminders": reminders,
        }

    @router.post("/{invoice_id}/prepare-reminder")
    async def prepare_single_invoice_reminder(invoice_id: str, current_user: dict = Depends(get_current_user)):
        business_id, actor_id = await ctx(current_user)
        invoice = await db.invoices.find_one(business_query(business_id, {"id": invoice_id}))
        if not invoice:
            try:
                from bson import ObjectId
                invoice = await db.invoices.find_one(business_query(business_id, {"_id": ObjectId(invoice_id)}))
            except Exception:
                invoice = None
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        client = safe_text(invoice.get("customer_name") or invoice.get("client_name"), "there")
        message = {
            "id": str(uuid4()),
            "business_id": str(business_id),
            "source": "invoice_automation",
            "module": "invoices",
            "status": "draft",
            "channel": "email_or_sms",
            "target_record_type": "invoice",
            "target_record_id": str(invoice.get("id") or invoice_id),
            "customer_name": client,
            "customer_email": invoice.get("customer_email") or "",
            "title": f"Invoice reminder for {client}",
            "message": f"Hi {client}, just a friendly reminder that invoice {invoice.get('invoice_number') or invoice_id} for ${safe_float(invoice.get('total')):.2f} is waiting. Please let us know if you need anything.",
            "created_by": actor_id,
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
        await db.ai_prepared_messages.insert_one(message)
        await write_event(db, business_id, actor_id, "Invoice reminder prepared", f"Reminder prepared for invoice {invoice.get('invoice_number') or invoice_id}.", {"message_id": message["id"], "invoice_id": invoice_id})
        return {"ok": True, "message": "Invoice reminder draft prepared.", "reminder": serialise_record(message)}

    return router
