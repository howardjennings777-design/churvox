import React from "react";
import { Link } from "react-router-dom";
import { INDUSTRIES, INDUSTRY_ORDER, getIndustry, industryOptions as sharedIndustryOptions } from "../../config/churvoxIndustrySystem";
import "./PublicProfessionSections.css";

export const professions = INDUSTRY_ORDER.map((slug) => [INDUSTRIES[slug].title, INDUSTRIES[slug].intro, slug]);

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

export function industryOptions() {
  return sharedIndustryOptions(false);
}

export function getIndustryBySlug(slug) {
  return getIndustry(slug);
}

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
        {professions.map(([title, text, slug]) => (
          <Link to={`/industries/${slug}`} className="publicProfessionCard" key={title}>
            <b>{title}</b>
            <span>{text}</span>
            <em>View fit</em>
          </Link>
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

export function ProductScreensSection() {
  const screens = [
    ["Today", "The day opens with jobs, workers, money and owner checks already grouped."],
    ["Command", "Prepared quotes, invoices, replies and issues wait for approve, edit or park."],
    ["Workers", "Field status, proof, location notes and timesheets sit beside the run sheet."],
  ];
  return (
    <section className="publicScreensBand">
      <div className="publicSectionHead compactHead">
        <span className="publicKicker">Product preview</span>
        <h2>Not just marketing cards. This matches the app logic.</h2>
        <p>The public site now shows the same operating idea customers meet after signup: Today runs the day, work pages hold details, Command holds decisions.</p>
      </div>
      <div className="publicScreenGrid">
        {screens.map(([title, text], index) => (
          <article key={title} className={index === 1 ? "active" : ""}>
            <header><small>Churvox</small><b>{title}</b></header>
            <div className="publicScreenRows"><span /><span /><span /></div>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BetaProofSection() {
  return (
    <section className="publicBetaBand">
      <div>
        <span className="publicKicker">Honest beta proof</span>
        <h2>Built with real operators, not fake testimonials.</h2>
        <p>
          Churvox is opening selected tester access so service businesses can run real jobs through the flow and shape what gets polished next. We will only use real feedback when people have actually tested it.
        </p>
      </div>
      <div className="publicBetaGrid">
        <article><b>What testers check</b><span>Jobs, worker flow, quotes, invoices, Command approvals and setup friction.</span></article>
        <article><b>What Churvox learns</b><span>Which wording, screens and automations fit each profession without making the app messy.</span></article>
        <article><b>What stays honest</b><span>No fake quotes. No made-up customer claims. Real proof only when it exists.</span></article>
      </div>
    </section>
  );
}
