import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const customers = [
  {
    id: "save-1",
    name: "Wainuiomata Customer",
    service: "Lawn care",
    usual: "Every 3 weeks",
    last: "5 weeks ago",
    value: 85,
    risk: "High",
    found: "Regular customer has slipped past normal booking cycle.",
    prepared: "Rebooking message offering next week.",
    message: "Hi, it looks like you may be due for another tidy-up. Would you like me to book you in for next week?",
  },
  {
    id: "save-2",
    name: "Belmont Customer",
    service: "Fortnightly mow",
    usual: "Every 2 weeks",
    last: "2 weeks ago",
    value: 65,
    risk: "Low",
    found: "Customer is due on normal schedule.",
    prepared: "Confirm next Friday visit.",
    message: "Hi, just confirming your normal fortnightly lawn visit for next Friday. Let me know if anything needs changing.",
  },
  {
    id: "save-3",
    name: "Upper Hutt Lead",
    service: "Garden reset quote",
    usual: "One-off lead",
    last: "Quote 3 days ago",
    value: 190,
    risk: "High",
    found: "Quote lead has not accepted and could be lost.",
    prepared: "Staged quote option follow-up.",
    message: "Hi, just checking in on the garden reset quote. I can also split it into stages if that works better.",
  },
];

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ")}`;
}

function sendSaverToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `recurring-saver-${item.id}-${Date.now()}`,
      group: "AI Recurring Saver",
      title: "Customer may need rebooking",
      info: `${item.name} · ${money(item.value)} · ${item.risk}`,
      urgency: item.risk,
      found: item.found,
      prepared: item.message,
      why: "Repeat work is easier to keep than new work is to win.",
      owner: "Approve message, edit, send, or open recurring jobs.",
      area: "Recurring Saver",
      page: "recurringsaver",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 100)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "recurring-saver" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshRecurringSaver({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(customers[0].id);
  const selected = customers.find((item) => item.id === selectedId) || customers[0];
  const risk = customers.filter((item) => item.risk === "High").length;
  const value = customers.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="freshRecurringSaverPage">
      <div className="freshRecurringSaverHero">
        <div>
          <span>AI Recurring Saver</span>
          <h1>Keep regular customers before they disappear</h1>
          <p>Churvox watches booking cycles, skipped visits and cold quotes, then prepares rebooking messages for owner approval.</p>
        </div>

        <div className="freshRecurringSaverStats">
          <div><b>{customers.length}</b><small>tracked</small></div>
          <div><b>{risk}</b><small>high risk</small></div>
          <div><b>{money(value)}</b><small>value watched</small></div>
          <div><b>Repeat</b><small>work saved</small></div>
        </div>
      </div>

      <div className="freshRecurringSaverLayout">
        <aside className="freshRecurringSaverList">
          <header>
            <b>Retention watch</b>
            <span>{risk} high risk</span>
          </header>

          {customers.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selected.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.name}</b>
              <span>{item.service}</span>
              <small>{item.last} · {money(item.value)} · {item.risk}</small>
            </button>
          ))}
        </aside>

        <article className="freshRecurringSaverDetail">
          <header>
            <span>{selected.risk} risk</span>
            <h2>{selected.name}</h2>
            <p>{selected.service} · usual: {selected.usual} · last: {selected.last}</p>
          </header>

          <div className="freshRecurringSaverCards">
            <section><b>AI found</b><p>{selected.found}</p></section>
            <section><b>AI prepared</b><p>{selected.prepared}</p></section>
            <section><b>Value</b><p>{money(selected.value)}</p></section>
          </div>

          <label>
            <span>Editable rebooking message</span>
            <textarea value={selected.message} readOnly />
          </label>

          <div className="freshRecurringSaverButtons">
            <button type="button" onClick={() => sendSaverToCommand(selected, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.("recurring")}>Open Recurring</button>
            <button type="button" onClick={() => onNavigate?.("followupwriter")}>Open Follow-up Writer</button>
            <button type="button" onClick={() => onNavigate?.("clients")}>Open Client</button>
          </div>
        </article>
      </div>
    </section>
  );
}
