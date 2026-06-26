import React from "react";

const BILLING_KEY = "churvox:fresh-billing:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "bi-1",
    plan: "Operator",
    price: "$149/month + GST",
    status: "Trial active",
    trial: "7 days left",
    team: "12 / 25 active team members",
    aiActions: "742 / 1500 AI Operator Actions",
    invoices: "86 invoices this month",
    note: "Most Popular. AI runs the admin and owner approves.",
    nextAction: "Keep testing Command, approvals, invoices and worker flow before billing starts.",
  },
  {
    id: "bi-2",
    plan: "Command",
    price: "$299/month + GST",
    status: "Upgrade option",
    trial: "14-day free trial, no card",
    team: "Up to 50 active team members",
    aiActions: "Higher AI Operator Actions and automation runs",
    invoices: "Accounting sync included plus advanced scale controls",
    note: "For bigger teams needing accounting sync, payroll workspace, advanced roles and priority support.",
    nextAction: "Upgrade when the business needs more team capacity and included accounting sync.",
  },
  {
    id: "bi-3",
    plan: "Command Growth Pack",
    price: "$99/month + GST",
    status: "Add-on option",
    trial: "Only for Command",
    team: "+50 active team members",
    aiActions: "Extra job capacity, AI Operator Actions and automation runs",
    invoices: "Extra admin and payroll capacity",
    note: "Active team members means inactive or old staff records do not count as billable.",
    nextAction: "Add only when Command reaches team or admin capacity.",
  },
];

const lockedPlans = [
  "Start — $39/month + GST",
  "Crew — $89/month + GST",
  "Operator — $149/month + GST",
  "Command — $299/month + GST",
  "Command Growth Pack — $99/month + GST",
];

function readBilling() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(BILLING_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveBilling(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BILLING_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "billing" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendBillingToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `billing-${item.id}-${Date.now()}`,
      group: "Billing",
      title: "Plan or usage needs owner review",
      info: `${item.plan} · ${item.price} · ${item.status}`,
      urgency: item.status.includes("Trial") ? "Trial" : "Billing",
      found: `${item.plan} is currently marked as ${item.status}.`,
      prepared: `Churvox prepared billing guidance: ${item.nextAction}`,
      why: item.note,
      owner: "Review plan, check usage, open Plans, or update billing decision.",
      area: "Plan / Billing Usage",
      page: "billing",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "billing-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshBilling({ onNavigate }) {
  const [items, setItems] = React.useState(readBilling);
  const [selectedId, setSelectedId] = React.useState(() => readBilling()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const trialActive = items.filter((item) => item.status.includes("Trial")).length;
  const paidOptions = items.filter((item) => item.price.includes("$")).length;
  const commandOptions = items.filter((item) => item.plan.includes("Command")).length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveBilling(next);
      return next;
    });
  }

  function addBillingRow() {
    const next = {
      id: `bi-${Date.now()}`,
      plan: "Start",
      price: "$39/month + GST",
      status: "Draft",
      trial: "14-day free trial, no card",
      team: "Small starter plan",
      aiActions: "Starter AI approval support",
      invoices: "Basic job, quote and invoice flow",
      note: "Churvox does the admin. You approve.",
      nextAction: "Confirm plan fit before launch.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveBilling(updated);
  }

  function resetBilling() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveBilling(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendBillingToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshBillingPage">
      <div className="freshBillingHero">
        <div>
          <span>Plan / billing usage</span>
          <h1>Show the owner what plan they are on and what they are using</h1>
          <p>Keep the locked Churvox pricing clear: Start, Crew, Operator, Command and Command Growth Pack with a 14-day free trial.</p>
        </div>

        <div className="freshBillingStats">
          <div><b>{total}</b><small>billing rows</small></div>
          <div><b>{trialActive}</b><small>trial active</small></div>
          <div><b>{paidOptions}</b><small>paid options</small></div>
          <div><b>{commandOptions}</b><small>command items</small></div>
        </div>
      </div>

      <div className="freshBillingPriceStrip">
        {lockedPlans.map((plan) => (
          <span key={plan}>{plan}</span>
        ))}
      </div>

      <div className="freshBillingLayout">
        <aside className="freshBillingList">
          <header>
            <div>
              <b>Billing desk</b>
              <span>14-day free trial, no card</span>
            </div>
            <button type="button" onClick={addBillingRow}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.plan}</b>
              <span>{item.price}</span>
              <small>{item.status} · {item.trial}</small>
            </button>
          ))}

          <button type="button" className="freshBillingReset" onClick={resetBilling}>
            Reset billing
          </button>
        </aside>

        {selected && (
          <article className="freshBillingDetail">
            <div className="freshBillingHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.plan}</h2>
                <p>{selected.price} · {selected.trial}</p>
              </div>

              <div className="freshBillingHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("plans")}>Open Plans</button>
                <button type="button" onClick={() => onNavigate?.("reports")}>Open Reports</button>
              </div>
            </div>

            <div className="freshBillingCards">
              <section>
                <span>Team usage</span>
                <b>{selected.team}</b>
                <p>Use active team members so old inactive staff do not count as billable.</p>
              </section>

              <section>
                <span>AI usage</span>
                <b>{selected.aiActions}</b>
                <p>AI Operator Actions are the Churvox value driver.</p>
              </section>

              <section>
                <span>Money workflow</span>
                <b>{selected.invoices}</b>
                <p>Job → Invoice → Paid → Synced.</p>
              </section>
            </div>

            <div className="freshBillingForm">
              <label>
                <span>Plan</span>
                <select value={selected.plan} onChange={(event) => updateItem(selected.id, { plan: event.target.value })}>
                  <option>Start</option>
                  <option>Crew</option>
                  <option>Operator</option>
                  <option>Command</option>
                  <option>Command Growth Pack</option>
                </select>
              </label>

              <label>
                <span>Price</span>
                <select value={selected.price} onChange={(event) => updateItem(selected.id, { price: event.target.value })}>
                  <option>$39/month + GST</option>
                  <option>$89/month + GST</option>
                  <option>$149/month + GST</option>
                  <option>$299/month + GST</option>
                  <option>$99/month + GST</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Trial active</option>
                  <option>Active</option>
                  <option>Upgrade option</option>
                  <option>Add-on option</option>
                  <option>Draft</option>
                  <option>Needs owner</option>
                </select>
              </label>

              <label>
                <span>Trial</span>
                <input value={selected.trial} onChange={(event) => updateItem(selected.id, { trial: event.target.value })} />
              </label>

              <label>
                <span>Team</span>
                <input value={selected.team} onChange={(event) => updateItem(selected.id, { team: event.target.value })} />
              </label>

              <label>
                <span>AI actions</span>
                <input value={selected.aiActions} onChange={(event) => updateItem(selected.id, { aiActions: event.target.value })} />
              </label>

              <label>
                <span>Invoices / sync</span>
                <input value={selected.invoices} onChange={(event) => updateItem(selected.id, { invoices: event.target.value })} />
              </label>

              <label className="wide">
                <span>Billing note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next owner action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>
            </div>

            <div className="freshBillingActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Active" })}>Mark active</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Trial active" })}>Trial active</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs owner" })}>Needs owner</button>
              <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
              <button type="button" onClick={() => onNavigate?.("integrations")}>Open Integrations</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
