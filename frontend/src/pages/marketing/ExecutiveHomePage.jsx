import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./SimplePublic.css";
import "./SimplePublicStrong.css";

const proof = [
  "14-day free trial",
  "No card upfront",
  "Owner approval in Command",
  "CSV import and export",
  "Draft sync and export guardrails",
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

const commandPrepares = [
  ["Quote follow-up", "Churvox can prepare the next reply from quote and client records. The owner approves it in Command."],
  ["Draft invoice", "Job details, time, proof and notes can be gathered into an invoice draft for review."],
  ["Client reply", "Prepared messages wait for owner approval instead of sending from the inbox."],
  ["Worker gap", "Missing app access, invite gaps and payroll review items can surface before they become a mess."],
  ["Accounting handoff", "CSV export and draft sync steps stay guarded. No tax filing, payout files or automatic invoice sending."],
  ["Setup cleanup", "Missing business details, invoice defaults and import jobs belong in Settings, not hidden in random pages."],
];

const steps = [
  ["Add real work", "Add a job, import clients or build the records your business actually uses."],
  ["Run the job", "Jobs, clients, workers, quotes and invoices stay connected while the work happens."],
  ["Churvox prepares", "Follow-ups, invoice drafts, messages, sync checks and admin gaps become owner attention items."],
  ["Command approves", "The owner reviews the prepared work in one place before anything important moves."],
];

const trust = [
  ["No fake sends", "Public pages and record pages can show prepared work, but approvals happen in Command."],
  ["No risky accounting", "Draft sync and export only where available. No tax filing and no bank payout files."],
  ["Your data first", "The app starts clean, then fills from your jobs, clients, team, invoices and CSV imports."],
  ["Simple launch path", "Create the account, choose a plan, set up the business, import records and run the first job."],
];

const previewItems = [
  ["Add work", "Job or CSV import"],
  ["Prepare", "Invoice, quote or reply"],
  ["Command", "Owner approval only"],
  ["Export", "CSV or draft sync"],
];

const heroMetrics = [
  ["Command", "One approval desk"],
  ["Jobs", "Recurring lives there"],
  ["Safety", "No auto-send"],
];

const previewCards = [
  ["New work added", "Job details, client memory and worker notes stay connected.", "From your data", "Watched by Churvox"],
  ["Admin prepared", "Quote follow-up, invoice draft or message is prepared for review.", "Not sent", "Waiting in Command"],
  ["Owner decision", "Approve, save an edit or park the prepared admin in one approval desk.", "Command only", "Owner stays in control"],
];

const productScreens = [
  ["Smart Hub", "Today’s owner attention: real work added, admin prepared and what has reached Command."],
  ["Command", "The only approval desk. Approve, edit or park prepared admin here."],
  ["Jobs", "Dispatch, proof and recurring work live together instead of recurring being a separate sidebar item."],
  ["Clients", "A customer memory dossier for notes, history, price memory and follow-up context."],
  ["Workers", "Live field view for worker status, proof, time and job movement."],
  ["Settings", "Business identity, invoice defaults, CSV imports, exports, account safety and notification controls."],
];

const industries = [
  ["Lawn care", "Recurring runs, one-off jobs, photos, invoices and payment follow-up."],
  ["Cleaning", "Client details, scheduled work, workers, notes and repeat service admin."],
  ["Handyman", "Quotes, job notes, parts, invoice review and customer follow-up in one flow."],
  ["Landscaping", "Bigger jobs, staged work, crews, variations, photos and payment checks."],
  ["Painting", "Quotes, prep notes, job progress, invoices and approval steps."],
  ["Pest control", "Bookings, visits, customer notes, invoicing and repeat service reminders."],
];

const difference = [
  ["Records are not enough", "Churvox keeps the records, then watches for admin that should happen next."],
  ["Owner control matters", "Important actions can be prepared, but the owner approves what goes out."],
  ["Command stops scattered decisions", "Quotes, invoices, messages, team gaps and sync checks route to one approval desk."],
  ["Imports and exports are practical", "Clients, jobs, invoices and team data can move through CSV while the app becomes the operating system."],
];

const compareRows = [
  ["Jobs scattered in messages", "Jobs added or imported into one workspace"],
  ["Invoices delayed or forgotten", "Draft invoice work prepared for Command"],
  ["Owner hunts through pages", "Command shows the owner decision queue"],
  ["Recurring jobs feel separate", "Recurring work lives inside Jobs"],
  ["Accounting feels risky", "Draft sync and CSV export stay guarded"],
  ["Admin is manual everywhere", "Churvox prepares, owner approves"],
];

export function Nav() {
  return (
    <nav className="simpleNav">
      <Link to="/" className="simpleBrand">
        <ChurvoxLogo variant="mark" size="lg" />
        <span><b>Churvox</b><small>Churvox does the admin. You approve.</small></span>
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
        <span><b>Churvox</b><small>Job to invoice to paid to synced.</small></span>
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
    <aside className="simpleCard simpleHeroPreview simpleCommandMock" aria-label="Churvox Command workflow preview">
      <div className="simplePreviewTop">
        <span>Real workflow</span>
        <b>Owner approval OS</b>
      </div>
      <div className="simplePreviewGrid">
        {previewItems.map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="simplePreviewQueue" aria-label="Command workflow cards">
        {previewCards.map(([title, job, price, note]) => (
          <article key={title}>
            <div>
              <small>Workflow</small>
              <b>{title}</b>
            </div>
            <p>{job}</p>
            <div className="simplePreviewFacts">
              <span>{price}</span>
              <span>{note}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="simplePreviewActions" aria-label="Approval controls">
        <span>Approve</span>
        <span>Save edit</span>
        <span>Park</span>
      </div>
      <div className="simplePreviewApproval">
        <b>Real data fills the app.</b>
        <p>Churvox starts clean. Your jobs, imports, clients, invoices and team records create the work queue.</p>
      </div>
    </aside>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_PUBLIC_REAL_SITE_20260628">
      <Nav />

      <section className="simpleHero">
        <div>
          <span className="simpleKicker">Owner-approved admin for service businesses</span>
          <h1>Run the work. Approve the admin.</h1>
          <p className="simpleLead">
            Churvox is a job admin operating system for service businesses. Add the real work, import the records you already have, and let Command collect the admin that needs owner approval.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start 14-day trial</Link>
            <Link to="/features" className="simpleBtn simpleGhost">See how it works</Link>
          </div>
          <div className="simpleHeroStats" aria-label="Churvox proof points">
            {heroMetrics.map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="simpleProof">{proof.map((item) => <span key={item}>{item}</span>)}</div>
        </div>

        <AppPreview />
      </section>

      <section className="simpleBand simpleDifferenceBand">
        <span className="simpleSectionLabel">What Churvox is</span>
        <h2>A real admin OS, not a fake filled dashboard.</h2>
        <p className="simpleLead">
          Churvox starts from your real business records. Jobs, clients, workers, quotes, invoices, messages and accounting handoff stay connected, then owner decisions are gathered in Command.
        </p>
        <div className="simpleGrid">
          {difference.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand simpleInsideBand">
        <div>
          <span className="simpleSectionLabel">Command prepares</span>
          <h2>The owner approval queue builds from real work.</h2>
          <p className="simpleLead">
            Command is not another page to check. It is the one place where prepared admin waits for the owner.
          </p>
        </div>
        <div className="simpleProductShowcase">
          {commandPrepares.map(([title, text]) => (
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

      <section className="simpleBand simpleInsideBand">
        <div>
          <span className="simpleSectionLabel">Inside the app</span>
          <h2>Different pages. One logic.</h2>
          <p className="simpleLead">
            Every page has a job. Jobs run the work, Clients remember the customer, Workers show proof, Money shows invoices and quotes, Settings controls setup, and Command approves.
          </p>
        </div>
        <div className="simpleProductShowcase">
          {productScreens.map(([title, text]) => (
            <article key={title}>
              <div>
                <small>Churvox OS</small>
                <b>{title}</b>
              </div>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand simpleSplitBand">
        <div>
          <span className="simpleSectionLabel">Who it is for</span>
          <h2>For owners who want the admin under control.</h2>
          <p className="simpleLead">
            If your jobs are split between messages, notebooks, screenshots, unpaid invoices and memory, Churvox gives the business one operating system and one approval desk.
          </p>
        </div>
        <div className="simpleProof simpleProofDark">
          {trades.map((trade) => <span key={trade}>{trade}</span>)}
        </div>
      </section>

      <section className="simpleBand">
        <span className="simpleSectionLabel">Industries</span>
        <h2>Built for service work, not office theory.</h2>
        <p className="simpleLead">
          Churvox works best for businesses that visit customers, schedule jobs, send quotes, manage workers and need invoices paid faster.
        </p>
        <div className="simpleGrid simpleIndustryGrid">
          {industries.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand simpleCompareBand">
        <span className="simpleSectionLabel">Before and after</span>
        <h2>Move from scattered admin to one clear approval flow.</h2>
        <div className="simpleCompareTable" role="table" aria-label="Running on scattered admin compared with running on Churvox">
          <div role="row" className="simpleCompareHead">
            <b role="columnheader">Scattered admin</b>
            <b role="columnheader">Running on Churvox</b>
          </div>
          {compareRows.map(([before, after]) => (
            <div role="row" key={before}>
              <span role="cell">{before}</span>
              <span role="cell">{after}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="simpleBand">
        <h2>The core workflow is simple.</h2>
        <p className="simpleLead">
          Add work once, keep the record clean, and use Command for the owner decisions.
        </p>
        <div className="simpleGrid">
          {steps.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand simpleTrustBand">
        <span className="simpleSectionLabel">Trust and control</span>
        <h2>Honest automation with owner control.</h2>
        <p className="simpleLead">
          Churvox prepares useful admin, but it does not pretend to run the business without you. The owner stays in charge of approvals, sending and sync decisions.
        </p>
        <div className="simpleGrid">
          {trust.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand simpleCtaBand">
        <h2>Start with real records.</h2>
        <p className="simpleLead">
          Create the account, choose a plan, import or add the first jobs and clients, then use Command as the approval desk.
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
