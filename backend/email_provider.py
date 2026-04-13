import json
import os
import urllib.request
import urllib.error

EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "").strip().lower()
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
EMAIL_FROM = os.getenv("EMAIL_FROM", "").strip() or "Churvox <noreply@mail.churvox.com>"

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
            if resp.status < 200 or resp.status >= 300:
                raise RuntimeError(f"Resend send failed: HTTP {resp.status} {body}")
            return json.loads(body) if body else {"ok": True}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Resend HTTPError {e.code}: {detail}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Resend URLError: {e}")
