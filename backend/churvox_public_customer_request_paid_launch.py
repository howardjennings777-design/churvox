from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, Request

VERSION = "churvox-public-customer-request-paid-launch-20260712"
ROUTE_PATHS = {"/api/public/customer-request", "/public/customer-request"}
OWNER_ROLES = {"owner", "business_owner", "employer", "admin", "manager", "office_admin"}
ALLOWED_URGENCY = {"normal", "soon", "urgent", "quote first"}
ALLOWED_IMAGE_PREFIXES = (
    "data:image/jpeg;base64,",
    "data:image/jpg;base64,",
    "data:image/png;base64,",
    "data:image/webp;base64,",
    "data:image/heic;base64,",
    "data:image/heif;base64,",
)
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _text(value: Any, limit: int) -> str:
    return " ".join(str(value or "").strip().split())[:limit]


def _email(value: Any) -> str:
    candidate = _text(value, 320).lower()
    return candidate if EMAIL_RE.match(candidate) else ""


def _phone(value: Any) -> str:
    raw = _text(value, 100)
    if not raw:
        return ""
    clean = "".join(char for char in raw if char.isdigit() or char == "+")
    return clean[:40]


def _client_hash(request: Request) -> str:
    forwarded = _text(request.headers.get("x-forwarded-for"), 300).split(",")[0].strip()
    host = forwarded or _text(getattr(request.client, "host", ""), 200) or "unknown"
    agent = _text(request.headers.get("user-agent"), 500)
    return hashlib.sha256(f"{host}|{agent}".encode("utf-8", "ignore")).hexdigest()


def _remove_routes(app) -> None:
    kept = []
    for route in list(getattr(app.router, "routes", []) or []):
        path = getattr(route, "path", "")
        methods = set(getattr(route, "methods", set()) or set())
        if path in ROUTE_PATHS and "POST" in methods:
            continue
        kept.append(route)
    app.router.routes = kept


def _photos(value: Any) -> list[dict[str, Any]]:
    rows = value if isinstance(value, list) else []
    output = []
    for item in rows[:3]:
        if not isinstance(item, dict):
            continue
        data_url = str(item.get("data_url") or "").strip()
        lowered = data_url.lower()
        if not any(lowered.startswith(prefix) for prefix in ALLOWED_IMAGE_PREFIXES):
            continue
        if len(data_url) > 3_600_000:
            continue
        size = item.get("size")
        try:
            size = int(size or 0)
        except Exception:
            size = 0
        if size <= 0 or size > 2_621_440:
            continue
        output.append({
            "name": _text(item.get("name"), 160),
            "type": _text(item.get("type"), 100).lower(),
            "size": size,
            "data_url": data_url,
            "customer_visible": True,
        })
    return output


async def _owner_for_email(module, owner_email: str):
    owner = await module.db.users.find_one({"email": owner_email})
    if not owner:
        return None
    role = _text(owner.get("role") or owner.get("user_role") or owner.get("account_type"), 100).lower()
    if role not in OWNER_ROLES and owner_email != "hello@churvox.com" and owner.get("is_platform_owner") is not True:
        return None
    if owner.get("account_locked") is True or _text(owner.get("subscription_status"), 100).lower() in {"locked", "disabled"}:
        return None
    return owner


async def _rate_limit(module, request: Request, owner_email: str, contact: str) -> str:
    client_hash = _client_hash(request)
    since = _now() - timedelta(minutes=15)
    try:
        ip_count = await module.db.customer_requests.count_documents({
            "client_hash": client_hash,
            "created_at": {"$gte": since},
        })
        if ip_count >= 5:
            raise HTTPException(status_code=429, detail="Too many requests were sent from this device. Try again later.")
        if contact:
            contact_count = await module.db.customer_requests.count_documents({
                "owner_email": owner_email,
                "contact_key": contact,
                "created_at": {"$gte": since},
            })
            if contact_count >= 3:
                raise HTTPException(status_code=429, detail="This request has already been sent. Wait for the business to review it.")
    except HTTPException:
        raise
    except Exception:
        pass
    return client_hash


def install(module) -> None:
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    if app is None or db is None:
        return
    if getattr(app.state, "churvox_public_customer_request_paid_launch", False):
        return

    _remove_routes(app)

    async def customer_request(request: Request):
        try:
            payload = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Request details must be valid JSON")
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Request details must be an object")

        owner_email = _email(payload.get("owner_email"))
        if not owner_email:
            raise HTTPException(status_code=400, detail="This request link is not connected to a valid business")
        owner = await _owner_for_email(module, owner_email)
        if not owner:
            raise HTTPException(status_code=404, detail="The business request link is invalid or no longer active")

        customer_name = _text(payload.get("customer_name"), 200)
        customer_email = _email(payload.get("customer_email"))
        customer_phone = _phone(payload.get("customer_phone"))
        service_needed = _text(payload.get("service_needed"), 1000)
        if not customer_name:
            raise HTTPException(status_code=400, detail="Customer name is required")
        if not customer_email and not customer_phone:
            raise HTTPException(status_code=400, detail="A valid customer phone or email is required")
        if not service_needed:
            raise HTTPException(status_code=400, detail="Work needed is required")

        urgency = _text(payload.get("urgency"), 60).lower()
        if urgency not in ALLOWED_URGENCY:
            urgency = "normal"
        contact_key = customer_email or customer_phone
        client_hash = await _rate_limit(module, request, owner_email, contact_key)
        now = _now()
        business_id = str(owner.get("business_id") or owner.get("_id"))

        doc = {
            "business_id": business_id,
            "owner_id": str(owner.get("_id")),
            "owner_email": owner_email,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "customer_phone": customer_phone,
            "contact_key": contact_key,
            "address": _text(payload.get("address"), 700),
            "service_needed": service_needed,
            "preferred_day": _text(payload.get("preferred_day"), 300),
            "urgency": urgency,
            "message": _text(payload.get("message"), 4000),
            "photos": _photos(payload.get("photos")),
            "source": "public_customer_request",
            "page_path": _text(payload.get("page_path"), 1500),
            "status": "waiting_owner_review",
            "owner_review_only": True,
            "no_auto_booking": True,
            "no_auto_quote": True,
            "no_auto_message": True,
            "client_hash": client_hash,
            "created_at": now,
            "updated_at": now,
        }
        result = await module.db.customer_requests.insert_one(doc)
        request_id = str(result.inserted_id)

        try:
            await module.db.command_slips.insert_one({
                "business_id": business_id,
                "contractor_id": owner.get("business_id") or owner.get("_id"),
                "source_type": "public_customer_request",
                "source_id": request_id,
                "action_type": "owner_review",
                "title": f"New work request from {customer_name}",
                "found": service_needed,
                "prepared": "Customer details are saved for review. Choose whether to reply, quote or create a job.",
                "why": "A customer submitted the business request form. Nothing has been booked, quoted or sent automatically.",
                "urgency": urgency,
                "status": "open",
                "owner_review_only": True,
                "prepared_only": True,
                "no_auto_send": True,
                "no_auto_sync": True,
                "no_auto_charge": True,
                "no_auto_record_change": True,
                "created_at": now,
                "updated_at": now,
            })
        except Exception:
            pass

        return {
            "success": True,
            "message": "Request sent to the business for owner review.",
            "request_id": request_id,
            "status": "waiting_owner_review",
            "version": VERSION,
        }

    app.add_api_route("/api/public/customer-request", customer_request, methods=["POST"])
    app.add_api_route("/public/customer-request", customer_request, methods=["POST"])
    app.state.churvox_public_customer_request_paid_launch = True
