from __future__ import annotations

from datetime import datetime, timezone, timedelta
import hashlib
import importlib

from starlette.requests import Request as StarletteRequest


VERSION = "churvox-job-completion-final-20260720a"
OWNER_ROLES = {"employer", "admin", "owner", "business_owner", "manager", "office_admin", "platform_owner"}
WORKER_ROLES = {"worker", "staff", "employee", "subcontractor", "contractor", "technician", "field_worker"}
TRANSIENT_RECURRING_FIELDS = {
    "_id",
    "completed_at",
    "started_at",
    "acknowledged_at",
    "paid_at",
    "timer_started_at",
    "current_timer_started_at",
    "completion_state",
    "completion_processing_started_at",
    "completion_processing_completed_at",
    "completion_error",
    "completion_warnings",
    "next_generated_job_id",
    "invoice_id",
    "invoice_status",
    "invoice_ready",
    "invoice_generated_at",
    "job_done_closeout_id",
    "completion_photos",
    "completion_checklist",
    "worker_messages",
    "owner_visible_messages",
    "worker_message",
    "last_worker_message",
    "worker_message_preview",
    "worker_message_at",
    "last_worker_message_at",
    "worker_message_unread",
    "owner_unread_worker_message",
    "worker_needs_owner_attention",
    "extras",
    "extras_total",
    "materials",
}


def text(value, limit=500):
    return " ".join(str(value or "").strip().split())[:limit]


def lower(value):
    return text(value).lower()


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        output = {}
        for key, item in value.items():
            output["id" if key == "_id" else key] = safe(item)
        return output
    return value


def object_id(ObjectId, value):
    try:
        return value if value.__class__.__name__ == "ObjectId" else ObjectId(str(value))
    except Exception:
        return None


def deterministic_id(ObjectId, scope, *parts):
    digest = hashlib.sha256(":".join([scope, *[text(part, 240) for part in parts]]).encode("utf-8")).hexdigest()[:24]
    return ObjectId(digest)


def business_id(user):
    return text(
        (user or {}).get("business_id")
        or (user or {}).get("businessId")
        or (user or {}).get("owner_business_id")
        or (user or {}).get("id")
        or (user or {}).get("_id")
    )


def ownership_clause(ObjectId, business):
    values = [{"business_id": business}, {"contractor_id": business}]
    business_oid = object_id(ObjectId, business)
    if business_oid:
        values.extend([{"business_id": business_oid}, {"contractor_id": business_oid}])
    return {"$or": values}


def id_clause(ObjectId, job_id):
    values = [{"id": text(job_id, 160)}]
    job_oid = object_id(ObjectId, job_id)
    if job_oid:
        values.insert(0, {"_id": job_oid})
    return {"$or": values}


def assigned_clause(ObjectId, user):
    raw = text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("worker_id"), 160)
    values = [
        {"assigned_worker_id": raw},
        {"worker_id": raw},
        {"assigned_to": raw},
    ]
    worker_oid = object_id(ObjectId, raw)
    if worker_oid:
        values.extend([
            {"assigned_worker_id": worker_oid},
            {"worker_id": worker_oid},
            {"assigned_to": worker_oid},
        ])
    return {"$or": values}


def job_query(ObjectId, job_id, business, user, require_worker=False):
    role = lower((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type"))
    clauses = [id_clause(ObjectId, job_id), ownership_clause(ObjectId, business)]
    if require_worker or role in WORKER_ROLES:
        clauses.append(assigned_clause(ObjectId, user))
    return {"$and": clauses}


def remove_route(app, path, method="POST"):
    method = method.upper()
    app.router.routes = [
        route
        for route in app.router.routes
        if not (
            getattr(route, "path", "") == path
            and method in set(getattr(route, "methods", set()) or set())
        )
    ]


def promote_route(app, path, method="POST"):
    method = method.upper()
    selected = [
        route
        for route in app.router.routes
        if getattr(route, "path", "") == path
        and method in set(getattr(route, "methods", set()) or set())
    ]
    if selected:
        app.router.routes = selected + [route for route in app.router.routes if route not in selected]


def parse_datetime(module, value):
    parser = getattr(module, "_safe_parse_datetime", None)
    if callable(parser):
        parsed = parser(value)
        if parsed:
            return parsed
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


def elapsed_seconds(module, job, now):
    base = int((job or {}).get("total_time_seconds") or (job or {}).get("time_seconds") or (job or {}).get("time_spent_seconds") or 0)
    if not (job or {}).get("timer_running"):
        return max(0, base)
    calculator = getattr(module, "compute_elapsed", None)
    if callable(calculator):
        try:
            final_entry = {"action": "pause", "timestamp": now}
            return max(0, int(calculator(list((job or {}).get("time_entries") or []) + [final_entry])))
        except Exception:
            pass
    started = parse_datetime(module, (job or {}).get("timer_started_at") or (job or {}).get("current_timer_started_at") or (job or {}).get("started_at"))
    if not started:
        return max(0, base)
    return max(0, base + int(max(0, (now - started).total_seconds())))


def recurring_frequency(job):
    value = lower((job or {}).get("recurring_frequency") or (job or {}).get("recurrence_pattern") or (job or {}).get("repeat_type"))
    if "fortnight" in value:
        return "fortnightly"
    if "month" in value:
        return "monthly"
    if "custom" in value:
        return "custom"
    if "week" in value:
        return "weekly"
    return ""


async def existing_next_job(db, ObjectId, job, business, next_date=None):
    linked = object_id(ObjectId, (job or {}).get("next_generated_job_id"))
    if linked:
        found = await db.jobs.find_one({"_id": linked})
        if found:
            return found

    source_id = text((job or {}).get("_id") or (job or {}).get("id"), 160)
    parent_id = (job or {}).get("recurring_series_id") or (job or {}).get("recurring_parent_job_id") or source_id
    identity = [
        {"source_job_id": source_id},
        {"parent_recurring_job_id": (job or {}).get("_id")},
    ]
    if next_date:
        identity.extend([
            {"recurring_parent_job_id": parent_id, "scheduled_date": next_date},
            {"recurring_series_id": parent_id, "scheduled_date": next_date},
        ])
    return await db.jobs.find_one({
        "$and": [
            ownership_clause(ObjectId, business),
            {"$or": identity},
            {"is_archived": {"$ne": True}},
        ]
    })


async def ensure_next_recurring(module, db, ObjectId, job, business, now):
    frequency = recurring_frequency(job)
    if not (job or {}).get("is_recurring") or not frequency:
        return None

    calculator = getattr(module, "calculate_next_recurring_date", None)
    if not callable(calculator):
        raise RuntimeError("Recurring date calculator is unavailable")

    custom_days = (job or {}).get("custom_repeat_days")
    next_date = parse_datetime(module, (job or {}).get("next_recurring_due_date") or (job or {}).get("next_recurring_date"))
    if not next_date:
        source_date = (job or {}).get("scheduled_date") or (job or {}).get("scheduled_start") or (job or {}).get("date") or (job or {}).get("created_at") or now
        next_date = calculator(source_date, frequency, custom_days)

    existing = await existing_next_job(db, ObjectId, job, business, next_date)
    if existing:
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": {
            "next_generated_job_id": existing["_id"],
            "next_recurring_due_date": next_date,
            "recurring_generation_state": "complete",
            "updated_at": now,
        }})
        return existing

    source_id = text((job or {}).get("_id") or (job or {}).get("id"), 160)
    series_id = (job or {}).get("recurring_series_id") or (job or {}).get("recurring_parent_job_id") or source_id
    next_id = deterministic_id(ObjectId, "recurring-job", business, source_id, next_date.isoformat())
    new_job = {key: value for key, value in dict(job or {}).items() if key not in TRANSIENT_RECURRING_FIELDS}
    new_job.update({
        "_id": next_id,
        "business_id": business,
        "status": "assigned",
        "job_status": "Assigned",
        "workflow_status": "assigned",
        "completed": False,
        "completed_at": None,
        "time_entries": [],
        "total_time_seconds": 0,
        "time_seconds": 0,
        "time_spent_seconds": 0,
        "timer_running": False,
        "timer_status": "stopped",
        "scheduled_date": next_date,
        "next_recurring_due_date": calculator(next_date, frequency, custom_days),
        "recurring_frequency": frequency,
        "recurring_series_id": series_id,
        "recurring_parent_job_id": series_id,
        "parent_recurring_job_id": job["_id"],
        "source_job_id": source_id,
        "created_at": now,
        "updated_at": now,
    })

    try:
        await db.jobs.insert_one(new_job)
        created = new_job
    except Exception:
        created = await db.jobs.find_one({"_id": next_id})
        if not created:
            created = await existing_next_job(db, ObjectId, job, business, next_date)
        if not created:
            raise

    await db.jobs.update_one({"_id": job["_id"]}, {"$set": {
        "next_generated_job_id": created["_id"],
        "next_recurring_due_date": next_date,
        "recurring_generation_state": "complete",
        "recurring_generation_completed_at": now,
        "updated_at": now,
    }})
    return created


async def ensure_invoice(module, db, ObjectId, job, total_seconds):
    job_id = (job or {}).get("_id")
    existing = await db.invoices.find_one({
        "$and": [
            {"$or": [{"job_id": job_id}, {"job_id": text(job_id, 160)}]},
            {"status": {"$ne": "void"}},
        ]
    })
    if existing:
        return existing
    helper = getattr(module, "create_draft_invoice_for_completed_job", None)
    if not callable(helper):
        return None
    return await helper(job, total_seconds)


async def seed_job_done(db, user, job, now):
    for name in ("churvox_worker_complete_elapsed_patch", "backend.churvox_worker_complete_elapsed_patch"):
        try:
            patch = importlib.import_module(name)
            seed = getattr(patch, "_seed_job_done", None)
            if callable(seed):
                return await seed(db, user, job, now)
        except Exception:
            continue
    return None


def completion_response(job, invoice=None, next_job=None, closeout=None, warnings=None, idempotent=False, processing=False):
    return {
        "success": True,
        "message": "Job completion is already being processed" if processing else "Job completed successfully",
        "idempotent": bool(idempotent),
        "processing": bool(processing),
        "job_id": text((job or {}).get("_id") or (job or {}).get("id"), 160),
        "status": "completed",
        "completed": True,
        "timer_running": False,
        "total_time_seconds": int((job or {}).get("total_time_seconds") or 0),
        "completed_at": safe((job or {}).get("completed_at")),
        "invoice_created": bool(invoice),
        "invoice_id": text((invoice or {}).get("_id") or (job or {}).get("invoice_id"), 160) or None,
        "invoice_number": (invoice or {}).get("invoice_number"),
        "invoice_status": (invoice or {}).get("status") or (job or {}).get("invoice_status"),
        "next_recurring_job_id": text((next_job or {}).get("_id") or (job or {}).get("next_generated_job_id"), 160) or None,
        "job_done_started": bool(closeout or (job or {}).get("job_done_closeout_id")),
        "job_done_closeout_id": text((closeout or {}).get("_id") or (job or {}).get("job_done_closeout_id"), 160) or None,
        "warnings": list(warnings or []),
        "owner_approval_required": True,
        "safety": "Invoice and follow-up records are prepared only. Nothing was sent, synced, charged or paid.",
        "job": safe(job or {}),
        "route_version": VERSION,
    }


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    if app is None or db is None or get_current_user is None or ObjectId is None or HTTPException is None:
        return

    async def complete(request: StarletteRequest, job_id: str, require_worker=False):
        user = await get_current_user(request)
        role = lower((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type"))
        if require_worker and role not in WORKER_ROLES:
            raise HTTPException(status_code=403, detail="Only assigned workers can complete field jobs")
        if not require_worker and role not in OWNER_ROLES | WORKER_ROLES:
            raise HTTPException(status_code=403, detail="Business user access required")

        business = business_id(user)
        if not business:
            raise HTTPException(status_code=401, detail="Business identity is missing")
        query = job_query(ObjectId, job_id, business, user, require_worker=require_worker)
        job = await db.jobs.find_one(query)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if lower(job.get("completion_state")) == "complete":
            invoice = None
            next_job = None
            closeout = None
            invoice_oid = object_id(ObjectId, job.get("invoice_id"))
            next_oid = object_id(ObjectId, job.get("next_generated_job_id"))
            closeout_oid = object_id(ObjectId, job.get("job_done_closeout_id"))
            if invoice_oid:
                invoice = await db.invoices.find_one({"_id": invoice_oid})
            if next_oid:
                next_job = await db.jobs.find_one({"_id": next_oid})
            if closeout_oid:
                closeout = await db.job_closeouts.find_one({"_id": closeout_oid})
            return completion_response(job, invoice, next_job, closeout, idempotent=True)

        try:
            payload = await request.json()
        except Exception:
            payload = {}
        if not isinstance(payload, dict):
            payload = {}

        now = datetime.now(timezone.utc)
        total = elapsed_seconds(module, job, now)
        stale_before = now - timedelta(minutes=5)
        claim_query = {
            "$and": [
                {"_id": job["_id"]},
                ownership_clause(ObjectId, business),
                *([assigned_clause(ObjectId, user)] if require_worker or role in WORKER_ROLES else []),
                {"$or": [
                    {"completion_state": {"$nin": ["processing", "complete"]}},
                    {"completion_state": {"$exists": False}},
                    {"completion_state": "processing", "completion_processing_started_at": {"$lt": stale_before}},
                ]},
            ]
        }
        update = {
            "status": "completed",
            "job_status": "Completed",
            "workflow_status": "completed",
            "completed": True,
            "completed_at": job.get("completed_at") or now,
            "timer_running": False,
            "timer_status": "stopped",
            "timer_started_at": None,
            "current_timer_started_at": None,
            "total_time_seconds": total,
            "time_seconds": total,
            "time_spent_seconds": total,
            "completion_state": "processing",
            "completion_processing_started_at": now,
            "completion_error": None,
            "updated_at": now,
        }
        for source, target in [
            ("worker_notes", "worker_notes"),
            ("completion_note", "completion_note"),
            ("completion_photos", "completion_photos"),
            ("photos", "completion_photos"),
            ("completion_checklist", "completion_checklist"),
            ("extras", "extras"),
            ("extras_total", "extras_total"),
            ("materials", "materials"),
        ]:
            if source in payload:
                update[target] = payload.get(source)

        claim = await db.jobs.update_one(claim_query, {"$set": update})
        if not getattr(claim, "matched_count", 0):
            latest = await db.jobs.find_one(query)
            if not latest:
                raise HTTPException(status_code=404, detail="Job not found")
            return completion_response(
                latest,
                warnings=["Another completion request is already preparing the follow-up records."],
                idempotent=True,
                processing=lower(latest.get("completion_state")) == "processing",
            )

        updated = await db.jobs.find_one({"_id": job["_id"]})
        warnings = []
        invoice = None
        next_job = None
        closeout = None

        try:
            next_job = await ensure_next_recurring(module, db, ObjectId, updated, business, now)
        except Exception as exc:
            warnings.append(f"Next recurring job could not be prepared: {text(exc, 240)}")

        try:
            invoice = await ensure_invoice(module, db, ObjectId, updated, total)
        except Exception as exc:
            warnings.append(f"Draft invoice could not be prepared: {text(exc, 240)}")

        try:
            closeout = await seed_job_done(db, user, updated, now)
        except Exception as exc:
            warnings.append(f"Job Done closeout could not be prepared: {text(exc, 240)}")

        final_state = "needs_retry" if warnings else "complete"
        final_update = {
            "completion_state": final_state,
            "completion_processing_completed_at": datetime.now(timezone.utc),
            "completion_warnings": warnings,
            "completion_error": "; ".join(warnings) if warnings else None,
            "owner_approval_required": True,
            "updated_at": datetime.now(timezone.utc),
        }
        if invoice and invoice.get("_id"):
            final_update.update({
                "invoice_id": invoice["_id"],
                "invoice_status": invoice.get("status") or "draft",
                "invoice_ready": True,
            })
        if next_job and next_job.get("_id"):
            final_update["next_generated_job_id"] = next_job["_id"]
        if closeout and closeout.get("_id"):
            final_update["job_done_closeout_id"] = closeout["_id"]

        await db.jobs.update_one({"_id": job["_id"]}, {"$set": final_update})
        completed = await db.jobs.find_one({"_id": job["_id"]})
        return completion_response(completed, invoice, next_job, closeout, warnings=warnings)

    async def owner_complete(request: StarletteRequest, job_id: str):
        return await complete(request, job_id, require_worker=False)

    async def worker_complete(request: StarletteRequest, job_id: str):
        return await complete(request, job_id, require_worker=True)

    routes = [
        ("/api/jobs/{job_id}/complete", owner_complete),
        ("/api/worker/jobs/{job_id}/complete", worker_complete),
    ]
    for path, endpoint in routes:
        remove_route(app, path)
        app.add_api_route(path, endpoint, methods=["POST"])
        promote_route(app, path)

    app.state.churvox_job_completion_final = VERSION
