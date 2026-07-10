import React, { useState } from "react";
import "./OfficeTeamBackOfficeScreens.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const scheduleRows = [
  ["Today", "Plan my day", "Prepared", "2 jobs, 1 booking gap, 1 worker check"],
  ["Tomorrow", "Run sheet", "Ready", "Staff assignments are clean"],
  ["Recurring", "Next cycle", "Needs review", "One repeat service has no next date"],
  ["Calendar", "Capacity warning", "Watch", "Friday is close to overloaded"],
];

const automationRows = [
  ["Follow-up", "Quote viewed", "Owner approval", "Draft follow-up prepared but not sent"],
  ["Rebook", "Repeat client", "Prepared", "Suggested date ready"],
  ["Proof", "Missing photo", "Ask staff", "Worker prompt ready"],
  ["Invoice", "Completed work", "Prepared", "Draft only, no auto-send"],
];

const payrollRows = [
  ["This week", "36.5 hours", "Review", "Gross hours only, no tax filing"],
  ["Odd timer", "Long shift", "Check", "Ask staff or edit before approval"],
  ["Export", "Payroll CSV", "Prepared", "No bank file or government submit"],
  ["Worker rates", "Setup check", "Missing", "Rate review before reports"],
];

const brandingRows = [
  ["Business logo", "Upload / preview", "Mobile-safe", "Owner app and documents should match"],
  ["GST", "15% default", "Check", "Used for NZ invoice preview"],
  ["Words", "Job / booking / visit", "Playbook", "Business language should match industry"],
  ["Mobile", "Simplified owner view", "Important", "Phone should not show every desktop control"],
];

export function ScheduleScreen(props) {
  return <BackOfficeScreen area="schedule" eyebrow="Schedule" title="Calendar and daily planning" text="The owner should see the run, gaps, recurring work and overload warnings without thinking too hard." rows={scheduleRows} primary="Prepare day plan" secondary="Review calendar" {...props} />;
}

export function AutomationScreen(props) {
  return <BackOfficeScreen area="automation" eyebrow="Automation" title="Prepared rules, not blind automation" text="Automation should prepare the next step and send it to Command. It must not silently message, sync, charge or change records." rows={automationRows} primary="Prepare rule" secondary="Review rule" {...props} />;
}

export function PayrollScreen(props) {
  return <BackOfficeScreen area="payroll" eyebrow="Payroll" title="Hours review, not tax filing" text="Payroll stays safe: hours, gross totals and CSV exports only. No tax submission, no bank payout files and no government filing." rows={payrollRows} primary="Prepare hours" secondary="Review CSV" {...props} />;
}

export function BrandingScreen(props) {
  return <BackOfficeScreen area="branding" eyebrow="Branding" title="Business settings and mobile polish" text="Branding keeps Churvox feeling like the owner’s business while staying simple on mobile." rows={brandingRows} primary="Prepare branding" secondary="Review mobile" {...props} forceFallback />;
}

function BackOfficeScreen({ area, eyebrow, title, text, rows, primary, secondary, appMode = "lab", forceFallback = false }) {
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

      <div className="cvBackOfficeGrid">
        <section className="cvBackOfficeList">
          {hasRows ? displayRows.map((row) => (
            <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)}>
              <span>{row[0]}</span>
              <strong>{row[1]}</strong>
              <small>{row[2]}</small>
            </button>
          )) : <article className="cvSiteEmpty"><strong>No {eyebrow.toLowerCase()} records yet</strong><p>{ownerRoute ? "This area is clear. Churvox will bring items here when they need owner review." : "This area will fill when there is live work to review."}</p></article>}
        </section>

        <aside className="cvBackOfficeDetail">
          <span>{current[2]}</span>
          <h3>{current[1]}</h3>
          <p>{current[3]}</p>
          <div className="cvBackOfficeChecks">
            <article><b>Owner control</b><small>Required before real action</small></article>
            <article><b>Data source</b><small>{live.label}</small></article>
            <article><b>Mobile fit</b><small>Keep the screen simple</small></article>
          </div>
          {hasRows ? <OfficeTeamSafeControls area={area} record={current} primary={primary} secondary={secondary} command="Prepare Command card" /> : <article className="cvSiteEmpty"><strong>Nothing to prepare</strong><p>{ownerRoute ? "Nothing needs owner approval here right now." : "Live records will appear here when there is something real for the owner to review."}</p></article>}
        </aside>
      </div>
    </section>
  );
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
