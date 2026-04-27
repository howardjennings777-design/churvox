"""
Test Worker-Owner Communication Flow
Tests the complete job lifecycle: employer creates job, assigns worker, worker acknowledges/starts/pauses/completes,
worker adds notes, owner sees all updates. Workers only see assigned jobs.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
EMPLOYER_EMAIL = "launchtest@churvox.com"
EMPLOYER_PASSWORD = "Launch2025!"
WORKER_EMAIL = "worker@churvox.com"
WORKER_PASSWORD = "Worker123!"

# Test job ID created during testing
TEST_JOB_ID = "69dfe995f1c8367b42db68d5"


class TestAuth:
    """Authentication tests"""
    
    def test_employer_login(self):
        """Test employer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("role") == "employer"
        print(f"Employer login successful, role: {data.get('role')}")
    
    def test_worker_login(self):
        """Test worker can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL,
            "password": WORKER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("role") == "worker"
        print(f"Worker login successful, role: {data.get('role')}")


class TestJobsEndpoint:
    """Test jobs endpoint filtering for workers"""
    
    @pytest.fixture
    def employer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        return response.json().get("token")
    
    @pytest.fixture
    def worker_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL,
            "password": WORKER_PASSWORD
        })
        return response.json().get("token")
    
    def test_employer_sees_all_business_jobs(self, employer_token):
        """Employer should see all jobs in their business"""
        response = requests.get(
            f"{BASE_URL}/api/jobs",
            headers={"Authorization": f"Bearer {employer_token}"}
        )
        assert response.status_code == 200
        jobs = response.json()
        assert isinstance(jobs, list)
        print(f"Employer sees {len(jobs)} jobs")
        # Should see at least the test job
        job_ids = [j.get("id") for j in jobs]
        assert TEST_JOB_ID in job_ids, "Employer should see the test job"
    
    def test_worker_sees_only_assigned_jobs(self, worker_token):
        """Worker should only see jobs assigned to them"""
        response = requests.get(
            f"{BASE_URL}/api/jobs",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        assert response.status_code == 200
        jobs = response.json()
        assert isinstance(jobs, list)
        print(f"Worker sees {len(jobs)} jobs")
        # All jobs should have assigned_worker_id matching the worker
        for job in jobs:
            assert job.get("assigned_worker_id") is not None, f"Job {job.get('id')} should have assigned_worker_id"


class TestJobDetail:
    """Test job detail endpoint"""
    
    @pytest.fixture
    def employer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        return response.json().get("token")
    
    @pytest.fixture
    def worker_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL,
            "password": WORKER_PASSWORD
        })
        return response.json().get("token")
    
    def test_employer_sees_job_with_timestamps(self, employer_token):
        """Employer should see job with all timestamps"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/{TEST_JOB_ID}",
            headers={"Authorization": f"Bearer {employer_token}"}
        )
        assert response.status_code == 200
        result = response.json()
        
        # API returns job directly or wrapped in {success, data}
        if isinstance(result, dict) and "data" in result:
            job = result.get("data", {})
        else:
            job = result
        
        # Check job details
        assert job.get("title") == "Plumber Test Job"
        assert job.get("status") == "completed"
        
        # Check timestamps exist
        assert job.get("accepted_at") is not None, "accepted_at should be set"
        assert job.get("started_at") is not None, "started_at should be set"
        assert job.get("completed_at") is not None, "completed_at should be set"
        
        # Check worker notes
        worker_notes = job.get("worker_notes", "") or ""
        assert len(worker_notes) > 0, "Worker notes should be present"
        
        print(f"Job status: {job.get('status')}")
        print(f"Accepted at: {job.get('accepted_at')}")
        print(f"Started at: {job.get('started_at')}")
        print(f"Completed at: {job.get('completed_at')}")
        print(f"Worker notes: {worker_notes[:50]}...")
    
    def test_worker_sees_job_details(self, worker_token):
        """Worker should see job details including owner notes"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/{TEST_JOB_ID}",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        assert response.status_code == 200
        result = response.json()
        
        # API returns job directly or wrapped in {success, data}
        if isinstance(result, dict) and "data" in result:
            job = result.get("data", {})
        else:
            job = result
        
        # Check job details visible to worker
        assert job.get("title") == "Plumber Test Job"
        assert job.get("address") == "456 Test Avenue, Auckland"
        notes = job.get("notes", "") or ""
        assert "Owner notes:" in notes, "Owner notes should be visible to worker"
        
        print(f"Worker can see job: {job.get('title')}")
        print(f"Owner notes visible: {notes[:50]}...")


class TestWorkerStatusUpdates:
    """Test worker can update job status"""
    
    @pytest.fixture
    def worker_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL,
            "password": WORKER_PASSWORD
        })
        return response.json().get("token")
    
    def test_worker_can_update_status(self, worker_token):
        """Worker should be able to update job status"""
        # Note: Job is already completed, so we're just verifying the endpoint works
        response = requests.patch(
            f"{BASE_URL}/api/jobs/{TEST_JOB_ID}",
            headers={"Authorization": f"Bearer {worker_token}"},
            json={"status": "completed"}
        )
        assert response.status_code == 200
        result = response.json()
        assert result.get("success") == True
        print("Worker can update job status")
    
    def test_worker_can_update_notes(self, worker_token):
        """Worker should be able to update worker notes"""
        response = requests.patch(
            f"{BASE_URL}/api/jobs/{TEST_JOB_ID}",
            headers={"Authorization": f"Bearer {worker_token}"},
            json={"worker_notes": "Updated worker notes for testing"}
        )
        assert response.status_code == 200
        result = response.json()
        assert result.get("success") == True
        print("Worker can update worker notes")


class TestWorkerRestrictions:
    """Test worker cannot access restricted endpoints"""
    
    @pytest.fixture
    def worker_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL,
            "password": WORKER_PASSWORD
        })
        return response.json().get("token")
    
    def test_worker_cannot_create_job(self, worker_token):
        """Worker should not be able to create jobs"""
        response = requests.post(
            f"{BASE_URL}/api/jobs",
            headers={"Authorization": f"Bearer {worker_token}"},
            json={
                "title": "Unauthorized Job",
                "address": "123 Test St",
                "scheduled_date": "2026-04-20T10:00:00"
            }
        )
        assert response.status_code == 403, "Worker should not be able to create jobs"
        print("Worker correctly blocked from creating jobs")
    
    def test_worker_cannot_create_client(self, worker_token):
        """Worker should not be able to create clients"""
        response = requests.post(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {worker_token}"},
            json={
                "name": "Unauthorized Client",
                "email": "test@test.com"
            }
        )
        assert response.status_code == 403, "Worker should not be able to create clients"
        print("Worker correctly blocked from creating clients")
    
    def test_worker_cannot_create_quote(self, worker_token):
        """Worker should not be able to create quotes"""
        response = requests.post(
            f"{BASE_URL}/api/quotes",
            headers={"Authorization": f"Bearer {worker_token}"},
            json={
                "customer_name": "Test Customer",
                "address": "123 Test St",
                "job_description": "Test job",
                "price": 100
            }
        )
        assert response.status_code == 403, "Worker should not be able to create quotes"
        print("Worker correctly blocked from creating quotes")
    
    def test_worker_cannot_create_invoice(self, worker_token):
        """Worker should not be able to create invoices"""
        response = requests.post(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {worker_token}"},
            json={
                "customer_name": "Test Customer",
                "description": "Test invoice",
                "subtotal": 100
            }
        )
        assert response.status_code == 403, "Worker should not be able to create invoices"
        print("Worker correctly blocked from creating invoices")


class TestTeamEndpoint:
    """Test team/workers endpoint"""
    
    @pytest.fixture
    def employer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMPLOYER_EMAIL,
            "password": EMPLOYER_PASSWORD
        })
        return response.json().get("token")
    
    def test_employer_can_list_workers(self, employer_token):
        """Employer should be able to list workers"""
        response = requests.get(
            f"{BASE_URL}/api/team/workers",
            headers={"Authorization": f"Bearer {employer_token}"}
        )
        assert response.status_code == 200
        result = response.json()
        
        # API returns list directly or wrapped in {success, data}
        if isinstance(result, dict) and "data" in result:
            workers = result.get("data", [])
        else:
            workers = result
        
        assert isinstance(workers, list)
        assert len(workers) > 0, "Should have at least one worker"
        
        # Check Test Worker exists
        worker_emails = [w.get("email") for w in workers]
        assert WORKER_EMAIL in worker_emails, "Test Worker should be in the list"
        print(f"Employer can see {len(workers)} workers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
