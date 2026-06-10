import React from "react";

const AI_USAGE_KEY = "churvox:fresh-ai-usage:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "ai-1",
    area: "Command",
    action: "Prepared owner approval slips",
    plan: "Operator",
    used: 248,
    limit: 500,
    status: "Healthy",
    value: "Saved owner time by preparing approvals instead of manual admin.",
    note: "Core Churvox promise: Churvox does the admin. You approve.",
  },
  {
    id: "ai-2",
    area: "Invoices",
    action: "Prepared invoice follow-ups",
    plan: "Operator",
    used: 186,
    limit: 300,
    status: "Watch",
    value: "AI found overdue and part-paid invoices ready for owner review.",
    note: "Keep reminders owner-approved before customers receive anything.",
  },
  {
    id: "ai-3",
    area: "Quotes",
    action: "Prepared quote follow-ups",
    plan: "Operator",
    used: 92,
    limit: 250,
    status: "Healthy",
    value: "AI prepared follow-ups for viewed quotes not yet accepted.",
    note: "This helps businesses win work without sounding pushy.",
  },
];

function readUsage() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(AI_USAGE_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveUsage(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AI_USAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "aiusage" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function percentOf(item) {
  const limit = Math.max(1, Number(item.limit || 1));
  return Math.min(100, Math.round((Number(item.used || 0) / limit) * 100));
}

function sendUsageToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `aiusage-${item.id}-${Date.now()}`,
      group: "AI Usage",
      title: "AI Operator usage needs owner review",
      info: `${item.area} · ${item.used}/${item.limit} actions · ${item.status}`,
      urgency: item.status,
      found: `${item.action} used ${percentOf(item)}% of its allowance.`,
      prepared: `Churvox prepared a usage review for the ${item.plan} plan.`,
      why: item.value,
      owner: "Review usage, open Billing, upgrade plan, or adjust approval rules.",
      area: "AI Operator Actions",
      page: "aiusage",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "aiusage-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshAiUsage({ onNavigate }) {
  const [items, setItems] = React.useState(readUsage);
  const [selectedId, setSelectedId] = React.useState(() => readUsage()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const usedTotal = items.reduce((sum, item) => sum + Number(item.used || 0), 0);
  const limitTotal = items.reduce((sum, item) => sum + Number(item.limit || 0), 0);
  const watchCount = items.filter((item) => item.status === "Watch").length;
  const healthyCount = items.filter((item) => item.status === "Healthy").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveUsage(next);
      return next;
    });
  }

  function addUsageRow() {
    const next = {
      id: `ai-${Date.now()}`,
      area: "New area",
      action: "Prepared AI admin action",
      plan: "Operator",
      used: 0,
      limit: 100,
      status: "Healthy",
      value: "Add the owner value this AI action creates.",
      note: "AI usage should show why the plan is worth paying for.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveUsage(updated);
  }

  function resetUsage() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveUsage(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendUsageToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshAiUsagePage">
      <div className="freshAiUsageHero">
        <div>
          <span>AI Operator Actions</span>
          <h1>Show the owner what AI actually did for the business</h1>
          <p>Track AI-prepared admin work across Command, invoices, quotes, follow-ups, approvals and billing usage.</p>
        </div>

        <div className="freshAiUsageStats">
          <div><b>{usedTotal}</b><small>actions used</small></div>
          <div><b>{limitTotal}</b><small>allowance</small></div>
          <div><b>{healthyCount}</b><small>healthy</small></div>
          <div><b>{watchCount}</b><small>watch</small></div>
        </div>
      </div>

      <div className="freshAiUsageLayout">
        <aside className="freshAiUsageList">
          <header>
            <div>
              <b>Usage desk</b>
              <span>{watchCount} areas to watch</span>
            </div>
            <button type="button" onClick={addUsageRow}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.area}</b>
              <span>{item.action}</span>
              <small>{item.used}/{item.limit} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshAiUsageReset" onClick={resetUsage}>
            Reset AI usage
          </button>
        </aside>

        {selected && (
          <article className="freshAiUsageDetail">
            <div className="freshAiUsageHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.area}</h2>
                <p>{selected.plan} · {selected.used}/{selected.limit} AI Operator Actions</p>
              </div>

              <div className="freshAiUsageHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("billing")}>Open Billing</button>
                <button type="button" onClick={() => onNavigate?.("plans")}>Open Plans</button>
              </div>
            </div>

            <div className="freshAiUsageMeter">
              <div>
                <span>{percentOf(selected)}%</span>
                <b>{selected.used} of {selected.limit} actions used</b>
              </div>
              <i style={{ width: `${percentOf(selected)}%` }} />
            </div>

            <div className="freshAiUsageCards">
              <section>
                <span>AI did</span>
                <b>{selected.action}</b>
                <p>{selected.value}</p>
              </section>

              <section>
                <span>Plan value</span>
                <b>{selected.plan}</b>
                <p>AI Operator Actions are the unique Churvox pricing and value concept.</p>
              </section>

              <section>
                <span>Owner control</span>
                <b>{selected.status}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshAiUsageForm">
              <label>
                <span>Area</span>
                <input value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })} />
              </label>

              <label>
                <span>Action</span>
                <input value={selected.action} onChange={(event) => updateItem(selected.id, { action: event.target.value })} />
              </label>

              <label>
                <span>Plan</span>
                <select value={selected.plan} onChange={(event) => updateItem(selected.id, { plan: event.target.value })}>
                  <option>Start</option>
                  <option>Crew</option>
                  <option>Operator</option>
                  <option>Command</option>
                  <option>Command Growth Pack</option>
                </select>
              </label>

              <label>
                <span>Used</span>
                <input type="number" value={selected.used} onChange={(event) => updateItem(selected.id, { used: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Limit</span>
                <input type="number" value={selected.limit} onChange={(event) => updateItem(selected.id, { limit: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Healthy</option>
                  <option>Watch</option>
                  <option>Near limit</option>
                  <option>Over limit</option>
                  <option>Needs owner</option>
                </select>
              </label>

              <label className="wide">
                <span>Business value</span>
                <textarea value={selected.value} onChange={(event) => updateItem(selected.id, { value: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshAiUsageActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Healthy" })}>Healthy</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Watch" })}>Watch</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs owner" })}>Needs owner</button>
              <button type="button" onClick={() => onNavigate?.("approvals")}>Open Approvals</button>
              <button type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
