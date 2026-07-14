import asyncio
from pathlib import Path
import types
import unittest

from bson import ObjectId
from fastapi import FastAPI, HTTPException

from backend import churvox_account_deletion_paid_launch as account_deletion
from backend import churvox_billing_portal_paid_launch as billing_portal
from backend import churvox_startup_patch_loader as startup_loader
from backend.churvox_signature_command_create_routes import route_signature_draft_area


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
    def test_authoritative_startup_loader_and_final_wrapper_own_protected_routes(self):
        self.assertIn("churvox_billing_portal_paid_launch", startup_loader.PATCH_MODULES)
        self.assertIn("churvox_account_deletion_paid_launch", startup_loader.PATCH_MODULES)
        self.assertLess(
            startup_loader.PATCH_MODULES.index("churvox_paid_launch_guard_patch"),
            startup_loader.PATCH_MODULES.index("churvox_billing_portal_paid_launch"),
        )
        outer = (Path(__file__).with_name("churvox_outer_cors_error_shield.py")).read_text(encoding="utf-8")
        self.assertIn("churvox_billing_portal_paid_launch", outer)
        self.assertIn("churvox_account_deletion_paid_launch", outer)
        self.assertLess(outer.index("churvox_login_emergency_final"), outer.index("churvox_billing_portal_paid_launch"))
        self.assertLess(outer.index("churvox_account_deletion_paid_launch"), outer.index("churvox_jwt_health_fingerprint_patch"))

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

    def test_billing_portal_repairs_a_stale_installed_marker(self):
        name = "test.billing.portal.stale"
        billing_portal.INSTALLED.add(name)
        module = types.SimpleNamespace(
            __name__=name,
            app=FastAPI(),
            get_current_user=signed_out,
            stripe=types.SimpleNamespace(),
        )

        billing_portal.install(module)
        route_for(module.app, "/api/billing/create-portal-session", "POST")
        self.assertIn(name, billing_portal.INSTALLED)

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

    def test_account_deletion_repairs_a_stale_installed_marker(self):
        name = "test.account.deletion.stale"
        account_deletion.INSTALLED.add(name)
        module = types.SimpleNamespace(
            __name__=name,
            app=FastAPI(),
            db=types.SimpleNamespace(),
            get_current_user=signed_out,
            ObjectId=ObjectId,
            stripe=types.SimpleNamespace(),
        )

        account_deletion.install(module)
        route_for(module.app, "/api/account/self-delete", "DELETE")
        route_for(module.app, "/api/account/self-delete", "POST")
        self.assertIn(name, account_deletion.INSTALLED)

    def test_job_done_command_slip_is_routed_to_operations_review(self):
        payload = route_signature_draft_area({
            "source_type": "job_done_closeout",
            "payload": {"area": "job-done", "prepared_only": True},
        })
        self.assertEqual(payload["source_type"], "job_done_closeout")
        self.assertEqual(payload["payload"]["area"], "operations_review")
        self.assertTrue(payload["payload"]["internal_draft_only"])
        self.assertTrue(payload["payload"]["source_records_unchanged"])
        self.assertTrue(payload["payload"]["external_actions_locked"])

    def test_money_radar_command_slip_is_routed_to_accounting_review(self):
        payload = route_signature_draft_area({
            "source_type": "money_radar_review",
            "payload": {"area": "money", "no_auto_mark_paid": True},
        })
        self.assertEqual(payload["source_type"], "money_radar_review")
        self.assertEqual(payload["payload"]["area"], "accounting_review")
        self.assertTrue(payload["payload"]["no_auto_mark_paid"])
        self.assertTrue(payload["payload"]["internal_draft_only"])

    def test_non_signature_command_slips_keep_their_existing_area(self):
        original = {"source_type": "booking", "payload": {"area": "work"}}
        payload = route_signature_draft_area(original)
        self.assertEqual(payload, original)
        self.assertIsNot(payload, original)

    def test_signature_create_router_is_registered_before_legacy_command_router(self):
        customize = (Path(__file__).resolve().parents[1] / "usercustomize.py").read_text(encoding="utf-8")
        signature_mount = "build_signature_command_create_router(local_db, local_get_current_user, ObjectId)"
        legacy_mount = "build_command_router(local_db, local_get_current_user, ObjectId)"
        self.assertIn(signature_mount, customize)
        self.assertIn(legacy_mount, customize)
        self.assertLess(customize.index(signature_mount), customize.index(legacy_mount))


if __name__ == "__main__":
    unittest.main()
