import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const checks = [
  { id: "smart", area: "Smart Hub", check: "User knows what to do first", status: "Ready", page: "smart" },
  { id: "command", area: "Command", check: "AI actions can be approved/ignored", status: "Ready", page: "command" },
  { id: "jobs", area: "Jobs", check: "Create, assign and complete flow tested", status: "Needs test", page: "jobs" },
  { id: "clients", area: "Clients", check: "Add/edit client and notes checked", status: "Needs test", page: "clients" },
  { id: "quotes", area: "Quotes", check: "Quote create/follow-up/convert checked", status: "Needs test", page: "quotes" },
  { id: "invoices", area: "Invoices", check: "Invoice checker and send flow checked", status: "Needs test", page: "invoicecheck" },
  { id: "worker", area: "Worker", check: "Acknowledge/start/complete checked", status: "Needs test", page: "worker" },
  { id: "plans", area: "Plans", check: "Pricing + GST and trial wording clean", status: "Needs test", page: "plans" },
  { id: "csv", area: "Launch Pack", check: "CSV templates download", status: "Ready", page: "launchpack" },
  { id: "mobile", area: "Mobile", check: "No double pages, no hidden buttons/text", status: "Needs test", page: "qa" },
];

function sendLaunchControlToCommand(items, onNavigate) {
  const blocked = items.filter((item) => item.status === "Blocked");
  const needs = items.filter((item) => item.status === "Needs test");

  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `launch-control-${Date.now()}`,
      group: "Launch Control",
      title: blocked.length ? "Launch blocked" : needs.length ? "Launch needs final tests" : "Launch looks ready",
      info: `${blocked.length} blocked · ${needs.length} need test`,
      urgency: blocked.length ? "High" : needs.length ? "Medium" : "Low",
      found: blocked.length ? `Blocked: ${blocked.map((item) => item.area).join(", ")}` : "No hard blockers marked.",
      prepared: needs.length ? `Test next: ${needs.map((item) => item.area).join(", ")}` : "Controlled beta can start.",
      why: "Launch should be decided from core flow readiness, not how many pages exist.",
      owner: "Fix blockers, test needs, or approve controlled beta.",
      area: "Launch Control",
      page: "launchcontrol",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 70)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "launch-control" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshLaunchControl({ onNavigate }) {
  const [items, setItems] = React.useState(checks);

  const ready = items.filter((item) => item.status === "Ready").length;
  const needs = items.filter((item) => item.status === "Needs test").length;
  const blocked = items.filter((item) => item.status === "Blocked").length;
  const score = Math.round((ready / items.length) * 100);

  function updateStatus(id, status) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }

  return (
    <section className="freshLaunchControlPage">
      <div className="freshLaunchControlHero">
        <div>
          <span>Launch Control</span>
          <h1>Stop adding pages. Launch from core flow readiness.</h1>
          <p>This is the go-live board: Smart Hub, Command, jobs, clients, quotes, invoices, worker, plans, CSV and mobile.</p>
        </div>

        <div className="freshLaunchControlStats">
          <div><b>{score}%</b><small>ready score</small></div>
          <div><b>{ready}</b><small>ready</small></div>
          <div><b>{needs}</b><small>needs test</small></div>
          <div><b>{blocked}</b><small>blocked</small></div>
        </div>
      </div>

      <div className="freshLaunchControlBoard">
        {items.map((item) => (
          <article key={item.id} className={`freshLaunchControlCard ${item.status.toLowerCase().replace(" ", "-")}`}>
            <header>
              <span>{item.status}</span>
              <h2>{item.area}</h2>
            </header>

            <p>{item.check}</p>

            <div className="freshLaunchControlControls">
              <select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}>
                <option>Ready</option>
                <option>Needs test</option>
                <option>Blocked</option>
              </select>

              <button type="button" onClick={() => onNavigate?.(item.page)}>Open</button>
            </div>
          </article>
        ))}
      </div>

      <div className="freshLaunchControlActions">
        <button type="button" onClick={() => sendLaunchControlToCommand(items, onNavigate)}>Send launch decision to Command</button>
        <button type="button" onClick={() => onNavigate?.("qa")}>Open QA</button>
        <button type="button" onClick={() => onNavigate?.("launchpack")}>Open Launch Pack</button>
        <button type="button" onClick={() => onNavigate?.("demo")}>Open Demo Mode</button>
      </div>
    </section>
  );
}
