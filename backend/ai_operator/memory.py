from collections import Counter
from datetime import datetime, timezone
from ai_operator_engine import money_number, status_of, is_completed_job, is_open_quote, is_unpaid_invoice, safe_id, client_of, region_of


def load_audit_rows(db, business_id, limit=300):
    return db.ai_operator_audit_log.find({"business_id": str(business_id)}).sort("created_at", -1).limit(limit).to_list(length=limit)


def build_business_memory(jobs=None, clients=None, workers=None, quotes=None, invoices=None, audit_rows=None):
    jobs, clients, workers, quotes, invoices, audit_rows = jobs or [], clients or [], workers or [], quotes or [], invoices or [], audit_rows or []
    completed_jobs = [j for j in jobs if is_completed_job(j)]
    unpaid = [i for i in invoices if is_unpaid_invoice(i)]
    open_quotes = [q for q in quotes if is_open_quote(q)]
    approved = [a for a in audit_rows if a.get("event") in {"approved", "approved_and_executed"}]
    rejected = [a for a in audit_rows if a.get("event") == "rejected"]
    failed = [a for a in audit_rows if "failed" in str(a.get("event") or "")]
    patterns = {
        "top_clients_by_jobs": Counter(client_of(j) for j in jobs).most_common(5),
        "top_job_regions": Counter(region_of(j) for j in jobs if region_of(j)).most_common(5),
        "top_worker_regions": Counter(region_of(w) for w in workers if region_of(w)).most_common(5),
        "common_job_types": Counter((j.get("service_type") or j.get("job_type") or j.get("trade") or "other") for j in jobs).most_common(5),
        "clients_with_unpaid_money": Counter(client_of(i) for i in unpaid).most_common(5),
        "clients_with_quote_pipeline": Counter(client_of(q) for q in open_quotes).most_common(5),
    }
    learning = {
        "approved_action_types": Counter(a.get("action_type") for a in approved if a.get("action_type")).most_common(8),
        "rejected_action_types": Counter(a.get("action_type") for a in rejected if a.get("action_type")).most_common(8),
        "failed_action_types": Counter(a.get("action_type") for a in failed if a.get("action_type")).most_common(8),
    }
    return {"counts": {"jobs":len(jobs),"clients":len(clients),"workers":len(workers),"quotes":len(quotes),"invoices":len(invoices),"completed_jobs":len(completed_jobs),"unpaid_invoices":len(unpaid),"open_quotes":len(open_quotes),"approved_ai_actions":len(approved),"rejected_ai_actions":len(rejected),"failed_ai_actions":len(failed)},"money": {"unpaid_invoice_total": round(sum(money_number(i) for i in unpaid),2),"open_quote_pipeline": round(sum(money_number(q) for q in open_quotes),2),"completed_job_value": round(sum(money_number(j) for j in completed_jobs),2)},"patterns":patterns,"learning":learning}


def build_memory_insights(memory):
    c = (memory or {}).get("counts", {})
    m = (memory or {}).get("money", {})
    return [f"{c.get('unpaid_invoices',0)} unpaid invoices worth ${m.get('unpaid_invoice_total',0):,.2f}.", f"{c.get('open_quotes',0)} open quotes worth ${m.get('open_quote_pipeline',0):,.2f}.", f"AI approvals: {c.get('approved_ai_actions',0)} approved, {c.get('rejected_ai_actions',0)} rejected."]


async def save_business_memory(db, business_id, memory):
    now = datetime.now(timezone.utc)
    doc = {"business_id": str(business_id), "memory_type": "business_patterns", "patterns": memory.get("patterns", {}), "insights": build_memory_insights(memory), "memory": memory, "updated_at": now}
    await db.ai_operator_memory.update_one({"business_id": str(business_id), "memory_type": "business_patterns"}, {"$set": doc, "$setOnInsert": {"created_at": now}}, upsert=True)
    return doc
