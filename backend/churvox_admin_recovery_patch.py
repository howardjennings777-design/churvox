
from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

try:
    import churvox_field_truth_patch as field_truth
except Exception:
    field_truth = None

TARGETS = {"server", "backend.server"}
INSTALLED = set()

def now_utc():
    return datetime.now(timezone.utc)

def clean(value):
    return str(value or "").strip()

def lower(value):
    return clean(value).lower()

def business_id(user):
    if field_truth:
        return field_truth.business_id_string(user)
    return clean(user.get("business_id") or user.get("owner_business_id") or user.get("contractor_id") or user.get("_id") or user.get("id"))

def user_id(user):
    if field_truth:
        return field_truth.user_id_string(user)
    return clean(user.get("id") or user.get("_id") or user.get("email"))

def scoped(user, ObjectId, extra=None):
    if field_truth:
        return field_truth.scoped_query(user, ObjectId, extra=extra)
    bid = business_id(user)
    base = {"$or": [{"business_id": bid}, {"contractor_id": bid}, {"owner_business_id": bid}, {"user_id": bid}, {"created_by": bid}]}
    return {"$and": [base, extra]} if extra else base

async def read_payload(request):
    try:
        return await request.json()
    except Exception:
        return {}

async def safe_recent(collection, query, limit=120, sort_field="updated_at"):
    try:
        return await collection.find(query).sort(sort_field, -1).limit(limit).to_list(length=limit)
    except Exception:
        try:
            return await collection.find(query).limit(limit).to_list(length=limit)
        except Exception:
            return []

def oid(record):
    raw = record.get("_id") or record.get("id") or record.get("job_id") or record.get("quote_id") or record.get("invoice_id") or record.get("user_id") or ""
    return clean(raw)

def amount(record):
    try:
        return float(str(record.get("amount") or record.get("total") or record.get("price") or record.get("job_price") or 0).replace("$", "").replace(",", ""))
    except Exception:
        return 0.0

def has_invoice(job):
    text = " ".join(clean(job.get(k)) for k in ["invoice_id", "linked_invoice_id", "invoice_number", "invoice_status"])
    return bool(text) or bool(job.get("invoiced") or job.get("invoice_created"))

def command_doc(user, kind, title, summary, source_id, item):
    sid = clean(source_id) or f"{kind}-{int(now_utc().timestamp() * 1000)}"
    return {
        "id": f"recovery-{kind}-{sid}",
        "business_id": business_id(user),
        "job_id": clean(item.get("job_id") or item.get("_id") or item.get("id") or ""),
        "worker_id": user_id(user),
        "worker_name": "Churvox Admin Recovery",
        "type": "admin_recovery",
        "kind": kind,
        "text": summary,
        "summary": summary,
        "title": title,
        "status": "waiting_owner_review",
        "source": "admin_recovery_sweep",
        "requires_owner_approval": True,
        "auto_sent": False,
        "accounting_synced": False,
        "item": item,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }

async def upsert_slip(db, doc):
    try:
        await db.worker_field_slips.update_one(
            {"business_id": doc["business_id"], "id": doc["id"]},
            {"$set": doc, "$setOnInsert": {"created_at": doc["created_at"]}},
            upsert=True,
        )
    except Exception:
        pass
    return doc

async def run_sweep(db, user, ObjectId):
    bid = business_id(user)
    jobs = await safe_recent(db.jobs, scoped(user, ObjectId), 220, "updated_at")
    quotes = await safe_recent(db.quotes, scoped(user, ObjectId), 120, "updated_at")
    invoices = await safe_recent(db.invoices, scoped(user, ObjectId), 120, "updated_at")
    team = await safe_recent(db.users, scoped(user, ObjectId), 120, "updated_at")

    docs = []

    for job in jobs:
        job_id = oid(job)
        title = clean(job.get("title") or job.get("job_title") or job.get("job_name") or job.get("service_type") or "Job")
        client = clean(job.get("client_name") or job.get("customer_name") or job.get("client") or "client")
        status = lower(job.get("status") or job.get("job_status") or job.get("stage"))
        price = amount(job)

        if any(word in status for word in ["complete", "done", "proof_ready", "finished"]) and not has_invoice(job):
            docs.append(command_doc(user, "completed_job_no_invoice", "Completed job needs invoice", f"{title} for {client} looks complete but has no invoice linked. Churvox prepared this for owner approval.", job_id, job))

        if price <= 0 and not any(word in status for word in ["cancel", "archiv"]):
            docs.append(command_doc(user, "missing_price", "Job missing price", f"{title} for {client} has no price. Set price before invoice or quote approval.", job_id, job))

        if clean(job.get("issue") or job.get("problem") or job.get("needs_attention")):
            docs.append(command_doc(user, "job_issue", "Job issue needs owner decision", f"{title} has an issue: {clean(job.get('issue') or job.get('problem') or job.get('needs_attention'))}", job_id, job))

    for quote in quotes:
        qid = oid(quote)
        status = lower(quote.get("status"))
        title = clean(quote.get("title") or quote.get("quote_title") or "Quote")
        client = clean(quote.get("client_name") or quote.get("customer_name") or quote.get("client") or "client")
        if any(word in status for word in ["viewed", "sent"]) and not any(word in status for word in ["accepted", "declined", "lost"]):
            docs.append(command_doc(user, "quote_follow_up", "Quote follow-up ready", f"{title} for {client} is {status or 'open'}. Churvox prepared a follow-up for owner approval.", qid, quote))

    for invoice in invoices:
        iid = oid(invoice)
        status = lower(invoice.get("status"))
        title = clean(invoice.get("number") or invoice.get("invoice_number") or "Invoice")
        client = clean(invoice.get("client_name") or invoice.get("customer_name") or invoice.get("client") or "client")
        if "overdue" in status:
            docs.append(command_doc(user, "overdue_invoice", "Overdue invoice needs follow-up", f"{title} for {client} is overdue. Churvox prepared a reminder for owner approval.", iid, invoice))

    for member in team:
        role = lower(member.get("role") or member.get("user_role") or member.get("worker_role"))
        status = lower(member.get("status") or member.get("clock_status"))
        if "worker" in role and any(word in status for word in ["clocked in", "in_progress", "started"]) and not clean(member.get("clock_out") or member.get("end_time")):
            docs.append(command_doc(user, "open_worker_time", "Worker time needs review", f"{clean(member.get('name') or member.get('full_name') or member.get('email') or 'Worker')} appears to have open time. Review before payroll or invoice.", oid(member), member))

    saved = []
    for doc in docs[:80]:
        saved.append(await upsert_slip(db, doc))

    try:
        await db.ai_operator_audit_log.insert_one({
            "business_id": bid,
            "user_id": user_id(user),
            "source": "admin_recovery_sweep",
            "action": "sweep_complete",
            "created": len(saved),
            "created_at": now_utc(),
        })
    except Exception:
        pass

    return {"success": True, "created": len(saved), "items": saved, "message": f"Churvox prepared {len(saved)} admin recovery item(s) for Command."}

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

    async def sweep_endpoint(request: Request):
        user = await get_current_user(request)
        return await run_sweep(db, user, ObjectId)

    async def sweep_preview_endpoint(request: Request):
        user = await get_current_user(request)
        return await run_sweep(db, user, ObjectId)

    for method, path, endpoint in [
        ("POST", "/api/command/recovery-sweep", sweep_endpoint),
        ("GET", "/api/command/recovery-sweep", sweep_preview_endpoint),
    ]:
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
