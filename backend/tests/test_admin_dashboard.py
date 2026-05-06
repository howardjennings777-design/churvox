"""
Test Admin Dashboard Features - Iteration 20
Tests: Platform owner login, admin stats, user deletion, self-delete prevention, non-admin access
"""
import pytest
import requests
import os
from bson import ObjectId

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smart-operator-3.preview.emergentagent.com').rstrip('/')

# Test credentials from test_credentials.md
PLATFORM_OWNER = {"email": "hello@churvox.com", "password": "TempPass123!"}
EMPLOYER = {"email": "launchtest@churvox.com", "password": "Launch2025!"}
WORKER = {"email": "worker@churvox.com", "password": "Worker123!"}


class TestPlatformOwnerLogin:
    """Test platform owner authentication"""
    
    def test_owner_login_success(self):
        """Platform owner can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PLATFORM_OWNER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert data["email"] == PLATFORM_OWNER["email"]
        assert data["role"] == "owner"
        print(f"✓ Platform owner login successful: {data['email']}")
    
    def test_employer_login_regression(self):
        """Employer login still works (regression test)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=EMPLOYER)
        assert response.status_code == 200, f"Employer login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert data["email"] == EMPLOYER["email"]
        print(f"✓ Employer login successful: {data['email']}")
    
    def test_worker_login_regression(self):
        """Worker login still works (regression test)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=WORKER)
        assert response.status_code == 200, f"Worker login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert data["email"] == WORKER["email"]
        print(f"✓ Worker login successful: {data['email']}")


class TestAdminPlatformStats:
    """Test admin platform stats endpoint"""
    
    @pytest.fixture
    def owner_token(self):
        """Get platform owner token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PLATFORM_OWNER)
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def employer_token(self):
        """Get employer token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=EMPLOYER)
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def worker_token(self):
        """Get worker token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=WORKER)
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_owner_can_access_platform_stats(self, owner_token):
        """Platform owner can access admin stats"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/platform-stats", headers=headers)
        
        assert response.status_code == 200, f"Stats access failed: {response.text}"
        data = response.json()
        
        # Verify stats structure
        assert "total_users" in data or "users_list" in data, "Missing users data"
        assert "total_businesses" in data or "businesses_list" in data, "Missing businesses data"
        assert "total_jobs" in data or "jobs_list" in data, "Missing jobs data"
        assert "total_invoices" in data or "invoices_list" in data, "Missing invoices data"
        print(f"✓ Platform stats accessible - Users: {data.get('total_users', len(data.get('users_list', [])))}")
    
    def test_employer_cannot_access_platform_stats(self, employer_token):
        """Non-owner (employer) cannot access admin stats"""
        headers = {"Authorization": f"Bearer {employer_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/platform-stats", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Employer correctly denied access to platform stats")
    
    def test_worker_cannot_access_platform_stats(self, worker_token):
        """Non-owner (worker) cannot access admin stats"""
        headers = {"Authorization": f"Bearer {worker_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/platform-stats", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Worker correctly denied access to platform stats")
    
    def test_unauthenticated_cannot_access_platform_stats(self):
        """Unauthenticated user cannot access admin stats"""
        response = requests.get(f"{BASE_URL}/api/admin/platform-stats")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthenticated user correctly denied access to platform stats")


class TestAdminUserDeletion:
    """Test admin user deletion endpoint"""
    
    @pytest.fixture
    def owner_token(self):
        """Get platform owner token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PLATFORM_OWNER)
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def owner_user_id(self):
        """Get platform owner user ID"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PLATFORM_OWNER)
        assert response.status_code == 200
        return response.json()["id"]
    
    @pytest.fixture
    def employer_token(self):
        """Get employer token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=EMPLOYER)
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_owner_cannot_delete_self(self, owner_token, owner_user_id):
        """Platform owner cannot delete their own account"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.delete(f"{BASE_URL}/api/admin/users/{owner_user_id}", headers=headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "cannot delete your own" in data.get("detail", "").lower() or "own account" in data.get("detail", "").lower()
        print("✓ Self-delete prevention working correctly")
    
    def test_non_admin_cannot_delete_users(self, employer_token, owner_user_id):
        """Non-admin (employer) cannot delete users"""
        headers = {"Authorization": f"Bearer {employer_token}"}
        response = requests.delete(f"{BASE_URL}/api/admin/users/{owner_user_id}", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-admin correctly denied delete access")
    
    def test_delete_invalid_user_id(self, owner_token):
        """Delete with invalid user ID returns 400"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.delete(f"{BASE_URL}/api/admin/users/invalid-id", headers=headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid user ID handled correctly")
    
    def test_delete_nonexistent_user(self, owner_token):
        """Delete nonexistent user returns 404"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        # Use a valid ObjectId format but one that doesn't exist
        fake_id = "000000000000000000000000"
        response = requests.delete(f"{BASE_URL}/api/admin/users/{fake_id}", headers=headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Nonexistent user handled correctly")


class TestCreateAndDeleteUser:
    """Test creating a test user and deleting via admin"""
    
    @pytest.fixture
    def owner_token(self):
        """Get platform owner token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PLATFORM_OWNER)
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_create_and_delete_test_user(self, owner_token):
        """Create a test user via registration, then delete via admin"""
        # First, try to create a test user via registration
        test_user = {
            "email": "realadmintest@churvox.com",  # Using 'real' prefix to avoid filter
            "password": "TestPass123!",
            "name": "Admin Test User",
            "business_name": "Admin Test Business",
            "trade_type": "plumber"
        }
        
        # Register the test user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=test_user)
        
        if reg_response.status_code == 200:
            user_data = reg_response.json()
            user_id = user_data.get("id")
            print(f"✓ Test user created: {test_user['email']} (ID: {user_id})")
            
            # Now delete the user via admin endpoint
            headers = {"Authorization": f"Bearer {owner_token}"}
            delete_response = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=headers)
            
            assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
            print(f"✓ Test user deleted successfully via admin endpoint")
            
            # Verify user is deleted - try to login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_user["email"],
                "password": test_user["password"]
            })
            assert login_response.status_code in [401, 404], "User should not be able to login after deletion"
            print("✓ Deleted user cannot login (verified)")
            
        elif reg_response.status_code == 400 and "already exists" in reg_response.text.lower():
            # User already exists, try to get their ID from platform stats
            headers = {"Authorization": f"Bearer {owner_token}"}
            stats_response = requests.get(f"{BASE_URL}/api/admin/platform-stats", headers=headers)
            
            if stats_response.status_code == 200:
                stats = stats_response.json()
                users_list = stats.get("users_list", [])
                
                # Find the test user
                test_user_record = None
                for user in users_list:
                    if user.get("email") == test_user["email"]:
                        test_user_record = user
                        break
                
                if test_user_record:
                    user_id = test_user_record.get("_id") or test_user_record.get("id")
                    print(f"✓ Found existing test user: {test_user['email']} (ID: {user_id})")
                    
                    # Delete the user
                    delete_response = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=headers)
                    assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
                    print(f"✓ Existing test user deleted successfully")
                else:
                    print(f"⚠ Test user exists but not found in stats (may be filtered)")
                    pytest.skip("Test user exists but filtered from stats")
            else:
                pytest.skip("Could not access platform stats to find existing user")
        else:
            pytest.skip(f"Could not create test user: {reg_response.status_code} - {reg_response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
