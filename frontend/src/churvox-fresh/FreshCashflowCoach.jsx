import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const moneyItems = [
  {
    id: "cash-1",
    title: "$780 ready to invoice",
    type: "Send invoices",
    urgency: "High",
    amount: 780,
    found: "Completed jobs are waiting to be invoiced.",
    prepared: "Open Invoice Checker, review extras, send invoice batch.",
    why: "This is money already earned but not yet requested.",
    page: "invoicecheck",
  },
  {
    id: "cash-2",
    title: "$255 overdue",
    type: "Chase payment",
    urgency: "High",
    amount: 255,
    found: "Three invoices are overdue by more than 7 days.",
    prepared: "Friendly payment reminders ready.",
    why: "Small overdue invoices add up and hurt cashflow.",
    page: "followupwriter",
  },
  {
    id: "cash-3",
    title: "$420 quotes at risk",
    type: "Win work",
    urgency: "Medium",
    amount: 420,
    found: "Open quotes have not been followed up.",
    prepared: "Follow-up messages and staged options ready.",
    why: "Future cashflow starts with quotes that do not go cold.",
    page: "quoteai",
  },
  {
    id: "cash-4",
    title: "$150 possible extras",
    type: "Check extras",
    urgency: "Medium",
    amount: 150,
    found: "Worker notes mention materials and extra time.",
    prepared: "Review possible invoice extras before sending.",
    why: "Churvox should catch small missed charges before they vanish.",
    page: "invoicecheck",
  },
];

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ")}`;
}

function sendCashToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `cashflow-${item.id}-${Date.now()}`,
      group: "AI Cashflow Coach",
      title: item.title,
      info: `${item.type} · ${item.urgency}`,
      urgency: item.urgency,
      found: item.found,
      prepared: item.prepared,
      why: item.why,
      owner: "Approve action, open area, snooze, or ignore.",
      area: "Cashflow Coach",
      page: "cashflowai",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 100)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "cashflow-ai" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshCashflowCoach({ onNavigate }) {
  const total = moneyItems.reduce((sum, item) => sum + item.amount, 0);
  const high = moneyItems.filter((item) => item.urgency === "High").length;

  return (
    <section className="freshCashflowPage">
      <div className="freshCashflowHero">
        <div>
          <span>AI Cashflow Coach</span>
          <h1>Tell the user what money to chase today</h1>
          <p>Instead of reports, Churvox gives plain-English cash actions: invoice this, chase that, follow up this quote, check those extras.</p>
        </div>

        <div className="freshCashflowStats">
          <div><b>{money(total)}</b><small>watched</small></div>
          <div><b>{high}</b><small>high priority</small></div>
          <div><b>{moneyItems.length}</b><small>cash actions</small></div>
          <div><b>Today</b><small>focus</small></div>
        </div>
      </div>

      <div className="freshCashflowGrid">
        {moneyItems.map((item) => (
          <article key={item.id} className="freshCashflowCard">
            <header>
              <span>{item.urgency}</span>
              <h2>{item.title}</h2>
              <p>{item.type}</p>
            </header>

            <section>
              <b>AI found</b>
              <p>{item.found}</p>
            </section>

            <section>
              <b>AI prepared</b>
              <p>{item.prepared}</p>
            </section>

            <section>
              <b>Why it matters</b>
              <p>{item.why}</p>
            </section>

            <div className="freshCashflowButtons">
              <button type="button" onClick={() => sendCashToCommand(item, onNavigate)}>Send to Command</button>
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open area</button>
              <button type="button" onClick={() => onNavigate?.("businesshealth")}>Business Health</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
