import React from "react";

const quick = {
  job: {
    title: "New job",
    badge: "Job setup",
    page: "jobs",
    primary: "Create job draft",
    fields: [
      ["Client", "Aroha Property Care"],
      ["Job title", "Lawn service"],
      ["Scheduled", "Today 10:00"],
      ["Worker", "Unassigned"],
      ["Price", "$85 fixed"],
    ],
    note: "Create a job draft, assign worker, add notes, then send any risky setup to Command.",
  },
  quote: {
    title: "New quote",
    badge: "Quote setup",
    page: "quotes",
    primary: "Create quote draft",
    fields: [
      ["Client", "Birchville Rentals"],
      ["Quote title", "Driveway clean"],
      ["Amount", "$240"],
      ["Status", "Draft"],
      ["Follow-up rule", "Send to Command after 5 days"],
    ],
    note: "Draft the quote first. Follow-ups should be approved from Command.",
  },
  client: {
    title: "Add client",
    badge: "Client setup",
    page: "clients",
    primary: "Create client",
    fields: [
      ["Client name", "New client"],
      ["Email", "client@example.co.nz"],
      ["Phone", "027 000 0000"],
      ["Service address", "Street, suburb"],
      ["Billing email", "accounts@example.co.nz"],
    ],
    note: "Clean client setup keeps invoices, reminders and Command boxes accurate.",
  },
};

export default function FreshQuickCreate({ type, onClose, onNavigate }) {
  const item = quick[type] || quick.job;

  function openPage() {
    onNavigate?.(item.page);
    onClose?.();
  }

  return (
    <div className="freshSlipOverlay" onClick={onClose}>
      <section className="freshQuickModal" onClick={(event) => event.stopPropagation()}>
        <header className="freshSlipHead">
          <span>{item.badge}</span>
          <h2>{item.title}</h2>
          <p>{item.note}</p>
        </header>

        <div className="freshQuickBody">
          {item.fields.map(([label, value]) => (
            <label className="freshField" key={label}>
              <span>{label}</span>
              <input defaultValue={value} />
            </label>
          ))}

          <label className="freshField">
            <span>Owner notes</span>
            <textarea defaultValue={item.note} />
          </label>

          <div className="freshSlipActions">
            <button className="freshPrimary">{item.primary}</button>
            <button className="freshOrange" onClick={openPage}>Open {item.page}</button>
            <button className="freshDark" onClick={() => onNavigate?.("command")}>Send to Command</button>
            <button className="freshGhost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </section>
    </div>
  );
}
