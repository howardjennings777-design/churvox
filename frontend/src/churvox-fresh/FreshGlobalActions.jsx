import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const searchItems = [
  ["Dashboard", "Today’s actions and AI admin", "smart"],
  ["Ask Churvox", "Type one command in plain English", "askchurvox"],
  ["Command", "Approve AI prepared work", "command"],
  ["Clients", "Customers and history", "clients"],
  ["Jobs", "Schedule and complete jobs", "jobs"],
  ["Quotes", "Create and follow up quotes", "quotes"],
  ["Invoices", "Send and check invoices", "invoices"],
  ["AI Quick Create", "Turn messy notes into jobs", "quickcreateai"],
  ["Invoice Checker", "Catch missing extras", "invoicecheck"],
  ["AI Follow-up", "Write reminders and review requests", "followupwriter"],
  ["Plan My Day", "Best order for today", "planday"],
  ["Worker Brief", "Instructions for staff", "workerbrief"],
  ["Missing Info", "Find incomplete work", "missinginfo"],
  ["Customer Memory", "Preferences and warnings", "customermemory"],
  ["Business Health", "Money and work nudges", "businesshealth"],
  ["Launch Control", "Go-live checklist", "launchcontrol"],
  ["Launch Pack", "CSV templates and import prep", "launchpack"],
];

const createTypes = [
  {
    type: "Job",
    title: "Create job",
    description: "Client, service, date, worker, price and notes.",
    page: "quickcreateai",
    prompt: "Create a job from rough text.",
  },
  {
    type: "Client",
    title: "Add client",
    description: "Name, phone, address, notes and preferences.",
    page: "clients",
    prompt: "Add a new client and check missing information.",
  },
  {
    type: "Quote",
    title: "Create quote",
    description: "Line items, price, terms and follow-up.",
    page: "quotes",
    prompt: "Prepare a quote and follow-up action.",
  },
  {
    type: "Invoice",
    title: "Create invoice",
    description: "Check job notes, extras, materials and GST.",
    page: "invoicecheck",
    prompt: "Check invoice before sending.",
  },
  {
    type: "Worker",
    title: "Invite worker",
    description: "Role, region, job brief and mobile workflow.",
    page: "workerbrief",
    prompt: "Prepare worker brief and invite action.",
  },
  {
    type: "Message",
    title: "Write follow-up",
    description: "Quote chase, unpaid invoice, review or rebooking.",
    page: "followupwriter",
    prompt: "Write a follow-up message.",
  },
];

function sendCreateToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `global-create-${item.type}-${Date.now()}`,
      group: "Global Create",
      title: item.title,
      info: item.description,
      urgency: "Medium",
      found: "User started from the global create button instead of hunting through pages.",
      prepared: item.prompt,
      why: "One create button makes Churvox faster and easier for normal users.",
      owner: "Open the right area, approve, edit or continue setup.",
      area: "Global Actions",
      page: "globalactions",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 80)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "global-create" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshGlobalActions({ onNavigate }) {
  const [query, setQuery] = React.useState("");
  const filtered = searchItems.filter(([title, text]) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return title.toLowerCase().includes(q) || text.toLowerCase().includes(q);
  });

  return (
    <section className="freshGlobalActionsPage">
      <div className="freshGlobalActionsHero">
        <div>
          <span>Global Actions</span>
          <h1>One search. One create button. No hunting.</h1>
          <p>Top-player software makes the user feel fast. They search anything, create anything, or ask Churvox from one place.</p>
        </div>

        <div className="freshGlobalActionsStats">
          <div><b>{searchItems.length}</b><small>search items</small></div>
          <div><b>{createTypes.length}</b><small>create actions</small></div>
          <div><b>1</b><small>command bar</small></div>
          <div><b>Fast</b><small>less hunting</small></div>
        </div>
      </div>

      <div className="freshGlobalActionsGrid">
        <article className="freshGlobalActionsPanel">
          <header>
            <span>Search</span>
            <h2>Find anything</h2>
            <p>Search pages, AI tools, launch checks and key work areas.</p>
          </header>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search jobs, invoices, AI, launch, clients..."
          />

          <div className="freshGlobalActionsResults">
            {filtered.map(([title, text, page]) => (
              <button type="button" key={page} onClick={() => onNavigate?.(page)}>
                <b>{title}</b>
                <span>{text}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="freshGlobalActionsPanel">
          <header>
            <span>Create</span>
            <h2>Start work from one button</h2>
            <p>Users should not need to know which page to open first.</p>
          </header>

          <div className="freshGlobalCreateGrid">
            {createTypes.map((item) => (
              <section key={item.type}>
                <b>{item.title}</b>
                <p>{item.description}</p>
                <div>
                  <button type="button" onClick={() => onNavigate?.(item.page)}>Open</button>
                  <button type="button" onClick={() => sendCreateToCommand(item, onNavigate)}>Command</button>
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
