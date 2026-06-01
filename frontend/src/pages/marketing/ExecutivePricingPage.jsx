import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./ExecutiveHomePage.css";
import "./ExecutiveMarketingPolish.css";

const plans = [
  {
    key: "start",
    name: "Start",
    price: "$39",
    tag: "Owner-operator",
    summary: "Core job, client, quote and invoice control for a solo trade owner.",
    bestFor: "Best for one-person businesses that want the basics tidy.",
    includes: ["Jobs", "Clients", "Quotes", "Invoices", "Basic Smart Hub"],
    excludes: ["Worker accounts", "AI Operator queue", "MYOB sync", "Payroll workspace"],
  },
  {
    key: "crew",
    name: "Crew",
    price: "$89",
    tag: "Small team",
    summary: "Adds crew workflow, worker jobs and job proof for growing teams.",
    bestFor: "Best for owners with workers in the field.",
    includes: ["Everything in Start", "Worker job view", "Crew assignments", "Job notes", "Photo proof"],
    excludes: ["AI Operator queue", "MYOB sync", "Payroll workspace", "Advanced roles"],
  },
  {
    key: "operator",
    name: "Operator",
    price: "$149",
    tag: "Most popular",
    summary: "The main Churvox plan. AI prepares daily admin actions for approval.",
    bestFor: "Best for busy owners who want Churvox preparing the admin.",
    includes: ["Everything in Crew", "AI Operator Actions", "Approval queue", "Draft follow-ups", "MYOB add-on option"],
    excludes: ["MYOB included", "Payroll workspace", "Command Growth Packs"],
    featured: true,
  },
  {
    key: "command",
    name: "Command",
    price: "$299",
    tag: "Full command",
    summary: "For larger operators needing MYOB included, payroll workspace and advanced roles.",
    bestFor: "Best for bigger teams and admin-heavy businesses.",
    includes: ["Everything in Operator", "MYOB included", "Payroll workspace", "Advanced roles", "Priority support"],
    excludes: ["SMS credits are still separate"],
  },
];

const comparisonRows = [
  ["Jobs, clients, quotes and invoices", "Yes", "Yes", "Yes", "Yes"],
  ["Mobile-friendly job workflow", "Yes", "Yes", "Yes", "Yes"],
  ["Worker accounts and crew assignments", "No", "Yes", "Yes", "Yes"],
  ["Worker job photos and proof", "No", "Yes", "Yes", "Yes"],
  ["Smart Hub command view", "Basic", "Yes", "Advanced", "Advanced"],
  ["AI Operator approval queue", "No", "No", "Yes", "Yes"],
  ["AI-prepared invoices and follow-ups", "Basic", "Basic", "Yes", "Yes"],
  ["Automation support", "No", "Limited", "Yes", "Advanced"],
  ["MYOB sync", "No", "No", "$39 add-on", "Included"],
  ["Payroll workspace", "No", "No", "No", "Included"],
  ["Advanced roles", "Owner only", "Crew roles", "Crew roles", "Owner, manager, office admin, payroll"],
  ["Growth packs", "No", "No", "No", "$99/month per extra 50 active team members"],
];

const extras = [
  ["Command Growth Pack", "$99/month + GST", "Adds 50 more active team members plus extra job capacity, AI Operator Actions, automation runs and admin/payroll capacity."],
  ["MYOB add-on", "$39/month + GST", "Available on Operator. Included by default on Command."],
  ["SMS credits", "Separate packs", "SMS credits stay separate so owners only buy what they need."],
];

function statusClass(value) {
  const text = String(value).toLowerCase();
  if (text === "no" || text.includes("not")) return "no";
  if (text.includes("basic") || text.includes("limited") || text.includes("add-on") || text.includes("owner only") || text.includes("crew roles")) return "part";
  return "yes";
}

function displayValue(value) {
  if (value === "Yes") return "Included";
  if (value === "No") return "Not included";
  return value;
}

export default function ExecutivePricingPage() {
  return (
    <main className="cvx-home cvx-public-page cxp-page" data-version="CHURVOX_PRICING_COMPACT_COMPARE_20260601">
      <style>{`
        .cxp-page {
          min-height: 100vh;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          overflow-x: hidden;
          background:
            radial-gradient(circle at 10% 8%, rgba(22, 219, 120, 0.10), transparent 340px),
            radial-gradient(circle at 88% 5%, rgba(40, 184, 255, 0.10), transparent 380px),
            #f5f7f1;
          color: #10141f;
        }

        .cxp-wrap {
          width: min(100% - 36px, 1320px);
          margin: 0 auto;
        }

        .cxp-hero {
          padding: 58px 0 30px;
        }

        .cxp-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(320px, 0.48fr);
          gap: 34px;
          align-items: end;
        }

        .cxp-eyebrow {
          width: fit-content;
          margin: 0 0 15px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(22, 219, 120, 0.13);
          color: #087543;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .cxp-hero h1 {
          max-width: 850px;
          margin: 0 0 15px;
          color: #10141f;
          font-size: clamp(38px, 5vw, 72px);
          line-height: 0.95;
          letter-spacing: -0.065em;
        }

        .cxp-hero p {
          max-width: 780px;
          margin: 0;
          color: #333b4a;
          font-size: clamp(16px, 1.35vw, 19px);
          line-height: 1.45;
          font-weight: 680;
        }

        .cxp-pick-card {
          padding: 20px;
          border: 1px solid rgba(16, 20, 31, 0.10);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 20px 55px rgba(16, 20, 31, 0.07);
        }

        .cxp-pick-card strong {
          display: block;
          margin-bottom: 8px;
          color: #10141f;
          font-size: 17px;
          letter-spacing: -0.03em;
        }

        .cxp-pick-card span {
          display: block;
          color: #687181;
          font-size: 14px;
          line-height: 1.45;
          font-weight: 680;
        }

        .cxp-plans {
          padding: 24px 0 54px;
        }

        .cxp-plan-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .cxp-plan {
          position: relative;
          min-height: 360px;
          display: flex;
          flex-direction: column;
          padding: 20px;
          border: 1px solid rgba(16, 20, 31, 0.10);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.74);
          box-shadow: 0 18px 45px rgba(16, 20, 31, 0.055);
        }

        .cxp-plan.is-featured {
          color: white;
          background:
            radial-gradient(circle at 90% 0%, rgba(40, 184, 255, 0.28), transparent 230px),
            linear-gradient(145deg, #081324, #0c1b33);
          border-color: rgba(255, 255, 255, 0.13);
          box-shadow: 0 24px 65px rgba(8, 19, 36, 0.22);
        }

        .cxp-plan small {
          width: fit-content;
          margin-bottom: 12px;
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(16, 20, 31, 0.07);
          color: #455064;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .cxp-plan.is-featured small {
          background: #16db78;
          color: #03150d;
        }

        .cxp-plan h2 {
          margin: 0 0 8px;
          font-size: 28px;
          line-height: 1;
          letter-spacing: -0.052em;
        }

        .cxp-price {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 11px;
        }

        .cxp-price strong {
          font-size: 44px;
          line-height: 1;
          letter-spacing: -0.08em;
        }

        .cxp-price span {
          color: #687181;
          font-size: 12px;
          font-weight: 850;
        }

        .cxp-plan.is-featured .cxp-price span,
        .cxp-plan.is-featured .cxp-summary,
        .cxp-plan.is-featured .cxp-best,
        .cxp-plan.is-featured li {
          color: rgba(255, 255, 255, 0.74);
        }

        .cxp-summary {
          min-height: 58px;
          margin: 0 0 14px;
          color: #535c6c;
          font-size: 14px;
          line-height: 1.38;
          font-weight: 720;
        }

        .cxp-plan h3 {
          margin: 0 0 9px;
          font-size: 13px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .cxp-plan ul {
          list-style: none;
          padding: 0;
          margin: 0 0 14px;
          display: grid;
          gap: 7px;
        }

        .cxp-plan li {
          color: #4d5666;
          font-size: 12px;
          line-height: 1.32;
          font-weight: 780;
        }

        .cxp-plan li:before {
          content: "✓";
          margin-right: 7px;
          color: #0b9b57;
          font-weight: 950;
        }

        .cxp-plan.is-featured li:before {
          color: #16db78;
        }

        .cxp-best {
          margin: auto 0 14px;
          color: #687181;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 820;
        }

        .cxp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          width: 100%;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(16, 20, 31, 0.10);
          background: white;
          color: #10141f;
          text-decoration: none;
          font-size: 13px;
          font-weight: 950;
        }

        .cxp-btn.primary {
          border-color: transparent;
          background: #16db78;
          color: #03150d;
        }

        .cxp-section {
          padding: 56px 0;
          border-top: 1px solid rgba(16, 20, 31, 0.08);
        }

        .cxp-section-head {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(320px, 0.65fr);
          gap: 36px;
          align-items: end;
          margin-bottom: 24px;
        }

        .cxp-section h2 {
          margin: 0;
          font-size: clamp(32px, 4.3vw, 58px);
          line-height: 0.96;
          letter-spacing: -0.06em;
        }

        .cxp-section-head p {
          margin: 0;
          color: #687181;
          font-size: 16px;
          line-height: 1.5;
          font-weight: 680;
        }

        .cxp-table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(16, 20, 31, 0.10);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.74);
          box-shadow: 0 18px 45px rgba(16, 20, 31, 0.05);
        }

        .cxp-table {
          width: 100%;
          min-width: 940px;
          border-collapse: collapse;
        }

        .cxp-table th,
        .cxp-table td {
          padding: 14px 15px;
          border-bottom: 1px solid rgba(16, 20, 31, 0.10);
          text-align: left;
          vertical-align: top;
          font-size: 13px;
          line-height: 1.35;
        }

        .cxp-table th {
          background: rgba(255, 255, 255, 0.70);
          color: #10141f;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .cxp-table tr:last-child td {
          border-bottom: 0;
        }

        .cxp-table td:first-child {
          width: 31%;
          color: #10141f;
          font-weight: 900;
        }

        .cxp-status {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .cxp-status.yes {
          background: rgba(22, 219, 120, 0.14);
          color: #087543;
        }

        .cxp-status.part {
          background: rgba(244, 183, 64, 0.17);
          color: #8a5b00;
        }

        .cxp-status.no {
          background: rgba(239, 98, 98, 0.12);
          color: #aa2e2e;
        }

        .cxp-extra-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .cxp-extra {
          padding: 17px;
          border: 1px solid rgba(16, 20, 31, 0.10);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.68);
        }

        .cxp-extra small {
          display: block;
          margin-bottom: 8px;
          color: #087543;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .cxp-extra b {
          display: block;
          margin-bottom: 8px;
          color: #10141f;
          font-size: 20px;
          letter-spacing: -0.04em;
        }

        .cxp-extra span {
          display: block;
          color: #687181;
          font-size: 13px;
          line-height: 1.42;
          font-weight: 700;
        }

        .cxp-final {
          padding: 62px 0 70px;
        }

        .cxp-final-box {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: center;
          padding: 25px;
          border-radius: 26px;
          color: white;
          background:
            radial-gradient(circle at 86% 8%, rgba(40, 184, 255, 0.22), transparent 280px),
            linear-gradient(145deg, #081324, #0c1b33);
        }

        .cxp-final h2 {
          margin: 0 0 8px;
          font-size: clamp(30px, 4vw, 52px);
          line-height: 1;
          letter-spacing: -0.055em;
        }

        .cxp-final p {
          margin: 0;
          color: rgba(255, 255, 255, 0.72);
          font-size: 15px;
          line-height: 1.45;
          font-weight: 700;
        }

        .cxp-final .cxp-btn {
          width: auto;
          min-width: 140px;
        }

        @media (max-width: 1050px) {
          .cxp-hero-grid,
          .cxp-section-head,
          .cxp-final-box {
            grid-template-columns: 1fr;
          }

          .cxp-plan-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .cxp-extra-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .cxp-wrap {
            width: min(100% - 24px, 1320px);
          }

          .cxp-hero {
            padding-top: 38px;
          }

          .cxp-hero h1 {
            font-size: clamp(36px, 11vw, 56px);
          }

          .cxp-plan-grid {
            grid-template-columns: 1fr;
          }

          .cxp-section,
          .cxp-final {
            padding: 46px 0;
          }
        }
      `}</style>

      <Nav />

      <section className="cxp-hero">
        <div className="cxp-wrap cxp-hero-grid">
          <div>
            <p className="cxp-eyebrow">Simple Churvox pricing</p>
            <h1>Pick the plan by what admin you want Churvox to prepare.</h1>
            <p>
              Start with job control, add crew workflow, then move into AI Operator actions, MYOB and payroll when the business is ready.
            </p>
          </div>

          <aside className="cxp-pick-card">
            <strong>Best pick for most trade owners</strong>
            <span>
              Operator is the main Churvox plan. It gives you the approval queue and AI-prepared admin actions without taking control away from the owner.
            </span>
          </aside>
        </div>
      </section>

      <section className="cxp-plans">
        <div className="cxp-wrap cxp-plan-grid">
          {plans.map((plan) => (
            <article key={plan.key} className={`cxp-plan ${plan.featured ? "is-featured" : ""}`}>
              <small>{plan.tag}</small>
              <h2>{plan.name}</h2>
              <div className="cxp-price">
                <strong>{plan.price}</strong>
                <span>/month + GST</span>
              </div>
              <p className="cxp-summary">{plan.summary}</p>
              <h3>Includes</h3>
              <ul>
                {plan.includes.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p className="cxp-best">{plan.bestFor}</p>
              <Link to="/signup" className={`cxp-btn ${plan.featured ? "primary" : ""}`}>
                Choose {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="cxp-section">
        <div className="cxp-wrap">
          <div className="cxp-section-head">
            <h2>What each plan has and does not have.</h2>
            <p>
              Clear yes/no comparison so owners can see exactly when they get workers, AI Operator, MYOB, payroll and growth capacity.
            </p>
          </div>

          <div className="cxp-table-wrap">
            <table className="cxp-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Start</th>
                  <th>Crew</th>
                  <th>Operator</th>
                  <th>Command</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([feature, start, crew, operator, command]) => (
                  <tr key={feature}>
                    <td>{feature}</td>
                    {[start, crew, operator, command].map((value, index) => (
                      <td key={`${feature}-${index}`}>
                        <span className={`cxp-status ${statusClass(value)}`}>{displayValue(value)}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="cxp-section">
        <div className="cxp-wrap">
          <div className="cxp-section-head">
            <h2>Add-ons stay simple.</h2>
            <p>
              Churvox pricing stays clean: MYOB is only where it makes sense, SMS stays separate, and Command can grow with larger teams.
            </p>
          </div>

          <div className="cxp-extra-grid">
            {extras.map(([name, price, text]) => (
              <article className="cxp-extra" key={name}>
                <small>{name}</small>
                <b>{price}</b>
                <span>{text}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cxp-final">
        <div className="cxp-wrap cxp-final-box">
          <div>
            <h2>Churvox prepares the admin. You approve the action.</h2>
            <p>Choose a plan, start with the core workflow, and grow into AI Operator actions when you are ready.</p>
          </div>
          <Link to="/signup" className="cxp-btn primary">Start free</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
