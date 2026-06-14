import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./SimplePublic.css";

const proof = [
  "14-day trial",
  "No card needed",
  "Owner approval built in",
  "Real quote-to-paid workflow",
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
  ["Quote the work", "Create and send a professional quote from the same customer and job details."],
  ["Customer accepts", "The public quote link lets the customer accept, then Churvox creates the job for the owner."],
  ["Run the job", "Assign a worker, track time, complete the work and keep the record together."],
  ["Invoice and get paid", "Send the invoice by email, let the customer open the public link, and keep paid status visible."],
];

const trust = [
  ["Built for real operators", "Designed for owners who need jobs, workers, quotes and invoices in one place."],
  ["You stay in control", "Churvox prepares the next admin step, but important actions stay owner-approved."],
  ["Customer links included", "Quotes and invoices can be opened by customers without needing a login."],
  ["Proofed core loop", "The core job-to-paid workflow has been tested end-to-end before launch."],
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
        <Link to="/signup" className="simplePrimary">Start free</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="simpleFooter">
      <div className="simpleFooterBrand">
        <ChurvoxLogo variant="mark" size="md" />
        <span><b>Churvox</b><small>Job → Invoice → Paid.</small></span>
      </div>
      <nav>
        <Link to="/pricing">Pricing</Link>
        <Link to="/features">How it works</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-of-service">Terms</Link>
        <Link to="/login">Log in</Link>
      </nav>
    </footer>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_PUBLIC_ENTERPRISE_COPY_20260614">
      <Nav />

      <section className="simpleHero">
        <div>
          <span className="simpleKicker">Command-grade job admin for service businesses</span>
          <h1>Quote jobs. Run crews. Send invoices. Get paid.</h1>
          <p className="simpleLead">
            Churvox gives service businesses one clean workspace for clients, jobs, quotes, workers,
            invoices and follow-ups. It prepares the next admin step, then you approve it.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
            <Link to="/pricing" className="simpleBtn simpleGhost">View plans</Link>
          </div>
          <div className="simpleProof">{proof.map((item) => <span key={item}>{item}</span>)}</div>
        </div>

        <aside className="simpleCard">
          <h2>One flow from customer request to paid invoice.</h2>
          <p>Quote the work, customer accepts, job gets assigned, worker completes it, invoice gets sent, owner sees paid.</p>
          <ol>
            <li>1. Create or send the quote</li>
            <li>2. Customer accepts online</li>
            <li>3. Job appears for the owner</li>
            <li>4. Worker completes with time captured</li>
            <li>5. Invoice goes out and paid status updates</li>
          </ol>
        </aside>
      </section>

      <section className="simpleBand">
        <h2>Built for the service businesses that outgrow texts and memory.</h2>
        <p className="simpleLead">
          Churvox is made for owner-operators and growing crews who need the work and the paperwork connected.
        </p>
        <div className="simpleProof">
          {trades.map((trade) => <span key={trade}>{trade}</span>)}
        </div>
      </section>

      <section className="simpleBand">
        <h2>The core workflow is simple.</h2>
        <p className="simpleLead">
          No more jumping between messages, notes, spreadsheets, paper invoices and memory.
          Churvox keeps the job and the admin in one place.
        </p>
        <div className="simpleGrid">
          {steps.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Serious enough for real work. Simple enough to start today.</h2>
        <p className="simpleLead">
          Start with jobs, clients, quotes and invoices. Add workers, payroll workspace, Command approvals,
          automation and accounting support as your business grows.
        </p>
        <div className="simpleGrid">
          {trust.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Ready to run your next job properly?</h2>
        <p className="simpleLead">
          Start free, set up your business, add your first client and run the first job-to-paid flow.
        </p>
        <div className="simpleActions">
          <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
          <Link to="/pricing" className="simpleBtn simpleGhost">Choose a plan</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
