from fastapi import File, UploadFile
import os
import json
import urllib.request
import urllib.error
import json
import urllib.request
import urllib.error
import asyncio
import csv
import io
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

def make_json_safe(value):
    if isinstance(value, dict):
        return {k: make_json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [make_json_safe(v) for v in value]
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def normalize_job_status_for_response(job: dict):
    if not job:
        return job

    status = str(job.get("status", "")).lower().strip()
    job_status = str(job.get("job_status", "")).lower().strip()
    workflow_status = str(job.get("workflow_status", "")).lower().strip()
    completed = job.get("completed") is True
    completed_at = bool(job.get("completed_at"))

    if (
        status == "completed" or
        job_status == "completed" or
        workflow_status == "completed" or
        completed or
        completed_at
    ):
        job["status"] = "completed"
        job["job_status"] = "completed"
        job["workflow_status"] = "completed"
        job["completed"] = True

    elif (
        status in ["in progress", "in_progress"] or
        job_status in ["in progress", "in_progress"] or
        workflow_status in ["in progress", "in_progress"]
    ):
        job["status"] = "in_progress"

    elif status == "paused" or job_status == "paused" or workflow_status == "paused":
        job["status"] = "paused"

    elif status == "assigned" or job_status == "assigned" or workflow_status == "assigned":
        job["status"] = "assigned"

    return job


from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pathlib import Path


def clean_phone(value):
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    if value.startswith("+"):
        return "+" + "".join(ch for ch in value[1:] if ch.isdigit())
    return "".join(ch for ch in value if ch.isdigit()) or None

def get_phone_from_dict(data):
    if not isinstance(data, dict):
        return None
    for key in [
        "phone",
        "phone_number",
        "mobile",
        "mobile_number",
        "cell",
        "cell_phone",
        "contact_phone",
        "client_phone",
        "sms_phone",
    ]:
        val = clean_phone(data.get(key))
        if val:
            return val
    return None

async def resolve_job_sms_phone(job):
    if not isinstance(job, dict):
        return None

    # 1) direct on job
    phone = get_phone_from_dict(job)
    if phone:
        return phone

    # 2) nested client/customer object
    for nested_key in ["client", "customer"]:
        nested = job.get(nested_key)
        phone = get_phone_from_dict(nested)
        if phone:
            return phone

    # 3) by client/customer id
    client_id = job.get("client_id") or job.get("customer_id")
    if client_id:
        try:
            client = await db.clients.find_one({"_id": ObjectId(client_id)})
            phone = get_phone_from_dict(client)
            if phone:
                return phone
        except Exception:
            pass

        try:
            client = await db.clients.find_one({"id": str(client_id)})
            phone = get_phone_from_dict(client)
            if phone:
                return phone
        except Exception:
            pass

    # 4) by client/customer name
    client_name = (
        job.get("client_name")
        or job.get("customer_name")
        or (job.get("client") if isinstance(job.get("client"), str) else None)
        or (job.get("customer") if isinstance(job.get("customer"), str) else None)
    )
    if client_name:
        try:
            client = await db.clients.find_one({"name": client_name})
            phone = get_phone_from_dict(client)
            if phone:
                return phone
        except Exception:
            pass

    return None


def _safe_text(value):
    return str(value or "").strip()


def _format_invoice_description_from_job(job: dict, client_name: str = "") -> str:
    if not isinstance(job, dict):
        return f"Service work completed for {client_name}. Job marked complete and ready for billing." if client_name else "Service work completed. Job marked complete and ready for billing."

    persisted = _safe_text(job.get("ai_invoice_description") or job.get("invoice_description_draft"))
    if persisted:
        return persisted

    title = _safe_text(job.get("title") or job.get("name"))
    service_type = _safe_text(job.get("service_type") or job.get("job_type") or "Service work")
    lead = title or service_type
    resolved_client = _safe_text(client_name or job.get("client_name") or job.get("customer_name") or (job.get("client") if isinstance(job.get("client"), str) else "")) or "the client"
    address = _safe_text(job.get("address") or job.get("job_address") or job.get("service_address"))
    completion_notes = _safe_text(job.get("completion_notes") or job.get("worker_completion_notes"))
    worker_notes = _safe_text(job.get("worker_notes") or job.get("job_notes") or job.get("notes"))
    included_work = _safe_text(job.get("included_work") or job.get("scope_of_work") or job.get("description"))
    materials = _safe_text(job.get("materials") or job.get("extras_summary"))
    pricing_type = _safe_text(job.get("pricing_type") or job.get("price_type"))
    location = f" at {address}" if address else ""
    detail = completion_notes or worker_notes or included_work

    if detail:
        summary = f"{lead} completed for {resolved_client}{location}, including {detail}."
    else:
        summary = f"{lead} completed for {resolved_client}{location}. Work has been marked complete and is ready for billing."

    if materials:
        summary = f"{summary} Materials/extras: {materials}."
    if pricing_type:
        summary = f"{summary} Pricing basis: {pricing_type}."
    return summary


def _haversine_meters(lat1, lng1, lat2, lng2):
    try:
        from math import radians, sin, cos, sqrt, atan2
        r = 6371000.0
        dlat = radians(float(lat2) - float(lat1))
        dlng = radians(float(lng2) - float(lng1))
        a = sin(dlat / 2) ** 2 + cos(radians(float(lat1))) * cos(radians(float(lat2))) * sin(dlng / 2) ** 2
        return round(r * (2 * atan2(sqrt(a), sqrt(1 - a))), 1)
    except Exception:
        return None


def _visit_status_for_distance(distance_meters):
    if distance_meters is None:
        return "job_location_missing"
    if distance_meters <= 100:
        return "on_site"
    if distance_meters <= 500:
        return "nearby"
    return "away_from_site"


def _duration_label(seconds):
    try:
        s = max(0, int(seconds or 0))
    except Exception:
        return "0 minutes"
    mins = round(s / 60)
    if mins < 60:
        return f"{mins} minute" + ("" if mins == 1 else "s")
    h = mins // 60
    m = mins % 60
    if m == 0:
        return f"{h} hour" + ("" if h == 1 else "s")
    return f"{h} hour" + ("" if h == 1 else "s") + f" {m} minutes"


def _build_visit_summary(job):
    worker_name = _safe_text(job.get("assigned_worker_name") or job.get("worker_name")) or "Worker"
    address = _safe_text(job.get("address")) or "the job address"
    started_at = job.get("started_at")
    completed_at = job.get("completed_at")
    start_status = _safe_text(job.get("start_location_status"))
    end_status = _safe_text(job.get("end_location_status"))
    total_label = _safe_text(job.get("total_time_on_site_label")) or "0 minutes"
    try:
        start_text = started_at.astimezone().strftime("%-I:%M %p") if hasattr(started_at, "astimezone") else str(started_at)
    except Exception:
        start_text = str(started_at or "unknown time")
    try:
        end_text = completed_at.astimezone().strftime("%-I:%M %p") if hasattr(completed_at, "astimezone") else str(completed_at)
    except Exception:
        end_text = str(completed_at or "unknown time")
    if start_status in {"location_denied", "location_error", "job_location_missing"} or end_status in {"location_denied", "location_error", "job_location_missing"}:
        return f"{worker_name} started at {address} at {start_text} and completed at {end_text}. Start and finish times were recorded, but location could not be verified."
    if start_status == "away_from_site":
        km = None
        try:
            d = float(job.get("start_distance_from_site_meters") or 0)
            km = round(d / 1000, 1)
        except Exception:
            pass
        suffix = f" ({km}km away)" if km is not None else ""
        return f"{worker_name} arrived for {address} at {start_text} and completed at {end_text}. Worker started away from the saved job address{suffix}. Owner review recommended."
    return f"{worker_name} arrived at {address} at {start_text} and completed the job at {end_text}. Location was verified near the job address at start and finish. Total time on site was {total_label}. The job is ready for owner review and invoice preparation."


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, Query, Body
from app.plan_rules import normalize_plan, get_plan_features, can_use_feature, get_max_clients, has_plan_access, get_plan_display_name, get_included_users, has_plan_access, get_plan_display_name, get_included_users
from owner_bootstrap import ensure_owner_account
from fastapi.responses import RedirectResponse, HTMLResponse, FileResponse, JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# =========================
# BUSINESS ISOLATION HELPERS
# =========================
def normalize_object_id(value):
    try:
        if not value:
            return None
        return ObjectId(str(value))
    except Exception:
        return None

async def get_user_business_id(user: dict):
    """
    Always return the OWNER business id.
    Owner: own id
    Worker/sub-user: parent business_id
    """
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    raw_business_id = user.get("business_id")
    raw_user_id = user.get("id") or user.get("_id")

    if raw_business_id:
        return str(raw_business_id)
    if raw_user_id:
        return str(raw_user_id)

    raise HTTPException(status_code=401, detail="User business not found")

def business_filter(business_id: str, extra: dict | None = None):
    query = {"business_id": str(business_id)}
    if extra:
        query.update(extra)
    return query

def ensure_same_business_or_404(doc: dict | None, business_id: str):
    if not doc:
        raise HTTPException(status_code=404, detail="Record not found")
    if str(doc.get("business_id", "")) != str(business_id):
        raise HTTPException(status_code=404, detail="Record not found")
    return doc

async def create_with_business(collection, payload: dict, business_id: str):
    payload = dict(payload)
    payload["business_id"] = str(business_id)
    await collection.insert_one(payload)
    return payload

async def find_one_in_business(collection, business_id: str, extra: dict):
    doc = await collection.find_one(business_filter(business_id, extra))
    return ensure_same_business_or_404(doc, business_id) if doc else None

async def list_in_business(collection, business_id: str, extra: dict | None = None, sort=None, limit: int = 1000):
    q = business_filter(business_id, extra or {})
    cursor = collection.find(q)
    if sort:
        cursor = cursor.sort(sort)
    if limit:
        cursor = cursor.limit(limit)
    return await cursor.to_list(length=limit)

async def update_one_in_business(collection, business_id: str, extra: dict, update_data: dict):
    result = await collection.update_one(
        business_filter(business_id, extra),
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return result

async def delete_one_in_business(collection, business_id: str, extra: dict):
    result = await collection.delete_one(business_filter(business_id, extra))
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return result

def force_business_on_payload(payload: dict, business_id: str):
    """
    Never trust business_id from frontend.
    Always overwrite it.
    """
    payload["business_id"] = str(business_id)
    return payload

def safe_doc(doc):
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

def safe_docs(items):
    return [safe_doc(x) for x in items]

from collections import Counter
import logging
import bcrypt
import jwt
import secrets
import stripe
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum
from sms_provider import get_sms_provider, format_phone_au_nz
from email_provider import (
    get_email_provider,
    build_invite_email,
    build_resend_invite_email,
    build_password_reset_email,
    build_verification_email,
    send_email,
)
import automation as auto

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000, connectTimeoutMS=10000, socketTimeoutMS=10000, maxPoolSize=20)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_change_me')
JWT_ALGORITHM = "HS256"
DEFAULT_GST_RATE = float(os.environ.get('DEFAULT_GST_RATE', '15'))
BUSINESS_ROLES = {"owner", "admin", "employer", "manager", "office_admin"}
ACCOUNTING_CONFIG_ROLES = {"owner", "admin", "employer", "manager"}
INVOICE_MODES = {"churvox_only", "myob_sync", "myob_external"}




PLATFORM_OWNER_EMAILS = [
    e.strip().lower()
    for e in os.environ.get("PLATFORM_OWNER_EMAILS", "hello@churvox.com").split(",")
    if e.strip()
]

def is_platform_owner(user: dict) -> bool:
    if not user:
        return False
    email = (user.get("email") or "").strip().lower()
    return user.get("is_platform_owner") is True or email in PLATFORM_OWNER_EMAILS

# Stripe Config
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_SOLO = os.environ.get("STRIPE_PRICE_SOLO", "")
STRIPE_PRICE_TEAM = os.environ.get("STRIPE_PRICE_TEAM", "")
STRIPE_PRICE_PRO = os.environ.get("STRIPE_PRICE_PRO", "")
STRIPE_PRICE_ENTERPRISE = os.environ.get("STRIPE_PRICE_ENTERPRISE", "")

stripe.api_key = STRIPE_SECRET_KEY

PLAN_PRICE_IDS = {
    "solo": STRIPE_PRICE_SOLO,
    "team": STRIPE_PRICE_TEAM,
    "pro": STRIPE_PRICE_PRO,
    "enterprise": STRIPE_PRICE_ENTERPRISE,
}

# Create the main app
app = FastAPI(title="Churvox API")

ALLOWED_ORIGINS = [
    "https://www.churvox.com",
    "https://churvox.com",
    "https://grassley-frontend.onrender.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)



app.add_middleware(GZipMiddleware, minimum_size=1000)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.churvox.com").rstrip("/")
BACKEND_PUBLIC_URL = os.environ.get("BACKEND_PUBLIC_URL", "https://grassley-backend.onrender.com").rstrip("/")


api_router = APIRouter(prefix="/api")

# SMS Provider (abstracted — swap providers by changing env config)
sms_provider = get_sms_provider()

# Email Provider (abstracted — swap providers by changing env config)
email_provider = get_email_provider()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== ENUMS =====================
class UserRole(str, Enum):
    EMPLOYER = "employer"
    WORKER = "worker"

class JobStatus(str, Enum):
    ASSIGNED = "assigned"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class JobType(str, Enum):
    LAWN_MOWING = "lawn_mowing"
    HEDGE_TRIMMING = "hedge_trimming"
    GARDEN_MAINTENANCE = "garden_maintenance"
    LANDSCAPING = "landscaping"
    TREE_SERVICES = "tree_services"
    GARDENING = "gardening"
    CLEANING = "cleaning"
    WINDOW_CLEANING = "window_cleaning"
    PRESSURE_WASHING = "pressure_washing"
    HANDYMAN = "handyman"
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    PAINTING = "painting"
    CARPENTRY = "carpentry"
    PEST_CONTROL = "pest_control"
    POOL_MAINTENANCE = "pool_maintenance"
    HVAC = "hvac"
    ROOFING = "roofing"
    OTHER = "other"

class PricingType(str, Enum):
    FIXED = "fixed"
    HOURLY = "hourly"
    FIXED_EXTRAS = "fixed_extras"
    HOURLY_EXTRAS = "hourly_extras"

class QuoteStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class MyobSyncStatus(str, Enum):
    NOT_SYNCED = "not_synced"
    SYNCING = "syncing"
    SYNCED = "synced"
    SYNC_FAILED = "sync_failed"

class PlanType(str, Enum):
    SOLO = "solo"
    TEAM = "team"
    PRO = "pro"
    ENTERPRISE = "enterprise"

PLAN_LIMITS = {
    "solo": {
        "price": 39, "max_workers": 0, "max_clients": 20,
        "sms": False, "myob": False, "team": False,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
        "public_name": "Start",
    },
    "team": {
        "price": 89, "max_workers": 5, "max_clients": 30,
        "sms": True, "myob": False, "team": True,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
        "public_name": "Crew",
    },
    "pro": {
        "price": 149, "max_workers": 15, "max_clients": 40,
        "sms": True, "myob": False, "myob_addon_available": True, "team": True,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
        "ai_operator": True, "automation": True,
        "public_name": "Operator",
    },
    "enterprise": {
        "price": 299, "max_workers": 50, "max_clients": 50,
        "sms": True, "myob": True, "team": True,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
        "ai_operator": True, "automation": True, "payroll_workspace": True,
        "extra_blocks": True, "extra_user_block_size": 50, "extra_user_block_price": 99,
        "public_name": "Command",
    },
}


def _resolve_business_id(user: dict) -> str:
    return str(
        user.get("business_id")
        or user.get("businessId")
        or user.get("id")
        or user.get("_id")
        or user.get("user_id")
        or ""
    )


def _resolve_owner_id(user: dict) -> str:
    return str(
        user.get("_id")
        or user.get("id")
        or user.get("user_id")
        or ""
    )


def _safe_iso(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            pass
    try:
        return str(value)
    except Exception:
        return None


async def _myob_plan_allowed_for_business(current_user: dict, business_id: str) -> bool:
    plan = normalize_plan(current_user.get("plan")) or "solo"
    if plan == "enterprise":
        return True
    if plan in {"solo", "team"}:
        return False
    if plan == "pro":
        settings = await db.myob_settings.find_one({"business_id": business_id}) if hasattr(db, "myob_settings") else None
        return bool((settings or {}).get("pro_addon_enabled") is True)
    return False


def _invoice_access_query(invoice_id: ObjectId, business_id: str, owner_id: str) -> dict:
    return {
        "_id": invoice_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ],
    }


def _serialize_invoice(invoice: dict) -> dict:
    subtotal = float(invoice.get("subtotal") or 0)
    gst_rate = float(invoice.get("gst_rate") or 15)
    gst_amount = subtotal * gst_rate / 100.0
    total = float(invoice.get("total") or (subtotal + gst_amount))
    return {
        "id": str(invoice.get("_id") or invoice.get("id") or ""),
        "invoice_number": invoice.get("invoice_number") or f"INV-{str(invoice.get('_id') or '')[-6:]}",
        "job_id": str(invoice.get("job_id") or ""),
        "source_job_id": str(invoice.get("source_job_id") or ""),
        "linked_job_id": str(invoice.get("linked_job_id") or ""),
        "client_id": invoice.get("client_id"),
        "customer_name": invoice.get("customer_name") or "",
        "customer_email": invoice.get("customer_email") or "",
        "address": invoice.get("address") or "",
        "description": invoice.get("description") or "",
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "total": total,
        "status": invoice.get("status") or "draft",
        "public_token": invoice.get("public_token") or "",
        "public_invoice_url": f"{FRONTEND_URL}/public/invoice/{invoice.get('public_token')}" if invoice.get("public_token") else "",
        "payment_link": invoice.get("payment_link") or "",
        "pricing_type": invoice.get("pricing_type") or "fixed",
        "hourly_rate": float(invoice.get("hourly_rate") or 0),
        "hours_worked": float(invoice.get("hours_worked") or 0),
        "extras": invoice.get("extras") or [],
        "notes": invoice.get("notes") or "",
        "customer_phone": invoice.get("customer_phone") or invoice.get("phone") or "",
        "billing_address": invoice.get("billing_address") or "",
        "site_address": invoice.get("site_address") or invoice.get("address") or "",
        "due_date": _safe_iso(invoice.get("due_date")),
        "payment_terms": invoice.get("payment_terms") or "",
        "line_items": invoice.get("line_items") or invoice.get("items") or [],
        "discount_amount": float(invoice.get("discount_amount") or 0),
        "deposit_amount": float(invoice.get("deposit_amount") or 0),
        "amount_paid": float(invoice.get("amount_paid") or invoice.get("paid_amount") or 0),
        "amount_due": float(invoice.get("amount_due") or invoice.get("balance_due") or max(0, total - float(invoice.get("amount_paid") or invoice.get("paid_amount") or 0))),
        "balance_due": float(invoice.get("balance_due") or invoice.get("amount_due") or max(0, total - float(invoice.get("amount_paid") or invoice.get("paid_amount") or 0))),
        "payment_history": invoice.get("payment_history") or [],
        "internal_notes": invoice.get("internal_notes") or "",
        "public_notes": invoice.get("public_notes") or "",
        "business_snapshot": invoice.get("business_snapshot") or {},
        "myob_sync_status": invoice.get("myob_sync_status") or "not_synced",
        "myob_invoice_id": invoice.get("myob_invoice_id") or "",
        "myob_invoice_number": invoice.get("myob_invoice_number") or "",
        "myob_last_synced_at": _safe_iso(invoice.get("myob_last_synced_at")),
        "myob_error": invoice.get("myob_error") or "",
        "myob_payment_status": invoice.get("myob_payment_status") or "",
        "myob_invoice_url": invoice.get("myob_invoice_url") or "",
        "official_invoice_source": invoice.get("official_invoice_source") or "churvox",
        "source": invoice.get("source") or "invoice",
        "created_at": _safe_iso(invoice.get("created_at")),
        "updated_at": _safe_iso(invoice.get("updated_at")),
    }

# ===================== MODELS =====================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    business_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str

class WorkerCreate(BaseModel):
    name: str
    email: EmailStr
    password: Optional[str] = None
    phone: Optional[str] = None

class InviteAccept(BaseModel):
    token: str
    password: str
    name: Optional[str] = None

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    # CHURVOX_WORK_SLIP_MESSAGE_DRAFT_FIELDS_20260527
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    customer_message_draft: Optional[str] = None
    draft_message: Optional[str] = None
    last_message_draft: Optional[str] = None

class JobCreate(BaseModel):
    title: Optional[str] = None
    job_type: JobType
    client_id: Optional[str] = None
    customer_name: Optional[str] = None
    address: str
    scheduled_date: datetime
    scheduled_time: Optional[str] = None
    estimated_duration: Optional[int] = 60
    price: float = 0
    pricing_type: Optional[str] = "fixed"
    hourly_rate: Optional[float] = 0
    extras: Optional[List[dict]] = []
    notes: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    assigned_worker_id: Optional[str] = None

class JobUpdate(BaseModel):
    # CHURVOX_WORK_SLIP_JOBUPDATE_FIELDS_20260527
    title: Optional[str] = None
    job_name: Optional[str] = None
    job_type: Optional[JobType] = None
    service_type: Optional[str] = None
    client_id: Optional[str] = None
    customer_name: Optional[str] = None
    client_name: Optional[str] = None
    address: Optional[str] = None
    site_address: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    scheduled_time: Optional[str] = None
    estimated_duration: Optional[int] = None
    price: Optional[float] = None
    job_price: Optional[float] = None
    pricing_type: Optional[str] = None
    hourly_rate: Optional[float] = None
    extras: Optional[List[dict]] = None
    notes: Optional[str] = None
    worker_notes: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    assigned_worker_id: Optional[str] = None
    assigned_worker_name: Optional[str] = None
    assigned_to: Optional[str] = None
    invoice_description_draft: Optional[str] = None
    customer_message_draft: Optional[str] = None
    owner_review_status: Optional[str] = None
    work_review_status: Optional[str] = None
    reviewed: Optional[bool] = None
    owner_approved: Optional[bool] = None
    work_approved: Optional[bool] = None
    status: Optional[JobStatus] = None

class JobAssign(BaseModel):
    worker_id: str

class TimeAdjust(BaseModel):
    total_time_seconds: int

class QuoteCreate(BaseModel):
    client_id: Optional[str] = None
    customer_name: str
    customer_email: Optional[str] = None
    address: str
    job_description: str
    job_type: Optional[str] = "other"
    price: float
    pricing_type: Optional[str] = "fixed"
    hourly_rate: Optional[float] = 0
    extras: Optional[List[dict]] = []
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None

class QuoteUpdate(BaseModel):
    # CHURVOX_WORK_SLIP_MESSAGE_DRAFT_FIELDS_20260527
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    address: Optional[str] = None
    job_description: Optional[str] = None
    price: Optional[float] = None
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    status: Optional[QuoteStatus] = None
    customer_message_draft: Optional[str] = None
    draft_message: Optional[str] = None
    last_message_draft: Optional[str] = None

class InvoiceCreate(BaseModel):
    job_id: Optional[str] = None
    client_id: Optional[str] = None
    customer_name: str
    customer_email: Optional[str] = None
    address: Optional[str] = ""
    description: str
    subtotal: float
    gst_rate: Optional[float] = None
    notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    # CHURVOX_WORK_SLIP_MESSAGE_DRAFT_FIELDS_20260527
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    subtotal: Optional[float] = None
    gst_rate: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[InvoiceStatus] = None
    customer_message_draft: Optional[str] = None
    draft_message: Optional[str] = None
    last_message_draft: Optional[str] = None

class PlanUpdate(BaseModel):
    plan: PlanType

class CreateCheckoutSessionRequest(BaseModel):
    plan: PlanType

class GSTUpdate(BaseModel):
    gst_rate: float

class TradeUpdate(BaseModel):
    trade_type: str

class SmsSend(BaseModel):
    recipient_phone: str
    message_type: str  # customer_reminder, on_the_way, invoice_reminder, custom
    job_id: Optional[str] = None
    invoice_id: Optional[str] = None
    custom_message: Optional[str] = None

class SmsTestSend(BaseModel):
    phone: str
    message: Optional[str] = "Test SMS from Churvox"

class SmsBuyCredits(BaseModel):
    pack: str  # 100, 500, 1000

class MyobSettingsUpdate(BaseModel):
    api_key: Optional[str] = None
    company_file_id: Optional[str] = None
    company_file_name: Optional[str] = None

SMS_PACKS = {
    "100": {"credits": 100, "price": 10.00},
    "500": {"credits": 500, "price": 45.00},
    "1000": {"credits": 1000, "price": 80.00},
}

SMS_CREDITS_PER_MESSAGE = 2

# ===================== HELPERS =====================
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def get_password_hash(password: str):
    return hash_password(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        # Ensure business_id is always a string
        if "business_id" in user and isinstance(user["business_id"], ObjectId):
            user["business_id"] = str(user["business_id"])
        elif "business_id" not in user:
            # Legacy fallback: use own id as business_id
            user["business_id"] = user["id"]
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_employer(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in ("employer", "admin"):
        raise HTTPException(status_code=403, detail="Only employers can perform this action")
    return user


# CHURVOX_BACKEND_PLAN_ACCESS_GUARD_20260602
# Central API guard so Start/Crew/Operator/Command are enforced server-side too.
# This protects major feature areas even if someone bypasses frontend buttons/routes.

def _plan_locked_response(feature: str, required_plan: str, current_plan: str, detail: str = None):
    required_name = get_plan_display_name(required_plan)
    current_name = get_plan_display_name(current_plan)
    return JSONResponse(
        status_code=403,
        content={
            "success": False,
            "upgrade_required": True,
            "feature": feature,
            "required_plan": required_plan,
            "required_plan_name": required_name,
            "current_plan": current_plan,
            "current_plan_name": current_name,
            "detail": detail or f"{feature} needs the {required_name} plan.",
        },
    )


async def _get_effective_business_plan(current_user: dict):
    plan = normalize_plan((current_user or {}).get("plan"))
    if plan:
        return plan

    business_id = str((current_user or {}).get("business_id") or (current_user or {}).get("id") or "")
    if not business_id:
        return None

    owner_query = [
        {"business_id": business_id, "role": {"$in": ["owner", "employer", "admin"]}},
        {"id": business_id},
        {"user_id": business_id},
    ]

    try:
        owner_query.insert(0, {"_id": ObjectId(business_id)})
    except Exception:
        pass

    owner = await db.users.find_one({"$or": owner_query})
    if owner and normalize_plan(owner.get("plan")):
        return normalize_plan(owner.get("plan"))

    business = await db.businesses.find_one({"$or": [{"business_id": business_id}, {"id": business_id}]})
    if business and normalize_plan(business.get("plan")):
        return normalize_plan(business.get("plan"))

    return None


def _is_targeted_plan_guard_path(path: str, method: str):
    p = (path or "").rstrip("/") or path
    if not p.startswith("/api/"):
        return False

    if p in {"/api/clients"} and method == "POST":
        return True
    if p.startswith("/api/clients/") and method == "POST" and "import" in p:
        return True

    if p.startswith("/api/team") and method in {"POST", "PUT", "PATCH", "DELETE"}:
        return True

    if p.startswith("/api/payroll"):
        return True

    if p.startswith("/api/automation") or p.startswith("/api/operator") or p.startswith("/api/ai-operator") or p.startswith("/api/message-approvals"):
        return True

    if "/myob" in p:
        return True

    return False


@app.middleware("http")
async def churvox_backend_plan_access_guard(request: Request, call_next):
    path = request.url.path or ""
    method = request.method.upper()

    if not _is_targeted_plan_guard_path(path, method):
        return await call_next(request)

    try:
        current_user = await get_current_user(request)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"success": False, "detail": exc.detail})
    except Exception:
        return JSONResponse(status_code=401, content={"success": False, "detail": "Not authenticated"})

    current_plan = await _get_effective_business_plan(current_user)
    business_id = str(current_user.get("business_id") or current_user.get("id") or "")

    # Team write access starts at Crew.
    if path.startswith("/api/team") and method in {"POST", "PUT", "PATCH", "DELETE"}:
        if not has_plan_access(current_plan, "team"):
            return _plan_locked_response("Team workspace", "team", current_plan)

        # Keep team size aligned with included users for non-Command plans.
        # Command can grow later with Growth Packs.
        if method == "POST" and current_plan != "enterprise" and business_id:
            max_users = get_included_users(current_plan)
            active_team_count = await db.users.count_documents({
                "business_id": business_id,
                "role": {"$in": ["worker", "manager", "office_admin", "payroll"]},
                "deleted": {"$ne": True},
                "archived": {"$ne": True},
                "disabled": {"$ne": True},
            })
            if active_team_count >= max_users:
                return _plan_locked_response(
                    "Team member limit",
                    "enterprise",
                    current_plan,
                    f"Your current plan includes up to {max_users} active team member records. Upgrade to Command or add capacity before inviting more."
                )

    # Client creation respects plan cap.
    if (path.rstrip("/") == "/api/clients") and method == "POST":
        max_clients = get_max_clients(current_plan)
        if business_id:
            active_client_count = await db.clients.count_documents({
                "business_id": business_id,
                "deleted": {"$ne": True},
                "archived": {"$ne": True},
            })
            if active_client_count >= max_clients:
                return _plan_locked_response(
                    "Client limit",
                    "enterprise" if current_plan == "pro" else "team",
                    current_plan,
                    f"Your current plan allows up to {max_clients} active clients."
                )

    # Client CSV import is Operator and above.
    if path.startswith("/api/clients/") and method == "POST" and "import" in path:
        if not can_use_feature(current_plan, "csv_client_import"):
            return _plan_locked_response("Client CSV import", "pro", current_plan)

    # AI Operator / automation starts at Operator.
    if path.startswith("/api/automation") or path.startswith("/api/operator") or path.startswith("/api/ai-operator") or path.startswith("/api/message-approvals"):
        if not has_plan_access(current_plan, "pro"):
            return _plan_locked_response("AI Operator and automation", "pro", current_plan)

    # Payroll workspace is Command only.
    if path.startswith("/api/payroll"):
        if not can_use_feature(current_plan, "payroll_workspace"):
            return _plan_locked_response("Payroll workspace", "enterprise", current_plan)

    # MYOB is Command included, or Operator with MYOB add-on enabled.
    if "/myob" in path:
        plan_user = dict(current_user)
        plan_user["plan"] = current_plan
        allowed = await _myob_plan_allowed_for_business(plan_user, business_id)
        if not allowed:
            return _plan_locked_response(
                "MYOB sync",
                "enterprise",
                current_plan,
                "MYOB is included in Command. Operator can use MYOB with the MYOB add-on."
            )

    return await call_next(request)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

def clear_auth_cookies(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")

def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            doc[key] = str(value)
    return doc

def build_user_response(user_doc: dict, user_id: str, token: str = None) -> dict:
    resp = {
        "id": user_id,
        "email": user_doc["email"],
        "name": user_doc["name"],
        "business_name": user_doc.get("business_name"),
        "role": user_doc.get("role", "employer"),
        "plan": user_doc.get("plan") or None,
        "plan_status": user_doc.get("plan_status") or None,
        "subscription_status": user_doc.get("subscription_status") or None,
        "trial_ends_at": user_doc.get("trial_ends_at").isoformat() if hasattr(user_doc.get("trial_ends_at"), "isoformat") else user_doc.get("trial_ends_at"),
        "stripe_subscription_id": user_doc.get("stripe_subscription_id") or None,
        "gst_rate": user_doc.get("gst_rate", DEFAULT_GST_RATE),
        "trade_type": user_doc.get("trade_type", "other"),
        "business_id": str(user_doc.get("business_id", user_id)),
        "onboarding_completed": bool(user_doc.get("onboarding_completed", False)),
    }
    if token:
        resp["token"] = token
    return resp


def get_stripe_price_id(plan: str) -> str:
    plan = (plan or "solo").lower()
    price_map = {
        "solo": STRIPE_PRICE_SOLO,
        "team": STRIPE_PRICE_TEAM,
        "pro": STRIPE_PRICE_PRO,
        "enterprise": STRIPE_PRICE_ENTERPRISE,
    }
    price_id = price_map.get(plan, "")
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Missing Stripe price ID for plan: {plan}")
    return price_id


@api_router.get("/payroll/periods")
async def payroll_periods_alias(current_user: dict = Depends(get_current_user)):
    return await payroll_list_periods(current_user)


@api_router.post("/payroll/periods")
async def payroll_create_period_alias(payload: dict, current_user: dict = Depends(get_current_user)):
    return await payroll_create_period(payload, current_user)


@api_router.get("/payroll/summary")
async def payroll_summary_alias(period_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    summary = await _build_period_summary(period, business_id)
    timesheets = await _get_period_timesheets(period, business_id)
    workers_by_id = {w.get("id"): w for w in await _get_payroll_workers(business_id)}
    worker_summaries = []
    for w in summary.get("worker_summaries", []):
        worker_summaries.append({
            **w,
            "worker_id": w.get("worker_id"),
            "name": w.get("worker_name"),
            "email": w.get("worker_email"),
            "role": (workers_by_id.get(w.get("worker_id")) or {}).get("role", "worker"),
            "approved_hours": w.get("approved_hours", 0),
            "pending_hours": w.get("pending_hours", 0),
            "jobs_worked": w.get("jobs_worked", 0),
            "status": w.get("status") or "ready",
        })
    return {
        "period": summary.get("period"),
        "approved_hours": summary.get("total_approved_hours", 0),
        "pending_hours": summary.get("total_pending_hours", 0),
        "pending_review_count": sum(1 for t in timesheets if str(t.get("status") or "").lower() == "pending"),
        "workers_included": summary.get("total_workers", 0),
        "export_status": (summary.get("period") or {}).get("export_status") or "not_exported",
        "adjustments_total": round(sum(_to_float(w.get("adjustments_total"), 0) for w in summary.get("worker_summaries", [])), 2),
        "worker_summaries": worker_summaries,
    }


@api_router.get("/payroll/workers/{worker_id}")
async def payroll_worker_details(worker_id: str, period_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    summary = await _build_period_summary(period, business_id)
    workers = {w["id"]: w for w in await _get_payroll_workers(business_id)}
    worker = workers.get(str(worker_id))
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    detail = next((w for w in summary.get("worker_summaries", []) if str(w.get("worker_id")) == str(worker_id)), None)
    if not detail:
        detail = {"worker_id": worker_id, "approved_hours": 0, "pending_hours": 0, "jobs_worked": 0, "status": "ready"}
    timesheet_entries = [t for t in await _get_period_timesheets(period, business_id) if str(t.get("worker_id")) == str(worker_id)]
    adjustments = []
    async for a in db.payroll_adjustments.find({"business_id": business_id, "period_id": str(period.get("id") or period.get("_id")), "worker_id": str(worker_id)}).sort("created_at", -1):
        a["id"] = str(a.get("_id"))
        a.pop("_id", None)
        adjustments.append(a)
    return {
        "worker": {"id": worker.get("id"), "name": worker.get("name"), "email": worker.get("email"), "role": worker.get("role")},
        "approved_hours": detail.get("approved_hours", 0),
        "pending_hours": detail.get("pending_hours", 0),
        "jobs_worked": detail.get("jobs_worked", 0),
        "timesheet_entries": timesheet_entries,
        "adjustments": adjustments,
        "status": detail.get("status") or "ready",
    }


@api_router.post("/payroll/periods/{period_id}/bulk-approve")
async def payroll_period_bulk_approve(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    if _period_is_readonly(period):
        raise HTTPException(status_code=400, detail="Locked/exported periods are read-only")
    timesheets = await _get_period_timesheets(period, business_id)
    pending_ids = [ObjectId(t.get("entry_id")) for t in timesheets if ObjectId.is_valid(str(t.get("entry_id"))) and str(t.get("status") or "").lower() == "pending"]
    if not pending_ids:
        return {"success": True, "updated": 0, "message": "No pending timesheets found for this period."}
    res = await db.jobs.update_many({"_id": {"$in": pending_ids}, "business_id": business_id}, {"$set": {"payroll_status": "approved", "updated_at": datetime.now(timezone.utc)}})
    return {"success": True, "updated": res.modified_count, "message": f"Approved {res.modified_count} timesheet entries."}


@api_router.post("/payroll/periods/{period_id}/lock")
async def payroll_lock_alias(period_id: str, current_user: dict = Depends(get_current_user)):
    return await payroll_lock_period(period_id, current_user)


@api_router.post("/payroll/periods/{period_id}/mark-exported")
async def payroll_mark_exported_alias(period_id: str, current_user: dict = Depends(get_current_user)):
    return await payroll_mark_exported(period_id, current_user)

@api_router.post("/payroll/periods/{period_id}/unlock")
async def payroll_unlock_alias(period_id: str, current_user: dict = Depends(get_current_user)):
    return await payroll_unlock_period(period_id, current_user)


@api_router.get("/payroll/periods/{period_id}/export/payroll.csv")
async def payroll_export_csv_alias(period_id: str, current_user: dict = Depends(get_current_user)):
    return await payroll_export_csv(period_id, current_user)


@api_router.get("/payroll/periods/{period_id}/export/timesheets.csv")
async def payroll_timesheets_csv_alias(period_id: str, current_user: dict = Depends(get_current_user)):
    return await payroll_timesheets_csv(period_id, current_user)


@api_router.get("/payroll/periods/{period_id}/export/payslips.csv")
async def payroll_payslips_csv_alias(period_id: str, current_user: dict = Depends(get_current_user)):
    return await payroll_payslips_csv(period_id, current_user)


@api_router.get("/payroll/periods/{period_id}/export/payroll-summary.csv")
async def payroll_export_summary_csv_alias(period_id: str, current_user: dict = Depends(get_current_user)):
    return await payroll_export_csv(period_id, current_user)


@api_router.get("/payroll/periods/{period_id}/export/worker-pay.csv")
async def payroll_export_worker_pay_csv_alias(period_id: str, current_user: dict = Depends(get_current_user)):
    return await payroll_worker_pay_csv(period_id, current_user)


@api_router.get("/payroll/periods/{period_id}/export/adjustments.csv")
async def payroll_export_adjustments_csv_alias(period_id: str, current_user: dict = Depends(get_current_user)):
    return await payroll_adjustments_csv(period_id, current_user)


@api_router.get("/payroll/periods/{period_id}/export/payslip-draft.csv")
async def payroll_export_payslip_draft_csv_alias(period_id: str, current_user: dict = Depends(get_current_user)):
    return await payroll_payslips_csv(period_id, current_user)


@api_router.post("/payroll/adjustments")
async def payroll_create_adjustment_alias(payload: dict, current_user: dict = Depends(get_current_user)):
    period_id = str((payload or {}).get("period_id") or "")
    if not period_id:
        raise HTTPException(status_code=400, detail="period_id is required")
    return await payroll_create_adjustment(period_id, payload, current_user)


@api_router.get("/payroll/adjustments")
async def payroll_get_adjustments_alias(period_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    return await payroll_get_adjustments(period_id, current_user)


@api_router.post("/payroll/settings")
async def payroll_settings_post(payload: dict, current_user: dict = Depends(get_current_user)):
    normalized = {
        "country": (payload or {}).get("payroll_method"),
        "tax_mode": (payload or {}).get("rate_mode"),
        "default_tax_rate": _to_float((payload or {}).get("default_rate"), 0),
        "payroll_method": (payload or {}).get("payroll_method"),
        "rate_mode": (payload or {}).get("rate_mode"),
        "default_hourly_rate": _to_float((payload or {}).get("default_rate"), 0),
        "default_pay_frequency": (payload or {}).get("default_pay_frequency") or "fortnightly",
    }
    normalized.update({k: v for k, v in (payload or {}).items() if k not in {"payroll_method", "rate_mode", "default_rate"}})
    return await payroll_patch_settings(normalized, current_user)



# ==========================================================================
# NZ/AU pricing: currency resolution + per-currency Stripe price lookup
# ==========================================================================

# Display prices (what we SHOW to users). Stripe is the source of truth for what
# we actually charge via its price IDs. Keep amounts in parity across NZD/AUD for
# simplicity — users see their local currency code and a sensible number.
PRICING_TABLE = {
    "NZD": {"symbol": "NZ$", "solo": 30, "team": 70, "pro": 110, "enterprise": 240},
    "AUD": {"symbol": "A$",  "solo": 30, "team": 70, "pro": 110, "enterprise": 240},
    "USD": {"symbol": "US$", "solo": 19, "team": 45, "pro": 69,  "enterprise": 149},
    "GBP": {"symbol": "£",   "solo": 15, "team": 35, "pro": 55,  "enterprise": 120},
    "CAD": {"symbol": "CA$", "solo": 25, "team": 60, "pro": 89,  "enterprise": 199},
}

# Per-currency Stripe price IDs. Read from env so different environments map to
# their own Stripe price objects. Any missing variant falls back to the default
# (NZD) price IDs already defined above — so legacy single-currency setups keep working.
def _env_price(var: str, plan: str) -> str:
    """Resolve STRIPE_PRICE_{PLAN}_{CCY} with safe fallback to default."""
    fallback_map = {
        "solo": STRIPE_PRICE_SOLO, "team": STRIPE_PRICE_TEAM,
        "pro": STRIPE_PRICE_PRO, "enterprise": STRIPE_PRICE_ENTERPRISE,
    }
    return os.environ.get(var, "") or fallback_map.get(plan, "")

STRIPE_PRICES_BY_CCY = {
    "NZD": {p: _env_price(f"STRIPE_PRICE_{p.upper()}_NZD", p) for p in ("solo", "team", "pro", "enterprise")},
    "AUD": {p: _env_price(f"STRIPE_PRICE_{p.upper()}_AUD", p) for p in ("solo", "team", "pro", "enterprise")},
    "USD": {p: _env_price(f"STRIPE_PRICE_{p.upper()}_USD", p) for p in ("solo", "team", "pro", "enterprise")},
    "GBP": {p: _env_price(f"STRIPE_PRICE_{p.upper()}_GBP", p) for p in ("solo", "team", "pro", "enterprise")},
    "CAD": {p: _env_price(f"STRIPE_PRICE_{p.upper()}_CAD", p) for p in ("solo", "team", "pro", "enterprise")},
}


def resolve_currency(country: str) -> str:
    """Map a country string → supported currency. Unknown → NZD (primary market)."""
    c = (country or "").strip().lower()
    if not c:
        return "NZD"
    # Normalize common aliases / iso codes
    AU = {"australia", "au", "aus"}
    NZ = {"new zealand", "nz", "aotearoa", "new-zealand", "newzealand"}
    US = {"united states", "usa", "us", "united states of america", "u.s.", "u.s.a."}
    GB = {"united kingdom", "uk", "gb", "great britain", "england", "scotland", "wales", "northern ireland", "britain"}
    CA = {"canada", "ca", "can"}
    if c in AU or c.startswith("australia"): return "AUD"
    if c in NZ or c.startswith("new zealand"): return "NZD"
    if c in US or c.startswith("united states"): return "USD"
    if c in GB or c.startswith("united kingdom") or c.startswith("great britain"): return "GBP"
    if c in CA or c.startswith("canada"): return "CAD"
    return "NZD"


def get_stripe_price_id_for(plan: str, currency: str) -> str:
    """Return the Stripe price ID for {plan, currency} with safe NZD-default fallback."""
    plan = (plan or "solo").lower().strip()
    ccy = (currency or "NZD").upper().strip()
    price_id = (STRIPE_PRICES_BY_CCY.get(ccy) or {}).get(plan) or ""
    if not price_id:
        # Last-resort fallback to original default env vars.
        default_map = {
            "solo": STRIPE_PRICE_SOLO, "team": STRIPE_PRICE_TEAM,
            "pro": STRIPE_PRICE_PRO, "enterprise": STRIPE_PRICE_ENTERPRISE,
        }
        price_id = default_map.get(plan, "") or ""
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Missing Stripe price ID for {plan} ({ccy})")
    return price_id


def resolve_user_country_currency(user: dict, hint_country: str = None):
    """
    Pick the country & currency for a user:
      1. Saved user/business country wins (authoritative once known).
      2. Otherwise use the request hint (from frontend detection).
      3. Otherwise fall back to New Zealand / NZD.
    """
    saved = ""
    if user:
        saved = str(
            user.get("country")
            or user.get("business_country")
            or user.get("region_country")
            or ""
        ).strip()
    if not saved and hint_country:
        saved = str(hint_country).strip()
    if not saved:
        saved = "New Zealand"
    return saved, resolve_currency(saved)


async def set_business_plan_from_checkout(user_id: str, plan: str, stripe_customer_id: str = None, stripe_subscription_id: str = None, currency: str = None, country: str = None):
    plan = (plan or "solo").lower().strip()
    now = datetime.now(timezone.utc)

    user_filters = [
        {"_id": user_id},
        {"id": user_id},
        {"user_id": user_id},
    ]

    try:
        user_filters.insert(0, {"_id": ObjectId(user_id)})
    except Exception:
        pass

    base_update = {
        "plan": plan,
        "plan_status": "paid",
        "subscription_status": "active",
        "updated_at": now,
    }

    if stripe_customer_id:
        base_update["stripe_customer_id"] = stripe_customer_id
    if stripe_subscription_id:
        base_update["stripe_subscription_id"] = stripe_subscription_id
    if currency:
        base_update["currency"] = str(currency).upper().strip()
    if country:
        base_update["country"] = str(country).strip()

    # Find a source user record first so we can reuse email/business_id if available
    source_user = await db.users.find_one({"$or": user_filters})         or await db.app_users.find_one({"$or": user_filters})         or await db.business_users.find_one({"$or": user_filters})

    email = (source_user or {}).get("email")
    business_id = (source_user or {}).get("business_id")

    users_match = {"$or": user_filters}
    app_users_match = {"$or": user_filters}
    business_users_match = {"$or": user_filters}

    if email:
        users_match = {"$or": user_filters + [{"email": email}]}
        app_users_match = {"$or": user_filters + [{"email": email}]}
        business_users_match = {"$or": user_filters + [{"email": email}]}

    users_result = await db.users.update_many(users_match, {"$set": base_update})
    app_users_result = await db.app_users.update_many(app_users_match, {"$set": base_update})
    business_users_result = await db.business_users.update_many(business_users_match, {"$set": base_update})

    # Optional business-level mirror if a business record exists
    business_result = None
    if business_id:
        try:
            business_result = await db.businesses.update_many(
                {"$or": [{"_id": business_id}, {"business_id": business_id}]},
                {"$set": {"plan": plan, "updated_at": now}}
            )
        except Exception:
            business_result = None

    total_matched = (
        getattr(users_result, "matched_count", 0)
        + getattr(app_users_result, "matched_count", 0)
        + getattr(business_users_result, "matched_count", 0)
    )

    print("PLAN SAVE DEBUG", {
        "user_id": user_id,
        "email": email,
        "business_id": str(business_id) if business_id else None,
        "plan": plan,
        "users_matched": getattr(users_result, "matched_count", None),
        "users_modified": getattr(users_result, "modified_count", None),
        "app_users_matched": getattr(app_users_result, "matched_count", None),
        "app_users_modified": getattr(app_users_result, "modified_count", None),
        "business_users_matched": getattr(business_users_result, "matched_count", None),
        "business_users_modified": getattr(business_users_result, "modified_count", None),
        "businesses_matched": getattr(business_result, "matched_count", None) if business_result else None,
        "businesses_modified": getattr(business_result, "modified_count", None) if business_result else None,
        "stripe_customer_id": stripe_customer_id,
        "stripe_subscription_id": stripe_subscription_id,
    })

    if total_matched == 0:
        raise HTTPException(status_code=404, detail=f"Could not find user to update for checkout plan save: {user_id}")

    return True



@api_router.get("/stripe/checkout-success")
async def stripe_checkout_success(session_id: str):
    if not session_id or not STRIPE_SECRET_KEY:
        return RedirectResponse(url=f"{FRONTEND_URL}/plans?checkout=cancelled")

    stripe.api_key = STRIPE_SECRET_KEY

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        metadata = getattr(session, "metadata", {}) or {}
        user_id = str(metadata.get("user_id") or "")
        plan = str(normalize_plan(metadata.get("plan") or "solo")).lower().strip()
        currency_meta = str(metadata.get("currency") or "").upper().strip() or None
        country_meta = str(metadata.get("country") or "").strip() or None
        stripe_customer_id = getattr(session, "customer", None)
        stripe_subscription_id = getattr(session, "subscription", None)

        print("BACKEND RETURN DEBUG", {
            "session_id": session_id,
            "user_id": user_id,
            "plan": plan,
            "currency": currency_meta,
            "country": country_meta,
            "stripe_customer_id": str(stripe_customer_id) if stripe_customer_id else None,
            "stripe_subscription_id": str(stripe_subscription_id) if stripe_subscription_id else None,
        })

        if user_id and plan in {"solo", "team", "pro", "enterprise"}:
            await set_business_plan_from_checkout(
                user_id,
                plan,
                str(stripe_customer_id) if stripe_customer_id else None,
                str(stripe_subscription_id) if stripe_subscription_id else None,
                currency=currency_meta,
                country=country_meta,
            )
            # Send users INTO the app (dashboard) after a successful paid checkout,
            # not back onto the billing page. Include the session_id so the frontend
            # can idempotently confirm/refresh plan state.
            return RedirectResponse(
                url=f"{FRONTEND_URL}/dashboard?checkout=success&plan={plan}&session_id={session_id}"
            )

        return RedirectResponse(url=f"{FRONTEND_URL}/plans?checkout=cancelled")
    except Exception as e:
        print("BACKEND RETURN ERROR", repr(e))
        return RedirectResponse(url=f"{FRONTEND_URL}/plans?checkout=cancelled")


@api_router.post("/stripe/create-checkout-session")
async def create_checkout_session(payload: dict, current_user: dict = Depends(get_current_user)):
    plan = (payload.get("plan_type") or "solo").lower()

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe secret key is missing on the server")

    # Resolve country & currency with the correct source-of-truth order:
    # saved user/business > request hint > safe NZ default.
    hint_country = str((payload or {}).get("country") or "").strip()
    country, currency = resolve_user_country_currency(current_user, hint_country=hint_country)
    price_id = (get_stripe_price_id_for(plan, currency) or "").strip()
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Missing Stripe price ID for {plan} ({currency})")

    stripe.api_key = STRIPE_SECRET_KEY

    user_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )
    if not user_id:
        raise HTTPException(status_code=401, detail="Authenticated user id missing")
    email = current_user.get("email", "")
    success_url = f"{BACKEND_PUBLIC_URL}/api/stripe/checkout-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{FRONTEND_URL}/plans?checkout=cancelled&plan={plan}"

    try:
        print("CHECKOUT DEBUG START", {
            "plan": plan,
            "price_id": price_id,
            "currency": currency,
            "country": country,
            "user_id": user_id,
            "email": email,
            "success_url": success_url,
            "cancel_url": cancel_url,
        })

        checkout_kwargs = {
            "mode": "subscription",
            "payment_method_collection": "if_required",
            "customer_email": email,
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {
                "user_id": user_id,
                "plan": plan,
                "currency": currency,
                "country": country,
            },
        }

        trial_end_value = current_user.get("trial_ends_at")
        subscription_data = {}

        if (
            current_user.get("subscription_status") == "trialing"
            or current_user.get("plan_status") == "trialing"
            or current_user.get("trial_active") is True
        ):
            trial_end_ts = None

            if trial_end_value:
                try:
                    if hasattr(trial_end_value, "timestamp"):
                        trial_end_ts = int(trial_end_value.timestamp())
                    else:
                        parsed = datetime.fromisoformat(str(trial_end_value).replace("Z", "+00:00"))
                        trial_end_ts = int(parsed.timestamp())
                except Exception:
                    trial_end_ts = None

            if trial_end_ts and trial_end_ts > int(datetime.now(timezone.utc).timestamp()):
                subscription_data["trial_end"] = trial_end_ts
            else:
                subscription_data["trial_period_days"] = 14

        subscription_data.setdefault(
            "trial_settings",
            {"end_behavior": {"missing_payment_method": "cancel"}}
        )

        if subscription_data:
            checkout_kwargs["subscription_data"] = subscription_data

        session = stripe.checkout.Session.create(**checkout_kwargs)

        print("CHECKOUT DEBUG SESSION URL", getattr(session, "url", None))

        if not getattr(session, "url", None):
            raise HTTPException(status_code=500, detail="Stripe session created without a checkout URL")

        return {"checkout_url": session.url}
    except HTTPException:
        raise
    except Exception as e:
        print("CHECKOUT DEBUG ERROR", repr(e))
        raise HTTPException(status_code=500, detail=f"Stripe checkout failed: {str(e)}")

# ===================== AUTH ENDPOINTS =====================
@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    email = user_data.email.lower()

    existing = await db.users.find_one({"email": email})
    if existing:
        if not existing.get("email_verified", False) and not existing.get("is_platform_owner", False):
            raise HTTPException(status_code=403, detail="Email not verified. Please check your inbox.")
        raise HTTPException(status_code=400, detail="Email already registered")

    now = datetime.now(timezone.utc)
    user_doc = {
        "email": email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "business_name": user_data.business_name,
        "role": "employer",
        "status": "active",
        "is_active": True,
        "plan": None,
        "email_verified": False,
        "email_verification_token": secrets.token_urlsafe(32),
        "email_verification_sent_at": now,
        "plan_status": "pending",
        "subscription_status": "pending",
        "gst_rate": DEFAULT_GST_RATE,
        "onboarding_completed": False,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    await db.users.update_one(
        {"_id": result.inserted_id},
        {"$set": {"business_id": result.inserted_id}}
    )

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    # Send verification email (non-blocking failure)
    try:
        verify_token = user_doc["email_verification_token"]
        verify_link = f"{FRONTEND_URL}/verify-email?token={verify_token}"
        v_subject, v_html = build_verification_email(user_doc.get("name") or "", verify_link)
        await send_email(to_email=email, subject=v_subject, html_content=v_html)
        print(f"VERIFICATION_EMAIL_SENT to={email}")
    except Exception as e:
        print(f"VERIFICATION_EMAIL_ERROR to={email} error={repr(e)}")

    user_doc["business_id"] = user_id
    return build_user_response(user_doc, user_id, access_token)

@api_router.post("/auth/login")

async def login(user_data: UserLogin, response: Response, request: Request):
    email = user_data.email.lower()
    identifier = f"{request.client.host}:{email}"

    # Check brute force
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_time = attempt.get("locked_until")
        await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email})

    password_ok = False
    if user:
        stored_hash = user.get("password_hash")
        if isinstance(stored_hash, str) and stored_hash.strip():
            try:
                password_ok = verify_password(user_data.password, stored_hash)
            except Exception:
                password_ok = False

    if not user or not password_ok:
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Block invited users who haven't completed setup
    if user.get("status") == "invited":
        raise HTTPException(status_code=403, detail="Please complete your account setup using the invite link sent to your email.")

    await db.login_attempts.delete_one({"identifier": identifier})

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return build_user_response(user, user_id, access_token)

@api_router.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return build_user_response(user, user["id"])


def _safe_ai_fallback(surface: str, prompt: str = "") -> str:
    prompt = (prompt or "").strip()
    base = f"Draft requested for {surface.replace('_', ' ')}."
    if surface == "smart_hub":
        return f"{base}\n\nDaily summary:\n- Review today’s active jobs and overdue invoices.\n- Send two polite follow-ups: one quote, one invoice.\n- Confirm tomorrow’s crew assignments.\n\nSuggested message:\nHi {{client_name}}, just a quick follow-up from {{business_name}} regarding {{item}}. Let me know if you’d like me to confirm next steps."
    if surface == "jobs":
        return f"{base}\n\nJob update draft:\nHi {{client_name}}, quick update on your job: {{job_title}} is progressing as planned. Next step is {{next_step}} on {{date}}. Reply here if you have any questions."
    if surface == "clients":
        return f"{base}\n\nClient follow-up draft:\nHi {{client_name}}, just checking in from {{business_name}}. We can help with your next service whenever you’re ready. Would you like me to book a time this week?"
    if surface == "quotes":
        return f"{base}\n\nQuote follow-up draft:\nHi {{client_name}}, following up on quote {{quote_number}}. If you’d like any changes or want to proceed, I can update it today."
    if surface == "invoices":
        return f"{base}\n\nPayment reminder draft:\nHi {{client_name}}, friendly reminder that invoice {{invoice_number}} is still open. Please let us know if you need a copy or have any questions."
    if surface == "automation":
        return "Automation suggestions:\n1) Trigger reminder 3 days before quote expiry.\n2) Trigger payment reminder 7 days after invoice due date.\n3) Trigger internal alert for unassigned jobs each morning.\n\nNo rules have been enabled."
    if surface == "onboarding":
        return "Onboarding setup draft:\n- Create first client and first job template.\n- Set invoice defaults and payment terms.\n- Invite first team member.\n- Add optional automation reminders.\n- Connect MYOB later if needed."
    return f"{base}\n\n{prompt or 'Please review this draft before sending.'}"


@api_router.get("/onboarding/status")
async def onboarding_status(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    user_doc = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    business_doc = (
        await db.businesses.find_one({"_id": ObjectId(business_id)})
        if ObjectId.is_valid(business_id)
        else await db.businesses.find_one({"id": str(business_id)})
    )
    onboarding_data = (
        (user_doc or {}).get("onboarding_answers")
        or (business_doc or {}).get("onboarding_answers")
        or {}
    )
    completed = bool(
        (user_doc or {}).get("onboarding_completed", False)
        or (business_doc or {}).get("onboarding_completed", False)
    )
    return {"success": True, "onboarding_completed": completed, "onboarding_data": onboarding_data}


@api_router.post("/onboarding/save")
async def onboarding_save(payload: dict, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    allowed = {
        "business_name": payload.get("business_name"),
        "industry": payload.get("industry"),
        "region": payload.get("region"),
        "team_size": payload.get("team_size"),
        "uses_myob": bool(payload.get("uses_myob", False)),
        "sms_later": bool(payload.get("sms_later", False)),
    }
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"onboarding_answers": allowed, "updated_at": now}}
    )
    business_filter_query = (
        {"_id": ObjectId(business_id)}
        if ObjectId.is_valid(business_id)
        else {"id": str(business_id)}
    )
    await db.businesses.update_one(
        business_filter_query,
        {"$set": {"onboarding_answers": allowed, "updated_at": now}}
    )
    return {"success": True}


@api_router.post("/onboarding/complete")
async def onboarding_complete(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"onboarding_completed": True, "onboarding_completed_at": now, "updated_at": now}}
    )
    business_filter_query = (
        {"_id": ObjectId(business_id)}
        if ObjectId.is_valid(business_id)
        else {"id": str(business_id)}
    )
    await db.businesses.update_one(
        business_filter_query,
        {"$set": {"onboarding_completed": True, "onboarding_completed_at": now, "updated_at": now}}
    )
    return {"success": True, "onboarding_completed": True}


async def _collect_ai_context(current_user: dict, surface: str, incoming_context: dict):
    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role") or "").lower()
    base_query = {"business_id": business_id}
    jobs_q = dict(base_query)
    if role == "worker":
        jobs_q["assigned_worker_id"] = str(current_user.get("id"))
    jobs = [serialize_doc(j) async for j in db.jobs.find(jobs_q).sort("created_at", -1).limit(10)]
    clients = [serialize_doc(c) async for c in db.clients.find(base_query).sort("created_at", -1).limit(10)]
    quotes = [serialize_doc(q) async for q in db.quotes.find(base_query).sort("created_at", -1).limit(10)]
    invoices = [serialize_doc(i) async for i in db.invoices.find(base_query).sort("created_at", -1).limit(10)]
    workers = [serialize_doc(w) async for w in db.business_users.find(base_query).sort("created_at", -1).limit(10)]
    return {"surface": surface, "jobs": jobs, "clients": clients, "quotes": quotes, "invoices": invoices, "workers": workers, "context": incoming_context or {}}


async def _call_openai(prompt: str, system: str) -> str:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return ""
    payload = {"model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"), "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}], "temperature": 0.2}
    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=json.dumps(payload).encode("utf-8"), headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, method="POST")
    def _go():
        with urllib.request.urlopen(req, timeout=20) as r:
            body = json.loads(r.read().decode("utf-8"))
            return (((body.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()
    return await asyncio.to_thread(_go)


@api_router.post("/ai/generate-draft")
async def ai_generate_draft(payload: dict, current_user: dict = Depends(get_current_user)):
    surface = str(payload.get("surface") or "smart_hub")
    prompt = str(payload.get("prompt") or "").strip()[:800]
    context = payload.get("context") or {}
    llm_available = bool(os.getenv("OPENAI_API_KEY"))
    safe_context = await _collect_ai_context(current_user, surface, context)
    surface_rules = {
        "smart_hub": "Return: concise daily summary, urgent actions, and one follow-up draft.",
        "jobs": "Return: concise job summary, next actions, and customer update draft.",
        "clients": "Return: concise client activity summary and follow-up draft.",
        "quotes": "Return: concise quote follow-up draft and suggested action.",
        "invoices": "Return: polite payment reminder and concise unpaid invoice summary.",
        "automation": "Return: safe automation ideas and draft descriptions only; never enable anything.",
        "onboarding": "Return: concise setup checklist and first-step recommendations.",
    }
    worker_guard = ""
    if str((current_user or {}).get("role") or "") == "worker":
        worker_guard = "Worker-safe mode: do not include pricing, invoice totals, payroll, admin-only data, or owner-only GPS evidence."

    system = (
        "You are Churvox AI Business Assistant for tradie/service businesses. "
        "Keep responses concise by default (about 120-220 words unless user asks for detail). "
        "Use clean plain text with short sections and bullets. Avoid markdown clutter, horizontal rules, or loud formatting. "
        "Approval-first: never claim anything was sent, changed, or enabled. Never auto-send. "
        "Never provide legal, tax, payroll, or compliance decisions. Never expose internal IDs unless directly useful. "
        f"Surface instruction: {surface_rules.get(surface, 'Return a concise practical draft.')}. "
        f"{worker_guard}"
    )
    user_prompt = f"Surface: {surface}\nRequest: {prompt or 'Generate a concise helpful draft unless detailed output is requested.'}\nBusiness snapshot: {json.dumps(safe_context, default=str)[:4500]}"
    draft = ""
    if llm_available:
        try:
            draft = await _call_openai(user_prompt, system)
        except Exception as e:
            print(f"AI_PROVIDER_ERROR: {type(e).__name__}")
    if not draft:
        draft = _safe_ai_fallback(surface, prompt)
        llm_available = False
    return {"success": True, "draft": draft, "suggested_actions": [], "approval_required": True, "llm_available": llm_available}


def _ai_risk_level(action_type: str) -> str:
    return "high" if action_type in {"invoice_reminder", "quote_follow_up", "create_invoice_draft"} else "medium"


def _owner_roles_only(role: str):
    if role not in {"owner", "employer", "admin", "manager", "office_admin", "platform_owner"}:
        raise HTTPException(status_code=403, detail="AI Operator is restricted to owner/manager roles")


AI_CUSTOMER_UPDATE_TYPES = {"job_scheduled", "worker_on_way", "job_started", "job_paused", "job_resumed", "job_completed", "proof_ready", "invoice_ready"}
AI_AUTO_SEND_DEFAULTS = {
    "ai_auto_send_enabled": False,
    "job_reminder_auto_send": False,
    "on_the_way_auto_send": False,
    "job_completed_update_auto_send": False,
    "quote_followup_auto_send": False,
    "invoice_reminder_auto_send": False,
    "booking_confirmation_auto_send": False,
    "internal_team_notification_auto_send": False,
}
AI_MESSAGE_TYPE_TO_TOGGLE = {
    "job_reminder": "job_reminder_auto_send",
    "on_the_way": "on_the_way_auto_send",
    "job_completed_update": "job_completed_update_auto_send",
    "quote_followup": "quote_followup_auto_send",
    "invoice_reminder": "invoice_reminder_auto_send",
    "booking_confirmation": "booking_confirmation_auto_send",
    "internal_team_notification": "internal_team_notification_auto_send",
}
AI_BLOCKED_MESSAGE_TYPES = {"legal_advice", "tax_advice", "payroll_decision", "myob_write", "payment_charge", "price_change", "delete_record", "cancellation_notice"}


async def _prepare_customer_update_for_job(job: dict, business_id: str, event_type: str, preferred_channel: str = "copy"):
    et = str(event_type or "").strip().lower()
    if et not in AI_CUSTOMER_UPDATE_TYPES:
        return None
    job_id = str(job.get("id") or job.get("_id") or "")
    if not job_id:
        return None
    now = datetime.now(timezone.utc)
    action_key = f"customer_update:{job_id}:{et}"
    existing = await db.customer_update_events.find_one({"business_id": business_id, "job_id": job_id, "type": et, "status": {"$in": ["draft", "approved", "sent"]}})
    if existing:
        return serialize_doc(existing)
    client_name = str(job.get("client_name") or job.get("customer_name") or "there").strip() or "there"
    address = str(job.get("address") or "").strip()
    when = str(job.get("scheduled_time") or job.get("scheduled_date") or "").strip()
    templates = {
        "job_scheduled": f"Hi {client_name}, your job has been scheduled{f' for {when}' if when else ''}. We'll keep you updated.",
        "worker_on_way": f"Hi {client_name}, your worker is on the way to {address or 'your property'}.",
        "job_started": f"Hi {client_name}, your job has now started at {address or 'your property'}.",
        "job_paused": f"Hi {client_name}, your job is currently paused. We'll update you once it resumes.",
        "job_resumed": f"Hi {client_name}, your job has resumed.",
        "job_completed": f"Hi {client_name}, your job has been completed. We'll share proof and invoice updates shortly.",
        "proof_ready": f"Hi {client_name}, your job proof is ready to review.",
        "invoice_ready": f"Hi {client_name}, your invoice is now ready.",
    }
    doc = {"business_id": business_id, "job_id": job_id, "client_id": str(job.get("client_id") or ""), "type": et, "message": templates.get(et, ""), "channel": preferred_channel if preferred_channel in {"email", "sms", "copy"} else "copy", "status": "draft", "public_token": secrets.token_urlsafe(16), "error": None, "created_at": now, "updated_at": now}
    ins = await db.customer_update_events.insert_one(doc)
    await upsert_ai_operator_action(business_id, action_key, "customer_update_approval", f"Customer update ready: {et.replace('_', ' ')}", "Review and approve customer-safe update draft.", f"Type: {et}", "Approving marks this message ready to send/copy. No auto-send by default.", "job", job_id, payload={"update_event_id": str(ins.inserted_id), "job_id": job_id, "type": et, "message": doc["message"]}, client_id=doc["client_id"], editable_fields=["message", "channel"])
    return {"id": str(ins.inserted_id), **doc}


def _operator_group_for_type(action_type: str) -> str:
    return {
        "missing_price": "needs_decision",
        "missing_contact": "needs_decision",
        "client_cleanup": "needs_decision",
        "schedule_conflict": "needs_decision",
        "crew_workload": "watching",
        "assign_worker": "ready",
        "create_invoice_draft": "ready",
        "invoice_reminder": "drafts",
        "quote_follow_up": "drafts",
        "today_plan": "watching",
        "payroll_review": "watching",
    }.get(str(action_type or ""), "watching")


def _operator_risk_for_type(action_type: str) -> str:
    return {
        "missing_price": "high",
        "missing_contact": "medium",
        "client_cleanup": "low",
        "schedule_conflict": "high",
        "crew_workload": "medium",
        "assign_worker": "medium",
        "create_invoice_draft": "medium",
        "invoice_reminder": "low",
        "quote_follow_up": "low",
        "today_plan": "low",
        "payroll_review": "medium",
    }.get(str(action_type or ""), "medium")




def _ai_operator_priority(action: dict) -> tuple[int, str]:
    t = str(action.get("action_type") or action.get("type") or "")
    payload = action.get("payload") or {}
    risk = str(action.get("risk") or "medium")
    score = 20
    reasons = []
    if risk == "high":
        score += 45; reasons.append("High-risk owner decision required")
    if t == "assign_worker":
        score += 35; reasons.append("Unassigned job needs crew")
    if t == "create_invoice_draft":
        score += 30; reasons.append("Money waiting for invoice")
    if t == "invoice_reminder":
        score += 25; reasons.append("Overdue/open invoice follow-up")
    if t == "quote_follow_up":
        score += 20; reasons.append("Quote follow-up can unlock revenue")
    if t in {"missing_price", "missing_contact"}:
        score += 18; reasons.append("Missing required data blocks progress")
    if t in {"schedule_conflict", "crew_workload"}:
        score += 22; reasons.append("Schedule or crew pressure")
    if payload.get("due_today"):
        score += 20; reasons.append("Due today")
    return min(100, score), "; ".join(reasons[:2]) or "General AI operator priority"


async def execute_ai_operator_action(action: dict, current_user: dict):
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    payload = action.get("payload") or action.get("draft_payload") or {}
    item_type = str(action.get("action_type") or action.get("type") or "")
    result = {"action": "none"}
    completed = False
    if item_type == "assign_worker":
        job_id = str(payload.get("job_id") or action.get("job_id") or action.get("related_id") or action.get("related_entity_id") or "")
        worker_id = str(payload.get("worker_id") or payload.get("recommended_worker_id") or action.get("worker_id") or "")
        if not job_id or not worker_id: raise HTTPException(status_code=400, detail="Missing job_id or worker_id")
        job = await db.jobs.find_one({"business_id": business_id, "$or": [{"id": job_id}, {"_id": ObjectId(job_id)}] if ObjectId.is_valid(job_id) else [{"id": job_id}]})
        worker = await db.business_users.find_one({"business_id": business_id, "$or": [{"id": worker_id}, {"_id": ObjectId(worker_id)}] if ObjectId.is_valid(worker_id) else [{"id": worker_id}]})
        if not job or not worker: raise HTTPException(status_code=404, detail="Job or worker not found")
        patch={"assigned_worker_id": worker_id, "worker_id": worker_id, "assigned_worker_name": str(worker.get("name") or ""), "updated_at": now}
        if str(job.get("status") or "").lower() in {"new","unassigned","pending"}: patch["status"]="assigned"
        await db.jobs.update_one({"_id": job["_id"]},{"$set": patch}); completed=True; result={"action":"assigned_worker","job_id":job_id,"assigned_worker_id":worker_id}
    elif item_type in {"create_invoice_draft", "invoice_draft"}:
        job_id = str(payload.get("job_id") or action.get("job_id") or action.get("related_id") or action.get("related_entity_id") or "")
        job = await db.jobs.find_one({"business_id": business_id, "$or": [{"id": job_id}, {"_id": ObjectId(job_id)}] if ObjectId.is_valid(job_id) else [{"id": job_id}]})
        if not job: raise HTTPException(status_code=404, detail="Job not found")
        # CHURVOX_AI_OPERATOR_INVOICE_APPROVE_AMOUNT_FIX
        subtotal=float(payload.get("subtotal") or payload.get("amount") or payload.get("total") or job.get("subtotal") or job.get("price") or job.get("job_price") or job.get("fixed_price") or job.get("total_price") or job.get("total") or job.get("amount") or 0)
        if subtotal<=0: raise HTTPException(status_code=400, detail="Invoice was not created because job has no price.")
        existing = await db.invoices.find_one({"business_id": business_id, "$or": [{"job_id": job_id},{"source_job_id":job_id},{"linked_job_id":job_id}]})
        if existing: result={"action":"duplicate_prevented_existing_invoice","invoice_id":str(existing.get("_id"))}; completed=True
        else:
            gst_rate=float(payload.get("gst_rate") or 0.15); gst_amount=round(subtotal*gst_rate,2); total=round(subtotal+gst_amount,2)
            inv={"business_id":business_id,"job_id":job_id,"source_job_id":job_id,"linked_job_id":job_id,"client_id":str(payload.get("client_id") or job.get("client_id") or ""),"description":str(payload.get("description") or ""),"subtotal":subtotal,"gst_rate":gst_rate,"gst_amount":gst_amount,"total":total,"status":"draft","source":"ai_operator","created_at":now,"updated_at":now}
            ins=await db.invoices.insert_one(inv); iid=str(ins.inserted_id)
            await db.jobs.update_one({"_id":job["_id"]},{"$set":{"invoice_id":iid,"draft_invoice_id":iid,"invoice_created":True,"invoice_status":"draft","updated_at":now}})
            result={"action":"invoice_draft_created","invoice_id":iid,"job_id":job_id}; completed=True
    else:
        result={"action":"prepared_for_review","status":"draft_only"}
    return completed, result
def _safe_action_doc(business_id: str, item: dict, now: datetime) -> dict:
    return {
        "business_id": business_id,
        "type": str(item.get("type") or "general"),
        "status": str(item.get("status") or "pending"),
        "risk_level": str(item.get("risk_level") or "medium"),
        "related_entity_type": item.get("related_entity_type"),
        "related_entity_id": item.get("related_entity_id"),
        "title": item.get("title") or "AI prepared action",
        "summary": item.get("summary") or "Prepared for approval",
        "reason": item.get("reason") or "",
        "recommendation": item.get("recommendation") or "",
        "draft_payload": item.get("draft_payload") or {},
        "generated_message": item.get("generated_message") or "",
        "proposed_changes": item.get("proposed_changes") or {},
        "owner_notes": item.get("owner_notes") or "",
        "created_by": "ai",
        "approved_by": None,
        "approved_at": None,
        "dismissed_at": None,
        "completed_at": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
    }


async def _insert_operator_action_if_missing(action_doc: dict):
    dup = await db.ai_operator_actions.find_one({
        "business_id": action_doc["business_id"],
        "type": action_doc["type"],
        "related_entity_type": action_doc.get("related_entity_type"),
        "related_entity_id": action_doc.get("related_entity_id"),
        "status": "pending",
    })
    if dup:
        return None
    inserted = await db.ai_operator_actions.insert_one(action_doc)
    await db.ai_operator_logs.insert_one({
        "business_id": action_doc["business_id"],
        "action_id": str(inserted.inserted_id),
        "event_type": "created",
        "message": action_doc.get("title") or "AI action created",
        "user_id": "ai",
        "created_at": datetime.now(timezone.utc),
    })
    return str(inserted.inserted_id)



# ===== AI CONTROL ENGINE =====
AI_CONTROL_ALLOWED_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "platform_owner"}


def _control_role_guard(role: str):
    role = str(role or "").lower()
    if role not in AI_CONTROL_ALLOWED_ROLES or role in {"worker", "payroll"}:
        raise HTTPException(status_code=403, detail="AI Control Engine is restricted to owner roles")


def _priority_rank(priority: str) -> int:
    return {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(str(priority or "medium"), 2)


async def _control_log(business_id: str, action_id: str | None, run_id: str | None, event_type: str, message: str, user_id: str = "ai"):
    await db.ai_control_logs.insert_one({"business_id": business_id, "action_id": action_id, "run_id": run_id, "event_type": event_type, "message": message, "user_id": user_id, "created_at": datetime.now(timezone.utc)})


async def _create_control_action_if_missing(business_id: str, item: dict, now: datetime, run_id: str | None = None):
    dup = await db.ai_control_actions.find_one({"business_id": business_id, "type": item.get("type"), "related_entity_type": item.get("related_entity_type"), "related_entity_id": item.get("related_entity_id"), "status": "pending"})
    if dup:
        return None
    doc = {
        "business_id": business_id, "type": item.get("type"), "status": "pending", "priority": item.get("priority", "medium"), "risk_level": item.get("risk_level", "medium"),
        "related_entity_type": item.get("related_entity_type"), "related_entity_id": item.get("related_entity_id"), "title": item.get("title"), "summary": item.get("summary", "Prepared for approval"),
        "reason": item.get("reason", ""), "recommendation": item.get("recommendation", ""), "owner_facing_explanation": item.get("owner_facing_explanation", ""),
        "draft_payload": item.get("draft_payload", {}), "generated_message": item.get("generated_message", ""), "proposed_changes": item.get("proposed_changes", {}), "execution_plan": item.get("execution_plan", {}),
        "requires_owner_approval": True, "can_execute_after_approval": bool(item.get("can_execute_after_approval", True)), "blocked_reason": item.get("blocked_reason"), "created_by": "ai",
        "approved_by": None, "approved_at": None, "dismissed_at": None, "completed_at": None, "failed_at": None, "error": None, "created_at": now, "updated_at": now
    }
    res = await db.ai_control_actions.insert_one(doc)
    aid = str(res.inserted_id)
    await _control_log(business_id, aid, run_id, "action_created", doc.get("title") or "Action created")
    return aid


async def _run_control_scan(current_user: dict):
    role = str(current_user.get("role") or "").lower()
    _control_role_guard(role)
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    run = {"business_id": business_id, "status": "running", "started_at": now, "completed_at": None, "created_actions_count": 0, "skipped_duplicates_count": 0, "summary": "", "error": None}
    run_res = await db.ai_control_runs.insert_one(run)
    run_id = str(run_res.inserted_id)
    await _control_log(business_id, None, run_id, "scan_started", "Scan started")
    jobs = [serialize_doc(j) async for j in db.jobs.find({"business_id": business_id}).limit(200)]
    quotes = [serialize_doc(q) async for q in db.quotes.find({"business_id": business_id}).limit(200)]
    invoices = [serialize_doc(i) async for i in db.invoices.find({"business_id": business_id}).limit(200)]
    clients = [serialize_doc(c) async for c in db.clients.find({"business_id": business_id}).limit(200)]
    workers = [serialize_doc(w) async for w in db.business_users.find({"business_id": business_id, "role": {"$in": ["worker", "manager", "office_admin"]}}).limit(120)]

    items=[]
    overdue=[i for i in invoices if str(i.get("status") or "").lower()=="overdue"]
    for inv in overdue[:10]:
        items.append({"type":"invoice_reminder","priority":"critical","risk_level":"high","related_entity_type":"invoice","related_entity_id":str(inv.get("id") or inv.get("_id")),"title":"Draft overdue invoice reminder","reason":"Invoice is overdue.","recommendation":"Review then send reminder.","owner_facing_explanation":"High priority due to overdue cashflow.","generated_message":f"Reminder: invoice {inv.get('number') or inv.get('id')} is overdue.","can_execute_after_approval":False})
    unassigned_today=[j for j in jobs if not (j.get("assigned_worker_id") or j.get("worker_id"))]
    for job in unassigned_today[:12]:
        sw = workers[0] if workers else None
        items.append({"type":"assign_worker","priority":"high","risk_level":"medium","related_entity_type":"job","related_entity_id":str(job.get("id") or job.get("_id")),"title":"Assign worker to job","reason":"Job has no worker assigned.","recommendation":"Assign recommended worker.","owner_facing_explanation":"High priority because job is unassigned.","draft_payload":{"job_id":str(job.get("id") or job.get("_id")),"suggested_worker_id":str(sw.get('id') or sw.get('_id')) if sw else None},"can_execute_after_approval":True,"blocked_reason":None if sw else "Needs manual selection"})
    completed=[j for j in jobs if str(j.get("status") or "").lower()=="completed"]
    for job in completed[:10]:
        items.append({"type":"create_invoice_draft","priority":"high","risk_level":"medium","related_entity_type":"job","related_entity_id":str(job.get("id") or job.get("_id")),"title":"AI prepared an invoice description from the completed job.","reason":"Completed job is ready to invoice.","recommendation":"Create draft invoice only.","owner_facing_explanation":"High priority because completed jobs should be billed quickly.","draft_payload":{"job_id":str(job.get("id") or job.get("_id")),"client_id":str(job.get("client_id") or ""),"line_items":[{"description":job.get("title") or "Service","amount":float(job.get("price") or 0)}]},"can_execute_after_approval":True})
    waiting_quotes=[q for q in quotes if str(q.get("status") or "").lower() in {"waiting","pending","sent"}]
    for q in waiting_quotes[:8]:
        items.append({"type":"quote_follow_up","priority":"medium","risk_level":"high","related_entity_type":"quote","related_entity_id":str(q.get("id") or q.get("_id")),"title":"Draft quote follow-up","reason":"Quote is waiting for response.","recommendation":"Review and save follow-up draft.","owner_facing_explanation":"Medium priority to improve conversion.","generated_message":f"Hi, following up on quote {q.get('number') or q.get('id')}.","can_execute_after_approval":False})
    for c in [x for x in clients if not x.get("email") or not x.get("phone")][:8]:
        items.append({"type":"missing_business_data","priority":"low","risk_level":"low","related_entity_type":"client","related_entity_id":str(c.get("id") or c.get("_id")),"title":"Client details incomplete","reason":"Missing contact info can block reminders.","recommendation":"Open client edit and update details.","owner_facing_explanation":"Low risk cleanup task.","can_execute_after_approval":False})

    created=0; skipped=0
    for it in sorted(items,key=lambda x:_priority_rank(x.get("priority"))):
        aid = await _create_control_action_if_missing(business_id,it,now,run_id)
        if aid: created += 1
        else: skipped += 1
    await db.ai_control_runs.update_one({"_id":ObjectId(run_id)},{"$set":{"status":"completed","completed_at":datetime.now(timezone.utc),"created_actions_count":created,"skipped_duplicates_count":skipped,"summary":f"Created {created} actions, skipped {skipped} duplicates."}})
    await db.ai_control_logs.insert_one({"business_id":business_id,"action_id":None,"run_id":run_id,"event_type":"scan_completed","message":"Scan completed","user_id":"ai","created_at":datetime.now(timezone.utc)})
    return {"success":True,"run_id":run_id,"created_actions_count":created,"skipped_duplicates_count":skipped}


@api_router.get("/ai/control/status")
async def ai_control_status(current_user: dict = Depends(get_current_user)):
    _control_role_guard(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    pending_count = await db.ai_control_actions.count_documents({"business_id": business_id, "status": "pending"})
    last_run = await db.ai_control_runs.find_one({"business_id": business_id}, sort=[("started_at", -1)]) or {}
    return {"success": True, "status": "needs_approval" if pending_count else "ready", "pending_count": pending_count, "last_scan_at": last_run.get("started_at")}

@api_router.post("/ai/control/run-scan")
async def ai_control_run_scan(current_user: dict = Depends(get_current_user)):
    return await _run_control_scan(current_user)

@api_router.get("/ai/control/actions")
async def ai_control_actions(current_user: dict = Depends(get_current_user)):
    _control_role_guard(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    rows = [serialize_doc(r) async for r in db.ai_control_actions.find({"business_id": business_id}).sort([("status",1),("created_at",-1)]).limit(200)]
    rows.sort(key=lambda a: (_priority_rank(a.get("priority")), a.get("status") != "pending"))
    return {"success": True, "data": rows}

@api_router.get("/ai/control/actions/{action_id}")
async def ai_control_action(action_id: str, current_user: dict = Depends(get_current_user)):
    _control_role_guard(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    row = await db.ai_control_actions.find_one({"_id": ObjectId(action_id), "business_id": business_id})
    if not row: raise HTTPException(status_code=404, detail="Action not found")
    return {"success": True, "data": serialize_doc(row)}

@api_router.post("/ai/control/actions/{action_id}/edit")
async def ai_control_edit(action_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    _control_role_guard(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    await db.ai_control_actions.update_one({"_id": ObjectId(action_id), "business_id": business_id}, {"$set": {"generated_message": str((payload or {}).get("generated_message") or ""), "proposed_changes": (payload or {}).get("proposed_changes") or {}, "status": "edited", "updated_at": now}})
    await _control_log(business_id, action_id, None, "action_edited", "Action edited", str(current_user.get("id") or ""))
    return {"success": True}

@api_router.post("/ai/control/actions/{action_id}/approve")
async def ai_control_approve(action_id: str, current_user: dict = Depends(get_current_user)):
    _control_role_guard(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    await db.ai_control_actions.update_one({"_id": ObjectId(action_id), "business_id": business_id}, {"$set": {"status": "approved", "approved_by": str(current_user.get("id") or ""), "approved_at": now, "updated_at": now}})
    await _control_log(business_id, action_id, None, "action_approved", "Action approved", str(current_user.get("id") or ""))
    return {"success": True}

@api_router.post("/ai/control/actions/{action_id}/execute")
async def ai_control_execute(action_id: str, payload: dict = None, current_user: dict = Depends(get_current_user)):
    _control_role_guard(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    row = await db.ai_control_actions.find_one({"_id": ObjectId(action_id), "business_id": business_id})
    if not row: raise HTTPException(status_code=404, detail="Action not found")
    if row.get("status") not in {"approved", "edited"}: raise HTTPException(status_code=400, detail="Action must be approved first")
    now = datetime.now(timezone.utc)
    out={"result":"draft_only"}
    t=str(row.get("type") or "")
    d=row.get("draft_payload") or {}
    if t=="assign_worker":
        jid=str(d.get("job_id") or row.get("related_entity_id") or "")
        wid=str(d.get("suggested_worker_id") or "")
        if jid and wid:
            await db.jobs.update_one({"id": jid, "business_id": business_id}, {"$set": {"assigned_worker_id": wid, "updated_at": now}})
            out={"result":"assigned_worker","job_id":jid,"worker_id":wid}
        else:
            out={"result":"needs_manual_selection"}
    elif t=="create_invoice_draft":
        inv={"business_id":business_id,"job_id":d.get("job_id"),"client_id":d.get("client_id"),"line_items":d.get("line_items") or [],"status":"draft","created_at":now,"updated_at":now}
        await db.invoices.insert_one(inv)
        out={"result":"invoice_draft_created"}
    await db.ai_control_actions.update_one({"_id": ObjectId(action_id)}, {"$set": {"status": "completed", "completed_at": now, "updated_at": now}})
    await _control_log(business_id, action_id, None, "action_completed", "Action completed", str(current_user.get("id") or ""))
    return {"success": True, **out}

@api_router.post("/ai/control/actions/{action_id}/dismiss")
async def ai_control_dismiss(action_id: str, current_user: dict = Depends(get_current_user)):
    _control_role_guard(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    await db.ai_control_actions.update_one({"_id": ObjectId(action_id), "business_id": business_id}, {"$set": {"status": "dismissed", "dismissed_at": now, "updated_at": now}})
    await _control_log(business_id, action_id, None, "action_dismissed", "Action dismissed", str(current_user.get("id") or ""))
    return {"success": True}

@api_router.post("/ai/control/prepare-today")
async def ai_control_prepare_today(current_user: dict = Depends(get_current_user)):
    return await _run_control_scan(current_user)

@api_router.post("/ai/control/ask")
async def ai_control_ask(payload: dict, current_user: dict = Depends(get_current_user)):
    _control_role_guard(str(current_user.get("role") or "").lower())
    q = str((payload or {}).get("question") or "What should I do next?")
    result = await _run_control_scan(current_user)
    return {"success": True, "answer": f"Prepared latest actions for: {q}", "run": result}

@api_router.get("/ai/control/logs")
async def ai_control_logs(current_user: dict = Depends(get_current_user)):
    _control_role_guard(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    logs = [serialize_doc(r) async for r in db.ai_control_logs.find({"business_id": business_id}).sort("created_at", -1).limit(200)]
    return {"success": True, "data": logs}
async def _upsert_operator_action(business_id: str, action_key: str, item: dict, now: datetime):
    if not action_key:
        return False, False
    filt = {"business_id": business_id, "action_key": action_key}
    existing = await db.ai_operator_actions.find_one(filt)
    if existing and str(existing.get("status") or "") in {"pending", "ready", "watching", "draft"}:
        await db.ai_operator_actions.update_one({"_id": existing.get("_id")}, {"$set": {**item, "updated_at": now}})
        return False, True
    # CHURVOX_AI_OPERATOR_APPROVED_ACTIONS_STAY_DONE
    if existing and str(existing.get("status") or "") in {"completed", "approved", "dismissed", "rejected"}:
        return False, False
    await db.ai_operator_actions.insert_one({**item, "business_id": business_id, "action_key": action_key, "created_at": now, "updated_at": now})
    return True, False

@api_router.post("/ai/operator/run-daily-check")
async def ai_operator_run_daily_check(current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    jobs = [serialize_doc(j) async for j in db.jobs.find({"business_id": business_id}).sort("created_at", -1).limit(60)]
    quotes = [serialize_doc(q) async for q in db.quotes.find({"business_id": business_id}).sort("created_at", -1).limit(60)]
    invoices = [serialize_doc(i) async for i in db.invoices.find({"business_id": business_id}).sort("created_at", -1).limit(60)]
    workers = [serialize_doc(w) async for w in db.business_users.find({"business_id": business_id, "role": {"$in": ["worker", "manager", "office_admin"]}}).limit(30)]

    items = []
    unassigned = [j for j in jobs if not j.get("assigned_worker_id")][:8]
    available_workers = [w for w in workers if str(w.get("role") or "") == "worker"] or workers
    for idx, job in enumerate(unassigned):
        worker = available_workers[idx % len(available_workers)] if available_workers else None
        if not worker:
            continue
        items.append({
            "business_id": business_id, "type": "assign_worker", "related_entity_type": "job", "related_entity_id": str(job.get("id") or job.get("_id")),
            "title": f"Assign {worker.get('name') or 'worker'} to {job.get('title') or 'job'}",
            "summary": "Suggested assignment",
            "recommendation": f"{worker.get('name') or 'Worker'} is available and suitable for this job.",
            "draft_payload": {"job_id": str(job.get("id") or job.get("_id")), "assigned_worker_id": str(worker.get("id") or worker.get("_id"))},
            "risk_level": _ai_risk_level("assign_worker"), "status": "pending", "created_by": "ai", "created_at": now, "updated_at": now
        })
    completed = [j for j in jobs if str(j.get("status") or "") == "completed"][:6]
    for job in completed:
        amount = float(job.get("price") or job.get("total_price") or 0)
        items.append({
            "business_id": business_id, "type": "invoice_draft", "related_entity_type": "job", "related_entity_id": str(job.get("id") or job.get("_id")),
            "title": "AI prepared an invoice description from the completed job.",
            "summary": "Ready to create draft",
            "recommendation": "Create a draft invoice for review before sending.",
            "draft_payload": {"job_id": str(job.get("id") or job.get("_id")), "line_items": [{"description": job.get("title") or "Service", "amount": amount}], "amount": amount},
            "risk_level": _ai_risk_level("invoice_draft"), "status": "pending", "created_by": "ai", "created_at": now, "updated_at": now
        })
    for inv in [i for i in invoices if str(i.get("status") or "") in {"overdue", "sent"}][:6]:
        items.append({
            "business_id": business_id, "type": "invoice_reminder", "related_entity_type": "invoice", "related_entity_id": str(inv.get("id") or inv.get("_id")),
            "title": f"Send payment reminder to {inv.get('client_name') or 'client'}", "summary": "Prepared for approval",
            "recommendation": "Review before sending.",
            "draft_payload": {"message": f"Hi, this is a reminder that invoice {inv.get('number') or inv.get('id')} is still outstanding. Please let us know if you need a copy."},
            "risk_level": _ai_risk_level("invoice_reminder"), "status": "pending", "created_by": "ai", "created_at": now, "updated_at": now
        })
    for q in [x for x in quotes if str(x.get("status") or "") in {"sent", "draft"}][:6]:
        items.append({
            "business_id": business_id, "type": "quote_followup", "related_entity_type": "quote", "related_entity_id": str(q.get("id") or q.get("_id")),
            "title": f"Follow up quote with {q.get('client_name') or 'client'}", "summary": "Needs owner approval",
            "recommendation": "Send a polite follow-up.", "draft_payload": {"message": f"Hi, just checking in on quote {q.get('number') or q.get('id')}. Happy to answer any questions."},
            "risk_level": _ai_risk_level("quote_followup"), "status": "pending", "created_by": "ai", "created_at": now, "updated_at": now
        })

    created = 0
    updated = 0
    for item in items:
        t = str(item.get("type") or "")
        rid = str(item.get("related_entity_id") or "")
        action_key = f"{t}:{rid}" if rid else ""
        if t == "assign_worker": action_key = f"assign_worker:{rid}"
        elif t in {"invoice_draft", "create_invoice_draft"}: action_key = f"create_invoice_draft:{rid}"
        elif t == "invoice_reminder": action_key = f"invoice_reminder:{rid}"
        elif t in {"quote_followup", "quote_follow_up"}: action_key = f"quote_follow_up:{rid}"
        elif t == "missing_business_data": action_key = f"missing_contact:{rid}"
        did_create, did_update = await _upsert_operator_action(business_id, action_key, _safe_action_doc(business_id, {**item, "action_key": action_key}, now), now)
        created += 1 if did_create else 0
        updated += 1 if did_update else 0
    logger.info(f"smart_hub_scan business={business_id} created={created} updated={updated}")
    daily_plan = [
        f"Assign {len(unassigned)} unassigned jobs.",
        f"Create {len(completed)} draft invoices from completed jobs.",
        f"Follow up {min(6, len([x for x in quotes if str(x.get('status') or '') in {'sent', 'draft'}]))} quotes waiting for response.",
        f"Chase {min(6, len([x for x in invoices if str(x.get('status') or '') in {'overdue', 'sent'}]))} open/overdue invoices.",
    ]
    await db.ai_operator_state.update_one({"business_id": business_id}, {"$set": {"business_id": business_id, "last_scan_at": now, "updated_at": now}}, upsert=True)
    return {"success": True, "created": created, "daily_plan": daily_plan}


@api_router.get("/ai/operator/approval-items")
async def ai_operator_approval_items(current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    records = [serialize_doc(r) async for r in db.ai_operator_actions.find({"business_id": business_id}).sort("created_at", -1).limit(120)]
    return {"success": True, "data": records}



@api_router.post("/ai/operator/approval-items/{item_id}/approve")
async def ai_operator_approve(item_id: str, current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid approval item id")
    item = await db.ai_operator_actions.find_one({"_id": ObjectId(item_id), "business_id": business_id})
    if not item:
        raise HTTPException(status_code=404, detail="Approval item not found")

    now = datetime.now(timezone.utc)
    item_type = str(item.get("action_type") or item.get("type") or "")
    completed = False
    try:
        completed, result = await execute_ai_operator_action(item, current_user)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # CHURVOX_AI_OPERATOR_APPROVE_SKIP_LEGACY_PAYLOAD_BLOCK
    # execute_ai_operator_action is the real executor. If it completed the work,
    # mark the action done and return before the old legacy branch can re-run
    # and reference stale variables like payload.
    if completed:
        await db.ai_operator_actions.update_one({"_id": ObjectId(item_id), "business_id": business_id}, {"$set": {"status": "completed", "group": "completed", "approved_at": now, "completed_at": now, "approved_by_user_id": str(current_user.get("id") or ""), "approved_by_name": str(current_user.get("name") or ""), "approved_by": str(current_user.get("id") or ""), "result": result, "updated_at": now}})
        await db.ai_operator_logs.insert_one({"business_id": business_id, "action_id": item_id, "event_type": "completed", "message": f"Action {item_type} approved", "user_id": str(current_user.get("id") or ""), "created_at": now})
        return {"success": True, "result": result}

    payload = dict(item.get("payload") or item.get("draft_payload") or {})
    if not payload.get("job_id") and item.get("related_entity_type") == "job":
        payload["job_id"] = str(item.get("related_entity_id") or "")

    if False and item_type == "assign_worker":
        job_id = str(payload.get("job_id") or item.get("job_id") or item.get("related_entity_id") or "")
        worker_id = str(payload.get("worker_id") or payload.get("recommended_worker_id") or item.get("worker_id") or "")
        if not job_id or not worker_id:
            raise HTTPException(status_code=400, detail="Missing job_id or worker_id")
        job = await db.jobs.find_one({"business_id": business_id, "$or": [{"id": job_id}, {"_id": ObjectId(job_id)}] if ObjectId.is_valid(job_id) else [{"id": job_id}]})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        worker = await db.business_users.find_one({"business_id": business_id, "$or": [{"id": worker_id}, {"_id": ObjectId(worker_id)}] if ObjectId.is_valid(worker_id) else [{"id": worker_id}]})
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        next_status = str(job.get("status") or "").lower()
        patch = {"assigned_worker_id": worker_id, "worker_id": worker_id, "assigned_worker_name": str(worker.get("name") or ""), "updated_at": now}
        if next_status in {"new", "unassigned", "pending"}:
            patch["status"] = "assigned"
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": patch})
        result = {"action": "assigned_worker", "job_id": str(job.get("id") or job.get("_id")), "assigned_worker_id": worker_id, "worker_name": patch["assigned_worker_name"]}
        await db.smart_hub_activity.insert_one({"business_id": business_id, "action_type": "assign_worker", "title": "Worker assigned", "message": f"{patch['assigned_worker_name'] or 'Worker'} assigned to {job.get('title') or 'job'}", "related_type": "job", "related_id": str(job.get("id") or job.get("_id")), "status": "completed", "created_at": now, "updated_at": now})
        completed = True
    elif item_type in {"create_invoice_draft", "invoice_draft"}:
        job_id = str(payload.get("job_id") or item.get("job_id") or item.get("related_entity_id") or "")
        client_id = str(payload.get("client_id") or item.get("client_id") or "")
        subtotal = float(payload.get("subtotal") or 0)
        gst_rate = float(payload.get("gst_rate") or 0.1)
        gst_amount = round(subtotal * gst_rate, 2)
        total = round(subtotal + gst_amount, 2)
        job = await db.jobs.find_one({"business_id": business_id, "$or": [{"id": job_id}, {"_id": ObjectId(job_id)}] if ObjectId.is_valid(job_id) else [{"id": job_id}]})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        existing_invoice = await db.invoices.find_one({"business_id": business_id, "$or": [{"job_id": job_id}, {"source_job_id": job_id}, {"linked_job_id": job_id}]})
        invoice_status = str(job.get("invoice_status") or "").lower()
        if job.get("invoice_id") or job.get("draft_invoice_id") or job.get("invoice_created") or job.get("invoiced") or invoice_status in {"draft", "sent", "open", "paid", "overdue"} or existing_invoice:
            existing_invoice_id = str((existing_invoice or {}).get("id") or (existing_invoice or {}).get("_id") or job.get("invoice_id") or job.get("draft_invoice_id") or "")
            result = {"action": "duplicate_prevented_existing_invoice", "invoice_id": existing_invoice_id, "job_id": job_id}
            await db.smart_hub_activity.insert_one({"business_id": business_id, "action_type": "create_invoice_draft", "title": "Invoice already exists", "message": f"Invoice already exists for {job.get('title') or 'job'}. AI action completed.", "related_type": "job", "related_id": job_id, "status": "completed", "created_at": now, "updated_at": now})
        else:
            invoice_doc = {"business_id": business_id, "job_id": job_id, "source_job_id": job_id, "linked_job_id": job_id, "client_id": client_id or str(job.get("client_id") or ""), "customer_name": str(job.get("client_name") or ""), "customer_email": str(job.get("client_email") or ""), "address": str(job.get("address") or job.get("location") or ""), "description": str(payload.get("description") or ""), "subtotal": subtotal, "gst_rate": gst_rate, "gst_amount": gst_amount, "total": total, "status": "draft", "source": "ai_operator", "created_at": now, "updated_at": now}
            invoice_res = await db.invoices.insert_one(invoice_doc)
            invoice_id = str(invoice_res.inserted_id)
            await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"invoice_id": invoice_id, "draft_invoice_id": invoice_id, "invoice_created": True, "invoiced": False, "invoice_status": "draft", "updated_at": now}})
            result = {"action": "invoice_draft_created", "invoice_id": invoice_id, "job_id": job_id}
            await db.smart_hub_activity.insert_one({"business_id": business_id, "action_type": "create_invoice_draft", "title": "Draft invoice created", "message": f"Draft invoice created for {job.get('title') or job.get('client_name') or 'job'}", "related_type": "invoice", "related_id": invoice_id, "status": "completed", "created_at": now, "updated_at": now})
        completed = True
    elif item_type in {"invoice_reminder", "quote_follow_up", "job_instruction", "customer_update", "client_cleanup", "schedule_conflict", "crew_workload", "job_to_quote_or_invoice"}:
        result = {"action": "prepared_for_review", "status": "draft_only"}

    await db.ai_operator_actions.update_one({"_id": ObjectId(item_id), "business_id": business_id}, {"$set": {"status": "completed" if completed else "approved", "group": "completed", "approved_at": now, "completed_at": now if completed else None, "approved_by_user_id": str(current_user.get("id") or ""), "approved_by_name": str(current_user.get("name") or ""), "approved_by": str(current_user.get("id") or ""), "result": result, "updated_at": now}})
    await db.ai_operator_logs.insert_one({"business_id": business_id, "action_id": item_id, "event_type": "completed" if completed else "approved", "message": f"Action {item_type} approved", "user_id": str(current_user.get("id") or ""), "created_at": now})
    return {"success": True, "result": result}


@api_router.post("/ai/operator/approval-items/{item_id}/reject")
async def ai_operator_reject(item_id: str, current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid approval item id")
    now = datetime.now(timezone.utc)
    result = await db.ai_operator_actions.update_one({"_id": ObjectId(item_id), "business_id": business_id}, {"$set": {"status": "rejected", "group": "completed", "rejected_at": now, "result": {"action": "rejected"}, "updated_at": now}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Approval item not found")
    await db.ai_operator_logs.insert_one({"business_id": business_id, "action_id": item_id, "event_type": "dismissed", "message": "Action dismissed", "user_id": str(current_user.get("id") or ""), "created_at": now})
    return {"success": True}


@api_router.post("/ai/operator/actions/{action_id}/approve")
async def ai_operator_actions_approve(action_id: str, current_user: dict = Depends(get_current_user)):
    return await ai_control_approve(action_id, current_user)


@api_router.post("/ai-operator/actions/{action_id}/approve")
async def ai_operator_actions_approve_v2(action_id: str, current_user: dict = Depends(get_current_user)):
    # CHURVOX_AI_OPERATOR_APPROVE_DIAGNOSTIC_500_FIX
    try:
        return await ai_operator_approve(action_id, current_user)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("AI Operator approve crashed for action_id=%s", action_id)
        raise HTTPException(status_code=400, detail=f"AI approve crashed: {type(exc).__name__}: {str(exc)}")


@api_router.post("/ai/operator/actions/{action_id}/reject")
async def ai_operator_actions_reject(action_id: str, current_user: dict = Depends(get_current_user)):
    return await ai_control_dismiss(action_id, current_user)


@api_router.post("/ai-operator/actions/{action_id}/reject")
async def ai_operator_actions_reject_v2(action_id: str, current_user: dict = Depends(get_current_user)):
    return await ai_operator_reject(action_id, current_user)


async def _ai_operator_bulk_action(action_ids: list, current_user: dict, op: str):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    results = []
    succeeded = 0
    failed = 0
    for raw_id in (action_ids or []):
        action_id = str(raw_id or "")
        if not ObjectId.is_valid(action_id):
            failed += 1
            results.append({"id": action_id, "success": False, "error": "invalid_id"})
            continue
        try:
            if op == "approve":
                await ai_operator_approve(action_id, current_user)
            elif op == "reject":
                await ai_operator_reject(action_id, current_user)
            elif op == "complete":
                now = datetime.now(timezone.utc)
                res = await db.ai_operator_actions.update_one({"_id": ObjectId(action_id), "business_id": business_id}, {"$set": {"status": "completed", "group": "completed", "completed_at": now, "updated_at": now}})
                if not res.matched_count:
                    raise HTTPException(status_code=404, detail="not_found")
            elif op == "delete":
                row = await db.ai_operator_actions.find_one({"_id": ObjectId(action_id), "business_id": business_id})
                if not row:
                    raise HTTPException(status_code=404, detail="not_found")
                if str(row.get("status") or "") not in {"completed", "dismissed", "rejected", "draft", "edited"}:
                    raise HTTPException(status_code=400, detail="unsafe_delete")
                await db.ai_operator_actions.delete_one({"_id": ObjectId(action_id), "business_id": business_id})
            succeeded += 1
            results.append({"id": action_id, "success": True})
        except Exception as e:
            failed += 1
            results.append({"id": action_id, "success": False, "error": str(getattr(e, "detail", str(e)))})
    return {"success": True, "processed": len(action_ids or []), "succeeded": succeeded, "failed": failed, "items": results}


@api_router.post("/ai-operator/actions/bulk-approve")
async def ai_operator_actions_bulk_approve(payload: dict, current_user: dict = Depends(get_current_user)):
    return await _ai_operator_bulk_action((payload or {}).get("action_ids") or [], current_user, "approve")


@api_router.post("/ai-operator/actions/bulk-reject")
async def ai_operator_actions_bulk_reject(payload: dict, current_user: dict = Depends(get_current_user)):
    return await _ai_operator_bulk_action((payload or {}).get("action_ids") or [], current_user, "reject")


@api_router.post("/ai-operator/actions/bulk-delete")
async def ai_operator_actions_bulk_delete(payload: dict, current_user: dict = Depends(get_current_user)):
    return await _ai_operator_bulk_action((payload or {}).get("action_ids") or [], current_user, "delete")


@api_router.post("/ai-operator/actions/bulk-complete")
async def ai_operator_actions_bulk_complete(payload: dict, current_user: dict = Depends(get_current_user)):
    return await _ai_operator_bulk_action((payload or {}).get("action_ids") or [], current_user, "complete")



@api_router.post("/ai-operator/actions/{action_id}/dismiss")
async def ai_operator_actions_dismiss_v2(action_id: str, current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    if not ObjectId.is_valid(action_id):
        raise HTTPException(status_code=400, detail="Invalid action id")
    now = datetime.now(timezone.utc)
    row = await db.ai_operator_actions.find_one({"_id": ObjectId(action_id), "business_id": business_id})
    if not row:
        raise HTTPException(status_code=404, detail="Action not found")

    # CHURVOX_AI_OPERATOR_APPROVE_PAYLOAD_ALIAS_FIX
    payload = dict(item.get("payload") or item.get("draft_payload") or {})
    if not payload.get("job_id") and item.get("related_entity_type") == "job":
        payload["job_id"] = str(item.get("related_entity_id") or "")
    await db.ai_operator_actions.update_one({"_id": row["_id"]}, {"$set": {"status": "dismissed", "group": "completed", "dismissed_at": now, "updated_at": now}})
    await db.smart_hub_activity.insert_one({"business_id": business_id, "action_type": str(row.get("action_type") or "dismiss"), "title": "Action dismissed", "message": f"{row.get('title') or 'AI action'} dismissed", "related_type": str(row.get("related_type") or "action"), "related_id": str(row.get("related_id") or action_id), "status": "completed", "created_at": now, "updated_at": now})
    return {"success": True}

@api_router.post("/ai/operator/actions/{action_id}/dismiss")
async def ai_operator_actions_dismiss(action_id: str, current_user: dict = Depends(get_current_user)):
    return await ai_operator_actions_reject(action_id, current_user)


@api_router.post("/ai/operator/actions/{action_id}/edit")
async def ai_operator_actions_edit(action_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    if not ObjectId.is_valid(action_id):
        raise HTTPException(status_code=400, detail="Invalid action id")
    now = datetime.now(timezone.utc)
    patch = {"owner_notes": str((payload or {}).get("owner_notes") or ""), "generated_message": str((payload or {}).get("generated_message") or ""), "proposed_changes": (payload or {}).get("proposed_changes") or {}, "status": "edited", "updated_at": now}
    result = await db.ai_operator_actions.update_one({"_id": ObjectId(action_id), "business_id": business_id}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Action not found")
    await db.ai_operator_logs.insert_one({"business_id": business_id, "action_id": action_id, "event_type": "edited", "message": "Action edited by owner", "user_id": str(current_user.get("id") or ""), "created_at": now})
    return {"success": True}


@api_router.patch("/ai-operator/actions/{action_id}")
async def ai_operator_actions_patch(action_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    if not ObjectId.is_valid(action_id):
        raise HTTPException(status_code=400, detail="Invalid action id")
    now = datetime.now(timezone.utc)
    allowed_payload_fields = {"description", "subtotal", "amount", "total", "gst", "gst_rate", "job_id", "client_id", "worker_id", "recommended_worker_id", "message", "notes"}
    existing = await db.ai_operator_actions.find_one({"_id": ObjectId(action_id), "business_id": business_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Action not found")
    # CHURVOX_AI_OPERATOR_PATCH_PRESERVE_DRAFT_PAYLOAD
    next_payload = dict(existing.get("payload") or existing.get("draft_payload") or {})
    if not next_payload.get("job_id") and existing.get("related_entity_type") == "job":
        next_payload["job_id"] = str(existing.get("related_entity_id") or "")
    for key, value in (payload or {}).items():
        if key in allowed_payload_fields:
            next_payload[key] = value
    patch = {"payload": next_payload, "updated_at": now}
    await db.ai_operator_actions.update_one({"_id": ObjectId(action_id), "business_id": business_id}, {"$set": patch})
    return {"success": True, "action": serialize_doc({**existing, **patch})}


@api_router.post("/ai/operator/prepare-today")
async def ai_operator_prepare_today(current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    jobs = [serialize_doc(j) async for j in db.jobs.find({"business_id": business_id}).limit(80)]
    quotes = [serialize_doc(q) async for q in db.quotes.find({"business_id": business_id}).limit(80)]
    invoices = [serialize_doc(i) async for i in db.invoices.find({"business_id": business_id}).limit(80)]

    unassigned = [j for j in jobs if not j.get("assigned_worker_id")]
    completed = [j for j in jobs if str(j.get("status") or "") == "completed"]
    waiting_quotes = [q for q in quotes if str(q.get("status") or "") in {"sent", "draft"}]
    open_invoices = [i for i in invoices if str(i.get("status") or "") in {"sent", "overdue", "draft"}]

    actions = [
        {"key": "assign", "title": f"Assign {len(unassigned)} unassigned jobs", "reason": "Unassigned jobs can delay today’s schedule.", "action": "Open dispatch"},
        {"key": "invoice", "title": f"Convert {len(completed)} completed jobs to invoices", "reason": "Completed work should be billed quickly.", "action": "Open invoices"},
        {"key": "quotes", "title": f"Review {len(waiting_quotes)} quotes waiting", "reason": "Faster follow-up improves conversion.", "action": "Open quotes"},
        {"key": "invoices", "title": f"Check {len(open_invoices)} open invoices", "reason": "Keep cashflow healthy and reduce overdue debt.", "action": "Open invoices"},
        {"key": "crew", "title": "Review crew workload", "reason": "Balance assignment load and avoid overload.", "action": "Open dispatch"},
    ]
    return {"success": True, "actions": actions}


@api_router.get("/ai/operator/run-daily-check")
async def ai_operator_run_daily_check_get(current_user: dict = Depends(get_current_user)):
    return await ai_control_run_scan(current_user)


@api_router.get("/ai/operator/prepare-today")
async def ai_operator_prepare_today_get(current_user: dict = Depends(get_current_user)):
    return await ai_control_prepare_today(current_user)


@api_router.post("/ai/operator/ask")
async def ai_operator_ask(payload: dict, current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    question = str((payload or {}).get("question") or "").strip()

    jobs = [serialize_doc(j) async for j in db.jobs.find({"business_id": business_id}).limit(80)]
    quotes = [serialize_doc(q) async for q in db.quotes.find({"business_id": business_id}).limit(80)]
    invoices = [serialize_doc(i) async for i in db.invoices.find({"business_id": business_id}).limit(80)]
    unassigned = len([j for j in jobs if not j.get("assigned_worker_id")])
    completed = len([j for j in jobs if str(j.get("status") or "") == "completed"])
    waiting_quotes = len([q for q in quotes if str(q.get("status") or "") in {"sent", "draft"}])
    open_invoices = len([i for i in invoices if str(i.get("status") or "") in {"sent", "overdue", "draft"}])

    response = (
        f"Top priorities today: assign {unassigned} unassigned jobs, convert {completed} completed jobs to invoices, "
        f"follow up {waiting_quotes} quotes, and review {open_invoices} open invoices. "
        f"Question received: {question or 'What should I do next?'}"
    )
    return {"success": True, "response": response}


@api_router.get("/ai/operator/ask")
async def ai_operator_ask_get(question: str = "", current_user: dict = Depends(get_current_user)):
    return await ai_control_ask({"question": question}, current_user)


@api_router.get("/ai/operator/status")
async def ai_operator_status(current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    jobs = [serialize_doc(j) async for j in db.jobs.find({"business_id": business_id}).limit(120)]
    quotes = [serialize_doc(q) async for q in db.quotes.find({"business_id": business_id}).limit(120)]
    invoices = [serialize_doc(i) async for i in db.invoices.find({"business_id": business_id}).limit(120)]
    workers = [serialize_doc(w) async for w in db.business_users.find({"business_id": business_id, "role": {"$in": ["worker", "manager", "office_admin"]}}).limit(120)]
    state = await db.ai_operator_state.find_one({"business_id": business_id}) or {}
    pending_count = await db.ai_operator_actions.count_documents({"business_id": business_id, "status": "pending"})
    return {"success": True, "status": "needs_approval" if pending_count else "ready", "pending_count": pending_count, "last_scan_at": state.get("last_scan_at"), "summary": {"jobs_today": len(jobs), "unassigned_jobs": len([j for j in jobs if not j.get("assigned_worker_id")]), "quotes_waiting": len([q for q in quotes if str(q.get("status") or "") in {"draft", "sent", "pending", "waiting"}]), "open_invoices": len([i for i in invoices if str(i.get("status") or "") in {"open", "sent", "overdue", "draft"}]), "ready_to_invoice": len([j for j in jobs if str(j.get("status") or "") == "completed"]), "crew_active": len([w for w in workers if str(w.get("status") or "").lower() in {"active", "busy", "on_site"}])}}


@api_router.post("/ai/operator/run-scan")
async def ai_operator_run_scan(current_user: dict = Depends(get_current_user)):
    return await ai_control_run_scan(current_user)


@api_router.get("/ai/operator/actions")
async def ai_operator_actions(current_user: dict = Depends(get_current_user)):
    return await ai_control_actions(current_user)


@api_router.get("/ai-operator/actions")
async def get_ai_operator_actions(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    rows = [serialize_doc(r) async for r in db.ai_operator_actions.find({"business_id": business_id}).limit(400)]
    risk_rank = {"high": 0, "medium": 1, "low": 2}
    def _sort_key(row: dict):
        status = str(row.get("status") or "")
        pending_rank = 0 if status == "pending" else 1
        risk = risk_rank.get(str(row.get("risk") or row.get("risk_level") or "medium"), 1)
        created = row.get("created_at") or datetime.fromtimestamp(0, tz=timezone.utc)
        return (pending_rank, risk, -created.timestamp() if hasattr(created, "timestamp") else 0)
    rows.sort(key=lambda r: (0 if str(r.get("status") or "") == "pending" else 1, -(r.get("priority_score") or 0), _sort_key(r)))
    return {"success": True, "actions": rows}


@api_router.get("/ai-operator/audit-log")
async def get_ai_operator_audit_log(limit: int = 200, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    safe_limit = max(1, min(500, int(limit or 200)))
    rows = [serialize_doc(r) async for r in db.ai_operator_logs.find({"business_id": business_id}).sort("created_at", -1).limit(safe_limit)]
    return {"success": True, "logs": rows}


@api_router.get("/ai-operator/setup-status")
async def get_ai_operator_setup_status(current_user: dict = Depends(get_current_user)):
    """Returns credential / setup readiness for SMS, MYOB, Email and AI."""
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    # SMS: needs Clicksend API key in env
    clicksend_key = os.environ.get("CLICKSEND_API_KEY", "").strip()
    sms_test_mode = str(os.environ.get("SMS_TEST_MODE", "false")).lower() in {"1", "true", "yes"}
    sms_ready = bool(clicksend_key) and not sms_test_mode
    sms_test_only = sms_test_mode or not clicksend_key
    # SMS credits on this business
    sms_balance_doc = await db.sms_balance.find_one({"business_id": business_id}) if hasattr(db, "sms_balance") else None
    sms_credits = int((sms_balance_doc or {}).get("balance") or 0)
    # MYOB
    myob_doc = await db.myob_settings.find_one({"business_id": business_id}) if hasattr(db, "myob_settings") else None
    myob_connected = bool((myob_doc or {}).get("connected") is True)
    myob_client_id_env = os.environ.get("MYOB_CLIENT_ID", "").strip()
    myob_credentials_present = bool(myob_client_id_env)
    # AI
    emergent_key = os.environ.get("EMERGENT_LLM_KEY", "").strip()
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    ai_ready = bool(emergent_key or openai_key)
    return {
        "success": True,
        "sms": {
            "ready": sms_ready,
            "test_only": sms_test_only,
            "credits": sms_credits,
            "provider": "clicksend",
            "blocked_reason": None if sms_ready else "Clicksend API key not configured. Real send disabled.",
        },
        "myob": {
            "ready": myob_connected,
            "credentials_present": myob_credentials_present,
            "connected": myob_connected,
            "blocked_reason": None if myob_connected else (
                "MYOB credentials not configured." if not myob_credentials_present
                else "MYOB not yet connected. Open Settings → Integrations to connect."
            ),
        },
        "ai": {
            "ready": ai_ready,
            "blocked_reason": None if ai_ready else "LLM key not configured.",
        },
    }


@api_router.get("/ai-operator/command-snapshot")
async def get_ai_operator_command_snapshot(current_user: dict = Depends(get_current_user)):
    """Single combined snapshot for the Smart Hub command centre.
    Returns pending actions grouped by category with real counts, urgent
    alerts (overdue invoices, unassigned jobs, completed-no-invoice, low SMS
    credits, MYOB sync, payroll review), and a 'next best move' summary.
    """
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)

    actions = [serialize_doc(r) async for r in db.ai_operator_actions.find({"business_id": business_id, "status": "pending"}).limit(200)]
    by_group: dict = {}
    by_type: dict = {}
    for a in actions:
        g = str(a.get("group") or "general")
        by_group[g] = by_group.get(g, 0) + 1
        t = str(a.get("action_type") or "general")
        by_type[t] = by_type.get(t, 0) + 1

    # Real urgent counts
    jobs = [serialize_doc(j) async for j in db.jobs.find({"business_id": business_id}).limit(500)]
    invoices = [serialize_doc(i) async for i in db.invoices.find({"business_id": business_id}).limit(500)]
    quotes = [serialize_doc(q) async for q in db.quotes.find({"business_id": business_id}).limit(500)]
    workers = [serialize_doc(w) async for w in db.business_users.find({"business_id": business_id, "role": "worker"}).limit(200)] if hasattr(db, "business_users") else []

    today_iso = now.date().isoformat()
    unassigned = [j for j in jobs if not (j.get("assigned_worker_id") or j.get("worker_id")) and str(j.get("status") or "").lower() not in {"completed", "cancelled", "closed", "done"}]
    overdue_invoices = []
    open_invoices_total = 0.0
    for inv in invoices:
        st = str(inv.get("status") or "").lower()
        if st in {"sent", "open", "overdue", "unpaid", "pending", "pending_payment"}:
            open_invoices_total += float(inv.get("balance_due") or inv.get("balance") or inv.get("total") or inv.get("amount") or 0)
            due = str(inv.get("due_date") or "")[:10]
            if due and due < today_iso:
                overdue_invoices.append(inv)
    completed_no_invoice = []
    for j in jobs:
        st = str(j.get("status") or "").lower()
        if st in {"completed", "complete", "done"} and not (j.get("invoice_id") or j.get("draft_invoice_id") or j.get("invoiced")):
            completed_no_invoice.append(j)
    overdue_quotes = [q for q in quotes if str(q.get("status") or "").lower() in {"sent", "pending"}]

    # SMS credit
    sms_balance_doc = await db.sms_balance.find_one({"business_id": business_id}) if hasattr(db, "sms_balance") else None
    sms_credits = int((sms_balance_doc or {}).get("balance") or 0)
    # MYOB
    myob_doc = await db.myob_settings.find_one({"business_id": business_id}) if hasattr(db, "myob_settings") else None
    myob_connected = bool((myob_doc or {}).get("connected") is True)

    # Payroll review
    pending_timesheets = await db.timesheets.count_documents({"business_id": business_id, "status": {"$in": ["pending", "submitted"]}}) if hasattr(db, "timesheets") else 0

    # Next best move (simple deterministic rule)
    if len(actions) > 0:
        next_best = f"You have {len(actions)} AI-prepared actions waiting for approval."
    elif len(unassigned) > 0:
        next_best = f"{len(unassigned)} unassigned job{'s' if len(unassigned) != 1 else ''} need a crew."
    elif len(completed_no_invoice) > 0:
        next_best = f"{len(completed_no_invoice)} completed job{'s' if len(completed_no_invoice) != 1 else ''} ready to invoice."
    elif len(overdue_invoices) > 0:
        next_best = f"{len(overdue_invoices)} overdue invoice{'s' if len(overdue_invoices) != 1 else ''} need follow-up."
    elif len(overdue_quotes) > 0:
        next_best = f"{len(overdue_quotes)} open quote{'s' if len(overdue_quotes) != 1 else ''} could use a follow-up."
    else:
        next_best = "All clear. Run AI Plan to scan for new actions."

    return {
        "success": True,
        "approvals": {
            "total_pending": len(actions),
            "by_group": by_group,
            "by_type": by_type,
            "items": actions[:8],
        },
        "urgent": {
            "unassigned_jobs": len(unassigned),
            "completed_no_invoice": len(completed_no_invoice),
            "overdue_invoices": len(overdue_invoices),
            "open_invoices_total": round(open_invoices_total, 2),
            "open_quotes": len(overdue_quotes),
            "pending_timesheets": pending_timesheets,
            "low_sms_credits": sms_credits < 25,
            "sms_credits": sms_credits,
            "myob_connected": myob_connected,
            "active_workers": len([w for w in workers if str(w.get("status") or "active") != "inactive"]),
            "active_jobs": len([j for j in jobs if str(j.get("status") or "").lower() not in {"completed", "cancelled", "closed", "done"}]),
        },
        "next_best_move": next_best,
        "scanned_at": now.isoformat(),
    }


async def _ensure_ai_receptionist_collections():
    try:
        await db.ai_enquiries.create_index([("business_id", 1), ("status", 1), ("created_at", -1)])
        await db.recurring_work_rules.create_index([("business_id", 1), ("active", 1), ("next_due_date", 1)])
    except Exception:
        pass


def _receptionist_prepare_payload(enquiry: dict, clients: list, workers: list) -> dict:
    msg = str(enquiry.get("message") or "")
    name = str(enquiry.get("customer_name") or "")
    email = str(enquiry.get("customer_email") or "")
    phone = str(enquiry.get("customer_phone") or "")
    suggested_client = next((c for c in clients if (email and str(c.get("email") or "").lower() == email.lower()) or (phone and str(c.get("phone") or "") == phone)), None)
    suggested_worker = workers[0] if workers else None
    suggested_job = {"title": f"Service enquiry: {name or 'New client'}", "address": enquiry.get("address") or "", "description": msg[:600], "status": "new"}
    suggested_quote = {"title": f"Quote for {name or 'new client'}", "line_items": [{"description": "Service visit", "qty": 1, "unit_price": 0}], "notes": "AI draft only - owner approval required"}
    draft_reply = f"Hi {name or 'there'}, thanks for your enquiry. We've reviewed your request and can prepare a draft job or quote for approval."
    return {"suggested_client_id": str((suggested_client or {}).get("id") or (suggested_client or {}).get("_id") or ""),
            "suggested_worker_id": str((suggested_worker or {}).get("id") or (suggested_worker or {}).get("_id") or ""),
            "suggested_job": suggested_job,
            "suggested_quote": suggested_quote,
            "ai_summary": f"Enquiry from {name or 'unknown customer'} at {enquiry.get('address') or 'no address provided'}.",
            "draft_reply": draft_reply}

@api_router.get("/ai-operator/settings")
async def get_ai_operator_settings(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    defaults = {
        "ai_operator_enabled": True,
        "operator_mode": "approval_first",  # approval_first | auto_safe | auto_send
        "auto_arrival_sms_enabled": False,
        "arrival_sms_mode": "approval_required",
        "arrival_sms_minutes_before": 30,
        "invoice_reminder_mode": "draft_only",
        "quote_followup_mode": "draft_only",
        "worker_assignment_mode": "approval_required",
        "quiet_hours_enabled": True,
        "quiet_hours_start": "20:00",
        "quiet_hours_end": "07:30",
        "max_messages_per_client_per_day": 2,
        "require_approval_for_first_message": True,
        "approval_confidence_threshold": 0.85,
        "owner_notify_on_action": True,
        "accounting_changes_locked": True,
        "payroll_changes_locked": True,
    }
    doc = await db.ai_operator_settings.find_one({"business_id": business_id}) if hasattr(db, "ai_operator_settings") else None
    doc_serialized = serialize_doc(doc) if doc else {}
    merged = {**defaults, **doc_serialized}
    merged["accounting_changes_locked"] = True
    merged["payroll_changes_locked"] = True
    return {"success": True, "settings": merged}

@api_router.patch("/ai-operator/settings")
async def patch_ai_operator_settings(payload: dict, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    allowed = {
        "ai_operator_enabled", "operator_mode",
        "auto_arrival_sms_enabled", "arrival_sms_mode", "arrival_sms_minutes_before",
        "invoice_reminder_mode", "quote_followup_mode", "worker_assignment_mode",
        "quiet_hours_enabled", "quiet_hours_start", "quiet_hours_end",
        "max_messages_per_client_per_day", "require_approval_for_first_message",
        "approval_confidence_threshold", "owner_notify_on_action",
    }
    update = {k: payload.get(k) for k in allowed if k in (payload or {})}
    if "operator_mode" in update and update["operator_mode"] not in {"approval_first", "auto_safe", "auto_send"}:
        update["operator_mode"] = "approval_first"
    if "arrival_sms_mode" in update and update["arrival_sms_mode"] not in {"approval_required", "auto_send"}:
        update["arrival_sms_mode"] = "approval_required"
    if "arrival_sms_minutes_before" in update:
        update["arrival_sms_minutes_before"] = max(20, min(35, int(update["arrival_sms_minutes_before"] or 30)))
    if "max_messages_per_client_per_day" in update:
        try:
            update["max_messages_per_client_per_day"] = max(0, min(10, int(update["max_messages_per_client_per_day"] or 0)))
        except Exception:
            update["max_messages_per_client_per_day"] = 2
    if "approval_confidence_threshold" in update:
        try:
            v = float(update["approval_confidence_threshold"])
            update["approval_confidence_threshold"] = max(0.0, min(1.0, v))
        except Exception:
            update["approval_confidence_threshold"] = 0.85
    update["accounting_changes_locked"] = True
    update["payroll_changes_locked"] = True
    now = datetime.now(timezone.utc)
    await db.ai_operator_settings.update_one({"business_id": business_id}, {"$set": {**update, "business_id": business_id, "updated_at": now}, "$setOnInsert": {"created_at": now}}, upsert=True)
    row = await db.ai_operator_settings.find_one({"business_id": business_id}) or {}
    if row and "_id" in row:
        row = serialize_doc(row)
    row["accounting_changes_locked"] = True
    row["payroll_changes_locked"] = True
    return {"success": True, "settings": row}


@api_router.post("/smart-hub/scan")
async def smart_hub_scan(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    jobs = [serialize_doc(j) async for j in db.jobs.find({"business_id": business_id}).limit(300)]
    invoices = [serialize_doc(i) async for i in db.invoices.find({"business_id": business_id}).limit(300)]
    quotes = [serialize_doc(q) async for q in db.quotes.find({"business_id": business_id}).limit(300)]
    clients = [serialize_doc(c) async for c in db.clients.find({"business_id": business_id}).limit(300)]
    workers = [serialize_doc(w) async for w in db.business_users.find({"business_id": business_id}).limit(300)]
    client_by_id = {str(c.get("id") or c.get("_id")): c for c in clients}
    quote_by_id = {str(q.get("id") or q.get("_id")): q for q in quotes}
    invoice_job_ids = {str(i.get("job_id") or i.get("jobId") or "") for i in invoices}
    active_keys = set()
    created = 0
    updated = 0
    async def _upsert_action(action_key: str, action_type: str, title: str, reason: str, payload: dict, related_type: str = None, related_id: str = None, job_id: str = None, client_id: str = None, invoice_id: str = None, quote_id: str = None, worker_id: str = None, what_happens: str = "", data_used: str = "", editable_fields: list = None):
        nonlocal created, updated
        active_keys.add(action_key)
        group = _operator_group_for_type(action_type)
        existing = await db.ai_operator_actions.find_one({"business_id": business_id, "action_key": action_key})
        existing_status = str((existing or {}).get("status") or "").lower()
        if existing and existing_status in {"completed", "approved", "rejected", "dismissed", "resolved", "archived"}:
            return
        base = {"business_id": business_id, "created_by": "ai_operator", "action_key": action_key, "action_type": action_type, "status": "pending", "group": group, "title": title, "reason": reason, "data_used": data_used, "what_happens": what_happens, "risk": _operator_risk_for_type(action_type), "related_type": related_type, "related_id": related_id, "job_id": job_id, "client_id": client_id, "invoice_id": invoice_id, "quote_id": quote_id, "worker_id": worker_id, "payload": payload or {}, "editable_fields": editable_fields or [], "updated_at": now}
        priority_score, priority_reason = _ai_operator_priority(base)
        doc = {**base, "priority_score": priority_score, "priority_reason": priority_reason, "subtitle": reason, "result": None, "error_message": None, "approved_at": None, "approved_by_user_id": None, "rejected_at": None, "rejected_by_user_id": None, "completed_at": None, "communication_id": None}
        if existing:
            await db.ai_operator_actions.update_one({"_id": existing["_id"]}, {"$set": doc, "$setOnInsert": {"created_at": now}})
            updated += 1
        else:
            doc["created_at"] = now
            await db.ai_operator_actions.insert_one(doc)
            created += 1
    for job in jobs:
        jid = str(job.get("id") or job.get("_id") or "")
        if not jid:
            continue
        st = str(job.get("status") or "").lower()
        client = client_by_id.get(str(job.get("client_id") or ""))
        has_invoice_link = bool(job.get("invoice_id") or job.get("draft_invoice_id") or job.get("invoice_created") or job.get("invoiced"))
        invoice_status = str(job.get("invoice_status") or "").lower()
        existing_job_invoice = next((inv for inv in invoices if str(inv.get("job_id") or inv.get("source_job_id") or inv.get("linked_job_id") or "") == jid), None)
        if st in {"completed", "complete"} and not has_invoice_link and invoice_status not in {"draft", "sent", "open", "paid", "overdue"} and not (jid in invoice_job_ids) and not existing_job_invoice:
            amount_source = "pricing_needed"
            subtotal = 0.0
            if float(job.get("fixed_price") or 0) > 0:
                subtotal = float(job.get("fixed_price") or 0)
                amount_source = "job_fixed_price"
            elif float(job.get("subtotal") or job.get("amount") or job.get("price") or 0) > 0:
                subtotal = float(job.get("subtotal") or job.get("amount") or job.get("price") or 0)
                amount_source = "job_subtotal_amount"
            elif str(job.get("quote_id") or "") and float((quote_by_id.get(str(job.get("quote_id") or "")) or {}).get("amount") or (quote_by_id.get(str(job.get("quote_id") or "")) or {}).get("total") or 0) > 0:
                linked_quote = quote_by_id.get(str(job.get("quote_id") or "")) or {}
                subtotal = float(linked_quote.get("amount") or linked_quote.get("total") or 0)
                amount_source = "linked_quote_amount"
            elif float(job.get("hourly_rate") or 0) > 0 and float(job.get("tracked_hours") or job.get("hours") or 0) > 0:
                subtotal = round(float(job.get("hourly_rate") or 0) * float(job.get("tracked_hours") or job.get("hours") or 0), 2)
                amount_source = "hourly_rate_x_tracked_time"
            if subtotal <= 0:
                await _upsert_action(f"missing_price:{jid}", "missing_price", f"Add pricing before invoicing {job.get('title') or 'job'}", "Completed job has no fixed price, subtotal, linked quote amount, or hourly tracked total.", {"job_id": jid, "amount_source": amount_source}, "job", jid, jid, str(job.get("client_id") or ""), what_happens="Owner needs to add pricing before AI can prepare a draft invoice.", editable_fields=["payload.subtotal", "payload.gst_rate"])
            else:
                # Build a rich, deterministic invoice description from real job signals.
                # Order of precedence prefers AI-prepared text, then worker notes, then job notes.
                primary = str(
                    job.get("ai_invoice_description")
                    or job.get("invoice_description_draft")
                    or job.get("completion_notes")
                    or job.get("worker_completion_notes")
                    or job.get("worker_notes")
                    or job.get("job_notes")
                    or job.get("notes")
                    or job.get("description")
                    or ""
                ).strip()
                extras_list = job.get("extras") or []
                extras_text = ""
                if isinstance(extras_list, list) and extras_list:
                    parts = []
                    for ex in extras_list[:5]:
                        if isinstance(ex, dict):
                            label = str(ex.get("name") or ex.get("description") or "").strip()
                            if label:
                                parts.append(label)
                        elif isinstance(ex, str) and ex.strip():
                            parts.append(ex.strip())
                    if parts:
                        extras_text = "Extras: " + ", ".join(parts) + "."
                photos = job.get("photos") or job.get("completion_photos") or []
                photo_text = ""
                if isinstance(photos, list) and photos:
                    photo_text = f"Proof: {len(photos)} photo{'s' if len(photos) != 1 else ''} attached."
                duration_min = int(job.get("time_spent_minutes") or job.get("total_minutes") or 0)
                duration_text = ""
                if duration_min > 0:
                    hrs = duration_min / 60.0
                    duration_text = f"Time on site: {hrs:.1f}h."
                service = str(job.get("job_type") or "").replace("_", " ").strip()
                title_text = str(job.get("title") or service or "Service").strip()
                if primary:
                    head = primary if primary.endswith(".") else primary + "."
                else:
                    head = f"{title_text} completed and ready for billing."
                if service and service.lower() not in head.lower():
                    head = f"{service.title()} — {head}"
                invoice_desc = " ".join([s for s in [head, extras_text, duration_text, photo_text] if s]).strip()
                await _upsert_action(f"create_invoice_draft:{jid}", "create_invoice_draft", f"Create draft invoice for {job.get('title') or (client or {}).get('name') or 'job'}", "Completed job is ready to bill.", {"job_id": jid, "client_id": str(job.get("client_id") or ""), "subtotal": subtotal, "description": invoice_desc, "amount_source": amount_source, "proof_summary": str(job.get("proof_summary") or job.get("completion_photos_summary") or job.get("completion_notes") or job.get("worker_completion_notes") or "")}, "job", jid, jid, str(job.get("client_id") or ""), what_happens="Churvox creates an editable draft invoice. Nothing is sent to the customer.", editable_fields=["payload.description", "payload.subtotal", "payload.gst_rate"])
        if st not in {"completed", "complete", "cancelled", "canceled", "archived", "assigned", "acknowledged", "in_progress"} and not (job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_worker") or job.get("assigned_worker_name")):
            best = None
            for w in workers:
                role = str(w.get("role") or "").lower()
                if role not in {"worker", "employee", "field_worker"}:
                    continue
                if w.get("available") is False or str(w.get("status") or "").lower() in {"inactive", "offboarded", "deleted"}:
                    continue
                wid = str(w.get("id") or w.get("_id") or "")
                assigned = [j for j in jobs if str(j.get("assigned_worker_id") or j.get("worker_id") or "") == wid]
                scheduled_today = len([j for j in assigned if str(j.get("scheduled_date") or j.get("date") or "") == str(job.get("scheduled_date") or job.get("date") or "")])
                active_count = len([j for j in assigned if str(j.get("status") or "").lower() not in {"completed", "complete", "cancelled", "canceled", "archived"}])
                job_region = str(job.get("region") or job.get("suburb") or job.get("area") or "").strip().lower()
                worker_region = str(w.get("region") or w.get("suburb") or w.get("area") or "").strip().lower()
                region_match = bool(job_region and worker_region and job_region == worker_region)
                conflict = scheduled_today > 0
                score = 40 + (20 if region_match else 0) + max(0, 20 - (active_count * 4)) + max(0, 10 - (scheduled_today * 5)) - (25 if conflict else 0)
                candidate = {"worker": w, "wid": wid, "score": score, "region_match": region_match, "active_count": active_count, "scheduled_today": scheduled_today, "conflict": conflict}
                if not best or candidate["score"] > best["score"]:
                    best = candidate
            wid = str((best or {}).get("wid") or "")
            worker_name = str(((best or {}).get("worker") or {}).get("name") or "")
            reasoning = f"Best score based on role/active status, workload ({(best or {}).get('active_count', 0)} active), scheduled today ({(best or {}).get('scheduled_today', 0)}), region match ({'yes' if (best or {}).get('region_match') else 'no'}), and conflict check ({'conflict' if (best or {}).get('conflict') else 'none'})."
            await _upsert_action(f"assign_worker:{jid}", "assign_worker", f"Assign worker to {job.get('title') or 'job'}", "Job has no assigned worker.", {"job_id": jid, "recommended_worker_id": wid, "worker_name": worker_name, "reasoning": reasoning, "conflict_warning": bool((best or {}).get("conflict"))}, "job", jid, jid, str(job.get("client_id") or ""), worker_id=wid, what_happens="Churvox assigns the worker and updates the job to assigned.", editable_fields=["payload.recommended_worker_id"])
    for inv in invoices:
        iid = str(inv.get("id") or inv.get("_id") or "")
        if not iid:
            continue
        st = str(inv.get("status") or "").lower()
        if st in {"open", "sent", "unpaid", "overdue", "pending_payment"} and st != "paid":
            await _upsert_action(f"invoice_reminder:{iid}", "invoice_reminder", f"Prepare reminder draft for invoice {inv.get('number') or iid}", "Invoice is open/unpaid and may need reminder.", {"invoice_id": iid, "client_id": str(inv.get("client_id") or ""), "message": f"Hi, just a friendly reminder that invoice {inv.get('number') or iid} is still outstanding.", "channel": "draft"}, "invoice", iid, invoice_id=iid, client_id=str(inv.get("client_id") or ""), what_happens="Churvox prepares a reminder draft. Nothing is sent until you confirm sending.", editable_fields=["payload.message"])
    for quote in quotes:
        qid = str(quote.get("id") or quote.get("_id") or "")
        st = str(quote.get("status") or "").lower()
        if st in {"sent", "pending", "waiting", "awaiting_response", "viewed"}:
            await _upsert_action(f"quote_follow_up:{qid}", "quote_follow_up", f"Prepare quote follow-up for {quote.get('number') or qid}", "Quote is waiting for client response.", {"quote_id": qid, "client_id": str(quote.get("client_id") or ""), "message": f"Hi, just checking in on quote {quote.get('number') or qid}."}, "quote", qid, quote_id=qid, client_id=str(quote.get("client_id") or ""), what_happens="Churvox prepares a quote follow-up draft. Nothing is sent until you confirm sending.", editable_fields=["payload.message"])

    # Missing client / job data flags — only for clients linked to active or recent work.
    active_client_ids = {str(j.get("client_id") or "") for j in jobs if str(j.get("status") or "").lower() not in {"archived", "cancelled", "canceled", "deleted"}}
    active_client_ids.update({str(q.get("client_id") or "") for q in quotes if str(q.get("status") or "").lower() in {"sent", "pending", "waiting", "viewed", "draft"}})
    for c in clients:
        cid = str(c.get("id") or c.get("_id") or "")
        if not cid or cid not in active_client_ids:
            continue
        missing = []
        if not (c.get("email") or "").strip():
            missing.append("email")
        if not (c.get("phone") or c.get("mobile") or "").strip():
            missing.append("phone")
        if missing:
            await _upsert_action(
                f"client_cleanup:{cid}",
                "client_cleanup",
                f"Add missing contact info for {c.get('name') or 'client'}",
                f"This client has no {' or '.join(missing)} on file — reminders and confirmations may not reach them.",
                {"client_id": cid, "missing_fields": missing},
                "client", cid, client_id=cid,
                what_happens="Owner opens the client record and fills the missing details. Nothing is sent.",
                editable_fields=[],
            )

    # Today's plan summary — one rolling action per scan with a deterministic snapshot.
    today_iso = now.date().isoformat()
    todays_jobs = [j for j in jobs if str(j.get("scheduled_date") or j.get("date") or "")[:10] == today_iso]
    unassigned_today = [j for j in todays_jobs if not (j.get("assigned_worker_id") or j.get("worker_id"))]
    completed_unbilled = [j for j in jobs if str(j.get("status") or "").lower() in {"completed", "complete"} and not (j.get("invoice_id") or j.get("draft_invoice_id") or j.get("invoiced"))]
    ready_value = 0.0
    for j in completed_unbilled:
        ready_value += float(j.get("price") or j.get("subtotal") or j.get("amount") or 0)
    overdue_count = len([i for i in invoices if str(i.get("status") or "").lower() == "overdue"])
    quote_followups = len([q for q in quotes if str(q.get("status") or "").lower() in {"sent", "pending", "waiting", "viewed"}])
    summary_lines = [
        f"{len(todays_jobs)} job{'s' if len(todays_jobs) != 1 else ''} scheduled today" + (f" ({len(unassigned_today)} unassigned)" if unassigned_today else ""),
        f"${ready_value:,.0f} in completed work ready to invoice" if completed_unbilled else None,
        f"{overdue_count} overdue invoice{'s' if overdue_count != 1 else ''} to chase" if overdue_count else None,
        f"{quote_followups} quote follow-up{'s' if quote_followups != 1 else ''} drafted" if quote_followups else None,
    ]
    summary_text = " · ".join([s for s in summary_lines if s])
    if summary_text:
        await _upsert_action(
            f"today_plan:{today_iso}",
            "today_plan",
            "Today's plan",
            summary_text,
            {
                "date": today_iso,
                "jobs_today": len(todays_jobs),
                "unassigned_today": len(unassigned_today),
                "completed_unbilled": len(completed_unbilled),
                "ready_to_invoice_value": round(ready_value, 2),
                "overdue_invoices": overdue_count,
                "open_quote_followups": quote_followups,
            },
            "summary", today_iso,
            what_happens="Daily snapshot prepared by Churvox. Reviewing this card is the next best move; nothing is sent or changed.",
            editable_fields=[],
        )

    # Payroll / time review summary — only when timesheet data exists for the period.
    pay_period_minutes = 0
    workers_with_time = 0
    for w in workers:
        wid = str(w.get("id") or w.get("_id") or "")
        if not wid:
            continue
        w_minutes = sum(
            int(j.get("time_spent_minutes") or j.get("total_minutes") or 0)
            for j in jobs
            if str(j.get("assigned_worker_id") or j.get("worker_id") or "") == wid
        )
        if w_minutes > 0:
            pay_period_minutes += w_minutes
            workers_with_time += 1
    if pay_period_minutes > 0:
        hours_total = round(pay_period_minutes / 60.0, 1)
        await _upsert_action(
            f"payroll_review:{today_iso}",
            "payroll_review",
            "Review crew hours before pay run",
            f"{hours_total} hours tracked across {workers_with_time} worker{'s' if workers_with_time != 1 else ''}. Open Payroll to confirm before any pay run.",
            {"date": today_iso, "total_hours": hours_total, "workers_with_time": workers_with_time},
            "summary", today_iso,
            what_happens="Owner-only review. Churvox does not change pay or run payroll automatically.",
            editable_fields=[],
        )

    await db.ai_operator_actions.update_many({"business_id": business_id, "status": "pending", "action_key": {"$nin": list(active_keys)}}, {"$set": {"status": "completed", "group": "completed", "updated_at": now, "result": "resolved_by_latest_scan"}})
    pending_count = await db.ai_operator_actions.count_documents({"business_id": business_id, "status": "pending"})
    actions = [serialize_doc(a) async for a in db.ai_operator_actions.find({"business_id": business_id}).sort("updated_at", -1).limit(200)]
    return {"success": True, "actions_created": created, "actions_updated": updated, "pending_count": pending_count, "actions": actions}




def _client_memory_payment_pattern(invoices: list) -> str:
    if not invoices:
        return "No invoice history yet"
    paid = [i for i in invoices if str(i.get("status") or "").lower() == "paid"]
    overdue = [i for i in invoices if str(i.get("status") or "").lower() == "overdue"]
    open_rows = [i for i in invoices if str(i.get("status") or "").lower() in {"open", "sent", "unpaid", "pending_payment"}]
    if overdue:
        return "Some overdue invoices"
    if paid and not open_rows:
        return "Usually pays on time"
    if paid and open_rows:
        return "Mixed: paid history with current outstanding invoices"
    return "Outstanding invoices present"


async def _build_client_memory(business_id: str, client_id: str) -> dict:
    jobs = [serialize_doc(j) async for j in db.jobs.find({"business_id": business_id, "client_id": client_id}).limit(300)]
    quotes = [serialize_doc(q) async for q in db.quotes.find({"business_id": business_id, "client_id": client_id}).limit(200)]
    invoices = [serialize_doc(i) async for i in db.invoices.find({"business_id": business_id, "client_id": client_id}).limit(200)]
    workers = [serialize_doc(w) async for w in db.business_users.find({"business_id": business_id}).limit(300)]
    notes_text = " ".join([str(j.get("notes") or j.get("worker_notes") or "") for j in jobs if (j.get("notes") or j.get("worker_notes"))]).strip()
    completed_jobs = [j for j in jobs if str(j.get("status") or "").lower() in {"completed", "complete"}]
    sorted_jobs = sorted(jobs, key=lambda j: str(j.get("scheduled_date") or j.get("completed_at") or j.get("updated_at") or ""), reverse=True)
    last_job = sorted_jobs[0] if sorted_jobs else None
    service_counts = {}
    durations = []
    worker_counts = {}
    photo_count = 0
    for j in jobs:
        svc = str(j.get("job_type") or j.get("service_type") or j.get("title") or "General service").strip()
        service_counts[svc] = service_counts.get(svc, 0) + 1
        dur = j.get("actual_duration_minutes") or j.get("duration_minutes") or j.get("actual_duration")
        try:
            if dur is not None:
                durations.append(float(dur))
        except Exception:
            pass
        wid = str(j.get("assigned_worker_id") or j.get("worker_id") or "")
        if wid:
            worker_counts[wid] = worker_counts.get(wid, 0) + 1
        photo_count += int(j.get("photo_count") or 0)
        if isinstance(j.get("photos"), list):
            photo_count += len(j.get("photos"))
    common_service = max(service_counts.items(), key=lambda kv: kv[1])[0] if service_counts else "Unknown"
    avg_duration = round(sum(durations) / len(durations), 1) if durations else None
    preferred_worker_id = max(worker_counts.items(), key=lambda kv: kv[1])[0] if worker_counts else ""
    worker_by_id = {str(w.get("id") or w.get("_id")): w for w in workers}
    preferred_worker_name = (worker_by_id.get(preferred_worker_id) or {}).get("name") if preferred_worker_id else ""
    recurring = any(bool(j.get("recurring") or j.get("recurring_job_id") or j.get("recurrence_rule")) for j in jobs)
    payment_pattern = _client_memory_payment_pattern(invoices)
    suggested_next_action = "Schedule next visit" if recurring else ("Prepare follow-up on latest quote" if any(str(q.get("status") or "").lower() in {"sent","pending","viewed","waiting"} for q in quotes) else "Review completed jobs and outstanding invoices")
    summary = f"This property usually has {common_service.lower()} work. "
    if avg_duration is not None:
        summary += f"Average job duration is about {avg_duration} minutes. "
    if completed_jobs:
        summary += "Recent jobs show completed service history. "
    if notes_text:
        summary += f"Latest notes: {notes_text[:140]}. "
    summary += f"Suggested next step: {suggested_next_action.lower()}."
    return {
        "client_id": client_id,
        "last_job": {"id": str((last_job or {}).get("id") or (last_job or {}).get("_id") or ""), "title": (last_job or {}).get("title") or "", "status": (last_job or {}).get("status") or ""} if last_job else None,
        "last_service_date": (last_job or {}).get("completed_at") or (last_job or {}).get("scheduled_date") if last_job else None,
        "common_service_type": common_service,
        "average_job_duration": avg_duration,
        "preferred_worker": {"id": preferred_worker_id, "name": preferred_worker_name} if preferred_worker_id else None,
        "recent_photos_count": photo_count,
        "payment_pattern": payment_pattern,
        "recurring_schedule": "Recurring" if recurring else "One-off / ad-hoc",
        "property_notes": notes_text[:600],
        "ai_summary": summary,
        "suggested_next_action": suggested_next_action,
    }


@api_router.get("/api/ai/follow-ups")
async def ai_follow_ups(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    actions = [serialize_doc(a) async for a in db.ai_operator_actions.find({"business_id": business_id, "status": "pending", "action_type": {"$in": ["quote_follow_up", "invoice_reminder", "create_invoice_draft", "proof_pack_send", "enquiry_follow_up", "worker_ack_follow_up"]}}).sort("priority_score", -1).limit(250)]
    return {"success": True, "actions": actions}


@api_router.get("/api/ai/customer-updates")
async def get_customer_updates(job_id: str = Query(default=""), current_user: dict = Depends(get_current_user)):
    role = str((current_user or {}).get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    q = {"business_id": business_id}
    if str(job_id).strip():
        q["job_id"] = str(job_id).strip()
    rows = [serialize_doc(r) async for r in db.customer_update_events.find(q).sort("created_at", -1).limit(250)]
    return {"success": True, "updates": rows}


async def _get_ai_auto_send_settings_for_business(business_id: str) -> dict:
    doc = await db.ai_auto_send_settings.find_one({"business_id": business_id}) if hasattr(db, "ai_auto_send_settings") else None
    if doc and "_id" in doc:
        doc = serialize_doc(doc)
    return {**AI_AUTO_SEND_DEFAULTS, **(doc or {})}


def _ai_message_safety_reason(message: dict, settings: dict) -> str | None:
    if not settings.get("ai_auto_send_enabled"):
        return "business_auto_send_disabled"
    mt = str(message.get("message_type") or "")
    if mt in AI_BLOCKED_MESSAGE_TYPES:
        return "message_type_blocked"
    toggle = AI_MESSAGE_TYPE_TO_TOGGLE.get(mt)
    if not toggle or not settings.get(toggle):
        return "message_type_disabled"
    if not str(message.get("message") or "").strip():
        return "message_empty"
    if not str(message.get("source_id") or "").strip():
        return "missing_source_data"
    if not str(message.get("recipient_phone") or "").strip() and not str(message.get("recipient_email") or "").strip():
        return "missing_customer_contact"
    if not str(message.get("channel") or "").strip() in {"sms", "email", "internal"}:
        return "invalid_channel"
    return None


@api_router.get("/ai-auto-send/settings")
async def get_ai_auto_send_settings(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    return {"success": True, "settings": await _get_ai_auto_send_settings_for_business(business_id)}


@api_router.patch("/ai-auto-send/settings")
async def patch_ai_auto_send_settings(payload: dict, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    allowed = set(AI_AUTO_SEND_DEFAULTS.keys())
    update = {k: bool(payload.get(k)) for k in allowed if k in (payload or {})}
    now = datetime.now(timezone.utc)
    await db.ai_auto_send_settings.update_one(
        {"business_id": business_id},
        {"$set": {**update, "business_id": business_id, "updated_at": now}, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    return {"success": True, "settings": await _get_ai_auto_send_settings_for_business(business_id)}


@api_router.get("/api/ai-messages")
async def list_ai_messages(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    rows = [serialize_doc(r) async for r in db.ai_messages.find({"business_id": business_id}).sort("created_at", -1).limit(300)]
    return {"success": True, "messages": rows}


@api_router.post("/api/ai-messages/{message_id}/dismiss")
async def dismiss_ai_message(message_id: str, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    await db.ai_messages.update_one({"_id": ObjectId(message_id), "business_id": business_id}, {"$set": {"status": "dismissed", "updated_at": now}})
    row = await db.ai_messages.find_one({"_id": ObjectId(message_id), "business_id": business_id})
    if not row:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"success": True, "message": serialize_doc(row)}


@api_router.post("/api/ai/customer-updates/prepare-for-job/{job_id}")
async def prepare_customer_updates_for_job(job_id: str, current_user: dict = Depends(get_current_user)):
    role = str((current_user or {}).get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "business_id": business_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    created = []
    for et in ["job_scheduled", "job_started", "job_completed", "proof_ready", "invoice_ready"]:
        row = await _prepare_customer_update_for_job(job, business_id, et)
        if row:
            created.append(row)
    return {"success": True, "updates": created}


@api_router.post("/api/ai/customer-updates/{update_id}/approve")
async def approve_customer_update(update_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    role = str((current_user or {}).get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    patch = {"status": "approved", "approved_at": now, "updated_at": now}
    if isinstance(payload, dict) and payload.get("message"):
        patch["message"] = str(payload.get("message"))[:1200]
    if isinstance(payload, dict) and payload.get("channel") in {"email", "sms", "copy"}:
        patch["channel"] = payload.get("channel")
    await db.customer_update_events.update_one({"_id": ObjectId(update_id), "business_id": business_id}, {"$set": patch})
    row = await db.customer_update_events.find_one({"_id": ObjectId(update_id), "business_id": business_id})
    if not row:
        raise HTTPException(status_code=404, detail="Update not found")
    return {"success": True, "update": serialize_doc(row), "sent": False}


@api_router.post("/api/ai/customer-updates/{update_id}/skip")
async def skip_customer_update(update_id: str, current_user: dict = Depends(get_current_user)):
    role = str((current_user or {}).get("role") or "").lower()
    _owner_roles_only(role)
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    await db.customer_update_events.update_one({"_id": ObjectId(update_id), "business_id": business_id}, {"$set": {"status": "skipped", "skipped_at": now, "updated_at": now}})
    return {"success": True}


@api_router.post("/api/ai-messages/prepare")
async def prepare_ai_message(payload: dict, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    doc = {
        "business_id": business_id,
        "source_type": str((payload or {}).get("source_type") or ""),
        "source_id": str((payload or {}).get("source_id") or ""),
        "message_type": str((payload or {}).get("message_type") or ""),
        "channel": str((payload or {}).get("channel") or "sms"),
        "recipient_name": str((payload or {}).get("recipient_name") or ""),
        "recipient_phone": str((payload or {}).get("recipient_phone") or ""),
        "recipient_email": str((payload or {}).get("recipient_email") or ""),
        "message": str((payload or {}).get("message") or "")[:2000],
        "status": "draft",
        "auto_send": False,
        "reason": "draft_ready_review_before_sending",
        "provider_message_id": None,
        "error": None,
        "sent_at": None,
        "created_at": now,
        "updated_at": now,
    }
    dup = await db.ai_messages.find_one({"business_id": business_id, "source_type": doc["source_type"], "source_id": doc["source_id"], "message_type": doc["message_type"], "status": {"$in": ["auto_sent", "sent"]}})
    if dup:
        return {"success": True, "duplicate": True, "message": serialize_doc(dup)}
    settings = await _get_ai_auto_send_settings_for_business(business_id)
    reason = _ai_message_safety_reason(doc, settings)
    if reason is None:
        doc["status"] = "auto_sent"
        doc["auto_send"] = True
        doc["reason"] = "auto_send_enabled"
        doc["sent_at"] = now
    else:
        doc["status"] = "skipped" if settings.get("ai_auto_send_enabled") else "draft"
        doc["reason"] = reason
    ins = await db.ai_messages.insert_one(doc)
    return {"success": True, "message": {"id": str(ins.inserted_id), **doc}}


@api_router.post("/api/ai-messages/{message_id}/send")
async def send_ai_message(message_id: str, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    row = await db.ai_messages.find_one({"_id": ObjectId(message_id), "business_id": business_id})
    if not row:
        raise HTTPException(status_code=404, detail="Message not found")
    now = datetime.now(timezone.utc)
    await db.ai_messages.update_one({"_id": row["_id"]}, {"$set": {"status": "sent", "sent_at": now, "updated_at": now, "reason": "manual_send"}})
    row = await db.ai_messages.find_one({"_id": row["_id"]})
    return {"success": True, "message": serialize_doc(row)}


def _build_quote_from_photo_inputs(payload: dict, client: dict | None = None, history_jobs: list | None = None):
    service = str((payload or {}).get("service_type") or "").strip()
    desc = str((payload or {}).get("description") or "").strip()
    photos = (payload or {}).get("photos") if isinstance((payload or {}).get("photos"), list) else []
    jobs = history_jobs or []
    avg = None
    amounts = [float(j.get("price")) for j in jobs if isinstance(j.get("price"), (int, float))]
    if amounts:
        avg = sum(amounts) / len(amounts)
    line_items = [{"name": service or "Service work", "description": desc or "Work as requested", "qty": 1, "unit_price": round(avg, 2) if avg else None}]
    price_range = f"${round(avg*0.9,2)}-${round(avg*1.15,2)}" if avg and len(amounts) >= 2 else "Manual pricing needed"
    summary = f"Drafted from {len(photos)} photo(s), service '{service or 'unspecified'}', and notes. No visual inspection performed."
    if client and client.get("name"):
        summary += f" Client history considered for {client.get('name')}."
    return {"ai_scope_summary": summary, "suggested_line_items": line_items, "suggested_price_range": price_range, "suggested_terms": "Final price subject to on-site confirmation and exclusions listed in quote."}


@api_router.post("/api/ai/quotes/from-photos")
async def ai_quote_from_photos(payload: dict, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    client_id = str((payload or {}).get("client_id") or "")
    client = await db.clients.find_one({"_id": ObjectId(client_id), "business_id": business_id}) if ObjectId.is_valid(client_id) else None
    history = [j async for j in db.jobs.find({"business_id": business_id, "client_id": client_id}).sort("created_at", -1).limit(20)] if client_id else []
    built = _build_quote_from_photo_inputs(payload or {}, client=client, history_jobs=history)
    doc = {"business_id": business_id, "enquiry_id": str((payload or {}).get("enquiry_id") or ""), "client_id": client_id, "job_id": str((payload or {}).get("job_id") or ""), "photos": (payload or {}).get("photos") if isinstance((payload or {}).get("photos"), list) else [], "service_type": str((payload or {}).get("service_type") or ""), "description": str((payload or {}).get("description") or ""), **built, "status": "ready_for_review", "created_at": now, "updated_at": now, "approved_at": None, "converted_quote_id": None}
    ins = await db.ai_quote_drafts.insert_one(doc)
    return {"success": True, "draft": {"id": str(ins.inserted_id), **doc}}

@api_router.get("/api/ai/quotes/drafts")
async def ai_quote_drafts(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    rows = [serialize_doc(r) async for r in db.ai_quote_drafts.find({"business_id": business_id}).sort("created_at", -1).limit(200)]
    return {"success": True, "drafts": rows}

@api_router.get("/api/ai/quotes/drafts/{draft_id}")
async def ai_quote_draft_detail(draft_id: str, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    row = await db.ai_quote_drafts.find_one({"_id": ObjectId(draft_id), "business_id": business_id})
    if not row:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"success": True, "draft": serialize_doc(row)}

@api_router.post("/api/ai/quotes/drafts/{draft_id}/approve")
async def ai_quote_draft_approve(draft_id: str, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    await db.ai_quote_drafts.update_one({"_id": ObjectId(draft_id), "business_id": business_id}, {"$set": {"status": "approved", "approved_at": now, "updated_at": now}})
    return {"success": True}

@api_router.post("/api/ai/quotes/drafts/{draft_id}/convert-to-quote")
async def ai_quote_draft_convert(draft_id: str, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    row = await db.ai_quote_drafts.find_one({"_id": ObjectId(draft_id), "business_id": business_id})
    if not row:
        raise HTTPException(status_code=404, detail="Draft not found")
    quote = {"business_id": business_id, "client_id": row.get("client_id"), "title": f"{row.get('service_type') or 'Service'} quote", "description": row.get("description") or row.get("ai_scope_summary") or "", "line_items": row.get("suggested_line_items") or [], "status": "draft", "created_at": now, "updated_at": now, "source": "ai_quote_draft"}
    ins = await db.quotes.insert_one(quote)
    await db.ai_quote_drafts.update_one({"_id": row["_id"]}, {"$set": {"status": "converted_to_quote", "converted_quote_id": str(ins.inserted_id), "updated_at": now}})
    return {"success": True, "quote_id": str(ins.inserted_id)}

@api_router.post("/api/ai/quotes/drafts/{draft_id}/dismiss")
async def ai_quote_draft_dismiss(draft_id: str, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    await db.ai_quote_drafts.update_one({"_id": ObjectId(draft_id), "business_id": business_id}, {"$set": {"status": "dismissed", "updated_at": now}})
    return {"success": True}


@api_router.post("/api/ai/follow-ups/generate")
async def ai_follow_ups_generate(current_user: dict = Depends(get_current_user)):
    return await smart_hub_scan(current_user)


@api_router.post("/api/ai/follow-ups/{action_id}/approve")
async def ai_follow_up_approve(action_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    payload = await request.json() if request else {}
    return await ai_operator_approve(action_id, current_user)


@api_router.post("/api/ai/follow-ups/{action_id}/dismiss")
async def ai_follow_up_dismiss(action_id: str, current_user: dict = Depends(get_current_user)):
    return await ai_operator_reject(action_id, current_user)


@api_router.get("/api/ai/client-memory/{client_id}")
async def get_client_memory(client_id: str, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    memory = await _build_client_memory(str(business_id), str(client_id))
    return {"success": True, "data": memory}


@api_router.post("/api/ai/client-memory/{client_id}/refresh")
async def refresh_client_memory(client_id: str, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    memory = await _build_client_memory(str(business_id), str(client_id))
    return {"success": True, "data": memory, "refreshed": True}
@api_router.post("/smart-hub/process-due-communications")
async def smart_hub_process_due_communications(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)

    settings = await db.ai_operator_settings.find_one({"business_id": business_id}) if hasattr(db, "ai_operator_settings") else {}
    ai_settings = {
        "ai_operator_enabled": True,
        "auto_arrival_sms_enabled": False,
        "arrival_sms_mode": "approval_required",
        "arrival_sms_minutes_before": 30,
    }
    ai_settings.update(settings or {})
    if ai_settings.get("ai_operator_enabled") and ai_settings.get("auto_arrival_sms_enabled"):
        jobs = [serialize_doc(j) async for j in db.jobs.find({"business_id": business_id}).limit(400)]
        clients = [serialize_doc(c) async for c in db.clients.find({"business_id": business_id}).limit(400)]
        client_by_id = {str(c.get("id") or c.get("_id")): c for c in clients}
        now_ts = datetime.now(timezone.utc)
        for job in jobs:
            st = str(job.get("status") or "").lower()
            if st not in {"assigned", "scheduled", "acknowledged"}:
                continue
            job_id = str(job.get("id") or job.get("_id") or "")
            if not job_id:
                continue
            sched_raw = job.get("scheduled_at") or job.get("scheduled_date") or job.get("date")
            sched = None
            if sched_raw:
                try:
                    sched = datetime.fromisoformat(str(sched_raw).replace("Z", "+00:00"))
                except Exception:
                    sched = None
            if not sched:
                continue
            if sched.tzinfo is None:
                sched = sched.replace(tzinfo=timezone.utc)
            mins = int(ai_settings.get("arrival_sms_minutes_before") or 30)
            diff = (sched - now_ts).total_seconds() / 60
            if diff > (mins + 5) or diff < (mins - 10):
                continue
            worker_id = str(job.get("assigned_worker_id") or job.get("worker_id") or "")
            if not worker_id:
                continue
            client = client_by_id.get(str(job.get("client_id") or ""))
            to_phone = (client or {}).get("phone") or job.get("client_phone")
            if not to_phone:
                continue
            if bool((client or {}).get("sms_opt_out") or (client or {}).get("opt_out_sms")):
                continue
            exists = await db.communications.find_one({"business_id": business_id, "action_type": "job_arrival_sms", "job_id": job_id, "status": {"$in": ["approved", "scheduled", "sent", "pending"]}})
            if exists:
                continue
            msg = f"Hi {(client or {}).get('name') or 'there'}, our worker is expected to arrive in about {mins} minutes for {job.get('title') or 'your job'}."
            if ai_settings.get("arrival_sms_mode") == "auto_send":
                await db.communications.insert_one({"business_id": business_id, "client_id": str((client or {}).get("id") or (client or {}).get("_id") or ""), "job_id": job_id, "action_type": "job_arrival_sms", "channel": "sms", "to_phone": to_phone, "message": msg, "status": "approved", "created_at": now_ts, "updated_at": now_ts})
            else:
                await db.ai_operator_actions.update_one(
                    {"business_id": business_id, "action_key": f"job_arrival_sms:{job_id}"},
                    {"$set": {"business_id": business_id, "created_by": "ai_operator", "action_key": f"job_arrival_sms:{job_id}", "action_type": "job_arrival_sms", "status": "pending", "group": "drafts", "title": f"Send arrival SMS to {(client or {}).get('name') or 'client'}", "reason": "Arrival notice is due soon.", "what_happens": "Client receives a 30-minute arrival SMS.", "risk": "low", "related_type": "job", "related_id": job_id, "job_id": job_id, "client_id": str((client or {}).get("id") or (client or {}).get("_id") or ""), "worker_id": worker_id, "payload": {"message": msg, "job_id": job_id, "client_id": str((client or {}).get("id") or (client or {}).get("_id") or ""), "worker_id": worker_id, "to_phone": to_phone}, "updated_at": now_ts}, "$setOnInsert": {"created_at": now_ts}},
                    upsert=True,
                )

    q = {
        "business_id": business_id,
        "status": {"$in": ["approved", "scheduled"]},
        "$or": [
            {"scheduled_for": {"$exists": False}},
            {"scheduled_for": None},
            {"scheduled_for": {"$lte": now}},
        ],
    }
    rows = [serialize_doc(r) async for r in db.communications.find(q).sort("created_at", 1).limit(100)]
    sent = 0
    failed = 0
    skipped = 0

    for row in rows:
        cid = str(row.get("id") or row.get("_id") or "")
        if not cid:
            skipped += 1
            continue
        if str(row.get("status") or "") == "sent":
            skipped += 1
            continue
        try:
            await send_communication(cid, current_user)
            sent += 1
        except HTTPException:
            failed += 1
        except Exception:
            failed += 1

    return {"success": True, "sent": sent, "failed": failed, "skipped": skipped}

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access_token = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=86400, path="/")
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPassword):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})

    if not user:
        return {
            "success": True,
            "message": "If the email exists, a reset link has been sent",
        }

    token = secrets.token_urlsafe(32)

    await db.password_reset_tokens.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "token": token,
            "created_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    email_sent = False
    try:
        subject, html = build_password_reset_email(user.get("name") or "", reset_link)
        await send_email(to_email=email, subject=subject, html_content=html)
        email_sent = True
        print(f"FORGOT_PASSWORD_EMAIL_SENT to={email}")
    except Exception as e:
        print(f"FORGOT_PASSWORD_EMAIL_ERROR to={email} error={repr(e)}")

    return {
        "success": True,
        "message": "If the email exists, a reset link has been sent",
        "email_sent": email_sent,
    }


@api_router.post("/auth/reset-password")
async def reset_password(payload: dict):
    token = str((payload or {}).get("token") or "").strip()
    new_password = str((payload or {}).get("new_password") or (payload or {}).get("password") or "").strip()

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and password are required")

    token_doc = await db.password_reset_tokens.find_one({"token": token})
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    created_at = token_doc.get("created_at")
    if created_at:
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except Exception:
                created_at = None
        if created_at:
            if not created_at.tzinfo:
                created_at = created_at.replace(tzinfo=timezone.utc)
            age = datetime.now(timezone.utc) - created_at
            if age.total_seconds() > 3600:
                await db.password_reset_tokens.delete_one({"token": token})
                raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

    email = str(token_doc.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password_hash": hash_password(new_password),
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    await db.password_reset_tokens.delete_many({"email": email})

    return {"success": True, "message": "Password reset successful"}


@api_router.post("/forgot-password")
async def forgot_password_alias(data: ForgotPassword):
    return await forgot_password(data)


@api_router.post("/reset-password")
async def reset_password_alias(payload: dict):
    return await reset_password(payload)


@api_router.get("/invite/verify/{token}")
async def verify_invite(token: str):
    from bson import ObjectId
    try:
        worker = await db.business_users.find_one({"_id": ObjectId(token)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invite link")

    if not worker:
        raise HTTPException(status_code=404, detail="Invite not found or expired")

    if worker.get("status") == "active":
        raise HTTPException(status_code=400, detail="This invite has already been used. Please sign in instead.")

    business_name = ""
    business_id = worker.get("business_id")
    if business_id:
        try:
            owner = await db.users.find_one({"business_id": business_id})
            if owner:
                business_name = owner.get("business_name") or owner.get("name") or ""
        except Exception:
            pass

    return {
        "email": worker.get("email"),
        "name": worker.get("name", ""),
        "business_name": business_name,
        "status": worker.get("status"),
    }


@api_router.post("/invite/accept")
async def accept_invite(payload: dict):
    from bson import ObjectId
    token = str((payload or {}).get("token") or "").strip()
    password = str((payload or {}).get("password") or "").strip()
    name = str((payload or {}).get("name") or "").strip()

    if not token or not password:
        raise HTTPException(status_code=400, detail="Token and password are required")

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    try:
        worker = await db.business_users.find_one({"_id": ObjectId(token)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invite token")

    if not worker:
        raise HTTPException(status_code=404, detail="Invite not found")

    if worker.get("status") == "active":
        raise HTTPException(status_code=400, detail="This invite has already been accepted")

    email = (worker.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email on invite record")

    business_id = worker.get("business_id") or ""
    worker_name = name or worker.get("name") or ""
    invited_role = worker.get("role") or "worker"
    valid_roles = {"worker", "manager", "office_admin", "payroll"}
    if invited_role not in valid_roles:
        invited_role = "worker"

    existing_user = await db.users.find_one({"email": email})
    hashed = hash_password(password)
    now = datetime.now(timezone.utc)

    if existing_user:
        await db.users.update_one(
            {"_id": existing_user["_id"]},
            {"$set": {
                "password_hash": hashed,
                "role": invited_role,
                "business_id": business_id,
                "name": worker_name or existing_user.get("name", ""),
                "status": "active",
                "is_active": True,
                "updated_at": now,
            }}
        )
    else:
        await db.users.insert_one({
            "email": email,
            "password_hash": hashed,
            "role": invited_role,
            "name": worker_name,
            "business_id": business_id,
            "status": "active",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        })

    await db.business_users.update_one(
        {"_id": ObjectId(token)},
        {"$set": {"status": "active", "updated_at": now}}
    )

    return {"success": True, "message": "Account setup complete"}


@api_router.post("/team/resend-invite/{worker_id}")
async def resend_invite(worker_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    from bson import ObjectId
    try:
        worker = await db.business_users.find_one({"_id": ObjectId(worker_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid worker ID")

    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    email = (worker.get("email") or "").strip()
    name = worker.get("name") or ""

    if not email:
        raise HTTPException(status_code=400, detail="Worker has no email")

    invite_link = f"{FRONTEND_URL}/invite/setup/{worker_id}"

    try:
        biz_name = str(current_user.get("business_name") or "").strip()
        worker_role = str(worker.get("role") or "worker").strip().lower()
        subject, html = build_resend_invite_email(
            name=name,
            invite_link=invite_link,
            business_name=biz_name,
            role=worker_role,
        )
        await send_email(to_email=email, subject=subject, html_content=html)
        print(f"RESEND_INVITE_SENT worker={worker_id} email={email}")
        return {"success": True, "message": f"Invite resent to {email}"}
    except Exception as e:
        print(f"RESEND_INVITE_ERROR worker={worker_id} email={email} error={repr(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send invite email: {str(e)}")


@app.on_event("shutdown")


async def shutdown_db_client():
    client.close()




@app.get("/api/health-login")
def health_login():
    return {
        "ok": True,
        "frontend_url": FRONTEND_URL
    }



# =========================
# BUSINESS ISOLATION EXAMPLES
# COPY THIS PATTERN INTO ALL CLIENT/JOB/QUOTE/INVOICE/TIMER/SMS ROUTES
# =========================

# Example secure list pattern:







@api_router.get("/invoices")
async def get_invoices(current_user: dict = Depends(get_current_user)):
    # Workers must not see invoices (pricing/financial data).
    if str(current_user.get("role") or "").lower() == "worker":
        return []
    try:
        business_id = _resolve_business_id(current_user)
        owner_id = _resolve_owner_id(current_user)

        query = {
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
            ]
        }

        docs = []
        async for invoice in db.invoices.find(query).sort("created_at", -1):
            try:
                docs.append(_serialize_invoice(invoice))
            except Exception as e:
                print("INVOICE_ROW_SKIP", str(invoice.get("_id")), str(e))
                continue

        return docs
    except Exception as e:
        print("INVOICES_ROUTE_ERROR", str(e), current_user)
        return []


@api_router.get("/invoices/description-draft")
async def get_invoice_description_draft(client_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    business_id = _resolve_business_id(current_user)
    client = await db.clients.find_one({"_id": ObjectId(client_id), "business_id": business_id})
    if not client:
        client = await db.clients.find_one({"id": str(client_id), "business_id": business_id})
    client_name = _safe_text((client or {}).get("name") or (client or {}).get("client_name"))

    job = await db.jobs.find_one(
        {"business_id": business_id, "client_id": str(client_id), "status": "completed"},
        sort=[("completed_at", -1), ("updated_at", -1), ("created_at", -1)],
    )
    if not job:
        return {"success": True, "description": (f"Service work completed for {client_name}." if client_name else "Service work completed for this client."), "source": "fallback"}

    saved_draft = _safe_text(job.get("invoice_description_draft") or job.get("ai_invoice_description"))
    if saved_draft:
        return {"success": True, "description": saved_draft, "source": "saved_job_draft", "job_id": str(job.get("_id") or "")}
    if _safe_text(job.get("worker_notes")):
        return {"success": True, "description": _format_invoice_description_from_job(job, client_name), "source": "worker_notes", "job_id": str(job.get("_id") or "")}
    return {"success": True, "description": _format_invoice_description_from_job(job, client_name), "source": "job_context", "job_id": str(job.get("_id") or "")}


@api_router.post("/invoices")
async def create_invoice(request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    payload = await request.json()

    business_id = _resolve_business_id(current_user)
    owner_id = _resolve_owner_id(current_user)

    if not business_id:
        raise HTTPException(status_code=400, detail="Business ID missing")

    def to_float(value, default=0):
        try:
            return float(value)
        except Exception:
            return default

    now = datetime.now(timezone.utc)
    accounting = await db.accounting_settings.find_one({"business_id": business_id}) if hasattr(db, "accounting_settings") else None
    invoice_mode = str((accounting or {}).get("invoice_mode") or "churvox_only").strip().lower()
    if invoice_mode not in INVOICE_MODES:
        invoice_mode = "churvox_only"
    if invoice_mode == "myob_external":
        raise HTTPException(status_code=409, detail="Create invoices in MYOB, then sync them back to Churvox.")

    invoice_doc = {
        "invoice_number": payload.get("invoice_number") or f"INV-{int(now.timestamp())}",
        "client_id": payload.get("client_id"),
        "customer_name": payload.get("customer_name") or "",
        "customer_email": payload.get("customer_email") or "",
        "address": payload.get("address") or "",
        "description": payload.get("description") or "",
        "subtotal": to_float(payload.get("subtotal"), 0),
        "gst_rate": to_float(payload.get("gst_rate"), 15),
        "status": payload.get("status") or "draft",
        "pricing_type": payload.get("pricing_type") or "fixed",
        "hourly_rate": to_float(payload.get("hourly_rate"), 0),
        "hours_worked": to_float(payload.get("hours_worked"), 0),
        "extras": payload.get("extras") or [],
        "notes": payload.get("notes") or "",
        "myob_sync_status": payload.get("myob_sync_status") or ("not_synced" if invoice_mode == "myob_sync" else "not_synced"),
        "official_invoice_source": "myob" if invoice_mode == "myob_external" else "churvox",
        "business_id": business_id,
        "owner_id": owner_id,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.invoices.insert_one(invoice_doc)
    iid = str(result.inserted_id)
    await notify(user_id=owner_id, business_id=business_id, type="invoice_created",
                 title="Invoice created",
                 message=invoice_doc.get("customer_name") or f"Invoice #{invoice_doc.get('invoice_number','')}",
                 route=f"/invoices/{iid}", target_type="invoice", target_id=iid)
    try:
        await auto.emit_event(db, "invoice_created", {
            "business_id": str(business_id), "actor": {"id": str(owner_id)},
            "invoice": {"id": iid, "status": invoice_doc.get("status") or "draft",
                        "total": invoice_doc.get("total") or 0,
                        "job_id": str(invoice_doc.get("job_id") or ""),
                        "client_id": str(invoice_doc.get("client_id") or ""),
                        "business_id": str(business_id)},
        })
    except Exception as e:
        print("AUTO_EMIT_ERR invoice_created", e)

    return {
        "success": True,
        "id": iid,
        "message": "Invoice created"
    }


@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _resolve_business_id(current_user)
    owner_id = _resolve_owner_id(current_user)

    try:
        obj_id = ObjectId(invoice_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")

    invoice = await db.invoices.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return _serialize_invoice(invoice)


@api_router.patch("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(invoice_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")

    payload = await request.json()

    invoice = await db.invoices.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_data = {
        "client_id": payload.get("client_id"),
        "customer_name": payload.get("customer_name") or "",
        "customer_email": payload.get("customer_email") or "",
        "address": payload.get("address") or "",
        "description": payload.get("description") or "",
        "subtotal": float(payload.get("subtotal") or 0),
        "gst_rate": float(payload.get("gst_rate") or 15),
        "notes": payload.get("notes") or "",
        "updated_at": datetime.now(timezone.utc),
    }

    await db.invoices.update_one({"_id": obj_id}, {"$set": update_data})
    updated = await db.invoices.find_one({"_id": obj_id})
    return {
        "success": True,
        "id": str(updated.get("_id")),
    }


@api_router.post("/invoices/{invoice_id}/send")
async def send_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(invoice_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")

    invoice = await db.invoices.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    public_token = str(invoice.get("public_token") or "").strip() or secrets.token_urlsafe(20)
    public_invoice_url = f"{FRONTEND_URL}/public/invoice/{public_token}"
    await db.invoices.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": "sent",
            "public_token": public_token,
            "public_invoice_url": public_invoice_url,
            "sent_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    updated = await db.invoices.find_one({"_id": obj_id})
    await notify(user_id=owner_id, business_id=business_id, type="invoice_sent",
                 title="Invoice sent",
                 message=invoice.get("customer_name") or f"Invoice #{invoice.get('invoice_number','')}",
                 route=f"/invoices/{invoice_id}", target_type="invoice", target_id=invoice_id)
    try:
        await auto.emit_event(db, "invoice_sent", {
            "business_id": str(business_id), "actor": {"id": str(owner_id)},
            "invoice": {"id": invoice_id, "status": "sent",
                        "total": invoice.get("total") or 0,
                        "job_id": str(invoice.get("job_id") or ""),
                        "client_id": str(invoice.get("client_id") or ""),
                        "business_id": str(business_id)},
        })
    except Exception as e:
        print("AUTO_EMIT_ERR invoice_sent", e)
    return {"success": True, "data": {
        "id": str(updated.get("_id")),
        "status": updated.get("status") or "sent",
        "public_invoice_url": public_invoice_url,
    }}


@api_router.post("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(invoice_id: str, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(invoice_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")

    invoice = await db.invoices.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    await db.invoices.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": "paid",
            "paid_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    updated = await db.invoices.find_one({"_id": obj_id})
    await notify(user_id=owner_id, business_id=business_id, type="invoice_paid",
                 title="Invoice paid",
                 message=invoice.get("customer_name") or f"Invoice #{invoice.get('invoice_number','')}",
                 route=f"/invoices/{invoice_id}", target_type="invoice", target_id=invoice_id)
    try:
        await auto.emit_event(db, "invoice_paid", {
            "business_id": str(business_id), "actor": {"id": str(owner_id)},
            "invoice": {"id": invoice_id, "status": "paid",
                        "total": invoice.get("total") or 0,
                        "job_id": str(invoice.get("job_id") or ""),
                        "client_id": str(invoice.get("client_id") or ""),
                        "business_id": str(business_id)},
        })
    except Exception as e:
        print("AUTO_EMIT_ERR invoice_paid", e)
    return {"success": True, "data": {
        "id": str(updated.get("_id")),
        "status": updated.get("status") or "paid",
    }}


@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(invoice_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")

    invoice = await db.invoices.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    result = await db.invoices.delete_one({"_id": obj_id})
    if result.deleted_count != 1:
        raise HTTPException(status_code=500, detail="Failed to delete invoice")

    return {"success": True, "message": "Invoice deleted"}


@api_router.get("/public/invoice/{public_token}")
async def public_invoice_view(public_token: str):
    invoice = await db.invoices.find_one({"public_token": public_token})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    subtotal = float(invoice.get("subtotal") or 0)
    gst_rate = float(invoice.get("gst_rate") or 15)
    total = subtotal + (subtotal * gst_rate / 100.0)
    status = str(invoice.get("status") or "draft").lower()
    due_date = invoice.get("due_date")
    if due_date and status in {"sent", "unpaid"}:
        try:
            parsed = datetime.fromisoformat(str(due_date).replace("Z", "+00:00"))
            if parsed < datetime.now(timezone.utc):
                status = "overdue"
        except Exception:
            pass
    return {
        "id": str(invoice.get("_id") or ""),
        "invoice_number": invoice.get("invoice_number") or f"INV-{str(invoice.get('_id') or '')[-6:]}",
        "customer_name": invoice.get("customer_name") or "",
        "description": invoice.get("description") or "",
        "status": status,
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "total": total,
        "due_date": due_date,
        "payment_link": invoice.get("payment_link") or "",
    }

@api_router.get("/quotes")
async def get_quotes(current_user: dict = Depends(get_current_user)):
    # Workers must not see quotes (pricing/financial data).
    if str(current_user.get("role") or "").lower() == "worker":
        return []
    try:
        business_id = str(
            current_user.get("business_id")
            or current_user.get("businessId")
            or current_user.get("id")
            or current_user.get("_id")
            or current_user.get("user_id")
            or ""
        )
        owner_id = str(
            current_user.get("_id")
            or current_user.get("id")
            or current_user.get("user_id")
            or ""
        )

        def safe_iso(value):
            if value is None:
                return None
            if hasattr(value, "isoformat"):
                try:
                    return value.isoformat()
                except Exception:
                    pass
            try:
                return str(value)
            except Exception:
                return None

        query = {
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
            ]
        }

        docs = []
        async for quote in db.quotes.find(query).sort("created_at", -1):
            try:
                docs.append({
                    "id": str(quote.get("_id") or quote.get("id") or ""),
                    "client_id": quote.get("client_id"),
                    "customer_name": quote.get("customer_name") or "",
                    "customer_email": quote.get("customer_email") or "",
                    "address": quote.get("address") or "",
                    "job_type": quote.get("job_type") or "other",
                    "job_description": quote.get("job_description") or "",
                    "price": quote.get("price") or 0,
                    "pricing_type": quote.get("pricing_type") or "fixed",
                    "hourly_rate": quote.get("hourly_rate") or 0,
                    "extras": quote.get("extras") or [],
                    "valid_until": safe_iso(quote.get("valid_until")),
                    "status": quote.get("status") or "draft",
                    "business_id": str(quote.get("business_id")) if quote.get("business_id") is not None else None,
                    "created_at": safe_iso(quote.get("created_at")),
                    "updated_at": safe_iso(quote.get("updated_at")),
                })
            except Exception as e:
                print("QUOTE_ROW_SKIP", str(quote.get("_id")), str(e))
                continue

        return docs
    except Exception as e:
        print("QUOTES_ROUTE_ERROR", str(e), current_user)
        return []





# FORCE_RENDER_BACKEND_REDEPLOY_QUOTES
@api_router.get("/quotes/{quote_id}")
async def get_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(quote_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quote ID")

    quote = await db.quotes.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })

    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    def safe_iso(value):
        if value is None:
            return None
        if hasattr(value, "isoformat"):
            try:
                return value.isoformat()
            except Exception:
                pass
        return str(value)

    return {
        "id": str(quote.get("_id") or quote.get("id") or ""),
        "client_id": quote.get("client_id"),
        "customer_name": quote.get("customer_name") or "",
        "customer_email": quote.get("customer_email") or "",
        "address": quote.get("address") or "",
        "job_type": quote.get("job_type") or "other",
        "job_description": quote.get("job_description") or "",
        "price": float(quote.get("price") or 0),
        "pricing_type": quote.get("pricing_type") or "fixed",
        "hourly_rate": float(quote.get("hourly_rate") or 0),
        "extras": quote.get("extras") or [],
        "valid_until": safe_iso(quote.get("valid_until")),
        "status": quote.get("status") or "draft",
        "public_token": quote.get("public_token") or "",
        "public_quote_url": f"{FRONTEND_URL}/public/quote/{quote.get('public_token')}" if quote.get("public_token") else "",
        "created_at": safe_iso(quote.get("created_at")),
        "updated_at": safe_iso(quote.get("updated_at")),
    }



@api_router.patch("/quotes/{quote_id}")
async def update_quote(quote_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(quote_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quote ID")

    quote = await db.quotes.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    payload = await request.json()

    def to_float(value, default=0):
        try:
            return float(value)
        except Exception:
            return default

    update_data = {
        "client_id": payload.get("client_id"),
        "customer_name": payload.get("customer_name") or "",
        "customer_email": payload.get("customer_email") or "",
        "address": payload.get("address") or "",
        "job_type": payload.get("job_type") or "other",
        "job_description": payload.get("job_description") or "",
        "price": to_float(payload.get("price"), 0),
        "pricing_type": payload.get("pricing_type") or "fixed",
        "hourly_rate": to_float(payload.get("hourly_rate"), 0),
        "extras": payload.get("extras") or [],
        "valid_until": payload.get("valid_until"),
        "status": payload.get("status") or quote.get("status") or "draft",
        "updated_at": datetime.now(timezone.utc),
    }

    await db.quotes.update_one({"_id": obj_id}, {"$set": update_data})

    updated = await db.quotes.find_one({"_id": obj_id})

    def safe_iso(value):
        if value is None:
            return None
        if hasattr(value, "isoformat"):
            try:
                return value.isoformat()
            except Exception:
                pass
        return str(value)

    return {
        "success": True,
        "data": {
            "id": str(updated.get("_id") or updated.get("id") or ""),
            "client_id": updated.get("client_id"),
            "customer_name": updated.get("customer_name") or "",
            "customer_email": updated.get("customer_email") or "",
            "address": updated.get("address") or "",
            "job_type": updated.get("job_type") or "other",
            "job_description": updated.get("job_description") or "",
            "price": float(updated.get("price") or 0),
            "pricing_type": updated.get("pricing_type") or "fixed",
            "hourly_rate": float(updated.get("hourly_rate") or 0),
            "extras": updated.get("extras") or [],
            "valid_until": safe_iso(updated.get("valid_until")),
            "status": updated.get("status") or "draft",
            "created_at": safe_iso(updated.get("created_at")),
            "updated_at": safe_iso(updated.get("updated_at")),
        }
    }

@api_router.post("/quotes/{quote_id}/send")
async def send_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(quote_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quote ID")

    quote = await db.quotes.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })

    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    public_token = str(quote.get("public_token") or "").strip() or secrets.token_urlsafe(20)
    public_quote_url = f"{FRONTEND_URL}/public/quote/{public_token}"
    await db.quotes.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": "sent",
            "public_token": public_token,
            "public_quote_url": public_quote_url,
            "sent_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    await notify(user_id=owner_id, business_id=business_id, type="quote_sent",
                 title="Quote sent", message=quote.get("customer_name") or "Quote sent",
                 route=f"/quotes/{quote_id}", target_type="quote", target_id=quote_id)
    try:
        await auto.emit_event(db, "quote_sent", {
            "business_id": str(business_id), "actor": {"id": str(owner_id)},
            "quote": {"id": quote_id, "status": "sent",
                      "total": quote.get("total") or 0,
                      "client_id": str(quote.get("client_id") or ""),
                      "business_id": str(business_id)},
        })
    except Exception as e:
        print("AUTO_EMIT_ERR quote_sent", e)

    return {
        "success": True,
        "message": "Quote marked as sent",
        "data": {"public_quote_url": public_quote_url},
    }


@api_router.post("/quotes/{quote_id}/accept")
async def accept_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a quote as accepted and fire the quote_accepted automation trigger."""
    from datetime import datetime, timezone

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(quote_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quote ID")

    quote = await db.quotes.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    now = datetime.now(timezone.utc)
    await db.quotes.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": "accepted",
            "accepted_at": now,
            "updated_at": now,
        }}
    )

    await notify(user_id=owner_id, business_id=business_id, type="quote_accepted",
                 title="Quote accepted", message=quote.get("customer_name") or "Quote accepted",
                 route=f"/quotes/{quote_id}", target_type="quote", target_id=quote_id)
    try:
        await auto.emit_event(db, "quote_accepted", {
            "business_id": str(business_id),
            "actor": {"id": str(owner_id), "role": current_user.get("role")},
            "quote": {
                "id": quote_id, "status": "accepted",
                "total": float(quote.get("price") or quote.get("total") or 0),
                "client_id": str(quote.get("client_id") or ""),
                "customer_name": quote.get("customer_name") or "",
                "job_type": quote.get("job_type") or "",
                "business_id": str(business_id),
            },
        })
    except Exception as e:
        print("AUTO_EMIT_ERR quote_accepted", e)

    return {"success": True, "message": "Quote accepted"}




@api_router.post("/quotes/{quote_id}/convert")
async def convert_quote_to_job(quote_id: str, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(quote_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quote ID")

    quote = await db.quotes.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ],
    })
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    existing_job_id = str(quote.get("converted_job_id") or "").strip()
    if existing_job_id:
        return {"success": True, "job_id": existing_job_id, "message": "Quote already linked"}
    quote_status = str(quote.get("status") or "draft").lower()
    if quote_status != "accepted":
        raise HTTPException(status_code=400, detail="Only accepted quotes can be converted to jobs")

    now = datetime.now(timezone.utc)
    job_doc = {
        "title": quote.get("title") or quote.get("job_description") or "Converted Quote Job",
        "job_type": quote.get("job_type") or "other",
        "client_id": quote.get("client_id"),
        "client_name": quote.get("customer_name") or "",
        "customer_name": quote.get("customer_name") or "",
        "address": quote.get("address") or "",
        "country": quote.get("country") or "New Zealand",
        "region": quote.get("region") or "",
        "scheduled_date": quote.get("scheduled_date"),
        "scheduled_time": quote.get("scheduled_time") or "",
        "estimated_duration": int(quote.get("estimated_duration") or 60),
        "price": float(quote.get("price") or 0),
        "pricing_type": quote.get("pricing_type") or "fixed",
        "hourly_rate": float(quote.get("hourly_rate") or 0),
        "extras": quote.get("extras") or [],
        "notes": quote.get("notes") or quote.get("job_description") or "",
        "status": "assigned",
        "quote_id": str(quote.get("_id")),
        "business_id": business_id,
        "owner_id": owner_id,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.jobs.insert_one(job_doc)
    job_id = str(result.inserted_id)

    await db.quotes.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": "accepted" if (quote.get("status") or "draft") != "declined" else quote.get("status"),
            "converted_job_id": job_id,
            "updated_at": now,
        }}
    )

    return {"success": True, "job_id": job_id, "message": "Quote converted to job"}


@api_router.post("/quotes/{quote_id}/decline")
async def decline_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    business_id = str(current_user.get("business_id") or current_user.get("businessId") or current_user.get("id") or current_user.get("_id") or "")
    owner_id = str(current_user.get("_id") or current_user.get("id") or current_user.get("user_id") or "")
    try:
        obj_id = ObjectId(quote_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quote ID")
    quote = await db.quotes.find_one({"_id": obj_id, "$or": [{"business_id": business_id}, {"business_id": str(business_id)}, {"owner_id": owner_id}]})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    now = datetime.now(timezone.utc)
    await db.quotes.update_one({"_id": obj_id}, {"$set": {"status": "declined", "declined_at": now, "updated_at": now}})
    return {"success": True, "message": "Quote declined"}


@api_router.get("/public/quote/{public_token}")
async def public_quote_view(public_token: str):
    quote = await db.quotes.find_one({"public_token": public_token})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {
        "id": str(quote.get("_id") or ""),
        "quote_number": quote.get("quote_number") or f"Q-{str(quote.get('_id') or '')[-6:]}",
        "customer_name": quote.get("customer_name") or "",
        "customer_email": quote.get("customer_email") or "",
        "address": quote.get("address") or "",
        "job_description": quote.get("job_description") or "",
        "price": float(quote.get("price") or 0),
        "status": quote.get("status") or "draft",
        "valid_until": quote.get("valid_until"),
    }


@api_router.post("/public/quote/{public_token}/accept")
async def public_quote_accept(public_token: str):
    quote = await db.quotes.find_one({"public_token": public_token})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    now = datetime.now(timezone.utc)
    await db.quotes.update_one({"_id": quote["_id"]}, {"$set": {"status": "accepted", "accepted_at": now, "updated_at": now}})
    return {"success": True, "status": "accepted"}


@api_router.post("/public/quote/{public_token}/decline")
async def public_quote_decline(public_token: str):
    quote = await db.quotes.find_one({"public_token": public_token})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    now = datetime.now(timezone.utc)
    await db.quotes.update_one({"_id": quote["_id"]}, {"$set": {"status": "declined", "declined_at": now, "updated_at": now}})
    return {"success": True, "status": "declined"}

@api_router.post("/quotes")
async def create_quote(request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    payload = await request.json()

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    if not business_id:
        raise HTTPException(status_code=400, detail="Business ID missing")

    def to_float(value, default=0):
        try:
            return float(value)
        except Exception:
            return default

    quote_doc = {
        "client_id": payload.get("client_id"),
        "customer_name": payload.get("customer_name") or "",
        "customer_email": payload.get("customer_email") or "",
        "address": payload.get("address") or "",
        "job_type": payload.get("job_type") or "other",
        "job_description": payload.get("job_description") or "",
        "price": to_float(payload.get("price"), 0),
        "pricing_type": payload.get("pricing_type") or "fixed",
        "hourly_rate": to_float(payload.get("hourly_rate"), 0),
        "extras": payload.get("extras") or [],
        "valid_until": payload.get("valid_until"),
        "status": payload.get("status") or "draft",
        "business_id": business_id,
        "owner_id": owner_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.quotes.insert_one(quote_doc)
    qid = str(result.inserted_id)
    await notify(user_id=owner_id, business_id=business_id, type="quote_created",
                 title="Quote created", message=quote_doc.get("customer_name") or "New quote",
                 route=f"/quotes/{qid}", target_type="quote", target_id=qid)
    try:
        await auto.emit_event(db, "quote_created", {
            "business_id": str(business_id),
            "actor": {"id": str(owner_id), "role": current_user.get("role")},
            "quote": {"id": qid, "status": quote_doc.get("status"),
                      "total": quote_doc.get("total") or 0,
                      "client_id": str(quote_doc.get("client_id") or ""),
                      "business_id": str(business_id)},
        })
    except Exception as e:
        print("AUTO_EMIT_ERR quote_created", e)

    return {
        "success": True,
        "id": qid,
        "message": "Quote created"
    }



@api_router.post("/clients")
async def create_client(request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    payload = await request.json()

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    if not business_id:
        raise HTTPException(status_code=400, detail="Business ID missing")

    now = datetime.now(timezone.utc)

    client_doc = {
        "name": payload.get("name") or payload.get("client_name") or payload.get("contact_name") or "Unnamed Client",
        "client_name": payload.get("client_name") or payload.get("name") or "",
        "contact_name": payload.get("contact_name") or payload.get("name") or payload.get("client_name") or "",
        "email": payload.get("email") or "",
        "phone": payload.get("phone") or "",
        "address": payload.get("address") or "",
        "notes": payload.get("notes") or "",
        "business_id": business_id,
        "owner_id": owner_id,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.clients.insert_one(client_doc)

    return {
        "success": True,
        "id": str(result.inserted_id),
        "message": "Client created",
    }


@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(client_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid client ID")

    client = await db.clients.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    def safe_iso(value):
        if value is None:
            return None
        if hasattr(value, "isoformat"):
            try:
                return value.isoformat()
            except Exception:
                pass
        return str(value)

    return {
        "id": str(client.get("_id") or client.get("id") or ""),
        "name": client.get("name") or client.get("client_name") or client.get("contact_name") or "Unnamed Client",
        "client_name": client.get("client_name") or client.get("name") or "",
        "contact_name": client.get("contact_name") or "",
        "email": client.get("email") or "",
        "phone": client.get("phone") or "",
        "address": client.get("address") or "",
        "notes": client.get("notes") or "",
        "business_id": str(client.get("business_id")) if client.get("business_id") is not None else None,
        "created_at": safe_iso(client.get("created_at")),
        "updated_at": safe_iso(client.get("updated_at")),
    }


@api_router.patch("/clients/{client_id}")
async def update_client(client_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(client_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid client ID")

    existing = await db.clients.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")

    payload = await request.json()

    update_data = {
        "name": payload.get("name") or payload.get("client_name") or payload.get("contact_name") or existing.get("name") or "Unnamed Client",
        "client_name": payload.get("client_name") or payload.get("name") or existing.get("client_name") or "",
        "contact_name": payload.get("contact_name") or payload.get("name") or existing.get("contact_name") or "",
        "email": payload.get("email") or "",
        "phone": payload.get("phone") or "",
        "address": payload.get("address") or "",
        "notes": payload.get("notes") or "",
        "updated_at": datetime.now(timezone.utc),
    }

    await db.clients.update_one({"_id": obj_id}, {"$set": update_data})

    return {
        "success": True,
        "id": client_id,
        "message": "Client updated",
    }


@api_router.get("/clients/{client_id}/jobs")
async def get_client_jobs(client_id: str, current_user: dict = Depends(get_current_user)):
    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    query = {
        "client_id": client_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    }

    def safe_iso(value):
        if value is None:
            return None
        if hasattr(value, "isoformat"):
            try:
                return value.isoformat()
            except Exception:
                pass
        return str(value)

    docs = []
    async for job in db.jobs.find(query).sort("created_at", -1):
        try:
            docs.append({
                "id": str(job.get("_id") or job.get("id") or ""),
                "title": job.get("title") or "Untitled Job",
                "status": job.get("status") or "assigned",
                "client_id": job.get("client_id"),
                "customer_name": job.get("customer_name") or "",
                "address": job.get("address") or "",
                "scheduled_date": safe_iso(job.get("scheduled_date")),
                "scheduled_time": job.get("scheduled_time") or "",
                "created_at": safe_iso(job.get("created_at")),
                "updated_at": safe_iso(job.get("updated_at")),
            })
        except Exception as e:
            print("CLIENT_JOB_ROW_SKIP", str(job.get("_id")), str(e))
            continue

    return docs

@api_router.get("/clients")
async def get_clients(current_user: dict = Depends(get_current_user)):
    # Workers must not see the client list. Client name still appears on each
    # job via the per-job customer_name/client_name fields.
    if str(current_user.get("role") or "").lower() == "worker":
        return []
    try:
        business_id = str(
            current_user.get("business_id")
            or current_user.get("businessId")
            or current_user.get("id")
            or current_user.get("_id")
            or current_user.get("user_id")
            or ""
        )
        owner_id = str(
            current_user.get("_id")
            or current_user.get("id")
            or current_user.get("user_id")
            or ""
        )

        def safe_iso(value):
            if value is None:
                return None
            if hasattr(value, "isoformat"):
                try:
                    return value.isoformat()
                except Exception:
                    pass
            try:
                return str(value)
            except Exception:
                return None

        query = {
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
            ]
        }

        docs = []
        async for client in db.clients.find(query).sort("created_at", -1):
            try:
                docs.append({
                    "id": str(client.get("id") or client.get("_id") or ""),
                    "name": client.get("name") or client.get("client_name") or client.get("contact_name") or "Unnamed Client",
                    "client_name": client.get("client_name") or client.get("name") or "",
                    "contact_name": client.get("contact_name") or "",
                    "email": client.get("email") or "",
                    "phone": client.get("phone") or "",
                    "address": client.get("address") or "",
                    "notes": client.get("notes") or "",
                    "business_id": str(client.get("business_id")) if client.get("business_id") is not None else None,
                    "created_at": safe_iso(client.get("created_at")),
                    "updated_at": safe_iso(client.get("updated_at")),
                })
            except Exception as e:
                print("CLIENT_ROW_SKIP", str(client.get("_id")), str(e))
                continue

        return docs
    except Exception as e:
        print("CLIENTS_ROUTE_ERROR", str(e), current_user)
        return []




@api_router.post("/team/workers")
async def create_team_worker(payload: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    name = str((payload or {}).get("name") or "").strip()
    email = str((payload or {}).get("email") or "").strip().lower()
    phone = str((payload or {}).get("phone") or "").strip()
    country = str((payload or {}).get("country") or "").strip()
    region = str((payload or {}).get("region") or (payload or {}).get("state") or "").strip()
    invite_role = str((payload or {}).get("role") or "worker").strip().lower()

    valid_roles = {"worker", "manager", "office_admin", "payroll"}
    if invite_role not in valid_roles:
        invite_role = "worker"

    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    existing = await db.business_users.find_one({
        "email": email,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if existing:
        existing_role = str(existing.get("role") or "worker").replace("_", " ").title()
        raise HTTPException(
            status_code=400,
            detail=f"A team member with this email already exists ({existing_role})"
        )

    now = datetime.utcnow()
    worker_doc = {
        "name": name,
        "email": email,
        "phone": phone,
        "country": country,
        "region": region,
        "role": invite_role,
        "status": "invited",
        "business_id": business_id,
        "owner_id": owner_id,
        "notes": "",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.business_users.insert_one(worker_doc)
    await db.business_users.update_one(
        {"_id": result.inserted_id},
        {"$set": {"id": str(result.inserted_id)}}
    )

    # Save succeeded. Email send is best-effort and MUST NOT block the response.
    try:
        invite_token = str(result.inserted_id)
        invite_link = f"{FRONTEND_URL}/invite/setup/{invite_token}"
        biz_name = str(current_user.get("business_name") or "").strip()
        inv_subject, inv_html = build_invite_email(
            name=name,
            invite_link=invite_link,
            business_name=biz_name,
            role=invite_role,
        )
        await send_email(to_email=email, subject=inv_subject, html_content=inv_html)
        print(f"TEAM_INVITE_EMAIL_SENT to={email} role={invite_role}")
    except Exception as e:
        print(f"TEAM_INVITE_EMAIL_ERROR to={email} role={invite_role} error={repr(e)}")

    await notify(
        user_id=owner_id, business_id=business_id, type="team_invite_sent",
        title=f"{invite_role.replace('_',' ').title()} invited",
        message=f"Invite sent to {email}",
        route="/team", target_type="team_member", target_id=str(result.inserted_id),
    )
    try:
        await auto.emit_event(db, "team_member_invited", {
            "business_id": str(business_id),
            "actor": {"id": str(owner_id), "role": current_user.get("role")},
            "team_member": {"id": str(result.inserted_id), "email": email,
                            "role": invite_role, "business_id": str(business_id)},
        })
    except Exception as e:
        print("AUTO_EMIT_ERR team_member_invited", e)

    return {
        "success": True,
        "message": f"{invite_role.replace('_', ' ').title()} invited",
        "worker": {
            "id": str(result.inserted_id),
            "name": name,
            "email": email,
            "phone": phone,
            "country": country,
            "region": region,
            "role": invite_role,
            "status": "invited",
            "notes": "",
        }
    }

@api_router.patch("/team/workers/{worker_id}/notes")
async def update_team_worker_notes(worker_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    payload = await request.json()
    notes = str(payload.get("notes") or "").strip()

    worker = None
    try:
        if len(str(worker_id)) == 24:
            worker = await db.business_users.find_one({
                "_id": ObjectId(worker_id),
                "role": "worker",
                "$or": [
                    {"business_id": business_id},
                    {"business_id": str(business_id)},
                    {"owner_id": owner_id},
                ]
            })
    except Exception:
        worker = None

    if not worker:
        worker = await db.business_users.find_one({
            "id": worker_id,
            "role": "worker",
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
            ]
        })

    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    await db.business_users.update_one(
        {"_id": worker.get("_id")},
        {"$set": {"notes": notes, "updated_at": datetime.utcnow(), "id": str(worker.get("_id"))}}
    )

    return {"success": True, "notes": notes, "message": "Worker notes saved"}



@api_router.patch("/team/workers/{worker_id}")
async def update_team_worker(worker_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    user_role = str(current_user.get("role") or "").strip().lower()
    if user_role not in BUSINESS_ROLES and not current_user.get("is_admin") and not current_user.get("is_owner"):
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    update_data = {"updated_at": datetime.utcnow()}

    if "country" in payload:
        update_data["country"] = str(payload.get("country") or "New Zealand").strip() or "New Zealand"

    if "region" in payload:
        update_data["region"] = str(payload.get("region") or "").strip()

    if "name" in payload:
        update_data["name"] = str(payload.get("name") or "").strip()

    if "email" in payload:
        update_data["email"] = str(payload.get("email") or "").strip().lower()

    if "phone" in payload:
        update_data["phone"] = str(payload.get("phone") or "").strip()

    if "notes" in payload:
        update_data["notes"] = str(payload.get("notes") or "").strip()

    id_queries = [{"id": worker_id}]
    try:
        id_queries.append({"_id": ObjectId(worker_id)})
    except Exception:
        pass

    scope_queries = []
    if business_id:
        scope_queries.append({"business_id": business_id})
        scope_queries.append({"business_id": str(business_id)})
    if owner_id:
        scope_queries.append({"owner_id": owner_id})

    worker_query = {"$or": id_queries}
    if scope_queries:
        worker_query = {
            "$and": [
                {"$or": id_queries},
                {"$or": scope_queries}
            ]
        }

    worker = await db.business_users.find_one(worker_query)

    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    worker_role = str(worker.get("role") or "").strip().lower()
    if worker_role in ["owner", "admin", "employer"]:
        raise HTTPException(status_code=400, detail="Cannot update owner/admin from worker panel")

    await db.business_users.update_one(
        {"_id": worker["_id"]},
        {"$set": update_data}
    )

    updated_worker = await db.business_users.find_one({"_id": worker["_id"]})
    if not updated_worker:
        raise HTTPException(status_code=404, detail="Worker not found after update")

    return {
        "success": True,
        "data": {
            "id": str(updated_worker.get("id") or updated_worker.get("_id") or ""),
            "name": updated_worker.get("name", ""),
            "email": updated_worker.get("email", ""),
            "phone": updated_worker.get("phone", ""),
            "country": updated_worker.get("country", "New Zealand"),
            "region": updated_worker.get("region") or updated_worker.get("state") or "",
            "notes": updated_worker.get("notes", ""),
            "status": updated_worker.get("status", "active"),
        }
    }


@api_router.get("/team/workers")
async def get_team_workers(current_user: dict = Depends(get_current_user)):
    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    def safe_iso(value):
        if value is None:
            return None
        if hasattr(value, "isoformat"):
            try:
                return value.isoformat()
            except Exception:
                pass
        try:
            return str(value)
        except Exception:
            return None

    query = {
        "role": {"$in": ["worker", "manager", "office_admin", "payroll"]},
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    }

    docs = []
    async for worker in db.business_users.find(query).sort("created_at", -1):
        try:
            worker_id = str(worker.get("id") or worker.get("_id") or "")
            assigned_jobs = []
            if worker_id:
                # Cheap per-worker lookup — keeps the existing Team UI populated
                async for j in db.jobs.find({
                    "assigned_worker_id": worker_id,
                    "$or": [
                        {"business_id": business_id},
                        {"business_id": str(business_id)},
                        {"owner_id": owner_id},
                    ]
                }).sort("scheduled_date", -1).limit(50):
                    assigned_jobs.append({
                        "id": str(j.get("_id")),
                        "title": j.get("title") or j.get("job_type") or "Job",
                        "job_type": j.get("job_type"),
                        "client_name": j.get("client_name") or j.get("customer_name") or "",
                        "address": j.get("address") or "",
                        "status": j.get("status") or "assigned",
                        "scheduled_date": safe_iso(j.get("scheduled_date")),
                    })

            docs.append({
                "id": worker_id,
                "name": worker.get("name") or "Unnamed Worker",
                "email": worker.get("email") or "",
                "phone": worker.get("phone") or "",
                "country": worker.get("country") or "",
                "region": worker.get("region") or worker.get("state") or "",
                "city": worker.get("city") or "",
                "notes": worker.get("notes") or "",
                "role": worker.get("role", "worker"),
                "status": worker.get("status", "invited"),
                "assigned_jobs": assigned_jobs,
                "business_id": str(worker.get("business_id")) if worker.get("business_id") is not None else None,
                "created_at": safe_iso(worker.get("created_at")),
                "updated_at": safe_iso(worker.get("updated_at")),
            })
        except Exception as e:
            print("WORKER_ROW_SKIP", str(worker.get("_id")), str(e))
            continue

    return docs




@api_router.get("/reports/summary")
async def reports_summary(range: str = "this_month", current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    if role not in {"owner", "manager", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not authorized")
    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )
    query = {"$or": [
        {"business_id": business_id},
        {"business_id": str(business_id)},
        {"owner_id": owner_id},
    ]}
    now = datetime.now(timezone.utc)
    first_day_this_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    if now.month == 1:
        first_day_last_month = datetime(now.year - 1, 12, 1, tzinfo=timezone.utc)
    else:
        first_day_last_month = datetime(now.year, now.month - 1, 1, tzinfo=timezone.utc)

    first_day_next_month = datetime(now.year + (1 if now.month == 12 else 0), 1 if now.month == 12 else now.month + 1, 1, tzinfo=timezone.utc)
    range_key = str(range or "this_month").strip().lower()
    if range_key == "last_month":
        period_start = first_day_last_month
        period_end = first_day_this_month
    else:
        range_key = "this_month"
        period_start = first_day_this_month
        period_end = first_day_next_month

    def _to_dt(v):
        if not v:
            return None
        if isinstance(v, datetime):
            return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        try:
            return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        except Exception:
            return None

    def _num(v, default=0.0):
        try:
            return float(v)
        except Exception:
            return default

    revenue = 0.0
    outstanding = 0.0
    overdue_invoices = 0
    paid_invoices = 0
    invoice_status_breakdown = {}
    myob_sync_issues = 0
    top_clients_map = {}
    overdue_jobs = 0
    completed_jobs = 0
    active_jobs = 0
    jobs_by_status = {}
    worker_hours = 0.0
    recurring_jobs_due = 0
    quote_status_breakdown = {}
    quotes_total = 0
    quotes_won = 0
    quotes_closed = 0

    today_iso = now.date().isoformat()

    async for inv in db.invoices.find(query):
        total = _num(inv.get("total"), _num(inv.get("subtotal"), 0.0))
        status = str(inv.get("status") or "draft").strip().lower()
        invoice_status_breakdown[status] = int(invoice_status_breakdown.get(status, 0)) + 1

        paid_at = _to_dt(inv.get("paid_at")) or _to_dt(inv.get("updated_at")) or _to_dt(inv.get("created_at"))
        if status == "paid":
            paid_invoices += 1
            if paid_at and period_start <= paid_at < period_end:
                revenue += total
        elif status in {"draft", "sent", "overdue", "unpaid"}:
            outstanding += total

        due_date = _to_dt(inv.get("due_date"))
        if status in {"sent", "unpaid", "overdue"} and due_date and due_date < now:
            overdue_invoices += 1
        elif status == "overdue":
            overdue_invoices += 1

        if str(inv.get("myob_sync_status") or "").lower() in {"failed", "setup_required"}:
            myob_sync_issues += 1

        client_key = str(inv.get("client_id") or inv.get("customer_name") or "unknown")
        if client_key not in top_clients_map:
            top_clients_map[client_key] = {
                "client_id": str(inv.get("client_id") or ""),
                "client_name": str(inv.get("customer_name") or "Unknown client"),
                "revenue": 0.0,
                "jobs": 0,
            }
        if status == "paid":
            top_clients_map[client_key]["revenue"] += total

    async for q in db.quotes.find(query):
        status = str(q.get("status") or "draft").strip().lower()
        quote_status_breakdown[status] = int(quote_status_breakdown.get(status, 0)) + 1
        quotes_total += 1
        if status == "accepted":
            quotes_won += 1
            quotes_closed += 1
        elif status == "declined":
            quotes_closed += 1

    async for j in db.jobs.find(query):
        st = str(j.get("status") or "draft").strip().lower()
        jobs_by_status[st] = int(jobs_by_status.get(st, 0)) + 1
        if st == "completed":
            completed_jobs += 1
        if st in {"assigned", "acknowledged", "in_progress", "paused", "scheduled"}:
            active_jobs += 1

        scheduled_date = str(j.get("scheduled_date") or "")[:10]
        if st not in {"completed", "cancelled"} and scheduled_date and scheduled_date < today_iso:
            overdue_jobs += 1

        worker_hours += (_num(j.get("total_time_seconds"), 0.0) / 3600.0)

        next_recur = _to_dt(j.get("recurrence_next_date"))
        if bool(j.get("is_recurring")) and next_recur and next_recur < period_end:
            recurring_jobs_due += 1

        client_key = str(j.get("client_id") or j.get("customer_name") or j.get("client_name") or "unknown")
        if client_key not in top_clients_map:
            top_clients_map[client_key] = {
                "client_id": str(j.get("client_id") or ""),
                "client_name": str(j.get("customer_name") or j.get("client_name") or "Unknown client"),
                "revenue": 0.0,
                "jobs": 0,
            }
        top_clients_map[client_key]["jobs"] += 1

    payroll_hours = 0.0
    if hasattr(db, "payroll_timesheets"):
        try:
            async for ts in db.payroll_timesheets.find(query):
                payroll_hours += _num(ts.get("hours"), 0.0)
        except Exception:
            payroll_hours = 0.0

    top_clients = sorted(
        [v for v in top_clients_map.values() if v.get("client_name")],
        key=lambda x: (float(x.get("revenue") or 0), int(x.get("jobs") or 0)),
        reverse=True,
    )[:5]

    return {
        "range": range_key,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "revenue_this_month": round(revenue, 2),
        "outstanding_invoices": round(outstanding, 2),
        "overdue_invoices": overdue_invoices,
        "paid_invoices": paid_invoices,
        "completed_jobs": completed_jobs,
        "active_jobs": active_jobs,
        "quote_win_rate": (quotes_won / quotes_closed) if quotes_closed else 0,
        "overdue_jobs": overdue_jobs,
        "worker_hours": round(worker_hours, 2),
        "payroll_hours_summary": round(payroll_hours if payroll_hours > 0 else worker_hours, 2),
        "invoice_status_breakdown": invoice_status_breakdown,
        "quote_status_breakdown": quote_status_breakdown,
        "jobs_by_status": jobs_by_status,
        "top_clients": top_clients,
        "recurring_jobs_due": recurring_jobs_due,
        "myob_sync_issues": myob_sync_issues,
    }


@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(quote_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quote ID")

    quote = await db.quotes.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    result = await db.quotes.delete_one({"_id": obj_id})
    if result.deleted_count != 1:
        raise HTTPException(status_code=500, detail="Failed to delete quote")

    return {"success": True, "message": "Quote deleted"}

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    try:
        business_id = str(
            current_user.get("business_id")
            or current_user.get("businessId")
            or current_user.get("id")
            or current_user.get("_id")
            or current_user.get("user_id")
            or ""
        )
        owner_id = str(
            current_user.get("_id")
            or current_user.get("id")
            or current_user.get("user_id")
            or ""
        )

        base_query = {"$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]}

        clients = await db.clients.count_documents(base_query)
        jobs = await db.jobs.count_documents(base_query)
        invoices = await db.invoices.count_documents(base_query)
        team_query = {
            "role": "worker",
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
            ]
        }
        team_count = await db.business_users.count_documents(team_query)

        return {
            "jobs_today": 0,
            "jobs_this_week": 0,
            "completed": 0,
            "revenue": 0,
            "pending_invoices": invoices,
            "clients": clients,
            "team_count": team_count,
            "jobs": jobs,
            "invoices": invoices,
        }
    except Exception as e:
        print("DASHBOARD_STATS_ERROR", str(e), current_user)
        return {
            "jobs_today": 0,
            "jobs_this_week": 0,
            "completed": 0,
            "revenue": 0,
            "pending_invoices": 0,
            "clients": 0,
            "team_count": 0,
            "jobs": 0,
            "invoices": 0,
        }



@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    query = {
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    }

    if len(str(job_id)) == 24:
        try:
            query["_id"] = ObjectId(job_id)
            result = await db.jobs.delete_one(query)
            if result.deleted_count == 1:
                return {"success": True, "message": "Job deleted"}
        except Exception:
            pass

    query.pop("_id", None)
    query["id"] = job_id
    result = await db.jobs.delete_one(query)

    if result.deleted_count != 1:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"success": True, "message": "Job deleted"}


@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    try:
        business_id = str(
            current_user.get("business_id")
            or current_user.get("businessId")
            or current_user.get("id")
            or current_user.get("_id")
            or current_user.get("user_id")
            or ""
        )
        owner_id = str(
            current_user.get("_id")
            or current_user.get("id")
            or current_user.get("user_id")
            or ""
        )

        try:
            obj_id = ObjectId(job_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid job ID")

        role = str(current_user.get("role") or "").lower()
        query = {
            "_id": obj_id,
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
            ]
        }

        job = await db.jobs.find_one(query)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if role == "worker":
            current_email = str(current_user.get("email") or "").strip().lower()
            assigned_worker_id = str(job.get("assigned_worker_id") or "")
            assigned_worker_email = str(job.get("assigned_worker_email") or "").strip().lower()
            worker_match = False
            if assigned_worker_id:
                current_ids = {
                    str(current_user.get("_id") or ""),
                    str(current_user.get("id") or ""),
                    str(current_user.get("user_id") or ""),
                }
                if assigned_worker_id in current_ids:
                    worker_match = True
                if not worker_match:
                    buser = await db.business_users.find_one({"email": current_email, "role": "worker"})
                    if buser:
                        buser_ids = {str(buser.get("_id")), str(buser.get("id") or "")}
                        if assigned_worker_id in buser_ids:
                            worker_match = True
            if assigned_worker_email and current_email and assigned_worker_email == current_email:
                worker_match = True
            if not worker_match:
                raise HTTPException(status_code=403, detail="This job is not assigned to you")

        def safe_iso(value):
            if value is None:
                return None
            if hasattr(value, "isoformat"):
                try:
                    return value.isoformat()
                except Exception:
                    pass
            return str(value)

        _strip_for_worker = (role == "worker")
        response = {
            "id": str(job.get("_id") or job.get("id") or ""),
            "title": job.get("title") or "Untitled Job",
            "job_type": job.get("job_type") or "other",
            "client_id": job.get("client_id"),
            "client_name": job.get("client_name") or job.get("customer_name") or "",
            "customer_name": job.get("customer_name") or job.get("client_name") or "",
            "address": job.get("address") or "",
            "country": job.get("country") or "",
            "region": job.get("region") or job.get("state") or "",
            "city": job.get("city") or "",
            "scheduled_date": safe_iso(job.get("scheduled_date")),
            "scheduled_time": job.get("scheduled_time") or "",
            "estimated_duration": job.get("estimated_duration") or 60,
            "price": 0 if _strip_for_worker else (job.get("price") or 0),
            "pricing_type": "" if _strip_for_worker else (job.get("pricing_type") or "fixed"),
            "hourly_rate": 0 if _strip_for_worker else (job.get("hourly_rate") or 0),
            "extras": [] if _strip_for_worker else (job.get("extras") or []),
            "notes": job.get("notes") or "",
            "worker_notes": job.get("worker_notes") or "",
            "assigned_worker_id": job.get("assigned_worker_id"),
            "assigned_worker_name": job.get("assigned_worker_name") or "",
            "status": job.get("status") or "assigned",
            "accepted_at": safe_iso(job.get("accepted_at") or job.get("acknowledged_at")),
            "started_at": safe_iso(job.get("started_at") or job.get("in_progress_at")),
            "completed_at": safe_iso(job.get("completed_at")),
            "time_spent_minutes": job.get("time_spent_minutes") or job.get("total_minutes") or 0,
            "quote_id": "" if _strip_for_worker else str(job.get("quote_id") or ""),
            "invoice_id": "" if _strip_for_worker else str(job.get("invoice_id") or ""),
            "updated_at": safe_iso(job.get("updated_at")),
            "is_recurring": bool(job.get("is_recurring") or False),
            "recurring_frequency": job.get("recurring_frequency"),
            "custom_repeat_days": job.get("custom_repeat_days"),
            "photos": job.get("photos") or [],
            "business_id": str(job.get("business_id")) if job.get("business_id") is not None else None,
            "created_at": safe_iso(job.get("created_at")),
            "updated_at": safe_iso(job.get("updated_at")),
        }
        if role != "worker":
            response.update({
                "start_lat": job.get("start_lat"),
                "start_lng": job.get("start_lng"),
                "location_status": job.get("location_status") or "",
                "location_captured_at": safe_iso(job.get("location_captured_at")),
            })
        return response
    except HTTPException:
        raise
    except Exception as e:
        print("JOB_DETAIL_ROUTE_ERROR", str(e), job_id, current_user)
        raise HTTPException(status_code=500, detail="Failed to load job")

@api_router.get("/jobs")
async def get_jobs(current_user: dict = Depends(get_current_user)):
    try:
        business_id = str(
            current_user.get("business_id")
            or current_user.get("businessId")
            or current_user.get("id")
            or current_user.get("_id")
            or current_user.get("user_id")
            or ""
        )
        owner_id = str(
            current_user.get("_id")
            or current_user.get("id")
            or current_user.get("user_id")
            or ""
        )
        current_role = str(current_user.get("role") or "").lower()
        current_email = str(current_user.get("email") or "").strip().lower()

        def safe_iso(value):
            if value is None:
                return None
            if hasattr(value, "isoformat"):
                try:
                    return value.isoformat()
                except Exception:
                    pass
            return str(value)

        query = {
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
            ]
        }

        if current_role == "worker":
            worker_ids = set()
            async for buser in db.business_users.find({"email": current_email, "role": "worker"}):
                worker_ids.add(str(buser.get("_id")))
                if buser.get("id"):
                    worker_ids.add(str(buser.get("id")))
            worker_ids.add(owner_id)
            if worker_ids:
                query["assigned_worker_id"] = {"$in": list(worker_ids)}
            else:
                return []

        jobs = []
        # Workers must not see pricing/financial fields on their jobs.
        _strip_for_worker = (current_role == "worker")
        async for job in db.jobs.find(query).sort("created_at", -1):
            jobs.append({
                "id": str(job.get("_id") or job.get("id") or ""),
                "title": job.get("title") or "Untitled Job",
                "job_type": job.get("job_type") or "other",
                "client_id": job.get("client_id"),
                "customer_name": job.get("customer_name") or "",
                "address": job.get("address") or "",
                "scheduled_date": safe_iso(job.get("scheduled_date")),
                "scheduled_time": job.get("scheduled_time") or "",
                "estimated_duration": job.get("estimated_duration") or 60,
                "price": 0 if _strip_for_worker else (job.get("price") or 0),
                "pricing_type": "" if _strip_for_worker else (job.get("pricing_type") or "fixed"),
                "hourly_rate": 0 if _strip_for_worker else (job.get("hourly_rate") or 0),
                "extras": [] if _strip_for_worker else (job.get("extras") or []),
                "notes": job.get("notes") or "",
                "assigned_worker_id": job.get("assigned_worker_id"),
                "status": job.get("status") or "assigned",
                "invoice_id": "" if _strip_for_worker else str(job.get("invoice_id") or ""),
                "draft_invoice_id": "" if _strip_for_worker else str(job.get("draft_invoice_id") or ""),
                "invoice_created": False if _strip_for_worker else bool(job.get("invoice_created") or False),
                "invoiced": False if _strip_for_worker else bool(job.get("invoiced") or False),
                "invoice_status": "" if _strip_for_worker else (job.get("invoice_status") or ""),
                "ai_invoice_description": "" if _strip_for_worker else (job.get("ai_invoice_description") or ""),
                "invoice_description_draft": "" if _strip_for_worker else (job.get("invoice_description_draft") or ""),
                "is_recurring": bool(job.get("is_recurring") or False),
                "recurring_frequency": job.get("recurring_frequency"),
                "custom_repeat_days": job.get("custom_repeat_days"),
                "business_id": str(job.get("business_id")) if job.get("business_id") is not None else None,
                "created_at": safe_iso(job.get("created_at")),
                "updated_at": safe_iso(job.get("updated_at")),
            })
        return jobs
    except Exception as e:
        print("JOBS_ROUTE_ERROR", str(e), current_user)
        return []

@api_router.post("/jobs")
async def create_job(request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    payload = await request.json()

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    if not business_id:
        raise HTTPException(status_code=400, detail="Business ID missing")

    def to_int(value, default=0):
        try:
            return int(value)
        except Exception:
            return default

    def to_float(value, default=0):
        try:
            return float(value)
        except Exception:
            return default

    job_doc = {
        "title": payload.get("title") or "Untitled Job",
        "job_type": payload.get("job_type") or "other",
        "client_id": payload.get("client_id"),
        "client_name": payload.get("client_name") or "",
        "customer_name": payload.get("customer_name") or "",
        "address": payload.get("address") or "",
        "country": str(payload.get("country") or "New Zealand").strip() or "New Zealand",
        "region": str(payload.get("region") or "").strip(),
        "scheduled_date": payload.get("scheduled_date"),
        "scheduled_time": payload.get("scheduled_time") or "",
        "estimated_duration": to_int(payload.get("estimated_duration"), 60),
        "price": to_float(payload.get("price"), 0),
        "pricing_type": payload.get("pricing_type") or "fixed",
        "hourly_rate": to_float(payload.get("hourly_rate"), 0),
        "extras": payload.get("extras") or [],
        "notes": payload.get("notes") or "",
        "assigned_worker_id": payload.get("assigned_worker_id"),
        "is_recurring": bool(payload.get("is_recurring") or False),
        "recurring_frequency": payload.get("recurring_frequency"),
        "custom_repeat_days": payload.get("custom_repeat_days"),
        "status": payload.get("status") or "assigned",
        "business_id": business_id,
        "owner_id": owner_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.jobs.insert_one(job_doc)
    job_id_str = str(result.inserted_id)

    # Notifications: alert assigned worker (if any) that a job was assigned to them
    assigned_wid = str(payload.get("assigned_worker_id") or "").strip()
    if assigned_wid:
        await notify(
            user_id=assigned_wid,
            business_id=business_id,
            type="job_assigned",
            title="New job assigned",
            message=job_doc.get("title") or "You've been assigned a job",
            route=f"/worker/jobs/{job_id_str}",
            target_type="job",
            target_id=job_id_str,
        )

    # Automation event emit
    try:
        await auto.emit_event(db, "job_assigned", {
            "business_id": str(business_id),
            "actor": {"id": str(owner_id), "role": current_user.get("role"), "email": current_user.get("email")},
            "job": {
                "id": job_id_str, "title": job_doc.get("title"),
                "status": job_doc.get("status"), "client_id": str(job_doc.get("client_id") or ""),
                "worker_id": assigned_wid, "business_id": str(business_id),
                "job_type": job_doc.get("job_type"), "region": job_doc.get("region"),
                "address": job_doc.get("address"),
            },
        })
    except Exception as e:
        print("AUTO_EMIT_ERR job_assigned", e)

    return {
        "success": True,
        "id": job_id_str,
        "message": "Job created"
    }

@api_router.get("/jobs/today")
async def get_jobs_today(current_user: dict = Depends(get_current_user)):
    try:
        business_id = str(
            current_user.get("business_id")
            or current_user.get("businessId")
            or current_user.get("id")
            or current_user.get("_id")
            or current_user.get("user_id")
            or ""
        )
        owner_id = str(
            current_user.get("_id")
            or current_user.get("id")
            or current_user.get("user_id")
            or ""
        )
        query = {"$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]}
        docs = []
        async for job in db.jobs.find(query).sort("created_at", -1).limit(20):
            try:
                docs.append(make_json_safe(job))
            except Exception as row_err:
                print("JOB_TODAY_ROW_SKIP", str(job.get("_id")), str(row_err))
                continue
        return docs
    except Exception as e:
        print("JOBS_TODAY_ERROR", str(e), current_user)
        return []


@api_router.get("/jobs/week")
async def get_jobs_week(current_user: dict = Depends(get_current_user)):
    try:
        business_id = str(
            current_user.get("business_id")
            or current_user.get("businessId")
            or current_user.get("id")
            or current_user.get("_id")
            or current_user.get("user_id")
            or ""
        )
        owner_id = str(
            current_user.get("_id")
            or current_user.get("id")
            or current_user.get("user_id")
            or ""
        )
        query = {"$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]}
        docs = []
        async for job in db.jobs.find(query).sort("created_at", -1).limit(50):
            try:
                docs.append(make_json_safe(job))
            except Exception as row_err:
                print("JOB_WEEK_ROW_SKIP", str(job.get("_id")), str(row_err))
                continue
        return docs
    except Exception as e:
        print("JOBS_WEEK_ERROR", str(e), current_user)
        return []


@api_router.delete("/team/workers/{worker_id}")
async def delete_team_worker(worker_id: str, current_user: dict = Depends(get_current_user)):
    # Role safety — only business owners/managers can delete team members
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    # Match the SAME team-member roles the GET /team/workers returns (worker, manager,
    # office_admin, payroll) and handle both legacy string `id` and Mongo ObjectId `_id`.
    id_or: list = [{"id": worker_id}]
    try:
        id_or.append({"_id": ObjectId(worker_id)})
    except Exception:
        # worker_id isn't a valid ObjectId (e.g. legacy invite UUID) — just skip _id branch
        pass

    query = {
        "role": {"$in": ["worker", "manager", "office_admin", "payroll"]},
        "$and": [
            {"$or": id_or},
            {"$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
            ]},
        ],
    }

    worker = await db.business_users.find_one(query)
    if not worker:
        raise HTTPException(status_code=404, detail="Team member not found in this business")

    await db.business_users.delete_one({"_id": worker.get("_id")})
    return {
        "success": True,
        "message": "Team member removed",
        "id": str(worker.get("id") or worker.get("_id") or ""),
        "role": worker.get("role"),
    }



@api_router.patch("/jobs/{job_id}")
async def update_job(job_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    current_role = str(current_user.get("role") or "").lower()
    if current_role not in BUSINESS_ROLES | {"worker"}:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")

    existing = await db.jobs.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")

    payload = await request.json()
    now = datetime.now(timezone.utc)

    if current_role == "worker":
        new_status = str(payload.get("status") or "").strip().lower()
        worker_notes = payload.get("worker_notes")
        new_photos = payload.get("photos")
        start_lat = payload.get("start_lat")
        start_lng = payload.get("start_lng")
        start_accuracy = payload.get("start_accuracy_meters")
        end_lat = payload.get("end_lat")
        end_lng = payload.get("end_lng")
        end_accuracy = payload.get("end_accuracy_meters")
        location_status = payload.get("location_status")

        if (
            not new_status
            and worker_notes is None
            and new_photos is None
            and start_lat is None
            and start_lng is None
        ):
            raise HTTPException(status_code=403, detail="Workers can only update status, notes, photos, or start location")

        update_fields = {"updated_at": now}
        if new_status:
            allowed_statuses = ["acknowledged", "in_progress", "paused", "completed"]
            if new_status not in allowed_statuses:
                raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {', '.join(allowed_statuses)}")
            update_fields["status"] = new_status
            if new_status == "acknowledged":
                update_fields["accepted_at"] = now
            elif new_status == "in_progress":
                update_fields["started_at"] = now
            elif new_status == "completed":
                update_fields["completed_at"] = now
                client_name = _safe_text(existing.get("client_name") or existing.get("customer_name"))
                draft_description = _format_invoice_description_from_job({**existing, **update_fields}, client_name)
                update_fields["invoice_description_draft"] = draft_description
                update_fields["ai_invoice_description"] = draft_description
        if worker_notes is not None:
            update_fields["worker_notes"] = str(worker_notes).strip()
        if new_photos is not None:
            # Explicit validation — never silently drop. Fail the whole request with a
            # clear error so the frontend can show it. An empty list is a valid "remove all".
            if not isinstance(new_photos, list):
                raise HTTPException(status_code=400, detail="photos must be an array")
            if len(new_photos) > 10:
                raise HTTPException(status_code=400, detail="Maximum 10 photos per job")
            validated_photos = []
            for idx, p in enumerate(new_photos):
                if not isinstance(p, str) or not p.startswith("data:image/"):
                    raise HTTPException(status_code=400, detail=f"Photo #{idx + 1} is not a valid image data URL")
                # base64 chars — cap roughly matches a ~4MB image after encoding
                if len(p) > 6_000_000:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Photo #{idx + 1} is too large. Please choose an image under ~4MB.",
                    )
                validated_photos.append(p)
            update_fields["photos"] = validated_photos
        timeline = list(existing.get("job_visit_timeline") or [])
        if new_status == "paused":
            timeline.append({"type": "paused", "label": "Worker paused job", "timestamp": now})
        if new_status == "in_progress" and str(existing.get("status") or "").lower() == "paused":
            timeline.append({"type": "resumed", "label": "Worker resumed job", "timestamp": now})

        if new_status == "in_progress":
            if start_lat is not None and start_lng is not None:
                try:
                    slat, slng = float(start_lat), float(start_lng)
                    update_fields["start_location_lat"] = slat
                    update_fields["start_location_lng"] = slng
                    update_fields["start_location_accuracy_meters"] = float(start_accuracy) if start_accuracy is not None else None
                    update_fields["job_location_lat"] = existing.get("job_location_lat")
                    update_fields["job_location_lng"] = existing.get("job_location_lng")
                    distance = _haversine_meters(slat, slng, existing.get("job_location_lat"), existing.get("job_location_lng")) if existing.get("job_location_lat") is not None and existing.get("job_location_lng") is not None else None
                    start_status = _visit_status_for_distance(distance)
                    update_fields["start_distance_from_site_meters"] = distance
                    update_fields["start_location_status"] = start_status
                    timeline.append({"type": "arrived_started", "label": "Worker started job", "timestamp": now, "location_status": start_status, "distance_from_site_meters": distance, "lat": slat, "lng": slng})
                except Exception:
                    update_fields["start_location_status"] = "location_error"
            else:
                update_fields["start_location_status"] = str(location_status or "location_denied").strip().lower()[:32]
                timeline.append({"type": "arrived_started", "label": "Worker started job", "timestamp": now, "location_status": update_fields["start_location_status"]})

        if new_status == "completed":
            if end_lat is not None and end_lng is not None:
                try:
                    elat, elng = float(end_lat), float(end_lng)
                    update_fields["end_location_lat"] = elat
                    update_fields["end_location_lng"] = elng
                    update_fields["end_location_accuracy_meters"] = float(end_accuracy) if end_accuracy is not None else None
                    distance_end = _haversine_meters(elat, elng, existing.get("job_location_lat"), existing.get("job_location_lng")) if existing.get("job_location_lat") is not None and existing.get("job_location_lng") is not None else None
                    end_status = _visit_status_for_distance(distance_end)
                    update_fields["end_distance_from_site_meters"] = distance_end
                    update_fields["end_location_status"] = end_status
                    timeline.append({"type": "completed_left", "label": "Worker completed job", "timestamp": now, "location_status": end_status, "distance_from_site_meters": distance_end, "lat": elat, "lng": elng})
                except Exception:
                    update_fields["end_location_status"] = "location_error"
            else:
                update_fields["end_location_status"] = str(location_status or "location_denied").strip().lower()[:32]
                timeline.append({"type": "completed_left", "label": "Worker completed job", "timestamp": now, "location_status": update_fields["end_location_status"]})
            started_dt = existing.get("started_at") or update_fields.get("started_at")
            if started_dt:
                try:
                    seconds = int((now - started_dt).total_seconds())
                except Exception:
                    seconds = 0
                update_fields["total_time_on_site_seconds"] = seconds
                update_fields["total_time_on_site_label"] = _duration_label(seconds)
            update_fields["ai_visit_summary"] = _build_visit_summary({**existing, **update_fields, "completed_at": now})

        if timeline:
            update_fields["job_visit_timeline"] = timeline

        await db.jobs.update_one({"_id": obj_id}, {"$set": update_fields})

        # Best-effort notify owner of worker activity
        try:
            owner_uid = str(existing.get("owner_id") or existing.get("business_id") or "")
            biz_id = str(existing.get("business_id") or "")
            job_title = existing.get("title") or "Job"
            job_route = f"/jobs/{job_id}"
            if new_status == "acknowledged":
                await notify(user_id=owner_uid, business_id=biz_id, type="job_acknowledged",
                             title="Worker accepted job", message=job_title, route=job_route,
                             target_type="job", target_id=job_id)
            elif new_status == "in_progress":
                await notify(user_id=owner_uid, business_id=biz_id, type="job_started",
                             title="Worker started job", message=job_title, route=job_route,
                             target_type="job", target_id=job_id)
            elif new_status == "paused":
                await notify(user_id=owner_uid, business_id=biz_id, type="job_paused",
                             title="Worker paused job", message=job_title, route=job_route,
                             target_type="job", target_id=job_id)
            elif new_status == "completed":
                await notify(user_id=owner_uid, business_id=biz_id, type="job_completed",
                             title="Job completed", message=job_title, route=job_route,
                             target_type="job", target_id=job_id)
            if worker_notes is not None and str(worker_notes).strip():
                await notify(user_id=owner_uid, business_id=biz_id, type="worker_note_added",
                             title="Worker added a note", message=job_title, route=job_route,
                             target_type="job", target_id=job_id)
            if new_photos is not None:
                await notify(user_id=owner_uid, business_id=biz_id, type="worker_photo_uploaded",
                             title="Worker uploaded photo(s)", message=job_title, route=job_route,
                             target_type="job", target_id=job_id)
        except Exception as e:
            print("NOTIFY_WORKER_PATCH_ERR", repr(e))

        # Automation emit (best-effort)
        try:
            base = {
                "business_id": str(existing.get("business_id") or ""),
                "actor": {"id": _me_id(current_user), "role": current_user.get("role"), "email": current_user.get("email")},
                "job": {
                    "id": job_id, "title": existing.get("title"),
                    "status": update_fields.get("status") or existing.get("status"),
                    "client_id": str(existing.get("client_id") or ""),
                    "worker_id": str(existing.get("assigned_worker_id") or ""),
                    "business_id": str(existing.get("business_id") or ""),
                    "job_type": existing.get("job_type"), "region": existing.get("region"),
                    "address": existing.get("address"),
                },
            }
            prev_status = str(existing.get("status") or "").lower()
            if new_status == "acknowledged":
                await auto.emit_event(db, "job_acknowledged", base)
            elif new_status == "in_progress":
                # Differentiate resume from cold-start
                if prev_status == "paused":
                    await auto.emit_event(db, "job_resumed", base)
                else:
                    await auto.emit_event(db, "job_started", base)
            elif new_status == "paused":
                await auto.emit_event(db, "job_paused", base)
            elif new_status == "completed":
                await auto.emit_event(db, "job_completed", base)
            if new_status == "in_progress":
                await _prepare_customer_update_for_job({**existing, **update_fields, "_id": obj_id}, str(existing.get("business_id") or business_id), "job_started")
            elif new_status == "paused":
                await _prepare_customer_update_for_job({**existing, **update_fields, "_id": obj_id}, str(existing.get("business_id") or business_id), "job_paused")
            elif new_status == "completed":
                await _prepare_customer_update_for_job({**existing, **update_fields, "_id": obj_id}, str(existing.get("business_id") or business_id), "job_completed")
            if worker_notes is not None and str(worker_notes).strip():
                _note_text = str(worker_notes)[:400]
                await auto.emit_event(db, "worker_note_added", {**base, "note": {"text": _note_text}})
            if new_photos is not None:
                await auto.emit_event(db, "worker_photo_uploaded", {**base, "photo_uploaded": True})
        except Exception as e:
            print("AUTO_EMIT_ERR worker_patch", e)

        response_body = {"success": True, "message": "Job updated"}
        if "photos" in update_fields:
            response_body["photos"] = update_fields["photos"]
        return response_body

    def to_int(value, default=0):
        try:
            return int(value)
        except Exception:
            return default

    def to_float(value, default=0):
        try:
            return float(value)
        except Exception:
            return default

    new_status = payload.get("status") or existing.get("status") or "assigned"

    update_doc = {
        "title": payload.get("title") or existing.get("title") or "Untitled Job",
        "job_type": payload.get("job_type") or existing.get("job_type") or "other",
        "client_id": payload.get("client_id"),
        "client_name": payload.get("client_name") or existing.get("client_name") or "",
        "address": payload.get("address") or existing.get("address") or "",
        "customer_name": payload.get("customer_name") or existing.get("customer_name") or "",
        "country": str(payload.get("country") or existing.get("country") or "New Zealand").strip() or "New Zealand",
        "region": str(payload.get("region") or existing.get("region") or "").strip(),
        "scheduled_date": payload.get("scheduled_date"),
        "scheduled_time": payload.get("scheduled_time") or "",
        "estimated_duration": to_int(payload.get("estimated_duration"), 60),
        "price": to_float(payload.get("price"), 0),
        "pricing_type": payload.get("pricing_type") or "fixed",
        "hourly_rate": to_float(payload.get("hourly_rate"), 0),
        "extras": payload.get("extras") or [],
        "notes": payload.get("notes") or "",
        "assigned_worker_id": payload.get("assigned_worker_id"),
        "is_recurring": bool(payload.get("is_recurring") or False),
        "recurring_frequency": payload.get("recurring_frequency"),
        "custom_repeat_days": payload.get("custom_repeat_days"),
        "status": new_status,
        "updated_at": now,
    }

    if new_status == "in_progress" and existing.get("status") != "in_progress":
        update_doc["started_at"] = now
    if new_status == "completed" and existing.get("status") != "completed":
        update_doc["completed_at"] = now

    await db.jobs.update_one({"_id": obj_id}, {"$set": update_doc})
    try:
        if new_status and new_status != existing.get("status"):
            if new_status in {"scheduled", "assigned"}:
                await _prepare_customer_update_for_job({**existing, **update_doc, "_id": obj_id}, str(existing.get("business_id") or business_id), "job_scheduled")
            elif new_status == "in_progress":
                await _prepare_customer_update_for_job({**existing, **update_doc, "_id": obj_id}, str(existing.get("business_id") or business_id), "job_started")
            elif new_status == "completed":
                await _prepare_customer_update_for_job({**existing, **update_doc, "_id": obj_id}, str(existing.get("business_id") or business_id), "job_completed")
    except Exception as e:
        print("CUSTOMER_UPDATE_PREPARE_ERR", repr(e))

    # Owner-side notifications: notify worker on (re)assignment + employer note change
    try:
        new_worker = str(update_doc.get("assigned_worker_id") or "").strip()
        old_worker = str(existing.get("assigned_worker_id") or "").strip()
        biz_id = str(existing.get("business_id") or "")
        job_title = update_doc.get("title") or existing.get("title") or "Job"
        if new_worker and new_worker != old_worker:
            await notify(user_id=new_worker, business_id=biz_id, type="job_assigned",
                         title="New job assigned", message=job_title,
                         route=f"/worker/jobs/{job_id}",
                         target_type="job", target_id=job_id)
        new_notes = str(update_doc.get("notes") or "").strip()
        old_notes = str(existing.get("notes") or "").strip()
        if new_worker and new_notes and new_notes != old_notes:
            await notify(user_id=new_worker, business_id=biz_id, type="employer_note_added",
                         title="Employer added a note", message=job_title,
                         route=f"/worker/jobs/{job_id}",
                         target_type="job", target_id=job_id)
    except Exception as e:
        print("NOTIFY_OWNER_PATCH_ERR", repr(e))

    try:
        base = {
            "business_id": str(existing.get("business_id") or ""),
            "actor": {"id": _me_id(current_user), "role": current_user.get("role"), "email": current_user.get("email")},
            "job": {
                "id": job_id, "title": update_doc.get("title") or existing.get("title"),
                "status": update_doc.get("status") or existing.get("status"),
                "client_id": str(update_doc.get("client_id") or existing.get("client_id") or ""),
                "worker_id": str(update_doc.get("assigned_worker_id") or existing.get("assigned_worker_id") or ""),
                "business_id": str(existing.get("business_id") or ""),
                "job_type": update_doc.get("job_type") or existing.get("job_type"),
                "region": update_doc.get("region") or existing.get("region"),
                "address": update_doc.get("address") or existing.get("address"),
            },
        }
        new_worker_a = str(update_doc.get("assigned_worker_id") or "").strip()
        old_worker_a = str(existing.get("assigned_worker_id") or "").strip()
        if new_worker_a and new_worker_a != old_worker_a:
            await auto.emit_event(db, "job_assigned", base)
        new_notes_a = str(update_doc.get("notes") or "").strip()
        old_notes_a = str(existing.get("notes") or "").strip()
        if new_notes_a and new_notes_a != old_notes_a:
            await auto.emit_event(db, "employer_note_added", {**base, "note": {"text": new_notes_a[:400]}})
    except Exception as e:
        print("AUTO_EMIT_ERR owner_patch", e)

    return {"success": True, "message": "Job updated"}



@api_router.post("/jobs/{job_id}/create-draft-invoice")
async def create_draft_invoice_from_job(job_id: str, payload: dict | None = None, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    try:
        if current_user.get("role") not in BUSINESS_ROLES:
            raise HTTPException(status_code=403, detail="Not authorized")

        business_id = _resolve_business_id(current_user)
        owner_id = _resolve_owner_id(current_user)

        logger.info("SMART HUB CREATE DRAFT INVOICE job_id=%s business_id=%s", str(job_id), str(business_id))
        job_id_filters = [{"_id": str(job_id)}]
        try:
            obj_id = ObjectId(job_id)
            job_id_filters.append({"_id": obj_id})
        except Exception:
            obj_id = None

        job = await db.jobs.find_one({
            "$and": [
                {"$or": job_id_filters},
                {"$or": [
                    {"business_id": business_id},
                    {"business_id": str(business_id)},
                    {"owner_id": owner_id},
                ]},
            ]
        })
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        now = datetime.now(timezone.utc)
        payload = payload or {}
        real_job_id = job.get("_id")
        job_id_str = str(real_job_id)

        business_filters = [business_id, str(business_id)]
        owner_filters = [owner_id, str(owner_id)]
        job_link_values = [job_id_str]
        if obj_id is not None:
            job_link_values.append(obj_id)

        existing_invoice = await db.invoices.find_one({
            "$and": [
                {"$or": [{"business_id": v} for v in business_filters] + [{"owner_id": v} for v in owner_filters]},
                {"$or": (
                    [{"job_id": v} for v in job_link_values]
                    + [{"linked_job_id": v} for v in job_link_values]
                    + [{"source_job_id": v} for v in job_link_values]
                )},
            ]
        })

        linked_invoice_id = str((existing_invoice or {}).get("_id") or (existing_invoice or {}).get("id") or "")
        if not existing_invoice:
            linked_invoice_id = str(job.get("draft_invoice_id") or job.get("invoice_id") or "")
            if linked_invoice_id:
                linked_obj = normalize_object_id(linked_invoice_id)
                if linked_obj is not None:
                    existing_invoice = await db.invoices.find_one({"_id": linked_obj})
                if not existing_invoice:
                    existing_invoice = await db.invoices.find_one({
                        "$or": [
                            {"id": linked_invoice_id},
                            {"invoice_number": linked_invoice_id},
                        ]
                    })
        logger.info("SMART HUB CREATE DRAFT INVOICE existing=%s invoice_id=%s", bool(existing_invoice), linked_invoice_id)

        async def _mark_job_billed(invoice_id: str, draft_description: str | None = None):
            update_fields = {
                "invoice_id": invoice_id,
                "draft_invoice_id": invoice_id,
                "invoice_created": True,
                "invoiced": True,
                "invoice_status": "draft",
                "updated_at": now,
            }
            if draft_description:
                update_fields["ai_invoice_description"] = draft_description
                update_fields["invoice_description_draft"] = draft_description
            await db.jobs.update_one(
                {"_id": real_job_id},
                {"$set": update_fields}
            )
            logger.info("SMART HUB CREATE DRAFT INVOICE updated job invoice fields")

        if existing_invoice:
            invoice_id = str(existing_invoice.get("_id") or existing_invoice.get("id") or "")
            existing_description = _safe_text(
                existing_invoice.get("description")
                or job.get("ai_invoice_description")
                or job.get("invoice_description_draft")
            )
            await _mark_job_billed(invoice_id, existing_description)
            updated_job = await db.jobs.find_one({"_id": real_job_id})
            return {
                "success": True,
                "invoice_id": invoice_id,
                "invoice": serialize_document(existing_invoice),
                "job": serialize_document(updated_job),
                "updated_job": serialize_document(updated_job),
                "message": "Invoice already linked",
                "existing": True,
            }

        subtotal = float(payload.get("subtotal") if payload.get("subtotal") is not None else (job.get("price") or 0))
        gst_rate = float(payload.get("gst_rate") if payload.get("gst_rate") is not None else (current_user.get("gst_rate") or 15))
        gst_amount = float(payload.get("gst") if payload.get("gst") is not None else subtotal * (gst_rate / 100))
        total = float(payload.get("total") if payload.get("total") is not None else subtotal + gst_amount)
        accounting = await db.accounting_settings.find_one({"business_id": business_id}) if hasattr(db, "accounting_settings") else None
        invoice_mode = str((accounting or {}).get("invoice_mode") or "churvox_only").strip().lower()
        if invoice_mode not in INVOICE_MODES:
            invoice_mode = "churvox_only"

        description = _safe_text(
            payload.get("description")
            or payload.get("invoice_description")
            or job.get("ai_invoice_description")
            or job.get("invoice_description_draft")
            or job.get("completion_notes")
            or job.get("worker_notes")
            or job.get("notes")
            or job.get("description")
        )
        if not description:
            client_name = _safe_text(job.get("client_name") or job.get("customer_name"))
            if not client_name:
                linked_client = await db.clients.find_one({"$or": [{"_id": normalize_object_id(job.get("client_id"))}, {"id": str(job.get("client_id") or "")}]})
                client_name = _safe_text((linked_client or {}).get("name") or (linked_client or {}).get("client_name"))
            description = _format_invoice_description_from_job(job, client_name)
        client_id = payload.get("client_id") or job.get("client_id")
        doc = {
            "invoice_number": f"INV-{datetime.now().strftime('%Y%m%d')}-{str(real_job_id)[-5:]}",
            "client_id": client_id,
            "customer_name": job.get("client_name") or job.get("customer_name") or "",
            "customer_email": job.get("customer_email") or "",
            "address": job.get("address") or "",
            "description": description,
            "subtotal": subtotal,
            "gst_rate": gst_rate,
            "gst_amount": gst_amount,
            "gst": gst_amount,
            "total": total,
            "status": "draft",
            "job_id": job_id_str,
            "linked_job_id": job_id_str,
            "source_job_id": job_id_str,
            "pricing_type": job.get("pricing_type") or "fixed",
            "hourly_rate": float(job.get("hourly_rate") or 0),
            "hours_worked": float(job.get("time_spent_minutes") or 0) / 60,
            "extras": job.get("extras") or [],
            "myob_sync_status": "not_synced" if invoice_mode == "myob_sync" else "not_synced",
            "source": "smart_hub_ai",
            "official_invoice_source": "myob" if invoice_mode == "myob_external" else "churvox",
            "business_id": business_id,
            "owner_id": owner_id,
            "created_at": now,
            "updated_at": now,
        }

        result = await db.invoices.insert_one(doc)
        invoice_id = str(result.inserted_id)
        await _mark_job_billed(invoice_id, description)
        created_invoice = await db.invoices.find_one({"_id": result.inserted_id})
        updated_job = await db.jobs.find_one({"_id": real_job_id})

        message = "Draft invoice created"
        if invoice_mode == "myob_external":
            message = "Billing draft prepared. Create the official invoice in MYOB."
        return {
            "success": True,
            "invoice_id": invoice_id,
            "invoice": serialize_document(created_invoice),
            "job": serialize_document(updated_job),
            "updated_job": serialize_document(updated_job),
            "message": message,
            "invoice_mode": invoice_mode,
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("SMART HUB CREATE DRAFT INVOICE failed")
        raise HTTPException(status_code=500, detail="Failed to create draft invoice")

@api_router.post("/jobs/{job_id}/assign")
async def assign_job_worker(job_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    worker_id = str((payload or {}).get("worker_id") or "").strip()
    if not worker_id:
        raise HTTPException(status_code=400, detail="worker_id is required")

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    worker = await db.business_users.find_one({
        "$or": [{"_id": ObjectId(worker_id)}] if len(worker_id) == 24 else [{"id": worker_id}],
        "role": "worker",
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if not worker:
        if len(worker_id) == 24:
            worker = await db.business_users.find_one({
                "_id": ObjectId(worker_id),
                "role": "worker",
                "$or": [
                    {"business_id": business_id},
                    {"business_id": str(business_id)},
                    {"owner_id": owner_id},
                ]
            })
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    job = None
    if len(job_id) == 24:
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    worker_ref = str(worker.get("id") or worker.get("_id"))
    worker_name = worker.get("name") or "Worker"

    await db.jobs.update_one(
        {"_id": job["_id"]},
        {"$set": {
            "assigned_worker_id": worker_ref,
            "assigned_worker_name": worker_name,
            "status": job.get("status") or "assigned",
            "updated_at": datetime.utcnow(),
        }}
    )

    return {
        "success": True,
        "message": "Worker assigned",
        "assigned_worker_id": worker_ref,
        "assigned_worker_name": worker_name,
    }


@api_router.post("/jobs/{job_id}/assign-worker")
async def assign_job_worker_alias(job_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    worker_id = str((payload or {}).get("worker_id") or (payload or {}).get("assigned_worker_id") or "").strip()
    if not worker_id:
        raise HTTPException(status_code=400, detail="worker_id is required")
    business_id = str(current_user.get("business_id") or current_user.get("businessId") or current_user.get("id") or "")
    owner_id = str(current_user.get("_id") or current_user.get("id") or current_user.get("user_id") or "")

    worker_query = {"role": {"$in": ["worker", "employee", "field_worker"]}, "$or": [{"id": worker_id}]}
    if len(worker_id) == 24:
        worker_query["$or"].append({"_id": ObjectId(worker_id)})
    worker_query["$and"] = [{"$or": [{"business_id": business_id}, {"owner_id": owner_id}]}]
    worker = await db.business_users.find_one(worker_query)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    job = await db.jobs.find_one({"$or": [{"id": job_id}] + ([{"_id": ObjectId(job_id)}] if len(job_id) == 24 else []), "business_id": business_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    worker_ref = str(worker.get("id") or worker.get("_id"))
    worker_name = str(worker.get("name") or "Worker")
    current_status = str(job.get("status") or "").strip().lower()
    next_status = "assigned" if current_status in {"", "new", "unassigned", "pending"} else (job.get("status") or "assigned")
    now = datetime.utcnow()
    await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"assigned_worker_id": worker_ref, "worker_id": worker_ref, "assigned_worker_name": worker_name, "status": next_status, "updated_at": now}})
    updated = await db.jobs.find_one({"_id": job["_id"]})
    await log_smart_hub_activity(current_user, {
        "action_type": "worker_assigned",
        "title": "Worker assigned",
        "message": f"{worker_name} assigned to {str(job.get('title') or 'job')}",
        "related_type": "job",
        "related_id": str(job.get('id') or job.get('_id')),
        "related_job_id": str(job.get('id') or job.get('_id')),
        "status": "completed",
    })
    return {"success": True, "message": "Worker assigned", "job": serialize_document(updated)}





def _smart_hub_actor_name(current_user: dict) -> str:
    return str(current_user.get("name") or current_user.get("full_name") or current_user.get("email") or "Unknown")


async def log_smart_hub_activity(current_user: dict, payload: dict):
    business_id = str(current_user.get("business_id") or current_user.get("businessId") or current_user.get("id") or "").strip()
    if not business_id:
        return
    now = datetime.utcnow()
    user_id = str(current_user.get("_id") or current_user.get("id") or current_user.get("user_id") or "").strip()
    activity = {
        "id": str(uuid.uuid4()),
        "business_id": business_id,
        "user_id": user_id or None,
        "approved_by_user_id": user_id or None,
        "approved_by_name": _smart_hub_actor_name(current_user),
        "action_type": str(payload.get("action_type") or "unknown"),
        "title": str(payload.get("title") or "Smart Hub activity"),
        "message": str(payload.get("message") or ""),
        "related_type": str(payload.get("related_type") or ""),
        "related_id": str(payload.get("related_id") or ""),
        "related_client_id": payload.get("related_client_id"),
        "related_job_id": payload.get("related_job_id"),
        "related_invoice_id": payload.get("related_invoice_id"),
        "related_quote_id": payload.get("related_quote_id"),
        "status": str(payload.get("status") or "completed"),
        "source": "smart_hub_ai",
        "created_at": now,
    }
    await db.smart_hub_activity.insert_one(activity)


@api_router.post("/clients/hide-audit-test")
async def hide_audit_test_clients(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    query = {
        "business_id": business_id,
        "$or": [
            {"client_name": {"$regex": r"^Deep Audit", "$options": "i"}},
            {"name": {"$regex": r"^Deep Audit", "$options": "i"}},
            {"email": {"$regex": r"deep-audit@example.com", "$options": "i"}},
            {"notes": {"$regex": r"Created by automated Churvox true launch certification audit", "$options": "i"}},
            {"contact_name": {"$regex": r"Deep Audit", "$options": "i"}},
            {"address": {"$regex": r"Deep Audit Street", "$options": "i"}},
        ],
    }
    upd = {"$set": {"hidden_from_clients": True, "archived": True, "updated_at": now}}
    result = await db.clients.update_many(query, upd)
    return {"success": True, "hidden_count": int(result.modified_count or 0)}


@api_router.get("/smart-hub/activity")
async def get_smart_hub_activity(limit: int = 25, current_user: dict = Depends(get_current_user)):
    business_id = str(current_user.get("business_id") or current_user.get("businessId") or current_user.get("id") or "").strip()
    if not business_id:
        return {"activities": []}
    role = str(current_user.get("role") or "").lower()
    q = {"business_id": business_id, "source": "smart_hub_ai"}
    if role in {"worker", "employee", "field_worker"}:
        q["action_type"] = {"$in": ["worker_assigned", "payroll"]}
    if role == "payroll":
        q["action_type"] = {"$in": ["payroll", "invoice_draft_created", "reminder_draft_approved"]}
    safe_limit = max(1, min(int(limit or 25), 100))
    items = await db.smart_hub_activity.find(q).sort("created_at", -1).limit(safe_limit).to_list(safe_limit)
    return {"activities": [serialize_document(i) for i in items]}


@api_router.post("/smart-hub/activity")
async def create_smart_hub_activity(payload: dict, current_user: dict = Depends(get_current_user)):
    required = ["action_type", "title", "message", "related_type", "related_id", "status"]
    for f in required:
        if not str((payload or {}).get(f) or "").strip():
            raise HTTPException(status_code=400, detail=f"{f} is required")
    await log_smart_hub_activity(current_user, payload or {})
    return {"success": True}




# CHURVOX_OPERATOR_ACTIONS_BACKEND_V1_20260527
# Real approval-first AI Operator actions for Command Floor.
# Churvox prepares actions. Owner approves. Nothing sends/assigns/invoices silently.

def _operator_text(value):
    return str(value or "").strip()

def _operator_money(*values):
    for value in values:
        try:
            if value is None or value == "":
                continue
            amount = float(str(value).replace("$", "").replace(",", "").strip())
            if amount > 0:
                return amount
        except Exception:
            continue
    return 0.0

def _operator_doc_id(doc):
    return str((doc or {}).get("_id") or (doc or {}).get("id") or "")

def _operator_safe_iso(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            pass
    return str(value)

def _operator_business_query(business_id: str, owner_id: str):
    return {"$or": [{"business_id": business_id}, {"business_id": str(business_id)}, {"owner_id": owner_id}]}

# CHURVOX_OPERATOR_WORKER_MATCHING_HELPERS_20260527
def _operator_parse_datetime(value, fallback_time: str = ""):
    if value is None:
        return None
    if hasattr(value, "astimezone"):
        try:
            dt = value
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            return None

    raw = str(value or "").strip()
    if not raw:
        return None

    if fallback_time and "T" not in raw and len(raw) <= 10:
        raw = raw + "T" + str(fallback_time).strip()

    try:
        cleaned = raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None

def _operator_job_start(job: dict):
    return (
        _operator_parse_datetime(job.get("scheduled_date"), job.get("scheduled_time") or "")
        or _operator_parse_datetime(job.get("start_time"))
        or _operator_parse_datetime(job.get("due_date"))
        or _operator_parse_datetime(job.get("date"), job.get("scheduled_time") or "")
    )

def _operator_duration_minutes(job: dict):
    for key in ["estimated_duration", "duration_minutes", "job_duration_minutes", "scheduled_duration", "duration"]:
        try:
            value = int(float(job.get(key) or 0))
            if value > 0:
                return min(max(value, 15), 24 * 60)
        except Exception:
            pass
    return 60

def _operator_schedules_overlap(job_a: dict, job_b: dict):
    start_a = _operator_job_start(job_a)
    start_b = _operator_job_start(job_b)
    if not start_a or not start_b:
        return False

    end_a = start_a + timedelta(minutes=_operator_duration_minutes(job_a))
    end_b = start_b + timedelta(minutes=_operator_duration_minutes(job_b))
    return start_a < end_b and start_b < end_a

def _operator_same_day(job_a: dict, job_b: dict):
    start_a = _operator_job_start(job_a)
    start_b = _operator_job_start(job_b)
    if not start_a or not start_b:
        return False
    return start_a.date() == start_b.date()

def _operator_skill_match(worker: dict, job: dict):
    job_terms = [
        job.get("job_type"),
        job.get("service_type"),
        job.get("trade"),
        job.get("category"),
        job.get("title"),
    ]
    job_text = " ".join([str(x or "").lower().replace("_", " ") for x in job_terms if x])

    worker_values = []
    for key in ["skills", "skill_tags", "trades", "trade_types", "service_types", "services", "notes", "role"]:
        value = worker.get(key)
        if isinstance(value, list):
            worker_values.extend([str(x or "") for x in value])
        elif value:
            worker_values.append(str(value))

    worker_text = " ".join(worker_values).lower().replace("_", " ")
    if not job_text or not worker_text:
        return False, ""

    for term in job_text.split():
        if len(term) >= 4 and term in worker_text:
            return True, term

    return False, ""


def _operator_job_photos(job: dict):
    photos = []
    for key in ["photos", "job_photos", "worker_photos", "completion_photos", "photo_urls", "images", "attachments"]:
        value = (job or {}).get(key)
        if isinstance(value, list):
            photos.extend([x for x in value if x])
        elif value:
            photos.append(value)
    return photos

def _operator_action(action_id, title, message, action_type, target_type, target_id, route, confidence=70, blockers=None, draft_message=None, amount=0):
    blockers = [b for b in (blockers or []) if b]
    return {
        "id": action_id,
        "title": title,
        "summary": title,
        "message": message,
        "reason": message,
        "recommendation": message,
        "owner_facing_explanation": message,
        "action_type": action_type,
        "target_type": target_type,
        "target_id": str(target_id or ""),
        "target_url": route,
        "route": route,
        "status": "blocked" if blockers else "ready",
        "confidence": max(0, min(int(confidence or 0), 100)),
        "blockers": blockers,
        "required_owner_fields": blockers,
        "generated_message": draft_message or "",
        "draft_message": draft_message or "",
        "amount": amount or 0,
        "value": amount or 0,
        "approval_required": True,
        "safety_note": "Owner approval required. Churvox prepares this action but does not send, assign, bill or change records silently.",
        "source": "churvox_operator_actions_v1",
    }

async def _operator_candidate_worker(business_id: str, owner_id: str, job: dict):
    # CHURVOX_OPERATOR_WORKER_MATCHING_V2_20260527
    # Stronger matching: active conflicts, scheduled overlap, same-day warnings,
    # area/region, skills/trade match, availability and workload.
    workers = await db.business_users.find({
        "$and": [
            {"role": {"$in": ["worker", "manager", "field_worker", "employee"]}},
            _operator_business_query(business_id, owner_id),
        ]
    }).limit(80).to_list(80)

    job_id = _operator_doc_id(job)
    job_region = _operator_text(job.get("region") or job.get("area") or job.get("suburb") or job.get("address")).lower()
    job_start = _operator_job_start(job)

    candidates = []

    for worker in workers:
        status = _operator_text(worker.get("status") or worker.get("availability") or worker.get("active_status")).lower()
        role = _operator_text(worker.get("role")).lower()
        worker_id = str(worker.get("id") or worker.get("_id") or "")
        worker_name = _operator_text(worker.get("name") or worker.get("email") or "Worker")

        if not worker_id:
            continue

        if worker.get("disabled") or worker.get("archived") or worker.get("is_active") is False or worker.get("active") is False:
            continue

        if any(x in status for x in ["inactive", "disabled", "unavailable", "away", "leave", "blocked"]):
            continue

        if role in {"payroll", "office_admin", "admin", "owner", "accountant"}:
            continue

        assigned_jobs = await db.jobs.find({
            "$and": [
                _operator_business_query(business_id, owner_id),
                {"assigned_worker_id": worker_id},
                {"status": {"$in": ["assigned", "scheduled", "in_progress", "paused", "acknowledged"]}},
            ]
        }).sort("scheduled_date", 1).limit(30).to_list(30)

        hard_conflicts = []
        soft_warnings = []
        open_workload = 0

        for other in assigned_jobs:
            other_id = _operator_doc_id(other)
            if other_id and other_id == job_id:
                continue

            other_status = _operator_text(other.get("status")).lower()
            open_workload += 1

            if other_status in {"in_progress", "paused"}:
                hard_conflicts.append(f"currently on {other.get('title') or other.get('job_type') or 'another job'}")
                continue

            if job_start and _operator_schedules_overlap(job, other):
                hard_conflicts.append(f"time overlap with {other.get('title') or other.get('job_type') or 'another scheduled job'}")
                continue

            if job_start and _operator_same_day(job, other):
                soft_warnings.append("same-day workload")

        if hard_conflicts:
            continue

        score = 55
        reasons = ["no active conflict found"]

        worker_region = _operator_text(worker.get("region") or worker.get("area") or worker.get("city") or worker.get("suburb")).lower()
        if worker_region and job_region and (worker_region in job_region or job_region in worker_region):
            score += 22
            reasons.append("area match")

        skill_ok, skill_term = _operator_skill_match(worker, job)
        if skill_ok:
            score += 18
            reasons.append(f"skill match: {skill_term}")

        if "available" in status:
            score += 12
            reasons.append("marked available")

        if "manager" in role:
            score += 5
            reasons.append("manager can cover dispatch")
        elif "worker" in role or "field" in role or "employee" in role:
            score += 10
            reasons.append("field role can take jobs")

        if open_workload:
            score -= min(open_workload * 6, 24)
            reasons.append(f"{open_workload} open assigned job{'s' if open_workload != 1 else ''}")

        if soft_warnings:
            score -= min(len(soft_warnings) * 8, 16)
            reasons.append(", ".join(sorted(set(soft_warnings))))

        if job_start:
            reasons.append("schedule checked")

        score = max(0, min(score, 100))
        candidates.append({
            "worker": worker,
            "score": score,
            "reason": f"{worker_name} recommended because " + ", ".join(reasons) + ".",
            "worker_name": worker_name,
            "worker_id": worker_id,
            "open_workload": open_workload,
        })

    candidates.sort(key=lambda x: x["score"], reverse=True)

    if not candidates:
        return None, "No conflict-free worker found after checking active jobs, schedule overlap and availability.", 0

    best = candidates[0]
    return best["worker"], best["reason"], best["score"]

@api_router.get("/ai-operator/actions")
async def get_ai_operator_actions(current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    if role not in BUSINESS_ROLES and role not in {"owner", "manager", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = _resolve_business_id(current_user)
    owner_id = _resolve_owner_id(current_user)
    if not business_id:
        return {"success": True, "actions": [], "proof": {"safe": 0, "blocked": 0, "total": 0}}

    actions = []
    q = _operator_business_query(business_id, owner_id)

    jobs = await db.jobs.find(q).sort("updated_at", -1).limit(120).to_list(120)
    invoices = await db.invoices.find(q).sort("updated_at", -1).limit(80).to_list(80)
    quotes = await db.quotes.find(q).sort("updated_at", -1).limit(60).to_list(60)
    clients = await db.clients.find(q).sort("updated_at", -1).limit(80).to_list(80)

    for job in jobs:
        jid = _operator_doc_id(job)
        status = _operator_text(job.get("status")).lower()
        reviewed = bool(job.get("reviewed") or job.get("owner_approved") or job.get("work_approved") or job.get("approved_at"))
        amount = _operator_money(job.get("price"), job.get("job_price"), job.get("fixed_price"), job.get("total"), job.get("amount"))
        title = _operator_text(job.get("title") or job.get("job_name") or job.get("client_name") or job.get("customer_name") or "Job")
        client = _operator_text(job.get("client_name") or job.get("customer_name") or "customer")
        address = _operator_text(job.get("address") or job.get("site_address") or job.get("job_address"))
        notes = _operator_text(job.get("worker_completion_notes") or job.get("completion_notes") or job.get("worker_notes") or job.get("job_notes") or job.get("notes"))
        photos = _operator_job_photos(job)

        if status in {"completed", "complete", "done"} and not reviewed:
            blockers = []
            if not amount:
                blockers.append("Confirm job price")
            if not notes:
                blockers.append("Worker notes missing")
            if not photos:
                blockers.append("No completion photos saved")
            if not _operator_text(job.get("assigned_worker_id") or job.get("assigned_worker_name")):
                blockers.append("Worker not recorded")

            message = f"{title} is complete for {client}. Review notes, photos, price and invoice prep before approving."
            actions.append(_operator_action(
                f"job_approve_{jid}",
                "Approve finished work",
                message,
                "approve_work",
                "job",
                jid,
                f"/jobs/{jid}",
                confidence=85 if not blockers else 58,
                blockers=blockers,
                amount=amount,
            ))

        if status in {"completed", "complete", "done"} and reviewed and not (job.get("invoice_id") or job.get("draft_invoice_id") or job.get("invoice_created") or job.get("invoiced")):
            blockers = []
            if not amount:
                blockers.append("Confirm price before invoice")
            description = _operator_text(job.get("ai_invoice_description") or job.get("invoice_description_draft") or _format_invoice_description_from_job(job, client))
            if not description:
                blockers.append("Invoice description missing")
            message = f"Churvox can prepare a draft invoice for {client}{f' at {address}' if address else ''}. Owner reviews before anything is sent."
            actions.append(_operator_action(
                f"job_invoice_{jid}",
                "Prepare draft invoice",
                message,
                "prepare_invoice",
                "job",
                jid,
                f"/jobs/{jid}",
                confidence=82 if not blockers else 52,
                blockers=blockers,
                draft_message=description,
                amount=amount,
            ))

        open_status = status not in {"completed", "complete", "done", "cancelled", "canceled"}
        if open_status and not _operator_text(job.get("assigned_worker_id") or job.get("assigned_worker_name")):
            worker, reason, score = await _operator_candidate_worker(business_id, owner_id, job)
            blockers = []
            worker_id = ""
            worker_name = ""
            if worker:
                worker_id = str(worker.get("id") or worker.get("_id") or "")
                worker_name = _operator_text(worker.get("name") or worker.get("email") or "Worker")
            else:
                blockers.append("No conflict-free worker found")

            actions.append(_operator_action(
                f"job_assign_{jid}_{worker_id or 'none'}",
                "Assign worker",
                f"{title} needs a worker. {reason}",
                "assign_worker",
                "job",
                jid,
                f"/jobs/{jid}",
                confidence=score,
                blockers=blockers,
                draft_message=worker_name,
                amount=amount,
            ))

    for invoice in invoices:
        iid = _operator_doc_id(invoice)
        status = _operator_text(invoice.get("status")).lower()
        total = _operator_money(invoice.get("total"), invoice.get("subtotal"), invoice.get("amount"), invoice.get("balance_due"))
        customer = _operator_text(invoice.get("customer_name") or invoice.get("client_name") or "customer")
        if status in {"draft", "pending", ""}:
            blockers = []
            if not total:
                blockers.append("Invoice amount missing")
            if not _operator_text(invoice.get("description")):
                blockers.append("Invoice description missing")
            actions.append(_operator_action(
                f"invoice_approve_{iid}",
                "Approve invoice draft",
                f"Invoice for {customer} is drafted. Review value and description before sending.",
                "approve_invoice",
                "invoice",
                iid,
                f"/invoices/{iid}",
                confidence=80 if not blockers else 50,
                blockers=blockers,
                amount=total,
            ))
        if status in {"sent", "open", "unpaid", "overdue"}:
            actions.append(_operator_action(
                f"invoice_reminder_{iid}",
                "Prepare payment reminder",
                f"{customer} has an open invoice. Churvox can prepare a reminder draft for owner review.",
                "prepare_message",
                "invoice",
                iid,
                f"/invoices/{iid}",
                confidence=72,
                draft_message=f"Hi {customer}, just a quick reminder that your invoice is still open. Please let us know if you need anything.",
                amount=total,
            ))

    for quote in quotes:
        qid = _operator_doc_id(quote)
        status = _operator_text(quote.get("status")).lower()
        customer = _operator_text(quote.get("customer_name") or quote.get("client_name") or "customer")
        if status in {"sent", "draft", "pending", ""}:
            actions.append(_operator_action(
                f"quote_followup_{qid}",
                "Prepare quote follow-up",
                f"Quote for {customer} may need follow-up. Churvox drafted a message but will not send it without approval.",
                "prepare_message",
                "quote",
                qid,
                f"/quotes/{qid}",
                confidence=68,
                draft_message=f"Hi {customer}, just checking whether you had any questions about the quote. Happy to help.",
                amount=_operator_money(quote.get("total"), quote.get("price"), quote.get("amount")),
            ))

    for client in clients:
        cid = _operator_doc_id(client)
        name = _operator_text(client.get("name") or client.get("client_name") or client.get("customer_name") or "Client")
        missing = []
        if not _operator_text(client.get("email")):
            missing.append("Email missing")
        if not _operator_text(client.get("phone")):
            missing.append("Phone missing")
        if not _operator_text(client.get("address")):
            missing.append("Address missing")
        if missing:
            actions.append(_operator_action(
                f"client_fix_{cid}",
                "Fix customer details",
                f"{name} has missing customer details. Fix these before messages, reminders or invoices rely on this record.",
                "fix_record",
                "client",
                cid,
                f"/clients/{cid}",
                confidence=90,
                blockers=missing,
            ))

    safe_count = sum(1 for a in actions if not a.get("blockers"))
    blocked_count = sum(1 for a in actions if a.get("blockers"))

    return {
        "success": True,
        "actions": actions[:60],
        "proof": {
            "safe": safe_count,
            "blocked": blocked_count,
            "total": len(actions),
            "message": "Churvox prepared these actions. Owner approval is required before records are changed, messages are sent, invoices are prepared or workers are assigned.",
        },
    }

@api_router.post("/ai-operator/actions/{action_id}/approve")
async def approve_ai_operator_action(action_id: str, current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    if role not in BUSINESS_ROLES and role not in {"owner", "manager", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = _resolve_business_id(current_user)
    owner_id = _resolve_owner_id(current_user)
    now = datetime.now(timezone.utc)
    parts = str(action_id or "").split("_")
    if len(parts) < 3:
        raise HTTPException(status_code=400, detail="Invalid AI action")

    action_prefix = "_".join(parts[:2])
    target_id = parts[2]

    def _obj(value):
        try:
            return ObjectId(value)
        except Exception:
            return None

    async def _find_job(job_id: str):
        filters = [{"id": job_id}]
        oid = _obj(job_id)
        if oid:
            filters.append({"_id": oid})
        return await db.jobs.find_one({"$and": [{"$or": filters}, _operator_business_query(business_id, owner_id)]})

    if action_prefix == "job_approve":
        job = await _find_job(target_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        await db.jobs.update_one(
            {"_id": job["_id"]},
            {"$set": {
                "reviewed": True,
                "owner_approved": True,
                "work_approved": True,
                "owner_review_status": "approved",
                "work_review_status": "approved",
                "approved_at": now,
                "updated_at": now,
            }}
        )
        await log_smart_hub_activity(current_user, {
            "action_type": "approve_work",
            "title": "Work approved",
            "message": _operator_text(job.get("title") or job.get("job_name") or "Job approved"),
            "related_type": "job",
            "related_id": target_id,
            "related_job_id": target_id,
            "status": "completed",
        })
        return {"success": True, "message": "Work approved"}

    if action_prefix == "job_invoice":
        result = await create_draft_invoice_from_job(target_id, {}, current_user)
        await log_smart_hub_activity(current_user, {
            "action_type": "invoice_draft_created",
            "title": "Draft invoice prepared",
            "message": str(result.get("message") or "Draft invoice prepared"),
            "related_type": "job",
            "related_id": target_id,
            "related_job_id": target_id,
            "related_invoice_id": str(result.get("invoice_id") or ""),
            "status": "completed",
        })
        return result

    if action_prefix == "job_assign":
        if len(parts) < 4 or parts[3] == "none":
            raise HTTPException(status_code=400, detail="No recommended worker is available")
        worker_id = parts[3]
        return await assign_job_worker_alias(target_id, {"worker_id": worker_id}, current_user)

    if action_prefix == "invoice_approve":
        invoice_id = target_id
        oid = _obj(invoice_id)
        invoice = None
        if oid:
            invoice = await db.invoices.find_one({"$and": [{"_id": oid}, _operator_business_query(business_id, owner_id)]})
        if not invoice:
            invoice = await db.invoices.find_one({"$and": [{"id": invoice_id}, _operator_business_query(business_id, owner_id)]})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        await db.invoices.update_one({"_id": invoice["_id"]}, {"$set": {"status": "approved", "approved_at": now, "updated_at": now}})
        await log_smart_hub_activity(current_user, {
            "action_type": "invoice_approved",
            "title": "Invoice approved",
            "message": _operator_text(invoice.get("customer_name") or "Invoice approved"),
            "related_type": "invoice",
            "related_id": invoice_id,
            "related_invoice_id": invoice_id,
            "status": "completed",
        })
        return {"success": True, "message": "Invoice approved"}

    if action_prefix in {"invoice_reminder", "quote_followup"}:
        # Approval-first: save draft only. Do not send.
        collection = db.invoices if action_prefix == "invoice_reminder" else db.quotes
        oid = _obj(target_id)
        doc = None
        if oid:
            doc = await collection.find_one({"$and": [{"_id": oid}, _operator_business_query(business_id, owner_id)]})
        if not doc:
            doc = await collection.find_one({"$and": [{"id": target_id}, _operator_business_query(business_id, owner_id)]})
        if not doc:
            raise HTTPException(status_code=404, detail="Record not found")
        customer = _operator_text(doc.get("customer_name") or doc.get("client_name") or "there")
        draft = f"Hi {customer}, just following up. Please let us know if you need anything."
        await collection.update_one({"_id": doc["_id"]}, {"$set": {"customer_message_draft": draft, "draft_message": draft, "updated_at": now}})
        await log_smart_hub_activity(current_user, {
            "action_type": "message_draft_saved",
            "title": "Message draft saved",
            "message": "Draft saved only. Nothing was sent.",
            "related_type": "invoice" if action_prefix == "invoice_reminder" else "quote",
            "related_id": target_id,
            "status": "completed",
        })
        return {"success": True, "message": "Message draft saved. Nothing has been sent."}

    if action_prefix == "client_fix":
        raise HTTPException(status_code=400, detail="Customer detail fixes need owner input")

    raise HTTPException(status_code=400, detail="Unsupported AI action")

@api_router.post("/ai-operator/actions/{action_id}/reject")
async def reject_ai_operator_action(action_id: str, current_user: dict = Depends(get_current_user)):
    await log_smart_hub_activity(current_user, {
        "action_type": "ai_action_rejected",
        "title": "AI action rejected",
        "message": f"Owner rejected {action_id}. No record was changed.",
        "related_type": "ai_action",
        "related_id": action_id,
        "status": "rejected",
    })
    return {"success": True, "message": "AI action rejected. No record was changed."}


@api_router.post("/jobs/{job_id}/acknowledge")
async def acknowledge_job(job_id: str, current_user: dict = Depends(get_current_user)):
    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )
    current_role = str(current_user.get("role") or "").lower()
    current_email = str(current_user.get("email") or "").strip().lower()

    job = None
    if len(str(job_id)) == 24:
        try:
            job = await db.jobs.find_one({
                "_id": ObjectId(job_id),
                "$or": [
                    {"business_id": business_id},
                    {"business_id": str(business_id)},
                    {"owner_id": owner_id},
                ]
            })
        except Exception:
            job = None

    if not job:
        job = await db.jobs.find_one({
            "id": job_id,
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
            ]
        })

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_role not in BUSINESS_ROLES | {"worker"}:
        raise HTTPException(status_code=403, detail="Not authorized")

    if current_role == "worker":
        assigned_worker_id = str(job.get("assigned_worker_id") or "")
        assigned_worker_email = str(job.get("assigned_worker_email") or "").strip().lower()

        worker_match = False

        if assigned_worker_id:
            current_ids = {
                str(current_user.get("_id") or ""),
                str(current_user.get("id") or ""),
                str(current_user.get("user_id") or ""),
            }
            if assigned_worker_id in current_ids:
                worker_match = True

            if not worker_match:
                buser = await db.business_users.find_one({"email": current_email, "role": "worker"})
                if buser:
                    buser_ids = {str(buser.get("_id")), str(buser.get("id") or "")}
                    if assigned_worker_id in buser_ids:
                        worker_match = True

        if assigned_worker_email and current_email and assigned_worker_email == current_email:
            worker_match = True

        if not worker_match:
            raise HTTPException(status_code=403, detail="This job is not assigned to you")

    await db.jobs.update_one(
        {"_id": job["_id"]},
        {"$set": {
            "status": "acknowledged",
            "accepted_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    return {
        "success": True,
        "message": "Job acknowledged",
        "status": "acknowledged",
        "id": str(job["_id"]),
    }

@api_router.post("/jobs/{job_id}/pause")
async def pause_job(job_id: str, current_user: dict = Depends(get_current_user)):
    if str(current_user.get("role") or "").lower() not in BUSINESS_ROLES | {"worker"}:
        raise HTTPException(status_code=403, detail="Not authorized")
    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )
    job = None
    if len(str(job_id)) == 24:
        try:
            job = await db.jobs.find_one({"_id": ObjectId(job_id), "$or": [{"business_id": business_id}, {"business_id": str(business_id)}, {"owner_id": owner_id}]})
        except Exception:
            pass
    if not job:
        job = await db.jobs.find_one({"id": job_id, "$or": [{"business_id": business_id}, {"business_id": str(business_id)}, {"owner_id": owner_id}]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    await db.jobs.update_one(
        {"_id": job["_id"]},
        {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"success": True, "status": "paused"}



def pick_client_phone(job=None, client=None):
    candidates = []

    if isinstance(job, dict):
        candidates.extend([
            job.get("client_phone"),
            job.get("phone"),
            job.get("phone_number"),
            job.get("mobile"),
            job.get("mobile_number"),
            job.get("customer_phone"),
        ])
        jc = job.get("client")
        if isinstance(jc, dict):
            candidates.extend([
                jc.get("phone"),
                jc.get("phone_number"),
                jc.get("mobile"),
                jc.get("mobile_number"),
                jc.get("telephone"),
            ])

    if isinstance(client, dict):
        candidates.extend([
            client.get("phone"),
            client.get("phone_number"),
            client.get("mobile"),
            client.get("mobile_number"),
            client.get("telephone"),
            client.get("tel"),
        ])
        contact = client.get("contact")
        if isinstance(contact, dict):
            candidates.extend([
                contact.get("phone"),
                contact.get("phone_number"),
                contact.get("mobile"),
                contact.get("mobile_number"),
            ])

    for value in candidates:
        if value is None:
            continue
        value = str(value).strip()
        if value:
            return value

    return None



async def _compose_accounting_settings(current_user: dict) -> dict:
    business_id = _resolve_business_id(current_user)
    accounting = await db.accounting_settings.find_one({"business_id": business_id}) if hasattr(db, "accounting_settings") else None
    myob = await db.myob_settings.find_one({"business_id": business_id}) if hasattr(db, "myob_settings") else None
    invoice_mode = str((accounting or {}).get("invoice_mode") or "churvox_only").strip().lower()
    if invoice_mode not in INVOICE_MODES:
        invoice_mode = "churvox_only"
    myob_connected = bool((myob or {}).get("connected") is True)
    myob_plan_allowed = await _myob_plan_allowed_for_business(current_user, business_id)
    myob_status = "not_connected"
    if not myob_plan_allowed:
        myob_status = "upgrade_required"
    elif myob_connected:
        myob_status = "connected"
    return {
        "invoice_mode": invoice_mode,
        "myob_connected": myob_connected,
        "myob_plan_allowed": myob_plan_allowed,
        "myob_status": myob_status,
        "last_sync_at": _safe_iso((myob or {}).get("last_sync_at")),
    }


@api_router.get("/accounting/settings")
async def get_accounting_settings(current_user: dict = Depends(get_current_user)):
    try:
        data = await _compose_accounting_settings(current_user)
        return {"success": True, "data": data}
    except Exception as e:
        print("ACCOUNTING_SETTINGS_ERROR", str(e), current_user)
        raise HTTPException(status_code=500, detail="Failed to load accounting settings")


@api_router.post("/accounting/settings")
async def post_accounting_settings(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ACCOUNTING_CONFIG_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to configure accounting settings")
    business_id = _resolve_business_id(current_user)
    payload = await request.json()
    invoice_mode = str((payload or {}).get("invoice_mode") or "").strip().lower()
    if invoice_mode not in INVOICE_MODES:
        raise HTTPException(status_code=400, detail="Invalid invoice mode")
    myob_plan_allowed = await _myob_plan_allowed_for_business(current_user, business_id)
    if invoice_mode in {"myob_sync", "myob_external"} and not myob_plan_allowed:
        raise HTTPException(status_code=400, detail="Your plan does not include MYOB. Upgrade or add the MYOB add-on first.")
    now = datetime.now(timezone.utc)
    await db.accounting_settings.update_one(
        {"business_id": business_id},
        {"$set": {"business_id": business_id, "invoice_mode": invoice_mode, "updated_at": now}, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    data = await _compose_accounting_settings(current_user)
    return {"success": True, "data": data}


async def _run_myob_sync(invoice_id: str, current_user: dict, *, is_retry: bool = False):
    business_id = _resolve_business_id(current_user)
    owner_id = _resolve_owner_id(current_user)
    settings = await _compose_accounting_settings(current_user)
    if settings.get("invoice_mode") not in {"myob_sync", "myob_external"}:
        raise HTTPException(status_code=400, detail="MYOB sync is only available in MYOB invoice modes")
    if not settings.get("myob_plan_allowed"):
        raise HTTPException(status_code=400, detail="Your plan does not include MYOB")
    try:
        obj_id = ObjectId(invoice_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    invoice = await db.invoices.find_one(_invoice_access_query(obj_id, business_id, owner_id))
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not settings.get("myob_connected"):
        message = "Connect MYOB before syncing invoices."
        await db.invoices.update_one(
            {"_id": obj_id},
            {"$set": {"myob_sync_status": "setup_required", "myob_error": message, "updated_at": datetime.now(timezone.utc)}},
        )
        updated = await db.invoices.find_one({"_id": obj_id})
        return {"success": False, "message": message, "data": _serialize_invoice(updated)}
    message = "MYOB invoice sync is not configured yet. Connect and enable invoice API sync first."
    await db.invoices.update_one(
        {"_id": obj_id},
        {"$set": {"myob_sync_status": "failed", "myob_error": message, "updated_at": datetime.now(timezone.utc)}},
    )
    updated = await db.invoices.find_one({"_id": obj_id})
    return {"success": False, "message": message, "data": _serialize_invoice(updated), "retry": is_retry}


@api_router.post("/invoices/{invoice_id}/myob-sync")
async def invoice_myob_sync(invoice_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await _run_myob_sync(invoice_id, current_user, is_retry=False)


@api_router.post("/invoices/{invoice_id}/myob-retry")
async def invoice_myob_retry(invoice_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await _run_myob_sync(invoice_id, current_user, is_retry=True)


@api_router.get("/invoices/{invoice_id}/myob-status")
async def invoice_myob_status(invoice_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _resolve_business_id(current_user)
    owner_id = _resolve_owner_id(current_user)
    try:
        obj_id = ObjectId(invoice_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    invoice = await db.invoices.find_one(_invoice_access_query(obj_id, business_id, owner_id))
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {
        "success": True,
        "data": {
            "myob_sync_status": invoice.get("myob_sync_status") or "not_synced",
            "myob_invoice_id": invoice.get("myob_invoice_id") or "",
            "myob_invoice_number": invoice.get("myob_invoice_number") or "",
            "myob_last_synced_at": _safe_iso(invoice.get("myob_last_synced_at")),
            "myob_error": invoice.get("myob_error") or "",
            "myob_payment_status": invoice.get("myob_payment_status") or "",
            "myob_invoice_url": invoice.get("myob_invoice_url") or "",
        },
    }


@api_router.get("/myob/settings")
async def get_myob_settings(current_user: dict = Depends(get_current_user)):
    data = await _compose_accounting_settings(current_user)
    return {
        "success": True,
        "data": {
            "enabled": data.get("myob_plan_allowed"),
            "connected": data.get("myob_connected"),
            "invoice_mode": data.get("invoice_mode"),
            "myob_status": data.get("myob_status"),
            "last_sync_at": data.get("last_sync_at"),
            "pro_addon_enabled": bool(data.get("myob_plan_allowed") and normalize_plan(current_user.get("plan")) == "pro"),
        },
    }




@api_router.get("/user/trade")
async def get_user_trade(current_user: dict = Depends(get_current_user)):
    try:
        return {
            "success": True,
            "trade": current_user.get("trade") or current_user.get("industry") or "lawn_care"
        }
    except Exception as e:
        print("GET_USER_TRADE_ERROR", str(e), current_user)
        return {
            "success": True,
            "trade": "lawn_care"
        }


@api_router.patch("/user/trade")
async def update_user_trade(request: Request, current_user: dict = Depends(get_current_user)):
    try:
        payload = await request.json()
        trade = str(
            payload.get("trade_type")
            or payload.get("trade")
            or payload.get("industry")
            or ""
        ).strip()

        if not trade:
            raise HTTPException(status_code=400, detail="Trade is required")

        user_id = current_user.get("_id") or current_user.get("id") or current_user.get("user_id")
        business_id = current_user.get("business_id") or current_user.get("businessId") or current_user.get("id") or current_user.get("_id")

        update_doc = {
            "trade": trade,
            "industry": trade,
        }

        # update user record
        try:
            if user_id:
                if isinstance(user_id, str) and len(user_id) == 24:
                    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_doc})
                else:
                    await db.users.update_one({"id": str(user_id)}, {"$set": update_doc})
        except Exception as e:
            print("USER_TRADE_USERS_UPDATE_SKIP", str(e))

        # update business record too if possible
        try:
            if business_id:
                if isinstance(business_id, str) and len(business_id) == 24:
                    await db.businesses.update_one({"_id": ObjectId(business_id)}, {"$set": update_doc})
                else:
                    await db.businesses.update_one({"id": str(business_id)}, {"$set": update_doc})
        except Exception as e:
            print("USER_TRADE_BUSINESS_UPDATE_SKIP", str(e))

        return {
            "success": True,
            "trade": trade
        }
    except HTTPException:
        raise
    except Exception as e:
        print("PATCH_USER_TRADE_ERROR", str(e), current_user)
        raise HTTPException(status_code=500, detail="Failed to update trade")

@api_router.get("/user/gst")
async def get_user_gst(current_user: dict = Depends(get_current_user)):
    try:
        return {
            "success": True,
            "gst_enabled": bool(current_user.get("gst_enabled", True)),
            "gst_rate": float(current_user.get("gst_rate", 15) or 15),
        }
    except Exception as e:
        print("GET_USER_GST_ERROR", str(e), current_user)
        return {
            "success": True,
            "gst_enabled": True,
            "gst_rate": 15,
        }


@api_router.patch("/user/gst")
async def update_user_gst(request: Request, current_user: dict = Depends(get_current_user)):
    try:
        payload = await request.json()
        gst_enabled = bool(payload.get("gst_enabled", True))
        try:
            gst_rate = float(payload.get("gst_rate", 15) or 15)
        except Exception:
            gst_rate = 15.0

        user_id = current_user.get("_id") or current_user.get("id") or current_user.get("user_id")
        update_doc = {
            "gst_enabled": gst_enabled,
            "gst_rate": gst_rate,
        }

        try:
            if user_id:
                await db.users.update_one({"_id": user_id} if not isinstance(user_id, str) else {"$or":[{"_id": ObjectId(user_id)}] if len(user_id)==24 else {"id": user_id}}, {"$set": update_doc})
        except Exception:
            pass

        return {
            "success": True,
            "gst_enabled": gst_enabled,
            "gst_rate": gst_rate,
        }
    except Exception as e:
        print("PATCH_USER_GST_ERROR", str(e), current_user)
        raise HTTPException(status_code=500, detail="Failed to update GST")

async def _send_sms_real(payload: dict, current_user: dict):
    """
    Real SMS send pipeline used by both /api/sms/send and the legacy
    /api/sms/send-fixed alias. Resolves the recipient phone, checks credits,
    calls the configured SMS provider, refunds credits on provider failure,
    and persists a real audit log entry.
    """
    user = current_user
    business_id = str(user.get("business_id") or user.get("id"))
    sms_type = str(payload.get("type") or payload.get("message_type") or "").strip().lower()
    custom_message = str(payload.get("message") or "").strip()

    # --- Lookup job & client context (same logic as previous fixed endpoint) ---
    job = None
    client = None
    job_id = payload.get("job_id")
    client_id = payload.get("client_id")

    if job_id:
        job = await db.jobs.find_one({"id": str(job_id)})
        if not job:
            try: job = await db.jobs.find_one({"_id": ObjectId(str(job_id))})
            except Exception: job = None

    if client_id:
        client = await db.clients.find_one({"id": str(client_id)})
        if not client:
            try: client = await db.clients.find_one({"_id": ObjectId(str(client_id))})
            except Exception: client = None

    if not client and isinstance(job, dict):
        linked_client_id = job.get("client_id") or job.get("customer_id")
        if linked_client_id:
            client = await db.clients.find_one({"id": str(linked_client_id)})
            if not client:
                try: client = await db.clients.find_one({"_id": ObjectId(str(linked_client_id))})
                except Exception: client = None

    # --- Resolve phone (explicit > helper fallback chain) ---
    phone = None
    for key in ["phone", "phone_number", "mobile", "mobile_number", "recipient_phone", "client_phone"]:
        value = payload.get(key)
        if value is not None and str(value).strip():
            phone = str(value).strip()
            break
    if not phone and isinstance(job, dict):
        phone = await resolve_job_sms_phone(job)
    if not phone and isinstance(client, dict):
        phone = get_phone_from_dict(client)
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number found for this recipient")

    # --- Credits: charge 2 per SMS, refunded if provider fails ---
    sms_cost = 2
    sms_credits = await db.sms_credits.find_one({"business_id": business_id})
    if not sms_credits:
        raise HTTPException(status_code=402, detail="Not enough SMS credits")
    balance_field = "balance" if "balance" in sms_credits else "credits"
    current_balance = int(sms_credits.get(balance_field, 0) or 0)
    if current_balance < sms_cost:
        raise HTTPException(status_code=402, detail="Not enough SMS credits")

    await db.sms_credits.update_one(
        {"business_id": business_id},
        {"$inc": {balance_field: -sms_cost},
         "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    new_balance = current_balance - sms_cost

    # --- Build message body ---
    if custom_message:
        sms_message = custom_message
    elif sms_type in ("on_the_way", "on the way", "ontheway"):
        sms_message = "On the way — heads up, we'll be with you shortly."
    elif sms_type in ("customer_reminder", "reminder"):
        sms_message = "Friendly reminder about your upcoming job from Churvox."
    elif sms_type == "invoice_reminder":
        sms_message = "Friendly reminder: your Churvox invoice is due for payment."
    else:
        sms_message = "Quick message from Churvox."

    # --- Call the real provider ---
    source_label = str(payload.get("source") or user.get("business_name") or "Churvox")[:32]
    result = None
    error_msg = None
    try:
        result = await sms_provider.send(to=phone, body=sms_message, source=source_label)
    except Exception as e:
        error_msg = f"SMS provider crashed: {e}"

    success = bool(getattr(result, "success", False)) if result else False
    provider_name = getattr(result, "provider", "unknown") if result else "unknown"
    provider_status = getattr(result, "status", "UNKNOWN") if result else "ERROR"
    provider_error = error_msg or (getattr(result, "error", None) if result else "Unknown error")
    provider_message_id = getattr(result, "message_id", None) if result else None
    provider_cost = getattr(result, "cost", None) if result else None

    # --- Refund credits on provider failure ---
    refunded = False
    if not success:
        await db.sms_credits.update_one(
            {"business_id": business_id},
            {"$inc": {balance_field: sms_cost},
             "$set": {"updated_at": datetime.now(timezone.utc)}},
        )
        new_balance = current_balance
        refunded = True

    # --- Audit log ---
    log_doc = {
        "business_id": business_id,
        "job_id": str(job_id) if job_id else None,
        "client_id": str(client_id) if client_id else (
            str(client.get("id")) if isinstance(client, dict) and client.get("id") else None
        ),
        "recipient_phone": phone,
        "phone": phone,
        "message": sms_message,
        "message_type": sms_type or "quick_sms",
        "type": sms_type or "quick_sms",
        "cost": 0 if refunded else sms_cost,
        "provider": provider_name,
        "provider_message_id": provider_message_id,
        "provider_cost": provider_cost,
        "status": provider_status if success else "FAILED",
        "error": None if success else provider_error,
        "sent_by_user_id": str(user.get("_id") or user.get("id") or ""),
        "sent_by_name": user.get("name") or user.get("email") or "",
        "created_at": datetime.now(timezone.utc),
    }
    try:
        await db.sms_log.insert_one(log_doc)
    except Exception as e:
        print(f"SMS_LOG_ERR {e}")

    if not success:
        raise HTTPException(
            status_code=502,
            detail=f"SMS delivery failed: {provider_error or provider_status}",
        )

    return {
        "success": True,
        "data": {
            "phone": phone,
            "message": sms_message,
            "cost": sms_cost,
            "balance": new_balance,
            "provider": provider_name,
            "provider_message_id": provider_message_id,
            "status": provider_status,
        },
    }


@api_router.post("/sms/send")
async def send_sms(payload: dict, current_user: dict = Depends(get_current_user)):
    """Primary SMS send endpoint — real provider, real credits, real audit log."""
    return await _send_sms_real(payload, current_user)


@api_router.post("/sms/send-fixed")
async def send_sms_hard_fix_v1(payload: dict, current_user: dict = Depends(get_current_user)):
    """Legacy alias kept for backward compatibility — forwards to the real pipeline."""
    return await _send_sms_real(payload, current_user)


def _normalize_phone_for_sms(phone: str) -> str:
    raw = str(phone or "").strip()
    if not raw:
        return ""
    try:
        return format_phone_au_nz(raw)
    except Exception:
        return raw


@api_router.post("/communications/drafts")
async def create_communication_draft(payload: dict, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str(current_user.get("role") or "").lower())
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    client_id = str((payload or {}).get("client_id") or "")
    client = None
    if client_id:
        client = await db.clients.find_one({"business_id": business_id, "$or": [{"id": client_id}] + ([{"_id": ObjectId(client_id)}] if ObjectId.is_valid(client_id) else [])})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    doc = {
        "business_id": business_id,
        "client_id": client_id,
        "job_id": str((payload or {}).get("job_id") or ""),
        "invoice_id": str((payload or {}).get("invoice_id") or ""),
        "quote_id": str((payload or {}).get("quote_id") or ""),
        "worker_id": str((payload or {}).get("worker_id") or ""),
        "channel": str((payload or {}).get("channel") or "sms"),
        "direction": "outbound",
        "status": "draft",
        "message_type": str((payload or {}).get("message_type") or "custom"),
        "subject": str((payload or {}).get("subject") or ""),
        "body": str((payload or {}).get("body") or ""),
        "to_email": str((payload or {}).get("to_email") or (client or {}).get("email") or ""),
        "to_phone": str((payload or {}).get("to_phone") or get_phone_from_dict(client or {}) or ""),
        "provider_message_id": None,
        "error_message": None,
        "source": "ai_operator",
        "requires_owner_approval": bool((payload or {}).get("requires_owner_approval", True)),
        "approved_by_user_id": None,
        "approved_by_name": None,
        "approved_at": None,
        "scheduled_for": (payload or {}).get("scheduled_for"),
        "sent_at": None,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.communications.insert_one(doc)
    saved = await db.communications.find_one({"_id": res.inserted_id})
    return {"success": True, "communication": serialize_doc(saved)}


@api_router.post("/communications/{communication_id}/approve")
async def approve_communication(communication_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    if not ObjectId.is_valid(communication_id):
        raise HTTPException(status_code=400, detail="Invalid communication id")
    row = await db.communications.find_one({"_id": ObjectId(communication_id), "business_id": business_id})
    if not row:
        raise HTTPException(status_code=404, detail="Communication not found")
    now = datetime.now(timezone.utc)
    await db.communications.update_one({"_id": row["_id"]}, {"$set": {"status": "approved", "approved_by_user_id": str(current_user.get("id") or ""), "approved_by_name": str(current_user.get("name") or ""), "approved_at": now, "updated_at": now}})
    return {"success": True}


@api_router.post("/communications/{communication_id}/send")
async def send_communication(communication_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    if not ObjectId.is_valid(communication_id):
        raise HTTPException(status_code=400, detail="Invalid communication id")
    row = await db.communications.find_one({"_id": ObjectId(communication_id), "business_id": business_id})
    if not row:
        raise HTTPException(status_code=404, detail="Communication not found")
    if str(row.get("status") or "") == "sent":
        raise HTTPException(status_code=409, detail="Communication already sent")
    now = datetime.now(timezone.utc)
    try:
        if str(row.get("channel") or "").lower() == "email":
            if not str(row.get("to_email") or "").strip():
                raise HTTPException(status_code=400, detail="No email saved")
            if not os.getenv("RESEND_API_KEY") and not os.getenv("POSTMARK_API_KEY"):
                raise HTTPException(status_code=400, detail="Email provider is not configured.")
            email_result = await send_email(
                to=str(row.get("to_email") or "").strip(),
                subject=str(row.get("subject") or "Message from Churvox"),
                html=str(row.get("body") or ""),
                text=str(row.get("body") or ""),
            )
            if not bool(getattr(email_result, "success", False)):
                raise HTTPException(status_code=502, detail=str(getattr(email_result, "error", None) or "Email send failed"))
            provider_message_id = getattr(email_result, "email_id", None)
        else:
            to_phone = _normalize_phone_for_sms(row.get("to_phone"))
            if not to_phone:
                raise HTTPException(status_code=400, detail="No phone saved")
            sms_res = await _send_sms_real({"phone": to_phone, "message": str(row.get("body") or ""), "type": str(row.get("message_type") or "custom"), "job_id": row.get("job_id"), "client_id": row.get("client_id"), "source": "ai_operator"}, current_user)
            provider_message_id = (((sms_res or {}).get("data") or {}).get("provider_message_id"))
    except HTTPException as e:
        msg = "SMS is not configured or enabled." if str(row.get("channel") or "").lower() == "sms" and e.status_code in {402, 500, 502} else str(e.detail)
        await db.communications.update_one({"_id": row["_id"]}, {"$set": {"status": "failed", "error_message": msg, "updated_at": now}})
        raise HTTPException(status_code=e.status_code, detail=msg)
    await db.communications.update_one({"_id": row["_id"]}, {"$set": {"status": "sent", "provider_message_id": provider_message_id, "error_message": None, "sent_at": now, "updated_at": now}})
    await log_smart_hub_activity(current_user, {"action_type": "communication_sent", "title": f"{str(row.get('channel') or '').upper()} reminder sent", "message": f"{str(row.get('channel') or '').upper()} reminder sent to {str(row.get('to_phone') or row.get('to_email') or 'client')}", "related_type": "communication", "related_id": communication_id, "related_client_id": row.get("client_id"), "related_job_id": row.get("job_id"), "related_invoice_id": row.get("invoice_id"), "related_quote_id": row.get("quote_id"), "status": "completed"})
    return {"success": True}


@api_router.post("/communications/{communication_id}/approve-and-send")
async def approve_and_send_communication(communication_id: str, current_user: dict = Depends(get_current_user)):
    await approve_communication(communication_id, current_user)
    return await send_communication(communication_id, current_user)


@api_router.get("/communications")
async def list_communications(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    rows = [serialize_doc(r) async for r in db.communications.find({"business_id": business_id}).sort("created_at", -1).limit(300)]
    return {"success": True, "communications": rows}

@api_router.get("/dev/owner-login")
async def dev_owner_login(response: Response):
    email = (os.environ.get("PLATFORM_OWNER_EMAILS", "hello@churvox.com").split(",")[0].strip())

    user = await db.users.find_one({"email": email})
    if user:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "email": email,
                "name": "Howard Jennings",
                "business_name": "Churvox",
                "role": "admin",
                "status": "active",
                "is_active": True,
                "is_platform_owner": True,
                "plan": "enterprise",
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        user = await db.users.find_one({"email": email})
    else:
        user_doc = {
            "email": email,
            "name": "Howard Jennings",
            "business_name": "Churvox",
            "role": "admin",
            "status": "active",
            "is_active": True,
            "is_platform_owner": True,
            "plan": "enterprise",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.users.insert_one(user_doc)
        user = await db.users.find_one({"_id": result.inserted_id})

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return {
        "success": True,
        "message": "Owner login created",
        "email": email,
        "user_id": user_id,
        "redirect_to": "/admin"
    }


@app.get("/health")
async def health():
    return {"ok": True}


@app.on_event("startup")
async def _force_owner_bootstrap():
    try:
        ensure_owner_account()
        print("[startup] owner bootstrap complete")
    except Exception as e:
        print(f"[startup] owner bootstrap failed: {e}")


def utc_now():
    return datetime.now(timezone.utc)

def to_utc_dt(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            value = value.replace("Z", "+00:00")
            dt = datetime.fromisoformat(value)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None

async def get_owner_doc_for_user(user: dict):
    business_id = user.get("business_id") or user.get("id")
    owner = None
    try:
        owner = await db.users.find_one({"_id": ObjectId(str(business_id))})
    except Exception:
        owner = None
    if not owner:
        owner = await db.users.find_one({"_id": ObjectId(str(user["id"]))})
    return owner

@api_router.post("/billing/start-trial")
async def start_trial(request: Request):
    current_user = await get_current_user(request)
    user_id = current_user.get("_id") or current_user.get("id")
    existing_plan = current_user.get("plan")

    if existing_plan and str(existing_plan).strip().lower() not in ("", "null", "none"):
        raise HTTPException(status_code=400, detail="You already have an active plan")

    payload = await request.json()
    # CHURVOX_LAUNCH_TRIAL_PLAN_ALIAS_FIX
    _raw_plan = (payload or {}).get("plan_type") or (payload or {}).get("plan") or (payload or {}).get("plan_id") or ""
    plan_type = str(_raw_plan or "").strip().lower().replace("-", "_").replace(" ", "_")
    plan_type = {
        "start": "solo",
        "starter": "solo",
        "crew": "team",
        "operator": "pro",
        "command": "enterprise",
    }.get(plan_type, plan_type)

    if plan_type not in ("solo", "team", "pro", "enterprise"):
        raise HTTPException(status_code=400, detail="Invalid plan type")

    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=14)

    update_fields = {
        "plan": plan_type,
        "plan_status": "trialing",
        "subscription_status": "trialing",
        "trial_started_at": now,
        "trial_ends_at": trial_end,
        "updated_at": now,
    }

    try:
        await db.users.update_one({"_id": ObjectId(str(user_id))}, {"$set": update_fields})
    except Exception:
        await db.users.update_one({"_id": user_id}, {"$set": update_fields})

    business_id = current_user.get("business_id")
    if business_id:
        try:
            await db.businesses.update_one(
                {"_id": ObjectId(str(business_id))},
                {"$set": {"plan": plan_type, "updated_at": now}}
            )
        except Exception:
            pass

    return {
        "success": True,
        "plan": plan_type,
        "plan_status": "trialing",
        "trial_started_at": now.isoformat(),
        "trial_ends_at": trial_end.isoformat(),
        "message": f"14-day free trial started on {plan_type.title()} plan",
    }


def build_billing_status(owner: dict):
    now = utc_now()
    trial_started_at = to_utc_dt(owner.get("trial_started_at"))
    trial_ends_at = to_utc_dt(owner.get("trial_ends_at"))
    subscription_status = str(owner.get("subscription_status") or owner.get("plan_status") or "").lower()
    stripe_subscription_id = owner.get("stripe_subscription_id")
    raw_plan = owner.get("plan")
    plan = str(normalize_plan(raw_plan)).lower() if raw_plan else None

    on_paid_plan = bool(stripe_subscription_id) and subscription_status in {"active", "trialing", "past_due"}
    trial_active = (trial_ends_at is not None) and (now < trial_ends_at) and not on_paid_plan
    trial_expired = (trial_ends_at is not None) and (now >= trial_ends_at) and not on_paid_plan

    days_left = 0
    if trial_active and trial_ends_at:
        seconds_left = (trial_ends_at - now).total_seconds()
        days_left = max(0, int(seconds_left // 86400))
        if seconds_left > 0 and days_left == 0:
            days_left = 1

    return {
        "plan": plan,
        "plan_status": owner.get("plan_status") or ("paid" if on_paid_plan else "trialing" if trial_active else "expired"),
        "subscription_status": owner.get("subscription_status") or ("active" if on_paid_plan else "trialing" if trial_active else "inactive"),
        "trial_started_at": trial_started_at.isoformat() if trial_started_at else None,
        "trial_ends_at": trial_ends_at.isoformat() if trial_ends_at else None,
        "trial_active": trial_active,
        "trial_expired": trial_expired,
        "days_left": days_left,
        "requires_payment": trial_expired and not on_paid_plan,
        "has_paid_subscription": on_paid_plan,
        "stripe_customer_id": owner.get("stripe_customer_id"),
        "stripe_subscription_id": stripe_subscription_id,
    }





@api_router.post("/team/import-csv")
async def import_csv_workers(request: Request, current_user: dict = Depends(get_current_user)):
    import csv
    import io
    import re
    from datetime import datetime, timezone

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    form = await request.form()
    upload = form.get("file")
    if not upload:
        raise HTTPException(status_code=400, detail="No CSV file uploaded")

    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    try:
        text_data = content.decode("utf-8-sig")
    except Exception:
        text_data = content.decode("utf-8", errors="ignore")

    rows = list(csv.reader(io.StringIO(text_data)))
    rows = [row for row in rows if row and any(str(cell).strip() for cell in row)]
    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    def norm_header(value):
        value = str(value or "").replace("\ufeff", "").strip().lower()
        value = re.sub(r"[\s\-\/]+", "_", value)
        value = re.sub(r"_+", "_", value).strip("_")
        return value

    header_aliases = {
        "name": {"name", "full_name", "employee_name", "worker_name"},
        "first_name": {"first_name", "firstname", "given_name", "givenname"},
        "last_name": {"last_name", "lastname", "surname", "family_name", "familyname"},
        "email": {"email", "email_address", "worker_email", "employee_email"},
        "phone": {"phone", "mobile", "mobile_phone", "phone_number", "contact_number", "mobile_number"},
        "role": {"role", "worker_role", "employee_role", "position"},
        "region": {"region", "state", "region_state", "area"},
        "country": {"country"},
    }

    first = [norm_header(v) for v in rows[0]]

    def detect_header_map(first_row):
        mapping = {}
        for idx, col in enumerate(first_row):
            for target, aliases in header_aliases.items():
                if col in aliases:
                    mapping[target] = idx
                    break
        return mapping

    header_map = detect_header_map(first)
    has_header = any(k in header_map for k in ["name", "first_name", "last_name", "email", "phone", "role", "region", "country"])

    if has_header:
        data_rows = rows[1:]
    else:
        first_cells = [str(c).strip() for c in rows[0]]
        looks_like_email = any("@" in c for c in first_cells)
        if not looks_like_email:
            raise HTTPException(
                status_code=400,
                detail="CSV headers not recognized. Expected columns: name, email, phone (or first_name, last_name, email, phone)"
            )
        data_rows = rows
        header_map = {"name": 0, "email": 1, "phone": 2}

    def get_cell(cells, field_name):
        idx = header_map.get(field_name)
        if idx is None or idx >= len(cells):
            return ""
        return str(cells[idx]).strip()

    def normalize_role(raw_role: str) -> str:
        role_key = norm_header(raw_role)
        role_map = {
            "worker": "worker",
            "employee": "worker",
            "staff": "worker",
            "manager": "manager",
            "office_admin": "office_admin",
            "payroll": "payroll",
        }
        safe_role = role_map.get(role_key, "worker")
        if safe_role in {"owner", "platform_owner"}:
            return "worker"
        return safe_role

    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_id = str(
        current_user.get("_id")
        or current_user.get("id")
        or current_user.get("user_id")
        or ""
    )

    if not business_id:
        raise HTTPException(status_code=400, detail="Could not determine business ID for team import")

    invited = 0
    updated = 0
    skipped = 0
    details = []

    for row_num, row in enumerate(data_rows, start=2 if has_header else 1):
        try:
            name = get_cell(row, "name")
            first_name = get_cell(row, "first_name")
            last_name = get_cell(row, "last_name")
            email = get_cell(row, "email").lower()
            phone = get_cell(row, "phone")
            role = normalize_role(get_cell(row, "role"))
            region = get_cell(row, "region")
            country = get_cell(row, "country")

            if not name:
                name = " ".join(part for part in [first_name, last_name] if part).strip()
            if not name and first_name:
                name = first_name

            if not email:
                skipped += 1
                details.append({"row": row_num, "status": "skipped", "reason": "Missing email"})
                continue

            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
                skipped += 1
                details.append({"row": row_num, "status": "skipped", "reason": "Invalid email"})
                continue

            if not name:
                skipped += 1
                details.append({"row": row_num, "status": "skipped", "reason": "Missing name"})
                continue

            existing = await db.business_users.find_one({
                "business_id": business_id,
                "email": email,
            })

            if existing:
                update_doc = {
                    "name": name,
                    "phone": phone,
                    "role": role,
                    "country": country,
                    "region": region,
                    "updated_at": datetime.now(timezone.utc),
                }
                await db.business_users.update_one({"_id": existing["_id"]}, {"$set": update_doc})
                updated += 1
                details.append({"row": row_num, "status": "updated", "reason": ""})
                continue

            worker_doc = {
                "name": name,
                "email": email,
                "phone": phone,
                "role": role,
                "status": "invited",
                "country": country,
                "region": region,
                "business_id": business_id,
                "owner_id": owner_id,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }

            result = await db.business_users.insert_one(worker_doc)

            try:
                invite_token = str(result.inserted_id)
                invite_link = f"{FRONTEND_URL}/invite/setup/{invite_token}"
                biz_name = str(current_user.get("business_name") or "").strip()
                inv_subject, inv_html = build_invite_email(
                    name=name,
                    invite_link=invite_link,
                    business_name=biz_name,
                    role=role,
                )
                await send_email(to_email=email, subject=inv_subject, html_content=inv_html)
                print(f"TEAM_INVITE_CSV_EMAIL_SENT to={email}")
            except Exception as e:
                print(f"TEAM_INVITE_CSV_EMAIL_ERROR to={email} error={repr(e)}")

            invited += 1
            details.append({"row": row_num, "status": "invited", "reason": ""})

        except Exception as row_error:
            skipped += 1
            details.append({"row": row_num, "status": "skipped", "reason": str(row_error)})

    return {
        "success": True,
        "invited": invited,
        "updated": updated,
        "imported": invited,
        "skipped": skipped,
        "total": len(data_rows),
        "details": details,
        "message": f"{invited} invited, {updated} updated, {skipped} skipped of {len(data_rows)} rows."
    }

# CLIENT_IMPORT_CORS_REDEPLOY_MARKER
@api_router.options("/clients/import-csv")
async def options_import_csv_clients():
    return Response(status_code=204)


@api_router.post("/clients/import-csv")
async def import_csv_clients(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Import clients from CSV. Expects multipart form data with a 'file' field.
    Supports either:
    - header-based CSVs with common client column names, or
    - simple positional CSVs in this order:
      client_name,contact_name,email,phone,address,notes
    """
    import csv
    import io
    import re

    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    form = await request.form()
    upload = form.get("file")

    if not upload:
        raise HTTPException(status_code=400, detail="No CSV file uploaded")

    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    try:
        text_data = content.decode("utf-8-sig")
    except Exception:
        text_data = content.decode("utf-8", errors="ignore")

    def norm_header(value: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())

    header_aliases = {
        "client_name": {"clientname", "name", "customername", "client", "customer"},
        "contact_name": {"contactname", "contact", "primarycontact", "contactperson"},
        "email": {"email", "emailaddress"},
        "phone": {"phone", "phonenumber", "mobile", "mobilenumber", "cell", "telephone"},
        "address": {"address", "street", "streetaddress", "fulladdress"},
        "notes": {"notes", "note", "comments", "comment"},
    }

    raw_reader = list(csv.reader(io.StringIO(text_data)))
    rows = [row for row in raw_reader if row and any(str(cell).strip() for cell in row)]
    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    first = [norm_header(v) for v in rows[0]]

    def detect_header_map(first_row):
        mapping = {}
        for idx, col in enumerate(first_row):
            for target, aliases in header_aliases.items():
                if col in aliases:
                    mapping[target] = idx
                    break
        return mapping

    header_map = detect_header_map(first)
    has_header = "client_name" in header_map or "email" in header_map or "phone" in header_map or "address" in header_map

    if has_header:
        data_rows = rows[1:]
    else:
        first_cells = [str(c).strip() for c in rows[0]]
        if len(first_cells) < 1 or all(len(c) < 2 for c in first_cells):
            raise HTTPException(
                status_code=400,
                detail="CSV headers not recognized. Expected columns: client_name, email, phone, address (or name, email, phone)"
            )
        data_rows = rows
        header_map = {
            "client_name": 0,
            "contact_name": 1,
            "email": 2,
            "phone": 3,
            "address": 4,
            "notes": 5,
        }

    def get_cell(cells, field_name):
        idx = header_map.get(field_name)
        if idx is None or idx >= len(cells):
            return ""
        return str(cells[idx]).strip()

    owner_id = current_user.get("_id") or current_user.get("id") or current_user.get("user_id")
    business_id = str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )
    owner_email = current_user.get("email")

    if not business_id:
        raise HTTPException(status_code=400, detail="Could not determine business ID for client import")

    imported = 0
    skipped = 0
    details = []

    for i, row in enumerate(data_rows, start=2 if has_header else 1):
        try:
            cells = [str(v).strip() for v in row]
            if not cells or not any(cells):
                skipped += 1
                details.append({"row": i, "status": "skipped", "reason": "Blank row"})
                continue

            client_name = get_cell(cells, "client_name")
            contact_name = get_cell(cells, "contact_name")
            email = get_cell(cells, "email").lower()
            phone = get_cell(cells, "phone")
            address = get_cell(cells, "address")
            notes = get_cell(cells, "notes")

            if not client_name:
                skipped += 1
                details.append({"row": i, "status": "skipped", "reason": "Missing client name"})
                continue

            dup_query = {
                "$and": [
                    {"business_id": business_id},
                    {
                        "$or": [
                            {"client_name": client_name},
                            {"name": client_name},
                            *([{"email": email}] if email else []),
                        ]
                    },
                ]
            }

            existing = await db.clients.find_one(dup_query)
            if existing:
                skipped += 1
                details.append({"row": i, "status": "skipped", "reason": "Duplicate client"})
                continue

            client_doc = {
                "client_name": client_name,
                "name": client_name,
                "contact_name": contact_name or client_name,
                "email": email,
                "phone": phone,
                "address": address,
                "notes": notes,
                "business_id": business_id,
                "owner_id": str(owner_id) if owner_id else None,
                "owner_email": owner_email,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }

            await db.clients.insert_one(client_doc)
            imported += 1
            details.append({"row": i, "status": "imported", "reason": ""})

        except Exception as row_error:
            skipped += 1
            details.append({"row": i, "status": "skipped", "reason": str(row_error)})

    return {
        "success": True,
        "imported": imported,
        "skipped": skipped,
        "total": len(data_rows),
        "details": details[:100],
        "message": f"Imported {imported} clients, skipped {skipped} rows."
    }

@api_router.get("/billing/status")
async def billing_status(request: Request):
    user = await get_current_user(request)
    owner = await get_owner_doc_for_user(user)
    if not owner:
        raise HTTPException(status_code=404, detail="Business owner record not found")
    return build_billing_status(owner)


@api_router.get("/billing/currency")
async def billing_currency(request: Request, country: str = None):
    """
    Return the resolved country/currency + display prices for all plans.
    Source of truth priority:
      1. Saved user/business country (once known) — authoritative.
      2. `country` query hint (from frontend first-visit geo/locale detection).
      3. Safe default (New Zealand / NZD).
    """
    saved_country = ""
    saved_currency = ""
    try:
        user = await get_current_user(request)
        if user:
            saved_country = str(user.get("country") or "").strip()
            saved_currency = str(user.get("currency") or "").strip().upper()
    except Exception:
        user = None  # public caller OK

    # Priority: saved > hint > default
    if saved_country:
        final_country = saved_country
    elif country and str(country).strip():
        final_country = str(country).strip()
    else:
        final_country = "New Zealand"

    final_currency = saved_currency or resolve_currency(final_country)
    # If the saved currency is somehow unsupported, recompute from country
    if final_currency not in PRICING_TABLE:
        final_currency = resolve_currency(final_country)

    table = PRICING_TABLE.get(final_currency) or PRICING_TABLE["NZD"]
    prices = {
        plan: {
            "amount": table.get(plan, 0),
            "currency": final_currency,
            "symbol": table.get("symbol", "$"),
            "display": f"{table.get('symbol', '$')}{table.get(plan, 0)}",
        }
        for plan in ("solo", "team", "pro", "enterprise")
    }
    return {
        "country": final_country,
        "currency": final_currency,
        "source": "user_saved" if saved_country else ("hint" if country else "default"),
        "supported_currencies": list(PRICING_TABLE.keys()),
        "prices": prices,
    }

@api_router.get("/billing/guard")
async def billing_guard(request: Request):
    user = await get_current_user(request)
    owner = await get_owner_doc_for_user(user)
    if not owner:
        raise HTTPException(status_code=404, detail="Business owner record not found")
    status = build_billing_status(owner)
    return {
        "allowed": (not status["requires_payment"]),
        "reason": "trial_expired_payment_required" if status["requires_payment"] else "ok",
        **status
    }



@api_router.get("/auth/verify-email")
async def verify_email(token: str):
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")

    user = await db.users.find_one({"email_verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "email_verified": True,
            "email_verification_token": None,
            "email_verified_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    return {
        "message": "Email verified successfully",
        "email": user.get("email"),
        "email_verified": True
    }


class ResendVerificationRequest(BaseModel):
    email: EmailStr


@api_router.post("/auth/resend-verification")
async def resend_verification_email(data: ResendVerificationRequest):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})

    # Generic success to avoid user enumeration
    generic_response = {
        "success": True,
        "message": "If the email exists and is unverified, a verification link has been sent",
    }

    if not user:
        return generic_response
    if user.get("email_verified"):
        return {"success": True, "message": "Email already verified", "email_verified": True}

    # Reuse existing token if present, else generate a fresh one
    token = (user.get("email_verification_token") or "").strip() or secrets.token_urlsafe(32)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "email_verification_token": token,
            "email_verification_sent_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    verify_link = f"{FRONTEND_URL}/verify-email?token={token}"
    email_sent = False
    try:
        subject, html = build_verification_email(user.get("name") or "", verify_link)
        await send_email(to_email=email, subject=subject, html_content=html)
        email_sent = True
        print(f"RESEND_VERIFICATION_EMAIL_SENT to={email}")
    except Exception as e:
        print(f"RESEND_VERIFICATION_EMAIL_ERROR to={email} error={repr(e)}")

    return {**generic_response, "email_sent": email_sent}




class ConfirmCheckoutRequest(BaseModel):
    session_id: str

@api_router.post("/billing/confirm-checkout")
async def confirm_checkout(request: ConfirmCheckoutRequest, current_user: dict = Depends(get_current_user)):
    try:
        session = stripe.checkout.Session.retrieve(request.session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unable to verify checkout session: {str(e)}")

    if not session:
        raise HTTPException(status_code=400, detail="Checkout session not found")

    payment_status = getattr(session, "payment_status", None) or session.get("payment_status")
    metadata = getattr(session, "metadata", None) or session.get("metadata") or {}
    selected_plan = normalize_plan(metadata.get("plan") or metadata.get("selected_plan") or current_user.get("plan") or "solo")

    if payment_status not in ("paid", "no_payment_required", "unpaid"):
        raise HTTPException(status_code=400, detail="Checkout session not completed")

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "plan": selected_plan,
            "updated_at": datetime.utcnow()
        }}
    )

    if current_user.get("business_id"):
        await db.businesses.update_one(
            {"_id": ObjectId(current_user["business_id"])},
            {"$set": {
                "plan": selected_plan,
                "updated_at": datetime.utcnow()
            }}
        )

    refreshed_user = await db.users.find_one({"_id": current_user["_id"]})
    return {
        "success": True,
        "plan": normalize_plan((refreshed_user or {}).get("plan", selected_plan)),
        "plan_features": get_plan_features((refreshed_user or {}).get("plan", selected_plan)),
    }




# CLIENT_DELETE_ROUTE_FORCE_REDEPLOY
@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    user_business_id = current_user.get("business_id") or current_user.get("id")
    if not user_business_id:
        raise HTTPException(status_code=400, detail="Business ID missing")

    try:
        obj_id = ObjectId(client_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid client ID")

    client = await db.clients.find_one({"_id": obj_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    client_business_id = str(client.get("business_id") or "")
    if client_business_id != str(user_business_id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this client")

    result = await db.clients.delete_one({"_id": obj_id})
    if result.deleted_count != 1:
        raise HTTPException(status_code=500, detail="Failed to delete client")

    return {"success": True, "message": "Client deleted"}



@app.post("/billing/webhook")
async def stripe_billing_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()

        # If webhook secret is configured, verify signature
        if webhook_secret:
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=sig_header,
                secret=webhook_secret,
            )
        else:
            event = json.loads(payload.decode("utf-8"))

        event_type = event.get("type")
        data_object = ((event.get("data") or {}).get("object") or {})

        print("STRIPE_WEBHOOK_EVENT", event_type)

        # Checkout completed -> update user/business plan if metadata exists
        if event_type == "checkout.session.completed":
            customer_email = (
                data_object.get("customer_details", {}) or {}
            ).get("email") or data_object.get("customer_email")

            selected_plan = (
                data_object.get("metadata", {}) or {}
            ).get("plan")

            if customer_email and selected_plan:
                await db.users.update_many(
                    {"email": str(customer_email).strip().lower()},
                    {"$set": {
                        "plan": str(selected_plan).strip().lower(),
                        "updated_at": datetime.now(timezone.utc),
                    }}
                )
                await db.businesses.update_many(
                    {"email": str(customer_email).strip().lower()},
                    {"$set": {
                        "plan": str(selected_plan).strip().lower(),
                        "updated_at": datetime.now(timezone.utc),
                    }}
                )
                print("STRIPE_WEBHOOK_PLAN_UPDATED", customer_email, selected_plan)

        return {"received": True}

    except stripe.error.SignatureVerificationError as e:
        print("STRIPE_WEBHOOK_SIGNATURE_ERROR", str(e))
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except Exception as e:
        print("STRIPE_WEBHOOK_ERROR", str(e))
        raise HTTPException(status_code=500, detail="Webhook handler failed")




@api_router.post("/billing/webhook")
async def stripe_billing_webhook_api(request: Request):
    return await stripe_billing_webhook(request)


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Owner access required")

    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    owner_email = (current_user.get("email") or "").lower()
    target_email = (user.get("email") or "").lower()
    if target_email == owner_email:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    await db.users.delete_one({"_id": obj_id})
    if target_email:
        await db.business_users.delete_many({"email": target_email})
        await db.password_reset_tokens.delete_many({"email": target_email})

    print(f"ADMIN_DELETE_USER user_id={user_id} email={target_email} by={owner_email}")
    return {"success": True, "message": f"User {target_email} deleted"}


# ==========================================================================
# Notifications — lightweight in-app notification system
# ==========================================================================
async def notify(
    *,
    user_id: str,
    business_id,
    type: str,
    title: str,
    message: str = "",
    route: str = "",
    target_type: str = "",
    target_id: str = "",
):
    """Best-effort notification create. Never raises to caller."""
    try:
        if not user_id or not type:
            return
        doc = {
            "user_id": str(user_id),
            "business_id": str(business_id) if business_id is not None else "",
            "type": str(type)[:48],
            "title": str(title)[:200],
            "message": str(message)[:600],
            "route": str(route)[:200],
            "target_type": str(target_type)[:48],
            "target_id": str(target_id)[:64],
            "read": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.notifications.insert_one(doc)
    except Exception as e:
        print(f"NOTIFY_ERR type={type} user={user_id} err={repr(e)}")


def _me_id(u: dict) -> str:
    return str(u.get("_id") or u.get("id") or u.get("user_id") or "")


@api_router.get("/notifications")
async def list_notifications(
    limit: int = 20,
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user),
):
    uid = _me_id(current_user)
    q = {"user_id": uid}
    if unread_only:
        q["read"] = False
    limit = max(1, min(int(limit or 20), 50))
    items = []
    def _iso(v):
        try:
            if not v:
                return None
            if isinstance(v, datetime):
                dt = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
                return dt.isoformat()
            txt = str(v).strip()
            if not txt:
                return None
            parsed = datetime.fromisoformat(txt.replace("Z", "+00:00"))
            if not parsed.tzinfo:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.isoformat()
        except Exception:
            try:
                return str(v)
            except Exception:
                return None
    async for n in db.notifications.find(q).sort("created_at", -1).limit(limit):
        items.append({
            "id": str(n.get("_id")),
            "type": n.get("type", ""),
            "title": n.get("title", ""),
            "message": n.get("message", ""),
            "route": n.get("route", ""),
            "target_type": n.get("target_type", ""),
            "target_id": n.get("target_id", ""),
            "read": bool(n.get("read", False)),
            "created_at": _iso(n.get("created_at")),
        })
    return items


@api_router.get("/notifications/unread-count")
async def notifications_unread_count(current_user: dict = Depends(get_current_user)):
    uid = _me_id(current_user)
    count = await db.notifications.count_documents({"user_id": uid, "read": False})
    return {"unread": count}


@api_router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    uid = _me_id(current_user)
    try:
        obj = ObjectId(notif_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification id")
    await db.notifications.update_one(
        {"_id": obj, "user_id": uid},
        {"$set": {"read": True}}
    )
    return {"success": True}


@api_router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    uid = _me_id(current_user)
    r = await db.notifications.update_many(
        {"user_id": uid, "read": False},
        {"$set": {"read": True}}
    )
    return {"success": True, "modified": r.modified_count}


@api_router.get("/worker/office-contact")
async def get_worker_office_contact(current_user: dict = Depends(get_current_user)):
    role = str((current_user or {}).get("role") or "").lower()
    if role != "worker":
        raise HTTPException(status_code=403, detail="Workers only")

    business_id = await get_user_business_id(current_user)
    role_labels = {
        "owner": "Owner",
        "employer": "Owner",
        "admin": "Admin",
        "manager": "Manager",
        "office_admin": "Office Admin",
    }

    business = await db.businesses.find_one(
        {"_id": normalize_object_id(business_id)}
    ) or await db.businesses.find_one({"business_id": str(business_id)})

    business_name = (
        (business or {}).get("business_name")
        or current_user.get("business_name")
        or "Your Office"
    )

    contacts = []
    seen = set()

    def _norm_email(v):
        return str(v or "").strip().lower()

    def _safe_add(name, role, email=None, phone=None):
        clean_email = str(email or "").strip() or None
        clean_phone = clean_phone_fn(phone)
        if not clean_email and not clean_phone:
            return
        key = (_norm_email(clean_email), clean_phone or "")
        if key in seen:
            return
        seen.add(key)
        contacts.append({
            "name": name or clean_email or "Office contact",
            "role": role,
            "email": clean_email,
            "phone": clean_phone,
        })

    def clean_phone_fn(value):
        return clean_phone(value)

    # Priority B first for preferred display
    contact_roles = ["owner", "employer", "admin", "manager", "office_admin"]
    cursor = db.users.find(
        {"business_id": str(business_id), "role": {"$in": contact_roles}},
        {"name": 1, "email": 1, "phone": 1, "mobile": 1, "phone_number": 1, "role": 1},
    ).sort([("role", 1), ("name", 1)])
    async for user in cursor:
        raw_role = str(user.get("role") or "").lower()
        _safe_add(
            name=user.get("name") or "",
            role=role_labels.get(raw_role, "Office"),
            email=user.get("email"),
            phone=user.get("phone") or user.get("mobile") or user.get("phone_number"),
        )

    # Priority A business profile fields (deduped against staff contacts)
    profile_name = (business or {}).get("office_contact_name") or business_name
    profile_email = (
        (business or {}).get("office_contact_email")
        or (business or {}).get("contact_email")
        or (business or {}).get("business_email")
        or (business or {}).get("email")
    )
    profile_phone = (
        (business or {}).get("office_contact_phone")
        or (business or {}).get("contact_phone")
        or (business or {}).get("business_phone")
        or (business or {}).get("phone")
    )
    _safe_add(profile_name, "Office Admin", profile_email, profile_phone)

    message = ""
    if not contacts:
        message = "No office contact has been set yet."

    return {
        "success": True,
        "business_name": business_name,
        "contacts": contacts,
        "message": message,
    }


@api_router.post("/worker/contact-office")
async def worker_contact_office(payload: dict, current_user: dict = Depends(get_current_user)):
    role = str((current_user or {}).get("role") or "").lower()
    if role != "worker":
        raise HTTPException(status_code=403, detail="Workers only")

    business_id = await get_user_business_id(current_user)
    message = str((payload or {}).get("message") or "").strip()
    job_id = str((payload or {}).get("job_id") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    recipients = await db.users.find(
        {"business_id": str(business_id), "role": {"$in": ["owner", "employer", "manager", "office_admin"]}},
        {"_id": 1, "id": 1},
    ).to_list(length=50)

    actor_name = current_user.get("name") or current_user.get("email") or "Worker"
    sent = 0
    job_title = str((payload or {}).get("job_title") or "").strip()
    job_context = f" | Job: {job_title}" if job_title else (f" | Job ID: {job_id}" if job_id else "")
    for recipient in recipients:
        recipient_id = str(recipient.get("id") or recipient.get("_id") or "")
        if not recipient_id:
            continue
        await notify(
            user_id=recipient_id,
            business_id=business_id,
            type="worker_help_request",
            title="Worker requested office help",
            message=f"{actor_name}: {message}{job_context}",
            route="/admin/jobs",
            target_type="job" if job_id else "",
            target_id=job_id or "",
        )
        sent += 1

    return {
        "success": True,
        "message": "Your help request has been sent to the office team." if sent else "No office contacts available yet, but your request was recorded.",
        "notified": sent,
    }


# ==========================================================================
# Automation Engine V1 — routes
# ==========================================================================
AUTO_ADMIN_ROLES = {"owner", "employer", "admin", "manager"}


def _business_scope(current_user: dict) -> str:
    return str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )


def _require_auto_admin(current_user: dict):
    role = str(current_user.get("role") or "").lower()
    if role not in AUTO_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Automation requires Owner or Manager role")


def _serialize_rule(r: dict) -> dict:
    return {
        "id": str(r.get("_id") or r.get("id") or ""),
        "business_id": str(r.get("business_id") or ""),
        "name": r.get("name") or "",
        "description": r.get("description") or "",
        "trigger": r.get("trigger") or "",
        "enabled": bool(r.get("enabled", True)),
        "condition_mode": r.get("condition_mode") or "all",
        "conditions": r.get("conditions") or [],
        "actions": r.get("actions") or [],
        "created_at": r.get("created_at").isoformat() if hasattr(r.get("created_at"), "isoformat") else r.get("created_at"),
        "updated_at": r.get("updated_at").isoformat() if hasattr(r.get("updated_at"), "isoformat") else r.get("updated_at"),
    }


def _serialize_run(r: dict) -> dict:
    def _iso(v):
        return v.isoformat() if hasattr(v, "isoformat") else v
    return {
        "id": str(r.get("_id") or ""),
        "business_id": str(r.get("business_id") or ""),
        "rule_id": str(r.get("rule_id") or ""),
        "rule_name": r.get("rule_name") or "",
        "trigger": r.get("trigger") or "",
        "status": r.get("status") or "",
        "event_payload": r.get("event_payload") or {},
        "results": r.get("results") or [],
        "error": r.get("error"),
        "started_at": _iso(r.get("started_at")),
        "finished_at": _iso(r.get("finished_at")),
        "test": bool(r.get("test", False)),
    }




AUTOMATION_TRIGGER_ALIASES = {"job.completed": "job_completed", "job.created": "job_created", "quote.sent": "quote_sent", "invoice.overdue": "invoice_overdue"}
AUTOMATION_ACTION_ALIASES = {"notification.create": "create_notification", "timeline.create": "create_internal_activity_log", "invoice.create_draft": "create_invoice_stub", "email.send": "send_email", "sms.send": "send_sms"}

def _normalize_automation_trigger(trigger: str) -> str:
    t = str(trigger or "").strip()
    return AUTOMATION_TRIGGER_ALIASES.get(t, t.replace('.', '_'))

def _normalize_automation_actions(actions):
    out = []
    for a in list(actions or []):
        if isinstance(a, str):
            out.append({"type": AUTOMATION_ACTION_ALIASES.get(a, a.replace('.', '_'))})
            continue
        if isinstance(a, dict):
            x = dict(a)
            at = str(x.get("type") or x.get("action") or "").strip()
            x["type"] = AUTOMATION_ACTION_ALIASES.get(at, at.replace('.', '_'))
            out.append(x)
    return out
@api_router.get("/automation/health")
async def automation_health():
    return {"ok": True, "engine": "v1", "triggers": len(auto.TRIGGERS), "actions": len(auto.ACTIONS)}


@api_router.get("/automation/catalog")
async def automation_catalog(current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    return auto.catalog()


@api_router.get("/automation/rules")
async def list_automation_rules(current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    out = []
    rule_ids: list = []
    async for r in db.automation_rules.find({"business_id": bid}).sort("created_at", -1):
        out.append(_serialize_rule(r))
        rule_ids.append(str(r.get("_id")))
    stats = await _rule_stats_map(bid, rule_ids)
    for row in out:
        s = stats.get(row["id"]) or {}
        row["last_run_at"] = s.get("last_run_at")
        row["last_run_status"] = s.get("last_run_status")
        row["runs_count"] = s.get("runs_count") or 0
    return out


@api_router.post("/automation/rules")
async def create_automation_rule(payload: dict, current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    now = datetime.now(timezone.utc)
    trigger = _normalize_automation_trigger((payload or {}).get("trigger"))
    if trigger not in auto.TRIGGERS:
        raise HTTPException(status_code=400, detail=f"Unknown trigger: {trigger}")
    doc = {
        "business_id": bid,
        "name": str((payload or {}).get("name") or "Untitled rule")[:120],
        "description": str((payload or {}).get("description") or "")[:400],
        "trigger": trigger,
        "enabled": bool((payload or {}).get("enabled", True)),
        "condition_mode": (payload or {}).get("condition_mode") or "all",
        "conditions": (payload or {}).get("conditions") or [],
        "actions": _normalize_automation_actions((payload or {}).get("actions") or []),
        "created_at": now,
        "updated_at": now,
        "created_by_user_id": _me_id(current_user),
    }
    r = await db.automation_rules.insert_one(doc)
    doc["_id"] = r.inserted_id
    return _serialize_rule(doc)


@api_router.get("/automation/rules/{rule_id}")
async def get_automation_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    try: obj = ObjectId(rule_id)
    except Exception: raise HTTPException(400, "Invalid rule id")
    r = await db.automation_rules.find_one({"_id": obj, "business_id": bid})
    if not r: raise HTTPException(404, "Rule not found")
    return _serialize_rule(r)


@api_router.put("/automation/rules/{rule_id}")
async def update_automation_rule(rule_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    try: obj = ObjectId(rule_id)
    except Exception: raise HTTPException(400, "Invalid rule id")
    update = {"updated_at": datetime.now(timezone.utc), "updated_by_user_id": _me_id(current_user)}
    for k in ("name", "description", "trigger", "enabled", "condition_mode", "conditions", "actions"):
        if k in (payload or {}):
            update[k] = payload[k]
    if update.get("trigger"):
        update["trigger"] = _normalize_automation_trigger(update.get("trigger"))
    if "actions" in update:
        update["actions"] = _normalize_automation_actions(update.get("actions") or [])
    if update.get("trigger") and update["trigger"] not in auto.TRIGGERS:
        raise HTTPException(400, f"Unknown trigger: {update['trigger']}")
    r = await db.automation_rules.find_one_and_update(
        {"_id": obj, "business_id": bid},
        {"$set": update},
        return_document=True,
    )
    if not r: raise HTTPException(404, "Rule not found")
    return _serialize_rule(r)


@api_router.delete("/automation/rules/{rule_id}")
async def delete_automation_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    try: obj = ObjectId(rule_id)
    except Exception: raise HTTPException(400, "Invalid rule id")
    await db.automation_rules.delete_one({"_id": obj, "business_id": bid})
    return {"success": True}


@api_router.post("/automation/rules/{rule_id}/toggle")
async def toggle_automation_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    try: obj = ObjectId(rule_id)
    except Exception: raise HTTPException(400, "Invalid rule id")
    r = await db.automation_rules.find_one({"_id": obj, "business_id": bid})
    if not r: raise HTTPException(404, "Rule not found")
    new_enabled = not bool(r.get("enabled", True))
    await db.automation_rules.update_one({"_id": obj}, {"$set": {"enabled": new_enabled, "updated_at": datetime.now(timezone.utc)}})
    r["enabled"] = new_enabled
    return _serialize_rule(r)


@api_router.post("/automation/rules/{rule_id}/duplicate")
async def duplicate_automation_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    try: obj = ObjectId(rule_id)
    except Exception: raise HTTPException(400, "Invalid rule id")
    src = await db.automation_rules.find_one({"_id": obj, "business_id": bid})
    if not src: raise HTTPException(404, "Rule not found")
    now = datetime.now(timezone.utc)
    clone = {k: v for k, v in src.items() if k != "_id"}
    clone["name"] = f"{src.get('name', 'Rule')} (copy)"[:120]
    clone["enabled"] = False
    clone["created_at"] = now
    clone["updated_at"] = now
    clone["created_by_user_id"] = _me_id(current_user)
    r = await db.automation_rules.insert_one(clone)
    clone["_id"] = r.inserted_id
    return _serialize_rule(clone)


@api_router.get("/automation/runs")
async def list_automation_runs(
    limit: int = 50,
    status: str = "",
    current_user: dict = Depends(get_current_user),
):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    limit = max(1, min(int(limit or 50), 200))
    q = {"business_id": bid}
    if status and status.lower() in ("running", "completed", "failed", "skipped"):
        q["status"] = status.lower()
    out = []
    async for r in db.automation_runs.find(q).sort("started_at", -1).limit(limit):
        out.append(_serialize_run(r))
    return out


@api_router.post("/automation/events/emit")
async def automation_emit(payload: dict, current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    trigger = _normalize_automation_trigger((payload or {}).get("trigger"))
    evt = dict((payload or {}).get("payload") or {})
    evt.setdefault("business_id", bid)
    evt.setdefault("actor", {"id": _me_id(current_user), "role": current_user.get("role"), "email": current_user.get("email")})
    summary = await auto.emit_event(db, trigger, evt)
    return {"success": True, **summary}


@api_router.post("/automation/rules/{rule_id}/run-test")
async def run_test_automation(rule_id: str, payload: dict = None, current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    try: obj = ObjectId(rule_id)
    except Exception: raise HTTPException(400, "Invalid rule id")
    rule = await db.automation_rules.find_one({"_id": obj, "business_id": bid})
    if not rule: raise HTTPException(404, "Rule not found")
    evt = dict((payload or {}).get("payload") or {})
    evt.setdefault("business_id", bid)
    evt.setdefault("actor", {"id": _me_id(current_user), "role": current_user.get("role")})
    evt.setdefault("trigger", rule.get("trigger"))
    run = await auto._execute_rule(db, rule, evt, test=True)
    return {"success": True, "run": _serialize_run(run)}


# -------- Engine enhancements: templates, trigger schema, retry, rule stats --------
from automation_templates import TRIGGER_SCHEMAS, AUTOMATION_TEMPLATES  # noqa: E402


@api_router.get("/automation/templates")
async def list_automation_templates(current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    return AUTOMATION_TEMPLATES


@api_router.get("/automation/triggers/{trigger}/schema")
async def get_trigger_schema(trigger: str, current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    if trigger not in auto.TRIGGERS:
        raise HTTPException(status_code=404, detail="Unknown trigger")
    return {"trigger": trigger, "paths": TRIGGER_SCHEMAS.get(trigger, []) + ["business_id", "emitted_at"]}


@api_router.post("/automation/runs/{run_id}/retry")
async def retry_automation_run(run_id: str, current_user: dict = Depends(get_current_user)):
    """Re-execute the actions of a previous run using its original event payload."""
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    try: obj = ObjectId(run_id)
    except Exception: raise HTTPException(400, "Invalid run id")
    run = await db.automation_runs.find_one({"_id": obj, "business_id": bid})
    if not run: raise HTTPException(404, "Run not found")
    try:
        rule_obj = ObjectId(run.get("rule_id")) if run.get("rule_id") else None
    except Exception:
        rule_obj = None
    rule = None
    if rule_obj:
        rule = await db.automation_rules.find_one({"_id": rule_obj, "business_id": bid})
    if not rule:
        # Rule deleted; reconstruct a minimal ephemeral rule from the run history
        rule = {
            "_id": None, "name": run.get("rule_name") or "Orphan retry",
            "trigger": run.get("trigger"),
            "actions": [],
        }
        # We cannot safely replay without stored actions — reject.
        raise HTTPException(400, "Original rule no longer exists; cannot retry")
    evt = dict(run.get("event_payload") or {})
    evt.setdefault("business_id", bid)
    evt.setdefault("actor", {"id": _me_id(current_user), "role": current_user.get("role")})
    evt["retry_of_run_id"] = str(run.get("_id"))
    new_run = await auto._execute_rule(db, rule, evt, test=False)
    return {"success": True, "run": _serialize_run(new_run)}


async def _rule_stats_map(business_id: str, rule_ids: list) -> dict:
    """Return map of rule_id -> {last_run_at, last_run_status, runs_count}."""
    if not rule_ids:
        return {}
    stats: dict = {}
    try:
        pipeline = [
            {"$match": {"business_id": business_id, "rule_id": {"$in": rule_ids}}},
            {"$sort": {"started_at": -1}},
            {"$group": {
                "_id": "$rule_id",
                "last_run_at": {"$first": "$started_at"},
                "last_run_status": {"$first": "$status"},
                "runs_count": {"$sum": 1},
            }},
        ]
        async for row in db.automation_runs.aggregate(pipeline):
            stats[str(row.get("_id") or "")] = {
                "last_run_at": row["last_run_at"].isoformat() if hasattr(row.get("last_run_at"), "isoformat") else row.get("last_run_at"),
                "last_run_status": row.get("last_run_status"),
                "runs_count": row.get("runs_count") or 0,
            }
    except Exception as e:
        print(f"RULE_STATS_ERR {e}")
    return stats


# ==========================================================================
# Automation analytics — stats endpoint for the dashboard card
# ==========================================================================
@api_router.get("/automation/stats")
async def automation_stats(current_user: dict = Depends(get_current_user)):
    """Return a practical analytics snapshot for owner/manager dashboards."""
    from datetime import datetime, timezone, timedelta
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)
    since_7d = now - timedelta(days=7)

    # Rule counts
    rules_total = await db.automation_rules.count_documents({"business_id": bid})
    rules_enabled = await db.automation_rules.count_documents({"business_id": bid, "enabled": True})

    # Run counts
    runs_total = await db.automation_runs.count_documents({"business_id": bid})
    runs_24h = await db.automation_runs.count_documents({"business_id": bid, "started_at": {"$gte": since_24h}})
    runs_7d = await db.automation_runs.count_documents({"business_id": bid, "started_at": {"$gte": since_7d}})

    # Status breakdown
    by_status: dict = {"completed": 0, "failed": 0, "running": 0, "skipped": 0}
    try:
        async for row in db.automation_runs.aggregate([
            {"$match": {"business_id": bid}},
            {"$group": {"_id": "$status", "c": {"$sum": 1}}},
        ]):
            by_status[str(row.get("_id") or "")] = row.get("c", 0)
    except Exception as e:
        print(f"AUTO_STATS_STATUS_ERR {e}")

    # Top-5 most-used rules
    top_rules: list = []
    try:
        async for row in db.automation_runs.aggregate([
            {"$match": {"business_id": bid}},
            {"$group": {"_id": {"rid": "$rule_id", "name": "$rule_name"}, "c": {"$sum": 1}}},
            {"$sort": {"c": -1}},
            {"$limit": 5},
        ]):
            top_rules.append({
                "rule_id": str(row["_id"].get("rid") or ""),
                "rule_name": row["_id"].get("name") or "Rule",
                "runs": row.get("c", 0),
            })
    except Exception as e:
        print(f"AUTO_STATS_TOP_ERR {e}")

    # Recent failures — helps debugging
    recent_failures: list = []
    async for f in db.automation_runs.find(
        {"business_id": bid, "status": "failed"},
    ).sort("started_at", -1).limit(10):
        recent_failures.append({
            "id": str(f.get("_id")),
            "rule_id": str(f.get("rule_id") or ""),
            "rule_name": f.get("rule_name") or "",
            "trigger": f.get("trigger") or "",
            "error": f.get("error"),
            "started_at": f.get("started_at").isoformat() if hasattr(f.get("started_at"), "isoformat") else f.get("started_at"),
        })

    # Notifications unread for the caller
    notif_unread = await db.notifications.count_documents({"user_id": _me_id(current_user), "read": False})

    return {
        "rules": {"total": rules_total, "enabled": rules_enabled},
        "runs": {
            "total": runs_total,
            "last_24h": runs_24h,
            "last_7d": runs_7d,
            "by_status": by_status,
        },
        "top_rules": top_rules,
        "recent_failures": recent_failures,
        "notifications_unread": notif_unread,
    }


# ==========================================================================
# Rule sharing — safe JSON export + import
# ==========================================================================
_EXPORT_VERSION = 1
_EXPORT_ALLOWED_KEYS = {"name", "description", "trigger", "enabled", "condition_mode",
                        "conditions", "actions"}


def _sanitize_rule_for_export(rule: dict) -> dict:
    """Strip business/user-scoped IDs so rules can be shared safely."""
    out = {k: rule.get(k) for k in _EXPORT_ALLOWED_KEYS if k in rule}
    # Never export a rule as enabled — force user to review + enable after import
    out["enabled"] = False
    out["_churvox_rule_export"] = _EXPORT_VERSION
    return out


def _validate_imported_rule(payload: dict) -> dict:
    """Validate shape of an imported rule. Raises HTTPException on failure."""
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Import payload must be a JSON object")
    if payload.get("_churvox_rule_export") not in (None, _EXPORT_VERSION):
        raise HTTPException(status_code=400, detail="Unsupported rule export version")
    name = str(payload.get("name") or "").strip()[:120]
    trigger = str(payload.get("trigger") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Rule name is required")
    if trigger not in auto.TRIGGERS:
        raise HTTPException(status_code=400, detail=f"Unknown trigger: {trigger}")
    conds = payload.get("conditions") or []
    if not isinstance(conds, list):
        raise HTTPException(status_code=400, detail="conditions must be an array")
    for c in conds:
        if not isinstance(c, dict):
            raise HTTPException(status_code=400, detail="each condition must be an object")
        op = c.get("op") or c.get("operator")
        if op and op not in auto.OPERATORS:
            raise HTTPException(status_code=400, detail=f"Unknown operator: {op}")
    acts = payload.get("actions") or []
    if not isinstance(acts, list) or len(acts) == 0:
        raise HTTPException(status_code=400, detail="At least one action is required")
    for a in acts:
        if not isinstance(a, dict) or not a.get("type"):
            raise HTTPException(status_code=400, detail="each action must be an object with 'type'")
        if a["type"] not in auto.ACTIONS:
            raise HTTPException(status_code=400, detail=f"Unknown action type: {a['type']}")
    return {
        "name": name,
        "description": str(payload.get("description") or "")[:400],
        "trigger": trigger,
        "enabled": False,  # always imported disabled
        "condition_mode": (payload.get("condition_mode") or "all"),
        "conditions": conds,
        "actions": acts,
    }


@api_router.get("/automation/rules/{rule_id}/export")
async def export_automation_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    try:
        obj = ObjectId(rule_id)
    except Exception:
        raise HTTPException(400, "Invalid rule id")
    r = await db.automation_rules.find_one({"_id": obj, "business_id": bid})
    if not r:
        raise HTTPException(404, "Rule not found")
    return _sanitize_rule_for_export(r)


@api_router.post("/automation/rules/import")
async def import_automation_rule(payload: dict, current_user: dict = Depends(get_current_user)):
    _require_auto_admin(current_user)
    bid = _business_scope(current_user)
    body = _validate_imported_rule(payload or {})
    now = datetime.now(timezone.utc)
    doc = {
        **body,
        "business_id": bid,
        "created_at": now,
        "updated_at": now,
        "created_by_user_id": _me_id(current_user),
        "imported": True,
    }
    r = await db.automation_rules.insert_one(doc)
    doc["_id"] = r.inserted_id
    return _serialize_rule(doc)


# ==========================================================================
# Recurring jobs generator — wires `recurring_job_generated` trigger
# ==========================================================================
def _next_occurrence_iso(freq: str, from_date: str) -> str:
    """Compute next scheduled_date from a base date + frequency. Never raises."""
    from datetime import date, timedelta
    try:
        base = date.fromisoformat(str(from_date)[:10]) if from_date else date.today()
    except Exception:
        base = date.today()
    freq = str(freq or "").lower()
    delta_days = {"daily": 1, "weekly": 7, "fortnightly": 14, "monthly": 30}.get(freq, 7)
    return (base + timedelta(days=delta_days)).isoformat()


@api_router.post("/jobs/generate-recurring")
async def generate_recurring_jobs(current_user: dict = Depends(get_current_user)):
    """
    Scans recurring job templates for the current business, creates the next
    occurrence if one is due, and emits `recurring_job_generated` per new job.
    Safe to call on demand and from scheduler hooks — guarded by `last_generated_at`.
    """
    from datetime import datetime, timezone, date
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    bid = _business_scope(current_user)
    now = datetime.now(timezone.utc)
    today = date.today().isoformat()

    query = {
        "$or": [{"business_id": bid}, {"business_id": str(bid)}],
        "is_recurring": True,
    }
    created: list = []
    skipped = 0
    async for src in db.jobs.find(query):
        try:
            last_gen = src.get("last_generated_at")
            last_gen_date = None
            if hasattr(last_gen, "isoformat"):
                last_gen_date = last_gen.date().isoformat()
            elif isinstance(last_gen, str):
                last_gen_date = last_gen[:10]
            if last_gen_date == today:
                skipped += 1
                continue

            freq = src.get("recurring_frequency") or "weekly"
            base_date = src.get("scheduled_date") or today
            new_sched = _next_occurrence_iso(freq, base_date)

            new_doc = {
                "title": src.get("title") or "Recurring job",
                "job_type": src.get("job_type") or "other",
                "client_id": src.get("client_id"),
                "client_name": src.get("client_name") or "",
                "customer_name": src.get("customer_name") or "",
                "address": src.get("address") or "",
                "country": src.get("country") or "New Zealand",
                "region": src.get("region") or "",
                "scheduled_date": new_sched,
                "scheduled_time": src.get("scheduled_time") or "",
                "estimated_duration": src.get("estimated_duration") or 60,
                "price": src.get("price") or 0,
                "pricing_type": src.get("pricing_type") or "fixed",
                "hourly_rate": src.get("hourly_rate") or 0,
                "extras": src.get("extras") or [],
                "notes": src.get("notes") or "",
                "assigned_worker_id": src.get("assigned_worker_id"),
                "is_recurring": False,  # the generated occurrence is NOT itself recurring
                "recurring_source_id": str(src.get("_id")),
                "status": "assigned",
                "business_id": src.get("business_id") or bid,
                "owner_id": src.get("owner_id") or bid,
                "created_at": now,
                "updated_at": now,
                "auto_generated": True,
            }
            ins = await db.jobs.insert_one(new_doc)
            new_id = str(ins.inserted_id)
            await db.jobs.update_one(
                {"_id": src["_id"]},
                {"$set": {"last_generated_at": now, "scheduled_date": new_sched}},
            )
            created.append(new_id)

            try:
                await auto.emit_event(db, "recurring_job_generated", {
                    "business_id": str(src.get("business_id") or bid),
                    "actor": {"id": _me_id(current_user), "role": current_user.get("role")},
                    "source_job_id": str(src.get("_id")),
                    "job": {
                        "id": new_id,
                        "title": new_doc.get("title"),
                        "client_id": str(new_doc.get("client_id") or ""),
                        "recurring_frequency": freq,
                        "business_id": str(new_doc.get("business_id") or ""),
                        "scheduled_date": new_sched,
                    },
                })
            except Exception as e:
                print("AUTO_EMIT_ERR recurring_job_generated", e)
        except Exception as e:
            print(f"RECUR_GEN_ERR job={src.get('_id')} err={e}")
    return {"success": True, "created_count": len(created), "skipped": skipped, "created_ids": created}


# ==========================================================================
# Payroll timesheet / status stubs — wire `timesheet_updated` & `payroll_status_updated`
# ==========================================================================
@api_router.post("/payroll/timesheets")
async def upsert_timesheet(payload: dict, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    bid = _business_scope(current_user)
    worker_id = str((payload or {}).get("worker_id") or "").strip()
    if not worker_id:
        raise HTTPException(status_code=400, detail="worker_id is required")
    hours = float((payload or {}).get("hours") or 0)
    week_of = str((payload or {}).get("week_of") or "").strip()
    notes = str((payload or {}).get("notes") or "")[:600]
    now = datetime.now(timezone.utc)

    q = {"business_id": bid, "worker_id": worker_id, "week_of": week_of}
    existing = await db.payroll_timesheets.find_one(q)
    if existing:
        await db.payroll_timesheets.update_one(
            {"_id": existing["_id"]},
            {"$set": {"hours": hours, "notes": notes, "updated_at": now}},
        )
        tid = str(existing["_id"])
    else:
        doc = {
            "business_id": bid, "worker_id": worker_id, "week_of": week_of,
            "hours": hours, "notes": notes, "status": "draft",
            "created_at": now, "updated_at": now,
        }
        r = await db.payroll_timesheets.insert_one(doc)
        tid = str(r.inserted_id)

    try:
        await auto.emit_event(db, "timesheet_updated", {
            "business_id": bid,
            "actor": {"id": _me_id(current_user), "role": current_user.get("role")},
            "timesheet": {"id": tid, "worker_id": worker_id, "hours": hours, "week_of": week_of},
        })
    except Exception as e:
        print("AUTO_EMIT_ERR timesheet_updated", e)
    return {"success": True, "id": tid, "hours": hours, "week_of": week_of}


@api_router.post("/payroll/status")
async def update_payroll_status(payload: dict, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")
    bid = _business_scope(current_user)
    period = str((payload or {}).get("period") or "").strip()
    status = str((payload or {}).get("status") or "").strip().lower()
    allowed = {"draft", "approved", "paid", "cancelled"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status (allowed: {sorted(allowed)})")
    now = datetime.now(timezone.utc)
    set_doc = {
        "business_id": bid, "period": period, "status": status,
        "updated_by_user_id": _me_id(current_user), "updated_at": now,
    }
    q = {"business_id": bid, "period": period}
    await db.payroll_runs.update_one(q, {"$set": set_doc, "$setOnInsert": {"created_at": now}}, upsert=True)
    run = await db.payroll_runs.find_one(q)
    pid = str(run.get("_id")) if run else ""

    try:
        await auto.emit_event(db, "payroll_status_updated", {
            "business_id": bid,
            "actor": {"id": _me_id(current_user), "role": current_user.get("role")},
            "payroll": {"id": pid, "period": period, "status": status},
        })
    except Exception as e:
        print("AUTO_EMIT_ERR payroll_status_updated", e)
    return {"success": True, "id": pid, "period": period, "status": status}

def _payroll_business_id(current_user: dict) -> str:
    return str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("id")
        or current_user.get("_id")
        or current_user.get("user_id")
        or ""
    )


def _require_payroll_access(current_user: dict) -> str:
    role = str(current_user.get("role") or "").strip().lower()
    if role not in BUSINESS_ROLES | {"payroll"}:
        raise HTTPException(status_code=403, detail="Not authorized")
    if role == "worker":
        raise HTTPException(status_code=403, detail="Workers cannot access payroll")
    business_id = _payroll_business_id(current_user)
    if not business_id:
        raise HTTPException(status_code=400, detail="Business context missing")
    return business_id


def _to_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return float(default)


def _to_iso(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            pass
    return str(value)


def _period_day(value):
    txt = str(value or "")[:10]
    try:
        return datetime.fromisoformat(txt).date()
    except Exception:
        return None


def _period_is_readonly(period: dict) -> bool:
    return str(period.get("status") or "open") in {"locked", "exported"}


async def _find_period_or_404(period_id: str, business_id: str):
    q = {"business_id": business_id, "$or": [{"id": period_id}]}
    try:
        q["$or"].append({"_id": ObjectId(period_id)})
    except Exception:
        pass
    doc = await db.payroll_pay_periods.find_one(q)
    if not doc:
        raise HTTPException(status_code=404, detail="Pay period not found")
    return doc


async def _get_payroll_settings(business_id: str):
    settings = await db.payroll_settings.find_one({"business_id": business_id})
    if settings:
        settings["id"] = str(settings.get("_id"))
        settings.pop("_id", None)
        return settings
    return {
        "business_id": business_id,
        "payroll_method": "manual",
        "rate_mode": "manual_rate",
        "default_hourly_rate": 0.0,
        "default_pay_frequency": "fortnightly",
        "country": "generic",
        "tax_enabled": False,
        "tax_mode": "manual_rate",
        "default_tax_rate": 0.0,
        "tax_code_table": {},
        "kiwi_saver_enabled": False,
        "default_kiwi_saver_rate": 0.03,
        "employer_contribution_enabled": False,
        "default_employer_contribution_rate": 0.03,
        "student_loan_enabled": False,
        "acc_or_levy_placeholder": "",
        "notes": "Payroll calculations are prepared for review. Government filing and bank payments are handled outside Churvox.",
    }


async def _get_payroll_workers(business_id: str):
    query = {
        "business_id": business_id,
        "role": {"$in": ["worker", "manager", "office_admin", "payroll"]},
    }
    workers = []
    async for worker in db.business_users.find(query):
        wid = str(worker.get("id") or worker.get("_id") or "")
        workers.append({
            "id": wid,
            "name": worker.get("name") or "Unnamed Worker",
            "email": worker.get("email") or "",
            "role": worker.get("role") or "worker",
            "payroll_active": bool(worker.get("payroll_active", True)),
            "pay_type": worker.get("pay_type") or "hourly",
            "hourly_rate": _to_float(worker.get("hourly_rate"), 0),
            "salary_amount": _to_float(worker.get("salary_amount"), 0),
            "salary_frequency": worker.get("salary_frequency") or "fortnightly",
            "default_hours_per_week": _to_float(worker.get("default_hours_per_week"), 40),
            "tax_code": worker.get("tax_code") or "",
            "tax_rate_override": worker.get("tax_rate_override"),
            "kiwi_saver_rate": worker.get("kiwi_saver_rate"),
            "employer_contribution_rate": worker.get("employer_contribution_rate"),
            "student_loan_deduction": _to_float(worker.get("student_loan_deduction"), 0),
            "child_support_deduction": _to_float(worker.get("child_support_deduction"), 0),
            "other_regular_deduction": _to_float(worker.get("other_regular_deduction"), 0),
            "pay_category": worker.get("pay_category") or "",
            "export_code": worker.get("export_code") or "",
            "payroll_notes": worker.get("payroll_notes") or "",
            "bank_reference": worker.get("bank_reference") or "",
            "annual_leave_hours_balance": worker.get("annual_leave_hours_balance"),
            "sick_leave_hours_balance": worker.get("sick_leave_hours_balance"),
            "leave_accrual_rate": worker.get("leave_accrual_rate"),
            "holiday_pay_percent": worker.get("holiday_pay_percent"),
            "leave_notes": worker.get("leave_notes") or "",
        })
    return workers


async def _get_period_timesheets(period: dict, business_id: str):
    start = _period_day(period.get("start_date"))
    end = _period_day(period.get("end_date"))
    jobs_query = {"business_id": business_id, "assigned_worker_id": {"$exists": True, "$ne": None}}
    rows = []
    async for job in db.jobs.find(jobs_query):
        d = _period_day(job.get("scheduled_date") or job.get("completed_at") or job.get("updated_at"))
        if start and d and d < start:
            continue
        if end and d and d > end:
            continue
        gross_hours = max(_to_float(job.get("time_spent_minutes") or job.get("total_minutes"), 0) / 60.0, 0.0)
        paused_minutes = max(_to_float(job.get("paused_minutes"), 0.0), 0.0)
        net_hours = max(gross_hours - (paused_minutes / 60.0), 0.0)
        entry_id = str(job.get("_id"))
        status = str(job.get("payroll_status") or "pending").lower()
        if status not in {"pending", "approved", "rejected"}:
            status = "pending"
        rows.append({
            "entry_id": entry_id,
            "worker_id": str(job.get("assigned_worker_id") or ""),
            "worker_name": job.get("assigned_worker_name") or "",
            "worker_email": "",
            "job_id": entry_id,
            "job_title": job.get("title") or job.get("job_type") or "Job",
            "client_name": job.get("client_name") or job.get("customer_name") or "",
            "date": d.isoformat() if d else None,
            "started_at": _to_iso(job.get("started_at") or job.get("in_progress_at")),
            "ended_at": _to_iso(job.get("completed_at")),
            "gross_hours": round(gross_hours, 2),
            "paused_minutes": round(paused_minutes, 2),
            "net_hours": round(net_hours, 2),
            "status": status,
            "notes": job.get("payroll_notes") or "",
        })
    workers = {w["id"]: w for w in await _get_payroll_workers(business_id)}
    for row in rows:
        w = workers.get(row["worker_id"], {})
        if w:
            row["worker_name"] = row["worker_name"] or w.get("name")
            row["worker_email"] = w.get("email") or ""
    return rows


async def _build_period_summary(period: dict, business_id: str):
    workers = {w["id"]: w for w in await _get_payroll_workers(business_id)}
    timesheets = await _get_period_timesheets(period, business_id)
    adjustments = await db.payroll_adjustments.find({"business_id": business_id, "period_id": str(period.get("id") or period.get("_id"))}).to_list(length=5000)
    settings = await _get_payroll_settings(business_id)
    by_worker = {}
    for wid, worker in workers.items():
        by_worker[wid] = {
            "worker_id": wid, "worker_name": worker.get("name"), "worker_email": worker.get("email"),
            "pay_type": worker.get("pay_type"), "hourly_rate": worker.get("hourly_rate"), "salary_amount": worker.get("salary_amount"),
            "approved_hours": 0.0, "pending_hours": 0.0, "rejected_hours": 0.0,
            "base_gross_pay": 0.0, "taxable_allowances": 0.0, "non_taxable_reimbursements": 0.0, "bonuses": 0.0,
            "gross_pay": 0.0, "employee_tax": 0.0, "kiwi_saver_employee": 0.0, "other_deductions": 0.0, "employer_contribution": 0.0,
            "adjustments_total": 0.0, "net_pay_estimate": 0.0, "total_cost_estimate": 0.0, "jobs_worked": 0,
            "leave_hours_paid": 0.0, "holiday_pay_amount": 0.0, "leave_notes": worker.get("leave_notes") or "", "notes": worker.get("payroll_notes") or "",
            "status": "ready",
        }
    for row in timesheets:
        wid = row.get("worker_id")
        if wid not in by_worker:
            continue
        t = by_worker[wid]
        hrs = _to_float(row.get("net_hours"), 0)
        t["jobs_worked"] += 1
        st = row.get("status")
        if st == "approved":
            t["approved_hours"] += hrs
        elif st == "rejected":
            t["rejected_hours"] += hrs
        else:
            t["pending_hours"] += hrs
    for wid, s in by_worker.items():
        worker = workers.get(wid, {})
        if s["pay_type"] == "salary":
            base = _to_float(worker.get("salary_amount"), 0)
        else:
            base = s["approved_hours"] * _to_float(worker.get("hourly_rate"), 0)
        s["base_gross_pay"] = round(base, 2)

    for adj in adjustments:
        wid = str(adj.get("worker_id") or "")
        if wid not in by_worker:
            continue
        amt = _to_float(adj.get("amount"), 0)
        typ = str(adj.get("type") or "other")
        taxable = bool(adj.get("taxable", False))
        w = by_worker[wid]
        w["adjustments_total"] += amt
        if typ == "bonus":
            w["bonuses"] += amt
            if taxable:
                w["taxable_allowances"] += amt
        elif typ == "allowance":
            if taxable:
                w["taxable_allowances"] += amt
            else:
                w["non_taxable_reimbursements"] += amt
        elif typ == "reimbursement":
            w["non_taxable_reimbursements"] += amt
        elif typ == "deduction":
            w["other_deductions"] += abs(amt)
        elif typ == "correction":
            w["base_gross_pay"] += amt

    tax_mode = str(settings.get("tax_mode") or "manual_rate")
    default_tax_rate = _to_float(settings.get("default_tax_rate"), 0)
    for wid, s in by_worker.items():
        worker = workers.get(wid, {})
        s["gross_pay"] = round(s["base_gross_pay"] + s["taxable_allowances"] + s["bonuses"], 2)
        if settings.get("tax_enabled") and tax_mode != "no_tax":
            rate = worker.get("tax_rate_override")
            if rate is None and tax_mode == "tax_code_table":
                table = settings.get("tax_code_table") or {}
                rate = table.get(worker.get("tax_code") or "")
            if rate is None:
                rate = default_tax_rate
            rate = max(_to_float(rate, 0), 0)
            s["employee_tax"] = round(s["gross_pay"] * rate, 2)
        if settings.get("kiwi_saver_enabled"):
            ks_rate = worker.get("kiwi_saver_rate")
            if ks_rate is None:
                ks_rate = settings.get("default_kiwi_saver_rate")
            s["kiwi_saver_employee"] = round(s["gross_pay"] * max(_to_float(ks_rate, 0), 0), 2)
        s["other_deductions"] = round(s["other_deductions"] + _to_float(worker.get("student_loan_deduction"), 0) + _to_float(worker.get("child_support_deduction"), 0) + _to_float(worker.get("other_regular_deduction"), 0), 2)
        if settings.get("employer_contribution_enabled"):
            ec_rate = worker.get("employer_contribution_rate")
            if ec_rate is None:
                ec_rate = settings.get("default_employer_contribution_rate")
            s["employer_contribution"] = round(s["gross_pay"] * max(_to_float(ec_rate, 0), 0), 2)
        holiday = max(_to_float(worker.get("holiday_pay_percent"), 0), 0)
        s["holiday_pay_amount"] = round(s["approved_hours"] * _to_float(worker.get("hourly_rate"), 0) * holiday, 2) if holiday and s["pay_type"] != "salary" else 0.0
        s["net_pay_estimate"] = round(s["gross_pay"] + s["non_taxable_reimbursements"] - s["employee_tax"] - s["other_deductions"] - s["kiwi_saver_employee"], 2)
        s["total_cost_estimate"] = round(s["gross_pay"] + s["non_taxable_reimbursements"] + s["employer_contribution"], 2)
        if _period_is_readonly(period):
            s["status"] = str(period.get("status"))
        elif s["pending_hours"] > 0:
            s["status"] = "pending_review"
        elif s["pay_type"] == "hourly" and _to_float(s["hourly_rate"], 0) <= 0:
            s["status"] = "needs_rate"
        elif settings.get("tax_enabled") and tax_mode == "tax_code_table" and not (worker.get("tax_code") or worker.get("tax_rate_override")):
            s["status"] = "missing_tax_config"
        else:
            s["status"] = "ready"

    workers_list = list(by_worker.values())
    summary = {
        "period": {
            "id": str(period.get("id") or period.get("_id")), "name": period.get("name"), "start_date": period.get("start_date"),
            "end_date": period.get("end_date"), "pay_date": period.get("pay_date"), "status": period.get("status"),
            "export_status": period.get("export_status") or ("exported" if period.get("status") == "exported" else "not_exported"),
        },
        "total_workers": len(workers_list),
        "total_approved_hours": round(sum(w["approved_hours"] for w in workers_list), 2),
        "total_pending_hours": round(sum(w["pending_hours"] for w in workers_list), 2),
        "total_rejected_hours": round(sum(w["rejected_hours"] for w in workers_list), 2),
        "total_gross_pay": round(sum(w["gross_pay"] for w in workers_list), 2),
        "total_employee_tax": round(sum(w["employee_tax"] for w in workers_list), 2),
        "total_employee_deductions": round(sum(w["other_deductions"] for w in workers_list), 2),
        "total_kiwi_saver_employee": round(sum(w["kiwi_saver_employee"] for w in workers_list), 2),
        "total_employer_contribution": round(sum(w["employer_contribution"] for w in workers_list), 2),
        "total_reimbursements": round(sum(w["non_taxable_reimbursements"] for w in workers_list), 2),
        "total_net_pay_estimate": round(sum(w["net_pay_estimate"] for w in workers_list), 2),
        "total_cost_estimate": round(sum(w["total_cost_estimate"] for w in workers_list), 2),
        "export_ready": all(w["status"] in {"ready", "locked", "exported"} for w in workers_list),
        "worker_summaries": workers_list,
    }
    return summary


@api_router.get("/payroll/workers")
async def payroll_workers(current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    return {"workers": await _get_payroll_workers(business_id)}


@api_router.patch("/payroll/workers/{worker_id}/pay-settings")
async def payroll_update_worker_settings(worker_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    allowed = {"payroll_active", "pay_type", "hourly_rate", "salary_amount", "salary_frequency", "default_hours_per_week", "tax_code", "tax_rate_override", "kiwi_saver_rate", "employer_contribution_rate", "student_loan_deduction", "child_support_deduction", "other_regular_deduction", "pay_category", "export_code", "payroll_notes", "bank_reference", "annual_leave_hours_balance", "sick_leave_hours_balance", "leave_accrual_rate", "holiday_pay_percent", "leave_notes"}
    update = {"updated_at": datetime.now(timezone.utc)}
    for k, v in (payload or {}).items():
        if k in allowed:
            update[k] = v
    q = {"business_id": business_id, "$or": [{"id": worker_id}]}
    try:
        q["$or"].append({"_id": ObjectId(worker_id)})
    except Exception:
        pass
    worker = await db.business_users.find_one(q)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    await db.business_users.update_one({"_id": worker["_id"]}, {"$set": update})
    return {"success": True}


@api_router.get("/payroll/pay-periods")
async def payroll_list_periods(current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    docs = []
    async for p in db.payroll_pay_periods.find({"business_id": business_id}).sort("start_date", -1):
        p["id"] = str(p.get("_id"))
        p["export_status"] = p.get("export_status") or ("exported" if p.get("status") == "exported" else "not_exported")
        p.pop("_id", None)
        docs.append(p)
    return {"pay_periods": docs}


@api_router.post("/payroll/pay-periods")
async def payroll_create_period(payload: dict, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    now = datetime.now(timezone.utc)
    name = str((payload or {}).get("name") or "").strip()
    start_date = str((payload or {}).get("start_date") or "")[:10]
    end_date = str((payload or {}).get("end_date") or "")[:10]
    pay_date = str((payload or {}).get("pay_date") or "")[:10]
    if not name or not start_date or not end_date or not pay_date:
        raise HTTPException(status_code=400, detail="name, start_date, end_date, and pay_date are required")
    start_day = _period_day(start_date)
    end_day = _period_day(end_date)
    if not start_day or not end_day:
        raise HTTPException(status_code=400, detail="Invalid start_date or end_date")
    if start_day > end_day:
        raise HTTPException(status_code=400, detail="start_date must be on or before end_date")
    doc = {
        "business_id": business_id,
        "name": name,
        "start_date": start_date,
        "end_date": end_date,
        "pay_date": pay_date,
        "pay_frequency": str((payload or {}).get("pay_frequency") or "fortnightly"),
        "status": "open",
        "export_status": "not_exported",
        "created_by": str(current_user.get("id") or current_user.get("_id") or ""),
        "created_at": now, "updated_at": now, "locked_at": None, "exported_at": None,
        "notes": str((payload or {}).get("notes") or ""),
    }
    r = await db.payroll_pay_periods.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    return doc

@api_router.get("/payroll/pay-periods/{period_id}")
async def payroll_get_period(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    period["id"] = str(period.get("_id"))
    period.pop("_id", None)
    return period


@api_router.post("/payroll/pay-periods/{period_id}/recalculate")
async def payroll_recalculate_period(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    summary = await _build_period_summary(period, business_id)
    await db.payroll_pay_periods.update_one({"_id": period["_id"]}, {"$set": {"status": "review", "updated_at": datetime.now(timezone.utc)}})
    return {"success": True, "summary": summary}


@api_router.post("/payroll/pay-periods/{period_id}/lock")
async def payroll_lock_period(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    if period.get("status") == "exported":
        raise HTTPException(status_code=400, detail="Exported period cannot be relocked")
    now = datetime.now(timezone.utc)
    await db.payroll_pay_periods.update_one({"_id": period["_id"]}, {"$set": {"status": "locked", "export_status": period.get("export_status") or "not_exported", "locked_at": now, "updated_at": now}})
    return {"success": True, "status": "locked"}

@api_router.post("/payroll/pay-periods/{period_id}/unlock")
async def payroll_unlock_period(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    role = str(current_user.get("role") or "").lower()
    if role not in {"owner", "office_admin"}:
        raise HTTPException(status_code=403, detail="Only owner or office admin can unlock pay runs")
    period = await _find_period_or_404(period_id, business_id)
    if str(period.get("status") or "") == "exported":
        raise HTTPException(status_code=400, detail="Exported pay runs cannot be unlocked")
    now = datetime.now(timezone.utc)
    await db.payroll_pay_periods.update_one({"_id": period["_id"]}, {"$set": {"status": "open", "updated_at": now}})
    return {"success": True, "status": "open"}


@api_router.post("/payroll/pay-periods/{period_id}/mark-exported")
async def payroll_mark_exported(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    now = datetime.now(timezone.utc)
    await db.payroll_pay_periods.update_one({"_id": period["_id"]}, {"$set": {"status": "exported", "export_status": "exported", "exported_at": now, "updated_at": now}})
    return {"success": True, "status": "exported"}


@api_router.delete("/payroll/pay-periods/{period_id}")
async def payroll_delete_period(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    if _period_is_readonly(period):
        raise HTTPException(status_code=400, detail="Locked/exported periods cannot be deleted")
    await db.payroll_pay_periods.delete_one({"_id": period["_id"]})
    await db.payroll_adjustments.delete_many({"business_id": business_id, "period_id": str(period.get("_id"))})
    return {"success": True}


@api_router.get("/payroll/timesheets")
async def payroll_get_timesheets(period_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    return {"timesheets": await _get_period_timesheets(period, business_id)}


@api_router.post("/payroll/timesheets/{entry_id}/approve")
async def payroll_approve_timesheet(entry_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    res = await db.jobs.update_one({"_id": ObjectId(entry_id), "business_id": business_id}, {"$set": {"payroll_status": "approved", "updated_at": datetime.now(timezone.utc)}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Timesheet entry not found")
    return {"success": True, "status": "approved"}


@api_router.post("/payroll/timesheets/{entry_id}/reject")
async def payroll_reject_timesheet(entry_id: str, payload: dict = None, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    notes = str((payload or {}).get("notes") or "")
    res = await db.jobs.update_one({"_id": ObjectId(entry_id), "business_id": business_id}, {"$set": {"payroll_status": "rejected", "payroll_notes": notes, "updated_at": datetime.now(timezone.utc)}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Timesheet entry not found")
    return {"success": True, "status": "rejected"}


@api_router.post("/payroll/timesheets/bulk-approve")
async def payroll_bulk_approve(payload: dict, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    ids = [ObjectId(x) for x in (payload or {}).get("entry_ids", []) if ObjectId.is_valid(str(x))]
    if not ids:
        return {"success": True, "updated": 0}
    res = await db.jobs.update_many({"_id": {"$in": ids}, "business_id": business_id}, {"$set": {"payroll_status": "approved", "updated_at": datetime.now(timezone.utc)}})
    return {"success": True, "updated": res.modified_count}


@api_router.get("/payroll/pay-periods/{period_id}/adjustments")
async def payroll_get_adjustments(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    await _find_period_or_404(period_id, business_id)
    rows = []
    async for a in db.payroll_adjustments.find({"business_id": business_id, "period_id": period_id}).sort("created_at", -1):
        a["id"] = str(a.get("_id"))
        a.pop("_id", None)
        rows.append(a)
    return {"adjustments": rows}


@api_router.post("/payroll/pay-periods/{period_id}/adjustments")
async def payroll_create_adjustment(period_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    if _period_is_readonly(period):
        raise HTTPException(status_code=400, detail="Locked/exported periods are read-only")
    doc = {
        "business_id": business_id, "period_id": period_id, "worker_id": str((payload or {}).get("worker_id") or ""),
        "type": str((payload or {}).get("type") or "other"), "label": str((payload or {}).get("label") or "Adjustment"),
        "amount": _to_float((payload or {}).get("amount"), 0), "taxable": bool((payload or {}).get("taxable", False)),
        "recurring": bool((payload or {}).get("recurring", False)), "notes": str((payload or {}).get("notes") or ""),
        "created_by": str(current_user.get("id") or current_user.get("_id") or ""), "created_at": datetime.now(timezone.utc),
    }
    r = await db.payroll_adjustments.insert_one(doc)
    return {"id": str(r.inserted_id), "success": True}


@api_router.delete("/payroll/adjustments/{adjustment_id}")
async def payroll_delete_adjustment(adjustment_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    adj = await db.payroll_adjustments.find_one({"_id": ObjectId(adjustment_id), "business_id": business_id})
    if not adj:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    period = await _find_period_or_404(str(adj.get("period_id")), business_id)
    if _period_is_readonly(period):
        raise HTTPException(status_code=400, detail="Locked/exported periods are read-only")
    await db.payroll_adjustments.delete_one({"_id": adj["_id"]})
    return {"success": True}


@api_router.get("/payroll/settings")
async def payroll_get_settings(current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    return await _get_payroll_settings(business_id)


@api_router.patch("/payroll/settings")
async def payroll_patch_settings(payload: dict, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    now = datetime.now(timezone.utc)
    current = await _get_payroll_settings(business_id)
    allowed = {"country", "tax_enabled", "tax_mode", "default_tax_rate", "tax_code_table", "kiwi_saver_enabled", "default_kiwi_saver_rate", "employer_contribution_enabled", "default_employer_contribution_rate", "student_loan_enabled", "acc_or_levy_placeholder", "notes", "payroll_method", "rate_mode", "default_hourly_rate", "default_pay_frequency"}
    for k, v in (payload or {}).items():
        if k in allowed:
            current[k] = v
    current["updated_at"] = now
    await db.payroll_settings.update_one({"business_id": business_id}, {"$set": current, "$setOnInsert": {"created_at": now}}, upsert=True)
    return {"success": True, "settings": current}


@api_router.get("/payroll/pay-periods/{period_id}/summary")
async def payroll_summary(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    return await _build_period_summary(period, business_id)


@api_router.get("/payroll/pay-periods/{period_id}/workers/{worker_id}/payslip")
async def payroll_payslip(period_id: str, worker_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    summary = await _build_period_summary(period, business_id)
    worker = next((w for w in summary.get("worker_summaries", []) if str(w.get("worker_id")) == str(worker_id)), None)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker summary not found")
    business = await db.users.find_one({"$or": [{"_id": ObjectId(business_id)}]}) if ObjectId.is_valid(business_id) else None
    return {
        "business_name": (business or {}).get("business_name") or (business or {}).get("name") or "Churvox Business",
        "worker_name": worker.get("worker_name"),
        "worker_email": worker.get("worker_email"),
        "pay_period": summary.get("period"),
        "approved_hours": worker.get("approved_hours"),
        "hourly_rate": worker.get("hourly_rate"),
        "salary_amount": worker.get("salary_amount"),
        "gross_pay": worker.get("gross_pay"),
        "allowances": worker.get("taxable_allowances"),
        "reimbursements": worker.get("non_taxable_reimbursements"),
        "deductions": worker.get("other_deductions"),
        "employee_tax": worker.get("employee_tax"),
        "kiwi_saver_employee": worker.get("kiwi_saver_employee"),
        "employer_contribution": worker.get("employer_contribution"),
        "net_pay_estimate": worker.get("net_pay_estimate"),
        "notes": worker.get("notes") or worker.get("leave_notes") or "",
        "disclaimer": "Payroll calculations are prepared for review. Government filing and bank payments are handled outside Churvox.",
    }


def _csv_response(filename: str, header: list[str], rows: list[list]):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(header)
    writer.writerows(rows)
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@api_router.get("/payroll/pay-periods/{period_id}/export.csv")
async def payroll_export_csv(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    summary = await _build_period_summary(period, business_id)
    filename = f"churvox-payroll-{period.get('start_date')}-to-{period.get('end_date')}.csv"
    header = ["Pay Period Name","Pay Period Start Date","Pay Period End Date","Pay Date","Worker Name","Worker Email","Worker Role","Pay Type","Hourly Rate","Salary Amount","Approved Hours","Pending Hours","Rejected Hours","Jobs Worked","Base Gross Pay","Taxable Allowances","Reimbursements","Bonuses","Gross Pay","Employee Tax","KiwiSaver Employee","Other Deductions","Employer Contribution","Net Pay Estimate","Total Cost Estimate","Payroll Status","Notes"]
    workers = {w["id"]: w for w in await _get_payroll_workers(business_id)}
    rows = []
    for w in summary.get("worker_summaries", []):
        full = workers.get(w.get("worker_id"), {})
        rows.append([period.get("name"), period.get("start_date"), period.get("end_date"), period.get("pay_date") or "", w.get("worker_name"), w.get("worker_email"), full.get("role", "worker"), w.get("pay_type"), w.get("hourly_rate"), w.get("salary_amount"), w.get("approved_hours"), w.get("pending_hours"), w.get("rejected_hours"), w.get("jobs_worked"), w.get("base_gross_pay"), w.get("taxable_allowances"), w.get("non_taxable_reimbursements"), w.get("bonuses"), w.get("gross_pay"), w.get("employee_tax"), w.get("kiwi_saver_employee"), w.get("other_deductions"), w.get("employer_contribution"), w.get("net_pay_estimate"), w.get("total_cost_estimate"), w.get("status"), w.get("notes") or ""])
    return _csv_response(filename, header, rows)


@api_router.get("/payroll/pay-periods/{period_id}/timesheets.csv")
async def payroll_timesheets_csv(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    rows_data = await _get_period_timesheets(period, business_id)
    filename = f"churvox-timesheets-{period.get('start_date')}-to-{period.get('end_date')}.csv"
    header = ["Pay Period Name","Pay Period Start Date","Pay Period End Date","Worker Name","Worker Email","Job Title","Client Name","Date","Started At","Ended At","Gross Hours","Paused Minutes","Net Hours","Status","Notes"]
    rows = [[period.get("name"), period.get("start_date"), period.get("end_date"), r.get("worker_name"), r.get("worker_email"), r.get("job_title"), r.get("client_name"), r.get("date"), r.get("started_at"), r.get("ended_at"), r.get("gross_hours"), r.get("paused_minutes"), r.get("net_hours"), r.get("status"), r.get("notes") or ""] for r in rows_data]
    return _csv_response(filename, header, rows)


@api_router.get("/payroll/pay-periods/{period_id}/payslips.csv")
async def payroll_payslips_csv(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    summary = await _build_period_summary(period, business_id)
    filename = f"churvox-payslips-{period.get('start_date')}-to-{period.get('end_date')}.csv"
    header = ["Pay Period","Worker Name","Worker Email","Gross Pay","Employee Tax","Deductions","Reimbursements","Net Pay Estimate","Employer Contribution","Notes"]
    rows = [[period.get("name"), w.get("worker_name"), w.get("worker_email"), w.get("gross_pay"), w.get("employee_tax"), w.get("other_deductions"), w.get("non_taxable_reimbursements"), w.get("net_pay_estimate"), w.get("employer_contribution"), w.get("notes") or ""] for w in summary.get("worker_summaries", [])]
    return _csv_response(filename, header, rows)

@api_router.get("/payroll/pay-periods/{period_id}/worker-pay.csv")
async def payroll_worker_pay_csv(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    summary = await _build_period_summary(period, business_id)
    filename = f"churvox-worker-pay-{period.get('start_date')}-to-{period.get('end_date')}.csv"
    header = ["Pay Period", "Worker Name", "Worker Email", "Approved Hours", "Pending Hours", "Jobs Worked", "Adjustments Total", "Estimated Gross Pay", "Net Pay Estimate", "Status"]
    rows = [[period.get("name"), w.get("worker_name"), w.get("worker_email"), w.get("approved_hours"), w.get("pending_hours"), w.get("jobs_worked"), w.get("adjustments_total"), w.get("gross_pay"), w.get("net_pay_estimate"), w.get("status")] for w in summary.get("worker_summaries", [])]
    return _csv_response(filename, header, rows)

@api_router.get("/payroll/pay-periods/{period_id}/adjustments.csv")
async def payroll_adjustments_csv(period_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _require_payroll_access(current_user)
    period = await _find_period_or_404(period_id, business_id)
    workers = {w["id"]: w for w in await _get_payroll_workers(business_id)}
    adjustments = await db.payroll_adjustments.find({"business_id": business_id, "period_id": str(period.get("id") or period.get("_id"))}).to_list(length=5000)
    filename = f"churvox-adjustments-{period.get('start_date')}-to-{period.get('end_date')}.csv"
    header = ["Pay Period", "Worker Name", "Worker Email", "Type", "Label", "Amount", "Taxable", "Notes", "Created At"]
    rows = []
    for a in adjustments:
        worker = workers.get(str(a.get("worker_id") or ""), {})
        rows.append([period.get("name"), worker.get("name") or "", worker.get("email") or "", a.get("type"), a.get("label"), a.get("amount"), bool(a.get("taxable")), a.get("notes") or "", _to_iso(a.get("created_at"))])
    return _csv_response(filename, header, rows)



# ==========================================================================
# Invoice overdue scanner + background scheduler
# ==========================================================================
async def _scan_overdue_invoices_and_emit() -> dict:
    """
    Scan sent-but-unpaid invoices whose due_date has passed. For any found in a
    business, emit the `invoice_overdue` automation trigger. Guarded by
    `last_overdue_emitted_at` so the same invoice only triggers once per day.
    """
    from datetime import datetime, timezone, date
    emitted = 0
    skipped = 0
    businesses_touched: set = set()
    now = datetime.now(timezone.utc)
    today = date.today().isoformat()

    q = {"status": {"$in": ["sent", "overdue"]}}
    try:
        async for inv in db.invoices.find(q):
            try:
                due = inv.get("due_date") or inv.get("valid_until")
                due_str = None
                if hasattr(due, "isoformat"):
                    due_str = due.date().isoformat() if hasattr(due, "date") else due.isoformat()[:10]
                elif isinstance(due, str):
                    due_str = due[:10]
                if not due_str or due_str >= today:
                    continue
                # Already emitted today?
                last = inv.get("last_overdue_emitted_at")
                last_str = None
                if hasattr(last, "isoformat"):
                    last_str = last.date().isoformat() if hasattr(last, "date") else last.isoformat()[:10]
                elif isinstance(last, str):
                    last_str = last[:10]
                if last_str == today:
                    skipped += 1
                    continue

                bid = str(inv.get("business_id") or "")
                try:
                    days_overdue = (date.today() - date.fromisoformat(due_str)).days
                except Exception:
                    days_overdue = 0
                await auto.emit_event(db, "invoice_overdue", {
                    "business_id": bid,
                    "actor": {"id": "system", "role": "system"},
                    "invoice": {
                        "id": str(inv.get("_id")),
                        "status": inv.get("status") or "sent",
                        "total": float(inv.get("total") or 0),
                        "client_id": str(inv.get("client_id") or ""),
                        "due_date": due_str,
                        "days_overdue": days_overdue,
                    },
                })
                await db.invoices.update_one(
                    {"_id": inv["_id"]},
                    {"$set": {"last_overdue_emitted_at": now}},
                )
                emitted += 1
                businesses_touched.add(bid)
            except Exception as e:
                print(f"OVERDUE_SCAN_ROW_ERR {inv.get('_id')} {e}")
    except Exception as e:
        print(f"OVERDUE_SCAN_ERR {e}")
    return {"emitted": emitted, "skipped": skipped, "businesses": len(businesses_touched)}


async def _scheduled_recurring_generate_all() -> dict:
    """
    Run the recurring job generator once across every business. Uses the same
    guards as the on-demand endpoint so re-running it the same day is a no-op.
    """
    from datetime import datetime, timezone, date
    now = datetime.now(timezone.utc)
    today = date.today().isoformat()
    created = 0
    skipped = 0
    businesses: set = set()
    try:
        async for src in db.jobs.find({"is_recurring": True}):
            try:
                last_gen = src.get("last_generated_at")
                last_gen_date = None
                if hasattr(last_gen, "isoformat"):
                    last_gen_date = last_gen.date().isoformat()
                elif isinstance(last_gen, str):
                    last_gen_date = last_gen[:10]
                if last_gen_date == today:
                    skipped += 1
                    continue
                freq = src.get("recurring_frequency") or "weekly"
                base_date = src.get("scheduled_date") or today
                new_sched = _next_occurrence_iso(freq, base_date)
                bid = str(src.get("business_id") or "")
                new_doc = {
                    "title": src.get("title") or "Recurring job",
                    "job_type": src.get("job_type") or "other",
                    "client_id": src.get("client_id"),
                    "client_name": src.get("client_name") or "",
                    "address": src.get("address") or "",
                    "country": src.get("country") or "New Zealand",
                    "region": src.get("region") or "",
                    "scheduled_date": new_sched,
                    "estimated_duration": src.get("estimated_duration") or 60,
                    "price": src.get("price") or 0,
                    "pricing_type": src.get("pricing_type") or "fixed",
                    "assigned_worker_id": src.get("assigned_worker_id"),
                    "is_recurring": False,
                    "recurring_source_id": str(src.get("_id")),
                    "status": "assigned",
                    "business_id": bid,
                    "owner_id": src.get("owner_id") or bid,
                    "created_at": now, "updated_at": now,
                    "auto_generated": True,
                }
                ins = await db.jobs.insert_one(new_doc)
                new_id = str(ins.inserted_id)
                await db.jobs.update_one(
                    {"_id": src["_id"]},
                    {"$set": {"last_generated_at": now, "scheduled_date": new_sched}},
                )
                created += 1
                businesses.add(bid)
                try:
                    await auto.emit_event(db, "recurring_job_generated", {
                        "business_id": bid,
                        "actor": {"id": "system", "role": "system"},
                        "source_job_id": str(src.get("_id")),
                        "job": {
                            "id": new_id, "title": new_doc.get("title"),
                            "client_id": str(new_doc.get("client_id") or ""),
                            "recurring_frequency": freq,
                            "business_id": bid,
                            "scheduled_date": new_sched,
                        },
                    })
                except Exception as e:
                    print("AUTO_EMIT_ERR scheduled recurring", e)
            except Exception as e:
                print(f"SCHED_RECUR_ROW_ERR {e}")
    except Exception as e:
        print(f"SCHED_RECUR_ERR {e}")
    return {"created": created, "skipped": skipped, "businesses": len(businesses)}


@api_router.post("/automation/scheduler/tick")
async def scheduler_tick_now(current_user: dict = Depends(get_current_user)):
    """Manually trigger the recurring generator + overdue scan (admin only)."""
    _require_auto_admin(current_user)
    rec = await _scheduled_recurring_generate_all()
    ovd = await _scan_overdue_invoices_and_emit()
    return {"success": True, "recurring": rec, "overdue": ovd}


@app.on_event("startup")
async def _automation_startup():
    try:
        await auto.ensure_indexes(db)
        print("AUTOMATION_READY triggers=%d actions=%d" % (len(auto.TRIGGERS), len(auto.ACTIONS)))
    except Exception as e:
        # Must never crash Render startup
        print(f"AUTOMATION_STARTUP_ERR {e}")

    # Launch a lightweight periodic scheduler. 6-hour interval is practical for
    # daily-scale concerns (recurring jobs, overdue invoices) without burning cycles.
    import asyncio as _asyncio

    async def _scheduler_loop():
        try:
            await _asyncio.sleep(30)  # let app fully come up first
        except Exception:
            return
        while True:
            try:
                print("AUTOMATION_SCHEDULER_TICK start")
                rec = await _scheduled_recurring_generate_all()
                ovd = await _scan_overdue_invoices_and_emit()
                print(f"AUTOMATION_SCHEDULER_TICK done recurring={rec} overdue={ovd}")
            except Exception as e:
                print(f"AUTOMATION_SCHEDULER_ERR {e}")
            try:
                await _asyncio.sleep(6 * 60 * 60)  # 6h
            except Exception:
                return

    try:
        _asyncio.create_task(_scheduler_loop())
        print("AUTOMATION_SCHEDULER started (6h interval)")
    except Exception as e:
        print(f"AUTOMATION_SCHEDULER_START_ERR {e}")



# ============================================================
# CHURVOX LAUNCH AUTOMATION ROUTES
# Added as a safe launch-ready automation API surface.
# Business-scoped, role-restricted, and frontend-compatible.
# ============================================================

import uuid as _automation_uuid
from datetime import datetime as _automation_datetime, timezone as _automation_timezone

_AUTOMATION_ALLOWED_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "platform_owner"}

def _automation_now():
    return _automation_datetime.now(_automation_timezone.utc).isoformat()

def _automation_role(current_user: dict):
    return str((current_user or {}).get("role") or "").strip().lower()

def _automation_business_id(current_user: dict):
    user = current_user or {}
    return str(
        user.get("business_id")
        or user.get("businessId")
        or user.get("business")
        or user.get("company_id")
        or user.get("companyId")
        or user.get("id")
        or user.get("_id")
        or user.get("email")
        or "default"
    )

def _automation_user_id(current_user: dict):
    user = current_user or {}
    return str(user.get("id") or user.get("_id") or user.get("email") or "")

def _automation_require_manager(current_user: dict):
    role = _automation_role(current_user)
    if role not in _AUTOMATION_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="You do not have permission to manage automation rules.")
    return True

def _automation_clean_doc(doc):
    if not doc:
        return None
    out = {}
    for key, value in dict(doc).items():
        if key == "_id":
            out["_id"] = str(value)
        else:
            out[key] = value
    if not out.get("id"):
        out["id"] = out.get("_id")
    return out

def _automation_clean_docs(docs):
    return [_automation_clean_doc(d) for d in docs or []]

_AUTOMATION_TEMPLATES = [
    {"id": "job_completed_notify", "name": "Job completed → notify owner/admin", "trigger": "job.completed", "action": "notification.create", "description": "Creates a notification when a worker completes a job."},
    {"id": "job_completed_draft_invoice", "name": "Job completed → create draft invoice", "trigger": "job.completed", "action": "invoice.create_draft", "description": "Creates a draft invoice when a completed job has pricing."},
    {"id": "quote_accepted_notify", "name": "Quote accepted → notify owner/admin", "trigger": "quote.accepted", "action": "notification.create", "description": "Creates a notification when a customer accepts a public quote."},
    {"id": "invoice_paid_timeline", "name": "Invoice paid → timeline entry", "trigger": "invoice.paid", "action": "timeline.create", "description": "Records invoice payment activity in the business timeline."},
    {"id": "client_created_timeline", "name": "New client → timeline entry", "trigger": "client.created", "action": "timeline.create", "description": "Records new client activity in the business timeline."},
]

@api_router.get("/automation/templates")
async def automation_templates(current_user: dict = Depends(get_current_user)):
    _automation_require_manager(current_user)
    return {"success": True, "templates": _AUTOMATION_TEMPLATES}

@api_router.get("/automation/rules")
async def automation_list_rules(current_user: dict = Depends(get_current_user)):
    _automation_require_manager(current_user)
    business_id = _automation_business_id(current_user)
    cursor = db.automation_rules.find({"business_id": business_id}).sort("created_at", -1)
    rules = await cursor.to_list(length=300)
    return {"success": True, "rules": _automation_clean_docs(rules)}

@api_router.post("/automation/rules")
async def automation_create_rule(payload: dict, current_user: dict = Depends(get_current_user)):
    _automation_require_manager(current_user)
    payload = payload or {}
    business_id = _automation_business_id(current_user)

    name = str(payload.get("name") or "").strip()
    trigger = str(payload.get("trigger") or "").strip()
    action = str(payload.get("action") or "").strip()

    if not name:
        raise HTTPException(status_code=400, detail="Automation name is required.")
    if not trigger:
        raise HTTPException(status_code=400, detail="Automation trigger is required.")
    if not action:
        raise HTTPException(status_code=400, detail="Automation action is required.")

    now = _automation_now()
    rule = {
        "id": str(_automation_uuid.uuid4()),
        "business_id": business_id,
        "name": name,
        "description": str(payload.get("description") or "").strip(),
        "trigger": trigger,
        "action": action,
        "enabled": bool(payload.get("enabled", True)),
        "conditions": payload.get("conditions") if isinstance(payload.get("conditions"), dict) else {},
        "config": payload.get("config") if isinstance(payload.get("config"), dict) else {},
        "action_config": payload.get("action_config") if isinstance(payload.get("action_config"), dict) else {},
        "created_by": _automation_user_id(current_user),
        "created_at": now,
        "updated_at": now,
    }

    await db.automation_rules.insert_one(rule)
    return {"success": True, "rule": _automation_clean_doc(rule)}

@api_router.put("/automation/rules/{rule_id}")
async def automation_update_rule(rule_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    _automation_require_manager(current_user)
    payload = payload or {}
    business_id = _automation_business_id(current_user)

    allowed = {"name", "description", "trigger", "action", "enabled", "conditions", "config", "action_config"}

    update = {}
    for key in allowed:
        if key in payload:
            update[key] = payload[key]

    if "name" in update:
        update["name"] = str(update["name"] or "").strip()
        if not update["name"]:
            raise HTTPException(status_code=400, detail="Automation name is required.")

    if "trigger" in update:
        update["trigger"] = str(update["trigger"] or "").strip()
        if not update["trigger"]:
            raise HTTPException(status_code=400, detail="Automation trigger is required.")

    if "action" in update:
        update["action"] = str(update["action"] or "").strip()
        if not update["action"]:
            raise HTTPException(status_code=400, detail="Automation action is required.")

    if "enabled" in update:
        update["enabled"] = bool(update["enabled"])

    if "conditions" in update and not isinstance(update["conditions"], dict):
        update["conditions"] = {}
    if "config" in update and not isinstance(update["config"], dict):
        update["config"] = {}
    if "action_config" in update and not isinstance(update["action_config"], dict):
        update["action_config"] = {}

    update["updated_at"] = _automation_now()

    result = await db.automation_rules.update_one({"id": rule_id, "business_id": business_id}, {"$set": update})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Automation rule not found.")

    doc = await db.automation_rules.find_one({"id": rule_id, "business_id": business_id})
    return {"success": True, "rule": _automation_clean_doc(doc)}

@api_router.patch("/automation/rules/{rule_id}")
async def automation_patch_rule(rule_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    return await automation_update_rule(rule_id, payload, current_user)

@api_router.delete("/automation/rules/{rule_id}")
async def automation_delete_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    _automation_require_manager(current_user)
    business_id = _automation_business_id(current_user)

    result = await db.automation_rules.delete_one({"id": rule_id, "business_id": business_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Automation rule not found.")

    await db.automation_runs.insert_one({
        "id": str(_automation_uuid.uuid4()),
        "business_id": business_id,
        "rule_id": rule_id,
        "trigger": "rule.deleted",
        "action": "automation.delete",
        "status": "success",
        "message": "Automation rule deleted.",
        "created_at": _automation_now(),
        "created_by": _automation_user_id(current_user),
    })

    return {"success": True}

@api_router.get("/automation/runs")
async def automation_list_runs(current_user: dict = Depends(get_current_user)):
    _automation_require_manager(current_user)
    business_id = _automation_business_id(current_user)
    cursor = db.automation_runs.find({"business_id": business_id}).sort("created_at", -1)
    runs = await cursor.to_list(length=100)
    return {"success": True, "runs": _automation_clean_docs(runs)}

@api_router.post("/automation/rules/{rule_id}/test")
async def automation_test_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    _automation_require_manager(current_user)
    business_id = _automation_business_id(current_user)

    rule = await db.automation_rules.find_one({"id": rule_id, "business_id": business_id})
    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found.")

    run = {
        "id": str(_automation_uuid.uuid4()),
        "business_id": business_id,
        "rule_id": rule_id,
        "rule_name": rule.get("name"),
        "trigger": rule.get("trigger"),
        "action": rule.get("action"),
        "status": "success",
        "message": "Automation test completed. No customer-facing action was sent.",
        "created_at": _automation_now(),
        "created_by": _automation_user_id(current_user),
    }

    await db.automation_runs.insert_one(run)
    return {"success": True, "run": _automation_clean_doc(run)}


from command_hub_routes import register_command_hub_routes
register_command_hub_routes(api_router, db, get_current_user, get_user_business_id)



# CHURVOX_MIN_WORK_SLIP_DRAFT_INVOICE_ROUTE_20260527
@api_router.post("/jobs/{job_id}/create-draft-invoice")
async def churvox_work_slip_create_draft_invoice(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = _resolve_business_id(current_user)
    owner_id = _resolve_owner_id(current_user)
    now = datetime.now(timezone.utc)

    job = None
    if ObjectId.is_valid(str(job_id)):
        job = await db.jobs.find_one({"_id": ObjectId(job_id), "$or": [{"business_id": business_id}, {"owner_id": owner_id}]})
    if not job:
        job = await db.jobs.find_one({"id": str(job_id), "$or": [{"business_id": business_id}, {"owner_id": owner_id}]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    def num(v):
        try:
            return float(v or 0)
        except Exception:
            return 0

    customer_name = payload.get("customer_name") or job.get("customer_name") or job.get("client_name") or "Customer"
    subtotal = num(payload.get("subtotal") or job.get("price") or job.get("job_price") or job.get("fixed_price") or job.get("total") or job.get("amount"))

    if subtotal <= 0:
        raise HTTPException(status_code=400, detail="Add a job price before preparing the invoice.")

    description = payload.get("description") or job.get("invoice_description_draft") or job.get("ai_invoice_description") or _format_invoice_description_from_job(job, customer_name)
    gst_rate = num(payload.get("gst_rate") or DEFAULT_GST_RATE)

    invoice_doc = {
        "invoice_number": f"INV-{int(now.timestamp())}",
        "job_id": str(job.get("_id") or job_id),
        "source_job_id": str(job.get("_id") or job_id),
        "linked_job_id": str(job.get("_id") or job_id),
        "client_id": payload.get("client_id") or job.get("client_id"),
        "customer_name": customer_name,
        "customer_email": payload.get("customer_email") or job.get("customer_email") or job.get("client_email") or "",
        "address": payload.get("address") or job.get("address") or job.get("site_address") or "",
        "description": description,
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "total": subtotal + (subtotal * gst_rate / 100),
        "status": "draft",
        "pricing_type": payload.get("pricing_type") or job.get("pricing_type") or "fixed",
        "notes": payload.get("notes") or "Prepared by Churvox Command Floor. Review before sending.",
        "source": "command_floor_work_slip",
        "myob_sync_status": "not_synced",
        "official_invoice_source": "churvox",
        "business_id": business_id,
        "owner_id": owner_id,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.invoices.insert_one(invoice_doc)
    invoice_id = str(result.inserted_id)

    await db.jobs.update_one({"_id": job["_id"]}, {"$set": {
        "draft_invoice_id": invoice_id,
        "invoice_id": invoice_id,
        "invoice_prepared": True,
        "invoice_prepared_at": now,
        "invoice_description_draft": description,
        "updated_at": now,
    }})

    # CHURVOX_WORK_SLIP_DRAFT_INVOICE_NOTIFY_20260527
    try:
        await notify(
            user_id=owner_id,
            business_id=business_id,
            type="draft_invoice_ready",
            title="Draft invoice ready",
            message=f"Draft invoice prepared for {customer_name}. Review before sending.",
            route=f"/invoices/{invoice_id}",
            target_type="invoice",
            target_id=invoice_id,
        )
    except Exception as e:
        print("WORK_SLIP_DRAFT_INVOICE_NOTIFY_ERROR", e)

    return {"success": True, "id": invoice_id, "invoice_id": invoice_id, "route": f"/invoices/{invoice_id}", "message": "Draft invoice prepared and linked to this job"}




# CHURVOX_BIG_LAUNCH_FINISH_BACKEND_20260528
# Safe fallback routes for Command Floor / Work Slip.
# These do not replace existing routes. Frontend can call these if normal PATCH /jobs/{id} fails.

def _churvox_safe_job_patch_payload(payload: dict):
    allowed = {
        "title", "job_name", "job_type", "service_type",
        "client_id", "customer_name", "client_name",
        "address", "site_address", "scheduled_date", "scheduled_time",
        "description", "notes", "worker_notes", "completion_notes",
        "price", "job_price", "pricing_type", "hourly_rate", "extras",
        "assigned_worker_id", "assigned_worker_name", "assigned_to",
        "invoice_description_draft", "customer_message_draft", "draft_message", "last_message_draft",
        "draft_invoice_id", "invoice_id", "linked_invoice_id", "invoice_number",
        "invoice_prepared", "invoice_status", "invoiced",
        "owner_review_status", "work_review_status", "approval_status", "command_floor_status",
        "reviewed", "owner_approved", "work_approved", "job_approved",
        "approved_at", "completed_at", "worker_completed_at",
        "status",
    }
    if not isinstance(payload, dict):
        return {}
    return {k: v for k, v in payload.items() if k in allowed}

async def _churvox_find_job_for_user(job_id: str, current_user: dict):
    business_id = _resolve_business_id(current_user)
    owner_id = _resolve_owner_id(current_user)
    queries = []
    if ObjectId.is_valid(str(job_id)):
        queries.append({"_id": ObjectId(job_id)})
    queries.append({"id": str(job_id)})

    for base in queries:
        job = await db.jobs.find_one({
            **base,
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
                {"assigned_worker_id": str(current_user.get("id") or "")},
                {"assigned_to": str(current_user.get("id") or "")},
            ],
        })
        if job:
            return job
    return None

@api_router.patch("/jobs/{job_id}/work-slip-update")
async def churvox_work_slip_update_job(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    job = await _churvox_find_job_for_user(job_id, current_user)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    patch = _churvox_safe_job_patch_payload(payload)
    if not patch:
        raise HTTPException(status_code=400, detail="No valid Work Slip fields to save")

    now = datetime.now(timezone.utc)
    patch["updated_at"] = now

    status_text = str(patch.get("status") or "").lower()
    if status_text in {"completed", "complete", "done"} or patch.get("completed_at") or patch.get("worker_completed_at"):
        patch.setdefault("status", "completed")
        patch.setdefault("completed_at", now)
        patch.setdefault("worker_completed_at", now)
        patch.setdefault("owner_review_status", "ready_for_review")
        patch.setdefault("work_review_status", "ready_for_review")
        patch.setdefault("command_floor_status", "ready_for_owner_review")
        patch.setdefault("reviewed", False)
        patch.setdefault("owner_approved", False)
        patch.setdefault("work_approved", False)

    if patch.get("owner_review_status") in {"approved", "invoiced"} or patch.get("work_review_status") in {"approved", "invoiced"}:
        patch.setdefault("reviewed", True)
        patch.setdefault("owner_approved", True)
        patch.setdefault("work_approved", True)

    await db.jobs.update_one({"_id": job["_id"]}, {"$set": patch})

    return {
        "success": True,
        "id": str(job["_id"]),
        "message": "Work Slip job update saved",
    }

@api_router.post("/jobs/{job_id}/complete-for-owner-review")
async def churvox_complete_job_for_owner_review(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    job = await _churvox_find_job_for_user(job_id, current_user)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    now = datetime.now(timezone.utc)
    patch = _churvox_safe_job_patch_payload(payload)
    patch.update({
        "status": "completed",
        "completed_at": patch.get("completed_at") or now,
        "worker_completed_at": patch.get("worker_completed_at") or now,
        "owner_review_status": "ready_for_review",
        "work_review_status": "ready_for_review",
        "command_floor_status": "ready_for_owner_review",
        "reviewed": False,
        "owner_approved": False,
        "work_approved": False,
        "updated_at": now,
    })

    await db.jobs.update_one({"_id": job["_id"]}, {"$set": patch})

    try:
        owner_id = str(job.get("owner_id") or current_user.get("business_id") or current_user.get("id") or "")
        business_id = _resolve_business_id(current_user)
        await notify(
            user_id=owner_id,
            business_id=business_id,
            type="work_ready_for_review",
            title="Work ready for review",
            message=f"{job.get('title') or job.get('job_name') or 'Completed work'} is ready for owner review.",
            route="/dashboard",
            target_type="job",
            target_id=str(job["_id"]),
        )
    except Exception as e:
        print("WORK_READY_FOR_REVIEW_NOTIFY_ERROR", e)

    return {
        "success": True,
        "id": str(job["_id"]),
        "message": "Job marked complete and ready for owner review",
    }




# CHURVOX_TOP_TIER_BACKEND_FOUNDATIONS_20260528
# Additive launch-safe AI Operator foundations:
# 1 proof packs, 2 customer proof page data, 3 AI audit trail, 4 undo/reopen, 5 client memory,
# 6 worker voice notes, 7 trade presets, 8 approval-first message drafts,
# 9 dispatch board, 10 offline sync queue.

def _cv_top_now():
    return datetime.now(timezone.utc)

def _cv_top_id():
    try:
        return secrets.token_urlsafe(12)
    except Exception:
        return str(int(_cv_top_now().timestamp()))

def _cv_top_str(value):
    return str(value or "").strip()

def _cv_top_business_id(user: dict):
    try:
        return _resolve_business_id(user)
    except Exception:
        return _cv_top_str((user or {}).get("business_id") or (user or {}).get("id") or (user or {}).get("_id"))

def _cv_top_owner_id(user: dict):
    try:
        return _resolve_owner_id(user)
    except Exception:
        return _cv_top_str((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("user_id"))

def _cv_top_doc(doc):
    if not doc:
        return doc
    d = dict(doc)
    if "_id" in d:
        d["id"] = str(d.pop("_id"))
    for k, v in list(d.items()):
        if hasattr(v, "isoformat"):
            d[k] = v.isoformat()
        elif isinstance(v, ObjectId):
            d[k] = str(v)
    return d

def _cv_top_docs(rows):
    return [_cv_top_doc(x) for x in rows]

async def _cv_top_find_job(job_id: str, user: dict):
    business_id = _cv_top_business_id(user)
    owner_id = _cv_top_owner_id(user)
    possible = []
    if ObjectId.is_valid(str(job_id)):
        possible.append({"_id": ObjectId(job_id)})
    possible.append({"id": str(job_id)})

    for base in possible:
        job = await db.jobs.find_one({
            **base,
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
                {"assigned_worker_id": _cv_top_str(user.get("id"))},
                {"assigned_to": _cv_top_str(user.get("id"))},
            ],
        })
        if job:
            return job
    return None

async def _cv_top_audit(user: dict, action: str, target_type: str = "", target_id: str = "", before=None, after=None, note: str = ""):
    business_id = _cv_top_business_id(user)
    row = {
        "id": _cv_top_id(),
        "business_id": business_id,
        "actor_id": _cv_top_owner_id(user),
        "actor_email": user.get("email"),
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "before": before or {},
        "after": after or {},
        "note": note,
        "created_at": _cv_top_now(),
    }
    try:
        await db.ai_audit_log.insert_one(row)
    except Exception as e:
        print("CV_TOP_AUDIT_ERROR", e)
    return row

@api_router.get("/ai/audit-log")
async def churvox_ai_audit_log(limit: int = 100, current_user: dict = Depends(get_current_user)):
    business_id = _cv_top_business_id(current_user)
    rows = await db.ai_audit_log.find({"business_id": business_id}).sort("created_at", -1).limit(min(max(limit, 1), 300)).to_list(length=min(max(limit, 1), 300))
    return {"success": True, "items": _cv_top_docs(rows)}

@api_router.post("/ai/audit-log")
async def churvox_ai_audit_log_create(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    row = await _cv_top_audit(
        current_user,
        _cv_top_str(payload.get("action") or "manual_note"),
        _cv_top_str(payload.get("target_type")),
        _cv_top_str(payload.get("target_id")),
        payload.get("before") or {},
        payload.get("after") or {},
        _cv_top_str(payload.get("note")),
    )
    return {"success": True, "item": _cv_top_doc(row)}

@api_router.post("/work-slips/{job_id}/reopen")
async def churvox_reopen_work_slip(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await _cv_top_find_job(job_id, current_user)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    now = _cv_top_now()
    patch = {
        "owner_review_status": "ready_for_review",
        "work_review_status": "ready_for_review",
        "approval_status": "reopened",
        "command_floor_status": "ready_for_owner_review",
        "reviewed": False,
        "owner_approved": False,
        "work_approved": False,
        "job_approved": False,
        "reopened_at": now,
        "updated_at": now,
    }
    await db.jobs.update_one({"_id": job["_id"]}, {"$set": patch})
    await _cv_top_audit(current_user, "reopen_work_slip", "job", str(job["_id"]), before=_cv_top_doc(job), after=patch, note="Owner reopened Work Slip.")
    return {"success": True, "message": "Work Slip reopened", "job_id": str(job["_id"])}

@api_router.get("/clients/{client_id}/memory")
async def churvox_client_memory(client_id: str, current_user: dict = Depends(get_current_user)):
    business_id = _cv_top_business_id(current_user)
    client = None
    if ObjectId.is_valid(str(client_id)):
        client = await db.clients.find_one({"_id": ObjectId(client_id), "business_id": business_id})
    if not client:
        client = await db.clients.find_one({"id": str(client_id), "business_id": business_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    cid = str(client.get("_id") or client.get("id") or client_id)
    jobs = await db.jobs.find({"business_id": business_id, "$or": [{"client_id": cid}, {"customer_name": client.get("name")}, {"client_name": client.get("name")}]}).sort("created_at", -1).limit(20).to_list(length=20)
    invoices = await db.invoices.find({"business_id": business_id, "$or": [{"client_id": cid}, {"customer_name": client.get("name")}]}).sort("created_at", -1).limit(20).to_list(length=20)
    quotes = await db.quotes.find({"business_id": business_id, "$or": [{"client_id": cid}, {"customer_name": client.get("name")}]}).sort("created_at", -1).limit(20).to_list(length=20)

    memory = {
        "client": _cv_top_doc(client),
        "last_jobs": _cv_top_docs(jobs),
        "last_invoices": _cv_top_docs(invoices),
        "last_quotes": _cv_top_docs(quotes),
        "warnings": client.get("warnings") or client.get("access_notes") or client.get("notes") or "",
        "preferred_worker": client.get("preferred_worker") or client.get("preferred_worker_id") or "",
        "pricing_history": [j for j in _cv_top_docs(jobs) if j.get("price") or j.get("job_price") or j.get("amount")],
    }
    return {"success": True, "memory": memory}

@api_router.post("/proof-packs/from-job/{job_id}")
async def churvox_create_proof_pack_from_job(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    job = await _cv_top_find_job(job_id, current_user)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    business_id = _cv_top_business_id(current_user)
    now = _cv_top_now()
    public_token = job.get("proof_public_token") or _cv_top_id()

    photos = payload.get("photos") or job.get("photos") or job.get("worker_photos") or job.get("job_photos") or []
    if not isinstance(photos, list):
        photos = []

    pack = {
        "id": _cv_top_id(),
        "business_id": business_id,
        "job_id": str(job.get("_id") or job.get("id") or job_id),
        "client_id": job.get("client_id"),
        "customer_name": job.get("customer_name") or job.get("client_name") or payload.get("customer_name") or "",
        "job_title": job.get("title") or job.get("job_name") or "Completed work",
        "status": "draft",
        "public_token": public_token,
        "owner_message": payload.get("owner_message") or job.get("customer_message_draft") or "",
        "ai_summary": payload.get("ai_summary") or job.get("invoice_description_draft") or job.get("worker_notes") or job.get("notes") or "",
        "photos": photos,
        "invoice_id": job.get("invoice_id") or job.get("draft_invoice_id"),
        "quote_id": job.get("quote_id"),
        "created_at": now,
        "updated_at": now,
    }

    existing = await db.customer_proof_packs.find_one({"business_id": business_id, "job_id": pack["job_id"]})
    if existing:
        await db.customer_proof_packs.update_one({"_id": existing["_id"]}, {"$set": {**pack, "id": existing.get("id") or pack["id"], "created_at": existing.get("created_at") or now}})
        row = await db.customer_proof_packs.find_one({"_id": existing["_id"]})
    else:
        await db.customer_proof_packs.insert_one(pack)
        row = pack

    await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"proof_pack_id": row.get("id"), "proof_public_token": public_token, "updated_at": now}})
    await _cv_top_audit(current_user, "prepare_customer_proof_pack", "job", str(job.get("_id")), after={"proof_pack_id": row.get("id")})
    return {"success": True, "proof_pack": _cv_top_doc(row), "public_path": f"/public/proof/{public_token}"}

@api_router.get("/proof-packs")
async def churvox_list_proof_packs(current_user: dict = Depends(get_current_user)):
    business_id = _cv_top_business_id(current_user)
    rows = await db.customer_proof_packs.find({"business_id": business_id}).sort("updated_at", -1).limit(200).to_list(length=200)
    return {"success": True, "items": _cv_top_docs(rows)}

@api_router.get("/public/proof/{token}")
async def churvox_public_proof_pack(token: str):
    pack = await db.customer_proof_packs.find_one({"public_token": token})
    if not pack:
        raise HTTPException(status_code=404, detail="Proof pack not found")
    return {"success": True, "proof_pack": _cv_top_doc(pack)}

@api_router.post("/worker/voice-notes/draft")
async def churvox_worker_voice_note_draft(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = _cv_top_business_id(current_user)
    now = _cv_top_now()
    raw_note = _cv_top_str(payload.get("note") or payload.get("transcript") or payload.get("text"))
    job_id = _cv_top_str(payload.get("job_id"))

    draft = {
        "id": _cv_top_id(),
        "business_id": business_id,
        "job_id": job_id,
        "worker_id": _cv_top_owner_id(current_user),
        "raw_note": raw_note,
        "job_note": raw_note,
        "invoice_description": raw_note,
        "customer_message": f"Work has been completed. Notes: {raw_note}" if raw_note else "",
        "status": "draft",
        "created_at": now,
        "updated_at": now,
    }
    await db.worker_voice_note_drafts.insert_one(draft)
    if job_id:
        job = await _cv_top_find_job(job_id, current_user)
        if job:
            await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"worker_notes": raw_note, "invoice_description_draft": raw_note, "updated_at": now}})
    return {"success": True, "draft": _cv_top_doc(draft)}

@api_router.get("/worker/voice-notes")
async def churvox_worker_voice_notes(current_user: dict = Depends(get_current_user)):
    business_id = _cv_top_business_id(current_user)
    rows = await db.worker_voice_note_drafts.find({"business_id": business_id}).sort("created_at", -1).limit(100).to_list(length=100)
    return {"success": True, "items": _cv_top_docs(rows)}

@api_router.get("/trade-presets")
async def churvox_trade_presets():
    presets = [
        {"id": "lawn_care", "name": "Lawn Care", "job_types": ["Mow", "Edge", "Hedge trim", "Spray weeds"], "invoice_line": "Lawn and grounds maintenance completed."},
        {"id": "cleaning", "name": "Cleaning", "job_types": ["General clean", "Deep clean", "Window clean", "End of tenancy"], "invoice_line": "Cleaning service completed."},
        {"id": "handyman", "name": "Handyman", "job_types": ["Repair", "Install", "Maintenance", "Inspection"], "invoice_line": "Handyman maintenance work completed."},
        {"id": "landscaping", "name": "Landscaping", "job_types": ["Planting", "Mulch", "Garden tidy", "Soft landscaping"], "invoice_line": "Landscaping work completed."},
        {"id": "plumbing", "name": "Plumbing", "job_types": ["Repair", "Inspection", "Install", "Maintenance"], "invoice_line": "Plumbing work completed."},
        {"id": "electrical", "name": "Electrical", "job_types": ["Repair", "Install", "Inspection", "Maintenance"], "invoice_line": "Electrical work completed."},
        {"id": "pest_control", "name": "Pest Control", "job_types": ["Treatment", "Inspection", "Follow-up", "Prevention"], "invoice_line": "Pest control service completed."},
    ]
    return {"success": True, "presets": presets}

@api_router.get("/dispatch/board")
async def churvox_dispatch_board(current_user: dict = Depends(get_current_user)):
    business_id = _cv_top_business_id(current_user)
    jobs = await db.jobs.find({"business_id": business_id}).sort("created_at", -1).limit(500).to_list(length=500)
    lanes = {
        "unassigned": [],
        "assigned": [],
        "in_progress": [],
        "completed": [],
        "needs_review": [],
        "ready_to_invoice": [],
    }
    for job in _cv_top_docs(jobs):
        status = _cv_top_str(job.get("status")).lower()
        if job.get("owner_review_status") in {"ready_for_review", "reopened"} or job.get("work_review_status") in {"ready_for_review", "reopened"}:
            lanes["needs_review"].append(job)
        elif job.get("invoice_prepared") or job.get("draft_invoice_id") or job.get("invoice_id"):
            lanes["ready_to_invoice"].append(job)
        elif status in {"completed", "complete", "done"} or job.get("completed_at"):
            lanes["completed"].append(job)
        elif status in {"in_progress", "in progress", "started", "paused"}:
            lanes["in_progress"].append(job)
        elif job.get("assigned_worker_id") or job.get("assigned_to"):
            lanes["assigned"].append(job)
        else:
            lanes["unassigned"].append(job)
    return {"success": True, "lanes": lanes}

@api_router.post("/offline-sync")
async def churvox_offline_sync(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = _cv_top_business_id(current_user)
    now = _cv_top_now()
    actions = payload.get("actions") if isinstance(payload.get("actions"), list) else []
    saved = []
    for action in actions:
        if not isinstance(action, dict):
            continue
        row = {
            "id": _cv_top_id(),
            "business_id": business_id,
            "worker_id": _cv_top_owner_id(current_user),
            "action_type": action.get("type") or "offline_action",
            "payload": action,
            "status": "queued",
            "created_at": now,
            "updated_at": now,
        }
        await db.offline_sync_queue.insert_one(row)
        saved.append(_cv_top_doc(row))
    return {"success": True, "queued": len(saved), "items": saved}




# CHURVOX_CHECKOUT_POST_405_FIX_20260601
# Hard-register checkout POST routes so /api/billing/unified-checkout never returns 405.
CHURVOX_STRIPE_ITEMS_405_FIX = {
    "plans": {
        "solo": {"name": "Churvox Start", "amount": 3900, "interval": "month", "price_env": ["STRIPE_PRICE_START", "STRIPE_PRICE_SOLO"]},
        "team": {"name": "Churvox Crew", "amount": 8900, "interval": "month", "price_env": ["STRIPE_PRICE_CREW", "STRIPE_PRICE_TEAM"]},
        "pro": {"name": "Churvox Operator", "amount": 14900, "interval": "month", "price_env": ["STRIPE_PRICE_OPERATOR", "STRIPE_PRICE_PRO"]},
        "enterprise": {"name": "Churvox Command", "amount": 29900, "interval": "month", "price_env": ["STRIPE_PRICE_COMMAND", "STRIPE_PRICE_ENTERPRISE"]},
    },
    "addons": {
        "command_growth_pack": {"name": "Churvox Command Growth Pack", "amount": 9900, "interval": "month", "price_env": ["STRIPE_PRICE_COMMAND_GROWTH_PACK", "STRIPE_PRICE_GROWTH_PACK"]},
        "myob_addon": {"name": "Churvox MYOB add-on", "amount": 3900, "interval": "month", "price_env": ["STRIPE_PRICE_MYOB_ADDON"]},
    },
    "sms": {
        "sms_100": {"name": "Churvox 100 SMS credits", "amount": 1000, "credits": 100, "price_env": ["STRIPE_PRICE_SMS_100"]},
        "sms_500": {"name": "Churvox 500 SMS credits", "amount": 4500, "credits": 500, "price_env": ["STRIPE_PRICE_SMS_500"]},
        "sms_1000": {"name": "Churvox 1000 SMS credits", "amount": 8000, "credits": 1000, "price_env": ["STRIPE_PRICE_SMS_1000"]},
    },
}

def _cvx405_text(v):
    return str(v or "").strip()

def _cvx405_stripe_secret():
    return (
        os.environ.get("STRIPE_SECRET_KEY")
        or os.environ.get("STRIPE_API_KEY")
        or os.environ.get("STRIPE_SK")
        or ""
    ).strip()

def _cvx405_frontend_url():
    return (
        os.environ.get("FRONTEND_URL")
        or os.environ.get("PUBLIC_APP_URL")
        or os.environ.get("APP_URL")
        or "https://www.churvox.com"
    ).strip().rstrip("/")

def _cvx405_price_id(item):
    for env_key in item.get("price_env", []):
        val = os.environ.get(env_key, "").strip()
        if val:
            return val
    return ""

def _cvx405_pick_item(payload):
    payload = payload or {}
    checkout_type = _cvx405_text(payload.get("checkout_type") or payload.get("type")).lower()
    plan_type = _cvx405_text(payload.get("plan_type") or payload.get("plan") or payload.get("plan_key")).lower()
    addon_type = _cvx405_text(payload.get("addon_type") or payload.get("addon")).lower()
    sms_pack = _cvx405_text(payload.get("sms_pack") or payload.get("sms_pack_id") or payload.get("pack") or payload.get("credits")).lower()

    plan_alias = {
        "start": "solo",
        "solo": "solo",
        "crew": "team",
        "team": "team",
        "operator": "pro",
        "pro": "pro",
        "command": "enterprise",
        "enterprise": "enterprise",
    }

    if checkout_type in {"sms", "sms_pack", "sms_credits"} or sms_pack:
        sms_key = str(sms_pack).replace(",", "").replace(" ", "").lower()
        sms_key = {"100": "sms_100", "sms100": "sms_100", "sms_100": "sms_100", "500": "sms_500", "sms500": "sms_500", "sms_500": "sms_500", "1000": "sms_1000", "sms1000": "sms_1000", "sms_1000": "sms_1000"}.get(sms_key, sms_key)
        item = CHURVOX_STRIPE_ITEMS_405_FIX["sms"].get(sms_key)
        if not item:
            raise HTTPException(status_code=400, detail="Unknown SMS credit pack.")
        return "sms", sms_key, item

    if checkout_type in {"growth_pack", "addon", "myob_addon"} or addon_type:
        addon_key = addon_type or checkout_type
        if addon_key in {"growth", "growth_pack", "command_growth", "command_growth_pack", "blocks", "block"}:
            addon_key = "command_growth_pack"
        if addon_key in {"myob", "myob_addon", "myob-sync"}:
            addon_key = "myob_addon"
        item = CHURVOX_STRIPE_ITEMS_405_FIX["addons"].get(addon_key)
        if not item:
            raise HTTPException(status_code=400, detail="Unknown add-on.")
        return addon_key, addon_key, item

    plan_key = plan_alias.get(plan_type, plan_type)
    item = CHURVOX_STRIPE_ITEMS_405_FIX["plans"].get(plan_key)
    if not item:
        raise HTTPException(status_code=400, detail="Unknown plan.")
    return "plan", plan_key, item

def _cvx405_success_url(payload, item_key):
    base = _cvx405_frontend_url()
    raw = _cvx405_text((payload or {}).get("success_path")) or f"/plans?checkout=success&item={item_key}"
    sep = "&" if "?" in raw else "?"
    if "session_id=" not in raw:
        raw = f"{raw}{sep}session_id={{CHECKOUT_SESSION_ID}}"
    return raw if raw.startswith("http") else f"{base}{raw}"

def _cvx405_cancel_url(payload, item_key):
    base = _cvx405_frontend_url()
    raw = _cvx405_text((payload or {}).get("cancel_path")) or f"/plans?checkout=cancelled&item={item_key}"
    return raw if raw.startswith("http") else f"{base}{raw}"

async def _cvx405_create_checkout(payload: dict, current_user: dict):
    import urllib.parse
    import urllib.request
    import urllib.error

    secret = _cvx405_stripe_secret()
    if not secret:
        raise HTTPException(status_code=503, detail="Stripe is not configured yet. Add STRIPE_SECRET_KEY in Render.")

    checkout_type, item_key, item = _cvx405_pick_item(payload or {})
    business_id = str(await get_user_business_id(current_user))
    user_id = _cvx405_text(current_user.get("id") or current_user.get("_id"))
    email = _cvx405_text(current_user.get("email"))
    mode = "payment" if checkout_type == "sms" else "subscription"

    try:
        quantity = max(1, min(int((payload or {}).get("quantity") or 1), 50))
    except Exception:
        quantity = 1

    fields = [
        ("mode", mode),
        ("success_url", _cvx405_success_url(payload, item_key)),
        ("cancel_url", _cvx405_cancel_url(payload, item_key)),
        ("client_reference_id", business_id),
        ("allow_promotion_codes", "true"),
        ("line_items[0][quantity]", str(quantity)),
        ("metadata[checkout_type]", checkout_type),
        ("metadata[item_key]", item_key),
        ("metadata[business_id]", business_id),
        ("metadata[user_id]", user_id),
        ("metadata[user_email]", email),
    ]

    if email:
        fields.append(("customer_email", email))

    if checkout_type == "plan":
        fields.extend([
            ("metadata[plan_type]", item_key),
            ("subscription_data[metadata][plan_type]", item_key),
            ("subscription_data[metadata][business_id]", business_id),
            ("subscription_data[metadata][checkout_type]", "plan"),
        ])

    if checkout_type in {"command_growth_pack", "myob_addon"}:
        fields.extend([
            ("metadata[addon_type]", item_key),
            ("subscription_data[metadata][addon_type]", item_key),
            ("subscription_data[metadata][business_id]", business_id),
            ("subscription_data[metadata][checkout_type]", checkout_type),
        ])

    if checkout_type == "sms":
        fields.extend([
            ("metadata[sms_pack]", item_key),
            ("metadata[credits]", str(item.get("credits") or "")),
        ])

    price_id = _cvx405_price_id(item)
    if price_id:
        fields.append(("line_items[0][price]", price_id))
    else:
        fields.extend([
            ("line_items[0][price_data][currency]", "nzd"),
            ("line_items[0][price_data][unit_amount]", str(int(item["amount"]))),
            ("line_items[0][price_data][product_data][name]", item["name"]),
        ])
        if mode == "subscription":
            fields.append(("line_items[0][price_data][recurring][interval]", item.get("interval") or "month"))

    req = urllib.request.Request(
        "https://api.stripe.com/v1/checkout/sessions",
        data=urllib.parse.urlencode(fields).encode("utf-8"),
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(body).get("error", {}).get("message") or body
        except Exception:
            detail = body
        raise HTTPException(status_code=400, detail=f"Stripe checkout failed: {detail}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Stripe checkout error: {exc}")

    session_id = data.get("id")
    checkout_url = data.get("url")
    if not checkout_url:
        raise HTTPException(status_code=500, detail="Stripe did not return a checkout URL.")

    try:
        await db.checkout_sessions.update_one(
            {"stripe_session_id": session_id},
            {"$set": {
                "stripe_session_id": session_id,
                "business_id": business_id,
                "user_id": user_id,
                "user_email": email,
                "checkout_type": checkout_type,
                "item_key": item_key,
                "mode": mode,
                "amount_cents": int(item.get("amount") or 0),
                "credits": int(item.get("credits") or 0),
                "quantity": quantity,
                "status": "created",
                "checkout_url": checkout_url,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
    except Exception:
        pass

    return {"success": True, "checkout_url": checkout_url, "url": checkout_url, "session_id": session_id, "checkout_type": checkout_type, "item_key": item_key}

async def _cvx405_confirm_checkout(payload: dict, current_user: dict):
    session_id = _cvx405_text((payload or {}).get("session_id"))
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required.")

    business_id = str(await get_user_business_id(current_user))
    session = None
    try:
        session = await db.checkout_sessions.find_one({"stripe_session_id": session_id, "business_id": business_id})
    except Exception:
        session = None

    checkout_type = _cvx405_text((session or {}).get("checkout_type"))
    item_key = _cvx405_text((session or {}).get("item_key"))
    credits = int((session or {}).get("credits") or 0)

    now = datetime.now(timezone.utc)

    if checkout_type == "plan" and item_key:
        plan_value = item_key
        try:
            query = {"$or": [{"id": str(current_user.get("id") or "")}, {"email": current_user.get("email")}]}
            if ObjectId.is_valid(str(current_user.get("_id") or current_user.get("id") or "")):
                query["$or"].append({"_id": ObjectId(str(current_user.get("_id") or current_user.get("id")))})
            await db.users.update_one(query, {"$set": {"plan": plan_value, "selected_plan": plan_value, "plan_status": "active", "subscription_status": "active", "updated_at": now}})
        except Exception:
            pass

    if checkout_type == "sms" and credits:
        try:
            await db.sms_balance.update_one({"business_id": business_id}, {"$inc": {"balance": credits}, "$set": {"updated_at": now}}, upsert=True)
            await db.sms_credits.update_one({"business_id": business_id}, {"$inc": {"credits": credits}, "$set": {"updated_at": now}}, upsert=True)
        except Exception:
            pass

    if checkout_type in {"command_growth_pack", "myob_addon"}:
        try:
            await db.business_settings.update_one(
                {"business_id": business_id},
                {"$set": {checkout_type: True, f"{checkout_type}_active": True, "updated_at": now}},
                upsert=True,
            )
        except Exception:
            pass

    try:
        await db.checkout_sessions.update_one({"stripe_session_id": session_id}, {"$set": {"status": "confirmed", "confirmed_at": now, "updated_at": now}})
    except Exception:
        pass

    return {"success": True, "confirmed": True, "checkout_type": checkout_type, "item_key": item_key, "credits": credits}

# Router-prefixed routes.
@api_router.post("/billing/unified-checkout")
async def churvox_405_billing_unified_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    return await _cvx405_create_checkout(payload or {}, current_user)

@api_router.post("/billing/create-checkout")
async def churvox_405_billing_create_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    return await _cvx405_create_checkout(payload or {}, current_user)

@api_router.post("/stripe/create-checkout-session")
async def churvox_405_stripe_checkout_alias(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    return await _cvx405_create_checkout(payload or {}, current_user)

@api_router.post("/billing/addons/checkout")
async def churvox_405_addon_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    body = dict(payload or {})
    if not body.get("checkout_type"):
        body["checkout_type"] = body.get("addon_type") or body.get("addon") or "addon"
    return await _cvx405_create_checkout(body, current_user)

@api_router.post("/billing/sms-checkout")
async def churvox_405_sms_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    body = dict(payload or {})
    body["checkout_type"] = "sms"
    return await _cvx405_create_checkout(body, current_user)

@api_router.post("/sms/buy-credits")
async def churvox_405_sms_buy_credits(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    body = dict(payload or {})
    body["checkout_type"] = "sms"
    return await _cvx405_create_checkout(body, current_user)

@api_router.post("/billing/confirm-checkout")
async def churvox_405_confirm_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    return await _cvx405_confirm_checkout(payload or {}, current_user)

# Direct /api routes too. This fixes cases where the router was already included before this patch.
@app.post("/api/billing/unified-checkout")
async def churvox_405_direct_billing_unified_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    return await _cvx405_create_checkout(payload or {}, current_user)

@app.post("/api/billing/create-checkout")
async def churvox_405_direct_billing_create_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    return await _cvx405_create_checkout(payload or {}, current_user)

@app.post("/api/stripe/create-checkout-session")
async def churvox_405_direct_stripe_checkout_alias(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    return await _cvx405_create_checkout(payload or {}, current_user)

@app.post("/api/billing/addons/checkout")
async def churvox_405_direct_addon_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    body = dict(payload or {})
    if not body.get("checkout_type"):
        body["checkout_type"] = body.get("addon_type") or body.get("addon") or "addon"
    return await _cvx405_create_checkout(body, current_user)

@app.post("/api/billing/sms-checkout")
async def churvox_405_direct_sms_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    body = dict(payload or {})
    body["checkout_type"] = "sms"
    return await _cvx405_create_checkout(body, current_user)

@app.post("/api/sms/buy-credits")
async def churvox_405_direct_sms_buy_credits(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    body = dict(payload or {})
    body["checkout_type"] = "sms"
    return await _cvx405_create_checkout(body, current_user)

@app.post("/api/billing/confirm-checkout")
async def churvox_405_direct_confirm_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    return await _cvx405_confirm_checkout(payload or {}, current_user)




# CHURVOX_AUDIT_DIRECT_ROUTE_FIX_20260531
# Some late api_router routes were defined after include_router, so they existed in source
# but were not copied into the mounted /api router. These direct /api wrappers make
# demo, notifications, billing confidence and launch proof routes live.
@app.get("/api/demo/status")
async def churvox_direct_demo_status(current_user: dict = Depends(get_current_user)):
    return await get_launch_demo_status(current_user)

@app.post("/api/demo/seed")
async def churvox_direct_demo_seed(current_user: dict = Depends(get_current_user)):
    return await seed_launch_demo_business(current_user)

@app.post("/api/demo/clear")
async def churvox_direct_demo_clear(current_user: dict = Depends(get_current_user)):
    return await clear_launch_demo_business(current_user)

@app.get("/api/notifications/workspace")
async def churvox_direct_notifications_workspace(current_user: dict = Depends(get_current_user)):
    return await get_launch_notifications_workspace(current_user)

@app.post("/api/notifications/test")
async def churvox_direct_notifications_test(current_user: dict = Depends(get_current_user)):
    return await create_launch_test_notification(current_user)

@app.post("/api/notifications/{notification_id}/read")
async def churvox_direct_notifications_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    return await mark_launch_notification_read(notification_id, current_user)

@app.get("/api/billing/confidence")
async def churvox_direct_billing_confidence(current_user: dict = Depends(get_current_user)):
    return await get_launch_billing_confidence(current_user)

@app.get("/api/launch/sales-polish")
async def churvox_direct_launch_sales_polish():
    return await get_launch_sales_polish()

@app.get("/api/launch/integration-proof")
async def churvox_direct_launch_integration_proof(current_user: dict = Depends(get_current_user)):
    return await get_launch_integration_proof(current_user)

@app.get("/api/launch/ops")
async def churvox_direct_launch_ops(current_user: dict = Depends(get_current_user)):
    return await get_launch_ops(current_user)

@app.get("/api/launch/backup-recovery")
async def churvox_direct_launch_backup_recovery(current_user: dict = Depends(get_current_user)):
    return await get_launch_backup_recovery(current_user)

@app.get("/api/launch/polish-checklist")
async def churvox_direct_launch_polish_checklist(current_user: dict = Depends(get_current_user)):
    return await get_launch_polish_checklist(current_user)



# CHURVOX_DIRECT_AI_SLIPS_START
# One real AI approval-slip system. Directly registered in server.py.
# No sitecustomize/import-hook route tricks.

AI_SLIP_DONE_STATUSES = {"completed", "approved", "executed", "rejected", "dismissed", "cancelled", "canceled"}
AI_SLIP_OWNER_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "office admin", "business_owner", "platform_owner"}

def _ai_slip_text(value, fallback=""):
    return str(value or fallback or "").strip()

def _ai_slip_status(value):
    return _ai_slip_text(value).lower().replace(" ", "_").replace("-", "_")

def _ai_slip_money(value):
    try:
        if isinstance(value, str):
            value = value.replace("$", "").replace(",", "").replace("NZD", "").strip()
        return float(value or 0)
    except Exception:
        return 0.0

def _ai_slip_money_text(value):
    amount = _ai_slip_money(value)
    return f"${amount:,.2f}" if amount else ""

def _ai_slip_id(doc):
    if not doc:
        return ""
    return str(doc.get("_id") or doc.get("id") or doc.get("job_id") or doc.get("quote_id") or doc.get("invoice_id") or "")

def _ai_slip_safe_doc(doc):
    if not isinstance(doc, dict):
        return doc
    out = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = str(v)
        elif hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        elif isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, dict):
            out[k] = _ai_slip_safe_doc(v)
        elif isinstance(v, list):
            out[k] = [_ai_slip_safe_doc(x) if isinstance(x, dict) else (str(x) if isinstance(x, ObjectId) else x) for x in v]
        else:
            out[k] = v
    return out

def _ai_slip_safe_docs(rows):
    return [_ai_slip_safe_doc(r) for r in rows]

def _ai_slip_now():
    return datetime.now(timezone.utc)

def _ai_slip_role_ok(current_user):
    role = _ai_slip_text((current_user or {}).get("role")).lower()
    email = _ai_slip_text((current_user or {}).get("email")).lower()
    return role in AI_SLIP_OWNER_ROLES or email == "hello@churvox.com" or current_user.get("is_platform_owner") is True or current_user.get("is_admin") is True

def _ai_slip_require_owner(current_user):
    if not _ai_slip_role_ok(current_user):
        raise HTTPException(status_code=403, detail="Owner approval required")

def _ai_slip_oid_query(record_id):
    rid = str(record_id or "").strip()
    ors = [
        {"id": rid},
        {"job_id": rid},
        {"quote_id": rid},
        {"invoice_id": rid},
        {"client_id": rid},
    ]
    try:
        if ObjectId.is_valid(rid):
            ors.insert(0, {"_id": ObjectId(rid)})
    except Exception:
        pass
    return {"$or": ors}

async def _ai_slip_business_id(current_user):
    try:
        bid = await get_user_business_id(current_user)
        if bid:
            return str(bid)
    except Exception:
        pass
    return str(
        (current_user or {}).get("business_id")
        or (current_user or {}).get("businessId")
        or (current_user or {}).get("id")
        or (current_user or {}).get("_id")
        or (current_user or {}).get("user_id")
        or ""
    )

def _ai_slip_scope_query(business_id, current_user):
    vals = []
    for raw in [
        business_id,
        (current_user or {}).get("business_id"),
        (current_user or {}).get("businessId"),
        (current_user or {}).get("id"),
        (current_user or {}).get("_id"),
        (current_user or {}).get("user_id"),
        (current_user or {}).get("owner_id"),
    ]:
        if raw is None or str(raw).strip() == "":
            continue
        vals.append(str(raw))
        try:
            if ObjectId.is_valid(str(raw)):
                vals.append(ObjectId(str(raw)))
        except Exception:
            pass

    dedup = []
    for v in vals:
        if v not in dedup:
            dedup.append(v)

    ors = []
    for key in ["business_id", "businessId", "owner_id", "ownerId", "user_id", "created_by", "created_by_user_id", "employer_id", "account_id"]:
        for v in dedup:
            ors.append({key: v})

    email = _ai_slip_text((current_user or {}).get("email")).lower()
    if email:
        ors += [{"owner_email": email}, {"created_by_email": email}]

    return {"$or": ors} if ors else {"business_id": str(business_id)}

async def _ai_slip_find_many(collection_name, business_id, current_user, limit=500):
    coll = getattr(db, collection_name)
    attempts = []

    attempts.append(("scoped", _ai_slip_scope_query(business_id, current_user)))
    attempts.append(("missing_scope", {
        "$or": [
            {"business_id": {"$exists": False}},
            {"business_id": None},
            {"business_id": ""},
            {"owner_id": {"$exists": False}},
            {"owner_id": None},
            {"owner_id": ""},
        ]
    }))

    if _ai_slip_role_ok(current_user):
        attempts.append(("owner_rescue_all", {}))

    for mode, query in attempts:
        try:
            rows = await coll.find(query).sort("updated_at", -1).to_list(length=limit)
        except Exception:
            rows = []
        if rows:
            return rows, mode

    return [], "none"

async def _ai_slip_find_client(business_id, current_user, client_id=None, name=None, email=None):
    bases = []
    if client_id:
        bases.append(_ai_slip_oid_query(client_id))
    if name:
        bases.append({"$or": [{"name": name}, {"client_name": name}, {"customer_name": name}]})
    if email:
        bases.append({"$or": [{"email": email}, {"customer_email": email}, {"client_email": email}]})

    scope = _ai_slip_scope_query(business_id, current_user)
    for base in bases:
        try:
            found = await db.clients.find_one({"$and": [scope, base]})
            if found:
                return found
        except Exception:
            pass
        if _ai_slip_role_ok(current_user):
            try:
                found = await db.clients.find_one(base)
                if found:
                    return found
            except Exception:
                pass
    return {}

def _ai_slip_required(action_type):
    if action_type == "assign_worker":
        return ["job_id", "job_title", "client_name", "job_address", "worker_id"]
    if action_type == "create_invoice_draft":
        return ["job_id", "job_title", "client_name", "subtotal", "description"]
    if action_type == "send_invoice":
        return ["invoice_id", "invoice_number", "customer_name", "customer_email", "total"]
    if action_type == "invoice_reminder":
        return ["invoice_id", "invoice_number", "customer_name", "customer_email", "amount_due", "message"]
    if action_type == "quote_follow_up":
        return ["quote_id", "quote_number", "customer_name", "customer_email", "message"]
    if action_type == "job_review":
        return ["job_id", "job_title", "client_name", "worker_name"]
    return ["action_type"]

def _ai_slip_missing(action_type, payload):
    return [k for k in _ai_slip_required(action_type) if not _ai_slip_text((payload or {}).get(k))]

async def _ai_slip_insert(business_id, action_type, related_type, related_id, title, summary, payload, checks):
    missing = _ai_slip_missing(action_type, payload)
    doc = {
        "business_id": str(business_id),
        "action_type": action_type,
        "type": action_type,
        "related_type": related_type,
        "related_entity_id": str(related_id or ""),
        "related_id": str(related_id or ""),
        "title": title,
        "summary": summary,
        "payload": payload,
        "draft_payload": payload,
        "checks": checks,
        "missing": missing,
        "ready": len(missing) == 0,
        "group": "ready" if not missing else "needs_details",
        "status": "ready",
        "source": "direct_server_ai_slips_v1",
        "created_at": _ai_slip_now(),
        "updated_at": _ai_slip_now(),
    }
    result = await db.ai_operator_actions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc

async def _ai_slip_workers(business_id, current_user):
    workers = []
    seen = set()
    for collection_name in ["business_users", "users"]:
        rows, _mode = await _ai_slip_find_many(collection_name, business_id, current_user, 500)
        for user in rows:
            role = _ai_slip_text(user.get("role")).lower()
            if role not in {"worker", "manager", "office_admin", "office admin"}:
                continue
            wid = str(user.get("_id") or user.get("id") or user.get("user_id") or user.get("email") or "")
            if not wid or wid in seen:
                continue
            seen.add(wid)
            workers.append({
                "id": wid,
                "name": _ai_slip_text(user.get("name") or user.get("full_name") or user.get("email"), "Worker"),
                "email": _ai_slip_text(user.get("email")),
                "region": _ai_slip_text(user.get("region") or user.get("area")),
                "reason": "available worker",
            })
    return workers


def _churvox_ai_invoice_description_from_job(job, client=None):
    job = job or {}
    client = client or {}

    def pick(*values, fallback=""):
        for value in values:
            text = str(value or "").strip()
            if text:
                return " ".join(text.split())
        return fallback

    client_name = pick(client.get("name"), client.get("client_name"), job.get("client_name"), job.get("customer_name"), fallback="the customer")
    title = pick(job.get("service_type"), job.get("job_type"), job.get("title"), job.get("job_title"), job.get("job_name"), fallback="service work")
    address = pick(job.get("job_address"), job.get("address"), job.get("site_address"), client.get("site_address"), client.get("address"))
    notes = pick(
        job.get("ai_invoice_description"),
        job.get("invoice_description_draft"),
        job.get("completion_notes"),
        job.get("worker_notes"),
        job.get("worker_note"),
        job.get("notes"),
        job.get("description"),
    )

    pieces = [f"{title} completed for {client_name}."]
    if address:
        pieces.append(f"Work location: {address}.")
    if notes:
        pieces.append(f"Job notes: {notes}.")
    pieces.append("Invoice prepared from the completed job record.")
    return "\\n".join(pieces)

async def _ai_slip_job_payload(business_id, current_user, job):
    client = await _ai_slip_find_client(
        business_id,
        current_user,
        client_id=job.get("client_id"),
        name=job.get("client_name") or job.get("customer_name"),
        email=job.get("client_email") or job.get("customer_email"),
    )
    jid = str(job.get("_id") or job.get("id") or job.get("job_id") or "")
    client_name = _ai_slip_text(client.get("name") or client.get("client_name") or job.get("client_name") or job.get("customer_name"), "Client not set")
    title = _ai_slip_text(job.get("title") or job.get("job_title") or job.get("service_type"), "Job")
    amount = _ai_slip_money(job.get("fixed_price") or job.get("price") or job.get("amount") or job.get("subtotal") or job.get("total"))
    description = _churvox_ai_invoice_description_from_job(job, client)
    return {
        "job_id": jid,
        "job_title": title,
        "client_id": _ai_slip_text(job.get("client_id")),
        "client_name": client_name,
        "customer_name": client_name,
        "customer_email": _ai_slip_text(client.get("email") or job.get("client_email") or job.get("customer_email")),
        "client_phone": _ai_slip_text(client.get("phone") or client.get("mobile") or job.get("client_phone")),
        "client_address": _ai_slip_text(client.get("address") or client.get("billing_address")),
        "job_address": _ai_slip_text(job.get("address") or job.get("job_address") or client.get("address")),
        "worker_id": _ai_slip_text(job.get("assigned_worker_id") or job.get("worker_id")),
        "worker_name": _ai_slip_text(job.get("assigned_worker_name") or job.get("worker_name")),
        "subtotal": amount if amount else "",
        "price": _ai_slip_money_text(amount),
        "description": description,
        "message": f"{title} for {client_name} is ready for review.",
        "proof_summary": "Proof/photo check available from job record.",
    }

async def _ai_slip_rebuild(business_id, current_user):
    # Clear all old weak AI slip queue records for this owner/admin so duplicates stop.
    clear_query = {
        "status": {"$nin": list(AI_SLIP_DONE_STATUSES)},
        "$or": [
            {"business_id": str(business_id)},
            {"source": {"$exists": False}},
            {"source": {"$regex": "operator|slip|deep|strong|legacy|direct_server_ai_slips", "$options": "i"}},
        ],
    }
    await db.ai_operator_actions.delete_many(clear_query)

    jobs, jobs_mode = await _ai_slip_find_many("jobs", business_id, current_user)
    quotes, quotes_mode = await _ai_slip_find_many("quotes", business_id, current_user)
    invoices, invoices_mode = await _ai_slip_find_many("invoices", business_id, current_user)

    actions = []
    workers = await _ai_slip_workers(business_id, current_user)

    for job in jobs:
        jid = str(job.get("_id") or job.get("id") or job.get("job_id") or "")
        if not jid:
            continue
        st = _ai_slip_status(job.get("status") or job.get("job_status") or job.get("workflow_status"))
        p = await _ai_slip_job_payload(business_id, current_user, job)
        assigned = _ai_slip_text(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_worker_name") or job.get("worker_name"))

        if st in {"completed", "done", "complete"} or job.get("completed_at") or job.get("completed") is True:
            actions.append(await _ai_slip_insert(
                business_id, "job_review", "job", jid,
                f"Review completed job: {p['job_title']}",
                f"{p['client_name']} · {p['job_title']} · {p.get('price') or 'No price'}",
                p,
                ["Client pulled", "Job pulled", "Completion checked", "Owner approval required"],
            ))
            actions.append(await _ai_slip_insert(
                business_id, "create_invoice_draft", "job", jid,
                f"Create invoice for {p['client_name']}",
                f"{p['client_name']} · {p['job_title']} · {p.get('price') or 'Missing price'}",
                p,
                ["Client pulled", "Job pulled", "Invoice description prepared", "Owner approval required"],
            ))
        elif not assigned:
            rec = workers[0] if workers else {}
            p2 = {
                **p,
                "available_workers": workers,
                "worker_id": _ai_slip_text(rec.get("id")),
                "recommended_worker_name": _ai_slip_text(rec.get("name"), "No worker available"),
                "conflict_check": _ai_slip_text(rec.get("reason"), "No worker found"),
                "message": f"You have been assigned {p['job_title']} for {p['client_name']}.",
            }
            actions.append(await _ai_slip_insert(
                business_id, "assign_worker", "job", jid,
                f"Assign worker for {p['job_title']}",
                f"{p['client_name']} · {p['job_title']} · {p.get('job_address') or 'No address'}",
                p2,
                ["Client pulled", "Job pulled", "Worker options checked", "Owner can change worker"],
            ))

    for quote in quotes:
        qid = str(quote.get("_id") or quote.get("id") or quote.get("quote_id") or "")
        if not qid or _ai_slip_status(quote.get("status")) in {"accepted", "declined", "cancelled", "canceled", "paid"}:
            continue
        client = await _ai_slip_find_client(
            business_id,
            current_user,
            client_id=quote.get("client_id"),
            name=quote.get("client_name") or quote.get("customer_name"),
            email=quote.get("customer_email") or quote.get("client_email"),
        )
        cname = _ai_slip_text(client.get("name") or quote.get("client_name") or quote.get("customer_name"), "Client")
        qno = _ai_slip_text(quote.get("quote_number") or quote.get("number"), f"Quote {qid[-6:]}")
        amount = _ai_slip_money_text(quote.get("total") or quote.get("amount") or quote.get("subtotal"))
        email = _ai_slip_text(client.get("email") or quote.get("customer_email") or quote.get("client_email"))
        payload = {
            "quote_id": qid,
            "quote_number": qno,
            "customer_name": cname,
            "client_name": cname,
            "customer_email": email,
            "client_phone": _ai_slip_text(client.get("phone") or client.get("mobile")),
            "quote_amount": amount,
            "message": f"Hi {cname}, just checking in on {qno}{f' for {amount}' if amount else ''}. Happy to answer any questions.",
        }
        actions.append(await _ai_slip_insert(
            business_id, "quote_follow_up", "quote", qid,
            f"Follow up quote with {cname}",
            f"{qno} · {cname} · {amount or 'No amount'} · {email or 'Missing email'}",
            payload,
            ["Quote pulled", "Client pulled", "Message drafted", "Owner approval required"],
        ))

    for inv in invoices:
        iid = str(inv.get("_id") or inv.get("id") or inv.get("invoice_id") or "")
        if not iid or _ai_slip_status(inv.get("status")) in {"paid", "void", "cancelled", "canceled"}:
            continue
        client = await _ai_slip_find_client(
            business_id,
            current_user,
            client_id=inv.get("client_id"),
            name=inv.get("client_name") or inv.get("customer_name"),
            email=inv.get("customer_email") or inv.get("client_email"),
        )
        cname = _ai_slip_text(inv.get("customer_name") or inv.get("client_name") or client.get("name"), "Client")
        ino = _ai_slip_text(inv.get("invoice_number") or inv.get("number"), f"Invoice {iid[-6:]}")
        total = _ai_slip_money_text(inv.get("total") or inv.get("amount") or inv.get("subtotal"))
        email = _ai_slip_text(inv.get("customer_email") or inv.get("client_email") or client.get("email"))
        payload = {
            "invoice_id": iid,
            "invoice_number": ino,
            "customer_name": cname,
            "client_name": cname,
            "customer_email": email,
            "total": total,
            "amount_due": total,
            "message": f"Hi {cname}, your invoice {ino}{f' for {total}' if total else ''} is ready.",
        }
        actions.append(await _ai_slip_insert(
            business_id, "send_invoice", "invoice", iid,
            f"Email invoice {ino} to {cname}",
            f"{ino} · {cname} · {total or 'No total'} · {email or 'Missing email'}",
            payload,
            ["Invoice pulled", "Client pulled", "Message drafted", "Owner approval required"],
        ))

    report = {
        "jobs_found": len(jobs),
        "quotes_found": len(quotes),
        "invoices_found": len(invoices),
        "jobs_scope_mode": jobs_mode,
        "quotes_scope_mode": quotes_mode,
        "invoices_scope_mode": invoices_mode,
        "slips_created": len(actions),
    }
    await db.ai_operator_rebuild_reports.insert_one({
        "business_id": str(business_id),
        "report": report,
        "created_at": _ai_slip_now(),
    })
    return actions, report

async def _ai_slip_list_or_rebuild(business_id, current_user):
    rows = await db.ai_operator_actions.find({
        "business_id": str(business_id),
        "source": "direct_server_ai_slips_v1",
        "status": {"$nin": list(AI_SLIP_DONE_STATUSES)},
    }).sort("updated_at", -1).to_list(length=100)

    if rows:
        report = await db.ai_operator_rebuild_reports.find_one({"business_id": str(business_id)}, sort=[("created_at", -1)])
        return rows, (report or {}).get("report") or {}

    return await _ai_slip_rebuild(business_id, current_user)

@api_router.get("/ai/operator/slips")
async def ai_operator_slips_direct(current_user: dict = Depends(get_current_user)):
    _ai_slip_require_owner(current_user)
    business_id = await _ai_slip_business_id(current_user)
    rows, report = await _ai_slip_list_or_rebuild(business_id, current_user)
    return {
        "success": True,
        "data": _ai_slip_safe_docs(rows),
        "actions": _ai_slip_safe_docs(rows),
        "report": _ai_slip_safe_doc(report),
    }

@api_router.post("/ai/operator/rebuild-slips")
async def ai_operator_rebuild_slips_direct(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    _ai_slip_require_owner(current_user)
    business_id = await _ai_slip_business_id(current_user)
    rows, report = await _ai_slip_rebuild(business_id, current_user)
    return {
        "success": True,
        "created": len(rows),
        "data": _ai_slip_safe_docs(rows),
        "actions": _ai_slip_safe_docs(rows),
        "report": _ai_slip_safe_doc(report),
    }

@api_router.patch("/ai/operator/slips/{action_id}")
async def ai_operator_update_slip_direct(action_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    _ai_slip_require_owner(current_user)
    business_id = await _ai_slip_business_id(current_user)
    found = await db.ai_operator_actions.find_one({"business_id": str(business_id), **_ai_slip_oid_query(action_id)})
    if not found:
        raise HTTPException(status_code=404, detail="Slip not found")

    action_type = found.get("action_type") or found.get("type")
    merged = {**(found.get("payload") or {}), **(payload or {})}
    merged.setdefault("business_id", str(business_id))
    missing = _ai_slip_missing(action_type, merged)

    await db.ai_operator_actions.update_one(
        {"_id": found["_id"]},
        {"$set": {
            "payload": merged,
            "draft_payload": merged,
            "missing": missing,
            "ready": len(missing) == 0,
            "group": "ready" if not missing else "needs_details",
            "updated_at": _ai_slip_now(),
        }},
    )
    updated = await db.ai_operator_actions.find_one({"_id": found["_id"]})
    return {"success": True, "data": _ai_slip_safe_doc(updated), "action": _ai_slip_safe_doc(updated)}



def _ai_slip_pdf_text(value, fallback=""):
    try:
        return _ai_slip_text(value, fallback)
    except Exception:
        return str(value or fallback or "").strip()

def _ai_slip_pdf_escape(value):
    text = _ai_slip_pdf_text(value)
    return (
        text.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace("\r", " ")
        .replace("\n", " ")
    )

def _ai_slip_make_pdf_bytes(title, lines):
    import textwrap

    safe_lines = []
    for line in lines:
        raw = _ai_slip_pdf_text(line)
        if not raw:
            continue
        wrapped = textwrap.wrap(raw, width=82) or [raw]
        safe_lines.extend(wrapped)

    ops = [
        "BT",
        "/F1 22 Tf",
        "50 760 Td",
        f"({_ai_slip_pdf_escape(title)}) Tj",
        "/F1 11 Tf",
    ]

    y_lines = 0
    for line in safe_lines:
        y_lines += 1
        if y_lines > 34:
            break
        ops.append("0 -20 Td")
        ops.append(f"({_ai_slip_pdf_escape(line)}) Tj")

    ops.append("ET")
    stream = "\n".join(ops).encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    pdf = b"%PDF-1.4\n"
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"

    xref = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n".encode()
    pdf += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        pdf += f"{off:010d} 00000 n \n".encode()
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return pdf

def _ai_slip_build_pdf_attachment(action_type, payload, branding=None):
    return _churvox_real_invoice_attachment(action_type, payload or {}, branding or {})


# CHURVOX_REAL_INVOICE_PDF_TEMPLATE_START
def _churvox_pdf_txt(value, fallback=""):
    try:
        return _ai_slip_text(value, fallback)
    except Exception:
        return str(value or fallback or "").strip()

def _churvox_pdf_money(value):
    raw = _churvox_pdf_txt(value)
    if not raw:
        return ""
    if raw.startswith("$"):
        return raw
    try:
        amount = _ai_slip_money(raw)
        return f"${amount:,.2f}" if amount else raw
    except Exception:
        return raw

async def _churvox_invoice_branding(business_id=None):
    business_id = _churvox_pdf_txt(business_id)
    settings = {}
    if business_id:
        try:
            settings = await db.business_document_settings.find_one({"business_id": business_id}) or {}
        except Exception:
            settings = {}

    return {
        "business_name": _churvox_pdf_txt(settings.get("business_name"), "Churvox"),
        "trading_name": _churvox_pdf_txt(settings.get("trading_name") or settings.get("business_name"), "Churvox"),
        "logo_base64": _churvox_pdf_txt(settings.get("logo_base64")),
        "logo_url": _churvox_pdf_txt(settings.get("logo_url")),
        "business_address": _churvox_pdf_txt(settings.get("business_address")),
        "phone": _churvox_pdf_txt(settings.get("phone")),
        "email": _churvox_pdf_txt(settings.get("email"), "hello@churvox.com"),
        "website": _churvox_pdf_txt(settings.get("website"), "www.churvox.com"),
        "gst_number": _churvox_pdf_txt(settings.get("gst_number")),
        "nzbn": _churvox_pdf_txt(settings.get("nzbn")),
        "bank_account_name": _churvox_pdf_txt(settings.get("bank_account_name")),
        "bank_account_number": _churvox_pdf_txt(settings.get("bank_account_number")),
        "payment_url": _churvox_pdf_txt(settings.get("payment_url")),
        "payment_instructions": _churvox_pdf_txt(settings.get("payment_instructions"), "Please use the invoice number as the payment reference."),
        "invoice_footer": _churvox_pdf_txt(settings.get("invoice_footer"), "Thanks for choosing us. We appreciate your business."),
    }

def _churvox_invoice_payment_url(payload, branding):
    url = _churvox_pdf_txt(
        (payload or {}).get("payment_url")
        or (payload or {}).get("payment_link")
        or (payload or {}).get("pay_now_url")
        or (payload or {}).get("invoice_url")
        or (payload or {}).get("public_url")
        or (branding or {}).get("payment_url")
    )
    if not url:
        return ""

    replacements = {
        "invoice_number": _churvox_pdf_txt((payload or {}).get("invoice_number")),
        "quote_number": _churvox_pdf_txt((payload or {}).get("quote_number")),
        "customer_email": _churvox_pdf_txt((payload or {}).get("customer_email")),
        "amount": _churvox_pdf_money((payload or {}).get("total") or (payload or {}).get("amount_due") or (payload or {}).get("quote_amount")),
    }
    for key, value in replacements.items():
        url = url.replace("{" + key + "}", value)
    return url

def _churvox_font(size=28, bold=False):
    from PIL import ImageFont
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for path in paths:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()

def _churvox_wrap(draw, text, font, width):
    text = _churvox_pdf_txt(text)
    if not text:
        return []
    words = text.split()
    lines = []
    line = ""
    for word in words:
        test = f"{line} {word}".strip()
        try:
            box = draw.textbbox((0, 0), test, font=font)
            test_width = box[2] - box[0]
        except Exception:
            test_width = len(test) * 10
        if test_width <= width or not line:
            line = test
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines

def _churvox_draw_wrap(draw, x, y, text, font, fill, width, line_height):
    for line in _churvox_wrap(draw, text, font, width):
        draw.text((x, y), line, font=font, fill=fill)
        y += line_height
    return y

def _churvox_load_logo(branding):
    try:
        import base64
        import io
        import urllib.request
        from PIL import Image

        raw = _churvox_pdf_txt((branding or {}).get("logo_base64"))
        url = _churvox_pdf_txt((branding or {}).get("logo_url"))
        data = None

        if raw:
            if raw.startswith("data:image") and "," in raw:
                raw = raw.split(",", 1)[1]
            data = base64.b64decode(raw)
        elif url.startswith("http"):
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = resp.read()

        if not data:
            return None

        img = Image.open(io.BytesIO(data)).convert("RGBA")
        img.thumbnail((290, 130))
        return img
    except Exception:
        return None

def _churvox_real_invoice_pdf_bytes(action_type, payload, branding):
    import io
    from PIL import Image, ImageDraw

    payload = payload or {}
    branding = branding or {}

    W, H = 1240, 1754
    navy = (15, 23, 42)
    panel = (20, 50, 88)
    cyan = (6, 182, 212)
    green = (22, 163, 74)
    bg = (245, 247, 241)
    white = (255, 255, 255)
    text = (15, 23, 42)
    muted = (100, 116, 139)
    line = (226, 232, 240)
    amber = (245, 158, 11)

    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)

    f10 = _churvox_font(20, True)
    f12 = _churvox_font(24, False)
    f12b = _churvox_font(24, True)
    f14 = _churvox_font(28, False)
    f14b = _churvox_font(28, True)
    f18b = _churvox_font(36, True)
    f24b = _churvox_font(48, True)
    f34b = _churvox_font(68, True)

    is_quote = action_type == "quote_follow_up"
    doc_label = "QUOTE" if is_quote else "INVOICE"

    invoice_no = _churvox_pdf_txt(payload.get("invoice_number"))
    quote_no = _churvox_pdf_txt(payload.get("quote_number"))
    doc_no = quote_no if is_quote else invoice_no
    if not doc_no:
        doc_no = _churvox_pdf_txt(payload.get("invoice_id") or payload.get("quote_id"), "DRAFT")[-8:].upper()

    business = _churvox_pdf_txt(branding.get("trading_name") or branding.get("business_name"), "Churvox")
    business_address = _churvox_pdf_txt(branding.get("business_address"))
    business_phone = _churvox_pdf_txt(branding.get("phone"))
    business_email = _churvox_pdf_txt(branding.get("email"), "hello@churvox.com")
    website = _churvox_pdf_txt(branding.get("website"))
    gst = _churvox_pdf_txt(branding.get("gst_number"))

    customer = _churvox_pdf_txt(payload.get("customer_name") or payload.get("client_name"), "Customer")
    customer_email = _churvox_pdf_txt(payload.get("customer_email"))
    customer_phone = _churvox_pdf_txt(payload.get("client_phone"))
    customer_address = _churvox_pdf_txt(payload.get("client_address") or payload.get("job_address"))

    job_title = _churvox_pdf_txt(payload.get("job_title"), "Work completed")
    description = _churvox_pdf_txt(
        payload.get("description")
        or payload.get("invoice_description")
        or payload.get("worker_note")
        or payload.get("message")
        or job_title,
        "Work completed"
    )

    subtotal = _churvox_pdf_money(payload.get("subtotal") or payload.get("price") or payload.get("amount_due") or payload.get("total") or payload.get("quote_amount"))
    total = _churvox_pdf_money(payload.get("total") or payload.get("amount_due") or payload.get("quote_amount") or payload.get("subtotal") or payload.get("price"))
    due_date = _churvox_pdf_txt(payload.get("due_date"))
    pay_url = _churvox_invoice_payment_url(payload, branding)
    bank_name = _churvox_pdf_txt(branding.get("bank_account_name"))
    bank_number = _churvox_pdf_txt(branding.get("bank_account_number"))
    payment_instructions = _churvox_pdf_txt(branding.get("payment_instructions"))
    footer = _churvox_pdf_txt(branding.get("invoice_footer"), "Thank you for your business.")

    # Header
    draw.rounded_rectangle((55, 45, W - 55, 315), radius=38, fill=navy)
    draw.text((92, 86), doc_label, font=f10, fill=(125, 211, 252))
    draw.text((92, 126), f"{doc_label} {doc_no}", font=f34b, fill=white)
    draw.text((92, 235), business, font=f14b, fill=(226, 232, 240))

    logo = _churvox_load_logo(branding)
    if logo:
        box = Image.new("RGBA", (320, 140), (255, 255, 255, 0))
        box.alpha_composite(logo, ((320 - logo.width) // 2, (140 - logo.height) // 2))
        img.paste(box.convert("RGB"), (W - 420, 90))
    else:
        draw.rounded_rectangle((W - 415, 92, W - 90, 205), radius=26, fill=white)
        draw.text((W - 380, 127), business[:24], font=f18b, fill=navy)

    # Bill to/from cards
    y = 365
    draw.rounded_rectangle((55, y, 590, y + 260), radius=30, fill=white, outline=line, width=2)
    draw.text((90, y + 35), "BILL TO", font=f10, fill=muted)
    draw.text((90, y + 76), customer, font=f18b, fill=text)
    yy = y + 128
    for item in [customer_email, customer_phone, customer_address]:
        if item:
            yy = _churvox_draw_wrap(draw, 90, yy, item, f12, muted, 440, 31)

    draw.rounded_rectangle((650, y, W - 55, y + 260), radius=30, fill=white, outline=line, width=2)
    draw.text((685, y + 35), "FROM", font=f10, fill=muted)
    draw.text((685, y + 76), business, font=f18b, fill=text)
    yy = y + 128
    for item in [business_email, business_phone, business_address, website, f"GST {gst}" if gst else ""]:
        if item:
            yy = _churvox_draw_wrap(draw, 685, yy, item, f12, muted, 440, 31)

    # Invoice table
    y = 690
    draw.rounded_rectangle((55, y, W - 55, y + 510), radius=30, fill=white, outline=line, width=2)
    draw.rounded_rectangle((90, y + 38, W - 90, y + 95), radius=18, fill=(241, 245, 249))
    draw.text((120, y + 55), "DESCRIPTION", font=f10, fill=muted)
    draw.text((W - 325, y + 55), "AMOUNT", font=f10, fill=muted)

    draw.text((120, y + 132), job_title, font=f18b, fill=text)
    _churvox_draw_wrap(draw, 120, y + 182, description, f12, muted, 720, 32)
    draw.text((W - 325, y + 132), subtotal or total or "To confirm", font=f18b, fill=text)

    draw.line((90, y + 360, W - 90, y + 360), fill=line, width=2)
    draw.text((W - 450, y + 395), "TOTAL", font=f14b, fill=muted)
    draw.text((W - 325, y + 382), total or subtotal or "To confirm", font=f24b, fill=navy)

    if due_date:
        draw.text((120, y + 400), f"Due date: {due_date}", font=f12b, fill=muted)

    # Payment box
    y = 1260
    draw.rounded_rectangle((55, y, W - 55, y + 340), radius=30, fill=panel)
    draw.text((90, y + 42), "PAYMENT", font=f10, fill=(125, 211, 252))
    draw.text((90, y + 84), "How to pay", font=f24b, fill=white)

    py = y + 158
    if pay_url:
        draw.rounded_rectangle((90, py - 15, 430, py + 64), radius=22, fill=green)
        draw.text((126, py + 5), "Pay online", font=f18b, fill=white)
        py += 96
        py = _churvox_draw_wrap(draw, 90, py, pay_url, f12, (203, 213, 225), 980, 30)

    if bank_name or bank_number:
        bank = "Bank transfer"
        if bank_name:
            bank += f" · {bank_name}"
        if bank_number:
            bank += f" · {bank_number}"
        py = _churvox_draw_wrap(draw, 90, py + 16, bank, f12b, (226, 232, 240), 980, 30)

    if payment_instructions:
        _churvox_draw_wrap(draw, 90, py + 16, payment_instructions, f12, (203, 213, 225), 980, 30)

    # Footer
    draw.text((65, H - 90), footer, font=f12b, fill=muted)
    draw.text((65, H - 55), "Prepared and sent by Churvox.", font=f10, fill=(148, 163, 184))

    buf = io.BytesIO()
    img.save(buf, format="PDF", resolution=150.0)
    return buf.getvalue()

def _churvox_real_invoice_attachment(action_type, payload, branding):
    import base64
    import re

    payload = payload or {}
    branding = branding or {}

    if action_type not in {"send_invoice", "invoice_reminder", "quote_follow_up"}:
        return None

    if action_type == "quote_follow_up":
        number = _churvox_pdf_txt(payload.get("quote_number") or payload.get("quote_id"), "quote")
        filename = f"quote-{number}.pdf"
    else:
        number = _churvox_pdf_txt(payload.get("invoice_number") or payload.get("invoice_id"), "invoice")
        filename = f"invoice-{number}.pdf"

    filename = re.sub(r"[^A-Za-z0-9_.-]+", "-", filename).strip("-") or "churvox-document.pdf"

    pdf = _churvox_real_invoice_pdf_bytes(action_type, payload, branding)
    return {
        "Name": filename,
        "Content": base64.b64encode(pdf).decode("ascii"),
        "ContentType": "application/pdf",
    }

def _churvox_real_email_html(action_type, payload, branding):
    customer = _churvox_pdf_txt((payload or {}).get("customer_name") or (payload or {}).get("client_name"), "there")
    business = _churvox_pdf_txt((branding or {}).get("trading_name") or (branding or {}).get("business_name"), "Churvox")
    logo_url = _churvox_pdf_txt((branding or {}).get("logo_url"))
    message = _churvox_pdf_txt((payload or {}).get("message"))
    amount = _churvox_pdf_txt((payload or {}).get("total") or (payload or {}).get("amount_due") or (payload or {}).get("quote_amount"))
    pay_url = _churvox_invoice_payment_url(payload, branding)

    if not message:
        if action_type == "quote_follow_up":
            message = f"Hi {customer}, just checking in on your quote."
        elif action_type == "invoice_reminder":
            message = f"Hi {customer}, friendly reminder your invoice is still open."
        else:
            message = f"Hi {customer}, your invoice is ready."

    safe = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
    logo = f'<img src="{logo_url}" alt="{business}" style="max-height:70px;max-width:220px;object-fit:contain;" />' if logo_url else f'<div style="font-size:24px;font-weight:900;color:#0f1722;">{business}</div>'
    button = f'<a href="{pay_url}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:900;border-radius:14px;padding:14px 22px;margin-top:18px;">Pay online</a>' if pay_url and action_type in {"send_invoice", "invoice_reminder"} else ""

    return f"""
    <div style="background:#f5f7f1;margin:0;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#0f1722;">
      <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:28px;overflow:hidden;">
        <div style="padding:28px;border-bottom:1px solid #e2e8f0;">{logo}</div>
        <div style="padding:30px;">
          <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:900;color:#06b6d4;">Churvox document</div>
          <h1 style="font-size:34px;line-height:1;margin:12px 0 16px;font-weight:900;color:#0f1722;">{amount or "Document ready"}</h1>
          <div style="font-size:16px;line-height:1.6;font-weight:700;color:#334155;">{safe}</div>
          {button}
          <p style="margin-top:24px;font-size:13px;line-height:1.5;color:#64748b;">A full PDF copy is attached.</p>
        </div>
        <div style="padding:18px 30px;background:#0f1722;color:#cbd5e1;font-size:12px;font-weight:700;">Sent by {business} using Churvox.</div>
      </div>
    </div>
    """
# CHURVOX_REAL_INVOICE_PDF_TEMPLATE_END


async def _ai_slip_send_customer_email(action_type, payload):
    import os
    import json
    import asyncio
    import urllib.request
    import urllib.error

    to_email = _ai_slip_text((payload or {}).get("customer_email"))
    if not to_email:
        return False, "Customer email is missing"

    token = (
        os.environ.get("POSTMARK_SERVER_TOKEN")
        or os.environ.get("POSTMARK_API_TOKEN")
        or os.environ.get("POSTMARK_TOKEN")
    )
    if not token:
        return False, "Postmark token is missing on the backend"

    from_email = (
        os.environ.get("POSTMARK_FROM_EMAIL")
        or os.environ.get("EMAIL_FROM")
        or os.environ.get("FROM_EMAIL")
        or "hello@churvox.com"
    )

    customer = _ai_slip_text(payload.get("customer_name") or payload.get("client_name"), "there")
    invoice_number = _ai_slip_text(payload.get("invoice_number"))
    quote_number = _ai_slip_text(payload.get("quote_number"))
    total = _ai_slip_text(payload.get("total") or payload.get("amount_due") or payload.get("quote_amount"))
    message = _ai_slip_text(payload.get("message"))

    if action_type == "send_invoice":
        subject = f"Invoice {invoice_number or ''} from Churvox".strip()
        default_message = f"Hi {customer}, your invoice {invoice_number}{f' for {total}' if total else ''} is ready."
    elif action_type == "invoice_reminder":
        subject = f"Payment reminder {invoice_number or ''}".strip()
        default_message = f"Hi {customer}, friendly reminder invoice {invoice_number}{f' for {total}' if total else ''} is still open."
    elif action_type == "quote_follow_up":
        subject = f"Following up on {quote_number or 'your quote'}"
        default_message = f"Hi {customer}, just checking in on {quote_number or 'your quote'}{f' for {total}' if total else ''}."
    else:
        subject = "Message from Churvox"
        default_message = f"Hi {customer}, Churvox has prepared this message."

    body = message or default_message

    link = _ai_slip_text(
        payload.get("public_url")
        or payload.get("invoice_url")
        or payload.get("payment_url")
        or payload.get("quote_url")
        or payload.get("document_url")
    )
    if link:
        body = f"{body}\n\nView here: {link}"

    html_body = _churvox_real_email_html(action_type, payload, branding)

    postmark_payload = {
        "From": from_email,
        "To": to_email,
        "Subject": subject,
        "TextBody": body,
        "HtmlBody": html_body,
        "MessageStream": "outbound",
    }

    attachment = _churvox_real_invoice_attachment(action_type, payload, branding)
    if attachment:
        postmark_payload["Attachments"] = [attachment]

    def _send():
        req = urllib.request.Request(
            "https://api.postmarkapp.com/email",
            data=json.dumps(postmark_payload).encode("utf-8"),
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": token,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                raw = resp.read().decode("utf-8")
                data = json.loads(raw or "{}")
                return True, data
        except urllib.error.HTTPError as e:
            try:
                err = e.read().decode("utf-8")
            except Exception:
                err = str(e)
            return False, err
        except Exception as e:
            return False, str(e)

    ok, result = await asyncio.to_thread(_send)
    if not ok:
        return False, f"Email send failed: {result}"

    return True, result

@api_router.post("/ai/operator/actions/{action_id}/execute")
async def ai_operator_execute_slip_direct(action_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    _ai_slip_require_owner(current_user)
    business_id = await _ai_slip_business_id(current_user)
    found = await db.ai_operator_actions.find_one({"business_id": str(business_id), **_ai_slip_oid_query(action_id)})
    if not found:
        raise HTTPException(status_code=404, detail="Slip not found")

    action_type = found.get("action_type") or found.get("type")
    merged = {**(found.get("payload") or {}), **(payload or {})}
    missing = _ai_slip_missing(action_type, merged)
    if missing:
        return {"success": False, "error": "Missing: " + ", ".join(missing), "missing": missing}

    if action_type == "assign_worker":
        jid = merged.get("job_id") or found.get("related_entity_id")
        worker_id = merged.get("worker_id")
        worker_name = merged.get("recommended_worker_name") or merged.get("worker_name") or "Assigned worker"
        if jid and worker_id:
            await db.jobs.update_one(_ai_slip_oid_query(jid), {"$set": {
                "assigned_worker_id": str(worker_id),
                "worker_id": str(worker_id),
                "assigned_worker_name": worker_name,
                "status": "assigned",
                "updated_at": _ai_slip_now(),
            }})

    elif action_type == "create_invoice_draft":
        jid = merged.get("job_id") or found.get("related_entity_id")
        existing = await db.invoices.find_one({"business_id": str(business_id), "job_id": str(jid)})
        if not existing:
            await db.invoices.insert_one({
                "business_id": str(business_id),
                "job_id": str(jid),
                "client_id": merged.get("client_id"),
                "client_name": merged.get("client_name"),
                "customer_name": merged.get("customer_name") or merged.get("client_name"),
                "customer_email": merged.get("customer_email"),
                "description": merged.get("description") or merged.get("invoice_description") or merged.get("job_title") or "Service work completed",
                "subtotal": _ai_slip_money(merged.get("subtotal") or merged.get("price")),
                "total": _ai_slip_money(merged.get("subtotal") or merged.get("price")),
                "status": "draft",
                "source": "ai_operator_approved_slip",
                "created_at": _ai_slip_now(),
                "updated_at": _ai_slip_now(),
            })


    elif action_type in {"send_invoice", "invoice_reminder", "quote_follow_up"}:
        sent_ok, send_result = await _ai_slip_send_customer_email(action_type, merged)
        if not sent_ok:
            return {"success": False, "error": send_result}

        await db.ai_operator_actions.update_one(
            {"_id": found["_id"]},
            {"$set": {
                "email_sent": True,
                "email_sent_at": _ai_slip_now(),
                "email_send_result": _ai_slip_safe_doc(send_result) if isinstance(send_result, dict) else str(send_result),
                "updated_at": _ai_slip_now(),
            }},
        )

    await db.ai_operator_actions.update_one({"_id": found["_id"]}, {"$set": {
        "status": "completed",
        "completed_at": _ai_slip_now(),
        "executed_by": _ai_slip_text(current_user.get("email")),
        "updated_at": _ai_slip_now(),
    }})
    if action_type in {"send_invoice", "invoice_reminder", "quote_follow_up"}:
        return {"success": True, "message": "Approved + sent with PDF", "email_sent": True, "completed": True}
    if action_type == "create_invoice_draft":
        return {"success": True, "message": "Approved + draft invoice created", "completed": True}
    if action_type == "assign_worker":
        return {"success": True, "message": "Approved + worker assigned", "completed": True}
    return {"success": True, "message": "Approved", "completed": True}
# CHURVOX_DIRECT_AI_SLIPS_END





# CHURVOX_DOCUMENT_BRANDING_ROUTES_START
@api_router.get("/business/invoice-branding")
async def churvox_get_invoice_branding_final(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    settings = await db.business_document_settings.find_one({"business_id": str(business_id)}) or {}

    defaults = {
        "business_id": str(business_id),
        "business_name": settings.get("business_name") or current_user.get("business_name") or current_user.get("company_name") or "Churvox",
        "trading_name": settings.get("trading_name") or settings.get("business_name") or current_user.get("business_name") or "Churvox",
        "logo_base64": settings.get("logo_base64") or "",
        "logo_url": settings.get("logo_url") or "",
        "business_address": settings.get("business_address") or "",
        "phone": settings.get("phone") or "",
        "email": settings.get("email") or current_user.get("email") or "hello@churvox.com",
        "website": settings.get("website") or "www.churvox.com",
        "gst_number": settings.get("gst_number") or "",
        "nzbn": settings.get("nzbn") or "",
        "bank_account_name": settings.get("bank_account_name") or "",
        "bank_account_number": settings.get("bank_account_number") or "",
        "payment_url": settings.get("payment_url") or "",
        "payment_instructions": settings.get("payment_instructions") or "Please use the invoice number as the payment reference.",
        "invoice_footer": settings.get("invoice_footer") or "Thanks for choosing us. We appreciate your business.",
    }

    return {"success": True, "settings": make_json_safe(defaults)}


@api_router.patch("/business/invoice-branding")
async def churvox_save_invoice_branding_final(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)

    allowed = {
        "business_name",
        "trading_name",
        "logo_base64",
        "logo_url",
        "business_address",
        "phone",
        "email",
        "website",
        "gst_number",
        "nzbn",
        "bank_account_name",
        "bank_account_number",
        "payment_url",
        "payment_instructions",
        "invoice_footer",
        "primary_color",
        "accent_color",
    }

    cleaned = {key: payload.get(key) for key in allowed if key in (payload or {})}
    cleaned["business_id"] = str(business_id)
    cleaned["updated_at"] = datetime.now(timezone.utc)

    existing = await db.business_document_settings.find_one({"business_id": str(business_id)})
    if existing:
        await db.business_document_settings.update_one({"_id": existing["_id"]}, {"$set": cleaned})
    else:
        cleaned["created_at"] = datetime.now(timezone.utc)
        await db.business_document_settings.insert_one(cleaned)

    saved = await db.business_document_settings.find_one({"business_id": str(business_id)}) or {}
    return {"success": True, "settings": make_json_safe(saved)}
# CHURVOX_DOCUMENT_BRANDING_ROUTES_END



# CHURVOX_LOGO_UPLOAD_START
def _churvox_logo_safe(value):
    if isinstance(value, list):
        return [_churvox_logo_safe(v) for v in value]
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if k == "_id":
                out["id"] = str(v)
            else:
                out[k] = _churvox_logo_safe(v)
        return out
    try:
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value

@api_router.post("/business/logo-upload")
async def churvox_upload_business_logo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    import base64

    business_id = await get_user_business_id(current_user)

    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Logo file is empty.")

    max_size = 2 * 1024 * 1024
    if len(raw) > max_size:
        raise HTTPException(status_code=400, detail="Logo is too large. Please use an image under 2MB.")

    logo_base64 = f"data:{content_type};base64,{base64.b64encode(raw).decode('ascii')}"

    update = {
        "business_id": str(business_id),
        "logo_base64": logo_base64,
        "logo_url": "",
        "updated_at": datetime.now(timezone.utc),
    }

    existing = await db.business_document_settings.find_one({"business_id": str(business_id)})
    if existing:
        await db.business_document_settings.update_one({"_id": existing["_id"]}, {"$set": update})
    else:
        update["created_at"] = datetime.now(timezone.utc)
        await db.business_document_settings.insert_one(update)

    saved = await db.business_document_settings.find_one({"business_id": str(business_id)}) or {}
    return {
        "success": True,
        "logo_base64": logo_base64,
        "settings": _churvox_logo_safe(saved),
    }

@api_router.delete("/business/logo-upload")
async def churvox_remove_business_logo(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    existing = await db.business_document_settings.find_one({"business_id": str(business_id)})

    update = {
        "logo_base64": "",
        "logo_url": "",
        "updated_at": datetime.now(timezone.utc),
    }

    if existing:
        await db.business_document_settings.update_one({"_id": existing["_id"]}, {"$set": update})
    else:
        update["business_id"] = str(business_id)
        update["created_at"] = datetime.now(timezone.utc)
        await db.business_document_settings.insert_one(update)

    saved = await db.business_document_settings.find_one({"business_id": str(business_id)}) or {}
    return {"success": True, "settings": _churvox_logo_safe(saved)}
# CHURVOX_LOGO_UPLOAD_END



# CHURVOX_FINAL_APPROVE_SEND_START
# Clean final approve/send route.
# This route deliberately stays small and uses the already-working Churvox PDF/email sender.

FINAL_APPROVE_SEND_TYPES = {"send_invoice", "invoice_reminder", "quote_follow_up"}
FINAL_OWNER_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "office admin", "business_owner", "platform_owner"}

def _final_clean_txt(value, fallback=""):
    return str(value or fallback or "").strip()

def _final_clean_now():
    return datetime.now(timezone.utc)

def _final_clean_num(value):
    try:
        if isinstance(value, str):
            value = value.replace("$", "").replace(",", "").replace("NZD", "").strip()
        return float(value or 0)
    except Exception:
        return 0.0

def _final_clean_role_ok(user):
    role = _final_clean_txt((user or {}).get("role")).lower()
    email = _final_clean_txt((user or {}).get("email")).lower()
    return (
        role in FINAL_OWNER_ROLES
        or email == "hello@churvox.com"
        or (user or {}).get("is_admin") is True
        or (user or {}).get("is_platform_owner") is True
    )

def _final_clean_oid_query(record_id):
    rid = _final_clean_txt(record_id)
    ors = [
        {"id": rid},
        {"action_id": rid},
        {"related_id": rid},
        {"related_entity_id": rid},
        {"job_id": rid},
        {"invoice_id": rid},
        {"quote_id": rid},
    ]
    try:
        if ObjectId.is_valid(rid):
            ors.insert(0, {"_id": ObjectId(rid)})
    except Exception:
        pass
    return {"$or": ors}

def _final_clean_action_type(action):
    return _final_clean_txt((action or {}).get("action_type") or (action or {}).get("type")).replace("-", "_").lower()

def _final_clean_required(action_type):
    if action_type == "assign_worker":
        return ["job_id", "worker_id"]
    if action_type == "create_invoice_draft":
        return ["job_id", "client_name", "description"]
    if action_type == "job_review":
        return ["job_id", "client_name"]
    if action_type == "send_invoice":
        return ["invoice_id", "customer_email"]
    if action_type == "invoice_reminder":
        return ["invoice_id", "customer_email", "message"]
    if action_type == "quote_follow_up":
        return ["quote_id", "customer_email", "message"]
    return []

def _final_clean_missing(action_type, payload):
    return [key for key in _final_clean_required(action_type) if not _final_clean_txt((payload or {}).get(key))]

async def _final_clean_business_id(current_user):
    try:
        bid = await get_user_business_id(current_user)
        if bid:
            return str(bid)
    except Exception:
        pass
    return _final_clean_txt(
        (current_user or {}).get("business_id")
        or (current_user or {}).get("businessId")
        or (current_user or {}).get("id")
        or (current_user or {}).get("_id")
        or (current_user or {}).get("user_id")
    )

def _final_clean_safe(value):
    if isinstance(value, list):
        return [_final_clean_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _final_clean_safe(v) for k, v in value.items()}
    try:
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value

@api_router.post("/ai/operator/actions/{action_id}/approve-send-final")
async def final_approve_send_action_clean(action_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    if not _final_clean_role_ok(current_user):
        raise HTTPException(status_code=403, detail="Owner approval required")

    business_id = await _final_clean_business_id(current_user)

    action = await db.ai_operator_actions.find_one(_final_clean_oid_query(action_id))
    if not action:
        raise HTTPException(status_code=404, detail="Slip not found")

    action_type = _final_clean_action_type(action)
    merged = {**(action.get("payload") or {}), **(action.get("draft_payload") or {}), **(payload or {})}
    merged.setdefault("business_id", str(business_id))

    if action_type in {"send_invoice", "invoice_reminder"}:
        merged.setdefault("invoice_id", action.get("related_entity_id") or action.get("related_id"))
    if action_type == "quote_follow_up":
        merged.setdefault("quote_id", action.get("related_entity_id") or action.get("related_id"))
    if action_type in {"assign_worker", "create_invoice_draft", "job_review"}:
        merged.setdefault("job_id", action.get("related_entity_id") or action.get("related_id"))

    missing = _final_clean_missing(action_type, merged)
    if missing:
        return {"success": False, "error": "Missing: " + ", ".join(missing), "missing": missing, "close": False}

    email_sent = False

    if action_type in FINAL_APPROVE_SEND_TYPES:
        sender = globals().get("_ai_slip_send_customer_email")
        if not sender:
            return {"success": False, "error": "Email/PDF sender is not loaded on backend", "close": False}

        ok, send_result = await sender(action_type, merged)
        if not ok:
            return {"success": False, "error": send_result, "close": False}

        email_sent = True
        await db.ai_operator_actions.update_one({"_id": action["_id"]}, {"$set": {
            "email_sent": True,
            "email_sent_at": _final_clean_now(),
            "email_send_result": _final_clean_safe(send_result),
            "updated_at": _final_clean_now(),
        }})

    elif action_type == "assign_worker":
        jid = merged.get("job_id") or action.get("related_entity_id")
        worker_id = merged.get("worker_id")
        if jid and worker_id:
            await db.jobs.update_one(_final_clean_oid_query(jid), {"$set": {
                "assigned_worker_id": str(worker_id),
                "worker_id": str(worker_id),
                "assigned_worker_name": merged.get("recommended_worker_name") or merged.get("worker_name") or "Assigned worker",
                "status": "assigned",
                "updated_at": _final_clean_now(),
            }})

    elif action_type == "create_invoice_draft":
        jid = merged.get("job_id") or action.get("related_entity_id")
        existing = await db.invoices.find_one({"business_id": str(business_id), "job_id": str(jid)})
        if not existing:
            description = (
                merged.get("description")
                or merged.get("invoice_description")
                or merged.get("worker_note")
                or merged.get("job_title")
                or "Service work completed"
            )
            await db.invoices.insert_one({
                "business_id": str(business_id),
                "job_id": str(jid),
                "client_id": merged.get("client_id"),
                "client_name": merged.get("client_name"),
                "customer_name": merged.get("customer_name") or merged.get("client_name"),
                "customer_email": merged.get("customer_email"),
                "description": description,
                "subtotal": _final_clean_num(merged.get("subtotal") or merged.get("price")),
                "total": _final_clean_num(merged.get("total") or merged.get("subtotal") or merged.get("price")),
                "status": "draft",
                "source": "approved_command_board_slip",
                "created_at": _final_clean_now(),
                "updated_at": _final_clean_now(),
            })

    await db.ai_operator_actions.update_one({"_id": action["_id"]}, {"$set": {
        "status": "completed",
        "completed_at": _final_clean_now(),
        "executed_by": _final_clean_txt(current_user.get("email")),
        "final_approved": True,
        "updated_at": _final_clean_now(),
    }})

    if email_sent:
        return {"success": True, "message": "Approved + sent with PDF", "completed": True, "email_sent": True, "close": True}
    if action_type == "create_invoice_draft":
        return {"success": True, "message": "Approved + draft invoice created", "completed": True, "close": True}
    if action_type == "assign_worker":
        return {"success": True, "message": "Approved + worker assigned", "completed": True, "close": True}
    return {"success": True, "message": "Approved", "completed": True, "close": True}
# CHURVOX_FINAL_APPROVE_SEND_END



app.include_router(api_router)

@app.get("/api/admin/platform-stats")
async def platform_stats_proxy(current_user: dict = Depends(get_current_user)):
    return await _platform_stats_impl(current_user)

FRONTEND_DIST_DIR = Path(__file__).resolve().parent / "frontend_dist"

if FRONTEND_DIST_DIR.exists():
    static_dir = FRONTEND_DIST_DIR / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="frontend-static")

    @app.get("/", include_in_schema=False)
    async def serve_frontend_root():
        return FileResponse(str(FRONTEND_DIST_DIR / "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend_app(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Not found")

        file_path = FRONTEND_DIST_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))

        return FileResponse(str(FRONTEND_DIST_DIR / "index.html"))



async def _platform_stats_impl(current_user: dict):
    if not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Owner access required")

    from datetime import datetime, timezone, timedelta

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def as_dt(value):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, str):
            try:
                value = value.replace("Z", "+00:00")
                parsed = datetime.fromisoformat(value)
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            except Exception:
                return None
        return None

    def as_num(value):
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            cleaned = "".join(ch for ch in value if ch in "0123456789.-")
            if not cleaned:
                return 0.0
            try:
                return float(cleaned)
            except Exception:
                return 0.0
        return 0.0

    def pick_plan(doc):
        plan = str(
            doc.get("plan_name")
            or doc.get("subscription_plan")
            or doc.get("plan")
            or doc.get("selected_plan")
            or "solo"
        ).strip().lower()

        if "enterprise" in plan:
            return "enterprise"
        if "pro" in plan:
            return "pro"
        if "team" in plan:
            return "team"
        return "solo"

    total_users = await db.users.count_documents({})
    total_jobs = await db.jobs.count_documents({})
    total_clients = await db.clients.count_documents({})
    total_quotes = await db.quotes.count_documents({})
    total_invoices = await db.invoices.count_documents({})

    business_ids = set()
    paid_users = 0
    trial_users = 0
    cancelled_users = 0
    new_signups_this_week = 0
    plan_counts = {"solo": 0, "team": 0, "pro": 0, "enterprise": 0}
    users_list = []
    paid_users_list = []

    user_projection = {
        "_id": 1,
        "email": 1,
        "name": 1,
        "business_name": 1,
        "business_id": 1,
        "role": 1,
        "plan": 1,
        "plan_name": 1,
        "subscription_plan": 1,
        "subscription_status": 1,
        "plan_status": 1,
        "created_at": 1,
        "updated_at": 1,
        "last_login": 1,
        "is_platform_owner": 1,
    }

    async for user in db.users.find({}, user_projection):
        business_id = user.get("business_id")
        if business_id:
            business_ids.add(str(business_id))
        else:
            business_ids.add(f'user:{user.get("_id")}')

        plan = pick_plan(user)
        plan_counts[plan] = plan_counts.get(plan, 0) + 1

        plan_status = str(
            user.get("subscription_status")
            or user.get("plan_status")
            or ""
        ).strip().lower()

        if "trial" in plan_status or "trial" in str(user.get("plan", "")).lower() or "trial" in str(user.get("plan_name", "")).lower():
            trial_users += 1
        elif plan_status in {"active", "paid"} or plan in {"team", "pro", "enterprise"}:
            paid_users += 1
            paid_users_list.append({
                "id": str(user.get("_id")),
                "email": user.get("email"),
                "name": user.get("name"),
                "business_name": user.get("business_name"),
                "plan": plan,
                "subscription_status": plan_status or "active",
            })

        if plan_status in {"cancelled", "canceled", "expired", "inactive"}:
            cancelled_users += 1

        created_at = as_dt(user.get("created_at"))
        if created_at and created_at >= week_ago:
            new_signups_this_week += 1

        users_list.append({
            "id": str(user.get("_id")),
            "email": user.get("email"),
            "name": user.get("name"),
            "business_name": user.get("business_name"),
            "role": user.get("role"),
            "plan": plan,
            "created_at": created_at.isoformat() if created_at else None,
        })

    try:
        async for biz in db.businesses.find({}, {"_id": 1, "name": 1, "business_name": 1, "plan": 1, "created_at": 1}):
            business_ids.add(str(biz.get("_id")))
    except Exception:
        pass

    total_businesses = len(business_ids)

    active_today_user_ids = set()
    active_today_list = []

    async for user in db.users.find({}, {"_id": 1, "email": 1, "name": 1, "business_name": 1, "updated_at": 1, "last_login": 1}):
        last_seen = as_dt(user.get("last_login")) or as_dt(user.get("updated_at"))
        if last_seen and last_seen >= today_start:
            uid = str(user.get("_id"))
            active_today_user_ids.add(uid)
            active_today_list.append({
                "id": uid,
                "email": user.get("email"),
                "name": user.get("name"),
                "business_name": user.get("business_name"),
                "last_seen": last_seen.isoformat(),
            })

    active_today = len(active_today_user_ids)

    monthly_revenue = 0.0
    outstanding_balance = 0.0
    overdue_invoices = 0
    invoices_list = []

    invoice_projection = {
        "_id": 1,
        "invoice_number": 1,
        "client_name": 1,
        "status": 1,
        "total": 1,
        "amount": 1,
        "amount_due": 1,
        "balance_due": 1,
        "remaining_balance": 1,
        "paid_amount": 1,
        "due_date": 1,
        "created_at": 1,
        "paid_at": 1,
        "business_id": 1,
    }

    async for invoice in db.invoices.find({}, invoice_projection):
        status = str(invoice.get("status") or "").strip().lower()
        created_at = as_dt(invoice.get("created_at"))
        paid_at = as_dt(invoice.get("paid_at"))
        due_date = as_dt(invoice.get("due_date"))

        total_value = max(
            as_num(invoice.get("total")),
            as_num(invoice.get("amount")),
            as_num(invoice.get("paid_amount")),
        )

        due_value = max(
            as_num(invoice.get("amount_due")),
            as_num(invoice.get("balance_due")),
            as_num(invoice.get("remaining_balance")),
            0.0,
        )

        if status == "paid":
            paid_when = paid_at or created_at
            if paid_when and paid_when >= month_start:
                monthly_revenue += total_value

        if status in {"sent", "overdue"}:
            outstanding_balance += due_value or total_value

        if status == "overdue" or (due_date and due_date < now and status != "paid"):
            overdue_invoices += 1

        invoices_list.append({
            "id": str(invoice.get("_id")),
            "invoice_number": invoice.get("invoice_number"),
            "client_name": invoice.get("client_name"),
            "status": status,
            "total": total_value,
            "amount_due": due_value,
            "due_date": due_date.isoformat() if due_date else None,
        })

    jobs_list = []
    async for job in db.jobs.find({}, {
        "_id": 1,
        "title": 1,
        "client_name": 1,
        "status": 1,
        "business_id": 1,
        "created_at": 1,
        "updated_at": 1,
        "scheduled_date": 1,
    }).sort("updated_at", -1).limit(100):
        jobs_list.append({
            "id": str(job.get("_id")),
            "title": job.get("title"),
            "client_name": job.get("client_name"),
            "status": job.get("status"),
            "business_id": str(job.get("business_id")) if job.get("business_id") else None,
            "created_at": as_dt(job.get("created_at")).isoformat() if as_dt(job.get("created_at")) else None,
            "updated_at": as_dt(job.get("updated_at")).isoformat() if as_dt(job.get("updated_at")) else None,
            "scheduled_date": as_dt(job.get("scheduled_date")).isoformat() if as_dt(job.get("scheduled_date")) else None,
        })

    businesses_list = []
    try:
        seen_business_ids = set()

        async for biz in db.businesses.find({}, {
            "_id": 1,
            "name": 1,
            "business_name": 1,
            "email": 1,
            "phone": 1,
            "address": 1,
            "plan": 1,
            "status": 1,
            "created_at": 1,
            "owner_name": 1,
            "owner": 1,
            "user_name": 1,
        }).limit(200):
            biz_id = str(biz.get("_id"))
            seen_business_ids.add(biz_id)
            businesses_list.append({
                "id": biz_id,
                "business_name": biz.get("business_name") or biz.get("name"),
                "email": biz.get("email"),
                "phone": biz.get("phone"),
                "address": biz.get("address"),
                "owner_name": biz.get("owner_name") or biz.get("owner") or biz.get("user_name"),
                "plan": pick_plan(biz),
                "status": biz.get("status"),
                "created_at": as_dt(biz.get("created_at")).isoformat() if as_dt(biz.get("created_at")) else None,
            })

        if len(businesses_list) < min(int(total_businesses), 200):
            async for user in db.users.find({
                "$or": [
                    {"business_id": {"$exists": True, "$ne": None}},
                    {"business_name": {"$exists": True, "$ne": ""}},
                    {"company_name": {"$exists": True, "$ne": ""}},
                ]
            }, {
                "_id": 1,
                "full_name": 1,
                "name": 1,
                "email": 1,
                "phone": 1,
                "mobile": 1,
                "address": 1,
                "plan": 1,
                "status": 1,
                "created_at": 1,
                "business_id": 1,
                "business_name": 1,
                "company_name": 1,
            }).limit(500):
                raw_business_id = user.get("business_id")
                fallback_id = str(raw_business_id) if raw_business_id else f"user-{user.get('_id')}"
                if fallback_id in seen_business_ids:
                    continue

                business_name = user.get("business_name") or user.get("company_name")
                if not business_name and not raw_business_id:
                    continue

                seen_business_ids.add(fallback_id)
                businesses_list.append({
                    "id": fallback_id,
                    "business_name": business_name or f"Business {fallback_id}",
                    "email": user.get("email"),
                    "phone": user.get("phone") or user.get("mobile"),
                    "address": user.get("address"),
                    "owner_name": user.get("full_name") or user.get("name"),
                    "plan": pick_plan(user),
                    "status": user.get("status"),
                    "created_at": as_dt(user.get("created_at")).isoformat() if as_dt(user.get("created_at")) else None,
                })

                if len(businesses_list) >= 200:
                    break

        businesses_list = businesses_list[:200]
    except Exception as e:
        print("platform-stats businesses_list error:", e)

    return {
        "total_users": int(total_users),
        "total_businesses": int(total_businesses),
        "active_today": int(active_today),
        "paid_users": int(paid_users),
        "trial_users": int(trial_users),
        "cancelled_users": int(cancelled_users),
        "new_signups_this_week": int(new_signups_this_week),
        "total_jobs": int(total_jobs),
        "total_clients": int(total_clients),
        "total_quotes": int(total_quotes),
        "total_invoices": int(total_invoices),
        "monthly_revenue": round(monthly_revenue, 2),
        "outstanding_balance": round(outstanding_balance, 2),
        "overdue_invoices": int(overdue_invoices),
        "plan_counts": plan_counts,
        "users_list": users_list[:200],
        "businesses_list": businesses_list[:200],
        "active_today_list": active_today_list[:200],
        "paid_users_list": paid_users_list[:200],
        "invoices_list": invoices_list[:200],
        "jobs_list": jobs_list[:200],
        "debug_db_name": getattr(db, "name", None),
        "debug_collection_names": sorted(await db.list_collection_names()),
        "debug_users_count": await db.users.count_documents({}) if "users" in await db.list_collection_names() else 0,
        "debug_businesses_count": await db.businesses.count_documents({}) if "businesses" in await db.list_collection_names() else 0,
        "debug_jobs_count": await db.jobs.count_documents({}) if "jobs" in await db.list_collection_names() else 0,
        "debug_invoices_count": await db.invoices.count_documents({}) if "invoices" in await db.list_collection_names() else 0,
    }




# CHURVOX_AREA3_BUSINESS_SETTINGS_20260531
# Business setup/settings for invoice, quote and onboarding readiness.
BUSINESS_SETUP_FIELDS = [
    "business_name",
    "trading_name",
    "logo_base64",
    "business_address",
    "phone",
    "email",
    "website",
    "gst_number",
    "nzbn",
    "bank_account_name",
    "bank_account_number",
    "invoice_prefix",
    "quote_prefix",
    "default_gst_rate",
    "default_invoice_due_days",
    "default_quote_expiry_days",
    "trade_industry_type",
    "service_area_region",
    "working_hours",
    "default_job_types",
    "uses_myob",
    "default_customer_message_tone",
]

BUSINESS_SETUP_REQUIRED_FIELDS = [
    "business_name",
    "business_address",
    "phone",
    "email",
    "gst_number",
    "bank_account_name",
    "bank_account_number",
    "invoice_prefix",
    "quote_prefix",
    "default_gst_rate",
    "default_invoice_due_days",
    "default_quote_expiry_days",
    "trade_industry_type",
]

def _business_settings_defaults(current_user: dict, business_id: str) -> dict:
    return {
        "business_id": str(business_id),
        "business_name": current_user.get("business_name") or current_user.get("company_name") or "",
        "trading_name": current_user.get("business_name") or current_user.get("company_name") or "",
        "logo_base64": "",
        "business_address": current_user.get("address") or "",
        "phone": current_user.get("phone") or current_user.get("mobile") or "",
        "email": current_user.get("email") or "",
        "website": "",
        "gst_number": "",
        "nzbn": "",
        "bank_account_name": "",
        "bank_account_number": "",
        "invoice_prefix": "INV",
        "quote_prefix": "QUO",
        "default_gst_rate": DEFAULT_GST_RATE,
        "default_invoice_due_days": 7,
        "default_quote_expiry_days": 14,
        "trade_industry_type": current_user.get("trade_type") or current_user.get("industry") or "",
        "service_area_region": current_user.get("region") or "",
        "working_hours": "",
        "default_job_types": [],
        "uses_myob": False,
        "default_customer_message_tone": "Friendly, clear and professional",
    }

def _clean_business_settings_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid business settings payload")

    cleaned = {}
    for key in BUSINESS_SETUP_FIELDS:
        if key not in payload:
            continue

        value = payload.get(key)

        if key == "logo_base64":
            logo = str(value or "").strip()
            # About 500KB raw image is roughly 666KB base64 plus data URL prefix.
            if logo and len(logo) > 700000:
                raise HTTPException(status_code=413, detail="Logo is too large. Please use a logo under about 500KB.")
            if logo and not (logo.startswith("data:image/") or logo.startswith("http")):
                raise HTTPException(status_code=400, detail="Logo must be an image data URL.")
            cleaned[key] = logo
            continue

        if key in {"default_gst_rate"}:
            try:
                cleaned[key] = float(value if value not in (None, "") else DEFAULT_GST_RATE)
            except Exception:
                raise HTTPException(status_code=400, detail=f"{key} must be a number")
            continue

        if key in {"default_invoice_due_days", "default_quote_expiry_days"}:
            try:
                cleaned[key] = max(0, int(value if value not in (None, "") else 0))
            except Exception:
                raise HTTPException(status_code=400, detail=f"{key} must be a whole number")
            continue

        if key == "uses_myob":
            cleaned[key] = bool(value)
            continue

        if key == "default_job_types":
            if isinstance(value, list):
                cleaned[key] = [str(x).strip() for x in value if str(x).strip()]
            else:
                cleaned[key] = [x.strip() for x in str(value or "").split(",") if x.strip()]
            continue

        cleaned[key] = str(value or "").strip()

    return cleaned

def _business_setup_completion(settings: dict) -> dict:
    missing = []
    for field in BUSINESS_SETUP_REQUIRED_FIELDS:
        value = settings.get(field)
        if value is None or value == "" or value == []:
            missing.append(field)

    total = len(BUSINESS_SETUP_REQUIRED_FIELDS)
    complete = max(0, total - len(missing))
    percent = round((complete / total) * 100) if total else 100

    return {
        "required_total": total,
        "complete_count": complete,
        "missing_count": len(missing),
        "percent": percent,
        "missing_fields": missing,
        "is_complete": len(missing) == 0,
    }

@api_router.get("/business/settings")
async def get_business_settings(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    defaults = _business_settings_defaults(current_user, business_id)
    saved = await db.business_settings.find_one({"business_id": str(business_id)}) or {}
    settings = {**defaults, **{k: v for k, v in saved.items() if k != "_id"}}
    settings["business_id"] = str(business_id)

    return {
        "success": True,
        "settings": make_json_safe(settings),
        "completion": _business_setup_completion(settings),
    }

@api_router.put("/business/settings")
async def put_business_settings(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    cleaned = _clean_business_settings_payload(payload)
    cleaned["business_id"] = str(business_id)
    cleaned["updated_at"] = now

    existing = await db.business_settings.find_one({"business_id": str(business_id)})
    if not existing:
        cleaned["created_at"] = now

    await db.business_settings.update_one(
        {"business_id": str(business_id)},
        {"$set": cleaned, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

    # Keep the owner user/business display name in sync for legacy pages.
    sync_user = {}
    if cleaned.get("business_name"):
        sync_user["business_name"] = cleaned["business_name"]
    if cleaned.get("trade_industry_type"):
        sync_user["trade_type"] = cleaned["trade_industry_type"]
    if sync_user:
        await db.users.update_one({"_id": ObjectId(str(current_user.get("id")))}, {"$set": sync_user})

    saved = await db.business_settings.find_one({"business_id": str(business_id)}) or cleaned
    settings = {**_business_settings_defaults(current_user, business_id), **{k: v for k, v in saved.items() if k != "_id"}}

    return {
        "success": True,
        "message": "Business setup saved.",
        "settings": make_json_safe(settings),
        "completion": _business_setup_completion(settings),
    }

@api_router.patch("/business/settings")
async def patch_business_settings(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    return await put_business_settings(payload, current_user)




# CHURVOX_AREA4_BUSINESS_GRADE_INVOICES_20260531
# Business-grade invoice endpoints. Additive and scoped to authenticated business_id.
AREA4_INVOICE_STATUSES = {
    "draft", "approved", "sent", "viewed", "partially_paid", "paid", "overdue", "cancelled", "void"
}

def _area4_num(value, fallback=0.0):
    try:
        if value is None or value == "":
            return float(fallback)
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return float(fallback or 0.0)

def _area4_text(value):
    return str(value or "").strip()

async def _area4_business_settings(business_id: str, current_user: dict | None = None) -> dict:
    settings = await db.business_settings.find_one({"business_id": str(business_id)}) or {}
    if settings:
        settings = {k: v for k, v in settings.items() if k != "_id"}
    current_user = current_user or {}
    return {
        "business_name": settings.get("business_name") or current_user.get("business_name") or current_user.get("company_name") or "Churvox business",
        "trading_name": settings.get("trading_name") or settings.get("business_name") or current_user.get("business_name") or "",
        "logo_base64": settings.get("logo_base64") or "",
        "business_address": settings.get("business_address") or current_user.get("address") or "",
        "phone": settings.get("phone") or current_user.get("phone") or current_user.get("mobile") or "",
        "email": settings.get("email") or current_user.get("email") or "",
        "website": settings.get("website") or "",
        "gst_number": settings.get("gst_number") or "",
        "nzbn": settings.get("nzbn") or "",
        "bank_account_name": settings.get("bank_account_name") or "",
        "bank_account_number": settings.get("bank_account_number") or "",
        "invoice_prefix": settings.get("invoice_prefix") or "INV",
        "quote_prefix": settings.get("quote_prefix") or "QUO",
        "default_gst_rate": _area4_num(settings.get("default_gst_rate"), DEFAULT_GST_RATE),
        "default_invoice_due_days": int(_area4_num(settings.get("default_invoice_due_days"), 7)),
        "default_quote_expiry_days": int(_area4_num(settings.get("default_quote_expiry_days"), 14)),
        "trade_industry_type": settings.get("trade_industry_type") or "",
        "service_area_region": settings.get("service_area_region") or "",
        "uses_myob": bool(settings.get("uses_myob")),
    }

async def _area4_next_invoice_number(business_id: str, prefix: str) -> str:
    prefix = _area4_text(prefix) or "INV"
    count = await db.invoices.count_documents({"business_id": str(business_id)})
    return f"{prefix}-{count + 1:05d}"

def _area4_due_date(payload: dict, settings: dict):
    raw = payload.get("due_date")
    if raw:
        try:
            if isinstance(raw, datetime):
                return raw
            return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        except Exception:
            pass
    days = int(_area4_num(payload.get("default_invoice_due_days"), settings.get("default_invoice_due_days") or 7))
    return datetime.now(timezone.utc) + timedelta(days=days)

def _area4_clean_line_items(payload: dict) -> list:
    raw_items = payload.get("line_items") or payload.get("items") or payload.get("lines") or []
    items = []
    if isinstance(raw_items, list):
        for row in raw_items:
            if not isinstance(row, dict):
                continue
            desc = _area4_text(row.get("description") or row.get("name") or row.get("title") or row.get("item"))
            qty = _area4_num(row.get("quantity") or row.get("qty"), 1)
            unit_price = _area4_num(row.get("unit_price") or row.get("rate") or row.get("price"), 0)
            amount = _area4_num(row.get("amount") or row.get("total") or row.get("line_total"), qty * unit_price)
            if desc or amount > 0:
                items.append({
                    "description": desc or "Service work",
                    "quantity": qty,
                    "unit_price": unit_price,
                    "amount": round(amount, 2),
                })

    if not items:
        desc = _area4_text(payload.get("description") or payload.get("invoice_description") or "Service work completed")
        subtotal = _area4_num(payload.get("subtotal") or payload.get("amount") or payload.get("price"), 0)
        items.append({
            "description": desc,
            "quantity": 1,
            "unit_price": round(subtotal, 2),
            "amount": round(subtotal, 2),
        })

    return items

def _area4_totals(payload: dict, settings: dict) -> dict:
    line_items = _area4_clean_line_items(payload)
    subtotal = round(sum(_area4_num(x.get("amount"), 0) for x in line_items), 2)
    if payload.get("subtotal") not in (None, "") and not payload.get("line_items"):
        subtotal = round(_area4_num(payload.get("subtotal"), subtotal), 2)
    gst_rate = _area4_num(payload.get("gst_rate"), settings.get("default_gst_rate") or DEFAULT_GST_RATE)
    discount_amount = round(_area4_num(payload.get("discount_amount") or payload.get("discount"), 0), 2)
    deposit_amount = round(_area4_num(payload.get("deposit_amount") or payload.get("deposit"), 0), 2)
    amount_paid = round(_area4_num(payload.get("amount_paid") or payload.get("paid_amount"), 0) + deposit_amount, 2)
    taxable_subtotal = max(0, subtotal - discount_amount)
    gst_amount = round(taxable_subtotal * gst_rate / 100.0, 2)
    total = round(taxable_subtotal + gst_amount, 2)
    amount_due = round(max(0, total - amount_paid), 2)
    return {
        "line_items": line_items,
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "discount_amount": discount_amount,
        "deposit_amount": deposit_amount,
        "amount_paid": amount_paid,
        "amount_due": amount_due,
        "total": total,
    }

def _area4_invoice_status(payload: dict, totals: dict, fallback="draft") -> str:
    status = _area4_text(payload.get("status") or fallback).lower()
    if status not in AREA4_INVOICE_STATUSES:
        status = fallback if fallback in AREA4_INVOICE_STATUSES else "draft"
    if totals.get("total", 0) > 0 and totals.get("amount_due", 0) <= 0:
        status = "paid"
    elif totals.get("amount_paid", 0) > 0 and totals.get("amount_due", 0) > 0 and status not in {"void", "cancelled"}:
        status = "partially_paid"
    return status

def _area4_invoice_lookup(invoice_id: str, business_id: str):
    clauses = [{"id": str(invoice_id)}]
    if ObjectId.is_valid(str(invoice_id)):
        clauses.insert(0, {"_id": ObjectId(str(invoice_id))})
    return {"business_id": str(business_id), "$or": clauses}

def _area4_public_invoice_url(public_token: str) -> str:
    return f"{FRONTEND_URL}/public/invoice/{public_token}" if public_token else ""

async def _area4_prepare_invoice_doc(payload: dict, current_user: dict, existing: dict | None = None) -> dict:
    business_id = await get_user_business_id(current_user)
    settings = await _area4_business_settings(business_id, current_user)
    now = datetime.now(timezone.utc)
    existing = existing or {}
    totals = _area4_totals(payload, settings)
    invoice_number = _area4_text(payload.get("invoice_number") or existing.get("invoice_number"))
    if not invoice_number:
        invoice_number = await _area4_next_invoice_number(business_id, settings.get("invoice_prefix") or "INV")
    public_token = _area4_text(existing.get("public_token") or payload.get("public_token") or secrets.token_urlsafe(24))
    status = _area4_invoice_status(payload, totals, existing.get("status") or "draft")

    doc = {
        "business_id": str(business_id),
        "owner_id": str(current_user.get("id") or current_user.get("_id") or ""),
        "invoice_number": invoice_number,
        "public_token": public_token,
        "public_invoice_url": _area4_public_invoice_url(public_token),
        "client_id": payload.get("client_id") or existing.get("client_id") or None,
        "job_id": _area4_text(payload.get("job_id") or payload.get("linked_job_id") or existing.get("job_id")),
        "linked_job_id": _area4_text(payload.get("linked_job_id") or payload.get("job_id") or existing.get("linked_job_id")),
        "quote_id": _area4_text(payload.get("quote_id") or payload.get("linked_quote_id") or existing.get("quote_id")),
        "linked_quote_id": _area4_text(payload.get("linked_quote_id") or payload.get("quote_id") or existing.get("linked_quote_id")),
        "customer_name": _area4_text(payload.get("customer_name") or payload.get("client_name") or existing.get("customer_name")),
        "customer_email": _area4_text(payload.get("customer_email") or payload.get("email") or existing.get("customer_email")),
        "customer_phone": _area4_text(payload.get("customer_phone") or payload.get("phone") or existing.get("customer_phone")),
        "billing_address": _area4_text(payload.get("billing_address") or payload.get("address") or existing.get("billing_address")),
        "address": _area4_text(payload.get("address") or payload.get("site_address") or existing.get("address")),
        "site_address": _area4_text(payload.get("site_address") or payload.get("address") or existing.get("site_address")),
        "description": _area4_text(payload.get("description") or payload.get("invoice_description") or existing.get("description")),
        "payment_terms": _area4_text(payload.get("payment_terms") or existing.get("payment_terms") or f"Payment due within {settings.get('default_invoice_due_days', 7)} days."),
        "due_date": _area4_due_date(payload, settings),
        "payment_link": _area4_text(payload.get("payment_link") or payload.get("payment_url") or existing.get("payment_link")),
        "notes": _area4_text(payload.get("notes") or existing.get("notes")),
        "internal_notes": _area4_text(payload.get("internal_notes") or existing.get("internal_notes")),
        "public_notes": _area4_text(payload.get("public_notes") or payload.get("notes") or existing.get("public_notes")),
        "status": status,
        "business_snapshot": settings,
        "updated_at": now,
        "source": payload.get("source") or existing.get("source") or "business_grade_invoice",
        "myob_sync_status": existing.get("myob_sync_status") or payload.get("myob_sync_status") or "not_synced",
        "myob_invoice_id": existing.get("myob_invoice_id") or payload.get("myob_invoice_id") or "",
        "myob_invoice_number": existing.get("myob_invoice_number") or payload.get("myob_invoice_number") or "",
        **totals,
    }

    if not existing:
        doc["created_at"] = now
    if status == "approved" and not existing.get("approved_at"):
        doc["approved_at"] = now
    if status == "paid" and not existing.get("paid_at"):
        doc["paid_at"] = now
    return doc

def _area4_public_response(invoice: dict) -> dict:
    row = make_json_safe(safe_doc(dict(invoice)))
    row["public_invoice_url"] = _area4_public_invoice_url(row.get("public_token") or "")
    return row

@api_router.post("/invoices/business-grade")
async def create_business_grade_invoice(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    doc = await _area4_prepare_invoice_doc(payload or {}, current_user)
    inserted = await db.invoices.insert_one(doc)
    doc["_id"] = inserted.inserted_id

    if doc.get("job_id") and ObjectId.is_valid(str(doc.get("job_id"))):
        await db.jobs.update_one(
            {"_id": ObjectId(str(doc.get("job_id"))), "business_id": doc["business_id"]},
            {"$set": {"draft_invoice_id": str(inserted.inserted_id), "invoice_id": str(inserted.inserted_id), "invoiced": True, "updated_at": datetime.now(timezone.utc)}}
        )

    return {"success": True, "invoice": _area4_public_response(doc), "id": str(inserted.inserted_id)}

@api_router.patch("/invoices/{invoice_id}/business-grade")
async def update_business_grade_invoice(invoice_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    existing = await db.invoices.find_one(_area4_invoice_lookup(invoice_id, business_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")

    doc = await _area4_prepare_invoice_doc(payload or {}, current_user, existing=existing)
    await db.invoices.update_one({"_id": existing["_id"], "business_id": str(business_id)}, {"$set": doc})
    saved = await db.invoices.find_one({"_id": existing["_id"]})
    return {"success": True, "invoice": _area4_public_response(saved), "id": str(existing["_id"])}

@api_router.post("/invoices/{invoice_id}/approve")
async def approve_business_grade_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    existing = await db.invoices.find_one(_area4_invoice_lookup(invoice_id, business_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    now = datetime.now(timezone.utc)
    await db.invoices.update_one({"_id": existing["_id"], "business_id": str(business_id)}, {"$set": {"status": "approved", "approved_at": now, "updated_at": now}})
    saved = await db.invoices.find_one({"_id": existing["_id"]})
    return {"success": True, "invoice": _area4_public_response(saved)}

@api_router.post("/invoices/{invoice_id}/partial-payment")
async def record_business_grade_invoice_payment(invoice_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    existing = await db.invoices.find_one(_area4_invoice_lookup(invoice_id, business_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")

    amount = _area4_num((payload or {}).get("amount"), 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    total = _area4_num(existing.get("total"), 0)
    old_paid = _area4_num(existing.get("amount_paid") or existing.get("paid_amount"), 0)
    new_paid = round(old_paid + amount, 2)
    amount_due = round(max(0, total - new_paid), 2)
    status = "paid" if amount_due <= 0 else "partially_paid"
    now = datetime.now(timezone.utc)
    payment = {
        "amount": round(amount, 2),
        "note": _area4_text((payload or {}).get("note") or "Payment recorded"),
        "recorded_at": now,
        "recorded_by": current_user.get("email") or current_user.get("id"),
    }
    history = existing.get("payment_history") if isinstance(existing.get("payment_history"), list) else []
    history.append(payment)

    update = {
        "amount_paid": new_paid,
        "paid_amount": new_paid,
        "amount_due": amount_due,
        "balance_due": amount_due,
        "remaining_balance": amount_due,
        "status": status,
        "payment_history": history,
        "updated_at": now,
    }
    if status == "paid":
        update["paid_at"] = now

    await db.invoices.update_one({"_id": existing["_id"], "business_id": str(business_id)}, {"$set": update})
    saved = await db.invoices.find_one({"_id": existing["_id"]})
    return {"success": True, "invoice": _area4_public_response(saved)}

@api_router.post("/invoices/{invoice_id}/void")
async def void_business_grade_invoice(invoice_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    existing = await db.invoices.find_one(_area4_invoice_lookup(invoice_id, business_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    now = datetime.now(timezone.utc)
    await db.invoices.update_one(
        {"_id": existing["_id"], "business_id": str(business_id)},
        {"$set": {
            "status": "void",
            "voided_at": now,
            "void_reason": _area4_text((payload or {}).get("reason") or "Voided by owner"),
            "updated_at": now,
        }}
    )
    saved = await db.invoices.find_one({"_id": existing["_id"]})
    return {"success": True, "invoice": _area4_public_response(saved)}




# CHURVOX_AREA5_QUOTE_JOB_INVOICE_PAID_PIPELINE_20260531
# Connected Quote → Job → Invoice → Paid workflow.
def _area5_object_query(record_id: str, business_id: str) -> dict:
    clauses = [{"id": str(record_id)}]
    if ObjectId.is_valid(str(record_id)):
        clauses.insert(0, {"_id": ObjectId(str(record_id))})
    return {"business_id": str(business_id), "$or": clauses}

def _area5_id(doc: dict) -> str:
    if not doc:
        return ""
    return str(doc.get("_id") or doc.get("id") or "")

def _area5_money(value, fallback=0.0):
    try:
        if value is None or value == "":
            return float(fallback)
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return float(fallback or 0)

def _area5_status(doc: dict) -> str:
    return str((doc or {}).get("status") or "").lower().strip()

def _area5_completed_job(job: dict) -> bool:
    status = str(job.get("status") or job.get("job_status") or job.get("workflow_status") or "").lower()
    return status in {"completed", "complete", "done"} or bool(job.get("completed") or job.get("completed_at") or job.get("worker_completed_at"))

def _area5_invoice_linked(job: dict) -> bool:
    return bool(job.get("invoice_id") or job.get("draft_invoice_id") or job.get("invoiced"))

async def _area5_quote_to_job_payload(quote: dict, payload: dict, business_id: str, current_user: dict) -> dict:
    now = datetime.now(timezone.utc)
    scheduled_raw = payload.get("scheduled_date") or payload.get("date")
    if scheduled_raw:
        try:
            scheduled_date = datetime.fromisoformat(str(scheduled_raw).replace("Z", "+00:00"))
        except Exception:
            scheduled_date = now + timedelta(days=1)
    else:
        scheduled_date = now + timedelta(days=1)

    title = (
        payload.get("title")
        or quote.get("title")
        or quote.get("job_title")
        or quote.get("job_description")
        or quote.get("description")
        or "Quoted work"
    )

    customer_name = (
        quote.get("customer_name")
        or quote.get("client_name")
        or quote.get("name")
        or payload.get("customer_name")
        or "Customer"
    )

    address = (
        payload.get("address")
        or quote.get("address")
        or quote.get("site_address")
        or quote.get("billing_address")
        or ""
    )

    price = _area5_money(
        payload.get("price")
        or quote.get("price")
        or quote.get("total")
        or quote.get("amount")
        or quote.get("subtotal"),
        0,
    )

    return {
        "business_id": str(business_id),
        "owner_id": str(current_user.get("id") or current_user.get("_id") or ""),
        "quote_id": _area5_id(quote),
        "linked_quote_id": _area5_id(quote),
        "client_id": quote.get("client_id") or payload.get("client_id"),
        "customer_name": customer_name,
        "client_name": customer_name,
        "title": str(title)[:220],
        "job_name": str(title)[:220],
        "job_type": payload.get("job_type") or quote.get("job_type") or "other",
        "service_type": payload.get("service_type") or quote.get("job_type") or quote.get("service_type") or "Service work",
        "description": quote.get("job_description") or quote.get("description") or quote.get("notes") or "",
        "address": address,
        "site_address": address,
        "scheduled_date": scheduled_date,
        "scheduled_time": payload.get("scheduled_time") or quote.get("scheduled_time") or "",
        "estimated_duration": int(_area5_money(payload.get("estimated_duration") or quote.get("estimated_duration"), 60)),
        "price": price,
        "job_price": price,
        "pricing_type": quote.get("pricing_type") or payload.get("pricing_type") or "fixed",
        "hourly_rate": _area5_money(quote.get("hourly_rate") or payload.get("hourly_rate"), 0),
        "extras": quote.get("extras") if isinstance(quote.get("extras"), list) else [],
        "notes": quote.get("notes") or "",
        "status": "assigned" if payload.get("assigned_worker_id") else "quoted",
        "assigned_worker_id": payload.get("assigned_worker_id") or "",
        "assigned_worker_name": payload.get("assigned_worker_name") or "",
        "source": "quote_conversion",
        "created_at": now,
        "updated_at": now,
    }

@api_router.get("/pipeline")
async def get_quote_job_invoice_pipeline(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)

    quotes = [safe_doc(q) async for q in db.quotes.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(500)]
    jobs = [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(500)]
    invoices = [safe_doc(i) async for i in db.invoices.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(500)]

    jobs_by_quote = {}
    for job in jobs:
        qid = str(job.get("quote_id") or job.get("linked_quote_id") or "")
        if qid:
            jobs_by_quote[qid] = job

    accepted_quotes_no_job = []
    for quote in quotes:
        qid = str(quote.get("id") or quote.get("_id") or "")
        status = _area5_status(quote)
        if status in {"accepted", "approved"} and not (quote.get("job_id") or quote.get("converted_job_id") or jobs_by_quote.get(qid)):
            accepted_quotes_no_job.append(quote)

    completed_jobs_no_invoice = []
    approved_jobs_no_invoice = []
    for job in jobs:
        if _area5_completed_job(job) and not _area5_invoice_linked(job):
            completed_jobs_no_invoice.append(job)
        if (job.get("owner_approved") or str(job.get("owner_review_status") or "").lower() == "approved") and not _area5_invoice_linked(job):
            approved_jobs_no_invoice.append(job)

    draft_invoices = [i for i in invoices if _area5_status(i) in {"draft", ""}]
    sent_invoices = [i for i in invoices if _area5_status(i) in {"sent", "approved"}]
    paid_invoices = [i for i in invoices if _area5_status(i) == "paid"]

    overdue_invoices = []
    for invoice in invoices:
        status = _area5_status(invoice)
        due = invoice.get("due_date")
        is_overdue = status == "overdue"
        if due and status not in {"paid", "void", "cancelled"}:
            try:
                is_overdue = datetime.fromisoformat(str(due).replace("Z", "+00:00")) < now
            except Exception:
                pass
        if is_overdue:
            overdue_invoices.append(invoice)

    unpaid_total = sum(_area5_money(i.get("amount_due") or i.get("balance_due") or i.get("total"), 0) for i in invoices if _area5_status(i) not in {"paid", "void", "cancelled"})
    overdue_total = sum(_area5_money(i.get("amount_due") or i.get("balance_due") or i.get("total"), 0) for i in overdue_invoices)
    ready_to_invoice_total = sum(_area5_money(j.get("price") or j.get("job_price") or j.get("total") or j.get("amount"), 0) for j in completed_jobs_no_invoice)

    return {
        "success": True,
        "pipeline": {
            "accepted_quotes_no_job": accepted_quotes_no_job,
            "completed_jobs_no_invoice": completed_jobs_no_invoice,
            "approved_jobs_no_invoice": approved_jobs_no_invoice,
            "draft_invoices": draft_invoices,
            "sent_invoices": sent_invoices,
            "overdue_invoices": overdue_invoices,
            "paid_invoices": paid_invoices,
            "metrics": {
                "accepted_quotes_no_job": len(accepted_quotes_no_job),
                "completed_jobs_no_invoice": len(completed_jobs_no_invoice),
                "approved_jobs_no_invoice": len(approved_jobs_no_invoice),
                "draft_invoices": len(draft_invoices),
                "sent_invoices": len(sent_invoices),
                "overdue_invoices": len(overdue_invoices),
                "paid_invoices": len(paid_invoices),
                "unpaid_total": round(unpaid_total, 2),
                "overdue_total": round(overdue_total, 2),
                "ready_to_invoice_total": round(ready_to_invoice_total, 2),
            },
        },
    }

@api_router.post("/quotes/{quote_id}/accept")
async def owner_accept_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    quote = await db.quotes.find_one(_area5_object_query(quote_id, business_id))
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    now = datetime.now(timezone.utc)
    await db.quotes.update_one({"_id": quote["_id"], "business_id": str(business_id)}, {"$set": {"status": "accepted", "accepted_at": now, "updated_at": now}})
    saved = await db.quotes.find_one({"_id": quote["_id"]})
    return {"success": True, "quote": safe_doc(saved)}

@api_router.post("/quotes/{quote_id}/decline")
async def owner_decline_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    quote = await db.quotes.find_one(_area5_object_query(quote_id, business_id))
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    now = datetime.now(timezone.utc)
    await db.quotes.update_one({"_id": quote["_id"], "business_id": str(business_id)}, {"$set": {"status": "declined", "declined_at": now, "updated_at": now}})
    saved = await db.quotes.find_one({"_id": quote["_id"]})
    return {"success": True, "quote": safe_doc(saved)}

@api_router.post("/quotes/{quote_id}/convert-to-job")
async def convert_quote_to_job(quote_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    quote = await db.quotes.find_one(_area5_object_query(quote_id, business_id))
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    existing_job_id = quote.get("converted_job_id") or quote.get("job_id")
    if existing_job_id:
        existing = await db.jobs.find_one(_area5_object_query(str(existing_job_id), business_id))
        if existing:
            return {"success": True, "job": safe_doc(existing), "message": "Quote is already linked to a job."}

    job_doc = await _area5_quote_to_job_payload(quote, payload or {}, business_id, current_user)
    inserted = await db.jobs.insert_one(job_doc)
    now = datetime.now(timezone.utc)
    await db.quotes.update_one(
        {"_id": quote["_id"], "business_id": str(business_id)},
        {"$set": {
            "status": "converted",
            "job_id": str(inserted.inserted_id),
            "converted_job_id": str(inserted.inserted_id),
            "converted_at": now,
            "updated_at": now,
        }}
    )
    saved = await db.jobs.find_one({"_id": inserted.inserted_id})
    return {"success": True, "job": safe_doc(saved), "job_id": str(inserted.inserted_id)}

@api_router.post("/jobs/{job_id}/approve-completion")
async def approve_job_completion_for_pipeline(job_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    job = await db.jobs.find_one(_area5_object_query(job_id, business_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    now = datetime.now(timezone.utc)
    await db.jobs.update_one(
        {"_id": job["_id"], "business_id": str(business_id)},
        {"$set": {
            "status": "completed",
            "job_status": "completed",
            "workflow_status": "completed",
            "completed": True,
            "owner_approved": True,
            "owner_review_status": "approved",
            "work_review_status": "approved",
            "approved_at": now,
            "updated_at": now,
        }}
    )
    saved = await db.jobs.find_one({"_id": job["_id"]})
    return {"success": True, "job": safe_doc(saved)}

@api_router.post("/jobs/{job_id}/create-invoice-draft")
async def create_invoice_draft_from_job_pipeline(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    job = await db.jobs.find_one(_area5_object_query(job_id, business_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing_invoice_id = job.get("invoice_id") or job.get("draft_invoice_id")
    if existing_invoice_id:
        existing = await db.invoices.find_one(_area5_object_query(str(existing_invoice_id), business_id))
        if existing:
            return {"success": True, "invoice": _area4_public_response(existing) if "_area4_public_response" in globals() else safe_doc(existing), "message": "Job already has an invoice."}

    price = _area5_money(job.get("price") or job.get("job_price") or job.get("fixed_price") or job.get("amount") or job.get("total"), 0)
    description = job.get("ai_invoice_description") or job.get("invoice_description_draft") or job.get("description") or job.get("title") or "Service work completed"
    invoice_payload = {
        "job_id": _area5_id(job),
        "linked_job_id": _area5_id(job),
        "quote_id": job.get("quote_id") or job.get("linked_quote_id") or "",
        "linked_quote_id": job.get("linked_quote_id") or job.get("quote_id") or "",
        "client_id": job.get("client_id"),
        "customer_name": job.get("customer_name") or job.get("client_name") or "Customer",
        "customer_email": job.get("customer_email") or job.get("email") or "",
        "customer_phone": job.get("customer_phone") or job.get("phone") or "",
        "address": job.get("address") or job.get("site_address") or "",
        "site_address": job.get("site_address") or job.get("address") or "",
        "description": payload.get("description") or description,
        "line_items": [{
            "description": payload.get("description") or description,
            "quantity": 1,
            "unit_price": price,
            "amount": price,
        }],
        "subtotal": price,
        "status": "draft",
        "source": "job_to_invoice_pipeline",
    }

    invoice_doc = await _area4_prepare_invoice_doc(invoice_payload, current_user) if "_area4_prepare_invoice_doc" in globals() else {
        **invoice_payload,
        "business_id": str(business_id),
        "status": "draft",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "public_token": secrets.token_urlsafe(24),
        "total": price,
        "amount_due": price,
    }
    inserted = await db.invoices.insert_one(invoice_doc)
    now = datetime.now(timezone.utc)
    await db.jobs.update_one(
        {"_id": job["_id"], "business_id": str(business_id)},
        {"$set": {
            "draft_invoice_id": str(inserted.inserted_id),
            "invoice_id": str(inserted.inserted_id),
            "invoiced": True,
            "updated_at": now,
        }}
    )
    saved = await db.invoices.find_one({"_id": inserted.inserted_id})
    return {"success": True, "invoice": _area4_public_response(saved) if "_area4_public_response" in globals() else safe_doc(saved), "invoice_id": str(inserted.inserted_id)}

@api_router.post("/invoices/{invoice_id}/mark-paid-pipeline")
async def mark_invoice_paid_pipeline(invoice_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    invoice = await db.invoices.find_one(_area5_object_query(invoice_id, business_id))
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    now = datetime.now(timezone.utc)
    total = _area5_money(invoice.get("total"), 0)
    await db.invoices.update_one(
        {"_id": invoice["_id"], "business_id": str(business_id)},
        {"$set": {
            "status": "paid",
            "amount_paid": total,
            "paid_amount": total,
            "amount_due": 0,
            "balance_due": 0,
            "remaining_balance": 0,
            "paid_at": now,
            "updated_at": now,
        }}
    )
    saved = await db.invoices.find_one({"_id": invoice["_id"]})
    return {"success": True, "invoice": _area4_public_response(saved) if "_area4_public_response" in globals() else safe_doc(saved)}




# CHURVOX_AREA6_MONEY_DESK_20260531
# Owner Money Desk: real invoice/job totals and money actions.
def _area6_num(value, fallback=0.0):
    try:
        if value is None or value == "":
            return float(fallback)
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return float(fallback or 0)

def _area6_status(doc: dict) -> str:
    return str((doc or {}).get("status") or "").lower().strip()

def _area6_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None

def _area6_invoice_value(invoice: dict) -> float:
    return max(
        _area6_num(invoice.get("amount_due"), 0),
        _area6_num(invoice.get("balance_due"), 0),
        _area6_num(invoice.get("remaining_balance"), 0),
        _area6_num(invoice.get("total"), 0),
        _area6_num(invoice.get("amount"), 0),
    )

def _area6_job_ready_value(job: dict) -> float:
    return max(
        _area6_num(job.get("price"), 0),
        _area6_num(job.get("job_price"), 0),
        _area6_num(job.get("fixed_price"), 0),
        _area6_num(job.get("total"), 0),
        _area6_num(job.get("amount"), 0),
    )

def _area6_is_completed_job(job: dict) -> bool:
    status = str(job.get("status") or job.get("job_status") or job.get("workflow_status") or "").lower()
    return status in {"completed", "complete", "done"} or bool(job.get("completed") or job.get("completed_at") or job.get("worker_completed_at"))

def _area6_job_has_invoice(job: dict) -> bool:
    return bool(job.get("invoice_id") or job.get("draft_invoice_id") or job.get("invoiced"))

def _area6_doc_id(doc: dict) -> str:
    return str(doc.get("_id") or doc.get("id") or "")

@api_router.get("/money-desk")
async def get_money_desk(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    invoices = [safe_doc(i) async for i in db.invoices.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(800)]
    jobs = [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(800)]

    completed_jobs_not_invoiced = [j for j in jobs if _area6_is_completed_job(j) and not _area6_job_has_invoice(j)]

    draft_invoices = [i for i in invoices if _area6_status(i) in {"", "draft", "pending"}]
    sent_invoices = [i for i in invoices if _area6_status(i) in {"sent", "approved", "open", "unpaid"}]
    paid_invoices = [i for i in invoices if _area6_status(i) == "paid"]
    partial_invoices = [i for i in invoices if _area6_status(i) == "partially_paid"]

    overdue_invoices = []
    for invoice in invoices:
        status = _area6_status(invoice)
        due_date = _area6_dt(invoice.get("due_date"))
        if status in {"paid", "void", "cancelled"}:
            continue
        if status == "overdue" or (due_date and due_date < now):
            overdue_invoices.append(invoice)

    def since(rows, field, cutoff):
        total = 0.0
        for row in rows:
            when = _area6_dt(row.get(field) or row.get("created_at") or row.get("updated_at"))
            if when and when >= cutoff:
                total += _area6_num(row.get("total") or row.get("amount") or row.get("amount_paid") or row.get("paid_amount"), 0)
        return round(total, 2)

    total_unpaid = sum(_area6_invoice_value(i) for i in invoices if _area6_status(i) not in {"paid", "void", "cancelled"})
    total_overdue = sum(_area6_invoice_value(i) for i in overdue_invoices)
    total_draft = sum(_area6_invoice_value(i) for i in draft_invoices)
    total_ready_to_invoice = sum(_area6_job_ready_value(j) for j in completed_jobs_not_invoiced)
    paid_this_week = since(paid_invoices, "paid_at", week_start)
    paid_this_month = since(paid_invoices, "paid_at", month_start)
    invoiced_this_week = since(invoices, "created_at", week_start)
    invoiced_this_month = since(invoices, "created_at", month_start)

    return {
        "success": True,
        "money_desk": {
            "completed_jobs_not_invoiced": completed_jobs_not_invoiced,
            "draft_invoices": draft_invoices,
            "sent_invoices": sent_invoices,
            "overdue_invoices": overdue_invoices,
            "paid_invoices": paid_invoices,
            "partially_paid_invoices": partial_invoices,
            "metrics": {
                "completed_jobs_not_invoiced": len(completed_jobs_not_invoiced),
                "draft_invoices": len(draft_invoices),
                "sent_invoices": len(sent_invoices),
                "overdue_invoices": len(overdue_invoices),
                "paid_invoices": len(paid_invoices),
                "partially_paid_invoices": len(partial_invoices),
                "total_unpaid": round(total_unpaid, 2),
                "total_overdue": round(total_overdue, 2),
                "total_draft": round(total_draft, 2),
                "total_ready_to_invoice": round(total_ready_to_invoice, 2),
                "paid_this_week": paid_this_week,
                "paid_this_month": paid_this_month,
                "invoiced_this_week": invoiced_this_week,
                "invoiced_this_month": invoiced_this_month,
            },
        },
    }

@api_router.post("/money-desk/invoices/{invoice_id}/prepare-reminder")
async def prepare_money_desk_invoice_reminder(invoice_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    clauses = [{"id": str(invoice_id)}]
    if ObjectId.is_valid(str(invoice_id)):
        clauses.insert(0, {"_id": ObjectId(str(invoice_id))})
    invoice = await db.invoices.find_one({"business_id": str(business_id), "$or": clauses})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    customer = invoice.get("customer_name") or invoice.get("client_name") or "there"
    invoice_number = invoice.get("invoice_number") or "your invoice"
    amount_due = _area6_invoice_value(invoice)
    due = invoice.get("due_date")
    message = (
        f"Hi {customer}, just a friendly reminder that {invoice_number} "
        f"for ${amount_due:,.2f} is still showing as unpaid"
        + (f" and was due on {str(due)[:10]}" if due else "")
        + ". Please let us know if you need the invoice link resent. Thanks."
    )

    now = datetime.now(timezone.utc)
    reminder = {
        "business_id": str(business_id),
        "invoice_id": str(invoice.get("_id") or invoice.get("id")),
        "customer_name": customer,
        "customer_email": invoice.get("customer_email") or invoice.get("email") or "",
        "customer_phone": invoice.get("customer_phone") or invoice.get("phone") or "",
        "invoice_number": invoice_number,
        "amount_due": amount_due,
        "message": message,
        "status": "draft",
        "type": "invoice_reminder",
        "created_at": now,
        "updated_at": now,
        "created_by": current_user.get("email") or current_user.get("id"),
    }

    inserted = await db.business_activity.insert_one(reminder)
    reminder["_id"] = inserted.inserted_id
    return {"success": True, "reminder": safe_doc(reminder), "message": message}




# CHURVOX_AREA7_CUSTOMER_RECORDS_20260531
# Customer records upgrade: CRM-style customer profile, sites, notes and history.
CUSTOMER_RECORD_FIELDS = {
    "name",
    "client_name",
    "email",
    "phone",
    "mobile",
    "billing_address",
    "address",
    "site_addresses",
    "site_contact",
    "billing_contact",
    "customer_type",
    "tags",
    "preferred_worker_id",
    "preferred_worker_name",
    "access_notes",
    "gate_code",
    "site_instructions",
    "internal_notes",
    "customer_message_draft",
    "last_contacted",
}

def _area7_id(doc: dict) -> str:
    return str((doc or {}).get("_id") or (doc or {}).get("id") or "")

def _area7_num(value, fallback=0.0):
    try:
        if value is None or value == "":
            return float(fallback)
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return float(fallback or 0)

def _area7_text(value):
    return str(value or "").strip()

def _area7_client_query(client_id: str, business_id: str) -> dict:
    clauses = [{"id": str(client_id)}]
    if ObjectId.is_valid(str(client_id)):
        clauses.insert(0, {"_id": ObjectId(str(client_id))})
    return {"business_id": str(business_id), "$or": clauses}

def _area7_matches_client(record: dict, client: dict) -> bool:
    cid = _area7_id(client)
    names = {
        _area7_text(client.get("name")).lower(),
        _area7_text(client.get("client_name")).lower(),
        _area7_text(client.get("contact_name")).lower(),
    }
    names.discard("")
    emails = {
        _area7_text(client.get("email")).lower(),
        _area7_text(client.get("customer_email")).lower(),
    }
    emails.discard("")

    record_client_id = _area7_text(record.get("client_id") or record.get("customer_id"))
    record_name = _area7_text(record.get("client_name") or record.get("customer_name") or record.get("name")).lower()
    record_email = _area7_text(record.get("customer_email") or record.get("email")).lower()

    return bool(
        (cid and record_client_id and record_client_id == cid)
        or (record_name and record_name in names)
        or (record_email and record_email in emails)
    )

def _area7_clean_customer_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid customer payload")

    cleaned = {}
    for key in CUSTOMER_RECORD_FIELDS:
        if key not in payload:
            continue
        value = payload.get(key)

        if key in {"site_addresses", "tags"}:
            if isinstance(value, list):
                cleaned[key] = [x for x in value if str(x).strip()] if key == "tags" else value
            else:
                cleaned[key] = [x.strip() for x in str(value or "").split(",") if x.strip()]
            continue

        cleaned[key] = _area7_text(value)

    if cleaned.get("name") and not cleaned.get("client_name"):
        cleaned["client_name"] = cleaned["name"]
    if cleaned.get("client_name") and not cleaned.get("name"):
        cleaned["name"] = cleaned["client_name"]

    return cleaned

def _area7_client_summary(client: dict, jobs: list, quotes: list, invoices: list) -> dict:
    completed_jobs = [j for j in jobs if str(j.get("status") or "").lower() in {"completed", "complete", "done"}]
    unpaid = [i for i in invoices if str(i.get("status") or "").lower() not in {"paid", "void", "cancelled"}]
    paid = [i for i in invoices if str(i.get("status") or "").lower() == "paid"]
    photos_count = 0
    for job in jobs:
        if isinstance(job.get("photos"), list):
            photos_count += len(job.get("photos"))
        if isinstance(job.get("job_photos"), list):
            photos_count += len(job.get("job_photos"))
        photos_count += int(_area7_num(job.get("photo_count"), 0))

    unpaid_balance = round(sum(_area7_num(i.get("amount_due") or i.get("balance_due") or i.get("total"), 0) for i in unpaid), 2)
    paid_total = round(sum(_area7_num(i.get("total") or i.get("amount") or i.get("amount_paid"), 0) for i in paid), 2)

    last_job = sorted(jobs, key=lambda j: str(j.get("updated_at") or j.get("created_at") or ""), reverse=True)[0] if jobs else None
    last_invoice = sorted(invoices, key=lambda i: str(i.get("updated_at") or i.get("created_at") or ""), reverse=True)[0] if invoices else None

    missing = []
    if not _area7_text(client.get("email")):
        missing.append("email")
    if not _area7_text(client.get("phone") or client.get("mobile")):
        missing.append("phone")
    if not _area7_text(client.get("address") or client.get("billing_address")):
        missing.append("address")

    return {
        "jobs_count": len(jobs),
        "completed_jobs_count": len(completed_jobs),
        "quotes_count": len(quotes),
        "invoices_count": len(invoices),
        "paid_invoices_count": len(paid),
        "unpaid_invoices_count": len(unpaid),
        "unpaid_balance": unpaid_balance,
        "paid_total": paid_total,
        "photos_count": photos_count,
        "last_job": safe_doc(last_job) if last_job else None,
        "last_invoice": safe_doc(last_invoice) if last_invoice else None,
        "missing_fields": missing,
        "is_missing_info": bool(missing),
    }

async def _area7_build_customer_record(client: dict, business_id: str) -> dict:
    jobs_raw = [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(1000)]
    quotes_raw = [safe_doc(q) async for q in db.quotes.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(1000)]
    invoices_raw = [safe_doc(i) async for i in db.invoices.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(1000)]

    jobs = [j for j in jobs_raw if _area7_matches_client(j, client)]
    quotes = [q for q in quotes_raw if _area7_matches_client(q, client)]
    invoices = [i for i in invoices_raw if _area7_matches_client(i, client)]

    record = safe_doc(client)
    record["id"] = _area7_id(client)
    record["name"] = client.get("name") or client.get("client_name") or client.get("contact_name") or "Unnamed customer"
    record["client_name"] = record["name"]
    record["email"] = client.get("email") or client.get("customer_email") or ""
    record["phone"] = client.get("phone") or client.get("mobile") or client.get("customer_phone") or ""
    record["billing_address"] = client.get("billing_address") or client.get("address") or ""
    record["site_addresses"] = client.get("site_addresses") if isinstance(client.get("site_addresses"), list) else []
    record["customer_type"] = client.get("customer_type") or "other"
    record["tags"] = client.get("tags") if isinstance(client.get("tags"), list) else []
    record["access_notes"] = client.get("access_notes") or client.get("site_notes") or ""
    record["site_instructions"] = client.get("site_instructions") or ""
    record["internal_notes"] = client.get("internal_notes") or client.get("notes") or ""
    record["customer_message_draft"] = client.get("customer_message_draft") or ""
    record["jobs"] = jobs[:80]
    record["quotes"] = quotes[:80]
    record["invoices"] = invoices[:80]
    record["summary"] = _area7_client_summary(client, jobs, quotes, invoices)
    return record

@api_router.get("/customer-records")
async def list_customer_records(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    clients = [c async for c in db.clients.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(500)]
    records = []
    for client in clients:
        records.append(await _area7_build_customer_record(client, business_id))

    totals = {
        "customers": len(records),
        "missing_info": len([r for r in records if r.get("summary", {}).get("is_missing_info")]),
        "unpaid_balance": round(sum(_area7_num(r.get("summary", {}).get("unpaid_balance"), 0) for r in records), 2),
        "jobs": sum(int(r.get("summary", {}).get("jobs_count") or 0) for r in records),
        "quotes": sum(int(r.get("summary", {}).get("quotes_count") or 0) for r in records),
        "invoices": sum(int(r.get("summary", {}).get("invoices_count") or 0) for r in records),
    }

    return {"success": True, "customers": records, "totals": totals}

@api_router.get("/customer-records/{client_id}")
async def get_customer_record(client_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    client = await db.clients.find_one(_area7_client_query(client_id, business_id))
    if not client:
        raise HTTPException(status_code=404, detail="Customer not found")
    record = await _area7_build_customer_record(client, business_id)
    return {"success": True, "customer": record}

@api_router.patch("/customer-records/{client_id}")
async def update_customer_record(client_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    client = await db.clients.find_one(_area7_client_query(client_id, business_id))
    if not client:
        raise HTTPException(status_code=404, detail="Customer not found")

    cleaned = _area7_clean_customer_payload(payload or {})
    cleaned["updated_at"] = datetime.now(timezone.utc)
    await db.clients.update_one({"_id": client["_id"], "business_id": str(business_id)}, {"$set": cleaned})
    saved = await db.clients.find_one({"_id": client["_id"]})
    return {"success": True, "customer": await _area7_build_customer_record(saved, business_id)}

@api_router.post("/customer-records/{client_id}/site-addresses")
async def add_customer_site_address(client_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    client = await db.clients.find_one(_area7_client_query(client_id, business_id))
    if not client:
        raise HTTPException(status_code=404, detail="Customer not found")

    site = {
        "label": _area7_text((payload or {}).get("label") or "Site"),
        "address": _area7_text((payload or {}).get("address")),
        "contact": _area7_text((payload or {}).get("contact")),
        "phone": _area7_text((payload or {}).get("phone")),
        "access_notes": _area7_text((payload or {}).get("access_notes")),
        "created_at": datetime.now(timezone.utc),
    }
    if not site["address"]:
        raise HTTPException(status_code=400, detail="Site address is required")

    sites = client.get("site_addresses") if isinstance(client.get("site_addresses"), list) else []
    sites.append(site)
    await db.clients.update_one({"_id": client["_id"], "business_id": str(business_id)}, {"$set": {"site_addresses": sites, "updated_at": datetime.now(timezone.utc)}})
    saved = await db.clients.find_one({"_id": client["_id"]})
    return {"success": True, "customer": await _area7_build_customer_record(saved, business_id)}

@api_router.post("/customer-records/{client_id}/notes")
async def add_customer_note(client_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    client = await db.clients.find_one(_area7_client_query(client_id, business_id))
    if not client:
        raise HTTPException(status_code=404, detail="Customer not found")

    note = _area7_text((payload or {}).get("note"))
    if not note:
        raise HTTPException(status_code=400, detail="Note is required")

    note_doc = {
        "business_id": str(business_id),
        "client_id": _area7_id(client),
        "type": "customer_note",
        "note": note,
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user.get("email") or current_user.get("id"),
    }
    await db.business_activity.insert_one(note_doc)

    existing = _area7_text(client.get("internal_notes") or client.get("notes"))
    merged = (existing + "\n" if existing else "") + f"- {note}"
    await db.clients.update_one({"_id": client["_id"], "business_id": str(business_id)}, {"$set": {"internal_notes": merged, "notes": merged, "updated_at": datetime.now(timezone.utc)}})
    saved = await db.clients.find_one({"_id": client["_id"]})
    return {"success": True, "customer": await _area7_build_customer_record(saved, business_id)}




# CHURVOX_AREA8_WORKER_CREW_OPERATIONS_20260531
# Worker / crew operations: owner crew desk + worker-safe job actions.
AREA8_WORKER_ROLES = {"worker", "employee", "field_worker", "crew", "staff"}
AREA8_OWNER_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "platform_owner"}

def _area8_role(current_user: dict) -> str:
    return str((current_user or {}).get("role") or "").lower().replace(" ", "_")

def _area8_doc_id(doc: dict) -> str:
    return str((doc or {}).get("_id") or (doc or {}).get("id") or "")

def _area8_text(value) -> str:
    return str(value or "").strip()

def _area8_num(value, fallback=0.0):
    try:
        if value is None or value == "":
            return float(fallback)
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return float(fallback or 0)

def _area8_job_query(job_id: str, business_id: str) -> dict:
    clauses = [{"id": str(job_id)}]
    if ObjectId.is_valid(str(job_id)):
        clauses.insert(0, {"_id": ObjectId(str(job_id))})
    return {"business_id": str(business_id), "$or": clauses}

def _area8_worker_query(worker_id: str, business_id: str) -> dict:
    clauses = [{"id": str(worker_id)}]
    if ObjectId.is_valid(str(worker_id)):
        clauses.insert(0, {"_id": ObjectId(str(worker_id))})
    return {"business_id": str(business_id), "$or": clauses}

def _area8_job_status(job: dict) -> str:
    return str(job.get("status") or job.get("job_status") or job.get("workflow_status") or "").lower().replace(" ", "_")

def _area8_is_completed(job: dict) -> bool:
    s = _area8_job_status(job)
    return s in {"completed", "complete", "done"} or bool(job.get("completed") or job.get("completed_at") or job.get("worker_completed_at"))

def _area8_worker_identity(current_user: dict) -> dict:
    return {
        "id": str(current_user.get("id") or current_user.get("_id") or ""),
        "email": _area8_text(current_user.get("email")).lower(),
        "name": _area8_text(current_user.get("name") or current_user.get("full_name") or current_user.get("display_name")),
    }

def _area8_assigned_to_current_worker(job: dict, current_user: dict) -> bool:
    ident = _area8_worker_identity(current_user)
    assigned_ids = {
        _area8_text(job.get("assigned_worker_id")),
        _area8_text(job.get("worker_id")),
        _area8_text(job.get("assigned_to")),
    }
    assigned_names = {
        _area8_text(job.get("assigned_worker_name")).lower(),
        _area8_text(job.get("worker_name")).lower(),
    }
    assigned_emails = {
        _area8_text(job.get("assigned_worker_email")).lower(),
        _area8_text(job.get("worker_email")).lower(),
    }
    return bool(
        (ident["id"] and ident["id"] in assigned_ids)
        or (ident["name"] and ident["name"].lower() in assigned_names)
        or (ident["email"] and ident["email"] in assigned_emails)
    )

def _area8_owner_or_assigned(job: dict, current_user: dict):
    role = _area8_role(current_user)
    if role in AREA8_OWNER_ROLES:
        return
    if role in AREA8_WORKER_ROLES and _area8_assigned_to_current_worker(job, current_user):
        return
    raise HTTPException(status_code=403, detail="You can only update jobs assigned to you.")

def _area8_worker_safe_job(job: dict) -> dict:
    safe = safe_doc(job)
    for key in [
        "price", "job_price", "fixed_price", "hourly_rate", "amount", "total",
        "subtotal", "gst_amount", "invoice_id", "draft_invoice_id", "invoice_number",
        "myob_invoice_id", "myob_invoice_number", "owner_notes", "internal_admin_notes",
        "billing_notes", "pricing_type"
    ]:
        safe.pop(key, None)
    return safe

def _area8_worker_name(worker: dict) -> str:
    return _area8_text(worker.get("name") or worker.get("full_name") or worker.get("display_name") or worker.get("email") or "Worker")

async def _area8_workers_for_business(business_id: str) -> list:
    workers = []
    seen = set()

    async for worker in db.business_users.find({"business_id": str(business_id)}).limit(500):
        wid = _area8_doc_id(worker)
        if wid in seen:
            continue
        seen.add(wid)
        workers.append(safe_doc(worker))

    async for user in db.users.find({"business_id": str(business_id), "role": {"$in": list(AREA8_WORKER_ROLES | AREA8_OWNER_ROLES)}}).limit(500):
        uid = _area8_doc_id(user)
        if uid in seen:
            continue
        seen.add(uid)
        workers.append(safe_doc(user))

    return workers

def _area8_worker_job_match(job: dict, worker: dict) -> bool:
    wid = _area8_doc_id(worker)
    name = _area8_worker_name(worker).lower()
    email = _area8_text(worker.get("email")).lower()
    return bool(
        (wid and wid in {_area8_text(job.get("assigned_worker_id")), _area8_text(job.get("worker_id")), _area8_text(job.get("assigned_to"))})
        or (name and name in {_area8_text(job.get("assigned_worker_name")).lower(), _area8_text(job.get("worker_name")).lower()})
        or (email and email in {_area8_text(job.get("assigned_worker_email")).lower(), _area8_text(job.get("worker_email")).lower()})
    )

def _area8_worker_summary(worker: dict, jobs: list) -> dict:
    assigned = [j for j in jobs if _area8_worker_job_match(j, worker)]
    active = [j for j in assigned if _area8_job_status(j) in {"in_progress", "started", "paused"}]
    today = datetime.now(timezone.utc).date().isoformat()
    today_jobs = [j for j in assigned if str(j.get("scheduled_date") or j.get("date") or "")[:10] == today]
    completed = [j for j in assigned if _area8_is_completed(j)]
    minutes = sum(int(_area8_num(j.get("time_spent_minutes") or j.get("total_minutes") or j.get("worked_minutes"), 0)) for j in assigned)

    return {
        "assigned_count": len(assigned),
        "active_count": len(active),
        "today_count": len(today_jobs),
        "completed_count": len(completed),
        "tracked_minutes": minutes,
        "tracked_hours": round(minutes / 60, 2),
        "status": "on_job" if active else ("busy_today" if today_jobs else "available"),
    }

def _area8_worker_conflicts(jobs: list, worker_id: str, scheduled_date: str, exclude_job_id: str = "") -> list:
    if not worker_id or not scheduled_date:
        return []
    target_day = str(scheduled_date)[:10]
    conflicts = []
    for job in jobs:
        jid = _area8_doc_id(job)
        if exclude_job_id and jid == exclude_job_id:
            continue
        if str(job.get("assigned_worker_id") or job.get("worker_id") or "") != str(worker_id):
            continue
        if str(job.get("scheduled_date") or job.get("date") or "")[:10] == target_day and _area8_job_status(job) not in {"completed", "cancelled", "canceled", "void"}:
            conflicts.append(safe_doc(job))
    return conflicts

@api_router.get("/crew-ops")
async def get_crew_operations(current_user: dict = Depends(get_current_user)):
    role = _area8_role(current_user)
    if role not in AREA8_OWNER_ROLES:
        raise HTTPException(status_code=403, detail="Crew operations is owner/admin only.")

    business_id = await get_user_business_id(current_user)
    workers = await _area8_workers_for_business(business_id)
    jobs = [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).sort("scheduled_date", 1).limit(1000)]

    worker_cards = []
    for worker in workers:
        worker_cards.append({
            **safe_doc(worker),
            "id": _area8_doc_id(worker),
            "display_name": _area8_worker_name(worker),
            "summary": _area8_worker_summary(worker, jobs),
        })

    unassigned = [
        j for j in jobs
        if not (j.get("assigned_worker_id") or j.get("worker_id") or j.get("assigned_worker_name"))
        and _area8_job_status(j) not in {"completed", "cancelled", "canceled", "void"}
    ]
    active = [j for j in jobs if _area8_job_status(j) in {"in_progress", "started", "paused"}]
    completed_review = [j for j in jobs if _area8_is_completed(j) and not (j.get("owner_approved") or str(j.get("owner_review_status") or "").lower() == "approved")]
    issues = [j for j in jobs if _area8_job_status(j) in {"blocked", "issue", "cannot_complete"} or j.get("cannot_complete_reason")]

    payroll_minutes = sum(int(_area8_num(j.get("time_spent_minutes") or j.get("total_minutes") or j.get("worked_minutes"), 0)) for j in jobs)

    return {
        "success": True,
        "crew_ops": {
            "workers": worker_cards,
            "jobs": jobs,
            "unassigned_jobs": unassigned,
            "active_jobs": active,
            "completed_needing_review": completed_review,
            "issue_jobs": issues,
            "metrics": {
                "workers": len(worker_cards),
                "available_workers": len([w for w in worker_cards if w.get("summary", {}).get("status") == "available"]),
                "active_jobs": len(active),
                "unassigned_jobs": len(unassigned),
                "completed_needing_review": len(completed_review),
                "issue_jobs": len(issues),
                "payroll_hours": round(payroll_minutes / 60, 2),
            },
        },
    }

@api_router.post("/crew-ops/jobs/{job_id}/assign-worker")
async def crew_ops_assign_worker(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    role = _area8_role(current_user)
    if role not in AREA8_OWNER_ROLES:
        raise HTTPException(status_code=403, detail="Only owner/admin can assign workers.")

    business_id = await get_user_business_id(current_user)
    job = await db.jobs.find_one(_area8_job_query(job_id, business_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    worker_id = _area8_text((payload or {}).get("worker_id") or (payload or {}).get("assigned_worker_id"))
    worker_name = _area8_text((payload or {}).get("worker_name") or (payload or {}).get("assigned_worker_name"))
    if not worker_id and not worker_name:
        raise HTTPException(status_code=400, detail="Worker is required")

    worker = None
    if worker_id:
        worker = await db.business_users.find_one(_area8_worker_query(worker_id, business_id)) or await db.users.find_one(_area8_worker_query(worker_id, business_id))
    if worker:
        worker_name = _area8_worker_name(worker)

    all_jobs = [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).limit(1000)]
    conflicts = _area8_worker_conflicts(all_jobs, worker_id, job.get("scheduled_date") or job.get("date") or "", exclude_job_id=_area8_doc_id(job))

    now = datetime.now(timezone.utc)
    update = {
        "assigned_worker_id": worker_id,
        "worker_id": worker_id,
        "assigned_worker_name": worker_name,
        "worker_name": worker_name,
        "status": "assigned" if _area8_job_status(job) in {"", "new", "quoted", "open"} else job.get("status", "assigned"),
        "updated_at": now,
    }
    await db.jobs.update_one({"_id": job["_id"], "business_id": str(business_id)}, {"$set": update})
    saved = await db.jobs.find_one({"_id": job["_id"]})
    return {"success": True, "job": safe_doc(saved), "conflicts": conflicts, "has_conflict": bool(conflicts)}

@api_router.get("/worker/ops")
async def get_worker_operations(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    role = _area8_role(current_user)
    if role not in AREA8_WORKER_ROLES and role not in AREA8_OWNER_ROLES:
        raise HTTPException(status_code=403, detail="Worker access required.")

    all_jobs = [j async for j in db.jobs.find({"business_id": str(business_id)}).sort("scheduled_date", 1).limit(1000)]
    if role in AREA8_WORKER_ROLES:
        jobs = [j for j in all_jobs if _area8_assigned_to_current_worker(j, current_user)]
    else:
        jobs = all_jobs

    safe_jobs = [_area8_worker_safe_job(j) for j in jobs]
    today = datetime.now(timezone.utc).date().isoformat()
    today_jobs = [j for j in safe_jobs if str(j.get("scheduled_date") or j.get("date") or "")[:10] == today]
    upcoming = [j for j in safe_jobs if str(j.get("scheduled_date") or j.get("date") or "")[:10] > today]
    active = [j for j in safe_jobs if _area8_job_status(j) in {"in_progress", "started", "paused"}]
    completed = [j for j in safe_jobs if _area8_is_completed(j)]
    issue_jobs = [j for j in safe_jobs if _area8_job_status(j) in {"blocked", "issue", "cannot_complete"} or j.get("cannot_complete_reason")]

    return {
        "success": True,
        "worker_ops": {
            "today_jobs": today_jobs,
            "upcoming_jobs": upcoming[:80],
            "active_jobs": active,
            "completed_jobs": completed[:80],
            "issue_jobs": issue_jobs,
            "all_jobs": safe_jobs,
            "metrics": {
                "today": len(today_jobs),
                "upcoming": len(upcoming),
                "active": len(active),
                "completed": len(completed),
                "issues": len(issue_jobs),
            },
        },
    }

async def _area8_update_worker_job(job_id: str, current_user: dict, update: dict) -> dict:
    business_id = await get_user_business_id(current_user)
    job = await db.jobs.find_one(_area8_job_query(job_id, business_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _area8_owner_or_assigned(job, current_user)

    update["updated_at"] = datetime.now(timezone.utc)
    await db.jobs.update_one({"_id": job["_id"], "business_id": str(business_id)}, {"$set": update})
    saved = await db.jobs.find_one({"_id": job["_id"]})
    return _area8_worker_safe_job(saved) if _area8_role(current_user) in AREA8_WORKER_ROLES else safe_doc(saved)

@api_router.post("/worker/jobs/{job_id}/start-work")
async def worker_start_job(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    location = (payload or {}).get("location") if isinstance((payload or {}).get("location"), dict) else {}
    update = {
        "status": "in_progress",
        "job_status": "in_progress",
        "started_at": now,
        "worker_started_at": now,
        "start_location": {
            "lat": location.get("lat"),
            "lng": location.get("lng"),
            "accuracy": location.get("accuracy"),
            "captured_at": now,
        } if location else {},
    }
    return {"success": True, "job": await _area8_update_worker_job(job_id, current_user, update)}

@api_router.post("/worker/jobs/{job_id}/pause-work")
async def worker_pause_job(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    update = {
        "status": "paused",
        "job_status": "paused",
        "paused_at": now,
        "pause_reason": _area8_text((payload or {}).get("reason") or "Paused by worker"),
    }
    return {"success": True, "job": await _area8_update_worker_job(job_id, current_user, update)}

@api_router.post("/worker/jobs/{job_id}/resume-work")
async def worker_resume_job(job_id: str, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    update = {
        "status": "in_progress",
        "job_status": "in_progress",
        "resumed_at": now,
    }
    return {"success": True, "job": await _area8_update_worker_job(job_id, current_user, update)}

@api_router.post("/worker/jobs/{job_id}/complete-work")
async def worker_complete_job(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    update = {
        "status": "completed",
        "job_status": "completed",
        "completed": True,
        "completed_at": now,
        "worker_completed_at": now,
        "completion_notes": _area8_text((payload or {}).get("completion_notes") or (payload or {}).get("notes")),
        "worker_completion_notes": _area8_text((payload or {}).get("completion_notes") or (payload or {}).get("notes")),
        "materials_used": (payload or {}).get("materials_used") if isinstance((payload or {}).get("materials_used"), list) else [],
        "owner_review_status": "needs_review",
        "work_review_status": "needs_review",
    }
    return {"success": True, "job": await _area8_update_worker_job(job_id, current_user, update)}

@api_router.post("/worker/jobs/{job_id}/report-issue")
async def worker_report_issue(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    reason = _area8_text((payload or {}).get("reason") or (payload or {}).get("cannot_complete_reason"))
    if not reason:
        raise HTTPException(status_code=400, detail="Issue reason is required")
    update = {
        "status": "cannot_complete",
        "job_status": "cannot_complete",
        "cannot_complete_reason": reason,
        "worker_issue_reported_at": datetime.now(timezone.utc),
        "owner_review_status": "needs_review",
    }
    return {"success": True, "job": await _area8_update_worker_job(job_id, current_user, update)}

@api_router.post("/worker/jobs/{job_id}/materials")
async def worker_add_materials(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    job = await db.jobs.find_one(_area8_job_query(job_id, business_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _area8_owner_or_assigned(job, current_user)

    materials = job.get("materials_used") if isinstance(job.get("materials_used"), list) else []
    incoming = (payload or {}).get("materials")
    if isinstance(incoming, list):
        for item in incoming:
            if isinstance(item, dict):
                materials.append({
                    "name": _area8_text(item.get("name") or item.get("description")),
                    "quantity": _area8_text(item.get("quantity") or item.get("qty")),
                    "note": _area8_text(item.get("note")),
                    "added_at": datetime.now(timezone.utc),
                })
    else:
        name = _area8_text((payload or {}).get("name") or (payload or {}).get("description"))
        if name:
            materials.append({
                "name": name,
                "quantity": _area8_text((payload or {}).get("quantity") or (payload or {}).get("qty")),
                "note": _area8_text((payload or {}).get("note")),
                "added_at": datetime.now(timezone.utc),
            })

    await db.jobs.update_one({"_id": job["_id"], "business_id": str(business_id)}, {"$set": {"materials_used": materials, "updated_at": datetime.now(timezone.utc)}})
    saved = await db.jobs.find_one({"_id": job["_id"]})
    return {"success": True, "job": _area8_worker_safe_job(saved) if _area8_role(current_user) in AREA8_WORKER_ROLES else safe_doc(saved)}

@api_router.post("/worker/jobs/{job_id}/photo-note")
async def worker_add_photo_note(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    job = await db.jobs.find_one(_area8_job_query(job_id, business_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _area8_owner_or_assigned(job, current_user)

    photo = _area8_text((payload or {}).get("photo_base64") or (payload or {}).get("url"))
    if photo and len(photo) > 900000:
        raise HTTPException(status_code=413, detail="Photo is too large.")
    note = _area8_text((payload or {}).get("note") or "Worker photo")
    photos = job.get("photos") if isinstance(job.get("photos"), list) else []
    photos.append({
        "url": photo,
        "note": note,
        "uploaded_at": datetime.now(timezone.utc),
        "uploaded_by": current_user.get("email") or current_user.get("id"),
        "source": "worker_ops",
    })

    await db.jobs.update_one({"_id": job["_id"], "business_id": str(business_id)}, {"$set": {"photos": photos, "photo_count": len(photos), "updated_at": datetime.now(timezone.utc)}})
    saved = await db.jobs.find_one({"_id": job["_id"]})
    return {"success": True, "job": _area8_worker_safe_job(saved) if _area8_role(current_user) in AREA8_WORKER_ROLES else safe_doc(saved)}




# CHURVOX_AREA9_DISPATCH_BOARD_20260531
# Dispatch board/calendar: jobs by day, worker, status, conflicts and assign/reschedule actions.
def _area9_doc_id(doc: dict) -> str:
    return str((doc or {}).get("_id") or (doc or {}).get("id") or "")

def _area9_text(value) -> str:
    return str(value or "").strip()

def _area9_status(job: dict) -> str:
    return str(job.get("status") or job.get("job_status") or job.get("workflow_status") or "open").lower().replace(" ", "_")

def _area9_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None

def _area9_day(value) -> str:
    dt = _area9_dt(value)
    if dt:
        return dt.date().isoformat()
    raw = str(value or "")
    return raw[:10] if len(raw) >= 10 else ""

def _area9_job_query(job_id: str, business_id: str) -> dict:
    clauses = [{"id": str(job_id)}]
    if ObjectId.is_valid(str(job_id)):
        clauses.insert(0, {"_id": ObjectId(str(job_id))})
    return {"business_id": str(business_id), "$or": clauses}

def _area9_worker_name(worker: dict) -> str:
    return _area9_text(worker.get("display_name") or worker.get("name") or worker.get("full_name") or worker.get("email") or "Worker")

async def _area9_workers_for_business(business_id: str) -> list:
    workers = []
    seen = set()

    try:
        async for worker in db.business_users.find({"business_id": str(business_id)}).limit(500):
            wid = _area9_doc_id(worker)
            if wid not in seen:
                seen.add(wid)
                workers.append(safe_doc(worker))
    except Exception:
        pass

    try:
        async for user in db.users.find({"business_id": str(business_id), "role": {"$in": ["worker", "employee", "field_worker", "crew", "staff", "manager", "office_admin"]}}).limit(500):
            uid = _area9_doc_id(user)
            if uid not in seen:
                seen.add(uid)
                workers.append(safe_doc(user))
    except Exception:
        pass

    return workers

def _area9_job_worker_id(job: dict) -> str:
    return _area9_text(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_to"))

def _area9_duration_minutes(job: dict) -> int:
    for key in ["estimated_duration", "duration_minutes", "estimated_duration_minutes", "duration"]:
        raw = job.get(key)
        try:
            if raw not in (None, ""):
                return max(15, int(float(raw)))
        except Exception:
            pass
    return 60

def _area9_start_minutes(job: dict) -> int:
    raw = _area9_text(job.get("scheduled_time") or job.get("time") or job.get("start_time"))
    if not raw:
        dt = _area9_dt(job.get("scheduled_date") or job.get("date"))
        if dt:
            return dt.hour * 60 + dt.minute
        return 9 * 60
    try:
        bits = raw.split(":")
        return int(bits[0]) * 60 + int(bits[1][:2])
    except Exception:
        return 9 * 60

def _area9_overlaps(a: dict, b: dict) -> bool:
    if _area9_day(a.get("scheduled_date") or a.get("date")) != _area9_day(b.get("scheduled_date") or b.get("date")):
        return False
    a_start = _area9_start_minutes(a)
    b_start = _area9_start_minutes(b)
    a_end = a_start + _area9_duration_minutes(a)
    b_end = b_start + _area9_duration_minutes(b)
    return max(a_start, b_start) < min(a_end, b_end)

def _area9_conflicts(job: dict, all_jobs: list, worker_id: str) -> list:
    if not worker_id:
        return []
    conflicts = []
    jid = _area9_doc_id(job)
    for other in all_jobs:
        if _area9_doc_id(other) == jid:
            continue
        if _area9_job_worker_id(other) != str(worker_id):
            continue
        if _area9_status(other) in {"completed", "cancelled", "canceled", "void"}:
            continue
        if _area9_overlaps(job, other):
            conflicts.append(safe_doc(other))
    return conflicts

@api_router.get("/dispatch-board")
async def get_dispatch_board(
    date_from: str = Query(default=""),
    date_to: str = Query(default=""),
    current_user: dict = Depends(get_current_user)
):
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    start = _area9_dt(date_from) or (now - timedelta(days=3))
    end = _area9_dt(date_to) or (now + timedelta(days=14))

    jobs = [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).sort("scheduled_date", 1).limit(1000)]
    workers = await _area9_workers_for_business(business_id)

    visible_jobs = []
    for job in jobs:
        day = _area9_day(job.get("scheduled_date") or job.get("date") or job.get("created_at"))
        if not day:
            visible_jobs.append(job)
            continue
        try:
            d = datetime.fromisoformat(day).replace(tzinfo=timezone.utc)
            if start.date() <= d.date() <= end.date():
                visible_jobs.append(job)
        except Exception:
            visible_jobs.append(job)

    by_day = {}
    by_worker = {}
    unassigned = []
    conflict_rows = []

    for job in visible_jobs:
        day = _area9_day(job.get("scheduled_date") or job.get("date")) or "unscheduled"
        by_day.setdefault(day, []).append(job)

        worker_id = _area9_job_worker_id(job)
        if worker_id:
            by_worker.setdefault(worker_id, []).append(job)
            conflicts = _area9_conflicts(job, visible_jobs, worker_id)
            if conflicts:
                conflict_rows.append({"job": job, "conflicts": conflicts})
        else:
            unassigned.append(job)

    return {
        "success": True,
        "dispatch": {
            "jobs": visible_jobs,
            "workers": workers,
            "by_day": by_day,
            "by_worker": by_worker,
            "unassigned_jobs": unassigned,
            "conflicts": conflict_rows,
            "metrics": {
                "jobs": len(visible_jobs),
                "workers": len(workers),
                "unassigned_jobs": len(unassigned),
                "conflicts": len(conflict_rows),
                "scheduled_days": len([k for k in by_day.keys() if k != "unscheduled"]),
            },
        },
    }

@api_router.post("/dispatch-board/jobs/{job_id}/assign")
async def dispatch_assign_job(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    job = await db.jobs.find_one(_area9_job_query(job_id, business_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    worker_id = _area9_text((payload or {}).get("worker_id") or (payload or {}).get("assigned_worker_id"))
    worker_name = _area9_text((payload or {}).get("worker_name") or (payload or {}).get("assigned_worker_name"))
    if worker_id:
        worker = None
        try:
            worker = await db.business_users.find_one({"business_id": str(business_id), "$or": [{"id": worker_id}, {"_id": ObjectId(worker_id)}] if ObjectId.is_valid(worker_id) else [{"id": worker_id}]})
        except Exception:
            worker = None
        if worker:
            worker_name = _area9_worker_name(worker)

    if not worker_id and not worker_name:
        raise HTTPException(status_code=400, detail="Worker is required")

    jobs = [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).limit(1000)]
    projected = {**safe_doc(job), "assigned_worker_id": worker_id}
    conflicts = _area9_conflicts(projected, jobs, worker_id)

    update = {
        "assigned_worker_id": worker_id,
        "worker_id": worker_id,
        "assigned_worker_name": worker_name,
        "worker_name": worker_name,
        "status": "assigned" if _area9_status(job) in {"", "open", "new", "quoted"} else job.get("status", "assigned"),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.jobs.update_one({"_id": job["_id"], "business_id": str(business_id)}, {"$set": update})
    saved = await db.jobs.find_one({"_id": job["_id"]})
    return {"success": True, "job": safe_doc(saved), "conflicts": conflicts, "has_conflict": bool(conflicts)}

@api_router.post("/dispatch-board/jobs/{job_id}/reschedule")
async def dispatch_reschedule_job(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    job = await db.jobs.find_one(_area9_job_query(job_id, business_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    scheduled_date = _area9_text((payload or {}).get("scheduled_date") or (payload or {}).get("date"))
    scheduled_time = _area9_text((payload or {}).get("scheduled_time") or (payload or {}).get("time"))
    duration = (payload or {}).get("estimated_duration") or (payload or {}).get("duration_minutes") or job.get("estimated_duration")

    if not scheduled_date:
        raise HTTPException(status_code=400, detail="Scheduled date is required")

    update = {
        "scheduled_date": scheduled_date,
        "date": scheduled_date,
        "scheduled_time": scheduled_time,
        "estimated_duration": int(float(duration or 60)),
        "updated_at": datetime.now(timezone.utc),
    }

    projected = {**safe_doc(job), **update}
    jobs = [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).limit(1000)]
    conflicts = _area9_conflicts(projected, jobs, _area9_job_worker_id(projected))

    await db.jobs.update_one({"_id": job["_id"], "business_id": str(business_id)}, {"$set": update})
    saved = await db.jobs.find_one({"_id": job["_id"]})
    return {"success": True, "job": safe_doc(saved), "conflicts": conflicts, "has_conflict": bool(conflicts)}




# CHURVOX_AREA10_INTEGRATIONS_WORKSPACE_20260531
# Integrations workspace: MYOB, SMS, email and sync visibility.
def _area10_text(value) -> str:
    return str(value or "").strip()

def _area10_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or "").lower() in {"1", "true", "yes", "on", "connected"}

def _area10_doc_id(doc: dict) -> str:
    return str((doc or {}).get("_id") or (doc or {}).get("id") or "")

def _area10_num(value, fallback=0.0):
    try:
        if value is None or value == "":
            return float(fallback)
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return float(fallback or 0)

async def _area10_get_accounting_settings(business_id: str) -> dict:
    doc = await db.accounting_settings.find_one({"business_id": str(business_id)}) or {}
    if not doc:
        doc = await db.business_settings.find_one({"business_id": str(business_id)}) or {}
    return safe_doc(doc) if doc else {}

async def _area10_get_sms_balance(business_id: str) -> dict:
    balance = 0
    try:
        row = await db.sms_balances.find_one({"business_id": str(business_id)}) or await db.sms_credits.find_one({"business_id": str(business_id)})
        if row:
            balance = int(_area10_num(row.get("balance") or row.get("credits") or row.get("sms_credits"), 0))
    except Exception:
        balance = 0

    try:
        sent_count = await db.sms_history.count_documents({"business_id": str(business_id)})
    except Exception:
        sent_count = 0

    return {"credits": balance, "sent_count": sent_count, "enabled": balance > 0}

async def _area10_invoice_sync_rows(business_id: str) -> list:
    invoices = [safe_doc(i) async for i in db.invoices.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(200)]
    rows = []
    for inv in invoices:
        sync_status = inv.get("myob_sync_status") or inv.get("sync_status") or "not_synced"
        rows.append({
            "id": _area10_doc_id(inv),
            "invoice_number": inv.get("invoice_number") or "Invoice",
            "customer_name": inv.get("customer_name") or inv.get("client_name") or "",
            "status": inv.get("status") or "draft",
            "total": _area10_num(inv.get("total") or inv.get("amount"), 0),
            "myob_sync_status": sync_status,
            "myob_payment_status": inv.get("myob_payment_status") or "",
            "myob_error": inv.get("myob_error") or inv.get("sync_error") or "",
            "myob_invoice_number": inv.get("myob_invoice_number") or "",
            "updated_at": inv.get("updated_at") or inv.get("created_at"),
        })
    return rows

@api_router.get("/integrations/workspace")
async def get_integrations_workspace(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    accounting = await _area10_get_accounting_settings(business_id)
    sms = await _area10_get_sms_balance(business_id)
    invoice_rows = await _area10_invoice_sync_rows(business_id)

    myob_mode = accounting.get("invoice_mode") or accounting.get("sync_mode") or ("myob_sync" if accounting.get("myob_connected") else "churvox_only")
    myob_connected = bool(accounting.get("myob_connected") or accounting.get("access_token") or accounting.get("myob_company_file_id"))
    failed_syncs = [row for row in invoice_rows if str(row.get("myob_sync_status") or "").lower() == "failed" or row.get("myob_error")]
    pending_syncs = [row for row in invoice_rows if str(row.get("myob_sync_status") or "").lower() in {"pending", "queued", "syncing"}]

    email_status = {
        "configured": bool(POSTMARK_API_KEY or RESEND_API_KEY or SMTP_PASSWORD),
        "provider": "Postmark" if POSTMARK_API_KEY else ("Resend" if RESEND_API_KEY else ("SMTP" if SMTP_PASSWORD else "Not configured")),
        "safe_message": "Email sending is configured." if (POSTMARK_API_KEY or RESEND_API_KEY or SMTP_PASSWORD) else "Email provider is not configured in this environment.",
    }

    return {
        "success": True,
        "integrations": {
            "myob": {
                "connected": myob_connected,
                "mode": myob_mode,
                "company_file_id": accounting.get("myob_company_file_id") or accounting.get("company_file_id") or "",
                "company_file_name": accounting.get("myob_company_file_name") or accounting.get("company_file_name") or "",
                "last_sync_at": accounting.get("myob_last_sync_at") or accounting.get("last_sync_at") or "",
                "sync_errors": len(failed_syncs),
                "pending_syncs": len(pending_syncs),
                "settings": accounting,
                "explain": {
                    "churvox_only": "Invoices stay in Churvox only. Nothing is sent to MYOB.",
                    "myob_sync": "Approved/sent invoices can sync to MYOB when MYOB is connected and the plan allows it.",
                    "myob_external": "MYOB remains the accounting source of truth. Churvox tracks references and payment status.",
                },
            },
            "sms": sms,
            "email": email_status,
            "future": [
                {"name": "Xero", "status": "future", "note": "Planned later. MYOB remains the first accounting integration."},
                {"name": "Fleet / GPS", "status": "future", "note": "Use job start proof now; full fleet tracking is not launch scope."},
                {"name": "Bank payments", "status": "future", "note": "Payment links and manual paid tracking are supported first."},
            ],
            "invoice_sync_rows": invoice_rows,
            "metrics": {
                "invoice_rows": len(invoice_rows),
                "failed_syncs": len(failed_syncs),
                "pending_syncs": len(pending_syncs),
                "sms_credits": sms.get("credits", 0),
                "email_configured": email_status["configured"],
                "myob_connected": myob_connected,
            },
        },
    }

@api_router.patch("/integrations/myob/settings")
async def patch_integrations_myob_settings(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    allowed_modes = {"churvox_only", "myob_sync", "myob_external"}
    mode = _area10_text((payload or {}).get("mode") or (payload or {}).get("invoice_mode") or (payload or {}).get("sync_mode") or "churvox_only")
    if mode not in allowed_modes:
        raise HTTPException(status_code=400, detail="Invalid MYOB sync mode")

    update = {
        "business_id": str(business_id),
        "invoice_mode": mode,
        "sync_mode": mode,
        "myob_company_file_id": _area10_text((payload or {}).get("company_file_id") or (payload or {}).get("myob_company_file_id")),
        "myob_company_file_name": _area10_text((payload or {}).get("company_file_name") or (payload or {}).get("myob_company_file_name")),
        "myob_connected": _area10_bool((payload or {}).get("myob_connected")),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.accounting_settings.update_one(
        {"business_id": str(business_id)},
        {"$set": update, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"success": True, "settings": await _area10_get_accounting_settings(business_id)}

@api_router.post("/integrations/myob/disconnect")
async def disconnect_integrations_myob(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    await db.accounting_settings.update_one(
        {"business_id": str(business_id)},
        {"$set": {
            "myob_connected": False,
            "access_token": "",
            "refresh_token": "",
            "invoice_mode": "churvox_only",
            "sync_mode": "churvox_only",
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {"success": True, "message": "MYOB disconnected for Churvox. Existing invoice records were not deleted."}

@api_router.post("/integrations/myob/invoices/{invoice_id}/retry")
async def retry_integrations_myob_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    clauses = [{"id": str(invoice_id)}]
    if ObjectId.is_valid(str(invoice_id)):
        clauses.insert(0, {"_id": ObjectId(str(invoice_id))})

    invoice = await db.invoices.find_one({"business_id": str(business_id), "$or": clauses})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    accounting = await _area10_get_accounting_settings(business_id)
    if not accounting.get("myob_connected"):
        await db.invoices.update_one(
            {"_id": invoice["_id"], "business_id": str(business_id)},
            {"$set": {
                "myob_sync_status": "failed",
                "myob_error": "MYOB is not connected.",
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        return {"success": False, "message": "MYOB is not connected. Connect MYOB before retrying sync."}

    await db.invoices.update_one(
        {"_id": invoice["_id"], "business_id": str(business_id)},
        {"$set": {
            "myob_sync_status": "queued",
            "myob_error": "",
            "myob_retry_requested_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    saved = await db.invoices.find_one({"_id": invoice["_id"]})
    return {"success": True, "invoice": safe_doc(saved), "message": "MYOB sync retry queued."}




# CHURVOX_AREA11_AUTOMATION_WORKSPACE_20260531
# Automation workspace: approval-first rules, templates and recent runs.
AUTOMATION_TEMPLATE_LIBRARY = [
    {
        "key": "job_completed_prepare_invoice",
        "name": "Job completed → prepare draft invoice",
        "description": "When a worker completes a job, prepare a draft invoice for owner review.",
        "trigger": "job_completed",
        "action": "prepare_invoice_draft",
        "approval_required": True,
        "risk_level": "medium",
    },
    {
        "key": "job_completed_photos_notify_owner",
        "name": "Job completed with photos → notify owner",
        "description": "When completed work has photos, surface it for owner review.",
        "trigger": "job_completed_with_photos",
        "action": "notify_owner",
        "approval_required": False,
        "risk_level": "low",
    },
    {
        "key": "invoice_overdue_prepare_reminder",
        "name": "Invoice overdue → prepare reminder",
        "description": "Prepare an overdue invoice reminder draft. Nothing sends without approval.",
        "trigger": "invoice_overdue",
        "action": "prepare_reminder_draft",
        "approval_required": True,
        "risk_level": "medium",
    },
    {
        "key": "quote_waiting_follow_up",
        "name": "Quote not accepted after X days → prepare follow-up",
        "description": "Prepare a quote follow-up draft for owner approval.",
        "trigger": "quote_waiting",
        "action": "prepare_quote_follow_up",
        "approval_required": True,
        "risk_level": "medium",
    },
    {
        "key": "client_missing_contact_flag",
        "name": "Client missing email/phone → flag cleanup",
        "description": "Flag customer records that are missing contact details.",
        "trigger": "client_missing_contact",
        "action": "flag_customer_cleanup",
        "approval_required": False,
        "risk_level": "low",
    },
    {
        "key": "job_unassigned_suggest_worker",
        "name": "Job unassigned → suggest worker",
        "description": "Suggest a worker based on availability and workload.",
        "trigger": "job_unassigned",
        "action": "suggest_worker_assignment",
        "approval_required": True,
        "risk_level": "medium",
    },
    {
        "key": "myob_paid_mark_paid",
        "name": "Invoice paid in MYOB → mark paid in Churvox",
        "description": "When MYOB payment sync exists, prepare a Churvox paid update.",
        "trigger": "myob_invoice_paid",
        "action": "prepare_mark_paid",
        "approval_required": True,
        "risk_level": "high",
    },
    {
        "key": "worker_cannot_complete_notify",
        "name": "Worker cannot complete job → notify owner/admin",
        "description": "Surface blocked field work immediately.",
        "trigger": "worker_cannot_complete",
        "action": "notify_owner",
        "approval_required": False,
        "risk_level": "low",
    },
]

def _area11_text(value) -> str:
    return str(value or "").strip()

def _area11_doc_id(doc: dict) -> str:
    return str((doc or {}).get("_id") or (doc or {}).get("id") or "")

def _area11_rule_key(value: str) -> str:
    key = _area11_text(value).lower().replace(" ", "_")
    return "".join(ch for ch in key if ch.isalnum() or ch in {"_", "-"}).strip("_")[:120] or secrets.token_urlsafe(8)

def _area11_default_rules(business_id: str) -> list:
    now = datetime.now(timezone.utc)
    rules = []
    for template in AUTOMATION_TEMPLATE_LIBRARY:
        rules.append({
            "id": template["key"],
            "business_id": str(business_id),
            "template_key": template["key"],
            "name": template["name"],
            "description": template["description"],
            "trigger": template["trigger"],
            "action": template["action"],
            "enabled": template["key"] in {"job_completed_photos_notify_owner", "client_missing_contact_flag", "worker_cannot_complete_notify"},
            "approval_required": bool(template["approval_required"]),
            "risk_level": template["risk_level"],
            "created_at": now,
            "updated_at": now,
            "source": "template",
        })
    return rules

async def _area11_seed_rules_if_empty(business_id: str):
    count = await db.automation_rules.count_documents({"business_id": str(business_id)})
    if count:
        return
    await db.automation_rules.insert_many(_area11_default_rules(str(business_id)))

async def _area11_recent_runs(business_id: str) -> list:
    try:
        return [safe_doc(r) async for r in db.automation_runs.find({"business_id": str(business_id)}).sort("created_at", -1).limit(120)]
    except Exception:
        return []

async def _area11_rule_metrics(business_id: str, rules: list) -> dict:
    runs = await _area11_recent_runs(business_id)
    failed = [r for r in runs if str(r.get("status") or "").lower() in {"failed", "error"}]
    prepared = [r for r in runs if str(r.get("status") or "").lower() in {"prepared", "pending_approval", "waiting_approval"}]
    return {
        "rules": len(rules),
        "enabled_rules": len([r for r in rules if r.get("enabled")]),
        "disabled_rules": len([r for r in rules if not r.get("enabled")]),
        "recent_runs": len(runs),
        "failed_runs": len(failed),
        "prepared_actions": len(prepared),
        "approval_required_rules": len([r for r in rules if r.get("approval_required")]),
    }

@api_router.get("/automation/workspace")
async def get_automation_workspace(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    await _area11_seed_rules_if_empty(str(business_id))

    rules = [safe_doc(r) async for r in db.automation_rules.find({"business_id": str(business_id)}).sort("created_at", 1).limit(300)]
    runs = await _area11_recent_runs(str(business_id))
    metrics = await _area11_rule_metrics(str(business_id), rules)

    return {
        "success": True,
        "automation": {
            "templates": AUTOMATION_TEMPLATE_LIBRARY,
            "rules": rules,
            "runs": runs,
            "metrics": metrics,
            "guardrails": [
                "Customer messages are drafted for approval before sending.",
                "Pricing, payroll, MYOB records, billing and deleting data require explicit owner approval.",
                "Automations prepare work; owners approve important actions.",
                "Every run should leave an activity/audit trail.",
            ],
        },
    }

@api_router.post("/automation/rules")
async def create_automation_rule(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    template_key = _area11_text((payload or {}).get("template_key"))
    template = next((t for t in AUTOMATION_TEMPLATE_LIBRARY if t["key"] == template_key), None)

    now = datetime.now(timezone.utc)
    name = _area11_text((payload or {}).get("name") or (template or {}).get("name"))
    if not name:
        raise HTTPException(status_code=400, detail="Rule name is required")

    rule = {
        "business_id": str(business_id),
        "template_key": template_key or "",
        "name": name,
        "description": _area11_text((payload or {}).get("description") or (template or {}).get("description")),
        "trigger": _area11_text((payload or {}).get("trigger") or (template or {}).get("trigger")),
        "action": _area11_text((payload or {}).get("action") or (template or {}).get("action")),
        "enabled": bool((payload or {}).get("enabled", True)),
        "approval_required": bool((payload or {}).get("approval_required", (template or {}).get("approval_required", True))),
        "risk_level": _area11_text((payload or {}).get("risk_level") or (template or {}).get("risk_level") or "medium"),
        "conditions": (payload or {}).get("conditions") if isinstance((payload or {}).get("conditions"), dict) else {},
        "created_at": now,
        "updated_at": now,
        "source": "custom",
    }
    inserted = await db.automation_rules.insert_one(rule)
    rule["_id"] = inserted.inserted_id
    return {"success": True, "rule": safe_doc(rule)}

@api_router.patch("/automation/rules/{rule_id}")
async def update_automation_rule(rule_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    clauses = [{"id": str(rule_id)}, {"template_key": str(rule_id)}]
    if ObjectId.is_valid(str(rule_id)):
        clauses.insert(0, {"_id": ObjectId(str(rule_id))})

    rule = await db.automation_rules.find_one({"business_id": str(business_id), "$or": clauses})
    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")

    allowed = {"name", "description", "trigger", "action", "enabled", "approval_required", "risk_level", "conditions"}
    update = {}
    for key in allowed:
        if key in (payload or {}):
            if key in {"enabled", "approval_required"}:
                update[key] = bool((payload or {}).get(key))
            elif key == "conditions":
                update[key] = (payload or {}).get(key) if isinstance((payload or {}).get(key), dict) else {}
            else:
                update[key] = _area11_text((payload or {}).get(key))
    update["updated_at"] = datetime.now(timezone.utc)

    await db.automation_rules.update_one({"_id": rule["_id"], "business_id": str(business_id)}, {"$set": update})
    saved = await db.automation_rules.find_one({"_id": rule["_id"]})
    return {"success": True, "rule": safe_doc(saved)}

@api_router.post("/automation/rules/{rule_id}/toggle")
async def toggle_automation_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    clauses = [{"id": str(rule_id)}, {"template_key": str(rule_id)}]
    if ObjectId.is_valid(str(rule_id)):
        clauses.insert(0, {"_id": ObjectId(str(rule_id))})

    rule = await db.automation_rules.find_one({"business_id": str(business_id), "$or": clauses})
    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")

    await db.automation_rules.update_one(
        {"_id": rule["_id"], "business_id": str(business_id)},
        {"$set": {"enabled": not bool(rule.get("enabled")), "updated_at": datetime.now(timezone.utc)}}
    )
    saved = await db.automation_rules.find_one({"_id": rule["_id"]})
    return {"success": True, "rule": safe_doc(saved)}

@api_router.post("/automation/rules/{rule_id}/test-run")
async def test_run_automation_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    clauses = [{"id": str(rule_id)}, {"template_key": str(rule_id)}]
    if ObjectId.is_valid(str(rule_id)):
        clauses.insert(0, {"_id": ObjectId(str(rule_id))})

    rule = await db.automation_rules.find_one({"business_id": str(business_id), "$or": clauses})
    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")

    now = datetime.now(timezone.utc)
    run = {
        "business_id": str(business_id),
        "rule_id": _area11_doc_id(rule),
        "template_key": rule.get("template_key") or "",
        "rule_name": rule.get("name") or "Automation rule",
        "trigger": rule.get("trigger") or "",
        "action": rule.get("action") or "",
        "status": "prepared" if rule.get("approval_required") else "completed",
        "approval_required": bool(rule.get("approval_required")),
        "risk_level": rule.get("risk_level") or "medium",
        "result": "Test run created. No customer message was sent and no external system was changed.",
        "created_at": now,
        "updated_at": now,
        "created_by": current_user.get("email") or current_user.get("id"),
    }
    inserted = await db.automation_runs.insert_one(run)
    run["_id"] = inserted.inserted_id
    return {"success": True, "run": safe_doc(run)}




# CHURVOX_AREA12_AI_OPERATOR_REAL_ACTIONS_20260531
# AI Operator real actions: owner approval queue with executable actions.
def _area12_text(value) -> str:
    return str(value or "").strip()

def _area12_doc_id(doc: dict) -> str:
    return str((doc or {}).get("_id") or (doc or {}).get("id") or "")

def _area12_num(value, fallback=0.0):
    try:
        if value is None or value == "":
            return float(fallback)
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return float(fallback or 0)

def _area12_status(doc: dict) -> str:
    return str((doc or {}).get("status") or "").lower().replace(" ", "_")

def _area12_action_key(action_type: str, record_type: str, record_id: str) -> str:
    raw = f"{action_type}:{record_type}:{record_id}"
    return raw[:220]

def _area12_lookup_query(record_id: str, business_id: str) -> dict:
    clauses = [{"id": str(record_id)}]
    if ObjectId.is_valid(str(record_id)):
        clauses.insert(0, {"_id": ObjectId(str(record_id))})
    return {"business_id": str(business_id), "$or": clauses}

def _area12_completed_job(job: dict) -> bool:
    status = _area12_status(job)
    return status in {"completed", "complete", "done"} or bool(job.get("completed") or job.get("completed_at") or job.get("worker_completed_at"))

def _area12_has_invoice(job: dict) -> bool:
    return bool(job.get("invoice_id") or job.get("draft_invoice_id") or job.get("invoiced"))

def _area12_invoice_due(invoice: dict) -> float:
    return max(
        _area12_num(invoice.get("amount_due"), 0),
        _area12_num(invoice.get("balance_due"), 0),
        _area12_num(invoice.get("remaining_balance"), 0),
        _area12_num(invoice.get("total"), 0),
    )

def _area12_due_date_passed(invoice: dict) -> bool:
    if _area12_status(invoice) in {"paid", "void", "cancelled"}:
        return False
    raw = invoice.get("due_date")
    if not raw:
        return _area12_status(invoice) == "overdue"
    try:
        due = raw if isinstance(raw, datetime) else datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return due < datetime.now(timezone.utc)
    except Exception:
        return _area12_status(invoice) == "overdue"

async def _area12_workers_for_business(business_id: str) -> list:
    workers = []
    seen = set()
    try:
        async for worker in db.business_users.find({"business_id": str(business_id)}).limit(500):
            wid = _area12_doc_id(worker)
            if wid not in seen:
                seen.add(wid)
                workers.append(safe_doc(worker))
    except Exception:
        pass
    try:
        async for user in db.users.find({"business_id": str(business_id), "role": {"$in": ["worker", "employee", "crew", "field_worker", "staff"]}}).limit(500):
            uid = _area12_doc_id(user)
            if uid not in seen:
                seen.add(uid)
                workers.append(safe_doc(user))
    except Exception:
        pass
    return workers

def _area12_worker_name(worker: dict) -> str:
    return _area12_text(worker.get("display_name") or worker.get("name") or worker.get("full_name") or worker.get("email") or "Worker")

async def _area12_upsert_action(business_id: str, action: dict):
    now = datetime.now(timezone.utc)
    action["business_id"] = str(business_id)
    action["status"] = action.get("status") or "pending"
    action["created_at"] = action.get("created_at") or now
    action["updated_at"] = now
    action["approval_required"] = True
    action["source"] = "ai_operator_area12"

    existing = await db.ai_operator_actions.find_one({
        "business_id": str(business_id),
        "action_key": action["action_key"],
    })

    if existing and str(existing.get("status") or "").lower() in {"approved", "rejected", "completed"}:
        return safe_doc(existing)

    await db.ai_operator_actions.update_one(
        {"business_id": str(business_id), "action_key": action["action_key"]},
        {"$set": action, "$setOnInsert": {"created_at": action["created_at"]}},
        upsert=True,
    )
    saved = await db.ai_operator_actions.find_one({"business_id": str(business_id), "action_key": action["action_key"]})
    return safe_doc(saved)

async def _area12_generate_actions(business_id: str):
    jobs = [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(500)]
    invoices = [safe_doc(i) async for i in db.invoices.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(500)]
    clients = [safe_doc(c) async for c in db.clients.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(500)]
    workers = await _area12_workers_for_business(str(business_id))

    for job in jobs:
        jid = _area12_doc_id(job)

        if _area12_completed_job(job) and not _area12_has_invoice(job):
            price = _area12_num(job.get("price") or job.get("job_price") or job.get("total") or job.get("amount"), 0)
            desc = job.get("ai_invoice_description") or job.get("invoice_description_draft") or job.get("description") or job.get("title") or "Service work completed"
            await _area12_upsert_action(str(business_id), {
                "action_key": _area12_action_key("create_invoice_draft", "job", jid),
                "action_type": "create_invoice_draft",
                "record_type": "job",
                "record_id": jid,
                "title": f"Prepare draft invoice for {job.get('customer_name') or job.get('client_name') or 'completed job'}",
                "reason": "The worker completed this job and there is no linked invoice yet.",
                "data_used": {
                    "job_status": job.get("status"),
                    "customer": job.get("customer_name") or job.get("client_name"),
                    "price": price,
                    "address": job.get("address") or job.get("site_address"),
                },
                "proposed_changes": {
                    "create_invoice": True,
                    "job_id": jid,
                    "description": desc,
                    "line_items": [{"description": desc, "quantity": 1, "unit_price": price, "amount": price}],
                    "status": "draft",
                },
                "editable_payload": {
                    "description": desc,
                    "amount": price,
                },
                "risk_level": "medium",
                "confidence": 0.9 if price else 0.68,
            })

        if not (job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_worker_name")) and _area12_status(job) not in {"completed", "cancelled", "canceled", "void"}:
            suggested = workers[0] if workers else {}
            await _area12_upsert_action(str(business_id), {
                "action_key": _area12_action_key("suggest_worker_assignment", "job", jid),
                "action_type": "suggest_worker_assignment",
                "record_type": "job",
                "record_id": jid,
                "title": f"Suggest worker for {job.get('title') or job.get('customer_name') or 'unassigned job'}",
                "reason": "This job has no assigned worker. Churvox can prepare an assignment for owner approval.",
                "data_used": {
                    "job_date": job.get("scheduled_date") or job.get("date"),
                    "area": job.get("region") or job.get("area") or job.get("address"),
                    "available_worker_count": len(workers),
                },
                "proposed_changes": {
                    "assigned_worker_id": _area12_doc_id(suggested),
                    "assigned_worker_name": _area12_worker_name(suggested) if suggested else "",
                },
                "editable_payload": {
                    "worker_id": _area12_doc_id(suggested),
                    "worker_name": _area12_worker_name(suggested) if suggested else "",
                },
                "risk_level": "medium",
                "confidence": 0.74 if suggested else 0.35,
            })

        if _area12_status(job) in {"cannot_complete", "blocked", "issue"} or job.get("cannot_complete_reason"):
            await _area12_upsert_action(str(business_id), {
                "action_key": _area12_action_key("review_worker_issue", "job", jid),
                "action_type": "review_worker_issue",
                "record_type": "job",
                "record_id": jid,
                "title": f"Review worker issue on {job.get('title') or job.get('customer_name') or 'job'}",
                "reason": job.get("cannot_complete_reason") or "Worker reported an issue.",
                "data_used": {"status": job.get("status"), "worker": job.get("assigned_worker_name"), "address": job.get("address")},
                "proposed_changes": {"flag_for_owner_review": True, "owner_review_status": "needs_review"},
                "editable_payload": {"owner_note": job.get("cannot_complete_reason") or "Review worker issue."},
                "risk_level": "low",
                "confidence": 0.92,
            })

    for invoice in invoices:
        iid = _area12_doc_id(invoice)
        if _area12_due_date_passed(invoice):
            amount_due = _area12_invoice_due(invoice)
            customer = invoice.get("customer_name") or invoice.get("client_name") or "there"
            message = f"Hi {customer}, just a friendly reminder that {invoice.get('invoice_number') or 'your invoice'} for ${amount_due:,.2f} is still showing as unpaid. Please let us know if you need the invoice link resent. Thanks."
            await _area12_upsert_action(str(business_id), {
                "action_key": _area12_action_key("draft_overdue_invoice_reminder", "invoice", iid),
                "action_type": "draft_overdue_invoice_reminder",
                "record_type": "invoice",
                "record_id": iid,
                "title": f"Prepare overdue reminder for {invoice.get('invoice_number') or 'invoice'}",
                "reason": "This invoice is overdue or marked overdue and still has an amount due.",
                "data_used": {"status": invoice.get("status"), "amount_due": amount_due, "due_date": invoice.get("due_date")},
                "proposed_changes": {"message_draft": message, "send_now": False},
                "editable_payload": {"message": message},
                "risk_level": "medium",
                "confidence": 0.88,
            })

        if invoice.get("myob_error") or str(invoice.get("myob_sync_status") or "").lower() == "failed":
            await _area12_upsert_action(str(business_id), {
                "action_key": _area12_action_key("flag_myob_sync_issue", "invoice", iid),
                "action_type": "flag_myob_sync_issue",
                "record_type": "invoice",
                "record_id": iid,
                "title": f"Review MYOB sync issue for {invoice.get('invoice_number') or 'invoice'}",
                "reason": invoice.get("myob_error") or "MYOB sync failed.",
                "data_used": {"sync_status": invoice.get("myob_sync_status"), "error": invoice.get("myob_error")},
                "proposed_changes": {"flag_sync_issue": True},
                "editable_payload": {"note": invoice.get("myob_error") or "Review MYOB sync issue."},
                "risk_level": "low",
                "confidence": 0.9,
            })

    for client in clients:
        missing = []
        if not _area12_text(client.get("email")):
            missing.append("email")
        if not _area12_text(client.get("phone") or client.get("mobile")):
            missing.append("phone")
        if missing:
            cid = _area12_doc_id(client)
            await _area12_upsert_action(str(business_id), {
                "action_key": _area12_action_key("flag_customer_cleanup", "client", cid),
                "action_type": "flag_customer_cleanup",
                "record_type": "client",
                "record_id": cid,
                "title": f"Clean up missing customer info for {client.get('client_name') or client.get('name') or 'customer'}",
                "reason": f"Customer is missing: {', '.join(missing)}.",
                "data_used": {"missing_fields": missing},
                "proposed_changes": {"customer_cleanup_flag": True, "missing_fields": missing},
                "editable_payload": {"note": f"Missing customer info: {', '.join(missing)}"},
                "risk_level": "low",
                "confidence": 0.96,
            })

@api_router.get("/ai-operator/actions")
async def get_ai_operator_actions(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    await _area12_generate_actions(str(business_id))

    actions = [safe_doc(a) async for a in db.ai_operator_actions.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(250)]
    pending = [a for a in actions if str(a.get("status") or "pending").lower() in {"pending", "edited", "prepared"}]
    approved = [a for a in actions if str(a.get("status") or "").lower() in {"approved", "completed"}]
    rejected = [a for a in actions if str(a.get("status") or "").lower() == "rejected"]

    return {
        "success": True,
        "ai_operator": {
            "actions": actions,
            "pending_actions": pending,
            "approved_actions": approved[:50],
            "rejected_actions": rejected[:50],
            "metrics": {
                "total_actions": len(actions),
                "pending": len(pending),
                "approved": len(approved),
                "rejected": len(rejected),
                "high_risk": len([a for a in pending if a.get("risk_level") == "high"]),
                "medium_risk": len([a for a in pending if a.get("risk_level") == "medium"]),
            },
            "guardrails": [
                "AI prepares actions. Owner approves before important changes.",
                "AI does not auto-send customer messages.",
                "AI does not charge customers, change payroll, delete records, change billing, or alter MYOB records without explicit approval.",
            ],
        },
    }

@api_router.patch("/ai-operator/actions/{action_id}")
async def update_ai_operator_action(action_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    clauses = [{"id": str(action_id)}, {"action_key": str(action_id)}]
    if ObjectId.is_valid(str(action_id)):
        clauses.insert(0, {"_id": ObjectId(str(action_id))})

    action = await db.ai_operator_actions.find_one({"business_id": str(business_id), "$or": clauses})
    if not action:
        raise HTTPException(status_code=404, detail="AI action not found")

    update = {
        "editable_payload": (payload or {}).get("editable_payload") if isinstance((payload or {}).get("editable_payload"), dict) else action.get("editable_payload", {}),
        "status": "edited",
        "updated_at": datetime.now(timezone.utc),
        "edited_by": current_user.get("email") or current_user.get("id"),
    }
    await db.ai_operator_actions.update_one({"_id": action["_id"], "business_id": str(business_id)}, {"$set": update})
    saved = await db.ai_operator_actions.find_one({"_id": action["_id"]})
    return {"success": True, "action": safe_doc(saved)}

@api_router.post("/ai-operator/actions/{action_id}/reject")
async def reject_ai_operator_action(action_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    clauses = [{"id": str(action_id)}, {"action_key": str(action_id)}]
    if ObjectId.is_valid(str(action_id)):
        clauses.insert(0, {"_id": ObjectId(str(action_id))})

    action = await db.ai_operator_actions.find_one({"business_id": str(business_id), "$or": clauses})
    if not action:
        raise HTTPException(status_code=404, detail="AI action not found")

    await db.ai_operator_actions.update_one(
        {"_id": action["_id"], "business_id": str(business_id)},
        {"$set": {
            "status": "rejected",
            "rejected_at": datetime.now(timezone.utc),
            "reject_reason": _area12_text((payload or {}).get("reason") or "Rejected by owner"),
            "updated_at": datetime.now(timezone.utc),
            "rejected_by": current_user.get("email") or current_user.get("id"),
        }}
    )
    saved = await db.ai_operator_actions.find_one({"_id": action["_id"]})
    return {"success": True, "action": safe_doc(saved)}

@api_router.post("/ai-operator/actions/{action_id}/approve")
async def approve_ai_operator_action(action_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    clauses = [{"id": str(action_id)}, {"action_key": str(action_id)}]
    if ObjectId.is_valid(str(action_id)):
        clauses.insert(0, {"_id": ObjectId(str(action_id))})

    action = await db.ai_operator_actions.find_one({"business_id": str(business_id), "$or": clauses})
    if not action:
        raise HTTPException(status_code=404, detail="AI action not found")

    status = str(action.get("status") or "").lower()
    if status in {"approved", "completed"}:
        return {"success": True, "action": safe_doc(action), "message": "Action was already approved."}

    action_type = action.get("action_type")
    record_id = _area12_text(action.get("record_id"))
    payload = action.get("editable_payload") if isinstance(action.get("editable_payload"), dict) else {}
    result = {"message": "Action approved."}
    now = datetime.now(timezone.utc)

    if action_type == "create_invoice_draft":
        job = await db.jobs.find_one(_area12_lookup_query(record_id, business_id))
        if not job:
            raise HTTPException(status_code=404, detail="Linked job not found")

        existing_invoice_id = job.get("invoice_id") or job.get("draft_invoice_id")
        if existing_invoice_id:
            existing = await db.invoices.find_one(_area12_lookup_query(str(existing_invoice_id), business_id))
            if existing:
                result = {"message": "Job already had an invoice.", "invoice_id": _area12_doc_id(existing)}
            else:
                existing_invoice_id = None

        if not existing_invoice_id:
            amount = _area12_num(payload.get("amount") or job.get("price") or job.get("job_price") or job.get("total"), 0)
            desc = payload.get("description") or job.get("ai_invoice_description") or job.get("invoice_description_draft") or job.get("description") or "Service work completed"
            invoice_payload = {
                "job_id": _area12_doc_id(job),
                "linked_job_id": _area12_doc_id(job),
                "quote_id": job.get("quote_id") or job.get("linked_quote_id") or "",
                "client_id": job.get("client_id"),
                "customer_name": job.get("customer_name") or job.get("client_name") or "Customer",
                "customer_email": job.get("customer_email") or job.get("email") or "",
                "customer_phone": job.get("customer_phone") or job.get("phone") or "",
                "address": job.get("address") or job.get("site_address") or "",
                "site_address": job.get("site_address") or job.get("address") or "",
                "description": desc,
                "line_items": [{"description": desc, "quantity": 1, "unit_price": amount, "amount": amount}],
                "subtotal": amount,
                "status": "draft",
                "source": "ai_operator_approved",
            }
            invoice_doc = await _area4_prepare_invoice_doc(invoice_payload, current_user) if "_area4_prepare_invoice_doc" in globals() else {
                **invoice_payload,
                "business_id": str(business_id),
                "created_at": now,
                "updated_at": now,
                "public_token": secrets.token_urlsafe(24),
                "total": amount,
                "amount_due": amount,
            }
            inserted = await db.invoices.insert_one(invoice_doc)
            await db.jobs.update_one({"_id": job["_id"], "business_id": str(business_id)}, {"$set": {"draft_invoice_id": str(inserted.inserted_id), "invoice_id": str(inserted.inserted_id), "invoiced": True, "updated_at": now}})
            result = {"message": "Draft invoice created.", "invoice_id": str(inserted.inserted_id)}

    elif action_type == "suggest_worker_assignment":
        job = await db.jobs.find_one(_area12_lookup_query(record_id, business_id))
        if not job:
            raise HTTPException(status_code=404, detail="Linked job not found")
        worker_id = _area12_text(payload.get("worker_id") or action.get("proposed_changes", {}).get("assigned_worker_id"))
        worker_name = _area12_text(payload.get("worker_name") or action.get("proposed_changes", {}).get("assigned_worker_name"))
        if not worker_id and not worker_name:
            raise HTTPException(status_code=400, detail="Choose a worker before approving this action")
        await db.jobs.update_one({"_id": job["_id"], "business_id": str(business_id)}, {"$set": {"assigned_worker_id": worker_id, "worker_id": worker_id, "assigned_worker_name": worker_name, "worker_name": worker_name, "status": "assigned", "updated_at": now}})
        result = {"message": "Worker assigned.", "job_id": _area12_doc_id(job), "worker_name": worker_name}

    elif action_type == "draft_overdue_invoice_reminder":
        invoice = await db.invoices.find_one(_area12_lookup_query(record_id, business_id))
        if not invoice:
            raise HTTPException(status_code=404, detail="Linked invoice not found")
        message = payload.get("message") or action.get("proposed_changes", {}).get("message_draft") or "Invoice reminder prepared."
        reminder = {
            "business_id": str(business_id),
            "type": "ai_invoice_reminder_draft",
            "invoice_id": _area12_doc_id(invoice),
            "message": message,
            "status": "draft",
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("email") or current_user.get("id"),
        }
        inserted = await db.business_activity.insert_one(reminder)
        result = {"message": "Reminder draft saved.", "activity_id": str(inserted.inserted_id)}

    elif action_type == "flag_customer_cleanup":
        client = await db.clients.find_one(_area12_lookup_query(record_id, business_id))
        if not client:
            raise HTTPException(status_code=404, detail="Linked customer not found")
        await db.clients.update_one({"_id": client["_id"], "business_id": str(business_id)}, {"$set": {"customer_cleanup_flag": True, "cleanup_note": payload.get("note") or action.get("reason"), "updated_at": now}})
        result = {"message": "Customer cleanup flag saved.", "client_id": _area12_doc_id(client)}

    elif action_type in {"flag_myob_sync_issue", "review_worker_issue"}:
        activity = {
            "business_id": str(business_id),
            "type": f"ai_{action_type}",
            "record_type": action.get("record_type"),
            "record_id": record_id,
            "note": payload.get("note") or payload.get("owner_note") or action.get("reason"),
            "status": "review_required",
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("email") or current_user.get("id"),
        }
        inserted = await db.business_activity.insert_one(activity)
        result = {"message": "Review activity saved.", "activity_id": str(inserted.inserted_id)}

    else:
        activity = {
            "business_id": str(business_id),
            "type": "ai_operator_generic_approval",
            "record_type": action.get("record_type"),
            "record_id": record_id,
            "note": action.get("title") or "AI action approved",
            "payload": payload,
            "status": "approved",
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("email") or current_user.get("id"),
        }
        inserted = await db.business_activity.insert_one(activity)
        result = {"message": "Generic AI action approval logged.", "activity_id": str(inserted.inserted_id)}

    await db.ai_operator_actions.update_one(
        {"_id": action["_id"], "business_id": str(business_id)},
        {"$set": {
            "status": "approved",
            "approved_at": now,
            "updated_at": now,
            "approved_by": current_user.get("email") or current_user.get("id"),
            "executed_result": result,
        }}
    )
    saved = await db.ai_operator_actions.find_one({"_id": action["_id"]})
    return {"success": True, "action": safe_doc(saved), "result": result}




# CHURVOX_AREA13_REPORTS_SECURITY_DATA_20260531
# Reports / export / trust / security / data control.
def _area13_text(value) -> str:
    return str(value or "").strip()

def _area13_doc_id(doc: dict) -> str:
    return str((doc or {}).get("_id") or (doc or {}).get("id") or "")

def _area13_num(value, fallback=0.0):
    try:
        if value is None or value == "":
            return float(fallback)
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return float(fallback or 0)

def _area13_status(doc: dict) -> str:
    return str((doc or {}).get("status") or "").lower().replace(" ", "_")

def _area13_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None

def _area13_in_range(doc: dict, start_dt, end_dt) -> bool:
    if not start_dt and not end_dt:
        return True
    dt = _area13_dt(doc.get("created_at") or doc.get("updated_at") or doc.get("completed_at") or doc.get("paid_at"))
    if not dt:
        return True
    if start_dt and dt < start_dt:
        return False
    if end_dt and dt > end_dt:
        return False
    return True

def _area13_invoice_total(invoice: dict) -> float:
    return _area13_num(invoice.get("total") or invoice.get("amount") or invoice.get("subtotal"), 0)

def _area13_invoice_due(invoice: dict) -> float:
    return max(
        _area13_num(invoice.get("amount_due"), 0),
        _area13_num(invoice.get("balance_due"), 0),
        _area13_num(invoice.get("remaining_balance"), 0),
        _area13_invoice_total(invoice) - _area13_num(invoice.get("amount_paid") or invoice.get("paid_amount"), 0),
    )

def _area13_is_overdue(invoice: dict) -> bool:
    if _area13_status(invoice) in {"paid", "void", "cancelled"}:
        return False
    if _area13_status(invoice) == "overdue":
        return True
    due = _area13_dt(invoice.get("due_date"))
    return bool(due and due < datetime.now(timezone.utc))

def _area13_is_completed_job(job: dict) -> bool:
    status = _area13_status(job)
    return status in {"completed", "complete", "done"} or bool(job.get("completed") or job.get("completed_at") or job.get("worker_completed_at"))

def _area13_job_has_invoice(job: dict) -> bool:
    return bool(job.get("invoice_id") or job.get("draft_invoice_id") or job.get("invoiced"))

def _area13_week_month_cutoffs():
    now = datetime.now(timezone.utc)
    return now - timedelta(days=7), now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

def _area13_group_sum(rows: list, key_getter, value_getter):
    out = {}
    for row in rows:
        key = _area13_text(key_getter(row)) or "Unknown"
        out[key] = round(out.get(key, 0) + float(value_getter(row) or 0), 2)
    return [{"label": k, "value": v} for k, v in sorted(out.items(), key=lambda x: x[1], reverse=True)]

def _area13_group_count(rows: list, key_getter):
    out = {}
    for row in rows:
        key = _area13_text(key_getter(row)) or "Unknown"
        out[key] = out.get(key, 0) + 1
    return [{"label": k, "count": v} for k, v in sorted(out.items(), key=lambda x: x[1], reverse=True)]

def _area13_csv_escape(value):
    s = str(value if value is not None else "")
    s = s.replace('"', '""')
    return f'"{s}"'

def _area13_csv(rows: list, fields: list) -> str:
    lines = [",".join(_area13_csv_escape(label) for key, label in fields)]
    for row in rows:
        lines.append(",".join(_area13_csv_escape(row.get(key, "")) for key, label in fields))
    return "\n".join(lines)

async def _area13_report_data(business_id: str, date_from: str = "", date_to: str = ""):
    start_dt = _area13_dt(date_from) if date_from else None
    end_dt = _area13_dt(date_to) if date_to else None

    invoices_all = [safe_doc(i) async for i in db.invoices.find({"business_id": str(business_id)}).sort("created_at", -1).limit(2000)]
    jobs_all = [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).sort("created_at", -1).limit(2000)]
    quotes_all = [safe_doc(q) async for q in db.quotes.find({"business_id": str(business_id)}).sort("created_at", -1).limit(2000)]
    clients_all = [safe_doc(c) async for c in db.clients.find({"business_id": str(business_id)}).sort("created_at", -1).limit(2000)]

    invoices = [i for i in invoices_all if _area13_in_range(i, start_dt, end_dt)]
    jobs = [j for j in jobs_all if _area13_in_range(j, start_dt, end_dt)]
    quotes = [q for q in quotes_all if _area13_in_range(q, start_dt, end_dt)]

    week_start, month_start = _area13_week_month_cutoffs()

    paid_invoices = [i for i in invoices_all if _area13_status(i) == "paid"]
    unpaid_invoices = [i for i in invoices_all if _area13_status(i) not in {"paid", "void", "cancelled"}]
    overdue_invoices = [i for i in unpaid_invoices if _area13_is_overdue(i)]
    completed_jobs_not_invoiced = [j for j in jobs_all if _area13_is_completed_job(j) and not _area13_job_has_invoice(j)]
    waiting_quotes = [q for q in quotes_all if _area13_status(q) in {"draft", "sent", "pending", "waiting", "open"}]
    accepted_quotes_not_converted = [
        q for q in quotes_all
        if _area13_status(q) in {"accepted", "approved"} and not (q.get("job_id") or q.get("converted_job_id"))
    ]

    paid_this_week = sum(_area13_invoice_total(i) for i in paid_invoices if (_area13_dt(i.get("paid_at") or i.get("updated_at") or i.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc)) >= week_start)
    paid_this_month = sum(_area13_invoice_total(i) for i in paid_invoices if (_area13_dt(i.get("paid_at") or i.get("updated_at") or i.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc)) >= month_start)
    invoiced_this_week = sum(_area13_invoice_total(i) for i in invoices_all if (_area13_dt(i.get("created_at") or i.get("updated_at")) or datetime.min.replace(tzinfo=timezone.utc)) >= week_start)
    invoiced_this_month = sum(_area13_invoice_total(i) for i in invoices_all if (_area13_dt(i.get("created_at") or i.get("updated_at")) or datetime.min.replace(tzinfo=timezone.utc)) >= month_start)

    job_status_counts = _area13_group_count(jobs_all, lambda j: j.get("status") or j.get("job_status") or "open")
    jobs_by_worker = _area13_group_count(jobs_all, lambda j: j.get("assigned_worker_name") or j.get("worker_name") or "Unassigned")
    jobs_by_service_type = _area13_group_count(jobs_all, lambda j: j.get("service_type") or j.get("job_type") or "Service work")

    time_by_worker_raw = {}
    for job in jobs_all:
        worker = _area13_text(job.get("assigned_worker_name") or job.get("worker_name") or "Unassigned")
        minutes = int(_area13_num(job.get("time_spent_minutes") or job.get("total_minutes") or job.get("worked_minutes"), 0))
        time_by_worker_raw[worker] = time_by_worker_raw.get(worker, 0) + minutes
    time_by_worker = [{"label": k, "hours": round(v / 60, 2), "minutes": v} for k, v in sorted(time_by_worker_raw.items(), key=lambda x: x[1], reverse=True)]

    revenue_by_client = _area13_group_sum(
        invoices_all,
        lambda i: i.get("customer_name") or i.get("client_name") or "Unknown client",
        lambda i: _area13_invoice_total(i),
    )

    cancelled_late_paused_jobs = [
        j for j in jobs_all
        if _area13_status(j) in {"cancelled", "canceled", "paused", "late", "blocked", "cannot_complete"}
        or j.get("cannot_complete_reason")
    ]

    trust_checks = {
        "privacy_route": True,
        "terms_route": True,
        "contact_support_route": True,
        "password_reset_routes": True,
        "invite_setup": True,
        "business_isolation": "All Area 13 report queries are scoped by authenticated business_id.",
        "data_export": True,
        "audit_log": True,
    }

    return {
        "metrics": {
            "invoiced_this_week": round(invoiced_this_week, 2),
            "invoiced_this_month": round(invoiced_this_month, 2),
            "paid_this_week": round(paid_this_week, 2),
            "paid_this_month": round(paid_this_month, 2),
            "unpaid_total": round(sum(_area13_invoice_due(i) for i in unpaid_invoices), 2),
            "overdue_total": round(sum(_area13_invoice_due(i) for i in overdue_invoices), 2),
            "completed_jobs_not_invoiced": len(completed_jobs_not_invoiced),
            "quotes_waiting": len(waiting_quotes),
            "accepted_quotes_not_converted": len(accepted_quotes_not_converted),
            "jobs_total": len(jobs_all),
            "clients_total": len(clients_all),
            "invoices_total": len(invoices_all),
            "cancelled_late_paused_jobs": len(cancelled_late_paused_jobs),
        },
        "charts": {
            "job_status_counts": job_status_counts,
            "jobs_by_worker": jobs_by_worker,
            "time_by_worker": time_by_worker,
            "revenue_by_client": revenue_by_client[:20],
            "jobs_by_service_type": jobs_by_service_type,
        },
        "records": {
            "completed_jobs_not_invoiced": completed_jobs_not_invoiced[:100],
            "waiting_quotes": waiting_quotes[:100],
            "accepted_quotes_not_converted": accepted_quotes_not_converted[:100],
            "overdue_invoices": overdue_invoices[:100],
            "unpaid_invoices": unpaid_invoices[:100],
            "cancelled_late_paused_jobs": cancelled_late_paused_jobs[:100],
        },
        "trust_checks": trust_checks,
        "date_filter": {"date_from": date_from, "date_to": date_to},
    }

@api_router.get("/reports/workspace")
async def get_reports_workspace(
    date_from: str = Query(default=""),
    date_to: str = Query(default=""),
    current_user: dict = Depends(get_current_user)
):
    business_id = await get_user_business_id(current_user)
    data = await _area13_report_data(str(business_id), date_from, date_to)
    return {"success": True, "reports": data}

@api_router.get("/reports/export/{dataset}")
async def export_reports_dataset(
    dataset: str,
    date_from: str = Query(default=""),
    date_to: str = Query(default=""),
    current_user: dict = Depends(get_current_user)
):
    business_id = await get_user_business_id(current_user)
    dataset = _area13_text(dataset).lower()
    data = await _area13_report_data(str(business_id), date_from, date_to)

    if dataset == "invoices":
        rows = [safe_doc(i) async for i in db.invoices.find({"business_id": str(business_id)}).sort("created_at", -1).limit(5000)]
        fields = [
            ("invoice_number", "Invoice Number"),
            ("customer_name", "Customer"),
            ("status", "Status"),
            ("total", "Total"),
            ("amount_paid", "Amount Paid"),
            ("amount_due", "Amount Due"),
            ("due_date", "Due Date"),
            ("created_at", "Created"),
        ]
    elif dataset == "jobs":
        rows = [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).sort("created_at", -1).limit(5000)]
        fields = [
            ("title", "Title"),
            ("customer_name", "Customer"),
            ("status", "Status"),
            ("assigned_worker_name", "Worker"),
            ("address", "Address"),
            ("scheduled_date", "Scheduled Date"),
            ("time_spent_minutes", "Minutes"),
            ("created_at", "Created"),
        ]
    elif dataset == "quotes":
        rows = [safe_doc(q) async for q in db.quotes.find({"business_id": str(business_id)}).sort("created_at", -1).limit(5000)]
        fields = [
            ("quote_number", "Quote Number"),
            ("customer_name", "Customer"),
            ("status", "Status"),
            ("total", "Total"),
            ("created_at", "Created"),
        ]
    elif dataset == "clients":
        rows = [safe_doc(c) async for c in db.clients.find({"business_id": str(business_id)}).sort("created_at", -1).limit(5000)]
        fields = [
            ("client_name", "Client Name"),
            ("name", "Name"),
            ("email", "Email"),
            ("phone", "Phone"),
            ("billing_address", "Billing Address"),
            ("customer_type", "Customer Type"),
            ("created_at", "Created"),
        ]
    elif dataset == "summary":
        rows = [
            {"metric": k, "value": v}
            for k, v in data.get("metrics", {}).items()
        ]
        fields = [("metric", "Metric"), ("value", "Value")]
    else:
        raise HTTPException(status_code=400, detail="Export dataset must be invoices, jobs, quotes, clients, or summary")

    csv = _area13_csv(rows, fields)
    return {
        "success": True,
        "filename": f"churvox_{dataset}_export.csv",
        "content_type": "text/csv",
        "csv": csv,
    }

@api_router.get("/data-control/export")
async def export_business_data_control(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    payload = {
        "business_id": str(business_id),
        "exported_at": datetime.now(timezone.utc),
        "clients": [safe_doc(c) async for c in db.clients.find({"business_id": str(business_id)}).limit(5000)],
        "jobs": [safe_doc(j) async for j in db.jobs.find({"business_id": str(business_id)}).limit(5000)],
        "quotes": [safe_doc(q) async for q in db.quotes.find({"business_id": str(business_id)}).limit(5000)],
        "invoices": [safe_doc(i) async for i in db.invoices.find({"business_id": str(business_id)}).limit(5000)],
        "business_settings": safe_doc(await db.business_settings.find_one({"business_id": str(business_id)}) or {}),
    }
    return {"success": True, "export": make_json_safe(payload)}

@api_router.post("/data-control/request-account-deletion")
async def request_account_deletion(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    request = {
        "business_id": str(business_id),
        "user_id": str(current_user.get("id") or current_user.get("_id") or ""),
        "email": current_user.get("email") or "",
        "reason": _area13_text((payload or {}).get("reason") or "Account deletion requested"),
        "status": "requested",
        "type": "account_deletion_request",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    inserted = await db.business_activity.insert_one(request)
    request["_id"] = inserted.inserted_id
    return {
        "success": True,
        "message": "Account deletion request recorded. Review before deleting business data.",
        "request": safe_doc(request),
    }




# CHURVOX_AREA14_PLATFORM_HQ_20260531
# Platform owner / Churvox HQ: businesses, users, health, usage, risk and support overview.
def _area14_role(current_user: dict) -> str:
    return str((current_user or {}).get("role") or "").lower().replace(" ", "_")

def _area14_platform_only(current_user: dict):
    role = _area14_role(current_user)
    email = str((current_user or {}).get("email") or "").lower()
    if role in {"platform_owner", "platform_admin", "super_admin", "admin_owner"} or email == "hello@churvox.com":
        return
    raise HTTPException(status_code=403, detail="Platform owner access required.")

def _area14_money(value, fallback=0.0):
    try:
        if value is None or value == "":
            return float(fallback)
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return float(fallback or 0)

def _area14_status(doc: dict) -> str:
    return str((doc or {}).get("status") or (doc or {}).get("plan_status") or "").lower().replace(" ", "_")

def _area14_id(doc: dict) -> str:
    return str((doc or {}).get("_id") or (doc or {}).get("id") or "")

async def _area14_count(collection_name: str, query: dict = None):
    try:
        return await getattr(db, collection_name).count_documents(query or {})
    except Exception:
        return 0

async def _area14_recent(collection_name: str, query: dict = None, limit: int = 20):
    try:
        return [safe_doc(x) async for x in getattr(db, collection_name).find(query or {}).sort("created_at", -1).limit(limit)]
    except Exception:
        return []

@api_router.get("/platform/hq")
async def get_churvox_platform_hq(current_user: dict = Depends(get_current_user)):
    _area14_platform_only(current_user)

    users = await _area14_recent("users", {}, 300)
    jobs = await _area14_recent("jobs", {}, 300)
    invoices = await _area14_recent("invoices", {}, 300)
    quotes = await _area14_recent("quotes", {}, 300)
    clients = await _area14_recent("clients", {}, 300)
    activities = await _area14_recent("business_activity", {}, 80)

    business_ids = set()
    for row in users + jobs + invoices + quotes + clients:
        bid = str(row.get("business_id") or row.get("businessId") or "").strip()
        if bid:
            business_ids.add(bid)

    paid_invoices = [i for i in invoices if _area14_status(i) == "paid"]
    unpaid_invoices = [i for i in invoices if _area14_status(i) not in {"paid", "void", "cancelled", "canceled"}]
    overdue_invoices = [i for i in unpaid_invoices if _area14_status(i) == "overdue"]

    plans = {}
    roles = {}
    for u in users:
        plan = str(u.get("plan") or u.get("selected_plan") or u.get("plan_name") or "none").lower()
        role = str(u.get("role") or "unknown").lower()
        plans[plan] = plans.get(plan, 0) + 1
        roles[role] = roles.get(role, 0) + 1

    risk_items = []
    if not users:
        risk_items.append({"level": "high", "title": "No users loaded", "detail": "Platform users query returned empty."})
    if len(business_ids) == 0:
        risk_items.append({"level": "high", "title": "No businesses detected", "detail": "No business_id values found across recent records."})
    if overdue_invoices:
        risk_items.append({"level": "medium", "title": "Overdue invoices exist", "detail": f"{len(overdue_invoices)} recent invoices are overdue."})
    if not any(str(u.get("role") or "").lower() in {"platform_owner", "platform_admin"} for u in users):
        risk_items.append({"level": "medium", "title": "No platform owner role in recent users", "detail": "Make sure at least one admin account has platform_owner role."})

    return {
        "success": True,
        "hq": {
            "metrics": {
                "businesses": len(business_ids),
                "users": await _area14_count("users"),
                "clients": await _area14_count("clients"),
                "jobs": await _area14_count("jobs"),
                "quotes": await _area14_count("quotes"),
                "invoices": await _area14_count("invoices"),
                "recent_paid_total": round(sum(_area14_money(i.get("total") or i.get("amount_paid") or i.get("paid_amount"), 0) for i in paid_invoices), 2),
                "recent_unpaid_total": round(sum(_area14_money(i.get("amount_due") or i.get("balance_due") or i.get("total"), 0) for i in unpaid_invoices), 2),
                "overdue_invoices": len(overdue_invoices),
                "risk_items": len(risk_items),
            },
            "plans": [{"label": k, "count": v} for k, v in sorted(plans.items())],
            "roles": [{"label": k, "count": v} for k, v in sorted(roles.items())],
            "recent_users": users[:30],
            "recent_jobs": jobs[:30],
            "recent_invoices": invoices[:30],
            "recent_activity": activities[:30],
            "risk_items": risk_items,
            "checks": {
                "business_isolation": "HQ reads across businesses, but normal app routes remain business_id scoped.",
                "owner_approval_model": "AI Operator actions require owner approval for important changes.",
                "data_control": "Reports/Data Control export and deletion request endpoints exist.",
                "plans_nav": "Plans is available in the app navigation.",
                "render_deploy": "Push to main should trigger Render auto-deploy.",
            },
        },
    }

@api_router.post("/platform/hq/activity-note")
async def create_churvox_hq_activity_note(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    _area14_platform_only(current_user)
    note = str((payload or {}).get("note") or "").strip()
    if not note:
        raise HTTPException(status_code=400, detail="Note is required.")

    doc = {
        "type": "platform_hq_note",
        "note": note,
        "created_by": current_user.get("email") or current_user.get("id"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    inserted = await db.business_activity.insert_one(doc)
    doc["_id"] = inserted.inserted_id
    return {"success": True, "note": safe_doc(doc)}




# CHURVOX_LAUNCH_1_5_DEMO_NOTIFY_BILLING_20260601
# Launch 1-5: demo/sample mode, notification workspace, billing confidence.
def _launch15_text(value) -> str:
    return str(value or "").strip()

def _launch15_doc_id(doc: dict) -> str:
    return str((doc or {}).get("_id") or (doc or {}).get("id") or "")

def _launch15_money(value, fallback=0.0):
    try:
        if value is None or value == "":
            return float(fallback)
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return float(fallback or 0)

async def _launch15_count(collection_name: str, query: dict):
    try:
        return await getattr(db, collection_name).count_documents(query)
    except Exception:
        return 0

async def _launch15_demo_status(business_id: str):
    query = {"business_id": str(business_id), "demo_record": True}
    return {
        "clients": await _launch15_count("clients", query),
        "jobs": await _launch15_count("jobs", query),
        "quotes": await _launch15_count("quotes", query),
        "invoices": await _launch15_count("invoices", query),
        "ai_actions": await _launch15_count("ai_operator_actions", query),
        "notifications": await _launch15_count("business_activity", {**query, "type": {"$in": ["notification", "support_ticket", "ai_notification"]}}),
    }

@api_router.get("/demo/status")
async def get_launch_demo_status(current_user: dict = Depends(get_current_user)):
    business_id = str(await get_user_business_id(current_user))
    counts = await _launch15_demo_status(business_id)
    return {
        "success": True,
        "demo": {
            "seeded": any(v > 0 for v in counts.values()),
            "counts": counts,
            "message": "Demo mode creates safe sample records marked demo_record=true.",
        },
    }

@api_router.post("/demo/seed")
async def seed_launch_demo_business(current_user: dict = Depends(get_current_user)):
    business_id = str(await get_user_business_id(current_user))
    now = datetime.now(timezone.utc)

    client = {
        "business_id": business_id,
        "demo_key": "demo_client_green_valley",
        "demo_record": True,
        "client_name": "Green Valley Property Group",
        "name": "Green Valley Property Group",
        "email": "demo.client@example.com",
        "phone": "+64210000000",
        "billing_address": "12 Demo Lane, Wellington",
        "customer_type": "Property manager",
        "notes": "Demo client for screenshots, sales demos and live workflow testing.",
        "created_at": now,
        "updated_at": now,
    }
    await db.clients.update_one(
        {"business_id": business_id, "demo_key": client["demo_key"]},
        {"$set": client, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    saved_client = await db.clients.find_one({"business_id": business_id, "demo_key": client["demo_key"]})
    client_id = _launch15_doc_id(saved_client)

    worker = {
        "business_id": business_id,
        "demo_key": "demo_worker_jamie",
        "demo_record": True,
        "display_name": "Jamie Demo",
        "name": "Jamie Demo",
        "email": "demo.worker@example.com",
        "role": "worker",
        "region": "Wellington",
        "skills": ["lawn care", "property maintenance", "photos"],
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    await db.business_users.update_one(
        {"business_id": business_id, "demo_key": worker["demo_key"]},
        {"$set": worker, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    saved_worker = await db.business_users.find_one({"business_id": business_id, "demo_key": worker["demo_key"]})
    worker_id = _launch15_doc_id(saved_worker)

    quote = {
        "business_id": business_id,
        "demo_key": "demo_quote_green_valley",
        "demo_record": True,
        "client_id": client_id,
        "customer_name": "Green Valley Property Group",
        "quote_number": "DEMO-Q-1001",
        "status": "accepted",
        "job_description": "Monthly grounds maintenance and tidy-up.",
        "description": "Monthly grounds maintenance, edges, green waste and completion photos.",
        "total": 245.00,
        "created_at": now,
        "updated_at": now,
    }
    await db.quotes.update_one(
        {"business_id": business_id, "demo_key": quote["demo_key"]},
        {"$set": quote, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    saved_quote = await db.quotes.find_one({"business_id": business_id, "demo_key": quote["demo_key"]})
    quote_id = _launch15_doc_id(saved_quote)

    job = {
        "business_id": business_id,
        "demo_key": "demo_job_green_valley",
        "demo_record": True,
        "client_id": client_id,
        "quote_id": quote_id,
        "customer_name": "Green Valley Property Group",
        "title": "Green Valley monthly property service",
        "description": "Mow lawns, trim edges, clear green waste, upload completion photos.",
        "address": "12 Demo Lane, Wellington",
        "site_address": "12 Demo Lane, Wellington",
        "status": "completed",
        "assigned_worker_id": worker_id,
        "worker_id": worker_id,
        "assigned_worker_name": "Jamie Demo",
        "worker_name": "Jamie Demo",
        "scheduled_date": now.date().isoformat(),
        "scheduled_time": "09:00",
        "completed_at": now,
        "price": 245.00,
        "job_price": 245.00,
        "pricing_type": "fixed",
        "ai_invoice_description": "Monthly grounds maintenance, edges, green waste and completion photos at 12 Demo Lane.",
        "created_at": now,
        "updated_at": now,
    }
    await db.jobs.update_one(
        {"business_id": business_id, "demo_key": job["demo_key"]},
        {"$set": job, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    saved_job = await db.jobs.find_one({"business_id": business_id, "demo_key": job["demo_key"]})
    job_id = _launch15_doc_id(saved_job)

    invoice = {
        "business_id": business_id,
        "demo_key": "demo_invoice_green_valley",
        "demo_record": True,
        "client_id": client_id,
        "job_id": job_id,
        "quote_id": quote_id,
        "customer_name": "Green Valley Property Group",
        "customer_email": "demo.client@example.com",
        "invoice_number": "DEMO-INV-1001",
        "status": "sent",
        "description": "Monthly grounds maintenance, edges, green waste and completion photos at 12 Demo Lane.",
        "line_items": [{"description": "Monthly property service", "quantity": 1, "unit_price": 245.00, "amount": 245.00}],
        "subtotal": 245.00,
        "total": 245.00,
        "amount_due": 245.00,
        "amount_paid": 0,
        "due_date": (now + timedelta(days=7)).date().isoformat(),
        "created_at": now,
        "updated_at": now,
    }
    await db.invoices.update_one(
        {"business_id": business_id, "demo_key": invoice["demo_key"]},
        {"$set": invoice, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    saved_invoice = await db.invoices.find_one({"business_id": business_id, "demo_key": invoice["demo_key"]})
    invoice_id = _launch15_doc_id(saved_invoice)

    await db.jobs.update_one(
        {"business_id": business_id, "demo_key": job["demo_key"]},
        {"$set": {"invoice_id": invoice_id, "draft_invoice_id": invoice_id, "invoiced": True, "updated_at": now}},
    )

    ai_action = {
        "business_id": business_id,
        "demo_key": "demo_ai_overdue_followup",
        "demo_record": True,
        "action_key": f"demo:invoice_followup:{invoice_id}",
        "action_type": "draft_overdue_invoice_reminder",
        "record_type": "invoice",
        "record_id": invoice_id,
        "title": "Demo: prepare invoice follow-up",
        "reason": "This sample shows how Churvox prepares admin for owner approval.",
        "status": "pending",
        "risk_level": "medium",
        "confidence": 0.89,
        "approval_required": True,
        "data_used": {"invoice_number": "DEMO-INV-1001", "amount_due": 245.00},
        "proposed_changes": {"message_draft": "Friendly follow-up for DEMO-INV-1001."},
        "editable_payload": {"message": "Hi Green Valley, just checking you received DEMO-INV-1001. Thanks."},
        "created_at": now,
        "updated_at": now,
    }
    await db.ai_operator_actions.update_one(
        {"business_id": business_id, "demo_key": ai_action["demo_key"]},
        {"$set": ai_action, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

    notification = {
        "business_id": business_id,
        "demo_key": "demo_notification_worker_completed",
        "demo_record": True,
        "type": "notification",
        "title": "Demo worker completed a job",
        "message": "Jamie Demo completed Green Valley monthly property service. Invoice draft is ready.",
        "status": "unread",
        "href": f"/jobs/{job_id}",
        "priority": "normal",
        "created_at": now,
        "updated_at": now,
    }
    await db.business_activity.update_one(
        {"business_id": business_id, "demo_key": notification["demo_key"]},
        {"$set": notification, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

    counts = await _launch15_demo_status(business_id)
    return {
        "success": True,
        "message": "Demo/sample business records are ready.",
        "demo": {
            "counts": counts,
            "client_id": client_id,
            "worker_id": worker_id,
            "quote_id": quote_id,
            "job_id": job_id,
            "invoice_id": invoice_id,
        },
    }

@api_router.post("/demo/clear")
async def clear_launch_demo_business(current_user: dict = Depends(get_current_user)):
    business_id = str(await get_user_business_id(current_user))
    query = {"business_id": business_id, "demo_record": True}
    results = {}
    for name in ["clients", "jobs", "quotes", "invoices", "ai_operator_actions", "business_activity", "business_users"]:
        try:
            res = await getattr(db, name).delete_many(query)
            results[name] = res.deleted_count
        except Exception:
            results[name] = 0
    return {"success": True, "message": "Demo records cleared only where demo_record=true.", "deleted": results}

@api_router.get("/notifications/workspace")
async def get_launch_notifications_workspace(current_user: dict = Depends(get_current_user)):
    business_id = str(await get_user_business_id(current_user))
    query = {"business_id": business_id, "type": {"$in": ["notification", "ai_notification", "support_ticket", "bug_report", "feature_request"]}}
    try:
        notifications = [safe_doc(n) async for n in db.business_activity.find(query).sort("created_at", -1).limit(150)]
    except Exception:
        notifications = []

    unread = [n for n in notifications if str(n.get("status") or "").lower() not in {"read", "closed", "done"}]
    return {
        "success": True,
        "notifications": {
            "items": notifications,
            "metrics": {
                "total": len(notifications),
                "unread": len(unread),
                "support_open": len([n for n in notifications if n.get("type") in {"support_ticket", "bug_report", "feature_request"} and str(n.get("status") or "open") == "open"]),
            },
        },
    }

@api_router.post("/notifications/test")
async def create_launch_test_notification(current_user: dict = Depends(get_current_user)):
    business_id = str(await get_user_business_id(current_user))
    now = datetime.now(timezone.utc)
    doc = {
        "business_id": business_id,
        "type": "notification",
        "title": "Test notification",
        "message": "This proves the notification centre can receive owner alerts.",
        "status": "unread",
        "href": "/notifications",
        "priority": "normal",
        "created_by": current_user.get("email") or current_user.get("id"),
        "created_at": now,
        "updated_at": now,
    }
    inserted = await db.business_activity.insert_one(doc)
    doc["_id"] = inserted.inserted_id
    return {"success": True, "notification": safe_doc(doc)}

@api_router.post("/notifications/{notification_id}/read")
async def mark_launch_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    business_id = str(await get_user_business_id(current_user))
    clauses = [{"id": str(notification_id)}]
    if ObjectId.is_valid(str(notification_id)):
        clauses.insert(0, {"_id": ObjectId(str(notification_id))})
    doc = await db.business_activity.find_one({"business_id": business_id, "$or": clauses})
    if not doc:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.business_activity.update_one({"_id": doc["_id"], "business_id": business_id}, {"$set": {"status": "read", "read_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}})
    saved = await db.business_activity.find_one({"_id": doc["_id"]})
    return {"success": True, "notification": safe_doc(saved)}

@api_router.get("/billing/confidence")
async def get_launch_billing_confidence(current_user: dict = Depends(get_current_user)):
    plan = _launch15_text(current_user.get("plan") or current_user.get("selected_plan") or current_user.get("plan_name") or "No plan selected")
    plan_status = _launch15_text(current_user.get("plan_status") or current_user.get("subscription_status") or "unknown")
    trial_ends_at = current_user.get("trial_ends_at") or current_user.get("trial_end") or ""
    stripe_configured = bool(globals().get("STRIPE_SECRET_KEY") or globals().get("STRIPE_API_KEY"))
    return {
        "success": True,
        "billing": {
            "plan": plan,
            "plan_status": plan_status,
            "trial_ends_at": trial_ends_at,
            "stripe_configured": stripe_configured,
            "currency": "NZD",
            "gst_note": "Pricing should be shown as + GST where applicable.",
            "cancel_note": "Customers should be able to ask for cancellation/support clearly from Contact.",
            "failed_payment_note": "If Stripe reports a failed payment, show a clear warning and keep the owner on Plans.",
            "links": [
                {"label": "Open Plans", "href": "/plans"},
                {"label": "Contact support", "href": "/contact"},
                {"label": "Reports/Data Control", "href": "/reports"},
            ],
            "checks": [
                {"label": "Current plan visible", "ok": bool(plan and plan != "No plan selected")},
                {"label": "Plan status visible", "ok": bool(plan_status and plan_status != "unknown")},
                {"label": "Stripe configured in backend", "ok": stripe_configured},
                {"label": "GST wording present", "ok": True},
                {"label": "Support path present", "ok": True},
            ],
        },
    }




# CHURVOX_LAUNCH_6_10_PROOF_OPS_BACKUP_POLISH_20260601
# Launch 6-10: sales polish, integration proof, operating process, backup/recovery, polish checklist.
def _launch610_text(value) -> str:
    return str(value or "").strip()

async def _launch610_count(collection_name: str, query: dict = None):
    try:
        return await getattr(db, collection_name).count_documents(query or {})
    except Exception:
        return 0

async def _launch610_recent(collection_name: str, query: dict = None, limit: int = 20):
    try:
        return [safe_doc(x) async for x in getattr(db, collection_name).find(query or {}).sort("created_at", -1).limit(limit)]
    except Exception:
        return []

@api_router.get("/launch/sales-polish")
async def get_launch_sales_polish():
    return {
        "success": True,
        "sales": {
            "headline": "Churvox does the admin. You approve.",
            "subheadline": "AI Operator for trade and service businesses: jobs, quotes, invoices, crew, reminders and daily admin in one command floor.",
            "who_for": ["Lawn care", "Landscaping", "Cleaning", "Handyman", "Painting", "Plumbing", "Electrical", "Property maintenance"],
            "proof_points": [
                "Owner approval queue for prepared admin actions",
                "Quote → job → invoice → paid workflow",
                "Worker completion, photos and field proof",
                "Money Desk and reports",
                "MYOB-ready integration workspace",
                "Plans, trust, support and data control",
            ],
            "homepage_sections": [
                {"title": "The problem", "copy": "Trade owners lose time chasing notes, invoices, workers, quotes and follow-ups."},
                {"title": "The promise", "copy": "Churvox prepares the admin and puts approvals in front of the owner."},
                {"title": "The flow", "copy": "Client → quote → job → worker completion → invoice → paid → reports."},
                {"title": "The trust", "copy": "Approval-first AI, worker-safe views, data export and support paths."},
            ],
            "cta": {"primary": "Start with Churvox", "secondary": "Request setup help"},
        },
    }

@api_router.get("/launch/integration-proof")
async def get_launch_integration_proof(current_user: dict = Depends(get_current_user)):
    business_id = str(await get_user_business_id(current_user))

    email_configured = bool(globals().get("POSTMARK_API_KEY") or globals().get("RESEND_API_KEY") or globals().get("SMTP_PASSWORD"))
    stripe_configured = bool(globals().get("STRIPE_SECRET_KEY") or globals().get("STRIPE_API_KEY"))
    sms_credits = 0
    myob_connected = False

    try:
        sms_row = await db.sms_balances.find_one({"business_id": business_id}) or await db.sms_credits.find_one({"business_id": business_id})
        if sms_row:
            sms_credits = int(float(sms_row.get("balance") or sms_row.get("credits") or sms_row.get("sms_credits") or 0))
    except Exception:
        sms_credits = 0

    try:
        acct = await db.accounting_settings.find_one({"business_id": business_id}) or {}
        myob_connected = bool(acct.get("myob_connected") or acct.get("access_token") or acct.get("myob_company_file_id"))
    except Exception:
        myob_connected = False

    invoice_count = await _launch610_count("invoices", {"business_id": business_id})
    public_invoice_count = await _launch610_count("invoices", {"business_id": business_id, "public_token": {"$exists": True, "$ne": ""}})
    failed_myob = await _launch610_count("invoices", {"business_id": business_id, "$or": [{"myob_sync_status": "failed"}, {"myob_error": {"$exists": True, "$ne": ""}}]})

    checks = [
        {"key": "email", "label": "Email provider configured", "ok": email_configured, "action": "Set Postmark/Resend/SMTP env keys and send a real invoice email."},
        {"key": "stripe", "label": "Stripe configured", "ok": stripe_configured, "action": "Confirm checkout, plan return URL and failed payment handling."},
        {"key": "public_invoices", "label": "Public invoice links exist", "ok": public_invoice_count > 0 or invoice_count == 0, "action": "Create/send an invoice and open its public link."},
        {"key": "myob", "label": "MYOB connection ready", "ok": myob_connected, "action": "Connect MYOB when developer/API approval is ready."},
        {"key": "sms", "label": "SMS credits or Coming Soon state", "ok": sms_credits > 0, "action": "Either buy/test credits or keep SMS clearly disabled/Coming Soon."},
        {"key": "myob_errors", "label": "No failed MYOB syncs", "ok": failed_myob == 0, "action": "Review failed sync rows in Integrations workspace."},
    ]

    return {
        "success": True,
        "proof": {
            "checks": checks,
            "metrics": {
                "email_configured": email_configured,
                "stripe_configured": stripe_configured,
                "myob_connected": myob_connected,
                "sms_credits": sms_credits,
                "invoice_count": invoice_count,
                "public_invoice_count": public_invoice_count,
                "failed_myob_syncs": failed_myob,
            },
        },
    }

@api_router.get("/launch/ops")
async def get_launch_ops(current_user: dict = Depends(get_current_user)):
    business_id = str(await get_user_business_id(current_user))

    support_open = await _launch610_count("business_activity", {"business_id": business_id, "type": {"$in": ["support_ticket", "bug_report", "feature_request"]}, "status": {"$ne": "closed"}})
    unread_notifications = await _launch610_count("business_activity", {"business_id": business_id, "type": {"$in": ["notification", "ai_notification"]}, "status": {"$ne": "read"}})
    ai_pending = await _launch610_count("ai_operator_actions", {"business_id": business_id, "status": {"$in": ["pending", "edited", "prepared"]}})
    overdue_invoices = await _launch610_count("invoices", {"business_id": business_id, "status": "overdue"})
    failed_sync = await _launch610_count("invoices", {"business_id": business_id, "$or": [{"myob_sync_status": "failed"}, {"myob_error": {"$exists": True, "$ne": ""}}]})

    routine = [
        {"cadence": "Daily", "task": "Open Churvox HQ / Reports and check failed payments, support, AI actions and urgent jobs."},
        {"cadence": "Daily", "task": "Check Notifications for worker completions, invoice issues and owner approvals."},
        {"cadence": "Daily", "task": "Check support inbox and reply to trial/customer questions."},
        {"cadence": "Weekly", "task": "Review trials, plan upgrades, failed deploys and integration errors."},
        {"cadence": "Weekly", "task": "Export/backup business data and confirm rollback plan still works."},
    ]

    return {
        "success": True,
        "ops": {
            "metrics": {
                "support_open": support_open,
                "unread_notifications": unread_notifications,
                "ai_pending": ai_pending,
                "overdue_invoices": overdue_invoices,
                "failed_sync": failed_sync,
            },
            "routine": routine,
            "recent_support": await _launch610_recent("business_activity", {"business_id": business_id, "type": {"$in": ["support_ticket", "bug_report", "feature_request"]}}, 20),
        },
    }

@api_router.get("/launch/backup-recovery")
async def get_launch_backup_recovery(current_user: dict = Depends(get_current_user)):
    business_id = str(await get_user_business_id(current_user))
    counts = {
        "clients": await _launch610_count("clients", {"business_id": business_id}),
        "jobs": await _launch610_count("jobs", {"business_id": business_id}),
        "quotes": await _launch610_count("quotes", {"business_id": business_id}),
        "invoices": await _launch610_count("invoices", {"business_id": business_id}),
    }
    checklist = [
        {"label": "Business data export exists", "ok": True, "href": "/reports"},
        {"label": "GitHub main branch contains production source", "ok": True, "href": "/churvox-hq"},
        {"label": "Render rollback/manual deploy process known", "ok": True, "href": "/contact"},
        {"label": "Database backup process documented", "ok": False, "href": "/backup-recovery"},
        {"label": "Emergency support message path ready", "ok": True, "href": "/contact"},
        {"label": "Incident checklist ready", "ok": True, "href": "/backup-recovery"},
    ]
    incident_steps = [
        "Confirm if issue is frontend, backend, database, email/SMS/MYOB or DNS.",
        "Check Render deploy logs and live route status.",
        "Pause risky customer sends if email/SMS/MYOB is failing.",
        "Use GitHub/Render rollback if the latest deploy broke core routes.",
        "Export affected business data before destructive fixes.",
        "Update customer/support note with plain-English status.",
    ]
    return {"success": True, "recovery": {"counts": counts, "checklist": checklist, "incident_steps": incident_steps}}

@api_router.get("/launch/polish-checklist")
async def get_launch_polish_checklist(current_user: dict = Depends(get_current_user)):
    checklist = [
        {"area": "Mobile", "item": "Bottom nav does not cover buttons", "status": "needs phone check"},
        {"area": "Mobile", "item": "Invoice form is usable on phone", "status": "needs phone check"},
        {"area": "Mobile", "item": "Worker start/complete/photo flow is easy", "status": "needs phone check"},
        {"area": "Build", "item": "React hook warnings cleaned", "status": "later polish"},
        {"area": "Build", "item": "npm vulnerabilities reviewed", "status": "later polish"},
        {"area": "UX", "item": "Every empty page has a clear next action", "status": "ongoing"},
        {"area": "UX", "item": "Every error says what to do next", "status": "ongoing"},
        {"area": "Website", "item": "Homepage sells outcome not just features", "status": "in progress"},
        {"area": "Trust", "item": "Privacy, Terms, Account Deletion links visible", "status": "done"},
        {"area": "Sales", "item": "Demo mode available for screenshots and calls", "status": "done if seeded"},
    ]
    return {"success": True, "polish": {"items": checklist}}




# CHURVOX_WIRE_PLANS_SMS_BLOCKS_CHECKOUT_20260601
# Unified checkout for Churvox plans, Command Growth Packs, MYOB add-on and SMS credits.
# Uses Stripe Price IDs when provided, otherwise uses Stripe Checkout price_data fallback.
CHURVOX_CHECKOUT_CATALOG = {
    "plans": {
        "solo": {
            "canonical": "solo",
            "display": "Start",
            "amount_cents": 3900,
            "interval": "month",
            "env_keys": ["STRIPE_PRICE_START", "STRIPE_PRICE_SOLO", "STRIPE_START_PRICE_ID", "STRIPE_SOLO_PRICE_ID"],
            "metadata_plan": "solo",
        },
        "team": {
            "canonical": "team",
            "display": "Crew",
            "amount_cents": 8900,
            "interval": "month",
            "env_keys": ["STRIPE_PRICE_CREW", "STRIPE_PRICE_TEAM", "STRIPE_CREW_PRICE_ID", "STRIPE_TEAM_PRICE_ID"],
            "metadata_plan": "team",
        },
        "pro": {
            "canonical": "pro",
            "display": "Operator",
            "amount_cents": 14900,
            "interval": "month",
            "env_keys": ["STRIPE_PRICE_OPERATOR", "STRIPE_PRICE_PRO", "STRIPE_OPERATOR_PRICE_ID", "STRIPE_PRO_PRICE_ID"],
            "metadata_plan": "pro",
        },
        "enterprise": {
            "canonical": "enterprise",
            "display": "Command",
            "amount_cents": 29900,
            "interval": "month",
            "env_keys": ["STRIPE_PRICE_COMMAND", "STRIPE_PRICE_ENTERPRISE", "STRIPE_COMMAND_PRICE_ID", "STRIPE_ENTERPRISE_PRICE_ID"],
            "metadata_plan": "enterprise",
        },
    },
    "addons": {
        "command_growth_pack": {
            "display": "Command Growth Pack",
            "amount_cents": 9900,
            "interval": "month",
            "env_keys": ["STRIPE_PRICE_COMMAND_GROWTH_PACK", "STRIPE_PRICE_GROWTH_PACK", "STRIPE_GROWTH_PACK_PRICE_ID"],
            "checkout_type": "growth_pack",
        },
        "myob_addon": {
            "display": "MYOB add-on",
            "amount_cents": 3900,
            "interval": "month",
            "env_keys": ["STRIPE_PRICE_MYOB_ADDON", "STRIPE_MYOB_ADDON_PRICE_ID"],
            "checkout_type": "myob_addon",
        },
    },
    "sms": {
        "sms_100": {
            "display": "100 SMS credits",
            "amount_cents": 1000,
            "credits": 100,
            "env_keys": ["STRIPE_PRICE_SMS_100", "STRIPE_SMS_100_PRICE_ID"],
        },
        "sms_500": {
            "display": "500 SMS credits",
            "amount_cents": 4500,
            "credits": 500,
            "env_keys": ["STRIPE_PRICE_SMS_500", "STRIPE_SMS_500_PRICE_ID"],
        },
        "sms_1000": {
            "display": "1,000 SMS credits",
            "amount_cents": 8000,
            "credits": 1000,
            "env_keys": ["STRIPE_PRICE_SMS_1000", "STRIPE_SMS_1000_PRICE_ID"],
        },
    },
}

def _cv_checkout_text(value):
    return str(value or "").strip()

def _cv_checkout_secret():
    return (
        os.environ.get("STRIPE_SECRET_KEY")
        or os.environ.get("STRIPE_API_KEY")
        or os.environ.get("STRIPE_SK")
        or ""
    ).strip()

def _cv_checkout_public_url():
    return (
        os.environ.get("FRONTEND_URL")
        or os.environ.get("PUBLIC_APP_URL")
        or os.environ.get("APP_URL")
        or os.environ.get("REACT_APP_PUBLIC_URL")
        or "https://www.churvox.com"
    ).strip().rstrip("/")

def _cv_checkout_price_id(item):
    for key in item.get("env_keys", []):
        value = os.environ.get(key, "").strip()
        if value:
            return value
    return ""

def _cv_checkout_success_url(path, item_key):
    base = _cv_checkout_public_url()
    raw = _cv_checkout_text(path) or f"/plans?checkout=success&item={item_key}"
    sep = "&" if "?" in raw else "?"
    if "session_id=" not in raw:
        raw = f"{raw}{sep}session_id={{CHECKOUT_SESSION_ID}}"
    if raw.startswith("http"):
        return raw
    return f"{base}{raw}"

def _cv_checkout_cancel_url(path, item_key):
    base = _cv_checkout_public_url()
    raw = _cv_checkout_text(path) or f"/plans?checkout=cancelled&item={item_key}"
    if raw.startswith("http"):
        return raw
    return f"{base}{raw}"

def _cv_checkout_catalog_public():
    def pack_item(key, item, kind):
        return {
            "key": key,
            "kind": kind,
            "display": item.get("display"),
            "amount_cents": item.get("amount_cents"),
            "amount_nzd": round(float(item.get("amount_cents") or 0) / 100, 2),
            "credits": item.get("credits"),
            "interval": item.get("interval"),
            "stripe_price_configured": bool(_cv_checkout_price_id(item)),
        }

    return {
        "plans": [pack_item(k, v, "plan") for k, v in CHURVOX_CHECKOUT_CATALOG["plans"].items()],
        "addons": [pack_item(k, v, "addon") for k, v in CHURVOX_CHECKOUT_CATALOG["addons"].items()],
        "sms": [pack_item(k, v, "sms") for k, v in CHURVOX_CHECKOUT_CATALOG["sms"].items()],
        "stripe_ready": bool(_cv_checkout_secret()),
    }

def _cv_checkout_pick(payload: dict):
    payload = payload or {}
    checkout_type = _cv_checkout_text(payload.get("checkout_type") or payload.get("type")).lower()
    plan_type = _cv_checkout_text(payload.get("plan_type") or payload.get("plan") or payload.get("plan_key")).lower()
    addon_type = _cv_checkout_text(payload.get("addon_type") or payload.get("addon")).lower()
    sms_pack = _cv_checkout_text(payload.get("sms_pack") or payload.get("pack") or payload.get("sms_pack_id")).lower()

    plan_aliases = {
        "start": "solo",
        "solo": "solo",
        "crew": "team",
        "team": "team",
        "operator": "pro",
        "pro": "pro",
        "command": "enterprise",
        "enterprise": "enterprise",
    }

    if checkout_type in {"sms", "sms_pack", "sms_credits"} or sms_pack:
        raw = sms_pack or _cv_checkout_text(payload.get("credits"))
        key = {
            "100": "sms_100",
            "sms100": "sms_100",
            "sms_100": "sms_100",
            "500": "sms_500",
            "sms500": "sms_500",
            "sms_500": "sms_500",
            "1000": "sms_1000",
            "1,000": "sms_1000",
            "sms1000": "sms_1000",
            "sms_1000": "sms_1000",
        }.get(str(raw).replace(" ", "").lower(), sms_pack)
        item = CHURVOX_CHECKOUT_CATALOG["sms"].get(key)
        if not item:
            raise HTTPException(status_code=400, detail="Unknown SMS credit pack.")
        return "sms", key, item

    if checkout_type in {"growth_pack", "addon", "myob_addon"} or addon_type:
        key = addon_type or checkout_type
        if key in {"growth", "growth_pack", "command_growth", "command_growth_pack", "blocks", "block"}:
            key = "command_growth_pack"
        if key in {"myob", "myob_addon", "myob-sync"}:
            key = "myob_addon"
        item = CHURVOX_CHECKOUT_CATALOG["addons"].get(key)
        if not item:
            raise HTTPException(status_code=400, detail="Unknown add-on.")
        return item.get("checkout_type") or "addon", key, item

    plan_key = plan_aliases.get(plan_type, plan_type)
    item = CHURVOX_CHECKOUT_CATALOG["plans"].get(plan_key)
    if not item:
        raise HTTPException(status_code=400, detail="Unknown plan.")
    return "plan", plan_key, item

async def _cv_create_stripe_checkout(payload: dict, current_user: dict):
    import urllib.parse
    import urllib.request
    import urllib.error
    import base64

    secret = _cv_checkout_secret()
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="Stripe is not configured yet. Add STRIPE_SECRET_KEY in Render before taking checkout payments.",
        )

    checkout_type, item_key, item = _cv_checkout_pick(payload)
    business_id = str(await get_user_business_id(current_user))
    user_email = _cv_checkout_text(current_user.get("email"))
    user_id = _cv_checkout_text(current_user.get("id") or current_user.get("_id"))

    quantity = 1
    try:
        quantity = max(1, min(int(payload.get("quantity") or 1), 50))
    except Exception:
        quantity = 1

    mode = "payment" if checkout_type == "sms" else "subscription"
    success_url = _cv_checkout_success_url(payload.get("success_path"), item_key)
    cancel_url = _cv_checkout_cancel_url(payload.get("cancel_path"), item_key)
    price_id = _cv_checkout_price_id(item)

    fields = [
        ("mode", mode),
        ("success_url", success_url),
        ("cancel_url", cancel_url),
        ("client_reference_id", business_id),
        ("allow_promotion_codes", "true"),
        ("line_items[0][quantity]", str(quantity)),
        ("metadata[checkout_type]", checkout_type),
        ("metadata[item_key]", item_key),
        ("metadata[business_id]", business_id),
        ("metadata[user_id]", user_id),
        ("metadata[user_email]", user_email),
    ]

    if checkout_type == "plan":
        fields.extend([
            ("metadata[plan_type]", item.get("metadata_plan") or item_key),
            ("subscription_data[metadata][plan_type]", item.get("metadata_plan") or item_key),
            ("subscription_data[metadata][business_id]", business_id),
            ("subscription_data[metadata][checkout_type]", "plan"),
        ])

    if checkout_type in {"growth_pack", "myob_addon"}:
        fields.extend([
            ("metadata[addon_type]", item_key),
            ("subscription_data[metadata][addon_type]", item_key),
            ("subscription_data[metadata][business_id]", business_id),
            ("subscription_data[metadata][checkout_type]", checkout_type),
        ])

    if checkout_type == "sms":
        fields.extend([
            ("metadata[sms_pack]", item_key),
            ("metadata[credits]", str(item.get("credits") or "")),
        ])

    if user_email:
        fields.append(("customer_email", user_email))

    if price_id:
        fields.append(("line_items[0][price]", price_id))
    else:
        fields.extend([
            ("line_items[0][price_data][currency]", "nzd"),
            ("line_items[0][price_data][unit_amount]", str(int(item["amount_cents"]))),
            ("line_items[0][price_data][product_data][name]", f"Churvox {item['display']}"),
            ("line_items[0][price_data][product_data][description]", f"{item['display']} for Churvox"),
        ])
        if mode == "subscription":
            fields.append(("line_items[0][price_data][recurring][interval]", item.get("interval") or "month"))

    encoded = urllib.parse.urlencode(fields).encode("utf-8")
    req = urllib.request.Request(
        "https://api.stripe.com/v1/checkout/sessions",
        data=encoded,
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body)
            msg = parsed.get("error", {}).get("message") or body
        except Exception:
            msg = body
        raise HTTPException(status_code=400, detail=f"Stripe checkout failed: {msg}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Stripe checkout error: {exc}")

    session_id = data.get("id")
    checkout_url = data.get("url")
    if not checkout_url:
        raise HTTPException(status_code=500, detail="Stripe did not return a checkout URL.")

    now = datetime.now(timezone.utc)
    try:
        await db.checkout_sessions.update_one(
            {"stripe_session_id": session_id},
            {"$set": {
                "stripe_session_id": session_id,
                "business_id": business_id,
                "user_id": user_id,
                "user_email": user_email,
                "checkout_type": checkout_type,
                "item_key": item_key,
                "mode": mode,
                "quantity": quantity,
                "amount_cents": int(item.get("amount_cents") or 0),
                "credits": item.get("credits"),
                "status": "created",
                "checkout_url": checkout_url,
                "created_at": now,
                "updated_at": now,
            }},
            upsert=True,
        )
    except Exception:
        pass

    return {
        "success": True,
        "checkout_url": checkout_url,
        "url": checkout_url,
        "session_id": session_id,
        "checkout_type": checkout_type,
        "item_key": item_key,
        "mode": mode,
        "stripe_price_configured": bool(price_id),
    }

@api_router.get("/billing/checkout-catalog")
async def get_churvox_checkout_catalog(current_user: dict = Depends(get_current_user)):
    return {"success": True, "catalog": _cv_checkout_catalog_public()}

@api_router.post("/billing/unified-checkout")
async def create_churvox_unified_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    return await _cv_create_stripe_checkout(payload or {}, current_user)

@api_router.post("/billing/create-checkout")
async def create_churvox_billing_checkout_alias(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    return await _cv_create_stripe_checkout(payload or {}, current_user)

@api_router.post("/billing/addons/checkout")
async def create_churvox_addon_checkout_alias(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    payload = dict(payload or {})
    if not payload.get("checkout_type"):
        payload["checkout_type"] = payload.get("addon_type") or payload.get("addon") or "addon"
    return await _cv_create_stripe_checkout(payload, current_user)

@api_router.post("/billing/sms-checkout")
async def create_churvox_sms_checkout(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    payload = dict(payload or {})
    payload["checkout_type"] = "sms"
    return await _cv_create_stripe_checkout(payload, current_user)


# CORS_HARD_FIX_20260412


@api_router.post("/ai/operator/approval-items/{item_id}/dismiss")
async def ai_operator_dismiss(item_id: str, current_user: dict = Depends(get_current_user)):
    return await ai_operator_reject(item_id, current_user)


@api_router.post("/ai-operator/run-daily-plan")


@api_router.get("/api/ai/receptionist/enquiries")
async def ai_receptionist_enquiries(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or ""))
    business_id = await get_user_business_id(current_user)
    await _ensure_ai_receptionist_collections()
    items = [serialize_doc(d) async for d in db.ai_enquiries.find({"business_id": business_id}).sort("created_at", -1).limit(200)]
    return {"success": True, "enquiries": items}

@api_router.post("/api/ai/receptionist/enquiries")
async def ai_receptionist_create_enquiry(payload: dict, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or ""))
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    source = str(payload.get("source") or "manual")
    doc = {"business_id": business_id, "source": source, "customer_name": str(payload.get("customer_name") or ""), "customer_phone": str(payload.get("customer_phone") or ""), "customer_email": str(payload.get("customer_email") or ""), "address": str(payload.get("address") or ""), "suburb": str(payload.get("suburb") or ""), "message": str(payload.get("message") or ""), "photos": payload.get("photos") if isinstance(payload.get("photos"), list) else [], "preferred_date": payload.get("preferred_date"), "status": "new", "created_at": now, "updated_at": now}
    ins = await db.ai_enquiries.insert_one(doc)
    return {"success": True, "enquiry": serialize_doc({**doc, "_id": ins.inserted_id})}

@api_router.post("/api/ai/receptionist/enquiries/{enquiry_id}/prepare")
async def ai_receptionist_prepare(enquiry_id: str, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or ""))
    business_id = await get_user_business_id(current_user)
    q = {"business_id": business_id, "$or": [{"_id": ObjectId(enquiry_id)}] if ObjectId.is_valid(enquiry_id) else [{"id": enquiry_id}]}
    enquiry = await db.ai_enquiries.find_one(q)
    if not enquiry: raise HTTPException(status_code=404, detail="Enquiry not found")
    clients = [c async for c in db.clients.find({"business_id": business_id}).limit(200)]
    workers = [w async for w in db.business_users.find({"business_id": business_id, "role": {"$in": ["worker", "employee", "field_worker"]}}).limit(50)]
    prep = _receptionist_prepare_payload(enquiry, clients, workers)
    await db.ai_enquiries.update_one({"_id": enquiry["_id"]}, {"$set": {**prep, "status": "needs_review", "updated_at": datetime.now(timezone.utc)}})
    enquiry.update(prep); enquiry["status"] = "needs_review"
    return {"success": True, "enquiry": serialize_doc(enquiry)}

@api_router.post("/api/ai/receptionist/enquiries/{enquiry_id}/convert-to-job")
async def ai_receptionist_convert_to_job(enquiry_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or ""))
    business_id = await get_user_business_id(current_user)
    enquiry = await db.ai_enquiries.find_one({"business_id": business_id, "$or": [{"_id": ObjectId(enquiry_id)}] if ObjectId.is_valid(enquiry_id) else [{"id": enquiry_id}]})
    if not enquiry: raise HTTPException(status_code=404, detail="Enquiry not found")
    now = datetime.now(timezone.utc)
    client_id = str(enquiry.get("suggested_client_id") or "")
    if not client_id:
        cdoc = {"business_id": business_id, "name": enquiry.get("customer_name") or "New client", "phone": enquiry.get("customer_phone") or "", "email": enquiry.get("customer_email") or "", "address": enquiry.get("address") or "", "created_at": now, "updated_at": now}
        cins = await db.clients.insert_one(cdoc); client_id = str(cins.inserted_id)
    job = {"business_id": business_id, "client_id": client_id, "title": str((enquiry.get("suggested_job") or {}).get("title") or "New job from enquiry"), "address": enquiry.get("address") or "", "status": "new", "notes": enquiry.get("message") or "", "assigned_worker_id": str(enquiry.get("suggested_worker_id") or ""), "created_at": now, "updated_at": now}
    jins = await db.jobs.insert_one(job)
    await db.ai_enquiries.update_one({"_id": enquiry["_id"]}, {"$set": {"status": "converted_to_job", "suggested_client_id": client_id, "updated_at": now}})
    return {"success": True, "job_id": str(jins.inserted_id), "client_id": client_id}

@api_router.post("/api/ai/receptionist/enquiries/{enquiry_id}/convert-to-quote")
async def ai_receptionist_convert_to_quote(enquiry_id: str, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or ""))
    business_id = await get_user_business_id(current_user)
    enquiry = await db.ai_enquiries.find_one({"business_id": business_id, "$or": [{"_id": ObjectId(enquiry_id)}] if ObjectId.is_valid(enquiry_id) else [{"id": enquiry_id}]})
    if not enquiry: raise HTTPException(status_code=404, detail="Enquiry not found")
    now = datetime.now(timezone.utc)
    quote = {"business_id": business_id, "client_id": str(enquiry.get("suggested_client_id") or ""), "title": str((enquiry.get("suggested_quote") or {}).get("title") or "Draft quote from enquiry"), "status": "draft", "notes": enquiry.get("message") or "", "created_at": now, "updated_at": now}
    qins = await db.quotes.insert_one(quote)
    await db.ai_enquiries.update_one({"_id": enquiry["_id"]}, {"$set": {"status": "converted_to_quote", "updated_at": now}})
    return {"success": True, "quote_id": str(qins.inserted_id)}

@api_router.post("/api/ai/receptionist/enquiries/{enquiry_id}/dismiss")
async def ai_receptionist_dismiss(enquiry_id: str, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or ""))
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    res = await db.ai_enquiries.update_one({"business_id": business_id, "$or": [{"_id": ObjectId(enquiry_id)}] if ObjectId.is_valid(enquiry_id) else [{"id": enquiry_id}]}, {"$set": {"status": "dismissed", "updated_at": now}})
    if res.matched_count == 0: raise HTTPException(status_code=404, detail="Enquiry not found")
    return {"success": True}

def _parse_due_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str) and value:
        try: return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except Exception: return None
    return None

@api_router.get("/api/ai/recurring")
async def ai_recurring_get(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or ""))
    business_id = await get_user_business_id(current_user)
    rules = [serialize_doc(r) async for r in db.recurring_work_rules.find({"business_id": business_id}).sort("next_due_date", 1)]
    return {"success": True, "rules": rules}

@api_router.post("/api/ai/recurring/rules")
async def ai_recurring_create_rule(payload: dict, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or ""))
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    doc = {"business_id": business_id, "client_id": str(payload.get("client_id") or ""), "title": str(payload.get("title") or "Recurring work"), "service_type": str(payload.get("service_type") or ""), "frequency": str(payload.get("frequency") or "weekly"), "interval_days": int(payload.get("interval_days") or 7), "preferred_worker_id": str(payload.get("preferred_worker_id") or ""), "preferred_day": payload.get("preferred_day"), "next_due_date": payload.get("next_due_date"), "last_created_job_id": "", "active": bool(payload.get("active", True)), "created_at": now, "updated_at": now}
    ins = await db.recurring_work_rules.insert_one(doc)
    return {"success": True, "rule": serialize_doc({**doc, "_id": ins.inserted_id})}

@api_router.patch("/api/ai/recurring/rules/{rule_id}")
async def ai_recurring_patch_rule(rule_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or ""))
    business_id = await get_user_business_id(current_user)
    patch = {k: v for k, v in payload.items() if k in {"title", "service_type", "frequency", "interval_days", "preferred_worker_id", "preferred_day", "next_due_date", "active", "client_id"}}
    patch["updated_at"] = datetime.now(timezone.utc)
    res = await db.recurring_work_rules.update_one({"business_id": business_id, "$or": [{"_id": ObjectId(rule_id)}] if ObjectId.is_valid(rule_id) else [{"id": rule_id}]}, {"$set": patch})
    if res.matched_count == 0: raise HTTPException(status_code=404, detail="Rule not found")
    return {"success": True}

@api_router.post("/api/ai/recurring/prepare-next-run")
async def ai_recurring_prepare_next_run(current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or ""))
    business_id = await get_user_business_id(current_user)
    today = datetime.now(timezone.utc).date()
    horizon = today + timedelta(days=14)
    rules = [serialize_doc(r) async for r in db.recurring_work_rules.find({"business_id": business_id, "active": {"$ne": False}})]
    due = [r for r in rules if (_parse_due_date(r.get("next_due_date")) or today) <= horizon]
    grouped = {}
    for r in due:
        key = str(r.get("suburb") or r.get("region") or "Unspecified")
        grouped.setdefault(key, []).append(r)
    return {"success": True, "due_rules": due, "grouped_by_area": grouped}

@api_router.post("/api/ai/recurring/approve-run")
async def ai_recurring_approve_run(payload: dict, current_user: dict = Depends(get_current_user)):
    _owner_roles_only(str((current_user or {}).get("role") or ""))
    business_id = await get_user_business_id(current_user)
    rule_ids = payload.get("rule_ids") or []
    now = datetime.now(timezone.utc)
    created = []
    for rid in rule_ids:
        rule = await db.recurring_work_rules.find_one({"business_id": business_id, "$or": [{"_id": ObjectId(rid)}] if ObjectId.is_valid(str(rid)) else [{"id": str(rid)}]})
        if not rule or rule.get("active") is False: continue
        existing = await db.jobs.find_one({"business_id": business_id, "recurring_rule_id": str(rule.get("_id")), "scheduled_date": rule.get("next_due_date")})
        if existing: continue
        job = {"business_id": business_id, "client_id": str(rule.get("client_id") or ""), "title": rule.get("title") or "Recurring work", "service_type": rule.get("service_type") or "", "assigned_worker_id": str(rule.get("preferred_worker_id") or ""), "scheduled_date": rule.get("next_due_date"), "status": "new", "recurring_rule_id": str(rule.get("_id")), "created_at": now, "updated_at": now}
        ins = await db.jobs.insert_one(job)
        next_due = (_parse_due_date(rule.get("next_due_date")) or now.date()) + timedelta(days=int(rule.get("interval_days") or 7))
        await db.recurring_work_rules.update_one({"_id": rule["_id"]}, {"$set": {"last_created_job_id": str(ins.inserted_id), "next_due_date": next_due.isoformat(), "updated_at": now}})
        created.append(str(ins.inserted_id))
    return {"success": True, "created_job_ids": created}

@api_router.post("/api/ai-operator/run-daily-plan")
async def ai_operator_run_daily_plan(current_user: dict = Depends(get_current_user)):
    await smart_hub_process_due_communications(current_user)
    scan = await smart_hub_scan(current_user)
    business_id = await get_user_business_id(current_user)
    today = datetime.now(timezone.utc).date().isoformat()
    actions = [a for a in (scan.get("actions") or []) if str(a.get("status") or "") == "pending"]
    actions = sorted(actions, key=lambda a: -(a.get("priority_score") or 0))
    best = actions[0]["title"] if actions else "No urgent actions"
    counts = {"pending": len(actions), "high_risk": len([a for a in actions if str(a.get("risk") or "") == "high"])}
    plan = {"business_id": business_id, "date": today, "summary": f"{len(actions)} pending actions prepared.", "best_next_move": best, "counts": counts, "risks": [a.get("title") for a in actions[:3] if str(a.get("risk") or "") == "high"], "action_ids": [str(a.get("id") or a.get("_id") or "") for a in actions], "updated_at": datetime.now(timezone.utc)}
    await db.ai_operator_daily_plans.update_one({"business_id": business_id, "date": today}, {"$set": plan, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}}, upsert=True)
    saved = await db.ai_operator_daily_plans.find_one({"business_id": business_id, "date": today}) or plan
    return {"success": True, "plan": serialize_doc(saved), "actions": actions}


PROOF_PACK_ALLOWED_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "platform_owner"}

def _proof_pack_guard(role: str):
    if str(role or "").lower() not in PROOF_PACK_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Proof-to-Paid is restricted to owner/admin roles")

def _proof_pack_query_by_id(proof_pack_id: str, business_id: str):
    queries = [{"id": proof_pack_id, "business_id": business_id}]
    if ObjectId.is_valid(proof_pack_id):
        queries.append({"_id": ObjectId(proof_pack_id), "business_id": business_id})
    return {"$or": queries}

@api_router.get("/proof-packs")
async def proof_packs_list(status: str | None = None, job_id: str | None = None, client_id: str | None = None, current_user: dict = Depends(get_current_user)):
    _proof_pack_guard(current_user.get("role"))
    business_id = await get_user_business_id(current_user)
    q = {"business_id": business_id}
    if status: q["status"] = status
    if job_id: q["job_id"] = job_id
    if client_id: q["client_id"] = client_id
    packs = [serialize_doc(p) async for p in db.job_proof_packs.find(q).sort("updated_at", -1).limit(200)]
    completed_jobs = [serialize_doc(j) async for j in db.jobs.find({"business_id": business_id, "status": "completed"}).sort("updated_at", -1).limit(200)]
    job_ids_with_pack = {str(p.get("job_id") or "") for p in packs}
    jobs_without_pack = [j for j in completed_jobs if str(j.get("id") or j.get("_id") or "") not in job_ids_with_pack]
    return {"success": True, "data": packs, "completed_jobs_without_pack": jobs_without_pack}

@api_router.get("/proof-packs/{proof_pack_id}")
async def proof_pack_get(proof_pack_id: str, current_user: dict = Depends(get_current_user)):
    _proof_pack_guard(current_user.get("role"))
    business_id = await get_user_business_id(current_user)
    pack = await db.job_proof_packs.find_one(_proof_pack_query_by_id(proof_pack_id, business_id))
    if not pack:
        raise HTTPException(status_code=404, detail="Proof pack not found")
    return {"success": True, "data": serialize_doc(pack)}

@api_router.post("/proof-packs/prepare-for-job/{job_id}")
async def proof_pack_prepare(job_id: str, current_user: dict = Depends(get_current_user)):
    _proof_pack_guard(current_user.get("role"))
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    job = await db.jobs.find_one({"business_id": business_id, "$or": [{"id": job_id}, {"_id": ObjectId(job_id)}] if ObjectId.is_valid(job_id) else [{"id": job_id}]})
    if not job: raise HTTPException(status_code=404, detail="Job not found")
    client_id = str(job.get("client_id") or "")
    client = await db.clients.find_one({"business_id": business_id, "$or": [{"id": client_id}, {"_id": ObjectId(client_id)}] if ObjectId.is_valid(client_id) else [{"id": client_id}]}) if client_id else None
    photos = job.get("photos") or job.get("completion_photos") or []
    timeline = [{"label": "Assigned", "at": job.get("assigned_at")}, {"label": "Started", "at": job.get("started_at")}, {"label": "Completed", "at": job.get("completed_at")}]
    timeline = [t for t in timeline if t.get("at")]
    worker_name = job.get("assigned_worker_name") or job.get("worker_name") or "the assigned team"
    time_summary = job.get("total_time_on_site_label") or "tracked job time"
    ai_summary = f"Work has been completed for {client.get('name') if client else 'the client'} at {job.get('address') or 'the job site'}. {worker_name} completed {job.get('title') or 'the requested service'}, uploaded {len(photos)} completion photo(s), and recorded {time_summary}. The proof pack is ready for owner review."
    existing = await db.job_proof_packs.find_one({"business_id": business_id, "job_id": str(job.get('id') or job.get('_id'))})
    payload = {"business_id": business_id, "job_id": str(job.get("id") or job.get("_id")), "client_id": client_id or None, "invoice_id": job.get("invoice_id"), "quote_id": job.get("quote_id"), "status": "ready_for_owner_review", "ai_summary": ai_summary, "owner_message": "", "work_summary": job.get("notes") or "", "photos": photos, "timeline": timeline, "updated_at": now, "created_by": str(current_user.get("id") or "")}
    if existing:
        await db.job_proof_packs.update_one({"_id": existing["_id"]}, {"$set": payload})
    else:
        payload.update({"id": secrets.token_urlsafe(10), "created_at": now})
        await db.job_proof_packs.insert_one(payload)
    pack = await db.job_proof_packs.find_one({"business_id": business_id, "job_id": payload["job_id"]})
    return {"success": True, "data": serialize_doc(pack)}

@api_router.post("/proof-packs/{proof_pack_id}/approve")
async def proof_pack_approve(proof_pack_id: str, current_user: dict = Depends(get_current_user)):
    _proof_pack_guard(current_user.get("role"))
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    pack = await db.job_proof_packs.find_one(_proof_pack_query_by_id(proof_pack_id, business_id))
    if not pack: raise HTTPException(status_code=404, detail="Proof pack not found")
    token = pack.get("public_token") or secrets.token_urlsafe(32)
    await db.job_proof_packs.update_one({"_id": pack["_id"]}, {"$set": {"status": "approved", "public_token": token, "approved_at": now, "approved_by": str(current_user.get("id") or ""), "updated_at": now}})
    return {"success": True, "public_url_path": f"/client-portal/{token}"}

@api_router.post("/proof-packs/{proof_pack_id}/mark-sent")
async def proof_pack_mark_sent(proof_pack_id: str, current_user: dict = Depends(get_current_user)):
    _proof_pack_guard(current_user.get("role"))
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    pack = await db.job_proof_packs.find_one(_proof_pack_query_by_id(proof_pack_id, business_id))
    if not pack: raise HTTPException(status_code=404, detail="Proof pack not found")
    await db.job_proof_packs.update_one({"_id": pack["_id"]}, {"$set": {"status": "sent", "sent_at": now, "updated_at": now}})
    return {"success": True}

@api_router.post("/proof-packs/{proof_pack_id}/archive")
async def proof_pack_archive(proof_pack_id: str, current_user: dict = Depends(get_current_user)):
    _proof_pack_guard(current_user.get("role"))
    business_id = await get_user_business_id(current_user)
    now = datetime.now(timezone.utc)
    pack = await db.job_proof_packs.find_one(_proof_pack_query_by_id(proof_pack_id, business_id))
    if not pack: raise HTTPException(status_code=404, detail="Proof pack not found")
    await db.job_proof_packs.update_one({"_id": pack["_id"]}, {"$set": {"status": "archived", "updated_at": now}})
    return {"success": True}

@api_router.get("/public/client-portal/{token}")
async def public_client_portal(token: str):
    now = datetime.now(timezone.utc)
    pack = await db.job_proof_packs.find_one({"public_token": token})
    if not pack: raise HTTPException(status_code=404, detail="Portal not found")
    if pack.get("status") in {"approved", "sent"}:
        await db.job_proof_packs.update_one({"_id": pack["_id"]}, {"$set": {"status": "client_viewed", "client_viewed_at": now, "updated_at": now}})
        pack["status"] = "client_viewed"
    business = await db.businesses.find_one({"_id": ObjectId(pack["business_id"])}) if ObjectId.is_valid(str(pack.get("business_id"))) else None
    return {"success": True, "data": {"business_name": (business or {}).get("business_name") or (business or {}).get("name") or "Churvox Business", "job_title": pack.get("job_title") or "", "completed_at": pack.get("completed_at"), "ai_summary": pack.get("ai_summary"), "owner_message": pack.get("owner_message"), "photos": pack.get("photos") or [], "timeline": pack.get("timeline") or [], "invoice_id": pack.get("invoice_id"), "quote_id": pack.get("quote_id"), "status": pack.get("status")}}

@api_router.post("/public/client-portal/{token}/approve-work")
async def public_client_portal_approve(token: str):
    now = datetime.now(timezone.utc)
    pack = await db.job_proof_packs.find_one({"public_token": token})
    if not pack: raise HTTPException(status_code=404, detail="Portal not found")
    next_status = "paid" if pack.get("status") == "paid" else "client_approved"
    await db.job_proof_packs.update_one({"_id": pack["_id"]}, {"$set": {"status": next_status, "client_approved_at": now, "updated_at": now}})
    return {"success": True}


# CHURVOX_ROUTE_DEDUPE_START
# Server hygiene: remove exact duplicate method/path routes after all app routes are registered.
# Keeps the LAST route because later code is the newer patched/final logic.
try:
    from fastapi.routing import APIRoute

    _seen_route_keys = set()
    _cleaned_routes_reversed = []
    _removed_duplicate_routes = []

    for _route in reversed(list(app.router.routes)):
        if isinstance(_route, APIRoute):
            _methods = tuple(sorted(m for m in (_route.methods or set()) if m not in {"HEAD", "OPTIONS"}))
            _keys = tuple((method, _route.path) for method in _methods)

            if any(key in _seen_route_keys for key in _keys):
                _removed_duplicate_routes.append({
                    "path": _route.path,
                    "methods": list(_methods),
                    "name": getattr(_route, "name", ""),
                })
                continue

            for key in _keys:
                _seen_route_keys.add(key)

        _cleaned_routes_reversed.append(_route)

    app.router.routes = list(reversed(_cleaned_routes_reversed))
    app.state.churvox_removed_duplicate_routes = _removed_duplicate_routes
except Exception as _route_dedupe_error:
    try:
        app.state.churvox_route_dedupe_error = str(_route_dedupe_error)
    except Exception:
        pass
# CHURVOX_ROUTE_DEDUPE_END

