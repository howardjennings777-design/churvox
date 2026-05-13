
import "./PublicLandingPage.css";

const wins = [
  ["AI finds the work", "Unassigned jobs, completed jobs, unpaid invoices and quote follow-ups are surfaced before they become problems."],
  ["AI prepares the admin", "Worker assignments, invoice drafts, customer reminders and proof review are prepared for owner approval."],
  ["Owner stays in control", "Nothing important is sent, assigned, charged, deleted or synced without approval."],
];

const problems = [
  ["Stop chasing workers", "Know who has what job, what is completed, what needs proof and what still needs dispatch."],
  ["Stop missing invoices", "Completed work moves toward invoice review instead of sitting forgotten."],
  ["Stop losing follow-ups", "Quote and payment reminders are prepared before warm leads go cold."],
  ["Stop running from ten places", "Jobs, clients, crew, quotes, invoices, proof and payroll handoff live together."],
];

const previews = [
  ["Smart Hub", "Daily command centre"],
  ["AI Work Queue", "Prepared actions"],
  ["Worker Proof", "Photos and notes"],
  ["Proof-to-Paid", "Invoice-ready review"],
];

const features = ["Jobs + dispatch", "Worker app", "Proof photos", "Quotes", "Invoices", "Payroll handoff", "MYOB-ready workflow", "AI approval queue", "Client history", "CSV import"];
const trades = ["Lawn care", "Property maintenance", "Cleaning", "Landscaping", "Handyman", "Painting", "Plumbing", "Electrical", "Pest control", "Gardening"];

export default function PublicLandingPage() {
  return (
    <main className="chx-public">
      <section className="chx-hero">
        <header className="chx-nav">
          <a className="chx-brand" href="/">
            <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
            <div><strong>CHURVOX</strong><small>AI TRADE OPERATOR</small></div>
          </a>
          <nav>
            <a href="/">Home</a>
            <a href="/how-it-works">How it works</a>
            <a href="/features">Features</a>
            <a href="/pricing">Pricing</a>
            <a href="/demo">Try live demo</a>
            <a href="/contact">Email us</a>
            <a href="/login">Sign in</a>
          </nav>
        </header>

        <div className="chx-hero-grid">
          <section className="chx-copy">
            <p>AI COMMAND CENTRE FOR TRADE & SERVICE OWNERS</p>
            <h1>Run jobs, crew and admin<span>from one calm place.</span></h1>
            <h2>Churvox watches jobs, workers, clients, quotes, invoices, proof photos, reminders and payroll handoff — then prepares the next move so the owner only approves what matters.</h2>
            <div className="chx-actions">
              <a className="chx-primary" href="/signup">Start free trial</a>
              <a className="chx-secondary" href="/demo">Try live demo</a>
            </div>
            <div className="chx-wins">
              {wins.map(([title, text]) => <article key={title}><strong>{title}</strong><span>{text}</span></article>)}
            </div>
          </section>

          <aside className="chx-operator">
            <div className="chx-orb-wrap"><div className="chx-radar" /><div className="chx-orb"><img src="/brand/churvox-holo-c.svg" alt="Churvox" /></div></div>
            <div className="chx-operator-card">
              <small>LIVE AI OPERATOR</small>
              <strong>Your next business moves are ready.</strong>
              <span>No digging through messages, notes, invoices or worker updates.</span>
            </div>
            <div className="chx-stats">
              <div><b>3</b><span>jobs need crew</span></div>
              <div><b>5</b><span>invoice actions</span></div>
              <div><b>2</b><span>follow-ups ready</span></div>
            </div>
            <div className="chx-next">
              <small>NEXT BEST MOVE</small>
              <strong>Assign Sam to 14 King Street</strong>
              <p>Best fit by area, workload and job type. Churvox only applies this after owner approval.</p>
              <button type="button">Approve move</button>
            </div>
          </aside>
        </div>
      </section>

      <section className="chx-problems" id="how-it-works">
        {problems.map(([title, text]) => <article key={title}><strong>{title}</strong><span>{text}</span></article>)}
      </section>

      <section className="chx-preview" id="features">
        <div><p>PRODUCT PREVIEW</p><h2>What owners see when Churvox is running the admin.</h2><span>One command centre instead of chasing jobs, workers, invoices, texts and spreadsheets.</span></div>
        <div className="chx-preview-grid">
          {previews.map(([title, text]) => <article key={title}><strong>{title}</strong><span>{text}</span></article>)}
        </div>
      </section>

      <section className="chx-features">
        <div><p>WHAT CHURVOX RUNS</p><h2>The daily admin system your trade business has been missing.</h2><span>Churvox prepares real admin actions, explains why they matter, and gives owners a simple approval queue.</span></div>
        <div className="chx-cloud">{features.map((feature) => <span key={feature}>{feature}</span>)}</div>
      </section>

      <section className="chx-pricing" id="pricing">
        <p>PRICING</p><h2>Serious pricing for a serious AI Operator engine.</h2>
        <div>
          <article><strong>Solo</strong><b>$39/mo</b><span>Jobs, clients, quotes, invoices and basic Smart Hub.</span></article>
          <article className="hot"><strong>Pro</strong><b>$159/mo</b><span>Full AI Operator, approval queue, proof-to-paid and payroll handoff.</span></article>
          <article><strong>Enterprise</strong><b>$299/mo</b><span>MYOB included, advanced roles, priority setup and higher limits.</span></article>
        </div>
        <a href="/pricing">View full pricing</a>
      </section>

      <section className="chx-trades" id="trades">
        <div><p>BUILT FOR FIELD SERVICE</p><h2>For owners running crews, jobs, sites, customers and proof-based billing.</h2><span>Perfect for businesses where work happens in the field and the owner needs proof, progress, invoice readiness and follow-ups without chasing everyone all day.</span></div>
        <div className="chx-cloud">{trades.map((trade) => <span key={trade}>{trade}</span>)}</div>
      </section>

      <section className="chx-trust">
        <div><p>TRUST + CONTROL</p><h2>Approval-first AI, built for business control.</h2></div>
        <ul>
          <li>AI prepares work, but the owner approves important actions.</li>
          <li>Business data stays separated between accounts.</li>
          <li>MYOB wording remains MYOB-ready until official approval.</li>
          <li>SMS credits are separate so message costs stay controlled.</li>
          <li>Privacy, Terms and security pages should be connected before paid public launch.</li>
        </ul>
      </section>

      <section className="chx-final">
        <p>READY TO STOP CHASING ADMIN?</p><h2>Try the Churvox demo, then start your free trial.</h2>
        <div><a className="chx-primary" href="/demo">Try live demo</a><a className="chx-secondary" href="/signup">Start free trial</a></div>
      </section>

      <footer className="chx-footer">
        <div><strong>CHURVOX</strong><span>AI command centre for trade and service businesses.</span></div>
        <nav><a href="/pricing">Pricing</a><a href="/demo">Try live demo</a><a href="/contact">Email us</a><a href="/login">Sign in</a><a href="mailto:hello@churvox.com">hello@churvox.com</a></nav>
      </footer>
    </main>
  );
}
