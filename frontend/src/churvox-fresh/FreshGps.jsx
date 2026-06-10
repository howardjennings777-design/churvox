import React from "react";

const GPS_KEY = "churvox:fresh-gps:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "gps-1",
    worker: "Tama",
    job: "Garden tidy",
    customer: "Lower Hutt Medical Centre",
    status: "On site",
    timeOnSite: "1h 18m",
    location: "Lower Hutt",
    accuracy: "GPS placeholder",
    invoiceImpact: "Ready to compare with job timer",
    note: "Use time on site to confirm job time before invoice or payroll.",
  },
  {
    id: "gps-2",
    worker: "Mere",
    job: "Driveway clean",
    customer: "Birchville Rentals",
    status: "Left site",
    timeOnSite: "2h 05m",
    location: "Upper Hutt",
    accuracy: "GPS placeholder",
    invoiceImpact: "Possible extra time",
    note: "Churvox can flag if site time is higher than quoted time.",
  },
  {
    id: "gps-3",
    worker: "Jay",
    job: "Lawn service",
    customer: "Aroha Property Care",
    status: "Not arrived",
    timeOnSite: "0m",
    location: "Wainuiomata",
    accuracy: "GPS placeholder",
    invoiceImpact: "Late start alert",
    note: "Useful later for worker check-ins, route proof and time disputes.",
  },
];

function readGps() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(GPS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveGps(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GPS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "gps" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendGpsToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `gps-${item.id}-${Date.now()}`,
      group: "GPS / Time On Site",
      title: "Time on site needs owner review",
      info: `${item.worker} · ${item.job} · ${item.timeOnSite}`,
      urgency: item.status,
      found: `${item.worker} is marked ${item.status} at ${item.location}.`,
      prepared: `Churvox prepared a time-on-site review: ${item.invoiceImpact}.`,
      why: item.note,
      owner: "Review time, open job, compare timer, or send worker check-in.",
      area: "GPS / Time On Site",
      page: "gps",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "gps-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshGps({ onNavigate }) {
  const [items, setItems] = React.useState(readGps);
  const [selectedId, setSelectedId] = React.useState(() => readGps()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const onSite = items.filter((item) => item.status === "On site").length;
  const late = items.filter((item) => item.status === "Not arrived").length;
  const review = items.filter((item) => item.invoiceImpact.includes("extra") || item.invoiceImpact.includes("alert")).length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveGps(next);
      return next;
    });
  }

  function addGpsRow() {
    const next = {
      id: `gps-${Date.now()}`,
      worker: "New worker",
      job: "New job",
      customer: "New customer",
      status: "Not arrived",
      timeOnSite: "0m",
      location: "New site",
      accuracy: "GPS placeholder",
      invoiceImpact: "Needs review",
      note: "GPS is a placeholder preview for future live location and time on site.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveGps(updated);
  }

  function resetGps() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveGps(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendGpsToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshGpsPage">
      <div className="freshGpsHero">
        <div>
          <span>GPS / time on site</span>
          <h1>Prove who was on site and how long the job really took</h1>
          <p>Placeholder desk for future GPS, worker check-ins, route proof, timer comparison, invoice checks and payroll confidence.</p>
        </div>

        <div className="freshGpsStats">
          <div><b>{total}</b><small>site records</small></div>
          <div><b>{onSite}</b><small>on site</small></div>
          <div><b>{late}</b><small>not arrived</small></div>
          <div><b>{review}</b><small>review</small></div>
        </div>
      </div>

      <div className="freshGpsNotice">
        <b>Placeholder only</b>
        <span>Live GPS can come later. This page shows the workflow without touching backend location services.</span>
      </div>

      <div className="freshGpsLayout">
        <aside className="freshGpsList">
          <header>
            <div>
              <b>Site time desk</b>
              <span>{review} need owner check</span>
            </div>
            <button type="button" onClick={addGpsRow}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.worker}</b>
              <span>{item.job} · {item.location}</span>
              <small>{item.status} · {item.timeOnSite}</small>
            </button>
          ))}

          <button type="button" className="freshGpsReset" onClick={resetGps}>
            Reset GPS rows
          </button>
        </aside>

        {selected && (
          <article className="freshGpsDetail">
            <div className="freshGpsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.worker}</h2>
                <p>{selected.customer} · {selected.job} · {selected.location}</p>
              </div>

              <div className="freshGpsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("time")}>Open Time Logs</button>
                <button type="button" onClick={() => onNavigate?.("routes")}>Open Routes</button>
              </div>
            </div>

            <div className="freshGpsCards">
              <section>
                <span>Time on site</span>
                <b>{selected.timeOnSite}</b>
                <p>Compare GPS presence with worker timer and job schedule.</p>
              </section>

              <section>
                <span>Invoice impact</span>
                <b>{selected.invoiceImpact}</b>
                <p>Flag extra time, late starts, or proof for customer questions.</p>
              </section>

              <section>
                <span>Accuracy</span>
                <b>{selected.accuracy}</b>
                <p>Future GPS can support job proof, payroll checks and route confidence.</p>
              </section>
            </div>

            <div className="freshGpsForm">
              <label>
                <span>Worker</span>
                <input value={selected.worker} onChange={(event) => updateItem(selected.id, { worker: event.target.value })} />
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Customer</span>
                <input value={selected.customer} onChange={(event) => updateItem(selected.id, { customer: event.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Not arrived</option>
                  <option>On site</option>
                  <option>Left site</option>
                  <option>Needs review</option>
                  <option>Confirmed</option>
                </select>
              </label>

              <label>
                <span>Time on site</span>
                <input value={selected.timeOnSite} onChange={(event) => updateItem(selected.id, { timeOnSite: event.target.value })} />
              </label>

              <label>
                <span>Location</span>
                <input value={selected.location} onChange={(event) => updateItem(selected.id, { location: event.target.value })} />
              </label>

              <label>
                <span>Accuracy</span>
                <select value={selected.accuracy} onChange={(event) => updateItem(selected.id, { accuracy: event.target.value })}>
                  <option>GPS placeholder</option>
                  <option>Worker check-in</option>
                  <option>Manual confirmation</option>
                  <option>Future live GPS</option>
                </select>
              </label>

              <label className="wide">
                <span>Invoice / payroll impact</span>
                <textarea value={selected.invoiceImpact} onChange={(event) => updateItem(selected.id, { invoiceImpact: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshGpsActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Confirmed" })}>Confirm</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "On site" })}>Mark on site</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
              <button type="button" onClick={() => onNavigate?.("dispatch")}>Open Dispatch</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
