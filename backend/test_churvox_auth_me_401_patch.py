from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "backend/churvox_auth_me_401_patch.py"
SITECUSTOMIZE = ROOT / "backend/sitecustomize.py"


class AuthMeStatusPatchTest(unittest.TestCase):
    def test_signed_out_response_is_401_and_authenticated_response_is_preserved(self):
        source = PATCH.read_text(encoding="utf-8")
        self.assertIn('result.get("authenticated") is False', source)
        self.assertIn('status_code=401', source)
        self.assertIn('"X-Churvox-Auth-Gate": "signed-out"', source)
        self.assertIn('return result', source)

    def test_patch_replaces_exactly_the_auth_me_get_route(self):
        source = PATCH.read_text(encoding="utf-8")
        self.assertIn('if _matches(route, "/api/auth/me", "GET")', source)
        self.assertIn('app.add_api_route("/api/auth/me", strict_auth_me, methods=["GET"])', source)

    def test_patch_loads_before_the_startup_loader(self):
        source = SITECUSTOMIZE.read_text(encoding="utf-8")
        self.assertIn('"churvox_auth_me_401_patch"', source)
        self.assertLess(
            source.index('"churvox_auth_me_401_patch"'),
            source.index('"churvox_startup_patch_loader"'),
        )


if __name__ == "__main__":
    unittest.main()
