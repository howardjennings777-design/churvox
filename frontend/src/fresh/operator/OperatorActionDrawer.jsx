import React, { useState } from "react";
import "./operatorActionDrawer.css";

function safe(value, fallback = "Not available") { return value || fallback; }

export default function OperatorActionDrawer({ action, onClose, onApprove, onReject, onReview, onOpenWorkspace }) {
  const [busy, setBusy] = useState(false);
  if (!action) return null;
  const sources = Array.isArray(action.source_records) ? action.source_records : [];
  const run = async (fn) => { if (busy || !fn) return; setBusy(true); try { await fn(action); } finally { setBusy(false); } };

  return <div className="opd-backdrop" onClick={onClose}><section className="opd-drawer" onClick={(e) => e.stopPropagation()}>
    <div className="opd-accent" />
    <header className="opd-header"><div className="opd-badges"><span className="opd-chip">{safe(action.type, "AI found")}</span><span className="opd-chip muted">{safe(action.status, "Owner approval required")}</span><span className="opd-chip confidence">Confidence: {safe(action.confidence_label, "Needs review")}</span><span className="opd-chip mode">{safe(action.execute_mode, "Draft only")}</span></div>
      <button className="opd-close" onClick={onClose}>×</button><p>AI OPERATOR ACTION</p><h3>{safe(action.title, "Review action")}</h3><small>{safe(action.summary, "Review before approving.")}</small></header>
    <div className="opd-body"><article><strong>Why AI recommends this</strong><small>{safe(action.reason)}</small></article><article><strong>Risk / Guardrail</strong><small>{safe(action.risk)}</small></article><article><strong>Source records</strong><small>{sources.length ? sources.join(" • ") : "No direct records attached."}</small></article><article><strong>Recommended next step</strong><small>{safe(action.recommended_next_step)}</small></article></div>
    <footer className="opd-footer"><button disabled={busy} onClick={() => run(onReject)}>Reject</button><button disabled={busy} onClick={() => run(onReview)}>Review/Edit</button><button className="secondary" disabled={busy} onClick={() => onOpenWorkspace?.(action.related_workspace || "/dashboard")}>Open workspace</button><button className="primary" disabled={busy} onClick={() => run(onApprove)}>{busy ? "Approving..." : "Approve"}</button></footer>
  </section></div>;
}
