from __future__ import annotations

from datetime import datetime, timezone, timedelta
import hashlib
import html
import re

from fastapi import Body, HTTPException, Request

INSTALLED = set()
OWNER_EMAIL = "hello@churvox.com"
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def now_utc():
    return datetime.now(timezone.utc)


def clean(value, limit=200):
    return " ".join(str(value or "").split()).strip()[:limit]


def lower(value, limit=200):
    return clean(value, limit).lower()


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        return {("id" if key == "_id" else key): safe(item) for key, item in value.items()}
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def install(module):
    module_name = getattr(module, "__name__", "")
    if module_name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None:
        return

    try:
        from email_provider import get_email_provider
    except Exception:
        try:
            from backend.email_provider import get_email_provider
        except Exception:
            get_email_provider = None
    mailer = get_email_provider() if get_email_provider else None

    def oid(value):
        try:
            return ObjectId(str(value)) if ObjectId else None
        except Exception:
            return None

    async def require_owner(request: Request):
        if get_current_user is None:
            raise HTTPException(status_code=503, detail="Owner authentication is unavailable")
        current = await get_current_user(request)
        user_id = oid((current or {}).get("id") or (current or {}).get("_id") or (current or {}).get("user_id")) if isinstance(current, dict) else None
        user = await db.users.find_one({"_id": user_id}) if user_id else None
        email = lower((user or current or {}).get("email") if isinstance(user or current, dict) else "")
        if email != OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to hello@churvox.com")
        return user or current

    def client_ip(request: Request):
        forwarded = clean(request.headers.get("x-forwarded-for"), 300)
        if forwarded:
            return forwarded.split(",")[0].strip()
        return clean(getattr(getattr(request, "client", None), "host", ""), 100)

    async def send_mail(to_address, subject, html_body, text_body):
        if not mailer:
            return {"sent": False, "skipped": True, "error": "Email provider unavailable"}
        try:
            result = await mailer.send(to_address, subject, html_body, text_body)
            return {
                "sent": bool(getattr(result, "success", False)),
                "provider": getattr(result, "provider", None),
                "error": getattr(result, "error", None),
            }
        except Exception as exc:
            return {"sent": False, "error": str(exc)}

    async def send_owner_notice(application):
        business = html.escape(application.get("business_name") or "Unknown business")
        name = html.escape(application.get("name") or "Unknown")
        email = html.escape(application.get("email") or "")
        trade = html.escape(application.get("trade") or "Not supplied")
        team_size = html.escape(application.get("team_size") or "Not supplied")
        source = html.escape(application.get("source") or "Not supplied")
        campaign = html.escape(application.get("utm_campaign") or "Not supplied")
        subject = f"New Churvox tester application: {application.get('business_name') or application.get('name') or 'Website visitor'}"
        html_body = f"""
        <div style='font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;background:#f8fafc;padding:24px;'>
          <div style='max-width:580px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;'>
            <p style='margin:0 0 8px;color:#ea580c;font-weight:800;text-transform:uppercase;font-size:12px;letter-spacing:.06em;'>Founding 10 application</p>
            <h2 style='margin:0 0 18px;'>A business applied to test Churvox</h2>
            <table style='width:100%;border-collapse:collapse;'>
              <tr><td style='padding:8px 0;color:#64748b;'>Name</td><td style='padding:8px 0;font-weight:700;'>{name}</td></tr>
              <tr><td style='padding:8px 0;color:#64748b;'>Business</td><td style='padding:8px 0;font-weight:700;'>{business}</td></tr>
              <tr><td style='padding:8px 0;color:#64748b;'>Trade</td><td style='padding:8px 0;font-weight:700;'>{trade}</td></tr>
              <tr><td style='padding:8px 0;color:#64748b;'>Team size</td><td style='padding:8px 0;font-weight:700;'>{team_size}</td></tr>
              <tr><td style='padding:8px 0;color:#64748b;'>Email</td><td style='padding:8px 0;font-weight:700;'><a href='mailto:{email}'>{email}</a></td></tr>
              <tr><td style='padding:8px 0;color:#64748b;'>Source</td><td style='padding:8px 0;font-weight:700;'>{source}</td></tr>
              <tr><td style='padding:8px 0;color:#64748b;'>Campaign</td><td style='padding:8px 0;font-weight:700;'>{campaign}</td></tr>
            </table>
            <p style='margin:20px 0 0;color:#64748b;font-size:13px;'>This application was saved in app_owner_tester_applications. No access was granted automatically.</p>
          </div>
        </div>
        """
        text_body = (
            "New Churvox tester application\n"
            f"Name: {application.get('name')}\n"
            f"Business: {application.get('business_name')}\n"
            f"Trade: {application.get('trade')}\n"
            f"Team size: {application.get('team_size')}\n"
            f"Email: {application.get('email')}\n"
            f"Source: {application.get('source')}\n"
            f"Campaign: {application.get('utm_campaign')}"
        )
        return await send_mail(OWNER_EMAIL, subject, html_body, text_body)

    async def send_applicant_confirmation(application):
        name = html.escape(application.get("name") or "there")
        business = html.escape(application.get("business_name") or "your business")
        subject = "We received your Churvox tester application"
        html_body = f"""
        <div style='font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:24px;'>
          <div style='max-width:580px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:30px;'>
            <p style='margin:0 0 8px;color:#ea580c;font-weight:800;text-transform:uppercase;font-size:12px;letter-spacing:.06em;'>Churvox Founding Tester Programme</p>
            <h2 style='margin:0 0 16px;'>Thanks, {name}. Your application is in.</h2>
            <p style='margin:0 0 14px;'>We have received the tester application for <strong>{business}</strong>.</p>
            <p style='margin:0 0 14px;'>Howard will review it and contact you by email if one of the selected tester places is available. Applying has not created an account, started a subscription or charged anything.</p>
            <div style='margin:22px 0;padding:16px;border-radius:12px;background:#fff7ed;color:#7c2d12;'>
              <strong>What selected testers receive</strong><br>
              30 days of tester access, setup help by email and no pressure to continue.
            </div>
            <p style='margin:0;color:#64748b;font-size:13px;'>Churvox prepares the admin. The owner checks and approves.</p>
          </div>
        </div>
        """
        text_body = (
            f"Thanks, {application.get('name') or 'there'}. Your Churvox tester application is in.\n\n"
            f"We received the application for {application.get('business_name') or 'your business'}. "
            "Howard will review it and contact you by email if a selected tester place is available.\n\n"
            "Applying has not created an account, started a subscription or charged anything. Selected testers receive 30 days of tester access and setup help by email."
        )
        return await send_mail(application.get("email"), subject, html_body, text_body)

    async def create_application(request: Request, payload: dict = Body(default={})):
        if clean(payload.get("website"), 300):
            return {"success": True, "message": "Application received"}

        name = clean(payload.get("name"), 100)
        business_name = clean(payload.get("business_name"), 140)
        trade = clean(payload.get("trade"), 100)
        email = lower(payload.get("email"), 180)
        team_size = clean(payload.get("team_size"), 40)
        source = clean(payload.get("source"), 80) or "founding_10_homepage_popup"
        utm_source = clean(payload.get("utm_source"), 120)
        utm_medium = clean(payload.get("utm_medium"), 120)
        utm_campaign = clean(payload.get("utm_campaign"), 120)
        utm_content = clean(payload.get("utm_content"), 120)
        referrer = clean(payload.get("referrer"), 300)
        landing_path = clean(payload.get("landing_path"), 300)
        locale = clean(payload.get("locale"), 40)

        if not all([name, business_name, trade, email, team_size]):
            raise HTTPException(status_code=400, detail="Complete all five application fields")
        if not EMAIL_RE.match(email):
            raise HTTPException(status_code=400, detail="Enter a valid email address")

        ip = client_ip(request)
        user_agent = clean(request.headers.get("user-agent"), 300)
        request_key = hashlib.sha256(f"{ip}|{user_agent}".encode("utf-8")).hexdigest()[:24] if ip else ""
        one_hour_ago = now_utc() - timedelta(hours=1)
        recent_from_ip = await db.app_owner_tester_applications.count_documents({"request_key": request_key, "created_at": {"$gte": one_hour_ago}}) if request_key else 0
        if recent_from_ip >= 5:
            raise HTTPException(status_code=429, detail="Too many applications from this connection. Please try again later.")

        existing = await db.app_owner_tester_applications.find_one({"email": email})
        if existing:
            return {"success": True, "message": "Application already received"}

        application = {
            "name": name,
            "business_name": business_name,
            "trade": trade,
            "email": email,
            "team_size": team_size,
            "source": source,
            "utm_source": utm_source,
            "utm_medium": utm_medium,
            "utm_campaign": utm_campaign,
            "utm_content": utm_content,
            "referrer": referrer,
            "landing_path": landing_path,
            "locale": locale,
            "status": "new",
            "request_key": request_key,
            "user_agent": user_agent,
            "updated_at": now_utc(),
        }
        update = {"$set": application, "$setOnInsert": {"created_at": now_utc()}}
        result = await db.app_owner_tester_applications.update_one({"email": email}, update, upsert=True)
        stored = await db.app_owner_tester_applications.find_one({"_id": result.upserted_id}) if result.upserted_id else await db.app_owner_tester_applications.find_one({"email": email})
        owner_notice = await send_owner_notice(application)
        applicant_confirmation = await send_applicant_confirmation(application)
        email_results = {
            "owner_notice": owner_notice,
            "applicant_confirmation": applicant_confirmation,
        }
        await db.app_owner_control_log.insert_one({
            "created_at": now_utc(),
            "action": "public_tester_application",
            "target_email": email,
            "payload": safe(application),
            "result": email_results,
        })
        return {
            "success": True,
            "message": "Application received",
            "application_id": str((stored or {}).get("_id") or ""),
            "confirmation_sent": bool(applicant_confirmation.get("sent")),
        }

    async def list_applications(request: Request):
        await require_owner(request)
        rows = await db.app_owner_tester_applications.find({}).sort("created_at", -1).limit(500).to_list(length=500)
        return {"success": True, "count": len(rows), "applications": safe(rows)}

    for method, path, endpoint in [
        ("POST", "/api/public/tester-applications", create_application),
        ("GET", "/api/admin/owner/tester-applications", list_applications),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(module_name)
