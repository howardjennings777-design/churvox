import React, { useMemo, useState } from "react";
import "./OfficeTeamCorePageIdentity.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const fallbackRows = [
  ["Worker A", "On today’s run", "2 assigned", "Field updates and completion evidence return through the protected worker app."],
  ["Worker setup", "Invite incomplete", "Needs check", "The worker account needs an owner-controlled setup review."],
  ["Tomorrow run", "Coverage ready", "2 assigned", "The next run has worker coverage."],
  ["Payroll review", "Hours prepared", "36.5 hrs", "Gross hours are ready for review only."],
];

const fieldSteps = ["Acknowledge", "Start", "Pause", "Complete"];
const evidenceSteps = ["Job note", "Timer", "Photos", "Boss update"];

export default function OfficeTeamWorkerPhoneView({ appMode = "lab" }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const live = useOfficeTeamRows("staff", fallbackRows, { allowFallback, emptyMessage: "No worker records found yet." });
  const [selected, setSelected] = useState(fallbackRows[0]);
  const rows = live.rows;
  const current = selectedRow(rows, selected, allowFallback ? fallbackRows : []);
  const attention = useMemo(() => rows.filter((row) => /need|check|missing|odd|late|issue|incomplete/.test(String(row?.[2] || "").toLowerCase())), [rows]);
  const active = useMemo(() => rows.filter((row) => /assigned|active|working|started|in progress|today/.test(`${row?.[1] || ""} ${row?.[2] || ""}`.toLowerCase())), [rows]);

  return (
    <section className="cvSiteScreen cvWorkersWorkspace">
      <header className="cvCorePageHero cvWorkersHero">
        <div>
          <span>Field operations</span>
          <h2>Know who is covered, who is working and what came back from site.</h2>
          <p>Workers use the protected field app for status, evidence and updates. The owner sees coverage, progress and exceptions here.</p>
        </div>
        <div className="cvCoreHeroStats" aria-label="Worker summary">
          <article><strong>{rows.length}</strong><small>Worker records</small></article>
          <article><strong>{active.length}</strong><small>Active or assigned</small></article>
          <article><strong>{attention.length}</strong><small>Need attention</small></article>
        </div>
      </header>

      <div className="cvFieldOpsLayout">
        <aside className="cvFieldRoster">
          <header><div><span>Team and field queue</span><small>{live.label}</small></div><strong>{rows.length}</strong></header>
          <div>
            {rows.length ? rows.map((row) => (
              <button key={rowKey(row)} type="button" className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)}>
                <span className="cvWorkerInitials" aria-hidden="true">{initials(row[0])}</span>
                <span><strong>{row[0]}</strong><small>{row[1]}</small></span>
                <em>{row[2]}</em>
              </button>
            )) : <Empty title="No worker records" text={ownerRoute ? "Add workers through Team, then field status and updates will appear here." : "Worker records will appear here."} />}
          </div>
        </aside>

        <section className="cvFieldControlRoom" aria-label="Selected worker field record">
          {rows.length ? (
            <>
              <header className="cvFieldSelectedWorker">
                <span className="cvWorkerInitials large" aria-hidden="true">{initials(current[0])}</span>
                <div><span>Selected field record</span><h3>{current[0]}</h3><p>{current[1]}</p></div>
                <em>{current[2]}</em>
              </header>

              <section className="cvFieldStatusBoard">
                <article className="primary"><small>Latest field detail</small><strong>{current[3] || "No detail found"}</strong></article>
                <article><small>Current assignment or state</small><strong>{current[1] || "Not found"}</strong></article>
                <article><small>Coverage or timer signal</small><strong>{current[2] || "Not found"}</strong></article>
              </section>

              <section className="cvFieldFlowMap">
                <div><span>Worker job flow</span><h3>Simple in the field, visible to the owner</h3></div>
                <div className="cvFieldFlowSteps">
                  {fieldSteps.map((step, index) => <article key={step}><strong>{index + 1}</strong><span>{step}</span></article>)}
                </div>
                <div className="cvFieldProofSteps">
                  {evidenceSteps.map((step) => <span key={step}>{step}</span>)}
                </div>
                <p>These actions belong to the protected worker app. This owner screen shows the result without changing the field record.</p>
              </section>

              <div className="cvFieldOwnerActions">
                <button type="button" onClick={() => window.open("/worker/today", "_blank", "noopener,noreferrer")}>Open worker app</button>
                <small>Opens the worker route in a new tab. A worker login is required.</small>
              </div>

              <OfficeTeamSafeControls area="worker" record={current} primary="Prepare worker review" secondary="Prepare boss follow-up" command="Prepare hours or evidence decision" />
            </>
          ) : <Empty title="Nothing needs owner oversight" text="Worker updates will appear when there is field activity or an exception." />}
        </section>
      </div>

      <section className="cvFieldGuardrail">
        <div><span>Owner boundary</span><h3>The office watches; the worker completes the field action.</h3></div>
        <ul>
          <li>Acknowledge, start, pause and complete stay with the worker.</li>
          <li>Completion evidence and boss updates come from the protected worker route.</li>
          <li>Hours can be reviewed, but no payroll payment or tax filing is created.</li>
          <li>Anything needing a decision returns to Command.</li>
        </ul>
      </section>
    </section>
  );
}

function initials(value) {
  const parts = String(value || "W").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "W";
}

function Empty({ title, text }) {
  return <article className="cvSiteEmpty"><strong>{title}</strong><p>{text}</p></article>;
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
