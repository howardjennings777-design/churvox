import React from "react";
import { Link } from "react-router-dom";
import "./ExecutiveHomePage.css";

const proof = [
  "No invoice sends without review",
  "No customer message sends by itself",
  "No worker assignment without approval",
  "Every action explains why",
];

const lanes = [
  ["Approve Work", "3", "Finished jobs waiting for sign-off"],
  ["Approve Invoices", "$1.8k", "Drafts prepared from approved work"],
  ["Assign Workers", "2", "Jobs needing the right crew member"],
  ["Fix Blockers", "4", "Missing price, customer detail or evidence"],
];

const steps = [
  ["Crew finishes job", "Workers add notes, photos and completion details from the field."],
  ["Churvox prepares admin", "Draft invoices, customer updates, worker checks and blockers are prepared."],
  ["Owner approves", "Open one Work Slip, adjust if needed, then approve."],
];

export default function ExecutiveHomePage() {
  return (
    <main className="cvx-home" data-version="CHURVOX_WOW_LANDING_20260527">
      <nav className="cvx-home-nav">
        <Link to="/" className="cvx-home-brand">
          <span className="cvx-home-brand-mark">C</span>
          <span>
            <b>Churvox</b>
            <small>AI Operator for trade businesses</small>
          </span>
        </Link>

        <div className="cvx-home-links">
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="cvx-nav-cta">Start free</Link>
        </div>
      </nav>

      <section className="cvx-hero">
        <div className="cvx-hero-copy">
          <p className="cvx-eyebrow">AI COMMAND FLOOR FOR TRADES</p>
          <h1>
            Your crew finishes the work.
            <span>Churvox prepares the admin.</span>
            You approve.
          </h1>
          <p className="cvx-hero-sub">
            Churvox turns completed jobs into approval-ready Work Slips: worker notes, photos,
            draft invoices, customer updates, crew checks and blockers — all in one place.
          </p>

          <div className="cvx-actions">
            <Link to="/signup" className="cvx-btn cvx-btn-primary">Start running admin with AI</Link>
            <Link to="/pricing" className="cvx-btn cvx-btn-secondary">See plans</Link>
          </div>

          <div className="cvx-proof">
            {proof.map((item) => <span key={item}>✓ {item}</span>)}
          </div>
        </div>

        <aside className="cvx-demo">
          <div className="cvx-demo-head">
            <small>COMMAND FLOOR</small>
            <b>Live owner approvals</b>
            <span>AI prepared · owner controlled</span>
          </div>

          <div className="cvx-demo-grid">
            {lanes.map(([title, value, note]) => (
              <article key={title}>
                <small>{title}</small>
                <b>{value}</b>
                <span>{note}</span>
              </article>
            ))}
          </div>

          <div className="cvx-slip">
            <div>
              <small>WORK SLIP READY</small>
              <b>Greenlane Lawn Service</b>
              <span>Photos uploaded · worker note saved · invoice draft prepared</span>
            </div>
            <button type="button">Approve</button>
          </div>
        </aside>
      </section>

      <section className="cvx-section">
        <div className="cvx-section-head">
          <p className="cvx-eyebrow">THE SIMPLE FLOW</p>
          <h2>Built around approval, not clutter.</h2>
          <span>
            Jobs, clients, invoices and crew still exist — but the owner’s daily job is simple:
            open the Command Floor and approve what Churvox prepared.
          </span>
        </div>

        <div className="cvx-steps">
          {steps.map(([title, copy], index) => (
            <article key={title}>
              <i>{index + 1}</i>
              <b>{title}</b>
              <span>{copy}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cvx-split">
        <div>
          <p className="cvx-eyebrow">WHY IT FEELS DIFFERENT</p>
          <h2>Not another busy job app.</h2>
          <span>
            Most systems give you more pages to manage. Churvox gives you a daily approval desk.
            It finds the admin, prepares the next step and shows exactly what needs checking.
          </span>
        </div>

        <div className="cvx-feature-list">
          <article><b>Work Slips</b><span>One approval screen for job evidence, invoice prep, worker checks and message drafts.</span></article>
          <article><b>AI Operator Actions</b><span>Churvox prepares executable work for owner approval instead of just giving advice.</span></article>
          <article><b>Field evidence</b><span>Worker notes and photos flow straight into the owner’s approval process.</span></article>
          <article><b>Money desk</b><span>Approved work can become draft invoices without typing everything again.</span></article>
        </div>
      </section>

      <section className="cvx-final">
        <p className="cvx-eyebrow">READY TO SEE THE FUTURE OF TRADE ADMIN?</p>
        <h2>Let Churvox prepare the admin. You stay in control.</h2>
        <Link to="/signup" className="cvx-btn cvx-btn-primary">Start free</Link>
      </section>
    </main>
  );
}
