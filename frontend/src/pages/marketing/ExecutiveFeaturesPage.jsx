import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import { BusinessCoverageSection, ProfessionStrip, TradeFlowSection } from "./PublicProfessionSections";
import "./SimplePublic.css";

const productAreas = [
  ["Today", "The work that needs attention now: jobs, workers, messages and money."],
  ["Command", "The owner desk for approvals, edits and parked work."],
  ["Jobs", "Clear job forms with client, worker, address, time, price and repeat work."],
  ["Workers", "A simple field flow for directions, updates, notes, location and photos."],
  ["Money", "Quote and invoice drafts built from real job records."],
  ["Settings", "Business rules, GST, branding, exports and safe account controls."],
];

const commandItems = [
  ["Ready to send", "Quotes, replies and invoices wait for one final check."],
  ["Needs a decision", "Worker issues and changes come back with context."],
  ["Missing detail", "Unclear price, time, address or worker info is surfaced early."],
];

const smartActions = [
  ["Assign", "Pick the sensible worker."],
  ["Schedule", "Place the job cleanly."],
  ["Quote", "Prepare the draft."],
  ["Invoice", "Build from proof and price."],
  ["Issue", "Turn field problems into decisions."],
  ["Close", "Show what still needs attention."],
];

const workerFlow = [
  ["Know the job", "Address, notes and office message in one place."],
  ["Do the work", "Directions, start, finish and quick updates."],
  ["Send proof", "Photos and notes return to the owner cleanly."],
];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="publicSite cv2Site publicPageSlim" data-version="CHURVOX_PRODUCT_SERVICE_PLATFORM_20260708">
      <Nav />

      <section className="publicHero publicHeroCompact slimHero">
        <div className="publicHeroCopy">
          <span className="publicKicker">Product</span>
          <h1>The admin layer between the job and the owner.</h1>
          <p>
            Churvox keeps field-service records clean across trades: job detail, client detail, worker updates, proof, quote, invoice and owner decision all stay connected.
          </p>
          <div className="publicActions">
            <Link to="/demo" className="publicPrimary">See the demo</Link>
            <Link to="/pricing" className="publicSecondary">View pricing</Link>
          </div>
        </div>
        <aside className="publicFeaturePanel slimPanel">
          <small>Product rule</small>
          <b>Work pages show details. Command holds decisions.</b>
          <span>That split is what keeps Churvox simple for owners, office admins and workers.</span>
        </aside>
      </section>

      <section className="publicBand slimBand">
        <div className="publicSectionHead compactHead">
          <span className="publicKicker">Workspace</span>
          <h2>Every page has a job.</h2>
        </div>
        <div className="publicFeatureGrid slimGrid fiveCards">
          {productAreas.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <ProfessionStrip compact />
      <TradeFlowSection />

      <section className="publicBand publicSplit slimBand">
        <div>
          <span className="publicKicker">Command</span>
          <h2>The place where admin becomes a decision.</h2>
          <p>Churvox can prepare the work. Command is where the owner decides what happens next.</p>
        </div>
        <div className="publicAreaGrid slimGrid">
          {commandItems.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicSplit slimBand">
        <div>
          <span className="publicKicker">Worker side</span>
          <h2>Field updates without the back-and-forth.</h2>
          <p>Workers get the job. Owners get the update. Churvox keeps the record tied together.</p>
        </div>
        <div className="publicAreaGrid slimGrid">
          {workerFlow.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <BusinessCoverageSection />

      <section className="publicBand slimBand">
        <div className="publicSectionHead compactHead">
          <span className="publicKicker">Smart Actions</span>
          <h2>Useful prompts. No noise.</h2>
          <p>Churvox prepares the obvious next step, then leaves the important call with the owner.</p>
        </div>
        <div className="publicAreaGrid slimGrid smallActionGrid">
          {smartActions.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicCta slimCta">
        <div>
          <span className="publicKicker">See it working</span>
          <h2>Use the public demo first.</h2>
        </div>
        <div className="publicActions">
          <Link to="/demo" className="publicPrimary">See the demo</Link>
          <Link to="/signup" className="publicSecondary">Start trial</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
