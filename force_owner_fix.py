import os
from urllib.parse import urlparse
from datetime import datetime, timezone

EMAIL = "hello@churvox.com"
PASSWORD = "darnell77"

def get_env_value(name, default=""):
    return os.environ.get(name, default).strip()

def get_db():
    mongo_url = (
        get_env_value("MONGO_URL")
        or get_env_value("MONGODB_URL")
        or get_env_value("MONGODB_URI")
        or get_env_value("DATABASE_URL")
    )
    db_name = (
        get_env_value("DB_NAME")
        or get_env_value("DATABASE_NAME")
        or get_env_value("MONGO_DB_NAME")
    )

    if not mongo_url:
        raise RuntimeError("Missing MONGO_URL")
    if not db_name:
        parsed = urlparse(mongo_url)
        db_name = parsed.path.lstrip("/") or "test"

    from pymongo import MongoClient
    client = MongoClient(mongo_url)
    db = client[db_name]
    return client, db, mongo_url, db_name

def hash_password(password):
    import bcrypt
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def main():
    client, db, mongo_url, db_name = get_db()
    now = datetime.now(timezone.utc)
    password_hash = hash_password(PASSWORD)

    users = db["users"]

    users.delete_many({"email": "admin@churvox.com"})

    owner_doc = {
        "email": EMAIL,
        "name": "Howard Jennings",
        "full_name": "Howard Jennings",
        "role": "owner",
        "roles": ["owner", "admin"],
        "is_admin": True,
        "is_owner": True,
        "is_platform_owner": True,
        "active": True,
        "is_active": True,
        "status": "active",
        "hashed_password": password_hash,
        "password_hash": password_hash,
        "updated_at": now,
    }

    existing = users.find_one({"email": EMAIL})

    if existing:
        users.update_one(
            {"email": EMAIL},
            {"$set": owner_doc}
        )
        print("Updated existing owner account")
    else:
        owner_doc["created_at"] = now
        users.insert_one(owner_doc)
        print("Inserted new owner account")

    print(f"Mongo connected: {mongo_url}")
    print(f"Database used: {db_name}")
    print(f"LOGIN EMAIL: {EMAIL}")
    print(f"LOGIN PASSWORD: {PASSWORD}")

    client.close()

if __name__ == "__main__":
    main()
