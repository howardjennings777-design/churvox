import importlib
from datetime import datetime

try:
    from bson import ObjectId
except Exception:
    ObjectId = None

_PATCHED = False
_ORIGINAL_IMPORT_MODULE = importlib.import_module
ALLOWED = {"owner", "employer", "admin", "manager", "office_admin", "office admin", "business_owner", "platform_owner"}


def sid(value):
    if value is None:
        return ""
    if ObjectId is not None and isinstance(value, ObjectId):
        return str(value)
    return str(value or "")


def text(value, fallback=""):
    return str(value or fallback or "").strip()


def clean(doc):
    if isinstance(doc, list):
        return [clean(x) for x in doc]
    if not isinstance(doc, dict):
        return doc
    out = dict(doc)
    if "_id" in out:
        out["id"] = sid(out.pop("_id"))
    for key, value in list(out.items()):
        if ObjectId is not None and isinstance(value, ObjectId):
            out[key] = str(value)
        elif isinstance(value, datetime):
            out[key] = value.isoformat()
        elif isinstance(value, dict):
            out[key] = clean(value)
        elif isinstance(value, list):
            out[key] = [clean(x) for x in value]
    return out


def ok_slip(row):
    payload = row.get("payload") or row.get("draft_payload") or {}
    kind = text(row.get("action_type") or row.get("type")).replace("-", "_")
    if "quote" in kind:
        return bool(text(payload.get("quote_id") or row.get("related_entity_id")) and text(payload.get("customer_email")))
    if kind == "invoice_reminder" or kind == "send_invoice":
        return bool(text(payload.get("invoice_id") or row.get("related_entity_id")) and text(payload.get("customer_email")))
    if kind == "create_invoice_draft" or "invoice_draft" in kind:
        return bool(text(payload.get("job_id") or row.get("related_entity_id")) and text(payload.get("description")) and str(payload.get("subtotal") or payload.get("price") or "").strip())
    if kind == "assign_worker":
        return bool(text(payload.get("job_id") or row.get("related_entity_id")) and text(payload.get("worker_id")))
    if "job_review" in kind:
        return bool(text(payload.get("job_id") or row.get("related_entity_id")))
    return False


def install():
    global _PATCHED
    if _PATCHED:
        return
    _PATCHED = True

    def patched(name, package=None):
        module = _ORIGINAL_IMPORT_MODULE(name, package)
        if name in {"server", "backend.server"}:
            register(module)
        return module
    importlib.import_module = patched


def register(module):
    if getattr(module, "_SAFE_DEEP_SLIP_LIST_REGISTERED", False):
        return module
    if any(not hasattr(module, name) for name in ["app", "db", "get_current_user", "get_user_business_id", "APIRouter"]):
        return module

    from fastapi import Depends, HTTPException

    router = module.APIRouter(prefix="/api")
    db = module.db
    get_current_user = module.get_current_user
    get_user_business_id = module.get_user_business_id

    def guard(user):
        if text((user or {}).get("role")).lower() not in ALLOWED:
            raise HTTPException(status_code=403, detail="Owner approval required")

    @router.get("/ai/operator/approval-items-safe")
    async def approval_items_safe(current_user: dict = Depends(get_current_user)):
        guard(current_user)
        business_id = await get_user_business_id(current_user)
        rows = await db.ai_operator_actions.find({
            "business_id": str(business_id),
            "status": {"$nin": ["completed", "rejected", "dismissed", "cancelled", "canceled"]},
        }).sort("updated_at", -1).to_list(length=100)
        safe = []
        blocked = []
        for row in rows:
            if ok_slip(row):
                safe.append(row)
            else:
                blocked.append(row)
        return {"success": True, "data": clean(safe), "actions": clean(safe), "blocked_count": len(blocked)}

    module.app.include_router(router)
    setattr(module, "_SAFE_DEEP_SLIP_LIST_REGISTERED", True)
    return module
