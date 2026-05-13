
import "./PublicSite.css";

const features = [
  ["AI Operator", "Handles the busywork"],
  ["You Approve", "Stay in control"],
  ["Connected", "From quote to paid"],
  ["Time Back", "Focus on your business"],
];

function Nav() {
  return (
    <header className="cvx-nav">
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

function ProductMockup() {
  return (
    <aside className="cvx-command-preview">
      <div className="cvx-preview-top">
        <div className="cvx-preview-side">
          {["Smart Hub", "AI Work Queue", "Jobs", "Clients", "Quotes", "Invoices", "Proof-to-Paid", "Team", "Payroll", "Settings"].map((item, index) => (
            <button key={item} className={index === 0 ? "active" : ""}>{item}</button>
          ))}
        </div>

        <div className="cvx-preview-main">
          <section>
            <p className="cvx-kicker">SMART HUB</p>
            <h2>Today at a glance.</h2>
            <span>Your business at a glance.</span>
          </section>

          <div className="cvx-preview-kpis">
            <article><small>Revenue</small><strong>$126k</strong><span>↑ 18%</span></article>
            <article><small>Jobs done</small><strong>28</strong><span>↑ 12%</span></article>
            <article><small>Outstanding</small><strong>$43k</strong><span>needs follow-up</span></article>
            <article><small>Quotes</small><strong>17</strong><span>sent</span></article>
          </div>

          <section>
            <p className="cvx-kicker">AI OPERATOR</p>
            <div className="cvx-preview-ai">
              <article><strong>Assign worker</strong><span>James Carter to Job #1047</span><button>Review</button></article>
              <article><strong>Invoice reminder</strong><span>Friendly reminder drafted</span><button>Review</button></article>
              <article><strong>Draft invoice</strong><span>$2,850 ready</span><button>Review</button></article>
            </div>
          </section>

          <div className="cvx-preview-list">
            <strong>Today / Run Sheet</strong>
            <span>8:00am · Acme Plumbing · In Progress</span>
            <span>10:30am · Greenview Electrical · Scheduled</span>
            <span>1:00pm · Blue Lagoon Pools · Scheduled</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function PublicLandingPage() {
  return (
    <main className="cvx-site">
      <Nav />

      <section className="cvx-hero">
        <div className="cvx-hero-copy">
          <p className="cvx-kicker">CHURVOX AI OPERATOR OS</p>
          <h1>AI runs the admin.<span>You approve.</span></h1>
          <p>
            A cleaner command centre for trade and service businesses.
            Jobs, crew, quotes, invoices, proof and follow-ups stay in one calm owner-approved workspace.
          </p>

          <div className="cvx-actions">
            <a className="cvx-primary" href="/signup">Start free trial</a>
            <a className="cvx-secondary" href="/demo">Try live demo</a>
          </div>

          <div className="cvx-proofbar">
            {features.map(([title, body], index) => (
              <article className="cvx-mini-card" key={title}>
                <span>{index + 1}</span>
                <strong>{title}</strong>
                <small>{body}</small>
              </article>
            ))}
          </div>
        </div>

        <ProductMockup />
      </section>

      <section className="cvx-section">
        <p className="cvx-kicker">HOW IT WORKS</p>
        <h2>AI prepares the next move. The owner stays in control.</h2>
        <p>Churvox does not give you another busy dashboard. It turns admin into reviewable actions.</p>
      </section>

      <section className="cvx-final">
        <p className="cvx-kicker">READY TO SEE IT?</p>
        <h2>Open the demo or start your free trial.</h2>
        <div className="cvx-actions">
          <a className="cvx-primary" href="/demo">Try live demo</a>
          <a className="cvx-secondary" href="/signup">Start free trial</a>
        </div>
      </section>

      <footer className="cvx-footer">
        <strong>Churvox</strong>
        <span>AI command centre for trade and service businesses.</span>
      </footer>
    </main>
  );
}
