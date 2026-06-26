import React from "react";

const FLAGS_KEY = "churvox:fresh-flags:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "fl-1",
    feature: "Quick SMS",
    area: "Messages",
    status: "Coming soon",
    visibility: "Hidden from live use",
    ownerApproval: "Required",
    risk: "High",
    effect: "Shows Coming Soon instead of letting users send SMS.",
    note: "Keeps SMS safe until provider, pricing and consent rules are ready.",
    nextAction: "Keep disabled for launch.",
  },
  {
    id: "fl-2",
    feature: "GPS / Time on Site",
    area: "GPS",
    status: "Preview only",
    visibility: "Visible as placeholder",
    ownerApproval: "Required",
    risk: "Medium",
    effect: "Lets owners understand the workflow without collecting live location.",
    note: "Good sales preview, but not a live tracking feature yet.",
    nextAction: "Keep labelled as placeholder.",
  },
  {
    id: "fl-3",
    feature: "Accounting sync planning",
    area: "Integrations",
    status: "Disabled",
    visibility: "Placeholder only",
    ownerApproval: "Required",
    risk: "High",
    effect: "Prevents accounting data moving before partner review is ready.",
    note: "Accounting sync planning can stay visible, but live sync must stay owner-approved.",
    nextAction: "Enable only after scopes, callbacks, consent and security review.",
  },
];

function readFlags() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(FLAGS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveFlags(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FLAGS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "flags" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendFlagToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `flag-${item.id}-${Date.now()}`,
      group: "Feature Flags",
      title: "Feature flag needs owner review",
      info: `${item.feature} · ${item.status} · ${item.risk} risk`,
      urgency: item.risk,
      found: `${item.feature} is currently ${item.status}.`,
      prepared: `Churvox prepared flag action: ${item.nextAction}`,
      why: item.note,
      owner: "Approve visibility, disable feature, open related page, or keep as coming soon.",
      area: "Feature Flags",
      page: "flags",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "flag-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshFlags({ onNavigate }) {
  const [items, setItems] = React.useState(readFlags);
  const [selectedId, setSelectedId] = React.useState(() => readFlags()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const disabled = items.filter((item) => item.status === "Disabled").length;
  const comingSoon = items.filter((item) => item.status === "Coming soon").length;
  const highRisk = items.filter((item) => item.risk === "High").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveFlags(next);
      return next;
    });
  }

  function addFlag() {
    const next = {
      id: `fl-${Date.now()}`,
      feature: "New feature flag",
      area: "Settings",
      status: "Disabled",
      visibility: "Hidden from live use",
      ownerApproval: "Required",
      risk: "Medium",
      effect: "Describe what this switch controls.",
      note: "Owner decides before launch.",
      nextAction: "Review before enabling.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveFlags(updated);
  }

  function resetFlags() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveFlags(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendFlagToCommand(selected);
    onNavigate?.("command");
  }

  function openArea(area) {
    const map = {
      Messages: "messages",
      GPS: "gps",
      Integrations: "integrations",
      Billing: "billing",
      Payroll: "payroll",
      Worker: "worker",
      Settings: "settings",
      Security: "security",
    };
    onNavigate?.(map[area] || "settings");
  }

  return (
    <section className="freshFlagsPage">
      <div className="freshFlagsHero">
        <div>
          <span>Feature flags</span>
          <h1>Control what is live, hidden, preview-only or coming soon</h1>
          <p>Keep risky features safe at launch: SMS, GPS, accounting sync, payroll exports, worker tools and AI automation.</p>
        </div>

        <div className="freshFlagsStats">
          <div><b>{total}</b><small>flags</small></div>
          <div><b>{disabled}</b><small>disabled</small></div>
          <div><b>{comingSoon}</b><small>coming soon</small></div>
          <div><b>{highRisk}</b><small>high risk</small></div>
        </div>
      </div>

      <div className="freshFlagsLayout">
        <aside className="freshFlagsList">
          <header>
            <div>
              <b>Control desk</b>
              <span>{disabled + comingSoon} not live</span>
            </div>
            <button type="button" onClick={addFlag}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.feature}</b>
              <span>{item.area} · {item.visibility}</span>
              <small>{item.status} · {item.risk} risk</small>
            </button>
          ))}

          <button type="button" className="freshFlagsReset" onClick={resetFlags}>
            Reset flags
          </button>
        </aside>

        {selected && (
          <article className="freshFlagsDetail">
            <div className="freshFlagsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.feature}</h2>
                <p>{selected.area} · {selected.visibility} · {selected.ownerApproval}</p>
              </div>

              <div className="freshFlagsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => openArea(selected.area)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("security")}>Open Security</button>
              </div>
            </div>

            <div className="freshFlagsCards">
              <section>
                <span>Effect</span>
                <b>{selected.visibility}</b>
                <p>{selected.effect}</p>
              </section>

              <section>
                <span>Risk</span>
                <b>{selected.risk}</b>
                <p>{selected.note}</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.status}</b>
                <p>{selected.nextAction}</p>
              </section>
            </div>

            <div className="freshFlagsForm">
              <label>
                <span>Feature</span>
                <input value={selected.feature} onChange={(event) => updateItem(selected.id, { feature: event.target.value })} />
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Messages</option>
                  <option>GPS</option>
                  <option>Integrations</option>
                  <option>Billing</option>
                  <option>Payroll</option>
                  <option>Worker</option>
                  <option>Settings</option>
                  <option>Security</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Enabled</option>
                  <option>Disabled</option>
                  <option>Coming soon</option>
                  <option>Preview only</option>
                  <option>Owner only</option>
                  <option>Blocked</option>
                </select>
              </label>

              <label>
                <span>Visibility</span>
                <select value={selected.visibility} onChange={(event) => updateItem(selected.id, { visibility: event.target.value })}>
                  <option>Visible</option>
                  <option>Hidden from live use</option>
                  <option>Placeholder only</option>
                  <option>Visible as placeholder</option>
                  <option>Owner only</option>
                  <option>Internal only</option>
                </select>
              </label>

              <label>
                <span>Owner approval</span>
                <select value={selected.ownerApproval} onChange={(event) => updateItem(selected.id, { ownerApproval: event.target.value })}>
                  <option>Required</option>
                  <option>Optional</option>
                  <option>Not required</option>
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

              <label className="wide">
                <span>Effect</span>
                <textarea value={selected.effect} onChange={(event) => updateItem(selected.id, { effect: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>
            </div>

            <div className="freshFlagsActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Enabled", visibility: "Visible" })}>Enable</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Disabled", visibility: "Hidden from live use" })}>Disable</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Coming soon", visibility: "Placeholder only" })}>Coming soon</button>
              <button type="button" onClick={() => onNavigate?.("qa")}>Open QA</button>
              <button type="button" onClick={() => onNavigate?.("launch")}>Open Launch</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
