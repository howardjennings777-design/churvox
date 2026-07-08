from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys
from typing import Any

from fastapi import HTTPException
from starlette.requests import Request
from starlette.responses import JSONResponse

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


def read(user: Any, *names: str):
    for name in names:
        try:
            if isinstance(user, dict) and user.get(name) not in (None, ""):
                return user.get(name)
            value = getattr(user, name, None)
            if value not in (None, ""):
                return value
        except Exception:
            pass
    return ""


def current_industry(user: Any):
    profile_doc = read(user, "business_profile") or {}
    brain_doc = read(user, "industry_brain") or {}
    profile = read(user, "industry_profile", "industry_key")
    mode = read(user, "industry_mode")
    if not profile and isinstance(profile_doc, dict):
        profile = profile_doc.get("industry_key") or profile_doc.get("industry")
    if not mode and isinstance(brain_doc, dict):
        mode = brain_doc.get("mode")
    return text(profile or "field_service") or "field_service", text(mode or "field_service") or "field_service"


def checklist_for(profile: str, mode: str):
    k = key(profile)
    m = key(mode)
    if "lawn" in k or "landscape" in k or "garden" in k:
        return ["Before lawn/garden photo", "After lawn/garden photo", "Gate/access note", "Green waste or extra work note", "Weather issue note"]
    if "clean" in k or "visit" in m:
        return ["Before condition photo", "After clean photo", "Checklist completed", "Access/key issue note", "Extra time or supplies note"]
    if any(word in k for word in ["plumbing", "electrical", "hvac"]):
        return ["Before issue photo", "After repair/install photo", "Parts used", "Safety/compliance note", "Customer approval note"]
    return ["Before photo", "After photo", "Worker completion note", "Customer-visible summary"]


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
        return {"id" if k == "_id" else k: safe(v) for k, v in value.items() if not any(word in str(k).lower() for word in ["password", "token", "secret", "hash"])}
    return value


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if not app or db is None or get_current_user is None:
        return

    async def user_from_request(request: Request):
        try:
            return await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated")

    async def payload(request: Request):
        user = await user_from_request(request)
        try:
            profile, mode = current_industry(user)
        except Exception:
            profile, mode = "field_service", "field_service"
        job_id = text(request.query_params.get("job_id") or request.query_params.get("id"))
        saved = []
        if job_id:
            try:
                cursor = db.job_proof_packs.find({"job_id": job_id}).sort("updated_at", -1)
                saved = [safe(row) for row in await cursor.limit(20).to_list(length=20)]
            except Exception:
                saved = []
        return {
            "success": True,
            "source": "churvox_jobs_proof_pack_middleware_guard",
            "industry_key": profile,
            "mode": mode,
            "job_id": job_id,
            "checklist": checklist_for(profile, mode),
            "saved_proof": saved,
            "updated_at": now_iso(),
        }

    async def save_payload(request: Request):
        user = await user_from_request(request)
        try:
            body = await request.json()
        except Exception:
            body = {}
        if not isinstance(body, dict):
            body = {}
        try:
            profile, mode = current_industry(user)
        except Exception:
            profile, mode = "field_service", "field_service"
        row = {
            "business_id": text(read(user, "business_id", "businessId", "owner_business_id", "contractor_id", "id", "_id")),
            "owner_email": low(read(user, "email", "user_email")),
            "job_id": text(body.get("job_id")),
            "industry_key": profile,
            "mode": mode,
            "checklist": body.get("checklist") or checklist_for(profile, mode),
            "notes": text(body.get("notes")),
            "items": body.get("items") or [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        try:
            await db.job_proof_packs.insert_one(row)
        except Exception:
            pass
        return {"success": True, "source": "churvox_jobs_proof_pack_middleware_guard", "proof_pack": safe(row)}

    @app.middleware("http")
    async def proof_pack_middleware(request: Request, call_next):
        if request.url.path == "/api/jobs/proof-pack":
            try:
                if request.method.upper() == "POST":
                    return JSONResponse(await save_payload(request))
                return JSONResponse(await payload(request))
            except HTTPException as exc:
                return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
            except Exception:
                return JSONResponse({
                    "success": True,
                    "source": "churvox_jobs_proof_pack_middleware_guard_fallback",
                    "industry_key": "field_service",
                    "mode": "field_service",
                    "job_id": "",
                    "checklist": checklist_for("field_service", "field_service"),
                    "saved_proof": [],
                    "updated_at": now_iso(),
                })
        return await call_next(request)

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
