from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
OWNER_LOGIN = ROOT / "frontend/src/pages/owner/OwnerLoginPage.jsx"
OWNER_DASHBOARD = ROOT / "frontend/src/pages/owner/OwnerDashboardPage.jsx"
ADMIN_LOGIN = ROOT / "frontend/src/pages/auth/AdminLoginPage.js"
OWNER_EMAIL = "hello@churvox.com"


class PlatformOwnerFrontendLockTest(unittest.TestCase):
    def test_owner_login_requires_exact_live_hq_identity(self):
        source = OWNER_LOGIN.read_text(encoding="utf-8")
        self.assertIn(f'const OWNER_EMAIL = "{OWNER_EMAIL}"', source)
        self.assertIn('/api/auth/me', source)
        self.assertIn('response.ok && exactOwner(user)', source)
        self.assertIn('normalizedEmail !== OWNER_EMAIL', source)
        self.assertNotIn('existing?.is_owner', source)
        self.assertNotIn('meData.is_admin === true', source)
        self.assertNotIn('meData.is_owner === true', source)
        self.assertNotIn('meData.role === "admin"', source)
        self.assertNotIn('meData.role === "owner"', source)

    def test_owner_dashboard_revalidates_server_session_before_render(self):
        source = OWNER_DASHBOARD.read_text(encoding="utf-8")
        self.assertIn(f'const OWNER_EMAIL = "{OWNER_EMAIL}"', source)
        self.assertIn('/api/auth/me', source)
        self.assertIn('response.ok && email === OWNER_EMAIL', source)
        self.assertIn('if (checking || !verified)', source)
        self.assertIn('/api/auth/logout', source)
        self.assertNotIn('window.location.href = "/owner/login"', source)

    def test_admin_login_requires_exact_live_hq_identity(self):
        source = ADMIN_LOGIN.read_text(encoding="utf-8")
        self.assertIn(f'const PLATFORM_OWNER_EMAIL = "{OWNER_EMAIL}"', source)
        self.assertIn('normalizedEmail !== PLATFORM_OWNER_EMAIL', source)
        self.assertIn('`${API_BASE}/api/auth/me`', source)
        self.assertIn('verifiedEmail !== PLATFORM_OWNER_EMAIL', source)
        self.assertIn('`${API_BASE}/api/auth/logout`', source)
        self.assertNotIn('localStorage.setItem("owner_portal_session", "true")', source)
        self.assertNotIn('window.location.href = "/admin"', source)

    def test_local_storage_is_never_an_authority(self):
        for path in (OWNER_LOGIN, OWNER_DASHBOARD, ADMIN_LOGIN):
            source = path.read_text(encoding="utf-8")
            self.assertNotIn('JSON.parse(localStorage.getItem("owner_portal_session")', source)
            self.assertNotIn('<Navigate to="/owner/dashboard"', source)


if __name__ == "__main__":
    unittest.main()
