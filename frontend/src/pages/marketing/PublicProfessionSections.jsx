import React from "react";
import { Link } from "react-router-dom";
import "./PublicProfessionSections.css";

export const professions = [
  ["Lawn & garden", "Recurring rounds, one-off tidy ups, photos, gates, notes and quick invoices."],
  ["Landscaping", "Quotes, staged work, materials, crew notes, proof and owner-approved billing."],
  ["Cleaning", "Site checklists, recurring visits, access notes, cleaner updates and client replies."],
  ["Property maintenance", "Mixed jobs, tenants, keys, urgent fixes, repeat clients and job history."],
  ["Handyman & repairs", "Small jobs, parts, photos, quotes, client approvals and invoice drafts."],
  ["Painting", "Quote scope, rooms/areas, progress proof, extras and final invoice review."],
  ["Plumbing, electrical & HVAC", "Job details, parts notes, safety notes, proof and owner-controlled handoff."],
  ["Pest control", "Visits, treatment notes, follow-ups, recurring reminders and clean records."],
];

export const businessCoverage = [
  ["Jobs", "One-off, recurring, assigned, completed and checked."],
  ["Clients", "Contacts, addresses, access notes, pricing and history."],
  ["Workers", "Status, location notes, proof, messages and timesheets."],
  ["Quotes", "Scope, price, follow-up and convert-to-job flow."],
  ["Invoices", "Drafts, due, paid, overdue, export and guarded sync."],
  ["Command", "Approve, edit or park important decisions in one place."],
];

const tradeFlows = [
  ["Regular service work", "Lawn care, cleaning, pest control", "Repeat visits, access notes, proof, invoice drafts and follow-up reminders stay together."],
  ["Quote-led work", "Landscaping, painting, handyman", "Scope, price, materials, extras and accepted quote detail can move into the job without retyping."],
  ["Urgent field work", "Maintenance, plumbing, electrical, HVAC", "Worker notes, photos, parts and client updates come back to the owner before anything risky is sent."],
];

export function ProfessionStrip({ compact = false }) {
  return (
    <section className={`publicProfessionBand ${compact ? "compact" : ""}`}>
      <div className="publicSectionHead compactHead">
        <span className="publicKicker">Who Churvox fits</span>
        <h2>Built for service businesses that run jobs in the real world.</h2>
        <p>
          Churvox is not locked to one trade. The same job → proof → quote/invoice → owner approval flow works across outdoor, indoor, property and mobile service teams.
        </p>
      </div>
      <div className="publicProfessionGrid">
        {professions.map(([title, text]) => (
          <article key={title}>
            <b>{title}</b>
            <span>{text}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TradeFlowSection() {
  return (
    <section className="publicTradeFlowBand">
      <div className="publicSectionHead compactHead">
        <span className="publicKicker">Different trade, same admin problem</span>
        <h2>The wording can change by profession. The engine stays the same.</h2>
      </div>
      <div className="publicTradeFlowGrid">
        {tradeFlows.map(([title, fit, text]) => (
          <article key={title}>
            <small>{fit}</small>
            <b>{title}</b>
            <span>{text}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BusinessCoverageSection() {
  return (
    <section className="publicCoverageBand">
      <div>
        <span className="publicKicker">Real business coverage</span>
        <h2>Enough to run the day, not just look good on a landing page.</h2>
        <p>
          The site now makes the core promise clearer: Churvox keeps the job record, field update, customer detail, money step and owner decision connected.
        </p>
        <div className="publicActions">
          <Link to="/demo" className="publicPrimary">See the demo</Link>
          <Link to="/pricing" className="publicSecondary">View pricing</Link>
        </div>
      </div>
      <div className="publicCoverageGrid">
        {businessCoverage.map(([title, text]) => (
          <article key={title}>
            <b>{title}</b>
            <span>{text}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
