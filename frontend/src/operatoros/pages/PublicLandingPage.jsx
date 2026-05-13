import "./PublicLandingPage.css";

const painPoints = [
  ["Jobs", "Unassigned work is surfaced before the day gets away."],
  ["Crew", "Churvox prepares the best worker match by area, workload and job type."],
  ["Proof", "Photos, notes and completed work move into review."],
  ["Money", "Finished jobs are prepared for invoice action."],
];

const operatorSteps = [
  ["1", "AI watches the business", "Jobs, crew, clients, quotes, invoices, proof photos and follow-ups stay visible."],
  ["2", "AI prepares the next move", "Dispatch, invoice drafts, reminders and proof-to-paid actions are prepared for review."],
  ["3", "Owner approves", "Nothing important is sent, assigned, charged, deleted or synced without approval."],
];

const features = [
  "Smart Hub",
  "AI Work Queue",
  "Jobs + dispatch",
  "Worker proof photos",
  "Quotes",
  "Invoices",
  "Proof-to-paid",
  "Payroll handoff",
  "Client history",
  "CSV import",
];

const trades = ["Lawn care", "Property maintenance", "Cleaning", "Landscaping", "Handyman", "Painting", "Plumbing", "Electrical", "Pest control", "Gardening"];

export default function PublicLandingPage() {
  return (
    <main className="cvx-home">
      <header className="cvx-nav">
        <a className="cvx-brand" href="/" aria-label="Churvox home">
          <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
          <div><strong>CHURVOX</strong><small>OPERATOR OS</small></div>
        </a>
        <nav aria-label="Public navigation">
          <a href="/">Home</a>
          <a href="/how-it-works">How it works</a>
          <a href="/features">Features</a>
          <a href="/pricing">Pricing</a>
          <a href="/demo">Try live demo</a>
          <a href="/contact">Email us</a>
          <a href="/login">Sign in</a>
        </nav>
      </header>

      <section className="cvx-hero" id="home">
        <div className="cvx-hero-copy">
          <p className="cvx-kicker">PREMIUM TRADE INTELLIGENCE</p>
          <h1>AI prepares the admin.<span>You approve the work.</span></h1>
          <p className="cvx-lede">Churvox gives trade and service owners one calm command centre for jobs, crew, clients, quotes, invoices, proof photos and follow-ups. The AI finds what needs doing, prepares the next move, and waits for owner approval.</p>
          <div className="cvx-actions">
            <a className="cvx-primary" href="/signup">Start free trial</a>
            <a className="cvx-secondary" href="/demo">Try live demo</a>
          </div>
          <div className="cvx-proofbar">
            <span>Approval-first AI</span>
            <span>Built for mobile crews</span>
            <span>No auto-send without approval</span>
          </div>
        </div>

        <aside className="cvx-operator-card" aria-label="Churvox AI Operator preview">
          <div className="cvx-orb-stage">
            <div className="cvx-radar" />
            <div className="cvx-orb"><img src="/brand/churvox-holo-c.svg" alt="Churvox" /></div>
          </div>
          <section className="cvx-live-card">
            <small>LIVE AI OPERATOR</small>
            <h2>Your next business moves are ready.</h2>
            <p>No digging through messages, worker notes, invoices or proof updates.</p>
          </section>
          <div className="cvx-metrics">
            <article><strong>3</strong><span>jobs need crew</span></article>
            <article><strong>5</strong><span>invoice actions</span></article>
            <article><strong>2</strong><span>follow-ups ready</span></article>
          </div>
          <section className="cvx-nextmove">
            <small>NEXT BEST MOVE</small>
            <h3>Assign Sam to 14 King Street</h3>
            <p>Best fit by area, workload and job type. Churvox only applies the move after owner approval.</p>
            <button type="button">Approve move</button>
          </section>
        </aside>
      </section>

      <section className="cvx-pain-strip" id="how-it-works">
        {painPoints.map(([title, text]) => (
          <article key={title}><strong>{title}</strong><span>{text}</span></article>
        ))}
      </section>

      <section className="cvx-section cvx-steps">
        <div className="cvx-section-head">
          <p className="cvx-kicker">HOW IT WORKS</p>
          <h2>One simple approval flow from field work to admin done.</h2>
        </div>
        <div className="cvx-step-grid">
          {operatorSteps.map(([number, title, text]) => (
            <article key={title}>
              <b>{number}</b>
              <strong>{title}</strong>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cvx-section" id="features">
        <div className="cvx-section-head">
          <p className="cvx-kicker">WHAT CHURVOX RUNS</p>
          <h2>The daily control room for field-service admin.</h2>
          <span>Churvox prepares real business actions, explains why they matter, and gives owners a clean approval queue.</span>
        </div>
        <div className="cvx-cloud">{features.map((feature) => <span key={feature}>{feature}</span>)}</div>
      </section>

      <section className="cvx-section cvx-pricing-preview" id="pricing">
        <div className="cvx-section-head">
          <p className="cvx-kicker">PRICING</p>
          <h2>Built around the AI Operator, not just job lists.</h2>
        </div>
        <div className="cvx-price-grid">
          <article><strong>Solo</strong><b>$39/mo</b><span>Jobs, clients, quotes, invoices and Smart Hub basics.</span></article>
          <article className="featured"><strong>Pro</strong><b>$159/mo</b><span>Full AI Operator, approval queue, proof-to-paid and payroll handoff.</span></article>
          <article><strong>Enterprise</strong><b>$299/mo</b><span>MYOB included, advanced roles, priority setup and higher limits.</span></article>
        </div>
        <a className="cvx-primary" href="/pricing">View full pricing</a>
      </section>

      <section className="cvx-section" id="trades">
        <div className="cvx-section-head">
          <p className="cvx-kicker">BUILT FOR FIELD SERVICE</p>
          <h2>For owners running crews, sites, customers and proof-based billing.</h2>
        </div>
        <div className="cvx-cloud">{trades.map((trade) => <span key={trade}>{trade}</span>)}</div>
      </section>

      <section className="cvx-section cvx-trust">
        <div>
          <p className="cvx-kicker">OWNER CONTROL</p>
          <h2>AI prepares the work. You stay in control.</h2>
        </div>
        <ul>
          <li>AI prepares actions before anything important happens.</li>
          <li>Owner approval is required for sending, assigning, charging or syncing.</li>
          <li>Each business keeps its jobs, crew, clients and billing separate.</li>
          <li>Workers stay focused on their assigned jobs and proof updates.</li>
        </ul>
      </section>

      <section className="cvx-final">
        <p className="cvx-kicker">READY TO SEE IT WORK?</p>
        <h2>Try the live demo, then start your free trial.</h2>
        <div>
          <a className="cvx-primary" href="/demo">Try live demo</a>
          <a className="cvx-secondary" href="/signup">Start free trial</a>
        </div>
      </section>

      <footer className="cvx-footer">
        <div><strong>CHURVOX</strong><span>AI command centre for trade and service businesses.</span></div>
        <nav>
          <a href="/pricing">Pricing</a>
          <a href="/demo">Try live demo</a>
          <a href="/contact">Email us</a>
          <a href="/login">Sign in</a>
          <a href="mailto:hello@churvox.com">hello@churvox.com</a>
        </nav>
      </footer>
    </main>
  );
}
