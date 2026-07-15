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
} from "./ChurvoxPublicShell";

export const Nav = PublicNav;
export const Footer = PublicFooter;

const DEFAULT_TRIAL_PATH = "/signup?plan=operator";

const tradeScenarios = {
  "Lawn care": {
    client: "Thompson Property",
    request: "Fortnightly lawn and edge tidy",
    worker: "Jamie",
    proof: "Completion photos and green-waste note",
    amount: "$145",
    followUp: "Next visit already prepared",
  },
  Cleaning: {
    client: "Harbour Offices",
    request: "Weekly commercial clean",
    worker: "Aroha",
    proof: "Checklist complete and supply note added",
    amount: "$320",
    followUp: "Supply cost ready for owner check",
  },
  Landscaping: {
    client: "Mason Family",
    request: "Garden refresh and planting",
    worker: "Sam",
    proof: "Before-and-after photos with material notes",
    amount: "$1,280",
    followUp: "Stage-two quote ready to review",
  },
  Handyman: {
    client: "Riverside Rentals",
    request: "Door repair and wall patch",
    worker: "Chris",
    proof: "Parts used and completion photos",
    amount: "$410",
    followUp: "Property manager update prepared",
  },
  Plumbing: {
    client: "Kauri Street Cafe",
    request: "Urgent leak callout",
    worker: "Taylor",
    proof: "Parts, time and repair note checked",
    amount: "$465",
    followUp: "Preventive follow-up ready to quote",
  },
  Electrical: {
    client: "Northside Workshop",
    request: "Lighting fault and safety check",
    worker: "Morgan",
    proof: "Test result, parts and site photos",
    amount: "$560",
    followUp: "Upgrade recommendation prepared",
  },
};

const ownerOutcomes = [
  ["What needs me?", "Only decisions, exceptions and approvals—not every background task."],
  ["What did Churvox prepare?", "Replies, quotes, invoices, job changes, reminders and the next useful action."],
  ["What is happening today?", "Jobs, workers, delays, client requests and money needing attention."],
  ["What happened without chasing?", "Acknowledged work, completion proof, viewed invoices and recorded replies."],
];

const officeRoles = [
  "Office Manager",
  "Receptionist",
  "Bookkeeper",
  "Accountant",
  "Payroll Clerk",
  "Client Memory",
  "Quality Checker",
  "Operations Manager",
];

const trustRules = [
  ["Nothing sends by itself", "Client messages, quotes, invoices and reminders stay prepared until the owner approves."],
  ["Nothing charges or pays by itself", "No customer charge, worker payment or bank payout happens without owner action."],
  ["No tax filing", "Churvox can prepare records and exports, but it does not file tax or submit to government."],
  ["Your records stay yours", "Business data is separated, exportable and controlled through owner-managed access."],
];

const proof = [
  ["1", "owner control room instead of decisions scattered across every page"],
  ["8", "specialist office roles working behind one simple experience"],
  ["0", "blind sends, charges, accounting syncs or tax filings"],
  ["14 days", "free trial with no card required upfront"],
];

const homePlanCopy = {
  Start: "Core jobs, clients, quotes and invoices.",
  Crew: "Worker flow, team updates and field records.",
  Operator: "Prepared admin and the owner Command desk.",
  Command: "The full approval engine for larger operations.",
};

function buildJourney(scenario) {
  return [
    {
      label: "Request",
      title: `${scenario.client} asks for work`,
      prepared: `Churvox captures the request, client details and the work needed: ${scenario.request}.`,
      owner: "Check the job details only if something is unclear.",
      result: "A clean job record is ready instead of another message to retype.",
    },
    {
      label: "Plan",
      title: "The job is prepared",
      prepared: `The address, timing, price basis and instructions are assembled for ${scenario.worker}.`,
      owner: "Approve the plan or adjust the details.",
      result: "The worker receives one clear version of the job.",
    },
    {
      label: "Field",
      title: `${scenario.worker} handles the work`,
      prepared: "Status, time, notes and field updates feed the same business record.",
      owner: "No action unless the worker flags an exception.",
      result: "The office record stays current without double handling.",
    },
    {
      label: "Proof",
      title: "Completion is checked",
      prepared: `${scenario.proof} are checked before the job moves forward.`,
      owner: "Resolve only missing or unusual details.",
      result: "The invoice is based on a complete job record.",
    },
    {
      label: "Money",
      title: `${scenario.amount} invoice is prepared`,
      prepared: "Client, job, amount, extras and proof are brought together in one review slip.",
      owner: "Approve, edit or park the invoice.",
      result: "Nothing is sent until the owner is happy.",
    },
    {
      label: "Next",
      title: scenario.followUp,
      prepared: "The next useful action is prepared from the real client and job history.",
      owner: "Approve the follow-up when it makes sense.",
      result: "The business keeps moving without relying on memory.",
    },
  ];
}

function OwnerControlRoom({ scenario }) {
  const queue = [
    ["Invoice ready", scenario.client, scenario.amount, "Money"],
    ["Worker update", scenario.request, "Reply prepared", "Work"],
    ["Next action", scenario.followUp, "Ready", "Follow-up"],
    ["Quality check", scenario.proof, "Checked", "Proof"],
  ];

  return (
    <aside className="cp26OwnerRoom" aria-label="Example Churvox owner control room">
      <header className="cp26OwnerRoomTop">
        <div><small>Example workspace · sample data only</small><strong>Owner Control Room</strong></div>
        <span>4 things need you</span>
      </header>
      <div className="cp26OwnerRoomPulse">
        <span><b>7</b><small>jobs moving</small></span>
        <span><b>3</b><small>workers active</small></span>
        <span><b>{scenario.amount}</b><small>ready to review</small></span>
      </div>
      <section className="cp26OwnerRoomQueue">
        {queue.map(([title, detail, value, tray], index) => (
          <article key={title} className={index === 0 ? "active" : ""}>
            <i>{index + 1}</i>
            <div><b>{title}</b><span>{detail}</span></div>
            <em>{tray}</em>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <footer className="cp26OwnerRoomDecision">
        <div><small>Owner decision</small><b>Invoice prepared from completed work</b><span>Job, amount and proof checked together.</span></div>
        <div><button type="button">Approve</button><button type="button">Edit</button><button type="button">Park</button></div>
        <p>Preview only. Nothing is sent, synced, charged or changed from this example.</p>
      </footer>
    </aside>
  );
}

export default function ExecutiveHomePage() {
  const [country] = React.useState(() => detectCountryCode());
  const [trade, setTrade] = React.useState("Lawn care");
  const [activeStep, setActiveStep] = React.useState(0);
  const plans = React.useMemo(
    () => CHURVOX_PLANS.map((plan) => pricePlanForCountry(plan, country)),
    [country],
  );
  const scenario = tradeScenarios[trade];
  const journey = React.useMemo(() => buildJourney(scenario), [scenario]);
  const step = journey[activeStep] || journey[0];

  React.useEffect(() => setActiveStep(0), [trade]);

  return (
    <main className="cp26Site cp26ControlRoomSite" data-version="CHURVOX_PUBLIC_ADMIN_ENGINE_20260710 CHURVOX_OWNER_CONTROL_ROOM_20260716">
      <PublicNav />

      <section className="cp26Hero cp26ControlHero">
        <div className="cp26HeroCopy">
          <Eyebrow>For owners who need the business handled—not another dashboard</Eyebrow>
          <h1>Your business handled. <span>Your decisions waiting.</span></h1>
          <p>
            Churvox prepares the jobs, messages, quotes, invoices and follow-ups. You open one control room, check what matters and approve.
          </p>
          <div className="cp26HeroActions">
            <a className="cp26Button" href="#owner-control-room">See my day in Churvox</a>
            <Link className="cp26Button cp26ButtonGhost" to={DEFAULT_TRIAL_PATH}>Start 14-day trial</Link>
          </div>
          <div className="cp26TrustRail">
            <span>No card upfront</span>
            <span>Nothing sends without approval</span>
            <span>Built for service businesses</span>
            <span>Setup help available</span>
          </div>
        </div>
        <OwnerControlRoom scenario={scenario} />
      </section>

      <section id="owner-control-room" className="cp26Section cp26WorkdaySection">
        <SectionHeading
          eyebrow="A 60-second working day"
          title="See the work arrive. See Churvox prepare it. Approve what matters."
          text="Choose a trade, then step through one realistic job from the first request to the next follow-up."
        />

        <div className="cp26TradePicker" aria-label="Choose a service business">
          {Object.keys(tradeScenarios).map((name) => (
            <button key={name} type="button" className={trade === name ? "active" : ""} aria-pressed={trade === name} onClick={() => setTrade(name)}>{name}</button>
          ))}
        </div>

        <div className="cp26Journey">
          <nav className="cp26JourneyRail" aria-label="Example Churvox workflow">
            {journey.map((item, index) => (
              <button key={item.label} type="button" className={activeStep === index ? "active" : ""} aria-pressed={activeStep === index} onClick={() => setActiveStep(index)}>
                <b>{index + 1}</b><span>{item.label}</span>
              </button>
            ))}
          </nav>
          <article className="cp26JourneyStage">
            <div className="cp26JourneyStory">
              <small>Step {activeStep + 1} of {journey.length} · {trade}</small>
              <h3>{step.title}</h3>
              <p>{step.prepared}</p>
            </div>
            <div className="cp26JourneyDecision">
              <section><span>Churvox prepares</span><b>{step.prepared}</b></section>
              <section><span>The owner does</span><b>{step.owner}</b></section>
              <section><span>The result</span><b>{step.result}</b></section>
            </div>
            <div className="cp26JourneyControls">
              <button type="button" onClick={() => setActiveStep((current) => Math.max(0, current - 1))} disabled={activeStep === 0}>Back</button>
              <button type="button" className="primary" onClick={() => setActiveStep((current) => Math.min(journey.length - 1, current + 1))} disabled={activeStep === journey.length - 1}>Next step</button>
              <Link to={`/demo?industry=${encodeURIComponent(trade.toLowerCase().replace(/\s+/g, "-"))}`}>Open full demo</Link>
            </div>
          </article>
        </div>
      </section>

      <section className="cp26Section cp26SectionDark">
        <SectionHeading
          eyebrow="The owner view"
          title="Four questions. One clear place to answer them."
          text="Churvox keeps routine work behind the scenes and brings the owner only the decisions, evidence and next actions that matter."
        />
        <div className="cp26OutcomeGrid">
          {ownerOutcomes.map(([title, text], index) => <article key={title}><small>0{index + 1}</small><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cp26Section">
        <div className="cp26Split cp26OfficeSplit">
          <div className="cp26SplitLead">
            <Eyebrow>Your hidden office team</Eyebrow>
            <h2>Eight strong roles. One simple owner experience.</h2>
            <p>Your hidden office team checks the record, prepares routine admin and keeps noise out of the owner’s way. You approve what matters.</p>
          </div>
          <div className="cp26OfficeRoleBoard">
            {officeRoles.map((role, index) => <span key={role}><i>{String(index + 1).padStart(2, "0")}</i><b>{role}</b></span>)}
          </div>
        </div>
      </section>

      <section className="cp26Section cp26TrustSection">
        <SectionHeading
          eyebrow="Owner guardrails"
          title="Prepared does not mean automatic."
          text="Churvox is designed to reduce admin without taking control away from the business owner."
        />
        <div className="cp26TrustGrid">
          {trustRules.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
        <div className="cp26TrustStatement">
          <strong>Churvox does the admin. The owner checks and approves.</strong>
          <span>That rule stays consistent across messages, quotes, invoices, accounting handoff, worker payments and business records.</span>
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

      <section className="cp26Closing cp26ControlClosing">
        <div>
          <Eyebrow light>Ready for one real job?</Eyebrow>
          <h2>Get a useful result before you configure everything.</h2>
          <p>Add one client, create one job and see what Churvox prepares. The rest can come later.</p>
        </div>
        <div className="cp26ClosingActions">
          <Link className="cp26Button" to={DEFAULT_TRIAL_PATH}>Start 14-day trial</Link>
          <Link className="cp26Button cp26ButtonGhost" to="/demo">Run the 60-second demo</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
