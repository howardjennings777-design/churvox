from datetime import datetime, timezone, timedelta
import secrets
from bson import ObjectId
from fastapi import Body, Depends, HTTPException

OWNER_COMMAND_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"}
ACTIVE_JOB_STATUSES = {"assigned", "acknowledged", "in_progress", "paused", "scheduled", "open"}


def _now():
    return datetime.now(timezone.utc)


def _rid(value):
    return str(value or "").strip()


def _record_query(record_id, business_id):
    clauses = [{"id": _rid(record_id)}]
    try:
        if ObjectId.is_valid(_rid(record_id)):
            clauses.append({"_id": ObjectId(_rid(record_id))})
    except Exception:
        pass
    return {"business_id": str(business_id), "$or": clauses}


def _num(value):
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def _norm(value):
    return str(value or "").lower().strip()


def _safe_name(doc):
    if not isinstance(doc, dict):
        return ""
    return str(doc.get("name") or doc.get("business_name") or doc.get("company_name") or doc.get("customer_name") or doc.get("email") or "").strip()


def _safe_doc(doc):
    if not isinstance(doc, dict):
        return doc
    out = dict(doc)
    if "_id" in out:
        out["id"] = str(out.get("_id"))
        out.pop("_id", None)
    for key, value in list(out.items()):
        if isinstance(value, ObjectId):
            out[key] = str(value)
        elif hasattr(value, "isoformat"):
            try:
                out[key] = value.isoformat()
            except Exception:
                out[key] = str(value)
    return out


def _safe_docs(items):
    return [_safe_doc(x) for x in (items or [])]


def _job_title(job):
    return str(job.get("title") or job.get("name") or job.get("service_type") or job.get("job_type") or "Job").strip()


def _job_status(job):
    return _norm(job.get("status") or job.get("job_status") or job.get("workflow_status") or "open")


def _job_is_completed(job):
    return _job_status(job) in {"completed", "complete"} or job.get("completed") is True or bool(job.get("completed_at"))


def _worker_id(worker):
    return str(worker.get("_id") or worker.get("id") or worker.get("user_id") or "")


def _worker_region(worker):
    return _norm(worker.get("region") or worker.get("area") or worker.get("suburb") or worker.get("service_area"))


def _job_region(job):
    return _norm(job.get("region") or job.get("area") or job.get("suburb") or job.get("service_area"))


async def _find_client_for_job(db, job, business_id):
    client_id = job.get("client_id") or job.get("clientId") or job.get("customer_id")
    if client_id:
        client = await db.clients.find_one(_record_query(client_id, business_id))
        if client:
            return client
    name = job.get("client_name") or job.get("customer_name")
    if name:
        return await db.clients.find_one({"business_id": str(business_id), "$or": [{"name": name}, {"business_name": name}, {"company_name": name}]})
    return None


async def _find_worker(db, worker_id, business_id):
    if not worker_id:
        return None
    worker = await db.workers.find_one(_record_query(worker_id, business_id))
    if worker:
        return worker
    return await db.users.find_one(_record_query(worker_id, business_id))


async def _workers_for_business(db, business_id):
    query = {"business_id": str(business_id), "role": {"$in": ["worker", "employee", "field_worker"]}}
    workers = await db.workers.find(query).limit(200).to_list(length=200)
    if workers:
        return workers
    return await db.users.find(query).limit(200).to_list(length=200)


async def _active_jobs_for_business(db, business_id):
    jobs = await db.jobs.find({"business_id": str(business_id)}).limit(1000).to_list(length=1000)
    return [j for j in jobs if _job_status(j) in ACTIVE_JOB_STATUSES and not _job_is_completed(j)]


async def _recommended_worker_for_job(db, job, business_id):
    workers = await _workers_for_business(db, business_id)
    if not workers:
        return None, "No workers found for this business."
    active_jobs = await _active_jobs_for_business(db, business_id)
    job_type = _norm(job.get("job_type") or job.get("service_type") or job.get("title"))
    target_region = _job_region(job)
    scored = []
    for worker in workers:
        wid = _worker_id(worker)
        if not wid:
            continue
        workload = sum(1 for j in active_jobs if str(j.get("assigned_worker_id") or j.get("worker_id") or "") == wid)
        score = 100 - (workload * 12)
        reasons = []
        if workload == 0:
            score += 15
            reasons.append("no active jobs loaded")
        else:
            reasons.append(f"{workload} active job(s) loaded")
        if target_region and _worker_region(worker) and target_region == _worker_region(worker):
            score += 18
            reasons.append("same area/region")
        skills = " ".join(str(x) for x in (worker.get("skills") or worker.get("job_types") or worker.get("experience") or []))
        if job_type and job_type in _norm(skills):
            score += 20
            reasons.append("matches job type/skills")
        if worker.get("active") is False or _norm(worker.get("status")) in {"inactive", "disabled"}:
            score -= 100
            reasons.append("inactive")
        scored.append((score, worker, reasons))
    scored.sort(key=lambda row: row[0], reverse=True)
    if not scored or scored[0][0] <= 0:
        return None, "No safe active worker recommendation found."
    worker = scored[0][1]
    reason = ", ".join(scored[0][2]) or "best available worker from loaded business data"
    return worker, reason


async def _first_available_worker(db, business_id):
    worker, _reason = await _recommended_worker_for_job(db, {}, business_id)
    return worker


async def _load_business_snapshot(db, business_id):
    jobs = await db.jobs.find({"business_id": str(business_id)}).limit(1000).to_list(length=1000)
    invoices = await db.invoices.find({"business_id": str(business_id)}).limit(1000).to_list(length=1000)
    quotes = await db.quotes.find({"business_id": str(business_id)}).limit(1000).to_list(length=1000)
    clients = await db.clients.find({"business_id": str(business_id)}).limit(1000).to_list(length=1000)
    workers = await _workers_for_business(db, business_id)
    proof_packs = await db.proof_packs.find({"business_id": str(business_id)}).limit(1000).to_list(length=1000)
    return {"jobs": jobs, "invoices": invoices, "quotes": quotes, "clients": clients, "workers": workers, "proof_packs": proof_packs}


def _invoice_open(invoice):
    return _norm(invoice.get("status")) in {"sent", "open", "overdue", "unpaid", "pending_payment"}


def _quote_waiting(quote):
    return _norm(quote.get("status")) in {"sent", "pending", "waiting", "viewed", "draft"}


def _build_action(action_type, title, summary, reason, priority="medium", payload=None, source=None):
    payload = payload or {}
    action_id = f"{action_type}-{payload.get('job_id') or payload.get('invoice_id') or payload.get('quote_id') or secrets.token_hex(4)}"
    return {
        "id": action_id,
        "type": action_type,
        "priority": priority,
        "title": title,
        "summary": summary,
        "reason": reason,
        "next": "Owner approval required before Churvox executes.",
        "status": "pending",
        "source": source or "ai_operator",
        "payload": payload,
        **payload,
    }


async def _build_ai_plan(db, business_id):
    snap = await _load_business_snapshot(db, business_id)
    jobs = snap["jobs"]
    invoices = snap["invoices"]
    quotes = snap["quotes"]
    proof_packs = snap["proof_packs"]
    invoice_job_ids = {str(i.get("job_id") or i.get("source_job_id") or i.get("linked_job_id") or "") for i in invoices if i.get("job_id") or i.get("source_job_id") or i.get("linked_job_id")}
    proof_job_ids = {str(p.get("job_id") or "") for p in proof_packs if p.get("job_id")}
    actions = []

    for job in jobs:
        job_id = str(job.get("_id") or job.get("id") or "")
        if not job_id:
            continue
        assigned = job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_worker")
        title = _job_title(job)
        if not assigned and not _job_is_completed(job):
            actions.append(_build_action("dispatch", f"Assign crew to {title}", "Job has no worker assigned.", "Unassigned jobs block the day and stop work moving.", "high", {"job_id": job_id}, "jobs"))
        if _job_is_completed(job) and job_id not in invoice_job_ids and not job.get("invoice_id") and not job.get("draft_invoice_id"):
            amount = _num(job.get("fixed_price") or job.get("price") or job.get("subtotal") or job.get("amount"))
            if amount > 0:
                actions.append(_build_action("invoice", f"Create draft invoice for {title}", f"Suggested amount: ${amount:.2f}.", "Completed work is ready to become a draft invoice.", "medium", {"job_id": job_id}, "jobs"))
            else:
                actions.append(_build_action("pricing", f"Add pricing for {title}", "Completed job needs a safe price before invoicing.", "Churvox must not create a $0 invoice.", "high", {"job_id": job_id}, "jobs"))
            if job_id not in proof_job_ids and not job.get("proof_pack_id"):
                actions.append(_build_action("proof", f"Prepare proof pack for {title}", "Completed work needs proof before payment follow-up.", "Proof-to-Paid needs customer-ready proof assets.", "medium", {"job_id": job_id}, "jobs"))

    for invoice in invoices:
        invoice_id = str(invoice.get("_id") or invoice.get("id") or "")
        if invoice_id and _invoice_open(invoice):
            balance = _num(invoice.get("balance_due") or invoice.get("balance") or invoice.get("amount_due") or invoice.get("total") or invoice.get("amount"))
            actions.append(_build_action("follow", f"Prepare reminder for invoice {invoice.get('invoice_number') or invoice_id[-6:]}", f"${balance:.2f} outstanding.", "Money is waiting to come in.", "high" if _norm(invoice.get("status")) == "overdue" else "medium", {"invoice_id": invoice_id}, "invoices"))

    for quote in quotes:
        quote_id = str(quote.get("_id") or quote.get("id") or "")
        if quote_id and _quote_waiting(quote):
            actions.append(_build_action("follow", f"Prepare quote follow-up {quote.get('quote_number') or quote_id[-6:]}", "Quote is waiting for a customer decision.", "Follow-up can help convert quoted work into booked work.", "medium", {"quote_id": quote_id}, "quotes"))

    counts = {
        "actions": len(actions),
        "dispatch": len([a for a in actions if a["type"] == "dispatch"]),
        "revenue": len([a for a in actions if a["type"] in {"invoice", "pricing"}]),
        "proof": len([a for a in actions if a["type"] == "proof"]),
        "follow_up": len([a for a in actions if a["type"] == "follow"]),
        "reception": len([a for a in actions if a["type"] == "reception"]),
        "recurring": len([a for a in actions if a["type"] == "recurring"]),
        "updates": len([a for a in actions if a["type"] == "update"]),
        "memory": len([a for a in actions if a["type"] == "memory"]),
        "workers": len(snap["workers"]),
        "clients": len(snap["clients"]),
        "invoices": len(invoices),
        "quotes": len(quotes),
    }
    best = actions[0] if actions else None
    return {"success": True, "business_id": str(business_id), "generated_at": _now().isoformat(), "summary": counts, "best_next_move": best, "actions": actions, "snapshot": {"jobs": len(jobs), "invoices": len(invoices), "quotes": len(quotes), "clients": len(snap["clients"]), "workers": len(snap["workers"])}}


async def _store_plan_actions(db, business_id, actions):
    now = _now()
    for action in actions:
        await db.ai_approval_actions.update_one(
            {"business_id": str(business_id), "id": action["id"], "status": {"$in": ["pending", "prepared"]}},
            {"$set": {**action, "business_id": str(business_id), "updated_at": now}, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )


def register_command_hub_routes(api_router, db, get_current_user, get_user_business_id):
    async def _ensure_owner(current_user):
        role = str((current_user or {}).get("role") or "").lower().strip()
        if role not in OWNER_COMMAND_ROLES:
            raise HTTPException(status_code=403, detail="Command actions are owner/admin only")
        return await get_user_business_id(current_user)

    @api_router.get("/ai/operator/today-plan")
    @api_router.get("/api/ai/operator/today-plan")
    async def ai_operator_today_plan(current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        plan = await _build_ai_plan(db, business_id)
        await _store_plan_actions(db, business_id, plan.get("actions") or [])
        return plan

    @api_router.get("/ai/operator/business-health")
    @api_router.get("/api/ai/operator/business-health")
    async def ai_operator_business_health(current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        plan = await _build_ai_plan(db, business_id)
        warnings = []
        s = plan["summary"]
        if s["dispatch"]:
            warnings.append({"type": "dispatch", "message": f"{s['dispatch']} job(s) need crew."})
        if s["follow_up"]:
            warnings.append({"type": "follow_up", "message": f"{s['follow_up']} follow-up(s) are ready."})
        if s["revenue"]:
            warnings.append({"type": "revenue", "message": f"{s['revenue']} revenue item(s) need review."})
        score = max(0, 100 - (s["dispatch"] * 8) - (s["follow_up"] * 4) - (s["revenue"] * 5) - (s["proof"] * 4))
        return {"success": True, "score": score, "warnings": warnings, "summary": s}

    @api_router.post("/ai/operator/ask")
    @api_router.post("/api/ai/operator/ask")
    async def ai_operator_ask(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        question = str((payload or {}).get("question") or "What should I do first?").strip()
        plan = await _build_ai_plan(db, business_id)
        best = plan.get("best_next_move")
        if best:
            answer = f"Start with {best['title']}. Reason: {best['reason']} I found {plan['summary']['actions']} action(s) ready for owner approval."
        else:
            answer = "Nothing urgent is blocking the business from the data currently loaded. Check new enquiries, jobs, invoices, and quotes next."
        return {"success": True, "question": question, "answer": answer, "plan": plan}

    @api_router.get("/ai/receptionist/enquiries")
    @api_router.get("/api/ai/receptionist/enquiries")
    async def ai_receptionist_enquiries(current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        items = await db.ai_enquiries.find({"business_id": str(business_id), "status": {"$ne": "archived"}}).limit(100).to_list(length=100)
        return {"success": True, "items": _safe_docs(items), "enquiries": _safe_docs(items)}

    @api_router.get("/ai/recurring")
    @api_router.get("/api/ai/recurring")
    async def ai_recurring(current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        items = await db.recurring_jobs.find({"business_id": str(business_id)}).limit(100).to_list(length=100)
        return {"success": True, "items": _safe_docs(items), "rules": _safe_docs(items)}

    @api_router.get("/ai/customer-updates")
    @api_router.get("/api/ai/customer-updates")
    async def ai_customer_updates(current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        items = await db.customer_updates.find({"business_id": str(business_id), "status": {"$ne": "sent"}}).limit(100).to_list(length=100)
        return {"success": True, "items": _safe_docs(items), "updates": _safe_docs(items)}

    @api_router.get("/ai/quotes/drafts")
    @api_router.get("/api/ai/quotes/drafts")
    async def ai_quote_drafts(current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        items = await db.ai_quote_drafts.find({"business_id": str(business_id), "status": {"$ne": "archived"}}).limit(100).to_list(length=100)
        return {"success": True, "items": _safe_docs(items), "drafts": _safe_docs(items)}

    @api_router.get("/ai/client-memory")
    @api_router.get("/api/ai/client-memory")
    async def ai_client_memory(current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        items = await db.client_memory.find({"business_id": str(business_id)}).limit(100).to_list(length=100)
        return {"success": True, "items": _safe_docs(items), "actions": _safe_docs(items)}

    @api_router.post("/smart-hub/scan")
    async def smart_hub_scan(current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        plan = await _build_ai_plan(db, business_id)
        await _store_plan_actions(db, business_id, plan.get("actions") or [])
        return {"success": True, "message": "AI Operator scan complete.", "plan": plan, "action_count": len(plan.get("actions") or [])}

    @api_router.get("/command-hub/actions")
    async def list_command_hub_actions(current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        items = await db.ai_approval_actions.find({"business_id": str(business_id), "status": {"$in": ["pending", "prepared"]}}).sort("updated_at", -1).limit(200).to_list(length=200)
        return {"success": True, "items": _safe_docs(items), "actions": _safe_docs(items)}

    @api_router.patch("/jobs/{job_id}")
    async def command_update_job(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        if not payload:
            raise HTTPException(status_code=400, detail="No update payload supplied")
        allowed = {"title", "name", "status", "assigned_worker_id", "worker_id", "assigned_worker_name", "price", "fixed_price", "subtotal", "pricing_type", "hourly_rate", "notes", "scheduled_date", "scheduled_time", "address", "region", "area", "suburb"}
        update = {k: v for k, v in payload.items() if k in allowed and v is not None}
        if not update:
            raise HTTPException(status_code=400, detail="No safe fields to update")
        worker_id = _rid(update.get("assigned_worker_id") or update.get("worker_id"))
        if worker_id:
            worker = await _find_worker(db, worker_id, business_id)
            if worker:
                update["assigned_worker_id"] = _worker_id(worker)
                update["worker_id"] = _worker_id(worker)
                update["assigned_worker_name"] = _safe_name(worker) or update.get("assigned_worker_name") or "Worker"
        update["updated_at"] = _now()
        result = await db.jobs.update_one(_record_query(job_id, business_id), {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        job = await db.jobs.find_one(_record_query(job_id, business_id))
        return {"success": True, "message": "Job updated from Command.", "job": _safe_doc(job)}

    @api_router.post("/command-hub/actions/execute")
    async def execute_command_hub_action(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        business_id = await _ensure_owner(current_user)
        action_type = str((payload or {}).get("action_type") or (payload or {}).get("type") or "").lower().strip()
        job_id = _rid((payload or {}).get("job_id"))
        invoice_id = _rid((payload or {}).get("invoice_id"))
        quote_id = _rid((payload or {}).get("quote_id"))
        worker_id = _rid((payload or {}).get("worker_id") or (payload or {}).get("recommended_worker_id"))

        if action_type == "dispatch":
            if not job_id:
                raise HTTPException(status_code=400, detail="job_id required")
            job = await db.jobs.find_one(_record_query(job_id, business_id))
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")
            worker = await _find_worker(db, worker_id, business_id) if worker_id else None
            reason = "owner selected worker"
            if not worker:
                worker, reason = await _recommended_worker_for_job(db, job, business_id)
            if not worker:
                return {"success": False, "needs_review": True, "message": reason or "No safe worker recommendation found. Open Dispatch and choose a worker."}
            wid = _worker_id(worker)
            wname = _safe_name(worker) or "Worker"
            await db.jobs.update_one(_record_query(job_id, business_id), {"$set": {"assigned_worker_id": wid, "assigned_worker_name": wname, "worker_id": wid, "status": "assigned", "ai_assignment_reason": reason, "updated_at": _now()}})
            await db.ai_approval_actions.update_one({"business_id": str(business_id), "id": f"dispatch-{job_id}"}, {"$set": {"status": "completed", "executed_at": _now(), "approved_by": str(current_user.get("email") or current_user.get("id") or "")}})
            return {"success": True, "message": f"Assigned {wname} to job. Reason: {reason}", "job_id": job_id, "worker_id": wid, "worker_name": wname}

        if action_type == "invoice":
            if not job_id:
                raise HTTPException(status_code=400, detail="job_id required")
            job = await db.jobs.find_one(_record_query(job_id, business_id))
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")
            existing = await db.invoices.find_one({"business_id": str(business_id), "$or": [{"job_id": job_id}, {"source_job_id": job_id}, {"linked_job_id": job_id}]})
            if existing:
                return {"success": True, "message": "Draft invoice already exists for this job.", "invoice_id": str(existing.get("_id"))}
            amount = _num(job.get("fixed_price") or job.get("price") or job.get("subtotal") or job.get("amount"))
            if amount <= 0:
                return {"success": False, "needs_pricing": True, "message": "Job needs pricing before Churvox can create an invoice."}
            client = await _find_client_for_job(db, job, business_id)
            customer_name = _safe_name(client) or job.get("client_name") or job.get("customer_name") or "Customer"
            description = job.get("ai_invoice_description") or job.get("invoice_description_draft") or job.get("description") or job.get("title") or "Completed service work"
            gst_rate = _num(job.get("gst_rate") or 15)
            total = round(amount + (amount * gst_rate / 100), 2)
            invoice_doc = {"business_id": str(business_id), "job_id": job_id, "source_job_id": job_id, "linked_job_id": job_id, "client_id": str((client or {}).get("_id") or (client or {}).get("id") or job.get("client_id") or ""), "customer_name": customer_name, "customer_email": (client or {}).get("email") or job.get("customer_email") or "", "address": job.get("address") or job.get("job_address") or "", "description": description, "subtotal": amount, "gst_rate": gst_rate, "total": total, "status": "draft", "source": "command_hub", "invoice_number": f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(3)}", "public_token": secrets.token_urlsafe(18), "created_at": _now(), "updated_at": _now()}
            result = await db.invoices.insert_one(invoice_doc)
            await db.jobs.update_one(_record_query(job_id, business_id), {"$set": {"draft_invoice_id": str(result.inserted_id), "invoice_id": str(result.inserted_id), "updated_at": _now()}})
            await db.ai_approval_actions.update_one({"business_id": str(business_id), "id": f"invoice-{job_id}"}, {"$set": {"status": "completed", "executed_at": _now(), "approved_by": str(current_user.get("email") or current_user.get("id") or "")}})
            return {"success": True, "message": "Draft invoice created. Nothing was sent or synced automatically.", "invoice_id": str(result.inserted_id)}

        if action_type == "proof":
            if not job_id:
                raise HTTPException(status_code=400, detail="job_id required")
            job = await db.jobs.find_one(_record_query(job_id, business_id))
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")
            existing = await db.proof_packs.find_one({"business_id": str(business_id), "job_id": job_id})
            if existing:
                return {"success": True, "message": "Proof pack already exists.", "proof_pack_id": str(existing.get("_id")), "public_token": existing.get("public_token")}
            proof_doc = {"business_id": str(business_id), "job_id": job_id, "client_id": str(job.get("client_id") or ""), "status": "ready_for_review", "public_token": secrets.token_urlsafe(18), "created_at": _now(), "updated_at": _now(), "source": "command_hub"}
            result = await db.proof_packs.insert_one(proof_doc)
            await db.jobs.update_one(_record_query(job_id, business_id), {"$set": {"proof_pack_id": str(result.inserted_id), "proof_pack_ready": True, "updated_at": _now()}})
            await db.ai_approval_actions.update_one({"business_id": str(business_id), "id": f"proof-{job_id}"}, {"$set": {"status": "completed", "executed_at": _now(), "approved_by": str(current_user.get("email") or current_user.get("id") or "")}})
            return {"success": True, "message": "Proof pack prepared for review.", "proof_pack_id": str(result.inserted_id), "public_token": proof_doc["public_token"]}

        if action_type == "follow":
            subject = "Follow-up ready"
            message = "Hi, just following up from Churvox."
            related = {}
            if invoice_id:
                invoice = await db.invoices.find_one(_record_query(invoice_id, business_id))
                if not invoice:
                    raise HTTPException(status_code=404, detail="Invoice not found")
                subject = f"Invoice reminder {invoice.get('invoice_number') or invoice_id[-6:]}"
                message = f"Hi {invoice.get('customer_name') or 'there'}, just a friendly reminder that invoice {invoice.get('invoice_number') or ''} is still outstanding."
                related["invoice_id"] = invoice_id
            elif quote_id:
                quote = await db.quotes.find_one(_record_query(quote_id, business_id))
                if not quote:
                    raise HTTPException(status_code=404, detail="Quote not found")
                subject = f"Quote follow-up {quote.get('quote_number') or quote_id[-6:]}"
                message = f"Hi {quote.get('customer_name') or 'there'}, just checking if you would like to go ahead with the quote."
                related["quote_id"] = quote_id
            draft = {"business_id": str(business_id), "type": "follow_up", "subject": subject, "message": message, "status": "prepared", "source": "command_hub", "created_at": _now(), "updated_at": _now(), **related}
            result = await db.ai_followups.insert_one(draft)
            if invoice_id:
                await db.ai_approval_actions.update_one({"business_id": str(business_id), "id": f"invoice-follow-{invoice_id}"}, {"$set": {"status": "prepared", "updated_at": _now()}})
            if quote_id:
                await db.ai_approval_actions.update_one({"business_id": str(business_id), "id": f"quote-follow-{quote_id}"}, {"$set": {"status": "prepared", "updated_at": _now()}})
            return {"success": True, "message": "Follow-up prepared. Nothing was sent automatically.", "follow_up_id": str(result.inserted_id), "draft_message": message}

        if action_type in {"reception", "recurring", "update", "quote_builder", "memory"}:
            draft = {"business_id": str(business_id), "type": action_type, "status": "prepared", "source": "command_hub", "created_at": _now(), "updated_at": _now(), "payload": dict(payload or {})}
            collection_map = {"reception": db.ai_enquiries, "recurring": db.recurring_jobs, "update": db.customer_updates, "quote_builder": db.ai_quote_drafts, "memory": db.client_memory}
            result = await collection_map[action_type].insert_one(draft)
            return {"success": True, "message": f"{action_type} draft prepared for owner approval.", "draft_id": str(result.inserted_id)}

        raise HTTPException(status_code=400, detail="Unsupported Command action type. Supported: dispatch, invoice, proof, follow, reception, recurring, update, quote_builder, memory")
