import React from "react";

const FOLLOWUPS_KEY = "churvox:fresh-followups:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "fu-1",
    customer: "Aroha Property Care",
    type: "Review request",
    related: "Lawn service",
    due: "Today",
    status: "Ready",
    channel: "Email",
    priority: "Normal",
    message: "Thanks again for using Churvox Lawn Service. Could you leave us a quick review?",
    note: "Job completed and photos uploaded.",
  },
  {
    id: "fu-2",
    customer: "Lower Hutt Medical Centre",
    type: "Quote follow-up",
    related: "Garden tidy quote",
    due: "Tomorrow",
    status: "Needs owner",
    channel: "Email",
    priority: "High",
    message: "Just checking if you had any questions about the garden tidy quote.",
    note: "Commercial quote. Good chance to convert.",
  },
  {
    id: "fu-3",
    customer: "Birchville Rentals",
    type: "Access reminder",
    related: "Driveway clean",
    due: "Today",
    status: "Blocked",
    channel: "Phone",
    priority: "High",
    message: "Please confirm tenant access before we send the worker.",
    note: "Do not dispatch until access is confirmed.",
  },
];

function readFollowUps() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(FOLLOWUPS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveFollowUps(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "followups" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendFollowUpToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `followup-${item.id}-${Date.now()}`,
      group: "Follow-ups",
      title: "Customer follow-up needs review",
      info: `${item.customer} · ${item.type} · ${item.due}`,
      urgency: item.priority === "High" ? "High priority" : item.status,
      found: `${item.customer} has a ${item.type.toLowerCase()} due ${item.due}.`,
      prepared: item.message,
      why: item.note,
      owner: "Approve message, edit wording, call customer, or mark handled.",
      area: "Follow-ups",
      page: "followups",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "followup-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshFollowUps({ onNavigate }) {
  const [items, setItems] = React.useState(readFollowUps);
  const [selectedId, setSelectedId] = React.useState(() => readFollowUps()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const ready = items.filter((item) => item.status === "Ready").length;
  const owner = items.filter((item) => item.status === "Needs owner").length;
  const blocked = items.filter((item) => item.status === "Blocked").length;
  const high = items.filter((item) => item.priority === "High").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveFollowUps(next);
      return next;
    });
  }

  function addFollowUp() {
    const next = {
      id: `fu-${Date.now()}`,
      customer: "New customer",
      type: "Follow-up",
      related: "New job or quote",
      due: "Today",
      status: "Ready",
      channel: "Email",
      priority: "Normal",
      message: "Add follow-up message here.",
      note: "Add owner note here.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveFollowUps(updated);
  }

  function resetFollowUps() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveFollowUps(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendFollowUpToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshFollowUpsPage">
      <div className="freshFollowUpsHero">
        <div>
          <span>Follow-ups</span>
          <h1>Never let a customer go cold</h1>
          <p>Track quote follow-ups, overdue invoice nudges, rebook reminders, access checks and review requests.</p>
        </div>

        <div className="freshFollowUpsStats">
          <div><b>{items.length}</b><small>follow-ups</small></div>
          <div><b>{ready}</b><small>ready</small></div>
          <div><b>{owner}</b><small>owner</small></div>
          <div><b>{high}</b><small>high</small></div>
        </div>
      </div>

      <div className="freshFollowUpsLayout">
        <aside className="freshFollowUpsList">
          <header>
            <div>
              <b>Customer queue</b>
              <span>{blocked} blocked</span>
            </div>
            <button type="button" onClick={addFollowUp}>Add</button>
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
              <small>{item.due} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshFollowUpsReset" onClick={resetFollowUps}>
            Reset follow-ups
          </button>
        </aside>

        {selected && (
          <article className="freshFollowUpsDetail">
            <div className="freshFollowUpsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.customer}</h2>
                <p>{selected.type} · {selected.related}</p>
              </div>

              <div className="freshFollowUpsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("messages")}>Open Messages</button>
                <button type="button" onClick={() => onNavigate?.("clients")}>Open Clients</button>
              </div>
            </div>

            <div className="freshFollowUpsCards">
              <section>
                <span>Due</span>
                <b>{selected.due}</b>
                <p>{selected.channel} · {selected.priority} priority</p>
              </section>

              <section>
                <span>Message</span>
                <b>{selected.type}</b>
                <p>{selected.message}</p>
              </section>

              <section>
                <span>Owner note</span>
                <b>{selected.status}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshFollowUpsForm">
              <label>
                <span>Customer</span>
                <input value={selected.customer} onChange={(event) => updateItem(selected.id, { customer: event.target.value })} />
              </label>

              <label>
                <span>Type</span>
                <select value={selected.type} onChange={(event) => updateItem(selected.id, { type: event.target.value })}>
                  <option>Quote follow-up</option>
                  <option>Overdue invoice</option>
                  <option>Review request</option>
                  <option>Rebook reminder</option>
                  <option>Access reminder</option>
                  <option>Follow-up</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Ready</option>
                  <option>Needs owner</option>
                  <option>Blocked</option>
                  <option>Sent</option>
                  <option>Done</option>
                </select>
              </label>

              <label>
                <span>Related</span>
                <input value={selected.related} onChange={(event) => updateItem(selected.id, { related: event.target.value })} />
              </label>

              <label>
                <span>Due</span>
                <input value={selected.due} onChange={(event) => updateItem(selected.id, { due: event.target.value })} />
              </label>

              <label>
                <span>Channel</span>
                <select value={selected.channel} onChange={(event) => updateItem(selected.id, { channel: event.target.value })}>
                  <option>Email</option>
                  <option>Phone</option>
                  <option>SMS</option>
                  <option>Portal</option>
                  <option>Manual</option>
                </select>
              </label>

              <label>
                <span>Priority</span>
                <select value={selected.priority} onChange={(event) => updateItem(selected.id, { priority: event.target.value })}>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Low</option>
                </select>
              </label>

              <label className="wide">
                <span>Message</span>
                <textarea value={selected.message} onChange={(event) => updateItem(selected.id, { message: event.target.value })} />
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshFollowUpsActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Sent" })}>Mark sent</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Done" })}>Done</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs owner" })}>Needs owner</button>
              <button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button>
              <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
