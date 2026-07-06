from datetime import datetime, timezone
import sys

from fastapi import Request

INSTALLED = set()

LANES = ["Worker problems", "Missing info", "Money waiting", "Ready to approve", "Day close"]

GUARDRAILS = [
    "Draft invoices only until the owner approves.",
    "No automatic invoice sending.",
    "No tax filing or government submission.",
    "No bank payout files.",
    "Payments are marked paid only after confirmed records are refreshed.",
    "Bookkeeper exports stay reviewable before handoff.",
]

COUNTRY_PRESETS = {
    "NZ": {"country": "New Zealand", "currency": "NZD", "locale": "en-NZ", "tax_name": "GST", "tax_rate": "15", "invoice_title": "Taxable supply information", "business_id_label": "NZBN", "payment_terms": "7 days", "invoice_prefix": "INV-NZ"},
    "AU": {"country": "Australia", "currency": "AUD", "locale": "en-AU", "tax_name": "GST", "tax_rate": "10", "invoice_title": "Tax invoice", "business_id_label": "ABN", "payment_terms": "7 days", "invoice_prefix": "INV-AU"},
    "GB": {"country": "United Kingdom", "currency": "GBP", "locale": "en-GB", "tax_name": "VAT", "tax_rate": "20", "invoice_title": "VAT invoice", "business_id_label": "VAT number", "payment_terms": "14 days", "invoice_prefix": "INV-UK"},
    "US": {"country": "United States", "currency": "USD", "locale": "en-US", "tax_name": "Sales tax", "tax_rate": "0", "invoice_title": "Invoice", "business_id_label": "Business ID / EIN", "payment_terms": "14 days", "invoice_prefix": "INV-US"},
    "CA": {"country": "Canada", "currency": "CAD", "locale": "en-CA", "tax_name": "GST/HST/PST", "tax_rate": "5", "invoice_title": "Tax invoice", "business_id_label": "Business number", "payment_terms": "14 days", "invoice_prefix": "INV-CA"},
    "ZA": {"country": "South Africa", "currency": "ZAR", "locale": "en-ZA", "tax_name": "VAT", "tax_rate": "15", "invoice_title": "Tax invoice", "business_id_label": "VAT number / registration number", "payment_terms": "7 days", "invoice_prefix": "INV-ZA"},
}


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if key in {"password", "password_hash", "hashed_password", "token", "access_token", "refresh_token"}:
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    return value


def first(row, *keys, fallback=""):
    for key in keys:
        value = (row or {}).get(key)
        if text(value):
            return text(value)
    return fallback


def amount(row, *keys):
    for key in keys:
        try:
            value = (row or {}).get(key)
            if value not in (None, ""):
                return float(str(value).replace("$", "").replace(",", ""))
        except Exception:
            pass
    return 0.0


def money(value):
    try:
        return "${:,.0f}".format(float(value or 0))
    except Exception:
        return "$0"


def id_value(row):
    raw = (row or {}).get("id") or (row or {}).get("_id") or (row or {}).get("job_id") or (row or {}).get("invoice_id") or (row or {}).get("user_id") or ""
    if isinstance(raw, dict):
        return text(raw.get("$oid") or raw.get("id") or raw.get("_id"))
    return text(raw)


def user_id(user):
    return text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("user_id"))


def business_id(user):
    return text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or user_id(user))


def country_settings(user):
    code = first(user, "country_code", "billing_country", "country", "business_country_code", fallback="NZ").upper()[:2]
    preset = dict(COUNTRY_PRESETS.get(code) or COUNTRY_PRESETS["NZ"])
    preset["country_code"] = code if code in COUNTRY_PRESETS else "NZ"
    preset["tax_rate"] = text((user or {}).get("gst_rate") or (user or {}).get("tax_rate") or preset["tax_rate"])
    preset["business_id_value"] = text((user or {}).get("nzbn") or (user or {}).get("abn") or (user or {}).get("vat_number") or business_id(user))
    preset["owner_approval_required"] = True
    preset["admin_ledger_mode"] = "draft_export_owner_approved"
    preset["accounting_handoff"] = "draft_sync_or_export_only"
    preset["guardrails"] = GUARDRAILS
    return preset


def scope(user, ObjectId):
    values = {user_id(user), business_id(user)}
    values = {v for v in values if v}
    final_values = list(values)

    for value in list(values):
        try:
            final_values.append(ObjectId(value))
        except Exception:
            pass

    email = lower((user or {}).get("email"))
    ors = [
        {"business_id": {"$in": final_values}},
        {"businessId": {"$in": final_values}},
        {"contractor_id": {"$in": final_values}},
        {"owner_business_id": {"$in": final_values}},
        {"owner_id": {"$in": final_values}},
        {"user_id": {"$in": final_values}},
        {"created_by": {"$in": final_values}},
        {"created_by_id": {"$in": final_values}},
        {"employer_id": {"$in": final_values}},
        {"account_id": {"$in": final_values}},
    ]

    if email:
        ors.extend([
            {"owner_email": email},
            {"created_by_email": email},
            {"business_email": email},
            {"email": email},
        ])

    return {"$or": ors}


def remove_route(app, path, method):
    try:
        app.router.routes = [
            route for route in app.router.routes
            if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))
        ]
    except Exception:
        pass


def area_of(value):
    raw = lower(value)
    for area in ["naenae", "lower hutt", "upper hutt", "wainuiomata", "avalon", "belmont", "petone", "porirua", "wellington", "auckland", "christchurch"]:
        if area in raw:
            return area.title()
    return text(value).split(",")[0] or "same area"


def status_is_complete(value):
    return any(word in lower(value) for word in ["complete", "completed", "done", "finished"])


def status_is_paid(value):
    return any(word in lower(value) for word in ["paid", "payment confirmed", "confirmed paid"])


def proof_ok(value):
    raw = lower(value)
    if not raw:
        return False
    if any(word in raw for word in ["missing", "required", "no proof", "not added", "none"]):
        return False
    return any(word in raw for word in ["yes", "done", "complete", "added", "uploaded", "photo", "proof", "1", "2", "3", "4", "5"])


def job_view(row, index=0):
    return {
        "id": id_value(row),
        "title": first(row, "title", "job_title", "job_name", "name", "description", fallback=f"Job {index + 1}"),
        "client": first(row, "client_name", "customer_name", "client", fallback="No client"),
        "address": first(row, "address", "site_address", "job_address", "service_address"),
        "service": first(row, "service", "service_type", "job_type", fallback="Other"),
        "worker": first(row, "assigned_worker_name", "worker_name", "worker", "assigned_to", fallback="Unassigned"),
        "worker_email": first(row, "assigned_worker_email", "worker_email"),
        "date": first(row, "scheduled_date", "date", "start_date"),
        "time": first(row, "scheduled_time", "start_time", "time"),
        "status": first(row, "status", "job_status", "workflow_status", fallback="assigned"),
        "price": amount(row, "price", "amount", "total", "job_price", "quote_total"),
        "frequency": first(row, "recurring", "frequency", "repeat", "schedule", fallback="One-off"),
        "billing": first(row, "billing", "billing_type", fallback="Fixed price"),
        "proof": first(row, "proof", "proof_status", "photo_status", "proof_photo_count", "photo_count", "proof_required", "photo_required"),
        "invoice": first(row, "invoice_status", "invoice", "invoice_number", "accounting_status", "xero_status"),
        "payment": first(row, "payment_status", "paid_status", "status_paid"),
        "issue": first(row, "issue", "problem", "needs_attention", "blocked_reason"),
    }


def invoice_view(row, index=0):
    return {
        "id": id_value(row),
        "number": first(row, "invoice_number", "number", fallback=f"Invoice {index + 1}"),
        "client": first(row, "client_name", "customer_name", "client", fallback="No client"),
        "job": first(row, "job_title", "job", "job_name"),
        "job_id": first(row, "job_id"),
        "amount": amount(row, "amount", "total", "price"),
        "due": first(row, "due_date", "due"),
        "status": first(row, "status", fallback="Draft"),
        "sync": first(row, "sync", "accounting_status", "xero_status", fallback="Not synced"),
        "line": first(row, "line_item", "description"),
        "evidence": first(row, "evidence", "proof"),
        "currency": first(row, "currency"),
        "tax_name": first(row, "tax_name"),
        "tax_rate": first(row, "tax_rate"),
        "invoice_title": first(row, "invoice_title"),
        "business_id": first(row, "business_id_value", "business_id", "nzbn", "abn", "vat_number"),
        "auto_sent": bool((row or {}).get("auto_sent") or (row or {}).get("sent_automatically")),
    }


def worker_view(row, index=0):
    return {
        "id": id_value(row),
        "name": first(row, "name", "full_name", "display_name", "email", fallback=f"Worker {index + 1}"),
        "role": first(row, "role", fallback="Worker"),
        "status": first(row, "status", "clock_status", fallback="Available"),
        "job": first(row, "current_job", "job_title"),
        "gps": first(row, "gps", "location", "area", "service_region"),
        "skills": first(row, "skills", "skill_tags", "trade", "service_skills", "notes"),
        "areas": first(row, "service_areas", "service_area", "areas", "region"),
        "equipment": first(row, "equipment", "tools", "gear", "vehicle"),
        "availability": first(row, "normal_availability", "availability", "work_days", "usual_hours"),
        "capacity": first(row, "max_jobs_per_day", "max_jobs", "daily_capacity"),
    }


def find_invoice_for_job(job, invoices):
    job_id = lower(job.get("id"))
    title = lower(job.get("title"))
    client = lower(job.get("client"))

    for invoice in invoices:
        if job_id and job_id == lower(invoice.get("job_id")):
            return invoice
        if title and title == lower(invoice.get("job")):
            return invoice
        if title and title in lower(invoice.get("line")):
            return invoice
        if client and client == lower(invoice.get("client")) and (invoice.get("amount") or 0) == (job.get("price") or 0):
            return invoice

    return None


def check(label, ok, detail="", required=True):
    return {"label": label, "ok": bool(ok), "detail": detail, "required": bool(required)}


def job_ledger(job, invoices=None):
    invoices = invoices or []
    invoice = find_invoice_for_job(job, invoices)
    complete = status_is_complete(job.get("status"))
    has_issue = bool(text(job.get("issue"))) or any(word in lower(job.get("status")) for word in ["issue", "blocked", "hold", "needs check"])

    checks = [
        check("Client", job.get("client") and job.get("client") != "No client", job.get("client")),
        check("Address", bool(job.get("address")), job.get("address")),
        check("Worker", bool(job.get("worker")) and "unassigned" not in lower(job.get("worker")), job.get("worker")),
        check("Date", bool(job.get("date")), job.get("date")),
        check("Time", bool(job.get("time")), job.get("time")),
        check("Price", float(job.get("price") or 0) > 0, money(job.get("price"))),
        check("Frequency", bool(job.get("frequency")), job.get("frequency"), required=False),
        check("Issue clear", not has_issue, job.get("issue") or job.get("status")),
        check("Proof", (not complete) or proof_ok(job.get("proof")), "Required when completed"),
        check("Invoice draft", (not complete) or bool(invoice or job.get("invoice")), "Required when completed"),
        check("Payment confirmed", (not complete) or status_is_paid((invoice or {}).get("status") or job.get("payment")), "Only after accounting/payment refresh", required=False),
    ]

    required = [item for item in checks if item["required"]]
    ready = [item for item in required if item["ok"]]
    score = round((len(ready) / max(len(required), 1)) * 100)

    return {
        "record_type": "job",
        "id": job.get("id"),
        "title": job.get("title"),
        "score": score,
        "complete": complete,
        "has_issue": has_issue,
        "checks": checks,
        "missing": [item["label"] for item in required if not item["ok"]],
        "invoice_id": invoice.get("id") if invoice else "",
    }


def invoice_ledger(invoice, country):
    status = lower(invoice.get("status"))
    sync = lower(invoice.get("sync"))
    draft_safe = not any(word in status for word in ["sent automatically", "auto sent"]) and not invoice.get("auto_sent")
    not_tax_filing = not any(word in sync for word in ["tax filing", "filed return", "government submission", "bank payout"])

    checks = [
        check("Client", invoice.get("client") and invoice.get("client") != "No client", invoice.get("client")),
        check("Job/source", bool(invoice.get("job") or invoice.get("job_id") or invoice.get("line")), invoice.get("job") or invoice.get("line")),
        check("Amount", float(invoice.get("amount") or 0) > 0, money(invoice.get("amount"))),
        check("Due date", bool(invoice.get("due")), invoice.get("due")),
        check("Draft/owner status", any(word in status for word in ["draft", "review", "ready", "pending", "approved"]) or status == "", invoice.get("status")),
        check("Currency", bool(invoice.get("currency") or country.get("currency")), invoice.get("currency") or country.get("currency")),
        check("Tax name", bool(invoice.get("tax_name") or country.get("tax_name")), invoice.get("tax_name") or country.get("tax_name")),
        check("Tax rate", text(invoice.get("tax_rate") or country.get("tax_rate")) != "", invoice.get("tax_rate") or country.get("tax_rate")),
        check("Invoice title", bool(invoice.get("invoice_title") or country.get("invoice_title")), invoice.get("invoice_title") or country.get("invoice_title")),
        check("Business ID", bool(invoice.get("business_id") or country.get("business_id_value")), invoice.get("business_id") or country.get("business_id_value"), required=False),
        check("No automatic sending", draft_safe, "Owner approval required"),
        check("No tax/bank filing", not_tax_filing, "Draft sync/export only"),
    ]

    required = [item for item in checks if item["required"]]
    ready = [item for item in required if item["ok"]]
    score = round((len(ready) / max(len(required), 1)) * 100)

    return {
        "record_type": "invoice",
        "id": invoice.get("id"),
        "title": invoice.get("number"),
        "score": score,
        "checks": checks,
        "missing": [item["label"] for item in required if not item["ok"]],
    }


def command_slip(kind, title, summary, recommendation, details=None, payload=None, lane=None, ledger=None):
    lane = lane or "Ready to approve"
    score = ledger.get("score") if isinstance(ledger, dict) else None
    score_label = f"Ledger {score}%" if score is not None else "Ledger ready"

    return {
        "id": f"ledger-{lane.lower().replace(' ', '-')}-{kind.lower().replace(' ', '-')}-{text((payload or {}).get('job_id') or (payload or {}).get('invoice_id') or title).lower().replace(' ', '-')[:48]}",
        "type": f"{lane} · {kind}",
        "kind": "admin_ledger",
        "action_type": kind,
        "lane": lane,
        "title": f"{score_label} · {title}",
        "summary": summary,
        "status": lane,
        "owner": "Review in Command",
        "filled": summary,
        "evidence": "; ".join([f"{item['label']}: {'ok' if item['ok'] else 'missing'}" for item in (ledger or {}).get("checks", [])]) if isinstance(ledger, dict) else "Prepared from live records.",
        "check": recommendation,
        "details": details or [],
        "payload": payload or {},
        "ledger": ledger or {},
        "requires_owner_approval": True,
        "auto_sent": False,
        "accounting_synced": False,
        "created_at": datetime.now(timezone.utc),
    }


def worker_score(worker, job):
    hay = lower(" ".join([
        worker.get("name", ""),
        worker.get("role", ""),
        worker.get("status", ""),
        worker.get("job", ""),
        worker.get("gps", ""),
        worker.get("skills", ""),
        worker.get("areas", ""),
        worker.get("equipment", ""),
        worker.get("availability", ""),
    ]))

    score = 40
    service = lower(job.get("service"))
    area = lower(area_of(job.get("address")))

    if "busy" not in lower(worker.get("status")) and "progress" not in lower(worker.get("status")):
        score += 18
    if service and service in hay:
        score += 20
    if area and area in hay:
        score += 16
    if not text(worker.get("job")) or "no job" in lower(worker.get("job")):
        score += 10
    if service and service in lower(worker.get("equipment")):
        score += 6

    return score


def slip_lane_from_worker_message(row):
    raw = lower(" ".join([row.get("type", ""), row.get("kind", ""), row.get("problem_label", ""), row.get("summary", ""), row.get("text", ""), row.get("note", "")]))
    if any(word in raw for word in ["problem", "issue", "blocked", "access", "late", "materials", "bigger", "extra work"]):
        return "Worker problems"
    if any(word in raw for word in ["complete", "completed", "finish", "finished", "proof", "photo"]):
        return "Money waiting"
    return "Ready to approve"


def build_actions(jobs_raw, workers_raw, clients, quotes, invoices_raw, messages, country):
    jobs = [job_view(row, index) for index, row in enumerate(jobs_raw or [])]
    workers = [worker_view(row, index) for index, row in enumerate(workers_raw or [])]
    invoices = [invoice_view(row, index) for index, row in enumerate(invoices_raw or [])]
    actions = []

    job_ledgers = [job_ledger(job, invoices) for job in jobs[:80]]
    invoice_ledgers = [invoice_ledger(invoice, country) for invoice in invoices[:80]]

    for job, ledger in zip(jobs[:80], job_ledgers):
        missing = ledger.get("missing", [])

        if ledger.get("has_issue"):
            actions.append(command_slip(
                "Job Issue",
                job.get("title"),
                f"{job.get('title')} has an issue or hold flag.",
                "Decide the next move, then approve, edit or park.",
                [f"Client: {job.get('client')}", f"Worker: {job.get('worker')}", f"Status: {job.get('status')}", f"Issue: {job.get('issue') or job.get('status')}"],
                {"job_id": job.get("id")},
                lane="Worker problems",
                ledger=ledger,
            ))

        if missing:
            actions.append(command_slip(
                "Job Ledger",
                job.get("title"),
                f"Missing: {', '.join(missing)}.",
                "Fix or park the job before it moves forward.",
                [f"Client: {job.get('client')}", f"Worker: {job.get('worker')}", f"Status: {job.get('status')}", f"Missing: {', '.join(missing)}"],
                {"job_id": job.get("id")},
                lane="Missing info",
                ledger=ledger,
            ))

        if status_is_complete(job.get("status")) and "Invoice draft" not in missing and "Proof" not in missing:
            actions.append(command_slip(
                "Invoice Check",
                job.get("title"),
                f"{job.get('title')} is completed and ready for owner invoice review.",
                "Review proof and invoice before anything is sent or synced.",
                [f"Client: {job.get('client')}", f"Amount: {money(job.get('price'))}", "Draft sync only", "Owner approval required"],
                {"job_id": job.get("id"), "invoice_id": ledger.get("invoice_id")},
                lane="Money waiting",
                ledger=ledger,
            ))

    target = next((job for job in jobs if "unassigned" in lower(job.get("worker"))), None)
    if target and workers:
        worker = sorted(workers, key=lambda item: worker_score(item, target), reverse=True)[0]
        actions.append(command_slip(
            "Smart Assign",
            target.get("title"),
            f"{worker.get('name')} is the best fit for {target.get('service')} near {area_of(target.get('address'))}.",
            "Approve before assigning the job.",
            [f"Area: {area_of(target.get('address'))}", f"Worker status: {worker.get('status')}", f"Service: {target.get('service')}", "Owner approval stays in Command"],
            {"job_id": target.get("id"), "assigned_worker_name": worker.get("name"), "assigned_worker_id": worker.get("id")},
            lane="Ready to approve",
            ledger=job_ledger(target, invoices),
        ))

    unscheduled = next((job for job in jobs if not job.get("date") or not job.get("time")), None)
    if unscheduled:
        actions.append(command_slip(
            "Smart Schedule",
            unscheduled.get("title"),
            "Date or time is missing, so Churvox prepared a clean schedule check.",
            "Review the time before sending anything to the worker.",
            ["Suggested time: 09:30", f"Client: {unscheduled.get('client')}", f"Area: {area_of(unscheduled.get('address'))}"],
            {"job_id": unscheduled.get("id"), "scheduled_time": "09:30"},
            lane="Ready to approve",
            ledger=job_ledger(unscheduled, invoices),
        ))

    for invoice, ledger in zip(invoices[:80], invoice_ledgers):
        missing = ledger.get("missing", [])
        if missing:
            actions.append(command_slip(
                "Invoice Ledger",
                invoice.get("number"),
                f"Invoice missing: {', '.join(missing)}.",
                "Fix invoice details before owner-approved draft sync/export.",
                [f"Client: {invoice.get('client')}", f"Amount: {money(invoice.get('amount'))}", f"Status: {invoice.get('status')}", f"Missing: {', '.join(missing)}"],
                {"invoice_id": invoice.get("id")},
                lane="Missing info",
                ledger=ledger,
            ))
        else:
            actions.append(command_slip(
                "Draft Invoice Review",
                invoice.get("number"),
                f"{invoice.get('number')} is ready for owner review, draft sync or export.",
                "Owner must approve before any handoff.",
                [f"Client: {invoice.get('client')}", f"Amount: {money(invoice.get('amount'))}", country.get("currency"), country.get("tax_name")],
                {"invoice_id": invoice.get("id")},
                lane="Money waiting",
                ledger=ledger,
            ))

    for row in messages[:120]:
        lane = slip_lane_from_worker_message(row)
        title = first(row, "summary", "title", "message", "note", "text", fallback="Worker update")
        body = first(row, "text", "note", "message", "summary", fallback="Worker sent an update for owner review.")
        actions.append(command_slip(
            "Worker Update",
            title,
            body,
            "Attach to the job, then approve, edit or park in Command.",
            [
                first(row, "client_name", "client", fallback="Client unknown"),
                first(row, "job_title", "job", fallback="Job unknown"),
                first(row, "problem_label", "type", "kind", fallback="Worker update"),
            ],
            {"source_id": id_value(row), "job_id": first(row, "job_id")},
            lane=lane,
        ))

    draft_total = sum(invoice.get("amount") or 0 for invoice in invoices if "paid" not in lower(invoice.get("status")))
    actions.append(command_slip(
        "Day Close",
        "Today admin close",
        f"{len(jobs)} jobs, {len(invoices)} invoices, {len(messages)} worker/admin updates and {money(draft_total)} in draft value checked.",
        "Review the admin pile and park anything not ready.",
        [
            f"Jobs checked: {len(jobs)}",
            f"Invoices checked: {len(invoices)}",
            f"Updates checked: {len(messages)}",
            f"Draft value: {money(draft_total)}",
            "No automatic send, tax filing or payout file.",
        ],
        lane="Day close",
    ))

    seen = set()
    unique = []
    for action in actions:
        key = action.get("id")
        if key in seen:
            continue
        seen.add(key)
        unique.append(action)

    lane_order = {"Worker problems": 0, "Missing info": 1, "Money waiting": 2, "Ready to approve": 3, "Day close": 4}
    return sorted(unique, key=lambda item: lane_order.get(item.get("lane"), 9))[:120], job_ledgers, invoice_ledgers


def lane_counts(actions):
    counts = {lane: 0 for lane in LANES}
    for action in actions:
        lane = action.get("lane") or "Ready to approve"
        counts[lane] = counts.get(lane, 0) + 1
    return counts


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)

    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    async def read_rows(collection, query, limit=150):
        out = []
        try:
            cursor = getattr(db, collection).find(query).sort("created_at", -1).limit(limit)
            async for row in cursor:
                out.append(safe(row))
        except Exception as exc:
            print(f"Churvox true admin ledger read skipped {collection}: {exc}", file=sys.stderr)
        return out

    async def ledger_data(request: Request):
        user = await get_current_user(request)
        base = scope(user, ObjectId)
        country = country_settings(user)

        jobs = await read_rows("jobs", base, 160)
        clients = await read_rows("clients", base, 100)
        quotes = await read_rows("quotes", base, 100)
        invoices = await read_rows("invoices", base, 120)

        messages = []
        for collection in ["notifications", "approved_notifications", "worker_messages", "worker_field_slips", "field_slips"]:
            messages.extend(await read_rows(collection, base, 120))

        workers = await read_rows(
            "users",
            {"$and": [base, {"role": {"$in": ["worker", "staff", "employee", "subcontractor", "contractor", "payroll"]}}]},
            120,
        )

        actions, job_ledgers, invoice_ledgers = build_actions(jobs, workers, clients, quotes, invoices, messages, country)

        return {
            "success": True,
            "ledger_version": "true-admin-ledger-v1",
            "country": country,
            "guardrails": GUARDRAILS,
            "actions": actions,
            "items": actions,
            "data": actions,
            "lanes": LANES,
            "lane_counts": lane_counts(actions),
            "audit": {
                "jobs": job_ledgers,
                "invoices": invoice_ledgers,
                "totals": {
                    "jobs": len(jobs),
                    "clients": len(clients),
                    "quotes": len(quotes),
                    "invoices": len(invoices),
                    "workers": len(workers),
                    "updates": len(messages),
                    "actions": len(actions),
                },
            },
            "wiring": {
                "reads": ["jobs", "clients", "quotes", "invoices", "users", "worker_field_slips", "worker_messages", "notifications"],
                "command_endpoints": ["/api/ai/actions", "/api/command/actions", "/api/command/approvals"],
                "audit_endpoint": "/api/admin-ledger/audit",
                "health_endpoint": "/api/admin-ledger/health",
            },
            "owner_controlled": True,
            "auto_invoice_sending": False,
            "tax_filing": False,
            "bank_payout_files": False,
        }

    async def command_actions(request: Request):
        payload = await ledger_data(request)
        return {
            "success": True,
            "actions": payload["actions"],
            "items": payload["actions"],
            "data": payload["actions"],
            "lanes": payload["lanes"],
            "lane_counts": payload["lane_counts"],
            "ledger_version": payload["ledger_version"],
            "owner_controlled": True,
        }

    async def admin_ledger_audit(request: Request):
        return await ledger_data(request)

    async def admin_ledger_health(request: Request):
        payload = await ledger_data(request)
        return {
            "success": True,
            "ledger_version": payload["ledger_version"],
            "country": payload["country"],
            "lane_counts": payload["lane_counts"],
            "totals": payload["audit"]["totals"],
            "guardrails": payload["guardrails"],
            "owner_controlled": True,
        }

    for path in ["/api/ai/actions", "/api/command/actions", "/api/command/approvals"]:
        remove_route(app, path, "GET")
        app.add_api_route(path, command_actions, methods=["GET"])

    for path in ["/api/admin-ledger/audit", "/api/admin-ledger/true-audit"]:
        remove_route(app, path, "GET")
        app.add_api_route(path, admin_ledger_audit, methods=["GET"])

    remove_route(app, "/api/admin-ledger/health", "GET")
    app.add_api_route("/api/admin-ledger/health", admin_ledger_health, methods=["GET"])

    INSTALLED.add(name)
