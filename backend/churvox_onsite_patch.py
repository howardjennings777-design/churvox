from __future__ import annotations

from datetime import datetime, timezone
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
    if any(word in text for word in ["clocked in", "driving", "on site", "onsite", "in progress", "proof", "working", "active_on_job", "started"]):
        return True
    if any(word in text for word in ["clocked out", "off", "invited", "pending"]):
        return False
    return bool(clean(worker.get("current_job") or worker.get("job_title") or worker.get("gps") or worker.get("location")))


def gps_key(row):
    return clean(row.get("worker_id") or row.get("user_id") or row.get("email") or row.get("worker_email") or row.get("name") or row.get("worker_name"))


def gps_active(row):
    state = lower(row.get("state") or row.get("status"))
    if state in {"off", "inactive", "stopped", "clocked_out", "complete", "completed"}:
        return False
    if state in {"active_on_job", "active", "started", "start", "clocked_in", "clock_in", "on_my_way", "in_progress"}:
        return True
    return bool(clean(row.get("location") or row.get("map_query") or row.get("job_title") or row.get("job_id")))


def gps_location(row):
    lat = row.get("latitude") or row.get("lat")
    lng = row.get("longitude") or row.get("lng") or row.get("lon")
    if lat is not None and lng is not None:
        return f"{lat},{lng}"
    return clean(row.get("location") or row.get("map_query"))


async def onsite_payload(db, user):
    bid = business_id(user)
    workers = await safe_recent(db.team, {"business_id": bid}, 120, "updated_at")
    jobs = await safe_recent(db.jobs, {"business_id": bid}, 250, "scheduled_date")
    slips = await safe_recent(db.worker_field_slips, {"business_id": bid}, 80, "updated_at")
    gps_rows = await safe_recent(db.worker_gps_status, {"business_id": bid}, 120, "updated_at")

    gps_by_worker = {}
    for row in gps_rows:
        key = gps_key(row)
        if key and key not in gps_by_worker:
            gps_by_worker[key] = row

    jobs_by_worker = {}
    for job in jobs:
        worker = job_worker(job) or "Unassigned"
        jobs_by_worker.setdefault(worker, []).append(job)

    onsite = []
    warnings = []
    seen = set()

    for worker in workers:
        name = worker_name(worker)
        wid = clean(worker.get("id") or worker.get("_id") or worker.get("user_id") or worker.get("email") or name)
        gps = gps_by_worker.get(wid) or gps_by_worker.get(name) or gps_by_worker.get(clean(worker.get("email"))) or {}
        assigned = jobs_by_worker.get(name) or jobs_by_worker.get(wid) or []
        current_job = clean(gps.get("job_title") or worker.get("current_job") or worker.get("job_title"))
        if not current_job and assigned:
            current_job = job_title(assigned[0])
        active = gps_active(gps) or is_active_worker(worker)
        status = clean(worker.get("status") or worker.get("clock_status") or gps.get("state") or ("Clocked in" if active else "Offsite"))
        location = clean(gps_location(gps) or worker.get("gps") or worker.get("location") or (job_location(assigned[0]) if assigned else ""))
        proof = clean(worker.get("proof") or worker.get("photo_status") or gps.get("proof") or ("Clock-in signal received" if gps else "No proof yet"))
        messages = clean(worker.get("messages") or worker.get("message_status") or "No unread messages")
        row = {
            "id": wid,
            "name": name,
            "role": clean(worker.get("role") or worker.get("access") or "Worker"),
            "status": status,
            "active": active,
            "job": current_job,
            "jobs": [json_safe(job) for job in assigned[:8]],
            "gps": location,
            "location": location,
            "map_query": location,
            "start": clean(worker.get("start") or worker.get("clock_in") or worker.get("start_time") or gps.get("started_at") or gps.get("updated_at")),
            "end": clean(worker.get("end") or worker.get("clock_out") or worker.get("end_time")),
            "proof": proof,
            "messages": messages,
            "timesheet": clean(worker.get("timesheet") or worker.get("hours_today") or ""),
            "slip": clean(worker.get("slip") or worker.get("pay_slip_status") or worker.get("payroll_status") or ""),
            "updated_at": worker.get("updated_at") or gps.get("updated_at"),
            "source": "team+gps" if gps else "team",
        }
        if active and not location:
            warnings.append({"type": "missing_location", "worker": name, "message": f"{name} is active but has no site/GPS location."})
        if active and proof.lower().startswith("no proof"):
            warnings.append({"type": "missing_proof", "worker": name, "message": f"{name} is active but proof is missing."})
        onsite.append(row)
        for key in [wid, name, clean(worker.get("email"))]:
            if key:
                seen.add(key)

    for gps in gps_rows:
        if not gps_active(gps):
            continue
        key = gps_key(gps)
        if key and key in seen:
            continue
        location = gps_location(gps)
        name = clean(gps.get("worker_name") or gps.get("worker_email") or key or "Worker")
        row = {
            "id": key or name,
            "name": name,
            "role": "Worker",
            "status": clean(gps.get("state") or "Clocked in"),
            "active": True,
            "job": clean(gps.get("job_title") or gps.get("job_id") or "Current job"),
            "jobs": [],
            "gps": location,
            "location": location,
            "map_query": location,
            "start": clean(gps.get("started_at") or gps.get("updated_at")),
            "end": "",
            "proof": "Clock-in signal received",
            "messages": "No unread messages",
            "timesheet": "Clocked in",
            "slip": "",
            "updated_at": gps.get("updated_at"),
            "source": "worker_gps_status",
        }
        if not location:
            warnings.append({"type": "missing_location", "worker": name, "message": f"{name} is clocked in but no GPS/address was received."})
        onsite.append(row)
        if key:
            seen.add(key)

    active_rows = [row for row in onsite if row.get("active")]
    places = [row.get("location") or row.get("map_query") for row in active_rows if clean(row.get("location") or row.get("map_query"))]

    command_slips = []
    for slip in slips[:20]:
        if lower(slip.get("status")) in {"approved", "parked", "closed"}:
            continue
        command_slips.append(json_safe(slip))

    return {
        "success": True,
        "page": "onsite",
        "label": "Onsite",
        "map_query": f"{' '.join(places[:5])} New Zealand" if places else "",
        "counts": {"onsite": len(active_rows), "team": len(onsite), "warnings": len(warnings), "field_slips": len(command_slips)},
        "onsite": json_safe(active_rows),
        "all_team": json_safe(onsite),
        "warnings": json_safe(warnings),
        "field_slips": command_slips,
        "rule": "Team holds staff records. Onsite shows live worker GPS/status signals and people currently doing work.",
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
