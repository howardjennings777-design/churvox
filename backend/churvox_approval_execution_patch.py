from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_field_truth_patch as field_truth

try:
    import email_provider
except Exception:  # pragma: no cover
    email_provider = None

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def json_safe(value):
    return field_truth.json_safe(value)


def business_id(user):
    return field_truth.business_id_string(user)


def user_id(user):
    return field_truth.user_id_string(user)


async def read_payload(request):
    try:
        return await request.json()
    except Exception:
        return {}


async def safe_one(collection, query):
    try:
        return await collection.find_one(query)
    except Exception:
        return None


async def safe_recent(collection, query, limit=50, sort_field="updated_at"):
    try:
        return await collection.find(query).sort(sort_field, -1).limit(limit).to_list(length=limit)
    except Exception:
        try:
            return await collection.find(query).limit(limit).to_list(length=limit)
        except Exception:
            return []


def as_money(value):
    try:
        return float(str(value or 0).replace("$", "").replace(",", ""))
    except Exception:
        return 0.0


def infer_kind(item):
    text = lower(" ".join([
        clean(item.get("kind")), clean(item.get("type")), clean(item.get("category")),
        clean(item.get("action")), clean(item.get("title")), clean(item.get("summary")), clean(item.get("source")),
    ]))
    if any(word in text for word in ["sms", "text message", "txt"]):
        return "sms"
    if any(word in text for word in ["xero", "myob", "accounting", "sync"]):
        return "accounting_sync"
    if "quote" in text:
        return "quote"
    if "invoice" in text:
        return "invoice"
    if any(word in text for word in ["email", "message", "follow", "update", "customer"]):
        return "email"
    if any(word in text for word in ["timesheet", "payroll", "proof", "worker slip"]):
        return "internal_record"
    return "command_record"


def html_wrap(title, body):
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;color:#111827;background:#f8fafc;padding:24px;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;">
        <div style="font-size:22px;font-weight:900;color:#ea580c;margin-bottom:14px;">Churvox</div>
        <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">{title}</h1>
        <div style="font-size:15px;color:#374151;">{body}</div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="font-size:12px;color:#6b7280;margin:0;">Sent after owner approval from Churvox.</p>
      </div>
    </div>
    """


def text_of(item, fallback=""):
    for key in ["body", "message", "text", "summary", "prepared", "description", "title"]:
        value = clean(item.get(key))
        if value:
            return value
    return fallback


def email_of(item):
    details = item.get("details") if isinstance(item.get("details"), dict) else {}
    slip = details.get("slip") if isinstance(details.get("slip"), dict) else {}
    for source in [item, details, slip]:
        for key in ["email", "client_email", "customer_email", "to", "recipient_email"]:
            value = clean((source or {}).get(key))
            if "@" in value:
                return value
    return ""


def phone_of(item):
    details = item.get("details") if isinstance(item.get("details"), dict) else {}
    slip = details.get("slip") if isinstance(details.get("slip"), dict) else {}
    for source in [item, details, slip]:
        for key in ["phone", "mobile", "client_phone", "customer_phone", "to_phone"]:
            value = clean((source or {}).get(key))
            if value:
                return value
    return ""


def job_id_of(item):
    details = item.get("details") if isinstance(item.get("details"), dict) else {}
    slip = details.get("slip") if isinstance(details.get("slip"), dict) else {}
    for source in [item, details, slip]:
        for key in ["job_id", "source_job_id", "record_id"]:
            value = clean((source or {}).get(key))
            if value:
                return value
    return clean(item.get("source_id"))


def client_name(item):
    details = item.get("details") if isinstance(item.get("details"), dict) else {}
    for source in [item, details]:
        for key in ["client", "client_name", "customer", "customer_name"]:
            value = clean((source or {}).get(key))
            if value:
                return value
    return "customer"


async def enrich_contact(db, user, ObjectId, item):
    out = dict(item or {})
    if email_of(out) and phone_of(out):
        return out
    bid = business_id(user)
    job_id = job_id_of(out)
    job = None
    if job_id:
        try:
            job = await db.jobs.find_one(field_truth.job_lookup_query(user, ObjectId, job_id))
        except Exception:
            job = None
    if job:
        out.setdefault("client_email", clean(job.get("client_email") or job.get("customer_email") or job.get("email")))
        out.setdefault("client_phone", clean(job.get("client_phone") or job.get("customer_phone") or job.get("phone") or job.get("mobile")))
        out.setdefault("client_name", clean(job.get("client_name") or job.get("customer_name") or job.get("client") or job.get("customer")))
    if not email_of(out) or not phone_of(out):
        name = lower(client_name(out))
        if name and name != "customer":
            try:
                client = await db.clients.find_one({"business_id": bid, "$or": [{"name": {"$regex": name, "$options": "i"}}, {"client_name": {"$regex": name, "$options": "i"}}, {"customer_name": {"$regex": name, "$options": "i"}}]})
            except Exception:
                client = None
            if client:
                out.setdefault("client_email", clean(client.get("email") or client.get("client_email") or client.get("customer_email")))
                out.setdefault("client_phone", clean(client.get("phone") or client.get("mobile") or client.get("client_phone") or client.get("customer_phone")))
                out.setdefault("client_name", clean(client.get("name") or client.get("client_name") or client.get("customer_name")))
    return out


async def mark_invoice_sent(db, user, item, result_doc):
    bid = business_id(user)
    invoice_id = clean(item.get("invoice_id") or item.get("id") or item.get("source_id"))
    query = {"business_id": bid, "status": {"$in": ["draft", "approved", "waiting_owner_review", "ready"]}}
    if invoice_id:
        query = {"business_id": bid, "$or": [{"id": invoice_id}, {"_id": invoice_id}, {"job_id": invoice_id}, {"source_id": invoice_id}]}
    try:
        await db.invoices.update_many(query, {"$set": {"status": "sent", "sent_at": now_utc(), "sent_by": "churvox_after_owner_approval", "outbound_execution_id": result_doc.get("id"), "auto_sent": False, "owner_approved_send": True}})
    except Exception:
        pass


async def send_or_queue_email(db, user, item, kind):
    to_email = email_of(item)
    subject_prefix = "Invoice" if kind == "invoice" else "Quote" if kind == "quote" else "Update"
    subject = clean(item.get("subject")) or f"{subject_prefix} from Churvox"
    body_text = text_of(item, f"Hi {client_name(item)}, this was approved and sent from Churvox.")
    if kind == "invoice":
        amount = as_money(item.get("amount") or item.get("total"))
        amount_line = f"<p><strong>Total:</strong> ${amount:.2f}</p>" if amount else ""
        body_html = f"<p>{body_text}</p>{amount_line}<p>Please review the invoice details and contact the business if anything needs changing.</p>"
    elif kind == "quote":
        body_html = f"<p>{body_text}</p><p>Please review the quote and reply if you would like to go ahead.</p>"
    else:
        body_html = f"<p>{body_text}</p>"

    doc = {
        "id": f"approval-send-{int(now_utc().timestamp() * 1000)}",
        "business_id": business_id(user),
        "approved_by": user_id(user),
        "kind": kind,
        "channel": "email",
        "to": to_email,
        "subject": subject,
        "body": body_text,
        "status": "queued_no_recipient" if not to_email else "queued",
        "source": "approval_execution_router",
        "owner_approved": True,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    if to_email and email_provider is not None:
        try:
            result = await email_provider.send_email(to_email, subject, html_wrap(subject, body_html), body_text)
            doc.update({"status": "sent", "provider": "postmark", "provider_result": result, "sent_at": now_utc()})
        except Exception as exc:
            doc.update({"status": "queued_send_failed", "error": str(exc)})
    elif to_email:
        doc.update({"status": "queued_no_email_provider"})
    try:
        await db.outbound_messages.insert_one(dict(doc))
    except Exception:
        pass
    if kind == "invoice" and doc.get("status") == "sent":
        await mark_invoice_sent(db, user, item, doc)
    return doc


async def queue_sms(db, user, item):
    doc = {
        "id": f"approval-sms-{int(now_utc().timestamp() * 1000)}",
        "business_id": business_id(user),
        "approved_by": user_id(user),
        "kind": "sms",
        "channel": "sms",
        "to": phone_of(item),
        "body": text_of(item, "Approved update from Churvox."),
        "status": "queued_no_sms_provider" if phone_of(item) else "queued_no_recipient",
        "source": "approval_execution_router",
        "owner_approved": True,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        await db.outbound_messages.insert_one(dict(doc))
    except Exception:
        pass
    return doc


async def mark_accounting_approved(db, user, item):
    doc = {
        "id": f"approval-sync-{int(now_utc().timestamp() * 1000)}",
        "business_id": business_id(user),
        "approved_by": user_id(user),
        "kind": "accounting_sync",
        "status": "approved_for_draft_sync",
        "source": "approval_execution_router",
        "owner_approved": True,
        "guardrails": ["draft_sync_only", "no_invoice_auto_send", "no_tax_filing", "no_payout_file"],
        "item": item,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        await db.accounting_sync_approvals.insert_one(dict(doc))
    except Exception:
        pass
    return doc


async def mark_internal_record(db, user, item, kind):
    doc = {
        "id": f"approval-internal-{int(now_utc().timestamp() * 1000)}",
        "business_id": business_id(user),
        "approved_by": user_id(user),
        "kind": kind,
        "status": "approved",
        "source": "approval_execution_router",
        "owner_approved": True,
        "item": item,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        await db.approved_admin_records.insert_one(dict(doc))
    except Exception:
        pass
    return doc


async def execute_approval(db, user, ObjectId, action_id, payload=None):
    payload = payload or {}
    raw_item = payload.get("item") if isinstance(payload.get("item"), dict) else dict(payload)
    raw_item.setdefault("id", action_id)
    item = await enrich_contact(db, user, ObjectId, raw_item)
    kind = lower(payload.get("kind") or infer_kind(item))
    if kind in {"email", "message", "customer_message"}:
        result = await send_or_queue_email(db, user, item, "email")
    elif kind == "invoice":
        result = await send_or_queue_email(db, user, item, "invoice")
    elif kind == "quote":
        result = await send_or_queue_email(db, user, item, "quote")
    elif kind in {"sms", "text", "txt"}:
        result = await queue_sms(db, user, item)
    elif kind == "accounting_sync":
        result = await mark_accounting_approved(db, user, item)
    else:
        result = await mark_internal_record(db, user, item, kind)
    decision = {
        "business_id": business_id(user),
        "user_id": user_id(user),
        "action_id": action_id,
        "decision": "approved_and_executed",
        "execution_kind": kind,
        "execution_status": result.get("status"),
        "execution_id": result.get("id"),
        "source": "approval_execution_router",
        "auto_sent": False,
        "owner_approved": True,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        await db.command_decisions.insert_one(dict(decision))
    except Exception:
        pass
    return {"success": True, "kind": kind, "result": json_safe(result), "decision": json_safe(decision)}


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    if not app or db is None or not get_current_user or ObjectId is None or Request is None:
        return

    async def execute_endpoint(request: Request):
        user = await get_current_user(request)
        payload = await read_payload(request)
        action_id = clean(payload.get("action_id") or payload.get("id") or payload.get("source_id") or f"approval-{int(now_utc().timestamp() * 1000)}")
        return json_safe(await execute_approval(db, user, ObjectId, action_id, payload))

    async def execute_by_id_endpoint(request: Request, action_id: str):
        user = await get_current_user(request)
        return json_safe(await execute_approval(db, user, ObjectId, action_id, await read_payload(request)))

    async def executions_endpoint(request: Request):
        user = await get_current_user(request)
        rows = await safe_recent(db.outbound_messages, {"business_id": business_id(user)}, 80, "updated_at")
        syncs = await safe_recent(db.accounting_sync_approvals, {"business_id": business_id(user)}, 30, "updated_at")
        internal = await safe_recent(db.approved_admin_records, {"business_id": business_id(user)}, 30, "updated_at")
        return json_safe({"success": True, "outbound": rows, "syncs": syncs, "internal": internal, "items": rows + syncs + internal})

    routes = [
        ("POST", "/api/command/execute-approved", execute_endpoint),
        ("POST", "/api/command/approvals/{action_id}/execute", execute_by_id_endpoint),
        ("GET", "/api/command/approval-executions", executions_endpoint),
    ]
    for method, path, endpoint in routes:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])
    INSTALLED.add(name)


class _Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
        install(module)


class _Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, _Loader):
            spec.loader = _Loader(spec.loader)
        return spec


if not any(isinstance(finder, _Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
