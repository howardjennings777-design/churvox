import React from "react";
import { Link } from "react-router-dom";
import { features, lanes, OperatingMap, OperatorStage, PublicSiteShell, WorkConveyor } from "./PublicSiteShell";

export default function CommandMachineHomePage() {
  return (
    <PublicSiteShell page="home">
      <section className="nw-hero">
        <div className="nw-hero__copy">
          <p className="nw-kicker">AI office operator for trades</p>
          <h1>The front desk your trade business never had.</h1>
          <p className="nw-lead">
            Churvox catches the work, prepares the admin and gives the owner clear decisions to approve. Jobs, quotes, invoices, crew updates and money follow-up finally move through one usable system.
          </p>

          <div className="nw-actions">
            <Link to="/signup" className="nw-btn nw-btn--lime">Start free</Link>
            <Link to="/features" className="nw-btn nw-btn--light">See how it works</Link>
          </div>

          <div className="nw-hero__proof">
            <span>Built around owner approval</span>
            <span>Worker app included</span>
            <span>Operator plan is the main plan</span>
          </div>
        </div>

        <OperatorStage />
      </section>

      <section className="nw-lanes">
        {lanes.map((lane) => (
          <article key={lane.title}>
            <span>{lane.label}</span>
            <h2>{lane.title}</h2>
            <p>{lane.body}</p>
          </article>
        ))}
      </section>

      <section className="nw-section nw-section--map">
        <div className="nw-section__copy">
          <p className="nw-kicker">A real website layout, not a dashboard dump</p>
          <h2>One operating map for the work, the crew and the money.</h2>
          <p>
            The public site now shows Churvox as a proper business operator: a front desk that knows what needs approving, what needs fixing, what is happening in the field and what needs billing.
          </p>
        </div>

        <OperatingMap />
      </section>

      <WorkConveyor />

      <section className="nw-section">
        <div className="nw-section__top">
          <p className="nw-kicker">What Churvox actually does</p>
          <h2>It turns daily trade admin into prepared work.</h2>
        </div>

        <div className="nw-feature-wall">
          {features.map((feature, index) => (
            <article key={feature.title} className={index === 1 ? "is-wide" : ""}>
              <p>{feature.kicker}</p>
              <h3>{feature.title}</h3>
              <span>{feature.body}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="nw-close">
        <div>
          <p className="nw-kicker">The simple promise</p>
          <h2>Work comes in. Churvox prepares. You approve.</h2>
          <p>
            That is the whole product story. No generic SaaS noise. No old blue boxes. Just a sharp, usable site that sells the real Churvox idea.
          </p>
        </div>

        <div className="nw-actions">
          <Link to="/signup" className="nw-btn nw-btn--lime">Start free</Link>
          <Link to="/pricing" className="nw-btn nw-btn--light">View pricing</Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
