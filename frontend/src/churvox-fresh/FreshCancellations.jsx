import React from "react";

const CANCELLATIONS_KEY = "churvox:fresh-cancellations:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "can-1",
    title: "Recurring lawn visit cancelled",
    client: "Belmont customer",
    job: "Fortnightly lawn care",
    status: "Needs owner review",
    reason: "Customer asked to skip this week because grass is not long enough.",
    valueRisk: 65,
    saveAction: "Offer to move visit to next week instead of cancelling.",
    priority: "Medium",
    note: "Good chance to save the visit if owner replies quickly.",
    nextAction: "Send owner-approved reply and update schedule.",
  },
  {
    id: "can-2",
    title: "Quote did not convert",
    client: "Upper Hutt lead",
    job: "Garden reset quote",
    status: "Lost",
    reason: "Customer said price was too high.",
    valueRisk: 190,
    saveAction: "Offer staged option: first tidy now, hedge trim later.",
    priority: "High",
    note: "Could still save part of the work with a smaller first job.",
    nextAction: "Send alternative quote option to Command.",
  },
  {
    id: "can-3",
    title: "Worker unable to attend",
    client: "Naenae property",
    job: "Handyman repair",
    status: "Reschedule needed",
    reason: "Assigned worker unavailable.",
    valueRisk: 120,
    saveAction: "Move job to backup crew or subcontractor.",
    priority: "High",
    note: "Customer trust risk if no quick update is sent.",
    nextAction: "Open dispatch and assign another person.",
  },
];

function readCancellations() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(CANCELLATIONS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveCancellations(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CANCELLATIONS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "cancellations" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ")}`;
}

function sendCancellationToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `cancellation-${item.id}-${Date.now()}`,
      group: "Cancellations",
      title: "Cancelled or lost job needs owner review",
      info: `${item.client} · ${money(item.valueRisk)} risk · ${item.status}`,
      urgency: item.priority,
      found: `${item.job} may be cancelled or lost. Reason: ${item.reason}`,
      prepared: `Churvox prepared save action: ${item.saveAction}`,
      why: item.note,
      owner: "Approve save message, reschedule, mark lost, or open related job.",
      area: "Cancellations / Lost Jobs",
      page: "cancellations",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "cancellation-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshCancellations({ onNavigate }) {
  const [items, setItems] = React.useState(readCancellations);
  const [selectedId, setSelectedId] = React.useState(() => readCancellations()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const review = items.filter((item) => item.status === "Needs owner review").length;
  const lost = items.filter((item) => item.status === "Lost").length;
  const valueRisk = items.reduce((sum, item) => sum + Number(item.valueRisk || 0), 0);

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveCancellations(next);
      return next;
    });
  }

  function addCancellation() {
    const next = {
      id: `can-${Date.now()}`,
      title: "New cancellation risk",
      client: "Client name",
      job: "Job or quote",
      status: "Needs owner review",
      reason: "Add cancellation or lost-job reason.",
      valueRisk: 0,
      saveAction: "Add save or reschedule action.",
      priority: "Medium",
      note: "Decide whether this can be saved.",
      nextAction: "Send to Command for owner approval.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveCancellations(updated);
  }

  function resetCancellations() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveCancellations(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendCancellationToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshCancellationsPage">
      <div className="freshCancellationsHero">
        <div>
          <span>Cancellations / lost jobs</span>
          <h1>Save jobs before they disappear from the schedule</h1>
          <p>Track skipped visits, lost quotes, customer cancellations, worker no-shows and reschedule risks before revenue is gone.</p>
        </div>

        <div className="freshCancellationsStats">
          <div><b>{total}</b><small>items</small></div>
          <div><b>{money(valueRisk)}</b><small>value risk</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{lost}</b><small>lost</small></div>
        </div>
      </div>

      <div className="freshCancellationsLayout">
        <aside className="freshCancellationsList">
          <header>
            <div>
              <b>Save desk</b>
              <span>{review} need owner review</span>
            </div>
            <button type="button" onClick={addCancellation}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.title}</b>
              <span>{item.client} · {item.job}</span>
              <small>{money(item.valueRisk)} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshCancellationsReset" onClick={resetCancellations}>
            Reset cancellations
          </button>
        </aside>

        {selected && (
          <article className="freshCancellationsDetail">
            <div className="freshCancellationsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.title}</h2>
                <p>{selected.client} · {selected.job} · {money(selected.valueRisk)} risk</p>
              </div>

              <div className="freshCancellationsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("dispatch")}>Open Dispatch</button>
                <button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button>
              </div>
            </div>

            <div className="freshCancellationsCards">
              <section>
                <span>Reason</span>
                <b>{selected.priority}</b>
                <p>{selected.reason}</p>
              </section>

              <section>
                <span>Save action</span>
                <b>{money(selected.valueRisk)}</b>
                <p>{selected.saveAction}</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.status}</b>
                <p>{selected.nextAction}</p>
              </section>
            </div>

            <div className="freshCancellationsForm">
              <label>
                <span>Title</span>
                <input value={selected.title} onChange={(event) => updateItem(selected.id, { title: event.target.value })} />
              </label>

              <label>
                <span>Client</span>
                <input value={selected.client} onChange={(event) => updateItem(selected.id, { client: event.target.value })} />
              </label>

              <label>
                <span>Job / quote</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Needs owner review</option>
                  <option>Reschedule needed</option>
                  <option>Saved</option>
                  <option>Lost</option>
                  <option>Cancelled</option>
                  <option>Follow-up later</option>
                </select>
              </label>

              <label>
                <span>Value risk</span>
                <input type="number" value={selected.valueRisk} onChange={(event) => updateItem(selected.id, { valueRisk: Number(event.target.value || 0) })} />
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
                <span>Reason</span>
                <textarea value={selected.reason} onChange={(event) => updateItem(selected.id, { reason: event.target.value })} />
              </label>

              <label className="wide">
                <span>Save action</span>
                <textarea value={selected.saveAction} onChange={(event) => updateItem(selected.id, { saveAction: event.target.value })} />
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

            <div className="freshCancellationsActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Saved" })}>Mark saved</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Reschedule needed" })}>Reschedule</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Lost" })}>Mark lost</button>
              <button type="button" onClick={() => onNavigate?.("messages")}>Open Messages</button>
              <button type="button" onClick={() => onNavigate?.("followups")}>Open Follow-ups</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
