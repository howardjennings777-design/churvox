import StatusBadge from "./StatusBadge";

export default function ActionCard({ action, onReview, onApprove }) {
  const score = action.priority_score;
  const confidence = action.confidence;

  return (
    <article className="op-action-card">
      <div className="op-action-icon">{action.icon || "◆"}</div>

      <div>
        <span>{action.type || "AI ACTION"}</span>
        <strong>{action.title}</strong>
        <p>{action.summary}</p>
        <small>
          {action.guardrail || "AI prepared this action only. Churvox waits for owner approval before anything changes."}
        </small>
      </div>

      <aside>
        <StatusBadge value={action.status || "ready"} />
        {score ? <small>Priority score {score}</small> : confidence ? <small>Confidence {confidence}</small> : null}
        <button type="button" onClick={() => onReview?.(action)}>Review details</button>
        <button type="button" onClick={() => onApprove?.(action)}>Approve action</button>
      </aside>
    </article>
  );
}
