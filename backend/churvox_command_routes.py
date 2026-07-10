from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request


SAFE_RESULT = "Owner approval recorded. Nothing was sent, synced, charged or changed."
OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]


def build_command_router(db, get_current_user, ObjectId):
    router = APIRouter()

    def now():
        return datetime.now(timezone.utc)

    def serial(value):
        if isinstance(value, list):
            return [serial(item) for item in value]
        if isinstance(value, dict):
            return {key: serial(item) for key, item in value.items()}
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    def doc_out(doc):
        if not doc:
            return None
        out = dict(doc)
        if "_id" in out:
            out["id"] = str(out.pop("_id"))
        return serial(out)

    def oid(value, label="record"):
        try:
            return ObjectId(str(value))
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid {label} id")

    async def require_owner(request: Request):
        user = await get_current_user(request)
        role = str(user.get("role") or "").lower()
        allowed = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}
        if role not in allowed and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can use Command")
        return user

    async def require_command_participant(request: Request):
        user = await get_current_user(request)
        role = str(user.get("role") or "").lower()
        allowed = {"employer", "admin", "owner", "business_owner", "manager", "office_admin", "worker", "staff", "employee", "subcontractor", "payroll"}
        if role not in allowed and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Only business users can create Command requests")
        return user

    def business_ids(user):
        business_id = str(user.get("business_id") or user.get("id"))
        return business_id, oid(business_id, "business")

    def safe_text(value, fallback=""):
        text = " ".join(str(value or "").strip().split())
        return text[:600] or fallback

    def lower(value):
        return safe_text(value, "").lower()

    def has_value(value):
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        if isinstance(value, (list, tuple, set, dict)):
            return bool(value)
        return True

    def truthy(value):
        if isinstance(value, bool):
            return value
        return lower(value) in {"1", "true", "yes", "active", "enabled", "done", "complete", "completed"}

    def first_value(row, keys, fallback=""):
        for key in keys:
            value = (row or {}).get(key)
            if has_value(value):
                return value
        return fallback

    def record_id(row, fallback="record"):
        value = first_value(row, ["_id", "id", "job_id", "invoice_id", "client_id", "message_id", "timer_id", "worker_id", "record_id"], "")
        return safe_text(value, fallback)

    def record_title(row, fallback="record"):
        return safe_text(first_value(row, ["title", "job_title", "name", "client_name", "customer_name", "invoice_number", "number", "subject", "description"], fallback), fallback)

    def amount_value(value):
        try:
            return float(str(value or "0").replace("$", "").replace(",", ""))
        except Exception:
            return 0.0

    def date_value(row, keys):
        return first_value(row, keys, None)

    def status_text(row):
        return lower(first_value(row, ["status", "job_status", "invoice_status", "payment_status", "state"], ""))

    def is_done(row):
        text = status_text(row)
        return any(word in text for word in ["complete", "completed", "done", "finished", "closed"])

    def is_cancelled(row):
        text = status_text(row)
        return any(word in text for word in ["cancel", "deleted", "archived"])

    def audit_entry(user, action, note=""):
        return {
            "by": str(user.get("id")),
            "role": str(user.get("role") or "owner"),
            "action": action,
            "note": safe_text(note, ""),
            "at": now(),
            "safety": SAFE_RESULT,
        }

    def normalize_slip(payload: Dict[str, Any], user: Dict[str, Any]):
        business_id, business_oid = business_ids(user)
        source_type = safe_text(payload.get("sourceType") or payload.get("source_type") or payload.get("area") or "office", "office")
        action_type = safe_text(payload.get("actionType") or payload.get("action_type") or payload.get("action") or "owner_review", "owner_review")
        title = safe_text(payload.get("title"), "Command decision")
        prepared = safe_text(payload.get("prepared") or payload.get("summary"), "Prepared for owner review.")
        found = safe_text(payload.get("found") or payload.get("happened"), "Churvox found a record that may need owner review.")
        why = safe_text(payload.get("why") or payload.get("need"), "Owner approval is required before any real action.")
        doc = {
            "business_id": business_id,
            "contractor_id": business_oid,
            "source_type": source_type,
            "source_id": safe_text(payload.get("sourceId") or payload.get("source_id") or payload.get("recordId") or payload.get("record_id"), ""),
            "action_type": action_type,
            "title": title,
            "found": found,
            "prepared": prepared,
            "why": why,
            "urgency": safe_text(payload.get("urgency") or payload.get("level"), "Owner review"),
            "status": safe_text(payload.get("status"), "open"),
            "payload": payload.get("payload") if isinstance(payload.get("payload"), dict) else {},
            "owner_review_only": True,
            "prepared_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            "created_by": str(user.get("id")),
            "created_at": now(),
            "updated_at": now(),
            "audit": [audit_entry(user, "created", "Command slip created safely")],
        }
        return doc

    async def command_event(user, event_type, slip=None, note=""):
        business_id, business_oid = business_ids(user)
        doc = {
            "business_id": business_id,
            "contractor_id": business_oid,
            "event_type": event_type,
            "title": safe_text((slip or {}).get("title"), "Command event"),
            "detail": safe_text(note, SAFE_RESULT),
            "slip_id": str((slip or {}).get("_id") or (slip or {}).get("id") or ""),
            "safety": SAFE_RESULT,
            "created_by": str(user.get("id")),
            "created_at": now(),
        }
        await db.command_events.insert_one(doc)
        try:
            await db.field_activity_events.insert_one({
                "business_id": business_id,
                "contractor_id": business_oid,
                "event_type": f"command_{event_type}",
                "title": doc["title"],
                "detail": doc["detail"],
                "record_type": "command_slip",
                "record_id": doc["slip_id"],
                "status": "new",
                "source": "command",
                "created_at": now(),
            })
        except Exception:
            pass
        return doc

    async def scoped_rows(user, collection_names, limit=80):
        business_id, business_oid = business_ids(user)
        rows = []
        query = {
            "$or": [
                {"business_id": business_id},
                {"businessId": business_id},
                {"contractor_id": business_oid},
                {"contractor_id": business_id},
                {"owner_id": business_id},
                {"ownerId": business_id},
            ]
        }
        for name in collection_names:
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    cursor = cursor.sort("_id", -1)
                items = await cursor.limit(limit).to_list(limit)
                rows.extend([{**dict(item), "_collection": name} for item in items])
            except Exception:
                continue
        return rows[:limit]

    async def create_engine_slip_once(user, payload):
        business_id, _ = business_ids(user)
        source_type = safe_text(payload.get("source_type") or payload.get("sourceType"), "office_engine")
        action_type = safe_text(payload.get("action_type") or payload.get("actionType"), "owner_review")
        source_id = safe_text(payload.get("source_id") or payload.get("sourceId") or payload.get("record_id"), action_type)
        existing = await db.command_slips.find_one({
            "business_id": business_id,
            "source_type": source_type,
            "action_type": action_type,
            "source_id": source_id,
            "status": {"$in": OPEN_STATUSES},
        })
        if existing:
            return None, doc_out(existing)
        doc = normalize_slip(payload, user)
        doc["office_engine"] = True
        doc["office_role"] = safe_text((payload.get("payload") or {}).get("office_role"), "Office Team") if isinstance(payload.get("payload"), dict) else "Office Team"
        result = await db.command_slips.insert_one(doc)
        doc["_id"] = result.inserted_id
        await command_event(user, "office_engine_prepared", doc, "Office team prepared a Command slip. No real records were changed.")
        return doc_out(doc), None

    def slip_payload(role, source_type, action_type, row, title, found, prepared, why, urgency="Owner review", extra=None):
        row_id = record_id(row, f"{source_type}-{action_type}")
        return {
            "source_type": source_type,
            "action_type": action_type,
            "source_id": row_id,
            "title": title,
            "found": found,
            "prepared": prepared,
            "why": why,
            "urgency": urgency,
            "payload": {
                "office_engine": True,
                "office_role": role,
                "source_collection": safe_text((row or {}).get("_collection"), ""),
                "record_id": row_id,
                "record_title": record_title(row, title),
                "prepared_only": True,
                "owner_review_only": True,
                **(extra or {}),
            },
        }

    async def prepare_office_engine_slips(user):
        created = []
        skipped = []
        seen = set()
        jobs = await scoped_rows(user, ["jobs", "job_records", "appointments", "bookings"], 120)
        invoices = await scoped_rows(user, ["invoices", "invoice_records"], 120)
        clients = await scoped_rows(user, ["clients", "customers"], 80)
        messages = await scoped_rows(user, ["messages", "client_messages", "inbox_messages"], 80)
        timers = await scoped_rows(user, ["time_entries", "timers", "worker_time_entries", "timesheets"], 80)
        settings = await scoped_rows(user, ["businesses", "business_settings", "settings"], 20)

        async def add(payload):
            key = (payload.get("source_type"), payload.get("action_type"), payload.get("source_id"))
            if key in seen:
                return
            seen.add(key)
            item, existing = await create_engine_slip_once(user, payload)
            if item:
                created.append(item)
            elif existing:
                skipped.append(existing)

        unassigned = []
        overdue_or_undated = []
        completed_without_invoice = []
        completed_without_proof = []

        for job in jobs[:60]:
            if is_cancelled(job):
                continue
            title = record_title(job, "job")
            missing_date = not has_value(date_value(job, ["scheduled_date", "schedule_date", "start_date", "date", "due_date", "next_date", "appointment_at"]))
            missing_worker = not has_value(first_value(job, ["worker_id", "assigned_worker_id", "assigned_to", "staff_id", "employee_id", "worker_name"], ""))
            recurring = truthy(first_value(job, ["recurring", "is_recurring", "repeat"], False)) or has_value(first_value(job, ["recurrence", "frequency", "repeat_every"], ""))
            has_next = has_value(first_value(job, ["next_date", "next_run_at", "next_job_date", "next_service_date"], ""))
            has_invoice = truthy(first_value(job, ["invoiced", "invoice_created"], False)) or has_value(first_value(job, ["invoice_id", "invoice_number"], ""))
            has_proof = has_value(first_value(job, ["proof", "proof_url", "completion_photo", "photos", "images", "attachments"], ""))
            has_note = has_value(first_value(job, ["note", "notes", "worker_note", "completion_note", "client_preference"], ""))

            if missing_date and not is_done(job):
                overdue_or_undated.append(job)
                await add(slip_payload("Receptionist", "booking", "prepare_schedule", job, f"Booking needs date: {title}", f"{title} has no clear date on the schedule.", "Receptionist prepared a booking slip with the missing date flagged for owner approval.", "Owner chooses the date, edits it, asks the client, or parks it before anything is booked.", "Needs check"))
            if missing_worker and not is_done(job):
                unassigned.append(job)
                await add(slip_payload("Receptionist", "booking", "assign_worker_review", job, f"Job needs worker: {title}", f"{title} has no clear worker assigned.", "Receptionist prepared a staff assignment slip for owner review.", "Owner approves the worker assignment before the job is changed.", "Needs check"))
            if recurring and not has_next:
                await add(slip_payload("Receptionist", "booking", "prepare_recurring_next_date", job, f"Recurring job needs next date: {title}", f"{title} looks recurring but has no next date ready.", "Receptionist prepared the next recurring booking decision.", "Owner approves, edits, or parks the recurring schedule before anything changes.", "Next"))
            if is_done(job) and not has_invoice:
                completed_without_invoice.append(job)
                await add(slip_payload("Bookkeeper", "money", "prepare_invoice", job, f"Completed job needs invoice: {title}", f"{title} is completed but no invoice is linked.", "Bookkeeper prepared an invoice review slip from the completed work.", "Owner approves the invoice direction before any invoice is sent or record is changed.", "Top priority"))
            if is_done(job) and not has_proof:
                completed_without_proof.append(job)
                await add(slip_payload("Quality Checker", "quality", "request_completion_proof", job, f"Completed job needs proof: {title}", f"{title} is completed but proof/photos are missing.", "Quality Checker prepared a proof request for owner approval.", "Owner decides whether to request proof, review completion, or park it.", "Needs check"))
            if has_note:
                await add(slip_payload("Client Memory", "client_memory", "prepare_client_memory", job, f"Client memory found: {title}", f"A job note may be useful for the client record on {title}.", "Client Memory prepared a client-memory update slip.", "Owner approves, edits, ignores, or parks the memory before records change.", "Low risk"))

        for invoice in invoices[:60]:
            title = record_title(invoice, "invoice")
            status = status_text(invoice)
            balance = amount_value(first_value(invoice, ["balance_due", "amount_due", "balance", "outstanding"], 0))
            total = amount_value(first_value(invoice, ["total", "amount", "price", "invoice_total"], 0))
            has_payment_link = has_value(first_value(invoice, ["payment_link", "payment_url", "pay_url", "checkout_url", "public_invoice_url"], ""))
            tax_known = has_value(first_value(invoice, ["gst", "gst_amount", "tax", "tax_amount", "tax_rate", "gst_rate"], ""))
            export_ready = lower(first_value(invoice, ["accounting_status", "export_status", "sync_status"], ""))

            if status in {"draft", "ready", "completed", "complete"}:
                await add(slip_payload("Bookkeeper", "money", "review_invoice_draft", invoice, f"Invoice draft needs owner check: {title}", f"{title} is {status or 'ready'} and needs owner review.", "Bookkeeper prepared the invoice direction for Command.", "Owner approves, edits, or parks before anything is sent or changed.", "Owner review"))
            if balance > 0 or any(word in status for word in ["overdue", "unpaid", "past"]):
                await add(slip_payload("Bookkeeper", "money", "prepare_payment_follow_up", invoice, f"Payment follow-up needed: {title}", f"{title} has an outstanding balance or unpaid status.", "Bookkeeper prepared a payment follow-up decision for owner review.", "Owner approves the follow-up before any message is sent or payment status changes.", "Top priority"))
            if total > 0 and not has_payment_link:
                await add(slip_payload("Bookkeeper", "money", "prepare_payment_link", invoice, f"Payment link missing: {title}", f"{title} has a value but no approved payment link is attached.", "Bookkeeper prepared a payment-link request for owner approval.", "Owner approves the link direction before any customer or worker sees it.", "Needs check"))
            if total > 0 and (not tax_known or export_ready in {"", "pending", "needs_review", "failed", "error"}):
                await add(slip_payload("Accountant", "accounting", "review_accounting_export", invoice, f"Accounting review needed: {title}", f"{title} needs GST/accounting export readiness checked before any ledger sync.", "Accountant prepared a GST/export review slip and bookkeeper handoff.", "Owner approves, sends back to Bookkeeper, exports later, or parks. Nothing is filed or synced automatically.", "Accounting check"))

        for timer in timers[:50]:
            title = record_title(timer, "time entry")
            started = first_value(timer, ["started_at", "start", "clock_in", "start_time"], "")
            ended = first_value(timer, ["ended_at", "end", "clock_out", "end_time"], "")
            duration = amount_value(first_value(timer, ["hours", "duration_hours", "duration"], 0))
            if has_value(started) and not has_value(ended):
                await add(slip_payload("Payroll Clerk", "staff", "review_open_timer", timer, f"Timer still open: {title}", f"{title} has a start time but no clear clock-off.", "Payroll Clerk prepared an hours review slip.", "Owner approves the correction direction before hours or payroll records change.", "Needs check"))
            if duration > 10:
                await add(slip_payload("Payroll Clerk", "staff", "review_odd_hours", timer, f"Odd hours need review: {title}", f"{title} shows a long time entry that may need checking.", "Payroll Clerk prepared an odd-hours review slip.", "Owner approves, edits notes, asks staff, or parks before payroll is changed.", "Needs check"))

        for message in messages[:40]:
            title = record_title(message, "message")
            direction = lower(first_value(message, ["direction", "type", "message_type"], ""))
            reply_status = lower(first_value(message, ["reply_status", "status", "state"], ""))
            body = safe_text(first_value(message, ["body", "message", "text", "note"], ""), "Message needs review")
            if any(word in direction for word in ["inbound", "customer", "client"]) or any(word in reply_status for word in ["unread", "needs_reply", "open", "waiting"]):
                await add(slip_payload("Receptionist", "message", "prepare_reply", message, f"Reply needs approval: {title}", f"Message needs a reply: {body}", "Receptionist prepared a reply/follow-up slip for Command.", "Owner approves or edits the reply before any message is sent.", "Needs check"))
            if body and any(word in body.lower() for word in ["gate", "code", "dog", "key", "access", "prefers", "preference", "always", "never"]):
                await add(slip_payload("Client Memory", "client_memory", "save_preference_review", message, f"Client detail found: {title}", f"Message may contain a useful access or preference detail.", "Client Memory prepared a safe client-note update.", "Owner approves or edits before client records change.", "Low risk"))

        for client in clients[:40]:
            title = record_title(client, "client")
            missing_contact = not has_value(first_value(client, ["email", "phone", "mobile"], ""))
            missing_address = not has_value(first_value(client, ["address", "site_address", "service_address"], ""))
            if missing_contact or missing_address:
                await add(slip_payload("Client Memory", "clients", "complete_client_record", client, f"Client record needs detail: {title}", f"{title} is missing contact or service details.", "Client Memory prepared a record-cleanup slip.", "Owner approves the cleanup direction before records change.", "Low risk"))

        for setting in settings[:5]:
            title = record_title(setting, "business settings")
            gst_rate = first_value(setting, ["gst_rate", "tax_rate", "default_tax_rate"], "")
            if not has_value(gst_rate):
                await add(slip_payload("Accountant", "accounting", "review_tax_settings", setting, f"GST setting needs review: {title}", "The business does not have a clear GST/tax rate available to Command.", "Accountant prepared a GST settings review slip.", "Owner confirms the GST setting before future invoice/accounting decisions rely on it.", "Accounting check"))

        if len(unassigned) >= 2 or len(overdue_or_undated) >= 3 or len(completed_without_invoice) >= 2 or len(completed_without_proof) >= 2:
            await add(slip_payload("Operations Manager", "operations", "review_pattern", {"_id": "ops-pattern", "title": "Operations pattern", "_collection": "office_engine"}, "Operations pattern needs owner review", "Churvox found repeated gaps across jobs, invoices, workers or proof.", "Operations Manager prepared a pattern/rule suggestion for Command.", "Owner approves, edits, or parks any process change before rules change.", "Pattern", {"unassigned": len(unassigned), "undated": len(overdue_or_undated), "completed_without_invoice": len(completed_without_invoice), "completed_without_proof": len(completed_without_proof)}))

        if created:
            await add(slip_payload("Office Manager", "office_manager", "daily_queue_brief", {"_id": f"daily-{now().date()}", "title": "Daily Command queue", "_collection": "office_engine"}, "Office Manager sorted today’s Command queue", f"The office team prepared {len(created)} owner decisions from live records.", "Office Manager prepared the daily owner briefing for Command.", "Owner opens Command and approves, edits, snoozes or parks the prepared slips.", "Owner review", {"created_count": len(created)}))

        return created, skipped

    @router.get("/command/slips")
    async def list_command_slips(request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        items = await db.command_slips.find({"business_id": business_id, "status": {"$in": OPEN_STATUSES}}).sort("created_at", -1).limit(200).to_list(200)
        return {"success": True, "slips": [doc_out(item) for item in items], "safety": SAFE_RESULT}

    @router.post("/command/slips")
    async def create_command_slip(payload: Dict[str, Any], request: Request):
        user = await require_owner(request)
        doc = normalize_slip(payload or {}, user)
        result = await db.command_slips.insert_one(doc)
        doc["_id"] = result.inserted_id
        await command_event(user, "created", doc, "Command slip prepared for owner review only")
        return {"success": True, "slip": doc_out(doc), "safety": SAFE_RESULT}

    @router.post("/command/worker-payment-request")
    async def create_worker_payment_request(payload: Dict[str, Any], request: Request):
        user = await require_command_participant(request)
        job_title = safe_text(payload.get("job_title") or payload.get("title"), "Worker payment request")
        amount = safe_text(payload.get("amount") or payload.get("amount_due"), "Amount needs owner check")
        invoice_number = safe_text(payload.get("invoice") or payload.get("invoice_number"), "No invoice linked")
        customer = safe_text(payload.get("customer") or payload.get("customer_name"), "Customer")
        doc = normalize_slip({
            "source_type": "worker_payment",
            "action_type": "prepare_payment_link",
            "title": f"Worker payment link request: {job_title}",
            "found": f"Worker asked to take card payment for {customer}. Amount: {amount}. Invoice: {invoice_number}.",
            "prepared": "Prepare or attach an approved invoice payment link for the worker. Nothing was sent, synced, charged or changed.",
            "why": "Owner approval is required before a worker can show a payment link or collect card payment.",
            "urgency": "Owner review",
            "payload": {
                "worker_payment_request": True,
                "job_title": job_title,
                "amount": amount,
                "invoice": invoice_number,
                "customer": customer,
                "payment_link": safe_text(payload.get("payment_link"), ""),
                "prepared_only": True,
                "owner_review_only": True,
            },
        }, user)
        doc["requested_by_worker"] = True
        doc["worker_user_id"] = str(user.get("id") or user.get("_id") or "")
        result = await db.command_slips.insert_one(doc)
        doc["_id"] = result.inserted_id
        await command_event(user, "worker_payment_requested", doc, "Worker payment link request prepared for owner review only")
        return {"success": True, "slip": doc_out(doc), "safety": SAFE_RESULT, "message": "Payment link request sent to Command. No card was charged."}

    @router.post("/command/worker-update-request")
    async def create_worker_update_request(payload: Dict[str, Any], request: Request):
        user = await require_command_participant(request)
        job_title = safe_text(payload.get("job_title") or payload.get("title"), "Worker update")
        update_text = safe_text(payload.get("update") or payload.get("note") or payload.get("message"), "Worker sent an update.")
        update_type = safe_text(payload.get("update_type") or payload.get("type"), "Worker update")
        status = safe_text(payload.get("status"), "Owner review")
        doc = normalize_slip({
            "source_type": "worker_update",
            "action_type": "review_worker_update",
            "title": f"Worker update: {job_title}",
            "found": f"{update_type}: {update_text}",
            "prepared": "Review the worker update in Command before changing records, messaging the customer, charging, sending, or syncing anything.",
            "why": "Owner approval is required before any worker update changes a job, invoice, client note, message or payment status.",
            "urgency": status,
            "payload": {
                "worker_update_request": True,
                "job_title": job_title,
                "update": update_text,
                "update_type": update_type,
                "status": status,
                "prepared_only": True,
                "owner_review_only": True,
            },
        }, user)
        doc["requested_by_worker"] = True
        doc["worker_user_id"] = str(user.get("id") or user.get("_id") or "")
        result = await db.command_slips.insert_one(doc)
        doc["_id"] = result.inserted_id
        await command_event(user, "worker_update_requested", doc, "Worker update prepared for owner review only")
        return {"success": True, "slip": doc_out(doc), "safety": SAFE_RESULT, "message": "Worker update sent to Command. Nothing was sent, synced, charged or changed."}

    @router.post("/command/scan")
    async def scan_command_slips(request: Request, payload: Optional[Dict[str, Any]] = None):
        user = await require_owner(request)
        created, skipped = await prepare_office_engine_slips(user)
        await command_event(user, "scan_requested", None, f"Office team scan prepared {len(created)} Command slips and kept {len(skipped)} existing open slips. No real records were changed.")
        return {"success": True, "slips": created, "existing": skipped, "created_count": len(created), "existing_count": len(skipped), "message": f"Office team prepared {len(created)} Command slip(s). Owner approval is required before anything real happens.", "safety": SAFE_RESULT}

    @router.patch("/command/slips/{slip_id}/edit")
    async def edit_command_slip(slip_id: str, payload: Dict[str, Any], request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        allowed = {"title", "found", "prepared", "why", "urgency", "payload", "owner_note"}
        update = {key: value for key, value in (payload or {}).items() if key in allowed}
        update["status"] = "edited"
        update["updated_at"] = now()
        update_entry = audit_entry(user, "edited", payload.get("owner_note") if isinstance(payload, dict) else "")
        result = await db.command_slips.update_one({"_id": oid(slip_id, "slip"), "business_id": business_id}, {"$set": update, "$push": {"audit": update_entry}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Command slip not found")
        slip = await db.command_slips.find_one({"_id": oid(slip_id, "slip"), "business_id": business_id})
        await command_event(user, "edited", slip, "Command slip edited. No real action taken.")
        return {"success": True, "slip": doc_out(slip), "safety": SAFE_RESULT}

    @router.post("/command/slips/{slip_id}/approve")
    async def approve_command_slip(slip_id: str, request: Request, payload: Optional[Dict[str, Any]] = None):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        slip = await db.command_slips.find_one({"_id": oid(slip_id, "slip"), "business_id": business_id})
        if not slip:
            raise HTTPException(status_code=404, detail="Command slip not found")
        note = (payload or {}).get("note") or (payload or {}).get("owner_note") or "Owner approved the prepared direction."
        update = {
            "status": "approved_recorded",
            "approved_at": now(),
            "approved_by": str(user.get("id")),
            "owner_decision": {"action": (payload or {}).get("action") or "approve", "note": safe_text(note), "safety": SAFE_RESULT},
            "result": {"stored_only": True, "message": SAFE_RESULT},
            "updated_at": now(),
        }
        await db.command_slips.update_one({"_id": slip["_id"]}, {"$set": update, "$push": {"audit": audit_entry(user, "approved_recorded", note)}})
        slip.update(update)
        await command_event(user, "approved_recorded", slip, SAFE_RESULT)
        return {"success": True, "slip": doc_out(slip), "result": update["result"], "safety": SAFE_RESULT}

    @router.post("/command/slips/{slip_id}/snooze")
    async def snooze_command_slip(slip_id: str, request: Request, payload: Optional[Dict[str, Any]] = None):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        hours = int((payload or {}).get("hours") or 24)
        snooze_until = now() + timedelta(hours=max(1, min(hours, 720)))
        result = await db.command_slips.update_one({"_id": oid(slip_id, "slip"), "business_id": business_id}, {"$set": {"status": "snoozed", "snooze_until": snooze_until, "updated_at": now()}, "$push": {"audit": audit_entry(user, "snoozed", f"Snoozed until {snooze_until.isoformat()}")}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Command slip not found")
        slip = await db.command_slips.find_one({"_id": oid(slip_id, "slip"), "business_id": business_id})
        await command_event(user, "snoozed", slip, "Command slip snoozed. No real action taken.")
        return {"success": True, "slip": doc_out(slip), "safety": SAFE_RESULT}

    @router.post("/command/slips/{slip_id}/ignore")
    async def ignore_command_slip(slip_id: str, request: Request, payload: Optional[Dict[str, Any]] = None):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        note = (payload or {}).get("note") or "Owner ignored this Command slip."
        result = await db.command_slips.update_one({"_id": oid(slip_id, "slip"), "business_id": business_id}, {"$set": {"status": "ignored", "ignored_at": now(), "ignored_by": str(user.get("id")), "updated_at": now()}, "$push": {"audit": audit_entry(user, "ignored", note)}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Command slip not found")
        slip = await db.command_slips.find_one({"_id": oid(slip_id, "slip"), "business_id": business_id})
        await command_event(user, "ignored", slip, "Command slip ignored. No real action taken.")
        return {"success": True, "slip": doc_out(slip), "safety": SAFE_RESULT}

    @router.get("/command/events")
    async def list_command_events(request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        items = await db.command_events.find({"business_id": business_id}).sort("created_at", -1).limit(200).to_list(200)
        return {"success": True, "events": [doc_out(item) for item in items], "safety": SAFE_RESULT}

    @router.get("/command/audit")
    async def list_command_audit(request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        slips = await db.command_slips.find({"business_id": business_id, "audit": {"$exists": True}}).sort("updated_at", -1).limit(200).to_list(200)
        audit = []
        for slip in slips:
            for entry in slip.get("audit") or []:
                item = serial(entry)
                item["slip_id"] = str(slip.get("_id"))
                item["title"] = slip.get("title")
                audit.append(item)
        return {"success": True, "audit": audit[:200], "safety": SAFE_RESULT}

    return router
