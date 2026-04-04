"""
Churvox API Tests - Phase 1 Batch 2: Business Isolation, Roles, Team Workflow
Tests for: Team management, Worker roles, Job assignment/acknowledgement, Business isolation
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
BASE_URL = "https://grassley-backend.onrender.com"

# Test credentials
ADMIN_EMAIL = "admin@churvox.com"
ADMIN_PASSWORD = "Admin123!"
WORKER_EMAIL = "john@churvox.com"
WORKER_PASSWORD = "Worker123!"


class TestEmployerLogin:
    """Test employer login and role verification"""
    
    def test_employer_login_returns_role(self):
        """Test admin login returns employer role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] in ("employer", "admin")
        assert "business_id" in data
        print(f"✓ Employer login: role={data['role']}, business_id={data['business_id']}")
    
    def test_dashboard_stats_includes_team_count(self):
        """Test dashboard stats includes team_count for employer"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "team_count" in data
        print(f"✓ Dashboard stats includes team_count: {data['team_count']}")


class TestTeamManagement:
    """Team/Worker management tests"""
    
    @pytest.fixture
    def admin_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_worker(self, admin_headers):
        """Test employer can create a worker account"""
        # First check if worker already exists
        workers_resp = requests.get(f"{BASE_URL}/api/team/workers", headers=admin_headers)
        existing_workers = workers_resp.json()
        existing_emails = [w.get("email") for w in existing_workers]
        
        test_email = f"test_worker_{datetime.now().strftime('%H%M%S')}@churvox.com"
        
        response = requests.post(
            f"{BASE_URL}/api/team/workers",
            json={
                "name": "Test Worker",
                "email": test_email,
                "password": "TestPass123!",
                "phone": "0400-111-222"
            },
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "worker"
        assert data["email"] == test_email
        print(f"✓ Created worker: {data['name']} ({data['email']})")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/team/workers/{data['id']}", headers=admin_headers)
    
    def test_list_workers(self, admin_headers):
        """Test employer can list workers"""
        response = requests.get(f"{BASE_URL}/api/team/workers", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} workers")
    
    def test_delete_worker(self, admin_headers):
        """Test employer can delete a worker"""
        # Create a worker first
        create_resp = requests.post(
            f"{BASE_URL}/api/team/workers",
            json={
                "name": "Delete Test Worker",
                "email": f"delete_test_{datetime.now().strftime('%H%M%S')}@churvox.com",
                "password": "DeletePass123!"
            },
            headers=admin_headers
        )
        worker_id = create_resp.json()["id"]
        
        # Delete the worker
        response = requests.delete(
            f"{BASE_URL}/api/team/workers/{worker_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        print("✓ Worker deleted successfully")
    
    def test_ensure_john_worker_exists(self, admin_headers):
        """Ensure john@churvox.com worker exists for further tests"""
        # Check if john exists
        workers_resp = requests.get(f"{BASE_URL}/api/team/workers", headers=admin_headers)
        workers = workers_resp.json()
        john_exists = any(w.get("email") == WORKER_EMAIL for w in workers)
        
        if not john_exists:
            # Create john worker
            response = requests.post(
                f"{BASE_URL}/api/team/workers",
                json={
                    "name": "John Worker",
                    "email": WORKER_EMAIL,
                    "password": WORKER_PASSWORD,
                    "phone": "0400-123-456"
                },
                headers=admin_headers
            )
            assert response.status_code == 200
            print(f"✓ Created worker john@churvox.com")
        else:
            print(f"✓ Worker john@churvox.com already exists")


class TestWorkerLogin:
    """Test worker login and restricted access"""
    
    @pytest.fixture
    def ensure_worker_exists(self):
        """Ensure john worker exists before tests"""
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        admin_token = admin_resp.json().get("token")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        workers_resp = requests.get(f"{BASE_URL}/api/team/workers", headers=admin_headers)
        workers = workers_resp.json()
        john_exists = any(w.get("email") == WORKER_EMAIL for w in workers)
        
        if not john_exists:
            requests.post(
                f"{BASE_URL}/api/team/workers",
                json={
                    "name": "John Worker",
                    "email": WORKER_EMAIL,
                    "password": WORKER_PASSWORD
                },
                headers=admin_headers
            )
        return True
    
    def test_worker_login(self, ensure_worker_exists):
        """Test worker can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL,
            "password": WORKER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "worker"
        assert "business_id" in data
        print(f"✓ Worker login: role={data['role']}")
    
    def test_worker_cannot_create_job(self, ensure_worker_exists):
        """Test worker cannot create jobs (403)"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL, "password": WORKER_PASSWORD
        })
        token = login_resp.json().get("token")
        
        response = requests.post(
            f"{BASE_URL}/api/jobs",
            json={
                "title": "Worker Created Job",
                "job_type": "cleaning",
                "address": "123 Test St",
                "scheduled_date": datetime.now().isoformat(),
                "price": 100
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        print("✓ Worker correctly blocked from creating jobs (403)")
    
    def test_worker_cannot_delete_job(self, ensure_worker_exists):
        """Test worker cannot delete jobs (403)"""
        # First create a job as admin
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        admin_token = admin_resp.json().get("token")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        job_resp = requests.post(
            f"{BASE_URL}/api/jobs",
            json={
                "title": "Test Job for Delete",
                "job_type": "cleaning",
                "address": "123 Test St",
                "scheduled_date": datetime.now().isoformat(),
                "price": 100
            },
            headers=admin_headers
        )
        job_id = job_resp.json()["id"]
        
        # Try to delete as worker
        worker_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL, "password": WORKER_PASSWORD
        })
        worker_token = worker_resp.json().get("token")
        
        response = requests.delete(
            f"{BASE_URL}/api/jobs/{job_id}",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        assert response.status_code == 403
        print("✓ Worker correctly blocked from deleting jobs (403)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/jobs/{job_id}", headers=admin_headers)


class TestJobAssignmentWorkflow:
    """Test job assignment and acknowledgement workflow"""
    
    @pytest.fixture
    def setup_job_with_worker(self):
        """Create a job assigned to john worker"""
        # Login as admin
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        admin_token = admin_resp.json().get("token")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Ensure john exists
        workers_resp = requests.get(f"{BASE_URL}/api/team/workers", headers=admin_headers)
        workers = workers_resp.json()
        john = next((w for w in workers if w.get("email") == WORKER_EMAIL), None)
        
        if not john:
            create_resp = requests.post(
                f"{BASE_URL}/api/team/workers",
                json={
                    "name": "John Worker",
                    "email": WORKER_EMAIL,
                    "password": WORKER_PASSWORD
                },
                headers=admin_headers
            )
            john = create_resp.json()
        
        # Create job assigned to john
        job_resp = requests.post(
            f"{BASE_URL}/api/jobs",
            json={
                "title": "Assigned Job Test",
                "job_type": "plumbing",
                "address": "456 Worker St",
                "scheduled_date": datetime.now().isoformat(),
                "price": 200,
                "assigned_worker_id": john["id"]
            },
            headers=admin_headers
        )
        job = job_resp.json()
        
        return {
            "job": job,
            "worker_id": john["id"],
            "admin_headers": admin_headers
        }
    
    def test_job_created_with_assigned_status(self, setup_job_with_worker):
        """Test job is created with 'assigned' status when worker is assigned"""
        job = setup_job_with_worker["job"]
        assert job["status"] == "assigned"
        assert job["assigned_worker_id"] == setup_job_with_worker["worker_id"]
        print(f"✓ Job created with status: {job['status']}, assigned to worker")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/jobs/{job['id']}",
            headers=setup_job_with_worker["admin_headers"]
        )
    
    def test_worker_can_acknowledge_job(self, setup_job_with_worker):
        """Test worker can acknowledge assigned job"""
        job = setup_job_with_worker["job"]
        
        # Login as worker
        worker_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL, "password": WORKER_PASSWORD
        })
        worker_token = worker_resp.json().get("token")
        worker_headers = {"Authorization": f"Bearer {worker_token}"}
        
        # Acknowledge job
        response = requests.post(
            f"{BASE_URL}/api/jobs/{job['id']}/acknowledge",
            headers=worker_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "acknowledged"
        print(f"✓ Worker acknowledged job, status: {data['status']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/jobs/{job['id']}",
            headers=setup_job_with_worker["admin_headers"]
        )
    
    def test_worker_can_start_job(self, setup_job_with_worker):
        """Test worker can start job"""
        job = setup_job_with_worker["job"]
        
        # Login as worker
        worker_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL, "password": WORKER_PASSWORD
        })
        worker_token = worker_resp.json().get("token")
        worker_headers = {"Authorization": f"Bearer {worker_token}"}
        
        # Start job
        response = requests.post(
            f"{BASE_URL}/api/jobs/{job['id']}/start",
            headers=worker_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"
        print(f"✓ Worker started job, status: {data['status']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/jobs/{job['id']}",
            headers=setup_job_with_worker["admin_headers"]
        )
    
    def test_worker_can_complete_job_creates_invoice(self, setup_job_with_worker):
        """Test worker can complete job and invoice is auto-created"""
        job = setup_job_with_worker["job"]
        admin_headers = setup_job_with_worker["admin_headers"]
        
        # Login as worker
        worker_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL, "password": WORKER_PASSWORD
        })
        worker_token = worker_resp.json().get("token")
        worker_headers = {"Authorization": f"Bearer {worker_token}"}
        
        # Start job first
        requests.post(f"{BASE_URL}/api/jobs/{job['id']}/start", headers=worker_headers)
        
        # Complete job
        response = requests.post(
            f"{BASE_URL}/api/jobs/{job['id']}/complete",
            headers=worker_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        print(f"✓ Worker completed job, status: {data['status']}")
        
        # Check invoice was created
        invoices_resp = requests.get(f"{BASE_URL}/api/invoices", headers=admin_headers)
        invoices = invoices_resp.json()
        job_invoice = next((i for i in invoices if i.get("job_id") == job["id"]), None)
        assert job_invoice is not None
        print(f"✓ Invoice auto-created: {job_invoice['invoice_number']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/jobs/{job['id']}", headers=admin_headers)
        if job_invoice:
            requests.delete(f"{BASE_URL}/api/invoices/{job_invoice['id']}", headers=admin_headers)


class TestJobStatuses:
    """Test job statuses are only: assigned, acknowledged, in_progress, completed"""
    
    @pytest.fixture
    def admin_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_new_job_has_assigned_status(self, admin_headers):
        """Test new job defaults to 'assigned' status"""
        response = requests.post(
            f"{BASE_URL}/api/jobs",
            json={
                "title": "Status Test Job",
                "job_type": "cleaning",
                "address": "123 Status St",
                "scheduled_date": datetime.now().isoformat(),
                "price": 100
            },
            headers=admin_headers
        )
        assert response.status_code == 200
        job = response.json()
        assert job["status"] == "assigned"
        print(f"✓ New job has status: {job['status']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/jobs/{job['id']}", headers=admin_headers)


class TestBusinessIsolation:
    """Test business isolation - workers see same business data"""
    
    @pytest.fixture
    def setup_client_and_worker(self):
        """Create a client as employer, verify worker can see it"""
        # Login as admin
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        admin_token = admin_resp.json().get("token")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Ensure john exists
        workers_resp = requests.get(f"{BASE_URL}/api/team/workers", headers=admin_headers)
        workers = workers_resp.json()
        john_exists = any(w.get("email") == WORKER_EMAIL for w in workers)
        
        if not john_exists:
            requests.post(
                f"{BASE_URL}/api/team/workers",
                json={
                    "name": "John Worker",
                    "email": WORKER_EMAIL,
                    "password": WORKER_PASSWORD
                },
                headers=admin_headers
            )
        
        # Create a client
        client_resp = requests.post(
            f"{BASE_URL}/api/clients",
            json={
                "name": "Business Isolation Test Client",
                "email": "isolation@test.com",
                "address": "789 Isolation St"
            },
            headers=admin_headers
        )
        client = client_resp.json()
        
        return {
            "client": client,
            "admin_headers": admin_headers
        }
    
    def test_worker_can_see_business_clients(self, setup_client_and_worker):
        """Test worker can see clients from same business"""
        client = setup_client_and_worker["client"]
        admin_headers = setup_client_and_worker["admin_headers"]
        
        # Login as worker
        worker_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL, "password": WORKER_PASSWORD
        })
        worker_token = worker_resp.json().get("token")
        worker_headers = {"Authorization": f"Bearer {worker_token}"}
        
        # Get clients as worker
        response = requests.get(f"{BASE_URL}/api/clients", headers=worker_headers)
        assert response.status_code == 200
        clients = response.json()
        
        # Check if the created client is visible
        client_ids = [c["id"] for c in clients]
        assert client["id"] in client_ids
        print(f"✓ Worker can see business client: {client['name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client['id']}", headers=admin_headers)


class TestClientJobHistory:
    """Test client detail page shows job history"""
    
    @pytest.fixture
    def admin_headers(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_client_jobs(self, admin_headers):
        """Test GET /api/clients/{id}/jobs returns job history"""
        # Create a client
        client_resp = requests.post(
            f"{BASE_URL}/api/clients",
            json={"name": "Job History Client", "address": "123 History St"},
            headers=admin_headers
        )
        client = client_resp.json()
        
        # Create a job for this client
        job_resp = requests.post(
            f"{BASE_URL}/api/jobs",
            json={
                "title": "Client History Job",
                "job_type": "plumbing",
                "client_id": client["id"],
                "address": "123 History St",
                "scheduled_date": datetime.now().isoformat(),
                "price": 150
            },
            headers=admin_headers
        )
        job = job_resp.json()
        
        # Get client jobs
        response = requests.get(
            f"{BASE_URL}/api/clients/{client['id']}/jobs",
            headers=admin_headers
        )
        assert response.status_code == 200
        jobs = response.json()
        assert len(jobs) >= 1
        assert any(j["id"] == job["id"] for j in jobs)
        print(f"✓ Client job history: {len(jobs)} jobs found")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/jobs/{job['id']}", headers=admin_headers)
        requests.delete(f"{BASE_URL}/api/clients/{client['id']}", headers=admin_headers)


class TestWorkerOnlySeesAssignedJobs:
    """Test worker only sees their assigned jobs"""
    
    def test_worker_jobs_filtered(self):
        """Test worker only sees jobs assigned to them"""
        # Login as admin
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        admin_token = admin_resp.json().get("token")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Ensure john exists
        workers_resp = requests.get(f"{BASE_URL}/api/team/workers", headers=admin_headers)
        workers = workers_resp.json()
        john = next((w for w in workers if w.get("email") == WORKER_EMAIL), None)
        
        if not john:
            create_resp = requests.post(
                f"{BASE_URL}/api/team/workers",
                json={
                    "name": "John Worker",
                    "email": WORKER_EMAIL,
                    "password": WORKER_PASSWORD
                },
                headers=admin_headers
            )
            john = create_resp.json()
        
        # Create job NOT assigned to john
        unassigned_job = requests.post(
            f"{BASE_URL}/api/jobs",
            json={
                "title": "Unassigned Job",
                "job_type": "cleaning",
                "address": "123 Unassigned St",
                "scheduled_date": datetime.now().isoformat(),
                "price": 100
            },
            headers=admin_headers
        ).json()
        
        # Create job assigned to john
        assigned_job = requests.post(
            f"{BASE_URL}/api/jobs",
            json={
                "title": "Assigned to John",
                "job_type": "plumbing",
                "address": "456 Assigned St",
                "scheduled_date": datetime.now().isoformat(),
                "price": 200,
                "assigned_worker_id": john["id"]
            },
            headers=admin_headers
        ).json()
        
        # Login as worker
        worker_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": WORKER_EMAIL, "password": WORKER_PASSWORD
        })
        worker_token = worker_resp.json().get("token")
        worker_headers = {"Authorization": f"Bearer {worker_token}"}
        
        # Get jobs as worker
        response = requests.get(f"{BASE_URL}/api/jobs", headers=worker_headers)
        assert response.status_code == 200
        jobs = response.json()
        
        job_ids = [j["id"] for j in jobs]
        assert assigned_job["id"] in job_ids, "Worker should see assigned job"
        assert unassigned_job["id"] not in job_ids, "Worker should NOT see unassigned job"
        print(f"✓ Worker only sees assigned jobs ({len(jobs)} jobs)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/jobs/{unassigned_job['id']}", headers=admin_headers)
        requests.delete(f"{BASE_URL}/api/jobs/{assigned_job['id']}", headers=admin_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
