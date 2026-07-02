"""Keeps owner job assignment aligned with the team worker lookup.

The legacy /api/jobs create route only checked one stored business_id shape when
validating assigned workers. Other team routes already accept both string and
ObjectId business ids, so this patch makes job creation use the same flexible
business matching without changing the owner-approval model.
"""

from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import Depends, HTTPException, Request
from fastapi.routing import APIRoute


def _oid(value):
    try:
        if value is None or value == "":
            return None
        return ObjectId(str(value))
    except Exception:
        return None


def _business_values(*values):
    out = []
    seen = set()
    for value in values:
        if value is None or value == "":
            continue
        for candidate in (str(value), _oid(value)):
            if candidate is None:
                continue
            key = f"{type(candidate).__name__}:{candidate}"
            if key not in seen:
                seen.add(key)
                out.append(candidate)
    return out


def _enum_value(value, fallback=""):
    raw = getattr(value, "value", value)
    return str(raw or fallback)


def _jsonable_id(value):
    return str(value) if value is not None else None


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    JobCreate = getattr(module, "JobCreate", None)
    JobStatus = getattr(module, "JobStatus", None)
    get_current_user = getattr(module, "get_current_user", None)
    get_user_business_id = getattr(module, "get_user_business_id", None)
    normalize_recurring_job_fields = getattr(module, "normalize_recurring_job_fields", lambda doc: doc)

    if not all([app, db, JobCreate, JobStatus, get_current_user, get_user_business_id]):
        return
    if getattr(app.state, "churvox_worker_assignment_patch", False):
        return

    async def patched_create_job(job_data: JobCreate, request: Request, current_user: dict = Depends(get_current_user)):
        business_id = await get_user_business_id(current_user)
        user = await get_current_user(request)

        if user.get("role") not in ("employer", "admin"):
            raise HTTPException(status_code=403, detail="Only employers can create jobs")

        raw_body = await request.json()
        user_business_id = user.get("business_id")
        business_obj = _oid(user_business_id) or _oid(business_id)
        business_values = _business_values(business_id, user_business_id)

        job_doc = {
            **job_data.model_dump(exclude={"assigned_worker_id", "client_id"}),
            "contractor_id": business_obj,
            "business_id": str(business_id),
            "created_by": _oid(user.get("id")),
            "status": JobStatus.ASSIGNED,
            "assigned_worker_id": None,
            "assigned_worker_name": None,
            "acknowledged_at": None,
            "started_at": None,
            "completed_at": None,
            "photos": [],
            "time_entries": [],
            "total_time_seconds": 0,
            "timer_running": False,
            "created_at": datetime.now(timezone.utc),
        }

        if not job_doc.get("title"):
            job_type_label = _enum_value(job_data.job_type, "Job").replace("_", " ").title()
            client_name = job_data.customer_name or "No Client"
            job_doc["title"] = f"{job_type_label} - {client_name}"

        job_doc["client_id"] = _oid(job_data.client_id) if job_data.client_id else None

        if job_doc.get("is_recurring") and not job_doc.get("recurring_frequency"):
            job_doc["recurring_frequency"] = job_doc.get("recurrence_pattern")

        assigned_worker_id = getattr(job_data, "assigned_worker_id", None) or raw_body.get("worker_id")
        assigned_worker_email = str(raw_body.get("assigned_worker_email") or raw_body.get("worker_email") or "").strip().lower()
        worker = None
        worker_oid = _oid(assigned_worker_id)

        if worker_oid:
            worker = await db.users.find_one({
                "_id": worker_oid,
                "business_id": {"$in": business_values},
                "role": "worker",
            })

        if not worker and assigned_worker_email:
            worker = await db.users.find_one({
                "email": assigned_worker_email,
                "business_id": {"$in": business_values},
                "role": "worker",
            })

        if assigned_worker_id or assigned_worker_email:
            if not worker:
                raise HTTPException(status_code=400, detail="Worker not found in your team")
            job_doc["assigned_worker_id"] = worker.get("_id")
            job_doc["assigned_worker_name"] = worker.get("name") or worker.get("email") or "Worker"
            job_doc["assigned_worker_email"] = worker.get("email")
            job_doc["worker_email"] = worker.get("email")

        job_doc = normalize_recurring_job_fields(job_doc)
        result = await db.jobs.insert_one(job_doc)

        job_doc["id"] = str(result.inserted_id)
        job_doc["contractor_id"] = _jsonable_id(job_doc.get("contractor_id"))
        job_doc["created_by"] = _jsonable_id(job_doc.get("created_by"))
        if job_doc.get("client_id") is not None:
            job_doc["client_id"] = _jsonable_id(job_doc.get("client_id"))
        if job_doc.get("assigned_worker_id") is not None:
            job_doc["assigned_worker_id"] = _jsonable_id(job_doc.get("assigned_worker_id"))
        job_doc.pop("_id", None)
        return job_doc

    replacement = APIRoute(
        path="/api/jobs",
        endpoint=patched_create_job,
        methods=["POST"],
        name="patched_create_job",
    )

    replaced = False
    for index, route in enumerate(list(app.router.routes)):
        if getattr(route, "path", None) == "/api/jobs" and "POST" in getattr(route, "methods", set()):
            app.router.routes[index] = replacement
            replaced = True
            break

    if not replaced:
        app.router.routes.insert(0, replacement)

    app.state.churvox_worker_assignment_patch = True


_install = install
