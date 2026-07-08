import React, { useState } from "react";
import "./OfficeTeamExtraScreens.css";

const quoteRows = [
  ["Draft", "Garden tidy quote", "$420", "Scope ready, price needs owner check"],
  ["Viewed", "Monthly cleaning package", "$680", "Follow-up prepared"],
  ["Waiting", "Hair colour booking", "$210", "Deposit wording ready"],
  ["Convert", "Maintenance quote", "$1,250", "Ready to become work after approval"],
];

const invoiceRows = [
  ["Draft", "Completed service invoice", "$185", "Extra charge decision held"],
  ["Sent", "Regular visit", "$89", "Payment reminder prepared"],
  ["Overdue", "Commercial clean", "$340", "Polite follow-up ready"],
  ["Xero-ready", "End of week pack", "4 invoices", "Sync locked until owner approval"],
];

const integrationRows = [
  ["Xero", "Connected", "Draft invoice sync ready", "Owner approval required before sync"],
  ["MYOB", "Export ready", "CSV / bookkeeper pack", "No auto-send"],
  ["Email", "Prepared only", "Drafts and reminders", "Owner sends"],
  ["SMS", "Coming soon", "Quick messages", "Disabled in preview"],
];

const helpRows = [
  ["Getting started", "Set up your business words", "Choose jobs, bookings, visits or appointments"],
  ["Command", "Approve decisions", "Nothing sends until owner approval"],
  ["Staff", "Worker updates", "Staff update work, owner checks decisions"],
  ["Money", "Invoices and sync", "Draft first, approve second"],
];

export function QuotesScreen() {
  return <ExtraScreen eyebrow="Quotes" title="Quote desk" text="Quotes are prepared, followed up and converted only when the owner is ready." rows={quoteRows} primary="Create quote" secondary="Follow up" />;
}

export function InvoicesScreen() {
  return <ExtraScreen eyebrow="Invoices" title="Invoice desk" text="Invoices are drafted from completed work, checked for extras and held until the owner approves sending or syncing." rows={invoiceRows} primary="Create invoice" secondary="Export pack" />;
}

export function IntegrationsScreen() {
  return <ExtraScreen eyebrow="Integrations" title="Accounting, email and future tools" text="Integrations stay safe: prepared data, owner approval, then sync or send." rows={integrationRows} primary="Open Xero" secondary="Export files" />;
}

export function HelpScreen() {
  return <ExtraScreen eyebrow="Help" title="Owner guide" text="Help should explain the Churvox way: staff update work, Churvox prepares admin, owner approves decisions." rows={helpRows} primary="Start guide" secondary="Contact support" />;
}

function ExtraScreen({ eyebrow, title, text, rows, primary, secondary }) {
  const [selected, setSelected] = useState(rows[0]);
  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </header>

      <div className="cvExtraLayout">
        <section className="cvExtraCards">
          {rows.map((row) => (
            <button key={`${row[0]}-${row[1]}`} className={selected === row ? "active" : ""} onClick={() => setSelected(row)}>
              <span>{row[0]}</span>
              <strong>{row[1]}</strong>
              <small>{row[2]}</small>
            </button>
          ))}
        </section>

        <aside className="cvExtraDetail">
          <span>{selected[0]}</span>
          <h3>{selected[1]}</h3>
          <strong>{selected[2]}</strong>
          <p>{selected[3]}</p>
          <div className="cvExtraSafety">
            <article><b>Owner approval</b><small>Required</small></article>
            <article><b>Auto-send</b><small>Off</small></article>
            <article><b>Auto-sync</b><small>Off</small></article>
          </div>
          <footer>
            <button className="primary">{primary}</button>
            <button>{secondary}</button>
            <button>Send to Command</button>
          </footer>
        </aside>
      </div>
    </section>
  );
}
