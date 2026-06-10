import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const setupChecks = [
  {
    id: "business",
    title: "Business profile",
    status: "Needs check",
    urgency: "High",
    found: "Business name, logo, GST and support email should be confirmed.",
    prepared: "Open Settings and complete business basics.",
    why: "Invoices, emails and customer trust depend on this.",
    page: "settings",
  },
  {
    id: "plan",
    title: "Trial and plan status",
    status: "Needs test",
    urgency: "High",
    found: "Owner must clearly see trial status and selected plan.",
    prepared: "Open Plans and confirm current plan displays correctly after Stripe return.",
    why: "Billing confusion kills signups.",
    page: "plans",
  },
  {
    id: "client",
    title: "First client",
    status: "Needs user",
    urgency: "Medium",
    found: "No first client has been confirmed in setup.",
    prepared: "Add a client manually or import clients from CSV.",
    why: "Jobs, quotes and invoices need a real customer record.",
    page: "clients",
  },
  {
    id: "job",
    title: "First job",
    status: "Needs user",
    urgency: "Medium",
    found: "Owner needs to create first job or use AI Quick Create.",
    prepared: "Open AI Quick Create and turn rough text into a job.",
    why: "The user should feel value in the first few minutes.",
    page: "quickcreateai",
  },
  {
    id: "worker",
    title: "Worker setup",
    status: "Needs user",
    urgency: "Medium",
    found: "Worker/self assignment should be ready before dispatch.",
    prepared: "Add worker or assign the owner as worker for first job.",
    why: "Jobs cannot move cleanly without ownership.",
    page: "worker",
  },
  {
    id: "invoice",
    title: "Invoice settings",
    status: "Needs check",
    urgency: "High",
    found: "GST, invoice details and send flow should be confirmed.",
    prepared: "Open Invoice Checker and test invoice from completed job.",
    why: "Job to invoice to paid is the core money flow.",
    page: "invoicecheck",
  },
  {
    id: "command",
    title: "Command approvals",
    status: "Ready",
    urgency: "High",
    found: "AI slips are prepared for owner approve/edit/ignore.",
    prepared: "Use Command as the main approval desk.",
    why: "Churvox does the admin. You approve.",
    page: "command",
  },
  {
    id: "import",
    title: "CSV import/export",
    status: "Ready",
    urgency: "Medium",
    found: "Launch Pack contains CSV templates for clients, jobs, invoices, team and payroll.",
    prepared: "Download templates and test imports before real customer onboarding.",
    why: "Imports make switching easier for real businesses.",
    page: "launchpack",
  },
];

function sendSetupToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `setup-assistant-${item.id}-${Date.now()}`,
      group: "AI Setup Assistant",
      title: item.title,
      info: `${item.status} · ${item.urgency}`,
      urgency: item.urgency,
      found: item.found,
      prepared: item.prepared,
      why: item.why,
      owner: "Open setup step, mark ready, fix issue, or ignore.",
      area: "Setup Assistant",
      page: "setupassistant",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 150)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "setup-assistant" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshSetupAssistant({ onNavigate }) {
  const [checks, setChecks] = React.useState(setupChecks);

  const ready = checks.filter((item) => item.status === "Ready").length;
  const needs = checks.filter((item) => item.status !== "Ready").length;
  const high = checks.filter((item) => item.urgency === "High").length;
  const score = Math.round((ready / checks.length) * 100);

  function updateStatus(id, status) {
    setChecks((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }

  function sendNext() {
    const next = checks.find((item) => item.status !== "Ready") || checks[0];
    sendSetupToCommand(next, onNavigate);
  }

  function sendAllNeeds() {
    try {
      checks.filter((item) => item.status !== "Ready").forEach((item) => sendSetupToCommand(item, null));
    } catch {
      // Preview keeps working without storage.
    }
    onNavigate?.("command");
  }

  return (
    <section className="freshOwnerAiPage">
      <div className="freshOwnerAiHero">
        <div>
          <span>AI Launch / Setup Assistant</span>
          <h1>New owners should never wonder what to do next</h1>
          <p>Churvox checks setup gaps, billing clarity, first client, first job, worker setup, invoice settings, imports and Command readiness.</p>
        </div>

        <div className="freshOwnerAiStats">
          <div><b>{score}%</b><small>setup score</small></div>
          <div><b>{ready}</b><small>ready</small></div>
          <div><b>{needs}</b><small>needs action</small></div>
          <div><b>{high}</b><small>high priority</small></div>
        </div>
      </div>

      <div className="freshMorningLead">
        <div>
          <b>Setup assistant has checked {checks.length} launch items.</b>
          <p>Use this for new accounts and for your own final pre-launch test. Anything not ready should become a Command approval/fix slip.</p>
        </div>
        <button type="button" onClick={sendNext}>Send next setup step</button>
      </div>

      <div className="freshOwnerAiGrid">
        {checks.map((item) => (
          <article key={item.id} className={item.status === "Ready" ? "freshOwnerAiCard done" : "freshOwnerAiCard"}>
            <header>
              <span>{item.status}</span>
              <h2>{item.title}</h2>
              <small>{item.urgency} priority</small>
            </header>

            <p><strong>AI found:</strong> {item.found}</p>
            <p><strong>AI prepared:</strong> {item.prepared}</p>
            <p><strong>Why:</strong> {item.why}</p>

            <div className="freshOwnerAiButtons">
              <button type="button" onClick={() => sendSetupToCommand(item, onNavigate)}>Send to Command</button>
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open area</button>
              <button type="button" onClick={() => updateStatus(item.id, item.status === "Ready" ? "Needs check" : "Ready")}>
                {item.status === "Ready" ? "Recheck" : "Mark ready"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="freshMorningLead">
        <div>
          <b>Final setup action</b>
          <p>Send all unfinished setup checks to Command so the owner can approve, fix, or ignore them from one place.</p>
        </div>
        <button type="button" onClick={sendAllNeeds}>Send unfinished to Command</button>
      </div>
    </section>
  );
}
