import React from "react";

const SETUP_KEY = "churvox:fresh-setup:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "su-1",
    task: "Add business details",
    area: "Settings",
    phase: "Foundation",
    owner: "Owner",
    status: "Done",
    priority: "High",
    due: "Before launch",
    action: "Confirm business name, GST, address, logo and contact details.",
    note: "This makes quotes, invoices and customer messages look real.",
  },
  {
    id: "su-2",
    task: "Invite team",
    area: "Team",
    phase: "People",
    owner: "Owner",
    status: "Needs owner",
    priority: "High",
    due: "This week",
    action: "Add workers, managers and payroll users with the right access.",
    note: "Start simple. Add adult kids or staff into roles they can learn on the job.",
  },
  {
    id: "su-3",
    task: "Connect accounting",
    area: "Integrations",
    phase: "Money",
    owner: "Owner",
    status: "Blocked",
    priority: "Medium",
    due: "After testing",
    action: "Confirm accounting sync setup and what syncs first.",
    note: "Keep phase one to invoices, customers and payment status.",
  },
];

function readSetup() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(SETUP_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveSetup(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETUP_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "setup" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendSetupToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `setup-${item.id}-${Date.now()}`,
      group: "Business Setup",
      title: "Setup task needs owner action",
      info: `${item.task} · ${item.area} · ${item.status}`,
      urgency: item.priority,
      found: `Setup task: ${item.action}`,
      prepared: "Churvox prepared the next setup action for owner review.",
      why: item.note,
      owner: "Complete task, mark blocked, open related area, or assign owner.",
      area: "Business Setup Checklist",
      page: "setup",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "setup-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshSetup({ onNavigate }) {
  const [items, setItems] = React.useState(readSetup);
  const [selectedId, setSelectedId] = React.useState(() => readSetup()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const done = items.filter((item) => item.status === "Done").length;
  const needsOwner = items.filter((item) => item.status === "Needs owner").length;
  const blocked = items.filter((item) => item.status === "Blocked").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveSetup(next);
      return next;
    });
  }

  function addTask() {
    const next = {
      id: `su-${Date.now()}`,
      task: "New setup task",
      area: "Settings",
      phase: "Foundation",
      owner: "Owner",
      status: "Needs owner",
      priority: "Medium",
      due: "Before launch",
      action: "Add setup action.",
      note: "Owner decides what must be ready before launch.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveSetup(updated);
  }

  function resetSetup() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveSetup(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendSetupToCommand(selected);
    onNavigate?.("command");
  }

  function openArea(area) {
    const map = {
      Settings: "settings",
      Team: "team",
      Integrations: "integrations",
      Plans: "plans",
      Jobs: "jobs",
      Clients: "clients",
      Invoices: "invoices",
    };
    onNavigate?.(map[area] || "settings");
  }

  return (
    <section className="freshSetupPage">
      <div className="freshSetupHero">
        <div>
          <span>Business setup checklist</span>
          <h1>Get Churvox launch-ready without going in circles</h1>
          <p>Track the owner setup jobs that matter: business details, team access, plans, integrations, invoices and first live workflows.</p>
        </div>

        <div className="freshSetupStats">
          <div><b>{total}</b><small>tasks</small></div>
          <div><b>{done}</b><small>done</small></div>
          <div><b>{needsOwner}</b><small>owner</small></div>
          <div><b>{blocked}</b><small>blocked</small></div>
        </div>
      </div>

      <div className="freshSetupLayout">
        <aside className="freshSetupList">
          <header>
            <div>
              <b>Setup path</b>
              <span>{needsOwner + blocked} need action</span>
            </div>
            <button type="button" onClick={addTask}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.task}</b>
              <span>{item.phase} · {item.area}</span>
              <small>{item.priority} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshSetupReset" onClick={resetSetup}>
            Reset setup checklist
          </button>
        </aside>

        {selected && (
          <article className="freshSetupDetail">
            <div className="freshSetupHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.task}</h2>
                <p>{selected.phase} · {selected.area} · due {selected.due}</p>
              </div>

              <div className="freshSetupHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => openArea(selected.area)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("plans")}>Open Plans</button>
              </div>
            </div>

            <div className="freshSetupCards">
              <section>
                <span>Next action</span>
                <b>{selected.area}</b>
                <p>{selected.action}</p>
              </section>

              <section>
                <span>Owner</span>
                <b>{selected.owner}</b>
                <p>Keep clear who has to finish or approve this setup item.</p>
              </section>

              <section>
                <span>Why it matters</span>
                <b>{selected.priority}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshSetupForm">
              <label>
                <span>Task</span>
                <input value={selected.task} onChange={(event) => updateItem(selected.id, { task: event.target.value })} />
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Settings</option>
                  <option>Team</option>
                  <option>Integrations</option>
                  <option>Plans</option>
                  <option>Jobs</option>
                  <option>Clients</option>
                  <option>Invoices</option>
                </select>
              </label>

              <label>
                <span>Phase</span>
                <select value={selected.phase} onChange={(event) => updateItem(selected.id, { phase: event.target.value })}>
                  <option>Foundation</option>
                  <option>People</option>
                  <option>Money</option>
                  <option>Workflow</option>
                  <option>Launch</option>
                </select>
              </label>

              <label>
                <span>Owner</span>
                <input value={selected.owner} onChange={(event) => updateItem(selected.id, { owner: event.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Not started</option>
                  <option>Needs owner</option>
                  <option>In progress</option>
                  <option>Blocked</option>
                  <option>Done</option>
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
                <span>Due</span>
                <input value={selected.due} onChange={(event) => updateItem(selected.id, { due: event.target.value })} />
              </label>

              <label className="wide">
                <span>Action</span>
                <textarea value={selected.action} onChange={(event) => updateItem(selected.id, { action: event.target.value })} />
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshSetupActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Done" })}>Mark done</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs owner" })}>Needs owner</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Blocked</button>
              <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
              <button type="button" onClick={() => onNavigate?.("integrations")}>Open Integrations</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
