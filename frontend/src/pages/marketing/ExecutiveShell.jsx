import React from "react";
import { Link, NavLink } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./ExecutivePublicSite.css";

export const plans = [
  {
    name: "Start",
    price: "$39",
    label: "Owner-operator",
    text: "For jobs, clients, quotes and invoices in one calm base.",
    items: ["Jobs and clients", "Quotes and invoices", "Basic AI prep", "Mobile access"],
  },
  {
    name: "Crew",
    price: "$89",
    label: "Small team",
    text: "For field updates, proof and crew workflow.",
    items: ["Worker app", "Team workflow", "Proof photos", "More job capacity"],
  },
  {
    name: "Operator",
    price: "$149",
    label: "Recommended",
    text: "For AI-prepared admin and owner approval.",
    items: ["AI Operator Actions", "Approval queue", "Automation workflows", "MYOB add-on +$39"],
    featured: true,
  },
  {
    name: "Command",
    price: "$299",
    label: "Full control",
    text: "For MYOB, payroll, roles and higher limits.",
    items: ["MYOB included", "Payroll workspace", "Advanced roles", "Priority support"],
  },
];

export const capabilities = [
  ["Work control", "Jobs", "Create, assign and complete work with client, crew, proof and admin connected."],
  ["Admin control", "AI preparation", "Churvox prepares invoices, follow-ups, reminders and owner decisions before admin piles up."],
  ["Cashflow control", "Money desk", "Quotes, invoices, payment follow-up and MYOB-ready workflows stay tied to completed work."],
  ["Access control", "Team roles", "Owners, managers, office admins, workers and payroll users get the right view."],
];

export const flow = ["Lead", "Quote", "Job", "Proof", "Invoice", "Paid"];

export function ExecutiveShell({ page, children }) {
  return (
    <main className={`ex-site ex-site--${page}`}>
      <header className="ex-nav">
        <Link to="/" className="ex-brand">
          <ChurvoxLogo />
          <span>Churvox</span>
        </Link>

        <nav className="ex-nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/features">Features</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
        </nav>

        <div className="ex-nav-actions">
          <Link to="/login" className="ex-login">Log in</Link>
          <Link to="/signup" className="ex-btn ex-btn--dark">Start free</Link>
        </div>
      </header>

      {children}

      <footer className="ex-footer">
        <div>
          <Link to="/" className="ex-brand ex-brand--footer">
            <ChurvoxLogo />
            <span>Churvox</span>
          </Link>
          <p>AI operating software for trade and service businesses.</p>
        </div>

        <div className="ex-footer-links">
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

export function Workflow() {
  return (
    <section className="ex-workflow">
      <div>
        <p className="ex-kicker">One connected line of work</p>
        <h2>From first request to paid invoice.</h2>
      </div>

      <div className="ex-workflow-line">
        {flow.map((item, index) => (
          <article key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Capabilities({ featureFirst = false }) {
  return (
    <div className={`ex-capability-grid ${featureFirst ? "ex-capability-grid--features" : ""}`}>
      {capabilities.map(([label, title, body], index) => (
        <article key={title} className={!featureFirst && index === 1 ? "is-featured" : ""}>
          <p>{label}</p>
          <h3>{title}</h3>
          <span>{body}</span>
        </article>
      ))}
    </div>
  );
}
