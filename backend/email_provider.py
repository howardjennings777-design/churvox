"""
Churvox shared email helper — Postmark-only.

Env vars required:
  POSTMARK_SERVER_TOKEN
  POSTMARK_FROM_EMAIL   (verified sender signature in Postmark, e.g. "Churvox <hello@churvox.com>")
  FRONTEND_URL          (consumed by server.py when building links)
"""

import json
import os
import urllib.request
import urllib.error
import html as _html
from dataclasses import dataclass

POSTMARK_SERVER_TOKEN = os.getenv("POSTMARK_SERVER_TOKEN", "").strip()
POSTMARK_FROM_EMAIL = os.getenv("POSTMARK_FROM_EMAIL", "").strip()
TEXT_COLOR = "#0f172a"
_SUPPORT_ROUTE_REGISTERED = False


@dataclass
class EmailSendResult:
    success: bool
    provider: str = "postmark"
    email_id: str = ""
    error: str = ""


class EmailTemplate(dict):
    def __iter__(self):
        yield self.get("subject", "")
        yield self.get("html", "")


class PostmarkEmailProvider:
    provider = "postmark"

    def __eq__(self, other):
        return other == "postmark" if self.is_configured() else other == "none"

    def is_configured(self):
        return bool(POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL)

    async def send(self, to: str, subject: str, html: str, text: str = ""):
        try:
            result = await send_email(to, subject, html, text)
            return EmailSendResult(success=True, provider="postmark", email_id=str(result.get("MessageID", "")), error="")
        except Exception as exc:
            return EmailSendResult(success=False, provider="postmark", email_id="", error=str(exc))


_PROVIDER = PostmarkEmailProvider()


def _maybe_register_support_route():
    global _SUPPORT_ROUTE_REGISTERED
    if _SUPPORT_ROUTE_REGISTERED:
        return
    try:
        import inspect
        from datetime import datetime, timezone
        frame = inspect.currentframe()
        caller_globals = (frame.f_back.f_back.f_globals if frame and frame.f_back and frame.f_back.f_back else {})
        router = caller_globals.get("api_router")
        if router is None or not hasattr(router, "post"):
            return

        @router.post("/support/contact")
        async def churvox_support_contact(payload: dict):
            help_type = str(payload.get("help_type") or "Support request").strip()
            message = str(payload.get("message") or "").strip()
            user_email = str(payload.get("user_email") or "").strip()
            user_name = str(payload.get("user_name") or "").strip()
            business_name = str(payload.get("business_name") or "").strip()
            page_url = str(payload.get("page_url") or "").strip()
            if not message:
                return {"success": False, "error": "Message is required"}
            submitted = datetime.now(timezone.utc).isoformat()
            subject = f"Churvox support: {help_type}"
            text_body = f"Help type: {help_type}\nFrom: {user_name or 'Unknown user'} <{user_email or 'no email supplied'}>\nBusiness: {business_name or 'Not supplied'}\nPage: {page_url or 'Not supplied'}\nSubmitted: {submitted}\n\nMessage:\n{message}\n"
            html_body = _wrap("<h2 style='margin:0 0 12px 0;'>Churvox support request</h2>" f"<p><strong>Help type:</strong> {_html.escape(help_type)}</p>" f"<p><strong>From:</strong> {_html.escape(user_name or 'Unknown user')} &lt;{_html.escape(user_email or 'no email supplied')}&gt;</p>" f"<p><strong>Business:</strong> {_html.escape(business_name or 'Not supplied')}</p>" f"<p><strong>Page:</strong> {_html.escape(page_url or 'Not supplied')}</p>" f"<p><strong>Submitted:</strong> {_html.escape(submitted)}</p>" f"<hr style='border:none;border-top:1px solid #e2e8f0;margin:20px 0;' />" f"<pre style='white-space:pre-wrap;font-family:system-ui;font-size:14px;line-height:1.5'>{_html.escape(message)}</pre>")
            result = await _PROVIDER.send("hello@churvox.com", subject, html_body, text_body)
            return {"success": result.success, "message": "Support message sent" if result.success else "Support email failed", "error": result.error}

        _SUPPORT_ROUTE_REGISTERED = True
    except Exception:
        return


def get_email_provider():
    _maybe_register_support_route()
    return _PROVIDER


_BRAND = "Churvox"


def _base_wrapper(html_inner: str) -> str:
    return _wrap(html_inner)


def _wrap(html_inner: str) -> str:
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height:1.5; color:#0f172a; background:#f8fafc; padding:24px;">
      <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:32px;">
        <div style="font-size:20px; font-weight:700; color:#2563eb; margin-bottom:16px;">{_BRAND}</div>
        {html_inner}
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
        <div style="font-size:12px; color:#64748b;">Churvox — Run your trade business smarter.</div>
      </div>
    </div>
    """


def _button(label: str, link: str) -> str:
    safe_link = _html.escape(link or "", quote=True)
    safe_label = _html.escape(label or "")
    return f'<p style="margin:24px 0;"><a href="{safe_link}" style="display:inline-block; padding:12px 20px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;">{safe_label}</a></p><p style="font-size:13px; color:#475569;">Or copy this link:<br/><a href="{safe_link}" style="color:#2563eb; word-break:break-all;">{safe_link}</a></p>'


def _looks_like_url(value: str) -> bool:
    text = str(value or "")
    return text.startswith("http://") or text.startswith("https://") or "/invite/setup/" in text


def _pretty_role(role: str) -> str:
    r = (role or "worker").strip().lower()
    return {"worker": "Worker", "manager": "Manager", "office_admin": "Office Admin", "payroll": "Payroll"}.get(r, r.replace("_", " ").title())


def build_invite_email(name: str, invite_link: str, business_name: str = "", role: str = "worker"):
    if not _looks_like_url(invite_link) and _looks_like_url(business_name):
        invite_link, business_name = business_name, invite_link
    safe_name = _html.escape((name or "").strip() or "there")
    biz = _html.escape((business_name or "").strip()) or _BRAND
    role_label = _html.escape(_pretty_role(role))
    subject = f"You're invited to join {biz.replace('&#x27;', '’')} on {_BRAND}"
    html = _wrap(f"<h2 style='margin:0 0 12px 0; font-size:20px;'>You've been invited</h2><p>Hi {safe_name},</p><p><strong>{biz}</strong> has invited you to join their team on {_BRAND} as <strong>{role_label}</strong>.</p><p>Click the button below to finish setting up your account — it takes less than a minute.</p>{_button('Accept invite', invite_link)}<p style='font-size:13px; color:#475569;'>If you weren't expecting this invite, you can safely ignore this email.</p>")
    return EmailTemplate(subject=subject, html=html)


def build_resend_invite_email(name: str, invite_link: str, business_name: str = "", role: str = "worker"):
    if not _looks_like_url(invite_link) and _looks_like_url(business_name):
        invite_link, business_name = business_name, invite_link
    safe_name = _html.escape((name or "").strip() or "there")
    biz = _html.escape((business_name or "").strip()) or _BRAND
    role_label = _html.escape(_pretty_role(role))
    subject = f"Your {_BRAND} invite link"
    html = _wrap(f"<h2 style='margin:0 0 12px 0; font-size:20px;'>Here's your invite link again</h2><p>Hi {safe_name},</p><p><strong>{biz}</strong> invited you to join {_BRAND} as <strong>{role_label}</strong>.</p>{_button('Accept invite', invite_link)}")
    return EmailTemplate(subject=subject, html=html)


def build_password_reset_email(name: str, reset_link: str):
    safe_name = _html.escape((name or "").strip() or "there")
    subject = f"Reset your {_BRAND} password"
    html = _wrap(f"<h2 style='margin:0 0 12px 0; font-size:20px;'>Reset your password</h2><p>Hi {safe_name},</p><p>We received a request to reset the password for your {_BRAND} account.</p>{_button('Reset password', reset_link)}<p style='font-size:13px; color:#475569;'>This link will expire shortly. If you didn't request a reset, you can ignore this email.</p>")
    return EmailTemplate(subject=subject, html=html)


def build_verification_email(name: str, verify_link: str):
    safe_name = _html.escape((name or "").strip() or "there")
    subject = f"Verify your email for {_BRAND}"
    html = _wrap(f"<h2 style='margin:0 0 12px 0; font-size:20px;'>Confirm your email</h2><p>Hi {safe_name},</p><p>Welcome to {_BRAND}! Please confirm your email address so you can start using your account.</p>{_button('Verify email', verify_link)}<p style='font-size:13px; color:#475569;'>If you didn't create a {_BRAND} account, you can ignore this email.</p>")
    return EmailTemplate(subject=subject, html=html)


def _send_via_postmark(to_email: str, subject: str, html_content: str, text_content: str = ""):
    if not POSTMARK_SERVER_TOKEN:
        raise RuntimeError("POSTMARK_SERVER_TOKEN is missing")
    if not POSTMARK_FROM_EMAIL:
        raise RuntimeError("POSTMARK_FROM_EMAIL is missing")
    payload = {"From": POSTMARK_FROM_EMAIL, "To": to_email, "Subject": subject, "HtmlBody": html_content, "MessageStream": "outbound"}
    if text_content:
        payload["TextBody"] = text_content
    req = urllib.request.Request("https://api.postmarkapp.com/email", data=json.dumps(payload).encode("utf-8"), headers={"Accept": "application/json", "Content-Type": "application/json", "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore") if hasattr(e, "read") else str(e)
        raise RuntimeError(f"Postmark HTTPError {e.code}: {detail}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Postmark URLError: {e}")
    if status < 200 or status >= 300:
        raise RuntimeError(f"Postmark send failed: HTTP {status} {body}")
    try:
        return json.loads(body) if body else {"ok": True}
    except Exception:
        return {"ok": True}


async def send_email(to_email: str, subject: str, html_content: str, text_content: str = ""):
    to_email = str(to_email or "").strip()
    subject = str(subject or "").strip()
    if not to_email:
        raise ValueError("Missing to_email")
    if not subject:
        raise ValueError("Missing subject")
    if not _PROVIDER.is_configured():
        raise RuntimeError("Postmark is not configured. Set POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL.")
    return _send_via_postmark(to_email, subject, html_content, text_content)
