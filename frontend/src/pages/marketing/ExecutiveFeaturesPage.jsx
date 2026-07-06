import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const featureAreas = [
  ["Today", "A clear day view for jobs moving, active workers, due money and messages that matter."],
  ["Command", "The owner approval desk. Prepared admin waits here to approve, edit or park."],
  ["Jobs", "Editable job forms with client, worker, address, price, date, time and recurrence."],
  ["Clients", "Client records, notes, service history, price memory and job history."],
  ["Workers", "Simple worker flow for directions, messages, start, finish, notes and photos."],
  ["Quotes", "Create, review, send and follow up quotes from the job and client record."],
  ["Invoices", "Prepare invoices from jobs, time, notes and price details before owner approval."],
  ["Messages", "Worker and customer messages stay connected to the record they belong to."],
  ["Settings", "Business details, team access, billing, exports and safe accounting controls."],
];

const smartActions = [
  ["Smart Assign", "Suggests the best worker by area, skills, availability and workload."],
  ["Smart Schedule", "Finds a sensible date and time without crowding the run sheet."],
  ["Smart Run Builder", "Groups recurring or nearby jobs into a cleaner daily run."],
  ["Smart Quote Builder", "Prepares a quote draft from service type, client notes and similar work."],
  ["Smart Invoice Builder", "Builds an invoice draft from job price, notes, proof and time."],
  ["Smart Client Memory", "Saves access notes, preferred timing, pricing and proof preferences."],
  ["Smart Missing Info", "Flags missing date, time, worker, address, price or client details."],
  ["Smart Follow-up", "Prepares quote, invoice or client follow-ups for owner approval."],
  ["Smart Problem Slip", "Turns worker issues into clear owner decisions inside Command."],
  ["Smart Day Close", "Wraps up the day with jobs, invoice drafts, messages and tomorrow checks."],
];

const commandItems = [
  ["Quote ready to review", "Client, service, price and job details are lined up for approval."],
  ["Invoice ready to review", "Job records, time, notes, photos and pricing are pulled together."],
  ["Reply ready to review", "The message thread and record history stay connected."],
  ["Missing detail found", "Unclear date, time, price, address or worker details are flagged."],
  ["Worker update ready", "Notes, photos or job changes are held for the next owner decision."],
  ["Accounting handoff", "Draft handoff stays owner-approved and guarded."],
];

const operatingFlow = [
  ["1", "Start clean", "Business details, invoice settings, team access and imports are kept tidy."],
  ["2", "Run the day", "Jobs, workers, clients, messages, quotes and invoices stay connected."],
  ["3", "Churvox checks gaps", "Missing date, time, price, address or worker details are flagged."],
  ["4", "Prepare the next step", "Churvox turns the records into a clear action."],
  ["5", "Approve in Command", "The owner approves, edits or parks the prepared admin."],
];

const guardrails = [
  ["Approval stays in Command", "Other pages show details. Final decisions stay in one place."],
  ["Today stays useful", "Work needs a usable date and time before it becomes a Today item."],
  ["Accounting stays safe", "Draft sync only where available. No tax filing. No payout files."],
  ["Missing info is visible", "Incomplete records become attention items instead of disappearing."],
];

const workerFlow = [
  ["See today's job", "The worker sees the job, address, instructions and office message."],
  ["Open directions", "Directions stay one tap away."],
  ["Start and finish", "Start the job, add a note if needed, then mark it finished."],
  ["Send it back", "Updates come back clearly so the owner can review the next step."],
];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="publicSite" data-version="CHURVOX_PUBLIC_FEATURES_SMART_ACTIONS_20260706">
      <Nav />

      <section className="publicHero publicHeroCompact">
        <div className="publicHeroCopy">
          <span className="publicKicker">How Churvox works</span>
          <h1>Real work becomes prepared admin.</h1>
          <p>
            Churvox connects the records, catches missing details, prepares the next admin step and puts owner decisions in Command.
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

      <section className="publicBand publicCommandFeature">
        <div className="publicSectionHead">
          <span className="publicKicker">Command Smart Actions</span>
          <h2>Churvox gets clever without taking control away.</h2>
          <p>It can suggest the worker, time, run, quote, invoice, missing info, follow-up, problem slip and day close. The owner still approves.</p>
        </div>
        <div className="publicAreaGrid">
          {smartActions.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">How it runs</span>
          <h2>From job to approval, without chasing.</h2>
        </div>
        <div className="publicFlow">
          {operatingFlow.map(([num, title, text]) => (
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
          <span className="publicKicker">Command</span>
          <h2>What Command prepares for you.</h2>
          <p>
            Command gives each owner decision enough context to move quickly. You see what Churvox prepared, what is missing, and what needs approval.
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
          <h2>Workers get only what they need.</h2>
          <p>
            The worker side stays simple: job, address, message, directions, start, finish and send back to the office.
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
          <h2>One workspace, clear pages.</h2>
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
          <h2>Hard rules keep decisions clear.</h2>
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
