import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const setupChecks = [
  {
    id: "business",
    title: "Set your business basics",
    status: "Next step",
    urgency: "High",
    found: "Your account needs business name, contact details and invoice basics confirmed.",
    prepared: "Open Settings and fill in the details Churvox will use on quotes and invoices.",
    why: "This makes every quote, invoice and customer message look professional.",
    page: "settings",
  },
  {
    id: "client",
    title: "Add your first real client",
    status: "Waiting",
    urgency: "High",
    found: "There are no real clients in this new account yet.",
    prepared: "Open Clients and add the first customer with name, phone, email and address.",
    why: "Jobs, quotes and invoices need a real customer record.",
    page: "clients",
  },
  {
    id: "job",
    title: "Create your first real job",
    status: "Waiting",
    urgency: "High",
    found: "No real job has been created yet.",
    prepared: "Open Jobs and create the first job from real customer details.",
    why: "This proves the main Churvox workflow: job → done → invoice → paid.",
    page: "jobs",
  },
  {
    id: "invoice",
    title: "Prepare the first invoice",
    status: "Waiting",
    urgency: "Medium",
    found: "The first job has not been turned into an invoice yet.",
    prepared: "After the job is complete, open Invoices and prepare the first invoice draft.",
    why: "This is where Churvox starts helping the business get paid.",
    page: "invoices",
  },
  {
    id: "command",
    title: "Use Command approval",
    status: "Waiting",
    urgency: "Medium",
    found: "The owner has not approved a prepared Churvox action yet.",
    prepared: "Open Command when Churvox prepares an action for review.",
    why: "This teaches the promise: Churvox does the admin. You approve.",
    page: "command",
  },
];

function sendSetupToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `ai-guide-${item.id}-${Date.now()}`,
      group: "AI Setup Guide",
      title: item.title,
      info: `${item.status} · ${item.urgency}`,
      urgency: item.urgency,
      found: item.found,
      prepared: item.prepared,
      why: item.why,
      owner: "Open the step, complete it, or ignore if already handled.",
      area: "AI Setup Guide",
      page: "setupassistant",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 80)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "ai-guide" } }));
  } catch {
    // Never block the guide.
  }

  onNavigate?.("command");
}

export default function FreshSetupAssistant({ onNavigate }) {
  const [checks, setChecks] = React.useState(setupChecks);

  const ready = checks.filter((item) => item.status === "Done").length;
  const needs = checks.length - ready;
  const score = Math.round((ready / checks.length) * 100);
  const next = checks.find((item) => item.status !== "Done") || checks[0];

  function updateStatus(id, status) {
    setChecks((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }

  return (
    <section className="freshOwnerAiPage">
      <div className="freshOwnerAiHero">
        <div>
          <span>AI Setup Guide</span>
          <h1>Let’s set up Churvox with real data.</h1>
          <p>
            I’ll guide you through the first useful workflow: business details, first client,
            first job, first invoice, then owner approval in Command.
          </p>
        </div>

        <div className="freshOwnerAiStats">
          <div><b>{score}%</b><small>setup</small></div>
          <div><b>{ready}</b><small>done</small></div>
          <div><b>{needs}</b><small>to do</small></div>
        </div>
      </div>

      <div className="freshMorningLead">
        <div>
          <b>Start here: {next.title}</b>
          <p>{next.prepared}</p>
        </div>
        <button type="button" onClick={() => onNavigate?.(next.page)}>Open next step</button>
      </div>

      <div className="freshOwnerAiGrid">
        {checks.map((item) => (
          <article key={item.id} className={item.status === "Done" ? "freshOwnerAiCard done" : "freshOwnerAiCard"}>
            <header>
              <span>{item.status}</span>
              <h2>{item.title}</h2>
              <small>{item.urgency} priority</small>
            </header>

            <p><strong>AI found:</strong> {item.found}</p>
            <p><strong>AI prepared:</strong> {item.prepared}</p>
            <p><strong>Why:</strong> {item.why}</p>

            <div className="freshOwnerAiButtons">
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open step</button>
              <button type="button" onClick={() => updateStatus(item.id, item.status === "Done" ? "Waiting" : "Done")}>
                {item.status === "Done" ? "Mark not done" : "Mark done"}
              </button>
              <button type="button" onClick={() => sendSetupToCommand(item, onNavigate)}>Send to Command</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
