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

const chooser = [
  ["Start", "For solo operators who need jobs, clients, quotes and invoices organised."],
  ["Crew", "For small crews that assign work and need time tracking."],
  ["Operator", "For owners who want AI Operator Actions prepared for review and approval."],
  ["Command", "For larger teams that need accounting sync, roles, payroll workspace, exports and priority support."],
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
    <main className="simplePublic" data-version="CHURVOX_COUNTRY_PRICING_PLAN_FIRST_20260621">
      <Nav />

      <section className="simpleHero">
        <div>
          <span className="simpleKicker">Plans for real service businesses</span>
          <h1>Choose the plan that matches how you run jobs.</h1>
          <p className="simpleLead">
            Create your account, choose Start, Crew, Operator or Command, then Stripe starts the 14-day trial for that plan.
            Start with the basics, then move up when you need workers, AI Operator Actions, accounting sync, payroll workspace or bigger team control.
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
            Showing {countryMeta.currency} pricing for {countryMeta.label}.
          </p>

          <div className="simpleActions">
            <Link to={signupTo} className="simpleBtn simplePrimary">Start trial</Link>
            <Link to="/login" className="simpleBtn simpleGhost">Log in</Link>
          </div>
        </div>

        <aside className="simpleCard">
          <h2>Most growing businesses should look at Operator.</h2>
          <p>
            Operator is where Churvox starts preparing admin actions for you to approve.
            Start or Crew are better if you only need the core workflow first. Accounting sync can be added where available.
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
        <p className="simpleLead">{notes[0]} {notes[1]}</p>

        <div className="simpleGrid">
          {displayPlans.map((plan) => (
            <article key={plan.name}>
              <b>{plan.name}</b>
              <span>{priceLabel(plan)}</span>
              {taxLabel(plan) ? <span>{taxLabel(plan)}</span> : null}
              <span>{plan.summary}</span>
              {featureList(plan).map((item) => <span key={item}>• {item}</span>)}
              <div className="simpleActions">
                <Link to={signupTo} className="simpleBtn simplePrimary">Start trial</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Accounting Sync Add-on</h2>
        <p className="simpleLead">
          Start, Crew and Operator can add accounting sync for {accountingAddon.priceLabel} where available.
          Command includes one accounting sync option.
        </p>
      </section>

      <Footer />
    </main>
  );
}
