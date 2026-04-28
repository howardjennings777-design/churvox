"""Churvox launch operations boot layer.

Adds owner launch sweep endpoints and a reliable AI ask endpoint from a boot
module that is already installed by sitecustomize on Render.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request

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
        or _role(user) in {"owner", "employer", "admin", "manager", "office_admin"}
    )


def _amount(doc: Dict[str, Any] | None) -> float:
    for key in ["balance_due", "amount_due", "total", "amount", "price", "subtotal", "job_price"]:
        try:
            value = float((doc or {}).get(key) or 0)
            if value:
                return value
        except Exception:
            pass
    return 0.0


def _money(value: float) -> str:
    try:
        return f"${float(value):,.0f}"
    except Exception:
        return "$0"


def _status(doc: Dict[str, Any] | None) -> str:
    return str((doc or {}).get("status") or (doc or {}).get("job_status") or "").lower().strip().replace(" ", "_")


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


async def _business_id(server_module, current_user: Dict[str, Any]) -> str:
    fn = getattr(server_module, "get_user_business_id", None)
    if callable(fn):
        try:
            return str(await fn(current_user))
        except Exception:
            pass
    return str(current_user.get("business_id") or current_user.get("owner_id") or current_user.get("id") or current_user.get("_id") or "")


async def _list(db, collection: str, business_id: str, limit: int = 120):
    try:
        query = {"$or": [{"business_id": str(business_id)}, {"owner_id": str(business_id)}]}
        return await db[collection].find(query).to_list(length=limit)
    except Exception:
        return []


async def _ai_snapshot(server_module, current_user: Dict[str, Any]) -> Dict[str, Any]:
    db = getattr(server_module, "db", None)
    bid = await _business_id(server_module, current_user)
    if db is None or not bid:
        return {"counts": {}, "money": {}, "top_unpaid": []}

    jobs = await _list(db, "jobs", bid, 300)
    quotes = await _list(db, "quotes", bid, 300)
    invoices = await _list(db, "invoices", bid, 300)
    workers = await _list(db, "users", bid, 120)

    closed = {"completed", "complete", "done", "cancelled", "canceled"}
    open_jobs = [j for j in jobs if _status(j) not in closed]
    unassigned = [j for j in open_jobs if not (j.get("assigned_worker_id") or j.get("worker_id") or j.get("assigned_to"))]
    completed_no_invoice = [j for j in jobs if _status(j) in {"completed", "complete", "done"} and not (j.get("invoice_id") or j.get("invoice_number"))]
    open_quotes = [q for q in quotes if _status(q) in {"draft", "sent", "pending", ""}]
    unpaid = [i for i in invoices if _status(i) in {"draft", "sent", "overdue", "unpaid", "pending", "partial", ""}]
    overdue = [i for i in unpaid if _status(i) == "overdue"]
    unpaid_value = sum(_amount(i) for i in unpaid)
    quote_value = sum(_amount(q) for q in open_quotes)
    top_unpaid = sorted(unpaid, key=_amount, reverse=True)[:5]

    return {
        "counts": {
            "jobs": len(jobs),
            "open_jobs": len(open_jobs),
            "unassigned_jobs": len(unassigned),
            "completed_jobs_without_invoice": len(completed_no_invoice),
            "quotes": len(quotes),
            "open_quotes": len(open_quotes),
            "invoices": len(invoices),
            "unpaid_invoices": len(unpaid),
            "overdue_invoices": len(overdue),
            "workers": len(workers),
        },
        "money": {
            "unpaid_invoice_value": unpaid_value,
            "open_quote_value": quote_value,
        },
        "top_unpaid": [
            {
                "customer": str(item.get("customer_name") or item.get("client_name") or item.get("name") or "Customer"),
                "invoice_number": str(item.get("invoice_number") or item.get("number") or item.get("id") or item.get("_id") or ""),
                "amount": _amount(item),
                "status": _status(item) or "unpaid",
            }
            for item in top_unpaid
        ],
    }


def _fallback_answer(question: str, snapshot: Dict[str, Any]) -> str:
    q = str(question or "").lower()
    c = snapshot.get("counts", {})
    m = snapshot.get("money", {})
    if any(word in q for word in ["owe", "owed", "money", "cash", "unpaid", "invoice"]):
        if not c.get("unpaid_invoices"):
            return "No unpaid invoices found in Churvox right now."
        top = snapshot.get("top_unpaid", [])
        names = "; ".join(f"{i.get('customer')} {i.get('invoice_number')} {_money(i.get('amount') or 0)}".strip() for i in top[:3])
        return f"{c.get('unpaid_invoices', 0)} unpaid invoice(s) found worth {_money(m.get('unpaid_invoice_value', 0))}. {c.get('overdue_invoices', 0)} are overdue. Top owing: {names}."
    if "profit" in q:
        return f"Churvox can see revenue signals, not true profit yet. Unpaid invoices total {_money(m.get('unpaid_invoice_value', 0))} and open quotes total {_money(m.get('open_quote_value', 0))}. Add expenses/cost data before treating this as profit."
    if "quote" in q:
        return f"{c.get('open_quotes', 0)} quote(s) need follow-up, worth about {_money(m.get('open_quote_value', 0))}."
    if "job" in q or "work" in q or "schedule" in q:
        return f"{c.get('open_jobs', 0)} open job(s). {c.get('unassigned_jobs', 0)} need assignment. {c.get('completed_jobs_without_invoice', 0)} completed job(s) may need invoices."
    return f"Business snapshot: {c.get('open_jobs', 0)} open jobs, {c.get('open_quotes', 0)} open quotes, and {c.get('unpaid_invoices', 0)} unpaid invoices."


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

    @router.post("/ai-ask")
    async def launch_ai_ask(request: Request, current_user: Dict[str, Any] = Depends(require_user)):
        payload = await request.json()
        question = str((payload or {}).get("question") or "").strip()
        snapshot = await _ai_snapshot(server_module, current_user)
        fallback = _fallback_answer(question, snapshot)
        try:
            from ai_service import generate_ai_text
            ai = generate_ai_text(
                "You are Churvox AI. Answer only from the supplied Churvox business snapshot. Be concise and practical. Never claim to send messages, change pricing, approve payroll, sync MYOB, mark invoices paid, or alter records.",
                str({"question": question, "snapshot": snapshot}),
                fallback,
                350,
            )
            return {
                "success": True,
                "configured": bool(ai.get("configured")),
                "used_ai": bool(ai.get("used_ai")),
                "answer": ai.get("text") or fallback,
                "message": ai.get("message"),
                "error_type": ai.get("error_type"),
                "model": ai.get("model"),
            }
        except Exception as exc:
            return {"success": True, "configured": False, "used_ai": False, "answer": fallback, "message": str(exc), "error_type": "ai_launch_boot_error"}

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
    print("CHURVOX_LAUNCH_AI_ASK_INSTALLED")
