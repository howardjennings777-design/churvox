from __future__ import annotations

from enum import Enum


class StringEnum(str, Enum):
    """JSON-friendly enum base."""


class WorkflowName(StringEnum):
    JOB = "job"
    QUOTE = "quote"
    INVOICE = "invoice"


JOB_TRANSITIONS: dict[str, frozenset[str]] = {
    "draft": frozenset({"ready_to_schedule", "cancelled"}),
    "ready_to_schedule": frozenset({"scheduled", "cancelled"}),
    "scheduled": frozenset({"assigned", "ready_to_schedule", "cancelled"}),
    "assigned": frozenset({"acknowledged", "scheduled", "cancelled"}),
    "acknowledged": frozenset({"travelling", "in_progress", "scheduled", "cancelled"}),
    "travelling": frozenset({"in_progress", "needs_help", "scheduled"}),
    "in_progress": frozenset({"paused", "needs_help", "completion_submitted"}),
    "paused": frozenset({"in_progress", "needs_help", "completion_submitted"}),
    "needs_help": frozenset({"in_progress", "paused", "scheduled", "cancelled"}),
    "completion_submitted": frozenset({"quality_check", "in_progress"}),
    "quality_check": frozenset({"completed", "in_progress", "needs_help"}),
    "completed": frozenset({"invoiced", "archived"}),
    "invoiced": frozenset({"archived"}),
    "archived": frozenset(),
    "cancelled": frozenset(),
}

QUOTE_TRANSITIONS: dict[str, frozenset[str]] = {
    "draft": frozenset({"owner_review", "cancelled"}),
    "owner_review": frozenset({"draft", "ready_to_send", "cancelled"}),
    "ready_to_send": frozenset({"sent", "draft", "cancelled"}),
    "sent": frozenset({"viewed", "changes_requested", "approved", "expired", "declined"}),
    "viewed": frozenset({"changes_requested", "approved", "expired", "declined"}),
    "changes_requested": frozenset({"draft", "owner_review", "declined"}),
    "approved": frozenset({"deposit_due", "converted"}),
    "deposit_due": frozenset({"deposit_paid", "declined"}),
    "deposit_paid": frozenset({"converted"}),
    "converted": frozenset(),
    "declined": frozenset(),
    "expired": frozenset({"draft"}),
    "cancelled": frozenset(),
}

INVOICE_TRANSITIONS: dict[str, frozenset[str]] = {
    "draft": frozenset({"owner_review", "void"}),
    "owner_review": frozenset({"draft", "ready_to_send", "void"}),
    "ready_to_send": frozenset({"sent", "draft", "void"}),
    "sent": frozenset({"viewed", "part_paid", "paid", "overdue", "disputed", "credited", "void"}),
    "viewed": frozenset({"part_paid", "paid", "overdue", "disputed", "credited", "void"}),
    "part_paid": frozenset({"paid", "overdue", "disputed", "credited", "void"}),
    "overdue": frozenset({"part_paid", "paid", "disputed", "credited", "void"}),
    "disputed": frozenset({"draft", "part_paid", "paid", "credited", "void"}),
    "paid": frozenset({"credited"}),
    "credited": frozenset(),
    "void": frozenset(),
}

WORKFLOW_TRANSITIONS: dict[WorkflowName, dict[str, frozenset[str]]] = {
    WorkflowName.JOB: JOB_TRANSITIONS,
    WorkflowName.QUOTE: QUOTE_TRANSITIONS,
    WorkflowName.INVOICE: INVOICE_TRANSITIONS,
}


def allowed_next_states(workflow: WorkflowName | str, current_state: str) -> frozenset[str]:
    workflow_name = WorkflowName(workflow)
    state = str(current_state or "").strip().lower()
    transitions = WORKFLOW_TRANSITIONS[workflow_name]
    if state not in transitions:
        raise ValueError(f"Unknown {workflow_name.value} state: {current_state!r}")
    return transitions[state]


def validate_transition(workflow: WorkflowName | str, current_state: str, next_state: str) -> None:
    """Validate one explicit domain transition and fail closed on unknown states."""

    workflow_name = WorkflowName(workflow)
    source = str(current_state or "").strip().lower()
    target = str(next_state or "").strip().lower()
    allowed = allowed_next_states(workflow_name, source)
    if target not in allowed:
        expected = ", ".join(sorted(allowed)) or "no further transitions"
        raise ValueError(
            f"Invalid {workflow_name.value} transition {source!r} -> {target!r}; "
            f"allowed: {expected}"
        )
