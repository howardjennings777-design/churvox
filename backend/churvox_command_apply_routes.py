from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request


SAFE_RESULT = "Owner approval applied safely. Nothing was sent, synced, charged or filed."
RECORD_ONLY_RESULT = "Owner decision recorded. Nothing was sent, synced, charged or changed."


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

    async def require_owner(request: Request):
        user = await get_current_user(request)
        role = str(user.get("role") or "").lower()
        allowed = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}
        if role not in allowed and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can approve Command slips")
        return user

    def business_ids(user):
        business_id = str(user.get("business_id") or user.get("id"))
        return business_id, oid(business_id, "business")

    def safe_text(value, fallback=""):
        text = " ".join(str(value or "").strip().split())
        return text[:900] or fallback

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

    def pick(form, *keys):
        lower_map = {safe_text(k, "").lower().replace("_", " "): v for k, v in (form or {}).items()}
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

    def base_record(user, slip, form, record_type):
        business_id, business_oid = business_ids(user)
        form = flatten_form(form)
        title = safe_text(pick(form, "title", "job", "job / shift", "record", "name", "client", "customer", "subject") or slip.get("title"), "Approved Command draft")
        return {
            "business_id": business_id,
            "contractor_id": business_oid,
            "record_type": record_type,
            "title": title,
            "name": safe_text(pick(form, "name"), ""),
            "client": safe_text(pick(form, "client"), ""),
            "customer": safe_text(pick(form, "customer", "client"), ""),
            "phone": safe_text(pick(form, "phone", "mobile"), ""),
            "email": safe_text(pick(form, "email"), ""),
            "address": safe_text(pick(form, "address", "site address", "service address"), ""),
            "worker": safe_text(pick(form, "worker"), ""),
            "date": safe_text(pick(form, "date", "suggested booking date/time", "last visit"), ""),
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

    async def insert_prepared_records(user, slip, request_payload=None):
        payload = payload_of(slip)
        form = form_from_request(request_payload) or prepared_form(payload)
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
            return {"applied": True, "collection": collection_name, "count": len(result.inserted_ids), "record_type": record_type, "ids": [str(item) for item in result.inserted_ids], "used_edited_form": bool(form_from_request(request_payload))}
        doc = base_record(user, slip, form, record_type)
        result = await db[collection_name].insert_one(doc)
        return {"applied": True, "collection": collection_name, "count": 1, "record_type": record_type, "id": str(result.inserted_id), "used_edited_form": bool(form_from_request(request_payload))}

    async def command_event(user, event_type, slip=None, note=""):
        business_id, business_oid = business_ids(user)
        await db.command_events.insert_one({
            "business_id": business_id,
            "contractor_id": business_oid,
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
        action = safe_text((payload or {}).get("action"), "approve")
        note = safe_text((payload or {}).get("note") or (payload or {}).get("owner_note"), "Owner approved the prepared direction.")
        edited_form = form_from_request(payload)
        applied = False
        execution = {"applied": False, "message": RECORD_ONLY_RESULT}
        if should_apply(action):
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
