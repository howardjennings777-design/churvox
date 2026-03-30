#!/usr/bin/env python3
"""
Churvox Phase 1 Backend API Testing
Tests all core contractor app functionality
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class ChurvoxAPITester:
    def __init__(self, base_url="https://phase1-launch.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        
        # Test data storage
        self.client_id = None
        self.job_id = None
        self.quote_id = None
        self.invoice_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, auth_required: bool = True) -> tuple[bool, Dict]:
        """Make API request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            if not success:
                print(f"   Status: {response.status_code}, Expected: {expected_status}")
                if response_data:
                    print(f"   Response: {response_data}")

            return success, response_data

        except Exception as e:
            print(f"   Request failed: {str(e)}")
            return False, {"error": str(e)}

    def test_auth_login(self):
        """Test admin login"""
        success, response = self.make_request(
            'POST', 'auth/login',
            data={"email": "admin@churvox.com", "password": "Admin123!"},
            auth_required=False
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('id')
            self.log_test("Admin Login", True)
            return True
        else:
            self.log_test("Admin Login", False, f"Login failed: {response}")
            return False

    def test_auth_me(self):
        """Test get current user"""
        success, response = self.make_request('GET', 'auth/me')
        
        if success and response.get('email') == 'admin@churvox.com':
            self.log_test("Get Current User", True)
            return True
        else:
            self.log_test("Get Current User", False, f"Failed: {response}")
            return False

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.make_request('GET', 'dashboard/stats')
        
        expected_fields = ['jobs_today', 'jobs_this_week', 'completed_this_month', 
                          'revenue_this_month', 'pending_invoices', 'active_clients']
        
        if success and all(field in response for field in expected_fields):
            self.log_test("Dashboard Stats", True)
            return True
        else:
            self.log_test("Dashboard Stats", False, f"Missing fields: {response}")
            return False

    def test_create_client(self):
        """Test client creation"""
        client_data = {
            "name": "Test Client",
            "email": "testclient@example.com",
            "phone": "+64 21 123 4567",
            "address": "123 Test Street, Auckland",
            "notes": "Test client for API testing"
        }
        
        success, response = self.make_request('POST', 'clients', data=client_data, expected_status=200)
        
        if success and 'id' in response:
            self.client_id = response['id']
            self.log_test("Create Client", True)
            return True
        else:
            self.log_test("Create Client", False, f"Failed: {response}")
            return False

    def test_get_clients(self):
        """Test get clients list"""
        success, response = self.make_request('GET', 'clients')
        
        if success and isinstance(response, list):
            self.log_test("Get Clients", True)
            return True
        else:
            self.log_test("Get Clients", False, f"Failed: {response}")
            return False

    def test_create_job(self):
        """Test job creation"""
        if not self.client_id:
            self.log_test("Create Job", False, "No client_id available")
            return False
            
        job_data = {
            "title": "Lawn Mowing Service",
            "job_type": "lawn_mowing",
            "client_id": self.client_id,
            "customer_name": "Test Client",
            "address": "123 Test Street, Auckland",
            "scheduled_date": (datetime.now() + timedelta(days=1)).isoformat(),
            "scheduled_time": "09:00",
            "estimated_duration": 60,
            "price": 150.0,
            "notes": "Regular lawn mowing service",
            "is_recurring": False
        }
        
        success, response = self.make_request('POST', 'jobs', data=job_data, expected_status=200)
        
        if success and 'id' in response:
            self.job_id = response['id']
            self.log_test("Create Job", True)
            return True
        else:
            self.log_test("Create Job", False, f"Failed: {response}")
            return False

    def test_start_job(self):
        """Test starting a job"""
        if not self.job_id:
            self.log_test("Start Job", False, "No job_id available")
            return False
            
        success, response = self.make_request('POST', f'jobs/{self.job_id}/start')
        
        if success and response.get('status') == 'in_progress':
            self.log_test("Start Job", True)
            return True
        else:
            self.log_test("Start Job", False, f"Failed: {response}")
            return False

    def test_complete_job(self):
        """Test completing a job (should auto-create invoice)"""
        if not self.job_id:
            self.log_test("Complete Job", False, "No job_id available")
            return False
            
        success, response = self.make_request('POST', f'jobs/{self.job_id}/complete')
        
        if success and response.get('status') == 'completed':
            self.log_test("Complete Job", True)
            return True
        else:
            self.log_test("Complete Job", False, f"Failed: {response}")
            return False

    def test_verify_auto_invoice(self):
        """Test that invoice was auto-created with 15% GST"""
        success, response = self.make_request('GET', 'invoices')
        
        if success and isinstance(response, list) and len(response) > 0:
            # Find invoice for our job
            job_invoice = None
            for invoice in response:
                if invoice.get('job_id') == self.job_id:
                    job_invoice = invoice
                    self.invoice_id = invoice['id']
                    break
            
            if job_invoice:
                gst_rate = job_invoice.get('gst_rate', 0)
                subtotal = job_invoice.get('subtotal', 0)
                gst_amount = job_invoice.get('gst_amount', 0)
                total = job_invoice.get('total', 0)
                
                # Verify 15% GST calculation
                expected_gst = subtotal * 0.15
                expected_total = subtotal + expected_gst
                
                if (gst_rate == 15.0 and 
                    abs(gst_amount - expected_gst) < 0.01 and 
                    abs(total - expected_total) < 0.01):
                    self.log_test("Auto-Invoice with 15% GST", True)
                    return True
                else:
                    self.log_test("Auto-Invoice with 15% GST", False, 
                                f"GST calculation incorrect: rate={gst_rate}, gst_amount={gst_amount}, expected={expected_gst}")
                    return False
            else:
                self.log_test("Auto-Invoice with 15% GST", False, "No invoice found for completed job")
                return False
        else:
            self.log_test("Auto-Invoice with 15% GST", False, f"Failed to get invoices: {response}")
            return False

    def test_create_quote(self):
        """Test quote creation"""
        quote_data = {
            "customer_name": "Potential Client",
            "customer_email": "potential@example.com",
            "address": "456 Quote Street, Wellington",
            "job_description": "Garden maintenance and landscaping",
            "price": 500.0,
            "notes": "Includes hedge trimming and lawn care",
            "valid_until": (datetime.now() + timedelta(days=30)).isoformat()
        }
        
        success, response = self.make_request('POST', 'quotes', data=quote_data, expected_status=200)
        
        if success and 'id' in response:
            self.quote_id = response['id']
            self.log_test("Create Quote", True)
            return True
        else:
            self.log_test("Create Quote", False, f"Failed: {response}")
            return False

    def test_send_quote(self):
        """Test marking quote as sent"""
        if not self.quote_id:
            self.log_test("Send Quote", False, "No quote_id available")
            return False
            
        success, response = self.make_request('POST', f'quotes/{self.quote_id}/send')
        
        if success and response.get('status') == 'sent':
            self.log_test("Send Quote", True)
            return True
        else:
            self.log_test("Send Quote", False, f"Failed: {response}")
            return False

    def test_get_jobs_today(self):
        """Test get jobs today endpoint"""
        success, response = self.make_request('GET', 'jobs/today')
        
        if success and isinstance(response, list):
            self.log_test("Get Jobs Today", True)
            return True
        else:
            self.log_test("Get Jobs Today", False, f"Failed: {response}")
            return False

    def test_get_jobs_week(self):
        """Test get jobs this week endpoint"""
        success, response = self.make_request('GET', 'jobs/week')
        
        if success and isinstance(response, list):
            self.log_test("Get Jobs This Week", True)
            return True
        else:
            self.log_test("Get Jobs This Week", False, f"Failed: {response}")
            return False

    def test_auth_logout(self):
        """Test logout"""
        success, response = self.make_request('POST', 'auth/logout')
        
        if success:
            self.log_test("Logout", True)
            return True
        else:
            self.log_test("Logout", False, f"Failed: {response}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Churvox Phase 1 Backend API Tests")
        print("=" * 60)
        
        # Authentication tests
        if not self.test_auth_login():
            print("❌ Login failed - stopping tests")
            return False
            
        self.test_auth_me()
        
        # Dashboard tests
        self.test_dashboard_stats()
        
        # Client tests
        self.test_create_client()
        self.test_get_clients()
        
        # Job workflow tests
        self.test_create_job()
        self.test_start_job()
        self.test_complete_job()
        self.test_verify_auto_invoice()
        
        # Quote tests
        self.test_create_quote()
        self.test_send_quote()
        
        # Additional endpoint tests
        self.test_get_jobs_today()
        self.test_get_jobs_week()
        
        # Cleanup
        self.test_auth_logout()
        
        # Results
        print("\n" + "=" * 60)
        print(f"📊 Backend Tests Complete: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = ChurvoxAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())