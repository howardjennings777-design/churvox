"""
Churvox SMS provider setup.

Production rule:
- SMS does NOT fake-send unless SMS_TEST_MODE=true.
- Live sending requires:
  SMS_ENABLED=true
  SMS_PROVIDER=clicksend
  CLICKSEND_USERNAME=...
  CLICKSEND_API_KEY=...
  CLICKSEND_DEFAULT_COUNTRY=NZ
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
_LAUNCH_ROUTES_WIRED = False


def _wire_launch_routes_once():
    global _LAUNCH_ROUTES_WIRED
    if _LAUNCH_ROUTES_WIRED:
        return
    try:
        import inspect
        frame = inspect.currentframe()
        caller_globals = (frame.f_back.f_back.f_globals if frame and frame.f_back and frame.f_back.f_back else {})
        router = caller_globals.get("api_router")
        if router is None:
            return
        try:
            from backend import churvox_launch_routes, churvox_team_roles, churvox_recurring_routes
        except Exception:
            import churvox_launch_routes
            import churvox_team_roles
            import churvox_recurring_routes
        churvox_launch_routes.install(router)
        churvox_team_roles.install(router)
        churvox_recurring_routes.install(router)
        _LAUNCH_ROUTES_WIRED = True
    except Exception as exc:
        logger.warning("Launch routes not wired yet: %s", exc)


@dataclass
class SMSResult:
    success: bool
    message_id: Optional[str] = None
    status: str = "unknown"
    error: Optional[str] = None
    provider: str = "unknown"
    cost: Optional[float] = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SMSProvider(ABC):
    @abstractmethod
    async def send(self, to: str, body: str, source: str = "Churvox") -> SMSResult:
        pass

    @abstractmethod
    async def check_balance(self) -> Optional[float]:
        pass


def _clean_phone(raw: str) -> str:
    return re.sub(r"[^\d+]", "", str(raw or "").strip())


def format_phone_au_nz(raw: str, default_country: str = "NZ") -> str:
    phone = _clean_phone(raw)
    if not phone:
        return ""
    if phone.startswith("+"):
        return phone
    if phone.startswith("00"):
        return "+" + phone[2:]
    country = str(default_country or "NZ").upper().strip()
    if phone.startswith("0"):
        if country == "AU":
            return "+61" + phone[1:]
        return "+64" + phone[1:]
    if phone.startswith("64") or phone.startswith("61"):
        return "+" + phone
    if country == "AU":
        return "+61" + phone
    return "+64" + phone


def _valid_sms_body(body: str) -> str:
    text = str(body or "").strip()
    if not text:
        raise ValueError("SMS message is empty")
    if len(text) > 800:
        raise ValueError("SMS message is too long")
    return text


def _valid_source(source: str) -> str:
    value = re.sub(r"[^A-Za-z0-9]", "", str(source or "Churvox").strip())[:11]
    return value or "Churvox"


class DisabledSMSProvider(SMSProvider):
    def __init__(self, reason: str = "SMS is not enabled"):
        self.reason = reason
    async def send(self, to: str, body: str, source: str = "Churvox") -> SMSResult:
        logger.warning("[SMS DISABLED] blocked send to=%s reason=%s", to, self.reason)
        return SMSResult(success=False, status="DISABLED", error=self.reason, provider="disabled", cost=0.0)
    async def check_balance(self) -> Optional[float]:
        return None


class ClickSendProvider(SMSProvider):
    BASE_URL = "https://rest.clicksend.com/v3"
    def __init__(self, username: str, api_key: str, default_country: str = "NZ"):
        self.username = username
        self.api_key = api_key
        self.default_country = default_country or "NZ"
    async def send(self, to: str, body: str, source: str = "Churvox") -> SMSResult:
        formatted = format_phone_au_nz(to, self.default_country)
        if not formatted or not formatted.startswith("+"):
            return SMSResult(success=False, status="INVALID_RECIPIENT", error="Invalid phone number", provider="clicksend")
        try:
            message_body = _valid_sms_body(body)
            message_source = _valid_source(source)
        except ValueError as exc:
            return SMSResult(success=False, status="INVALID_MESSAGE", error=str(exc), provider="clicksend")
        payload = {"messages": [{"source": message_source, "body": message_body, "to": formatted}]}
        try:
            async with httpx.AsyncClient(auth=(self.username, self.api_key), timeout=15.0) as client:
                resp = await client.post(f"{self.BASE_URL}/sms/send", json=payload)
            try:
                data = resp.json()
            except Exception:
                return SMSResult(success=False, status="BAD_RESPONSE", error=f"Provider returned HTTP {resp.status_code}", provider="clicksend")
            http_code = data.get("http_code", resp.status_code)
            messages = data.get("data", {}).get("messages") or []
            if http_code == 200 and messages:
                msg = messages[0]
                msg_id = msg.get("message_id", "")
                msg_status = str(msg.get("status", "UNKNOWN")).upper()
                msg_cost = msg.get("message_price")
                if msg_status not in {"SUCCESS", "QUEUED", "SENT", "DELIVERED", "SCHEDULED"}:
                    logger.error("[ClickSend] rejected SMS to=%s status=%s body=%s", formatted, msg_status, data)
                    return SMSResult(success=False, message_id=str(msg_id) if msg_id else None, status=msg_status, error=f"Provider rejected send: {msg_status}", provider="clicksend")
                logger.info("[ClickSend] SMS accepted to=%s id=%s status=%s", formatted, msg_id, msg_status)
                return SMSResult(success=True, message_id=str(msg_id), status=msg_status, provider="clicksend", cost=float(msg_cost) if msg_cost not in (None, "") else None)
            error_msg = data.get("response_msg") or data.get("message") or f"HTTP {http_code}"
            logger.error("[ClickSend] failed SMS to=%s error=%s body=%s", formatted, error_msg, data)
            return SMSResult(success=False, status="FAILED", error=str(error_msg), provider="clicksend")
        except httpx.TimeoutException:
            logger.error("[ClickSend] timeout sending to=%s", formatted)
            return SMSResult(success=False, status="TIMEOUT", error="SMS provider timed out", provider="clicksend")
        except Exception as exc:
            logger.error("[ClickSend] unexpected SMS error: %s", exc)
            return SMSResult(success=False, status="ERROR", error=str(exc), provider="clicksend")
    async def check_balance(self) -> Optional[float]:
        try:
            async with httpx.AsyncClient(auth=(self.username, self.api_key), timeout=10.0) as client:
                resp = await client.get(f"{self.BASE_URL}/account")
            data = resp.json()
            if data.get("http_code") == 200:
                balance = data.get("data", {}).get("balance")
                return float(balance) if balance is not None else None
        except Exception as exc:
            logger.error("[ClickSend] balance check failed: %s", exc)
        return None


class MockSMSProvider(SMSProvider):
    async def send(self, to: str, body: str, source: str = "Churvox") -> SMSResult:
        formatted = format_phone_au_nz(to, os.environ.get("CLICKSEND_DEFAULT_COUNTRY", "NZ"))
        logger.info("[SMS MOCK] To=%s Source=%s Body=%s", formatted, source, body)
        return SMSResult(success=True, message_id=f"mock_{int(datetime.now(timezone.utc).timestamp())}", status="delivered_mock", provider="mock", cost=0.0)
    async def check_balance(self) -> Optional[float]:
        return 999.99


def get_sms_provider() -> SMSProvider:
    _wire_launch_routes_once()
    test_mode = os.environ.get("SMS_TEST_MODE", "false").lower() == "true"
    sms_enabled = os.environ.get("SMS_ENABLED", "false").lower() == "true"
    provider = os.environ.get("SMS_PROVIDER", "clicksend").lower().strip()
    username = os.environ.get("CLICKSEND_USERNAME", "").strip()
    api_key = os.environ.get("CLICKSEND_API_KEY", "").strip()
    default_country = os.environ.get("CLICKSEND_DEFAULT_COUNTRY", "NZ").strip() or "NZ"
    if test_mode:
        logger.warning("[SMS] SMS_TEST_MODE=true, using MockSMSProvider")
        return MockSMSProvider()
    if not sms_enabled:
        return DisabledSMSProvider("SMS is switched off. Set SMS_ENABLED=true after ClickSend is configured.")
    if provider != "clicksend":
        return DisabledSMSProvider(f"Unsupported SMS provider: {provider}")
    if not username or not api_key:
        return DisabledSMSProvider("ClickSend credentials are missing.")
    logger.info("[SMS] Using ClickSendProvider country=%s user=%s...", default_country, username[:8])
    return ClickSendProvider(username=username, api_key=api_key, default_country=default_country)
