"""Churvox launch operations boot layer.

Adds one owner-only endpoint to run the important background repair/generation
sweeps immediately. This is useful after a deploy, during QA, and before launch.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

_INSTALLED = False


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _role(user: Dict[str, Any]) -> str:
    return str(user.get("role") or "").lower().strip()


def _is_owner_or_platform(user: Dict[str, Any] | None) -> bool:
    if not user:
        return False
    email = str(user.get("email") or "").lower().strip()
    return bool(
        user.get("is_platform_owner")
        or user.get("is_admin")
        or email == "hello@churvox.com"
        or _role(user) in {"owner", "employer", "admin"}
    )


async def _run_named(name: str, fn, *args, **kwargs) -> Dict[str, Any]:
    started = _now()
    try:
        data = await fn(*args, **kwargs)
        return {
            "ok": True,
            "name": name,
            "data": data,
            "duration_ms": round((_now() - started).total_seconds() * 1000),
        }
    except Exception as exc:
        return {
            "ok": False,
            "name": name,
            "error": str(exc),
            "duration_ms": round((_now() - started).total_seconds() * 1000),
        }


def install_launch_ops_boot(server_module) -> None:
    global _INSTALLED
    if _INSTALLED:
        return

    app = getattr(server_module, "app", None)
    db = getattr(server_module, "db", None)
    auto = getattr(server_module, "auto", None)
    get_current_user = getattr(server_module, "get_current_user", None)
    if app is None or db is None or get_current_user is None:
        return

    _INSTALLED = True

    async def require_user(current_user: Dict[str, Any] = Depends(get_current_user)):
        if not _is_owner_or_platform(current_user):
            raise HTTPException(status_code=403, detail="Launch operations access required")
        return current_user

    router = APIRouter(prefix="/api/launch", tags=["launch-ops"])

    @router.get("/ops-health")
    async def launch_ops_health(_: Dict[str, Any] = Depends(require_user)):
        return {
            "success": True,
            "installed": True,
            "sweeps": [
                "top_player_events",
                "quote_to_job",
                "job_to_invoice",
                "recurring_jobs",
                "checklist_automation",
                "notifications",
            ],
            "checked_at": _now().isoformat(),
        }

    @router.post("/sweep-all")
    async def launch_sweep_all(_: Dict[str, Any] = Depends(require_user)):
        results = []

        try:
            from top_player_boot import _sweep_once as top_player_sweep
            if auto is not None:
                results.append(await _run_named("top_player_events", top_player_sweep, db, auto))
        except Exception as exc:
            results.append({"ok": False, "name": "top_player_events", "error": f"not available: {exc}"})

        try:
            from quote_job_boot import _sweep_once as quote_job_sweep
            results.append(await _run_named("quote_to_job", quote_job_sweep, db))
        except Exception as exc:
            results.append({"ok": False, "name": "quote_to_job", "error": f"not available: {exc}"})

        try:
            from job_invoice_boot import _sweep_once as job_invoice_sweep
            results.append(await _run_named("job_to_invoice", job_invoice_sweep, db))
        except Exception as exc:
            results.append({"ok": False, "name": "job_to_invoice", "error": f"not available: {exc}"})

        try:
            from recurring_jobs_boot import _sweep_once as recurring_jobs_sweep
            results.append(await _run_named("recurring_jobs", recurring_jobs_sweep, db))
        except Exception as exc:
            results.append({"ok": False, "name": "recurring_jobs", "error": f"not available: {exc}"})

        try:
            from checklist_automation_boot import _sweep_once as checklist_sweep
            if auto is not None:
                results.append(await _run_named("checklist_automation", checklist_sweep, db, auto))
        except Exception as exc:
            results.append({"ok": False, "name": "checklist_automation", "error": f"not available: {exc}"})

        try:
            from notifications_boot import _sweep_once as notifications_sweep
            results.append(await _run_named("notifications", notifications_sweep, db))
        except Exception as exc:
            results.append({"ok": False, "name": "notifications", "error": f"not available: {exc}"})

        failed = [item for item in results if not item.get("ok")]
        return {
            "success": len(failed) == 0,
            "status": "ok" if not failed else "partial",
            "failed_count": len(failed),
            "results": results,
            "checked_at": _now().isoformat(),
        }

    app.include_router(router)
    print("LAUNCH_OPS_BOOT_INSTALLED")
