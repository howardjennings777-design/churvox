import React from "react";

const CONTRACTS_KEY = "churvox:fresh-contracts:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "ct-1",
    title: "Recurring lawn care service terms",
    client: "Regular customers",
    area: "Recurring",
    status: "Needs review",
    priority: "High",
    agreementType: "Service terms",
    risk: "Medium",
    summary: "Fortnightly service, weather delays, access, green waste and payment expectations.",
    ownerDecision: "Owner checks wording before using for real recurring customers.",
    nextAction: "Review terms and connect to recurring job setup.",
  },
  {
    id: "ct-2",
    title: "Quote acceptance terms",
    client: "All quote customers",
    area: "Quotes",
    status: "Draft",
    priority: "High",
    agreementType: "Quote terms",
    risk: "High",
    summary: "Explains quote validity, deposits, variations, extra work and payment due dates.",
    ownerDecision: "Make sure customers understand extras before invoice disputes happen.",
    nextAction: "Open quote templates and add plain-language acceptance terms.",
  },
  {
    id: "ct-3",
    title: "Subcontractor work agreement",
    client: "External crew",
    area: "Subcontractors",
    status: "Blocked",
    priority: "Medium",
    agreementType: "Subcontractor agreement",
    risk: "High",
    summary: "Covers job assignment, insurance, customer contact, payment rate, photos and conduct.",
    ownerDecision: "Do not assign outside crew until agreement and insurance are checked.",
    nextAction: "Open subcontractors and documents before approving.",
  },
];

function readContracts() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(CONTRACTS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveContracts(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONTRACTS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "contracts" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendContractToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `contract-${item.id}-${Date.now()}`,
      group: "Contracts",
      title: "Agreement needs owner review",
      info: `${item.title} · ${item.status} · ${item.risk} risk`,
      urgency: item.priority,
      found: `${item.agreementType} for ${item.client} is marked ${item.status}.`,
      prepared: `Churvox prepared owner action: ${item.nextAction}`,
      why: item.summary,
      owner: "Approve terms, edit wording, open related area, or keep blocked.",
      area: "Contracts / Agreements",
      page: "contracts",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "contract-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshContracts({ onNavigate }) {
  const [items, setItems] = React.useState(readContracts);
  const [selectedId, setSelectedId] = React.useState(() => readContracts()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const approved = items.filter((item) => item.status === "Approved").length;
  const review = items.filter((item) => item.status === "Needs review").length;
  const highRisk = items.filter((item) => item.risk === "High").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveContracts(next);
      return next;
    });
  }

  function addContract() {
    const next = {
      id: `ct-${Date.now()}`,
      title: "New agreement",
      client: "Customer / crew",
      area: "Quotes",
      status: "Draft",
      priority: "Medium",
      agreementType: "Service terms",
      risk: "Medium",
      summary: "Add agreement summary.",
      ownerDecision: "Owner checks wording before use.",
      nextAction: "Review terms before sending or applying.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveContracts(updated);
  }

  function resetContracts() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveContracts(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendContractToCommand(selected);
    onNavigate?.("command");
  }

  function openArea(area) {
    const map = {
      Recurring: "recurring",
      Quotes: "quotes",
      Subcontractors: "subcontractors",
      Documents: "documents",
      Clients: "clients",
      Invoices: "invoices",
      Settings: "settings",
      Security: "security",
    };
    onNavigate?.(map[area] || "documents");
  }

  return (
    <section className="freshContractsPage">
      <div className="freshContractsHero">
        <div>
          <span>Contracts / terms / agreements</span>
          <h1>Keep service terms clear before jobs, quotes and invoices turn messy</h1>
          <p>Track quote terms, recurring service rules, subcontractor agreements, payment wording and owner-approved customer conditions.</p>
        </div>

        <div className="freshContractsStats">
          <div><b>{total}</b><small>agreements</small></div>
          <div><b>{approved}</b><small>approved</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{highRisk}</b><small>high risk</small></div>
        </div>
      </div>

      <div className="freshContractsLayout">
        <aside className="freshContractsList">
          <header>
            <div>
              <b>Agreement desk</b>
              <span>{review + highRisk} need owner check</span>
            </div>
            <button type="button" onClick={addContract}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.title}</b>
              <span>{item.client} · {item.area}</span>
              <small>{item.status} · {item.risk} risk</small>
            </button>
          ))}

          <button type="button" className="freshContractsReset" onClick={resetContracts}>
            Reset contracts
          </button>
        </aside>

        {selected && (
          <article className="freshContractsDetail">
            <div className="freshContractsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.title}</h2>
                <p>{selected.client} · {selected.agreementType} · {selected.priority} priority</p>
              </div>

              <div className="freshContractsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => openArea(selected.area)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("documents")}>Open Documents</button>
              </div>
            </div>

            <div className="freshContractsCards">
              <section>
                <span>Summary</span>
                <b>{selected.agreementType}</b>
                <p>{selected.summary}</p>
              </section>

              <section>
                <span>Owner decision</span>
                <b>{selected.risk} risk</b>
                <p>{selected.ownerDecision}</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.area}</b>
                <p>{selected.nextAction}</p>
              </section>
            </div>

            <div className="freshContractsForm">
              <label>
                <span>Title</span>
                <input value={selected.title} onChange={(event) => updateItem(selected.id, { title: event.target.value })} />
              </label>

              <label>
                <span>Client / group</span>
                <input value={selected.client} onChange={(event) => updateItem(selected.id, { client: event.target.value })} />
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Recurring</option>
                  <option>Quotes</option>
                  <option>Subcontractors</option>
                  <option>Documents</option>
                  <option>Clients</option>
                  <option>Invoices</option>
                  <option>Settings</option>
                  <option>Security</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Draft</option>
                  <option>Needs review</option>
                  <option>Approved</option>
                  <option>Blocked</option>
                  <option>Live</option>
                  <option>Archived</option>
                </select>
              </label>

              <label>
                <span>Agreement type</span>
                <select value={selected.agreementType} onChange={(event) => updateItem(selected.id, { agreementType: event.target.value })}>
                  <option>Service terms</option>
                  <option>Quote terms</option>
                  <option>Subcontractor agreement</option>
                  <option>Payment terms</option>
                  <option>Recurring agreement</option>
                  <option>Privacy / data terms</option>
                </select>
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
                <span>Risk</span>
                <select value={selected.risk} onChange={(event) => updateItem(selected.id, { risk: event.target.value })}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>

              <label className="wide">
                <span>Summary</span>
                <textarea value={selected.summary} onChange={(event) => updateItem(selected.id, { summary: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner decision</span>
                <textarea value={selected.ownerDecision} onChange={(event) => updateItem(selected.id, { ownerDecision: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>
            </div>

            <div className="freshContractsActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Approved" })}>Approve</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Live" })}>Mark live</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Block</button>
              <button type="button" onClick={() => onNavigate?.("templates")}>Open Templates</button>
              <button type="button" onClick={() => onNavigate?.("security")}>Open Security</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
