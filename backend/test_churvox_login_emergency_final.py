from datetime import datetime, timedelta, timezone
import importlib
import types
import unittest
from unittest import mock

from backend.churvox_login_emergency_final import (
    LOCKOUT_FAILURES,
    LOCKOUT_MINUTES,
    PLATFORM_OWNER_EMAIL,
    _patch_worker_lockout_helpers,
    account_disabled,
    lockout_active,
    next_failure_state,
    paid_app_access,
    self_owned_legacy_owner,
    tester_access,
)


class EmergencyLoginRulesTest(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 7, 12, 6, 0, tzinfo=timezone.utc)

    def test_cancelled_owner_can_authenticate_but_is_sent_to_plans(self):
        user = {
            "email": "owner@example.test",
            "role": "employer",
            "status": "active",
            "subscription_status": "cancelled",
            "email_verified": True,
            "stripe_subscription_id": "sub_old",
        }
        self.assertFalse(account_disabled(user))
        self.assertFalse(paid_app_access(user, self.now))

    def test_expired_billing_status_is_not_identity_revocation(self):
        user = {
            "email": "owner@example.test",
            "role": "owner",
            "status": "expired",
            "email_verified": True,
        }
        self.assertFalse(account_disabled(user))
        self.assertFalse(paid_app_access(user, self.now))

    def test_explicitly_disabled_owner_is_blocked(self):
        self.assertTrue(account_disabled({
            "email": "owner@example.test",
            "role": "owner",
            "account_status": "disabled",
        }))
        self.assertTrue(account_disabled({
            "email": "owner@example.test",
            "role": "owner",
            "account_locked": True,
        }))

    def test_cancelled_worker_is_blocked(self):
        self.assertTrue(account_disabled({
            "email": "worker@example.test",
            "role": "worker",
            "status": "cancelled",
        }))

    def test_self_owned_legacy_owner_is_repaired_not_disabled(self):
        user = {
            "_id": "legacy-owner",
            "business_id": "legacy-owner",
            "email": "legacy@example.test",
            "role": "worker",
            "status": "cancelled",
            "subscription_status": "cancelled",
            "email_verified": True,
        }
        self.assertTrue(self_owned_legacy_owner(user))
        self.assertFalse(account_disabled(user))
        self.assertFalse(paid_app_access(user, self.now))

    def test_real_worker_with_other_business_remains_disabled(self):
        user = {
            "_id": "worker-1",
            "business_id": "owner-1",
            "email": "worker@example.test",
            "role": "worker",
            "status": "cancelled",
        }
        self.assertFalse(self_owned_legacy_owner(user))
        self.assertTrue(account_disabled(user))

    def test_current_tester_grant_survives_old_cancelled_billing(self):
        user = {
            "email": "tester@example.test",
            "role": "employer",
            "status": "active",
            "subscription_status": "cancelled",
            "free_tester_access": True,
            "free_tester_until": self.now + timedelta(days=30),
            "email_verified": True,
        }
        self.assertTrue(tester_access(user, self.now))
        self.assertTrue(paid_app_access(user, self.now))

    def test_revoked_tester_grant_does_not_disable_identity(self):
        user = {
            "email": "tester@example.test",
            "role": "employer",
            "status": "active",
            "subscription_status": "cancelled",
            "free_tester_access": True,
            "free_tester_revoked_at": self.now,
            "email_verified": True,
        }
        self.assertFalse(account_disabled(user))
        self.assertFalse(tester_access(user, self.now))
        self.assertFalse(paid_app_access(user, self.now))

    def test_current_no_card_trial_has_access_without_stripe_proof(self):
        user = {
            "email": "trial@example.test",
            "role": "employer",
            "plan": "solo",
            "subscription_status": "trialing",
            "trial_ends_at": self.now + timedelta(days=14),
            "email_verified": True,
        }
        self.assertTrue(paid_app_access(user, self.now))

    def test_expired_or_undated_trial_is_locked(self):
        base = {
            "email": "trial@example.test",
            "role": "employer",
            "plan": "solo",
            "subscription_status": "trialing",
            "email_verified": True,
        }
        self.assertFalse(paid_app_access({
            **base,
            "trial_ends_at": self.now - timedelta(seconds=1),
        }, self.now))
        self.assertFalse(paid_app_access(base, self.now))

    def test_verified_paid_status_overrides_stale_cached_access_flags(self):
        user = {
            "email": "paid@example.test",
            "role": "employer",
            "status": "active",
            "subscription_status": "active",
            "email_verified": True,
            "stripe_subscription_id": "sub_live",
            "has_app_access": False,
            "billing_lock_reason": "old_cache",
        }
        self.assertTrue(paid_app_access(user, self.now))

    def test_platform_owner_is_exact_email_only(self):
        self.assertTrue(paid_app_access({"email": PLATFORM_OWNER_EMAIL, "role": "owner"}, self.now))
        self.assertFalse(paid_app_access({
            "email": "other@example.test",
            "role": "owner",
            "is_platform_owner": True,
            "subscription_status": "none",
            "email_verified": True,
        }, self.now))

    def test_fifth_failure_starts_fifteen_minute_lockout(self):
        state = {}
        for _ in range(LOCKOUT_FAILURES):
            state = next_failure_state(state, self.now)
        self.assertEqual(state["count"], LOCKOUT_FAILURES)
        self.assertEqual(state["locked_until"], self.now + timedelta(minutes=LOCKOUT_MINUTES))
        self.assertTrue(lockout_active(state, self.now + timedelta(minutes=1)))

    def test_first_failure_after_expired_lockout_restarts_at_one(self):
        expired = {
            "count": LOCKOUT_FAILURES,
            "locked_until": self.now - timedelta(seconds=1),
        }
        state = next_failure_state(expired, self.now)
        self.assertEqual(state["count"], 1)
        self.assertIsNone(state["locked_until"])
        self.assertFalse(lockout_active(state, self.now))

    def test_critical_owner_repair_must_be_confirmed_before_tokens(self):
        source = (__import__("pathlib").Path(__file__).parent / "churvox_login_emergency_final.py").read_text()
        self.assertIn('critical_repair = bool(', source)
        self.assertIn('"user-repair-error"', source)
        self.assertIn('"user-repair-missing"', source)

    def test_logout_source_never_claims_unconfirmed_revocation(self):
        source = (__import__("pathlib").Path(__file__).parent / "churvox_login_emergency_final.py").read_text()
        self.assertIn('"sessions_revoked": sessions_revoked', source)
        self.assertNotIn('"sessions_revoked": True', source)
        self.assertIn('"logout-revocation-error"', source)

    def test_launch_status_requires_stripe_secret_formats(self):
        source = (__import__("pathlib").Path(__file__).parent / "churvox_production_launch_security.py").read_text()
        self.assertIn('startswith("sk" + "_")', source)
        self.assertIn('startswith("whsec" + "_")', source)

    def test_worker_route_helper_is_patched_to_same_reset_logic(self):
        fake = types.SimpleNamespace(
            next_failure_state=lambda *_: {"count": 99},
            _attempt_key=lambda *_: "wrong",
            LOCKOUT_FAILURES=99,
            LOCKOUT_MINUTES=99,
        )
        original = importlib.import_module

        def mocked(name):
            if name in {
                "churvox_login_paid_launch_final_patch",
                "backend.churvox_login_paid_launch_final_patch",
            }:
                return fake
            return original(name)

        with mock.patch("backend.churvox_login_emergency_final.importlib.import_module", side_effect=mocked):
            _patch_worker_lockout_helpers()

        expired = {
            "count": LOCKOUT_FAILURES,
            "locked_until": self.now - timedelta(seconds=1),
        }
        self.assertEqual(fake.next_failure_state(expired, self.now)["count"], 1)
        self.assertEqual(fake.LOCKOUT_FAILURES, LOCKOUT_FAILURES)
        self.assertEqual(fake.LOCKOUT_MINUTES, LOCKOUT_MINUTES)
        request = types.SimpleNamespace(
            headers={},
            client=types.SimpleNamespace(host="127.0.0.1"),
        )
        self.assertEqual(
            fake._attempt_key(request, "worker@example.test", "worker-login"),
            fake._attempt_key(request, "worker@example.test", "owner-login"),
        )


if __name__ == "__main__":
    unittest.main()
