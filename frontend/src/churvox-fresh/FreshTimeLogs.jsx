import React from "react";

const TIME_KEY = "churvox:fresh-time-logs:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "time-1",
    worker: "Matiu Rangi",
    job: "Lawn service",
    client: "Aroha Property Care",
    date: "Today",
    start: "10:05 AM",
    finish: "11:42 AM",
    breakMins: 10,
    hours: 1.45,
    status: "Approved",
    note: "Normal run. Photos complete.",
  },
  {
    id: "time-2",
    worker: "Ana Williams",
    job: "Garden tidy",
    client: "Lower Hutt Medical Centre",
    date: "Today",
    start: "1:26 PM",
    finish: "4:58 PM",
    breakMins: 15,
    hours: 3.28,
    status: "Needs review",
    note: "Extra time due to green waste. Check before payroll.",
  },
  {
    id: "time-3",
    worker: "James Patel",
    job: "Driveway clean",
    client: "Birchville Rentals",
    date: "Tomorrow",
    start: "Not started",
    finish: "Not finished",
    breakMins: 0,
    hours: 0,
    status: "Blocked",
    note: "Access not confirmed.",
  },
];

function readTimeLogs() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(TIME_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveTimeLogs(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TIME_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "time-logs" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendTimeToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `time-${item.id}-${Date.now()}`,
      group: "Time logs",
      title: "Time entry needs owner review",
      info: `${item.worker} · ${item.job} · ${item.hours} hrs`,
      urgency: item.status === "Needs review" ? "Payroll review" : item.status,
      found: `${item.worker} logged ${item.hours} hours on ${item.job}.`,
      prepared: "Churvox prepared a time review slip before payroll/export.",
      why: item.note,
      owner: "Approve time, adjust hours, mark blocked, or open Payroll.",
      area: "Time logs",
      page: "time",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "time-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshTimeLogs({ onNavigate }) {
  const [items, setItems] = React.useState(readTimeLogs);
  const [selectedId, setSelectedId] = React.useState(() => readTimeLogs()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const totalHours = items.reduce((sum, item) => sum + Number(item.hours || 0), 0).toFixed(2);
  const needsReview = items.filter((item) => item.status === "Needs review").length;
  const approved = items.filter((item) => item.status === "Approved").length;
  const blocked = items.filter((item) => item.status === "Blocked").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveTimeLogs(next);
      return next;
    });
  }

  function addLog() {
    const next = {
      id: `time-${Date.now()}`,
      worker: "New worker",
      job: "New job",
      client: "New client",
      date: "Today",
      start: "Not started",
      finish: "Not finished",
      breakMins: 0,
      hours: 0,
      status: "Needs review",
      note: "Add time log details.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveTimeLogs(updated);
  }

  function resetLogs() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveTimeLogs(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendTimeToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshTimePage">
      <div className="freshTimeHero">
        <div>
          <span>Time logs</span>
          <h1>Approve worker time before payroll</h1>
          <p>Review hours, breaks, blocked jobs and manual adjustments before payroll or CSV export.</p>
        </div>

        <div className="freshTimeStats">
          <div><b>{totalHours}</b><small>hours</small></div>
          <div><b>{approved}</b><small>approved</small></div>
          <div><b>{needsReview}</b><small>review</small></div>
          <div><b>{blocked}</b><small>blocked</small></div>
        </div>
      </div>

      <div className="freshTimeLayout">
        <aside className="freshTimeList">
          <header>
            <div>
              <b>Time queue</b>
              <span>Worker logs + owner review</span>
            </div>
            <button type="button" onClick={addLog}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.worker}</b>
              <span>{item.job}</span>
              <small>{item.hours} hrs · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshTimeReset" onClick={resetLogs}>
            Reset time logs
          </button>
        </aside>

        {selected && (
          <article className="freshTimeDetail">
            <div className="freshTimeHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.worker}</h2>
                <p>{selected.client} · {selected.job}</p>
              </div>

              <div className="freshTimeHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("payroll")}>Open Payroll</button>
                <button type="button" onClick={() => onNavigate?.("worker")}>Open Worker</button>
              </div>
            </div>

            <div className="freshTimeCards">
              <section>
                <span>Clock</span>
                <b>{selected.start} → {selected.finish}</b>
                <p>Break: {selected.breakMins} minutes</p>
              </section>

              <section>
                <span>Hours</span>
                <b>{selected.hours}</b>
                <p>Owner approved time is used for payroll review.</p>
              </section>

              <section>
                <span>Note</span>
                <b>{selected.status}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshTimeForm">
              <label>
                <span>Worker</span>
                <input value={selected.worker} onChange={(event) => updateItem(selected.id, { worker: event.target.value })} />
              </label>

              <label>
                <span>Client</span>
                <input value={selected.client} onChange={(event) => updateItem(selected.id, { client: event.target.value })} />
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Date</span>
                <input value={selected.date} onChange={(event) => updateItem(selected.id, { date: event.target.value })} />
              </label>

              <label>
                <span>Start</span>
                <input value={selected.start} onChange={(event) => updateItem(selected.id, { start: event.target.value })} />
              </label>

              <label>
                <span>Finish</span>
                <input value={selected.finish} onChange={(event) => updateItem(selected.id, { finish: event.target.value })} />
              </label>

              <label>
                <span>Break mins</span>
                <input type="number" value={selected.breakMins} onChange={(event) => updateItem(selected.id, { breakMins: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Hours</span>
                <input type="number" step="0.01" value={selected.hours} onChange={(event) => updateItem(selected.id, { hours: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Approved</option>
                  <option>Needs review</option>
                  <option>Blocked</option>
                  <option>Edited</option>
                  <option>Payroll ready</option>
                </select>
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshTimeActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Approved" })}>Approve</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Review</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Block</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Payroll ready" })}>Payroll ready</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
