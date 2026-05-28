# CHURVOX_TOP_TIER_BACKEND_ENDPOINTS_20260528
# Small direct-route patch for Work Slip / Operator Tools UI.

import uuid


def register(server):
    app = getattr(server, "app", None)
    if not app or getattr(app.state, "churvox_top_tier_routes_ready", False):
        return False

    db = server.db
    Depends = server.Depends
    Body = server.Body
    HTTPException = server.HTTPException
    ObjectId = server.ObjectId
    datetime = server.datetime
    timezone = server.timezone
    get_current_user = server.get_current_user
    get_user_business_id = server.get_user_business_id
    roles = set(getattr(server, "BUSINESS_ROLES", set())) | {"owner", "admin", "employer", "manager", "office_admin"}
    frontend_url = getattr(server, "FRONTEND_URL", "https://www.churvox.com")

    def now():
        return datetime.now(timezone.utc)

    def guard(user):
        if str((user or {}).get("role") or "").lower() not in roles:
            raise HTTPException(status_code=403, detail="Owner/admin access required")

    def safe(doc):
        if not doc:
            return doc
        if isinstance(doc, list):
            return [safe(x) for x in doc]
        out = dict(doc)
        if "_id" in out:
            out["id"] = str(out.pop("_id"))
        for k, v in list(out.items()):
            if isinstance(v, ObjectId):
                out[k] = str(v)
            elif hasattr(v, "isoformat"):
                out[k] = v.isoformat()
            elif isinstance(v, list):
                out[k] = safe(v)
            elif isinstance(v, dict):
                out[k] = safe(v)
        return out

    def id_filter(value):
        opts = [{"id": str(value)}]
        try:
            if ObjectId.is_valid(str(value)):
                opts.append({"_id": ObjectId(str(value))})
        except Exception:
            pass
        return {"$or": opts}

    async def find_job(job_id, business_id):
        row = await db.jobs.find_one({"$and": [{"business_id": str(business_id)}, id_filter(job_id)]})
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
        return row

    async def find_client(client_id, business_id):
        return await db.clients.find_one({"$and": [{"business_id": str(business_id)}, id_filter(client_id)]})

    async def proof_list(current_user: dict = Depends(get_current_user)):
        guard(current_user)
        bid = await get_user_business_id(current_user)
        items = []
        async for p in db.job_proof_packs.find({"business_id": str(bid)}).sort("updated_at", -1).limit(200):
            item = safe(p)
            t = item.get("public_token") or item.get("token") or ""
            item["public_path"] = f"/public/proof/{t}" if t else ""
            item["public_url"] = f"{frontend_url}/public/proof/{t}" if t else ""
            items.append(item)
        return {"success": True, "items": items, "proof_packs": items, "data": items}

    async def proof_from_job(job_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user)
        bid = await get_user_business_id(current_user)
        ts = now()
        job = await find_job(job_id, bid)
        jid = str(job.get("id") or job.get("_id") or job_id)
        client_id = str(job.get("client_id") or "")
        client = await find_client(client_id, bid) if client_id else None
        existing = await db.job_proof_packs.find_one({"business_id": str(bid), "job_id": jid})
        public_token = (existing or {}).get("public_token") or uuid.uuid4().hex
        photos = job.get("photos") or job.get("completion_photos") or []
        if not isinstance(photos, list):
            photos = []
        doc = {
            "business_id": str(bid),
            "job_id": jid,
            "client_id": client_id,
            "job_title": job.get("title") or job.get("job_name") or "Completed work",
            "customer_name": (client or {}).get("name") or job.get("customer_name") or job.get("client_name") or "",
            "invoice_id": str(job.get("invoice_id") or job.get("draft_invoice_id") or ""),
            "quote_id": str(job.get("quote_id") or ""),
            "status": "ready_for_owner_review",
            "public_token": public_token,
            "token": public_token,
            "ai_summary": str((payload or {}).get("ai_summary") or job.get("invoice_description_draft") or "Work has been completed and prepared for owner review."),
            "owner_message": str((payload or {}).get("owner_message") or ""),
            "photos": photos,
            "updated_at": ts,
        }
        if existing:
            await db.job_proof_packs.update_one({"_id": existing["_id"]}, {"$set": doc})
        else:
            doc["created_at"] = ts
            await db.job_proof_packs.insert_one(doc)
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"proof_pack_prepared": True, "proof_pack_public_token": public_token, "updated_at": ts}})
        pack = safe(await db.job_proof_packs.find_one({"business_id": str(bid), "job_id": jid}))
        pack["public_path"] = f"/public/proof/{public_token}"
        pack["public_url"] = f"{frontend_url}/public/proof/{public_token}"
        return {"success": True, "proof_pack": pack, "pack": pack, "item": pack, "public_path": pack["public_path"], "public_url": pack["public_url"]}

    async def public_proof(token: str):
        pack = await db.job_proof_packs.find_one({"$or": [{"public_token": token}, {"token": token}, {"id": token}]})
        if not pack:
            raise HTTPException(status_code=404, detail="Proof pack not found")
        item = safe(pack)
        return {"success": True, "proof_pack": item, "pack": item, "item": item}

    async def reopen(job_id: str, current_user: dict = Depends(get_current_user)):
        guard(current_user)
        bid = await get_user_business_id(current_user)
        job = await find_job(job_id, bid)
        ts = now()
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"owner_review_status": "ready_for_review", "work_review_status": "ready_for_review", "reviewed": False, "owner_approved": False, "work_approved": False, "updated_at": ts}})
        await db.ai_audit_log.insert_one({"business_id": str(bid), "action": "work_slip_reopened", "target_type": "job", "target_id": str(job.get("id") or job.get("_id")), "note": "Owner reopened Work Slip.", "created_at": ts})
        return {"success": True, "message": "Work Slip reopened"}

    async def client_memory(client_id: str, current_user: dict = Depends(get_current_user)):
        guard(current_user)
        bid = await get_user_business_id(current_user)
        client = await find_client(client_id, bid)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        ids = [str(client_id), str(client.get("id") or ""), str(client.get("_id") or "")]
        ids = [x for x in ids if x]
        jobs = [safe(x) async for x in db.jobs.find({"business_id": str(bid), "client_id": {"$in": ids}}).sort("updated_at", -1).limit(8)]
        invoices = [safe(x) async for x in db.invoices.find({"business_id": str(bid), "client_id": {"$in": ids}}).sort("updated_at", -1).limit(8)]
        quotes = [safe(x) async for x in db.quotes.find({"business_id": str(bid), "client_id": {"$in": ids}}).sort("updated_at", -1).limit(6)]
        return {"success": True, "memory": {"client": safe(client), "last_jobs": jobs, "last_invoices": invoices, "last_quotes": quotes, "warnings": client.get("warnings") or client.get("access_notes") or client.get("notes") or "", "preferred_worker": ""}}

    async def audit_get(current_user: dict = Depends(get_current_user)):
        guard(current_user)
        bid = await get_user_business_id(current_user)
        rows = [safe(x) async for x in db.ai_audit_log.find({"business_id": str(bid)}).sort("created_at", -1).limit(200)]
        return {"success": True, "items": rows}

    async def audit_post(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user)
        bid = await get_user_business_id(current_user)
        doc = {"business_id": str(bid), "action": str((payload or {}).get("action") or "operator_action"), "target_type": str((payload or {}).get("target_type") or ""), "target_id": str((payload or {}).get("target_id") or ""), "note": str((payload or {}).get("note") or ""), "created_at": now()}
        res = await db.ai_audit_log.insert_one(doc)
        doc["_id"] = res.inserted_id
        return {"success": True, "item": safe(doc)}

    async def offline_sync(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        bid = await get_user_business_id(current_user)
        actions = (payload or {}).get("actions") or []
        if not isinstance(actions, list):
            actions = []
        saved = 0
        for action in actions[:100]:
            if isinstance(action, dict):
                await db.offline_sync_actions.insert_one({**action, "business_id": str(bid), "synced_at": now()})
                saved += 1
        return {"success": True, "queued": saved, "synced_count": saved}

    async def worker_note(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        bid = await get_user_business_id(current_user)
        note = str((payload or {}).get("note") or (payload or {}).get("transcript") or (payload or {}).get("text") or "").strip()
        if not note:
            raise HTTPException(status_code=400, detail="Note is required")
        job_id = str((payload or {}).get("job_id") or "")
        doc = {"business_id": str(bid), "job_id": job_id, "worker_id": str(current_user.get("id") or ""), "note": note, "transcript": note, "status": "draft", "created_at": now(), "updated_at": now()}
        res = await db.worker_voice_notes.insert_one(doc)
        doc["_id"] = res.inserted_id
        if job_id:
            await db.jobs.update_one({"$and": [{"business_id": str(bid)}, id_filter(job_id)]}, {"$set": {"last_worker_note": note, "worker_notes": note, "updated_at": now()}})
        return {"success": True, "note": safe(doc)}

    app.add_api_route("/api/proof-packs", proof_list, methods=["GET"])
    app.add_api_route("/api/proof-packs/from-job/{job_id}", proof_from_job, methods=["POST"])
    app.add_api_route("/api/public/proof/{token}", public_proof, methods=["GET"])
    app.add_api_route("/api/work-slips/{job_id}/reopen", reopen, methods=["POST"])
    app.add_api_route("/api/clients/{client_id}/memory", client_memory, methods=["GET"])
    app.add_api_route("/api/ai/audit-log", audit_get, methods=["GET"])
    app.add_api_route("/api/ai/audit-log", audit_post, methods=["POST"])
    app.add_api_route("/api/offline-sync", offline_sync, methods=["POST"])
    app.add_api_route("/api/worker/voice-notes/draft", worker_note, methods=["POST"])
    app.state.churvox_top_tier_routes_ready = True
    return True
