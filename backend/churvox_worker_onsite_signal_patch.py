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


def bid(user):
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


async def save_signal(db, user, ObjectId, payload):
    state = lower(payload.get("state") or payload.get("status") or "start")
    job_id = clean(payload.get("job_id") or payload.get("jobId"))
    lat = number(payload.get("latitude") or payload.get("lat"))
    lng = number(payload.get("longitude") or payload.get("lng") or payload.get("lon"))
    job = None
    if job_id:
        try:
            job = await one(db.jobs, field_truth.job_lookup_query(user, ObjectId, job_id))
        except Exception:
            job = None
    job_title = clean((job or {}).get("title") or (job or {}).get("job_name") or (job or {}).get("description"))
    job_address = clean((job or {}).get("address") or (job or {}).get("site_address") or (job or {}).get("location"))
    location = clean(payload.get("location") or payload.get("address") or job_address)
    map_query = f"{lat},{lng}" if lat is not None and lng is not None else (f"{location} New Zealand" if location else "")
    live_state = "off" if state in {"stop", "off", "complete", "completed", "clock_out"} else "active_on_job"
    doc = {
        "business_id": bid(user),
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
