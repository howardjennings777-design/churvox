from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_change_me')
JWT_ALGORITHM = "HS256"
DEFAULT_GST_RATE = float(os.environ.get('DEFAULT_GST_RATE', '15'))

# Create the main app
app = FastAPI(title="Churvox API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== ENUMS =====================
class JobStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class JobType(str, Enum):
    LAWN_MOWING = "lawn_mowing"
    HEDGE_TRIMMING = "hedge_trimming"
    GARDEN_MAINTENANCE = "garden_maintenance"
    LANDSCAPING = "landscaping"
    TREE_SERVICES = "tree_services"
    CLEANING = "cleaning"
    HANDYMAN = "handyman"
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    OTHER = "other"

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

class PlanType(str, Enum):
    SOLO = "solo"
    SOLO_PLUS = "solo_plus"
    TEAM = "team"
    PRO = "pro"

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

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    business_name: Optional[str] = None
    role: str
    plan: str
    gst_rate: float
    created_at: datetime

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
    title: str
    job_type: JobType
    client_id: Optional[str] = None
    customer_name: Optional[str] = None
    address: str
    scheduled_date: datetime
    scheduled_time: Optional[str] = None
    estimated_duration: Optional[int] = 60
    price: float
    notes: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None

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
    notes: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    status: Optional[JobStatus] = None

class QuoteCreate(BaseModel):
    customer_name: str
    customer_email: Optional[str] = None
    address: str
    job_description: str
    price: float
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
    address: str
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

class GSTUpdate(BaseModel):
    gst_rate: float

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
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

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
        "role": "contractor",
        "plan": "solo",
        "gst_rate": DEFAULT_GST_RATE,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "id": user_id,
        "email": email,
        "name": user_data.name,
        "business_name": user_data.business_name,
        "role": "contractor",
        "plan": "solo",
        "gst_rate": DEFAULT_GST_RATE,
        "token": access_token
    }

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
        # Increment failed attempts
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"count": 1},
                "$set": {"locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}
            },
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear failed attempts
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "business_name": user.get("business_name"),
        "role": user.get("role", "contractor"),
        "plan": user.get("plan", "solo"),
        "gst_rate": user.get("gst_rate", DEFAULT_GST_RATE),
        "token": access_token
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

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
        # Don't reveal if email exists
        return {"message": "If the email exists, a reset link has been sent"}
    
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": user["_id"],
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False
    })
    
    # Log the reset link for testing
    reset_link = f"Reset token for {email}: {token}"
    logger.info(reset_link)
    print(f"\n{'='*50}\nPASSWORD RESET TOKEN\nEmail: {email}\nToken: {token}\n{'='*50}\n")
    
    return {"message": "If the email exists, a reset link has been sent", "debug_token": token}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPassword):
    token_doc = await db.password_reset_tokens.find_one({
        "token": data.token,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    new_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"_id": token_doc["user_id"]},
        {"$set": {"password_hash": new_hash}}
    )
    await db.password_reset_tokens.update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

# ===================== USER SETTINGS =====================
@api_router.patch("/user/plan")
async def update_plan(data: PlanUpdate, request: Request):
    user = await get_current_user(request)
    if data.plan in [PlanType.TEAM, PlanType.PRO]:
        raise HTTPException(status_code=400, detail="Team and Pro plans are coming soon")
    
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"plan": data.plan}}
    )
    return {"message": "Plan updated", "plan": data.plan}

@api_router.patch("/user/gst")
async def update_gst(data: GSTUpdate, request: Request):
    user = await get_current_user(request)
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"gst_rate": data.gst_rate}}
    )
    return {"message": "GST rate updated", "gst_rate": data.gst_rate}

# ===================== CLIENTS =====================
@api_router.post("/clients")
async def create_client(client_data: ClientCreate, request: Request):
    user = await get_current_user(request)
    client_doc = {
        **client_data.model_dump(),
        "contractor_id": ObjectId(user["id"]),
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.clients.insert_one(client_doc)
    client_doc["id"] = str(result.inserted_id)
    client_doc["contractor_id"] = user["id"]
    client_doc.pop("_id", None)
    return client_doc

@api_router.get("/clients")
async def get_clients(request: Request):
    user = await get_current_user(request)
    clients = await db.clients.find(
        {"contractor_id": ObjectId(user["id"])},
        {"_id": 1, "name": 1, "email": 1, "phone": 1, "address": 1, "notes": 1, "created_at": 1}
    ).to_list(1000)
    return [serialize_doc(c) for c in clients]

@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, request: Request):
    user = await get_current_user(request)
    client = await db.clients.find_one({
        "_id": ObjectId(client_id),
        "contractor_id": ObjectId(user["id"])
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
        {"_id": ObjectId(client_id), "contractor_id": ObjectId(user["id"])},
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
        "contractor_id": ObjectId(user["id"])
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted"}

# ===================== JOBS =====================
@api_router.post("/jobs")
async def create_job(job_data: JobCreate, request: Request):
    user = await get_current_user(request)
    
    job_doc = {
        **job_data.model_dump(),
        "contractor_id": ObjectId(user["id"]),
        "status": JobStatus.SCHEDULED,
        "started_at": None,
        "completed_at": None,
        "photos": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    if job_data.client_id:
        job_doc["client_id"] = ObjectId(job_data.client_id)
    
    result = await db.jobs.insert_one(job_doc)
    job_doc["id"] = str(result.inserted_id)
    job_doc["contractor_id"] = user["id"]
    if job_data.client_id:
        job_doc["client_id"] = job_data.client_id
    job_doc.pop("_id", None)
    return job_doc

@api_router.get("/jobs")
async def get_jobs(request: Request, status: Optional[str] = None, date: Optional[str] = None):
    user = await get_current_user(request)
    query = {"contractor_id": ObjectId(user["id"])}
    
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
    
    jobs = await db.jobs.find({
        "contractor_id": ObjectId(user["id"]),
        "scheduled_date": {"$gte": today, "$lt": tomorrow}
    }).sort("scheduled_date", 1).to_list(100)
    return [serialize_doc(j) for j in jobs]

@api_router.get("/jobs/week")
async def get_jobs_this_week(request: Request):
    user = await get_current_user(request)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = today + timedelta(days=7)
    
    jobs = await db.jobs.find({
        "contractor_id": ObjectId(user["id"]),
        "scheduled_date": {"$gte": today, "$lt": week_end}
    }).sort("scheduled_date", 1).to_list(100)
    return [serialize_doc(j) for j in jobs]

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str, request: Request):
    user = await get_current_user(request)
    job = await db.jobs.find_one({
        "_id": ObjectId(job_id),
        "contractor_id": ObjectId(user["id"])
    })
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return serialize_doc(job)

@api_router.patch("/jobs/{job_id}")
async def update_job(job_id: str, job_data: JobUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in job_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    if "client_id" in update_data and update_data["client_id"]:
        update_data["client_id"] = ObjectId(update_data["client_id"])
    
    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["id"])},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    return serialize_doc(job)

@api_router.post("/jobs/{job_id}/start")
async def start_job(job_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["id"]), "status": JobStatus.SCHEDULED},
        {"$set": {"status": JobStatus.IN_PROGRESS, "started_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found or already started")
    
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    return serialize_doc(job)

@api_router.post("/jobs/{job_id}/complete")
async def complete_job(job_id: str, request: Request):
    user = await get_current_user(request)
    job = await db.jobs.find_one({
        "_id": ObjectId(job_id),
        "contractor_id": ObjectId(user["id"])
    })
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] == JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job already completed")
    
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"status": JobStatus.COMPLETED, "completed_at": datetime.now(timezone.utc)}}
    )
    
    # Get user's GST rate
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    gst_rate = user_doc.get("gst_rate", DEFAULT_GST_RATE)
    
    # Auto-create draft invoice
    subtotal = job.get("price", 0)
    gst_amount = subtotal * (gst_rate / 100)
    total = subtotal + gst_amount
    
    customer_name = job.get("customer_name", "")
    if job.get("client_id"):
        client = await db.clients.find_one({"_id": job["client_id"]})
        if client:
            customer_name = client.get("name", customer_name)
    
    invoice_doc = {
        "job_id": ObjectId(job_id),
        "contractor_id": ObjectId(user["id"]),
        "client_id": job.get("client_id"),
        "customer_name": customer_name,
        "address": job.get("address", ""),
        "description": f"{job.get('title', 'Service')} - {job.get('job_type', 'other')}",
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "total": total,
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
    result = await db.jobs.delete_one({
        "_id": ObjectId(job_id),
        "contractor_id": ObjectId(user["id"])
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted"}

# ===================== QUOTES =====================
@api_router.post("/quotes")
async def create_quote(quote_data: QuoteCreate, request: Request):
    user = await get_current_user(request)
    
    quote_doc = {
        **quote_data.model_dump(),
        "contractor_id": ObjectId(user["id"]),
        "status": QuoteStatus.DRAFT,
        "quote_number": f"QT-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.quotes.insert_one(quote_doc)
    quote_doc["id"] = str(result.inserted_id)
    quote_doc["contractor_id"] = user["id"]
    quote_doc.pop("_id", None)
    return quote_doc

@api_router.get("/quotes")
async def get_quotes(request: Request, status: Optional[str] = None):
    user = await get_current_user(request)
    query = {"contractor_id": ObjectId(user["id"])}
    if status:
        query["status"] = status
    
    quotes = await db.quotes.find(query).sort("created_at", -1).to_list(1000)
    return [serialize_doc(q) for q in quotes]

@api_router.get("/quotes/{quote_id}")
async def get_quote(quote_id: str, request: Request):
    user = await get_current_user(request)
    quote = await db.quotes.find_one({
        "_id": ObjectId(quote_id),
        "contractor_id": ObjectId(user["id"])
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
        {"_id": ObjectId(quote_id), "contractor_id": ObjectId(user["id"])},
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
        {"_id": ObjectId(quote_id), "contractor_id": ObjectId(user["id"])},
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
        "_id": ObjectId(quote_id),
        "contractor_id": ObjectId(user["id"])
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Quote deleted"}

# ===================== INVOICES =====================
@api_router.post("/invoices")
async def create_invoice(invoice_data: InvoiceCreate, request: Request):
    user = await get_current_user(request)
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    gst_rate = invoice_data.gst_rate if invoice_data.gst_rate is not None else user_doc.get("gst_rate", DEFAULT_GST_RATE)
    
    gst_amount = invoice_data.subtotal * (gst_rate / 100)
    total = invoice_data.subtotal + gst_amount
    
    invoice_doc = {
        **invoice_data.model_dump(exclude={"gst_rate"}),
        "contractor_id": ObjectId(user["id"]),
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "total": total,
        "status": InvoiceStatus.DRAFT,
        "invoice_number": f"INV-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}",
        "created_at": datetime.now(timezone.utc)
    }
    
    if invoice_data.job_id:
        invoice_doc["job_id"] = ObjectId(invoice_data.job_id)
    if invoice_data.client_id:
        invoice_doc["client_id"] = ObjectId(invoice_data.client_id)
    
    result = await db.invoices.insert_one(invoice_doc)
    invoice_doc["id"] = str(result.inserted_id)
    invoice_doc["contractor_id"] = user["id"]
    if invoice_data.job_id:
        invoice_doc["job_id"] = invoice_data.job_id
    if invoice_data.client_id:
        invoice_doc["client_id"] = invoice_data.client_id
    invoice_doc.pop("_id", None)
    return invoice_doc

@api_router.get("/invoices")
async def get_invoices(request: Request, status: Optional[str] = None):
    user = await get_current_user(request)
    query = {"contractor_id": ObjectId(user["id"])}
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query).sort("created_at", -1).to_list(1000)
    return [serialize_doc(i) for i in invoices]

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, request: Request):
    user = await get_current_user(request)
    invoice = await db.invoices.find_one({
        "_id": ObjectId(invoice_id),
        "contractor_id": ObjectId(user["id"])
    })
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return serialize_doc(invoice)

@api_router.patch("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, invoice_data: InvoiceUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in invoice_data.model_dump().items() if v is not None}
    
    # Recalculate totals if subtotal or gst_rate changed
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
        {"_id": ObjectId(invoice_id), "contractor_id": ObjectId(user["id"])},
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
        {"_id": ObjectId(invoice_id), "contractor_id": ObjectId(user["id"])},
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
        {"_id": ObjectId(invoice_id), "contractor_id": ObjectId(user["id"])},
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
        "_id": ObjectId(invoice_id),
        "contractor_id": ObjectId(user["id"])
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted"}

# ===================== DASHBOARD STATS =====================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    user_id = ObjectId(user["id"])
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    week_end = today + timedelta(days=7)
    month_start = today.replace(day=1)
    
    # Count jobs
    jobs_today = await db.jobs.count_documents({
        "contractor_id": user_id,
        "scheduled_date": {"$gte": today, "$lt": tomorrow}
    })
    
    jobs_this_week = await db.jobs.count_documents({
        "contractor_id": user_id,
        "scheduled_date": {"$gte": today, "$lt": week_end}
    })
    
    completed_this_month = await db.jobs.count_documents({
        "contractor_id": user_id,
        "status": JobStatus.COMPLETED,
        "completed_at": {"$gte": month_start}
    })
    
    # Revenue this month
    revenue_pipeline = [
        {"$match": {
            "contractor_id": user_id,
            "status": InvoiceStatus.PAID,
            "paid_at": {"$gte": month_start}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.invoices.aggregate(revenue_pipeline).to_list(1)
    revenue_this_month = revenue_result[0]["total"] if revenue_result else 0
    
    # Pending invoices
    pending_invoices = await db.invoices.count_documents({
        "contractor_id": user_id,
        "status": {"$in": [InvoiceStatus.DRAFT, InvoiceStatus.SENT]}
    })
    
    # Active clients
    active_clients = await db.clients.count_documents({"contractor_id": user_id})
    
    return {
        "jobs_today": jobs_today,
        "jobs_this_week": jobs_this_week,
        "completed_this_month": completed_this_month,
        "revenue_this_month": revenue_this_month,
        "pending_invoices": pending_invoices,
        "active_clients": active_clients
    }

# ===================== ROOT =====================
@api_router.get("/")
async def root():
    return {"message": "Churvox API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000'), "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.clients.create_index("contractor_id")
    await db.jobs.create_index([("contractor_id", 1), ("scheduled_date", 1)])
    await db.quotes.create_index("contractor_id")
    await db.invoices.create_index("contractor_id")
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@churvox.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "business_name": "Churvox Admin",
            "role": "admin",
            "plan": "pro",
            "gst_rate": DEFAULT_GST_RATE,
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated")
    
    # Write test credentials
    import os as os_module
    os_module.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# Churvox Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
""")
    logger.info("Test credentials written to /app/memory/test_credentials.md")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
