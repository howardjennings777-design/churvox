import React from "react";
import { createPortal } from "react-dom";
import API_BASE from "../lib/apiBase";

export const COMMAND_OS_MARKER_20260625 = "COMMAND_OS_MARKER_20260625";
export const COMMAND_APPROVAL_BRAIN_MARKER_20260626 = "COMMAND_APPROVAL_BRAIN_MARKER_20260626";
export const COMMAND_APPROVAL_QUALITY_GUARD_MARKER_20260626 = "COMMAND_APPROVAL_QUALITY_GUARD_MARKER_20260626";
export const COMMAND_TAPPABLE_CARDS_MARKER_20260626 = "COMMAND_TAPPABLE_CARDS_MARKER_20260626";
export const COMMAND_FIX_DESK_MARKER_20260626 = "COMMAND_FIX_DESK_MARKER_20260626";
export const COMMAND_FIX_DESK_API_ACTIONS_MARKER_20260626 = "COMMAND_FIX_DESK_API_ACTIONS_MARKER_20260626";
export const COMMAND_FIX_DESK_FULL_CONTROLS_MARKER_20260626 = "COMMAND_FIX_DESK_FULL_CONTROLS_MARKER_20260626";
export const COMMAND_FIX_DESK_EMPTY_STATE_MARKER_20260626 = "COMMAND_FIX_DESK_EMPTY_STATE_MARKER_20260626";
export const COMMAND_FIX_DESK_PRIORITY_WORDING_MARKER_20260626 = "COMMAND_FIX_DESK_PRIORITY_WORDING_MARKER_20260626";
export const COMMAND_FIX_DESK_EXPLAINER_MARKER_20260626 = "COMMAND_FIX_DESK_EXPLAINER_MARKER_20260626";
export const COMMAND_FIX_DESK_DECISION_TRAIL_MARKER_20260626 = "COMMAND_FIX_DESK_DECISION_TRAIL_MARKER_20260626";
export const COMMAND_FIX_DESK_RISK_BADGE_MARKER_20260626 = "COMMAND_FIX_DESK_RISK_BADGE_MARKER_20260626";
export const COMMAND_FIX_DESK_APPROVE_GUARD_MARKER_20260626 = "COMMAND_FIX_DESK_APPROVE_GUARD_MARKER_20260626";
export const COMMAND_FIX_DESK_APPROVE_OUTCOME_MARKER_20260626 = "COMMAND_FIX_DESK_APPROVE_OUTCOME_MARKER_20260626";
export const COMMAND_FIX_DESK_SMART_EDIT_MARKER_20260626 = "COMMAND_FIX_DESK_SMART_EDIT_MARKER_20260626";
export const COMMAND_FIX_DESK_SMART_IGNORE_MARKER_20260626 = "COMMAND_FIX_DESK_SMART_IGNORE_MARKER_20260626";
export const COMMAND_FIX_DESK_FORM_PREVIEW_MARKER_20260626 = "COMMAND_FIX_DESK_FORM_PREVIEW_MARKER_20260626";

const LEGACY_INBOX_KEYS = ["churvox:fresh-command-inbox:v1", "churvox:review-inbox:v1"];
const PRIORITY_ORDER = { "Fix first": 0, "Check today": 1, "Needs proof": 2, "Setup check": 3, "Watching": 4 };
const FIX_TABS = [
  { key: "All", label: "All" },
  { key: "Money", label: "Money waiting" },
  { key: "Jobs", label: "Job blockers" },
  { key: "Quotes", label: "Quotes to chase" },
  { key: "Proof", label: "Proof missing" },
  { key: "Setup", label: "Setup gaps" },
];

const commandExplainerStyle = {
  display: "grid",
  gap: 6,
  maxWidth: 1040,
  padding: "12px 14px",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 18,
  background: "rgba(255,255,255,.09)",
};

const commandExplainerTitleStyle = {
  color: "#fff",
  fontSize: 12,
  fontWeight: 1000,
  letterSpacing: ".08em",
  textTransform: "uppercase",
};

const commandExplainerTextStyle = {
  color: "#fed7aa",
  fontSize: 13,
  fontWeight: 900,
  lineHeight: 1.42,
};

const riskBadgeStyle = {
  display: "grid",
  gap: 6,
  margin: "10px 0 12px",
  padding: "12px 13px",
  borderRadius: 17,
};

const riskBadgeLabelStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 1000,
  letterSpacing: ".08em",
  textTransform: "uppercase",
};

const riskBadgeTextStyle = {
  fontSize: 13,
  fontWeight: 900,
  lineHeight: 1.35,
};

const approveOutcomeStyle = {
  display: "grid",
  gap: 7,
  margin: "0 0 12px",
  padding: "12px 13px",
  border: "1px solid rgba(15,23,42,.08)",
  borderRadius: 17,
  background: "#f8fafc",
};

const approveOutcomeLabelStyle = {
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#111827",
  color: "#fff",
  fontSize: 10,
  fontWeight: 1000,
  letterSpacing: ".08em",
  textTransform: "uppercase",
};

const approveOutcomeTitleStyle = {
  color: "#111827",
  fontSize: 14,
  fontWeight: 1000,
  lineHeight: 1.15,
};

const approveOutcomeTextStyle = {
  color: "#475569",
  fontSize: 13,
  fontWeight: 850,
  lineHeight: 1.4,
};

const formPreviewButtonStyle = {
  width: "auto",
  minHeight: 40,
  margin: "0 0 12px",
  padding: "0 13px",
  border: "1px solid rgba(249,115,22,.28)",
  borderRadius: 13,
  background: "#ffedd5",
  color: "#7c2d12",
  fontSize: 13,
  fontWeight: 1000,
  cursor: "pointer",
};

const formPreviewShadeStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "grid",
  placeItems: "center",
  padding: 16,
  background: "rgba(15,23,42,.66)",
};

const formPreviewModalStyle = {
  width: "min(620px, 94vw)",
  maxHeight: "78vh",
  overflow: "auto",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,.24)",
  background: "#fffaf0",
  boxShadow: "0 26px 70px rgba(15,23,42,.42)",
};

const formPreviewHeaderStyle = {
  display: "grid",
  gap: 6,
  padding: 15,
  background: "#111827",
  color: "#fff",
};

const formPreviewHeaderRowStyle = {
  display: "flex",
  gap: 10,
  alignItems: "start",
  justifyContent: "space-between",
};

const formPreviewCloseStyle = {
  minWidth: 34,
  minHeight: 34,
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 999,
  background: "rgba(255,255,255,.10)",
  color: "#fff",
  fontSize: 18,
  fontWeight: 900,
  cursor: "pointer",
};

const formPreviewBodyStyle = {
  display: "grid",
  gap: 9,
  padding: 12,
};

const formPreviewGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 7,
};

const formPreviewFieldStyle = {
  display: "grid",
  gridTemplateColumns: "130px minmax(0, 1fr)",
  gap: 9,
  alignItems: "start",
  padding: "8px 10px",
  border: "1px solid rgba(15,23,42,.08)",
  borderRadius: 12,
  background: "#fff",
};

const formPreviewLabelStyle = {
  paddingTop: 7,
  color: "#9a3412",
  fontSize: 10,
  fontWeight: 1000,
  letterSpacing: ".08em",
  textTransform: "uppercase",
};

const formPreviewValueStyle = {
  minHeight: 34,
  padding: "8px 10px",
  border: "1px solid rgba(15,23,42,.10)",
  borderRadius: 10,
  background: "#f8fafc",
  color: "#111827",
  fontSize: 13,
  fontWeight: 850,
  lineHeight: 1.35,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const approveGuardHintStyle = {
  margin: "10px 0 0",
  padding: "10px 12px",
  borderRadius: 14,
  background: "#fef3c7",
  color: "#92400e",
  fontSize: 12,
  fontWeight: 900,
  lineHeight: 1.35,
};

const editActionHintStyle = {
  margin: "8px 0 0",
  padding: "9px 11px",
  borderRadius: 14,
  background: "#f8fafc",
  color: "#475569",
  fontSize: 12,
  fontWeight: 850,
  lineHeight: 1.35,
};

const ignoreActionHintStyle = {
  margin: "8px 0 0",
  padding: "9px 11px",
  border: "1px solid rgba(15,23,42,.08)",
  borderRadius: 14,
  background: "#fffaf0",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 850,
  lineHeight: 1.35,
};

const decisionTrailStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
};

const decisionTrailCardStyle = {
  flex: "1 1 145px",
  minWidth: 0,
  padding: 11,
  border: "1px solid rgba(15,23,42,.08)",
  borderRadius: 16,
  background: "#fffaf0",
};

const decisionTrailStepStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "5px 8px",
  borderRadius: 999,
  background: "#111827",
  color: "#fff",
  fontSize: 10,
  fontWeight: 1000,
  letterSpacing: ".07em",
  textTransform: "uppercase",
};

const decisionTrailTitleStyle = {
  display: "block",
  marginTop: 8,
  color: "#111827",
  fontSize: 13,
  fontWeight: 1000,
  lineHeight: 1.15,
};

const decisionTrailTextStyle = {
  marginTop: 5,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 850,
  lineHeight: 1.35,
};

function cleanText(value) {
  return String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function lowerText(value) {
  return cleanText(value).toLowerCase();
}

function formatMoney(value) {
  const number = Number(value || 0);
  if (!number) return "$0";
  return `$${number.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function parseMoney(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value || "").replace(/,/g, "");
  const match = text.match(/\$?\s*(-?\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : 0;
}

function moneyAmount(value, parentKey = "") {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" || typeof value === "string") return /price|amount|total|balance|invoice|quote|job_price|fixed_price|value|cost|rate|subtotal|gst/i.test(parentKey) ? parseMoney(value) : 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + moneyAmount(item, parentKey), 0);
  if (typeof value === "object") return Object.entries(value).reduce((sum, [key, raw]) => sum + moneyAmount(raw, key), 0);
  return 0;
}

function itemText(item) {
  const detailsText = item?.details && typeof item.details === "object" ? Object.values(item.details).join(" ") : "";
  return lowerText([item?.title, item?.summary, item?.category, item?.group, item?.action, item?.type, item?.status, detailsText].filter(Boolean).join(" "));
}

function approvalValue(rows, label) {
  const found = rows.find((row) => lowerText(row.label) === lowerText(label));
  return cleanText(found?.value || "");
}

function compactValue(value, fallback = "Not captured yet") {
  return cleanText(value) || fallback;
}

function detailCount(item) {
  if (!item?.details || typeof item.details !== "object") return 0;
  return Object.values(item.details).filter((value) => cleanText(value)).length;
}

function confidenceLabel(score) {
  if (score >= 85) return "Ready";
  if (score >= 68) return "Check";
  if (score >= 50) return "Needs edit";
  return "Needs proof";
}

function selectedProofGaps(selectedApprovalDetails) {
  return ["Customer", "Job", "Price", "Billing"].filter((label) => !approvalValue(selectedApprovalDetails, label));
}

function scoreItem(item, selectedApprovalDetails = [], selectedHasConcreteAction = false) {
  const proofRows = detailCount(item);
  const linkedRows = ["Customer", "Job", "Price", "Address", "Billing", "Recurring"].filter((label) => approvalValue(selectedApprovalDetails, label)).length;
  const amount = moneyAmount(item);
  return Math.min(99, Math.max(35, 42 + proofRows * 7 + linkedRows * 6 + (amount ? 12 : 0) + (selectedHasConcreteAction ? 14 : 0)));
}

function idOf(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return idOf(value.$oid || value.oid || value.id || value._id, fallback);
  return fallback;
}

function sourceText(item) {
  const details = item?.details && typeof item.details === "object" ? Object.entries(item.details).map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`).join(". ") : "";
  const payload = item?.payload && typeof item.payload === "object" ? Object.entries(item.payload).map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`).join(". ") : "";
  return [item?.title, item?.summary, item?.info, item?.found, item?.prepared, item?.why, item?.owner, details, payload].filter(Boolean).join(". ");
}

async function commandApiRequest(method, endpoint, body) {
  const headers = { "Content-Type": "application/json" };
  try {
    const token = window.localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {}
  const response = await fetch(`${API_BASE}/api${endpoint}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok || data?.success === false) throw new Error(data?.error || data?.detail || data?.message || `Command action failed (${response.status})`);
  return data;
}

function notifyCommandUpdated() {
  try {
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "command-fix-desk" } }));
  } catch {}
}

function clearLegacyNotes() {
  try {
    LEGACY_INBOX_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {}
}

function classifyFix(item, overrides = {}) {
  const text = itemText(item);
  const amount = moneyAmount(item);
  let bucket = "Admin";
  let categoryLabel = "Admin follow-up";
  let severity = "Check today";
  let problem = "Admin item needs review";
  let why = "This needs a decision so it does not sit unfinished.";
  let prepared = "Churvox prepared the item for owner review.";
  let nextStep = "Review the details, then approve, edit, or ignore.";

  if (/completed|complete|done|finished/.test(text) && /invoice|bill|charge|cash|payment|money/.test(text)) {
    bucket = "Money";
    categoryLabel = "Money waiting";
    severity = "Fix first";
    problem = "Finished work needs an invoice";
    why = "This is the kind of admin that can turn into lost money if it sits.";
    prepared = "Churvox prepared the invoice check.";
    nextStep = "Check proof and price, then approve or edit the invoice draft.";
  } else if (/completed|complete|done|finished/.test(text)) {
    bucket = "Money";
    categoryLabel = "Money waiting";
    severity = "Fix first";
    problem = "Completed job needs money step";
    why = "The job looks done, but the billing step still needs a decision.";
    prepared = "Churvox prepared the job-to-invoice check.";
    nextStep = "Confirm proof and billing, then approve the next money step.";
  } else if (/overdue|unpaid|payment|paid|invoice|balance/.test(text)) {
    bucket = "Money";
    categoryLabel = "Money waiting";
    severity = "Fix first";
    problem = "Money needs chasing";
    why = "Unpaid or overdue money should not quietly sit in the system.";
    prepared = "Churvox prepared a payment follow-up check.";
    nextStep = "Review the customer and amount, then approve the follow-up.";
  } else if (/quote|estimate|proposal/.test(text)) {
    bucket = "Quotes";
    categoryLabel = "Quote to chase";
    severity = "Check today";
    problem = "Quote needs a follow-up";
    why = "Open quotes go cold when nobody follows them up.";
    prepared = "Churvox prepared a quote follow-up.";
    nextStep = "Check the customer and quote, then approve the follow-up.";
  } else if (/photo|proof|checklist|evidence|missing/.test(text)) {
    bucket = "Proof";
    categoryLabel = "Proof missing";
    severity = "Needs proof";
    problem = "Missing proof before approval";
    why = "Weak proof makes invoicing and customer questions harder.";
    prepared = "Churvox found the missing proof area.";
    nextStep = "Ask the worker for proof or add the missing detail.";
  } else if (/worker|dispatch|blocked|unfinished|doing|stuck|help|issue/.test(text)) {
    bucket = "Jobs";
    categoryLabel = "Job blocker";
    severity = "Check today";
    problem = "Job is blocked or unfinished";
    why = "Unfinished work needs clearing before it becomes tomorrow's mess.";
    prepared = "Churvox prepared the blocker for review.";
    nextStep = "Resolve the blocker, contact the worker, or move the job.";
  } else if (/client|customer|phone|email|address|setup|missing field/.test(text)) {
    bucket = "Setup";
    categoryLabel = "Setup gap";
    severity = "Setup check";
    problem = "Record setup needs fixing";
    why = "Missing details create admin friction later.";
    prepared = "Churvox found setup details to complete.";
    nextStep = "Add the missing detail or ignore if it is not needed.";
  }

  return {
    id: overrides.id || item?.id || `${problem}-${item?.title || item?.summary || Math.random()}`,
    bucket: overrides.bucket || bucket,
    categoryLabel: overrides.categoryLabel || categoryLabel,
    severity: overrides.severity || severity,
    problem: overrides.problem || problem,
    title: overrides.title || compactValue(item?.title || item?.summary || item?.action, problem),
    why: overrides.why || why,
    prepared: overrides.prepared || prepared,
    nextStep: overrides.nextStep || nextStep,
    amount,
    source: item,
  };
}

function buildProofRows(fix, selectedApprovalDetails, selectedDetails) {
  const rows = [
    { label: "Customer", value: approvalValue(selectedApprovalDetails, "Customer") },
    { label: "Job", value: approvalValue(selectedApprovalDetails, "Job") || fix.title },
    { label: "Address", value: approvalValue(selectedApprovalDetails, "Address") },
    { label: "Price", value: approvalValue(selectedApprovalDetails, "Price") || (fix.amount ? formatMoney(fix.amount) : "") },
    { label: "Billing", value: approvalValue(selectedApprovalDetails, "Billing") },
    { label: "Recurring", value: approvalValue(selectedApprovalDetails, "Recurring") },
    { label: "Record proof", value: selectedDetails[0]?.value },
  ];
  return rows.filter((row) => cleanText(row.value));
}

function buildDecisionTrail(fix, proofRows, selectedDiagnosticOnly) {
  return [
    { step: "Found", title: "Issue spotted", text: fix?.problem || "Churvox found work needing a decision." },
    { step: "Prepared", title: selectedDiagnosticOnly ? "Draft still needed" : "Action prepared", text: fix?.prepared || "Churvox prepared the next safe step." },
    { step: "Proof checked", title: proofRows?.length ? `${proofRows.length} proof links` : "Proof is weak", text: proofRows?.length ? "Linked context is ready for owner review." : "Check the record before approving." },
    { step: "Owner", title: "Waiting on you", text: "Approve, mark needs edit, or ignore from Command." },
  ];
}

function buildRiskBadge(fix, proofRows, selectedDiagnosticOnly, selectedHasConcreteAction, score) {
  if (selectedDiagnosticOnly || !selectedHasConcreteAction) {
    return {
      label: "Draft needed",
      text: "This is not safe to approve yet because Churvox still needs a concrete action or draft.",
      background: "#fee2e2",
      border: "rgba(220,38,38,.18)",
      color: "#991b1b",
      labelBackground: "#991b1b",
      labelColor: "#fff",
    };
  }
  if (fix?.severity === "Needs proof" || !proofRows?.length || score < 50) {
    return {
      label: "Needs proof",
      text: "Get stronger proof or linked context before approving this one.",
      background: "#fef3c7",
      border: "rgba(217,119,6,.22)",
      color: "#92400e",
      labelBackground: "#92400e",
      labelColor: "#fff",
    };
  }
  if (fix?.severity === "Fix first" || score < 85) {
    return {
      label: "Check first",
      text: "This looks actionable, but check the customer, proof, and amount before approving.",
      background: "#ffedd5",
      border: "rgba(249,115,22,.24)",
      color: "#9a3412",
      labelBackground: "#f97316",
      labelColor: "#111827",
    };
  }
  return {
    label: "Safe to approve",
    text: "Proof and action look strong. Owner approval is still required before anything changes.",
    background: "#dcfce7",
    border: "rgba(22,163,74,.20)",
    color: "#166534",
    labelBackground: "#166534",
    labelColor: "#fff",
  };
}

function buildApproveOutcome(fix, approveBlocked, activeRiskBadge) {
  if (!fix) return null;
  if (fix?.source?.sourceMode === "note") {
    return {
      title: "This will prepare the note",
      text: "Churvox will turn the saved note into an approval-ready item. Nothing is sent or changed until the owner approves a prepared action.",
    };
  }
  if (approveBlocked) {
    return {
      title: "Approval is paused",
      text: activeRiskBadge?.label === "Draft needed" ? "Approving is blocked because there is no concrete draft or action yet. Use Needs edit, open the record, or run Check for work." : "Approving is blocked because proof is weak. Add proof, open the record, or mark it as Needs edit.",
    };
  }
  if (fix.bucket === "Money") {
    return {
      title: "This will approve the prepared money step",
      text: "Churvox will use the prepared action for this record after your approval. Owner approval stays the control point before invoices, follow-ups, or money-related changes move forward.",
    };
  }
  if (fix.bucket === "Quotes") {
    return {
      title: "This will approve the quote follow-up",
      text: "Churvox will move the prepared quote action forward only after you approve it. You can still edit the owner note before approving.",
    };
  }
  if (fix.bucket === "Jobs") {
    return {
      title: "This will clear the job blocker",
      text: "Churvox will apply the prepared job/admin action for the selected record after your approval, then refresh Command so the queue stays clean.",
    };
  }
  return {
    title: "This will approve the prepared fix",
    text: "Churvox will move this prepared action forward after owner approval and keep the decision trail visible in Command.",
  };
}

function buildEditAction(fix, activeRiskBadge) {
  if (!fix) return { button: "Needs edit", hint: "Send this item back instead of approving it.", outcome: "Saved as needs edit." };
  if (fix?.source?.sourceMode === "note") return { button: "Edit saved note", hint: "Keep this note as something to refine before it becomes an approval item.", outcome: "Saved note marked for edit." };
  if (activeRiskBadge?.label === "Draft needed") return { button: "Send back for draft", hint: "Use this when Churvox needs a clearer prepared action before approval.", outcome: "Sent back for a clearer draft." };
  if (activeRiskBadge?.label === "Needs proof" || fix.severity === "Needs proof") return { button: "Ask for proof", hint: "Use this when the worker, job, customer, amount, or proof needs to be stronger first.", outcome: "Marked as needing proof." };
  if (fix.bucket === "Money") return { button: "Edit money step", hint: "Use this if the amount, customer, invoice, or follow-up needs checking before approval.", outcome: "Money step marked for edit." };
  if (fix.bucket === "Quotes") return { button: "Edit follow-up", hint: "Use this if the quote follow-up needs different wording or timing.", outcome: "Quote follow-up marked for edit." };
  if (fix.bucket === "Jobs") return { button: "Send back to job", hint: "Use this if the job blocker needs worker input or record cleanup before approval.", outcome: "Job item marked for edit." };
  return { button: "Send back for edit", hint: "Use this when the prepared fix is close, but not ready for approval.", outcome: "Saved as needs edit." };
}

function buildIgnoreAction(fix) {
  if (!fix) return { button: "Park for now", hint: "This only removes the item from your Command attention list for now. It does not delete records.", outcome: "Parked for now. No records were deleted." };
  if (fix?.source?.sourceMode === "note") return { button: "Park note", hint: "This parks the saved note locally. It does not delete any customer, job, invoice, quote, or team record.", outcome: "Note parked. Nothing was changed." };
  if (fix.bucket === "Money") return { button: "Park money step", hint: "This hides the prepared money action from Command for now. It does not delete the job, customer, invoice, or quote.", outcome: "Money step parked. No records were deleted." };
  if (fix.bucket === "Quotes") return { button: "Park follow-up", hint: "This parks the quote follow-up for now. The quote and customer records stay untouched.", outcome: "Quote follow-up parked. No records were deleted." };
  if (fix.bucket === "Jobs") return { button: "Park job blocker", hint: "This parks the blocker in Command. The job record itself is not deleted or completed.", outcome: "Job blocker parked. No records were deleted." };
  if (fix.bucket === "Proof") return { button: "Skip proof request", hint: "This skips the proof request for now. It does not delete photos, jobs, or worker records.", outcome: "Proof request parked. No records were deleted." };
  if (fix.bucket === "Setup") return { button: "Park setup gap", hint: "This parks the setup reminder for now. It does not remove the underlying record.", outcome: "Setup gap parked. No records were deleted." };
  return { button: "Park for now", hint: "This only removes the item from your Command attention list for now. It does not delete records.", outcome: "Parked for now. No records were deleted." };
}

function buildPreparedFormRows({ fix, proofRows, approveOutcome, activeRiskBadge, noteValue, editAction, ignoreAction }) {
  if (!fix) return [];
  const proofSummary = proofRows?.length ? proofRows.map((row) => `${row.label}: ${row.value}`).join("\n") : "No linked proof captured yet.";
  return [
    { label: "Type", value: fix.categoryLabel || fix.bucket || "Command fix" },
    { label: "Priority", value: fix.severity || "Check today" },
    { label: "Safety", value: activeRiskBadge?.label || "Check first" },
    { label: "Record", value: fix.title || "Not captured yet" },
    { label: "Prepared action", value: fix.prepared || "Prepared for review." },
    { label: "Why", value: fix.why || "This needs owner review." },
    { label: "Proof checked", value: proofSummary },
    { label: "Owner note", value: noteValue || "No owner note added yet." },
    { label: "If approved", value: approveOutcome?.title ? `${approveOutcome.title}\n${approveOutcome.text}` : "Owner approval will move the prepared action forward." },
    { label: "Not ready?", value: `${editAction?.button || "Send back for edit"}: ${editAction?.hint || "Use if not ready."}\n${ignoreAction?.button || "Park for now"}: ${ignoreAction?.hint || "Does not delete records."}` },
  ];
}

export default function FreshCommandOperatingSystem({
  selected,
  selectedApprovalDetails = [],
  selectedHasConcreteAction,
  selectedDiagnosticOnly,
  preparedBackendRows = [],
  noteRows = [],
  moneyWatched = 0,
  counts = {},
  detailRows = () => [],
  summaryOf = () => "Ready for your decision.",
  readableAction = (value) => cleanText(value || "Ready to approve"),
  categoryOf = () => "Review",
  ownerNote,
  onOwnerNoteChange,
  onApproveFix,
  onSaveFix,
  onIgnoreFix,
  onCheckForWork,
  onPrepareNotes,
  onRefresh,
  onOpenRecord,
  externalBusy = "",
}) {
  const [tab, setTab] = React.useState("All");
  const [activeId, setActiveId] = React.useState("");
  const [localOutcome, setLocalOutcome] = React.useState({});
  const [actionBusy, setActionBusy] = React.useState("");
  const [toolBusy, setToolBusy] = React.useState("");
  const [localNote, setLocalNote] = React.useState("");
  const [showPreparedForm, setShowPreparedForm] = React.useState(false);
  const canUsePortal = typeof document !== "undefined" && document.body;
  const selectedDetails = selected ? detailRows(selected) : [];
  const selectedGaps = selected ? selectedProofGaps(selectedApprovalDetails) : [];
  const selectedScore = scoreItem(selected, selectedApprovalDetails, selectedHasConcreteAction);
  const selectedFix = selected ? classifyFix(selected, {
    id: `selected-${selected?.id || selected?.title || "approval"}`,
    problem: selectedDiagnosticOnly ? "Prepared item needs a real action" : undefined,
    title: summaryOf(selected),
    prepared: selectedDiagnosticOnly ? "Churvox found something, but it needs a concrete draft before approval." : readableAction(selected?.action || selected?.type),
    nextStep: selectedHasConcreteAction ? "Approve, edit, or ignore from the owner controls." : "Prepare or match a real action before approval.",
  }) : null;

  const fixItems = React.useMemo(() => {
    const rows = [];
    if (selectedFix) rows.push(selectedFix);
    preparedBackendRows.forEach((item, index) => rows.push(classifyFix(item, { id: item?.id || `backend-${index}` })));
    noteRows.forEach((item, index) => rows.push(classifyFix(item, { id: item?.id || `note-${index}`, bucket: "Setup", categoryLabel: "Saved note", severity: "Setup check", problem: "Saved note needs preparing" })));
    const seen = new Set();
    return rows
      .filter((item) => {
        const key = `${item.bucket}-${item.problem}-${item.title}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (PRIORITY_ORDER[a.severity] ?? 9) - (PRIORITY_ORDER[b.severity] ?? 9) || (b.amount - a.amount));
  }, [selectedFix, preparedBackendRows, noteRows]);

  React.useEffect(() => {
    if (!fixItems.length) return;
    if (!activeId || !fixItems.some((item) => item.id === activeId)) setActiveId(fixItems[0].id);
  }, [activeId, fixItems]);

  React.useEffect(() => {
    setShowPreparedForm(false);
  }, [activeId]);

  const visibleItems = tab === "All" ? fixItems : fixItems.filter((item) => item.bucket === tab);
  const activeFix = fixItems.find((item) => item.id === activeId) || visibleItems[0] || fixItems[0] || null;
  const activeProofRows = activeFix ? buildProofRows(activeFix, selectedApprovalDetails, selectedDetails) : [];
  const decisionTrail = activeFix ? buildDecisionTrail(activeFix, activeProofRows, selectedDiagnosticOnly) : [];
  const activeRiskBadge = activeFix ? buildRiskBadge(activeFix, activeProofRows, selectedDiagnosticOnly, selectedHasConcreteAction, selectedScore) : null;
  const approveBlocked = Boolean(activeFix?.source?.sourceMode !== "note" && (activeRiskBadge?.label === "Draft needed" || activeRiskBadge?.label === "Needs proof"));
  const approveOutcome = buildApproveOutcome(activeFix, approveBlocked, activeRiskBadge);
  const editAction = buildEditAction(activeFix, activeRiskBadge);
  const ignoreAction = buildIgnoreAction(activeFix);
  const approveBlockHint = activeRiskBadge?.label === "Draft needed" ? "Approval is blocked until Churvox has a concrete draft or action ready." : activeRiskBadge?.label === "Needs proof" ? "Approval is blocked until stronger proof or linked context is added." : "";
  const approveButtonText = actionBusy === "approve" || externalBusy === "approve" ? "Approving..." : activeFix?.source?.sourceMode === "note" ? "Prepare note" : approveBlocked && activeRiskBadge?.label === "Draft needed" ? "Draft needed first" : approveBlocked ? "Proof needed first" : "Approve fix";
  const editButtonText = actionBusy === "save" || externalBusy === "save" ? "Saving..." : editAction.button;
  const ignoreButtonText = actionBusy === "ignore" || externalBusy === "ignore" ? "Parking..." : ignoreAction.button;
  const adminDebtTotal = preparedBackendRows.reduce((sum, item) => sum + moneyAmount(item), 0);
  const moneyItems = fixItems.filter((item) => item.bucket === "Money");
  const highItems = fixItems.filter((item) => item.severity === "Fix first");
  const missingProofText = selectedGaps.length ? selectedGaps.join(", ") : "No major proof gaps on the selected item.";
  const activeOutcome = activeFix ? localOutcome[activeFix.id] : "";
  const noteValue = onOwnerNoteChange ? String(ownerNote || "") : localNote;
  const preparedFormRows = buildPreparedFormRows({ fix: activeFix, proofRows: activeProofRows, approveOutcome, activeRiskBadge, noteValue, editAction, ignoreAction });
  const busy = Boolean(actionBusy || toolBusy || externalBusy);
  const hasAnyFixes = fixItems.length > 0;

  React.useEffect(() => {
    if (onOwnerNoteChange) return;
    setLocalNote(activeFix?.source?.owner_note || activeFix?.source?.owner || "");
  }, [activeFix?.id, onOwnerNoteChange]);

  function updateNote(value) {
    if (onOwnerNoteChange) onOwnerNoteChange(value);
    else setLocalNote(value);
  }

  async function runFixAction(kind) {
    if (!activeFix?.source) return;
    if (kind === "approve" && approveBlocked) return;
    const source = activeFix.source;
    const note = noteValue || `${kind} from Command Fix Desk.`;
    setActionBusy(kind);
    try {
      if (kind === "approve" && onApproveFix) {
        await onApproveFix({ fix: activeFix, note });
        setLocalOutcome((current) => ({ ...current, [activeFix.id]: source.sourceMode === "note" ? "Prepared note for approval." : "Approved. Churvox handled it." }));
        return;
      }
      if (kind === "save" && onSaveFix) {
        await onSaveFix({ fix: activeFix, note });
        setLocalOutcome((current) => ({ ...current, [activeFix.id]: editAction.outcome || "Saved as needs edit." }));
        return;
      }
      if (kind === "ignore" && onIgnoreFix) {
        await onIgnoreFix({ fix: activeFix, note });
        setLocalOutcome((current) => ({ ...current, [activeFix.id]: ignoreAction.outcome || "Parked for now. No records were deleted." }));
        return;
      }

      if (source.sourceMode === "note") {
        if (kind !== "approve") {
          setLocalOutcome((current) => ({ ...current, [activeFix.id]: kind === "save" ? editAction.outcome || "Note marked for edit" : ignoreAction.outcome || "Note parked. Nothing was changed." }));
          return;
        }
        await commandApiRequest("POST", "/tell-churvox/prepare", { text: sourceText(source) || activeFix.title });
        setLocalOutcome((current) => ({ ...current, [activeFix.id]: "Prepared note for approval" }));
        notifyCommandUpdated();
        return;
      }

      if (source.sourceMode !== "backend") {
        setLocalOutcome((current) => ({ ...current, [activeFix.id]: "This fix is view-only" }));
        return;
      }

      const id = idOf(source.id || source._id);
      if (!id) throw new Error("This Command item has no approval id yet.");

      if (kind === "approve") {
        if (!source.preparedForApproval) throw new Error("This item needs a concrete draft before approval.");
        await commandApiRequest("POST", `/ai-review-items/${encodeURIComponent(id)}/approve`, { note });
        setLocalOutcome((current) => ({ ...current, [activeFix.id]: "Approved. Churvox handled it." }));
      } else if (kind === "save") {
        await commandApiRequest("PATCH", `/ai-review-items/${encodeURIComponent(id)}`, { note });
        setLocalOutcome((current) => ({ ...current, [activeFix.id]: editAction.outcome || "Saved as needs edit." }));
      } else if (kind === "ignore") {
        await commandApiRequest("POST", `/ai-review-items/${encodeURIComponent(id)}/ignore`, { note });
        setLocalOutcome((current) => ({ ...current, [activeFix.id]: ignoreAction.outcome || "Parked for now. No records were deleted." }));
      }
      notifyCommandUpdated();
    } catch (err) {
      setLocalOutcome((current) => ({ ...current, [activeFix.id]: err?.message || "Command action failed." }));
    } finally {
      setActionBusy("");
    }
  }

  async function runTool(kind) {
    setToolBusy(kind);
    try {
      if (kind === "scan") {
        if (onCheckForWork) await onCheckForWork();
        else {
          const text = "Prepare completed admin work for owner approval from real Churvox records. Return only concrete approval-ready items with customer, job, proof, price, billing, and prepared action. Owner approval required.";
          await commandApiRequest("POST", "/tell-churvox/prepare", { text });
          notifyCommandUpdated();
        }
        setLocalOutcome((current) => ({ ...current, toolbar: "Checked for work. Ready items will appear in the Fix Desk." }));
      } else if (kind === "refresh") {
        if (onRefresh) await onRefresh();
        else notifyCommandUpdated();
        setLocalOutcome((current) => ({ ...current, toolbar: "Command refreshed." }));
      } else if (kind === "prepare") {
        if (onPrepareNotes) await onPrepareNotes();
        else {
          let prepared = 0;
          for (const item of noteRows.slice(0, 20)) {
            await commandApiRequest("POST", "/tell-churvox/prepare", { text: sourceText(item) || compactValue(item?.title || item?.summary, "Saved note") });
            prepared += 1;
          }
          if (prepared) clearLegacyNotes();
          notifyCommandUpdated();
        }
        setLocalOutcome((current) => ({ ...current, toolbar: noteRows.length ? "Prepared saved notes." : "No saved notes to prepare." }));
      } else if (kind === "open") {
        if (onOpenRecord) onOpenRecord({ fix: activeFix });
        else setLocalOutcome((current) => ({ ...current, toolbar: "Linked record opening is not wired here yet." }));
      }
    } catch (err) {
      setLocalOutcome((current) => ({ ...current, toolbar: err?.message || "Command tool failed." }));
    } finally {
      setToolBusy("");
    }
  }

  return (
    <section className="freshCommandOsWrap freshCommandFixDesk" data-command-os={COMMAND_OS_MARKER_20260625} data-command-brain={COMMAND_APPROVAL_BRAIN_MARKER_20260626} data-approval-quality-guard={COMMAND_APPROVAL_QUALITY_GUARD_MARKER_20260626} data-tappable-cards={COMMAND_TAPPABLE_CARDS_MARKER_20260626} data-command-fix-desk={COMMAND_FIX_DESK_MARKER_20260626} data-command-fix-actions={COMMAND_FIX_DESK_API_ACTIONS_MARKER_20260626} data-command-full-controls={COMMAND_FIX_DESK_FULL_CONTROLS_MARKER_20260626} data-command-empty-state={COMMAND_FIX_DESK_EMPTY_STATE_MARKER_20260626} data-command-priority-wording={COMMAND_FIX_DESK_PRIORITY_WORDING_MARKER_20260626} data-command-explainer={COMMAND_FIX_DESK_EXPLAINER_MARKER_20260626} data-command-decision-trail={COMMAND_FIX_DESK_DECISION_TRAIL_MARKER_20260626} data-command-risk-badge={COMMAND_FIX_DESK_RISK_BADGE_MARKER_20260626} data-command-approve-guard={COMMAND_FIX_DESK_APPROVE_GUARD_MARKER_20260626} data-command-approve-outcome={COMMAND_FIX_DESK_APPROVE_OUTCOME_MARKER_20260626} data-command-smart-edit={COMMAND_FIX_DESK_SMART_EDIT_MARKER_20260626} data-command-smart-ignore={COMMAND_FIX_DESK_SMART_IGNORE_MARKER_20260626} data-command-form-preview={COMMAND_FIX_DESK_FORM_PREVIEW_MARKER_20260626}>
      <header className="freshCommandFixHeader">
        <span>Command Fix Desk</span>
        <h2>{hasAnyFixes ? `${fixItems.length} things need attention` : "All clear right now"}</h2>
        <p>{hasAnyFixes ? "Pick one issue, see why it matters, check the proof, and fix it on this page." : "No urgent fixes are waiting. You can still scan for new admin work, prepare saved notes, or refresh the queue before you move on."}</p>
        <aside style={commandExplainerStyle}>
          <b style={commandExplainerTitleStyle}>Decision-only page</b>
          <span style={commandExplainerTextStyle}>Command only shows work that needs a decision. Jobs, clients, quotes, invoices, and team records stay on their own pages until Churvox finds something you need to approve, fix, or chase.</span>
        </aside>
        <div className="freshCommandFixStats">
          <div><b>{highItems.length}</b><small>Fix first</small></div>
          <div><b>{moneyItems.length}</b><small>Money waiting</small></div>
          <div><b>{formatMoney(adminDebtTotal)}</b><small>Admin debt</small></div>
          <div><b>{counts.Open || 0}</b><small>Waiting approval</small></div>
        </div>
        <div className="freshCommandDeskToolbar">
          <button type="button" disabled={busy} onClick={() => runTool("scan")}>{toolBusy === "scan" ? "Checking..." : "Check for work"}</button>
          <button type="button" disabled={busy || !noteRows.length} onClick={() => runTool("prepare")}>{toolBusy === "prepare" ? "Preparing..." : `Prepare notes${noteRows.length ? ` (${noteRows.length})` : ""}`}</button>
          <button type="button" disabled={busy || !activeFix || activeFix?.source?.sourceMode === "note"} onClick={() => runTool("open")}>Open linked record</button>
          <button type="button" disabled={busy} onClick={() => runTool("refresh")}>{toolBusy === "refresh" ? "Refreshing..." : "Refresh"}</button>
        </div>
        {localOutcome.toolbar ? <p className="freshCommandToolOutcome">{localOutcome.toolbar}</p> : null}
      </header>

      <nav className="freshCommandFixTabs" aria-label="Command fix filters">
        {FIX_TABS.map((item) => <button key={item.key} type="button" className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>{item.label}</button>)}
      </nav>

      {!hasAnyFixes ? <section className="freshCommandEmptyCommand">
        <div>
          <span>Nothing waiting</span>
          <h3>Command has no fixes queued.</h3>
          <p>This is the good version of boring: no prepared admin action needs your approval right now.</p>
        </div>
        <div className="freshCommandEmptySteps">
          <section><b>1</b><span>Check for work</span><p>Ask Churvox to scan completed jobs, invoices, quotes, proof gaps, and setup issues.</p></section>
          <section><b>2</b><span>Prepare notes</span><p>Turn saved owner notes into approval-ready actions when there are notes waiting.</p></section>
          <section><b>3</b><span>Keep records clean</span><p>Jobs, clients, quotes, invoices, and team stay on their own pages unless something needs a decision.</p></section>
        </div>
      </section> : <section className="freshCommandFixGrid">
        <aside className="freshCommandFixQueue">
          <div className="freshCommandPanelTitle"><span>Fix list</span><b>{visibleItems.length || 0}</b></div>
          {visibleItems.length ? visibleItems.map((item) => (
            <button key={item.id} type="button" className={`freshCommandFixItem ${activeFix?.id === item.id ? "active" : ""}`} onClick={() => setActiveId(item.id)}>
              <em>{item.severity}</em>
              <b>{item.problem}</b>
              <small>{item.title}</small>
              {item.amount ? <strong>{formatMoney(item.amount)}</strong> : <strong>{item.categoryLabel || item.bucket}</strong>}
            </button>
          )) : <div className="freshCommandEmptyFix"><b>No fixes in {FIX_TABS.find((item) => item.key === tab)?.label || tab}</b><small>Try All or check the record pages.</small></div>}
        </aside>

        <main className="freshCommandFixDetail">
          {activeFix ? <>
            <div className="freshCommandPanelTitle"><span>{activeFix.categoryLabel || "Selected fix"}</span><b>{activeFix.severity}</b></div>
            <h3>{activeFix.problem}</h3>
            <p>{activeFix.title}</p>
            {activeRiskBadge ? <div style={{ ...riskBadgeStyle, background: activeRiskBadge.background, border: `1px solid ${activeRiskBadge.border}` }}><strong style={{ ...riskBadgeLabelStyle, background: activeRiskBadge.labelBackground, color: activeRiskBadge.labelColor }}>{activeRiskBadge.label}</strong><span style={{ ...riskBadgeTextStyle, color: activeRiskBadge.color }}>{activeRiskBadge.text}</span></div> : null}
            {approveOutcome ? <section style={approveOutcomeStyle}><small style={approveOutcomeLabelStyle}>What happens if I approve?</small><b style={approveOutcomeTitleStyle}>{approveOutcome.title}</b><p style={approveOutcomeTextStyle}>{approveOutcome.text}</p></section> : null}
            <button type="button" style={formPreviewButtonStyle} onClick={() => setShowPreparedForm(true)}>Open prepared form</button>
            <div className="freshCommandFixSections">
              <section><small>Why it matters</small><b>{activeFix.why}</b></section>
              <section><small>Churvox prepared</small><b>{activeFix.prepared}</b></section>
              <section><small>Safe next step</small><b>{activeFix.nextStep}</b></section>
              <section><small>Approval quality</small><b>{confidenceLabel(selectedScore)} · {selectedScore}%</b></section>
            </div>
            <div style={decisionTrailStyle} aria-label="Decision trail">
              {decisionTrail.map((item) => <section key={item.step} style={decisionTrailCardStyle}><small style={decisionTrailStepStyle}>{item.step}</small><b style={decisionTrailTitleStyle}>{item.title}</b><p style={decisionTrailTextStyle}>{item.text}</p></section>)}
            </div>
            <label className="freshCommandOwnerNote"><span>Owner note / edit</span><textarea value={noteValue} onChange={(event) => updateNote(event.target.value)} placeholder="Add a note before approving, marking needs edit, or ignoring" /></label>
            <div className="freshCommandFixActions">
              <button type="button" disabled={busy || approveBlocked} onClick={() => runFixAction("approve")}>{approveButtonText}</button>
              <button type="button" disabled={busy} onClick={() => runFixAction("save")}>{editButtonText}</button>
              <button type="button" disabled={busy} onClick={() => runFixAction("ignore")}>{ignoreButtonText}</button>
            </div>
            {editAction?.hint ? <p style={editActionHintStyle}>{editAction.hint}</p> : null}
            {ignoreAction?.hint ? <p style={ignoreActionHintStyle}>{ignoreAction.hint}</p> : null}
            {approveBlocked ? <p style={approveGuardHintStyle}>{approveBlockHint}</p> : null}
            {activeOutcome ? <p className="freshCommandOutcome">{activeOutcome}</p> : null}
          </> : <div className="freshCommandEmptyFix"><b>Nothing selected</b><small>Choose a fix from the left list.</small></div>}
        </main>

        <aside className="freshCommandFixProof">
          <div className="freshCommandPanelTitle"><span>Proof + context</span><b>{activeProofRows.length}</b></div>
          <div className="freshCommandProofRows">
            {activeProofRows.length ? activeProofRows.map((row) => <section key={`${row.label}-${row.value}`}><small>{row.label}</small><b>{row.value}</b></section>) : <section><small>Proof</small><b>No linked proof captured yet.</b></section>}
            <section><small>Missing fields</small><b>{missingProofText}</b></section>
            <section><small>Guard rule</small><b>{selectedDiagnosticOnly ? "Prepare a concrete draft before approval." : selectedHasConcreteAction ? "Owner approval required before records change." : "Review only until a real action is matched."}</b></section>
          </div>
        </aside>
      </section>}

      <details className="freshCommandBusinessHealth">
        <summary>Business Health / view-only intelligence</summary>
        <div>
          <section><small>Money watched</small><b>{moneyWatched}</b></section>
          <section><small>Business memory</small><b>{selected ? categoryOf(selected) : "Learning from approved work"}</b></section>
          <section><small>No-clutter rule</small><b>Jobs, clients, quotes, invoices, and team stay as clean record pages. Command only holds work needing a decision.</b></section>
        </div>
      </details>

      {showPreparedForm && activeFix && canUsePortal ? createPortal(
        <div style={formPreviewShadeStyle} role="presentation" onClick={() => setShowPreparedForm(false)}>
          <section style={formPreviewModalStyle} role="dialog" aria-modal="true" aria-label="Prepared approval form" onClick={(event) => event.stopPropagation()}>
            <header style={formPreviewHeaderStyle}>
              <div style={formPreviewHeaderRowStyle}>
                <div>
                  <small style={{ ...approveOutcomeLabelStyle, background: "#f97316", color: "#111827" }}>Prepared approval form</small>
                  <h3 style={{ margin: "8px 0 3px", fontSize: 22, lineHeight: 1.05, letterSpacing: "-.035em" }}>{activeFix.categoryLabel || activeFix.problem}</h3>
                  <p style={{ margin: 0, color: "#fed7aa", fontSize: 12, fontWeight: 900, lineHeight: 1.35 }}>Preview only. Nothing changes here. Check the filled fields, then close and decide.</p>
                </div>
                <button type="button" style={formPreviewCloseStyle} aria-label="Close prepared approval form" onClick={() => setShowPreparedForm(false)}>×</button>
              </div>
            </header>
            <div style={formPreviewBodyStyle}>
              <div style={formPreviewGridStyle}>
                {preparedFormRows.map((row) => <section key={row.label} style={formPreviewFieldStyle}><small style={formPreviewLabelStyle}>{row.label}</small><b style={formPreviewValueStyle}>{row.value}</b></section>)}
              </div>
              <button type="button" style={{ ...formPreviewButtonStyle, width: "100%", margin: 0 }} onClick={() => setShowPreparedForm(false)}>Close form and decide</button>
            </div>
          </section>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
