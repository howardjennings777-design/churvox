import React from "react";
import { Link } from "react-router-dom";
import "./PublicProfessionSections.css";

export const INDUSTRY_PAGES = {
  "lawn-care": {
    title: "Lawn & garden",
    headline: "Run recurring outdoor work without losing the details.",
    intro: "Churvox keeps regular rounds, one-off tidy ups, photos, access notes, worker updates and invoice drafts tied to the right client.",
    examples: ["Fortnightly mowing rounds", "Hedge trim extras", "Gate and access notes", "Before/after proof", "Quick invoice drafts"],
    flow: ["Book the round", "Worker completes and sends proof", "Owner checks extras and invoice"],
  },
  landscaping: {
    title: "Landscaping",
    headline: "Keep quotes, staged work and extras under owner control.",
    intro: "For landscaping jobs, Churvox keeps the accepted scope, materials, crew notes, progress proof and invoice decisions together.",
    examples: ["Quote-led projects", "Materials and extras", "Crew notes", "Progress photos", "Staged billing review"],
    flow: ["Quote the scope", "Convert into staged jobs", "Approve extras before invoicing"],
  },
  cleaning: {
    title: "Cleaning",
    headline: "Make recurring visits, access notes and proof easier to manage.",
    intro: "Cleaning teams can keep site checklists, key/access notes, cleaner updates, client replies and repeat invoices in one clean record.",
    examples: ["Recurring visits", "Site checklists", "Access/key notes", "Cleaner updates", "Client follow-up"],
    flow: ["Schedule the visit", "Cleaner sends update", "Owner reviews client reply or invoice"],
  },
  "property-maintenance": {
    title: "Property maintenance",
    headline: "Handle mixed jobs, tenants, keys and repeat clients without chaos.",
    intro: "Property maintenance work changes every day. Churvox keeps tenants, landlords, job notes, photos, workers and money steps connected.",
    examples: ["Mixed repair jobs", "Tenant/landlord notes", "Keys and access", "Urgent fixes", "Job history"],
    flow: ["Record the issue", "Assign the right person", "Send proof and approve billing"],
  },
  handyman: {
    title: "Handyman & repairs",
    headline: "Small jobs still need clean admin.",
    intro: "Churvox helps handyman businesses keep parts, photos, client approvals, quotes, job notes and invoices from turning into messy messages.",
    examples: ["Small repairs", "Parts notes", "Photos", "Client approvals", "Quick quotes"],
    flow: ["Create the job", "Capture parts and proof", "Owner approves the invoice"],
  },
  painting: {
    title: "Painting",
    headline: "Keep scope, rooms, extras and final invoice review together.",
    intro: "Painting jobs need clear scope and proof. Churvox keeps rooms/areas, quote details, progress notes, extras and owner-approved billing in order.",
    examples: ["Room/area scope", "Quote details", "Progress proof", "Extras", "Final invoice check"],
    flow: ["Quote the work", "Track progress and extras", "Review final invoice"],
  },
  "plumbing-electrical-hvac": {
    title: "Plumbing, electrical & HVAC",
    headline: "Give urgent field work a safer admin handoff.",
    intro: "For technical service work, Churvox keeps job details, parts notes, proof, safety notes and owner-controlled customer/accounting handoff clear.",
    examples: ["Urgent callouts", "Parts notes", "Safety notes", "Proof photos", "Owner-controlled handoff"],
    flow: ["Capture the callout", "Worker records proof and parts", "Owner checks before sending"],
  },
  "pest-control": {
    title: "Pest control",
    headline: "Track visits, notes and follow-ups cleanly.",
    intro: "Pest control businesses can use Churvox for scheduled visits, treatment notes, follow-ups, proof and recurring customer reminders.",
    examples: ["Scheduled visits", "Treatment notes", "Follow-ups", "Proof", "Recurring reminders"],
    flow: ["Schedule the visit", "Record treatment and notes", "Follow up or invoice"],
  },
};

export const professions = [
  ["Lawn & garden", "Recurring rounds, one-off tidy ups, photos, gates, notes and quick invoices.", "lawn-care"],
  ["Landscaping", "Quotes, staged work, materials, crew notes, proof and owner-approved billing.", "landscaping"],
  ["Cleaning", "Site checklists, recurring visits, access notes, cleaner updates and client replies.", "cleaning"],
  ["Property maintenance", "Mixed jobs, tenants, keys, urgent fixes, repeat clients and job history.", "property-maintenance"],
  ["Handyman & repairs", "Small jobs, parts, photos, quotes, client approvals and invoice drafts.", "handyman"],
  ["Painting", "Quote scope, rooms/areas, progress proof, extras and final invoice review.", "painting"],
  ["Plumbing, electrical & HVAC", "Job details, parts notes, safety notes, proof and owner-controlled handoff.", "plumbing-electrical-hvac"],
  ["Pest control", "Visits, treatment notes, follow-ups, recurring reminders and clean records.", "pest-control"],
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

export function industryOptions() {
  return professions.map(([title, , slug]) => ({ label: title, value: slug }));
}

export function getIndustryBySlug(slug) {
  return INDUSTRY_PAGES[String(slug || "").trim()] || null;
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
            <div className="publicScreenRows">
              <span /><span /><span />
            </div>
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
