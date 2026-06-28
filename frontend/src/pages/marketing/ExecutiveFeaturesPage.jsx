import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const features = [
  ["Smart Hub", "Shows owner attention from the work in the account: new work, prepared admin and what has reached Command."],
  ["Command approval", "The only place for approve, save edit and park decisions."],
  ["Jobs", "Dispatch, recurring work, proof, notes, worker status and admin prepared from jobs."],
  ["Clients", "Customer memory for history, notes, price context and follow-up work."],
  ["Workers", "Field status, time, proof and GPS-style job view for the owner."],
  ["Quotes and invoices", "Offer pipeline and money desk show prepared work, but decisions stay in Command."],
  ["Messages", "Prepared replies wait for owner approval instead of sending from the inbox."],
  ["Settings and CSV", "Business setup, invoice defaults, imports, exports and account safety controls."],
  ["Accounting handoff", "CSV export or draft-sync where available, with no auto-send, tax filing or payout files."],
];

const flow = [
  ["1", "Set up the business", "Create the account, choose the plan, add business details and invoice defaults."],
  ["2", "Add or import records", "Bring in clients, jobs, invoices or team data with CSV, or add work from the app."],
  ["3", "Run the work", "Jobs, clients, workers, quotes, invoices and messages stay connected."],
  ["4", "Churvox prepares admin", "Follow-ups, draft invoices, messages, team gaps and sync checks become Command items."],
  ["5", "Owner approves in Command", "Approve, save an edit or park the prepared admin from one place."],
];

const commandCards = [
  ["Quote follow-up", "Prepared from quote and client context, then held for owner approval."],
  ["Invoice draft", "Prepared from job facts, proof and time before sending or syncing."],
  ["Message reply", "Drafted from job and client context, but not sent from Messages."],
  ["Team review", "Worker app, access and payroll review items become owner attention."],
  ["Accounting check", "Draft sync and export steps stay controlled by Command."],
  ["Setup gap", "Missing business, invoice or import details are surfaced instead of hidden."],
];

const guardrails = [
  ["One approval place", "Approve, edit and park controls belong in Command only."],
  ["No automatic invoice sending", "Invoices can be prepared, but sending is an owner decision."],
  ["No tax filing", "Churvox does not submit tax filings to government."],
  ["No payout files", "Churvox does not create bank payout files."],
  ["Recurring inside Jobs", "Repeat work belongs with job records, proof and scheduling."],
  ["Real account data", "The app fills from your records, imports and work activity."],
];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_FEATURES_REAL_WORKFLOW_20260628">
      <Nav />
      <section className="simpleHero">
        <div>
          <span className="simpleKicker">How it works</span>
          <h1>Real work goes in. Command handles the decisions.</h1>
          <p className="simpleLead">
            Churvox is built around one practical idea: the owner adds or imports the work, the app keeps the records connected, and prepared admin waits in Command for approval.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start 14-day trial</Link>
            <Link to="/pricing" className="simpleBtn simpleGhost">View pricing</Link>
          </div>
        </div>
        <aside className="simpleCard">
          <h2>Churvox starts clean.</h2>
          <p>
            It does not need fake dashboard data to make sense. Your clients, jobs, invoices, team and imports create the operating picture.
          </p>
        </aside>
      </section>

      <section className="simpleBand">
        <h2>The real workflow.</h2>
        <div className="simpleTimeline">
          {flow.map(([num, title, text]) => (
            <article key={title}>
              <i>{num}</i>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand simpleInsideBand">
        <div>
          <span className="simpleSectionLabel">Command cards</span>
          <h2>What Churvox prepares for owner approval.</h2>
          <p className="simpleLead">
            Command is for unfinished doing: follow-ups, invoice drafts, messages, access checks, setup gaps and accounting handoff decisions.
          </p>
        </div>
        <div className="simpleProductShowcase">
          {commandCards.map(([title, text]) => (
            <article key={title}>
              <div>
                <small>Prepared for Command</small>
                <b>{title}</b>
              </div>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand">
        <h2>The product areas.</h2>
        <p className="simpleLead">
          Each page has a job. The pages do not all need approval buttons because Command is the approval desk.
        </p>
        <div className="simpleGrid">
          {features.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand simpleTrustBand">
        <span className="simpleSectionLabel">Guardrails</span>
        <h2>Useful admin, not reckless automation.</h2>
        <p className="simpleLead">
          Churvox should make the owner feel calmer, not locked out. These limits keep the product honest.
        </p>
        <div className="simpleGrid">
          {guardrails.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand simpleCtaBand">
        <h2>Build the account from real work.</h2>
        <p className="simpleLead">
          Start the trial, choose the plan, add or import the first records, then use Command as the approval desk.
        </p>
        <div className="simpleActions">
          <Link to="/signup" className="simpleBtn simplePrimary">Start 14-day trial</Link>
          <Link to="/pricing" className="simpleBtn simpleGhost">Choose a plan</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
