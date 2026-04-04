"""
Batch 4 Tests: SMS System and Calendar Features
- SMS balance, buy credits, send SMS, history
- Calendar job display (tested via jobs endpoint)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
BASE_URL = "https://grassley-backend.onrender.com"

# Test credentials
ADMIN_EMAIL = "admin@churvox.com"
ADMIN_PASSWORD = "Admin123!"


class TestSMSEndpoints:
    """SMS system endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_get_sms_balance(self):
        """GET /api/sms/balance returns balance and low_credit flag"""
        res = self.session.get(f"{BASE_URL}/api/sms/balance")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "balance" in data
        assert "low_credit" in data
        assert isinstance(data["balance"], int)
        assert isinstance(data["low_credit"], bool)
        print(f"SMS Balance: {data['balance']}, Low credit: {data['low_credit']}")
    
    def test_get_sms_packs(self):
        """GET /api/sms/packs returns available credit packs"""
        res = self.session.get(f"{BASE_URL}/api/sms/packs")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # Should have at least 3 packs
        
        # Verify pack structure
        for pack in data:
            assert "id" in pack
            assert "credits" in pack
            assert "price" in pack
        
        # Verify expected packs exist
        pack_ids = [p["id"] for p in data]
        assert "100" in pack_ids
        assert "500" in pack_ids
        assert "1000" in pack_ids
        print(f"SMS Packs: {data}")
    
    def test_buy_credits_100_pack(self):
        """POST /api/sms/buy-credits with 100 pack adds 100 credits"""
        # Get initial balance
        bal_res = self.session.get(f"{BASE_URL}/api/sms/balance")
        initial_balance = bal_res.json()["balance"]
        
        # Buy 100 credits
        res = self.session.post(f"{BASE_URL}/api/sms/buy-credits", json={"pack": "100"})
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "message" in data
        assert "balance" in data
        assert data["balance"] == initial_balance + 100
        print(f"Bought 100 credits. New balance: {data['balance']}")
    
    def test_buy_credits_invalid_pack(self):
        """POST /api/sms/buy-credits with invalid pack returns 400"""
        res = self.session.post(f"{BASE_URL}/api/sms/buy-credits", json={"pack": "invalid"})
        assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    
    def test_send_sms_mock(self):
        """POST /api/sms/send sends SMS and returns updated balance"""
        # Ensure we have credits
        bal_res = self.session.get(f"{BASE_URL}/api/sms/balance")
        initial_balance = bal_res.json()["balance"]

        if initial_balance < 1:
            # Buy credits first
            self.session.post(f"{BASE_URL}/api/sms/buy-credits", json={"pack": "100"})
            bal_res = self.session.get(f"{BASE_URL}/api/sms/balance")
            initial_balance = bal_res.json()["balance"]

        # Send SMS
        res = self.session.post(f"{BASE_URL}/api/sms/send", json={
            "recipient_phone": "0400123456",
            "message_type": "customer_reminder"
        })
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "message" in data
        assert "sms_message" in data
        assert "balance" in data
        assert isinstance(data["balance"], int)
        print(f"SMS sent. Message: {data['sms_message'][:50]}... Balance: {data['balance']}")

