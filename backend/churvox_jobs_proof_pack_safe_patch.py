from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys
from typing import Any

from fastapi import HTTPException
from starlette.requests import Request

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def text(value: Any) -> str:
    try:
        return str(value or "").strip()
    except Exception:
        return ""


def low(value: Any) -> str:
    return text(value).lower()


def key(value: Any) -> str:
    return "".join(ch for ch in low(value) if ch.isalnum())


def safe(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, list):
        return [safe(v) for v in value]
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if any(word in str(k).lower() for word in ["password", "token", "secret", "hash"]):
                continue
            out["id" if k == "_id" else k] = safe(v)
        return out
    return value


def read_attr(obj: Any, *names: str, default: Any = None):
    for name in names:
        try:
            if isinstance(obj, dict) and obj.get(name) not in (None, ""):
                return obj.get(name)
            value = getattr(obj, name, None)
            if value not in (None, ""):
                return value
        except Exception:
            pass
    return default


def current_industry(user: Any):
    business_profile = read_attr(user, "business_profile", default={}) or {}
    industry_brain = read_attr(user, "industry_brain", default={}) or {}
    profile = read_attr(user, "industry_profile", "industry_key")
    if not profile and isinstance(business_profile, dict):
        profile = business_profile.get("industry_key") or business_profile.get("industry")
    mode = read_attr(user, "industry_mode")
    if not mode and isinstance(industry_brain, dict):
        mode = industry_brain.get("mode")
    return text(profile or "field_service") or "field_service", text(mode or "field_service") or "field_service"


def proof_pack_for(industry_key="field_service", mode="field_service"):
    k = key(industry_key)
    m = key(mode)
    if "lawn" in k or "landscape" in k or "garden" in k:
        return ["Before lawn/garden photo", "After lawn/garden photo", "Gate/access note", "Green waste or extra work note", "Weather issue note"]
    if "clean" in k or "visit" in m:
        return ["Before condition photo", "After clean photo", "Checklist completed", "Access/key issue note", "Extra time or supplies note"]
    if any(word in k for word in ["plumbing", "electrical", "hvac"]):
        return ["Before issue photo", "After repair/install photo", "Parts used", "Safety/compliance note", "Customer approval note"]
    if any(word in k for word in ["beauty", "nails", "lashes", "brows"]):
        return ["Before photo", "After photo", "Formula/style notes", "Allergy/preference note", "Rebooking reminder"]
    if "pet" in k:
        return ["Before pet photo", "After pet photo", "Pet behaviour note", "Coat/skin issue note", "Next groom reminder"]
    if "wellness" in k or "coaching" in k or "tutoring" in k:
        return ["Session notes", "Progress summary", "Follow-up task", "Next appointment reminder"]
    if "project" in m or "event" in k or "photo" in k:
        return ["Stage/deliverable complete", "Progress photos", "Variation/deposit note", "Client approval note", "Next stage reminder"]
    return ["Before photo", "After photo", "Worker completion note", "Customer-visible summary"]


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if not app or db is None or get_current_user is None:
        return

    def remove_route(path: str, method: str):
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass

    async def get_saved(job_id: str):
        if not job_id:
            return []
        try:
            cursor = db.job_proof_packs.find({"job_id": job_id}).sort("updated_at", -1)
            return [safe(row) for row in await cursor.limit(20).to_list(length=20)]
        except Exception:
            return []

    async def proof_pack(request: Request):
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated")
        profile, mode = current_industry(user)
        job_id = text(request.query_params.get("job_id") or request.query_params.get("id"))
        return {
            "success": True,
            "source": "churvox_jobs_proof_pack_safe",
            "industry_key": profile,
            "mode": mode,
            "job_id": job_id,
            "checklist": proof_pack_for(profile, mode),
            "saved_proof": await get_saved(job_id),
            "updated_at": now_iso(),
        }

    async def save_proof_pack(request: Request):
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            body = await request.json()
        except Exception:
            body = {}
        profile, mode = current_industry(user)
        row = {
            "business_id": text(read_attr(user, "business_id", "businessId", "owner_business_id", "contractor_id", "id", "_id")),
            "owner_email": low(read_attr(user, "email", "user_email")),
            "job_id": text((body or {}).get("job_id")),
            "industry_key": profile,
            "mode": mode,
            "checklist": (body or {}).get("checklist") or proof_pack_for(profile, mode),
            "notes": text((body or {}).get("notes")),
            "items": (body or {}).get("items") or [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        try:
            await db.job_proof_packs.insert_one(row)
        except Exception:
            pass
        return {"success": True, "source": "churvox_jobs_proof_pack_safe", "proof_pack": safe(row)}

    for path, endpoint, method in [
        ("/api/jobs/proof-pack", proof_pack, "GET"),
        ("/api/jobs/proof-pack", save_proof_pack, "POST"),
    ]:
        remove_route(path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None

    def exec_module(self, module):
        self.original.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())
for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
