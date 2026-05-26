import React from "react";
import { Link } from "react-router-dom";
import "./ExecutivePublicSite.css";
import "./ExecutiveCommandFloorPublicOverride.css";
import "./ExecutiveApprovalLanding.css";

const brandTextStyle = {
  color: "#f6fbfc",
  fontWeight: 950,
  fontSize: 20,
  letterSpacing: "-0.05em",
  textShadow: "0 2px 14px rgba(0,0,0,.32)",
};

function ChurvoxCMark() {
  return (
    <span className="ex-c-logo" aria-hidden="true">
      <svg viewBox="0 0 64 64" role="presentation">
        <defs>
          <linearGradient id="cx-cyan" x1="8" y1="48" x2="56" y2="14" gradientUnits="userSpaceOnUse">
            <stop stopColor="#b8fbff" />
            <stop offset=".42" stopColor="#22d7ff" />
            <stop offset="1" stopColor="#1888ff" />
          </linearGradient>
          <linearGradient id="cx-glass" x1="7" y1="8" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#13395a" />
            <stop offset=".56" stopColor="#071827" />
            <stop offset="1" stopColor="#020814" />
          </linearGradient>
          <filter id="cx-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.05 0 0 0 0 0.8 0 0 0 0 1 0 0 0 .95 0" />
            <feBlend in="SourceGraphic" />
          </filter>
        </defs>
        <rect x="1" y="1" width="62" height="62" rx="16" fill="url(#cx-glass)" />
        <rect x="1.5" y="1.5" width="61" height="61" rx="15.5" fill="none" stroke="#2ad7ff" strokeOpacity=".22" />
        <path d="M48.8 14.2A22.8 22.8 0 1 0 48.8 49.8" fill="none" stroke="url(#cx-cyan)" strokeWidth="8.2" strokeLinecap="round" filter="url(#cx-glow)" />
        <path d="M50 15.3 57 20.8 48.2 25.5Z" fill="url(#cx-cyan)" filter="url(#cx-glow)" />
        <path d="M48.2 38.5 57 43.2 50 48.7Z" fill="url(#cx-cyan)" filter="url(#cx-glow)" />
        <path d="M8 27.2h21.4c5 0 7.2 2.8 9.4 6.2 2.8 4.4 7 6.9 13.4 6.9" fill="none" stroke="url(#cx-cyan)" strokeWidth="4.5" strokeLinecap="round" filter="url(#cx-glow)" />
        <path d="M5.5 32h23.5" fill="none" stroke="url(#cx-cyan)" strokeWidth="4.1" strokeLinecap="round" opacity=".96" />
        <path d="M10 36.8h18" fill="none" stroke="url(#cx-cyan)" strokeWidth="4.1" strokeLinecap="round" opacity=".72" />
      </svg>
    </span>
  );
}

function Brand() {
  return <><ChurvoxCMark /><span style={brandTextStyle}>Churvox</span></>;
}

function Nav() {
  return (
    <header className="ex-nav">
      <Link to="/" className="ex-brand"><Brand /></Link>
      <nav className="ex-nav-links">
        <Link to="/">Home</Link>
        <Link to="/features">Features</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/login" className="ex-nav-login">Log in</Link>
      </nav>
      <div className="ex-nav-actions">
        <Link to="/login" className="ex-login">Log in</Link>
        <Link to="/signup" className="ex-btn ex-btn--primary">Start free</Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="ex-footer">
      <div>
        <Link to="/" className="ex-brand ex-brand--footer"><Brand /></Link>
        <p>AI approval software for trade and service owners.</p>
      </div>
      <div className="ex-footer-links">
        <Link to="/features">Features</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/login">Log in</Link>
        <Link to="/signup">Start free</Link>
      </div>
    </footer>
  );
}

export { Nav, Footer };

const lanes = [
  ["Approve Work", "5", "Finished jobs with notes, evidence and value ready to review.", "amber"],
  ["Approve Invoices", "$1.2k", "Draft invoices and owing work waiting for owner approval.", "green"],
  ["Assign Workers", "26", "Unassigned jobs and crew gaps surfaced before they become problems.", "blue"],
  ["Approve Messages", "20", "Quote follow-ups and customer updates drafted before sending.", "purple"],
  ["Fix Issues", "25", "Missing price, missing details and blocked admin in one lane.", "red"],
];

const steps = [
  ["01", "Work comes in", "Jobs, quotes, invoices, crew updates and client details land in Churvox."],
  ["02", "AI prepares the admin", "Churvox turns the noise into owner-ready approval lanes."],
  ["03", "You approve the next step", "Open the slip, check the details, approve, assign, invoice or save the draft."],
];

const plans = [
  ["Start", "$39", "Simple AI admin for solo operators."],
  ["Crew", "$89", "Jobs, workers and core admin control."],
  ["Operator", "$149", "The main Churvox AI Operator plan."],
  ["Command", "$299", "Advanced roles, MYOB, payroll workspace and scale."],
];

function ApprovalDeskMockup() {
  return (
    <aside className="ex-approval-mockup" aria-label="Churvox approval desk preview">
      <div className="ex-mock-top"><b>Command Floor</b><span>Owner Approval Desk</span></div>
      <section className="ex-mock-hero">
        <div><small>Next approval</small><b>Approve finished work</b><span>89 decisions waiting</span></div>
        <i>✓</i>
      </section>
      <div className="ex-mock-lanes">
        {lanes.map(([title, value, copy, tone]) => (
          <article key={title} className={`ex-mock-lane tone-${tone}`}>
            <span>{title}</span>
            <b>{value}</b>
            <p>{copy}</p>
            <em>{title.includes("Workers") ? "Assign" : title.includes("Issues") ? "Fix" : "Review"}</em>
          </article>
        ))}
      </div>
      <div className="ex-mock-slip">
        <small>Work Slip</small>
        <b>Evidence, price, customer message and approval buttons stay on the same page.</b>
      </div>
    </aside>
  );
}

function LaneCard({ title, value, copy, tone }) {
  return <article className={`ex-lane-card tone-${tone}`}><span>{title}</span><b>{value}</b><p>{copy}</p></article>;
}

export default function ExecutiveHomePage() {
  return (
    <main className="ex-site ex-approval-landing" data-version="CHURVOX_APPROVAL_LANDING_20260527">
      <Nav />
      <section className="ex-landing-hero">
        <div className="ex-landing-copy">
          <p className="ex-kicker">AI approval desk for trade and service businesses</p>
          <h1>Churvox does the admin. You approve.</h1>
          <p className="ex-lead">Churvox turns finished work, invoices, worker assignments, customer messages and admin problems into clear approval lanes. Open the slip, check the details, approve the next step.</p>
          <div className="ex-actions"><Link to="/signup" className="ex-btn ex-btn--primary">Start free trial</Link><Link to="/features" className="ex-btn ex-btn--quiet">See the approval flow</Link></div>
          <div className="ex-notes"><span>Work approvals</span><span>Invoice approvals</span><span>Worker assignment</span><span>Message drafts</span><span>Fix issues</span></div>
        </div>
        <ApprovalDeskMockup />
      </section>
      <section className="ex-lane-strip">
        {lanes.map(([title, value, copy, tone]) => <LaneCard key={title} title={title} value={value} copy={copy} tone={tone} />)}
      </section>
      <section className="ex-approval-flow">
        <div>
          <p className="ex-kicker">How it works</p>
          <h2>One page for the owner’s decisions.</h2>
          <p>Instead of hunting through jobs, invoices, messages and worker screens, the owner starts in Command Floor. Churvox separates the work into clear lanes so the next decision is obvious.</p>
          <Link to="/pricing" className="ex-btn ex-btn--primary">View pricing</Link>
        </div>
        <div className="ex-flow-steps">
          {steps.map(([number, title, copy]) => <article key={title}><span>{number}</span><b>{title}</b><p>{copy}</p></article>)}
        </div>
      </section>
      <section className="ex-pricing-teaser">
        <div><p className="ex-kicker">Plans</p><h2>Start simple. Grow into the Operator plan.</h2></div>
        <div className="ex-plan-row">{plans.map(([name, price, copy]) => <article key={name}><span>{name}</span><b>{price}</b><small>/month + GST</small><p>{copy}</p></article>)}</div>
      </section>
      <Footer />
    </main>
  );
}