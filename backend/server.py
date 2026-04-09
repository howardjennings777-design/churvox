import os
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
from owner_bootstrap import ensure_owner_account
from fastapi.responses import HTMLResponse
from starlette.middleware.cors import CORSMiddleware
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
from email_provider import get_email_provider, build_invite_email, build_resend_invite_email, build_password_reset_email

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.churvox.com",
        "https://churvox.com",
        "https://grassley-frontend.onrender.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





app.add_middleware(GZipMiddleware, minimum_size=1000)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.churvox.com").rstrip("/")


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
        "plan": user_doc.get("plan", "solo"),
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
    user_obj_id = ObjectId(user_id)
    user_doc = await db.users.find_one({"_id": user_obj_id})
    if not user_doc:
        return

    business_id = user_doc.get("business_id", user_obj_id)
    if isinstance(business_id, str):
        business_id = ObjectId(business_id)

    await db.users.update_one(
        {"_id": business_id},
        {"$set": {
            "plan_status": "paid",
            "subscription_status": "active",

            "plan": plan,
            "stripe_customer_id": stripe_customer_id,
            "stripe_subscription_id": stripe_subscription_id,
        }}
    )

    await db.users.update_many(
        {"business_id": business_id, "role": "worker"},
        {"$set": {"plan": plan}}
    )


# ===================== STRIPE ENDPOINTS =====================
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
    success_url = f"{FRONTEND_URL}/plans?checkout=success&plan={plan}"
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

        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            customer_email=email,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "plan": plan,
            },
        )

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
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.update_one(
    {"email": "howardjennings77@gmail.com"},
    {"$set": {
        "email": "howardjennings77@gmail.com",
        "username": "howardjennings77@gmail.com",
        "is_active": True,
        "email_verified": True,
        "is_verified": True,
        "role": "owner",
        "roles": ["owner", "admin", "super_admin", "app_owner"],
        "is_owner": True,
        "is_admin": True
    }},
    upsert=True
)
    if existing is None:
        result = await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "business_name": "Churvox Admin",
            "role": "employer",
            "status": "active",
            "plan": "pro",
            "gst_rate": DEFAULT_GST_RATE,
            "created_at": datetime.now(timezone.utc)
        })
        # Set business_id to own id
        await db.users.update_one(
            {"_id": result.inserted_id},
            {"$set": {"business_id": result.inserted_id}}
        )
    try:
        await db.jobs.create_index([("business_id", 1), ("scheduled_date", 1)])
        await db.jobs.create_index([("recurring_parent_job_id", 1), ("scheduled_date", 1)])
        await db.jobs.create_index([("is_recurring", 1), ("status", 1)])
    except Exception:
        pass

        logger.info(f"Admin user created: {admin_email}")
    else:
        updates = {}
        if not verify_password(admin_password, existing["password_hash"]):
            updates["password_hash"] = hash_password(admin_password)
        if "business_id" not in existing:
            updates["business_id"] = existing["_id"]
        if existing.get("role") not in ("employer", "admin"):
            updates["role"] = "employer"
        if updates:
            await db.users.update_one({"_id": existing["_id"]}, {"$set": updates})
            logger.info("Admin user updated")

    # Migrate existing jobs with old statuses
    await db.jobs.update_many(
        {"status": {"$in": ["scheduled", "cancelled"]}},
        {"$set": {"status": JobStatus.ASSIGNED}}
    )

    # Migrate existing invoices without MYOB fields
    await db.invoices.update_many(
        {"myob_sync_status": {"$exists": False}},
        {"$set": {"myob_sync_status": MyobSyncStatus.NOT_SYNCED, "myob_id": None, "myob_last_sync": None, "myob_error": None}}
    )

    # Migrate legacy solo_plus plan to solo
    await db.users.update_many({"plan": "solo_plus"}, {"$set": {"plan": "solo"}})

    # Write test credentials
    os.makedirs("/tmp/memory", exist_ok=True)
    with open("/tmp/memory/test_credentials.md", "w") as f:
        f.write(f"""# Churvox Test Credentials

## Admin Account (Employer)
- Email: {admin_email}
- Password: {admin_password}
- Role: employer

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

## Team Endpoints
- POST /api/team/workers (create worker)
- GET /api/team/workers (list workers)
- DELETE /api/team/workers/{{id}} (remove worker)

## Job Workflow
- POST /api/jobs (create, assign worker)
- POST /api/jobs/{{id}}/assign (assign worker)
- POST /api/jobs/{{id}}/acknowledge (worker acknowledges)
- POST /api/jobs/{{id}}/start (start job)
- POST /api/jobs/{{id}}/complete (complete job)
""")
    logger.info("Test credentials written")

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
# @api_router.get("/clients")
# async def get_clients(current_user: dict = Depends(get_current_user), current_user: dict = Depends(get_current_user)):
#     business_id = await get_user_business_id(current_user)
#     clients = await list_in_business(db.clients, business_id, sort=[("created_at", -1)])
#     return safe_docs(clients)

# Example secure get-one pattern:
# @api_router.get("/clients/{client_id}")
# async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
#     business_id = await get_user_business_id(current_user)
#     client = await find_one_in_business(
#         db.clients,
#         business_id,
#         {"_id": ObjectId(client_id)}
#     )
#     return safe_doc(client)

# Example secure create pattern:
# @api_router.post("/clients")
# async def create_client(payload: dict, current_user: dict = Depends(get_current_user)):
#     business_id = await get_user_business_id(current_user)
#     data = force_business_on_payload(dict(payload), business_id)
#     await db.clients.insert_one(data)
#     return {"success": True}

# Example secure update pattern:
# @api_router.put("/clients/{client_id}")
# async def update_client(client_id: str, current_user: dict = Depends(get_current_user), payload: dict, current_user: dict = Depends(get_current_user)):
#     business_id = await get_user_business_id(current_user)
#     payload = dict(payload)
#     payload.pop("business_id", None)
#     await update_one_in_business(
#         db.clients,
#         business_id,
#         {"_id": ObjectId(client_id)},
#         payload
#     )
#     return {"success": True}

# Example secure delete pattern:
# @api_router.delete("/clients/{client_id}")
# async def delete_client(client_id: str, current_user: dict = Depends(get_current_user), current_user: dict = Depends(get_current_user)):
#     business_id = await get_user_business_id(current_user)
#     await delete_one_in_business(
#         db.clients,
#         business_id,
#         {"_id": ObjectId(client_id)}
#     )
#     return {"success": True}


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
    email = "hello@churvox.com"

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
    plan = str(owner.get("plan") or "solo").lower()

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


app.include_router(api_router)


@app.get("/api/admin/platform-stats")
async def app_platform_stats(current_user: dict = Depends(get_current_user)):
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


