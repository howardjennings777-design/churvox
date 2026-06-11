import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./SimplePublic.css";

const proof = ["14-day free trial", "No card to start", "AI setup guide", "Owner approves first"];

const steps = [
  ["Add the job", "Create jobs, assign work and keep notes, photos, price and customer details together."],
  ["Churvox prepares admin", "Invoices, reminders, quote follow-ups and missing details are brought forward."],
  ["You approve", "The owner checks the prepared action before anything important goes out."],
];

export function Nav() {
  return (
    <nav className="simpleNav">
      <Link to="/" className="simpleBrand">
        <ChurvoxLogo variant="mark" size="lg" />
        <span><b>Churvox</b><small>AI admin for trade owners</small></span>
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
      <div><b>Churvox</b><span>Churvox does the admin. You approve.</span></div>
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
    <main className="simplePublic" data-version="CHURVOX_SIMPLE_PUBLIC_SELL_20260611">
      <Nav />
      <section className="simpleHero">
        <div>
          <span className="simpleKicker">For trade and service businesses</span>
          <h1>Churvox does the admin. You approve.</h1>
          <p className="simpleLead">
            Run jobs, clients, quotes, invoices, workers and follow-ups from one clean owner workspace.
            Churvox prepares the next admin action so you know what to do first.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
            <Link to="/login" className="simpleBtn simpleGhost">Log in</Link>
          </div>
          <div className="simpleProof">{proof.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <aside className="simpleCard">
          <h2>What happens after signup?</h2>
          <p>A new user lands in the AI Setup Guide. It shows them exactly how to set up the business and create the first real job flow.</p>
          <ol>
            <li>1. Set business details</li>
            <li>2. Add first client</li>
            <li>3. Create first job</li>
            <li>4. Prepare invoice</li>
            <li>5. Use Command approval</li>
          </ol>
        </aside>
      </section>
      <section className="simpleBand">
        <h2>Built around the real work.</h2>
        <p className="simpleLead">Churvox keeps the messy admin connected to the job instead of leaving it scattered across messages, notes and memory.</p>
        <div className="simpleGrid">
          {steps.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>
      <section className="simpleBand">
        <h2>Start simple. Grow into Command.</h2>
        <p className="simpleLead">Start with jobs and clients. Grow into quotes, invoices, workers, payroll workspace, automation and accounting sync.</p>
        <div className="simpleActions">
          <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
          <Link to="/pricing" className="simpleBtn simpleGhost">View pricing</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
