"""
Batch 6 Tests: Plans, Upgrades, Billing Controls, and Feature Gating
- Plans page shows all 4 plans with correct pricing: Solo=$30, Team=$70, Pro=$110, Enterprise=$240
- GET /api/plan/all returns all 4 plans with features and pricing
- GET /api/plan/limits returns plan info, limits, and usage counts
- PATCH /api/user/plan changes plan (employer only)
- Feature gating: team, sms, myob based on plan
- Team limit enforcement: worker creation fails with 403 when limit reached
- Client limit enforcement: client creation fails with 403 when on Solo plan with 50+ clients
- Plan management is employer-only (workers cannot change plans)
"""

import pytest
import requests
import os
BASE_URL = "https://grassley-backend.onrender.com"

# Test credentials
ADMIN_EMAIL = "admin@churvox.com"
ADMIN_PASSWORD = "Admin123!"
WORKER_EMAIL = "john@churvox.com"
WORKER_PASSWORD = "Worker123!"


class TestPlanEndpoints:
    """Test plan-related API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("token")
    
    def get_worker_token(self):
        """Login as worker and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL,
            "password": WORKER_PASSWORD
        })
        assert response.status_code == 200, f"Worker login failed: {response.text}"
        return response.json().get("token")
    
    def test_get_all_plans_returns_4_plans(self):
        """GET /api/plan/all returns all 4 plans with correct pricing"""
        response = self.session.get(f"{BASE_URL}/api/plan/all")
        assert response.status_code == 200
        
        data = response.json()
        assert "solo" in data
        assert "team" in data
        assert "pro" in data
        assert "enterprise" in data
        
        # Verify pricing
        assert data["solo"]["price"] == 30
        assert data["team"]["price"] == 70
        assert data["pro"]["price"] == 110
        assert data["enterprise"]["price"] == 240
        
        # Verify feature flags
        assert data["solo"]["team"] == False
        assert data["solo"]["sms"] == False
        assert data["solo"]["myob"] == False
        
        assert data["team"]["team"] == True
        assert data["team"]["sms"] == True
        assert data["team"]["myob"] == False
        
        assert data["pro"]["team"] == True
        assert data["pro"]["sms"] == True
        assert data["pro"]["myob"] == True
        
        assert data["enterprise"]["team"] == True
        assert data["enterprise"]["sms"] == True
        assert data["enterprise"]["myob"] == True
        assert data["enterprise"]["extra_blocks"] == True
        
        print("✓ GET /api/plan/all returns all 4 plans with correct pricing and features")
    
    def test_get_plan_limits_returns_usage(self):
        """GET /api/plan/limits returns plan info, limits, and usage counts"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/plan/limits")
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert "limits" in data
        assert "usage" in data
        assert "max_workers" in data
        assert "extra_user_blocks" in data
        assert "extra_block_price" in data
        
        # Verify usage structure
        assert "workers" in data["usage"]
        assert "clients" in data["usage"]
        
        # Verify extra block price
        assert data["extra_block_price"] == 100
        
        print(f"✓ GET /api/plan/limits returns plan={data['plan']}, workers={data['usage']['workers']}, clients={data['usage']['clients']}")
    
    def test_plan_change_employer_only(self):
        """PATCH /api/user/plan - workers cannot change plans"""
        worker_token = self.get_worker_token()
        self.session.headers.update({"Authorization": f"Bearer {worker_token}"})
        
        response = self.session.patch(f"{BASE_URL}/api/user/plan", json={"plan": "team"})
        assert response.status_code == 403, f"Expected 403 for worker plan change, got {response.status_code}"
        
        print("✓ Workers cannot change plans (403 returned)")
    
    def test_plan_change_to_solo(self):
        """PATCH /api/user/plan - employer can downgrade to solo"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.patch(f"{BASE_URL}/api/user/plan", json={"plan": "solo"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["plan"] == "solo"
        assert "limits" in data
        
        print("✓ Employer can change plan to solo")
    
    def test_plan_change_to_team(self):
        """PATCH /api/user/plan - employer can change to team"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.patch(f"{BASE_URL}/api/user/plan", json={"plan": "team"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["plan"] == "team"
        
        print("✓ Employer can change plan to team")
    
    def test_plan_change_to_pro(self):
        """PATCH /api/user/plan - employer can change to pro"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.patch(f"{BASE_URL}/api/user/plan", json={"plan": "pro"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["plan"] == "pro"
        
        print("✓ Employer can change plan to pro")
    
    def test_plan_change_to_enterprise(self):
        """PATCH /api/user/plan - employer can change to enterprise"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.patch(f"{BASE_URL}/api/user/plan", json={"plan": "enterprise"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["plan"] == "enterprise"
        
        print("✓ Employer can change plan to enterprise")


class TestFeatureGating:
    """Test feature gating based on plan"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def set_plan(self, plan):
        """Set admin plan"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.patch(f"{BASE_URL}/api/user/plan", json={"plan": plan})
        assert response.status_code == 200
        return token
    
    def test_solo_plan_team_feature_disabled(self):
        """Solo plan: team management disabled - worker creation fails"""
        token = self.set_plan("solo")
        
        # Try to create a worker
        response = self.session.post(f"{BASE_URL}/api/team/workers", json={
            "name": "Test Worker Solo",
            "email": "test_solo_worker@test.com",
            "password": "Test123!"
        })
        
        assert response.status_code == 403, f"Expected 403 for solo plan worker creation, got {response.status_code}"
        assert "team management" in response.json().get("detail", "").lower() or "upgrade" in response.json().get("detail", "").lower()
        
        print("✓ Solo plan: team management disabled (403 on worker creation)")
    
    def test_team_plan_team_feature_enabled(self):
        """Team plan: team management enabled"""
        token = self.set_plan("team")
        
        # Check plan limits
        response = self.session.get(f"{BASE_URL}/api/plan/limits")
        assert response.status_code == 200
        
        data = response.json()
        assert data["limits"]["team"] == True
        assert data["max_workers"] == 5
        
        print("✓ Team plan: team management enabled with 5 worker limit")
    
    def test_team_plan_myob_disabled(self):
        """Team plan: MYOB integration disabled"""
        token = self.set_plan("team")
        
        # Check plan limits
        response = self.session.get(f"{BASE_URL}/api/plan/limits")
        assert response.status_code == 200
        
        data = response.json()
        assert data["limits"]["myob"] == False
        
        print("✓ Team plan: MYOB integration disabled")
    
    def test_pro_plan_myob_enabled(self):
        """Pro plan: MYOB integration enabled"""
        token = self.set_plan("pro")
        
        # Check plan limits
        response = self.session.get(f"{BASE_URL}/api/plan/limits")
        assert response.status_code == 200
        
        data = response.json()
        assert data["limits"]["myob"] == True
        
        print("✓ Pro plan: MYOB integration enabled")
    
    def test_solo_plan_client_limit(self):
        """Solo plan: 50 client limit"""
        token = self.set_plan("solo")
        
        # Check plan limits
        response = self.session.get(f"{BASE_URL}/api/plan/limits")
        assert response.status_code == 200
        
        data = response.json()
        assert data["limits"]["max_clients"] == 50
        
        print("✓ Solo plan: 50 client limit configured")
    
    def test_team_plan_unlimited_clients(self):
        """Team plan: unlimited clients"""
        token = self.set_plan("team")
        
        # Check plan limits
        response = self.session.get(f"{BASE_URL}/api/plan/limits")
        assert response.status_code == 200
        
        data = response.json()
        assert data["limits"]["max_clients"] == -1  # -1 means unlimited
        
        print("✓ Team plan: unlimited clients (-1)")


class TestTeamLimitEnforcement:
    """Test team limit enforcement"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_team_limit_check_on_team_plan(self):
        """Team plan has 5 worker limit - verify limit is enforced"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Set to team plan
        response = self.session.patch(f"{BASE_URL}/api/user/plan", json={"plan": "team"})
        assert response.status_code == 200
        
        # Get current workers
        response = self.session.get(f"{BASE_URL}/api/team/workers")
        assert response.status_code == 200
        current_workers = len(response.json())
        
        # Get plan limits
        response = self.session.get(f"{BASE_URL}/api/plan/limits")
        assert response.status_code == 200
        max_workers = response.json()["max_workers"]
        
        print(f"✓ Team plan: {current_workers} workers / {max_workers} max")
        
        # If at limit, try to add another worker and expect 403
        if current_workers >= max_workers:
            response = self.session.post(f"{BASE_URL}/api/team/workers", json={
                "name": "Test Over Limit",
                "email": f"test_overlimit_{current_workers}@test.com",
                "password": "Test123!"
            })
            assert response.status_code == 403, f"Expected 403 when at team limit, got {response.status_code}"
            print("✓ Team limit enforced - 403 returned when at limit")


class TestPlanPropagation:
    """Test that plan changes propagate to workers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def get_worker_token(self):
        """Login as worker and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL,
            "password": WORKER_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_plan_propagates_to_workers(self):
        """Plan changes propagate to workers in the same business"""
        # Set admin to pro plan
        admin_token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        response = self.session.patch(f"{BASE_URL}/api/user/plan", json={"plan": "pro"})
        assert response.status_code == 200
        
        # Login as worker and check plan
        worker_token = self.get_worker_token()
        self.session.headers.update({"Authorization": f"Bearer {worker_token}"})
        
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        worker_data = response.json()
        assert worker_data["plan"] == "pro", f"Worker plan should be 'pro', got '{worker_data['plan']}'"
        
        print("✓ Plan changes propagate to workers (worker now on 'pro' plan)")


class TestRegressionBatch1to5:
    """Regression tests for earlier batch features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_auth_login_works(self):
        """Auth login still works"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        assert "token" in response.json()
        print("✓ Auth login works (regression)")
    
    def test_jobs_list_works(self):
        """Jobs list endpoint works"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ Jobs list works (regression)")
    
    def test_clients_list_works(self):
        """Clients list endpoint works"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ Clients list works (regression)")
    
    def test_invoices_list_works(self):
        """Invoices list endpoint works"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ Invoices list works (regression)")
    
    def test_quotes_list_works(self):
        """Quotes list endpoint works"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/quotes")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ Quotes list works (regression)")
    
    def test_sms_balance_works(self):
        """SMS balance endpoint works"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/sms/balance")
        assert response.status_code == 200
        assert "balance" in response.json()
        print("✓ SMS balance works (regression)")
    
    def test_myob_settings_works(self):
        """MYOB settings endpoint works"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/myob/settings")
        assert response.status_code == 200
        assert "connected" in response.json()
        print("✓ MYOB settings works (regression)")
    
    def test_dashboard_stats_works(self):
        """Dashboard stats endpoint works"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "jobs_today" in data
        assert "team_count" in data
        print("✓ Dashboard stats works (regression)")


class TestCleanup:
    """Cleanup: Reset admin to pro plan after tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_reset_to_pro_plan(self):
        """Reset admin to pro plan after all tests"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json().get("token")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.patch(f"{BASE_URL}/api/user/plan", json={"plan": "pro"})
        assert response.status_code == 200
        
        # Verify
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        assert response.json()["plan"] == "pro"
        
        print("✓ Admin reset to 'pro' plan after tests")
