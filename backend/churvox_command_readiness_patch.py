from __future__ import annotations

from datetime import datetime, timezone, timedelta
import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_field_truth_patch as field_truth

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


def scoped_query(user, ObjectId, extra=None):
    return field_truth.scoped_query(user, ObjectId, extra)


def id_of(doc):
    if not isinstance(doc, dict):
        return ""
    return clean(doc.get("_id") or doc.get("id") or doc.get("job_id") or doc.get("uuid"))


def title_of(job):
    return clean(job.get("title") or job.get("job_name") or job.get("job_title") or job.get("service_type") or job.get("job_type") or "Job")


def client_of(record):
    return clean(record.get("client_name") or record.get("customer_name") or record.get("client") or record.get("customer") or record.get("name") or "No customer")


def address_of(record):
    return clean(record.get("address") or record.get("site_address") or record.get("service_address") or record.get("job_address"))


def status_of(record):
    return lower(record.get("status") or record.get("job_status") or record.get("workflow_status") or record.get("review_status"))


def is_complete(job):
    status = status_of(job)
    return status in {"complete", "completed", "done", "finished"} or bool(job.get("completed") or job.get("completed_at"))


def amount_of(record):
    for key in ["amount", "total", "total_amount", "subtotal", "price", "quote_total", "invoice_total", "estimated_total", "fixed_price"]:
        try:
            value = float(record.get(key) or 0)
            if value:
                return value
        except Exception:
            pass
    return 0.0


def parse_dt(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            try:
                return datetime.fromisoformat(value[:10]).replace(tzinfo=timezone.utc)
            except Exception:
                return None
    return None


def scheduled_date(job):
    value = job.get("scheduled_date") or job.get("date") or job.get("start_date") or job.get("start") or job.get("scheduled_start")
    if isinstance(value, datetime):
        return value.date().isoformat()
    return clean(value)[:10]


def scheduled_time(job):
    return clean(job.get("scheduled_time") or job.get("time") or job.get("start_time"))


def estimate_minutes(job):
    for key in ["estimated_minutes", "duration_minutes", "estimate_minutes", "planned_minutes"]:
        try:
            value = int(float(job.get(key) or 0))
            if value:
                return value
        except Exception:
            pass
    for key in ["estimated_hours", "duration_hours", "estimate_hours", "planned_hours"]:
        try:
            value = float(job.get(key) or 0)
            if value:
                return int(value * 60)
        except Exception:
            pass
    start = parse_dt(job.get("scheduled_start") or job.get("start"))
    end = parse_dt(job.get("scheduled_end") or job.get("end"))
    if start and end and end > start:
        return int((end - start).total_seconds() / 60)
    return 60


def actual_minutes(job):
    for key in ["actual_minutes", "worked_minutes", "time_minutes", "timer_minutes", "total_minutes"]:
        try:
            value = int(float(job.get(key) or 0))
            if value:
                return value
        except Exception:
            pass
    for key in ["actual_hours", "worked_hours", "hours", "total_hours"]:
        try:
            value = float(job.get(key) or 0)
            if value:
                return int(value * 60)
        except Exception:
            pass
    start = parse_dt(job.get("started_at") or job.get("clock_in_at"))
    end = parse_dt(job.get("completed_at") or job.get("finished_at") or job.get("clock_out_at"))
    if start:
        if not end and status_of(job) in {"in_progress", "in progress", "started"}:
            end = now_utc()
        if end and end > start:
            return int((end - start).total_seconds() / 60)
    return 0


def material_cost(job):
    for key in ["material_cost", "materials_cost", "cost_of_materials", "extras_cost"]:
        try:
            value = float(job.get(key) or 0)
            if value:
                return value
        except Exception:
            pass
    return 0.0


def labour_rate(owner=None):
    for key in ["labour_rate", "labor_rate", "default_hourly_rate", "worker_cost_rate"]:
        try:
            value = float((owner or {}).get(key) or 0)
            if value:
                return value
        except Exception:
            pass
    return 45.0


async def to_list(cursor, limit):
    try:
        return await cursor.to_list(length=limit)
    except TypeError:
        return await cursor.to_list(limit)
    except Exception:
        return []


async def safe_recent(collection, query, limit=60, sort_field="updated_at"):
    try:
        return await to_list(collection.find(query).sort(sort_field, -1).limit(limit), limit)
    except Exception:
        try:
            return await to_list(collection.find(query).limit(limit), limit)
        except Exception:
            return []


async def safe_one(collection, query):
    try:
        return await collection.find_one(query)
    except Exception:
        return None


async def safe_count(collection, query):
    try:
        return int(await collection.count_documents(query))
    except Exception:
        return 0


async def owner_doc(db, user, ObjectId):
    email = lower(user.get("email"))
    if email:
        doc = await safe_one(db.users, {"email": email})
        if doc:
            return doc
    bid = business_id(user)
    if bid:
        doc = await safe_one(db.users, {"business_id": bid, "role": {"$in": ["owner", "admin"]}})
        if doc:
            return doc
    return dict(user or {})


async def invoices_for_job(db, user, ObjectId, job_id):
    vals = field_truth.values_from_raw(job_id, ObjectId)
    vals_str = [str(v) for v in vals]
    query = {"$and": [
        scoped_query(user, ObjectId),
        {"$or": [
            {"job_id": {"$in": vals + vals_str}},
            {"source_job_id": {"$in": vals + vals_str}},
            {"job": {"$in": vals + vals_str}},
        ]},
    ]}
    return await safe_recent(db.invoices, query, 20, "updated_at")


async def field_slips_for_job(db, user, job_id):
    rows = await safe_recent(db.worker_field_slips, {"business_id": business_id(user), "job_id": str(job_id)}, 30, "updated_at")
    open_rows = [row for row in rows if lower(row.get("status") or "waiting_owner_review") in {"waiting_owner_review", "needs_owner_edit", "parked", "open", "pending"}]
    return rows, open_rows


def readiness_item(job, category, title, summary, priority="medium", details=None):
    jid = id_of(job)
    return {
        "id": f"readiness:{jid}:{category}".replace(" ", "-").lower(),
        "source": "command-readiness-engine",
        "category": category,
        "action": title,
        "title": title,
        "summary": summary,
        "found": f"{title_of(job)} — {client_of(job)}",
        "prepared": "Churvox checked job proof, schedule, price, time, extras and admin readiness. Owner approval stays required.",
        "why": "This answers worker/owner frustration by catching issues before invoicing, messaging, payroll or accounting sync.",
        "priority": priority,
        "source_id": jid,
        "job_id": jid,
        "requires_owner_approval": True,
        "created_at": now_utc().isoformat(),
        "details": json_safe({"job": job, **(details or {})}),
        "real_review_layer": True,
        "readiness_engine": True,
    }


async def build_job_readiness(db, user, ObjectId, job, owner=None):
    jid = id_of(job)
    owner = owner or {}
    passport = await field_truth.get_passport(db, user, ObjectId, jid) if jid else {"readiness": {}}
    readiness = passport.get("readiness") or {}
    invoices = await invoices_for_job(db, user, ObjectId, jid) if jid else []
    all_slips, open_slips = await field_slips_for_job(db, user, jid) if jid else ([], [])

    missing = []
    states = []
    command_items = []

    if not client_of(job) or client_of(job).lower() == "no customer":
        missing.append("customer")
    if not address_of(job):
        missing.append("address")
    if not scheduled_date(job):
        missing.append("date")
    if not scheduled_time(job):
        missing.append("time")
    if not clean(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_to") or job.get("worker_name") or job.get("assigned_worker_name")):
        missing.append("assigned worker")
    if amount_of(job) <= 0 and not lower(job.get("pricing_type") or job.get("billing_type")).startswith("hour"):
        missing.append("price")

    proof_missing = readiness.get("missing") or []
    if proof_missing:
        states.append("missing_proof")
        command_items.append(readiness_item(job, "Missing proof", "Missing proof before billing", f"{title_of(job)} is missing {len(proof_missing)} proof check(s): {', '.join(proof_missing)}.", "high", {"missing_proof": proof_missing, "passport": passport}))

    if missing:
        states.append("missing_job_info")
        command_items.append(readiness_item(job, "Missing info", "Missing job info", f"{title_of(job)} is missing: {', '.join(missing)}.", "high", {"missing_fields": missing}))

    issue_slips = [row for row in open_slips if lower(row.get("type")) in {"issue", "blocked", "problem", "more_time"}]
    request_slips = [row for row in open_slips if lower(row.get("type")) in {"customer_request", "request"}]
    extra_slips = [row for row in open_slips if lower(row.get("type")) in {"extra", "material", "materials"}]

    if issue_slips:
        states.append("worker_issue")
        command_items.append(readiness_item(job, "Worker issue", "Worker issue needs owner decision", f"{len(issue_slips)} worker issue/time request(s) are waiting for Command.", "high", {"slips": issue_slips}))
    if request_slips:
        states.append("ready_for_quote")
        command_items.append(readiness_item(job, "Quote", "Prepare quote draft from customer request", f"A customer request from the worker can become a quote draft.", "medium", {"slips": request_slips}))
    if extra_slips:
        states.append("needs_price_decision")
        command_items.append(readiness_item(job, "Price decision", "Extra/material needs price decision", "Worker recorded an extra/material. Owner should approve price before invoice.", "high", {"slips": extra_slips}))

    estimate = max(1, estimate_minutes(job))
    actual = actual_minutes(job)
    if actual and actual > estimate * 1.15:
        states.append("running_over_time")
        command_items.append(readiness_item(job, "Time warning", "Job is running over time", f"Actual time is about {actual} min vs estimated {estimate} min.", "high", {"estimated_minutes": estimate, "actual_minutes": actual}))

    scheduled = parse_dt(job.get("scheduled_start") or job.get("start") or job.get("scheduled_date") or job.get("date"))
    if scheduled and scheduled < now_utc() - timedelta(hours=2) and not is_complete(job):
        states.append("schedule_warning")
        command_items.append(readiness_item(job, "Schedule warning", "Job may be late or unfinished", "Scheduled time has passed and the job is not completed.", "medium", {"scheduled": scheduled}))

    quoted = amount_of(job)
    cost = (actual / 60.0) * labour_rate(owner) + material_cost(job)
    margin = quoted - cost if quoted else 0
    margin_pct = (margin / quoted * 100) if quoted else 0
    if quoted and actual and margin_pct < 25:
        states.append("margin_warning")
        command_items.append(readiness_item(job, "Margin warning", "Job profit looks tight", f"Estimated margin is about {margin_pct:.0f}% after labour/materials.", "high", {"quoted": quoted, "cost": cost, "margin": margin, "margin_pct": margin_pct}))

    has_invoice = bool(invoices)
    if is_complete(job) and not has_invoice and not proof_missing and not open_slips and not missing:
        states.append("ready_to_invoice")
        command_items.append(readiness_item(job, "Invoice", "Ready to prepare invoice draft", f"{title_of(job)} has proof and no invoice yet.", "high", {"passport": passport}))
    elif has_invoice:
        states.append("has_invoice")

    if not states:
        states.append("watching")

    confidence = 100
    confidence -= len(proof_missing) * 10
    confidence -= len(missing) * 8
    confidence -= len(open_slips) * 12
    if "running_over_time" in states:
        confidence -= 15
    if "margin_warning" in states:
        confidence -= 15
    confidence = max(0, min(100, confidence))

    return {
        "job_id": jid,
        "title": title_of(job),
        "client": client_of(job),
        "address": address_of(job),
        "status": status_of(job),
        "states": states,
        "confidence": confidence,
        "ready_to_invoice": "ready_to_invoice" in states,
        "ready_for_quote": "ready_for_quote" in states,
        "needs_owner_review": bool(open_slips or missing or proof_missing or "running_over_time" in states or "margin_warning" in states),
        "missing": missing,
        "proof_missing": proof_missing,
        "invoice_count": len(invoices),
        "open_slips_count": len(open_slips),
        "estimated_minutes": estimate,
        "actual_minutes": actual,
        "quoted": quoted,
        "estimated_cost": round(cost, 2),
        "estimated_margin": round(margin, 2),
        "estimated_margin_pct": round(margin_pct, 1) if quoted else None,
        "passport": json_safe(passport),
        "open_slips": json_safe(open_slips),
        "command_items": command_items,
    }


async def job_by_id(db, user, ObjectId, job_id):
    return await safe_one(db.jobs, field_truth.job_lookup_query(user, ObjectId, job_id))


async def all_readiness(db, user, ObjectId, limit=80):
    owner = await owner_doc(db, user, ObjectId)
    jobs = await safe_recent(db.jobs, scoped_query(user, ObjectId), limit, "updated_at")
    rows = []
    items = []
    for job in jobs:
        row = await build_job_readiness(db, user, ObjectId, job, owner)
        rows.append(row)
        items.extend(row.get("command_items") or [])
    counts = {}
    for row in rows:
        for state in row.get("states") or []:
            counts[state] = counts.get(state, 0) + 1
    return {"success": True, "jobs": rows, "items": items[:80], "actions": items[:80], "counts": counts, "data": {"jobs": rows, "items": items[:80], "counts": counts}}


async def insert_command_decision(db, user, action_id, decision, payload=None):
    doc = {
        "business_id": business_id(user),
        "user_id": user_id(user),
        "email": clean(user.get("email")),
        "action_id": action_id,
        "decision": decision,
        "status": decision,
        "payload": payload or {},
        "source": "command-readiness-engine",
        "note": "Prepared only. Owner approval required. No automatic send, tax filing, payout file, or accounting sync.",
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        await db.command_decisions.insert_one(dict(doc))
    except Exception:
        pass
    return doc


async def prepare_invoice_draft(db, user, ObjectId, job_id, payload=None):
    job = await job_by_id(db, user, ObjectId, job_id)
    if not job:
        return {"success": False, "error": "job_not_found"}
    readiness = await build_job_readiness(db, user, ObjectId, job, await owner_doc(db, user, ObjectId))
    total = amount_of(job)
    extras = [slip for slip in readiness.get("open_slips") or [] if lower(slip.get("type")) in {"extra", "material", "materials"}]
    line_items = [{"description": title_of(job), "quantity": 1, "amount": total, "source": "job"}]
    for slip in extras:
        line_items.append({"description": clean(slip.get("text") or slip.get("summary") or "Worker extra"), "quantity": 1, "amount": 0, "source": "worker_extra", "needs_price": True})
    doc = {
        "business_id": business_id(user),
        "job_id": str(job_id),
        "client_name": client_of(job),
        "customer_name": client_of(job),
        "status": "draft",
        "review_status": "waiting_owner_review",
        "source": "command_readiness_engine",
        "prepared_only": True,
        "auto_sent": False,
        "accounting_synced": False,
        "line_items": line_items,
        "total": total,
        "proof_summary": readiness.get("passport", {}).get("readiness", {}),
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        result = await db.invoices.insert_one(dict(doc))
        doc["_id"] = result.inserted_id
    except Exception:
        pass
    await insert_command_decision(db, user, f"prepare-invoice:{job_id}", "draft_prepared", {"invoice": json_safe(doc), "readiness": readiness})
    return {"success": True, "invoice": json_safe(doc), "readiness": readiness, "message": "Invoice draft prepared for owner review. Nothing was sent."}


async def prepare_quote_draft(db, user, ObjectId, job_id, payload=None):
    job = await job_by_id(db, user, ObjectId, job_id)
    if not job:
        return {"success": False, "error": "job_not_found"}
    readiness = await build_job_readiness(db, user, ObjectId, job, await owner_doc(db, user, ObjectId))
    request_slips = [slip for slip in readiness.get("open_slips") or [] if lower(slip.get("type")) in {"customer_request", "request", "extra", "material", "materials"}]
    doc = {
        "business_id": business_id(user),
        "source_job_id": str(job_id),
        "client_name": client_of(job),
        "customer_name": client_of(job),
        "status": "draft",
        "review_status": "waiting_owner_review",
        "source": "command_readiness_engine",
        "prepared_only": True,
        "auto_sent": False,
        "line_items": [{"description": clean(slip.get("text") or slip.get("summary") or "Customer request"), "quantity": 1, "amount": 0, "needs_price": True} for slip in request_slips] or [{"description": f"Follow-up work for {title_of(job)}", "quantity": 1, "amount": 0, "needs_price": True}],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        result = await db.quotes.insert_one(dict(doc))
        doc["_id"] = result.inserted_id
    except Exception:
        pass
    await insert_command_decision(db, user, f"prepare-quote:{job_id}", "draft_prepared", {"quote": json_safe(doc), "readiness": readiness})
    return {"success": True, "quote": json_safe(doc), "readiness": readiness, "message": "Quote draft prepared for owner review. Nothing was sent."}


async def prepare_message_draft(db, user, ObjectId, job_id, payload=None):
    job = await job_by_id(db, user, ObjectId, job_id)
    if not job:
        return {"success": False, "error": "job_not_found"}
    kind = lower((payload or {}).get("kind") or "follow_up")
    body = clean((payload or {}).get("body")) or f"Hi {client_of(job)}, just a quick update on {title_of(job)}. The owner will review and confirm the next step."
    doc = {
        "business_id": business_id(user),
        "job_id": str(job_id),
        "client_name": client_of(job),
        "type": kind,
        "status": "draft",
        "review_status": "waiting_owner_review",
        "body": body,
        "source": "command_readiness_engine",
        "prepared_only": True,
        "auto_sent": False,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        result = await db.customer_message_drafts.insert_one(dict(doc))
        doc["_id"] = result.inserted_id
    except Exception:
        pass
    await insert_command_decision(db, user, f"prepare-message:{job_id}:{kind}", "draft_prepared", {"message": json_safe(doc)})
    return {"success": True, "message_draft": json_safe(doc), "message": "Customer message draft prepared for owner review. Nothing was sent."}


async def worker_more_time(db, user, ObjectId, job_id, payload=None):
    minutes = int(float((payload or {}).get("minutes") or 30))
    reason = clean((payload or {}).get("reason") or "Worker needs more time on site.")
    slip = await field_truth.create_field_slip(db, user, ObjectId, job_id, {"type": "more_time", "text": f"Needs about {minutes} more minutes. {reason}"})
    return {"success": True, "slip": json_safe(slip), "message": "Time request sent to Command for owner decision."}


async def gps_status(db, user, ObjectId, payload=None):
    state = lower((payload or {}).get("state") or (payload or {}).get("status") or "status")
    doc = {
        "business_id": business_id(user),
        "worker_id": user_id(user),
        "state": state,
        "job_id": clean((payload or {}).get("job_id") or ""),
        "rule": "GPS is job proof only while clocked into work. After-hours tracking is disabled.",
        "after_hours_tracking": False,
        "updated_at": now_utc(),
    }
    if state in {"start", "started", "on", "active"}:
        doc["state"] = "active_on_job"
    elif state in {"stop", "stopped", "off", "inactive"}:
        doc["state"] = "off"
    try:
        await db.worker_gps_status.update_one({"business_id": doc["business_id"], "worker_id": doc["worker_id"]}, {"$set": doc, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
    except Exception:
        pass
    return {"success": True, "gps": json_safe(doc)}


def setup_checklist_payload(user):
    return {
        "success": True,
        "title": "Churvox setup checklist",
        "items": [
            {"key": "business_profile", "label": "Business profile and logo", "why": "Invoices, quotes and messages look professional."},
            {"key": "clients", "label": "Add/import clients", "why": "Stops double-entry and messy customer names."},
            {"key": "workers", "label": "Invite workers", "why": "Workers only see their field flow."},
            {"key": "job_defaults", "label": "Set job defaults", "why": "Proof, price, time and worker assignment are checked every time."},
            {"key": "proof_rules", "label": "Proof rules", "why": "Before/after photos, notes and extras decide invoice readiness."},
            {"key": "gps_rules", "label": "Fair GPS rules", "why": "GPS is job proof only while clocked in, not after-hours tracking."},
            {"key": "accounting", "label": "Accounting sync", "why": "Draft sync only. Owner approval required."},
            {"key": "help", "label": "Help and support", "why": "Workers and owners know what to do next."},
        ],
        "data": {"owner_email": clean(user.get("email"))},
    }


def tier_explain_payload(user):
    return {
        "success": True,
        "plans": [
            {"plan": "Start", "price": "$39/month + GST", "best_for": "Solo operator", "why_locked": "Simple jobs, clients, proof and invoices without crew scale."},
            {"plan": "Crew", "price": "$89/month + GST", "best_for": "Small team", "why_locked": "Adds workers and more job capacity."},
            {"plan": "Operator", "price": "$149/month + GST", "best_for": "Busy trade business", "why_locked": "More Command/admin actions and proof automation."},
            {"plan": "Command", "price": "$299/month + GST", "best_for": "Larger operation", "why_locked": "Command approval desk, scale, and one accounting sync option included."},
        ],
        "addons": [
            {"name": "Accounting Sync Add-on", "price": "$39/month + GST", "why": "Xero or MYOB draft sync where available. No auto-send, tax filing or payout files."},
            {"name": "Command Growth Pack", "price": "$99/month + GST", "why": "Adds 50 active team members and more Command capacity."},
        ],
    }


async def enhanced_command_snapshot(db, user, ObjectId):
    try:
        snapshot = await field_truth.enhanced_snapshot(db, user, ObjectId)
    except Exception:
        snapshot = {"success": True, "actions": [], "items": [], "command_items": [], "counts": {}, "briefing": {}}
    readiness = await all_readiness(db, user, ObjectId, 80)
    existing = snapshot.get("actions") or snapshot.get("items") or []
    by_id = {}
    for item in (readiness.get("items") or []) + existing:
        by_id[clean(item.get("id") or item.get("title"))] = item
    combined = list(by_id.values())[:100]
    counts = dict(snapshot.get("counts") or {})
    counts.update({f"readiness_{k}": v for k, v in (readiness.get("counts") or {}).items()})
    counts["total"] = len(combined)
    briefing = dict(snapshot.get("briefing") or {})
    briefing["summary"] = f"Churvox found {len(readiness.get('items') or [])} job readiness item(s) plus {max(0, len(combined) - len(readiness.get('items') or []))} other Command item(s)."
    snapshot.update({"success": True, "actions": combined, "items": combined, "command_items": combined, "job_readiness": readiness.get("jobs") or [], "counts": counts, "briefing": briefing})
    snapshot["data"] = dict(snapshot)
    return json_safe(snapshot)


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


async def read_payload(request):
    try:
        return await request.json()
    except Exception:
        return {}


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

    async def readiness_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await all_readiness(db, user, ObjectId, 100))

    async def job_readiness_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        job = await job_by_id(db, user, ObjectId, job_id)
        if not job:
            return {"success": False, "error": "job_not_found"}
        return json_safe({"success": True, "readiness": await build_job_readiness(db, user, ObjectId, job, await owner_doc(db, user, ObjectId))})

    async def prepare_invoice_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        return json_safe(await prepare_invoice_draft(db, user, ObjectId, job_id, await read_payload(request)))

    async def prepare_quote_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        return json_safe(await prepare_quote_draft(db, user, ObjectId, job_id, await read_payload(request)))

    async def prepare_message_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        return json_safe(await prepare_message_draft(db, user, ObjectId, job_id, await read_payload(request)))

    async def more_time_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        return json_safe(await worker_more_time(db, user, ObjectId, job_id, await read_payload(request)))

    async def gps_get_endpoint(request: Request):
        user = await get_current_user(request)
        doc = await safe_one(db.worker_gps_status, {"business_id": business_id(user), "worker_id": user_id(user)})
        if not doc:
            doc = {"state": "off", "rule": "GPS is job proof only while clocked into work. After-hours tracking is disabled.", "after_hours_tracking": False}
        return json_safe({"success": True, "gps": doc})

    async def gps_post_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await gps_status(db, user, ObjectId, await read_payload(request)))

    async def checklist_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(setup_checklist_payload(user))

    async def tier_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(tier_explain_payload(user))

    async def command_snapshot_endpoint(request: Request):
        user = await get_current_user(request)
        return await enhanced_command_snapshot(db, user, ObjectId)

    async def actions_endpoint(request: Request):
        user = await get_current_user(request)
        snapshot = await enhanced_command_snapshot(db, user, ObjectId)
        actions = snapshot.get("actions") or []
        return json_safe({"success": True, "actions": actions, "items": actions, "data": actions})

    routes = [
        ("GET", "/api/command/readiness", readiness_endpoint),
        ("GET", "/api/jobs/{job_id}/readiness", job_readiness_endpoint),
        ("POST", "/api/jobs/{job_id}/prepare-invoice-draft", prepare_invoice_endpoint),
        ("POST", "/api/jobs/{job_id}/prepare-quote-draft", prepare_quote_endpoint),
        ("POST", "/api/jobs/{job_id}/prepare-message-draft", prepare_message_endpoint),
        ("POST", "/api/worker/jobs/{job_id}/more-time", more_time_endpoint),
        ("GET", "/api/worker/gps/status", gps_get_endpoint),
        ("POST", "/api/worker/gps/status", gps_post_endpoint),
        ("GET", "/api/help/setup-checklist", checklist_endpoint),
        ("GET", "/api/plans/tier-explain", tier_endpoint),
        ("GET", "/api/ai-operator/command-snapshot", command_snapshot_endpoint),
        ("GET", "/api/ai-operator/actions", actions_endpoint),
        ("GET", "/api/ai/actions", actions_endpoint),
        ("GET", "/api/ai/operator/slips", actions_endpoint),
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
