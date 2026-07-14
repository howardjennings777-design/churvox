from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request


SAFE_RESULT = "Owner approval applied safely. Nothing was sent, synced, charged or filed."
RECORD_ONLY_RESULT = "Owner decision recorded. Nothing was sent, synced, charged or changed."
OPEN_STATUSES = {"open", "edited", "pending", "ready", "waiting", "snoozed"}
UNRESOLVED_MARKERS = (
    "owner to",
    "owner must",
    "not found",
    "missing",
    "confirm",
    "choose",
    "enter ",
    "to enter",
    "unresolved",
    "[redacted",
    "calculated after",
)


def build_command_apply_router(db, get_current_user, ObjectId):
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

    def maybe_oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def require_owner(request: Request):
        user = await get_current_user(request)
        role = str(user.get("role") or "").lower()
        allowed = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}
        if role not in allowed and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can approve Command slips")
        return user

    def business_ids(user):
        business_id = str(user.get("business_id") or user.get("id") or "").strip()
        if not business_id:
            raise HTTPException(status_code=400, detail="Business id is missing")
        return business_id, maybe_oid(business_id)

    def safe_text(value, fallback="", limit=900):
        text = " ".join(str(value or "").strip().split())
        return text[:limit] or fallback

    def should_apply(action):
        text = safe_text(action, "").lower()
        if any(word in text for word in ["park", "ignore", "snooze", "ask", "edit", "review later", "later", "call", "handle personally", "clear anyway"]):
            return False
        return any(word in text for word in ["approve", "save", "create", "import", "apply"])

    def payload_of(slip):
        payload = slip.get("payload")
        return payload if isinstance(payload, dict) else {}

    def prepared_form(payload):
        form = payload.get("approved_form") or payload.get("edited_form") or payload.get("prepared_form") or payload.get("form")
        return form if isinstance(form, dict) else {}

    def flatten_form(form):
        out = {}
        for key, value in (form or {}).items():
            if isinstance(value, dict) and "value" in value:
                out[key] = value.get("value")
            else:
                out[key] = value
        return out

    def form_from_request(payload):
        payload = payload or {}
        edited = payload.get("edited_form") or payload.get("approved_form") or payload.get("form")
        if isinstance(edited, dict):
            return flatten_form(edited)
        fields = payload.get("fields")
        if isinstance(fields, list):
            out = {}
            for field in fields:
                if not isinstance(field, dict):
                    continue
                label = safe_text(field.get("label"), "")
                if label:
                    out[label] = field.get("value")
            return flatten_form(out)
        return {}

    def collection_for(slip, payload):
        text = safe_text(f"{slip.get('source_type')} {slip.get('action_type')} {payload.get('area')}", "").lower()
        if any(word in text for word in ["client_memory", "memory", "preference", "access_note"]):
            return "client_memory_reviews", "client_memory_review"
        if any(word in text for word in ["message", "reply", "email", "sms", "followup", "follow_up"]):
            return "message_drafts", "message_draft"
        if any(word in text for word in ["account", "xero", "myob", "gst", "tax", "export"]):
            return "accounting_reviews", "accounting_review"
        if any(word in text for word in ["quality", "proof", "photo"]):
            return "quality_reviews", "quality_review"
        if any(word in text for word in ["operation", "rule", "pattern", "branding", "setting", "mimic_mode"]):
            return "operations_reviews", "operations_review"
        if any(word in text for word in ["payroll", "timer", "hours", "staff", "worker"]):
            return "payroll_reviews", "payroll_review"
        if any(word in text for word in ["quote", "estimate"]):
            return "quotes", "quote"
        if any(word in text for word in ["invoice", "payment", "money"]):
            return "invoices", "invoice"
        if any(word in text for word in ["client", "customer"]):
            return "clients", "client"
        return "jobs", "job"

    def normalized_form(form):
        return {safe_text(key, "").lower().replace("_", " "): value for key, value in flatten_form(form).items()}

    def pick(form, *keys):
        lower_map = normalized_form(form)
        for key in keys:
            normalized = safe_text(key, "").lower().replace("_", " ")
            if normalized in lower_map:
                return lower_map[normalized]
        for key in keys:
            normalized = safe_text(key, "").lower()
            for existing, value in lower_map.items():
                if normalized in existing:
                    return value
        return ""

    def meaningful(value):
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return True
        if isinstance(value, (list, tuple, dict)):
            return bool(value)
        text = safe_text(value, "").lower()
        if not text:
            return False
        return not any(marker in text for marker in UNRESOLVED_MARKERS)

    def unresolved_requirements(slip_payload, form):
        required = slip_payload.get("required_fields")
        required = required if isinstance(required, list) else []
        unresolved = []
        for label in required:
            label_text = safe_text(label, "")
            if not label_text:
                continue
            value = pick(form, label_text)
            if not meaningful(value):
                unresolved.append(label_text)
        if slip_payload.get("approval_blocked") and not required:
            unresolved.append("Owner-required information")
        return list(dict.fromkeys(unresolved))

    def assert_strict_mimic_safe(slip):
        payload = payload_of(slip)
        if not payload.get("human_mimic_intelligence_v3"):
            return
        required_true = [
            payload.get("strict_preflight_passed"),
            payload.get("prepared_only"),
            payload.get("owner_review_only"),
            payload.get("no_auto_send"),
            payload.get("no_auto_sync"),
            payload.get("no_auto_charge"),
            payload.get("no_auto_record_change"),
            slip.get("prepared_only"),
            slip.get("owner_review_only"),
            slip.get("no_auto_send"),
            slip.get("no_auto_sync"),
            slip.get("no_auto_charge"),
            slip.get("no_auto_record_change"),
        ]
        if not all(value is True for value in required_true):
            raise HTTPException(status_code=409, detail="This mimic slip did not pass the strict safety preflight. Nothing was applied.")

    def base_record(user, slip, form, record_type):
        business_id, business_oid = business_ids(user)
        form = flatten_form(form)
        title = safe_text(pick(form, "title", "job", "job / shift", "record", "name", "client", "customer", "subject") or slip.get("title"), "Approved Command draft")
        return {
            "business_id": business_id,
            "contractor_id": business_oid or business_id,
            "record_type": record_type,
            "title": title,
            "name": safe_text(pick(form, "name"), ""),
            "client": safe_text(pick(form, "client"), ""),
            "customer": safe_text(pick(form, "customer", "client"), ""),
            "phone": safe_text(pick(form, "phone", "mobile"), ""),
            "email": safe_text(pick(form, "email"), ""),
            "address": safe_text(pick(form, "address", "site address", "service address"), ""),
            "worker": safe_text(pick(form, "worker"), ""),
            "date": safe_text(pick(form, "date", "suggested booking date/time", "suggested booking date", "last visit"), ""),
            "price": safe_text(pick(form, "price", "total", "amount", "draft total", "draft total / amount"), ""),
            "notes": safe_text(pick(form, "notes", "scope", "line items", "message", "reply", "prepared reminder", "invoice note", "recommended action", "memory note", "detail to save"), ""),
            "prepared_form": serial(form),
            "status": "draft_approved",
            "source": "command_owner_approval",
            "source_type": safe_text(slip.get("source_type"), "office"),
            "action_type": safe_text(slip.get("action_type"), "owner_review"),
            "source_record_id": safe_text(slip.get("source_id"), ""),
            "command_slip_id": str(slip.get("_id")),
            "created_by": str(user.get("id")),
            "created_at": now(),
            "updated_at": now(),
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_file_tax": True,
        }

    def number_value(value):
        try:
            return round(float(str(value or "0").replace("$", "").replace(",", "")), 2)
        except Exception:
            return 0.0

    async def ensure_job_done_indexes():
        for collection_name in ["invoices", "invoice_reviews", "payroll_reviews", "message_drafts", "jobs", "accounting_reviews"]:
            try:
                await db[collection_name].create_index(
                    [("business_id", 1), ("source_job_closeout_id", 1), ("record_kind", 1)],
                    unique=True,
                    sparse=True,
                    name="job_done_artifact_once",
                )
            except Exception:
                pass

    async def upsert_job_done_artifact(user, collection_name, closeout_id, record_kind, document):
        await ensure_job_done_indexes()
        business_id, business_oid = business_ids(user)
        query = {
            "business_id": business_id,
            "source_job_closeout_id": closeout_id,
            "record_kind": record_kind,
        }
        base = {
            **document,
            **query,
            "contractor_id": business_oid or business_id,
            "updated_at": now(),
            "source": "job_done_owner_approval",
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_file_tax": True,
            "no_auto_pay": True,
        }
        await db[collection_name].update_one(
            query,
            {"$set": base, "$setOnInsert": {"created_at": now()}},
            upsert=True,
        )
        stored = await db[collection_name].find_one(query)
        return str((stored or {}).get("_id") or "")

    async def apply_job_done_closeout(user, slip, request_payload=None):
        payload = payload_of(slip)
        business_id, _ = business_ids(user)
        closeout_id = safe_text(payload.get("job_done_closeout_id") or slip.get("source_id"), "")
        closeout_oid = maybe_oid(closeout_id)
        if not closeout_id or closeout_oid is None:
            return {"applied": False, "message": "The persisted Job Done closeout id is missing. Nothing was applied."}
        closeout = await db.job_closeouts.find_one({"_id": closeout_oid, "business_id": business_id})
        if not closeout:
            return {"applied": False, "message": "The persisted Job Done closeout could not be found. Nothing was applied."}
        previous = closeout.get("execution") if isinstance(closeout.get("execution"), dict) else {}
        if closeout.get("status") == "approved" and previous.get("applied"):
            return {**serial(previous), "idempotent": True}

        request_form = form_from_request(request_payload)
        form = request_form or prepared_form(payload)
        form = flatten_form(form)
        invoice_state = closeout.get("invoice") if isinstance(closeout.get("invoice"), dict) else {}
        time_state = closeout.get("worker_time") if isinstance(closeout.get("worker_time"), dict) else {}
        extras_state = closeout.get("extras") if isinstance(closeout.get("extras"), dict) else {}
        recurring_state = closeout.get("recurring") if isinstance(closeout.get("recurring"), dict) else {}
        job_title = safe_text(closeout.get("job_title") or pick(form, "job", "title"), "Completed job")
        job_id = safe_text(closeout.get("job_id") or payload.get("job_id"), "")
        client_id = safe_text(closeout.get("client_id") or payload.get("client_id"), "")
        invoice_total = number_value(pick(form, "invoice amount", "draft total", "amount", "total") or invoice_state.get("amount") or closeout.get("job_value"))
        extras_amount = number_value(pick(form, "extras amount", "extra amount") or extras_state.get("amount"))
        worker_hours = number_value(pick(form, "worker hours", "hours") or time_state.get("hours"))
        customer_message = safe_text(pick(form, "customer completion message", "message"), "Your work is complete. The owner will review the final closeout before anything is sent.", 2400)
        next_date = safe_text(pick(form, "next recurring date", "next date") or recurring_state.get("next_date"), "")
        artifacts = {}

        if invoice_state.get("invoice_id"):
            artifacts["invoice_review_id"] = await upsert_job_done_artifact(user, "invoice_reviews", closeout_id, "linked_invoice_review", {
                "title": f"Invoice review: {job_title}",
                "job_id": job_id,
                "client_id": client_id,
                "invoice_id": safe_text(invoice_state.get("invoice_id"), ""),
                "amount": invoice_total,
                "extras_amount": extras_amount,
                "status": "draft_approved",
                "command_slip_id": str(slip.get("_id")),
                "prepared_form": serial(form),
            })
        else:
            artifacts["invoice_draft_id"] = await upsert_job_done_artifact(user, "invoices", closeout_id, "job_done_invoice_draft", {
                "title": f"Draft invoice: {job_title}",
                "job_id": job_id,
                "client_id": client_id,
                "total": invoice_total,
                "amount": invoice_total,
                "extras_amount": extras_amount,
                "status": "draft_approved",
                "command_slip_id": str(slip.get("_id")),
                "prepared_form": serial(form),
                "sent": False,
                "synced": False,
            })

        if worker_hours > 0 or time_state.get("status") in {"review", "missing"}:
            artifacts["payroll_review_id"] = await upsert_job_done_artifact(user, "payroll_reviews", closeout_id, "job_done_hours_review", {
                "title": f"Hours review: {job_title}",
                "job_id": job_id,
                "worker_ids": closeout.get("worker_ids") or [],
                "time_entry_ids": time_state.get("entry_ids") or [],
                "hours": worker_hours,
                "status": "draft_approved",
                "command_slip_id": str(slip.get("_id")),
                "gross_only": True,
            })

        artifacts["message_draft_id"] = await upsert_job_done_artifact(user, "message_drafts", closeout_id, "job_done_customer_message", {
            "title": f"Completion message: {job_title}",
            "job_id": job_id,
            "client_id": client_id,
            "body": customer_message,
            "status": "draft_approved",
            "command_slip_id": str(slip.get("_id")),
            "sent": False,
        })

        if recurring_state.get("recurring") and next_date:
            artifacts["next_job_draft_id"] = await upsert_job_done_artifact(user, "jobs", closeout_id, "recurring_next_job_draft", {
                "title": job_title,
                "source_job_id": job_id,
                "client_id": client_id,
                "scheduled_date": next_date,
                "status": "draft_approved",
                "recurring": True,
                "command_slip_id": str(slip.get("_id")),
            })

        artifacts["accounting_review_id"] = await upsert_job_done_artifact(user, "accounting_reviews", closeout_id, "job_done_accounting_review", {
            "title": f"Accounting review: {job_title}",
            "job_id": job_id,
            "invoice_id": invoice_state.get("invoice_id") or artifacts.get("invoice_draft_id") or "",
            "amount": invoice_total,
            "status": "draft_approved",
            "command_slip_id": str(slip.get("_id")),
            "sync_status": "locked_pending_owner_action",
        })

        execution = {
            "applied": True,
            "type": "job_done_closeout",
            "closeout_id": closeout_id,
            "job_id": job_id,
            "artifacts": artifacts,
            "prepared_form": serial(form),
            "message": SAFE_RESULT,
            "applied_at": now(),
        }
        await db.job_closeouts.update_one(
            {"_id": closeout_oid, "business_id": business_id},
            {
                "$set": {
                    "status": "approved",
                    "closeout_state": "approved",
                    "approved_at": now(),
                    "approved_by": str(user.get("id")),
                    "command_slip_id": str(slip.get("_id")),
                    "approved_values": {
                        "invoice_total": invoice_total,
                        "extras_amount": extras_amount,
                        "worker_hours": worker_hours,
                        "customer_message": customer_message,
                        "next_recurring_date": next_date,
                    },
                    "execution": execution,
                    "updated_at": now(),
                },
                "$push": {
                    "owner_decisions": {
                        "action": safe_text((request_payload or {}).get("action"), "Approve closeout drafts"),
                        "note": safe_text((request_payload or {}).get("note") or (request_payload or {}).get("owner_note"), "Owner approved Job Done closeout drafts."),
                        "at": now(),
                        "by": str(user.get("id")),
                    }
                },
            },
        )
        return execution

    async def insert_prepared_records(user, slip, request_payload=None):
        payload = payload_of(slip)
        if payload.get("job_done_reality_v1") or safe_text(slip.get("source_type"), "").lower() == "job_done":
            return await apply_job_done_closeout(user, slip, request_payload)
        request_form = form_from_request(request_payload)
        form = request_form or prepared_form(payload)
        form = flatten_form(form)
        collection_name, record_type = collection_for(slip, payload)
        rows = form.get("csv_rows") or form.get("records") or payload.get("csv_rows") or []
        if isinstance(rows, list) and rows:
            docs = []
            for row in rows[:100]:
                if isinstance(row, dict):
                    docs.append(base_record(user, slip, row, record_type))
            if not docs:
                return {"applied": False, "collection": collection_name, "count": 0, "message": "CSV rows could not be read safely."}
            result = await db[collection_name].insert_many(docs)
            return {"applied": True, "collection": collection_name, "count": len(result.inserted_ids), "record_type": record_type, "ids": [str(item) for item in result.inserted_ids], "used_edited_form": bool(request_form)}
        doc = base_record(user, slip, form, record_type)
        result = await db[collection_name].insert_one(doc)
        return {"applied": True, "collection": collection_name, "count": 1, "record_type": record_type, "id": str(result.inserted_id), "used_edited_form": bool(request_form)}

    async def command_event(user, event_type, slip=None, note=""):
        business_id, business_oid = business_ids(user)
        await db.command_events.insert_one({
            "business_id": business_id,
            "contractor_id": business_oid or business_id,
            "event_type": event_type,
            "title": safe_text((slip or {}).get("title"), "Command approval"),
            "detail": safe_text(note, SAFE_RESULT),
            "slip_id": str((slip or {}).get("_id") or ""),
            "safety": SAFE_RESULT,
            "created_by": str(user.get("id")),
            "created_at": now(),
        })

    def audit_entry(user, action, note=""):
        return {
            "by": str(user.get("id")),
            "role": str(user.get("role") or "owner"),
            "action": action,
            "note": safe_text(note, ""),
            "at": now(),
            "safety": SAFE_RESULT,
        }

    @router.post("/command/slips/{slip_id}/approve")
    async def approve_and_apply_command_slip(slip_id: str, request: Request, payload: Optional[Dict[str, Any]] = None):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        slip = await db.command_slips.find_one({"_id": oid(slip_id, "slip"), "business_id": business_id})
        if not slip:
            raise HTTPException(status_code=404, detail="Command slip not found")
        previous_result = slip.get("result") if isinstance(slip.get("result"), dict) else {}
        previous_execution = previous_result.get("execution") if isinstance(previous_result.get("execution"), dict) else {}
        if slip.get("status") == "approved_applied" and previous_execution.get("applied"):
            return {"success": True, "slip": doc_out(slip), "result": serial(previous_result), "safety": previous_result.get("message") or SAFE_RESULT, "idempotent": True}
        if slip.get("status") not in OPEN_STATUSES:
            raise HTTPException(status_code=409, detail=f"This Command slip is {slip.get('status') or 'closed'} and cannot be applied. Nothing was changed.")

        action = safe_text((payload or {}).get("action"), "approve")
        note = safe_text((payload or {}).get("note") or (payload or {}).get("owner_note"), "Owner approved the prepared direction.")
        edited_form = form_from_request(payload)
        applied = False
        execution = {"applied": False, "message": RECORD_ONLY_RESULT}
        if should_apply(action):
            assert_strict_mimic_safe(slip)
            effective_form = edited_form or prepared_form(payload_of(slip))
            unresolved = unresolved_requirements(payload_of(slip), effective_form)
            if unresolved:
                raise HTTPException(status_code=409, detail=f"Complete these required fields before approval: {', '.join(unresolved)}. Nothing was applied.")
            execution = await insert_prepared_records(user, slip, payload)
            applied = bool(execution.get("applied"))
        status = "approved_applied" if applied else "approved_recorded"
        result_message = SAFE_RESULT if applied else RECORD_ONLY_RESULT
        update = {
            "status": status,
            "approved_at": now(),
            "approved_by": str(user.get("id")),
            "owner_decision": {"action": action, "note": note, "edited_form": serial(edited_form), "safety": result_message},
            "result": {"stored_only": not applied, "message": result_message, "execution": serial(execution)},
            "updated_at": now(),
        }
        await db.command_slips.update_one({"_id": slip["_id"]}, {"$set": update, "$push": {"audit": audit_entry(user, status, note)}})
        slip.update(update)
        await command_event(user, status, slip, result_message)
        return {"success": True, "slip": doc_out(slip), "result": update["result"], "safety": result_message}

    return router
