"""Churvox Office OS domain contracts.

This package is intentionally isolated from the current production routes while the
clean rebuild is developed and validated. Importing it must not register routes,
start workers or perform external actions.
"""

from .contracts import (
    ActionExecutionResult,
    ActionIntent,
    ApprovalDecision,
    ApprovalRecord,
    CommandSlip,
    ExecutionStatus,
    ExternalActionKind,
    OfficeDesk,
    RiskLevel,
    assert_action_is_approved,
)
from .workflows import WorkflowName, allowed_next_states, validate_transition

__all__ = [
    "ActionExecutionResult",
    "ActionIntent",
    "ApprovalDecision",
    "ApprovalRecord",
    "CommandSlip",
    "ExecutionStatus",
    "ExternalActionKind",
    "OfficeDesk",
    "RiskLevel",
    "WorkflowName",
    "allowed_next_states",
    "assert_action_is_approved",
    "validate_transition",
]
