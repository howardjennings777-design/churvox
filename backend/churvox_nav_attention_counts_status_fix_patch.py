from __future__ import annotations

"""Tighten trusted nav attention-count status handling.

The original trusted-count patch used substring checks for closed states. That made
"unpaid" look closed because it contains "paid", so unpaid invoices could miss the
Invoices badge. This patch keeps normal closed states closed while protecting real
attention states like unpaid, overdue, failed, blocked and owner-review.
"""


def _compact(value):
    return "".join(ch for ch in str(value or "").strip().lower() if ch.isalnum())


def _status(row):
    row = row or {}
    return _compact(
        row.get("status")
        or row.get("job_status")
        or row.get("workflow_status")
        or row.get("state")
        or row.get("priority")
        or row.get("app_status")
        or ""
    )


def _fixed_is_closed(row):
    try:
        import churvox_nav_attention_counts_patch as patch
        s = patch.status(row)
    except Exception:
        s = _status(row)

    if not s:
        return False

    # These are open attention states and must never be swallowed by broad
    # closed-state substring checks. In particular: "unpaid" contains "paid".
    attention_states = [
        "unpaid",
        "underpaid",
        "notpaid",
        "overdue",
        "unpaidinvoice",
        "paymentdue",
        "paymentissue",
        "needscheck",
        "needsapproval",
        "ownerreview",
        "waitingowner",
        "waitingownerreview",
        "blocked",
        "failed",
        "followup",
        "waitingcustomer",
    ]
    if any(word in s for word in attention_states):
        return False

    closed_states = [
        "complete",
        "completed",
        "done",
        "finished",
        "converted",
        "cancelled",
        "canceled",
        "archived",
        "declined",
        "parked",
        "closed",
        "sent",
    ]
    if any(word in s for word in closed_states):
        return True

    # Treat paid as closed only when it is actually paid, not unpaid/underpaid.
    if s == "paid" or s.endswith("fullypaid") or s.endswith("markedpaid"):
        return True

    return False


try:
    import churvox_nav_attention_counts_patch as patch
    patch.is_closed = _fixed_is_closed
except Exception:
    pass
