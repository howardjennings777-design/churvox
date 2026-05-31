import React from "react";
import { Link } from "react-router-dom";
import "./conceptC.css";
import "./conceptCFrameHybrid.css";

const FRAME = {
  jobs: ["FIELD CONTROL", "Work card.", "Create, edit and review jobs inside the Churvox Command Floor.", "Back to jobs", "/jobs"],
  clients: ["CUSTOMER CONTROL", "Customer card.", "Create, edit and review customers inside the Churvox Command Floor.", "Back to clients", "/clients"],
  quotes: ["SALES CONTROL", "Quote card.", "Create, edit and review quotes inside the Churvox Command Floor.", "Back to quotes", "/quotes"],
  invoices: ["MONEY CONTROL", "Invoice card.", "Create, edit and review invoices inside the Churvox Command Floor.", "Back to invoices", "/invoices"],
  plans: ["PLAN CONTROL", "Plan desk.", "Choose and manage plan access inside the Churvox Command Floor.", "Back to dashboard", "/dashboard"],
  demo: ["DEMO CONTROL", "Demo desk.", "Create sample clients, jobs, invoices, AI actions and notifications for sales demos.", "Back to demo", "/demo-mode"],
  billing: ["BILLING CONTROL", "Billing confidence.", "Check plan, trial, GST, Stripe and support clarity.", "Back to billing", "/billing-confidence"],
  notifications: ["ALERT CONTROL", "Notification desk.", "Review owner alerts, support tickets and AI notifications.", "Back to notifications", "/notifications"],
  onboarding: ["LAUNCH CONTROL", "Setup desk.", "Finish business setup, first client, first job, worker, invoice and trust steps.", "Back to setup", "/onboarding"],
  support: ["TRUST CONTROL", "Support desk.", "Find support, billing, data control, privacy and AI guardrails.", "Back to support", "/contact"],
  onboarding: ["LAUNCH CONTROL", "Setup desk.", "Finish business setup, first client, first job, worker, invoice and trust steps.", "Back to setup", "/onboarding"],
  support: ["TRUST CONTROL", "Support desk.", "Find support, billing, data control, privacy and AI guardrails.", "Back to support", "/contact"],
  worker: ["FIELD APP", "Worker mode.", "Worker jobs, details and settings inside the Churvox identity.", "Worker jobs", "/worker/jobs"],
  launch: ["LAUNCH CONTROL", "Launch desk.", "Sales polish, integration proof, operating process, recovery and final polish.", "Back to launch control", "/launch-control"],
  settings: ["SYSTEM CONTROL", "System card.", "Contact, settings and admin screens inside the Churvox Command Floor.", "Back to settings", "/settings"],
};

export default function ConceptCFrame({ area = "jobs", children }) {
  const page = FRAME[area] || FRAME.jobs;

  const active =
    area === "clients" ? "people" :
    area === "invoices" ? "finance" :
    area === "plans" ? "plans" :
    area === "demo" || area === "billing" || area === "notifications" || area === "onboarding" || area === "support" ? "setup" :
    area === "onboarding" || area === "support" ? "setup" :
    area === "quotes" || area === "worker" ? "jobs" :
    area === "launch" ? "setup" :
    area === "settings" ? "more" :
    area;

  const links = [
    ["dashboard", "Command", "/dashboard"],
    ["setup", "Setup", "/onboarding"],
    ["jobs", "Jobs", "/jobs"],
    ["schedule", "Dispatch", "/dispatch"],
    ["people", "Clients", "/clients"],
    ["finance", "Money", "/invoices"],
    ["plans", "Plans", "/plans"],
    ["more", "More", "/settings"],
  ];

  return (
    <main className="concept-c2 concept-c2-frame" data-version="CHURVOX_HYBRID_DETAIL_FRAME_20260525">
      <div className="c2-noise" />

      <header className="c2-topbar">
        <Link className="c2-brand" to="/dashboard">
          <span>C</span>
          <b>CHURVOX</b>
        </Link>

        <div className="c2-status">
          <span>AI Operator</span>
          <strong>Live</strong>
          <i>3</i>
        </div>
      </header>

      <section className="c2-frame">
        <aside className="c2-spine">
          <p>{page[0]}</p>
          <h1>{page[1]}</h1>
          <span>{page[2]}</span>
          <Link to={page[4]}>{page[3]}</Link>
        </aside>

        <section className="c2-stage c2-real-page-stage">
          <div className="c2-real-page-card">
            {children}
          </div>
        </section>

        <aside className="c2-ai">
          <p>AI OPERATOR</p>
          <h2>No old page break.</h2>
          <span>This screen now stays inside the Churvox Command style, so forms and detail pages do not drop back into an old app look.</span>

          <div>
            <small>Screen</small>
            <strong>{area}</strong>
          </div>

          <div>
            <small>Rule</small>
            <strong>Owner approves key actions.</strong>
          </div>
        </aside>
      </section>

      <nav className="c2-dock">
        {links.map(([key, label, to]) => (
          <Link key={key} to={to} className={active === key ? "active" : ""}>{label}</Link>
        ))}
      </nav>
    </main>
  );
}
