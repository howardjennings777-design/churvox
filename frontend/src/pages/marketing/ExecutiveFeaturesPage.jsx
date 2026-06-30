import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const featureAreas = [
  ["Today", "A clean day view for jobs moving, active workers, due money and messages that matter."],
  ["Command", "The approval desk. Prepared admin waits here for approve, edit or park."],
  ["Jobs", "Editable job forms with client, worker, address, price, date, time and recurrence."],
  ["Clients", "Client records, notes, service history, price memory and job history."],
  ["Workers", "Simple worker flow for directions, messages, start, finish, notes and photos."],
  ["Quotes", "Create, review, send and follow up quotes from the job and client record."],
  ["Invoices", "Prepare invoices from jobs, time, notes and price details before owner approval."],
  ["Messages", "Worker and customer messages stay connected to the record they belong to."],
  ["Settings", "Business details, team access, billing, exports and safe accounting controls."],
];

const commandItems = [
  ["Quote ready", "Prepared from client, service, price and job details."],
  ["Invoice ready", "Prepared from job records, time, notes, photos and pricing memory."],
  ["Message ready", "A reply can be prepared from the current thread and record history."],
  ["Missing detail", "Unclear date, time, price, address or worker detail goes to attention."],
  ["Worker update", "Notes, photos or job changes can be reviewed before the next admin step."],
  ["Accounting decision", "Draft handoff stays owner-approved and guarded."],
];

const buildFlow = [
  ["1", "Set up", "Business details, plan, invoice defaults, team access and imports."],
  ["2", "Run work", "Jobs, workers, clients, messages, quotes and invoices stay connected."],
  ["3", "Catch gaps", "Missing date, time, price, address or worker details are surfaced."],
  ["4", "Prepare admin", "Churvox turns the records into a clear next step."],
  ["5", "Approve in Command", "The owner approves, edits or parks the prepared action."],
];

const guardrails = [
  ["Approval stays in Command", "Other pages show details. Final decisions stay in one place."],
  ["Today stays useful", "Work needs a usable date and time before it becomes a Today item."],
  ["Accounting stays safe", "Draft sync only where available. No tax filing. No payout files."],
  ["Missing info is visible", "Incomplete records become attention items instead of disappearing."],
];

const workerFlow = [
  ["See the job", "Worker sees the current job, address, instructions and office message."],
  ["Get there", "Directions stay one tap away."],
  ["Do the work", "Start job, add a note if needed, finish job."],
  ["Send to office", "Updates come back clearly so the owner can review the next step."],
];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="publicSite" data-version="CHURVOX_PUBLIC_FEATURES_10_OUT_OF_10_20260630">
      <Nav />

      <section className="publicHero publicHeroCompact">
        <div className="publicHeroCopy">
          <span className="publicKicker">How Churvox works</span>
          <h1>Real work becomes prepared admin.</h1>
          <p>
            Churvox connects the business records, catches missing details, prepares the next admin step and puts the owner decision in Command.
          </p>
          <div className="publicActions">
            <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
            <Link to="/pricing" className="publicSecondary">View pricing</Link>
          </div>
        </div>
        <aside className="publicFeaturePanel">
          <small>Core rule</small>
          <b>Command is the approval desk.</b>
          <span>Approve, edit and park are not scattered through the product. The owner checks them in one place.</span>
        </aside>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Operating flow</span>
          <h2>The system should be obvious.</h2>
        </div>
        <div className="publicFlow">
          {buildFlow.map(([num, title, text]) => (
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
          <span className="publicKicker">Command items</span>
          <h2>What gets prepared for the owner.</h2>
          <p>
            Command should feel like a useful approval desk, not a vague notification list. Each item needs enough context to make a decision quickly.
          </p>
        </div>
        <div className="publicAreaGrid">
          {commandItems.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicSplit">
        <div>
          <span className="publicKicker">Worker app</span>
          <h2>Workers should not need office software.</h2>
          <p>
            The worker side stays deliberately simple: job, address, message, directions, start, finish and send to office.
          </p>
        </div>
        <div className="publicAreaGrid">
          {workerFlow.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Product areas</span>
          <h2>One product, clear pages.</h2>
        </div>
        <div className="publicFeatureGrid">
          {featureAreas.map(([title, text]) => (
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
          <h2>Hard rules keep it simple for the boss.</h2>
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
          <span className="publicKicker">Start with the workflow</span>
          <h2>Churvox does the admin. You approve.</h2>
        </div>
        <div className="publicActions">
          <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
          <Link to="/pricing" className="publicSecondary">Choose a plan</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}