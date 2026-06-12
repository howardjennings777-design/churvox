import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import { MARKETING_PLANS } from "../../config/churvoxPlans";
import "./SimplePublic.css";

export default function ExecutivePricingPage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_PRICING_COPY_20260612">
      <Nav />
      <section className="simpleHero">
        <div>
          <span className="simpleKicker">Simple pricing</span>
          <h1>Start free. Choose a plan when you’re ready.</h1>
          <p className="simpleLead">
            Try Churvox for 14 days with no card. Start with jobs and clients, then pick the plan that fits your business.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
            <Link to="/login" className="simpleBtn simpleGhost">Log in</Link>
          </div>
        </div>
        <aside className="simpleCard">
          <h2>Most owners start with Operator.</h2>
          <p>Operator is where Churvox starts preparing admin actions for you to review and approve.</p>
        </aside>
      </section>
      <section className="simpleBand">
        <h2>Monthly plans</h2>
        <div className="simpleGrid">
          {MARKETING_PLANS.map((plan) => (
            <article key={plan.name}>
              <b>{plan.name}</b>
              <span>{plan.price}</span>
              <span>{plan.summary}</span>
              <div className="simpleActions">
                <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
