from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_field_truth_patch as field_truth
import churvox_field_truth_fix_patch as field_truth_fix

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


async def read_payload(request):
    try:
        return await request.json()
    except Exception:
        return {}


def clean(value):
    return str(value or "").strip()


def json_safe(value):
    return field_truth.json_safe(value)


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

    async def more_time_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        payload = await read_payload(request)
        try:
            minutes = int(float(payload.get("minutes") or 30))
        except Exception:
            minutes = 30
        reason = clean(payload.get("reason") or "Worker needs more time on site.")
        slip = await field_truth_fix.fixed_create_field_slip(
            db,
            user,
            ObjectId,
            job_id,
            {"type": "more_time", "text": f"Needs about {minutes} more minutes. {reason}"},
        )
        return json_safe({"success": True, "slip": slip, "message": "Time request sent to Command for owner decision."})

    remove_route(app, "/api/worker/jobs/{job_id}/more-time", "POST")
    app.add_api_route("/api/worker/jobs/{job_id}/more-time", more_time_endpoint, methods=["POST"])
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
