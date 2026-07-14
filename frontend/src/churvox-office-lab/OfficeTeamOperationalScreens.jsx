import React, { useState } from "react";
import "./OfficeTeamOperationalScreens.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import OfficeTeamWorkForms from "./OfficeTeamWorkForms";
import OfficeTeamJobsWorkspace from "./OfficeTeamJobsWorkspace";
import OfficeTeamClientsWorkspace from "./OfficeTeamClientsWorkspace";
import { MoneyRadar } from "./OfficeTeamJobDone";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const staffRows = [
  ["Worker A", "Timer check", "Unusual timer", "Ask the worker or edit the hours"],
  ["Worker setup", "Invite incomplete", "Reminder ready", "Owner approval required before sending"],
  ["Tomorrow run", "2 assigned", "Ready", "No conflict found"],
  ["Payroll review", "36.5 hrs", "Prepared", "Gross hours only"],
];

export function WorkScreen(props) {
  return <OfficeTeamJobsWorkspace {...props} />;
}

export function ClientsScreen(props) {
  return <OfficeTeamClientsWorkspace {...props} />;
}

export function MoneyScreen(props) {
  return <MoneyRadar {...props} />;
}

export function StaffScreen(props) {
  return <OperationalScreen area="staff" eyebrow="Staff" title="Workers, timers and daily run" text="Prepare worker changes, timer reviews and staff notes. Nothing changes payroll or job records until owner approval." rows={staffRows} primary="Prepare staff item" secondary="Review hours" {...props} />;
}

function OperationalScreen({ area, eyebrow, title, text, rows, primary, secondary, appMode = "lab" }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const currentRows = useOfficeTeamRows(area, rows, { allowFallback, emptyMessage: "No records found yet." });
  const [selected, setSelected] = useState(rows[0]);
  const displayRows = currentRows.rows;
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
            <strong>Prepared list</strong>
            <small>{currentRows.label}</small>
          </div>
          {hasRows ? displayRows.map((row) => (
            <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)}>
              <span>{row[0]}</span>
              <strong>{row[1]}</strong>
              <em>{row[2]}</em>
            </button>
          )) : <article className="cvSiteEmpty"><strong>No {eyebrow.toLowerCase()} records yet</strong><p>{ownerRoute ? "Use the form below to add or import work. Churvox will bring records back to Command when they need approval." : "Use the form below or wait for work that needs review."}</p></article>}
        </section>

        <aside className="cvOpsDetail">
          <span>{current[2]}</span>
          <h3>{current[1]}</h3>
          <p>{current[3]}</p>
          <dl>
            <div><dt>Status</dt><dd>{current[2]}</dd></div>
            <div><dt>Owner control</dt><dd>Prepared only</dd></div>
            <div><dt>Safety</dt><dd>Nothing sends or syncs automatically</dd></div>
          </dl>
          {hasRows ? <OfficeTeamSafeControls area={area} record={current} primary={primary} secondary={secondary} command="Prepare Command decision" /> : <article className="cvSiteEmpty"><strong>Nothing to prepare</strong><p>{ownerRoute ? "This area is clear. Add or import a draft below when you need something prepared." : "Business records will appear here when something needs checking."}</p></article>}
        </aside>
      </div>

      <OfficeTeamWorkForms area={area} title={eyebrow} selectedRecord={current} />
    </section>
  );
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
