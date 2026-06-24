import json
import os
import re
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Request
from openai import AsyncOpenAI

ALLOWED_ACTIONS = {
    "create_client",
    "create_job",
    "create_quote",
    "create_invoice",
    "draft_invoice_from_job",
    "batch_draft_invoices",
    "complete_job",
    "reschedule_job",
    "update_job_price",
    "prepare_invoice_followups",
    "find_records",
    "needs_clarification",
}

MONEY_ACTIONS = {"create_invoice", "draft_invoice_from_job", "batch_draft_invoices", "prepare_invoice_followups"}
WORK_ACTIONS = {"complete_job", "reschedule_job", "update_job_price", "find_records"}
CREATE_ACTIONS = {"create_client", "create_job", "create_quote"}
GENERIC_REVIEW_PHRASES = {
    "ai prepared admin work",
    "ai reviewed the live business records",
    "owner approval is required before churvox changes real records",
    "waiting for owner review",
    "approval required",
    "needs_clarification",
    "needs clarification",
    "not prepared",
    "needs preparation",
    "needs concrete draft",
    "this card does not include",
}


def build_ai_operator_router(db, get_current_user, ObjectId):
    router = APIRouter()

    def now():
        return datetime.now(timezone.utc)

    def serial(value):
        if isinstance(value, list):
            return [serial(v) for v in value]
        if isinstance(value, dict):
            return {k: serial(v) for k, v in value.items()}
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    def doc_out(doc):
        if not doc:
            return None
        d = dict(doc)
        if "_id" in d:
            d["id"] = str(d.pop("_id"))
        return serial(d)

    def oid(value, label="record"):
        try:
            return ObjectId(str(value))
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid {label} id")

    def maybe_oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def require_owner(request: Request):
        user = await get_current_user(request)
        role = str(user.get("role") or "").lower()
        allowed = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}
        if role not in allowed and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can run AI Operator actions")
        return user

    def business_ids(user):
        business_id = str(user.get("business_id") or user.get("id"))
        return business_id, oid(business_id, "business")

    def business_query(user):
        business_id, business_oid = business_ids(user)
        return {"$or": [{"business_id": business_id}, {"business_id": business_oid}, {"contractor_id": business_oid}]}

    def category_for(action):
        if action in MONEY_ACTIONS:
            return "money"
        if action in WORK_ACTIONS:
            return "work"
        if action in CREATE_ACTIONS:
            return "create"
        return "other"

    def clean_text(value: Any, limit: int = 200) -> str:
        return re.sub(r"\s+", " ", str(value or "").strip())[:limit]

    def normal_text(value: Any) -> str:
        return clean_text(value, 2000).lower().replace("_", " ")

    def is_generic_text(value: Any) -> bool:
        text = normal_text(value)
        if not text:
            return True
        return any(phrase in text for phrase in GENERIC_REVIEW_PHRASES)

    def money_number(value):
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        match = re.search(r"\$?\s*(\d+(?:\.\d{1,2})?)", str(value))
        return float(match.group(1)) if match else 0.0

    def date_value(value):
        raw = str(value or "").lower()
        base = now()
        if "today" in raw:
            return base
        if "tomorrow" in raw:
            return base + timedelta(days=1)
        if "next week" in raw:
            return base + timedelta(days=7)
        month_names = {"jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3, "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12}
        named = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{2,4}))?\b", raw)
        if named:
            year = int(named.group(3)) if named.group(3) else base.year
            if year < 100:
                year += 2000
            try:
                return datetime(year, month_names[named.group(2)], int(named.group(1)), 9, 0, tzinfo=timezone.utc)
            except Exception:
                pass
        numeric = re.search(r"\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b", raw)
        if numeric:
            year = int(numeric.group(3)) if numeric.group(3) else base.year
            if year < 100:
                year += 2000
            try:
                return datetime(year, int(numeric.group(2)), int(numeric.group(1)), 9, 0, tzinfo=timezone.utc)
            except Exception:
                pass
        return base + timedelta(days=1)

    def job_type(value):
        low = str(value or "").lower()
        if "hedge" in low:
            return "hedge_trimming"
        if "clean" in low:
            return "cleaning"
        if "lawn" in low or "mow" in low:
            return "lawn_mowing"
        if "paint" in low:
            return "painting"
        if "pest" in low:
            return "pest_control"
        if "plumb" in low:
            return "plumbing"
        if "electric" in low:
            return "electrical"
        return "other"

    def extract_email(text):
        match = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", str(text or ""), re.I)
        return match.group(0) if match else None

    def extract_phone(text):
        match = re.search(r"(?:\+?64|0)\s?\d[\d\s-]{6,}", str(text or ""))
        return re.sub(r"\s+", " ", match.group(0)).strip() if match else None

    def extract_address(text):
        raw = str(text or "")
        match = re.search(r"\b\d{1,5}\s+[A-Za-z0-9 .'-]+?\s(?:Road|Rd|Street|St|Drive|Dr|Avenue|Ave|Lane|Ln|Place|Pl|Crescent|Cres|Terrace|Tce|Way|Court|Ct)\b", raw, re.I)
        if match:
            return match.group(0).strip()
        match = re.search(r"\bat\s+([^,$]+)", raw, re.I)
        return match.group(1).strip() if match else ""

    def clean_customer_name(value):
        name = re.sub(r"\s+", " ", str(value or "")).strip(" ,.-")
        name = re.sub(r"\b(?:a|an|the|new|client|customer|job|quote|invoice|mowing|mow|lawn|hedge|clean|cleaning|paint|painting|pest|plumbing|electrical|fortnightly|weekly|monthly)\b", " ", name, flags=re.I)
        name = re.sub(r"\s+", " ", name).strip(" ,.-")
        if name.lower() in {"", "completed", "completed jobs", "unpaid", "unpaid invoices", "tomorrow", "today", "next week"}:
            return ""
        return name[:80].strip()

    def explicit_customer_name(text):
        raw = str(text or "")
        raw = re.sub(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", " ", raw, flags=re.I)
        raw = re.sub(r"(?:\+?64|0)\s?\d[\d\s-]{6,}", " ", raw)
        address = extract_address(raw)
        protected = raw.replace(address, " ") if address else raw
        patterns = [
            r"^\s*(?:job|quote|invoice)\s+(?:for\s+)?([A-Za-z][A-Za-z' -]{1,70}?)(?=\s+(?:lawn|mow|mowing|hedge|clean|cleaning|paint|painting|pest|plumbing|electrical|at|\d{1,5}\s|\$|\d+\b|weekly|fortnight|fortnightly|monthly|next|tomorrow|today)\b|[,.;]|$)",
            r"\bfor\s+([A-Za-z][A-Za-z' -]{1,70}?)(?=\s+(?:at|on|in|with|\$|\d{1,5}\s|next|tomorrow|today|weekly|fortnight|fortnightly|monthly|mow|mowing|lawn|hedge|clean|painting|paint|job|quote|invoice)\b|[,.;]|$)",
            r"\b(?:add|create|make|book)\s+(?:a\s+)?(?:job|quote|invoice)\s+(?:for\s+)?([A-Za-z][A-Za-z' -]{1,70}?)(?=\s+(?:at|\d{1,5}\s|on|in|with|\$|next|tomorrow|today|weekly|fortnight|fortnightly|monthly|mow|mowing|lawn|hedge|clean|painting|paint)\b|[,.;]|$)",
            r"\b(?:add|create)\s+(?:a\s+)?(?:client|customer)\s+(?:called|named)?\s*([A-Za-z][A-Za-z' -]{1,70}?)(?=\s+(?:with|email|phone|at|\d{1,5}\s)\b|[,.;]|$)",
        ]
        for pattern in patterns:
            match = re.search(pattern, protected, re.I)
            if match:
                name = clean_customer_name(match.group(1))
                if name:
                    return name
        return ""

    def word_set(text):
        stop = {"the", "a", "an", "to", "for", "at", "on", "in", "and", "or", "of", "with", "job", "client", "quote", "invoice", "create", "add", "move", "complete", "change", "price"}
        return {w for w in re.findall(r"[a-z0-9]+", str(text or "").lower()) if w not in stop and len(w) > 2}

    def record_label(record):
        keys = ("title", "name", "customer_name", "client_name", "address", "invoice_number", "quote_number", "id")
        return clean_text(next((record.get(k) for k in keys if record.get(k)), "Record"), 140)

    def best_record(records, text, record_type):
        words = word_set(text)
        best = None
        best_score = 0
        for record in records or []:
            haystack = " ".join(str(record.get(k) or "") for k in ("title", "name", "customer_name", "client_name", "address", "email", "phone", "invoice_number", "quote_number", "notes")).lower()
            score = sum(1 for word in words if word in haystack)
            if score > best_score:
                best = record
                best_score = score
        if not best or best_score <= 0:
            return {"record_type": "none", "id": "", "label": "", "reason": "No confident live record match"}
        return {"record_type": record_type, "id": str(best.get("id") or best.get("_id") or ""), "label": record_label(best), "reason": f"Matched {best_score} words from the instruction"}

    async def context_for(user):
        q = business_query(user)
        clients = await db.clients.find(q).sort("created_at", -1).limit(60).to_list(60)
        jobs = await db.jobs.find(q).sort("created_at", -1).limit(120).to_list(120)
        quotes = await db.quotes.find(q).sort("created_at", -1).limit(60).to_list(60)
        invoices = await db.invoices.find(q).sort("created_at", -1).limit(120).to_list(120)
        return {
            "clients": [doc_out(x) for x in clients],
            "jobs": [doc_out(x) for x in jobs],
            "quotes": [doc_out(x) for x in quotes],
            "invoices": [doc_out(x) for x in invoices],
        }

    def human_summary_from_payload(payload):
        bits = []
        for key in ("customer_name", "client_name", "name"):
            if payload.get(key):
                bits.append(str(payload[key]))
                break
        if payload.get("address"):
            bits.append(str(payload["address"]))
        amount = payload.get("price") or payload.get("amount") or payload.get("subtotal") or payload.get("total")
        if amount:
            try:
                bits.append(f"${float(str(amount).replace('$', '').strip()):.0f}")
            except Exception:
                bits.append(str(amount))
        if payload.get("scheduled_date_human"):
            bits.append(str(payload["scheduled_date_human"]))
        if payload.get("repeat") or payload.get("recurrence"):
            bits.append(str(payload.get("repeat") or payload.get("recurrence")))
        return " - ".join([clean_text(bit, 120) for bit in bits if clean_text(bit, 120)])

    def fallback_ai(text: str, ctx: dict, reason: str = "Backend parser used"):
        raw = clean_text(text, 4000)
        low = raw.lower()
        email = extract_email(raw)
        phone = extract_phone(raw)
        address = extract_address(raw)
        price = money_number(raw)
        client_match = best_record(ctx.get("clients", []), raw, "client")
        job_match = best_record(ctx.get("jobs", []), raw, "job")
        action = "needs_clarification"
        title = "Needs clearer instruction"
        summary = "Churvox needs a clearer instruction before preparing admin work."
        payload: Dict[str, Any] = {"instruction": raw}
        match = {"record_type": "none", "id": "", "label": "", "reason": reason}
        matches: List[Dict[str, Any]] = []

        if any(w in low for w in ("find", "search", "look up", "show me")):
            action = "find_records"
            matches = [m for m in [client_match, job_match] if m.get("id")]
            title = "Find matching records"
            summary = f"Found {len(matches)} matching record(s)."
            payload = {"query": raw}
        elif "chase" in low or "follow up" in low or "reminder" in low:
            action = "prepare_invoice_followups"
            matches = [
                {"record_type": "invoice", "id": str(inv.get("id") or inv.get("_id") or ""), "label": record_label(inv), "reason": "Open invoice follow-up candidate"}
                for inv in ctx.get("invoices", [])
                if str(inv.get("status") or "").lower() in ("sent", "open", "unpaid", "overdue", "part paid", "partial")
            ][:20]
            title = "Prepare invoice follow-ups"
            summary = f"Prepare follow-up drafts for {len(matches)} open invoice(s)."
            payload = {"message_intent": raw}
        elif "invoice" in low:
            completed_jobs = [j for j in ctx.get("jobs", []) if str(j.get("status") or j.get("job_status") or "").lower() in ("completed", "complete", "done", "finished") and not (j.get("invoice_id") or j.get("draft_invoice_id") or j.get("invoice_number"))][:20]
            if "completed" in low and completed_jobs:
                action = "batch_draft_invoices"
                matches = [{"record_type": "job", "id": str(j.get("id") or j.get("_id") or ""), "label": record_label(j), "reason": "Completed job not yet invoiced"} for j in completed_jobs]
                payload = {"job_ids": [m["id"] for m in matches if m["id"]]}
                title = "Prepare draft invoices for completed jobs"
                summary = f"Prepare {len(payload['job_ids'])} draft invoice(s)."
            elif job_match.get("id"):
                action = "draft_invoice_from_job"
                match = job_match
                payload = {"job_id": job_match["id"], "amount": price}
                title = "Prepare draft invoice from matched job"
                summary = f"Draft invoice from {job_match.get('label')}."
            else:
                action = "create_invoice"
                name = explicit_customer_name(raw) or client_match.get("label") or "Customer"
                payload = {"customer_name": name, "customer_email": email, "address": address, "description": raw, "subtotal": price, "amount": price, "notes": raw}
                title = "Prepare draft invoice"
                summary = human_summary_from_payload(payload) or title
        elif "quote" in low:
            action = "create_quote"
            name = explicit_customer_name(raw) or client_match.get("label") or "Customer"
            payload = {"customer_name": name, "customer_email": email, "address": address, "job_description": raw, "job_type": job_type(raw), "price": price, "amount": price, "notes": raw}
            match = client_match if client_match.get("id") else match
            title = "Prepare quote"
            summary = human_summary_from_payload(payload) or title
        elif any(w in low for w in ("client", "customer", "contact")) or email or phone:
            action = "create_client"
            clean_name = explicit_customer_name(raw) or re.sub(r"\b(add|create|new|client|customer|contact|with|email|phone|for|called|named|name|address)\b", " ", raw, flags=re.I)
            clean_name = re.sub(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", " ", clean_name, flags=re.I)
            clean_name = re.sub(r"(?:\+?64|0)\s?\d[\d\s-]{6,}", " ", clean_name)
            if address:
                clean_name = clean_name.replace(address, " ")
            clean_name = clean_customer_name(clean_name) or "New customer"
            payload = {"name": clean_name, "customer_name": clean_name, "client_name": clean_name, "email": email, "customer_email": email, "phone": phone, "address": address, "notes": ""}
            title = "Prepare new client"
            summary = human_summary_from_payload(payload) or title
        elif "complete" in low or "done" in low or "finished" in low:
            action = "complete_job"
            match = job_match
            payload = {"job_id": job_match.get("id"), "notes": raw}
            title = "Prepare job completion"
            summary = f"Mark {job_match.get('label') or 'matched job'} complete."
        elif "move" in low or "reschedule" in low or "next week" in low or "tomorrow" in low:
            action = "reschedule_job"
            match = job_match
            payload = {"job_id": job_match.get("id"), "scheduled_date_human": raw, "date": raw}
            title = "Prepare job reschedule"
            summary = f"Reschedule {job_match.get('label') or 'matched job'}."
        elif "price" in low or "charge" in low or "change" in low:
            action = "update_job_price"
            match = job_match
            payload = {"job_id": job_match.get("id"), "price": price, "amount": price, "notes": raw}
            title = "Prepare price update"
            summary = f"Update price to ${price:.2f}."
        elif any(w in low for w in ("job", "mow", "mowing", "lawn", "hedge", "clean", "paint", "pest", "plumb", "electric")) or address or price:
            action = "create_job"
            name = explicit_customer_name(raw) or client_match.get("label") or "Customer"
            repeat = "fortnightly" if "fortnight" in low or "every 2 weeks" in low else "weekly" if "weekly" in low else "monthly" if "monthly" in low else "one-off"
            payload = {"title": raw[:90] or "New job", "description": raw, "job_type": job_type(raw), "customer_name": name, "client_name": name, "address": address or "Address needed", "scheduled_date_human": raw, "date": raw, "price": price, "amount": price, "pricing_type": "fixed", "repeat": repeat, "recurrence": repeat, "notes": raw}
            match = client_match if client_match.get("id") else match
            title = "Prepare new job"
            summary = human_summary_from_payload(payload) or title

        if action in {"complete_job", "reschedule_job", "update_job_price", "draft_invoice_from_job"} and not (match.get("id") or payload.get("job_id")):
            action = "needs_clarification"
            title = "Needs clearer job match"
            summary = "Churvox needs a clearer job match before preparing this safely."
            payload = {"instruction": raw}
            match = {"record_type": "none", "id": "", "label": "", "reason": "No matching job was found"}

        return {
            "action": action,
            "confidence": 0.62 if action != "needs_clarification" else 0.25,
            "title": title,
            "summary": summary,
            "details": {
                "What Churvox found": match.get("label") or reason,
                "What Churvox prepared": summary,
                "Why it needs approval": "Owner approval is required before Churvox changes real records.",
            },
            "payload": payload,
            "match": match,
            "matches": matches,
        }

    async def call_ai(text: str, ctx: dict):
        key = os.environ.get("OPENAI" + "_API" + "_KEY", "").strip()
        if not key:
            return fallback_ai(text, ctx, "AI provider is not configured, so Churvox used the safe backend parser")
        client = AsyncOpenAI(api_key=key)
        model = os.environ.get("CHURVOX_AI_MODEL", "gpt-4o-mini")
        schema = {"action": "create_job", "confidence": 0.0, "title": "", "summary": "", "details": {"What Churvox found": "", "What Churvox prepared": "", "Why it needs approval": ""}, "payload": {}, "match": {"record_type": "none", "id": "", "label": "", "reason": ""}, "matches": []}
        system = "Return JSON only. Use supplied Churvox records only. Do not invent ids. Allowed actions: " + ", ".join(sorted(ALLOWED_ACTIONS)) + ". Prepare draft or approval work only. If there is no concrete safe action, use needs_clarification."
        try:
            result = await client.chat.completions.create(model=model, temperature=0.1, response_format={"type": "json_object"}, messages=[{"role": "system", "content": system}, {"role": "user", "content": json.dumps({"instruction": text, "business_context": ctx, "schema": schema}, default=str)[:45000]}])
            data = json.loads(result.choices[0].message.content or "{}")
            action = str(data.get("action") or "needs_clarification").strip()
            if action not in ALLOWED_ACTIONS:
                return fallback_ai(text, ctx, f"AI returned unsupported action: {action}")
            return data
        except Exception as exc:
            return fallback_ai(text, ctx, f"AI provider failed safely: {type(exc).__name__}")

    def linked_record_id(item):
        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
        details = item.get("details") if isinstance(item.get("details"), dict) else {}
        match = item.get("match") if isinstance(item.get("match"), dict) else {}
        for value in [
            item.get("recordId"), item.get("record_id"), payload.get("recordId"), payload.get("record_id"), payload.get("job_id"), payload.get("client_id"), payload.get("quote_id"), payload.get("invoice_id"), details.get("recordId"), details.get("record_id"), match.get("id"),
        ]:
            if value:
                return str(value)
        job_ids = payload.get("job_ids") if isinstance(payload.get("job_ids"), list) else []
        if job_ids:
            return str(job_ids[0])
        matches = item.get("matches") if isinstance(item.get("matches"), list) else []
        for match_item in matches:
            if isinstance(match_item, dict) and match_item.get("id"):
                return str(match_item["id"])
        return ""

    def has_concrete_payload(action, payload):
        if not isinstance(payload, dict):
            return False
        if action == "create_client":
            return bool(clean_customer_name(payload.get("name") or payload.get("customer_name") or payload.get("client_name")))
        if action == "create_job":
            return bool(clean_text(payload.get("customer_name") or payload.get("client_name")) and clean_text(payload.get("address")) and not is_generic_text(payload.get("address")))
        if action == "create_quote":
            return bool(clean_text(payload.get("customer_name") or payload.get("client_name")) and money_number(payload.get("price") or payload.get("amount")) > 0)
        if action == "create_invoice":
            return bool(clean_text(payload.get("customer_name") or payload.get("client_name")) and money_number(payload.get("subtotal") or payload.get("amount") or payload.get("total")) > 0)
        return True

    def enrich_review_item(item):
        item = dict(item or {})
        action = str(item.get("action") or item.get("actionKey") or item.get("action_key") or item.get("type") or "").strip()
        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
        record_id = linked_record_id(item)
        if not record_id and action in {"create_client", "create_job", "create_quote", "create_invoice"} and has_concrete_payload(action, payload):
            record_id = str(item.get("id") or item.get("_id") or "prepared-record")
            item["recordType"] = f"prepared_{action.replace('create_', '')}"
        if record_id:
            item["recordId"] = record_id
        item["actionKey"] = item.get("actionKey") or action
        item["preparedForApproval"] = is_approval_ready(item)
        return item

    def is_approval_ready(item):
        action = str(item.get("action") or item.get("actionKey") or item.get("action_key") or item.get("type") or "").strip()
        status = str(item.get("status") or "open").strip().lower()
        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
        if status not in {"open", "edited", "pending", "ready", "waiting"}:
            return False
        if action == "needs_clarification":
            return False
        title = item.get("title") or ""
        summary = item.get("summary") or ""
        prepared = payload or item.get("details") or item.get("match") or item.get("matches")
        if is_generic_text(title) or is_generic_text(summary):
            return False
        if not prepared:
            return False
        if linked_record_id(item):
            return True
        return action in {"create_client", "create_job", "create_quote", "create_invoice"} and has_concrete_payload(action, payload)

    def normalize_ai_item(ai_data: dict, text: str, user: dict):
        ai_data = ai_data if isinstance(ai_data, dict) else {}
        action = str(ai_data.get("action") or "needs_clarification").strip()
        if action not in ALLOWED_ACTIONS:
            action = "needs_clarification"
        details = ai_data.get("details") if isinstance(ai_data.get("details"), dict) else {}
        payload = ai_data.get("payload") if isinstance(ai_data.get("payload"), dict) else {}
        match = ai_data.get("match") if isinstance(ai_data.get("match"), dict) else {}
        matches = ai_data.get("matches") if isinstance(ai_data.get("matches"), list) else []
        business_id, _ = business_ids(user)
        title = clean_text(ai_data.get("title") or "Needs preparation", 140)
        summary = clean_text(ai_data.get("summary") or title, 500)
        item = {
            "business_id": business_id,
            "created_by": str(user.get("id")),
            "source": "Tell Churvox AI",
            "status": "open",
            "action": action,
            "category": category_for(action),
            "title": title,
            "summary": summary,
            "details": {
                "What Churvox found": details.get("What Churvox found") or match.get("label") or "Live records checked.",
                "What Churvox prepared": details.get("What Churvox prepared") or summary,
                "Why it needs approval": details.get("Why it needs approval") or "Owner approval is required before Churvox changes real records.",
            },
            "payload": payload,
            "match": match,
            "matches": matches,
            "original_text": text,
            "ai_confidence": float(ai_data.get("confidence") or 0),
            "created_at": now(),
            "updated_at": now(),
        }
        item = enrich_review_item(item)
        if not item["preparedForApproval"]:
            item["status"] = "needs_preparation"
            item["preparedForApproval"] = False
        return item

    async def invoice_from_payload(user, payload):
        business_id, business_oid = business_ids(user)
        job_id = payload.get("job_id")
        if job_id:
            existing = await db.invoices.find_one({"contractor_id": business_oid, "job_id": oid(job_id, "job"), "status": {"$ne": "void"}})
            if existing:
                return {"duplicate": True, "invoice": doc_out(existing)}
        subtotal = money_number(payload.get("subtotal") or payload.get("amount") or payload.get("total"))
        gst_rate = float(payload.get("gst_rate") or os.environ.get("DEFAULT_GST_RATE", "15"))
        doc = {
            "customer_name": payload.get("customer_name") or payload.get("client_name") or "Customer",
            "customer_email": payload.get("customer_email") or payload.get("email"),
            "address": payload.get("address") or "",
            "description": payload.get("description") or "Service work",
            "subtotal": subtotal,
            "gst_rate": gst_rate,
            "gst_amount": subtotal * (gst_rate / 100),
            "total": subtotal + subtotal * (gst_rate / 100),
            "notes": payload.get("notes") or "Draft prepared by Churvox AI.",
            "status": "draft",
            "invoice_number": f"INV-{now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}",
            "public_token": secrets.token_urlsafe(24),
            "myob_sync_status": "not_synced",
            "xero_sync_status": "not_synced",
            "contractor_id": business_oid,
            "business_id": business_id,
            "created_at": now(),
        }
        if job_id:
            doc["job_id"] = oid(job_id, "job")
        result = await db.invoices.insert_one(doc)
        doc["_id"] = result.inserted_id
        if job_id:
            await db.jobs.update_one({"_id": oid(job_id, "job"), "contractor_id": business_oid}, {"$set": {"invoice_id": result.inserted_id, "invoice_created": True, "invoiced": True, "updated_at": now()}})
        return {"invoice": doc_out(doc)}

    async def payload_from_job(user, job_id, amount=None):
        _, business_oid = business_ids(user)
        job = await db.jobs.find_one({"_id": oid(job_id, "job"), "contractor_id": business_oid})
        if not job:
            raise HTTPException(status_code=404, detail="Matched job not found")
        return {
            "job_id": str(job["_id"]),
            "customer_name": job.get("customer_name") or job.get("client_name") or "Customer",
            "customer_email": job.get("customer_email") or job.get("client_email"),
            "address": job.get("address") or job.get("site_address") or "",
            "description": job.get("title") or job.get("job_name") or "Completed job",
            "subtotal": money_number(amount or job.get("price") or job.get("fixed_price") or 0),
            "notes": "Draft invoice prepared from matched job by Churvox AI.",
        }

    @router.post("/tell-churvox/prepare")
    async def tell_churvox_prepare(payload: Dict[str, Any], request: Request):
        user = await require_owner(request)
        text = clean_text(payload.get("text") or payload.get("instruction") or "", 4000)
        if not text:
            raise HTTPException(status_code=400, detail="Tell Churvox what you want done first")
        item = normalize_ai_item(await call_ai(text, await context_for(user)), text, user)
        result = await db.ai_review_items.insert_one(item)
        item["_id"] = result.inserted_id
        item = enrich_review_item(doc_out(item))
        return {"success": True, "item": item, "preparedForApproval": item.get("preparedForApproval", False)}

    @router.get("/ai-review-items")
    async def list_ai_review_items(request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        raw_items = await db.ai_review_items.find({"business_id": business_id, "status": {"$in": ["open", "edited", "pending", "ready", "waiting"]}}).sort("created_at", -1).limit(200).to_list(200)
        items = []
        for raw in raw_items:
            item = enrich_review_item(doc_out(raw))
            if item.get("preparedForApproval"):
                items.append(item)
        return {"success": True, "items": items}

    @router.patch("/ai-review-items/{item_id}")
    async def save_ai_review_item(item_id: str, payload: Dict[str, Any], request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        update = {"status": "edited", "owner_note": payload.get("note") or payload.get("owner_note") or "", "updated_at": now()}
        if isinstance(payload.get("payload"), dict):
            update["payload"] = payload["payload"]
        await db.ai_review_items.update_one({"_id": oid(item_id, "review item"), "business_id": business_id}, {"$set": update})
        item = await db.ai_review_items.find_one({"_id": oid(item_id, "review item"), "business_id": business_id})
        if not item:
            raise HTTPException(status_code=404, detail="Review item not found")
        return {"success": True, "item": enrich_review_item(doc_out(item))}

    @router.post("/ai-review-items/{item_id}/ignore")
    async def ignore_item(item_id: str, payload: Dict[str, Any], request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        await db.ai_review_items.update_one({"_id": oid(item_id, "review item"), "business_id": business_id}, {"$set": {"status": "ignored", "owner_note": payload.get("note") or "", "updated_at": now()}})
        return {"success": True}

    @router.post("/ai-review-items/{item_id}/approve")
    async def approve_item(item_id: str, payload: Dict[str, Any], request: Request):
        user = await require_owner(request)
        business_id, business_oid = business_ids(user)
        item = await db.ai_review_items.find_one({"_id": oid(item_id, "review item"), "business_id": business_id, "status": {"$in": ["open", "edited", "pending", "ready", "waiting"]}})
        if not item:
            raise HTTPException(status_code=404, detail="Review item not found")
        item = enrich_review_item(doc_out(item))
        if not item.get("preparedForApproval"):
            raise HTTPException(status_code=400, detail="AI item needs preparation before approval")

        action = item.get("action")
        payload_data = dict(item.get("payload") or {})
        executed = {}

        if action == "create_client":
            client_name = clean_customer_name(payload_data.get("name") or payload_data.get("customer_name") or payload_data.get("client_name") or "Customer") or "Customer"
            email = payload_data.get("email") or payload_data.get("customer_email")
            phone = payload_data.get("phone") or payload_data.get("customer_phone")
            doc = {
                "name": client_name,
                "client_name": client_name,
                "customer_name": client_name,
                "email": email,
                "client_email": email,
                "customer_email": email,
                "phone": phone,
                "client_phone": phone,
                "customer_phone": phone,
                "address": payload_data.get("address") or payload_data.get("customer_address") or "",
                "customer_address": payload_data.get("address") or payload_data.get("customer_address") or "",
                "notes": payload_data.get("notes") or "",
                "status": "Active",
                "type": "Client",
                "contractor_id": business_oid,
                "business_id": business_id,
                "created_by": oid(user.get("id"), "user"),
                "created_at": now(),
                "updated_at": now(),
            }
            result = await db.clients.insert_one(doc)
            doc["_id"] = result.inserted_id
            executed = {"client": doc_out(doc)}
        elif action == "create_job":
            doc = {
                "title": payload_data.get("title") or payload_data.get("description") or "AI prepared job",
                "job_type": job_type(payload_data.get("job_type") or payload_data.get("title") or payload_data.get("notes")),
                "customer_name": payload_data.get("customer_name") or payload_data.get("client_name") or "Customer",
                "address": payload_data.get("address") or "Address needed",
                "scheduled_date": date_value(payload_data.get("scheduled_date") or payload_data.get("scheduled_date_human") or payload_data.get("date")),
                "estimated_duration": int(payload_data.get("estimated_duration") or 60),
                "price": money_number(payload_data.get("price") or payload_data.get("amount")),
                "pricing_type": payload_data.get("pricing_type") or "fixed",
                "is_recurring": payload_data.get("repeat") not in (None, "", "one-off", "one off", "once"),
                "recurring_frequency": payload_data.get("repeat") or payload_data.get("recurrence"),
                "notes": payload_data.get("notes") or item.get("summary"),
                "contractor_id": business_oid,
                "business_id": business_id,
                "created_by": oid(user.get("id"), "user"),
                "status": "assigned",
                "created_at": now(),
                "updated_at": now(),
            }
            result = await db.jobs.insert_one(doc)
            doc["_id"] = result.inserted_id
            executed = {"job": doc_out(doc)}
        elif action == "create_quote":
            doc = {"customer_name": payload_data.get("customer_name") or payload_data.get("client_name") or "Customer", "customer_email": payload_data.get("customer_email") or payload_data.get("email"), "address": payload_data.get("address") or "", "job_description": payload_data.get("job_description") or payload_data.get("description") or "Service work", "job_type": job_type(payload_data.get("job_type") or payload_data.get("job_description")), "price": money_number(payload_data.get("price") or payload_data.get("amount")), "pricing_type": "fixed", "notes": payload_data.get("notes") or item.get("summary"), "status": "draft", "quote_number": f"QT-{now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}", "public_token": secrets.token_urlsafe(24), "contractor_id": business_oid, "business_id": business_id, "created_at": now(), "updated_at": now()}
            result = await db.quotes.insert_one(doc)
            doc["_id"] = result.inserted_id
            executed = {"quote": doc_out(doc)}
        elif action == "create_invoice":
            executed = await invoice_from_payload(user, payload_data)
        elif action == "draft_invoice_from_job":
            job_id = payload_data.get("job_id") or (item.get("match") or {}).get("id") or item.get("recordId")
            executed = await invoice_from_payload(user, await payload_from_job(user, job_id, payload_data.get("subtotal") or payload_data.get("amount")))
        elif action == "batch_draft_invoices":
            job_ids = payload_data.get("job_ids") or [m.get("id") for m in item.get("matches", []) if isinstance(m, dict) and m.get("id")]
            executed = {"drafts": [await invoice_from_payload(user, await payload_from_job(user, job_id)) for job_id in job_ids]}
        elif action in {"complete_job", "reschedule_job", "update_job_price"}:
            job_id = payload_data.get("job_id") or (item.get("match") or {}).get("id") or item.get("recordId")
            if not job_id:
                raise HTTPException(status_code=400, detail="AI did not match a job")
            update = {"updated_at": now()}
            if action == "complete_job":
                update.update({"status": "completed", "job_status": "completed", "workflow_status": "completed", "completed": True, "completed_at": now()})
            elif action == "reschedule_job":
                update["scheduled_date"] = date_value(payload_data.get("scheduled_date") or payload_data.get("scheduled_date_human") or payload_data.get("date"))
            else:
                update["price"] = money_number(payload_data.get("price") or payload_data.get("amount"))
            await db.jobs.update_one({"_id": oid(job_id, "job"), "contractor_id": business_oid}, {"$set": update})
            executed = {"job_id": str(job_id), "updated": serial(update)}
        elif action == "prepare_invoice_followups":
            executed = {"drafts_prepared": len(item.get("matches") or [])}
        elif action == "find_records":
            executed = {"matches": item.get("matches") or []}
        else:
            raise HTTPException(status_code=400, detail="AI needs clarification before approval")

        await db.ai_review_items.update_one({"_id": oid(item_id, "review item")}, {"$set": {"status": "approved", "owner_note": payload.get("note") or "", "approved_at": now(), "executed_result": serial(executed), "updated_at": now()}})
        return {"success": True, "executed": serial(executed)}

    return router
