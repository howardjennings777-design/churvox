import React, { useState } from "react";
import "./OfficeTeamExtraScreens.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import OfficeTeamWorkForms from "./OfficeTeamWorkForms";
import OfficeTeamXeroScreen from "./OfficeTeamXeroScreen";
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

export function QuotesScreen(props) {
  return <ExtraScreen area="quotes" eyebrow="Quotes" title="Quote desk" text="Create, edit, import and prepare quote drafts. Owner approval comes before sending or converting." rows={quoteRows} primary="Prepare quote" secondary="Review follow-up" {...props} />;
}

export function InvoicesScreen(props) {
  return <ExtraScreen area="invoices" eyebrow="Invoices" title="Invoice desk" text="Create invoice drafts from work, review extras, import rows and hold sending or syncing until approval." rows={invoiceRows} primary="Prepare invoice" secondary="Review overdue follow-up" {...props} />;
}

export function IntegrationsScreen() {
  return <OfficeTeamXeroScreen />;
}

export function HelpScreen() {
  const guides = [
    ["Start here", "Today", "See the live business overview and what needs your attention.", "today"],
    ["Approve work", "Command", "Open evidence-backed slips, edit the prepared form and approve only what is right.", "command"],
    ["Set up work", "Jobs and clients", "Add or import records through working forms that prepare Command slips first.", "work"],
    ["Worker flow", "Workers", "Check worker updates here; workers use their own simple phone route.", "worker"],
    ["Accounting", "Xero", "Connect Xero, check accounting health and prepare draft-sync approval.", "integrations"],
    ["Safety trail", "Activity", "See what was prepared, what the owner approved and what remains waiting.", "activity"],
  ];
  return (
    <section className="cvSiteScreen cvOwnerHelp">
      <header className="cvSiteScreenHeader">
        <span>Help</span>
        <h2>Use Churvox without guessing</h2>
        <p>Every help choice below opens a real owner page. Churvox prepares the admin, Command holds the decision, and the owner stays in control.</p>
      </header>
      <div className="cvOwnerHelpGrid">
        {guides.map(([eyebrow, title, text, screen]) => (
          <button key={screen} type="button" onClick={() => goToScreen(screen)}>
            <span>{eyebrow}</span>
            <strong>{title}</strong>
            <p>{text}</p>
            <small>Open {title}</small>
          </button>
        ))}
      </div>
      <section className="cvOwnerHelpSupport">
        <div><span>Need a person?</span><h3>Contact Churvox support</h3><p>Tell us what page you were on, what you clicked and what you expected to happen.</p></div>
        <a href="mailto:hello@churvox.com?subject=Churvox%20support">Email hello@churvox.com</a>
      </section>
    </section>
  );
}

function ExtraScreen({ area, eyebrow, title, text, rows, primary, secondary, appMode = "lab" }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
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
            <button key={rowKey(row)} type="button" className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)}>
              <span>{row[0]}</span>
              <strong>{row[1]}</strong>
              <small>{row[2]}</small>
            </button>
          )) : <article className="cvSiteEmpty"><strong>No {eyebrow.toLowerCase()} records yet</strong><p>{ownerRoute ? "Use the working form below to prepare a draft or import rows for Command review." : "This area will fill when there is live work to review."}</p></article>}
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
          {hasRows ? <OfficeTeamSafeControls area={area} record={current} primary={primary} secondary={secondary} command="Prepare Command card" /> : <article className="cvSiteEmpty"><strong>Nothing to prepare</strong><p>{ownerRoute ? "Nothing needs owner approval here right now. Add or import a draft below when needed." : "Live records will appear here when there is something real for the owner to review."}</p></article>}
        </aside>
      </div>

      <OfficeTeamWorkForms area={area} title={eyebrow} selectedRecord={current} />
    </section>
  );
}

function goToScreen(screen) {
  const next = String(screen || "today");
  window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${next}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
