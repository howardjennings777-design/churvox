import React, { useMemo, useState } from "react";
import "./OfficeTeamWorkerPhoneView.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const fallbackRows = [
  ["Today run", "2 assigned", "Ready", "Acknowledge, start, pause, complete."],
  ["Job notes", "Simple updates", "Less typing", "Worker sees only what they need."],
  ["Photos / proof", "Attach before complete", "Quality check", "Owner can invoice safely."],
  ["Boss messages", "Two-way loop", "No missed update", "Worker replies return to Command."],
];

const workerSteps = ["Acknowledge", "Start", "Pause", "Complete"];

export default function OfficeTeamWorkerPhoneView({ appMode = "lab" }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const live = useOfficeTeamRows("worker", fallbackRows, { allowFallback, emptyMessage: "No live worker records found yet." });
  const [selected, setSelected] = useState(fallbackRows[0]);
  const [labStatus, setLabStatus] = useState("Not started");
  const displayRows = live.rows;
  const hasRows = displayRows.length > 0;
  const current = selectedRow(displayRows, selected, allowFallback ? fallbackRows : []);
  const proofItems = useMemo(() => ["Notes", "Photos", "Timer", "Boss message"], []);

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>{ownerRoute ? "Workers" : "Worker View"}</span>
        <h2>{ownerRoute ? "Worker updates and field-app oversight" : "Simple phone view for staff"}</h2>
        <p>{ownerRoute ? "This owner page shows live worker records and prepares decisions. It does not pretend to perform worker phone actions." : "This control view demonstrates the worker flow. The real protected worker route performs live job updates."}</p>
      </header>

      <div className="cvWorkerLabGrid">
        <section className="cvWorkerPhoneFrame" aria-label={ownerRoute ? "Worker flow summary" : "Worker phone control preview"}>
          <div className="cvWorkerPhoneTop">
            <span>{ownerRoute ? "Worker flow" : "Churvox Worker"}</span>
            <strong>{hasRows ? ownerRoute ? current[2] || "Live" : labStatus : "Waiting"}</strong>
          </div>

          <article className="cvWorkerJobCard">
            <small>{current[0]}</small>
            <h3>{hasRows ? current[1] : "No worker items waiting"}</h3>
            <p>{hasRows ? current[3] : ownerRoute ? "Worker records will appear here when staff have assigned work or updates." : "Worker items will appear when staff have assigned work."}</p>
            <em>{hasRows ? current[2] : "Clear"}</em>
          </article>

          <div className="cvWorkerBigButtons">
            {workerSteps.map((step) => ownerRoute
              ? <span key={step} className="cvWorkerFlowStep">{step}</span>
              : <button key={step} type="button" disabled={!hasRows} onClick={() => setLabStatus(step)}>{step}</button>)}
          </div>

          <div className="cvWorkerProofGrid">
            {proofItems.map((item) => <span key={item} className="cvWorkerFlowStep">{item}</span>)}
          </div>

          <section className="cvWorkerBossLoop">
            <b>Boss message</b>
            <p>{hasRows ? "Worker updates return to Command when the owner needs to decide something." : "Worker updates will appear here when staff have real assigned work."}</p>
            {ownerRoute ? <button type="button" onClick={() => window.open("/worker/today", "_blank", "noopener,noreferrer")}>Open protected worker app</button> : null}
          </section>
        </section>

        <aside className="cvWorkerSidePanel">
          <div className="cvWorkerDataSource">
            <span>Data source</span>
            <strong>{live.label}</strong>
            <p>{ownerRoute ? "This page is owner oversight. Workers use the separate protected field route for real status, proof and boss updates." : "The lab shows structure only. Real worker actions belong on the protected worker route."}</p>
          </div>

          <section className="cvWorkerQueueList">
            <h3>Worker items</h3>
            {hasRows ? displayRows.map((row) => (
              <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button">
                <span>{row[0]}</span>
                <strong>{row[1]}</strong>
                <small>{row[2]}</small>
              </button>
            )) : <article className="cvSiteEmpty"><strong>No worker items yet</strong><p>{ownerRoute ? "This area is clear. Worker updates will appear when something needs owner review." : "Worker items will appear when there is real work to review."}</p></article>}
          </section>

          {hasRows ? <OfficeTeamSafeControls area="worker" record={current} primary="Prepare worker review" secondary="Prepare boss follow-up" command="Prepare Command card" /> : <article className="cvSiteEmpty"><strong>Nothing to prepare</strong><p>{ownerRoute ? "No worker update needs owner approval right now." : "Worker updates will appear here when there is something real for the owner to review."}</p></article>}
        </aside>
      </div>
    </section>
  );
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
