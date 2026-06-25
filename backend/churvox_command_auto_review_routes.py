import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request

AUTO_COMMAND_REVIEW_MARKER = "AUTO_COMMAND_REVIEW_20260625"

OPEN_REVIEW_STATUSES = {"open", "edited", "pending", "ready", "waiting"}
CANCELLED_STATUSES = {"cancelled", "canceled", "void", "archived", "deleted"}
COMPLETED_STATUSES = {"completed", "complete", "done", "finished", "closed"}
BLOCKED_STATUSES = {"blocked", "stuck", "paused", "on hold", "needs info", "needs information", "waiting", "waiting on customer"}
DOING_STATUSES = {"doing", "in progress", "in_progress", "started", "active", "onsite", "on site", "working"}
UNFINISHED_STATUSES = {"", "open", "ready", "scheduled", "booked", "assigned", "pending", "todo", "to do", "draft"}
INVOICE_FOLLOWUP_STATUSES = {"sent", "open", "unpaid", "overdue", "part paid", "partial", "due"}
QUOTE_FOLLOWUP_STATUSES = {"draft", "sent", "open", "pending", "waiting", "follow up", "follow-up"}


def _now():
    return datetime.now(timezone.utc)


def _clean(value, fallback="", limit=180):
    text = re.sub(r"\s+", " ", str(value or "").strip())
    return (text or fallback)[:limit]


def _normal(value):
    return _clean(value, limit=500).lower().replace("_", " ")


def _first(doc, keys, fallback=""):
    for key in keys:
        value = (doc or {}).get(key)
        if value not in (None, "", []):
            return value
    return fallback


def _doc_id(doc):
    return _clean(_first(doc, ("_id", "id", "job_id", "quote_id", "invoice_id")))


def _money_value(doc):
    for key in ("price", "fixed_price", "job_price", "quoted_price", "quote_total", "invoice_total", "total", "subtotal", "amount", "amount_due", "balance_due"):
        value = (doc or {}).get(key)
        if value in (None, ""):
            continue
        try:
            amount = float(str(value).replace("$", "").replace(",", "").strip())
            if amount > 0:
                return amount
        except Exception:
            continue
    return 0.0


def _money_label(doc):
    amount = _money_value(doc)
    return f"${amount:,.2f}" if amount > 0 else "No price saved"


def _recurring_label(doc):
    if bool((doc or {}).get("is_recurring") or (doc or {}).get("recurring") or (doc or {}).get("repeat")):
        return _clean(_first(doc, ("recurring_frequency", "repeat_frequency", "recurring_rule", "repeat"), "Recurring"))
    value = _clean(_first(doc, ("recurring_frequency", "repeat_frequency", "recurring_rule", "next_visit_date")))
    return value if value else "No"


def _billing_label(doc):
    return _clean(_first(doc, ("billing_type", "pricing_type", "invoice_type", "charge_type", "rate_type"), "Not saved"))


def _customer_label(doc):
    return _clean(_first(doc, ("customer_name", "client_name", "name", "customer", "client"), "Customer"), "Customer")


def _job_label(doc):
    return _clean(_first(doc, ("title", "job_name", "job_type", "description", "service"), "Job"), "Job")


def _address_label(doc):
    return _clean(_first(doc, ("address", "site_address", "service_address", "customer_address"), "No address saved"), "No address saved")


def _assigned_worker(doc):
    return _first(doc, ("assigned_worker_id", "worker_id", "assigned_to", "assignedWorkerId", "worker_name", "assigned_worker_name"))


def _status(doc, *keys):
    return _normal(_first(doc, keys or ("status", "job_status", "workflow_status"), ""))


def _business_scope(business_id, business_oid=None):
    clauses = [{"business_id": str(business_id)}]
    if business_oid is not None:
        clauses.extend([{ "business_id": business_oid }, { "contractor_id": business_oid }])
    return {"$or": clauses}


def _category(action):
    return "money" if action in {"draft_invoice_from_job", "prepare_invoice_followups"} else "work"


def _base_details(record, found, prepared, reason):
    return {
        "Customer": _customer_label(record),
        "Job": _job_label(record),
        "Address": _address_label(record),
        "Status": _clean(_first(record, ("status", "job_status", "workflow_status"), "Not saved"), "Not saved"),
        "Price": _money_label(record),
        "Billing": _billing_label(record),
        "Recurring": _recurring_label(record),
        "What Churvox found": found,
        "What Churvox prepared": prepared,
        "Why it needs approval": reason,
    }


def _review_item(user, business_id, action, issue, title, summary, record_type, record, details, payload=None):
    record_id = _doc_id(record)
    auto_key = f"{AUTO_COMMAND_REVIEW_MARKER}:{business_id}:{record_type}:{record_id}:{issue}"
    payload = dict(payload or {})
    if record_type == "job":
        payload.setdefault("job_id", record_id)
    elif record_type == "invoice":
        payload.setdefault("invoice_id", record_id)
    elif record_type == "quote":
        payload.setdefault("quote_id", record_id)

    return {
        "business_id": str(business_id),
        "created_by": _clean((user or {}).get("id") or (user or {}).get("_id")),
        "source": "Command Auto Review",
        "auto_key": auto_key,
        "status": "open",
        "action": action,
        "category": _category(action),
        "title": title,
        "summary": summary,
        "details": details,
        "payload": payload,
        "match": {"record_type": record_type, "id": record_id, "label": _job_label(record) if record_type == "job" else _customer_label(record), "reason": issue},
        "matches": [{"record_type": record_type, "id": record_id, "label": _job_label(record) if record_type == "job" else _customer_label(record), "reason": issue}],
        "original_text": "Command auto review",
        "ai_confidence": 0.92,
        "created_at": _now(),
        "updated_at": _now(),
    }


async def _job_has_invoice(db, business_id, business_oid, job):
    job_id = _doc_id(job)
    identifiers = [job_id]
    if job.get("_id") is not None:
        identifiers.append(job.get("_id"))
    query = {
        "$and": [
            _business_scope(business_id, business_oid),
            {"status": {"$nin": ["void", "cancelled", "canceled", "deleted"]}},
            {"$or": [
                {"job_id": {"$in": identifiers}},
                {"source_job_id": {"$in": identifiers}},
                {"from_job_id": {"$in": identifiers}},
            ]},
        ]
    }
    try:
        return bool(await db.invoices.find_one(query))
    except Exception:
        return False


async def _job_candidates(db, user, business_id, business_oid):
    try:
        jobs = await db.jobs.find(_business_scope(business_id, business_oid)).sort("updated_at", -1).limit(120).to_list(120)
    except Exception:
        jobs = []

    candidates = []
    for job in jobs:
        record_id = _doc_id(job)
        if not record_id:
            continue
        status = _status(job, "status", "job_status", "workflow_status")
        if status in CANCELLED_STATUSES:
            continue

        if job.get("completed") is True or status in COMPLETED_STATUSES:
            if await _job_has_invoice(db, business_id, business_oid, job):
                continue
            candidates.append(_review_item(
                user,
                business_id,
                "draft_invoice_from_job",
                "completed_job_needs_invoice",
                "Draft invoice for completed job",
                f"{_job_label(job)} is complete and still needs an invoice draft.",
                "job",
                job,
                _base_details(
                    job,
                    "Completed work has no linked invoice yet.",
                    "Prepared a draft invoice step from the completed job.",
                    "Approving creates the invoice draft and links it back to the job.",
                ),
                {"job_id": record_id, "subtotal": _money_value(job), "amount": _money_value(job)},
            ))
            continue

        if status in BLOCKED_STATUSES:
            candidates.append(_review_item(
                user,
                business_id,
                "find_records",
                "blocked_job_needs_decision",
                "Review blocked job",
                f"{_job_label(job)} is blocked and needs an owner decision.",
                "job",
                job,
                _base_details(
                    job,
                    "A job is blocked, paused, or waiting on information.",
                    "Collected the job facts for Command review.",
                    "Approving records that the owner reviewed the blocker before work moves on.",
                ),
            ))
            continue

        if status in DOING_STATUSES:
            candidates.append(_review_item(
                user,
                business_id,
                "find_records",
                "doing_job_needs_followup",
                "Review job in progress",
                f"{_job_label(job)} is in progress and may need follow-up.",
                "job",
                job,
                _base_details(
                    job,
                    "A job is marked doing or in progress.",
                    "Collected the live job facts for Command review.",
                    "Command is where unfinished admin follow-up is approved or dismissed.",
                ),
            ))
            continue

        if status in UNFINISHED_STATUSES:
            if not _assigned_worker(job):
                issue = "unfinished_job_needs_worker"
                title = "Assign worker to scheduled job"
                summary = f"{_job_label(job)} is unfinished and has no worker assigned."
                prepared = "Collected the job facts so the owner can assign or edit the job from Command."
            else:
                issue = "unfinished_job_needs_review"
                title = "Review unfinished job"
                summary = f"{_job_label(job)} is unfinished and still needs owner review."
                prepared = "Collected the unfinished job facts for Command review."
            candidates.append(_review_item(
                user,
                business_id,
                "find_records",
                issue,
                title,
                summary,
                "job",
                job,
                _base_details(
                    job,
                    "A job is still unfinished or waiting in the workflow.",
                    prepared,
                    "Command keeps unfinished work out of the clean record pages until the owner approves the next step.",
                ),
            ))
    return candidates


async def _invoice_candidates(db, user, business_id, business_oid):
    try:
        invoices = await db.invoices.find(_business_scope(business_id, business_oid)).sort("updated_at", -1).limit(80).to_list(80)
    except Exception:
        invoices = []

    candidates = []
    for invoice in invoices:
        status = _status(invoice, "status", "invoice_status", "payment_status")
        if status not in INVOICE_FOLLOWUP_STATUSES:
            continue
        candidates.append(_review_item(
            user,
            business_id,
            "prepare_invoice_followups",
            "invoice_needs_followup",
            "Prepare invoice follow-up",
            f"Invoice for {_customer_label(invoice)} is {status or 'open'} and may need follow-up.",
            "invoice",
            invoice,
            _base_details(
                invoice,
                "An invoice is open, unpaid, or overdue.",
                "Prepared the invoice follow-up for owner approval.",
                "Nothing is sent until the owner approves it in Command.",
            ),
        ))
    return candidates


async def _quote_candidates(db, user, business_id, business_oid):
    try:
        quotes = await db.quotes.find(_business_scope(business_id, business_oid)).sort("updated_at", -1).limit(80).to_list(80)
    except Exception:
        quotes = []

    candidates = []
    for quote in quotes:
        status = _status(quote, "status", "quote_status")
        if status not in QUOTE_FOLLOWUP_STATUSES:
            continue
        candidates.append(_review_item(
            user,
            business_id,
            "find_records",
            "quote_needs_followup",
            "Review open quote",
            f"Quote for {_customer_label(quote)} is {status or 'open'} and needs a decision.",
            "quote",
            quote,
            _base_details(
                quote,
                "A quote is draft, sent, pending, or waiting.",
                "Collected the quote facts for Command review.",
                "Command keeps quote follow-up in the approval desk instead of cluttering normal record pages.",
            ),
        ))
    return candidates


async def ensure_auto_command_items(db, user, business_ids):
    business_id, business_oid = business_ids(user)
    candidates = []
    candidates.extend(await _job_candidates(db, user, business_id, business_oid))
    candidates.extend(await _invoice_candidates(db, user, business_id, business_oid))
    candidates.extend(await _quote_candidates(db, user, business_id, business_oid))
    candidates = candidates[:60]
    if not candidates:
        return 0

    auto_keys = [item["auto_key"] for item in candidates]
    try:
        existing = await db.ai_review_items.find({"business_id": str(business_id), "auto_key": {"$in": auto_keys}}).to_list(len(auto_keys))
    except Exception:
        existing = []
    existing_keys = {item.get("auto_key") for item in existing}
    fresh = [item for item in candidates if item.get("auto_key") not in existing_keys]
    if not fresh:
        return 0
    await db.ai_review_items.insert_many(fresh)
    return len(fresh)


def _closure_values(fn):
    names = getattr(getattr(fn, "__code__", None), "co_freevars", ()) or ()
    cells = getattr(fn, "__closure__", None) or ()
    values = {}
    for name, cell in zip(names, cells):
        try:
            values[name] = cell.cell_contents
        except Exception:
            pass
    return values


def _find_review_context(ai_router):
    for route in getattr(ai_router, "routes", []) or []:
        path = str(getattr(route, "path", ""))
        methods = getattr(route, "methods", set()) or set()
        if path.endswith("/ai-review-items") and "GET" in methods:
            values = _closure_values(getattr(route, "endpoint", None))
            needed = ("db", "require_owner", "business_ids", "doc_out", "enrich_review_item")
            if all(values.get(name) is not None for name in needed):
                return {name: values[name] for name in needed}
    return None


def install_from_ai_router(app, ai_router, original_include_router, *args, **kwargs):
    if getattr(app.state, "churvox_command_auto_review_routes_installed", False):
        return False
    context = _find_review_context(ai_router)
    if not context:
        return False

    prefix = kwargs.get("prefix") or ""
    router = APIRouter()
    db = context["db"]
    require_owner = context["require_owner"]
    business_ids = context["business_ids"]
    doc_out = context["doc_out"]
    enrich_review_item = context["enrich_review_item"]

    @router.get("/ai-review-items")
    async def list_command_auto_review_items(request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        await ensure_auto_command_items(db, user, business_ids)
        raw_items = await db.ai_review_items.find({
            "business_id": str(business_id),
            "status": {"$in": sorted(OPEN_REVIEW_STATUSES)},
        }).sort("created_at", -1).limit(200).to_list(200)
        items = []
        for raw in raw_items:
            item = enrich_review_item(doc_out(raw))
            if item.get("preparedForApproval"):
                items.append(item)
        return {"success": True, "items": items, "source": "Command Auto Review"}

    original_include_router(app, router, prefix=prefix)
    app.state.churvox_command_auto_review_routes_installed = True
    return True
