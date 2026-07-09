import React, { useMemo, useState } from "react";
import "./OfficeTeamSafeControls.css";
import { createBackendCommandSlip } from "./OfficeTeamCommandApi";
import { createOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";

export default function OfficeTeamSafeControls({ area = "office", record = [], primary = "Prepare", secondary = "Review", command = "Send to Command" }) {
  const [trail, setTrail] = useState([]);
  const [busy, setBusy] = useState(false);
  const recordTitle = record?.[1] || record?.[0] || "selected record";
  const ownerRoute = isOwnerRoute();
  const safeActions = useMemo(() => [
    { label: primary, tone: "primary", type: "local", result: `${primary} prepared locally for ${recordTitle}. No live record changed.` },
    { label: secondary, tone: "", type: "local", result: `${secondary} opened as a safe review note for ${recordTitle}.` },
    { label: command, tone: "", type: "command", result: `${command} created a prepared-only Command item for ${recordTitle}. Owner approval still required.` },
  ], [primary, secondary, command, recordTitle]);

  async function recordAction(action) {
    if (busy) return;
    if (action.type !== "command") {
      addTrail(action.label, action.result);
      return;
    }

    setBusy(true);
    try {
      if (ownerRoute) {
        await createBackendCommandSlip({ area, record, action: action.label });
        addTrail(action.label, `${action.label} created a backend Command slip for ${recordTitle}. Nothing was sent, synced, charged or changed.`);
      } else {
        createOfficeTeamLocalCommand({ area, record, action: action.label });
        addTrail(action.label, action.result);
      }
    } catch (error) {
      addTrail(action.label, `Could not create backend Command slip. Nothing was sent, synced, charged or changed. ${error?.message || ""}`.trim());
    } finally {
      setBusy(false);
    }
  }

  function addTrail(label, text) {
    const entry = {
      id: `${Date.now()}-${label}`,
      label,
      text,
    };
    setTrail((current) => [entry, ...current].slice(0, 3));
  }

  return (
    <section className="cvSafeControls" aria-label={`${area} safe controls`}>
      <div className="cvSafeControlButtons">
        {safeActions.map((action) => (
          <button key={action.label} className={action.tone} type="button" disabled={busy} onClick={() => recordAction(action)}>
            {busy && action.type === "command" ? "Preparing…" : action.label}
          </button>
        ))}
      </div>
      <small>{ownerRoute ? "Owner controls · backend Command slip · no send, no sync, no charge, no record change." : "Prepared-only lab controls · no send, no sync, no charge, no record change."}</small>
      {trail.length ? (
        <div className="cvSafeTrail">
          {trail.map((item) => <p key={item.id}>{item.text}</p>)}
        </div>
      ) : null}
    </section>
  );
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
