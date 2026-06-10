import React from "react";

const APPROVALS_KEY = "churvox:fresh-approvals:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "ap-1",
    name: "Quote over $500",
    area: "Quotes",
    trigger: "Any quote total is over $500",
    action: "Hold for owner approval",
    appliesTo: "All staff",
    status: "On",
    priority: "High",
    note: "Prevents large quotes being sent before the owner checks margin and scope.",
  },
  {
    id: "ap-2",
    name: "Refund or credit note",
    area: "Payments",
    trigger: "Any refund, credit note, or write-off is created",
    action: "Send to Command",
    appliesTo: "Admin and managers",
    status: "On",
    priority: "High",
    note: "Owner approves money leaving the business or invoice value being reduced.",
  },
  {
    id: "ap-3",
    name: "Payroll changes",
    area: "Payroll",
    trigger: "Manual time edit or pay adjustment",
    action: "Require owner sign-off",
    appliesTo: "Payroll users",
    status: "Draft",
    priority: "Medium",
    note: "Keeps payroll changes visible before export.",
  },
];

function readApprovals() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(APPROVALS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveApprovals(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(APPROVALS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "approvals" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendApprovalToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `approval-rule-${item.id}-${Date.now()}`,
      group: "Approval Rules",
      title: "Owner approval rule needs review",
      info: `${item.name} · ${item.area} · ${item.status}`,
      urgency: item.priority,
      found: `Rule trigger: ${item.trigger}.`,
      prepared: `Churvox prepared action: ${item.action}.`,
      why: item.note,
      owner: "Approve rule, edit trigger, turn off, or open the related area.",
      area: "Approval Rules",
      page: "approvals",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "approval-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshApprovals({ onNavigate }) {
  const [items, setItems] = React.useState(readApprovals);
  const [selectedId, setSelectedId] = React.useState(() => readApprovals()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const activeCount = items.filter((item) => item.status === "On").length;
  const draftCount = items.filter((item) => item.status === "Draft").length;
  const highCount = items.filter((item) => item.priority === "High").length;
  const total = items.length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveApprovals(next);
      return next;
    });
  }

  function addApprovalRule() {
    const next = {
      id: `ap-${Date.now()}`,
      name: "New approval rule",
      area: "Jobs",
      trigger: "Add trigger condition.",
      action: "Send to Command",
      appliesTo: "All staff",
      status: "Draft",
      priority: "Medium",
      note: "Owner decides when this rule should run.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveApprovals(updated);
  }

  function resetApprovals() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveApprovals(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendApprovalToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshApprovalsPage">
      <div className="freshApprovalsHero">
        <div>
          <span>Owner approval rules</span>
          <h1>Decide what AI can prepare and what owner must approve</h1>
          <p>Set guardrails for quotes, refunds, payroll edits, job changes and customer messages before Churvox takes action.</p>
        </div>

        <div className="freshApprovalsStats">
          <div><b>{total}</b><small>rules</small></div>
          <div><b>{activeCount}</b><small>active</small></div>
          <div><b>{draftCount}</b><small>draft</small></div>
          <div><b>{highCount}</b><small>high priority</small></div>
        </div>
      </div>

      <div className="freshApprovalsLayout">
        <aside className="freshApprovalsList">
          <header>
            <div>
              <b>Rule desk</b>
              <span>{activeCount} active owner controls</span>
            </div>
            <button type="button" onClick={addApprovalRule}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.name}</b>
              <span>{item.area} · {item.action}</span>
              <small>{item.priority} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshApprovalsReset" onClick={resetApprovals}>
            Reset approval rules
          </button>
        </aside>

        {selected && (
          <article className="freshApprovalsDetail">
            <div className="freshApprovalsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.name}</h2>
                <p>{selected.area} · {selected.priority} priority · {selected.appliesTo}</p>
              </div>

              <div className="freshApprovalsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
                <button type="button" onClick={() => onNavigate?.("automation")}>Open Automation</button>
              </div>
            </div>

            <div className="freshApprovalsCards">
              <section>
                <span>Trigger</span>
                <b>{selected.area}</b>
                <p>{selected.trigger}</p>
              </section>

              <section>
                <span>AI action</span>
                <b>{selected.action}</b>
                <p>Churvox does the admin. You approve.</p>
              </section>

              <section>
                <span>Owner guardrail</span>
                <b>{selected.priority}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshApprovalsForm">
              <label>
                <span>Rule name</span>
                <input value={selected.name} onChange={(event) => updateItem(selected.id, { name: event.target.value })} />
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
                  <option>Messages</option>
                  <option>Customer Portal</option>
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
                <span>Priority</span>
                <select value={selected.priority} onChange={(event) => updateItem(selected.id, { priority: event.target.value })}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>

              <label>
                <span>Applies to</span>
                <input value={selected.appliesTo} onChange={(event) => updateItem(selected.id, { appliesTo: event.target.value })} />
              </label>

              <label>
                <span>Action</span>
                <select value={selected.action} onChange={(event) => updateItem(selected.id, { action: event.target.value })}>
                  <option>Hold for owner approval</option>
                  <option>Send to Command</option>
                  <option>Require owner sign-off</option>
                  <option>Warn only</option>
                  <option>Block until edited</option>
                </select>
              </label>

              <label className="wide">
                <span>Trigger</span>
                <textarea value={selected.trigger} onChange={(event) => updateItem(selected.id, { trigger: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshApprovalsActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "On" })}>Turn on</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Off" })}>Turn off</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button>
              <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
              <button type="button" onClick={() => onNavigate?.("roles")}>Open Roles</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
