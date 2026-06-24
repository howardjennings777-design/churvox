import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./SimplePublic.css";
import "./SimplePublicStrong.css";

const proof = [
  "14-day free trial",
  "No card upfront",
  "Owner approval built in",
  "Accounting handoff ready",
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
  ["Invoice and sync", "Send invoices, check payment status and hand off to Xero or accounting export where available."],
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

const productScreens = [
  ["Smart Hub", "See today’s jobs, unpaid invoices, requests and what needs attention next."],
  ["Command", "Churvox prepares admin actions. You review, edit, approve or ignore."],
  ["Jobs", "Keep job details, notes, workers, photos, time and status in one place."],
  ["Accounting", "Export or draft-sync accounting where available, with owner approval kept in the loop."],
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
  ["Most apps store the work", "Churvox helps move the admin forward after the work is added."],
  ["AI with owner control", "Admin actions can be prepared, but important steps stay reviewed by you."],
  ["Accounting is a handoff", "Accounting support is controlled: draft sync, exports and payment checks, not risky automation."],
];

const compareRows = [
  ["Jobs scattered in texts", "Jobs visible in one workspace"],
  ["Invoices delayed or forgotten", "Invoice flow ready after the job"],
  ["Workers ask what is next", "Worker view shows the job"],
  ["Accounting feels messy", "Accounting handoff ready"],
  ["Owner does every admin step", "Churvox prepares, owner approves"],
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
    <main className="simplePublic" data-version="CHURVOX_PUBLIC_PRODUCT_PROOF_20260622">
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

      <section className="simpleBand simpleInsideBand">
        <div>
          <span className="simpleSectionLabel">Inside Churvox</span>
          <h2>The workspace your day runs from.</h2>
          <p className="simpleLead">
            Churvox is built around the real path of a service job: the customer asks, the work gets done, the invoice goes out, payment gets checked, and accounting is handed off safely.
          </p>
        </div>
        <div className="simpleProductShowcase">
          {productScreens.map(([title, text]) => (
            <article key={title}>
              <div>
                <small>{title}</small>
                <b>{title === "Smart Hub" ? "Today’s work" : title}</b>
              </div>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand simpleSplitBand">
        <div>
          <span className="simpleSectionLabel">Who it is for</span>
          <h2>For owners who are done running the business from texts and memory.</h2>
          <p className="simpleLead">
            If your jobs are in messages, notebooks, screenshots, unpaid invoices and your head, Churvox gives the business one place to work from.
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

      <section className="simpleBand simpleDifferenceBand">
        <span className="simpleSectionLabel">Why Churvox</span>
        <h2>Churvox does the admin. You approve.</h2>
        <p className="simpleLead">
          Job management is the baseline. The stronger idea is owner-approved admin: Churvox helps prepare what should happen next without taking control away from the business owner.
        </p>
        <div className="simpleGrid">
          {difference.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand simpleCompareBand">
        <span className="simpleSectionLabel">Before and after</span>
        <h2>Move from scattered admin to one clear flow.</h2>
        <div className="simpleCompareTable" role="table" aria-label="Running on texts compared with running on Churvox">
          <div role="row" className="simpleCompareHead">
            <b role="columnheader">Running on texts</b>
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
          No more jumping between messages, notes, spreadsheets, paper invoices and memory.
        </p>
        <div className="simpleGrid">
          {steps.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand simpleTrustBand">
        <span className="simpleSectionLabel">Trust and control</span>
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
