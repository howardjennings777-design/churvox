import React, { useMemo, useState } from "react";
import "./OfficeTeamMessagesDesk.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const fallbackRows = [
  ["Worker update", "Cam added a note about extra green waste.", "Needs owner decision", "Ask staff, charge extra, or include free."],
  ["Customer message", "Jay asked about the next available slot.", "Reply prepared", "Suggested date is ready for approval."],
  ["Quote follow-up", "Monthly cleaning quote was viewed.", "Follow-up ready", "Polite follow-up is prepared."],
  ["Missing proof", "Completed work has no final proof note.", "Ask staff", "Worker prompt is ready."],
];

export default function OfficeTeamMessagesDesk() {
  const live = useOfficeTeamRows("messages", fallbackRows);
  const [selected, setSelected] = useState(fallbackRows[0]);
  const current = selectedRow(live.rows, selected, fallbackRows);
  const preparedReply = useMemo(() => buildPreparedReply(current), [current]);

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>Messages</span>
        <h2>Inbox, worker updates and customer replies</h2>
        <p>Messages become decisions, replies and follow-ups. Churvox prepares the next step, then the owner approves before anything sends.</p>
      </header>

      <div className="cvMessagesDeskGrid">
        <section className="cvMessagesInboxPanel">
          <div className="cvMessagesPanelHead">
            <strong>Needs owner eyes</strong>
            <small>{live.label}</small>
          </div>
          {live.rows.map((row) => (
            <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button">
              <span>{row[0]}</span>
              <strong>{row[1]}</strong>
              <small>{row[2]}</small>
            </button>
          ))}
        </section>

        <article className="cvMessagesThreadCard">
          <span>{current[2]}</span>
          <h3>{current[1]}</h3>
          <p>{current[3]}</p>

          <div className="cvMessagesFlowLine">
            <article><b>Input</b><small>{live.isLive ? "Live read-only message" : "Demo message"}</small></article>
            <article><b>Prepared</b><small>Reply / staff ask / Command card</small></article>
            <article><b>Owner</b><small>Approve before send</small></article>
          </div>

          <section className="cvMessagesDraftBox">
            <span>Prepared reply draft</span>
            <p>{preparedReply}</p>
          </section>

          <OfficeTeamSafeControls area="messages" record={current} primary="Prepare reply" secondary="Prepare staff ask" command="Prepare Command card" />
        </article>
      </div>
    </section>
  );
}

function buildPreparedReply(row = []) {
  const title = row[1] || "this update";
  const status = String(row[2] || "review").toLowerCase();
  if (status.includes("staff") || status.includes("proof") || status.includes("worker")) {
    return `Ask staff for the missing detail on “${title}” before the owner approves the final step.`;
  }
  if (status.includes("follow")) {
    return `Polite follow-up is ready for “${title}”. Owner can review the wording before it sends.`;
  }
  if (status.includes("reply") || status.includes("prepared")) {
    return `Reply is drafted for “${title}”. Owner can approve, edit, or park it.`;
  }
  return `Command card is ready for “${title}”. Owner chooses the next step before anything changes.`;
}
