from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ai_service import ai_configured, generate_ai_text
from bson import ObjectId


class AIAskRequest(BaseModel):
    question: str


class AIMessageDraftRequest(BaseModel):
    message_type: str = "general"
    tone: str = "professional, friendly and short"
    context: dict = {}


class AIDraftCreateRequest(BaseModel):
    type: str
    source_record_id: str | None = None
    source_record_type: str | None = None
    custom_prompt: str | None = None


AI_ROLES = {"owner", "admin", "employer", "manager", "office_admin"}
AI_FULL_ROLES = {"owner", "admin", "employer", "manager"}
AI_DRAFT_TYPES = {
    "quote_follow_up",
    "invoice_reminder",
    "job_reminder",
    "job_completion_summary",
    "customer_update",
    "worker_instruction",
    "quote_wording",
    "invoice_wording",
}
AI_DRAFT_BLOCKED_ROLES = {"worker", "payroll"}


def _role(user):
    raw = str((user or {}).get("role") or "").strip().lower().replace("-", "_").replace(" ", "_")
    if raw in {"admin", "employer"}:
        return "owner"
    if raw in {"officeadmin", "office_admin"}:
        return "office_admin"
    return raw or "worker"


def _status(doc):
    return str((doc or {}).get("status") or (doc or {}).get("job_status") or "").strip().lower().replace(" ", "_")


def _dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def _oid(value):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def _now():
    return datetime.now(timezone.utc)


async def _list(db, collection, business_id, limit=300):
    try:
        query = {"$or": [{"business_id": str(business_id)}, {"owner_id": str(business_id)}]}
        return await db[collection].find(query).to_list(length=limit)
    except Exception:
        return []


async def _snapshot(server, business_id):
    db = server.db
    jobs = await _list(db, "jobs", business_id, 500)
    quotes = await _list(db, "quotes", business_id, 500)
    invoices = await _list(db, "invoices", business_id, 500)
    clients = await _list(db, "clients", business_id, 500)
    timesheets = await _list(db, "timesheets", business_id, 300)
    runs = await _list(db, "automation_runs", business_id, 300)
    today = datetime.now(timezone.utc).date().isoformat()
    now = datetime.now(timezone.utc)
    closed = {"completed", "complete", "done", "cancelled", "canceled"}
    jobs_today = [j for j in jobs if (_dt(j.get("scheduled_date") or j.get("date")) and _dt(j.get("scheduled_date") or j.get("date")).date().isoformat() == today)]
    overdue_jobs = [j for j in jobs if (_dt(j.get("scheduled_date") or j.get("date")) and _dt(j.get("scheduled_date") or j.get("date")) < now and _status(j) not in closed)]
    unassigned = [j for j in jobs if not (j.get("assigned_worker_id") or j.get("worker_id")) and _status(j) not in closed]
    pending_quotes = [q for q in quotes if _status(q) in {"draft", "sent", "pending", ""}]
    unpaid = [i for i in invoices if _status(i) in {"draft", "sent", "overdue", "unpaid", "pending", ""}]
    overdue_inv = [i for i in invoices if _status(i) == "overdue"]
    completed_job_ids = {str(j.get("_id") or j.get("id")) for j in jobs if _status(j) in {"completed", "complete", "done"} or j.get("completed") is True}
    invoice_job_ids = {str(i.get("job_id")) for i in invoices if i.get("job_id")}
    completed_no_invoice = [j for j in jobs if str(j.get("_id") or j.get("id")) in (completed_job_ids - invoice_job_ids)]
    missing_contact = [c for c in clients if not (c.get("phone") or c.get("mobile") or c.get("email"))]
    payroll = [t for t in timesheets if _status(t) in {"pending", "needs_review", "draft", ""}]
    failed_auto = [r for r in runs if _status(r) in {"failed", "error"}]
    counts = {
        "jobs_today": len(jobs_today),
        "jobs_overdue": len(overdue_jobs),
        "jobs_in_progress": len([j for j in jobs if _status(j) in {"in_progress", "started"}]),
        "jobs_completed": len(completed_job_ids),
        "unassigned_jobs": len(unassigned),
        "pending_quotes": len(pending_quotes),
        "unpaid_invoices": len(unpaid),
        "overdue_invoices": len(overdue_inv),
        "completed_jobs_without_invoice": len(completed_no_invoice),
        "clients_missing_contact": len(missing_contact),
        "payroll_warnings": len(payroll),
        "automation_failures": len(failed_auto),
    }
    counts["alerts_total"] = counts["jobs_overdue"] + counts["unassigned_jobs"] + counts["overdue_invoices"] + counts["completed_jobs_without_invoice"] + counts["clients_missing_contact"] + counts["payroll_warnings"] + counts["automation_failures"]
    return {"counts": counts, "overdue_invoices": overdue_inv, "pending_quotes": pending_quotes, "overdue_jobs": overdue_jobs, "unassigned_jobs": unassigned, "completed_no_invoice": completed_no_invoice}


async def _draft_source_context(server, business_id: str, source_record_id: str | None, source_record_type: str | None) -> tuple[str, dict | None]:
    if not source_record_id:
        return ("No related record selected.", None)

    source_type = str(source_record_type or "").strip().lower()
    if not source_type:
        return ("Related record provided without a source type.", None)

    collection_name_map = {
        "quote": "quotes",
        "quotes": "quotes",
        "invoice": "invoices",
        "invoices": "invoices",
        "job": "jobs",
        "jobs": "jobs",
        "client": "clients",
        "clients": "clients",
    }
    collection_name = collection_name_map.get(source_type)
    if not collection_name:
        return (f"Unsupported source record type: {source_type}.", None)

    collection = server.db[collection_name]
    query = {"business_id": str(business_id)}
    oid = _oid(source_record_id)
    if oid:
        query["_id"] = oid
    else:
        query["id"] = str(source_record_id)
    record = await collection.find_one(query)

    if not record and oid:
        record = await collection.find_one({"business_id": str(business_id), "id": str(source_record_id)})
    if not record:
        return ("Related record not found for this business.", None)

    summary_fields = {
        "title": record.get("title") or record.get("quote_number") or record.get("invoice_number") or record.get("name") or "",
        "status": record.get("status") or record.get("job_status") or "",
        "client": record.get("customer_name") or record.get("client_name") or record.get("name") or "",
        "amount": record.get("total") or record.get("price") or record.get("amount_due") or record.get("balance_due") or "",
        "due": record.get("due_date") or record.get("scheduled_date") or "",
    }
    context_summary = f"{source_type.capitalize()} context: title={summary_fields['title'] or 'n/a'}, status={summary_fields['status'] or 'n/a'}, customer={summary_fields['client'] or 'n/a'}, amount={summary_fields['amount'] or 'n/a'}, due={summary_fields['due'] or 'n/a'}."
    return (context_summary, record)


def _draft_fallback(draft_type: str, context_summary: str) -> tuple[str, str]:
    fallback_map = {
        "quote_follow_up": ("Quote follow-up draft", "Hi there, just checking in on your quote. Let me know if you'd like any updates or if you'd like to proceed."),
        "invoice_reminder": ("Invoice reminder draft", "Hi there, a quick reminder that your invoice is currently outstanding. Please let us know if you need a copy or payment details."),
        "job_reminder": ("Job reminder draft", "Hi there, this is a reminder for your upcoming job. Please confirm site access details and preferred arrival window."),
        "job_completion_summary": ("Job completion summary draft", "Job complete summary: work has been finished, site left tidy, and key outcomes documented for your records."),
        "customer_update": ("Customer update draft", "Hi there, here is a quick update on your work request. We are on track and will keep you informed of the next step."),
        "worker_instruction": ("Worker instruction draft", "Team update: please review job notes, confirm materials, and follow site safety requirements before starting."),
        "quote_wording": ("Quote wording draft", "This quote includes the agreed scope of work, exclusions, and pricing breakdown. Please review and let us know any adjustments."),
        "invoice_wording": ("Invoice wording draft", "Invoice wording draft: thank you for your business. Please refer to this invoice for completed work and payment details."),
    }
    title, text = fallback_map.get(draft_type, ("Business draft", "Draft ready for review."))
    return title, f"{text}\n\nContext:\n{context_summary}"


def _brief(snapshot):
    c = snapshot["counts"]
    if c["alerts_total"] == 0:
        return "Everything looks calm right now. No urgent jobs, invoices, quotes, payroll items or automation alerts were detected."
    return f"Today you have {c['jobs_today']} job(s), {c['unassigned_jobs']} unassigned job(s), {c['pending_quotes']} quote(s) waiting, {c['unpaid_invoices']} unpaid invoice(s), and {c['overdue_invoices']} overdue invoice(s)."


def install_ai_router(app, server=None):
    # Existing backend boot loader calls install_ai_router(server_module).
    # Direct callers can still pass install_ai_router(app, server_module).
    if server is None:
        server = app
        app = getattr(server, "app", None)
        if app is None:
            raise RuntimeError("server.app missing")
    if getattr(app.state, "churvox_ai_router_installed", False):
        return
    router = APIRouter(prefix="/api")

    async def require_ai_user(current_user: dict = Depends(server.get_current_user)):
        if _role(current_user) not in AI_ROLES:
            raise HTTPException(status_code=403, detail="AI Assistant is not available for this role")
        return current_user

    async def require_ai_draft_user(current_user: dict = Depends(server.get_current_user)):
        user_role = _role(current_user)
        if user_role in AI_DRAFT_BLOCKED_ROLES:
            raise HTTPException(status_code=403, detail="AI drafts are not available for this role")
        if user_role not in AI_ROLES:
            raise HTTPException(status_code=403, detail="AI drafts are only available to owners/admins")
        return current_user

    async def require_full_user(current_user: dict = Depends(server.get_current_user)):
        if _role(current_user) not in AI_FULL_ROLES:
            raise HTTPException(status_code=403, detail="This AI insight is only available to owners and managers")
        return current_user

    async def bid(user):
        return await server.get_user_business_id(user)

    @router.get("/ai/brief")
    async def brief(current_user: dict = Depends(require_ai_user)):
        snap = await _snapshot(server, await bid(current_user))
        fallback = _brief(snap)
        ai = generate_ai_text("You are Churvox AI Assistant. Be concise, practical, and approval-first.", str(snap["counts"]), fallback, 220)
        return {"configured": bool(ai.get("configured")), "used_ai": bool(ai.get("used_ai")), "brief": ai.get("text") or fallback, "counts": snap["counts"], "message": ai.get("message"), "error_type": ai.get("error_type"), "model": ai.get("model")}

    @router.get("/ai/urgent-actions")
    async def urgent(current_user: dict = Depends(require_ai_user)):
        snap = await _snapshot(server, await bid(current_user))
        actions = []
        c = snap["counts"]
        if c["overdue_invoices"]:
            actions.append({"title": "Overdue invoices need chasing", "description": f"{c['overdue_invoices']} invoice(s) are overdue.", "route": "/invoices", "type": "overdue_invoices", "priority": "high", "cta": "Draft follow-up"})
        if c["unassigned_jobs"]:
            actions.append({"title": "Jobs need assigning", "description": f"{c['unassigned_jobs']} job(s) need a worker assigned.", "route": "/jobs", "type": "unassigned_jobs", "priority": "high", "cta": "Assign worker"})
        if c["pending_quotes"]:
            actions.append({"title": "Quotes need follow-up", "description": f"{c['pending_quotes']} quote(s) are waiting.", "route": "/quotes", "type": "pending_quotes", "priority": "medium", "cta": "Draft follow-up"})
        if c["completed_jobs_without_invoice"]:
            actions.append({"title": "Completed jobs need invoices", "description": f"{c['completed_jobs_without_invoice']} completed job(s) appear to have no linked invoice.", "route": "/jobs", "type": "completed_no_invoice", "priority": "high", "cta": "Create invoice"})
        return {"configured": ai_configured(), "actions": actions, "counts": c}

    @router.get("/ai/automation-suggestions")
    async def suggestions(current_user: dict = Depends(require_full_user)):
        snap = await _snapshot(server, await bid(current_user))
        c = snap["counts"]
        items = []
        if c["completed_jobs_without_invoice"]:
            items.append({"title": "Auto-draft invoices after completed jobs", "description": "Create a draft invoice task whenever a job is completed.", "route": "/automation", "type": "completed_job_to_invoice"})
        if c["overdue_invoices"]:
            items.append({"title": "Create overdue invoice reminders", "description": "Create a reminder task or draft message when an invoice becomes overdue.", "route": "/automation", "type": "invoice_reminder"})
        if c["pending_quotes"]:
            items.append({"title": "Create quote follow-up automation", "description": "Create a follow-up task when quotes sit too long.", "route": "/automation", "type": "quote_follow_up"})
        if not items:
            items.append({"title": "Start with daily business brief", "description": "Use AI Assistant each morning to check jobs, invoices, quotes and admin risks.", "route": "/ai-assistant", "type": "starter"})
        return {"configured": ai_configured(), "suggestions": items}

    @router.post("/ai/message-draft")
    async def draft(payload: AIMessageDraftRequest, current_user: dict = Depends(require_ai_user)):
        customer = (payload.context or {}).get("customer_name") or (payload.context or {}).get("client_name") or "there"
        kind = str(payload.message_type or "general").lower()
        fallbacks = {
            "quote_follow_up": f"Hi {customer}, just checking in to see if you had any questions about the quote we sent through. Happy to help if needed. Thanks.",
            "invoice_reminder": f"Hi {customer}, just a friendly reminder that your invoice is still outstanding. When you get a chance, please arrange payment. Thanks again.",
            "job_reminder": f"Hi {customer}, this is a quick reminder about your upcoming job. Please let us know if anything has changed before we arrive. Thanks.",
            "thank_you": f"Hi {customer}, thanks for choosing us. The job has now been completed, and we really appreciate your business.",
        }
        fallback = fallbacks.get(kind, f"Hi {customer}, just following up with you from Churvox. Thanks.")
        ai = generate_ai_text("Write a short, friendly customer message. Return only the draft. Do not change pricing or payment terms.", str(payload.context or {}), fallback, 220)
        return {"configured": bool(ai.get("configured")), "used_ai": bool(ai.get("used_ai")), "draft": ai.get("text") or fallback, "message": ai.get("message"), "error_type": ai.get("error_type"), "model": ai.get("model")}

    @router.post("/ai/ask")
    async def ask(payload: AIAskRequest, current_user: dict = Depends(require_ai_user)):
        snap = await _snapshot(server, await bid(current_user))
        fallback = _brief(snap)
        q = str(payload.question or "").lower()
        if "owe" in q or "unpaid" in q or "money" in q:
            fallback = f"You have {snap['counts']['unpaid_invoices']} unpaid invoice(s), including {snap['counts']['overdue_invoices']} overdue invoice(s)."
        elif "quote" in q:
            fallback = f"You have {snap['counts']['pending_quotes']} quote(s) waiting for follow-up."
        elif "job" in q:
            fallback = f"You have {snap['counts']['jobs_today']} job(s) today, {snap['counts']['unassigned_jobs']} unassigned job(s), and {snap['counts']['jobs_overdue']} overdue job(s)."
        ai = generate_ai_text("Answer using only this Churvox business snapshot. Be concise and do not make legal, tax, payroll or pricing decisions.", str({"question": payload.question, "counts": snap["counts"]}), fallback, 350)
        return {"configured": bool(ai.get("configured")), "used_ai": bool(ai.get("used_ai")), "answer": ai.get("text") or fallback, "message": ai.get("message"), "error_type": ai.get("error_type"), "model": ai.get("model")}

    @router.get("/ai/drafts")
    async def list_ai_drafts(current_user: dict = Depends(require_ai_draft_user)):
        business_id = await bid(current_user)
        drafts = await server.db.ai_drafts.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(100).to_list(length=100)
        for draft in drafts:
            draft["id"] = str(draft.get("_id"))
            draft.pop("_id", None)
        return {"drafts": drafts}

    @router.post("/ai/drafts/create")
    async def create_ai_draft(payload: AIDraftCreateRequest, current_user: dict = Depends(require_ai_draft_user)):
        business_id = await bid(current_user)
        draft_type = str(payload.type or "").strip().lower()
        if draft_type not in AI_DRAFT_TYPES:
            raise HTTPException(status_code=400, detail="Unsupported draft type")

        context_summary, source_data = await _draft_source_context(
            server, str(business_id), payload.source_record_id, payload.source_record_type
        )
        fallback_title, fallback_text = _draft_fallback(draft_type, context_summary)
        prompt_context = {
            "type": draft_type,
            "context_summary": context_summary,
            "source_record_type": payload.source_record_type,
            "custom_prompt": payload.custom_prompt or "",
            "source_data": source_data or {},
            "rules": [
                "Draft and summarize only.",
                "Never send messages or emails automatically.",
                "Never change quotes, invoices, payroll, MYOB, pricing, or job status.",
            ],
        }
        ai = generate_ai_text(
            "You are Churvox AI Draft Centre. Generate a concise business draft only. Approval-first. No actions.",
            str(prompt_context),
            fallback_text,
            320,
        )
        now = _now()
        doc = {
            "business_id": str(business_id),
            "type": draft_type,
            "title": fallback_title,
            "context_summary": context_summary,
            "draft_text": ai.get("text") or fallback_text,
            "source_record_id": payload.source_record_id,
            "source_record_type": payload.source_record_type,
            "status": "draft",
            "created_at": now,
            "updated_at": now,
            "created_by": str(current_user.get("id") or current_user.get("_id") or ""),
            "used_at": None,
            "dismissed_at": None,
        }
        result = await server.db.ai_drafts.insert_one(doc)
        await server.db.ai_draft_events.insert_one({
            "business_id": str(business_id),
            "draft_id": str(result.inserted_id),
            "event": "created",
            "created_at": now,
            "created_by": doc["created_by"],
        })
        doc["id"] = str(result.inserted_id)
        return {"draft": doc, "used_ai": bool(ai.get("used_ai")), "configured": bool(ai.get("configured")), "model": ai.get("model", "gpt-4o-mini")}

    @router.post("/ai/drafts/{draft_id}/mark-used")
    async def mark_ai_draft_used(draft_id: str, current_user: dict = Depends(require_ai_draft_user)):
        business_id = await bid(current_user)
        oid = _oid(draft_id)
        if not oid:
            raise HTTPException(status_code=400, detail="Invalid draft id")
        now = _now()
        result = await server.db.ai_drafts.update_one(
            {"_id": oid, "business_id": str(business_id)},
            {"$set": {"status": "used", "used_at": now, "updated_at": now}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Draft not found")
        await server.db.ai_draft_events.insert_one({
            "business_id": str(business_id),
            "draft_id": str(draft_id),
            "event": "used",
            "created_at": now,
            "created_by": str(current_user.get("id") or current_user.get("_id") or ""),
        })
        return {"ok": True}

    @router.post("/ai/drafts/{draft_id}/dismiss")
    async def dismiss_ai_draft(draft_id: str, current_user: dict = Depends(require_ai_draft_user)):
        business_id = await bid(current_user)
        oid = _oid(draft_id)
        if not oid:
            raise HTTPException(status_code=400, detail="Invalid draft id")
        now = _now()
        result = await server.db.ai_drafts.update_one(
            {"_id": oid, "business_id": str(business_id)},
            {"$set": {"status": "dismissed", "dismissed_at": now, "updated_at": now}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Draft not found")
        await server.db.ai_draft_events.insert_one({
            "business_id": str(business_id),
            "draft_id": str(draft_id),
            "event": "dismissed",
            "created_at": now,
            "created_by": str(current_user.get("id") or current_user.get("_id") or ""),
        })
        return {"ok": True}

    @router.delete("/ai/drafts/{draft_id}")
    async def delete_ai_draft(draft_id: str, current_user: dict = Depends(require_ai_draft_user)):
        business_id = await bid(current_user)
        oid = _oid(draft_id)
        if not oid:
            raise HTTPException(status_code=400, detail="Invalid draft id")
        result = await server.db.ai_drafts.delete_one({"_id": oid, "business_id": str(business_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Draft not found")
        now = _now()
        await server.db.ai_draft_events.insert_one({
            "business_id": str(business_id),
            "draft_id": str(draft_id),
            "event": "deleted",
            "created_at": now,
            "created_by": str(current_user.get("id") or current_user.get("_id") or ""),
        })
        return {"ok": True}

    app.include_router(router)
    app.state.churvox_ai_router_installed = True
