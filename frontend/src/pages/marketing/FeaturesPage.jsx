import React from "react";
import { Link } from "react-router-dom";
import { FeatureRibbon, PublicSiteShell, featureGroups } from "./PublicSiteShell";

const rows = [
  {
    label: "AI Operator",
    title: "Prepared work slips instead of another job list.",
    text: "Churvox surfaces what needs doing, prepares the next action and keeps the owner in approval mode instead of admin panic mode.",
    bullets: ["Approval queue", "Suggested next actions", "Invoice and quote prep", "Owner-first control"],
  },
  {
    label: "Jobs and field work",
    title: "The crew knows the work. The office gets the proof.",
    text: "Jobs, worker assignment, statuses, time, notes and proof photos stay tied to the client and the admin that follows.",
    bullets: ["Create and assign jobs", "Worker mobile flow", "Completion proof", "Time and status trail"],
  },
  {
    label: "Quotes and invoices",
    title: "Money work has context from the job.",
    text: "Turn job notes, photos, client data and pricing into a cleaner quote and invoice workflow that does not start from scratch every time.",
    bullets: ["Quote workflow", "Invoice workflow", "Customer follow-up", "Payment-ready records"],
  },
  {
    label: "Team, roles and payroll",
    title: "Give each person the right part of the system.",
    text: "Owners run the business, workers see field tasks, managers and office admins help move work, payroll can review hours without full owner access.",
    bullets: ["Owner", "Manager", "Office Admin", "Worker", "Payroll"],
  },
];

export default function FeaturesPage() {
  return (
    <PublicSiteShell page="features">
      <section className="cvx-page-hero">
        <p className="cvx-eyebrow">Features built as one flow</p>
        <h1>The whole office, turned into clear work to approve.</h1>
        <p>
          Churvox is not built as a pile of random tools. Jobs, clients, crew updates, proof, quotes, invoices and money follow-up are connected so the next move is easier.
        </p>
        <div className="cvx-hero-actions">
          <Link to="/signup" className="cvx-button cvx-button--lime">Start free</Link>
          <Link to="/pricing" className="cvx-button cvx-button--cream">View pricing</Link>
        </div>
        <FeatureRibbon items={["Job management", "AI prep", "Worker app", "Invoices", "Quotes", "Payroll", "MYOB"]} />
      </section>

      <section className="cvx-feature-story">
        {rows.map((row, index) => (
          <article key={row.title} className="cvx-story-row">
            <div className="cvx-story-number">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <p className="cvx-eyebrow">{row.label}</p>
              <h2>{row.title}</h2>
              <p>{row.text}</p>
            </div>
            <div className="cvx-story-bullets">
              {row.bullets.map((bullet) => <span key={bullet}>{bullet}</span>)}
            </div>
          </article>
        ))}
      </section>

      <section className="cvx-section">
        <div className="cvx-section-head">
          <p className="cvx-eyebrow">The operating lanes</p>
          <h2>Everything points back to less owner admin.</h2>
          <p>Each lane has a job. Keep work moving, prepare admin and give the owner one clear place to approve.</p>
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

      <section className="cvx-final-cta">
        <div>
          <p className="cvx-eyebrow">Simple idea. Strong system.</p>
          <h2>Work comes in. Churvox prepares. You approve.</h2>
          <p>The website now sells the real Churvox idea: a practical AI operator for trade businesses.</p>
        </div>
        <div className="cvx-final-actions">
          <Link to="/signup" className="cvx-button cvx-button--lime">Start free</Link>
          <Link to="/pricing" className="cvx-button cvx-button--cream">See plans</Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
