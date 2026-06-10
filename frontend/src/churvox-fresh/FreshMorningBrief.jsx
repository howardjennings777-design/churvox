import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const briefActions = [
  {
    id: "mb-money",
    group: "Money",
    title: "$780 ready to invoice",
    urgency: "High",
    found: "Completed jobs are waiting for invoice review.",
    prepared: "Open Invoice Checker and send invoice batch.",
    why: "Money is earned but not yet requested.",
    page: "invoicecheck",
  },
  {
    id: "mb-day",
    group: "Today",
    title: "Today’s plan is ready",
    urgency: "High",
    found: "5 jobs, 1 quote visit and 1 invoice block are due today.",
    prepared: "Best order and next actions prepared.",
    why: "Owner should know what to do first.",
    page: "planday",
  },
  {
    id: "mb-worker",
    group: "Workers",
    title: "2 worker briefs ready",
    urgency: "Medium",
    found: "Workers have jobs today and need clear instructions.",
    prepared: "Briefs include notes, photos, safety and customer memory.",
    why: "Clear briefs reduce mistakes and callbacks.",
    page: "workerbrief",
  },
  {
    id: "mb-quotes",
    group: "Quotes",
    title: "3 quotes need chasing",
    urgency: "High",
    found: "Quotes have gone quiet after 2+ days.",
    prepared: "Follow-up messages ready.",
    why: "Warm leads go cold quickly.",
    page: "followupwriter",
  },
  {
    id: "mb-risk",
    group: "Risk",
    title: "1 job may be underpriced",
    urgency: "Medium",
    found: "Materials and travel may wipe out profit.",
    prepared: "Profit Guard recommends a price/action check.",
    why: "Busy work should still make money.",
    page: "profitguard",
  },
  {
    id: "mb-info",
    group: "Missing info",
    title: "4 records need details",
    urgency: "Medium",
    found: "Some jobs, clients and invoices are missing key info.",
    prepared: "Missing info fixes are ready.",
    why: "Incomplete records break later workflows.",
    page: "missinginfo",
  },
];

function saveSlip(item) {
  const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
  const current = saved ? JSON.parse(saved) : [];
  const safeCurrent = Array.isArray(current) ? current : [];

  const slip = {
    id: `morning-brief-${item.id}-${Date.now()}`,
    group: "AI Morning Brief",
    title: item.title,
    info: `${item.group} · ${item.urgency}`,
    urgency: item.urgency,
    found: item.found,
    prepared: item.prepared,
    why: item.why,
    owner: "Approve, edit, open area, snooze, or ignore.",
    area: "Morning Brief",
    page: "morningbrief",
    fromInbox: true,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 120)));
  window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "morning-brief" } }));
}

export default function FreshMorningBrief({ onNavigate }) {
  const [done, setDone] = React.useState({});
  const open = briefActions.filter((item) => !done[item.id]).length;
  const high = briefActions.filter((item) => item.urgency === "High").length;

  function sendOne(item) {
    try {
      saveSlip(item);
    } catch {
      // Preview keeps working without storage.
    }
    onNavigate?.("command");
  }

  function sendAll() {
    try {
      briefActions.forEach(saveSlip);
    } catch {
      // Preview keeps working without storage.
    }
    onNavigate?.("command");
  }

  return (
    <section className="freshOwnerAiPage">
      <div className="freshOwnerAiHero">
        <div>
          <span>AI Morning Brief</span>
          <h1>Owner opens Churvox and the day is already prepared</h1>
          <p>This is the main owner experience: AI has checked money, jobs, workers, quotes, risks and missing info before the owner starts clicking.</p>
        </div>

        <div className="freshOwnerAiStats">
          <div><b>{briefActions.length}</b><small>prepared actions</small></div>
          <div><b>{high}</b><small>high priority</small></div>
          <div><b>{open}</b><small>still open</small></div>
          <div><b>Approve</b><small>owner control</small></div>
        </div>
      </div>

      <div className="freshMorningLead">
        <div>
          <b>Good morning. Churvox has prepared {briefActions.length} actions for approval.</b>
          <p>Review the important ones, approve what is right, edit what needs changing, ignore what does not matter.</p>
        </div>
        <button type="button" onClick={sendAll}>Send all to Command</button>
      </div>

      <div className="freshOwnerAiGrid">
        {briefActions.map((item) => (
          <article key={item.id} className={done[item.id] ? "freshOwnerAiCard done" : "freshOwnerAiCard"}>
            <header>
              <span>{item.group}</span>
              <h2>{item.title}</h2>
              <small>{item.urgency} priority</small>
            </header>

            <p><strong>AI found:</strong> {item.found}</p>
            <p><strong>AI prepared:</strong> {item.prepared}</p>
            <p><strong>Why:</strong> {item.why}</p>

            <div className="freshOwnerAiButtons">
              <button type="button" onClick={() => sendOne(item)}>Send to Command</button>
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open area</button>
              <button type="button" onClick={() => setDone({ ...done, [item.id]: true })}>
                {done[item.id] ? "Done" : "Mark done"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
