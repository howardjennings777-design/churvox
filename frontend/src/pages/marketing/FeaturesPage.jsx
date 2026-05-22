import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";

const features = [
  ["AI Operator", "Churvox prepares admin moves so the owner reviews decisions instead of chasing every loose end."],
  ["Jobs", "Create, assign, track and complete work with cleaner field-to-office handoff."],
  ["Clients", "Keep customer details, job history and billing context in one practical workbench."],
  ["Quotes", "Prepare quotes, follow-ups and approval paths without losing the next step."],
  ["Invoices", "Turn completed work, notes, proof and pricing into reviewable invoice admin."],
  ["Crew", "Manage workers, roles, assignments and field updates from the same operating system."],
  ["Payroll", "Review approved hours, summaries and payroll handoff without giving payroll users full owner access."],
  ["MYOB", "Designed for MYOB invoice/payment sync as part of the Churvox money desk."],
  ["SMS", "Customer reminders and message workflows stay connected to jobs and invoices."],
];

function Nav() {
  return (
    <header className="wh-public-nav">
      <Link to="/"><ChurvoxLogo /></Link>
      <nav className="wh-public-links">
        <Link to="/features">Features</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/login">Log in</Link>
      </nav>
      <Link to="/signup" className="px-btn px-btn--primary">Start free</Link>
    </header>
  );
}

export default function FeaturesPage() {
  return (
    <main className="wh-public-page">
      <Nav />
      <section className="wh-public-wrap">
        <article className="wh-public-card">
          <p className="px-hero__eyebrow">Workhorse features</p>
          <h1 className="wh-public-title">One machine for jobs, admin, crew and money.</h1>
          <p className="wh-public-sub">
            Churvox is built around the daily grind: work comes in, Churvox prepares the admin, and the owner approves the next move.
          </p>
          <div className="px-hero__actions">
            <Link to="/signup" className="px-btn px-btn--primary">Start free</Link>
            <Link to="/pricing" className="px-btn">View pricing</Link>
          </div>
        </article>

        <section className="wh-public-grid">
          {features.map(([title, text]) => (
            <article key={title} className="wh-public-tile">
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
