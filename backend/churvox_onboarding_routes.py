# CHURVOX_COMMAND_REAL_DATA_SCAN_20260612

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Body
from typing import Any, Dict, List
import html

try:
    from email_provider import get_email_provider
except Exception:
    from .email_provider import get_email_provider

try:
    from sms_provider import get_sms_provider
except Exception:
    from .sms_provider import get_sms_provider

DRAFT_VERSION = "right-panel-v3"


def build_onboarding_router(db, get_current_user, ObjectId):
    router = APIRouter(tags=["command", "onboarding"])
    email_provider = get_email_provider()
    sms_provider = get_sms_provider()

    def now():
        return datetime.now(timezone.utc)

    def clean(value: Any) -> str:
        return str(value or "").strip()

    def low(value: Any) -> str:
        return clean(value).lower()

    def safe(value):
        if isinstance(value, datetime):
            return value.isoformat()
        if ObjectId and isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, dict):
            return {k: safe(v) for k, v in value.items() if k not in {"password_hash", "password"}}
        if isinstance(value, list):
            return [safe(v) for v in value]
        return value

    def oid_values(*values):
        out = []
        for value in values:
            if value in (None, ""):
                continue
            text = str(value)
            out.append(text)
            try:
                if ObjectId.is_valid(text):
                    out.append(ObjectId(text))
            except Exception:
                pass
        return out

    async def business_id_for(user: Dict[str, Any]) -> str:
        bid = user.get("business_id") or user.get("businessId") or user.get("id") or user.get("_id")
        if not bid:
            raise HTTPException(status_code=401, detail="Business not found")
        return str(bid)

    def bquery(bid: str, uid: str | None = None, extra: Dict[str, Any] | None = None):
        ids = oid_values(bid, uid)
        base = {"$or": [
            {"business_id": {"$in": ids}}, {"businessId": {"$in": ids}},
            {"owner_id": {"$in": ids}}, {"ownerId": {"$in": ids}},
            {"user_id": {"$in": ids}}, {"userId": {"$in": ids}},
            {"created_by": {"$in": ids}}, {"createdBy": {"$in": ids}},
        ]}
        return {"$and": [base, extra]} if extra else base

    async def many(name: str, bid: str, uid: str, extra=None, limit=80):
        try:
            items = []
            cursor = db[name].find(bquery(bid, uid, extra)).sort("created_at", -1).limit(limit)
            async for item in cursor:
                items.append(item)
            return items
        except Exception:
            return []

    async def count(name: str, bid: str, uid: str, extra=None):
        try:
            return await db[name].count_documents(bquery(bid, uid, extra))
        except Exception:
            return 0

    def did(doc):
        return str((doc or {}).get("_id") or (doc or {}).get("id") or "")

    def first(*values, default=""):
        for value in values:
            value = clean(value)
            if value:
                return value
        return default

    def name(doc, default=""):
        return first((doc or {}).get("name"), (doc or {}).get("full_name"), (doc or {}).get("customer_name"), (doc or {}).get("client_name"), (doc or {}).get("title"), (doc or {}).get("job_title"), default=default)

    def dollars(*values):
        for value in values:
            if value not in (None, ""):
                try:
                    return f"${float(str(value).replace('$', '').replace(',', '')):.2f}"
                except Exception:
                    return str(value)
        return ""

    def field(key, label, value="", kind="text", options=None):
        data = {"key": key, "label": label, "value": clean(value), "type": kind}
        if options:
            data["options"] = options
        return data

    def draft(kind, title, approve, found, why, fields, related=None):
        return {"version": DRAFT_VERSION, "type": kind, "actionType": kind, "title": title, "approve": approve, "found": found, "why": why, "fields": fields, "related": related or {}}

    def slip(kind, title, source, page, urgency, draft_data, related=None):
        related = related or {}
        rid = related.get("job_id") or related.get("invoice_id") or related.get("quote_id") or related.get("client_id") or related.get("time_id") or title.lower().replace(" ", "-")
        return {"id": f"{kind}:{rid}", "type": kind, "actionType": kind, "title": title, "source": source, "page": page, "urgency": urgency, "status": "open", "created_at": now(), "draft": draft_data, "related": related, "business_id": related.get("business_id")}

    def fv(draft_data, want, fallback=""):
        want_norm = low(want).replace(" ", "").replace("_", "")
        aliases = {
            "job": {"job", "jobtitle"}, "worker": {"worker", "assignedworker"},
            "workerNotes": {"workernote", "workernotes", "workernote"}, "address": {"address", "jobaddress"},
            "timeWindow": {"timewindow", "time", "slot"}, "customer": {"customer", "client"},
            "email": {"email", "customeremail", "clientemail"}, "customerEmail": {"email", "customeremail", "clientemail"},
            "phone": {"phone", "mobile", "customerphone"}, "amount": {"amount", "amountdue", "price", "total"},
            "serviceLine": {"serviceline", "description"}, "invoiceNote": {"invoicenote", "note", "notes"},
            "message": {"message", "remindermessage", "preparedreply"}, "ownerFix": {"ownerfix", "notes", "whatneedsentering"},
            "price": {"price", "amount"}, "client": {"client", "customer"},
        }.get(want, {want_norm})
        for item in draft_data.get("fields") or []:
            keys = {low(item.get("key")).replace(" ", "").replace("_", ""), low(item.get("label")).replace(" ", "").replace("_", "")}
            if keys & aliases:
                return clean(item.get("value")) or fallback
        return fallback

    async def find_one(name_, bid, uid, value):
        value = clean(value)
        if not value:
            return None
        q = bquery(bid, uid)
        possibles = []
        try:
            if ObjectId.is_valid(value):
                possibles.append({"_id": ObjectId(value)})
        except Exception:
            pass
        possibles += [{"id": value}, {"name": value}, {"title": value}, {"job_title": value}, {"customer_name": value}, {"client_name": value}, {"email": value.lower()}]
        for extra in possibles:
            try:
                found = await db[name_].find_one({"$and": [q, extra]})
                if found:
                    return found
            except Exception:
                pass
        return None

    async def best_worker(bid, uid, job=None):
        workers = await many("users", bid, uid, {"role": {"$in": ["worker", "manager", "office_admin", "payroll"]}}, 60)
        if not workers:
            workers = await many("team", bid, uid, None, 60)
        if not workers:
            return None
        area = low((job or {}).get("area") or (job or {}).get("suburb") or (job or {}).get("address"))
        def score(worker):
            s = 0
            if low(worker.get("status")) not in {"inactive", "archived", "disabled"}: s += 10
            if area and low(worker.get("area") or worker.get("suburb")) in area: s += 8
            if worker.get("email") or worker.get("phone"): s += 5
            if low(worker.get("role")) == "worker": s += 3
            return s
        return sorted(workers, key=score, reverse=True)[0]

    async def send_email(to_email, subject, body, bid, ref=None):
        to_email = clean(to_email)
        if not to_email or "@" not in to_email:
            return {"channel": "email", "sent": False, "status": "no_recipient"}
        html_body = f"<div style='font-family:system-ui;color:#111827;line-height:1.5'><h2>{html.escape(subject)}</h2><p>{html.escape(body).replace(chr(10), '<br>')}</p></div>"
        result = await email_provider.send(to_email, subject, html_body, body)
        await db.command_outbox.insert_one({"business_id": bid, "kind": "email", "to": to_email, "subject": subject, "body": body, "sent": bool(result.success), "provider": result.provider, "error": result.error, "ref": str(ref or ""), "created_at": now()})
        return {"channel": "email", "sent": bool(result.success), "status": "sent" if result.success else "failed", "provider": result.provider, "error": result.error}

    async def send_sms(to_phone, body, bid, ref=None):
        to_phone = clean(to_phone)
        if not to_phone:
            return {"channel": "sms", "sent": False, "status": "no_recipient"}
        result = await sms_provider.send(to_phone, body, source="Churvox")
        await db.command_outbox.insert_one({"business_id": bid, "kind": "sms", "to": to_phone, "body": body, "sent": bool(result.success), "provider": result.provider, "error": result.error, "ref": str(ref or ""), "created_at": now()})
        return {"channel": "sms", "sent": bool(result.success), "status": result.status, "provider": result.provider, "error": result.error}

    async def build_slips(bid, uid, user):
        jobs = await many("jobs", bid, uid, None, 80)
        invoices = await many("invoices", bid, uid, None, 80)
        quotes = await many("quotes", bid, uid, None, 60)
        clients = await many("clients", bid, uid, None, 80)
        logs = await many("time_logs", bid, uid, None, 50)
        messages = await many("messages", bid, uid, None, 50)
        invoice_job_ids = {str(i.get("job_id") or i.get("jobId") or "") for i in invoices}
        slips = []
        for job in jobs:
            jid = did(job); status = low(job.get("status")); title = name(job, "Job")
            customer = first(job.get("customer_name"), job.get("client_name"), job.get("customer"), default="Customer from job")
            price = dollars(job.get("price"), job.get("amount"), job.get("total"))
            completed = status in {"complete", "completed", "done", "finished"} or bool(job.get("completed_at") or job.get("completedAt"))
            if completed and jid not in invoice_job_ids:
                d = draft("invoice", "Invoice ready", "Send invoice", "Completed job has no invoice yet.", "Completed work should be turned into money.", [field("customer", "Customer", customer), field("job", "Job", title), field("amount", "Amount", price or "Review price"), field("gst", "GST", user.get("gst_rate") or "15%"), field("dueDate", "Due date", (now()+timedelta(days=7)).date().isoformat(), "date"), field("serviceLine", "Service line", first(job.get("description"), default="Completed service work"), "textarea"), field("invoiceNote", "Invoice note", "Thanks for your business.", "textarea"), field("customerEmail", "Customer email", first(job.get("customer_email"), job.get("email")), "email")], {"job_id": jid})
                slips.append(slip("invoice", "Completed job needs invoicing", "Jobs + Invoices", "invoices", "High", d, {"job_id": jid, "business_id": bid}))
            assigned = first(job.get("worker_id"), job.get("assigned_worker_id"), job.get("assigned_worker_name"))
            if not assigned and status not in {"cancelled", "archived"}:
                worker = await best_worker(bid, uid, job); worker_name = name(worker, "Best available worker")
                d = draft("worker", "Worker assignment", "Assign + notify worker", "Job has no worker assigned.", "Unassigned jobs become customer problems fast.", [field("job", "Job", title), field("worker", "Worker", worker_name, "select", [worker_name, "Owner / myself", "Leave unassigned"]), field("date", "Date", first(job.get("date"), job.get("scheduled_date"), default=now().date().isoformat()), "date"), field("timeWindow", "Time window", first(job.get("time_window"), default="Next available slot")), field("address", "Address", first(job.get("address"), job.get("site_address"), default="Job address")), field("notify", "Notify worker", "App + email + SMS", "select", ["App + email + SMS", "Email + SMS", "Email only", "SMS only", "Do not notify yet"]), field("workerNotes", "Worker note", "Check access, take photos, add completion notes.", "textarea")], {"job_id": jid, "worker_id": did(worker)})
                slips.append(slip("worker", "Job needs worker assigned", "Jobs + Team", "jobs", "High", d, {"job_id": jid, "worker_id": did(worker), "business_id": bid}))
            missing = []
            if not first(job.get("address"), job.get("site_address")): missing.append("Address")
            if not price: missing.append("Price")
            if not first(job.get("notes"), job.get("description"), job.get("access_notes")): missing.append("Notes")
            if missing:
                d = draft("jobInfo", "Job info fix", "Save job fix", f"Missing: {', '.join(missing)}", "Churvox will not guess missing job details.", [field("job", "Job", title), field("price", "Price", price or "Add price"), field("worker", "Worker", "Best available worker"), field("missingDetails", "Missing details", ", ".join(missing), "textarea"), field("ownerFix", "Owner fix", "Enter the missing information here.", "textarea")], {"job_id": jid})
                slips.append(slip("jobInfo", "Job missing key info", "Jobs", "jobs", "High", d, {"job_id": jid, "business_id": bid}))
        for inv in invoices:
            if low(inv.get("status")) in {"overdue", "unpaid"}:
                d = draft("reminder", "Payment reminder", "Send reminder", "Invoice is overdue or unpaid.", "Follow up early to protect cashflow.", [field("customer", "Customer", first(inv.get("customer_name"), inv.get("client_name"), default="Customer from invoice")), field("invoice", "Invoice", first(inv.get("invoice_number"), inv.get("number"), default="Invoice from record")), field("amountDue", "Amount due", dollars(inv.get("balance"), inv.get("amount_due"), inv.get("total")) or "Review amount"), field("email", "Email", first(inv.get("customer_email"), inv.get("email")), "email"), field("phone", "Phone", first(inv.get("customer_phone"), inv.get("phone"))), field("message", "Reminder message", "Hi, just a friendly reminder this invoice is still showing as unpaid.", "textarea")], {"invoice_id": did(inv)})
                slips.append(slip("reminder", "Overdue invoice needs chasing", "Invoices + Payments", "payments", "High", d, {"invoice_id": did(inv), "business_id": bid}))
        for quote in quotes:
            if low(quote.get("status")) not in {"accepted", "approved", "won", "declined", "lost", "rejected"}:
                d = draft("quote", "Quote follow-up", "Send follow-up", "Quote is open and waiting.", "Open quotes are possible work not yet won.", [field("customer", "Customer", first(quote.get("customer_name"), quote.get("client_name"), default="Customer from quote")), field("quote", "Quote", first(quote.get("quote_number"), quote.get("number"), default="Open quote")), field("quoteValue", "Quote value", dollars(quote.get("total"), quote.get("amount")) or "Review value"), field("email", "Email", first(quote.get("customer_email"), quote.get("email")), "email"), field("phone", "Phone", first(quote.get("customer_phone"), quote.get("phone"))), field("message", "Message", "Hi, just checking in on the quote we sent through.", "textarea")], {"quote_id": did(quote)})
                slips.append(slip("quote", "Open quote needs follow-up", "Quotes + Clients", "quotes", "Medium", d, {"quote_id": did(quote), "business_id": bid}))
        for client in clients:
            missing = []
            if not client.get("email"): missing.append("Email")
            if not client.get("phone"): missing.append("Phone")
            if not first(client.get("address"), client.get("site_address")): missing.append("Address")
            if missing:
                d = draft("client", "Client details", "Save client fix", f"Client missing {', '.join(missing)}.", "Customer details are needed for messages, quotes and invoices.", [field("client", "Client", name(client, "Client")), field("phone", "Phone", client.get("phone", "")), field("email", "Email", client.get("email", ""), "email"), field("address", "Address", first(client.get("address"), client.get("site_address"))), field("notes", "Notes", first(client.get("notes"), client.get("access_notes")), "textarea")], {"client_id": did(client)})
                slips.append(slip("client", "Client details missing", "Clients", "clients", "Medium", d, {"client_id": did(client), "business_id": bid}))
        for log in logs:
            if low(log.get("status")) not in {"approved", "paid", "exported"}:
                d = draft("time", "Worker time", "Approve time", "Worker time is waiting for review.", "Time affects payroll and job costing.", [field("worker", "Worker", first(log.get("worker_name"), log.get("worker"), default="Worker name")), field("job", "Job", first(log.get("job_title"), log.get("job"), default="Completed job")), field("date", "Date", first(log.get("date"), default=now().date().isoformat()), "date"), field("start", "Start", first(log.get("start"), log.get("start_time"), default="Start time")), field("finish", "Finish", first(log.get("finish"), log.get("end_time"), default="Finish time")), field("total", "Total", first(log.get("total"), log.get("hours"), default="Review hours")), field("adjustment", "Adjustment note", "Check breaks, travel and manual edits.", "textarea")], {"time_id": did(log)})
                slips.append(slip("time", "Worker time needs review", "Time + Payroll", "payroll", "Medium", d, {"time_id": did(log), "business_id": bid}))
        for msg in messages:
            if low(msg.get("status")) not in {"handled", "closed", "sent"}:
                d = draft("workerMessage", "Worker reply", "Send worker reply", "Worker message needs owner response.", "Workers should not wait while the owner searches pages.", [field("worker", "Worker", first(msg.get("worker_name"), msg.get("from_name"), default="Worker name")), field("job", "Job", first(msg.get("job_title"), msg.get("job"), default="Related job")), field("workerMessage", "Worker message", first(msg.get("body"), msg.get("message"), default="Worker asked for help."), "textarea"), field("preparedReply", "Prepared reply", "Thanks, I’ll check this and update the job notes now.", "textarea"), field("saveToJob", "Save to job note", "Save this decision to job activity.", "textarea"), field("notify", "Notify worker", "App + email + SMS")], {"message_id": did(msg)})
                slips.append(slip("workerMessage", "Worker message needs reply", "Messages + Jobs", "messages", "High", d, {"message_id": did(msg), "business_id": bid}))
        if not clients or not jobs or not invoices:
            miss = []
            if not clients: miss.append("first client")
            if not jobs: miss.append("first job")
            if not invoices: miss.append("first invoice")
            d = draft("setup", "Setup fix", "Save setup fix", f"Setup missing: {', '.join(miss)}", "Command gets stronger once the first real workflow is connected.", [field("area", "Area", "Business setup"), field("missingStep", "Missing step", ", ".join(miss)), field("ownerInput", "What needs entering", "Add the missing setup item so Command can prepare real work.", "textarea"), field("notes", "Notes", "Once done, Command will stop showing setup warnings.", "textarea")])
            slips.append(slip("setup", "Setup needs finishing", "Settings + first workflow", "setupassistant", "High", d, {"business_id": bid}))
        return list({s["id"]: s for s in slips}.values())[:80]

    async def execute_kind(kind, draft_data, bid, uid):
        related = draft_data.get("related") or {}
        if kind in {"worker", "assign_worker"}:
            job = await find_one("jobs", bid, uid, related.get("job_id") or fv(draft_data, "job"))
            worker = await find_one("users", bid, uid, related.get("worker_id") or fv(draft_data, "worker")) or await best_worker(bid, uid, job)
            if job and worker:
                await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"worker_id": did(worker), "assigned_worker_id": did(worker), "assigned_worker_name": name(worker), "worker_notes": fv(draft_data, "workerNotes"), "status": "assigned", "updated_at": now()}})
                body = f"New job assigned: {name(job, 'Job')}\n{fv(draft_data, 'address')}\n{fv(draft_data, 'workerNotes')}"
                return ["Job assigned"], [await send_email(worker.get("email"), "New job assigned", body, bid), await send_sms(worker.get("phone"), body, bid)]
            return ["Could not match job or worker"], []
        if kind in {"invoice", "review_invoice", "send_invoice"}:
            amount = fv(draft_data, "amount", "0").replace("$", "").replace(",", "")
            try: total = float(amount)
            except Exception: total = 0.0
            doc = {"business_id": bid, "customer_name": fv(draft_data, "customer"), "customer_email": fv(draft_data, "customerEmail"), "description": fv(draft_data, "serviceLine"), "subtotal": total, "status": "sent" if fv(draft_data, "customerEmail") else "draft", "source": "command_approval", "created_at": now(), "updated_at": now()}
            result = await db.invoices.insert_one(doc)
            comms = []
            if doc["customer_email"]:
                comms.append(await send_email(doc["customer_email"], "Your invoice is ready", f"Your invoice is ready. Amount: ${total:.2f}", bid, result.inserted_id))
            return ["Invoice created"], comms
        if kind in {"reminder", "send_payment_reminder", "payment"}:
            return ["Payment follow-up recorded"], [await send_email(fv(draft_data, "email"), "Payment reminder", fv(draft_data, "message"), bid), await send_sms(fv(draft_data, "phone"), fv(draft_data, "message"), bid)]
        if kind in {"quote", "send_quote_followup"}:
            return ["Quote follow-up recorded"], [await send_email(fv(draft_data, "email"), "Following up on your quote", fv(draft_data, "message"), bid), await send_sms(fv(draft_data, "phone"), fv(draft_data, "message"), bid)]
        if kind in {"jobinfo", "fix_missing_info"}:
            job = await find_one("jobs", bid, uid, related.get("job_id") or fv(draft_data, "job"))
            if job:
                await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"price_note": fv(draft_data, "price"), "notes": fv(draft_data, "ownerFix"), "updated_at": now()}})
                return ["Job updated"], []
            await db.command_job_fixes.insert_one({"business_id": bid, "draft": draft_data, "created_at": now()})
            return ["Job fix saved"], []
        if kind in {"client", "fix_client_info"}:
            client = await find_one("clients", bid, uid, related.get("client_id") or fv(draft_data, "client"))
            data = {"phone": fv(draft_data, "phone"), "email": fv(draft_data, "email"), "address": fv(draft_data, "address"), "notes": fv(draft_data, "notes"), "updated_at": now()}
            if client:
                await db.clients.update_one({"_id": client["_id"]}, {"$set": data})
            else:
                data.update({"business_id": bid, "name": fv(draft_data, "client"), "created_at": now()}); await db.clients.insert_one(data)
            return ["Client saved"], []
        if kind in {"time", "review_worker_time"}:
            await db.payroll_time_approvals.insert_one({"business_id": bid, "draft": draft_data, "status": "approved", "created_at": now()})
            return ["Worker time approved"], []
        await db.command_executions.insert_one({"business_id": bid, "draft": draft_data, "status": "recorded", "created_at": now()})
        return ["Action recorded"], []

    @router.get("/command/slips")
    async def command_slips(request: Request):
        user = await get_current_user(request); bid = await business_id_for(user); uid = str(user.get("id"))
        existing = []
        try:
            cursor = db.command_slips.find({"business_id": bid, "status": {"$in": ["open", "edited"]}}).sort("created_at", -1).limit(80)
            async for item in cursor:
                existing.append(safe(item))
        except Exception:
            pass
        if existing: return {"ok": True, "success": True, "slips": existing}
        return {"ok": True, "success": True, "slips": [safe(s) for s in await build_slips(bid, uid, user)]}

    @router.post("/command/scan")
    async def command_scan(request: Request, payload: Dict[str, Any] = Body(default={})):
        user = await get_current_user(request); bid = await business_id_for(user); uid = str(user.get("id"))
        slips = await build_slips(bid, uid, user)
        for item in slips:
            item["business_id"] = bid
            await db.command_slips.update_one({"business_id": bid, "id": item["id"]}, {"$set": {**item, "updated_at": now()}, "$setOnInsert": {"created_at": now()}}, upsert=True)
        return {"ok": True, "success": True, "slips": [safe(s) for s in slips], "message": "Command scanned jobs, invoices, quotes, clients, workers, messages, time and setup."}

    @router.post("/command/execute")
    async def command_execute(payload: Dict[str, Any] = Body(default={}), request: Request = None):
        user = await get_current_user(request); bid = await business_id_for(user); uid = str(user.get("id"))
        draft_data = payload.get("draft") if isinstance(payload.get("draft"), dict) else {}
        kind = low(payload.get("actionType") or draft_data.get("type") or draft_data.get("actionType") or "owner_review")
        slip_id = clean(payload.get("slipId") or payload.get("id"))
        updates, communication = await execute_kind(kind, draft_data, bid, uid)
        execution = {"business_id": bid, "user_id": uid, "slip_id": slip_id, "action_type": kind, "draft": draft_data, "updates": updates, "communication": communication, "status": "executed", "created_at": now()}
        result = await db.command_executions.insert_one(execution); execution["_id"] = result.inserted_id
        if slip_id:
            await db.command_slips.update_one({"business_id": bid, "id": slip_id}, {"$set": {"status": "approved", "executed_at": now(), "execution_id": str(result.inserted_id)}}, upsert=True)
        return {"ok": True, "success": True, "executed": True, "execution": safe(execution), "updates": updates, "communication": communication, "message": "Approved and executed"}

    @router.post("/command/slips/{slip_id}/approve")
    async def approve_command_slip(slip_id: str, payload: Dict[str, Any] = Body(default={}), request: Request = None):
        payload = dict(payload or {}); payload["slipId"] = slip_id
        return await command_execute(payload, request)

    @router.get("/onboarding/progress")
    async def onboarding_progress(request: Request):
        user = await get_current_user(request); bid = await business_id_for(user); uid = str(user.get("id"))
        clients = await count("clients", bid, uid); jobs = await count("jobs", bid, uid); invoices = await count("invoices", bid, uid); command = await count("command_slips", bid, uid)
        basics = sum(1 for v in [user.get("business_name"), user.get("email"), user.get("gst_rate"), user.get("trade_type")] if v not in (None, "", "other"))
        steps = [{"key":"business_profile","title":"Set business basics","done":basics>=3,"page":"settings"},{"key":"first_client","title":"Add first client","done":clients>0,"page":"clients"},{"key":"first_job","title":"Create first job","done":jobs>0,"page":"jobs"},{"key":"first_invoice","title":"Prepare first invoice","done":invoices>0,"page":"invoices"},{"key":"command_approval","title":"Approve Command action","done":command>0,"page":"command"}]
        done = len([s for s in steps if s["done"]])
        return {"ok": True, "percent": round(done / len(steps) * 100), "done": done, "total": len(steps), "steps": steps, "counts": {"clients": clients, "jobs": jobs, "invoices": invoices, "command_slips": command}}

    @router.post("/onboarding/step/{step_key}/done")
    async def mark_step_done(step_key: str, request: Request):
        user = await get_current_user(request); bid = await business_id_for(user)
        await db.onboarding_progress.update_one({"business_id": bid}, {"$addToSet": {"manual_done": step_key}, "$set": {"updated_at": now()}}, upsert=True)
        return await onboarding_progress(request)

    @router.post("/onboarding/state")
    async def onboarding_state(request: Request, payload: Dict[str, Any] = Body(default={})):
        user = await get_current_user(request); bid = await business_id_for(user)
        patch = {k: bool(payload.get(k)) for k in ["dismissed", "skipped"] if k in payload}
        if payload.get("resume"): patch.update({"dismissed": False, "skipped": False})
        patch["updated_at"] = now()
        await db.onboarding_progress.update_one({"business_id": bid}, {"$set": patch}, upsert=True)
        return await onboarding_progress(request)

    return router
