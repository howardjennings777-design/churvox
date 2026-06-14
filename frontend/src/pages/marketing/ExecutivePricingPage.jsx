import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import { MARKETING_PLANS } from "../../config/churvoxPlans";
import "./SimplePublic.css";

function priceLabel(plan) {
  if (typeof plan.price === "number") return `$${plan.price}/month + GST`;
  return plan.price || "";
}

function featureList(plan) {
  const list = plan.features || plan.includes || [];
  return Array.isArray(list) ? list.slice(0, 6) : [];
}

const chooser = [
  ["Start", "For solo operators who need jobs, clients, quotes and invoices organised."],
  ["Crew", "For small crews that assign work and need time tracking."],
  ["Operator", "For owners who want AI Operator Actions prepared for review and approval."],
  ["Command", "For larger teams that need stronger control, roles, payroll workspace, exports and priority support."],
];

export default function ExecutivePricingPage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_PRICING_ENTERPRISE_COPY_20260614">
      <Nav />

      <section className="simpleHero">
        <div>
          <span className="simpleKicker">Plans for real service businesses</span>
          <h1>Start free. Choose the plan that matches how you run jobs.</h1>
          <p className="simpleLead">
            Try Churvox for 14 days with no card. Start with the basics, then move up when you need workers,
            AI Operator Actions, payroll workspace or bigger team control.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
            <Link to="/login" className="simpleBtn simpleGhost">Log in</Link>
          </div>
        </div>

        <aside className="simpleCard">
          <h2>Most growing businesses should look at Operator.</h2>
          <p>
            Operator is where Churvox starts preparing admin actions for you to approve.
            Start or Crew are better if you only need the core workflow first.
          </p>
        </aside>
      </section>

      <section className="simpleBand">
        <h2>Which plan fits?</h2>
        <div className="simpleGrid">
          {chooser.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Monthly plans</h2>
        <p className="simpleLead">
          Prices are monthly and shown before GST. Start the trial first, run the workflow, then choose properly.
        </p>

        <div className="simpleGrid">
          {MARKETING_PLANS.map((plan) => (
            <article key={plan.name}>
              <b>{plan.name}</b>
              <span>{priceLabel(plan)}</span>
              <span>{plan.summary}</span>
              {featureList(plan).map((item) => <span key={item}>• {item}</span>)}
              <div className="simpleActions">
                <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Accounting support</h2>
        <p className="simpleLead">
          Churvox is built around the job-to-invoice workflow first. Accounting connections such as Xero/MYOB are handled carefully
          and may need setup or staged rollout depending on your business and plan.
        </p>
      </section>

      <Footer />
    </main>
  );
}
