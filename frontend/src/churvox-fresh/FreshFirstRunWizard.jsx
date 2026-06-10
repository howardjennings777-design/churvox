import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const steps = [
  {
    id: "business",
    title: "Set business basics",
    time: "30 sec",
    status: "Ready",
    text: "Business name, logo, GST, support email and region.",
    action: "Open Settings",
    page: "settings",
  },
  {
    id: "client",
    title: "Add first client",
    time: "45 sec",
    status: "Needs user",
    text: "Create or import a customer with phone, address and notes.",
    action: "Open Clients",
    page: "clients",
  },
  {
    id: "job",
    title: "Create first job",
    time: "45 sec",
    status: "Needs user",
    text: "Use AI Quick Create to turn a rough note into clean work.",
    action: "Open AI Quick Create",
    page: "quickcreateai",
  },
  {
    id: "worker",
    title: "Assign worker or yourself",
    time: "30 sec",
    status: "Needs user",
    text: "Add worker brief, photos and completion instructions.",
    action: "Open Worker Brief",
    page: "workerbrief",
  },
  {
    id: "invoice",
    title: "Send first invoice",
    time: "45 sec",
    status: "Needs test",
    text: "Check extras, GST and send invoice after job completion.",
    action: "Open Invoice Checker",
    page: "invoicecheck",
  },
  {
    id: "command",
    title: "Approve from Command",
    time: "20 sec",
    status: "Ready",
    text: "Everything AI prepares lands in Command for approve/edit/ignore.",
    action: "Open Command",
    page: "command",
  },
];

function sendWizardToCommand(items, onNavigate) {
  const next = items.find((item) => item.status !== "Ready") || items[0];

  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `first-run-${Date.now()}`,
      group: "First Run Wizard",
      title: `Next setup step: ${next.title}`,
      info: `${next.time} · ${next.status}`,
      urgency: next.status === "Needs user" ? "High" : "Medium",
      found: "New user needs a clear first-run path.",
      prepared: `${next.title}: ${next.text}`,
      why: "A new user should understand Churvox in the first 2 minutes.",
      owner: "Open step, mark ready, or continue setup.",
      area: "First Run Wizard",
      page: "firstrun",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 80)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "first-run" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshFirstRunWizard({ onNavigate }) {
  const [items, setItems] = React.useState(steps);
  const ready = items.filter((item) => item.status === "Ready").length;
  const progress = Math.round((ready / items.length) * 100);

  function updateStatus(id, status) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }

  return (
    <section className="freshFirstRunPage">
      <div className="freshFirstRunHero">
        <div>
          <span>First Run Wizard</span>
          <h1>New users should get value in 2 minutes</h1>
          <p>This removes the “what do I do now?” problem. Churvox guides the owner from setup to first Command approval.</p>
        </div>

        <div className="freshFirstRunStats">
          <div><b>{progress}%</b><small>setup</small></div>
          <div><b>{ready}</b><small>ready</small></div>
          <div><b>{items.length}</b><small>steps</small></div>
          <div><b>2 min</b><small>first value</small></div>
        </div>
      </div>

      <div className="freshFirstRunBoard">
        {items.map((item, index) => (
          <article key={item.id} className={`freshFirstRunCard ${item.status.toLowerCase().replace(" ", "-")}`}>
            <div className="freshFirstRunNumber">{index + 1}</div>

            <div>
              <header>
                <span>{item.status}</span>
                <h2>{item.title}</h2>
              </header>

              <p>{item.text}</p>
              <small>{item.time}</small>

              <div className="freshFirstRunControls">
                <select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}>
                  <option>Ready</option>
                  <option>Needs user</option>
                  <option>Needs test</option>
                  <option>Blocked</option>
                </select>

                <button type="button" onClick={() => onNavigate?.(item.page)}>{item.action}</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="freshFirstRunActions">
        <button type="button" onClick={() => sendWizardToCommand(items, onNavigate)}>Send next step to Command</button>
        <button type="button" onClick={() => onNavigate?.("launchcontrol")}>Open Launch Control</button>
        <button type="button" onClick={() => onNavigate?.("demo")}>Open Demo Mode</button>
        <button type="button" onClick={() => onNavigate?.("launchpack")}>Open CSV Templates</button>
      </div>
    </section>
  );
}
