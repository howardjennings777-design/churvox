"""Churvox platform owner analytics boot layer.

Adds real app-owner analytics endpoints without touching the large server.py file.
The frontend AppOwnerPage first checks /api/admin/platform-stats, so this makes
that page use live database counts instead of placeholder/fallback data.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

_INSTALLED = False


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_id(value: Any) -> str:
    if not value:
        return ""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return str(value.get("$oid") or value.get("id") or value.get("_id") or "")
    return str(value)


def _json_safe(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


def _num(value: Any) -> float:
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def _plan(user: Dict[str, Any]) -> str:
    return str(user.get("plan") or user.get("subscription_plan") or user.get("plan_type") or "").lower().strip()


def _is_fake(item: Dict[str, Any]) -> bool:
    text = " ".join(str(item.get(k) or "") for k in ["email", "name", "business_name", "company", "title", "customer_name", "client_name"]).lower()
    if "hello@churvox.com" in text:
        return False
    markers = ["test", "demo", "sample", "fake", "mock", "preview", "seed", "example.com", "mailinator", "tempmail"]
    return any(marker in text for marker in markers)


def _clean(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [_json_safe(item) for item in items if not _is_fake(item)]


async def _list_collection(db, name: str, query: Dict[str, Any] | None = None, limit: int = 250) -> List[Dict[str, Any]]:
    try:
        cursor = db[name].find(query or {}).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)
    except Exception:
        return []


async def _count_collection(db, name: str, query: Dict[str, Any] | None = None) -> int:
    try:
        return int(await db[name].count_documents(query or {}))
    except Exception:
        return 0


async def _platform_stats(db) -> Dict[str, Any]:
    today = _now() - timedelta(hours=24)
    month_start = datetime(_now().year, _now().month, 1, tzinfo=timezone.utc)

    users = _clean(await _list_collection(db, "users", limit=500))
    businesses = _clean(await _list_collection(db, "businesses", limit=500))
    jobs = _clean(await _list_collection(db, "jobs", limit=500))
    clients = _clean(await _list_collection(db, "clients", limit=500))
    quotes = _clean(await _list_collection(db, "quotes", limit=500))
    invoices = _clean(await _list_collection(db, "invoices", limit=500))
    automation_rules = _clean(await _list_collection(db, "automation_rules", limit=500))

    active_today = []
    for user in users:
        raw = user.get("last_login_at") or user.get("last_seen_at") or user.get("updated_at")
        try:
            seen = datetime.fromisoformat(str(raw).replace("Z", "+00:00")) if isinstance(raw, str) else raw
            if isinstance(seen, datetime) and seen >= today:
                active_today.append(user)
        except Exception:
            pass

    paid_users = []
    for user in users:
        status = str(user.get("plan_status") or user.get("subscription_status") or user.get("status") or "").lower()
        if status in {"active", "paid", "trialing"} or user.get("stripe_subscription_id"):
            paid_users.append(user)

    plan_counts = {"solo": 0, "team": 0, "pro": 0, "enterprise": 0}
    for user in users:
        plan = _plan(user)
        if plan in plan_counts:
            plan_counts[plan] += 1

    monthly_revenue = 0.0
    outstanding_balance = 0.0
    overdue_invoices = 0
    for invoice in invoices:
        status = str(invoice.get("status") or "").lower()
        total = _num(invoice.get("total") or invoice.get("amount") or invoice.get("subtotal"))
        paid_at = invoice.get("paid_at") or invoice.get("updated_at") or invoice.get("created_at")
        paid_in_month = False
        try:
            paid_dt = datetime.fromisoformat(str(paid_at).replace("Z", "+00:00")) if isinstance(paid_at, str) else paid_at
            paid_in_month = isinstance(paid_dt, datetime) and paid_dt >= month_start
        except Exception:
            paid_in_month = False
        if status == "paid" and paid_in_month:
            monthly_revenue += total
        if status not in {"paid", "cancelled", "void"}:
            outstanding_balance += total
        if status == "overdue":
            overdue_invoices += 1

    # Fall back to plan MRR if no paid invoices exist yet.
    if monthly_revenue <= 0 and paid_users:
        prices = {"solo": 30, "team": 70, "pro": 110, "enterprise": 240}
        monthly_revenue = sum(prices.get(_plan(user), 0) for user in paid_users)

    return {
        "success": True,
        "generated_at": _now().isoformat(),
        "total_users": len(users) or await _count_collection(db, "users"),
        "total_businesses": len(businesses) or len({str(u.get("business_id") or u.get("_id")) for u in users if u.get("role") in ["owner", "employer", "admin"]}),
        "active_today": len(active_today),
        "paid_users": len(paid_users),
        "total_jobs": len(jobs) or await _count_collection(db, "jobs"),
        "total_clients": len(clients) or await _count_collection(db, "clients"),
        "total_quotes": len(quotes) or await _count_collection(db, "quotes"),
        "total_invoices": len(invoices) or await _count_collection(db, "invoices"),
        "monthly_revenue": monthly_revenue,
        "outstanding_balance": outstanding_balance,
        "overdue_invoices": overdue_invoices,
        "automation_rules": len(automation_rules) or await _count_collection(db, "automation_rules"),
        "automation_runs": await _count_collection(db, "automation_runs"),
        "plan_counts": plan_counts,
        "users_list": users[:150],
        "businesses_list": businesses[:150],
        "active_today_list": active_today[:150],
        "paid_users_list": paid_users[:150],
        "jobs_list": jobs[:150],
        "clients_list": clients[:150],
        "quotes_list": quotes[:150],
        "invoices_list": invoices[:150],
        "automation_list": automation_rules[:150],
    }


def _is_platform_owner(user: Dict[str, Any] | None) -> bool:
    if not user:
        return False
    email = str(user.get("email") or "").lower().strip()
    role = str(user.get("role") or "").lower().strip()
    return bool(
        email == "hello@churvox.com" or
        user.get("is_platform_owner") is True or
        user.get("is_admin") is True or
        role in {"platform_owner", "super_admin"}
    )


def install_platform_admin_boot(server_module) -> None:
    global _INSTALLED
    if _INSTALLED:
        return

    app = getattr(server_module, "app", None)
    db = getattr(server_module, "db", None)
    get_current_user = getattr(server_module, "get_current_user", None)
    if app is None or db is None:
        return

    _INSTALLED = True

    if get_current_user:
        async def require_platform_owner(current_user: Dict[str, Any] = Depends(get_current_user)):
            if not _is_platform_owner(current_user):
                raise HTTPException(status_code=403, detail="Platform owner access required")
            return current_user
    else:
        async def require_platform_owner():
            raise HTTPException(status_code=503, detail="Auth dependency unavailable")

    router = APIRouter(prefix="/api/admin", tags=["platform-admin"])

    @router.get("/platform-stats")
    async def admin_platform_stats(_: Dict[str, Any] = Depends(require_platform_owner)):
        return await _platform_stats(db)

    @router.get("/usage")
    async def admin_usage(_: Dict[str, Any] = Depends(require_platform_owner)):
        return await _platform_stats(db)

    @router.get("/dashboard")
    async def admin_dashboard(_: Dict[str, Any] = Depends(require_platform_owner)):
        return await _platform_stats(db)

    @router.delete("/users/{user_id}")
    async def admin_delete_user(user_id: str, _: Dict[str, Any] = Depends(require_platform_owner)):
        oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else None
        queries = []
        if oid:
            queries.append({"_id": oid})
        queries.append({"id": user_id})
        deleted = 0
        for query in queries:
            result = await db.users.delete_one(query)
            deleted += int(result.deleted_count or 0)
            if deleted:
                break
        return {"success": True, "deleted": deleted}

    app.include_router(router)
    print("PLATFORM_ADMIN_BOOT_INSTALLED")
