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


def json_safe(value):
    return field_truth.json_safe(value)


def bid(user):
    return field_truth.business_id_string(user)


def uid(user):
    return field_truth.user_id_string(user)


async def recent(collection, query, limit=25):
    try:
        return await collection.find(query).sort("updated_at", -1).limit(limit).to_list(length=limit)
    except Exception:
        try:
            return await collection.find(query).limit(limit).to_list(length=limit)
        except Exception:
            return []


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [r for r in app.router.routes if not route_matches(r, path, method)]
    except Exception:
        pass


def summarize(row):
    return {
        "business_id": clean(row.get("business_id")),
        "worker_original_business_id": clean(row.get("worker_original_business_id")),
        "worker_id": clean(row.get("worker_id") or row.get("user_id")),
        "worker_email": clean(row.get("worker_email") or row.get("email")),
        "worker_name": clean(row.get("worker_name") or row.get("name")),
        "state": clean(row.get("state") or row.get("status")),
        "job_id": clean(row.get("job_id")),
        "job_title": clean(row.get("job_title") or row.get("title")),
        "location": clean(row.get("location")),
        "map_query": clean(row.get("map_query")),
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
        "updated_at": row.get("updated_at"),
        "source": clean(row.get("source")),
    }


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

    async def debug_endpoint(request: Request):
        user = await get_current_user(request)
        business = bid(user)
        worker = uid(user)
        email = clean(user.get("email"))
        gps_rows = await recent(db.worker_gps_status, {"business_id": business}, 30)
        cross_query = {"$or": [{"worker_id": worker}, {"user_id": worker}, {"worker_email": email}, {"worker_original_business_id": business}]}
        cross_rows = await recent(db.worker_gps_status, cross_query, 30)
        team_rows = await recent(db.team, {"business_id": business}, 10)
        return json_safe({
            "success": True,
            "business_id_seen_by_boss": business,
            "user_id_seen_by_debug": worker,
            "user_email_seen_by_debug": email,
            "gps_count_for_boss_business": len(gps_rows),
            "gps_rows_for_boss_business": [summarize(row) for row in gps_rows],
            "cross_business_worker_gps_count": len(cross_rows),
            "cross_business_worker_gps_rows": [summarize(row) for row in cross_rows],
            "team_count_sample": len(team_rows),
            "team_sample": [summarize(row) for row in team_rows],
            "hint": "If cross_business_worker_gps_count is above 0 but gps_count_for_boss_business is 0, worker GPS was saved under the wrong business before the owner-business patch.",
            "updated_at": now_utc(),
        })

    remove_route(app, "/api/onsite/debug", "GET")
    app.add_api_route("/api/onsite/debug", debug_endpoint, methods=["GET"])
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
