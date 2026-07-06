import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./SimplePublic.css";

const navLinks = [
  ["/pricing", "Pricing", "route"],
  ["/features", "How it works", "route"],
  ["/request", "Request form", "route"],
  ["/contact", "Contact", "route"],
  ["/login", "Log in", "route"],
];

const proof = [
  "14-day free trial",
  "No card upfront",
  "Owner-approved by design",
  "Built for service businesses",
];

const workflow = [
  ["1", "Work comes in", "Add a job, import a client, receive a worker update or capture a customer request."],
  ["2", "Churvox prepares the admin", "Forms, slips, draft invoices, follow-ups and next steps are organised from the records."],
  ["3", "You approve in Command", "Approve, edit or park important actions from one owner approval desk."],
];

const commandSlips = [
  ["Quote ready", "Client, scope, price and follow-up are lined up for owner review."],
  ["Invoice draft", "Job, worker notes, photos, price and evidence sit together before sending."],
  ["Worker issue", "Locked gate, extra work or missing detail becomes a clear owner decision."],
  ["Reply drafted", "Customer and worker messages stay connected to the job or client record."],
  ["Accounting handoff", "Draft sync stays owner-approved and guarded."],
  ["Missing info", "Date, time, price, address or worker gaps are surfaced before anything moves."],
];

const trades = [
  ["Landscaping", "Recurring work, job notes, photos, quotes, worker updates and invoice drafts."],
  ["Cleaning", "Schedules, teams, client access notes, proof, messages and follow-ups."],
  ["Property maintenance", "Job history, issue slips, client files and owner-approved next steps."],
  ["Handyman & repairs", "One-off jobs, quotes, site notes, worker messages and clean invoices."],
];

const workerLoop = [
  ["Worker sends", "Gate locked. Customer asked for extra hedge trim. Photos attached."],
  ["Churvox prepares", "Job issue slip with client, address, worker note, photos and suggested next step."],
  ["Owner decides", "Approve the change, edit the message, or park it in Command."],
];

const planLadder = [
  ["Start", "$39/mo + GST", "Solo owner getting organised", "Jobs, clients, quotes and invoices."],
  ["Crew", "$89/mo + GST", "Small team", "Adds workers, team flow, messages and proof."],
  ["Operator", "$149/mo + GST", "Busy owner", "Churvox prepares admin for owner approval.", "Most Popular"],
  ["Command", "$299/mo + GST", "Larger operation", "Full approval desk, payroll review and accounting handoff."],
];

const guardrails = [
  ["No automatic invoice sending", "Invoices can be prepared, but sending stays owner-approved."],
  ["No tax filing", "Churvox keeps accounting handoff practical and guarded."],
  ["No bank payout files", "Payroll review and exports stay review-only."],
  ["Draft accounting sync only", "Xero/MYOB handoff stays draft, safe and owner-approved where available."],
];

function PublicNavLink({ to, label, type }) {
  if (type === "external") return <a href={to}>{label}</a>;
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
        {navLinks.map(([to, label, type]) => (
          <PublicNavLink key={to} to={to} label={label} type={type} />
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
        <Link to="/pricing">Pricing</Link>
        <Link to="/features">How it works</Link>
        <Link to="/request">Request form</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-of-service">Terms</Link>
        <Link to="/login">Log in</Link>
      </nav>
    </footer>
  );
}

function ProductMock() {
  return (
    <aside className="publicMock publicHeroMock" aria-label="Churvox owner approval desk preview">
      <div className="publicMockTop">
        <span>Live preview</span>
        <b>Command approval desk</b>
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
            <b>Invoice draft ready</b>
            <span>Belmont Villas · Hedge trim · $340</span>
          </article>
          <article>
            <b>Worker issue</b>
            <span>Gate locked · photo and note attached</span>
          </article>
          <article>
            <b>Quote follow-up</b>
            <span>Garden tidy quote viewed yesterday</span>
          </article>
        </section>
        <section>
          <small>Approval slip</small>
          <div className="publicSlip">
            <b>Invoice draft ready</b>
            <span>Client: Belmont Villas</span>
            <span>Job: Hedge trim and green waste</span>
            <span>Proof: 3 photos + worker note</span>
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

function MiniWorkerLoop() {
  return (
    <div className="publicLoopPreview">
      {workerLoop.map(([title, text], index) => (
        <article key={title}>
          <i>{index + 1}</i>
          <b>{title}</b>
          <span>{text}</span>
        </article>
      ))}
    </div>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="publicSite" data-version="CHURVOX_PUBLIC_NAV_FIXED_20260706">
      <Nav />

      <section className="publicHero publicHeroPremium">
        <div className="publicHeroCopy">
          <span className="publicKicker">Owner-approved admin for service businesses</span>
          <h1>Churvox does the admin. You approve.</h1>
          <p>
            Churvox keeps jobs, clients, workers, quotes, invoices, messages and safe accounting handoff in one clean system. It prepares the admin from real records, then brings important decisions back to Command.
          </p>
          <div className="publicActions">
            <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
            <Link to="/features" className="publicSecondary">See how Command works</Link>
          </div>
          <div className="publicProof">
            {proof.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <ProductMock />
      </section>

      <section className="publicBand publicStatement">
        <span className="publicKicker">The difference</span>
        <h2>Not another messy job list. One place for the owner to decide.</h2>
        <p>
          Jobs, workers and admin can move fast, but final decisions should not be scattered. Churvox prepares the next move and keeps approval, edits and parking inside Command.
        </p>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">How Churvox works</span>
          <h2>Three steps that are easy to understand.</h2>
        </div>
        <div className="publicFlow publicFlowThree">
          {workflow.map(([num, title, text]) => (
            <article key={title}>
              <i>{num}</i>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicCommandFeature">
        <div className="publicSectionHead">
          <span className="publicKicker">Command</span>
          <h2>The owner approval desk.</h2>
          <p>
            Command is where the important stuff waits for you. Churvox can prepare the admin, but sending, syncing, approving and parking stays under owner control.
          </p>
        </div>
        <div className="publicAreaGrid">
          {commandSlips.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicSplit">
        <div>
          <span className="publicKicker">Made for real work</span>
          <h2>Built for service businesses that move fast.</h2>
          <p>
            Churvox stays broad enough for different trades, but practical enough to understand jobs, workers, clients and money.
          </p>
        </div>
        <div className="publicAreaGrid">
          {trades.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicSplit publicWorkerLoopBand">
        <div>
          <span className="publicKicker">Worker to owner loop</span>
          <h2>Field updates become clear owner decisions.</h2>
          <p>
            When a worker sends a note, issue or photo, it should not disappear into a message thread. Churvox ties it to the job and sends the decision back to Command.
          </p>
        </div>
        <MiniWorkerLoop />
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Pricing by business stage</span>
          <h2>Start simple. Add power when the business needs it.</h2>
          <p>14-day trial. No card upfront. Pricing stays clear and the owner stays in control.</p>
        </div>
        <div className="publicPlanGrid publicPlanPreviewGrid">
          {planLadder.map(([name, price, fit, text, badge]) => (
            <article key={name} className={badge ? "featured" : ""}>
              {badge ? <small>{badge}</small> : null}
              <h3>{name}</h3>
              <div className="publicPlanPrice small">{price}</div>
              <p><b>{fit}</b></p>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="publicActions publicCenteredActions">
          <Link to="/pricing" className="publicPrimary">View full pricing</Link>
          <Link to="/signup" className="publicSecondary">Start trial</Link>
        </div>
      </section>

      <section className="publicBand publicDarkBand">
        <div>
          <span className="publicKicker">Owner-approved by design</span>
          <h2>Useful admin help, with hard guardrails.</h2>
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
