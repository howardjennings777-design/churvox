import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./SimplePublic.css";

const proof = [
  "14-day free trial",
  "No card upfront",
  "Owner approval built in",
  "Xero/MYOB handoff ready",
];

const trades = [
  "Lawn care",
  "Cleaning",
  "Handyman",
  "Landscaping",
  "Painting",
  "Pest control",
  "Small trade teams",
];

const steps = [
  ["Add the work", "Create the client, quote or job once, then keep the details in one place."],
  ["Run the job", "Schedule it, assign a worker, track time and capture notes or photos."],
  ["Review the admin", "Churvox prepares the next step, but important actions stay owner-approved."],
  ["Invoice and sync", "Send invoices, check payment status and hand off to Xero or MYOB where available."],
];

const trust = [
  ["Built for real operators", "Made for owners who need jobs, workers, quotes and invoices connected."],
  ["You stay in control", "Churvox can prepare admin actions, but you approve what goes out."],
  ["Accounting stays safe", "Draft sync and export paths only. No tax filing, no bank payout files and no automatic invoice sending."],
  ["Start with the right plan", "Pick Start, Crew, Operator or Command, then start the trial for that plan."],
];

const previewItems = [
  ["Today", "3 jobs ready"],
  ["Invoices", "$1,240 waiting"],
  ["Command", "2 approvals"],
  ["Xero", "Draft sync ready"],
];

export function Nav() {
  return (
    <nav className="simpleNav">
      <Link to="/" className="simpleBrand">
        <ChurvoxLogo variant="mark" size="lg" />
        <span><b>Churvox</b><small>Job admin for service businesses</small></span>
      </Link>
      <div className="simpleLinks">
        <Link to="/features" className="simpleGhost">How it works</Link>
        <Link to="/pricing" className="simpleGhost">Pricing</Link>
        <Link to="/login" className="simpleGhost">Log in</Link>
        <Link to="/signup" className="simplePrimary">Start 14-day trial</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="simpleFooter">
      <div className="simpleFooterBrand">
        <ChurvoxLogo variant="mark" size="md" />
        <span><b>Churvox</b><small>Job → Invoice → Paid → Synced.</small></span>
      </div>
      <nav>
        <Link to="/pricing">Pricing</Link>
        <Link to="/features">How it works</Link>
        <Link to="/request">Customer request form</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-of-service">Terms</Link>
        <Link to="/login">Log in</Link>
      </nav>
    </footer>
  );
}

function AppPreview() {
  return (
    <aside className="simpleCard simpleHeroPreview" aria-label="Churvox app preview">
      <div className="simplePreviewTop">
        <span>Smart Hub</span>
        <b>Owner view</b>
      </div>
      <div className="simplePreviewGrid">
        {previewItems.map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="simplePreviewFlow">
        <span>Job</span>
        <span>Invoice</span>
        <span>Paid</span>
        <span>Synced</span>
      </div>
      <div className="simplePreviewApproval">
        <b>Command approval</b>
        <p>AI prepared the follow-up. Owner reviews before anything goes out.</p>
      </div>
    </aside>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_PUBLIC_STRONGER_MARKETING_20260622">
      <Nav />

      <section className="simpleHero">
        <div>
          <span className="simpleKicker">Job admin for service businesses</span>
          <h1>Run jobs, invoices, workers and admin from one clean workspace.</h1>
          <p className="simpleLead">
            Churvox helps lawn care, cleaning, handyman and trade service businesses go from job to invoice to paid to synced, with owner-approved AI admin.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start 14-day trial</Link>
            <Link to="/pricing" className="simpleBtn simpleGhost">View pricing</Link>
          </div>
          <div className="simpleProof">{proof.map((item) => <span key={item}>{item}</span>)}</div>
        </div>

        <AppPreview />
      </section>

      <section className="simpleBand simpleSplitBand">
        <div>
          <h2>For owners who are done running the business from texts and memory.</h2>
          <p className="simpleLead">
            If your jobs are in messages, notebooks, screenshots, unpaid invoices and your head, Churvox gives the business one place to work from.
          </p>
        </div>
        <div className="simpleProof simpleProofDark">
          {trades.map((trade) => <span key={trade}>{trade}</span>)}
        </div>
      </section>

      <section className="simpleBand simpleCompareBand">
        <h2>Before and after Churvox.</h2>
        <div className="simpleCompare">
          <article>
            <b>Before</b>
            <span>Jobs scattered across texts, paper notes and memory.</span>
            <span>Invoices forgotten until cash gets tight.</span>
            <span>Workers asking what is next.</span>
          </article>
          <article>
            <b>After</b>
            <span>Jobs, clients, quotes and invoices stay connected.</span>
            <span>Churvox prepares the next admin step for review.</span>
            <span>The owner approves what matters before it moves.</span>
          </article>
        </div>
      </section>

      <section className="simpleBand">
        <h2>The core workflow is simple.</h2>
        <p className="simpleLead">
          No more jumping between messages, notes, spreadsheets, paper invoices and memory.
        </p>
        <div className="simpleGrid">
          {steps.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Built to feel safe before it feels clever.</h2>
        <p className="simpleLead">
          Churvox is not trying to take control from the owner. It prepares the admin, keeps the work visible, and leaves important approvals with you.
        </p>
        <div className="simpleGrid">
          {trust.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand simpleCtaBand">
        <h2>Ready to run the next job properly?</h2>
        <p className="simpleLead">
          Start the 14-day trial, choose the plan that matches your business, then run the first job-to-paid flow inside Churvox.
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
