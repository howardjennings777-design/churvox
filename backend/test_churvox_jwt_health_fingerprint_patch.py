import asyncio
import hashlib
import os
import types
import unittest
from unittest import mock

from fastapi import FastAPI

from backend import churvox_jwt_health_fingerprint_patch as health_patch


def route_for(app):
    routes = [
        route
        for route in app.router.routes
        if getattr(route, "path", "") == health_patch.ROUTE_PATH
        and "GET" in set(getattr(route, "methods", set()) or set())
    ]
    if len(routes) != 1:
        raise AssertionError(f"Expected one health route, found {len(routes)}")
    return routes[0]


class JwtHealthFingerprintTest(unittest.TestCase):
    def test_database_source_reports_persistent_without_exposing_secret(self):
        secret = "database-secret-" + "z" * 60
        app = FastAPI()

        async def original_health():
            return {
                "success": True,
                "ready": True,
                "jwt_source": "runtime_generated",
                "jwt_persistent": False,
                "restart_persistence_ready": False,
                "login_route": "test-login-route",
            }

        app.add_api_route(health_patch.ROUTE_PATH, original_health, methods=["GET"])
        module = types.SimpleNamespace(
            app=app,
            JWT_SECRET=secret,
            CHURVOX_JWT_SECRET_SOURCE="database",
            CHURVOX_JWT_SECRET_PERSISTENT=True,
        )

        with mock.patch.dict(os.environ, {}, clear=True):
            health_patch.install(module)
            result = asyncio.run(route_for(app).endpoint())

        expected = hashlib.sha256(secret.encode("utf-8")).hexdigest()[:16]
        self.assertEqual(result["jwt_key_id"], expected)
        self.assertEqual(result["jwt_source"], "database")
        self.assertTrue(result["jwt_persistent"])
        self.assertTrue(result["restart_persistence_ready"])
        self.assertEqual(result["login_route"], "test-login-route")
        self.assertNotIn(secret, repr(result))
        self.assertEqual(len(result["jwt_key_id"]), 16)

    def test_runtime_generated_source_is_not_restart_ready(self):
        secret = "runtime-secret-" + "r" * 60
        app = FastAPI()

        async def original_health():
            return {"success": True, "ready": True}

        app.add_api_route(health_patch.ROUTE_PATH, original_health, methods=["GET"])
        module = types.SimpleNamespace(
            app=app,
            JWT_SECRET=secret,
            CHURVOX_JWT_SECRET_SOURCE="runtime_generated",
            CHURVOX_JWT_SECRET_PERSISTENT=False,
        )

        with mock.patch.dict(os.environ, {}, clear=True):
            health_patch.install(module)
            result = asyncio.run(route_for(app).endpoint())

        self.assertFalse(result["jwt_persistent"])
        self.assertFalse(result["restart_persistence_ready"])
        self.assertTrue(result["jwt_key_id"])

    def test_install_is_idempotent(self):
        secret = "environment-secret-" + "e" * 60
        app = FastAPI()

        async def original_health():
            return {"success": True}

        app.add_api_route(health_patch.ROUTE_PATH, original_health, methods=["GET"])
        module = types.SimpleNamespace(
            app=app,
            JWT_SECRET=secret,
            CHURVOX_JWT_SECRET_SOURCE="environment",
            CHURVOX_JWT_SECRET_PERSISTENT=True,
        )

        health_patch.install(module)
        health_patch.install(module)
        self.assertEqual(len([
            route for route in app.router.routes
            if getattr(route, "path", "") == health_patch.ROUTE_PATH
            and "GET" in set(getattr(route, "methods", set()) or set())
        ]), 1)


if __name__ == "__main__":
    unittest.main()
