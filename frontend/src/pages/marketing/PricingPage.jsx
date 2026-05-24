import React from "react";
import { Link } from "react-router-dom";
import { plans, PublicSiteShell } from "./PublicSiteShell";

export default function PricingPage() {
  return (
    <PublicSiteShell page="pricing">
      <section className="nw-page-hero nw-page-hero--pricing">
        <p className="nw-kicker">Pricing</p>
        <h1>Pick the level of office control you want.</h1>
        <p>
          Start simple, add crew workflow, or move into AI Operator where Churvox prepares admin actions for owner approval.
        </p>
      </section>

      <section className="nw-pricing-stage">
        <div className="nw-pricing-stage__intro">
          <p className="nw-kicker">Recommended path</p>
          <h2>Operator is the main Churvox plan.</h2>
          <p>
            Start and Crew cover the basics. Operator is where the site becomes unique: Churvox prepares the admin and the owner approves.
          </p>
        </div>

        <div className="nw-plan-rail">
          {plans.map((plan, index) => (
            <article key={plan.name} className={`nw-plan ${plan.featured ? "is-featured" : ""}`}>
              <div className="nw-plan__num">{String(index + 1).padStart(2, "0")}</div>
              <div className="nw-plan__main">
                <span>{plan.tag}</span>
                <h2>{plan.name}</h2>
                <strong>{plan.price}<em>/month + GST</em></strong>
              </div>
              <div className="nw-plan__body">
                <h3>{plan.short}</h3>
                <p>{plan.body}</p>
                <ul>
                  {plan.includes.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <Link to="/signup" className={plan.featured ? "nw-btn nw-btn--lime" : "nw-btn nw-btn--dark"}>
                Choose {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="nw-addons">
        <article>
          <p className="nw-kicker">Command Growth Pack</p>
          <h2>$99/month + GST</h2>
          <p>Command includes up to 50 active team members. Each Growth Pack adds 50 more active team members plus extra job capacity, AI Operator Actions, automation runs and admin/payroll capacity.</p>
        </article>

        <article>
          <p className="nw-kicker">MYOB</p>
          <h2>$39/month + GST</h2>
          <p>Available as an add-on for Operator and included in Command. Built around Churvox money-desk workflows.</p>
        </article>

        <article>
          <p className="nw-kicker">SMS</p>
          <h2>Credit packs</h2>
          <p>SMS stays separate so businesses only buy the reminder and message credits they need.</p>
        </article>
      </section>

      <section className="nw-close">
        <div>
          <p className="nw-kicker">Simple choice</p>
          <h2>Want the AI admin promise? Choose Operator.</h2>
          <p>That is the main plan for the Churvox identity: the software prepares the work and the owner approves.</p>
        </div>

        <div className="nw-actions">
          <Link to="/signup" className="nw-btn nw-btn--lime">Start free</Link>
          <Link to="/features" className="nw-btn nw-btn--light">View features</Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
