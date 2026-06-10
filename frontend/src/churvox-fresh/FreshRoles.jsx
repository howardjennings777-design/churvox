import React from "react";

const ROLES_KEY = "churvox:fresh-roles:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "ro-1",
    role: "Owner",
    access: "Full access",
    users: "Business owner",
    canApprove: "Yes",
    modules: "Everything",
    status: "Active",
    risk: "High control",
    note: "Owner can approve AI work, change billing, manage team, export payroll and update integrations.",
    blocked: "None",
  },
  {
    id: "ro-2",
    role: "Manager / Dispatcher",
    access: "Operations access",
    users: "Crew leads",
    canApprove: "Limited",
    modules: "Jobs, Dispatch, Clients, Quotes",
    status: "Active",
    risk: "Medium control",
    note: "Can run day-to-day work but large quotes, refunds and payroll edits still go to owner approval.",
    blocked: "Billing, payroll export, integrations",
  },
  {
    id: "ro-3",
    role: "Worker",
    access: "Mobile worker access",
    users: "Field staff",
    canApprove: "No",
    modules: "Assigned jobs, photos, notes, time logs",
    status: "Active",
    risk: "Low control",
    note: "Workers only see their jobs and can update time, job notes, photos and completion status.",
    blocked: "Pricing, invoices, reports, payroll, settings",
  },
];

function readRoles() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(ROLES_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveRoles(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ROLES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "roles" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendRoleToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `role-${item.id}-${Date.now()}`,
      group: "Roles",
      title: "Role permission needs owner review",
      info: `${item.role} · ${item.access} · approve: ${item.canApprove}`,
      urgency: item.risk,
      found: `${item.role} can access: ${item.modules}.`,
      prepared: "Churvox prepared a permission review for the owner.",
      why: item.note,
      owner: "Approve role, limit permissions, open Team, or update Settings.",
      area: "Roles / Permissions",
      page: "roles",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "role-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshRoles({ onNavigate }) {
  const [items, setItems] = React.useState(readRoles);
  const [selectedId, setSelectedId] = React.useState(() => readRoles()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const active = items.filter((item) => item.status === "Active").length;
  const approvers = items.filter((item) => item.canApprove === "Yes" || item.canApprove === "Limited").length;
  const locked = items.filter((item) => item.canApprove === "No").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveRoles(next);
      return next;
    });
  }

  function addRole() {
    const next = {
      id: `ro-${Date.now()}`,
      role: "New role",
      access: "Limited access",
      users: "Unassigned",
      canApprove: "No",
      modules: "Jobs only",
      status: "Draft",
      risk: "Low control",
      note: "Set what this role can see and approve.",
      blocked: "Billing, payroll, settings",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveRoles(updated);
  }

  function resetRoles() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveRoles(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendRoleToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshRolesPage">
      <div className="freshRolesHero">
        <div>
          <span>Roles / permissions</span>
          <h1>Give each person the right access, not the whole business</h1>
          <p>Control what owners, managers, payroll users and workers can see, edit, export and approve inside Churvox.</p>
        </div>

        <div className="freshRolesStats">
          <div><b>{total}</b><small>roles</small></div>
          <div><b>{active}</b><small>active</small></div>
          <div><b>{approvers}</b><small>approvers</small></div>
          <div><b>{locked}</b><small>locked down</small></div>
        </div>
      </div>

      <div className="freshRolesLayout">
        <aside className="freshRolesList">
          <header>
            <div>
              <b>Permission desk</b>
              <span>{approvers} roles can approve</span>
            </div>
            <button type="button" onClick={addRole}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.role}</b>
              <span>{item.access}</span>
              <small>Approve: {item.canApprove} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshRolesReset" onClick={resetRoles}>
            Reset roles
          </button>
        </aside>

        {selected && (
          <article className="freshRolesDetail">
            <div className="freshRolesHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.role}</h2>
                <p>{selected.access} · {selected.users} · {selected.risk}</p>
              </div>

              <div className="freshRolesHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("team")}>Open Team</button>
                <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
              </div>
            </div>

            <div className="freshRolesCards">
              <section>
                <span>Allowed modules</span>
                <b>{selected.access}</b>
                <p>{selected.modules}</p>
              </section>

              <section>
                <span>Approval power</span>
                <b>{selected.canApprove}</b>
                <p>Owner approval rules decide what must still go through Command.</p>
              </section>

              <section>
                <span>Blocked areas</span>
                <b>{selected.risk}</b>
                <p>{selected.blocked}</p>
              </section>
            </div>

            <div className="freshRolesForm">
              <label>
                <span>Role</span>
                <input value={selected.role} onChange={(event) => updateItem(selected.id, { role: event.target.value })} />
              </label>

              <label>
                <span>Access</span>
                <select value={selected.access} onChange={(event) => updateItem(selected.id, { access: event.target.value })}>
                  <option>Full access</option>
                  <option>Operations access</option>
                  <option>Payroll access</option>
                  <option>Mobile worker access</option>
                  <option>Limited access</option>
                  <option>Read only</option>
                </select>
              </label>

              <label>
                <span>Users</span>
                <input value={selected.users} onChange={(event) => updateItem(selected.id, { users: event.target.value })} />
              </label>

              <label>
                <span>Can approve</span>
                <select value={selected.canApprove} onChange={(event) => updateItem(selected.id, { canApprove: event.target.value })}>
                  <option>Yes</option>
                  <option>Limited</option>
                  <option>No</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Active</option>
                  <option>Draft</option>
                  <option>Suspended</option>
                  <option>Needs review</option>
                </select>
              </label>

              <label>
                <span>Risk</span>
                <select value={selected.risk} onChange={(event) => updateItem(selected.id, { risk: event.target.value })}>
                  <option>High control</option>
                  <option>Medium control</option>
                  <option>Low control</option>
                </select>
              </label>

              <label className="wide">
                <span>Modules</span>
                <textarea value={selected.modules} onChange={(event) => updateItem(selected.id, { modules: event.target.value })} />
              </label>

              <label className="wide">
                <span>Blocked</span>
                <textarea value={selected.blocked} onChange={(event) => updateItem(selected.id, { blocked: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshRolesActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Active" })}>Activate</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Suspended" })}>Suspend</button>
              <button type="button" onClick={() => onNavigate?.("approvals")}>Open Approvals</button>
              <button type="button" onClick={() => onNavigate?.("payroll")}>Open Payroll</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
