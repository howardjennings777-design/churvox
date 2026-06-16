# CHURVOX_INVOICE_PDF_SEND_20260611

from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, List

import jwt
from bson import ObjectId
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response, JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(tags=["invoice-pdf"])

_mongo_client = None
_mongo_db = None


CREATE_TYPE_LABELS = {
    "client": "Client",
    "job": "Job",
    "quote": "Quote",
    "invoice": "Invoice",
    "person": "Person / worker",
}

TARGET_PAGE_BY_KIND = {
    "client": "clients",
    "job": "jobs",
    "quote": "quotes",
    "invoice": "invoices",
    "person": "team",
}

JOB_TYPES = {
    "lawn_mowing", "garden_maintenance", "landscaping", "cleaning", "window_cleaning",
    "pressure_washing", "handyman", "plumbing", "electrical", "painting", "carpentry",
    "pest_control", "pool_maintenance", "hvac", "roofing", "other",
}

ROLES = {"worker", "lead_worker", "subcontractor", "payroll"}


def _money(value: Any) -> float:
    try:
        return float(str(value or "0").replace("$", "").replace(",", ""))
    except Exception:
        return 0.0


def _currency(value: Any) -> str:
    return f"${_money(value):,.2f}"


def _safe(value: Any) -> str:
    text = str(value or "")
    text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", text)
    return text[:230]


def _first(*values: Any) -> str:
    for value in values:
        if str(value or "").strip():
            return str(value)
    return ""


def _plain(value: Any, limit: int = 240) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())[:limit]


def _num(value: Any) -> float:
    try:
        number = float(str(value or "0").replace("$", "").replace(",", ""))
        return number if number > 0 else 0.0
    except Exception:
        return 0.0


def _price_text(value: Any) -> str:
    amount = _num(value)
    if amount <= 0:
        return "Price needed"
    return f"${amount:,.2f}" if amount % 1 else f"${int(amount):,}"


def _role_label(value: str) -> str:
    value = (value or "worker").strip().lower()
    if value == "lead_worker":
        return "Lead worker"
    if value == "subcontractor":
        return "Subcontractor"
    if value == "payroll":
        return "Payroll only"
    return "Worker"


def _normal_kind(value: Any, text: str = "") -> str:
    value = str(value or "auto").strip().lower().replace("worker", "person")
    if value in CREATE_TYPE_LABELS:
        return value
    low = str(text or "").lower()
    if any(word in low for word in ["invoice", "bill", "charge", "unpaid", "overdue"]):
        return "invoice"
    if any(word in low for word in ["quote", "estimate", "price up"]):
        return "quote"
    if any(word in low for word in ["worker", "staff", "team member", "employee", "subcontractor", "payroll"]):
        return "person"
    if "client" in low or "customer" in low:
        return "client"
    return "job"


def _date_only(days: int = 7) -> str:
    return (datetime.utcnow() + timedelta(days=days)).date().isoformat()


def _db():
    global _mongo_client, _mongo_db
    if _mongo_db is not None:
        return _mongo_db
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME")
    if not mongo_url or not db_name:
        raise HTTPException(status_code=500, detail="Database environment is not configured")
    _mongo_client = AsyncIOMotorClient(mongo_url)
    _mongo_db = _mongo_client[db_name]
    return _mongo_db


def _oid(value: Any):
    try:
        if ObjectId.is_valid(str(value)):
            return ObjectId(str(value))
    except Exception:
        return None
    return None


def _make_safe(value: Any):
    if isinstance(value, list):
        return [_make_safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if key == "_id":
                out["id"] = str(item)
            else:
                out[key] = _make_safe(item)
        return out
    if isinstance(value, ObjectId):
        return str(value)
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    return value


def _auth_payload(request: Request) -> Dict[str, Any]:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.getenv("JWT_SECRET", "default_secret_change_me"), algorithms=["HS256"])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


async def _current_user(request: Request) -> Dict[str, Any]:
    payload = _auth_payload(request)
    database = _db()
    sub = str(payload.get("sub") or "")
    user = None
    oid = _oid(sub)
    if oid:
        user = await database.users.find_one({"_id": oid})
    if not user and payload.get("email"):
        user = await database.users.find_one({"email": str(payload.get("email")).lower()})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user["id"] = str(user.get("_id"))
    business_id = user.get("business_id") or user.get("id")
    user["business_id"] = str(business_id)
    return user


def _normalise_ai_payload(raw: Dict[str, Any], requested_kind: str, source_text: str) -> Dict[str, Any]:
    raw = raw if isinstance(raw, dict) else {}
    kind = _normal_kind(raw.get("kind") or requested_kind, source_text)
    amount = _num(raw.get("amount") or raw.get("price") or raw.get("total") or raw.get("subtotal"))
    pay_rate = _num(raw.get("payRate") or raw.get("pay_rate"))
    schedule = raw.get("schedule") if isinstance(raw.get("schedule"), dict) else {}
    schedule_input = _plain(schedule.get("input") or raw.get("scheduled_date"), 40)
    schedule_human = _plain(schedule.get("human") or raw.get("schedule_human") or ("Date needed" if kind == "job" else "Not needed"), 80)
    service = _plain(raw.get("service") or raw.get("description") or raw.get("job_description") or "General service", 120)
    client_name = _plain(raw.get("clientName") or raw.get("client_name") or raw.get("customer_name") or raw.get("customerName") or "New customer", 100)
    person_name = _plain(raw.get("personName") or raw.get("person_name") or raw.get("name") or client_name or "New person", 100)
    email = _plain(raw.get("email") or raw.get("customer_email") or raw.get("client_email"), 120)
    phone = _plain(raw.get("phone") or raw.get("mobile") or raw.get("customer_phone") or raw.get("client_phone"), 80)
    address = _plain(raw.get("address") or raw.get("site_address") or raw.get("service_address"), 160)
    role = _plain(raw.get("role") or raw.get("team_role") or "worker", 40).lower().replace("lead worker", "lead_worker").replace("payroll only", "payroll")
    if role not in ROLES:
        role = "worker"
    job_type = _plain(raw.get("jobType") or raw.get("job_type") or "other", 60).lower()
    if job_type not in JOB_TYPES:
        job_type = "other"
    repeat = _plain(raw.get("repeat") or raw.get("recurring_frequency") or raw.get("recurrence") or "one-off", 60).lower()
    gst = _plain(raw.get("gst") or raw.get("gstStatus") or raw.get("gst_status") or ("GST included" if kind == "invoice" else "Needs check"), 60)
    due_date = _plain(raw.get("dueDate") or raw.get("due_date") or (_date_only(7) if kind == "invoice" else ""), 40)
    title = _plain(raw.get("title") or (person_name if kind == "person" else f"{service} for {client_name}"), 140)
    notes = _plain(raw.get("notes") or raw.get("raw") or source_text, 1000)
    missing = raw.get("missing") if isinstance(raw.get("missing"), list) else []
    missing = [_plain(item, 80) for item in missing if _plain(item, 80)]

    def add_missing(name: str):
        if name not in missing:
            missing.append(name)

    if kind == "client" and not client_name:
        add_missing("client name")
    if kind == "job":
        if not client_name or client_name == "New customer":
            add_missing("client name")
        if not address:
            add_missing("job address")
        if not schedule_input:
            add_missing("date")
    if kind == "quote":
        if not client_name or client_name == "New customer":
            add_missing("client name")
        if not address:
            add_missing("site address")
        if not amount:
            add_missing("quote price")
    if kind == "invoice":
        if not client_name or client_name == "New customer":
            add_missing("client name")
        if not amount:
            add_missing("invoice amount")
    if kind == "person":
        if not person_name or person_name == "New person":
            add_missing("person name")
        if not email:
            add_missing("email for invite")

    return {
        "kind": kind,
        "label": CREATE_TYPE_LABELS.get(kind, "Action"),
        "clientName": client_name,
        "personName": person_name,
        "service": service,
        "jobType": job_type,
        "address": address,
        "area": _plain(raw.get("area") or raw.get("region") or "Wellington", 80),
        "email": email,
        "phone": phone,
        "amount": amount,
        "priceText": _price_text(amount),
        "payRate": pay_rate,
        "payRateText": f"${pay_rate:g}/hr" if pay_rate else "Not set",
        "schedule": {"human": schedule_human, "input": schedule_input, "time": _plain(schedule.get("time"), 40)},
        "repeat": repeat,
        "role": role,
        "roleText": _role_label(role),
        "gst": gst,
        "dueDate": due_date,
        "title": title,
        "notes": notes,
        "targetPage": TARGET_PAGE_BY_KIND.get(kind, "jobs"),
        "missing": missing,
        "confidence": raw.get("confidence") if isinstance(raw.get("confidence"), (int, float)) else None,
    }


def _fallback_parse(kind: str, text: str) -> Dict[str, Any]:
    text = str(text or "")
    low = text.lower()
    resolved = _normal_kind(kind, text)
    email = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, re.I)
    phone = re.search(r"(?:\+?64|0)\s?[\d\s().-]{7,14}\d", text)
    price = re.search(r"\$\s*(\d+(?:\.\d{1,2})?)", text) or re.search(r"\b(\d+(?:\.\d{1,2})?)\s*(?:incl|inc|including)\s*gst\b", low)
    address = re.search(r"\b\d{1,5}\s+[A-Za-z0-9'. -]+?\b(?:street|st|road|rd|avenue|ave|drive|dr|lane|ln|place|pl|crescent|cres|terrace|tce|court|ct|way|highway|hwy)\b", text, re.I)
    service = "Hedge trimming" if "hedge" in low else "Cleaning" if "clean" in low else "Handyman repair" if "repair" in low or "handyman" in low else "Lawn mowing" if "lawn" in low or "mow" in low else "General service"
    job_type = "garden_maintenance" if "hedge" in low or "garden" in low else "cleaning" if "clean" in low else "handyman" if "repair" in low or "handyman" in low else "lawn_mowing" if "lawn" in low or "mow" in low else "other"
    amount = _num(price.group(1) if price else 0)
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z'-]*", text) if w.lower() not in {"add", "create", "job", "quote", "invoice", "client", "customer", "worker", "for", "at", "to", "the", "a", "an", "book", "move", "reschedule", "show", "find", "mow", "lawn", "hedge", "trim", "clean", "repair", "today", "tomorrow", "next", "week", "friday", "gst"}]
    name = " ".join(w.capitalize() for w in words[:2]) or ("New person" if resolved == "person" else "New customer")
    schedule_input = ""
    schedule_human = "Date needed" if resolved == "job" else "Not needed"
    if "tomorrow" in low:
        dt = datetime.utcnow() + timedelta(days=1)
        schedule_input = dt.strftime("%Y-%m-%dT09:00")
        schedule_human = "Tomorrow · 9:00 AM"
    elif "today" in low:
        dt = datetime.utcnow()
        schedule_input = dt.strftime("%Y-%m-%dT09:00")
        schedule_human = "Today · 9:00 AM"
    elif "next week" in low:
        dt = datetime.utcnow() + timedelta(days=7)
        schedule_input = dt.strftime("%Y-%m-%dT09:00")
        schedule_human = "Next week · 9:00 AM"
    return _normalise_ai_payload({
        "kind": resolved,
        "clientName": name,
        "personName": name,
        "service": service,
        "jobType": job_type,
        "address": address.group(0).title() if address else "",
        "email": email.group(0) if email else "",
        "phone": phone.group(0).strip() if phone else "",
        "amount": amount,
        "schedule": {"human": schedule_human, "input": schedule_input},
        "repeat": "fortnightly" if "fortnight" in low else "weekly" if "weekly" in low else "monthly" if "monthly" in low else "one-off",
        "role": "subcontractor" if "subcontractor" in low else "payroll" if "payroll" in low else "worker",
        "gst": "GST included" if "gst" in low else "Needs check",
        "dueDate": _date_only(7),
        "notes": text,
        "confidence": 0.35,
    }, resolved, text)


def _tokens(*parts: Any) -> List[str]:
    text = " ".join(str(p or "") for p in parts).lower()
    words = re.findall(r"[a-z0-9]+", text)
    stop = {"the", "and", "for", "job", "invoice", "quote", "move", "next", "week", "to", "a", "an", "at", "show", "find", "unpaid", "overdue"}
    return [w for w in words if len(w) > 1 and w not in stop]


def _record_label(record: Dict[str, Any], record_type: str) -> str:
    if record_type == "job":
        return _first(record.get("title"), record.get("job_name"), record.get("client_name"), record.get("customer_name"), record.get("address"), "Job")
    if record_type == "invoice":
        return _first(record.get("invoice_number"), record.get("number"), record.get("customer_name"), record.get("client_name"), "Invoice")
    if record_type == "quote":
        return _first(record.get("quote_number"), record.get("number"), record.get("customer_name"), record.get("client_name"), "Quote")
    if record_type == "person":
        return _first(record.get("name"), record.get("email"), "Person")
    return _first(record.get("name"), record.get("client_name"), record.get("customer_name"), "Client")


def _record_search_text(record: Dict[str, Any], record_type: str) -> str:
    keys = ["name", "client_name", "customer_name", "title", "job_name", "address", "site_address", "email", "phone", "description", "notes", "invoice_number", "quote_number"]
    return " ".join(str(record.get(k) or "") for k in keys).lower()


def _score_record(record: Dict[str, Any], record_type: str, query_text: str, parsed: Dict[str, Any]) -> int:
    hay = _record_search_text(record, record_type)
    score = 0
    for tok in _tokens(query_text, parsed.get("clientName"), parsed.get("personName"), parsed.get("address")):
        if tok in hay:
            score += 3 if len(tok) > 3 else 1
    name = str(parsed.get("clientName") or parsed.get("personName") or "").strip().lower()
    if name and name != "new customer" and name != "new person" and name in hay:
        score += 12
    address = str(parsed.get("address") or "").strip().lower()
    if address and address in hay:
        score += 12
    if record_type == "job" and str(record.get("status") or "").lower() in {"completed", "cancelled"}:
        score -= 2
    return score


async def _find_matches(business_id: str, record_type: str, query_text: str, parsed: Dict[str, Any], limit: int = 5) -> List[Dict[str, Any]]:
    database = _db()
    collection_name = {"client": "clients", "job": "jobs", "invoice": "invoices", "quote": "quotes", "person": "users"}.get(record_type, "jobs")
    query = {"business_id": str(business_id)}
    if record_type == "person":
        query = {"business_id": str(business_id), "role": {"$in": ["worker", "staff", "employee", "subcontractor", "payroll"]}}
    cursor = getattr(database, collection_name).find(query).sort("created_at", -1).limit(120)
    matches = []
    async for item in cursor:
        score = _score_record(item, record_type, query_text, parsed)
        if score <= 0 and _tokens(query_text):
            continue
        safe = _make_safe(item)
        matches.append({
            "score": score,
            "recordType": record_type,
            "id": safe.get("id") or str(item.get("_id")),
            "label": _record_label(safe, record_type),
            "summary": _first(safe.get("address"), safe.get("customer_name"), safe.get("client_name"), safe.get("email"), safe.get("status"), ""),
            "status": safe.get("status") or safe.get("job_status") or "",
            "scheduled_date": safe.get("scheduled_date") or safe.get("date") or "",
            "amount": safe.get("total") or safe.get("subtotal") or safe.get("price") or safe.get("amount") or 0,
            "record": safe,
        })
    matches.sort(key=lambda x: x.get("score", 0), reverse=True)
    return matches[:limit]


@router.post("/tell-churvox/preview")
async def tell_churvox_preview(request: Request):
    user = await _current_user(request)
    business_id = str(user.get("business_id") or user.get("id"))
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    parsed = body.get("parsed") if isinstance(body.get("parsed"), dict) else {}
    text = _plain(body.get("text") or parsed.get("cleanedText") or parsed.get("notes"), 4000)
    intent = _plain(parsed.get("intent") or body.get("intent") or "create", 60)
    kind = _normal_kind(parsed.get("kind") or body.get("kind") or "job", text)

    record_type = kind
    if intent in {"reschedule", "update"}:
        record_type = "job" if kind not in {"invoice", "quote", "person", "client"} else kind
    if intent in {"money_review"}:
        record_type = "invoice"

    if intent == "money_review":
        database = _db()
        invoice_matches = []
        cursor = database.invoices.find({"business_id": business_id, "status": {"$in": ["sent", "overdue", "draft"]}}).sort("created_at", -1).limit(25)
        async for inv in cursor:
            safe = _make_safe(inv)
            amount = safe.get("total") or safe.get("subtotal") or safe.get("amount") or 0
            invoice_matches.append({
                "recordType": "invoice",
                "id": safe.get("id"),
                "label": _record_label(safe, "invoice"),
                "summary": f"{safe.get('status', 'invoice')} · {_price_text(amount)}",
                "status": safe.get("status") or "",
                "amount": amount,
                "record": safe,
                "score": 1,
            })
        return {
            "success": True,
            "intent": intent,
            "recordType": "invoice",
            "matches": invoice_matches,
            "bestMatch": invoice_matches[0] if invoice_matches else None,
            "canCommit": False,
            "ambiguity": "none" if invoice_matches else "no_match",
            "previewTitle": "Money review ready",
            "previewLines": [f"Found {len(invoice_matches)} invoice(s) to review.", "No invoice will be sent or synced without approval."],
        }

    matches = await _find_matches(business_id, record_type, text, parsed)
    best = matches[0] if matches else None
    ambiguity = "none"
    if not matches:
        ambiguity = "no_match"
    elif len(matches) > 1 and matches[0].get("score", 0) - matches[1].get("score", 0) < 5:
        ambiguity = "multiple_matches"

    can_commit = bool(best and ambiguity == "none" and intent == "reschedule" and parsed.get("schedule", {}).get("input"))
    preview_lines = []
    if best:
        preview_lines.append(f"I found {best.get('label')} ({best.get('summary') or best.get('status') or 'matching record'}).")
    else:
        preview_lines.append("I could not find a matching live record yet.")
    if intent == "reschedule":
        preview_lines.append(f"New date: {parsed.get('schedule', {}).get('human') or parsed.get('schedule', {}).get('input') or 'date needed'}.")
    elif intent == "update":
        preview_lines.append("This is prepared as an update action and needs approval.")
    elif intent == "message":
        preview_lines.append("This is prepared as a draft message and needs approval before sending.")

    return {
        "success": True,
        "intent": intent,
        "recordType": record_type,
        "matches": matches,
        "bestMatch": best,
        "canCommit": can_commit,
        "ambiguity": ambiguity,
        "previewTitle": "Live match found" if best else "Needs matching",
        "previewLines": preview_lines,
    }


@router.post("/tell-churvox/commit")
async def tell_churvox_commit(request: Request):
    user = await _current_user(request)
    business_id = str(user.get("business_id") or user.get("id"))
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    parsed = body.get("parsed") if isinstance(body.get("parsed"), dict) else {}
    match = body.get("match") if isinstance(body.get("match"), dict) else {}
    intent = _plain(parsed.get("intent") or body.get("intent") or "", 60)
    record_type = _plain(match.get("recordType") or body.get("recordType") or "", 40)
    record_id = _plain(match.get("id") or body.get("recordId") or "", 80)

    if intent != "reschedule" or record_type != "job":
        raise HTTPException(status_code=400, detail="Only approved job reschedule actions are live-enabled right now")

    schedule = parsed.get("schedule") if isinstance(parsed.get("schedule"), dict) else {}
    schedule_input = _plain(schedule.get("input"), 80)
    if not schedule_input:
        raise HTTPException(status_code=400, detail="New schedule is required")

    try:
        scheduled_date = datetime.fromisoformat(schedule_input.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid schedule date")

    database = _db()
    filters = [{"business_id": business_id, "id": record_id}]
    oid = _oid(record_id)
    if oid:
        filters.append({"business_id": business_id, "_id": oid})

    now = datetime.now(timezone.utc)
    update = {
        "scheduled_date": scheduled_date,
        "updated_at": now,
        "tell_churvox_last_action": {
            "intent": intent,
            "text": _plain(body.get("text") or parsed.get("originalText") or parsed.get("cleanedText"), 1000),
            "approved_at": now,
            "approved_by": str(user.get("id") or ""),
        },
    }

    result = None
    used_filter = None
    for flt in filters:
        result = await database.jobs.update_one(flt, {"$set": update})
        if result.matched_count:
            used_filter = flt
            break

    if not result or result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Matching job not found")

    doc = await database.jobs.find_one(used_filter)
    return {
        "success": True,
        "message": "Job rescheduled",
        "record": _make_safe(doc),
        "undo": {"type": "job_reschedule", "recordId": record_id},
    }


@router.post("/ai/quick-create/parse")
@router.post("/create-with-churvox/parse")
async def ai_quick_create_parse(request: Request):
    _auth_payload(request)
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    if not isinstance(body, dict):
        body = {}

    text = _plain(body.get("text"), 4000)
    requested_kind = _normal_kind(body.get("kind"), text)
    timezone_name = _plain(body.get("timezone") or "Pacific/Auckland", 80)
    if not text:
        raise HTTPException(status_code=400, detail="Write what you want Churvox to create first.")

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("CHURVOX_AI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    if not api_key:
        parsed = _fallback_parse(requested_kind, text)
        return {"success": True, "provider": "fallback", "ai_enabled": False, "parsed": parsed, "message": "OPENAI_API_KEY is not configured, so Churvox used safe local extraction."}

    system = (
        "You are the Tell Churvox parser for a trade/job-management app. Return ONLY valid JSON. "
        "Infer if the owner wants to create, reschedule, update, find, review money, or prepare a message. "
        "Do not invent unknown facts. Keep risky actions owner-approved. "
        "Invoices must be drafts only; do not send, sync, mark paid, submit tax, or create bank files. "
        "Use New Zealand context and the user's timezone for relative dates. "
        "Allowed kind values: client, job, quote, invoice, person. "
        "Allowed intent values: create, reschedule, update, find, money_review, message. "
        "Allowed jobType values: lawn_mowing, garden_maintenance, landscaping, cleaning, window_cleaning, pressure_washing, handyman, plumbing, electrical, painting, carpentry, pest_control, pool_maintenance, hvac, roofing, other. "
        "Allowed role values: worker, lead_worker, subcontractor, payroll."
    )
    today = datetime.utcnow().date().isoformat()
    user = {
        "target_kind": requested_kind,
        "timezone": timezone_name,
        "today_utc": today,
        "text": text,
        "schema": {
            "intent": "create|reschedule|update|find|money_review|message",
            "kind": "client|job|quote|invoice|person",
            "clientName": "string",
            "personName": "string",
            "service": "string",
            "jobType": "allowed jobType",
            "address": "string",
            "area": "string",
            "email": "string",
            "phone": "string",
            "amount": "number",
            "schedule": {"human": "string", "input": "YYYY-MM-DDTHH:mm or empty", "time": "string"},
            "repeat": "one-off|weekly|fortnightly|monthly|custom",
            "role": "worker|lead_worker|subcontractor|payroll",
            "gst": "GST included|GST excluded|No GST|Needs check",
            "dueDate": "YYYY-MM-DD or empty",
            "title": "string",
            "notes": "string",
            "missing": ["short missing field names"],
            "confidence": "0 to 1 number"
        }
    }

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        def run_ai():
            return client.chat.completions.create(
                model=model,
                temperature=0.1,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": json.dumps(user)},
                ],
            )

        completion = await asyncio.to_thread(run_ai)
        content = completion.choices[0].message.content or "{}"
        parsed_raw = json.loads(content)
        parsed = _normalise_ai_payload(parsed_raw, requested_kind, text)
        if isinstance(parsed_raw, dict) and parsed_raw.get("intent"):
            parsed["intent"] = _plain(parsed_raw.get("intent"), 40)
        return {"success": True, "provider": "openai", "ai_enabled": True, "model": model, "parsed": parsed}
    except Exception as exc:
        parsed = _fallback_parse(requested_kind, text)
        return {"success": True, "provider": "fallback", "ai_enabled": False, "parsed": parsed, "message": f"AI parse failed, so Churvox used safe local extraction: {str(exc)[:160]}"}


def invoice_number(invoice: Dict[str, Any]) -> str:
    return _first(invoice.get("invoice_number"), invoice.get("number"), invoice.get("id"), invoice.get("_id"), "Invoice")


def build_invoice_pdf_bytes(invoice: Dict[str, Any]) -> bytes:
    biz = invoice.get("business_snapshot") or invoice.get("business") or {}
    customer = _first(invoice.get("customer_name"), invoice.get("client_name"), "Customer")
    inv_no = invoice_number(invoice)

    subtotal = _money(invoice.get("subtotal") or invoice.get("amount") or invoice.get("price") or invoice.get("total"))
    gst_rate = _money(invoice.get("gst_rate") or invoice.get("tax_rate") or 15)
    gst_amount = _money(invoice.get("gst_amount") or invoice.get("tax_amount") or subtotal * gst_rate / 100)
    total = _money(invoice.get("total") or subtotal + gst_amount)
    paid = _money(invoice.get("amount_paid"))
    amount_due = _money(invoice.get("amount_due") or max(0, total - paid))

    business_name = _first(biz.get("business_name"), invoice.get("business_name"), "Churvox")
    business_email = _first(biz.get("email"), biz.get("business_email"), invoice.get("business_email"), "")
    business_phone = _first(biz.get("phone"), biz.get("business_phone"), "")
    description = _first(invoice.get("description"), invoice.get("invoice_description"), invoice.get("notes"), "Service work completed.")
    payment = _first(invoice.get("payment_details"), invoice.get("payment_instructions"), invoice.get("bank_details"), "")

    lines = [
        (72, 760, 20, f"Invoice {inv_no}"),
        (72, 732, 12, business_name),
        (72, 714, 10, " ".join(x for x in [business_email, business_phone] if x)),
        (72, 684, 12, f"Bill to: {customer}"),
        (72, 666, 10, _first(invoice.get("customer_email"), invoice.get("client_email"), invoice.get("email"), "")),
        (72, 638, 11, f"Description: {description}"),
        (72, 596, 11, f"Subtotal: {_currency(subtotal)}"),
        (72, 578, 11, f"GST ({gst_rate:g}%): {_currency(gst_amount)}"),
        (72, 560, 12, f"Total: {_currency(total)}"),
        (72, 542, 12, f"Amount due: {_currency(amount_due)}"),
        (72, 504, 10, f"Issued: {datetime.utcnow().strftime('%Y-%m-%d')}"),
        (72, 486, 10, f"Status: {_first(invoice.get('status'), 'sent')}"),
        (72, 448, 10, f"Payment: {payment or 'Payment details provided by the business.'}"),
        (72, 92, 9, "Prepared and sent by Churvox."),
    ]

    stream = ["BT"]
    for x, y, size, text in lines:
        stream.append(f"/F1 {size} Tf {x} {y} Td ({_safe(text)}) Tj")
        stream.append(f"{-x} {-y} Td")
    stream.append("ET")
    stream_bytes = "\n".join(stream).encode("latin-1", errors="replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream_bytes)).encode() + b" >>\nstream\n" + stream_bytes + b"\nendstream",
    ]

    pdf = [b"%PDF-1.4\n"]
    offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(sum(len(x) for x in pdf))
        pdf.append(f"{i} 0 obj\n".encode())
        pdf.append(obj)
        pdf.append(b"\nendobj\n")

    xref = sum(len(x) for x in pdf)
    pdf.append(f"xref\n0 {len(objects)+1}\n".encode())
    pdf.append(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        pdf.append(f"{off:010d} 00000 n \n".encode())
    pdf.append(f"trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return b"".join(pdf)


async def _maybe_await(value: Any) -> Any:
    if hasattr(value, "__await__"):
        return await value
    return value


async def _collection(request: Request, name: str):
    try:
        return _db()[name]
    except Exception:
        return None


async def find_invoice(request: Request, invoice_id: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if body and isinstance(body.get("invoice"), dict):
        return body["invoice"]

    coll = await _collection(request, "invoices")
    if coll is None:
        return body if isinstance(body, dict) and body else {"id": invoice_id, "invoice_number": invoice_id}

    queries = [{"id": invoice_id}, {"invoice_id": invoice_id}, {"invoice_number": invoice_id}]
    oid = _oid(invoice_id)
    if oid:
        queries.append({"_id": oid})

    for query in queries:
        try:
            found = await _maybe_await(coll.find_one(query))
            if found:
                found["_id"] = str(found.get("_id", ""))
                return found
        except Exception:
            pass

    return body if isinstance(body, dict) and body else {"id": invoice_id, "invoice_number": invoice_id}


def send_email_with_pdf(to_email: str, subject: str, html: str, pdf_name: str, pdf_bytes: bytes) -> Dict[str, Any]:
    encoded = base64.b64encode(pdf_bytes).decode("ascii")
    from_email = os.getenv("CHURVOX_FROM_EMAIL") or os.getenv("POSTMARK_FROM_EMAIL") or "hello@churvox.com"

    postmark_token = os.getenv("POSTMARK_SERVER_TOKEN") or os.getenv("POSTMARK_API_TOKEN")
    if postmark_token:
        payload = {
            "From": from_email,
            "To": to_email,
            "Subject": subject,
            "HtmlBody": html,
            "TextBody": re.sub("<[^<]+?>", "", html),
            "Attachments": [{"Name": pdf_name, "Content": encoded, "ContentType": "application/pdf"}],
        }
        req = urllib.request.Request(
            "https://api.postmarkapp.com/email",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json", "Accept": "application/json", "X-Postmark-Server-Token": postmark_token},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as res:
            return {"provider": "postmark", "status": res.status, "body": res.read().decode("utf-8", errors="ignore")}

    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        payload = {
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html,
            "attachments": [{"filename": pdf_name, "content": encoded}],
        }
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {resend_key}"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as res:
            return {"provider": "resend", "status": res.status, "body": res.read().decode("utf-8", errors="ignore")}

    return {"provider": "mock", "status": 200, "body": "PDF generated. Email provider not configured."}


@router.get("/invoices/{invoice_id}/pdf")
async def invoice_pdf(invoice_id: str, request: Request):
    invoice = await find_invoice(request, invoice_id)
    pdf = build_invoice_pdf_bytes(invoice)
    filename = f"invoice-{re.sub(r'[^A-Za-z0-9_-]+', '-', invoice_number(invoice))}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.post("/invoices/{invoice_id}/send-with-pdf")
async def send_invoice_with_pdf(invoice_id: str, request: Request):
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    invoice = await find_invoice(request, invoice_id, body if isinstance(body, dict) else {})

    to_email = _first(
        body.get("to") if isinstance(body, dict) else "",
        invoice.get("customer_email"),
        invoice.get("client_email"),
        invoice.get("email"),
        invoice.get("billing_email"),
    )
    if not to_email:
        raise HTTPException(status_code=400, detail="Customer email is required to send invoice PDF.")

    pdf = build_invoice_pdf_bytes(invoice)
    inv_no = invoice_number(invoice)
    filename = f"invoice-{re.sub(r'[^A-Za-z0-9_-]+', '-', inv_no)}.pdf"

    subject = _first(body.get("subject") if isinstance(body, dict) else "", f"Invoice {inv_no}")
    html = _first(
        body.get("html") if isinstance(body, dict) else "",
        f"<p>Hi,</p><p>Please find invoice <strong>{inv_no}</strong> attached as a PDF.</p><p>Thanks,<br/>Churvox</p>",
    )

    result = send_email_with_pdf(to_email, subject, html, filename, pdf)
    return JSONResponse({
        "success": True,
        "email_sent": result.get("provider") != "mock",
        "provider": result.get("provider"),
        "pdf_attached": True,
        "filename": filename,
    })
