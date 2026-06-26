import React from "react";

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
export const COMMAND_CLEAN_FILLED_FORM_MARKER_20260627 = "COMMAND_CLEAN_FILLED_FORM_MARKER_20260627";

function cleanText(value) {
  return String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function lowerText(value) {
  return cleanText(value).toLowerCase();
}

function normalizedKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function idOf(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return idOf(value.$oid || value.oid || value.id || value._id, fallback);
  return fallback;
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" && value.trim().startsWith("$")) return value.trim();
  const number = Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(number) || !number) return cleanText(value);
  return `$${number.toFixed(2)}`;
}

function readableValue(label, value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && /price|amount|total|balance/i.test(label)) return formatMoney(value);
  if (Array.isArray(value)) return value.map((entry) => readableValue(label, entry)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const text = Object.entries(value)
      .map(([key, raw]) => `${cleanText(key)}: ${readableValue(key, raw)}`)
      .filter(Boolean)
      .join(" - ");
    return cleanText(text);
  }
  const text = cleanText(value);
  if (/price|amount|total|balance/i.test(label)) return formatMoney(text) || text;
  return text;
}

function sourcesFor(item) {
  return [
    item?.payload,
    item?.details,
    item?.preview,
    item?.form,
    item?.raw,
    typeof item?.draft === "object" ? item.draft : null,
    item,
  ].filter((source) => source && typeof source === "object");
}

function findFieldValue(source, keys, depth = 0) {
  if (!source || typeof source !== "object" || depth > 5) return "";
  if (Array.isArray(source)) {
    for (const entry of source) {
      const found = findFieldValue(entry, keys, depth + 1);
      if (found) return found;
    }
    return "";
  }

  const wanted = new Set(keys.map(normalizedKey));
  for (const [key, value] of Object.entries(source)) {
    if (wanted.has(normalizedKey(key))) {
      const text = readableValue(key, value);
      if (text) return text;
    }
  }

  for (const value of Object.values(source)) {
    if (value && typeof value === "object") {
      const found = findFieldValue(value, keys, depth + 1);
      if (found) return found;
    }
  }
  return "";
}

function approvalValue(rows, label) {
  const found = rows.find((row) => lowerText(row.label) === lowerText(label));
  return cleanText(found?.value || "");
}

function firstValue(item, rows, label, keys) {
  const fromApproval = approvalValue(rows, label);
  if (fromApproval) return fromApproval;
  for (const source of sourcesFor(item)) {
    const found = findFieldValue(source, keys);
    if (found) return found;
  }
  return "";
}

function titleFor(item, summaryOf) {
  return cleanText(summaryOf(item)) || cleanText(item?.title || item?.summary || item?.action || item?.type) || "Prepared form";
}

function actionLabel(item, readableAction) {
  const text = cleanText(readableAction(item?.action || item?.type || item?.category || item?.group));
  if (!text || /ready to approve/i.test(text)) return "Review and approve";
  return text;
}

function buildFilledFormRows({ item, selectedApprovalDetails, readableAction, summaryOf }) {
  if (!item) return [];
  const rows = [
    { label: "Customer", value: firstValue(item, selectedApprovalDetails, "Customer", ["customer_name", "client_name", "customer", "client", "contact_name", "name"]) },
    { label: "Job", value: firstValue(item, selectedApprovalDetails, "Job", ["job_title", "job_name", "title", "service", "service_type", "work_type", "job_type"]) || titleFor(item, summaryOf) },
    { label: "Address", value: firstValue(item, selectedApprovalDetails, "Address", ["service_address", "job_address", "site_address", "address", "customer_address", "client_address"]) },
    { label: "Price", value: firstValue(item, selectedApprovalDetails, "Price", ["price", "fixed_price", "amount", "total", "job_price", "quoted_price", "invoice_total", "quote_total", "balance"]) },
    { label: "Billing", value: firstValue(item, selectedApprovalDetails, "Billing", ["billing_type", "pricing_type", "invoice_type", "charge_type", "rate_type"]) },
    { label: "Date", value: firstValue(item, selectedApprovalDetails, "Date", ["scheduled_date", "date", "due_date", "start_date", "job_date", "next_visit_date"]) },
    { label: "Worker", value: firstValue(item, selectedApprovalDetails, "Worker", ["worker_name", "assigned_worker_name", "assigned_to_name", "assigned_worker", "team_member", "worker"]) },
    { label: "Recurring", value: firstValue(item, selectedApprovalDetails, "Recurring", ["recurring", "is_recurring", "isRecurring", "repeat", "repeats", "recurring_frequency", "frequency", "repeat_frequency", "recurrence"]) },
    { label: "Action", value: actionLabel(item, readableAction) },
  ];

  return rows
    .map((row) => ({ ...row, value: cleanText(row.value) }))
    .filter((row) => row.value && !/not captured yet|undefined|null/i.test(row.value));
}

function cleanButtonText(kind, item) {
  if (kind === "approve") return item?.sourceMode === "note" ? "Prepare form" : "Approve form";
  if (kind === "save") return "Save edit";
  return "Park for now";
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
  summaryOf = () => "Ready for your decision.",
  readableAction = (value) => cleanText(value || "Review and approve"),
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
  const [localNote, setLocalNote] = React.useState("");
  const [busyAction, setBusyAction] = React.useState("");
  const [message, setMessage] = React.useState("");
  const noteValue = onOwnerNoteChange ? String(ownerNote || "") : localNote;
  const filledRows = buildFilledFormRows({ item: selected, selectedApprovalDetails, readableAction, summaryOf });
  const waitingCount = counts.Open || preparedBackendRows.length || 0;
  const canApprove = Boolean(selected && selectedHasConcreteAction && !selectedDiagnosticOnly);
  const title = selected ? titleFor(selected, summaryOf) : "No form selected";
  const typeLabel = selected ? cleanText(categoryOf(selected) || selected?.category || selected?.group || "Prepared form") : "Command";
  const busy = Boolean(busyAction || externalBusy);

  React.useEffect(() => {
    if (onOwnerNoteChange) return;
    setLocalNote(selected?.owner_note || selected?.owner || "");
  }, [selected, onOwnerNoteChange]);

  function updateNote(value) {
    if (onOwnerNoteChange) onOwnerNoteChange(value);
    else setLocalNote(value);
  }

  async function runAction(kind) {
    if (!selected || busy) return;
    setBusyAction(kind);
    setMessage("");
    try {
      if (kind === "approve") {
        if (!canApprove && selected?.sourceMode !== "note") {
          setMessage("This form needs an edit before it can be approved.");
          return;
        }
        await onApproveFix?.({ item: selected, note: noteValue });
        setMessage(selected?.sourceMode === "note" ? "Prepared." : "Approved.");
      } else if (kind === "save") {
        await onSaveFix?.({ item: selected, note: noteValue });
        setMessage("Saved.");
      } else if (kind === "ignore") {
        await onIgnoreFix?.({ item: selected, note: noteValue });
        setMessage("Parked for now.");
      }
    } catch (err) {
      setMessage(err?.message || "Command action failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function runTool(kind) {
    if (busy) return;
    setBusyAction(kind);
    setMessage("");
    try {
      if (kind === "scan") {
        await onCheckForWork?.();
        setMessage("Checked for work.");
      } else if (kind === "prepare") {
        await onPrepareNotes?.();
        setMessage("Prepared notes.");
      } else if (kind === "refresh") {
        await onRefresh?.();
        setMessage("Refreshed.");
      } else if (kind === "open") {
        onOpenRecord?.({ item: selected });
      }
    } catch (err) {
      setMessage(err?.message || "Command tool failed.");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <section
      className="freshCommandOsWrap freshCommandCleanDesk"
      data-command-os={COMMAND_OS_MARKER_20260625}
      data-command-brain={COMMAND_APPROVAL_BRAIN_MARKER_20260626}
      data-approval-quality-guard={COMMAND_APPROVAL_QUALITY_GUARD_MARKER_20260626}
      data-tappable-cards={COMMAND_TAPPABLE_CARDS_MARKER_20260626}
      data-command-fix-desk={COMMAND_FIX_DESK_MARKER_20260626}
      data-command-fix-actions={COMMAND_FIX_DESK_API_ACTIONS_MARKER_20260626}
      data-command-full-controls={COMMAND_FIX_DESK_FULL_CONTROLS_MARKER_20260626}
      data-command-empty-state={COMMAND_FIX_DESK_EMPTY_STATE_MARKER_20260626}
      data-command-priority-wording={COMMAND_FIX_DESK_PRIORITY_WORDING_MARKER_20260626}
      data-command-explainer={COMMAND_FIX_DESK_EXPLAINER_MARKER_20260626}
      data-command-decision-trail={COMMAND_FIX_DESK_DECISION_TRAIL_MARKER_20260626}
      data-command-risk-badge={COMMAND_FIX_DESK_RISK_BADGE_MARKER_20260626}
      data-command-approve-guard={COMMAND_FIX_DESK_APPROVE_GUARD_MARKER_20260626}
      data-command-approve-outcome={COMMAND_FIX_DESK_APPROVE_OUTCOME_MARKER_20260626}
      data-command-smart-edit={COMMAND_FIX_DESK_SMART_EDIT_MARKER_20260626}
      data-command-smart-ignore={COMMAND_FIX_DESK_SMART_IGNORE_MARKER_20260626}
      data-command-form-preview={COMMAND_FIX_DESK_FORM_PREVIEW_MARKER_20260626}
      data-command-clean-form={COMMAND_CLEAN_FILLED_FORM_MARKER_20260627}
    >
      <header className="freshCommandCleanHeader">
        <span>Command Approval Desk</span>
        <h2>Churvox filled the form.</h2>
        <p>Check it, edit the note if needed, then approve or park it.</p>
        <div className="freshCommandCleanStats">
          <div><b>{waitingCount}</b><small>waiting</small></div>
          <div><b>{moneyWatched || 0}</b><small>money</small></div>
          <div><b>{noteRows.length || 0}</b><small>notes</small></div>
        </div>
        <div className="freshCommandCleanToolbar">
          <button type="button" disabled={busy} onClick={() => runTool("scan")}>{busyAction === "scan" ? "Checking..." : "Check for work"}</button>
          <button type="button" disabled={busy || !noteRows.length} onClick={() => runTool("prepare")}>{busyAction === "prepare" ? "Preparing..." : "Prepare notes"}</button>
          <button type="button" disabled={busy} onClick={() => runTool("refresh")}>{busyAction === "refresh" ? "Refreshing..." : "Refresh"}</button>
        </div>
      </header>

      {selected ? (
        <section className="freshCommandCleanGrid">
          <main className="freshCommandFilledFormCard" aria-label="Filled approval form">
            <div className="freshCommandCleanPanelTitle"><span>{typeLabel}</span><b>{canApprove ? "Ready" : "Needs edit"}</b></div>
            <h3>{title}</h3>
            {filledRows.length ? (
              <div className="freshCommandFilledRows">
                {filledRows.map((row) => (
                  <label key={row.label}>
                    <span>{row.label}</span>
                    <b>{row.value}</b>
                  </label>
                ))}
              </div>
            ) : (
              <div className="freshCommandCleanEmpty"><b>This form is not filled enough yet.</b><span>Use Save edit or open the record before approving.</span></div>
            )}
          </main>

          <aside className="freshCommandOwnerControls" aria-label="Owner approval controls">
            <div className="freshCommandCleanPanelTitle"><span>Owner controls</span><b>{idOf(selected.id || selected._id, "selected")}</b></div>
            <label className="freshCommandOwnerNote"><span>Owner note / edit</span><textarea value={noteValue} onChange={(event) => updateNote(event.target.value)} placeholder="Optional note before approving" /></label>
            <div className="freshCommandFixActions">
              <button type="button" disabled={busy || (!canApprove && selected?.sourceMode !== "note")} onClick={() => runAction("approve")}>{busyAction === "approve" ? "Approving..." : cleanButtonText("approve", selected)}</button>
              <button type="button" disabled={busy} onClick={() => runAction("save")}>{busyAction === "save" ? "Saving..." : cleanButtonText("save", selected)}</button>
              <button type="button" disabled={busy} onClick={() => runAction("ignore")}>{busyAction === "ignore" ? "Parking..." : cleanButtonText("ignore", selected)}</button>
              <button type="button" disabled={busy || selected?.sourceMode === "note"} onClick={() => runTool("open")}>Open record</button>
            </div>
            {message ? <p className="freshCommandOutcome">{message}</p> : null}
          </aside>
        </section>
      ) : (
        <section className="freshCommandCleanEmpty">
          <b>No form waiting.</b>
          <span>Run Check for work when you want Churvox to prepare the next approval form.</span>
        </section>
      )}
    </section>
  );
}
