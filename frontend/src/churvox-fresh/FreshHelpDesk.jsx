import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const helpTypes = [
  {
    id: "setup",
    title: "I need help setting up",
    priority: "High",
    message: "Hi, I need help setting up my Churvox account and getting my first job/invoice ready.",
    route: "firstrun",
  },
  {
    id: "import",
    title: "I need help importing data",
    priority: "Medium",
    message: "Hi, I need help importing clients, jobs, invoices or team members into Churvox.",
    route: "launchpack",
  },
  {
    id: "billing",
    title: "I have a billing or plan question",
    priority: "High",
    message: "Hi, I need help with my Churvox plan, trial, payment or current plan status.",
    route: "plans",
  },
  {
    id: "bug",
    title: "Something looks broken",
    priority: "High",
    message: "Hi, I found something in Churvox that looks broken. Page/screen: [add details].",
    route: "qa",
  },
  {
    id: "feature",
    title: "I want to request a feature",
    priority: "Low",
    message: "Hi, I have a feature idea for Churvox: [add idea].",
    route: "feedback",
  },
];

function sendHelpToCommand(item, note, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `helpdesk-${item.id}-${Date.now()}`,
      group: "Help Desk",
      title: item.title,
      info: `${item.priority} priority`,
      urgency: item.priority,
      found: "User started a support/help request.",
      prepared: note || item.message,
      why: "Support should be easy to find so new users do not get stuck.",
      owner: "Reply, open related page, or mark handled.",
      area: "Help Desk",
      page: "helpdesk",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 90)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "helpdesk" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshHelpDesk({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(helpTypes[0].id);
  const selected = helpTypes.find((item) => item.id === selectedId) || helpTypes[0];
  const [note, setNote] = React.useState(selected.message);

  React.useEffect(() => {
    setNote(selected.message);
  }, [selected.id]);

  return (
    <section className="freshHelpPage">
      <div className="freshHelpHero">
        <div>
          <span>Help Desk</span>
          <h1>Do not let new users get stuck</h1>
          <p>A launch-ready app needs setup help, import help, billing help, bug reporting and feedback in one clear place.</p>
        </div>

        <div className="freshHelpStats">
          <div><b>{helpTypes.length}</b><small>help paths</small></div>
          <div><b>hello</b><small>@churvox.com</small></div>
          <div><b>Fast</b><small>support</small></div>
          <div><b>Command</b><small>owner inbox</small></div>
        </div>
      </div>

      <div className="freshHelpLayout">
        <aside className="freshHelpList">
          <header>
            <b>What does the user need?</b>
            <span>Pick a help path</span>
          </header>

          {helpTypes.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selected.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.title}</b>
              <span>{item.priority} priority</span>
            </button>
          ))}
        </aside>

        <article className="freshHelpDetail">
          <header>
            <span>{selected.priority}</span>
            <h2>{selected.title}</h2>
            <p>Support email: hello@churvox.com</p>
          </header>

          <label>
            <span>Editable support message</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>

          <div className="freshHelpCards">
            <section>
              <b>Support promise</b>
              <p>Keep it simple: help the user finish setup, import data, test the flow or report the issue.</p>
            </section>
            <section>
              <b>Best next page</b>
              <p>{selected.route}</p>
            </section>
          </div>

          <div className="freshHelpButtons">
            <button type="button" onClick={() => sendHelpToCommand(selected, note, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.(selected.route)}>Open related page</button>
            <button type="button" onClick={() => onNavigate?.("firstrun")}>Open First Run</button>
            <button type="button" onClick={() => onNavigate?.("launchcontrol")}>Open Launch Readiness</button>
          </div>
        </article>
      </div>
    </section>
  );
}
