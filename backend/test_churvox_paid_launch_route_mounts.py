import asyncio
import types
import unittest

from bson import ObjectId
from fastapi import FastAPI, HTTPException

from backend import churvox_account_deletion_paid_launch as account_deletion
from backend import churvox_billing_portal_paid_launch as billing_portal
from backend import churvox_startup_patch_loader as startup_loader


async def signed_out(_request):
    raise HTTPException(status_code=401, detail="Not authenticated")


def route_for(app, path, method):
    matches = [
        route
        for route in app.router.routes
        if getattr(route, "path", "") == path
        and method in set(getattr(route, "methods", set()) or set())
    ]
    if len(matches) != 1:
        raise AssertionError(f"Expected one {method} route for {path}, found {len(matches)}")
    return matches[0]


class PaidLaunchRouteMountTest(unittest.TestCase):
    def test_authoritative_startup_loader_owns_billing_and_deletion_patches(self):
        self.assertIn("churvox_billing_portal_paid_launch", startup_loader.PATCH_MODULES)
        self.assertIn("churvox_account_deletion_paid_launch", startup_loader.PATCH_MODULES)
        self.assertLess(
            startup_loader.PATCH_MODULES.index("churvox_paid_launch_guard_patch"),
            startup_loader.PATCH_MODULES.index("churvox_billing_portal_paid_launch"),
        )

    def test_billing_portal_post_is_mounted_and_signed_out_returns_401(self):
        name = "test.billing.portal.server"
        billing_portal.INSTALLED.discard(name)
        module = types.SimpleNamespace(
            __name__=name,
            app=FastAPI(),
            get_current_user=signed_out,
            stripe=types.SimpleNamespace(),
        )

        billing_portal.install(module)
        route = route_for(module.app, "/api/billing/create-portal-session", "POST")

        with self.assertRaises(HTTPException) as captured:
            asyncio.run(route.endpoint(object()))
        self.assertEqual(captured.exception.status_code, 401)

    def test_account_deletion_delete_and_post_are_mounted_and_protected(self):
        name = "test.account.deletion.server"
        account_deletion.INSTALLED.discard(name)
        module = types.SimpleNamespace(
            __name__=name,
            app=FastAPI(),
            db=types.SimpleNamespace(),
            get_current_user=signed_out,
            ObjectId=ObjectId,
            stripe=types.SimpleNamespace(),
        )

        account_deletion.install(module)
        delete_route = route_for(module.app, "/api/account/self-delete", "DELETE")
        post_route = route_for(module.app, "/api/account/self-delete", "POST")

        for route in (delete_route, post_route):
            with self.assertRaises(HTTPException) as captured:
                asyncio.run(route.endpoint(object()))
            self.assertEqual(captured.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
