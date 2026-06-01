import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./ExecutiveHomeProper.css";

const slips = [
  ["Invoice ready", "Completed job, proof and wording prepared."],
  ["Quote follow-up", "Customer nudge is drafted for approval."],
  ["Assign worker", "Open job needs crew. Best match suggested."],
];

const proof = ["No-card trial", "Approval-first AI", "Built for mobile crews", "MYOB-ready on Command"];

const featureCards = [
  ["Jobs", "Create, assign and review field work without losing the admin trail."],
  ["Clients", "Keep customer details, job history, quotes and invoices connected."],
  ["Invoices", "Prepare draft invoices from completed work, notes, photos and pricing."],
  ["Quotes", "See quiet quotes and approve follow-up messages before they send."],
  ["Crew", "Give workers a simple job view while owners keep the full picture."],
  ["AI Operator", "Churvox lines up the next admin action. You stay in control."],
];

export function Nav() {
  return (
    <nav className="cvx-nav">
      <Link to="/" className="cvx-brand">
        <ChurvoxLogo variant="mark" size="lg" className="cvx-brand-logo" />
        <span><b>Churvox</b><small>AI admin for trade owners</small></span>
      </Link>
      <div className="cvx-links">
        <a href="/#inside">Inside</a>
        <a href="/#features">Features</a>
        <Link to="/pricing">Pricing</Link>
        <Link to="/login">Log in</Link>
        <Link to="/signup" className="cvx-start">Start free</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="cvx-footer">
      <div><b>Churvox</b><span>Churvox does the admin. You approve.</span></div>
      <nav><Link to="/pricing">Pricing</Link><Link to="/privacy-policy">Privacy</Link><Link to="/terms-of-service">Terms</Link><Link to="/login">Log in</Link></nav>
    </footer>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="cvp-home cvx-public" data-version="CHURVOX_PUBLIC_FULLSCREEN_HERO_20260601">
      <section className="cvx-full-hero">
        <Nav />
        <div className="cvx-hero-grid">
          <section className="cvx-hero-copy">
            <p className="cvx-pill">Built for trade and service owners</p>
            <h1>Stop chasing admin after the job is done.</h1>
            <p className="cvx-lead">Churvox keeps jobs, clients, crew, quotes, invoices and proof in one place. AI prepares the next admin action, then you approve it.</p>
            <div className="cvx-actions">
              <Link to="/signup" className="cvx-primary">Start free</Link>
              <Link to="/pricing" className="cvx-secondary">See pricing</Link>
            </div>
            <div className="cvx-proof-row">{proof.map((item) => <span key={item}>{item}</span>)}</div>
          </section>

          <aside className="cvx-command-preview" aria-label="Churvox command preview">
            <div className="cvx-preview-head">
              <small>AI Operator</small>
              <b>Ready for approval</b>
              <span>3 actions prepared from today’s work</span>
            </div>
            <div className="cvx-slip-stack">
              {slips.map(([title, copy]) => (
                <article key={title}>
                  <div><small>{title}</small><strong>{copy}</strong></div>
                  <button type="button">Approve</button>
                </article>
              ))}
            </div>
            <div className="cvx-preview-strip">
              <span>Jobs</span><span>Invoices</span><span>Quotes</span><span>Crew</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="cvx-screen cvx-problem-screen">
        <div className="cvx-screen-copy">
          <p className="cvx-pill">The gap Churvox fixes</p>
          <h2>Most job apps track the work. Churvox helps finish the admin after it.</h2>
        </div>
        <div className="cvx-problem-grid">
          <span>Invoices forgotten after busy days</span>
          <span>Photos buried in messages</span>
          <span>Quotes go quiet</span>
          <span>Owners chase every next step</span>
        </div>
      </section>

      <section id="features" className="cvx-screen cvx-feature-screen">
        <div className="cvx-screen-copy">
          <p className="cvx-pill">What you get</p>
          <h2>Everything the owner needs to keep the day moving.</h2>
        </div>
        <div className="cvx-service-grid">
          {featureCards.map(([title, copy]) => <article key={title}><b>{title}</b><span>{copy}</span></article>)}
        </div>
      </section>

      <section id="inside" className="cvx-screen cvx-inside-screen">
        <div>
          <p className="cvx-pill dark">Inside the app</p>
          <h2>The public site feels simple. The logged-in app becomes your dark Command Room.</h2>
          <span>Jobs, invoices, dispatch, money, crew and AI-prepared actions stay focused when it is time to run the business.</span>
        </div>
        <div className="cvx-mini-command">
          <b>Command Room</b>
          <span>Invoice ready</span>
          <span>Quote follow-up ready</span>
          <span>Worker assignment gap</span>
          <span>Payment chase prepared</span>
        </div>
      </section>

      <section className="cvx-final-cta">
        <div>
          <p className="cvx-pill">Simple promise</p>
          <h2>Churvox does the admin. You approve.</h2>
          <span>Start with jobs and clients. Grow into AI Operator actions, crew workflow, invoices, quotes, payroll workspace and MYOB sync when ready.</span>
        </div>
        <Link to="/signup" className="cvx-primary">Start free</Link>
      </section>

      <Footer />
    </main>
  );
}