from calendar import monthrange
from datetime import datetime, timezone, timedelta
import sys


def _server():
    return sys.modules.get("server") or sys.modules.get("backend.server") or sys.modules.get("main")


def _clean(value):
    return str(value or "").strip()


def _bool(value):
    if isinstance(value, bool):
        return value
    return _clean(value).lower() in ["true", "yes", "1", "weekly", "fortnightly", "monthly", "custom"]


def _freq(value):
    text = _clean(value).lower()
    if "fortnight" in text:
        return "fortnightly"
    if "month" in text:
        return "monthly"
    if "custom" in text:
        return "custom"
    if "week" in text:
        return "weekly"
    return "none"


def _parse_date(value):
    if isinstance(value, datetime):
        return value
    text = _clean(value)
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except Exception:
        try:
            return datetime.strptime(text, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            return None


def _add_calendar_month(start):
    month_index = start.month
    year = start.year + month_index // 12
    month = month_index % 12 + 1
    day = min(start.day, monthrange(year, month)[1])
    return start.replace(year=year, month=month, day=day)


def _next_date(start, frequency, custom_days=0):
    if not start:
        start = datetime.now(timezone.utc)
    if frequency == "weekly":
        return start + timedelta(days=7)
    if frequency == "fortnightly":
        return start + timedelta(days=14)
    if frequency == "monthly":
        return _add_calendar_month(start)
    if frequency == "custom":
        try:
            days = int(custom_days or 0)
        except Exception:
            days = 0
        return start + timedelta(days=max(days, 1))
    return None


def _obj(value):
    ObjectId = getattr(_server(), "ObjectId", None)
    try:
        return ObjectId(str(value)) if value and ObjectId else None
    except Exception:
        return None


def _safe(doc):
    if not doc:
        return doc
    out = dict(doc)
    for key, value in list(out.items()):
        if key == "_id":
            out["id"] = str(value)
            out.pop("_id", None)
        elif hasattr(value, "isoformat"):
            out[key] = value.isoformat()
        elif value.__class__.__name__ == "ObjectId":
            out[key] = str(value)
    return out


async def _user(request):
    return await getattr(_server(), "get_current_user")(request)


async def _existing_next_job(db, job):
    next_id = job.get("next_generated_job_id")
    next_oid = _obj(next_id)
    if next_oid:
        return await db.jobs.find_one({"_id": next_oid})
    return None


def _completion_query(job_oid, business_id, biz_oid):
    ownership = [{"business_id": business_id}]
    if biz_oid:
        ownership.append({"contractor_id": biz_oid})
    return {"_id": job_oid, "$or": ownership}


def install(router):
    if getattr(router, "churvox_recurring_installed", False):
        return

    @router.post("/logic/jobs/recurring")
    async def save_recurring_job(payload: dict, request):
        app = _server()
        db = getattr(app, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        try:
            user = await _user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}
        business_id = str(user.get("business_id") or user.get("id"))
        biz_oid = _obj(business_id)
        job_id = _clean(payload.get("job_id") or payload.get("id"))
        job_oid = _obj(job_id)
        frequency = _freq(payload.get("recurring_frequency") or payload.get("recurring") or payload.get("repeatType"))
        custom_days = payload.get("custom_repeat_days") or payload.get("customDays") or 0
        scheduled = _parse_date(payload.get("scheduled_date") or payload.get("schedule") or payload.get("scheduledDate"))
        next_scheduled = _next_date(scheduled, frequency, custom_days)
        now = datetime.now(timezone.utc)
        update = {
            "business_id": business_id,
            "is_recurring": frequency != "none",
            "recurring_frequency": frequency,
            "custom_repeat_days": int(custom_days or 0) if str(custom_days or "").isdigit() else 0,
            "next_recurring_date": next_scheduled,
            "updated_at": now,
        }
        if biz_oid:
            update["contractor_id"] = biz_oid
        if scheduled:
            update["scheduled_date"] = scheduled
        if payload.get("title"):
            update["title"] = _clean(payload.get("title"))
        if payload.get("client") or payload.get("customer_name"):
            update["customer_name"] = _clean(payload.get("client") or payload.get("customer_name"))
        if payload.get("address"):
            update["address"] = _clean(payload.get("address"))
        if payload.get("notes"):
            update["notes"] = _clean(payload.get("notes"))
        if payload.get("price"):
            update["price"] = _clean(payload.get("price"))

        if job_oid:
            query = _completion_query(job_oid, business_id, biz_oid)
            result = await db.jobs.update_one(query, {"$set": update})
            if result.matched_count:
                job = await db.jobs.find_one({"_id": job_oid})
                return {"success": True, "message": "Recurring job settings saved", "job": _safe(job)}

        doc = dict(update)
        doc["title"] = update.get("title") or _clean(payload.get("jobTitle")) or "Recurring job"
        doc["customer_name"] = update.get("customer_name") or _clean(payload.get("client"))
        doc["address"] = update.get("address") or _clean(payload.get("address"))
        doc["status"] = "assigned"
        doc["created_at"] = now
        doc["created_by"] = _obj(user.get("id")) or user.get("id")
        inserted = await db.jobs.insert_one(doc)
        job = await db.jobs.find_one({"_id": inserted.inserted_id})
        return {"success": True, "message": "Recurring job created", "job": _safe(job)}

    @router.post("/logic/jobs/{job_id}/complete-recurring")
    async def complete_and_generate_next(job_id: str, request):
        app = _server()
        db = getattr(app, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        try:
            user = await _user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}

        business_id = str(user.get("business_id") or user.get("id"))
        biz_oid = _obj(business_id)
        job_oid = _obj(job_id)
        if not job_oid:
            return {"success": False, "error": "Invalid job id"}

        query = _completion_query(job_oid, business_id, biz_oid)
        job = await db.jobs.find_one(query)
        if not job:
            return {"success": False, "error": "Job not found"}

        now = datetime.now(timezone.utc)
        await db.jobs.update_one(query, {"$set": {"status": "completed", "completed_at": job.get("completed_at") or now, "updated_at": now}})

        existing_next = await _existing_next_job(db, job)
        if existing_next:
            completed = await db.jobs.find_one({"_id": job_oid})
            return {
                "success": True,
                "idempotent": True,
                "message": "Job was already completed and the next recurring job already exists",
                "job": _safe(completed),
                "next_job": _safe(existing_next),
            }

        next_job = None
        recurring = job.get("is_recurring") and job.get("recurring_frequency") not in [None, "", "none"]
        if recurring:
            stale_before = now - timedelta(minutes=5)
            claim_filter = {
                "$and": [
                    query,
                    {"$or": [{"next_generated_job_id": {"$exists": False}}, {"next_generated_job_id": None}]},
                    {"$or": [
                        {"recurring_generation_state": {"$ne": "creating"}},
                        {"recurring_generation_started_at": {"$lt": stale_before}},
                    ]},
                ]
            }
            claim = await db.jobs.update_one(claim_filter, {"$set": {
                "recurring_generation_state": "creating",
                "recurring_generation_started_at": now,
                "updated_at": now,
            }})

            if not claim.matched_count:
                latest = await db.jobs.find_one(query)
                existing_next = await _existing_next_job(db, latest or {})
                completed = latest or await db.jobs.find_one({"_id": job_oid})
                return {
                    "success": True,
                    "idempotent": True,
                    "generation_pending": existing_next is None,
                    "message": "The next recurring job already exists" if existing_next else "The next recurring job is already being prepared",
                    "job": _safe(completed),
                    "next_job": _safe(existing_next),
                }

            try:
                base = job.get("scheduled_date") or now
                next_date = _next_date(base, job.get("recurring_frequency"), job.get("custom_repeat_days"))
                series_id = job.get("recurring_series_id") or job.get("parent_recurring_job_id") or job_oid
                doc = dict(job)
                for field in [
                    "_id", "next_generated_job_id", "completed_at", "started_at", "acknowledged_at",
                    "recurring_generation_state", "recurring_generation_started_at",
                ]:
                    doc.pop(field, None)
                doc["recurring_series_id"] = series_id
                doc["parent_recurring_job_id"] = job_oid
                doc["status"] = "assigned"
                doc["scheduled_date"] = next_date
                doc["next_recurring_date"] = _next_date(next_date, job.get("recurring_frequency"), job.get("custom_repeat_days"))
                doc["time_entries"] = []
                doc["total_time_seconds"] = 0
                doc["timer_running"] = False
                doc["created_at"] = now
                doc["updated_at"] = now
                inserted = await db.jobs.insert_one(doc)
                next_job = await db.jobs.find_one({"_id": inserted.inserted_id})
                await db.jobs.update_one({"_id": job_oid}, {"$set": {
                    "next_generated_job_id": inserted.inserted_id,
                    "next_recurring_date": next_date,
                    "recurring_generation_state": "complete",
                    "recurring_generation_completed_at": now,
                    "updated_at": now,
                }})
            except Exception:
                await db.jobs.update_one({"_id": job_oid}, {"$unset": {
                    "recurring_generation_state": "",
                    "recurring_generation_started_at": "",
                }})
                raise

        completed = await db.jobs.find_one({"_id": job_oid})
        return {
            "success": True,
            "message": "Job completed" + (" and next recurring job created" if next_job else ""),
            "job": _safe(completed),
            "next_job": _safe(next_job),
        }

    router.churvox_recurring_installed = True
