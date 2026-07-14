from datetime import datetime, timezone
import hashlib
import json
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request


SAFE_RESULT = "Prepared for owner approval. Nothing was sent, synced, charged, filed or paid."
OPEN_COMMAND_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]
JOB_COLLECTIONS = ["jobs", "job_records", "appointments", "bookings"]
INVOICE_COLLECTIONS = ["invoices", "invoice_records"]
TIME_COLLECTIONS = ["time_entries", "timers", "worker_time_entries", "timesheets"]


def build_job_done_router(db, get_current_user, ObjectId):
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

    def maybe_oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    def oid(value, label="record"):
        result = maybe_oid(value)
        if result is None:
            raise HTTPException(status_code=400, detail=f"Invalid {label} id")
        return result

    async def require_owner(request: Request):
        user = await get_current_user(request)
        role = str(user.get("role") or "").lower()
        allowed = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}
        if role not in allowed and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can use Job Done")
        return user

    def safe_text(value, fallback="", limit=900):
        text = " ".join(str(value or "").strip().split())
        return text[:limit] or fallback

    def first_value(row, keys, fallback=None):
        for key in keys:
            value = (row or {}).get(key)
            if value is not None and value != "" and value != [] and value != {}:
                return value
        return fallback

    def amount_value(value):
        try:
            return round(float(str(value or "0").replace("$", "").replace(",", "")), 2)
        except Exception:
            return 0.0

    def business_ids(user):
        business_id = safe_text(user.get("business_id") or user.get("id"), "")
        if not business_id:
            raise HTTPException(status_code=400, detail="Business id is missing")
        return business_id, maybe_oid(business_id)

    def business_scope(user):
        business_id, business_oid = business_ids(user)
        choices = [
            {"business_id": business_id},
            {"businessId": business_id},
            {"owner_id": business_id},
            {"ownerId": business_id},
            {"contractor_id": business_id},
        ]
        if business_oid is not None:
            choices.extend([
                {"business_id": business_oid},
                {"contractor_id": business_oid},
                {"owner_id": business_oid},
            ])
        return {"$or": choices}

    def record_id(row):
        return safe_text(first_value(row, ["_id", "id", "job_id", "record_id"], ""), "")

    def record_title(row):
        return safe_text(first_value(row, ["title", "job_title", "name", "service", "description", "client_name", "customer_name"], "Completed job"), "Completed job")

    def status_text(row):
        return safe_text(first_value(row, ["status", "job_status", "workflow_status", "state", "stage"], ""), "").lower()

    def is_completed(row):
        return any(word in status_text(row) for word in ["complete", "completed", "done", "finished", "closed"])

    def is_archived(row):
        return any(word in status_text(row) for word in ["archive", "deleted", "cancelled", "canceled", "void"])

    def id_values(value):
        values = []
        text = safe_text(value, "")
        if text:
            values.append(text)
        object_id = maybe_oid(value)
        if object_id is not None:
            values.append(object_id)
        return values

    def revision_for(value):
        payload = json.dumps(serial(value), sort_keys=True, separators=(",", ":"), default=str)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:24]

    async def scoped_rows(user, collection_names, limit=250):
        rows = []
        query = business_scope(user)
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
        return rows

    async def linked_rows(user, collections, job, limit=80):
        job_id = record_id(job)
        conditions = []
        for value in id_values(job_id):
            conditions.extend([
                {"job_id": value}, {"jobId": value}, {"source_job_id": value},
                {"linked_job_id": value}, {"record_id": value},
            ])
        direct_values = []
        if any(name in INVOICE_COLLECTIONS for name in collections):
            direct_values.append(first_value(job, ["invoice_id", "invoiceId", "linked_invoice_id"], ""))
        if any(name in TIME_COLLECTIONS for name in collections):
            raw_time_ids = first_value(job, ["time_entry_ids", "timer_ids", "timesheet_ids"], [])
            direct_values.extend(raw_time_ids if isinstance(raw_time_ids, list) else [raw_time_ids])
        for direct in direct_values:
            for value in id_values(direct):
                conditions.extend([
                    {"_id": value}, {"id": value}, {"invoice_id": value},
                    {"time_entry_id": value}, {"timer_id": value},
                ])
        if not conditions:
            return []
        query = {"$and": [business_scope(user), {"$or": conditions}]}
        rows = []
        for name in collections:
            try:
                items = await db[name].find(query).sort("updated_at", -1).limit(limit).to_list(limit)
                rows.extend([{**dict(item), "_collection": name} for item in items])
            except Exception:
                continue
        return rows

    def proof_info(job):
        proof = first_value(job, ["proof", "proof_url", "completion_photo", "completion_photos", "photos", "images", "attachments", "proof_pack"], None)
        checklist = first_value(job, ["completion_checklist", "checklist", "checklist_items"], None)
        required = first_value(job, ["proof_required", "requires_proof", "photo_required"], False)
        has_proof = bool(proof) or bool(checklist)
        if has_proof:
            count = len(proof) if isinstance(proof, list) else 1
            return {"status": "ready", "count": count, "note": "Completion proof is attached for owner review."}
        if required:
            return {"status": "missing", "count": 0, "note": "Required completion proof is missing."}
        return {"status": "check", "count": 0, "note": "No proof is attached; owner can confirm whether it is required."}

    def time_info(job, entries):
        job_hours = amount_value(first_value(job, ["hours", "actual_hours", "duration_hours", "time_spent"], 0))
        total = job_hours
        entry_ids = []
        open_count = 0
        for entry in entries:
            entry_ids.append(record_id(entry))
            total += amount_value(first_value(entry, ["hours", "duration_hours", "total_hours", "duration"], 0))
            started = first_value(entry, ["started_at", "start", "clock_in", "start_time"], None)
            ended = first_value(entry, ["ended_at", "end", "clock_out", "end_time"], None)
            if started and not ended:
                open_count += 1
        if open_count:
            status = "review"
            note = f"{open_count} linked timer(s) are still open."
        elif total > 0 or entries:
            status = "ready"
            note = "Worker time is linked and ready for owner review."
        else:
            status = "missing"
            note = "No worker time is linked to this completed job."
        return {"status": status, "hours": round(total, 2), "entry_ids": [item for item in entry_ids if item], "note": note}

    def extras_info(job):
        raw = first_value(job, ["extras", "extra_items", "materials", "additional_work", "variations"], [])
        amount = amount_value(first_value(job, ["extras_total", "extra_amount", "materials_total", "additional_amount"], 0))
        items = raw if isinstance(raw, list) else ([raw] if raw else [])
        note_text = safe_text(first_value(job, ["completion_note", "worker_note", "notes"], ""), "")
        detected = bool(items) or amount > 0 or any(word in note_text.lower() for word in ["extra", "additional", "material", "variation"])
        return {
            "status": "review" if detected else "clear",
            "amount": amount,
            "items": serial(items[:30]),
            "note": "Extras are present and remain editable before invoice approval." if detected else "No extras are currently recorded.",
        }

    def invoice_info(invoices):
        if not invoices:
            return {"status": "missing", "invoice_id": "", "number": "", "amount": 0.0, "note": "No invoice is linked yet."}
        invoice = invoices[0]
        status = safe_text(first_value(invoice, ["status", "invoice_status", "state"], "draft"), "draft").lower()
        return {
            "status": status,
            "invoice_id": record_id(invoice),
            "collection": invoice.get("_collection") or "invoices",
            "number": safe_text(first_value(invoice, ["invoice_number", "number", "invoice_no"], ""), ""),
            "amount": amount_value(first_value(invoice, ["total", "amount", "balance", "amount_due", "price"], 0)),
            "note": "A linked invoice exists and remains owner-controlled.",
        }

    def recurring_info(job):
        recurring = bool(first_value(job, ["recurring", "is_recurring", "repeat"], False)) or bool(first_value(job, ["recurrence", "frequency", "repeat_every"], None))
        next_date = safe_text(first_value(job, ["next_date", "next_run_at", "next_job_date", "next_service_date"], ""), "")
        return {
            "recurring": recurring,
            "next_date": next_date,
            "status": "ready" if next_date else ("review" if recurring else "not_applicable"),
            "note": "The next recurring date is ready." if next_date else ("Recurring work needs its next date prepared." if recurring else "This is not marked as recurring work."),
        }

    async def upsert_closeout(user, job):
        business_id, business_oid = business_ids(user)
        job_id = record_id(job)
        if not job_id:
            return None
        invoices = await linked_rows(user, INVOICE_COLLECTIONS, job)
        time_entries = await linked_rows(user, TIME_COLLECTIONS, job)
        proof = proof_info(job)
        worker_time = time_info(job, time_entries)
        extras = extras_info(job)
        invoice = invoice_info(invoices)
        recurring = recurring_info(job)
        client_id = safe_text(first_value(job, ["client_id", "customer_id", "clientId", "customerId"], ""), "")
        worker_ids = first_value(job, ["worker_ids", "assigned_worker_ids"], [])
        if not isinstance(worker_ids, list):
            single_worker = first_value(job, ["worker_id", "assigned_worker_id", "staff_id", "employee_id"], "")
            worker_ids = [single_worker] if single_worker else []
        risks = []
        if proof["status"] in {"missing", "check"}:
            risks.append("proof")
        if worker_time["status"] in {"missing", "review"}:
            risks.append("worker_time")
        if extras["status"] == "review":
            risks.append("extras")
        if invoice["status"] == "missing":
            risks.append("invoice")
        if recurring["status"] == "review":
            risks.append("recurring")
        calculated_state = "needs_owner" if risks else "ready"
        job_value = amount_value(first_value(job, ["price", "total", "amount", "quoted_total", "job_total"], 0))
        source_snapshot = {
            "scheduled_date": serial(first_value(job, ["scheduled_date", "date", "start_date", "due_date"], None)),
            "completed_at": serial(first_value(job, ["completed_at", "finished_at", "updated_at"], None)),
            "notes": safe_text(first_value(job, ["completion_note", "worker_note", "notes"], ""), "", 2000),
        }
        source_core = {
            "job_id": job_id,
            "client_id": client_id,
            "worker_ids": [safe_text(item, "") for item in worker_ids if safe_text(item, "")],
            "proof": proof,
            "worker_time": worker_time,
            "extras": extras,
            "invoice": invoice,
            "recurring": recurring,
            "job_value": job_value,
            "source_job_status": status_text(job),
            "source_snapshot": source_snapshot,
        }
        source_revision = revision_for(source_core)
        job_collection = safe_text(job.get("_collection"), "jobs")
        key = {"business_id": business_id, "job_collection": job_collection, "job_id": job_id}
        existing = await db.job_closeouts.find_one(key)
        same_revision = bool(existing and existing.get("source_revision") == source_revision)
        existing_status = safe_text((existing or {}).get("status"), "open")
        existing_execution = (existing or {}).get("execution") if isinstance((existing or {}).get("execution"), dict) else {}
        if same_revision and existing_status == "approved" and existing_execution.get("applied"):
            next_status = "approved"
            next_state = "approved"
        elif same_revision and existing_status == "waiting_proof" and proof.get("status") == "missing":
            next_status = "waiting_proof"
            next_state = "waiting_proof"
        elif same_revision and existing_status == "in_command":
            next_status = "in_command"
            next_state = calculated_state
        else:
            next_status = "open"
            next_state = calculated_state
        payload = {
            "business_id": business_id,
            "contractor_id": business_oid or business_id,
            "job_id": job_id,
            "job_collection": job_collection,
            "job_title": record_title(job),
            "client_id": client_id,
            "worker_ids": source_core["worker_ids"],
            "proof": proof,
            "worker_time": worker_time,
            "extras": extras,
            "invoice": invoice,
            "recurring": recurring,
            "job_value": job_value,
            "risk_keys": risks,
            "risk_count": len(risks),
            "closeout_state": next_state,
            "status": next_status,
            "source_job_status": source_core["source_job_status"],
            "source_snapshot": source_snapshot,
            "source_revision": source_revision,
            "updated_at": now(),
            "version": 1,
        }
        await db.job_closeouts.update_one(
            key,
            {"$set": payload, "$setOnInsert": {"created_at": now(), "owner_decisions": [], "execution": {}}},
            upsert=True,
        )
        return await db.job_closeouts.find_one(key)

    async def scan_closeouts(user):
        try:
            await db.job_closeouts.create_index(
                [("business_id", 1), ("job_collection", 1), ("job_id", 1)],
                unique=True,
                name="one_closeout_per_job",
            )
        except Exception:
            pass
        jobs = await scoped_rows(user, JOB_COLLECTIONS, 300)
        closeouts = []
        for job in jobs:
            if is_completed(job) and not is_archived(job):
                item = await upsert_closeout(user, job)
                if item:
                    closeouts.append(item)
        return closeouts

    def prepared_form(closeout, intent="full_closeout"):
        return {
            "closeout id": str(closeout.get("_id")),
            "job id": closeout.get("job_id") or "",
            "job": closeout.get("job_title") or "Completed job",
            "client id": closeout.get("client_id") or "",
            "proof status": (closeout.get("proof") or {}).get("status") or "check",
            "worker time status": (closeout.get("worker_time") or {}).get("status") or "check",
            "worker hours": (closeout.get("worker_time") or {}).get("hours") or 0,
            "extras amount": (closeout.get("extras") or {}).get("amount") or 0,
            "invoice id": (closeout.get("invoice") or {}).get("invoice_id") or "",
            "invoice amount": (closeout.get("invoice") or {}).get("amount") or closeout.get("job_value") or 0,
            "next recurring date": (closeout.get("recurring") or {}).get("next_date") or "",
            "approval intent": intent,
            "customer completion message": "Prepared only — owner may edit before any later send.",
        }

    async def create_closeout_slip(user, closeout, intent="full_closeout"):
        business_id, business_oid = business_ids(user)
        closeout_id = str(closeout.get("_id"))
        execution = closeout.get("execution") if isinstance(closeout.get("execution"), dict) else {}
        if closeout.get("status") == "approved" and execution.get("applied"):
            raise HTTPException(status_code=409, detail="This Job Done closeout is already approved. No duplicate draft was created.")
        existing = await db.command_slips.find_one({
            "business_id": business_id,
            "source_type": "job_done",
            "source_id": closeout_id,
            "status": {"$in": OPEN_COMMAND_STATUSES},
        })
        current_revision = safe_text(closeout.get("source_revision"), "")
        if existing:
            existing_payload = existing.get("payload") if isinstance(existing.get("payload"), dict) else {}
            existing_revision = safe_text(existing_payload.get("closeout_revision"), "")
            if not current_revision or not existing_revision or existing_revision == current_revision:
                return existing, True
            await db.command_slips.update_one(
                {"_id": existing["_id"]},
                {"$set": {"status": "superseded", "updated_at": now(), "superseded_reason": "Job Done source records changed before approval."}},
            )
        risks = closeout.get("risk_keys") or []
        proof_status = safe_text((closeout.get("proof") or {}).get("status"), "check")
        invoice_state = closeout.get("invoice") if isinstance(closeout.get("invoice"), dict) else {}
        invoice_amount = amount_value(invoice_state.get("amount") or closeout.get("job_value"))
        required_fields = []
        if proof_status != "missing" and not invoice_state.get("invoice_id") and invoice_amount <= 0:
            required_fields.append("invoice amount")
        title = f"Job Done: {closeout.get('job_title') or 'Completed job'}"
        doc = {
            "business_id": business_id,
            "contractor_id": business_oid or business_id,
            "source_type": "job_done",
            "source_id": closeout_id,
            "action_type": "apply_job_closeout",
            "title": title,
            "found": f"Completed work has {len(risks)} closeout check(s): {', '.join(risks) if risks else 'none'}.",
            "prepared": "Churvox prepared the invoice draft, worker-time review, customer completion draft, recurring follow-up and accounting handoff that apply to this job.",
            "why": "The owner must approve the edited closeout before Churvox creates any internal drafts. Sending, syncing, charging, filing and payment remain locked.",
            "urgency": "Top priority" if risks else "Owner review",
            "status": "open",
            "payload": {
                "office_role": "Office Manager",
                "job_done_reality_v1": True,
                "job_done_closeout_id": closeout_id,
                "closeout_revision": current_revision,
                "job_id": closeout.get("job_id") or "",
                "job_collection": closeout.get("job_collection") or "jobs",
                "client_id": closeout.get("client_id") or "",
                "invoice_id": (closeout.get("invoice") or {}).get("invoice_id") or "",
                "time_entry_ids": (closeout.get("worker_time") or {}).get("entry_ids") or [],
                "risk_keys": risks,
                "required_fields": required_fields,
                "approval_blocked": bool(required_fields),
                "prepared_form": prepared_form(closeout, intent),
                "actions": ["Approve closeout drafts", "Ask staff", "Park"],
                "will_do": [
                    "Create or update one internal invoice draft",
                    "Create one worker-time review when needed",
                    "Create one unsent customer completion draft",
                    "Create one next-job draft when recurring work needs it",
                    "Create one accounting review without syncing",
                    "Mark this closeout approved and retain the audit trail",
                ],
                "prepared_only": True,
                "owner_review_only": True,
                "no_auto_send": True,
                "no_auto_sync": True,
                "no_auto_charge": True,
                "no_auto_record_change": True,
            },
            "owner_review_only": True,
            "prepared_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            "created_by": str(user.get("id")),
            "created_at": now(),
            "updated_at": now(),
            "audit": [{"by": str(user.get("id")), "role": str(user.get("role") or "owner"), "action": "created", "note": "Persisted Job Done closeout prepared", "at": now(), "safety": SAFE_RESULT}],
        }
        result = await db.command_slips.insert_one(doc)
        doc["_id"] = result.inserted_id
        await db.job_closeouts.update_one({"_id": closeout["_id"]}, {"$set": {"status": "in_command", "command_slip_id": str(result.inserted_id), "updated_at": now()}})
        return doc, False

    def radar_from(closeouts, invoices):
        active_closeouts = [item for item in closeouts if item.get("status") not in {"approved", "closed"}]
        items = []
        for closeout in active_closeouts:
            invoice = closeout.get("invoice") or {}
            amount = invoice.get("amount") or closeout.get("job_value") or 0
            items.append({
                "key": f"closeout-{closeout.get('_id')}",
                "type": "Earned, not closed",
                "title": closeout.get("job_title") or "Completed job",
                "amount": amount,
                "risk": ", ".join(closeout.get("risk_keys") or []) or "Owner approval waiting",
                "next": "Prepare Job Done closeout",
                "closeout_id": str(closeout.get("_id")),
                "job_id": closeout.get("job_id") or "",
                "detail": "Completed work is connected to proof, time, extras, invoice and recurring checks.",
            })
        overdue = 0
        waiting = 0
        for invoice in invoices:
            status = safe_text(first_value(invoice, ["status", "invoice_status", "payment_status", "state"], ""), "").lower()
            if any(word in status for word in ["overdue", "late", "past due"]):
                overdue += 1
            if any(word in status for word in ["draft", "ready", "waiting", "unpaid", "due", "overdue"]):
                waiting += 1
        metrics = [
            {"label": "Finished, not closed", "value": len(active_closeouts), "note": "Persisted job closeouts waiting for a final owner-controlled step"},
            {"label": "Invoice actions", "value": waiting, "note": "Draft, due or unpaid invoices currently visible"},
            {"label": "Payment risk", "value": overdue, "note": "Invoices marked late or overdue"},
            {"label": "Worker cost checks", "value": sum(1 for item in active_closeouts if (item.get("worker_time") or {}).get("status") in {"review", "missing"}), "note": "Completed jobs whose hours still need review"},
        ]
        return {"metrics": metrics, "items": items}

    @router.post("/job-done/scan")
    async def scan_job_done(request: Request):
        user = await require_owner(request)
        closeouts = await scan_closeouts(user)
        return {"success": True, "closeouts": [doc_out(item) for item in closeouts], "count": len(closeouts), "safety": SAFE_RESULT}

    @router.get("/job-done/closeouts")
    async def list_job_done_closeouts(request: Request, limit: int = 100):
        user = await require_owner(request)
        await scan_closeouts(user)
        business_id, _ = business_ids(user)
        safe_limit = max(1, min(int(limit or 100), 250))
        items = await db.job_closeouts.find({"business_id": business_id}).sort("updated_at", -1).limit(safe_limit).to_list(safe_limit)
        return {"success": True, "closeouts": [doc_out(item) for item in items], "count": len(items), "safety": SAFE_RESULT}

    @router.get("/job-done/closeouts/{closeout_id}")
    async def get_job_done_closeout(closeout_id: str, request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        item = await db.job_closeouts.find_one({"_id": oid(closeout_id, "closeout"), "business_id": business_id})
        if not item:
            raise HTTPException(status_code=404, detail="Job Done closeout not found")
        return {"success": True, "closeout": doc_out(item), "safety": SAFE_RESULT}

    @router.post("/job-done/closeouts/{closeout_id}/prepare")
    async def prepare_job_done_closeout(closeout_id: str, request: Request, payload: Optional[Dict[str, Any]] = None):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        closeout = await db.job_closeouts.find_one({"_id": oid(closeout_id, "closeout"), "business_id": business_id})
        if not closeout:
            raise HTTPException(status_code=404, detail="Job Done closeout not found")
        intent = safe_text((payload or {}).get("intent"), "full_closeout")
        slip, existed = await create_closeout_slip(user, closeout, intent)
        return {"success": True, "slip": doc_out(slip), "existing": existed, "message": "Job Done is ready in Command.", "safety": SAFE_RESULT}

    @router.get("/job-done/money-radar")
    async def get_money_radar(request: Request):
        user = await require_owner(request)
        closeouts = await scan_closeouts(user)
        invoices = await scoped_rows(user, INVOICE_COLLECTIONS, 250)
        radar = radar_from(closeouts, invoices)
        return {"success": True, **serial(radar), "safety": SAFE_RESULT}

    @router.post("/job-done/money-radar/prepare")
    async def prepare_money_radar(request: Request, payload: Optional[Dict[str, Any]] = None):
        user = await require_owner(request)
        closeout_id = safe_text((payload or {}).get("closeout_id"), "")
        if not closeout_id:
            raise HTTPException(status_code=400, detail="A persisted closeout id is required")
        business_id, _ = business_ids(user)
        closeout = await db.job_closeouts.find_one({"_id": oid(closeout_id, "closeout"), "business_id": business_id})
        if not closeout:
            raise HTTPException(status_code=404, detail="Money Radar closeout not found")
        slip, existed = await create_closeout_slip(user, closeout, safe_text((payload or {}).get("intent"), "money_review"))
        return {"success": True, "slip": doc_out(slip), "existing": existed, "message": "Money decision is ready in Command.", "safety": SAFE_RESULT}

    return router
