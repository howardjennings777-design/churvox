import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshPlans.css";

const regions = {
  NZ: { label: "New Zealand", short: "NZ", currency: "NZD", prefix: "$", suffix: "", tax: "+ GST" },
  AU: { label: "Australia", short: "AU", currency: "AUD", prefix: "A$", suffix: "", tax: "+ tax" },
  US: { label: "United States", short: "US", currency: "USD", prefix: "US$", suffix: "", tax: "+ tax" },
  UK: { label: "United Kingdom", short: "UK", currency: "GBP", prefix: "£", suffix: "", tax: "+ VAT/tax" },
};

const plans = [
  {
    id: "start",
    backendPlan: "solo",
    name: "Start",
    prices: { NZ: 39, AU: 39, US: 29, UK: 25 },
    tag: "Starter",
    best: false,
    headline: "Get organised",
    summary: "For a solo operator who needs jobs, clients, quotes and invoices under control.",
    limit: "Best for one owner",
    features: [
      "Jobs, clients, quotes and invoices",
      "Smart Hub basics",
      "Business settings and GST/tax settings",
      "14-day free trial, no card",
    ],
  },
  {
    id: "crew",
    backendPlan: "team",
    name: "Crew",
    prices: { NZ: 89, AU: 89, US: 69, UK: 59 },
    tag: "Growing team",
    best: false,
    headline: "Run the crew",
    summary: "For a business with workers, daily dispatch, job handover and more client admin.",
    limit: "Up to 5 workers",
    features: [
      "Everything in Start",
      "Team and worker setup",
      "Dispatch-ready workflow",
      "More job and client capacity",
    ],
  },
  {
    id: "operator",
    backendPlan: "pro",
    name: "Operator",
    prices: { NZ: 149, AU: 149, US: 119, UK: 99 },
    tag: "Most Popular",
    best: true,
    headline: "Admin done for approval",
    summary: "Where Churvox starts doing the admin and you approve the work before it goes out.",
    limit: "Recommended plan",
    features: [
      "AI Operator Actions",
      "Command approval desk",
      "Quote follow-up watch",
      "Invoice and job admin prepared for approval",
      "Xero optional add-on later",
    ],
  },
  {
    id: "command",
    backendPlan: "enterprise",
    name: "Command",
    prices: { NZ: 299, AU: 299, US: 239, UK: 199 },
    tag: "Full control",
    best: false,
    headline: "Scale with control",
    summary: "For the bigger business that wants payroll workspace, Xero included and advanced control.",
    limit: "Up to 50 active team members",
    features: [
      "Everything in Operator",
      "Xero included",
      "Payroll workspace",
      "Advanced roles",
      "Priority support",
      "Command Growth Pack available",
    ],
  },
];

const growthPackPrices = { NZ: 99, AU: 99, US: 79, UK: 69 };

const backendToUiPlan = {
  solo: "start",
  team: "crew",
  pro: "operator",
  enterprise: "command",
  start: "start",
  crew: "crew",
  operator: "operator",
  command: "command",
};

function uiPlanFromBackend(value) {
  return backendToUiPlan[String(value || "pro").toLowerCase()] || "operator";
}

function planByUiId(id) {
  return plans.find((plan) => plan.id === id) || plans[2];
}

function unwrap(result) {
  return result?.data ?? result;
}

function planPrice(plan, regionCode) {
  return Number(plan?.prices?.[regionCode] ?? plan?.prices?.NZ ?? 0);
}

function growthPackPrice(regionCode) {
  return Number(growthPackPrices[regionCode] ?? growthPackPrices.NZ);
}

function money(value, regionCode) {
  const region = regions[regionCode] || regions.NZ;
  return `${region.prefix}${Number(value || 0).toFixed(0)}${region.suffix}`;
}

export default function FreshPlans({ onNavigate }) {
  const { get, patch, post } = useApi();
  const [currentPlan, setCurrentPlan] = React.useState("operator");
  const [selectedPlan, setSelectedPlan] = React.useState("operator");
  const [selectedRegion, setSelectedRegion] = React.useState("NZ");
  const [growthPacks, setGrowthPacks] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [notice, setNotice] = React.useState("Loading backend plan");
  const [error, setError] = React.useState("");

  const selected = planByUiId(selectedPlan);
  const current = planByUiId(currentPlan);
  const region = regions[selectedRegion] || regions.NZ;
  const commandSelected = selected.id === "command";
  const selectedPlanPrice = planPrice(selected, selectedRegion);
  const selectedGrowthPackPrice = growthPackPrice(selectedRegion);
  const growthTotal = commandSelected ? growthPacks * selectedGrowthPackPrice : 0;
  const monthlyTotal = selectedPlanPrice + growthTotal;

  const loadPlan = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const status = unwrap(await get("/billing/subscription-status"));
      const uiPlan = uiPlanFromBackend(status?.plan);
      setCurrentPlan(uiPlan);
      setSelectedPlan(uiPlan);

      try {
        const addons = unwrap(await get("/billing/addons"));
        if (addons && typeof addons.extra_user_blocks !== "undefined") {
          setGrowthPacks(Number(addons.extra_user_blocks || 0));
        }
      } catch {
        // Add-ons should not block the main plan page.
      }

      setNotice("Loaded from backend billing profile");
    } catch (err) {
      setError(err?.message || "Plan could not load from backend.");
      setNotice("Plan needs attention");
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  function choosePlan(planId) {
    setSelectedPlan(planId);
    if (planId !== "command") setGrowthPacks(0);
    setError("");
  }

  function chooseRegion(regionCode) {
    setSelectedRegion(regionCode);
    setError("");
    setNotice(`${regions[regionCode]?.label || regionCode} pricing selected`);
  }

  async function saveCurrentPlan() {
    setSaving(true);
    setError("");

    try {
      await patch("/user/plan", { plan: selected.backendPlan });
      await loadPlan();
      setSelectedPlan(selected.id);
      setNotice(`${selected.name} saved as current backend plan`);
    } catch (err) {
      setError(err?.message || "Plan could not be saved.");
      setNotice("Plan save failed");
    } finally {
      setSaving(false);
    }
  }

  async function startCheckout() {
    setCheckoutLoading(true);
    setError("");

    try {
      const response = unwrap(await post("/billing/create-checkout-session", {
        plan: selected.backendPlan,
        country: selectedRegion,
      }));
      const checkoutUrl = response?.url || response?.checkout_url;
      if (!checkoutUrl) throw new Error("Checkout URL was not returned.");
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err?.message || `Stripe checkout could not start for ${selectedRegion}. Check the ${selected.name} Stripe price ID for this region.`);
      setNotice("Checkout needs Stripe settings");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const planComparison = [
    ["Start", "Solo basics", "Jobs, quotes, invoices"],
    ["Crew", "Small team", "Workers and dispatch"],
    ["Operator", "Recommended", "AI admin prepared for approval"],
    ["Command", "Scale", "Xero, payroll and advanced roles"],
  ];

  return (
    <section className="freshPricingPage">
      <header className="freshPricingHero">
        <div>
          <span>Churvox pricing</span>
          <h1>Pick the plan that fits how much admin you want Churvox to handle.</h1>
          <p>Simple monthly pricing by region. 14-day free trial, no card. Churvox does the admin. You approve.</p>
          <div className="freshPricingHeroActions">
            <button className="freshPrimary" type="button" onClick={() => choosePlan("operator")}>See recommended plan</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("support")}>Talk to support</button>
          </div>
        </div>
        <aside>
          <small>Selected region</small>
          <strong>{region.currency}</strong>
          <p>{region.label} · prices shown {region.tax}</p>
        </aside>
      </header>

      <section className="freshPlanNotice proper">
        <b>Launch pricing live by region</b>
        <span>NZD, AUD, USD and GBP pricing are shown. Checkout uses the selected region and tax may apply.</span>
      </section>

      <section className="freshRegionPicker freshCard">
        <div>
          <b>Choose pricing region</b>
          <span>Stripe checkout will use this region.</span>
        </div>
        <div className="freshRegionButtons">
          {Object.entries(regions).map(([code, item]) => (
            <button
              key={code}
              type="button"
              className={selectedRegion === code ? "active" : ""}
              onClick={() => chooseRegion(code)}
            >
              <b>{item.short}</b>
              <span>{item.currency}</span>
            </button>
          ))}
        </div>
      </section>

      {error && (
        <section className="freshCard freshNotice need">
          <b>Plans need attention</b>
          <span>{error}</span>
        </section>
      )}

      <section className="freshPricingCards">
        {plans.map((plan) => {
          const active = selectedPlan === plan.id;
          const isCurrent = currentPlan === plan.id;
          const displayPrice = planPrice(plan, selectedRegion);
          return (
            <button
              type="button"
              key={plan.id}
              className={`freshPricingCard ${active ? "active" : ""} ${plan.best ? "best" : ""}`}
              onClick={() => choosePlan(plan.id)}
            >
              {isCurrent && <span className="freshCurrentBadge">Current</span>}
              <strong>{plan.name}</strong>
              <em>{money(displayPrice, selectedRegion)}<small>/month {region.tax}</small></em>
              <h3>{plan.headline}</h3>
              <p>{plan.summary}</p>
              <small className="freshPlanLimit">{plan.limit}</small>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </section>

      <section className="freshPricingDetail">
        <section className="freshCard freshSelectedPlanCard">
          <div className="freshSelectedPlanTop">
            <div>
              <span>Selected · {region.currency}</span>
              <h2>{selected.name}</h2>
              <p>{selected.summary}</p>
            </div>
            <strong>{money(monthlyTotal, selectedRegion)}<small>/month {region.tax}</small></strong>
          </div>

          {commandSelected && (
            <div className="freshGrowthPack premium">
              <div>
                <b>Command Growth Pack</b>
                <span>{money(selectedGrowthPackPrice, selectedRegion)}/month {region.tax} · adds 50 active team members plus extra job, AI action, automation and admin capacity.</span>
              </div>
              <div className="freshGrowthControls">
                <button type="button" onClick={() => setGrowthPacks((count) => Math.max(0, count - 1))}>−</button>
                <strong>{growthPacks}</strong>
                <button type="button" onClick={() => setGrowthPacks((count) => count + 1)}>+</button>
              </div>
            </div>
          )}

          <div className="freshPlanFeatures premium">
            {selected.features.map((feature) => (
              <div key={feature}>
                <b>✓</b>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="freshCard freshCheckoutCard">
          <h2>Billing actions</h2>
          <p>Use backend save for testing and persistence. Stripe checkout will use {region.label} pricing.</p>

          <div className="freshActions">
            <button className="freshPrimary" type="button" onClick={saveCurrentPlan} disabled={saving}>
              {saving ? "Saving..." : `Save ${selected.name} as current plan`}
            </button>
            <button className="freshDark" type="button" onClick={startCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? "Starting checkout..." : `Start Stripe checkout · ${region.currency}`}
            </button>
            <button className="freshOrange" type="button" onClick={() => choosePlan("operator")}>
              Recommend Operator
            </button>
            <button className="freshGhost" type="button" onClick={loadPlan}>
              Reload backend plan
            </button>
          </div>

          <div className="freshItem">
            <b>Best default</b>
            <span>Operator is the main plan because AI runs the admin and the owner approves.</span>
          </div>

          <div className="freshItem need">
            <b>Regional checkout</b>
            <span>Make sure Stripe has price IDs for {selected.name} in {selectedRegion} before live sales in this region.</span>
          </div>
        </aside>
      </section>

      <section className="freshCard freshCompareCard">
        <h2>Simple comparison</h2>
        <div className="freshCompareGrid">
          {planComparison.map(([name, fit, value]) => (
            <div key={name}>
              <b>{name}</b>
              <span>{fit}</span>
              <p>{value}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
