from __future__ import annotations

from collections import Counter
from copy import deepcopy
from datetime import datetime, timezone, timedelta
import asyncio
import hashlib
import json
import re
import time
from statistics import median
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request

try:
    from churvox_command_human_mimic_routes import build_command_human_mimic_router
except Exception:
    from .churvox_command_human_mimic_routes import build_command_human_mimic_router


HUMAN_MIMIC_VERSION = "human-mimic-intelligence-v3"
HUMAN_MIMIC_GUARD = "human-mimic-strict-preflight-v3"
HUMAN_MIMIC_PERFORMANCE = "churvox-command-scan-performance-v18-20260714"
SAFE_RESULT = "Owner approval required. Nothing was sent, synced, charged or changed."
OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]
OWNER_ROLES = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}
ROLE_NAMES = [
    "Office Manager",
    "Receptionist",
    "Bookkeeper",
    "Accountant",
    "Payroll Clerk",
    "Client Memory",
    "Quality Checker",
    "Operations Manager",
]


class _InsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class _CaptureCollection:
    def __init__(self, name, real_collection, capture, ObjectId):
        self.name = name
        self.real_collection = real_collection
        self.capture = capture
        self.ObjectId = ObjectId

    async def insert_one(self, doc):
        self.capture.setdefault(self.name, []).append(deepcopy(doc))
        try:
            inserted_id = self.ObjectId()
        except Exception:
            inserted_id = f"captured-{len(self.capture[self.name])}"
        return _InsertResult(inserted_id)

    def __getattr__(self, name):
        return getattr(self.real_collection, name)


class _CaptureDB:
    def __init__(self, real_db, ObjectId):
        self.real_db = real_db
        self.ObjectId = ObjectId
        self.capture = {}
        self.proxies = {}

    def __getitem__(self, name):
        if name not in self.proxies:
            self.proxies[name] = _CaptureCollection(name, self.real_db[name], self.capture, self.ObjectId)
        return self.proxies[name]

    def __getattr__(self, name):
        return self[name]


def build_command_human_mimic_v3_router(db, get_current_user, ObjectId):
    router = APIRouter()

    def now():
        return datetime.now(timezone.utc)

    def clean(value, fallback="", limit=1800):
        try:
            text = " ".join(str(value or "").strip().split())
        except Exception:
            text = ""
        return text[:limit] or fallback

    def lower(value):
        return clean(value, "").lower()

    def serial(value):
        if isinstance(value, list):
            return [serial(item) for item in value]
        if isinstance(value, dict):
            return {key: serial(item) for key, item in value.items()}
        if isinstance(value, datetime):
            return value.isoformat()
        try:
            if isinstance(value, ObjectId):
                return str(value)
        except Exception:
            pass
        return value

    def doc_out(doc):
        out = dict(doc or {})
        if "_id" in out:
            out["id"] = str(out.pop("_id"))
        return serial(out)

    def has_value(value):
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        if isinstance(value, (list, tuple, set, dict)):
            return bool(value)
        return True

    def first(row, keys, fallback=""):
        for key in keys:
            value = (row or {}).get(key)
            if has_value(value):
                return value
        return fallback

    def maybe_oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    def id_values(value):
        values = []
        raw = clean(value, "", 180)
        if raw:
            values.append(raw)
        oid = maybe_oid(raw)
        if oid is not None:
            values.append(oid)
        return values

    async def require_owner(request: Request):
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated")
        role = lower((user or {}).get("role"))
        if role not in OWNER_ROLES and not (user or {}).get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can run Command intelligence")
        if not clean((user or {}).get("business_id") or (user or {}).get("id"), ""):
            raise HTTPException(status_code=400, detail="Business id is missing")
        return user

    def business_id(user):
        return clean((user or {}).get("business_id") or (user or {}).get("id"), "", 180)

    def business_clause(user_business_id):
        values = [user_business_id]
        oid = maybe_oid(user_business_id)
        if oid is not None:
            values.append(oid)
        return {"$or": [
            {"business_id": {"$in": values}},
            {"businessId": {"$in": values}},
            {"contractor_id": {"$in": values}},
            {"owner_id": {"$in": values}},
            {"ownerId": {"$in": values}},
        ]}

    async def scoped_rows(user_business_id, names, limit=240, errors=None):
        query = business_clause(user_business_id)

        async def load_collection(name):
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    cursor = cursor.sort("_id", -1)
                try:
                    cursor = cursor.max_time_ms(1800)
                except Exception:
                    pass
                found = await asyncio.wait_for(cursor.limit(limit).to_list(limit), timeout=2.5)
                return [{**dict(item), "_collection": name} for item in found]
            except Exception as exc:
                if errors is not None:
                    errors.append(f"{name}: {exc.__class__.__name__}")
                return []

        batches = await asyncio.gather(*(load_collection(name) for name in names))
        rows = [row for batch in batches for row in batch]
        return rows[:limit]

    def row_ids(row):
        values = []
        for key in ["_id", "id", "record_id", "job_id", "invoice_id", "client_id", "message_id", "timer_id", "number", "invoice_number"]:
            value = (row or {}).get(key)
            if has_value(value):
                values.extend(id_values(value))
        return {str(value) for value in values}

    def find_source(rows, source_id):
        target = str(source_id or "")
        for row in rows:
            if target and target in row_ids(row):
                return row
        return None

    def status_text(row):
        return lower(first(row, ["status", "job_status", "invoice_status", "payment_status", "state"], ""))

    def status_words(row):
        return set(re.findall(r"[a-z0-9]+", status_text(row).replace("_", " ").replace("-", " ")))

    def explicitly_complete(row):
        words = status_words(row)
        false_complete = "incomplete" in words or ("not" in words and bool(words & {"complete", "completed"})) or status_text(row) in {"pending completion", "awaiting completion"}
        explicit = (row or {}).get("completed") is True or has_value((row or {}).get("completed_at")) or bool(words & {"complete", "completed", "done", "finished", "closed"})
        return bool(explicit and not false_complete)

    def cancelled(row):
        return bool(status_words(row) & {"cancelled", "canceled", "deleted", "archived", "void"})

    def strict_amount(value):
        if isinstance(value, bool) or value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        raw = clean(value, "")
        if not raw:
            return 0.0
        if not (raw.startswith("$") or re.fullmatch(r"-?\d[\d,]*(?:\.\d+)?", raw)):
            return 0.0
        try:
            return float(raw.replace("$", "").replace(",", ""))
        except Exception:
            return 0.0

    def money(value):
        return f"${value:,.2f}" if value > 0 else ""

    def explicit_rate(row):
        value = first(row, ["gst_rate", "tax_rate", "default_tax_rate"], 0)
        number = strict_amount(value)
        if number > 1:
            number = number / 100.0
        return number if 0 < number < 1 else 0.0

    def tax_inclusive(row):
        for key in ["prices_include_gst", "gst_included", "tax_inclusive", "includes_tax", "price_includes_tax"]:
            if key not in (row or {}):
                continue
            value = (row or {}).get(key)
            if isinstance(value, bool):
                return value
            text = lower(value)
            if text in {"true", "yes", "included", "inclusive", "inc", "1"}:
                return True
            if text in {"false", "no", "excluded", "exclusive", "ex", "0"}:
                return False
        return None

    def business_tax_context(settings):
        for row in settings:
            rate = explicit_rate(row)
            if rate:
                return rate, tax_inclusive(row), clean(first(row, ["title", "business_name", "name"], "business settings"), "business settings")
        return 0.0, None, "business settings"

    def parse_date(value):
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        raw = clean(value, "")
        if not raw:
            return None
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            pass
        for fmt in ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y", "%d-%m-%Y", "%d %B %Y", "%d %b %Y"]:
            try:
                return datetime.strptime(raw[:19], fmt).replace(tzinfo=timezone.utc)
            except Exception:
                continue
        return None

    def record_date(row):
        return parse_date(first(row, ["scheduled_date", "schedule_date", "start_date", "date", "appointment_at", "completed_at", "updated_at", "created_at"], ""))

    def due_date(row):
        return parse_date(first(row, ["due_date", "payment_due_date", "date_due"], ""))

    def note_text(row):
        return clean(first(row, ["worker_note", "completion_note", "note", "notes", "description", "message", "body", "text", "client_preference"], ""), "", 2400)

    def client_key(row):
        return lower(first(row, ["client_id", "customer_id", "client", "customer", "client_name", "customer_name", "name"], ""))

    def service_key(row):
        return lower(first(row, ["service_type", "service", "job_type", "title", "job_title"], ""))

    def worker_key(row):
        return lower(first(row, ["worker_id", "assigned_worker_id", "staff_id", "employee_id", "worker_name", "staff_name", "worker", "assigned_to"], ""))

    def title_of(row, fallback="record"):
        return clean(first(row, ["title", "job_title", "name", "client_name", "customer_name", "invoice_number", "number", "subject", "description"], fallback), fallback, 300)

    def client_name(row, fallback="Client not named in record"):
        return clean(first(row, ["client_name", "customer_name", "client", "customer", "name"], fallback), fallback, 240)

    def worker_name(row, fallback=""):
        return clean(first(row, ["worker_name", "assigned_worker_name", "staff_name", "employee_name", "worker", "assigned_to"], fallback), fallback, 240)

    def has_proof(row):
        return has_value(first(row, ["proof", "proof_url", "completion_photo", "photos", "images", "attachments"], ""))

    def explicit_cycle_days(job):
        text = lower(first(job, ["recurrence", "frequency", "repeat", "repeat_every", "cycle"], ""))
        if "fortnight" in text or "2 week" in text:
            return 14, "explicit recurring rule"
        if "3 week" in text:
            return 21, "explicit recurring rule"
        if "4 week" in text or "monthly" in text or "month" in text:
            return 28, "explicit recurring rule"
        if "weekly" in text or "1 week" in text:
            return 7, "explicit recurring rule"
        if "daily" in text:
            return 1, "explicit recurring rule"
        number = strict_amount(first(job, ["repeat_every", "frequency_value", "interval"], 0))
        unit = lower(first(job, ["repeat_unit", "frequency_unit", "interval_unit"], ""))
        if number > 0 and unit:
            if "day" in unit:
                return int(number), "explicit recurring rule"
            if "week" in unit:
                return int(number * 7), "explicit recurring rule"
            if "month" in unit:
                return int(number * 28), "explicit recurring rule"
        return 0, ""

    def robust_cycle(job, jobs):
        explicit, source = explicit_cycle_days(job)
        if explicit:
            return explicit, source, 1
        client = client_key(job)
        service = service_key(job)
        dates = []
        for row in jobs:
            if not explicitly_complete(row):
                continue
            if client and client_key(row) != client:
                continue
            if service and service_key(row) and service_key(row) != service:
                continue
            value = record_date(row)
            if value is not None and value <= now():
                dates.append(value)
        dates = sorted(set(dates))
        gaps = [(dates[index] - dates[index - 1]).days for index in range(1, len(dates))]
        gaps = [gap for gap in gaps if 1 <= gap <= 120]
        if len(gaps) < 2:
            return 0, "fewer than three matching visits", len(dates)
        middle = float(median(gaps))
        tolerance = max(3.0, middle * 0.25)
        if max(abs(gap - middle) for gap in gaps) > tolerance:
            return 0, "matching visit gaps are inconsistent", len(dates)
        return int(round(middle)), f"stable median across {len(dates)} matching client/service visits", len(dates)

    def reliable_worker(job, jobs):
        client = client_key(job)
        service = service_key(job)
        names = []
        for row in jobs:
            if not explicitly_complete(row):
                continue
            if client and client_key(row) != client:
                continue
            if service and service_key(row) and service_key(row) != service:
                continue
            name = worker_name(row, "")
            if name:
                names.append(name)
        if not names:
            return "", 0
        name, count = Counter(names).most_common(1)[0]
        return (name, count) if count >= 2 else ("", count)

    def latest_matching_visit(job, jobs):
        client = client_key(job)
        service = service_key(job)
        dates = []
        for row in jobs:
            if not explicitly_complete(row):
                continue
            if client and client_key(row) != client:
                continue
            if service and service_key(row) and service_key(row) != service:
                continue
            value = record_date(row)
            if value is not None and value <= now():
                dates.append(value)
        return max(dates) if dates else None

    def historical_extra_reference(job, jobs):
        current = row_ids(job)
        client = client_key(job)
        service = service_key(job)
        values = []
        for row in jobs:
            if current & row_ids(row):
                continue
            if client and client_key(row) != client:
                continue
            if service and service_key(row) and service_key(row) != service:
                continue
            value = strict_amount(first(row, ["extra_amount", "extras_total", "additional_charge"], 0))
            if value > 0:
                values.append(value)
        return float(median(values[-5:])) if values else 0.0

    def timer_hours(row):
        direct = strict_amount(first(row, ["hours", "duration_hours"], 0))
        if 0 < direct <= 24:
            return direct
        minutes = strict_amount(first(row, ["duration_minutes", "minutes"], 0))
        if minutes > 0:
            return minutes / 60.0
        seconds = strict_amount(first(row, ["duration_seconds", "seconds"], 0))
        if seconds > 0:
            return seconds / 3600.0
        raw = strict_amount((row or {}).get("duration"))
        unit = lower(first(row, ["duration_unit", "unit"], ""))
        if raw > 0 and "second" in unit:
            return raw / 3600.0
        if raw > 0 and "minute" in unit:
            return raw / 60.0
        if 0 < raw <= 24:
            return raw
        return 0.0

    def timer_baseline(timer, timers):
        key = worker_key(timer)
        current_ids = row_ids(timer)
        values = []
        for row in timers:
            if current_ids & row_ids(row):
                continue
            if key and worker_key(row) != key:
                continue
            value = timer_hours(row)
            if 0.1 <= value <= 18:
                values.append(value)
        if len(values) < 3:
            return 0.0, len(values)
        return float(median(values[-12:])), len(values)

    def normalized_memory(value):
        redacted = redact_secrets(value)
        words = [word for word in re.findall(r"[a-z0-9]+", lower(redacted)) if word not in {"the", "a", "an", "and", "or", "to", "for", "is", "at", "on"}]
        return " ".join(words)

    def memory_candidate(note):
        text = lower(note)
        if len(text) < 8:
            return False
        return bool(re.search(r"\b(gate|access|key|alarm|dog|allerg(?:y|ic)|sensitiv(?:e|ity)|prefers?|always|never|colour|color|parking|entry|contact before|text before)\b", text))

    def redact_secrets(note):
        text = clean(note, "", 2400)
        patterns = [
            r"(?i)\b((?:gate|alarm|door|lock|access)\s*(?:code|pin)?\s*(?:is|:|#|-)?\s*)\d{3,10}\b",
            r"(?i)\b((?:code|pin)\s*(?:is|:|#|-)?\s*)\d{3,10}\b",
        ]
        for pattern in patterns:
            text = re.sub(pattern, r"\1[REDACTED — owner must enter securely]", text)
        return text

    def duplicate_memory(note, source, clients):
        target = normalized_memory(note)
        if not target:
            return False
        target_words = set(target.split())
        key = client_key(source)
        for row in clients:
            if key and client_key(row) and client_key(row) != key:
                continue
            existing = normalized_memory(first(row, ["notes", "memory", "preferences", "access_notes", "client_notes"], ""))
            if not existing:
                continue
            if target in existing or existing in target:
                return True
            existing_words = set(existing.split())
            union = target_words | existing_words
            if union and len(target_words & existing_words) / len(union) >= 0.8:
                return True
        return False

    def linked_invoice_exists(user_business_id, job, invoices):
        refs = row_ids(job)
        if not refs:
            return False
        for invoice in invoices:
            if cancelled(invoice):
                continue
            linked = set()
            for key in ["job_id", "jobId", "source_job_id", "related_job_id"]:
                linked.update(str(value) for value in id_values((invoice or {}).get(key)))
            if refs & linked:
                return True
        return False

    def payload_of(doc):
        payload = doc.get("payload")
        if not isinstance(payload, dict):
            payload = {}
            doc["payload"] = payload
        return payload

    def set_field(doc, label, value, source, confidence_score, missing_action=""):
        payload = payload_of(doc)
        prepared = payload.setdefault("prepared_form", {})
        sources = payload.setdefault("field_sources", {})
        prepared[label] = value
        sources[label] = {
            "value": value,
            "source": clean(source, "strict v3 preflight", 300),
            "confidence": round(max(0.1, min(float(confidence_score), 0.99)), 2),
            "missing_action": clean(missing_action, "", 240),
        }

    def set_missing(doc, missing, required_fields):
        payload = payload_of(doc)
        payload["missing"] = list(dict.fromkeys(clean(item, "", 300) for item in missing if clean(item, "")))
        payload["required_fields"] = list(dict.fromkeys(required_fields))
        payload["approval_blocked"] = bool(required_fields)
        prepared = payload.setdefault("prepared_form", {})
        prepared["Owner check before approval"] = " · ".join(payload["missing"]) if payload["missing"] else "No critical information is missing, but the owner can still edit every field."

    def set_confidence(doc, score, reasons):
        payload = payload_of(doc)
        payload["confidence"] = {
            "score": round(max(0.1, min(float(score), 0.99)), 2),
            "why": [clean(item, "", 240) for item in reasons if clean(item, "")][:6],
        }

    def evidence(doc, rows):
        payload_of(doc)["evidence"] = [clean(item, "", 500) for item in rows if clean(item, "")][:8]

    def mark_v3(doc):
        payload = payload_of(doc)
        payload["human_mimic_intelligence_v3"] = True
        payload["human_mimic_intelligence_v2"] = True
        payload["engine_version"] = HUMAN_MIMIC_VERSION
        payload["guard"] = HUMAN_MIMIC_GUARD
        payload["strict_preflight_passed"] = True
        payload["prepared_only"] = True
        payload["owner_review_only"] = True
        payload["no_auto_send"] = True
        payload["no_auto_sync"] = True
        payload["no_auto_charge"] = True
        payload["no_auto_record_change"] = True
        doc.update({
            "prepared_only": True,
            "owner_review_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            "office_engine": True,
            "updated_at": now(),
        })

    def fingerprint(doc):
        payload = payload_of(doc)
        raw = {
            "source_type": doc.get("source_type"),
            "source_id": str(doc.get("source_id") or ""),
            "action_type": doc.get("action_type"),
            "prepared_form": payload.get("prepared_form") or {},
            "missing": payload.get("missing") or [],
            "evidence": payload.get("evidence") or [],
        }
        return hashlib.sha256(json.dumps(serial(raw), sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()

    def harden_invoice(doc, job, context):
        if not job or cancelled(job) or not explicitly_complete(job):
            return None
        if context["linked_jobs"].get(str(doc.get("source_id") or "")):
            return None
        base = strict_amount(first(job, ["price", "amount", "total", "quoted_price", "job_total", "charge", "base_price"], 0))
        note = note_text(job)
        mentions_extra = bool(re.search(r"\b(extra|additional|materials?|green waste|variation)\b", lower(note)))
        explicit_extra = strict_amount(first(job, ["extra_amount", "extras_total", "additional_charge"], 0))
        history = historical_extra_reference(job, context["jobs"]) if mentions_extra and explicit_extra <= 0 else 0.0
        rate = explicit_rate(job) or context["business_rate"]
        inclusive = tax_inclusive(job)
        if inclusive is None:
            inclusive = context["business_inclusive"]
        subtotal = max(base, 0) + max(explicit_extra, 0)
        gst = 0.0
        total = subtotal
        treatment = "Owner must confirm GST/tax treatment"
        if rate and inclusive is True and subtotal > 0:
            gst = subtotal * rate / (1 + rate)
            treatment = f"GST-inclusive at {rate * 100:g}%"
        elif rate and inclusive is False and subtotal > 0:
            gst = subtotal * rate
            total = subtotal + gst
            treatment = f"GST added at {rate * 100:g}%"
        client = client_name(job)
        required = []
        missing = []
        if client.startswith("Client not named"):
            required.append("Client")
            missing.append("Choose the client before approving the invoice draft.")
        if base <= 0:
            required.append("Base service amount")
            missing.append("Enter the base service amount; no reliable price was found.")
        if mentions_extra and explicit_extra <= 0:
            required.append("Extra work amount")
            missing.append("Extra work is mentioned, but Churvox will not copy a historical charge into this invoice. Enter the real amount or remove the line.")
        if not rate:
            required.append("GST / tax rate")
            missing.append("Confirm the GST/tax rate.")
        if rate and inclusive is None:
            required.append("Tax treatment")
            missing.append("Confirm whether prices include GST/tax.")
        line_items = [{"label": "Base service", "amount": money(base) or "Owner to enter"}]
        if mentions_extra or explicit_extra > 0:
            line_items.append({"label": "Extra work", "amount": money(explicit_extra) or "Owner to enter"})
        set_field(doc, "Client", client, "completed job client field", 0.96 if not client.startswith("Client not named") else 0.25, "Choose client")
        set_field(doc, "Base service amount", money(base) or "Owner to enter", "explicit job price field only", 0.94 if base > 0 else 0.25, "Enter amount")
        set_field(doc, "Extra work amount", money(explicit_extra) or ("Owner to enter" if mentions_extra else "$0.00"), "explicit extra field only; history is reference, never a charge", 0.96 if explicit_extra > 0 else 0.25 if mentions_extra else 0.99, "Enter real extra amount")
        set_field(doc, "Historical extra reference", money(history) if history > 0 else "No matching historical extra", "matching client and service history; reference only", 0.62 if history > 0 else 0.9)
        set_field(doc, "Line items", line_items, "explicit job amounts only", 0.92 if base > 0 and not required else 0.45, "Check amounts")
        set_field(doc, "GST / tax rate", f"{rate * 100:g}%" if rate else "Owner to confirm", "explicit job rate then business settings", 0.9 if rate else 0.25, "Confirm rate")
        set_field(doc, "Tax treatment", treatment, "explicit inclusive/exclusive field then business settings", 0.9 if inclusive is not None else 0.25, "Confirm treatment")
        set_field(doc, "GST amount", money(gst) or "Calculated after confirmation", "calculated from explicit approved amounts", 0.88 if gst > 0 or (rate and subtotal > 0) else 0.3)
        set_field(doc, "Draft total", money(total) or "Owner to enter", "explicit approved amounts plus confirmed tax treatment", 0.9 if total > 0 and not required else 0.4, "Check total")
        set_missing(doc, missing, required)
        set_confidence(doc, 0.94 if not required else 0.56, ["Job is explicitly complete", "Linked invoices checked", "Only explicit charges used", "Historical extras kept reference-only", "GST context checked"])
        evidence(doc, [f"Job status: {status_text(job) or 'complete'}", f"Client: {client}", f"Base amount: {money(base) or 'missing'}", f"Explicit extra: {money(explicit_extra) or 'missing'}", f"Historical extra reference: {money(history) or 'none'}", f"Completion note: {redact_secrets(note) or 'none'}"])
        doc["found"] = f"{title_of(job, 'Completed job')} is explicitly complete and has no linked invoice."
        doc["prepared"] = "Bookkeeper prepared a draft using explicit job amounts only. Historical charges are shown as reference and never copied into the invoice."
        return doc

    def harden_booking(doc, job, context):
        if not job or cancelled(job) or explicitly_complete(job) and not (first(job, ["recurring", "is_recurring", "recurrence", "frequency", "repeat_every", "cycle"], "")):
            return None
        recurring = bool(first(job, ["recurring", "is_recurring", "recurrence", "frequency", "repeat_every", "cycle"], ""))
        has_next = has_value(first(job, ["next_date", "next_run_at", "next_job_date", "next_service_date"], ""))
        if not recurring or has_next:
            return None
        cycle, source, visits = robust_cycle(job, context["jobs"])
        last_visit = latest_matching_visit(job, context["jobs"])
        suggested = last_visit + timedelta(days=cycle) if last_visit and cycle else None
        while suggested and suggested < now():
            suggested += timedelta(days=cycle)
        worker, worker_count = reliable_worker(job, context["jobs"])
        client = client_name(job)
        missing = []
        required = []
        if client.startswith("Client not named"):
            required.append("Client")
            missing.append("Choose the client.")
        if not cycle:
            required.append("Suggested booking date/time")
            missing.append(f"No reliable repeat cycle was found: {source}. Choose the next date and time manually.")
        else:
            required.append("Suggested booking date/time")
            missing.append("Churvox can suggest the date, but it will not invent an exact appointment time. Confirm the date and enter the real time.")
        date_value = suggested.strftime("%A %d %B %Y — owner to enter time") if suggested else "Owner to choose date and time"
        set_field(doc, "Client", client, "recurring job client field", 0.95 if not client.startswith("Client not named") else 0.25, "Choose client")
        set_field(doc, "Usual cycle", f"Every {cycle} days" if cycle else "No reliable cycle", source, 0.94 if cycle and source == "explicit recurring rule" else 0.82 if cycle else 0.25, "Choose cycle")
        set_field(doc, "Matching history", f"{visits} matching client/service visit(s)", "same client and same service only", 0.9 if visits >= 3 else 0.45)
        set_field(doc, "Last matching visit", last_visit.strftime("%A %d %B %Y") if last_visit else "Not found", "latest same-client same-service visit", 0.9 if last_visit else 0.25)
        set_field(doc, "Suggested booking date/time", date_value, "explicit cycle or stable three-visit history; exact time never inferred", 0.86 if suggested else 0.25, "Confirm date and enter time")
        set_field(doc, "Worker", worker or "Owner to choose or leave unassigned", f"same client/service worker used at least twice ({worker_count} match(es))" if worker else "insufficient matching worker history", 0.88 if worker else 0.3)
        set_field(doc, "Prepared customer message", f"Hi {client if not client.startswith('Client not named') else ''}, your usual service may be due around {suggested.strftime('%A %d %B %Y') if suggested else '[date to confirm]'}. Would that suit?".strip(), "cautious receptionist wording; no time promised", 0.82 if suggested else 0.45)
        set_missing(doc, missing, required)
        set_confidence(doc, 0.9 if cycle and source == "explicit recurring rule" else 0.78 if cycle else 0.42, ["Same client and service matched", "At least three visits required for inferred cycle", "Inconsistent gaps rejected", "Exact time left unresolved", "Worker suggestion requires two matches"])
        evidence(doc, [f"Client: {client}", f"Service: {service_key(job) or 'not found'}", f"Cycle result: {cycle or 'unresolved'} ({source})", f"Matching visits: {visits}", f"Last visit: {last_visit.isoformat() if last_visit else 'missing'}", f"Worker match: {worker or 'not reliable'}"])
        doc["prepared"] = "Receptionist used an explicit rule or stable same-client, same-service history. It did not infer a cycle from one gap, mix services, or invent an appointment time."
        return doc

    def harden_assignment(doc, job):
        if not job or cancelled(job) or explicitly_complete(job):
            return None
        status = status_text(job)
        words = status_words(job)
        unresolved_completion = (
            "incomplete" in words
            or ("not" in words and bool(words & {"complete", "completed"}))
            or status in {"pending completion", "awaiting completion"}
        )
        if unresolved_completion:
            return None
        scheduled = record_date(job)
        worker = worker_name(job, "")
        if scheduled is not None and worker:
            return None
        required = []
        missing = []
        if scheduled is None:
            required.append("Date / time")
            missing.append("Choose a real date and time.")
        if not worker:
            required.append("Worker")
            missing.append("Choose a worker or explicitly confirm the job should remain unassigned.")
        set_field(doc, "Date / time", scheduled.strftime("%A %d %B %Y %H:%M") if scheduled else "Owner to choose date/time", "job schedule fields", 0.94 if scheduled else 0.25, "Choose date/time")
        set_field(doc, "Worker", worker or "Owner to choose worker", "job assignment fields", 0.94 if worker else 0.25, "Choose worker")
        set_missing(doc, missing, required)
        set_confidence(doc, 0.96, ["Job is open", "Cancelled/completed statuses excluded", "Schedule checked", "Assignment checked"])
        return doc

    def harden_followup(doc, invoice):
        if not invoice or cancelled(invoice):
            return None
        words = status_words(invoice)
        if words & {"draft", "unsent", "void", "cancelled", "canceled", "deleted", "archived", "paid", "settled"} or status_text(invoice) in {"closed", "payment received", "fully paid"}:
            return None
        balance = strict_amount(first(invoice, ["balance_due", "amount_due", "balance", "outstanding"], 0))
        due = due_date(invoice)
        if balance <= 0 or due is None or due > now():
            return None
        client = client_name(invoice)
        missing = []
        required = []
        if client.startswith("Client not named"):
            required.append("Client")
            missing.append("Choose the client before approving the reminder draft.")
        days = max(0, (now() - due).days)
        tone = "Friendly check-in" if days < 14 else "Clear professional reminder" if days < 30 else "Firm professional reminder; consider calling first"
        reminder = f"Hi {client if not client.startswith('Client not named') else ''}, just checking in on {title_of(invoice, 'the invoice')} for {money(balance)}. It was due {due.strftime('%A %d %B %Y')}. Please let us know if you need it resent or want to discuss it.".strip()
        set_field(doc, "Client", client, "invoice client field", 0.95 if not client.startswith("Client not named") else 0.25, "Choose client")
        set_field(doc, "Outstanding amount", money(balance), "outstanding balance field only; invoice total is not treated as balance", 0.96)
        set_field(doc, "Due date", due.strftime("%A %d %B %Y"), "invoice due date", 0.97)
        set_field(doc, "Days overdue", str(days), "current date minus due date", 0.99)
        set_field(doc, "Tone", tone, "age-based collection rule", 0.9)
        set_field(doc, "Prepared reminder", reminder, "confirmed balance, past due date and cautious wording", 0.9 if not required else 0.55)
        set_missing(doc, missing, required)
        set_confidence(doc, 0.95 if not required else 0.62, ["Draft/paid/void statuses excluded", "Positive outstanding balance confirmed", "Past due date confirmed", "Invoice total not substituted for balance", "No message sent"])
        evidence(doc, [f"Invoice status: {status_text(invoice) or 'not labelled'}", f"Outstanding balance: {money(balance)}", f"Due date: {due.isoformat()}", f"Days overdue: {days}"])
        return doc

    def message_requires_reply(message):
        body = note_text(message)
        if not body:
            return False
        direction = lower(first(message, ["direction", "message_type", "source", "type"], ""))
        status = lower(first(message, ["reply_status", "status", "state"], ""))
        if any(marker in direction for marker in ["outbound", "office_to_client", "business_to_client", "sent_by_business", "from_business"]):
            return False
        if any(marker in status for marker in ["replied", "resolved", "closed", "done", "ignored", "archived"]):
            return False
        inbound = any(marker in direction for marker in ["inbound", "incoming", "from_client", "from_customer", "customer_to_business", "client_to_business"])
        needs_reply = status in {"unread", "needs_reply", "needs reply", "open", "waiting"}
        if not inbound and not needs_reply:
            return False
        text = lower(body)
        request_words = bool(re.search(r"\b(can|could|would|when|where|how|what|why|book|available|appointment|schedule|invoice|price|cost|charge|payment|late|delay|change|cancel|help|please)\b", text)) or "?" in body
        acknowledgement = bool(re.fullmatch(r"[\s\W]*(thanks|thank you|great|perfect|awesome|ok|okay|cheers|all good)[\s\W]*", text))
        informational_preference = memory_candidate(body) and not request_words
        if informational_preference:
            return False
        return bool(request_words or not acknowledgement)

    def harden_reply(doc, message):
        if not message or not message_requires_reply(message):
            return None
        body = note_text(message)
        client = client_name(message, "Client not named in message")
        required = []
        missing = []
        if client.startswith("Client not named"):
            required.append("Client")
            missing.append("Confirm which client this message belongs to.")
        set_field(doc, "Original message", redact_secrets(body), "confirmed inbound message", 0.98)
        set_field(doc, "Client", client, "message sender/client field", 0.9 if not required else 0.25, "Choose client")
        set_missing(doc, missing, required)
        set_confidence(doc, 0.9 if not required else 0.58, ["Inbound direction confirmed", "Already-replied/resolved statuses excluded", "Acknowledgement-only messages suppressed", "Reply avoids unverified promises"])
        evidence(doc, [f"Direction: {first(message, ['direction', 'message_type', 'source', 'type'], 'not labelled')}", f"Reply status: {first(message, ['reply_status', 'status', 'state'], 'not labelled')}", f"Client: {client}", f"Message: {redact_secrets(body)}"])
        return doc

    def harden_hours(doc, timer, context):
        if not timer:
            return None
        end = first(timer, ["ended_at", "end", "clock_out", "end_time"], "")
        duration = timer_hours(timer)
        baseline, sample_count = timer_baseline(timer, context["timers"])
        threshold = max(10.0, baseline * 1.75) if baseline else 10.0
        open_timer = not has_value(end)
        unusual = duration >= threshold if duration > 0 else False
        if not open_timer and not unusual:
            return None
        worker = worker_name(timer, "Worker not named in record")
        note = note_text(timer)
        required = []
        missing = []
        if worker.startswith("Worker not named"):
            required.append("Worker")
            missing.append("Choose the worker.")
        if open_timer:
            required.append("End")
            missing.append("Clock-off time is missing; ask the worker or enter it.")
        if unusual and not note:
            required.append("Staff note")
            missing.append("The time is above the worker baseline and has no explanation.")
        set_field(doc, "Worker", worker, "timer worker field", 0.95 if not worker.startswith("Worker not named") else 0.25, "Choose worker")
        set_field(doc, "Recorded hours", f"{duration:.2f}" if duration > 0 else "Not reliably calculated", "hours field, or explicit minutes/seconds converted to hours", 0.94 if duration > 0 else 0.3)
        set_field(doc, "Normal worker baseline", f"{baseline:.2f} hours across {sample_count} valid entries" if baseline else f"Not enough history ({sample_count} valid entries)", "median requires at least three same-worker entries", 0.88 if baseline else 0.42)
        set_field(doc, "Threshold", f"{threshold:.2f} hours", "worker baseline × 1.75, never below 10 hours", 0.9)
        set_field(doc, "End", clean(end, "Owner to enter"), "timer clock-off field", 0.94 if end else 0.25, "Enter end time")
        set_field(doc, "Staff note", note or "Owner to ask worker", "worker note", 0.86 if note else 0.25, "Ask worker")
        set_missing(doc, missing, required)
        set_confidence(doc, 0.92 if baseline and not required else 0.62, ["Seconds/minutes normalized before comparison", "At least three entries required for worker baseline", "Open timer checked", "Explanation checked"])
        evidence(doc, [f"Worker: {worker}", f"Recorded hours: {duration:.2f}" if duration else "Recorded hours unresolved", f"Baseline: {baseline:.2f}" if baseline else "No reliable baseline", f"Baseline samples: {sample_count}", f"Clock-off: {clean(end, 'missing')}", f"Note: {redact_secrets(note) or 'none'}"])
        return doc

    def harden_quality(doc, job):
        if not job or cancelled(job) or not explicitly_complete(job):
            return None
        missing_items = []
        if not has_proof(job):
            missing_items.append("final photo/proof")
        if not note_text(job):
            missing_items.append("completion note")
        if not missing_items:
            return None
        set_confidence(doc, 0.97, ["Job explicitly complete", "False-completion statuses excluded", "Proof fields checked", "Completion note checked", "Invoice hold remains owner-controlled"])
        evidence(doc, [f"Job status: {status_text(job)}", f"Proof present: {'yes' if has_proof(job) else 'no'}", f"Completion note: {redact_secrets(note_text(job)) or 'missing'}"])
        return doc

    def harden_memory(doc, source, context):
        if not source:
            return None
        raw_note = note_text(source)
        if not memory_candidate(raw_note) or duplicate_memory(raw_note, source, context["clients"]):
            return None
        safe_note = redact_secrets(raw_note)
        sensitive = safe_note != raw_note or bool(re.search(r"\b(gate|access|key|alarm|dog|parking|entry)\b", lower(raw_note)))
        required = []
        missing = []
        if sensitive:
            required.append("Restricted visibility")
            missing.append("Confirm this access/safety detail is appropriate to retain and who may see it. Any likely PIN/code is redacted from Command.")
        set_field(doc, "Memory note", safe_note, "source note with likely access codes redacted", 0.88)
        set_field(doc, "Memory type", "Restricted access/safety detail" if sensitive else "Service preference / useful working detail", "context and sensitivity check", 0.9)
        set_field(doc, "Duplicate check", "No materially similar client memory found", "same-client normalized similarity check", 0.9)
        if sensitive:
            set_field(doc, "Restricted visibility", "Owner to confirm permitted visibility", "privacy guard", 0.25, "Confirm visibility")
        set_missing(doc, missing, required)
        set_confidence(doc, 0.88 if not sensitive else 0.68, ["Useful-detail context checked", "Same-client duplicate similarity checked", "Likely codes/PINs redacted", "Sensitive visibility requires owner confirmation"])
        evidence(doc, [f"Client: {client_name(source, 'not named')}", f"Source: {title_of(source, 'source record')}", f"Redacted note: {safe_note}", f"Sensitive: {'yes' if sensitive else 'no'}"])
        return doc

    def harden_accounting(doc, source, context):
        source = source or {}
        collection = clean(source.get("_collection"), "")
        is_setting = collection in {"businesses", "business_settings", "settings"} or str(doc.get("source_id") or "").startswith("business-tax-settings")
        business_rate = context["business_rate"]
        business_inclusive = context["business_inclusive"]
        row_rate = explicit_rate(source)
        row_inclusive = tax_inclusive(source)
        export_status = lower(first(source, ["accounting_status", "export_status", "sync_status"], ""))
        conflict = bool(row_rate and business_rate and abs(row_rate - business_rate) > 0.0001) or bool(row_inclusive is not None and business_inclusive is not None and row_inclusive != business_inclusive)
        export_problem = export_status in {"failed", "error", "needs_review", "needs review", "rejected"}
        missing_context = not business_rate or business_inclusive is None
        if not is_setting and not conflict and not export_problem and not missing_context:
            return None
        missing = []
        required = []
        if not business_rate:
            required.append("GST / tax rate")
            missing.append("Business GST/tax rate is missing.")
        if business_rate and business_inclusive is None:
            required.append("Tax treatment")
            missing.append("Confirm whether business prices are tax-inclusive or tax-exclusive.")
        if conflict:
            required.append("Coding / tax correction")
            missing.append("The invoice tax fields conflict with business settings; choose the correct treatment.")
        set_field(doc, "GST / tax rate", f"{business_rate * 100:g}%" if business_rate else "Owner/accountant to confirm", "explicit rate fields only; generic GST amounts are never treated as rates", 0.94 if business_rate else 0.25, "Confirm rate")
        set_field(doc, "Tax treatment", "Inclusive" if business_inclusive is True else "Exclusive" if business_inclusive is False else "Owner/accountant to confirm", context["business_tax_source"], 0.92 if business_inclusive is not None else 0.25, "Confirm treatment")
        set_field(doc, "Conflict check", "Invoice conflicts with business settings" if conflict else "No explicit tax conflict found", "explicit rate and inclusive/exclusive comparison", 0.93)
        set_field(doc, "Export status", export_status or "No export failure recorded", "accounting/export status", 0.86)
        set_missing(doc, missing, required)
        set_confidence(doc, 0.94 if not required else 0.6, ["Only explicit rate keys accepted", "Generic GST amount ignored as a rate", "Business tax context checked", "Invoice conflict checked", "Sync and tax filing remain locked"])
        evidence(doc, [f"Business rate: {business_rate * 100:g}%" if business_rate else "Business rate missing", f"Business treatment: {'inclusive' if business_inclusive is True else 'exclusive' if business_inclusive is False else 'missing'}", f"Invoice explicit rate: {row_rate * 100:g}%" if row_rate else "No explicit invoice rate", f"Invoice treatment: {row_inclusive}", f"Export status: {export_status or 'not failed'}"])
        return doc

    def harden_regular(doc, context):
        action = clean(doc.get("action_type"), "")
        source_id = doc.get("source_id")
        if action in {"prepare_invoice", "prepare_recurring_next_date", "complete_job_setup", "request_completion_proof"}:
            source = find_source(context["jobs"], source_id)
        elif action == "prepare_overdue_followup" or action == "review_accounting_export":
            source = find_source(context["invoices"], source_id) or find_source(context["settings"], source_id)
        elif action in {"prepare_customer_reply", "prepare_client_memory"}:
            source = find_source(context["messages"], source_id) or find_source(context["jobs"], source_id)
        elif action == "review_odd_hours":
            source = find_source(context["timers"], source_id)
        else:
            source = None
        if action == "prepare_invoice":
            hardened = harden_invoice(doc, source, context)
        elif action == "prepare_recurring_next_date":
            hardened = harden_booking(doc, source, context)
        elif action == "complete_job_setup":
            hardened = harden_assignment(doc, source)
        elif action == "prepare_overdue_followup":
            hardened = harden_followup(doc, source)
        elif action == "prepare_customer_reply":
            hardened = harden_reply(doc, source)
        elif action == "review_odd_hours":
            hardened = harden_hours(doc, source, context)
        elif action == "request_completion_proof":
            hardened = harden_quality(doc, source)
        elif action == "prepare_client_memory":
            hardened = harden_memory(doc, source, context)
        elif action == "review_accounting_export":
            hardened = harden_accounting(doc, source, context)
        else:
            hardened = None
        if hardened:
            mark_v3(hardened)
            payload_of(hardened)["evidence_fingerprint"] = fingerprint(hardened)
            hardened["dedupe_key"] = f"{hardened.get('source_type')}:{hardened.get('action_type')}:{hardened.get('source_id')}"
        return hardened

    def strong_pattern(counts):
        values = [int(counts.get(key, 0) or 0) for key in ["incomplete_jobs", "missing_invoices", "missing_proof", "odd_hours"]]
        return max(values or [0]) >= 3 or sum(1 for value in values if value >= 2) >= 2

    def harden_operations(doc, counts):
        if not strong_pattern(counts):
            return None
        set_confidence(doc, 0.92, ["At least three repeats in one category or two categories repeated twice", "One-off mixed issues do not become a process rule", "No automation changed"])
        mark_v3(doc)
        payload_of(doc)["evidence_fingerprint"] = fingerprint(doc)
        doc["dedupe_key"] = f"operations:{doc.get('action_type')}:{doc.get('source_id')}"
        return doc

    def harden_brief(doc, regular_count):
        if regular_count < 2:
            return None
        set_field(doc, "Prepared decisions", str(regular_count), "strict v3 decisions that survived source validation", 0.99)
        set_confidence(doc, 0.95, ["Only strict-preflight decisions counted", "False and weak candidates excluded", "No business action taken"])
        mark_v3(doc)
        payload_of(doc)["evidence_fingerprint"] = fingerprint(doc)
        doc["dedupe_key"] = f"office:{doc.get('action_type')}:{doc.get('source_id')}"
        return doc

    async def supersede(slip, reason):
        if not slip or not slip.get("_id"):
            return False
        audit = {"by": "human-mimic-v3", "role": "Office Manager", "action": "superseded", "note": reason, "at": now(), "safety": SAFE_RESULT}
        result = await db.command_slips.update_one(
            {"_id": slip["_id"], "status": {"$in": OPEN_STATUSES}},
            {"$set": {"status": "superseded", "superseded_at": now(), "superseded_reason": reason, "updated_at": now()}, "$push": {"audit": audit}},
        )
        return bool(getattr(result, "modified_count", 0))

    async def retire_legacy(user_business_id):
        try:
            cursor = db.command_slips.find({
                "business_id": user_business_id,
                "status": {"$in": OPEN_STATUSES},
                "office_engine": True,
                "payload.human_mimic_intelligence_v3": {"$ne": True},
            })
            try:
                cursor = cursor.max_time_ms(1800)
            except Exception:
                pass
            rows = await asyncio.wait_for(cursor.limit(400).to_list(400), timeout=2.5)
        except Exception:
            rows = []
        semaphore = asyncio.Semaphore(8)

        async def retire(row):
            async with semaphore:
                return await supersede(row, "Strict human mimic v3 replaced an older judgement before launch. No business record changed.")

        results = await asyncio.gather(*(retire(row) for row in rows))
        return sum(1 for result in results if result)

    async def insert_hardened(user, doc):
        user_business_id = business_id(user)
        payload = payload_of(doc)
        current_fingerprint = payload.get("evidence_fingerprint") or fingerprint(doc)
        existing = await db.command_slips.find_one({
            "business_id": user_business_id,
            "source_type": doc.get("source_type"),
            "action_type": doc.get("action_type"),
            "source_id": doc.get("source_id"),
            "status": {"$in": OPEN_STATUSES},
            "payload.human_mimic_intelligence_v3": True,
        })
        if existing:
            existing_fingerprint = ((existing.get("payload") or {}).get("evidence_fingerprint"))
            if existing_fingerprint == current_fingerprint:
                return None, doc_out(existing), 0
            await supersede(existing, "The live source evidence changed, so strict v3 replaced this stale decision.")
        doc = deepcopy(doc)
        doc.pop("_id", None)
        doc["business_id"] = user_business_id
        business_oid = maybe_oid(user_business_id)
        doc["contractor_id"] = business_oid or user_business_id
        doc["created_by"] = clean((user or {}).get("id"), "", 180)
        doc["created_at"] = now()
        doc["updated_at"] = now()
        doc.setdefault("audit", []).append({"by": doc["created_by"], "role": clean((user or {}).get("role"), "owner", 80), "action": "human_mimic_v3_prepared", "note": "Strict source preflight passed before this decision entered Command", "at": now(), "safety": SAFE_RESULT})
        result = await db.command_slips.insert_one(doc)
        doc["_id"] = result.inserted_id
        try:
            await db.command_events.insert_one({
                "business_id": user_business_id,
                "contractor_id": business_oid or user_business_id,
                "event_type": "human_mimic_v3_prepared",
                "title": doc.get("title"),
                "detail": doc.get("prepared"),
                "slip_id": str(result.inserted_id),
                "engine_version": HUMAN_MIMIC_VERSION,
                "safety": SAFE_RESULT,
                "created_by": doc["created_by"],
                "created_at": now(),
            })
        except Exception:
            pass
        return doc_out(doc), None, 0

    @router.post("/command/scan")
    async def strict_human_mimic_scan(request: Request, payload: Optional[Dict[str, Any]] = None):
        scan_started = time.monotonic()
        stage_timings = {}
        user = await require_owner(request)
        user_business_id = business_id(user)
        stage_started = time.monotonic()
        retired = await retire_legacy(user_business_id)
        stage_timings["retire_legacy_ms"] = round((time.monotonic() - stage_started) * 1000)

        capture_db = _CaptureDB(db, ObjectId)
        base_router = build_command_human_mimic_router(capture_db, get_current_user, ObjectId)
        base_scan = None
        for route in getattr(base_router, "routes", []):
            if getattr(route, "path", "") == "/command/scan":
                base_scan = getattr(route, "endpoint", None)
                break
        if base_scan is None:
            raise HTTPException(status_code=500, detail="Human mimic reasoning engine is unavailable")
        stage_started = time.monotonic()
        base_result = await base_scan(payload=payload, request=request)
        stage_timings["base_scan_ms"] = round((time.monotonic() - stage_started) * 1000)
        captured = capture_db.capture.get("command_slips", [])
        scan_errors = list(base_result.get("scan_errors") or [])

        stage_started = time.monotonic()
        jobs, invoices, clients, messages, timers, settings = await asyncio.gather(
            scoped_rows(user_business_id, ["jobs", "job_records", "appointments", "bookings"], 260, scan_errors),
            scoped_rows(user_business_id, ["invoices", "invoice_records"], 220, scan_errors),
            scoped_rows(user_business_id, ["clients", "customers"], 180, scan_errors),
            scoped_rows(user_business_id, ["messages", "client_messages", "inbox_messages"], 180, scan_errors),
            scoped_rows(user_business_id, ["time_entries", "timers", "worker_time_entries", "timesheets"], 180, scan_errors),
            scoped_rows(user_business_id, ["businesses", "business_settings", "settings"], 60, scan_errors),
        )
        context = {
            "jobs": jobs,
            "invoices": invoices,
            "clients": clients,
            "messages": messages,
            "timers": timers,
            "settings": settings,
        }
        stage_timings["context_load_ms"] = round((time.monotonic() - stage_started) * 1000)
        scan_errors = list(dict.fromkeys(scan_errors))
        context["business_rate"], context["business_inclusive"], context["business_tax_source"] = business_tax_context(context["settings"])
        stage_started = time.monotonic()
        linked_jobs = {}
        for job in context["jobs"]:
            source = next(iter(row_ids(job)), "")
            linked_jobs[source] = linked_invoice_exists(user_business_id, job, context["invoices"])
        context["linked_jobs"] = linked_jobs
        stage_timings["link_index_ms"] = round((time.monotonic() - stage_started) * 1000)

        regular = []
        operations = []
        briefs = []
        seen = set()
        for raw in captured:
            doc = deepcopy(raw)
            action = clean(doc.get("action_type"), "")
            if action == "review_repeated_admin_gap":
                operations.append(doc)
                continue
            if action == "daily_owner_brief":
                briefs.append(doc)
                continue
            hardened = harden_regular(doc, context)
            if not hardened:
                retired += 1
                continue
            key = (hardened.get("source_type"), hardened.get("action_type"), str(hardened.get("source_id") or ""))
            if key in seen:
                continue
            seen.add(key)
            regular.append(hardened)

        counts = dict(base_result.get("role_counts") or {})
        if operations:
            hardened_operations = harden_operations(operations[0], counts)
            if hardened_operations:
                regular.append(hardened_operations)
            else:
                retired += len(operations)
        if briefs:
            hardened_brief = harden_brief(briefs[0], len([item for item in regular if item.get("action_type") not in {"review_repeated_admin_gap", "daily_owner_brief"}]))
            if hardened_brief:
                regular.append(hardened_brief)
            else:
                retired += len(briefs)

        stage_started = time.monotonic()
        created = []
        existing = []
        store_semaphore = asyncio.Semaphore(8)

        async def store_hardened(doc):
            async with store_semaphore:
                return await insert_hardened(user, doc)

        stored = await asyncio.gather(*(store_hardened(doc) for doc in regular[:100]))
        for item, old, _ in stored:
            if item:
                created.append(item)
            elif old:
                existing.append(old)
        stage_timings["store_ms"] = round((time.monotonic() - stage_started) * 1000)
        stage_timings["total_ms"] = round((time.monotonic() - scan_started) * 1000)

        role_counts = Counter(item.get("office_role") or (item.get("payload") or {}).get("office_role") or "Unknown" for item in created + existing)
        return {
            "success": True,
            "source": HUMAN_MIMIC_VERSION,
            "guard": HUMAN_MIMIC_GUARD,
            "performance_version": HUMAN_MIMIC_PERFORMANCE,
            "stage_timings_ms": stage_timings,
            "created_count": len(created),
            "existing_count": len(existing),
            "superseded_count": retired,
            "role_counts": dict(role_counts),
            "roles_checked": ROLE_NAMES,
            "slips": created,
            "existing": existing,
            "scan_complete": not scan_errors,
            "scan_errors": scan_errors,
            "message": (
                f"Strict human mimic v3 prepared {len(created)} new decision(s), kept {len(existing)} current decision(s), and rejected or superseded {retired} weak/stale candidate(s)."
                if not scan_errors
                else f"Strict human mimic v3 prepared {len(created)} new decision(s), but part of the live source scan failed. Do not treat an empty queue as all clear."
            ),
            "safety": SAFE_RESULT,
        }

    return router
