"""
Churvox Automation Engine V1 — cheapest/smallest safe implementation.

Design:
- Pure-async helpers; no background workers, no extra packages.
- Events are "emitted" inline from existing endpoints (best-effort; never raises).
- Rules/runs/notifications stored in Mongo via a passed-in `db` handle.
- Conditions are evaluated against dotted paths on the event payload
  (e.g. "job.status", "actor.role"). Token replacement uses {{path}} syntax.
"""
from __future__ import annotations

import re
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId


# -------------------------- Catalog --------------------------
TRIGGERS: List[str] = [
    "job_assigned", "job_acknowledged", "job_started", "job_paused",
    "job_resumed", "job_completed",
    "employer_note_added", "worker_note_added", "worker_photo_uploaded",
    "quote_created", "quote_sent", "quote_accepted",
    "invoice_created", "invoice_sent", "invoice_paid",
    "team_member_invited",
    "timesheet_updated", "payroll_status_updated",
    "recurring_job_generated",
]

ACTIONS: List[str] = [
    "log", "create_notification", "create_job_note",
    "update_job_status", "create_invoice_stub", "webhook_stub",
]

OPERATORS: List[str] = [
    "equals", "not_equals", "in", "not_in",
    "contains", "not_contains", "exists", "not_exists",
    "gt", "gte", "lt", "lte",
]


def catalog() -> Dict[str, Any]:
    return {"triggers": TRIGGERS, "actions": ACTIONS, "operators": OPERATORS}


# -------------------------- Helpers --------------------------
def _get_path(obj: Any, path: str) -> Any:
    if obj is None or not path:
        return None
    cur = obj
    for part in str(path).split("."):
        if isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


_TOKEN_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}")


def render_tokens(value: Any, payload: Dict[str, Any]) -> Any:
    if not isinstance(value, str):
        return value
    def repl(m):
        v = _get_path(payload, m.group(1))
        return "" if v is None else str(v)
    return _TOKEN_RE.sub(repl, value)


def _coerce_num(v: Any) -> Optional[float]:
    try: return float(v)
    except Exception: return None


def evaluate_condition(cond: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    path = cond.get("path") or cond.get("field") or ""
    op = (cond.get("op") or cond.get("operator") or "equals").lower()
    expected = cond.get("value")
    actual = _get_path(payload, path)

    if op == "equals": return actual == expected
    if op == "not_equals": return actual != expected
    if op == "exists": return actual is not None
    if op == "not_exists": return actual is None
    if op == "in":
        try: return actual in (expected or [])
        except Exception: return False
    if op == "not_in":
        try: return actual not in (expected or [])
        except Exception: return True
    if op == "contains":
        try: return str(expected) in str(actual or "")
        except Exception: return False
    if op == "not_contains":
        try: return str(expected) not in str(actual or "")
        except Exception: return True
    if op in ("gt", "gte", "lt", "lte"):
        a, b = _coerce_num(actual), _coerce_num(expected)
        if a is None or b is None: return False
        if op == "gt": return a > b
        if op == "gte": return a >= b
        if op == "lt": return a < b
        if op == "lte": return a <= b
    return False


def rule_matches(rule: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    conds = rule.get("conditions") or []
    if not conds:
        return True
    mode = (rule.get("condition_mode") or "all").lower()
    results = [evaluate_condition(c, payload) for c in conds]
    return all(results) if mode == "all" else any(results)


# -------------------------- Actions --------------------------
async def _run_action(db, action: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    atype = (action.get("type") or "").lower()
    cfg = action.get("config") or {}
    result: Dict[str, Any] = {"type": atype, "ok": True}

    try:
        if atype == "log":
            result["message"] = render_tokens(cfg.get("message") or "log", payload)

        elif atype == "create_notification":
            business_id = str(payload.get("business_id") or cfg.get("business_id") or "")
            user_id = str(render_tokens(cfg.get("user_id") or "", payload)).strip()
            # Fallback: route to the actor if no explicit recipient
            if not user_id:
                actor = (payload.get("actor") or {})
                user_id = str(actor.get("id") or "")
            doc = {
                "user_id": user_id,
                "business_id": business_id,
                "type": (cfg.get("notification_type") or "automation")[:48],
                "title": str(render_tokens(cfg.get("title") or "Automation", payload))[:200],
                "message": str(render_tokens(cfg.get("message") or "", payload))[:600],
                "route": str(render_tokens(cfg.get("route") or "", payload))[:200],
                "target_type": str(cfg.get("target_type") or "")[:48],
                "target_id": str(render_tokens(cfg.get("target_id") or "", payload))[:64],
                "read": False,
                "created_at": datetime.now(timezone.utc),
            }
            if user_id:
                r = await db.notifications.insert_one(doc)
                result["notification_id"] = str(r.inserted_id)
            else:
                result["ok"] = False
                result["error"] = "no user_id"

        elif atype == "create_job_note":
            job_id = str(render_tokens(cfg.get("job_id") or "", payload) or _get_path(payload, "job.id") or "")
            text = str(render_tokens(cfg.get("text") or "", payload))
            if not job_id or not text:
                result["ok"] = False
                result["error"] = "missing job_id or text"
            else:
                try:
                    obj = ObjectId(job_id)
                    await db.jobs.update_one(
                        {"_id": obj},
                        {"$push": {"automation_notes": {
                            "text": text, "source": "automation",
                            "at": datetime.now(timezone.utc),
                        }}},
                    )
                    result["job_id"] = job_id
                except Exception as e:
                    result["ok"] = False
                    result["error"] = f"note update failed: {e}"

        elif atype == "update_job_status":
            job_id = str(render_tokens(cfg.get("job_id") or "", payload) or _get_path(payload, "job.id") or "")
            new_status = str(render_tokens(cfg.get("status") or "", payload)).strip().lower()
            business_id = str(payload.get("business_id") or "")
            allowed = {"assigned", "acknowledged", "in_progress", "paused", "completed", "cancelled"}
            if not job_id or new_status not in allowed:
                result["ok"] = False
                result["error"] = "missing job_id or invalid status"
            else:
                try:
                    obj = ObjectId(job_id)
                    q = {"_id": obj}
                    if business_id:
                        q["$or"] = [{"business_id": business_id}, {"business_id": str(business_id)}]
                    await db.jobs.update_one(q, {"$set": {
                        "status": new_status,
                        "updated_at": datetime.now(timezone.utc),
                        "automation_touched": True,
                    }})
                    result["job_id"] = job_id
                    result["status"] = new_status
                except Exception as e:
                    result["ok"] = False
                    result["error"] = f"status update failed: {e}"

        elif atype == "create_invoice_stub":
            business_id = str(payload.get("business_id") or "")
            job = payload.get("job") or {}
            stub = {
                "invoice_number": f"AUTO-{int(datetime.now(timezone.utc).timestamp())}",
                "business_id": business_id,
                "owner_id": business_id,
                "status": "draft",
                "source": "automation",
                "job_id": str(job.get("id") or ""),
                "client_id": str(job.get("client_id") or ""),
                "customer_name": str(job.get("client_name") or ""),
                "total": float(cfg.get("total") or 0),
                "line_items": cfg.get("line_items") or [],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
            r = await db.invoices.insert_one(stub)
            result["invoice_id"] = str(r.inserted_id)

        elif atype == "webhook_stub":
            # V1: stub only — just log the intended call (no external network).
            result["message"] = f"webhook stub: {render_tokens(cfg.get('url') or '', payload)}"

        else:
            result["ok"] = False
            result["error"] = f"unknown action type: {atype}"
    except Exception as e:
        result["ok"] = False
        result["error"] = f"action exception: {e}"
        result["trace"] = traceback.format_exc()[:400]
    return result


# -------------------------- Core emit --------------------------
async def emit_event(db, trigger: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Best-effort fire-and-forget. Never raises."""
    summary = {"trigger": trigger, "matched": 0, "runs": 0, "errors": 0}
    try:
        if not trigger:
            return summary
        payload = dict(payload or {})
        payload.setdefault("emitted_at", datetime.now(timezone.utc).isoformat())
        business_id = str(payload.get("business_id") or "")
        query = {"trigger": trigger, "enabled": True}
        if business_id:
            query["business_id"] = business_id
        async for rule in db.automation_rules.find(query):
            try:
                if not rule_matches(rule, payload):
                    continue
                summary["matched"] += 1
                await _execute_rule(db, rule, payload, test=False)
                summary["runs"] += 1
            except Exception as e:
                summary["errors"] += 1
                print(f"AUTOMATION_RULE_ERR id={rule.get('_id')} err={e}")
    except Exception as e:
        print(f"AUTOMATION_EMIT_ERR trigger={trigger} err={e}")
    return summary


async def _execute_rule(db, rule: Dict[str, Any], payload: Dict[str, Any], test: bool = False) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    run_doc = {
        "business_id": str(rule.get("business_id") or payload.get("business_id") or ""),
        "rule_id": str(rule.get("_id") or ""),
        "rule_name": rule.get("name") or "",
        "trigger": rule.get("trigger") or payload.get("trigger") or "",
        "event_payload": payload,
        "status": "running",
        "results": [],
        "started_at": now,
        "finished_at": None,
        "test": bool(test),
    }
    run_id = (await db.automation_runs.insert_one(run_doc)).inserted_id
    try:
        for action in (rule.get("actions") or []):
            r = await _run_action(db, action, payload)
            run_doc["results"].append(r)
        run_doc["status"] = "completed" if all(x.get("ok") for x in run_doc["results"]) else "failed"
    except Exception as e:
        run_doc["status"] = "failed"
        run_doc["error"] = str(e)
    run_doc["finished_at"] = datetime.now(timezone.utc)
    await db.automation_runs.update_one({"_id": run_id}, {"$set": {
        "status": run_doc["status"],
        "results": run_doc["results"],
        "finished_at": run_doc["finished_at"],
        "error": run_doc.get("error"),
    }})
    return {**run_doc, "_id": str(run_id)}


# -------------------------- Indexes (best-effort) --------------------------
async def ensure_indexes(db) -> None:
    try:
        await db.automation_rules.create_index([("business_id", 1), ("trigger", 1), ("enabled", 1)])
        await db.automation_runs.create_index([("business_id", 1), ("started_at", -1)])
        await db.notifications.create_index([("user_id", 1), ("read", 1), ("created_at", -1)])
        await db.notifications.create_index([("business_id", 1), ("created_at", -1)])
    except Exception as e:
        print(f"AUTOMATION_INDEX_ERR {e}")
