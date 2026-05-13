
import "./PublicSite.css";

const features = [
  ["AI Operator", "Handles the busywork"],
  ["You Approve", "Stay in control"],
  ["Everything Connected", "From quote to paid"],
  ["Time Back", "Focus on your business"],
];

const flow = [
  ["AI scans the business", "Jobs, crew, quotes, invoices and proof stay visible."],
  ["AI prepares the next move", "Churvox turns admin into clear owner approval cards."],
  ["Owner approves", "Edit, approve or reject without losing context."],
];

const operatorCards = [
  ["Assign Worker", "AI recommends James Carter for Job #1047.", "Review Assignment"],
  ["Invoice Reminder", "AI drafted a friendly reminder for Acme Plumbing.", "Review Message"],
  ["Draft Invoice Ready", "AI prepared a draft invoice for Job #1042.", "Review Invoice"],
];

function Nav() {
  return (
    <header className="cvx-nav cvx-vision-nav">
      <a className="cvx-brand" href="/">
        <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
        <div><strong>Churvox</strong><small>AI OPERATOR OS</small></div>
      </a>

      <nav>
        <a href="/">Home</a>
        <a href="/pricing">Pricing</a>
        <a href="/demo">Demo</a>
        <a href="/contact">Contact</a>
        <a href="/login">Sign in</a>
      </nav>

      <a className="cvx-nav-cta" href="/signup">Start free trial</a>
    </header>
  );
}

function MockDashboard() {
  return (
    <aside className="cvx-command-preview">
      <section className="op-workspace-head">
        <div>
          <p>SMART HUB</p>
          <h1>Today at a glance.</h1>
          <span>AI has prepared the admin. Review and approve.</span>
        </div>
      </section>

      <div className="vision-signals">
        <article className="vision-signal"><span>Revenue</span><strong>$126k</strong><small>month to date</small></article>
        <article className="vision-signal"><span>Jobs done</span><strong>28</strong><small>12% up</small></article>
        <article className="vision-signal"><span>Outstanding</span><strong>$43k</strong><small>needs follow-up</small></article>
        <article className="vision-signal"><span>Quotes</span><strong>17</strong><small>sent this month</small></article>
      </div>

      <section className="vision-panel">
        <header>
          <div>
            <p>AI OPERATOR</p>
            <h2>Approval queue</h2>
          </div>
        </header>

        <div className="vision-list">
          {operatorCards.map(([title, body, action]) => (
            <button key={title}>
              <strong>{title}</strong>
              <span>{body}</span>
              <small>{action}</small>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default function PublicLandingPage() {
  return (
    <main className="cvx-site cvx-public-vision">
      <Nav />

      <section className="cvx-hero cvx-vision-hero">
        <div className="cvx-vision-copy">
          <p className="cvx-kicker">CHURVOX AI OPERATOR OS</p>
          <h1>AI runs the admin.<span>You approve.</span></h1>
          <p className="cvx-lede">
            A cleaner command centre for trade and service businesses. Jobs, crew,
            quotes, invoices, proof and follow-ups stay in one calm owner-approved workspace.
          </p>

          <div className="cvx-actions">
            <a className="cvx-primary" href="/signup">Start free trial</a>
            <a className="cvx-secondary" href="/demo">Try live demo</a>
          </div>

          <div className="cvx-proofbar">
            {features.map(([title, body]) => (
              <span key={title}><strong>{title}</strong> · {body}</span>
            ))}
          </div>
        </div>

        <MockDashboard />
      </section>

      <section className="cvx-section cvx-vision-section">
        <div className="cvx-section-head">
          <p className="cvx-kicker">HOW IT WORKS</p>
          <h2>Built around one simple idea: AI prepares, owner approves.</h2>
          <p className="cvx-section-copy">
            Churvox removes the busywork without taking risky action behind your back.
          </p>
        </div>

        <div className="cvx-step-grid">
          {flow.map(([title, body], index) => (
            <article key={title}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <strong>{title}</strong>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cvx-final cvx-vision-final">
        <p className="cvx-kicker">READY TO SEE IT?</p>
        <h2>Open the demo or start your free trial.</h2>
        <div>
          <a className="cvx-primary" href="/demo">Try live demo</a>
          <a className="cvx-secondary" href="/signup">Start free trial</a>
        </div>
      </section>

      <footer className="cvx-footer cvx-vision-footer">
        <div><strong>Churvox</strong><span>AI command centre for trade and service businesses.</span></div>
        <nav><a href="/pricing">Pricing</a><a href="/demo">Demo</a><a href="/contact">Contact</a><a href="/login">Sign in</a></nav>
      </footer>
    </main>
  );
}
