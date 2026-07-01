from __future__ import annotations

from datetime import datetime
import importlib
import importlib.abc
import importlib.machinery
import re
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def text(value):
    if value is None:
        return ""
    if isinstance(value, dict):
        return text(value.get("$oid") or value.get("id") or value.get("_id") or value.get("worker_id") or value.get("user_id") or value.get("email") or value.get("name"))
    if hasattr(value, "__class__") and value.__class__.__name__ == "ObjectId":
        return str(value)
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def safe(value):
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            out["id" if key == "_id" else key] = safe(item)
        return out
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "__class__") and value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def route_matches(route, path, method="GET"):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    Body = getattr(module, "Body", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or not get_current_user or Request is None or Body is None or ObjectId is None:
        return

    def oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    def role_of(user):
        business = user.get("business") if isinstance(user.get("business"), dict) else {}
        raw = text(user.get("role") or user.get("user_role") or user.get("worker_role") or user.get("account_type") or user.get("type") or business.get("role"))
        return raw.lower().replace(" ", "_").replace("-", "_")

    def is_worker(user):
        if not user:
            return False
        role = role_of(user)
        return bool(role in {"worker", "staff", "employee", "team_member", "subcontractor", "contractor", "field_worker", "technician"} or user.get("is_worker") is True or user.get("worker_login") is True or user.get("worker_id") or user.get("team_member_id") or user.get("staff_id"))

    def identities(user):
        ids = set()
        emails = set()
        names = set()
        business_ids = set()
        for key in ["id", "_id", "user_id", "worker_id", "staff_id", "team_member_id"]:
            val = text(user.get(key))
            if val:
                ids.add(val)
        for key in ["email", "user_email", "worker_email", "staff_email"]:
            val = lower(user.get(key))
            if val:
                emails.add(val)
                ids.add(val)
        for key in ["name", "full_name", "worker_name", "staff_name"]:
            val = lower(user.get(key))
            if val:
                names.add(val)
        for key in ["business_id", "businessId", "owner_business_id", "owner_id", "contractor_id", "employer_id", "company_id", "parent_user_id"]:
            val = text(user.get(key))
            if val:
                business_ids.add(val)
                maybe = oid(val)
                if maybe is not None:
                    business_ids.add(maybe)
        return ids, emails, names, business_ids

    def assigned(job, user):
        ids, emails, names, _ = identities(user)
        id_keys = ["assigned_worker_id", "worker_id", "assigned_to", "assignedWorkerId", "workerId", "staff_id", "team_member_id", "assigned_user_id", "worker", "assigned_worker"]
        for key in id_keys:
            value = text(job.get(key))
            if value and (value in ids or lower(value) in emails or lower(value) in names):
                return True
        for key in ["worker_email", "assigned_worker_email", "assigned_to_email", "staff_email", "email"]:
            if lower(job.get(key)) in emails:
                return True
        for key in ["worker_name", "assigned_worker_name", "assigned_to_name", "staff_name"]:
            if lower(job.get(key)) in names:
                return True
        for row in job.get("workers") or job.get("assigned_workers") or job.get("team") or []:
            if isinstance(row, dict):
                if text(row.get("id") or row.get("_id") or row.get("worker_id") or row.get("user_id")) in ids:
                    return True
                if lower(row.get("email")) in emails:
                    return True
                if lower(row.get("name") or row.get("full_name")) in names:
                    return True
            else:
                value = text(row)
                if value in ids or lower(value) in emails or lower(value) in names:
                    return True
        return False

    def not_archived(job):
        status = lower(job.get("status") or job.get("job_status") or job.get("workflow_status"))
        return not re.search(r"archived|deleted|cancelled", status)

    async def read_candidate_jobs(user):
        _, emails, _, business_ids = identities(user)
        queries = []
        if business_ids:
            values = list(business_ids)
            queries.append({"$or": [{"business_id": {"$in": values}}, {"businessId": {"$in": values}}, {"contractor_id": {"$in": values}}, {"owner_id": {"$in": values}}]})
        if emails:
            email_values = list(emails)
            queries.append({"$or": [{"worker_email": {"$in": email_values}}, {"assigned_worker_email": {"$in": email_values}}, {"assigned_to_email": {"$in": email_values}}, {"staff_email": {"$in": email_values}}]})
        rows = []
        seen = set()
        for query in queries or [{}]:
            try:
                cursor = db.jobs.find(query).sort("scheduled_date", 1).limit(800)
            except Exception:
                cursor = db.jobs.find(query).limit(800)
            async for job in cursor:
                jid = text(job.get("_id") or job.get("id") or job.get("job_id"))
                if jid in seen:
                    continue
                seen.add(jid)
                if not_archived(job) and assigned(job, user):
                    rows.append(safe(job))
        return rows

    async def worker_jobs(request: Request):
        user = await get_current_user(request)
        if not is_worker(user):
            return {"success": True, "jobs": [], "items": [], "data": [], "worker": safe(user), "reason": "not_worker"}
        rows = await read_candidate_jobs(user)
        return {"success": True, "jobs": rows, "items": rows, "data": rows, "count": len(rows), "worker": safe(user)}

    async def worker_debug(request: Request):
        user = await get_current_user(request)
        rows = await read_candidate_jobs(user) if is_worker(user) else []
        ids, emails, names, business_ids = identities(user)
        return {"success": True, "is_worker": is_worker(user), "role": role_of(user), "ids": list(map(str, ids)), "emails": list(emails), "names": list(names), "business_ids": list(map(str, business_ids)), "job_count": len(rows), "sample_jobs": rows[:5], "worker": safe(user)}

    async def worker_field_update(request: Request, job_id: str, payload: dict = Body(default={})):
        user = await get_current_user(request)
        rows = await read_candidate_jobs(user) if is_worker(user) else []
        match = next((job for job in rows if text(job.get("id") or job.get("_id") or job.get("job_id")) == text(job_id)), None)
        if not match:
            return {"success": False, "detail": "Worker job not found"}
        update = {"worker_notes": text(payload.get("worker_notes") or payload.get("note")), "worker_last_update_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        await db.jobs.update_one({"_id": oid(job_id) or job_id}, {"$set": update})
        return {"success": True, "job_id": job_id, "update": safe(update)}

    for path, method in [("/api/worker/jobs", "GET"), ("/api/worker/debug", "GET"), ("/api/worker/jobs/{job_id}/field-update", "PATCH")]:
        remove_route(app, path, method)
    app.add_api_route("/api/worker/jobs", worker_jobs, methods=["GET"])
    app.add_api_route("/api/worker/debug", worker_debug, methods=["GET"])
    app.add_api_route("/api/worker/jobs/{job_id}/field-update", worker_field_update, methods=["PATCH"])
    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original
    def create_module(self, spec):
        if hasattr(self.original, "create_module"):
            return self.original.create_module(spec)
        return None
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


if not any(isinstance(f, Finder) for f in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
