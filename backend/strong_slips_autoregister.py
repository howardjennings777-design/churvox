
import importlib
from datetime import datetime, timezone, timedelta

try:
    from bson import ObjectId
except Exception:
    ObjectId = None

_PATCHED = False
_ORIGINAL_IMPORT_MODULE = importlib.import_module
OWNER_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "office admin", "business_owner", "platform_owner"}

def now():
    return datetime.now(timezone.utc)

def sid(v):
    if v is None:
        return ""
    if ObjectId is not None and isinstance(v, ObjectId):
        return str(v)
    return str(v or "")

def txt(v, fallback=""):
    return str(v or fallback or "").strip()

def status(v):
    return txt(v).lower().replace(" ", "_").replace("-", "_")

def money(v):
    try:
        if isinstance(v, str):
            v = v.replace("$", "").replace(",", "").replace("NZD", "").strip()
        return float(v or 0)
    except Exception:
        return 0.0

def fmt_money(v):
    amount = money(v)
    return f"${amount:,.2f}" if amount else ""

def parse_dt(v):
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if not v:
        return None
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except Exception:
        return None

def fmt_date(v):
    d = parse_dt(v)
    return d.strftime("%d %b %Y") if d else txt(v)

def serialize(x):
    if isinstance(x, list):
        return [serialize(i) for i in x]
    if not isinstance(x, dict):
        return x
    out = dict(x)
    if "_id" in out:
        out["id"] = sid(out.pop("_id"))
    for k, v in list(out.items()):
        if ObjectId is not None and isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = serialize(v)
        elif isinstance(v, list):
            out[k] = [serialize(i) for i in v]
    return out


def scoped_query(business_id, current_user=None):
    values = []
    for v in [
        business_id,
        str(business_id),
        (current_user or {}).get("id"),
        (current_user or {}).get("_id"),
        (current_user or {}).get("user_id"),
        (current_user or {}).get("business_id"),
    ]:
        if v is not None and str(v).strip():
            values.append(str(v))
            if ObjectId is not None:
                try:
                    if ObjectId.is_valid(str(v)):
                        values.append(ObjectId(str(v)))
                except Exception:
                    pass

    seen = []
    for v in values:
        if v not in seen:
            seen.append(v)

    clauses = []
    for key in [
        "business_id",
        "businessId",
        "owner_id",
        "ownerId",
        "user_id",
        "created_by",
        "created_by_user_id",
        "employer_id",
        "account_id",
    ]:
        for v in seen:
            clauses.append({key: v})

    email = txt((current_user or {}).get("email")).lower()
    if email:
        clauses += [
            {"owner_email": email},
            {"created_by_email": email},
            {"email": email},
        ]

    return {"$or": clauses} if clauses else {"business_id": str(business_id)}


def record_query(record_id, business_id):
    clauses = [{"id": str(record_id)}]
    if ObjectId is not None:
        try:
            if ObjectId.is_valid(str(record_id)):
                clauses.append({"_id": ObjectId(str(record_id))})
        except Exception:
            pass

    scope = [
        {"business_id": str(business_id)},
        {"businessId": str(business_id)},
        {"owner_id": str(business_id)},
        {"ownerId": str(business_id)},
        {"user_id": str(business_id)},
        {"created_by": str(business_id)},
        {"created_by_user_id": str(business_id)},
        {"employer_id": str(business_id)},
        {"account_id": str(business_id)},
    ]
    return {"$and": [{"$or": scope}, {"$or": clauses}]}

def obj_query(record_id):
    clauses = [{"id": str(record_id)}]
    if ObjectId is not None:
        try:
            if ObjectId.is_valid(str(record_id)):
                clauses.append({"_id": ObjectId(str(record_id))})
        except Exception:
            pass
    return {"$or": clauses}

def job_id(job):
    return sid(job.get("_id") or job.get("id") or job.get("job_id"))

def quote_id(quote):
    return sid(quote.get("_id") or quote.get("id") or quote.get("quote_id"))

def invoice_id(inv):
    return sid(inv.get("_id") or inv.get("id") or inv.get("invoice_id"))

def job_title(job):
    return txt(job.get("title") or job.get("job_title") or job.get("service_type"), "Job")

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
    if getattr(module, "_STRONG_SLIPS_REGISTERED", False):
        return module
    if any(not hasattr(module, n) for n in ["app", "db", "get_current_user", "get_user_business_id", "APIRouter"]):
        return module

    from fastapi import Depends, Body, HTTPException

    router = module.APIRouter(prefix="/api")
    db = module.db
    get_current_user = module.get_current_user
    get_user_business_id = module.get_user_business_id

    def guard(user):
        role = txt((user or {}).get("role")).lower()
        if role not in OWNER_ROLES:
            raise HTTPException(status_code=403, detail="Owner approval required")

    async def find_client(business_id, client_id=None, client_name=None):
        if client_id:
            found = await db.clients.find_one(record_query(client_id, business_id))
            if found:
                return found
        if client_name:
            found = await db.clients.find_one({
                "business_id": str(business_id),
                "$or": [
                    {"name": client_name},
                    {"client_name": client_name},
                    {"customer_name": client_name},
                ],
            })
            if found:
                return found
        return {}

    async def client_history(business_id, client_id=None, client_name=None):
        ors = []
        if client_id:
            ors.append({"client_id": str(client_id)})
        if client_name:
            ors += [{"client_name": client_name}, {"customer_name": client_name}]
        if not ors:
            return "No previous client history found yet."

        base = {"business_id": str(business_id), "$or": ors}
        jobs = await db.jobs.find(base).sort("updated_at", -1).to_list(length=10)
        invoices = await db.invoices.find(base).sort("updated_at", -1).to_list(length=10)
        quotes = await db.quotes.find(base).sort("updated_at", -1).to_list(length=10)
        open_invoices = [i for i in invoices if status(i.get("status")) not in {"paid", "void", "cancelled", "canceled"}]

        parts = []
        if jobs:
            parts.append(f"{len(jobs)} recent job{'s' if len(jobs) != 1 else ''}; last job: {job_title(jobs[0])}")
        if invoices:
            parts.append(f"{len(invoices)} invoice{'s' if len(invoices) != 1 else ''}; last total: {fmt_money(invoices[0].get('total') or invoices[0].get('amount')) or 'not recorded'}")
        if open_invoices:
            parts.append(f"{len(open_invoices)} open/unpaid invoice{'s' if len(open_invoices) != 1 else ''}")
        if quotes:
            parts.append(f"{len(quotes)} quote{'s' if len(quotes) != 1 else ''} on record")
        return "; ".join(parts) or "No previous client history found yet."

    async def proof_count(business_id, job):
        count = 0
        for field in ["photos", "photo_urls", "proof_photos", "attachments"]:
            if isinstance(job.get(field), list):
                count += len(job.get(field))
        jid = job_id(job)
        if jid:
            for collection in ["job_photos", "photos", "proof_photos"]:
                try:
                    count += await getattr(db, collection).count_documents({"business_id": str(business_id), "job_id": jid})
                except Exception:
                    pass
        return count

    def time_context(job):
        start = job.get("started_at") or job.get("start_time") or job.get("timer_started_at") or job.get("work_started_at")
        end = job.get("finished_at") or job.get("completed_at") or job.get("finish_time") or job.get("work_finished_at")
        paused = int(money(job.get("paused_minutes") or job.get("pause_minutes") or job.get("total_paused_minutes") or 0))
        a, b = parse_dt(start), parse_dt(end)
        total = max(0, int((b - a).total_seconds() // 60)) if a and b else 0
        net = max(0, total - paused)
        h, m = divmod(net, 60)
        return {
            "started_at": fmt_date(start),
            "finished_at": fmt_date(end),
            "time_worked": f"{h}h {m}m" if h else (f"{m}m" if m else "Not recorded"),
            "paused_time": f"{paused}m" if paused else "0m",
            "net_minutes": net,
        }

    async def worker_choices(business_id, job):
        rows = []
        for collection in ["business_users", "users"]:
            try:
                rows += await getattr(db, collection).find({
                    "business_id": str(business_id),
                    "role": {"$in": ["worker", "manager", "office_admin", "office admin"]},
                }).to_list(length=300)
            except Exception:
                pass

        seen, workers = set(), []
        job_region = txt(job.get("region") or job.get("area") or job.get("suburb")).lower()
        for worker in rows:
            wid = sid(worker.get("_id") or worker.get("id") or worker.get("user_id") or worker.get("email"))
            if not wid or wid in seen:
                continue
            seen.add(wid)
            active = await db.jobs.count_documents({
                "business_id": str(business_id),
                "status": {"$in": ["assigned", "acknowledged", "in_progress", "started", "paused"]},
                "$or": [{"worker_id": wid}, {"assigned_worker_id": wid}],
            })
            region = txt(worker.get("region") or worker.get("area"))
            reason = "no active jobs" if active == 0 else f"{active} active job{'s' if active != 1 else ''}"
            score = 100 - (active * 12)
            if job_region and region and job_region == region.lower():
                score += 25
                reason += f"; same area: {region}"
            workers.append({
                "id": wid,
                "name": txt(worker.get("name") or worker.get("full_name") or worker.get("email"), "Worker"),
                "email": txt(worker.get("email")),
                "region": region,
                "active_jobs": active,
                "reason": reason,
                "score": score,
            })
        return sorted(workers, key=lambda x: x.get("score", 0), reverse=True)

    def required_for(action_type):
        if action_type == "assign_worker":
            return ["job_id", "job_title", "client_name", "job_address", "worker_id"]
        if action_type == "create_invoice_draft":
            return ["job_id", "job_title", "client_name", "subtotal", "description"]
        if action_type == "send_invoice":
            return ["invoice_id", "invoice_number", "customer_name", "customer_email", "total"]
        if action_type == "invoice_reminder":
            return ["invoice_id", "invoice_number", "customer_name", "customer_email", "amount_due", "message"]
        if action_type == "quote_follow_up":
            return ["quote_id", "quote_number", "customer_name", "customer_email", "message"]
        if action_type == "job_review":
            return ["job_id", "job_title", "client_name", "worker_name"]
        return ["action_type"]

    def missing_for(action_type, payload):
        return [key for key in required_for(action_type) if not txt(payload.get(key))]

    async def insert_action(business_id, action_type, related_type, related_id, title, summary, payload, checks):
        missing = missing_for(action_type, payload)
        doc = {
            "business_id": str(business_id),
            "action_type": action_type,
            "type": action_type,
            "related_type": related_type,
            "related_entity_id": str(related_id),
            "related_id": str(related_id),
            "title": title,
            "summary": summary,
            "payload": payload,
            "draft_payload": payload,
            "checks": checks,
            "missing": missing,
            "ready": len(missing) == 0,
            "status": "ready",
            "group": "ready" if not missing else "needs_details",
            "source": "strong_slip_rebuild_v1",
            "created_at": now(),
            "updated_at": now(),
        }
        inserted = await db.ai_operator_actions.insert_one(doc)
        doc["_id"] = inserted.inserted_id
        return doc

    async def build_job_context(business_id, job):
        client_id = txt(job.get("client_id"))
        client = await find_client(business_id, client_id, job.get("client_name") or job.get("customer_name"))
        client_name = txt(client.get("name") or client.get("client_name") or job.get("client_name") or job.get("customer_name"), "Client not set")
        price = money(job.get("fixed_price") or job.get("price") or job.get("amount") or job.get("subtotal") or job.get("total"))
        notes = txt(job.get("worker_notes") or job.get("completion_notes") or job.get("notes"))
        photos = await proof_count(business_id, job)
        ctx = {
            "job_id": job_id(job),
            "job_title": job_title(job),
            "client_id": client_id,
            "client_name": client_name,
            "customer_name": client_name,
            "customer_email": txt(client.get("email") or client.get("customer_email") or job.get("client_email") or job.get("customer_email")),
            "client_phone": txt(client.get("phone") or client.get("mobile") or job.get("client_phone")),
            "client_address": txt(client.get("address") or client.get("billing_address")),
            "job_address": txt(job.get("address") or job.get("job_address") or client.get("address")),
            "scheduled_time": txt(job.get("scheduled_at") or job.get("scheduled_date") or job.get("scheduled_time")),
            "worker_id": txt(job.get("assigned_worker_id") or job.get("worker_id")),
            "worker_name": txt(job.get("assigned_worker_name") or job.get("worker_name")),
            "price": fmt_money(price),
            "subtotal": price if price else "",
            "gst_rate": "15%",
            "worker_note": notes,
            "description": txt(job.get("invoice_description_draft") or notes or f"Service completed for {client_name} - {job_title(job)}."),
            "proof_summary": f"{photos} photo{'s' if photos != 1 else ''} attached" if photos else "No proof photos found",
            "client_history": await client_history(business_id, client_id, client_name),
        }
        ctx.update(time_context(job))
        return ctx

    async def rebuild_slips_for_business(business_id, current_user=None):
        # Clear broken/old non-completed slips so duplicates and placeholder IDs stop showing.
        await db.ai_operator_actions.delete_many({
            "business_id": str(business_id),
            "source": "strong_slip_rebuild_v1",
            "status": {"$nin": ["completed", "approved", "executed"]},
        })

        actions = []

        jobs = await db.jobs.find(scoped_query(business_id, current_user)).to_list(length=500)
        for job in jobs:
            jid = job_id(job)
            if not jid:
                continue
            st = status(job.get("status"))
            ctx = await build_job_context(business_id, job)
            assigned = txt(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_worker_name") or job.get("worker_name"))

            if st not in {"completed", "done", "cancelled", "canceled"} and not assigned:
                workers = await worker_choices(business_id, job)
                rec = workers[0] if workers else {}
                payload = {
                    **ctx,
                    "available_workers": workers,
                    "worker_id": txt(rec.get("id")),
                    "recommended_worker_name": txt(rec.get("name"), "No worker available"),
                    "conflict_check": txt(rec.get("reason"), "No worker available yet"),
                    "message": f"You have been assigned {ctx['job_title']} for {ctx['client_name']}. Address: {ctx.get('job_address') or 'check job details'}. Please review the notes before starting.",
                }
                actions.append(await insert_action(
                    business_id, "assign_worker", "job", jid,
                    f"Assign worker for {ctx['job_title']}",
                    f"{ctx['client_name']} · {ctx['job_title']} · {ctx.get('job_address') or 'No address'}",
                    payload,
                    ["Client pulled", "Job pulled", "Address checked", "Worker list checked", "Owner can change worker"],
                ))

            if st in {"completed", "done"}:
                actions.append(await insert_action(
                    business_id, "job_review", "job", jid,
                    f"Review completed job: {ctx['job_title']}",
                    f"{ctx['worker_name'] or 'Worker'} completed {ctx['job_title']} for {ctx['client_name']}. Time: {ctx.get('time_worked')}. Proof: {ctx.get('proof_summary')}.",
                    {**ctx, "timesheet_status": "pending_review"},
                    ["Client pulled", "Job pulled", "Worker note checked", "Time checked", "Proof/photos checked"],
                ))

                existing = await db.invoices.find_one({
                    "business_id": str(business_id),
                    "$or": [{"job_id": jid}, {"source_job_id": jid}, {"linked_job_id": jid}],
                })
                if not existing:
                    actions.append(await insert_action(
                        business_id, "create_invoice_draft", "job", jid,
                        f"Create invoice for {ctx['client_name']}",
                        f"{ctx['client_name']} · {ctx['job_title']} · Amount: {ctx.get('price') or 'missing'}",
                        ctx,
                        ["Client pulled", "Job pulled", "Price checked", "Description prepared", "Proof/photos checked"],
                    ))

        quotes = await db.quotes.find(scoped_query(business_id, current_user)).to_list(length=500)
        for quote in quotes:
            if status(quote.get("status")) in {"accepted", "declined", "cancelled", "canceled", "paid"}:
                continue
            qid = quote_id(quote)
            client = await find_client(business_id, quote.get("client_id"), quote.get("client_name") or quote.get("customer_name"))
            cname = txt(client.get("name") or quote.get("client_name") or quote.get("customer_name"), "Client")
            amount = fmt_money(quote.get("total") or quote.get("amount") or quote.get("subtotal"))
            qno = txt(quote.get("quote_number") or quote.get("number"), f"Quote {qid[-6:]}" if qid else "Quote")
            email = txt(client.get("email") or quote.get("customer_email") or quote.get("client_email"))
            payload = {
                "quote_id": qid,
                "quote_number": qno,
                "customer_name": cname,
                "client_name": cname,
                "customer_email": email,
                "client_phone": txt(client.get("phone") or client.get("mobile")),
                "client_address": txt(client.get("address") or client.get("billing_address")),
                "quote_amount": amount,
                "last_sent": fmt_date(quote.get("sent_at") or quote.get("created_at")),
                "client_history": await client_history(business_id, quote.get("client_id"), cname),
                "message": f"Hi {cname}, just checking in on {qno}{f' for {amount}' if amount else ''}. Happy to answer any questions or adjust the details if needed.",
            }
            actions.append(await insert_action(
                business_id, "quote_follow_up", "quote", qid,
                f"Follow up quote with {cname}",
                f"{qno} · {cname} · {amount or 'No amount'} · {email or 'Customer email missing'}",
                payload,
                ["Quote pulled", "Client pulled", "Customer email checked", "Amount checked", "Message drafted"],
            ))

        invoices = await db.invoices.find(scoped_query(business_id, current_user)).to_list(length=500)
        for inv in invoices:
            iid = invoice_id(inv)
            st = status(inv.get("status"))
            if st in {"paid", "void", "cancelled", "canceled"}:
                continue
            client = await find_client(business_id, inv.get("client_id"), inv.get("client_name") or inv.get("customer_name"))
            cname = txt(inv.get("customer_name") or inv.get("client_name") or client.get("name"), "Client")
            email = txt(inv.get("customer_email") or inv.get("client_email") or client.get("email"))
            total = fmt_money(inv.get("total") or inv.get("amount") or inv.get("subtotal"))
            number = txt(inv.get("invoice_number") or inv.get("number"), f"Invoice {iid[-6:]}" if iid else "Invoice")
            common = {
                "invoice_id": iid,
                "invoice_number": number,
                "customer_name": cname,
                "client_name": cname,
                "customer_email": email,
                "client_phone": txt(client.get("phone") or client.get("mobile")),
                "client_address": txt(client.get("address") or client.get("billing_address")),
                "total": total,
                "amount_due": total,
                "due_date": fmt_date(inv.get("due_date")),
                "client_history": await client_history(business_id, inv.get("client_id"), cname),
            }

            if st in {"draft", "created", "ready"}:
                payload = {
                    **common,
                    "message": f"Hi {cname}, your invoice {number}{f' for {total}' if total else ''} is ready. You can view it through the link below.",
                }
                actions.append(await insert_action(
                    business_id, "send_invoice", "invoice", iid,
                    f"Email invoice {number} to {cname}",
                    f"{number} · {cname} · {total or 'No total'} · {email or 'Customer email missing'}",
                    payload,
                    ["Invoice pulled", "Client pulled", "Customer email checked", "Amount checked", "Message drafted"],
                ))

            due = parse_dt(inv.get("due_date"))
            overdue = st in {"overdue", "unpaid"} or (due and due < now() and st not in {"paid", "void", "cancelled", "canceled"})
            if overdue:
                days = (now() - due).days if due else ""
                payload = {
                    **common,
                    "days_overdue": f"{days} days" if isinstance(days, int) else "Overdue",
                    "message": f"Hi {cname}, friendly reminder {number}{f' for {total}' if total else ''} is still open. Please let us know if you need another copy or have any questions.",
                }
                actions.append(await insert_action(
                    business_id, "invoice_reminder", "invoice", iid,
                    f"Send payment reminder to {cname}",
                    f"{number} · {cname} · {total or 'No total'} · {email or 'Customer email missing'}",
                    payload,
                    ["Invoice pulled", "Client pulled", "Status/due date checked", "Customer email checked", "Reminder drafted"],
                ))

        return actions

    async def list_strong_slips(business_id):
        rows = await db.ai_operator_actions.find({
            "business_id": str(business_id),
            "source": "strong_slip_rebuild_v1",
            "status": {"$nin": ["completed", "approved", "executed", "rejected", "dismissed", "cancelled", "canceled"]},
        }).sort("updated_at", -1).to_list(length=100)

        if rows:
            return rows

        fallback = await db.ai_operator_actions.find({
            "business_id": str(business_id),
            "status": {"$nin": ["completed", "approved", "executed", "rejected", "dismissed", "cancelled", "canceled"]},
        }).sort("updated_at", -1).to_list(length=100)

        for row in fallback:
            row.setdefault("source", "legacy_ai_action_visible_fallback")
            row.setdefault("checks", ["Legacy AI slip found", "Needs details before approval", "Owner approval required"])
            row.setdefault("missing", ["real linked record details"])
            row.setdefault("ready", False)

        return fallback

    @router.post("/ai/operator/rebuild-slips")
    async def rebuild_slips(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user)
        business_id = await get_user_business_id(current_user)
        actions = await rebuild_slips_for_business(business_id, current_user)
        return {"success": True, "created": len(actions), "actions": [serialize(a) for a in actions]}

    @router.post("/ai/operator/scan-strong")
    async def scan_strong(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user)
        business_id = await get_user_business_id(current_user)
        actions = await rebuild_slips_for_business(business_id, current_user)
        return {"success": True, "created": len(actions), "actions": [serialize(a) for a in actions]}

    @router.get("/ai/operator/slips")
    async def slips(current_user: dict = Depends(get_current_user)):
        guard(current_user)
        business_id = await get_user_business_id(current_user)
        rows = await list_strong_slips(business_id)
        return {"success": True, "data": [serialize(r) for r in rows], "actions": [serialize(r) for r in rows]}

    @router.patch("/ai/operator/slips/{action_id}")
    async def update_slip(action_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user)
        business_id = await get_user_business_id(current_user)
        found = await db.ai_operator_actions.find_one({"business_id": str(business_id), **obj_query(action_id)})
        if not found:
            raise HTTPException(status_code=404, detail="Slip not found")
        action_type = found.get("action_type") or found.get("type")
        merged = {**(found.get("payload") or {}), **(payload or {})}
        missing = missing_for(action_type, merged)
        await db.ai_operator_actions.update_one(
            {"_id": found["_id"]},
            {"$set": {
                "payload": merged,
                "draft_payload": merged,
                "missing": missing,
                "ready": len(missing) == 0,
                "group": "ready" if not missing else "needs_details",
                "updated_at": now(),
            }},
        )
        updated = await db.ai_operator_actions.find_one({"_id": found["_id"]})
        return {"success": True, "data": serialize(updated), "action": serialize(updated)}

    module.app.include_router(router)
    setattr(module, "_STRONG_SLIPS_REGISTERED", True)
    return module
