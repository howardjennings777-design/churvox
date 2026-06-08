import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

logger = logging.getLogger(__name__)


def _safe_doc(doc):
    if not doc:
        return None
    out = dict(doc)
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if isinstance(value, ObjectId):
            out[key] = str(value)
        elif isinstance(value, datetime):
            out[key] = value.isoformat()
        elif isinstance(value, list):
            out[key] = [str(x) if isinstance(x, ObjectId) else x for x in value]
    return out


def _object_id(value, field="id"):
    try:
        return ObjectId(str(value))
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid {field}")


def _money(value):
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return None


def _pick(*values):
    for value in values:
        if value is not None and str(value).strip():
            return value
    return None


def _pricing_type(value):
    text = str(value or "fixed").lower()
    if "hour" in text and "extra" in text:
        return "hourly_extras"
    if "fixed" in text and "extra" in text:
        return "fixed_extras"
    if "hour" in text:
        return "hourly"
    return "fixed"


def _job_type(value):
    return str(value or "other").strip().lower().replace(" ", "_") or "other"


async def _activity(db, business_id, event_type, title, detail, record_type=None, record_id=None, worker_id=None, worker_name=None, status="new", source="ai_operator"):
    doc = {
        "business_id": str(business_id),
        "contractor_id": ObjectId(str(business_id)),
        "event_type": event_type,
        "title": title,
        "detail": detail,
        "record_type": record_type,
        "record_id": str(record_id) if record_id else None,
        "worker_id": str(worker_id) if worker_id else None,
        "worker_name": worker_name,
        "status": status,
        "source": source,
        "created_at": datetime.now(timezone.utc),
    }
    await db.field_activity_events.insert_one(doc)
    return doc


async def _execute(db, business_id, user, action):
    form = action.get("form") or {}
    action_key = action.get("actionKey") or action.get("action_key")
    record_id = action.get("recordId") or action.get("record_id") or form.get("recordId") or form.get("jobId") or form.get("clientId") or form.get("quoteId") or form.get("invoiceId")
    biz_obj = ObjectId(str(business_id))

    if action_key in ("approve_prepared_action", "fix_setup_blocker"):
        setup_key = form.get("setupKey") or record_id or action.get("slipKey") or "setup_item"
        await db.setup_items.update_one(
            {"business_id": str(business_id), "setup_key": setup_key},
            {"$set": {"business_id": str(business_id), "setup_key": setup_key, "form": form, "status": form.get("setupStatus", "approved"), "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        await _activity(db, business_id, "setup_approved", "Setup approved", form.get("missingThing") or "Setup item approved", "setup_item", setup_key)
        return {"success": True, "message": "Setup/prepared action saved", "local_safe": True}

    if not record_id:
        raise HTTPException(status_code=400, detail="Linked record ID is required before approval")

    oid = _object_id(record_id, "record ID")

    if action_key == "assign_worker_to_job":
        worker_id = form.get("workerId") or form.get("worker_id")
        if not worker_id:
            raise HTTPException(status_code=400, detail="Worker ID is required before assignment")
        worker_oid = _object_id(worker_id, "worker ID")
        worker = await db.users.find_one({"_id": worker_oid, "business_id": biz_obj, "role": "worker"})
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found in this business")
        result = await db.jobs.update_one(
            {"_id": oid, "contractor_id": biz_obj},
            {"$set": {
                "assigned_worker_id": worker_oid,
                "assigned_worker_name": worker.get("name") or worker.get("full_name") or worker.get("email"),
                "status": "assigned",
                "dispatch_note": form.get("dispatchNote"),
                "access_instructions": form.get("accessInstructions"),
                "worker_ack_required": form.get("workerAckRequired"),
                "updated_at": datetime.now(timezone.utc),
            }},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        await _activity(db, business_id, "worker_assigned", "Worker assigned", f"{worker.get('name') or worker.get('email')} assigned to job", "job", record_id, worker_oid, worker.get("name") or worker.get("email"))
        return {"success": True, "message": "Worker assigned"}

    if action_key == "fix_job_blocker":
        update = {
            "title": form.get("jobTitle") or None,
            "customer_name": form.get("client") or None,
            "address": form.get("address") or None,
            "job_type": _job_type(form.get("jobType")),
            "pricing_type": _pricing_type(form.get("pricingType")),
            "photo_required": form.get("photoRequired"),
            "gps_required": form.get("gpsRequired"),
            "invoice_readiness": form.get("invoiceReadiness"),
            "customer_reminder_allowed": form.get("customerReminderAllowed"),
            "notes": "\n\n".join([x for x in [form.get("workerInstructions"), form.get("ownerOnlyNote"), form.get("missingChecklist")] if x]) or None,
            "updated_at": datetime.now(timezone.utc),
        }
        price = _money(form.get("price"))
        if price is not None:
            update["price"] = price
        update = {k: v for k, v in update.items() if v is not None}
        result = await db.jobs.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        await _activity(db, business_id, "job_fixed", "Job details approved", form.get("jobTitle") or "Job blocker fixed", "job", record_id)
        return {"success": True, "message": "Job details updated"}

    if action_key == "fix_client_record":
        update = {
            "name": form.get("clientName") or None,
            "email": form.get("email") or form.get("billingEmail") or None,
            "phone": form.get("phone") or None,
            "address": form.get("serviceAddress") or form.get("billingAddress") or None,
            "client_type": form.get("clientType"),
            "preferred_contact": form.get("preferredContact"),
            "billing_email": form.get("billingEmail"),
            "billing_contact": form.get("billingContact"),
            "notes": "\n\n".join([x for x in [form.get("siteNotes"), form.get("clientNote"), form.get("lastJobNextAction")] if x]) or None,
            "updated_at": datetime.now(timezone.utc),
        }
        update = {k: v for k, v in update.items() if v is not None}
        result = await db.clients.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        await _activity(db, business_id, "client_fixed", "Client record approved", form.get("clientName") or "Client record updated", "client", record_id)
        return {"success": True, "message": "Client updated"}

    if action_key == "approve_quote_action":
        wants_convert = "convert" in str(form.get("quoteAction", "")).lower() or "yes" in str(form.get("convertToJob", "")).lower()
        if wants_convert:
            quote = await db.quotes.find_one({"_id": oid, "contractor_id": biz_obj})
            if not quote:
                raise HTTPException(status_code=404, detail="Quote not found")
            if quote.get("converted_job_id"):
                return {"success": True, "message": "Quote already converted", "job_id": quote.get("converted_job_id")}
            job_doc = {
                "title": form.get("conversionJobTitle") or quote.get("job_description") or quote.get("title") or "Job from quote",
                "job_type": quote.get("job_type", "other"),
                "customer_name": quote.get("customer_name") or form.get("client") or "",
                "address": quote.get("address", ""),
                "price": quote.get("price") or _money(form.get("quoteValue")) or 0,
                "pricing_type": quote.get("pricing_type", "fixed"),
                "notes": "\n\n".join([x for x in [form.get("scope"), form.get("exclusions"), form.get("message")] if x]),
                "contractor_id": biz_obj,
                "created_by": ObjectId(str(user.get("id"))),
                "status": "assigned",
                "client_id": quote.get("client_id"),
                "quote_id": oid,
                "photos": [],
                "time_entries": [],
                "total_time_seconds": 0,
                "timer_running": False,
                "created_at": datetime.now(timezone.utc),
            }
            inserted = await db.jobs.insert_one(job_doc)
            await db.quotes.update_one({"_id": oid}, {"$set": {"status": "accepted", "converted_job_id": str(inserted.inserted_id), "updated_at": datetime.now(timezone.utc)}})
            await _activity(db, business_id, "quote_converted", "Quote converted to job", job_doc["title"], "quote", record_id)
            return {"success": True, "message": "Quote converted to job", "job_id": str(inserted.inserted_id)}
        if str(form.get("quoteStatus", "")).lower() == "sent":
            await db.quotes.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc)}})
            await _activity(db, business_id, "quote_sent", "Quote marked sent", form.get("quoteRef") or "Quote sent", "quote", record_id)
            return {"success": True, "message": "Quote marked sent"}
        update = {"customer_name": form.get("client"), "customer_email": form.get("clientEmail"), "price": _money(form.get("quoteValue")), "notes": "\n\n".join([x for x in [form.get("scope"), form.get("exclusions"), form.get("message")] if x]) or None, "updated_at": datetime.now(timezone.utc)}
        update = {k: v for k, v in update.items() if v is not None}
        await db.quotes.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        await _activity(db, business_id, "quote_updated", "Quote action approved", form.get("quoteRef") or "Quote updated", "quote", record_id)
        return {"success": True, "message": "Quote updated"}

    if action_key == "approve_money_action":
        money_action = str(form.get("moneyAction", "")).lower()
        send_mode = str(form.get("sendMode", "")).lower()
        if "paid" in money_action:
            await db.invoices.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc)}})
            await _activity(db, business_id, "invoice_paid", "Invoice marked paid", form.get("invoiceRef") or "Invoice paid", "invoice", record_id)
            return {"success": True, "message": "Invoice marked paid"}
        if "send" in send_mode or "approve" in money_action:
            await db.invoices.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc)}})
            await _activity(db, business_id, "invoice_sent", "Invoice marked sent", form.get("invoiceRef") or "Invoice sent", "invoice", record_id)
            return {"success": True, "message": "Invoice marked sent"}
        update = {"customer_name": form.get("client"), "customer_email": form.get("clientEmail"), "subtotal": _money(form.get("amount")), "description": form.get("customerMessage"), "notes": form.get("internalNote"), "updated_at": datetime.now(timezone.utc)}
        update = {k: v for k, v in update.items() if v is not None}
        await db.invoices.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        await _activity(db, business_id, "invoice_updated", "Money action approved", form.get("invoiceRef") or "Invoice updated", "invoice", record_id)
        return {"success": True, "message": "Invoice updated"}

    if action_key == "accept_worker_update":
        job_id = form.get("jobId") or record_id
        job_oid = _object_id(job_id, "job ID")
        update = {"owner_review": form.get("ownerReview"), "worker_issue_flag": form.get("issueFlag"), "materials_extras": form.get("materialsExtras"), "updated_at": datetime.now(timezone.utc)}
        if str(form.get("ownerCompletionDecision", "")).lower() == "yes" and "completed" in str(form.get("completionStatus", "")).lower():
            update.update({"status": "completed", "completed": True, "completed_at": datetime.now(timezone.utc), "timer_running": False})
        await db.jobs.update_one({"_id": job_oid, "contractor_id": biz_obj}, {"$set": {k: v for k, v in update.items() if v is not None}})
        await _activity(db, business_id, "worker_update_accepted", "Worker update accepted", form.get("job") or "Worker update reviewed", "job", job_id, form.get("workerId"), form.get("worker"))
        return {"success": True, "message": "Worker update accepted"}

    if action_key == "approve_time_review":
        job_id = form.get("jobId") or record_id
        job_oid = _object_id(job_id, "job ID")
        hours = _money(form.get("reviewedHours"))
        update = {"payroll_reviewed": True, "pay_status": form.get("payStatus"), "payroll_note": form.get("payrollNote"), "payroll_approval_status": form.get("approvalStatus"), "updated_at": datetime.now(timezone.utc)}
        if hours is not None:
            update["total_time_seconds"] = max(0, int(hours * 3600))
        await db.jobs.update_one({"_id": job_oid, "contractor_id": biz_obj}, {"$set": {k: v for k, v in update.items() if v is not None}})
        await _activity(db, business_id, "payroll_time_approved", "Payroll time approved", form.get("worker") or "Time reviewed", "job", job_id, form.get("workerId"), form.get("worker"))
        return {"success": True, "message": "Payroll time approved"}

    return {"success": True, "message": "Action stored only; no executor matched", "stored_only": True}


def install(app, db, get_current_user, require_employer=None):
    if getattr(app.state, "ai_operator_routes_installed", False):
        return

    router = APIRouter(prefix="/api")

    @router.get("/ai/actions")
    async def list_ai_actions(current_user: dict = Depends(get_current_user)):
        business_id = current_user.get("business_id") or current_user.get("id")
        query = {"business_id": str(business_id)}
        items = await db.ai_approval_actions.find(query).sort("created_at", -1).to_list(100)
        return {"success": True, "actions": [_safe_doc(x) for x in items]}

    @router.post("/ai/actions")
    async def create_ai_action(payload: dict, current_user: dict = Depends(get_current_user)):
        business_id = current_user.get("business_id") or current_user.get("id")
        doc = dict(payload or {})
        doc["business_id"] = str(business_id)
        doc["contractor_id"] = ObjectId(str(business_id))
        doc["created_by"] = str(current_user.get("id"))
        doc["status"] = doc.get("status") or "pending"
        doc["created_at"] = datetime.now(timezone.utc)
        doc["updated_at"] = datetime.now(timezone.utc)
        result = await db.ai_approval_actions.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        return {"success": True, "action": _safe_doc(doc)}

    @router.post("/ai/actions/{action_id}/approve")
    async def approve_ai_action(action_id: str, current_user: dict = Depends(get_current_user)):
        business_id = current_user.get("business_id") or current_user.get("id")
        action = await db.ai_approval_actions.find_one({"_id": _object_id(action_id, "action ID"), "business_id": str(business_id)})
        if not action:
            raise HTTPException(status_code=404, detail="Approval action not found")
        result = await _execute(db, business_id, current_user, action)
        await db.ai_approval_actions.update_one(
            {"_id": action["_id"]},
            {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc), "approved_by": str(current_user.get("id")), "result": result, "updated_at": datetime.now(timezone.utc)}},
        )
        return {"success": True, "result": result}

    @router.post("/ai/actions/{action_id}/decline")
    async def decline_ai_action(action_id: str, payload: dict | None = None, current_user: dict = Depends(get_current_user)):
        business_id = current_user.get("business_id") or current_user.get("id")
        result = await db.ai_approval_actions.update_one(
            {"_id": _object_id(action_id, "action ID"), "business_id": str(business_id)},
            {"$set": {"status": "declined", "declined_at": datetime.now(timezone.utc), "declined_by": str(current_user.get("id")), "decline_note": (payload or {}).get("note"), "updated_at": datetime.now(timezone.utc)}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Approval action not found")
        return {"success": True, "message": "Action declined"}

    @router.get("/field-activity")
    async def list_field_activity(current_user: dict = Depends(get_current_user)):
        business_id = current_user.get("business_id") or current_user.get("id")
        items = await db.field_activity_events.find({"business_id": str(business_id)}).sort("created_at", -1).to_list(100)
        return {"success": True, "events": [_safe_doc(x) for x in items]}

    @router.post("/field-activity")
    async def create_field_activity(payload: dict, current_user: dict = Depends(get_current_user)):
        business_id = current_user.get("business_id") or current_user.get("id")
        event = await _activity(
            db,
            business_id,
            payload.get("event_type") or payload.get("type") or "manual_event",
            payload.get("title") or "Field activity",
            payload.get("detail") or payload.get("message") or "Activity recorded",
            payload.get("record_type"),
            payload.get("record_id"),
            payload.get("worker_id"),
            payload.get("worker_name"),
            payload.get("status") or "new",
            payload.get("source") or "manual",
        )
        return {"success": True, "event": _safe_doc(event)}

    app.include_router(router)
    app.state.ai_operator_routes_installed = True
    logger.info("AI operator approval/activity routes installed")
