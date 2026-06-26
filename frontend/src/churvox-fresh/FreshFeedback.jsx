import React from "react";

const FEEDBACK_KEY = "churvox:fresh-feedback:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "fb-1",
    title: "Need easier worker mobile flow",
    source: "Beta tester",
    area: "Worker",
    status: "Needs review",
    priority: "High",
    type: "Usability",
    impact: "Workers need to acknowledge, start, pause, complete and upload photos without confusion.",
    decision: "Keep worker screen simple and mobile-first.",
    note: "This matters because field staff will use phones, not laptops.",
  },
  {
    id: "fb-2",
    title: "Customer wants accounting sync clarity",
    source: "Prospect",
    area: "Integrations",
    status: "Planned",
    priority: "High",
    type: "Sales blocker",
    impact: "Prospects want to know what syncs, when, and whether it is safe.",
    decision: "Keep placeholders visible but clearly not live until approved.",
    note: "Good for partner review and sales conversations.",
  },
  {
    id: "fb-3",
    title: "Text must be readable everywhere",
    source: "Owner testing",
    area: "Design",
    status: "Done",
    priority: "High",
    type: "Bug",
    impact: "Invisible text makes the app feel broken.",
    decision: "Force readable text on cards, forms, buttons and mobile pages.",
    note: "This was one of the biggest visual trust issues.",
  },
];

function readFeedback() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(FEEDBACK_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveFeedback(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "feedback" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendFeedbackToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `feedback-${item.id}-${Date.now()}`,
      group: "Feedback",
      title: "Customer feedback needs owner review",
      info: `${item.title} · ${item.status} · ${item.priority}`,
      urgency: item.priority,
      found: `${item.source} feedback for ${item.area}.`,
      prepared: `Churvox prepared decision: ${item.decision}`,
      why: item.impact,
      owner: "Accept, park, open related area, or turn into launch/roadmap work.",
      area: "Customer Feedback",
      page: "feedback",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "feedback-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshFeedback({ onNavigate }) {
  const [items, setItems] = React.useState(readFeedback);
  const [selectedId, setSelectedId] = React.useState(() => readFeedback()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const review = items.filter((item) => item.status === "Needs review").length;
  const planned = items.filter((item) => item.status === "Planned").length;
  const high = items.filter((item) => item.priority === "High").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveFeedback(next);
      return next;
    });
  }

  function addFeedback() {
    const next = {
      id: `fb-${Date.now()}`,
      title: "New feedback",
      source: "Customer",
      area: "Command",
      status: "Needs review",
      priority: "Medium",
      type: "Feature request",
      impact: "Add customer impact.",
      decision: "Decide whether to do now, later, or not at all.",
      note: "Feedback only matters if it helps launch, sales, trust or retention.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveFeedback(updated);
  }

  function resetFeedback() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveFeedback(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendFeedbackToCommand(selected);
    onNavigate?.("command");
  }

  function openArea(area) {
    const map = {
      Worker: "worker",
      Integrations: "integrations",
      Design: "qa",
      Command: "command",
      Jobs: "jobs",
      Billing: "billing",
      Mobile: "worker",
      Security: "security",
      Launch: "launch",
      Plans: "plans",
    };
    onNavigate?.(map[area] || "command");
  }

  return (
    <section className="freshFeedbackPage">
      <div className="freshFeedbackHero">
        <div>
          <span>Customer feedback</span>
          <h1>Turn real feedback into better launch decisions</h1>
          <p>Track beta tester notes, prospect questions, bug reports, sales blockers and feature requests without losing what matters.</p>
        </div>

        <div className="freshFeedbackStats">
          <div><b>{total}</b><small>items</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{planned}</b><small>planned</small></div>
          <div><b>{high}</b><small>high priority</small></div>
        </div>
      </div>

      <div className="freshFeedbackLayout">
        <aside className="freshFeedbackList">
          <header>
            <div>
              <b>Feedback desk</b>
              <span>{review} need owner review</span>
            </div>
            <button type="button" onClick={addFeedback}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.title}</b>
              <span>{item.source} · {item.area}</span>
              <small>{item.status} · {item.priority}</small>
            </button>
          ))}

          <button type="button" className="freshFeedbackReset" onClick={resetFeedback}>
            Reset feedback
          </button>
        </aside>

        {selected && (
          <article className="freshFeedbackDetail">
            <div className="freshFeedbackHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.title}</h2>
                <p>{selected.source} · {selected.area} · {selected.type}</p>
              </div>

              <div className="freshFeedbackHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => openArea(selected.area)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("launch")}>Open Launch</button>
              </div>
            </div>

            <div className="freshFeedbackCards">
              <section>
                <span>Impact</span>
                <b>{selected.priority}</b>
                <p>{selected.impact}</p>
              </section>

              <section>
                <span>Decision</span>
                <b>{selected.status}</b>
                <p>{selected.decision}</p>
              </section>

              <section>
                <span>Owner note</span>
                <b>{selected.type}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshFeedbackForm">
              <label>
                <span>Title</span>
                <input value={selected.title} onChange={(event) => updateItem(selected.id, { title: event.target.value })} />
              </label>

              <label>
                <span>Source</span>
                <select value={selected.source} onChange={(event) => updateItem(selected.id, { source: event.target.value })}>
                  <option>Customer</option>
                  <option>Prospect</option>
                  <option>Beta tester</option>
                  <option>Owner testing</option>
                  <option>Support</option>
                  <option>Sales call</option>
                </select>
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Command</option>
                  <option>Worker</option>
                  <option>Integrations</option>
                  <option>Design</option>
                  <option>Jobs</option>
                  <option>Billing</option>
                  <option>Mobile</option>
                  <option>Security</option>
                  <option>Launch</option>
                  <option>Plans</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Needs review</option>
                  <option>Planned</option>
                  <option>In progress</option>
                  <option>Done</option>
                  <option>Parked</option>
                  <option>Declined</option>
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
                <span>Type</span>
                <select value={selected.type} onChange={(event) => updateItem(selected.id, { type: event.target.value })}>
                  <option>Bug</option>
                  <option>Feature request</option>
                  <option>Sales blocker</option>
                  <option>Usability</option>
                  <option>Pricing</option>
                  <option>Trust issue</option>
                </select>
              </label>

              <label className="wide">
                <span>Impact</span>
                <textarea value={selected.impact} onChange={(event) => updateItem(selected.id, { impact: event.target.value })} />
              </label>

              <label className="wide">
                <span>Decision</span>
                <textarea value={selected.decision} onChange={(event) => updateItem(selected.id, { decision: event.target.value })} />
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshFeedbackActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Planned" })}>Plan it</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Done" })}>Mark done</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Parked" })}>Park it</button>
              <button type="button" onClick={() => onNavigate?.("qa")}>Open QA</button>
              <button type="button" onClick={() => onNavigate?.("flags")}>Open Flags</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
