import React from "react";

const labels = {
  command: "Command",
  work: "Jobs",
  schedule: "Schedule",
  clients: "Clients",
  messages: "Messages",
  worker: "Workers",
  quotes: "Quotes",
  invoices: "Invoices",
  money: "Money",
  staff: "Staff",
  payroll: "Payroll",
  team: "How Churvox works",
  integrations: "Xero",
  activity: "Activity",
  settings: "Settings",
  plans: "Plans",
  help: "Help",
};

export default function OfficeTeamContextStrip({ screen, pendingCount = 0, notice = "", go }) {
  const commandPage = screen === "command";
  return (
    <section className="cvOwnerContextStrip" aria-label="Owner workspace status">
      <div>
        <span>{labels[screen] || "Owner workspace"}</span>
        <strong>{commandPage ? `${pendingCount} decisions waiting` : pendingCount ? `${pendingCount} waiting in Command` : "Command is clear"}</strong>
        <small>{notice}</small>
      </div>
      {!commandPage && pendingCount > 0 ? <button type="button" onClick={() => go("command")}>Open Command</button> : null}
    </section>
  );
}
