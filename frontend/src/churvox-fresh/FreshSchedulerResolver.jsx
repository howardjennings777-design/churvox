import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const conflicts = [
  {
    id: "sch-1",
    title: "Worker double-booked",
    urgency: "High",
    found: "Tama Worker has Belmont reset and Naenae repair too close together.",
    prepared: "Move Naenae repair to 2:30 PM or assign Mere Crew.",
    impact: "Prevents late arrival and customer complaint.",
    page: "dispatch",
  },
  {
    id: "sch-2",
    title: "Travel gap too tight",
    urgency: "Medium",
    found: "Upper Hutt quote visit is scheduled 15 minutes after Belmont job.",
    prepared: "Add 25 minute travel buffer.",
    impact: "Keeps day realistic and reduces rushed jobs.",
    page: "routes",
  },
  {
    id: "sch-3",
    title: "No worker assigned",
    urgency: "High",
    found: "Wainuiomata recurring job has no assigned worker.",
    prepared: "Assign available worker or ask owner to confirm.",
    impact: "Stops jobs sitting unowned.",
    page: "worker",
  },
  {
    id: "sch-4",
    title: "Customer preferred time missed",
    urgency: "Medium",
    found: "Belmont customer prefers Fridays but job is set for Thursday.",
    prepared: "Move to Friday morning or ask customer to confirm.",
    impact: "Uses customer memory to avoid friction.",
    page: "customermemory",
  },
];

function sendScheduleToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `scheduler-ai-${item.id}-${Date.now()}`,
      group: "AI Scheduler Resolver",
      title: item.title,
      info: item.urgency,
      urgency: item.urgency,
      found: item.found,
      prepared: item.prepared,
      why: item.impact,
      owner: "Approve schedule change, edit, open dispatch, or ignore.",
      area: "Scheduler Resolver",
      page: "schedulerai",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 120)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "scheduler-ai" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshSchedulerResolver({ onNavigate }) {
  const [resolved, setResolved] = React.useState({});
  const high = conflicts.filter((item) => item.urgency === "High").length;
  const open = conflicts.filter((item) => !resolved[item.id]).length;

  return (
    <section className="freshOwnerAiPage">
      <div className="freshOwnerAiHero">
        <div>
          <span>AI Scheduler Conflict Resolver</span>
          <h1>Churvox fixes schedule problems before the day breaks</h1>
          <p>AI catches double-bookings, tight travel, missing workers and customer preference conflicts, then prepares a safer schedule.</p>
        </div>

        <div className="freshOwnerAiStats">
          <div><b>{conflicts.length}</b><small>conflicts</small></div>
          <div><b>{high}</b><small>high risk</small></div>
          <div><b>{open}</b><small>open</small></div>
          <div><b>Fix</b><small>prepared</small></div>
        </div>
      </div>

      <div className="freshOwnerAiGrid">
        {conflicts.map((item) => (
          <article key={item.id} className={resolved[item.id] ? "freshOwnerAiCard done" : "freshOwnerAiCard"}>
            <header>
              <span>{item.urgency}</span>
              <h2>{item.title}</h2>
              <small>{resolved[item.id] ? "Resolved" : "Needs approval"}</small>
            </header>

            <p><strong>AI found:</strong> {item.found}</p>
            <p><strong>AI prepared:</strong> {item.prepared}</p>
            <p><strong>Impact:</strong> {item.impact}</p>

            <div className="freshOwnerAiButtons">
              <button type="button" onClick={() => sendScheduleToCommand(item, onNavigate)}>Send to Command</button>
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open area</button>
              <button type="button" onClick={() => setResolved({ ...resolved, [item.id]: true })}>
                {resolved[item.id] ? "Resolved" : "Mark resolved"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
