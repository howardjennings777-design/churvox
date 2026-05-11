import React from "react";
import "./operatorActionDrawer.css";

function safe(value, fallback = "Not available") {
  return value || fallback;
}

export default function OperatorActionDrawer({ action, onClose, onApprove, onReject, onReview }) {
  if (!action) return null;

  const sources = Array.isArray(action.source_records) ? action.source_records : [];

  return (
    <div className="opd-backdrop" onClick={onClose}>
      <section className="opd-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="opd-accent" />
        <header className="opd-header">
          <div className="opd-badges">
            <span className="opd-chip">{safe(action.action_type_label || action.label, "AI found")}</span>
            <span className="opd-chip muted">{safe(action.status_label, "Owner approval required")}</span>
            <span className="opd-chip confidence">Confidence: {safe(action.confidence_label, "Needs review")}</span>
            <span className="opd-chip mode">{safe(action.execute_mode_label, "Draft only")}</span>
          </div>
          <button className="opd-close" onClick={onClose}>×</button>
          <p>AI OPERATOR ACTION</p>
          <h3>{safe(action.title, "Review action")}</h3>
          <small>{safe(action.summary, "Review before approving.")}</small>
        </header>

        <div className="opd-body">
          <article><strong>Why AI recommends this</strong><small>{safe(action.reason, "AI found a workflow that may improve delivery speed or cashflow.")}</small></article>
          <article><strong>Risk / Guardrail</strong><small>{safe(action.risk, "No message sent yet. No MYOB write yet. Review before approving.")}</small></article>
          <article><strong>Source records</strong><small>{sources.length ? sources.join(" • ") : "No direct records attached. Review workspace context before approving."}</small></article>
          <article><strong>Recommended next step</strong><small>{safe(action.recommended_next_step, "Review/Edit before approval.")}</small></article>
        </div>

        <footer className="opd-footer">
          <button onClick={() => onReject?.(action)}>Reject</button>
          <button onClick={() => onReview?.(action)}>Review/Edit</button>
          <button className="secondary" onClick={() => window.location.assign(action.related_workspace || "/dashboard")}>Open workspace</button>
          <button className="primary" onClick={() => onApprove?.(action)}>Approve</button>
        </footer>
      </section>
    </div>
  );
}
