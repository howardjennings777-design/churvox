import React from "react";

const XERO_KEY = "churvox:fresh-xero:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "xe-1",
    item: "Connection status",
    area: "Auth",
    status: "Placeholder",
    phase: "Future integration",
    sync: "Not connected",
    direction: "Churvox ↔ Xero",
    data: "Organisation, contacts, invoices and payments",
    note: "Xero connection will come later. For now this shows what the owner will approve before sync.",
    nextAction: "Keep Xero hidden from live sync until credentials, scopes and webhook rules are ready.",
  },
  {
    id: "xe-2",
    item: "Invoice sync",
    area: "Invoices",
    status: "Planned",
    phase: "Phase one",
    sync: "Draft invoice review",
    direction: "Churvox → Xero",
    data: "Customer, line items, GST, total, due date and payment status",
    note: "Owner approves invoice in Churvox before sending or syncing.",
    nextAction: "Start with simple invoice create/update and payment status check.",
  },
  {
    id: "xe-3",
    item: "Customer import",
    area: "Clients",
    status: "Planned",
    phase: "Phase one",
    sync: "Customer list",
    direction: "Xero → Churvox",
    data: "Contact name, email, phone, address and account reference",
    note: "Useful for businesses moving into Churvox with existing customers.",
    nextAction: "Import contacts carefully and avoid duplicates.",
  },
];

function readXero() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(XERO_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveXero(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(XERO_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "xero" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendXeroToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `xero-${item.id}-${Date.now()}`,
      group: "Xero",
      title: "Xero integration item needs owner review",
      info: `${item.item} · ${item.status} · ${item.phase}`,
      urgency: item.status,
      found: `${item.area} sync is marked ${item.status}.`,
      prepared: `Churvox prepared the Xero next action: ${item.nextAction}`,
      why: item.note,
      owner: "Approve integration direction, open Integrations, or keep as placeholder.",
      area: "Xero Integration",
      page: "xero",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "xero-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshXero({ onNavigate }) {
  const [items, setItems] = React.useState(readXero);
  const [selectedId, setSelectedId] = React.useState(() => readXero()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const planned = items.filter((item) => item.status === "Planned").length;
  const placeholders = items.filter((item) => item.status === "Placeholder").length;
  const phaseOne = items.filter((item) => item.phase === "Phase one").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveXero(next);
      return next;
    });
  }

  function addXeroRow() {
    const next = {
      id: `xe-${Date.now()}`,
      item: "New Xero sync item",
      area: "Invoices",
      status: "Planned",
      phase: "Future integration",
      sync: "Not connected",
      direction: "Churvox ↔ Xero",
      data: "Add data fields.",
      note: "Keep as placeholder until Xero scopes and security are ready.",
      nextAction: "Decide if this belongs in phase one or later.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveXero(updated);
  }

  function resetXero() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveXero(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendXeroToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshXeroPage">
      <div className="freshXeroHero">
        <div>
          <span>Xero integration placeholder</span>
          <h1>Plan Xero sync without turning on risky live accounting yet</h1>
          <p>Map what Churvox should send, receive and hold for owner approval before a real Xero connection is added.</p>
        </div>

        <div className="freshXeroStats">
          <div><b>{total}</b><small>sync items</small></div>
          <div><b>{planned}</b><small>planned</small></div>
          <div><b>{placeholders}</b><small>placeholder</small></div>
          <div><b>{phaseOne}</b><small>phase one</small></div>
        </div>
      </div>

      <div className="freshXeroNotice">
        <b>Placeholder only</b>
        <span>No live Xero connection is created here. This is safe preview planning for scopes, invoices, contacts and payments.</span>
      </div>

      <div className="freshXeroLayout">
        <aside className="freshXeroList">
          <header>
            <div>
              <b>Xero sync desk</b>
              <span>{phaseOne} phase-one items</span>
            </div>
            <button type="button" onClick={addXeroRow}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.item}</b>
              <span>{item.area} · {item.direction}</span>
              <small>{item.status} · {item.phase}</small>
            </button>
          ))}

          <button type="button" className="freshXeroReset" onClick={resetXero}>
            Reset Xero plan
          </button>
        </aside>

        {selected && (
          <article className="freshXeroDetail">
            <div className="freshXeroHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.item}</h2>
                <p>{selected.area} · {selected.phase} · {selected.direction}</p>
              </div>

              <div className="freshXeroHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("integrations")}>Open Integrations</button>
                <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
              </div>
            </div>

            <div className="freshXeroCards">
              <section>
                <span>Sync</span>
                <b>{selected.sync}</b>
                <p>Keep accounting sync owner-approved and simple for phase one.</p>
              </section>

              <section>
                <span>Data</span>
                <b>{selected.area}</b>
                <p>{selected.data}</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.phase}</b>
                <p>{selected.nextAction}</p>
              </section>
            </div>

            <div className="freshXeroForm">
              <label>
                <span>Item</span>
                <input value={selected.item} onChange={(event) => updateItem(selected.id, { item: event.target.value })} />
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Auth</option>
                  <option>Invoices</option>
                  <option>Clients</option>
                  <option>Payments</option>
                  <option>GST</option>
                  <option>Reports</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Placeholder</option>
                  <option>Planned</option>
                  <option>Needs review</option>
                  <option>Ready later</option>
                  <option>Blocked</option>
                </select>
              </label>

              <label>
                <span>Phase</span>
                <select value={selected.phase} onChange={(event) => updateItem(selected.id, { phase: event.target.value })}>
                  <option>Phase one</option>
                  <option>Future integration</option>
                  <option>Later</option>
                  <option>Blocked</option>
                </select>
              </label>

              <label>
                <span>Sync</span>
                <input value={selected.sync} onChange={(event) => updateItem(selected.id, { sync: event.target.value })} />
              </label>

              <label>
                <span>Direction</span>
                <select value={selected.direction} onChange={(event) => updateItem(selected.id, { direction: event.target.value })}>
                  <option>Churvox → Xero</option>
                  <option>Xero → Churvox</option>
                  <option>Churvox ↔ Xero</option>
                  <option>No live sync yet</option>
                </select>
              </label>

              <label className="wide">
                <span>Data</span>
                <textarea value={selected.data} onChange={(event) => updateItem(selected.id, { data: event.target.value })} />
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

            <div className="freshXeroActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Planned" })}>Mark planned</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Blocked</button>
              <button type="button" onClick={() => onNavigate?.("clients")}>Open Clients</button>
              <button type="button" onClick={() => onNavigate?.("payments")}>Open Payments</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
