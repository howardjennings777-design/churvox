from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Request


SAFE_RESULT = "Owner approval required. Nothing was sent, synced, charged or changed."
OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]


def build_command_mimic_intelligence_router(db, get_current_user, ObjectId):
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
        out = dict(doc or {})
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
            raise HTTPException(status_code=403, detail="Only owners/admins can run Command intelligence")
        return user

    def business_ids(user):
        business_id = str(user.get("business_id") or user.get("id"))
        return business_id, oid(business_id, "business")

    def clean(value, fallback=""):
        text = " ".join(str(value or "").strip().split())
        return text[:900] or fallback

    def lower(value):
        return clean(value, "").lower()

    def has_value(value):
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        if isinstance(value, (list, tuple, set, dict)):
            return bool(value)
        return True

    def first(row: Dict[str, Any], keys: List[str], fallback=""):
        for key in keys:
            value = (row or {}).get(key)
            if has_value(value):
                return value
        return fallback

    def truthy(value):
        if isinstance(value, bool):
            return value
        return lower(value) in {"1", "true", "yes", "y", "active", "enabled", "done", "complete", "completed"}

    def rec_id(row, fallback="record"):
        return clean(first(row, ["_id", "id", "job_id", "invoice_id", "client_id", "message_id", "timer_id", "record_id"], fallback), fallback)

    def title_of(row, fallback="record"):
        return clean(first(row, ["title", "job_title", "name", "client_name", "customer_name", "invoice_number", "number", "subject", "description"], fallback), fallback)

    def amount(value):
        try:
            return float(str(value or "0").replace("$", "").replace(",", ""))
        except Exception:
            return 0.0

    def money(value):
        num = amount(value)
        if num <= 0:
            return ""
        return f"${num:,.2f}"

    def parse_date(value) -> Optional[datetime]:
        if isinstance(value, datetime):
            return value
        text = clean(value, "")
        if not text:
            return None
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(text[:19], fmt).replace(tzinfo=timezone.utc)
            except Exception:
                continue
        return None

    def status(row):
        return lower(first(row, ["status", "job_status", "invoice_status", "payment_status", "state"], ""))

    def is_done(row):
        return any(word in status(row) for word in ["complete", "completed", "done", "finished", "closed"])

    def is_cancelled(row):
        return any(word in status(row) for word in ["cancel", "deleted", "archived"])

    async def scoped_rows(user, collection_names, limit=100):
        business_id, business_oid = business_ids(user)
        query = {"$or": [
            {"business_id": business_id}, {"businessId": business_id},
            {"contractor_id": business_oid}, {"contractor_id": business_id},
            {"owner_id": business_id}, {"ownerId": business_id},
        ]}
        rows = []
        for name in collection_names:
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    cursor = cursor.sort("_id", -1)
                found = await cursor.limit(limit).to_list(limit)
                rows.extend([{**dict(item), "_collection": name} for item in found])
            except Exception:
                continue
        return rows[:limit]

    def client_key(row):
        return clean(first(row, ["client_id", "customer_id", "client", "customer", "client_name", "customer_name", "name"], ""), "")

    def client_name(row, fallback="Client not named in record"):
        return clean(first(row, ["client_name", "customer_name", "client", "customer", "name"], fallback), fallback)

    def worker_name(row, fallback="Worker not named in record"):
        return clean(first(row, ["worker_name", "assigned_worker_name", "staff_name", "employee_name", "worker", "assigned_to"], fallback), fallback)

    def job_price(row):
        return amount(first(row, ["price", "amount", "total", "quoted_price", "job_total", "charge", "base_price"], 0))

    def job_date(row):
        return first(row, ["scheduled_date", "schedule_date", "start_date", "date", "due_date", "appointment_at", "completed_at", "updated_at", "created_at"], "")

    def note_text(row):
        return clean(first(row, ["worker_note", "completion_note", "note", "notes", "description", "message", "body", "text", "client_preference"], ""), "")

    def evidence(*items):
        return [clean(item, "") for item in items if clean(item, "")]

    def confidence(score, reasons):
        score = max(0.1, min(float(score), 0.99))
        return {"score": round(score, 2), "why": reasons[:4]}

    def source(value, from_text, conf=0.8, missing_action=""):
        return {
            "value": value,
            "source": from_text,
            "confidence": conf,
            "missing_action": missing_action,
        }

    def field_value(value):
        if isinstance(value, dict) and "value" in value:
            return value.get("value")
        return value

    def record_doc(user, title, role, source_type, action_type, row, problem, recommendation, evidence_rows, prepared_form, missing=None, confidence_data=None, actions=None, will_do=None, urgency="Owner review"):
        business_id, business_oid = business_ids(user)
        row_id = rec_id(row, f"{source_type}-{action_type}")
        missing = missing or []
        actions = actions or ["Approve draft", "Edit draft", "Ask staff", "Park"]
        will_do = will_do or ["Save the approved draft only", "Keep send, sync and charge locked", "Record owner approval trail"]
        form_flat = {key: field_value(value) for key, value in prepared_form.items()}
        payload = {
            "mimic_intelligence_v1": True,
            "office_engine": True,
            "office_role": role,
            "problem": problem,
            "recommendation": recommendation,
            "evidence": evidence_rows,
            "missing": missing,
            "confidence": confidence_data or confidence(0.72, ["Record matched rule", "Owner can edit before approval"]),
            "prepared_form": form_flat,
            "field_sources": prepared_form,
            "actions": actions,
            "will_do": will_do,
            "source_collection": clean(row.get("_collection"), ""),
            "record_id": row_id,
            "record_title": title_of(row, title),
            "prepared_only": True,
            "owner_review_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
        }
        return {
            "business_id": business_id,
            "contractor_id": business_oid,
            "source_type": source_type,
            "source_id": row_id,
            "action_type": action_type,
            "title": title,
            "found": problem,
            "prepared": recommendation,
            "why": "Owner approves or edits the prepared draft before anything changes.",
            "urgency": urgency,
            "status": "open",
            "payload": payload,
            "owner_review_only": True,
            "prepared_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            "office_engine": True,
            "office_role": role,
            "created_by": str(user.get("id")),
            "created_at": now(),
            "updated_at": now(),
            "audit": [{"by": str(user.get("id")), "role": str(user.get("role") or "owner"), "action": "mimic_prepared", "note": "Mimic prepared evidence-backed owner approval slip", "at": now(), "safety": SAFE_RESULT}],
        }

    async def insert_once(user, doc):
        existing = await db.command_slips.find_one({
            "business_id": doc["business_id"],
            "source_type": doc["source_type"],
            "action_type": doc["action_type"],
            "source_id": doc["source_id"],
            "status": {"$in": OPEN_STATUSES},
        })
        if existing:
            return None, doc_out(existing)
        result = await db.command_slips.insert_one(doc)
        doc["_id"] = result.inserted_id
        try:
            await db.command_events.insert_one({
                "business_id": doc["business_id"],
                "contractor_id": doc["contractor_id"],
                "event_type": "mimic_intelligence_prepared",
                "title": doc["title"],
                "detail": doc["prepared"],
                "slip_id": str(result.inserted_id),
                "safety": SAFE_RESULT,
                "created_by": doc["created_by"],
                "created_at": now(),
            })
        except Exception:
            pass
        return doc_out(doc), None

    def similar_extra_amount(jobs, text):
        if not text:
            return 0
        for row in jobs:
            note = note_text(row).lower()
            if "green waste" in text.lower() and "green waste" in note:
                value = amount(first(row, ["extra_amount", "extras_total", "extra", "additional_charge"], 0))
                if value > 0:
                    return value
        return 0

    def build_invoice_slip(user, job, jobs):
        title = title_of(job, "completed job")
        client = client_name(job)
        base = job_price(job)
        note = note_text(job)
        extra = amount(first(job, ["extra_amount", "extras_total", "additional_charge"], 0))
        if extra <= 0 and "green waste" in note.lower():
            extra = similar_extra_amount(jobs, note)
        subtotal = base + max(extra, 0)
        gst_rate = amount(first(job, ["gst_rate", "tax_rate"], 0.15)) or 0.15
        gst = subtotal * gst_rate if subtotal > 0 else 0
        total = subtotal + gst if subtotal > 0 else 0
        missing = []
        if client.startswith("Client not named"):
            missing.append("Client name is missing from the completed job. Owner must choose the client before approval.")
        if base <= 0:
            missing.append("Base job price is missing. Owner must enter the price before approving invoice draft.")
        if "green waste" in note.lower() and extra <= 0:
            missing.append("Green-waste extra is mentioned but no historic/recorded amount was found. Owner must enter the extra amount.")
        prepared = {
            "Client": source(client, "completed job client field", 0.95 if not client.startswith("Client not named") else 0.35, "Choose client"),
            "Job": source(title, "completed job title", 0.98),
            "Line items": source([x for x in [
                {"label": "Base service", "amount": money(base) or "Owner to enter"},
                {"label": "Green waste extra", "amount": money(extra) or "Owner to enter"} if "green waste" in note.lower() else None,
            ] if x], "job price + worker completion note + previous similar extras", 0.86 if subtotal > 0 else 0.45),
            "GST": source(money(gst) or "Calculated after amount is entered", "GST rate from job/business settings", 0.82 if subtotal > 0 else 0.45),
            "Draft total": source(money(total) or "Owner must enter price before approval", "subtotal + GST", 0.82 if total > 0 else 0.35, "Enter amount"),
            "Payment link": source("Hold until invoice draft is approved", "safety rule", 0.99),
            "Invoice note": source("Bookkeeper prepared invoice draft. Extra stays as its own line and invoice is not sent until owner approval.", "Bookkeeper rule", 0.92),
        }
        return record_doc(
            user,
            f"Invoice draft ready: {title}",
            "Bookkeeper",
            "money",
            "prepare_invoice",
            job,
            f"{title} is complete and needs an invoice draft before money follow-up.",
            "Prepare an invoice draft with real line items, totals and GST where data exists. Hold sending/payment link until owner approval.",
            evidence(f"Job status: {status(job) or 'completed'}", f"Client: {client}", f"Worker note: {note}" if note else "No worker note found", f"Base price: {money(base) or 'missing'}", f"Extra: {money(extra) or 'missing/not found'}"),
            prepared,
            missing,
            confidence(0.9 if total > 0 and not missing else 0.55, ["Completed job found", "Invoice missing", "Amounts checked", "Owner can edit before approval"]),
            ["Approve invoice draft", "Edit invoice", "Ask staff", "Park"],
            ["Save invoice draft only", "Use edited fields as approved draft", "Keep send, sync and charge locked"],
            "Top priority",
        )

    def build_booking_slip(user, job, jobs):
        title = title_of(job, "recurring job")
        client = client_name(job)
        worker = worker_name(job)
        last_dt = parse_date(job_date(job))
        next_dt = last_dt + timedelta(weeks=3) if last_dt else None
        next_label = next_dt.strftime("%A %d %B %Y") if next_dt else "Owner to choose date — no reliable last date found"
        same_worker_count = 0
        ckey = client_key(job)
        for row in jobs:
            if ckey and client_key(row) == ckey and worker_name(row, "") == worker:
                same_worker_count += 1
        missing = []
        if client.startswith("Client not named"):
            missing.append("Client is missing. Owner must choose the client before booking.")
        if not last_dt:
            missing.append("Last visit date was not found. Owner must choose the next booking date.")
        if worker.startswith("Worker not named"):
            missing.append("Worker is missing. Owner must choose worker or ask client later.")
        prepared = {
            "Client": source(client, "recurring job/client history", 0.94 if not client.startswith("Client not named") else 0.35),
            "Usual cycle": source("Every 3 weeks", "recurring rule or repeated booking pattern", 0.82),
            "Last visit": source(last_dt.strftime("%A %d %B %Y") if last_dt else "Missing from records", "last scheduled/completed job date", 0.84 if last_dt else 0.25, "Choose date"),
            "Suggested booking date/time": source(next_label, "last visit + 3-week cycle", 0.82 if last_dt else 0.25, "Pick exact date/time"),
            "Worker": source(worker, f"same worker appeared on {same_worker_count} matching client job(s)" if same_worker_count else "worker field on this job", 0.88 if not worker.startswith("Worker not named") else 0.25, "Choose worker"),
            "Prepared customer message": source(f"Hi {client if not client.startswith('Client not named') else ''}, we can book your next visit for {next_label}. Does that suit?".strip(), "Receptionist generated from cycle/date", 0.8 if last_dt else 0.45),
            "Internal note": source("Receptionist prepared next booking because the repeat cycle has no future appointment recorded.", "booking scanner", 0.9),
        }
        return record_doc(
            user,
            f"Next booking plan ready: {title}",
            "Receptionist",
            "booking",
            "prepare_recurring_next_date",
            job,
            f"{title} appears recurring but has no next booking ready.",
            "Prepare the next booking from the repeat cycle, client history and worker history. Hold any client message until owner approval.",
            evidence(f"Client: {client}", f"Last visit: {prepared['Last visit']['value']}", f"Suggested next: {next_label}", f"Worker: {worker}"),
            prepared,
            missing,
            confidence(0.86 if not missing else 0.55, ["Recurring pattern found", "Last visit checked", "Worker history checked", "Owner can edit date/time"]),
            ["Approve booking plan", "Edit date/time", "Ask client later", "Park"],
            ["Save booking draft only", "Keep customer message unsent", "Use edited date/time as owner-approved draft"],
            "Next",
        )

    def build_hours_slip(user, timer):
        title = title_of(timer, "time entry")
        worker = worker_name(timer)
        duration = amount(first(timer, ["hours", "duration_hours", "duration"], 0))
        start = first(timer, ["started_at", "start", "clock_in", "start_time"], "")
        end = first(timer, ["ended_at", "end", "clock_out", "end_time"], "")
        note = note_text(timer)
        missing = []
        if not has_value(end):
            missing.append("Clock-off time is missing. Ask staff or edit end time before clearing hours.")
        if duration > 10 and not note:
            missing.append("Long timer has no staff reason. Ask staff before payroll review is approved.")
        suggested = "Ask staff for reason before approving" if missing else f"Approve {duration:g} hours if staff note explains the time"
        prepared = {
            "Worker": source(worker, "timer worker field", 0.9 if not worker.startswith("Worker not named") else 0.3),
            "Job / shift": source(title, "timer/job title", 0.9),
            "Start": source(clean(start, "Missing"), "timer start", 0.9 if has_value(start) else 0.2),
            "End": source(clean(end, "Missing — owner should ask staff"), "timer end", 0.9 if has_value(end) else 0.2, "Ask staff / enter end time"),
            "Recorded hours": source(f"{duration:g}" if duration else "Missing", "timer duration", 0.86 if duration else 0.25),
            "Issue": source("Timer is unusually long or incomplete", "payroll rule", 0.9),
            "Recommended action": source(suggested, "Payroll Clerk review", 0.78 if missing else 0.88),
            "Staff note": source(note or "No staff reason recorded", "worker note", 0.8 if note else 0.25, "Ask staff for reason"),
        }
        return record_doc(user, f"Hours review ready: {title}", "Payroll Clerk", "staff", "review_odd_hours", timer, f"{title} has timer data that should not be approved blindly.", "Prepare an hours review with start/end, duration, missing reason and recommended next action.", evidence(f"Worker: {worker}", f"Start: {start or 'missing'}", f"End: {end or 'missing'}", f"Duration: {duration:g}" if duration else "Duration missing", f"Note: {note}" if note else "No note found"), prepared, missing, confidence(0.78 if not missing else 0.52, ["Timer read", "Long/incomplete time found", "Staff note checked"]), ["Approve hours review", "Edit hours/note", "Ask staff", "Park"], ["Save hours review draft", "No payroll payment or tax file", "Use edited hours/note as approved draft"], "Needs check")

    def build_quality_slip(user, job):
        title = title_of(job, "completed job")
        prepared = {
            "Job": source(title, "completed job", 0.95),
            "Missing proof": source("Final proof/photo or completion note", "quality check", 0.9),
            "Staff request": source("Please upload final proof/photo or add the completion note before invoice is cleared.", "Quality Checker", 0.9),
            "Invoice hold": source("Hold invoice until proof is attached unless owner clears it anyway.", "quality rule", 0.86),
        }
        return record_doc(user, f"Proof request ready: {title}", "Quality Checker", "quality", "request_completion_proof", job, f"{title} is complete but proof/completion evidence is missing.", "Prepare a staff proof request and hold invoice decision until owner approves the path.", evidence("Job marked complete", "Proof/photo field is empty", "Owner can override or request staff proof"), prepared, ["Final proof is missing."], confidence(0.88, ["Completed job found", "Proof fields checked", "Invoice safety rule applied"]), ["Request proof", "Clear anyway", "Park"], ["Create staff proof request draft", "Hold invoice by default", "Record owner decision"], "Needs check")

    def build_client_memory_slip(user, row):
        title = title_of(row, "client note")
        note = note_text(row)
        prepared = {
            "Client": source(client_name(row, "Client from source record"), "source job/message", 0.78),
            "Memory note": source(note or "Owner to write useful memory note", "job/message note", 0.8 if note else 0.3, "Edit note"),
            "Use for": source("Future jobs, access, customer preference and reply drafts", "Client Memory rule", 0.9),
            "Source": source(title, "source record", 0.9),
        }
        return record_doc(user, f"Client memory draft ready: {title}", "Client Memory", "client_memory", "prepare_client_memory", row, f"{title} has a note that may help future work.", "Prepare a short client memory note only if it is useful, factual and safe for future jobs.", evidence(f"Source: {title}", f"Note: {note}" if note else "Note missing"), prepared, [] if note else ["Memory wording needs owner edit."], confidence(0.78 if note else 0.45, ["Note found", "Preference/access keywords checked", "Owner can edit"]), ["Save memory", "Edit memory", "Ignore", "Park"], ["Save client memory draft", "Do not overwrite blindly", "Record owner approval"], "Low risk")

    def build_accounting_slip(user, invoice_or_setting):
        title = title_of(invoice_or_setting, "accounting record")
        total = money(first(invoice_or_setting, ["total", "amount", "invoice_total"], 0))
        gst = first(invoice_or_setting, ["gst", "gst_amount", "tax", "tax_amount", "gst_rate", "tax_rate"], "")
        prepared = {
            "Record": source(title, "invoice/business setting", 0.9),
            "Invoice total": source(total or "No total found", "invoice total", 0.84 if total else 0.3, "Check amount"),
            "GST / tax": source(clean(gst, "Missing — owner/accountant must confirm"), "GST/tax fields", 0.85 if has_value(gst) else 0.25, "Confirm GST"),
            "Export status": source("Review only — Xero/MYOB sync locked", "accounting safety rule", 0.98),
            "Recommendation": source("Accountant checks GST/export risk, then sends back to Bookkeeper if invoice needs correction.", "Accountant rule", 0.9),
        }
        missing = [] if has_value(gst) else ["GST/tax setting missing or unclear."]
        return record_doc(user, f"Accounting review ready: {title}", "Accountant", "accounting", "review_accounting_export", invoice_or_setting, f"{title} needs accounting/GST review before any export or sync.", "Check GST, export readiness and sync risk. Nothing is filed, exported or synced without owner approval.", evidence(f"Record: {title}", f"Total: {total or 'missing'}", f"GST/tax: {gst or 'missing'}", "Sync locked"), prepared, missing, confidence(0.82 if not missing else 0.52, ["Accounting fields checked", "Sync safety applied", "Owner approval required"]), ["Approve accounting review", "Send to Bookkeeper", "Export later", "Park"], ["Save accounting review draft", "Keep Xero/MYOB sync locked", "Record owner approval"], "Accounting check")

    @router.post("/command/scan")
    async def run_mimic_intelligence_scan(payload: Optional[Dict[str, Any]] = None, request: Request = None):
        user = await require_owner(request)
        jobs = await scoped_rows(user, ["jobs", "job_records", "appointments", "bookings"], 160)
        invoices = await scoped_rows(user, ["invoices", "invoice_records"], 120)
        messages = await scoped_rows(user, ["messages", "client_messages", "inbox_messages"], 80)
        timers = await scoped_rows(user, ["time_entries", "timers", "worker_time_entries", "timesheets"], 80)
        settings = await scoped_rows(user, ["businesses", "business_settings", "settings"], 20)
        candidates = []
        for job in jobs[:80]:
            if is_cancelled(job):
                continue
            has_invoice = truthy(first(job, ["invoiced", "invoice_created"], False)) or has_value(first(job, ["invoice_id", "invoice_number"], ""))
            has_proof = has_value(first(job, ["proof", "proof_url", "completion_photo", "photos", "images", "attachments"], ""))
            recurring = truthy(first(job, ["recurring", "is_recurring", "repeat"], False)) or has_value(first(job, ["recurrence", "frequency", "repeat_every"], ""))
            has_next = has_value(first(job, ["next_date", "next_run_at", "next_job_date", "next_service_date"], ""))
            if is_done(job) and not has_invoice:
                candidates.append(build_invoice_slip(user, job, jobs))
            if recurring and not has_next:
                candidates.append(build_booking_slip(user, job, jobs))
            if is_done(job) and not has_proof:
                candidates.append(build_quality_slip(user, job))
            if note_text(job) and any(word in note_text(job).lower() for word in ["gate", "dog", "key", "access", "prefers", "always", "never", "colour", "color", "code"]):
                candidates.append(build_client_memory_slip(user, job))
        for timer in timers[:60]:
            duration = amount(first(timer, ["hours", "duration_hours", "duration"], 0))
            ended = first(timer, ["ended_at", "end", "clock_out", "end_time"], "")
            if duration > 10 or not has_value(ended):
                candidates.append(build_hours_slip(user, timer))
        for invoice in invoices[:60]:
            st = status(invoice)
            total = amount(first(invoice, ["total", "amount", "price", "invoice_total"], 0))
            gst_known = has_value(first(invoice, ["gst", "gst_amount", "tax", "tax_amount", "gst_rate", "tax_rate"], ""))
            export_status = lower(first(invoice, ["accounting_status", "export_status", "sync_status"], ""))
            if total > 0 and (not gst_known or export_status in {"", "pending", "needs_review", "failed", "error"}):
                candidates.append(build_accounting_slip(user, invoice))
            if any(word in st for word in ["overdue", "unpaid", "past"]):
                # Payment follow-up uses Bookkeeper invoice logic when invoice data exists.
                candidates.append(build_invoice_slip(user, {**invoice, "status": st, "title": title_of(invoice, "invoice")}, jobs))
        for setting in settings[:8]:
            if not has_value(first(setting, ["gst_rate", "tax_rate", "default_tax_rate"], "")):
                candidates.append(build_accounting_slip(user, setting))
        for message in messages[:50]:
            body = note_text(message)
            if body and any(word in body.lower() for word in ["gate", "dog", "key", "access", "prefers", "always", "never", "code"]):
                candidates.append(build_client_memory_slip(user, message))
        created = []
        existing = []
        seen = set()
        for doc in candidates[:80]:
            key = (doc["source_type"], doc["action_type"], doc["source_id"])
            if key in seen:
                continue
            seen.add(key)
            item, old = await insert_once(user, doc)
            if item:
                created.append(item)
            elif old:
                existing.append(old)
        return {
            "success": True,
            "source": "mimic-intelligence-engine",
            "created_count": len(created),
            "existing_count": len(existing),
            "slips": created,
            "existing": existing,
            "message": f"Mimic intelligence checked live records and prepared {len(created)} evidence-backed Command slip(s).",
            "safety": SAFE_RESULT,
        }

    return router
