from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_field_truth_patch as field_truth
import churvox_onsite_patch as onsite_patch

TARGETS = {"server", "backend.server"}
INSTALLED = set()
_ORIGINAL_ONSITE_PAYLOAD = onsite_patch.onsite_payload
BUSINESS_KEYS = ["business_id", "owner_business_id", "contractor_id", "created_by", "user_id"]


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    if isinstance(value, dict):
        return str(value.get("address_label") or value.get("display_name") or value.get("address") or value.get("location") or "").strip()
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def json_safe(value):
    return field_truth.json_safe(value)


def user_id(user):
    return field_truth.user_id_string(user)


def business_id(user):
    return field_truth.business_id_string(user)


def number(value):
    try:
        return float(value)
    except Exception:
        return None


def obj_values(value, ObjectId):
    text = clean(value)
    values = []
    if text:
        values.append(text)
        try:
            values.append(ObjectId(text))
        except Exception:
            pass
    return values


async def one(collection, query):
    try:
        return await collection.find_one(query)
    except Exception:
        return None


async def recent(collection, query, limit=80):
    try:
        return await collection.find(query).sort("updated_at", -1).limit(limit).to_list(length=limit)
    except Exception:
        try:
            return await collection.find(query).limit(limit).to_list(length=limit)
        except Exception:
            return []


def payload_location(payload):
    loc = payload.get("location") if isinstance(payload.get("location"), dict) else {}
    lat = number(payload.get("latitude") or payload.get("lat") or loc.get("latitude") or loc.get("lat"))
    lng = number(payload.get("longitude") or payload.get("lng") or payload.get("lon") or loc.get("longitude") or loc.get("lng") or loc.get("lon"))
    accuracy = number(payload.get("accuracy") or loc.get("accuracy"))
    label = clean(payload.get("address") or payload.get("site_address") or payload.get("site") or payload.get("location") or loc.get("address_label") or loc.get("display_name") or loc.get("address"))
    return lat, lng, accuracy, label


def job_title(job):
    return clean((job or {}).get("title") or (job or {}).get("job_title") or (job or {}).get("job_name") or (job or {}).get("description") or "Job")


def job_location(job):
    return clean((job or {}).get("address") or (job or {}).get("site_address") or (job or {}).get("service_address") or (job or {}).get("job_address") or (job or {}).get("location") or "")


def job_worker(job):
    return clean((job or {}).get("assigned_worker_name") or (job or {}).get("worker_name") or (job or {}).get("worker") or (job or {}).get("assigned_to_name") or (job or {}).get("assigned_to") or (job or {}).get("assigned_worker_email") or (job or {}).get("worker_email") or "Worker")


def job_business(job, fallback=""):
    for key in BUSINESS_KEYS:
        value = clean((job or {}).get(key))
        if value:
            return value
    return fallback


async def find_job(db, ObjectId, job_id, payload):
    values = obj_values(job_id, ObjectId)
    if values:
        job = await one(db.jobs, {"$or": [{"_id": {"$in": values}}, {"id": clean(job_id)}, {"job_id": clean(job_id)}, {"uuid": clean(job_id)}]})
        if job:
            return job
    title = clean(payload.get("job_title"))
    address = clean(payload.get("address") or payload.get("location"))
    clauses = []
    if title:
        clauses.extend([{field: title} for field in ["title", "job_title", "job_name", "description"]])
    if address:
        clauses.extend([{field: address} for field in ["address", "site_address", "service_address", "job_address", "location"]])
    if clauses:
        return await one(db.jobs, {"$or": clauses})
    return None


async def team_business(db, user):
    email = clean(user.get("email"))
    uid = user_id(user)
    name = clean(user.get("name") or user.get("full_name") or user.get("display_name"))
    clauses = []
    if uid:
        clauses.extend([{field: uid} for field in ["user_id", "worker_id", "id"]])
    if email:
        clauses.extend([{field: email} for field in ["email", "worker_email", "assigned_worker_email"]])
    if name:
        clauses.extend([{field: name} for field in ["name", "worker_name", "full_name"]])
    if not clauses:
        return ""
    row = await one(db.team, {"$or": clauses})
    return clean((row or {}).get("business_id") or (row or {}).get("owner_business_id") or (row or {}).get("contractor_id") or (row or {}).get("created_by"))


async def resolve_business(db, user, ObjectId, job, payload):
    from_payload = clean(payload.get("business_id") or payload.get("owner_business_id"))
    if from_payload:
        return from_payload
    from_job = job_business(job)
    if from_job:
        return from_job
    from_team = await team_business(db, user)
    if from_team:
        return from_team
    return business_id(user)


def state_from_payload(payload):
    raw = lower(payload.get("state") or payload.get("status") or payload.get("clock_status") or payload.get("live_status") or "start")
    if raw in {"stop", "off", "complete", "completed", "finish", "finished", "clock_out", "clocked_out"}:
        return "off"
    return "active_on_job"


def beacon_row(row):
    lat = row.get("latitude")
    lng = row.get("longitude")
    coords = f"{lat},{lng}" if lat is not None and lng is not None else ""
    location = clean(coords or row.get("location") or row.get("map_query"))
    return {
        "id": clean(row.get("worker_id") or row.get("user_id") or row.get("worker_email") or row.get("id")),
        "name": clean(row.get("worker_name") or row.get("worker_email") or "Worker"),
        "role": "Worker",
        "status": "Clocked in" if lower(row.get("state")) != "off" else "Off",
        "active": lower(row.get("state")) != "off",
        "job": clean(row.get("job_title") or row.get("job_id") or "Current job"),
        "jobs": [],
        "gps": location,
        "location": location,
        "map_query": location,
        "start": clean(row.get("started_at") or row.get("updated_at")),
        "end": clean(row.get("stopped_at")),
        "proof": "Live beacon received" if lower(row.get("state")) != "off" else "Worker offsite",
        "messages": clean(row.get("source") or "Onsite beacon"),
        "timesheet": "Clocked in" if lower(row.get("state")) != "off" else "Clocked out",
        "updated_at": row.get("updated_at"),
        "source": "onsite_worker_beacon",
    }


async def save_beacon(db, user, ObjectId, payload):
    job_id = clean(payload.get("job_id") or payload.get("jobId"))
    job = await find_job(db, ObjectId, job_id, payload)
    owner_business = await resolve_business(db, user, ObjectId, job, payload)
    lat, lng, accuracy, supplied_location = payload_location(payload)
    location = supplied_location or job_location(job)
    state = state_from_payload(payload)
    doc = {
        "business_id": owner_business,
        "worker_original_business_id": business_id(user),
        "worker_id": user_id(user),
        "user_id": user_id(user),
        "worker_email": clean(user.get("email")),
        "worker_name": clean(user.get("name") or user.get("full_name") or user.get("display_name") or user.get("email")),
        "state": state,
        "job_id": job_id,
        "job_title": clean(payload.get("job_title") or job_title(job)),
        "location": location,
        "map_query": f"{lat},{lng}" if lat is not None and lng is not None else location,
        "latitude": lat,
        "longitude": lng,
        "accuracy": accuracy,
        "source": clean(payload.get("source") or "worker-beacon"),
        "updated_at": now_utc(),
        "after_hours_tracking": False,
        "rule": "Onsite beacon is used only while worker is doing a job or clocking time.",
    }
    if state == "active_on_job":
        doc["started_at"] = now_utc()
    else:
        doc["stopped_at"] = now_utc()
    try:
        await db.onsite_worker_beacons.update_one({"business_id": owner_business, "worker_id": doc["worker_id"]}, {"$set": doc, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
    except Exception:
        pass
    try:
        await db.worker_gps_status.update_one({"business_id": owner_business, "worker_id": doc["worker_id"]}, {"$set": doc, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
    except Exception:
        pass
    return {"success": True, "beacon": json_safe(doc)}


async def onsite_payload(db, user):
    payload = await _ORIGINAL_ONSITE_PAYLOAD(db, user)
    rows = payload.get("onsite") if isinstance(payload.get("onsite"), list) else []
    warnings = payload.get("warnings") if isinstance(payload.get("warnings"), list) else []
    seen = {clean(row.get("id") or row.get("worker_id") or row.get("worker_email") or row.get("name")) for row in rows}
    beacons = await recent(db.onsite_worker_beacons, {"business_id": business_id(user)}, 80)
    added = 0
    for beacon in beacons:
        row = beacon_row(beacon)
        if not row.get("active"):
            continue
        key = clean(row.get("id") or row.get("name"))
        if key and key in seen:
            continue
        rows.insert(0, row)
        seen.add(key)
        added += 1
    if added:
        warnings.insert(0, {"type": "live_beacon", "message": f"{added} worker live beacon{'' if added == 1 else 's'} received."})
    payload["onsite"] = json_safe(rows)
    payload["warnings"] = json_safe(warnings)
    counts = dict(payload.get("counts") or {})
    counts["onsite"] = len([row for row in rows if row.get("active")])
    counts["warnings"] = len(warnings)
    payload["counts"] = counts
    payload["rule"] = "Worker app writes a clean Onsite beacon. Boss Onsite reads beacons first, then GPS, then job address fallback."
    return json_safe(payload)


onsite_patch.onsite_payload = onsite_payload


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="POST"):
    try:
        app.router.routes = [r for r in app.router.routes if not route_matches(r, path, method)]
    except Exception:
        pass


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

    async def beacon_endpoint(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        return json_safe(await save_beacon(db, user, ObjectId, payload))

    async def beacon_debug_endpoint(request: Request):
        user = await get_current_user(request)
        rows = await recent(db.onsite_worker_beacons, {"business_id": business_id(user)}, 30)
        return json_safe({"success": True, "business_id": business_id(user), "count": len(rows), "rows": [json_safe(row) for row in rows], "updated_at": now_utc()})

    remove_route(app, "/api/onsite/worker-beacon", "POST")
    app.add_api_route("/api/onsite/worker-beacon", beacon_endpoint, methods=["POST"])
    remove_route(app, "/api/onsite/beacon-debug", "GET")
    app.add_api_route("/api/onsite/beacon-debug", beacon_debug_endpoint, methods=["GET"])
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
