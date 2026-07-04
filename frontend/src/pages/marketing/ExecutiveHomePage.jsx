import React from "react";
import { Link } from "react-router-dom";
import "./ExecutiveHomePage.css";

const lanes = [
  ["Work ready", "5", "Check photos, notes, price"],
  ["Money waiting", "$2.4k", "Draft invoices ready"],
  ["Crew gaps", "2", "Jobs need assignment"],
  ["Fix now", "3", "Missing details only"],
];

const flow = [
  ["Crew finishes", "Photos, notes and job details land in Churvox."],
  ["Churvox prepares", "Invoices, messages and blockers are lined up."],
  ["You approve", "Open the Work Slip. Check it. Approve it."],
];

const wins = ["No auto-send", "No surprise invoices", "Owner approves", "Built for trades"];

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
        <Link to="/features">Features</Link>
        <Link to="/pricing">Pricing</Link>
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
        <span>Work done. Admin ready. You approve.</span>
      </div>
      <nav>
        <Link to="/features">Features</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-of-service">Terms</Link>
      </nav>
    </footer>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="cvx-home" data-version="CHURVOX_COMMAND_PUBLIC_HOME_20260529">
      <Nav />

      <section className="cvx-command-hero">
        <div className="cvx-command-copy">
          <p className="cvx-eyebrow">AI COMMAND FLOOR FOR TRADES</p>
          <h1>
            Work done.
            <span>Admin ready.</span>
            You approve.
          </h1>
          <p className="cvx-hero-sub">
            Churvox turns finished jobs into Work Slips: proof, price, invoice draft,
            customer update and next action.
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
            <b>Today is sorted.</b>
            <span>AI prepared · owner controlled</span>
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
              <span>Photos checked · message drafted · invoice ready</span>
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
          <p className="cvx-eyebrow">WHY IT SELLS</p>
          <h2>Less admin. Faster money. Cleaner control.</h2>
        </div>
        <div className="cvx-sell-list">
          <span>Jobs become approval slips</span>
          <span>Invoices start from real work</span>
          <span>Messages wait for approval</span>
          <span>Crew gaps show up fast</span>
        </div>
      </section>

      <section className="cvx-final">
        <p className="cvx-eyebrow">READY?</p>
        <h2>Let Churvox run the admin lane.</h2>
        <Link to="/signup" className="cvx-btn cvx-btn-primary">Start free</Link>
      </section>

      <Footer />
    </main>
  );
}
