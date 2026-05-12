def build_reasoning(action, records, memory, quality):
    reason_points = list(action.get("reason_points") or [])
    reason_points.extend([
        f"Priority {action.get('priority_score', 0)} based on urgency and cashflow impact.",
        f"Confidence {action.get('confidence', 0)} reflects current data completeness.",
        f"Risk level {action.get('risk', 'low')} with guardrails enforced.",
    ])
    missing = []
    if not (records or {}).get("workers"): missing.append("No workers loaded")
    if not (records or {}).get("clients"): missing.append("Client profile data sparse")
    if (quality or {}).get("issues"): missing.append("Data quality issues still open")
    reason = action.get("reason") or "AI prepared this action from your business records."
    return {
        "reason": reason,
        "reason_points": reason_points,
        "data_used": action.get("data_used") or ["jobs","clients","workers","quotes","invoices","memory","quality"],
        "confidence_detail": {
            "score": action.get("confidence", 0),
            "missing_data": missing,
        },
        "policy": {
            "what_happens_if_approved": action.get("exact_changes"),
            "what_will_not_happen": ["No customer send", "No charging", "No payroll/billing changes", "No record deletes"],
            "guardrail": action.get("guardrail"),
        },
    }
