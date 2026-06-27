import React from "react";
import { useApi } from "../hooks/useApi";

const RECURRING_KEY = "churvox:fresh-recurring:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "rec-1",
    client: "Aroha Property Care",
    service: "Lawn service",
    frequency: "Fortnightly",
    nextDate: "Next Tuesday",
    worker: "Matiu Rangi",
    price: 65,
    status: "Active",
    note: "Regular lawn run. Keep max 2 weeks in season.",
  },
  {
    id: "rec-2",
    client: "Lower Hutt Medical Centre",
    service: "Garden tidy",
    frequency: "Monthly",
    nextDate: "1st of next month",
    worker: "Ana Williams",
    price: 240,
    status: "Review",
    note: "Commercial site. Confirm scope before next visit.",
  },
  {
    id: "rec-3",
    client: "Birchville Rentals",
    service: "Driveway clean",
    frequency: "Custom",
    nextDate: "On request",
    worker: "Unassigned",
    price: 140,
    status: "Paused",
    note: "Only book when tenant access is confirmed.",
  },
];

function readList(key, fallback = []) {
  try {
    if (typeof window === "undefined") return fallback;
    const saved = window.localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveList(key, value, type) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendRecurringToCommand(item) {
  const current = readList(COMMAND_INBOX_KEY, []);

  const slip = {
    id: `recurring-${item.id}-${Date.now()}`,
    group: "Recurring",
    title: "Recurring job needs review",
    info: `${item.client} · ${item.service} · ${item.frequency}`,
    urgency: item.status === "Review" ? "Review repeat setup" : item.status,
    found: `${item.client} has a ${item.frequency.toLowerCase()} recurring ${item.service}.`,
    prepared: `Next visit is marked: ${item.nextDate}.`,
    why: "Recurring jobs should create the next job without doubling up or missing a customer.",
    owner: "Approve next job, pause the repeat, edit price, or open Jobs.",
    area: "Recurring",
    page: "recurring",
    fromInbox: true,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  saveList(COMMAND_INBOX_KEY, [slip, ...current].slice(0, 20), "recurring-command");
}

export default function FreshRecurring({ onNavigate }) {
  const { post } = useApi();
  const [items, setItems] = React.useState(() => readList(RECURRING_KEY, defaults));
  const [selectedId, setSelectedId] = React.useState(() => readList(RECURRING_KEY, defaults)[0]?.id || "");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const active = items.filter((item) => item.status === "Active").length;
  const review = items.filter((item) => item.status === "Review").length;
  const paused = items.filter((item) => item.status === "Paused").length;
  const monthlyValue = items
    .filter((item) => item.status !== "Paused")
    .reduce((sum, item) => sum + Number(item.price || 0), 0);

  function saveItems(next) {
    setItems(next);
    saveList(RECURRING_KEY, next, "recurring");
  }

  function updateItem(id, patch) {
    saveItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addRecurring() {
    const nextItem = {
      id: `rec-${Date.now()}`,
      client: "New client",
      service: "New recurring service",
      frequency: "Fortnightly",
      nextDate: "Set date",
      worker: "Unassigned",
      price: 0,
      status: "Review",
      note: "Set repeat details before activating.",
    };

    const next = [nextItem, ...items];
    saveItems(next);
    setSelectedId(nextItem.id);
    setMessage("New recurring setup added. Fill it in, then create the next job.");
    setError("");
  }

  function resetRecurring() {
    saveItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    setMessage("Recurring setups reset.");
    setError("");
  }

  async function createNextJob() {
    if (!selected || busy) return;

    const title = String(selected.service || "Recurring service").trim();
    const client = String(selected.client || "Customer").trim();
    if (!title || !client) {
      setError("Client and service are required before creating the next job.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    const price = Number(selected.price || 0) || 0;
    const payload = {
      title,
      job_name: title,
      client_name: client,
      customer_name: client,
      assigned_worker_name: selected.worker || "Unassigned",
      worker_name: selected.worker || "Unassigned",
      scheduled_date: selected.nextDate || null,
      notes: `Created from recurring setup: ${selected.frequency}. ${selected.note || ""}`.trim(),
      description: title,
      fixed_price: price,
      price,
      status: "Ready",
      recurring_id: selected.id,
      source: "fresh_recurring",
    };

    const res = await post("/jobs", payload, { timeout: 25000 });
    setBusy(false);

    if (!res.success) {
      setError(res.error || "Could not create the next job from this recurring setup.");
      return;
    }

    updateItem(selected.id, { status: "Active", lastCreatedAt: new Date().toISOString() });
    setMessage("Next recurring job created in Jobs.");
    try { window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "recurring-job-created" } })); } catch {}
    onNavigate?.("jobs");
  }

  function sendToCommand() {
    if (!selected) return;
    sendRecurringToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshRecurringPage" data-recurring-api-create="20260626">

      <section className="freshFlowPromiseStrip freshFlowPagePurpose" aria-label="Recurring work flow">
        <article className="freshFlowLead">
          <span>Recurring jobs</span>
          <b>Set the repeat once. Churvox keeps the pattern clear.</b>
          <p>Regular work should not make the owner rebuild the same job every week.</p>
        </article>
        <article>
          <span>Customer</span>
          <b>Choose who and where</b>
          <p>Keep the repeat tied to the client, address and service.</p>
        </article>
        <article className="freshFlowQuiet">
          <span>Schedule</span>
          <b>Weekly, fortnightly, monthly or custom</b>
          <p>The repeat pattern stays underneath and feeds the work board.</p>
        </article>
        <article className="freshFlowDecision">
          <span>Owner check</span>
          <b>Confirm the next run</b>
          <p>If something needs attention, send it to Command instead of hunting for it later.</p>
        </article>
      </section>

      <div className="freshRecurringHero">
        <div>
          <span>Recurring jobs</span>
          <h1>Repeat work without doubling up</h1>
          <p>Manage weekly, fortnightly, monthly and custom repeat jobs before they hit Dispatch.</p>
        </div>

        <div className="freshRecurringStats">
          <div><b>{items.length}</b><small>repeats</small></div>
          <div><b>{active}</b><small>active</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>${monthlyValue}</b><small>active value</small></div>
        </div>
      </div>

      {message ? <section className="freshItem"><b>Recurring status</b><span>{message}</span></section> : null}
      {error ? <section className="freshItem need"><b>Recurring needs attention</b><span>{error}</span></section> : null}

      <div className="freshRecurringLayout">
        <aside className="freshRecurringList">
          <header>
            <div>
              <b>Repeat queue</b>
              <span>Next visit control</span>
            </div>
            <button type="button" onClick={addRecurring}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.client}</b>
              <span>{item.service}</span>
              <small>{item.frequency} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshRecurringReset" onClick={resetRecurring}>
            Reset repeats
          </button>
        </aside>

        {selected && (
          <article className="freshRecurringDetail">
            <div className="freshRecurringHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.client}</h2>
                <p>{selected.service} · {selected.frequency}</p>
              </div>

              <div className="freshRecurringHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" disabled={busy} onClick={createNextJob}>{busy ? "Creating..." : "Create next job"}</button>
              </div>
            </div>

            <div className="freshRecurringCards">
              <section>
                <span>Next visit</span>
                <b>{selected.nextDate}</b>
                <p>Churvox can prepare the next job for owner approval.</p>
              </section>

              <section>
                <span>Worker</span>
                <b>{selected.worker}</b>
                <p>Default worker for this repeat service.</p>
              </section>

              <section>
                <span>Price</span>
                <b>${selected.price}</b>
                <p>Default price before extras or owner edits.</p>
              </section>
            </div>

            <div className="freshRecurringForm">
              <label>
                <span>Client</span>
                <input value={selected.client} onChange={(event) => updateItem(selected.id, { client: event.target.value })} />
              </label>

              <label>
                <span>Service</span>
                <input value={selected.service} onChange={(event) => updateItem(selected.id, { service: event.target.value })} />
              </label>

              <label>
                <span>Frequency</span>
                <select value={selected.frequency} onChange={(event) => updateItem(selected.id, { frequency: event.target.value })}>
                  <option>Weekly</option>
                  <option>Fortnightly</option>
                  <option>3-weekly</option>
                  <option>Monthly</option>
                  <option>Custom</option>
                </select>
              </label>

              <label>
                <span>Next date</span>
                <input value={selected.nextDate} onChange={(event) => updateItem(selected.id, { nextDate: event.target.value })} />
              </label>

              <label>
                <span>Worker</span>
                <input value={selected.worker} onChange={(event) => updateItem(selected.id, { worker: event.target.value })} />
              </label>

              <label>
                <span>Price</span>
                <input type="number" value={selected.price} onChange={(event) => updateItem(selected.id, { price: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Active</option>
                  <option>Review</option>
                  <option>Paused</option>
                  <option>Archived</option>
                </select>
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshRecurringActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Active" })}>Activate</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Paused" })}>Pause</button>
              <button type="button" onClick={() => onNavigate?.("dispatch")}>Open Dispatch</button>
              <button type="button" onClick={() => onNavigate?.("routes")}>Open Routes</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
