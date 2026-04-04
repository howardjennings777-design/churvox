"""
PWA Support Tests - Iteration 11
Tests for manifest.json, service worker, icons, and auth regression
"""
import pytest
import requests
import os
BASE_URL = "https://grassley-backend.onrender.com"
FRONTEND_URL = "https://www.churvox.com"

class TestPWAAssets:
    """PWA asset accessibility tests"""
    
    def test_manifest_json_accessible(self):
        """Manifest.json returns HTTP 200"""
        response = requests.get(f"{FRONTEND_URL}/manifest.json")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ manifest.json accessible (HTTP 200)")
    
    def test_manifest_json_valid_structure(self):
        """Manifest.json has valid PWA structure"""
        response = requests.get(f"{FRONTEND_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert data.get("name") == "Churvox - Contractor Management", f"Name mismatch: {data.get('name')}"
        assert data.get("short_name") == "Churvox", f"Short name mismatch: {data.get('short_name')}"
        assert data.get("display") == "standalone", f"Display mismatch: {data.get('display')}"
        assert "icons" in data, "Missing icons array"
        assert len(data["icons"]) == 4, f"Expected 4 icons, got {len(data['icons'])}"
        print("✓ manifest.json has valid PWA structure")
    
    def test_manifest_icons_correct(self):
        """Manifest has correct icon definitions"""
        response = requests.get(f"{FRONTEND_URL}/manifest.json")
        data = response.json()
        icons = data.get("icons", [])
        
        # Check for all 4 required icons
        icon_sources = [icon["src"] for icon in icons]
        assert "icon-192x192.png" in icon_sources, "Missing icon-192x192.png"
        assert "icon-512x512.png" in icon_sources, "Missing icon-512x512.png"
        assert "icon-192x192-maskable.png" in icon_sources, "Missing icon-192x192-maskable.png"
        assert "icon-512x512-maskable.png" in icon_sources, "Missing icon-512x512-maskable.png"
        
        # Check purposes
        purposes = {icon["src"]: icon.get("purpose") for icon in icons}
        assert purposes.get("icon-192x192.png") == "any", "icon-192x192.png should have purpose 'any'"
        assert purposes.get("icon-512x512.png") == "any", "icon-512x512.png should have purpose 'any'"
        assert purposes.get("icon-192x192-maskable.png") == "maskable", "icon-192x192-maskable.png should have purpose 'maskable'"
        assert purposes.get("icon-512x512-maskable.png") == "maskable", "icon-512x512-maskable.png should have purpose 'maskable'"
        print("✓ manifest.json has correct icon definitions")
    
    def test_service_worker_accessible(self):
        """Service worker at /sw.js returns HTTP 200"""
        response = requests.get(f"{FRONTEND_URL}/sw.js")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "serviceWorker" in response.text or "self.addEventListener" in response.text, "sw.js doesn't look like a service worker"
        print("✓ sw.js accessible (HTTP 200)")
    
    def test_icon_192x192_accessible(self):
        """Icon 192x192 returns HTTP 200"""
        response = requests.get(f"{FRONTEND_URL}/icon-192x192.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type", "").startswith("image/"), "Not an image"
        print("✓ icon-192x192.png accessible (HTTP 200)")
    
    def test_icon_512x512_accessible(self):
        """Icon 512x512 returns HTTP 200"""
        response = requests.get(f"{FRONTEND_URL}/icon-512x512.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type", "").startswith("image/"), "Not an image"
        print("✓ icon-512x512.png accessible (HTTP 200)")
    
    def test_icon_192x192_maskable_accessible(self):
        """Maskable icon 192x192 returns HTTP 200"""
        response = requests.get(f"{FRONTEND_URL}/icon-192x192-maskable.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type", "").startswith("image/"), "Not an image"
        print("✓ icon-192x192-maskable.png accessible (HTTP 200)")
    
    def test_icon_512x512_maskable_accessible(self):
        """Maskable icon 512x512 returns HTTP 200"""
        response = requests.get(f"{FRONTEND_URL}/icon-512x512-maskable.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type", "").startswith("image/"), "Not an image"
        print("✓ icon-512x512-maskable.png accessible (HTTP 200)")


class TestAuthRegression:
    """Auth regression tests - ensure PWA changes didn't break login"""
    
    def test_admin_login(self):
        """Admin login still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@churvox.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.status_code}"
        data = response.json()
        assert "token" in data, "No token in response"
        # Role is at root level, not nested under 'user'
        assert data.get("role") in ["employer", "admin"], f"Expected employer/admin role, got {data.get('role')}"
        print("✓ Admin login works (no regression)")
    
    def test_worker_login(self):
        """Worker login still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@churvox.com",
            "password": "Worker123!"
        })
        assert response.status_code == 200, f"Worker login failed: {response.status_code}"
        data = response.json()
        assert "token" in data, "No token in response"
        # Role is at root level, not nested under 'user'
        assert data.get("role") == "worker", f"Expected worker role, got {data.get('role')}"
        print("✓ Worker login works (no regression)")
    
    def test_invalid_login_rejected(self):
        """Invalid credentials are rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid login rejected (no regression)")


class TestDashboardRegression:
    """Dashboard and jobs regression tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@churvox.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_dashboard_stats_accessible(self, admin_token):
        """Dashboard stats endpoint works"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.status_code}"
        print("✓ Dashboard stats accessible (no regression)")
    
    def test_jobs_list_accessible(self, admin_token):
        """Jobs list endpoint works"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/jobs", headers=headers)
        assert response.status_code == 200, f"Jobs list failed: {response.status_code}"
        print("✓ Jobs list accessible (no regression)")
    
    def test_settings_accessible(self, admin_token):
        """Settings endpoint works"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Settings/me failed: {response.status_code}"
        print("✓ Settings accessible (no regression)")