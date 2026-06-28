import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./SimplePublic.css";
import "./SimplePublicStrong.css";

const navLinks = [
  ["/features", "How it works"],
  ["/pricing", "Pricing"],
  ["/login", "Log in"],
];

const proof = [
  "14-day free trial",
  "No card upfront",
  "Owner approval in Command",
  "CSV import and export",
];

const osAreas = [
  ["Today", "Jobs due, workers active, money due, messages and issues for this business day."],
  ["Command", "The only approval desk. Approve, edit or park prepared admin here."],
  ["Jobs", "Add work, edit job details, manage recurring work, proof, time, prices and status."],
  ["Clients", "Client list, editable records, service memory, price memory and history."],
  ["Workers", "Clocked-in team, current jobs, GPS view, proof, photos, messages and slips."],
  ["Money", "Quotes, invoices, due money, paid work and draft sync readiness."],
];

const workflow = [
  ["1", "Work goes in", "Add a job, import clients, capture worker proof or receive a customer message."],
  ["2", "Churvox prepares", "Draft invoices, quote follow-ups, replies, missing details and sync checks are assembled from records."],
  ["3", "Owner checks", "Important decisions wait in Command with enough context to understand what happened."],
  ["4", "Owner approves", "Approve, edit or park. Churvox never hides the decision in another page."],
];

const guardrails = [
  ["No auto-send", "Messages, invoices and sync decisions can be prepared, but important actions wait for owner approval."],
  ["Command only", "Approve, edit and park controls live in Command, not scattered across the app."],
  ["Accounting safe", "Draft sync only where available. No tax filing and no payout files."],
  ["Real records", "The app fills from jobs, clients, workers, quotes, invoices, messages and imports."],
];

const operatingMoments = [
  ["A worker uploads proof", "Churvox links the photos, job, worker, time and invoice context."],
  ["A quote needs follow-up", "The reply can be prepared from client memory, quote status and job notes."],
  ["An invoice is missing details", "It is held back from Today and routed to Command or the right setup page."],
  ["A customer asks for a change", "The message thread stays visible and the action waits for approval."],
];

export function Nav() {
  return (
    <nav className="publicNav" aria-label="Public navigation">
      <Link to="/" className="publicBrand" aria-label="Churvox home">
        <ChurvoxLogo variant="mark" size="lg" />
        <span>
          <b>Churvox</b>
          <small>does the admin</small>
        </span>
      </Link>

      <div className="publicLinks">
        {navLinks.map(([to, label]) => (
          <Link key={to} to={to}>{label}</Link>
        ))}
        <Link to="/signup" className="publicPrimary">Start trial</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="publicFooter">
      <div className="publicFooterBrand">
        <ChurvoxLogo variant="mark" size="md" />
        <span>
          <b>Churvox</b>
          <small>The owner-approved admin OS.</small>
        </span>
      </div>
      <nav aria-label="Footer navigation">
        <Link to="/features">How it works</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/request">Customer request form</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-of-service">Terms</Link>
        <Link to="/login">Log in</Link>
      </nav>
    </footer>
  );
}

function ProductMock() {
  return (
    <aside className="publicMock" aria-label="Churvox OS preview">
      <div className="publicMockTop">
        <span>Churvox OS</span>
        <b>Owner checks and approves</b>
      </div>
      <div className="publicMockTabs">
        <span>Today</span>
        <span className="active">Command</span>
        <span>Jobs</span>
        <span>Workers</span>
      </div>
      <div className="publicMockGrid">
        <section>
          <small>Waiting for approval</small>
          <article>
            <b>Invoice ready</b>
            <span>Job, photos, time and price checked</span>
          </article>
          <article>
            <b>Quote follow-up</b>
            <span>Draft reply prepared from client history</span>
          </article>
          <article>
            <b>Missing job time</b>
            <span>Needs date and worker time before Today</span>
          </article>
        </section>
        <section>
          <small>Filled approval slip</small>
          <div className="publicSlip">
            <b>Invoice ready</b>
            <span>Client: Belmont Villas</span>
            <span>Job: Hedge trim</span>
            <span>Proof: 3 photos + note</span>
            <span>Recommended action: Approve</span>
          </div>
          <div className="publicMockActions">
            <span>Approve</span>
            <span>Edit</span>
            <span>Park</span>
          </div>
        </section>
      </div>
    </aside>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="publicSite" data-version="CHURVOX_PUBLIC_MODERN_OS_20260629">
      <Nav />

      <section className="publicHero">
        <div className="publicHeroCopy">
          <span className="publicKicker">Modern admin OS for service businesses</span>
          <h1>Churvox does the admin. The owner checks and approves.</h1>
          <p>
            Run jobs, clients, workers, quotes, invoices, messages and accounting handoff in one clean system. Churvox prepares the admin from real records, then Command gives the owner one place to approve, edit or park it.
          </p>
          <div className="publicActions">
            <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
            <Link to="/features" className="publicSecondary">See how it works</Link>
          </div>
          <div className="publicProof">
            {proof.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <ProductMock />
      </section>

      <section className="publicBand publicStatement">
        <span className="publicKicker">The point</span>
        <h2>Less chasing. Less guessing. One approval desk.</h2>
        <p>
          The owner should not hunt through every page to find what needs a decision. Churvox turns work activity into clear admin slips, and Command keeps the final decisions controlled.
        </p>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">How it runs</span>
          <h2>Four steps, every day.</h2>
        </div>
        <div className="publicFlow">
          {workflow.map(([num, title, text]) => (
            <article key={title}>
              <i>{num}</i>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicSplit">
        <div>
          <span className="publicKicker">Inside Churvox</span>
          <h2>Every page has a job.</h2>
          <p>
            The public site now matches the product shape: light readable pages, black industrial headers, orange action points and one simple promise.
          </p>
        </div>
        <div className="publicAreaGrid">
          {osAreas.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Real business moments</span>
          <h2>Churvox prepares the next admin move.</h2>
        </div>
        <div className="publicCardGrid">
          {operatingMoments.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicDarkBand">
        <div>
          <span className="publicKicker">Guardrails</span>
          <h2>Useful automation. Owner control.</h2>
        </div>
        <div className="publicCardGrid">
          {guardrails.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicCta">
        <div>
          <span className="publicKicker">Start clean</span>
          <h2>Put the business into Churvox and let Command handle the owner checks.</h2>
        </div>
        <div className="publicActions">
          <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
          <Link to="/pricing" className="publicSecondary">View plans</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
