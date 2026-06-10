import React from "react";

const AUDIT_KEY = "churvox:fresh-audit:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "au-1",
    event: "Quote approved by owner",
    area: "Quotes",
    actor: "Owner",
    target: "QUOTE-221",
    time: "Today 9:18am",
    risk: "Low",
    status: "Logged",
    detail: "Quote was approved from Command after AI prepared margin notes.",
    ownerNote: "Good proof trail for customer and business records.",
  },
  {
    id: "au-2",
    event: "Invoice changed after send",
    area: "Invoices",
    actor: "Admin",
    target: "INV-1042",
    time: "Today 8:42am",
    risk: "High",
    status: "Needs review",
    detail: "Invoice total changed from $420 to $385 after customer message.",
    ownerNote: "Owner should confirm this was a valid credit or correction.",
  },
  {
    id: "au-3",
    event: "Worker time manually edited",
    area: "Payroll",
    actor: "Manager",
    target: "TIME-889",
    time: "Yesterday 5:05pm",
    risk: "Medium",
    status: "Needs review",
    detail: "Job time was manually adjusted by 22 minutes before payroll export.",
    ownerNote: "Check reason before approving payroll.",
  },
];

function readAudit() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(AUDIT_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveAudit(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUDIT_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "audit" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendAuditToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `audit-${item.id}-${Date.now()}`,
      group: "Activity Log",
      title: "Audit event needs owner review",
      info: `${item.area} · ${item.target} · ${item.risk}`,
      urgency: item.risk,
      found: item.detail,
      prepared: "Churvox flagged this activity for owner review.",
      why: item.ownerNote,
      owner: "Review, mark cleared, open related area, or add owner note.",
      area: "Activity Log",
      page: "audit",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "audit-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshAudit({ onNavigate }) {
  const [items, setItems] = React.useState(readAudit);
  const [selectedId, setSelectedId] = React.useState(() => readAudit()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const reviewCount = items.filter((item) => item.status === "Needs review").length;
  const highRisk = items.filter((item) => item.risk === "High").length;
  const cleared = items.filter((item) => item.status === "Cleared").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveAudit(next);
      return next;
    });
  }

  function addAuditEvent() {
    const next = {
      id: `au-${Date.now()}`,
      event: "New activity event",
      area: "Jobs",
      actor: "System",
      target: "NEW",
      time: "Now",
      risk: "Medium",
      status: "Needs review",
      detail: "Add activity detail.",
      ownerNote: "Owner can review and clear this event.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveAudit(updated);
  }

  function resetAudit() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveAudit(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendAuditToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshAuditPage">
      <div className="freshAuditHero">
        <div>
          <span>Activity log</span>
          <h1>Keep a clean proof trail of every important action</h1>
          <p>Track approvals, edits, refunds, payroll changes, quote sends and owner decisions so nothing disappears.</p>
        </div>

        <div className="freshAuditStats">
          <div><b>{total}</b><small>events</small></div>
          <div><b>{reviewCount}</b><small>needs review</small></div>
          <div><b>{highRisk}</b><small>high risk</small></div>
          <div><b>{cleared}</b><small>cleared</small></div>
        </div>
      </div>

      <div className="freshAuditLayout">
        <aside className="freshAuditList">
          <header>
            <div>
              <b>Audit trail</b>
              <span>{reviewCount} waiting on owner</span>
            </div>
            <button type="button" onClick={addAuditEvent}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.event}</b>
              <span>{item.area} · {item.target}</span>
              <small>{item.risk} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshAuditReset" onClick={resetAudit}>
            Reset audit log
          </button>
        </aside>

        {selected && (
          <article className="freshAuditDetail">
            <div className="freshAuditHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.event}</h2>
                <p>{selected.area} · {selected.target} · {selected.time}</p>
              </div>

              <div className="freshAuditHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("reports")}>Open Reports</button>
                <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
              </div>
            </div>

            <div className="freshAuditCards">
              <section>
                <span>Actor</span>
                <b>{selected.actor}</b>
                <p>Who or what made the change.</p>
              </section>

              <section>
                <span>Risk</span>
                <b>{selected.risk}</b>
                <p>{selected.detail}</p>
              </section>

              <section>
                <span>Owner note</span>
                <b>{selected.status}</b>
                <p>{selected.ownerNote}</p>
              </section>
            </div>

            <div className="freshAuditForm">
              <label>
                <span>Event</span>
                <input value={selected.event} onChange={(event) => updateItem(selected.id, { event: event.target.value })} />
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Jobs</option>
                  <option>Quotes</option>
                  <option>Invoices</option>
                  <option>Payments</option>
                  <option>Credit Notes</option>
                  <option>Payroll</option>
                  <option>Team</option>
                  <option>Settings</option>
                </select>
              </label>

              <label>
                <span>Actor</span>
                <input value={selected.actor} onChange={(event) => updateItem(selected.id, { actor: event.target.value })} />
              </label>

              <label>
                <span>Target</span>
                <input value={selected.target} onChange={(event) => updateItem(selected.id, { target: event.target.value })} />
              </label>

              <label>
                <span>Risk</span>
                <select value={selected.risk} onChange={(event) => updateItem(selected.id, { risk: event.target.value })}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Logged</option>
                  <option>Needs review</option>
                  <option>Reviewed</option>
                  <option>Cleared</option>
                  <option>Flagged</option>
                </select>
              </label>

              <label>
                <span>Time</span>
                <input value={selected.time} onChange={(event) => updateItem(selected.id, { time: event.target.value })} />
              </label>

              <label className="wide">
                <span>Detail</span>
                <textarea value={selected.detail} onChange={(event) => updateItem(selected.id, { detail: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.ownerNote} onChange={(event) => updateItem(selected.id, { ownerNote: event.target.value })} />
              </label>
            </div>

            <div className="freshAuditActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Reviewed" })}>Mark reviewed</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Cleared" })}>Clear</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Flagged" })}>Flag</button>
              <button type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
              <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
