import React from "react";
import { Link, NavLink } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./NewPublicSite.css";

export const plans = [
  {
    name: "Start",
    price: "$39",
    tag: "Owner-operator",
    short: "Get the work out of your head.",
    body: "Jobs, clients, quotes and invoices in one clean operating desk.",
    includes: ["Jobs and clients", "Quotes and invoices", "Starter AI prep", "Core mobile access"],
  },
  {
    name: "Crew",
    price: "$89",
    tag: "Small team",
    short: "Bring the crew into the flow.",
    body: "Assign work, collect field updates and keep proof connected to the job.",
    includes: ["Worker app", "Team workflow", "Proof photos", "More job capacity"],
  },
  {
    name: "Operator",
    price: "$149",
    tag: "Main plan",
    short: "Churvox prepares. You approve.",
    body: "AI Operator Actions turn daily admin into prepared decisions.",
    includes: ["AI Operator Actions", "Approval queue", "Automation workflows", "MYOB add-on +$39"],
    featured: true,
  },
  {
    name: "Command",
    price: "$299",
    tag: "Full control",
    short: "The full business command desk.",
    body: "Higher capacity, MYOB included, payroll workspace and advanced roles.",
    includes: ["MYOB included", "Payroll workspace", "Advanced roles", "Priority support"],
  },
];

export const lanes = [
  {
    label: "01",
    title: "Work lands",
    body: "Jobs, clients, crew updates, proof, quotes and invoices stop living in separate places.",
  },
  {
    label: "02",
    title: "AI prepares",
    body: "Churvox turns the messy admin into clear work slips with the next move ready.",
  },
  {
    label: "03",
    title: "Owner approves",
    body: "You review, edit if needed, approve and keep the business moving.",
  },
];

export const features = [
  {
    title: "Jobs",
    kicker: "Field work",
    body: "Create jobs, assign workers, track status, collect notes and keep proof tied to the client.",
  },
  {
    title: "AI Operator",
    kicker: "Admin prep",
    body: "Churvox prepares invoice drafts, quote follow-ups, reminders and owner approval moves.",
  },
  {
    title: "Money desk",
    kicker: "Quote to paid",
    body: "Quotes, invoices, payment follow-up and MYOB-ready workflows stay connected to the actual work.",
  },
  {
    title: "Crew control",
    kicker: "Right access",
    body: "Workers get simple field tools while owners, managers, admins and payroll get the right view.",
  },
];

export function PublicSiteShell({ page = "home", children }) {
  return (
    <main className={`nw-site nw-site--${page}`}>
      <header className="nw-nav">
        <Link to="/" className="nw-brand" aria-label="Churvox home">
          <ChurvoxLogo />
          <span>Churvox</span>
        </Link>

        <nav className="nw-nav__links" aria-label="Website navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/features">Features</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
        </nav>

        <div className="nw-nav__actions">
          <Link to="/login" className="nw-login">Log in</Link>
          <Link to="/signup" className="nw-btn nw-btn--dark">Start free</Link>
        </div>
      </header>

      {children}

      <footer className="nw-footer">
        <div>
          <Link to="/" className="nw-brand nw-brand--footer">
            <ChurvoxLogo />
            <span>Churvox</span>
          </Link>
          <p>AI office operator software for trade and service businesses.</p>
        </div>

        <div className="nw-footer__links">
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Start free</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </footer>
    </main>
  );
}

export function OperatorStage() {
  const slips = [
    ["Invoice ready", "Completed job, proof photos found, customer details checked.", "Approve"],
    ["Assign worker", "Best match prepared from workload, area and job timing.", "Review"],
    ["Quote follow-up", "Customer has not replied. Message drafted and waiting.", "Send"],
  ];

  return (
    <aside className="nw-stage" aria-label="Churvox product preview">
      <div className="nw-stage__bar">
        <span />
        <span />
        <span />
        <strong>AI Operator Desk</strong>
        <em>Live prep</em>
      </div>

      <div className="nw-stage__body">
        <div className="nw-stage__hero-card">
          <p>Next owner decision</p>
          <h2>3 work slips ready</h2>
          <span>Churvox prepared the admin. Nothing sends until you approve.</span>
        </div>

        <div className="nw-stage__slips">
          {slips.map(([title, body, action], index) => (
            <article key={title} style={{ "--i": index }}>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
              <button type="button">{action}</button>
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function OperatingMap() {
  const zones = [
    ["Ready to approve", "Invoices, quotes and messages prepared for owner review."],
    ["Needs fixing", "Missing prices, unassigned work and customer follow-ups."],
    ["Field and crew", "Workers, job progress, photos, notes and time."],
    ["Money desk", "Invoices, MYOB, payroll review and payment follow-up."],
  ];

  return (
    <section className="nw-map" aria-label="Churvox operating map">
      <div className="nw-map__center">
        <span>AI</span>
        <strong>Operator</strong>
        <p>Prepares the next admin move.</p>
      </div>

      {zones.map(([title, body], index) => (
        <article key={title} className={`nw-map__zone nw-map__zone--${index + 1}`}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h3>{title}</h3>
          <p>{body}</p>
        </article>
      ))}
    </section>
  );
}

export function WorkConveyor() {
  const steps = ["Lead", "Quote", "Job", "Proof", "Invoice", "Paid"];

  return (
    <section className="nw-conveyor" aria-label="Workflow conveyor">
      <div className="nw-conveyor__head">
        <p className="nw-kicker">The daily path</p>
        <h2>Work moves across the desk instead of falling into gaps.</h2>
      </div>

      <div className="nw-conveyor__track">
        {steps.map((step, index) => (
          <article key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
