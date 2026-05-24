import React from "react";
import { Link } from "react-router-dom";
import { plans, PublicSiteShell } from "./PublicSiteShell";

export default function PricingPage() {
  return (
    <PublicSiteShell page="pricing">
      <section className="sf-page-hero sf-page-hero--pricing">
        <p className="sf-kicker">Pricing</p>
        <h1>Choose the operating level that fits your business.</h1>
        <p>Start with core workflow, add crew control, or move into Operator where Churvox prepares admin actions for owner approval.</p>
      </section>

      <section className="sf-pricing-layout">
        <aside className="sf-pricing-intro">
          <p className="sf-kicker">Recommended</p>
          <h2>Operator is the main Churvox plan.</h2>
          <p>This is where Churvox becomes different: AI prepares the daily admin and the owner approves the next move.</p>
        </aside>

        <div className="sf-plan-list">
          {plans.map((plan, index) => (
            <article key={plan.name} className={`sf-plan ${plan.featured ? "is-featured" : ""}`}>
              <div className="sf-plan-number">{String(index + 1).padStart(2, "0")}</div>

              <div className="sf-plan-title">
                <span>{plan.label}</span>
                <h2>{plan.name}</h2>
                <strong>{plan.price}<em>/month + GST</em></strong>
              </div>

              <div className="sf-plan-body">
                <p>{plan.line}</p>
                <ul>
                  {plan.includes.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>

              <Link to="/signup" className={plan.featured ? "sf-btn sf-btn--primary" : "sf-btn sf-btn--dark"}>
                Choose {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="sf-addons">
        <article>
          <p className="sf-kicker">Command Growth Pack</p>
          <h2>$99/month + GST</h2>
          <p>Command includes up to 50 active team members. Each Growth Pack adds 50 more active team members plus extra capacity for jobs, AI Operator Actions, automation, admin and payroll.</p>
        </article>

        <article>
          <p className="sf-kicker">MYOB</p>
          <h2>$39/month + GST</h2>
          <p>Available as an add-on for Operator and included in Command.</p>
        </article>

        <article>
          <p className="sf-kicker">SMS</p>
          <h2>Credit packs</h2>
          <p>SMS remains separate so businesses only buy the reminder and customer-message credits they need.</p>
        </article>
      </section>
    </PublicSiteShell>
  );
}
