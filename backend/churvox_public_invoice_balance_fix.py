from __future__ import annotations

import importlib
from typing import Any

PAID_STATUSES = {"paid", "settled", "complete", "completed"}


def _number(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _has(value: Any) -> bool:
    return value is not None and str(value).strip() != ""


def install(module) -> None:
    document_module = None
    for name in (
        "churvox_public_documents_paid_launch_guard",
        "backend.churvox_public_documents_paid_launch_guard",
    ):
        try:
            document_module = importlib.import_module(name)
            break
        except Exception:
            continue
    if document_module is None or getattr(document_module, "__churvox_invoice_balance_fixed__", False):
        return

    original = getattr(document_module, "_invoice_public", None)
    if not callable(original):
        return

    def fixed_invoice_public(record: dict[str, Any]) -> dict[str, Any]:
        public = original(record)
        total = max(0.0, _number(public.get("total")))
        amount_paid = max(0.0, _number(public.get("amount_paid")))
        status = str(public.get("status") or "").strip().lower()

        if status in PAID_STATUSES or record.get("paid_at"):
            amount_due = 0.0
            if amount_paid <= 0 and total > 0:
                amount_paid = total
        elif _has(record.get("amount_due")):
            amount_due = max(0.0, _number(record.get("amount_due")))
        elif _has(record.get("balance_due")):
            amount_due = max(0.0, _number(record.get("balance_due")))
        else:
            amount_due = max(0.0, total - amount_paid)

        public["amount_paid"] = amount_paid
        public["amount_due"] = amount_due
        if amount_due <= 0:
            public["payment_link"] = ""
        return public

    document_module._invoice_public = fixed_invoice_public
    document_module.__churvox_invoice_balance_fixed__ = True
