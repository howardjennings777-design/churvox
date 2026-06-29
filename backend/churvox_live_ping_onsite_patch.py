from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_worker_onsite_signal_patch as onsite_signal
import churvox_field_truth_patch as field_truth

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return onsite_signal.clean(value)


def json_safe(value):
    return field_truth.json_safe(value)


def bid(user):
    return field_truth.business_id_string(user)


def uid(user):
    return field_truth.user_id_string(user)


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="POST"):
    try:
        app.router.routes = [r for r in app.router.routes if not route_matches(r, path, method)]
    except Exception:
        pass


async def live_ping(db, user, ObjectId, payload):
    record = {
        "business_id": bid(user),
        "worker_id": uid(user),
        "worker_email": clean(user.get("email")),
        "worker_name": clean(user.get("name") or user.get("full_name") or user.get("email")),
        "payload": json_safe(payload),
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        await db.worker_live_pings.insert_one(record)
    except Exception:
        pass
    state = "stop" if clean(payload.get("clock_status") or payload.get("live_status") or payload.get("job_status")).lower() in {"clocked_out", "finished job", "completed", "complete", "stopped"} else "start"
    gps_payload = {
        "state": state,
        "source": clean(payload.get("source") or "worker-live-ping"),
        "job_id": clean(payload.get("job_id") or payload.get("jobId")),
        "job_title": clean(payload.get("job_title")),
        "location": payload.get("location") or payload.get("address"),
        "address": clean(payload.get("address")),
    }
    gps_payload.update({k: v for k, v in payload.items() if k in {"latitude", "longitude", "lat", "lng", "accuracy"}})
    result = await onsite_signal.save_signal(db, user, ObjectId, gps_payload)
    return {"success": True, "live_ping_saved": True, "onsite_signal": json_safe(result.get("gps") or result)}


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

    async def live_ping_endpoint(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        return json_safe(await live_ping(db, user, ObjectId, payload))

    remove_route(app, "/api/worker/live-ping", "POST")
    app.add_api_route("/api/worker/live-ping", live_ping_endpoint, methods=["POST"])
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
