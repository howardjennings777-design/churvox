import React from "react";

const SECURITY_KEY = "churvox:fresh-security:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "sec-1",
    control: "Owner approval for sensitive actions",
    area: "Command",
    status: "Active",
    risk: "High",
    owner: "Owner",
    evidence: "Quotes, refunds, payroll export, accounting sync and data export require owner approval.",
    note: "Keeps Churvox safe: AI prepares, owner approves.",
    nextAction: "Review approval rules before launch.",
  },
  {
    id: "sec-2",
    control: "Role-based access",
    area: "Roles",
    status: "Needs review",
    risk: "Medium",
    owner: "Owner",
    evidence: "Workers only see assigned jobs. Managers can run operations. Owners control billing, exports and settings.",
    note: "Do not give staff more access than they need.",
    nextAction: "Confirm worker, manager, payroll and owner roles.",
  },
  {
    id: "sec-3",
    control: "Data export protection",
    area: "Exports",
    status: "Draft",
    risk: "High",
    owner: "Owner",
    evidence: "Client lists, payroll hours and invoice exports stay owner-approved.",
    note: "Customer and payroll data should not leave Churvox without approval.",
    nextAction: "Lock export approval before public launch.",
  },
];

function readSecurity() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(SECURITY_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveSecurity(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SECURITY_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "security" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendSecurityToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `security-${item.id}-${Date.now()}`,
      group: "Security",
      title: "Security control needs owner review",
      info: `${item.control} · ${item.status} · ${item.risk} risk`,
      urgency: item.risk,
      found: `${item.area} control is marked ${item.status}.`,
      prepared: `Churvox prepared security action: ${item.nextAction}`,
      why: item.note,
      owner: "Approve control, open related area, update role rules, or keep under review.",
      area: "Security / Privacy Controls",
      page: "security",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "security-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshSecurity({ onNavigate }) {
  const [items, setItems] = React.useState(readSecurity);
  const [selectedId, setSelectedId] = React.useState(() => readSecurity()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const active = items.filter((item) => item.status === "Active").length;
  const review = items.filter((item) => item.status === "Needs review").length;
  const highRisk = items.filter((item) => item.risk === "High").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveSecurity(next);
      return next;
    });
  }

  function addControl() {
    const next = {
      id: `sec-${Date.now()}`,
      control: "New security control",
      area: "Settings",
      status: "Draft",
      risk: "Medium",
      owner: "Owner",
      evidence: "Add proof or rule here.",
      note: "Owner decides before launch.",
      nextAction: "Review and approve this control.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveSecurity(updated);
  }

  function resetSecurity() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveSecurity(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendSecurityToCommand(selected);
    onNavigate?.("command");
  }

  function openArea(area) {
    const map = {
      Command: "command",
      Roles: "roles",
      Exports: "exports",
      Audit: "audit",
      Settings: "settings",
      Billing: "billing",
      Integrations: "integrations",
    };
    onNavigate?.(map[area] || "settings");
  }

  return (
    <section className="freshSecurityPage">
      <div className="freshSecurityHero">
        <div>
          <span>Security / privacy controls</span>
          <h1>Keep owner control around data, roles, exports and AI actions</h1>
          <p>Track the safety rules that matter before launch: approval gates, role access, audit history, exports, integrations and billing changes.</p>
        </div>

        <div className="freshSecurityStats">
          <div><b>{total}</b><small>controls</small></div>
          <div><b>{active}</b><small>active</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{highRisk}</b><small>high risk</small></div>
        </div>
      </div>

      <div className="freshSecurityLayout">
        <aside className="freshSecurityList">
          <header>
            <div>
              <b>Security desk</b>
              <span>{review + highRisk} need attention</span>
            </div>
            <button type="button" onClick={addControl}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.control}</b>
              <span>{item.area} · {item.owner}</span>
              <small>{item.status} · {item.risk} risk</small>
            </button>
          ))}

          <button type="button" className="freshSecurityReset" onClick={resetSecurity}>
            Reset security
          </button>
        </aside>

        {selected && (
          <article className="freshSecurityDetail">
            <div className="freshSecurityHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.control}</h2>
                <p>{selected.area} · {selected.owner} · {selected.risk} risk</p>
              </div>

              <div className="freshSecurityHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => openArea(selected.area)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("audit")}>Open Audit</button>
              </div>
            </div>

            <div className="freshSecurityCards">
              <section>
                <span>Evidence</span>
                <b>{selected.area}</b>
                <p>{selected.evidence}</p>
              </section>

              <section>
                <span>Risk</span>
                <b>{selected.risk}</b>
                <p>High-risk actions should go through Command before they affect customers, payroll or accounting.</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.status}</b>
                <p>{selected.nextAction}</p>
              </section>
            </div>

            <div className="freshSecurityForm">
              <label>
                <span>Control</span>
                <input value={selected.control} onChange={(event) => updateItem(selected.id, { control: event.target.value })} />
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Command</option>
                  <option>Roles</option>
                  <option>Exports</option>
                  <option>Audit</option>
                  <option>Settings</option>
                  <option>Billing</option>
                  <option>Integrations</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Active</option>
                  <option>Draft</option>
                  <option>Needs review</option>
                  <option>Blocked</option>
                  <option>Approved</option>
                </select>
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
                <span>Owner</span>
                <input value={selected.owner} onChange={(event) => updateItem(selected.id, { owner: event.target.value })} />
              </label>

              <label className="wide">
                <span>Evidence / rule</span>
                <textarea value={selected.evidence} onChange={(event) => updateItem(selected.id, { evidence: event.target.value })} />
              </label>

              <label className="wide">
                <span>Security note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>
            </div>

            <div className="freshSecurityActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Approved" })}>Approve</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Blocked</button>
              <button type="button" onClick={() => onNavigate?.("roles")}>Open Roles</button>
              <button type="button" onClick={() => onNavigate?.("exports")}>Open Exports</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
