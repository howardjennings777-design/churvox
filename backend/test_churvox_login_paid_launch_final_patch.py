from datetime import datetime, timedelta, timezone
import unittest

from backend.churvox_login_paid_launch_final_patch import (
    LOCKOUT_FAILURES,
    LOCKOUT_MINUTES,
    lockout_active,
    next_failure_state,
    worker_disabled,
)


class FinalLoginRulesTest(unittest.TestCase):
    def test_lockout_begins_on_fifth_failure_and_lasts_fifteen_minutes(self):
        now = datetime(2026, 7, 12, 3, 0, tzinfo=timezone.utc)
        state = {}
        for _ in range(LOCKOUT_FAILURES):
            state = next_failure_state(state, now)

        self.assertEqual(state["count"], LOCKOUT_FAILURES)
        self.assertEqual(state["locked_until"], now + timedelta(minutes=LOCKOUT_MINUTES))
        self.assertTrue(lockout_active(state, now + timedelta(minutes=1)))
        self.assertFalse(lockout_active(state, now + timedelta(minutes=LOCKOUT_MINUTES, seconds=1)))

    def test_four_failures_do_not_lock_account(self):
        now = datetime(2026, 7, 12, 3, 0, tzinfo=timezone.utc)
        state = {}
        for _ in range(LOCKOUT_FAILURES - 1):
            state = next_failure_state(state, now)
        self.assertIsNone(state["locked_until"])
        self.assertFalse(lockout_active(state, now))

    def test_disabled_worker_variants_are_rejected(self):
        self.assertTrue(worker_disabled({"status": "disabled"}))
        self.assertTrue(worker_disabled({"active": False}))
        self.assertTrue(worker_disabled({"is_active": False}))
        self.assertTrue(worker_disabled({"revoked_at": "2026-07-12T00:00:00Z"}))
        self.assertFalse(worker_disabled({"status": "active", "active": True}))


if __name__ == "__main__":
    unittest.main()
