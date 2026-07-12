from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "backend/churvox_auth_me_401_patch.py"
HARDENING = ROOT / "backend/churvox_auth_paid_launch_hardening.py"
SITECUSTOMIZE = ROOT / "backend/sitecustomize.py"


class AuthMeStatusPatchTest(unittest.TestCase):
    def test_route_patch_returns_401_for_signed_out_response(self):
        source = PATCH.read_text(encoding="utf-8")
        self.assertIn('result.get("authenticated") is False', source)
        self.assertIn('status_code=401', source)
        self.assertIn('"X-Churvox-Auth-Gate": "signed-out"', source)
        self.assertIn('return result', source)

    def test_middleware_enforcement_survives_late_route_replacement(self):
        source = HARDENING.read_text(encoding="utf-8")
        self.assertIn('VERSION = "churvox-auth-paid-launch-hardening-20260712d"', source)
        self.assertIn('if path == "/api/auth/me" and method == "GET"', source)
        self.assertIn('payload.get("authenticated") is False', source)
        self.assertIn('start["status"] = 401', source)
        self.assertIn('(b"x-churvox-auth-gate", b"signed-out")', source)

    def test_patch_replaces_exactly_the_auth_me_get_route(self):
        source = PATCH.read_text(encoding="utf-8")
        self.assertIn('if _matches(route, "/api/auth/me", "GET")', source)
        self.assertIn('app.add_api_route("/api/auth/me", strict_auth_me, methods=["GET"])', source)

    def test_patch_is_loaded_by_backend_startup(self):
        source = SITECUSTOMIZE.read_text(encoding="utf-8")
        self.assertIn('"churvox_auth_me_401_patch"', source)


if __name__ == "__main__":
    unittest.main()
