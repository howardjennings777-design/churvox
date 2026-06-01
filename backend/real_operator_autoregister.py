"""Real approval execution routes for Churvox AI Operator.

This module is auto-loaded from sitecustomize so we can add launch-critical
execution without risky edits to the very large server.py.

It makes owner approval do real work:
- create draft invoice from completed job
- send invoice email/link to customer
- assign worker and notify worker
- send quote follow-up email
- send invoice reminder email
- approve job/timesheet review and prepare next invoice action
"""

import importlib
import logging
import secrets
from datetime import datetime, timezone, timedelta

try:
    from bson import ObjectId
except Exception:  # pragma: no cover
    ObjectId = None

logger = logging.getLogger(__name__)
_PATCHED = False
_ORIGINAL_IMPORT_MODULE = importlib.import_module
OWNER_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"}


def _now():
    return datetime.now(timezone.utc)


def _id(value):
    if value is None:
        return ""
    if ObjectId is not None and isinstance(value, ObjectId):
        return str(value)
    return str(value or "")


def _safe_doc(doc):
    if not isinstance(doc, dict):
        return doc
    out = dict(doc)
    if "_id" in out:
        out["id"] = _id(out.get("_id"))
        out.pop("_id", None)
    for k, v in list(out.items()):
        if ObjectId is not None and isinstance(v, ObjectId):
            out[k] = str(v)
        elif hasattr(v, "isoformat"):
            try:
                out[k] = v.isoformat()
            except Exception:
                out[k] = str(v)
    return out


def _query(record_id, business_id):
    clauses = [{"id": str(record_id)}]
    if ObjectId is not None:
        try:
            if ObjectId.is_valid(str(record_id)):
                clauses.append({"_id": ObjectId(str(record_id))})
        except Exception:
            pass
    return {"business_id": str(business_id), "$or": clauses}


def _money(value, default=0.0):
    try:
        if isinstance(value, str):
            value = value.replace("$", "").replace(",", "").strip()
        return float(value)
    except Exception:
        return float(default)


def _html_escape(value):
    import html
    return html.escape(str(value or ""))


def _invoice_html(invoice, public_url):
    number = _html_escape(invoice.get("invoice_number") or invoice.get("number") or "Invoice")
    customer = _html_escape(invoice.get("customer_name") or invoice.get("client_name") or "there")
    description = _html_escape(invoice.get("description") or "Service work completed.")
    total = _money(invoice.get("total") or invoice.get("amount") or invoice.get("subtotal"))
    safe_url = _html_escape(public_url)
    return f"""
    <div style='font-family:Arial,sans-serif;background:#f6f7f1;padding:24px;color:#0f172a'>
      <div style='max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:28px'>
        <h2 style='margin:0;color:#143658'>Your Churvox invoice is ready</h2>
        <p>Hi {customer},</p>
        <p>{description}</p>
        <div style='background:#f8fafc;border-radius:14px;padding:16px;margin:18px 0'>
          <strong>{number}</strong><br/>
          Total: <strong>${total:,.2f}</strong>
        </div>
        <p><a href='{safe_url}' style='display:inline-block;background:#2563eb;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:bold'>View invoice</a></p>
        <p style='font-size:13px;color:#64748b'>Or copy this link:<br/><a href='{safe_url}'>{safe_url}</a></p>
      </div>
    </div>
    """


def _message_html(title, message, link=None):
    safe_title = _html_escape(title)
    safe_message = _html_escape(message).replace("\n", "<br/>")
    button = ""
    if link:
        safe_link = _html_escape(link)
        button = f"<p><a href='{safe_link}' style='display:inline-block;background:#2563eb;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:bold'>Open</a></p>"
    return f"""
    <div style='font-family:Arial,sans-serif;background:#f6f7f1;padding:24px;color:#0f172a'>
      <div style='max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:28px'>
        <h2 style='margin:0;color:#143658'>{safe_title}</h2>
        <p>{safe_message}</p>
        {button}
      </div>
    </div>
    """


def _register_on_server_module(module):
    if getattr(module, "_REAL_OPERATOR_ROUTES_AUTOREGISTERED", False):
        return module
    required = ["app", "db", "get_current_user", "get_user_business_id", "APIRouter"]
    if any(not hasattr(module, name) for name in required):
        return module

    try:
        from fastapi import Depends, Body, HTTPException
        try:
            from email_provider import send_email
        except Exception:
            from backend.email_provider import send_email

        router = module.APIRouter(prefix="/api")
        db = module.db
        get_current_user = module.get_current_user
        get_user_business_id = module.get_user_business_id
        FRONTEND_URL = str(getattr(module, "FRONTEND_URL", "") or "https://www.churvox.com").rstrip("/")

        def _role_guard(user):
            role = str((user or {}).get("role") or "").lower().strip()
            if role not in OWNER_ROLES:
                raise HTTPException(status_code=403, detail="Owner approval required")

        async def _get_action(action_id, business_id):
            if ObjectId is None or not ObjectId.is_valid(str(action_id)):
                raise HTTPException(status_code=400, detail="Invalid action id")
            action = await db.ai_operator_actions.find_one({"_id": ObjectId(str(action_id)), "business_id": str(business_id)})
            if not action:
                raise HTTPException(status_code=404, detail="AI action not found")
            return action

        async def _find_job(job_id, business_id):
            if not job_id:
                return None
            return await db.jobs.find_one(_query(job_id, business_id))

        async def _find_invoice(invoice_id, business_id):
            if not invoice_id:
                return None
            return await db.invoices.find_one(_query(invoice_id, business_id))

        async def _find_client(client_id, business_id):
            if not client_id:
                return None
            return await db.clients.find_one(_query(client_id, business_id))

        async def _log(business_id, action_id, event, message, user):
            try:
                await db.ai_operator_logs.insert_one({
                    "business_id": str(business_id), "action_id": str(action_id), "event_type": event,
                    "message": message, "user_id": _id((user or {}).get("id") or (user or {}).get("_id")), "created_at": _now()
                })
            except Exception:
                logger.exception("AI approval log failed")

        async def _mark_action(action_id, business_id, status, result, user):
            now = _now()
            await db.ai_operator_actions.update_one(
                {"_id": ObjectId(str(action_id)), "business_id": str(business_id)},
                {"$set": {
                    "status": status,
                    "group": "completed" if status in {"completed", "approved", "rejected"} else "ready",
                    "approved_at": now if status in {"approved", "completed"} else None,
                    "completed_at": now if status == "completed" else None,
                    "approved_by_user_id": _id((user or {}).get("id") or (user or {}).get("_id")),
                    "approved_by_name": str((user or {}).get("name") or ""),
                    "result": result,
                    "updated_at": now,
                }}
            )

        async def _create_invoice_from_job(action, payload, business_id):
            job_id = str(payload.get("job_id") or action.get("job_id") or action.get("related_id") or action.get("related_entity_id") or "")
            job = await _find_job(job_id, business_id)
            if not job:
                raise HTTPException(status_code=404, detail="Job not found for invoice")
            existing = await db.invoices.find_one({"business_id": str(business_id), "$or": [{"job_id": job_id}, {"source_job_id": job_id}, {"linked_job_id": job_id}]})
            if existing:
                return {"action": "existing_invoice_found", "invoice_id": _id(existing.get("_id")), "job_id": job_id}

            subtotal = _money(payload.get("subtotal") or payload.get("amount") or job.get("fixed_price") or job.get("price") or job.get("subtotal"))
            if subtotal <= 0:
                raise HTTPException(status_code=400, detail="Add a price before approving invoice creation")
            gst_rate = _money(payload.get("gst_rate") or 15)
            gst_amount = round(subtotal * (gst_rate / 100.0), 2)
            total = round(subtotal + gst_amount, 2)
            client_id = str(payload.get("client_id") or job.get("client_id") or "")
            client = await _find_client(client_id, business_id)
            invoice_doc = {
                "business_id": str(business_id),
                "job_id": job_id,
                "source_job_id": job_id,
                "linked_job_id": job_id,
                "client_id": client_id,
                "customer_name": str(payload.get("customer_name") or (client or {}).get("name") or job.get("client_name") or job.get("customer_name") or ""),
                "customer_email": str(payload.get("customer_email") or (client or {}).get("email") or job.get("client_email") or ""),
                "address": str(payload.get("address") or job.get("address") or ""),
                "description": str(payload.get("description") or job.get("invoice_description_draft") or job.get("worker_notes") or job.get("notes") or "Service work completed."),
                "subtotal": subtotal,
                "gst_rate": gst_rate,
                "gst_amount": gst_amount,
                "total": total,
                "status": "draft",
                "source": "ai_operator_approval",
                "invoice_number": f"INV-{int(_now().timestamp())}",
                "created_at": _now(),
                "updated_at": _now(),
            }
            ins = await db.invoices.insert_one(invoice_doc)
            invoice_id = str(ins.inserted_id)
            await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"invoice_id": invoice_id, "draft_invoice_id": invoice_id, "invoice_created": True, "invoice_status": "draft", "updated_at": _now()}})
            return {"action": "invoice_draft_created", "invoice_id": invoice_id, "job_id": job_id, "total": total}

        async def _send_invoice(invoice_id, business_id):
            invoice = await _find_invoice(invoice_id, business_id)
            if not invoice:
                raise HTTPException(status_code=404, detail="Invoice not found")
            email = str(invoice.get("customer_email") or "").strip()
            if not email:
                raise HTTPException(status_code=400, detail="Customer email missing. Add email before sending invoice.")
            token = str(invoice.get("public_token") or "").strip() or secrets.token_urlsafe(20)
            url = f"{FRONTEND_URL}/public/invoice/{token}"
            await db.invoices.update_one({"_id": invoice["_id"]}, {"$set": {"public_token": token, "public_invoice_url": url, "status": "sent", "sent_at": _now(), "updated_at": _now()}})
            invoice = {**invoice, "public_token": token, "public_invoice_url": url, "status": "sent"}
            await send_email(email, f"Invoice {invoice.get('invoice_number') or ''} from Churvox", _invoice_html(invoice, url), f"Your invoice is ready: {url}")
            return {"action": "invoice_emailed", "invoice_id": invoice_id, "public_invoice_url": url, "to": email}

        async def _assign_worker(action, payload, business_id):
            job_id = str(payload.get("job_id") or action.get("job_id") or action.get("related_id") or action.get("related_entity_id") or "")
            worker_id = str(payload.get("worker_id") or payload.get("recommended_worker_id") or action.get("worker_id") or "")
            job = await _find_job(job_id, business_id)
            worker = await db.business_users.find_one(_query(worker_id, business_id)) if worker_id else None
            if not job or not worker:
                raise HTTPException(status_code=404, detail="Job or worker not found")
            worker_name = str(worker.get("name") or worker.get("email") or "Worker")
            await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"assigned_worker_id": worker_id, "worker_id": worker_id, "assigned_worker_name": worker_name, "status": "assigned", "updated_at": _now()}})
            if worker.get("email"):
                try:
                    link = f"{FRONTEND_URL}/worker/jobs/{job_id}"
                    msg = str(payload.get("message") or f"You have been assigned {job.get('title') or 'a job'}. Open Churvox for the details.")
                    await send_email(worker.get("email"), f"New job assigned: {job.get('title') or 'Job'}", _message_html("New job assigned", msg, link), f"{msg}\n{link}")
                except Exception:
                    logger.exception("Worker assignment email failed")
            return {"action": "worker_assigned", "job_id": job_id, "worker_id": worker_id, "worker_name": worker_name}

        async def _send_quote_follow_up(action, payload, business_id):
            quote_id = str(payload.get("quote_id") or action.get("quote_id") or action.get("related_id") or action.get("related_entity_id") or "")
            quote = await db.quotes.find_one(_query(quote_id, business_id)) if quote_id else None
            if not quote:
                raise HTTPException(status_code=404, detail="Quote not found")
            email = str(payload.get("customer_email") or quote.get("customer_email") or "").strip()
            if not email:
                raise HTTPException(status_code=400, detail="Customer email missing. Add email before sending quote follow-up.")
            token = str(quote.get("public_token") or "").strip() or secrets.token_urlsafe(20)
            url = f"{FRONTEND_URL}/public/quote/{token}"
            message = str(payload.get("message") or payload.get("draft_message") or f"Hi, just checking in on quote {quote.get('quote_number') or quote_id}. Happy to answer any questions.")
            await db.quotes.update_one({"_id": quote["_id"]}, {"$set": {"public_token": token, "last_followup_at": _now(), "updated_at": _now()}})
            await send_email(email, "Following up on your quote", _message_html("Quote follow-up", message, url), f"{message}\n{url}")
            return {"action": "quote_followup_emailed", "quote_id": quote_id, "to": email}

        async def _send_invoice_reminder(action, payload, business_id):
            invoice_id = str(payload.get("invoice_id") or action.get("invoice_id") or action.get("related_id") or action.get("related_entity_id") or "")
            invoice = await _find_invoice(invoice_id, business_id)
            if not invoice:
                raise HTTPException(status_code=404, detail="Invoice not found")
            email = str(payload.get("customer_email") or invoice.get("customer_email") or "").strip()
            if not email:
                raise HTTPException(status_code=400, detail="Customer email missing. Add email before sending reminder.")
            token = str(invoice.get("public_token") or "").strip() or secrets.token_urlsafe(20)
            url = f"{FRONTEND_URL}/public/invoice/{token}"
            message = str(payload.get("message") or payload.get("draft_message") or "Friendly reminder this invoice is still open. Please let us know if you need another copy.")
            await db.invoices.update_one({"_id": invoice["_id"]}, {"$set": {"public_token": token, "public_invoice_url": url, "last_reminder_at": _now(), "updated_at": _now()}})
            await send_email(email, "Invoice reminder", _message_html("Invoice reminder", message, url), f"{message}\n{url}")
            return {"action": "invoice_reminder_emailed", "invoice_id": invoice_id, "to": email}

        @router.post("/ai/operator/actions/{action_id}/execute")
        async def execute_action(action_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
            _role_guard(current_user)
            business_id = await get_user_business_id(current_user)
            action = await _get_action(action_id, business_id)
            base_payload = dict(action.get("payload") or action.get("draft_payload") or {})
            if isinstance(payload, dict):
                base_payload.update(payload.get("payload") or payload)
            item_type = str(action.get("action_type") or action.get("type") or "").strip()
            send_after = bool(base_payload.get("send_after_approval") or base_payload.get("send_now") or base_payload.get("email_customer"))

            if item_type in {"create_invoice_draft", "invoice_draft"}:
                result = await _create_invoice_from_job(action, base_payload, business_id)
                if send_after and result.get("invoice_id"):
                    result["send_result"] = await _send_invoice(result["invoice_id"], business_id)
            elif item_type in {"send_invoice", "invoice_send"}:
                result = await _send_invoice(str(base_payload.get("invoice_id") or action.get("invoice_id") or action.get("related_id") or action.get("related_entity_id") or ""), business_id)
            elif item_type == "assign_worker":
                result = await _assign_worker(action, base_payload, business_id)
            elif item_type in {"quote_follow_up", "quote_followup"}:
                result = await _send_quote_follow_up(action, base_payload, business_id)
            elif item_type == "invoice_reminder":
                result = await _send_invoice_reminder(action, base_payload, business_id)
            elif item_type in {"job_review", "approve_job_review"}:
                job_id = str(base_payload.get("job_id") or action.get("job_id") or action.get("related_id") or action.get("related_entity_id") or "")
                job = await _find_job(job_id, business_id)
                if not job:
                    raise HTTPException(status_code=404, detail="Job not found")
                await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"work_review_status": "approved", "timesheet_status": "pending_payroll_review", "updated_at": _now()}})
                result = {"action": "job_review_approved", "job_id": job_id, "next": "invoice_draft_ready"}
            else:
                result = {"action": "approved_only", "note": "No executor for this action type yet", "type": item_type}

            await _mark_action(action_id, business_id, "completed", result, current_user)
            await _log(business_id, action_id, "executed", f"Executed {item_type}", current_user)
            return {"success": True, "result": result}

        @router.post("/invoices/{invoice_id}/email")
        async def email_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
            _role_guard(current_user)
            business_id = await get_user_business_id(current_user)
            result = await _send_invoice(invoice_id, business_id)
            return {"success": True, "result": result}

        module.app.include_router(router)
        setattr(module, "_REAL_OPERATOR_ROUTES_AUTOREGISTERED", True)
        logger.info("Real AI Operator execution routes auto-registered")
    except Exception as exc:
        logger.exception("Real AI Operator auto-registration failed: %s", exc)
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
