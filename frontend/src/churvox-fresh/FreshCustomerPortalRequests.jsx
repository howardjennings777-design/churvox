import React from "react";

const PORTAL_REQUESTS_KEY = "churvox:fresh-customer-portal-requests:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "pr-1",
    customer: "Lower Hutt Medical Centre",
    request: "Move next garden tidy to Friday morning",
    type: "Reschedule",
    linkedTo: "JOB-1042",
    priority: "High",
    status: "Needs owner approval",
    received: "Today 8:40am",
    aiFound: "Customer requested a schedule change that affects the Friday route.",
    aiPrepared: "Churvox prepared a new time suggestion and customer reply.",
    ownerNote: "Check crew availability before approving.",
  },
  {
    id: "pr-2",
    customer: "Birchville Rentals",
    request: "Add driveway water blasting to next visit",
    type: "Extra work",
    linkedTo: "QUOTE-221",
    priority: "Medium",
    status: "Draft reply",
    received: "Yesterday 4:10pm",
    aiFound: "Customer asked for extra work that should become a quote add-on.",
    aiPrepared: "Churvox prepared a quote note and reply asking for photo confirmation.",
    ownerNote: "Approve quote add-on before sending.",
  },
  {
    id: "pr-3",
    customer: "Aroha Property Care",
    request: "Upload before and after photos from last lawn service",
    type: "Photo request",
    linkedTo: "JOB-1044",
    priority: "Low",
    status: "Ready to send",
    received: "Mon 1:20pm",
    aiFound: "Customer asked for proof photos from completed job.",
    aiPrepared: "Churvox prepared a photo update message.",
    ownerNote: "Send once photos are checked.",
  },
];

function readRequests() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(PORTAL_REQUESTS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveRequests(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PORTAL_REQUESTS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "customerportal" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendRequestToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `portal-request-${item.id}-${Date.now()}`,
      group: "Customer Portal",
      title: "Customer portal request needs review",
      info: `${item.customer} · ${item.type} · ${item.priority}`,
      urgency: item.priority,
      found: item.aiFound,
      prepared: item.aiPrepared,
      why: item.request,
      owner: "Approve, edit reply, open linked work, or decline request.",
      area: "Customer Portal Requests",
      page: "customerportal",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "portal-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshCustomerPortalRequests({ onNavigate }) {
  const [items, setItems] = React.useState(readRequests);
  const [selectedId, setSelectedId] = React.useState(() => readRequests()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const needsApproval = items.filter((item) => item.status === "Needs owner approval").length;
  const ready = items.filter((item) => item.status === "Ready to send").length;
  const high = items.filter((item) => item.priority === "High").length;
  const total = items.length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveRequests(next);
      return next;
    });
  }

  function addRequest() {
    const next = {
      id: `pr-${Date.now()}`,
      customer: "New customer",
      request: "Add customer request details.",
      type: "General request",
      linkedTo: "Unlinked",
      priority: "Medium",
      status: "Needs owner approval",
      received: "Now",
      aiFound: "Churvox found a new customer portal request.",
      aiPrepared: "Churvox prepared a suggested owner action.",
      ownerNote: "Review before approving.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveRequests(updated);
  }

  function resetRequests() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveRequests(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendRequestToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshCustomerPortalPage">
      <div className="freshCustomerPortalHero">
        <div>
          <span>Customer portal requests</span>
          <h1>Let customers ask, but keep owners in control</h1>
          <p>Review customer reschedules, extras, photo requests, quote questions and job updates before anything changes.</p>
        </div>

        <div className="freshCustomerPortalStats">
          <div><b>{total}</b><small>requests</small></div>
          <div><b>{needsApproval}</b><small>need approval</small></div>
          <div><b>{ready}</b><small>ready</small></div>
          <div><b>{high}</b><small>high priority</small></div>
        </div>
      </div>

      <div className="freshCustomerPortalLayout">
        <aside className="freshCustomerPortalList">
          <header>
            <div>
              <b>Request inbox</b>
              <span>{needsApproval} waiting on owner</span>
            </div>
            <button type="button" onClick={addRequest}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.customer}</b>
              <span>{item.type} · {item.linkedTo}</span>
              <small>{item.priority} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshCustomerPortalReset" onClick={resetRequests}>
            Reset portal requests
          </button>
        </aside>

        {selected && (
          <article className="freshCustomerPortalDetail">
            <div className="freshCustomerPortalHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.customer}</h2>
                <p>{selected.type} · {selected.linkedTo} · received {selected.received}</p>
              </div>

              <div className="freshCustomerPortalHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
                <button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button>
              </div>
            </div>

            <div className="freshCustomerPortalCards">
              <section>
                <span>AI found</span>
                <b>{selected.type}</b>
                <p>{selected.aiFound}</p>
              </section>

              <section>
                <span>AI prepared</span>
                <b>Owner-ready</b>
                <p>{selected.aiPrepared}</p>
              </section>

              <section>
                <span>Priority</span>
                <b>{selected.priority}</b>
                <p>Owner can approve, edit, decline, or open the linked work.</p>
              </section>
            </div>

            <div className="freshCustomerPortalForm">
              <label>
                <span>Customer</span>
                <input value={selected.customer} onChange={(event) => updateItem(selected.id, { customer: event.target.value })} />
              </label>

              <label>
                <span>Type</span>
                <select value={selected.type} onChange={(event) => updateItem(selected.id, { type: event.target.value })}>
                  <option>Reschedule</option>
                  <option>Extra work</option>
                  <option>Photo request</option>
                  <option>Quote question</option>
                  <option>Invoice question</option>
                  <option>General request</option>
                </select>
              </label>

              <label>
                <span>Linked to</span>
                <input value={selected.linkedTo} onChange={(event) => updateItem(selected.id, { linkedTo: event.target.value })} />
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
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Needs owner approval</option>
                  <option>Draft reply</option>
                  <option>Ready to send</option>
                  <option>Approved</option>
                  <option>Declined</option>
                  <option>Closed</option>
                </select>
              </label>

              <label>
                <span>Received</span>
                <input value={selected.received} onChange={(event) => updateItem(selected.id, { received: event.target.value })} />
              </label>

              <label className="wide">
                <span>Customer request</span>
                <textarea value={selected.request} onChange={(event) => updateItem(selected.id, { request: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.ownerNote} onChange={(event) => updateItem(selected.id, { ownerNote: event.target.value })} />
              </label>
            </div>

            <div className="freshCustomerPortalActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Approved" })}>Approve</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Ready to send" })}>Ready to send</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Declined" })}>Decline</button>
              <button type="button" onClick={() => onNavigate?.("messages")}>Message customer</button>
              <button type="button" onClick={() => onNavigate?.("portal")}>Open Portal</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
