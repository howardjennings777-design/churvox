from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/churvox-live-restart-proof.yml"


class LiveRestartWorkflowContractTest(unittest.TestCase):
    def test_probe_checks_persistence_and_protected_routes_without_credentials(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        for marker in (
            "jwt_key_id",
            "restart_persistence_ready",
            "/api/billing/create-portal-session",
            "/api/account/self-delete",
            "/api/auth/me",
            ".github/churvox-expected-jwt-key-id.txt",
        ):
            self.assertIn(marker, text)
        self.assertNotIn("CHURVOX_OWNER_PASSWORD", text)
        self.assertNotIn("CHURVOX_WORKER_PASSWORD", text)
        self.assertNotIn("run_real_mutation", text)


if __name__ == "__main__":
    unittest.main()
