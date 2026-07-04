import React from "react";
import { useApi } from "../hooks/useApi";
// removed broken css import

const TRACE = "checkout-js-trace-20260615-stable-billing-v1";

const PLANS = [
  { id: "start", api: "solo", name: "Start", price: 39, tag: "Starter", desc: "Jobs, clients, quotes and invoices." },
  { id: "crew", api: "team", name: "Crew", price: 89, tag: "Growing team", desc: "Workers, team access and dispatch." },
  { id: "operator", api: "pro", name: "Operator", price: 149, tag: "Most Popular", desc: "AI Operator Actions and owner approval." },
  { id: "command", api: "enterprise", name: "Command", price: 299, tag: "Full control", desc: "Accounting sync, payroll workspace and scale." },
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

export default function FreshPlansStable({ onNavigate }) {
  const { get, post } = useApi();
  const [current, setCurrent] = React.useState("operator");
  const [choice, setChoice] = React.useState("operator");
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
      setChoice(next);
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
    const params = new URLSearchParams(window.location.search || "");
    const sessionId = params.get("session_id");
    const checkout = params.get("checkout");

    if (checkout === "cancelled") {
      setNotice("Stripe checkout cancelled");
      window.history.replaceState(null, "", "/plans");
      return;
    }

    if (checkout === "success" && sessionId) {
      let stopped = false;
      (async () => {
        try {
          setNotice("Confirming Stripe checkout");
          const result = await post("/billing/confirm-checkout", {
            session_id: sessionId,
            plan: params.get("plan") || plan.api,
            country: params.get("country") || "NZ",
          });
          const body = unwrap(result);
          if (body.success === false) throw new Error(body.error || body.detail || "Stripe checkout could not be confirmed.");
          if (!stopped) {
            window.history.replaceState(null, "", "/plans");
            window.dispatchEvent(new Event("churvox-auth-refresh"));
            setNotice("Stripe checkout confirmed");
            loadPlan();
          }
        } catch (err) {
          if (!stopped) {
            setNotice("Checkout needs attention");
            setError(err?.message || "Stripe checkout could not be confirmed.");
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
    setNotice("Opening Stripe checkout");
    try {
      const result = await post("/billing/create-checkout-session", {
        plan: plan.api,
        plan_type: plan.api,
        country: "NZ",
        billing_country: "NZ",
      });
      const body = unwrap(result);
      if (body.success === false) throw new Error(body.error || body.detail || "Stripe checkout could not be opened.");
      const url = checkoutUrl(body);
      if (!url) throw new Error("Stripe checkout did not return a checkout URL.");
      window.location.href = url;
    } catch (err) {
      setBusy(false);
      setNotice("Checkout needs attention");
      setError(err?.message || "Stripe checkout could not be opened.");
    }
  }

  return (
    <section className="freshPricingPage" data-checkout-trace={TRACE}>
      <section className="freshCard freshNotice" style={{ marginBottom: 12 }}>
        <b>Checkout trace</b><span>{TRACE}</span>
      </section>

      <header className="freshPricingHero">
        <div>
          <span>Churvox pricing</span>
          <h1>Start with Stripe trial checkout.</h1>
          <p>Simple monthly pricing + GST. Churvox does the admin. You approve.</p>
        </div>
        <aside>
          <small>Current plan</small>
          <strong>{selectedPlan(current).name}</strong>
          <p>{notice}</p>
        </aside>
      </header>

      <section className="freshPlanNotice proper">
        <b>14-day Stripe trial</b>
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
          <h2>Stripe checkout</h2>
          <p>Uses Churvox same-site API and confirms the plan when Stripe returns.</p>
          <div className="freshActions">
            <button className="freshDark" type="button" onClick={startCheckout} disabled={busy}>{busy ? "Opening Stripe..." : "Start Stripe checkout"}</button>
            <button className="freshGhost" type="button" onClick={loadPlan}>Reload plan</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("support")}>Support</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
