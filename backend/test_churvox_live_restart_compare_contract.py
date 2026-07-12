from pathlib import Path
import unittest


class LiveRestartCompareContractTest(unittest.TestCase):
    def test_final_compare_checks_same_key_and_exact_route_counts(self):
        root = Path(__file__).resolve().parents[1]
        workflow = (root / ".github/workflows/churvox-live-restart-compare.yml").read_text(encoding="utf-8")
        expected = (root / ".github/churvox-expected-jwt-key-id.txt").read_text(encoding="utf-8").strip()
        self.assertEqual(len(expected), 16)
        self.assertIn("same_key_after_restart", workflow)
        self.assertIn("billing_portal_post_route_count", workflow)
        self.assertIn("account_delete_delete_route_count", workflow)
        self.assertNotIn("CHURVOX_OWNER_PASSWORD", workflow)
        self.assertNotIn("CHURVOX_WORKER_PASSWORD", workflow)


if __name__ == "__main__":
    unittest.main()
