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


def test_procfile_boot_force_installs_and_exposes_safe_marker(monkeypatch):
    inner = FakeInnerApp()
    server = SimpleNamespace(app=inner)
    start = ModuleType("churvox_start")
    start.app = inner
    start.server = server

    calls = []
    patch = ModuleType("churvox_paid_launch_live_patch")

    def install(module, force=False):
        calls.append((module, force))
        module.app.router.routes = [
            SimpleNamespace(path="/api/command/slips", methods={"GET"}, endpoint=named_endpoint("fast_slips")),
            SimpleNamespace(path="/api/command/scan", methods={"POST"}, endpoint=named_endpoint("fast_scan")),
            SimpleNamespace(path="/api/admin-brain/scan", methods={"POST"}, endpoint=named_endpoint("admin_brain_bridge")),
            SimpleNamespace(path="/api/paid-launch/backend-readiness", methods={"GET"}, endpoint=named_endpoint("readiness_marker")),
        ]

    patch.install = install
    monkeypatch.setitem(sys.modules, "churvox_start", start)
    monkeypatch.setitem(sys.modules, "churvox_paid_launch_live_patch", patch)

    namespace = runpy.run_path("backend/churvox_boot.py", run_name="churvox_boot_entrypoint_test")

    assert calls == [(server, True)]
    assert namespace["PATCH_INSTALLED"] is True
    assert namespace["PATCH_STAGE"] == "ready"
    assert namespace["VERSION"] == "churvox-command-queue-speed-boot-20260713e"

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
    assert payload["route_owners"]["/api/command/slips"] == ["GET:fast_slips"]
    assert payload["route_owners"]["/api/command/scan"] == ["POST:fast_scan"]
    assert payload["route_owners"]["/api/admin-brain/scan"] == ["POST:admin_brain_bridge"]
