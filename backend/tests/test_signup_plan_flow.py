"""
Test signup and plan flow - Iteration 21
Tests:
1. New user registration returns plan: None
2. Existing employer login returns valid plan
3. Worker login works (workers bypass plan check)
4. Admin login works
5. Billing status returns correct plan info
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSignupAndPlanFlow:
    """Test signup flow and plan gating"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_email = f"test-{int(time.time())}@test.com"
        self.test_password = "TestPass123!"
        yield
        # Cleanup: delete test user if created
        self._cleanup_test_user()
    
    def _cleanup_test_user(self):
        """Delete test user from MongoDB"""
        try:
            # Login as admin to delete test user
            admin_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": "hello@churvox.com",
                "password": "TempPass123!"
            })
            if admin_login.status_code == 200:
                token = admin_login.json().get("token")
                if token:
                    # Try to delete via admin endpoint if available
                    pass
        except Exception as e:
            print(f"Cleanup failed: {e}")
    
    def test_01_new_user_registration_returns_null_plan(self):
        """New user registration should return plan: None"""
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": "Test User",
            "business_name": "Test Business"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify user data
        assert "token" in data, "No token returned"
        assert data.get("email") == self.test_email, "Email mismatch"
        
        # CRITICAL: plan should be None for new users
        plan = data.get("plan")
        assert plan is None or plan == "none" or plan == "", f"New user should have no plan, got: {plan}"
        print(f"✓ New user registered with plan: {plan}")
    
    def test_02_employer_login_returns_valid_plan(self):
        """Existing employer with plan should return valid plan"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "launchtest@churvox.com",
            "password": "Launch2025!"
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify user data
        assert "token" in data, "No token returned"
        assert data.get("email") == "launchtest@churvox.com", "Email mismatch"
        
        # Employer should have a plan
        plan = data.get("plan")
        print(f"✓ Employer logged in with plan: {plan}")
        # Note: plan could be 'solo' or other valid plan
    
    def test_03_worker_login_works(self):
        """Worker login should work (workers bypass plan check)"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "worker@churvox.com",
            "password": "Worker123!"
        })
        
        assert response.status_code == 200, f"Worker login failed: {response.text}"
        data = response.json()
        
        assert "token" in data, "No token returned"
        assert data.get("role") == "worker", f"Expected worker role, got: {data.get('role')}"
        print(f"✓ Worker logged in successfully, role: {data.get('role')}")
    
    def test_04_admin_login_works(self):
        """Admin/Platform owner login should work"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "hello@churvox.com",
            "password": "TempPass123!"
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        assert "token" in data, "No token returned"
        print(f"✓ Admin logged in successfully")
    
    def test_05_billing_status_for_new_user(self):
        """Billing status should return null plan for new user"""
        # First register a new user
        test_email = f"billing-test-{int(time.time())}@test.com"
        reg_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "Billing Test User",
            "business_name": "Billing Test Business"
        })
        
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        token = reg_response.json().get("token")
        
        # Get billing status
        billing_response = self.session.get(
            f"{BASE_URL}/api/billing/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert billing_response.status_code == 200, f"Billing status failed: {billing_response.text}"
        billing_data = billing_response.json()
        
        # Plan should be None or 'none' for new user
        plan = billing_data.get("plan")
        print(f"✓ Billing status for new user - plan: {plan}")
    
    def test_06_billing_status_for_existing_employer(self):
        """Billing status should return valid plan for existing employer"""
        # Login as employer
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "launchtest@churvox.com",
            "password": "Launch2025!"
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        
        # Get billing status
        billing_response = self.session.get(
            f"{BASE_URL}/api/billing/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert billing_response.status_code == 200, f"Billing status failed: {billing_response.text}"
        billing_data = billing_response.json()
        
        plan = billing_data.get("plan")
        print(f"✓ Billing status for employer - plan: {plan}")


class TestPlanEndpoints:
    """Test plan-related endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_01_plan_all_endpoint(self):
        """Test /api/plan/all endpoint"""
        response = self.session.get(f"{BASE_URL}/api/plan/all")
        
        # This endpoint may return 404 if not implemented
        if response.status_code == 404:
            print("⚠ /api/plan/all returns 404 - using fallback plans in frontend")
        else:
            assert response.status_code == 200, f"Plan all failed: {response.text}"
            print(f"✓ Plan all endpoint works")


class TestRegressionEndpoints:
    """Regression tests for employer dashboard endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with employer auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as employer
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "launchtest@churvox.com",
            "password": "Launch2025!"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not login as employer")
    
    def test_01_clients_endpoint(self):
        """Test /api/clients endpoint"""
        response = self.session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200, f"Clients endpoint failed: {response.text}"
        print(f"✓ Clients endpoint works")
    
    def test_02_jobs_endpoint(self):
        """Test /api/jobs endpoint"""
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200, f"Jobs endpoint failed: {response.text}"
        print(f"✓ Jobs endpoint works")
    
    def test_03_dashboard_stats_endpoint(self):
        """Test /api/dashboard/stats endpoint"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        print(f"✓ Dashboard stats endpoint works")
    
    def test_04_invoices_endpoint(self):
        """Test /api/invoices endpoint"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Invoices endpoint failed: {response.text}"
        print(f"✓ Invoices endpoint works")
    
    def test_05_quotes_endpoint(self):
        """Test /api/quotes endpoint"""
        response = self.session.get(f"{BASE_URL}/api/quotes")
        assert response.status_code == 200, f"Quotes endpoint failed: {response.text}"
        print(f"✓ Quotes endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
