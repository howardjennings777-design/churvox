import unittest

try:
    from churvox_owner_intelligence_routes import (
        PLAN_FEATURES,
        evaluate_proof,
        parse_voice_to_business,
        proof_checklist_for,
        simulate_scenario,
    )
except Exception:
    from backend.churvox_owner_intelligence_routes import (
        PLAN_FEATURES,
        evaluate_proof,
        parse_voice_to_business,
        proof_checklist_for,
        simulate_scenario,
    )


class OwnerIntelligenceBehaviourTests(unittest.TestCase):
    def test_tier_shape_keeps_core_intelligence_open(self):
        self.assertEqual(PLAN_FEATURES["money_left_behind"]["minimum_plan"], "start")
        self.assertEqual(PLAN_FEATURES["job_truth_receipt"]["minimum_plan"], "start")
        self.assertEqual(PLAN_FEATURES["promise_memory"]["minimum_plan"], "start")
        self.assertEqual(PLAN_FEATURES["voice_to_business"]["minimum_plan"], "start")
        self.assertEqual(PLAN_FEATURES["worker_proof_coach"]["minimum_plan"], "crew")
        self.assertEqual(PLAN_FEATURES["explain_my_week"]["minimum_plan"], "operator")
        self.assertEqual(PLAN_FEATURES["approval_budget"]["minimum_plan"], "operator")
        self.assertEqual(PLAN_FEATURES["what_if"]["minimum_plan"], "command")

    def test_lawn_proof_coach_names_real_field_checks(self):
        checklist = proof_checklist_for({"title": "Weekly lawn and hedge service"}, "landscaping")
        labels = " ".join(item["label"].lower() for item in checklist)
        self.assertIn("edges", labels)
        self.assertIn("green waste", labels)
        self.assertIn("gates", labels)

    def test_proof_check_blocks_missing_confirmation(self):
        checklist = proof_checklist_for({"title": "Lawn service"}, "lawn care")
        result = evaluate_proof(checklist, ["after.jpg"], "Work completed", [])
        self.assertFalse(result["ready"])
        self.assertGreater(result["missing_count"], 0)
        confirmed = [item["id"] for item in checklist if item["proof"] == "confirmation"]
        result = evaluate_proof(checklist, ["after.jpg"], "Work completed", confirmed)
        self.assertTrue(result["ready"])

    def test_voice_to_business_prepares_not_executes(self):
        draft = parse_voice_to_business("Book John for next Thursday for lawn mowing, two hours, $180, but do not send it")
        self.assertEqual(draft["intent"], "job_draft")
        self.assertEqual(draft["date_hint"], "next thursday")
        self.assertEqual(draft["estimated_hours"], 2.0)
        self.assertEqual(draft["amount"], 180.0)
        self.assertTrue(draft["owner_review_required"])
        self.assertTrue(draft["no_auto_send"])
        self.assertTrue(draft["no_auto_change"])

    def test_what_if_is_deterministic_and_non_mutating(self):
        baseline = {"revenue": 10000, "worker_cost": 3500, "job_count": 20, "average_job_hours": 2, "next_week_jobs": 8}
        result = simulate_scenario("price_change", {"percent": 8}, baseline)
        self.assertEqual(result["projected"]["revenue"], 10800.0)
        self.assertEqual(result["impact"]["revenue_delta"], 800.0)
        self.assertEqual(baseline["revenue"], 10000)

        capacity = simulate_scenario("add_worker", {"weekly_hours": 40}, baseline)
        self.assertEqual(capacity["impact"]["extra_jobs_capacity"], 20)
        self.assertIn("assumptions", capacity)


if __name__ == "__main__":
    unittest.main()
