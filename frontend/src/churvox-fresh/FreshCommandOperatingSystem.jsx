import React from "react";

export const COMMAND_OS_MARKER_20260625 = "COMMAND_OS_MARKER_20260625";

function cleanText(value) {
  return String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function lowerText(value) {
  return cleanText(value).toLowerCase();
}

function isMoneyKey(key) {
  return /price|amount|total|balance|invoice_total|quote_total|job_price|fixed_price/i.test(String(key || ""));
}

function parseMoney(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value || "").replace(/,/g, "");
  const match = text.match(/\$?\s*(-?\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : 0;
}

function moneyAmount(value, parentKey = "") {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" || typeof value === "string") return isMoneyKey(parentKey) ? parseMoney(value) : 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + moneyAmount(item, parentKey), 0);
  if (typeof value === "object") {
    return Object.entries(value).reduce((sum, [key, raw]) => sum + moneyAmount(raw, key), 0);
  }
  return 0;
}

function formatMoney(value) {
  if (!value) return "$0";
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function approvalValue(rows, label) {
  const found = rows.find((row) => lowerText(row.label) === lowerText(label));
  return found?.value || "";
}

function compactValue(value, fallback = "Not captured yet") {
  const text = cleanText(value);
  return text || fallback;
}

function itemText(item) {
  return lowerText([item?.title, item?.summary, item?.category, item?.group, item?.action, item?.type].filter(Boolean).join(" "));
}

function uniqueRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.label}:${row.value}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(cleanText(row.value));
  });
}

function currentRecordName(selected, selectedApprovalDetails, summaryOf) {
  return approvalValue(selectedApprovalDetails, "Job") || approvalValue(selectedApprovalDetails, "Customer") || summaryOf(selected);
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
}) {
  const adminDebtItems = preparedBackendRows.map((item) => {
    const text = itemText(item);
    const amount = moneyAmount(item);
    let label = "Approval waiting";
    if (/invoice|payment|money|paid|overdue/.test(text)) label = "Money waiting";
    else if (/quote/.test(text)) label = "Quote follow-up";
    else if (/worker|dispatch|blocked|unfinished|doing/.test(text)) label = "Work blocked";
    return { label, title: compactValue(item.title || item.summary || item.action, "Prepared work"), amount };
  }).slice(0, 4);

  const adminDebtTotal = preparedBackendRows.reduce((sum, item) => sum + moneyAmount(item), 0);
  const preparedAction = selectedDiagnosticOnly ? "Needs a concrete draft before approval" : readableAction(selected?.action || selected?.type);
  const selectedDetails = selected ? detailRows(selected) : [];

  const commandReasoningRows = selected ? uniqueRows([
    { label: "Churvox found", value: summaryOf(selected) },
    { label: "Churvox prepared", value: preparedAction },
    { label: "Why you approve", value: selectedHasConcreteAction ? "This can change a real record, send a prepared follow-up, or queue an accounting action." : "This stays out of Open until it has a real linked action." },
  ]) : [];

  const proofPackRows = selected ? uniqueRows([
    { label: "Customer", value: approvalValue(selectedApprovalDetails, "Customer") },
    { label: "Job", value: approvalValue(selectedApprovalDetails, "Job") || currentRecordName(selected, selectedApprovalDetails, summaryOf) },
    { label: "Address", value: approvalValue(selectedApprovalDetails, "Address") },
    { label: "Price", value: approvalValue(selectedApprovalDetails, "Price") },
    { label: "Billing", value: approvalValue(selectedApprovalDetails, "Billing") },
    { label: "Recurring", value: approvalValue(selectedApprovalDetails, "Recurring") },
    { label: "Record proof", value: selectedDetails[0]?.value },
  ]).slice(0, 7) : [];

  const jobToCashSteps = [
    { label: "Work found", state: selected ? "Active" : "Waiting" },
    { label: "Draft prepared", state: selectedHasConcreteAction ? "Ready" : "Needed" },
    { label: "Owner approval", state: selectedHasConcreteAction ? "Your call" : "Blocked" },
    { label: "Record updated", state: "After approve" },
    { label: "Invoice or follow-up", state: /invoice|payment|money/i.test(`${selected?.category || ""} ${selected?.action || ""}`) ? "In scope" : "Watched" },
  ];

  const businessMemorySignals = uniqueRows([
    { label: "Price memory", value: approvalValue(selectedApprovalDetails, "Price") || (adminDebtTotal ? `${formatMoney(adminDebtTotal)} across prepared work` : "Learns from approved prices") },
    { label: "Recurring memory", value: approvalValue(selectedApprovalDetails, "Recurring") || "Keeps repeat work visible before approval" },
    { label: "Customer memory", value: approvalValue(selectedApprovalDetails, "Customer") || "Carries customer context into prepared work" },
    { label: "Owner rule memory", value: selectedHasConcreteAction ? "Approval stays required before records change" : "Generic work stays out of Open" },
  ]);

  const commandBriefRows = [
    { label: "Waiting for approval", value: `${counts.Open || 0}` },
    { label: "Admin debt", value: formatMoney(adminDebtTotal) },
    { label: "Notes to prepare", value: `${noteRows.length}` },
    { label: "Money watched", value: `${moneyWatched}` },
    { label: "Safety", value: "Approval first" },
  ];

  const noClutterRules = [
    "Jobs stay as job records.",
    "Clients stay as client records.",
    "Quotes and invoices stay clean review pages.",
    "Unfinished admin, blockers, and follow-ups route to Command.",
  ];

  return (
    <section className="freshCommandOsWrap" data-command-os={COMMAND_OS_MARKER_20260625}>
      <section className="freshCommandOperatingSystem">
        <article className="freshCard freshCommandDebtMeter">
          <span>Admin Debt Meter</span>
          <h2>{formatMoney(adminDebtTotal)}</h2>
          <p>Prepared work waiting for a decision.</p>
          <div className="freshCommandOsRows">
            {adminDebtItems.length ? adminDebtItems.map((item) => <div key={`${item.label}-${item.title}`}><b>{item.label}</b><small>{item.title}</small><strong>{item.amount ? formatMoney(item.amount) : "Review"}</strong></div>) : <div><b>Clear</b><small>No approval debt waiting.</small><strong>$0</strong></div>}
          </div>
        </article>

        <article className="freshCard freshCommandBrief">
          <span>Today's Command Brief</span>
          <h2>{counts.Open || 0} waiting</h2>
          <p>Morning view of what needs your approval, not another job list.</p>
          <div className="freshCommandOsRows compact">
            {commandBriefRows.map((row) => <div key={row.label}><b>{row.label}</b><strong>{row.value}</strong></div>)}
          </div>
        </article>

        <article className="freshCard freshCommandMemory">
          <span>Business Memory</span>
          <h2>{selected ? categoryOf(selected) : "Learning"}</h2>
          <p>Churvox carries pricing, repeat work, customer context, and owner rules into approvals.</p>
          <div className="freshCommandOsRows compact">
            {businessMemorySignals.map((row) => <div key={row.label}><b>{row.label}</b><small>{row.value}</small></div>)}
          </div>
        </article>
      </section>

      {selected ? <section className="freshCommandSelectedIntelligence">
        <article className="freshCard freshCommandReasoningCard">
          <span>Command Reasoning Card</span>
          <h2>{currentRecordName(selected, selectedApprovalDetails, summaryOf)}</h2>
          <div className="freshCommandReasoningGrid">{commandReasoningRows.map((row) => <div key={row.label}><b>{row.label}</b><p>{row.value}</p></div>)}</div>
        </article>

        <article className="freshCard freshCommandProofPack">
          <span>Proof Pack</span>
          <h2>Evidence before approve</h2>
          <div className="freshCommandProofGrid">{proofPackRows.length ? proofPackRows.map((row) => <div key={row.label}><small>{row.label}</small><b>{row.value}</b></div>) : <p>No linked proof captured yet.</p>}</div>
        </article>

        <article className="freshCard freshCommandJobToCash">
          <span>Job-To-Cash Autopilot</span>
          <h2>Next safe step</h2>
          <div>{jobToCashSteps.map((step) => <p key={step.label}><b>{step.label}</b><small>{step.state}</small></p>)}</div>
        </article>
      </section> : null}

      <section className="freshCard freshCommandNoClutter">
        <div><span>No-Clutter Intelligence</span><h2>Normal pages stay clean. Command handles the unfinished admin.</h2></div>
        <ul>{noClutterRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
      </section>
    </section>
  );
}
