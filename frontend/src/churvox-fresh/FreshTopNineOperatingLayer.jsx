import React from "react";
import "./freshTopNineOperatingLayer.css";

export const CHURVOX_BUSINESS_HEALTH_MARKER_20260627 = "CHURVOX_BUSINESS_HEALTH_MARKER_20260627";

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "$0";
  return `$${Math.round(n).toLocaleString()}`;
}

function count(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function makeSupportSlip(runAction) {
  try {
    const key = "churvox:fresh-command-inbox:v1";
    const old = JSON.parse(window.localStorage.getItem(key) || "[]");
    const slip = {
      id: `support-${Date.now()}`,
      group: "Support",
      title: "Setup/support request",
      info: "Owner wants help or setup review",
      urgency: "Setup check",
      found: "Owner opened support from Business Health.",
      prepared: "Churvox should turn this into a simple setup/support request.",
      why: "Clear setup help builds trust and stops owners getting stuck.",
      owner: "Add details, then send through support or keep it in Command.",
      area: "Help",
      page: "helpdesk",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    window.localStorage.setItem(key, JSON.stringify([slip, ...(Array.isArray(old) ? old : [])].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "business-health-support" } }));
  } catch {}
  runAction?.("refresh");
}

function buildCards({
  fixItems = [],
  highItems = [],
  moneyItems = [],
  adminDebtTotal = 0,
  counts = {},
  noteRows = [],
  selectedGaps = [],
  activeFix,
  runAction,
  busy,
}) {
  const waitingApproval = count(counts.Open || counts.open || counts.Waiting || counts.waiting);
  const proofGaps = selectedGaps.length;
  const commandWaiting = fixItems.length;
  const urgent = highItems.length;
  const moneyWaiting = moneyItems.length;

  return [
    {
      id: "today",
      title: "Today’s work",
      promise: "See what needs doing now: jobs, late work, approvals, and money waiting.",
      metric: `${urgent || commandWaiting} waiting`,
      status: urgent ? "Needs owner attention" : "Calm right now",
      action: "Refresh",
      onClick: () => runAction?.("refresh"),
      tone: urgent ? "need" : "ok",
      why: "Owners do not want to hunt through pages to know what matters today.",
    },
    {
      id: "worker-proof",
      title: "Worker proof",
      promise: "Check time, notes, and proof before invoicing or approving work.",
      metric: proofGaps ? `${proofGaps} gap${proofGaps === 1 ? "" : "s"}` : "Proof checked",
      status: proofGaps ? "Needs stronger proof" : "No major proof gap selected",
      action: "Open record",
      onClick: () => runAction?.("open"),
      tone: proofGaps ? "need" : "ok",
      disabled: !activeFix || busy,
      why: "Photos, notes, and time logs help stop disputes and missing details.",
    },
    {
      id: "invoice-ready",
      title: "Ready to invoice",
      promise: "Completed paid work should not sit forgotten.",
      metric: moneyWaiting ? `${moneyWaiting} money item${moneyWaiting === 1 ? "" : "s"}` : "Watching",
      status: adminDebtTotal ? `${money(adminDebtTotal)} admin debt` : "No money debt showing",
      action: "Check for work",
      onClick: () => runAction?.("scan"),
      tone: adminDebtTotal ? "money" : "ok",
      why: "Cash flow improves when completed jobs become draft invoices quickly.",
    },
    {
      id: "command",
      title: "Command approvals",
      promise: "Churvox prepares the admin. The owner approves before anything risky moves forward.",
      metric: `${commandWaiting} item${commandWaiting === 1 ? "" : "s"}`,
      status: waitingApproval ? `${waitingApproval} waiting approval` : "Decision desk ready",
      action: "Refresh Command",
      onClick: () => runAction?.("refresh"),
      tone: commandWaiting ? "command" : "ok",
      why: "Normal alerts become noise. Command should only hold decisions.",
    },
    {
      id: "admin-debt",
      title: "Admin debt",
      promise: "See money waiting, follow-ups, missing proof, and setup gaps before they pile up.",
      metric: money(adminDebtTotal),
      status: adminDebtTotal ? "Admin debt exists" : "No money debt showing",
      action: "Check again",
      onClick: () => runAction?.("scan"),
      tone: adminDebtTotal ? "money" : "ok",
      why: "Owners need to see what admin is costing them before it becomes a cash-flow problem.",
    },
    {
      id: "missing-info",
      title: "Missing information",
      promise: "Catch missing emails, addresses, proof, invoice links, quote follow-ups, and worker time.",
      metric: proofGaps ? `${proofGaps} missing` : "Watching",
      status: proofGaps ? selectedGaps.slice(0, 2).join(", ") : "No selected proof gaps",
      action: "Review item",
      onClick: () => runAction?.("open"),
      tone: proofGaps ? "need" : "ok",
      disabled: !activeFix || busy,
      why: "Small missing details create big delays once the business gets busy.",
    },
    {
      id: "catch-up",
      title: "Admin catch-up",
      promise: "Turn saved notes and waiting admin into approval-ready actions.",
      metric: noteRows.length ? `${noteRows.length} note${noteRows.length === 1 ? "" : "s"}` : `${commandWaiting} fix${commandWaiting === 1 ? "" : "es"}`,
      status: noteRows.length ? "Saved notes can be prepared" : "Use Check for work",
      action: noteRows.length ? "Prepare notes" : "Check for work",
      onClick: () => runAction?.(noteRows.length ? "prepare" : "scan"),
      tone: noteRows.length || commandWaiting ? "command" : "ok",
      why: "Owners fall behind when little admin jobs sit untouched for days.",
    },
    {
      id: "support",
      title: "Setup help",
      promise: "Ask for help before setup confusion turns into churn.",
      metric: "Help ready",
      status: "Support stays simple",
      action: "Create support note",
      onClick: () => makeSupportSlip(runAction),
      tone: "support",
      why: "Clear human help is a trust builder, especially for owners moving off paper.",
    },
    {
      id: "pricing",
      title: "Plan clarity",
      promise: "Clear plan limits, clear add-ons, and owner-approved accounting sync.",
      metric: "Clear rules",
      status: "No surprise sync",
      action: "Refresh",
      onClick: () => runAction?.("refresh"),
      tone: "ok",
      why: "Owners hate surprise billing and confusing add-ons.",
    },
  ];
}

export default function FreshTopNineOperatingLayer(props) {
  const [open, setOpen] = React.useState(true);
  const cards = buildCards(props);
  const attentionCount = cards.filter((card) => ["need", "money", "command"].includes(card.tone)).length;

  return (
    <section className="freshTopNineLayer" data-business-health={CHURVOX_BUSINESS_HEALTH_MARKER_20260627}>
      <header className="freshTopNineHeader">
        <div>
          <span>Business Health</span>
          <h3>What needs attention across the business</h3>
          <p>Churvox watches jobs, proof, invoices, setup gaps, support, and money so the owner can approve the right next step.</p>
        </div>
        <div className="freshTopNineHeaderActions">
          <button type="button" onClick={() => setOpen((value) => !value)}>
            {open ? "Hide health" : `Show health (${attentionCount})`}
          </button>
        </div>
      </header>

      {open ? (
        <div className="freshTopNineGrid">
          {cards.map((card, index) => (
            <article key={card.id} className={`freshTopNineCard ${card.tone || "ok"}`}>
              <small>{index + 1}</small>
              <div>
                <b>{card.title}</b>
                <p>{card.promise}</p>
              </div>
              <section>
                <strong>{card.metric}</strong>
                <span>{card.status}</span>
              </section>
              <details className="freshTopNinePlaybook">
                <summary>Why it matters</summary>
                <p>{card.why}</p>
              </details>
              <button type="button" disabled={props.busy || card.disabled} onClick={card.onClick}>
                {card.action}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
