import StatusBadge from "./StatusBadge";

export default function ActionCard({ action, onReview, onApprove }) {
  const score = action.priority_score || action.worker_score || action.confidence || "";

  return (
    <article className="op-action-card">
      <div className="op-action-icon">{action.icon || "◆"}</div>

      <div>
        <span>{action.type || "AI ACTION"}</span>
        <strong>{action.title}</strong>
        <p>{action.summary}</p>
        <small>
          {action.guardrail || "AI has prepared this only. Owner approval is required before anything changes."}
        </small>
      </div>

      <aside>
        <StatusBadge value={action.status || "ready"} />
        {score ? <small>Priority {score}</small> : null}
        <button type="button" onClick={() => onReview?.(action)}>Review details</button>
        <button type="button" onClick={() => onApprove?.(action)}>Approve action</button>
      </aside>
    </article>
  );
}
