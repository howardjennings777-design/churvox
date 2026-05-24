import React from "react";
import { Link } from "react-router-dom";
import { capabilityGroups, PublicSiteShell, WorkflowLine } from "./PublicSiteShell";

const rows = [
  ["Work intake", "Jobs, clients and customer requests enter one organised place instead of being scattered across calls, messages and memory."],
  ["Field movement", "Assign work, collect status updates, record notes and keep job proof connected to the client."],
  ["AI preparation", "Churvox prepares invoice drafts, follow-ups, reminders and approval actions before admin piles up."],
  ["Money workflow", "Completed work has a clear path to quote, invoice, payment follow-up and MYOB-ready records."],
  ["Role control", "Owners, managers, office admins, workers and payroll users each get the right operating view."],
];

export default function FeaturesPage() {
  return (
    <PublicSiteShell page="features">
      <section className="sf-page-hero">
        <p className="sf-kicker">Features with purpose</p>
        <h1>A complete operating flow, not a pile of screens.</h1>
        <p>Churvox connects jobs, crew, proof, quotes, invoices and approvals so the owner can run the business from one calm desk.</p>

        <div className="sf-actions">
          <Link to="/signup" className="sf-btn sf-btn--primary">Start free</Link>
          <Link to="/pricing" className="sf-btn sf-btn--quiet">View pricing</Link>
        </div>
      </section>

      <section className="sf-feature-story">
        <div>
          <p className="sf-kicker">How the system thinks</p>
          <h2>Each feature exists to move work forward.</h2>
          <p>The software is organised around the real business path: work arrives, the crew completes it, Churvox prepares the admin and the owner approves.</p>
        </div>

        <div className="sf-feature-rows">
          {rows.map(([title, body], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sf-section">
        <div className="sf-section-head">
          <p className="sf-kicker">Main areas</p>
          <h2>The business stays connected.</h2>
        </div>

        <div className="sf-capability-grid sf-capability-grid--features">
          {capabilityGroups.map(([title, label, body]) => (
            <article key={title}>
              <p>{label}</p>
              <h3>{title}</h3>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </section>

      <WorkflowLine />

      <section className="sf-final">
        <div>
          <p className="sf-kicker">Why it matters</p>
          <h2>The owner sees decisions, not chaos.</h2>
          <p>Churvox keeps the admin moving while the owner stays in control of what gets approved.</p>
        </div>

        <div className="sf-actions">
          <Link to="/signup" className="sf-btn sf-btn--primary">Start free</Link>
          <Link to="/pricing" className="sf-btn sf-btn--quiet">See plans</Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
