
def _is_blank(v):
    return v in (None, "", [], {})


def build_data_quality_report(jobs=None, clients=None, workers=None, quotes=None, invoices=None):
    jobs, clients, workers, quotes, invoices = jobs or [], clients or [], workers or [], quotes or [], invoices or []
    issues = []

    def add(priority, key, text, count):
        if count:
            issues.append({"priority": priority, "key": key, "title": text, "count": count})

    add("high", "clients_missing_phone", "Clients missing phone", sum(1 for c in clients if _is_blank(c.get("phone"))))
    add("high", "clients_missing_email", "Clients missing email", sum(1 for c in clients if _is_blank(c.get("email"))))
    add("high", "workers_missing_regions", "Workers missing regions", sum(1 for w in workers if _is_blank(w.get("regions")) and _is_blank(w.get("region"))))
    add("medium", "workers_missing_capability", "Workers missing skills/trade/experience/service types", sum(1 for w in workers if all(_is_blank(w.get(k)) for k in ["skills", "trade", "experience", "service_types"])))
    add("high", "jobs_missing_price", "Jobs missing price", sum(1 for j in jobs if _is_blank(j.get("price")) and _is_blank(j.get("total"))))
    add("medium", "jobs_missing_region", "Jobs missing region/suburb", sum(1 for j in jobs if _is_blank(j.get("region")) and _is_blank(j.get("suburb"))))
    add("high", "invoices_missing_due_dates", "Invoices missing due dates", sum(1 for i in invoices if _is_blank(i.get("due_date"))))
    add("medium", "quotes_missing_followup", "Quotes missing follow-up status/dates", sum(1 for q in quotes if _is_blank(q.get("follow_up_status")) or _is_blank(q.get("follow_up_date"))))

    high = sum(1 for i in issues if i["priority"] == "high")
    medium = sum(1 for i in issues if i["priority"] == "medium")
    score = max(0, 100 - (high * 12 + medium * 6))
    next_fix = next((i for i in issues if i["priority"] == "high"), issues[0] if issues else None)
    return {
        "score": score,
        "summary": "Data quality is healthy." if not issues else f"{len(issues)} quality gaps found.",
        "issues": issues,
        "high_priority_count": high,
        "medium_priority_count": medium,
        "next_fix": next_fix,
    }


def build_data_quality_actions(report):
    actions = []
    for issue in (report or {}).get("issues", []):
        actions.append({
            "action_type": "data_quality_fix",
            "category": "DATA QUALITY",
            "status": "needs_info",
            "risk": "low",
            "title": f"Fix: {issue.get('title')}",
            "summary": f"{issue.get('count', 0)} records need updates.",
            "owner_note": "AI prepared the issue list only. Owner controls actual data changes.",
        })
    return actions
