import React, { useMemo, useState } from "react";
import "./OfficeTeamMessagesDesk.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const fallbackRows = [
  ["Worker update", "A worker added a note about extra green waste.", "Needs owner decision", "Ask staff, charge extra, or include free."],
  ["Customer message", "A client asked about the next available slot.", "Reply prepared", "A suggested date is ready for approval."],
  ["Quote follow-up", "A recurring-service quote was viewed.", "Follow-up ready", "A polite follow-up is prepared."],
  ["Missing evidence", "Completed work has no final completion note.", "Ask staff", "A worker prompt is ready."],
];

export default function OfficeTeamMessagesDesk({ appMode = "lab" }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const currentRows = useOfficeTeamRows("messages", fallbackRows, { allowFallback, emptyMessage: "No messages found yet." });
  const [selected, setSelected] = useState(fallbackRows[0]);
  const hasRows = currentRows.rows.length > 0;
  const current = selectedRow(currentRows.rows, selected, allowFallback ? fallbackRows : []);
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
            <small>{currentRows.label}</small>
          </div>
          {hasRows ? currentRows.rows.map((row) => (
            <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button">
              <span>{row[0]}</span>
              <strong>{row[1]}</strong>
              <small>{row[2]}</small>
            </button>
          )) : <article className="cvSiteEmpty"><strong>No messages need review</strong><p>{ownerRoute ? "When a customer or worker message needs approval, Churvox will bring it back to Command." : "Messages will appear here when something needs owner review."}</p></article>}
        </section>

        <article className="cvMessagesThreadCard">
          <span>{current[2]}</span>
          <h3>{current[1]}</h3>
          <p>{current[3]}</p>

          <div className="cvMessagesFlowLine">
            <article><b>Message</b><small>{currentRows.isLive ? "Current read-only message" : allowFallback ? "Preview message" : "No message selected"}</small></article>
            <article><b>Prepared</b><small>Reply, staff question or Command decision</small></article>
            <article><b>Owner</b><small>Approve before sending</small></article>
          </div>

          {hasRows ? <section className="cvMessagesDraftBox">
            <span>Prepared reply</span>
            <p>{preparedReply}</p>
          </section> : <section className="cvMessagesDraftBox"><span>No reply prepared</span><p>{ownerRoute ? "This inbox is clear. Replies will appear when a message needs owner review." : "Messages will appear here when there is something for the owner to review."}</p></section>}

          {hasRows ? <OfficeTeamSafeControls area="messages" record={current} primary="Prepare reply" secondary="Prepare staff question" command="Prepare Command card" /> : <article className="cvSiteEmpty"><strong>Nothing to prepare</strong><p>{ownerRoute ? "No message needs owner approval right now." : "When messages arrive, Churvox can prepare replies for owner approval."}</p></article>}
        </article>
      </div>
    </section>
  );
}

function buildPreparedReply(row = []) {
  const title = row[1] || "this update";
  const status = String(row[2] || "review").toLowerCase();
  if (status.includes("staff") || status.includes("evidence") || status.includes("worker")) {
    return `Ask staff for the missing detail on “${title}” before the owner approves the final step.`;
  }
  if (status.includes("follow")) {
    return `A polite follow-up is ready for “${title}”. The owner can review the wording before it sends.`;
  }
  if (status.includes("reply") || status.includes("prepared")) {
    return `A reply is ready for “${title}”. The owner can approve, edit, or park it.`;
  }
  return `A Command decision is ready for “${title}”. The owner chooses the next step before anything changes.`;
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
