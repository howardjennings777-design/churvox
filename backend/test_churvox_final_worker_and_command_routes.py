from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request

sys.path.insert(0, str(Path(__file__).resolve().parent))
import churvox_command_slip_create_patch as command_create
import churvox_field_loop_patch as field_loop


class DummyInsert:
    inserted_id = "created-slip-id"


class DummyCollection:
    async def insert_one(self, row):
        return DummyInsert()


class DummyDB:
    def __getattr__(self, name):
        return DummyCollection()

    def __getitem__(self, name):
        return DummyCollection()


class FakeObjectId:
    def __init__(self, value):
        self.value = value


async def current_user(request):
    return {"id": "business-1", "business_id": "business-1", "email": "owner@example.com", "role": "owner"}


class RouteTests(unittest.TestCase):
    def test_command_create_request_is_not_a_query_parameter(self):
        module = types.SimpleNamespace(app=FastAPI(), db=DummyDB(), get_current_user=current_user, HTTPException=HTTPException)
        command_create.install(module)
        routes = [route for route in module.app.router.routes if route.path in {"/api/command/slips", "/api/command/create-route-health"}]
        self.assertEqual({route.path for route in routes}, {"/api/command/slips", "/api/command/create-route-health"})
        for route in routes:
            self.assertNotIn("request", {item.name for item in route.dependant.query_params})

    def test_field_loop_registers_worker_job_action_aliases(self):
        field_loop.INSTALLED.clear()
        module = types.SimpleNamespace(
            __name__="test_field_loop_module",
            app=FastAPI(),
            db=DummyDB(),
            get_current_user=current_user,
            ObjectId=FakeObjectId,
            Request=Request,
            HTTPException=HTTPException,
        )
        field_loop.install(module)
        expected = {f"/api/worker/jobs/{{job_id}}/{action}" for action in ("acknowledge", "start", "pause", "resume", "complete")}
        found = {route.path for route in module.app.router.routes if route.path in expected}
        self.assertEqual(found, expected)
        for route in module.app.router.routes:
            if route.path in expected:
                self.assertNotIn("request", {item.name for item in route.dependant.query_params})


if __name__ == "__main__":
    unittest.main()
