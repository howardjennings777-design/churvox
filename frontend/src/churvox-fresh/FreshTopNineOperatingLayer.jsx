import React from "react";
import "./freshTopNineOperatingLayer.css";

export const CHURVOX_TOP_NINE_LAYER_MARKER_20260627 = "CHURVOX_TOP_NINE_LAYER_MARKER_20260627";
export const CHURVOX_TOP_NINE_CUSTOMER_PAIN_PLAYBOOK_20260627 = "CHURVOX_TOP_NINE_CUSTOMER_PAIN_PLAYBOOK_20260627";
export const CHURVOX_TOP_NINE_LAUNCH_CHECKLIST_20260627 = "CHURVOX_TOP_NINE_LAUNCH_CHECKLIST_20260627";

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
      pain: "Owners hate opening software and still not knowing what needs doing today.",
      churvox: "Turn the dashboard into a short owner decision list, not a wall of records.",
      nextBuild: "Keep Today/This Week focused on late jobs, unacknowledged work, ready invoices, and approvals.",
      checks: [
        "Dashboard shows what needs doing today.",
        "Late or unacknowledged work is obvious.",
        "Owner can get back to Command without hunting.",
      ],
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
      pain: "Field apps lose trust when proof, notes, or time are missing after the worker says the job is done.",
      churvox: "Make proof simple for workers and obvious for owners before invoicing or payroll approval.",
      nextBuild: "Show proof status on jobs and block risky approval when photo/time/context is missing.",
      checks: [
        "Worker can acknowledge, start, pause, and complete.",
        "Job proof is visible to owner.",
        "Missing proof shows in Command before approval.",
      ],
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
      pain: "Owners get annoyed when completed work still needs manual invoice chasing.",
      churvox: "Completed priced jobs should automatically become draft invoice candidates for owner approval.",
      nextBuild: "Make completed-job-to-draft-invoice the cleanest flow in the app.",
      checks: [
        "Complete a job and confirm it becomes invoice-ready.",
        "Draft invoice is review-first.",
        "Nothing sends without owner approval.",
      ],
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
      pain: "Normal notifications become noise because they do not explain what to do next.",
      churvox: "Every Command item must show found, prepared, why it matters, proof, and approval controls.",
      nextBuild: "Keep Command as the one calm owner approval desk.",
      checks: [
        "Command shows one clear fix at a time.",
        "Approve, edit, and park are obvious.",
        "Decision trail explains why the item exists.",
      ],
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
      pain: "Admin debt is invisible until cash flow, customer follow-up, or payroll becomes a mess.",
      churvox: "Show the owner how much money/admin is waiting before it becomes a problem.",
      nextBuild: "Break admin debt into money waiting, missing proof, follow-ups, setup gaps, and time approvals.",
      checks: [
        "Money waiting is visible.",
        "Follow-ups and proof gaps are counted.",
        "Owner knows what to fix first.",
      ],
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
      pain: "Small missing details create big admin delays: no email, no address, no proof, no invoice, no follow-up.",
      churvox: "Find missing details early and turn them into approval-ready cleanup items.",
      nextBuild: "Make missing fields and missing proof impossible to ignore.",
      checks: [
        "Missing customer details are flagged.",
        "Completed job with no invoice is flagged.",
        "Quote accepted with no job is flagged.",
      ],
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
      pain: "Owners fall behind when admin piles up over several days.",
      churvox: "One tap should prepare the catch-up pile, but still wait for owner approval.",
      nextBuild: "Batch prepare invoices, follow-ups, notes, and proof requests into Command.",
      checks: [
        "Saved notes can become approval items.",
        "Catch-up scan does not send anything automatically.",
        "Owner can approve or park each prepared item.",
      ],
    },
    {
      id: "support",
      title: "Simple support",
      promise: "If setup is stuck, the owner should know what is missing and how to get help.",
      metric: "Setup help",
      status: "Support stays simple first",
      action: "Create support note",
      onClick: () => makeSupportSlip(runAction),
      tone: "support",
      pain: "Bad support and confusing setup make people cancel even when the product is good.",
      churvox: "Make support feel human, simple, and tied to setup gaps.",
      nextBuild: "Turn support requests into Command slips and setup guidance.",
      checks: [
        "Owner can ask for setup help quickly.",
        "Support note appears in Command.",
        "Help copy feels human, not corporate.",
      ],
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
      pain: "Owners hate surprise billing, unclear limits, and add-ons that feel like traps.",
      churvox: "Keep pricing clear, plan limits honest, and accounting sync owner-approved.",
      nextBuild: "Keep plan gates helpful, not punishing.",
      checks: [
        "Plans page shows clear prices.",
        "Accounting sync wording is owner-approved.",
        "No hidden MYOB/public confusing wording.",
      ],
    },
  ];
}

export default function FreshTopNineOperatingLayer(props) {
  const [open, setOpen] = React.useState(true);
  const [checklistOpen, setChecklistOpen] = React.useState(false);
  const cards = buildCards(props);
  const activeCount = cards.filter((card) => ["need", "money", "command"].includes(card.tone)).length;
  const totalChecks = cards.reduce((sum, card) => sum + card.checks.length, 0);

  return (
    <section
      className="freshTopNineLayer"
      data-top-nine-layer={CHURVOX_TOP_NINE_LAYER_MARKER_20260627}
      data-top-nine-playbook={CHURVOX_TOP_NINE_CUSTOMER_PAIN_PLAYBOOK_20260627}
      data-top-nine-checklist={CHURVOX_TOP_NINE_LAUNCH_CHECKLIST_20260627}
    >
      <header className="freshTopNineHeader">
        <div>
          <span>Top 9 owner operating layer</span>
          <h3>Build Churvox around what owners actually want</h3>
          <p>Less chasing, less forgetting, less double entry, and every risky admin step waiting for owner approval.</p>
        </div>
        <div className="freshTopNineHeaderActions">
          <button type="button" onClick={() => setChecklistOpen((value) => !value)}>
            {checklistOpen ? "Hide checklist" : `${totalChecks} launch checks`}
          </button>
          <button type="button" onClick={() => setOpen((value) => !value)}>
            {open ? "Hide Top 9" : `Show Top 9 (${activeCount})`}
          </button>
        </div>
      </header>

      {checklistOpen ? (
        <aside className="freshTopNineChecklist">
          <b>Launch checklist for the 9 things that matter</b>
          <p>Use this as the practical test pass before pushing harder on marketing.</p>
          <div>
            {cards.map((card) => (
              <section key={`check-${card.id}`}>
                <strong>{card.title}</strong>
                <ul>
                  {card.checks.map((check) => <li key={check}>{check}</li>)}
                </ul>
              </section>
            ))}
          </div>
        </aside>
      ) : null}

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
                <summary>Why customers care</summary>
                <p><b>Pain:</b> {card.pain}</p>
                <p><b>Churvox answer:</b> {card.churvox}</p>
                <p><b>Build/test next:</b> {card.nextBuild}</p>
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
