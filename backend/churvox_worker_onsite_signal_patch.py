from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_field_truth_patch as field_truth

try:
    import churvox_onsite_signal_rows_patch  # noqa: F401
except Exception:
    pass

TARGETS = {"server", "backend.server"}
INSTALLED = set()
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


def default_bid(user):
    return field_truth.business_id_string(user)


def uid(user):
    return field_truth.user_id_string(user)


async def one(collection, query):
    try:
        return await collection.find_one(query)
    except Exception:
        return None


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="POST"):
    try:
        app.router.routes = [r for r in app.router.routes if not route_matches(r, path, method)]
    except Exception:
        pass


def number(value):
    try:
        return float(value)
    except Exception:
        return None


def obj_values(value, ObjectId):
    vals = []
    text = clean(value)
    if text:
        vals.append(text)
        try:
            vals.append(ObjectId(text))
        except Exception:
            pass
    return vals


def payload_location(payload):
    loc = payload.get("location") if isinstance(payload.get("location"), dict) else {}
    lat = number(payload.get("latitude") or payload.get("lat") or loc.get("latitude") or loc.get("lat"))
    lng = number(payload.get("longitude") or payload.get("lng") or payload.get("lon") or loc.get("longitude") or loc.get("lng") or loc.get("lon"))
    label = clean(payload.get("address") or payload.get("site") or payload.get("location") or loc.get("address_label") or loc.get("display_name") or loc.get("address"))
    accuracy = number(payload.get("accuracy") or loc.get("accuracy"))
    return lat, lng, label, accuracy


async def find_job_any_business(db, user, ObjectId, job_id, payload):
    vals = obj_values(job_id, ObjectId)
    if vals:
        query = {"$or": [{"_id": {"$in": vals}}, {"id": {"$in": [clean(job_id)]}}, {"job_id": {"$in": [clean(job_id)]}}, {"uuid": {"$in": [clean(job_id)]}}]}
        job = await one(db.jobs, query)
        if job:
            return job
    title = clean(payload.get("job_title"))
    address = clean(payload.get("address") or payload.get("location"))
    worker_email = clean(user.get("email"))
    soft = []
    if worker_email:
        soft.extend([{field: worker_email} for field in ["assigned_worker_email", "worker_email", "assigned_to_email"]])
    if title:
        soft.extend([{field: title} for field in ["title", "job_name", "description"]])
    if address:
        soft.extend([{field: address} for field in ["address", "site_address", "location"]])
    if soft:
        job = await one(db.jobs, {"$or": soft})
        if job:
            return job
    return None


async def find_team_business(db, user):
    email = clean(user.get("email"))
    worker = uid(user)
    names = [clean(user.get("name")), clean(user.get("full_name")), clean(user.get("display_name"))]
    clauses = []
    if email:
        clauses.extend([{field: email} for field in ["email", "worker_email", "assigned_worker_email"]])
    if worker:
        clauses.extend([{field: worker} for field in ["user_id", "worker_id", "id"]])
    for name in names:
        if name:
            clauses.extend([{field: name} for field in ["name", "worker_name", "full_name"]])
    if not clauses:
        return ""
    row = await one(db.team, {"$or": clauses})
    if not row:
        try:
            row = await db.team.find_one({"$or": clauses}, sort=[("updated_at", -1)])
        except Exception:
            row = None
    if row:
        return clean(row.get("business_id") or row.get("owner_business_id") or row.get("contractor_id") or row.get("created_by") or row.get("user_id"))
    return ""


def owner_business_from_job(job, fallback):
    if not job:
        return fallback
    for key in BUSINESS_KEYS:
        value = clean(job.get(key))
        if value:
            return value
    return fallback


async def resolve_owner_business(db, user, ObjectId, job, payload):
    fallback = default_bid(user)
    from_job = owner_business_from_job(job, "")
    if from_job:
        return from_job
    from_team = await find_team_business(db, user)
    return from_team or fallback


async def save_signal(db, user, ObjectId, payload):
    state = lower(payload.get("state") or payload.get("status") or "start")
    job_id = clean(payload.get("job_id") or payload.get("jobId"))
    lat, lng, supplied_location, accuracy = payload_location(payload)
    job = await find_job_any_business(db, user, ObjectId, job_id, payload) if job_id or payload.get("job_title") else None
    owner_business_id = await resolve_owner_business(db, user, ObjectId, job, payload)
    job_title = clean((job or {}).get("title") or (job or {}).get("job_name") or (job or {}).get("description") or payload.get("job_title"))
    job_address = clean((job or {}).get("address") or (job or {}).get("site_address") or (job or {}).get("location"))
    location = supplied_location or job_address
    map_query = f"{lat},{lng}" if lat is not None and lng is not None else (f"{location} New Zealand" if location else "")
    live_state = "off" if state in {"stop", "off", "complete", "completed", "clock_out", "clocked_out"} else "active_on_job"
    doc = {
        "business_id": owner_business_id,
        "worker_original_business_id": default_bid(user),
        "worker_id": uid(user),
        "user_id": uid(user),
        "worker_email": clean(user.get("email")),
        "worker_name": clean(user.get("name") or user.get("full_name") or user.get("email")),
        "state": live_state,
        "job_id": job_id,
        "job_title": job_title,
        "location": location or map_query,
        "map_query": map_query,
        "latitude": lat,
        "longitude": lng,
        "accuracy": accuracy,
        "source": clean(payload.get("source")),
        "updated_at": now_utc(),
        "after_hours_tracking": False,
        "rule": "Location is used as job proof only while the worker is clocked in.",
    }
    try:
        await db.worker_gps_status.update_one({"business_id": doc["business_id"], "worker_id": doc["worker_id"]}, {"$set": doc, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
    except Exception:
        pass
    return {"success": True, "gps": json_safe(doc)}


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

    async def post_status(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        return json_safe(await save_signal(db, user, ObjectId, payload))

    remove_route(app, "/api/worker/gps/status", "POST")
    app.add_api_route("/api/worker/gps/status", post_status, methods=["POST"])
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
