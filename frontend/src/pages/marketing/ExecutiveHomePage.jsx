import React from "react";
import { Link } from "react-router-dom";
import {
  CHURVOX_PLANS,
  detectCountryCode,
  pricePlanForCountry,
} from "../../config/churvoxPlans";
import {
  PublicNav,
  PublicFooter,
  Eyebrow,
  SectionHeading,
  CommandPreview,
  coreAreas,
  serviceTypes,
} from "./ChurvoxPublicShell";

export const Nav = PublicNav;
export const Footer = PublicFooter;

const DEFAULT_TRIAL_PATH = "/signup?plan=operator";

const roles = [
  ["Office Manager", "Ranks what matters and keeps routine work out of the owner’s way."],
  ["Receptionist", "Prepares booking, rebooking and client follow-up decisions."],
  ["Bookkeeper", "Builds cautious invoice and payment-follow-up drafts from real records."],
  ["Accountant", "Checks GST, export readiness and accounting risk without filing anything."],
  ["Payroll Clerk", "Reviews recorded hours and flags timers that genuinely need attention."],
  ["Client Memory", "Keeps useful preferences and history attached to the right client."],
  ["Quality Checker", "Finds missing proof, notes or completion details before money moves."],
  ["Operations Manager", "Surfaces repeated problems and prepares better process decisions."],
];

const flow = [
  ["The work happens", "Jobs, messages, worker updates, proof, quotes and invoices create the business record."],
  ["Churvox checks it", "The hidden office team looks for missing facts, prepares routine admin and suppresses noise."],
  ["You approve exceptions", "Only genuine decisions come to Command, with the evidence and editable details together."],
];

const proof = [
  ["8", "specialist office roles behind one simple owner experience"],
  ["1", "approval desk instead of decisions scattered across every page"],
  ["0", "blind sends, charges, accounting syncs or tax filings"],
  ["14 days", "free trial with no card required upfront"],
];

const homePlanCopy = {
  Start: "Core jobs, clients, quotes and invoices.",
  Crew: "Worker flow, team updates and field records.",
  Operator: "Prepared admin and the owner Command desk.",
  Command: "The full approval engine for larger operations.",
};

export default function ExecutiveHomePage() {
  const [country] = React.useState(() => detectCountryCode());
  const plans = React.useMemo(
    () => CHURVOX_PLANS.map((plan) => pricePlanForCountry(plan, country)),
    [country],
  );

  return (
    <main className="cp26Site" data-version="CHURVOX_PUBLIC_ADMIN_ENGINE_20260712_PAID_LAUNCH_CTAS">
      <PublicNav />

      <section className="cp26Hero">
        <div className="cp26HeroCopy">
          <Eyebrow>For service businesses that have outgrown scattered admin</Eyebrow>
          <h1>Your hidden office team. <span>You approve what matters.</span></h1>
          <p>
            Churvox connects jobs, clients, workers, messages, quotes and invoices, handles the routine admin behind the scenes, and brings only real decisions back to the owner in Command.
          </p>
          <div className="cp26HeroActions">
            <Link className="cp26Button" to={DEFAULT_TRIAL_PATH}>Start 14-day trial</Link>
            <Link className="cp26Button cp26ButtonGhost" to="/demo">Open product demo</Link>
          </div>
          <div className="cp26TrustRail">
            <span>No card upfront</span>
            <span>Built for multi-trade service businesses</span>
            <span>Owner approval stays in control</span>
            <span>Setup help available</span>
          </div>
        </div>
        <CommandPreview />
      </section>

      <section className="cp26Section cp26SectionDark">
        <SectionHeading
          eyebrow="The hidden office"
          title="Eight strong roles. One simple owner experience."
          text="Churvox picks the right office role, checks the record and sends the evidence-backed result to Command only when needed."
        />
        <div className="cp26RoleStrip">
          {roles.map(([name, text]) => <article key={name}><strong>{name}</strong><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cp26Section">
        <SectionHeading
          eyebrow="How Churvox works"
          title="Less operating software. More running the business."
          text="The work pages hold the facts. Churvox prepares the admin. Command holds the decision."
        />
        <div className="cp26FlowGrid">
          {flow.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cp26Section">
        <div className="cp26Split">
          <div className="cp26SplitLead">
            <Eyebrow>Purpose-built pages</Eyebrow>
            <h2>Every page has one clear job.</h2>
            <p>Churvox is not a pile of matching dashboard cards. Jobs controls work. Clients holds the relationship. Workers tracks the field. Quotes manages the pipeline. Invoices manages collection.</p>
            <div className="cp26HeroActions">
              <Link className="cp26Button" to="/product">See the product</Link>
            </div>
          </div>
          <div className="cp26AreaGrid">
            {coreAreas.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
          </div>
        </div>
      </section>

      <section className="cp26Section">
        <div className="cp26Split">
          <div className="cp26SplitLead">
            <Eyebrow>Built for real service work</Eyebrow>
            <h2>One system that speaks the language of the business.</h2>
            <p>Use jobs, appointments, visits or services. Use workers, cleaners, stylists, technicians or subcontractors. Churvox keeps the operating model consistent without forcing every business to sound the same.</p>
          </div>
          <div className="cp26IndustryGrid">
            {serviceTypes.map((type) => <span key={type}>{type}</span>)}
          </div>
        </div>
      </section>

      <section className="cp26Section">
        <div className="cp26ProofBand">
          {proof.map(([value, label]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}
        </div>
      </section>

      <section className="cp26Section">
        <SectionHeading
          eyebrow="Pricing"
          title="Start where the business is now."
          text="Prices below come from the same plan configuration used by checkout. Move up only when the team, admin load or approval needs grow."
        />
        <div className="cp26PlanGrid">
          {plans.map((plan) => (
            <article key={plan.key || plan.name} className={`cp26PlanCard${plan.popular ? " featured" : ""}`}>
              {plan.popular ? <span className="cp26PlanBadge">Most Popular</span> : null}
              <h3>{plan.name}</h3>
              <div className="cp26PlanPrice">{plan.priceLabel}</div>
              {plan.taxInclusiveLabel ? <small>{plan.taxInclusiveLabel}</small> : null}
              <p>{homePlanCopy[plan.name] || plan.summary}</p>
              <Link className={`cp26Button${plan.popular ? "" : " cp26ButtonGhost"}`} to="/pricing">View plan</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="cp26Closing">
        <div>
          <Eyebrow light>Ready to see the full flow?</Eyebrow>
          <h2>Open the demo, then decide whether Churvox fits your business.</h2>
          <p>See how the owner workspace works, then start a trial when you are ready.</p>
        </div>
        <div className="cp26ClosingActions">
          <Link className="cp26Button" to="/demo">Open demo</Link>
          <Link className="cp26Button cp26ButtonGhost" to={DEFAULT_TRIAL_PATH}>Start free trial</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
