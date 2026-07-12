import unittest

from backend.churvox_registration_verification_paid_launch_patch import (
    industry_key,
    selected_plan,
    verification_token_hash,
)
from backend.churvox_registration_claim_guard import email_claim_id


class RegistrationVerificationRulesTest(unittest.TestCase):
    def test_plan_aliases_are_saved_as_intent_only_names(self):
        self.assertEqual(selected_plan("solo"), "start")
        self.assertEqual(selected_plan("team"), "crew")
        self.assertEqual(selected_plan("pro"), "operator")
        self.assertEqual(selected_plan("enterprise"), "command")
        self.assertEqual(selected_plan("unknown"), "operator")

    def test_industry_key_is_bounded_and_safe(self):
        self.assertEqual(industry_key("Lawn Care & Landscaping"), "lawn_care_landscaping")
        self.assertLessEqual(len(industry_key("x" * 200)), 64)
        self.assertEqual(industry_key(""), "other")

    def test_verification_token_is_hashed_at_rest(self):
        raw = "verification-secret"
        digest = verification_token_hash(raw)
        self.assertEqual(len(digest), 64)
        self.assertNotEqual(digest, raw)
        self.assertEqual(digest, verification_token_hash(raw))

    def test_registration_claim_is_case_insensitive_and_private(self):
        first = email_claim_id("Owner@Example.test")
        second = email_claim_id("owner@example.test")
        self.assertEqual(first, second)
        self.assertEqual(len(first), 64)
        self.assertNotIn("owner@example.test", first)


if __name__ == "__main__":
    unittest.main()
