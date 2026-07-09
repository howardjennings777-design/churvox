import React, { useState } from "react";
import "./OfficeTeamCommunicationScreens.css";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const messageThreads = [
  ["Worker update", "Cam added a note about extra green waste.", "Needs owner decision", "Ask staff, charge extra, or include free."],
  ["Customer message", "Jay asked about the next available slot.", "Reply prepared", "Suggested date is ready for approval."],
  ["Quote follow-up", "Monthly cleaning quote was viewed.", "Follow-up ready", "Polite follow-up is prepared."],
  ["Missing proof", "Completed work has no final proof note.", "Ask staff", "Worker prompt is ready."],
];

const workerCards = [
  ["Today run", "2 assigned", "Clean view", "Acknowledge, start, pause, complete."],
  ["Job notes", "Simple updates", "Less typing", "Worker sees only what they need."],
  ["Photos / proof", "Attach before complete", "Quality check", "Owner can invoice safely."],
  ["Boss messages", "Two-way loop", "No missed update", "Worker replies return to Command."],
];

export function MessagesScreen() {
  return <CommunicationScreen area="messages" eyebrow="Messages" title="Inbox, worker updates and customer replies" text="Messages become decisions, replies and follow-ups. Churvox prepares the admin but the owner stays in control." rows={messageThreads} primary="Reply" secondary="Ask staff" />;
}

export function WorkerViewScreen() {
  return <CommunicationScreen area="worker" eyebrow="Worker View" title="Simple phone view for staff" text="Workers should not see the whole owner app. They need today’s work, simple buttons, notes, photos and boss messages." rows={workerCards} primary="Preview worker view" secondary="Send test update" />;
}

function CommunicationScreen({ area, eyebrow, title, text, rows, primary, secondary }) {
  const live = useOfficeTeamRows(area, rows);
  const [selected, setSelected] = useState(rows[0]);
  const displayRows = live.rows;
  const current = selectedRow(displayRows, selected, rows);

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </header>

      <div className="cvCommsLayout">
        <section className="cvCommsInbox">
          {displayRows.map((row) => (
            <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)}>
              <span>{row[0]}</span>
              <strong>{row[1]}</strong>
              <small>{row[2]}</small>
            </button>
          ))}
        </section>

        <aside className="cvCommsDetail">
          <span>{current[2]}</span>
          <h3>{current[0]}</h3>
          <p>{current[3]}</p>
          <div className="cvCommsFlow">
            <article><strong>Input</strong><small>{live.isLive ? "Live read-only record" : "Demo worker, customer or owner message"}</small></article>
            <article><strong>Churvox prepares</strong><small>Draft reply, prompt or Command card</small></article>
            <article><strong>Owner approves</strong><small>Nothing sends until approved</small></article>
          </div>
          <footer>
            <button className="primary">{primary}</button>
            <button>{secondary}</button>
            <button>Send to Command</button>
          </footer>
        </aside>
      </div>
    </section>
  );
}
