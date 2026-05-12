from typing import Any, Dict

LOW_RISK_ACTIONS = {
    "setup_review", "myob_review", "sms_review", "draft_invoice_reminder", "draft_quote_followup",
    "data_quality_fix", "daily_briefing", "ask_business",
}
MEDIUM_RISK_ACTIONS = {"assign_worker", "create_draft_invoice", "update_job", "update_client"}
HIGH_RISK_ACTIONS = {"send_customer_message", "send_sms", "send_email", "sync_myob", "charge_customer"}
FORBIDDEN_AI_ACTIONS = {"delete_record", "change_payroll", "submit_tax", "bank_payout", "change_billing", "remove_worker", "change_subscription"}


def classify_action(action_type: str, action: Dict[str, Any] | None = None) -> Dict[str, Any]:
    kind = str(action_type or "").strip().lower()
    base = {
        "action_type": kind,
        "allowed": True,
        "blocked": False,
        "risk": "low",
        "requires_owner_approval": False,
        "requires_strong_confirmation": False,
    }
    if kind in FORBIDDEN_AI_ACTIONS:
        base.update({"allowed": False, "blocked": True, "risk": "forbidden", "reason": "This action is forbidden by AI safety policy."})
    elif kind in HIGH_RISK_ACTIONS:
        base.update({"risk": "high", "requires_owner_approval": True, "requires_strong_confirmation": True})
    elif kind in MEDIUM_RISK_ACTIONS:
        base.update({"risk": "medium", "requires_owner_approval": True})
    elif kind in LOW_RISK_ACTIONS:
        base.update({"risk": "low", "requires_owner_approval": False})
    return base


def policy_snapshot() -> Dict[str, Any]:
    return {
        "principle": "AI prepares. Owner approves. Churvox logs every action.",
        "low_risk_actions": sorted(LOW_RISK_ACTIONS),
        "medium_risk_actions": sorted(MEDIUM_RISK_ACTIONS),
        "high_risk_actions": sorted(HIGH_RISK_ACTIONS),
        "forbidden_ai_actions": sorted(FORBIDDEN_AI_ACTIONS),
    }
