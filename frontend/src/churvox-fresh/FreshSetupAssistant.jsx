import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const setupChecks = [
  {
    id: "business",
    title: "Set your business basics",
    status: "Next step",
    urgency: "High",
    found: "Your account needs the business name, contact details, GST/invoice basics and logo confirmed.",
    prepared: "Open Settings. Add your business name, phone, email, GST number/rate, invoice details and logo. Save before moving on.",
    why: "This makes every quote, invoice and customer message look professional.",
    page: "settings",
    how: [
      "Click Open step.",
      "Fill in business name, contact email, phone, GST/tax settings and invoice details.",
      "Upload or confirm the logo, then press Save.",
      "Come back here and mark this step done.",
    ],
  },
  {
    id: "client",
    title: "Add your first real client",
    status: "Waiting",
    urgency: "High",
    found: "There are no real clients in this new account yet.",
    prepared: "Open Clients. Add one real customer with name, phone, email, address and notes.",
    why: "Jobs, quotes and invoices need a real customer record.",
    page: "clients",
    how: [
      "Click Open step.",
      "Press Add client or New client.",
      "Enter a real customer name, phone/email and job address.",
      "Save the client so jobs and invoices can use it.",
    ],
  },
  {
    id: "job",
    title: "Create your first real job",
    status: "Waiting",
    urgency: "High",
    found: "No real job has been created yet.",
    prepared: "Open Jobs. Create the first job using the real client, job date, price, notes and worker/self assignment.",
    why: "This proves the main Churvox workflow: job → done → invoice → paid.",
    page: "jobs",
    how: [
      "Click Open step.",
      "Press New job.",
      "Choose the client, add job title, date/time, address, price and notes.",
      "Assign yourself or a worker, then save the job.",
    ],
  },
  {
    id: "invoice",
    title: "Prepare the first invoice",
    status: "Waiting",
    urgency: "Medium",
    found: "The first job has not been turned into an invoice yet.",
    prepared: "After a job is complete, open Invoices and prepare the first invoice draft for review.",
    why: "This is where Churvox starts helping the business get paid.",
    page: "invoices",
    how: [
      "Complete or review the first job.",
      "Click Open step and go to Invoices.",
      "Create an invoice from the completed job or start a draft invoice.",
      "Check customer, line items, GST/tax and total before sending.",
    ],
  },
  {
    id: "command",
    title: "Use Command approval",
    status: "Waiting",
    urgency: "Medium",
    found: "The owner has not approved a prepared Churvox action yet.",
    prepared: "Open Command when Churvox prepares an action for review. Approve, edit, snooze or ignore it.",
    why: "This teaches the promise: Churvox does the admin. You approve.",
    page: "command",
    how: [
      "Click Open step and go to Command.",
      "Open one prepared action slip.",
      "Read what AI found, what AI prepared and why it matters.",
      "Approve it, edit it, snooze it or ignore it.",
    ],
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
            I’ll show you exactly what to do first: set business details, add a real client,
            create a job, prepare an invoice, then use Command to approve admin work.
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

      <div className="freshGuideDeep">
        <article>
          <b>How to use Churvox</b>
          <p>Start with real business details, then one real client, one real job, one invoice and one Command approval.</p>
        </article>
        <article>
          <b>What AI does</b>
          <p>AI tells the owner what is missing, what to do next, and can send setup actions into Command for approval.</p>
        </article>
        <article>
          <b>Owner control</b>
          <p>The owner always opens, checks, edits, approves or ignores actions. Churvox helps; it does not take over blindly.</p>
        </article>
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

            <div className="freshSetupHow">
              <strong>How to do this</strong>
              <ol>
                {(item.how || []).map((step) => <li key={step}>{step}</li>)}
              </ol>
            </div>

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
