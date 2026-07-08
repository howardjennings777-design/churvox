from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def now():
    return datetime.now(timezone.utc)


def text(value):
    return str(value or "").strip()


def low(value):
    return text(value).lower()


def key(value):
    return "".join(ch for ch in low(value) if ch.isalnum())


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
        return {("id" if k == "_id" else k): safe(v) for k, v in value.items() if k not in {"password", "password_hash", "hashed_password", "token", "access_token", "refresh_token"}}
    return value


def user_id(user):
    return text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("user_id"))


def business_id(user):
    return text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or user_id(user))


def scope(user, ObjectId):
    values = {user_id(user), business_id(user)}
    values = {v for v in values if v}
    final_values = list(values)
    for value in list(values):
        try:
            final_values.append(ObjectId(value))
        except Exception:
            pass
    email = low((user or {}).get("email"))
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
        ors.extend([{"owner_email": email}, {"created_by_email": email}, {"business_email": email}, {"email": email}])
    return {"$or": ors}


def remove_route(app, path, method):
    try:
        app.router.routes = [r for r in app.router.routes if not (getattr(r, "path", "") == path and method.upper() in set(getattr(r, "methods", set()) or set()))]
    except Exception:
        pass


def first(row, *names, fallback=""):
    for name in names:
        value = (row or {}).get(name)
        if text(value):
            return text(value)
    return fallback


def number(row, *names):
    for name in names:
        try:
            value = (row or {}).get(name)
            if value not in (None, ""):
                return float(value)
        except Exception:
            pass
    return 0


def money(value):
    try:
        return "${:,.0f}".format(float(value or 0))
    except Exception:
        return "$0"


def clean_id(row):
    raw = (row or {}).get("id") or (row or {}).get("_id") or (row or {}).get("job_id") or ""
    if isinstance(raw, dict):
        raw = raw.get("$oid") or raw.get("id") or raw.get("_id") or ""
    return text(raw)


def area_of(value):
    raw = low(value)
    for area in ["naenae", "lower hutt", "upper hutt", "wainuiomata", "avalon", "belmont", "petone", "porirua", "wellington", "auckland", "christchurch"]:
        if area in raw:
            return area.title()
    return text(value).split(",")[0] or "the same area"


def status_of(row):
    return key(first(row, "status", "job_status", "workflow_status", "state", "priority", "app_status"))


def message_text(row):
    return first(row, "message", "body", "detail", "text", "summary", "subject", "title")


def is_real_message(row, collection=""):
    body = message_text(row)
    if not body:
        return False
    kind = key(first(row, "kind", "type", "event_type", "channel", "source", "category"))
    if collection == "worker_messages":
        return True
    if collection == "messages":
        return True
    if any(word in kind for word in ["workermessage", "customermessage", "clientmessage", "reply", "chat", "sms", "email"]):
        return True
    return False


def message_record(row, collection=""):
    direction = first(row, "direction")
    from_label = first(row, "from", "sender", "worker_name", "source", fallback="Worker" if direction == "worker_to_office" else "Office")
    return safe({
        **row,
        "id": clean_id(row) or f"message-{hash(message_text(row))}",
        "type": "message",
        "kind": first(row, "kind", "type", fallback="message"),
        "from": from_label,
        "subject": first(row, "subject", "title", fallback="Worker message" if "worker" in low(from_label) else "Message"),
        "detail": message_text(row),
        "message": message_text(row),
        "draft": first(row, "draft", "drafted_reply", "reply"),
        "client_name": first(row, "client_name", "client"),
        "job_title": first(row, "job_title", "job"),
        "priority": first(row, "priority", fallback="Normal"),
        "channel": first(row, "channel", fallback="Worker app" if collection == "worker_messages" else "Internal"),
        "read": bool(row.get("read") is True or row.get("is_read") is True),
        "created_at": safe(row.get("created_at") or row.get("updated_at") or now()),
    })


def job_record(row, index=0):
    return {
        "id": clean_id(row),
        "title": first(row, "title", "job_title", "job_name", "name", "description", fallback=f"Job {index + 1}"),
        "client": first(row, "client_name", "customer_name", "client", fallback="No client"),
        "address": first(row, "address", "site_address", "job_address"),
        "service": first(row, "service", "service_type", "job_type", fallback="Other"),
        "worker": first(row, "assigned_worker_name", "worker_name", "worker", "assigned_to", fallback="Unassigned"),
        "date": first(row, "scheduled_date", "date", "start_date"),
        "time": first(row, "scheduled_time", "start_time", "time"),
        "status": first(row, "status", "job_status", fallback="assigned"),
        "price": number(row, "price", "amount", "total", "invoice_total"),
        "issue": first(row, "issue", "problem", "needs_attention", "worker_notes"),
        "proof": first(row, "proof", "photo_status"),
        "recurring": first(row, "recurring", "frequency", "repeat", "recurrence_pattern", fallback="One-off"),
    }


def worker_record(row, index=0):
    return {
        "id": clean_id(row) or first(row, "user_id", "worker_id"),
        "name": first(row, "name", "full_name", "display_name", "email", fallback=f"Worker {index + 1}"),
        "email": first(row, "email"),
        "role": first(row, "role", "worker_role", fallback="Worker"),
        "status": first(row, "status", "clock_status", "app_status", fallback="Available"),
        "job": first(row, "current_job", "job_title"),
        "gps": first(row, "gps", "location", "area", "service_region"),
        "skills": first(row, "skills", "skill_tags", "trade", "industry", "service_skills", "service", "notes"),
        "areas": first(row, "service_areas", "service_area", "areas", "area", "region"),
    }


def worker_score(worker, job):
    hay = low(" ".join([worker.get("name", ""), worker.get("role", ""), worker.get("status", ""), worker.get("job", ""), worker.get("gps", ""), worker.get("skills", ""), worker.get("areas", "")]))
    service = low(job.get("service"))
    area = low(area_of(job.get("address")))
    score = 0
    if not any(word in low(worker.get("status")) for word in ["busy", "progress", "onjob", "clocked"]):
        score += 30
    if service and service in hay:
        score += 25
    if area and area in hay:
        score += 20
    if not text(worker.get("job")) or "available" in low(worker.get("job")) or "no job" in low(worker.get("job")):
        score += 15
    if any(word in low(worker.get("role")) for word in ["worker", "subcontractor", "staff", "field"]):
        score += 10
    return score


def smart_slip(kind, title, summary, check, details, payload=None, tone="Owner decision"):
    return {
        "id": f"smart-{key(kind)}-{abs(hash(title)) % 100000}",
        "type": kind,
        "kind": "smart_action",
        "action_type": kind,
        "approval_type": kind,
        "title": title,
        "summary": summary,
        "status": "waiting_owner_review",
        "owner": tone,
        "filled": summary,
        "evidence": "\n".join([text(item) for item in details if text(item)]) or "Live records checked.",
        "check": check,
        "details": details,
        "payload": payload or {},
        "requires_owner_approval": True,
        "auto_sent": False,
        "accounting_synced": False,
        "created_at": now(),
    }


def build_smarter_actions(jobs_raw, workers_raw, clients_raw, quotes_raw, invoices_raw, messages_raw, slips_raw):
    jobs = [job_record(row, index) for index, row in enumerate(jobs_raw or [])]
    workers = [worker_record(row, index) for index, row in enumerate(workers_raw or [])]
    actions = []

    # Worker slips become real Command decisions first.
    for row in (slips_raw or [])[:40]:
        kind = first(row, "kind", "type", fallback="worker_update")
        title = first(row, "summary", "message", "title", fallback="Worker update")
        job = first(row, "job_title", fallback="Linked job")
        worker = first(row, "worker_name", fallback="Worker")
        actions.append(smart_slip(
            "Worker Update",
            f"{worker}: {job}",
            title,
            "Review the worker update, then reply, approve, or park it. Nothing is sent automatically.",
            [f"Worker: {worker}", f"Job: {job}", f"Update type: {kind}", f"Message: {title}"],
            {"job_id": first(row, "job_id"), "worker_id": first(row, "worker_id"), "source_slip_id": clean_id(row)},
            tone="Review worker update",
        ))

    unassigned = [job for job in jobs if low(job.get("worker")) in {"unassigned", "no worker", "none"} or "unassigned" in low(job.get("worker"))]
    if unassigned and workers:
        job = unassigned[0]
        ranked = sorted(workers, key=lambda worker: worker_score(worker, job), reverse=True)
        worker = ranked[0]
        actions.append(smart_slip(
            "Assign Worker",
            f"Assign {worker.get('name')} to {job.get('title')}",
            f"{job.get('title')} is still unassigned. {worker.get('name')} looks like the cleanest option based on availability, service fit and area.",
            "Approve to assign this worker, edit the worker if needed, or park if you want to decide later.",
            [f"Job: {job.get('title')}", f"Client: {job.get('client')}", f"Area: {area_of(job.get('address'))}", f"Service: {job.get('service')}", f"Worker status: {worker.get('status')}", f"Fit score: {worker_score(worker, job)}"],
            {"job_id": job.get("id"), "assigned_worker_name": worker.get("name"), "assigned_worker_id": worker.get("id"), "status": "assigned"},
            tone="Assign after approval",
        ))

    unscheduled = next((job for job in jobs if not job.get("date") or not job.get("time")), None)
    if unscheduled:
        actions.append(smart_slip(
            "Schedule Check",
            f"Schedule needed for {unscheduled.get('title')}",
            f"{unscheduled.get('title')} is missing a date or time, so the run sheet can’t be trusted yet.",
            "Add the missing schedule details before the worker sees this job.",
            [f"Job: {unscheduled.get('title')}", f"Client: {unscheduled.get('client')}", f"Date: {unscheduled.get('date') or 'missing'}", f"Time: {unscheduled.get('time') or 'missing'}"],
            {"job_id": unscheduled.get("id")},
            tone="Fix before field",
        ))

    issue_job = next((job for job in jobs if job.get("issue") or any(word in low(job.get("status")) for word in ["needs", "blocked", "issue", "check"])), None)
    if issue_job:
        actions.append(smart_slip(
            "Job Needs Check",
            f"Check {issue_job.get('title')}",
            issue_job.get("issue") or f"Status is {issue_job.get('status')}. Owner should review before this keeps moving.",
            "Review the job issue and decide whether to message the worker, edit the job, or park it.",
            [f"Job: {issue_job.get('title')}", f"Client: {issue_job.get('client')}", f"Status: {issue_job.get('status')}", f"Issue: {issue_job.get('issue') or 'Needs owner check'}"],
            {"job_id": issue_job.get("id")},
            tone="Owner check",
        ))

    completed = next((job for job in jobs if any(word in low(job.get("status")) for word in ["complete", "done", "finished"])), None)
    if completed:
        amount = completed.get("price") or 0
        actions.append(smart_slip(
            "Invoice Review",
            f"Review invoice for {completed.get('title')}",
            f"{completed.get('title')} is complete. Churvox found {money(amount)} as the job amount, ready for owner review before invoice work moves on.",
            "Check proof, amount and client details before creating, sending, or syncing any invoice.",
            [f"Job: {completed.get('title')}", f"Client: {completed.get('client')}", f"Amount: {money(amount)}", "No invoice is sent automatically."],
            {"job_id": completed.get("id"), "amount": amount},
            tone="Review money",
        ))

    # Real messages can become reply decisions, but don't turn system notifications into messages.
    for row in (messages_raw or [])[:15]:
        body = message_text(row)
        if not body:
            continue
        from_label = first(row, "from", "sender", "worker_name", fallback="Message")
        actions.append(smart_slip(
            "Reply Check",
            first(row, "subject", "title", fallback=f"Reply to {from_label}"),
            body,
            "Write or approve a reply only if the owner wants to respond. Otherwise park it.",
            [f"From: {from_label}", f"Client: {first(row, 'client_name', 'client', fallback='not linked')}", f"Job: {first(row, 'job_title', 'job', fallback='not linked')}"],
            {"message_id": clean_id(row)},
            tone="Reply or park",
        ))

    return actions[:60]


async def read_rows(db, collection, query, limit=100):
    out = []
    try:
        cursor = getattr(db, collection).find(query).sort("created_at", -1).limit(limit)
        async for row in cursor:
            out.append(safe(row))
    except Exception as exc:
        print(f"Churvox smarter owner read skipped {collection}: {exc}", file=sys.stderr)
    return out


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

    async def owner_messages(request):
        user = await get_current_user(request)
        base = scope(user, ObjectId)
        rows = []
        for collection in ["worker_messages", "messages", "customer_messages", "client_messages"]:
            for row in await read_rows(db, collection, base, 120):
                if is_real_message(row, collection):
                    rows.append(message_record(row, collection))
        seen = set()
        deduped = []
        for row in sorted(rows, key=lambda item: text(item.get("created_at")), reverse=True):
            sig = (text(row.get("id")) or text(row.get("message")), text(row.get("created_at")))
            if sig in seen:
                continue
            seen.add(sig)
            deduped.append(row)
        return {"success": True, "messages": deduped[:120], "items": deduped[:120], "data": deduped[:120]}

    async def command_actions(request):
        user = await get_current_user(request)
        base = scope(user, ObjectId)
        jobs = await read_rows(db, "jobs", base, 120)
        clients = await read_rows(db, "clients", base, 60)
        quotes = await read_rows(db, "quotes", base, 60)
        invoices = await read_rows(db, "invoices", base, 60)
        workers = await read_rows(db, "users", {"$and": [base, {"role": {"$in": ["worker", "staff", "employee", "subcontractor", "contractor", "payroll"]}}]}, 80)
        messages_payload = await owner_messages(request)
        messages = messages_payload.get("items", [])
        slips = await read_rows(db, "worker_field_slips", {"$and": [base, {"status": {"$in": ["waiting_owner", "waiting_owner_review", "pending", "new"]}}]}, 80)
        persisted = await read_rows(db, "ai_approval_actions", {"$and": [base, {"status": {"$nin": ["approved", "declined", "done", "complete", "completed", "parked"]}}]}, 80)
        actions = []
        for row in persisted:
            actions.append(safe(row))
        actions.extend(build_smarter_actions(jobs, workers, clients, quotes, invoices, messages, slips))
        seen = set()
        clean_actions = []
        for action in actions:
            sig = text(action.get("id")) or f"{text(action.get('type'))}-{text(action.get('title'))}-{text(action.get('summary'))}"
            if sig in seen:
                continue
            seen.add(sig)
            clean_actions.append(action)
        return {"success": True, "actions": clean_actions[:80], "items": clean_actions[:80], "data": clean_actions[:80]}

    remove_route(app, "/api/messages", "GET")
    app.add_api_route("/api/messages", owner_messages, methods=["GET"])
    for path in ["/api/ai/actions", "/api/command/actions", "/api/command/approvals"]:
        remove_route(app, path, "GET")
        app.add_api_route(path, command_actions, methods=["GET"])
    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original
    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None
    def exec_module(self, module):
        self.original.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())
for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
