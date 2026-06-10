import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const trustItems = [
  {
    id: "approval",
    title: "AI does not send blindly",
    status: "Launch message",
    detail: "AI prepares jobs, messages, invoice checks and follow-ups, but owner approval stays in Command.",
    action: "Show on pricing and onboarding.",
    page: "command",
  },
  {
    id: "data",
    title: "Business data stays organised",
    status: "Needs final wording",
    detail: "Clients, jobs, invoices, photos, notes and team records should be tied to the correct business account.",
    action: "Confirm backend business isolation and privacy wording.",
    page: "security",
  },
  {
    id: "billing",
    title: "Pricing is clear",
    status: "Needs test",
    detail: "Start $39, Crew $89, Operator $149, Command $299 + GST. 14-day trial, no card.",
    action: "Check plans page and Stripe return.",
    page: "plans",
  },
  {
    id: "exports",
    title: "Data export available",
    status: "Ready",
    detail: "CSV templates and export prep are visible in Launch Pack.",
    action: "Open Launch Pack and download templates.",
    page: "launchpack",
  },
  {
    id: "payroll",
    title: "Payroll is export only",
    status: "Launch message",
    detail: "Churvox payroll workspace does not submit to government and does not create bank payout files.",
    action: "Keep wording clear in payroll and plans.",
    page: "payroll",
  },
  {
    id: "support",
    title: "Human support path",
    status: "Ready",
    detail: "Users need a simple place to ask for setup help or report issues.",
    action: "Open Help Desk.",
    page: "helpdesk",
  },
];

function sendTrustToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `trust-${item.id}-${Date.now()}`,
      group: "Trust Center",
      title: item.title,
      info: item.status,
      urgency: item.status.includes("Needs") ? "High" : "Medium",
      found: item.detail,
      prepared: item.action,
      why: "Launch trust matters as much as features. Users need clarity before they pay.",
      owner: "Approve wording, open page, or mark ready.",
      area: "Trust Center",
      page: "trustcenter",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 90)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "trust-center" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshTrustCenter({ onNavigate }) {
  const needs = trustItems.filter((item) => item.status.includes("Needs")).length;
  const ready = trustItems.filter((item) => item.status === "Ready").length;

  return (
    <section className="freshTrustPage">
      <div className="freshTrustHero">
        <div>
          <span>Trust Center</span>
          <h1>Make Churvox feel safe enough to pay for</h1>
          <p>Top-player apps do not just look powerful. They clearly explain AI control, billing, privacy, exports, payroll limits and support.</p>
        </div>

        <div className="freshTrustStats">
          <div><b>{trustItems.length}</b><small>trust checks</small></div>
          <div><b>{ready}</b><small>ready</small></div>
          <div><b>{needs}</b><small>needs wording</small></div>
          <div><b>Approve</b><small>owner control</small></div>
        </div>
      </div>

      <div className="freshTrustGrid">
        {trustItems.map((item) => (
          <article key={item.id} className="freshTrustCard">
            <header>
              <span>{item.status}</span>
              <h2>{item.title}</h2>
            </header>

            <p><strong>Trust point:</strong> {item.detail}</p>
            <p><strong>Launch action:</strong> {item.action}</p>

            <div className="freshTrustButtons">
              <button type="button" onClick={() => sendTrustToCommand(item, onNavigate)}>Send to Command</button>
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open area</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
