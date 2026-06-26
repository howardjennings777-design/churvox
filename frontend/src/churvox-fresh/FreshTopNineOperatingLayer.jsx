import React from "react";
import "./freshTopNineOperatingLayer.css";

export const CHURVOX_TOP_NINE_LAYER_MARKER_20260627 = "CHURVOX_TOP_NINE_LAYER_MARKER_20260627";

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "$0";
  return `$${Math.round(n).toLocaleString()}`;
}

function count(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
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
      title: "Today / This Week",
      promise: "Show what is booked, late, waiting, and ready for approval.",
      metric: `${urgent || commandWaiting} waiting`,
      status: urgent ? "Needs owner attention" : "Calm right now",
      action: "Refresh Command",
      onClick: () => runAction?.("refresh"),
      tone: urgent ? "need" : "ok",
    },
    {
      id: "worker-proof",
      title: "Worker proof",
      promise: "Photos, notes, time, and job proof should tell the owner what really happened.",
      metric: proofGaps ? `${proofGaps} gaps` : "Proof checked",
      status: proofGaps ? "Needs stronger proof" : "No major proof gap selected",
      action: "Open linked record",
      onClick: () => runAction?.("open"),
      tone: proofGaps ? "need" : "ok",
      disabled: !activeFix || busy,
    },
    {
      id: "completed-invoice",
      title: "Completed job → draft invoice",
      promise: "Completed paid work should turn into a draft invoice, not owner memory.",
      metric: moneyWaiting ? `${moneyWaiting} money item${moneyWaiting === 1 ? "" : "s"}` : "Watching",
      status: adminDebtTotal ? `${money(adminDebtTotal)} admin debt` : "No money debt showing",
      action: "Check for work",
      onClick: () => runAction?.("scan"),
      tone: adminDebtTotal ? "money" : "ok",
    },
    {
      id: "command-desk",
      title: "Command Approval Desk",
      promise: "One desk: Churvox found it, prepared it, explains why, then waits for approval.",
      metric: `${commandWaiting} item${commandWaiting === 1 ? "" : "s"}`,
      status: waitingApproval ? `${waitingApproval} waiting approval` : "Decision desk ready",
      action: "Refresh",
      onClick: () => runAction?.("refresh"),
      tone: commandWaiting ? "command" : "ok",
    },
    {
      id: "admin-debt",
      title: "Admin Debt Counter",
      promise: "Make admin visible: money waiting, follow-ups, proof gaps, setup gaps, and time approval.",
      metric: money(adminDebtTotal),
      status: adminDebtTotal ? "Admin debt exists" : "No money debt showing",
      action: "Check again",
      onClick: () => runAction?.("scan"),
      tone: adminDebtTotal ? "money" : "ok",
    },
    {
      id: "missing-engine",
      title: "What’s Missing? Engine",
      promise: "Catch missing email, address, proof, invoice, quote follow-up, job link, or worker time.",
      metric: proofGaps ? `${proofGaps} missing` : "Watching",
      status: proofGaps ? selectedGaps.slice(0, 2).join(", ") : "No selected proof gaps",
      action: "Review active item",
      onClick: () => runAction?.("open"),
      tone: proofGaps ? "need" : "ok",
      disabled: !activeFix || busy,
    },
    {
      id: "recovery",
      title: "One-Tap Admin Recovery",
      promise: "Catch up today’s admin by preparing invoices, follow-ups, notes, and fixes for approval.",
      metric: noteRows.length ? `${noteRows.length} note${noteRows.length === 1 ? "" : "s"}` : `${commandWaiting} fixes`,
      status: noteRows.length ? "Saved notes can be prepared" : "Use Check for work",
      action: noteRows.length ? "Prepare notes" : "Check for work",
      onClick: () => runAction?.(noteRows.length ? "prepare" : "scan"),
      tone: noteRows.length || commandWaiting ? "command" : "ok",
    },
    {
      id: "support",
      title: "Simple support",
      promise: "If setup is stuck, the owner should know what is missing and how to get help.",
      metric: "Setup help",
      status: "Support stays simple first",
      action: "Create support note",
      onClick: () => {
        try {
          const key = "churvox:fresh-command-inbox:v1";
          const old = JSON.parse(window.localStorage.getItem(key) || "[]");
          const slip = {
            id: `support-${Date.now()}`,
            group: "Support",
            title: "Setup/support request",
            info: "Owner wants help or setup review",
            urgency: "Setup check",
            found: "Owner opened support from the Top 9 layer.",
            prepared: "Churvox should turn this into a simple support/setup request.",
            why: "Bad support and confusing setup are major reasons service apps lose trust.",
            owner: "Add details, then approve or send through support.",
            area: "Help",
            page: "helpdesk",
            fromInbox: true,
            createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          window.localStorage.setItem(key, JSON.stringify([slip, ...(Array.isArray(old) ? old : [])].slice(0, 20)));
          window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "top-nine-support" } }));
        } catch {}
        runAction?.("refresh");
      },
      tone: "support",
    },
    {
      id: "pricing",
      title: "Transparent pricing / no trap",
      promise: "Clear plan limits, clear add-ons, owner-approved accounting sync, no hidden admin surprises.",
      metric: "Clear rules",
      status: "Keep pricing honest",
      action: "Refresh rules",
      onClick: () => runAction?.("refresh"),
      tone: "ok",
    },
  ];
}

export default function FreshTopNineOperatingLayer(props) {
  const [open, setOpen] = React.useState(true);
  const cards = buildCards(props);
  const activeCount = cards.filter((card) => ["need", "money", "command"].includes(card.tone)).length;

  return (
    <section className="freshTopNineLayer" data-top-nine-layer={CHURVOX_TOP_NINE_LAYER_MARKER_20260627}>
      <header className="freshTopNineHeader">
        <div>
          <span>Top 9 owner operating layer</span>
          <h3>Build Churvox around what owners actually want</h3>
          <p>Less chasing, less forgetting, less double entry, and every risky admin step waiting for owner approval.</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide Top 9" : `Show Top 9 (${activeCount})`}
        </button>
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
