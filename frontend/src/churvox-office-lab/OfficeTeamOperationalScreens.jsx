import React, { useState } from "react";
import "./OfficeTeamOperationalScreens.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const workRows = [
  ["Today", "Green waste follow-up", "Needs owner decision", "Invoice extra held"],
  ["Tomorrow", "Regular cleaning visit", "Ready", "Staff assigned"],
  ["Friday", "Hair appointment rebook", "Prepared", "Message drafted"],
  ["Next week", "Repeat maintenance", "Review price", "Took longer twice"],
];

const moneyRows = [
  ["Draft invoice", "$185", "Extra charge held", "Owner decision"],
  ["Quote follow-up", "$420", "Viewed, no reply", "Follow-up ready"],
  ["Payment reminder", "$89", "Due soon", "Reminder prepared"],
  ["Accounting sync", "0", "Locked", "No auto-sync"],
];

const clientRows = [
  ["Sarah", "Preference memory", "Save note", "Colour and sensitivity detail"],
  ["Jay", "Rebook cycle", "No next booking", "Usually every 3 weeks"],
  ["Stuart", "Invoice question", "Extra green waste", "Owner decision needed"],
  ["New lead", "Missing details", "Ask for address", "Message prepared"],
];

const staffRows = [
  ["Cam", "Timer check", "Odd timer", "Ask or edit"],
  ["Worker setup", "Invite incomplete", "Reminder ready", "No auto-send"],
  ["Tomorrow run", "2 assigned", "Ready", "No conflict"],
  ["Payroll review", "36.5 hrs", "Prepared", "Gross only"],
];

export function WorkScreen(props) {
  return <OperationalScreen area="work" eyebrow="Work" title="Jobs, bookings and appointments" text="This is where owner work becomes simple: what is ready, what needs a decision, and what the office team has already prepared." rows={workRows} primary="Prepare work" secondary="Review day" {...props} />;
}

export function MoneyScreen(props) {
  return <OperationalScreen area="money" eyebrow="Money" title="Invoices, quotes and payment follow-up" text="Money stays safe. Churvox prepares drafts, reminders and accounting checks, but Command gets the owner decision before anything moves." rows={moneyRows} primary="Prepare money item" secondary="Review export" {...props} />;
}

export function ClientsScreen(props) {
  return <OperationalScreen area="clients" eyebrow="Clients" title="Client memory and follow-up" text="The office team keeps notes, repeat patterns and missing details tidy so the owner does not have to remember everything." rows={clientRows} primary="Prepare client note" secondary="Review import" {...props} />;
}

export function StaffScreen(props) {
  return <OperationalScreen area="staff" eyebrow="Staff" title="Workers, timers and daily run" text="Staff update the work. Churvox checks timers, setup, assignments and missing details before asking the owner." rows={staffRows} primary="Prepare staff item" secondary="Review hours" {...props} />;
}

function OperationalScreen({ area, eyebrow, title, text, rows, primary, secondary, appMode = "lab" }) {
  const allowFallback = appMode !== "owner";
  const live = useOfficeTeamRows(area, rows, { allowFallback, emptyMessage: "No live records found. No demo rows are shown in the owner app." });
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

      <div className="cvOpsLayout">
        <section className="cvOpsTable">
          <div className="cvOpsTableHead">
            <strong>Office-prepared list</strong>
            <small>{live.label}</small>
          </div>
          {hasRows ? displayRows.map((row) => (
            <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)}>
              <span>{row[0]}</span>
              <strong>{row[1]}</strong>
              <em>{row[2]}</em>
            </button>
          )) : <article className="cvSiteEmpty"><strong>No live {eyebrow.toLowerCase()} records yet</strong><p>No demo rows are shown inside the real owner app.</p></article>}
        </section>

        <aside className="cvOpsDetail">
          <span>{current[2]}</span>
          <h3>{current[1]}</h3>
          <p>{current[3]}</p>
          <dl>
            <div><dt>Status</dt><dd>{current[2]}</dd></div>
            <div><dt>Owner control</dt><dd>Prepared only</dd></div>
            <div><dt>Safety</dt><dd>No send or sync</dd></div>
          </dl>
          {hasRows ? <OfficeTeamSafeControls area={area} record={current} primary={primary} secondary={secondary} command="Prepare Command card" /> : <article className="cvSiteEmpty"><strong>Nothing to prepare</strong><p>Live business records will appear here when the office team has something real to check.</p></article>}
        </aside>
      </div>
    </section>
  );
}
