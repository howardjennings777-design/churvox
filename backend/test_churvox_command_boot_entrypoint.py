from __future__ import annotations

import asyncio
import json
import runpy
import sys
from types import ModuleType, SimpleNamespace


def named_endpoint(name):
    async def endpoint(*_args, **_kwargs):
        return None
    endpoint.__name__ = name
    return endpoint


class FakeInnerApp:
    def __init__(self):
        self.router = SimpleNamespace(routes=[])

    async def __call__(self, _scope, _receive, send):
        await send({"type": "http.response.start", "status": 204, "headers": []})
        await send({"type": "http.response.body", "body": b""})


def replace_route(app, path, method, endpoint_name):
    method = method.upper()
    app.router.routes = [
        route for route in app.router.routes
        if not (route.path == path and method in set(route.methods or set()))
    ]
    app.router.routes.append(SimpleNamespace(path=path, methods={method}, endpoint=named_endpoint(endpoint_name)))


def test_procfile_boot_installs_recommendations_after_fast_routes(monkeypatch):
    inner = FakeInnerApp()
    server = SimpleNamespace(app=inner, __name__="server")
    start = ModuleType("churvox_start")
    start.app = inner
    start.server = server

    fast_calls = []
    fast_patch = ModuleType("churvox_paid_launch_live_patch")

    def fast_install(module, force=False):
        fast_calls.append((module, force))
        module.app.router.routes = [
            SimpleNamespace(path="/api/command/slips", methods={"GET"}, endpoint=named_endpoint("fast_slips")),
            SimpleNamespace(path="/api/command/scan", methods={"POST"}, endpoint=named_endpoint("fast_scan")),
            SimpleNamespace(path="/api/command/slips/{slip_id}/approve", methods={"POST"}, endpoint=named_endpoint("base_approve")),
            SimpleNamespace(path="/api/admin-brain/scan", methods={"POST"}, endpoint=named_endpoint("admin_brain_bridge")),
            SimpleNamespace(path="/api/paid-launch/backend-readiness", methods={"GET"}, endpoint=named_endpoint("readiness_marker")),
        ]

    fast_patch.install = fast_install

    engine_calls = []
    engine = ModuleType("churvox_command_runs_office_patch")
    engine.VERSION = "churvox-command-runs-office-v1-20260715"
    engine.INSTALLED = {"server"}  # startup loader installed it before fast routes replaced it

    def engine_install(module):
        engine_calls.append(module)
        replace_route(module.app, "/api/command/slips", "GET", "command_slips_run_office")
        replace_route(module.app, "/api/command/scan", "POST", "command_scan_runs_office")
        engine.INSTALLED.add(module.__name__)

    engine.install = engine_install

    finalizer_calls = []
    finalizer = ModuleType("churvox_command_runs_office_finalizer_patch")
    finalizer.VERSION = "churvox-command-runs-office-finalizer-v4-20260715"
    finalizer.PUBLIC_CONTRACT_VERSION = "churvox-command-runs-office-v2-20260715"
    finalizer.INSTALLED = set()

    def finalizer_install(module):
        finalizer_calls.append(module)
        engine.VERSION = finalizer.PUBLIC_CONTRACT_VERSION
        replace_route(module.app, "/api/command/slips/{slip_id}/approve", "POST", "approve_with_ranked_worker_recommendation")
        finalizer.INSTALLED.add(module.__name__)

    finalizer.install = finalizer_install

    monkeypatch.setitem(sys.modules, "churvox_start", start)
    monkeypatch.setitem(sys.modules, "churvox_paid_launch_live_patch", fast_patch)
    monkeypatch.setitem(sys.modules, "churvox_command_runs_office_patch", engine)
    monkeypatch.setitem(sys.modules, "churvox_command_runs_office_finalizer_patch", finalizer)

    namespace = runpy.run_path("backend/churvox_boot.py", run_name="churvox_boot_entrypoint_test")

    assert fast_calls == [(server, True)]
    assert finalizer_calls == [server]
    assert engine_calls == [server]
    assert engine.INSTALLED == {"server"}
    assert namespace["PATCH_INSTALLED"] is True
    assert namespace["PATCH_STAGE"] == "ready"
    assert namespace["VERSION"] == "churvox-command-runs-office-boot-20260715a"
    assert namespace["RECOMMENDATION_CONTRACT_VERSION"] == "churvox-command-runs-office-v2-20260715"

    app = namespace["app"]
    sent = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        sent.append(message)

    asyncio.run(app({
        "type": "http",
        "method": "GET",
        "path": "/api/command-fast-load/boot",
        "headers": [],
    }, receive, send))

    assert sent[0]["status"] == 200
    payload = json.loads(sent[1]["body"])
    assert payload["ready"] is True
    assert payload["patch_installed"] is True
    assert payload["patch_stage"] == "ready"
    assert payload["recommendation_contract_version"] == "churvox-command-runs-office-v2-20260715"
    assert payload["recommendation_finalizer_version"] == "churvox-command-runs-office-finalizer-v4-20260715"
    assert payload["route_owners"]["/api/command/slips"] == ["GET:command_slips_run_office"]
    assert payload["route_owners"]["/api/command/scan"] == ["POST:command_scan_runs_office"]
    assert payload["route_owners"]["/api/command/slips/{slip_id}/approve"] == ["POST:approve_with_ranked_worker_recommendation"]
    assert payload["route_owners"]["/api/admin-brain/scan"] == ["POST:admin_brain_bridge"]
