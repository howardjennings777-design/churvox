from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

INSTALLED = set()
FINAL = {"approved", "completed", "complete", "done", "paid", "declined", "dismissed", "rejected", "sent", "archived", "cancelled", "canceled"}


def now():
    return datetime.now(timezone.utc)


def text(v: Any) -> str:
    try:
        return str(v or "").replace("\n", " ").strip()
    except Exception:
        return ""


def low(v: Any) -> str:
    return text(v).lower()


def safe(v: Any):
    if isinstance(v, datetime):
        return v.isoformat()
    try:
        from bson import ObjectId
        if isinstance(v, ObjectId):
            return str(v)
    except Exception:
        pass
    if isinstance(v, list):
        return [safe(x) for x in v]
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            if any(word in str(k).lower() for word in ["password", "token", "secret", "hash"]):
                continue
            out["id" if k == "_id" else k] = safe(x)
        return out
    return v


def pick(row: Dict[str, Any] | None, *names: str, default=""):
    row = row or {}
    for name in names:
        try:
            if row.get(name) not in (None, ""):
                return row.get(name)
        except Exception:
            pass
    return default


def uid(user):
    return text(pick(user, "id", "_id", "user_id", "email"))


def bid(user):
    return text(pick(user, "business_id", "businessId", "owner_business_id", "contractor_id", default=uid(user)))


def email(row):
    return low(pick(row, "email", "user_email", "owner_email", "business_email"))


def scope(user, ObjectId, extra=None):
    values = [v for v in {uid(user), bid(user)} if v]
    expanded: List[Any] = list(values)
    for value in list(values):
        try:
            expanded.append(ObjectId(str(value)))
        except Exception:
            pass
    ors = [
        {"business_id": {"$in": expanded}}, {"businessId": {"$in": expanded}}, {"owner_business_id": {"$in": expanded}},
        {"contractor_id": {"$in": expanded}}, {"owner_id": {"$in": expanded}}, {"user_id": {"$in": expanded}},
        {"created_by": {"$in": expanded}}, {"account_id": {"$in": expanded}},
    ]
    if email(user):
        ors.extend([{"owner_email": email(user)}, {"created_by_email": email(user)}, {"business_email": email(user)}, {"email": email(user)}])
    base = {"$or": ors}
    return {"$and": [base, extra]} if extra else base


async def exists(db, name: str) -> bool:
    try:
        return name in set(await db.list_collection_names())
    except Exception:
        return False


async def rows(db, name: str, query: Dict[str, Any], limit=100, sort="updated_at"):
    try:
        if not await exists(db, name):
            return []
        cursor = db[name].find(query)
        try:
            cursor = cursor.sort(sort, -1)
        except Exception:
            pass
        return await cursor.limit(limit).to_list(length=limit)
    except Exception:
        return []


async def one(db, name: str, query: Dict[str, Any]):
    try:
        if not await exists(db, name):
            return None
        return await db[name].find_one(query)
    except Exception:
        return None


def doc_id(row):
    raw = pick(row, "id", "_id", "job_id", "client_id", "invoice_id", "quote_id", "message_id", "slip_id")
    return text(raw)


def title(row, fallback="Record"):
    return text(pick(row, "title", "job_title", "job_name", "name", "subject", "summary", "description", default=fallback)) or fallback


def client(row):
    return text(pick(row, "client_name", "customer_name", "client", "customer", "business_name", default="No client")) or "No client"


def address(row):
    return text(pick(row, "address", "site_address", "service_address", "job_address"))


def amount(row) -> float:
    row = row or {}
    for name in ["amount", "total", "total_amount", "price", "fixed_price", "quote_total", "invoice_total", "saved_price"]:
        try:
            value = float(str(row.get(name) or 0).replace("$", "").replace(",", ""))
            if value:
                return value
        except Exception:
            pass
    return 0.0


def status(row):
    return low(pick(row, "status", "job_status", "review_status", "state", "payment_status"))


def is_done(row):
    s = status(row)
    return any(word in s for word in FINAL)


def date_val(row):
    return text(pick(row, "scheduled_date", "date", "start_date", "due_date", "created_at", "updated_at"))[:10]


def time_val(row):
    return text(pick(row, "scheduled_time", "start_time", "time"))


def parse_dt(v):
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    raw = text(v)
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except Exception:
        try:
            return datetime.fromisoformat(raw[:10]).replace(tzinfo=timezone.utc)
        except Exception:
            return None


def worker(row):
    return text(pick(row, "assigned_worker_name", "worker_name", "assigned_to", "worker", "assigned_worker_id"))


def action_id(kind, record_type, row, suffix=""):
    seed = doc_id(row) or title(row, record_type)
    return f"admin-brain:{record_type}:{kind}:{seed}:{suffix}".lower().replace(" ", "-")[:150]


def make(kind, record_type, row, problem, why, checked, suggestion, risk, priority="medium", suffix=""):
    options = ["Approve suggested fix", "Edit details", "Park for later"]
    if kind.startswith("missing"):
        options = ["Fix missing detail", "Send back for edit", "Park until ready"]
    if kind in {"ready_invoice", "invoice_followup", "quote_followup", "reply_needed"}:
        options = ["Approve draft", "Edit wording/details", "Park"]
    c = client(row)
    a = amount(row)
    checked = [text(x) for x in checked if text(x)]
    return {
        "id": action_id(kind, record_type, row, suffix),
        "type": kind.replace("_", " ").title(),
        "kind": kind,
        "action_type": kind,
        "category": "Command",
        "record_type": record_type,
        "record_id": doc_id(row),
        "source_id": doc_id(row),
        "job_id": doc_id(row) if record_type == "job" else text(pick(row, "job_id", "source_job_id", "linked_job_id")),
        "client": c,
        "client_name": c,
        "amount": a,
        "title": problem,
        "record_title": title(row, record_type.title()),
        "summary": problem,
        "problem": problem,
        "why": why,
        "checked": checked,
        "evidence": "; ".join(checked) or "Live Churvox records checked.",
        "suggestion": suggestion,
        "filled": suggestion,
        "prepared": suggestion,
        "risk_if_ignored": risk,
        "risk": risk,
        "check": f"Risk: {risk} Owner options: {', '.join(options)}.",
        "owner": options[0],
        "owner_options": options,
        "recommended_action": options[0],
        "next": suggestion,
        "priority": priority,
        "status": "waiting_owner_review",
        "requires_owner_approval": True,
        "auto_prepared": True,
        "prepared_only": True,
        "auto_sent": False,
        "accounting_synced": False,
        "source": "churvox_admin_brain",
        "admin_brain": True,
        "created_at": now(),
        "updated_at": now(),
        "record": safe(row or {}),
    }


async def invoice_exists(db, user, ObjectId, job_id: str):
    vals = [str(job_id)]
    try:
        vals.append(ObjectId(str(job_id)))
    except Exception:
        pass
    q = {"$and": [scope(user, ObjectId), {"$or": [{"job_id": {"$in": vals}}, {"source_job_id": {"$in": vals}}, {"linked_job_id": {"$in": vals}}, {"job": {"$in": vals}}]}]}
    return bool(await one(db, "invoices", q))


async def scan_jobs(db, user, ObjectId, out):
    for job in await rows(db, "jobs", scope(user, ObjectId), 300):
        name = title(job, "Job")
        missing = []
        if client(job) == "No client": missing.append("client")
        if not address(job): missing.append("site address")
        if not date_val(job): missing.append("scheduled date")
        if not time_val(job): missing.append("start time")
        if not worker(job) or low(worker(job)) in {"unassigned", "none", "no worker"}: missing.append("assigned worker")
        if amount(job) <= 0 and not low(pick(job, "billing", "billing_type", "pricing_type")).startswith("hour"): missing.append("price")
        if missing and not is_done(job):
            out.append(make("missing_info", "job", job, f"{name} is missing {', '.join(missing)}", "The job may reach the run sheet or worker app half finished.", [f"Client: {client(job)}", f"Address: {address(job) or 'missing'}", f"Date/time: {date_val(job) or 'missing'} {time_val(job)}", f"Worker: {worker(job) or 'missing'}", f"Price: {amount(job) or 'missing'}"], "Fix the missing fields before this job moves forward.", "Workers may get unclear work and invoices may be wrong.", "high"))
        proof = low(pick(job, "proof", "proof_status", "photo_status", "evidence"))
        if proof in {"", "missing", "missing_info", "needs_review", "no proof", "none"} and not is_done(job):
            out.append(make("proof_check", "job", job, f"{name} needs proof/admin evidence checked", "Proof protects invoicing, follow-up and customer trust.", ["Proof/photo status", "Job status", "Worker notes", "Invoice readiness"], "Ask for proof or park invoicing until the evidence is clean.", "The business may invoice without proof or miss a customer issue.", "medium", "proof"))
        scheduled = parse_dt(pick(job, "scheduled_start", "start", "scheduled_date", "date"))
        if scheduled and scheduled < now() - timedelta(hours=2) and not is_done(job):
            out.append(make("late_job", "job", job, f"{name} may be late or unfinished", "The scheduled time has passed and the job is not completed.", [f"Scheduled: {scheduled.isoformat()}", f"Status: {status(job) or 'open'}", f"Worker: {worker(job) or 'unassigned'}"], "Check completion, reschedule, or message the customer.", "Late jobs can become missed visits, unhappy customers or messy invoices.", "high", "late"))
        if status(job) in {"complete", "completed", "done", "finished"} and not await invoice_exists(db, user, ObjectId, doc_id(job)):
            if amount(job) > 0:
                out.append(make("ready_invoice", "job", job, f"{name} is complete with no invoice", "Completed work should become a draft invoice while details are fresh.", [f"Client: {client(job)}", f"Job price: ${amount(job):.2f}", "No linked invoice found", "Owner approval still required"], "Prepare a draft invoice for owner review. Do not send or sync until approved.", "Money can be missed or invoiced late.", "high", "invoice"))
            else:
                out.append(make("missing_price", "job", job, f"{name} is complete but has no safe price", "Churvox needs a price before a safe invoice draft.", [f"Client: {client(job)}", "Completed job", "No linked invoice", "Price is missing or zero"], "Add or confirm the price before preparing the invoice draft.", "The invoice could be wrong or the job may never be billed.", "high", "price"))


async def scan_clients(db, user, ObjectId, out):
    for row in await rows(db, "clients", scope(user, ObjectId), 200):
        name = client(row)
        missing = []
        if not text(pick(row, "phone", "mobile")) and not text(pick(row, "email", "client_email")): missing.append("contact")
        if not address(row): missing.append("address")
        if not text(pick(row, "notes", "access_notes", "site_notes")): missing.append("access/site notes")
        if not text(pick(row, "service", "preferred_service")): missing.append("usual service")
        if missing:
            out.append(make("client_memory", "client", row, f"{name} client file is missing {', '.join(missing)}", "Client memory stops retyping and avoids worker confusion.", [f"Contact: {text(pick(row, 'phone', 'mobile')) or text(pick(row, 'email')) or 'missing'}", f"Address: {address(row) or 'missing'}", f"Service: {text(pick(row, 'service', 'preferred_service')) or 'missing'}", f"Notes: {text(pick(row, 'notes', 'access_notes')) or 'missing'}"], "Complete the client file so the next job starts with context.", "Future jobs may start with missing access notes, wrong service, or no way to contact the client.", "medium"))


async def scan_money(db, user, ObjectId, out):
    for inv in await rows(db, "invoices", scope(user, ObjectId), 200):
        s = status(inv)
        if any(w in s for w in ["overdue", "unpaid", "due", "draft", "sent", "open", "pending"]):
            if amount(inv) <= 0:
                out.append(make("invoice_check", "invoice", inv, f"Invoice for {client(inv)} needs amount checked", "A zero or missing amount cannot be trusted.", [f"Status: {s or 'draft'}", "Amount missing or zero", f"Client: {client(inv)}"], "Edit the invoice amount before sending or syncing.", "The business may send a wrong invoice or miss money.", "high"))
            else:
                out.append(make("invoice_followup", "invoice", inv, f"Invoice follow-up needed for {client(inv)}", "Open invoices need a clear owner-approved follow-up.", [f"Status: {s or 'open'}", f"Amount: ${amount(inv):.2f}", f"Due: {date_val(inv) or 'not set'}"], "Prepare a polite payment reminder for owner review.", "Money may sit unpaid without a follow-up.", "high" if "overdue" in s else "medium"))
    for q in await rows(db, "quotes", scope(user, ObjectId), 160):
        s = status(q)
        if s in {"draft", "ready", "sent", "viewed", "waiting", "pending", ""}:
            if amount(q) <= 0 or not text(pick(q, "scope", "description", "line_item")):
                out.append(make("quote_check", "quote", q, f"Quote for {client(q)} needs price or scope check", "A quote without clear price or scope should not go out.", [f"Status: {s or 'draft'}", f"Amount: {amount(q) or 'missing'}", f"Scope: {text(pick(q, 'scope', 'description')) or 'missing'}"], "Add scope and price, then approve the quote draft.", "The customer may receive a vague or wrong quote.", "high"))
            elif s in {"sent", "viewed", "waiting", "pending"}:
                out.append(make("quote_followup", "quote", q, f"Quote follow-up needed for {client(q)}", "A waiting quote should have a clean follow-up before it goes cold.", [f"Status: {s}", f"Amount: ${amount(q):.2f}", f"Client: {client(q)}"], "Prepare a polite follow-up for owner approval.", "The business may lose work because no one followed up.", "medium"))


async def scan_messages(db, user, ObjectId, out):
    for coll in ["messages", "worker_messages", "customer_messages", "worker_field_slips"]:
        for row in await rows(db, coll, scope(user, ObjectId), 120):
            s = status(row)
            if is_done(row) or any(w in s for w in ["read", "replied", "closed", "archived"]):
                continue
            body = text(pick(row, "message", "body", "detail", "text", "summary", "note"))
            priority = "high" if any(w in low(body) for w in ["urgent", "angry", "problem", "issue", "blocked", "complaint", "extra", "more time"]) else "medium"
            kind = "worker_issue" if priority == "high" and coll in {"worker_messages", "worker_field_slips"} else "reply_needed"
            out.append(make(kind, "message", row, f"{title(row, 'Message')} needs reply or owner decision", "Messages should not sit outside the job/client context.", [f"Source: {coll}", f"Client/job: {client(row)}", f"Status: {s or 'unread'}", f"Message: {body[:120] or 'no body'}"], "Draft a reply or turn it into a Command decision linked to the job/client.", "The owner may miss a customer request, worker issue, or quote/invoice follow-up.", priority, coll))


async def scan_workers(db, user, ObjectId, out):
    q = {"$and": [scope(user, ObjectId), {"role": {"$in": ["worker", "staff", "employee", "subcontractor"]}}]}
    for row in await rows(db, "users", q, 160):
        name = title(row, "Worker")
        missing = []
        if not text(pick(row, "email")): missing.append("email/login")
        if not text(pick(row, "phone", "mobile")): missing.append("phone")
        if not text(pick(row, "access", "access_level", "invite_status", "app_status")): missing.append("worker app access")
        if missing:
            out.append(make("worker_setup", "worker", row, f"{name} worker setup is missing {', '.join(missing)}", "Workers need clean access before the field loop works.", [f"Email: {text(pick(row, 'email')) or 'missing'}", f"Phone: {text(pick(row, 'phone', 'mobile')) or 'missing'}", f"Access: {text(pick(row, 'access', 'access_level', 'invite_status', 'app_status')) or 'missing'}"], "Complete worker contact and app access before assigning more work.", "Jobs may be assigned to someone who cannot see or respond in the worker app.", "medium"))


async def scan(db, user, ObjectId):
    out: List[Dict[str, Any]] = []
    errors: List[str] = []
    for name, fn in [("jobs", scan_jobs), ("clients", scan_clients), ("workers", scan_workers), ("money", scan_money), ("messages", scan_messages)]:
        try:
            await fn(db, user, ObjectId, out)
        except Exception as exc:
            errors.append(f"{name}: {str(exc)[:160]}")
    unique = {text(item.get("id")): item for item in out if text(item.get("id"))}
    ordered = sorted(unique.values(), key=lambda item: ({"high": 0, "medium": 1, "low": 2}.get(low(item.get("priority")), 1), text(item.get("title"))))[:250]
    counts: Dict[str, int] = {"total": len(ordered), "high": 0, "medium": 0, "low": 0}
    for item in ordered:
        p = low(item.get("priority")) or "medium"
        counts[p] = counts.get(p, 0) + 1
        rt = text(item.get("record_type") or "record")
        counts[rt] = counts.get(rt, 0) + 1
    return ordered, counts, errors


async def store(db, business_id: str, actions):
    stored = 0
    for item in actions:
        aid = text(item.get("id"))
        if not aid:
            continue
        try:
            existing = await db.ai_approval_actions.find_one({"business_id": business_id, "id": aid})
            if existing and is_done(existing):
                continue
            await db.ai_approval_actions.update_one({"business_id": business_id, "id": aid}, {"$set": safe({**item, "business_id": business_id, "updated_at": now()}), "$setOnInsert": {"created_at": now()}}, upsert=True)
            stored += 1
        except Exception:
            pass
    return stored


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [r for r in app.router.routes if not route_matches(r, path, method)]
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
    if not app or db is None or get_current_user is None or ObjectId is None or Request is None:
        return

    async def endpoint(request: Request):
        user = await get_current_user(request)
        business = bid(user)
        actions, counts, errors = await scan(db, user, ObjectId)
        stored = await store(db, business, actions)
        return safe({"success": True, "source": "churvox_admin_brain", "message": "Admin Brain scan complete. Churvox found owner-review admin decisions only.", "business_id": business, "counts": counts, "action_count": len(actions), "stored_count": stored, "errors": errors, "actions": actions, "items": actions, "data": {"actions": actions, "items": actions, "counts": counts}, "updated_at": now()})

    for method, path in [
        ("GET", "/api/admin-brain/scan"), ("POST", "/api/admin-brain/scan"),
        ("GET", "/api/ai/actions"), ("GET", "/api/ai-operator/actions"), ("GET", "/api/ai-operator/command-snapshot"),
        ("GET", "/api/ai/operator/slips"), ("GET", "/api/command/readiness"),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])
    INSTALLED.add(name)
