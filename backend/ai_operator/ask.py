def answer_business_question(question, jobs=None, clients=None, workers=None, quotes=None, invoices=None, actions=None, quality=None, memory=None):
    q = str(question or "").lower()
    jobs, clients, workers, quotes, invoices, actions = jobs or [], clients or [], workers or [], quotes or [], invoices or [], actions or []
    supporting_items, suggested_actions = [], []

    if "owe" in q or "overdue" in q or "invoice" in q and "overdue" in q:
        owed = [i for i in invoices if str(i.get("status", "")).lower() in {"unpaid", "overdue", "sent", "open", "pending"}]
        supporting_items = owed[:10]
        suggested_actions = [a for a in actions if a.get("action_type") in {"draft_invoice_reminder","create_draft_invoice"}][:5]
        return {"answer": f"{len(owed)} invoices need attention.", "supporting_items": supporting_items, "suggested_actions": suggested_actions}
    if "ready to invoice" in q or "jobs are ready" in q:
        ready = [j for j in jobs if str(j.get("status", "")).lower() in {"completed", "done", "closed"} and not j.get("invoice_id")]
        return {"answer": f"{len(ready)} jobs are ready to invoice.", "supporting_items": ready[:10], "suggested_actions": [a for a in actions if a.get('action_type')=='create_draft_invoice'][:5]}
    if "unassigned" in q:
        unassigned = [j for j in jobs if not j.get("worker_id")]
        return {"answer": f"{len(unassigned)} jobs are unassigned.", "supporting_items": unassigned[:10], "suggested_actions": [a for a in actions if a.get('action_type')=='assign_worker'][:5]}
    if "follow up" in q and "quote" in q:
        follow = [qt for qt in quotes if str(qt.get("status", "")).lower() in {"open", "sent", "pending", "waiting"}]
        return {"answer": f"{len(follow)} quotes should be followed up.", "supporting_items": follow[:10], "suggested_actions": [a for a in actions if a.get('action_type')=='draft_quote_followup'][:5]}
    if "blocking ai" in q or "data" in q:
        issues = (quality or {}).get("issues") or []
        return {"answer": f"{len(issues)} data issues are blocking stronger AI.", "supporting_items": issues[:10], "suggested_actions": [a for a in actions if a.get('action_type')=='data_quality_fix'][:5]}
    if "waiting for approval" in q:
        wait = [a for a in actions if str(a.get("status","")).lower() in {"pending","ready","needs_info"}]
        return {"answer": f"{len(wait)} actions are waiting for your approval.", "supporting_items": wait[:10], "suggested_actions": wait[:5]}

    return {"answer": "AI found the work. You approve. Churvox does it.", "supporting_items": [], "suggested_actions": [a for a in actions[:5]]}
