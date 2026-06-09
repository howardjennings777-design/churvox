import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

export default function XeroConnectionPanel({ compact = false }) {
  const api = useApi();
  const [status, setStatus] = React.useState(null);
  const [showRules, setShowRules] = React.useState(false);
  const [form, setForm] = React.useState({
    invoice_sync_enabled: false,
    contact_sync_enabled: false,
    payment_sync_enabled: false,
    payroll_handoff_enabled: false,
    approval_required: true,
    invoice_sync_rule: "Only sync invoices after