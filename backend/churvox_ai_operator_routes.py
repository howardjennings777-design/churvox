import json
import os
import re
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Request
from openai import AsyncOpenAI

ALLOWED_ACTIONS = {
    "create_client", "create_job", "create_quote", "create_invoice",
    "draft_invoice_from_job", "batch_draft_invoices", "complete_job",
    "reschedule_job", "update_job_price", "prepare_invoice_followups",
    "find_records", "needs_clarification",
}
MONEY_ACTIONS = {"create_invoice", "draft_invoice_from_job", "batch_draft_invoices", "prepare_invoice_followups"}
WORK_ACTIONS = {"complete_job", "reschedule_job", "update_job_price", "find_records"}
CREATE_ACTIONS = {"create_client", "create_job", "create_quote"}


def build_ai_operator_router(db, get_current_user, ObjectId):
    router = APIRouter()

    def now(): return datetime.now(timezone.utc)
    def serial(value):
        if isinstance(value, list): return [serial(v) for v in value]
        if isinstance(value, dict): return {k: serial(v) for k, v in value.items()}
        if isinstance(value, ObjectId): return str(value)
        if isinstance(value, datetime): return value.isoformat()
        return value
    def doc_out(doc):
        if not doc: return None
        d = dict(doc)
        if "_id" in d: d["id"] = str(d.pop("_id"))
        return serial(d)
    def oid(value, label="record"):
        try: return ObjectId(str(value))
        except Exception: raise HTTPException(status_code=400, detail=f"Invalid {label} id")
    async def require_owner(request: Request):
        user = await get_current_user(request)
        role = str(user.get("role") or "").lower()
        if role not in ("employer", "admin", "owner", "business_owner", "manager", "office_admin") and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can run AI Operator actions")
        return user
    def business_ids(user):
        business_id = str(user.get("business_id") or user.get("id"))
        return business_id, oid(business_id, "business")
    def category_for(action):
        if action in MONEY_ACTIONS: return "money"
        if action in WORK_ACTIONS: return "work"
        if action in CREATE_ACTIONS: return "create"
        return "other"
    def money_number(value):
        if value is None: return 0.0
        if isinstance(value, (int, float)): return float(value)
        match = re.search(r"\$?\s*(\d+(?:\.\d{1,2})?)", str(value))
        return float(match.group(1)) if match else 0.0
    def date_value(value):
        raw = str(value or "").lower(); base = now()
        if "today" in raw: return base
        if "tomorrow" in raw: return base + timedelta(days=1)
        if "next week" in raw: return base + timedelta(days=7)
        month_names = {"jan":1,"january":1,"feb":2,"february":2,"mar":3,"march":3,"apr":4,"april":4,"may":5,"jun":6,"june":6,"jul":7,"july":7,"aug":8,"august":8,"sep":9,"sept":9,"september":9,"oct":10,"october":10,"nov":11,"november":11,"dec":12,"december":12}
        mn = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{2,4}))?\b", raw)
        if mn:
            y = int(mn.group(3)) if mn.group(3) else base.year
            if y < 100: y += 2000
            try: return datetime(y, month_names[mn.group(2)], int(mn.group(1)), 9, 0, tzinfo=timezone.utc)
            except Exception: pass
        m = re.search(r"\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b", raw)
        if m:
            y = int(m.group(3)) if m.group(3) else base.year
            if y < 100: y += 2000
            try: return datetime(y, int(m.group(2)), int(m.group(1)), 9, 0, tzinfo=timezone.utc)
            except Exception: pass
        return base + timedelta(days=1)
    def job_type(value):
        low = str(value or "").lower()
        if "hedge" in low: return "hedge_trimming"
        if "clean" in low: return "cleaning"
        if "lawn" in low or "mow" in low: return "lawn_mowing"
        if "paint" in low: return "painting"
        if "pest" in low: return "pest_control"
        if "plumb" in low: return "plumbing"
        if "electric" in low: return "electrical"
        return "other"

    async def context_for(user):
        business_id, business_oid = business_ids(user)
        clients = await db.clients.find({"contractor_id": business_oid}).sort("created_at", -1).limit(60).to_list(60)
        jobs = await db.jobs.find({"contractor_id": business_oid}).sort("created_at", -1).limit(120).to_list(120)
        quotes = await db.quotes.find({"contractor_id": business_oid}).sort("created_at", -1).limit(60).to_list(60)
        invoices = await db.invoices.find({"contractor_id": business_oid}).sort("created_at", -1).limit(120).to_list(120)
        return {"business_id": business_id, "clients": [doc_out(x) for x in clients], "jobs": [doc_out(x) for x in jobs], "quotes": [doc_out(x) for x in quotes], "invoices": [doc_out(x) for x in invoices]}
    def provider_key(): return os.environ.get("OPENAI" + "_API" + "_KEY", "").strip()

    def extract_email(text):
        m = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", str(text or ""), re.I)
        return m.group(0) if m else None

    def extract_phone(text):
        m = re.search(r"(?:\+?64|0)\s?\d[\d\s-]{6,}", str(text or ""))
        return re.sub(r"\s+", " ", m.group(0)).strip() if m else None

    def extract_address(text):
        raw = str(text or "")
        m = re.search(r"\b\d{1,5}\s+[A-Za-z0-9 .'-]+?\s(?:Road|Rd|Street|St|Drive|Dr|Avenue|Ave|Lane|Ln|Place|Pl|Crescent|Cres|Terrace|Tce|Way|Court|Ct)\b", raw, re.I)
        if m:
            return m.group(0).strip()
        m = re.search(r"\bat\s+([^,$]+)", raw, re.I)
        return m.group(1).strip() if m else ""

    def clean_customer_name(value):
        name = re.sub(r"\s+", " ", str(value or "")).strip(" ,.-")
        name = re.sub(r"\b(?:a|an|the|new|client|customer|job|quote|invoice|mowing|mow|lawn|hedge|clean|cleaning|paint|painting|pest|plumbing|electrical|fortnightly|weekly|monthly)\b", " ", name, flags=re.I)
        name = re.sub(r"\s+", " ", name).strip(" ,.-")
        bad = {"", "completed", "completed jobs", "unpaid", "unpaid invoices", "tomorrow", "today", "next week"}
        if name.lower() in bad:
            return ""
        if len(name) > 80:
            name = name[:80].strip()
        return name

    def explicit_customer_name(text):
        raw = str(text or "")
        raw = re.sub(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", " ", raw, flags=re.I)
        raw = re.sub(r"(?:\+?64|0)\s?\d[\d\s-]{6,}", " ", raw)
        address = extract_address(raw)
        protected = raw.replace(address, " ") if address else raw

        patterns = [
            r"^\s*(?:job|quote|invoice)\s+(?:for\s+)?([A-Za-z][A-Za-z' -]{1,70}?)(?=\s+(?:lawn|lawnmowing|mow|mowing|hedge|clean|cleaning|paint|painting|pest|plumbing|electrical|at|\d{1,5}\s|\$|\d+\b|weekly|fortnight|fortnightly|monthly|next|tomorrow|today|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))\b|[,.;]|$)",
            r"\bfor\s+([A-Za-z][A-Za-z' -]{1,70}?)(?=\s+(?:at|on|in|with|\$|\d{1,5}\s|next|tomorrow|today|weekly|fortnight|fortnightly|monthly|mow|mowing|lawn|hedge|clean|painting|paint|job|quote|invoice)\b|[,.;]|$)",
            r"\b(?:add|create|make|book)\s+(?:a\s+)?(?:job|quote|invoice)\s+(?:for\s+)?([A-Za-z][A-Za-z' -]{1,70}?)(?=\s+(?:at|\d{1,5}\s|on|in|with|\$|next|tomorrow|today|weekly|fortnight|fortnightly|monthly|mow|mowing|lawn|hedge|clean|painting|paint)\b|[,.;]|$)",
            r"\b(?:add|create)\s+(?:a\s+)?(?:client|customer)\s+(?:called|named)?\s*([A-Za-z][A-Za-z' -]{1,70}?)(?=\s+(?:with|email|phone|at|\d{1,5}\s)\b|[,.;]|$)",
        ]

        for pattern in patterns:
            m = re.search(pattern, protected, re.I)
            if m:
                name = clean_customer_name(m.group(1))
                if name:
                    return name
        return ""

    def human_summary_from_payload(p):
        bits = []
        for key in ("customer_name", "client_name", "name"):
            if p.get(key):
                bits.append(str(p.get(key)))
                break
        if p.get("address"):
            bits.append(str(p.get("address")))
        amount = p.get("price") or p.get("amount") or p.get("subtotal") or p.get("total")
        if amount:
            try:
                bits.append(f"${float(str(amount).replace('$', '').strip()):.0f}")
            except Exception:
                bits.append(str(amount))
        if p.get("scheduled_date_human"):
            bits.append(str(p.get("scheduled_date_human")))
        return " · ".join([b for b in bits if b])

    def repair_ai_data(data: dict, text: str, ctx: dict):
        if not isinstance(data, dict):
            return data

        action = str(data.get("action") or "").strip()
        payload = data.get("payload") if isinstance(data.get("payload"), dict) else {}
        name = explicit_customer_name(text)
        address = extract_address(text)

        if name and action in {"create_job", "create_quote", "create_invoice", "draft_invoice_from_job"}:
            payload["customer_name"] = name
            payload["client_name"] = name
            data["match"] = {"record_type": "none", "id": "", "label": "", "reason": "Customer name came directly from owner instruction"}
            details = data.get("details") if isinstance(data.get("details"), dict) else {}
            details["What Churvox found"] = f"Customer name came from the instruction: {name}."
            data["details"] = details

        if name and action == "create_client":
            payload["name"] = name

        if address and action in {"create_job", "create_quote", "create_invoice"}:
            payload["address"] = address

        low_text = str(text or "").lower()
        if action == "create_job":
            if "fortnight" in low_text or "every 2 weeks" in low_text:
                payload["repeat"] = "fortnightly"
                payload["recurrence"] = "fortnightly"
            elif "weekly" in low_text:
                payload["repeat"] = "weekly"
                payload["recurrence"] = "weekly"
            elif "monthly" in low_text:
                payload["repeat"] = "monthly"
                payload["recurrence"] = "monthly"

            mn = re.search(r"\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b", low_text, re.I)
            if mn and not payload.get("scheduled_date_human"):
                payload["scheduled_date_human"] = mn.group(0)

        data["payload"] = payload

        if action == "create_job":
            data["title"] = f"New job: {payload.get('address') or payload.get('customer_name') or 'job to review'}"
        elif action == "create_client":
            data["title"] = f"New client: {payload.get('name') or payload.get('customer_name') or 'client to review'}"
        elif action == "create_quote":
            data["title"] = f"New quote: {payload.get('address') or payload.get('customer_name') or 'quote to review'}"

        summary = human_summary_from_payload(payload)
        if summary:
            data["summary"] = summary

        return data


    def word_set(text):
        stop = {"the","a","an","to","for","at","on","in","and","or","of","with","job","client","quote","invoice","create","add","move","complete","change","price"}
        return {w for w in re.findall(r"[a-z0-9]+", str(text or "").lower()) if w not in stop and len(w) > 2}

    def record_label(record):
        return str(record.get("title") or record.get("name") or record.get("customer_name") or record.get("client_name") or record.get("address") or record.get("invoice_number") or record.get("quote_number") or record.get("id") or "").strip()

    def best_record(records, text, record_type):
        words = word_set(text)
        best = None
        best_score = 0
        for record in records or []:
            haystack = " ".join(str(record.get(k) or "") for k in ("title","name","customer_name","client_name","address","email","phone","invoice_number","quote_number","notes")).lower()
            score = sum(1 for w in words if w in haystack)
            if score > best_score:
                best = record
                best_score = score
        if not best or best_score <= 0:
            return {"record_type": "none", "id": "", "label": "", "reason": "No confident live record match"}
        return {"record_type": record_type, "id": str(best.get("id") or best.get("_id") or ""), "label": record_label(best), "reason": f"Matched {best_score} words from the instruction"}

    def fallback_ai(text: str, ctx: dict, reason: str = "Backend parser used"):
        raw = str(text or "").strip()
        low = raw.lower()
        email = extract_email(raw)
        phone = extract_phone(raw)
        address = extract_address(raw)
        price = money_number(raw)
        client_match = best_record(ctx.get("clients", []), raw, "client")
        job_match = best_record(ctx.get("jobs", []), raw, "job")
        invoice_matches = []
        job_matches = []

        title = "Review prepared from Tell Churvox"
        action = "needs_clarification"
        payload = {}
        match = {"record_type": "none", "id": "", "label": "", "reason": reason}
        matches = []

        if any(w in low for w in ("find", "search", "look up", "show me")):
            action = "find_records"
            matches = [m for m in [client_match, job_match] if m.get("id")]
            title = "Find matching records"
            payload = {"query": raw}

        elif "chase" in low or "follow up" in low or "reminder" in low:
            action = "prepare_invoice_followups"
            invoice_matches = [
                {"record_type": "invoice", "id": str(inv.get("id") or inv.get("_id") or ""), "label": record_label(inv), "reason": "Open invoice follow-up candidate"}
                for inv in ctx.get("invoices", [])
                if str(inv.get("status") or "").lower() in ("sent", "open", "unpaid", "overdue", "part paid", "partial")
            ][:20]
            matches = invoice_matches
            title = "Prepare invoice follow-ups"
            payload = {"message_intent": raw}

        elif "invoice" in low:
            completed_jobs = [
                j for j in ctx.get("jobs", [])
                if str(j.get("status") or j.get("job_status") or "").lower() in ("completed", "complete", "done", "finished")
                and not (j.get("invoice_id") or j.get("draft_invoice_id") or j.get("invoice_number"))
            ][:20]
            if "completed" in low and completed_jobs:
                action = "batch_draft_invoices"
                job_matches = [{"record_type": "job", "id": str(j.get("id") or j.get("_id") or ""), "label": record_label(j), "reason": "Completed job not yet invoiced"} for j in completed_jobs]
                matches = job_matches
                payload = {"job_ids": [m["id"] for m in job_matches if m["id"]]}
                title = "Prepare draft invoices for completed jobs"
            elif job_match.get("id"):
                action = "draft_invoice_from_job"
                match = job_match
                payload = {"job_id": job_match["id"], "amount": price}
                title = "Prepare draft invoice from matched job"
            else:
                action = "create_invoice"
                payload = {"customer_name": client_match.get("label") or "Customer", "customer_email": email, "address": address, "description": raw, "subtotal": price, "notes": raw}
                title = "Prepare draft invoice"

        elif "quote" in low:
            action = "create_quote"
            payload = {"customer_name": client_match.get("label") or "Customer", "customer_email": email, "address": address, "job_description": raw, "job_type": job_type(raw), "price": price, "notes": raw}
            match = client_match if client_match.get("id") else match
            title = "Prepare quote"

        elif "client" in low or email or phone:
            action = "create_client"
            clean_name = re.sub(r"\b(add|create|client|customer|with|email|phone|for|named)\b", " ", raw, flags=re.I)
            clean_name = re.sub(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", " ", clean_name, flags=re.I)
            clean_name = re.sub(r"(?:\+?64|0)\s?\d[\d\s-]{6,}", " ", clean_name).strip(" ,.-")
            payload = {"name": clean_name[:80] or "New customer", "email": email, "phone": phone, "address": address, "notes": raw}
            title = "Prepare new client"

        elif "complete" in low or "done" in low or "finished" in low:
            action = "complete_job"
            match = job_match
            payload = {"job_id": job_match.get("id"), "notes": raw}
            title = "Prepare job completion"

        elif "move" in low or "reschedule" in low or "next week" in low or "tomorrow" in low:
            action = "reschedule_job"
            match = job_match
            payload = {"job_id": job_match.get("id"), "scheduled_date_human": raw, "date": raw}
            title = "Prepare job reschedule"

        elif "price" in low or "charge" in low or "change" in low:
            action = "update_job_price"
            match = job_match
            payload = {"job_id": job_match.get("id"), "price": price, "amount": price, "notes": raw}
            title = "Prepare price update"

        elif any(w in low for w in ("job", "mow", "mowing", "lawn", "hedge", "clean", "paint", "pest", "plumb", "electric")) or address or price:
            action = "create_job"
            typed_name = explicit_customer_name(raw)
            payload = {"title": raw[:90] or "New job", "description": raw, "job_type": job_type(raw), "customer_name": typed_name or client_match.get("label") or "Customer", "client_name": typed_name or client_match.get("label") or "Customer", "address": address or "Address needed", "scheduled_date_human": raw, "date": raw, "price": price, "amount": price, "notes": raw}
            match = client_match if client_match.get("id") else match
            title = "Prepare new job"

        summary = title
        confidence = 0.62 if action != "needs_clarification" else 0.35
        if action in {"complete_job", "reschedule_job", "update_job_price", "draft_invoice_from_job"} and not match.get("id"):
            action = "needs_clarification"
            payload = {"instruction": raw}
            summary = "Churvox needs a clearer job match before preparing this safely."
            title = "Needs clearer job match"
            confidence = 0.25

        return repair_ai_data({
            "action": action,
            "confidence": confidence,
            "title": title,
            "summary": summary,
            "details": {
                "What Churvox found": match.get("label") or f"{reason}. Churvox interpreted the instruction safely.",
                "What Churvox prepared": summary,
                "Why it needs approval": "Owner approval is required before Churvox changes real records.",
            },
            "payload": payload,
            "match": match,
            "matches": matches,
        }, text, ctx)

    async def call_ai(text: str, ctx: dict):
        key = provider_key()
        if not key:
            return fallback_ai(text, ctx, "AI provider is not configured, so Churvox used the safe backend parser")

        client = AsyncOpenAI(api_key=key); model = os.environ.get("CHURVOX_AI_MODEL", "gpt-4o-mini")
        system = "Return JSON only. Use supplied Churvox records only. Do not invent ids. Allowed actions: " + ", ".join(sorted(ALLOWED_ACTIONS)) + ". Prepare draft or approval work only."
        schema = {"action": "create_job", "confidence": 0.0, "title": "", "summary": "", "details": {"What Churvox found": "", "What Churvox prepared": "", "Why it needs approval": ""}, "payload": {}, "match": {"record_type": "none", "id": "", "label": "", "reason": ""}, "matches": []}
        try:
            result = await client.chat.completions.create(model=model, temperature=0.1, response_format={"type": "json_object"}, messages=[{"role": "system", "content": system}, {"role": "user", "content": json.dumps({"instruction": text, "business_context": ctx, "schema": schema}, default=str)[:45000]}])
            data = json.loads(result.choices[0].message.content or "{}")
            action = str(data.get("action") or "needs_clarification").strip()
            if action not in ALLOWED_ACTIONS:
                return fallback_ai(text, ctx, f"AI returned unsupported action: {action}")
            return repair_ai_data(data, text, ctx)
        except HTTPException:
            raise
        except Exception as exc:
            return fallback_ai(text, ctx, f"AI provider failed safely: {type(exc).__name__}")
    def normalize_ai_item(ai_data: dict, text: str, user: dict):
        action = str(ai_data.get("action") or "needs_clarification").strip(); details = ai_data.get("details") if isinstance(ai_data.get("details"), dict) else {}; payload = ai_data.get("payload") if isinstance(ai_data.get("payload"), dict) else {}; match = ai_data.get("match") if isinstance(ai_data.get("match"), dict) else {}; matches = ai_data.get("matches") if isinstance(ai_data.get("matches"), list) else []; business_id, _ = business_ids(user); title = str(ai_data.get("title") or "AI prepared admin work").strip(); summary = str(ai_data.get("summary") or title).strip()
        return {"business_id": business_id, "created_by": str(user.get("id")), "source": "Tell Churvox AI", "status": "open", "action": action, "category": category_for(action), "title": title, "summary": summary, "details": {"What Churvox found": details.get("What Churvox found") or match.get("label") or "AI reviewed the live business records.", "What Churvox prepared": details.get("What Churvox prepared") or summary, "Why it needs approval": details.get("Why it needs approval") or "Owner approval is required before Churvox changes real records."}, "payload": payload, "match": match, "matches": matches, "original_text": text, "ai_confidence": float(ai_data.get("confidence") or 0), "created_at": now(), "updated_at": now()}
    async def invoice_from_payload(user, p):
        business_id, business_oid = business_ids(user); job_id = p.get("job_id")
        if job_id:
            existing = await db.invoices.find_one({"contractor_id": business_oid, "job_id": oid(job_id, "job"), "status": {"$ne": "void"}})
            if existing: return {"duplicate": True, "invoice": doc_out(existing)}
        subtotal = money_number(p.get("subtotal") or p.get("amount") or p.get("total")); gst_rate = float(p.get("gst_rate") or os.environ.get("DEFAULT_GST_RATE", "15"))
        doc = {"customer_name": p.get("customer_name") or p.get("client_name") or "Customer", "customer_email": p.get("customer_email") or p.get("email"), "address": p.get("address") or "", "description": p.get("description") or "Service work", "subtotal": subtotal, "gst_rate": gst_rate, "gst_amount": subtotal * (gst_rate / 100), "total": subtotal + subtotal * (gst_rate / 100), "notes": p.get("notes") or "Draft prepared by Churvox AI.", "status": "draft", "invoice_number": f"INV-{now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}", "public_token": secrets.token_urlsafe(24), "myob_sync_status": "not_synced", "xero_sync_status": "not_synced", "contractor_id": business_oid, "business_id": business_id, "created_at": now()}
        if job_id: doc["job_id"] = oid(job_id, "job")
        res = await db.invoices.insert_one(doc); doc["_id"] = res.inserted_id
        if job_id: await db.jobs.update_one({"_id": oid(job_id, "job"), "contractor_id": business_oid}, {"$set": {"invoice_id": res.inserted_id, "invoice_created": True, "invoiced": True}})
        return {"invoice": doc_out(doc)}
    async def payload_from_job(user, job_id, amount=None):
        _, business_oid = business_ids(user); job = await db.jobs.find_one({"_id": oid(job_id, "job"), "contractor_id": business_oid})
        if not job: raise HTTPException(status_code=404, detail="Matched job not found")
        return {"job_id": str(job["_id"]), "customer_name": job.get("customer_name") or job.get("client_name") or "Customer", "customer_email": job.get("customer_email") or job.get("client_email"), "address": job.get("address") or job.get("site_address") or "", "description": job.get("title") or job.get("job_name") or "Completed job", "subtotal": money_number(amount or job.get("price") or job.get("fixed_price") or 0), "notes": "Draft invoice prepared from matched job by Churvox AI."}

    @router.post("/tell-churvox/prepare")
    async def tell_churvox_prepare(payload: Dict[str, Any], request: Request):
        user = await require_owner(request); text = str(payload.get("text") or payload.get("instruction") or "").strip()
        if not text: raise HTTPException(status_code=400, detail="Tell Churvox what you want done first")
        item = normalize_ai_item(await call_ai(text, await context_for(user)), text, user); res = await db.ai_review_items.insert_one(item); item["_id"] = res.inserted_id
        return {"success": True, "item": doc_out(item)}
    @router.get("/ai-review-items")
    async def list_ai_review_items(request: Request):
        user = await require_owner(request); business_id, _ = business_ids(user)
        items = await db.ai_review_items.find({"business_id": business_id, "status": {"$in": ["open", "edited"]}}).sort("created_at", -1).limit(200).to_list(200)
        return {"success": True, "items": [doc_out(x) for x in items]}
    @router.patch("/ai-review-items/{item_id}")
    async def save_ai_review_item(item_id: str, payload: Dict[str, Any], request: Request):
        user = await require_owner(request); business_id, _ = business_ids(user)
        update = {"status": "edited", "owner_note": payload.get("note") or payload.get("owner_note") or "", "updated_at": now()}
        if isinstance(payload.get("payload"), dict): update["payload"] = payload["payload"]
        await db.ai_review_items.update_one({"_id": oid(item_id, "review item"), "business_id": business_id}, {"$set": update})
        item = await db.ai_review_items.find_one({"_id": oid(item_id, "review item"), "business_id": business_id})
        if not item: raise HTTPException(status_code=404, detail="Review item not found")
        return {"success": True, "item": doc_out(item)}
    @router.post("/ai-review-items/{item_id}/ignore")
    async def ignore_item(item_id: str, payload: Dict[str, Any], request: Request):
        user = await require_owner(request); business_id, _ = business_ids(user)
        await db.ai_review_items.update_one({"_id": oid(item_id, "review item"), "business_id": business_id}, {"$set": {"status": "ignored", "owner_note": payload.get("note") or "", "updated_at": now()}})
        return {"success": True}
    @router.post("/ai-review-items/{item_id}/approve")
    async def approve_item(item_id: str, payload: Dict[str, Any], request: Request):
        user = await require_owner(request); business_id, business_oid = business_ids(user)
        item = await db.ai_review_items.find_one({"_id": oid(item_id, "review item"), "business_id": business_id, "status": {"$in": ["open", "edited"]}})
        if not item: raise HTTPException(status_code=404, detail="Review item not found")
        action = item.get("action"); p = dict(item.get("payload") or {}); executed = {}
        if action == "create_client":
            doc = {"name": p.get("name") or p.get("customer_name") or "Customer", "email": p.get("email") or p.get("customer_email"), "phone": p.get("phone"), "address": p.get("address"), "notes": p.get("notes") or item.get("summary"), "contractor_id": business_oid, "business_id": business_id, "created_at": now()}; res = await db.clients.insert_one(doc); doc["_id"] = res.inserted_id; executed = {"client": doc_out(doc)}
        elif action == "create_job":
            doc = {"title": p.get("title") or p.get("description") or "AI prepared job", "job_type": job_type(p.get("job_type") or p.get("title") or p.get("notes")), "customer_name": p.get("customer_name") or p.get("client_name") or "Customer", "address": p.get("address") or "Address needed", "scheduled_date": date_value(p.get("scheduled_date") or p.get("scheduled_date_human") or p.get("date")), "estimated_duration": int(p.get("estimated_duration") or 60), "price": money_number(p.get("price") or p.get("amount")), "pricing_type": "fixed", "notes": p.get("notes") or item.get("summary"), "contractor_id": business_oid, "business_id": business_id, "created_by": oid(user.get("id"), "user"), "status": "assigned", "created_at": now()}; res = await db.jobs.insert_one(doc); doc["_id"] = res.inserted_id; executed = {"job": doc_out(doc)}
        elif action == "create_quote":
            doc = {"customer_name": p.get("customer_name") or p.get("client_name") or "Customer", "customer_email": p.get("customer_email") or p.get("email"), "address": p.get("address") or "", "job_description": p.get("job_description") or p.get("description") or "Service work", "job_type": job_type(p.get("job_type") or p.get("job_description")), "price": money_number(p.get("price") or p.get("amount")), "pricing_type": "fixed", "notes": p.get("notes") or item.get("summary"), "status": "draft", "quote_number": f"QT-{now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}", "public_token": secrets.token_urlsafe(24), "contractor_id": business_oid, "business_id": business_id, "created_at": now()}; res = await db.quotes.insert_one(doc); doc["_id"] = res.inserted_id; executed = {"quote": doc_out(doc)}
        elif action == "create_invoice": executed = await invoice_from_payload(user, p)
        elif action == "draft_invoice_from_job": executed = await invoice_from_payload(user, await payload_from_job(user, p.get("job_id") or (item.get("match") or {}).get("id"), p.get("subtotal") or p.get("amount")))
        elif action == "batch_draft_invoices":
            job_ids = p.get("job_ids") or [m.get("id") for m in item.get("matches", []) if m.get("id")]; executed = {"drafts": [await invoice_from_payload(user, await payload_from_job(user, jid)) for jid in job_ids]}
        elif action in {"complete_job", "reschedule_job", "update_job_price"}:
            jid = p.get("job_id") or (item.get("match") or {}).get("id")
            if not jid: raise HTTPException(status_code=400, detail="AI did not match a job")
            update = {"updated_at": now()}
            if action == "complete_job": update.update({"status": "completed", "job_status": "completed", "workflow_status": "completed", "completed": True, "completed_at": now()})
            elif action == "reschedule_job": update["scheduled_date"] = date_value(p.get("scheduled_date") or p.get("scheduled_date_human") or p.get("date"))
            else: update["price"] = money_number(p.get("price") or p.get("amount"))
            await db.jobs.update_one({"_id": oid(jid, "job"), "contractor_id": business_oid}, {"$set": update}); executed = {"job_id": str(jid), "updated": update}
        elif action == "prepare_invoice_followups": executed = {"drafts_prepared": len(item.get("matches") or [])}
        elif action == "find_records": executed = {"matches": item.get("matches") or []}
        else: raise HTTPException(status_code=400, detail="AI needs clarification before approval")
        await db.ai_review_items.update_one({"_id": item["_id"]}, {"$set": {"status": "approved", "owner_note": payload.get("note") or "", "approved_at": now(), "executed_result": serial(executed), "updated_at": now()}})
        return {"success": True, "executed": serial(executed)}
    return router
