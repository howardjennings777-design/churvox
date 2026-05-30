import React from "react";
import { Link } from "react-router-dom";
import "./ExecutiveHomePage.css";
import "./ExecutiveHomeCommandTheme.css";
import "./ExecutiveHomeNavFix.css";
import "./ExecutiveHomeAlignmentPass.css";

const lanes = [
  ["Work ready", "5", "Check proof and price"],
  ["Money ready", "$2.4k", "Invoices lined up"],
  ["Crew gaps", "2", "Jobs need a worker"],
  ["Fix first", "3", "Only what blocks approval"],
];

const flow = [
  ["Job is done", "Photos, notes and job details land in Churvox."],
  ["Churvox lines it up", "Invoice draft, message and blockers are ready."],
  ["You say go", "Open the Work Slip, check it, approve it."],
];

const wins = ["Nothing sends itself", "Invoices wait for approval", "Owner stays in control", "Made for trade teams"];

export function Nav() {
  return (
    <nav className="cvx-home-nav">
      <Link to="/" className="cvx-home-brand">
        <span className="cvx-home-brand-mark">C</span>
        <span>
          <b>Churvox</b>
          <small>AI Operator</small>
        </span>
      </Link>

      <div className="cvx-home-links">
        <Link to="/features">How it works</Link>
        <Link to="/pricing">Plans</Link>
        <Link to="/login">Log in</Link>
        <Link to="/signup" className="cvx-nav-cta">Start free</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="cvx-footer">
      <div>
        <b>Churvox</b>
        <span>Jobs done. Admin lined up. You approve.</span>
      </div>
      <nav>
        <Link to="/features">How it works</Link>
        <Link to="/pricing">Plans</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-of-service">Terms</Link>
      </nav>
    </footer>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="cvx-home" data-version="CHURVOX_PUBLIC_HOME_ALIGNMENT_PASS_20260531">
      <Nav />

      <section className="cvx-command-hero">
        <div className="cvx-command-copy">
          <p className="cvx-eyebrow">AI COMMAND FLOOR FOR TRADES</p>
          <h1>
            Jobs done.
            <span>Admin lined up.</span>
            You say go.
          </h1>
          <p className="cvx-hero-sub">
            Churvox puts proof, price, invoice draft and customer update into one Work Slip.
            Check it, change it, approve it.
          </p>

          <div className="cvx-actions">
            <Link to="/signup" className="cvx-btn cvx-btn-primary">Start free</Link>
            <Link to="/pricing" className="cvx-btn cvx-btn-secondary">See plans</Link>
          </div>

          <div className="cvx-proof">
            {wins.map((item) => <span key={item}>✓ {item}</span>)}
          </div>
        </div>

        <aside className="cvx-command-demo" aria-label="Churvox Command Floor preview">
          <div className="cvx-demo-top">
            <small>COMMAND FLOOR</small>
            <b>Today is lined up.</b>
            <span>Churvox prepares · owner approves</span>
          </div>

          <div className="cvx-demo-lanes">
            {lanes.map(([title, value, note]) => (
              <article key={title}>
                <small>{title}</small>
                <b>{value}</b>
                <span>{note}</span>
              </article>
            ))}
          </div>

          <div className="cvx-work-slip-card">
            <div>
              <small>WORK SLIP READY</small>
              <b>Greenlane lawn service</b>
              <span>Proof checked · invoice ready · message waiting</span>
            </div>
            <button type="button">Approve</button>
          </div>

          <div className="cvx-mini-dock">
            <span>Work</span><span>Money</span><span>Crew</span><span>Tools</span>
          </div>
        </aside>
      </section>

      <section className="cvx-flow-band">
        {flow.map(([title, copy], index) => (
          <article key={title}>
            <i>{index + 1}</i>
            <b>{title}</b>
            <span>{copy}</span>
          </article>
        ))}
      </section>

      <section className="cvx-sell-strip">
        <div>
          <p className="cvx-eyebrow">THE POINT</p>
          <h2>Less chasing. Faster invoices. Clear control.</h2>
        </div>
        <div className="cvx-sell-list">
          <span>Jobs turn into Work Slips</span>
          <span>Invoices start from real work</span>
          <span>Messages wait for approval</span>
          <span>Missing details show first</span>
        </div>
      </section>

      <section className="cvx-final">
        <p className="cvx-eyebrow">READY?</p>
        <h2>Let Churvox line up the next move.</h2>
        <Link to="/signup" className="cvx-btn cvx-btn-primary">Start free</Link>
      </section>

      <Footer />
    </main>
  );
}
