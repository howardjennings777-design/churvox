from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()

TIMER_PATHS = {
    "start": [
        "/api/jobs/{job_id}/timer/start",
        "/api/jobs/{job_id}/time/start",
        "/api/jobs/{job_id}/start-timer",
        "/api/jobs/{job_id}/start",
    ],
    "pause": [
        "/api/jobs/{job_id}/timer/pause",
        "/api/jobs/{job_id}/time/pause",
        "/api/jobs/{job_id}/pause-timer",
        "/api/jobs/{job_id}/pause",
    ],
    "resume": [
        "/api/jobs/{job_id}/timer/resume",
        "/api/jobs/{job_id}/time/resume",
        "/api/jobs/{job_id}/resume-timer",
        "/api/jobs/{job_id}/resume",
    ],
    "complete": [
        "/api/jobs/{job_id}/timer/complete",
        "/api/jobs/{job_id}/time/complete",
        "/api/jobs/{job_id}/complete-timer",
        "/api/jobs/{job_id}/complete",
    ],
}


def now_utc():
    return datetime.now(timezone.utc)


def values_from_raw(raw, ObjectId):
    values = []
    if raw is not None:
        values.append(str(raw))
        try:
            values.append(ObjectId(str(raw)))
        except Exception:
            pass
    out = []
    for value in values:
        if value not in out:
            out.append(value)
    return out


def business_values(user, ObjectId):
    return values_from_raw(user.get("business_id") or user.get("id") or user.get("_id"), ObjectId)


def job_id_values(job_id, ObjectId):
    return values_from_raw(job_id, ObjectId)


def safe_job(job):
    out = dict(job or {})
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if hasattr(value, "isoformat"):
            try:
                out[key] = value.isoformat()
            except Exception:
                pass
        elif value.__class__.__name__ == "ObjectId":
            out[key] = str(value)
    return out


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="POST"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


async def read_payload(request):
    try:
        return await request.json()
    except Exception:
        return {}


async def find_job(db, job_id, user, ObjectId):
    ids = job_id_values(job_id, ObjectId)
    businesses = business_values(user, ObjectId)
    base = {"_id": {"$in": ids}}
    if businesses:
        scoped = {
            **base,
            "$or": [
                {"contractor_id": {"$in": businesses}},
                {"business_id": {"$in": businesses}},
                {"owner_business_id": {"$in": businesses}},
                {"user_id": {"$in": businesses}},
                {"created_by": {"$in": businesses}},
            ],
        }
        job = await db.jobs.find_one(scoped)
        if job:
            return job
    return await db.jobs.find_one(base)


def parse_started_at(job):
    raw = job.get("timer_started_at") or job.get("current_timer_started_at") or job.get("started_at")
    if isinstance(raw, datetime):
        return raw
    if isinstance(raw, str):
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def elapsed_seconds(job, at):
    started = parse_started_at(job)
    if not started:
        return 0
    try:
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        return max(0, int((at - started).total_seconds()))
    except Exception:
        return 0


async def apply_timer_action(db, job, action, user, payload):
    at = now_utc()
    previous_seconds = int(job.get("time_seconds") or job.get("total_time_seconds") or job.get("time_spent_seconds") or 0)
    add_seconds = elapsed_seconds(job, at) if action in {"pause", "complete"} else 0
    total_seconds = previous_seconds + add_seconds
    actor = str(user.get("id") or user.get("_id") or user.get("email") or "")
    event = {"action": action, "at": at, "by": actor, "added_seconds": add_seconds}

    set_fields = {"updated_at": at, "timer_last_action": action, "last_timer_event": event}
    unset_fields = {}

    if action == "start":
        set_fields.update({
            "status": "In Progress",
            "job_status": "In Progress",
            "timer_status": "running",
            "timer_running": True,
            "timer_started_at": at,
            "current_timer_started_at": at,
            "started_at": job.get("started_at") or at,
        })
    elif action == "resume":
        set_fields.update({
            "status": "In Progress",
            "job_status": "In Progress",
            "timer_status": "running",
            "timer_running": True,
            "timer_started_at": at,
            "current_timer_started_at": at,
        })
    elif action == "pause":
        set_fields.update({
            "status": "In Progress",
            "job_status": "In Progress",
            "timer_status": "paused",
            "timer_running": False,
            "time_seconds": total_seconds,
            "total_time_seconds": total_seconds,
            "time_spent_seconds": total_seconds,
            "paused_at": at,
        })
        unset_fields.update({"timer_started_at": "", "current_timer_started_at": ""})
    elif action == "complete":
        set_fields.update({
            "status": "Completed",
            "job_status": "Completed",
            "timer_status": "stopped",
            "timer_running": False,
            "time_seconds": total_seconds,
            "total_time_seconds": total_seconds,
            "time_spent_seconds": total_seconds,
            "completed": True,
            "completed_at": at,
            "completed_by": actor,
            "invoice_ready": True,
        })
        unset_fields.update({"timer_started_at": "", "current_timer_started_at": ""})

    update = {"$set": set_fields, "$push": {"time_events": event, "timer_events": event}}
    if unset_fields:
        update["$unset"] = unset_fields
    await db.jobs.update_one({"_id": job["_id"]}, update)

    try:
        await db.time_logs.insert_one({
            "job_id": job["_id"],
            "business_id": job.get("business_id") or job.get("contractor_id") or job.get("owner_business_id") or user.get("business_id") or user.get("id"),
            "worker_id": user.get("id") or user.get("_id"),
            "action": action,
            "seconds": add_seconds,
            "total_seconds": total_seconds,
            "created_at": at,
            "payload": payload or {},
        })
    except Exception:
        pass

    return await db.jobs.find_one({"_id": job["_id"]})


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    Request = getattr(module, "Request", None)
    if not app or db is None or not get_current_user or ObjectId is None or HTTPException is None or Request is None:
        return

    async def handle_timer_action(request: Request, job_id: str, action: str):
        user = await get_current_user(request)
        payload = await read_payload(request)
        job = await find_job(db, job_id, user, ObjectId)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        updated = await apply_timer_action(db, job, action, user, payload)
        return {"success": True, "action": action, "job": safe_job(updated), "status": updated.get("status"), "timer_status": updated.get("timer_status"), "time_seconds": updated.get("time_seconds") or updated.get("total_time_seconds") or 0}

    for action, paths in TIMER_PATHS.items():
        for path in paths:
            remove_route(app, path, "POST")
            async def endpoint(request: Request, job_id: str, _action=action):
                return await handle_timer_action(request, job_id, _action)
            endpoint.__name__ = f"churvox_{action}_timer_endpoint"
            app.add_api_route(path, endpoint, methods=["POST"])

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
