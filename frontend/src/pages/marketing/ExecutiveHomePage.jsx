import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
// removed broken css import
// removed broken css import
// removed broken css import

const navLinks = [
  ["/features", "How it works"],
  ["/pricing", "Pricing"],
  ["/about", "About"],
  ["/security", "Security"],
  ["/contact", "Contact"],
  ["/login", "Log in"],
];

const proof = [
  "14-day free trial",
  "No card upfront",
  "Owner approval stays in Command",
  "Built for service businesses",
];

const businessTypes = [
  ["Trades", "Plumbing, electrical, painting, repairs, installs and maintenance."],
  ["Property services", "Cleaning, lawn care, landscaping, pest control and handyman work."],
  ["Mobile teams", "Workers on the road, office messages, time, photos and job notes."],
  ["Growing crews", "A simple way to keep jobs, clients, quotes, invoices and staff lined up."],
];

const osAreas = [
  ["Today", "A clear view of the day: jobs moving, workers active, money due and messages that need attention."],
  ["Command", "The approval desk. Approve, edit or park prepared admin from one place."],
  ["Jobs", "Create, edit and schedule work with client, worker, date, time, price and recurrence details."],
  ["Clients", "Keep service history, notes, pricing memory and job records together."],
  ["Workers", "Give the team simple job instructions, directions, messages and finish flow."],
  ["Money", "Quotes, invoices, due money, paid work and safe draft accounting handoff."],
];

const workflow = [
  ["1", "Work comes in", "Add a job, import a client, receive a message or get a worker update."],
  ["2", "Churvox prepares", "The admin details are organised from the records you already have."],
  ["3", "Command shows it", "Anything that needs a decision goes to one approval desk."],
  ["4", "You approve", "Approve, edit or park. No guessing. No hidden decisions."],
];

const guardrails = [
  ["No automatic invoice sending", "Churvox can prepare invoices, but sending stays owner-approved."],
  ["No scattered approval buttons", "Important decisions live in Command, not across every page."],
  ["Safe accounting handoff", "Draft sync only where available. No tax filing. No bank payout files."],
  ["Clear missing details", "If information is missing, it is surfaced instead of quietly moving forward."],
];

const operatingMoments = [
  ["Worker finishes a job", "Notes, time and photos are tied back to the job so the office can act."],
  ["Quote needs a follow-up", "Churvox keeps the client, quote and job context together."],
  ["Invoice needs checking", "Price, job, client and worker details are prepared before owner approval."],
  ["Customer asks for a change", "The message stays visible and the next decision goes to Command."],
];

const trustPoints = [
  ["Simple for the owner", "You see what matters, then approve it."],
  ["Simple for workers", "They see jobs, directions, messages, start and finish."],
  ["Built around control", "Churvox prepares admin, but the business owner stays in charge."],
];

function PublicNavLink({ to, label }) {
  return <Link to={to}>{label}</Link>;
}

export function Nav() {
  return (
    <nav className="publicNav" aria-label="Public navigation">
      <Link to="/" className="publicBrand" aria-label="Churvox home">
        <ChurvoxLogo variant="mark" size="lg" />
        <span>
          <b>Churvox</b>
          <small>does the admin</small>
        </span>
      </Link>

      <div className="publicLinks">
        {navLinks.map(([to, label]) => (
          <PublicNavLink key={to} to={to} label={label} />
        ))}
        <Link to="/signup" className="publicPrimary">Start trial</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="publicFooter">
      <div className="publicFooterBrand">
        <ChurvoxLogo variant="mark" size="md" />
        <span>
          <b>Churvox</b>
          <small>Churvox does the admin. You approve.</small>
        </span>
      </div>
      <nav aria-label="Footer navigation">
        <Link to="/features">How it works</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/about">About</Link>
        <Link to="/security">Security</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/refunds-cancellations">Refunds & cancellations</Link>
        <Link to="/request">Customer request form</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-of-service">Terms</Link>
        <Link to="/login">Log in</Link>
      </nav>
    </footer>
  );
}

function ProductMock() {
  return (
    <aside className="publicMock" aria-label="Churvox preview">
      <div className="publicMockTop">
        <span>Command</span>
        <b>Prepared admin, ready to approve</b>
      </div>
      <div className="publicMockTabs">
        <span>Today</span>
        <span className="active">Command</span>
        <span>Jobs</span>
        <span>Workers</span>
      </div>
      <div className="publicMockGrid">
        <section>
          <small>Waiting for owner</small>
          <article>
            <b>Invoice ready</b>
            <span>Job, time, photos and price are together</span>
          </article>
          <article>
            <b>Quote follow-up</b>
            <span>Client history and quote status are ready</span>
          </article>
          <article>
            <b>Missing job time</b>
            <span>Needs date and worker time before it moves on</span>
          </article>
        </section>
        <section>
          <small>Approval slip</small>
          <div className="publicSlip">
            <b>Invoice ready</b>
            <span>Client: Belmont Villas</span>
            <span>Job: Hedge trim</span>
            <span>Photos: 3 + worker note</span>
            <span>Next step: approve, edit or park</span>
          </div>
          <div className="publicMockActions">
            <span>Approve</span>
            <span>Edit</span>
            <span>Park</span>
          </div>
        </section>
      </div>
    </aside>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="publicSite" data-version="CHURVOX_PUBLIC_BUSINESS_READY_20260704_NAV_SAFE">
      <Nav />

      <section className="publicHero">
        <div className="publicHeroCopy">
          <span className="publicKicker">Admin engine for service businesses</span>
          <h1>Churvox does the admin. You approve.</h1>
          <p>
            Churvox keeps jobs, clients, workers, quotes, invoices, messages and safe accounting handoff in one clean system. It prepares the admin from real records, then sends important decisions to Command for owner approval.
          </p>
          <div className="publicActions">
            <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
            <Link to="/features" className="publicSecondary">See how it works</Link>
          </div>
          <div className="publicProof">
            {proof.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <ProductMock />
      </section>

      <section className="publicBand publicStatement">
        <span className="publicKicker">The point</span>
        <h2>Less chasing. Less guessing. One approval desk.</h2>
        <p>
          Owners should not have to search through every page to find what needs a decision. Churvox prepares the next admin move and keeps final approval in Command.
        </p>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">How it works</span>
          <h2>Four steps that make sense.</h2>
        </div>
        <div className="publicFlow">
          {workflow.map(([num, title, text]) => (
            <article key={title}>
              <i>{num}</i>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicSplit">
        <div>
          <span className="publicKicker">Who it is for</span>
          <h2>Built for service businesses that move fast.</h2>
          <p>
            Churvox fits businesses where jobs, workers, customers, pricing and invoices are always moving at the same time.
          </p>
        </div>
        <div className="publicAreaGrid">
          {businessTypes.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicSplit">
        <div>
          <span className="publicKicker">Inside Churvox</span>
          <h2>Every page has one clear job.</h2>
          <p>
            The owner sees the business clearly. Workers stay simple. Command handles decisions.
          </p>
        </div>
        <div className="publicAreaGrid">
          {osAreas.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Real business moments</span>
          <h2>Churvox prepares the next admin move.</h2>
        </div>
        <div className="publicCardGrid">
          {operatingMoments.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicDarkBand">
        <div>
          <span className="publicKicker">Guardrails</span>
          <h2>Useful automation. Owner control.</h2>
        </div>
        <div className="publicCardGrid">
          {guardrails.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Why it feels different</span>
          <h2>Simple screens. Clear decisions. No hidden action.</h2>
        </div>
        <div className="publicCardGrid">
          {trustPoints.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicCta">
        <div>
          <span className="publicKicker">Start clean</span>
          <h2>Put the business into Churvox and let Command handle the approvals.</h2>
        </div>
        <div className="publicActions">
          <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
          <Link to="/pricing" className="publicSecondary">View plans</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
