from copy import deepcopy

LOW_RISK = {
    "setup_review", "myob_review", "sms_review", "draft_invoice_reminder", "draft_quote_followup",
    "data_quality_fix", "daily_briefing", "ask_business",
}
MEDIUM_RISK = {"assign_worker", "create_draft_invoice", "update_job", "update_client"}
HIGH_RISK = {"send_customer_message", "send_sms", "send_email", "sync_myob", "charge_customer"}
FORBIDDEN = {"delete_record", "change_payroll", "submit_tax", "bank_payout", "change_billing", "remove_worker", "change_subscription"}


def classify_action(action_type, action=None):
    at = str(action_type or "").strip().lower()
    base = {
        "action_type": at,
        "allowed": True,
        "blocked": False,
        "owner_approval_required": False,
        "strong_confirmation_required": False,
        "risk": "low",
        "reason": "Safe to prepare for owner approval-first workflow.",
    }

    if at in FORBIDDEN:
        return {**base, "allowed": False, "blocked": True, "risk": "forbidden", "owner_approval_required": True, "strong_confirmation_required": True, "reason": "Forbidden action type. Owner-only control required."}
    if at in HIGH_RISK:
        return {**base, "risk": "high", "owner_approval_required": True, "strong_confirmation_required": True, "reason": "High-risk action requires explicit owner approval and strong confirmation."}
    if at in MEDIUM_RISK:
        return {**base, "risk": "medium", "owner_approval_required": True, "reason": "Medium-risk action requires owner approval before execution."}
    if at in LOW_RISK:
        return {**base, "risk": "low", "reason": "Low-risk action can be safely prepared for owner review."}
    return {**base, "risk": "medium", "owner_approval_required": True, "reason": "Unrecognized action defaults to approval-first medium risk."}


def policy_snapshot():
    return deepcopy({
        "low_risk": sorted(LOW_RISK),
        "medium_risk": sorted(MEDIUM_RISK),
        "high_risk": sorted(HIGH_RISK),
        "forbidden": sorted(FORBIDDEN),
        "guardrails": [
            "AI cannot execute payroll/tax/bank payout/billing/subscription changes.",
            "AI cannot send customer messages, sync MYOB writes, or charge customers without explicit owner control.",
            "All actions stay business-scoped and approval-first.",
        ],
    })
