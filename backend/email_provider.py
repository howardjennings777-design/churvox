"""
Abstracted email provider for Churvox.
Supports Resend (production) and Mock (testing/development).
Swap providers by changing the factory function.
"""

import asyncio
import logging
import os
import resend
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class EmailResult:
    success: bool
    email_id: Optional[str] = None
    error: Optional[str] = None
    provider: str = "unknown"
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EmailProvider(ABC):
    @abstractmethod
    async def send(self, to: str, subject: str, html: str) -> EmailResult:
        pass


# ── HTML email templates ────────────────────────────────────────────

BRAND_COLOR = "#2563eb"
BRAND_BG = "#0f172a"
TEXT_COLOR = "#e2e8f0"
MUTED_COLOR = "#94a3b8"

def _base_wrapper(inner_html: str) -> str:
    """Wrap content in a branded Churvox email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:{BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BRAND_BG};padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1e293b;border-radius:12px;overflow:hidden;">
<!-- Header -->
<tr><td style="padding:28px 32px 16px;text-align:center;">
  <span style="font-size:22px;font-weight:700;color:white;letter-spacing:-0.3px;">Churvox</span>
</td></tr>
<!-- Body -->
<tr><td style="padding:0 32px 32px;">
{inner_html}
</td></tr>
<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid #334155;text-align:center;">
  <p style="margin:0;font-size:12px;color:{MUTED_COLOR};">Churvox &mdash; Job Management for Contractors</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""


def build_invite_email(employee_name: str, business_name: str, invite_link: str) -> dict:
    """Build the employee invite email (subject + html)."""
    inner = f"""
<p style="margin:0 0 12px;font-size:15px;color:{TEXT_COLOR};">Hi {employee_name},</p>
<p style="margin:0 0 20px;font-size:15px;color:{TEXT_COLOR};">
  <strong style="color:white;">{business_name}</strong> has invited you to join their team on Churvox.
</p>
<p style="margin:0 0 24px;font-size:15px;color:{TEXT_COLOR};">
  Click the button below to set up your account and get started.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td style="background:{BRAND_COLOR};border-radius:8px;">
  <a href="{invite_link}" target="_blank"
     style="display:inline-block;padding:12px 32px;font-size:15px;font-weight:600;color:white;text-decoration:none;">
    Set Up Your Account
  </a>
</td></tr>
</table>
<p style="margin:0 0 8px;font-size:13px;color:{MUTED_COLOR};">Or copy and paste this link into your browser:</p>
<p style="margin:0 0 20px;font-size:12px;color:{BRAND_COLOR};word-break:break-all;">{invite_link}</p>
<p style="margin:0;font-size:12px;color:{MUTED_COLOR};">This invite link expires in 7 days.</p>"""
    return {
        "subject": f"You're invited to join {business_name} on Churvox",
        "html": _base_wrapper(inner),
    }


def build_resend_invite_email(employee_name: str, business_name: str, invite_link: str) -> dict:
    """Build the resend/reminder invite email."""
    inner = f"""
<p style="margin:0 0 12px;font-size:15px;color:{TEXT_COLOR};">Hi {employee_name},</p>
<p style="margin:0 0 20px;font-size:15px;color:{TEXT_COLOR};">
  This is a reminder that <strong style="color:white;">{business_name}</strong> has invited you to join their team on Churvox.
</p>
<p style="margin:0 0 24px;font-size:15px;color:{TEXT_COLOR};">
  You still need to set up your account. Click below to get started.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td style="background:{BRAND_COLOR};border-radius:8px;">
  <a href="{invite_link}" target="_blank"
     style="display:inline-block;padding:12px 32px;font-size:15px;font-weight:600;color:white;text-decoration:none;">
    Complete Your Setup
  </a>
</td></tr>
</table>
<p style="margin:0 0 8px;font-size:13px;color:{MUTED_COLOR};">Or copy and paste this link:</p>
<p style="margin:0 0 20px;font-size:12px;color:{BRAND_COLOR};word-break:break-all;">{invite_link}</p>
<p style="margin:0;font-size:12px;color:{MUTED_COLOR};">This link expires in 7 days. Contact your employer if it has expired.</p>"""
    return {
        "subject": f"Reminder: Set up your Churvox account for {business_name}",
        "html": _base_wrapper(inner),
    }


def build_password_reset_email(user_name: str, reset_link: str) -> dict:
    """Build the password reset email (for future use)."""
    inner = f"""
<p style="margin:0 0 12px;font-size:15px;color:{TEXT_COLOR};">Hi {user_name},</p>
<p style="margin:0 0 20px;font-size:15px;color:{TEXT_COLOR};">
  We received a request to reset your Churvox password.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td style="background:{BRAND_COLOR};border-radius:8px;">
  <a href="{reset_link}" target="_blank"
     style="display:inline-block;padding:12px 32px;font-size:15px;font-weight:600;color:white;text-decoration:none;">
    Reset Password
  </a>
</td></tr>
</table>
<p style="margin:0 0 8px;font-size:13px;color:{MUTED_COLOR};">Or copy and paste this link:</p>
<p style="margin:0 0 20px;font-size:12px;color:{BRAND_COLOR};word-break:break-all;">{reset_link}</p>
<p style="margin:0;font-size:12px;color:{MUTED_COLOR};">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>"""
    return {
        "subject": "Reset your Churvox password",
        "html": _base_wrapper(inner),
    }


# ── Provider implementations ────────────────────────────────────────

class ResendProvider(EmailProvider):
    """Resend API implementation."""

    def __init__(self, api_key: str, from_email: str):
        self.from_email = from_email
        self.fallback_from = "onboarding@resend.dev"
        resend.api_key = api_key

    async def send(self, to: str, subject: str, html: str) -> EmailResult:
        params = {
            "from": self.from_email,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        try:
            result = await asyncio.to_thread(resend.Emails.send, params)
            email_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", str(result))
            logger.info(f"[Resend] Email sent to {to} | id={email_id}")
            return EmailResult(success=True, email_id=str(email_id), provider="resend")
        except Exception as e:
            error_str = str(e)
            # If domain not verified, retry with Resend's default sender
            if "not verified" in error_str.lower() and self.from_email != self.fallback_from:
                logger.warning(f"[Resend] Domain not verified for {self.from_email}, retrying with {self.fallback_from}")
                params["from"] = self.fallback_from
                try:
                    result = await asyncio.to_thread(resend.Emails.send, params)
                    email_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", str(result))
                    logger.info(f"[Resend] Email sent to {to} via fallback | id={email_id}")
                    return EmailResult(success=True, email_id=str(email_id), provider="resend")
                except Exception as e2:
                    logger.error(f"[Resend] Fallback also failed for {to}: {e2}")
                    return EmailResult(success=False, error=str(e2), provider="resend")
            logger.error(f"[Resend] Failed to send to {to}: {e}")
            return EmailResult(success=False, error=error_str, provider="resend")


class MockEmailProvider(EmailProvider):
    """Mock provider — logs instead of sending."""

    async def send(self, to: str, subject: str, html: str) -> EmailResult:
        logger.info(f"[EMAIL MOCK] To: {to} | Subject: {subject}")
        return EmailResult(
            success=True,
            email_id=f"mock_{int(datetime.now(timezone.utc).timestamp())}",
            provider="mock",
        )


def get_email_provider() -> EmailProvider:
    """Factory — returns the right provider based on env config."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    from_email = os.environ.get("EMAIL_FROM", "onboarding@resend.dev")

    if not api_key:
        logger.info("[Email] Using MockEmailProvider (no RESEND_API_KEY)")
        return MockEmailProvider()

    logger.info(f"[Email] Using ResendProvider (from={from_email})")
    return ResendProvider(api_key=api_key, from_email=from_email)
