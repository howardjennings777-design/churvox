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

    def clean_key(value):
        return safe_text(value, "").lower().replace(" ", "_").replace("-", "_")

    def should_apply(action):
        text = safe_text(action, "").lower()
        if any(word in text for word in ["park", "ignore", "snooze", "ask", "edit", "review later", "later"]):
            return False
        return any(word in text for word in ["approve", "save", "create", "import", "apply"])

    def payload_of(slip):
        payload = slip.get("payload")
        return payload if isinstance(payload, dict) else {}

    def prepared_form(payload):
        form = payload.get("prepared_form") or payload.get("form")
        return form if isinstance(form, dict) else {}

    def collection_for(slip, payload):
        text = safe_text(f"{slip.get('source_type')} {slip.get('action_type')} {payload.get('area')}", "").lower()
        if any(word in text for word in ["client", "customer"]):
            return "clients", "client"
        if any(word in text for word in ["quote", "estimate"]):
            return "quotes", "quote"
        if any(word in text for word in ["invoice", "payment", "money"]):
            return "invoices", "invoice"
        if any(word in text for word in ["payroll", "timer", "hours", "staff", "worker"]):
            return "payroll_reviews", "payroll_review"
        if any(word in text for word in ["message", "reply", "email", "sms"]):
            return "message_drafts", "message_draft"
        if any(word in text for word in ["account", "xero", "myob", "gst", "tax", "export"]):
            return "accounting_reviews", "accounting_review"
        if any(word in text for word in ["quality", "proof", "photo"]):
            return "quality_reviews", "quality_review"
        if any(word in text for word in ["operation", "rule", "pattern"]):
            return "operations_reviews", "operations_review"
        return "jobs", "job"

    def base_record(user, slip, form, record_type):
        business_id, business_oid = business_ids(user)
        title = safe_text(form.get("title") or form.get("job") or form.get("name") or form.get("client") or form.get("subject") or slip.get("title"), "Approved Command draft")
        return {
            "business_id": business_id,
            "contractor_id": business_oid,
            "record_type": record_type,
            "title": title,
            "name": safe_text(form.get("name"), ""),
            "client": safe_text(form.get("client"), ""),
            "customer": safe_text(form.get("customer"), ""),
            "phone": safe_text(form.get("phone"), ""),
            "email": safe_text(form.get("email"), ""),
            "address": safe_text(form.get("address"), ""),
            "worker": safe_text(form.get("worker"), ""),
            "date": safe_text(form.get("date"), ""),
            "price": safe_text(form.get("price") or form.get("total") or form.get("amount"), ""),
            "notes": safe_text(form.get("notes") or form.get("scope") or form.get("line_items") or form.get("message") or form.get("reply"), ""),
            "prepared_form": serial(form),
            "status": "draft_approved",
            "source": "command_owner_approval",
            "command_slip_id": str(slip.get("_id")),
            "created_by": str(user.get("id")),
            "created_at": now(),
            "updated_at": now(),
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_file_tax": True,
        }

    async def insert_prepared_records(user, slip):
        payload = payload_of(slip)
        form = prepared_form(payload)
        collection_name, record_type = collection_for(slip, payload)
        rows = form.get("csv_rows") or form.get("records") or payload.get("csv_rows") or []
        if isinstance(rows, list) and rows:
            docs = []
            for row in rows[:100]:
                if not isinstance(row, dict):
                    continue
                docs.append(base_record(user, slip, row, record_type))
            if not docs:
                return {"applied": False, "collection": collection_name, "count": 0, "message": "CSV rows could not be read safely."}
            result = await db[collection_name].insert_many(docs)
            return {"applied": True, "collection": collection_name, "count": len(result.inserted_ids), "record_type": record_type, "ids": [str(item) for item in result.inserted_ids]}
        doc = base_record(user, slip, form, record_type)
        result = await db[collection_name].insert_one(doc)
        return {"applied": True, "collection": collection_name, "count": 1, "record_type": record_type, "id": str(result.inserted_id)}

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
        action = safe_text((payload or {}).get("action"), "approve")
        note = safe_text((payload or {}).get("note") or (payload or {}).get("owner_note"), "Owner approved the prepared direction.")
        applied = False
        execution = {"applied": False, "message": RECORD_ONLY_RESULT}
        if should_apply(action):
            execution = await insert_prepared_records(user, slip)
            applied = bool(execution.get("applied"))
        status = "approved_applied" if applied else "approved_recorded"
        result_message = SAFE_RESULT if applied else RECORD_ONLY_RESULT
        update = {
            "status": status,
            "approved_at": now(),
            "approved_by": str(user.get("id")),
            "owner_decision": {"action": action, "note": note, "safety": result_message},
            "result": {"stored_only": not applied, "message": result_message, "execution": serial(execution)},
            "updated_at": now(),
        }
        await db.command_slips.update_one({"_id": slip["_id"]}, {"$set": update, "$push": {"audit": audit_entry(user, status, note)}})
        slip.update(update)
        await command_event(user, status, slip, result_message)
        return {"success": True, "slip": doc_out(slip), "result": update["result"], "safety": result_message}

    return router
