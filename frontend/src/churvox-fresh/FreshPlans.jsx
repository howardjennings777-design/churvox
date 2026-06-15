import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshPlans.css";

const CHECKOUT_TRACE_MARKER = "checkout-js-trace-direct-backend-json-v22";

const plans = [
  { id: "start", backendPlan: "solo", name: "Start", price: 39, tag: "Starter", best: false, headline: "Get organised", summary: "For a solo operator who needs jobs, clients, quotes and invoices under control.", limit: "Best for one owner", features: ["Jobs, clients, quotes and invoices", "Business Pulse basics", "Business settings and GST", "Accounting Sync Add-on available"] },
  { id: "crew", backendPlan: "team", name: "Crew", price: 89, tag: "Growing team", best: false, headline: "Run the crew", summary: "For a business with workers, daily dispatch, job handover and more client admin.", limit: "Up to 5 workers", features: ["Everything in Start", "Team and worker setup", "Dispatch-ready workflow", "More job and client capacity", "Accounting Sync Add-on available"] },
  { id: "operator", backendPlan: "pro", name: "Operator", price: 149, tag: "Most Popular", best: true, headline: "Admin done for approval", summary: "Where Churvox starts preparing the admin and you approve the work before it goes out.", limit: "Recommended plan", features: ["AI Operator Actions", "Command approval desk", "Quote follow-up watch", "Invoice and job admin prepared for approval", "Accounting Sync Add-on available"] },
  { id: "command", backendPlan: "enterprise", name: "Command", price: 299, tag: "Full control", best: false, headline: "Scale with control", summary: "For the bigger business that wants payroll workspace, accounting sync included and advanced control.", limit: "Up to 50 active team members", features: ["Everything in Operator", "Accounting sync included", "Payroll workspace", "Advanced roles", "Priority support", "Command Growth Pack available"] },
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

function unwrap(result) {
  const body = result?.data ?? result ?? {};
  if (body && typeof body === "object" && body.success === true && body.data && typeof body.data === "object") {
    return body.data;
  }
  return body;
}

function planByUiId(id) {
  return plans.find((plan) => plan.id === id) || null;
}

function uiPlanFromBackend(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw || raw === "none" || raw === "null" || raw === "undefined") return "";
  return backendToUiPlan[raw] || "";
}

function money(value) {
  return `$${Number(value || 0).toFixed(0)}`;
}

function checkoutUrl(body) {
  return (
    body?.url ||
    body?.checkout_url ||
    body?.checkoutUrl ||
    body?.session_url ||
    body?.stripe_url ||
    body?.redirect_url ||
    body?.data?.url ||
    body?.data?.checkout_url ||
    body?.session?.url ||
    ""
  );
}

function authToken() {
  try {
    return window.localStorage.getItem("token") || window.localStorage.getItem("authToken") || window.localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function liveBackendBase() {
  return "https://grassley-backend.onrender.com";
}

async function readJsonOrText(response) {
  const text = await response.text();
  if (!text) {
    throw new Error(`Backend returned an empty response (${response.status})`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Backend returned non-JSON (${response.status}): ${text.slice(0, 250)}`);
  }
}

function tokenFromStorage() {
  try {
    return window.localStorage.getItem("token") || window.localStorage.getItem("authToken") || window.localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function submitCheckoutForm(fields) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/billing/start-checkout-form";
  form.style.display = "none";

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value ?? "");
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

export default function FreshPlans({ onNavigate }) {
  const { get, post } = useApi();

  const [currentPlan, setCurrentPlan] = React.useState("");
  const [selectedPlan, setSelectedPlan] = React.useState("operator");
  const [growthPacks, setGrowthPacks] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [notice, setNotice] = React.useState("Loading backend plan");
  const [error, setError] = React.useState("");

  const selected = planByUiId(selectedPlan) || plans[2];
  const current = planByUiId(currentPlan);
  const commandSelected = selected.id === "command";
  const growthTotal = commandSelected ? growthPacks * 99 : 0;
  const monthlyTotal = selected.price + growthTotal;

  const loadPlan = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await get("/billing/subscription-status");
      if (!result?.success) throw new Error(result?.error || "Plan could not load from backend.");

      const status = unwrap(result);
      const uiPlan = uiPlanFromBackend(status?.plan);

      setCurrentPlan(uiPlan);
      if (uiPlan) setSelectedPlan(uiPlan);

      try {
        const addonsResult = await get("/billing/addons");
        const addons = unwrap(addonsResult);
        if (addons && typeof addons.extra_user_blocks !== "undefined") {
          setGrowthPacks(Number(addons.extra_user_blocks || 0));
        }
      } catch {
        // Add-ons are not critical for checkout.
      }

      if (!uiPlan) {
        setNotice("No plan chosen yet");
      } else {
        setNotice(status?.subscription_status === "trialing" ? "Trial active" : "Loaded from backend billing profile");
      }
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

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search || "");
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");

    if (checkout === "cancelled") {
      setNotice("Stripe checkout cancelled");
      window.history.replaceState(null, "", "/plans");
      return;
    }

    if (checkout === "success" && sessionId) {
      let cancelled = false;

      (async () => {
        setNotice("Confirming Stripe checkout");
        setError("");

        try {
          const result = await post("/billing/confirm-checkout", {
            session_id: sessionId,
            plan: params.get("plan") || selected.backendPlan,
            country: params.get("country") || "NZ",
          });

          if (!result?.success) {
            throw new Error(result?.error || result?.data?.error || "Stripe checkout could not be confirmed.");
          }

          if (!cancelled) {
            window.history.replaceState(null, "", "/plans");
            window.dispatchEvent(new Event("churvox-auth-refresh"));
            setNotice("Stripe checkout confirmed");
            loadPlan();
          }
        } catch (err) {
          if (!cancelled) {
            setNotice("Checkout needs attention");
            setError(err?.message || "Stripe checkout could not be confirmed.");
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [loadPlan, post, selected.backendPlan]);

  function choosePlan(planId) {
    setSelectedPlan(planId);
    if (planId !== "command") setGrowthPacks(0);
    setError("");
  }

  async function startCheckout() {
    setCheckoutLoading(true);
    setError("");
    setNotice("Opening Stripe checkout");

    try {
      const token = authToken();
      if (!token) {
        throw new Error("Your login token is missing. Log out, log back in, then try checkout again.");
      }

      const response = await fetch(`${liveBackendBase()}/api/billing/create-checkout-session`, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: selected.backendPlan,
          plan_type: selected.backendPlan,
          country: "NZ",
          billing_country: "NZ",
          source: "fresh_plans_direct_backend_v22",
        }),
      });

      const body = await readJsonOrText(response);

      if (!response.ok || body?.success === false) {
        throw new Error(body?.detail || body?.error || body?.message || `Checkout failed with status ${response.status}`);
      }

      const url = checkoutUrl(body);
      if (!url) {
        throw new Error(`Stripe checkout did not return a checkout URL. ${JSON.stringify(body).slice(0, 300)}`);
      }

      window.location.href = url;
    } catch (err) {
      setNotice("Checkout needs attention");
      setError(err?.message || "Stripe checkout could not be opened.");
      setCheckoutLoading(false);
    }
  }


  const planComparison = [
    ["Start", "Solo basics", "Jobs, quotes, invoices"],
    ["Crew", "Small team", "Workers and dispatch"],
    ["Operator", "Recommended", "AI admin prepared for approval"],
    ["Command", "Scale", "Accounting sync, payroll and advanced roles"],
  ];

  return (
    <section className="freshPricingPage" data-checkout-trace={CHECKOUT_TRACE_MARKER}>
      <section className="freshCard freshNotice" style={{ marginBottom: 12 }}>
        <b>Checkout trace</b>
        <span>{CHECKOUT_TRACE_MARKER}</span>
      </section>

      <header className="freshPricingHero">
        <div>
          <span>Churvox pricing</span>
          <h1>Pick the plan that fits how much admin you want Churvox to handle.</h1>
          <p>Simple monthly pricing + GST. Churvox does the admin. You approve.</p>
          <div className="freshPricingHeroActions">
            <button className="freshPrimary" type="button" onClick={() => choosePlan("operator")}>See recommended plan</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("support")}>Talk to support</button>
          </div>
        </div>

        <aside>
          <small>Current backend plan</small>
          <strong>{loading ? "Loading..." : current ? current.name : "No plan chosen"}</strong>
          <p>{notice}</p>
        </aside>
      </header>

      <section className="freshPlanNotice proper">
        <b>Launch pricing locked</b>
        <span>Start $39 · Crew $89 · Operator $149 · Command $299. Accounting Sync Add-on is available where supported.</span>
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
          const isCurrent = Boolean(currentPlan) && currentPlan === plan.id;

          return (
            <button type="button" key={plan.id} className={`freshPricingCard ${active ? "active" : ""} ${plan.best ? "best" : ""}`} onClick={() => choosePlan(plan.id)}>
              <span className="freshPlanTag">{plan.tag}</span>
              {isCurrent && <span className="freshCurrentBadge">Current</span>}
              <strong>{plan.name}</strong>
              <em>{money(plan.price)}<small>/month + GST</small></em>
              <h3>{plan.headline}</h3>
              <p>{plan.summary}</p>
              <small className="freshPlanLimit">{plan.limit}</small>
              <ul>{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
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
            {selected.features.map((feature) => <div key={feature}><b>✓</b><span>{feature}</span></div>)}
          </div>
        </section>

        <aside className="freshCard freshCheckoutCard">
          <h2>Stripe checkout</h2>
          <p>This calls the live backend directly, gets a Stripe checkout URL as JSON, then redirects.</p>

          <div className="freshActions">
            <button className="freshDark" type="button" onClick={startCheckout} disabled={checkoutLoading}>{checkoutLoading ? "Opening Stripe..." : "Start Stripe checkout"}</button>
            <button className="freshOrange" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button>
            <button className="freshGhost" type="button" onClick={loadPlan}>Reload backend plan</button>
          </div>

          <div className="freshItem"><b>Best default</b><span>Operator is the main plan because AI runs the admin and the owner approves.</span></div>
          <div className="freshItem need"><b>Command scale</b><span>Command includes up to 50 active team members. Inactive old staff should not count as billable.</span></div>
        </aside>
      </section>

      <section className="freshCard freshCompareCard">
        <h2>Simple comparison</h2>
        <div className="freshCompareGrid">
          {planComparison.map(([name, fit, value]) => <div key={name}><b>{name}</b><span>{fit}</span><p>{value}</p></div>)}
        </div>
      </section>
    </section>
  );
}
