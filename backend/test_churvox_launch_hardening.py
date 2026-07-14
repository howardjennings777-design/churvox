import unittest

try:
    from churvox_launch_hardening_routes import (
        TRUST_FEATURES,
        action_allowed,
        build_evidence_outcomes,
        build_journey_steps,
        default_permissions,
        normalise_import_row,
    )
except Exception:
    from backend.churvox_launch_hardening_routes import (
        TRUST_FEATURES,
        action_allowed,
        build_evidence_outcomes,
        build_journey_steps,
        default_permissions,
        normalise_import_row,
    )


class LaunchHardeningBehaviourTests(unittest.TestCase):
    def test_trust_features_are_not_paywalled(self):
        self.assertEqual(TRUST_FEATURES["offline_worker_sync"]["minimum_plan"], "crew")
        for key, feature in TRUST_FEATURES.items():
            if key != "offline_worker_sync":
                self.assertEqual(feature["minimum_plan"], "start")

    def test_messy_client_headers_are_normalised(self):
        row = normalise_import_row("clients", {"Customer": "Jane Smith", "Mobile": "021 123 4567", "Service Address": "4 Test Rd"}, 2)
        self.assertTrue(row["ready"])
        self.assertEqual(row["mapped"]["name"], "Jane Smith")
        self.assertEqual(row["mapped"]["phone"], "021 123 4567")
        self.assertEqual(row["mapped"]["address"], "4 Test Rd")

    def test_missing_required_import_value_is_reviewed_not_blindly_inserted(self):
        row = normalise_import_row("recurring_jobs", {"Service": "Weekly lawn"}, 4)
        self.assertFalse(row["ready"])
        self.assertIn("Frequency is required", row["errors"])

    def test_golden_journey_requires_worker_only_for_team_plans(self):
        counts = {"business": 1, "clients": 1, "jobs": 1, "workers": 0, "completed_jobs": 1, "truth_receipts": 1, "invoices": 1, "active_days": 2}
        start = build_journey_steps(counts, "start")
        crew = build_journey_steps(counts, "crew")
        self.assertTrue(next(item for item in start if item["key"] == "worker_ready")["complete"])
        self.assertFalse(next(item for item in crew if item["key"] == "worker_ready")["complete"])

    def test_permission_presets_deny_unlisted_sensitive_actions(self):
        roles = {item["role"]: item for item in default_permissions()}
        self.assertTrue(action_allowed("bookkeeper", "exports.download", roles["bookkeeper"]))
        self.assertFalse(action_allowed("worker", "exports.download", roles["worker"]))
        self.assertTrue(action_allowed("owner", "permissions.manage"))

    def test_measured_outcomes_do_not_count_unlinked_invoices(self):
        findings = [{"record_id": "job-1", "amount": 200}]
        drafts = [{"feature": "money_left_behind", "finding": {"record_id": "job-1", "amount": 200}}]
        invoices = [
            {"job_id": "job-1", "total": 200, "status": "paid"},
            {"job_id": "job-other", "total": 900, "status": "paid"},
        ]
        result = build_evidence_outcomes(findings, drafts, invoices, [], [])
        self.assertEqual(result["money_recovered"]["invoiced"], 200.0)
        self.assertEqual(result["money_recovered"]["paid"], 200.0)


if __name__ == "__main__":
    unittest.main()
