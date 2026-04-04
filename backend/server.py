from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
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
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_change_me')
JWT_ALGORITHM = "HS256"
DEFAULT_GST_RATE = float(os.environ.get('DEFAULT_GST_RATE', '15'))

# Stripe Config
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_SOLO = os.environ.get("STRIPE_PRICE_SOLO", "")
STRIPE_PRICE_TEAM = os.environ.get("STRIPE_PRICE_TEAM", "")
STRIPE_PRICE_PRO = os.environ.get("STRIPE_PRICE_PRO", "")
STRIPE_PRICE_ENTERPRISE = os.environ.get("STRIPE_PRICE_ENTERPRISE", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

stripe.api_key = STRIPE_SECRET_KEY

# Create the main app
app = FastAPI(title="Churvox API")


FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.churvox.com").rstrip("/")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "https://www.churvox.com",
        "https://churvox.com",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        "price": 30, "max_workers": 0, "max_clients": 50,
        "sms": False, "myob": False, "team": False,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
    },
    "team": {
        "price": 70, "max_workers": 5, "max_clients": -1,
        "sms": True, "myob": False, "team": True,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
    },
    "pro": {
        "price": 110, "max_workers": 20, "max_clients": -1,
        "sms": True, "myob": True, "team": True,
        "quotes": True, "invoices": True, "time_tracking": True, "scheduling": True,
    },
    "enterprise": {
        "price": 240, "max_workers": 50, "max_clients": -1,
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

# ===================== HELPERS =====================
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

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
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

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
            "plan": plan,
            "stripe_customer_id": stripe_customer_id,
            "stripe_subscription_id": stripe_subscription_id,
        }}
    )

    await db.users.update_many(
        {"business_id": business_id, "role": "worker"},
        {"$set": {"plan": plan}}
    )

# ===================== AUTH ENDPOINTS =====================
@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "email": email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "business_name": user_data.business_name,
        "role": "employer",
        "status": "active",
        "plan": "solo",
        "gst_rate": DEFAULT_GST_RATE,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Set business_id = own id for employers
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
        if lockout_time and datetime.now(timezone.utc) < lockout_time:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
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
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
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
    await db.password_reset_tokens.insert_one({
        "token": token, "user_id": user["_id"],
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1), "used": False
    })
    logger.info(f"Reset token for {email}: {token}")
    return {"message": "If the email exists, a reset link has been sent", "debug_token": token}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPassword):
    token_doc = await db.password_reset_tokens.find_one({
        "token": data.token, "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    await db.users.update_one(
        {"_id": token_doc["user_id"]},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    await db.password_reset_tokens.update_one(
        {"_id": token_doc["_id"]}, {"$set": {"used": True}}
    )
    return {"message": "Password reset successfully"}

# ===================== USER SETTINGS =====================
@api_router.patch("/user/plan")
async def update_plan(data: PlanUpdate, request: Request):
    user = await require_employer(request)
    biz_id = ObjectId(user["business_id"])

    # Additional user blocks for enterprise
    extra_blocks = 0
    if data.plan == PlanType.ENTERPRISE:
        # Count current team to see if extra blocks needed
        team_count = await db.users.count_documents({"business_id": biz_id, "role": "worker"})
        base_limit = PLAN_LIMITS["enterprise"]["max_workers"]
        if team_count > base_limit:
            extra_blocks = (team_count - base_limit + 49) // 50  # ceil division

    # Update plan on the employer (business owner) record
    update = {"plan": data.plan}
    if data.plan == PlanType.ENTERPRISE:
        update["extra_user_blocks"] = extra_blocks
    else:
        update["extra_user_blocks"] = 0

    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    # Also update plan on all workers in this business
    await db.users.update_many({"business_id": biz_id, "role": "worker"}, {"$set": {"plan": data.plan}})

    limits = PLAN_LIMITS.get(data.plan, PLAN_LIMITS["solo"])
    return {"message": "Plan updated", "plan": data.plan, "limits": limits}

@api_router.get("/plan/limits")
async def get_plan_limits(request: Request):
    user = await get_current_user(request)
    plan = user.get("plan", "solo")
    # Normalize legacy plans
    if plan not in PLAN_LIMITS:
        plan = "solo"
    limits = PLAN_LIMITS[plan]
    biz_id = ObjectId(user["business_id"])

    # Get actual usage
    team_count = await db.users.count_documents({"business_id": biz_id, "role": "worker"})
    client_count = await db.clients.count_documents({"contractor_id": biz_id})

    # Extra user blocks
    employer_doc = await db.users.find_one({"_id": biz_id})
    extra_blocks = 0
    if employer_doc:
        extra_blocks = employer_doc.get("extra_user_blocks", 0)
    else:
        employer_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
        extra_blocks = employer_doc.get("extra_user_blocks", 0) if employer_doc else 0

    max_workers = limits["max_workers"]
    if plan == "enterprise":
        max_workers += extra_blocks * 50

    return {
        "plan": plan,
        "limits": limits,
        "usage": {
            "workers": team_count,
            "clients": client_count,
        },
        "max_workers": max_workers,
        "extra_user_blocks": extra_blocks,
        "extra_block_price": 100,
    }

@api_router.get("/plan/all")
async def get_all_plans():
    return {plan_id: {**info, "id": plan_id} for plan_id, info in PLAN_LIMITS.items()}

@api_router.patch("/user/gst")
async def update_gst(data: GSTUpdate, request: Request):
    user = await get_current_user(request)
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"gst_rate": data.gst_rate}})
    return {"message": "GST rate updated", "gst_rate": data.gst_rate}

@api_router.patch("/user/trade")
async def update_trade(data: TradeUpdate, request: Request):
    user = await get_current_user(request)
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"trade_type": data.trade_type}})
    return {"message": "Trade type updated", "trade_type": data.trade_type}

# ===================== TEAM / WORKERS =====================
async def check_team_limits(user):
    """Check plan-based team limits. Returns (biz_id, max_workers) or raises HTTPException."""
    biz_id = ObjectId(user["business_id"])
    plan = user.get("plan", "solo")
    if plan not in PLAN_LIMITS:
        plan = "solo"
    limits = PLAN_LIMITS[plan]
    if not limits.get("team"):
        raise HTTPException(status_code=403, detail="Your plan does not include team management. Upgrade to Team or higher.")
    team_count = await db.users.count_documents({"business_id": biz_id, "role": "worker"})
    max_workers = limits["max_workers"]
    if plan == "enterprise":
        employer_doc = await db.users.find_one({"_id": biz_id})
        if not employer_doc:
            employer_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
        extra_blocks = employer_doc.get("extra_user_blocks", 0) if employer_doc else 0
        max_workers += extra_blocks * 50
    if max_workers >= 0 and team_count >= max_workers:
        raise HTTPException(status_code=403, detail=f"Team limit reached ({max_workers} workers). Upgrade your plan for more team members.")
    return biz_id

async def create_invite_for_worker(email: str, name: str, phone: str, user: dict, biz_id: ObjectId):
    """Create a worker user with invited status and generate invite token."""
    invite_token = secrets.token_urlsafe(32)
    worker_doc = {
        "email": email,
        "password_hash": hash_password(secrets.token_urlsafe(32)),
        "name": name,
        "phone": phone,
        "role": "worker",
        "status": "invited",
        "business_id": biz_id,
        "plan": user.get("plan", "solo"),
        "gst_rate": user.get("gst_rate", DEFAULT_GST_RATE),
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(worker_doc)
    worker_id = str(result.inserted_id)

    # Store invite token
    await db.invite_tokens.insert_one({
        "token": invite_token,
        "user_id": result.inserted_id,
        "business_id": biz_id,
        "email": email,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "used": False,
        "created_at": datetime.now(timezone.utc)
    })

    # Get business name for email
    employer_doc = await db.users.find_one({"_id": biz_id})
    business_name = employer_doc.get("business_name", "your employer") if employer_doc else "your employer"
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    invite_link = f"{frontend_url}/invite/setup/{invite_token}"

    # Send real invite email via Resend
    email_content = build_invite_email(name, business_name, invite_link)
    email_result = await email_provider.send(
        to=email,
        subject=email_content["subject"],
        html=email_content["html"],
    )

    await db.invite_emails.insert_one({
        "to": email,
        "subject": email_content["subject"],
        "invite_link": invite_link,
        "business_id": biz_id,
        "worker_id": result.inserted_id,
        "status": "sent" if email_result.success else "failed",
        "provider": email_result.provider,
        "email_id": email_result.email_id,
        "error": email_result.error,
        "created_at": datetime.now(timezone.utc)
    })

    if not email_result.success:
        logger.warning(f"[Email] Invite email to {email} failed: {email_result.error} — invite link still valid")

    return {
        "id": worker_id,
        "name": name,
        "email": email,
        "phone": phone,
        "role": "worker",
        "status": "invited",
        "invite_link": invite_link,
        "created_at": worker_doc["created_at"].isoformat()
    }

@api_router.post("/team/workers")
async def create_worker(worker_data: WorkerCreate, request: Request):
    user = await require_employer(request)
    biz_id = await check_team_limits(user)

    email = worker_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    result = await create_invite_for_worker(email, worker_data.name, worker_data.phone, user, biz_id)
    return result

@api_router.get("/team/workers")
async def get_workers(request: Request):
    user = await require_employer(request)
    workers = await db.users.find(
        {"business_id": ObjectId(user["business_id"]), "role": "worker"},
        {"_id": 1, "name": 1, "email": 1, "phone": 1, "role": 1, "status": 1, "created_at": 1}
    ).to_list(1000)
    return [serialize_doc(w) for w in workers]

@api_router.delete("/team/workers/{worker_id}")
async def delete_worker(worker_id: str, request: Request):
    user = await require_employer(request)
    result = await db.users.delete_one({
        "_id": ObjectId(worker_id),
        "business_id": ObjectId(user["business_id"]),
        "role": "worker"
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Worker not found")
    # Clean up invite tokens for this worker
    await db.invite_tokens.delete_many({"user_id": ObjectId(worker_id)})
    return {"message": "Worker removed"}

# ===================== INVITE ENDPOINTS =====================
@api_router.get("/invite/verify/{token}")
async def verify_invite(token: str):
    """Public endpoint - verify invite token validity."""
    token_doc = await db.invite_tokens.find_one({
        "token": token, "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired invite link")

    user_doc = await db.users.find_one({"_id": token_doc["user_id"]})
    if not user_doc:
        raise HTTPException(status_code=400, detail="User account not found")

    employer_doc = await db.users.find_one({"_id": token_doc["business_id"]})
    business_name = employer_doc.get("business_name", "Unknown Business") if employer_doc else "Unknown Business"

    return {
        "valid": True,
        "email": user_doc["email"],
        "name": user_doc["name"],
        "business_name": business_name,
    }

@api_router.post("/invite/accept")
async def accept_invite(data: InviteAccept):
    """Public endpoint - accept invite and set password."""
    token_doc = await db.invite_tokens.find_one({
        "token": data.token, "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired invite link")

    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    update_fields = {
        "password_hash": hash_password(data.password),
        "status": "active",
    }
    if data.name:
        update_fields["name"] = data.name

    await db.users.update_one(
        {"_id": token_doc["user_id"]},
        {"$set": update_fields}
    )
    await db.invite_tokens.update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"used": True}}
    )

    user_doc = await db.users.find_one({"_id": token_doc["user_id"]})
    return {
        "message": "Account set up successfully. You can now sign in.",
        "email": user_doc["email"],
        "name": user_doc["name"],
    }

@api_router.post("/team/resend-invite/{worker_id}")
async def resend_invite(worker_id: str, request: Request):
    """Resend invite email to an invited worker."""
    user = await require_employer(request)
    biz_id = ObjectId(user["business_id"])

    worker = await db.users.find_one({
        "_id": ObjectId(worker_id), "business_id": biz_id, "role": "worker"
    })
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    if worker.get("status") != "invited":
        raise HTTPException(status_code=400, detail="Worker has already accepted the invite")

    # Invalidate old tokens
    await db.invite_tokens.update_many(
        {"user_id": ObjectId(worker_id)},
        {"$set": {"used": True}}
    )

    # Create new token
    invite_token = secrets.token_urlsafe(32)
    await db.invite_tokens.insert_one({
        "token": invite_token,
        "user_id": ObjectId(worker_id),
        "business_id": biz_id,
        "email": worker["email"],
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "used": False,
        "created_at": datetime.now(timezone.utc)
    })

    employer_doc = await db.users.find_one({"_id": biz_id})
    business_name = employer_doc.get("business_name", "your employer") if employer_doc else "your employer"
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    invite_link = f"{frontend_url}/invite/setup/{invite_token}"

    # Send real reminder email via Resend
    email_content = build_resend_invite_email(worker["name"], business_name, invite_link)
    email_result = await email_provider.send(
        to=worker["email"],
        subject=email_content["subject"],
        html=email_content["html"],
    )

    await db.invite_emails.insert_one({
        "to": worker["email"],
        "subject": email_content["subject"],
        "invite_link": invite_link,
        "business_id": biz_id,
        "worker_id": ObjectId(worker_id),
        "status": "sent" if email_result.success else "failed",
        "provider": email_result.provider,
        "email_id": email_result.email_id,
        "error": email_result.error,
        "created_at": datetime.now(timezone.utc)
    })

    return {"message": f"Invite resent to {worker['email']}", "invite_link": invite_link}

@api_router.post("/team/import-csv")
async def import_csv_workers(request: Request):
    """Import workers from CSV. Expects multipart form data with a 'file' field.
    CSV format: name,email,phone (header row optional)."""
    user = await require_employer(request)
    biz_id = await check_team_limits(user)

    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    import csv
    import io
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    # Skip header if it looks like one
    start = 0
    if rows[0] and rows[0][0].lower().strip() in ("name", "full name", "employee name"):
        start = 1

    results = []
    for i, row in enumerate(rows[start:], start=start + 1):
        if len(row) < 2:
            results.append({"row": i, "status": "skipped", "reason": "Missing name or email"})
            continue

        name = row[0].strip()
        email = row[1].strip().lower()
        phone = row[2].strip() if len(row) > 2 else None

        if not name or not email:
            results.append({"row": i, "status": "skipped", "reason": "Empty name or email"})
            continue

        # Basic email validation
        if "@" not in email or "." not in email:
            results.append({"row": i, "status": "skipped", "reason": f"Invalid email: {email}"})
            continue

        # Check existing
        existing = await db.users.find_one({"email": email})
        if existing:
            results.append({"row": i, "status": "skipped", "reason": f"Email already registered: {email}"})
            continue

        # Check team limit
        team_count = await db.users.count_documents({"business_id": biz_id, "role": "worker"})
        plan = user.get("plan", "solo")
        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["solo"])
        max_workers = limits["max_workers"]
        if plan == "enterprise":
            emp_doc = await db.users.find_one({"_id": biz_id})
            extra_blocks = emp_doc.get("extra_user_blocks", 0) if emp_doc else 0
            max_workers += extra_blocks * 50
        if max_workers >= 0 and team_count >= max_workers:
            results.append({"row": i, "status": "skipped", "reason": "Team limit reached"})
            continue

        try:
            invite_result = await create_invite_for_worker(email, name, phone, user, biz_id)
            results.append({"row": i, "status": "invited", "email": email, "name": name})
        except Exception as e:
            results.append({"row": i, "status": "error", "reason": str(e)})

    invited = sum(1 for r in results if r["status"] == "invited")
    skipped = sum(1 for r in results if r["status"] in ("skipped", "error"))

    return {
        "message": f"{invited} worker(s) invited, {skipped} skipped",
        "total": len(results),
        "invited": invited,
        "skipped": skipped,
        "details": results
    }


# ===================== EMAIL TEST =====================
class EmailTestSend(BaseModel):
    to: EmailStr
    subject: Optional[str] = "Churvox Test Email"
    message: Optional[str] = "This is a test email from Churvox to confirm email delivery is working."

@api_router.post("/email/test")
async def send_test_email(data: EmailTestSend, request: Request):
    """Send a test email to confirm Resend integration works."""
    await require_employer(request)
    from email_provider import _base_wrapper, TEXT_COLOR
    html = _base_wrapper(f"""
<p style="margin:0 0 12px;font-size:15px;color:{TEXT_COLOR};">Test Email</p>
<p style="margin:0;font-size:15px;color:{TEXT_COLOR};">{data.message}</p>""")
    result = await email_provider.send(to=data.to, subject=data.subject, html=html)
    return {
        "success": result.success,
        "email_id": result.email_id,
        "provider": result.provider,
        "error": result.error,
    }

# ===================== CLIENTS =====================
@api_router.post("/clients")
async def create_client(client_data: ClientCreate, request: Request):
    user = await get_current_user(request)
    biz_id = ObjectId(user["business_id"])

    # Plan-based client limit check
    plan = user.get("plan", "solo")
    if plan not in PLAN_LIMITS:
        plan = "solo"
    max_clients = PLAN_LIMITS[plan]["max_clients"]
    if max_clients > 0:
        client_count = await db.clients.count_documents({"contractor_id": biz_id})
        if client_count >= max_clients:
            raise HTTPException(status_code=403, detail=f"Client limit reached ({max_clients}). Upgrade your plan for unlimited clients.")

    client_doc = {
        **client_data.model_dump(),
        "contractor_id": biz_id,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.clients.insert_one(client_doc)
    client_doc["id"] = str(result.inserted_id)
    client_doc["contractor_id"] = user["business_id"]
    client_doc.pop("_id", None)
    return client_doc

@api_router.get("/clients")
async def get_clients(request: Request):
    user = await get_current_user(request)
    clients = await db.clients.find(
        {"contractor_id": ObjectId(user["business_id"])},
        {"_id": 1, "name": 1, "email": 1, "phone": 1, "address": 1, "notes": 1, "created_at": 1}
    ).to_list(1000)
    return [serialize_doc(c) for c in clients]

@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, request: Request):
    user = await get_current_user(request)
    client = await db.clients.find_one({
        "_id": ObjectId(client_id),
        "contractor_id": ObjectId(user["business_id"])
    })
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return serialize_doc(client)

@api_router.patch("/clients/{client_id}")
async def update_client(client_id: str, client_data: ClientUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in client_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.clients.update_one(
        {"_id": ObjectId(client_id), "contractor_id": ObjectId(user["business_id"])},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    client = await db.clients.find_one({"_id": ObjectId(client_id)})
    return serialize_doc(client)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.clients.delete_one({
        "_id": ObjectId(client_id),
        "contractor_id": ObjectId(user["business_id"])
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted"}

@api_router.get("/clients/{client_id}/jobs")
async def get_client_jobs(client_id: str, request: Request):
    user = await get_current_user(request)
    # Verify client belongs to business
    client = await db.clients.find_one({
        "_id": ObjectId(client_id),
        "contractor_id": ObjectId(user["business_id"])
    })
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    jobs = await db.jobs.find(
        {"contractor_id": ObjectId(user["business_id"]), "client_id": ObjectId(client_id)}
    ).sort("scheduled_date", -1).to_list(100)
    return [serialize_doc(j) for j in jobs]

# ===================== JOBS =====================
@api_router.post("/jobs")
async def create_job(job_data: JobCreate, request: Request):
    user = await get_current_user(request)
    # Only employers can create jobs
    if user.get("role") not in ("employer", "admin"):
        raise HTTPException(status_code=403, detail="Only employers can create jobs")

    job_doc = {
        **job_data.model_dump(exclude={"assigned_worker_id", "client_id"}),
        "contractor_id": ObjectId(user["business_id"]),
        "created_by": ObjectId(user["id"]),
        "status": JobStatus.ASSIGNED,
        "assigned_worker_id": None,
        "assigned_worker_name": None,
        "acknowledged_at": None,
        "started_at": None,
        "completed_at": None,
        "photos": [],
        "time_entries": [],
        "total_time_seconds": 0,
        "timer_running": False,
        "created_at": datetime.now(timezone.utc)
    }

    # Auto-generate title if not provided
    if not job_doc.get("title"):
        job_type_label = job_data.job_type.value.replace("_", " ").title()
        client_name = job_data.customer_name or "No Client"
        job_doc["title"] = f"{job_type_label} - {client_name}"

    if job_data.client_id:
        job_doc["client_id"] = ObjectId(job_data.client_id)
    else:
        job_doc["client_id"] = None

    # Assign worker if provided
    if job_data.assigned_worker_id:
        worker = await db.users.find_one({
            "_id": ObjectId(job_data.assigned_worker_id),
            "business_id": ObjectId(user["business_id"]),
            "role": "worker"
        })
        if not worker:
            raise HTTPException(status_code=400, detail="Worker not found in your team")
        job_doc["assigned_worker_id"] = ObjectId(job_data.assigned_worker_id)
        job_doc["assigned_worker_name"] = worker["name"]

    result = await db.jobs.insert_one(job_doc)
    job_doc["id"] = str(result.inserted_id)
    job_doc["contractor_id"] = user["business_id"]
    job_doc["created_by"] = user["id"]
    if job_data.client_id:
        job_doc["client_id"] = job_data.client_id
    if job_data.assigned_worker_id:
        job_doc["assigned_worker_id"] = job_data.assigned_worker_id
    job_doc.pop("_id", None)
    return job_doc

@api_router.get("/jobs")
async def get_jobs(request: Request, status: Optional[str] = None, date: Optional[str] = None):
    user = await get_current_user(request)
    query = {"contractor_id": ObjectId(user["business_id"])}

    # Workers only see their assigned jobs
    if user.get("role") == "worker":
        query["assigned_worker_id"] = ObjectId(user["id"])

    if status:
        query["status"] = status
    if date:
        date_obj = datetime.fromisoformat(date.replace('Z', '+00:00'))
        start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        query["scheduled_date"] = {"$gte": start_of_day, "$lt": end_of_day}

    jobs = await db.jobs.find(query).sort("scheduled_date", 1).to_list(1000)
    return [serialize_doc(j) for j in jobs]

@api_router.get("/jobs/today")
async def get_jobs_today(request: Request):
    user = await get_current_user(request)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    query = {
        "contractor_id": ObjectId(user["business_id"]),
        "scheduled_date": {"$gte": today, "$lt": tomorrow}
    }
    if user.get("role") == "worker":
        query["assigned_worker_id"] = ObjectId(user["id"])
    jobs = await db.jobs.find(query).sort("scheduled_date", 1).to_list(100)
    return [serialize_doc(j) for j in jobs]

@api_router.get("/jobs/week")
async def get_jobs_this_week(request: Request):
    user = await get_current_user(request)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = today + timedelta(days=7)
    query = {
        "contractor_id": ObjectId(user["business_id"]),
        "scheduled_date": {"$gte": today, "$lt": week_end}
    }
    if user.get("role") == "worker":
        query["assigned_worker_id"] = ObjectId(user["id"])
    jobs = await db.jobs.find(query).sort("scheduled_date", 1).to_list(100)
    return [serialize_doc(j) for j in jobs]

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str, request: Request):
    user = await get_current_user(request)
    query = {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["business_id"])}
    if user.get("role") == "worker":
        query["assigned_worker_id"] = ObjectId(user["id"])
    job = await db.jobs.find_one(query)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return serialize_doc(job)

@api_router.patch("/jobs/{job_id}")
async def update_job(job_id: str, job_data: JobUpdate, request: Request):
    user = await get_current_user(request)
    if user.get("role") not in ("employer", "admin"):
        raise HTTPException(status_code=403, detail="Only employers can edit jobs")
    update_data = {k: v for k, v in job_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    if "client_id" in update_data and update_data["client_id"]:
        update_data["client_id"] = ObjectId(update_data["client_id"])
    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["business_id"])},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    return serialize_doc(job)

@api_router.post("/jobs/{job_id}/assign")
async def assign_job(job_id: str, data: JobAssign, request: Request):
    user = await require_employer(request)
    worker = await db.users.find_one({
        "_id": ObjectId(data.worker_id),
        "business_id": ObjectId(user["business_id"]),
        "role": "worker"
    })
    if not worker:
        raise HTTPException(status_code=400, detail="Worker not found in your team")

    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["business_id"])},
        {"$set": {
            "assigned_worker_id": ObjectId(data.worker_id),
            "assigned_worker_name": worker["name"],
            "status": JobStatus.ASSIGNED
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    return serialize_doc(job)

@api_router.post("/jobs/{job_id}/acknowledge")
async def acknowledge_job(job_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") not in ("worker",):
        raise HTTPException(status_code=403, detail="Only workers can acknowledge jobs")
    result = await db.jobs.update_one(
        {
            "_id": ObjectId(job_id),
            "contractor_id": ObjectId(user["business_id"]),
            "assigned_worker_id": ObjectId(user["id"]),
            "status": JobStatus.ASSIGNED
        },
        {"$set": {"status": JobStatus.ACKNOWLEDGED, "acknowledged_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found or not assigned to you")
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    return serialize_doc(job)

@api_router.post("/jobs/{job_id}/start")
async def start_job(job_id: str, request: Request):
    user = await get_current_user(request)
    query = {
        "_id": ObjectId(job_id),
        "contractor_id": ObjectId(user["business_id"]),
        "status": {"$in": [JobStatus.ASSIGNED, JobStatus.ACKNOWLEDGED]}
    }
    if user.get("role") == "worker":
        query["assigned_worker_id"] = ObjectId(user["id"])

    result = await db.jobs.update_one(
        query,
        {"$set": {"status": JobStatus.IN_PROGRESS, "started_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found or cannot be started")
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    return serialize_doc(job)

@api_router.post("/jobs/{job_id}/complete")
async def complete_job(job_id: str, request: Request):
    user = await get_current_user(request)
    query = {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["business_id"])}
    if user.get("role") == "worker":
        query["assigned_worker_id"] = ObjectId(user["id"])

    job = await db.jobs.find_one(query)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] == JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job already completed")

    now = datetime.now(timezone.utc)
    # Stop timer if running
    timer_updates = {"status": JobStatus.COMPLETED, "completed_at": now, "timer_running": False}
    if job.get("timer_running"):
        entry = {"action": "pause", "timestamp": now}
        elapsed = compute_elapsed(job.get("time_entries", []) + [entry])
        timer_updates["total_time_seconds"] = elapsed
        await db.jobs.update_one({"_id": ObjectId(job_id)}, {"$push": {"time_entries": entry}})
    
    await db.jobs.update_one({"_id": ObjectId(job_id)}, {"$set": timer_updates})

    # Re-read job with final time
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    total_time = job.get("total_time_seconds", 0)

    # Auto-create draft invoice with pricing-type logic
    user_doc = await db.users.find_one({"_id": ObjectId(user["business_id"])})
    if not user_doc:
        user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    gst_rate = user_doc.get("gst_rate", DEFAULT_GST_RATE) if user_doc else DEFAULT_GST_RATE

    pricing_type = job.get("pricing_type", "fixed")
    hourly_rate = job.get("hourly_rate", 0)
    extras = job.get("extras") or []
    extras_total = sum(float(e.get("amount", 0)) for e in extras)
    hours_worked = total_time / 3600 if total_time > 0 else 0

    if pricing_type == "fixed":
        subtotal = job.get("price", 0)
    elif pricing_type == "hourly":
        subtotal = round(hours_worked * hourly_rate, 2)
    elif pricing_type == "fixed_extras":
        subtotal = job.get("price", 0) + extras_total
    elif pricing_type == "hourly_extras":
        subtotal = round(hours_worked * hourly_rate, 2) + extras_total
    else:
        subtotal = job.get("price", 0)

    gst_amount = round(subtotal * (gst_rate / 100), 2)
    total = round(subtotal + gst_amount, 2)

    customer_name = job.get("customer_name", "")
    if job.get("client_id"):
        client_doc = await db.clients.find_one({"_id": job["client_id"]})
        if client_doc:
            customer_name = client_doc.get("name", customer_name)

    # Build description line items
    desc_parts = [f"{job.get('title', 'Service')} - {job.get('job_type', 'other').replace('_',' ')}"]
    if pricing_type in ("hourly", "hourly_extras") and hours_worked > 0:
        desc_parts.append(f"{hours_worked:.2f}h @ ${hourly_rate}/hr")
    if extras:
        for ex in extras:
            desc_parts.append(f"{ex.get('description', 'Extra')}: ${float(ex.get('amount', 0)):.2f}")

    invoice_doc = {
        "job_id": ObjectId(job_id),
        "contractor_id": ObjectId(user["business_id"]),
        "client_id": job.get("client_id"),
        "customer_name": customer_name,
        "address": job.get("address", ""),
        "description": "\n".join(desc_parts),
        "pricing_type": pricing_type,
        "hours_worked": round(hours_worked, 2),
        "hourly_rate": hourly_rate,
        "extras": extras,
        "subtotal": subtotal, "gst_rate": gst_rate, "gst_amount": gst_amount, "total": total,
        "status": InvoiceStatus.DRAFT,
        "invoice_number": f"INV-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}",
        "created_at": datetime.now(timezone.utc)
    }
    await db.invoices.insert_one(invoice_doc)

    updated_job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    return serialize_doc(updated_job)

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") not in ("employer", "admin"):
        raise HTTPException(status_code=403, detail="Only employers can delete jobs")
    result = await db.jobs.delete_one({
        "_id": ObjectId(job_id), "contractor_id": ObjectId(user["business_id"])
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted"}

# ===================== TIME TRACKING =====================
def compute_elapsed(time_entries):
    """Compute total elapsed seconds from time entries."""
    total = 0
    last_start = None
    for entry in time_entries:
        ts = entry.get("timestamp")
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        if ts and ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        action = entry.get("action")
        if action in ("start", "resume"):
            last_start = ts
        elif action == "pause" and last_start:
            total += (ts - last_start).total_seconds()
            last_start = None
    if last_start:
        total += (datetime.now(timezone.utc) - last_start).total_seconds()
    return int(total)

@api_router.post("/jobs/{job_id}/timer/start")
async def timer_start(job_id: str, request: Request):
    user = await get_current_user(request)
    query = {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["business_id"])}
    if user.get("role") == "worker":
        query["assigned_worker_id"] = ObjectId(user["id"])
    job = await db.jobs.find_one(query)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("timer_running"):
        raise HTTPException(status_code=400, detail="Timer already running")

    entry = {"action": "start", "timestamp": datetime.now(timezone.utc)}
    updates = {"$push": {"time_entries": entry}, "$set": {"timer_running": True}}
    if job["status"] in (JobStatus.ASSIGNED, JobStatus.ACKNOWLEDGED):
        updates["$set"]["status"] = JobStatus.IN_PROGRESS
        updates["$set"]["started_at"] = datetime.now(timezone.utc)
    await db.jobs.update_one({"_id": ObjectId(job_id)}, updates)
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    job_data = serialize_doc(job)
    job_data["total_time_seconds"] = compute_elapsed(job.get("time_entries", []))
    return job_data

@api_router.post("/jobs/{job_id}/timer/pause")
async def timer_pause(job_id: str, request: Request):
    user = await get_current_user(request)
    query = {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["business_id"])}
    if user.get("role") == "worker":
        query["assigned_worker_id"] = ObjectId(user["id"])
    job = await db.jobs.find_one(query)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.get("timer_running"):
        raise HTTPException(status_code=400, detail="Timer not running")

    entry = {"action": "pause", "timestamp": datetime.now(timezone.utc)}
    elapsed = compute_elapsed(job.get("time_entries", []) + [entry])
    await db.jobs.update_one({"_id": ObjectId(job_id)}, {
        "$push": {"time_entries": entry},
        "$set": {"timer_running": False, "total_time_seconds": elapsed}
    })
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    job_data = serialize_doc(job)
    job_data["total_time_seconds"] = elapsed
    return job_data

@api_router.post("/jobs/{job_id}/timer/resume")
async def timer_resume(job_id: str, request: Request):
    user = await get_current_user(request)
    query = {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["business_id"])}
    if user.get("role") == "worker":
        query["assigned_worker_id"] = ObjectId(user["id"])
    job = await db.jobs.find_one(query)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("timer_running"):
        raise HTTPException(status_code=400, detail="Timer already running")

    entry = {"action": "resume", "timestamp": datetime.now(timezone.utc)}
    await db.jobs.update_one({"_id": ObjectId(job_id)}, {
        "$push": {"time_entries": entry}, "$set": {"timer_running": True}
    })
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    job_data = serialize_doc(job)
    job_data["total_time_seconds"] = compute_elapsed(job.get("time_entries", []))
    return job_data

@api_router.patch("/jobs/{job_id}/timer/adjust")
async def timer_adjust(job_id: str, data: TimeAdjust, request: Request):
    user = await get_current_user(request)
    if user.get("role") not in ("employer", "admin"):
        raise HTTPException(status_code=403, detail="Only employers can adjust time")
    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["business_id"])},
        {"$set": {"total_time_seconds": max(0, data.total_time_seconds), "time_entries": [], "timer_running": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    return serialize_doc(job)

@api_router.get("/jobs/{job_id}/timer")
async def get_timer(job_id: str, request: Request):
    user = await get_current_user(request)
    query = {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["business_id"])}
    if user.get("role") == "worker":
        query["assigned_worker_id"] = ObjectId(user["id"])
    job = await db.jobs.find_one(query)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    elapsed = compute_elapsed(job.get("time_entries", [])) if job.get("timer_running") else job.get("total_time_seconds", 0)
    return {"total_time_seconds": elapsed, "timer_running": job.get("timer_running", False)}

# ===================== QUOTES =====================
@api_router.post("/quotes")
async def create_quote(quote_data: QuoteCreate, request: Request):
    user = await get_current_user(request)
    quote_doc = {
        **quote_data.model_dump(exclude={"client_id"}),
        "contractor_id": ObjectId(user["business_id"]),
        "status": QuoteStatus.DRAFT,
        "quote_number": f"QT-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}",
        "created_at": datetime.now(timezone.utc)
    }
    if quote_data.client_id:
        quote_doc["client_id"] = ObjectId(quote_data.client_id)
    result = await db.quotes.insert_one(quote_doc)
    quote_doc["id"] = str(result.inserted_id)
    quote_doc["contractor_id"] = user["business_id"]
    if quote_data.client_id:
        quote_doc["client_id"] = quote_data.client_id
    quote_doc.pop("_id", None)
    return quote_doc

@api_router.get("/quotes")
async def get_quotes(request: Request, status: Optional[str] = None):
    user = await get_current_user(request)
    query = {"contractor_id": ObjectId(user["business_id"])}
    if status:
        query["status"] = status
    quotes = await db.quotes.find(query).sort("created_at", -1).to_list(1000)
    return [serialize_doc(q) for q in quotes]

@api_router.get("/quotes/{quote_id}")
async def get_quote(quote_id: str, request: Request):
    user = await get_current_user(request)
    quote = await db.quotes.find_one({
        "_id": ObjectId(quote_id), "contractor_id": ObjectId(user["business_id"])
    })
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return serialize_doc(quote)

@api_router.patch("/quotes/{quote_id}")
async def update_quote(quote_id: str, quote_data: QuoteUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in quote_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.quotes.update_one(
        {"_id": ObjectId(quote_id), "contractor_id": ObjectId(user["business_id"])},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    return serialize_doc(quote)

@api_router.post("/quotes/{quote_id}/send")
async def send_quote(quote_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.quotes.update_one(
        {"_id": ObjectId(quote_id), "contractor_id": ObjectId(user["business_id"])},
        {"$set": {"status": QuoteStatus.SENT, "sent_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    return serialize_doc(quote)

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.quotes.delete_one({
        "_id": ObjectId(quote_id), "contractor_id": ObjectId(user["business_id"])
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Quote deleted"}

@api_router.post("/quotes/{quote_id}/convert")
async def convert_quote_to_job(quote_id: str, request: Request):
    user = await require_employer(request)
    quote = await db.quotes.find_one({
        "_id": ObjectId(quote_id), "contractor_id": ObjectId(user["business_id"])
    })
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.get("converted_job_id"):
        raise HTTPException(status_code=400, detail="Quote already converted to a job")

    job_doc = {
        "title": quote.get("job_description", "Job from quote"),
        "job_type": quote.get("job_type", "other"),
        "customer_name": quote.get("customer_name", ""),
        "address": quote.get("address", ""),
        "price": quote.get("price", 0),
        "pricing_type": quote.get("pricing_type", "fixed"),
        "hourly_rate": quote.get("hourly_rate", 0),
        "extras": quote.get("extras", []),
        "notes": quote.get("notes", ""),
        "scheduled_date": datetime.now(timezone.utc) + timedelta(days=1),
        "contractor_id": ObjectId(user["business_id"]),
        "created_by": ObjectId(user["id"]),
        "status": JobStatus.ASSIGNED,
        "assigned_worker_id": None,
        "assigned_worker_name": None,
        "acknowledged_at": None,
        "started_at": None,
        "completed_at": None,
        "photos": [],
        "time_entries": [],
        "total_time_seconds": 0,
        "timer_running": False,
        "quote_id": ObjectId(quote_id),
        "created_at": datetime.now(timezone.utc)
    }
    if quote.get("client_id"):
        job_doc["client_id"] = ObjectId(quote["client_id"])
    else:
        job_doc["client_id"] = None

    result = await db.jobs.insert_one(job_doc)
    job_id = str(result.inserted_id)

    # Mark quote as accepted and link to job
    await db.quotes.update_one(
        {"_id": ObjectId(quote_id)},
        {"$set": {"status": QuoteStatus.ACCEPTED, "converted_job_id": job_id}}
    )

    return {"message": "Quote converted to job", "job_id": job_id}

# ===================== INVOICES =====================
@api_router.post("/invoices")
async def create_invoice(invoice_data: InvoiceCreate, request: Request):
    user = await get_current_user(request)
    user_doc = await db.users.find_one({"_id": ObjectId(user["business_id"])})
    if not user_doc:
        user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    gst_rate = invoice_data.gst_rate if invoice_data.gst_rate is not None else (user_doc.get("gst_rate", DEFAULT_GST_RATE) if user_doc else DEFAULT_GST_RATE)
    gst_amount = invoice_data.subtotal * (gst_rate / 100)
    total = invoice_data.subtotal + gst_amount

    invoice_doc = {
        **invoice_data.model_dump(exclude={"gst_rate", "job_id", "client_id"}),
        "contractor_id": ObjectId(user["business_id"]),
        "gst_rate": gst_rate, "gst_amount": gst_amount, "total": total,
        "status": InvoiceStatus.DRAFT,
        "invoice_number": f"INV-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}",
        "myob_sync_status": MyobSyncStatus.NOT_SYNCED,
        "myob_id": None,
        "myob_last_sync": None,
        "myob_error": None,
        "created_at": datetime.now(timezone.utc)
    }
    if invoice_data.job_id:
        invoice_doc["job_id"] = ObjectId(invoice_data.job_id)
    if invoice_data.client_id:
        invoice_doc["client_id"] = ObjectId(invoice_data.client_id)

    result = await db.invoices.insert_one(invoice_doc)
    invoice_doc["id"] = str(result.inserted_id)
    invoice_doc["contractor_id"] = user["business_id"]
    if invoice_data.job_id:
        invoice_doc["job_id"] = invoice_data.job_id
    if invoice_data.client_id:
        invoice_doc["client_id"] = invoice_data.client_id
    invoice_doc.pop("_id", None)
    return invoice_doc

@api_router.get("/invoices")
async def get_invoices(request: Request, status: Optional[str] = None):
    user = await get_current_user(request)
    query = {"contractor_id": ObjectId(user["business_id"])}
    if status:
        query["status"] = status
    invoices = await db.invoices.find(query).sort("created_at", -1).to_list(1000)
    return [serialize_doc(i) for i in invoices]

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, request: Request):
    user = await get_current_user(request)
    invoice = await db.invoices.find_one({
        "_id": ObjectId(invoice_id), "contractor_id": ObjectId(user["business_id"])
    })
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return serialize_doc(invoice)

@api_router.patch("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, invoice_data: InvoiceUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in invoice_data.model_dump().items() if v is not None}
    if "subtotal" in update_data or "gst_rate" in update_data:
        current = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
        if current:
            subtotal = update_data.get("subtotal", current.get("subtotal", 0))
            gst_rate = update_data.get("gst_rate", current.get("gst_rate", DEFAULT_GST_RATE))
            update_data["gst_amount"] = subtotal * (gst_rate / 100)
            update_data["total"] = subtotal + update_data["gst_amount"]
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.invoices.update_one(
        {"_id": ObjectId(invoice_id), "contractor_id": ObjectId(user["business_id"])},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return serialize_doc(invoice)

@api_router.post("/invoices/{invoice_id}/send")
async def send_invoice(invoice_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.invoices.update_one(
        {"_id": ObjectId(invoice_id), "contractor_id": ObjectId(user["business_id"])},
        {"$set": {"status": InvoiceStatus.SENT, "sent_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return serialize_doc(invoice)

@api_router.post("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(invoice_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.invoices.update_one(
        {"_id": ObjectId(invoice_id), "contractor_id": ObjectId(user["business_id"])},
        {"$set": {"status": InvoiceStatus.PAID, "paid_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return serialize_doc(invoice)

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.invoices.delete_one({
        "_id": ObjectId(invoice_id), "contractor_id": ObjectId(user["business_id"])
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted"}

# ===================== DASHBOARD STATS =====================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    biz_id = ObjectId(user["business_id"])

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    week_end = today + timedelta(days=7)
    month_start = today.replace(day=1)

    job_query_base = {"contractor_id": biz_id}
    if user.get("role") == "worker":
        job_query_base["assigned_worker_id"] = ObjectId(user["id"])

    jobs_today = await db.jobs.count_documents({**job_query_base, "scheduled_date": {"$gte": today, "$lt": tomorrow}})
    jobs_this_week = await db.jobs.count_documents({**job_query_base, "scheduled_date": {"$gte": today, "$lt": week_end}})
    completed_this_month = await db.jobs.count_documents({**job_query_base, "status": JobStatus.COMPLETED, "completed_at": {"$gte": month_start}})

    revenue_pipeline = [
        {"$match": {"contractor_id": biz_id, "status": InvoiceStatus.PAID, "paid_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.invoices.aggregate(revenue_pipeline).to_list(1)
    revenue_this_month = revenue_result[0]["total"] if revenue_result else 0

    pending_invoices = await db.invoices.count_documents({
        "contractor_id": biz_id, "status": {"$in": [InvoiceStatus.DRAFT, InvoiceStatus.SENT]}
    })
    active_clients = await db.clients.count_documents({"contractor_id": biz_id})

    # Team count (for employers)
    team_count = 0
    sms_balance = 0
    if user.get("role") in ("employer", "admin"):
        team_count = await db.users.count_documents({"business_id": biz_id, "role": "worker"})
        credit_doc = await db.sms_credits.find_one({"business_id": biz_id})
        sms_balance = credit_doc.get("balance", 0) if credit_doc else 0

    return {
        "jobs_today": jobs_today, "jobs_this_week": jobs_this_week,
        "completed_this_month": completed_this_month, "revenue_this_month": revenue_this_month,
        "pending_invoices": pending_invoices, "active_clients": active_clients,
        "team_count": team_count, "sms_balance": sms_balance
    }

# ===================== SMS =====================
SMS_TEMPLATES = {
    "customer_reminder": "Hi {name}, this is a reminder about your upcoming job on {date}. - {business}",
    "on_the_way": "Hi {name}, your technician is on the way and should arrive shortly. - {business}",
    "invoice_reminder": "Hi {name}, you have an outstanding invoice ({invoice_number}) for {total}. - {business}",
    "custom": "{custom_message}",
}

@api_router.get("/sms/balance")
async def get_sms_balance(request: Request):
    user = await get_current_user(request)
    biz_id = user["business_id"]
    credit_doc = await db.sms_credits.find_one({"business_id": ObjectId(biz_id)})
    balance = credit_doc.get("balance", 0) if credit_doc else 0
    return {"balance": balance, "low_credit": balance < 20}

@api_router.get("/sms/provider-balance")
async def get_sms_provider_balance(request: Request):
    """Check ClickSend account balance (admin/employer only)."""
    await require_employer(request)
    balance = await sms_provider.check_balance()
    return {"provider": sms_provider.__class__.__name__, "balance": balance}

@api_router.post("/sms/buy-credits")
async def buy_sms_credits(data: SmsBuyCredits, request: Request):
    user = await require_employer(request)
    pack = SMS_PACKS.get(data.pack)
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid pack")
    biz_id = ObjectId(user["business_id"])

    # Add credits (payment is PLACEHOLDER — no real charge)
    await db.sms_credits.update_one(
        {"business_id": biz_id},
        {"$inc": {"balance": pack["credits"]}, "$setOnInsert": {"business_id": biz_id}},
        upsert=True
    )
    # Log purchase
    await db.sms_purchases.insert_one({
        "business_id": biz_id,
        "pack": data.pack,
        "credits": pack["credits"],
        "price": pack["price"],
        "created_at": datetime.now(timezone.utc),
        "note": "PLACEHOLDER — no real payment processed"
    })
    credit_doc = await db.sms_credits.find_one({"business_id": biz_id})
    return {"message": f"{pack['credits']} credits added", "balance": credit_doc.get("balance", 0)}

@api_router.post("/sms/send")
async def send_sms(data: SmsSend, request: Request):
    user = await get_current_user(request)
    biz_id = ObjectId(user["business_id"])

    # Check balance
    credit_doc = await db.sms_credits.find_one({"business_id": biz_id})
    balance = credit_doc.get("balance", 0) if credit_doc else 0
    if balance < 1:
        raise HTTPException(status_code=400, detail="Insufficient SMS credits")

    # Build message from template
    template = SMS_TEMPLATES.get(data.message_type)
    if not template and data.message_type == "custom" and data.custom_message:
        template = data.custom_message
    elif not template:
        template = data.custom_message or "Message from {business}"

    business_name = user.get("business_name") or "Churvox"
    fill = {"business": business_name, "name": "", "date": "", "invoice_number": "", "total": "", "custom_message": data.custom_message or ""}

    if data.job_id:
        job = await db.jobs.find_one({"_id": ObjectId(data.job_id), "contractor_id": biz_id})
        if job:
            fill["name"] = job.get("customer_name", "")
            fill["date"] = job.get("scheduled_date", datetime.now(timezone.utc)).strftime("%d %b %Y")
    if data.invoice_id:
        inv = await db.invoices.find_one({"_id": ObjectId(data.invoice_id), "contractor_id": biz_id})
        if inv:
            fill["name"] = fill["name"] or inv.get("customer_name", "")
            fill["invoice_number"] = inv.get("invoice_number", "")
            fill["total"] = f"${inv.get('total', 0):.2f}"

    message = template.format(**fill)

    # Send via provider (ClickSend in production, Mock in dev)
    result = await sms_provider.send(
        to=data.recipient_phone,
        body=message,
        source="Churvox"
    )

    sms_log = {
        "business_id": biz_id,
        "recipient_phone": data.recipient_phone,
        "formatted_phone": format_phone_au_nz(data.recipient_phone),
        "message_type": data.message_type,
        "message": message,
        "job_id": ObjectId(data.job_id) if data.job_id else None,
        "invoice_id": ObjectId(data.invoice_id) if data.invoice_id else None,
        "status": result.status if result.success else "failed",
        "provider": result.provider,
        "message_id": result.message_id,
        "cost": result.cost,
        "error": result.error,
        "sent_by": ObjectId(user["id"]),
        "sent_by_name": user.get("name", "Unknown"),
        "created_at": datetime.now(timezone.utc)
    }
    await db.sms_log.insert_one(sms_log)

    if not result.success:
        raise HTTPException(status_code=502, detail=f"SMS delivery failed: {result.error}")

    # Deduct 1 credit on success
    await db.sms_credits.update_one({"business_id": biz_id}, {"$inc": {"balance": -1}})
    new_balance = balance - 1

    return {
        "message": "SMS sent",
        "sms_message": message,
        "balance": new_balance,
        "provider": result.provider,
        "message_id": result.message_id,
    }

@api_router.post("/sms/test")
async def send_test_sms(data: SmsTestSend, request: Request):
    """Development endpoint — send a test SMS without deducting credits."""
    await require_employer(request)
    result = await sms_provider.send(
        to=data.phone,
        body=data.message or "Test SMS from Churvox",
        source="Churvox-Test"
    )
    return {
        "success": result.success,
        "message_id": result.message_id,
        "status": result.status,
        "provider": result.provider,
        "error": result.error,
        "cost": result.cost,
    }

@api_router.get("/sms/history")
async def get_sms_history(request: Request):
    user = await get_current_user(request)
    biz_id = ObjectId(user["business_id"])
    logs = await db.sms_log.find({"business_id": biz_id}).sort("created_at", -1).to_list(100)
    return [serialize_doc(log) for log in logs]

@api_router.get("/sms/packs")
async def get_sms_packs():
    return [{"id": k, "credits": v["credits"], "price": v["price"]} for k, v in SMS_PACKS.items()]

# ===================== MYOB INTEGRATION =====================
@api_router.get("/myob/settings")
async def get_myob_settings(request: Request):
    user = await require_employer(request)
    biz_id = ObjectId(user["business_id"])
    settings = await db.myob_settings.find_one({"business_id": biz_id})
    if not settings:
        return {"connected": False, "api_key": None, "company_file_id": None, "company_file_name": None}
    return {
        "connected": bool(settings.get("api_key")),
        "api_key": "••••" + (settings.get("api_key", "")[-4:]) if settings.get("api_key") else None,
        "company_file_id": settings.get("company_file_id"),
        "company_file_name": settings.get("company_file_name"),
        "updated_at": settings.get("updated_at").isoformat() if settings.get("updated_at") else None,
    }

@api_router.post("/myob/settings")
async def update_myob_settings(data: MyobSettingsUpdate, request: Request):
    user = await require_employer(request)
    biz_id = ObjectId(user["business_id"])
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.myob_settings.update_one(
        {"business_id": biz_id},
        {"$set": update_data, "$setOnInsert": {"business_id": biz_id}},
        upsert=True,
    )
    return {"message": "MYOB settings saved"}

@api_router.post("/myob/sync/{invoice_id}")
async def sync_invoice_to_myob(invoice_id: str, request: Request):
    user = await require_employer(request)
    biz_id = ObjectId(user["business_id"])

    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id), "contractor_id": biz_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Check MYOB connection
    settings = await db.myob_settings.find_one({"business_id": biz_id})
    if not settings or not settings.get("api_key"):
        raise HTTPException(status_code=400, detail="MYOB not connected. Add your API key in Settings first.")

    # Set status to syncing
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {"myob_sync_status": MyobSyncStatus.SYNCING, "myob_error": None}}
    )

    # PLACEHOLDER: This is where the real MYOB API call would go.
    # For now, simulate a successful sync.
    mock_myob_id = f"MYOB-{secrets.token_hex(4).upper()}"
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {
            "myob_sync_status": MyobSyncStatus.SYNCED,
            "myob_id": mock_myob_id,
            "myob_last_sync": datetime.now(timezone.utc),
            "myob_error": None,
        }}
    )

    # Log sync event
    await db.myob_sync_log.insert_one({
        "business_id": biz_id,
        "invoice_id": ObjectId(invoice_id),
        "action": "sync_to_myob",
        "myob_id": mock_myob_id,
        "status": "success",
        "mock": True,
        "created_at": datetime.now(timezone.utc),
    })

    logger.info(f"[MYOB MOCK] Invoice {invoice.get('invoice_number')} synced as {mock_myob_id}")

    updated = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return serialize_doc(updated)

@api_router.get("/myob/status/{invoice_id}")
async def get_myob_sync_status(invoice_id: str, request: Request):
    user = await get_current_user(request)
    biz_id = ObjectId(user["business_id"])
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id), "contractor_id": biz_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {
        "myob_sync_status": invoice.get("myob_sync_status", "not_synced"),
        "myob_id": invoice.get("myob_id"),
        "myob_last_sync": invoice.get("myob_last_sync").isoformat() if invoice.get("myob_last_sync") else None,
        "myob_error": invoice.get("myob_error"),
    }

@api_router.post("/myob/webhook")
async def myob_payment_webhook(request: Request):
    """PLACEHOLDER: Receives payment notification from MYOB and marks invoice as paid.
    In production, this would validate MYOB webhook signatures."""
    body = await request.json()
    myob_id = body.get("myob_id")
    if not myob_id:
        raise HTTPException(status_code=400, detail="Missing myob_id")

    invoice = await db.invoices.find_one({"myob_id": myob_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found for this MYOB reference")

    await db.invoices.update_one(
        {"_id": invoice["_id"]},
        {"$set": {
            "status": InvoiceStatus.PAID,
            "paid_at": datetime.now(timezone.utc),
            "myob_sync_status": MyobSyncStatus.SYNCED,
        }}
    )

    await db.myob_sync_log.insert_one({
        "business_id": invoice["contractor_id"],
        "invoice_id": invoice["_id"],
        "action": "payment_sync_back",
        "myob_id": myob_id,
        "status": "success",
        "mock": True,
        "created_at": datetime.now(timezone.utc),
    })

    logger.info(f"[MYOB MOCK] Payment received for {myob_id}, invoice marked paid")
    return {"message": "Payment synced", "invoice_id": str(invoice["_id"])}

# ===================== ROOT =====================
@api_router.get("/")
async def root():
    return {"message": "Churvox API", "version": "2.0.0"}

# Include router

@api_router.post("/billing/create-checkout-session")
async def create_checkout_session(payload: CreateCheckoutSessionRequest, request: Request):
    user = await require_employer(request)

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe secret key not configured")

    plan_value = payload.plan.value if hasattr(payload.plan, "value") else str(payload.plan)
    price_id = get_stripe_price_id(plan_value)

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{FRONTEND_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}/billing/cancel",
        customer_email=user["email"],
        metadata={
            "user_id": user["id"],
            "business_id": user["business_id"],
            "plan": plan_value,
        },
    )
    return {"url": session.url}

@api_router.post("/billing/webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Stripe webhook secret not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata", {})
        user_id = metadata.get("user_id")
        plan = metadata.get("plan")
        stripe_customer_id = session.get("customer")
        stripe_subscription_id = session.get("subscription")

        if user_id and plan:
            await set_business_plan_from_checkout(
                user_id=user_id,
                plan=plan,
                stripe_customer_id=stripe_customer_id,
                stripe_subscription_id=stripe_subscription_id,
            )

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        stripe_customer_id = subscription.get("customer")

        if stripe_customer_id:
            owner = await db.users.find_one({
                "stripe_customer_id": stripe_customer_id,
                "role": {"$in": ["employer", "admin"]}
            })
            if owner:
                business_id = owner.get("business_id", owner["_id"])
                if isinstance(business_id, str):
                    business_id = ObjectId(business_id)

                await db.users.update_one(
                    {"_id": business_id},
                    {"$set": {"plan": "solo"}, "$unset": {"stripe_subscription_id": "", "stripe_customer_id": ""}}
                )

                await db.users.update_many(
                    {"business_id": business_id, "role": "worker"},
                    {"$set": {"plan": "solo"}}
                )

    return {"received": True}

@api_router.get("/billing/subscription-status")
async def billing_subscription_status(request: Request):
    user = await get_current_user(request)

    owner = await db.users.find_one({"_id": ObjectId(user["business_id"])})
    if not owner:
        owner = await db.users.find_one({"_id": ObjectId(user["id"])})

    if not owner:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "plan": owner.get("plan", "solo"),
        "stripe_customer_id": owner.get("stripe_customer_id"),
        "stripe_subscription_id": owner.get("stripe_subscription_id"),
    }


app.include_router(api_router)

# CORS
# Startup event
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.clients.create_index("contractor_id")
    await db.jobs.create_index([("contractor_id", 1), ("scheduled_date", 1)])
    await db.jobs.create_index([("assigned_worker_id", 1)])
    await db.quotes.create_index("contractor_id")
    await db.invoices.create_index("contractor_id")
    await db.users.create_index("business_id")
    await db.sms_credits.create_index("business_id", unique=True)
    await db.sms_log.create_index([("business_id", 1), ("created_at", -1)])
    await db.myob_settings.create_index("business_id", unique=True)
    await db.myob_sync_log.create_index([("business_id", 1), ("created_at", -1)])
    await db.invite_tokens.create_index("token", unique=True)
    await db.invite_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.invite_emails.create_index([("business_id", 1), ("created_at", -1)])

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@churvox.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")

    existing = await db.users.find_one({"email": admin_email})
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
