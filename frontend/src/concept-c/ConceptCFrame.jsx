import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./conceptC.css";
import "./conceptCFrameHybrid.css";

const FRAME = {
  dashboard: ["COMMAND FLOOR", "Command.", "Approve prepared work, open records and keep the business moving.", "Back to command", "/dashboard"],
  jobs: ["FIELD CONTROL", "Work card.", "Create, edit and review jobs inside the Churvox Command Floor.", "Back to jobs", "/jobs"],
  dispatch: ["DISPATCH CONTROL", "Dispatch.", "Assign workers, check gaps and move work through the field.", "Back to dispatch", "/dispatch"],
  clients: ["CUSTOMER CONTROL", "Customer card.", "Create, edit and review customers inside the Churvox Command Floor.", "Back to clients", "/clients"],
  quotes: ["SALES CONTROL", "Quote card.", "Create, edit and review quotes inside the Churvox Command Floor.", "Back to quotes", "/quotes"],
  invoices: ["MONEY CONTROL", "Invoice card.", "Create, edit and review invoices inside the Churvox Command Floor.", "Back to invoices", "/invoices"],
  team: ["CREW CONTROL", "Crew desk.", "Manage crew, roles, workers and team records.", "Back to crew", "/team"],
  automation: ["AUTOMATION CONTROL", "Automation.", "Review automation rules, runs and prepared admin flows.", "Back to automation", "/automation"],
  integrations: ["SYNC CONTROL", "Integrations.", "Manage connected systems, MYOB proof and sync readiness.", "Back to integrations", "/integrations"],
  reports: ["REPORT CONTROL", "Reports.", "Review exports, records, security and business evidence.", "Back to reports", "/reports"],
  plans: ["PLAN CONTROL", "Plan desk.", "Choose and manage plan access inside the Churvox Command Floor.", "Back to dashboard", "/dashboard"],
  billing: ["BILLING CONTROL", "Billing confidence.", "Check plan, trial, GST, Stripe and support clarity.", "Back to billing", "/billing-confidence"],
  demo: ["DEMO CONTROL", "Demo desk.", "Create sample clients, jobs, invoices, AI actions and notifications for sales demos.", "Back to demo", "/demo-mode"],
  notifications: ["ALERT CONTROL", "Notification desk.", "Review owner alerts, support tickets and AI notifications.", "Back to notifications", "/notifications"],
  onboarding: ["LAUNCH CONTROL", "Setup desk.", "Finish business setup, first client, first job, worker, invoice and trust steps.", "Back to setup", "/onboarding"],
  support: ["TRUST CONTROL", "Support desk.", "Find support, billing, data control, privacy and AI guardrails.", "Back to support", "/contact"],
  worker: ["FIELD APP", "Worker mode.", "Worker jobs, details and settings inside the Churvox identity.", "Worker jobs", "/worker/jobs"],
  launch: ["LAUNCH CONTROL", "Launch desk.", "Sales polish, integration proof, operating process, recovery and final polish.", "Back to launch control", "/launch-control"],
  settings: ["SYSTEM CONTROL", "System card.", "Contact, settings and admin screens inside the Churvox Command Floor.", "Back to settings", "/settings"],
  payroll: ["PAYROLL CONTROL", "Payroll.", "Review crew time, pay summaries and payroll handoff records.", "Back to payroll", "/payroll"],
};

const AREA_ACTIVE = {
  dashboard: "command",
  jobs: "jobs",
  dispatch: "dispatch",
  clients: "clients",
  quotes: "quotes",
  invoices: "money",
  team: "crew",
  automation: "automation",
  integrations: "integrations",
  reports: "reports",
  plans: "plans",
  billing: "plans",
  demo: "demo",
  notifications: "alerts",
  onboarding: "setup",
  support: "settings",
  worker: "crew",
  launch: "tools",
  settings: "settings",
  payroll: "money",
};

const LINKS = [
  ["command", "Command", "/dashboard"],
  ["setup", "Setup", "/onboarding"],
  ["jobs", "Jobs", "/jobs"],
  ["dispatch", "Dispatch", "/dispatch"],
  ["clients", "Clients", "/clients"],
  ["quotes", "Quotes", "/quotes"],
  ["money", "Money", "/invoices"],
  ["crew", "Crew", "/team"],
  ["automation", "Automation", "/automation"],
  ["integrations", "Integrations", "/integrations"],
  ["reports", "Reports", "/reports"],
  ["alerts", "Alerts", "/notifications"],
  ["plans", "Plans", "/plans"],
  ["settings", "Settings", "/settings"],
  ["tools", "Tools", "/operator-tools"],
];

export default function ConceptCFrame({ area = "jobs", children }) {
  const { pathname } = useLocation();
  const page = FRAME[area] || FRAME.jobs;
  const pathActive = LINKS.find(([key, _label, to]) => pathname === to || (to !== "/dashboard" && pathname.startsWith(`${to}/`)))?.[0];
  const active = pathActive || AREA_ACTIVE[area] || "command";

  return (
    <main className="concept-c2 concept-c2-frame" data-version="CHURVOX_FULL_COMMAND_NAV_20260601">
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
          <h2>Command page.</h2>
          <span>Full-screen workspace. Same Churvox command system, owner approval and clear next action.</span>

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

      <nav className="c2-dock c2-dock-full" aria-label="Churvox command navigation">
        {LINKS.map(([key, label, to]) => (
          <Link key={key} to={to} className={active === key ? "active" : ""}>{label}</Link>
        ))}
      </nav>
    </main>
  );
}
