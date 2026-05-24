import React from "react";
import { Link } from "react-router-dom";
import { features, OperatingMap, PublicSiteShell, WorkConveyor } from "./PublicSiteShell";

const rows = [
  ["Work intake", "Jobs, clients and requests enter one clean place instead of being scattered across phone calls, messages and memory."],
  ["Crew movement", "Assign workers, collect updates, keep proof photos and connect field work to office admin."],
  ["AI preparation", "Churvox prepares the next invoice, quote follow-up, customer reminder or owner approval action."],
  ["Money flow", "Completed work has a clear path to quote, invoice, MYOB sync and payment follow-up."],
  ["Role control", "Owners, managers, office admins, workers and payroll users get access that fits their job."],
];

export default function FeaturesPage() {
  return (
    <PublicSiteShell page="features">
      <section className="nw-page-hero">
        <p className="nw-kicker">Features with a job to do</p>
        <h1>Every part of Churvox feeds the next move.</h1>
        <p>
          The point is not more screens. The point is less admin drag. Churvox connects the work, prepares the next step and gives owners a clear approval desk.
        </p>

        <div className="nw-actions">
          <Link to="/signup" className="nw-btn nw-btn--lime">Start free</Link>
          <Link to="/pricing" className="nw-btn nw-btn--light">View pricing</Link>
        </div>
      </section>

      <section className="nw-feature-split">
        <div className="nw-feature-split__left">
          <p className="nw-kicker">Product architecture</p>
          <h2>Not a pile of features. A business flow.</h2>
          <p>
            Churvox is built like a front desk for trade businesses: intake, field work, admin prep, owner approval and money follow-up.
          </p>
        </div>

        <div className="nw-feature-split__right">
          {rows.map(([title, body], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <OperatingMap />

      <section className="nw-section">
        <div className="nw-section__top">
          <p className="nw-kicker">Core areas</p>
          <h2>The main workflows are clear and connected.</h2>
        </div>

        <div className="nw-feature-wall nw-feature-wall--features">
          {features.map((feature) => (
            <article key={feature.title}>
              <p>{feature.kicker}</p>
              <h3>{feature.title}</h3>
              <span>{feature.body}</span>
            </article>
          ))}
        </div>
      </section>

      <WorkConveyor />

      <section className="nw-close">
        <div>
          <p className="nw-kicker">Why it feels different</p>
          <h2>Churvox is organised around approval, not admin hunting.</h2>
          <p>
            The owner should open Churvox and know what needs approving, what needs fixing and where the money is.
          </p>
        </div>

        <div className="nw-actions">
          <Link to="/signup" className="nw-btn nw-btn--lime">Start free</Link>
          <Link to="/pricing" className="nw-btn nw-btn--light">See plans</Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
