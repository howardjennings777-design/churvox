"""
Churvox shared email helper.

Primary provider: Postmark (POSTMARK_SERVER_TOKEN + POSTMARK_FROM_EMAIL)
Fallback provider: Resend (RESEND_API_KEY + EMAIL_FROM) — preserved for backward
compatibility so nothing breaks if Postmark env vars are not yet set on Render.

All email sends are awaited and will RAISE RuntimeError on hard failure so existing
try/except blocks at the call-site continue to work. Callers in server.py already
swallow exceptions to keep the originating endpoint stable.
"""

import json
import os
import urllib.request
import urllib.error
import html as _html

# ------------------------------------------------------------------
# Config
# ------------------------------------------------------------------
POSTMARK_SERVER_TOKEN = os.getenv("POSTMARK_SERVER_TOKEN", "").strip()
POSTMARK_FROM_EMAIL = os.getenv("POSTMARK_FROM_EMAIL", "").strip()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
EMAIL_FROM_RAW = os.getenv("EMAIL_FROM", "").strip() or "Churvox <noreply@churvox.com>"
# Ensure "Name <email>" format for Resend fallback
if "<" not in EMAIL_FROM_RAW:
    EMAIL_FROM_RESEND = f"Churvox <{EMAIL_FROM_RAW}>"
else:
    EMAIL_FROM_RESEND = EMAIL_FROM_RAW


def get_email_provider() -> str:
    """Return 'postmark' if configured, else 'resend' if configured, else 'none'."""
    if POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL:
        return "postmark"
    if RESEND_API_KEY:
        return "resend"
    return "none"


# ------------------------------------------------------------------
# Template builders (simple, branded Churvox HTML)
# ------------------------------------------------------------------
_BRAND = "Churvox"


def _wrap(html_inner: str) -> str:
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height:1.5; color:#0f172a; background:#f8fafc; padding:24px;">
      <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:32px;">
        <div style="font-size:20px; font-weight:700; color:#2563eb; margin-bottom:16px;">{_BRAND}</div>
        {html_inner}
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
        <div style="font-size:12px; color:#64748b;">
          Churvox — Run your trade business smarter.
        </div>
      </div>
    </div>
    """


def _button(label: str, link: str) -> str:
    safe_link = _html.escape(link or "", quote=True)
    safe_label = _html.escape(label or "")
    return (
        f'<p style="margin:24px 0;"><a href="{safe_link}" '
        'style="display:inline-block; padding:12px 20px; background:#2563eb; color:#ffffff; '
        'text-decoration:none; border-radius:8px; font-weight:600;">'
        f"{safe_label}</a></p>"
        f'<p style="font-size:13px; color:#475569;">Or copy this link:<br/>'
        f'<a href="{safe_link}" style="color:#2563eb; word-break:break-all;">{safe_link}</a></p>'
    )


def _pretty_role(role: str) -> str:
    r = (role or "worker").strip().lower()
    return {
        "worker": "Worker",
        "manager": "Manager",
        "office_admin": "Office Admin",
        "payroll": "Payroll",
    }.get(r, r.replace("_", " ").title())


def build_invite_email(name: str, invite_link: str, business_name: str = "", role: str = "worker"):
    safe_name = _html.escape((name or "").strip() or "there")
    biz = _html.escape((business_name or "").strip()) or _BRAND
    role_label = _html.escape(_pretty_role(role))
    subject = f"You're invited to join {biz.replace('&#x27;', '’')} on {_BRAND}"
    inner = f"""
      <h2 style="margin:0 0 12px 0; font-size:20px;">You've been invited</h2>
      <p>Hi {safe_name},</p>
      <p><strong>{biz}</strong> has invited you to join their team on {_BRAND} as
         <strong>{role_label}</strong>.</p>
      <p>Click the button below to finish setting up your account — it takes less than a minute.</p>
      {_button("Accept invite", invite_link)}
      <p style="font-size:13px; color:#475569;">If you weren't expecting this invite, you can safely ignore this email.</p>
    """
    return subject, _wrap(inner)


def build_resend_invite_email(name: str, invite_link: str, business_name: str = "", role: str = "worker"):
    safe_name = _html.escape((name or "").strip() or "there")
    biz = _html.escape((business_name or "").strip()) or _BRAND
    role_label = _html.escape(_pretty_role(role))
    subject = f"Your {_BRAND} invite link"
    inner = f"""
      <h2 style="margin:0 0 12px 0; font-size:20px;">Here's your invite link again</h2>
      <p>Hi {safe_name},</p>
      <p><strong>{biz}</strong> invited you to join {_BRAND} as <strong>{role_label}</strong>.</p>
      {_button("Accept invite", invite_link)}
    """
    return subject, _wrap(inner)


def build_password_reset_email(name: str, reset_link: str):
    safe_name = _html.escape((name or "").strip() or "there")
    subject = f"Reset your {_BRAND} password"
    inner = f"""
      <h2 style="margin:0 0 12px 0; font-size:20px;">Reset your password</h2>
      <p>Hi {safe_name},</p>
      <p>We received a request to reset the password for your {_BRAND} account.</p>
      {_button("Reset password", reset_link)}
      <p style="font-size:13px; color:#475569;">This link will expire shortly. If you didn't request a reset, you can ignore this email.</p>
    """
    return subject, _wrap(inner)


def build_verification_email(name: str, verify_link: str):
    safe_name = _html.escape((name or "").strip() or "there")
    subject = f"Verify your email for {_BRAND}"
    inner = f"""
      <h2 style="margin:0 0 12px 0; font-size:20px;">Confirm your email</h2>
      <p>Hi {safe_name},</p>
      <p>Welcome to {_BRAND}! Please confirm your email address so you can start using your account.</p>
      {_button("Verify email", verify_link)}
      <p style="font-size:13px; color:#475569;">If you didn't create a {_BRAND} account, you can ignore this email.</p>
    """
    return subject, _wrap(inner)


# ------------------------------------------------------------------
# Low-level send paths
# ------------------------------------------------------------------
def _http_post_json(url: str, payload: dict, headers: dict, timeout: int = 20):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="ignore")
        return resp.status, body


def _send_via_postmark(to_email: str, subject: str, html_content: str, text_content: str = ""):
    """Raise RuntimeError on failure, return parsed dict on success."""
    if not POSTMARK_SERVER_TOKEN:
        raise RuntimeError("POSTMARK_SERVER_TOKEN is missing")
    if not POSTMARK_FROM_EMAIL:
        raise RuntimeError("POSTMARK_FROM_EMAIL is missing")

    payload = {
        "From": POSTMARK_FROM_EMAIL,
        "To": to_email,
        "Subject": subject,
        "HtmlBody": html_content,
        "MessageStream": "outbound",
    }
    if text_content:
        payload["TextBody"] = text_content

    print(f"POSTMARK_SEND from={POSTMARK_FROM_EMAIL} to={to_email} subject={subject!r}")

    try:
        status, body = _http_post_json(
            "https://api.postmarkapp.com/email",
            payload,
            {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
            },
            timeout=20,
        )
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore") if hasattr(e, "read") else str(e)
        print(f"POSTMARK_ERR code={e.code} detail={detail[:300]}")
        raise RuntimeError(f"Postmark HTTPError {e.code}: {detail}")
    except urllib.error.URLError as e:
        print(f"POSTMARK_ERR url_error={e}")
        raise RuntimeError(f"Postmark URLError: {e}")

    if status < 200 or status >= 300:
        print(f"POSTMARK_ERR status={status} body={body[:300]}")
        raise RuntimeError(f"Postmark send failed: HTTP {status} {body}")

    print(f"POSTMARK_OK status={status} body={body[:200]}")
    try:
        return json.loads(body) if body else {"ok": True}
    except Exception:
        return {"ok": True}


def _send_via_resend(to_email: str, subject: str, html_content: str, text_content: str = ""):
    """Raise RuntimeError on failure, return parsed dict on success."""
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is missing")

    payload = {
        "from": EMAIL_FROM_RESEND,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }
    if text_content:
        payload["text"] = text_content

    print(f"RESEND_SEND from={EMAIL_FROM_RESEND} to={to_email}")

    try:
        status, body = _http_post_json(
            "https://api.resend.com/emails",
            payload,
            {
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=20,
        )
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore") if hasattr(e, "read") else str(e)
        print(f"RESEND_ERR code={e.code} detail={detail[:300]}")
        raise RuntimeError(f"Resend HTTPError {e.code}: {detail}")
    except urllib.error.URLError as e:
        print(f"RESEND_ERR url_error={e}")
        raise RuntimeError(f"Resend URLError: {e}")

    if status < 200 or status >= 300:
        print(f"RESEND_ERR status={status} body={body[:300]}")
        raise RuntimeError(f"Resend send failed: HTTP {status} {body}")

    print(f"RESEND_OK status={status} body={body[:200]}")
    try:
        return json.loads(body) if body else {"ok": True}
    except Exception:
        return {"ok": True}


# ------------------------------------------------------------------
# Public send API (same signature existing callers already use)
# ------------------------------------------------------------------
async def send_email(to_email: str, subject: str, html_content: str, text_content: str = ""):
    """
    Send an email via Postmark (primary) or Resend (fallback).

    Signature is backward-compatible with the previous Resend-only helper:
    all existing callers using `await send_email(to_email=..., subject=..., html_content=...)`
    continue to work unchanged. `text_content` is optional and new.

    Raises RuntimeError on hard failure so existing try/except blocks in server.py
    keep the parent endpoint stable and simply log the error.
    """
    to_email = str(to_email or "").strip()
    subject = str(subject or "").strip()

    if not to_email:
        raise ValueError("Missing to_email")
    if not subject:
        raise ValueError("Missing subject")

    provider = get_email_provider()

    if provider == "postmark":
        try:
            return _send_via_postmark(to_email, subject, html_content, text_content)
        except Exception as postmark_err:
            # If Postmark is configured but fails AND Resend is also configured,
            # attempt Resend as a graceful fallback so launch flows don't silently fail.
            if RESEND_API_KEY:
                print(f"POSTMARK_FALLBACK_TO_RESEND reason={repr(postmark_err)}")
                return _send_via_resend(to_email, subject, html_content, text_content)
            raise

    if provider == "resend":
        return _send_via_resend(to_email, subject, html_content, text_content)

    # No provider configured — do not crash the endpoint; log and raise a clear error
    # that existing callers will catch and log.
    print(
        "EMAIL_PROVIDER_MISSING: neither POSTMARK_SERVER_TOKEN/POSTMARK_FROM_EMAIL "
        "nor RESEND_API_KEY are set. Email NOT sent."
    )
    raise RuntimeError(
        "No email provider configured. Set POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL."
    )
