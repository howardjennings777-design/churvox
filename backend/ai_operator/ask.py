from ai_operator_engine import is_unassigned_job, is_unpaid_invoice, is_open_quote, title_of


def answer_business_question(question, jobs=None, clients=None, workers=None, quotes=None, invoices=None, actions=None, quality=None, memory=None):
    q = str(question or "").lower()
    jobs, clients, workers, quotes, invoices, actions = jobs or [], clients or [], workers or [], quotes or [], invoices or [], actions or []
    unpaid = [i for i in invoices if is_unpaid_invoice(i)]
    if any(k in q for k in ["owe", "unpaid", "payment"]):
        return {"answer": f"{len(unpaid)} invoices are unpaid.", "items": unpaid[:5]}
    if any(k in q for k in ["free", "available", "worker", "crew"]):
        busy = {j.get('assigned_worker_id') for j in jobs if j.get('assigned_worker_id')}
        free = [w for w in workers if str(w.get('_id') or w.get('id')) not in busy]
        return {"answer": f"{len(free)} workers look available.", "items": free[:5]}
    if any(k in q for k in ["invoiced", "billing"]):
        ready = [j for j in jobs if str(j.get('status','')).lower() in {'completed','done','closed'}]
        return {"answer": f"{len(ready)} jobs are ready for invoicing.", "items": ready[:5]}
    if "quote" in q and "follow" in q:
        oq = [r for r in quotes if is_open_quote(r)]
        return {"answer": f"{len(oq)} quotes need follow-up.", "items": oq[:5]}
    if any(k in q for k in ["first", "next", "priority"]):
        top = sorted(actions, key=lambda a: float(a.get('priority_score') or 0), reverse=True)[:3]
        return {"answer": f"Start with {title_of(top[0],'the top AI action')}" if top else "Start by fixing data quality and preparing crew assignments.", "items": top}
    if any(k in q for k in ["missing", "quality", "fix"]):
        issues = (quality or {}).get("issues", [])
        return {"answer": f"{len(issues)} data quality issues found.", "items": issues[:5]}
    if any(k in q for k in ["learned", "memory", "patterns"]):
        return {"answer": "Here is what AI has learned from your business patterns.", "items": (memory or {}).get("learning", {})}
    return {"answer": "Business snapshot ready.", "snapshot": {"jobs": len(jobs), "clients": len(clients), "workers": len(workers), "unassigned_jobs": len([j for j in jobs if is_unassigned_job(j)]), "unpaid_invoices": len(unpaid), "open_quotes": len([q for q in quotes if is_open_quote(q)]), "best_setup_data_fix": ((quality or {}).get('next_fix') or {}).get('fix') if quality else "Run setup review"}}
