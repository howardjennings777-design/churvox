import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./SimplePublic.css";

const proof = ["14-day trial", "No card needed", "Guided setup", "You approve the admin"];

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
  ["Quote the work", "Send a clean quote from the job details instead of rewriting the same admin twice."],
  ["Turn accepted quotes into jobs", "When the customer accepts, the job is ready for the owner to assign and run."],
  ["Keep workers moving", "Assign the job, capture time, complete the work, then invoice from the same flow."],
  ["Get paid and keep records", "Send the invoice, give the customer a simple public link, and keep the status visible."],
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
<<<<<<< HEAD
      <div className="simpleFooterBrand">
        <ChurvoxLogo variant="mark" size="md" />
        <span><b>Churvox</b><small>Less admin. More jobs done.</small></span>
      </div>
=======
      <div><b>Churvox</b><span>Job → Invoice → Paid.</span></div>
>>>>>>> ba9f3a28 (Clarify marketing message and plan choice)
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
    <main className="simplePublic" data-version="CHURVOX_PUBLIC_COPY_20260614">
      <Nav />

      <section className="simpleHero">
        <div>
          <span className="simpleKicker">Built for service businesses that run jobs every day</span>
          <h1>Quote the job. Do the work. Send the invoice. Get paid.</h1>
          <p className="simpleLead">
            Churvox keeps clients, jobs, quotes, workers, invoices and follow-ups together.
            It prepares the next admin step, then you approve it before anything important goes out.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
            <Link to="/pricing" className="simpleBtn simpleGhost">View pricing</Link>
          </div>
          <div className="simpleProof">{proof.map((item) => <span key={item}>{item}</span>)}</div>
        </div>

        <aside className="simpleCard">
          <h2>Made for the messy middle of service work.</h2>
          <p>Customer asks for work, quote goes out, job gets assigned, worker completes it, invoice gets sent, owner sees paid.</p>
          <ol>
            <li>1. Add or quote the job</li>
            <li>2. Customer accepts</li>
            <li>3. Assign a worker</li>
            <li>4. Complete with time captured</li>
            <li>5. Invoice and track payment</li>
          </ol>
        </aside>
      </section>

      <section className="simpleBand">
        <h2>For the service businesses that live in texts, notes and memory.</h2>
        <p className="simpleLead">
          Churvox is a practical workspace for owner-operators and small crews who need the job and the paperwork in one place.
        </p>
        <div className="simpleProof">
          {trades.map((trade) => <span key={trade}>{trade}</span>)}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Keep the job and the admin together.</h2>
        <p className="simpleLead">
          No more hunting through messages, screenshots, paper notes and old invoices. Churvox keeps the work and the admin connected.
        </p>
        <div className="simpleGrid">
          {steps.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Start simple. Turn on more when you need it.</h2>
        <p className="simpleLead">
          Start with jobs and clients. Add quotes, invoices, workers, payroll workspace, automation and accounting support as your business grows.
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
