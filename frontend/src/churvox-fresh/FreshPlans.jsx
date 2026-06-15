import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshPlans.css";

const CHECKOUT_TRACE_MARKER = "checkout-js-trace-20260615-samesite-api-v12";

const plans = [
  { id: "start", backendPlan: "solo", name: "Start", price: 39, tag: "Starter", best: false, headline: "Get organised", summary: "For a solo operator who needs jobs, clients, quotes and invoices under control.", limit: "Best for one owner", features: ["Jobs, clients, quotes and invoices", "Business Pulse basics", "Business settings and GST", "Accounting Sync Add-on available"] },
  { id: "crew", backendPlan: "team", name: "Crew", price: 89, tag: "Growing team", best: false, headline: "Run the crew", summary: "For a business with workers, daily dispatch, job handover and more client admin.", limit: "Up to 5 workers", features: ["Everything in Start", "Team and worker setup", "Dispatch-ready workflow", "More job and client capacity", "Accounting Sync Add-on available"] },
  { id: "operator", backendPlan: "pro", name: "Operator", price: 149, tag: "Most Popular", best: true, headline: "Admin done for approval", summary: "Where Churvox starts preparing the admin and you approve the work before it goes out.", limit: "Recommended plan", features: ["AI Operator Actions", "Command approval desk", "Quote follow-up watch", "Invoice and job admin prepared for approval", "Accounting Sync Add-on available"] },
  { id: "command", backendPlan: "enterprise", name: "Command", price: 299, tag: "Full control", best: false, headline: "Scale with control", summary: "For the bigger business that wants payroll workspace, accounting sync included and advanced control.", limit: "Up to 50 active team members", features: ["Everything in Operator", "Accounting sync included", "Payroll workspace", "Advanced roles", "Priority support", "Command Growth Pack available"] },
];

const backendToUiPlan = { solo: "start", team: "crew", pro: "operator", enterprise: "command", start: "start", crew: "crew", operator: "operator", command: "command" };

function unwrap(result) { return result?.data ?? result; }
function planByUiId(id) { return plans.find((plan) => plan.id === id) || plans[2]; }
function uiPlanFromBackend(value) { return backendToUiPlan[String(value || "pro").toLowerCase()] || "operator"; }
function money(value) { return `$${Number(value || 0).toFixed(0)}`; }
function tokenValue() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("access_token") || localStorage.getItem("churvox_token") || "";
  } catch {
    return "";
  }
}
function authHeaders() {
  const token = tokenValue();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function looksLikeStripeUrl(value) {
  return typeof value === "string" && /^https:\/\/(checkout\.stripe\.com|buy\.stripe\.com)\//i.test(value.trim());
}
function findCheckoutUrl(value, depth = 0) {
  if (!value || depth > 5) return "";
  if (looksLikeStripeUrl(value)) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCheckoutUrl(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object") {
    const keys = ["url", "checkout_url", "checkoutUrl", "session_url", "sessionUrl", "stripe_url", "redirect_url", "redirectUrl"];
    for (const key of keys) {
      if (looksLikeStripeUrl(value[key])) return String(value[key]).trim();
    }
    for (const key of ["data", "session", "checkout", "result", "payload"]) {
      const found = findCheckoutUrl(value[key], depth + 1);
      if (found) return found;
    }
  }
  return "";
}
function extractStripeUrlFromText(text) {
  const match = String(text || "").match(/https:\/\/(checkout\.stripe\.com|buy\.stripe\.com)\/[^\s"'<>]+/i);
  return match ? match[0] : "";
}
async function postCheckout(endpoint, body) {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}

  if (!response.ok) {
    const detail = data?.detail || data?.message || text || `Checkout failed with HTTP ${response.status}`;
    throw new Error(String(detail));
  }

  const url = findCheckoutUrl(data) || extractStripeUrlFromText(text);
  return { url, text, data, endpoint, status: response.status };
}
async function createCheckout({ plan, country }) {
  const body = { plan, plan_type: plan, country, billing_country: country };
  const errors = [];

  for (const endpoint of [
    "/api/billing/create-checkout-session",
    "/api/stripe/create-checkout-session",
  ]) {
    try {
      const result = await postCheckout(endpoint, body);
      if (result.url) return result.url;
      const raw = result.text || JSON.stringify(result.data || {});
      errors.push(`${endpoint} HTTP ${result.status} returned no Stripe URL: ${String(raw).slice(0, 400)}`);
    } catch (err) {
      errors.push(`${endpoint}: ${err?.message || err}`);
    }
  }

  throw new Error(errors.join(" | ") || "Stripe checkout did not return a checkout URL.");
}

export default function FreshPlans({ onNavigate }) {
  const { get } = useApi();
  const [currentPlan, setCurrentPlan] = React.useState("operator");
  const [selectedPlan, setSelectedPlan] = React.useState("operator");
  const [growthPacks, setGrowthPacks] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
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
        if (addons && typeof addons.extra_user_blocks !== "undefined") setGrowthPacks(Number(addons.extra_user_blocks || 0));
      } catch {}
      setNotice("Loaded from backend billing profile");
    } catch (err) {
      setError(err?.message || "Plan could not load from backend.");
      setNotice("Plan needs attention");
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => { loadPlan(); }, [loadPlan]);

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
      const url = await createCheckout({ plan: selected.backendPlan, country: "NZ" });
      window.location.assign(url);
    } catch (err) {
      setNotice("Checkout needs attention");
      setError(err?.message || "Stripe checkout could not be opened.");
      setCheckoutLoading(false);
    }
  }

  const planComparison = [["Start", "Solo basics", "Jobs, quotes, invoices"], ["Crew", "Small team", "Workers and dispatch"], ["Operator", "Recommended", "AI admin prepared for approval"], ["Command", "Scale", "Accounting sync, payroll and advanced roles"]];

  return (
    <section className="freshPricingPage" data-checkout-trace={CHECKOUT_TRACE_MARKER}>
      <section className="freshCard freshNotice" style={{ marginBottom: 12 }}><b>Checkout trace</b><span>{CHECKOUT_TRACE_MARKER}</span></section>
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
          <strong>{loading ? "Loading..." : current.name}</strong>
          <p>{notice}</p>
        </aside>
      </header>

      <section className="freshPlanNotice proper">
        <b>Launch pricing locked</b>
        <span>Start $39 · Crew $89 · Operator $149 · Command $299. Accounting Sync Add-on is available where supported.</span>
      </section>

      {error && <section className="freshCard freshNotice need"><b>Plans need attention</b><span>{error}</span></section>}

      <section className="freshPricingCards">
        {plans.map((plan) => {
          const active = selectedPlan === plan.id;
          const isCurrent = currentPlan === plan.id;
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
          <div className="freshSelectedPlanTop"><div><span>Selected</span><h2>{selected.name}</h2><p>{selected.summary}</p></div><strong>{money(monthlyTotal)}<small>/month + GST</small></strong></div>
          {commandSelected && <div className="freshGrowthPack premium"><div><b>Command Growth Pack</b><span>$99/month + GST · adds 50 active team members plus extra job, AI action, automation and admin capacity.</span></div><div className="freshGrowthControls"><button type="button" onClick={() => setGrowthPacks((count) => Math.max(0, count - 1))}>−</button><strong>{growthPacks}</strong><button type="button" onClick={() => setGrowthPacks((count) => count + 1)}>+</button></div></div>}
          <div className="freshPlanFeatures premium">{selected.features.map((feature) => <div key={feature}><b>✓</b><span>{feature}</span></div>)}</div>
        </section>
        <aside className="freshCard freshCheckoutCard">
          <h2>Stripe checkout</h2>
          <p>This uses the Churvox same-site API so your login and billing flow stay together.</p>
          <div className="freshActions">
            <button className="freshDark" type="button" onClick={startCheckout} disabled={checkoutLoading}>{checkoutLoading ? "Opening Stripe..." : "Start Stripe checkout"}</button>
            <button className="freshOrange" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button>
            <button className="freshGhost" type="button" onClick={loadPlan}>Reload backend plan</button>
          </div>
          <div className="freshItem"><b>Best default</b><span>Operator is the main plan because AI runs the admin and the owner approves.</span></div>
          <div className="freshItem need"><b>Command scale</b><span>Command includes up to 50 active team members. Inactive old staff should not count as billable.</span></div>
        </aside>
      </section>

      <section className="freshCard freshCompareCard"><h2>Simple comparison</h2><div className="freshCompareGrid">{planComparison.map(([name, fit, value]) => <div key={name}><b>{name}</b><span>{fit}</span><p>{value}</p></div>)}</div></section>
    </section>
  );
}
