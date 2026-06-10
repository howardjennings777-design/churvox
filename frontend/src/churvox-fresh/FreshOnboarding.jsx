import React from "react";

const ONBOARDING_KEY = "churvox:fresh-onboarding:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "ob-1",
    step: "Finish business profile",
    area: "Settings",
    status: "Needs owner",
    stage: "Day one",
    owner: "Owner",
    priority: "High",
    outcome: "Quotes, invoices and messages show the right business details.",
    action: "Add business name, logo, GST, address, phone and email.",
    help: "This is the first thing a new signup should complete.",
  },
  {
    id: "ob-2",
    step: "Add first client and job",
    area: "Clients",
    status: "In progress",
    stage: "Day one",
    owner: "Owner",
    priority: "High",
    outcome: "The owner sees Churvox working on real business data.",
    action: "Create one real client and one simple job.",
    help: "This gets them from signup into the actual job workflow.",
  },
  {
    id: "ob-3",
    step: "Try Command approval",
    area: "Command",
    status: "Not started",
    stage: "First week",
    owner: "Owner",
    priority: "High",
    outcome: "Owner understands: Churvox does the admin. You approve.",
    action: "Send one setup, invoice, quote or follow-up item to Command.",
    help: "This is the moment that explains the product.",
  },
];

function readOnboarding() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(ONBOARDING_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveOnboarding(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "onboarding" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendOnboardingToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `onboarding-${item.id}-${Date.now()}`,
      group: "Onboarding",
      title: "New signup onboarding step needs owner review",
      info: `${item.step} · ${item.status} · ${item.priority}`,
      urgency: item.priority,
      found: `${item.area} onboarding step is marked ${item.status}.`,
      prepared: `Churvox prepared onboarding action: ${item.action}`,
      why: item.outcome,
      owner: "Complete step, open related area, update status, or keep under review.",
      area: "Customer Onboarding",
      page: "onboarding",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "onboarding-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshOnboarding({ onNavigate }) {
  const [items, setItems] = React.useState(readOnboarding);
  const [selectedId, setSelectedId] = React.useState(() => readOnboarding()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const done = items.filter((item) => item.status === "Done").length;
  const needsOwner = items.filter((item) => item.status === "Needs owner").length;
  const high = items.filter((item) => item.priority === "High").length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveOnboarding(next);
      return next;
    });
  }

  function addStep() {
    const next = {
      id: `ob-${Date.now()}`,
      step: "New onboarding step",
      area: "Setup",
      status: "Needs owner",
      stage: "Day one",
      owner: "Owner",
      priority: "Medium",
      outcome: "Add the customer outcome.",
      action: "Add the next action.",
      help: "Add helper text for the new signup.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveOnboarding(updated);
  }

  function resetOnboarding() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveOnboarding(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendOnboardingToCommand(selected);
    onNavigate?.("command");
  }

  function openArea(area) {
    const map = {
      Settings: "settings",
      Clients: "clients",
      Command: "command",
      Setup: "setup",
      Team: "team",
      Jobs: "jobs",
      Quotes: "quotes",
      Invoices: "invoices",
      Plans: "plans",
      Worker: "worker",
    };
    onNavigate?.(map[area] || "setup");
  }

  return (
    <section className="freshOnboardingPage">
      <div className="freshOnboardingHero">
        <div>
          <span>Customer onboarding</span>
          <h1>Help every new owner get their first win fast</h1>
          <p>Guide new signups from profile setup to first client, first job, first invoice and first Command approval.</p>
        </div>

        <div className="freshOnboardingStats">
          <div><b>{percent}%</b><small>complete</small></div>
          <div><b>{total}</b><small>steps</small></div>
          <div><b>{needsOwner}</b><small>owner</small></div>
          <div><b>{high}</b><small>high priority</small></div>
        </div>
      </div>

      <div className="freshOnboardingMeter">
        <div>
          <span>{done} done</span>
          <b>{percent}% first-run progress</b>
        </div>
        <i style={{ width: `${percent}%` }} />
      </div>

      <div className="freshOnboardingLayout">
        <aside className="freshOnboardingList">
          <header>
            <div>
              <b>First-run desk</b>
              <span>{needsOwner} need owner action</span>
            </div>
            <button type="button" onClick={addStep}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.step}</b>
              <span>{item.area} · {item.stage}</span>
              <small>{item.status} · {item.priority}</small>
            </button>
          ))}

          <button type="button" className="freshOnboardingReset" onClick={resetOnboarding}>
            Reset onboarding
          </button>
        </aside>

        {selected && (
          <article className="freshOnboardingDetail">
            <div className="freshOnboardingHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.step}</h2>
                <p>{selected.area} · {selected.stage} · {selected.owner}</p>
              </div>

              <div className="freshOnboardingHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => openArea(selected.area)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("launch")}>Open Launch</button>
              </div>
            </div>

            <div className="freshOnboardingCards">
              <section>
                <span>Customer outcome</span>
                <b>{selected.area}</b>
                <p>{selected.outcome}</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.priority}</b>
                <p>{selected.action}</p>
              </section>

              <section>
                <span>Help text</span>
                <b>{selected.stage}</b>
                <p>{selected.help}</p>
              </section>
            </div>

            <div className="freshOnboardingForm">
              <label>
                <span>Step</span>
                <input value={selected.step} onChange={(event) => updateItem(selected.id, { step: event.target.value })} />
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Settings</option>
                  <option>Clients</option>
                  <option>Command</option>
                  <option>Setup</option>
                  <option>Team</option>
                  <option>Jobs</option>
                  <option>Quotes</option>
                  <option>Invoices</option>
                  <option>Plans</option>
                  <option>Worker</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Done</option>
                  <option>In progress</option>
                  <option>Needs owner</option>
                  <option>Not started</option>
                  <option>Blocked</option>
                </select>
              </label>

              <label>
                <span>Stage</span>
                <select value={selected.stage} onChange={(event) => updateItem(selected.id, { stage: event.target.value })}>
                  <option>Day one</option>
                  <option>First week</option>
                  <option>Before trial ends</option>
                  <option>After first job</option>
                  <option>Launch</option>
                </select>
              </label>

              <label>
                <span>Owner</span>
                <input value={selected.owner} onChange={(event) => updateItem(selected.id, { owner: event.target.value })} />
              </label>

              <label>
                <span>Priority</span>
                <select value={selected.priority} onChange={(event) => updateItem(selected.id, { priority: event.target.value })}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>

              <label className="wide">
                <span>Outcome</span>
                <textarea value={selected.outcome} onChange={(event) => updateItem(selected.id, { outcome: event.target.value })} />
              </label>

              <label className="wide">
                <span>Action</span>
                <textarea value={selected.action} onChange={(event) => updateItem(selected.id, { action: event.target.value })} />
              </label>

              <label className="wide">
                <span>Help text</span>
                <textarea value={selected.help} onChange={(event) => updateItem(selected.id, { help: event.target.value })} />
              </label>
            </div>

            <div className="freshOnboardingActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Done" })}>Mark done</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs owner" })}>Needs owner</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Blocked</button>
              <button type="button" onClick={() => onNavigate?.("setup")}>Open Setup</button>
              <button type="button" onClick={() => onNavigate?.("plans")}>Open Plans</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
