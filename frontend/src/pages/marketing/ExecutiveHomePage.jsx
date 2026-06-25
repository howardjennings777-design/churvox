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

const commandPrepares = [
  ["Finished job", "Draft invoice prepared from the job details."],
  ["Unpaid invoice", "Follow-up prepared, nothing sent until approval."],
  ["Open quote", "Next-step review card created in Command."],
  ["Blocked job", "Owner decision surfaced before the work stalls."],
  ["Worker update", "Notes, photos and field updates held for review."],
  ["Accounting handoff", "Export or draft-sync step prepared safely."],
];

const steps = [
  ["Add the work", "Create the client, quote or job once, then keep the details in one place."],
  ["Run the job", "Schedule it, assign a worker, track time and capture notes or photos."],
  ["Command prepares", "Unfinished work, invoice drafts, follow-ups and admin checks move to Command automatically."],
  ["You approve", "Review, edit, approve or ignore before anything important moves."],
];

const trust = [
  ["Built for real operators", "Made for owners who need jobs, workers, quotes and invoices connected."],
  ["You stay in control", "Churvox can prepare admin actions, but you approve what goes out."],
  ["Accounting stays safe", "Draft sync and export paths only. No tax filing, no bank payout files and no automatic invoice sending."],
  ["Start with the right plan", "Pick Start, Crew, Operator or Command, then start the trial for that plan."],
];

const previewItems = [
  ["Today", "3 jobs planned"],
  ["Invoices", "$1,240 waiting"],
  ["Command", "4 approvals"],
  ["Accounting", "Handoff ready"],
];

const productScreens = [
  ["Today’s Plan", "See the work that is already planned, assigned and ready to run."],
  ["Command", "Unfinished admin lands in one approval desk: review, edit, approve or ignore."],
  ["Jobs", "Keep job details, notes, workers, photos, time, price and status in one clean record."],
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
  ["Most apps store the work", "Churvox also watches for the admin that should happen next."],
  ["AI with owner control", "Admin actions can be prepared, but important steps stay reviewed by you."],
  ["Command is the approval desk", "Unfinished work, follow-ups and draft admin are gathered in one place instead of scattered across record pages."],
  ["Accounting is a handoff", "Accounting support is controlled: draft sync, exports and payment checks, not risky automation."],
];

const compareRows = [
  ["Jobs scattered in texts", "Jobs visible in one workspace"],
  ["Invoices delayed or forgotten", "Draft invoice prepared after completed work"],
  ["Owner hunts for what is unfinished", "Command shows the unfinished admin queue"],
  ["Workers ask what is next", "Worker view shows the job"],
  ["Accounting feels messy", "Accounting handoff ready"],
  ["Owner does every admin step", "Churvox prepares, owner approves"],
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
    <aside className="simpleCard simpleHeroPreview" aria-label="Churvox Command preview">
      <div className="simplePreviewTop">
        <span>Command</span>
        <b>Approval desk</b>
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
        <span>Find</span>
        <span>Prepare</span>
        <span>Review</span>
        <span>Approve</span>
      </div>
      <div className="simplePreviewApproval">
        <b>Draft invoice ready</b>
        <p>Completed job found. Price, customer, recurring status and job facts are ready for owner approval.</p>
      </div>
    </aside>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_PUBLIC_COMMAND_POSITIONING_20260625">
      <Nav />

      <section className="simpleHero">
        <div>
          <span className="simpleKicker">Owner-approved admin for service businesses</span>
          <h1>Churvox does the admin. You approve.</h1>
          <p className="simpleLead">
            Churvox keeps jobs, workers, quotes, invoices, follow-ups and accounting handoff moving for service businesses, without taking control away from the owner.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start 14-day trial</Link>
            <Link to="/features" className="simpleBtn simpleGhost">See how it works</Link>
          </div>
          <div className="simpleProof">{proof.map((item) => <span key={item}>{item}</span>)}</div>
        </div>

        <AppPreview />
      </section>

      <section className="simpleBand simpleDifferenceBand">
        <span className="simpleSectionLabel">Why it is different</span>
        <h2>Field service software stores records. Churvox moves the admin forward.</h2>
        <p className="simpleLead">
          Traditional field-service tools help manage quotes, schedules and invoices. Churvox keeps those basics clean, then sends unfinished admin to Command so the owner can approve the next step instead of hunting for it.
        </p>
        <div className="simpleGrid">
          {difference.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand simpleInsideBand">
        <div>
          <span className="simpleSectionLabel">What Command prepares</span>
          <h2>The admin queue builds itself from real work.</h2>
          <p className="simpleLead">
            Command is the approval desk. Churvox looks for completed work, blocked jobs, unpaid invoices, open quotes and worker updates, then prepares clear cards with the facts you need before approval.
          </p>
        </div>
        <div className="simpleProductShowcase">
          {commandPrepares.map(([title, text]) => (
            <article key={title}>
              <div>
                <small>Command prepares</small>
                <b>{title}</b>
              </div>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand simpleInsideBand">
        <div>
          <span className="simpleSectionLabel">Inside Churvox</span>
          <h2>Clean record pages. One approval desk.</h2>
          <p className="simpleLead">
            Jobs, clients, quotes, invoices and team pages stay clean. Missing setup, follow-ups and unfinished admin go to Command where they belong.
          </p>
        </div>
        <div className="simpleProductShowcase">
          {productScreens.map(([title, text]) => (
            <article key={title}>
              <div>
                <small>{title}</small>
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
          <h2>For owners who are done running the business from texts and memory.</h2>
          <p className="simpleLead">
            If your jobs are in messages, notebooks, screenshots, unpaid invoices and your head, Churvox gives the business one place to work from and one desk for what needs approval.
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
        <h2>Ready to stop chasing the admin?</h2>
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
