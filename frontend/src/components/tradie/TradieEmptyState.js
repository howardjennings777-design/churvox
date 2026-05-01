export default function TradieEmptyState({
  message = 'We couldn’t load this section.',
  hint = 'Try refreshing or check your connection.',
  actions,
}) {
  return (
    <div className="tradie-empty-state">
      <strong>{message}</strong>
      <p>{hint}</p>
      {actions ? <div className="tradie-empty-state__actions">{actions}</div> : null}
    </div>
  );
}
