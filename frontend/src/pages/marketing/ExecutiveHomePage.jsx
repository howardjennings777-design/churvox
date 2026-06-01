import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./ExecutiveHomeProper.css";

const approvals = [
  ["Invoice draft", "Completed job, proof photos and wording prepared."],
  ["Quote follow-up", "Customer chase message written for review."],
  ["Crew match", "Best available worker suggested before dispatch."],
  ["Payment reminder", "Polite reminder drafted before money goes stale."],
];

const proof = ["No-card trial", "Owner approves first", "Mobile crew workflow", "MYOB ready"];

const workflow = [
  ["Jobs", "Create, assign and track work without losing the admin trail."],
  ["Clients", "Keep customer details, job history, quotes and invoices connected."],
  ["Quotes", "Prepare quotes and follow-ups before the lead goes cold."],
  ["Invoices", "Turn completed jobs into draft invoices ready to approve."],
  ["Crew", "Give workers a simple job view while owners keep control."],
  ["Payroll", "Review approved time and payroll handoff without hunting."],
];

const problems = [
  "Finished jobs still need invoices.",
  "Photos and notes get buried.",
  "Quotes go quiet.",
  "Owners forget the next step.",
];

export function Nav() {
  return (
    <nav className="cvx-nav">
      <Link to="/" className="cvx-brand">
        <ChurvoxLogo variant="mark" size="lg" className="cvx-brand-logo" />
        <span><b>Churvox</b><small>AI admin command centre</small></span>
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
      <div><b>Churvox</b><span>AI admin command centre for trade and service owners.</span></div>
      <nav><Link to="/pricing">Pricing</Link><Link to="/features">Features</Link><Link to="/privacy-policy">Privacy</Link><Link to="/terms-of-service">Terms</Link><Link to="/login">Log in</Link></nav>
    </footer>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="cvp-home cvx-public" data-version="CHURVOX_PUBLIC_FULL_SCREEN_REDO_20260601">
      <section className="cvx-full-hero">
        <Nav />
        <div className="cvx-hero-grid">
          <section className="cvx-hero-copy">
            <p className="cvx-pill">Built for trade and service owners</p>
            <h1>Run the job. Churvox handles the admin.</h1>
            <p className="cvx-lead">
              Jobs, clients, crew, quotes, invoices and proof of work stay connected.
              Churvox prepares the next admin action so you can review it, approve it and move on.
            </p>
            <div className="cvx-actions">
              <Link to="/signup" className="cvx-primary">Start free</Link>
              <Link to="/pricing" className="cvx-secondary">See pricing</Link>
            </div>
            <div className="cvx-proof-row">{proof.map((item) => <span key={item}>{item}</span>)}</div>
          </section>

          <aside className="cvx-command-preview" aria-label="Churvox AI Operator preview">
            <div className="cvx-preview-head">
              <small>AI Operator</small>
              <b>Admin ready to approve.</b>
              <span>Prepared from today’s jobs, notes, photos and customer activity.</span>
            </div>
            <div className="cvx-slip-stack">
              {approvals.map(([title, copy]) => (
                <article key={title}>
                  <div><small>{title}</small><strong>{copy}</strong></div>
                  <button type="button">Approve</button>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="cvx-band cvx-problem-band">
        <div className="cvx-band-inner">
          <div className="cvx-section-copy">
            <p className="cvx-pill">The real problem</p>
            <h2>Most apps track the work. The admin still lands on you.</h2>
            <span>Churvox is built for the mess after the job: invoices, proof, follow-ups, dispatch decisions, payroll review and customer updates.</span>
          </div>
          <div className="cvx-problem-row">
            {problems.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      </section>

      <section id="features" className="cvx-band">
        <div className="cvx-band-inner">
          <div className="cvx-section-copy cvx-wide-copy">
            <p className="cvx-pill">What Churvox connects</p>
            <h2>One clean workflow from job to approval.</h2>
            <span>Everything is kept simple: work comes in, crew go out, proof comes back, Churvox prepares the admin, and the owner approves the next move.</span>
          </div>
          <div className="cvx-service-grid">
            {workflow.map(([title, copy]) => <article key={title}><b>{title}</b><span>{copy}</span></article>)}
          </div>
        </div>
      </section>

      <section id="inside" className="cvx-command-band">
        <div className="cvx-command-inner">
          <div>
            <p className="cvx-pill dark">Inside the app</p>
            <h2>The logged-in app becomes your Command Desk.</h2>
            <span>Smart Hub shows what needs attention, what Churvox prepared and what button to press next. No giant website boxes. No confusing admin maze.</span>
          </div>
          <div className="cvx-mini-command">
            <b>Today’s owner queue</b>
            <span>Draft invoices ready</span>
            <span>Quote follow-ups prepared</span>
            <span>Worker assignment suggestions</span>
            <span>Payroll and time review</span>
            <span>MYOB sync when ready</span>
          </div>
        </div>
      </section>

      <section className="cvx-final-cta">
        <div>
          <p className="cvx-pill">Simple promise</p>
          <h2>Churvox prepares it. You approve it.</h2>
          <span>Start with jobs and clients. Grow into AI Operator actions, crew workflow, invoices, quotes, payroll workspace and MYOB sync when ready.</span>
        </div>
        <Link to="/signup" className="cvx-primary">Start free</Link>
      </section>

      <Footer />
    </main>
  );
}
