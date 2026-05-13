import "./PublicLandingPage.css";

const wins = [
  ["AI finds the next move", "Unassigned jobs, overdue invoices, quote follow-ups and completed jobs are surfaced before they become problems."],
  ["Owner approves first", "Churvox prepares the admin, but nothing important is sent, assigned, charged or synced without approval."],
  ["Field proof becomes billing", "Worker notes, photos and completion updates flow into proof-to-paid review instead of being lost in texts."],
];

const pain = [
  ["Stop chasing workers", "Know who has what job, what is complete, and what still needs dispatch."],
  ["Stop missing invoices", "Completed work gets pushed toward invoice review while it is still fresh."],
  ["Stop losing follow-ups", "Quotes and payment reminders are prepared before warm leads go cold."],
  ["Stop running from ten places", "Jobs, clients, crew, quotes, invoices, proof and payroll handoff live together."],
];

const preview = [
  ["Smart Hub", "Daily command centre"],
  ["AI Work Queue", "Approve prepared actions"],
  ["Worker Proof", "Photos, notes and completion"],
  ["Proof-to-Paid", "Invoice-ready review"],
];

const features = [
  "Jobs + dispatch",
  "Worker app",
  "Proof photos",
  "Quotes",
  "Invoices",
  "Payroll handoff",
  "MYOB-ready workflow",
  "AI approval queue",
];

export default function PublicLandingPage() {
  return (
    <main className="lpv2">
      <section className="lpv2-hero">
        <header className="lpv2-nav">
          <a className="lpv2-brand" href="/">
            <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
            <div>
              <strong>CHURVOX</strong>
              <small>AI TRADE OPERATOR</small>
            </div>
          </a>

          <nav>
            <a href="/how-it-works">How it works</a>
            <a href="/features">Features</a>
            <a href="/pricing">Pricing</a>
            <a href="/demo">Book demo</a>
            <a href="/login">Sign in</a>
          </nav>
        </header>

        <div className="lpv2-stage">
          <section className="lpv2-copy">
            <p>AI COMMAND CENTRE FOR TRADE & SERVICE OWNERS</p>
            <h1>
              Run jobs, crew and admin
              <span>from one calm place.</span>
            </h1>
            <h2>
              Churvox watches your jobs, workers, clients, quotes, invoices, proof photos,
              reminders and payroll handoff — then prepares the next move so you only approve what matters.
            </h2>

            <div className="lpv2-actions">
              <a className="lpv2-primary" href="/signup">Start free trial</a>
              <a className="lpv2-secondary" href="/demo">Book a demo</a>
            </div>

            <div className="lpv2-wins">
              {wins.map(([title, text]) => (
                <article key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </article>
              ))}
            </div>
          </section>

          <aside className="lpv2-operator">
            <div className="lpv2-orb-wrap">
              <div className="lpv2-radar" />
              <div className="lpv2-orb">
                <img src="/brand/churvox-holo-c.svg" alt="Churvox" />
              </div>
            </div>

            <div className="lpv2-operator-head">
              <small>LIVE AI OPERATOR</small>
              <strong>Your next business moves are ready.</strong>
              <span>No digging through messages, notes, invoices or worker updates.</span>
            </div>

            <div className="lpv2-stats">
              <div><b>3</b><span>jobs need crew</span></div>
              <div><b>5</b><span>invoice actions</span></div>
              <div><b>2</b><span>follow-ups ready</span></div>
            </div>

            <div className="lpv2-next">
              <small>NEXT BEST MOVE</small>
              <strong>Assign Sam to 14 King Street</strong>
              <p>Best fit by area, workload and job type. Churvox only applies this after owner approval.</p>
              <button type="button">Approve move</button>
            </div>
          </aside>
        </div>
      </section>

      <section className="lpv2-pain" id="how-it-works">
        {pain.map(([title, text]) => (
          <article key={title}>
            <strong>{title}</strong>
            <span>{text}</span>
          </article>
        ))}
      </section>

      <section className="lpv2-preview" id="features">
        <div>
          <p>PRODUCT PREVIEW</p>
          <h2>What owners see when Churvox is running the admin.</h2>
          <span>One command centre instead of chasing jobs, workers, invoices, texts and spreadsheets.</span>
        </div>

        <div className="lpv2-preview-grid">
          {preview.map(([title, text]) => (
            <article key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="lpv2-features">
        <div>
          <p>WHAT CHURVOX RUNS</p>
          <h2>The daily admin system your trade business has been missing.</h2>
          <span>Churvox prepares real admin actions, explains why they matter, and gives owners a simple approval queue.</span>
        </div>

        <div className="lpv2-feature-cloud">
          {features.map((feature) => <span key={feature}>{feature}</span>)}
        </div>
      </section>

      <section className="lpv2-pricing" id="pricing">
        <p>PRICING</p>
        <h2>Serious pricing for a serious AI Operator engine.</h2>
        <div>
          <article><strong>Solo</strong><b>$39/mo</b><span>Jobs, clients, quotes, invoices and basic Smart Hub.</span></article>
          <article className="hot"><strong>Pro</strong><b>$159/mo</b><span>Full AI Operator, approval queue, proof-to-paid and payroll handoff.</span></article>
          <article><strong>Enterprise</strong><b>$299/mo</b><span>MYOB included, advanced roles, priority setup and higher limits.</span></article>
        </div>
        <a href="/pricing">View full pricing</a>
      </section>

      <footer className="lpv2-footer">
        <div>
          <strong>CHURVOX</strong>
          <span>AI command centre for trade and service businesses.</span>
        </div>
        <nav>
          <a href="/pricing">Pricing</a>
          <a href="/demo">Book demo</a>
          <a href="/login">Sign in</a>
          <a href="mailto:hello@churvox.com">hello@churvox.com</a>
        </nav>
      </footer>
    </main>
  );
}
