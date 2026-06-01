import importlib
from datetime import datetime, timezone, timedelta
try:
    from bson import ObjectId
except Exception:
    ObjectId = None
_PATCHED = False
_ORIGINAL_IMPORT_MODULE = importlib.import_module
OWNER_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "office admin", "business_owner", "platform_owner"}

def now(): return datetime.now(timezone.utc)
def sid(v):
    if v is None: return ""
    if ObjectId is not None and isinstance(v, ObjectId): return str(v)
    return str(v or "")
def txt(v, d=""): return str(v or d or "").strip()
def stat(v): return txt(v).lower().replace(" ", "_").replace("-", "_")
def money(v):
    try:
        if isinstance(v, str): v = v.replace("$", "").replace(",", "").strip()
        return float(v or 0)
    except Exception: return 0.0
def fmoney(v):
    m = money(v)
    return f"${m:,.2f}" if m else ""
def dt(v):
    if isinstance(v, datetime): return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if not v: return None
    try: return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except Exception: return None
def fdt(v):
    d = dt(v)
    return d.strftime("%d %b %Y") if d else txt(v)
def serial(d):
    if isinstance(d, list): return [serial(x) for x in d]
    if not isinstance(d, dict): return d
    out = dict(d)
    if "_id" in out: out["id"] = sid(out.pop("_id"))
    for k,v in list(out.items()):
        if ObjectId is not None and isinstance(v, ObjectId): out[k] = str(v)
        elif isinstance(v, datetime): out[k] = v.isoformat()
        elif isinstance(v, dict): out[k] = serial(v)
        elif isinstance(v, list): out[k] = [serial(x) for x in v]
    return out
def qid(r): return sid(r.get("_id") or r.get("id") or r.get("quote_id"))
def iid(r): return sid(r.get("_id") or r.get("id") or r.get("invoice_id"))
def jid(r): return sid(r.get("_id") or r.get("id") or r.get("job_id"))
def jtitle(r): return txt(r.get("title") or r.get("job_title") or r.get("service_type"), "Job")

def install():
    global _PATCHED
    if _PATCHED: return
    _PATCHED = True
    def patched(name, package=None):
        module = _ORIGINAL_IMPORT_MODULE(name, package)
        if name in {"server", "backend.server"}: register(module)
        return module
    importlib.import_module = patched

def register(module):
    if getattr(module, "_DEEP_SLIPS_REGISTERED", False): return module
    if any(not hasattr(module, n) for n in ["app","db","get_current_user","get_user_business_id","APIRouter"]): return module
    from fastapi import Depends, Body, HTTPException
    router = module.APIRouter(prefix="/api")
    db = module.db
    get_current_user = module.get_current_user
    get_user_business_id = module.get_user_business_id
    def guard(user):
        if txt((user or {}).get("role")).lower() not in OWNER_ROLES: raise HTTPException(status_code=403, detail="Owner approval required")
    async def client(cid, bid):
        if not cid: return {}
        ors = [{"id": str(cid)}]
        if ObjectId is not None:
            try:
                if ObjectId.is_valid(str(cid)): ors.append({"_id": ObjectId(str(cid))})
            except Exception: pass
        return await db.clients.find_one({"business_id": str(bid), "$or": ors}) or {}
    async def history(cid, cname, bid):
        ors=[]
        if cid: ors.append({"client_id": str(cid)})
        if cname: ors += [{"client_name": cname},{"customer_name": cname}]
        if not ors: return "No previous client history found"
        base={"business_id": str(bid), "$or": ors}
        jobs=await db.jobs.find(base).sort("updated_at",-1).to_list(length=10)
        invs=await db.invoices.find(base).sort("updated_at",-1).to_list(length=10)
        parts=[]
        if jobs: parts.append(f"{len(jobs)} recent jobs; last {jtitle(jobs[0])}")
        if invs: parts.append(f"{len(invs)} invoices; last {fmoney(invs[0].get('total') or invs[0].get('amount')) or 'not recorded'}")
        return "; ".join(parts) or "No previous client history found"
    async def worker_options(job, bid):
        rows=[]
        try: rows += await db.business_users.find({"business_id": str(bid), "role": {"$in":["worker","manager","office_admin","office admin"]}}).to_list(length=200)
        except Exception: pass
        opts=[]
        for w in rows:
            wid=sid(w.get("_id") or w.get("id") or w.get("user_id"))
            active=await db.jobs.count_documents({"business_id": str(bid), "status": {"$in":["assigned","acknowledged","in_progress","paused"]}, "$or":[{"worker_id": wid},{"assigned_worker_id": wid}]})
            opts.append({"id": wid, "name": txt(w.get("name") or w.get("email"), "Worker"), "region": txt(w.get("region") or w.get("area")), "active_jobs": active, "reason": "no active jobs" if active == 0 else f"{active} active jobs"})
        return sorted(opts, key=lambda x:x.get("active_jobs",0))
    async def photos(job, bid):
        c=0
        for f in ["photos","photo_urls","proof_photos","attachments"]:
            if isinstance(job.get(f), list): c += len(job.get(f))
        return c
    async def job_context(job, bid):
        c=await client(job.get("client_id"), bid)
        cname=txt(c.get("name") or job.get("client_name") or job.get("customer_name"), "Client not set")
        price=money(job.get("fixed_price") or job.get("price") or job.get("amount") or job.get("subtotal") or job.get("total"))
        note=txt(job.get("worker_notes") or job.get("completion_notes") or job.get("notes"), "No notes saved")
        pc=await photos(job,bid)
        start=job.get("started_at") or job.get("start_time") or job.get("timer_started_at")
        end=job.get("finished_at") or job.get("completed_at") or job.get("finish_time")
        mins=0
        if dt(start) and dt(end): mins=max(0,int((dt(end)-dt(start)).total_seconds()//60))
        return {"job_id": jid(job), "job_title": jtitle(job), "client_id": txt(job.get("client_id")), "client_name": cname, "customer_name": cname, "customer_email": txt(c.get("email") or job.get("client_email") or job.get("customer_email")), "client_phone": txt(c.get("phone") or job.get("client_phone")), "client_address": txt(c.get("address") or c.get("billing_address")), "job_address": txt(job.get("address") or job.get("job_address") or c.get("address")), "worker_id": txt(job.get("assigned_worker_id") or job.get("worker_id")), "worker_name": txt(job.get("assigned_worker_name") or job.get("worker_name"), "No worker set"), "price": fmoney(price), "subtotal": price, "gst_rate": 15, "worker_note": note, "description": txt(job.get("invoice_description_draft") or note, f"Service completed for {cname} - {jtitle(job)}."), "photo_count": str(pc), "proof_summary": f"{pc} photos attached" if pc else "No proof photos found", "started_at": fdt(start), "finished_at": fdt(end), "time_worked": f"{mins//60}h {mins%60}m" if mins else "Not recorded", "client_history": await history(job.get("client_id"), cname, bid)}
    async def upsert(bid, atype, rtype, rid, title, summary, payload, recommendation, reason, checks):
        q={"business_id": str(bid), "action_type": atype, "related_entity_id": str(rid), "status": {"$nin":["completed","rejected","dismissed","cancelled","canceled"]}}
        existing=await db.ai_operator_actions.find_one(q)
        doc={"business_id": str(bid), "action_type": atype, "type": atype, "related_type": rtype, "related_entity_id": str(rid), "related_id": str(rid), "title": title, "summary": summary, "recommendation": recommendation, "reason": reason, "checks": checks, "payload": payload, "draft_payload": payload, "status":"ready", "group":"ready", "source":"deep_context_scan", "updated_at": now()}
        if existing:
            await db.ai_operator_actions.update_one({"_id": existing["_id"]},{"$set":doc}); doc["_id"]=existing["_id"]
        else:
            doc["created_at"]=now(); ins=await db.ai_operator_actions.insert_one(doc); doc["_id"]=ins.inserted_id
        return doc
    async def scan_jobs(bid, actions):
        for job in await db.jobs.find({"business_id": str(bid)}).to_list(length=500):
            st=stat(job.get("status")); jobid=jid(job)
            if not jobid: continue
            ctx=await job_context(job,bid)
            assigned=txt(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_worker_name") or job.get("worker_name"))
            if st not in {"completed","done","cancelled","canceled"} and not assigned:
                opts=await worker_options(job,bid); rec=opts[0] if opts else {}
                payload={**ctx,"available_workers":opts,"worker_id":rec.get("id",""),"recommended_worker_id":rec.get("id",""),"recommended_worker_name":rec.get("name","No worker available"),"conflict_check":rec.get("reason","No worker available yet"),"message":f"You have been assigned {ctx['job_title']} for {ctx['client_name']}. Address: {ctx.get('job_address') or 'check job details'}. Please review the notes before starting."}
                actions.append(await upsert(bid,"assign_worker","job",jobid,f"Assign worker for {ctx['job_title']}",f"Churvox pulled the client, job address and worker list for {ctx['job_title']}.",payload,f"Recommended {payload['recommended_worker_name']}: {payload['conflict_check']}","Open job has no assigned worker",["Client pulled","Job address pulled","Worker list checked","Owner can change worker"]))
            if st in {"completed","done"}:
                if txt(job.get("work_review_status")) not in {"approved","rejected"}:
                    actions.append(await upsert(bid,"job_review","job",jobid,f"Review completed job: {ctx['job_title']}",f"{ctx['worker_name']} completed {ctx['job_title']} for {ctx['client_name']}. Time: {ctx['time_worked']}. Proof: {ctx['proof_summary']}.",{**ctx,"timesheet_status":"pending_review"},"Approve only if time, notes and proof look right.","Completed job needs owner review",["Client pulled","Worker notes pulled","Time pulled","Proof checked"]))
                exists=await db.invoices.find_one({"business_id":str(bid),"$or":[{"job_id":jobid},{"source_job_id":jobid},{"linked_job_id":jobid}]})
                if not exists and money(ctx.get("subtotal"))>0:
                    actions.append(await upsert(bid,"create_invoice_draft","job",jobid,f"Create invoice for {ctx['client_name']}",f"Completed priced job: {ctx['job_title']} at {ctx.get('job_address') or ctx.get('client_address')}. Amount: {ctx['price']}. Churvox filled the invoice draft.",ctx,"Create draft invoice first. Sending remains owner-approved.","Completed priced job has no invoice",["Client details pulled","Price pulled","Job notes pulled","Proof count checked"]))
    async def scan_quotes(bid, actions):
        for q in await db.quotes.find({"business_id":str(bid)}).to_list(length=500):
            if stat(q.get("status")) in {"accepted","declined","cancelled","canceled","paid"}: continue
            c=await client(q.get("client_id"),bid); cname=txt(c.get("name") or q.get("client_name") or q.get("customer_name"),"Client"); contact=txt(q.get("customer_email") or q.get("client_email") or c.get("email"))
            if not contact: continue
            qno=txt(q.get("quote_number") or q.get("number"), qid(q)); amount=fmoney(q.get("total") or q.get("amount") or q.get("subtotal"))
            payload={"quote_id":qid(q),"quote_number":qno,"customer_name":cname,"customer_email":contact,"quote_amount":amount,"last_sent":fdt(q.get("sent_at") or q.get("created_at")),"client_history":await history(q.get("client_id"),cname,bid),"message":f"Hi {cname}, just checking in on quote {qno}{f' for {amount}' if amount else ''}. Happy to answer any questions or adjust the details if needed."}
            actions.append(await upsert(bid,"quote_follow_up","quote",qid(q),f"Follow up quote with {cname}",f"Churvox pulled quote {qno}, customer contact, amount and client history.",payload,"Send only after owner approval.","Open quote needs follow-up",["Quote pulled","Client contact pulled","Client history checked","Message drafted"]))
    async def scan_invoices(bid, actions):
        for inv in await db.invoices.find({"business_id":str(bid)}).to_list(length=500):
            iidv=iid(inv); st=stat(inv.get("status")); c=await client(inv.get("client_id"),bid); cname=txt(inv.get("customer_name") or inv.get("client_name") or c.get("name"),"Client"); contact=txt(inv.get("customer_email") or inv.get("client_email") or c.get("email"))
            if not contact: continue
            num=txt(inv.get("invoice_number") or inv.get("number"),iidv); amount=fmoney(inv.get("total") or inv.get("amount") or inv.get("subtotal"))
            common={"invoice_id":iidv,"invoice_number":num,"customer_name":cname,"customer_email":contact,"total":amount,"amount_due":amount,"due_date":fdt(inv.get("due_date")),"client_history":await history(inv.get("client_id"),cname,bid)}
            if st in {"draft","created","ready"}:
                actions.append(await upsert(bid,"send_invoice","invoice",iidv,f"Email invoice {num} to {cname}",f"Churvox pulled invoice {num}, customer contact, amount and due date.",{**common,"message":f"Hi {cname}, your invoice {num}{f' for {amount}' if amount else ''} is ready. You can view it through the link below."},"Approve only when the invoice looks correct.","Draft invoice ready to send",["Invoice pulled","Client contact pulled","Amount checked","Message drafted"]))
            due=dt(inv.get("due_date")); overdue=st in {"overdue","unpaid"} or (due and due<now() and st not in {"paid","void","cancelled","canceled"})
            if overdue:
                days=(now()-due).days if due else ""
                actions.append(await upsert(bid,"invoice_reminder","invoice",iidv,f"Send payment reminder to {cname}","Churvox pulled the overdue invoice, customer contact and amount before drafting the reminder.",{**common,"days_overdue":f"{days} days" if isinstance(days,int) else "Overdue","message":f"Hi {cname}, friendly reminder invoice {num}{f' for {amount}' if amount else ''} is still open. Please let us know if you need another copy or have any questions."},"Send reminder only after owner approval.","Invoice needs payment follow-up",["Invoice status checked","Client contact pulled","Amount checked","Reminder drafted"]))
    @router.post("/ai/operator/scan-deep")
    async def scan_deep(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user); bid=await get_user_business_id(current_user); actions=[]; await scan_jobs(bid,actions); await scan_quotes(bid,actions); await scan_invoices(bid,actions); return {"success":True,"created":len(actions),"actions":[serial(a) for a in actions]}
    @router.post("/ai/operator/scan")
    async def scan(payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        guard(current_user); bid=await get_user_business_id(current_user); actions=[]; await scan_jobs(bid,actions); await scan_quotes(bid,actions); await scan_invoices(bid,actions); return {"success":True,"created":len(actions),"actions":[serial(a) for a in actions]}
    module.app.include_router(router); setattr(module,"_DEEP_SLIPS_REGISTERED",True); return module
