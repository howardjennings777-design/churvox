from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StringEnum(str, Enum):
    """JSON-friendly enum base used by Office OS contracts."""


class OfficeDesk(StringEnum):
    OFFICE_MANAGER = "office_manager"
    RECEPTION = "reception"
    SCHEDULING = "scheduling"
    JOB_CONTROL = "job_control"
    QUALITY = "quality"
    ADMIN = "admin"
    MONEY = "money"
    ACCOUNTING = "accounting"
    PAYROLL = "payroll"
    GUARD = "guard"


class RiskLevel(StringEnum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class ApprovalDecision(StringEnum):
    APPROVE = "approve"
    EDIT = "edit"
    ASK = "ask"
    PARK = "park"
    REJECT = "reject"


class ExecutionStatus(StringEnum):
    PREPARED = "prepared"
    WAITING_FOR_APPROVAL = "waiting_for_approval"
    APPROVED = "approved"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


class ExternalActionKind(StringEnum):
    SEND_EMAIL = "send_email"
    SEND_SMS = "send_sms"
    SEND_QUOTE = "send_quote"
    SEND_INVOICE = "send_invoice"
    CHARGE_PAYMENT_METHOD = "charge_payment_method"
    REQUEST_DEPOSIT = "request_deposit"
    SYNC_ACCOUNTING = "sync_accounting"
    EXPORT_ACCOUNTING = "export_accounting"
    CHANGE_CUSTOMER_COMMITMENT = "change_customer_commitment"
    CHANGE_FINANCIAL_RECORD = "change_financial_record"
    DELETE_RECORD = "delete_record"
    INVITE_TEAM_MEMBER = "invite_team_member"
    NOTIFY_WORKER = "notify_worker"
    RECORD_ONLY = "record_only"


OWNER_APPROVAL_REQUIRED_ACTIONS = frozenset(
    {
        ExternalActionKind.SEND_EMAIL,
        ExternalActionKind.SEND_SMS,
        ExternalActionKind.SEND_QUOTE,
        ExternalActionKind.SEND_INVOICE,
        ExternalActionKind.CHARGE_PAYMENT_METHOD,
        ExternalActionKind.REQUEST_DEPOSIT,
        ExternalActionKind.SYNC_ACCOUNTING,
        ExternalActionKind.EXPORT_ACCOUNTING,
        ExternalActionKind.CHANGE_CUSTOMER_COMMITMENT,
        ExternalActionKind.CHANGE_FINANCIAL_RECORD,
        ExternalActionKind.DELETE_RECORD,
        ExternalActionKind.INVITE_TEAM_MEMBER,
        ExternalActionKind.NOTIFY_WORKER,
    }
)


class OfficeModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, use_enum_values=False)


class RecordReference(OfficeModel):
    record_type: str = Field(min_length=1, max_length=80)
    record_id: str = Field(min_length=1, max_length=180)
    version: str | None = Field(default=None, max_length=120)
    label: str | None = Field(default=None, max_length=240)


class CommandSlip(OfficeModel):
    slip_id: str = Field(default_factory=lambda: f"slip_{uuid4().hex}")
    business_id: str = Field(min_length=1, max_length=180)
    desk: OfficeDesk
    title: str = Field(min_length=3, max_length=240)
    priority: RiskLevel = RiskLevel.NORMAL
    why_it_matters: str = Field(min_length=3, max_length=2000)
    records_checked: tuple[RecordReference, ...] = Field(min_length=1)
    prepared_action: str = Field(min_length=3, max_length=4000)
    confidence: str = Field(min_length=1, max_length=1000)
    missing_information: tuple[str, ...] = ()
    customer_impact: str = Field(min_length=1, max_length=2000)
    worker_impact: str = Field(min_length=1, max_length=2000)
    money_impact: str = Field(min_length=1, max_length=2000)
    recommended_action: str = Field(min_length=1, max_length=2000)
    available_decisions: tuple[ApprovalDecision, ...] = Field(min_length=1)
    idempotency_key: str = Field(min_length=8, max_length=240)
    audit_reference: str = Field(min_length=3, max_length=240)
    due_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode="after")
    def validate_decisions(self) -> "CommandSlip":
        if ApprovalDecision.APPROVE not in self.available_decisions:
            raise ValueError("Command slips must include an explicit approve decision")
        if len(set(self.available_decisions)) != len(self.available_decisions):
            raise ValueError("Command slip decisions must be unique")
        return self


class ApprovalRecord(OfficeModel):
    approval_id: str = Field(default_factory=lambda: f"approval_{uuid4().hex}")
    business_id: str = Field(min_length=1, max_length=180)
    slip_id: str = Field(min_length=1, max_length=180)
    decision: ApprovalDecision
    approved_by_user_id: str = Field(min_length=1, max_length=180)
    approved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    edited_payload: dict[str, Any] | None = None
    note: str | None = Field(default=None, max_length=4000)


class ActionIntent(OfficeModel):
    action_id: str = Field(default_factory=lambda: f"action_{uuid4().hex}")
    business_id: str = Field(min_length=1, max_length=180)
    slip_id: str = Field(min_length=1, max_length=180)
    kind: ExternalActionKind
    idempotency_key: str = Field(min_length=8, max_length=240)
    payload: dict[str, Any]
    target_references: tuple[RecordReference, ...] = Field(min_length=1)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def requires_owner_approval(self) -> bool:
        return self.kind in OWNER_APPROVAL_REQUIRED_ACTIONS


class ActionExecutionResult(OfficeModel):
    execution_id: str = Field(default_factory=lambda: f"execution_{uuid4().hex}")
    business_id: str = Field(min_length=1, max_length=180)
    action_id: str = Field(min_length=1, max_length=180)
    idempotency_key: str = Field(min_length=8, max_length=240)
    status: ExecutionStatus
    provider_reference: str | None = Field(default=None, max_length=500)
    safe_message: str = Field(min_length=1, max_length=2000)
    error_code: str | None = Field(default=None, max_length=160)
    retryable: bool = False
    attempted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode="after")
    def validate_failure_shape(self) -> "ActionExecutionResult":
        if self.status == ExecutionStatus.FAILED and not self.error_code:
            raise ValueError("Failed executions require an error_code")
        if self.status == ExecutionStatus.SUCCEEDED and self.retryable:
            raise ValueError("Successful executions cannot be marked retryable")
        return self


def assert_action_is_approved(intent: ActionIntent, approval: ApprovalRecord | None) -> None:
    """Fail closed before any action that requires owner authority.

    This function intentionally performs no action. It is a contract guard for the
    future execution service.
    """

    if not intent.requires_owner_approval:
        return
    if approval is None:
        raise PermissionError("Owner approval is required before this action can run")
    if approval.business_id != intent.business_id:
        raise PermissionError("Approval belongs to a different business")
    if approval.slip_id != intent.slip_id:
        raise PermissionError("Approval does not match the prepared Command slip")
    if approval.decision not in {ApprovalDecision.APPROVE, ApprovalDecision.EDIT}:
        raise PermissionError(f"Decision '{approval.decision.value}' does not authorise execution")
