from collections import Counter
from datetime import datetime, timezone


def _num(v):
    try:return float(v or 0)
    except Exception:return 0.0


def load_audit_rows(db, business_id, limit=300):
    return db.ai_operator_audit_log.find({"business_id": str(business_id)}).sort("created_at", -1).limit(max(1, int(limit)))


def build_business_memory(jobs=None, clients=None, workers=None, quotes=None, invoices=None, audit_rows=None):
    jobs, clients, workers, quotes, invoices, audit_rows = jobs or [], clients or [], workers or [], quotes or [], invoices or [], audit_rows or []
    completed_jobs = [j for j in jobs if str(j.get("status", "")).lower() in {"completed", "done", "closed"}]
    unpaid = [i for i in invoices if str(i.get("status", "")).lower() in {"unpaid", "sent", "overdue", "open", "pending", "draft"}]
    open_quotes = [q for q in quotes if str(q.get("status", "")).lower() in {"open", "sent", "pending", "waiting", "draft"}]

    status_counter = Counter(str(a.get("status") or a.get("result") or "unknown").lower() for a in audit_rows)
    action_counter = Counter(str(a.get("action_type") or "unknown") for a in audit_rows)

    memory = {
        "counts": {"jobs": len(jobs), "clients": len(clients), "workers": len(workers), "quotes": len(quotes), "invoices": len(invoices), "completed_jobs": len(completed_jobs), "unpaid_invoices": len(unpaid), "open_quotes": len(open_quotes)},
        "totals": {"unpaid_invoice_total": round(sum(_num(i.get("total") or i.get("amount")) for i in unpaid), 2), "open_quote_pipeline": round(sum(_num(q.get("total") or q.get("amount")) for q in open_quotes), 2), "completed_job_value": round(sum(_num(j.get("price") or j.get("total")) for j in completed_jobs), 2)},
        "top_clients_by_jobs": Counter(str(j.get("client_name") or j.get("customer_name") or "Unknown") for j in jobs).most_common(5),
        "top_job_regions": Counter(str(j.get("region") or j.get("suburb") or "Unknown") for j in jobs).most_common(5),
        "top_worker_regions": Counter(str(w.get("region") or (w.get("regions") or ["Unknown"])[0]) for w in workers).most_common(5),
        "common_job_types": Counter(str(j.get("service_type") or j.get("job_type") or "General") for j in jobs).most_common(5),
        "audit_summary": {"approved": status_counter.get("approved", 0), "rejected": status_counter.get("rejected", 0), "failed": status_counter.get("failed", 0), "approved_action_types": [k for k, _ in action_counter.most_common(5)], "rejected_action_types": [k for k, _ in action_counter.most_common(5)], "failed_action_types": [k for k, _ in action_counter.most_common(5)]},
    }
    return memory


def build_memory_insights(memory):
    c = (memory or {}).get("counts", {})
    t = (memory or {}).get("totals", {})
    return [f"{c.get('completed_jobs',0)} jobs are completed.", f"${t.get('unpaid_invoice_total',0):,.2f} is waiting in unpaid invoices.", f"{c.get('open_quotes',0)} quotes are open in pipeline."]


async def save_business_memory(db, business_id, memory):
    now = datetime.now(timezone.utc)
    insights = build_memory_insights(memory)
    await db.ai_operator_memory.update_one({"business_id": str(business_id), "memory_type": "business_patterns"}, {"$set": {"business_id": str(business_id), "memory_type": "business_patterns", "patterns": memory, "insights": insights, "updated_at": now}, "$setOnInsert": {"created_at": now}}, upsert=True)
    return {"patterns": memory, "insights": insights, "updated_at": now}
