import React from "react";

const invoices = [
  {
    id: 1,
    number: "INV-1007",
    client: "Aroha Property Care",
    job: "Lawn service",
    status: "Draft",
    amount: "$85.00",
    gst: "$11.09 GST",
    due: "Not sent",
    risk: "Needs owner approval before sending.",
    notes: "Created from completed lawn service. Includes mow, edge and tidy.",
    lines: ["Lawn service · $75.00", "GST · $11.09", "Rounding · -$1.09"],
  },
  {
    id: 2,
    number: "INV-1006",
    client: "Lower Hutt Medical Centre",
    job: "Garden tidy",
    status: "Approved",
    amount: "$420.00",
    gst: "$54.78 GST",
    due: "Due in 7 days",
    risk: "Ready to send.",
    notes: "Back garden tidy and green waste removal.",
    lines: ["Garden tidy · $365.22", "GST · $54.78"],
  },
  {
    id: 3,
    number: "INV-1002",
    client: "Birchville Rentals",
    job: "Driveway clean",
    status: "Overdue",
    amount: "$190.00",
    gst: "$24.78 GST",
    due: "Overdue 9 days",
    risk: "Follow-up should go to Command before sending.",
    notes: "Overdue invoice. Owner should approve reminder wording.",
    lines: ["Driveway clean · $165.22", "GST · $24.78"],
  },
];

export default function FreshInvoices({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(1);
  const selected = invoices.find((invoice) => invoice.id === selectedId) || invoices[0];

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Invoices</span>
        <h1>Invoices</h1>
        <p>Money desk. Review draft invoices, approve sending, mark paid, and send risky money actions back to Command.</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Invoice list</h2>
          <p>Draft, approved, paid and overdue money.</p>

          {invoices.map((invoice) => (
            <button
              type="button"
              key={invoice.id}
              className={`freshItem ${invoice.status === "Overdue" || invoice.status === "Draft" ? "need" : ""} ${selected.id === invoice.id ? "active" : ""}`}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelectedId(invoice.id)}
            >
              <b>{invoice.number} · {invoice.amount}</b>
              <span>{invoice.client} · {invoice.status}</span>
            </button>
          ))}
        </aside>

        <section className="freshCard">
          <h2>{selected.number}</h2>

          <div className="freshTabs">
            <span className="active">Review</span>
            <span>Lines</span>
            <span>Customer</span>
            <span>Sync</span>
          </div>

          <label className="freshField">
            <span>Client</span>
            <input value={selected.client} readOnly />
          </label>

          <label className="freshField">
            <span>Job</span>
            <input value={selected.job} readOnly />
          </label>

          <label className="freshField">
            <span>Status</span>
            <input value={selected.status} readOnly />
          </label>

          <label className="freshField">
            <span>Total</span>
            <input value={`${selected.amount} · ${selected.gst}`} readOnly />
          </label>

          <label className="freshField">
            <span>Due</span>
            <input value={selected.due} readOnly />
          </label>

          <label className="freshField">
            <span>Invoice notes</span>
            <textarea value={selected.notes} readOnly />
          </label>
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <p>Invoices should not surprise the customer. Owner approves money before send.</p>

          <div className={`freshItem ${selected.status === "Overdue" || selected.status === "Draft" ? "need" : ""}`}>
            <b>Command check</b>
            <span>{selected.risk}</span>
          </div>

          <div className="freshActions">
            <button className="freshPrimary">Approve invoice</button>
            <button className="freshOrange">Send invoice</button>
            <button className="freshDark">Mark paid</button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>Send issue to Command</button>
          </div>

          <div className="freshItem">
            <b>Accounting sync</b>
            <span>MYOB / Xero status will sit here later.</span>
          </div>
        </aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Invoice lines</h2>
          {selected.lines.map((line) => (
            <div className="freshItem" key={line}>
              <b>{line}</b>
              <span>Prepared from job record</span>
            </div>
          ))}
        </section>

        <aside className="freshCard">
          <h2>Money rules</h2>
          <div className="freshItem need">
            <b>Drafts need approval</b>
            <span>No invoice sends without owner approval.</span>
          </div>
          <div className="freshItem need">
            <b>Overdue reminders go to Command</b>
            <span>Owner approves wording before customer contact.</span>
          </div>
        </aside>
      </section>
    </section>
  );
}
