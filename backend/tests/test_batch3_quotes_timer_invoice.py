"""
Churvox Batch 3 API Tests
- Quotes module (create, edit, send, convert to job)
- Time tracking (start/pause/resume/complete, manual adjust)
- Time-based invoicing (fixed/hourly/fixed_extras/hourly_extras)
- Client-job-invoice linking
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBatch3QuotesTimerInvoice:
    """Batch 3: Quotes, Timer, and Invoice tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@churvox.com",
            "password": "Admin123!"
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        data = login_res.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Create a test client for use in tests
        client_res = self.session.post(f"{BASE_URL}/api/clients", json={
            "name": "TEST_Batch3_Client",
            "email": "batch3client@test.com",
            "phone": "555-1234",
            "address": "123 Test Street"
        })
        if client_res.status_code == 200:
            self.test_client_id = client_res.json().get("id")
        else:
            self.test_client_id = None
        
        yield
        
        # Cleanup: Delete test data
        if hasattr(self, 'test_client_id') and self.test_client_id:
            self.session.delete(f"{BASE_URL}/api/clients/{self.test_client_id}")

    # ==================== QUOTE TESTS ====================
    
    def test_create_quote_with_pricing_type_fixed(self):
        """POST /api/quotes with pricing_type=fixed"""
        res = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_name": "TEST_Quote_Customer",
            "address": "456 Quote Ave",
            "job_description": "Test quote for fixed pricing",
            "job_type": "plumbing",
            "price": 250.00,
            "pricing_type": "fixed",
            "client_id": self.test_client_id
        })
        assert res.status_code == 200, f"Create quote failed: {res.text}"
        data = res.json()
        assert data["pricing_type"] == "fixed"
        assert data["price"] == 250.00
        assert data["status"] == "draft"
        assert "quote_number" in data
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{data['id']}")
        print("✓ Quote created with fixed pricing type")

    def test_create_quote_with_hourly_rate_and_extras(self):
        """POST /api/quotes with pricing_type=hourly_extras, hourly_rate, extras"""
        res = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_name": "TEST_Hourly_Quote",
            "address": "789 Hourly Lane",
            "job_description": "Hourly quote with extras",
            "job_type": "electrical",
            "price": 0,
            "pricing_type": "hourly_extras",
            "hourly_rate": 75.00,
            "extras": [
                {"description": "Materials", "amount": 50.00},
                {"description": "Travel", "amount": 25.00}
            ],
            "client_id": self.test_client_id
        })
        assert res.status_code == 200, f"Create hourly quote failed: {res.text}"
        data = res.json()
        assert data["pricing_type"] == "hourly_extras"
        assert data["hourly_rate"] == 75.00
        assert len(data["extras"]) == 2
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{data['id']}")
        print("✓ Quote created with hourly rate and extras")

    def test_send_quote_changes_status(self):
        """POST /api/quotes/{id}/send changes status to sent"""
        # Create quote
        create_res = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_name": "TEST_Send_Quote",
            "address": "Send St",
            "job_description": "Quote to send",
            "price": 100.00
        })
        assert create_res.status_code == 200
        quote_id = create_res.json()["id"]
        
        # Send quote
        send_res = self.session.post(f"{BASE_URL}/api/quotes/{quote_id}/send")
        assert send_res.status_code == 200, f"Send quote failed: {send_res.text}"
        data = send_res.json()
        assert data["status"] == "sent"
        assert "sent_at" in data
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/quotes/{quote_id}")
        print("✓ Quote send changes status to 'sent'")

    def test_convert_quote_to_job(self):
        """POST /api/quotes/{id}/convert creates job and marks quote accepted"""
        # Create and send quote
        create_res = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_name": "TEST_Convert_Quote",
            "address": "Convert Ave",
            "job_description": "Quote to convert",
            "job_type": "cleaning",
            "price": 150.00,
            "pricing_type": "fixed_extras",
            "extras": [{"description": "Deep clean", "amount": 30.00}],
            "client_id": self.test_client_id
        })
        assert create_res.status_code == 200
        quote_id = create_res.json()["id"]
        
        # Send quote first
        self.session.post(f"{BASE_URL}/api/quotes/{quote_id}/send")
        
        # Convert to job
        convert_res = self.session.post(f"{BASE_URL}/api/quotes/{quote_id}/convert")
        assert convert_res.status_code == 200, f"Convert quote failed: {convert_res.text}"
        data = convert_res.json()
        assert "job_id" in data
        job_id = data["job_id"]
        
        # Verify quote is now accepted
        quote_res = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}")
        assert quote_res.status_code == 200
        quote_data = quote_res.json()
        assert quote_data["status"] == "accepted"
        assert quote_data["converted_job_id"] == job_id
        
        # Verify job was created with correct data
        job_res = self.session.get(f"{BASE_URL}/api/jobs/{job_id}")
        assert job_res.status_code == 200
        job_data = job_res.json()
        assert job_data["pricing_type"] == "fixed_extras"
        assert job_data["price"] == 150.00
        assert len(job_data["extras"]) == 1
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        self.session.delete(f"{BASE_URL}/api/quotes/{quote_id}")
        print("✓ Quote converted to job, quote marked accepted")

    # ==================== JOB WITH PRICING TYPE TESTS ====================
    
    def test_create_job_with_hourly_pricing(self):
        """POST /api/jobs with pricing_type=hourly and hourly_rate"""
        res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Hourly_Job",
            "job_type": "handyman",
            "address": "Hourly Job St",
            "scheduled_date": "2026-02-01T10:00:00Z",
            "pricing_type": "hourly",
            "hourly_rate": 65.00,
            "client_id": self.test_client_id
        })
        assert res.status_code == 200, f"Create hourly job failed: {res.text}"
        data = res.json()
        assert data["pricing_type"] == "hourly"
        assert data["hourly_rate"] == 65.00
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/jobs/{data['id']}")
        print("✓ Job created with hourly pricing type")

    def test_create_job_with_fixed_extras(self):
        """POST /api/jobs with pricing_type=fixed_extras"""
        res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Fixed_Extras_Job",
            "job_type": "painting",
            "address": "Paint St",
            "scheduled_date": "2026-02-02T09:00:00Z",
            "pricing_type": "fixed_extras",
            "price": 500.00,
            "extras": [
                {"description": "Premium paint", "amount": 100.00},
                {"description": "Prep work", "amount": 75.00}
            ]
        })
        assert res.status_code == 200, f"Create fixed_extras job failed: {res.text}"
        data = res.json()
        assert data["pricing_type"] == "fixed_extras"
        assert data["price"] == 500.00
        assert len(data["extras"]) == 2
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/jobs/{data['id']}")
        print("✓ Job created with fixed_extras pricing type")

    # ==================== TIMER TESTS ====================
    
    def test_timer_start_changes_job_to_in_progress(self):
        """POST /api/jobs/{id}/timer/start starts timer and changes status to in_progress"""
        # Create job
        job_res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Timer_Start_Job",
            "job_type": "plumbing",
            "address": "Timer St",
            "scheduled_date": "2026-02-01T10:00:00Z"
        })
        assert job_res.status_code == 200
        job_id = job_res.json()["id"]
        
        # Start timer
        start_res = self.session.post(f"{BASE_URL}/api/jobs/{job_id}/timer/start")
        assert start_res.status_code == 200, f"Timer start failed: {start_res.text}"
        data = start_res.json()
        assert data["timer_running"] == True
        assert data["status"] == "in_progress"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        print("✓ Timer start changes job to in_progress")

    def test_timer_pause_saves_elapsed_time(self):
        """POST /api/jobs/{id}/timer/pause pauses timer and saves elapsed time"""
        # Create job
        job_res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Timer_Pause_Job",
            "job_type": "electrical",
            "address": "Pause St",
            "scheduled_date": "2026-02-01T10:00:00Z"
        })
        assert job_res.status_code == 200
        job_id = job_res.json()["id"]
        
        # Start timer
        self.session.post(f"{BASE_URL}/api/jobs/{job_id}/timer/start")
        
        # Wait a bit
        time.sleep(2)
        
        # Pause timer
        pause_res = self.session.post(f"{BASE_URL}/api/jobs/{job_id}/timer/pause")
        assert pause_res.status_code == 200, f"Timer pause failed: {pause_res.text}"
        data = pause_res.json()
        assert data["timer_running"] == False
        assert data["total_time_seconds"] >= 1  # At least 1 second elapsed
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        print("✓ Timer pause saves elapsed time")

    def test_timer_resume(self):
        """POST /api/jobs/{id}/timer/resume resumes timer"""
        # Create job
        job_res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Timer_Resume_Job",
            "job_type": "cleaning",
            "address": "Resume St",
            "scheduled_date": "2026-02-01T10:00:00Z"
        })
        assert job_res.status_code == 200
        job_id = job_res.json()["id"]
        
        # Start, pause, then resume
        self.session.post(f"{BASE_URL}/api/jobs/{job_id}/timer/start")
        time.sleep(1)
        self.session.post(f"{BASE_URL}/api/jobs/{job_id}/timer/pause")
        
        resume_res = self.session.post(f"{BASE_URL}/api/jobs/{job_id}/timer/resume")
        assert resume_res.status_code == 200, f"Timer resume failed: {resume_res.text}"
        data = resume_res.json()
        assert data["timer_running"] == True
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        print("✓ Timer resume works correctly")

    def test_timer_adjust_employer_only(self):
        """PATCH /api/jobs/{id}/timer/adjust sets total_time_seconds (employer only)"""
        # Create job
        job_res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Timer_Adjust_Job",
            "job_type": "handyman",
            "address": "Adjust St",
            "scheduled_date": "2026-02-01T10:00:00Z"
        })
        assert job_res.status_code == 200
        job_id = job_res.json()["id"]
        
        # Adjust time to 2 hours (7200 seconds)
        adjust_res = self.session.patch(f"{BASE_URL}/api/jobs/{job_id}/timer/adjust", json={
            "total_time_seconds": 7200
        })
        assert adjust_res.status_code == 200, f"Timer adjust failed: {adjust_res.text}"
        data = adjust_res.json()
        assert data["total_time_seconds"] == 7200
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        print("✓ Timer adjust works for employer")

    def test_get_timer_state(self):
        """GET /api/jobs/{id}/timer returns current timer state"""
        # Create job
        job_res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Get_Timer_Job",
            "job_type": "plumbing",
            "address": "Get Timer St",
            "scheduled_date": "2026-02-01T10:00:00Z"
        })
        assert job_res.status_code == 200
        job_id = job_res.json()["id"]
        
        # Get timer state
        timer_res = self.session.get(f"{BASE_URL}/api/jobs/{job_id}/timer")
        assert timer_res.status_code == 200, f"Get timer failed: {timer_res.text}"
        data = timer_res.json()
        assert "total_time_seconds" in data
        assert "timer_running" in data
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        print("✓ GET timer state works")

    # ==================== INVOICE CALCULATION TESTS ====================
    
    def test_complete_hourly_job_invoice_calculation(self):
        """Hourly job: invoice subtotal = hours_worked * hourly_rate"""
        # Create hourly job
        job_res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Hourly_Invoice_Job",
            "job_type": "electrical",
            "address": "Invoice St",
            "scheduled_date": "2026-02-01T10:00:00Z",
            "pricing_type": "hourly",
            "hourly_rate": 50.00
        })
        assert job_res.status_code == 200
        job_id = job_res.json()["id"]
        
        # Adjust time to 2 hours
        self.session.patch(f"{BASE_URL}/api/jobs/{job_id}/timer/adjust", json={
            "total_time_seconds": 7200  # 2 hours
        })
        
        # Start job (to set status to in_progress)
        self.session.post(f"{BASE_URL}/api/jobs/{job_id}/start")
        
        # Complete job
        complete_res = self.session.post(f"{BASE_URL}/api/jobs/{job_id}/complete")
        assert complete_res.status_code == 200, f"Complete job failed: {complete_res.text}"
        
        # Get invoices and find the one for this job
        invoices_res = self.session.get(f"{BASE_URL}/api/invoices")
        assert invoices_res.status_code == 200
        invoices = invoices_res.json()
        
        job_invoice = next((inv for inv in invoices if inv.get("job_id") == job_id), None)
        assert job_invoice is not None, "Invoice not created for completed job"
        
        # Verify calculation: 2 hours * $50/hr = $100
        assert job_invoice["subtotal"] == 100.00, f"Expected subtotal 100, got {job_invoice['subtotal']}"
        assert job_invoice["hours_worked"] == 2.0
        assert job_invoice["pricing_type"] == "hourly"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/invoices/{job_invoice['id']}")
        self.session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        print("✓ Hourly job invoice calculation correct")

    def test_complete_fixed_extras_job_invoice_calculation(self):
        """Fixed+extras job: invoice subtotal = price + sum(extras)"""
        # Create fixed_extras job
        job_res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Fixed_Extras_Invoice_Job",
            "job_type": "painting",
            "address": "Extras St",
            "scheduled_date": "2026-02-01T10:00:00Z",
            "pricing_type": "fixed_extras",
            "price": 200.00,
            "extras": [
                {"description": "Materials", "amount": 50.00},
                {"description": "Travel", "amount": 25.00}
            ]
        })
        assert job_res.status_code == 200
        job_id = job_res.json()["id"]
        
        # Start and complete job
        self.session.post(f"{BASE_URL}/api/jobs/{job_id}/start")
        complete_res = self.session.post(f"{BASE_URL}/api/jobs/{job_id}/complete")
        assert complete_res.status_code == 200
        
        # Get invoice
        invoices_res = self.session.get(f"{BASE_URL}/api/invoices")
        invoices = invoices_res.json()
        job_invoice = next((inv for inv in invoices if inv.get("job_id") == job_id), None)
        assert job_invoice is not None
        
        # Verify calculation: $200 + $50 + $25 = $275
        assert job_invoice["subtotal"] == 275.00, f"Expected subtotal 275, got {job_invoice['subtotal']}"
        assert job_invoice["pricing_type"] == "fixed_extras"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/invoices/{job_invoice['id']}")
        self.session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        print("✓ Fixed+extras job invoice calculation correct")

    # ==================== INVOICE WORKFLOW TESTS ====================
    
    def test_invoice_draft_send_mark_paid_flow(self):
        """Invoice workflow: draft → send → mark paid"""
        # Create a job and complete it to get an invoice
        job_res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Invoice_Flow_Job",
            "job_type": "cleaning",
            "address": "Flow St",
            "scheduled_date": "2026-02-01T10:00:00Z",
            "price": 100.00
        })
        assert job_res.status_code == 200
        job_id = job_res.json()["id"]
        
        # Start and complete
        self.session.post(f"{BASE_URL}/api/jobs/{job_id}/start")
        self.session.post(f"{BASE_URL}/api/jobs/{job_id}/complete")
        
        # Get invoice
        invoices_res = self.session.get(f"{BASE_URL}/api/invoices")
        invoices = invoices_res.json()
        job_invoice = next((inv for inv in invoices if inv.get("job_id") == job_id), None)
        assert job_invoice is not None
        invoice_id = job_invoice["id"]
        
        # Verify draft status
        assert job_invoice["status"] == "draft"
        
        # Send invoice
        send_res = self.session.post(f"{BASE_URL}/api/invoices/{invoice_id}/send")
        assert send_res.status_code == 200
        assert send_res.json()["status"] == "sent"
        
        # Mark as paid
        paid_res = self.session.post(f"{BASE_URL}/api/invoices/{invoice_id}/mark-paid")
        assert paid_res.status_code == 200
        assert paid_res.json()["status"] == "paid"
        assert "paid_at" in paid_res.json()
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
        self.session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        print("✓ Invoice draft→send→mark-paid flow works")

    def test_invoice_has_job_link(self):
        """Invoice links back to job via job_id"""
        # Create and complete job
        job_res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Invoice_Link_Job",
            "job_type": "plumbing",
            "address": "Link St",
            "scheduled_date": "2026-02-01T10:00:00Z",
            "price": 150.00
        })
        assert job_res.status_code == 200
        job_id = job_res.json()["id"]
        
        self.session.post(f"{BASE_URL}/api/jobs/{job_id}/start")
        self.session.post(f"{BASE_URL}/api/jobs/{job_id}/complete")
        
        # Get invoice
        invoices_res = self.session.get(f"{BASE_URL}/api/invoices")
        invoices = invoices_res.json()
        job_invoice = next((inv for inv in invoices if inv.get("job_id") == job_id), None)
        assert job_invoice is not None
        assert job_invoice["job_id"] == job_id
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/invoices/{job_invoice['id']}")
        self.session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        print("✓ Invoice has job_id link")

    # ==================== CLIENT-JOB LINKING TESTS ====================
    
    def test_client_jobs_endpoint(self):
        """GET /api/clients/{id}/jobs returns job history for client"""
        # Create job for test client
        job_res = self.session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Client_Job_History",
            "job_type": "gardening",
            "address": "Client St",
            "scheduled_date": "2026-02-01T10:00:00Z",
            "client_id": self.test_client_id
        })
        assert job_res.status_code == 200
        job_id = job_res.json()["id"]
        
        # Get client jobs
        client_jobs_res = self.session.get(f"{BASE_URL}/api/clients/{self.test_client_id}/jobs")
        assert client_jobs_res.status_code == 200, f"Get client jobs failed: {client_jobs_res.text}"
        jobs = client_jobs_res.json()
        assert isinstance(jobs, list)
        assert any(j["id"] == job_id for j in jobs)
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        print("✓ Client jobs endpoint returns job history")


class TestWorkerTimerRestrictions:
    """Test that workers can use timer but cannot adjust time"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Create worker and job"""
        self.admin_session = requests.Session()
        self.admin_session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_res = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@churvox.com",
            "password": "Admin123!"
        })
        assert login_res.status_code == 200
        admin_token = login_res.json().get("token")
        self.admin_session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Try to login as existing worker or create new one
        self.worker_session = requests.Session()
        self.worker_session.headers.update({"Content-Type": "application/json"})
        
        worker_login = self.worker_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@churvox.com",
            "password": "Worker123!"
        })
        
        if worker_login.status_code == 200:
            worker_token = worker_login.json().get("token")
            self.worker_session.headers.update({"Authorization": f"Bearer {worker_token}"})
            self.worker_id = worker_login.json().get("id")
        else:
            # Create worker
            worker_res = self.admin_session.post(f"{BASE_URL}/api/team/workers", json={
                "name": "TEST_Timer_Worker",
                "email": "timerworker@test.com",
                "password": "Worker123!"
            })
            if worker_res.status_code == 200:
                self.worker_id = worker_res.json().get("id")
                # Login as worker
                worker_login = self.worker_session.post(f"{BASE_URL}/api/auth/login", json={
                    "email": "timerworker@test.com",
                    "password": "Worker123!"
                })
                if worker_login.status_code == 200:
                    worker_token = worker_login.json().get("token")
                    self.worker_session.headers.update({"Authorization": f"Bearer {worker_token}"})
        
        yield

    def test_worker_cannot_adjust_time(self):
        """Workers cannot adjust time (403)"""
        # Create job assigned to worker
        job_res = self.admin_session.post(f"{BASE_URL}/api/jobs", json={
            "title": "TEST_Worker_Adjust_Job",
            "job_type": "cleaning",
            "address": "Worker St",
            "scheduled_date": "2026-02-01T10:00:00Z",
            "assigned_worker_id": self.worker_id
        })
        
        if job_res.status_code != 200:
            pytest.skip("Could not create job for worker test")
        
        job_id = job_res.json()["id"]
        
        # Worker tries to adjust time
        adjust_res = self.worker_session.patch(f"{BASE_URL}/api/jobs/{job_id}/timer/adjust", json={
            "total_time_seconds": 3600
        })
        assert adjust_res.status_code == 403, f"Expected 403, got {adjust_res.status_code}"
        
        # Cleanup
        self.admin_session.delete(f"{BASE_URL}/api/jobs/{job_id}")
        print("✓ Worker cannot adjust time (403)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
