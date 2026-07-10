import React, { useEffect, useMemo, useState } from "react";
import "./OfficeTeamPlansScreen.css";
import "./OfficeTeamPlansActions.css";

const COUNTRIES = {
  NZ: { label: "New Zealand", currency: "NZD", symbol: "$", taxName: "GST", taxRate: 0.15, note: "GST is shown before checkout." },
  AU: { label: "Australia", currency: "AUD", symbol: "A$", taxName: "GST", taxRate: 0.10, note: "GST is shown before checkout." },
  US: { label: "United States", currency: "USD", symbol: "US$", taxName: "tax", taxRate: 0, note: "Sales tax, if required, is handled at checkout." },
  UK: { label: "United Kingdom", currency: "GBP", symbol: "£", taxName: "VAT", taxRate: 0.20, note: "VAT is shown before checkout." },
};

const STORAGE_KEY = "churvox:billing-country";

const plans = [
  {
    name: "Start",
    price: 39,
    tag: "Solo control",
    summary: "For a solo or small service operator who needs the basics tidy.",
    bestFor: "One owner, simple jobs, clear client records.",
    included: ["Clients", "Work tracking", "Basic office queue", "Quotes and invoices", "Owner review before send"],
    locked: ["Workers and team runs", "Timers", "Command queue", "Office Team review", "Xero/accounting approval", "Payroll", "Command Growth Pack"],
  },
  {
    name: "Crew",
    price: 89,
    tag: "Small team",
    summary: "For a small team that needs staff updates and job visibility.",
    bestFor: "Workers, timers, daily run view and simple team control.",
    included: ["Everything in Start", "Team / workers", "Timers", "Daily run view", "Worker updates", "Simple staff visibility"],
    locked: ["Full Command queue", "Office Team review", "Advanced approvals", "Xero/accounting sync approval", "Payroll controls", "Command Growth Pack"],
  },
  {
    name: "Operator",
    price: 149,
    tag: "Most useful",
    summary: "For a busy service business that needs office admin help.",
    bestFor: "Owners who want Churvox preparing admin while they approve the decisions.",
    included: ["Everything in Crew", "Command queue", "Office Team review", "Follow-ups and reminders", "Worker-to-owner updates", "Prepared admin cards"],
    locked: ["Advanced Command", "Accounting export/sync approval", "50 active team members", "Command Growth Pack", "Full owner approval desk capacity"],
  },
  {
    name: "Command",
    price: 299,
    tag: "Full approval desk",
    summary: "For owners who want the full Churvox approval desk and bigger team capacity.",
    bestFor: "Larger teams, deeper owner control, accounting approval and the full Command model.",
    included: ["Everything in Operator", "Advanced Command", "Accounting export/sync approval", "50 active team members", "Full owner approval desk", "More capacity"],
    locked: ["Extra team capacity needs Growth Pack", "Nothing auto-sends", "Nothing auto-syncs", "Nothing auto-charges", "Nothing changes records without owner approval"],
  },
];

const growthPack = {
  name: "Command Growth Pack",
  price: 99,
  summary: "Add more capacity to Command when the business grows.",
  included: ["Extra active team capacity", "More room for larger operations", "Keeps Command as the approval desk"],
  locked: ["Only available with Command", "Does not bypass owner approval", "Does not auto-send, auto-sync or auto-charge"],
};

export default function OfficeTeamPlansScreen() {
  const [country, setCountry] = useState(() => detectCountry());
  const [selected, setSelected] = useState("Operator");
  const meta = COUNTRIES[country] || COUNTRIES.NZ;
  const plan = plans.find((item) => item.name === selected) || plans[2];
  const selectedPricing = priceParts(meta, plan.price);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, country); } catch {}
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("country") !== country) {
        url.searchParams.set("country", country);
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch {}
  }, [country]);

  const countryOptions = useMemo(() => Object.entries(COUNTRIES), []);

  function openBilling() {
    try {
      localStorage.setItem(STORAGE_KEY, country);
      localStorage.setItem("churvox:selected-plan", plan.name.toLowerCase());
    } catch {}
    const params = new URLSearchParams({ country, plan: plan.name.toLowerCase() });
    window.location.assign(`/plans?${params.toString()}`);
  }

  return (
    <section className="cvSiteScreen cvPlansScreen">
      <header className="cvPlansHero">
        <div>
          <span>Plans</span>
          <h2>Choose the level of control Churvox runs for the business.</h2>
          <p>Compare what is included and locked here. Selecting a card does not change billing; the secure billing page opens only when you continue.</p>
        </div>
        <aside className="cvPlanCountryCard">
          <label>
            <span>Choose billing country</span>
            <select value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))}>
              {countryOptions.map(([code, item]) => <option key={code} value={code}>{item.label} · {item.currency}</option>)}
            </select>
          </label>
          <strong>{meta.currency} pricing</strong>
          <small>{meta.taxRate ? `${meta.taxName} rate shown: ${Math.round(meta.taxRate * 100)}%. ${meta.note}` : meta.note}</small>
        </aside>
      </header>

      <div className="cvPlansGrid">
        {plans.map((item) => {
          const pricing = priceParts(meta, item.price);
          return (
            <button key={item.name} className={`${selected === item.name ? "active" : ""} ${item.name === "Operator" ? "featured" : ""}`} onClick={() => setSelected(item.name)} type="button">
              <em>{item.tag}</em>
              <span>{item.name}</span>
              <PriceBlock pricing={pricing} taxName={meta.taxName} />
              <p>{item.summary}</p>
              <FeatureList title="Included in this plan" items={item.included} tone="included" />
              <FeatureList title="Locked until upgrade" items={item.locked} tone="locked" />
            </button>
          );
        })}
      </div>

      <aside className="cvPlanDetail">
        <div>
          <span>Selected for comparison</span>
          <h3>{plan.name}</h3>
          <PriceBlock pricing={selectedPricing} taxName={meta.taxName} compact />
          <p>{plan.bestFor}</p>
          <small>Country: {meta.label} · Currency: {meta.currency}</small>
        </div>
        <section>
          <b>What you get</b>
          <FeatureList title="Included" items={plan.included} tone="included" />
        </section>
        <section>
          <b>Still locked</b>
          <FeatureList title="Locked" items={plan.locked} tone="locked" />
        </section>
      </aside>

      <section className="cvGrowthPackCard">
        <div>
          <span>Add-on</span>
          <h3>{growthPack.name}</h3>
          <p>{growthPack.summary}</p>
        </div>
        <PriceBlock pricing={priceParts(meta, growthPack.price)} taxName={meta.taxName} compact />
        <FeatureList title="Adds" items={growthPack.included} tone="included" />
        <FeatureList title="Locked rules" items={growthPack.locked} tone="locked" />
      </section>

      <section className="cvPlanBillingAction">
        <div>
          <span>Billing handoff</span>
          <h3>Continue with {plan.name}</h3>
          <p>Open the real billing page to see current subscription status and start or manage checkout. Nothing is charged from this comparison screen.</p>
        </div>
        <button type="button" onClick={openBilling}>Open secure billing</button>
      </section>
    </section>
  );
}

function PriceBlock({ pricing, taxName, compact = false }) {
  return (
    <strong className={`cvPlanPrice ${compact ? "compact" : ""}`}>
      <b>{pricing.ex}</b>
      <small>/month ex {taxName}</small>
      {pricing.tax ? <span>{pricing.inc}/month incl. {taxName}</span> : <span>{pricing.note}</span>}
      {pricing.tax ? <em>{taxName}: {pricing.tax}/month</em> : null}
    </strong>
  );
}

function FeatureList({ title, items, tone }) {
  return (
    <section className={`cvPlanFeatureList ${tone}`}>
      <b>{title}</b>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}

function detectCountry() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const country = params.get("country");
    if (country) return normalizeCountry(country);
  } catch {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeCountry(stored);
  } catch {}
  return "NZ";
}

function normalizeCountry(value) {
  const raw = String(value || "").trim().toUpperCase();
  const aliases = { NZ: "NZ", NZL: "NZ", "NEW ZEALAND": "NZ", AU: "AU", AUS: "AU", AUSTRALIA: "AU", US: "US", USA: "US", UK: "UK", GB: "UK", GBR: "UK" };
  return aliases[raw] || "NZ";
}

function priceParts(meta, amount) {
  const ex = Number(amount || 0);
  const tax = meta.taxRate ? roundMoney(ex * meta.taxRate) : 0;
  const inc = roundMoney(ex + tax);
  return {
    ex: money(meta, ex),
    tax: tax ? money(meta, tax) : "",
    inc: money(meta, inc),
    note: meta.taxRate ? `${meta.taxName} shown before checkout` : "Tax handled at checkout if required",
  };
}

function money(meta, value) {
  const rounded = roundMoney(value);
  return `${meta.symbol}${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}`;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
