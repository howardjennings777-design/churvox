"""
Churvox Automation Engine V2 — practical launch wiring.

What this file does:
- Normalises old underscore events and newer dot events so rules actually match.
- Supports both backend-style rules (`actions: [{type, config}]`) and simple frontend
  rules (`action: "notify_owner"`).
- Runs safe business-scoped actions for quote → job, job → draft invoice,
  notifications, follow-up tasks, notes, status updates, and activity logs.
- Never raises back into the user flow. Failures are logged into automation_runs.
"""
from __future__ import annotations

import re
import traceback
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId


# -------------------------- Catalog --------------------------
TRIGGERS: List[str] = [
    "job_assigned", "job_acknowledged", "job_started", "job_paused",
    "job_resumed", "job_completed",
    "employer_note_added", "worker_note_added", "worker_photo_uploaded",
    "quote_created", "quote_sent", "quote_accepted",
    "invoice_created", "invoice_sent", "invoice_paid", "invoice_overdue",
    "team_member_invited",
    "timesheet_updated", "payroll_status_updated",
    "recurring_job_generated",
]

# Include aliases used by the current Automation UI.
ACTIONS: List[str] = [
    "log", "create_notification", "notify_worker", "notify_owner", "payroll_admin_alert",
    "create_job_note", "update_job_status", "create_invoice_stub", "create_draft_invoice",
    "create_invoice_from_job", "create_job_from_quote", "webhook_stub",
    "create_follow_up_task_stub", "create_followup_task", "set_field_on_record",
    "create_internal_activity_log", "send_sms",
]

SAFE_FIELDS_BY_COLLECTION: Dict[str, List[str]] = {
    "jobs": ["status", "notes", "priority", "scheduled_date", "tags"],
    "clients": ["notes", "tags", "priority"],
    "invoices": ["notes", "tags", "status"],
    "quotes": ["notes", "tags", "status"],
}

OPERATORS: List[str] = [
    "equals", "not_equals", "in", "not_in",
    "contains", "not_contains", "exists", "not_exists",
    "gt", "gte", "lt", "lte",
    "blank", "not_blank", "starts_with", "ends_with",
    "is_true", "is_false",
]

TRIGGER_ALIASES: Dict[str, str] = {
    "job.assigned": "job_assigned",
    "job.acknowledged": "job_acknowledged",
    "job.started": "job_started",
    "job.paused": "job_paused",
    "job.resumed": "job_resumed",
    "job.completed": "job_completed",
    "job.updated": "job_completed",
    "worker.update": "worker_note_added",
    "worker.photo_uploaded": "worker_photo_uploaded",
    "quote.created": "quote_created",
    "quote.sent": "quote_sent",
    "quote.accepted": "quote_accepted",
    "invoice.created": "invoice_created",
    "invoice.sent": "invoice_sent",
    "invoice.paid": "invoice_paid",
    "invoice.overdue": "invoice_overdue",
    "payroll.ready": "payroll_status_updated",
    "payroll.status_updated": "payroll_status_updated",
}


def normalize_trigger(trigger: Any) -> str:
    value = str(trigger or "").strip().lower()
    if not value:
        return ""
    if value in TRIGGER_ALIASES:
        return TRIGGER_ALIASES[value]
    return value.replace(".", "_").replace("-", "_")


def normalize_action_type(action_type: Any) -> str:
    value = str(action_type or "").strip().lower()
    if value == "create_followup_task":
        return "create_follow_up_task_stub"
    if value == "create_draft_invoice":
        return "create_invoice_from_job"
    return value


def catalog() -> Dict[str, Any]:
    dot_triggers = sorted(TRIGGER_ALIASES.keys())
    return {"triggers": sorted(set(TRIGGERS + dot_triggers)), "actions": ACTIONS, "operators": OPERATORS}


# -------------------------- Helpers --------------------------
def _now() -> datetime:
    return datetime.now(timezone.utc)


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
    try:
        return float(v)
    except Exception:
        return None


def _safe_float(value: Any, fallback: float = 0.0) -> float:
    try:
        return float(value or fallback)
    except Exception:
        return fallback


def _safe_text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def _safe_id(value: Any) -> str:
    if not value:
        return ""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return str(value.get("$oid") or value.get("id") or value.get("_id") or "")
    return str(value)


def _object_id(value: Any) -> Optional[ObjectId]:
    try:
        text = _safe_id(value)
        return ObjectId(text) if text else None
    except Exception:
        return None


def _business_query(business_id: str, extra: Dict[str, Any] | None = None) -> Dict[str, Any]:
    query = {"business_id": str(business_id)}
    if extra:
        query.update(extra)
    return query


def _first(*values: Any) -> Any:
    for value in values:
        if value is not None and value != "":
            return value
    return None


def _payload_job(payload: Dict[str, Any]) -> Dict[str, Any]:
    job = payload.get("job") or payload.get("record") or {}
    return job if isinstance(job, dict) else {}


def _payload_quote(payload: Dict[str, Any]) -> Dict[str, Any]:
    quote = payload.get("quote") or payload.get("record") or {}
    return quote if isinstance(quote, dict) else {}


def _actions_from_rule(rule: Dict[str, Any]) -> List[Dict[str, Any]]:
    actions = rule.get("actions")
    if isinstance(actions, list) and actions:
        normalised = []
        for action in actions:
            if isinstance(action, str):
                normalised.append({"type": action, "config": {}})
            elif isinstance(action, dict):
                normalised.append(action)
        if normalised:
            return normalised

    simple = rule.get("action") or rule.get("action_type")
    if simple:
        return [{"type": simple, "config": rule.get("action_config") or rule.get("config") or {}}]

    return [{"type": "log", "config": {"message": "Automation rule ran"}}]


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
    if op == "blank":
        if actual is None: return True
        if isinstance(actual, str): return actual.strip() == ""
        if isinstance(actual, (list, dict, tuple, set)): return len(actual) == 0
        return False
    if op == "not_blank":
        if actual is None: return False
        if isinstance(actual, str): return actual.strip() != ""
        if isinstance(actual, (list, dict, tuple, set)): return len(actual) > 0
        return True
    if op == "starts_with":
        try: return str(actual or "").startswith(str(expected or ""))
        except Exception: return False
    if op == "ends_with":
        try: return str(actual or "").endswith(str(expected or ""))
        except Exception: return False
    if op == "is_true": return bool(actual) is True
    if op == "is_false": return actual is False or actual == 0 or actual is None or actual == "" or actual == "false"
    return False


def rule_matches(rule: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    conds = rule.get("conditions") or []
    if not conds:
        return True
    mode = (rule.get("condition_mode") or "all").lower()
    results = [evaluate_condition(c, payload) for c in conds]
    return all(results) if mode == "all" else any(results)


async def _find_users_for_notification(db, business_id: str, purpose: str, payload: Dict[str, Any], cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    explicit_user_id = _safe_id(render_tokens(cfg.get("user_id") or "", payload)).strip()
    if explicit_user_id:
        query_options = []
        oid = _object_id(explicit_user_id)
        if oid:
            query_options.append({"_id": oid})
        query_options.append({"id": explicit_user_id})
        for query in query_options:
            found = await db.users.find_one(query)
            if found:
                return [found]

    job = _payload_job(payload)
    recipients: List[Dict[str, Any]] = []

    if purpose == "worker":
        worker_id = _safe_id(_first(job.get("assigned_worker_id"), job.get("worker_id"), payload.get("worker_id")))
        if worker_id:
            oid = _object_id(worker_id)
            queries = []
            if oid:
                queries.append({"_id": oid})
            queries.append({"id": worker_id})
            queries.append({"business_id": str(business_id), "id": worker_id})
            for query in queries:
                found = await db.users.find_one(query)
                if found:
                    return [found]

    role_map = {
        "owner": ["owner", "employer", "admin", "manager", "office_admin"],
        "payroll": ["payroll", "owner", "employer", "admin", "manager"],
    }
    roles = role_map.get(purpose, role_map["owner"])
    cursor = db.users.find({"business_id": str(business_id), "role": {"$in": roles}}).limit(25)
    recipients = await cursor.to_list(length=25)

    if not recipients and business_id:
        oid = _object_id(business_id)
        if oid:
            owner = await db.users.find_one({"_id": oid})
            if owner:
                recipients = [owner]

    return recipients


async def _create_notifications_for_users(db, users: List[Dict[str, Any]], payload: Dict[str, Any], cfg: Dict[str, Any], purpose: str) -> Dict[str, Any]:
    business_id = str(payload.get("business_id") or cfg.get("business_id") or "")
    job = _payload_job(payload)
    quote = _payload_quote(payload)

    default_titles = {
        "worker": "New job update",
        "owner": "Business update",
        "payroll": "Payroll update",
    }
    default_messages = {
        "worker": "A job has been assigned or updated.",
        "owner": "Churvox has a new update ready for review.",
        "payroll": "Payroll is ready for review.",
    }

    docs = []
    for user in users:
        user_id = _safe_id(user.get("_id") or user.get("id"))
        if not user_id:
            continue
        route = _safe_text(render_tokens(cfg.get("route") or "", payload))
        if not route:
            if job.get("id") or job.get("_id"):
                route = f"/jobs/{_safe_id(job.get('id') or job.get('_id'))}"
            elif quote.get("id") or quote.get("_id"):
                route = f"/quotes/{_safe_id(quote.get('id') or quote.get('_id'))}"
            else:
                route = "/dashboard"
        docs.append({
            "user_id": user_id,
            "business_id": business_id,
            "type": _safe_text(cfg.get("notification_type"), "automation")[:48],
            "title": _safe_text(render_tokens(cfg.get("title") or default_titles.get(purpose), payload), "Automation")[:200],
            "message": _safe_text(render_tokens(cfg.get("message") or default_messages.get(purpose), payload), "")[:600],
            "route": route[:200],
            "target_type": _safe_text(cfg.get("target_type") or payload.get("trigger"), "automation")[:48],
            "target_id": _safe_id(cfg.get("target_id") or job.get("id") or job.get("_id") or quote.get("id") or quote.get("_id"))[:64],
            "read": False,
            "created_at": _now(),
        })

    if docs:
        result = await db.notifications.insert_many(docs)
        return {"ok": True, "notification_count": len(result.inserted_ids)}
    return {"ok": False, "error": "no notification recipients"}


async def _create_job_from_quote(db, payload: Dict[str, Any], cfg: Dict[str, Any]) -> Dict[str, Any]:
    business_id = str(payload.get("business_id") or "")
    quote = _payload_quote(payload)
    quote_id = _safe_id(_first(quote.get("id"), quote.get("_id"), payload.get("quote_id"), cfg.get("quote_id")))

    if not business_id:
        return {"ok": False, "error": "missing business_id"}
    if not quote and quote_id:
        oid = _object_id(quote_id)
        query = _business_query(business_id, {"_id": oid}) if oid else _business_query(business_id, {"id": quote_id})
        quote = await db.quotes.find_one(query) or {}
    if not quote:
        return {"ok": False, "error": "missing quote payload"}

    existing = None
    if quote_id:
        existing = await db.jobs.find_one(_business_query(business_id, {"quote_id": quote_id, "source": "quote"}))
    if existing:
        return {"ok": True, "job_id": _safe_id(existing.get("_id")), "existing": True}

    scheduled_date = cfg.get("scheduled_date") or quote.get("scheduled_date") or _now()
    if isinstance(scheduled_date, str):
        try:
            scheduled_date = datetime.fromisoformat(scheduled_date.replace("Z", "+00:00"))
        except Exception:
            scheduled_date = _now()

    title = _safe_text(
        render_tokens(cfg.get("title") or "", payload),
        _safe_text(quote.get("job_description") or quote.get("description") or quote.get("title"), "Accepted quote job")[:90],
    )
    job_doc = {
        "business_id": business_id,
        "owner_id": business_id,
        "quote_id": quote_id,
        "source": "quote",
        "title": title,
        "job_type": quote.get("job_type") or "other",
        "client_id": _safe_id(quote.get("client_id")),
        "customer_name": quote.get("customer_name") or quote.get("client_name") or "",
        "client_name": quote.get("customer_name") or quote.get("client_name") or "",
        "address": quote.get("address") or "",
        "scheduled_date": scheduled_date,
        "scheduled_time": quote.get("scheduled_time") or "",
        "estimated_duration": int(_safe_float(quote.get("estimated_duration"), 60)),
        "price": _safe_float(_first(quote.get("price"), quote.get("total"), quote.get("subtotal")), 0),
        "pricing_type": quote.get("pricing_type") or "fixed",
        "hourly_rate": _safe_float(quote.get("hourly_rate"), 0),
        "extras": quote.get("extras") or [],
        "notes": quote.get("notes") or "Created automatically from accepted quote.",
        "status": "assigned" if quote.get("assigned_worker_id") else "pending",
        "assigned_worker_id": quote.get("assigned_worker_id") or None,
        "created_at": _now(),
        "updated_at": _now(),
        "automation_created": True,
    }
    result = await db.jobs.insert_one(job_doc)
    return {"ok": True, "job_id": str(result.inserted_id), "existing": False}


async def _create_invoice_from_job(db, payload: Dict[str, Any], cfg: Dict[str, Any]) -> Dict[str, Any]:
    business_id = str(payload.get("business_id") or "")
    job = _payload_job(payload)
    job_id = _safe_id(_first(job.get("id"), job.get("_id"), payload.get("job_id"), cfg.get("job_id")))

    if not business_id:
        return {"ok": False, "error": "missing business_id"}
    if not job and job_id:
        oid = _object_id(job_id)
        query = _business_query(business_id, {"_id": oid}) if oid else _business_query(business_id, {"id": job_id})
        job = await db.jobs.find_one(query) or {}
    if not job:
        return {"ok": False, "error": "missing job payload"}

    existing = None
    if job_id:
        existing = await db.invoices.find_one(_business_query(business_id, {"job_id": job_id, "source": {"$in": ["automation", "job"]}}))
    if existing:
        return {"ok": True, "invoice_id": _safe_id(existing.get("_id")), "existing": True}

    subtotal = _safe_float(_first(cfg.get("subtotal"), job.get("price"), job.get("total"), job.get("subtotal")), 0)
    gst_rate = _safe_float(cfg.get("gst_rate"), 15)
    gst_amount = subtotal * gst_rate / 100
    total = _safe_float(cfg.get("total"), subtotal + gst_amount)
    invoice_doc = {
        "invoice_number": f"INV-{int(_now().timestamp())}",
        "business_id": business_id,
        "owner_id": business_id,
        "status": "draft",
        "source": "automation",
        "job_id": job_id,
        "client_id": _safe_id(job.get("client_id")),
        "customer_name": job.get("customer_name") or job.get("client_name") or "",
        "customer_email": job.get("customer_email") or "",
        "address": job.get("address") or "",
        "description": job.get("title") or job.get("description") or "Completed job",
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "total": total,
        "pricing_type": job.get("pricing_type") or "fixed",
        "hourly_rate": _safe_float(job.get("hourly_rate"), 0),
        "hours_worked": _safe_float(job.get("hours_worked"), 0),
        "extras": job.get("extras") or [],
        "notes": _safe_text(cfg.get("notes"), "Draft invoice created automatically from completed job."),
        "myob_sync_status": "not_synced",
        "created_at": _now(),
        "updated_at": _now(),
        "automation_created": True,
    }
    result = await db.invoices.insert_one(invoice_doc)
    return {"ok": True, "invoice_id": str(result.inserted_id), "existing": False}


# -------------------------- Actions --------------------------
async def _run_action(db, action: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    atype = normalize_action_type(action.get("type") or action.get("action"))
    cfg = action.get("config") or {}
    result: Dict[str, Any] = {"type": atype, "ok": True}

    try:
        if atype == "log":
            result["message"] = render_tokens(cfg.get("message") or "Automation ran", payload)

        elif atype in {"notify_worker", "notify_owner", "payroll_admin_alert"}:
            business_id = str(payload.get("business_id") or cfg.get("business_id") or "")
            purpose = "worker" if atype == "notify_worker" else "payroll" if atype == "payroll_admin_alert" else "owner"
            users = await _find_users_for_notification(db, business_id, purpose, payload, cfg)
            result.update(await _create_notifications_for_users(db, users, payload, cfg, purpose))

        elif atype == "create_notification":
            business_id = str(payload.get("business_id") or cfg.get("business_id") or "")
            users = await _find_users_for_notification(db, business_id, "owner", payload, cfg)
            result.update(await _create_notifications_for_users(db, users, payload, cfg, "owner"))

        elif atype == "create_job_from_quote":
            result.update(await _create_job_from_quote(db, payload, cfg))

        elif atype == "create_invoice_from_job":
            result.update(await _create_invoice_from_job(db, payload, cfg))

        elif atype == "create_job_note":
            job_id = _safe_id(render_tokens(cfg.get("job_id") or "", payload) or _get_path(payload, "job.id") or _get_path(payload, "job._id"))
            text = _safe_text(render_tokens(cfg.get("text") or cfg.get("message") or "", payload))
            if not job_id or not text:
                result.update({"ok": False, "error": "missing job_id or text"})
            else:
                oid = _object_id(job_id)
                if not oid:
                    result.update({"ok": False, "error": "invalid job_id"})
                else:
                    await db.jobs.update_one({"_id": oid}, {"$push": {"automation_notes": {"text": text, "source": "automation", "at": _now()}}})
                    result["job_id"] = job_id

        elif atype == "update_job_status":
            job_id = _safe_id(render_tokens(cfg.get("job_id") or "", payload) or _get_path(payload, "job.id") or _get_path(payload, "job._id"))
            new_status = _safe_text(render_tokens(cfg.get("status") or "", payload)).lower()
            business_id = str(payload.get("business_id") or "")
            allowed = {"pending", "assigned", "acknowledged", "in_progress", "paused", "completed", "cancelled"}
            oid = _object_id(job_id)
            if not oid or new_status not in allowed:
                result.update({"ok": False, "error": "missing job_id or invalid status"})
            else:
                query = {"_id": oid}
                if business_id:
                    query["business_id"] = business_id
                update = {"status": new_status, "updated_at": _now(), "automation_touched": True}
                if new_status == "completed":
                    update["completed"] = True
                    update["completed_at"] = _now()
                write = await db.jobs.update_one(query, {"$set": update})
                result.update({"job_id": job_id, "status": new_status, "matched": write.matched_count})
                if write.matched_count == 0:
                    result.update({"ok": False, "error": "job not found"})

        elif atype == "create_invoice_stub":
            result.update(await _create_invoice_from_job(db, payload, cfg))

        elif atype == "webhook_stub":
            result["message"] = f"webhook stub: {render_tokens(cfg.get('url') or '', payload)}"

        elif atype == "create_follow_up_task_stub":
            business_id = str(payload.get("business_id") or "")
            due_iso = render_tokens(cfg.get("due_at") or "", payload)
            try:
                due_dt = datetime.fromisoformat(str(due_iso).replace("Z", "+00:00")) if due_iso else _now() + timedelta(days=2)
            except Exception:
                due_dt = _now() + timedelta(days=2)
            doc = {
                "business_id": business_id,
                "title": _safe_text(render_tokens(cfg.get("title") or "Follow-up", payload))[:200],
                "description": _safe_text(render_tokens(cfg.get("description") or "", payload))[:600],
                "related_type": _safe_text(cfg.get("related_type") or payload.get("trigger"))[:48],
                "related_id": _safe_id(render_tokens(cfg.get("related_id") or "", payload))[:64],
                "assigned_user_id": _safe_id(render_tokens(cfg.get("assigned_user_id") or "", payload)),
                "due_at": due_dt,
                "status": "pending",
                "source": "automation",
                "created_at": _now(),
            }
            inserted = await db.follow_up_tasks.insert_one(doc)
            result["task_id"] = str(inserted.inserted_id)

        elif atype == "set_field_on_record":
            coll = _safe_text(cfg.get("collection")).lower()
            rec_id = _safe_id(render_tokens(cfg.get("id") or "", payload))
            field = _safe_text(cfg.get("field"))
            value = render_tokens(cfg.get("value"), payload)
            business_id = str(payload.get("business_id") or "")
            oid = _object_id(rec_id)
            if coll not in SAFE_FIELDS_BY_COLLECTION:
                result.update({"ok": False, "error": f"collection '{coll}' not allowed"})
            elif field not in SAFE_FIELDS_BY_COLLECTION[coll]:
                result.update({"ok": False, "error": f"field '{field}' not allowed on {coll}"})
            elif not oid:
                result.update({"ok": False, "error": "missing or invalid record id"})
            else:
                query = {"_id": oid}
                if business_id:
                    query["business_id"] = business_id
                write = await db[coll].update_one(query, {"$set": {field: value, "updated_at": _now(), "automation_touched": True}})
                result.update({"matched": write.matched_count, "modified": write.modified_count, "collection": coll, "id": rec_id})
                if write.matched_count == 0:
                    result.update({"ok": False, "error": "record not found in business scope"})

        elif atype == "create_internal_activity_log":
            doc = {
                "business_id": str(payload.get("business_id") or ""),
                "type": _safe_text(cfg.get("log_type"), "automation")[:48],
                "message": _safe_text(render_tokens(cfg.get("message") or "", payload))[:600],
                "payload": payload,
                "source": "automation",
                "created_at": _now(),
            }
            inserted = await db.activity_logs.insert_one(doc)
            result["activity_id"] = str(inserted.inserted_id)

        elif atype == "send_sms":
            to_raw = _safe_text(render_tokens(cfg.get("to") or "", payload))
            body = _safe_text(render_tokens(cfg.get("message") or cfg.get("body") or "", payload))[:1000]
            source = _safe_text(cfg.get("source"), "Churvox")[:32]
            if not to_raw or not body:
                result.update({"ok": False, "error": "send_sms requires 'to' and 'message'"})
            else:
                try:
                    from sms_provider import get_sms_provider, format_phone_au_nz
                    provider = get_sms_provider()
                    formatted = format_phone_au_nz(to_raw)
                    if not formatted:
                        result.update({"ok": False, "error": f"Invalid phone number: {to_raw}"})
                    else:
                        sms_res = await provider.send(to=formatted, body=body, source=source)
                        result.update({
                            "ok": bool(getattr(sms_res, "ok", False)),
                            "sms_provider": provider.__class__.__name__,
                            "sms_to": formatted,
                            "sms_id": getattr(sms_res, "message_id", None),
                        })
                        if not result["ok"]:
                            result["error"] = getattr(sms_res, "error", "SMS send failed")
                except Exception as e:
                    result.update({"ok": False, "error": f"send_sms failed: {e}"})

        else:
            result.update({"ok": False, "error": f"unknown action type: {atype}"})
    except Exception as e:
        result.update({"ok": False, "error": f"action exception: {e}", "trace": traceback.format_exc()[:600]})
    return result


# -------------------------- Core emit --------------------------
async def emit_event(db, trigger: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Best-effort automation event emitter. Never raises."""
    canonical_trigger = normalize_trigger(trigger)
    summary = {"trigger": canonical_trigger, "matched": 0, "runs": 0, "errors": 0}
    try:
        if not canonical_trigger:
            return summary
        payload = dict(payload or {})
        payload.setdefault("trigger", canonical_trigger)
        payload.setdefault("emitted_at", _now().isoformat())
        business_id = str(payload.get("business_id") or "")

        query: Dict[str, Any] = {"enabled": True}
        if business_id:
            query["business_id"] = business_id

        async for rule in db.automation_rules.find(query):
            try:
                if normalize_trigger(rule.get("trigger")) != canonical_trigger:
                    continue
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
    started = _now()
    run_doc = {
        "business_id": str(rule.get("business_id") or payload.get("business_id") or ""),
        "rule_id": _safe_id(rule.get("_id") or rule.get("id")),
        "rule_name": rule.get("name") or "",
        "trigger": normalize_trigger(rule.get("trigger") or payload.get("trigger")),
        "event_payload": payload,
        "status": "running",
        "results": [],
        "started_at": started,
        "finished_at": None,
        "test": bool(test),
    }
    run_id = (await db.automation_runs.insert_one(run_doc)).inserted_id
    try:
        for action in _actions_from_rule(rule):
            run_doc["results"].append(await _run_action(db, action, payload))
        run_doc["status"] = "completed" if run_doc["results"] and all(item.get("ok") for item in run_doc["results"]) else "failed"
    except Exception as e:
        run_doc["status"] = "failed"
        run_doc["error"] = str(e)
    run_doc["finished_at"] = _now()
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
        await db.jobs.create_index([("business_id", 1), ("quote_id", 1), ("source", 1)])
        await db.invoices.create_index([("business_id", 1), ("job_id", 1), ("source", 1)])
    except Exception as e:
        print(f"AUTOMATION_INDEX_ERR {e}")
