import React from "react";

const VARIATIONS_KEY = "churvox:fresh-variations:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "var-1",
    title: "Extra green waste removal",
    job: "Belmont lawn reset",
    client: "Belmont customer",
    amount: 85,
    status: "Needs approval",
    approval: "Customer approval needed",
    priority: "High",
    reason: "Crew found extra green waste that was not included in the original quote.",
    impact: "Adds time, disposal cost and invoice value.",
    nextAction: "Send variation to Command before adding it to the invoice.",
  },
  {
    id: "var-2",
    title: "Extra hedge trim",
    job: "Fortnightly garden run",
    client: "Upper Hutt client",
    amount: 45,
    status: "Approved",
    approval: "Owner approved",
    priority: "Medium",
    reason: "Customer asked for side hedge to be trimmed while crew was onsite.",
    impact: "Small upsell that should be shown clearly on invoice.",
    nextAction: "Add approved extra to invoice draft.",
  },
  {
    id: "var-3",
    title: "Materials added",
    job: "Handyman repair",
    client: "Naenae property",
    amount: 120,
    status: "Draft",
    approval: "Owner review",
    priority: "Medium",
    reason: "Job needed extra hinges and timber not priced in original quote.",
    impact: "Material cost must be recovered before invoice is sent.",
    nextAction: "Confirm materials and customer wording.",
  },
];

function readVariations() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(VARIATIONS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveVariations(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VARIATIONS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "variations" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ")}`;
}

function sendVariationToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `variation-${item.id}-${Date.now()}`,
      group: "Variations",
      title: "Job variation needs owner review",
      info: `${item.title} · ${money(item.amount)} · ${item.status}`,
      urgency: item.priority,
      found: `${item.job} has a variation: ${item.reason}`,
      prepared: `Churvox prepared owner action: ${item.nextAction}`,
      why: item.impact,
      owner: "Approve variation, open job, add to invoice, or keep as draft.",
      area: "Variations / Change Orders",
      page: "variations",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "variation-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshVariations({ onNavigate }) {
  const [items, setItems] = React.useState(readVariations);
  const [selectedId, setSelectedId] = React.useState(() => readVariations()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const pending = items.filter((item) => item.status === "Needs approval").length;
  const approved = items.filter((item) => item.status === "Approved").length;
  const value = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveVariations(next);
      return next;
    });
  }

  function addVariation() {
    const next = {
      id: `var-${Date.now()}`,
      title: "New variation",
      job: "Job name",
      client: "Client name",
      amount: 0,
      status: "Draft",
      approval: "Owner review",
      priority: "Medium",
      reason: "Add why the job changed.",
      impact: "Add cost, time or invoice impact.",
      nextAction: "Review before adding to invoice.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveVariations(updated);
  }

  function resetVariations() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveVariations(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendVariationToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshVariationsPage">
      <div className="freshVariationsHero">
        <div>
          <span>Variations / change orders</span>
          <h1>Catch extra work before it disappears from the invoice</h1>
          <p>Track job changes, added materials, extra labour and customer approval so owners can approve before billing.</p>
        </div>

        <div className="freshVariationsStats">
          <div><b>{total}</b><small>variations</small></div>
          <div><b>{money(value)}</b><small>extra value</small></div>
          <div><b>{pending}</b><small>pending</small></div>
          <div><b>{approved}</b><small>approved</small></div>
        </div>
      </div>

      <div className="freshVariationsLayout">
        <aside className="freshVariationsList">
          <header>
            <div>
              <b>Variation desk</b>
              <span>{pending} need approval</span>
            </div>
            <button type="button" onClick={addVariation}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.title}</b>
              <span>{item.job} · {item.client}</span>
              <small>{money(item.amount)} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshVariationsReset" onClick={resetVariations}>
            Reset variations
          </button>
        </aside>

        {selected && (
          <article className="freshVariationsDetail">
            <div className="freshVariationsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.title}</h2>
                <p>{selected.job} · {selected.client} · {money(selected.amount)}</p>
              </div>

              <div className="freshVariationsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
                <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
              </div>
            </div>

            <div className="freshVariationsCards">
              <section>
                <span>Reason</span>
                <b>{selected.approval}</b>
                <p>{selected.reason}</p>
              </section>

              <section>
                <span>Invoice impact</span>
                <b>{money(selected.amount)}</b>
                <p>{selected.impact}</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.priority}</b>
                <p>{selected.nextAction}</p>
              </section>
            </div>

            <div className="freshVariationsForm">
              <label>
                <span>Title</span>
                <input value={selected.title} onChange={(event) => updateItem(selected.id, { title: event.target.value })} />
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Client</span>
                <input value={selected.client} onChange={(event) => updateItem(selected.id, { client: event.target.value })} />
              </label>

              <label>
                <span>Amount</span>
                <input type="number" value={selected.amount} onChange={(event) => updateItem(selected.id, { amount: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Draft</option>
                  <option>Needs approval</option>
                  <option>Approved</option>
                  <option>Declined</option>
                  <option>Added to invoice</option>
                </select>
              </label>

              <label>
                <span>Approval</span>
                <select value={selected.approval} onChange={(event) => updateItem(selected.id, { approval: event.target.value })}>
                  <option>Owner review</option>
                  <option>Customer approval needed</option>
                  <option>Owner approved</option>
                  <option>Customer approved</option>
                  <option>Not approved</option>
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

              <label className="wide">
                <span>Reason</span>
                <textarea value={selected.reason} onChange={(event) => updateItem(selected.id, { reason: event.target.value })} />
              </label>

              <label className="wide">
                <span>Impact</span>
                <textarea value={selected.impact} onChange={(event) => updateItem(selected.id, { impact: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>
            </div>

            <div className="freshVariationsActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Approved", approval: "Owner approved" })}>Approve</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Added to invoice" })}>Add to invoice</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Declined", approval: "Not approved" })}>Decline</button>
              <button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button>
              <button type="button" onClick={() => onNavigate?.("profit")}>Open Profit</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
