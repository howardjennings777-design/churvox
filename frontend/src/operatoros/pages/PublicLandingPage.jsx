import { useEffect } from "react";
import "./PublicLandingPage.css";

const heroProof = [
  "AI finds the admin before it becomes a problem",
  "Jobs, crew, quotes, invoices and proof in one command centre",
  "Owner approval before anything important is sent, changed or synced",
];

const painPoints = [
  ["Admin chaos", "No more jumping between diary notes, texts, spreadsheets, invoices and job chats."],
  ["Missed follow-ups", "Churvox spots quote follow-ups, unpaid invoices and completed jobs waiting for action."],
  ["Crew confusion", "See what is unassigned, what is in progress, what is completed and what needs proof."],
  ["Slow invoicing", "Completed work moves toward proof review and draft invoice prep instead of sitting forgotten."],
];

const features = [
  ["AI Work Queue", "Churvox prepares assignments, reminders, follow-ups and invoice-ready actions for owner review."],
  ["Smart Hub", "A daily command centre showing urgent jobs, crew, cashflow, proof and admin that needs action."],
  ["Jobs + Dispatch", "Create work, assign crew, track progress, capture notes and keep the run sheet moving."],
  ["Worker Proof", "Photos, notes, completion updates and job status flow back to the owner without messy chasing."],
  ["Proof-to-Paid", "Finished jobs can become draft invoice actions with proof, notes and owner approval first."],
  ["Quotes + Invoices", "Prepare quotes, invoices, reminders and follow-ups from one place instead of chasing admin."],
  ["Clients + Sites", "Keep customer details, addresses, job history and billing context together."],
  ["Payroll Handoff", "Approved hours and worker job history stay ready for payroll review and export-style handoff."],
  ["MYOB-ready Workflow", "Built around service businesses that need cleaner invoice and payment sync workflows."],
];

const trades = [
  "Lawn care",
  "Property maintenance",
  "Cleaning",
  "Landscaping",
  "Handyman",
  "Painting",
  "Plumbing",
  "Electrical",
];

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
      <section className="public-hero">
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

          <a className="public-login-link" href="/login">Sign in</a>
        </header>

        <div className="public-hero-grid">
          <article className="public-hero-copy">
            <p className="public-kicker">AI COMMAND CENTRE FOR TRADE & SERVICE OWNERS</p>
            <h1>
              AI runs the admin.
              <span>You approve.</span>
            </h1>

            <p className="public-lead">
              Churvox gives trade and service owners one place to run jobs, crew,
              clients, quotes, invoices, proof photos, reminders and payroll handoff.
              It finds what needs doing, prepares the next move, and keeps you in control.
            </p>

            <div className="public-actions">
              <a className="public-primary" href="/login">Start free trial</a>
              <a className="public-secondary" href="/login">Sign in</a>
            </div>

            <div className="public-trust-row">
              {heroProof.map((item) => <span key={item}>{item}</span>)}
            </div>
          </article>

          <aside className="public-command-card" aria-label="Churvox AI Operator preview">
            <div className="public-orb-wrap">
              <div className="public-radar" />
              <div className="public-orb">
                <img src="/brand/churvox-holo-c.svg" alt="Churvox" />
              </div>
            </div>

            <div className="public-card-head">
              <span>LIVE AI OPERATOR</span>
              <strong>Today’s next moves are already prepared.</strong>
              <p>Review the queue, approve the right move, and Churvox does the admin step.</p>
            </div>

            <div className="public-ai-stack">
              <div>
                <b>3</b>
                <span>jobs need crew</span>
              </div>
              <div>
                <b>5</b>
                <span>invoice actions ready</span>
              </div>
              <div>
                <b>2</b>
                <span>follow-ups drafted</span>
              </div>
            </div>

            <div className="public-approval-card">
              <small>NEXT BEST MOVE</small>
              <strong>Assign Sam to 14 King Street</strong>
              <p>
                Best match by area, workload and job type. Churvox only applies
                the move after owner approval.
              </p>
              <button type="button">Approve move</button>
            </div>
          </aside>
        </div>

        <div className="public-hero-bottom">
          {painPoints.map(([title, copy]) => (
            <article key={title}>
              <strong>{title}</strong>
              <span>{copy}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="public-strip" id="how-it-works">
        <div>
          <strong>1. Churvox watches the business</strong>
          <span>Jobs, crew, proof, invoices, quotes and follow-ups stay visible.</span>
        </div>
        <div>
          <strong>2. AI prepares the next move</strong>
          <span>Assignments, invoice drafts and customer messages are prepared for you.</span>
        </div>
        <div>
          <strong>3. You approve</strong>
          <span>Nothing risky is sent, charged, changed or synced without approval.</span>
        </div>
      </section>

      <section className="public-section" id="features">
        <div className="public-section-head">
          <p>WHAT CHURVOX RUNS</p>
          <h2>The daily admin system your trade business has been missing.</h2>
          <span>
            Churvox is not just a job list. It is an AI operator that checks the business,
            prepares admin, explains the next move, and waits for owner approval.
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
          <h2>For owners running crews, sites, customers and proof-based billing.</h2>
          <span>
            Perfect for businesses where jobs happen in the field, workers need simple mobile tools,
            and the owner needs proof, invoices and follow-ups prepared without chasing everyone.
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
