import React from "react";
import { sendFreshSlipToCommand } from "./commandBridge";

const copy = {
  hub: ["Smart Hub", "Morning view: what needs action, what is booked, and where money is waiting."],
  jobs: ["Jobs", "Create, schedule, assign, price and complete work."],
  dispatch: ["Dispatch", "Daily route planning: who is going where, what is late, and who has acknowledged."],
  quotes: ["Quotes", "Draft, send, follow up and convert accepted quotes into jobs."],
  invoices: ["Invoices", "Review drafts, approve sending, track paid and overdue money."],
  team: ["Team", "People, roles, invites and access."],
  payroll: ["Payroll", "Pay period, job hours, adjustments and CSV export. No tax or bank files."],
  reports: ["Reports", "Revenue, completed jobs, overdue invoices and worker activity."],
  settings: ["Settings", "Business profile, GST, branding, integrations and security."],
  plans: ["Plans", "Start, Crew, Operator, Command and growth packs."],
  support: ["Support", "Help, setup guidance and contact options."],
};

export default function FreshSimple({ page, onNavigate }) {
  const [title, text] = copy[page] || copy.hub;

  const saveDraft = () => {
    try {
      window.localStorage.setItem(`churvox:fresh-simple:${page || "hub"}`, JSON.stringify({
        page,
        title,
        text,
        savedAt: new Date().toISOString(),
      }));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "fresh-simple-save", page } }));
    } catch (_) {}
  };

  const createRecord = () => {
    const target = ["jobs", "quotes", "clients", "team", "invoices"].includes(page) ? page : "command";
    onNavigate?.(target);
  };

  const sendToCommand = () => {
    sendFreshSlipToCommand({
      id: `fresh-simple-${page || "hub"}-${Date.now()}`,
      group: "Fresh page",
      title: `${title} needs owner review`,
      info: "Fresh page action",
      urgency: "Medium",
      found: `${title} has a general owner action waiting.`,
      prepared: "Churvox prepared a safe Command slip for owner review.",
      why: "This keeps unfinished page work in Command instead of losing it.",
      owner: "Review, edit, approve, snooze, ignore, or open the source page.",
      area: title,
      page: page || "command",
      sourceType: "fresh_page",
      actionType: "owner_review",
    }, { type: "fresh-simple-send" });
    onNavigate?.("command");
  };

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · {title}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Work list</h2>
          <div className="freshItem"><b>Example record</b><span>Ready for owner review</span></div>
          <div className="freshItem need"><b>Needs action</b><span>Send to Command if risky</span></div>
        </aside>

        <section className="freshCard">
          <h2>{title} workspace</h2>
          <p>This is the fresh page pattern. No old shell, no old sidebar, no old workbench files.</p>
        </section>

        <aside className="freshCard">
          <h2>Next move</h2>
          <div className="freshActions">
            <button type="button" className="freshPrimary" onClick={saveDraft}>Save</button>
            <button type="button" className="freshOrange" onClick={createRecord}>Create</button>
            <button type="button" className="freshDark" onClick={sendToCommand}>Send to Command</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
