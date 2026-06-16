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

    def money_number(value):
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        match = re.search(r"\$?\s*(\d+(?:\.\d{1,2})?)", str(value))
        return float(match.group(1)) if match else 0.0

    def parse_date(value):
        raw = str(value or "").strip().lower()
        base = now()
        if "today" in raw:
            return base
        if "tomorrow" in raw:
            return base + timedelta(days=1)
        if "next week" in raw:
            return base + timedelta(days=7)
        match = re.search(r"\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b", raw)
        if match:
            day = int(match.group(1)); month = int(match.group(2)); year = int(match.group(3)) if match.group(3) else base.year
            if year < 100:
                year += 2000
            try:
                return datetime(year, month, day, 9, 0, tzinfo=timezone.utc)
            except Exception:
                pass
        return base + timedelta(days=1)

    def safe_job_type(value):
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
        if "garden" in low:
            return "gardening"
        return "other"

    return router
