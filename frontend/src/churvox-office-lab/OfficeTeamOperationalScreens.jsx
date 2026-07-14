import React, { useState } from "react";
import "./OfficeTeamOperationalScreens.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import OfficeTeamWorkForms from "./OfficeTeamWorkForms";
import OfficeTeamJobsWorkspace from "./OfficeTeamJobsWorkspace";
import OfficeTeamMoneyRadar from "./OfficeTeamMoneyRadar";
import OfficeTeamClientsWorkspace from "./OfficeTeamClientsWorkspace";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const staffRows = [
  ["Cam", "Timer check", "Odd timer", "Ask or edit"],
  ["Worker setup", "Invite incomplete", "Reminder ready", "No auto-send"],
  ["Tomorrow run", "2 assigned", "Ready", "No conflict"],
  ["Payroll review", "36.5 hrs", "Prepared", "Gross only"],
];

export function WorkScreen(props) {
  return <OfficeTeamJobsWorkspace {...props} />;
}

export function ClientsScreen(props) {
  return <OfficeTeamClientsWorkspace {...props} />;
}

export function MoneyScreen(props) {
  return <OfficeTeamMoneyRadar {...props} />;
}

export function StaffScreen(props) {
  return <OperationalScreen area="staff" eyebrow="Staff" title="Workers, timers and daily run" text="Prepare worker changes, timer reviews and staff notes. Nothing changes payroll or job records until owner approval." rows={staffRows} primary="Prepare staff item" secondary="Review hours" {...props} />;
}

function OperationalScreen({ area, eyebrow, title, text, rows, primary, secondary, appMode = "lab" }) {
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

      <div className="cvOpsLayout">
        <section className="cvOpsTable">
          <div className="cvOpsTableHead">
            <strong>{ownerRoute ? "Prepared list" : "Office-prepared list"}</strong>
            <small>{live.label}</small>
          </div>
          {hasRows ? displayRows.map((row) => (
            <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)}>
              <span>{row[0]}</span>
              <strong>{row[1]}</strong>
              <em>{row[2]}</em>
            </button>
          )) : <article className="cvSiteEmpty"><strong>No {eyebrow.toLowerCase()} records yet</strong><p>{ownerRoute ? "Use the working form below to add or import work, or Churvox will bring live records back to Command when they need approval." : "Use the working form below or wait for live work to review."}</p></article>}
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
          {hasRows ? <OfficeTeamSafeControls area={area} record={current} primary={primary} secondary={secondary} command="Prepare Command card" /> : <article className="cvSiteEmpty"><strong>Nothing to prepare</strong><p>{ownerRoute ? "This area is clear. Add or import a draft below when you need something prepared." : "Live business records will appear here when the office team has something real to check."}</p></article>}
        </aside>
      </div>

      <OfficeTeamWorkForms area={area} title={eyebrow} selectedRecord={current} />
    </section>
  );
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
