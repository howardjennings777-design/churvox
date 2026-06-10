import React from "react";

const QUALITY_KEY = "churvox:fresh-quality:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "quality-1",
    customer: "Aroha Property Care",
    job: "Lawn service",
    type: "Quality check",
    status: "Passed",
    owner: "Matiu Rangi",
    cost: 0,
    priority: "Normal",
    finding: "Edges tidy, paths blown, photos uploaded.",
    fix: "No action needed.",
  },
  {
    id: "quality-2",
    customer: "Birchville Rentals",
    job: "Driveway clean",
    type: "Callback",
    status: "Needs owner",
    owner: "Owner",
    cost: 45,
    priority: "High",
    finding: "Customer says a corner was missed near the garage.",
    fix: "Check photos, decide if free rework or billable return visit.",
  },
  {
    id: "quality-3",
    customer: "Lower Hutt Medical Centre",
    job: "Garden tidy",
    type: "Rework",
    status: "Scheduled",
    owner: "Ana Williams",
    cost: 30,
    priority: "High",
    finding: "Green waste pile left by rear gate.",
    fix: "Return for 20 minute pickup before asking for review.",
  },
];

function readQuality() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(QUALITY_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveQuality(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(QUALITY_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "quality" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendQualityToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `quality-${item.id}-${Date.now()}`,
      group: "Quality",
      title: "Quality issue needs owner review",
      info: `${item.customer} · ${item.type} · $${item.cost} cost`,
      urgency: item.priority === "High" || item.status === "Needs owner" ? "Quality risk" : item.status,
      found: `${item.job}: ${item.finding}`,
      prepared: item.fix,
      why: "Quality issues should be handled before review requests, invoices, or repeat bookings.",
      owner: "Approve fix, schedule rework, mark passed, or open customer.",
      area: "Quality",
      page: "quality",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "quality-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshQuality({ onNavigate }) {
  const [items, setItems] = React.useState(readQuality);
  const [selectedId, setSelectedId] = React.useState(() => readQuality()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const open = items.filter((item) => item.status !== "Passed" && item.status !== "Closed").length;
  const high = items.filter((item) => item.priority === "High").length;
  const cost = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const passed = items.filter((item) => item.status === "Passed").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveQuality(next);
      return next;
    });
  }

  function addQuality() {
    const next = {
      id: `quality-${Date.now()}`,
      customer: "New customer",
      job: "New job",
      type: "Quality check",
      status: "Needs owner",
      owner: "Owner",
      cost: 0,
      priority: "Normal",
      finding: "Add finding.",
      fix: "Add fix or owner action.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveQuality(updated);
  }

  function resetQuality() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveQuality(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendQualityToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshQualityPage">
      <div className="freshQualityHero">
        <div>
          <span>Quality / rework</span>
          <h1>Catch bad jobs before customers leave</h1>
          <p>Track callbacks, missed work, complaints, rework cost and owner decisions before invoicing or review requests.</p>
        </div>

        <div className="freshQualityStats">
          <div><b>{items.length}</b><small>checks</small></div>
          <div><b>{open}</b><small>open</small></div>
          <div><b>{high}</b><small>high</small></div>
          <div><b>${cost}</b><small>cost</small></div>
        </div>
      </div>

      <div className="freshQualityLayout">
        <aside className="freshQualityList">
          <header>
            <div>
              <b>Quality queue</b>
              <span>{passed} passed</span>
            </div>
            <button type="button" onClick={addQuality}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.customer}</b>
              <span>{item.type}</span>
              <small>{item.status} · ${item.cost}</small>
            </button>
          ))}

          <button type="button" className="freshQualityReset" onClick={resetQuality}>
            Reset quality
          </button>
        </aside>

        {selected && (
          <article className="freshQualityDetail">
            <div className="freshQualityHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.customer}</h2>
                <p>{selected.job} · {selected.type}</p>
              </div>

              <div className="freshQualityHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
                <button type="button" onClick={() => onNavigate?.("reviews")}>Open Reviews</button>
              </div>
            </div>

            <div className="freshQualityCards">
              <section>
                <span>Finding</span>
                <b>{selected.priority}</b>
                <p>{selected.finding}</p>
              </section>

              <section>
                <span>Fix</span>
                <b>{selected.owner}</b>
                <p>{selected.fix}</p>
              </section>

              <section>
                <span>Rework cost</span>
                <b>${selected.cost}</b>
                <p>Use this to protect job margin and reports.</p>
              </section>
            </div>

            <div className="freshQualityForm">
              <label>
                <span>Customer</span>
                <input value={selected.customer} onChange={(event) => updateItem(selected.id, { customer: event.target.value })} />
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Type</span>
                <select value={selected.type} onChange={(event) => updateItem(selected.id, { type: event.target.value })}>
                  <option>Quality check</option>
                  <option>Callback</option>
                  <option>Rework</option>
                  <option>Complaint</option>
                  <option>Photo review</option>
                  <option>Owner check</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Passed</option>
                  <option>Needs owner</option>
                  <option>Scheduled</option>
                  <option>Reworked</option>
                  <option>Closed</option>
                </select>
              </label>

              <label>
                <span>Priority</span>
                <select value={selected.priority} onChange={(event) => updateItem(selected.id, { priority: event.target.value })}>
                  <option>Low</option>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </label>

              <label>
                <span>Owner</span>
                <input value={selected.owner} onChange={(event) => updateItem(selected.id, { owner: event.target.value })} />
              </label>

              <label>
                <span>Cost</span>
                <input type="number" value={selected.cost} onChange={(event) => updateItem(selected.id, { cost: Number(event.target.value || 0) })} />
              </label>

              <label className="wide">
                <span>Finding</span>
                <textarea value={selected.finding} onChange={(event) => updateItem(selected.id, { finding: event.target.value })} />
              </label>

              <label className="wide">
                <span>Fix</span>
                <textarea value={selected.fix} onChange={(event) => updateItem(selected.id, { fix: event.target.value })} />
              </label>
            </div>

            <div className="freshQualityActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Passed" })}>Mark passed</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Scheduled" })}>Schedule rework</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs owner" })}>Needs owner</button>
              <button type="button" onClick={() => onNavigate?.("photos")}>Open Photos</button>
              <button type="button" onClick={() => onNavigate?.("profit")}>Open Profit</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
