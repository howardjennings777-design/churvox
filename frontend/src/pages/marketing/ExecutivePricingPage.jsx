import React from "react";
import { Link } from "react-router-dom";
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
import { PublicNav, PublicFooter, Eyebrow, SectionHeading } from "./ChurvoxPublicShell";

function cleanFeature(item) {
  return String(item || "")
    .replace(/AI Operator Actions/gi, "prepared admin actions")
    .replace(/AI Operator/gi, "prepared admin")
    .replace(/Customer Follow-Up Brain/gi, "customer follow-up tools");
}

function featuresFor(plan) {
  const list = plan.features || plan.includes || [];
  return Array.isArray(list) ? list.slice(0, 6).map(cleanFeature) : [];
}

const fitNotes = [
  ["Start", "For solo operators who want jobs, clients, quotes and invoices under control."],
  ["Crew", "For businesses adding workers, field updates and simple team coordination."],
  ["Operator", "For busy owners who want prepared admin and the Command approval desk."],
  ["Command", "For larger operations that need deeper controls, payroll review and more capacity."],
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
    <main className="cp26Site" data-version="CHURVOX_PUBLIC_PRICING_20260710">
      <PublicNav active="/pricing" />

      <section className="cp26PageHero">
        <div>
          <Eyebrow>Simple monthly plans</Eyebrow>
          <h1>Pay for the level of admin Churvox handles.</h1>
          <p>Start with the operating basics, add worker flow when the team grows, and move into the full approval engine when the admin load demands it.</p>
          <label className="cp26CountrySelect">
            <span>Pricing region</span>
            <select value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))}>
              {COUNTRY_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.label} · {item.currency}</option>)}
            </select>
          </label>
          <p className="cp26FinePrint">Showing {countryMeta.currency} pricing for {countryMeta.label}. {notes.join(" ")}</p>
        </div>
        <div className="cp26HeroPanel">
          <small>Most popular</small>
          <b>Operator</b>
          <span>For owners who want Churvox preparing the admin and bringing genuine decisions back to Command.</span>
        </div>
      </section>

      <section className="cp26Section">
        <SectionHeading
          eyebrow="Plans"
          title="Choose the level that matches the business today."
          text="Every plan starts with a 14-day trial and no card upfront. Pricing shown below is taken from the live Churvox plan configuration."
        />
        <div className="cp26PlanGrid">
          {displayPlans.map((plan) => {
            const featured = String(plan?.name || "").toLowerCase() === "operator";
            return (
              <article key={plan.name} className={`cp26PlanCard${featured ? " featured" : ""}`}>
                {featured ? <span className="cp26PlanBadge">Most Popular</span> : null}
                <h3>{plan.name}</h3>
                <div className="cp26PlanPrice">{plan.priceLabel}</div>
                {plan.taxInclusiveLabel ? <div className="cp26PlanTax">{plan.taxInclusiveLabel}</div> : null}
                <p>{cleanFeature(plan.summary)}</p>
                <ul>{featuresFor(plan).map((feature) => <li key={feature}>{feature}</li>)}</ul>
                <Link className={`cp26Button${featured ? "" : " cp26ButtonGhost"}`} to={signupTo}>Start free trial</Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="cp26Section cp26SectionDark">
        <SectionHeading
          eyebrow="Best fit"
          title="Choose by the pressure point, not the feature count."
          text="The right plan is the one that removes the current admin bottleneck without forcing the business into unnecessary complexity."
        />
        <div className="cp26AreaGrid">
          {fitNotes.map(([name, text]) => <article key={name}><b>{name}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cp26Section">
        <SectionHeading
          eyebrow="Add-ons"
          title="Extra capacity stays separate and visible."
          text="Add-ons do not silently change the base plan price."
        />
        <div className="cp26ContactGrid">
          <article>
            <b>Command Growth Pack</b>
            <div className="cp26PlanPrice">{growthPack.priceLabel}</div>
            {growthPack.taxInclusiveLabel ? <span>{growthPack.taxInclusiveLabel}</span> : null}
            <span>Extra active-team capacity and additional Command headroom for larger operations.</span>
          </article>
          <article>
            <b>Accounting Sync Add-on</b>
            <div className="cp26PlanPrice">{accountingAddon.priceLabel}</div>
            {accountingAddon.taxInclusiveLabel ? <span>{accountingAddon.taxInclusiveLabel}</span> : null}
            <span>Optional draft invoice sync where available, with owner-controlled accounting safeguards.</span>
          </article>
          <article>
            <b>Need help choosing?</b>
            <span>Tell us how many people are active, what admin hurts most and whether you want Command now or later.</span>
            <a href="mailto:hello@churvox.com">Email hello@churvox.com</a>
          </article>
        </div>
      </section>

      <section className="cp26Closing">
        <div>
          <Eyebrow light>Start without pressure</Eyebrow>
          <h2>Use the trial to see whether Churvox actually removes work.</h2>
          <p>No card upfront. Keep the plan only when the system earns its place in the business.</p>
        </div>
        <div className="cp26ClosingActions">
          <Link className="cp26Button" to={signupTo}>Start free trial</Link>
          <Link className="cp26Button cp26ButtonGhost" to="/demo">Open demo</Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
