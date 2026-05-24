import React from "react";
import { Link } from "react-router-dom";
import { Capabilities, ExecutiveShell, Workflow } from "./ExecutiveShell";

function DeskPreview() {
  const rows = [
    ["Invoice approval", "Completed job reviewed, customer details matched, invoice draft ready.", "$840"],
    ["Quote follow-up", "Message prepared for a quote waiting on a customer reply.", "2 days"],
    ["Crew assignment", "Worker suggestion prepared from availability and workload.", "Ready"],
  ];

  return (
    <aside className="ex-preview">
      <div className="ex-preview-top">
        <span>Churvox Operator Desk</span>
        <strong>Today</strong>
      </div>

      <div className="ex-preview-main">
        <p>Owner approval queue</p>
        <h2>Prepared work, waiting for your decision.</h2>
        <span>Nothing important is sent, billed or changed until the owner approves.</span>
      </div>

      <div className="ex-preview-list">
        {rows.map(([title, body, meta]) => (
          <article key={title}>
            <div>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
            <em>{meta}</em>
          </article>
        ))}
      </div>
    </aside>
  );
}

export default function ExecutiveHomePage() {
  return (
    <ExecutiveShell page="home">
      <section className="ex-hero">
        <div className="ex-hero-copy">
          <p className="ex-kicker">AI operating desk for trade businesses</p>
          <h1>Run the office with calm control.</h1>
          <p className="ex-lead">
            Churvox brings jobs, crew updates, quotes, invoices and follow-ups into one refined operating desk. The AI prepares the admin. The owner reviews and approves.
          </p>

          <div className="ex-actions">
            <Link to="/signup" className="ex-btn ex-btn--primary">Start free</Link>
            <Link to="/features" className="ex-btn ex-btn--quiet">Explore Churvox</Link>
          </div>

          <div className="ex-notes">
            <span>Owner approval first</span>
            <span>Built for trades</span>
            <span>AI-prepared admin</span>
          </div>
        </div>

        <DeskPreview />
      </section>

      <section className="ex-statement">
        <p>Churvox is not another busy dashboard. It is a control room for the daily work that keeps a trade business moving.</p>
      </section>

      <Workflow />

      <section className="ex-section">
        <div className="ex-section-head">
          <p className="ex-kicker">Core operating areas</p>
          <h2>Everything connects back to less owner admin.</h2>
        </div>
        <Capabilities />
      </section>

      <section className="ex-final">
        <div>
          <p className="ex-kicker">The Churvox promise</p>
          <h2>Work comes in. Churvox prepares. You approve.</h2>
          <p>A sophisticated operating layer for jobs, crew, admin and money — built for owners who want control without doing every task themselves.</p>
        </div>

        <div className="ex-actions">
          <Link to="/signup" className="ex-btn ex-btn--primary">Start free</Link>
          <Link to="/pricing" className="ex-btn ex-btn--quiet">View pricing</Link>
        </div>
      </section>
    </ExecutiveShell>
  );
}
