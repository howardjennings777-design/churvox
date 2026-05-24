import React from "react";
import { Link } from "react-router-dom";
import { ExecutiveShell, plans } from "./ExecutiveShell";

export default function ExecutivePricingPage() {
  return (
    <ExecutiveShell page="pricing">
      <section className="ex-page-hero ex-page-hero--pricing">
        <p className="ex-kicker">Pricing</p>
        <h1>Choose the operating level that fits your business.</h1>
        <p>Start with core workflow, add crew control, or move into Operator where Churvox prepares admin actions for owner approval.</p>
      </section>

      <section className="ex-pricing">
        <aside className="ex-pricing-intro">
          <p className="ex-kicker">Recommended</p>
          <h2>Operator is the main Churvox plan.</h2>
          <p>This is where Churvox becomes different: AI prepares the daily admin and the owner approves the next move.</p>
        </aside>

        <div className="ex-plan-list">
          {plans.map((plan, index) => (
            <article key={plan.name} className={`ex-plan ${plan.featured ? "is-featured" : ""}`}>
              <div className="ex-plan-number">{String(index + 1).padStart(2, "0")}</div>

              <div className="ex-plan-title">
                <span>{plan.label}</span>
                <h2>{plan.name}</h2>
                <strong>{plan.price}<em>/month + GST</em></strong>
              </div>

              <div className="ex-plan-body">
                <p>{plan.text}</p>
                <ul>
                  {plan.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>

              <Link to="/signup" className={plan.featured ? "ex-btn ex-btn--primary" : "ex-btn ex-btn--dark"}>
                Choose {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="ex-addons">
        <article>
          <p className="ex-kicker">Command Growth Pack</p>
          <h2>$99/month + GST</h2>
          <p>Command includes up to 50 active team members. Each Growth Pack adds 50 more active team members plus extra capacity for jobs, AI Operator Actions, automation, admin and payroll.</p>
        </article>

        <article>
          <p className="ex-kicker">MYOB</p>
          <h2>$39/month + GST</h2>
          <p>Available as an add-on for Operator and included in Command.</p>
        </article>

        <article>
          <p className="ex-kicker">SMS</p>
          <h2>Credit packs</h2>
          <p>SMS remains separate so businesses only buy the reminder and customer-message credits they need.</p>
        </article>
      </section>
    </ExecutiveShell>
  );
}
