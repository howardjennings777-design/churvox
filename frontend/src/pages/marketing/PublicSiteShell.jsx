import React from "react";
import { Link, NavLink } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./NewPublicSite.css";

export const plans = [
  {
    name: "Start",
    price: "$39",
    label: "Owner-operator",
    line: "A calm operating base for jobs, clients, quotes and invoices.",
    includes: ["Jobs and clients", "Quotes and invoices", "Basic AI preparation", "Mobile access"],
  },
  {
    name: "Crew",
    price: "$89",
    label: "Small team",
    line: "Bring field updates, proof and crew workflow into one organised system.",
    includes: ["Worker app", "Team workflow", "Proof photos", "More job capacity"],
  },
  {
    name: "Operator",
    price: "$149",
    label: "Recommended",
    line: "Churvox prepares the daily admin. The owner reviews and approves.",
    includes: ["AI Operator Actions", "Approval queue", "Automation workflows", "MYOB add-on +$39"],
    featured: true,
  },
  {
    name: "Command",
    price: "$299",
    label: "Full control",
    line: "The full business command desk with MYOB, payroll, roles and higher limits.",
    includes: ["MYOB included", "Payroll workspace", "Advanced roles", "Priority support"],
  },
];

export const capabilityGroups = [
  ["Jobs", "Work control", "Create, assign and complete work with the client, crew, proof and admin step connected."],
  ["AI preparation", "Admin control", "Churvox prepares invoices, follow-ups, reminders and owner decisions before admin piles up."],
  ["Money desk", "Cashflow control", "Quotes, invoices, payment follow-up and MYOB-ready workflows stay connected to completed work."],
  ["Team roles", "Access control", "Owners, managers, office admins, workers and payroll users get the right view."],
];

export function PublicSiteShell({ children, page = "home" }) {
  return (
    <main className={`sf-site sf-site--${page}`}>
      <header className="sf-nav">
        <Link to="/" className="sf-brand" aria-label="Churvox home">
          <ChurvoxLogo />
          <span>Churvox</span>
        </Link>

        <nav className="sf-nav-links" aria-label="Website navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/features">Features</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
        </nav>

        <div className="sf-nav-actions">
          <Link to="/login" className="sf-login">Log in</Link>
          <Link to="/signup" className="sf-btn sf-btn--dark">Start free</Link>
        </div>
      </header>

      {children}

      <footer className="sf-footer">
        <div>
          <Link to="/" className="sf-brand sf-brand--footer">
            <ChurvoxLogo />
            <span>Churvox</span>
          </Link>
          <p>AI operating software for trade and service businesses.</p>
        </div>

        <div className="sf-footer-links">
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

export function ExecutivePreview() {
  const rows = [
    ["Invoice approval", "Completed job reviewed, customer details matched, invoice draft ready.", "$840"],
    ["Quote follow-up", "Message prepared for a quote waiting on a customer reply.", "2 days"],
    ["Crew assignment", "Best worker suggestion prepared from availability and workload.", "Ready"],
  ];

  return (
    <aside className="sf-preview" aria-label="Churvox operating desk preview">
      <div className="sf-preview-top">
        <span>Churvox Operator Desk</span>
        <strong>Today</strong>
      </div>

      <div className="sf-preview-main">
        <p>Owner approval queue</p>
        <h2>Prepared work, waiting for your decision.</h2>
        <span>Nothing important is sent, billed or changed until the owner approves.</span>
      </div>

      <div className="sf-preview-list">
        {rows.map(([title, body, meta]) => (
          <article key={title}>
            <div>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
            <em>{meta}</em>
          </article>
        ))}
      </div>
    </aside>
  );
}

export function WorkflowLine() {
  const items = ["Lead", "Quote", "Job", "Proof", "Invoice", "Paid"];

  return (
    <section className="sf-workflow" aria-label="Workflow">
      <div>
        <p className="sf-kicker">One connected line of work</p>
        <h2>From first request to paid invoice.</h2>
      </div>

      <div className="sf-workflow-line">
        {items.map((item, index) => (
          <article key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
