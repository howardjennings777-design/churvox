import os
import json
import urllib.request
import urllib.error
import urllib.parse
import asyncio
import csv
import io
import hashlib
from passlib.context import CryptContext
from ai_service import generate_ai_text
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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, Query
from app.plan_rules import normalize_plan, get_plan_features, can_use_feature, get_max_clients
from owner_bootstrap import ensure_owner_account
from fastapi.responses import RedirectResponse, HTMLResponse, FileResponse
from pydantic import BaseModel
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

class PortalTokenBody(BaseModel):
    entity_type: str
    entity_id: str

def make_portal_token(business_id: str, entity_type: str, entity_id: str):
    raw = f"{business_id}:{entity_type}:{entity_id}:{JWT_SECRET}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:40]




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
        "price": 30, "max_workers": 0, "max_clients": 20,
        "sms": False, "myob": False, "team": False,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
    },
    "team": {
        "price": 70, "max_workers": 5, "max_clients": 30,
        "sms": True, "myob": False, "team": True,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
    },
    "pro": {
        "price": 110, "max_workers": 20, "max_clients": 40,
        "sms": True, "myob": False, "team": True,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
    },
    "enterprise": {
        "price": 240, "max_workers": 50, "max_clients": 50,
        "sms": True, "myob": True, "team": True,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
        "extra_blocks": True,
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
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

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
    title: Optional[str] = None
    job_type: Optional[JobType] = None
    client_id: Optional[str] = None
    customer_name: Optional[str] = None
    address: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    scheduled_time: Optional[str] = None
    estimated_duration: Optional[int] = None
    price: Optional[float] = None
    pricing_type: Optional[str] = None
    hourly_rate: Optional[float] = None
    extras: Optional[List[dict]] = None
    notes: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
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
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    address: Optional[str] = None
    job_description: Optional[str] = None
    price: Optional[float] = None
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    status: Optional[QuoteStatus] = None

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
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    subtotal: Optional[float] = None
    gst_rate: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[InvoiceStatus] = None

class PlanUpdate(BaseModel):
    plan: PlanType

class CreateCheckoutSessionRequest(BaseModel):
    plan: Optional[PlanType] = None
    plan_type: Optional[str] = None
    addon_type: Optional[str] = None
    quantity: Optional[int] = 1
    country: Optional[str] = None

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
    role = str(user.get("role") or "").strip().lower()
    if role not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Only business admins can perform this action")
    return user

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




# ===================== PLATFORM OWNER ADMIN ENDPOINTS =====================
# Read-only V1 command centre endpoints for hello@churvox.com / PLATFORM_OWNER_EMAILS.
# These endpoints are intentionally safe: no cross-business mutation, no passwords, no secrets.

async def require_platform_owner_user(current_user: dict = Depends(get_current_user)):
    if not is_platform_owner(current_user):
        raise HTTPException(status_code=403, detail="Platform owner access required")
    return current_user


def _admin_public_doc(doc: dict | None) -> dict | None:
    if not doc:
        return doc
    clean = dict(doc)
    for secret_key in [
        "password_hash",
        "password",
        "reset_token",
        "invite_token",
        "verification_token",
        "stripe_customer_id",
        "stripe_subscription_id",
        "api_key",
        "access_token",
        "refresh_token",
    ]:
        clean.pop(secret_key, None)
    return make_json_safe(clean)


async def _admin_collection_names() -> set:
    try:
        return set(await db.list_collection_names())
    except Exception:
        return set()


async def _admin_count(collections: set, name: str, query: dict | None = None) -> int:
    if name not in collections:
        return 0
    try:
        return await db[name].count_documents(query or {})
    except Exception:
        return 0


async def _admin_recent(collections: set, name: str, limit: int = 50, projection: dict | None = None) -> list:
    if name not in collections:
        return []
    try:
        cursor = db[name].find({}, projection).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [_admin_public_doc(doc) for doc in docs]
    except Exception:
        try:
            cursor = db[name].find({}, projection).limit(limit)
            docs = await cursor.to_list(length=limit)
            return [_admin_public_doc(doc) for doc in docs]
        except Exception:
            return []


def _admin_plan_from_user(user: dict) -> str:
    plan = str(user.get("plan") or user.get("plan_type") or user.get("subscription_plan") or "solo").strip().lower()
    return plan if plan in PLAN_LIMITS else "solo"


def _admin_business_id_from_user(user: dict) -> str:
    return str(user.get("business_id") or user.get("id") or user.get("_id") or "")


def _admin_business_summary_from_users(users: list) -> list:
    businesses = {}
    for user in users:
        business_id = _admin_business_id_from_user(user)
        if not business_id:
            continue
        current = businesses.setdefault(
            business_id,
            {
                "id": business_id,
                "business_id": business_id,
                "business_name": user.get("business_name") or user.get("company") or user.get("name") or "Unnamed business",
                "owner_name": user.get("name") or "",
                "owner_email": user.get("email") or "",
                "plan": _admin_plan_from_user(user),
                "plan_status": user.get("plan_status") or user.get("subscription_status") or "",
                "users_count": 0,
                "created_at": user.get("created_at"),
            },
        )
        current["users_count"] += 1
        role = str(user.get("role") or "").lower()
        if role in {"owner", "admin", "employer"}:
            current["owner_name"] = user.get("name") or current["owner_name"]
            current["owner_email"] = user.get("email") or current["owner_email"]
            current["business_name"] = user.get("business_name") or current["business_name"]
            current["plan"] = _admin_plan_from_user(user)
            current["plan_status"] = user.get("plan_status") or user.get("subscription_status") or current["plan_status"]
    return [make_json_safe(v) for v in businesses.values()]


async def _build_platform_admin_payload(include_lists: bool = True) -> dict:
    collections = await _admin_collection_names()
    user_projection = {
        "password_hash": 0,
        "password": 0,
        "reset_token": 0,
        "invite_token": 0,
        "verification_token": 0,
        "access_token": 0,
        "refresh_token": 0,
    }

    users = await _admin_recent(collections, "users", 100, user_projection)
    businesses = _admin_business_summary_from_users(users)

    plan_counts = {"solo": 0, "team": 0, "pro": 0, "enterprise": 0}
    for user in users:
        plan_counts[_admin_plan_from_user(user)] += 1

    monthly_revenue = sum((PLAN_LIMITS.get(plan, {}) or {}).get("price", 0) * count for plan, count in plan_counts.items())

    jobs = await _admin_recent(collections, "jobs", 50) if include_lists else []
    clients = await _admin_recent(collections, "clients", 50) if include_lists else []
    quotes = await _admin_recent(collections, "quotes", 50) if include_lists else []
    invoices = await _admin_recent(collections, "invoices", 50) if include_lists else []
    automation = await _admin_recent(collections, "automation_rules", 50) if include_lists else []
    if not automation:
        automation = await _admin_recent(collections, "automation", 50) if include_lists else []
    notifications = await _admin_recent(collections, "notifications", 50) if include_lists else []

    return {
        "success": True,
        "mode": "Full platform",
        "source": "/api/admin/platform-stats",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "monthly_revenue": monthly_revenue,
        "mrr": monthly_revenue,
        "plan_counts": plan_counts,
        "counts": {
            "users": await _admin_count(collections, "users"),
            "businesses": len(businesses),
            "jobs": await _admin_count(collections, "jobs"),
            "clients": await _admin_count(collections, "clients"),
            "quotes": await _admin_count(collections, "quotes"),
            "invoices": await _admin_count(collections, "invoices"),
            "automation": await _admin_count(collections, "automation_rules") or await _admin_count(collections, "automation"),
            "notifications": await _admin_count(collections, "notifications"),
        },
        "users": users if include_lists else [],
        "businesses": businesses if include_lists else [],
        "jobs": jobs,
        "clients": clients,
        "quotes": quotes,
        "invoices": invoices,
        "automation_rules": automation,
        "rules": automation,
        "notifications": notifications,
    }


@api_router.get("/admin/platform-stats")
async def admin_platform_stats(current_user: dict = Depends(require_platform_owner_user)):
    return await _build_platform_admin_payload(include_lists=True)


@api_router.get("/admin/dashboard")
async def admin_dashboard_alias(current_user: dict = Depends(require_platform_owner_user)):
    return await _build_platform_admin_payload(include_lists=True)


@api_router.get("/platform/stats")
async def platform_stats_alias(current_user: dict = Depends(require_platform_owner_user)):
    return await _build_platform_admin_payload(include_lists=True)


@api_router.get("/app-owner/stats")
async def app_owner_stats_alias(current_user: dict = Depends(require_platform_owner_user)):
    return await _build_platform_admin_payload(include_lists=True)


@api_router.get("/admin/users")
async def admin_users(current_user: dict = Depends(require_platform_owner_user), limit: int = Query(100, ge=1, le=500)):
    collections = await _admin_collection_names()
    users = await _admin_recent(collections, "users", limit, {
        "password_hash": 0,
        "password": 0,
        "reset_token": 0,
        "invite_token": 0,
        "verification_token": 0,
        "access_token": 0,
        "refresh_token": 0,
    })
    return {"success": True, "count": len(users), "users": users, "data": users}


@api_router.get("/admin/businesses")
async def admin_businesses(current_user: dict = Depends(require_platform_owner_user)):
    collections = await _admin_collection_names()
    users = await _admin_recent(collections, "users", 1000, {
        "password_hash": 0,
        "password": 0,
        "reset_token": 0,
        "invite_token": 0,
        "verification_token": 0,
        "access_token": 0,
        "refresh_token": 0,
    })
    businesses = _admin_business_summary_from_users(users)
    return {"success": True, "count": len(businesses), "businesses": businesses, "data": businesses}


@api_router.get("/admin/health")
async def admin_health(current_user: dict = Depends(require_platform_owner_user)):
    collections = await _admin_collection_names()
    payload = await _build_platform_admin_payload(include_lists=False)
    return {
        "success": True,
        "status": "ok",
        "service": "churvox-api",
        "database": os.environ.get("DB_NAME", ""),
        "collections": sorted(list(collections))[:100],
        "counts": payload.get("counts", {}),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@api_router.get("/admin/users/{user_id}")
async def admin_user_detail(user_id: str, current_user: dict = Depends(require_platform_owner_user)):
    query = None
    try:
        query = {"_id": ObjectId(str(user_id))}
    except Exception:
        query = {"email": str(user_id).strip().lower()}
    user = await db.users.find_one(query, {
        "password_hash": 0,
        "password": 0,
        "reset_token": 0,
        "invite_token": 0,
        "verification_token": 0,
        "access_token": 0,
        "refresh_token": 0,
    })
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    public_user = _admin_public_doc(user)
    business_id = _admin_business_id_from_user(public_user)
    related = {}
    collections = await _admin_collection_names()
    for name in ["jobs", "clients", "quotes", "invoices", "notifications"]:
        if name not in collections or not business_id:
            related[name] = []
            continue
        try:
            docs = await db[name].find({"business_id": business_id}).sort("created_at", -1).limit(20).to_list(length=20)
            related[name] = [_admin_public_doc(doc) for doc in docs]
        except Exception:
            related[name] = []

    return {"success": True, "user": public_user, "related": related}

# ===================== END PLATFORM OWNER ADMIN ENDPOINTS =====================



# ===================== PAYROLL WORKER PAY RATES =====================

def _safe_money(value, default=0.0):
    try:
        if value is None or value == "":
            return float(default)
        return round(float(value), 2)
    except Exception:
        return float(default)

async def _get_worker_pay_rate(worker_id: str, business_id: str = ""):
    user = None
    queries = []
    try:
        queries.append({"_id": ObjectId(str(worker_id))})
    except Exception:
        pass
    queries.append({"id": str(worker_id)})
    queries.append({"user_id": str(worker_id)})
    queries.append({"email": str(worker_id).strip().lower()})
    for q in queries:
        if business_id:
            q = {**q, "business_id": business_id}
        user = await db.users.find_one(q)
        if user:
            break
    if not user:
        user = await db.users.find_one({"$or": queries})
    if not user:
        return {"hourly_rate": 0, "pay_type": "hourly", "payroll_notes": "", "needs_rate": True}
    rate = _safe_money(user.get("hourly_rate") or user.get("pay_rate") or user.get("payroll_rate") or 0)
    return {
        "hourly_rate": rate,
        "pay_type": user.get("pay_type") or user.get("payroll_type") or "hourly",
        "payroll_notes": user.get("payroll_notes") or "",
        "needs_rate": rate <= 0,
    }

@api_router.post("/payroll/workers/{worker_id}/rate")
async def save_payroll_worker_rate(worker_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    if role not in {"owner", "employer", "admin", "manager", "payroll", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not allowed")

    business_id = str(current_user.get("business_id") or "")
    hourly_rate = _safe_money((payload or {}).get("hourly_rate") or (payload or {}).get("pay_rate") or 0)
    pay_type = str((payload or {}).get("pay_type") or "hourly").strip().lower()
    if pay_type not in {"hourly", "salary", "contractor"}:
        pay_type = "hourly"
    notes = str((payload or {}).get("payroll_notes") or (payload or {}).get("notes") or "").strip()

    if hourly_rate < 0:
        raise HTTPException(status_code=400, detail="Hourly rate cannot be negative")

    queries = []
    try:
        queries.append({"_id": ObjectId(str(worker_id))})
    except Exception:
        pass
    queries.append({"id": str(worker_id)})
    queries.append({"user_id": str(worker_id)})
    queries.append({"email": str(worker_id).strip().lower()})

    target = None
    for q in queries:
        candidate = {**q}
        if business_id:
            candidate["business_id"] = business_id
        target = await db.users.find_one(candidate)
        if target:
            break
    if not target:
        target = await db.users.find_one({"$or": queries})
    if not target:
        raise HTTPException(status_code=404, detail="Worker not found")

    await db.users.update_one(
        {"_id": target["_id"]},
        {"$set": {
            "hourly_rate": hourly_rate,
            "pay_rate": hourly_rate,
            "pay_type": pay_type,
            "payroll_notes": notes,
            "payroll_rate_updated_at": datetime.now(timezone.utc),
        }}
    )
    return {"success": True, "worker_id": str(target.get("_id")), "hourly_rate": hourly_rate, "pay_type": pay_type, "payroll_notes": notes}

@api_router.get("/payroll/workers/{worker_id}/rate")
async def get_payroll_worker_rate(worker_id: str, current_user: dict = Depends(get_current_user)):
    business_id = str(current_user.get("business_id") or "")
    data = await _get_worker_pay_rate(worker_id, business_id)
    return {"success": True, **data}

# ===================== END PAYROLL WORKER PAY RATES =====================

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




# ===================== EXTRA USER BLOCK STRIPE CHECKOUT =====================
# Enterprise add-on: +50 users for $100/month. This route is intentionally
# registered before the legacy Stripe checkout route so it can handle add-ons.

@api_router.post("/stripe/create-checkout-session")
async def create_extra_user_block_checkout(payload: dict, current_user: dict = Depends(require_employer)):
    plan_type = str((payload or {}).get("plan_type") or (payload or {}).get("plan") or "").strip().lower()
    addon_type = str((payload or {}).get("addon_type") or "").strip().lower()

    if plan_type not in {"enterprise_user_block", "extra_user_block"} and addon_type != "extra_user_block":
        # Let the legacy plan checkout route below handle normal plan purchases.
        raise HTTPException(status_code=404, detail="Not an extra user block checkout")

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured")

    current_plan = normalize_plan(current_user.get("plan") or current_user.get("plan_type") or "")
    if current_plan != "enterprise":
        raise HTTPException(status_code=400, detail="Extra 50-user blocks are available on Enterprise only")

    try:
        quantity = int((payload or {}).get("quantity") or 1)
    except Exception:
        quantity = 1
    quantity = max(1, min(quantity, 20))

    business_id = str(current_user.get("business_id") or current_user.get("id") or current_user.get("_id") or "")
    user_id = str(current_user.get("id") or current_user.get("_id") or "")
    customer_email = current_user.get("email") or None

    success_url = f"{FRONTEND_URL}/plans?checkout=success&addon=extra_user_block&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{FRONTEND_URL}/plans?checkout=cancelled&addon=extra_user_block"

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer_email=customer_email,
        line_items=[{
            "price_data": {
                "currency": "nzd",
                "unit_amount": 10000,
                "recurring": {"interval": "month"},
                "product_data": {"name": "Churvox extra 50 users"},
            },
            "quantity": quantity,
        }],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "type": "extra_user_block",
            "addon_type": "extra_user_block",
            "plan_type": "enterprise_user_block",
            "user_id": user_id,
            "business_id": business_id,
            "extra_user_blocks": str(quantity),
        },
    )

    return {
        "success": True,
        "checkout_url": session.url,
        "url": session.url,
        "session_id": session.id,
        "addon_type": "extra_user_block",
        "extra_user_blocks": quantity,
    }


@api_router.post("/billing/confirm-extra-user-block")
async def confirm_extra_user_block_checkout(payload: dict, current_user: dict = Depends(require_employer)):
    session_id = str((payload or {}).get("session_id") or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured")

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not verify Stripe checkout: {exc}")

    metadata = dict(getattr(session, "metadata", {}) or {})
    if metadata.get("addon_type") != "extra_user_block" and metadata.get("type") != "extra_user_block":
        raise HTTPException(status_code=400, detail="Checkout session is not an extra user block purchase")

    payment_status = str(getattr(session, "payment_status", "") or "").lower()
    status = str(getattr(session, "status", "") or "").lower()
    if payment_status not in {"paid", "no_payment_required"} and status != "complete":
        raise HTTPException(status_code=400, detail="Checkout has not completed yet")

    existing = await db.billing_events.find_one({"stripe_session_id": session_id, "type": "extra_user_block"})
    if existing:
        return {"success": True, "already_processed": True, "extra_user_blocks": existing.get("extra_user_blocks", 0)}

    try:
        blocks = int(metadata.get("extra_user_blocks") or 1)
    except Exception:
        blocks = 1
    blocks = max(1, min(blocks, 20))

    user_id = str(current_user.get("id") or current_user.get("_id") or "")
    business_id = str(current_user.get("business_id") or user_id)
    owner_filter = {"$or": [{"_id": ObjectId(user_id)}, {"business_id": business_id, "role": {"$in": ["owner", "employer", "admin"]}}]}

    await db.users.update_one(
        owner_filter,
        {
            "$inc": {"extra_user_blocks": blocks},
            "$set": {
                "extra_user_blocks_updated_at": datetime.now(timezone.utc),
                "extra_user_block_price": 100,
                "extra_user_block_size": 50,
            },
        },
    )
    await db.billing_events.insert_one({
        "type": "extra_user_block",
        "stripe_session_id": session_id,
        "stripe_subscription_id": getattr(session, "subscription", None),
        "business_id": business_id,
        "user_id": user_id,
        "extra_user_blocks": blocks,
        "amount": 100 * blocks,
        "currency": "nzd",
        "created_at": datetime.now(timezone.utc),
    })

    return {"success": True, "extra_user_blocks_added": blocks, "extra_users_added": blocks * 50}

# ===================== END EXTRA USER BLOCK STRIPE CHECKOUT =====================

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
            "price": job.get("price") or 0,
            "pricing_type": job.get("pricing_type") or "fixed",
            "hourly_rate": job.get("hourly_rate") or 0,
            "extras": job.get("extras") or [],
            "notes": job.get("notes") or "",
            "worker_notes": job.get("worker_notes") or "",
            "assigned_worker_id": job.get("assigned_worker_id"),
            "assigned_worker_name": job.get("assigned_worker_name") or "",
            "status": job.get("status") or "assigned",
            "accepted_at": safe_iso(job.get("accepted_at") or job.get("acknowledged_at")),
            "started_at": safe_iso(job.get("started_at") or job.get("in_progress_at")),
            "completed_at": safe_iso(job.get("completed_at")),
            "time_spent_minutes": job.get("time_spent_minutes") or job.get("total_minutes") or 0,
            "quote_id": str(job.get("quote_id") or ""),
            "invoice_id": str(job.get("invoice_id") or ""),
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
async def get_jobs(limit: int = Query(default=100, ge=1, le=300), current_user: dict = Depends(get_current_user)):
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

        query = business_filter(business_id)

        if current_role == "worker":
            worker_ids = set()
            async for buser in db.business_users.find(business_filter(business_id, {"email": current_email, "role": "worker"}), {"_id": 1, "id": 1}):
                worker_ids.add(str(buser.get("_id")))
                if buser.get("id"):
                    worker_ids.add(str(buser.get("id")))
            worker_ids.add(owner_id)
            if worker_ids:
                query["assigned_worker_id"] = {"$in": list(worker_ids)}
            else:
                return []

        projection = {
            "title": 1,
            "job_type": 1,
            "client_id": 1,
            "client_name": 1,
            "customer_name": 1,
            "address": 1,
            "scheduled_date": 1,
            "scheduled_time": 1,
            "estimated_duration": 1,
            "price": 1,
            "pricing_type": 1,
            "hourly_rate": 1,
            "extras": 1,
            "notes": 1,
            "assigned_worker_id": 1,
            "assigned_worker_name": 1,
            "status": 1,
            "is_recurring": 1,
            "recurring_frequency": 1,
            "custom_repeat_days": 1,
            "business_id": 1,
            "created_at": 1,
            "updated_at": 1,
        }

        jobs = []
        cursor = db.jobs.find(query, projection).sort([("scheduled_date", -1), ("created_at", -1)]).limit(limit)
        async for job in cursor:
            jobs.append({
                "id": str(job.get("_id") or job.get("id") or ""),
                "title": job.get("title") or "Untitled Job",
                "job_type": job.get("job_type") or "other",
                "client_id": job.get("client_id"),
                "client_name": job.get("client_name") or "",
                "customer_name": job.get("customer_name") or "",
                "address": job.get("address") or "",
                "scheduled_date": safe_iso(job.get("scheduled_date")),
                "scheduled_time": job.get("scheduled_time") or "",
                "estimated_duration": job.get("estimated_duration") or 60,
                "price": job.get("price") or 0,
                "pricing_type": job.get("pricing_type") or "fixed",
                "hourly_rate": job.get("hourly_rate") or 0,
                "extras": job.get("extras") or [],
                "notes": job.get("notes") or "",
                "assigned_worker_id": job.get("assigned_worker_id"),
                "assigned_worker_name": job.get("assigned_worker_name") or "",
                "status": job.get("status") or "assigned",
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
        if start_lat is not None and start_lng is not None:
            try:
                update_fields["start_lat"] = float(start_lat)
                update_fields["start_lng"] = float(start_lng)
                update_fields["location_status"] = str(location_status or "captured").strip().lower()[:32]
                update_fields["location_captured_at"] = now
            except Exception:
                pass
        elif location_status is not None:
            update_fields["location_status"] = str(location_status).strip().lower()[:32]

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
async def create_draft_invoice_from_job(job_id: str, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    role = str(current_user.get("role") or "").strip().lower()
    if role not in {"owner", "admin", "employer", "manager", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not authorized")

    business_id = _resolve_business_id(current_user)
    owner_id = _resolve_owner_id(current_user)

    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")

    job = await db.jobs.find_one({
        "_id": obj_id,
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ],
    })
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing_invoice_id = str(job.get("invoice_id") or "").strip()
    if existing_invoice_id:
        return {"success": True, "invoice_id": existing_invoice_id, "message": "Invoice already linked"}

    pricing_type = str(job.get("pricing_type") or "fixed").strip().lower()
    worked_hours = float(job.get("time_spent_minutes") or 0) / 60
    estimated_hours = float(job.get("estimated_duration") or 0) / 60
    hourly_rate = float(job.get("hourly_rate") or 0)
    fixed_price = float(job.get("price") or 0)
    subtotal = fixed_price
    if pricing_type == "hourly" and hourly_rate > 0:
        subtotal = hourly_rate * (worked_hours if worked_hours > 0 else estimated_hours)
    gst_rate = float(current_user.get("gst_rate") or 15)
    gst_amount = subtotal * (gst_rate / 100)
    total = subtotal + gst_amount
    now = datetime.now(timezone.utc)
    accounting = await db.accounting_settings.find_one({"business_id": business_id}) if hasattr(db, "accounting_settings") else None
    invoice_mode = str((accounting or {}).get("invoice_mode") or "churvox_only").strip().lower()
    if invoice_mode not in INVOICE_MODES:
        invoice_mode = "churvox_only"

    doc = {
        "invoice_number": f"INV-{datetime.now().strftime('%Y%m%d')}-{str(obj_id)[-5:]}",
        "client_id": job.get("client_id"),
        "customer_name": job.get("client_name") or job.get("customer_name") or "",
        "customer_email": job.get("customer_email") or "",
        "address": job.get("address") or "",
        "description": job.get("title") or "Job invoice",
        "job_notes": job.get("description") or job.get("notes") or "",
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "total": total,
        "status": "draft",
        "job_id": str(obj_id),
        "pricing_type": job.get("pricing_type") or "fixed",
        "hourly_rate": hourly_rate,
        "hours_worked": worked_hours if worked_hours > 0 else estimated_hours,
        "fixed_price": fixed_price,
        "extras": job.get("extras") or [],
        "myob_sync_status": "not_synced" if invoice_mode == "myob_sync" else "not_synced",
        "source": "churvox_internal_draft" if invoice_mode == "myob_external" else "invoice",
        "official_invoice_source": "myob" if invoice_mode == "myob_external" else "churvox",
        "business_id": business_id,
        "owner_id": owner_id,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.invoices.insert_one(doc)
    invoice_id = str(result.inserted_id)
    await db.jobs.update_one({"_id": obj_id}, {"$set": {"invoice_id": invoice_id, "updated_at": now}})

    message = "Draft invoice created"
    if invoice_mode == "myob_external":
        message = "Billing draft prepared. Create the official invoice in MYOB."
    return {"success": True, "invoice_id": invoice_id, "message": message, "invoice_mode": invoice_mode}


@api_router.patch("/jobs/{job_id}/customer-status")
async def update_job_customer_status(job_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    allowed_statuses = {"scheduled", "assigned", "on_the_way", "in_progress", "completed"}
    status = str((payload or {}).get("customer_live_status") or (payload or {}).get("status") or "").strip().lower()
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid customer status")

    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role") or "").strip().lower()
    user_id = str(current_user.get("id") or current_user.get("_id") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")

    job = await db.jobs.find_one(business_filter(business_id, {"_id": obj_id}))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if role in {"worker"}:
        assigned_worker_id = str(job.get("assigned_worker_id") or job.get("worker_id") or "")
        if not assigned_worker_id or assigned_worker_id != user_id:
            raise HTTPException(status_code=403, detail="Not allowed to update this job")
    elif role not in {"owner", "admin", "employer", "manager", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not allowed")

    update_doc = {"customer_live_status": status, "updated_at": datetime.utcnow()}
    if status == "completed" and not job.get("completed_at"):
        update_doc["completed_at"] = datetime.utcnow()
    await db.jobs.update_one(business_filter(business_id, {"_id": obj_id}), {"$set": update_doc})
    return {"success": True, "customer_live_status": status}

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
    plan_type = str((payload or {}).get("plan_type") or "").strip().lower()

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
        return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())

    header_aliases = {
        "name": {"name", "fullname", "full_name", "workername", "worker_name", "employee", "employeename", "employee_name", "staffname", "staff_name"},
        "first_name": {"firstname", "first_name", "givenname", "given_name"},
        "last_name": {"lastname", "last_name", "surname", "familyname", "family_name"},
        "email": {"email", "emailaddress", "email_address", "workeremail", "worker_email", "employeeemail", "employee_email", "staffemail", "staff_email"},
        "phone": {"phone", "phonenumber", "phone_number", "mobile", "mobilenumber", "mobile_number", "cell", "telephone"},
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
    has_header = any(k in header_map for k in ["name", "first_name", "last_name", "email", "phone"])

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
    skipped = 0
    details = []

    for row_num, row in enumerate(data_rows, start=2 if has_header else 1):
        try:
            name = get_cell(row, "name")
            first_name = get_cell(row, "first_name")
            last_name = get_cell(row, "last_name")
            email = get_cell(row, "email").lower()
            phone = get_cell(row, "phone")

            if not name:
                name = " ".join(part for part in [first_name, last_name] if part).strip()

            if not name:
                skipped += 1
                details.append({"row": row_num, "status": "skipped", "reason": "Missing name"})
                continue

            if not email:
                skipped += 1
                details.append({"row": row_num, "status": "skipped", "reason": "Missing email"})
                continue

            existing = await db.business_users.find_one({
                "business_id": business_id,
                "email": email,
                "role": "worker"
            })

            if existing:
                skipped += 1
                details.append({"row": row_num, "status": "skipped", "reason": "Worker already exists"})
                continue

            worker_doc = {
                "name": name,
                "email": email,
                "phone": phone,
                "role": "worker",
                "status": "invited",
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
                    role="worker",
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
        "imported": invited,
        "skipped": skipped,
        "total": len(data_rows),
        "details": details,
        "message": f"Invited {invited} workers, skipped {skipped} rows."
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
        try: return v.isoformat() if hasattr(v, "isoformat") else (str(v) if v else None)
        except Exception: return None
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
    trigger = str((payload or {}).get("trigger") or "").strip()
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
        "actions": (payload or {}).get("actions") or [],
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
    trigger = str((payload or {}).get("trigger") or "").strip()
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

_DEEP_AUTOMATION_TEMPLATES = [
    {"key": "job_completed_invoice_draft", "title": "Job completed → create invoice draft", "description": "When a job is completed, create a draft invoice for owner/admin review.", "trigger": "job.completed", "action": "invoice.create_draft", "approval_first": True},
    {"key": "invoice_overdue_reminder", "title": "Invoice overdue → suggest reminder", "description": "When an invoice is overdue, create a reminder suggestion draft only.", "trigger": "invoice.overdue", "action": "suggest.invoice_reminder", "approval_first": True},
    {"key": "quote_sent_followup", "title": "Quote sent 3 days → suggest follow-up", "description": "When a quote has been sent for 3+ days, create a follow-up suggestion draft.", "trigger": "quote.sent_3d", "action": "suggest.quote_followup", "approval_first": True},
    {"key": "job_due_tomorrow_owner_reminder", "title": "Job due tomorrow → remind owner/admin", "description": "Create an internal reminder when tomorrow's job needs owner/admin visibility.", "trigger": "job.due_tomorrow", "action": "notification.create", "approval_first": False},
    {"key": "worker_completed_job_notify", "title": "Worker completed job → notify owner/admin", "description": "When a worker marks a job completed, notify owner/admin.", "trigger": "worker.job_completed", "action": "notification.create", "approval_first": False},
    {"key": "new_customer_welcome_checkin", "title": "New customer added → suggest welcome/check-in", "description": "Create a welcome/check-in draft suggestion for newly added customers.", "trigger": "customer.created", "action": "suggest.customer_checkin", "approval_first": True},
    {"key": "job_completed_review_request", "title": "Job completed → draft review request", "description": "Create a customer review request draft after completed work.", "trigger": "job.completed", "action": "suggest.review_request", "approval_first": True},
]

@api_router.get("/automation/templates")
async def automation_templates(current_user: dict = Depends(get_current_user)):
    _automation_require_manager(current_user)
    business_id = _automation_business_id(current_user)
    docs = await db.automation_rules.find({"business_id": business_id, "template_key": {"$exists": True}}).to_list(200)
    enabled = {str(d.get("template_key") or "") for d in docs}
    templates = []
    for t in _DEEP_AUTOMATION_TEMPLATES:
        row = dict(t)
        row["id"] = t["key"]
        row["name"] = t["title"]
        row["enabled"] = t["key"] in enabled
        templates.append(row)
    return {"success": True, "templates": templates}

@api_router.post("/automation/templates/{template_key}/enable")
async def automation_enable_template(template_key: str, current_user: dict = Depends(get_current_user)):
    _automation_require_manager(current_user)
    role = _automation_role(current_user)
    if role not in {"owner", "manager", "office_admin", "admin", "employer", "platform_owner"}:
        raise HTTPException(status_code=403, detail="Not allowed")
    business_id = _automation_business_id(current_user)
    template = next((t for t in _DEEP_AUTOMATION_TEMPLATES if t["key"] == str(template_key or "").strip()), None)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    existing = await db.automation_rules.find_one({"business_id": business_id, "template_key": template["key"]})
    if existing:
        return {"success": True, "already_enabled": True, "rule": _automation_clean_doc(existing)}
    now = _automation_now()
    rule = {
        "id": str(_automation_uuid.uuid4()),
        "business_id": business_id,
        "template_key": template["key"],
        "name": template["title"],
        "description": template["description"],
        "trigger": template["trigger"],
        "action": template["action"],
        "enabled": True,
        "approval_first": bool(template.get("approval_first", True)),
        "customer_facing_auto_send": False,
        "config": {"mode": "suggestion_only" if template.get("approval_first") else "internal_notify"},
        "created_by": _automation_user_id(current_user),
        "created_at": now,
        "updated_at": now,
    }
    await db.automation_rules.insert_one(rule)
    return {"success": True, "already_enabled": False, "rule": _automation_clean_doc(rule)}

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

@api_router.get("/automation/runs/{run_id}")
async def automation_get_run(run_id: str, current_user: dict = Depends(get_current_user)):
    _automation_require_manager(current_user)
    business_id = _automation_business_id(current_user)
    run = await db.automation_runs.find_one({"id": run_id, "business_id": business_id})
    if not run:
        return {"success": False, "error": "not_found", "run": None}
    return {"success": True, "run": _automation_clean_doc(run)}

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


def _ai_user_role(current_user: dict) -> str:
    return str((current_user or {}).get("role") or "").strip().lower().replace("-", "_").replace(" ", "_")


_AI_OWNER_ACTION_ALLOWED_ROLES = {"owner", "admin", "employer", "manager", "office_admin"}
_AI_OWNER_ACTION_BLOCKED_ROLES = {"worker", "payroll"}
_AI_ACTION_ACTIVE_STATUSES = {"open", "snoozed", "approved"}
_AI_AUTOMATION_ALLOWED_ROLES = {"owner", "admin", "employer", "manager", "office_admin"}
_AI_AUTOMATION_BLOCKED_ROLES = {"worker", "payroll"}
_AI_AUTOMATION_ACTIVE_STATUSES = {"open", "snoozed"}
_AI_DAILY_BRIEF_ALLOWED_ROLES = {"owner", "admin", "employer", "manager", "office_admin"}
_AI_DAILY_BRIEF_BLOCKED_ROLES = {"worker", "payroll"}
_AI_TEAM_PAYROLL_ALLOWED_ROLES = {"owner", "admin", "employer", "manager", "office_admin", "payroll"}
_AI_TEAM_PAYROLL_BLOCKED_ROLES = {"worker"}
_AI_JOB_CONTROL_ALLOWED_ROLES = {"owner", "admin", "employer", "manager", "office_admin"}
_AI_JOB_CONTROL_BLOCKED_ROLES = {"worker", "payroll"}
_AI_FINANCIAL_RADAR_ALLOWED_ROLES = {"owner", "admin", "employer", "manager", "office_admin"}
_AI_FINANCIAL_RADAR_BLOCKED_ROLES = {"worker", "payroll"}


def _ai_action_now():
    return datetime.now(timezone.utc)


def _ai_action_priority_rank(value: str) -> int:
    value = str(value or "").strip().lower()
    return {"high": 0, "medium": 1, "low": 2}.get(value, 3)


def _ai_action_to_response(doc: dict) -> dict:
    clean = safe_doc(doc) or {}
    clean["priority"] = str(clean.get("priority") or "medium").lower()
    clean["confidence"] = str(clean.get("confidence") or "medium").lower()
    clean["status"] = str(clean.get("status") or "open").lower()
    return make_json_safe(clean)


def _ai_action_role_guard(current_user: dict):
    role = _ai_user_role(current_user)
    if role in _AI_OWNER_ACTION_BLOCKED_ROLES or role not in _AI_OWNER_ACTION_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="AI Action Queue is not available for this role")


def _ai_automation_role_guard(current_user: dict):
    role = _ai_user_role(current_user)
    if role in _AI_AUTOMATION_BLOCKED_ROLES or role not in _AI_AUTOMATION_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="AI Automation Builder is not available for this role")


def _ai_automation_to_response(doc: dict) -> dict:
    clean = safe_doc(doc) or {}
    clean["priority"] = str(clean.get("priority") or "medium").lower()
    clean["confidence"] = str(clean.get("confidence") or "medium").lower()
    clean["status"] = str(clean.get("status") or "open").lower()
    if "id" not in clean:
        clean["id"] = str(clean.get("_id") or "")
    return make_json_safe(clean)


def _ai_daily_brief_role_guard(current_user: dict):
    role = _ai_user_role(current_user)
    if role in _AI_DAILY_BRIEF_BLOCKED_ROLES or role not in _AI_DAILY_BRIEF_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="AI Daily Brief is not available for this role")


def _ai_team_payroll_role_guard(current_user: dict):
    role = _ai_user_role(current_user)
    if role in _AI_TEAM_PAYROLL_BLOCKED_ROLES or role not in _AI_TEAM_PAYROLL_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="AI Team & Payroll Watchtower is not available for this role")


def _ai_job_control_role_guard(current_user: dict):
    role = _ai_user_role(current_user)
    if role in _AI_JOB_CONTROL_BLOCKED_ROLES or role not in _AI_JOB_CONTROL_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="AI Job Control Tower is not available for this role")


def _ai_financial_radar_role_guard(current_user: dict):
    role = _ai_user_role(current_user)
    if role in _AI_FINANCIAL_RADAR_BLOCKED_ROLES or role not in _AI_FINANCIAL_RADAR_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="AI Financial Radar is not available for this role")


def _financial_amount(row: dict) -> float:
    return float(row.get("balance_due") or row.get("amount_due") or row.get("total") or row.get("amount") or row.get("price") or row.get("job_price") or 0)


async def _generate_financial_radar_snapshot(current_user: dict, force: bool = False) -> dict:
    _ai_financial_radar_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = datetime.now(timezone.utc)
    if not force:
        existing = await db.ai_financial_snapshots.find_one({"business_id": business_id}, sort=[("created_at", -1)])
        if existing:
            return existing
    query = {"business_id": business_id}
    invoices = await db.invoices.find(query).to_list(length=1500)
    quotes = await db.quotes.find(query).to_list(length=1200)
    jobs = await db.jobs.find(query).to_list(length=1500)
    clients = await db.clients.find(query).to_list(length=1200)
    today = now.date()
    client_map = {str(c.get("_id")): str(c.get("name") or c.get("client_name") or c.get("customer_name") or "Customer") for c in clients}
    invoice_job_ids = {str(i.get("job_id") or i.get("source_job_id") or "") for i in invoices if (i.get("job_id") or i.get("source_job_id"))}

    unpaid_invoices = [i for i in invoices if str(i.get("status") or "").strip().lower() not in {"paid", "void", "cancelled", "canceled"}]
    overdue_invoices = [i for i in unpaid_invoices if str(i.get("status") or "").strip().lower() == "overdue" or ((_parse_date_like(i.get("due_date") or i.get("due_at")) or now).date() < today)]
    open_quotes = [q for q in quotes if str(q.get("status") or "").strip().lower() in {"pending", "sent", "draft"}]
    completed_uninvoiced_jobs = []
    for job in jobs:
        status = str(job.get("status") or "").strip().lower()
        if status not in {"completed", "done"}:
            continue
        jid = str(job.get("_id") or job.get("id") or "")
        if jid and jid not in invoice_job_ids:
            completed_uninvoiced_jobs.append(job)

    unpaid_value = sum(_financial_amount(i) for i in unpaid_invoices)
    overdue_value = sum(_financial_amount(i) for i in overdue_invoices)
    open_quote_value = sum(_financial_amount(q) for q in open_quotes)
    uninvoiced_estimate = sum(_financial_amount(j) for j in completed_uninvoiced_jobs)
    revenue_at_risk = overdue_value + open_quote_value + uninvoiced_estimate

    top_debtors = []
    for inv in sorted(unpaid_invoices, key=lambda x: _financial_amount(x), reverse=True)[:10]:
        cid = str(inv.get("client_id") or inv.get("customer_id") or "")
        top_debtors.append({
            "client_name": inv.get("customer_name") or inv.get("client_name") or client_map.get(cid, "Customer"),
            "invoice_number": inv.get("invoice_number") or inv.get("number"),
            "amount": _financial_amount(inv),
            "status": str(inv.get("status") or "unpaid").lower(),
            "due_date": inv.get("due_date") or inv.get("due_at"),
            "invoice_id": str(inv.get("id") or inv.get("_id") or ""),
        })

    quote_followups = []
    for q in sorted(open_quotes, key=lambda x: _financial_amount(x), reverse=True)[:15]:
        created_dt = _parse_date_like(q.get("created_at") or q.get("sent_at") or q.get("updated_at"))
        quote_followups.append({
            "customer_name": q.get("customer_name") or q.get("client_name") or client_map.get(str(q.get("client_id") or ""), "Customer"),
            "quote_amount": _financial_amount(q),
            "status": str(q.get("status") or "pending").lower(),
            "days_waiting": (today - created_dt.date()).days if created_dt else None,
            "quote_id": str(q.get("id") or q.get("_id") or ""),
        })

    uninvoiced_jobs = []
    for j in completed_uninvoiced_jobs[:15]:
        uninvoiced_jobs.append({
            "job_id": str(j.get("id") or j.get("_id") or ""),
            "job_title": j.get("title") or j.get("job_title") or "Completed job",
            "customer_name": j.get("customer_name") or j.get("client_name") or client_map.get(str(j.get("client_id") or ""), "Customer"),
            "estimated_value": _financial_amount(j),
            "completed_date": j.get("completed_at") or j.get("updated_at") or j.get("scheduled_date"),
        })

    invoice_followups = top_debtors[:12]
    recommended_actions = []
    if overdue_invoices:
        recommended_actions.append("Review overdue invoices first and prepare reminder drafts for top debtors.")
    if open_quotes:
        recommended_actions.append("Prioritise high-value quote follow-ups to protect revenue signal.")
    if completed_uninvoiced_jobs:
        recommended_actions.append("Create draft invoices for completed jobs that are not yet billed.")
    if not recommended_actions:
        recommended_actions.append("No material money risks found right now.")
    risk_points = (len(overdue_invoices) * 3) + (len(open_quotes) * 1) + (len(completed_uninvoiced_jobs) * 2)
    risk_level = "high" if risk_points >= 12 else "medium" if risk_points >= 4 else "low"
    headline = f"{len(overdue_invoices)} overdue invoices, {len(open_quotes)} open quotes, {len(completed_uninvoiced_jobs)} completed jobs not invoiced."
    summary = "AI highlights cash and revenue risks. This is a revenue signal, not true profit, because costs/expenses are not included."
    if os.environ.get("OPENAI_API_KEY", "").strip():
        ai = generate_ai_text(
            "You are Churvox AI Financial Radar. Write one short headline and one short summary. Never call revenue profit unless costs exist.",
            json.dumps({
                "risk_level": risk_level,
                "unpaid_invoice_value": unpaid_value,
                "overdue_invoice_value": overdue_value,
                "open_quote_value": open_quote_value,
                "completed_uninvoiced_estimate": uninvoiced_estimate,
                "revenue_at_risk": revenue_at_risk,
            }),
            f"{headline}\n{summary}",
            150,
        )
        if ai.get("ok") and ai.get("text"):
            lines = [line.strip() for line in str(ai.get("text")).splitlines() if line.strip()]
            if lines:
                headline = lines[0][:180]
            if len(lines) > 1:
                summary = lines[1][:280]

    snapshot = {
        "id": str(uuid.uuid4()),
        "business_id": business_id,
        "headline": headline,
        "summary": summary,
        "unpaid_invoice_count": len(unpaid_invoices),
        "unpaid_invoice_value": unpaid_value,
        "overdue_invoice_count": len(overdue_invoices),
        "overdue_invoice_value": overdue_value,
        "open_quote_count": len(open_quotes),
        "open_quote_value": open_quote_value,
        "completed_uninvoiced_job_count": len(completed_uninvoiced_jobs),
        "completed_uninvoiced_estimate": uninvoiced_estimate,
        "revenue_at_risk": revenue_at_risk,
        "top_debtors": top_debtors,
        "quote_followups": quote_followups,
        "invoice_followups": invoice_followups,
        "uninvoiced_jobs": uninvoiced_jobs,
        "recommended_actions": recommended_actions,
        "risk_level": risk_level,
        "created_at": now,
        "updated_at": now,
    }
    await db.ai_financial_snapshots.insert_one(snapshot)
    await db.ai_financial_events.insert_one({
        "id": str(uuid.uuid4()),
        "business_id": business_id,
        "event_type": "generated",
        "snapshot_id": snapshot["id"],
        "created_at": now,
        "created_by": str(current_user.get("_id") or current_user.get("id") or ""),
    })
    return snapshot


def _job_route(job_id: str) -> str:
    return f"/jobs/{job_id}" if job_id else "/jobs"


async def _generate_job_control_snapshot(current_user: dict, force: bool = False) -> dict:
    _ai_job_control_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = datetime.now(timezone.utc)
    if not force:
        existing = await db.ai_job_control_snapshots.find_one({"business_id": business_id}, sort=[("created_at", -1)])
        if existing:
            return existing
    query = {"business_id": business_id}
    jobs = await db.jobs.find(query).to_list(length=1000)
    clients = await db.clients.find(query).to_list(length=1000)
    workers = await db.business_users.find(query).to_list(length=500)
    invoices = await db.invoices.find(query).to_list(length=1200)
    today = now.date()
    invoice_job_ids = {str(i.get("job_id") or i.get("source_job_id") or "") for i in invoices if (i.get("job_id") or i.get("source_job_id"))}
    client_names = {str(c.get("_id")): str(c.get("name") or c.get("client_name") or c.get("customer_name") or "") for c in clients}
    worker_names = {str(w.get("_id")): str(w.get("name") or w.get("email") or "Worker") for w in workers}

    open_jobs, unassigned_jobs, overdue_jobs, paused_jobs, completed_uninvoiced_jobs, customer_update_candidates = [], [], [], [], [], []
    worker_load = {}
    for job in jobs:
        jid = str(job.get("_id") or job.get("id") or "")
        status = str(job.get("status") or "").strip().lower()
        scheduled = _parse_date_like(job.get("scheduled_date") or job.get("date") or job.get("due_date"))
        item = {"job_id": jid, "title": job.get("title") or "Untitled Job", "customer": job.get("customer_name") or job.get("client_name") or client_names.get(str(job.get("client_id") or ""), ""), "address": job.get("address") or "", "scheduled_date": scheduled.isoformat() if scheduled else None, "status": status or "assigned", "estimated_duration": job.get("estimated_duration"), "estimated_amount": job.get("price") or 0, "completed_date": (_parse_date_like(job.get("completed_at")) or scheduled).isoformat() if (job.get("completed_at") or scheduled) else None, "route": _job_route(jid)}
        is_done = status in {"completed", "done"}
        is_paused = status in {"paused", "stuck", "on_hold"}
        is_open = status not in {"completed", "done", "cancelled", "canceled"}
        if scheduled and scheduled.date() == today:
            pass
        if is_open:
            open_jobs.append(job)
            wid = str(job.get("assigned_worker_id") or job.get("worker_id") or "").strip()
            if wid:
                worker_load[wid] = worker_load.get(wid, 0) + 1
            else:
                unassigned_jobs.append(item)
        if is_open and scheduled and scheduled.date() < today:
            overdue_jobs.append(item)
        if is_paused:
            paused_jobs.append(item)
        if is_done and jid and jid not in invoice_job_ids:
            completed_uninvoiced_jobs.append(item)
        if is_paused or (is_open and scheduled and scheduled.date() < today) or (is_open and not (job.get("assigned_worker_id") or job.get("worker_id"))):
            customer_update_candidates.append(item)

    worker_load_summary = [{"worker_id": wid, "worker_name": worker_names.get(wid, "Worker"), "open_jobs_count": count} for wid, count in sorted(worker_load.items(), key=lambda kv: kv[1], reverse=True)]
    jobs_today_count = sum(1 for j in jobs if (_parse_date_like(j.get("scheduled_date") or j.get("date")) and _parse_date_like(j.get("scheduled_date") or j.get("date")).date() == today))
    risk_score = len(overdue_jobs) * 2 + len(unassigned_jobs) + len(paused_jobs) * 2 + len(completed_uninvoiced_jobs)
    risk_level = "high" if risk_score >= 8 else "medium" if risk_score >= 3 else "low"
    recommended_actions = []
    if unassigned_jobs: recommended_actions.append("Review unassigned jobs and manually assign a worker.")
    if overdue_jobs: recommended_actions.append("Replan overdue jobs and contact affected customers with a draft update.")
    if completed_uninvoiced_jobs: recommended_actions.append("Create draft invoice tasks for completed jobs pending billing.")
    if paused_jobs: recommended_actions.append("Review paused/stuck jobs and unblock next steps.")
    if not recommended_actions: recommended_actions.append("No urgent job risks detected today.")
    headline = f"{len(overdue_jobs)} overdue, {len(unassigned_jobs)} unassigned, {len(completed_uninvoiced_jobs)} completed-not-invoiced."
    summary = "AI highlights job risks. It does not assign workers, change job status, send messages, or create live invoices without approval."
    if os.environ.get("OPENAI_API_KEY", "").strip():
        ai = generate_ai_text(
            "You are Churvox AI Job Control Tower. Summarise operational job risk in 1 sentence headline and 1 sentence summary.",
            f"Risk level: {risk_level}. Unassigned: {len(unassigned_jobs)}. Overdue: {len(overdue_jobs)}. Paused: {len(paused_jobs)}. Completed uninvoiced: {len(completed_uninvoiced_jobs)}. Recommended: {recommended_actions[:3]}",
            max_tokens=120,
        )
        if ai.get("ok") and ai.get("text"):
            txt = str(ai.get("text")).strip()
            headline = txt.split("\n")[0][:180] or headline
    snapshot = {"id": str(uuid.uuid4()), "business_id": business_id, "headline": headline, "summary": summary, "risk_level": risk_level, "jobs_today_count": jobs_today_count, "open_jobs_count": len(open_jobs), "unassigned_jobs_count": len(unassigned_jobs), "overdue_jobs_count": len(overdue_jobs), "paused_jobs_count": len(paused_jobs), "completed_uninvoiced_count": len(completed_uninvoiced_jobs), "worker_load_summary": worker_load_summary, "unassigned_jobs": unassigned_jobs[:50], "overdue_jobs": overdue_jobs[:50], "paused_jobs": paused_jobs[:50], "completed_uninvoiced_jobs": completed_uninvoiced_jobs[:50], "customer_update_candidates": customer_update_candidates[:50], "recommended_actions": recommended_actions, "created_at": now, "updated_at": now}
    await db.ai_job_control_snapshots.insert_one(snapshot)
    await db.ai_job_control_events.insert_one({"id": str(uuid.uuid4()), "business_id": business_id, "event_type": "generated", "snapshot_id": snapshot["id"], "created_at": now, "created_by": str(current_user.get("_id") or current_user.get("id") or "")})
    return snapshot


def _is_open_job(job: dict) -> bool:
    return str(job.get("status") or "").strip().lower() not in {"completed", "done", "cancelled", "canceled"}


async def _build_daily_brief_and_memory_input(business_id: str) -> dict:
    query = {"business_id": str(business_id)}
    now = datetime.now(timezone.utc)
    today = now.date()
    jobs = await db.jobs.find(query).to_list(length=800)
    quotes = await db.quotes.find(query).to_list(length=800)
    invoices = await db.invoices.find(query).to_list(length=800)
    clients = await db.clients.find(query).to_list(length=800)
    timesheets = await db.timesheets.find(query).to_list(length=800)
    payroll = await db.payroll.find(query).to_list(length=400)
    automation_runs = await db.automation_runs.find(query).sort("created_at", -1).to_list(length=800)
    invoice_job_ids = {str(inv.get("job_id") or "") for inv in invoices if inv.get("job_id")}
    due_today, overdue_jobs, unassigned_jobs, completed_not_invoiced = [], [], [], []
    for job in jobs:
        if not _is_open_job(job):
            if str(job.get("id") or job.get("_id") or "") not in invoice_job_ids:
                completed_not_invoiced.append(job)
            continue
        due = _parse_date_like(job.get("due_date") or job.get("scheduled_date") or job.get("date") or job.get("start_date"))
        if due and due.date() == today:
            due_today.append(job)
        if due and due.date() < today:
            overdue_jobs.append(job)
        if not (job.get("assigned_to") or job.get("worker_id") or job.get("assigned_worker_id") or job.get("assigned_user_id")):
            unassigned_jobs.append(job)
    pending_quotes = [q for q in quotes if str(q.get("status") or "").strip().lower() in {"pending", "sent", "draft"}]
    unpaid_invoices = [i for i in invoices if str(i.get("status") or "").strip().lower() in {"unpaid", "sent", "partial", "overdue", "pending", "draft"}]
    overdue_invoices = [i for i in unpaid_invoices if str(i.get("status") or "").strip().lower() == "overdue" or ((_parse_date_like(i.get("due_date") or i.get("due_at")) or now).date() < today)]
    bad_clients = [c for c in clients if not c.get("email") or not c.get("phone")]
    timesheet_flags = [t for t in timesheets if _ai_timesheet_anomaly(t)]
    payroll_flags = [p for p in payroll if str(p.get("status") or "").strip().lower() in {"pending", "review", "needs_review", "flagged"}]
    failed_runs = [r for r in automation_runs if str(r.get("status") or "").strip().lower() in {"failed", "error"}]
    unpaid_value = sum(float(i.get("balance_due") or i.get("amount_due") or i.get("total") or i.get("amount") or 0) for i in unpaid_invoices)
    overdue_value = sum(float(i.get("balance_due") or i.get("amount_due") or i.get("total") or i.get("amount") or 0) for i in overdue_invoices)
    return locals()


def _brief_risk_level(metrics: dict) -> str:
    score = 0
    score += len(metrics["overdue_jobs"]) * 2
    score += len(metrics["overdue_invoices"]) * 3
    score += len(metrics["failed_runs"]) * 2
    score += len(metrics["timesheet_flags"]) + len(metrics["payroll_flags"])
    if score >= 12:
        return "high"
    if score >= 5:
        return "medium"
    return "low"


async def _generate_daily_brief_doc(current_user: dict, force: bool = False) -> dict:
    _ai_daily_brief_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = datetime.now(timezone.utc)
    date_key = now.date().isoformat()
    if not force:
        existing = await db.ai_daily_briefs.find_one({"business_id": business_id, "date": date_key})
        if existing:
            return existing
    m = await _build_daily_brief_and_memory_input(business_id)
    actions = []
    if m["overdue_invoices"]: actions.append("Review overdue invoices and approve reminder drafts.")
    if m["completed_not_invoiced"]: actions.append("Create invoice drafts for completed jobs.")
    if m["unassigned_jobs"]: actions.append("Assign workers to unassigned jobs due soon.")
    if m["pending_quotes"]: actions.append("Follow up pending quotes to protect revenue.")
    if m["timesheet_flags"] or m["payroll_flags"]: actions.append("Review timesheet/payroll anomalies before approval.")
    if m["failed_runs"]: actions.append("Fix failed automation runs and retest.")
    risk = _brief_risk_level(m)
    fallback = f"{len(m['overdue_jobs'])} overdue jobs, {len(m['overdue_invoices'])} overdue invoices, {len(m['pending_quotes'])} pending quotes need attention."
    ai = generate_ai_text("Write a concise operational daily brief for owner/admin. No automatic actions.", json.dumps({"metrics": {"due_today_jobs": len(m["due_today"]), "overdue_jobs": len(m["overdue_jobs"]), "unassigned_jobs": len(m["unassigned_jobs"]), "completed_not_invoiced": len(m["completed_not_invoiced"]), "pending_quotes": len(m["pending_quotes"]), "unpaid_invoices": len(m["unpaid_invoices"]), "overdue_invoices": len(m["overdue_invoices"]), "timesheet_flags": len(m["timesheet_flags"]), "payroll_flags": len(m["payroll_flags"]), "failed_automation_runs": len(m["failed_runs"])}}), fallback, 180)
    doc = {
        "id": str(_automation_uuid.uuid4()), "business_id": business_id, "date": date_key,
        "headline": f"Today: {len(m['overdue_invoices'])} overdue invoice(s), {len(m['overdue_jobs'])} overdue job(s)",
        "summary": _safe_text(ai.get("text"), fallback),
        "money_summary": f"${m['unpaid_value']:.2f} unpaid, ${m['overdue_value']:.2f} overdue.",
        "job_summary": f"{len(m['due_today'])} due today, {len(m['overdue_jobs'])} overdue, {len(m['unassigned_jobs'])} unassigned, {len(m['completed_not_invoiced'])} completed not invoiced.",
        "quote_summary": f"{len(m['pending_quotes'])} quotes pending follow-up.",
        "invoice_summary": f"{len(m['unpaid_invoices'])} unpaid invoices, {len(m['overdue_invoices'])} overdue.",
        "team_summary": f"{len(m['timesheet_flags'])} timesheet anomaly item(s), {len(m['payroll_flags'])} payroll item(s) pending review.",
        "automation_summary": f"{len(m['failed_runs'])} failed automation run(s) need review.",
        "recommended_actions": actions[:8], "risk_level": risk, "created_at": now, "updated_at": now,
        "generated_by": str(current_user.get("id") or current_user.get("_id") or "system"),
    }
    await db.ai_daily_briefs.update_one({"business_id": business_id, "date": date_key}, {"$set": doc}, upsert=True)
    await db.ai_brief_events.insert_one({"id": str(_automation_uuid.uuid4()), "business_id": business_id, "date": date_key, "event_type": "generated", "created_at": now, "actor_id": doc["generated_by"]})
    return doc


@api_router.get("/ai/job-control")
async def get_ai_job_control(current_user: dict = Depends(get_current_user)):
    _ai_job_control_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    doc = await db.ai_job_control_snapshots.find_one({"business_id": business_id}, sort=[("created_at", -1)])
    if not doc:
        return {"success": True, "snapshot": None}
    return {"success": True, "snapshot": make_json_safe(doc)}


@api_router.post("/ai/job-control/generate")
async def generate_ai_job_control(current_user: dict = Depends(get_current_user)):
    doc = await _generate_job_control_snapshot(current_user, force=True)
    return {"success": True, "snapshot": make_json_safe(doc)}


@api_router.get("/ai/daily-brief")
async def get_ai_daily_brief(current_user: dict = Depends(get_current_user)):
    _ai_daily_brief_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    doc = await db.ai_daily_briefs.find_one({"business_id": business_id, "date": datetime.now(timezone.utc).date().isoformat()})
    return {"success": True, "brief": make_json_safe(doc) if doc else None}


@api_router.get("/ai/financial-radar")
async def get_ai_financial_radar(current_user: dict = Depends(get_current_user)):
    _ai_financial_radar_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    doc = await db.ai_financial_snapshots.find_one({"business_id": business_id}, sort=[("created_at", -1)])
    return {"success": True, "snapshot": make_json_safe(doc) if doc else None}


@api_router.post("/ai/financial-radar/generate")
async def generate_ai_financial_radar(current_user: dict = Depends(get_current_user)):
    doc = await _generate_financial_radar_snapshot(current_user, force=True)
    return {"success": True, "snapshot": make_json_safe(doc), "message": "AI highlights cash and revenue risks. No records are changed automatically."}


@api_router.post("/ai/daily-brief/generate")
async def generate_ai_daily_brief(current_user: dict = Depends(get_current_user)):
    doc = await _generate_daily_brief_doc(current_user, force=True)
    return {"success": True, "brief": make_json_safe(doc), "message": "AI highlights patterns. You decide what to do."}


async def _refresh_business_memory_docs(current_user: dict) -> list[dict]:
    _ai_daily_brief_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = datetime.now(timezone.utc)
    m = await _build_daily_brief_and_memory_input(business_id)
    patterns = []
    if len(m["overdue_invoices"]) >= 2:
        patterns.append(("invoice_overdue_cluster", "Recurring overdue invoices", "Multiple overdue invoices are recurring."))
    if len(m["pending_quotes"]) >= 3:
        patterns.append(("quote_pending", "Quotes staying pending", "Quotes are frequently staying pending without follow-up."))
    if len(m["completed_not_invoiced"]) >= 2:
        patterns.append(("job_completed_no_invoice", "Completed jobs waiting for invoices", "Completed jobs are repeatedly left without invoices."))
    if len(m["unassigned_jobs"]) >= 2:
        patterns.append(("job_unassigned", "Jobs often unassigned", "Several open jobs are repeatedly unassigned."))
    if len(m["bad_clients"]) >= 2:
        patterns.append(("client_missing_contact", "Clients missing contact details", "Client records often miss phone or email details."))
    if len(m["timesheet_flags"]) >= 2 or len(m["payroll_flags"]) >= 2:
        patterns.append(("timesheet_anomaly", "Timesheet/payroll anomalies recurring", "Timesheet or payroll anomalies are recurring."))
    if len(m["failed_runs"]) >= 2:
        patterns.append(("automation_failure", "Automation failures recurring", "Automation runs are failing repeatedly."))
    docs = []
    for t, title, desc in patterns:
        existing = await db.ai_business_memory.find_one({"business_id": business_id, "type": t, "status": "active"})
        doc = existing or {"id": str(_automation_uuid.uuid4()), "business_id": business_id, "type": t, "title": title, "first_seen_at": now, "status": "active"}
        doc.update({"description": desc, "evidence_count": len(patterns), "last_seen_at": now, "confidence": "high" if len(patterns) > 3 else "medium", "related_record_ids": []})
        await db.ai_business_memory.update_one({"business_id": business_id, "type": t}, {"$set": doc}, upsert=True)
        docs.append(doc)
    await db.ai_brief_events.insert_one({"id": str(_automation_uuid.uuid4()), "business_id": business_id, "event_type": "memory_refresh", "created_at": now, "actor_id": str(current_user.get("id") or current_user.get("_id") or "")})
    return docs


@api_router.get("/ai/business-memory")
async def get_ai_business_memory(current_user: dict = Depends(get_current_user)):
    _ai_daily_brief_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    rows = await db.ai_business_memory.find({"business_id": business_id, "status": "active"}).sort("last_seen_at", -1).to_list(length=100)
    return {"success": True, "memory": make_json_safe(rows)}


@api_router.post("/ai/business-memory/refresh")
async def refresh_ai_business_memory(current_user: dict = Depends(get_current_user)):
    rows = await _refresh_business_memory_docs(current_user)
    return {"success": True, "memory": make_json_safe(rows), "message": "AI highlights patterns. You decide what to do."}


@api_router.post("/ai/business-memory/{memory_id}/dismiss")
async def dismiss_ai_business_memory(memory_id: str, current_user: dict = Depends(get_current_user)):
    _ai_daily_brief_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = datetime.now(timezone.utc)
    result = await db.ai_business_memory.update_one({"id": memory_id, "business_id": business_id}, {"$set": {"status": "dismissed", "last_seen_at": now}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Business memory item not found")
    await db.ai_brief_events.insert_one({"id": str(_automation_uuid.uuid4()), "business_id": business_id, "memory_id": memory_id, "event_type": "dismissed", "created_at": now, "actor_id": str(current_user.get("id") or current_user.get("_id") or "")})
    return {"success": True}


def _ai_automation_conditions(trigger_type: str, source_doc: dict | None = None) -> dict:
    trigger = str(trigger_type or "").strip().lower()
    if trigger == "quote_pending_days":
        return {"minimum_pending_days": 3, "quote_status": ["sent", "pending", "draft"]}
    if trigger == "invoice_overdue":
        return {"invoice_status": ["overdue", "sent", "unpaid", "partial"], "needs_collection_review": True}
    if trigger == "job_completed_no_invoice":
        return {"job_status": ["completed", "done"], "invoice_linked": False}
    if trigger == "job_unassigned":
        return {"job_status_exclude": ["completed", "cancelled"], "assigned_worker_required": True}
    if trigger == "client_missing_contact":
        return {"requires_phone": True, "requires_email": True}
    if trigger == "timesheet_anomaly":
        return {"review_statuses": ["warning", "flagged", "rejected"], "max_shift_hours": 16}
    if trigger == "automation_failure":
        return {"automation_status": ["failed", "error"]}
    return {"source_id": str((source_doc or {}).get("id") or (source_doc or {}).get("_id") or "")}


def _ai_timesheet_anomaly(timesheet: dict) -> bool:
    row = timesheet or {}
    status = str(row.get("status") or "").strip().lower().replace(" ", "_")
    if status in {"warning", "flagged", "rejected", "needs_review"}:
        return True
    hours = row.get("hours") or row.get("total_hours") or row.get("duration_hours")
    try:
        return float(hours or 0) >= 16
    except Exception:
        return False


async def _generate_ai_automation_candidates(business_id: str) -> list[dict]:
    now = _ai_action_now()
    query = {"business_id": str(business_id)}
    jobs = await db.jobs.find(query).to_list(length=500)
    invoices = await db.invoices.find(query).to_list(length=500)
    quotes = await db.quotes.find(query).to_list(length=500)
    clients = await db.clients.find(query).to_list(length=500)
    timesheets = await db.timesheets.find(query).to_list(length=500)
    automation_runs = await db.automation_runs.find(query).sort("created_at", -1).to_list(length=500)
    invoice_job_ids = {str(inv.get("job_id") or "") for inv in invoices if inv.get("job_id")}
    candidates: list[dict] = []

    for quote in quotes:
        quote_status = str(quote.get("status") or "").strip().lower()
        if quote_status not in {"sent", "pending", "draft"}:
            continue
        created = _parse_date_like(quote.get("sent_at") or quote.get("updated_at") or quote.get("created_at"))
        if not created or (now - created).days < 3:
            continue
        candidates.append({
            "title": "Draft quote follow-up automation",
            "description": "Quote has been pending for several days. Create a follow-up task draft for owner/admin review.",
            "trigger_type": "quote_pending_days",
            "action_type": "create_quote_followup_task",
            "recommended_rule": "When quote remains pending for 3+ days, create an internal follow-up task draft.",
            "reason": "Pending quotes are warm revenue opportunities and can be chased safely with owner approval.",
            "impact": "Improves quote conversion consistency without auto-sending customer messages.",
            "priority": "medium",
            "confidence": "high",
            "conditions": _ai_automation_conditions("quote_pending_days", quote),
        })
        break

    for invoice in invoices:
        status = str(invoice.get("status") or "").strip().lower()
        due_dt = _parse_date_like(invoice.get("due_date") or invoice.get("due_at"))
        if status in {"paid", "void", "cancelled", "canceled"}:
            continue
        if status == "overdue" or (due_dt and due_dt < now):
            candidates.append({
                "title": "Draft overdue invoice reminder automation",
                "description": "Invoice is overdue. Create an internal reminder task draft for collection follow-up.",
                "trigger_type": "invoice_overdue",
                "action_type": "create_invoice_reminder_task",
                "recommended_rule": "When invoice becomes overdue, create an owner/admin follow-up task draft.",
                "reason": "Overdue invoices need repeatable reminders and internal tracking.",
                "impact": "Protects cash flow while keeping all external messaging manual.",
                "priority": "high",
                "confidence": "high",
                "conditions": _ai_automation_conditions("invoice_overdue", invoice),
            })
            break

    for job in jobs:
        status = str(job.get("status") or job.get("job_status") or "").strip().lower().replace(" ", "_")
        job_id = str(job.get("id") or job.get("_id") or "")
        if status in {"completed", "done"} and job_id and job_id not in invoice_job_ids:
            candidates.append({
                "title": "Draft invoice setup for completed jobs",
                "description": "Completed job has no invoice. Create draft-invoice automation rule for admin review.",
                "trigger_type": "job_completed_no_invoice",
                "action_type": "create_draft_invoice_task",
                "recommended_rule": "When job is marked completed and no invoice exists, create a draft invoice task.",
                "reason": "Completed work should be invoiced quickly to reduce leakage.",
                "impact": "Reduces missed billing without marking invoices paid automatically.",
                "priority": "high",
                "confidence": "high",
                "conditions": _ai_automation_conditions("job_completed_no_invoice", job),
            })
            break

    for job in jobs:
        status = str(job.get("status") or job.get("job_status") or "").strip().lower().replace(" ", "_")
        if status in {"completed", "cancelled", "canceled"}:
            continue
        if not (job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_to")):
            candidates.append({
                "title": "Alert for unassigned jobs",
                "description": "A live job has no worker assigned. Draft owner/manager alert automation for review.",
                "trigger_type": "job_unassigned",
                "action_type": "alert_owner_manager",
                "recommended_rule": "When a non-completed job has no assigned worker, create an owner/manager alert.",
                "reason": "Unassigned jobs create schedule risk and missed SLAs.",
                "impact": "Improves dispatch reliability without changing job status automatically.",
                "priority": "high",
                "confidence": "high",
                "conditions": _ai_automation_conditions("job_unassigned", job),
            })
            break

    for client in clients:
        email = str(client.get("email") or "").strip()
        phone = clean_phone(client.get("phone") or client.get("mobile") or client.get("phone_number"))
        if email and phone:
            continue
        candidates.append({
            "title": "Admin cleanup for missing client contact",
            "description": "Client record is missing phone or email. Draft admin cleanup task automation.",
            "trigger_type": "client_missing_contact",
            "action_type": "create_admin_cleanup_task",
            "recommended_rule": "When a client is missing phone/email, create an admin cleanup task draft.",
            "reason": "Missing contact details block quoting, reminders, and invoice follow-up.",
            "impact": "Improves data quality and reduces billing delays.",
            "priority": "medium",
            "confidence": "high",
            "conditions": _ai_automation_conditions("client_missing_contact", client),
        })
        break

    for timesheet in timesheets:
        if _ai_timesheet_anomaly(timesheet):
            candidates.append({
                "title": "Flag timesheet anomaly for payroll review",
                "description": "Timesheet anomaly detected. Draft payroll review task automation for approval.",
                "trigger_type": "timesheet_anomaly",
                "action_type": "flag_payroll_review",
                "recommended_rule": "When a timesheet is flagged or exceeds threshold hours, create payroll review task.",
                "reason": "Timesheet anomalies should be reviewed before payroll processing.",
                "impact": "Supports payroll accuracy with explicit human approval.",
                "priority": "high",
                "confidence": "medium",
                "conditions": _ai_automation_conditions("timesheet_anomaly", timesheet),
            })
            break

    for run in automation_runs:
        run_status = str(run.get("status") or "").strip().lower()
        if run_status in {"failed", "error"}:
            candidates.append({
                "title": "Alert on automation failure",
                "description": "An automation run failed. Draft owner/admin alert automation.",
                "trigger_type": "automation_failure",
                "action_type": "alert_owner_admin_failure",
                "recommended_rule": "When automation run fails, create owner/admin incident alert task.",
                "reason": "Automation failures can silently interrupt follow-up workflows.",
                "impact": "Increases operational visibility without making risky automatic changes.",
                "priority": "medium",
                "confidence": "medium",
                "conditions": _ai_automation_conditions("automation_failure", run),
            })
            break

    return candidates


def _safe_minutes(row: dict) -> int:
    for key in ("minutes", "total_minutes", "duration_minutes"):
        if row.get(key) is not None:
            try:
                return int(float(row.get(key)))
            except Exception:
                continue
    hours = row.get("hours") or row.get("total_hours") or row.get("duration_hours")
    try:
        return int(float(hours or 0) * 60)
    except Exception:
        return 0


async def _generate_team_payroll_watchtower_doc(current_user: dict, force: bool = False) -> dict:
    _ai_team_payroll_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = datetime.now(timezone.utc)
    if not force:
        existing = await db.ai_team_payroll_snapshots.find_one({"business_id": business_id}, sort=[("created_at", -1)])
        if existing:
            return existing
    users = await db.users.find({"business_id": business_id, "role": {"$in": ["worker", "manager", "office_admin", "payroll"]}}).to_list(length=1200)
    jobs = await db.jobs.find({"business_id": business_id}).to_list(length=2000)
    timesheets = await db.timesheets.find({"business_id": business_id}).to_list(length=2400)
    payroll_rows = await db.payroll.find({"business_id": business_id}).to_list(length=1000)
    workers_by_id = {str(w.get("_id")): w for w in users}
    workers_by_public = {str(w.get("id") or ""): w for w in users if w.get("id")}
    worker_count = len(users)
    active_worker_count = sum(1 for w in users if str(w.get("status") or "").lower() not in {"inactive", "disabled"})
    worker_setup_issues = []
    missing_rate_count = missing_region_count = missing_role_count = 0
    for w in users:
        issues = []
        if not (w.get("hourly_rate") or w.get("rate")):
            missing_rate_count += 1
            issues.append("Missing hourly rate")
        if not w.get("region"):
            missing_region_count += 1
            issues.append("Missing region")
        if not w.get("role"):
            missing_role_count += 1
            issues.append("Missing role")
        if not (w.get("email") or w.get("phone")):
            issues.append("Missing contact info")
        status = str(w.get("status") or "").lower()
        if status in {"pending", "invited", "invite_pending", "inactive"}:
            issues.append(f"Status: {status}")
        if issues:
            worker_setup_issues.append({"worker_id": str(w.get("id") or w.get("_id")), "worker_name": w.get("name") or w.get("email") or "Worker", "issues": issues})
    workload_map = {}
    open_jobs = [j for j in jobs if str(j.get("status") or "").lower() not in {"completed", "done", "cancelled", "canceled"}]
    for j in open_jobs:
        wid = str(j.get("assigned_worker_id") or j.get("worker_id") or j.get("assigned_to") or "")
        if not wid:
            continue
        w = workers_by_id.get(wid) or workers_by_public.get(wid)
        key = str(w.get("id") or w.get("_id")) if w else wid
        workload_map[key] = {"worker_id": key, "worker_name": (w or {}).get("name") or "Worker", "open_jobs": workload_map.get(key, {}).get("open_jobs", 0) + 1}
    workload_summary = sorted(workload_map.values(), key=lambda x: x.get("open_jobs", 0), reverse=True)
    workload_risks = [x for x in workload_summary if x.get("open_jobs", 0) >= 8]
    workload_risks.extend([x for x in workload_summary if x.get("open_jobs", 0) <= 1][:4])
    timesheet_review_items = []
    open_timesheet_count = 0
    for t in timesheets:
        status = str(t.get("status") or "").lower()
        minutes = _safe_minutes(t)
        if status in {"pending", "submitted", "needs_review"}:
            open_timesheet_count += 1
            timesheet_review_items.append({"timesheet_id": str(t.get("id") or t.get("_id")), "issue": "Pending approval", "worker_id": str(t.get("worker_id") or "")})
        if minutes == 0:
            timesheet_review_items.append({"timesheet_id": str(t.get("id") or t.get("_id")), "issue": "Zero-minute shift", "worker_id": str(t.get("worker_id") or "")})
        if minutes >= 16 * 60:
            timesheet_review_items.append({"timesheet_id": str(t.get("id") or t.get("_id")), "issue": "Very long shift", "worker_id": str(t.get("worker_id") or "")})
        if not t.get("start_time") or not t.get("end_time"):
            timesheet_review_items.append({"timesheet_id": str(t.get("id") or t.get("_id")), "issue": "Missing start/finish", "worker_id": str(t.get("worker_id") or "")})
    payroll_review_items = [{"type": "missing_rates", "count": missing_rate_count}, {"type": "pending_timesheets", "count": open_timesheet_count}]
    if any(str(p.get("status") or "").lower() in {"pending", "review", "flagged"} for p in payroll_rows):
        payroll_review_items.append({"type": "payroll_pending_review", "count": sum(1 for p in payroll_rows if str(p.get("status") or "").lower() in {"pending", "review", "flagged"})})
    payroll_warning_count = sum(1 for x in payroll_review_items if (x.get("count") or 0) > 0)
    recommended_actions = [
        "Review workers with missing rates, roles or regions.",
        "Clear pending/flagged timesheets before payroll export.",
        "Check workers with very high or very low open-job load.",
        "Confirm payroll export readiness checklist before exporting.",
    ]
    risk_score = missing_rate_count + open_timesheet_count + len(workload_risks) + len(timesheet_review_items) // 3
    risk_level = "high" if risk_score >= 12 else "medium" if risk_score >= 5 else "low"
    fallback_summary = f"{worker_count} workers, {missing_rate_count} missing rates, {open_timesheet_count} open timesheets, {payroll_warning_count} payroll warning areas."
    ai = generate_ai_text("Summarise team/payroll risk snapshot for owner/admin. No automatic actions.", json.dumps({"worker_count": worker_count, "active_worker_count": active_worker_count, "missing_rate_count": missing_rate_count, "missing_region_count": missing_region_count, "open_timesheet_count": open_timesheet_count, "payroll_warning_count": payroll_warning_count}), fallback_summary, 140)
    doc = {
        "id": str(_automation_uuid.uuid4()), "business_id": business_id, "headline": "AI Team & Payroll Watchtower snapshot",
        "summary": _safe_text(ai.get("text"), fallback_summary), "risk_level": risk_level, "worker_count": worker_count, "active_worker_count": active_worker_count,
        "missing_rate_count": missing_rate_count, "missing_region_count": missing_region_count, "missing_role_count": missing_role_count,
        "open_timesheet_count": open_timesheet_count, "payroll_warning_count": payroll_warning_count, "workload_summary": workload_summary[:80],
        "worker_setup_issues": worker_setup_issues[:120], "timesheet_review_items": timesheet_review_items[:200], "payroll_review_items": payroll_review_items,
        "workload_risks": workload_risks[:80], "recommended_actions": recommended_actions, "created_at": now, "updated_at": now
    }
    await db.ai_team_payroll_snapshots.insert_one(doc)
    await db.ai_team_payroll_events.insert_one({"id": str(_automation_uuid.uuid4()), "business_id": business_id, "event_type": "generated", "created_at": now, "actor_id": str(current_user.get("id") or "")})
    return doc


@api_router.get("/ai/team-payroll")
async def get_ai_team_payroll(current_user: dict = Depends(get_current_user)):
    _ai_team_payroll_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    doc = await db.ai_team_payroll_snapshots.find_one({"business_id": business_id}, sort=[("created_at", -1)])
    return {"success": True, "snapshot": make_json_safe(doc) if doc else None}


@api_router.post("/ai/team-payroll/generate")
async def generate_ai_team_payroll(current_user: dict = Depends(get_current_user)):
    doc = await _generate_team_payroll_watchtower_doc(current_user, force=True)
    return {"success": True, "snapshot": make_json_safe(doc), "message": "AI highlights team and payroll risks. It does not approve payroll, change rates, edit timesheets, or pay workers."}


async def _ai_action_audit_event(business_id: str, action: dict, event_type: str, current_user: dict, payload: dict | None = None):
    now = _ai_action_now()
    event = {
        "id": str(_automation_uuid.uuid4()),
        "business_id": str(business_id),
        "action_id": str(action.get("id") or action.get("_id") or ""),
        "event_type": str(event_type),
        "payload": payload or {},
        "actor": {
            "id": str(current_user.get("id") or current_user.get("_id") or ""),
            "email": str(current_user.get("email") or ""),
            "role": _ai_user_role(current_user),
        },
        "created_at": now,
    }
    await db.ai_action_events.insert_one(event)


def _ai_action_missing_contact(client: dict) -> bool:
    if not client:
        return True
    email = str(client.get("email") or "").strip()
    phone = clean_phone(client.get("phone") or client.get("mobile") or client.get("phone_number"))
    return not email or not phone


async def _generate_ai_action_candidates(business_id: str) -> list[dict]:
    now = _ai_action_now()
    query = {"business_id": str(business_id)}
    jobs = await db.jobs.find(query).to_list(length=500)
    invoices = await db.invoices.find(query).to_list(length=500)
    quotes = await db.quotes.find(query).to_list(length=500)
    clients = await db.clients.find(query).to_list(length=500)
    timesheets = await db.timesheets.find(query).to_list(length=500)
    automation_runs = await db.automation_runs.find(query).sort("created_at", -1).to_list(length=500)

    candidates: list[dict] = []
    invoice_by_job_id = {}
    for invoice in invoices:
        linked_job_id = str(invoice.get("job_id") or "").strip()
        if linked_job_id:
            invoice_by_job_id[linked_job_id] = invoice

    for job in jobs:
        job_status = str(job.get("status") or job.get("job_status") or "").strip().lower().replace(" ", "_")
        if job_status not in {"completed", "done"}:
            has_worker = bool(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_to"))
            if not has_worker:
                jid = str(job.get("id") or job.get("_id") or "")
                job_title = _safe_text(job.get("title") or job.get("job_title") or job.get("name"), "Job")
                candidates.append({
                    "type": "unassigned_job",
                    "title": "Assign unallocated job",
                    "description": f"{job_title} has no worker assigned yet.",
                    "reason": "Unassigned work risks delays and customer frustration.",
                    "priority": "high",
                    "confidence": "high",
                    "route": f"/jobs/{jid}" if jid else "/jobs",
                    "cta_label": "Assign worker",
                    "status": "open",
                    "source_record_id": jid,
                    "source_record_type": "job",
                    "due_at": job.get("scheduled_date") or job.get("date") or job.get("start_date"),
                })
            continue

        jid = str(job.get("id") or job.get("_id") or "")
        has_invoice = bool(job.get("invoice_id") or job.get("invoice_number") or invoice_by_job_id.get(jid))
        if not has_invoice:
            price = float(job.get("price") or job.get("job_price") or job.get("total") or 0)
            candidates.append({
                "type": "completed_job_not_invoiced",
                "title": "Draft invoice for completed job",
                "description": f"Completed job {_safe_text(job.get('title') or job.get('job_title'), 'job')} is not invoiced yet.",
                "reason": "Completed work should move to draft invoice fast to protect cash flow.",
                "priority": "high" if price > 0 else "medium",
                "confidence": "high" if price > 0 else "medium",
                "route": f"/jobs/{jid}" if jid else "/jobs",
                "cta_label": "Open job",
                "status": "open",
                "source_record_id": jid,
                "source_record_type": "job",
            })

    for invoice in invoices:
        inv_status = str(invoice.get("status") or "").strip().lower()
        if inv_status in {"paid", "void", "cancelled", "canceled"}:
            continue
        iid = str(invoice.get("id") or invoice.get("_id") or "")
        due_at = invoice.get("due_date") or invoice.get("due_at")
        overdue = inv_status == "overdue" or (to_dt := _parse_date_like(due_at)) and to_dt < now
        if overdue or inv_status in {"unpaid", "sent", "partial"}:
            candidates.append({
                "type": "invoice_collection",
                "title": "Review unpaid invoice",
                "description": f"Invoice {_safe_text(invoice.get('invoice_number') or invoice.get('number'), 'draft')} is still unpaid.",
                "reason": "Cash collection needs owner visibility and follow-up planning.",
                "priority": "high" if overdue else "medium",
                "confidence": "high",
                "route": f"/invoices/{iid}" if iid else "/invoices",
                "cta_label": "Open invoice",
                "status": "open",
                "source_record_id": iid,
                "source_record_type": "invoice",
                "due_at": due_at,
            })

    for quote in quotes:
        q_status = str(quote.get("status") or "").strip().lower()
        if q_status not in {"pending", "sent", "draft"}:
            continue
        qid = str(quote.get("id") or quote.get("_id") or "")
        candidates.append({
            "type": "pending_quote_followup",
            "title": "Follow up pending quote",
            "description": f"Quote {_safe_text(quote.get('quote_number') or quote.get('number'), 'quote')} is waiting for customer response.",
            "reason": "Pending quotes are warm revenue opportunities.",
            "priority": "medium",
            "confidence": "medium",
            "route": f"/quotes/{qid}" if qid else "/quotes",
            "cta_label": "Open quote",
            "status": "open",
            "source_record_id": qid,
            "source_record_type": "quote",
        })

    for client in clients:
        if not _ai_action_missing_contact(client):
            continue
        cid = str(client.get("id") or client.get("_id") or "")
        candidates.append({
            "type": "client_missing_contact",
            "title": "Complete client contact details",
            "description": f"{_safe_text(client.get('name'), 'Client')} is missing email and/or phone details.",
            "reason": "Missing contact details can block quoting, invoicing, and reminders.",
            "priority": "medium",
            "confidence": "high",
            "route": f"/clients/{cid}" if cid else "/clients",
            "cta_label": "Open client",
            "status": "open",
            "source_record_id": cid,
            "source_record_type": "client",
        })

    for ts in timesheets:
        ts_status = str(ts.get("status") or "").strip().lower().replace(" ", "_")
        if ts_status in {"rejected", "warning", "flagged"}:
            tid = str(ts.get("id") or ts.get("_id") or "")
            candidates.append({
                "type": "timesheet_warning",
                "title": "Review timesheet warning",
                "description": f"Timesheet for {_safe_text(ts.get('worker_name') or ts.get('user_name'), 'worker')} needs review.",
                "reason": "Timesheet warnings can affect payroll accuracy.",
                "priority": "high",
                "confidence": "medium",
                "route": "/timesheets",
                "cta_label": "Open timesheets",
                "status": "open",
                "source_record_id": tid,
                "source_record_type": "timesheet",
            })

    for run in automation_runs:
        run_status = str(run.get("status") or "").strip().lower()
        if run_status not in {"failed", "error"}:
            continue
        rid = str(run.get("id") or run.get("_id") or "")
        candidates.append({
            "type": "automation_failed_run",
            "title": "Investigate failed automation",
            "description": _safe_text(run.get("message"), "An automation run failed and needs review."),
            "reason": "Failed automation can silently interrupt operations.",
            "priority": "medium",
            "confidence": "medium",
            "route": "/automation",
            "cta_label": "Open automation",
            "status": "open",
            "source_record_id": rid,
            "source_record_type": "automation_run",
        })

    return candidates


def _parse_date_like(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        try:
            if raw.endswith("Z"):
                raw = raw[:-1] + "+00:00"
            parsed = datetime.fromisoformat(raw)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


@api_router.get("/ai/actions")
async def list_ai_actions(current_user: dict = Depends(get_current_user)):
    _ai_action_role_guard(current_user)
    business_id = await get_user_business_id(current_user)
    docs = await db.ai_actions.find({"business_id": str(business_id)}).sort([("created_at", -1)]).limit(200).to_list(length=200)
    docs_sorted = sorted(
        docs,
        key=lambda x: (
            0 if str(x.get("status") or "open").lower() in _AI_ACTION_ACTIVE_STATUSES else 1,
            _ai_action_priority_rank(x.get("priority")),
            -(x.get("updated_at") or x.get("created_at") or _ai_action_now()).timestamp() if isinstance((x.get("updated_at") or x.get("created_at")), datetime) else 0,
        ),
    )
    return {"success": True, "actions": [_ai_action_to_response(x) for x in docs_sorted]}


@api_router.post("/ai/actions/generate")
async def generate_ai_actions(current_user: dict = Depends(get_current_user)):
    _ai_action_role_guard(current_user)
    business_id = await get_user_business_id(current_user)
    now = _ai_action_now()
    candidates = await _generate_ai_action_candidates(str(business_id))
    created = 0
    updated = 0
    for candidate in candidates:
        source_id = str(candidate.get("source_record_id") or "")
        source_type = str(candidate.get("source_record_type") or "")
        action_type = str(candidate.get("type") or "")
        existing = await db.ai_actions.find_one({
            "business_id": str(business_id),
            "type": action_type,
            "source_record_id": source_id,
            "source_record_type": source_type,
            "status": {"$in": list(_AI_ACTION_ACTIVE_STATUSES)},
        })
        base_update = {
            "business_id": str(business_id),
            "type": action_type,
            "title": _safe_text(candidate.get("title"), "Action"),
            "description": _safe_text(candidate.get("description"), ""),
            "reason": _safe_text(candidate.get("reason"), ""),
            "priority": str(candidate.get("priority") or "medium").lower(),
            "confidence": str(candidate.get("confidence") or "medium").lower(),
            "route": _safe_text(candidate.get("route"), ""),
            "cta_label": _safe_text(candidate.get("cta_label"), "Open"),
            "status": str(candidate.get("status") or "open").lower(),
            "updated_at": now,
            "due_at": candidate.get("due_at"),
            "source_record_id": source_id or None,
            "source_record_type": source_type or None,
            "draft_text": candidate.get("draft_text"),
        }
        if existing:
            await db.ai_actions.update_one({"_id": existing["_id"]}, {"$set": base_update})
            updated += 1
            continue
        doc = {
            "id": str(_automation_uuid.uuid4()),
            **base_update,
            "created_at": now,
            "approved_by": None,
            "approved_at": None,
        }
        await db.ai_actions.insert_one(doc)
        created += 1
    return {"success": True, "created": created, "updated": updated, "message": "AI suggests. You approve. Draft only."}


async def _mutate_ai_action(action_id: str, next_status: str, current_user: dict, payload: dict | None = None):
    _ai_action_role_guard(current_user)
    business_id = await get_user_business_id(current_user)
    now = _ai_action_now()
    action = await db.ai_actions.find_one({"id": action_id, "business_id": str(business_id)})
    if not action:
        raise HTTPException(status_code=404, detail="AI action not found")
    updates = {"status": next_status, "updated_at": now}
    if next_status == "approved":
        updates["approved_by"] = str(current_user.get("id") or current_user.get("_id") or "")
        updates["approved_at"] = now
    if next_status == "snoozed":
        snooze_until = _parse_date_like((payload or {}).get("due_at"))
        snooze_days = int((payload or {}).get("days") or 2)
        updates["due_at"] = snooze_until or (now + timedelta(days=max(1, min(30, snooze_days))))
    await db.ai_actions.update_one({"_id": action["_id"]}, {"$set": updates})
    action.update(updates)
    if next_status in {"approved", "dismissed", "snoozed", "completed"}:
        await _ai_action_audit_event(str(business_id), action, next_status, current_user, payload)
    return {"success": True, "action": _ai_action_to_response(action)}


@api_router.post("/ai/actions/{action_id}/dismiss")
async def dismiss_ai_action(action_id: str, payload: dict | None = None, current_user: dict = Depends(get_current_user)):
    return await _mutate_ai_action(action_id, "dismissed", current_user, payload)


@api_router.post("/ai/actions/{action_id}/snooze")
async def snooze_ai_action(action_id: str, payload: dict | None = None, current_user: dict = Depends(get_current_user)):
    return await _mutate_ai_action(action_id, "snoozed", current_user, payload)


@api_router.post("/ai/actions/{action_id}/complete")
async def complete_ai_action(action_id: str, payload: dict | None = None, current_user: dict = Depends(get_current_user)):
    return await _mutate_ai_action(action_id, "completed", current_user, payload)


@api_router.post("/ai/actions/{action_id}/approve")
async def approve_ai_action(action_id: str, payload: dict | None = None, current_user: dict = Depends(get_current_user)):
    return await _mutate_ai_action(action_id, "approved", current_user, payload)


@api_router.get("/ai/automation-suggestions")
async def list_ai_automation_suggestions(current_user: dict = Depends(get_current_user)):
    _ai_automation_role_guard(current_user)
    business_id = await get_user_business_id(current_user)
    docs = await db.ai_automation_suggestions.find({"business_id": str(business_id)}).sort([("updated_at", -1), ("created_at", -1)]).limit(200).to_list(length=200)
    return {"success": True, "suggestions": [_ai_automation_to_response(row) for row in docs]}


@api_router.post("/ai/automation-suggestions/generate")
async def generate_ai_automation_suggestions(current_user: dict = Depends(get_current_user)):
    _ai_automation_role_guard(current_user)
    business_id = await get_user_business_id(current_user)
    now = _ai_action_now()
    candidates = await _generate_ai_automation_candidates(str(business_id))
    created = 0
    updated = 0
    for candidate in candidates:
        trigger_type = str(candidate.get("trigger_type") or "").strip().lower()
        action_type = str(candidate.get("action_type") or "").strip().lower()
        if not trigger_type or not action_type:
            continue
        existing_open = await db.ai_automation_suggestions.find_one({
            "business_id": str(business_id),
            "trigger_type": trigger_type,
            "action_type": action_type,
            "status": "open",
        })
        payload = {
            "business_id": str(business_id),
            "title": _safe_text(candidate.get("title"), "AI automation suggestion"),
            "description": _safe_text(candidate.get("description"), ""),
            "trigger_type": trigger_type,
            "action_type": action_type,
            "conditions": candidate.get("conditions") if isinstance(candidate.get("conditions"), dict) else {},
            "recommended_rule": _safe_text(candidate.get("recommended_rule"), ""),
            "reason": _safe_text(candidate.get("reason"), ""),
            "impact": _safe_text(candidate.get("impact"), ""),
            "priority": str(candidate.get("priority") or "medium").lower(),
            "confidence": str(candidate.get("confidence") or "medium").lower(),
            "status": "open",
            "updated_at": now,
        }
        if existing_open:
            await db.ai_automation_suggestions.update_one({"_id": existing_open["_id"]}, {"$set": payload})
            updated += 1
            continue

        prior = await db.ai_automation_suggestions.find_one(
            {"business_id": str(business_id), "trigger_type": trigger_type, "action_type": action_type},
            sort=[("updated_at", -1)],
        )
        if prior and str(prior.get("status") or "").lower() in {"dismissed", "approved", "snoozed"}:
            await db.ai_automation_suggestions.update_one(
                {"_id": prior["_id"]},
                {"$set": payload, "$setOnInsert": {"created_at": now}},
            )
            updated += 1
            continue

        doc = {
            "id": str(_automation_uuid.uuid4()),
            **payload,
            "created_at": now,
            "approved_by": None,
            "approved_at": None,
        }
        await db.ai_automation_suggestions.insert_one(doc)
        created += 1
    await db.ai_automation_events.insert_one({
        "id": str(_automation_uuid.uuid4()),
        "business_id": str(business_id),
        "event_type": "generated",
        "created": created,
        "updated": updated,
        "created_at": now,
        "actor_id": str(current_user.get("id") or current_user.get("_id") or ""),
    })
    return {"success": True, "created": created, "updated": updated, "message": "AI suggests automation. You approve before anything runs."}


async def _mutate_ai_automation_suggestion(suggestion_id: str, next_status: str, current_user: dict, payload: dict | None = None):
    _ai_automation_role_guard(current_user)
    business_id = await get_user_business_id(current_user)
    now = _ai_action_now()
    suggestion = await db.ai_automation_suggestions.find_one({"id": suggestion_id, "business_id": str(business_id)})
    if not suggestion:
        raise HTTPException(status_code=404, detail="AI automation suggestion not found")

    updates = {"status": next_status, "updated_at": now}
    setup_task = None
    created_rule = None
    if next_status == "approved":
        updates["approved_by"] = str(current_user.get("id") or current_user.get("_id") or "")
        updates["approved_at"] = now
        action_map = {
            "create_quote_followup_task": ("quote.pending.stale", "create_followup_task"),
            "create_invoice_reminder_task": ("invoice.overdue", "create_followup_task"),
            "create_draft_invoice_task": ("job.completed", "create_draft_invoice"),
            "alert_owner_manager": ("job.unassigned", "notify_owner"),
            "create_admin_cleanup_task": ("client.updated", "create_followup_task"),
            "flag_payroll_review": ("timesheet.flagged", "payroll_admin_alert"),
            "alert_owner_admin_failure": ("automation.failed", "notify_owner"),
        }
        rule_trigger, rule_action = action_map.get(
            str(suggestion.get("action_type") or ""),
            ("", ""),
        )
        if rule_trigger and rule_action:
            existing_rule = await db.automation_rules.find_one({
                "business_id": str(business_id),
                "trigger": rule_trigger,
                "action": rule_action,
            })
            if existing_rule:
                created_rule = _automation_clean_doc(existing_rule)
            else:
                rule = {
                    "id": str(_automation_uuid.uuid4()),
                    "business_id": str(business_id),
                    "name": _safe_text(suggestion.get("title"), "AI automation draft"),
                    "description": _safe_text(suggestion.get("description"), ""),
                    "trigger": rule_trigger,
                    "action": rule_action,
                    "enabled": False,
                    "conditions": suggestion.get("conditions") if isinstance(suggestion.get("conditions"), dict) else {},
                    "config": {
                        "source": "ai_automation_builder",
                        "suggestion_id": str(suggestion.get("id") or ""),
                        "draft_rule_only": True,
                        "safety": "Nothing sends automatically",
                    },
                    "action_config": {
                        "requires_human_approval": True,
                        "safety_notes": [
                            "Never auto-send customer messages",
                            "Never auto-approve payroll",
                            "Never sync MYOB automatically",
                            "Never change pricing",
                            "Never mark invoices paid",
                            "Never change job status automatically",
                        ],
                    },
                    "created_by": _automation_user_id(current_user),
                    "created_at": now,
                    "updated_at": now,
                }
                await db.automation_rules.insert_one(rule)
                created_rule = _automation_clean_doc(rule)
        if not created_rule:
            setup_task = {
                "business_id": str(business_id),
                "owner_id": str(business_id),
                "title": f"Automation setup: {_safe_text(suggestion.get('title'), 'AI suggestion')}",
                "description": "Draft rule only. Nothing sends automatically. Review and configure in Automation.",
                "related_type": "ai_automation_suggestion",
                "related_id": str(suggestion.get("id") or ""),
                "assigned_user_id": str(current_user.get("id") or current_user.get("_id") or ""),
                "status": "pending",
                "priority": str(suggestion.get("priority") or "medium"),
                "source": "ai_automation_builder",
                "due_at": now + timedelta(days=2),
                "created_at": now,
                "updated_at": now,
            }
            insert_task = await db.follow_up_tasks.insert_one(setup_task)
            setup_task["id"] = str(insert_task.inserted_id)

    if next_status == "snoozed":
        days = int((payload or {}).get("days") or 7)
        updates["snoozed_until"] = now + timedelta(days=max(1, min(30, days)))
    await db.ai_automation_suggestions.update_one({"_id": suggestion["_id"]}, {"$set": updates})
    suggestion.update(updates)

    await db.ai_automation_events.insert_one({
        "id": str(_automation_uuid.uuid4()),
        "business_id": str(business_id),
        "suggestion_id": str(suggestion.get("id") or suggestion_id),
        "event_type": next_status,
        "payload": payload or {},
        "created_rule_id": (created_rule or {}).get("id"),
        "setup_task_id": (setup_task or {}).get("id"),
        "created_at": now,
        "actor_id": str(current_user.get("id") or current_user.get("_id") or ""),
    })
    return {
        "success": True,
        "suggestion": _ai_automation_to_response(suggestion),
        "draft_rule": created_rule,
        "setup_task": make_json_safe(setup_task) if setup_task else None,
        "message": "Draft rule only. Nothing sends automatically.",
    }


@api_router.post("/ai/automation-suggestions/{suggestion_id}/approve")
async def approve_ai_automation_suggestion(suggestion_id: str, payload: dict | None = None, current_user: dict = Depends(get_current_user)):
    return await _mutate_ai_automation_suggestion(suggestion_id, "approved", current_user, payload)


@api_router.post("/ai/automation-suggestions/{suggestion_id}/dismiss")
async def dismiss_ai_automation_suggestion(suggestion_id: str, payload: dict | None = None, current_user: dict = Depends(get_current_user)):
    return await _mutate_ai_automation_suggestion(suggestion_id, "dismissed", current_user, payload)


@api_router.post("/ai/automation-suggestions/{suggestion_id}/snooze")
async def snooze_ai_automation_suggestion(suggestion_id: str, payload: dict | None = None, current_user: dict = Depends(get_current_user)):
    return await _mutate_ai_automation_suggestion(suggestion_id, "snoozed", current_user, payload)


_AI_DRAFT_TYPES = {
    "quote_follow_up", "invoice_reminder", "job_reminder", "job_completion_summary", "customer_update",
    "worker_instruction", "quote_wording", "invoice_wording", "client_missing_details_request"
}


def _ai_finance_role_guard(current_user: dict):
    role = _ai_user_role(current_user)
    if role in {"worker", "payroll"}:
        raise HTTPException(status_code=403, detail="Financial foundations are not available for this role")


async def _ai_draft_event(business_id: str, draft_id: str, event_type: str, current_user: dict):
    await db.ai_draft_events.insert_one({
        "id": str(uuid.uuid4()),
        "business_id": str(business_id),
        "draft_id": str(draft_id),
        "event_type": event_type,
        "created_at": _ai_action_now(),
        "actor_id": str(current_user.get("id") or current_user.get("_id") or ""),
    })


@api_router.get("/ai/drafts")
async def list_ai_drafts(current_user: dict = Depends(get_current_user)):
    _ai_action_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    rows = await db.ai_drafts.find({"business_id": business_id}).sort("created_at", -1).limit(200).to_list(length=200)
    return {"success": True, "drafts": make_json_safe(rows)}


@api_router.post("/ai/drafts/create")
async def create_ai_draft(payload: dict, current_user: dict = Depends(get_current_user)):
    _ai_action_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = _ai_action_now()
    draft_type = str((payload or {}).get("type") or "").strip().lower()
    if draft_type not in _AI_DRAFT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported draft type")
    source_record_id = _safe_text((payload or {}).get("source_record_id"))
    source_record_type = _safe_text((payload or {}).get("source_record_type")).lower()
    context_summary = "AI suggests. You approve."
    if source_record_id and source_record_type in {"job", "quote", "invoice", "client", "worker"}:
        coll = {"job": db.jobs, "quote": db.quotes, "invoice": db.invoices, "client": db.clients, "worker": db.users}[source_record_type]
        source = await coll.find_one({"business_id": business_id, "$or": [{"id": source_record_id}, {"_id": ObjectId(source_record_id)}]}) if ObjectId.is_valid(source_record_id) else await coll.find_one({"business_id": business_id, "id": source_record_id})
        if source:
            context_summary = f"Source {source_record_type}: {_safe_text(source.get('title') or source.get('name') or source.get('invoice_number') or source.get('quote_number'), source_record_id)}. AI suggests. You approve."
    fallback_text = f"Draft type: {draft_type.replace('_', ' ')}. AI suggests. You approve."
    draft_text = fallback_text
    used_ai = False
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    if os.environ.get("OPENAI_API_KEY", "").strip():
        try:
            ai = generate_ai_text(
                "Create a short safe business draft. Never send. Include: AI suggests. You approve.",
                json.dumps({"type": draft_type, "context": context_summary, "custom_prompt": (payload or {}).get("custom_prompt")}),
                fallback_text,
                220,
            )
            if ai.get("ok") and ai.get("text"):
                draft_text = _safe_text(ai.get("text"), fallback_text)
                used_ai = True
        except Exception:
            draft_text = fallback_text
    doc = {
        "id": str(uuid.uuid4()), "business_id": business_id, "type": draft_type,
        "title": _safe_text((payload or {}).get("title"), draft_type.replace("_", " ").title()),
        "context_summary": context_summary, "draft_text": draft_text, "source_record_id": source_record_id or None,
        "source_record_type": source_record_type or None, "status": "draft", "created_at": now, "updated_at": now,
        "created_by": str(current_user.get("id") or current_user.get("_id") or ""), "used_at": None, "dismissed_at": None,
        "used_ai": used_ai, "model": model,
    }
    await db.ai_drafts.insert_one(doc)
    await _ai_draft_event(business_id, doc["id"], "created", current_user)
    return {"success": True, "draft": make_json_safe(doc), "used_ai": used_ai, "message": "AI suggests. You approve."}


@api_router.post("/ai/drafts/{draft_id}/mark-used")
async def mark_ai_draft_used(draft_id: str, current_user: dict = Depends(get_current_user)):
    _ai_action_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = _ai_action_now()
    r = await db.ai_drafts.find_one_and_update({"id": draft_id, "business_id": business_id}, {"$set": {"status": "used", "used_at": now, "updated_at": now}}, return_document=True)
    if not r: raise HTTPException(status_code=404, detail="Draft not found")
    await _ai_draft_event(business_id, draft_id, "used", current_user)
    return {"success": True, "draft": make_json_safe(r)}


@api_router.post("/ai/drafts/{draft_id}/dismiss")
async def dismiss_ai_draft(draft_id: str, current_user: dict = Depends(get_current_user)):
    _ai_action_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = _ai_action_now()
    r = await db.ai_drafts.find_one_and_update({"id": draft_id, "business_id": business_id}, {"$set": {"status": "dismissed", "dismissed_at": now, "updated_at": now}}, return_document=True)
    if not r: raise HTTPException(status_code=404, detail="Draft not found")
    await _ai_draft_event(business_id, draft_id, "dismissed", current_user)
    return {"success": True, "draft": make_json_safe(r)}


@api_router.delete("/ai/drafts/{draft_id}")
async def delete_ai_draft(draft_id: str, current_user: dict = Depends(get_current_user)):
    _ai_action_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    r = await db.ai_drafts.delete_one({"id": draft_id, "business_id": business_id})
    if r.deleted_count == 0: raise HTTPException(status_code=404, detail="Draft not found")
    await _ai_draft_event(business_id, draft_id, "deleted", current_user)
    return {"success": True}


@api_router.get("/expenses")
async def list_expenses(current_user: dict = Depends(get_current_user)):
    _ai_finance_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    rows = await db.expenses.find({"business_id": business_id}).sort("date", -1).limit(300).to_list(length=300)
    return {"success": True, "expenses": make_json_safe(rows)}


@api_router.post("/expenses")
async def create_expense(payload: dict, current_user: dict = Depends(get_current_user)):
    _ai_finance_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = _ai_action_now()
    doc = {"id": str(uuid.uuid4()), "business_id": business_id, "category": _safe_text(payload.get("category"), "other"), "description": _safe_text(payload.get("description"), "Expense"), "amount": float(payload.get("amount") or 0), "date": payload.get("date") or now.date().isoformat(), "vendor": payload.get("vendor"), "job_id": payload.get("job_id"), "invoice_id": payload.get("invoice_id"), "tax_amount": payload.get("tax_amount"), "notes": payload.get("notes"), "created_at": now, "updated_at": now, "created_by": str(current_user.get("id") or current_user.get("_id") or "")}
    await db.expenses.insert_one(doc)
    return {"success": True, "expense": make_json_safe(doc)}


@api_router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    _ai_finance_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    payload["updated_at"] = _ai_action_now()
    r = await db.expenses.find_one_and_update({"id": expense_id, "business_id": business_id}, {"$set": payload}, return_document=True)
    if not r: raise HTTPException(status_code=404, detail="Expense not found")
    return {"success": True, "expense": make_json_safe(r)}


@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    _ai_finance_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    r = await db.expenses.delete_one({"id": expense_id, "business_id": business_id})
    if r.deleted_count == 0: raise HTTPException(status_code=404, detail="Expense not found")
    return {"success": True}


@api_router.get("/job-costs")
async def list_job_costs(current_user: dict = Depends(get_current_user)):
    _ai_finance_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    rows = await db.job_costs.find({"business_id": business_id}).sort("date", -1).limit(300).to_list(length=300)
    return {"success": True, "job_costs": make_json_safe(rows)}


@api_router.post("/job-costs")
async def create_job_cost(payload: dict, current_user: dict = Depends(get_current_user)):
    _ai_finance_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = _ai_action_now()
    doc = {"id": str(uuid.uuid4()), "business_id": business_id, "job_id": _safe_text(payload.get("job_id")), "type": _safe_text(payload.get("type"), "other"), "description": _safe_text(payload.get("description"), "Job cost"), "amount": float(payload.get("amount") or 0), "quantity": payload.get("quantity"), "unit_cost": payload.get("unit_cost"), "worker_id": payload.get("worker_id"), "date": payload.get("date") or now.date().isoformat(), "notes": payload.get("notes"), "created_at": now, "updated_at": now, "created_by": str(current_user.get("id") or current_user.get("_id") or "")}
    await db.job_costs.insert_one(doc)
    return {"success": True, "job_cost": make_json_safe(doc)}


@api_router.put("/job-costs/{cost_id}")
async def update_job_cost(cost_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    _ai_finance_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    payload["updated_at"] = _ai_action_now()
    r = await db.job_costs.find_one_and_update({"id": cost_id, "business_id": business_id}, {"$set": payload}, return_document=True)
    if not r: raise HTTPException(status_code=404, detail="Job cost not found")
    return {"success": True, "job_cost": make_json_safe(r)}


@api_router.delete("/job-costs/{cost_id}")
async def delete_job_cost(cost_id: str, current_user: dict = Depends(get_current_user)):
    _ai_finance_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    r = await db.job_costs.delete_one({"id": cost_id, "business_id": business_id})
    if r.deleted_count == 0: raise HTTPException(status_code=404, detail="Job cost not found")
    return {"success": True}


async def _generate_profit_snapshot_doc(current_user: dict) -> dict:
    _ai_finance_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    now = _ai_action_now()
    invoices = await db.invoices.find({"business_id": business_id}).to_list(length=1500)
    quotes = await db.quotes.find({"business_id": business_id}).to_list(length=1200)
    jobs = await db.jobs.find({"business_id": business_id}).to_list(length=1200)
    expenses = await db.expenses.find({"business_id": business_id}).to_list(length=2000)
    job_costs = await db.job_costs.find({"business_id": business_id}).to_list(length=2000)
    invoice_job_ids = {str(i.get("job_id") or i.get("source_job_id") or "") for i in invoices if (i.get("job_id") or i.get("source_job_id"))}
    unpaid = [i for i in invoices if str(i.get("status") or "").lower() not in {"paid", "void", "cancelled", "canceled"}]
    paid = [i for i in invoices if str(i.get("status") or "").lower() in {"paid"}]
    open_quotes = [q for q in quotes if str(q.get("status") or "").lower() in {"pending", "sent", "draft", "open"}]
    completed_uninvoiced = [j for j in jobs if str(j.get("status") or "").lower() in {"completed", "done"} and str(j.get("id") or j.get("_id") or "") not in invoice_job_ids]
    unpaid_val = sum(_financial_amount(i) for i in unpaid)
    paid_val = sum(_financial_amount(i) for i in paid)
    open_quote_val = sum(_financial_amount(q) for q in open_quotes)
    uninvoiced_val = sum(_financial_amount(j) for j in completed_uninvoiced)
    expense_total = sum(float(x.get("amount") or 0) for x in expenses)
    job_cost_total = sum(float(x.get("amount") or 0) for x in job_costs)
    revenue_signal = paid_val + unpaid_val + uninvoiced_val
    estimated_margin = revenue_signal - expense_total - job_cost_total
    profit_known = paid_val > 0 and expense_total > 0
    warning = "Profit is not final until expenses and payments are complete."
    doc = {"id": str(uuid.uuid4()), "business_id": business_id, "revenue_signal": revenue_signal, "unpaid_invoice_value": unpaid_val, "paid_invoice_value": paid_val, "open_quote_value": open_quote_val, "completed_uninvoiced_value": uninvoiced_val, "expense_total": expense_total, "job_cost_total": job_cost_total, "estimated_margin": estimated_margin, "profit_known": profit_known, "warning": warning, "created_at": now, "updated_at": now}
    await db.profit_snapshots.insert_one(doc)
    await db.profit_events.insert_one({"id": str(uuid.uuid4()), "business_id": business_id, "snapshot_id": doc["id"], "event_type": "generated", "created_at": now, "created_by": str(current_user.get("id") or current_user.get("_id") or "")})
    return doc


@api_router.get("/profit/snapshot")
async def get_profit_snapshot(current_user: dict = Depends(get_current_user)):
    _ai_finance_role_guard(current_user)
    business_id = str(await get_user_business_id(current_user))
    doc = await db.profit_snapshots.find_one({"business_id": business_id}, sort=[("created_at", -1)])
    if not doc:
        doc = await _generate_profit_snapshot_doc(current_user)
    return {"success": True, "snapshot": make_json_safe(doc), "message": "AI suggests. You approve. Profit is not final until expenses and payments are complete."}


@api_router.post("/profit/snapshot/generate")
async def generate_profit_snapshot(current_user: dict = Depends(get_current_user)):
    doc = await _generate_profit_snapshot_doc(current_user)
    return {"success": True, "snapshot": make_json_safe(doc), "message": "Estimated margin and revenue signal only. AI suggests. You approve."}



def _safe_text(value, fallback="") -> str:
    return str(value or fallback).strip()


def _count_open_status(items: list[dict], closed_statuses: set[str]) -> int:
    total = 0
    for item in items:
        status = str(item.get("status") or item.get("job_status") or item.get("workflow_status") or "").strip().lower().replace(" ", "_")
        if status not in closed_statuses:
            total += 1
    return total


async def _build_ai_business_snapshot(current_user: dict) -> dict:
    business_id = await get_user_business_id(current_user)
    query = {"business_id": str(business_id)}

    jobs = await db.jobs.find(query).to_list(length=500)
    quotes = await db.quotes.find(query).to_list(length=500)
    invoices = await db.invoices.find(query).to_list(length=500)
    workers = await db.users.find({"business_id": str(business_id), "role": {"$in": ["worker", "manager", "office_admin", "payroll"]}}).to_list(length=300)

    overdue_invoices = 0
    unpaid_invoices = 0
    for invoice in invoices:
        status = str(invoice.get("status") or "").strip().lower()
        if status in {"sent", "overdue", "unpaid", "partial", "draft", "pending"}:
            unpaid_invoices += 1
        if status == "overdue":
            overdue_invoices += 1

    counts = {
        "jobs_total": len(jobs),
        "jobs_open": _count_open_status(jobs, {"completed", "cancelled", "canceled", "done"}),
        "quotes_open": _count_open_status(quotes, {"accepted", "declined", "cancelled", "canceled"}),
        "invoices_total": len(invoices),
        "invoices_unpaid": unpaid_invoices,
        "invoices_overdue": overdue_invoices,
        "workers_total": len(workers),
    }
    return {"business_id": str(business_id), "counts": counts}


def _ai_fallback_answer(question: str, snapshot: dict) -> str:
    counts = (snapshot or {}).get("counts") or {}
    q = _safe_text(question).lower()
    if any(term in q for term in ["owe", "owed", "unpaid", "invoice", "money", "cash"]):
        return (
            f"You currently have {counts.get('invoices_unpaid', 0)} unpaid invoice(s), "
            f"including {counts.get('invoices_overdue', 0)} overdue invoice(s)."
        )
    if any(term in q for term in ["quote", "follow"]):
        return f"You currently have {counts.get('quotes_open', 0)} active quote(s) waiting for action."
    if any(term in q for term in ["job", "schedule", "work"]):
        return f"You currently have {counts.get('jobs_open', 0)} open job(s) from {counts.get('jobs_total', 0)} total."
    if any(term in q for term in ["worker", "team", "staff"]):
        return f"You currently have {counts.get('workers_total', 0)} worker/team profile(s) in this business."
    return (
        "Business snapshot: "
        f"{counts.get('jobs_open', 0)} open jobs, "
        f"{counts.get('quotes_open', 0)} active quotes, "
        f"{counts.get('invoices_unpaid', 0)} unpaid invoices "
        f"({counts.get('invoices_overdue', 0)} overdue)."
    )


async def _ask_churvox_impl(payload: dict, current_user: dict) -> dict:
    role = _ai_user_role(current_user)
    if role in {"worker", "payroll"}:
        raise HTTPException(status_code=403, detail="AI Assistant is not available for this role")

    question = _safe_text((payload or {}).get("question"))
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    snapshot = await _build_ai_business_snapshot(current_user)
    fallback = _ai_fallback_answer(question, snapshot)

    ai = generate_ai_text(
        "You are Churvox AI Assistant. Use only the provided business snapshot. "
        "You can suggest, summarise, draft and warn only. "
        "Do not approve payroll, send customer messages, change pricing, mark invoices paid, or sync MYOB.",
        json.dumps({"question": question, "snapshot": snapshot.get("counts", {})}),
        fallback,
        350,
    )
    return {
        "success": True,
        "configured": bool(ai.get("configured")),
        "used_ai": bool(ai.get("used_ai")),
        "answer": _safe_text(ai.get("text"), fallback),
        "message": _safe_text(ai.get("message"), "Smart fallback response used."),
        "error_type": ai.get("error_type"),
        "model": _safe_text(ai.get("model"), os.environ.get("OPENAI_MODEL", "gpt-4o-mini") or "gpt-4o-mini"),
    }


@api_router.post("/ai/ask")
async def ask_churvox_ai(payload: dict, current_user: dict = Depends(get_current_user)):
    return await _ask_churvox_impl(payload, current_user)


@api_router.post("/launch/ai-ask")
async def launch_ask_churvox_ai(payload: dict, current_user: dict = Depends(get_current_user)):
    return await _ask_churvox_impl(payload, current_user)


@api_router.post("/customer-portal/token")
async def create_customer_portal_token(body: PortalTokenBody, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role", "")).lower()
    if role not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not allowed")
    token = make_portal_token(business_id, body.entity_type, str(body.entity_id))
    await db.portal_links.update_one(
        {"business_id": business_id, "token": token},
        {"$set": {"business_id": business_id, "token": token, "entity_type": body.entity_type, "entity_id": str(body.entity_id), "updated_at": datetime.utcnow()}},
        upsert=True,
    )
    return {"success": True, "token": token, "url": f"{FRONTEND_URL}/public/customer-portal/{token}"}


@api_router.get("/public/customer-portal/{token}")
async def read_customer_portal(token: str):
    link = await db.portal_links.find_one({"token": token})
    if not link:
        raise HTTPException(status_code=404, detail="Portal link not found")

    business_id = str(link.get("business_id") or "")
    entity_type = str(link.get("entity_type") or "client").strip().lower()
    entity_id = str(link.get("entity_id") or "")
    if not business_id or not entity_id:
        raise HTTPException(status_code=404, detail="Portal link is invalid")

    def safe_job(job: dict):
        return {
            "_id": str(job.get("_id")), "title": job.get("title") or "Job", "status": job.get("status") or "scheduled",
            "scheduled_date": job.get("scheduled_date") or job.get("scheduled_at") or job.get("booking_date"),
            "customer_live_status": job.get("customer_live_status") or job.get("status") or "scheduled",
            "customer_notes": job.get("customer_notes") or "", "completion_photos": job.get("completion_photos") or job.get("photos") or [],
            "completed_at": job.get("completed_at"),
        }

    def safe_quote(quote: dict):
        return {"_id": str(quote.get("_id")), "title": quote.get("title") or quote.get("quote_number") or "Quote", "status": quote.get("status") or "draft", "total": quote.get("total") or quote.get("amount") or 0}

    def safe_invoice(inv: dict):
        return {"_id": str(inv.get("_id")), "invoice_number": inv.get("invoice_number") or "Invoice", "status": inv.get("status") or "draft", "total": inv.get("total") or 0, "payment_url": inv.get("payment_url") or inv.get("payment_link") or ""}

    jobs, quotes, invoices = [], [], []
    if entity_type == "client":
        jobs = [safe_job(j) for j in await db.jobs.find(business_filter(business_id, {"client_id": entity_id})).sort("updated_at", -1).limit(20).to_list(20)]
        quotes = [safe_quote(q) for q in await db.quotes.find(business_filter(business_id, {"client_id": entity_id})).sort("updated_at", -1).limit(20).to_list(20)]
        invoices = [safe_invoice(i) for i in await db.invoices.find(business_filter(business_id, {"client_id": entity_id})).sort("updated_at", -1).limit(20).to_list(20)]
    elif entity_type == "job" and ObjectId.is_valid(entity_id):
        job = await db.jobs.find_one(business_filter(business_id, {"_id": ObjectId(entity_id)}))
        if not job:
            raise HTTPException(status_code=404, detail="Portal record not found")
        jobs = [safe_job(job)]

    return {"success": True, "entity_type": entity_type, "jobs": jobs, "quotes": quotes, "invoices": invoices, "privacy_note": "Only customer-safe records are shown. No GPS, payroll, worker-private, internal, or admin-only details are included."}



@api_router.post("/route-optimisation")
async def route_optimisation(payload: dict, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role") or "").lower()
    if role == "payroll":
        raise HTTPException(status_code=403, detail="Not allowed")

    target_date = str((payload or {}).get("date") or "").strip()
    if not target_date:
        raise HTTPException(status_code=400, detail="date is required")
    worker_id = str((payload or {}).get("worker_id") or "").strip()

    query = {"scheduled_date": {"$regex": f"^{target_date}"}}
    if role == "worker":
        query["assigned_worker_id"] = str(current_user.get("id") or current_user.get("_id") or "")
    elif role in {"owner", "manager", "office_admin", "admin", "employer"}:
        if worker_id:
            query["assigned_worker_id"] = worker_id
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    jobs = await db.jobs.find(business_filter(business_id, query)).to_list(500)

    def parse_float(v):
        try:
            return float(v)
        except Exception:
            return None

    def distance(a,b):
        ax, ay = parse_float(a.get('lat')), parse_float(a.get('lng'))
        bx, by = parse_float(b.get('lat')), parse_float(b.get('lng'))
        if None in (ax,ay,bx,by):
            return float('inf')
        return ((ax-bx)**2 + (ay-by)**2) ** 0.5

    all_have_coords = bool(jobs) and all(parse_float(j.get('lat')) is not None and parse_float(j.get('lng')) is not None for j in jobs)
    if all_have_coords:
        remaining = jobs[:]
        ordered = [remaining.pop(0)]
        while remaining:
            last = ordered[-1]
            nxt = min(remaining, key=lambda x: distance(last, x))
            remaining.remove(nxt)
            ordered.append(nxt)
    else:
        ordered = sorted(jobs, key=lambda j: (
            str(j.get('region') or '').lower(),
            str(j.get('scheduled_time') or j.get('start_time') or ''),
            str(j.get('address') or '').lower()
        ))

    def stop_row(j):
        jid = str(j.get('_id'))
        return {
            "id": jid,
            "title": j.get("title") or "Job",
            "address": j.get("address") or "",
            "status": j.get("status") or "assigned",
            "time": j.get("scheduled_time") or j.get("start_time") or "",
            "route": f"/jobs/{jid}",
        }

    stops = [stop_row(j) for j in ordered if j.get('address')]
    waypoint_addresses = [urllib.parse.quote_plus(s['address']) for s in stops if s.get('address')]
    maps_url = ""
    if waypoint_addresses:
        origin = waypoint_addresses[0]
        destination = waypoint_addresses[-1]
        waypoints = "|".join(waypoint_addresses[1:-1]) if len(waypoint_addresses) > 2 else ""
        maps_url = f"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}"
        if waypoints:
            maps_url += f"&waypoints={waypoints}"

    return {
        "success": True,
        "date": target_date,
        "jobs": [stop_row(j) for j in ordered],
        "google_maps_url": maps_url,
        "note": "Route Optimisation V1 is address/order planning only and does not include live traffic or GPS tracking.",
    }


@api_router.get("/launch-check")
async def launch_check(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role") or "").lower()
    if role not in {"owner", "admin", "employer"}:
        raise HTTPException(status_code=403, detail="Not allowed")

    async def c(coll):
        try:
            return await coll.count_documents(business_filter(business_id, {}))
        except Exception:
            return 0

    data = {
        "auth_user_present": bool(current_user.get("id") or current_user.get("_id")),
        "business_id_present": bool(business_id),
        "role": role,
        "plan": current_user.get("plan") or current_user.get("subscription_plan") or "unknown",
        "clients_count": await c(db.clients),
        "jobs_count": await c(db.jobs),
        "quotes_count": await c(db.quotes),
        "invoices_count": await c(db.invoices),
        "team_count": await c(db.workers),
        "automation_rules_count": await c(db.automations),
        "automation_runs_count": await c(db.automation_runs),
        "notifications_count": await c(db.notifications),
        "worker_route_note": "Worker routes are separated and limited to assigned jobs/settings.",
        "payroll_route_note": "Payroll routes are limited to timesheets/payroll workflows.",
    }
    checks = [
        {"key": "auth_user", "label": "Authenticated user", "pass": data["auth_user_present"]},
        {"key": "business", "label": "Business context", "pass": data["business_id_present"]},
        {"key": "role", "label": "Owner/admin role", "pass": role in {"owner", "admin", "employer"}},
    ]
    return {"success": True, "checks": checks, "data": data}

@api_router.get("/clients/{client_id}/timeline")
async def get_client_timeline(client_id: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role") or "").lower()
    if role not in {"owner", "manager", "office_admin", "admin", "employer"}:
        raise HTTPException(status_code=403, detail="Not allowed")

    client_doc = await db.clients.find_one(business_filter(business_id, {"_id": normalize_object_id(client_id)})) if ObjectId.is_valid(client_id) else None
    if not client_doc:
        client_doc = await db.clients.find_one(business_filter(business_id, {"id": str(client_id)}))
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")

    cid = str(client_doc.get("_id"))
    id_options = [cid, str(client_doc.get("id") or cid), str(client_id)]
    items = []
    async def collect(collection, query):
        try:
            return await collection.find(business_filter(business_id, query)).sort("updated_at", -1).limit(100).to_list(100)
        except Exception:
            return []

    jobs = await collect(db.jobs, {"client_id": {"$in": id_options}})
    quotes = await collect(db.quotes, {"client_id": {"$in": id_options}})
    invoices = await collect(db.invoices, {"client_id": {"$in": id_options}})
    tasks = await collect(db.follow_up_tasks, {"$or": [{"client_id": {"$in": id_options}}, {"related_type": "client", "related_id": {"$in": id_options}}]})
    payments = await collect(db.payments, {"client_id": {"$in": id_options}})

    for j in jobs:
        jid = str(j.get("_id"))
        photos = [p for p in (j.get("completion_photos") or j.get("photos") or []) if isinstance(p, str)][:4]
        items.append({"id": jid, "type": "job", "title": j.get("title") or "Job", "status": j.get("status") or "assigned", "date": j.get("scheduled_date") or j.get("updated_at") or j.get("created_at"), "route": f"/jobs/{jid}", "amount": j.get("price") or j.get("estimated_total"), "description": j.get("notes") or j.get("address") or "Job activity", "photos": photos})
    for q in quotes:
        qid = str(q.get("_id"))
        items.append({"id": qid, "type": "quote", "title": q.get("quote_number") or q.get("title") or "Quote", "status": q.get("status") or "draft", "date": q.get("updated_at") or q.get("created_at"), "route": f"/quotes/{qid}", "amount": q.get("total") or q.get("amount"), "description": q.get("job_description") or q.get("notes") or "Quote activity"})
    for i in invoices:
        iid = str(i.get("_id"))
        items.append({"id": iid, "type": "invoice", "title": i.get("invoice_number") or "Invoice", "status": i.get("status") or "draft", "date": i.get("paid_at") or i.get("updated_at") or i.get("created_at"), "route": f"/invoices/{iid}", "amount": i.get("total") or i.get("amount"), "description": i.get("description") or "Invoice activity"})
    for p in payments:
        pid = str(p.get("_id"))
        items.append({"id": pid, "type": "payment", "title": p.get("reference") or "Payment", "status": p.get("status") or "received", "date": p.get("payment_date") or p.get("updated_at") or p.get("created_at"), "route": f"/invoices/{str(p.get('invoice_id') or '')}" if p.get('invoice_id') else "/invoices", "amount": p.get("amount") or 0, "description": p.get("notes") or "Payment recorded"})
    for t in tasks:
        tid = str(t.get("_id"))
        items.append({"id": tid, "type": "follow_up", "title": t.get("title") or "Follow-up", "status": t.get("status") or "open", "date": t.get("due_at") or t.get("updated_at") or t.get("created_at"), "route": "/follow-ups", "description": t.get("description") or "Client follow-up"})

    items.sort(key=lambda x: str(x.get("date") or ""), reverse=True)
    return {"success": True, "items": items}

@api_router.get("/follow-up-suggestions")
async def get_follow_up_suggestions(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role") or "").lower()
    if role in {"worker", "payroll"} or role not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not allowed")

    now = datetime.utcnow()
    today = now.date()
    suggestion_items = []

    quotes = await db.quotes.find(business_filter(business_id, {"status": {"$in": ["sent", "open", "pending", "awaiting"]}})).sort("updated_at", 1).limit(200).to_list(200)
    for q in quotes:
        sent_at = q.get("sent_at") or q.get("updated_at") or q.get("created_at")
        if not isinstance(sent_at, datetime):
            continue
        if (now - sent_at).days >= 3:
            qid = str(q.get("_id"))
            suggestion_items.append({
                "key": f"quote-followup:{qid}", "type": "quote_followup", "title": "Quote sent 3+ days ago",
                "reason": f"Quote has been waiting {(now - sent_at).days} days without approval.", "route": f"/quotes/{qid}",
                "related_record_id": qid,
                "draft_text": "Hi, just checking in on the quote we sent through. Happy to answer questions or lock in a date when you are ready.",
                "created_reason": "Quote status is still open/sent after 3 days.", "status": "open"
            })

    invoices = await db.invoices.find(business_filter(business_id, {"status": {"$nin": ["paid", "void", "cancelled", "canceled"]}})).sort("due_date", 1).limit(200).to_list(200)
    for inv in invoices:
        due = inv.get("due_date")
        try:
            due_dt = due if isinstance(due, datetime) else datetime.fromisoformat(str(due).replace("Z", "+00:00"))
        except Exception:
            due_dt = None
        if due_dt and due_dt.date() < today:
            iid = str(inv.get("_id"))
            suggestion_items.append({"key": f"invoice-overdue:{iid}", "type": "invoice_overdue", "title": "Invoice overdue — send reminder", "reason": "Invoice due date has passed and payment is still outstanding.", "route": f"/invoices/{iid}", "related_record_id": iid, "draft_text": "Hi, friendly reminder that this invoice is now overdue. Please let us know if you need payment details resent.", "created_reason": "Invoice unpaid and past due date.", "status": "open"})

    jobs = await db.jobs.find(business_filter(business_id, {})).sort("updated_at", -1).limit(500).to_list(500)
    for job in jobs:
        jid = str(job.get("_id"))
        job_status = str(job.get("status") or job.get("job_status") or job.get("workflow_status") or "").lower()
        is_completed = job_status in {"completed", "complete", "done"} or bool(job.get("completed") or job.get("completed_at"))
        assigned = bool(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_to") or job.get("assigned_worker_name"))

        if is_completed:
            suggestion_items.append({"key": f"job-review:{jid}", "type": "job_review", "title": "Completed job — ask for review", "reason": "Job is completed and customer feedback can improve trust.", "route": f"/jobs/{jid}", "related_record_id": jid, "draft_text": "Thanks again for choosing us. If you are happy with the work, would you mind leaving a quick Google review?", "created_reason": "Job marked completed.", "status": "open"})
            inv = await db.invoices.find_one(business_filter(business_id, {"job_id": jid}))
            if not inv:
                suggestion_items.append({"key": f"job-no-invoice:{jid}", "type": "invoice_draft", "title": "Completed job with no invoice", "reason": "Job is complete but no linked invoice exists yet.", "route": f"/jobs/{jid}", "related_record_id": jid, "draft_text": "Create and review an invoice draft for this completed job before sending.", "created_reason": "Completed job missing invoice.", "status": "open"})

        due_raw = job.get("due_date") or job.get("scheduled_for") or job.get("scheduled_date") or job.get("date")
        due_date = None
        if isinstance(due_raw, datetime):
            due_date = due_raw.date()
        elif isinstance(due_raw, str):
            try:
                due_date = datetime.fromisoformat(due_raw.replace("Z", "+00:00")).date()
            except Exception:
                try:
                    due_date = datetime.strptime(due_raw[:10], "%Y-%m-%d").date()
                except Exception:
                    due_date = None
        if due_date == today and not assigned and not is_completed:
            suggestion_items.append({"key": f"job-unassigned-today:{jid}", "type": "job_assignment", "title": "Job due today with no worker", "reason": "This job is due today and has no worker assigned yet.", "route": f"/jobs/{jid}", "related_record_id": jid, "draft_text": "Please confirm who is assigned to this job today and update the schedule.", "created_reason": "Due today + no assigned worker.", "status": "open"})

    clients = await db.clients.find(business_filter(business_id, {})).sort("updated_at", 1).limit(300).to_list(300)
    for c in clients:
        last_touch = c.get("last_contact_at") or c.get("updated_at") or c.get("created_at")
        if isinstance(last_touch, datetime) and (now - last_touch).days >= 60:
            cid = str(c.get("_id"))
            suggestion_items.append({"key": f"client-inactive:{cid}", "type": "client_checkin", "title": "Client inactive 60+ days", "reason": f"No recent activity for {(now - last_touch).days} days.", "route": f"/clients/{cid}", "related_record_id": cid, "draft_text": "Hi, checking in to see if you need anything scheduled in the coming weeks.", "created_reason": "No client activity for 60+ days.", "status": "open"})

    dismissed = await db.follow_up_suggestions.find(business_filter(business_id, {"dismissed": True})).to_list(500)
    dismissed_keys = {str(d.get("suggestion_key") or d.get("key") or "") for d in dismissed}
    items = [i for i in suggestion_items if i["key"] not in dismissed_keys][:80]
    return {"success": True, "items": items, "message": "Suggestions are recommendations only. Nothing is sent automatically."}


@api_router.post("/follow-up-suggestions/{suggestion_key}/dismiss")
async def dismiss_follow_up_suggestion(suggestion_key: str, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role") or "").lower()
    if role in {"worker", "payroll"} or role not in BUSINESS_ROLES:
        raise HTTPException(status_code=403, detail="Not allowed")
    key = str(suggestion_key or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="Invalid suggestion key")
    await db.follow_up_suggestions.update_one(
        business_filter(business_id, {"suggestion_key": key}),
        {"$set": {"business_id": str(business_id), "suggestion_key": key, "dismissed": True, "dismissed_at": datetime.utcnow(), "updated_at": datetime.utcnow()}},
        upsert=True,
    )
    return {"success": True}


@api_router.get("/business/settings")
async def get_business_settings(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role") or "").lower()
    if role not in {"owner", "admin", "employer", "manager", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not allowed")
    doc = await db.business_settings.find_one(business_filter(business_id, {})) or {}
    return {"success": True, "google_review_link": doc.get("google_review_link") or "", "daily_digest_enabled": bool(doc.get("daily_digest_enabled", False)), "daily_digest_email": doc.get("daily_digest_email") or ""}


@api_router.patch("/business/settings")
async def patch_business_settings(payload: dict, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role") or "").lower()
    if role not in {"owner", "admin", "employer", "manager", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not allowed")
    link = str((payload or {}).get("google_review_link") or "").strip()
    if link and not (link.startswith("http://") or link.startswith("https://")):
        raise HTTPException(status_code=400, detail="google_review_link must start with http:// or https://")
    update = {"updated_at": datetime.utcnow(), "business_id": str(business_id), "google_review_link": link, "daily_digest_enabled": bool((payload or {}).get("daily_digest_enabled", False)), "daily_digest_email": str((payload or {}).get("daily_digest_email") or "").strip()}
    await db.business_settings.update_one(business_filter(business_id, {}), {"$set": update, "$setOnInsert": {"created_at": datetime.utcnow()}}, upsert=True)
    return {"success": True}


@api_router.get("/smart-hub/digest")
async def smart_hub_digest(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role") or "").lower()
    if role not in {"owner", "admin", "employer", "manager", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not allowed")
    today = datetime.utcnow().date().isoformat()
    jobs = await db.jobs.find(business_filter(business_id, {})).limit(500).to_list(500)
    invoices = await db.invoices.find(business_filter(business_id, {})).limit(500).to_list(500)
    quotes = await db.quotes.find(business_filter(business_id, {})).limit(500).to_list(500)
    runs = await db.automation_runs.find(business_filter(business_id, {})).sort("created_at", -1).limit(100).to_list(100)
    rules = await db.automation_rules.find(business_filter(business_id, {})).limit(200).to_list(200)
    workers = await db.users.find(business_filter(business_id, {"role": "worker"})).limit(300).to_list(300)
    suggestions = (await get_follow_up_suggestions(current_user)).get("items", [])
    todays_jobs = [j for j in jobs if str(j.get("due_date") or j.get("scheduled_date") or j.get("date") or "")[:10] == today]
    unassigned = [j for j in jobs if not (j.get("assigned_worker_id") or j.get("worker_id") or j.get("assigned_to")) and str(j.get("status") or "").lower() not in {"completed", "done", "cancelled", "canceled"}]
    overdue_invoices = [i for i in invoices if str(i.get("status") or "").lower() == "overdue"]
    open_quotes = [q for q in quotes if str(q.get("status") or "").lower() in {"open", "sent", "pending", "draft", "awaiting"}]
    automation_issues = [r for r in runs if str(r.get("status") or "").lower() in {"failed", "error", "paused"}]
    assigned_today = set(str(j.get("assigned_worker_id") or j.get("worker_id") or j.get("assigned_to") or "") for j in todays_jobs if (j.get("assigned_worker_id") or j.get("worker_id") or j.get("assigned_to")))
    jobs_score = max(0, 100 - (len(unassigned) * 10))
    cashflow_score = max(0, 100 - (len(overdue_invoices) * 15))
    quote_score = max(0, 100 - (len(open_quotes) * 2))
    team_score = max(0, 100 - max(0, len(todays_jobs) - len(assigned_today)) * 12)
    automation_score = max(0, 100 - (len(automation_issues) * 20))
    followup_score = max(0, 100 - (len(suggestions) * 7))
    overall_score = int(round((jobs_score + cashflow_score + quote_score + team_score + automation_score + followup_score) / 6))
    health_score = {
        "overall": {"score": overall_score, "reason": f"{len(todays_jobs)} jobs today, {len(overdue_invoices)} overdue invoices.", "recommended_action": "Review today's assignments and overdue invoices.", "route": "/smart-hub"},
        "jobs": {"score": jobs_score, "reason": f"{len(unassigned)} jobs need assignment/action.", "recommended_action": "Assign workers to open jobs.", "route": "/jobs"},
        "cashflow": {"score": cashflow_score, "reason": f"{len(overdue_invoices)} overdue invoices found.", "recommended_action": "Review overdue invoices and send approved reminders.", "route": "/invoices"},
        "quote_pipeline": {"score": quote_score, "reason": f"{len(open_quotes)} open quotes in pipeline.", "recommended_action": "Follow up open quotes older than 3 days.", "route": "/quotes"},
        "team_activity": {"score": team_score, "reason": f"{len(assigned_today)} workers assigned today out of {len(todays_jobs)} jobs.", "recommended_action": "Confirm job assignments for today.", "route": "/team"},
        "automation_health": {"score": automation_score, "reason": f"{len(automation_issues)} failed/paused automation runs.", "recommended_action": "Open automation runs and resolve failures.", "route": "/automation/runs"},
        "follow_up_health": {"score": followup_score, "reason": f"{len(suggestions)} urgent follow-up suggestions.", "recommended_action": "Review follow-ups and approve next contact drafts.", "route": "/follow-ups"},
    }
    health_summary = f"{len(todays_jobs)} jobs today, {len(overdue_invoices)} overdue invoices, {len(unassigned)} unassigned jobs."
    lines = ["Churvox Daily Digest", "", f"Business health snapshot: {health_summary}", f"• Today's jobs: {len(todays_jobs)}", f"• Overdue invoices: {len(overdue_invoices)}", f"• Open quotes: {len(open_quotes)}", f"• Unassigned jobs: {len(unassigned)}", f"• Urgent follow-ups: {len(suggestions)}", f"• Automation issues: {len(automation_issues)}", "", "Approval-first reminder: nothing sends automatically."]
    return {"success": True, "today_jobs": todays_jobs[:30], "overdue_invoices": overdue_invoices[:30], "open_quotes": open_quotes[:30], "workers_assigned_today": len(assigned_today), "jobs_needing_assignment_action": unassigned[:30], "automation_issues": automation_issues[:20], "urgent_follow_ups": suggestions[:30], "recommended_actions": [{"title": "Assign today's unassigned jobs", "route": "/jobs", "count": len(unassigned)}, {"title": "Review overdue invoices", "route": "/invoices", "count": len(overdue_invoices)}, {"title": "Resolve failed automation runs", "route": "/automation/runs", "count": len(automation_issues)}], "active_templates_count": len([r for r in rules if r.get("template_key")]), "active_rules_count": len([r for r in rules if r.get("enabled", True)]), "failed_runs_count": len(automation_issues), "team_workers_count": len(workers), "health_score": health_score, "business_health_summary": health_summary, "digest_text": "\n".join(lines)}


@api_router.post("/smart-hub/digest-email/test")
async def send_smart_hub_digest_test(current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    role = str(current_user.get("role") or "").lower()
    if role not in {"owner", "admin", "employer", "manager", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not allowed")
    settings = await db.business_settings.find_one(business_filter(business_id, {})) or {}
    to_email = str(settings.get("daily_digest_email") or current_user.get("email") or "").strip()
    if not to_email:
        raise HTTPException(status_code=400, detail="Set a daily digest email in settings first")
    provider_ok = bool(os.environ.get("POSTMARK_API_TOKEN") or os.environ.get("POSTMARK_SERVER_TOKEN"))
    if not provider_ok:
        raise HTTPException(status_code=503, detail="Email provider not configured. Add Postmark credentials to enable test sends.")
    digest = await smart_hub_digest(current_user)
    if not digest.get("success"):
        raise HTTPException(status_code=500, detail="Could not build digest")
    await send_email(to_email=to_email, subject="Churvox Daily Digest (Test)", html_content=(digest.get("digest_text") or "").replace("\n", "<br/>"))
    return {"success": True, "sent_to": to_email}

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


# CORS_HARD_FIX_20260412

@api_router.get('/smart-hub/summary')
async def smart_hub_summary(current_user: dict = Depends(get_current_user)):
    business_id = str(current_user.get('business_id') or current_user.get('id') or '')
    jobs = await db.jobs.count_documents({'business_id': business_id}) if hasattr(db,'jobs') else 0
    in_progress = await db.jobs.count_documents({'business_id': business_id,'status':'in_progress'}) if hasattr(db,'jobs') else 0
    overdue = await db.jobs.count_documents({'business_id': business_id,'status':'overdue'}) if hasattr(db,'jobs') else 0
    open_quotes = await db.quotes.count_documents({'business_id': business_id,'status': {'$in':['draft','open','sent']}}) if hasattr(db,'quotes') else 0
    unpaid = await db.invoices.count_documents({'business_id': business_id,'status': {'$nin':['paid','cancelled']}}) if hasattr(db,'invoices') else 0
    team = await db.users.count_documents({'business_id': business_id,'role': {'$in':['worker','manager','owner','office_admin']}}) if hasattr(db,'users') else 0
    return {'success': True, 'data': {'today_jobs': 0, 'jobs_in_progress': in_progress, 'completed_jobs': 0, 'overdue_jobs': overdue, 'open_quotes': open_quotes, 'unpaid_invoices': unpaid, 'team_members': team, 'urgent_followups': [], 'automation_issues': [], 'health_score': max(0, 100 - overdue*5), 'last_updated': datetime.now(timezone.utc).isoformat()}}

@api_router.post('/ai/business-assistant')
async def ai_business_assistant(payload: dict, current_user: dict = Depends(get_current_user)):
    business_id = str(current_user.get('business_id') or current_user.get('id') or '')
    jobs = await db.jobs.count_documents({'business_id': business_id}) if hasattr(db,'jobs') else 0
    unpaid = await db.invoices.count_documents({'business_id': business_id,'status': {'$nin':['paid','cancelled']}}) if hasattr(db,'invoices') else 0
    open_quotes = await db.quotes.count_documents({'business_id': business_id,'status': {'$in':['draft','open','sent']}}) if hasattr(db,'quotes') else 0
    p = str((payload or {}).get('prompt_type') or 'attention')
    msg = f"Draft only. {jobs} jobs, {unpaid} unpaid invoices, {open_quotes} open quotes. Prioritise overdue work and approvals first."
    if p == 'invoice_followup': msg = 'Draft only: Friendly reminder that your invoice is due. Let us know if you need another copy.'
    return {'success': True, 'data': {'response': msg, 'mode': 'fallback', 'draft_only': True, 'prompt_type': p}}

@api_router.get('/sms/balance')
async def sms_balance(current_user: dict = Depends(get_current_user)):
    business_id = str(current_user.get('business_id') or '')
    row = await db.sms_credits.find_one({'business_id': business_id}) if hasattr(db,'sms_credits') else None
    return {'success': True, 'data': {'configured': bool(sms_provider), 'credits': int((row or {}).get('balance', (row or {}).get('credits', 0) or 0))}}

@api_router.get('/sms/history')
async def sms_history(current_user: dict = Depends(get_current_user)):
    business_id = str(current_user.get('business_id') or '')
    rows = []
    if hasattr(db,'sms_log'):
      cursor = db.sms_log.find({'business_id': business_id}).sort('created_at', -1).limit(50)
      rows = await cursor.to_list(length=50)
    return {'success': True, 'data': {'history': rows}}

@api_router.post('/sms/buy-credits')
async def sms_buy_credits(payload: dict, current_user: dict = Depends(get_current_user)):
    pack = int((payload or {}).get("pack") or 0)
    if pack not in {100, 500, 1000}:
        return {'success': False, 'error': 'Invalid pack selected.', 'configured': False}
    return {'success': False, 'error': 'SMS credit purchasing is not configured yet.', 'configured': False, 'not_configured': True}

@api_router.get('/myob/status')
async def myob_status(current_user: dict = Depends(get_current_user)):
    settings = await get_myob_settings(current_user)
    data = settings.get('data') if isinstance(settings, dict) else {}
    return {'success': True, 'data': {'status': data.get('myob_status', 'not_connected'), 'connected': bool(data.get('connected')), 'last_sync_time': data.get('last_sync_at'), 'not_configured': not bool(data.get('connected'))}}

@api_router.post('/myob/test-connection')
async def myob_test_connection(current_user: dict = Depends(get_current_user)):
    settings = await get_myob_settings(current_user)
    data = settings.get('data') if isinstance(settings, dict) else {}
    if not data.get('connected'):
        return {'success': False, 'error': 'not_configured', 'configured': False}
    return {'success': True, 'data': {'status': 'connected'}}

@api_router.post('/myob/settings')
async def myob_settings_save(payload: dict, current_user: dict = Depends(get_current_user)):
    if str(current_user.get("role") or "").lower() not in {"owner", "manager", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not authorized")
    business_id = str(current_user.get("business_id") or current_user.get("id") or "")
    company_file_id = str((payload or {}).get("company_file_id") or "").strip()
    company_file_name = str((payload or {}).get("company_file_name") or "").strip()
    if not business_id:
        return {"success": False, "error": "not_configured", "configured": False}
    await db.accounting_settings.update_one(
        {"business_id": business_id},
        {"$set": {"business_id": business_id, "myob_company_file_id": company_file_id, "myob_company_file_name": company_file_name, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"success": True, "data": {"company_file_id": company_file_id, "company_file_name": company_file_name}}

@api_router.post('/myob/invoices/{invoice_id}/sync')
async def myob_invoice_sync_alias(invoice_id: str, current_user: dict = Depends(get_current_user)):
    return await invoice_myob_sync(invoice_id, current_user)

@api_router.post('/myob/invoices/{invoice_id}/pull-payment-status')
async def myob_pull_payment(invoice_id: str, current_user: dict = Depends(get_current_user)):
    return await invoice_myob_status(invoice_id, current_user)
from fastapi.responses import PlainTextResponse

async def _csv_rows(collection, business_id):
    if not hasattr(db, collection):
        return []
    rows = await getattr(db, collection).find({'business_id': business_id}).limit(1000).to_list(length=1000)
    return rows

@api_router.get('/reports/invoices.csv')
async def reports_invoices_csv(current_user: dict = Depends(get_current_user)):
    business_id = str(current_user.get('business_id') or '')
    rows = await _csv_rows('invoices', business_id)
    out = 'id,status,total,created_at\n' + '\n'.join([f"{r.get('id','')},{r.get('status','')},{r.get('total',r.get('amount',0))},{r.get('created_at','')}" for r in rows])
    return PlainTextResponse(out, media_type='text/csv')

@api_router.get('/reports/jobs.csv')
async def reports_jobs_csv(current_user: dict = Depends(get_current_user)):
    business_id = str(current_user.get('business_id') or '')
    rows = await _csv_rows('jobs', business_id)
    out = 'id,status,title,created_at\n' + '\n'.join([f"{r.get('id','')},{r.get('status','')},{str(r.get('title','')).replace(',',' ')},{r.get('created_at','')}" for r in rows])
    return PlainTextResponse(out, media_type='text/csv')

@api_router.get('/reports/quotes.csv')
async def reports_quotes_csv(current_user: dict = Depends(get_current_user)):
    business_id = str(current_user.get('business_id') or '')
    rows = await _csv_rows('quotes', business_id)
    out = 'id,status,total,created_at\n' + '\n'.join([f"{r.get('id','')},{r.get('status','')},{r.get('total',0)},{r.get('created_at','')}" for r in rows])
    return PlainTextResponse(out, media_type='text/csv')
