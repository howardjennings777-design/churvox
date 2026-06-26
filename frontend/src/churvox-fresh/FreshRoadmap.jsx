import React from "react";

const ROADMAP_KEY = "churvox:fresh-roadmap:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "rm-1",
    title: "Launch polish and mobile fixes",
    lane: "Now",
    area: "Launch",
    priority: "High",
    owner: "Owner",
    effort: "Medium",
    value: "Makes Churvox feel trustworthy before anyone pays.",
    risk: "Bad mobile taps, invisible text, or confusing flows hurt launch confidence.",
    nextAction: "Finish QA list and keep testing fresh pages on phone.",
  },
  {
    id: "rm-2",
    title: "Accounting sync approval flow",
    lane: "Next",
    area: "Integrations",
    priority: "High",
    owner: "Owner",
    effort: "Large",
    value: "Accounting sync clarity helps close serious businesses.",
    risk: "Do not enable live sync until consent, scopes, callbacks and review are ready.",
    nextAction: "Keep accounting sync review-first until partner and security checks pass.",
  },
  {
    id: "rm-3",
    title: "Worker app simple field mode",
    lane: "Next",
    area: "Worker",
    priority: "High",
    owner: "Owner",
    effort: "Medium",
    value: "Workers can acknowledge, start, pause, complete and upload proof without training.",
    risk: "If worker flow is confusing, owners will not trust job timing or payroll hours.",
    nextAction: "Test worker flow with one fake job from assigned to completed.",
  },
];

function readRoadmap() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(ROADMAP_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveRoadmap(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ROADMAP_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "roadmap" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendRoadmapToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `roadmap-${item.id}-${Date.now()}`,
      group: "Roadmap",
      title: "Roadmap priority needs owner review",
      info: `${item.title} · ${item.lane} · ${item.priority}`,
      urgency: item.priority,
      found: `${item.area} roadmap item is in ${item.lane}.`,
      prepared: `Churvox prepared roadmap action: ${item.nextAction}`,
      why: item.value,
      owner: "Approve priority, move lane, open related area, or park it.",
      area: "Product Roadmap",
      page: "roadmap",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "roadmap-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshRoadmap({ onNavigate }) {
  const [items, setItems] = React.useState(readRoadmap);
  const [selectedId, setSelectedId] = React.useState(() => readRoadmap()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const now = items.filter((item) => item.lane === "Now").length;
  const next = items.filter((item) => item.lane === "Next").length;
  const high = items.filter((item) => item.priority === "High").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const updated = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveRoadmap(updated);
      return updated;
    });
  }

  function addRoadmapItem() {
    const nextItem = {
      id: `rm-${Date.now()}`,
      title: "New roadmap item",
      lane: "Later",
      area: "Command",
      priority: "Medium",
      owner: "Owner",
      effort: "Medium",
      value: "Add why this helps Churvox grow.",
      risk: "Add risk if ignored or launched too early.",
      nextAction: "Decide if this is Now, Next, Later or Parked.",
    };

    const updated = [nextItem, ...items];
    setItems(updated);
    setSelectedId(nextItem.id);
    saveRoadmap(updated);
  }

  function resetRoadmap() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveRoadmap(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendRoadmapToCommand(selected);
    onNavigate?.("command");
  }

  function openArea(area) {
    const map = {
      Launch: "launch",
      Integrations: "integrations",
      Worker: "worker",
      Command: "command",
      Billing: "billing",
      QA: "qa",
      Feedback: "feedback",
      Flags: "flags",
      Security: "security",
      Jobs: "jobs",
    };
    onNavigate?.(map[area] || "launch");
  }

  return (
    <section className="freshRoadmapPage">
      <div className="freshRoadmapHero">
        <div>
          <span>Product roadmap</span>
          <h1>Keep Churvox focused on what gets it launched and paid</h1>
          <p>Sort feedback, bugs, sales blockers and big ideas into Now, Next, Later or Parked so the app stops going in circles.</p>
        </div>

        <div className="freshRoadmapStats">
          <div><b>{total}</b><small>items</small></div>
          <div><b>{now}</b><small>now</small></div>
          <div><b>{next}</b><small>next</small></div>
          <div><b>{high}</b><small>high priority</small></div>
        </div>
      </div>

      <div className="freshRoadmapLayout">
        <aside className="freshRoadmapList">
          <header>
            <div>
              <b>Priority desk</b>
              <span>{now + next} active priorities</span>
            </div>
            <button type="button" onClick={addRoadmapItem}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.title}</b>
              <span>{item.area} · {item.lane}</span>
              <small>{item.priority} · {item.effort} effort</small>
            </button>
          ))}

          <button type="button" className="freshRoadmapReset" onClick={resetRoadmap}>
            Reset roadmap
          </button>
        </aside>

        {selected && (
          <article className="freshRoadmapDetail">
            <div className="freshRoadmapHead">
              <div>
                <span>{selected.lane}</span>
                <h2>{selected.title}</h2>
                <p>{selected.area} · {selected.priority} priority · {selected.effort} effort</p>
              </div>

              <div className="freshRoadmapHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => openArea(selected.area)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("feedback")}>Open Feedback</button>
              </div>
            </div>

            <div className="freshRoadmapCards">
              <section>
                <span>Value</span>
                <b>{selected.priority}</b>
                <p>{selected.value}</p>
              </section>

              <section>
                <span>Risk</span>
                <b>{selected.effort}</b>
                <p>{selected.risk}</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.lane}</b>
                <p>{selected.nextAction}</p>
              </section>
            </div>

            <div className="freshRoadmapForm">
              <label>
                <span>Title</span>
                <input value={selected.title} onChange={(event) => updateItem(selected.id, { title: event.target.value })} />
              </label>

              <label>
                <span>Lane</span>
                <select value={selected.lane} onChange={(event) => updateItem(selected.id, { lane: event.target.value })}>
                  <option>Now</option>
                  <option>Next</option>
                  <option>Later</option>
                  <option>Parked</option>
                  <option>Done</option>
                </select>
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Launch</option>
                  <option>Integrations</option>
                  <option>Worker</option>
                  <option>Command</option>
                  <option>Billing</option>
                  <option>QA</option>
                  <option>Feedback</option>
                  <option>Flags</option>
                  <option>Security</option>
                  <option>Jobs</option>
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

              <label>
                <span>Effort</span>
                <select value={selected.effort} onChange={(event) => updateItem(selected.id, { effort: event.target.value })}>
                  <option>Small</option>
                  <option>Medium</option>
                  <option>Large</option>
                  <option>Unknown</option>
                </select>
              </label>

              <label className="wide">
                <span>Value</span>
                <textarea value={selected.value} onChange={(event) => updateItem(selected.id, { value: event.target.value })} />
              </label>

              <label className="wide">
                <span>Risk</span>
                <textarea value={selected.risk} onChange={(event) => updateItem(selected.id, { risk: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>
            </div>

            <div className="freshRoadmapActions">
              <button type="button" onClick={() => updateItem(selected.id, { lane: "Now" })}>Move to Now</button>
              <button type="button" onClick={() => updateItem(selected.id, { lane: "Next" })}>Move to Next</button>
              <button type="button" onClick={() => updateItem(selected.id, { lane: "Parked" })}>Park it</button>
              <button type="button" onClick={() => onNavigate?.("qa")}>Open QA</button>
              <button type="button" onClick={() => onNavigate?.("launch")}>Open Launch</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
