import html
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


def _low(value):
    return str(value or "").strip().lower()


def _pricing_type(value):
    text = _low(value or "fixed")
    if "hour" in text and "extra" in text:
        return "hourly_extras"
    if "fixed" in text and "extra" in text:
        return "fixed_extras"
    if "hour" in text:
        return "hourly"
    return "fixed"


def _job_type(value):
    return str(value or "other").strip().lower().replace(" ", "_") or "other"


def _notify_mode(action, form):
    return str(action.get("notifyMode") or action.get("notify_mode") or form.get("notifyMode") or "Internal only")


def _wants_customer_email(action, form):
    mode = _notify_mode(action, form).lower()
    return "customer" in mode and ("email" in mode or "notify" in mode)


def _wants_worker_email(action, form):
    mode = _notify_mode(action, form).lower()
    return "worker" in mode and ("email" in mode or "notify" in mode)


def _wants_sms(action, form):
    text = " ".join(str(x or "") for x in [action.get("notifyMode"), action.get("notify_mode"), form.get("notifyMode"), form.get("preferredContact"), form.get("reminderStatus"), form.get("customerReminderAllowed")]).lower()
    return "sms" in text or "text" in text


def _invoice_delivery_method(form):
    text = " ".join([_low(form.get("invoiceDeliveryMethod")), _low(form.get("deliveryMethod")), _low(form.get("sendSource")), _low(form.get("accountingStatus")), _low(form.get("sendMode")), _low(form.get("moneyAction"))])
    if "xero" in text:
        return "xero"
    if "myob" in text:
        return "myob_staged"
    if "manual" in text or "external" in text:
        return "manual_external"
    if "draft" in text or "prepare reminder" in text:
        return "draft_only"
    if "send" in text or "approve" in text or "internal" in text or "email" in text:
        return "churvox_internal"
    return "draft_only"


def _email_html(title, body):
    safe_title = html.escape(str(title or "Churvox update"))
    safe_body = html.escape(str(body or "")).replace("\n", "<br />")
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f1e7;padding:24px;color:#111827;">
      <div style="max-width:620px;margin:0 auto;background:#fffaf0;border:1px solid #ead4b6;border-radius:18px;padding:28px;">
        <div style="font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#9a3412;">Churvox</div>
        <h1 style="font-size:24px;line-height:1.1;margin:12px 0;color:#0b1018;">{safe_title}</h1>
        <p style="font-size:15px;line-height:1.55;color:#334155;">{safe_body}</p>
        <p style="font-size:12px;color:#64748b;margin-top:22px;">This message was prepared by Churvox and sent only after owner approval.</p>
      </div>
    </div>
    """


async def _activity(db, business_id, event_type, title, detail, record_type=None, record_id=None, worker_id=None, worker_name=None, status="new", source="ai_operator"):
    doc = {"business_id": str(business_id), "contractor_id": ObjectId(str(business_id)), "event_type": event_type, "title": title, "detail": detail, "record_type": record_type, "record_id": str(record_id) if record_id else None, "worker_id": str(worker_id) if worker_id else None, "worker_name": worker_name, "status": status, "source": source, "created_at": datetime.now(timezone.utc)}
    await db.field_activity_events.insert_one(doc)
    return doc


async def _notification(db, business_id, channel, to, subject, body, record_type=None, record_id=None, status="prepared", provider="internal", error=None):
    doc = {"business_id": str(business_id), "contractor_id": ObjectId(str(business_id)), "channel": channel, "to": to, "subject": subject, "body": body, "record_type": record_type, "record_id": str(record_id) if record_id else None, "status": status, "provider": provider, "error": error, "approval_required": True, "created_at": datetime.now(timezone.utc)}
    await db.approved_notifications.insert_one(doc)
    return _safe_doc(doc)


async def _send_email_if_requested(db, business_id, action, form, to_email, subject, body, record_type=None, record_id=None):
    if not to_email:
        return await _notification(db, business_id, "email", None, subject, body, record_type, record_id, status="not_sent", provider="postmark", error="Missing recipient email")
    try:
        try:
            from backend.email_provider import send_email
        except Exception:
            from email_provider import send_email
        await send_email(to_email, subject, _email_html(subject, body), body)
        return await _notification(db, business_id, "email", to_email, subject, body, record_type, record_id, status="sent", provider="postmark", error=None)
    except Exception as exc:
        logger.warning("Approval email not sent: %s", exc)
        return await _notification(db, business_id, "email", to_email, subject, body, record_type, record_id, status="not_sent", provider="postmark", error=str(exc))


async def _send_sms_if_requested(db, business_id, action, form, phone, body, record_type=None, record_id=None):
    if not _wants_sms(action, form):
        return None
    if not phone:
        return await _notification(db, business_id, "sms", None, "SMS prepared", body, record_type, record_id, status="not_sent", provider="clicksend", error="Missing phone number")
    try:
        try:
            from backend.sms_provider import get_sms_provider
        except Exception:
            from sms_provider import get_sms_provider
        provider = get_sms_provider()
        result = await provider.send(phone, body, source="Churvox")
        status = "sent" if getattr(result, "success", False) else "prepared_not_sent"
        return await _notification(db, business_id, "sms", phone, "SMS prepared", body, record_type, record_id, status=status, provider=getattr(result, "provider", "clicksend"), error=getattr(result, "error", None))
    except Exception as exc:
        logger.warning("Approval SMS not sent: %s", exc)
        return await _notification(db, business_id, "sms", phone, "SMS prepared", body, record_type, record_id, status="prepared_not_sent", provider="clicksend", error=str(exc))


async def _xero_connected(db, business_id):
    conn = await db.xero_connections.find_one({"business_id": str(business_id), "status": "connected"})
    return bool(conn), conn


def _invoice_update(form):
    update = {"customer_name": form.get("client"), "customer_email": form.get("clientEmail"), "subtotal": _money(form.get("amount")), "description": form.get("customerMessage"), "notes": form.get("internalNote"), "invoice_type": form.get("invoiceType"), "gst_status": form.get("gstStatus"), "payment_link_status": form.get("paymentLinkStatus"), "updated_at": datetime.now(timezone.utc)}
    return {k: v for k, v in update.items() if v is not None}


async def _execute_money_action(db, business_id, user, action, oid, record_id, biz_obj, notifications):
    form = action.get("form") or {}
    method = _invoice_delivery_method(form)
    money_action = _low(form.get("moneyAction"))
    now = datetime.now(timezone.utc)
    update = _invoice_update(form)
    update.update({"invoice_delivery_method": method, "delivery_source": method, "owner_approval_required": True, "approved_at": now, "approved_by": str(user.get("id"))})

    if "paid" in money_action:
        update.update({"status": "paid", "paid_at": now})
        await db.invoices.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        await _activity(db, business_id, "invoice_paid", "Invoice marked paid", form.get("invoiceRef") or "Invoice paid", "invoice", record_id)
        return {"success": True, "message": "Invoice marked paid", "invoice_delivery_method": method, "notifications": notifications}

    invoice_body = form.get("customerMessage") or f"Your invoice {form.get('invoiceRef') or ''} is ready. Amount: {form.get('amount') or 'see invoice'}."
    if method == "xero":
        connected, conn = await _xero_connected(db, business_id)
        queue_status = "prepared" if connected else "waiting_for_xero_connection"
        update.update({"status": "approved_for_xero", "xero_sync_status": queue_status, "xero_tenant_id": (conn or {}).get("tenant_id")})
        await db.invoices.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        await db.xero_sync_queue.insert_one({"business_id": str(business_id), "record_type": "invoice", "record_id": str(record_id), "status": queue_status, "approval_required": True, "created_at": now, "payload": {"invoice_id": str(record_id), "form": form}})
        await _activity(db, business_id, "invoice_xero_staged", "Invoice staged for Xero", form.get("invoiceRef") or "Invoice approved for Xero sync", "invoice", record_id)
        return {"success": True, "message": "Invoice approved for Xero sync", "invoice_delivery_method": method, "xero_sync_status": queue_status, "notifications": notifications}
    if method == "myob_staged":
        update.update({"status": "approved_for_myob_later", "myob_sync_status": "staged_not_active"})
        await db.invoices.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        await _activity(db, business_id, "invoice_myob_staged", "Invoice staged for MYOB later", form.get("invoiceRef") or "Invoice staged for MYOB", "invoice", record_id)
        return {"success": True, "message": "Invoice staged for MYOB later", "invoice_delivery_method": method, "notifications": notifications}
    if method == "manual_external":
        update.update({"status": "externally_handled", "external_handled_at": now})
        await db.invoices.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        await _activity(db, business_id, "invoice_external", "Invoice marked externally handled", form.get("invoiceRef") or "Invoice handled outside Churvox", "invoice", record_id)
        return {"success": True, "message": "Invoice marked externally handled", "invoice_delivery_method": method, "notifications": notifications}
    if method == "draft_only":
        update.update({"status": "draft_approved"})
        await db.invoices.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        await _activity(db, business_id, "invoice_draft_approved", "Invoice draft approved", form.get("invoiceRef") or "Invoice draft approved", "invoice", record_id)
        return {"success": True, "message": "Invoice draft approved. Nothing sent or synced.", "invoice_delivery_method": method, "notifications": notifications}

    update.update({"status": "sent", "sent_at": now, "sent_by": "churvox_internal"})
    await db.invoices.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
    await _activity(db, business_id, "invoice_sent_internal", "Invoice sent by Churvox", form.get("invoiceRef") or "Invoice sent by Churvox", "invoice", record_id)
    if _wants_customer_email(action, form):
        notifications.append(await _send_email_if_requested(db, business_id, action, form, form.get("clientEmail"), "Your Churvox invoice", invoice_body, "invoice", record_id))
    notifications.append(await _send_sms_if_requested(db, business_id, action, form, form.get("clientPhone"), invoice_body, "invoice", record_id))
    return {"success": True, "message": "Invoice handled by Churvox internal sending", "invoice_delivery_method": method, "notifications": notifications}


async def _execute(db, business_id, user, action):
    form = action.get("form") or {}
    action_key = action.get("actionKey") or action.get("action_key")
    record_id = action.get("recordId") or action.get("record_id") or form.get("recordId") or form.get("jobId") or form.get("clientId") or form.get("quoteId") or form.get("invoiceId")
    biz_obj = ObjectId(str(business_id))
    notifications = []

    if action_key in ("approve_prepared_action", "fix_setup_blocker"):
        setup_key = form.get("setupKey") or record_id or action.get("slipKey") or "setup_item"
        await db.setup_items.update_one({"business_id": str(business_id), "setup_key": setup_key}, {"$set": {"business_id": str(business_id), "setup_key": setup_key, "form": form, "status": form.get("setupStatus", "approved"), "updated_at": datetime.now(timezone.utc)}}, upsert=True)
        await _activity(db, business_id, "setup_approved", "Setup approved", form.get("missingThing") or "Setup item approved", "setup_item", setup_key)
        return {"success": True, "message": "Setup/prepared action saved", "notifications": notifications, "local_safe": True}
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
        result = await db.jobs.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": {"assigned_worker_id": worker_oid, "assigned_worker_name": worker.get("name") or worker.get("full_name") or worker.get("email"), "status": "assigned", "dispatch_note": form.get("dispatchNote"), "access_instructions": form.get("accessInstructions"), "worker_ack_required": form.get("workerAckRequired"), "updated_at": datetime.now(timezone.utc)}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        worker_name = worker.get("name") or worker.get("full_name") or worker.get("email")
        await _activity(db, business_id, "worker_assigned", "Worker assigned", f"{worker_name} assigned to job", "job", record_id, worker_oid, worker_name)
        if _wants_worker_email(action, form):
            notifications.append(await _send_email_if_requested(db, business_id, action, form, worker.get("email"), "New Churvox job assignment", form.get("dispatchNote") or f"You have been assigned to {form.get('jobName') or 'a job'}.", "job", record_id))
        return {"success": True, "message": "Worker assigned", "notifications": notifications}

    if action_key == "fix_job_blocker":
        update = {"title": form.get("jobTitle") or None, "customer_name": form.get("client") or None, "address": form.get("address") or None, "job_type": _job_type(form.get("jobType")), "pricing_type": _pricing_type(form.get("pricingType")), "photo_required": form.get("photoRequired"), "gps_required": form.get("gpsRequired"), "invoice_readiness": form.get("invoiceReadiness"), "customer_reminder_allowed": form.get("customerReminderAllowed"), "notes": "\n\n".join([x for x in [form.get("workerInstructions"), form.get("ownerOnlyNote"), form.get("missingChecklist")] if x]) or None, "updated_at": datetime.now(timezone.utc)}
        price = _money(form.get("price"))
        if price is not None:
            update["price"] = price
        update = {k: v for k, v in update.items() if v is not None}
        result = await db.jobs.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        await _activity(db, business_id, "job_fixed", "Job details approved", form.get("jobTitle") or "Job blocker fixed", "job", record_id)
        return {"success": True, "message": "Job details updated", "notifications": notifications}

    if action_key == "fix_client_record":
        update = {"name": form.get("clientName") or None, "email": form.get("email") or form.get("billingEmail") or None, "phone": form.get("phone") or None, "address": form.get("serviceAddress") or form.get("billingAddress") or None, "client_type": form.get("clientType"), "preferred_contact": form.get("preferredContact"), "billing_email": form.get("billingEmail"), "billing_contact": form.get("billingContact"), "notes": "\n\n".join([x for x in [form.get("siteNotes"), form.get("clientNote"), form.get("lastJobNextAction")] if x]) or None, "updated_at": datetime.now(timezone.utc)}
        update = {k: v for k, v in update.items() if v is not None}
        result = await db.clients.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        await _activity(db, business_id, "client_fixed", "Client record approved", form.get("clientName") or "Client record updated", "client", record_id)
        if _wants_sms(action, form):
            notifications.append(await _send_sms_if_requested(db, business_id, action, form, form.get("phone"), form.get("lastJobNextAction") or "Churvox customer update prepared.", "client", record_id))
        return {"success": True, "message": "Client updated", "notifications": notifications}

    if action_key == "approve_quote_action":
        wants_convert = "convert" in _low(form.get("quoteAction")) or "yes" in _low(form.get("convertToJob"))
        if wants_convert:
            quote = await db.quotes.find_one({"_id": oid, "contractor_id": biz_obj})
            if not quote:
                raise HTTPException(status_code=404, detail="Quote not found")
            if quote.get("converted_job_id"):
                return {"success": True, "message": "Quote already converted", "job_id": quote.get("converted_job_id"), "notifications": notifications}
            job_doc = {"title": form.get("conversionJobTitle") or quote.get("job_description") or quote.get("title") or "Job from quote", "job_type": quote.get("job_type", "other"), "customer_name": quote.get("customer_name") or form.get("client") or "", "address": quote.get("address", ""), "price": quote.get("price") or _money(form.get("quoteValue")) or 0, "pricing_type": quote.get("pricing_type", "fixed"), "notes": "\n\n".join([x for x in [form.get("scope"), form.get("exclusions"), form.get("message")] if x]), "contractor_id": biz_obj, "created_by": ObjectId(str(user.get("id"))), "status": "assigned", "client_id": quote.get("client_id"), "quote_id": oid, "photos": [], "time_entries": [], "total_time_seconds": 0, "timer_running": False, "created_at": datetime.now(timezone.utc)}
            inserted = await db.jobs.insert_one(job_doc)
            await db.quotes.update_one({"_id": oid}, {"$set": {"status": "accepted", "converted_job_id": str(inserted.inserted_id), "updated_at": datetime.now(timezone.utc)}})
            await _activity(db, business_id, "quote_converted", "Quote converted to job", job_doc["title"], "quote", record_id)
            return {"success": True, "message": "Quote converted to job", "job_id": str(inserted.inserted_id), "notifications": notifications}
        quote_body = form.get("message") or f"Your quote {form.get('quoteRef') or ''} has been updated."
        if _low(form.get("quoteStatus")) == "sent" or _wants_customer_email(action, form):
            await db.quotes.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc)}})
            await _activity(db, business_id, "quote_sent", "Quote marked sent", form.get("quoteRef") or "Quote sent", "quote", record_id)
            if _wants_customer_email(action, form):
                notifications.append(await _send_email_if_requested(db, business_id, action, form, form.get("clientEmail"), "Your Churvox quote", quote_body, "quote", record_id))
            notifications.append(await _send_sms_if_requested(db, business_id, action, form, form.get("clientPhone"), quote_body, "quote", record_id))
            return {"success": True, "message": "Quote marked sent", "notifications": notifications}
        update = {"customer_name": form.get("client"), "customer_email": form.get("clientEmail"), "price": _money(form.get("quoteValue")), "notes": "\n\n".join([x for x in [form.get("scope"), form.get("exclusions"), form.get("message")] if x]) or None, "updated_at": datetime.now(timezone.utc)}
        update = {k: v for k, v in update.items() if v is not None}
        await db.quotes.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": update})
        await _activity(db, business_id, "quote_updated", "Quote action approved", form.get("quoteRef") or "Quote updated", "quote", record_id)
        return {"success": True, "message": "Quote updated", "notifications": notifications}

    if action_key == "approve_money_action":
        return await _execute_money_action(db, business_id, user, action, oid, record_id, biz_obj, notifications)

    if action_key == "accept_worker_update":
        job_id = form.get("jobId") or record_id
        job_oid = _object_id(job_id, "job ID")
        update = {"owner_review": form.get("ownerReview"), "worker_issue_flag": form.get("issueFlag"), "materials_extras": form.get("materialsExtras"), "updated_at": datetime.now(timezone.utc)}
        if _low(form.get("ownerCompletionDecision")) == "yes" and "completed" in _low(form.get("completionStatus")):
            update.update({"status": "completed", "completed": True, "completed_at": datetime.now(timezone.utc), "timer_running": False})
        await db.jobs.update_one({"_id": job_oid, "contractor_id": biz_obj}, {"$set": {k: v for k, v in update.items() if v is not None}})
        await _activity(db, business_id, "worker_update_accepted", "Worker update accepted", form.get("job") or "Worker update reviewed", "job", job_id, form.get("workerId"), form.get("worker"))
        return {"success": True, "message": "Worker update accepted", "notifications": notifications}

    if action_key == "approve_time_review":
        job_id = form.get("jobId") or record_id
        job_oid = _object_id(job_id, "job ID")
        hours = _money(form.get("reviewedHours"))
        update = {"payroll_reviewed": True, "pay_status": form.get("payStatus"), "payroll_note": form.get("payrollNote"), "payroll_approval_status": form.get("approvalStatus"), "updated_at": datetime.now(timezone.utc)}
        if hours is not None:
            update["total_time_seconds"] = max(0, int(hours * 3600))
        await db.jobs.update_one({"_id": job_oid, "contractor_id": biz_obj}, {"$set": {k: v for k, v in update.items() if v is not None}})
        await _activity(db, business_id, "payroll_time_approved", "Payroll time approved", form.get("worker") or "Time reviewed", "job", job_id, form.get("workerId"), form.get("worker"))
        return {"success": True, "message": "Payroll time approved", "notifications": notifications}

    return {"success": True, "message": "Action stored only; no executor matched", "stored_only": True, "notifications": notifications}


def install(app, db, get_current_user, require_employer=None):
    if getattr(app.state, "ai_operator_routes_installed", False):
        return
    router = APIRouter(prefix="/api")

    @router.get("/ai/actions")
    async def list_ai_actions(current_user: dict = Depends(get_current_user)):
        business_id = current_user.get("business_id") or current_user.get("id")
        items = await db.ai_approval_actions.find({"business_id": str(business_id)}).sort("created_at", -1).to_list(100)
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
        await db.ai_approval_actions.update_one({"_id": action["_id"]}, {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc), "approved_by": str(current_user.get("id")), "result": result, "updated_at": datetime.now(timezone.utc)}})
        return {"success": True, "result": result}

    @router.post("/ai/actions/{action_id}/decline")
    async def decline_ai_action(action_id: str, payload: dict | None = None, current_user: dict = Depends(get_current_user)):
        business_id = current_user.get("business_id") or current_user.get("id")
        result = await db.ai_approval_actions.update_one({"_id": _object_id(action_id, "action ID"), "business_id": str(business_id)}, {"$set": {"status": "declined", "declined_at": datetime.now(timezone.utc), "declined_by": str(current_user.get("id")), "decline_note": (payload or {}).get("note"), "updated_at": datetime.now(timezone.utc)}})
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
        event = await _activity(db, business_id, payload.get("event_type") or payload.get("type") or "manual_event", payload.get("title") or "Field activity", payload.get("detail") or payload.get("message") or "Activity recorded", payload.get("record_type"), payload.get("record_id"), payload.get("worker_id"), payload.get("worker_name"), payload.get("status") or "new", payload.get("source") or "manual")
        return {"success": True, "event": _safe_doc(event)}

    @router.get("/approved-notifications")
    async def list_approved_notifications(current_user: dict = Depends(get_current_user)):
        business_id = current_user.get("business_id") or current_user.get("id")
        items = await db.approved_notifications.find({"business_id": str(business_id)}).sort("created_at", -1).to_list(100)
        return {"success": True, "notifications": [_safe_doc(x) for x in items]}

    app.include_router(router)
    app.state.ai_operator_routes_installed = True
    logger.info("AI operator approval/activity routes installed")
