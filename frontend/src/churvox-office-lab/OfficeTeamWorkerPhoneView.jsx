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

export default function OfficeTeamWorkerPhoneView() {
  const live = useOfficeTeamRows("worker", fallbackRows);
  const [selected, setSelected] = useState(fallbackRows[0]);
  const [localStatus, setLocalStatus] = useState("Not started");
  const displayRows = live.rows;
  const current = selectedRow(displayRows, selected, fallbackRows);
  const proofItems = useMemo(() => ["Notes", "Photos", "Timer", "Boss message"], []);

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>Worker View</span>
        <h2>Simple phone view for staff</h2>
        <p>Workers do not need the owner app. They need today’s work, big buttons, notes, photos and a clean boss message loop.</p>
      </header>

      <div className="cvWorkerLabGrid">
        <section className="cvWorkerPhoneFrame" aria-label="Worker phone preview">
          <div className="cvWorkerPhoneTop">
            <span>Churvox Worker</span>
            <strong>{localStatus}</strong>
          </div>

          <article className="cvWorkerJobCard">
            <small>{current[0]}</small>
            <h3>{current[1]}</h3>
            <p>{current[3]}</p>
            <em>{current[2]}</em>
          </article>

          <div className="cvWorkerBigButtons">
            {workerSteps.map((step) => (
              <button key={step} type="button" onClick={() => setLocalStatus(step)}>{step}</button>
            ))}
          </div>

          <div className="cvWorkerProofGrid">
            {proofItems.map((item) => <button key={item} type="button">{item}</button>)}
          </div>

          <section className="cvWorkerBossLoop">
            <b>Boss message</b>
            <p>“Send an update if something changed. Owner checks it in Command.”</p>
          </section>
        </section>

        <aside className="cvWorkerSidePanel">
          <div className="cvWorkerDataSource">
            <span>Data source</span>
            <strong>{live.label}</strong>
            <p>Worker actions are local preview only. They do not update jobs, timers, photos or messages yet.</p>
          </div>

          <section className="cvWorkerQueueList">
            <h3>Worker items</h3>
            {displayRows.map((row) => (
              <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button">
                <span>{row[0]}</span>
                <strong>{row[1]}</strong>
                <small>{row[2]}</small>
              </button>
            ))}
          </section>

          <OfficeTeamSafeControls area="worker" record={current} primary="Prepare worker update" secondary="Prepare boss note" command="Prepare Command card" />
        </aside>
      </div>
    </section>
  );
}
