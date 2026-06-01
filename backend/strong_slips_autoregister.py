import importlib
from datetime import datetime, timezone

try:
    from bson import ObjectId
except Exception:
    ObjectId = None

_PATCHED = False
_ORIGINAL_IMPORT_MODULE = importlib.import_module

OWNER_ROLES = {
    "owner", "employer", "admin", "manager",
    "office_admin", "office admin", "business_owner", "platform_owner"
}

DONE_STATUSES = {"completed", "approved", "executed", "rejected", "dismissed", "cancelled", "canceled"}


def now():
    return datetime.now(timezone.utc)


def sid(value):
    if value is None:
        return ""
    if ObjectId is not None and isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict) and value.get("$oid"):
        return str(value["$oid"])
    return str(value or "")


def txt(value, fallback=""):
    return str(value or fallback or "").strip()


def norm(value):
    return txt(value).lower().replace(" ", "_").replace("-", "_")


def money(value):
    try:
        if isinstance(value, str):
            value = value.replace("$", "").replace(",", "").replace("NZD", "").strip()
        return float(value or 0)
    except Exception:
        return 0.0


def fmt_money(value):
    amount = money(value)
    return f"${amount:,.2f}" if amount else ""


def parse_dt(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def fmt_date(value):
    dt = parse_dt(value)
    return dt.strftime("%d %b %Y") if dt else txt(value)


def serial(value):
    if isinstance(value, list):
        return [serial(v) for v in value]
    if not isinstance(value, dict):
        return value
    out = dict(value)
    if "_id" in out:
        out["id"] = sid(out.pop("_id"))
    for key, item in list(out.items()):
        if ObjectId is not None and isinstance(item, ObjectId):
            out[key] = str(item)
        elif isinstance(item, datetime):
            out[key] = item.isoformat()
        elif isinstance(item, dict):
            out[key] = serial(item)
        elif isinstance(item, list):
            out[key] = [serial(x) for x in item]
    return out


def oid_query(record_id):
    clauses = []
    if record_id:
        clauses += [
            {"id": str(record_id)},
            {"job_id": str(record_id)},
            {"quote_id": str(record_id)},
            {"invoice_id": str(record_id)},
            {"client_id": str(record_id)},
        ]
        if ObjectId is not None:
            try:
                if ObjectId.is_valid(str(record_id)):
                    clauses.append({"_id": ObjectId(str(record_id))})
            except Exception:
                pass
    return {"$or": clauses} if clauses else {}


def user_values(business_id, current_user):
    vals = []
    for raw in [
        business_id,
        (current_user or {}).get("business_id"),
        (current_user or {}).get("id"),
        (current_user or {}).get("_id"),
        (current_user or {}).get("user_id"),
        (current_user or {}).get("owner_id"),
    ]:
        if raw is not None and str(raw).strip():
            vals.append(str(raw))
            if ObjectId is not None:
                try:
                    if ObjectId.is_valid(str(raw)):
                        vals.append(ObjectId(str(raw)))
                except Exception:
                    pass
    dedup = []
    for v in vals:
        if v not in dedup:
            dedup.append(v)
    return dedup


def scope_query(business_id, current_user):
    vals = user_values(business_id, current_user)
    clauses = []
    for key in [
        "business_id", "businessId", "owner_id", "ownerId",
        "user_id", "created_by", "created_by_user_id",
        "employer_id", "account_id"
    ]:
        for v in vals:
            clauses.append({key: v})

    email = txt((current_user or {}).get("email")).lower()
    if email:
        clauses += [
            {"owner_email": email},
            {"created_by_email": email},
            {"email": email},
        ]

    return {"$or": clauses} if clauses else {}


def can_rescue(current_user):
    return txt((current_user or {}).get("role")).lower() in OWNER_ROLES


def job_id(job):
    return sid(job.get("_id") or job.get("id") or job.get("job_id"))


def quote_id(quote):
    return sid(quote.get("_id") or quote.get("id") or quote.get("quote_id"))


def invoice_id(invoice):
    return sid(invoice.get("_id") or invoice.get("id") or invoice.get("invoice_id"))


def job_title(job):
    return txt(job.get("title") or job.get("job_title") or job.get("service_type"), "Job")


def install():
    global _PATCHED
    if _PATCHED:
        return
    _PATCHED = True

    def patched_import_module(name, package=None):
        module = _ORIGINAL_IMPORT_MODULE(name, package)
        if name in {"server", "backend.server"}:
            register(module)
        return module

    importlib.import_module = patched_import_module


def register(module):
    if getattr(module, "_CHURVOX_STRONG_SLIPS_V3", False):
        return module
    if any(not hasattr(module, name) for name in ["app", "db", "get_current_user", "get_user_business_id", "APIRouter"]):
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

    async def find_many(collection_name, business_id, current_user, limit=500):
        coll = getattr(db, collection_name)
        queries = []

        scoped = scope_query(business_id, current_user)
        if scoped:
            queries.append(("scoped", scoped))

        queries.append(("missing_scope", {
            "$or": [
                {"business_id": {"$exists": False}},
                {"business_id": None},
                {"business_id": ""},
                {"owner_id": {"$exists": False}},
                {"owner_id": None},
                {"owner_id": ""},
            ]
        }))

        if can_rescue(current_user):
            queries.append(("owner_rescue_all", {}))

        for mode, query in queries:
            try:
                rows = await coll.find(query).sort("updated_at", -1).to_list(length=limit)
            except Exception:
                rows = []
            if rows:
                return rows, mode

        return [], "none"

    async def find_client(business_id, current_user, client_id=None, client_name=None, email=None):
        queries = []
        if client_id:
            q = oid_query(client_id)
            if q:
                queries.append(q)
        if client_name:
            queries.append({"$or": [
                {"name": client_name},
                {"client_name": client_name},
                {"customer_name": client_name},
            ]})
        if email:
            queries.append({"$or": [
                {"email": email},
                {"customer_email": email},
                {"client_email": email},
            ]})

        scope = scope_query(business_id, current_user)
        for base in queries:
            for final in ([{"$and": [scope, base]}] if scope else []):
                try:
                    found = await db.clients.find_one(final)
                    if found:
                        return found
                except Exception:
                    pass
            if can_rescue(current_user):
                try:
                    found = await db.clients.find_one(base)
                    if found:
                        return found
                except Exception:
                    pass
        return {}

    async def client_history(business_id, current_user, client_id=None, client_name=None):
        ors = []
        if client_id:
            ors.append({"client_id": str(client_id)})
        if client_name:
            ors += [{"client_name": client_name}, {"customer_name": client_name}]
        if not ors:
            return "No previous client history found."

        scope = scope_query(business_id, current_user)
        query = {"$and": [scope, {"$or": ors}]} if scope else {"$or": ors}

        try:
            jobs = await db.jobs.find(query).sort("updated_at", -1).to_list(length=10)
        except Exception:
            jobs = []
        try:
            invoices = await db.invoices.find(query).sort("updated_at", -1).to_list(length=10)
        except Exception:
            invoices = []
        try:
            quotes = await db.quotes.find(query).sort("updated_at", -1).to_list(length=10)
        except Exception:
            quotes = []

        parts = []
        if jobs:
            parts.append(f"{len(jobs)} recent jobs; last job: {job_title(jobs[0])}")
        if invoices:
            parts.append(f"{len(invoices)} invoices; last total: {fmt_money(invoices[0].get('total') or invoices[0].get('amount')) or 'not recorded'}")
        if quotes:
            parts.append(f"{len(quotes)} quotes on record")
        return "; ".join(parts) or "No previous client history found."

    async def proof_count(business_id, job):
        count = 0
        for field in ["photos", "photo_urls", "proof_photos", "attachments"]:
            if isinstance(job.get(field), list):
                count += len(job.get(field))
        jid = job_id(job)
        if jid:
            for collection in ["job_photos", "photos", "proof_photos"]:
                try:
                    count += await getattr(db, collection).count_documents({"job_id": jid})
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

    async def worker_choices(business_id, current_user, job):
        rows = []
        for collection in ["business_users", "users"]:
            try:
                found, _mode = await find_many(collection, business_id, current_user, 300)
                rows.extend(found)
            except Exception:
                pass

        seen = set()
        workers = []
        for worker in rows:
            role = txt(worker.get("role")).lower()
            if role not in {"worker", "manager", "office_admin", "office admin"}:
                continue
            wid = sid(worker.get("_id") or worker.get("id") or worker.get("user_id") or worker.get("email"))
            if not wid or wid in seen:
                continue
            seen.add(wid)
            workers.append({
                "id": wid,
                "name": txt(worker.get("name") or worker.get("full_name") or worker.get("email"), "Worker"),
                "email": txt(worker.get("email")),
                "region": txt(worker.get("region") or worker.get("area")),
                "reason": "available worker",
            })
        return workers

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
            "source": "strong_slip_rebuild_v3_clean",
            "created_at": now(),
            "updated_at": now(),
        }
        result = await db.ai_operator_actions.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    async def build_job_context(business_id, current_user, job):
        client_id = txt(job.get("client_id"))
        client = await find_client(
            business_id,
            current_user,
            client_id=client_id,
            client_name=job.get("client_name") or job.get("customer_name"),
            email=job.get("client_email") or job.get("customer_email"),
        )
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
            "customer_email": txt(client.get("email") or job.get("client_email") or job.get("customer_email")),
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
            "client_history": await client_history(business_id, current_user, client_id, client_name),
        }
        ctx.update(time_context(job))
        return ctx

    async def clear_old_actions(business_id, current_user):
        if can_rescue(current_user):
            await db.ai_operator_actions.delete_many({
                "status": {"$nin": list(DONE_STATUSES)},
                "$or": [
                    {"source": {"$exists": False}},
                    {"source": {"$regex": "slip|operator|legacy|deep|strong", "$options": "i"}},
                    {"business_id": str(business_id)},
                ],
            })
        else:
            await db.ai_operator_actions.delete_many({
                "business_id": str(business_id),
                "status": {"$nin": list(DONE_STATUSES)},
            })

    async def rebuild(business_id, current_user):
        await clear_old_actions(business_id, current_user)
        actions = []

        jobs, jobs_mode = await find_many("jobs", business_id, current_user, 500)
        quotes, quotes_mode = await find_many("quotes", business_id, current_user, 500)
        invoices, invoices_mode = await find_many("invoices", business_id, current_user, 500)

        for job in jobs:
            jid = job_id(job)
            if not jid:
                continue
            st = norm(job.get("status"))
            ctx = await build_job_context(business_id, current_user, job)
            assigned = txt(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_worker_name") or job.get("worker_name"))

            if st not in {"completed", "done", "cancelled", "canceled"} and not assigned:
                workers = await worker_choices(business_id, current_user, job)
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
                    business_id,
                    "assign_worker",
                    "job",
                    jid,
                    f"Assign worker for {ctx['job_title']}",
                    f"{ctx['client_name']} · {ctx['job_title']} · {ctx.get('job_address') or 'No address'}",
                    payload,
                    ["Client pulled", "Job pulled", "Address checked", "Worker list checked", "Owner can change worker"],
                ))

            if st in {"completed", "done"}:
                actions.append(await insert_action(
                    business_id,
                    "job_review",
                    "job",
                    jid,
                    f"Review completed job: {ctx['job_title']}",
                    f"{ctx.get('worker_name') or 'Worker'} completed {ctx['job_title']} for {ctx['client_name']}. Time: {ctx.get('time_worked')}. Proof: {ctx.get('proof_summary')}.",
                    {**ctx, "timesheet_status": "pending_review"},
                    ["Client pulled", "Job pulled", "Worker notes checked", "Time checked", "Proof/photos checked"],
                ))

                actions.append(await insert_action(
                    business_id,
                    "create_invoice_draft",
                    "job",
                    jid,
                    f"Create invoice for {ctx['client_name']}",
                    f"{ctx['client_name']} · {ctx['job_title']} · Amount: {ctx.get('price') or 'missing'}",
                    ctx,
                    ["Client pulled", "Job pulled", "Price checked", "Description prepared", "Proof/photos checked"],
                ))

        for quote in quotes:
            if norm(quote.get("status")) in {"accepted", "declined", "cancelled", "canceled", "paid"}:
                continue
            qid = quote_id(quote)
            client = await find_client(
                business_id,
                current_user,
                client_id=quote.get("client_id"),
                client_name=quote.get("client_name") or quote.get("customer_name"),
                email=quote.get("customer_email") or quote.get("client_email"),
            )
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
                "client_history": await client_history(business_id, current_user, quote.get("client_id"), cname),
                "message": f"Hi {cname}, just checking in on {qno}{f' for {amount}' if amount else ''}. Happy to answer any questions or adjust the details if needed.",
            }
            actions.append(await insert_action(
                business_id,
                "quote_follow_up",
                "quote",
                qid,
                f"Follow up quote with {cname}",
                f"{qno} · {cname} · {amount or 'No amount'} · {email or 'Customer email missing'}",
                payload,
                ["Quote pulled", "Client pulled", "Customer email checked", "Amount checked", "Message drafted"],
            ))

        for inv in invoices:
            iid = invoice_id(inv)
            st = norm(inv.get("status"))
            if st in {"paid", "void", "cancelled", "canceled"}:
                continue

            client = await find_client(
                business_id,
                current_user,
                client_id=inv.get("client_id"),
                client_name=inv.get("client_name") or inv.get("customer_name"),
                email=inv.get("customer_email") or inv.get("client_email"),
            )
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
                "client_history": await client_history(business_id, current_user, inv.get("client_id"), cname),
            }

            if st in {"draft", "created", "ready", ""}:
                payload = {
                    **common,
                    "message": f"Hi {cname}, your invoice {number}{f' for {total}' if total else ''} is ready. You can view it through the link below.",
                }
                actions.append(await insert_action(
                    business_id,
                    "send_invoice",
                    "invoice",
                    iid,
                    f"Email invoice {number} to {cname}",
                    f"{number} · {cname} · {total or 'No total'} · {email or 'Customer email missing'}",
                    payload,
                    ["Invoice pulled", "Client pulled", "Customer email checked", "Amount checked", "Message drafted"],
                ))

            due = parse_dt(inv.get("due_date"))
            overdue = st in {"overdue", "unpaid"} or (due and due < now())
            if overdue:
                payload = {
                    **common,
                    "days_overdue": f"{(now() - due).days} days" if due else "Overdue",
                    "message": f"Hi {cname}, friendly reminder {number}{f' for {total}' if total else ''} is still open. Please let us know if you need another copy or have any questions.",
                }
                actions.append(await insert_action(
                    business_id,
                    "invoice_reminder",
                    "invoice",
                    iid,
                    f"Send payment reminder to {cname}",
                    f"{number} · {cname} · {total or 'No total'} · {email or 'Customer email missing'}",
                    payload,
                    ["Invoice pulled", "Client pulled", "Due date checked", "Customer email checked", "Reminder drafted"],
                ))

        report = {
            "jobs_found": len(jobs),
            "quotes_found": len(quotes),
            "invoices_found": len(invoices),
            "jobs_scope_mode": jobs_mode,
            "quotes_scope_mode": quotes_mode,
            "invoices_scope_mode": invoices_mode,
            "slips_created": len(actions),
        }
        await db.ai_operator_rebuild_reports.insert_one({
            "business_id": str(business_id),
            "report": report,
            "created_at": now(),
        })
        return actions, report

    async def list_slips(business_id, current_user):
        rows = await db.ai_operator_actions.find({
            "business_id": str(business_id),
            "source": "strong_slip_rebuild_v3_clean",
            "status": {"$nin": list(DONE_STATUSES)},
        }).sort("updated_at", -1).to_list(length=100)

        if not rows:
            rows, _report = await rebuild(business_id, current_user)
        return rows

    async def update_action_payload(action_id, business_id, payload):
        found = await db.ai_operator_actions.find_one({
            "business_id": str(business_id),
            **oid_query(action_id),
        })
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
        return await db.ai_operator_actions.find_one({"_id": found["_id"]})

    @router.get("/ai/operator/slips")
    async def slips(current_user: dict = Depends(get_current_user)):
        guard(current_user)
        business_id = await get_user_business_id(current_user)
        rows = await list_slips(business_id, current_user)
        report = await db.ai_operator_rebuild_reports.find_one({"business_id": str(business_id)}, sort=[("created_at", -1)])
        return {
            "success": True,
            "data": [serial(r) for r in rows],
            "actions": [serial(r) for r in rows],
            "report": serial((report or {}).get("report") or {}),
        }

    @router.post("/ai/operator/rebuild-slips")
    async def rebuild_slips(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user)
        business_id = await get_user_business_id(current_user)
        actions, report = await rebuild(business_id, current_user)
        return {
            "success": True,
            "created": len(actions),
            "report": serial(report),
            "actions": [serial(a) for a in actions],
        }

    @router.post("/ai/operator/scan-strong")
    async def scan_strong(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user)
        business_id = await get_user_business_id(current_user)
        actions, report = await rebuild(business_id, current_user)
        return {
            "success": True,
            "created": len(actions),
            "report": serial(report),
            "actions": [serial(a) for a in actions],
        }

    @router.patch("/ai/operator/slips/{action_id}")
    async def update_slip(action_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user)
        business_id = await get_user_business_id(current_user)
        updated = await update_action_payload(action_id, business_id, payload)
        return {"success": True, "data": serial(updated), "action": serial(updated)}

    @router.post("/ai/operator/actions/{action_id}/execute")
    async def execute_action(action_id: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user)
        business_id = await get_user_business_id(current_user)
        action = await update_action_payload(action_id, business_id, payload or {})
        action_type = action.get("action_type") or action.get("type")
        merged = action.get("payload") or {}
        missing = missing_for(action_type, merged)
        if missing:
            return {"success": False, "error": "Missing: " + ", ".join(missing), "missing": missing}

        if action_type == "assign_worker":
            jid = merged.get("job_id") or action.get("related_entity_id")
            worker_id = merged.get("worker_id")
            if jid and worker_id:
                worker_name = merged.get("recommended_worker_name") or merged.get("worker_name") or "Assigned worker"
                await db.jobs.update_one(
                    oid_query(jid),
                    {"$set": {
                        "assigned_worker_id": str(worker_id),
                        "worker_id": str(worker_id),
                        "assigned_worker_name": worker_name,
                        "status": "assigned",
                        "updated_at": now(),
                    }},
                )

        elif action_type == "create_invoice_draft":
            jid = merged.get("job_id") or action.get("related_entity_id")
            existing = await db.invoices.find_one({"business_id": str(business_id), "job_id": str(jid)})
            if not existing:
                await db.invoices.insert_one({
                    "business_id": str(business_id),
                    "job_id": str(jid),
                    "client_id": merged.get("client_id"),
                    "client_name": merged.get("client_name") or merged.get("customer_name"),
                    "customer_name": merged.get("customer_name") or merged.get("client_name"),
                    "customer_email": merged.get("customer_email"),
                    "description": merged.get("description"),
                    "subtotal": money(merged.get("subtotal") or merged.get("price")),
                    "total": money(merged.get("subtotal") or merged.get("price")),
                    "status": "draft",
                    "source": "ai_operator_approved_slip",
                    "created_at": now(),
                    "updated_at": now(),
                })

        await db.ai_operator_actions.update_one(
            {"_id": action["_id"]},
            {"$set": {
                "status": "completed",
                "completed_at": now(),
                "executed_by": txt((current_user or {}).get("email")),
                "updated_at": now(),
            }},
        )

        return {"success": True, "message": "Approved and executed"}

    module.app.include_router(router)
    setattr(module, "_CHURVOX_STRONG_SLIPS_V3", True)
    return module
