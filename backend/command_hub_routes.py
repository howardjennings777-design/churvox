from datetime import datetime, timezone
import secrets
from bson import ObjectId
from fastapi import Body, Depends, HTTPException

OWNER_COMMAND_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"}


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


def _safe_name(doc):
    if not isinstance(doc, dict):
        return ""
    return str(doc.get("name") or doc.get("business_name") or doc.get("company_name") or doc.get("customer_name") or doc.get("email") or "").strip()


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


async def _first_available_worker(db, business_id):
    query = {"business_id": str(business_id), "role": {"$in": ["worker", "employee", "field_worker"]}}
    worker = await db.workers.find_one(query)
    if worker:
        return worker
    return await db.users.find_one(query)


def register_command_hub_routes(api_router, db, get_current_user, get_user_business_id):
    async def _ensure_owner(current_user):
        role = str((current_user or {}).get("role") or "").lower().strip()
        if role not in OWNER_COMMAND_ROLES:
            raise HTTPException(status_code=403, detail="Command actions are owner/admin only")
        return await get_user_business_id(current_user)

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
            worker = await _find_worker(db, worker_id, business_id) if worker_id else await _first_available_worker(db, business_id)
            if not worker:
                return {"success": False, "needs_review": True, "message": "No safe worker recommendation found. Open Dispatch and choose a worker."}
            wid = str(worker.get("_id") or worker.get("id") or worker_id)
            wname = _safe_name(worker) or "Worker"
            await db.jobs.update_one(_record_query(job_id, business_id), {"$set": {"assigned_worker_id": wid, "assigned_worker_name": wname, "worker_id": wid, "status": "assigned", "updated_at": _now()}})
            return {"success": True, "message": f"Assigned {wname} to job.", "job_id": job_id, "worker_id": wid}

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
            invoice_doc = {
                "business_id": str(business_id),
                "job_id": job_id,
                "source_job_id": job_id,
                "linked_job_id": job_id,
                "client_id": str((client or {}).get("_id") or (client or {}).get("id") or job.get("client_id") or ""),
                "customer_name": customer_name,
                "customer_email": (client or {}).get("email") or job.get("customer_email") or "",
                "address": job.get("address") or job.get("job_address") or "",
                "description": description,
                "subtotal": amount,
                "gst_rate": gst_rate,
                "total": total,
                "status": "draft",
                "source": "command_hub",
                "invoice_number": f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(3)}",
                "public_token": secrets.token_urlsafe(18),
                "created_at": _now(),
                "updated_at": _now(),
            }
            result = await db.invoices.insert_one(invoice_doc)
            await db.jobs.update_one(_record_query(job_id, business_id), {"$set": {"draft_invoice_id": str(result.inserted_id), "invoice_id": str(result.inserted_id), "updated_at": _now()}})
            return {"success": True, "message": "Draft invoice created.", "invoice_id": str(result.inserted_id)}

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
            return {"success": True, "message": "Follow-up prepared. Nothing was sent automatically.", "follow_up_id": str(result.inserted_id), "draft_message": message}

        raise HTTPException(status_code=400, detail="Unsupported Command action type")
