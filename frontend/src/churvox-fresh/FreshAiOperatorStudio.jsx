import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const tools = [
  {
    id: "job",
    title: "AI Job Creator",
    stage: "Launch priority",
    page: "jobs",
    found: "Messy job note: mow John lawn next Friday 9ish $65.",
    prepared: "Clean job with client, date, time, price, worker brief and customer message.",
    why: "Users should be able to type rough notes and let Churvox structure the job.",
  },
  {
    id: "quote",
    title: "AI Quote Builder",
    stage: "Launch priority",
    page: "quotes",
    found: "Customer wants overgrown lawn, hedge trim and green waste removed.",
    prepared: "Quote lines, price suggestion, optional extras, terms and follow-up date.",
    why: "Quotes become faster and more professional without the owner starting from blank.",
  },
  {
    id: "invoice",
    title: "AI Invoice Checker",
    stage: "Launch priority",
    page: "invoices",
    found: "Completed job has worker note: extra hedge trim completed.",
    prepared: "Warning: invoice may be missing $45 extra work.",
    why: "This catches money before invoices are sent.",
  },
  {
    id: "followup",
    title: "AI Follow-up Writer",
    stage: "Launch priority",
    page: "followups",
    found: "Quote has not been accepted after 2 days.",
    prepared: "Polite follow-up message ready for approval.",
    why: "Good jobs get saved before the customer disappears.",
  },
  {
    id: "day",
    title: "AI Plan My Day",
    stage: "Next",
    page: "dispatch",
    found: "Three jobs, one quote visit and one overdue invoice today.",
    prepared: "Best order: closest jobs first, quote after lunch, invoices tonight.",
    why: "Users get a plain-English day plan instead of staring at a calendar.",
  },
  {
    id: "worker",
    title: "AI Worker Brief",
    stage: "Launch priority",
    page: "worker",
    found: "Job assigned with unclear instructions.",
    prepared: "Worker brief: gate left side, front/back lawn, take photos, leave green waste by garage.",
    why: "Workers get clear instructions without the owner typing every detail.",
  },
  {
    id: "missing",
    title: "AI Missing Info Detector",
    stage: "Launch priority",
    page: "jobs",
    found: "Job is missing address, price and assigned worker.",
    prepared: "One-click fix list for the owner.",
    why: "Churvox finds setup gaps before they cause mistakes.",
  },
  {
    id: "memory",
    title: "AI Customer Memory",
    stage: "Next",
    page: "clients",
    found: "Client usually books Fridays, wants green waste removed and once complained about edging.",
    prepared: "Client memory card shown before booking or quoting.",
    why: "The business feels organised and personal.",
  },
  {
    id: "health",
    title: "AI Business Health",
    stage: "Next",
    page: "reports",
    found: "$780 ready to invoice, 3 quotes need follow-up, 2 workers have not acknowledged jobs.",
    prepared: "Plain-English owner nudge list.",
    why: "Reports become useful actions, not just charts.",
  },
  {
    id: "command",
    title: "AI Command Inbox",
    stage: "Core difference",
    page: "command",
    found: "Admin work across jobs, quotes, invoices, workers and customers.",
    prepared: "Approve / edit / ignore cards for every important action.",
    why: "This is the Churvox difference: admin is found and prepared before the owner asks.",
  },
];

function sendToCommand(tool, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `ai-studio-${tool.id}-${Date.now()}`,
      group: "AI Operator",
      title: tool.title,
      info: `${tool.stage} · prepared action`,
      urgency: tool.stage === "Core difference" || tool.stage === "Launch priority" ? "High" : "Medium",
      found: tool.found,
      prepared: tool.prepared,
      why: tool.why,
      owner: "Approve, edit, ignore, or open the related area.",
      area: "AI Operator Studio",
      page: "aioperator",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 40)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "ai-operator" } }));
  } catch {
    // Preview still works without storage.
  }

  onNavigate?.("command");
}

export default function FreshAiOperatorStudio({ onNavigate }) {
  const launch = tools.filter((tool) => tool.stage === "Launch priority").length;
  const next = tools.filter((tool) => tool.stage === "Next").length;

  return (
    <section className="freshAiStudioPage">
      <div className="freshAiStudioHero">
        <div>
          <span>AI Operator Studio</span>
          <h1>Make Churvox smoother than normal job apps</h1>
          <p>Not a chatbot. AI quietly finds admin, prepares the action, explains why, then lets the owner approve.</p>
        </div>

        <div className="freshAiStudioStats">
          <div><b>{tools.length}</b><small>AI tools</small></div>
          <div><b>{launch}</b><small>launch first</small></div>
          <div><b>{next}</b><small>next stage</small></div>
          <div><b>1</b><small>Command inbox</small></div>
        </div>
      </div>

      <div className="freshAiStudioLead">
        <b>The unique product line</b>
        <p>Other apps make users manage admin. Churvox finds the admin, prepares it, and lets the owner approve.</p>
      </div>

      <div className="freshAiStudioGrid">
        {tools.map((tool) => (
          <article key={tool.id} className="freshAiStudioCard">
            <header>
              <span>{tool.stage}</span>
              <h2>{tool.title}</h2>
            </header>

            <p><strong>AI found:</strong> {tool.found}</p>
            <p><strong>AI prepared:</strong> {tool.prepared}</p>
            <p><strong>Why it matters:</strong> {tool.why}</p>

            <div>
              <button type="button" onClick={() => sendToCommand(tool, onNavigate)}>Send to Command</button>
              <button type="button" onClick={() => onNavigate?.(tool.page)}>Open area</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
