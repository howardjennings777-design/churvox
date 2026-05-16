from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi import Depends, HTTPException, Body
import secrets
import re


OWNER_ROLES = {"owner", "admin", "employer", "manager", "office_admin", "platform_owner"}


def register_top_player_features(api_router, db, get_current_user, get_user_business_id, frontend_url: str):
    frontend_url = (frontend_url or "https://www.churvox.com").rstrip("/")

    def now():
        return datetime.now(timezone.utc)

    def safe_id(value):
        if value is None:
            return ""
        if isinstance(value, ObjectId):
            return str(value)
        return str(value)

    def oid(value):
        try:
            text = str(value or "").strip()
            if ObjectId.is_valid(text):
                return ObjectId(text)
        except Exception:
            pass
        return None

    def safe_text(value, fallback=""):
        text = str(value or "").strip()
        return text or fallback

    def slug(value):
        return re.sub(r"[^a-z0-9]+", "_", str(value or "").lower()).strip("_")

    def safe_float(value, default=0.0):
        try:
            if value is None:
                return default
            if isinstance(value, (int, float)):
                return float(value)
            cleaned = re.sub(r"[^0-9.\-]", "", str(value))
            return float(cleaned) if cleaned else default
        except Exception:
            return default

    def public_doc(doc):
        if not isinstance(doc, dict):
            return doc
        out = {}
        for k, v in doc.items():
            if k == "_id":
                out["id"] = str(v)
            elif isinstance(v, ObjectId):
                out[k] = str(v)
            elif hasattr(v, "isoformat"):
                out[k] = v.isoformat()
            elif isinstance(v, list):
                out[k] = [public_doc(x) if isinstance(x, dict) else x for x in v]
            elif isinstance(v, dict):
                out[k] = public_doc(v)
            else:
                out[k] = v
        return out

    def business_scope(business_id):
        parts = [
            {"business_id": str(business_id)},
            {"businessId": str(business_id)},
            {"owner_id": str(business_id)},
            {"ownerId": str(business_id)},
        ]
        obj = oid(business_id)
        if obj:
            parts.extend([
                {"business_id": obj},
                {"owner_id": obj},
            ])
        return {"$or": parts}

    def id_scope(record_id):
        parts = [
            {"id": str(record_id)},
            {"job_id": str(record_id)},
            {"client_id": str(record_id)},
            {"quote_id": str(record_id)},
            {"invoice_id": str(record_id)},
        ]
        obj = oid(record_id)
        if obj:
            parts.append({"_id": obj})
        return {"$or": parts}

    async def require_owner_user(current_user):
        role = str((current_user or {}).get("role") or "").lower()
        if role not in OWNER_ROLES and not current_user.get("is_platform_owner"):
            raise HTTPException(status_code=403, detail="Owner, manager or office admin access required")
        return str(await get_user_business_id(current_user))

    async def find_scoped(collection, business_id, record_id):
        if not record_id:
            return None
        return await collection.find_one({"$and": [business_scope(business_id), id_scope(record_id)]})

    async def load_core(business_id):
        scope = business_scope(business_id)
        jobs = await db.jobs.find(scope).sort("created_at", -1).limit(500).to_list(length=500)
        clients = await db.clients.find(scope).sort("created_at", -1).limit(500).to_list(length=500)
        quotes = await db.quotes.find(scope).sort("created_at", -1).limit(500).to_list(length=500)
        invoices = await db.invoices.find(scope).sort("created_at", -1).limit(500).to_list(length=500)

        workers = []
        for collection_name in ["business_users", "users", "workers"]:
            try:
                extra = await getattr(db, collection_name).find({
                    "$and": [
                        scope,
                        {"role": {"$in": ["worker", "employee", "field_worker", "manager", "office_admin", "payroll"]}},
                    ]
                }).limit(500).to_list(length=500)
                workers.extend(extra)
            except Exception:
                pass

        seen = set()
        unique_workers = []
        for worker in workers:
            key = safe_id(worker.get("_id") or worker.get("id") or worker.get("email") or worker.get("name"))
            if key and key not in seen:
                seen.add(key)
                unique_workers.append(worker)

        return jobs, clients, quotes, invoices, unique_workers

    def status_of(item):
        return slug(
            item.get("status")
            or item.get("job_status")
            or item.get("workflow_status")
            or item.get("payment_status")
            or item.get("quote_status")
            or item.get("state")
            or ""
        )

    def is_complete_job(job):
        return status_of(job) in {"completed", "complete", "done", "finished"} or job.get("completed") is True or bool(job.get("completed_at"))

    def has_worker(job):
        return bool(
            job.get("assigned_worker_id")
            or job.get("worker_id")
            or job.get("assigned_to")
            or job.get("assigned_worker_name")
            or job.get("worker_name")
        )

    def photo_count(item):
        total = 0
        for key in ["photos", "photo_urls", "worker_photos", "proof_photos", "job_photos", "images"]:
            value = item.get(key)
            if isinstance(value, list):
                total += len(value)
            elif isinstance(value, str) and value.strip():
                total += 1
        return total

    def client_name(item):
        return safe_text(
            item.get("client_name")
            or item.get("customer_name")
            or item.get("name")
            or item.get("business_name")
            or "Client"
        )

    def job_title(job):
        return safe_text(
            job.get("title")
            or job.get("job_title")
            or job.get("service_type")
            or job.get("job_type")
            or job.get("name")
            or job.get("address")
            or "Job"
        )

    def worker_name(worker):
        return safe_text(worker.get("name") or worker.get("full_name") or worker.get("worker_name") or worker.get("email") or "Worker")

    def score_worker(worker, job, all_jobs):
        score = 20
        reasons = []

        worker_region = slug(worker.get("region") or worker.get("area") or worker.get("suburb") or worker.get("service_area"))
        job_region = slug(job.get("region") or job.get("area") or job.get("suburb") or job.get("city"))
        if worker_region and job_region and worker_region == job_region:
            score += 35
            reasons.append("same area")
        elif worker_region and job_region and (worker_region in job_region or job_region in worker_region):
            score += 20
            reasons.append("near area match")

        job_words = set(re.findall(r"[a-z0-9]{4,}", " ".join([
            str(job.get("service_type") or ""),
            str(job.get("job_type") or ""),
            str(job.get("title") or ""),
            str(job.get("description") or ""),
        ]).lower()))

        skill_blob = " ".join([
            str(worker.get("skills") or ""),
            str(worker.get("trade") or ""),
            str(worker.get("service_type") or ""),
            str(worker.get("experience") or ""),
            str(worker.get("notes") or ""),
        ]).lower()

        hits = [word for word in job_words if word in skill_blob][:4]
        if hits:
            score += min(30, len(hits) * 8)
            reasons.append("skill match: " + ", ".join(hits))

        worker_id = safe_id(worker.get("_id") or worker.get("id"))
        wname = slug(worker_name(worker))
        active_count = 0
        for other in all_jobs:
            if is_complete_job(other):
                continue
            if worker_id and safe_id(other.get("assigned_worker_id") or other.get("worker_id")) == worker_id:
                active_count += 1
            elif wname and slug(other.get("assigned_worker_name") or other.get("worker_name")) == wname:
                active_count += 1

        if active_count == 0:
            score += 20
            reasons.append("no active assigned jobs")
        elif active_count <= 2:
            score += 8
            reasons.append(f"{active_count} active job{'s' if active_count != 1 else ''}")
        else:
            score -= min(25, active_count * 5)
            reasons.append(f"{active_count} active jobs already")

        status = slug(worker.get("status") or worker.get("availability") or "active")
        if status in {"inactive", "disabled", "busy", "off"}:
            score -= 40
            reasons.append(f"status: {status}")
        else:
            score += 8
            reasons.append("available/active")

        return {
            "worker": public_doc(worker),
            "worker_id": safe_id(worker.get("_id") or worker.get("id")),
            "worker_name": worker_name(worker),
            "score": max(0, min(100, round(score))),
            "reasons": reasons,
            "workload": active_count,
        }

    def best_worker(job, workers, all_jobs):
        scored = [score_worker(worker, job, all_jobs) for worker in workers if slug(worker.get("role") or "worker") in {"worker", "employee", "field_worker", "manager", "office_admin"}]
        scored.sort(key=lambda row: row["score"], reverse=True)
        return scored[0] if scored else None

    def margin_payload(record):
        price = safe_float(record.get("price") or record.get("subtotal") or record.get("amount") or record.get("total") or record.get("quote_total") or record.get("job_price"))
        labour_hours = safe_float(record.get("labour_hours") or record.get("labor_hours") or record.get("hours") or record.get("estimated_hours") or record.get("billable_hours"))
        labour_rate = safe_float(record.get("labour_rate") or record.get("labor_rate") or record.get("hourly_rate") or record.get("rate"), 0)
        material_cost = safe_float(record.get("material_cost") or record.get("materials_cost") or record.get("materials") or record.get("cost_of_goods"))
        travel_cost = safe_float(record.get("travel_cost") or record.get("vehicle_cost") or record.get("fuel_cost"))
        extra_cost = safe_float(record.get("extra_cost") or record.get("extras_cost") or record.get("other_cost"))
        labour_cost = labour_hours * labour_rate
        total_cost = labour_cost + material_cost + travel_cost + extra_cost
        profit = price - total_cost
        margin_percent = round((profit / price) * 100, 1) if price > 0 else 0

        warnings = []
        if price <= 0:
            warnings.append("No sell price saved")
        if labour_hours <= 0 and labour_rate > 0:
            warnings.append("Labour rate exists but hours are missing")
        if material_cost <= 0 and str(record.get("notes") or record.get("description") or "").lower().find("material") >= 0:
            warnings.append("Materials are mentioned but no material cost is saved")
        if price > 0 and margin_percent < 25:
            warnings.append("Low margin warning")
        if price > 0 and profit < 0:
            warnings.append("This job/quote may be losing money")

        recommendation = "Looks healthy."
        if warnings:
            recommendation = "Review price before sending. " + " ".join(warnings)
        elif margin_percent < 35 and price > 0:
            recommendation = "Margin is okay but tight. Consider adding travel, materials or extras if needed."

        return {
            "price": price,
            "labour_hours": labour_hours,
            "labour_rate": labour_rate,
            "labour_cost": round(labour_cost, 2),
            "material_cost": material_cost,
            "travel_cost": travel_cost,
            "extra_cost": extra_cost,
            "total_cost": round(total_cost, 2),
            "profit": round(profit, 2),
            "margin_percent": margin_percent,
            "warnings": warnings,
            "recommendation": recommendation,
        }

    WORK_PACKS = {
        "lawn_care": {
            "label": "Lawn care pack",
            "checklist": ["Confirm address and access", "Mow lawns", "Trim edges", "Blow paths/driveway", "Check gates are closed"],
            "required_photos": ["Before front area", "After front area", "After edges/path"],
            "materials": ["Fuel", "Green waste if charged"],
            "signature_required": False,
        },
        "cleaning": {
            "label": "Cleaning pack",
            "checklist": ["Confirm rooms/areas", "Complete clean", "Check high-touch areas", "Report damage/issues", "Final walkthrough"],
            "required_photos": ["Before problem area", "After clean", "Any issue found"],
            "materials": ["Cleaning consumables"],
            "signature_required": False,
        },
        "handyman": {
            "label": "Handyman pack",
            "checklist": ["Confirm scope", "Take before photo", "Complete repair", "Record materials used", "Take after photo"],
            "required_photos": ["Before", "After", "Materials/part if relevant"],
            "materials": ["Parts", "Fixings", "Consumables"],
            "signature_required": True,
        },
        "plumbing": {
            "label": "Plumbing pack",
            "checklist": ["Confirm issue", "Isolate/check water if required", "Complete work", "Leak test", "Clean site"],
            "required_photos": ["Before", "Repair/fitting", "After/leak test"],
            "materials": ["Parts", "Fittings", "Consumables"],
            "signature_required": True,
        },
        "electrical": {
            "label": "Electrical pack",
            "checklist": ["Confirm scope", "Safety/isolation check", "Complete work", "Test result noted", "Clean site"],
            "required_photos": ["Before", "After", "Test/label if relevant"],
            "materials": ["Parts", "Cable/fittings", "Consumables"],
            "signature_required": True,
        },
        "default": {
            "label": "General service pack",
            "checklist": ["Confirm address", "Confirm scope", "Complete work", "Add worker note", "Upload proof photo"],
            "required_photos": ["Before", "After"],
            "materials": ["Materials/extras if used"],
            "signature_required": False,
        },
    }

    def choose_work_pack(job):
        blob = " ".join([
            str(job.get("job_type") or ""),
            str(job.get("service_type") or ""),
            str(job.get("title") or ""),
            str(job.get("description") or ""),
        ]).lower()

        if any(x in blob for x in ["lawn", "mow", "garden", "hedge", "landscap"]):
            key = "lawn_care"
        elif "clean" in blob:
            key = "cleaning"
        elif "plumb" in blob or "leak" in blob:
            key = "plumbing"
        elif "electric" in blob or "power" in blob:
            key = "electrical"
        elif "handyman" in blob or "repair" in blob or "fix" in blob:
            key = "handyman"
        else:
            key = "default"

        pack = dict(WORK_PACKS[key])
        pack["key"] = key
        return pack

    @api_router.get("/pricing/churvox")
    async def churvox_pricing():
        return {
            "success": True,
            "plans": [
                {"key": "start", "legacy_key": "solo", "name": "Start", "price": 39, "currency": "NZD", "gst": "plus GST", "position": "Basics"},
                {"key": "crew", "legacy_key": "team", "name": "Crew", "price": 89, "currency": "NZD", "gst": "plus GST", "position": "Worker workflow"},
                {"key": "operator", "legacy_key": "pro", "name": "Operator", "price": 149, "currency": "NZD", "gst": "plus GST", "position": "Most Popular"},
                {"key": "command", "legacy_key": "enterprise", "name": "Command", "price": 299, "currency": "NZD", "gst": "plus GST", "position": "Full machine"},
            ],
            "addons": [
                {"key": "command_growth_pack", "name": "Command Growth Pack", "price": 99, "adds": "+50 active team members"},
                {"key": "myob_operator", "name": "MYOB add-on", "price": 39, "included_on": "Command"},
                {"key": "sms_100", "name": "100 SMS credits", "price": 10},
                {"key": "sms_500", "name": "500 SMS credits", "price": 45},
                {"key": "sms_1000", "name": "1000 SMS credits", "price": 80},
            ],
        }

    @api_router.get("/top-player/summary")
    async def top_player_summary(current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        jobs, clients, quotes, invoices, workers = await load_core(business_id)

        completed_jobs = [job for job in jobs if is_complete_job(job)]
        unassigned_jobs = [job for job in jobs if not is_complete_job(job) and not has_worker(job)]
        proof_missing = [job for job in completed_jobs if photo_count(job) == 0]
        ready_growth = [job for job in completed_jobs if not job.get("growth_loop_prepared")]
        low_margin_records = []
        for item in (jobs + quotes)[:120]:
            mp = margin_payload(item)
            if mp["warnings"]:
                low_margin_records.append({"record_id": safe_id(item.get("_id") or item.get("id")), "title": job_title(item), **mp})

        links_count = await db.customer_command_links.count_documents({"business_id": str(business_id)})
        work_pack_count = await db.job_work_packs.count_documents({"business_id": str(business_id)})

        return {
            "success": True,
            "summary": {
                "customer_command_links": links_count,
                "growth_loop_ready": len(ready_growth),
                "dispatch_needed": len(unassigned_jobs),
                "margin_warnings": len(low_margin_records),
                "work_packs_prepared": work_pack_count,
                "proof_missing": len(proof_missing),
                "clients": len(clients),
                "workers": len(workers),
                "quotes": len(quotes),
                "invoices": len(invoices),
            },
            "priority": [
                {"feature": "AI Dispatch Commander", "count": len(unassigned_jobs), "reason": "Jobs need worker decisions"},
                {"feature": "Customer Growth Loop", "count": len(ready_growth), "reason": "Completed jobs can trigger review/referral/book-again drafts"},
                {"feature": "AI Margin Guard", "count": len(low_margin_records), "reason": "Jobs/quotes may need price review"},
                {"feature": "AI Work Packs", "count": len([j for j in jobs if not j.get("work_pack_prepared")]), "reason": "Jobs can receive proof/checklist packs"},
            ],
        }

    @api_router.post("/top-player/customer-command-links")
    async def create_customer_command_link(body: dict = Body(default=None), current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        body = body or {}
        now_dt = now()
        token = secrets.token_urlsafe(28)

        source_type = safe_text(body.get("source_type") or body.get("type") or "client")
        source_id = safe_text(body.get("source_id") or body.get("id") or body.get("client_id") or "")
        client_id = safe_text(body.get("client_id") or "")
        job_id = safe_text(body.get("job_id") or "")
        quote_id = safe_text(body.get("quote_id") or "")
        invoice_id = safe_text(body.get("invoice_id") or "")

        client = await find_scoped(db.clients, business_id, client_id or source_id) if (client_id or source_type == "client") else None
        job = await find_scoped(db.jobs, business_id, job_id or (source_id if source_type == "job" else "")) if (job_id or source_type == "job") else None
        quote = await find_scoped(db.quotes, business_id, quote_id or (source_id if source_type == "quote" else "")) if (quote_id or source_type == "quote") else None
        invoice = await find_scoped(db.invoices, business_id, invoice_id or (source_id if source_type == "invoice" else "")) if (invoice_id or source_type == "invoice") else None

        resolved_client = client_name(client or job or quote or invoice or body)
        url = f"{frontend_url}/customer-command/{token}"
        api_url = f"{frontend_url}/api/public/customer-command/{token}"

        doc = {
            "business_id": str(business_id),
            "token": token,
            "url": url,
            "api_url": api_url,
            "source_type": source_type,
            "source_id": source_id,
            "client_id": client_id or safe_id((client or {}).get("_id") or (client or {}).get("id")),
            "job_id": job_id or safe_id((job or {}).get("_id") or (job or {}).get("id")),
            "quote_id": quote_id or safe_id((quote or {}).get("_id") or (quote or {}).get("id")),
            "invoice_id": invoice_id or safe_id((invoice or {}).get("_id") or (invoice or {}).get("id")),
            "client_name": resolved_client,
            "title": safe_text(body.get("title") or f"{resolved_client} command link"),
            "status": "active",
            "created_at": now_dt,
            "updated_at": now_dt,
            "expires_at": now_dt + timedelta(days=90),
        }
        res = await db.customer_command_links.insert_one(doc)
        doc["_id"] = res.inserted_id
        return {"success": True, "message": "Customer Command Link created.", "link": public_doc(doc)}

    @api_router.get("/top-player/customer-command-links")
    async def list_customer_command_links(current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        rows = await db.customer_command_links.find({"business_id": str(business_id)}).sort("created_at", -1).limit(100).to_list(length=100)
        return {"success": True, "links": [public_doc(row) for row in rows]}

    @api_router.get("/public/customer-command/{token}")
    async def public_customer_command(token: str):
        link = await db.customer_command_links.find_one({"token": str(token), "status": "active"})
        if not link:
            raise HTTPException(status_code=404, detail="Customer Command Link not found")

        business_id = str(link.get("business_id") or "")
        client = await find_scoped(db.clients, business_id, link.get("client_id")) if link.get("client_id") else None
        job = await find_scoped(db.jobs, business_id, link.get("job_id")) if link.get("job_id") else None
        quote = await find_scoped(db.quotes, business_id, link.get("quote_id")) if link.get("quote_id") else None
        invoice = await find_scoped(db.invoices, business_id, link.get("invoice_id")) if link.get("invoice_id") else None

        return {
            "success": True,
            "portal": {
                "link": public_doc(link),
                "client": public_doc(client),
                "job": public_doc(job),
                "quote": public_doc(quote),
                "invoice": public_doc(invoice),
                "actions": {
                    "can_message": True,
                    "can_request_more_work": True,
                    "can_approve_work": bool(job),
                    "can_accept_quote": bool(quote),
                    "can_report_paid": bool(invoice),
                    "review_request_ready": True,
                    "referral_ready": True,
                },
            },
        }

    @api_router.post("/top-player/growth-loop/prepare")
    async def prepare_growth_loop(current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        jobs, clients, quotes, invoices, workers = await load_core(business_id)

        created = 0
        actions = []
        for job in [j for j in jobs if is_complete_job(j)][:80]:
            job_id = safe_id(job.get("_id") or job.get("id"))
            if not job_id:
                continue

            existing = await db.growth_loop_actions.find_one({"business_id": str(business_id), "job_id": job_id, "status": {"$in": ["pending", "approved", "drafted"]}})
            if existing:
                actions.append(existing)
                continue

            customer = client_name(job)
            title = job_title(job)
            base = {
                "business_id": str(business_id),
                "job_id": job_id,
                "client_id": safe_text(job.get("client_id") or job.get("customer_id") or ""),
                "client_name": customer,
                "job_title": title,
                "status": "pending",
                "source": "growth_loop",
                "created_at": now(),
                "updated_at": now(),
                "owner_approval_required": True,
            }
            drafts = [
                {
                    **base,
                    "action_type": "review_request",
                    "title": f"Ask {customer} for a review",
                    "message": f"Hi {customer}, thanks for choosing us for {title}. If you are happy with the work, a quick review would really help our business grow.",
                },
                {
                    **base,
                    "action_type": "referral_request",
                    "title": f"Ask {customer} for a referral",
                    "message": f"Hi {customer}, glad we could help with {title}. If you know anyone else who needs reliable service, feel free to pass our details on.",
                },
                {
                    **base,
                    "action_type": "book_again",
                    "title": f"Offer {customer} another booking",
                    "message": f"Hi {customer}, would you like us to book the next visit or follow-up for {title}? Reply here and we can line it up.",
                },
            ]
            if photo_count(job) == 0:
                drafts = [d for d in drafts if d["action_type"] != "review_request"]

            for draft in drafts:
                res = await db.growth_loop_actions.insert_one(draft)
                draft["_id"] = res.inserted_id
                actions.append(draft)
                created += 1

            await db.jobs.update_one({"_id": job.get("_id")}, {"$set": {"growth_loop_prepared": True, "growth_loop_prepared_at": now()}})

        return {"success": True, "message": f"Growth Loop prepared {created} new draft action(s).", "created": created, "actions": [public_doc(a) for a in actions[:100]]}

    @api_router.get("/top-player/growth-loop/actions")
    async def list_growth_loop_actions(current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        rows = await db.growth_loop_actions.find({"business_id": str(business_id)}).sort("created_at", -1).limit(150).to_list(length=150)
        return {"success": True, "actions": [public_doc(row) for row in rows]}

    @api_router.post("/top-player/growth-loop/actions/{action_id}/approve")
    async def approve_growth_loop_action(action_id: str, current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        action = await find_scoped(db.growth_loop_actions, business_id, action_id)
        if not action:
            raise HTTPException(status_code=404, detail="Growth action not found")

        draft = {
            "business_id": str(business_id),
            "source": "growth_loop",
            "action_id": safe_id(action.get("_id")),
            "channel": "draft",
            "status": "draft_waiting_owner_send",
            "message_type": action.get("action_type"),
            "subject": action.get("title"),
            "body": action.get("message"),
            "client_id": action.get("client_id") or "",
            "job_id": action.get("job_id") or "",
            "client_name": action.get("client_name") or "",
            "requires_owner_approval": True,
            "created_at": now(),
            "updated_at": now(),
        }
        res = await db.communications.insert_one(draft)
        await db.growth_loop_actions.update_one({"_id": action["_id"]}, {"$set": {"status": "approved", "communication_id": str(res.inserted_id), "approved_at": now(), "updated_at": now()}})
        return {"success": True, "message": "Growth action approved and saved as a communication draft.", "communication_id": str(res.inserted_id)}

    @api_router.post("/top-player/dispatch-commander/plan")
    async def dispatch_commander_plan(current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        jobs, clients, quotes, invoices, workers = await load_core(business_id)

        recommendations = []
        for job in [j for j in jobs if not is_complete_job(j) and not has_worker(j)][:100]:
            best = best_worker(job, workers, jobs)
            recommendations.append({
                "job": public_doc(job),
                "job_id": safe_id(job.get("_id") or job.get("id")),
                "title": job_title(job),
                "client_name": client_name(job),
                "recommended_worker": best,
                "owner_approval_required": True,
            })

        return {"success": True, "count": len(recommendations), "recommendations": recommendations}

    @api_router.post("/top-player/dispatch-commander/approve")
    async def dispatch_commander_approve(body: dict = Body(default=None), current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        body = body or {}
        job_id = safe_text(body.get("job_id"))
        worker_id = safe_text(body.get("worker_id"))

        if not job_id or not worker_id:
            raise HTTPException(status_code=400, detail="job_id and worker_id are required")

        job = await find_scoped(db.jobs, business_id, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        worker = None
        for collection_name in ["business_users", "users", "workers"]:
            try:
                worker = await find_scoped(getattr(db, collection_name), business_id, worker_id)
                if worker:
                    break
            except Exception:
                pass

        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")

        wname = worker_name(worker)
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": {
            "assigned_worker_id": worker_id,
            "worker_id": worker_id,
            "assigned_worker_name": wname,
            "worker_name": wname,
            "status": "assigned",
            "job_status": "assigned",
            "workflow_status": "assigned",
            "ai_dispatch_commander_approved": True,
            "ai_dispatch_reason": safe_text(body.get("reason") or "Approved from AI Dispatch Commander."),
            "updated_at": now(),
        }})
        return {"success": True, "message": f"Assigned {wname} to {job_title(job)}.", "job_id": job_id, "worker_id": worker_id}

    @api_router.post("/top-player/margin-guard/analyse")
    async def margin_guard_analyse(body: dict = Body(default=None), current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        body = body or {}

        record = body.get("record") if isinstance(body.get("record"), dict) else dict(body)
        source_type = safe_text(body.get("source_type") or body.get("type") or "")
        source_id = safe_text(body.get("source_id") or body.get("job_id") or body.get("quote_id") or "")

        if source_type == "job" or body.get("job_id"):
            found = await find_scoped(db.jobs, business_id, source_id or body.get("job_id"))
            if found:
                record = found
        elif source_type == "quote" or body.get("quote_id"):
            found = await find_scoped(db.quotes, business_id, source_id or body.get("quote_id"))
            if found:
                record = found

        analysis = margin_payload(record)
        review = {
            "business_id": str(business_id),
            "source_type": source_type or "manual",
            "source_id": source_id,
            "title": safe_text(record.get("title") or record.get("job_title") or record.get("quote_number") or "Margin review"),
            "analysis": analysis,
            "status": "warning" if analysis["warnings"] else "healthy",
            "created_at": now(),
        }

        if body.get("save", True):
            await db.margin_guard_reviews.insert_one(review)

        return {"success": True, "review": public_doc(review)}

    @api_router.get("/top-player/margin-guard/suggestions")
    async def margin_guard_suggestions(current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        jobs, clients, quotes, invoices, workers = await load_core(business_id)
        rows = []
        for source_type, records in [("job", jobs), ("quote", quotes)]:
            for record in records[:100]:
                analysis = margin_payload(record)
                if analysis["warnings"]:
                    rows.append({
                        "source_type": source_type,
                        "source_id": safe_id(record.get("_id") or record.get("id")),
                        "title": job_title(record),
                        "analysis": analysis,
                    })
        return {"success": True, "count": len(rows), "suggestions": rows[:100]}

    @api_router.get("/top-player/work-packs/templates")
    async def work_pack_templates(current_user: dict = Depends(get_current_user)):
        await require_owner_user(current_user)
        return {"success": True, "templates": WORK_PACKS}

    @api_router.post("/top-player/work-packs/jobs/{job_id}/prepare")
    async def prepare_work_pack(job_id: str, current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        job = await find_scoped(db.jobs, business_id, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        pack = choose_work_pack(job)
        doc = {
            "business_id": str(business_id),
            "job_id": safe_id(job.get("_id") or job.get("id")),
            "job_title": job_title(job),
            "client_name": client_name(job),
            "pack": pack,
            "status": "prepared",
            "required_before_complete": {
                "note": True,
                "photos": pack.get("required_photos", []),
                "materials_used": True,
                "signature_required": bool(pack.get("signature_required")),
            },
            "created_at": now(),
            "updated_at": now(),
            "owner_approval_required": False,
        }

        await db.job_work_packs.update_one(
            {"business_id": str(business_id), "job_id": doc["job_id"]},
            {"$set": doc, "$setOnInsert": {"created_at": now()}},
            upsert=True,
        )
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"work_pack_prepared": True, "work_pack": pack, "updated_at": now()}})
        return {"success": True, "message": "AI Work Pack prepared for this job.", "work_pack": public_doc(doc)}

    @api_router.get("/top-player/work-packs/jobs/{job_id}")
    async def get_work_pack(job_id: str, current_user: dict = Depends(get_current_user)):
        business_id = await require_owner_user(current_user)
        pack = await db.job_work_packs.find_one({"business_id": str(business_id), "job_id": str(job_id)})
        if not pack:
            job = await find_scoped(db.jobs, business_id, job_id)
            if not job:
                raise HTTPException(status_code=404, detail="Work pack not found")
            pack = {
                "business_id": str(business_id),
                "job_id": str(job_id),
                "job_title": job_title(job),
                "pack": choose_work_pack(job),
                "status": "preview",
            }
        return {"success": True, "work_pack": public_doc(pack)}
