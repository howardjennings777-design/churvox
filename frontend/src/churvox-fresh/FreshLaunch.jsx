import React from "react";

const LAUNCH_KEY = "churvox:fresh-launch:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "ln-1",
    item: "Owner flow tested",
    area: "Command",
    status: "Needs review",
    priority: "High",
    owner: "Owner",
    proof: "Command slips open, owner can approve, decline, edit and save decisions.",
    blocker: "Approval flow must feel clear before public launch.",
    nextAction: "Test Command on phone and desktop with cache-bust URL.",
  },
  {
    id: "ln-2",
    item: "Job to invoice flow tested",
    area: "Jobs",
    status: "In progress",
    priority: "High",
    owner: "Owner",
    proof: "Create job, assign worker, complete job, create invoice, mark paid.",
    blocker: "This is the core Job → Invoice → Paid → Synced promise.",
    nextAction: "Run one fake customer through the whole workflow.",
  },
  {
    id: "ln-3",
    item: "Pricing and trial checked",
    area: "Billing",
    status: "Ready",
    priority: "Medium",
    owner: "Owner",
    proof: "Start, Crew, Operator, Command and Growth Pack prices are visible.",
    blocker: "Pricing must match locked Churvox pricing.",
    nextAction: "Confirm 14-day free trial, no card wording.",
  },
];

function readLaunch() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(LAUNCH_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveLaunch(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAUNCH_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "launch" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendLaunchToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `launch-${item.id}-${Date.now()}`,
      group: "Launch",
      title: "Launch readiness item needs owner review",
      info: `${item.item} · ${item.status} · ${item.priority}`,
      urgency: item.priority,
      found: `${item.area} launch check is marked ${item.status}.`,
      prepared: `Churvox prepared launch action: ${item.nextAction}`,
      why: item.blocker,
      owner: "Approve readiness, fix blocker, open related area, or keep under review.",
      area: "Launch Readiness",
      page: "launch",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "launch-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshLaunch({ onNavigate }) {
  const [items, setItems] = React.useState(readLaunch);
  const [selectedId, setSelectedId] = React.useState(() => readLaunch()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const ready = items.filter((item) => item.status === "Ready").length;
  const review = items.filter((item) => item.status === "Needs review").length;
  const high = items.filter((item) => item.priority === "High").length;
  const percent = total ? Math.round((ready / total) * 100) : 0;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveLaunch(next);
      return next;
    });
  }

  function addCheck() {
    const next = {
      id: `ln-${Date.now()}`,
      item: "New launch check",
      area: "Setup",
      status: "Needs review",
      priority: "Medium",
      owner: "Owner",
      proof: "Add what must be tested.",
      blocker: "Add why this matters before launch.",
      nextAction: "Run the check and mark ready.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveLaunch(updated);
  }

  function resetLaunch() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveLaunch(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendLaunchToCommand(selected);
    onNavigate?.("command");
  }

  function openArea(area) {
    const map = {
      Command: "command",
      Jobs: "jobs",
      Billing: "billing",
      Setup: "setup",
      Security: "security",
      Imports: "imports",
      Backups: "backups",
      Plans: "plans",
      Team: "team",
      Invoices: "invoices",
    };
    onNavigate?.(map[area] || "setup");
  }

  return (
    <section className="freshLaunchPage">
      <div className="freshLaunchHero">
        <div>
          <span>Launch readiness</span>
          <h1>Stop going in circles and test what actually matters</h1>
          <p>One go-live checklist for owner flow, jobs, invoices, pricing, imports, security, backups, worker flow and Command approval.</p>
        </div>

        <div className="freshLaunchStats">
          <div><b>{percent}%</b><small>ready</small></div>
          <div><b>{total}</b><small>checks</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{high}</b><small>high priority</small></div>
        </div>
      </div>

      <div className="freshLaunchMeter">
        <div>
          <span>{ready} ready</span>
          <b>{percent}% launch confidence</b>
        </div>
        <i style={{ width: `${percent}%` }} />
      </div>

      <div className="freshLaunchLayout">
        <aside className="freshLaunchList">
          <header>
            <div>
              <b>Go-live desk</b>
              <span>{review} need owner review</span>
            </div>
            <button type="button" onClick={addCheck}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.item}</b>
              <span>{item.area} · {item.owner}</span>
              <small>{item.status} · {item.priority}</small>
            </button>
          ))}

          <button type="button" className="freshLaunchReset" onClick={resetLaunch}>
            Reset launch checks
          </button>
        </aside>

        {selected && (
          <article className="freshLaunchDetail">
            <div className="freshLaunchHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.item}</h2>
                <p>{selected.area} · {selected.owner} · {selected.priority} priority</p>
              </div>

              <div className="freshLaunchHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => openArea(selected.area)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("setup")}>Open Setup</button>
              </div>
            </div>

            <div className="freshLaunchCards">
              <section>
                <span>Proof needed</span>
                <b>{selected.area}</b>
                <p>{selected.proof}</p>
              </section>

              <section>
                <span>Launch blocker</span>
                <b>{selected.priority}</b>
                <p>{selected.blocker}</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.status}</b>
                <p>{selected.nextAction}</p>
              </section>
            </div>

            <div className="freshLaunchForm">
              <label>
                <span>Check</span>
                <input value={selected.item} onChange={(event) => updateItem(selected.id, { item: event.target.value })} />
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Command</option>
                  <option>Jobs</option>
                  <option>Billing</option>
                  <option>Setup</option>
                  <option>Security</option>
                  <option>Imports</option>
                  <option>Backups</option>
                  <option>Plans</option>
                  <option>Team</option>
                  <option>Invoices</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Ready</option>
                  <option>In progress</option>
                  <option>Needs review</option>
                  <option>Blocked</option>
                  <option>Not started</option>
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
                <span>Owner</span>
                <input value={selected.owner} onChange={(event) => updateItem(selected.id, { owner: event.target.value })} />
              </label>

              <label className="wide">
                <span>Proof needed</span>
                <textarea value={selected.proof} onChange={(event) => updateItem(selected.id, { proof: event.target.value })} />
              </label>

              <label className="wide">
                <span>Blocker / why it matters</span>
                <textarea value={selected.blocker} onChange={(event) => updateItem(selected.id, { blocker: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>
            </div>

            <div className="freshLaunchActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Ready" })}>Mark ready</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Blocked</button>
              <button type="button" onClick={() => onNavigate?.("security")}>Open Security</button>
              <button type="button" onClick={() => onNavigate?.("billing")}>Open Billing</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
