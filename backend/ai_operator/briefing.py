from datetime import datetime, timezone
from ai_operator.quality import build_data_quality_report, build_data_quality_actions
from ai_operator.memory import build_business_memory, build_memory_insights


def build_daily_briefing(jobs=None, clients=None, workers=None, quotes=None, invoices=None, actions=None, audit_rows=None):
    jobs, clients, workers, quotes, invoices, actions, audit_rows = jobs or [], clients or [], workers or [], quotes or [], invoices or [], actions or [], audit_rows or []
    quality = build_data_quality_report(jobs, clients, workers, quotes, invoices)
    memory = build_business_memory(jobs, clients, workers, quotes, invoices, audit_rows)
    memory_insights = build_memory_insights(memory)
    qa = build_data_quality_actions(quality)
    return {
        "created_at": datetime.now(timezone.utc),
        "headline": "Owner-ready daily AI briefing",
        "next_best_action": qa[0]["title"] if qa else "Review AI work queue and approve top action.",
        "summary_cards": [
            {"label": "Jobs needing crew", "value": sum(1 for j in jobs if not j.get("worker_id") and not j.get("assigned_worker_id"))},
            {"label": "Completed work", "value": memory.get("counts", {}).get("completed_jobs", 0)},
            {"label": "Money waiting", "value": memory.get("totals", {}).get("unpaid_invoice_total", 0)},
            {"label": "Quotes to follow up", "value": memory.get("counts", {}).get("open_quotes", 0)},
            {"label": "Data readiness", "value": quality.get("score", 0)},
        ],
        "top_actions": (actions or [])[:5],
        "risks": [i for i in quality.get("issues", []) if i.get("priority") == "high"][:5],
        "memory_insights": memory_insights,
        "quality": quality,
        "memory": memory,
    }
