from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path

from fastapi import FastAPI, HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parent))
import churvox_command_slip_decision_patch as patch


class DummyResult:
    matched_count = 0


class DummyCollection:
    async def update_many(self, query, update):
        return DummyResult()

    async def insert_one(self, row):
        return None


class DummyDB:
    def __getattr__(self, name):
        return DummyCollection()

    def __getitem__(self, name):
        return DummyCollection()


class FakeObjectId:
    def __init__(self, value):
        self.value = value


async def current_user(request):
    return {
        "id": "business-1",
        "business_id": "business-1",
        "email": "owner@example.com",
        "role": "owner",
    }


class RouteTests(unittest.TestCase):
    def test_final_routes_do_not_treat_request_as_query_input(self):
        module = types.SimpleNamespace(
            app=FastAPI(),
            db=DummyDB(),
            get_current_user=current_user,
            ObjectId=FakeObjectId,
            HTTPException=HTTPException,
        )
        patch.install(module)
        expected = {"/api/command/decision-route-health"}
        expected.update(
            {
                f"/api/command/slips/{{slip_id}}/{decision}"
                for decision in patch.DECISIONS
            }
        )
        found = {
            route.path
            for route in module.app.router.routes
            if route.path in expected
        }
        self.assertEqual(found, expected)
        for route in module.app.router.routes:
            if route.path not in expected:
                continue
            query_names = {item.name for item in route.dependant.query_params}
            self.assertNotIn("request", query_names)


if __name__ == "__main__":
    unittest.main()
