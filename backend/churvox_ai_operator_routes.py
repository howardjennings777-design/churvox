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
    async def call_ai(text: str, ctx: dict):
        key = provider_key()
        if not key: raise HTTPException(status_code=503, detail="AI provider is not configured in Render yet.")
        client = AsyncOpenAI(api_key=key); model = os.environ.get("CHURVOX_AI_MODEL", "gpt-4o-mini")
        system = "Return JSON only. Use supplied Churvox records only. Do not invent ids. Allowed actions: " + ", ".join(sorted(ALLOWED_ACTIONS)) + ". Prepare draft or approval work only."
        schema = {"action": "create_job", "confidence": 0.0, "title": "", "summary": "", "details": {"What Churvox found": "", "What Churvox prepared": "", "Why it needs approval": ""}, "payload": {}, "match": {"record_type": "none", "id": "", "label": "", "reason": ""}, "matches": []}
        result = await client.chat.completions.create(model=model, temperature=0.1, response_format={"type": "json_object"}, messages=[{"role": "system", "content": system}, {"role": "user", "content": json.dumps({"instruction": text, "business_context": ctx, "schema": schema}, default=str)[:45000]}])
        try: data = json.loads(result.choices[0].message.content or "{}")
        except Exception: raise HTTPException(status_code=502, detail="AI response could not be read. No work was saved.")
        action = str(data.get("action") or "needs_clarification").strip()
        if action not in ALLOWED_ACTIONS: raise HTTPException(status_code=400, detail=f"AI returned unsupported action: {action}")
        return data
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
