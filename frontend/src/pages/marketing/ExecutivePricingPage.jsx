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

function cleanFeature(item) {
  return String(item || "")
    .replace(/AI Operator Actions/gi, "admin actions")
    .replace(/AI Operator/gi, "prepared admin")
    .replace(/Customer Follow-Up Brain/gi, "Customer follow-up tools");
}

function featureList(plan) {
  const list = plan.features || plan.includes || [];
  return Array.isArray(list) ? list.slice(0, 5).map(cleanFeature) : [];
}

function taxInclusive(plan) {
  return plan.taxInclusiveLabel || "";
}

const fitNotes = [
  ["Start", "Solo owner getting records under control."],
  ["Crew", "Small team with workers and messages."],
  ["Operator", "Busy owner wanting Command control."],
  ["Command", "Larger operation with deeper approvals."],
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
    <main className="publicSite cv2Site publicPageSlim pricingSlim" data-version="CHURVOX_PRICING_SLIM_20260706">
      <Nav />

      <section className="publicHero publicHeroCompact slimHero">
        <div className="publicHeroCopy">
          <span className="publicKicker">Pricing</span>
          <h1>Simple plans for different stages.</h1>
          <p>Start with clean records, add workers, then add Command when you want Churvox preparing admin for approval.</p>
          <label className="publicCountrySelect">
            <span>Pricing region</span>
            <select value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))}>
              {COUNTRY_OPTIONS.map((item) => (
                <option key={item.code} value={item.code}>{item.label} - {item.currency}</option>
              ))}
            </select>
          </label>
          <p className="publicFinePrint">Showing {countryMeta.currency} pricing for {countryMeta.label}. {notes.join(" ")}</p>
        </div>
        <aside className="publicFeaturePanel slimPanel">
          <small>Most popular</small>
          <b>Operator</b>
          <span>For owners who want the main promise: Churvox does the admin. You approve.</span>
        </aside>
      </section>

      <section className="publicBand slimBand pricingCardsBand">
        <div className="publicSectionHead compactHead">
          <span className="publicKicker">Plans</span>
          <h2>Pick the level you need.</h2>
        </div>
        <div className="publicPlanGrid slimPlanGrid">
          {displayPlans.map((plan) => (
            <article key={plan.name} className={isOperator(plan) ? "featured" : ""}>
              {isOperator(plan) ? <small>Most Popular</small> : null}
              <h3>{plan.name}</h3>
              <div className="publicPlanPrice">{plan.priceLabel}</div>
              {taxInclusive(plan) ? <div className="publicPlanTax">{taxInclusive(plan)}</div> : null}
              <p>{cleanFeature(plan.summary)}</p>
              <ul>
                {featureList(plan).map((item) => <li key={item}>{item}</li>)}
              </ul>
              <Link to={signupTo} className="publicPrimary">Start trial</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicSplit slimBand">
        <div>
          <span className="publicKicker">Best fit</span>
          <h2>Choose by how much admin you want Churvox to prepare.</h2>
          <p>No card upfront. Start with a trial, then move plans as the business grows.</p>
        </div>
        <div className="publicAreaGrid slimGrid">
          {fitNotes.map(([title, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand slimBand">
        <div className="publicSectionHead compactHead">
          <span className="publicKicker">Add-ons</span>
          <h2>Only add extras when needed.</h2>
        </div>
        <div className="publicAddOnGrid slimGrid">
          <article>
            <b>Command Growth Pack</b>
            <strong>{growthPack.priceLabel}</strong>
            {growthPack.taxInclusiveLabel ? <span>{growthPack.taxInclusiveLabel}</span> : null}
            <p>Extra Command capacity for larger teams and heavier admin.</p>
          </article>
          <article>
            <b>Accounting Sync Add-on</b>
            <strong>{accountingAddon.priceLabel}</strong>
            {accountingAddon.taxInclusiveLabel ? <span>{accountingAddon.taxInclusiveLabel}</span> : null}
            <p>Optional draft invoice sync for non-Command tiers where available.</p>
          </article>
        </div>
      </section>

      <section className="publicBand publicCta slimCta">
        <div>
          <span className="publicKicker">Start clean</span>
          <h2>Try Churvox for 14 days.</h2>
        </div>
        <div className="publicActions">
          <Link to={signupTo} className="publicPrimary">Start trial</Link>
          <Link to="/product" className="publicSecondary">View product</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
