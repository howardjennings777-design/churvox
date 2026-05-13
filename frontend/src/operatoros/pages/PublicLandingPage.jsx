import { useEffect } from "react";
import "./PublicLandingPage.css";

const heroBullets = [
  ["Finds the work", "Unassigned jobs, unpaid invoices, quote follow-ups and completed jobs needing action."],
  ["Prepares the admin", "Worker assignments, invoice-ready actions, customer reminders and proof review."],
  ["Waits for approval", "The owner stays in control before anything important is sent, changed or synced."],
];

const operatorCards = [
  ["3", "jobs need crew", "AI recommends the best available worker."],
  ["5", "invoice actions", "Completed jobs ready for proof-to-paid review."],
  ["2", "follow-ups", "Quote and payment reminders prepared."],
];

const painKills = [
  ["Stop chasing workers", "See who has what job, what is completed, what needs proof and what still needs dispatch."],
  ["Stop missing invoices", "Completed jobs get surfaced before they sit forgotten and cost you money."],
  ["Stop losing quote follow-ups", "Churvox prepares reminders before warm leads go cold."],
  ["Stop running from ten places", "Jobs, clients, crew, quotes, invoices, proof and payroll handoff stay in one command centre."],
];

const features = [
  ["AI Work Queue", "Prepared business actions in one place: dispatch, invoice prep, reminders and follow-ups."],
  ["Smart Hub", "A daily command centre showing urgent work, crew, cashflow, proof and admin."],
  ["Jobs + Dispatch", "Create jobs, assign workers, track status and keep field work moving."],
  ["Worker Proof", "Photos, notes, time and completion updates flow back to the owner."],
  ["Proof-to-Paid", "Finished jobs move toward invoice-ready review with owner approval first."],
  ["Quotes + Invoices", "Prepare quotes, invoices and follow-ups without bouncing through different tools."],
  ["Clients + Sites", "Keep customer details, addresses, job history and billing context together."],
  ["Payroll Handoff", "Approved hours and worker history stay ready for payroll review."],
  ["MYOB-ready Workflow", "Built around trade/service businesses that need cleaner invoice and payment workflows."],
];

const trades = ["Lawn care", "Property maintenance", "Cleaning", "Landscaping", "Handyman", "Painting", "Plumbing", "Electrical", "Pest control", "Gardening"];

export default function PublicLandingPage() {
  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const target =
      path === "/features" ? "features" :
      path === "/how-it-works" ? "how-it-works" :
      path === "/trades" ? "trades" :
      "";

    if (target) {
      setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }, []);

  return (
    <main className="public-landing">
      <section className="public-front">
        <header className="public-nav">
          <a className="public-brand" href="/" aria-label="Churvox home">
            <span className="public-brand-mark">
              <img src="/brand/churvox-holo-c.svg" alt="" />
            </span>
            <span>
              <strong>CHURVOX</strong>
              <small>AI Trade Operator</small>
            </span>
          </a>

          <nav aria-label="Public navigation">
            <a href="/how-it-works">How it works</a>
            <a href="/features">Features</a>
            <a href="/trades">Trades</a>
          </nav>

          <a className="public-signin" href="/login">Sign in</a>
        </header>

        <div className="public-front-grid">
          <section className="public-sell">
            <p className="public-kicker">AI COMMAND CENTRE FOR TRADE & SERVICE OWNERS</p>

            <h1>
              Stop chasing admin.
              <span>Let Churvox run it.</span>
            </h1>

            <p className="public-lead">
              Churvox acts like an AI admin operator for your business. It watches jobs,
              workers, clients, quotes, invoices, proof photos, reminders and payroll handoff —
              then prepares the next move so you only approve what matters.
            </p>

            <div className="public-actions">
              <a className="public-primary" href="/login">Start free trial</a>
              <a className="public-secondary" href="/login">Sign in</a>
            </div>

            <div className="public-hero-bullets">
              {heroBullets.map(([title, copy]) => (
                <article key={title}>
                  <strong>{title}</strong>
                  <span>{copy}</span>
                </article>
              ))}
            </div>
          </section>

          <aside className="public-operator">
            <div className="public-operator-top">
              <div className="public-orb-wrap">
                <div className="public-radar" />
                <div className="public-orb">
                  <img src="/brand/churvox-holo-c.svg" alt="Churvox" />
                </div>
              </div>

              <div>
                <p>LIVE AI OPERATOR</p>
                <h2>Your next business moves are ready.</h2>
                <span>No digging through messages, notes, invoices or worker updates.</span>
              </div>
            </div>

            <div className="public-operator-grid">
              {operatorCards.map(([number, label, copy]) => (
                <article key={label}>
                  <b>{number}</b>
                  <strong>{label}</strong>
                  <span>{copy}</span>
                </article>
              ))}
            </div>

            <div className="public-next-move">
              <small>NEXT BEST MOVE</small>
              <strong>Assign Sam to 14 King Street</strong>
              <p>Best fit by area, workload and job type. Churvox only applies the move after owner approval.</p>
              <button type="button">Approve move</button>
            </div>
          </aside>
        </div>
      </section>

      <section className="public-pain" id="how-it-works">
        {painKills.map(([title, copy]) => (
          <article key={title}>
            <strong>{title}</strong>
            <span>{copy}</span>
          </article>
        ))}
      </section>

      <section className="public-section" id="features">
        <div className="public-section-head">
          <p>WHAT CHURVOX SELLS</p>
          <h2>The daily admin system your trade business has been missing.</h2>
          <span>
            Churvox is not just a job list. It prepares real admin actions, explains why they matter,
            and gives owners a simple approval queue before anything risky happens.
          </span>
        </div>

        <div className="public-feature-grid">
          {features.map(([title, copy]) => (
            <article key={title}>
              <div />
              <strong>{title}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-proof" id="trades">
        <div>
          <p>BUILT FOR FIELD SERVICE</p>
          <h2>For owners running crews, jobs, sites, customers and proof-based billing.</h2>
          <span>
            Perfect for businesses where work happens out in the field and the owner needs proof,
            progress, invoice readiness and follow-ups without chasing everyone all day.
          </span>
        </div>

        <div className="public-trade-cloud">
          {trades.map((trade) => <span key={trade}>{trade}</span>)}
        </div>
      </section>

      <section className="public-final-cta">
        <p>READY TO STOP CHASING ADMIN?</p>
        <h2>Give your business an AI command centre.</h2>
        <div>
          <a className="public-primary" href="/login">Start free trial</a>
          <a className="public-secondary" href="/login">Sign in</a>
        </div>
      </section>
    </main>
  );
}
