import React from "react";

const AVAILABILITY_KEY = "churvox:fresh-availability:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "avail-1",
    worker: "Matiu Rangi",
    status: "Available",
    today: "8:00 AM - 4:30 PM",
    capacity: "Good",
    area: "Lower Hutt",
    reason: "Normal day",
    note: "Can take normal lawn run and one extra job.",
  },
  {
    id: "avail-2",
    worker: "Ana Williams",
    status: "Limited",
    today: "10:00 AM - 2:00 PM",
    capacity: "Half day",
    area: "Lower Hutt",
    reason: "School pickup",
    note: "Do not assign late afternoon work.",
  },
  {
    id: "avail-3",
    worker: "James Patel",
    status: "Unavailable",
    today: "Away",
    capacity: "Blocked",
    area: "Upper Hutt",
    reason: "Sick",
    note: "Move assigned work to another worker or tomorrow.",
  },
];

function readAvailability() {
  try {
    if (typeof window === "undefined") return defaults;

    const saved = window.localStorage.getItem(AVAILABILITY_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveAvailability(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "availability" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendAvailabilityToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `availability-${item.id}-${Date.now()}`,
      group: "Availability",
      title: "Worker availability needs review",
      info: `${item.worker} · ${item.status} · ${item.today}`,
      urgency: item.status === "Unavailable" ? "Schedule risk" : item.status,
      found: `${item.worker} is marked ${item.status}.`,
      prepared: "Churvox prepared an availability review before more jobs are assigned.",
      why: item.note,
      owner: "Reassign jobs, move route order, or update worker availability.",
      area: "Availability",
      page: "availability",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "availability-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshAvailability({ onNavigate }) {
  const [items, setItems] = React.useState(readAvailability);
  const [selectedId, setSelectedId] = React.useState(() => readAvailability()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const available = items.filter((item) => item.status === "Available").length;
  const limited = items.filter((item) => item.status === "Limited").length;
  const unavailable = items.filter((item) => item.status === "Unavailable").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveAvailability(next);
      return next;
    });
  }

  function addWorker() {
    const next = {
      id: `avail-${Date.now()}`,
      worker: "New worker",
      status: "Available",
      today: "8:00 AM - 4:00 PM",
      capacity: "Good",
      area: "Set area",
      reason: "Normal day",
      note: "Add availability note.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveAvailability(updated);
  }

  function resetAvailability() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveAvailability(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendAvailabilityToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshAvailabilityPage">
      <div className="freshAvailabilityHero">
        <div>
          <span>Availability</span>
          <h1>Assign work to people who can actually do it</h1>
          <p>See who is available, limited or blocked before jobs hit Dispatch or Routes.</p>
        </div>

        <div className="freshAvailabilityStats">
          <div><b>{items.length}</b><small>workers</small></div>
          <div><b>{available}</b><small>available</small></div>
          <div><b>{limited}</b><small>limited</small></div>
          <div><b>{unavailable}</b><small>blocked</small></div>
        </div>
      </div>

      <div className="freshAvailabilityLayout">
        <aside className="freshAvailabilityList">
          <header>
            <div>
              <b>Worker list</b>
              <span>Today’s capacity</span>
            </div>
            <button type="button" onClick={addWorker}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.worker}</b>
              <span>{item.status}</span>
              <small>{item.today} · {item.capacity}</small>
            </button>
          ))}

          <button type="button" className="freshAvailabilityReset" onClick={resetAvailability}>
            Reset availability
          </button>
        </aside>

        {selected && (
          <article className="freshAvailabilityDetail">
            <div className="freshAvailabilityHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.worker}</h2>
                <p>{selected.area} · {selected.today}</p>
              </div>

              <div className="freshAvailabilityHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("dispatch")}>Open Dispatch</button>
                <button type="button" onClick={() => onNavigate?.("routes")}>Open Routes</button>
              </div>
            </div>

            <div className="freshAvailabilityCards">
              <section>
                <span>Status</span>
                <b>{selected.status}</b>
                <p>{selected.reason}</p>
              </section>

              <section>
                <span>Capacity</span>
                <b>{selected.capacity}</b>
                <p>Use this before assigning more work.</p>
              </section>

              <section>
                <span>Owner note</span>
                <b>{selected.area}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshAvailabilityForm">
              <label>
                <span>Worker</span>
                <input value={selected.worker} onChange={(event) => updateItem(selected.id, { worker: event.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Available</option>
                  <option>Limited</option>
                  <option>Unavailable</option>
                  <option>On leave</option>
                  <option>Training</option>
                </select>
              </label>

              <label>
                <span>Today</span>
                <input value={selected.today} onChange={(event) => updateItem(selected.id, { today: event.target.value })} />
              </label>

              <label>
                <span>Capacity</span>
                <select value={selected.capacity} onChange={(event) => updateItem(selected.id, { capacity: event.target.value })}>
                  <option>Good</option>
                  <option>Half day</option>
                  <option>Full</option>
                  <option>Blocked</option>
                  <option>Unknown</option>
                </select>
              </label>

              <label>
                <span>Area</span>
                <input value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })} />
              </label>

              <label>
                <span>Reason</span>
                <input value={selected.reason} onChange={(event) => updateItem(selected.id, { reason: event.target.value })} />
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshAvailabilityActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Available", capacity: "Good" })}>Mark available</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Limited", capacity: "Half day" })}>Limited</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Unavailable", capacity: "Blocked" })}>Unavailable</button>
              <button type="button" onClick={() => onNavigate?.("team")}>Open Team</button>
              <button type="button" onClick={() => onNavigate?.("worker")}>Open Worker</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
