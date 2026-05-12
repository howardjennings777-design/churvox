def answer_business_question(question, jobs=None, clients=None, workers=None, quotes=None, invoices=None, actions=None, quality=None, memory=None):
    q = str(question or "").lower()
    jobs, workers, quotes, invoices = jobs or [], workers or [], quotes or [], invoices or []
    quality, memory = quality or {}, memory or {}

    if "owe" in q or "money" in q:
        owed = [i for i in invoices if str(i.get("status", "")).lower() in {"unpaid", "overdue", "sent", "open", "pending"}]
        return {"answer": "Money waiting from: " + ", ".join((i.get("client_name") or i.get("customer_name") or "Client") for i in owed[:8]) if owed else "No major unpaid invoices found."}
    if "free" in q or "available" in q or "crew" in q:
        free = [w for w in workers if str(w.get("status", "active")).lower() in {"active", "available", "ready"}]
        return {"answer": "Available crew: " + ", ".join((w.get("name") or "Worker") for w in free[:8]) if free else "No clearly available crew detected."}
    if "invoic" in q:
        ready = [j for j in jobs if str(j.get("status", "")).lower() in {"completed", "done", "closed"}]
        return {"answer": f"{len(ready)} jobs appear invoice-ready based on completed status."}
    if "quote" in q and "follow" in q:
        follow = [qt for qt in quotes if str(qt.get("status", "")).lower() in {"open", "sent", "pending", "waiting"}]
        return {"answer": f"{len(follow)} quotes need follow-up."}
    if "first" in q or "today" in q:
        nxt = (quality.get("next_fix") or {}).get("title") or "Start with top pending action in AI Queue."
        return {"answer": f"Do this first: {nxt}"}
    if "data" in q or "missing" in q:
        top = quality.get("issues") or []
        return {"answer": "Missing data highlights: " + ", ".join(i.get("title") for i in top[:5]) if top else "Data looks healthy."}
    if "learn" in q or "memory" in q or "pattern" in q:
        insights = memory.get("insights") or []
        return {"answer": "AI memory insights: " + " ".join(insights[:4]) if insights else "No memory insights yet. Update memory first."}
    c = (memory.get("patterns") or memory).get("counts", {}) if isinstance(memory, dict) else {}
    return {"answer": f"Business snapshot: {c.get('jobs',len(jobs))} jobs, {c.get('clients',len(clients or []))} clients, {c.get('workers',len(workers))} workers."}
