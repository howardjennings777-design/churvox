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
// removed broken css import

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
  ["Start", "Solo owner", "Core records: jobs, clients, quotes and invoices kept tidy."],
  ["Crew", "Small team", "Worker flow, messages, job handover and cleaner team control."],
  ["Operator", "Busy owner", "Churvox prepares the admin. The owner approves in Command."],
  ["Command", "Larger operation", "Full owner approval desk, deeper controls, reporting and accounting handoff."],
];

const pricingRules = [
  ["No card upfront", "Start the 14-day trial before committing."],
  ["Clear monthly price", "Monthly price is shown before tax, with tax-inclusive totals where applicable."],
  ["Simple upgrade path", "Start with records, add team control, then add prepared admin and Command control."],
  ["Owner stays in charge", "Churvox prepares important admin, but approval stays in Command."],
];

const valueSteps = [
  ["Records", "Keep jobs, clients, quotes and invoices together."],
  ["Team", "Give workers a simple flow for jobs, directions and updates."],
  ["Prepared admin", "Churvox organises the next step from real records."],
  ["Command", "The owner approves, edits or parks important actions."],
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
    <main className="publicSite" data-version="CHURVOX_PUBLIC_PRICING_10_OUT_OF_10_20260630">
      <Nav />

      <section className="publicHero publicHeroCompact">
        <div className="publicHeroCopy">
          <span className="publicKicker">Simple plan ladder</span>
          <h1>Choose how much admin Churvox should prepare.</h1>
          <p>
            Start with clean records, add team control, then let Churvox prepare admin for owner approval. Pricing stays readable and the important decisions stay in Command.
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
          <span>For owners who want the main Churvox promise: Churvox does the admin. You approve.</span>
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

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Value ladder</span>
          <h2>What you add as the business grows.</h2>
        </div>
        <div className="publicFlow">
          {valueSteps.map(([title, text], index) => (
            <article key={title}>
              <i>{index + 1}</i>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicSplit">
        <div>
          <span className="publicKicker">Which one fits</span>
          <h2>Pick by operating need, not by guesswork.</h2>
          <p>
            The tiers are meant to be easy to understand: records first, workers next, prepared admin next, full Command operation last.
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
            <p>Adds extra team, job, automation, admin and payroll capacity for larger Command accounts.</p>
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