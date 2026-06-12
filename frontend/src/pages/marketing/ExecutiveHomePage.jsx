import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./SimplePublic.css";

const proof = ["14-day trial", "No card needed", "Guided setup", "You stay in control"];

const steps = [
  ["Job comes in", "Add the job once. Client details, notes, photos, price and worker stay together."],
  ["Churvox prepares the admin", "Quotes, invoices, reminders and follow-ups are brought forward for review."],
  ["You approve the next move", "Nothing important goes out until the owner checks it first."],
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
      <div><b>Churvox</b><span>Less admin. More jobs done.</span></div>
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
    <main className="simplePublic" data-version="CHURVOX_PUBLIC_COPY_20260612">
      <Nav />
      <section className="simpleHero">
        <div>
          <span className="simpleKicker">For trades and service businesses</span>
          <h1>Less admin. More jobs done.</h1>
          <p className="simpleLead">
            Churvox keeps jobs, clients, quotes, invoices and follow-ups in one place.
            It prepares the next admin step, then you approve it.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
            <Link to="/login" className="simpleBtn simpleGhost">Log in</Link>
          </div>
          <div className="simpleProof">{proof.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <aside className="simpleCard">
          <h2>Start with your first real job.</h2>
          <p>After signup, Churvox walks you through the basics so your first job flow is set up properly.</p>
          <ol>
            <li>1. Add business details</li>
            <li>2. Add your first client</li>
            <li>3. Create your first job</li>
            <li>4. Prepare the invoice</li>
            <li>5. Review in Command</li>
          </ol>
        </aside>
      </section>
      <section className="simpleBand">
        <h2>Keep the job and the admin together.</h2>
        <p className="simpleLead">No more hunting through messages, notes and memory. Churvox keeps the work and the paperwork connected.</p>
        <div className="simpleGrid">
          {steps.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>
      <section className="simpleBand">
        <h2>Start simple. Turn on more when you need it.</h2>
        <p className="simpleLead">Start with jobs and clients. Add quotes, invoices, workers, payroll workspace, automation and accounting support as your business grows.</p>
        <div className="simpleActions">
          <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
          <Link to="/pricing" className="simpleBtn simpleGhost">View pricing</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
