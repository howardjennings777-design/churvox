import React from "react";
import { Link } from "react-router-dom";
import {
  PublicNav,
  PublicFooter,
  Eyebrow,
  SectionHeading,
  CommandPreview,
  coreAreas,
  serviceTypes,
} from "./ChurvoxPublicShell";

const productPrinciples = [
  ["Facts live with the record", "Jobs, client history, worker updates, proof and money stay connected instead of being copied between pages."],
  ["Routine work stays quiet", "Churvox handles repeatable checks behind the scenes and does not turn every normal event into an owner alert."],
  ["Uncertainty stays visible", "Missing price, time, proof, tax treatment or client detail is shown clearly instead of being guessed."],
  ["Approval has a real effect", "The owner reviews an editable slip and may create an internal draft, while external sends and charges remain locked."],
];

const workerFlow = [
  ["Receive the job", "Address, notes, timing and the latest office direction appear in one simple field view."],
  ["Update the work", "Acknowledge, start, pause, complete, add proof and report a problem without operating the full office system."],
  ["Return a clean record", "The owner gets the update in context, and Churvox prepares the next safe admin step."],
];

const commandRules = [
  ["Approve", "Move a correct prepared draft into the internal Churvox record."],
  ["Edit", "Correct the detail before approving anything."],
  ["Park", "Hold uncertain work without losing the evidence or history."],
  ["Ask", "Send the issue back for the missing fact rather than guessing."],
];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="cp26Site" data-version="CHURVOX_PUBLIC_PRODUCT_20260710">
      <PublicNav active="/product" />

      <section className="cp26PageHero">
        <div>
          <Eyebrow>The product</Eyebrow>
          <h1>The admin engine between the work and the owner.</h1>
          <p>Churvox keeps the facts on purpose-built work pages, prepares the routine admin behind the scenes and puts only genuine decisions into Command.</p>
          <div className="cp26HeroActions">
            <Link className="cp26Button" to="/demo">Open product demo</Link>
            <Link className="cp26Button cp26ButtonGhost" to="/signup">Start free trial</Link>
          </div>
        </div>
        <div className="cp26HeroPanel">
          <small>Product rule</small>
          <b>Work pages hold facts. Command holds decisions.</b>
          <span>That separation keeps the system useful for owners, office staff and workers without turning every page into another dashboard.</span>
        </div>
      </section>

      <section className="cp26Section">
        <CommandPreview />
      </section>

      <section className="cp26Section">
        <SectionHeading
          eyebrow="Purpose-built workspace"
          title="Every major page has its own operating job."
          text="The layout changes with the work instead of repeating the same template across the product."
        />
        <div className="cp26AreaGrid">
          {coreAreas.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cp26Section cp26SectionDark">
        <SectionHeading
          eyebrow="Product discipline"
          title="Strong logic before clever-looking automation."
          text="Churvox is designed to be cautious with money, dates, status, worker time, client memory and accounting."
        />
        <div className="cp26FeatureGrid">
          {productPrinciples.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cp26Section">
        <div className="cp26Split">
          <div className="cp26SplitLead">
            <Eyebrow>Worker side</Eyebrow>
            <h2>Simple enough to use in the field.</h2>
            <p>The worker experience is deliberately smaller than the owner app. Workers see the work, update it and send clean information back.</p>
          </div>
          <div className="cp26FlowGrid">
            {workerFlow.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
          </div>
        </div>
      </section>

      <section className="cp26Section">
        <div className="cp26Split">
          <div className="cp26SplitLead">
            <Eyebrow>Command</Eyebrow>
            <h2>One decision desk with four clear choices.</h2>
            <p>The owner can correct the prepared work without hunting through the original record or letting uncertain details slip through.</p>
          </div>
          <div className="cp26AreaGrid">
            {commandRules.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
          </div>
        </div>
      </section>

      <section className="cp26Section">
        <div className="cp26Split">
          <div className="cp26SplitLead">
            <Eyebrow>Multi-trade by design</Eyebrow>
            <h2>The same strong system, using the business’s language.</h2>
            <p>Churvox can support jobs, appointments, recurring visits and mobile services without forcing every industry into the same wording.</p>
          </div>
          <div className="cp26IndustryGrid">
            {serviceTypes.map((type) => <span key={type}>{type}</span>)}
          </div>
        </div>
      </section>

      <section className="cp26Closing">
        <div>
          <Eyebrow light>See the product working</Eyebrow>
          <h2>Open the demo before making a decision.</h2>
          <p>See the owner flow, the Command desk and the purpose-built work pages without signing in.</p>
        </div>
        <div className="cp26ClosingActions">
          <Link className="cp26Button" to="/demo">Open demo</Link>
          <Link className="cp26Button cp26ButtonGhost" to="/pricing">View pricing</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
