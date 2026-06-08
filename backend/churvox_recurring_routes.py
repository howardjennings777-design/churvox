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


def _next_date(start, frequency, custom_days=0):
    if not start:
        start = datetime.now(timezone.utc)
    if frequency == "weekly":
        return start + timedelta(days=7)
    if frequency == "fortnightly":
        return start + timedelta(days=14)
    if frequency == "monthly":
        return start + timedelta(days=30)
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
            query = {"_id": job_oid, "$or": [{"business_id": business_id}]}
            if biz_oid:
                query["$or"].append({"contractor_id": biz_oid})
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
        query = {"_id": job_oid, "$or": [{"business_id": business_id}]}
        if biz_oid:
            query["$or"].append({"contractor_id": biz_oid})
        job = await db.jobs.find_one(query)
        if not job:
            return {"success": False, "error": "Job not found"}
        now = datetime.now(timezone.utc)
        await db.jobs.update_one({"_id": job_oid}, {"$set": {"status": "completed", "completed_at": now, "updated_at": now}})
        next_job = None
        if job.get("is_recurring") and job.get("recurring_frequency") not in [None, "", "none"]:
            base = job.get("scheduled_date") or now
            next_date = _next_date(base, job.get("recurring_frequency"), job.get("custom_repeat_days"))
            doc = dict(job)
            doc.pop("_id", None)
            doc["parent_recurring_job_id"] = job_oid
            doc["status"] = "assigned"
            doc["scheduled_date"] = next_date
            doc["completed_at"] = None
            doc["started_at"] = None
            doc["acknowledged_at"] = None
            doc["time_entries"] = []
            doc["total_time_seconds"] = 0
            doc["timer_running"] = False
            doc["created_at"] = now
            doc["updated_at"] = now
            inserted = await db.jobs.insert_one(doc)
            next_job = await db.jobs.find_one({"_id": inserted.inserted_id})
            await db.jobs.update_one({"_id": job_oid}, {"$set": {"next_generated_job_id": inserted.inserted_id, "next_recurring_date": next_date}})
        completed = await db.jobs.find_one({"_id": job_oid})
        return {"success": True, "message": "Job completed" + (" and next recurring job created" if next_job else ""), "job": _safe(completed), "next_job": _safe(next_job)}

    router.churvox_recurring_installed = True
