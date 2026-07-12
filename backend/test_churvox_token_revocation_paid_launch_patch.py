import unittest

from backend.churvox_token_revocation_paid_launch_patch import token_fingerprint


class TokenRevocationRulesTest(unittest.TestCase):
    def test_jti_tokens_have_stable_private_fingerprint(self):
        payload = {"type": "access", "jti": "session-123"}
        self.assertEqual(token_fingerprint(payload, "raw-token"), "access:session-123")

    def test_legacy_tokens_are_hashed_in_revocation_store(self):
        fingerprint = token_fingerprint({"type": "refresh"}, "legacy-secret-token")
        self.assertTrue(fingerprint.startswith("refresh:sha256:"))
        self.assertNotIn("legacy-secret-token", fingerprint)
        self.assertEqual(len(fingerprint.split(":")[-1]), 64)

    def test_access_and_refresh_fingerprints_do_not_collide(self):
        access = token_fingerprint({"type": "access", "jti": "same"}, "token")
        refresh = token_fingerprint({"type": "refresh", "jti": "same"}, "token")
        self.assertNotEqual(access, refresh)


if __name__ == "__main__":
    unittest.main()
