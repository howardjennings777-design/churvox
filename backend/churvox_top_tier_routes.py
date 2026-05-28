# CHURVOX_TOP_TIER_BACKEND_ENDPOINTS_20260528
# Small direct-route patch for Work Slip / Operator Tools UI.
# CHURVOX_LAUNCH_SAFE_ALL7_BACKEND_WIRING_20260529

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
    send_email = getattr(server, "send_email", None)

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

    def text(*values):
        for value in values:
            if value is not None and str(value).strip():
                return str(value).strip()
        return ""

    def html_escape(value):
        return str(value or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#039;")

    def collection_for(target_type):
        t = str(target_type or "").lower().replace("_", " ")
        if "invoice" in t:
            return db.invoices, "invoice"
        if "quote" in t:
            return db.quotes, "quote"
        if "job" in t or "work slip" in t:
            return db.jobs, "job"
        return None, t or "message"

    async def find_job(job_id, business_id):
        row = await db.jobs.find_one({"$and": [{"business_id": str(business_id)}, id_filter(job_id)]})
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
        return row

    async def find_client(client_id, business_id):
        return await db.clients.find_one({"$and": [{"business_id": str(business_id)}, id_filter(client_id)]})

    async def insert_audit(business_id, action, target_type="", target_id="", note=""):
        doc = {"business_id": str(business_id), "action": str(action), "target_type": str(target_type or ""), "target_id": str(target_id or ""), "note": str(note or ""), "created_at": now()}
        await db.ai_audit_log.insert_one(doc)
        return doc

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
        await insert_audit(bid, "work_slip_reopened", "job", str(job.get("id") or job.get("_id")), "Owner reopened Work Slip.")
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
        doc = await insert_audit(bid, str((payload or {}).get("action") or "operator_action"), str((payload or {}).get("target_type") or ""), str((payload or {}).get("target_id") or ""), str((payload or {}).get("note") or ""))
        res = await db.ai_audit_log.insert_one(doc) if False else None
        return {"success": True, "item": safe(doc)}

    async def message_send(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user)
        bid = await get_user_business_id(current_user)
        ts = now()
        message = text((payload or {}).get("message"), (payload or {}).get("body"))
        subject = text((payload or {}).get("subject"), "Update from Churvox")
        target_type = text((payload or {}).get("target_type"), "message")
        target_id = text((payload or {}).get("target_id"), (payload or {}).get("record_id"))
        to_email = text((payload or {}).get("to_email"), (payload or {}).get("customer_email"))
        collection, normalized_type = collection_for(target_type)
        source = None
        if collection is not None and target_id:
            source = await collection.find_one({"$and": [{"business_id": str(bid)}, id_filter(target_id)]})
            if source:
                to_email = to_email or text(source.get("customer_email"), source.get("client_email"), source.get("email"))
                subject = subject or f"Update for {text(source.get('customer_name'), source.get('client_name'), source.get('title'), 'your job')}"
        if not message:
            raise HTTPException(status_code=400, detail="Message is required before sending")
        if not to_email:
            raise HTTPException(status_code=400, detail="Customer email is required before sending")
        if not callable(send_email):
            raise HTTPException(status_code=500, detail="Email sender is not available")

        html = f"<div style='font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;line-height:1.55;color:#111827'><p>{html_escape(message).replace(chr(10), '<br/>')}</p><hr/><p style='font-size:12px;color:#64748b'>Sent after owner approval in Churvox.</p></div>"
        try:
            provider_response = await send_email(to_email, subject, html, message)
            status = "sent"
            error = ""
        except Exception as exc:
            provider_response = {}
            status = "failed"
            error = str(exc)

        doc = {
            "business_id": str(bid),
            "target_type": normalized_type,
            "target_id": target_id,
            "to_email": to_email,
            "subject": subject,
            "message": message,
            "status": status,
            "provider_response": provider_response,
            "error": error,
            "approved_by": str(current_user.get("id") or current_user.get("_id") or ""),
            "created_at": ts,
            "sent_at": ts if status == "sent" else None,
        }
        await db.message_approvals.insert_one(doc)
        if collection is not None and source:
            await collection.update_one({"_id": source["_id"]}, {"$set": {"customer_message_draft": message, "last_message_subject": subject, "last_message_to": to_email, "message_approval_status": status, "message_sent_at": ts if status == "sent" else None, "message_send_error": error, "updated_at": ts}})
        await insert_audit(bid, "message_sent_after_owner_approval" if status == "sent" else "message_send_failed_after_owner_approval", normalized_type, target_id, f"Message approval {status} for {to_email}. {error}".strip())
        if status != "sent":
            raise HTTPException(status_code=502, detail=error or "Message send failed")
        return {"success": True, "status": status, "message": "Message sent after owner approval", "item": safe(doc)}

    async def dispatch_assign(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user)
        bid = await get_user_business_id(current_user)
        job_id = text((payload or {}).get("job_id"), (payload or {}).get("target_id"))
        worker_id = text((payload or {}).get("worker_id"), (payload or {}).get("assigned_worker_id"))
        worker_name = text((payload or {}).get("worker_name"), (payload or {}).get("assigned_worker_name"))
        if not job_id:
            raise HTTPException(status_code=400, detail="job_id is required")
        if not worker_id and not worker_name:
            raise HTTPException(status_code=400, detail="Choose a worker before assigning")
        job = await find_job(job_id, bid)
        ts = now()
        conflict_count = await db.jobs.count_documents({"business_id": str(bid), "$and": [{"$or": [{"assigned_worker_id": worker_id}, {"assigned_worker_name": worker_name}]}, {"status": {"$nin": ["completed", "cancelled", "canceled"]}}]}) if (worker_id or worker_name) else 0
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"assigned_worker_id": worker_id, "assigned_worker_name": worker_name, "assigned_to": worker_id or worker_name, "status": "assigned", "dispatch_status": "assigned", "dispatch_assigned_at": ts, "updated_at": ts}})
        await insert_audit(bid, "dispatch_worker_assigned", "job", job_id, f"Owner assigned {worker_name or worker_id}. Open-job conflict count before save: {max(0, conflict_count - 1)}.")
        return {"success": True, "message": "Worker assigned", "conflict_count": max(0, conflict_count - 1)}

    async def offline_sync(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        bid = await get_user_business_id(current_user)
        actions = (payload or {}).get("actions") or []
        if not isinstance(actions, list):
            actions = []
        saved = 0
        applied = 0
        ts = now()
        for action in actions[:100]:
            if not isinstance(action, dict):
                continue
            kind = text(action.get("type"), "offline_action")
            job_id = text(action.get("job_id"), action.get("target_id"))
            await db.offline_sync_actions.insert_one({**action, "business_id": str(bid), "synced_at": ts})
            saved += 1
            if not job_id:
                continue
            update = {"updated_at": ts, "last_offline_action_type": kind, "last_offline_synced_at": ts}
            note = text(action.get("note"), action.get("message"), action.get("transcript"), action.get("text"))
            if kind in {"worker_note", "job_note"} and note:
                update.update({"last_worker_note": note, "worker_notes": note})
            elif kind in {"job_start", "start_job"}:
                update.update({"status": "in_progress", "started_at": text(action.get("created_at")) or ts})
            elif kind in {"job_pause", "pause_job"}:
                update.update({"status": "paused", "paused_at": text(action.get("created_at")) or ts})
            elif kind in {"job_resume", "resume_job"}:
                update.update({"status": "in_progress", "resumed_at": text(action.get("created_at")) or ts})
            elif kind in {"job_complete", "complete_job"}:
                update.update({"status": "completed", "completed": True, "completed_at": text(action.get("created_at")) or ts})
                if note:
                    update.update({"completion_notes": note, "worker_completion_notes": note, "worker_notes": note})
            elif kind in {"job_issue", "issue_report"}:
                update.update({"last_worker_issue": note or "Worker reported an issue offline", "needs_owner_review": True})
            elif kind in {"photo_upload", "job_photo"}:
                update.update({"offline_photo_pending": True, "last_photo_note": note or "Photo upload queued offline"})
            result = await db.jobs.update_one({"$and": [{"business_id": str(bid)}, id_filter(job_id)]}, {"$set": update})
            if result.matched_count:
                applied += 1
        return {"success": True, "queued": saved, "synced_count": saved, "applied_count": applied}

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
    app.add_api_route("/api/message-approvals/send", message_send, methods=["POST"])
    app.add_api_route("/api/dispatch/assign", dispatch_assign, methods=["POST"])
    app.add_api_route("/api/offline-sync", offline_sync, methods=["POST"])
    app.add_api_route("/api/worker/voice-notes/draft", worker_note, methods=["POST"])
    app.state.churvox_top_tier_routes_ready = True
    return True
