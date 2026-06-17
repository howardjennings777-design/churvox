import React from "react";
import "./freshPlans.css";
import API_BASE from "../lib/apiBase";
import { useAuth } from "../context/AuthContext";

const CHECKOUT_TRACE_MARKER = "checkout-return-current-plan-v35-form-redirect-auth-recover";
const LIVE_BACKEND = API_BASE || "https://grassley-backend.onrender.com";

const accountingAddonText = "Accounting Sync Add-on — $39/month + GST (MYOB or Xero, where available)";

const addOns = [
  {
    id: "accounting_sync",
    name: "Accounting Sync Add-on",
    price: 39,
    summary: "Connect invoices to MYOB or Xero, where available. Owner-approved draft sync only.",
    forPlans: "Available on Start, Crew and Operator. Included with Command.",
  },
  {
    id: "command_growth_pack",
    name: "Command Growth Pack",
    price: 99,
    summary: "Adds 50 active team members plus extra job, AI action, automation and admin capacity.",
    forPlans: "Available on Command.",
  },
];

const plans = [
  {
    id: "start",
    backendPlan: "solo",
    name: "Start",
    price: 39,
    tag: "Solo",
    headline: "Get the work under control",
    summary: "For one owner who wants jobs, clients, quotes and invoices in one place.",
    limit: "Best for one owner",
    includes: [
      "Jobs and client records",
      "Quotes and draft invoices",
      "Today view",
      "Schedule board",
      "Business setup and GST basics",
      "Email-ready customer records",
    ],
    addOns: [accountingAddonText],
  },
  {
    id: "crew",
    backendPlan: "team",
    name: "Crew",
    price: 89,
    tag: "Team",
    headline: "Run the crew",
    summary: "For a small team that needs workers, schedule visibility and cleaner handover.",
    limit: "Up to 5 workers",
    includes: [
      "Everything in Start",
      "Worker app access",
      "Team invites and worker setup",
      "Schedule and dispatch workflow",
      "Time capture workspace",
      "More job and client capacity",
    ],
    addOns: [accountingAddonText],
  },
  {
    id: "operator",
    backendPlan: "pro",
    name: "Operator",
    price: 149,
    tag: "Recommended",
    headline: "Churvox prepares the admin",
    summary: "For owners who want Churvox to prepare jobs, quotes, invoices and follow-ups for approval.",
    limit: "Best default plan",
    includes: [
      "Everything in Crew",
      "Tell Churvox",
      "AI Operator Actions",
      "Review approval desk",
      "Quote and invoice admin prepared",
      "Follow-up watch",
    ],
    addOns: [accountingAddonText],
  },
  {
    id: "command",
    backendPlan: "enterprise",
    name: "Command",
    price: 299,
    tag: "Scale",
    headline: "Full control at scale",
    summary: "For the bigger business that wants AI approval control, payroll workspace and accounting sync included.",
    limit: "Up to 50 active team members",
    includes: [
      "Everything in Operator",
      "One accounting sync option included — MYOB or Xero, where available",
      "Payroll workspace",
      "Advanced roles",
      "Priority support",
      "Command Growth Pack available",
    ],
    addOns: ["Command Growth Pack — $99/month + GST"],
  },
];

plans.forEach((plan) => {
  plan.features = plan.includes;
});

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

function authToken(user) {
  if (user?.token) return user.token;
  try {
    return window.localStorage.getItem("token") || window.localStorage.getItem("authToken") || window.localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function backendUrl(path) {
  const base = String(LIVE_BACKEND || "").replace(/\/+$/, "");
  const cleanPath = String(path || "").replace(/^\/+/, "");
  if (/^https?:\/\//i.test(path)) return path;
  if (!base) return `/${cleanPath}`;
  return `${base}/api/${cleanPath.replace(/^api\//i, "")}`;
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
      detail: `Non-JSON response from backend endpoint (${response.status}). Churvox expected billing JSON but received a website page.`,
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

function userFromMe(data = {}) {
  const picked = data?.user || data?.data?.user || data?.data || data || {};
  if (!picked || typeof picked !== "object") return null;
  if (!(picked.email || picked.id || picked._id || picked.role || picked.business_id || picked.businessId)) return null;
  return picked;
}


function postCheckoutForm({ token, plan, country, accountingSync = false, growthPacks = 0 }) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = backendUrl("/billing/start-checkout-form");
  form.style.display = "none";

  const fields = {
    token,
    plan,
    ui_plan: plan,
    country: country || "NZ",
    accounting_sync: accountingSync ? "1" : "",
    growth_packs: growthPacks || 0,
    addons: JSON.stringify({ accounting_sync: Boolean(accountingSync), growth_packs: Number(growthPacks || 0) }),
    source: "fresh_plans_form_redirect_v35",
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value || "");
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

export default function FreshPlans({ onNavigate }) {
  const { user, loading: authLoading, updateUser } = useAuth();
  const [currentPlan, setCurrentPlan] = React.useState("");
  const [selectedPlan, setSelectedPlan] = React.useState("operator");
  const [growthPacks, setGrowthPacks] = React.useState(0);
  const [accountingSync, setAccountingSync] = React.useState(false);
  const [accountingSync, setAccountingSync] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [notice, setNotice] = React.useState("Loading account");
  const [error, setError] = React.useState("");
  const [debug, setDebug] = React.useState(null);

  const selected = planByUiId(selectedPlan);
  const current = currentPlan ? planByUiId(currentPlan) : null;
  const commandSelected = selected.id === "command";
  const growthTotal = commandSelected ? growthPacks * 99 : 0;
  const accountingAddonTotal = !commandSelected && accountingSync ? 39 : 0;
  const monthlyTotal = selected.price + growthTotal + accountingAddonTotal;
  const accountingIncluded = commandSelected;
  const accountingSelected = accountingIncluded || accountingSync;
  const showDebug = React.useMemo(() => {
    try {
      return new URLSearchParams(window.location.search || "").get("debug") === "1";
    } catch {
      return false;
    }
  }, []);

  const recoverCurrentUser = React.useCallback(async () => {
    const token = authToken(user);
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const { response, body } = await apiRequest(backendUrl("/auth/me"), {
      method: "GET",
      credentials: "include",
      headers,
    });

    if (!response.ok || body?.success === false) {
      throw new Error(errorFrom(body, response));
    }

    const recovered = userFromMe(body);
    if (recovered) {
      updateUser?.(recovered);
    }
    return { user: recovered || user, token: authToken(recovered || user) };
  }, [user, updateUser]);

  const loadPlan = React.useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      setNotice("Loading account");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const session = await recoverCurrentUser();
      const token = session.token;
      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const { response, body } = await apiRequest(backendUrl("/billing/subscription-status"), {
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
      setDebug((previous) => ({ ...(previous || {}), status: { endpoint: backendUrl("/billing/subscription-status"), status: response.status, body: data } }));
    } catch (err) {
      const message = err?.message || "Plan could not load from backend.";
      if (/not authenticated|401|403/i.test(message)) {
        setNotice("Sign in to load plan");
      } else {
        setNotice("Plan needs attention");
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [authLoading, recoverCurrentUser]);

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
      const session = await recoverCurrentUser();
      const token = session.token;
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const { response, body } = await apiRequest(backendUrl("/billing/confirm-checkout"), {
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
      setDebug((previous) => ({ ...(previous || {}), confirm: { endpoint: backendUrl("/billing/confirm-checkout"), status: response.status, body } }));
      loadPlan();
    } catch (err) {
      setNotice("Checkout needs attention");
      setError(err?.message || "Stripe checkout could not be saved.");
    }
  }

  function choosePlan(planId) {
    setSelectedPlan(planId);
    if (planId !== "command") setGrowthPacks(0);
    if (planId === "command") setAccountingSync(false);
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
    if (authLoading) {
      setNotice("Loading account");
      return;
    }

    setCheckoutLoading(true);
    setError("");
    setDebug(null);
    setNotice("Opening Stripe checkout");

    try {
      const session = await recoverCurrentUser();
      const token = session.token;

      if (!token) {
        throw new Error("Checkout token missing. Please sign in again.");
      }

      postCheckoutForm({ token, plan: selected.backendPlan, country: "NZ", accountingSync: accountingSelected, growthPacks });
    } catch (err) {
      setNotice("Checkout needs attention");
      setError(err?.message || "Stripe checkout could not be opened.");
      setCheckoutLoading(false);
    }
  }

  const selectedIncludes = selected.includes || selected.features || [];
  const selectedAddOns = selected.addOns || [];
  const selectedIncludes = selected.includes || selected.features || [];
  const selectedAddOns = selected.addOns || [];
  const planComparison = [
    ["Start", "Solo owner", "Run jobs, clients, quotes and invoices."],
    ["Crew", "Small team", "Add workers, schedule flow and team handover."],
    ["Operator", "Recommended", "AI prepares admin. You approve."],
    ["Command", "Bigger crew", "Accounting sync included, payroll workspace and scale controls."],
  ];

  return (
    <section className="freshPricingPage freshPricingPageV2" data-checkout-trace={CHECKOUT_TRACE_MARKER}>
      <header className="freshPricingHero freshPricingHeroV2">
        <div>
          <span>Churvox pricing</span>
          <h1>Choose how much admin Churvox handles.</h1>
          <p>Start simple, add crew tools when you need them, then move into AI prepared admin when you are ready. You stay in control — Churvox prepares, you approve.</p>
          <div className="freshPricingHeroActions">
            <button className="freshPrimary" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("support")}>Ask which plan fits</button>
          </div>
        </div>

        <aside className="freshCurrentPlanBox">
          <small>Current plan</small>
          <strong>{loading ? "Loading..." : current ? current.name : "No plan chosen"}</strong>
          <p>{notice}</p>
          {current ? <button type="button" onClick={() => choosePlan(current.id)}>View current plan</button> : null}
        </aside>
      </header>

      <section className="freshPlanNotice proper freshPlanNoticeV2">
        <b>14-day trial</b>
        <span>Start testing Churvox with real jobs, clients, quotes and invoices. Billing actions stay owner-approved.</span>
      </section>

      <section className="freshPlanNotice proper freshPlanNoticeV2">
        <b>Safe money rules</b>
        <span>Invoices stay draft-only until approved. Accounting sync is owner-approved. Churvox does not auto-send invoices, mark paid, file tax or create bank payout files.</span>
      </section>

      {error && !/not authenticated|401|403/i.test(error) && (
        <section className="freshCard freshNotice need">
          <b>Plans need attention</b>
          <span>{error}</span>
        </section>
      )}

      <section className="freshPricingCards freshPricingCardsV2">
        {plans.map((plan) => {
          const active = selectedPlan === plan.id;
          const isCurrent = Boolean(currentPlan) && currentPlan === plan.id;

          return (
            <button type="button" key={plan.id} className={`freshPricingCard freshPricingCardV2 ${active ? "active" : ""} ${plan.id === "operator" ? "best" : ""}`} onClick={() => choosePlan(plan.id)}>
              <span className="freshPlanTag">{plan.tag}</span>
              {isCurrent && <span className="freshCurrentBadge">Current</span>}
              <strong>{plan.name}</strong>
              <em>{money(plan.price)}<small>/month + GST</small></em>
              <h3>{plan.headline}</h3>
              <p>{plan.summary}</p>
              <small className="freshPlanLimit">{plan.limit}</small>
              <div className="freshPlanIncludedTitle">Included</div>
              <ul>{plan.includes.slice(0, 6).map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
            </button>
          );
        })}
      </section>

      <section className="freshPricingDetail freshPricingDetailV2">
        <section className="freshCard freshSelectedPlanCard freshSelectedPlanCardV2">
          <div className="freshSelectedPlanTop">
            <div>
              <span>Selected plan</span>
              <h2>{selected.name}</h2>
              <p>{selected.summary}</p>
            </div>
            <strong>{money(monthlyTotal)}<small>/month + GST</small></strong>
          </div>

          <div className="freshPlanBreakdown">
            <div><b>Base plan</b><span>{selected.name}</span><strong>{money(selected.price)}</strong></div>
            <div><b>Accounting sync</b><span>{accountingIncluded ? "Included with Command" : accountingSync ? "Add-on selected" : "Optional add-on"}</span><strong>{accountingAddonTotal ? money(accountingAddonTotal) : accountingIncluded ? "Included" : "$39"}</strong></div>
            <div><b>Growth packs</b><span>{commandSelected ? `${growthPacks} selected` : "Only for Command"}</span><strong>{growthTotal ? money(growthTotal) : "$0"}</strong></div>
          </div>

          <section className="freshPlanSection">
            <h3>What you get on {selected.name}</h3>
            <div className="freshPlanFeatures premium">
              {selectedIncludes.map((feature) => <div key={feature}><b>✓</b><span>{feature}</span></div>)}
            </div>
          </section>

          <section className="freshPlanSection">
            <h3>Add-ons</h3>
            <div className="freshAddOnGrid">
              <button
                type="button"
                className={`freshAddOnCard ${accountingSelected ? "active" : ""}`}
                onClick={() => {
                  if (!accountingIncluded) setAccountingSync((value) => !value);
                }}
              >
                <b>Accounting Sync Add-on</b>
                <span>{accountingIncluded ? "Included with Command" : "$39/month + GST"}</span>
                <p>MYOB or Xero, where available. Owner-approved draft invoice sync only.</p>
              </button>

              <button
                type="button"
                className={`freshAddOnCard ${commandSelected ? "active" : "locked"}`}
                onClick={() => {
                  if (!commandSelected) choosePlan("command");
                }}
              >
                <b>Command Growth Pack</b>
                <span>$99/month + GST</span>
                <p>Adds 50 active team members plus extra job, AI action, automation and admin capacity.</p>
              </button>
            </div>

            {commandSelected && (
              <div className="freshGrowthPack premium freshGrowthPackV2">
                <div>
                  <b>Command Growth Pack</b>
                  <span>Command includes 50 active team members. Each pack adds 50 more active team members.</span>
                </div>
                <div className="freshGrowthControls">
                  <button type="button" onClick={() => setGrowthPacks((count) => Math.max(0, count - 1))}>−</button>
                  <strong>{growthPacks}</strong>
                  <button type="button" onClick={() => setGrowthPacks((count) => count + 1)}>+</button>
                </div>
              </div>
            )}
          </section>
        </section>

        <aside className="freshCard freshCheckoutCard freshCheckoutCardV2">
          <span>Buy / update</span>
          <h2>{selected.name}</h2>
          <strong>{money(monthlyTotal)}<small>/month + GST</small></strong>
          <p>Stripe opens securely. Churvox then confirms the session and updates your current plan from billing.</p>

          <div className="freshActions">
            <button className="freshDark" type="button" onClick={startCheckout} disabled={checkoutLoading || authLoading}>{checkoutLoading ? "Opening Stripe..." : "Buy selected plan"}</button>
            <button className="freshOrange" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button>
            <button className="freshGhost" type="button" onClick={loadPlan} disabled={authLoading}>Reload current plan</button>
          </div>

          <div className="freshItem"><b>Selected total</b><span>{selected.name} {accountingSync && !commandSelected ? "+ Accounting Sync" : ""} {growthPacks ? `+ ${growthPacks} Growth Pack${growthPacks === 1 ? "" : "s"}` : ""}</span></div>
          <div className="freshItem"><b>Best default</b><span>Operator is the main plan because AI prepares the admin and the owner approves.</span></div>
          <div className="freshItem need"><b>Command scale</b><span>Command includes up to 50 active team members. Inactive old staff should not count as billable.</span></div>
        </aside>
      </section>

      {showDebug && debug && (
        <section className="freshCard freshNotice" style={{ marginTop: 14 }}>
          <b>Checkout diagnostic</b>
          <span style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12 }}>{JSON.stringify(debug, null, 2).slice(0, 1800)}</span>
        </section>
      )}

      <section className="freshCard freshCompareCard freshCompareCardV2">
        <h2>Simple comparison</h2>
        <div className="freshCompareGrid">
          {planComparison.map(([name, fit, value]) => <div key={name}><b>{name}</b><span>{fit}</span><p>{value}</p></div>)}
        </div>
      </section>
    </section>
  );
}