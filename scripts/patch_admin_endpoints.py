from pathlib import Path

SERVER = Path('backend/server.py')
text = SERVER.read_text(encoding='utf-8')

if '@api_router.get("/admin/platform-stats")' in text:
    print('Admin endpoints already present')
    raise SystemExit(0)

marker = '@api_router.get("/payroll/periods")'
if marker not in text:
    raise SystemExit('Could not find payroll marker in backend/server.py')

admin_block = r'''

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

'''

text = text.replace(marker, admin_block + marker, 1)
SERVER.write_text(text, encoding='utf-8')
print('Inserted platform owner admin endpoints into backend/server.py')
