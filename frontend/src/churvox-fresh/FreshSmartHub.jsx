import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const aiActions = [
  {
    id: "ai-1",
    title: "Create job from messy text",
    found: "Owner typed: mow John lawn next Friday 9ish $65",
    prepared: "Clean job with client, time, price, worker brief and customer message.",
    why: "This removes admin typing and makes job creation fast.",
    page: "jobs",
  },
  {
    id: "ai-2",
    title: "Invoice checker",
    found: "Completed job has extra hedge trim note.",
    prepared: "Invoice warning: possible missing $45 extra.",
    why: "Churvox catches money before invoices go out.",
    page: "invoices",
  },
  {
    id: "ai-3",
    title: "Quote follow-up",
    found: "Quote has not been accepted after 2 days.",
    prepared: "Polite follow-up message ready for owner approval.",
    why: "Stops good work slipping away.",
    page: "quotes",
  },
  {
    id: "ai-4",
    title: "Worker brief",
    found: "Job assigned without clear instructions.",
    prepared: "Simple worker instructions with gate, photos and customer notes.",
    why: "Workers get clear direction without the owner typing everything.",
    page: "worker",
  },
];

function pushCommandSlip(action, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `smart-${action.id}-${Date.now()}`,
      group: "AI Operator",
      title: action.title,
      info: "Prepared by Smart Hub",
      urgency: "High",
      found: action.found,
      prepared: action.prepared,
      why: action.why,
      owner: "Approve, edit, ignore, or open the related page.",
      area: "Smart Hub",
      page: "smart",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 30)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "smart-command" } }));
  } catch {
    // Preview still works without storage.
  }

  onNavigate?.("command");
}

export default function FreshSmartHub({ onNavigate }) {
  const stats = [
    ["7", "AI actions"],
    ["$780", "ready to invoice"],
    ["3", "quotes to chase"],
    ["2", "worker checks"],
  ];

  const flow = [
    ["Clients", "Add or find customer", "clients"],
    ["Quotes", "Build price and terms", "quotes"],
    ["Jobs", "Schedule and assign work", "jobs"],
    ["Worker", "Brief, start, complete", "worker"],
    ["Invoices", "Check and send", "invoices"],
    ["Command", "Approve admin", "command"],
  ];

  return (
    <section className="freshSmartPage">
      <div className="freshSmartHero">
        <div>
          <span>Smart Hub</span>
          <h1>Churvox does the admin. You approve.</h1>
          <p>The home screen should not make users hunt. It shows today’s decisions, AI-prepared admin, missing info and the fastest next step.</p>
        </div>

        <div className="freshSmartStats">
          {stats.map(([value, label]) => (
            <div key={label}>
              <b>{value}</b>
              <small>{label}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="freshSmartGrid">
        <article className="freshSmartPanel freshSmartWide">
          <header>
            <span>AI Operator Mode</span>
            <h2>Today’s owner decisions</h2>
            <p>Instead of a chatbot, Churvox quietly finds admin work, prepares the fix and asks the owner to approve.</p>
          </header>

          <div className="freshSmartActions">
            {aiActions.map((action) => (
              <section key={action.id}>
                <div>
                  <b>{action.title}</b>
                  <p><strong>AI found:</strong> {action.found}</p>
                  <p><strong>AI prepared:</strong> {action.prepared}</p>
                  <p><strong>Why:</strong> {action.why}</p>
                </div>

                <div className="freshSmartActionButtons">
                  <button type="button" onClick={() => pushCommandSlip(action, onNavigate)}>Send to Command</button>
                  <button type="button" onClick={() => onNavigate?.(action.page)}>Open page</button>
                </div>
              </section>
            ))}
          </div>
        </article>

        <article className="freshSmartPanel">
          <header>
            <span>Core flow</span>
            <h2>Launch path</h2>
            <p>This is the flow that must feel bulletproof before paid launch.</p>
          </header>

          <div className="freshSmartFlow">
            {flow.map(([title, text, page]) => (
              <button type="button" key={page} onClick={() => onNavigate?.(page)}>
                <b>{title}</b>
                <small>{text}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="freshSmartPanel">
          <header>
            <span>Launch pack</span>
            <h2>Ready tools</h2>
            <p>CSV templates, launch checklist, import/export prep and demo controls live in one place.</p>
          </header>

          <div className="freshSmartLaunchButtons">
            <button type="button" onClick={() => onNavigate?.("launchpack")}>Open Launch Pack</button>
            <button type="button" onClick={() => onNavigate?.("qa")}>Open QA</button>
            <button type="button" onClick={() => onNavigate?.("plans")}>Open Plans</button>
            <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
          </div>
        </article>
      </div>
    </section>
  );
}
