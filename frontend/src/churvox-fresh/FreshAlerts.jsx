import React from "react";

const ALERTS_KEY = "churvox:fresh-alerts:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "al-1",
    title: "Invoice overdue",
    area: "Invoices",
    trigger: "Invoice unpaid 3 days after due date",
    channel: "Command + Email",
    priority: "High",
    status: "On",
    audience: "Owner",
    message: "INV-1042 is overdue. Churvox prepared a polite payment follow-up.",
    ownerNote: "Owner should approve before message is sent.",
  },
  {
    id: "al-2",
    title: "Worker running late",
    area: "Jobs",
    trigger: "Worker has not started job 15 minutes after scheduled time",
    channel: "Command + Push",
    priority: "Medium",
    status: "On",
    audience: "Owner and dispatcher",
    message: "Job start looks late. Churvox prepared a check-in message.",
    ownerNote: "Use this to catch job delays before customer complains.",
  },
  {
    id: "al-3",
    title: "Quote not accepted",
    area: "Quotes",
    trigger: "Quote viewed but not accepted after 48 hours",
    channel: "Command",
    priority: "Medium",
    status: "Draft",
    audience: "Owner",
    message: "Customer viewed quote but has not accepted. Churvox prepared a follow-up.",
    ownerNote: "Keep follow-ups helpful, not pushy.",
  },
];

function readAlerts() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(ALERTS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveAlerts(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ALERTS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "alerts" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendAlertToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `alert-${item.id}-${Date.now()}`,
      group: "Alerts",
      title: "Alert rule needs owner review",
      info: `${item.title} · ${item.area} · ${item.priority}`,
      urgency: item.priority,
      found: `Trigger: ${item.trigger}.`,
      prepared: item.message,
      why: item.ownerNote,
      owner: "Approve alert, edit message, change channel, or open related area.",
      area: "Alerts",
      page: "alerts",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "alert-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshAlerts({ onNavigate }) {
  const [items, setItems] = React.useState(readAlerts);
  const [selectedId, setSelectedId] = React.useState(() => readAlerts()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const activeCount = items.filter((item) => item.status === "On").length;
  const draftCount = items.filter((item) => item.status === "Draft").length;
  const highCount = items.filter((item) => item.priority === "High").length;
  const commandCount = items.filter((item) => item.channel.includes("Command")).length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveAlerts(next);
      return next;
    });
  }

  function addAlert() {
    const next = {
      id: `al-${Date.now()}`,
      title: "New alert",
      area: "Jobs",
      trigger: "Add trigger condition.",
      channel: "Command",
      priority: "Medium",
      status: "Draft",
      audience: "Owner",
      message: "Churvox prepared an alert for owner review.",
      ownerNote: "Decide when this alert should fire.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveAlerts(updated);
  }

  function resetAlerts() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveAlerts(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendAlertToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshAlertsPage">
      <div className="freshAlertsHero">
        <div>
          <span>Alerts / notifications</span>
          <h1>Catch the important stuff before it becomes a problem</h1>
          <p>Set owner alerts for overdue invoices, late jobs, quote follow-ups, safety issues and customer updates.</p>
        </div>

        <div className="freshAlertsStats">
          <div><b>{activeCount}</b><small>active</small></div>
          <div><b>{draftCount}</b><small>draft</small></div>
          <div><b>{highCount}</b><small>high priority</small></div>
          <div><b>{commandCount}</b><small>to Command</small></div>
        </div>
      </div>

      <div className="freshAlertsLayout">
        <aside className="freshAlertsList">
          <header>
            <div>
              <b>Alert desk</b>
              <span>{activeCount} active notifications</span>
            </div>
            <button type="button" onClick={addAlert}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.title}</b>
              <span>{item.area} · {item.channel}</span>
              <small>{item.priority} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshAlertsReset" onClick={resetAlerts}>
            Reset alerts
          </button>
        </aside>

        {selected && (
          <article className="freshAlertsDetail">
            <div className="freshAlertsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.title}</h2>
                <p>{selected.area} · {selected.priority} priority · {selected.audience}</p>
              </div>

              <div className="freshAlertsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("automation")}>Open Automation</button>
                <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
              </div>
            </div>

            <div className="freshAlertsCards">
              <section>
                <span>Trigger</span>
                <b>{selected.area}</b>
                <p>{selected.trigger}</p>
              </section>

              <section>
                <span>Channel</span>
                <b>{selected.channel}</b>
                <p>Route alerts to Command, email, push, or SMS later.</p>
              </section>

              <section>
                <span>Message</span>
                <b>{selected.priority}</b>
                <p>{selected.message}</p>
              </section>
            </div>

            <div className="freshAlertsForm">
              <label>
                <span>Alert title</span>
                <input value={selected.title} onChange={(event) => updateItem(selected.id, { title: event.target.value })} />
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Jobs</option>
                  <option>Quotes</option>
                  <option>Invoices</option>
                  <option>Payments</option>
                  <option>Safety</option>
                  <option>Customer Portal</option>
                  <option>Team</option>
                  <option>Payroll</option>
                </select>
              </label>

              <label>
                <span>Channel</span>
                <select value={selected.channel} onChange={(event) => updateItem(selected.id, { channel: event.target.value })}>
                  <option>Command</option>
                  <option>Command + Email</option>
                  <option>Command + Push</option>
                  <option>Email only</option>
                  <option>Push only</option>
                  <option>SMS later</option>
                </select>
              </label>

              <label>
                <span>Priority</span>
                <select value={selected.priority} onChange={(event) => updateItem(selected.id, { priority: event.target.value })}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>On</option>
                  <option>Off</option>
                  <option>Draft</option>
                  <option>Needs review</option>
                </select>
              </label>

              <label>
                <span>Audience</span>
                <input value={selected.audience} onChange={(event) => updateItem(selected.id, { audience: event.target.value })} />
              </label>

              <label className="wide">
                <span>Trigger</span>
                <textarea value={selected.trigger} onChange={(event) => updateItem(selected.id, { trigger: event.target.value })} />
              </label>

              <label className="wide">
                <span>Notification message</span>
                <textarea value={selected.message} onChange={(event) => updateItem(selected.id, { message: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.ownerNote} onChange={(event) => updateItem(selected.id, { ownerNote: event.target.value })} />
              </label>
            </div>

            <div className="freshAlertsActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "On" })}>Turn on</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Off" })}>Turn off</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button>
              <button type="button" onClick={() => onNavigate?.("messages")}>Open Messages</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
