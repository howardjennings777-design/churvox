import { useEffect } from "react";
import "./PublicLandingPage.css";

const features = [
  ["AI Work Queue", "Finds admin that needs action, prepares the next move, and waits for owner approval."],
  ["Jobs + Dispatch", "Create jobs, assign crew, track site progress, collect notes, and keep the day moving."],
  ["Proof-to-Paid", "Worker photos, completion notes, time and job proof flow into invoice-ready owner review."],
  ["Quotes + Invoices", "Prepare quotes, invoices, reminders and payment follow-ups without jumping between tools."],
  ["Crew + Payroll Handoff", "See workers, approved hours, job history, payroll notes and clean export-ready summaries."],
  ["MYOB-ready Workflow", "Built for trade/service businesses that need cleaner invoice and payment sync workflows."],
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
            <p className="public-kicker">FOR TRADE & SERVICE BUSINESS OWNERS</p>
            <h1>
              AI runs the admin.
              <span>You approve.</span>
            </h1>
            <p className="public-lead">
              Churvox is an AI command centre for jobs, crew, clients, quotes,
              invoices, proof photos, reminders and payroll handoff. It finds what
              needs doing, prepares the next move, and keeps you in control.
            </p>

            <div className="public-actions">
              <a className="public-primary" href="/login">Start free trial</a>
              <a className="public-secondary" href="/login">Sign in</a>
            </div>

            <div className="public-trust-row">
              <span>Approval-first AI</span>
              <span>Built for mobile crews</span>
              <span>No auto-send without approval</span>
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
              <span>LIVE OPERATOR</span>
              <strong>Today’s admin is ready for review.</strong>
            </div>

            <div className="public-ai-stack">
              <div>
                <b>3</b>
                <span>jobs need crew</span>
              </div>
              <div>
                <b>5</b>
                <span>invoices ready</span>
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
      </section>

      <section className="public-strip" id="how-it-works">
        <div>
          <strong>1. Churvox watches the work</strong>
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
          <h2>One command centre instead of ten messy admin jobs.</h2>
          <span>
            Designed for real trade/service owners who need the business moving,
            not another confusing system to babysit.
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
          <h2>For crews, jobs, sites, customers and proof-based billing.</h2>
          <span>
            Churvox is for businesses where work happens in the field and the
            owner needs admin prepared before it becomes a problem.
          </span>
        </div>

        <div className="public-trade-cloud">
          {trades.map((trade) => <span key={trade}>{trade}</span>)}
        </div>
      </section>

      <section className="public-final-cta">
        <p>READY TO RUN ADMIN WITH AI?</p>
        <h2>Give your business a command centre.</h2>
        <div>
          <a className="public-primary" href="/login">Start free trial</a>
          <a className="public-secondary" href="/login">Sign in</a>
        </div>
      </section>
    </main>
  );
}
