import os
from urllib.parse import urlparse

def ensure_owner_account():
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass

    mongo_url = (
        os.getenv("MONGO_URL")
        or os.getenv("MONGODB_URL")
        or os.getenv("MONGO_URI")
        or os.getenv("DATABASE_URL")
    )
    if not mongo_url:
        print("[owner_bootstrap] No mongo url found")
        return

    db_name = (
        os.getenv("DATABASE_NAME")
        or os.getenv("DB_NAME")
        or os.getenv("MONGO_DB_NAME")
    )
    if not db_name:
        parsed = urlparse(mongo_url)
        if parsed.path and parsed.path != "/":
            db_name = parsed.path.lstrip("/").split("?")[0]
    if not db_name:
        db_name = "test"

    email = "hello@churvox.com"
    password = "TempPass123!"

    from pymongo import MongoClient
    client = MongoClient(mongo_url)
    db = client[db_name]

    raw_bcrypt_hash = None
    passlib_hash = None

    try:
        import bcrypt
        raw_bcrypt_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    except Exception as e:
        print("[owner_bootstrap] bcrypt hash failed:", e)

    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        passlib_hash = pwd_context.hash(password)
    except Exception as e:
        print("[owner_bootstrap] passlib hash failed:", e)

    chosen_hash = passlib_hash or raw_bcrypt_hash or password

    owner_doc = {
        "email": email.lower().strip(),
        "name": "Howard",
        "full_name": "Howard",
        "role": "owner",
        "user_role": "owner",
        "account_type": "owner",
        "user_type": "owner",
        "is_active": True,
        "active": True,
        "is_verified": True,
        "status": "active",
        "plan": "enterprise",
        "hashed_password": chosen_hash,
        "password_hash": chosen_hash,
        "password": password,
    }

    collections = ["users", "app_users", "business_users"]
    for cname in collections:
        col = db[cname]
        existing = col.find_one({"email": email.lower().strip()})
        if existing:
            col.update_one({"_id": existing["_id"]}, {"$set": owner_doc})
            print(f"[owner_bootstrap] updated {cname}")
        else:
            col.insert_one(owner_doc)
            print(f"[owner_bootstrap] inserted {cname}")

    print("[owner_bootstrap] owner ready -> hello@churvox.com / TempPass123!")
