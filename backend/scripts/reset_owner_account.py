import os
from datetime import datetime
from pymongo import MongoClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

EMAIL = "howardjennings77@gmail.com"
PASSWORD = "HowardAccess2026!"

mongo_url = os.getenv("MONGO_URL") or os.getenv("MONGODB_URL") or os.getenv("DATABASE_URL")
db_name = os.getenv("DB_NAME") or "grassley"

if not mongo_url:
    raise SystemExit("No MONGO_URL / MONGODB_URL / DATABASE_URL found")

client = MongoClient(mongo_url)
db = client[db_name]
users = db["users"]

users.update_one(
    {"email": EMAIL.lower()},
    {
        "$set": {
            "email": EMAIL.lower(),
            "username": EMAIL.lower(),
            "hashed_password": pwd_context.hash(PASSWORD),
            "is_active": True,
            "email_verified": True,
            "is_verified": True,
            "role": "owner",
            "roles": ["owner", "admin", "super_admin", "app_owner"],
            "is_owner": True,
            "is_admin": True,
            "updated_at": datetime.utcnow(),
            "full_name": "Howard Jennings",
            "name": "Howard Jennings",
        },
        "$setOnInsert": {
            "created_at": datetime.utcnow(),
        },
    },
    upsert=True,
)

print("OWNER RESET DONE")
print("EMAIL:", EMAIL)
print("PASSWORD:", PASSWORD)
