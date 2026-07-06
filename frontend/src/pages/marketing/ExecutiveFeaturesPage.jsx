import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const productAreas = [
  ["Today", "The day view: jobs, workers, messages and money that need attention."],
  ["Command", "The owner approval desk for decisions, edits and parked items."],
  ["Jobs", "Job forms with client, worker, address, time, price and recurrence."],
  ["Workers", "Simple field flow for directions, updates, notes and photos."],
  ["Money", "Quotes and invoice drafts prepared from real job records."],
];

const commandItems = [
  ["Invoice draft", "Job, price, proof and client details ready for review."],
  ["Worker issue", "Field notes and photos become a clear owner decision."],
  ["Missing info", "Unclear date, time, price or worker details are surfaced."],
];

const smartActions = [
  ["Assign", "Suggest the worker."],
  ["Schedule", "Find the practical time."],
  ["Quote", "Prepare the draft."],
  ["Invoice", "Build from the job."],
  ["Problem slip", "Turn issues into decisions."],
  ["Day close", "Show what is unfinished."],
];

const workerFlow = [
  ["See job", "Address, instructions and office message."],
  ["Do job", "Directions, start, finish and notes."],
  ["Send back", "Photos and updates return to the owner."],
];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="publicSite cv2Site publicPageSlim" data-version="CHURVOX_PRODUCT_SLIM_20260706">
      <Nav />

      <section className="publicHero publicHeroCompact slimHero">
        <div className="publicHeroCopy">
          <span className="publicKicker">Product</span>
          <h1>Work becomes owner-ready admin.</h1>
          <p>
            Churvox connects the job record, prepares the next admin step, and puts the decision back in Command.
          </p>
          <div className="publicActions">
            <Link to="/demo" className="publicPrimary">Open demo</Link>
            <Link to="/pricing" className="publicSecondary">View pricing</Link>
          </div>
        </div>
        <aside className="publicFeaturePanel slimPanel">
          <small>Main rule</small>
          <b>Command is where decisions happen.</b>
          <span>Other pages hold work details. Approve, edit and park stay in one owner desk.</span>
        </aside>
      </section>

      <section className="publicBand slimBand">
        <div className="publicSectionHead compactHead">
          <span className="publicKicker">Pages</span>
          <h2>One workspace, clear jobs.</h2>
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

      <section className="publicBand publicSplit slimBand">
        <div>
          <span className="publicKicker">Command</span>
          <h2>Important items wait for the owner.</h2>
          <p>Churvox can prepare the admin, but anything important comes back to Command before it moves.</p>
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
          <span className="publicKicker">Workers</span>
          <h2>The field app stays simple.</h2>
          <p>Workers see what they need, send back proof, and the owner gets the next decision clearly.</p>
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

      <section className="publicBand slimBand">
        <div className="publicSectionHead compactHead">
          <span className="publicKicker">Smart Actions</span>
          <h2>Helpful, not noisy.</h2>
          <p>Churvox prepares useful next steps without taking owner control away.</p>
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
          <span className="publicKicker">See it</span>
          <h2>Open the public demo.</h2>
        </div>
        <div className="publicActions">
          <Link to="/demo" className="publicPrimary">Open demo</Link>
          <Link to="/signup" className="publicSecondary">Start trial</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
