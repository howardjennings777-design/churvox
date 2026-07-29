from __future__ import annotations

from typing import Any, Dict

import churvox_role_and_share_isolation_patch as role_security
import churvox_tenant_isolation_security_patch as tenant

VERSION = "churvox-security-final-tightening-20260729-v1"
PUBLIC_PHOTO_KEYS = {
    "url", "src", "path", "thumbnail", "thumbnail_url", "preview_url",
    "caption", "name", "filename", "uploaded_at", "created_at",
}


def public_photo(value: Any):
    if isinstance(value, str):
        return value
    if not isinstance(value, dict):
        return None
    return {
        key: tenant.safe(item)
        for key, item in value.items()
        if key in PUBLIC_PHOTO_KEYS
    }


def public_photos(values: Any):
    if not isinstance(values, list):
        return []
    cleaned = []
    for value in values[:100]:
        item = public_photo(value)
        if item not in (None, {}, ""):
            cleaned.append(item)
    return cleaned


async def secure_public_proof(module, request, token_value: str):
    JSONResponse = module.JSONResponse
    token_value = tenant.text(token_value, 300)
    if not role_security.valid_public_token(token_value):
        return JSONResponse({"success": False, "detail": "Proof pack not found"}, status_code=404)
    try:
        pack = await module.db.job_proof_packs.find_one({
            "$or": [
                {"public_token": token_value},
                {"token": token_value},
            ]
        })
    except Exception:
        pack = None
    if not pack:
        return JSONResponse({"success": False, "detail": "Proof pack not found"}, status_code=404)
    item: Dict[str, Any] = {
        "job_title": tenant.text(pack.get("job_title") or pack.get("title") or "Completed work"),
        "customer_name": tenant.text(pack.get("customer_name") or pack.get("client_name")),
        "status": tenant.text(pack.get("status") or "ready"),
        "ai_summary": tenant.text(pack.get("ai_summary") or pack.get("summary"), 6000),
        "owner_message": tenant.text(pack.get("owner_message"), 6000),
        "photos": public_photos(pack.get("photos") or []),
        "completed_at": tenant.safe(pack.get("completed_at")),
        "updated_at": tenant.safe(pack.get("updated_at")),
    }
    return JSONResponse({"success": True, "proof_pack": item, "pack": item, "item": item})


def install(_module=None):
    # Status exposes the same Stripe/business diagnostics as debug and must not be
    # available to workers or ordinary authenticated members.
    role_security.OWNER_ONLY_EXACT.add("/api/payments/on-site/status")
    # The installed middleware resolves this module global at request time, so
    # replacing it here hardens already-registered public proof routes.
    role_security.secure_public_proof = secure_public_proof
    return True


__all__ = [
    "VERSION", "install", "public_photo", "public_photos", "secure_public_proof",
]
