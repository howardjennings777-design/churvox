#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import re
import secrets
import sys
import types


def install_test_runtime_stubs():
    """Provide only the tiny FastAPI/BSON surface used by this in-memory test.

    Production still uses the real packages. These stubs exist solely so the
    pre-live behavioural test can run from a normal frontend Codespace without
    installing the complete backend environment.
    """

    try:
        import bson  # noqa: F401
    except ModuleNotFoundError:
        bson_module = types.ModuleType("bson")

        class ObjectId(str):
            def __new__(cls, value=None):
                raw = secrets.token_hex(12) if value is None else str(value)
                if not re.fullmatch(r"[0-9a-fA-F]{24}", raw):
                    raise ValueError(f"Invalid ObjectId: {raw}")
                return str.__new__(cls, raw.lower())

            @classmethod
            def is_valid(cls, value):
                return bool(re.fullmatch(r"[0-9a-fA-F]{24}", str(value or "")))

        bson_module.ObjectId = ObjectId
        sys.modules["bson"] = bson_module

    try:
        import fastapi  # noqa: F401
    except ModuleNotFoundError:
        fastapi_module = types.ModuleType("fastapi")

        class HTTPException(Exception):
            def __init__(self, status_code, detail=None, headers=None):
                self.status_code = int(status_code)
                self.detail = detail
                self.headers = headers
                super().__init__(str(detail or status_code))

        class Request:
            pass

        class _Route:
            def __init__(self, path, methods, endpoint):
                self.path = path
                self.methods = set(methods)
                self.endpoint = endpoint

        class APIRouter:
            def __init__(self, *args, **kwargs):
                self.routes = []

            def add_api_route(self, path, endpoint, methods=None, **kwargs):
                self.routes.append(_Route(path, methods or {"GET"}, endpoint))
                return endpoint

            def _register(self, method, path, **kwargs):
                def decorator(endpoint):
                    self.add_api_route(path, endpoint, methods={method})
                    return endpoint

                return decorator

            def get(self, path, **kwargs):
                return self._register("GET", path, **kwargs)

            def post(self, path, **kwargs):
                return self._register("POST", path, **kwargs)

            def put(self, path, **kwargs):
                return self._register("PUT", path, **kwargs)

            def patch(self, path, **kwargs):
                return self._register("PATCH", path, **kwargs)

            def delete(self, path, **kwargs):
                return self._register("DELETE", path, **kwargs)

            def include_router(self, router, prefix="", **kwargs):
                for route in getattr(router, "routes", []):
                    self.routes.append(_Route(f"{prefix}{route.path}", route.methods, route.endpoint))

        fastapi_module.APIRouter = APIRouter
        fastapi_module.HTTPException = HTTPException
        fastapi_module.Request = Request
        sys.modules["fastapi"] = fastapi_module


install_test_runtime_stubs()

import churvox_mimic_full_test as suite
from churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router
from churvox_command_human_mimic_source_normalizer import _normalize_job, _normalize_timer


_original_build_seed = suite.build_seed


def build_seed_with_true_edge_cases(business_a, business_b):
    seed, ids = _original_build_seed(business_a, business_b)

    # Keep the current weak recurring record in the future so only the two past
    # visits are eligible history. One historical gap is deliberately not enough
    # for strict v3 to infer a recurring cycle.
    for row in seed.get("jobs", []):
        if str(row.get("_id")) == str(ids["weak_repeat"]):
            row["scheduled_date"] = suite.iso(5)
        elif str(row.get("_id")) == str(ids["incomplete_job"]):
            # This record is intentionally labelled incomplete but already has
            # setup fields. It must not become an invoice/proof decision, and it
            # should not create a separate setup decision either.
            row["scheduled_date"] = suite.iso(2)
            row["worker_name"] = "Cam"

    for row in seed.get("messages", []):
        if str(row.get("_id")) == str(ids["message_duplicate_memory"]):
            # Isolate duplicate-memory logic from reply logic: this is an
            # internal imported note, not an inbound customer request.
            row["direction"] = "internal_note"
            row["status"] = "closed"

    return seed, ids


suite.build_seed = build_seed_with_true_edge_cases


async def run():
    suite.check(
        "dependency-free test runtime is active",
        "fastapi" in sys.modules and "bson" in sys.modules,
    )
    suite.check(
        "legacy incomplete status is normalized before reasoning",
        _normalize_job({"status": "incomplete"}).get("status") == "open",
    )
    suite.check(
        "legacy seconds timer is normalized to hours",
        _normalize_timer({"duration_seconds": 3600}).get("duration_hours") == 1,
    )
    await suite.main()

    marker_router = build_command_human_mimic_marker_router()
    marker = suite.endpoint(marker_router, "/command/human-mimic-marker", "GET")
    marker_result = await marker()
    preflight = marker_result.get("preflight") or {}
    suite.check(
        "deployment marker proves linked-invoice post-guard",
        marker_result.get("post_guard") == "linked-invoice-source-recheck-v1"
        and preflight.get("linked_invoice_postguard") is True,
    )
    suite.check(
        "deployment marker proves role-specific evidence guard",
        marker_result.get("role_schema_guard") == "role-required-evidence-v1"
        and preflight.get("role_specific_required_evidence") is True,
    )
    suite.check(
        "deployment marker proves strict manager summaries",
        marker_result.get("summary_guard") == "strict-surviving-queue-summary-v1"
        and preflight.get("manager_summaries_use_strict_queue") is True,
    )


if __name__ == "__main__":
    asyncio.run(run())
