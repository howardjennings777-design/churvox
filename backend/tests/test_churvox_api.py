"""
Churvox API Tests - Phase 1 Batch 1 Rebranding
Tests for: Auth, Dashboard, Clients, Jobs, Quotes, Invoices, Settings, Plans
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@churvox.com"
ADMIN_PASSWORD = "Admin123!"


class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint returns Churvox branding"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Churvox" in data.get("message", "")
        print(f"✓ API root returns: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success_admin(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print(f"✓ Admin login successful: {data['email']}, role: {data['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_get_current_user(self):
        """Test /auth/me endpoint"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Get current user: {data['name']}")
    
    def test_logout(self):
        """Test logout endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        print("✓ Logout successful")


class TestDashboard:
    """Dashboard stats endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_dashboard_stats(self, auth_headers):
        """Test dashboard stats endpoint returns all required fields"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required stat fields exist
        required_fields = [
            "jobs_today", "jobs_this_week", "completed_this_month",
            "revenue_this_month", "pending_invoices", "active_clients"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Dashboard stats: {data}")


class TestClients:
    """Client CRUD tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_and_get_client(self, auth_headers):
        """Test creating a client and retrieving it"""
        # Create client
        client_data = {
            "name": "TEST_Client_Churvox",
            "email": "test@churvox.com",
            "phone": "021-123-4567",
            "address": "123 Test Street, Auckland"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/clients",
            json=client_data,
            headers=auth_headers
        )
        assert create_resp.status_code == 200
        created = create_resp.json()
        assert created["name"] == client_data["name"]
        client_id = created["id"]
        print(f"✓ Created client: {created['name']}")
        
        # Get client
        get_resp = requests.get(
            f"{BASE_URL}/api/clients/{client_id}",
            headers=auth_headers
        )
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["email"] == client_data["email"]
        print(f"✓ Retrieved client: {fetched['name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
    
    def test_list_clients(self, auth_headers):
        """Test listing all clients"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} clients")


class TestJobs:
    """Job CRUD and workflow tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_job_multi_trade_types(self, auth_headers):
        """Test creating jobs with various multi-trade job types (not lawn-only)"""
        job_types = ["plumbing", "electrical", "cleaning", "handyman", "painting"]
        
        for job_type in job_types:
            job_data = {
                "title": f"TEST_{job_type.title()} Job",
                "job_type": job_type,
                "address": "456 Trade Street, Wellington",
                "scheduled_date": (datetime.now() + timedelta(days=1)).isoformat(),
                "price": 150.00
            }
            response = requests.post(
                f"{BASE_URL}/api/jobs",
                json=job_data,
                headers=auth_headers
            )
            assert response.status_code == 200, f"Failed to create {job_type} job: {response.text}"
            created = response.json()
            assert created["job_type"] == job_type
            print(f"✓ Created {job_type} job: {created['title']}")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/jobs/{created['id']}", headers=auth_headers)
    
    def test_job_workflow_start_complete(self, auth_headers):
        """Test job workflow: create -> start -> complete"""
        # Create job
        job_data = {
            "title": "TEST_Workflow Job",
            "job_type": "handyman",
            "address": "789 Workflow Ave",
            "scheduled_date": datetime.now().isoformat(),
            "price": 200.00
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/jobs",
            json=job_data,
            headers=auth_headers
        )
        assert create_resp.status_code == 200
        job = create_resp.json()
        job_id = job["id"]
        assert job["status"] == "scheduled"
        print(f"✓ Created job with status: {job['status']}")
        
        # Start job
        start_resp = requests.post(
            f"{BASE_URL}/api/jobs/{job_id}/start",
            headers=auth_headers
        )
        assert start_resp.status_code == 200
        started = start_resp.json()
        assert started["status"] == "in_progress"
        print(f"✓ Started job, status: {started['status']}")
        
        # Complete job
        complete_resp = requests.post(
            f"{BASE_URL}/api/jobs/{job_id}/complete",
            headers=auth_headers
        )
        assert complete_resp.status_code == 200
        completed = complete_resp.json()
        assert completed["status"] == "completed"
        print(f"✓ Completed job, status: {completed['status']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/jobs/{job_id}", headers=auth_headers)
    
    def test_jobs_today_and_week(self, auth_headers):
        """Test /jobs/today and /jobs/week endpoints"""
        today_resp = requests.get(f"{BASE_URL}/api/jobs/today", headers=auth_headers)
        assert today_resp.status_code == 200
        print(f"✓ Jobs today: {len(today_resp.json())}")
        
        week_resp = requests.get(f"{BASE_URL}/api/jobs/week", headers=auth_headers)
        assert week_resp.status_code == 200
        print(f"✓ Jobs this week: {len(week_resp.json())}")


class TestQuotes:
    """Quote CRUD tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_and_send_quote(self, auth_headers):
        """Test creating and sending a quote"""
        quote_data = {
            "customer_name": "TEST_Quote Customer",
            "customer_email": "quote@test.com",
            "address": "123 Quote Street",
            "job_description": "Multi-trade service quote",
            "price": 500.00
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/quotes",
            json=quote_data,
            headers=auth_headers
        )
        assert create_resp.status_code == 200
        quote = create_resp.json()
        assert quote["status"] == "draft"
        quote_id = quote["id"]
        print(f"✓ Created quote: {quote['quote_number']}")
        
        # Send quote
        send_resp = requests.post(
            f"{BASE_URL}/api/quotes/{quote_id}/send",
            headers=auth_headers
        )
        assert send_resp.status_code == 200
        sent = send_resp.json()
        assert sent["status"] == "sent"
        print(f"✓ Sent quote, status: {sent['status']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/quotes/{quote_id}", headers=auth_headers)


class TestInvoices:
    """Invoice CRUD tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_invoice_with_gst(self, auth_headers):
        """Test creating invoice with GST calculation"""
        invoice_data = {
            "customer_name": "TEST_Invoice Customer",
            "description": "Multi-trade service invoice",
            "subtotal": 100.00,
            "address": "123 Invoice St"
        }
        response = requests.post(
            f"{BASE_URL}/api/invoices",
            json=invoice_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        invoice = response.json()
        
        # Verify GST calculation (15% default)
        assert invoice["gst_rate"] == 15.0
        assert invoice["gst_amount"] == 15.0  # 15% of 100
        assert invoice["total"] == 115.0  # 100 + 15
        print(f"✓ Created invoice with GST: subtotal={invoice['subtotal']}, GST={invoice['gst_amount']}, total={invoice['total']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/invoices/{invoice['id']}", headers=auth_headers)
    
    def test_invoice_workflow(self, auth_headers):
        """Test invoice workflow: create -> send -> mark paid"""
        invoice_data = {
            "customer_name": "TEST_Workflow Invoice",
            "description": "Workflow test",
            "subtotal": 200.00
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/invoices",
            json=invoice_data,
            headers=auth_headers
        )
        invoice = create_resp.json()
        invoice_id = invoice["id"]
        assert invoice["status"] == "draft"
        print(f"✓ Created invoice: {invoice['invoice_number']}")
        
        # Send
        send_resp = requests.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/send",
            headers=auth_headers
        )
        assert send_resp.status_code == 200
        assert send_resp.json()["status"] == "sent"
        print("✓ Invoice sent")
        
        # Mark paid
        paid_resp = requests.post(
            f"{BASE_URL}/api/invoices/{invoice_id}/mark-paid",
            headers=auth_headers
        )
        assert paid_resp.status_code == 200
        assert paid_resp.json()["status"] == "paid"
        print("✓ Invoice marked as paid")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)


class TestUserSettings:
    """User settings tests (GST rate, trade type)"""
    
    @pytest.fixture
    def auth_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_update_gst_rate(self, auth_headers):
        """Test updating GST rate"""
        response = requests.patch(
            f"{BASE_URL}/api/user/gst",
            json={"gst_rate": 10.0},
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["gst_rate"] == 10.0
        print("✓ GST rate updated to 10%")
        
        # Reset to default
        requests.patch(
            f"{BASE_URL}/api/user/gst",
            json={"gst_rate": 15.0},
            headers=auth_headers
        )
    
    def test_update_trade_type(self, auth_headers):
        """Test updating trade type"""
        response = requests.patch(
            f"{BASE_URL}/api/user/trade",
            json={"trade_type": "plumbing"},
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["trade_type"] == "plumbing"
        print("✓ Trade type updated to plumbing")


class TestPlans:
    """Plan management tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_update_plan_solo(self, auth_headers):
        """Test updating to solo plan"""
        response = requests.patch(
            f"{BASE_URL}/api/user/plan",
            json={"plan": "solo"},
            headers=auth_headers
        )
        assert response.status_code == 200
        print("✓ Plan updated to solo")
    
    def test_update_plan_solo_plus(self, auth_headers):
        """Test updating to solo_plus plan"""
        response = requests.patch(
            f"{BASE_URL}/api/user/plan",
            json={"plan": "solo_plus"},
            headers=auth_headers
        )
        assert response.status_code == 200
        print("✓ Plan updated to solo_plus")
    
    def test_team_plan_coming_soon(self, auth_headers):
        """Test that team plan returns 'coming soon' error"""
        response = requests.patch(
            f"{BASE_URL}/api/user/plan",
            json={"plan": "team"},
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "coming soon" in response.json().get("detail", "").lower()
        print("✓ Team plan correctly shows 'coming soon'")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
