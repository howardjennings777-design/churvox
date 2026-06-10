import React from "react";

const AREAS_KEY = "churvox:fresh-areas:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "area-1",
    name: "Lower Hutt",
    status: "Active",
    leadWorker: "Matiu Rangi",
    travelFee: 0,
    coverage: "Core area",
    jobs: 18,
    note: "Main service area. Keep route density high.",
  },
  {
    id: "area-2",
    name: "Upper Hutt",
    status: "Active",
    leadWorker: "Ana Williams",
    travelFee: 15,
    coverage: "Travel fee applies",
    jobs: 7,
    note: "Group jobs together to avoid wasted travel.",
  },
  {
    id: "area-3",
    name: "Wainuiomata",
    status: "Review",
    leadWorker: "Unassigned",
    travelFee: 25,
    coverage: "Limited",
    jobs: 2,
    note: "Only accept if route is worth it or customer pays travel.",
  },
];

function readAreas() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(AREAS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveAreas(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AREAS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "areas" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendAreaToCommand(area) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `area-${area.id}-${Date.now()}`,
      group: "Areas",
      title: "Service area needs review",
      info: `${area.name} · ${area.coverage} · $${area.travelFee} travel`,
      urgency: area.status === "Review" ? "Area review" : area.status,
      found: `${area.name} has ${area.jobs} jobs and travel fee $${area.travelFee}.`,
      prepared: `Lead worker: ${area.leadWorker}.`,
      why: area.note,
      owner: "Approve area, change travel fee, assign worker, or open Routes.",
      area: "Areas",
      page: "areas",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "area-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshAreas({ onNavigate }) {
  const [items, setItems] = React.useState(readAreas);
  const [selectedId, setSelectedId] = React.useState(() => readAreas()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const active = items.filter((item) => item.status === "Active").length;
  const review = items.filter((item) => item.status === "Review").length;
  const totalJobs = items.reduce((sum, item) => sum + Number(item.jobs || 0), 0);
  const avgTravel = items.length
    ? Math.round(items.reduce((sum, item) => sum + Number(item.travelFee || 0), 0) / items.length)
    : 0;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveAreas(next);
      return next;
    });
  }

  function addArea() {
    const next = {
      id: `area-${Date.now()}`,
      name: "New area",
      status: "Review",
      leadWorker: "Unassigned",
      travelFee: 0,
      coverage: "Limited",
      jobs: 0,
      note: "Set area rules before accepting jobs here.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveAreas(updated);
  }

  function resetAreas() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveAreas(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendAreaToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshAreasPage">
      <div className="freshAreasHero">
        <div>
          <span>Areas / territories</span>
          <h1>Control where you work and what travel costs</h1>
          <p>Set service zones, travel fees, worker coverage and route notes before accepting jobs.</p>
        </div>

        <div className="freshAreasStats">
          <div><b>{items.length}</b><small>areas</small></div>
          <div><b>{active}</b><small>active</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{totalJobs}</b><small>jobs</small></div>
        </div>
      </div>

      <div className="freshAreasLayout">
        <aside className="freshAreasList">
          <header>
            <div>
              <b>Territory list</b>
              <span>${avgTravel} avg travel</span>
            </div>
            <button type="button" onClick={addArea}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.name}</b>
              <span>{item.coverage}</span>
              <small>{item.jobs} jobs · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshAreasReset" onClick={resetAreas}>
            Reset areas
          </button>
        </aside>

        {selected && (
          <article className="freshAreasDetail">
            <div className="freshAreasHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.name}</h2>
                <p>{selected.coverage} · ${selected.travelFee} travel fee</p>
              </div>

              <div className="freshAreasHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("routes")}>Open Routes</button>
                <button type="button" onClick={() => onNavigate?.("dispatch")}>Open Dispatch</button>
              </div>
            </div>

            <div className="freshAreasCards">
              <section>
                <span>Coverage</span>
                <b>{selected.coverage}</b>
                <p>{selected.note}</p>
              </section>

              <section>
                <span>Lead worker</span>
                <b>{selected.leadWorker}</b>
                <p>Default worker or crew for this area.</p>
              </section>

              <section>
                <span>Travel fee</span>
                <b>${selected.travelFee}</b>
                <p>{selected.jobs} jobs currently tied to this area.</p>
              </section>
            </div>

            <div className="freshAreasForm">
              <label>
                <span>Area name</span>
                <input value={selected.name} onChange={(event) => updateItem(selected.id, { name: event.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Active</option>
                  <option>Review</option>
                  <option>Limited</option>
                  <option>Paused</option>
                  <option>Closed</option>
                </select>
              </label>

              <label>
                <span>Coverage</span>
                <select value={selected.coverage} onChange={(event) => updateItem(selected.id, { coverage: event.target.value })}>
                  <option>Core area</option>
                  <option>Travel fee applies</option>
                  <option>Limited</option>
                  <option>Commercial only</option>
                  <option>Not servicing</option>
                </select>
              </label>

              <label>
                <span>Lead worker</span>
                <input value={selected.leadWorker} onChange={(event) => updateItem(selected.id, { leadWorker: event.target.value })} />
              </label>

              <label>
                <span>Travel fee</span>
                <input type="number" value={selected.travelFee} onChange={(event) => updateItem(selected.id, { travelFee: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Jobs</span>
                <input type="number" value={selected.jobs} onChange={(event) => updateItem(selected.id, { jobs: Number(event.target.value || 0) })} />
              </label>

              <label className="wide">
                <span>Area note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshAreasActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Active" })}>Activate</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Review" })}>Review</button>
              <button type="button" onClick={() => updateItem(selected.id, { coverage: "Travel fee applies" })}>Add travel fee</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
              <button type="button" onClick={() => onNavigate?.("team")}>Open Team</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
