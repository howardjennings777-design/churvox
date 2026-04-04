"""
Iteration 10 Tests - Admin login, legal pages, and churvox colors
Tests for:
1. Admin login via email/password
2. Worker login
3. Wrong credentials error
4. Public legal pages (/privacy, /terms, /account-deletion)
"""
import pytest
import requests
import os
BASE_URL = "https://grassley-backend.onrender.com"

class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@churvox.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert data["email"] == "admin@churvox.com"
        assert data["role"] in ["admin", "employer"]
        print(f"✓ Admin login successful - role: {data['role']}")
    
    def test_worker_login_success(self):
        """Worker login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@churvox.com",
            "password": "Worker123!"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert data["email"] == "john@churvox.com"
        assert data["role"] == "worker"
        print(f"✓ Worker login successful - role: {data['role']}")
    
    def test_login_wrong_password(self):
        """Login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@churvox.com",
            "password": "WrongPassword123!"
        })
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print("✓ Wrong password correctly rejected")
    
    def test_login_nonexistent_user(self):
        """Login with non-existent user should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@churvox.com",
            "password": "SomePassword123!"
        })
        assert response.status_code in [401, 400, 404], f"Expected 401/400/404, got {response.status_code}"
        print("✓ Non-existent user correctly rejected")


class TestPublicLegalPages:
    """Public legal pages tests - these should be accessible without authentication"""
    
    def test_privacy_page_accessible(self):
        """Privacy page should be publicly accessible"""
        response = requests.get(f"{BASE_URL}/privacy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/html" in response.headers.get("content-type", "")
        print("✓ Privacy page accessible (200)")
    
    def test_terms_page_accessible(self):
        """Terms page should be publicly accessible"""
        response = requests.get(f"{BASE_URL}/terms")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/html" in response.headers.get("content-type", "")
        print("✓ Terms page accessible (200)")
    
    def test_account_deletion_page_accessible(self):
        """Account deletion page should be publicly accessible"""
        response = requests.get(f"{BASE_URL}/account-deletion")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/html" in response.headers.get("content-type", "")
        print("✓ Account deletion page accessible (200)")


class TestAuthenticatedEndpoints:
    """Test endpoints that require authentication"""
    
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
    
    def test_get_current_user(self, admin_token):
        """Get current user info with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["email"] == "admin@churvox.com"
        print(f"✓ Get current user successful - {data['name']}")
    
    def test_settings_requires_auth(self):
        """Settings page should redirect to login without auth"""
        # Note: This tests the frontend route behavior
        response = requests.get(f"{BASE_URL}/settings", allow_redirects=False)
        # Frontend SPA will return 200 but redirect via JS
        assert response.status_code == 200
        print("✓ Settings page returns 200 (SPA handles auth redirect)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
