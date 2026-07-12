import asyncio
from collections import Counter
from datetime import datetime, timezone, timedelta
from statistics import median
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request


SAFE_RESULT = "Owner approval required. Nothing was sent, synced, charged or changed."
OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]
OWNER_ROLES = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}


def build_command_human_mimic_router(db, get_current_user, ObjectId):
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

    def clean(value, fallback="", limit=1200):
        try:
            text = " ".join(str(value or "").strip().split())
        except Exception:
            text = ""
        return text[:limit] or fallback

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

    def first(row, keys, fallback=""):
        for key in keys:
            value = (row or {}).get(key)
            if has_value(value):
                return value
        return fallback

    def truthy(value):
        if isinstance(value, bool):
            return value
        return lower(value) in {"1", "true", "yes", "y", "active", "enabled", "done", "complete", "completed", "included"}

    def maybe_object_id(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def require_owner(request: Request):
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated")
        role = lower((user or {}).get("role"))
        if role not in OWNER_ROLES and not (user or {}).get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can run Command intelligence")
        return user

    def business_scope(user):
        business_id = clean((user or {}).get("business_id") or (user or {}).get("id"), "")
        if not business_id:
            raise HTTPException(status_code=400, detail="Business id is missing")
        business_oid = maybe_object_id(business_id)
        clauses = []
        for key in ["business_id", "businessId", "contractor_id", "owner_id", "ownerId"]:
            clauses.append({key: business_id})
            if business_oid is not None:
                clauses.append({key: business_oid})
        return business_id, business_oid, {"$or": clauses}

    async def scoped_rows(user, collection_names, limit=120, errors=None):
        _, _, query = business_scope(user)

        async def load_collection(name):
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    cursor = cursor.sort("_id", -1)
                found = await asyncio.wait_for(cursor.limit(limit).to_list(limit), timeout=5)
                return [{**dict(item), "_collection": name} for item in found]
            except Exception as exc:
                if errors is not None:
                    errors.append(f"{name}: {exc.__class__.__name__}")
                return []

        batches = await asyncio.gather(*(load_collection(name) for name in collection_names))
        rows = []
        for batch in batches:
            rows.extend(batch)
        return rows[:limit]

    def rec_id(row, fallback="record"):
        return clean(first(row, ["_id", "id", "job_id", "invoice_id", "client_id", "message_id", "timer_id", "record_id"], fallback), fallback, 180)

    def title_of(row, fallback="record"):
        return clean(first(row, ["title", "job_title", "name", "client_name", "customer_name", "invoice_number", "number", "subject", "description"], fallback), fallback, 300)

    def status_of(row):
        return lower(first(row, ["status", "job_status", "invoice_status", "payment_status", "state"], ""))

    def is_done(row):
        status = status_of(row)
        normalized = status.replace("_", " ").replace("-", " ").replace("/", " ")
        words = {word for word in normalized.split() if word}
        if "incomplete" in words or ("not" in words and ("complete" in words or "completed" in words)):
            return False
        return bool(words & {"complete", "completed", "done", "finished", "closed"}) or status in {"complete", "completed", "done", "finished", "closed"}

    def is_cancelled(row):
        return any(word in status_of(row) for word in ["cancel", "deleted", "archived"])

    def amount(value):
        try:
            return float(str(value or "0").replace("$", "").replace(",", "").replace("%", ""))
        except Exception:
            return 0.0

    def money(value):
        number = amount(value)
        return f"${number:,.2f}" if number > 0 else ""

    def normalized_rate(value):
        rate = amount(value)
        if rate > 1:
            rate = rate / 100.0
        if rate <= 0 or rate >= 1:
            return 0.0
        return rate

    def parse_date(value):
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        text = clean(value, "")
        if not text:
            return None
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            pass
        for fmt in ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y", "%d-%m-%Y", "%d %B %Y", "%d %b %Y"]:
            try:
                return datetime.strptime(text[:19], fmt).replace(tzinfo=timezone.utc)
            except Exception:
                continue
        return None

    def record_date(row):
        return parse_date(first(row, ["scheduled_date", "schedule_date", "start_date", "date", "due_date", "appointment_at", "completed_at", "updated_at", "created_at"], ""))

    def note_text(row):
        return clean(first(row, ["worker_note", "completion_note", "note", "notes", "description", "message", "body", "text", "client_preference"], ""), "", 1800)

    def client_name(row, fallback="Client not named in record"):
        return clean(first(row, ["client_name", "customer_name", "client", "customer", "name"], fallback), fallback, 240)

    def client_key(row):
        return lower(first(row, ["client_id", "customer_id", "client", "customer", "client_name", "customer_name", "name"], ""))

    def worker_name(row, fallback="Worker not named in record"):
        return clean(first(row, ["worker_name", "assigned_worker_name", "staff_name", "employee_name", "worker", "assigned_to"], fallback), fallback, 240)

    def worker_key(row):
        return lower(first(row, ["worker_id", "assigned_worker_id", "staff_id", "employee_id", "worker_name", "staff_name", "worker", "assigned_to"], ""))

    def service_key(row):
        return lower(first(row, ["service_type", "service", "job_type", "title", "job_title", "description"], ""))

    def field_source(value, source_text, confidence_score=0.8, missing_action=""):
        return {
            "value": value,
            "source": clean(source_text, "record evidence", 300),
            "confidence": round(max(0.1, min(float(confidence_score), 0.99)), 2),
            "missing_action": clean(missing_action, "", 240),
        }

    def confidence(score, reasons):
        return {"score": round(max(0.1, min(float(score), 0.99)), 2), "why": [clean(item, "", 240) for item in reasons if clean(item, "")][:5]}

    def evidence(*items):
        return [clean(item, "", 500) for item in items if clean(item, "")]

    def top_level_tray(role):
        return {
            "Bookkeeper": "Money",
            "Accountant": "Accounting",
            "Receptionist": "Bookings",
            "Payroll Clerk": "Staff",
            "Client Memory": "Clients",
            "Quality Checker": "Quality",
            "Operations Manager": "Operations",
            "Office Manager": "Command",
        }.get(role, "Command")

    def record_doc(user, title, role, source_type, action_type, row, problem, recommendation, evidence_rows, prepared_form, missing=None, confidence_data=None, actions=None, will_do=None, urgency="Owner review", owner_question=""):
        business_id, business_oid, _ = business_scope(user)
        row_id = rec_id(row, f"{source_type}-{action_type}")
        missing = missing or []
        actions = actions or ["Approve prepared draft", "Ask staff", "Park"]
        will_do = will_do or ["Save an internal owner-approved draft", "Keep sends, syncs and charges locked", "Record the approval trail"]
        form_flat = {}
        for key, value in prepared_form.items():
            form_flat[key] = value.get("value") if isinstance(value, dict) and "value" in value else value
        owner_check = " · ".join(missing) if missing else "No critical information is missing, but the owner can still edit every field."
        form_flat.setdefault("Owner check before approval", owner_check)
        payload = {
            "human_mimic_intelligence_v2": True,
            "office_engine": True,
            "office_role": role,
            "problem": problem,
            "recommendation": recommendation,
            "evidence": evidence_rows,
            "missing": missing,
            "confidence": confidence_data or confidence(0.72, ["Live record matched a role rule", "Owner can edit before approval"]),
            "prepared_form": form_flat,
            "field_sources": prepared_form,
            "actions": actions,
            "will_do": will_do,
            "source_collection": clean((row or {}).get("_collection"), "", 120),
            "record_id": row_id,
            "record_title": title_of(row, title),
            "owner_question": owner_question or "Does this prepared draft match what you would do?",
            "prepared_only": True,
            "owner_review_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
        }
        return {
            "business_id": business_id,
            "contractor_id": business_oid or business_id,
            "source_type": source_type,
            "source_id": row_id,
            "action_type": action_type,
            "tray": top_level_tray(role),
            "title": title,
            "found": problem,
            "prepared": recommendation,
            "why": owner_question or "Owner approval is required because Churvox found evidence, made a judgement and kept uncertain fields editable.",
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
            "created_by": clean((user or {}).get("id"), "", 180),
            "created_at": now(),
            "updated_at": now(),
            "audit": [{"by": clean((user or {}).get("id"), "", 180), "role": clean((user or {}).get("role"), "owner", 80), "action": "human_mimic_prepared", "note": "Evidence-backed mimic judgement prepared for owner review", "at": now(), "safety": SAFE_RESULT}],
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
                "event_type": "human_mimic_prepared",
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

    def business_tax_context(settings):
        for row in settings:
            rate = normalized_rate(first(row, ["gst_rate", "tax_rate", "default_tax_rate"], 0))
            if rate:
                inclusive = tax_inclusive(row)
                return rate, inclusive, title_of(row, "business settings")
        return 0.0, None, "business settings"

    def tax_inclusive(row):
        for key in ["prices_include_gst", "gst_included", "tax_inclusive", "includes_tax", "price_includes_tax"]:
            if key not in (row or {}):
                continue
            value = (row or {}).get(key)
            if isinstance(value, bool):
                return value
            text = lower(value)
            if text in {"true", "yes", "included", "inclusive", "inc", "1"}:
                return True
            if text in {"false", "no", "excluded", "exclusive", "ex", "0"}:
                return False
        return None

    def historical_extra_amount(job, jobs):
        current_id = rec_id(job, "")
        client = client_key(job)
        service = service_key(job)
        values = []
        for row in jobs:
            if rec_id(row, "") == current_id:
                continue
            if client and client_key(row) != client:
                continue
            if service and service_key(row) and service_key(row) != service:
                continue
            value = amount(first(row, ["extra_amount", "extras_total", "extra", "additional_charge"], 0))
            if value > 0:
                values.append(value)
        return float(median(values[-5:])) if values else 0.0

    def explicit_cycle_days(job):
        text = lower(first(job, ["recurrence", "frequency", "repeat", "repeat_every", "cycle"], ""))
        if "fortnight" in text or "2 week" in text:
            return 14
        if "3 week" in text:
            return 21
        if "4 week" in text or "monthly" in text or "month" in text:
            return 28
        if "weekly" in text or "1 week" in text:
            return 7
        if "daily" in text:
            return 1
        number = amount(first(job, ["repeat_every", "frequency_value", "interval"], 0))
        unit = lower(first(job, ["repeat_unit", "frequency_unit", "interval_unit"], ""))
        if number > 0:
            if "day" in unit:
                return int(number)
            if "week" in unit:
                return int(number * 7)
            if "month" in unit:
                return int(number * 28)
        return 0

    def inferred_cycle_days(job, jobs):
        explicit = explicit_cycle_days(job)
        if explicit:
            return explicit, "recurring rule on the job"
        client = client_key(job)
        dates = sorted({record_date(row) for row in jobs if client and client_key(row) == client and record_date(row) is not None})
        gaps = []
        for index in range(1, len(dates)):
            days = (dates[index] - dates[index - 1]).days
            if 1 <= days <= 120:
                gaps.append(days)
        if gaps:
            return int(round(median(gaps))), f"median gap across {len(gaps) + 1} client visits"
        return 0, "no reliable repeat history"

    def best_worker(job, jobs):
        client = client_key(job)
        names = [worker_name(row, "") for row in jobs if client and client_key(row) == client and worker_name(row, "")]
        if names:
            name, count = Counter(names).most_common(1)[0]
            return name, count
        current = worker_name(job, "")
        return current, 1 if current else 0

    def latest_client_visit(job, jobs):
        client = client_key(job)
        dates = [record_date(row) for row in jobs if client and client_key(row) == client and record_date(row) is not None and record_date(row) <= now()]
        return max(dates) if dates else record_date(job)

    def roll_forward(date_value, days):
        if date_value is None or days <= 0:
            return None
        candidate = date_value + timedelta(days=days)
        guard = 0
        while candidate < now() and guard < 60:
            candidate += timedelta(days=days)
            guard += 1
        return candidate

    def worker_baseline(timer, timers):
        key = worker_key(timer)
        values = []
        current_id = rec_id(timer, "")
        for row in timers:
            if rec_id(row, "") == current_id:
                continue
            if key and worker_key(row) != key:
                continue
            value = amount(first(row, ["hours", "duration_hours", "duration"], 0))
            if 0.1 <= value <= 18:
                values.append(value)
        return float(median(values[-12:])) if values else 0.0

    def existing_client_memory(note, client, clients):
        target = lower(note)
        if not target:
            return False
        key = client_key(client)
        for row in clients:
            if key and client_key(row) and client_key(row) != key:
                continue
            existing = lower(first(row, ["notes", "memory", "preferences", "access_notes", "client_notes"], ""))
            if existing and (target in existing or existing in target):
                return True
        return False

    def build_invoice_slip(user, job, jobs, settings):
        title = title_of(job, "completed job")
        client = client_name(job)
        base = amount(first(job, ["price", "amount", "total", "quoted_price", "job_total", "charge", "base_price"], 0))
        note = note_text(job)
        explicit_extra = amount(first(job, ["extra_amount", "extras_total", "extra", "additional_charge"], 0))
        inferred_extra = historical_extra_amount(job, jobs) if explicit_extra <= 0 and any(word in lower(note) for word in ["extra", "green waste", "materials", "additional"]) else 0.0
        extra = explicit_extra or inferred_extra
        subtotal = base + max(extra, 0)
        business_rate, business_inclusive, business_source = business_tax_context(settings)
        rate = normalized_rate(first(job, ["gst_rate", "tax_rate"], 0)) or business_rate
        inclusive = tax_inclusive(job)
        if inclusive is None:
            inclusive = business_inclusive
        missing = []
        if client.startswith("Client not named"):
            missing.append("Choose the client before approving the invoice draft.")
        if base <= 0:
            missing.append("Enter the base job price; no reliable price was found.")
        if any(word in lower(note) for word in ["extra", "green waste", "materials", "additional"]) and extra <= 0:
            missing.append("An extra is mentioned, but no amount was found in this job or matching client history.")
        if not rate:
            missing.append("Confirm the GST/tax rate.")
        if rate and inclusive is None:
            missing.append("Confirm whether the recorded prices include GST before the final total is used.")
        gst = 0.0
        total = subtotal
        tax_treatment = "GST/tax treatment needs owner confirmation"
        if rate and inclusive is True and subtotal > 0:
            gst = subtotal * rate / (1 + rate)
            total = subtotal
            tax_treatment = f"Prices treated as GST-inclusive at {rate * 100:g}%"
        elif rate and inclusive is False and subtotal > 0:
            gst = subtotal * rate
            total = subtotal + gst
            tax_treatment = f"GST added at {rate * 100:g}%"
        line_items = [{"label": "Base service", "amount": money(base) or "Owner to enter"}]
        if extra > 0 or any(word in lower(note) for word in ["extra", "green waste", "materials", "additional"]):
            line_items.append({"label": "Extra work", "amount": money(extra) or "Owner to enter"})
        extra_source = "extra amount on this job" if explicit_extra > 0 else "median from matching client/service history" if inferred_extra > 0 else "no reliable amount found"
        prepared = {
            "Client": field_source(client, "completed job client field", 0.96 if not client.startswith("Client not named") else 0.3, "Choose client"),
            "Job": field_source(title, "completed job title", 0.98),
            "Line items": field_source(line_items, f"job price plus {extra_source}", 0.9 if base > 0 and (extra > 0 or len(line_items) == 1) else 0.48, "Check amounts"),
            "GST treatment": field_source(tax_treatment, f"job tax fields then {business_source}", 0.9 if rate and inclusive is not None else 0.35, "Confirm GST treatment"),
            "GST amount": field_source(money(gst) or "Calculated after GST treatment is confirmed", "calculated from approved subtotal and GST treatment", 0.88 if gst else 0.35),
            "Draft total": field_source(money(total) or "Owner must enter price", "approved line items plus confirmed GST treatment", 0.9 if total > 0 and not missing else 0.48, "Check total"),
            "Payment link": field_source("Hold until invoice draft is approved", "owner-control safety rule", 0.99),
            "Invoice note": field_source("Bookkeeper prepared this from the completed job. Nothing is sent or synced until the owner approves the next step.", "Bookkeeper workflow", 0.96),
        }
        return record_doc(
            user,
            f"Invoice draft ready: {title}",
            "Bookkeeper",
            "money",
            "prepare_invoice",
            job,
            f"{title} is complete and has no linked invoice.",
            "Bookkeeper built a cautious invoice draft from the job, matching history and business tax settings. Any uncertain amount stays visibly unresolved.",
            evidence(f"Job status: {status_of(job) or 'completed'}", f"Client: {client}", f"Base price: {money(base) or 'missing'}", f"Extra source: {extra_source}", f"Worker note: {note or 'none'}"),
            prepared,
            missing,
            confidence(0.92 if total > 0 and not missing else 0.58, ["Completed job found", "Invoice link checked", "Same-client extra history checked", "GST treatment checked"]),
            ["Approve invoice draft", "Ask staff", "Park"],
            ["Create an internal invoice draft", "Use the edited fields as the approved version", "Keep send, sync and charge locked"],
            "Top priority",
            "Are the client, extras and GST treatment right before Churvox creates the internal invoice draft?",
        )

    def build_booking_slip(user, job, jobs):
        title = title_of(job, "recurring job")
        client = client_name(job)
        cycle_days, cycle_source = inferred_cycle_days(job, jobs)
        last_visit = latest_client_visit(job, jobs)
        suggested = roll_forward(last_visit, cycle_days)
        worker, worker_count = best_worker(job, jobs)
        missing = []
        if client.startswith("Client not named"):
            missing.append("Choose the client before approving the booking draft.")
        if cycle_days <= 0:
            missing.append("No reliable repeat cycle was found; choose the next date manually.")
        if last_visit is None:
            missing.append("No reliable last visit date was found.")
        if not worker:
            missing.append("Choose a worker or leave assignment for later.")
        next_label = suggested.strftime("%A %d %B %Y") if suggested else "Owner to choose date and time"
        cycle_label = f"Every {cycle_days} day{'s' if cycle_days != 1 else ''}" if cycle_days else "No reliable cycle found"
        message = f"Hi {client if not client.startswith('Client not named') else ''}, your usual service looks due around {next_label}. Would that suit?".strip()
        prepared = {
            "Client": field_source(client, "recurring job and client history", 0.94 if not client.startswith("Client not named") else 0.3),
            "Usual cycle": field_source(cycle_label, cycle_source, 0.9 if cycle_days else 0.3, "Choose cycle"),
            "Last visit": field_source(last_visit.strftime("%A %d %B %Y") if last_visit else "Missing", "latest matching client visit", 0.9 if last_visit else 0.25, "Choose date"),
            "Suggested booking date/time": field_source(next_label, "last visit plus inferred cycle, rolled forward to the next future date", 0.88 if suggested else 0.25, "Pick exact date/time"),
            "Worker": field_source(worker or "Owner to choose worker", f"most common worker across {worker_count} matching client job(s)" if worker_count else "no worker history", 0.9 if worker_count >= 2 else 0.62 if worker else 0.25, "Choose worker"),
            "Prepared customer message": field_source(message, "Receptionist wording based on client and suggested date", 0.82 if suggested else 0.45),
            "Internal note": field_source("Receptionist used the real repeat rule first, then matching visit history. It did not assume a three-week cycle.", "booking judgement", 0.98),
        }
        return record_doc(user, f"Next booking plan ready: {title}", "Receptionist", "booking", "prepare_recurring_next_date", job, f"{title} appears recurring but has no future booking ready.", "Receptionist inferred the next sensible date from the job rule and matching client history, while leaving uncertain details editable.", evidence(f"Client: {client}", f"Cycle: {cycle_label} ({cycle_source})", f"Last visit: {last_visit.isoformat() if last_visit else 'missing'}", f"Suggested next: {next_label}", f"Worker history: {worker or 'missing'}"), prepared, missing, confidence(0.9 if suggested and worker and not missing else 0.57, ["Recurring rule checked", "Client visit gaps checked", "Future date calculated", "Worker history checked"]), ["Approve booking plan", "Ask client", "Park"], ["Create an internal booking draft", "Keep the customer message unsent", "Use the edited date, worker and wording"], "Next", "Is this the date, worker and wording you would choose for this repeat client?")

    def build_assignment_slip(user, job):
        title = title_of(job, "job")
        client = client_name(job)
        scheduled = record_date(job)
        worker = worker_name(job, "")
        missing = []
        if scheduled is None:
            missing.append("Choose a date/time before the job can be scheduled.")
        if not worker:
            missing.append("Choose a worker before assignment.")
        prepared = {
            "Client": field_source(client, "job client field", 0.9 if not client.startswith("Client not named") else 0.3),
            "Job": field_source(title, "job title", 0.96),
            "Date / time": field_source(scheduled.strftime("%A %d %B %Y %H:%M") if scheduled else "Owner to choose date/time", "job schedule fields", 0.9 if scheduled else 0.25, "Choose date/time"),
            "Worker": field_source(worker or "Owner to choose worker", "job assignment fields", 0.9 if worker else 0.25, "Choose worker"),
            "Receptionist note": field_source("This job is not ready for the run sheet because a date or worker is missing.", "schedule readiness check", 0.95),
        }
        return record_doc(user, f"Job setup needs a decision: {title}", "Receptionist", "booking", "complete_job_setup", job, f"{title} is open but is missing {' and '.join(['a date' if scheduled is None else '', 'a worker' if not worker else '']).strip(' and ')}.", "Receptionist prepared the incomplete job as one editable setup decision instead of creating separate noisy slips.", evidence(f"Client: {client}", f"Date: {scheduled.isoformat() if scheduled else 'missing'}", f"Worker: {worker or 'missing'}", f"Status: {status_of(job) or 'open'}"), prepared, missing, confidence(0.94, ["Open job found", "Schedule checked", "Worker assignment checked"]), ["Approve job setup", "Ask client", "Ask staff", "Park"], ["Create an internal job setup draft", "Do not change the live job automatically", "Keep any message unsent"], "Needs check", "What date and worker should Churvox use for this job setup draft?")

    def build_payment_followup_slip(user, invoice):
        title = title_of(invoice, "invoice")
        client = client_name(invoice)
        balance = amount(first(invoice, ["balance_due", "amount_due", "balance", "outstanding", "total", "amount"], 0))
        due = parse_date(first(invoice, ["due_date", "payment_due_date", "date_due"], ""))
        days_overdue = max(0, (now() - due).days) if due else 0
        if days_overdue >= 30:
            tone = "Firm but professional; ask the owner whether to call before sending another reminder."
        elif days_overdue >= 14:
            tone = "Clear reminder with the amount and a polite request for an update."
        else:
            tone = "Friendly check-in; assume the client may simply have missed it."
        due_text = due.strftime("%A %d %B %Y") if due else "Due date not found"
        amount_text = money(balance) or "Amount needs owner check"
        reminder = f"Hi {client if not client.startswith('Client not named') else ''}, just checking in on {title} for {amount_text}. It was due {due_text}. Please let us know if you need the invoice resent or want to discuss it.".strip()
        missing = []
        if client.startswith("Client not named"):
            missing.append("Choose the client before approving the reminder.")
        if balance <= 0:
            missing.append("Confirm the outstanding amount.")
        if due is None:
            missing.append("Confirm the due date; it was not found in the invoice.")
        prepared = {
            "Client": field_source(client, "invoice client field", 0.94 if not client.startswith("Client not named") else 0.3),
            "Invoice": field_source(title, "invoice number/title", 0.96),
            "Outstanding amount": field_source(amount_text, "invoice balance fields", 0.9 if balance > 0 else 0.3, "Confirm amount"),
            "Due date": field_source(due_text, "invoice due date", 0.9 if due else 0.25, "Confirm due date"),
            "Days overdue": field_source(str(days_overdue) if due else "Unknown", "today minus due date", 0.98 if due else 0.2),
            "Tone": field_source(tone, "Bookkeeper escalation rule", 0.9),
            "Prepared reminder": field_source(reminder, "invoice facts plus age-appropriate wording", 0.84 if not missing else 0.52),
            "Send status": field_source("Do not send until owner approval", "owner-control safety rule", 0.99),
        }
        return record_doc(user, f"Payment follow-up ready: {title}", "Bookkeeper", "message", "prepare_overdue_followup", invoice, f"{title} is unpaid or overdue and needs a considered follow-up.", "Bookkeeper prepared a reminder using the real balance, due date and age of the debt instead of treating it like a new invoice.", evidence(f"Invoice status: {status_of(invoice) or 'unpaid'}", f"Balance: {amount_text}", f"Due: {due_text}", f"Days overdue: {days_overdue if due else 'unknown'}"), prepared, missing, confidence(0.91 if balance > 0 and due and not missing else 0.56, ["Outstanding balance checked", "Due date checked", "Escalation tone selected", "No message sent"]), ["Approve follow-up draft", "Call client", "Park"], ["Create an internal message draft", "Keep the reminder unsent", "Use the edited wording and amount"], "Top priority" if days_overdue >= 14 else "Owner review", "Is the amount, tone and timing right for this client before a reminder draft is created?")

    def build_reply_slip(user, message):
        body = note_text(message)
        client = client_name(message, "Client not named in message")
        text = lower(body)
        if any(word in text for word in ["book", "available", "appointment", "schedule", "friday", "monday", "tomorrow", "next week"]):
            intent = "Booking or availability question"
            reply = f"Hi {client if not client.startswith('Client not named') else ''}, thanks for checking. I’ll confirm the best available time with the owner and come back to you shortly.".strip()
        elif any(word in text for word in ["invoice", "price", "cost", "charge", "payment", "amount"]):
            intent = "Price, invoice or payment question"
            reply = f"Hi {client if not client.startswith('Client not named') else ''}, thanks for the message. I’ll check the job and amount with the owner before confirming anything.".strip()
        elif any(word in text for word in ["late", "delay", "running behind", "arrival"]):
            intent = "Timing update"
            reply = f"Hi {client if not client.startswith('Client not named') else ''}, thanks for letting us know. I’ll check the run with the owner and confirm the updated timing.".strip()
        elif any(word in text for word in ["thanks", "thank you", "great", "perfect"]):
            intent = "Acknowledgement"
            reply = f"Thanks {client if not client.startswith('Client not named') else ''} — appreciate the update.".strip()
        else:
            intent = "General customer message"
            reply = f"Hi {client if not client.startswith('Client not named') else ''}, thanks for the message. I’ve passed this to the owner to check and we’ll come back to you with the right answer.".strip()
        missing = [] if not client.startswith("Client not named") else ["Confirm which client this message belongs to."]
        prepared = {
            "Client": field_source(client, "message sender/client field", 0.88 if not missing else 0.3, "Choose client"),
            "Detected intent": field_source(intent, "message wording", 0.78),
            "Original message": field_source(body or "Message body missing", "live inbound message", 0.96 if body else 0.2),
            "Prepared reply": field_source(reply, "Receptionist response rule matched to the message intent", 0.78 if body else 0.35),
            "Send status": field_source("Do not send until owner approval", "owner-control safety rule", 0.99),
        }
        return record_doc(user, f"Reply draft ready: {title_of(message, client)}", "Receptionist", "message", "prepare_customer_reply", message, f"A customer message appears to need a reply: {clean(body, 'message body missing', 240)}", "Receptionist classified the message intent and drafted a cautious reply that does not promise a date, price or outcome it cannot verify.", evidence(f"Client/sender: {client}", f"Intent: {intent}", f"Message: {clean(body, 'missing', 400)}"), prepared, missing, confidence(0.82 if body and not missing else 0.5, ["Inbound message read", "Intent classified", "Unverified promises avoided", "Owner can edit wording"]), ["Approve reply draft", "Handle personally", "Park"], ["Create an internal reply draft", "Keep it unsent", "Use the edited wording as the approved draft"], "Needs check", "Does this reply answer the client without promising anything the records cannot support?")

    def build_hours_slip(user, timer, timers):
        title = title_of(timer, "time entry")
        worker = worker_name(timer)
        duration = amount(first(timer, ["hours", "duration_hours", "duration"], 0))
        start = first(timer, ["started_at", "start", "clock_in", "start_time"], "")
        end = first(timer, ["ended_at", "end", "clock_out", "end_time"], "")
        note = note_text(timer)
        baseline = worker_baseline(timer, timers)
        threshold = max(10.0, baseline * 1.75) if baseline else 10.0
        missing = []
        if not has_value(end):
            missing.append("Clock-off time is missing; ask the worker or enter it before approval.")
        if duration >= threshold and not note:
            missing.append("This timer is well above the worker’s normal pattern and has no explanation.")
        issue = "Open timer" if not has_value(end) else f"{duration:g} hours versus a {baseline:g}-hour worker baseline" if baseline else f"{duration:g} hours exceeds the 10-hour safety threshold"
        recommendation = "Ask staff before approval" if missing else "Approve only if the note explains why this shift differs from the worker’s normal pattern"
        prepared = {
            "Worker": field_source(worker, "timer worker field", 0.92 if not worker.startswith("Worker not named") else 0.3),
            "Job / shift": field_source(title, "timer job/title", 0.9),
            "Start": field_source(clean(start, "Missing"), "timer start", 0.9 if start else 0.2),
            "End": field_source(clean(end, "Missing"), "timer end", 0.9 if end else 0.2, "Ask staff or enter end time"),
            "Recorded hours": field_source(f"{duration:g}" if duration else "Missing", "timer duration", 0.88 if duration else 0.25),
            "Normal worker baseline": field_source(f"{baseline:g} hours" if baseline else "Not enough history", "median of recent valid timers for this worker", 0.84 if baseline else 0.35),
            "Issue": field_source(issue, "Payroll Clerk anomaly check", 0.92),
            "Recommended action": field_source(recommendation, "missing data and worker baseline", 0.86),
            "Staff note": field_source(note or "No explanation recorded", "worker note", 0.82 if note else 0.25, "Ask staff for context"),
        }
        return record_doc(user, f"Hours review ready: {title}", "Payroll Clerk", "staff", "review_odd_hours", timer, f"{title} has incomplete or unusual time compared with the worker’s normal pattern.", "Payroll Clerk compared the timer with this worker’s own recent history instead of blindly using one fixed threshold.", evidence(f"Worker: {worker}", f"Start: {start or 'missing'}", f"End: {end or 'missing'}", f"Duration: {duration:g}" if duration else "Duration missing", f"Worker baseline: {baseline:g}" if baseline else "No baseline", f"Note: {note or 'none'}"), prepared, missing, confidence(0.88 if baseline and not missing else 0.58, ["Timer read", "Worker-specific baseline checked", "Missing clock-off checked", "Staff explanation checked"]), ["Approve hours review", "Ask staff", "Park"], ["Create an internal hours review draft", "Do not pay staff or file tax", "Use the edited hours and note"], "Needs check", "Would you approve these hours with the evidence shown, or ask the worker first?")

    def build_quality_slip(user, job):
        title = title_of(job, "completed job")
        note = note_text(job)
        missing_items = []
        if not has_value(first(job, ["proof", "proof_url", "completion_photo", "photos", "images", "attachments"], "")):
            missing_items.append("final photo/proof")
        if not note:
            missing_items.append("completion note")
        missing_text = " and ".join(missing_items) or "final evidence"
        prepared = {
            "Job": field_source(title, "completed job", 0.96),
            "Missing evidence": field_source(missing_text, "proof and completion-note fields", 0.94),
            "Staff request": field_source(f"Please add {missing_text} for {title} before the invoice is cleared.", "Quality Checker request rule", 0.9),
            "Invoice hold": field_source("Hold invoice by default until evidence is attached, unless the owner explicitly clears it.", "quality safety rule", 0.92),
        }
        return record_doc(user, f"Proof request ready: {title}", "Quality Checker", "quality", "request_completion_proof", job, f"{title} is marked complete but is missing {missing_text}.", "Quality Checker prepared one specific staff request and explained why invoice clearance should wait.", evidence("Job status is complete", f"Missing: {missing_text}", f"Completion note: {note or 'missing'}"), prepared, [f"Add {missing_text}."], confidence(0.93, ["Completion status checked", "Proof fields checked", "Completion note checked", "Invoice safety rule applied"]), ["Approve proof request", "Clear anyway", "Park"], ["Create an internal staff proof-request draft", "Hold invoice by default", "Record the owner override if cleared"], "Needs check", "Should Churvox ask for the missing evidence, or are you comfortable clearing this job anyway?")

    def build_client_memory_slip(user, row, clients):
        title = title_of(row, "client note")
        client = client_name(row, "Client from source record")
        note = note_text(row)
        sensitive = any(word in lower(note) for word in ["gate", "code", "key", "alarm", "dog", "access"])
        duplicate = existing_client_memory(note, row, clients)
        missing = []
        if not note:
            missing.append("Write the useful client memory in plain factual wording.")
        if sensitive:
            missing.append("This contains an access/safety detail; confirm it is appropriate to retain and visible only to the right staff.")
        if duplicate:
            missing.append("A similar note already exists; edit or ignore this instead of creating a duplicate.")
        prepared = {
            "Client": field_source(client, "source job/message client", 0.84),
            "Memory note": field_source(note or "Owner to write the useful fact", "job or message note", 0.84 if note else 0.3, "Edit note"),
            "Memory type": field_source("Sensitive access/safety detail" if sensitive else "Service preference / useful working detail", "keyword and context check", 0.86),
            "Duplicate check": field_source("Possible duplicate found" if duplicate else "No matching client note found", "existing client memory fields", 0.82),
            "Use for": field_source("Future jobs and worker instructions only where relevant", "Client Memory rule", 0.92),
            "Source": field_source(title, "source record", 0.94),
        }
        return record_doc(user, f"Client memory draft ready: {title}", "Client Memory", "clients", "prepare_client_memory", row, f"{title} contains a detail that may help future work.", "Client Memory checked usefulness, sensitivity and duplication before preparing a factual note.", evidence(f"Client: {client}", f"Source: {title}", f"Note: {note or 'missing'}", f"Sensitive: {'yes' if sensitive else 'no'}", f"Possible duplicate: {'yes' if duplicate else 'no'}"), prepared, missing, confidence(0.86 if note and not duplicate else 0.55, ["Useful-detail keywords checked", "Sensitive access wording checked", "Existing client notes checked", "Owner can edit or ignore"]), ["Save client memory", "Ignore", "Park"], ["Create an internal client-memory draft", "Do not overwrite an existing note blindly", "Keep sensitive details owner-controlled"], "Low risk" if not sensitive else "Needs check", "Is this useful, factual and safe to retain without duplicating an existing client note?")

    def build_accounting_slip(user, row, settings):
        title = title_of(row, "accounting record")
        total = amount(first(row, ["total", "amount", "invoice_total"], 0))
        row_rate = normalized_rate(first(row, ["gst", "gst_rate", "tax", "tax_rate"], 0))
        business_rate, business_inclusive, business_source = business_tax_context(settings)
        rate = row_rate or business_rate
        inclusive = tax_inclusive(row)
        if inclusive is None:
            inclusive = business_inclusive
        export_status = clean(first(row, ["accounting_status", "export_status", "sync_status"], "Not reviewed"), "Not reviewed")
        missing = []
        if not rate:
            missing.append("GST/tax rate is missing or unclear.")
        if rate and inclusive is None:
            missing.append("Confirm whether prices are tax-inclusive or tax-exclusive.")
        prepared = {
            "Record": field_source(title, "invoice or business setting", 0.92),
            "Invoice total": field_source(money(total) or "No total found", "invoice total", 0.86 if total else 0.3, "Check amount"),
            "GST / tax rate": field_source(f"{rate * 100:g}%" if rate else "Missing", "record first, then business settings", 0.9 if rate else 0.25, "Confirm GST"),
            "Tax treatment": field_source("Inclusive" if inclusive is True else "Exclusive" if inclusive is False else "Needs owner/accountant confirmation", business_source, 0.88 if inclusive is not None else 0.3, "Confirm treatment"),
            "Export status": field_source(export_status, "accounting/export fields", 0.82),
            "Recommendation": field_source("Check the tax treatment and coding, then return corrections to Bookkeeper before any Xero/MYOB draft is prepared.", "Accountant workflow", 0.94),
            "Sync status": field_source("Locked until a separate owner approval", "accounting safety rule", 0.99),
        }
        return record_doc(user, f"Accounting review ready: {title}", "Accountant", "accounting", "review_accounting_export", row, f"{title} needs GST, coding or export readiness checked before accounting work continues.", "Accountant used the record and business tax settings together, and left unknown tax treatment unresolved instead of guessing.", evidence(f"Record: {title}", f"Total: {money(total) or 'missing'}", f"GST rate: {rate * 100:g}%" if rate else "GST rate missing", f"Treatment: {'inclusive' if inclusive is True else 'exclusive' if inclusive is False else 'unknown'}", f"Export status: {export_status}"), prepared, missing, confidence(0.9 if rate and inclusive is not None and not missing else 0.55, ["Invoice fields checked", "Business tax settings checked", "Inclusive/exclusive treatment checked", "Sync remains locked"]), ["Approve accounting review", "Approve bookkeeper handoff", "Export later", "Park"], ["Create an internal accounting review draft", "Keep Xero/MYOB sync and tax filing locked", "Use edited coding notes"], "Accounting check", "Are the GST treatment, coding direction and export status correct before this goes back to Bookkeeper?")

    def build_operations_slip(user, counts):
        problem_parts = []
        if counts.get("incomplete_jobs"):
            problem_parts.append(f"{counts['incomplete_jobs']} open jobs missing a date or worker")
        if counts.get("missing_invoices"):
            problem_parts.append(f"{counts['missing_invoices']} completed jobs missing invoices")
        if counts.get("missing_proof"):
            problem_parts.append(f"{counts['missing_proof']} completed jobs missing proof")
        if counts.get("odd_hours"):
            problem_parts.append(f"{counts['odd_hours']} unusual or incomplete timers")
        problem = "; ".join(problem_parts) or "Repeated admin gaps were found"
        row = {"_id": f"operations-{now().date().isoformat()}", "title": "Daily operations pattern", "_collection": "human_mimic"}
        prepared = {
            "Pattern found": field_source(problem, "today’s cross-area scan", 0.96),
            "Likely cause": field_source("The business is relying on people to remember the same missing step more than once.", "Operations Manager pattern rule", 0.78),
            "Suggested process": field_source("Add one owner-approved checklist rule for job setup, completion proof and invoice readiness instead of fixing each miss separately.", "repeated-gap analysis", 0.84),
            "Scope": field_source("Draft suggestion only; no automation or rule changes until the owner approves and edits it.", "owner-control safety rule", 0.99),
        }
        return record_doc(user, "Operations pattern needs owner review", "Operations Manager", "operations", "review_repeated_admin_gap", row, problem, "Operations Manager grouped repeated misses into one process suggestion so the owner can fix the cause, not just the symptoms.", evidence(*problem_parts), prepared, [], confidence(0.84, ["Multiple areas scanned", "Repeated gaps counted", "One process change proposed", "No rule changed automatically"]), ["Approve process draft", "Review later", "Park"], ["Create an internal operations-review draft", "Do not change automation rules", "Keep the suggestion editable"], "Pattern", "Is this a real repeat problem worth turning into a simple business rule?")

    def build_office_manager_brief(user, counts, candidate_count):
        row = {"_id": f"office-brief-{now().date().isoformat()}", "title": "Daily Command briefing", "_collection": "human_mimic"}
        top_area = max(counts.items(), key=lambda item: item[1])[0] if counts else "general"
        prepared = {
            "Prepared decisions": field_source(str(candidate_count), "today’s full mimic scan", 0.99),
            "Top pressure area": field_source(top_area.replace("_", " ").title(), "largest evidence-backed issue count", 0.88),
            "Suggested order": field_source("1. Money and overdue work  2. Jobs blocked by missing details  3. Staff/proof checks  4. Low-risk memory and process improvements", "Office Manager risk ranking", 0.9),
            "Owner focus": field_source("Open the first high-risk slip, edit anything wrong, approve only what is ready, and park the rest.", "Command workflow", 0.96),
        }
        return record_doc(user, "Office Manager prepared today’s Command briefing", "Office Manager", "office_manager", "daily_owner_brief", row, f"The office team prepared {candidate_count} evidence-backed decisions from live records.", "Office Manager ranked the queue by money risk, blocked work, staff/proof risk and low-risk improvements.", evidence(*[f"{key.replace('_', ' ')}: {value}" for key, value in counts.items() if value]), prepared, [], confidence(0.9, ["All mimic roles scanned", "Counts grouped by risk", "No action taken automatically"]), ["Acknowledge briefing", "Snooze", "Park"], ["Record the owner briefing decision", "Do not create or change a business record", "Keep every underlying slip separate"], "Owner review", "Does this ranking match what needs your attention first today?")

    @router.post("/command/scan")
    async def run_human_mimic_scan(payload: Optional[Dict[str, Any]] = None, request: Request = None):
        user = await require_owner(request)
        scan_errors = []
        jobs, invoices, clients, messages, timers, settings = await asyncio.gather(
            scoped_rows(user, ["jobs", "job_records", "appointments", "bookings"], 180, scan_errors),
            scoped_rows(user, ["invoices", "invoice_records"], 140, scan_errors),
            scoped_rows(user, ["clients", "customers"], 100, scan_errors),
            scoped_rows(user, ["messages", "client_messages", "inbox_messages"], 100, scan_errors),
            scoped_rows(user, ["time_entries", "timers", "worker_time_entries", "timesheets"], 100, scan_errors),
            scoped_rows(user, ["businesses", "business_settings", "settings"], 30, scan_errors),
        )

        candidates = []
        counts = {
            "incomplete_jobs": 0,
            "missing_invoices": 0,
            "missing_proof": 0,
            "customer_replies": 0,
            "payment_followups": 0,
            "odd_hours": 0,
            "accounting_checks": 0,
            "client_memory": 0,
        }

        for job in jobs[:100]:
            if is_cancelled(job):
                continue
            scheduled = record_date(job)
            worker = worker_name(job, "")
            has_invoice = truthy(first(job, ["invoiced", "invoice_created"], False)) or has_value(first(job, ["invoice_id", "invoice_number"], ""))
            has_proof = has_value(first(job, ["proof", "proof_url", "completion_photo", "photos", "images", "attachments"], ""))
            recurring = truthy(first(job, ["recurring", "is_recurring"], False)) or has_value(first(job, ["recurrence", "frequency", "repeat_every", "cycle"], ""))
            has_next = has_value(first(job, ["next_date", "next_run_at", "next_job_date", "next_service_date"], ""))
            if not is_done(job) and (scheduled is None or not worker):
                counts["incomplete_jobs"] += 1
                candidates.append(build_assignment_slip(user, job))
            if is_done(job) and not has_invoice:
                counts["missing_invoices"] += 1
                candidates.append(build_invoice_slip(user, job, jobs, settings))
            if recurring and not has_next:
                candidates.append(build_booking_slip(user, job, jobs))
            if is_done(job) and (not has_proof or not note_text(job)):
                counts["missing_proof"] += 1
                candidates.append(build_quality_slip(user, job))
            job_note = note_text(job)
            if job_note and any(word in lower(job_note) for word in ["gate", "dog", "key", "access", "prefers", "always", "never", "colour", "color", "code", "allergy", "sensitive"]):
                counts["client_memory"] += 1
                candidates.append(build_client_memory_slip(user, job, clients))

        for message in messages[:80]:
            body = note_text(message)
            direction = lower(first(message, ["direction", "type", "message_type", "source"], ""))
            reply_status = lower(first(message, ["reply_status", "status", "state"], ""))
            inbound = any(word in direction for word in ["inbound", "customer", "client", "incoming"]) or any(word in reply_status for word in ["unread", "needs_reply", "open", "waiting"])
            if body and inbound:
                counts["customer_replies"] += 1
                candidates.append(build_reply_slip(user, message))
            if body and any(word in lower(body) for word in ["gate", "dog", "key", "access", "prefers", "always", "never", "code", "allergy", "sensitive"]):
                counts["client_memory"] += 1
                candidates.append(build_client_memory_slip(user, message, clients))

        for invoice in invoices[:80]:
            invoice_status = status_of(invoice)
            balance = amount(first(invoice, ["balance_due", "amount_due", "balance", "outstanding"], 0))
            if balance > 0 or any(word in invoice_status for word in ["overdue", "unpaid", "past"]):
                counts["payment_followups"] += 1
                candidates.append(build_payment_followup_slip(user, invoice))
            total = amount(first(invoice, ["total", "amount", "invoice_total"], 0))
            row_rate = normalized_rate(first(invoice, ["gst", "gst_rate", "tax", "tax_rate"], 0))
            export_status = lower(first(invoice, ["accounting_status", "export_status", "sync_status"], ""))
            if total > 0 and (not row_rate or tax_inclusive(invoice) is None or export_status in {"", "pending", "needs_review", "failed", "error"}):
                counts["accounting_checks"] += 1
                candidates.append(build_accounting_slip(user, invoice, settings))

        for timer in timers[:80]:
            duration = amount(first(timer, ["hours", "duration_hours", "duration"], 0))
            ended = first(timer, ["ended_at", "end", "clock_out", "end_time"], "")
            baseline = worker_baseline(timer, timers)
            threshold = max(10.0, baseline * 1.75) if baseline else 10.0
            if duration >= threshold or not has_value(ended):
                counts["odd_hours"] += 1
                candidates.append(build_hours_slip(user, timer, timers))

        business_rate, business_inclusive, _ = business_tax_context(settings)
        if not business_rate or business_inclusive is None:
            counts["accounting_checks"] += 1
            setting_row = settings[0] if settings else {"_id": "business-tax-settings", "title": "Business tax settings", "_collection": "business_settings"}
            candidates.append(build_accounting_slip(user, setting_row, settings))

        repeated_total = counts["incomplete_jobs"] + counts["missing_invoices"] + counts["missing_proof"] + counts["odd_hours"]
        if repeated_total >= 3 or any(counts[key] >= 2 for key in ["incomplete_jobs", "missing_invoices", "missing_proof", "odd_hours"]):
            candidates.append(build_operations_slip(user, counts))
        if candidates:
            candidates.append(build_office_manager_brief(user, counts, len(candidates)))

        created = []
        existing = []
        seen = set()
        unique_docs = []
        for doc in candidates[:100]:
            key = (doc["source_type"], doc["action_type"], doc["source_id"])
            if key in seen:
                continue
            seen.add(key)
            unique_docs.append(doc)

        semaphore = asyncio.Semaphore(8)

        async def store(doc):
            async with semaphore:
                return await insert_once(user, doc)

        stored = await asyncio.gather(*(store(doc) for doc in unique_docs))
        for item, old in stored:
            if item:
                created.append(item)
            elif old:
                existing.append(old)

        return {
            "success": True,
            "source": "human-mimic-intelligence-v2",
            "created_count": len(created),
            "existing_count": len(existing),
            "role_counts": counts,
            "slips": created,
            "existing": existing,
            "scan_complete": not scan_errors,
            "scan_errors": list(dict.fromkeys(scan_errors)),
            "message": (
                f"Human-like mimic intelligence checked live records and prepared {len(created)} evidence-backed Command slip(s)."
                if not scan_errors
                else f"Human mimic prepared {len(created)} Command slip(s), but part of the live record scan failed. Review the scan warning before relying on a clear queue."
            ),
            "safety": SAFE_RESULT,
        }

    return router
