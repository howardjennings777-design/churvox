import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./ExecutiveHomePage.css";
import "./ExecutiveMarketingPolish.css";

const core = [
  ["Approve Work", "Finished jobs, worker notes, job evidence and value are surfaced so the owner can sign off without hunting through screens."],
  ["Approve Invoices", "Approved work, draft invoices, owing invoices and invoice blockers stay in one money approval lane."],
  ["Assign Workers", "Unassigned jobs and crew gaps are pulled forward so dispatch decisions are easy to make."],
  ["Approve Messages", "Quote follow-ups, customer updates and invoice reminders are drafted first, then the owner approves before anything sends."],
  ["Fix Issues", "Missing price, missing customer details, overdue money and blocked admin are separated into a clear issue lane."],
  ["Work Slips", "Tap any lane or row to open the full approval slip with details, notes, evidence, message draft and next-step buttons."],
];

const advanced = [
  ["MYOB Sync", "Operator can add MYOB. Command includes it by default for invoice and payment sync workflows."],
  ["Payroll Workspace", "Command gives payroll/admin users a focused place for approved hours, worker summaries and payroll handoff."],
  ["Automation", "Rules and AI-prepared actions reduce repeated admin without losing approval control."],
  ["Roles + Permissions", "Owner, Manager, Worker, Office Admin and Payroll access stay separated so each person sees what they need."],
];

const flow = ["Work comes in", "Churvox prepares admin", "Owner opens Work Slip", "Owner approves", "Next step moves"];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="cvx-home cvx-public-page cvx-features-page" data-version="CHURVOX_WOW_FEATURES_20260527">
      <Nav />

      <section className="cvx-public-hero">
        <p className="cvx-eyebrow">FEATURES WITH PURPOSE</p>
        <h1>The approval desk for trade and service owners.</h1>
        <span>
          Churvox connects jobs, workers, proof, quotes, invoices and customer messages into one approval flow. The owner starts with the next decision, not another pile of screens.
        </span>
        <div className="cvx-actions">
          <Link to="/signup" className="cvx-btn cvx-btn-primary">Start free</Link>
          <Link to="/pricing" className="cvx-btn cvx-btn-secondary">View pricing</Link>
        </div>
      </section>

      <section className="cvx-flow-strip">
        <div>
          <p className="cvx-eyebrow">THE CHURVOX FLOW</p>
          <h2>Work goes in. Admin gets prepared. You approve.</h2>
        </div>
        <div>
          {flow.map((step, index) => <span key={step}><b>{index + 1}</b>{step}</span>)}
        </div>
      </section>

      <section className="cvx-feature-grid-wide">
        {core.map(([title, text]) => (
          <article key={title}>
            <p className="cvx-eyebrow">Approval lane</p>
            <h2>{title}</h2>
            <span>{text}</span>
          </article>
        ))}
      </section>

      <section className="cvx-addon-section">
        <div>
          <p className="cvx-eyebrow">POWER FEATURES</p>
          <h2>Built to grow into a stronger operating system.</h2>
          <span>Keep the approval desk as the centre, then add accounting, payroll, automation and role control as the business gets bigger.</span>
        </div>
        <div className="cvx-addon-grid">
          {advanced.map(([title, text]) => (
            <article key={title}>
              <small>{title}</small>
              <b>Command ready</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
