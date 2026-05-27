import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./ExecutiveHomePage.css";
import "./ExecutiveMarketingPolish.css";

const plans = [
  {
    name: "Start",
    price: "$39",
    tag: "Owner-operator",
    summary: "Core job, client and invoice control for a solo trade owner who wants admin cleaner from day one.",
    features: ["Jobs, clients, quotes and invoices", "Simple Command Floor", "Work Slips for owner review", "Basic admin visibility", "No MYOB sync"],
  },
  {
    name: "Crew",
    price: "$89",
    tag: "Small team",
    summary: "For a growing crew that needs worker assignment, job proof and admin moving in one flow.",
    features: ["Everything in Start", "Team and worker workflow", "Worker assignment lane", "Job notes and photo proof", "More job and client capacity"],
  },
  {
    name: "Operator",
    price: "$149",
    tag: "Most popular",
    summary: "The Churvox sweet spot: AI prepares the admin, the owner opens the Work Slip and approves.",
    features: ["Everything in Crew", "AI Operator Actions", "Draft invoices and message follow-ups", "Work Slip approval flow", "MYOB add-on available"],
    featured: true,
  },
  {
    name: "Command",
    price: "$299",
    tag: "Full command",
    summary: "For larger operators that want roles, payroll workspace and MYOB included by default.",
    features: ["Everything in Operator", "MYOB sync included", "Payroll workspace", "Advanced roles and permissions", "Up to 50 active team members"],
  },
];

const addons = [
  ["Command Growth Pack", "$99/month + GST", "Adds 50 more active team members plus extra job capacity, AI Operator Actions, automation runs and admin/payroll capacity."],
  ["MYOB add-on for Operator", "$39/month + GST", "Optional on Operator. Included by default on Command."],
  ["SMS credits", "Separate packs", "Buy customer reminder, job update and payment follow-up credits when you need them."],
];

export default function ExecutivePricingPage() {
  return (
    <main className="cvx-home cvx-public-page cvx-pricing-page" data-version="CHURVOX_WOW_PRICING_20260527">
      <Nav />

      <section className="cvx-public-hero">
        <p className="cvx-eyebrow">PRICING BUILT AROUND AI OPERATOR ACTIONS</p>
        <h1>Choose how much admin Churvox should prepare for approval.</h1>
        <span>
          Start with job control, move into crew workflow, or choose Operator where Churvox prepares the daily admin and the owner approves the next step from clear Work Slips.
        </span>
      </section>

      <section className="cvx-plan-grid">
        {plans.map((plan) => (
          <article key={plan.name} className={plan.featured ? "is-featured" : ""}>
            <small>{plan.tag}</small>
            <h2>{plan.name}</h2>
            <strong>{plan.price}<em>/month + GST</em></strong>
            <p>{plan.summary}</p>
            <ul>
              {plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
            </ul>
            <Link to="/signup" className={plan.featured ? "cvx-btn cvx-btn-primary" : "cvx-btn cvx-btn-secondary"}>
              {plan.featured ? "Choose Operator" : `Choose ${plan.name}`}
            </Link>
          </article>
        ))}
      </section>

      <section className="cvx-split cvx-pricing-story">
        <div>
          <p className="cvx-eyebrow">WHAT MAKES IT DIFFERENT</p>
          <h2>Churvox does the admin. You approve.</h2>
          <span>
            Pricing is built around the value Churvox creates: fewer admin decisions scattered across pages, more prepared actions waiting in one approval flow.
          </span>
        </div>
        <div className="cvx-feature-list">
          <article><b>Approve work</b><span>Finished jobs, proof and worker notes are ready to review.</span></article>
          <article><b>Approve invoices</b><span>Drafts are prepared from approved work, not typed from scratch.</span></article>
          <article><b>Assign workers</b><span>Unassigned jobs become clear dispatch decisions.</span></article>
          <article><b>Review messages</b><span>Customer updates are drafted first and owner-approved before sending.</span></article>
        </div>
      </section>

      <section className="cvx-addon-section">
        <div>
          <p className="cvx-eyebrow">ADD-ONS AND SCALE</p>
          <h2>Grow without changing systems.</h2>
          <span>Command includes the bigger operating setup. Operator can add MYOB when ready. SMS stays as credits so you only buy what you use.</span>
        </div>
        <div className="cvx-addon-grid">
          {addons.map(([name, price, text]) => (
            <article key={name}>
              <small>{name}</small>
              <b>{price}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
