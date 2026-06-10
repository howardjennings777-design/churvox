import React from "react";

const SAFETY_KEY = "churvox:fresh-safety:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "safe-1",
    site: "Lower Hutt Medical Centre",
    job: "Garden tidy",
    risk: "Public access",
    level: "Medium",
    status: "Checked",
    owner: "Ana Williams",
    ppe: "Gloves, glasses, cones",
    action: "Put cones around work zone and keep tools off path.",
    note: "Public foot traffic during working hours.",
  },
  {
    id: "safe-2",
    site: "Birchville Rentals",
    job: "Driveway clean",
    risk: "Tenant access not confirmed",
    level: "High",
    status: "Blocked",
    owner: "Owner",
    ppe: "Water blaster PPE",
    action: "Confirm access before dispatch.",
    note: "Do not send worker until tenant has confirmed gate access.",
  },
  {
    id: "safe-3",
    site: "Aroha Property Care",
    job: "Lawn service",
    risk: "Slope / wet grass",
    level: "Low",
    status: "Ready",
    owner: "Matiu Rangi",
    ppe: "Boots, glasses, ear protection",
    action: "Use safe mowing direction on wet slope.",
    note: "Normal safety reminder for repeat lawn visit.",
  },
];

function readSafety() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(SAFETY_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveSafety(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SAFETY_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "safety" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendSafetyToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `safety-${item.id}-${Date.now()}`,
      group: "Safety",
      title: "Safety check needs owner review",
      info: `${item.site} · ${item.risk} · ${item.level}`,
      urgency: item.level === "High" || item.status === "Blocked" ? "Safety risk" : item.status,
      found: `${item.job} has a ${item.level.toLowerCase()} risk: ${item.risk}.`,
      prepared: item.action,
      why: item.note,
      owner: "Approve safety check, block dispatch, edit action, or open job.",
      area: "Safety",
      page: "safety",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "safety-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshSafety({ onNavigate }) {
  const [items, setItems] = React.useState(readSafety);
  const [selectedId, setSelectedId] = React.useState(() => readSafety()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const high = items.filter((item) => item.level === "High").length;
  const blocked = items.filter((item) => item.status === "Blocked").length;
  const checked = items.filter((item) => item.status === "Checked").length;
  const ready = items.filter((item) => item.status === "Ready").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveSafety(next);
      return next;
    });
  }

  function addSafetyCheck() {
    const next = {
      id: `safe-${Date.now()}`,
      site: "New site",
      job: "New job",
      risk: "Add risk",
      level: "Medium",
      status: "Ready",
      owner: "Owner",
      ppe: "Add PPE",
      action: "Add safety action.",
      note: "Add safety note.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveSafety(updated);
  }

  function resetSafety() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveSafety(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendSafetyToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshSafetyPage">
      <div className="freshSafetyHero">
        <div>
          <span>Safety / site checks</span>
          <h1>Stop risky jobs before they reach the worker</h1>
          <p>Track hazards, PPE, access risks, site instructions and owner approval before dispatch.</p>
        </div>

        <div className="freshSafetyStats">
          <div><b>{items.length}</b><small>checks</small></div>
          <div><b>{high}</b><small>high risk</small></div>
          <div><b>{blocked}</b><small>blocked</small></div>
          <div><b>{checked}</b><small>checked</small></div>
        </div>
      </div>

      <div className="freshSafetyLayout">
        <aside className="freshSafetyList">
          <header>
            <div>
              <b>Safety queue</b>
              <span>{ready} ready</span>
            </div>
            <button type="button" onClick={addSafetyCheck}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.site}</b>
              <span>{item.risk}</span>
              <small>{item.level} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshSafetyReset" onClick={resetSafety}>
            Reset safety
          </button>
        </aside>

        {selected && (
          <article className="freshSafetyDetail">
            <div className="freshSafetyHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.site}</h2>
                <p>{selected.job} · {selected.risk}</p>
              </div>

              <div className="freshSafetyHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
                <button type="button" onClick={() => onNavigate?.("dispatch")}>Open Dispatch</button>
              </div>
            </div>

            <div className="freshSafetyCards">
              <section>
                <span>Risk level</span>
                <b>{selected.level}</b>
                <p>{selected.risk}</p>
              </section>

              <section>
                <span>PPE</span>
                <b>{selected.ppe}</b>
                <p>Worker safety gear and site requirements.</p>
              </section>

              <section>
                <span>Action</span>
                <b>{selected.owner}</b>
                <p>{selected.action}</p>
              </section>
            </div>

            <div className="freshSafetyForm">
              <label>
                <span>Site</span>
                <input value={selected.site} onChange={(event) => updateItem(selected.id, { site: event.target.value })} />
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Risk</span>
                <input value={selected.risk} onChange={(event) => updateItem(selected.id, { risk: event.target.value })} />
              </label>

              <label>
                <span>Level</span>
                <select value={selected.level} onChange={(event) => updateItem(selected.id, { level: event.target.value })}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Ready</option>
                  <option>Checked</option>
                  <option>Needs owner</option>
                  <option>Blocked</option>
                  <option>Incident</option>
                  <option>Closed</option>
                </select>
              </label>

              <label>
                <span>Owner</span>
                <input value={selected.owner} onChange={(event) => updateItem(selected.id, { owner: event.target.value })} />
              </label>

              <label className="wide">
                <span>PPE</span>
                <input value={selected.ppe} onChange={(event) => updateItem(selected.id, { ppe: event.target.value })} />
              </label>

              <label className="wide">
                <span>Safety action</span>
                <textarea value={selected.action} onChange={(event) => updateItem(selected.id, { action: event.target.value })} />
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshSafetyActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Checked" })}>Mark checked</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Block dispatch</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Incident" })}>Mark incident</button>
              <button type="button" onClick={() => onNavigate?.("documents")}>Open Documents</button>
              <button type="button" onClick={() => onNavigate?.("worker")}>Open Worker</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
