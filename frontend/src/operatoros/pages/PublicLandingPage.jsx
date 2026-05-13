import "./PublicSite.css";

const features = [
  ["AI Work Queue", "AI prepares dispatch, invoice drafts, quote follow-ups and reminders for owner approval."],
  ["Smart Hub", "One command view for jobs, crew, clients, quotes, invoices, proof photos and cashflow."],
  ["Proof to Paid", "Completed job proof can become an invoice draft without the owner digging through notes."],
  ["Crew Dispatch", "Match workers by area, workload, availability and job type before assigning work."],
  ["Quotes + Invoices", "Create, review, follow up and keep customer admin moving from one place."],
  ["Owner Approval", "No risky customer message, invoice send, worker assignment or sync happens without approval."],
];

const flows = [
  ["01", "AI scans the business", "Jobs, crew, proof photos, quotes, invoices and unpaid work stay visible."],
  ["02", "AI prepares the next move", "Churvox turns messy admin into clear actions with the reason attached."],
  ["03", "Owner approves", "You stay in control while Churvox does the boring prep work."],
];

const trades = ["Lawn care", "Property maintenance", "Cleaning", "Landscaping", "Handyman", "Painting", "Plumbing", "Electrical", "Pest control", "Gardening"];

function Nav() {
  return (
    <header className="cvx-nav cvx-vision-nav">
      <a className="cvx-brand" href="/">
        <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
        <div><strong>CHURVOX</strong><small>AI OPERATOR OS</small></div>
      </a>
      <nav>
        <a href="/">Home</a>
        <a href="#how-it-works">How it works</a>
        <a href="#features">Features</a>
        <a href="/pricing">Pricing</a>
        <a href="/demo">Demo</a>
        <a href="/login">Sign in</a>
      </nav>
      <a className="cvx-nav-cta" href="/signup">Start free trial</a>
    </header>
  );
}

function MiniFeed({ title, meta, status }) {
  return (
    <article className="cvx-mini-feed">
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <b>{status}</b>
    </article>
  );
}

function ProductPreview() {
  return (
    <aside className="cvx-command-preview" aria-label="Churvox AI command centre preview">
      <div className="cvx-preview-grid" />
      <div className="cvx-preview-glow" />
      <div className="cvx-preview-orbit orbit-one" />
      <div className="cvx-preview-orbit orbit-two" />

      <div className="cvx-preview-core">
        <img src="/brand/churvox-holo-c.svg" alt="" />
        <strong>27</strong>
        <span>owner approvals prepared</span>
      </div>

      <div className="cvx-floating-chip chip-top"><small>AI OPERATOR</small><b>Live scan active</b></div>
      <div className="cvx-floating-chip chip-left"><small>DISPATCH</small><b>5 need crew</b></div>
      <div className="cvx-floating-chip chip-right"><small>CASHFLOW</small><b>$1,278 waiting</b></div>
    </aside>
  );
}

export default function PublicLandingPage() {
  return (
    <main className="cvx-site cvx-public-vision">
      <Nav />

      <section className="cvx-hero cvx-vision-hero">
        <div className="cvx-vision-copy">
          <div className="cvx-vision-pill"><img src="/brand/churvox-holo-c.svg" alt="" /><span>AI COMMAND CENTRE FOR TRADIES</span></div>
          <p className="cvx-kicker">CHURVOX AI OPERATOR OS</p>
          <h1>
            AI runs the admin layer.
            <span>You approve the work.</span>
          </h1>
          <p className="cvx-lede">
            Churvox helps trade and service owners run jobs, crews, quotes, invoices, proof photos and follow-ups from one cinematic command centre. The AI prepares the admin. The owner stays in control.
          </p>
          <div className="cvx-actions">
            <a className="cvx-primary" href="/signup">Start free trial</a>
            <a className="cvx-secondary" href="/demo">Try live demo</a>
          </div>
          <div className="cvx-proofbar">
            <span>Approval-first AI</span>
            <span>Built for mobile crews</span>
            <span>No auto-send without owner approval</span>
          </div>
        </div>

        <ProductPreview />
      </section>

      <section className="cvx-vision-strip">
        <MiniFeed title="Invoice draft" meta="Completed job proof checked" status="Ready" />
        <MiniFeed title="Worker match" meta="Area and workload scanned" status="Match" />
        <MiniFeed title="Quote recovery" meta="Follow-up can be drafted" status="Draft" />
        <MiniFeed title="Cashflow" meta="Unpaid invoices monitored" status="Watch" />
      </section>

      <section className="cvx-section cvx-vision-section" id="how-it-works">
        <p className="cvx-kicker">HOW IT WORKS</p>
        <h2>Churvox turns field-service chaos into owner-approved next moves.</h2>
        <div className="cvx-step-grid">
          {flows.map(([number, title, body]) => (
            <article key={title}>
              <b>{number}</b>
              <strong>{title}</strong>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cvx-section cvx-vision-section" id="features">
        <p className="cvx-kicker">WHAT IT RUNS</p>
        <h2>The daily AI control room for service-business owners.</h2>
        <p className="cvx-section-copy">Churvox is not just another job list. It watches the business, prepares the admin, explains the next move, and waits for approval.</p>
        <div className="cvx-feature-grid">
          {features.map(([title, body]) => (
            <article key={title}>
              <strong>{title}</strong>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cvx-section cvx-vision-section" id="trades">
        <p className="cvx-kicker">BUILT FOR FIELD SERVICE</p>
        <h2>For owners running crews, sites, customers and proof-based billing.</h2>
        <div className="cvx-cloud">{trades.map((trade) => <span key={trade}>{trade}</span>)}</div>
      </section>

      <section className="cvx-final cvx-vision-final">
        <p className="cvx-kicker">READY TO SEE IT WORK?</p>
        <h2>Open the demo or start your free trial.</h2>
        <div><a className="cvx-primary" href="/demo">Try live demo</a><a className="cvx-secondary" href="/signup">Start free trial</a></div>
      </section>

      <footer className="cvx-footer cvx-vision-footer">
        <div><strong>CHURVOX</strong><span>AI command centre for trade and service businesses.</span></div>
        <nav><a href="/pricing">Pricing</a><a href="/demo">Try demo</a><a href="/contact">Email us</a><a href="/login">Sign in</a></nav>
      </footer>
    </main>
  );
}
