const features = [
  ["AI Operator", "Handles the busywork"],
  ["You Approve", "Stay in control"],
  ["Connected", "From quote to paid"],
  ["Time Back", "Focus on your business"],
];

export default function PublicLandingPage() {
  return (
    <main className="chx-hub" style={{ maxWidth: 1220, margin: "0 auto", padding: 24 }}>
      <section className="chx-hero">
        <div className="chx-hero-copy">
          <p className="chx-kicker">CHURVOX AI OPERATOR OS</p>
          <h1>
            AI runs the admin.
            <span>You approve.</span>
          </h1>
          <strong>
            A cleaner command centre for trade and service businesses.
            Jobs, crew, quotes, invoices, proof and follow-ups stay in one calm owner-approved workspace.
          </strong>

          <div className="chx-actions">
            <a className="chx-btn primary" href="/signup">Start free trial</a>
            <a className="chx-btn" href="/demo">Try live demo</a>
            <a className="chx-btn" href="/login">Sign in</a>
          </div>

          <div className="chx-stats">
            {features.map(([title, body]) => (
              <article className="chx-stat" key={title}>
                <span>{title}</span>
                <strong>✓</strong>
                <small>{body}</small>
              </article>
            ))}
          </div>
        </div>

        <aside className="chx-preview">
          <p className="chx-kicker">PRODUCT PREVIEW</p>
          <h2>Smart Hub</h2>
          <span>AI-prepared approval cards, clean run sheet, dispatch and proof-to-paid.</span>

          <div className="chx-card-list">
            <article className="chx-card"><span>AI OPERATOR</span><strong>Assign worker</strong><small>Review James Carter for Job #1047.</small></article>
            <article className="chx-card"><span>INVOICE</span><strong>Draft ready</strong><small>$2,850 prepared for owner approval.</small></article>
            <article className="chx-card"><span>QUOTE</span><strong>Follow-up due</strong><small>AI drafted a friendly message.</small></article>
          </div>
        </aside>
      </section>
    </main>
  );
}
