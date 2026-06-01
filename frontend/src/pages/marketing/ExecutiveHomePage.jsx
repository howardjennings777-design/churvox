import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./ExecutiveHomeProper.css";

const lanes = [
  ["Work ready", "12", "Jobs lined up with proof"],
  ["Money ready", "$4.8k", "Invoices ready to approve"],
  ["Crew gaps", "2", "Jobs need a worker"],
  ["Follow-ups", "5", "Quotes and payments to chase"],
];

const stages = [
  ["Jobs come in", "Add the job, client, worker, notes, photos and price in one clean place."],
  ["Churvox lines it up", "AI prepares the admin: invoice wording, follow-up messages, reminders and next actions."],
  ["You approve", "Nothing important sends or changes without the owner checking it first."],
];

const proof = [
  "No auto-sending without approval",
  "Built for trade and service teams",
  "Jobs, invoices, quotes and crew in one place",
  "Mobile-first for owners and workers",
];

const cards = [
  ["AI Operator", "Churvox spots what needs doing and prepares the next action for approval."],
  ["Work Slips", "Every important job, invoice, quote or reminder opens as a clear decision card."],
  ["Money Desk", "See work ready to invoice, unpaid invoices and follow-ups before cash gets forgotten."],
  ["Crew Control", "Assign work, check gaps, review photos and keep the day moving without digging."],
];

export function Nav() {
  return (
    <nav className="cvp-nav">
      <Link to="/" className="cvp-brand">
        <ChurvoxLogo variant="mark" size="lg" className="cvp-brand-logo" />
        <span>
          <b>Churvox</b>
          <small>AI Operator for trades</small>
        </span>
      </Link>
      <div className="cvp-nav-links">
        <Link to="/features">How it works</Link>
        <Link to="/pricing">Plans</Link>
        <Link to="/login">Log in</Link>
        <Link to="/signup" className="cvp-nav-cta">Start free</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="cvp-footer">
      <div>
        <b>Churvox</b>
        <span>Churvox does the admin. You approve.</span>
      </div>
      <nav>
        <Link to="/features">How it works</Link>
        <Link to="/pricing">Plans</Link>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-of-service">Terms</Link>
      </nav>
    </footer>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="cvp-home" data-version="CHURVOX_PUBLIC_HOME_SELLER_20260601">
      <div className="cvp-shell">
        <Nav />

        <section className="cvp-hero">
          <div className="cvp-panel cvp-hero-copy">
            <p className="cvp-kicker">AI command centre for trade businesses</p>
            <h1>
              Churvox does the admin.
              <span>You approve.</span>
            </h1>
            <p>
              Churvox helps trade and service owners stop chasing paperwork. Jobs, quotes, invoices, worker updates, photos, reminders and customer follow-ups are lined up in one simple command desk.
            </p>
            <p>
              The AI Operator prepares the next move. You stay in control and approve before anything important is sent, changed or charged.
            </p>
            <div className="cvp-actions">
              <Link to="/signup" className="cvp-btn cvp-btn-primary">Start free</Link>
              <Link to="/pricing" className="cvp-btn cvp-btn-ghost">See plans</Link>
            </div>
            <div className="cvp-proof">
              {proof.map((item) => <span key={item}>✓ {item}</span>)}
            </div>
          </div>

          <aside className="cvp-panel cvp-demo" aria-label="Churvox command desk preview">
            <div className="cvp-demo-head">
              <small>Owner command desk</small>
              <b>Today is already sorted.</b>
              <span>See what needs attention, what Churvox prepared, and the button to press next.</span>
            </div>
            <div className="cvp-demo-lanes">
              {lanes.map(([title, value, note]) => (
                <article className="cvp-demo-lane" key={title}>
                  <small>{title}</small>
                  <b>{value}</b>
                  <span>{note}</span>
                </article>
              ))}
            </div>
            <div className="cvp-work-slip">
              <div>
                <small>Work Slip ready</small>
                <b>Invoice ready from completed job</b>
                <span>Photos checked · price ready · customer message drafted</span>
              </div>
              <button type="button">Approve</button>
            </div>
            <div className="cvp-mini-dock">
              <span>Jobs</span><span>Money</span><span>Crew</span><span>AI</span>
            </div>
          </aside>
        </section>

        <section className="cvp-row">
          {stages.map(([title, copy], index) => (
            <article className="cvp-stage" key={title}>
              <i>{index + 1}</i>
              <b>{title}</b>
              <span>{copy}</span>
            </article>
          ))}
        </section>

        <section className="cvp-strip">
          <div>
            <p className="cvp-kicker">Why owners will care</p>
            <h2>Less admin. Faster money. Clearer days.</h2>
          </div>
          <div className="cvp-mini-grid">
            {cards.map(([title, copy]) => (
              <article className="cvp-mini-card" key={title}>
                <small>{title}</small>
                <b>{title}</b>
                <span>{copy}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="cvp-final">
          <p className="cvp-kicker">Built for busy trade owners</p>
          <h2>Run the business from one command desk.</h2>
          <Link to="/signup" className="cvp-btn cvp-btn-primary">Start free</Link>
        </section>

        <Footer />
      </div>
    </main>
  );
}
