import React, { useState } from "react";
import "./OfficeTeamExtraScreens.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

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
  ["SMS", "Coming soon", "Quick messages", "Disabled until enabled"],
];

const helpRows = [
  ["Getting started", "Set up your business words", "Choose jobs, bookings, visits or appointments"],
  ["Command", "Approve decisions", "Nothing sends until owner approval"],
  ["Staff", "Worker updates", "Staff update work, owner checks decisions"],
  ["Money", "Invoices and sync", "Draft first, approve second"],
];

export function QuotesScreen(props) {
  return <ExtraScreen area="quotes" eyebrow="Quotes" title="Quote desk" text="Quotes are prepared, followed up and converted only when the owner is ready." rows={quoteRows} primary="Prepare quote" secondary="Review follow-up" {...props} />;
}

export function InvoicesScreen(props) {
  return <ExtraScreen area="invoices" eyebrow="Invoices" title="Invoice desk" text="Invoices are drafted from completed work, checked for extras and held until the owner approves sending or syncing." rows={invoiceRows} primary="Prepare invoice" secondary="Review export" {...props} />;
}

export function IntegrationsScreen(props) {
  return <ExtraScreen area="money" eyebrow="Integrations" title="Accounting, email and future tools" text="Integrations stay safe: prepared data, owner approval, then sync or send." rows={integrationRows} primary="Prepare sync check" secondary="Review files" {...props} />;
}

export function HelpScreen(props) {
  return <ExtraScreen eyebrow="Help" title="Owner guide" text="Help explains the Churvox way: staff update work, Churvox prepares admin, owner approves decisions." rows={helpRows} primary="Prepare guide note" secondary="Review support note" {...props} forceFallback />;
}

function ExtraScreen({ area, eyebrow, title, text, rows, primary, secondary, appMode = "lab", forceFallback = false }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = forceFallback || (appMode !== "owner" && !ownerRoute);
  const live = useOfficeTeamRows(area, rows, { allowFallback, emptyMessage: "No live records found yet." });
  const [selected, setSelected] = useState(rows[0]);
  const displayRows = live.rows;
  const hasRows = displayRows.length > 0;
  const current = selectedRow(displayRows, selected, allowFallback ? rows : []);

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </header>

      <div className="cvExtraLayout">
        <section className="cvExtraCards">
          {hasRows ? displayRows.map((row) => (
            <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)}>
              <span>{row[0]}</span>
              <strong>{row[1]}</strong>
              <small>{row[2]}</small>
            </button>
          )) : <article className="cvSiteEmpty"><strong>No {eyebrow.toLowerCase()} records yet</strong><p>{ownerRoute ? "This area is clear. Churvox will bring items here when they need owner review." : "This area will fill when there is live work to review."}</p></article>}
        </section>

        <aside className="cvExtraDetail">
          <span>{current[0]}</span>
          <h3>{current[1]}</h3>
          <strong>{current[2]}</strong>
          <p>{current[3]}</p>
          <div className="cvExtraSafety">
            <article><b>Data source</b><small>{live.label}</small></article>
            <article><b>Auto-send</b><small>Off</small></article>
            <article><b>Auto-sync</b><small>Off</small></article>
          </div>
          {hasRows ? <OfficeTeamSafeControls area={area || eyebrow} record={current} primary={primary} secondary={secondary} command="Prepare Command card" /> : <article className="cvSiteEmpty"><strong>Nothing to prepare</strong><p>{ownerRoute ? "Nothing needs owner approval here right now." : "Live records will appear here when there is something real for the owner to review."}</p></article>}
        </aside>
      </div>
    </section>
  );
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
