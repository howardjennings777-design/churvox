#!/usr/bin/env python3
"""
Backend API Testing for Churvox AI Operator Endpoints
Tests all AI Operator endpoints with proper auth and validation
"""

import requests
import json
import os
from datetime import datetime

# Load backend URL from frontend .env
BACKEND_URL = "https://admin-portal-draft.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def log_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def log_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def log_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.RESET}")

def log_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.RESET}")

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def add_pass(self, test_name, details=""):
        self.passed.append((test_name, details))
        log_success(f"{test_name}: PASS {details}")
    
    def add_fail(self, test_name, details=""):
        self.failed.append((test_name, details))
        log_error(f"{test_name}: FAIL {details}")
    
    def add_warning(self, test_name, details=""):
        self.warnings.append((test_name, details))
        log_warning(f"{test_name}: WARNING {details}")
    
    def summary(self):
        print("\n" + "="*80)
        print(f"TEST SUMMARY: {len(self.passed)} passed, {len(self.failed)} failed, {len(self.warnings)} warnings")
        print("="*80)
        
        if self.failed:
            print(f"\n{Colors.RED}FAILED TESTS:{Colors.RESET}")
            for name, details in self.failed:
                print(f"  ✗ {name}: {details}")
        
        if self.warnings:
            print(f"\n{Colors.YELLOW}WARNINGS:{Colors.RESET}")
            for name, details in self.warnings:
                print(f"  ⚠ {name}: {details}")
        
        if self.passed:
            print(f"\n{Colors.GREEN}PASSED TESTS:{Colors.RESET}")
            for name, details in self.passed:
                print(f"  ✓ {name}")
        
        return len(self.failed) == 0

results = TestResults()

def test_auth_signup():
    """Create a fresh owner account"""
    log_info("Creating fresh owner account...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    email = f"test_owner_{timestamp}@example.com"
    password = "TestOwner123!"
    
    payload = {
        "email": email,
        "password": password,
        "name": "Test Owner",
        "business_name": "Test Business"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/register", json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            user = data.get("user", {})
            role = user.get("role", "")
            
            if not token:
                results.add_fail("Auth Signup", "No token in response")
                return None, None, None
            
            # Save credentials
            with open("/app/memory/test_credentials.md", "w") as f:
                f.write("# Test credentials — Churvox\n\n")
                f.write(f"## Owner Account (created {timestamp})\n")
                f.write(f"- Email: {email}\n")
                f.write(f"- Password: {password}\n")
                f.write(f"- Role: {role}\n")
                f.write(f"- Token: {token[:20]}...\n")
            
            results.add_pass("Auth Signup", f"Created owner account with role={role}")
            return email, password, token
        else:
            results.add_fail("Auth Signup", f"Status {response.status_code}: {response.text[:200]}")
            return None, None, None
    except Exception as e:
        results.add_fail("Auth Signup", f"Exception: {str(e)}")
        return None, None, None

def test_auth_me(token):
    """Verify token and get user info"""
    log_info("Testing /auth/me endpoint...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            role = user.get("role", "")
            email = user.get("email", "")
            
            results.add_pass("Auth Me", f"Verified user: {email}, role={role}")
            return True
        else:
            results.add_fail("Auth Me", f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        results.add_fail("Auth Me", f"Exception: {str(e)}")
        return False

def test_ai_operator_settings_get(token):
    """Test GET /ai-operator/settings"""
    log_info("Testing GET /ai-operator/settings...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BACKEND_URL}/ai-operator/settings", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if not data.get("success"):
                results.add_fail("GET /ai-operator/settings", "success=false in response")
                return False
            
            settings = data.get("settings", {})
            
            # Check required fields
            required_fields = [
                "operator_mode", "accounting_changes_locked", "payroll_changes_locked",
                "quiet_hours_enabled", "quiet_hours_start", "quiet_hours_end",
                "max_messages_per_client_per_day", "owner_notify_on_action"
            ]
            
            missing = [f for f in required_fields if f not in settings]
            if missing:
                results.add_fail("GET /ai-operator/settings", f"Missing fields: {missing}")
                return False
            
            # Verify locked fields
            if settings.get("accounting_changes_locked") != True:
                results.add_fail("GET /ai-operator/settings", "accounting_changes_locked should be True")
                return False
            
            if settings.get("payroll_changes_locked") != True:
                results.add_fail("GET /ai-operator/settings", "payroll_changes_locked should be True")
                return False
            
            # Verify default operator_mode
            if settings.get("operator_mode") not in ["approval_first", "auto_safe", "auto_send"]:
                results.add_warning("GET /ai-operator/settings", f"Unexpected operator_mode: {settings.get('operator_mode')}")
            
            results.add_pass("GET /ai-operator/settings", f"operator_mode={settings.get('operator_mode')}, locked fields verified")
            return True
        else:
            results.add_fail("GET /ai-operator/settings", f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        results.add_fail("GET /ai-operator/settings", f"Exception: {str(e)}")
        return False

def test_ai_operator_settings_patch(token):
    """Test PATCH /ai-operator/settings"""
    log_info("Testing PATCH /ai-operator/settings...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: Valid update
    payload = {
        "operator_mode": "auto_send",
        "quiet_hours_enabled": True,
        "quiet_hours_start": "21:00",
        "quiet_hours_end": "06:30",
        "max_messages_per_client_per_day": 3,
        "require_approval_for_first_message": True,
        "owner_notify_on_action": True
    }
    
    try:
        response = requests.patch(f"{BACKEND_URL}/ai-operator/settings", json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            settings = data.get("settings", {})
            
            # Verify persisted values
            if settings.get("operator_mode") != "auto_send":
                results.add_fail("PATCH /ai-operator/settings", f"operator_mode not persisted: {settings.get('operator_mode')}")
                return False
            
            if settings.get("quiet_hours_start") != "21:00":
                results.add_fail("PATCH /ai-operator/settings", f"quiet_hours_start not persisted: {settings.get('quiet_hours_start')}")
                return False
            
            if settings.get("max_messages_per_client_per_day") != 3:
                results.add_fail("PATCH /ai-operator/settings", f"max_messages_per_client_per_day not persisted: {settings.get('max_messages_per_client_per_day')}")
                return False
            
            # Verify locked fields remain true
            if settings.get("accounting_changes_locked") != True or settings.get("payroll_changes_locked") != True:
                results.add_fail("PATCH /ai-operator/settings", "Locked fields should remain True after PATCH")
                return False
            
            results.add_pass("PATCH /ai-operator/settings (valid)", "Settings persisted correctly")
        else:
            results.add_fail("PATCH /ai-operator/settings (valid)", f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        results.add_fail("PATCH /ai-operator/settings (valid)", f"Exception: {str(e)}")
        return False
    
    # Test 2: Invalid operator_mode should fallback to approval_first
    log_info("Testing PATCH with invalid operator_mode...")
    payload_invalid = {"operator_mode": "yolo"}
    
    try:
        response = requests.patch(f"{BACKEND_URL}/ai-operator/settings", json=payload_invalid, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            settings = data.get("settings", {})
            
            if settings.get("operator_mode") == "approval_first":
                results.add_pass("PATCH /ai-operator/settings (invalid mode)", "Invalid mode correctly fell back to approval_first")
            else:
                results.add_warning("PATCH /ai-operator/settings (invalid mode)", f"Expected fallback to approval_first, got {settings.get('operator_mode')}")
        else:
            results.add_fail("PATCH /ai-operator/settings (invalid mode)", f"Status {response.status_code}")
    except Exception as e:
        results.add_fail("PATCH /ai-operator/settings (invalid mode)", f"Exception: {str(e)}")
    
    return True

def test_ai_auto_send_settings(token):
    """Test GET and PATCH /ai-auto-send/settings"""
    log_info("Testing GET /ai-auto-send/settings...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test GET
    try:
        response = requests.get(f"{BACKEND_URL}/ai-auto-send/settings", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if not data.get("success"):
                results.add_fail("GET /ai-auto-send/settings", "success=false in response")
                return False
            
            settings = data.get("settings", {})
            results.add_pass("GET /ai-auto-send/settings", f"Retrieved settings with {len(settings)} fields")
        else:
            results.add_fail("GET /ai-auto-send/settings", f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        results.add_fail("GET /ai-auto-send/settings", f"Exception: {str(e)}")
        return False
    
    # Test PATCH
    log_info("Testing PATCH /ai-auto-send/settings...")
    payload = {
        "ai_auto_send_enabled": True,
        "quote_followup_auto_send": True,
        "invoice_reminder_auto_send": True
    }
    
    try:
        response = requests.patch(f"{BACKEND_URL}/ai-auto-send/settings", json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            settings = data.get("settings", {})
            
            # Verify persisted
            if settings.get("ai_auto_send_enabled") != True:
                results.add_fail("PATCH /ai-auto-send/settings", "ai_auto_send_enabled not persisted")
                return False
            
            if settings.get("quote_followup_auto_send") != True:
                results.add_fail("PATCH /ai-auto-send/settings", "quote_followup_auto_send not persisted")
                return False
            
            results.add_pass("PATCH /ai-auto-send/settings", "Settings persisted correctly")
            return True
        else:
            results.add_fail("PATCH /ai-auto-send/settings", f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        results.add_fail("PATCH /ai-auto-send/settings", f"Exception: {str(e)}")
        return False

def test_ai_operator_setup_status(token):
    """Test GET /ai-operator/setup-status"""
    log_info("Testing GET /ai-operator/setup-status...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BACKEND_URL}/ai-operator/setup-status", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if not data.get("success"):
                results.add_fail("GET /ai-operator/setup-status", "success=false in response")
                return False
            
            # Check structure
            sms = data.get("sms", {})
            myob = data.get("myob", {})
            ai = data.get("ai", {})
            
            # Verify SMS structure
            required_sms_fields = ["ready", "test_only", "credits", "provider", "blocked_reason"]
            missing_sms = [f for f in required_sms_fields if f not in sms]
            if missing_sms:
                results.add_fail("GET /ai-operator/setup-status", f"SMS missing fields: {missing_sms}")
                return False
            
            # Verify MYOB structure
            required_myob_fields = ["ready", "credentials_present", "connected", "blocked_reason"]
            missing_myob = [f for f in required_myob_fields if f not in myob]
            if missing_myob:
                results.add_fail("GET /ai-operator/setup-status", f"MYOB missing fields: {missing_myob}")
                return False
            
            # Verify AI structure
            required_ai_fields = ["ready", "blocked_reason"]
            missing_ai = [f for f in required_ai_fields if f not in ai]
            if missing_ai:
                results.add_fail("GET /ai-operator/setup-status", f"AI missing fields: {missing_ai}")
                return False
            
            # Check SMS readiness (CLICKSEND_API_KEY is set in .env)
            if sms.get("ready") == True:
                results.add_pass("GET /ai-operator/setup-status", f"SMS ready={sms.get('ready')}, credits={sms.get('credits')}")
            else:
                results.add_warning("GET /ai-operator/setup-status", f"SMS not ready: {sms.get('blocked_reason')}")
            
            # Check MYOB (should be not ready for fresh business)
            if myob.get("ready") == False:
                results.add_pass("GET /ai-operator/setup-status (MYOB)", f"MYOB correctly not ready: {myob.get('blocked_reason')}")
            else:
                results.add_warning("GET /ai-operator/setup-status (MYOB)", "MYOB unexpectedly ready for fresh business")
            
            # Check AI
            if ai.get("ready") == True:
                results.add_pass("GET /ai-operator/setup-status (AI)", "AI ready")
            else:
                results.add_warning("GET /ai-operator/setup-status (AI)", f"AI not ready: {ai.get('blocked_reason')}")
            
            return True
        else:
            results.add_fail("GET /ai-operator/setup-status", f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        results.add_fail("GET /ai-operator/setup-status", f"Exception: {str(e)}")
        return False

def test_ai_operator_audit_log(token):
    """Test GET /ai-operator/audit-log"""
    log_info("Testing GET /ai-operator/audit-log...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BACKEND_URL}/ai-operator/audit-log?limit=50", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if not data.get("success"):
                results.add_fail("GET /ai-operator/audit-log", "success=false in response")
                return False
            
            logs = data.get("logs", [])
            results.add_pass("GET /ai-operator/audit-log", f"Retrieved {len(logs)} logs (empty is OK for fresh business)")
            return True
        else:
            results.add_fail("GET /ai-operator/audit-log", f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        results.add_fail("GET /ai-operator/audit-log", f"Exception: {str(e)}")
        return False

def test_ai_operator_command_snapshot(token):
    """Test GET /ai-operator/command-snapshot"""
    log_info("Testing GET /ai-operator/command-snapshot...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BACKEND_URL}/ai-operator/command-snapshot", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if not data.get("success"):
                results.add_fail("GET /ai-operator/command-snapshot", "success=false in response")
                return False
            
            # Check structure
            approvals = data.get("approvals", {})
            urgent = data.get("urgent", {})
            next_best_move = data.get("next_best_move", "")
            scanned_at = data.get("scanned_at", "")
            
            # Verify approvals structure
            if "total_pending" not in approvals:
                results.add_fail("GET /ai-operator/command-snapshot", "Missing approvals.total_pending")
                return False
            
            if "by_group" not in approvals:
                results.add_fail("GET /ai-operator/command-snapshot", "Missing approvals.by_group")
                return False
            
            if "by_type" not in approvals:
                results.add_fail("GET /ai-operator/command-snapshot", "Missing approvals.by_type")
                return False
            
            if "items" not in approvals:
                results.add_fail("GET /ai-operator/command-snapshot", "Missing approvals.items")
                return False
            
            # Verify urgent structure
            required_urgent_fields = [
                "unassigned_jobs", "completed_no_invoice", "overdue_invoices",
                "open_invoices_total", "open_quotes", "pending_timesheets",
                "low_sms_credits", "sms_credits", "myob_connected",
                "active_workers", "active_jobs"
            ]
            missing_urgent = [f for f in required_urgent_fields if f not in urgent]
            if missing_urgent:
                results.add_fail("GET /ai-operator/command-snapshot", f"Urgent missing fields: {missing_urgent}")
                return False
            
            # Verify next_best_move is a string
            if not isinstance(next_best_move, str):
                results.add_fail("GET /ai-operator/command-snapshot", "next_best_move should be a string")
                return False
            
            results.add_pass("GET /ai-operator/command-snapshot", f"next_best_move='{next_best_move[:50]}...', pending={approvals.get('total_pending')}")
            return True
        else:
            results.add_fail("GET /ai-operator/command-snapshot", f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        results.add_fail("GET /ai-operator/command-snapshot", f"Exception: {str(e)}")
        return False

def test_ai_operator_actions(token):
    """Test GET /ai-operator/actions (regression check)"""
    log_info("Testing GET /ai-operator/actions (regression check)...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BACKEND_URL}/ai-operator/actions", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if not data.get("success"):
                results.add_fail("GET /ai-operator/actions", "success=false in response")
                return False
            
            actions = data.get("actions", [])
            results.add_pass("GET /ai-operator/actions", f"Retrieved {len(actions)} actions (regression check passed)")
            return True
        else:
            results.add_fail("GET /ai-operator/actions", f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        results.add_fail("GET /ai-operator/actions", f"Exception: {str(e)}")
        return False

def test_smart_hub_scan(token):
    """Test POST /smart-hub/scan"""
    log_info("Testing POST /smart-hub/scan...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(f"{BACKEND_URL}/smart-hub/scan", json={}, headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            results.add_pass("POST /smart-hub/scan", f"Scan completed (count not asserted)")
            return True
        else:
            results.add_fail("POST /smart-hub/scan", f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        results.add_fail("POST /smart-hub/scan", f"Exception: {str(e)}")
        return False

def test_auth_guards():
    """Test 401 for unauthenticated requests"""
    log_info("Testing auth guards (401 for no auth)...")
    
    endpoints = [
        "/ai-operator/settings",
        "/ai-operator/setup-status",
        "/ai-operator/audit-log",
        "/ai-operator/command-snapshot",
        "/ai-operator/actions",
        "/ai-auto-send/settings"
    ]
    
    all_passed = True
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=10)
            
            if response.status_code == 401:
                log_success(f"  {endpoint}: 401 (correct)")
            else:
                results.add_fail(f"Auth guard {endpoint}", f"Expected 401, got {response.status_code}")
                all_passed = False
        except Exception as e:
            results.add_fail(f"Auth guard {endpoint}", f"Exception: {str(e)}")
            all_passed = False
    
    if all_passed:
        results.add_pass("Auth guards (401)", "All endpoints correctly return 401 without auth")
    
    return all_passed

def main():
    print("\n" + "="*80)
    print("CHURVOX AI OPERATOR BACKEND API TESTS")
    print("="*80 + "\n")
    
    log_info(f"Backend URL: {BACKEND_URL}")
    
    # Step 1: Create owner account
    email, password, token = test_auth_signup()
    if not token:
        log_error("Cannot proceed without valid token")
        results.summary()
        return 1
    
    # Step 2: Verify token
    test_auth_me(token)
    
    # Step 3: Test AI Operator endpoints
    test_ai_operator_settings_get(token)
    test_ai_operator_settings_patch(token)
    test_ai_auto_send_settings(token)
    test_ai_operator_setup_status(token)
    test_ai_operator_audit_log(token)
    test_ai_operator_command_snapshot(token)
    test_ai_operator_actions(token)
    test_smart_hub_scan(token)
    
    # Step 4: Test auth guards
    test_auth_guards()
    
    # Summary
    success = results.summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
