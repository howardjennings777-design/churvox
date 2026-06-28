import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const featureAreas = [
  ["Today", "A clear day view for dated work, active workers, due money, messages and issues."],
  ["Command", "The only approval desk for prepared admin. Approve, edit and park live here."],
  ["Jobs", "Editable job forms with client, price, date, time, recurrence, worker, proof and status."],
  ["Clients", "Client list, editable records, notes, service memory, price memory and history."],
  ["Workers", "Clocked-in workers, GPS map, current jobs, proof, photos, messages and slips."],
  ["Quotes", "Draft, sent, viewed, accepted and follow-up-ready quote work."],
  ["Invoices", "Drafts, due today, overdue, paid, sync-ready status and proof context."],
  ["Messages", "Worker and customer messages, drafted replies and thread history."],
  ["Settings", "Business controls, CSV defaults, exports, security and billing controls."],
];

const commandItems = [
  ["Quote ready", "Prepared from client, service, price and job context."],
  ["Invoice ready", "Prepared from job records, time, proof, notes and invoice memory."],
  ["Message ready", "Drafted from the current thread and record history."],
  ["Client or job issue", "Missing details, unclear requests or record problems go to Command."],
  ["Timesheet or proof issue", "Worker slips, missing proof and time checks wait for owner review."],
  ["Sync decision", "Accounting handoff stays owner-approved and guarded."],
];

const buildFlow = [
  ["1", "Set up", "Business details, plan, invoice defaults, team access and imports."],
  ["2", "Run work", "Jobs, workers, clients, proof, quotes and invoices stay connected."],
  ["3", "Find gaps", "Missing date, time, price, proof or client details do not silently move forward."],
  ["4", "Prepare admin", "Churvox fills the useful slip from the records it has."],
  ["5", "Approve in Command", "The owner checks, edits or parks the prepared action."],
];

const guardrails = [
  ["No approval buttons outside Command", "Other pages show status and context. Decisions stay in Command."],
  ["No fake Today work", "Work without a usable date and time should be fixed before it appears in Today."],
  ["No risky accounting", "Draft sync only where available. No tax filing. No payout files."],
  ["No hidden missing info", "Bad or incomplete records become owner attention instead of disappearing."],
];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="publicSite" data-version="CHURVOX_PUBLIC_FEATURES_MODERN_OS_20260629">
      <Nav />

      <section className="publicHero publicHeroCompact">
        <div className="publicHeroCopy">
          <span className="publicKicker">How Churvox works</span>
          <h1>Real work becomes prepared admin.</h1>
          <p>
            Churvox connects the business records, watches for missing information, prepares the next admin move and puts the owner decision in Command.
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

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Product areas</span>
          <h2>One OS, clear pages.</h2>
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
          <h2>Churvox does the admin. The owner checks and approves.</h2>
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
