import React from "react";
import { Link } from "react-router-dom";
import { ApprovalDock, FeatureRibbon, FlowStrip, PublicSiteShell, featureGroups } from "./PublicSiteShell";

const proofCards = [
  ["Field work", "Crew finishes the job and adds notes, time and proof photos."],
  ["Office prep", "Churvox prepares the invoice, quote follow-up or admin move."],
  ["Owner control", "You approve before anything important goes out."],
];

const outcomes = [
  "Less admin chasing",
  "Faster invoices",
  "Cleaner crew handoff",
  "Better job proof",
  "Fewer missed follow-ups",
  "One place to run the day",
];

export default function CommandMachineHomePage() {
  return (
    <PublicSiteShell page="home">
      <section className="cvx-hero">
        <div className="cvx-hero-copy">
          <p className="cvx-eyebrow">AI office operator for trades</p>
          <h1>Your trade business gets its own admin operator.</h1>
          <p className="cvx-lead">
            Churvox takes jobs, crew updates, quotes, invoices and follow-ups and turns them into simple prepared work slips. You approve what matters. The office keeps moving.
          </p>

          <div className="cvx-hero-actions">
            <Link to="/signup" className="cvx-button cvx-button--lime">Start free</Link>
            <Link to="/features" className="cvx-button cvx-button--cream">See the system</Link>
          </div>

          <FeatureRibbon items={["Jobs", "Crew", "Quotes", "Invoices", "AI approvals", "MYOB-ready"]} />
        </div>

        <ApprovalDock />
      </section>

      <FlowStrip />

      <section className="cvx-section cvx-section--split">
        <div>
          <p className="cvx-eyebrow">Not another boring dashboard</p>
          <h2>A usable front desk for the work your business actually does.</h2>
          <p>
            Churvox is designed around what owners need every day: what needs approving, what needs fixing, what the crew is doing and what money needs moving.
          </p>
        </div>

        <div className="cvx-proof-grid">
          {proofCards.map(([title, body]) => (
            <article key={title} className="cvx-proof-card">
              <span />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cvx-section">
        <div className="cvx-section-head">
          <p className="cvx-eyebrow">One connected operating flow</p>
          <h2>From job to proof to invoice without the admin mess.</h2>
          <p>
            Every core part of Churvox is built to feed the next step, so the owner is not rebuilding context every time a job moves.
          </p>
        </div>

        <div className="cvx-feature-lanes">
          {featureGroups.map((group) => (
            <article key={group.title} className="cvx-feature-lane">
              <p>{group.eyebrow}</p>
              <h3>{group.title}</h3>
              <span>{group.body}</span>
              <div>
                {group.points.map((point) => <em key={point}>{point}</em>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cvx-section cvx-outcomes">
        <div>
          <p className="cvx-eyebrow">What customers should understand fast</p>
          <h2>Churvox does the admin prep. You stay in control.</h2>
        </div>

        <div className="cvx-outcome-grid">
          {outcomes.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className="cvx-final-cta">
        <div>
          <p className="cvx-eyebrow">Ready to run the office cleaner?</p>
          <h2>Give the business a proper operator desk.</h2>
          <p>Start with the core workflow, then grow into AI Operator, MYOB, payroll and higher-capacity command tools.</p>
        </div>
        <div className="cvx-final-actions">
          <Link to="/signup" className="cvx-button cvx-button--lime">Start free</Link>
          <Link to="/pricing" className="cvx-button cvx-button--cream">View pricing</Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
