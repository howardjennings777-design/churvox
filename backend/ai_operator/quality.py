from ai_operator_engine import safe_id


def _missing(row, keys):
    return not any(str(row.get(k) or "").strip() for k in keys)


def _issue(code, label, rows, fix, severity):
    return {"code": code, "label": label, "count": len(rows), "fix": fix, "severity": severity, "sample_ids": [safe_id(r.get('_id') or r.get('id')) for r in rows[:5]]}


def build_data_quality_report(jobs=None, clients=None, workers=None, quotes=None, invoices=None):
    jobs, clients, workers, quotes, invoices = jobs or [], clients or [], workers or [], quotes or [], invoices or []
    issues = []
    issues.append(_issue("clients_missing_phone", "Clients missing phone", [r for r in clients if _missing(r,["phone","mobile","contact_phone"])], "Add client mobile/phone for reminders.", "high"))
    issues.append(_issue("clients_missing_email", "Clients missing email", [r for r in clients if _missing(r,["email","customer_email","contact_email"])], "Add client email for invoices and follow-ups.", "medium"))
    issues.append(_issue("workers_missing_region", "Workers missing region", [r for r in workers if _missing(r,["region","area","suburb","city","location_region","base_region"])], "Set worker region for better assignment matching.", "medium"))
    issues.append(_issue("workers_missing_skills", "Workers missing skills", [r for r in workers if _missing(r,["skills","trade","experience","service_types"])], "Add trade/skills so AI can match jobs.", "high"))
    issues.append(_issue("jobs_missing_price", "Jobs missing price", [r for r in jobs if _missing(r,["price","total","amount","balance","job_price","fixed_price","invoice_total","subtotal"])], "Add pricing so jobs can flow to invoices.", "high"))
    issues.append(_issue("jobs_missing_region", "Jobs missing region", [r for r in jobs if _missing(r,["region","area","suburb","city","location_region","base_region"])], "Add job region for crew planning.", "medium"))
    issues.append(_issue("invoices_missing_due_date", "Invoices missing due dates", [r for r in invoices if _missing(r,["due_date","payment_due","due_at"])], "Add due dates to improve payment tracking.", "high"))
    issues.append(_issue("quotes_missing_follow_up", "Quotes missing follow-up", [r for r in quotes if _missing(r,["follow_up_status","last_followed_up_at","next_follow_up_at"])], "Set quote follow-up fields.", "medium"))
    issues = [i for i in issues if i["count"] > 0]
    high = sum(1 for i in issues if i["severity"] == "high")
    medium = sum(1 for i in issues if i["severity"] == "medium")
    score = max(0, 100 - (high * 12 + medium * 6))
    next_fix = issues[0] if issues else None
    return {"score": score, "summary": f"{len(issues)} data quality gaps found.", "issues": issues, "high_priority_count": high, "medium_priority_count": medium, "next_fix": next_fix}


def build_data_quality_actions(report):
    actions = []
    for issue in (report or {}).get("issues", [])[:6]:
        actions.append({"action_type": "data_quality_fix", "category": "DATA QUALITY", "risk": "low", "status": "needs_info", "title": issue.get("label"), "summary": issue.get("fix"), "guardrail": "owner controls actual data changes", "suggested_payload": {"issue_code": issue.get("code"), "sample_ids": issue.get("sample_ids", []), "fix": issue.get("fix")}})
    return actions
