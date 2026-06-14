import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshPlans.css";

const plans = [
  {
    id: "start",
    backendPlan: "solo",
    name: "Start",
    price: 39,
    tag: "Starter",
    best: false,
    headline: "Get organised",
    summary: "For a solo operator who needs jobs, clients, quotes and invoices under control.",
    limit: "Best for one owner",
    features: [
      "Jobs, clients, quotes and invoices",
      "Smart Hub basics",
      "Business settings and GST",
      "14-day free trial, no card",
    ],
  },
  {
    id: "crew",
    backendPlan: "team",
    name: "Crew",
    price: 89,
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
    price: 149,
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
    price: 299,
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

function money(value) {
  return `$${Number(value || 0).toFixed(0)}`;
}

export default function FreshPlans({ onNavigate }) {
  const { get, patch, post } = useApi();
  const [currentPlan, setCurrentPlan] = React.useState("operator");
  const [selectedPlan, setSelectedPlan] = React.useState("operator");
  const [growthPacks, setGrowthPacks] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [notice, setNotice] = React.useState("Loading backend plan");
  const [error, setError] = React.useState("");

  const selected = planByUiId(selectedPlan);
  const current = planByUiId(currentPlan);
  const commandSelected = selected.id === "command";
  const growthTotal = commandSelected ? growthPacks * 99 : 0;
  const monthlyTotal = selected.price + growthTotal;

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
        country: "NZ",
      }));
      const checkoutUrl = response?.url || response?.checkout_url;
      if (!checkoutUrl) throw new Error("Checkout URL was not returned.");
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err?.message || "Stripe checkout could not start. Check Stripe environment settings.");
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
          <p>Simple monthly pricing + GST. 14-day free trial, no card. Churvox does the admin. You approve.</p>
          <div className="freshPricingHeroActions">
            <button className="freshPrimary" type="button" onClick={() => choosePlan("operator")}>See recommended plan</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("support")}>Talk to support</button>
          </div>
        </div>
        <aside>
          <small>Current backend plan</small>
          <strong>{loading ? "Loading..." : current.name}</strong>
          <p>{notice}</p>
        </aside>
      </header>

      <section className="freshPlanNotice proper">
        <b>Launch pricing locked</b>
        <span>Start $39 · Crew $89 · Operator $149 · Command $299. No done-for-you setup add-on shown.</span>
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
          return (
            <button
              type="button"
              key={plan.id}
              className={`freshPricingCard ${active ? "active" : ""} ${plan.best ? "best" : ""}`}
              onClick={() => choosePlan(plan.id)}
            >
              {isCurrent && <span className="freshCurrentBadge">Current</span>}
              <strong>{plan.name}</strong>
              <em>{money(plan.price)}<small>/month + GST</small></em>
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
              <span>Selected</span>
              <h2>{selected.name}</h2>
              <p>{selected.summary}</p>
            </div>
            <strong>{money(monthlyTotal)}<small>/month + GST</small></strong>
          </div>

          {commandSelected && (
            <div className="freshGrowthPack premium">
              <div>
                <b>Command Growth Pack</b>
                <span>$99/month + GST · adds 50 active team members plus extra job, AI action, automation and admin capacity.</span>
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
          <p>Use backend save for testing and persistence. Use Stripe checkout when you are ready to take payment.</p>

          <div className="freshActions">
            <button className="freshPrimary" type="button" onClick={saveCurrentPlan} disabled={saving}>
              {saving ? "Saving..." : `Save ${selected.name} as current plan`}
            </button>
            <button className="freshDark" type="button" onClick={startCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? "Starting checkout..." : "Start Stripe checkout"}
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
            <b>Command scale</b>
            <span>Command includes up to 50 active team members. Inactive old staff should not count as billable.</span>
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
