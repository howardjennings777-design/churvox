import React from "react";

export const COMMAND_OS_MARKER_20260625 = "COMMAND_OS_MARKER_20260625";
export const COMMAND_APPROVAL_BRAIN_MARKER_20260626 = "COMMAND_APPROVAL_BRAIN_MARKER_20260626";
export const COMMAND_APPROVAL_QUALITY_GUARD_MARKER_20260626 = "COMMAND_APPROVAL_QUALITY_GUARD_MARKER_20260626";
export const COMMAND_TAPPABLE_CARDS_MARKER_20260626 = "COMMAND_TAPPABLE_CARDS_MARKER_20260626";

function cleanText(value) {
  return String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function lowerText(value) {
  return cleanText(value).toLowerCase();
}

function isMoneyKey(key) {
  return /price|amount|total|balance|invoice_total|quote_total|job_price|fixed_price|value|cost|rate|subtotal|gst/i.test(String(key || ""));
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
  const detailsText = item?.details && typeof item.details === "object" ? Object.values(item.details).join(" ") : "";
  return lowerText([item?.title, item?.summary, item?.category, item?.group, item?.action, item?.type, item?.status, detailsText].filter(Boolean).join(" "));
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

function detailCount(item) {
  if (!item?.details || typeof item.details !== "object") return 0;
  return Object.values(item.details).filter((value) => cleanText(value)).length;
}

function classifyAdminSignal(item) {
  const text = itemText(item);
  const amount = moneyAmount(item);
  let label = "Approval waiting";
  let action = "Review prepared admin";
  let reason = "Owner approval keeps live records safe.";

  if (/completed|complete|done|finished/.test(text) && /invoice|bill|charge|cash/.test(text)) {
    label = "Ready to invoice";
    action = "Approve invoice draft";
    reason = "Completed work should move to money without being forgotten.";
  } else if (/completed|complete|done|finished/.test(text)) {
    label = "Completed work";
    action = "Prepare invoice check";
    reason = "Finished work needs invoice proof before it disappears.";
  } else if (/overdue|unpaid|payment|paid|money|invoice|balance/.test(text)) {
    label = "Money follow-up";
    action = "Approve payment follow-up";
    reason = "Churvox found money that may need chasing.";
  } else if (/quote|estimate|proposal/.test(text)) {
    label = "Quote follow-up";
    action = "Approve quote chase";
    reason = "Open quotes need a clean follow-up before they go cold.";
  } else if (/photo|proof|checklist|evidence|missing/.test(text)) {
    label = "Proof gap";
    action = "Ask for missing proof";
    reason = "Invoices are stronger when the field proof is complete.";
  } else if (/worker|dispatch|blocked|unfinished|doing|stuck|help|issue/.test(text)) {
    label = "Work blocked";
    action = "Resolve field blocker";
    reason = "Unfinished work belongs in Command until it is cleared.";
  } else if (/recurring|repeat|fortnight|weekly|monthly/.test(text)) {
    label = "Recurring risk";
    action = "Check next booking";
    reason = "Repeat work should not fall out of the schedule.";
  }

  const proof = detailCount(item);
  const confidence = Math.min(98, Math.max(42, 48 + proof * 9 + (amount ? 14 : 0) + (/job|client|customer|invoice|quote/.test(text) ? 10 : 0)));
  return {
    label,
    action,
    reason,
    amount,
    confidence,
    proof,
    title: compactValue(item?.title || item?.summary || item?.action, "Prepared work"),
  };
}

function confidenceLabel(score) {
  if (score >= 85) return "High confidence";
  if (score >= 68) return "Good confidence";
  if (score >= 50) return "Needs check";
  return "Needs more proof";
}

function selectedApprovalScore(selected, selectedApprovalDetails, selectedHasConcreteAction) {
  if (!selected) return 0;
  const hasCustomer = approvalValue(selectedApprovalDetails, "Customer");
  const hasJob = approvalValue(selectedApprovalDetails, "Job");
  const hasPrice = approvalValue(selectedApprovalDetails, "Price");
  const hasAddress = approvalValue(selectedApprovalDetails, "Address");
  const hasBilling = approvalValue(selectedApprovalDetails, "Billing");
  const hasRecurring = approvalValue(selectedApprovalDetails, "Recurring");
  const rows = [hasCustomer, hasJob, hasPrice, hasAddress, hasBilling, hasRecurring].filter(Boolean).length;
  return Math.min(99, Math.max(35, 38 + rows * 8 + detailCount(selected) * 6 + (selectedHasConcreteAction ? 18 : 0)));
}

function selectedProofGaps(selectedApprovalDetails) {
  const required = ["Customer", "Job", "Price", "Billing"];
  return required.filter((label) => !approvalValue(selectedApprovalDetails, label));
}

function nextBestSignal(signals) {
  if (!signals.length) return null;
  return [...signals].sort((a, b) => (b.amount - a.amount) || (b.confidence - a.confidence))[0];
}

function buildApprovalQualityGuard({ selected, selectedApprovalDetails, selectedHasConcreteAction, selectedDiagnosticOnly, selectedScore, selectedGaps }) {
  if (!selected) {
    return {
      tone: "waiting",
      verdict: "Waiting for selection",
      gate: "No approval open",
      nextStep: "Open an approval to run the guard.",
      summary: "The quality guard checks the selected AI-prepared work before owner approval.",
      reasons: ["No selected approval yet."],
    };
  }

  const hasCustomer = Boolean(approvalValue(selectedApprovalDetails, "Customer"));
  const hasJob = Boolean(approvalValue(selectedApprovalDetails, "Job"));
  const hasPrice = Boolean(approvalValue(selectedApprovalDetails, "Price"));
  const hasRecordProof = hasCustomer || hasJob || detailCount(selected) >= 2;
  const seriousGaps = selectedGaps.filter((gap) => ["Customer", "Job"].includes(gap));
  const minorGaps = selectedGaps.filter((gap) => !seriousGaps.includes(gap));
  const reasons = [];

  if (selectedDiagnosticOnly) reasons.push("This is diagnostic only, not a real linked action yet.");
  if (!selectedHasConcreteAction) reasons.push("No concrete live action is matched yet.");
  if (!hasRecordProof) reasons.push("The matched customer or job is not clear enough.");
  if (seriousGaps.length) reasons.push(`Missing core proof: ${seriousGaps.join(", ")}.`);
  if (minorGaps.length) reasons.push(`Needs owner check: ${minorGaps.join(", ")}.`);
  if (selectedScore < 68) reasons.push(`Proof confidence is ${selectedScore}%, so it should be checked before approval.`);
  if (!hasPrice && /invoice|quote|payment|money|price/i.test(itemText(selected))) reasons.push("Money action does not show a clear price yet.");

  if (selectedDiagnosticOnly || !selectedHasConcreteAction) {
    return {
      tone: "blocked",
      verdict: "Prepare draft first",
      gate: "Approve locked",
      nextStep: "Keep it in Command until Churvox has a real record and action prepared.",
      summary: "Weak or diagnostic AI work should not be approved as if it can safely change the business.",
      reasons: reasons.length ? reasons : ["Needs a real action before approval."],
    };
  }

  if (!hasRecordProof || seriousGaps.length || selectedScore < 58) {
    return {
      tone: "needsEdit",
      verdict: "Needs edit",
      gate: "Approval guarded",
      nextStep: "Add the missing record proof or edit the prepared details before approval.",
      summary: "Churvox has prepared something useful, but it is not clean enough for one-click approval yet.",
      reasons: reasons.length ? reasons : ["Missing approval proof."],
    };
  }

  if (minorGaps.length || selectedScore < 82) {
    return {
      tone: "check",
      verdict: "Approve with check",
      gate: "Owner check required",
      nextStep: "Review the highlighted gaps, then approve if the prepared action looks right.",
      summary: "The action is matched, but Churvox still wants you to check the missing fields before approval.",
      reasons: reasons.length ? reasons : ["Looks usable, but should be reviewed."],
    };
  }

  return {
    tone: "ready",
    verdict: "Ready to approve",
    gate: "Clean approval",
    nextStep: "Approve, or edit first if you want to change the prepared action.",
    summary: "The action is matched, explainable, and has enough proof for owner approval.",
    reasons: ["Concrete action matched.", "Record proof looks strong.", `${confidenceLabel(selectedScore)} at ${selectedScore}%.`],
  };
}

function onCardKeyDown(event, open) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    open();
  }
}

function CommandFocusSlip({ card, onClose }) {
  if (!card) return null;
  return (
    <div className="freshCommandFocusShade" role="dialog" aria-modal="true" onClick={onClose}>
      <section className={`freshCommandFocusSlip ${card.tone || ""}`} onClick={(event) => event.stopPropagation()}>
        <button className="freshCommandFocusClose" type="button" onClick={onClose} aria-label="Close Command slip">×</button>
        <span>{card.kicker}</span>
        <h2>{card.title}</h2>
        <p>{card.summary}</p>
        <div className="freshCommandReasoningGrid">
          {(card.rows || []).map((row) => <div key={`${row.label}-${row.value}`}><b>{row.label}</b><p>{row.value}</p></div>)}
        </div>
      </section>
    </div>
  );
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
  const [focusedCard, setFocusedCard] = React.useState(null);
  const adminSignals = preparedBackendRows.map(classifyAdminSignal);
  const adminDebtItems = adminSignals.slice(0, 4);
  const nextSignal = nextBestSignal(adminSignals);
  const moneyLeakSignals = adminSignals.filter((signal) => signal.amount || /invoice|money|quote|payment/i.test(`${signal.label} ${signal.action}`)).slice(0, 4);
  const adminDebtTotal = preparedBackendRows.reduce((sum, item) => sum + moneyAmount(item), 0);
  const preparedAction = selectedDiagnosticOnly ? "Needs a concrete draft before approval" : readableAction(selected?.action || selected?.type);
  const selectedDetails = selected ? detailRows(selected) : [];
  const selectedScore = selectedApprovalScore(selected, selectedApprovalDetails, selectedHasConcreteAction);
  const selectedGaps = selected ? selectedProofGaps(selectedApprovalDetails) : [];
  const ownerDecision = selectedDiagnosticOnly ? "Hold until Churvox has a real linked action" : selectedHasConcreteAction ? "Approve, edit, or decline the prepared action" : "Review only — no live record change yet";
  const qualityGuard = buildApprovalQualityGuard({ selected, selectedApprovalDetails, selectedHasConcreteAction, selectedDiagnosticOnly, selectedScore, selectedGaps });

  const commandReasoningRows = selected ? uniqueRows([
    { label: "Churvox found", value: summaryOf(selected) },
    { label: "Churvox prepared", value: preparedAction },
    { label: "Quality guard", value: `${qualityGuard.verdict} · ${qualityGuard.gate}` },
    { label: "Proof confidence", value: `${confidenceLabel(selectedScore)} · ${selectedScore}%` },
    { label: "Owner decision", value: ownerDecision },
    { label: "Why you approve", value: selectedHasConcreteAction ? "This can change a real record, send a prepared follow-up, or queue an accounting action only after your approval." : "This stays out of live work until it has a real linked action and enough proof." },
  ]) : [];

  const proofPackRows = selected ? uniqueRows([
    { label: "Customer", value: approvalValue(selectedApprovalDetails, "Customer") },
    { label: "Job", value: approvalValue(selectedApprovalDetails, "Job") || currentRecordName(selected, selectedApprovalDetails, summaryOf) },
    { label: "Address", value: approvalValue(selectedApprovalDetails, "Address") },
    { label: "Price", value: approvalValue(selectedApprovalDetails, "Price") },
    { label: "Billing", value: approvalValue(selectedApprovalDetails, "Billing") },
    { label: "Recurring", value: approvalValue(selectedApprovalDetails, "Recurring") },
    { label: "Record proof", value: selectedDetails[0]?.value },
    { label: "Proof gaps", value: selectedGaps.length ? selectedGaps.join(", ") : "No major approval gaps found" },
  ]).slice(0, 8) : [];

  const jobToCashSteps = [
    { label: "Work found", state: selected ? "Active" : "Waiting" },
    { label: "Quality guard", state: selected ? qualityGuard.verdict : "Waiting" },
    { label: "Proof checked", state: selected ? confidenceLabel(selectedScore) : "Waiting" },
    { label: "Draft prepared", state: selectedHasConcreteAction ? "Ready" : "Needed" },
    { label: "Owner approval", state: qualityGuard.gate },
    { label: "Record updated", state: "After approve" },
    { label: "Invoice or follow-up", state: /invoice|payment|money/i.test(`${selected?.category || ""} ${selected?.action || ""}`) ? "In scope" : "Watched" },
  ];

  const businessMemorySignals = uniqueRows([
    { label: "Price memory", value: approvalValue(selectedApprovalDetails, "Price") || (adminDebtTotal ? `${formatMoney(adminDebtTotal)} across prepared work` : "Learns from approved prices") },
    { label: "Recurring memory", value: approvalValue(selectedApprovalDetails, "Recurring") || "Keeps repeat work visible before approval" },
    { label: "Customer memory", value: approvalValue(selectedApprovalDetails, "Customer") || "Carries customer context into prepared work" },
    { label: "Proof memory", value: selectedGaps.length ? `Needs ${selectedGaps.join(", ")}` : "Tracks proof quality before approval" },
    { label: "Owner rule memory", value: selectedHasConcreteAction ? "Approval stays required before records change" : "Generic work stays out of Open" },
    { label: "Guard memory", value: qualityGuard.verdict },
  ]);

  const commandBriefRows = [
    { label: "Waiting for approval", value: `${counts.Open || 0}` },
    { label: "Admin debt", value: formatMoney(adminDebtTotal) },
    { label: "Money leaks", value: `${moneyLeakSignals.length}` },
    { label: "Notes to prepare", value: `${noteRows.length}` },
    { label: "Money watched", value: `${moneyWatched}` },
    { label: "Next best approval", value: nextSignal ? nextSignal.action : "Nothing urgent" },
    { label: "Quality guard", value: selected ? qualityGuard.verdict : "Open a card" },
    { label: "Safety", value: "Approval first" },
  ];

  const noClutterRules = [
    "Jobs stay as job records.",
    "Clients stay as client records.",
    "Quotes and invoices stay clean review pages.",
    "Weak AI work is guarded until the action and proof are clear.",
    "Unfinished admin, blockers, and follow-ups route to Command.",
  ];

  const adminDebtFocus = {
    kicker: "Admin Debt Meter",
    title: formatMoney(adminDebtTotal),
    summary: "Prepared work waiting for a decision, ranked by money, proof, and risk.",
    rows: adminDebtItems.length ? adminDebtItems.map((item) => ({ label: item.label, value: `${item.title} · ${item.amount ? formatMoney(item.amount) : item.action}` })) : [{ label: "Clear", value: "No approval debt waiting." }],
  };
  const briefFocus = { kicker: "Today's Command Brief", title: `${counts.Open || 0} waiting`, summary: "Money leaks, blockers, proof gaps, and the next approval to make.", rows: commandBriefRows };
  const memoryFocus = { kicker: "Business Memory", title: selected ? categoryOf(selected) : "Learning", summary: "Pricing, repeat work, customer context, proof quality, and owner rules carried into approvals.", rows: businessMemorySignals };
  const moneyLeakFocus = { kicker: "Money Leak Detector", title: moneyLeakSignals.length ? `${moneyLeakSignals.length} money checks` : "No money leaks showing", summary: "Completed work, unpaid invoices, quote follow-ups, extras, and repeat work that could cost you if missed.", rows: moneyLeakSignals.length ? moneyLeakSignals.map((signal) => ({ label: signal.label, value: `${signal.reason} · ${signal.amount ? formatMoney(signal.amount) : signal.action}` })) : [{ label: "Clear", value: "No invoice, quote, or payment leak detected in the current prepared work." }] };
  const qualityFocus = { kicker: "Approval Quality Guard", title: qualityGuard.verdict, summary: qualityGuard.summary, tone: qualityGuard.tone, rows: [{ label: "Gate", value: qualityGuard.gate }, { label: "Safe next step", value: qualityGuard.nextStep }, { label: "Guard reasons", value: qualityGuard.reasons.join(" ") }] };
  const reasoningFocus = { kicker: "Command Reasoning Card", title: selected ? currentRecordName(selected, selectedApprovalDetails, summaryOf) : "No approval open", summary: "Why Churvox prepared this and what you are approving.", rows: commandReasoningRows };
  const proofFocus = { kicker: "Proof Pack", title: "Evidence before approve", summary: "The proof Churvox found before asking for owner approval.", rows: proofPackRows.length ? proofPackRows : [{ label: "Proof", value: "No linked proof captured yet." }] };
  const jobToCashFocus = { kicker: "Job-To-Cash Autopilot", title: "Next safe step", summary: "The safe route from field work to owner approval to invoice or follow-up.", rows: jobToCashSteps.map((step) => ({ label: step.label, value: step.state })) };
  const noClutterFocus = { kicker: "No-Clutter Intelligence", title: "Command handles unfinished admin", summary: "Normal record pages stay clean while Command holds the work that needs thinking.", rows: noClutterRules.map((rule, index) => ({ label: `Rule ${index + 1}`, value: rule })) };

  return (
    <section className="freshCommandOsWrap" data-command-os={COMMAND_OS_MARKER_20260625} data-command-brain={COMMAND_APPROVAL_BRAIN_MARKER_20260626} data-approval-quality-guard={COMMAND_APPROVAL_QUALITY_GUARD_MARKER_20260626} data-tappable-cards={COMMAND_TAPPABLE_CARDS_MARKER_20260626}>
      <section className="freshCommandOperatingSystem">
        <article className="freshCard freshCommandDebtMeter freshCommandBrainCard freshCommandTapCard" role="button" tabIndex={0} onClick={() => setFocusedCard(adminDebtFocus)} onKeyDown={(event) => onCardKeyDown(event, () => setFocusedCard(adminDebtFocus))}>
          <span>Admin Debt Meter</span>
          <h2>{formatMoney(adminDebtTotal)}</h2>
          <p>Prepared work waiting for a decision, ranked by money, proof, and risk.</p>
          <div className="freshCommandOsRows">
            {adminDebtItems.length ? adminDebtItems.map((item) => <div key={`${item.label}-${item.title}`}><b>{item.label}</b><small>{item.title}</small><strong>{item.amount ? formatMoney(item.amount) : item.action}</strong></div>) : <div><b>Clear</b><small>No approval debt waiting.</small><strong>$0</strong></div>}
          </div>
        </article>

        <article className="freshCard freshCommandBrief freshCommandBrainCard freshCommandTapCard" role="button" tabIndex={0} onClick={() => setFocusedCard(briefFocus)} onKeyDown={(event) => onCardKeyDown(event, () => setFocusedCard(briefFocus))}>
          <span>Today's Command Brief</span>
          <h2>{counts.Open || 0} waiting</h2>
          <p>Morning view of money leaks, blockers, proof gaps, and the next approval to make.</p>
          <div className="freshCommandOsRows compact">
            {commandBriefRows.map((row) => <div key={row.label}><b>{row.label}</b><strong>{row.value}</strong></div>)}
          </div>
        </article>

        <article className="freshCard freshCommandMemory freshCommandBrainCard freshCommandTapCard" role="button" tabIndex={0} onClick={() => setFocusedCard(memoryFocus)} onKeyDown={(event) => onCardKeyDown(event, () => setFocusedCard(memoryFocus))}>
          <span>Business Memory</span>
          <h2>{selected ? categoryOf(selected) : "Learning"}</h2>
          <p>Churvox carries pricing, repeat work, customer context, proof quality, and owner rules into approvals.</p>
          <div className="freshCommandOsRows compact">
            {businessMemorySignals.map((row) => <div key={row.label}><b>{row.label}</b><small>{row.value}</small></div>)}
          </div>
        </article>

        <article className="freshCard freshCommandMoneyLeaks freshCommandBrainCard freshCommandTapCard" role="button" tabIndex={0} onClick={() => setFocusedCard(moneyLeakFocus)} onKeyDown={(event) => onCardKeyDown(event, () => setFocusedCard(moneyLeakFocus))}>
          <span>Money Leak Detector</span>
          <h2>{moneyLeakSignals.length ? `${moneyLeakSignals.length} money checks` : "No money leaks showing"}</h2>
          <p>Watches completed work, unpaid invoices, quote follow-ups, extras, and repeat work that could cost you if missed.</p>
          <div className="freshCommandOsRows compact">
            {moneyLeakSignals.length ? moneyLeakSignals.map((signal) => <div key={`${signal.label}-${signal.title}`}><b>{signal.label}</b><small>{signal.reason}</small><strong>{signal.amount ? formatMoney(signal.amount) : signal.action}</strong></div>) : <div><b>Clear</b><small>No invoice, quote, or payment leak detected in the current prepared work.</small><strong>Watched</strong></div>}
          </div>
        </article>
      </section>

      {selected ? <section className="freshCommandSelectedIntelligence">
        <article className={`freshCard freshCommandQualityGuard freshCommandTapCard ${qualityGuard.tone}`} role="button" tabIndex={0} onClick={() => setFocusedCard(qualityFocus)} onKeyDown={(event) => onCardKeyDown(event, () => setFocusedCard(qualityFocus))}>
          <span>Approval Quality Guard</span>
          <h2>{qualityGuard.verdict}</h2>
          <p>{qualityGuard.summary}</p>
          <div className="freshCommandReasoningGrid">
            <div><b>Gate</b><p>{qualityGuard.gate}</p></div>
            <div><b>Safe next step</b><p>{qualityGuard.nextStep}</p></div>
            <div><b>Guard reasons</b><p>{qualityGuard.reasons.join(" ")}</p></div>
          </div>
        </article>

        <article className="freshCard freshCommandReasoningCard freshCommandTapCard" role="button" tabIndex={0} onClick={() => setFocusedCard(reasoningFocus)} onKeyDown={(event) => onCardKeyDown(event, () => setFocusedCard(reasoningFocus))}>
          <span>Command Reasoning Card</span>
          <h2>{currentRecordName(selected, selectedApprovalDetails, summaryOf)}</h2>
          <div className="freshCommandReasoningGrid">{commandReasoningRows.map((row) => <div key={row.label}><b>{row.label}</b><p>{row.value}</p></div>)}</div>
        </article>

        <article className="freshCard freshCommandProofPack freshCommandTapCard" role="button" tabIndex={0} onClick={() => setFocusedCard(proofFocus)} onKeyDown={(event) => onCardKeyDown(event, () => setFocusedCard(proofFocus))}>
          <span>Proof Pack</span>
          <h2>Evidence before approve</h2>
          <div className="freshCommandProofGrid">{proofPackRows.length ? proofPackRows.map((row) => <div key={row.label}><small>{row.label}</small><b>{row.value}</b></div>) : <p>No linked proof captured yet.</p>}</div>
        </article>

        <article className="freshCard freshCommandJobToCash freshCommandTapCard" role="button" tabIndex={0} onClick={() => setFocusedCard(jobToCashFocus)} onKeyDown={(event) => onCardKeyDown(event, () => setFocusedCard(jobToCashFocus))}>
          <span>Job-To-Cash Autopilot</span>
          <h2>Next safe step</h2>
          <div>{jobToCashSteps.map((step) => <p key={step.label}><b>{step.label}</b><small>{step.state}</small></p>)}</div>
        </article>
      </section> : null}

      <section className="freshCard freshCommandNoClutter freshCommandTapCard" role="button" tabIndex={0} onClick={() => setFocusedCard(noClutterFocus)} onKeyDown={(event) => onCardKeyDown(event, () => setFocusedCard(noClutterFocus))}>
        <div><span>No-Clutter Intelligence</span><h2>Normal pages stay clean. Command handles the unfinished admin.</h2></div>
        <ul>{noClutterRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
      </section>
      <CommandFocusSlip card={focusedCard} onClose={() => setFocusedCard(null)} />
    </section>
  );
}
