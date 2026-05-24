import React from "react";
import { Link } from "react-router-dom";
import { PublicSiteShell, plans } from "./PublicSiteShell";

export default function PricingPage() {
  return (
    <PublicSiteShell page="pricing">
      <section className="cvx-page-hero cvx-pricing-hero">
        <p className="cvx-eyebrow">Churvox pricing</p>
        <h1>Choose how much of the office you want Churvox to run.</h1>
        <p>
          Start with the basics, add crew workflow, or step into the AI Operator plans where Churvox prepares the admin and the owner approves.
        </p>
      </section>

      <section className="cvx-pricing-grid">
        {plans.map((plan) => (
          <article key={plan.name} className={`cvx-plan ${plan.featured ? "cvx-plan--featured" : ""}`}>
            <div className="cvx-plan-top">
              <span>{plan.tag}</span>
              <h2>{plan.name}</h2>
              <p>{plan.line}</p>
            </div>

            <div className="cvx-price">
              <strong>{plan.price}</strong>
              <span>/month + GST</span>
            </div>

            <p className="cvx-best-for">{plan.bestFor}</p>

            <ul>
              {plan.included.map((item) => <li key={item}>{item}</li>)}
            </ul>

            <Link to="/signup" className={plan.featured ? "cvx-button cvx-button--lime" : "cvx-button cvx-button--dark"}>
              Choose {plan.name}
            </Link>
          </article>
        ))}
      </section>

      <section className="cvx-section cvx-addons">
        <div>
          <p className="cvx-eyebrow">Growth and add-ons</p>
          <h2>Keep the base plans simple. Add capacity when the business grows.</h2>
        </div>

        <div className="cvx-addon-grid">
          <article>
            <span>Command Growth Pack</span>
            <h3>$99/month + GST</h3>
            <p>Command includes up to 50 active team members. Each Growth Pack adds 50 more active team members plus extra job capacity, AI Operator Actions, automation runs and admin/payroll capacity.</p>
          </article>

          <article>
            <span>MYOB add-on</span>
            <h3>$39/month + GST</h3>
            <p>Available on Operator. Included in Command. Built around invoice and payment sync as part of the Churvox money desk.</p>
          </article>

          <article>
            <span>SMS credits</span>
            <h3>Separate credit packs</h3>
            <p>Customer reminders and message workflows stay separate so businesses only buy the credits they need.</p>
          </article>
        </div>
      </section>

      <section className="cvx-final-cta">
        <div>
          <p className="cvx-eyebrow">Best place to start</p>
          <h2>Operator is the main Churvox plan.</h2>
          <p>That is where the product becomes different: AI prepares the admin, then the owner approves the work slip.</p>
        </div>
        <div className="cvx-final-actions">
          <Link to="/signup" className="cvx-button cvx-button--lime">Start free</Link>
          <Link to="/features" className="cvx-button cvx-button--cream">Compare features</Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
