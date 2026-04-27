import os
import sys
from datetime import datetime
from pymongo import MongoClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

EMAIL = "hello@churvox.com"
PASSWORD = "HowardAccess2026!"
OWNER_ROLES = ["owner", "admin", "super_admin", "app_owner"]

mongo_url = (
    os.getenv("MONGO_URL")
    or os.getenv("MONGODB_URL")
    or os.getenv("DATABASE_URL")
)

if not mongo_url:
    print("ERROR: No MONGO_URL / MONGODB_URL / DATABASE_URL found")
    sys.exit(1)

client = MongoClient(mongo_url)

db_names = []
for name in [
    os.getenv("DB_NAME"),
    "churvox",
    "grassley",
    "app",
    "test",
]:
    if name and name not in db_names:
        db_names.append(name)

hashed = pwd_context.hash(PASSWORD)
updated_any = False

for db_name in db_names:
    db = client[db_name]
    users = db["users"]

    existing = users.find_one({
        "$or": [
            {"email": EMAIL},
            {"email": EMAIL.lower()},
            {"username": EMAIL},
            {"username": EMAIL.lower()},
        ]
    })

    payload = {
        "email": EMAIL.lower().strip(),
        "username": EMAIL.lower().strip(),
        "hashed_password": hashed,
        "is_active": True,
        "email_verified": True,
        "is_verified": True,
        "role": "owner",
        "roles": OWNER_ROLES,
        "is_owner": True,
        "is_admin": True,
        "updated_at": datetime.utcnow(),
    }

    if existing:
        users.update_one({"_id": existing["_id"]}, {"$set": payload})
        print(f"UPDATED existing owner in DB: {db_name}")
    else:
        users.insert_one({
            **payload,
            "created_at": datetime.utcnow(),
            "full_name": "Howard Jennings",
            "name": "Howard Jennings",
        })
        print(f"CREATED owner in DB: {db_name}")

    updated_any = True

if not updated_any:
    print("No DB updated")
    sys.exit(1)

print("")
print("OWNER LOGIN RESET COMPLETE")
print("EMAIL:", EMAIL)
print("PASSWORD:", PASSWORD)
