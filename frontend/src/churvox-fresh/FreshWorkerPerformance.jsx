import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const workers = [
  {
    id: "wp-1",
    name: "Tama Worker",
    role: "Lawn crew",
    score: 86,
    urgency: "Medium",
    found: "Usually completes jobs well, but has missed photo uploads twice this week.",
    prepared: "Require before/after photos on today’s jobs and send reminder.",
    strength: "Fast completion and good customer notes.",
    risk: "Forgets photos on reset jobs.",
    page: "workerbrief",
  },
  {
    id: "wp-2",
    name: "Mere Crew",
    role: "General crew",
    score: 93,
    urgency: "Low",
    found: "Strong job acknowledgement and low rework rate.",
    prepared: "Best fit for customer-facing jobs and quote visits.",
    strength: "Reliable acknowledgement and clear notes.",
    risk: "No major issue detected.",
    page: "dispatch",
  },
  {
    id: "wp-3",
    name: "Subcontractor",
    role: "Overflow support",
    score: 68,
    urgency: "High",
    found: "Late acknowledgements and missing completion notes on 3 jobs.",
    prepared: "Use only with clear worker brief and require completion notes.",
    strength: "Available for overflow work.",
    risk: "Needs tighter owner checks.",
    page: "worker",
  },
];

function sendWorkerToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `worker-performance-${item.id}-${Date.now()}`,
      group: "AI Worker Performance Watch",
      title: `${item.name} performance note`,
      info: `${item.role} · ${item.score}% · ${item.urgency}`,
      urgency: item.urgency,
      found: item.found,
      prepared: item.prepared,
      why: `Strength: ${item.strength} Risk: ${item.risk}`,
      owner: "Approve reminder, open worker, adjust dispatch, or ignore.",
      area: "Worker Performance",
      page: "workerperformance",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 140)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "worker-performance" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshWorkerPerformance({ onNavigate }) {
  const [done, setDone] = React.useState({});
  const high = workers.filter((item) => item.urgency === "High").length;
  const average = Math.round(workers.reduce((sum, item) => sum + item.score, 0) / workers.length);

  return (
    <section className="freshOwnerAiPage">
      <div className="freshOwnerAiHero">
        <div>
          <span>AI Worker Performance Watch</span>
          <h1>Churvox tells the owner who needs attention</h1>
          <p>It watches acknowledgements, photos, notes, rework and job fit, then prepares simple owner actions.</p>
        </div>

        <div className="freshOwnerAiStats">
          <div><b>{workers.length}</b><small>workers watched</small></div>
          <div><b>{average}%</b><small>avg score</small></div>
          <div><b>{high}</b><small>high risk</small></div>
          <div><b>Brief</b><small>prepared</small></div>
        </div>
      </div>

      <div className="freshOwnerAiGrid">
        {workers.map((item) => (
          <article key={item.id} className={done[item.id] ? "freshOwnerAiCard done" : "freshOwnerAiCard"}>
            <header>
              <span>{item.urgency}</span>
              <h2>{item.name}</h2>
              <small>{item.role} · {item.score}% score</small>
            </header>

            <p><strong>AI found:</strong> {item.found}</p>
            <p><strong>AI prepared:</strong> {item.prepared}</p>
            <p><strong>Risk:</strong> {item.risk}</p>

            <div className="freshOwnerAiButtons">
              <button type="button" onClick={() => sendWorkerToCommand(item, onNavigate)}>Send to Command</button>
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open area</button>
              <button type="button" onClick={() => setDone({ ...done, [item.id]: true })}>
                {done[item.id] ? "Noted" : "Mark noted"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
