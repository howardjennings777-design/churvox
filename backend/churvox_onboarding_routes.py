# CHURVOX_NEW_USER_GUIDE_REAL_PROGRESS_20260611

from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Body
from typing import Any, Dict


def build_onboarding_router(db, get_current_user, ObjectId):
    router = APIRouter(tags=["onboarding"])

    def now():
        return datetime.now(timezone.utc)

    def safe_dt(value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    def safe_doc(doc):
        if not doc:
            return None
        out = dict(doc)
        if "_id" in out:
            out["id"] = str(out["_id"])
            out["_id"] = str(out["_id"])
        out.pop("password_hash", None)
        out.pop("password", None)
        return {k: safe_dt(v) for k, v in out.items()}

    async def owner_business_id(user: Dict[str, Any]):
        raw = user.get("business_id") or user.get("id")
        if not raw:
            raise HTTPException(status_code=401, detail="Business not found")
        return str(raw)

    def business_queries(business_id: str, user_id: str | None = None):
        ids = [str(business_id)]
        objects = []
        try:
            if ObjectId.is_valid(str(business_id)):
                objects.append(ObjectId(str(business_id)))
        except Exception:
            pass
        if user_id:
            ids.append(str(user_id))
            try:
                if ObjectId.is_valid(str(user_id)):
                    objects.append(ObjectId(str(user_id)))
            except Exception:
                pass

        mixed = ids + objects
        return [
            {"business_id": {"$in": mixed}},
            {"owner_id": {"$in": mixed}},
            {"user_id": {"$in": mixed}},
            {"created_by": {"$in": mixed}},
        ]

    async def count_any(collection, business_id, user_id=None, extra=None):
        q = {"$or": business_queries(business_id, user_id)}
        if extra:
            q = {"$and": [q, extra]}
        try:
            return await db[collection].count_documents(q)
        except Exception:
            return 0

    async def find_latest(collection, business_id, user_id=None):
        q = {"$or": business_queries(business_id, user_id)}
        try:
            doc = await db[collection].find_one(q, sort=[("created_at", -1)])
            return safe_doc(doc)
        except Exception:
            return None

    async def read_saved(business_id: str, user_id: str):
        try:
            saved = await db.onboarding_progress.find_one({
                "$or": [
                    {"business_id": business_id},
                    {"user_id": user_id},
                ]
            })
            return safe_doc(saved) or {}
        except Exception:
            return {}

    async def save_patch(business_id: str, user_id: str, patch: Dict[str, Any]):
        payload = dict(patch)
        payload["business_id"] = business_id
        payload["user_id"] = user_id
        payload["updated_at"] = now()
        await db.onboarding_progress.update_one(
            {"business_id": business_id},
            {"$set": payload, "$setOnInsert": {"created_at": now()}},
            upsert=True,
        )

    def profile_score(user):
        fields = [
            user.get("business_name"),
            user.get("email"),
            user.get("gst_rate"),
            user.get("trade_type"),
        ]
        done = sum(1 for x in fields if x not in (None, "", "other"))
        return done, len(fields)

    def make_step(key, title, why, action, page, done, proof="", time="1 min", optional=False):
        return {
            "key": key,
            "title": title,
            "why": why,
            "action": action,
            "page": page,
            "done": bool(done),
            "proof": proof,
            "time": time,
            "optional": optional,
        }

    async def build_progress(user):
        user_id = str(user.get("id"))
        business_id = await owner_business_id(user)
        saved = await read_saved(business_id, user_id)
        manual_done = set(saved.get("manual_done") or [])

        profile_done, profile_total = profile_score(user)
        clients = await count_any("clients", business_id, user_id)
        jobs = await count_any("jobs", business_id, user_id)
        invoices = await count_any("invoices", business_id, user_id)
        invoices_sent = await count_any("invoices", business_id, user_id, {"status": {"$in": ["sent", "paid", "overdue"]}})
        quotes = await count_any("quotes", business_id, user_id)
        workers = await count_any("users", business_id, user_id, {"role": {"$in": ["worker", "payroll", "manager", "office_admin"]}})
        command_slips = await count_any("command_slips", business_id, user_id)

        latest_client = await find_latest("clients", business_id, user_id)
        latest_job = await find_latest("jobs", business_id, user_id)
        latest_invoice = await find_latest("invoices", business_id, user_id)

        steps = [
            make_step(
                "business_profile",
                "Set your business basics",
                "Your quotes, invoices and customer messages need the right name, GST and contact details.",
                "Open Settings",
                "settings",
                profile_done >= 3 or "business_profile" in manual_done,
                f"{profile_done}/{profile_total} basics found",
                "1 min",
            ),
            make_step(
                "first_client",
                "Add your first real client",
                "Churvox becomes useful when there is a real customer, address and contact history.",
                "Add / open Clients",
                "clients",
                clients > 0 or "first_client" in manual_done,
                f"{clients} client record{'s' if clients != 1 else ''}",
                "1 min",
            ),
            make_step(
                "first_job",
                "Create your first job",
                "This proves the main workflow: job → worker/self → complete → invoice.",
                "Create / open Jobs",
                "jobs",
                jobs > 0 or "first_job" in manual_done,
                f"{jobs} job record{'s' if jobs != 1 else ''}",
                "1 min",
            ),
            make_step(
                "worker_or_self",
                "Choose who will do the work",
                "A new owner should know they can assign a worker or run the job themselves.",
                "Open Worker / Team",
                "worker",
                workers > 0 or jobs > 0 or "worker_or_self" in manual_done,
                f"{workers} team member{'s' if workers != 1 else ''}",
                "45 sec",
                optional=True,
            ),
            make_step(
                "first_invoice",
                "Send or prepare the first invoice",
                "This is the money moment. The user should see how Churvox helps them get paid.",
                "Open Invoices",
                "invoices",
                invoices_sent > 0 or invoices > 0 or "first_invoice" in manual_done,
                f"{invoices} invoice record{'s' if invoices != 1 else ''}",
                "1 min",
            ),
            make_step(
                "command_approval",
                "Approve one thing in Command",
                "This teaches the product promise: Churvox does the admin. You approve.",
                "Open Command",
                "command",
                command_slips > 0 or "command_approval" in manual_done,
                f"{command_slips} Command slip{'s' if command_slips != 1 else ''}",
                "30 sec",
            ),
        ]

        required = [s for s in steps if not s.get("optional")]
        done_required = [s for s in required if s["done"]]
        percent = round((len(done_required) / max(len(required), 1)) * 100)
        next_step = next((s for s in steps if not s["done"] and not s.get("optional")), None) or next((s for s in steps if not s["done"]), None)

        return {
            "ok": True,
            "business_id": business_id,
            "user_id": user_id,
            "dismissed": bool(saved.get("dismissed")),
            "skipped": bool(saved.get("skipped")),
            "completed": percent >= 100,
            "percent": percent,
            "done": len(done_required),
            "total": len(required),
            "steps": steps,
            "next_step": next_step,
            "counts": {
                "clients": clients,
                "jobs": jobs,
                "quotes": quotes,
                "invoices": invoices,
                "invoices_sent": invoices_sent,
                "workers": workers,
                "command_slips": command_slips,
            },
            "latest": {
                "client": latest_client,
                "job": latest_job,
                "invoice": latest_invoice,
            },
            "message": "Churvox does the admin. You approve.",
        }

    @router.get("/onboarding/progress")
    async def onboarding_progress(request: Request):
        user = await get_current_user(request)
        return await build_progress(user)

    @router.post("/onboarding/step/{step_key}/done")
    async def mark_step_done(step_key: str, request: Request):
        user = await get_current_user(request)
        business_id = await owner_business_id(user)
        user_id = str(user.get("id"))
        saved = await read_saved(business_id, user_id)
        manual_done = set(saved.get("manual_done") or [])
        manual_done.add(step_key)
        await save_patch(business_id, user_id, {"manual_done": sorted(manual_done), "dismissed": False, "skipped": False})
        return await build_progress(user)

    @router.post("/onboarding/state")
    async def onboarding_state(request: Request, payload: Dict[str, Any] = Body(default={})):
        user = await get_current_user(request)
        business_id = await owner_business_id(user)
        user_id = str(user.get("id"))
        patch = {}
        if "dismissed" in payload:
            patch["dismissed"] = bool(payload.get("dismissed"))
        if "skipped" in payload:
            patch["skipped"] = bool(payload.get("skipped"))
        if payload.get("resume"):
            patch["dismissed"] = False
            patch["skipped"] = False
        await save_patch(business_id, user_id, patch)
        return await build_progress(user)

    return router
