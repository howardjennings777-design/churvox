import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import {
  CHURVOX_PLANS,
  COUNTRY_OPTIONS,
  addonPriceForCountry,
  detectCountryCode,
  getCountryMeta,
  pricePlanForCountry,
  pricingNotesForCountry,
  normalizeCountry,
} from "../../config/churvoxPlans";
import "./SimplePublic.css";

function priceLabel(plan) {
  return plan.priceLabel || "";
}

function taxLabel(plan) {
  return plan.taxInclusiveLabel || plan.taxInclusiveLabel === "" ? plan.taxInclusiveLabel : "Tax added at checkout";
}

function featureList(plan) {
  const list = plan.features || plan.includes || [];
  return Array.isArray(list) ? list.slice(0, 6) : [];
}

function isOperator(plan) {
  return String(plan?.name || "").toLowerCase() === "operator";
}

const chooser = [
  ["Start", "Best when you are solo and need clients, jobs, quotes and invoices organised."],
  ["Crew", "Best when you assign work, track time and need the team to stay clear."],
  ["Operator", "Most popular. Best when you want Command preparing admin cards for owner approval."],
  ["Command", "Best when you need deeper control: accounting sync included, payroll workspace, roles, exports and approval oversight."],
];

const safety = [
  ["Owner-approved", "Important admin actions stay reviewed by the owner before they move."],
  ["Accounting safe", "Accounting sync is a controlled handoff path. No auto tax filing and no bank payout files."],
  ["Trial first", "Start with the plan that fits, test the workflow, then keep or upgrade when it makes sense."],
];

const buyerProof = [
  ["No card upfront", "Start the 14-day trial before committing."],
  ["Clear upgrade path", "Start, Crew, Operator and Command match how much admin help you need."],
  ["Owner control", "Churvox prepares admin work, but you approve important actions."],
  ["Accounting options", "Add accounting sync where available, or use export packs as the safe fallback."],
];

const planCompare = [
  ["Start", "Solo operator", "Core jobs, clients, quotes and invoices"],
  ["Crew", "Small team", "Assign work, track time and keep workers clear"],
  ["Operator", "Growing owner", "Command approval desk for prepared admin"],
  ["Command", "Larger operation", "Accounting sync included, payroll workspace and higher control"],
];

export default function ExecutivePricingPage() {
  const [country, setCountry] = React.useState(() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return normalizeCountry(params.get("country") || detectCountryCode());
    } catch {
      return detectCountryCode();
    }
  });

  React.useEffect(() => {
    try { window.localStorage.setItem("churvox:billing-country", country); } catch {}
  }, [country]);

  const countryMeta = getCountryMeta(country);
  const displayPlans = React.useMemo(() => CHURVOX_PLANS.map((plan) => pricePlanForCountry(plan, country)), [country]);
  const accountingAddon = addonPriceForCountry("accounting_sync", country);
  const signupTo = `/signup?country=${encodeURIComponent(country)}`;
  const notes = pricingNotesForCountry(country);

  return (
    <main className="simplePublic" data-version="CHURVOX_PRICING_COMMAND_POSITIONING_20260625">
      <Nav />

      <section className="simpleHero">
        <div>
          <span className="simpleKicker">Plans for real service businesses</span>
          <h1>Pick how much admin Churvox should prepare for approval.</h1>
          <p className="simpleLead">
            Start with the core workflow, add workers when you need them, then move into Operator when you want Command preparing unfinished admin, follow-ups and draft actions for you to approve.
          </p>

          <label className="simpleCountrySelect">
            <span>Pricing region</span>
            <select value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))}>
              {COUNTRY_OPTIONS.map((item) => (
                <option key={item.code} value={item.code}>{item.label} · {item.currency}</option>
              ))}
            </select>
          </label>

          <p className="simpleLead">
            Showing {countryMeta.currency} pricing for {countryMeta.label}. {notes[0]} {notes[1]}
          </p>

          <div className="simpleActions">
            <Link to={signupTo} className="simpleBtn simplePrimary">Start 14-day trial</Link>
            <Link to="/features" className="simpleBtn simpleGhost">See how it works</Link>
          </div>
        </div>

        <aside className="simpleCard simpleOperatorCard">
          <span className="simplePlanBadge">Most popular</span>
          <h2>Operator is where Command starts doing the admin.</h2>
          <p>
            Operator is where Churvox starts feeling different: unfinished work and admin actions are prepared for review while the owner keeps final approval.
          </p>
        </aside>
      </section>

      <section className="simpleBand simpleTrustBand">
        <span className="simpleSectionLabel">Before checkout</span>
        <h2>Start safe. Upgrade when the admin gets heavier.</h2>
        <p className="simpleLead">
          Churvox pricing is built around how much of the business you want connected: core workflow first, then team control, then owner-approved admin, then Command-level operations.
        </p>
        <div className="simpleGrid">
          {buyerProof.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Which plan fits?</h2>
        <div className="simpleGrid">
          {chooser.map(([title, text]) => (
            <article key={title} className={title === "Operator" ? "simpleFeaturedPlan" : ""}>
              {title === "Operator" ? <small>Most popular</small> : null}
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand simpleCompareBand">
        <span className="simpleSectionLabel">Quick comparison</span>
        <h2>Choose by how you work.</h2>
        <div className="simpleCompareTable simplePlanCompare" role="table" aria-label="Churvox plan comparison">
          <div role="row" className="simpleCompareHead">
            <b role="columnheader">Plan</b>
            <b role="columnheader">Best for</b>
            <b role="columnheader">Main job</b>
          </div>
          {planCompare.map(([plan, best, main]) => (
            <div role="row" key={plan} className={plan === "Operator" ? "simpleCompareFeatured" : ""}>
              <span role="cell">{plan}</span>
              <span role="cell">{best}</span>
              <span role="cell">{main}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Monthly plans</h2>
        <p className="simpleLead">Start simple. Upgrade when the admin load gets heavier.</p>

        <div className="simpleGrid simplePlanGrid">
          {displayPlans.map((plan) => (
            <article key={plan.name} className={isOperator(plan) ? "simpleFeaturedPlan" : ""}>
              {isOperator(plan) ? <small>Most popular</small> : null}
              <b>{plan.name}</b>
              <span className="simplePriceLine">{priceLabel(plan)}</span>
              {taxLabel(plan) ? <span>{taxLabel(plan)}</span> : null}
              <span>{plan.summary}</span>
              {featureList(plan).map((item) => <span key={item}>• {item}</span>)}
              <div className="simpleActions">
                <Link to={signupTo} className="simpleBtn simplePrimary">Start 14-day trial</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Accounting Sync Add-on</h2>
        <p className="simpleLead">
          Start, Crew and Operator can add accounting sync for {accountingAddon.priceLabel} where available.
          Command includes one accounting sync option where available.
        </p>
      </section>

      <section className="simpleBand">
        <h2>Safe by design.</h2>
        <div className="simpleGrid">
          {safety.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <Footer />
    </main>
  );
}
