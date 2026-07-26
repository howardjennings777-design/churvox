import React from "react";
import "./freshPlansClean.css";
import API_BASE from "../lib/apiBase";
import { useAuth } from "../context/AuthContext";
import {
  COUNTRY_OPTIONS,
  addonPriceForCountry,
  detectCountryCode,
  getCountryMeta,
  normalizeCountry,
  pricePlanForCountry,
} from "../config/churvoxPlans";
import { PLAN_FEATURE_MATRIX } from "./planRules";

const CHECKOUT_TRACE_MARKER = "clean-isolated-plans-no-auto-refresh-v46";
const LIVE_BACKEND = API_BASE || "https://grassley-backend.onrender.com";
const PLAN_CACHE_KEY = "churvox:stable-current-plan:v1";
const PLAN_OVERRIDE_KEY = "churvox:plan-override";
const COUNTRY_CACHE_KEY = "churvox:billing-country";
const PENDING_CHECKOUT_KEY = "churvox:pending-checkout:v1";
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const accountingAddonText = "Xero Sync Add-on — $39/month + GST";

const plans = [
  {
    id: "start",
    backendPlan: "solo",
    name: "Start",
    tag: "Solo",
    headline: "Simple on the surface. Powerful underneath.",
    summary: "For one owner who wants jobs, recurring work, clients, quotes and invoices in one clean place.",
    limit: "50 jobs/month · recurring jobs · 1 owner + 1 helper",
    includes: ["Jobs, clients, quotes and invoices", "Recurring jobs included", "Smart Hub", "250 clients", "50 jobs/month", "Xero Sync Add-on available"],
    limits: { workers: 1, clients: 250, jobs_month: 50, ai_actions_month: 25 },
  },
  {
    id: "crew",
    backendPlan: "team",
    name: "Crew",
    tag: "Team",
    headline: "Run the crew",
    summary: "For a small team that needs worker proof, messages, time approval and cleaner handover.",
    limit: "150 jobs/month · 5 active team members · 100 AI actions",
    includes: ["Everything in Start", "Team and worker app", "Messages", "Worker proof and time", "5 active team members", "Xero Sync Add-on available"],
    limits: { workers: 5, clients: 1000, jobs_month: 150, ai_actions_month: 100 },
  },
  {
    id: "operator",
    backendPlan: "pro",
    name: "Operator",
    tag: "Recommended",
    headline: "Churvox prepares the admin",
    summary: "For owners who want Churvox to prepare admin, follow-ups and approval work.",
    limit: "500 jobs/month · 15 active team members · 500 AI actions",
    includes: ["Everything in Crew", "Command Approval System", "AI prepared admin", "Payroll summaries", "Approval Memory", "Customer Follow-Up Brain"],
    limits: { workers: 15, clients: 3000, jobs_month: 500, ai_actions_month: 500 },
  },
  {
    id: "command",
    backendPlan: "enterprise",
    name: "Command",
    tag: "Scale",
    headline: "Full control at scale",
    summary: "For the bigger business that wants AI approval control, payroll workspace and accounting sync included.",
    limit: "1,500 jobs/month · 50 active team members · 2,000 AI actions",
    includes: ["Everything in Operator", "Full Command control", "Xero sync included", "50 active team members", "Advanced approval memory", "Command Growth Pack available"],
    limits: { workers: 50, clients: 10000, jobs_month: 1500, ai_actions_month: 2000 },
  },
];

const backendToUiPlan = { solo: "start", team: "crew", pro: "operator", enterprise: "command", start: "start", crew: "crew", operator: "operator", command: "command" };

function uiPlanFromBackend(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw || raw === "none" || raw === "null" || raw === "undefined") return "";
  return backendToUiPlan[raw] || "";
}

function planById(id) {
  return plans.find((plan) => plan.id === id) || plans[2];
}

function planFromUser(user) {
  return uiPlanFromBackend(user?.ui_plan || user?.current_plan || user?.plan || user?.subscription_plan || user?.billing_plan || user?.tier || user?.plan_name || user?.business?.plan || user?.business?.subscription_plan);
}

function money(value, countryCode = "NZ") {
  const country = getCountryMeta(countryCode);
  return `${country.symbol}${Number(value || 0).toFixed(0)}`;
}

function readCountry() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return normalizeCountry(params.get("country") || window.localStorage.getItem(COUNTRY_CACHE_KEY) || detectCountryCode());
  } catch {
    return detectCountryCode();
  }
}

function readCachedPlan() {
  try {
    return uiPlanFromBackend(window.localStorage.getItem(PLAN_CACHE_KEY) || "");
  } catch {
    return "";
  }
}

function saveCachedPlan(planId) {
  const clean = uiPlanFromBackend(planId);
  if (!clean) return;
  try {
    window.localStorage.setItem(PLAN_CACHE_KEY, clean);
    window.localStorage.removeItem(PLAN_OVERRIDE_KEY);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("churvox:plan-updated", { detail: { plan: clean, source: "plans-clean" } }));
  } catch {}
}

function savePendingCheckout(data = {}) {
  try {
    window.localStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({ ...data, saved_at: Date.now() }));
  } catch {}
}

function readPendingCheckout() {
  try {
    const raw = window.localStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || Date.now() - Number(data.saved_at || 0) > PENDING_MAX_AGE_MS) {
      window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearPendingCheckout() {
  try {
    window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {}
}

function backendUrl(path) {
  const base = String(LIVE_BACKEND || "").replace(/\/+$/, "");
  const cleanPath = String(path || "").replace(/^\/+/, "");
  if (/^https?:\/\//i.test(path)) return path;
  if (!base) return `/${cleanPath}`;
  return `${base}/api/${cleanPath.replace(/^api\//i, "")}`;
}

function authToken(user) {
  if (user?.token) return user.token;
  try {
    return window.localStorage.getItem("token") || window.localStorage.getItem("authToken") || window.localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function readBody(response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, detail: `Backend returned non-JSON (${response.status}).` };
  }
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = await readBody(response);
  return { response, body };
}

function errorFrom(body, response) {
  return body?.detail || body?.error || body?.message || `Request failed with status ${response?.status || "unknown"}`;
}

function firstCheckoutUrl(body) {
  return body?.url || body?.checkout_url || body?.checkoutUrl || body?.session_url || body?.stripe_url || body?.redirect_url || body?.data?.url || body?.data?.checkout_url || body?.session?.url || "";
}

function saveAddonActivation(addon, quantity = 1) {
  try {
    const key = String(addon || "").toLowerCase();
    if (["xero_addon", "xero", "accounting_sync", "accounting-sync"].includes(key)) window.localStorage.setItem("churvox:addon:accounting_sync", "true");
    if (key === "command_growth_pack") window.localStorage.setItem("churvox:addon:command_growth_pack", String(Math.max(1, Number(quantity || 1))));
  } catch {}
}

function allowanceRows(plan, packs = 0) {
  const limits = { ...(plan?.limits || plans[2].limits) };
  const safePacks = plan?.id === "command" ? Math.max(0, Number(packs || 0)) : 0;
  if (safePacks > 0) {
    limits.workers += safePacks * 50;
    limits.jobs_month += safePacks * 1500;
    limits.ai_actions_month += safePacks * 1000;
  }
  return [
    ["Active workers", limits.workers],
    ["Clients", limits.clients],
    ["Jobs/month", limits.jobs_month],
    ["AI actions/month", limits.ai_actions_month],
  ];
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
    packs: growthPacks || 0,
    source: "fresh_plans_clean_v46",
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

function postAddonCheckout({ token, addon, country, quantity = 1 }) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const safeQuantity = Math.max(1, Number(quantity || 1));
  return apiRequest(backendUrl("/billing/create-addon-checkout-session"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ addon, addon_key: addon, country: country || "NZ", quantity: safeQuantity, growth_packs: addon === "command_growth_pack" ? safeQuantity : 0, packs: addon === "command_growth_pack" ? safeQuantity : 0 }),
  }).then(({ response, body }) => {
    const checkoutUrl = firstCheckoutUrl(body);
    if (!response.ok || body?.success === false || !checkoutUrl) throw new Error(errorFrom(body, response));
    window.location.href = checkoutUrl;
  });
}

export default function FreshPlans({ onNavigate }) {
  const { user, loading: authLoading, updateUser } = useAuth();
  const loadingRef = React.useRef(false);
  const [currentPlan, setCurrentPlan] = React.useState(() => readCachedPlan());
  const [selectedPlan, setSelectedPlan] = React.useState(() => readCachedPlan() || "operator");
  const [country, setCountry] = React.useState(readCountry);
  const [growthPacks, setGrowthPacks] = React.useState(0);
  const [accountingSync, setAccountingSync] = React.useState(false);
  const [checkingPlan, setCheckingPlan] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [notice, setNotice] = React.useState(() => (readCachedPlan() ? "Showing saved plan." : "Choose a plan to continue."));
  const [error, setError] = React.useState("");
  const [debug, setDebug] = React.useState(null);

  React.useEffect(() => {
    try { window.localStorage.setItem(COUNTRY_CACHE_KEY, country); } catch {}
  }, [country]);

  const pricedPlans = React.useMemo(() => plans.map((plan) => {
    const priced = pricePlanForCountry(plan.backendPlan, country);
    return { ...plan, price: priced.monthly, priceLabel: priced.priceLabel, taxInclusiveLabel: priced.taxInclusiveLabel, taxLabel: priced.taxLabel };
  }), [country]);

  const countryMeta = getCountryMeta(country);
  const pricedAccountingAddon = React.useMemo(() => addonPriceForCountry("accounting_sync", country), [country]);
  const pricedGrowthPack = React.useMemo(() => addonPriceForCountry("command_growth_pack", country), [country]);
  const userPlan = planFromUser(user);
  const displayPlan = currentPlan || userPlan;
  const selected = pricedPlans.find((plan) => plan.id === selectedPlan) || pricedPlans[2];
  const current = displayPlan ? pricedPlans.find((plan) => plan.id === displayPlan) || null : null;
  const commandSelected = selected.id === "command";
  const samePlanSelected = Boolean(displayPlan) && selected.id === displayPlan;
  const accountingIncluded = commandSelected;
  const accountingSelected = accountingIncluded || accountingSync;
  const growthTotal = commandSelected ? growthPacks * pricedGrowthPack.monthly : 0;
  const accountingAddonTotal = !commandSelected && accountingSync ? pricedAccountingAddon.monthly : 0;
  const basePlanCheckoutTotal = samePlanSelected ? 0 : selected.price;
  const monthlyTotal = basePlanCheckoutTotal + growthTotal + accountingAddonTotal;
  const noCheckoutChange = samePlanSelected && monthlyTotal === 0;
  const addonOnlyGrowthCheckout = samePlanSelected && commandSelected && growthPacks > 0;
  const addonOnlyAccountingCheckout = samePlanSelected && !commandSelected && accountingSync;
  const checkoutLabel = addonOnlyGrowthCheckout ? `${growthPacks} Growth Pack${growthPacks === 1 ? "" : "s"}` : addonOnlyAccountingCheckout ? "Accounting Sync Add-on" : `${selected.name}${accountingSync && !commandSelected ? " + Accounting Sync" : ""}${growthPacks ? ` + ${growthPacks} Growth Pack${growthPacks === 1 ? "" : "s"}` : ""}`;
  const checkoutButton = noCheckoutChange ? "Current plan active" : checkoutLoading ? "Opening Stripe..." : addonOnlyGrowthCheckout || addonOnlyAccountingCheckout ? "Buy selected add-on" : "Buy selected plan";
  const selectedTotalLabel = noCheckoutChange ? "Already active" : money(monthlyTotal, country);
  const showDebug = React.useMemo(() => {
    try { return new URLSearchParams(window.location.search || "").get("debug") === "1"; } catch { return false; }
  }, []);

  function applyPlan(planId, reason = "Current plan updated.") {
    const clean = uiPlanFromBackend(planId);
    if (!clean) return false;
    setCurrentPlan(clean);
    setSelectedPlan(clean);
    saveCachedPlan(clean);
    setNotice(reason);
    return true;
  }

  const loadPlan = React.useCallback(async () => {
    if (authLoading || loadingRef.current) return;
    loadingRef.current = true;
    setCheckingPlan(true);
    setError("");
    try {
      const token = authToken(user);
      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const { response, body } = await apiRequest(backendUrl("/billing/subscription-status"), { method: "GET", credentials: "include", headers });
      if (!response.ok || body?.success === false) throw new Error(errorFrom(body, response));
      const data = body?.data && typeof body.data === "object" ? body.data : body;
      const foundPlan = uiPlanFromBackend(data?.plan || data?.current_plan || data?.subscription_plan || data?.ui_plan);
      if (foundPlan) {
        applyPlan(foundPlan, "Loaded from billing profile.");
        updateUser?.({ ...(user || {}), plan: planById(foundPlan).backendPlan, ui_plan: foundPlan, has_app_access: data?.has_app_access !== false });
      } else {
        setNotice(currentPlan || planFromUser(user) ? "Showing saved current plan." : "Choose a plan to continue.");
      }
      setDebug((previous) => ({ ...(previous || {}), status: { endpoint: backendUrl("/billing/subscription-status"), status: response.status, body: data } }));
    } catch (err) {
      const message = err?.message || "Plan could not load from backend.";
      setNotice(currentPlan || planFromUser(user) ? "Showing saved current plan." : "Choose a plan to continue.");
      setError(message);
    } finally {
      loadingRef.current = false;
      setCheckingPlan(false);
    }
  }, [authLoading, currentPlan, updateUser, user]);

  React.useEffect(() => {
    const fromUser = planFromUser(user);
    if (fromUser && fromUser !== currentPlan) applyPlan(fromUser, "Loaded from account profile.");
  }, [currentPlan, user]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search || "");
    const sessionId = params.get("session_id");
    const pending = readPendingCheckout();
    if (params.get("checkout") === "cancelled" || params.get("canceled") || params.get("cancelled") || params.get("addon_cancelled")) {
      clearPendingCheckout();
      setNotice("Stripe checkout cancelled.");
      window.history.replaceState(null, "", "/plans");
      return;
    }
    if (params.get("addon_success") && sessionId) {
      confirmAddonCheckout(sessionId, params.get("addon") || pending?.addon || "", Number(params.get("quantity") || pending?.quantity || 1), params.get("country") || pending?.country || "NZ");
      return;
    }
    if (params.get("checkout") === "success" && sessionId) {
      confirmCheckout(sessionId, params.get("plan") || pending?.plan || selected.backendPlan, params.get("country") || pending?.country || "NZ");
    }
    // Stripe return parameters must be consumed once. Re-running this effect can duplicate confirmation requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmCheckout(sessionId, plan, countryValue) {
    const pending = readPendingCheckout();
    const fallbackPlan = pending?.plan || plan;
    const pendingGrowthPacks = Number(pending?.growth_packs || pending?.packs || 0);
    const pendingAccounting = Boolean(pending?.accounting_sync);
    setCheckingPlan(true);
    try {
      const token = authToken(user);
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const { response, body } = await apiRequest(backendUrl("/billing/confirm-checkout"), {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ session_id: sessionId, plan: fallbackPlan, country: pending?.country || countryValue, accounting_sync: pendingAccounting, growth_packs: pendingGrowthPacks, packs: pendingGrowthPacks }),
      });
      if (!response.ok || body?.success === false) throw new Error(errorFrom(body, response));
      const confirmedPlan = uiPlanFromBackend(body?.plan || body?.data?.plan || body?.current_plan || body?.data?.current_plan || fallbackPlan);
      if (confirmedPlan) applyPlan(confirmedPlan, "Stripe checkout saved.");
      if (body?.accounting_sync) saveAddonActivation("xero_addon", 1);
      if (Number(body?.growth_packs || 0) > 0) saveAddonActivation("command_growth_pack", Number(body.growth_packs));
      clearPendingCheckout();
      window.history.replaceState(null, "", "/plans");
      window.dispatchEvent(new Event("churvox-auth-refresh"));
    } catch (err) {
      if (fallbackPlan && uiPlanFromBackend(fallbackPlan)) applyPlan(fallbackPlan, "Stripe returned. Showing selected plan while billing confirms.");
      setNotice("Checkout needs attention.");
      setError(err?.message || "Stripe checkout could not be saved.");
    } finally {
      setCheckingPlan(false);
    }
  }

  async function confirmAddonCheckout(sessionId, addon, quantity = 1, countryValue = "NZ") {
    const pending = readPendingCheckout();
    const safeAddon = addon || pending?.addon || "";
    const safeQuantity = Number(quantity || pending?.quantity || 1);
    setCheckingPlan(true);
    try {
      const token = authToken(user);
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const { response, body } = await apiRequest(backendUrl("/billing/confirm-addon-checkout"), {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ session_id: sessionId, addon: safeAddon, quantity: safeQuantity, country: countryValue }),
      });
      if (!response.ok || body?.success === false) throw new Error(errorFrom(body, response));
      saveAddonActivation(safeAddon, safeQuantity);
      clearPendingCheckout();
      setNotice(safeAddon === "command_growth_pack" ? "Command Growth Pack added." : "Accounting Sync Add-on activated.");
      if (safeAddon === "command_growth_pack") setGrowthPacks(0);
      if (safeAddon === "xero_addon" || safeAddon === "xero") setAccountingSync(false);
      window.history.replaceState(null, "", "/plans");
      window.dispatchEvent(new Event("churvox-auth-refresh"));
    } catch (err) {
      setNotice("Add-on checkout needs attention.");
      setError(err?.message || "Add-on checkout could not be saved.");
    } finally {
      setCheckingPlan(false);
    }
  }

  function choosePlan(planId) {
    setSelectedPlan(planId);
    if (planId !== "command") setGrowthPacks(0);
    if (planId === "command") setAccountingSync(false);
    setError("");
  }

  async function startCheckout() {
    if (authLoading) {
      setNotice("Loading account.");
      return;
    }
    setCheckoutLoading(true);
    setError("");
    setNotice("Opening Stripe checkout.");
    try {
      const token = authToken(user);
      if (!token) throw new Error("Checkout token missing. Please sign in again.");
      if (addonOnlyGrowthCheckout) {
        savePendingCheckout({ type: "addon", addon: "command_growth_pack", quantity: Number(growthPacks || 1), country, plan: selected.backendPlan, ui_plan: selected.id });
        await postAddonCheckout({ token, addon: "command_growth_pack", country, quantity: Number(growthPacks || 1) });
        return;
      }
      if (addonOnlyAccountingCheckout) {
        savePendingCheckout({ type: "addon", addon: "xero_addon", quantity: 1, country, plan: selected.backendPlan, ui_plan: selected.id });
        await postAddonCheckout({ token, addon: "xero_addon", country, quantity: 1 });
        return;
      }
      savePendingCheckout({ type: "plan", plan: selected.backendPlan, ui_plan: selected.id, country, accounting_sync: accountingSelected, growth_packs: growthPacks, packs: growthPacks });
      postCheckoutForm({ token, plan: selected.backendPlan, country, accountingSync: accountingSelected, growthPacks });
    } catch (err) {
      setNotice("Checkout needs attention.");
      setError(err?.message || "Stripe checkout could not be opened.");
      setCheckoutLoading(false);
    }
  }

  const selectedIncludes = selected.includes || [];
  const allowances = allowanceRows(current || selected, current?.id === "command" ? growthPacks : 0);

  return (
    <section className="cvPlansPage" data-checkout-trace={CHECKOUT_TRACE_MARKER}>
      <header className="cvPlanHero">
        <div>
          <span className="cvPlanKicker">Churvox pricing</span>
          <h1>Churvox does the admin. You approve.</h1>
          <p>Looks simple. Works hard underneath. Churvox prepares the admin, then you approve.</p>
          <div className="cvPlanHeroActions">
            <button className="cvPlanPrimary" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button>
            <button className="cvPlanGhost" type="button" onClick={() => onNavigate?.("support")}>Ask which plan fits</button>
          </div>
          <label className="cvPlanSelect">
            <span className="cvPlanMiniKicker">Pricing country</span>
            <select value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))}>
              {COUNTRY_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.label} · {item.currency}</option>)}
            </select>
          </label>
        </div>
        <aside className="cvPlanCurrentBox">
          <span className="cvPlanMiniKicker">Current plan</span>
          <strong>{current ? current.name : checkingPlan || authLoading ? "Checking plan" : "No plan chosen"}</strong>
          <p>{checkingPlan && current ? `${notice} Current plan stays visible.` : notice}</p>
          {current ? <button type="button" onClick={() => choosePlan(current.id)}>View current plan</button> : <button type="button" onClick={() => loadPlan()}>Reload current plan</button>}
        </aside>
      </header>

      <section className="cvPlanNotice"><b>14-day free trial</b><span>No card. Billing stays owner-approved.</span></section>
      <section className="cvPlanNotice"><b>Safe money rules</b><span>Invoices and Xero sync stay draft-only until approved by the owner.</span></section>
      <section className="cvPlanNotice"><b>Simple track</b><span>Smart Hub shows what matters. Command handles approval work on Operator and Command.</span></section>
      {error && !/not authenticated|401|403/i.test(error) && <section className="cvPlanNotice"><b>Needs attention</b><span>{error}</span></section>}

      <section className="cvPlanPanel">
        <div className="cvPlanPanelHeader">
          <div><span className="cvPlanMiniKicker">Plan limits</span><h2>{(current || selected).name} allowances</h2><p>Static limits only. Nothing on this page refreshes automatically.</p></div>
          <button className="cvPlanDark" type="button" onClick={() => loadPlan()} disabled={checkingPlan}>{checkingPlan ? "Checking…" : "Reload plan"}</button>
        </div>
        <div className="cvPlanAllowanceGrid">
          {allowances.map(([name, limit]) => <div className="cvPlanAllowance" key={name}><b>{name}</b><span>{limit} included</span><p>Usage count hidden here</p></div>)}
        </div>
      </section>

      <section className="cvPlanTruth">
        <div>
          <span className="cvPlanMiniKicker">Tier truth</span>
          <h2>Simple outside. Powerful underneath.</h2>
          <p>Start gets the core work. Crew unlocks workers. Operator unlocks Churvox-prepared admin. Command unlocks full control and scale.</p>
        </div>
        <div className="cvPlanTruthTable" role="table" aria-label="Churvox tier feature comparison">
          <div className="cvPlanTruthHead" role="row">
            <b>Feature</b><b>Start</b><b>Crew</b><b>Operator</b><b>Command</b>
          </div>
          {PLAN_FEATURE_MATRIX.map((row) => (
            <div className="cvPlanTruthRow" role="row" key={row.area}>
              <span>{row.area}</span>
              <b>{row.start}</b>
              <b>{row.crew}</b>
              <b>{row.operator}</b>
              <b>{row.command}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="cvPlanCards">
        {pricedPlans.map((plan) => {
          const active = selectedPlan === plan.id;
          const isCurrent = Boolean(displayPlan) && displayPlan === plan.id;
          return (
            <button type="button" key={plan.id} className={`cvPlanCard ${active ? "active" : ""} ${plan.id === "operator" ? "best" : ""}`} onClick={() => choosePlan(plan.id)}>
              {isCurrent && <span className="cvPlanBadge">Current</span>}
              <span className="cvPlanMiniKicker">{plan.tag}</span>
              <strong>{plan.name}</strong>
              <div className="cvPlanPrice">{plan.priceLabel}<small>{plan.taxInclusiveLabel ? ` · ${plan.taxInclusiveLabel}` : ""}</small></div>
              <h3>{plan.headline}</h3>
              <p>{plan.summary}</p>
              <p><b>{plan.limit}</b></p>
              <ul>{plan.includes.slice(0, 6).map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
            </button>
          );
        })}
      </section>

      <section className="cvPlanMain">
        <section className="cvPlanSelected">
          <div className="cvPlanTop">
            <div><span className="cvPlanMiniKicker">Selected plan</span><h2>{selected.name}</h2><p>{selected.summary}</p></div>
            <div className="cvPlanTopPrice">{selectedTotalLabel}<small>{noCheckoutChange ? "" : `/month ${countryMeta.taxLabel}`}</small></div>
          </div>
          <div className="cvPlanBreakdown">
            <div><b>Base plan</b><span>{samePlanSelected ? "Already active" : money(selected.price, country)}</span></div>
            <div><b>Accounting sync</b><span>{accountingIncluded ? "Included" : accountingSync ? "Selected" : accountingAddonText}</span></div>
            <div><b>Growth packs</b><span>{commandSelected ? `${growthPacks} selected` : "Command only"}</span></div>
          </div>
          <div className="cvPlanFeatureGrid">{selectedIncludes.map((feature) => <div key={feature}><b>✓</b><span>{feature}</span></div>)}</div>
          <div className="cvPlanAddons">
            <button type="button" className={`cvPlanAddon ${accountingSelected ? "active" : ""}`} onClick={() => { if (!accountingIncluded) setAccountingSync((value) => !value); }}><b>Accounting Sync Add-on</b><span>{accountingIncluded ? "Included with Command" : pricedAccountingAddon.priceLabel}</span><p>Owner-approved draft invoice sync only.</p></button>
            <button type="button" className={`cvPlanAddon ${commandSelected ? "active" : "locked"}`} onClick={() => { if (!commandSelected) choosePlan("command"); }}><b>Command Growth Pack</b><span>{pricedGrowthPack.priceLabel}</span><p>Adds 50 active team members plus extra capacity.</p></button>
          </div>
          {commandSelected && <div className="cvPlanGrowth"><div><b>Command Growth Pack</b><p>Each pack adds 50 active team members, 1,500 jobs/month and 1,000 AI actions/month.</p></div><div className="cvPlanGrowthControls"><button type="button" onClick={() => setGrowthPacks((count) => Math.max(0, count - 1))}>−</button><strong>{growthPacks}</strong><button type="button" onClick={() => setGrowthPacks((count) => count + 1)}>+</button></div></div>}
        </section>

        <aside className="cvPlanCheckout">
          <span className="cvPlanMiniKicker">Buy / update</span>
          <h2>{selected.name}</h2>
          <div className="cvPlanCheckoutPrice">{selectedTotalLabel}<small>{noCheckoutChange ? "" : `/month ${countryMeta.taxLabel}`}</small></div>
          <p>{noCheckoutChange ? "This is your current plan. Choose an add-on or another plan if you want to change billing." : `Stripe opens securely using ${countryMeta.label} pricing.`}</p>
          <div className="cvPlanActions">
            <button className="cvPlanDark" type="button" onClick={startCheckout} disabled={checkoutLoading || authLoading || noCheckoutChange}>{checkoutButton}</button>
            <button className="cvPlanOrange" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button>
            <button className="cvPlanGhost" type="button" onClick={() => loadPlan()} disabled={authLoading || checkingPlan}>{checkingPlan ? "Checking…" : "Reload plan"}</button>
          </div>
          <div className="cvPlanCheckoutItem"><b>Checkout total</b><span>{noCheckoutChange ? "No checkout needed" : checkoutLabel}</span></div>
          <div className="cvPlanCheckoutItem"><b>Best default</b><span>Operator is the main plan because AI prepares the admin and the owner approves.</span></div>
        </aside>
      </section>

      <section className="cvPlanCompare"><h2>What each plan is for</h2><div className="cvPlanCompareGrid">{plans.map((plan) => <div key={plan.id}><b>{plan.name}</b><span>{plan.limit}</span><p>{plan.headline}</p></div>)}</div></section>
      {showDebug && debug && <section className="cvPlanCompare"><h2>Checkout diagnostic</h2><pre>{JSON.stringify(debug, null, 2).slice(0, 1800)}</pre></section>}
    </section>
  );
}
