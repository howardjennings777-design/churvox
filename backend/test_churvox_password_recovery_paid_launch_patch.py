from datetime import datetime, timedelta, timezone
import unittest

from backend.churvox_password_recovery_paid_launch_patch import (
    account_disabled,
    session_is_revoked,
)


class PasswordRecoverySessionTest(unittest.TestCase):
    def test_token_issued_before_password_change_is_revoked(self):
        changed = datetime(2026, 7, 12, 3, 0, tzinfo=timezone.utc)
        user = {"session_invalid_before": changed}
        payload = {"iat": int((changed - timedelta(seconds=1)).timestamp())}
        self.assertTrue(session_is_revoked(user, payload))

    def test_token_without_issued_at_is_revoked_after_password_change(self):
        user = {"password_changed_at": "2026-07-12T03:00:00Z"}
        self.assertTrue(session_is_revoked(user, {}))

    def test_token_issued_after_password_change_is_allowed(self):
        changed = datetime(2026, 7, 12, 3, 0, tzinfo=timezone.utc)
        user = {"session_invalid_before": changed}
        payload = {"iat": int((changed + timedelta(seconds=1)).timestamp())}
        self.assertFalse(session_is_revoked(user, payload))

    def test_no_password_change_does_not_revoke_token(self):
        self.assertFalse(session_is_revoked({}, {"iat": 100}))

    def test_disabled_account_variants_are_rejected(self):
        self.assertTrue(account_disabled({"status": "revoked"}))
        self.assertTrue(account_disabled({"account_locked": True}))
        self.assertTrue(account_disabled({"disabled_at": "2026-07-12T03:00:00Z"}))
        self.assertFalse(account_disabled({"status": "active"}))


if __name__ == "__main__":
    unittest.main()
