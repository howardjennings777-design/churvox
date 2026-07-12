import unittest

from backend.churvox_invite_security_paid_launch_patch import (
    owner_business_record,
    token_hash,
    worker_invite_record,
)


class SecureInviteRulesTest(unittest.TestCase):
    def test_token_hash_is_stable_and_does_not_store_raw_token(self):
        raw = "worker-invite-secret-token"
        digest = token_hash(raw)
        self.assertEqual(digest, token_hash(raw))
        self.assertNotEqual(digest, raw)
        self.assertEqual(len(digest), 64)

    def test_valid_worker_must_match_user_and_business(self):
        user = {"_id": "worker-1", "business_id": "business-1", "role": "worker", "status": "invited"}
        token = {"user_id": "worker-1", "business_id": "business-1"}
        self.assertTrue(worker_invite_record(user, token))

    def test_owner_role_cannot_be_activated_by_worker_invite(self):
        user = {"_id": "owner-1", "business_id": "owner-1", "role": "owner", "status": "invited"}
        token = {"user_id": "owner-1", "business_id": "owner-1"}
        self.assertFalse(worker_invite_record(user, token))

    def test_cross_business_and_cross_user_tokens_are_rejected(self):
        user = {"_id": "worker-1", "business_id": "business-1", "role": "worker", "status": "invited"}
        self.assertFalse(worker_invite_record(user, {"user_id": "worker-2", "business_id": "business-1"}))
        self.assertFalse(worker_invite_record(user, {"user_id": "worker-1", "business_id": "business-2"}))

    def test_active_worker_cannot_reuse_invite(self):
        user = {"_id": "worker-1", "business_id": "business-1", "role": "worker", "status": "active"}
        token = {"user_id": "worker-1", "business_id": "business-1"}
        self.assertFalse(worker_invite_record(user, token))

    def test_verified_owner_must_own_the_business(self):
        self.assertTrue(owner_business_record({"_id": "business-1", "business_id": "business-1", "role": "owner"}, "business-1"))
        self.assertTrue(owner_business_record({"_id": "admin-1", "business_id": "business-1", "role": "admin"}, "business-1"))
        self.assertFalse(owner_business_record({"_id": "owner-2", "business_id": "business-2", "role": "owner"}, "business-1"))
        self.assertFalse(owner_business_record({"_id": "worker-1", "business_id": "business-1", "role": "worker"}, "business-1"))


if __name__ == "__main__":
    unittest.main()
