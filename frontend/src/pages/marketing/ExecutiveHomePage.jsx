import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./ExecutiveHomeProper.css";

const commandCards = [
  ["Job finished", "Photos, notes and time are attached to the job."],
  ["Invoice drafted", "Churvox prepares the description and amount for review."],
  ["Customer update ready", "A clean message is written, waiting for approval."],
  ["Worker gap found", "Unassigned work is highlighted before it becomes a problem."],
];

const servicePoints = [
  ["Run the day", "Jobs, clients, workers and job status stay in one owner view."],
  ["Prepare the admin", "Invoices, quote follow-ups and customer updates are lined up automatically."],
  ["Approve the action", "The owner checks the Work Slip, edits if needed, then approves."],
];

const features = ["Jobs", "Clients", "Quotes", "Invoices", "Crew", "Photos", "Time", "Reports", "AI Operator", "MYOB-ready"];

export function Nav() {
  return (
    <nav className="cvx-nav">
      <Link to="/" className="cvx-brand">
        <ChurvoxLogo variant="mark" size="lg" className="cvx-brand-logo" />
        <span><b>Churvox</b><small>AI command centre for trade owners</small></span>
      </Link>
      <div className="cvx-links">
        <a href="#service">Service</a>
        <a href="#features">Features</a>
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
      <span>Churvox — jobs, crew, invoices and AI-prepared admin in one command centre.</span>
      <nav><Link to="/privacy-policy">Privacy</Link><Link to="/terms-of-service">Terms</Link><Link to="/login">Log in</Link></nav>
    </footer>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="cvp-home cvx-fullscreen" data-version="CHURVOX_FULLSCREEN_COMMAND_ROOM_20260601">
      <Nav />

      <section className="cvx-room">
        <aside className="cvx-left">
          <p className="cvx-pill">Built for trade and service businesses</p>
          <h1>Turn field work into finished admin.</h1>
          <p className="cvx-lead">
            Churvox is the AI command centre for jobs, clients, quotes, invoices and crew. It prepares the next admin action from real job information so the owner can approve faster.
          </p>
          <div className="cvx-actions">
            <Link to="/signup" className="cvx-primary">Start free</Link>
            <a href="#service" className="cvx-secondary">See what it does</a>
          </div>
        </aside>

        <section className="cvx-centre" aria-label="Churvox command board preview">
          <div className="cvx-screen-head">
            <span>Live command board</span>
            <b>AI Operator ready</b>
          </div>
          <div className="cvx-flow">
            <div><small>1</small><b>Job proof in</b><span>Worker notes, time and photos</span></div>
            <i />
            <div><small>2</small><b>Admin prepared</b><span>Invoice, message and next step</span></div>
            <i />
            <div><small>3</small><b>Owner approves</b><span>Nothing important goes without you</span></div>
          </div>
          <div className="cvx-card-stack">
            {commandCards.map(([title, copy]) => (
              <article key={title}>
                <span>{title}</span>
                <b>{copy}</b>
                <button type="button">Open Work Slip</button>
              </article>
            ))}
          </div>
        </section>

        <aside className="cvx-right" id="service">
          <p className="cvx-pill dark">What the service does</p>
          {servicePoints.map(([title, copy]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{copy}</span>
            </article>
          ))}
        </aside>
      </section>

      <section id="features" className="cvx-feature-band">
        <div>
          <p className="cvx-pill">One app for the work and the admin</p>
          <h2>Churvox replaces the messy gap between job done and admin done.</h2>
        </div>
        <div className="cvx-chips">
          {features.map((item) => <span key={item}>{item}</span>)}
        </div>
        <Link to="/signup" className="cvx-primary">Start free</Link>
      </section>

      <Footer />
    </main>
  );
}
