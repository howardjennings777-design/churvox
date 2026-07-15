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
  coreAreas,
} from "./ChurvoxPublicShell";

export const Nav = PublicNav;
export const Footer = PublicFooter;

const DEFAULT_TRIAL_PATH = "/signup?plan=operator";

const tradeJourneys = {
  lawn: {
    label: "Lawn care",
    industry: "lawn-care",
    ownerLine: "Four decisions are waiting. The mowing schedule is already handled.",
    items: [
      ["Quote ready", "Thompson Property", "Hedge trim and green waste", "$340", "Approve"],
      ["Worker update", "Tomorrow · 8:30am", "Arrival moved by 30 minutes", "Reply prepared", "Review"],
      ["Completed job", "Kauri Street", "Photos and time checked", "Invoice ready", "Approve"],
      ["Payment follow-up", "Riverside Body Corp", "7 days overdue", "Reminder prepared", "Review"],
    ],
  },
  cleaning: {
    label: "Cleaning",
    industry: "cleaning",
    ownerLine: "The regular cleans are running. Only the exceptions need you.",
    items: [
      ["Booking ready", "Harbour Offices", "Fortnightly commercial clean", "$480", "Approve"],
      ["Access issue", "Friday · 6:00pm", "Door code needs confirming", "Reply prepared", "Review"],
      ["Completed clean", "Fernhill House", "Checklist and photos checked", "Invoice ready", "Approve"],
      ["Client request", "Miller Family", "Add oven clean next visit", "$85 extra", "Review"],
    ],
  },
  landscaping: {
    label: "Landscaping",
    industry: "landscaping",
    ownerLine: "Jobs are moving. Churvox has separated progress from decisions.",
    items: [
      ["Variation ready", "Wilson Courtyard", "Extra drainage requested", "$1,240", "Approve"],
      ["Worker update", "North Shore project", "Materials delayed one day", "Client reply ready", "Review"],
      ["Stage complete", "Fern Grove", "Proof and labour checked", "Invoice ready", "Approve"],
      ["Quote follow-up", "King Residence", "Viewed two days ago", "Follow-up prepared", "Review"],
    ],
  },
  handyman: {
    label: "Handyman",
    industry: "handyman",
    ownerLine: "Callouts, repairs and follow-ups are together instead of scattered.",
    items: [
      ["Quote ready", "Oakridge Rentals", "Three maintenance repairs", "$720", "Approve"],
      ["Parts update", "Bathroom repair", "Replacement fitting required", "Client reply ready", "Review"],
      ["Job complete", "Pine Avenue", "Time and materials checked", "Invoice ready", "Approve"],
      ["Return visit", "City Apartment", "Tenant availability received", "Booking prepared", "Review"],
    ],
  },
  plumbing: {
    label: "Plumbing",
    industry: "plumbing",
    ownerLine: "Urgent work stays visible without turning the whole day into noise.",
    items: [
      ["Callout ready", "Lake Road", "Leak investigation", "$185", "Approve"],
      ["Parts approval", "Hot-water repair", "Replacement valve needed", "$146", "Review"],
      ["Work complete", "Parkside Café", "Photos, time and parts checked", "Invoice ready", "Approve"],
      ["Safety follow-up", "Rental inspection", "Owner note prepared", "Reply prepared", "Review"],
    ],
  },
  electrical: {
    label: "Electrical",
    industry: "electrical",
    ownerLine: "Churvox keeps the job record complete before money or messages move.",
    items: [
      ["Quote ready", "Rimu Workshop", "Lighting replacement", "$1,860", "Approve"],
      ["Site update", "Switchboard job", "Extra circuit identified", "Variation ready", "Review"],
      ["Work complete", "Coastal Retail", "Safety notes and proof checked", "Invoice ready", "Approve"],
      ["Client follow-up", "Evans Residence", "Quote viewed yesterday", "Email prepared", "Review"],
    ],
  },
};

const outcomes = [
  ["What needs me?", "Only decisions, corrections and exceptions reach the owner."],
  ["What did Churvox prepare?", "Quotes, invoices, replies, reminders and job changes are ready to review."],
  ["What is happening today?", "Jobs, workers, delays and money needing attention are visible together."],
  ["What happened without chasing?", "Acknowledgements, completed work, viewed invoices and replies stay recorded."],
];

const trust = [
  ["Nothing sends without approval", "Client emails, worker messages and reminders stay editable until you approve."],
  ["Nothing charges or pays automatically", "Churvox does not move money, create payouts or charge clients by itself."],
  ["No tax filing behind your back", "Accounting preparation and exports remain owner-controlled."],
  ["Your records stay yours", "Business records are separated, exportable and removable through account controls."],
];

const firstWin = [
  ["1", "Add one real client"],
  ["2", "Create their next job"],
  ["3", "Assign the worker"],
  ["4", "See what Churvox prepares"],
];

const homePlanCopy = {
  Start: "Core jobs, clients, quotes and invoices.",
  Crew: "Worker flow, team updates and field records.",
  Operator: "Prepared admin and the owner Command desk.",
  Command: "The full approval engine for larger operations.",
};

function OwnerControlRoom({ journey }) {
  return (
    <aside className="cp26ControlRoom" aria-label={`Example ${journey.label} owner control room`}>
      <header className="cp26ControlRoomHead">
        <div>
          <small>Sample workspace · no real records</small>
          <strong>Owner Control Room</strong>
          <p>{journey.ownerLine}</p>
        </div>
        <span>4 need you</span>
      </header>
      <div className="cp26ControlRoomRail">
        <span className="active">Needs you</span><span>Today</span><span>Prepared</span><span>Done</span>
      </div>
      <div className="cp26DecisionStack">
        {journey.items.map(([type, client, detail, value, action], index) => (
          <article key={`${type}-${client}`} className={index === 0 ? "selected" : ""}>
            <div className="cp26DecisionNumber">{index + 1}</div>
            <div className="cp26DecisionCopy"><small>{type}</small><b>{client}</b><span>{detail}</span></div>
            <div className="cp26DecisionValue"><strong>{value}</strong><em>{action}</em></div>
          </article>
        ))}
      </div>
      <footer className="cp26ControlRoomFoot">
        <span>Churvox prepared the admin.</span>
        <b>You make the decision.</b>
      </footer>
    </aside>
  );
}

export default function ExecutiveHomePage() {
  const [country] = React.useState(() => detectCountryCode());
  const [tradeKey, setTradeKey] = React.useState("lawn");
  const journey = tradeJourneys[tradeKey];
  const plans = React.useMemo(
    () => CHURVOX_PLANS.map((plan) => pricePlanForCountry(plan, country)),
    [country],
  );
  const demoPath = `/demo?industry=${encodeURIComponent(journey.industry)}`;
  const trialPath = `${DEFAULT_TRIAL_PATH}&industry=${encodeURIComponent(journey.industry)}`;

  return (
    <main className="cp26Site cp26ControlRoomSite" data-version="CHURVOX_OWNER_CONTROL_ROOM_20260716">
      <PublicNav />

      <section className="cp26Hero cp26ControlHero">
        <div className="cp26HeroCopy">
          <Eyebrow>One control room for service-business owners</Eyebrow>
          <h1>Your business handled. <span>Your decisions waiting.</span></h1>
          <p>
            Churvox prepares the jobs, messages, quotes, invoices and follow-ups. You open one owner control room, check what matters and approve.
          </p>
          <div className="cp26HeroActions">
            <Link className="cp26Button" to={demoPath}>See my day in Churvox</Link>
            <Link className="cp26Button cp26ButtonGhost" to={trialPath}>Start 14-day trial</Link>
          </div>
          <div className="cp26TradeChooser" aria-label="Choose a service business">
            <small>Show me Churvox for</small>
            <div>
              {Object.entries(tradeJourneys).map(([key, item]) => (
                <button key={key} type="button" className={key === tradeKey ? "active" : ""} onClick={() => setTradeKey(key)}>{item.label}</button>
              ))}
            </div>
          </div>
          <div className="cp26TrustRail">
            <span>No card upfront</span>
            <span>Nothing auto-sends</span>
            <span>Owner approval stays in control</span>
          </div>
        </div>
        <OwnerControlRoom journey={journey} />
      </section>

      <section className="cp26Section cp26OutcomeSection">
        <SectionHeading
          eyebrow="The owner view"
          title="Four questions. No dashboard hunting."
          text="Churvox is organised around what an owner needs to know—not around software modules that need managing."
        />
        <div className="cp26OutcomeGrid">
          {outcomes.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="cp26Section cp26SectionDark cp26DayFlowSection">
        <SectionHeading
          eyebrow="A working day"
          title="See the work arrive. See Churvox prepare it. Approve what matters."
          text="The product story is one continuous business flow, not a list of disconnected features."
        />
        <div className="cp26DayFlow">
          {[
            ["01", "Client asks", "A request, booking, change or question enters the business."],
            ["02", "Churvox prepares", "The client, job, worker, price and history are brought together."],
            ["03", "Worker does the job", "Acknowledgement, progress, time, notes and proof update the record."],
            ["04", "Owner approves", "Only the quote, reply, variation or invoice needing a decision comes back."],
          ].map(([number, title, text]) => <article key={number}><b>{number}</b><h3>{title}</h3><p>{text}</p></article>)}
        </div>
        <div className="cp26CenteredActions">
          <Link className="cp26Button" to={demoPath}>Open the 60-second walkthrough</Link>
        </div>
      </section>

      <section className="cp26Section cp26FirstWinSection">
        <div className="cp26Split">
          <div className="cp26SplitLead">
            <Eyebrow>Your first useful result</Eyebrow>
            <h2>Do one real job before setting up everything.</h2>
            <p>New owners should not face an empty system or a wall of settings. Churvox guides them to one complete client-and-job flow first.</p>
            <div className="cp26HeroActions"><Link className="cp26Button" to={trialPath}>Get my first job organised</Link></div>
          </div>
          <div className="cp26FirstWinSteps">
            {firstWin.map(([number, text]) => <article key={number}><b>{number}</b><span>{text}</span></article>)}
          </div>
        </div>
      </section>

      <section className="cp26Section cp26TrustSection">
        <SectionHeading
          eyebrow="Owner control is the product"
          title="Prepared does not mean automatic."
          text="Churvox does the routine preparation while the owner keeps authority over communication, money, accounting and access."
        />
        <div className="cp26TrustGrid">
          {trust.map(([title, text]) => <article key={title}><span>✓</span><div><h3>{title}</h3><p>{text}</p></div></article>)}
        </div>
      </section>

      <section className="cp26Section">
        <div className="cp26Split">
          <div className="cp26SplitLead">
            <Eyebrow>The complete workspace</Eyebrow>
            <h2>Each page holds the facts. Command holds the decision.</h2>
            <p>Jobs controls work. Clients holds the relationship. Workers tracks the field. Quotes and invoices manage the money trail. The owner does not have to run every page.</p>
            <div className="cp26HeroActions"><Link className="cp26Button" to="/product">See the full product</Link></div>
          </div>
          <div className="cp26AreaGrid">
            {coreAreas.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
          </div>
        </div>
      </section>

      <section className="cp26Section">
        <SectionHeading
          eyebrow="Pricing"
          title="Start where the business is now."
          text="The same plan configuration is used here and at checkout. Move up only when the team, admin load or approval needs grow."
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
          <Eyebrow light>The owner control room</Eyebrow>
          <h2>Stop running the software. Run the business.</h2>
          <p>See the work, review what Churvox prepared and approve from one clear owner experience.</p>
        </div>
        <div className="cp26ClosingActions">
          <Link className="cp26Button" to={demoPath}>See my day in Churvox</Link>
          <Link className="cp26Button cp26ButtonGhost" to={trialPath}>Start free trial</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
