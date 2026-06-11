import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import { MARKETING_PLANS } from "../../config/churvoxPlans";
import "./SimplePublic.css";

export default function ExecutivePricingPage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_SIMPLE_PRICING_20260611">
      <Nav />
      <section className="simpleHero">
        <div>
          <span className="simpleKicker">Simple pricing</span>
          <h1>Start free. Pick the plan that fits.</h1>
          <p className="simpleLead">
            Start with a 14-day free trial. No card to start. Churvox guides the first setup after signup.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
            <Link to="/login" className="simpleBtn simpleGhost">Log in</Link>
          </div>
        </div>
        <aside className="simpleCard">
          <h2>Recommended</h2>
          <p>Operator is the main Churvox plan: AI helps run the admin and the owner approves the work.</p>
        </aside>
      </section>
      <section className="simpleBand">
        <h2>Plans</h2>
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
