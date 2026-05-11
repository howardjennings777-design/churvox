import StatusBadge from "./StatusBadge";

export default function ActionCard({ action, onReview, onApprove }) {
  return (
    <article className="op-action-card">
      <div className="op-action-icon">{action.icon || "◆"}</div>

      <div>
        <span>{action.type || "AI ACTION"}</span>
        <strong>{action.title}</strong>
        <p>{action.summary}</p>
        <small>{action.guardrail || "Owner approval required before Churvox changes anything."}</small>
      </div>

      <aside>
        <StatusBadge value={action.status || "ready"} />
        <button type="button" onClick={() => onReview?.(action)}>Review / edit</button>
        <button type="button" onClick={() => onApprove?.(action)}>Approve</button>
      </aside>
    </article>
  );
}
