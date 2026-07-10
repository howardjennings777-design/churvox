from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request


SAFE_RESULT = "Owner approval recorded. Nothing was sent, synced, charged or changed."
OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]


def build_command_compat_router(db, get_current_user, ObjectId):
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

    def safe_text(value, fallback=""):
        text = " ".join(str(value or "").strip().split())
        return text[:900] or fallback

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

    def audit_entry(user, action, note=""):
        return {
            "by": str(user.get("id") or user.get("_id") or ""),
            "role": str(user.get("role") or "owner"),
            "action": action,
            "note": safe_text(note, ""),
            "at": now(),
            "safety": SAFE_RESULT,
        }

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
            "created_by": str(user.get("id") or user.get("_id") or ""),
            "created_at": now(),
        }
        await db.command_events.insert_one(doc)
        return doc

    def make_slip(user, source_type, action_type, title, found, prepared, why, payload=None, urgency="Owner review"):
        business_id, business_oid = business_ids(user)
        return {
            "business_id": business_id,
            "contractor_id": business_oid,
            "source_type": source_type,
            "source_id": safe_text((payload or {}).get("record_id") or title, action_type),
            "action_type": action_type,
            "title": safe_text(title, "Command decision"),
            "found": safe_text(found, "Command found work that needs owner approval."),
            "prepared": safe_text(prepared, "Prepared for owner approval."),
            "why": safe_text(why, "Owner approval is required before any real action."),
            "urgency": urgency,
            "status": "open",
            "payload": {
                "prepared_only": True,
                "owner_review_only": True,
                "no_auto_send": True,
                "no_auto_sync": True,
                "no_auto_charge": True,
                "no_auto_record_change": True,
                **(payload or {}),
            },
            "owner_review_only": True,
            "prepared_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            "created_by": str(user.get("id") or user.get("_id") or ""),
            "created_at": now(),
            "updated_at": now(),
            "audit": [audit_entry(user, "created", "Command slip created safely")],
        }

    @router.get("/command/events")
    async def list_command_events(request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        events = await db.command_events.find({"business_id": business_id}).sort("created_at", -1).limit(100).to_list(100)
        return {"success": True, "events": [doc_out(item) for item in events], "safety": SAFE_RESULT}

    @router.get("/command/audit")
    async def list_command_audit(request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        slips = await db.command_slips.find({"business_id": business_id}).sort("updated_at", -1).limit(80).to_list(80)
        audit = []
        for slip in slips:
            for entry in slip.get("audit") or []:
                row = dict(entry)
                row["slip_id"] = str(slip.get("_id"))
                row["title"] = safe_text(slip.get("title"), "Command slip")
                row["status"] = safe_text(slip.get("status"), "recorded")
                row["safety"] = safe_text(row.get("safety"), SAFE_RESULT)
                audit.append(serial(row))
        return {"success": True, "audit": audit[:120], "safety": SAFE_RESULT}

    @router.post("/command/worker-payment-request")
    async def create_worker_payment_request(payload: Dict[str, Any], request: Request):
        user = await require_command_participant(request)
        job_title = safe_text(payload.get("job_title") or payload.get("title"), "Worker payment request")
        amount = safe_text(payload.get("amount") or payload.get("amount_due"), "Amount needs owner check")
        invoice_number = safe_text(payload.get("invoice") or payload.get("invoice_number"), "No invoice linked")
        customer = safe_text(payload.get("customer") or payload.get("customer_name"), "Customer")
        doc = make_slip(
            user,
            "worker_payment",
            "prepare_payment_link",
            f"Worker payment link request: {job_title}",
            f"Worker asked to take card payment for {customer}. Amount: {amount}. Invoice: {invoice_number}.",
            "Prepare or attach an approved invoice payment link for the worker. No card was charged.",
            "Owner approval is required before a worker can show a payment link or collect card payment.",
            {
                "worker_payment_request": True,
                "job_title": job_title,
                "amount": amount,
                "invoice": invoice_number,
                "customer": customer,
                "payment_link": safe_text(payload.get("payment_link"), ""),
                "office_role": "Bookkeeper",
                "actions": ["Approve payment link", "Edit invoice", "Ask worker", "Park"],
                "will_do": ["Prepare payment-link draft only", "Keep card charge locked", "Record owner approval"],
                "prepared_form": {
                    "Client": customer,
                    "Job": job_title,
                    "Amount": amount,
                    "Invoice": invoice_number,
                    "Payment link": "Hold until owner approval",
                },
            },
        )
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
        update = safe_text(payload.get("update") or payload.get("note") or payload.get("message"), "Worker update needs owner review")
        update_type = safe_text(payload.get("update_type") or payload.get("type"), "Worker update")
        doc = make_slip(
            user,
            "worker_update",
            "worker_update_review",
            f"Worker update sent to Command: {job_title}",
            f"{update_type}: {update}",
            "Office team prepared this worker update for owner review.",
            "Owner approval is required before any job, client, invoice or message record changes.",
            {
                "worker_update_request": True,
                "job_title": job_title,
                "update": update,
                "update_type": update_type,
                "office_role": "Office Manager",
                "actions": ["Approve update", "Edit note", "Ask worker", "Park"],
                "will_do": ["Save update draft only", "Keep record changes locked", "Record owner approval"],
                "prepared_form": {
                    "Job": job_title,
                    "Update type": update_type,
                    "Worker note": update,
                    "Prepared action": "Review before changing any record",
                },
            },
        )
        doc["requested_by_worker"] = True
        doc["worker_user_id"] = str(user.get("id") or user.get("_id") or "")
        result = await db.command_slips.insert_one(doc)
        doc["_id"] = result.inserted_id
        await command_event(user, "worker_update_requested", doc, "Worker update prepared for owner review only")
        return {"success": True, "slip": doc_out(doc), "safety": SAFE_RESULT, "message": "Worker update sent to Command. Nothing was sent, synced, charged or changed."}

    return router
