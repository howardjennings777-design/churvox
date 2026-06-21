import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./SimplePublic.css";

const proof = [
  "14-day free trial",
  "Choose a plan before Stripe",
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
  ["Add the work", "Create the client, quote or job once, then keep the details in one place."],
  ["Run the job", "Schedule it, assign a worker, track time and capture notes or photos."],
  ["Review the admin", "Churvox prepares the next step, but important actions stay owner-approved."],
  ["Invoice and get paid", "Send the invoice, keep payment status visible and sync accounting where available."],
];

const trust = [
  ["Built for real operators", "Designed for owners who need jobs, workers, quotes and invoices connected."],
  ["You stay in control", "Churvox prepares admin actions, but you approve what goes out."],
  ["Customer links included", "Quotes, invoices and request forms can be opened by customers without a login."],
  ["Start with the right plan", "Pick Start, Crew, Operator or Command, then Stripe starts the 14-day trial for that plan."],
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
        <Link to="/request" className="simpleGhost">Request work</Link>
        <Link to="/login" className="simpleGhost">Log in</Link>
        <Link to="/signup" className="simplePrimary">Start trial</Link>
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
    <main className="simplePublic" data-version="CHURVOX_PUBLIC_PLAN_FIRST_STRIPE_TRIAL_20260621">
      <Nav />

      <section className="simpleHero">
        <div>
          <span className="simpleKicker">Job admin for service businesses</span>
          <h1>Know what needs doing next.</h1>
          <p className="simpleLead">
            Churvox keeps jobs, clients, quotes, workers, time, invoices and owner-approved admin actions in one clean workspace.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start trial</Link>
            <Link to="/request" className="simpleBtn simpleGhost">Request work</Link>
            <Link to="/pricing" className="simpleBtn simpleGhost">View plans</Link>
          </div>
          <div className="simpleProof">{proof.map((item) => <span key={item}>{item}</span>)}</div>
        </div>

        <aside className="simpleCard">
          <h2>The Churvox flow</h2>
          <ol>
            <li>1. Create your account</li>
            <li>2. Choose Start, Crew, Operator or Command</li>
            <li>3. Stripe starts the 14-day trial</li>
            <li>4. Churvox opens setup</li>
            <li>5. You run the first job-to-paid flow</li>
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
        </p>
        <div className="simpleGrid">
          {steps.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Serious enough for real work. Simple enough to start today.</h2>
        <p className="simpleLead">
          Start with jobs, clients, quotes and invoices. Add workers, time sheets, payroll review,
          Command approvals, automation and accounting sync as your business grows.
        </p>
        <div className="simpleGrid">
          {trust.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Ready to run your next job properly?</h2>
        <p className="simpleLead">
          Create your account, choose the plan that matches your business, then Stripe starts the 14-day trial.
        </p>
        <div className="simpleActions">
          <Link to="/signup" className="simpleBtn simplePrimary">Start trial</Link>
          <Link to="/request" className="simpleBtn simpleGhost">Request work</Link>
          <Link to="/pricing" className="simpleBtn simpleGhost">Choose a plan</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
