import React from "react";

const EXTRAS_KEY = "churvox:fresh-extras:v1";
const INVOICES_KEY = "churvox:fresh-invoices:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "extra-1",
    job: "Lawn service",
    client: "Aroha Property Care",
    type: "Green waste",
    status: "Needs approval",
    amount: 35,
    worker: "Matiu Rangi",
    note: "Extra green waste removed from back section.",
  },
  {
    id: "extra-2",
    job: "Garden tidy",
    client: "Lower Hutt Medical Centre",
    type: "Extra time",
    status: "Approved",
    amount: 68,
    worker: "Ana Williams",
    note: "Two extra hours approved by site contact.",
  },
  {
    id: "extra-3",
    job: "Driveway clean",
    client: "Birchville Rentals",
    type: "Materials",
    status: "Draft",
    amount: 22,
    worker: "Unassigned",
    note: "Chemical/material allowance if driveway clean proceeds.",
  },
];

function readExtras() {
  try {
    if (typeof window === "undefined") return defaults;

    const saved = window.localStorage.getItem(EXTRAS_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveExtras(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EXTRAS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "extras" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function readInvoices() {
  try {
    const saved = window.localStorage.getItem(INVOICES_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveInvoices(items) {
  try {
    window.localStorage.setItem(INVOICES_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "invoice-extra" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendExtraToCommand(extra) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const issue = {
      id: `extra-${extra.id}-${Date.now()}`,
      group: "Extras",
      title: "Extra charge needs review",
      info: `${extra.client} · ${extra.type} · $${extra.amount}`,
      urgency: extra.status === "Approved" ? "Ready for invoice" : "Owner approval",
      found: `${extra.worker} added an extra charge on ${extra.job}.`,
      prepared: "Churvox prepared an owner approval slip before this reaches the customer invoice.",
      why: "Extras are money changes. The owner should approve them before charging the customer.",
      owner: "Approve, edit, add to invoice, or decline the extra.",
      area: "Extras",
      page: "extras",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([issue, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "extra-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshExtras({ onNavigate }) {
  const [items, setItems] = React.useState(readExtras);
  const [selectedId, setSelectedId] = React.useState(() => readExtras()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const pending = items.filter((item) => item.status === "Needs approval").length;
  const approved = items.filter((item) => item.status === "Approved").length;
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  function updateExtra(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveExtras(next);
      return next;
    });
  }

  function addExtra() {
    const next = {
      id: `extra-${Date.now()}`,
      job: "New job extra",
      client: "New client",
      type: "Extra charge",
      status: "Draft",
      amount: 0,
      worker: "Owner",
      note: "New extra charge to review.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveExtras(updated);
  }

  function addToInvoice(extra) {
    const invoices = readInvoices();

    const invoice = {
      id: `INV-EX-${Date.now().toString().slice(-5)}`,
      client: extra.client,
      job: extra.job,
      status: "Draft",
      amount: Number(extra.amount || 0),
      gst: Number(extra.amount || 0) * 0.15,
      due: "Due in 7 days",
      sync: "Not synced yet",
      note: `Created from approved extra: ${extra.type}`,
      lines: [`${extra.type} · $${Number(extra.amount || 0).toFixed(2)}`],
    };

    saveInvoices([invoice, ...invoices]);
    updateExtra(extra.id, { status: "Added to invoice" });
    onNavigate?.("invoices");
  }

  function resetExtras() {
    saveExtras(defaults);
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
  }

  function sendToCommand() {
    if (!selected) return;
    sendExtraToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshExtrasPage">
      <div className="freshExtrasHero">
        <div>
          <span>Extras & materials</span>
          <h1>Charge extras without losing control</h1>
          <p>Capture worker extras, approve money changes, then push approved items into invoice drafts.</p>
        </div>

        <div className="freshExtrasStats">
          <div><b>{items.length}</b><small>extras</small></div>
          <div><b>{pending}</b><small>pending</small></div>
          <div><b>{approved}</b><small>approved</small></div>
          <div><b>${total}</b><small>total</small></div>
        </div>
      </div>

      <div className="freshExtrasLayout">
        <aside className="freshExtrasList">
          <header>
            <div>
              <b>Extra queue</b>
              <span>Owner approval first</span>
            </div>
            <button type="button" onClick={addExtra}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.type}</b>
              <span>{item.client}</span>
              <small>${item.amount} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshExtrasReset" onClick={resetExtras}>
            Reset extras
          </button>
        </aside>

        {selected && (
          <article className="freshExtrasDetail">
            <div className="freshExtrasHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.type}</h2>
                <p>{selected.client} · {selected.job}</p>
              </div>

              <div className="freshExtrasHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => addToInvoice(selected)}>Add to invoice</button>
              </div>
            </div>

            <div className="freshExtrasForm">
              <label>
                <span>Client</span>
                <input value={selected.client} onChange={(e) => updateExtra(selected.id, { client: e.target.value })} />
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(e) => updateExtra(selected.id, { job: e.target.value })} />
              </label>

              <label>
                <span>Type</span>
                <input value={selected.type} onChange={(e) => updateExtra(selected.id, { type: e.target.value })} />
              </label>

              <label>
                <span>Amount</span>
                <input type="number" value={selected.amount} onChange={(e) => updateExtra(selected.id, { amount: Number(e.target.value || 0) })} />
              </label>

              <label>
                <span>Worker</span>
                <input value={selected.worker} onChange={(e) => updateExtra(selected.id, { worker: e.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(e) => updateExtra(selected.id, { status: e.target.value })}>
                  <option>Draft</option>
                  <option>Needs approval</option>
                  <option>Approved</option>
                  <option>Declined</option>
                  <option>Added to invoice</option>
                </select>
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(e) => updateExtra(selected.id, { note: e.target.value })} />
              </label>
            </div>

            <div className="freshExtrasActions">
              <button type="button" onClick={() => updateExtra(selected.id, { status: "Approved" })}>Approve extra</button>
              <button type="button" onClick={() => updateExtra(selected.id, { status: "Declined" })}>Decline</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
              <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
