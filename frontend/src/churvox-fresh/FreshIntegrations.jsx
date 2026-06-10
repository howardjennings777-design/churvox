import React from "react";

const INTEGRATIONS_KEY = "churvox:fresh-integrations:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "myob",
    name: "MYOB",
    status: "Ready to connect",
    type: "Accounting",
    plan: "Command included",
    action: "Sync invoices, customers and payments",
    note: "Phase one: invoices, contacts/customers and payment status.",
    risk: "Owner approves invoice sync before launch.",
  },
  {
    id: "xero",
    name: "Xero",
    status: "Planned",
    type: "Accounting",
    plan: "Operator add-on / Command included",
    action: "Sync invoices, customers and payment status",
    note: "Useful alternative for businesses already on Xero.",
    risk: "Needs developer app setup and consent screen.",
  },
  {
    id: "stripe",
    name: "Stripe",
    status: "Connected",
    type: "Payments",
    plan: "All paid plans",
    action: "Plan checkout and subscription billing",
    note: "Used for Churvox plan payments and subscription checkout.",
    risk: "Plan return must save selected plan properly.",
  },
  {
    id: "postmark",
    name: "Postmark",
    status: "Needs setup check",
    type: "Email",
    plan: "All plans",
    action: "Verification, onboarding and system emails",
    note: "Use for reliable transactional emails.",
    risk: "Bad email setup blocks onboarding.",
  },
  {
    id: "clicksend",
    name: "ClickSend",
    status: "Coming soon",
    type: "SMS",
    plan: "Later add-on",
    action: "SMS reminders and quick updates",
    note: "Keep disabled/greyed for launch unless fully tested.",
    risk: "SMS costs money and should not send by accident.",
  },
];

function readIntegrations() {
  try {
    if (typeof window === "undefined") return defaults;

    const saved = window.localStorage.getItem(INTEGRATIONS_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveIntegrations(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "integrations" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendIntegrationToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `integration-${item.id}-${Date.now()}`,
      group: "Integrations",
      title: `${item.name} integration needs review`,
      info: `${item.type} · ${item.status}`,
      urgency: item.status === "Connected" ? "Monitor" : "Setup review",
      found: `${item.name} is currently marked as ${item.status}.`,
      prepared: item.action,
      why: item.risk,
      owner: "Open integration setup, test connection, or keep disabled until launch ready.",
      area: "Integrations",
      page: "integrations",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "integration-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshIntegrations({ onNavigate }) {
  const [items, setItems] = React.useState(readIntegrations);
  const [selectedId, setSelectedId] = React.useState(() => readIntegrations()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const connected = items.filter((item) => item.status === "Connected").length;
  const needsSetup = items.filter((item) => item.status.includes("setup") || item.status.includes("connect")).length;
  const comingSoon = items.filter((item) => item.status === "Coming soon" || item.status === "Planned").length;

  function updateIntegration(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveIntegrations(next);
      return next;
    });
  }

  function testConnection() {
    if (!selected) return;

    const nextStatus = selected.status === "Connected" ? "Connected" : "Needs setup check";
    updateIntegration(selected.id, { status: nextStatus });
    sendIntegrationToCommand({ ...selected, status: nextStatus });
    onNavigate?.("command");
  }

  function resetIntegrations() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveIntegrations(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendIntegrationToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshIntegrationsPage">
      <div className="freshIntegrationsHero">
        <div>
          <span>Integrations</span>
          <h1>Connect the tools customers already use</h1>
          <p>Keep MYOB, Xero, Stripe, Postmark and SMS setup visible before launch.</p>
        </div>

        <div className="freshIntegrationsStats">
          <div><b>{items.length}</b><small>tools</small></div>
          <div><b>{connected}</b><small>connected</small></div>
          <div><b>{needsSetup}</b><small>setup checks</small></div>
          <div><b>{comingSoon}</b><small>planned</small></div>
        </div>
      </div>

      <div className="freshIntegrationsLayout">
        <aside className="freshIntegrationsList">
          <header>
            <div>
              <b>Connection list</b>
              <span>Launch setup status</span>
            </div>
            <button type="button" onClick={resetIntegrations}>Reset</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.name}</b>
              <span>{item.type}</span>
              <small>{item.status}</small>
            </button>
          ))}
        </aside>

        {selected && (
          <article className="freshIntegrationsDetail">
            <div className="freshIntegrationsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.name}</h2>
                <p>{selected.type} · {selected.plan}</p>
              </div>

              <div className="freshIntegrationsHeadActions">
                <button type="button" onClick={testConnection}>Test setup</button>
                <button type="button" onClick={sendToCommand}>Send to Command</button>
              </div>
            </div>

            <div className="freshIntegrationsCards">
              <section>
                <span>What it does</span>
                <b>{selected.action}</b>
                <p>{selected.note}</p>
              </section>

              <section>
                <span>Owner risk</span>
                <b>Review before launch</b>
                <p>{selected.risk}</p>
              </section>

              <section>
                <span>Plan position</span>
                <b>{selected.plan}</b>
                <p>Keep pricing clear so customers know what is included.</p>
              </section>
            </div>

            <div className="freshIntegrationsForm">
              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateIntegration(selected.id, { status: event.target.value })}>
                  <option>Connected</option>
                  <option>Ready to connect</option>
                  <option>Needs setup check</option>
                  <option>Planned</option>
                  <option>Coming soon</option>
                  <option>Disabled</option>
                </select>
              </label>

              <label>
                <span>Plan</span>
                <input value={selected.plan} onChange={(event) => updateIntegration(selected.id, { plan: event.target.value })} />
              </label>

              <label className="wide">
                <span>Launch note</span>
                <textarea value={selected.note} onChange={(event) => updateIntegration(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshIntegrationsFooter">
              <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
              <button type="button" onClick={() => onNavigate?.("plans")}>Open Plans</button>
              <button type="button" onClick={() => onNavigate?.("support")}>Open Support</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
