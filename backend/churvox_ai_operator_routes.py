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
        if action in MONEY_ACTIONS:
            return "money"
        if action in WORK_ACTIONS:
            return "work"
        if action in CREATE_ACTIONS:
            return "create"
        return "other"

    async def context_for(user):
        business_id, business_oid = business_ids(user)
        clients = await db.clients.find({"contractor_id": business_oid}).sort("created_at", -1).limit(60).to_list(60)
        jobs = await db.jobs.find({"contractor_id": business_oid}).sort("created_at", -1).limit(120).to_list(120)
        quotes = await db.quotes.find({"contractor_id": business_oid}).sort("created_at", -1).limit(60).to_list(60)
        invoices = await db.invoices.find({"contractor_id": business_oid}).sort("created_at", -1).limit(120).to_list(120)
        return {"business_id": business_id, "clients": [doc_out(x) for x in clients], "jobs": [doc_out(x) for x in jobs], "quotes": [doc_out(x) for x in quotes], "invoices": [doc_out(x) for x in invoices]}

    def provider_key():
        return os.environ.get("OPENAI" + "_API" + "_KEY", "").strip()

    async def call_ai(text: str, ctx: dict):
        key = provider_key()
        if not key:
            raise HTTPException(status_code=503, detail="AI provider is not configured in Render yet.")
        client = AsyncOpenAI(api_key=key)
        model = os.environ.get("CHURVOX_AI_MODEL", "gpt-4o-mini")
        system = "Return JSON only. Use the supplied Churvox records only. Do not invent record ids. Allowed actions: " + ", ".join(sorted(ALLOWED_ACTIONS)) + ". Prepare draft or approval work only."
        schema = {"action": "create_job", "confidence": 0.0, "title": "", "summary": "", "details": {"What Churvox found": "", "What Churvox prepared": "", "Why it needs approval": ""}, "payload": {}, "match": {"record_type": "none", "id": "", "label": "", "reason": ""}, "matches": []}
        result = await client.chat.completions.create(model=model, temperature=0.1, response_format={"type": "json_object"}, messages=[{"role": "system", "content": system}, {"role": "user", "content": json.dumps({"instruction": text, "business_context": ctx, "schema": schema}, default=str)[:45000]}])
        try:
            data = json.loads(result.choices[0].message.content or "{}")
        except Exception:
            raise HTTPException(status_code=502, detail="AI response could not be read. No work was saved.")
        action = str(data.get("action") or "needs_clarification").strip()
        if action not in ALLOWED_ACTIONS:
            raise HTTPException(status_code=400, detail=f"AI returned unsupported action: {action}")
        return data

    def normalize_ai_item(ai_data: dict, text: str, user: dict):
        action = str(ai_data.get("action") or "needs_clarification").strip()
        details = ai_data.get("details") if isinstance(ai_data.get("details"), dict) else {}
        payload = ai_data.get("payload") if isinstance(ai_data.get("payload"), dict) else {}
        match = ai_data.get("match") if isinstance(ai_data.get("match"), dict) else {}
        matches = ai_data.get("matches") if isinstance(ai_data.get("matches"), list) else []
        business_id, _ = business_ids(user)
        title = str(ai_data.get("title") or "AI prepared admin work").strip()
        summary = str(ai_data.get("summary") or title).strip()
        return {"business_id": business_id, "created_by": str(user.get("id")), "source": "Tell Churvox AI", "status": "open", "action": action, "category": category_for(action), "title": title, "summary": summary, "details": {"What Churvox found": details.get("What Churvox found") or match.get("label") or "AI reviewed the live business records.", "What Churvox prepared": details.get("What Churvox prepared") or summary, "Why it needs approval": details.get("Why it needs approval") or "Owner approval is required before Churvox changes real records."}, "payload": payload, "match": match, "matches": matches, "original_text": text, "ai_confidence": float(ai_data.get("confidence") or 0), "created_at": now(), "updated_at": now()}

    @router.post("/tell-churvox/prepare")
    async def tell_churvox_prepare(payload: Dict[str, Any], request: Request):
        user = await require_owner(request)
        text = str(payload.get("text") or payload.get("instruction") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="Tell Churvox what you want done first")
        ctx = await context_for(user)
        item = normalize_ai_item(await call_ai(text, ctx), text, user)
        result = await db.ai_review_items.insert_one(item)
        item["_id"] = result.inserted_id
        return {"success": True, "item": doc_out(item)}

    @router.get("/ai-review-items")
    async def list_ai_review_items(request: Request):
        user = await require_owner(request)
        business_id, _ = business_ids(user)
        items = await db.ai_review_items.find({"business_id": business_id, "status": {"$in": ["open", "edited"]}}).sort("created_at", -1).limit(200).to_list(200)
        return {"success": True, "items": [doc_out(x) for x in items]}

    return router
