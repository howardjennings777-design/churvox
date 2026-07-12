import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshPlans.css";

const BILLING_PLAN_KEY = "churvox:billing-plan";
const BILLING_COUNTRY_KEY = "churvox:billing-country";

const PLANS = [
  { id: "start", api: "solo", name: "Start", price: 39, tag: "Starter", desc: "Jobs, clients, quotes and invoices." },
  { id: "crew", api: "team", name: "Crew", price: 89, tag: "Growing team", desc: "Workers, team access and dispatch." },
  { id: "operator", api: "pro", name: "Operator", price: 149, tag: "Most Popular", desc: "Prepared admin actions and owner approval." },
  { id: "command", api: "enterprise", name: "Command", price: 299, tag: "Full control", desc: "Accounting sync, payroll review and scale." },
];

const UI_PLAN = {
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
  return result?.data ?? result ?? {};
}

function planFromBackend(value) {
  return UI_PLAN[String(value || "pro").toLowerCase()] || "operator";
}

function selectedPlan(id) {
  return PLANS.find((plan) => plan.id === id) || PLANS[2];
}

function checkoutUrl(result) {
  const body = result?.data ?? result ?? {};
  return body.url || body.checkout_url || body.checkoutUrl || body.session_url || body.data?.url || body.data?.checkout_url || "";
}

function queryParams() {
  try { return new URLSearchParams(window.location.search || ""); } catch { return new URLSearchParams(); }
}

function initialChoice() {
  const params = queryParams();
  try {
    return planFromBackend(params.get("plan") || params.get("selected_plan") || window.localStorage.getItem(BILLING_PLAN_KEY) || "operator");
  } catch {
    return planFromBackend(params.get("plan") || params.get("selected_plan") || "operator");
  }
}

function checkoutCountry() {
  const params = queryParams();
  try {
    return String(params.get("country") || window.localStorage.getItem(BILLING_COUNTRY_KEY) || "NZ").trim().toUpperCase() || "NZ";
  } catch {
    return String(params.get("country") || "NZ").trim().toUpperCase() || "NZ";
  }
}

function hasExplicitPlanChoice() {
  const params = queryParams();
  try {
    return Boolean(params.get("plan") || params.get("selected_plan") || window.localStorage.getItem(BILLING_PLAN_KEY));
  } catch {
    return Boolean(params.get("plan") || params.get("selected_plan"));
  }
}

export default function FreshPlansStable({ onNavigate }) {
  const { get, post } = useApi();
  const [current, setCurrent] = React.useState(initialChoice);
  const [choice, setChoice] = React.useState(initialChoice);
  const [notice, setNotice] = React.useState("Loading plan");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const plan = selectedPlan(choice);

  const loadPlan = React.useCallback(async () => {
    setError("");
    try {
      const status = unwrap(await get("/billing/subscription-status"));
      const next = planFromBackend(status.plan);
      setCurrent(next);
      if (!hasExplicitPlanChoice()) setChoice(next);
      setNotice(status.subscription_status === "trialing" ? "Trial active" : "Plan loaded");
    } catch (err) {
      setNotice("Plan needs attention");
      setError(err?.message || "Could not load your plan.");
    }
  }, [get]);

  React.useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  React.useEffect(() => {
    try { localStorage.setItem(BILLING_PLAN_KEY, choice); } catch {}
  }, [choice]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search || "");
    const sessionId = params.get("session_id");
    const checkout = params.get("checkout");

    if (checkout === "cancelled") {
      setNotice("Checkout cancelled");
      window.history.replaceState(null, "", "/plans");
      return;
    }

    if (checkout === "success" && sessionId) {
      let stopped = false;
      (async () => {
        try {
          setNotice("Confirming checkout");
          const result = await post("/billing/confirm-checkout", {
            session_id: sessionId,
            plan: params.get("plan") || plan.api,
            country: params.get("country") || checkoutCountry(),
          });
          const body = unwrap(result);
          if (body.success === false) throw new Error(body.error || body.detail || "Checkout could not be confirmed.");
          if (!stopped) {
            window.history.replaceState(null, "", "/plans");
            window.dispatchEvent(new Event("churvox-auth-refresh"));
            setNotice("Checkout confirmed");
            loadPlan();
          }
        } catch (err) {
          if (!stopped) {
            setNotice("Checkout needs attention");
            setError(err?.message || "Checkout could not be confirmed.");
          }
        }
      })();
      return () => {
        stopped = true;
      };
    }
  }, [loadPlan, post, plan.api]);

  async function startCheckout() {
    setBusy(true);
    setError("");
    setNotice("Opening checkout");
    try {
      const country = checkoutCountry();
      try {
        localStorage.setItem(BILLING_PLAN_KEY, choice);
        localStorage.setItem(BILLING_COUNTRY_KEY, country);
      } catch {}
      const result = await post("/billing/create-checkout-session", {
        plan: plan.api,
        plan_type: plan.api,
        selected_plan: choice,
        country,
        billing_country: country,
      });
      const body = unwrap(result);
      if (body.success === false) throw new Error(body.error || body.detail || "Checkout could not be opened.");
      const url = checkoutUrl(body);
      if (!url) throw new Error("Checkout did not return a secure checkout URL.");
      window.location.href = url;
    } catch (err) {
      setBusy(false);
      setNotice("Checkout needs attention");
      setError(err?.message || "Checkout could not be opened.");
    }
  }

  return (
    <section className="freshPricingPage" data-checkout-trace="paid-launch-checkout-ready">
      <header className="freshPricingHero">
        <div>
          <span>Churvox pricing</span>
          <h1>Start with a 14-day trial.</h1>
          <p>Simple monthly pricing + GST. Churvox does the admin. You approve.</p>
        </div>
        <aside>
          <small>Current plan</small>
          <strong>{selectedPlan(current).name}</strong>
          <p>{notice}</p>
        </aside>
      </header>

      <section className="freshPlanNotice proper">
        <b>14-day trial</b>
        <span>Start $39 · Crew $89 · Operator $149 · Command $299.</span>
      </section>

      {error && <section className="freshCard freshNotice need"><b>Plans need attention</b><span>{error}</span></section>}

      <section className="freshPricingCards">
        {PLANS.map((item) => (
          <button key={item.id} type="button" className={`freshPricingCard ${choice === item.id ? "active" : ""} ${item.id === "operator" ? "best" : ""}`} onClick={() => { setChoice(item.id); setError(""); }}>
            <span className="freshPlanTag">{item.tag}</span>
            {current === item.id && <span className="freshCurrentBadge">Current</span>}
            <strong>{item.name}</strong>
            <em>${item.price}<small>/month + GST</small></em>
            <p>{item.desc}</p>
          </button>
        ))}
      </section>

      <section className="freshPricingDetail">
        <section className="freshCard freshSelectedPlanCard">
          <div className="freshSelectedPlanTop">
            <div><span>Selected</span><h2>{plan.name}</h2><p>{plan.desc}</p></div>
            <strong>${plan.price}<small>/month + GST</small></strong>
          </div>
        </section>
        <aside className="freshCard freshCheckoutCard">
          <h2>Secure checkout</h2>
          <p>Starts the 14-day trial for the selected plan and returns to Churvox setup when complete.</p>
          <div className="freshActions">
            <button className="freshDark" type="button" onClick={startCheckout} disabled={busy}>{busy ? "Opening checkout..." : "Start free trial"}</button>
            <button className="freshGhost" type="button" onClick={loadPlan}>Reload plan</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("support")}>Support</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
