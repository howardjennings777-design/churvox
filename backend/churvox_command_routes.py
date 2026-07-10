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
        await command_event(user, "scan_requested", None, "Command scan requested. No real records were changed.")
        return {"success": True, "slips": [], "message": "Safe scan recorded. Automatic slip creation is not enabled yet.", "safety": SAFE_RESULT}

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
