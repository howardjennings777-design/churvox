import React from "react";
import "./freshPlans.css";

const CHECKOUT_TRACE_MARKER = "checkout-return-current-plan-v32";
const LIVE_BACKEND = "https://grassley-backend.onrender.com";

const accountingAddonText = "Accounting Sync Add-on — $39/month + GST (MYOB or Xero, where available)";

const plans = [
  {
    id: "start",
    backendPlan: "solo",
    name: "Start",
    price: 39,
    tag: "Starter",
    headline: "Get organised",
    summary: "For a solo operator who needs jobs, clients, quotes and invoices under control.",
    limit: "Best for one owner",
    features: ["Jobs, clients, quotes and invoices", "Business Pulse basics", "Business settings and GST", accountingAddonText],
  },
  {
    id: "crew",
    backendPlan: "team",
    name: "Crew",
    price: 89,
    tag: "Growing team",
    headline: "Run the crew",
    summary: "For a business with workers, daily dispatch, job handover and more client admin.",
    limit: "Up to 5 workers",
    features: ["Everything in Start", "Team and worker setup", "Dispatch-ready workflow", "More job and client capacity", accountingAddonText],
  },
  {
    id: "operator",
    backendPlan: "pro",
    name: "Operator",
    price: 149,
    tag: "Most Popular",
    headline: "Admin done for approval",
    summary: "Where Churvox starts preparing the admin and you approve the work before it goes out.",
    limit: "Recommended plan",
    features: ["AI Operator Actions", "Command approval desk", "Quote follow-up watch", "Invoice and job admin prepared for approval", accountingAddonText],
  },
  {
    id: "command",
    backendPlan: "enterprise",
    name: "Command",
    price: 299,
    tag: "Full control",
    headline: "Scale with control",
    summary: "For the bigger business that wants payroll workspace, one accounting sync option included and advanced control.",
    limit: "Up to 50 active team members",
    features: ["Everything in Operator", "Includes one accounting sync option — MYOB or Xero, where available", "Payroll workspace", "Advanced roles", "Priority support", "Command Growth Pack available"],
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

function money(value) {
  return `$${Number(value || 0).toFixed(0)}`;
}

function authToken() {
  try {
    return window.localStorage.getItem("token") || window.localStorage.getItem("authToken") || window.localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function uiPlanFromBackend(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw || raw === "none" || raw === "null" || raw === "undefined") return "";
  return backendToUiPlan[raw] || "";
}

function planByUiId(id) {
  return plans.find((plan) => plan.id === id) || plans[2];
}

function firstCheckoutUrl(body) {
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

async function readBody(response) {
  const text = await response.text();
  if (!text.trim()) {
    return {
      success: false,
      detail: `Empty response from ${response.url || "checkout endpoint"}`,
      status: response.status,
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      detail: `Non-JSON response from checkout endpoint (${response.status})`,
      status: response.status,
      body: text.slice(0, 500),
    };
  }
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = await readBody(response);
  return { response, body };
}

function errorFrom(body, response) {
  return (
    body?.detail ||
    body?.error ||
    body?.message ||
    body?.data?.detail ||
    body?.data?.error ||
    `Checkout failed with status ${response?.status || body?.status || "unknown"}`
  );
}

export default function FreshPlans({ onNavigate }) {
  const [currentPlan, setCurrentPlan] = React.useState("");
  const [selectedPlan, setSelectedPlan] = React.useState("operator");
  const [growthPacks, setGrowthPacks] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [notice, setNotice] = React.useState("Loading plan");
  const [error, setError] = React.useState("");
  const [debug, setDebug] = React.useState(null);

  const selected = planByUiId(selectedPlan);
  const current = currentPlan ? planByUiId(currentPlan) : null;
  const commandSelected = selected.id === "command";
  const growthTotal = commandSelected ? growthPacks * 99 : 0;
  const monthlyTotal = selected.price + growthTotal;
  const showDebug = React.useMemo(() => {
    try {
      return new URLSearchParams(window.location.search || "").get("debug") === "1";
    } catch {
      return false;
    }
  }, []);

  const loadPlan = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = authToken();
      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const { response, body } = await apiRequest("/api/billing/subscription-status", {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!response.ok || body?.success === false) {
        throw new Error(errorFrom(body, response));
      }

      const data = body?.data && typeof body.data === "object" ? body.data : body;
      const uiPlan = uiPlanFromBackend(data?.plan);
      setCurrentPlan(uiPlan);
      if (uiPlan) setSelectedPlan(uiPlan);
      setNotice(uiPlan ? "Loaded from billing profile" : "No plan chosen yet");
      setDebug((previous) => ({ ...(previous || {}), status: { status: response.status, body: data } }));
    } catch (err) {
      setNotice("Plan needs attention");
      setError(err?.message || "Plan could not load from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search || "");
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");

    if (checkout === "cancelled" || params.get("canceled") || params.get("cancelled")) {
      setNotice("Stripe checkout cancelled");
      window.history.replaceState(null, "", "/plans");
      return;
    }

    if (checkout === "success" && sessionId) {
      setNotice("Stripe checkout returned. Confirming plan now.");
      confirmCheckout(sessionId, params.get("plan") || selected.backendPlan, params.get("country") || "NZ");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmCheckout(sessionId, plan, country) {
    try {
      const token = authToken();
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const { response, body } = await apiRequest("/api/billing/confirm-checkout", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ session_id: sessionId, plan, country }),
      });

      if (!response.ok || body?.success === false) {
        throw new Error(errorFrom(body, response));
      }

      const confirmedPlan = uiPlanFromBackend(body?.plan || body?.data?.plan || plan);
      if (confirmedPlan) {
        setCurrentPlan(confirmedPlan);
        setSelectedPlan(confirmedPlan);
      }
      window.history.replaceState(null, "", "/plans");
      window.dispatchEvent(new Event("churvox-auth-refresh"));
      setNotice("Stripe checkout saved. Current plan updated.");
      setDebug((previous) => ({ ...(previous || {}), confirm: { status: response.status, body } }));
      loadPlan();
    } catch (err) {
      setNotice("Checkout needs attention");
      setError(err?.message || "Stripe checkout could not be saved.");
    }
  }

  function choosePlan(planId) {
    setSelectedPlan(planId);
    if (planId !== "command") setGrowthPacks(0);
    setError("");
  }

  async function tryCheckoutEndpoint(url, payload, token) {
    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const { response, body } = await apiRequest(url, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(payload),
    });

    const urlFromBody = firstCheckoutUrl(body);
    return {
      ok: response.ok && body?.success !== false && Boolean(urlFromBody),
      checkoutUrl: urlFromBody,
      status: response.status,
      body,
      endpoint: url,
    };
  }

  async function startCheckout() {
    setCheckoutLoading(true);
    setError("");
    setDebug(null);
    setNotice("Opening Stripe checkout");

    const token = authToken();
    const payload = {
      plan: selected.backendPlan,
      plan_type: selected.backendPlan,
      country: "NZ",
      billing_country: "NZ",
      source: "fresh_plans_checkout_return_v32",
    };

    try {
      const attempts = [];

      attempts.push(await tryCheckoutEndpoint("/api/billing/create-checkout-session", payload, token));
      if (!attempts[0].ok) {
        attempts.push(await tryCheckoutEndpoint(`${LIVE_BACKEND}/api/billing/create-checkout-session`, payload, token));
      }

      setDebug({ attempts });

      const success = attempts.find((attempt) => attempt.ok);
      if (!success) {
        const last = attempts[attempts.length - 1];
        throw new Error(errorFrom(last?.body, { status: last?.status }));
      }

      window.location.assign(success.checkoutUrl);
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
    ["Command", "Scale", "One accounting sync option, payroll and advanced roles"],
  ];

  return (
    <section className="freshPricingPage" data-checkout-trace={CHECKOUT_TRACE_MARKER}>
      <header className="freshPricingHero">
        <div>
          <span>Churvox pricing</span>
          <h1>Pick the plan that fits how much admin you want Churvox to handle.</h1>
          <p>Simple monthly pricing + GST. Churvox does the admin. You approve.</p>
          <div className="freshPricingHeroActions">
            <button className="freshPrimary" type="button" onClick={() => choosePlan("operator")}>See recommended plan</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("support")}>Need help setting up?</button>
          </div>
        </div>

        <aside>
          <small>Current plan</small>
          <strong>{loading ? "Loading..." : current ? current.name : "No plan chosen"}</strong>
          <p>{notice}</p>
        </aside>
      </header>

      <section className="freshPlanNotice proper">
        <b>Launch pricing locked</b>
        <span>Start $39 · Crew $89 · Operator $149 · Command $299. Accounting Sync Add-on — $39/month + GST. MYOB or Xero, where available.</span>
      </section>

      <section className="freshPlanNotice proper">
        <b>Owner-approved money actions</b>
        <span>Invoices stay draft-only until approved. Accounting sync is owner-approved. Churvox does not auto-send invoices, mark paid, file tax or create bank payout files.</span>
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
            <button type="button" key={plan.id} className={`freshPricingCard ${active ? "active" : ""} ${plan.id === "operator" ? "best" : ""}`} onClick={() => choosePlan(plan.id)}>
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
          <h2>Start your 14-day trial</h2>
          <p>Stripe opens securely, then Churvox confirms the session and updates this Current plan box from the billing profile.</p>

          <div className="freshActions">
            <button className="freshDark" type="button" onClick={startCheckout} disabled={checkoutLoading}>{checkoutLoading ? "Opening Stripe..." : "Start Stripe checkout"}</button>
            <button className="freshOrange" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button>
            <button className="freshGhost" type="button" onClick={loadPlan}>Reload current plan</button>
          </div>

          <div className="freshItem"><b>Best default</b><span>Operator is the main plan because AI prepares the admin and the owner approves.</span></div>
          <div className="freshItem"><b>Accounting sync</b><span>{selected.id === "command" ? "Command includes one accounting sync option — MYOB or Xero, where available." : accountingAddonText}</span></div>
          <div className="freshItem need"><b>Command scale</b><span>Command includes up to 50 active team members. Inactive old staff should not count as billable.</span></div>
        </aside>
      </section>

      {showDebug && debug && (
        <section className="freshCard freshNotice" style={{ marginTop: 14 }}>
          <b>Checkout diagnostic</b>
          <span style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12 }}>{JSON.stringify(debug, null, 2).slice(0, 1800)}</span>
        </section>
      )}

      <section className="freshCard freshCompareCard">
        <h2>Simple comparison</h2>
        <div className="freshCompareGrid">
          {planComparison.map(([name, fit, value]) => <div key={name}><b>{name}</b><span>{fit}</span><p>{value}</p></div>)}
        </div>
      </section>
    </section>
  );
}
