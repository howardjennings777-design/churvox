import os
from datetime import datetime

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

from pymongo import MongoClient
from passlib.context import CryptContext

if load_dotenv:
    load_dotenv()
    load_dotenv("backend/.env")
    load_dotenv(".env")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

EMAIL = "howardjennings77@gmail.com"
PASSWORD = "HowardAccess2026!"

mongo_url = os.getenv("MONGO_URL") or os.getenv("MONGODB_URL") or os.getenv("DATABASE_URL")
db_names = [
    os.getenv("DB_NAME"),
    "grassley",
    "churvox",
    "app",
]
db_names = [x for x in db_names if x]

if not mongo_url:
    raise SystemExit("NO_MONGO_URL_FOUND")

client = MongoClient(mongo_url)

for db_name in db_names:
    db = client[db_name]
    users = db["users"]

    users.update_many(
        {"email": {"$in": ["hello@churvox.com", "howardjennings77@gmail.com"]}},
        {"$set": {"updated_at": datetime.utcnow()}}
    )

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
                "full_name": "Howard Jennings",
                "name": "Howard Jennings",
                "updated_at": datetime.utcnow(),
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow(),
            },
        },
        upsert=True,
    )

    row = users.find_one({"email": EMAIL.lower()}, {"email": 1, "role": 1, "is_owner": 1, "is_admin": 1})
    print("DB:", db_name, "->", row)

print("DONE")
print("LOGIN EMAIL:", EMAIL)
print("LOGIN PASSWORD:", PASSWORD)
