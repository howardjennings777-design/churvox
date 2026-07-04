import React from "react";
import { sendFreshSlipToCommand } from ".//* DISABLED_CONFLICT_commandBridge */";

const copy = {
  hub: ["Dashboard", "Today: what needs action, what is booked, and where money is waiting."],
  jobs: ["Jobs", "Create, schedule, assign, price and complete work."],
  dispatch: ["Dispatch", "Daily planning: who is going where, what is late, and who has acknowledged."],
  quotes: ["Quotes", "Draft, follow up and convert accepted quotes into jobs."],
  invoices: ["Invoices", "Review drafts, approve sending, track paid and overdue money."],
  team: ["Team", "People, roles, invites and access."],
  payroll: ["Payroll", "Pay period, job hours, adjustments and CSV export. No tax or payment files."],
  reports: ["Reports", "Revenue, completed jobs, overdue invoices and worker activity."],
  settings: ["Settings", "Business profile, GST, branding, integrations and security."],
  plans: ["Plans", "Start, Crew, Operator, Command and growth packs."],
  support: ["Support", "Help, setup guidance and contact options."],
  aiusage: ["AI usage", "Track AI Operator actions and plan usage."],
  messages: ["Messages", "Review customer and worker communication from one place."],
};

const coreActions = [
  ["smart", "Dashboard", "See the full Churvox flow"],
  ["askchurvox", "Tell Churvox", "Type what you want done"],
  ["command", "Command", "Review prepared work"],
  ["jobs", "Jobs", "Open job records"],
  ["invoices", "Money", "Open invoices and payments"],
];

export default function FreshSimple({ page, onNavigate }) {
  const [title, text] = copy[page] || ["Churvox workspace", "This area is connected to the owner workflow and will stay review-first as it is expanded."];

  const sendToCommand = () => {
    sendFreshSlipToCommand({
      id: `fresh-simple-${page || "workspace"}-${Date.now()}`,
      group: "Workspace review",
      title: `${title} follow-up`,
      info: "Owner review",
      urgency: "Medium",
      found: `${title} needs a clear next action before deeper work is added.`,
      prepared: "Churvox prepared a review item so this area is not forgotten.",
      why: "Secondary tools should feed the core workflow instead of becoming dead ends.",
      owner: "Review, open the right area, or ignore for now.",
      area: title,
      page: page || "command",
      sourceType: "workspace_review",
      actionType: "owner_review",
    }, { type: "fresh-simple-send" });
    onNavigate?.("command");
  };

  return (
    <section className="freshSmartPage">
      <header className="freshHero">
        <span>Churvox workspace</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </header>

      <section className="freshGrid">
        <article className="freshCard">
          <h2>How this fits</h2>
          <div className="freshItem"><b>Owner-first</b><span>This area feeds the owner workflow. Nothing important happens without review.</span></div>
          <div className="freshItem"><b>Core flow</b><span>Use Dashboard to see whether the next step is job, invoice, payment, accounting or payroll.</span></div>
          <div className="freshItem"><b>Command</b><span>Anything unclear should be prepared as a Command slip instead of getting lost.</span></div>
        </article>

        <article className="freshCard">
          <h2>Go to the real work</h2>
          <div className="freshTodayList">
            {coreActions.map(([key, label, detail]) => (
              <button key={key} type="button" className="freshTodayNeedCard info" onClick={() => onNavigate?.(key)}>
                <span>{label}</span>
                <b>Open</b>
                <small>{detail}</small>
              </button>
            ))}
          </div>
        </article>

        <aside className="freshCard">
          <h2>Owner action</h2>
          <p>Keep this area on the radar without pretending it is finished.</p>
          <div className="freshActions">
            <button type="button" className="freshPrimary" onClick={() => onNavigate?.("askchurvox")}>Tell Churvox</button>
            <button type="button" className="freshDark" onClick={sendToCommand}>Send to Command</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
