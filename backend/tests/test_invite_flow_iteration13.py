"""
Iteration 13 - Employee Invite Flow Tests
Tests for:
- POST /api/team/workers (create invited worker)
- GET /api/invite/verify/{token} (verify invite token)
- POST /api/invite/accept (accept invite and set password)
- POST /api/team/resend-invite/{worker_id} (resend invite)
- POST /api/team/import-csv (CSV import)
- Invited worker cannot login before accepting
- Worker can login after accepting invite
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@churvox.com"
ADMIN_PASSWORD = "Admin123!"


class TestAuthFlow:
    """Basic auth flow tests"""
    
    def test_admin_login_success(self):
        """Admin can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] in ("employer", "admin")
        print(f"✓ Admin login successful, role: {data['role']}")
    
    def test_login_wrong_password(self):
        """Login fails with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Wrong password correctly rejected")
    
    def test_login_nonexistent_user(self):
        """Login fails for non-existent user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@churvox.com",
            "password": "SomePassword123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Non-existent user correctly rejected")


class TestInviteFlow:
    """Full invite flow tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Auth headers for admin requests"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_create_invited_worker(self, auth_headers):
        """POST /api/team/workers creates worker with status 'invited' and returns invite_link"""
        import time
        unique_email = f"test_worker_{int(time.time())}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/team/workers", 
            json={
                "name": "Test Worker",
                "email": unique_email,
                "phone": "0400123456"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data["status"] == "invited", f"Expected status 'invited', got {data.get('status')}"
        assert "invite_link" in data, "Response should contain invite_link"
        assert data["email"] == unique_email
        assert data["name"] == "Test Worker"
        assert "id" in data
        
        print(f"✓ Worker created with status 'invited'")
        print(f"  Invite link: {data['invite_link']}")
        
        # Store for cleanup
        return data
    
    def test_invited_worker_cannot_login(self, auth_headers):
        """Invited worker cannot login before accepting invite (gets 401 since password is random)"""
        import time
        unique_email = f"test_blocked_{int(time.time())}@example.com"
        
        # Create invited worker
        create_response = requests.post(f"{BASE_URL}/api/team/workers",
            json={"name": "Blocked Worker", "email": unique_email},
            headers=auth_headers
        )
        assert create_response.status_code == 200
        
        # Try to login - should fail (401 because password is random, or 403 if status check comes first)
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "AnyPassword123"
        })
        
        # Should fail - either 401 (wrong password) or 403 (invited status)
        # Current implementation: password check happens first, so 401 is returned
        assert login_response.status_code in (401, 403), f"Expected 401/403, got {login_response.status_code}: {login_response.text}"
        print(f"✓ Invited worker correctly blocked from login (status: {login_response.status_code})")
    
    def test_verify_invite_token(self, auth_headers):
        """GET /api/invite/verify/{token} returns valid invite details"""
        import time
        unique_email = f"test_verify_{int(time.time())}@example.com"
        
        # Create worker
        create_response = requests.post(f"{BASE_URL}/api/team/workers",
            json={"name": "Verify Worker", "email": unique_email},
            headers=auth_headers
        )
        assert create_response.status_code == 200
        invite_link = create_response.json()["invite_link"]
        
        # Extract token from invite link
        token = invite_link.split("/invite/setup/")[-1]
        
        # Verify token
        verify_response = requests.get(f"{BASE_URL}/api/invite/verify/{token}")
        assert verify_response.status_code == 200, f"Expected 200, got {verify_response.status_code}: {verify_response.text}"
        
        data = verify_response.json()
        assert data["valid"] == True
        assert data["email"] == unique_email
        assert data["name"] == "Verify Worker"
        assert "business_name" in data
        
        print(f"✓ Invite token verified successfully")
        print(f"  Email: {data['email']}, Business: {data['business_name']}")
    
    def test_accept_invite_and_login(self, auth_headers):
        """POST /api/invite/accept activates worker, then worker can login"""
        import time
        unique_email = f"test_accept_{int(time.time())}@example.com"
        worker_password = "WorkerPass123!"
        
        # Create worker
        create_response = requests.post(f"{BASE_URL}/api/team/workers",
            json={"name": "Accept Worker", "email": unique_email},
            headers=auth_headers
        )
        assert create_response.status_code == 200
        invite_link = create_response.json()["invite_link"]
        token = invite_link.split("/invite/setup/")[-1]
        
        # Accept invite
        accept_response = requests.post(f"{BASE_URL}/api/invite/accept", json={
            "token": token,
            "password": worker_password,
            "name": "Accept Worker Updated"
        })
        assert accept_response.status_code == 200, f"Expected 200, got {accept_response.status_code}: {accept_response.text}"
        
        data = accept_response.json()
        assert "message" in data
        assert data["email"] == unique_email
        print(f"✓ Invite accepted: {data['message']}")
        
        # Now worker should be able to login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": worker_password
        })
        assert login_response.status_code == 200, f"Expected 200, got {login_response.status_code}: {login_response.text}"
        
        login_data = login_response.json()
        assert login_data["email"] == unique_email
        assert login_data["role"] == "worker"
        assert "token" in login_data
        
        print(f"✓ Worker can login after accepting invite")
    
    def test_resend_invite(self, auth_headers):
        """POST /api/team/resend-invite/{worker_id} resends invite"""
        import time
        unique_email = f"test_resend_{int(time.time())}@example.com"
        
        # Create worker
        create_response = requests.post(f"{BASE_URL}/api/team/workers",
            json={"name": "Resend Worker", "email": unique_email},
            headers=auth_headers
        )
        assert create_response.status_code == 200
        worker_id = create_response.json()["id"]
        
        # Resend invite
        resend_response = requests.post(f"{BASE_URL}/api/team/resend-invite/{worker_id}",
            headers=auth_headers
        )
        assert resend_response.status_code == 200, f"Expected 200, got {resend_response.status_code}: {resend_response.text}"
        
        data = resend_response.json()
        assert "message" in data
        assert "invite_link" in data
        assert unique_email in data["message"]
        
        print(f"✓ Invite resent successfully")
        print(f"  New invite link: {data['invite_link']}")
    
    def test_invalid_invite_token(self):
        """GET /api/invite/verify/{token} returns 400 for invalid token"""
        response = requests.get(f"{BASE_URL}/api/invite/verify/invalid_token_12345")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid token correctly rejected")
    
    def test_accept_invalid_token(self):
        """POST /api/invite/accept returns 400 for invalid token"""
        response = requests.post(f"{BASE_URL}/api/invite/accept", json={
            "token": "invalid_token_12345",
            "password": "SomePassword123"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Accept with invalid token correctly rejected")


class TestCSVImport:
    """CSV import tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Auth headers for admin requests"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_csv_import_valid(self, auth_headers):
        """POST /api/team/import-csv imports workers from CSV"""
        import time
        timestamp = int(time.time())
        
        csv_content = f"""name,email,phone
CSV Worker 1,csv_worker1_{timestamp}@example.com,0400111111
CSV Worker 2,csv_worker2_{timestamp}@example.com,0400222222
"""
        
        files = {"file": ("workers.csv", csv_content, "text/csv")}
        
        # Remove Content-Type from headers for multipart
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/team/import-csv",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "invited" in data
        assert "skipped" in data
        assert "total" in data
        assert "details" in data
        assert data["invited"] >= 2, f"Expected at least 2 invited, got {data['invited']}"
        
        print(f"✓ CSV import successful: {data['invited']} invited, {data['skipped']} skipped")
    
    def test_csv_import_with_invalid_rows(self, auth_headers):
        """CSV import skips invalid rows"""
        import time
        timestamp = int(time.time())
        
        csv_content = f"""name,email,phone
Valid Worker,valid_{timestamp}@example.com,0400333333
,missing_name@example.com,0400444444
No Email,,0400555555
Bad Email,not_an_email,0400666666
"""
        
        files = {"file": ("workers.csv", csv_content, "text/csv")}
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/team/import-csv",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have 1 invited (valid) and 3 skipped (invalid)
        assert data["invited"] >= 1
        assert data["skipped"] >= 3
        
        # Check details for skip reasons
        skipped_details = [d for d in data["details"] if d["status"] == "skipped"]
        assert len(skipped_details) >= 3
        
        print(f"✓ CSV import handled invalid rows: {data['invited']} invited, {data['skipped']} skipped")
    
    def test_csv_import_no_file(self, auth_headers):
        """CSV import returns 400 when no file uploaded"""
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/team/import-csv",
            headers=headers
        )
        
        assert response.status_code in (400, 422), f"Expected 400/422, got {response.status_code}"
        print("✓ CSV import correctly rejects missing file")


class TestTeamPage:
    """Team page worker list tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Auth headers for admin requests"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_workers_list(self, auth_headers):
        """GET /api/team/workers returns list with status field"""
        response = requests.get(f"{BASE_URL}/api/team/workers", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check that workers have status field
        for worker in data:
            assert "id" in worker
            assert "name" in worker
            assert "email" in worker
            assert "status" in worker, f"Worker {worker.get('email')} missing status field"
            assert worker["status"] in ("invited", "active"), f"Invalid status: {worker['status']}"
        
        invited_count = sum(1 for w in data if w["status"] == "invited")
        active_count = sum(1 for w in data if w["status"] == "active")
        
        print(f"✓ Workers list retrieved: {len(data)} total, {invited_count} invited, {active_count} active")


class TestSignupFlow:
    """Signup creates employer account"""
    
    def test_signup_creates_employer(self):
        """POST /api/auth/register creates employer account"""
        import time
        unique_email = f"test_employer_{int(time.time())}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Employer123!",
            "name": "Test Employer",
            "business_name": "Test Business"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["email"] == unique_email
        assert data["role"] == "employer"
        assert data["name"] == "Test Employer"
        assert data["business_name"] == "Test Business"
        assert "token" in data
        
        print(f"✓ Signup created employer account: {unique_email}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
