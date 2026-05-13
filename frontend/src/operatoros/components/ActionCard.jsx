import StatusBadge from "./StatusBadge";

export default function ActionCard({ action, onReview, onApprove, busy = false }) {
  const score = action.priority_score;
  const confidence = action.confidence;
  const category = action.category || action.type || action.action_type || "AI ACTION";
  const actionTitle = action.title || "AI prepared action";
  const summary = action.summary || action.reason || "Review this AI-prepared action before anything changes.";

  return (
    <article className={`op-action-card ${busy ? "is-busy" : ""}`}>
      <div className="op-action-icon">{action.icon || "◆"}</div>

      <div>
        <span>{String(category).replaceAll("_", " ")}</span>
        <strong>{actionTitle}</strong>
        <p>{summary}</p>
        <small>
          {action.guardrail || action.exact_changes || "AI prepared this action only. Churvox waits for owner approval before anything changes."}
        </small>
      </div>

      <aside>
        <StatusBadge value={action.status || "ready"} />
        {score ? <small>Priority score {score}</small> : confidence ? <small>Confidence {confidence}</small> : null}
        <button type="button" disabled={busy} onClick={() => onReview?.(action)}>
          Review details
        </button>
        <button type="button" className="primary" disabled={busy} onClick={() => onApprove?.(action)}>
          {busy ? "Approving..." : "Approve action"}
        </button>
      </aside>
    </article>
  );
}
