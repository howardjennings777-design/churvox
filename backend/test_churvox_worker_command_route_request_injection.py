from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request

import churvox_worker_command_visibility_patch as visibility
import churvox_worker_field_slip_decision_patch as decision


class DummyCollection:
    pass


class DummyDB:
    def __getattr__(self, name):
        return DummyCollection()

    def __getitem__(self, name):
        return DummyCollection()


async def current_user(request):
    return {"id": "507f1f77bcf86cd799439011", "role": "owner"}


def fake_server(name):
    return types.SimpleNamespace(
        __name__=name,
        app=FastAPI(),
        db=DummyDB(),
        get_current_user=current_user,
        ObjectId=ObjectId,
        Request=Request,
        HTTPException=HTTPException,
    )


class WorkerCommandRequestInjectionTests(unittest.TestCase):
    def assert_request_injected(self, route):
        self.assertEqual(route.dependant.request_param_name, "request")
        self.assertNotIn("request", [field.name for field in route.dependant.query_params])

    def test_command_slips_request_is_not_a_query_parameter(self):
        server = fake_server("visibility-request-test")
        visibility.install(server)
        route = next(route for route in server.app.routes if getattr(route, "path", "") == "/api/command/slips" and "GET" in getattr(route, "methods", set()))
        self.assert_request_injected(route)

    def test_field_slip_decision_request_is_not_a_query_parameter(self):
        server = fake_server("decision-request-test")
        decision.install(server)
        route = next(route for route in server.app.routes if getattr(route, "path", "") == "/api/command/field-slips/{slip_id}/{decision}" and "POST" in getattr(route, "methods", set()))
        self.assert_request_injected(route)


if __name__ == "__main__":
    unittest.main()
