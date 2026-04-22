"""
Abstracted SMS provider for Churvox.
Supports ClickSend (production) and Mock (testing/development).
Switch providers by changing the factory function — no business logic changes needed.
"""

import httpx
import logging
import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class SMSResult:
    """Result of an SMS send attempt."""
    success: bool
    message_id: Optional[str] = None
    status: str = "unknown"
    error: Optional[str] = None
    provider: str = "unknown"
    cost: Optional[float] = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SMSProvider(ABC):
    """Abstract base — implement send() per provider."""

    @abstractmethod
    async def send(self, to: str, body: str, source: str = "Churvox") -> SMSResult:
        pass

    @abstractmethod
    async def check_balance(self) -> Optional[float]:
        pass


def format_phone_au_nz(raw: str, default_country: str = "AU") -> str:
    """
    Convert a local AU/NZ number to E.164.
    '0412345678' → '+61412345678' (AU default)
    '0212345678' → '+64212345678' (NZ)
    Already has + prefix → returned as-is (stripped of spaces/dashes).
    """
    phone = re.sub(r"[\s\-\(\)]", "", raw.strip())

    if phone.startswith("+"):
        return phone

    if phone.startswith("0"):
        if default_country.upper() == "NZ":
            return "+64" + phone[1:]
        return "+61" + phone[1:]

    # If no leading 0 or +, assume it already has the country code
    return "+" + phone


class ClickSendProvider(SMSProvider):
    """ClickSend REST API v3 implementation."""

    BASE_URL = "https://rest.clicksend.com/v3"

    def __init__(self, username: str, api_key: str, default_country: str = "AU"):
        self.username = username
        self.api_key = api_key
        self.default_country = default_country

    async def send(self, to: str, body: str, source: str = "Churvox") -> SMSResult:
        formatted = format_phone_au_nz(to, self.default_country)
        payload = {
            "messages": [
                {
                    "source": source,
                    "body": body,
                    "to": formatted,
                }
            ]
        }

        try:
            async with httpx.AsyncClient(auth=(self.username, self.api_key), timeout=15.0) as client:
                resp = await client.post(f"{self.BASE_URL}/sms/send", json=payload)

            data = resp.json()
            http_code = data.get("http_code", resp.status_code)

            if http_code == 200 and data.get("data", {}).get("messages"):
                msg = data["data"]["messages"][0]
                msg_id = msg.get("message_id", "")
                msg_status = msg.get("status", "SUCCESS")
                msg_cost = msg.get("message_price")

                # ClickSend returns HTTP 200 even when the individual message
                # couldn't be queued (e.g. INSUFFICIENT_CREDIT, INVALID_RECIPIENT).
                # Treat anything that isn't an accepted/queued/delivered status
                # as a real failure so the caller can refund credits.
                SUCCESS_STATUSES = {
                    "SUCCESS", "QUEUED", "SENT", "DELIVERED", "SCHEDULED",
                }
                if str(msg_status).upper() not in SUCCESS_STATUSES:
                    logger.error(f"[ClickSend] Message not accepted: status={msg_status} body={data}")
                    return SMSResult(
                        success=False,
                        message_id=str(msg_id) if msg_id else None,
                        status=str(msg_status).upper(),
                        error=f"Provider rejected send: {msg_status}",
                        provider="clicksend",
                    )

                logger.info(f"[ClickSend] SMS sent to {formatted} | id={msg_id} status={msg_status}")
                return SMSResult(
                    success=True,
                    message_id=str(msg_id),
                    status=msg_status,
                    provider="clicksend",
                    cost=float(msg_cost) if msg_cost else None,
                )
            else:
                error_msg = data.get("response_msg", f"HTTP {http_code}")
                logger.error(f"[ClickSend] Failed to {formatted}: {error_msg} | body={data}")
                return SMSResult(
                    success=False,
                    status="FAILED",
                    error=error_msg,
                    provider="clicksend",
                )

        except httpx.TimeoutException:
            logger.error(f"[ClickSend] Timeout sending to {formatted}")
            return SMSResult(success=False, status="TIMEOUT", error="Request timed out", provider="clicksend")

        except Exception as e:
            logger.error(f"[ClickSend] Unexpected error: {e}")
            return SMSResult(success=False, status="ERROR", error=str(e), provider="clicksend")

    async def check_balance(self) -> Optional[float]:
        """Return remaining ClickSend account balance (AUD)."""
        try:
            async with httpx.AsyncClient(auth=(self.username, self.api_key), timeout=10.0) as client:
                resp = await client.get(f"{self.BASE_URL}/account")
            data = resp.json()
            if data.get("http_code") == 200:
                balance = data.get("data", {}).get("balance")
                return float(balance) if balance is not None else None
        except Exception as e:
            logger.error(f"[ClickSend] Balance check failed: {e}")
        return None


class MockSMSProvider(SMSProvider):
    """Mock provider for development/testing — logs instead of sending."""

    async def send(self, to: str, body: str, source: str = "Churvox") -> SMSResult:
        formatted = format_phone_au_nz(to)
        logger.info(f"[SMS MOCK] To: {formatted} | Body: {body} | Source: {source}")
        return SMSResult(
            success=True,
            message_id=f"mock_{int(datetime.now(timezone.utc).timestamp())}",
            status="delivered_mock",
            provider="mock",
            cost=0.0,
        )

    async def check_balance(self) -> Optional[float]:
        return 999.99


def get_sms_provider() -> SMSProvider:
    """Factory — returns the right provider based on env config."""
    test_mode = os.environ.get("SMS_TEST_MODE", "false").lower() == "true"
    username = os.environ.get("CLICKSEND_USERNAME", "")
    api_key = os.environ.get("CLICKSEND_API_KEY", "")
    default_country = os.environ.get("CLICKSEND_DEFAULT_COUNTRY", "AU")

    if test_mode or not username or not api_key:
        logger.info("[SMS] Using MockSMSProvider (test mode or missing credentials)")
        return MockSMSProvider()

    logger.info(f"[SMS] Using ClickSendProvider (user={username[:10]}..., country={default_country})")
    return ClickSendProvider(username=username, api_key=api_key, default_country=default_country)
