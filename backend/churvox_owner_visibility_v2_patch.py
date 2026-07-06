from datetime import datetime, timezone
import sys

from fastapi import Request

INSTALLED = set()
COLLECTIONS = {"jobs": "jobs", "clients": "clients", "quotes": "quotes", "invoices": "invoices"}


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
        clean = {}
        for key, item in value.items():
            if key in {"password", "password_hash", "hashed_password", "token", "access_token", "refresh_token"}:
                continue
            clean["id" if key == "_id" else key] = safe(item)
        return clean
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


def first(row, *keys, fallback=""):
    for key in keys:
        value = (row or {}).get(key)
        if text(value):
            return text(value)
    return fallback


def number(row, *keys):
    for key in keys:
        try:
            value = (row or {}).get(key)
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


def area_of(value):
    raw = lower(value)
    for area in ["naenae", "lower hutt", "upper hutt", "wainuiomata", "avalon", "belmont", "petone", "porirua", "wellington", "auckland", "christchurch"]:
        if area in raw:
            return area.title()
    return text(value).split(",")[0] or "same area"


def job_record(row, index=0):
    return {
        "id": first(row, "id", "_id", "job_id"),
        "title": first(row, "title", "job_title", "job_name", "name", "description", fallback=f"Job {index + 1}"),
        "client": first(row, "client_name", "customer_name", "client", fallback="No client"),
        "address": first(row, "address", "site_address", "job_address"),
        "service": first(row, "service", "service_type", "job_type", fallback="Other"),
        "worker": first(row, "assigned_worker_name", "worker_name", "worker", "assigned_to", fallback="Unassigned"),
        "date": first(row, "scheduled_date", "date", "start_date"),
        "time": first(row, "scheduled_time", "start_time", "time"),
        "status": first(row, "status", "job_status", fallback="assigned"),
        "price": number(row, "price", "amount", "total"),
        "recurring": first(row, "recurring", "frequency", "repeat", "recurrence_pattern", fallback="One-off"),
        "issue": first(row, "issue", "problem", "needs_attention"),
    }


def worker_record(row, index=0):
    return {
        "id": first(row, "id", "_id", "user_id", "worker_id"),
        "name": first(row, "name", "full_name", "display_name", "email", fallback=f"Worker {index + 1}"),
        "role": first(row, "role", "worker_role", fallback="Worker"),
        "status": first(row, "status", "clock_status", fallback="Available"),
        "job": first(row, "current_job", "job_title"),
        "gps": first(row, "gps", "location", "area", "service_region"),
        "skills": first(row, "skills", "skill_tags", "trade", "industry", "service_skills", "service", "notes"),
        "areas": first(row, "service_areas", "service_area", "areas", "area", "region"),
        "equipment": first(row, "equipment", "tools", "gear", "vehicle"),
        "availability": first(row, "normal_availability", "availability", "work_days", "usual_hours"),
        "capacity": first(row, "max_jobs_per_day", "max_jobs", "daily_capacity"),
        "notes": first(row, "smart_profile_notes", "notes"),
    }


def worker_score(worker, job):
    hay = lower(" ".join([worker.get("name", ""), worker.get("role", ""), worker.get("status", ""), worker.get("job", ""), worker.get("gps", ""), worker.get("skills", ""), worker.get("areas", ""), worker.get("equipment", ""), worker.get("availability", ""), worker.get("notes", "")]))
    service = lower(job.get("service"))
    area = lower(area_of(job.get("address")))
    score = 40
    if not any(word in lower(worker.get("status")) for word in ["busy", "progress", "on job", "clocked"]):
        score += 20
    if service and service in hay:
        score += 20
    if area and area in hay:
        score += 16
    if not text(worker.get("job")) or "available" in lower(worker.get("job")) or "no job" in lower(worker.get("job")):
        score += 12
    if any(word in lower(worker.get("role")) for word in ["worker", "subcontractor", "staff", "field"]):
        score += 8
    if service and service in lower(worker.get("equipment")):
        score += 6
    if text(worker.get("capacity")):
        score += 4
    return score


def smart_slip(kind, title, summary, recommendation, details, payload=None):
    return {
        "id": f"smart-{kind.lower().replace(' ', '-')}",
        "type": kind,
        "kind": "smart_action",
        "action_type": kind,
        "title": title,
        "summary": summary,
        "status": "waiting_owner_review",
        "owner": "Review in Command",
        "filled": summary,
        "evidence": "Prepared from live jobs, clients, workers, messages, quotes or invoices.",
        "check": recommendation,
        "details": details,
        "payload": payload or {},
        "requires_owner_approval": True,
        "auto_sent": False,
        "accounting_synced": False,
        "created_at": datetime.now(timezone.utc),
    }


def build_smart_actions(jobs_raw, workers_raw, clients, quotes, invoices, messages_rows):
    jobs = [job_record(row, index) for index, row in enumerate(jobs_raw or [])]
    workers = [worker_record(row, index) for index, row in enumerate(workers_raw or [])]
    client = (clients or [{}])[0] if clients else {}
    fallback_job = {"id": "", "title": "New job", "client": first(client, "name", "client_name", fallback="the client"), "address": first(client, "address", "site_address"), "service": first(client, "service", "preferred_service", fallback="service"), "worker": "Unassigned", "price": 0, "status": "assigned", "recurring": "One-off"}
    unassigned = next((job for job in jobs if lower(job.get("worker")) in {"unassigned", "no worker", "none"} or "unassigned" in lower(job.get("worker"))), None)
    unscheduled = next((job for job in jobs if not job.get("date") or not job.get("time")), None)
    recurring = [job for job in jobs if "one-off" not in lower(job.get("recurring")) and "oneoff" not in lower(job.get("recurring"))]
    completed = next((job for job in jobs if any(word in lower(job.get("status")) for word in ["complete", "done"])), None)
    issue_job = next((job for job in jobs if job.get("issue") or any(word in lower(job.get("status")) for word in ["needs", "blocked", "issue", "check"])), None)
    missing_job = next((job for job in jobs if not job.get("address") or not job.get("price") or "unassigned" in lower(job.get("worker")) or job.get("client") == "No client"), None)
    target_job = unassigned or jobs[0] if jobs else fallback_job
    if not target_job:
        target_job = fallback_job
    if workers:
        best_worker = sorted(workers, key=lambda worker: worker_score(worker, target_job), reverse=True)[0]
    else:
        best_worker = {"id": "", "name": "the best available worker", "status": "Available", "role": "Worker", "gps": area_of(target_job.get("address")), "skills": target_job.get("service")}
    tomorrow = datetime.now(timezone.utc).date().isoformat()
    slot_job = unscheduled or target_job
    quote_amount = max(float(target_job.get("price") or 0), number(client, "price", "saved_price"), 145)
    invoice_job = completed or target_job
    total_draft = sum(number(row, "amount", "total", "price") for row in (invoices or []) if "paid" not in lower(row.get("status")))
    first_message = (messages_rows or [{}])[0]
    actions = [
        smart_slip("Smart Assign", f"Best worker found for {target_job.get('title')}", f"{best_worker.get('name')} is the best fit for {target_job.get('service')} near {area_of(target_job.get('address'))}.", f"Send {target_job.get('title')} to Command for owner approval before assigning it to {best_worker.get('name')}.", [f"Area: {area_of(target_job.get('address'))}", f"Worker status: {best_worker.get('status')}", f"Skill/service: {target_job.get('service')}", "Owner approval stays in Command."], {"job_id": target_job.get("id"), "assigned_worker_name": best_worker.get("name"), "assigned_worker_id": best_worker.get("id"), "status": "assigned"}),
        smart_slip("Smart Schedule", f"Best time ready for {slot_job.get('title')}", f"{slot_job.get('date') or tomorrow} at {slot_job.get('time') or '09:30'} keeps the job moving without crowding the run sheet.", "Send this schedule to Command for owner review.", [f"Suggested date: {slot_job.get('date') or tomorrow}", f"Suggested time: {slot_job.get('time') or '09:30'}", f"Worker: {best_worker.get('name')}", "No automatic booking without approval."], {"job_id": slot_job.get("id"), "scheduled_date": slot_job.get("date") or tomorrow, "scheduled_time": slot_job.get("time") or "09:30"}),
        smart_slip("Smart Run Builder", f"{area_of(target_job.get('address'))} run ready to review", f"Churvox can group {max(len(recurring), 1)} recurring or nearby job{'s' if max(len(recurring), 1) != 1 else ''} into a cleaner run.", "Review the run plan in Command before jobs are sent.", [f"Run area: {area_of(target_job.get('address'))}", f"Recurring jobs found: {len(recurring)}", f"Lead worker: {best_worker.get('name')}", "Owner approves before jobs are sent."]),
        smart_slip("Smart Quote Builder", f"Quote prepared for {target_job.get('client') or first(client, 'name', fallback='the client')}", f"{money(quote_amount)} prepared from job type, site notes and similar work.", "Review the price in Command before creating or sending anything.", [f"Client: {target_job.get('client')}", f"Service: {target_job.get('service')}", f"Prepared amount: {money(quote_amount)}", "Nothing is sent until owner approval."]),
        smart_slip("Smart Invoice Builder", f"Invoice draft ready for {invoice_job.get('client')}", f"{money(invoice_job.get('price') or quote_amount)} prepared from job price, notes and proof.", "Review the invoice draft before sending or syncing.", [f"Job: {invoice_job.get('title')}", f"Client: {invoice_job.get('client')}", f"Amount: {money(invoice_job.get('price') or quote_amount)}", "Draft sync only; no automatic send."]),
        smart_slip("Smart Client Memory", f"Client memory ready for {first(client, 'name', 'client_name', fallback='the client')}", "Churvox can save access notes, preferred timing, pricing and reminders on the client file.", "Save the memory after owner review so future jobs, quotes and invoices are faster.", [f"Client: {first(client, 'name', 'client_name', fallback='the client')}", f"Address: {first(client, 'address', 'site_address', fallback='missing')}", f"Current notes: {first(client, 'notes', 'access_notes', fallback='none yet')}", "Useful for repeat work and proof."]),
        smart_slip("Smart Missing Info", f"{missing_job.get('title') if missing_job else 'Records'} need missing info fixed", "Missing job details were checked across address, price, worker and client fields." if missing_job else "No major missing job info found right now.", "Send missing info to Command before the job moves forward.", ["Address, price, worker and client checks", "Stops half-filled jobs reaching workers", "Owner can fix now or park", "Keeps forms clean."]),
        smart_slip("Smart Follow-up", "Follow-up prepared", "A polite customer follow-up can be prepared from the current record.", "Approve the follow-up before anything is sent.", ["Polite wording", "Linked to client/job", "Owner-approved before sending", "Good for quotes and overdue invoices."]),
        smart_slip("Smart Problem Slip", "Problem slip ready", f"{issue_job.get('title')}: {issue_job.get('issue') or issue_job.get('status')}" if issue_job else f"{first(first_message, 'subject', 'title', fallback='Worker update')} can become a clear owner decision.", "Turn the update into a Command slip with options.", ["Worker/customer issue", "Job and client context", "Suggested next move", "Approve, edit or park in Command."]),
        smart_slip("Smart Day Close", "Today's admin is ready to close", f"{len(jobs)} jobs, {len(invoices or [])} invoices, {len(messages_rows or [])} messages and {money(total_draft)} in draft invoice value checked.", "Review the admin pile, then park anything not ready.", [f"Jobs checked: {len(jobs)}", f"Invoices checked: {len(invoices or [])}", f"Messages checked: {len(messages_rows or [])}", f"Draft value: {money(total_draft)}"]),
    ]
    return actions


def install(module):
    name = getattr(module, "__name__", "")
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    def make_list(kind):
        async def endpoint(request: Request):
            user = await get_current_user(request)
            rows = []
            try:
                cursor = getattr(db, COLLECTIONS[kind]).find(scope(user, ObjectId)).sort("created_at", -1).limit(500)
                async for row in cursor:
                    rows.append(safe(row))
            except Exception as exc:
                print(f"Churvox owner visibility list skipped {kind}: {exc}", file=sys.stderr)
            return {"success": True, kind: rows, "items": rows, "data": rows}
        return endpoint

    async def team(request: Request):
        user = await get_current_user(request)
        rows = []
        try:
            query = {"$and": [scope(user, ObjectId), {"role": {"$in": ["worker", "staff", "employee", "subcontractor", "contractor", "payroll"]}}]}
            cursor = db.users.find(query).sort("created_at", -1).limit(500)
            async for row in cursor:
                rows.append(safe(row))
        except Exception as exc:
            print(f"Churvox owner visibility team skipped: {exc}", file=sys.stderr)
        return {"success": True, "workers": rows, "team": rows, "items": rows, "data": rows}

    async def messages(request: Request):
        user = await get_current_user(request)
        rows = []
        for collection in ["notifications", "approved_notifications", "worker_messages", "worker_field_slips"]:
            try:
                cursor = getattr(db, collection).find(scope(user, ObjectId)).sort("created_at", -1).limit(120)
                async for row in cursor:
                    rows.append(safe(row))
            except Exception:
                pass
        rows = sorted(rows, key=lambda row: text(row.get("created_at")), reverse=True)[:200]
        return {"success": True, "messages": rows, "items": rows, "data": rows}

    async def rows(collection, query, limit=80):
        out = []
        try:
            cursor = getattr(db, collection).find(query).sort("created_at", -1).limit(limit)
            async for row in cursor:
                out.append(safe(row))
        except Exception as exc:
            print(f"Churvox Smart Actions read skipped {collection}: {exc}", file=sys.stderr)
        return out

    async def command_actions(request: Request):
        user = await get_current_user(request)
        base = scope(user, ObjectId)
        messages_data = await messages(request)
        message_rows = messages_data.get("items", [])[:80]
        try:
            jobs = await rows("jobs", base, 80)
            clients = await rows("clients", base, 60)
            quotes = await rows("quotes", base, 60)
            invoices = await rows("invoices", base, 60)
            workers = await rows("users", {"$and": [base, {"role": {"$in": ["worker", "staff", "employee", "subcontractor", "contractor", "payroll"]}}]}, 80)
            actions = build_smart_actions(jobs, workers, clients, quotes, invoices, message_rows)
        except Exception as exc:
            print(f"Churvox Smart Actions build skipped: {exc}", file=sys.stderr)
            actions = []
        for row in message_rows[:40]:
            title = row.get("title") or row.get("summary") or row.get("message") or "Owner check"
            actions.append({"id": row.get("id") or title, "type": row.get("type") or row.get("kind") or "Owner check", "title": title, "summary": row.get("summary") or row.get("message") or "Review this update.", "status": row.get("status") or "waiting", "record": row})
        actions = actions[:80]
        return {"success": True, "actions": actions, "items": actions, "data": actions}

    for kind in COLLECTIONS:
        remove_route(app, f"/api/{kind}", "GET")
        app.add_api_route(f"/api/{kind}", make_list(kind), methods=["GET"])
    for path in ["/api/team", "/api/team/workers", "/api/workers"]:
        remove_route(app, path, "GET")
        app.add_api_route(path, team, methods=["GET"])
    remove_route(app, "/api/messages", "GET")
    app.add_api_route("/api/messages", messages, methods=["GET"])
    for path in ["/api/ai/actions", "/api/command/actions", "/api/command/approvals"]:
        remove_route(app, path, "GET")
        app.add_api_route(path, command_actions, methods=["GET"])
    INSTALLED.add(name)
