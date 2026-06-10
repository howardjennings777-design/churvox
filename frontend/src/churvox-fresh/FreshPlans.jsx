import React from "react";

const PLAN_STORAGE_KEY = "churvox:fresh-plan:v1";
const GROWTH_STORAGE_KEY = "churvox:fresh-growth-packs:v1";

const plans = [
  {
    id: "start",
    name: "Start",
    price: 39,
    tag: "Starter",
    best: false,
    summary: "For a small operator getting jobs, clients and basic invoicing organised.",
    features: [
      "Jobs, clients, quotes and invoices",
      "Command preview boxes",
      "Basic team setup",
      "14-day free trial, no card",
    ],
  },
  {
    id: "crew",
    name: "Crew",
    price: 89,
    tag: "Growing team",
    best: false,
    summary: "For a business with workers, daily dispatch and more client admin.",
    features: [
      "Everything in Start",
      "Dispatch board",
      "Team and worker setup",
      "More job and client capacity",
    ],
  },
  {
    id: "operator",
    name: "Operator",
    price: 149,
    tag: "Most Popular",
    best: true,
    summary: "Where Churvox starts doing the admin and you approve the work.",
    features: [
      "AI Operator Actions",
      "Command approval desk",
      "Quote follow-up watch",
      "Invoice and job admin prepared for approval",
      "MYOB optional add-on later",
    ],
  },
  {
    id: "command",
    name: "Command",
    price: 299,
    tag: "Full control",
    best: false,
    summary: "For the bigger business that wants payroll workspace, MYOB included and advanced control.",
    features: [
      "Everything in Operator",
      "MYOB included",
      "Payroll workspace",
      "Advanced roles",
      "Priority support",
      "Up to 50 active team members",
    ],
  },
];

function loadPlan() {
  try {
    if (typeof window === "undefined") return "operator";
    return window.localStorage.getItem(PLAN_STORAGE_KEY) || "operator";
  } catch {
    return "operator";
  }
}

function loadGrowthPacks() {
  try {
    if (typeof window === "undefined") return 0;
    return Number(window.localStorage.getItem(GROWTH_STORAGE_KEY) || 0);
  } catch {
    return 0;
  }
}

function money(value) {
  return `$${Number(value || 0).toFixed(0)}`;
}

export default function FreshPlans({ onNavigate }) {
  const [currentPlan, setCurrentPlan] = React.useState(loadPlan);
  const [selectedPlan, setSelectedPlan] = React.useState(loadPlan);
  const [growthPacks, setGrowthPacks] = React.useState(loadGrowthPacks);

  const selected = plans.find((plan) => plan.id === selectedPlan) || plans[2];
  const commandSelected = selected.id === "command";
  const growthTotal = commandSelected ? growthPacks * 99 : 0;
  const monthlyTotal = selected.price + growthTotal;

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PLAN_STORAGE_KEY, currentPlan);
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [currentPlan]);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(GROWTH_STORAGE_KEY, String(growthPacks));
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [growthPacks]);

  function choosePlan(planId) {
    setSelectedPlan(planId);
    if (planId !== "command") setGrowthPacks(0);
  }

  function makeCurrent() {
    setCurrentPlan(selected.id);
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Plans</span>
        <h1>Plans</h1>
        <p>Locked Churvox pricing. 14-day free trial, no card. Churvox does the admin. You approve.</p>
      </header>

      <section className="freshPlanNotice">
        <b>Pricing rule</b>
        <span>No done-for-you setup add-on is shown. Prices are monthly + GST.</span>
      </section>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{selected.name}</h2>
          <p>Selected plan</p>
        </aside>
        <aside className="freshCard">
          <h2>{money(monthlyTotal)}</h2>
          <p>Monthly + GST</p>
        </aside>
        <aside className="freshCard">
          <h2>{currentPlan}</h2>
          <p>Current preview plan</p>
        </aside>
      </section>

      <section className="freshPlansGrid">
        {plans.map((plan) => (
          <button
            type="button"
            key={plan.id}
            className={`freshPlanCard ${selectedPlan === plan.id ? "active" : ""} ${plan.best ? "best" : ""}`}
            onClick={() => choosePlan(plan.id)}
          >
            <span>{plan.tag}</span>
            <strong>{plan.name}</strong>
            <em>{money(plan.price)} / month + GST</em>
            <p>{plan.summary}</p>
            <small>{currentPlan === plan.id ? "Current preview plan" : "Select plan"}</small>
          </button>
        ))}
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>{selected.name} details</h2>

          <div className="freshPlanPrice">
            <span>Monthly price</span>
            <b>{money(selected.price)} + GST</b>
          </div>

          {commandSelected && (
            <div className="freshGrowthPack">
              <div>
                <b>Command Growth Pack</b>
                <span>$99/month + GST · adds 50 active team members plus more job, AI action and admin capacity.</span>
              </div>

              <div className="freshGrowthControls">
                <button onClick={() => setGrowthPacks((count) => Math.max(0, count - 1))}>−</button>
                <strong>{growthPacks}</strong>
                <button onClick={() => setGrowthPacks((count) => count + 1)}>+</button>
              </div>
            </div>
          )}

          <div className="freshPlanFeatures">
            {selected.features.map((feature) => (
              <div key={feature}>
                <b>✓</b>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>

          <div className="freshActions">
            <button className="freshPrimary" onClick={makeCurrent}>
              Set as current plan
            </button>
            <button className="freshOrange" onClick={() => setSelectedPlan("operator")}>
              Recommend Operator
            </button>
            <button className="freshDark" onClick={() => setSelectedPlan("command")}>
              View Command
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("support")}>
              Ask support
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("settings")}>
              Open billing settings
            </button>
          </div>

          <div className="freshItem">
            <b>Best default</b>
            <span>Operator is the main recommended plan because AI runs the admin and the owner approves.</span>
          </div>

          <div className="freshItem need">
            <b>Command scale</b>
            <span>Command includes up to 50 active team members. Inactive old staff should not count as billable.</span>
          </div>
        </aside>
      </section>
    </section>
  );
}
