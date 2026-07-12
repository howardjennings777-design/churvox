from pathlib import Path
import unittest


# Final2 audit trigger: this guard must stay green alongside the complete browser suite.
ROOT = Path(__file__).resolve().parents[1]
PUBLIC_WORKER = ROOT / "frontend/public/worker"
APP = ROOT / "frontend/src/App.js"
WORKER_ROUTE = ROOT / "frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx"


class WorkerStaticBypassTest(unittest.TestCase):
    def test_public_build_contains_no_worker_route_html(self):
        static_html = sorted(PUBLIC_WORKER.rglob("*.html")) if PUBLIC_WORKER.exists() else []
        self.assertEqual(static_html, [], f"Static worker pages bypass React auth: {static_html}")

    def test_worker_urls_are_owned_by_authenticated_react_routes(self):
        app = APP.read_text(encoding="utf-8")
        worker = WORKER_ROUTE.read_text(encoding="utf-8")
        self.assertIn('path="/worker/today" element={<WorkerRoute>', app)
        self.assertIn('path="/worker/jobs" element={<WorkerRoute>', app)
        self.assertIn('if (!user || !isWorker)', worker)
        self.assertIn('<Navigate to={user ? "/dashboard" : "/login?worker=1"}', worker)


if __name__ == "__main__":
    unittest.main()
