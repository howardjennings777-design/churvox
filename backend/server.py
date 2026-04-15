import os
import json
import urllib.request
import urllib.error
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.churvox.com").rstrip("/")
import asyncio
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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, Query
from app.plan_rules import normalize_plan, get_plan_features, can_use_feature, get_max_clients
from owner_bootstrap import ensure_owner_account
from fastapi.responses import RedirectResponse, HTMLResponse, FileResponse
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
from email_provider import get_email_provider, build_invite_email, build_resend_invite_email, build_password_reset_email, send_email

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000, connectTimeoutMS=10000, socketTimeoutMS=10000, maxPoolSize=20)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_change_me')
JWT_ALGORITHM = "HS256"
DEFAULT_GST_RATE = float(os.environ.get('DEFAULT_GST_RATE', '15'))




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
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.churvox.com")

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
        "price": 110, "max_workers": 20, "max_clients": 35,
        "sms": True, "myob": True, "team": True,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
    },
    "enterprise": {
        "price": 240, "max_workers": 50, "max_clients": 50,
        "sms": True, "myob": True, "team": True,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
        "extra_blocks": True,
    },
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
        "plan": normalize_plan(user_doc.get("plan", "solo")),
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

async def set_business_plan_from_checkout(user_id: str, plan: str, stripe_customer_id: str = None, stripe_subscription_id: str = None):
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
        stripe_customer_id = getattr(session, "customer", None)
        stripe_subscription_id = getattr(session, "subscription", None)

        print("BACKEND RETURN DEBUG", {
            "session_id": session_id,
            "user_id": user_id,
            "plan": plan,
            "stripe_customer_id": str(stripe_customer_id) if stripe_customer_id else None,
            "stripe_subscription_id": str(stripe_subscription_id) if stripe_subscription_id else None,
        })

        if user_id and plan in {"solo", "team", "pro", "enterprise"}:
            await set_business_plan_from_checkout(
                user_id,
                plan,
                str(stripe_customer_id) if stripe_customer_id else None,
                str(stripe_subscription_id) if stripe_subscription_id else None,
            )
            return RedirectResponse(url=f"{FRONTEND_URL}/plans?checkout=success&plan={plan}")

        return RedirectResponse(url=f"{FRONTEND_URL}/plans?checkout=cancelled")
    except Exception as e:
        print("BACKEND RETURN ERROR", repr(e))
        return RedirectResponse(url=f"{FRONTEND_URL}/plans?checkout=cancelled")


@api_router.post("/stripe/create-checkout-session")
async def create_checkout_session(payload: dict, current_user: dict = Depends(get_current_user)):
    plan = (payload.get("plan_type") or "solo").lower()

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe secret key is missing on the server")

    price_map = {
        "solo": STRIPE_PRICE_SOLO,
        "team": STRIPE_PRICE_TEAM,
        "pro": STRIPE_PRICE_PRO,
        "enterprise": STRIPE_PRICE_ENTERPRISE,
    }
    price_id = (price_map.get(plan) or "").strip()
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Missing Stripe price ID for plan: {plan}")

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
        "plan": "solo",
        "email_verified": False,
        "email_verification_token": secrets.token_urlsafe(32),
        "email_verification_sent_at": now,
        "plan_status": "trialing",
        "trial_started_at": now,
        "trial_ends_at": now + timedelta(days=14),
        "subscription_status": "trialing",
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

@api_router.post("/auth/signup")
async def signup(payload: dict):
    email = str((payload or {}).get("email") or "").strip().lower()
    password = str((payload or {}).get("password") or "").strip()
    name = str((payload or {}).get("name") or "").strip()
    business_name = str((payload or {}).get("business_name") or (payload or {}).get("businessName") or name or "My Business").strip()
    industry = str((payload or {}).get("industry") or "Other").strip()

    if not email or not password or not name:
        raise HTTPException(status_code=400, detail="Name, email, and password are required")

    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    now = datetime.utcnow()
    password_hash = pwd_context.hash(password)

    business_doc = {
        "name": business_name,
        "business_name": business_name,
        "email": email,
        "industry": industry,
        "plan": "solo",
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    business_result = await db.businesses.insert_one(business_doc)
    business_id = str(business_result.inserted_id)

    user_doc = {
        "name": name,
        "email": email,
        "password_hash": password_hash,
        "role": "owner",
        "business_id": business_id,
        "industry": industry,
        "plan": "solo",
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    user_result = await db.users.insert_one(user_doc)
    user_id = str(user_result.inserted_id)

    token = create_access_token({
        "sub": email,
        "email": email,
        "role": "owner",
        "business_id": business_id,
        "user_id": user_id,
    })

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "role": "owner",
            "business_id": business_id,
            "plan": "solo",
            "industry": industry,
        }
    }

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
        await send_email(
            to_email=email,
            subject="Reset your Churvox password",
            html_content=f"""
                <div style=\"font-family:Arial,sans-serif;line-height:1.5\">
                  <h2>Reset your password</h2>
                  <p>Hello {user.get('name') or ''},</p>
                  <p>We received a request to reset your Churvox password.</p>
                  <p><a href=\"{reset_link}\" style=\"display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px\">Reset Password</a></p>
                  <p>If the button does not work, use this link:</p>
                  <p><a href=\"{reset_link}\">{reset_link}</a></p>
                  <p>If you did not request this, you can ignore this email.</p>
                </div>
            """
        )
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

    existing_user = await db.users.find_one({"email": email})
    hashed = hash_password(password)
    now = datetime.now(timezone.utc)

    if existing_user:
        await db.users.update_one(
            {"_id": existing_user["_id"]},
            {"$set": {
                "password_hash": hashed,
                "role": "worker",
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
            "role": "worker",
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
    if current_user.get("role") not in ["owner", "admin", "employer"]:
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
        subject, html = build_resend_invite_email(name, invite_link)
        await send_email(to_email=email, subject=subject, html_content=html)
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
        async for invoice in db.invoices.find(query).sort("created_at", -1):
            try:
                subtotal = float(invoice.get("subtotal") or 0)
                gst_rate = float(invoice.get("gst_rate") or 15)
                total = subtotal + (subtotal * gst_rate / 100.0)
                docs.append({
                    "id": str(invoice.get("_id") or invoice.get("id") or ""),
                    "invoice_number": invoice.get("invoice_number") or f"INV-{str(invoice.get('_id') or '')[-6:]}",
                    "client_id": invoice.get("client_id"),
                    "customer_name": invoice.get("customer_name") or "",
                    "customer_email": invoice.get("customer_email") or "",
                    "address": invoice.get("address") or "",
                    "description": invoice.get("description") or "",
                    "subtotal": subtotal,
                    "gst_rate": gst_rate,
                    "total": total,
                    "status": invoice.get("status") or "draft",
                    "pricing_type": invoice.get("pricing_type") or "fixed",
                    "hourly_rate": float(invoice.get("hourly_rate") or 0),
                    "hours_worked": float(invoice.get("hours_worked") or 0),
                    "extras": invoice.get("extras") or [],
                    "notes": invoice.get("notes") or "",
                    "myob_sync_status": invoice.get("myob_sync_status") or "not_synced",
                    "created_at": safe_iso(invoice.get("created_at")),
                    "updated_at": safe_iso(invoice.get("updated_at")),
                })
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

    if current_user.get("role") not in ["owner", "admin", "employer"]:
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

    now = datetime.now(timezone.utc)

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
        "myob_sync_status": payload.get("myob_sync_status") or "not_synced",
        "business_id": business_id,
        "owner_id": owner_id,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.invoices.insert_one(invoice_doc)

    return {
        "success": True,
        "id": str(result.inserted_id),
        "message": "Invoice created"
    }


@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
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

    subtotal = float(invoice.get("subtotal") or 0)
    gst_rate = float(invoice.get("gst_rate") or 15)
    total = subtotal + (subtotal * gst_rate / 100.0)

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
        "id": str(invoice.get("_id") or invoice.get("id") or ""),
        "invoice_number": invoice.get("invoice_number") or f"INV-{str(invoice.get('_id') or '')[-6:]}",
        "client_id": invoice.get("client_id"),
        "customer_name": invoice.get("customer_name") or "",
        "customer_email": invoice.get("customer_email") or "",
        "address": invoice.get("address") or "",
        "description": invoice.get("description") or "",
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "total": total,
        "status": invoice.get("status") or "draft",
        "pricing_type": invoice.get("pricing_type") or "fixed",
        "hourly_rate": float(invoice.get("hourly_rate") or 0),
        "hours_worked": float(invoice.get("hours_worked") or 0),
        "extras": invoice.get("extras") or [],
        "notes": invoice.get("notes") or "",
        "myob_sync_status": invoice.get("myob_sync_status") or "not_synced",
        "created_at": safe_iso(invoice.get("created_at")),
        "updated_at": safe_iso(invoice.get("updated_at")),
    }


@api_router.patch("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in ["owner", "admin", "employer"]:
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

    await db.invoices.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": "sent",
            "sent_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    updated = await db.invoices.find_one({"_id": obj_id})
    return {"success": True, "data": {
        "id": str(updated.get("_id")),
        "status": updated.get("status") or "sent",
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
    return {"success": True, "data": {
        "id": str(updated.get("_id")),
        "status": updated.get("status") or "paid",
    }}


@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["owner", "admin", "employer"]:
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
        "created_at": safe_iso(quote.get("created_at")),
        "updated_at": safe_iso(quote.get("updated_at")),
    }



@api_router.patch("/quotes/{quote_id}")
async def update_quote(quote_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in ["owner", "admin", "employer"]:
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

    if current_user.get("role") not in ["owner", "admin", "employer"]:
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

    await db.quotes.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": "sent",
            "sent_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    return {
        "success": True,
        "message": "Quote marked as sent"
    }

@api_router.post("/quotes")
async def create_quote(request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in ["owner", "admin", "employer"]:
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

    return {
        "success": True,
        "id": str(result.inserted_id),
        "message": "Quote created"
    }



@api_router.post("/clients")
async def create_client(request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in ["owner", "admin", "employer"]:
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

    if current_user.get("role") not in ["owner", "admin", "employer"]:
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
    if current_user.get("role") not in ["owner", "admin", "employer"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    name = str((payload or {}).get("name") or "").strip()
    email = str((payload or {}).get("email") or "").strip().lower()
    phone = str((payload or {}).get("phone") or "").strip()

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
        "role": "worker",
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Worker already exists")

    now = datetime.utcnow()
    worker_doc = {
        "name": name,
        "email": email,
        "phone": phone,
        "role": "worker",
        "status": "pending",
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

    try:
        invite_token = str(result.inserted_id)
        invite_link = f"{FRONTEND_URL}/invite/setup/{invite_token}"
        await send_email(
            to_email=email,
            subject="You're invited to join Churvox",
            html_content=f"<p>Hi {name},</p><p>You have been invited to join a team on Churvox.</p><p><a href='{invite_link}'>Finish setup</a></p>"
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": "Worker invited",
        "worker": {
            "id": str(result.inserted_id),
            "name": name,
            "email": email,
            "phone": phone,
            "role": "worker",
            "status": "pending",
            "notes": "",
        }
    }

@api_router.patch("/team/workers/{worker_id}/notes")
async def update_team_worker_notes(worker_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["owner", "admin", "employer"]:
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
    if user_role not in ["owner", "admin", "employer"] and not current_user.get("is_admin") and not current_user.get("is_owner"):
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
        "role": "worker",
        "$or": [
            {"business_id": business_id},
            {"business_id": str(business_id)},
            {"owner_id": owner_id},
        ]
    }

    docs = []
    async for worker in db.business_users.find(query).sort("created_at", -1):
        try:
            docs.append({
                "id": str(worker.get("id") or worker.get("_id") or ""),
                "name": worker.get("name") or "Unnamed Worker",
                "email": worker.get("email") or "",
                "phone": worker.get("phone") or "",
                "country": worker.get("country") or "",
                "region": worker.get("region") or worker.get("state") or "",
                "city": worker.get("city") or "",
                "notes": worker.get("notes") or "",
                "role": worker.get("role", "worker"),
                "status": worker.get("status", "invited"),
                "business_id": str(worker.get("business_id")) if worker.get("business_id") is not None else None,
                "created_at": safe_iso(worker.get("created_at")),
                "updated_at": safe_iso(worker.get("updated_at")),
            })
        except Exception as e:
            print("WORKER_ROW_SKIP", str(worker.get("_id")), str(e))
            continue

    return docs


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
            "business_id": str(job.get("business_id")) if job.get("business_id") is not None else None,
            "created_at": safe_iso(job.get("created_at")),
            "updated_at": safe_iso(job.get("updated_at")),
        }
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

        jobs = []
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
                "price": job.get("price") or 0,
                "pricing_type": job.get("pricing_type") or "fixed",
                "hourly_rate": job.get("hourly_rate") or 0,
                "extras": job.get("extras") or [],
                "notes": job.get("notes") or "",
                "assigned_worker_id": job.get("assigned_worker_id"),
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

    if current_user.get("role") not in ["owner", "admin", "employer"]:
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

    return {
        "success": True,
        "id": str(result.inserted_id),
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
        "role": "worker",
        "$or": [
            {"_id": ObjectId(worker_id)},
            {"id": worker_id},
        ],
        "$and": [{
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
            ]
        }]
    }

    worker = None
    try:
        worker = await db.business_users.find_one(query)
    except Exception:
        query = {
            "role": "worker",
            "id": worker_id,
            "$or": [
                {"business_id": business_id},
                {"business_id": str(business_id)},
                {"owner_id": owner_id},
            ]
        }
        worker = await db.business_users.find_one(query)

    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    delete_query = {"_id": worker.get("_id")}
    await db.business_users.delete_one(delete_query)

    return {"success": True, "message": "Worker removed"}



@api_router.patch("/jobs/{job_id}")
async def update_job(job_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    if current_user.get("role") not in ["owner", "admin", "employer"]:
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
        "status": payload.get("status") or existing.get("status") or "assigned",
        "updated_at": datetime.now(timezone.utc),
    }

    await db.jobs.update_one({"_id": obj_id}, {"$set": update_doc})

    return {"success": True, "message": "Job updated"}

@api_router.post("/jobs/{job_id}/assign")
async def assign_job_worker(job_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["owner", "admin", "employer"]:
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

    if current_role not in ["owner", "admin", "worker"]:
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

        if assigned_worker_email and current_email and assigned_worker_email == current_email:
            worker_match = True

        if not worker_match:
            raise HTTPException(status_code=403, detail="This job is not assigned to you")

    await db.jobs.update_one(
        {"_id": job["_id"]},
        {"$set": {
            "status": "acknowledged",
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
    job = await db.jobs.find_one({"id": job_id})

    if not job:
        try:
            job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        except Exception:
            job = None

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.jobs.update_one(
        {"id": job_id},
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



@api_router.get("/myob/settings")
async def get_myob_settings(current_user: dict = Depends(get_current_user)):
    try:
        business_id = str(
            current_user.get("business_id")
            or current_user.get("businessId")
            or current_user.get("id")
            or current_user.get("_id")
            or current_user.get("user_id")
            or ""
        )
        settings = await db.myob_settings.find_one({"business_id": business_id}) if hasattr(db, "myob_settings") else None
        return {
            "success": True,
            "data": settings or {
                "enabled": False,
                "connected": False,
                "company_name": "",
                "last_sync_at": None,
            }
        }
    except Exception as e:
        print("MYOB_SETTINGS_ERROR", str(e), current_user)
        return {
            "success": True,
            "data": {
                "enabled": False,
                "connected": False,
                "company_name": "",
                "last_sync_at": None,
            }
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

@api_router.post("/sms/send-fixed")
async def send_sms_hard_fix_v1(payload: dict, current_user: dict = Depends(get_current_user)):
    user = current_user
    business_id = str(user.get("business_id") or user.get("id"))
    sms_type = str(payload.get("type") or payload.get("message_type") or "").strip().lower()
    custom_message = str(payload.get("message") or "").strip()

    job = None
    client = None

    job_id = payload.get("job_id")
    client_id = payload.get("client_id")

    if job_id:
        job = await db.jobs.find_one({"id": str(job_id)})
        if not job:
            try:
                job = await db.jobs.find_one({"_id": ObjectId(str(job_id))})
            except Exception:
                job = None

    if client_id:
        client = await db.clients.find_one({"id": str(client_id)})
        if not client:
            try:
                client = await db.clients.find_one({"_id": ObjectId(str(client_id))})
            except Exception:
                client = None

    if not client and isinstance(job, dict):
        linked_client_id = job.get("client_id") or job.get("customer_id")
        if linked_client_id:
            client = await db.clients.find_one({"id": str(linked_client_id)})
            if not client:
                try:
                    client = await db.clients.find_one({"_id": ObjectId(str(linked_client_id))})
                except Exception:
                    client = None

    phone = None

    # 1) explicit phone from payload wins
    for key in ["phone", "phone_number", "mobile", "mobile_number", "client_phone"]:
        value = payload.get(key)
        if value is not None and str(value).strip():
            phone = str(value).strip()
            break

    # 2) fallback to existing helper
    if not phone:
        phone = pick_client_phone(job=job, client=client)

    if not phone:
        raise HTTPException(status_code=400, detail="SMS_FIXED_ROUTE_NO_PHONE")

    # SMS cost locked to 2 credits
    sms_cost = 2

    sms_credits = await db.sms_credits.find_one({"business_id": business_id})
    if not sms_credits:
        raise HTTPException(status_code=400, detail="Not enough SMS credits")

    current_balance = int(
        sms_credits.get("balance", sms_credits.get("credits", 0)) or 0
    )

    if current_balance < sms_cost:
        raise HTTPException(status_code=400, detail="Not enough SMS credits")

    if "balance" in sms_credits:
        await db.sms_credits.update_one(
            {"business_id": business_id},
            {
                "$inc": {"balance": -sms_cost},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        new_balance = current_balance - sms_cost
    else:
        await db.sms_credits.update_one(
            {"business_id": business_id},
            {
                "$inc": {"credits": -sms_cost},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        new_balance = current_balance - sms_cost

    if custom_message:
        sms_message = custom_message
    elif sms_type in ["on_the_way", "on the way", "ontheway"]:
        sms_message = "On the way"
    elif sms_type == "reminder":
        sms_message = "Reminder"
    else:
        sms_message = "Quick SMS"

    await db.sms_log.insert_one({
        "business_id": business_id,
        "job_id": str(job_id) if job_id else None,
        "client_id": str(client_id) if client_id else (str(client.get("id")) if isinstance(client, dict) and client.get("id") else None),
        "phone": phone,
        "message": sms_message,
        "type": sms_type or "quick_sms",
        "cost": sms_cost,
        "created_at": datetime.now(timezone.utc),
        "status": "mock_sent"
    })

    return {
        "success": True,
        "data": {
            "phone": phone,
            "message": sms_message,
            "cost": sms_cost,
            "balance": new_balance
        }
    }
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

def build_billing_status(owner: dict):
    now = utc_now()
    trial_started_at = to_utc_dt(owner.get("trial_started_at"))
    trial_ends_at = to_utc_dt(owner.get("trial_ends_at"))
    subscription_status = str(owner.get("subscription_status") or owner.get("plan_status") or "").lower()
    stripe_subscription_id = owner.get("stripe_subscription_id")
    plan = str(normalize_plan(owner.get("plan") or "solo")).lower()

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

    if current_user.get("role") not in ["owner", "admin", "employer"]:
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

            await db.business_users.insert_one(worker_doc)
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

    if current_user.get("role") not in ["owner", "admin", "employer"]:
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
    selected_plan = normalize_plan(metadata.get("plan") or metadata.get("selected_plan") or current_user.get("plan", "solo"))

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
    if current_user.get("role") not in ["owner", "admin", "employer"]:
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




APP_BASE_URL = os.getenv("APP_BASE_URL", "https://www.churvox.com").rstrip("/")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@send.churvox.com").strip()

def send_resend_email(to_email: str, subject: str, html: str, text_content: str = ""):
    if not RESEND_API_KEY:
        print("RESEND_API_KEY missing - email not sent")
        return False

    payload = {
        "from": EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    if text_content:
        payload["text"] = text_content

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
        with urllib.request.urlopen(req, timeout=20) as response:
            body = response.read().decode("utf-8", errors="ignore")
            print("RESEND SEND OK:", response.status, body)
            return True
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="ignore")
        print("RESEND SEND FAILED:", e.code, err)
        return False
    except Exception as e:
        print("RESEND SEND ERROR:", str(e))
        return False

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
