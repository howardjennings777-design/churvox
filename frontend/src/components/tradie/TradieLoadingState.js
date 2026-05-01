export default function TradieLoadingState({ label = 'Loading…' }) {
  return (
    <div className="tradie-loading-state" role="status" aria-live="polite">
      <span className="tradie-loading-dot" />
      {label}
    </div>
  );
}
