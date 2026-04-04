"""
Iteration 12 - Launch Readiness Tests
Tests for:
1. Admin bypass removal verification
2. Empty state verification (all test data removed)
3. Auth flow validation (no demo fallbacks)
"""
import pytest
import requests
import os
BASE_URL = "https://grassley-backend.onrender.com"

# Test credentials
ADMIN_EMAIL = "admin@churvox.com"
ADMIN_PASSWORD = "Admin123!"
WRONG_PASSWORD = "WrongPassword123!"


class TestAuthNoBypass:
    """Verify admin bypass has been removed - only email/password login works"""
    
    def test_admin_login_with_correct_credentials(self):
        """Admin can login with correct email/password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Token should be returned"
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] in ["admin", "employer"]
        print(f"✓ Admin login successful: {data['email']}")
    
    def test_login_with_wrong_password_fails(self):
        """Wrong password should return 401 error"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": WRONG_PASSWORD
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data or "error" in data
        print(f"✓ Wrong password correctly rejected with 401")
    
    def test_login_with_nonexistent_user_fails(self):
        """Non-existent user should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@churvox.com",
            "password": "SomePassword123!"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Non-existent user correctly rejected")
    
    def test_no_john_worker_exists(self):
        """john@churvox.com worker should NOT exist (was deleted)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@churvox.com",
            "password": "Worker123!"
        })
        assert response.status_code == 401, f"john@churvox.com should not exist anymore"
        print(f"✓ john@churvox.com worker correctly removed")


@pytest.mark.skip(reason="Empty-state tests are invalid against shared live backend data")
class TestEmptyState:
    """Verify all test data has been removed - database should be clean"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_dashboard_shows_zeros(self, auth_token):
        """Dashboard stats should all be zero"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["jobs_today"] == 0, f"Expected 0 jobs today, got {data['jobs_today']}"
        assert data["jobs_this_week"] == 0, f"Expected 0 jobs this week, got {data['jobs_this_week']}"
        assert data["completed_this_month"] == 0, f"Expected 0 completed, got {data['completed_this_month']}"
        assert data["revenue_this_month"] == 0, f"Expected 0 revenue, got {data['revenue_this_month']}"
        assert data["pending_invoices"] == 0, f"Expected 0 pending invoices, got {data['pending_invoices']}"
        assert data["active_clients"] == 0, f"Expected 0 clients, got {data['active_clients']}"
        assert data["team_count"] == 0, f"Expected 0 team members, got {data['team_count']}"
        print(f"✓ Dashboard shows all zeros: {data}")
    
    def test_jobs_list_empty(self, auth_token):
        """Jobs list should be empty"""
        response = requests.get(
            f"{BASE_URL}/api/jobs",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data == [], f"Expected empty jobs list, got {len(data)} jobs"
        print(f"✓ Jobs list is empty")
    
    def test_clients_list_empty(self, auth_token):
        """Clients list should be empty"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data == [], f"Expected empty clients list, got {len(data)} clients"
        print(f"✓ Clients list is empty")
    
    def test_quotes_list_empty(self, auth_token):
        """Quotes list should be empty"""
        response = requests.get(
            f"{BASE_URL}/api/quotes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data == [], f"Expected empty quotes list, got {len(data)} quotes"
        print(f"✓ Quotes list is empty")
    
    def test_invoices_list_empty(self, auth_token):
        """Invoices list should be empty"""
        response = requests.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data == [], f"Expected empty invoices list, got {len(data)} invoices"
        print(f"✓ Invoices list is empty")
    
    def test_team_workers_empty(self, auth_token):
        """Team workers list should be empty"""
        response = requests.get(
            f"{BASE_URL}/api/team/workers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data == [], f"Expected empty workers list, got {len(data)} workers"
        print(f"✓ Team workers list is empty")
    
    def test_sms_balance_zero(self, auth_token):
        """SMS balance should be zero"""
        response = requests.get(
            f"{BASE_URL}/api/sms/balance",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["balance"] == 0, f"Expected 0 SMS balance, got {data['balance']}"
        print(f"✓ SMS balance is 0")
    
    def test_jobs_today_empty(self, auth_token):
        """Today's jobs should be empty"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/today",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data == [], f"Expected empty today's jobs, got {len(data)} jobs"
        print(f"✓ Today's jobs is empty")
    
    def test_jobs_week_empty(self, auth_token):
        """This week's jobs should be empty"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/week",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data == [], f"Expected empty week's jobs, got {len(data)} jobs"
        print(f"✓ This week's jobs is empty")


class TestAuthFlow:
    """Verify auth flow works correctly without demo fallbacks"""
    
    def test_protected_route_without_token_fails(self):
        """Protected routes should fail without token"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 401, f"Expected 401 without token, got {response.status_code}"
        print(f"✓ Protected route correctly requires auth")
    
    def test_protected_route_with_invalid_token_fails(self):
        """Protected routes should fail with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401, f"Expected 401 with invalid token, got {response.status_code}"
        print(f"✓ Invalid token correctly rejected")
    
    def test_logout_endpoint_exists(self):
        """Logout endpoint should exist"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Then logout
        response = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Logout should return 200 or 204
        assert response.status_code in [200, 204], f"Expected 200/204, got {response.status_code}"
        print(f"✓ Logout endpoint works")
    
    def test_me_endpoint_returns_user_info(self):
        """GET /api/auth/me should return current user info"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Get user info
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ /api/auth/me returns correct user: {data['email']}")


class TestSignupFlow:
    """Verify signup flow still works for new users"""
    
    def test_signup_endpoint_exists(self):
        """Signup endpoint should exist and accept requests"""
        # Try to register with a test email (may fail due to duplicate, but endpoint should exist)
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test_signup_check@example.com",
            "password": "TestPassword123!",
            "name": "Test User",
            "business_name": "Test Business"
        })
        # Should be 200/201 (success) or 400 (duplicate email) - not 404
        assert response.status_code != 404, "Signup endpoint should exist"
        print(f"✓ Signup endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
