import React from "react";
import { Link } from "react-router-dom";
import { capabilityGroups, ExecutivePreview, PublicSiteShell, WorkflowLine } from "./PublicSiteShell";

export default function CommandMachineHomePage() {
  return (
    <PublicSiteShell page="home">
      <section className="sf-hero">
        <div className="sf-hero-copy">
          <p className="sf-kicker">AI operating desk for trade businesses</p>
          <h1>Run the office with calm control.</h1>
          <p className="sf-lead">
            Churvox brings jobs, crew updates, quotes, invoices and follow-ups into one refined operating desk. The AI prepares the admin. The owner reviews and approves.
          </p>

          <div className="sf-actions">
            <Link to="/signup" className="sf-btn sf-btn--primary">Start free</Link>
            <Link to="/features" className="sf-btn sf-btn--quiet">Explore Churvox</Link>
          </div>

          <div className="sf-hero-notes">
            <span>Owner approval first</span>
            <span>Built for trades</span>
            <span>AI-prepared admin</span>
          </div>
        </div>

        <ExecutivePreview />
      </section>

      <section className="sf-statement">
        <p>Churvox is not another busy dashboard. It is a control room for the daily work that keeps a trade business moving.</p>
      </section>

      <WorkflowLine />

      <section className="sf-section">
        <div className="sf-section-head">
          <p className="sf-kicker">Core operating areas</p>
          <h2>Everything connects back to less owner admin.</h2>
        </div>

        <div className="sf-capability-grid">
          {capabilityGroups.map(([title, label, body], index) => (
            <article key={title} className={index === 1 ? "is-featured" : ""}>
              <p>{label}</p>
              <h3>{title}</h3>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="sf-final">
        <div>
          <p className="sf-kicker">The Churvox promise</p>
          <h2>Work comes in. Churvox prepares. You approve.</h2>
          <p>A sophisticated operating layer for jobs, crew, admin and money — built for owners who want control without doing every task themselves.</p>
        </div>

        <div className="sf-actions">
          <Link to="/signup" className="sf-btn sf-btn--primary">Start free</Link>
          <Link to="/pricing" className="sf-btn sf-btn--quiet">View pricing</Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
