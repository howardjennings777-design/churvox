from typing import Any, Dict

from fastapi import APIRouter, Request

try:
    from churvox_command_routes import build_command_router
except Exception:
    from backend.churvox_command_routes import build_command_router


SIGNATURE_DRAFT_AREAS = {
    "job_done_closeout": "operations_review",
    "money_radar_review": "accounting_review",
}


def route_signature_draft_area(payload: Dict[str, Any]):
    """Keep signature approvals in review collections, never live jobs/invoices."""
    normalized = dict(payload or {})
    source_type = str(normalized.get("source_type") or normalized.get("sourceType") or "").strip().lower()
    target_area = SIGNATURE_DRAFT_AREAS.get(source_type)
    if not target_area:
        return normalized
    inner = normalized.get("payload")
    inner = dict(inner) if isinstance(inner, dict) else {}
    inner["area"] = target_area
    inner["internal_draft_only"] = True
    inner["source_records_unchanged"] = True
    inner["external_actions_locked"] = True
    normalized["payload"] = inner
    return normalized


def build_signature_command_create_router(db, get_current_user, ObjectId):
    """Delegate normal Command creation after applying signature-only routing."""
    delegate_router = build_command_router(db, get_current_user, ObjectId)
    create_endpoint = None
    for route in delegate_router.routes:
        methods = set(getattr(route, "methods", set()) or set())
        if getattr(route, "path", "") == "/command/slips" and "POST" in methods:
            create_endpoint = route.endpoint
            break
    if create_endpoint is None:
        raise RuntimeError("Churvox Command slip create endpoint was not found")

    router = APIRouter()

    @router.post("/command/slips")
    async def create_signature_safe_command_slip(payload: Dict[str, Any], request: Request):
        return await create_endpoint(route_signature_draft_area(payload), request)

    return router
