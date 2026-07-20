import pytest

from churvox_office_os.contracts import (
    ActionIntent,
    ApprovalDecision,
    ApprovalRecord,
    CommandSlip,
    ExternalActionKind,
    OfficeDesk,
    RecordReference,
    RiskLevel,
    assert_action_is_approved,
)
from churvox_office_os.workflows import WorkflowName, validate_transition


def make_slip() -> CommandSlip:
    return CommandSlip(
        business_id="business_123",
        desk=OfficeDesk.MONEY,
        title="Invoice draft needs owner approval",
        priority=RiskLevel.NORMAL,
        why_it_matters="The invoice will be sent to a customer.",
        records_checked=(RecordReference(record_type="invoice", record_id="invoice_123"),),
        prepared_action="Send the reviewed invoice draft.",
        confidence="High",
        missing_information=(),
        customer_impact="Customer receives the approved invoice.",
        worker_impact="No worker impact.",
        money_impact="$180 invoice.",
        recommended_action="Approve the reviewed invoice.",
        available_decisions=(ApprovalDecision.APPROVE, ApprovalDecision.EDIT, ApprovalDecision.PARK),
        idempotency_key="invoice_123_send_v1",
        audit_reference="audit_123",
    )


def make_intent(slip: CommandSlip) -> ActionIntent:
    return ActionIntent(
        business_id=slip.business_id,
        slip_id=slip.slip_id,
        kind=ExternalActionKind.SEND_INVOICE,
        idempotency_key=slip.idempotency_key,
        payload={"invoice_id": "invoice_123"},
        target_references=(RecordReference(record_type="invoice", record_id="invoice_123"),),
    )


def test_external_action_fails_closed_without_approval():
    slip = make_slip()
    with pytest.raises(PermissionError, match="Owner approval is required"):
        assert_action_is_approved(make_intent(slip), None)


def test_matching_approval_authorises_prepared_action():
    slip = make_slip()
    approval = ApprovalRecord(
        business_id=slip.business_id,
        slip_id=slip.slip_id,
        decision=ApprovalDecision.APPROVE,
        approved_by_user_id="owner_123",
    )
    assert_action_is_approved(make_intent(slip), approval)


def test_parked_decision_does_not_authorise_execution():
    slip = make_slip()
    approval = ApprovalRecord(
        business_id=slip.business_id,
        slip_id=slip.slip_id,
        decision=ApprovalDecision.PARK,
        approved_by_user_id="owner_123",
    )
    with pytest.raises(PermissionError, match="does not authorise execution"):
        assert_action_is_approved(make_intent(slip), approval)


def test_approval_from_another_business_is_rejected():
    slip = make_slip()
    approval = ApprovalRecord(
        business_id="another_business",
        slip_id=slip.slip_id,
        decision=ApprovalDecision.APPROVE,
        approved_by_user_id="owner_999",
    )
    with pytest.raises(PermissionError, match="different business"):
        assert_action_is_approved(make_intent(slip), approval)


def test_job_workflow_allows_expected_transition():
    validate_transition(WorkflowName.JOB, "assigned", "acknowledged")


def test_job_workflow_rejects_skipping_quality_check():
    with pytest.raises(ValueError, match="Invalid job transition"):
        validate_transition(WorkflowName.JOB, "in_progress", "completed")


def test_invoice_workflow_rejects_marking_draft_paid():
    with pytest.raises(ValueError, match="Invalid invoice transition"):
        validate_transition(WorkflowName.INVOICE, "draft", "paid")
