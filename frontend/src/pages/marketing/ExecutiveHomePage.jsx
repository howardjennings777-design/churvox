import React from "react";
import { Link } from "react-router-dom";
import "./ExecutiveHomeProper.css";

const lanes = [
  ["Work ready", "5", "Proof and prices checked"],
  ["Money ready", "$2.4k", "Invoices lined up"],
  ["Crew gaps", "2", "Jobs need a worker"],
  ["Fix first", "3", "Only blockers shown"],
];

const stages = [
  ["Job lands", "Jobs, photos, notes and timing are captured in one place."],
  ["AI lines it up", "Churvox prepares the invoice, message, next step and missing details."],
  ["Owner approves", "You open the Work Slip, check it, change it and approve."],
];

const proof = ["Nothing sends itself", "Invoices wait for approval", "Built for trade teams", "Mobile-first command floor"];

const cards = [
  ["Work Slips", "Every finished job becomes a clear approval card."],
  ["Money desk", "Invoices, balances and follow-ups sit where the owner can act."],
  ["Crew view", "See work gaps and dispatch decisions without digging through pages."],
  ["Proof first", "Photos, notes and job details stay attached to the work."],
];

export function Nav() {
  return (
    <nav className="cvp-nav">
      <Link to="/" className="cvp-brand">
        <span className="cvp-brand-mark">C</span>
        <span>
          <b>Churvox</b>
          <small>AI Operator for trades</small>
        </span>
      </Link>
      <div className="cvp-nav-links">
        <Link to="/features">How it works</Link>
        <Link to="/pricing">Plans</Link>
        <Link to="/login">Log in</Link>
        <Link to="/signup" className="cvp-nav-cta">Start free</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="cvp-footer">
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
    <main className="cvp-home" data-version="CHURVOX_PUBLIC_HOME_PROPER_FULLSCREEN_20260531_BUILD_FIXED">
      <div className="cvp-shell">
        <Nav />

        <section className="cvp-hero">
          <div className="cvp-panel cvp-hero-copy">
            <p className="cvp-kicker">AI command floor for trade businesses</p>
            <h1>
              Jobs done.
              <span>Admin lined up.</span>
              You say go.
            </h1>
            <p>
              Churvox turns job proof, pricing, invoice drafts and customer updates into one clear Work Slip. The admin is prepared, but the owner stays in control.
            </p>
            <div className="cvp-actions">
              <Link to="/signup" className="cvp-btn cvp-btn-primary">Start free</Link>
              <Link to="/pricing" className="cvp-btn cvp-btn-ghost">See plans</Link>
            </div>
            <div className="cvp-proof">
              {proof.map((item) => <span key={item}>✓ {item}</span>)}
            </div>
          </div>

          <aside className="cvp-panel cvp-demo" aria-label="Churvox command floor preview">
            <div className="cvp-demo-head">
              <small>Command floor</small>
              <b>Today is lined up.</b>
              <span>Churvox prepares the work lanes. You approve the next move.</span>
            </div>
            <div className="cvp-demo-lanes">
              {lanes.map(([title, value, note]) => (
                <article className="cvp-demo-lane" key={title}>
                  <small>{title}</small>
                  <b>{value}</b>
                  <span>{note}</span>
                </article>
              ))}
            </div>
            <div className="cvp-work-slip">
              <div>
                <small>Work Slip ready</small>
                <b>Greenlane lawn service</b>
                <span>Proof checked · invoice ready · message waiting</span>
              </div>
              <button type="button">Approve</button>
            </div>
            <div className="cvp-mini-dock">
              <span>Work</span><span>Money</span><span>Crew</span><span>Plans</span>
            </div>
          </aside>
        </section>

        <section className="cvp-row">
          {stages.map(([title, copy], index) => (
            <article className="cvp-stage" key={title}>
              <i>{index + 1}</i>
              <b>{title}</b>
              <span>{copy}</span>
            </article>
          ))}
        </section>

        <section className="cvp-strip">
          <div>
            <p className="cvp-kicker">The point</p>
            <h2>Less chasing. Faster invoices. Clear control.</h2>
          </div>
          <div className="cvp-mini-grid">
            {cards.map(([title, copy]) => (
              <article className="cvp-mini-card" key={title}>
                <small>{title}</small>
                <b>{title}</b>
                <span>{copy}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="cvp-final">
          <p className="cvp-kicker">Ready?</p>
          <h2>Let Churvox line up the next move.</h2>
          <Link to="/signup" className="cvp-btn cvp-btn-primary">Start free</Link>
        </section>

        <Footer />
      </div>
    </main>
  );
}
