import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./ExecutiveHomeProper.css";

const features = [
  ["Jobs and clients", "Create jobs, store client details, assign workers and keep notes, photos and addresses together."],
  ["Quotes and invoices", "Prepare quotes, create draft invoices and keep follow-ups visible."],
  ["AI Operator", "Churvox suggests the next admin action and puts it in front of the owner."],
  ["Crew workflow", "Workers see assigned jobs, upload proof photos and update progress from the field."],
  ["Owner approvals", "Important messages, invoices and changes stay approval-first."],
  ["Reports", "Review work, money, team and payroll summaries in one place."],
];

const steps = [
  ["1", "Capture the work", "Add the client, job, worker, time, price, notes and completion photos."],
  ["2", "Churvox prepares admin", "The app lines up draft invoices, quote follow-ups, reminders and owner actions."],
  ["3", "You approve", "Check the Work Slip, edit if needed, then approve the action when ready."],
];

const plans = [
  ["Start", "$39", "For solo operators getting organised."],
  ["Crew", "$89", "For small teams managing jobs and workers."],
  ["Operator", "$149", "Best value for AI Operator actions."],
  ["Command", "$299", "For bigger teams and advanced admin control."],
];

const industries = ["Lawn care", "Landscaping", "Cleaning", "Handyman", "Painting", "Plumbing", "Electrical", "Property maintenance"];

export function Nav() {
  return (
    <nav className="cvp-nav">
      <Link to="/" className="cvp-brand">
        <ChurvoxLogo variant="mark" size="lg" className="cvp-brand-logo" />
        <span>
          <b>Churvox</b>
          <small>AI job admin for trades</small>
        </span>
      </Link>
      <div className="cvp-nav-links">
        <a href="#features">Features</a>
        <a href="#how">How it works</a>
        <a href="#pricing">Pricing</a>
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
        <span>Job management, admin prep and owner approvals for trade businesses.</span>
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
    <main className="cvp-home" data-version="CHURVOX_PUBLIC_SERVICE_SITE_20260601_V3">
      <div className="cvp-shell">
        <Nav />

        <section className="cvp-hero">
          <div className="cvp-hero-copy">
            <p className="cvp-kicker">For trade and service businesses</p>
            <h1>Job management that lines up the admin for you.</h1>
            <p className="cvp-lead">
              Churvox helps owners manage jobs, clients, quotes, invoices, workers, photos and follow-ups in one simple app. The AI Operator prepares the next admin action, then you approve it.
            </p>
            <div className="cvp-actions">
              <Link to="/signup" className="cvp-btn cvp-btn-primary">Start free</Link>
              <a href="#features" className="cvp-btn cvp-btn-secondary">See what it does</a>
            </div>
            <div className="cvp-proof-row">
              <span>Approval-first AI</span>
              <span>Mobile worker flow</span>
              <span>Clear job proof</span>
              <span>Simple owner dashboard</span>
            </div>
          </div>

          <aside className="cvp-product-card" aria-label="Churvox product preview">
            <div className="cvp-product-top">
              <span>Today in Churvox</span>
              <b>Actions ready</b>
            </div>
            <div className="cvp-product-grid">
              <article><small>Jobs today</small><strong>18</strong><span>3 need attention</span></article>
              <article><small>Ready to invoice</small><strong>8</strong><span>Drafts prepared</span></article>
              <article><small>Quotes</small><strong>5</strong><span>Follow-ups drafted</span></article>
              <article><small>Crew</small><strong>2</strong><span>Assignment gaps</span></article>
            </div>
            <div className="cvp-work-slip">
              <div>
                <small>Work Slip</small>
                <b>Invoice ready from completed job</b>
                <span>Photos checked · price ready · message drafted</span>
              </div>
              <button type="button">Approve</button>
            </div>
          </aside>
        </section>

        <section className="cvp-section cvp-problem">
          <div className="cvp-section-head">
            <p className="cvp-kicker">The problem</p>
            <h2>Most trade businesses do the work, then lose time chasing the admin.</h2>
          </div>
          <div className="cvp-problem-list">
            <span>Jobs finished but invoices not sent</span>
            <span>Photos and notes spread across messages</span>
            <span>Quotes forgotten after a busy week</span>
            <span>Owners stuck deciding what to do next</span>
          </div>
        </section>

        <section id="features" className="cvp-section">
          <div className="cvp-section-head cvp-section-head-row">
            <div>
              <p className="cvp-kicker">What Churvox does</p>
              <h2>Everything a trade owner needs to keep work moving.</h2>
            </div>
            <p>Simple job management with AI admin preparation built in.</p>
          </div>
          <div className="cvp-feature-grid">
            {features.map(([title, copy]) => (
              <article key={title}>
                <b>{title}</b>
                <span>{copy}</span>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="cvp-section cvp-how">
          <div className="cvp-section-head">
            <p className="cvp-kicker">How it works</p>
            <h2>Capture the job once. Let Churvox line up the next move.</h2>
          </div>
          <div className="cvp-step-grid">
            {steps.map(([num, title, copy]) => (
              <article key={title}>
                <i>{num}</i>
                <b>{title}</b>
                <span>{copy}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="cvp-section cvp-industries">
          <div>
            <p className="cvp-kicker">Built for</p>
            <h2>Trades, services and property maintenance teams.</h2>
          </div>
          <div className="cvp-chip-grid">
            {industries.map((item) => <span key={item}>{item}</span>)}
          </div>
        </section>

        <section id="pricing" className="cvp-section cvp-pricing">
          <div className="cvp-section-head cvp-section-head-row">
            <div>
              <p className="cvp-kicker">Pricing</p>
              <h2>Start simple. Upgrade when the business needs more AI Operator power.</h2>
            </div>
            <Link to="/pricing" className="cvp-btn cvp-btn-secondary">View full pricing</Link>
          </div>
          <div className="cvp-plan-grid">
            {plans.map(([name, price, copy]) => (
              <article key={name} className={name === "Operator" ? "is-popular" : ""}>
                {name === "Operator" && <em>Most popular</em>}
                <b>{name}</b>
                <strong>{price}<small>/mo + GST</small></strong>
                <span>{copy}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="cvp-final-cta">
          <div>
            <p className="cvp-kicker">Simple promise</p>
            <h2>Churvox does the admin. You approve.</h2>
            <p>Run jobs, quotes, invoices, team updates and owner approvals from one clear command desk.</p>
          </div>
          <Link to="/signup" className="cvp-btn cvp-btn-primary">Start free</Link>
        </section>

        <Footer />
      </div>
    </main>
  );
}
