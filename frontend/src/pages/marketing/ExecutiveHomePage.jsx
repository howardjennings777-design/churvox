import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./ExecutiveHomeProper.css";

const painPoints = [
  "Jobs finished but invoices not sent",
  "Photos and notes buried in messages",
  "Workers waiting for direction",
  "Quotes and payments forgotten",
];

const operatorActions = [
  ["Invoice ready", "Completed job, proof checked, wording prepared."],
  ["Customer follow-up", "Quote has gone quiet. Message is drafted."],
  ["Assign worker", "Open job needs crew. Best match suggested."],
];

const benefits = [
  ["AI prepares the admin", "Invoices, reminders, quote follow-ups and job summaries are lined up for review."],
  ["Owner stays in control", "Nothing important sends, syncs, charges or changes until you approve it."],
  ["Built for real work", "Jobs, clients, quotes, invoices, crew, photos and time sit in one simple system."],
];

const proof = ["No card free trial", "Approval-first AI", "Mobile-ready", "Built for trades"];

export function Nav() {
  return (
    <nav className="cvp-nav cvp-public-nav">
      <Link to="/" className="cvp-brand">
        <ChurvoxLogo variant="mark" size="lg" className="cvp-brand-logo" />
        <span>
          <b>Churvox</b>
          <small>AI admin operator for trades</small>
        </span>
      </Link>
      <div className="cvp-nav-links">
        <Link to="/features">Features</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/login">Log in</Link>
        <Link to="/signup" className="cvp-nav-cta">Start free</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="cvp-footer cvp-public-footer">
      <div>
        <b>Churvox</b>
        <span>Churvox does the admin. You approve.</span>
      </div>
      <nav>
        <Link to="/pricing">Pricing</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-of-service">Terms</Link>
        <Link to="/login">Log in</Link>
      </nav>
    </footer>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="cvp-home cvp-sales-home" data-version="CHURVOX_PUBLIC_SALES_LANDING_20260601_V2">
      <div className="cvp-sales-shell">
        <Nav />

        <section className="cvp-sales-hero">
          <div className="cvp-sales-copy">
            <p className="cvp-sales-kicker">For trade and service business owners</p>
            <h1>Stop doing admin after the job is done.</h1>
            <p className="cvp-sales-lead">
              Churvox turns finished jobs, photos, worker notes, quotes, invoices and follow-ups into clear AI-prepared actions. You check the Work Slip and approve.
            </p>
            <div className="cvp-sales-actions">
              <Link to="/signup" className="cvp-sales-primary">Start free</Link>
              <Link to="/pricing" className="cvp-sales-secondary">See pricing</Link>
            </div>
            <div className="cvp-sales-proof">
              {proof.map((item) => <span key={item}>✓ {item}</span>)}
            </div>
          </div>

          <aside className="cvp-command-preview" aria-label="Churvox AI Operator preview">
            <div className="cvp-preview-top">
              <span>AI Operator</span>
              <b>Ready for approval</b>
              <small>3 actions prepared from today’s work</small>
            </div>
            <div className="cvp-preview-stack">
              {operatorActions.map(([title, copy]) => (
                <article key={title}>
                  <span>{title}</span>
                  <b>{copy}</b>
                  <button type="button">Approve</button>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="cvp-problem-strip">
          <div>
            <p className="cvp-sales-kicker">The problem</p>
            <h2>Most trade apps still leave the owner chasing everything.</h2>
          </div>
          <div className="cvp-pain-grid">
            {painPoints.map((item) => <span key={item}>{item}</span>)}
          </div>
        </section>

        <section className="cvp-benefit-grid">
          {benefits.map(([title, copy]) => (
            <article key={title}>
              <span>Churvox</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </section>

        <section className="cvp-sales-close">
          <p className="cvp-sales-kicker">The simple pitch</p>
          <h2>Jobs come in. Work gets done. Churvox lines up the admin.</h2>
          <p>You approve invoices, customer messages, job follow-ups and crew decisions from one clean command desk.</p>
          <Link to="/signup" className="cvp-sales-primary">Start free</Link>
        </section>

        <Footer />
      </div>
    </main>
  );
}
