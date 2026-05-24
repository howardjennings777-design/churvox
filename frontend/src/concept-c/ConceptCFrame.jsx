import React from "react";
import { Link } from "react-router-dom";
import "./conceptC.css";

const FRAME = {
  dashboard: ["AI OPERATOR THEATRE", "Run the day.", "Approve, fix, move and collect from one full-screen business theatre.", "Dashboard", "/dashboard"],
  jobs: ["FIELD CONTROL", "Work card.", "Create, edit or review job details inside the same Concept C command system.", "Jobs board", "/jobs"],
  clients: ["CUSTOMER CONTROL", "Customer card.", "Create, edit or review customer details without leaving the new system.", "Clients board", "/clients"],
  quotes: ["SALES CONTROL", "Quote card.", "Prepare, edit and review quotes in the Concept C sales flow.", "Quotes board", "/quotes"],
  invoices: ["MONEY CONTROL", "Invoice card.", "Prepare, review and control invoices inside the money desk.", "Invoices board", "/invoices"],
  team: ["CREW CONTROL", "Crew card.", "Manage workers, roles and crew records inside Concept C.", "Team board", "/team"],
  plans: ["PLAN CONTROL", "Plan desk.", "Choose and manage plan access inside the Churvox control system.", "Dashboard", "/dashboard"],
  worker: ["FIELD APP", "Worker mode.", "Worker jobs, job details and settings in the same Churvox identity.", "Worker jobs", "/worker/jobs"],
  settings: ["SYSTEM CONTROL", "System card.", "Settings and admin screens inside Concept C.", "Settings", "/settings"],
};

export default function ConceptCFrame({ area = "dashboard", children }) {
  const page = FRAME[area] || FRAME.dashboard;

  const active = area === "team" || area === "clients" ? "people" :
    area === "invoices" ? "finance" :
    area === "quotes" ? "jobs" :
    area === "worker" ? "jobs" :
    area === "plans" || area === "settings" ? "more" :
    area;

  const links = [
    ["dashboard", "Command", "/dashboard"],
    ["jobs", "Jobs", "/jobs"],
    ["schedule", "Schedule", "/dispatch"],
    ["people", "People", "/clients"],
    ["messages", "Messages", "/sms"],
    ["finance", "Finance", "/invoices"],
    ["more", "More", "/settings"],
  ];

  return (
    <main className="concept-c2 concept-c2-embedded" data-version="CHURVOX_CONCEPT_C_FRAME_20260524">
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

        <section className="c2-stage c2-legacy-stage">
          <div className="c2-legacy-card">
            {children}
          </div>
        </section>

        <aside className="c2-ai">
          <p>AI OPERATOR</p>
          <h2>Same system. No old page break.</h2>
          <span>This screen is now inside the Concept C shell so create, edit and detail pages do not fall back to the old look.</span>

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
