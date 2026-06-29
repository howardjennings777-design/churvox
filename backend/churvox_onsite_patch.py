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


async def safe_recent(collection, query, limit=100, sort_field="updated_at"):
    try:
        return await collection.find(query).sort(sort_field, -1).limit(limit).to_list(length=limit)
    except Exception:
        try:
            return await collection.find(query).limit(limit).to_list(length=limit)
        except Exception:
            return []


def parse_dt(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = clean(value)
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        try:
            return datetime.fromisoformat(text[:10]).replace(tzinfo=timezone.utc)
        except Exception:
            return None


def worker_name(worker):
    return clean(worker.get("name") or worker.get("full_name") or worker.get("email") or worker.get("worker_name") or worker.get("id") or worker.get("_id"))


def job_worker(job):
    return clean(job.get("assigned_worker_name") or job.get("worker_name") or job.get("worker") or job.get("assigned_to") or job.get("assigned_worker_id"))


def job_title(job):
    return clean(job.get("title") or job.get("job_title") or job.get("job_name") or job.get("description") or "Job")


def job_location(job):
    return clean(job.get("address") or job.get("site_address") or job.get("location") or job.get("suburb") or "")


def is_active_worker(worker):
    text = lower(" ".join([clean(worker.get("status")), clean(worker.get("clock_status")), clean(worker.get("current_job")), clean(worker.get("job_title")), clean(worker.get("gps")), clean(worker.get("location"))]))
    if any(word in text for word in ["clocked in", "driving", "on site", "onsite", "in progress", "proof", "working"]):
        return True
    if any(word in text for word in ["clocked out", "off", "invited", "pending"]):
        return False
    return bool(clean(worker.get("current_job") or worker.get("job_title") or worker.get("gps") or worker.get("location")))


async def onsite_payload(db, user):
    bid = business_id(user)
    workers = await safe_recent(db.team, {"business_id": bid}, 120, "updated_at")
    jobs = await safe_recent(db.jobs, {"business_id": bid}, 250, "scheduled_date")
    slips = await safe_recent(db.worker_field_slips, {"business_id": bid}, 80, "updated_at")
    gps_rows = await safe_recent(db.worker_gps_status, {"business_id": bid}, 120, "updated_at")
    gps_by_worker = {}
    for row in gps_rows:
        key = clean(row.get("worker_id") or row.get("user_id") or row.get("name") or row.get("worker_name"))
        if key and key not in gps_by_worker:
            gps_by_worker[key] = row
    jobs_by_worker = {}
    for job in jobs:
        worker = job_worker(job) or "Unassigned"
        jobs_by_worker.setdefault(worker, []).append(job)
    onsite = []
    warnings = []
    for worker in workers:
        name = worker_name(worker)
        wid = clean(worker.get("id") or worker.get("_id") or worker.get("user_id") or worker.get("email") or name)
        gps = gps_by_worker.get(wid) or gps_by_worker.get(name) or {}
        assigned = jobs_by_worker.get(name) or jobs_by_worker.get(wid) or []
        current_job = clean(worker.get("current_job") or worker.get("job_title"))
        if not current_job and assigned:
            current_job = job_title(assigned[0])
        status = clean(worker.get("status") or worker.get("clock_status") or gps.get("state") or ("Onsite" if is_active_worker(worker) else "Offsite"))
        location = clean(gps.get("location") or worker.get("gps") or worker.get("location") or (job_location(assigned[0]) if assigned else ""))
        proof = clean(worker.get("proof") or worker.get("photo_status") or gps.get("proof") or "No proof yet")
        messages = clean(worker.get("messages") or worker.get("message_status") or "No unread messages")
        active = is_active_worker(worker)
        if active and not location:
            warnings.append({"type": "missing_location", "worker": name, "message": f"{name} is active but has no site/GPS location."})
        if active and proof.lower().startswith("no proof"):
            warnings.append({"type": "missing_proof", "worker": name, "message": f"{name} is active but proof is missing."})
        onsite.append({
            "id": wid,
            "name": name,
            "role": clean(worker.get("role") or worker.get("access") or "Worker"),
            "status": status,
            "active": active,
            "job": current_job,
            "jobs": [json_safe(job) for job in assigned[:8]],
            "gps": location,
            "location": location,
            "map_query": f"{location} New Zealand" if location else "Lower Hutt Wellington New Zealand",
            "start": clean(worker.get("start") or worker.get("clock_in") or worker.get("start_time") or gps.get("started_at")),
            "end": clean(worker.get("end") or worker.get("clock_out") or worker.get("end_time")),
            "proof": proof,
            "messages": messages,
            "timesheet": clean(worker.get("timesheet") or worker.get("hours_today") or ""),
            "slip": clean(worker.get("slip") or worker.get("pay_slip_status") or worker.get("payroll_status") or ""),
            "updated_at": worker.get("updated_at") or gps.get("updated_at"),
        })
    active_rows = [row for row in onsite if row.get("active")]
    places = [row.get("location") for row in active_rows if row.get("location")]
    if not places:
        places = [job_location(job) for job in jobs if job_location(job)][:4]
    command_slips = []
    for slip in slips[:20]:
        if lower(slip.get("status")) in {"approved", "parked", "closed"}:
            continue
        command_slips.append(json_safe(slip))
    return {
        "success": True,
        "page": "onsite",
        "label": "Onsite",
        "map_query": f"{' '.join(places[:5])} New Zealand" if places else "Lower Hutt Wellington New Zealand",
        "counts": {"onsite": len(active_rows), "team": len(workers), "warnings": len(warnings), "field_slips": len(command_slips)},
        "onsite": json_safe(active_rows),
        "all_team": json_safe(onsite),
        "warnings": json_safe(warnings),
        "field_slips": command_slips,
        "rule": "Team holds staff records. Onsite only shows live work, map, field proof and people currently doing work.",
        "updated_at": now_utc(),
    }


def route_matches(route, path, method):
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
    if not app or db is None or not get_current_user or Request is None:
        return

    async def onsite_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await onsite_payload(db, user))

    remove_route(app, "/api/onsite/live", "GET")
    app.add_api_route("/api/onsite/live", onsite_endpoint, methods=["GET"])
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
