"""
SMS ClickSend Integration Tests - Iteration 14
Tests for ClickSend SMS provider integration including:
- Test SMS endpoint (no credits needed)
- Provider balance check
- Buy credits
- Send SMS with credits
- SMS history
- SMS packs
- Phone number formatting
"""

import pytest
import requests
import os
BASE_URL = "https://grassley-backend.onrender.com"

# Test credentials
ADMIN_EMAIL = "admin@churvox.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.mark.skip(reason="Provider-specific integration tests require dedicated live provider test envs")
class TestSMSClickSendIntegration:
    """ClickSend SMS integration tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session and authenticate"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        # Extract token from cookies or response
        if "access_token" in login_resp.cookies:
            self.session.cookies.set("access_token", login_resp.cookies["access_token"])
        
        data = login_resp.json()
        if "access_token" in data:
            self.session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
        
        yield
        
        # Cleanup
        self.session.close()

    # ==================== SMS Test Endpoint ====================
    def test_sms_test_endpoint_sends_via_clicksend(self):
        """POST /api/sms/test sends SMS via ClickSend (no credits needed)"""
        response = self.session.post(f"{BASE_URL}/api/sms/test", json={
            "phone": "0412345678",
            "message": "Test SMS from Churvox pytest"
        })
        
        assert response.status_code == 200, f"Test SMS failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "success" in data, "Response missing 'success' field"
        assert data["success"] == True, f"SMS test not successful: {data}"
        assert "provider" in data, "Response missing 'provider' field"
        assert data["provider"] == "clicksend", f"Expected clicksend provider, got: {data['provider']}"
        assert "message_id" in data, "Response missing 'message_id' field"
        assert data["message_id"] is not None, "message_id should not be None"
        
        # Status may be COUNTRY_NOT_ENABLED for AU test accounts
        assert "status" in data, "Response missing 'status' field"
        print(f"Test SMS result: success={data['success']}, status={data['status']}, message_id={data['message_id']}")

    # ==================== Provider Balance ====================
    def test_provider_balance_returns_clicksend_balance(self):
        """GET /api/sms/provider-balance returns ClickSend account balance"""
        response = self.session.get(f"{BASE_URL}/api/sms/provider-balance")
        
        assert response.status_code == 200, f"Provider balance failed: {response.text}"
        data = response.json()
        
        assert "provider" in data, "Response missing 'provider' field"
        assert data["provider"] == "ClickSendProvider", f"Expected ClickSendProvider, got: {data['provider']}"
        assert "balance" in data, "Response missing 'balance' field"
        # Balance should be numeric (float or int) or None
        assert data["balance"] is None or isinstance(data["balance"], (int, float)), \
            f"Balance should be numeric, got: {type(data['balance'])}"
        print(f"ClickSend balance: {data['balance']}")

    # ==================== SMS Packs ====================
    def test_sms_packs_returns_available_options(self):
        """GET /api/sms/packs returns available SMS pack options"""
        response = self.session.get(f"{BASE_URL}/api/sms/packs")
        
        assert response.status_code == 200, f"SMS packs failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 3, f"Expected at least 3 packs, got {len(data)}"
        
        # Verify pack structure
        pack_ids = [p["id"] for p in data]
        assert "100" in pack_ids, "Missing 100 credit pack"
        assert "500" in pack_ids, "Missing 500 credit pack"
        assert "1000" in pack_ids, "Missing 1000 credit pack"
        
        for pack in data:
            assert "id" in pack, "Pack missing 'id'"
            assert "credits" in pack, "Pack missing 'credits'"
            assert "price" in pack, "Pack missing 'price'"
            assert isinstance(pack["credits"], int), "Credits should be int"
            assert isinstance(pack["price"], (int, float)), "Price should be numeric"
        
        print(f"Available packs: {data}")

    # ==================== Buy Credits ====================
    def test_buy_credits_adds_100_credits(self):
        """POST /api/sms/buy-credits with pack '100' adds 100 credits"""
        # Get current balance first
        balance_before = self.session.get(f"{BASE_URL}/api/sms/balance").json().get("balance", 0)
        
        response = self.session.post(f"{BASE_URL}/api/sms/buy-credits", json={
            "pack": "100"
        })
        
        assert response.status_code == 200, f"Buy credits failed: {response.text}"
        data = response.json()
        
        assert "message" in data, "Response missing 'message'"
        assert "100 credits added" in data["message"], f"Unexpected message: {data['message']}"
        assert "balance" in data, "Response missing 'balance'"
        
        # Verify balance increased by 100
        expected_balance = balance_before + 100
        assert data["balance"] == expected_balance, \
            f"Expected balance {expected_balance}, got {data['balance']}"
        
        print(f"Credits purchased: balance before={balance_before}, after={data['balance']}")

    def test_buy_credits_invalid_pack_returns_400(self):
        """POST /api/sms/buy-credits with invalid pack returns 400"""
        response = self.session.post(f"{BASE_URL}/api/sms/buy-credits", json={
            "pack": "999"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "Invalid pack" in data.get("detail", ""), f"Unexpected error: {data}"

    # ==================== Send SMS with Credits ====================
    def test_send_sms_with_credits_deducts_and_returns_provider(self):
        """POST /api/sms/send with credits sends via ClickSend, deducts 1 credit"""
        # Ensure we have credits
        balance_resp = self.session.get(f"{BASE_URL}/api/sms/balance")
        balance_before = balance_resp.json().get("balance", 0)
        
        if balance_before < 1:
            # Buy credits if needed
            self.session.post(f"{BASE_URL}/api/sms/buy-credits", json={"pack": "100"})
            balance_before = self.session.get(f"{BASE_URL}/api/sms/balance").json().get("balance", 0)
        
        response = self.session.post(f"{BASE_URL}/api/sms/send", json={
            "recipient_phone": "0412345678",
            "message_type": "custom",
            "custom_message": "Test SMS from pytest - credit deduction test"
        })
        
        assert response.status_code == 200, f"Send SMS failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "Response missing 'message'"
        assert data["message"] == "SMS sent", f"Unexpected message: {data['message']}"
        assert "provider" in data, "Response missing 'provider'"
        assert data["provider"] == "clicksend", f"Expected clicksend, got: {data['provider']}"
        assert "message_id" in data, "Response missing 'message_id'"
        assert data["message_id"] is not None, "message_id should not be None"
        assert "balance" in data, "Response missing 'balance'"
        
        # Verify credit deduction
        expected_balance = balance_before - 1
        assert data["balance"] == expected_balance, \
            f"Expected balance {expected_balance}, got {data['balance']}"
        
        print(f"SMS sent: provider={data['provider']}, message_id={data['message_id']}, balance={data['balance']}")

    def test_send_sms_with_zero_credits_returns_400(self):
        """POST /api/sms/send with 0 credits returns 400 Insufficient SMS credits"""
        # Create a new test user with no credits to test this
        # For now, we'll skip if admin has credits (which they do)
        balance_resp = self.session.get(f"{BASE_URL}/api/sms/balance")
        balance = balance_resp.json().get("balance", 0)
        
        if balance > 0:
            pytest.skip(f"Admin has {balance} credits - cannot test zero credit scenario without separate test user")
        
        response = self.session.post(f"{BASE_URL}/api/sms/send", json={
            "recipient_phone": "0412345678",
            "message_type": "custom",
            "custom_message": "This should fail"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "Insufficient SMS credits" in data.get("detail", ""), f"Unexpected error: {data}"

    # ==================== SMS History ====================
    def test_sms_history_returns_logs_with_required_fields(self):
        """GET /api/sms/history returns SMS logs with provider, message_id, status fields"""
        response = self.session.get(f"{BASE_URL}/api/sms/history")
        
        assert response.status_code == 200, f"SMS history failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            log = data[0]  # Check first log entry
            assert "provider" in log, "Log missing 'provider' field"
            assert "message_id" in log, "Log missing 'message_id' field"
            assert "status" in log, "Log missing 'status' field"
            assert "recipient_phone" in log, "Log missing 'recipient_phone' field"
            assert "message" in log, "Log missing 'message' field"
            assert "created_at" in log, "Log missing 'created_at' field"
            
            print(f"SMS history has {len(data)} entries. Latest: provider={log['provider']}, status={log['status']}")
        else:
            print("SMS history is empty (no SMS sent yet)")

    # ==================== SMS Templates ====================
    def test_sms_template_customer_reminder(self):
        """SMS template works for customer_reminder type"""
        # Ensure credits
        balance = self.session.get(f"{BASE_URL}/api/sms/balance").json().get("balance", 0)
        if balance < 1:
            self.session.post(f"{BASE_URL}/api/sms/buy-credits", json={"pack": "100"})
        
        response = self.session.post(f"{BASE_URL}/api/sms/send", json={
            "recipient_phone": "0412345678",
            "message_type": "customer_reminder"
        })
        
        assert response.status_code == 200, f"customer_reminder SMS failed: {response.text}"
        data = response.json()
        assert "sms_message" in data, "Response missing 'sms_message'"
        assert "reminder" in data["sms_message"].lower(), f"Message doesn't contain 'reminder': {data['sms_message']}"
        print(f"customer_reminder template: {data['sms_message']}")

    def test_sms_template_on_the_way(self):
        """SMS template works for on_the_way type"""
        balance = self.session.get(f"{BASE_URL}/api/sms/balance").json().get("balance", 0)
        if balance < 1:
            self.session.post(f"{BASE_URL}/api/sms/buy-credits", json={"pack": "100"})
        
        response = self.session.post(f"{BASE_URL}/api/sms/send", json={
            "recipient_phone": "0412345678",
            "message_type": "on_the_way"
        })
        
        assert response.status_code == 200, f"on_the_way SMS failed: {response.text}"
        data = response.json()
        assert "sms_message" in data, "Response missing 'sms_message'"
        assert "on the way" in data["sms_message"].lower(), f"Message doesn't contain 'on the way': {data['sms_message']}"
        print(f"on_the_way template: {data['sms_message']}")

    def test_sms_template_invoice_reminder(self):
        """SMS template works for invoice_reminder type"""
        balance = self.session.get(f"{BASE_URL}/api/sms/balance").json().get("balance", 0)
        if balance < 1:
            self.session.post(f"{BASE_URL}/api/sms/buy-credits", json={"pack": "100"})
        
        response = self.session.post(f"{BASE_URL}/api/sms/send", json={
            "recipient_phone": "0412345678",
            "message_type": "invoice_reminder"
        })
        
        assert response.status_code == 200, f"invoice_reminder SMS failed: {response.text}"
        data = response.json()
        assert "sms_message" in data, "Response missing 'sms_message'"
        assert "invoice" in data["sms_message"].lower(), f"Message doesn't contain 'invoice': {data['sms_message']}"
        print(f"invoice_reminder template: {data['sms_message']}")

    def test_sms_template_custom(self):
        """SMS template works for custom type"""
        balance = self.session.get(f"{BASE_URL}/api/sms/balance").json().get("balance", 0)
        if balance < 1:
            self.session.post(f"{BASE_URL}/api/sms/buy-credits", json={"pack": "100"})
        
        custom_msg = "This is a custom test message from pytest"
        response = self.session.post(f"{BASE_URL}/api/sms/send", json={
            "recipient_phone": "0412345678",
            "message_type": "custom",
            "custom_message": custom_msg
        })
        
        assert response.status_code == 200, f"custom SMS failed: {response.text}"
        data = response.json()
        assert "sms_message" in data, "Response missing 'sms_message'"
        assert custom_msg in data["sms_message"], f"Custom message not in response: {data['sms_message']}"
        print(f"custom template: {data['sms_message']}")

    # ==================== Phone Number Formatting ====================
    def test_phone_number_formatting_au(self):
        """Phone number formatting: 0412345678 -> +61412345678 (AU default)"""
        # We can verify this by checking the SMS history after sending
        balance = self.session.get(f"{BASE_URL}/api/sms/balance").json().get("balance", 0)
        if balance < 1:
            self.session.post(f"{BASE_URL}/api/sms/buy-credits", json={"pack": "100"})
        
        # Send SMS with local AU number
        response = self.session.post(f"{BASE_URL}/api/sms/send", json={
            "recipient_phone": "0412345678",
            "message_type": "custom",
            "custom_message": "Phone formatting test"
        })
        
        assert response.status_code == 200, f"SMS send failed: {response.text}"
        
        # Check history for formatted phone
        history = self.session.get(f"{BASE_URL}/api/sms/history").json()
        if len(history) > 0:
            latest = history[0]
            assert "formatted_phone" in latest, "History missing 'formatted_phone'"
            assert latest["formatted_phone"] == "+61412345678", \
                f"Expected +61412345678, got {latest['formatted_phone']}"
            print(f"Phone formatting verified: {latest['recipient_phone']} -> {latest['formatted_phone']}")

    # ==================== SMS Balance ====================
    def test_sms_balance_returns_current_balance(self):
        """GET /api/sms/balance returns current SMS credit balance"""
        response = self.session.get(f"{BASE_URL}/api/sms/balance")
        
        assert response.status_code == 200, f"SMS balance failed: {response.text}"
        data = response.json()
        
        assert "balance" in data, "Response missing 'balance'"
        assert isinstance(data["balance"], int), f"Balance should be int, got {type(data['balance'])}"
        assert "low_credit" in data, "Response missing 'low_credit'"
        assert isinstance(data["low_credit"], bool), "low_credit should be bool"
        
        print(f"SMS balance: {data['balance']}, low_credit: {data['low_credit']}")


class TestSMSUnauthenticated:
    """Test SMS endpoints require authentication"""
    
    def test_sms_test_requires_auth(self):
        """POST /api/sms/test requires authentication"""
        response = requests.post(f"{BASE_URL}/api/sms/test", json={
            "phone": "0412345678",
            "message": "Test"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_sms_send_requires_auth(self):
        """POST /api/sms/send requires authentication"""
        response = requests.post(f"{BASE_URL}/api/sms/send", json={
            "recipient_phone": "0412345678",
            "message_type": "custom",
            "custom_message": "Test"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_sms_balance_requires_auth(self):
        """GET /api/sms/balance requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sms/balance")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_sms_provider_balance_requires_auth(self):
        """GET /api/sms/provider-balance requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sms/provider-balance")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_sms_history_requires_auth(self):
        """GET /api/sms/history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sms/history")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_sms_buy_credits_requires_auth(self):
        """POST /api/sms/buy-credits requires authentication"""
        response = requests.post(f"{BASE_URL}/api/sms/buy-credits", json={"pack": "100"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_sms_packs_is_public(self):
        """GET /api/sms/packs is public (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/sms/packs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
