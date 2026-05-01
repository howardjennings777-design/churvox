export default function TradiePanel({ title, actions, children, className = '' }) {
  return (
    <section className={`tradie-panel ${className}`.trim()}>
      {(title || actions) && (
        <header className="tradie-panel__header">
          {title ? <h3>{title}</h3> : <span />}
          {actions ? <div>{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
