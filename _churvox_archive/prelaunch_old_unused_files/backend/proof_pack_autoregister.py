"""Safe auto-registration helper for proof pack API routes.

Adds the missing /api/proof-packs route without editing the huge server.py.
This removes frontend 404s and gives Command Hub / Proof-to-Paid a real backend
collection to read from.
"""

import importlib
import logging
from datetime import datetime, timezone

try:
    from bson import ObjectId
except Exception:  # pragma: no cover
    ObjectId = None

logger = logging.getLogger(__name__)
_PATCHED = False
_ORIGINAL_IMPORT_MODULE = importlib.import_module
OWNER_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"}


def _now():
    return datetime.now(timezone.utc)


def _safe_doc(doc):
    if not isinstance(doc, dict):
        return doc
    out = dict(doc)
    if "_id" in out:
        out["id"] = str(out.get("_id"))
        out.pop("_id", None)
    for key, value in list(out.items()):
        if ObjectId is not None and isinstance(value, ObjectId):
            out[key] = str(value)
        elif hasattr(value, "isoformat"):
            try:
                out[key] = value.isoformat()
            except Exception:
                out[key] = str(value)
    return out


def _safe_docs(items):
    return [_safe_doc(x) for x in (items or [])]


def _record_query(record_id, business_id):
    clauses = [{"id": str(record_id)}]
    if ObjectId is not None:
        try:
            if ObjectId.is_valid(str(record_id)):
                clauses.append({"_id": ObjectId(str(record_id))})
        except Exception:
            pass
    return {"business_id": str(business_id), "$or": clauses}


def _register_on_server_module(module):
    if getattr(module, "_PROOF_PACK_ROUTES_AUTOREGISTERED", False):
        return module

    required = ["app", "db", "get_current_user", "get_user_business_id", "APIRouter"]
    if any(not hasattr(module, name) for name in required):
        return module

    try:
        from fastapi import Depends, Body, HTTPException

        router = module.APIRouter(prefix="/api")
        db = module.db
        get_current_user = module.get_current_user
        get_user_business_id = module.get_user_business_id

        async def _business_id(current_user):
            role = str((current_user or {}).get("role") or "").lower().strip()
            if role not in OWNER_ROLES and role != "worker":
                raise HTTPException(status_code=403, detail="Proof packs are not available for this role")
            return await get_user_business_id(current_user)

        @router.get("/proof-packs")
        async def list_proof_packs(current_user: dict = Depends(get_current_user)):
            business_id = await _business_id(current_user)
            items = await db.proof_packs.find({"business_id": str(business_id)}).sort("updated_at", -1).limit(500).to_list(length=500)
            return {"success": True, "items": _safe_docs(items), "proof_packs": _safe_docs(items)}

        @router.get("/proof-packs/{proof_pack_id}")
        async def get_proof_pack(proof_pack_id: str, current_user: dict = Depends(get_current_user)):
            business_id = await _business_id(current_user)
            pack = await db.proof_packs.find_one(_record_query(proof_pack_id, business_id))
            if not pack:
                raise HTTPException(status_code=404, detail="Proof pack not found")
            return {"success": True, "proof_pack": _safe_doc(pack), "item": _safe_doc(pack)}

        @router.post("/proof-packs")
        async def create_proof_pack(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
            business_id = await _business_id(current_user)
            payload = dict(payload or {})
            job_id = str(payload.get("job_id") or payload.get("jobId") or "").strip()
            existing = None
            if job_id:
                existing = await db.proof_packs.find_one({"business_id": str(business_id), "job_id": job_id})
            if existing:
                return {"success": True, "message": "Proof pack already exists.", "proof_pack": _safe_doc(existing), "item": _safe_doc(existing)}
            pack = {
                **payload,
                "business_id": str(business_id),
                "job_id": job_id,
                "status": payload.get("status") or "ready_for_review",
                "source": payload.get("source") or "proof_pack_api",
                "created_at": _now(),
                "updated_at": _now(),
            }
            result = await db.proof_packs.insert_one(pack)
            pack["_id"] = result.inserted_id
            if job_id:
                await db.jobs.update_one({"business_id": str(business_id), "$or": [{"id": job_id}, {"_id": ObjectId(job_id)}] if ObjectId is not None and ObjectId.is_valid(job_id) else [{"id": job_id}]}, {"$set": {"proof_pack_id": str(result.inserted_id), "proof_pack_ready": True, "updated_at": _now()}})
            return {"success": True, "message": "Proof pack created.", "proof_pack": _safe_doc(pack), "item": _safe_doc(pack)}

        module.app.include_router(router)
        setattr(module, "_PROOF_PACK_ROUTES_AUTOREGISTERED", True)
        logger.info("Proof pack routes auto-registered")
    except Exception as exc:
        logger.exception("Proof pack route auto-registration failed: %s", exc)

    return module


def install():
    global _PATCHED
    if _PATCHED:
        return
    _PATCHED = True

    def patched_import_module(name, package=None):
        module = _ORIGINAL_IMPORT_MODULE(name, package)
        if name in {"server", "backend.server"}:
            return _register_on_server_module(module)
        return module

    importlib.import_module = patched_import_module
