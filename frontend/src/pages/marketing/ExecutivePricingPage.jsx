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

function isOperator(plan) {
  return String(plan?.name || "").toLowerCase() === "operator";
}

function featureList(plan) {
  const list = plan.features || plan.includes || [];
  return Array.isArray(list) ? list.slice(0, 8) : [];
}

function taxInclusive(plan) {
  return plan.taxInclusiveLabel || "";
}

const planFit = [
  ["Start", "Solo owner", "Jobs, clients, quotes and invoices under control."],
  ["Crew", "Small team", "Worker proof, time approval and cleaner handover."],
  ["Operator", "Busy owner", "Churvox prepares admin. The owner approves in Command."],
  ["Command", "Larger operation", "Full approval OS, payroll workspace, reports and accounting sync option included."],
];

const pricingRules = [
  ["No card upfront", "Start the 14-day trial before committing."],
  ["Prices stay clear", "Monthly price is shown before tax, with GST or VAT-inclusive totals where applicable."],
  ["Upgrade path", "Start with records, add team control, then add prepared admin and deeper Command controls."],
  ["Owner control", "Churvox prepares important admin, but approvals stay in Command."],
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
  const growthPack = addonPriceForCountry("growth_pack", country);
  const signupTo = `/signup?country=${encodeURIComponent(country)}`;
  const notes = pricingNotesForCountry(country);

  return (
    <main className="publicSite" data-version="CHURVOX_PUBLIC_PRICING_MODERN_OS_20260629">
      <Nav />

      <section className="publicHero publicHeroCompact">
        <div className="publicHeroCopy">
          <span className="publicKicker">Simple plan ladder</span>
          <h1>Choose how much admin Churvox should prepare.</h1>
          <p>
            Plans scale from core records to team control, prepared admin and full Command operations. Prices are unchanged and sourced from the Churvox pricing config.
          </p>
          <label className="publicCountrySelect">
            <span>Pricing region</span>
            <select value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))}>
              {COUNTRY_OPTIONS.map((item) => (
                <option key={item.code} value={item.code}>{item.label} - {item.currency}</option>
              ))}
            </select>
          </label>
          <p className="publicFinePrint">Showing {countryMeta.currency} pricing for {countryMeta.label}. {notes.join(" ")}</p>
          <div className="publicActions">
            <Link to={signupTo} className="publicPrimary">Start 14-day trial</Link>
            <Link to="/features" className="publicSecondary">See how it works</Link>
          </div>
        </div>
        <aside className="publicFeaturePanel publicOperatorPanel">
          <small>Most popular</small>
          <b>Operator</b>
          <span>For owners who want the new Churvox promise: Churvox does the admin. The owner checks and approves.</span>
        </aside>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Plan cards</span>
          <h2>Actual monthly cost, plus what is included.</h2>
        </div>
        <div className="publicPlanGrid">
          {displayPlans.map((plan) => (
            <article key={plan.name} className={isOperator(plan) ? "featured" : ""}>
              {isOperator(plan) ? <small>Most Popular</small> : null}
              <h3>{plan.name}</h3>
              <div className="publicPlanPrice">{plan.priceLabel}</div>
              {taxInclusive(plan) ? <div className="publicPlanTax">{taxInclusive(plan)}</div> : null}
              <p>{plan.summary}</p>
              <ul>
                {featureList(plan).map((item) => <li key={item}>{item}</li>)}
              </ul>
              <Link to={signupTo} className="publicPrimary">Start trial</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicSplit">
        <div>
          <span className="publicKicker">Which one fits</span>
          <h2>Pick by operating need, not by guesswork.</h2>
          <p>
            The tiers are meant to be readable: records first, workers next, prepared admin next, full Command operations last.
          </p>
        </div>
        <div className="publicAreaGrid">
          {planFit.map(([title, who, text]) => (
            <article key={title}>
              <b>{title}</b>
              <small>{who}</small>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Add-ons</span>
          <h2>Extra capacity stays explicit.</h2>
        </div>
        <div className="publicAddOnGrid">
          <article>
            <b>Command Growth Pack</b>
            <strong>{growthPack.priceLabel}</strong>
            {growthPack.taxInclusiveLabel ? <span>{growthPack.taxInclusiveLabel}</span> : null}
            <p>Adds extra team, job, AI Operator, automation, admin and payroll capacity.</p>
          </article>
          <article>
            <b>Accounting Sync Add-on</b>
            <strong>{accountingAddon.priceLabel}</strong>
            {accountingAddon.taxInclusiveLabel ? <span>{accountingAddon.taxInclusiveLabel}</span> : null}
            <p>Optional accounting draft invoice sync for non-Command tiers where available. Owner approval required.</p>
          </article>
        </div>
      </section>

      <section className="publicBand publicDarkBand">
        <div>
          <span className="publicKicker">Pricing rules</span>
          <h2>Clear pricing, clear control.</h2>
        </div>
        <div className="publicCardGrid">
          {pricingRules.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicCta">
        <div>
          <span className="publicKicker">Start clean</span>
          <h2>Start the trial and put the business into Churvox.</h2>
        </div>
        <div className="publicActions">
          <Link to={signupTo} className="publicPrimary">Start 14-day trial</Link>
          <Link to="/features" className="publicSecondary">See the workflow</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
