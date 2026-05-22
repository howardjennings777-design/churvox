import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";

const modules = [
  "Jobs",
  "Clients",
  "Quotes",
  "Invoices",
  "Team",
  "Worker app",
  "Proof photos",
  "Payroll",
  "MYOB",
  "SMS",
];

function Action({ to, children, primary }) {
  return <Link to={to} className={primary ? "wh-public-cta" : "wh-public-ghost"}>{children}</Link>;
}

export default function CommandMachineHomePage() {
  return (
    <main className="wh-public">
      <header className="wh-public-nav">
        <Link to="/" className="wh-public-logo"><ChurvoxLogo /></Link>
        <nav className="wh-public-links">
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/login">Log in</Link>
        </nav>
        <Link to="/signup" className="wh-public-cta">Start free</Link>
      </header>

      <section className="wh-public-hero">
        <div>
          <p className="wh-public-kicker">AI Operator for trade businesses</p>
          <h1 className="wh-public-title">The admin workhorse for your business.</h1>
          <p className="wh-public-lead">
            Churvox turns jobs, clients, quotes, invoices, crew updates and money follow-up into prepared owner decisions. Work comes in. Churvox prepares it. You approve.
          </p>
          <div className="wh-public-actions">
            <Action to="/signup" primary>Start free</Action>
            <Action to="/login">Log in</Action>
            <Action to="/features">See how it works</Action>
          </div>
        </div>

        <aside className="wh-machine">
          <div className="wh-machine-head">
            <strong>Churvox Workhorse Feed</strong>
            <span>LIVE PREP</span>
          </div>
          <div className="wh-decision">
            <p className="wh-public-kicker">Next owner move</p>
            <h2>Invoice prepared from completed work</h2>
            <p>
              Job complete. Client found. Proof photos attached. Price checked. Customer document prepared for review.
            </p>
            <Link to="/signup" className="wh-public-cta">Open decision slip</Link>
          </div>
          <div className="wh-flow">
            <div className="wh-flow-card">
              <span>1</span>
              <h3>Work comes in</h3>
              <p>Jobs, photos, times, quotes and invoices land in one business machine.</p>
            </div>
            <div className="wh-flow-card">
              <span>2</span>
              <h3>Churvox prepares</h3>
              <p>Admin is pulled forward before it becomes another owner job.</p>
            </div>
            <div className="wh-flow-card">
              <span>3</span>
              <h3>You approve</h3>
              <p>Review the prepared move, edit if needed, then send it forward.</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="wh-public-band">
        <p className="wh-public-kicker">One practical operating system</p>
        <h2>Built for the daily grind, not a pretty dashboard wall.</h2>
        <p className="wh-public-lead">
          Churvox keeps the work moving across the office and the field, with the AI Operator preparing the next admin move in the background.
        </p>
        <div className="wh-module-grid">
          {modules.map((module) => <div key={module} className="wh-module">{module}</div>)}
        </div>
      </section>

      <section className="wh-public-final">
        <div>
          <p className="wh-public-kicker">Ready for a cleaner business machine?</p>
          <h2 className="wh-public-title" style={{ fontSize: "clamp(42px,5vw,82px)" }}>Churvox does the admin prep. You stay in control.</h2>
        </div>
        <div className="wh-public-actions">
          <Action to="/signup" primary>Start free</Action>
          <Action to="/pricing">View pricing</Action>
        </div>
      </section>
    </main>
  );
}
