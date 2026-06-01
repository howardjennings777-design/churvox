"""Live AI Operator scan/list routes for Churvox launch."""

import importlib
import logging
from datetime import datetime, timezone, timedelta

try:
    from bson import ObjectId
except Exception:
    ObjectId = None

logger = logging.getLogger(__name__)
_PATCHED = False
_ORIGINAL_IMPORT_MODULE = importlib.import_module
OWNER_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "office admin", "business_owner", "platform_owner"}


def _now():
    return datetime.now(timezone.utc)


def _id(value):
    if value is None:
        return ""
    if ObjectId is not None and isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict) and value.get("$oid"):
        return str(value["$oid"])
    return str(value or "")


def _safe(value, fallback=""):
    return str(value or fallback or "").strip()


def _status(value):
    return _safe(value).lower().replace(" ", "_").replace("-", "_")


def _money(value):
    try:
        if isinstance(value, str):
            value = value.replace("$", "").replace(",", "").strip()
        return float(value or 0)
    except Exception:
        return 0.0


def _date(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def _serialise(doc):
    out = dict(doc or {})
    if "_id" in out:
        out["id"] = _id(out.pop("_id"))
    for key, value in list(out.items()):
        if ObjectId is not None and isinstance(value, ObjectId):
            out[key] = str(value)
        elif isinstance(value, datetime):
            out[key] = value.isoformat()
        elif isinstance(value, dict):
            out[key] = _serialise(value)
    return out


def _record_query(record_id, business_id):
    clauses = [{"id": str(record_id)}]
    if ObjectId is not None:
        try:
            if ObjectId.is_valid(str(record_id)):
                clauses.append({"_id": ObjectId(str(record_id))})
        except Exception:
            pass
    return {"business_id": str(business_id), "$or": clauses}


def _register_on_server_module(module):
    if getattr(module, "_LIVE_OPERATOR_ROUTES_AUTOREGISTERED", False):
        return module
    if any(not hasattr(module, name) for name in ["app", "db", "get_current_user", "get_user_business_id", "APIRouter"]):
        return module

    try:
        from fastapi import Depends, Body, HTTPException
        router = module.APIRouter(prefix="/api")
        db = module.db
        get_current_user = module.get_current_user
        get_user_business_id = module.get_user_business_id

        def _guard(user):
            role = _safe((user or {}).get("role")).lower()
            if role not in OWNER_ROLES:
                raise HTTPException(status_code=403, detail="Owner approval required")

        async def _client(client_id, business_id):
            if not client_id:
                return {}
            found = await db.clients.find_one(_record_query(client_id, business_id))
            return found or {}

        async def _workers(business_id):
            query = {"business_id": str(business_id), "role": {"$in": ["worker", "manager", "office_admin", "office admin"]}}
            rows = []
            for name in ["business_users", "users"]:
                try:
                    coll = getattr(db, name)
                    rows.extend(await coll.find(query).to_list(length=300))
                except Exception:
                    pass
            seen, unique = set(), []
            for row in rows:
                key = _id(row.get("_id") or row.get("id") or row.get("email"))
                if key and key not in seen:
                    seen.add(key)
                    unique.append(row)
            return unique

        def _worker(row):
            return {"id": _id(row.get("_id") or row.get("id") or row.get("user_id")), "name": _safe(row.get("name") or row.get("email"), "Worker"), "email": _safe(row.get("email")), "region": _safe(row.get("region") or row.get("area"))}

        async def _upsert_action(business_id, action_type, related_type, related_id, title, summary, payload, recommendation, reason):
            query = {"business_id": str(business_id), "action_type": action_type, "related_entity_id": str(related_id), "status": {"$nin": ["completed", "rejected", "dismissed", "cancelled", "canceled"]}}
            existing = await db.ai_operator_actions.find_one(query)
            doc = {"business_id": str(business_id), "action_type": action_type, "type": action_type, "related_type": related_type, "related_entity_id": str(related_id), "related_id": str(related_id), "title": title, "summary": summary, "recommendation": recommendation, "reason": reason, "payload": payload, "draft_payload": payload, "status": "ready", "group": "ready", "source": "live_ai_scan", "updated_at": _now()}
            if existing:
                await db.ai_operator_actions.update_one({"_id": existing["_id"]}, {"$set": doc})
                doc["_id"] = existing["_id"]
            else:
                doc["created_at"] = _now()
                inserted = await db.ai_operator_actions.insert_one(doc)
                doc["_id"] = inserted.inserted_id
            return doc

        def _job_id(job):
            return _id(job.get("_id") or job.get("id") or job.get("job_id"))

        def _job_title(job):
            return _safe(job.get("title") or job.get("job_title") or job.get("service_type"), "Job")

        async def _scan_jobs(business_id, actions):
            jobs = await db.jobs.find({"business_id": str(business_id)}).to_list(length=500)
            workers = await _workers(business_id)
            worker = _worker(workers[0]) if workers else {}
            for job in jobs:
                jid = _job_id(job)
                if not jid:
                    continue
                st = _status(job.get("status"))
                assigned = _safe(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_worker_name") or job.get("worker_name"))
                if st not in {"completed", "done", "cancelled", "canceled"} and not assigned:
                    actions.append(await _upsert_action(business_id, "assign_worker", "job", jid, f"Assign worker for {_job_title(job)}", "This job has no worker assigned. Churvox prepared a worker recommendation.", {"job_id": jid, "job_title": _job_title(job), "client_name": _safe(job.get("client_name") or job.get("customer_name")), "address": _safe(job.get("address")), "worker_id": worker.get("id", ""), "recommended_worker_id": worker.get("id", ""), "recommended_worker_name": worker.get("name", ""), "available_workers": [_worker(w) for w in workers], "message": f"You have been assigned {_job_title(job)}. Please open Churvox and review the job."}, "Owner can choose another worker before approving.", "Open job has no assigned worker"))
                if st in {"completed", "done"}:
                    price = _money(job.get("fixed_price") or job.get("price") or job.get("amount") or job.get("subtotal") or job.get("total"))
                    client = await _client(job.get("client_id"), business_id)
                    await db.timesheet_entries.update_one({"business_id": str(business_id), "job_id": jid}, {"$set": {"business_id": str(business_id), "job_id": jid, "job_title": _job_title(job), "worker_id": _safe(job.get("assigned_worker_id") or job.get("worker_id")), "worker_name": _safe(job.get("assigned_worker_name") or job.get("worker_name"), "Worker"), "status": _safe(job.get("timesheet_status"), "pending_review"), "source": "job_timer", "updated_at": _now()}}, upsert=True)
                    if _safe(job.get("work_review_status")) not in {"approved", "rejected"}:
                        actions.append(await _upsert_action(business_id, "job_review", "job", jid, f"Review completed job: {_job_title(job)}", "Worker finished the job. Time, notes and proof are ready for owner review.", {"job_id": jid, "timesheet_status": "pending_review", "description": _safe(job.get("worker_notes") or job.get("notes"), "Work completed and ready for review.")}, "Approve the job so time can move to payroll review.", "Completed job needs owner review"))
                    existing_invoice = await db.invoices.find_one({"business_id": str(business_id), "$or": [{"job_id": jid}, {"source_job_id": jid}, {"linked_job_id": jid}]})
                    if not existing_invoice and price > 0:
                        actions.append(await _upsert_action(business_id, "create_invoice_draft", "job", jid, f"Create invoice for {_job_title(job)}", "Completed job has pricing and no invoice yet. Churvox prepared a draft invoice.", {"job_id": jid, "client_id": _safe(job.get("client_id")), "customer_name": _safe(client.get("name") or job.get("client_name") or job.get("customer_name")), "customer_email": _safe(client.get("email") or job.get("client_email") or job.get("customer_email")), "subtotal": price, "gst_rate": 15, "description": _safe(job.get("invoice_description_draft") or job.get("worker_notes") or job.get("notes"), "Service work completed.")}, "Create draft invoice first. Sending remains owner-approved.", "Completed priced job has no invoice"))

        async def _scan_quotes(business_id, actions):
            quotes = await db.quotes.find({"business_id": str(business_id)}).to_list(length=500)
            for quote in quotes:
                st = _status(quote.get("status"))
                if st in {"accepted", "declined", "cancelled", "canceled", "paid"}:
                    continue
                qid = _id(quote.get("_id") or quote.get("id") or quote.get("quote_id"))
                client = await _client(quote.get("client_id"), business_id)
                email = _safe(quote.get("customer_email") or quote.get("client_email") or client.get("email"))
                if not email:
                    continue
                last = _date(quote.get("last_followup_at") or quote.get("sent_at") or quote.get("updated_at") or quote.get("created_at"))
                if last and (_now() - last) < timedelta(days=3):
                    continue
                title = _safe(quote.get("title") or quote.get("quote_number"), "Quote")
                actions.append(await _upsert_action(business_id, "quote_follow_up", "quote", qid, f"Follow up quote: {title}", "This quote has been quiet. Churvox prepared a polite follow-up.", {"quote_id": qid, "customer_email": email, "message": f"Hi, just checking in on the quote for {title}. Happy to answer any questions."}, "Send only after owner approval.", "Open quote needs follow-up"))

        async def _scan_invoices(business_id, actions):
            invoices = await db.invoices.find({"business_id": str(business_id)}).to_list(length=500)
            for inv in invoices:
                iid = _id(inv.get("_id") or inv.get("id") or inv.get("invoice_id"))
                st = _status(inv.get("status"))
                email = _safe(inv.get("customer_email") or inv.get("client_email"))
                if not email:
                    continue
                number = _safe(inv.get("invoice_number") or inv.get("number"), "invoice")
                if st in {"draft", "created", "ready"}:
                    actions.append(await _upsert_action(business_id, "send_invoice", "invoice", iid, f"Email invoice {number}", "Invoice is drafted and has a customer email. Churvox can email the link after approval.", {"invoice_id": iid, "customer_email": email, "message": f"Hi, your invoice {number} is ready."}, "Approve only when invoice details look right.", "Draft invoice ready to send"))
                due = _date(inv.get("due_date"))
                overdue = st in {"overdue", "unpaid"} or (due and due < _now() and st not in {"paid", "void", "cancelled", "canceled"})
                if overdue:
                    actions.append(await _upsert_action(business_id, "invoice_reminder", "invoice", iid, f"Send payment reminder for {number}", "Invoice appears overdue or unpaid. Churvox prepared a polite reminder.", {"invoice_id": iid, "customer_email": email, "message": f"Hi, friendly reminder invoice {number} is still open."}, "Send reminder only after owner approval.", "Invoice needs payment follow-up"))

        @router.post("/ai/operator/scan")
        async def scan(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
            _guard(current_user)
            business_id = await get_user_business_id(current_user)
            actions = []
            await _scan_jobs(business_id, actions)
            await _scan_quotes(business_id, actions)
            await _scan_invoices(business_id, actions)
            return {"success": True, "created": len(actions), "actions": [_serialise(a) for a in actions]}

        @router.get("/ai/operator/approval-items")
        async def approval_items(current_user: dict = Depends(get_current_user)):
            _guard(current_user)
            business_id = await get_user_business_id(current_user)
            rows = await db.ai_operator_actions.find({"business_id": str(business_id), "status": {"$nin": ["completed", "rejected", "dismissed", "cancelled", "canceled"]}}).sort("updated_at", -1).to_list(length=100)
            return {"success": True, "data": [_serialise(r) for r in rows], "actions": [_serialise(r) for r in rows]}

        module.app.include_router(router)
        setattr(module, "_LIVE_OPERATOR_ROUTES_AUTOREGISTERED", True)
        logger.info("Live AI Operator scan/list routes auto-registered")
    except Exception as exc:
        logger.exception("Live operator auto-registration failed: %s", exc)
    return module


def install():
    global _PATCHED
    if _PATCHED:
        return
    _PATCHED = True

    def patched_import_module(name, package=None):
        module = _ORIGINAL_IMPORT_MODULE(name, package)
        if name in {"server", "backend.server"}:
            return _register_on_server_module(module)
        return module

    importlib.import_module = patched_import_module
