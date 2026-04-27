"""
Test suite for Forgot Password and Worker Invite flows
Iteration 18 - Testing forgot-password, reset-password, and worker invite endpoints

NOTE: Resend API key is INVALID (error 1010) - emails won't actually send.
We test the flow by getting tokens from MongoDB directly.
"""

import pytest
import requests
import os
import time
import bcrypt
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Test credentials
EMPLOYER_EMAIL = "launchtest@churvox.com"
EMPLOYER_PASSWORD = "Launch2025!"
OWNER_EMAIL = "hello@churvox.com"
OWNER_PASSWORD = "TempPass123!"
WORKER_EMAIL = "worker@churvox.com"
WORKER_PASSWORD = "Worker123!"

# Test data for new worker invite
TEST_WORKER_EMAIL = f"testworker_{int(time.time())}@churvox.com"
TEST_WORKER_NAME = "Test Worker Invite"


def get_mongo_db():
    """Get MongoDB database connection"""
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


def restore_employer_password():
    """Restore employer password to original"""
    db = get_mongo_db()
    hashed = bcrypt.hashpw(EMPLOYER_PASSWORD.encode(), bcrypt.gensalt()).decode()
    db.users.update_one(
        {"email": EMPLOYER_EMAIL},
        {"$set": {"password_hash": hashed}}
    )


@pytest.fixture(scope="module")
def mongo_client():
    """MongoDB client for direct DB access"""
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="function")
def api_client():
    """Shared requests session - fresh for each test"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestForgotPassword:
    """Forgot Password flow tests"""

    def test_forgot_password_valid_email(self, api_client, mongo_client):
        """POST /api/auth/forgot-password with valid email returns success"""
        # Clean up any existing tokens first
        mongo_client.password_reset_tokens.delete_many({"email": EMPLOYER_EMAIL})
        
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": EMPLOYER_EMAIL
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        # email_sent may be false due to invalid Resend key - that's expected
        
        # Verify token was created in DB
        token_doc = mongo_client.password_reset_tokens.find_one({"email": EMPLOYER_EMAIL})
        assert token_doc is not None, "Reset token should be created in DB"
        assert "token" in token_doc
        print(f"✓ Forgot password for valid email works, token created in DB")

    def test_forgot_password_nonexistent_email(self, api_client):
        """POST /api/auth/forgot-password with nonexistent email returns success (no leak)"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent_user_12345@example.com"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        # Should not leak whether email exists
        print(f"✓ Forgot password for nonexistent email returns success (no leak)")

    def test_reset_password_valid_token(self, api_client, mongo_client):
        """POST /api/auth/reset-password with valid token succeeds"""
        # First, trigger forgot password to get a fresh token
        mongo_client.password_reset_tokens.delete_many({"email": EMPLOYER_EMAIL})
        api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": EMPLOYER_EMAIL})
        
        # Get token from DB
        token_doc = mongo_client.password_reset_tokens.find_one({"email": EMPLOYER_EMAIL})
        assert token_doc is not None, "Token should exist in DB"
        token = token_doc["token"]
        
        # Reset password
        new_password = "NewTestPass123!"
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": new_password
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Reset password with valid token succeeds")

    def test_login_with_new_password(self, api_client, mongo_client):
        """Login with new password succeeds after reset"""
        # First reset the password
        mongo_client.password_reset_tokens.delete_many({"email": EMPLOYER_EMAIL})
        api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": EMPLOYER_EMAIL})
        
        token_doc = mongo_client.password_reset_tokens.find_one({"email": EMPLOYER_EMAIL})
        token = token_doc["token"]
        
        new_password = "ResetTestPass456!"
        api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": new_password
        })
        
        # Try login with new password
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": new_password
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✓ Login with new password succeeds")

    def test_login_with_old_password_fails(self, api_client, mongo_client):
        """Login with old password fails after reset"""
        # First reset the password
        mongo_client.password_reset_tokens.delete_many({"email": EMPLOYER_EMAIL})
        api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": EMPLOYER_EMAIL})
        
        token_doc = mongo_client.password_reset_tokens.find_one({"email": EMPLOYER_EMAIL})
        token = token_doc["token"]
        
        new_password = "AnotherNewPass789!"
        api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": new_password
        })
        
        # Try login with OLD password - should fail
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD  # Old password
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ Login with old password fails after reset")

    def test_reuse_token_fails(self, api_client, mongo_client):
        """Reusing same reset token fails"""
        # First reset the password
        mongo_client.password_reset_tokens.delete_many({"email": EMPLOYER_EMAIL})
        api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": EMPLOYER_EMAIL})
        
        token_doc = mongo_client.password_reset_tokens.find_one({"email": EMPLOYER_EMAIL})
        token = token_doc["token"]
        
        # First reset - should succeed
        response1 = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": "FirstReset123!"
        })
        assert response1.status_code == 200
        
        # Second reset with same token - should fail
        response2 = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": "SecondReset456!"
        })
        
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}: {response2.text}"
        data = response2.json()
        assert "invalid" in data.get("detail", "").lower() or "expired" in data.get("detail", "").lower()
        print(f"✓ Reusing same token fails with 'Invalid or expired reset token'")

    def test_invalid_token_fails(self, api_client):
        """Invalid token returns error"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "completely_invalid_token_12345",
            "new_password": "SomePassword123!"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "invalid" in data.get("detail", "").lower() or "expired" in data.get("detail", "").lower()
        print(f"✓ Invalid token fails cleanly")

    def test_restore_employer_password_after_forgot_tests(self, mongo_client):
        """Restore employer password after forgot password tests"""
        hashed = bcrypt.hashpw(EMPLOYER_PASSWORD.encode(), bcrypt.gensalt()).decode()
        result = mongo_client.users.update_one(
            {"email": EMPLOYER_EMAIL},
            {"$set": {"password_hash": hashed}}
        )
        assert result.modified_count == 1 or result.matched_count == 1
        print(f"✓ Employer password restored to {EMPLOYER_PASSWORD}")


class TestWorkerInvite:
    """Worker Invite flow tests"""

    def test_create_worker_invite(self, api_client, mongo_client):
        """Employer POST /api/team/workers creates worker with status pending"""
        # First login as employer
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        assert login_response.status_code == 200, f"Employer login failed: {login_response.text}"
        token = login_response.json().get("token")
        api_client.headers["Authorization"] = f"Bearer {token}"
        
        # Clean up any existing test worker
        mongo_client.business_users.delete_many({"email": TEST_WORKER_EMAIL})
        mongo_client.users.delete_many({"email": TEST_WORKER_EMAIL})
        
        response = api_client.post(f"{BASE_URL}/api/team/workers", json={
            "name": TEST_WORKER_NAME,
            "email": TEST_WORKER_EMAIL,
            "phone": "+1234567890"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "worker" in data
        worker = data["worker"]
        assert worker.get("status") == "pending"
        assert worker.get("email") == TEST_WORKER_EMAIL
        assert "id" in worker
        
        # Store worker ID for subsequent tests
        pytest.worker_id = worker["id"]
        print(f"✓ Worker created with status pending, ID: {pytest.worker_id}")

    def test_verify_invite(self, api_client):
        """GET /api/invite/verify/{worker_id} returns invite data"""
        worker_id = getattr(pytest, 'worker_id', None)
        if not worker_id:
            pytest.skip("No worker_id from previous test")
        
        response = api_client.get(f"{BASE_URL}/api/invite/verify/{worker_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("email") == TEST_WORKER_EMAIL
        assert data.get("status") == "pending"
        print(f"✓ Invite verify returns correct data")

    def test_accept_invite(self, api_client, mongo_client):
        """POST /api/invite/accept with token+password creates user account"""
        worker_id = getattr(pytest, 'worker_id', None)
        if not worker_id:
            pytest.skip("No worker_id from previous test")
        
        response = api_client.post(f"{BASE_URL}/api/invite/accept", json={
            "token": worker_id,
            "password": "WorkerTestPass123!",
            "name": TEST_WORKER_NAME
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        
        # Verify user was created in users collection
        user = mongo_client.users.find_one({"email": TEST_WORKER_EMAIL})
        assert user is not None, "User should be created in users collection"
        assert user.get("role") == "worker"
        
        # Verify business_users status updated
        business_user = mongo_client.business_users.find_one({"email": TEST_WORKER_EMAIL})
        assert business_user.get("status") == "active"
        
        print(f"✓ Invite accepted, user account created with role=worker")

    def test_worker_can_login(self, api_client):
        """Worker can login via /login after accepting invite"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_WORKER_EMAIL,
            "password": "WorkerTestPass123!"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("role") == "worker"
        print(f"✓ Worker can login after accepting invite")

    def test_already_used_invite_error(self, api_client):
        """Already-used invite shows proper error"""
        worker_id = getattr(pytest, 'worker_id', None)
        if not worker_id:
            pytest.skip("No worker_id from previous test")
        
        # Try to verify an already-accepted invite
        response = api_client.get(f"{BASE_URL}/api/invite/verify/{worker_id}")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "already" in data.get("detail", "").lower()
        print(f"✓ Already-used invite shows proper error")

    def test_invalid_invite_token_404(self, api_client):
        """Invalid invite token returns 404"""
        # Use a valid ObjectId format but non-existent
        response = api_client.get(f"{BASE_URL}/api/invite/verify/000000000000000000000000")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ Invalid invite token returns 404")


class TestCleanup:
    """Cleanup test data"""

    def test_cleanup_test_worker(self, mongo_client):
        """Clean up test worker data"""
        mongo_client.business_users.delete_many({"email": TEST_WORKER_EMAIL})
        mongo_client.users.delete_many({"email": TEST_WORKER_EMAIL})
        print(f"✓ Test worker data cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
