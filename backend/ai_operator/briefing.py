from datetime import datetime, timezone
from ai_operator.quality import build_data_quality_report, build_data_quality_actions
from ai_operator.memory import build_business_memory, build_memory_insights
from ai_operator_engine import is_unassigned_job, is_completed_job, is_unpaid_invoice, is_open_quote


def build_daily_briefing(jobs=None, clients=None, workers=None, quotes=None, invoices=None, actions=None, audit_rows=None):
    jobs, clients, workers, quotes, invoices, actions = jobs or [], clients or [], workers or [], quotes or [], invoices or [], actions or []
    quality = build_data_quality_report(jobs, clients, workers, quotes, invoices)
    memory = build_business_memory(jobs, clients, workers, quotes, invoices, audit_rows or [])
    memory_insights = build_memory_insights(memory)
    top_actions = sorted(actions, key=lambda a: float(a.get("priority_score") or 0), reverse=True)[:5]
    summary_cards = [
        {"label": "Jobs needing crew", "value": len([j for j in jobs if is_unassigned_job(j)])},
        {"label": "Completed work", "value": len([j for j in jobs if is_completed_job(j)])},
        {"label": "Money waiting", "value": len([i for i in invoices if is_unpaid_invoice(i)])},
        {"label": "Quotes to follow up", "value": len([q for q in quotes if is_open_quote(q)])},
        {"label": "Data readiness", "value": f"{quality.get('score',0)}%"},
    ]
    next_best = top_actions[0] if top_actions else {"title": "Run data quality fixer", "action_type": "data_quality_fix"}
    return {"created_at": datetime.now(timezone.utc), "headline": "Your AI Operator daily briefing is ready.", "next_best_action": next_best, "summary_cards": summary_cards, "top_actions": top_actions, "risks": [i for i in quality.get("issues", []) if i.get("severity") == "high"], "memory_insights": memory_insights, "quality": quality, "memory": memory, "data_quality_actions": build_data_quality_actions(quality)}
