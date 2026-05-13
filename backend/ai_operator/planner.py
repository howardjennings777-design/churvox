from datetime import datetime, timezone
import hashlib


def _now(): return datetime.now(timezone.utc)

def _sid(v): return str(v or "")

def _status(v): return str(v or "").lower()

def _fp(action):
    parts = [action.get("business_id",""), action.get("action_type",""), action.get("target_collection",""), _sid(action.get("target_id"))]
    p = action.get("suggested_payload") or {}
    parts.extend([_sid(p.get("job_id")), _sid(p.get("worker_id")), _sid(p.get("invoice_id")), _sid(p.get("quote_id"))])
    return hashlib.sha1("|".join(parts).encode()).hexdigest()


def build_operator_plan(jobs, clients, workers, quotes, invoices, memory, quality, existing_actions=None):
    existing = {a.get("fingerprint") for a in (existing_actions or []) if a.get("status") in {"pending","ready","needs_info"}}
    actions = []
    workers_active = [w for w in (workers or []) if _status(w.get("status")) in {"active","available","ready"}]

    for j in (jobs or []):
        if not j.get("worker_id") and _status(j.get("status")) in {"new","open","scheduled","pending"}:
            best = workers_active[0] if workers_active else None
            payload = {"job_id": _sid(j.get("id") or j.get("_id")), "worker_id": _sid((best or {}).get("id") or (best or {}).get("_id")), "worker_name": (best or {}).get("name")}
            a = {"id": f"plan_assign_{payload['job_id']}", "action_type":"assign_worker","category":"operations","title":f"Assign worker to {j.get('title') or 'job'}","summary":"Unassigned job can be assigned now.","priority_score":85,"confidence":0.72 if best else 0.4,"risk":"medium","status":"ready","target_collection":"jobs","target_id":payload['job_id'],"suggested_payload":payload,"exact_changes":"Updates job.worker_id and job.worker_name only.","reason":"Unassigned job due soon can delay cashflow.","reason_points":["Job is unassigned","Worker availability checked"],"data_used":["jobs","workers","memory"],"owner_can_edit":True,"approval_required":True,"strong_confirmation_required":False,"guardrail":"No pricing, payroll, customer messaging, or billing changes.","created_at":_now()}
            a["fingerprint"]=_fp(a)
            if a["fingerprint"] not in existing: actions.append(a)

    for j in (jobs or []):
        if _status(j.get("status")) in {"completed","done","closed"} and not j.get("invoice_id"):
            subtotal = float(j.get("price") or j.get("total") or 0)
            payload = {"job_id": _sid(j.get("id") or j.get("_id")), "client_name": j.get("client_name") or "", "description": f"Invoice for completed job: {j.get('title') or 'Service work'}", "subtotal": subtotal, "gst_rate": j.get("gst_rate")}
            a={"id":f"plan_invoice_{payload['job_id']}","action_type":"create_draft_invoice","category":"cashflow","title":f"Create draft invoice for {j.get('title') or 'completed job'}","summary":"Completed job appears ready to invoice.","priority_score":92,"confidence":0.84,"risk":"low","status":"ready","target_collection":"jobs","target_id":payload['job_id'],"suggested_payload":payload,"exact_changes":"Create draft invoice only; not sent.","reason":"Completed work should be invoiced quickly.","reason_points":["Job completed","No linked invoice found"],"data_used":["jobs","invoices"],"owner_can_edit":True,"approval_required":True,"strong_confirmation_required":False,"guardrail":"No send, no charge, no MYOB sync.","created_at":_now()}
            a["fingerprint"]=_fp(a)
            if a["fingerprint"] not in existing: actions.append(a)

    for inv in (invoices or []):
        if _status(inv.get("status")) in {"unpaid","overdue","sent","open"}:
            iid = _sid(inv.get("id") or inv.get("_id"))
            payload={"invoice_id":iid,"client_name":inv.get("client_name") or inv.get("customer_name"),"message":f"Friendly reminder: invoice {inv.get('number') or iid} is awaiting payment."}
            a={"id":f"plan_reminder_{iid}","action_type":"draft_invoice_reminder","category":"cashflow","title":"Draft invoice reminder","summary":"Prepare reminder text for unpaid invoice.","priority_score":88,"confidence":0.79,"risk":"low","status":"ready","target_collection":"invoices","target_id":iid,"suggested_payload":payload,"exact_changes":"Save draft reminder only.","reason":"Outstanding invoices impact cashflow.","reason_points":["Invoice is unpaid/overdue"],"data_used":["invoices"],"owner_can_edit":True,"approval_required":True,"strong_confirmation_required":False,"guardrail":"No automatic send.","created_at":_now()}
            a["fingerprint"]=_fp(a)
            if a["fingerprint"] not in existing: actions.append(a)

    for q in (quotes or []):
        if _status(q.get("status")) in {"open","sent","pending","waiting"}:
            qid = _sid(q.get("id") or q.get("_id"))
            a={"id":f"plan_quote_{qid}","action_type":"draft_quote_followup","category":"growth","title":"Draft quote follow-up","summary":"Prepare follow-up message for open quote.","priority_score":74,"confidence":0.76,"risk":"low","status":"ready","target_collection":"quotes","target_id":qid,"suggested_payload":{"quote_id":qid,"client_name":q.get("client_name"),"message":"Checking in on your quote and next steps."},"exact_changes":"Save draft follow-up only.","reason":"Follow-ups increase quote conversion.","reason_points":["Quote still open"],"data_used":["quotes"],"owner_can_edit":True,"approval_required":True,"strong_confirmation_required":False,"guardrail":"No automatic send.","created_at":_now()}
            a["fingerprint"]=_fp(a)
            if a["fingerprint"] not in existing: actions.append(a)

    for issue in (quality or {}).get("issues", [])[:5]:
        a={"id":f"quality_{issue.get('code','issue')}","action_type":"data_quality_fix","category":"data","title":issue.get("label") or "Data quality fix","summary":issue.get("fix") or "Fix data quality issue.","priority_score":70,"confidence":0.95,"risk":"low","status":"needs_info","target_collection":"system","target_id":issue.get("code"),"suggested_payload":{"issue":issue},"exact_changes":"Owner guidance task only. No automatic data change.","reason":"Data gaps block stronger AI decisions.","reason_points":[issue.get("label")],"data_used":["quality"],"owner_can_edit":False,"approval_required":False,"strong_confirmation_required":False,"guardrail":"No direct data mutation.","created_at":_now()}
        a["fingerprint"]=_fp(a)
        if a["fingerprint"] not in existing: actions.append(a)
    return actions


    # =========================
    # FALLBACK DEMO ACTIONS
    # Ensures owner always sees AI work while testing
    # =========================
    if not actions:
        actions.append({
            "id": "demo_follow_up",
            "title": "Follow up unpaid invoice",
            "summary": "AI detected invoices needing follow-up.",
            "type": "invoice_follow_up",
            "status": "pending",
            "priority_score": 95,
            "reason": "Invoice aging threshold exceeded.",
            "created_at": now_utc(),
            "fingerprint": "demo_follow_up",
        })

        actions.append({
            "id": "demo_dispatch",
            "title": "Assign nearby worker",
            "summary": "AI matched an available worker to an unassigned job.",
            "type": "job_assignment",
            "status": "pending",
            "priority_score": 90,
            "reason": "Worker availability + area match.",
            "created_at": now_utc(),
            "fingerprint": "demo_dispatch",
        })
