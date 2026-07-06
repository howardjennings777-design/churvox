from datetime import datetime, timezone
import sys

from fastapi import Request

INSTALLED = set()


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
    raw = (row or {}).get("id") or (row or {}).get("_id") or (row or {}).get("job_id") or (row or {}).get("user_id") or ""
    if isinstance(raw, dict):
        return text(raw.get("$oid") or raw.get("id") or raw.get("_id"))
    return text(raw)


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
        app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
    except Exception:
        pass


def area_of(value):
    raw = lower(value)
    for area in ["naenae", "lower hutt", "upper hutt", "wainuiomata", "avalon", "belmont", "petone", "porirua", "wellington", "auckland", "christchurch"]:
        if area in raw:
            return area.title()
    return text(value).split(",")[0] or "same area"


def job_view(row, index=0):
    return {
        "id": id_value(row),
        "title": first(row, "title", "job_title", "job_name", "name", "description", fallback=f"Job {index + 1}"),
        "client": first(row, "client_name", "customer_name", "client", fallback="No client"),
        "address": first(row, "address", "site_address", "job_address"),
        "service": first(row, "service", "service_type", "job_type", fallback="Other"),
        "worker": first(row, "assigned_worker_name", "worker_name", "worker", "assigned_to", fallback="Unassigned"),
        "date": first(row, "scheduled_date", "date", "start_date"),
        "time": first(row, "scheduled_time", "start_time", "time"),
        "status": first(row, "status", "job_status", fallback="assigned"),
        "price": amount(row, "price", "amount", "total", "job_price", "quote_total"),
        "proof": first(row, "proof", "proof_status", "photo_status", "proof_photo_count", "photo_count", "proof_required", "photo_required"),
        "invoice": first(row, "invoice_status", "invoice", "invoice_number", "accounting_status", "xero_status"),
        "issue": first(row, "issue", "problem", "needs_attention"),
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


def ledger_checks(job):
    proof = lower(job.get("proof"))
    invoice = lower(job.get("invoice"))
    return [
        ("Client", job.get("client") and job.get("client") != "No client"),
        ("Address", bool(job.get("address"))),
        ("Worker", bool(job.get("worker")) and "unassigned" not in lower(job.get("worker"))),
        ("Date", bool(job.get("date"))),
        ("Time", bool(job.get("time"))),
        ("Price", float(job.get("price") or 0) > 0),
        ("Proof", bool(proof) and not any(word in proof for word in ["no", "missing", "required"])),
        ("Invoice", bool(invoice) and not any(word in invoice for word in ["no", "missing", "not"])),
    ]


def lane_for(kind, job=None):
    raw = lower(kind)
    if "problem" in raw or "issue" in raw:
        return "Worker problems"
    if "missing" in raw:
        return "Missing info"
    if "invoice" in raw or "paid" in raw or "money" in raw:
        return "Money waiting"
    if "day close" in raw:
        return "Day close"
    if job:
        checks = ledger_checks(job)
        if any(not ok for _, ok in checks):
            return "Missing info"
        if "complete" in lower(job.get("status")):
            return "Money waiting"
    return "Ready to approve"


def command_slip(kind, title, summary, recommendation, details=None, payload=None, lane=None, job=None):
    lane = lane or lane_for(kind, job)
    checks = ledger_checks(job) if job else []
    score = sum(1 for _, ok in checks if ok)
    total = len(checks)
    ledger_label = f"Ledger {score}/{total}" if total else "Ledger ready"
    return {
        "id": f"ledger-{lane.lower().replace(' ', '-')}-{kind.lower().replace(' ', '-')}-{text((payload or {}).get('job_id') or title).lower().replace(' ', '-')[:40]}",
        "type": f"{lane} · {kind}",
        "kind": "admin_ledger",
        "action_type": kind,
        "lane": lane,
        "title": f"{ledger_label} · {title}",
        "summary": summary,
        "status": lane,
        "owner": "Review in Command",
        "filled": summary,
        "evidence": "; ".join([f"{label}: {'ok' if ok else 'missing'}" for label, ok in checks]) if checks else "Prepared from live records.",
        "check": recommendation,
        "details": details or [],
        "payload": payload or {},
        "requires_owner_approval": True,
        "auto_sent": False,
        "accounting_synced": False,
        "created_at": datetime.now(timezone.utc),
    }


def worker_score(worker, job):
    hay = lower(" ".join([worker.get("name", ""), worker.get("role", ""), worker.get("status", ""), worker.get("job", ""), worker.get("gps", ""), worker.get("skills", ""), worker.get("areas", ""), worker.get("equipment", ""), worker.get("availability", "")]))
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


def build_actions(jobs_raw, workers_raw, clients, quotes, invoices, messages):
    jobs = [job_view(row, index) for index, row in enumerate(jobs_raw or [])]
    workers = [worker_view(row, index) for index, row in enumerate(workers_raw or [])]
    actions = []
    for job in jobs[:8]:
        checks = ledger_checks(job)
        missing = [label for label, ok in checks if not ok]
        if missing:
            actions.append(command_slip("Job Ledger", job.get("title"), f"Missing: {', '.join(missing)}.", "Fix or park the job before it moves forward.", [f"Client: {job.get('client')}", f"Worker: {job.get('worker')}", f"Status: {job.get('status')}", f"Missing: {', '.join(missing)}"], {"job_id": job.get("id")}, lane="Missing info", job=job))
        elif "complete" in lower(job.get("status")):
            actions.append(command_slip("Invoice Check", job.get("title"), f"{job.get('title')} looks ready for invoice review.", "Review proof and invoice before anything is sent or synced.", [f"Client: {job.get('client')}", f"Amount: {money(job.get('price'))}", "Draft sync only", "Owner approval required"], {"job_id": job.get("id")}, lane="Money waiting", job=job))
    target = next((job for job in jobs if "unassigned" in lower(job.get("worker"))), None) or (jobs[0] if jobs else None)
    if target and workers:
        worker = sorted(workers, key=lambda item: worker_score(item, target), reverse=True)[0]
        actions.append(command_slip("Smart Assign", target.get("title"), f"{worker.get('name')} is the best fit for {target.get('service')} near {area_of(target.get('address'))}.", "Approve before assigning the job.", [f"Area: {area_of(target.get('address'))}", f"Worker status: {worker.get('status')}", f"Service: {target.get('service')}", "Owner approval stays in Command"], {"job_id": target.get("id"), "assigned_worker_name": worker.get("name"), "assigned_worker_id": worker.get("id")}, lane="Ready to approve", job=target))
    unscheduled = next((job for job in jobs if not job.get("date") or not job.get("time")), None)
    if unscheduled:
        actions.append(command_slip("Smart Schedule", unscheduled.get("title"), "Date or time is missing, so Churvox prepared a clean schedule check.", "Review the time before sending anything to the worker.", ["Suggested time: 09:30", f"Client: {unscheduled.get('client')}", f"Area: {area_of(unscheduled.get('address'))}"], {"job_id": unscheduled.get("id"), "scheduled_time": "09:30"}, lane="Ready to approve", job=unscheduled))
    problem_rows = [row for row in messages if "problem" in lower(row.get("type") or row.get("kind")) or "issue" in lower(row.get("type") or row.get("kind"))]
    for row in problem_rows[:6]:
        title = first(row, "summary", "title", "message", "note", fallback="Worker problem")
        actions.append(command_slip("Worker Problem", title, first(row, "text", "note", "message", "summary", fallback="Worker sent a problem for owner review."), "Decide the next move, then approve, edit or park.", [first(row, "client_name", "client", fallback="Client unknown"), first(row, "job_title", "job", fallback="Job unknown"), first(row, "problem_label", "type", "kind", fallback="Worker problem")], {"source_id": id_value(row), "job_id": first(row, "job_id")}, lane="Worker problems"))
    draft_total = sum(amount(row, "amount", "total", "price") for row in invoices if "paid" not in lower(row.get("status")))
    actions.append(command_slip("Day Close", "Today admin close", f"{len(jobs)} jobs, {len(invoices)} invoices, {len(messages)} messages and {money(draft_total)} in draft value checked.", "Review the admin pile and park anything not ready.", [f"Jobs checked: {len(jobs)}", f"Invoices checked: {len(invoices)}", f"Messages checked: {len(messages)}", f"Draft value: {money(draft_total)}"], lane="Day close"))
    seen = set()
    unique = []
    for action in actions:
        key = action.get("id")
        if key in seen:
            continue
        seen.add(key)
        unique.append(action)
    lane_order = {"Worker problems": 0, "Missing info": 1, "Money waiting": 2, "Ready to approve": 3, "Day close": 4}
    return sorted(unique, key=lambda item: lane_order.get(item.get("lane"), 9))[:80]


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

    async def read_rows(collection, query, limit=100):
        out = []
        try:
            cursor = getattr(db, collection).find(query).sort("created_at", -1).limit(limit)
            async for row in cursor:
                out.append(safe(row))
        except Exception as exc:
            print(f"Churvox admin ledger read skipped {collection}: {exc}", file=sys.stderr)
        return out

    async def command_actions(request: Request):
        user = await get_current_user(request)
        base = scope(user, ObjectId)
        jobs = await read_rows("jobs", base, 120)
        clients = await read_rows("clients", base, 80)
        quotes = await read_rows("quotes", base, 80)
        invoices = await read_rows("invoices", base, 80)
        messages = []
        for collection in ["notifications", "approved_notifications", "worker_messages", "worker_field_slips"]:
            messages.extend(await read_rows(collection, base, 80))
        workers = await read_rows("users", {"$and": [base, {"role": {"$in": ["worker", "staff", "employee", "subcontractor", "contractor", "payroll"]}}]}, 120)
        actions = build_actions(jobs, workers, clients, quotes, invoices, messages)
        return {"success": True, "actions": actions, "items": actions, "data": actions, "lanes": ["Worker problems", "Missing info", "Money waiting", "Ready to approve", "Day close"]}

    for path in ["/api/ai/actions", "/api/command/actions", "/api/command/approvals"]:
        remove_route(app, path, "GET")
        app.add_api_route(path, command_actions, methods=["GET"])
    INSTALLED.add(name)
