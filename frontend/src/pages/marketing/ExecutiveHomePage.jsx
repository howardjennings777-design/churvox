import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./ExecutiveHomeProper.css";

const painPoints = [
  ["Jobs finished", "Photos, notes and time are already attached."],
  ["Admin prepared", "Invoice wording, customer follow-up and next step are lined up."],
  ["Owner approves", "Nothing important sends or changes without review."],
];

const serviceCards = [
  ["Jobs stay organised", "Clients, job details, workers, notes, photos and status all stay together."],
  ["Invoices get prepared", "Completed work can become a draft invoice instead of another late-night admin job."],
  ["Quotes get followed up", "Quiet quotes are surfaced with a simple customer nudge ready for approval."],
  ["Crew stays clear", "Workers see their jobs and owners see what needs assigning or reviewing."],
  ["Proof is easy to find", "Photos, notes and job records stay connected so the story of the work is clear."],
  ["AI stays approval-first", "Churvox prepares the admin, but the owner stays in control."],
];

const steps = [
  ["1", "Add the work", "Create the job, assign the crew and capture notes, photos, time and pricing."],
  ["2", "Churvox lines up admin", "AI Operator prepares draft invoices, reminders, quote follow-ups and dispatch gaps."],
  ["3", "You approve", "Open the Work Slip, check the detail, edit if needed and approve the next action."],
];

const industries = ["Lawn care", "Landscaping", "Cleaning", "Handyman", "Painting", "Plumbing", "Electrical", "Property maintenance"];

export function Nav() {
  return (
    <nav className="cvx-nav">
      <Link to="/" className="cvx-brand">
        <ChurvoxLogo variant="mark" size="lg" className="cvx-brand-logo" />
        <span><b>Churvox</b><small>AI admin for trade owners</small></span>
      </Link>
      <div className="cvx-links">
        <a href="/#how">How it works</a>
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
      <div>
        <b>Churvox</b>
        <span>Churvox does the admin. You approve.</span>
      </div>
      <nav><Link to="/pricing">Pricing</Link><Link to="/privacy-policy">Privacy</Link><Link to="/terms-of-service">Terms</Link><Link to="/login">Log in</Link></nav>
    </footer>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="cvp-home cvx-public" data-version="CHURVOX_PUBLIC_INVITING_BRAND_20260601">
      <Nav />

      <section className="cvx-hero">
        <div className="cvx-hero-copy">
          <p className="cvx-pill">For trade and service business owners</p>
          <h1>Finish the job. Let Churvox line up the admin.</h1>
          <p className="cvx-lead">
            Churvox keeps jobs, clients, crew, quotes, invoices and proof in one simple system. The AI Operator prepares the next admin action, then you check it and approve.
          </p>
          <div className="cvx-actions">
            <Link to="/signup" className="cvx-primary">Start free</Link>
            <Link to="/pricing" className="cvx-secondary">See pricing</Link>
          </div>
          <div className="cvx-proof-row">
            <span>No-card trial</span><span>Approval-first AI</span><span>Built for mobile work</span>
          </div>
        </div>

        <aside className="cvx-preview" aria-label="Churvox Work Slip preview">
          <div className="cvx-preview-top">
            <span>Today in Churvox</span>
            <b>3 Work Slips ready</b>
          </div>
          {painPoints.map(([title, copy]) => (
            <article key={title}>
              <div><small>{title}</small><strong>{copy}</strong></div>
              <button type="button">Approve</button>
            </article>
          ))}
        </aside>
      </section>

      <section className="cvx-problem">
        <div>
          <p className="cvx-pill">The messy gap</p>
          <h2>Most trade apps track the job. Churvox helps finish the admin after it.</h2>
        </div>
        <div className="cvx-problem-grid">
          <span>Invoices forgotten after busy days</span>
          <span>Photos buried in messages</span>
          <span>Quotes go quiet</span>
          <span>Owners chase every next step</span>
        </div>
      </section>

      <section id="features" className="cvx-section">
        <div className="cvx-section-head">
          <p className="cvx-pill">What you get</p>
          <h2>Simple outside. Powerful when you log in.</h2>
          <span>The public site feels welcoming. The app becomes your dark Command Room when it is time to run the day.</span>
        </div>
        <div className="cvx-service-grid">
          {serviceCards.map(([title, copy]) => <article key={title}><b>{title}</b><span>{copy}</span></article>)}
        </div>
      </section>

      <section id="how" className="cvx-section cvx-how">
        <div className="cvx-section-head">
          <p className="cvx-pill">How it works</p>
          <h2>From job done to admin done, without losing control.</h2>
        </div>
        <div className="cvx-step-grid">
          {steps.map(([num, title, copy]) => <article key={title}><i>{num}</i><b>{title}</b><span>{copy}</span></article>)}
        </div>
      </section>

      <section className="cvx-command-teaser">
        <div>
          <p className="cvx-pill dark">Inside the app</p>
          <h2>Your logged-in workspace becomes the Churvox Command Room.</h2>
          <span>Dark, focused and built for decisions: jobs, invoices, dispatch, money, crew and AI-prepared actions in one place.</span>
        </div>
        <div className="cvx-mini-command">
          <b>AI Operator</b>
          <span>Invoice ready</span>
          <span>Quote follow-up ready</span>
          <span>Worker assignment gap</span>
        </div>
      </section>

      <section className="cvx-section cvx-industries">
        <div>
          <p className="cvx-pill">Built for real work</p>
          <h2>Trades, services and property maintenance teams.</h2>
        </div>
        <div className="cvx-chips">{industries.map((item) => <span key={item}>{item}</span>)}</div>
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