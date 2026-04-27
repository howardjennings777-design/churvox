"""Churvox launch audit boot layer.

Adds a live launch-readiness endpoint that checks the real backend wiring,
collections, route surface, and important configuration signals. This is not a
replacement for Playwright/manual testing, but it gives the app owner a single
place to see what is ready and what still needs attention.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Tuple

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


def _role(user: Dict[str, Any]) -> str:
    return str(user.get("role") or "").lower().strip()


def _is_platform_or_owner(user: Dict[str, Any] | None) -> bool:
    if not user:
        return False
    email = str(user.get("email") or "").lower().strip()
    return bool(
        user.get("is_platform_owner")
        or user.get("is_admin")
        or email == "hello@churvox.com"
        or _role(user) in {"owner", "employer", "admin"}
    )


def _route_paths(app) -> List[str]:
    rows = []
    for route in getattr(app, "routes", []) or []:
        path = getattr(route, "path", "") or ""
        methods = sorted(list(getattr(route, "methods", []) or []))
        rows.append(f"{','.join(methods)} {path}".strip())
    return rows


def _has_route(routes: List[str], path: str, method: str | None = None) -> bool:
    if method:
        return any(path in row and method.upper() in row.split(" ")[0] for row in routes)
    return any(path in row for row in routes)


def _config_status() -> List[Dict[str, Any]]:
    checks = [
        ("MongoDB", "MONGO_URL", True),
        ("Frontend URL", "FRONTEND_URL", True),
        ("JWT secret", "JWT_SECRET", True),
        ("Stripe secret", "STRIPE_SECRET_KEY", False),
        ("Stripe webhook", "STRIPE_WEBHOOK_SECRET", False),
        ("Postmark", "POSTMARK_SERVER_TOKEN", False),
        ("MYOB client", "MYOB_CLIENT_ID", False),
    ]
    out = []
    for label, key, required in checks:
        present = bool(os.getenv(key))
        out.append({
            "label": label,
            "key": key,
            "required": required,
            "ok": present or not required,
            "present": present,
            "severity": "critical" if required and not present else "optional" if not present else "ok",
        })
    return out


def _route_status(app) -> List[Dict[str, Any]]:
    routes = _route_paths(app)
    required = [
        ("Auth login", "/api/auth/login", "POST"),
        ("Auth me", "/api/auth/me", "GET"),
        ("Clients", "/api/clients", "GET"),
        ("Jobs", "/api/jobs", "GET"),
        ("Quotes", "/api/quotes", "GET"),
        ("Invoices", "/api/invoices", "GET"),
        ("Team", "/api/team", "GET"),
        ("Payroll periods", "/api/payroll/periods", "GET"),
        ("Notifications", "/api/notifications", "GET"),
        ("Follow-ups", "/api/follow-up-tasks", "GET"),
        ("Recurring jobs", "/api/recurring-jobs/sweep-now", "POST"),
        ("Quote to job", "/api/quotes/{quote_id}/convert", "POST"),
        ("Job to invoice", "/api/jobs/{job_id}/create-draft-invoice", "POST"),
        ("Client 360 activity", "/api/clients/{client_id}/activity", "GET"),
        ("Public quote", "/api/public/quote", None),
        ("Public invoice", "/api/public/invoice", None),
    ]
    return [
        {"label": label, "path": path, "method": method or "ANY", "ok": _has_route(routes, path, method)}
        for label, path, method in required
    ]


async def _collection_count(db, name: str, query: Dict[str, Any] | None = None) -> int:
    try:
        return int(await db[name].count_documents(query or {}))
    except Exception:
        return 0


async def _data_status(db) -> List[Dict[str, Any]]:
    checks = []
    collections = [
        ("Users", "users"),
        ("Clients", "clients"),
        ("Jobs", "jobs"),
        ("Quotes", "quotes"),
        ("Invoices", "invoices"),
        ("Workers/team", "users", {"role": {"$in": ["worker", "manager", "office_admin", "payroll"]}}),
        ("Automation rules", "automation_rules"),
        ("Automation runs", "automation_runs"),
        ("Notifications", "notifications"),
        ("Follow-ups", "follow_up_tasks"),
    ]
    for label, collection, *rest in collections:
        query = rest[0] if rest else {}
        count = await _collection_count(db, collection, query)
        checks.append({"label": label, "collection": collection, "count": count, "ok": count >= 0})
    return checks


async def _workflow_status(db) -> List[Dict[str, Any]]:
    overdue = await _collection_count(db, "invoices", {"status": "overdue"})
    draft_invoices = await _collection_count(db, "invoices", {"status": "draft"})
    completed_jobs_without_invoice = await _collection_count(db, "jobs", {"$and": [{"status": "completed"}, {"$or": [{"invoice_id": {"$exists": False}}, {"invoice_id": None}, {"invoice_id": ""}]}]})
    accepted_quotes_without_job = await _collection_count(db, "quotes", {"$and": [{"status": "accepted"}, {"$or": [{"converted_job_id": {"$exists": False}}, {"converted_job_id": None}, {"converted_job_id": ""}]}]})
    open_followups = await _collection_count(db, "follow_up_tasks", {"status": {"$in": ["pending", "open", "todo"]}})
    failed_automation = await _collection_count(db, "automation_runs", {"status": {"$in": ["failed", "error"]}})
    recent_notifications = await _collection_count(db, "notifications", {"created_at": {"$gte": _now() - timedelta(days=7)}})
    return [
        {"label": "Accepted quotes waiting for jobs", "count": accepted_quotes_without_job, "ok": accepted_quotes_without_job == 0, "severity": "warning"},
        {"label": "Completed jobs waiting for invoices", "count": completed_jobs_without_invoice, "ok": completed_jobs_without_invoice == 0, "severity": "warning"},
        {"label": "Draft invoices ready for review", "count": draft_invoices, "ok": True, "severity": "info"},
        {"label": "Overdue invoices", "count": overdue, "ok": True, "severity": "info"},
        {"label": "Open follow-ups", "count": open_followups, "ok": True, "severity": "info"},
        {"label": "Failed automation runs", "count": failed_automation, "ok": failed_automation == 0, "severity": "warning"},
        {"label": "Notifications in last 7 days", "count": recent_notifications, "ok": True, "severity": "info"},
    ]


async def _latest_errors(db) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    try:
        cursor = db.automation_runs.find({"status": {"$in": ["failed", "error"]}}).sort("created_at", -1).limit(10)
        async for row in cursor:
            rows.append(_json_safe(row))
    except Exception:
        pass
    return rows


def _score(sections: List[List[Dict[str, Any]]]) -> int:
    checks = [item for section in sections for item in section if isinstance(item.get("ok"), bool)]
    if not checks:
        return 0
    passed = len([item for item in checks if item.get("ok")])
    return round((passed / len(checks)) * 100)


def _issues(*sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    issues = []
    for section in sections:
        for item in section:
            if item.get("ok") is False:
                issues.append(item)
    return issues


async def _audit_payload(app, db) -> Dict[str, Any]:
    config = _config_status()
    routes = _route_status(app)
    data = await _data_status(db)
    workflows = await _workflow_status(db)
    errors = await _latest_errors(db)
    score = _score([config, routes, data, workflows])
    issues = _issues(config, routes, workflows)
    return {
        "success": True,
        "launch_score": score,
        "status": "launch_ready" if score >= 90 and not [i for i in issues if i.get("severity") == "critical"] else "needs_attention",
        "checked_at": _now().isoformat(),
        "summary": {
            "critical_issues": len([i for i in issues if i.get("severity") == "critical"]),
            "warnings": len([i for i in issues if i.get("severity") == "warning"]),
            "route_checks": len(routes),
            "config_checks": len(config),
            "workflow_checks": len(workflows),
        },
        "config": config,
        "routes": routes,
        "data": data,
        "workflows": workflows,
        "issues": issues,
        "recent_errors": errors,
    }


def install_launch_audit_boot(server_module) -> None:
    global _INSTALLED
    if _INSTALLED:
        return

    app = getattr(server_module, "app", None)
    db = getattr(server_module, "db", None)
    get_current_user = getattr(server_module, "get_current_user", None)
    if app is None or db is None or get_current_user is None:
        return

    _INSTALLED = True

    async def require_user(current_user: Dict[str, Any] = Depends(get_current_user)):
        if not _is_platform_or_owner(current_user):
            raise HTTPException(status_code=403, detail="Launch audit access required")
        return current_user

    router = APIRouter(prefix="/api/launch", tags=["launch-audit"])

    @router.get("/health")
    async def launch_health(_: Dict[str, Any] = Depends(require_user)):
        payload = await _audit_payload(app, db)
        return {"success": True, "launch_score": payload["launch_score"], "status": payload["status"], "summary": payload["summary"], "checked_at": payload["checked_at"]}

    @router.get("/audit")
    async def launch_audit(_: Dict[str, Any] = Depends(require_user)):
        return await _audit_payload(app, db)

    app.include_router(router)
    print("LAUNCH_AUDIT_BOOT_INSTALLED")
