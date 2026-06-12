# CHURVOX_NEW_USER_GUIDE_REAL_PROGRESS_20260611

from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Body
from typing import Any, Dict
import html

try:
    from email_provider import get_email_provider
except Exception:
    from .email_provider import get_email_provider

try:
    from sms_provider import get_sms_provider
except Exception:
    from .sms_provider import get_sms_provider


def build_onboarding_router(db, get_current_user, ObjectId):
    router = APIRouter(tags=["onboarding"])
    email_provider = get_email_provider()
    sms_provider = get_sms_provider()

    def now():
        return datetime.now(timezone.utc)

    def safe_dt(value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    def safe_doc(doc):
        if not doc:
            return None
        out = dict(doc)
        if "_id" in out:
            out["id"] = str(out["_id"])
            out["_id"] = str(out["_id"])
        out.pop("password_hash", None)
        out.pop("password", None)
        return {k: safe_dt(v) for k, v in out.items()}

    async def owner_business_id(user: Dict[str, Any]):
        raw = user.get("business_id") or user.get("id")
        if not raw:
            raise HTTPException(status_code=401, detail="Business not found")
        return str(raw)

    def clean(value: Any) -> str:
        return str(value or "").strip()

    def business_queries(business_id: str, user_id: str | None = None):
        ids = [str(business_id)]
        objects = []
        try:
            if ObjectId.is_valid(str(business_id)):
                objects.append(ObjectId(str(business_id)))
        except Exception:
            pass
        if user_id:
            ids.append(str(user_id))
            try:
                if ObjectId.is_valid(str(user_id)):
                    objects.append(ObjectId(str(user_id)))
            except Exception:
                pass

        mixed = ids + objects
        return [
            {"business_id": {"$in": mixed}},
            {"owner_id": {"$in": mixed}},
            {"user_id": {"$in": mixed}},
            {"created_by": {"$in": mixed}},
        ]

    def business_query(business_id: str, user_id: str | None = None, extra: Dict[str, Any] | None = None):
        q = {"$or": business_queries(business_id, user_id)}
        if extra:
            q = {"$and": [q, extra]}
        return q

    async def count_any(collection, business_id, user_id=None, extra=None):
        q = business_query(business_id, user_id, extra)
        try:
            return await db[collection].count_documents(q)
        except Exception:
            return 0

    async def find_latest(collection, business_id, user_id=None):
        q = business_query(business_id, user_id)
        try:
            doc = await db[collection].find_one(q, sort=[("created_at", -1)])
            return safe_doc(doc)
        except Exception:
            return None

    async def read_saved(business_id: str, user_id: str):
        try:
            saved = await db.onboarding_progress.find_one({
                "$or": [
                    {"business_id": business_id},
                    {"user_id": user_id},
                ]
            })
            return safe_doc(saved) or {}
        except Exception:
            return {}

    async def save_patch(business_id: str, user_id: str, patch: Dict[str, Any]):
        payload = dict(patch)
        payload["business_id"] = business_id
        payload["user_id"] = user_id
        payload["updated_at"] = now()
        await db.onboarding_progress.update_one(
            {"business_id": business_id},
            {"$set": payload, "$setOnInsert": {"created_at": now()}},
            upsert=True,
        )

    def profile_score(user):
        fields = [
            user.get("business_name"),
            user.get("email"),
            user.get("gst_rate"),
            user.get("trade_type"),
        ]
        done = sum(1 for x in fields if x not in (None, "", "other"))
        return done, len(fields)

    def make_step(key, title, why, action, page, done, proof="", time="1 min", optional=False):
        return {
            "key": key,
            "title": title,
            "why": why,
            "action": action,
            "page": page,
            "done": bool(done),
            "proof": proof,
            "time": time,
            "optional": optional,
        }

    async def build_progress(user):
        user_id = str(user.get("id"))
        business_id = await owner_business_id(user)
        saved = await read_saved(business_id, user_id)
        manual_done = set(saved.get("manual_done") or [])

        profile_done, profile_total = profile_score(user)
        clients = await count_any("clients", business_id, user_id)
        jobs = await count_any("jobs", business_id, user_id)
        invoices = await count_any("invoices", business_id, user_id)
        invoices_sent = await count_any("invoices", business_id, user_id, {"status": {"$in": ["sent", "paid", "overdue"]}})
        quotes = await count_any("quotes", business_id, user_id)
        workers = await count_any("users", business_id, user_id, {"role": {"$in": ["worker", "payroll", "manager", "office_admin"]}})
        command_slips = await count_any("command_slips", business_id, user_id)

        latest_client = await find_latest("clients", business_id, user_id)
        latest_job = await find_latest("jobs", business_id, user_id)
        latest_invoice = await find_latest("invoices", business_id, user_id)

        steps = [
            make_step("business_profile", "Set your business basics", "Your quotes, invoices and customer messages need the right name, GST and contact details.", "Open Settings", "settings", profile_done >= 3 or "business_profile" in manual_done, f"{profile_done}/{profile_total} basics found", "1 min"),
            make_step("first_client", "Add your first real client", "Churvox becomes useful when there is a real customer, address and contact history.", "Add / open Clients", "clients", clients > 0 or "first_client" in manual_done, f"{clients} client record{'s' if clients != 1 else ''}", "1 min"),
            make_step("first_job", "Create your first job", "This proves the main workflow: job → worker/self → complete → invoice.", "Create / open Jobs", "jobs", jobs > 0 or "first_job" in manual_done, f"{jobs} job record{'s' if jobs != 1 else ''}", "1 min"),
            make_step("worker_or_self", "Choose who will do the work", "A new owner should know they can assign a worker or run the job themselves.", "Open Worker / Team", "worker", workers > 0 or jobs > 0 or "worker_or_self" in manual_done, f"{workers} team member{'s' if workers != 1 else ''}", "45 sec", optional=True),
            make_step("first_invoice", "Send or prepare the first invoice", "This is the money moment. The user should see how Churvox helps them get paid.", "Open Invoices", "invoices", invoices_sent > 0 or invoices > 0 or "first_invoice" in manual_done, f"{invoices} invoice record{'s' if invoices != 1 else ''}", "1 min"),
            make_step("command_approval", "Approve one thing in Command", "This teaches the product promise: Churvox does the admin. You approve.", "Open Command", "command", command_slips > 0 or "command_approval" in manual_done, f"{command_slips} Command slip{'s' if command_slips != 1 else ''}", "30 sec"),
        ]

        required = [s for s in steps if not s.get("optional")]
        done_required = [s for s in required if s["done"]]
        percent = round((len(done_required) / max(len(required), 1)) * 100)
        next_step = next((s for s in steps if not s["done"] and not s.get("optional")), None) or next((s for s in steps if not s["done"]), None)

        return {
            "ok": True,
            "business_id": business_id,
            "user_id": user_id,
            "dismissed": bool(saved.get("dismissed")),
            "skipped": bool(saved.get("skipped")),
            "completed": percent >= 100,
            "percent": percent,
            "done": len(done_required),
            "total": len(required),
            "steps": steps,
            "next_step": next_step,
            "counts": {"clients": clients, "jobs": jobs, "quotes": quotes, "invoices": invoices, "invoices_sent": invoices_sent, "workers": workers, "command_slips": command_slips},
            "latest": {"client": latest_client, "job": latest_job, "invoice": latest_invoice},
            "message": "Churvox does the admin. You approve.",
        }

    def field_value(draft: Dict[str, Any], key: str, fallback: str = "") -> str:
        for item in draft.get("fields") or []:
            if item.get("key") == key:
                return clean(item.get("value")) or fallback
        return fallback

    def html_email(title: str, body: str) -> str:
        safe_title = html.escape(clean(title) or "Churvox update")
        safe_body = html.escape(clean(body)).replace("\n", "<br>")
        return f"<div style='font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#111827;line-height:1.5'><h2>{safe_title}</h2><p>{safe_body}</p><hr><p style='font-size:12px;color:#64748b'>Sent by Churvox after owner approval.</p></div>"

    async def find_record(collection: str, business_id: str, user_id: str, value: str):
        value = clean(value)
        if not value:
            return None
        q_base = business_query(business_id, user_id)
        possible = []
        if ObjectId.is_valid(value):
            possible.append({"_id": ObjectId(value)})
        possible.extend([
            {"id": value}, {"title": value}, {"name": value}, {"customer_name": value},
            {"job_title": value}, {"invoice_number": value}, {"quote_number": value}, {"email": value.lower()},
        ])
        for extra in possible:
            try:
                doc = await db[collection].find_one({"$and": [q_base, extra]})
                if doc:
                    return doc
            except Exception:
                pass
        return None

    async def send_email_if_possible(to_email: str, subject: str, body: str, business_id: str, execution_id):
        to_email = clean(to_email)
        if not to_email or "@" not in to_email:
            return {"channel": "email", "sent": False, "status": "no_recipient", "message": "Email not sent — no valid email on the prepared form."}
        result = await email_provider.send(to_email, subject, html_email(subject, body), body)
        log = {"business_id": business_id, "execution_id": execution_id, "to": to_email, "subject": subject, "body": body, "sent": bool(result.success), "provider": result.provider, "email_id": result.email_id, "error": result.error, "created_at": now()}
        await db.command_outbox.insert_one(log)
        return {"channel": "email", "sent": bool(result.success), "status": "sent" if result.success else "failed", "provider": result.provider, "id": result.email_id, "error": result.error}

    async def send_sms_if_possible(to_phone: str, body: str, business_id: str, execution_id):
        to_phone = clean(to_phone)
        if not to_phone:
            return {"channel": "sms", "sent": False, "status": "no_recipient", "message": "SMS not sent — no phone number on the prepared form."}
        result = await sms_provider.send(to_phone, body, source="Churvox")
        log = {"business_id": business_id, "execution_id": execution_id, "to": to_phone, "body": body, "sent": bool(result.success), "provider": result.provider, "message_id": result.message_id, "status": result.status, "error": result.error, "created_at": now()}
        await db.command_outbox.insert_one(log)
        return {"channel": "sms", "sent": bool(result.success), "status": result.status, "provider": result.provider, "id": result.message_id, "error": result.error}

    async def execute_worker_assignment(draft, business_id, user_id):
        job_value = field_value(draft, "job")
        worker_value = field_value(draft, "worker")
        notes = field_value(draft, "workerNotes")
        job = await find_record("jobs", business_id, user_id, job_value)
        worker = await find_record("users", business_id, user_id, worker_value)
        updates = []
        communication = []
        if job and worker:
            await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"assigned_worker_id": str(worker["_id"]), "worker_id": str(worker["_id"]), "assigned_worker_name": worker.get("name"), "worker_notes": notes, "status": "assigned", "updated_at": now()}})
            updates.append("Job assigned to worker")
            subject = f"New job assigned: {job.get('title') or job.get('job_title') or 'Job'}"
            body = f"You have been assigned a job.\n\nJob: {job.get('title') or job.get('job_title') or job_value}\nAddress: {field_value(draft, 'address', job.get('address', ''))}\nTime: {field_value(draft, 'timeWindow')}\nNotes: {notes}"
            communication.append(await send_email_if_possible(worker.get("email"), subject, body, business_id, None))
            communication.append(await send_sms_if_possible(worker.get("phone"), body, business_id, None))
        else:
            updates.append("Assignment saved for review — job or worker could not be matched automatically")
        return updates, communication

    async def execute_invoice(draft, business_id, user_id):
        customer = field_value(draft, "customer")
        customer_email = field_value(draft, "customerEmail")
        amount_raw = field_value(draft, "amount", "0").replace("$", "").replace(",", "")
        try:
            subtotal = float(amount_raw)
        except Exception:
            subtotal = 0.0
        invoice = {"business_id": business_id, "customer_name": customer or "Customer", "customer_email": customer_email, "description": field_value(draft, "serviceLine"), "subtotal": subtotal, "gst_rate": 15, "notes": field_value(draft, "invoiceNote"), "status": "sent" if customer_email else "draft", "created_at": now(), "updated_at": now(), "source": "command_approval"}
        result = await db.invoices.insert_one(invoice)
        updates = ["Invoice created" + (" and marked sent" if customer_email else " as draft")]
        communication = []
        if customer_email:
            body = f"Hi {customer or 'there'},\n\nYour invoice is ready.\n\n{invoice['description']}\nAmount: ${subtotal:.2f}\n\n{invoice['notes']}"
            communication.append(await send_email_if_possible(customer_email, "Your invoice from Churvox", body, business_id, result.inserted_id))
        return updates, communication

    async def execute_message(draft, business_id, user_id, kind):
        customer = field_value(draft, "customer")
        message = field_value(draft, "message")
        email_to = field_value(draft, "email") or field_value(draft, "customerEmail")
        phone_to = field_value(draft, "phone")
        if customer and not email_to and not phone_to:
            client = await find_record("clients", business_id, user_id, customer)
            if client:
                email_to = client.get("email", "")
                phone_to = client.get("phone", "")
        subject = "Churvox update"
        if kind == "payment":
            subject = "Payment reminder"
        elif kind == "quote":
            subject = "Following up on your quote"
        communication = [
            await send_email_if_possible(email_to, subject, message, business_id, None),
            await send_sms_if_possible(phone_to, message, business_id, None),
        ]
        await db.customer_followups.insert_one({"business_id": business_id, "customer": customer, "kind": kind, "message": message, "email": email_to, "phone": phone_to, "created_at": now(), "source": "command_approval"})
        return ["Follow-up recorded"], communication

    async def execute_job_fix(draft, business_id, user_id):
        job = await find_record("jobs", business_id, user_id, field_value(draft, "job"))
        update_data = {"updated_at": now(), "source": "command_approval"}
        if field_value(draft, "price"):
            try:
                update_data["price"] = float(field_value(draft, "price").replace("$", ""))
            except Exception:
                update_data["price_note"] = field_value(draft, "price")
        if field_value(draft, "worker"):
            update_data["assigned_worker_name"] = field_value(draft, "worker")
        if field_value(draft, "ownerFix"):
            update_data["notes"] = field_value(draft, "ownerFix")
        if job:
            await db.jobs.update_one({"_id": job["_id"]}, {"$set": update_data})
            return ["Job updated from Command"], []
        await db.command_job_fixes.insert_one({"business_id": business_id, "draft": draft, "created_at": now()})
        return ["Job fix saved for review"], []

    async def execute_client_fix(draft, business_id, user_id):
        client = await find_record("clients", business_id, user_id, field_value(draft, "client"))
        update_data = {"phone": field_value(draft, "phone"), "email": field_value(draft, "email"), "address": field_value(draft, "address"), "notes": field_value(draft, "notes"), "updated_at": now()}
        update_data = {k: v for k, v in update_data.items() if v not in (None, "")}
        if client:
            await db.clients.update_one({"_id": client["_id"]}, {"$set": update_data})
            return ["Client details updated"], []
        update_data.update({"business_id": business_id, "name": field_value(draft, "client") or "New client", "created_at": now(), "source": "command_approval"})
        await db.clients.insert_one(update_data)
        return ["Client created from Command details"], []

    async def execute_worker_time(draft, business_id):
        await db.payroll_time_approvals.insert_one({"business_id": business_id, "draft": draft, "status": "approved", "approved_at": now(), "source": "command_approval"})
        return ["Worker time approved for payroll workspace"], []

    async def execute_setup(draft, business_id, user_id):
        await save_patch(business_id, user_id, {"command_setup_fix": draft, "manual_done": ["business_profile", "command_approval"]})
        return ["Setup fix saved"], []

    async def run_execution(action_type, draft, business_id, user_id):
        if action_type == "assign_worker":
            return await execute_worker_assignment(draft, business_id, user_id)
        if action_type == "review_invoice":
            return await execute_invoice(draft, business_id, user_id)
        if action_type == "send_payment_reminder":
            return await execute_message(draft, business_id, user_id, "payment")
        if action_type == "send_quote_followup":
            return await execute_message(draft, business_id, user_id, "quote")
        if action_type == "fix_missing_info":
            return await execute_job_fix(draft, business_id, user_id)
        if action_type == "fix_client_info":
            return await execute_client_fix(draft, business_id, user_id)
        if action_type == "review_worker_time":
            return await execute_worker_time(draft, business_id)
        if action_type == "fix_setup_step":
            return await execute_setup(draft, business_id, user_id)
        return ["Prepared action approved and recorded"], []

    @router.post("/command/execute")
    async def execute_command(payload: Dict[str, Any] = Body(default={}), request: Request = None):
        user = await get_current_user(request)
        business_id = await owner_business_id(user)
        user_id = str(user.get("id"))
        draft = payload.get("draft") if isinstance(payload.get("draft"), dict) else {}
        action_type = clean(payload.get("actionType") or draft.get("actionType") or payload.get("action_type") or "owner_review")
        slip_id = clean(payload.get("slipId") or payload.get("slip_id") or payload.get("id"))
        updates, communication = await run_execution(action_type, draft, business_id, user_id)
        execution = {"business_id": business_id, "user_id": user_id, "slip_id": slip_id, "action_type": action_type, "draft": draft, "updates": updates, "communication": communication, "status": "executed", "created_at": now()}
        result = await db.command_executions.insert_one(execution)
        execution["_id"] = result.inserted_id
        if slip_id:
            await db.command_slips.update_one({"business_id": business_id, "id": slip_id}, {"$set": {"status": "approved", "executed_at": now(), "execution_id": str(result.inserted_id), "draft": draft}}, upsert=True)
        return {"ok": True, "success": True, "executed": True, "execution": safe_doc(execution), "updates": updates, "communication": communication, "message": "Approved and executed"}

    @router.post("/command/slips/{slip_id}/approve")
    async def approve_command_slip(slip_id: str, payload: Dict[str, Any] = Body(default={}), request: Request = None):
        payload = dict(payload or {})
        payload["slipId"] = slip_id
        return await execute_command(payload, request)

    @router.get("/command/slips")
    async def command_slips(request: Request):
        user = await get_current_user(request)
        business_id = await owner_business_id(user)
        cursor = db.command_slips.find({"business_id": business_id}).sort("created_at", -1).limit(80)
        items = []
        async for item in cursor:
            items.append(safe_doc(item))
        return {"ok": True, "success": True, "slips": items}

    @router.post("/command/scan")
    async def command_scan(request: Request, payload: Dict[str, Any] = Body(default={})):
        user = await get_current_user(request)
        business_id = await owner_business_id(user)
        return {"ok": True, "success": True, "slips": [], "message": "Command scan ready. Frontend prepared trays remain active."}

    @router.get("/onboarding/progress")
    async def onboarding_progress(request: Request):
        user = await get_current_user(request)
        return await build_progress(user)

    @router.post("/onboarding/step/{step_key}/done")
    async def mark_step_done(step_key: str, request: Request):
        user = await get_current_user(request)
        business_id = await owner_business_id(user)
        user_id = str(user.get("id"))
        saved = await read_saved(business_id, user_id)
        manual_done = set(saved.get("manual_done") or [])
        manual_done.add(step_key)
        await save_patch(business_id, user_id, {"manual_done": sorted(manual_done), "dismissed": False, "skipped": False})
        return await build_progress(user)

    @router.post("/onboarding/state")
    async def onboarding_state(request: Request, payload: Dict[str, Any] = Body(default={})):
        user = await get_current_user(request)
        business_id = await owner_business_id(user)
        user_id = str(user.get("id"))
        patch = {}
        if "dismissed" in payload:
            patch["dismissed"] = bool(payload.get("dismissed"))
        if "skipped" in payload:
            patch["skipped"] = bool(payload.get("skipped"))
        if payload.get("resume"):
            patch["dismissed"] = False
            patch["skipped"] = False
        await save_patch(business_id, user_id, patch)
        return await build_progress(user)

    return router
