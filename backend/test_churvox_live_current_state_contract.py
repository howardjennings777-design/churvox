from pathlib import Path
import unittest


class LiveCurrentStateContractTest(unittest.TestCase):
    def test_current_state_workflow_remains_credential_free(self):
        workflow = Path(__file__).resolve().parents[1] / ".github/workflows/churvox-live-current-state.yml"
        text = workflow.read_text(encoding="utf-8")
        self.assertIn("/api/auth/login-health", text)
        self.assertIn("/api/billing/create-portal-session", text)
        self.assertIn("/api/account/self-delete", text)
        self.assertNotIn("CHURVOX_OWNER_PASSWORD", text)
        self.assertNotIn("CHURVOX_WORKER_PASSWORD", text)


if __name__ == "__main__":
    unittest.main()
