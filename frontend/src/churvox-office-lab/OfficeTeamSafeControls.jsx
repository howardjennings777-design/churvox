import React, { useMemo, useState } from "react";
import "./OfficeTeamSafeControls.css";
import { createOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";

export default function OfficeTeamSafeControls({ area = "office", record = [], primary = "Prepare", secondary = "Review", command = "Send to Command" }) {
  const [trail, setTrail] = useState([]);
  const recordTitle = record?.[1] || record?.[0] || "selected record";
  const safeActions = useMemo(() => [
    { label: primary, tone: "primary", type: "local", result: `${primary} prepared locally for ${recordTitle}. No live record changed.` },
    { label: secondary, tone: "", type: "local", result: `${secondary} opened as a safe review note for ${recordTitle}.` },
    { label: command, tone: "", type: "command", result: `${command} created a prepared-only Command item for ${recordTitle}. Owner approval still required.` },
  ], [primary, secondary, command, recordTitle]);

  function recordAction(action) {
    if (action.type === "command") createOfficeTeamLocalCommand({ area, record, action: action.label });
    const entry = {
      id: `${Date.now()}-${action.label}`,
      label: action.label,
      text: action.result,
    };
    setTrail((current) => [entry, ...current].slice(0, 3));
  }

  return (
    <section className="cvSafeControls" aria-label={`${area} safe controls`}>
      <div className="cvSafeControlButtons">
        {safeActions.map((action) => (
          <button key={action.label} className={action.tone} type="button" onClick={() => recordAction(action)}>
            {action.label}
          </button>
        ))}
      </div>
      <small>Prepared-only lab controls · no send, no sync, no charge, no record change.</small>
      {trail.length ? (
        <div className="cvSafeTrail">
          {trail.map((item) => <p key={item.id}>{item.text}</p>)}
        </div>
      ) : null}
    </section>
  );
}
