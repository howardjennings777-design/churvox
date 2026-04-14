import json
import os
import urllib.request
import urllib.error

EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "").strip().lower() or "resend"
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
EMAIL_FROM = os.getenv("EMAIL_FROM", "").strip() or "Churvox <noreply@churvox.com>"
# Ensure "Name <email>" format for Resend
if "<" not in EMAIL_FROM:
    EMAIL_FROM = f"Churvox <{EMAIL_FROM}>"


def get_email_provider():
    return EMAIL_PROVIDER


def build_invite_email(name: str, invite_link: str):
    safe_name = str(name or "").strip() or "there"
    safe_link = str(invite_link or "").strip()
    subject = "You're invited to join Churvox"
    html = f"""
        <p>Hi {safe_name},</p>
        <p>You have been invited to join a team on Churvox.</p>
        <p><a href="{safe_link}">Finish setup</a></p>
    """
    return subject, html


def build_resend_invite_email(name: str, invite_link: str):
    safe_name = str(name or "").strip() or "there"
    safe_link = str(invite_link or "").strip()
    subject = "Your Churvox invite link"
    html = f"""
        <p>Hi {safe_name},</p>
        <p>Here is your invite link again:</p>
        <p><a href="{safe_link}">Finish setup</a></p>
    """
    return subject, html


def build_password_reset_email(name: str, reset_link: str):
    safe_name = str(name or "").strip() or "there"
    safe_link = str(reset_link or "").strip()
    subject = "Reset your Churvox password"
    html = f"""
        <p>Hello {safe_name},</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="{safe_link}">Reset password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
    """
    return subject, html


async def send_email(to_email: str, subject: str, html_content: str):
    to_email = str(to_email or "").strip()
    subject = str(subject or "").strip()

    if not to_email:
        raise ValueError("Missing to_email")
    if not subject:
        raise ValueError("Missing subject")

    if EMAIL_PROVIDER != "resend":
        raise RuntimeError("EMAIL_PROVIDER is not set to resend")
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is missing")
    if not EMAIL_FROM:
        raise RuntimeError("EMAIL_FROM is missing")

    payload = {
        "from": EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    print(f"RESEND_SEND from={EMAIL_FROM} to={to_email} key_present={bool(RESEND_API_KEY)}")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            print(f"RESEND_OK status={resp.status} body={body[:200]}")
            if resp.status < 200 or resp.status >= 300:
                raise RuntimeError(f"Resend send failed: HTTP {resp.status} {body}")
            return json.loads(body) if body else {"ok": True}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore")
        print(f"RESEND_ERR code={e.code} detail={detail[:300]}")
        raise RuntimeError(f"Resend HTTPError {e.code}: {detail}")
    except urllib.error.URLError as e:
        print(f"RESEND_ERR url_error={e}")
        raise RuntimeError(f"Resend URLError: {e}")
