export default function DetailDrawer({ open, title, eyebrow, children, footer, onClose }) {
  if (!open) return null;

  return (
    <div className="op-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="op-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>{eyebrow || "DETAIL"}</span>
            <h2>{title || "Review details"}</h2>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <div className="op-drawer-body">{children}</div>

        {footer ? <footer>{footer}</footer> : null}
      </aside>
    </div>
  );
}
