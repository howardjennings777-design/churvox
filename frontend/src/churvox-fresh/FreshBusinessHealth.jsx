import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const health = [
  {
    id: "health-1",
    title: "$780 ready to invoice",
    type: "Money",
    urgency: "High",
    found: "Completed jobs are ready but invoices have not been sent.",
    prepared: "Open invoice checker and prepare invoice batch.",
    why: "Money is stuck in admin, not customer hands.",
    page: "invoicecheck",
  },
  {
    id: "health-2",
    title: "3 quotes need follow-up",
    type: "Sales",
    urgency: "High",
    found: "Quotes older than 2 days have no customer response.",
    prepared: "AI follow-up messages ready.",
    why: "Warm leads can go cold quickly.",
    page: "followupwriter",
  },
  {
    id: "health-3",
    title: "2 workers have not acknowledged jobs",
    type: "Team",
    urgency: "Medium",
    found: "Assigned jobs are not acknowledged by workers.",
    prepared: "Worker reminders and backup dispatch option.",
    why: "Owner should know before jobs are missed.",
    page: "worker",
  },
  {
    id: "health-4",
    title: "Recurring customer may be slipping",
    type: "Retention",
    urgency: "Medium",
    found: "Regular customer has not booked for 5 weeks.",
    prepared: "Rebooking message ready.",
    why: "Repeat work is easier to save than new work.",
    page: "customermemory",
  },
  {
    id: "health-5",
    title: "Low margin job warning",
    type: "Profit",
    urgency: "Low",
    found: "One job has high travel/time compared with invoice value.",
    prepared: "Review price or group with nearby jobs.",
    why: "Busy work is not always profitable work.",
    page: "profit",
  },
];

function sendHealthToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `business-health-${item.id}-${Date.now()}`,
      group: "AI Business Health",
      title: item.title,
      info: `${item.type} · ${item.urgency}`,
      urgency: item.urgency,
      found: item.found,
      prepared: item.prepared,
      why: item.why,
      owner: "Approve action, open area, snooze, or ignore.",
      area: "Business Health",
      page: "businesshealth",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 60)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "business-health" } }));
  } catch {
    // Fresh preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshBusinessHealth({ onNavigate }) {
  const [done, setDone] = React.useState({});
  const open = health.filter((item) => !done[item.id]).length;
  const high = health.filter((item) => item.urgency === "High").length;

  return (
    <section className="freshHealthPage">
      <div className="freshHealthHero">
        <div>
          <span>AI Business Health</span>
          <h1>Reports should tell users what to do next</h1>
          <p>No boring dashboard guessing. Churvox shows plain-English risks, money actions and owner decisions.</p>
        </div>

        <div className="freshHealthStats">
          <div><b>{health.length}</b><small>nudges</small></div>
          <div><b>{high}</b><small>high priority</small></div>
          <div><b>{open}</b><small>open</small></div>
          <div><b>Action</b><small>not charts</small></div>
        </div>
      </div>

      <div className="freshHealthBoard">
        {health.map((item) => (
          <article key={item.id} className={done[item.id] ? "freshHealthCard done" : "freshHealthCard"}>
            <header>
              <span>{item.type}</span>
              <h2>{item.title}</h2>
            </header>

            <p><strong>AI found:</strong> {item.found}</p>
            <p><strong>AI prepared:</strong> {item.prepared}</p>
            <p><strong>Why:</strong> {item.why}</p>

            <div className="freshHealthMeta">
              <small>{item.urgency}</small>
              <small>{done[item.id] ? "Done" : "Open"}</small>
            </div>

            <div className="freshHealthButtons">
              <button type="button" onClick={() => setDone({ ...done, [item.id]: true })}>
                {done[item.id] ? "Completed" : "Mark done"}
              </button>
              <button type="button" onClick={() => sendHealthToCommand(item, onNavigate)}>Send to Command</button>
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open area</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
