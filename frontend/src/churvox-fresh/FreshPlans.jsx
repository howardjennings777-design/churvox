import React from "react";
import "./freshPlans.css";
import "./freshPlansTierLadder.css";
import { PLAN_FEATURE_MATRIX } from "./planRules";
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

const CHECKOUT_TRACE_MARKER = "stable-plans-no-live-usage-loop-v44";
const LIVE_BACKEND = API_BASE || "https://grassley-backend.onrender.com";
const PLAN_CACHE_KEY = "churvox:stable-current-plan:v1";
const COUNTRY_CACHE_KEY = "churvox:billing-country";
const PENDING_CHECKOUT_KEY = "churvox:pending-checkout:v1";
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const accountingAddonText = "Xero Sync Add-on — $39/month + GST (where available)";

const plans = [
  {
    id: "start",
    backendPlan: "solo",
    name: "Start",
    price: 39,
    tag: "Solo",
    headline: "Get the work under control",
    summary: "For one owner who wants jobs, clients, quotes and invoices in one place.",
    limit: "50 jobs/month · 1 owner + 1 helper · 25 AI actions",
    includes: [
      "Core jobs, clients, quotes and invoices",
      "Smart Hub + basic Command desk",
      "250 clients",
      "50 jobs/month",
      "1 owner + 1 helper",
      "25 AI Operator Actions/month",
      "Xero Sync Add-on available",
    ],
    limits: { workers: 1, clients: 250, jobs_month: 50, ai_actions_month: 25 },
    addOns: [accountingAddonText],
  },
  {
    id: "crew",
    backendPlan: "team",
    name: "Crew",
    price: 89,
    tag: "Team",
    headline: "Run the crew",
    summary: "For a small team that needs worker proof, time approval and cleaner handover.",
    limit: "150 jobs/month · 5 active team members · 100 AI actions",
    includes: [
      "Everything in Start",
      "1,000 clients",
      "150 jobs/month",
      "5 active team members",
      "100 AI Operator Actions/month",
      "Worker Proof Pack",
      "Worker Time Approval",
      "Xero Sync Add-on available",
    ],
    limits: { workers: 5, clients: 1000, jobs_month: 150, ai_actions_month: 100 },
    addOns: [accountingAddonText],
  },
  {
    id: "operator",
    backendPlan: "pro",
    name: "Operator",
    price: 149,
    tag: "Recommended",
    headline: "Churvox prepares the admin",
    summary: "For owners who want Churvox to prepare admin, follow-ups and approval work.",
    limit: "500 jobs/month · 15 active team members · 500 AI actions",
    includes: [
      "Everything in Crew",
      "3,000 clients",
      "500 jobs/month",
      "15 active team members",
      "500 AI Operator Actions/month",
      "Admin recovery batch up to 25",
      "Customer Follow-Up Brain",
      "Xero Sync Add-on available",
    ],
    limits: { workers: 15, clients: 3000, jobs_month: 500, ai_actions_month: 500 },
    addOns: [accountingAddonText],
  },
  {
    id: "command",
    backendPlan: "enterprise",
    name: "Command",
    price: 299,
    tag: "Scale",
    headline: "Full control at scale",
    summary: "For the bigger business that wants AI approval control, payroll workspace and Xero sync included.",
    limit: "1,500 jobs/month · 50 active team members · 2,000 AI actions",
    includes: [
      "Everything in Operator",
      "10,000 clients",
      "1,500 jobs/month",
      "50 active team members",
      "2,000 AI Operator Actions/month",
      "Xero sync included",
      "Payroll workspace",
      "Imports, reports and exports",
      "Command Growth Pack available",
    ],
    limits: { workers: 50, clients: 10000, jobs_month: 1500, ai_actions_month: 2000 },
    addOns: ["Command Growth Pack — $99/month + GST"],
  },
];

plans.forEach((plan) => { plan.features = plan.includes; });

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

function money(value, countryCode = "NZ") {
  const country = getCountryMeta(countryCode);
  return `${country.symbol}${Number(value || 0).toFixed(0)}`;
}

function planByUiId(id) {
  return plans.find((plan) => plan.id === id) || plans[2];
}

function readCountry() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return normalizeCountry(params.get("country") || window.localStorage.getItem(COUNTRY_CACHE_KEY) || detectCountryCode());
  } catch {
    return detectCountryCode();
  }
}

function uiPlanFromBackend(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw || raw === "none" || raw === "null" || raw === "undefined") return "";
  return backendToUiPlan[raw] || "";
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

function readCachedPlan() {
  try {
    return uiPlanFromBackend(window.localStorage.getItem(PLAN_CACHE_KEY) || "");
  } catch {
    return "";
  }
}

function notifyPlanUpdated(detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent("churvox:plan-updated", { detail }));
  } catch {}
}

function saveCachedPlan(planId) {
  const clean = uiPlanFromBackend(planId);
  if (!clean) return;
  try {
    window.localStorage.setItem(PLAN_CACHE_KEY, clean);
  } catch {}
  notifyPlanUpdated({ plan: clean, source: "plan-cache" });
}

function saveAddonActivation(addon, quantity = 1) {
  try {
    const key = String(addon || "").toLowerCase();
    if (["xero_addon", "xero", "accounting_sync", "accounting-sync"].includes(key)) {
      window.localStorage.setItem("churvox:addon:accounting_sync", "true");
    }
    if (key === "command_growth_pack") {
      window.localStorage.setItem("churvox:addon:command_growth_pack", String(Math.max(1, Number(quantity || 1))));
    }
  } catch {}
  notifyPlanUpdated({ addon, quantity, source: "addon-checkout" });
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

function planFromUser(user) {
  return uiPlanFromBackend(
    user?.ui_plan ||
      user?.current_plan ||
      user?.plan ||
      user?.subscription_plan ||
      user?.billing_plan ||
      user?.tier ||
      user?.plan_name ||
      user?.business?.plan ||
      user?.business?.subscription_plan
  );
}

function errorFrom(body, response) {
  return body?.detail || body?.error || body?.message || body?.data?.detail || body?.data?.error || `Request failed with status ${response?.status || body?.status || "unknown"}`;
}

async function readBody(response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, detail: `Non-JSON response from backend endpoint (${response.status}).`, body: text.slice(0, 400) };
  }
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = await readBody(response);
  return { response, body };
}

function firstCheckoutUrl(body) {
  return body?.url || body?.checkout_url || body?.checkoutUrl || body?.session_url || body?.stripe_url || body?.redirect_url || body?.data?.url || body?.data?.checkout_url || body?.session?.url || "";
}

function allowanceRows(plan, growthPacks = 0) {
  const limits = { ...(plan?.limits || plans[2].limits) };
  const packs = plan?.id === "command" ? Math.max(0, Number(growthPacks || 0)) : 0;
  if (packs > 0) {
    limits.workers += packs * 50;
    limits.jobs_month += packs * 1500;
    limits.ai_actions_month += packs * 1000;
  }
  return [
    { key: "workers", name: "Active workers", used: "—", limit: limits.workers, left: "—", locked: false },
    { key: "clients", name: "Clients", used: "—", limit: limits.clients, left: "—", locked: false },
    { key: "jobs_month", name: "Jobs/month", used: "—", limit: limits.jobs_month, left: "—", locked: false },
    { key: "ai_actions_month", name: "AI Operator Actions/month", used: "—", limit: limits.ai_actions_month, left: "—", locked: false },
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
    addons: JSON.stringify({ accounting_sync: Boolean(accountingSync), growth_packs: Number(growthPacks || 0) }),
    source: "fresh_plans_stable_v44",
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
    body: JSON.stringify({
      addon,
      addon_key: addon,
      country: country || "NZ",
      quantity: safeQuantity,
      growth_packs: addon === "command_growth_pack" ? safeQuantity : 0,
      packs: addon === "command_growth_pack" ? safeQuantity : 0,
    }),
  }).then(({ response, body }) => {
    const checkoutUrl = firstCheckoutUrl(body);
    if (!response.ok || body?.success === false || !checkoutUrl) throw new Error(errorFrom(body, response));
    window.location.href = checkoutUrl;
  });
}

export default function FreshPlans({ onNavigate }) {
  const { user, loading: authLoading, updateUser } = useAuth();
  const loadedOnceRef = React.useRef(false);
  const loadingRef = React.useRef(false);
  const [currentPlan, setCurrentPlan] = React.useState(() => readCachedPlan());
  const [selectedPlan, setSelectedPlan] = React.useState(() => readCachedPlan() || "operator");
  const [growthPacks, setGrowthPacks] = React.useState(0);
  const [accountingSync, setAccountingSync] = React.useState(false);
  const [checkingPlan, setCheckingPlan] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [notice, setNotice] = React.useState(() => (readCachedPlan() ? "Showing saved plan while billing checks." : "Checking account plan."));
  const [error, setError] = React.useState("");
  const [debug, setDebug] = React.useState(null);
  const [country, setCountry] = React.useState(readCountry);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(COUNTRY_CACHE_KEY, country);
    } catch {}
  }, [country]);

  const countryMeta = getCountryMeta(country);
  const pricedPlans = React.useMemo(
    () =>
      plans.map((plan) => {
        const priced = pricePlanForCountry(plan.backendPlan, country);
        return {
          ...plan,
          price: priced.monthly,
          monthly: priced.monthly,
          priceLabel: priced.priceLabel,
          taxInclusiveLabel: priced.taxInclusiveLabel,
          currency: priced.currency,
          taxLabel: priced.taxLabel,
        };
      }),
    [country]
  );
  const pricedAccountingAddon = React.useMemo(() => addonPriceForCountry("accounting_sync", country), [country]);
  const pricedGrowthPack = React.useMemo(() => addonPriceForCountry("command_growth_pack", country), [country]);
  const userPlan = planFromUser(user);
  const displayPlan = currentPlan || userPlan;
  const selected = pricedPlans.find((plan) => plan.id === selectedPlan) || pricedPlans[2];
  const current = displayPlan ? pricedPlans.find((plan) => plan.id === displayPlan) || null : null;
  const commandSelected = selected.id === "command";
  const samePlanSelected = Boolean(displayPlan) && selected.id === displayPlan;
  const growthTotal = commandSelected ? growthPacks * pricedGrowthPack.monthly : 0;
  const accountingAddonTotal = !commandSelected && accountingSync ? pricedAccountingAddon.monthly : 0;
  const basePlanCheckoutTotal = samePlanSelected ? 0 : selected.price;
  const monthlyTotal = basePlanCheckoutTotal + growthTotal + accountingAddonTotal;
  const accountingIncluded = commandSelected;
  const accountingSelected = accountingIncluded || accountingSync;
  const addonOnlyGrowthCheckout = samePlanSelected && commandSelected && growthPacks > 0;
  const addonOnlyAccountingCheckout = samePlanSelected && !commandSelected && accountingSync;
  const noCheckoutChange = samePlanSelected && monthlyTotal === 0;
  const checkoutModeLabel = addonOnlyGrowthCheckout
    ? `${growthPacks} Command Growth Pack${growthPacks === 1 ? "" : "s"} only`
    : addonOnlyAccountingCheckout
      ? "Xero Sync Add-on only"
      : `${selected.name}${accountingSync && !commandSelected ? " + Xero Sync" : ""}${growthPacks ? ` + ${growthPacks} Growth Pack${growthPacks === 1 ? "" : "s"}` : ""}`;
  const checkoutButtonLabel = noCheckoutChange ? "Current plan active" : checkoutLoading ? "Opening Stripe..." : addonOnlyGrowthCheckout || addonOnlyAccountingCheckout ? "Buy selected add-on" : "Buy selected plan";
  const selectedTotalLabel = noCheckoutChange ? "Already active" : money(monthlyTotal, country);
  const checkoutTotalLabel = noCheckoutChange ? "No checkout needed" : checkoutModeLabel;
  const showDebug = React.useMemo(() => {
    try {
      return new URLSearchParams(window.location.search || "").get("debug") === "1";
    } catch {
      return false;
    }
  }, []);
  const planUsageRows = allowanceRows(current || selected, current?.id === "command" ? growthPacks : 0);

  function applyPlan(planId, reason = "Current plan updated.") {
    const clean = uiPlanFromBackend(planId);
    if (!clean) return false;
    setCurrentPlan(clean);
    setSelectedPlan(clean);
    saveCachedPlan(clean);
    setNotice(reason);
    return true;
  }

  const loadPlan = React.useCallback(
    async ({ force = false } = {}) => {
      if (authLoading || loadingRef.current) return;
      if (loadedOnceRef.current && !force) return;
      loadedOnceRef.current = true;
      loadingRef.current = true;
      setCheckingPlan(true);
      setError("");
      setNotice(currentPlan || planFromUser(user) ? "Checking billing in the background." : "Checking account plan.");
      try {
        const token = authToken(user);
        const headers = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const { response, body } = await apiRequest(backendUrl("/billing/subscription-status"), {
          method: "GET",
          credentials: "include",
          headers,
        });
        if (!response.ok || body?.success === false) throw new Error(errorFrom(body, response));
        const data = body?.data && typeof body.data === "object" ? body.data : body;
        const foundPlan = uiPlanFromBackend(data?.plan || data?.current_plan || data?.subscription_plan || data?.ui_plan);
        if (foundPlan) {
          applyPlan(foundPlan, "Loaded from billing profile.");
          updateUser?.({ ...(user || {}), plan: planByUiId(foundPlan).backendPlan, ui_plan: foundPlan, has_app_access: data?.has_app_access !== false });
        } else {
          setNotice(currentPlan || planFromUser(user) ? "No billing change found." : "No plan chosen yet.");
        }
        setDebug((previous) => ({ ...(previous || {}), status: { endpoint: backendUrl("/billing/subscription-status"), status: response.status, body: data } }));
      } catch (err) {
        const message = err?.message || "Plan could not load from backend.";
        setNotice(currentPlan || planFromUser(user) ? "Showing saved current plan." : /not authenticated|401|403/i.test(message) ? "Sign in to load plan." : "Plan needs attention.");
        setError(message);
      } finally {
        loadingRef.current = false;
        setCheckingPlan(false);
      }
    },
    [authLoading, currentPlan, updateUser, user]
  );

  React.useEffect(() => {
    const fromUser = planFromUser(user);
    if (fromUser && fromUser !== currentPlan) applyPlan(fromUser, "Loaded from account profile.");
    if (!authLoading) loadPlan();
  }, [authLoading, user?.plan, user?.ui_plan, user?.subscription_plan, user?.billing_plan]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search || "");
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    const pending = readPendingCheckout();
    if (checkout === "cancelled" || params.get("canceled") || params.get("cancelled") || params.get("addon_cancelled")) {
      clearPendingCheckout();
      setNotice("Stripe checkout cancelled.");
      window.history.replaceState(null, "", "/plans");
      return;
    }
    if (params.get("addon_success") && sessionId) {
      confirmAddonCheckout(sessionId, params.get("addon") || pending?.addon || "", Number(params.get("quantity") || pending?.quantity || 1), params.get("country") || pending?.country || "NZ");
      return;
    }
    if (checkout === "success" && sessionId) {
      confirmCheckout(sessionId, params.get("plan") || pending?.plan || selected.backendPlan, params.get("country") || pending?.country || "NZ");
    }
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
      if (confirmedPlan) applyPlan(confirmedPlan, "Stripe checkout saved. Current plan updated.");
      if (body?.accounting_sync) saveAddonActivation("xero_addon", 1);
      if (Number(body?.growth_packs || 0) > 0) saveAddonActivation("command_growth_pack", Number(body.growth_packs));
      clearPendingCheckout();
      window.history.replaceState(null, "", "/plans");
      window.dispatchEvent(new Event("churvox-auth-refresh"));
      setDebug((previous) => ({ ...(previous || {}), confirm: { endpoint: backendUrl("/billing/confirm-checkout"), status: response.status, body, pending } }));
      loadPlan({ force: true });
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
      setNotice(safeAddon === "command_growth_pack" ? "Command Growth Pack added." : "Xero Sync Add-on activated.");
      if (safeAddon === "command_growth_pack") setGrowthPacks(0);
      if (safeAddon === "xero_addon" || safeAddon === "xero") setAccountingSync(false);
      window.history.replaceState(null, "", "/plans");
      window.dispatchEvent(new Event("churvox-auth-refresh"));
      setDebug((previous) => ({ ...(previous || {}), addonConfirm: { endpoint: backendUrl("/billing/confirm-addon-checkout"), status: response.status, body, pending } }));
      loadPlan({ force: true });
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
    setDebug(null);
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

  const selectedIncludes = selected.includes || selected.features || [];
  const planComparison = [
    ["Start", "50 jobs/month", "1 owner + 1 helper, 25 AI actions. Client records stay generous."],
    ["Crew", "150 jobs/month", "5 active team members, worker proof and time approval."],
    ["Operator", "500 jobs/month", "15 active team members, 500 AI actions. AI prepares admin. You approve."],
    ["Command", "1,500 jobs/month", "50 active team members, 2,000 AI actions, Xero sync included."],
  ];

  return (
    <section className="freshPricingPage freshPricingPageV2" data-checkout-trace={CHECKOUT_TRACE_MARKER}>
      <header className="freshPricingHero freshPricingHeroV2">
        <div>
          <span className="freshDarkPanelPill">Churvox pricing</span>
          <h1>Plans</h1>
          <p>Choose the plan that fits your business. Start simple, add crew tools, or use Operator where Churvox prepares admin and you approve.</p>
          <div className="freshPricingHeroActions">
            <button className="freshPrimary" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("support")}>Ask which plan fits</button>
          </div>
          <label className="freshCountrySelect">
            <span className="freshDarkPanelPill">Pricing country</span>
            <select value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))}>
              {COUNTRY_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.label} · {item.currency}</option>)}
            </select>
          </label>
        </div>
        <aside className="freshCurrentPlanBox">
          <small className="freshDarkPanelPill" style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1, fontWeight: 900 }}>Current plan</small>
          <strong>{current ? current.name : checkingPlan || authLoading ? "Checking plan" : "No plan chosen"}</strong>
          <p>{checkingPlan && current ? `${notice} Current plan stays visible.` : notice}</p>
          {current ? <button type="button" onClick={() => choosePlan(current.id)}>View current plan</button> : <button type="button" onClick={() => loadPlan({ force: true })}>Reload current plan</button>}
        </aside>
      </header>

      <section className="freshPlanNotice proper freshPlanNoticeV2"><b>14-day trial</b><span>Start testing Churvox with real jobs, clients, quotes and invoices. Billing actions stay owner-approved.</span></section>
      <section className="freshPlanNotice proper freshPlanNoticeV2"><b>Safe money rules</b><span>Invoices stay draft-only until approved. Xero sync is owner-approved. Churvox does not file tax, mark paid automatically, or create payment files.</span></section>
      {error && !/not authenticated|401|403/i.test(error) && <section className="freshCard freshNotice need"><b>Plans need attention</b><span>{error}</span></section>}

      <section className="freshCard freshPlanLogicCard" style={{ marginBottom: 18 }}>
        <div className="freshPlanLogicHead">
          <span>Plan limits</span>
          <h2>{(current || selected).name} allowances</h2>
          <p>Showing the plan limits directly. Live usage counts are not loaded on this page, so it cannot get stuck refreshing.</p>
          <button className="freshGhost" type="button" onClick={() => loadPlan({ force: true })} disabled={checkingPlan}>{checkingPlan ? "Checking…" : "Reload current plan"}</button>
        </div>
        <div className="freshCompareGrid">
          {planUsageRows.map((row) => (
            <div key={row.key}>
              <b>{row.name}</b>
              <span>{row.limit} included</span>
              <p>{row.used === "—" ? "Usage count hidden here" : `${row.left} left`}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="freshPricingCards freshPricingCardsV2">
        {pricedPlans.map((plan) => {
          const active = selectedPlan === plan.id;
          const isCurrent = Boolean(displayPlan) && displayPlan === plan.id;
          return (
            <button type="button" key={plan.id} className={`freshPricingCard freshPricingCardV2 ${active ? "active" : ""} ${plan.id === "operator" ? "best" : ""}`} onClick={() => choosePlan(plan.id)}>
              <span className="freshPlanTag">{plan.tag}</span>
              {isCurrent && <span className="freshCurrentBadge">Current</span>}
              <strong>{plan.name}</strong>
              <em>{plan.priceLabel}<small>{plan.taxInclusiveLabel ? ` · ${plan.taxInclusiveLabel}` : ""}</small></em>
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
          <div className="freshSelectedPlanTop"><div><span>Selected plan</span><h2>{selected.name}</h2><p>{selected.summary}</p></div><strong>{selectedTotalLabel}<small>{noCheckoutChange ? "" : `/month ${countryMeta.taxLabel}`}</small></strong></div>
          <div className="freshPlanBreakdown">
            <div><b>Base plan</b><span>{selected.name}</span><strong>{samePlanSelected ? "Already active" : money(selected.price, country)}</strong></div>
            <div><b>Xero sync</b><span>{accountingIncluded ? "Included with Command" : accountingSync ? "Add-on selected" : "Optional add-on"}</span><strong>{accountingAddonTotal ? money(accountingAddonTotal, country) : accountingIncluded ? "Included" : money(pricedAccountingAddon.monthly, country)}</strong></div>
            <div><b>Growth packs</b><span>{commandSelected ? `${growthPacks} selected` : "Only for Command"}</span><strong>{growthTotal ? money(growthTotal, country) : money(0, country)}</strong></div>
          </div>
          <section className="freshPlanSection"><h3>What you get on {selected.name}</h3><div className="freshPlanFeatures premium">{selectedIncludes.map((feature) => <div key={feature}><b>✓</b><span>{feature}</span></div>)}</div></section>
          <section className="freshPlanSection"><h3>Add-ons</h3><div className="freshAddOnGrid"><button type="button" className={`freshAddOnCard ${accountingSelected ? "active" : ""}`} onClick={() => { if (!accountingIncluded) setAccountingSync((value) => !value); }}><b>Xero Sync Add-on</b><span>{accountingIncluded ? "Included with Command" : pricedAccountingAddon.priceLabel}</span><p>Xero where available. Owner-approved draft invoice sync only.</p></button><button type="button" className={`freshAddOnCard ${commandSelected ? "active" : "locked"}`} onClick={() => { if (!commandSelected) choosePlan("command"); }}><b>Command Growth Pack</b><span>{pricedGrowthPack.priceLabel}</span><p>Adds 50 active team members plus extra job, AI action, automation and admin capacity.</p></button></div>{commandSelected && <div className="freshGrowthPack premium freshGrowthPackV2"><div><b>Command Growth Pack</b><span>Command includes 50 active team members. Each pack adds 50 more active team members.</span></div><div className="freshGrowthControls"><button type="button" onClick={() => setGrowthPacks((count) => Math.max(0, count - 1))}>−</button><strong>{growthPacks}</strong><button type="button" onClick={() => setGrowthPacks((count) => count + 1)}>+</button></div></div>}</section>
        </section>
        <aside className="freshCard freshCheckoutCard freshCheckoutCardV2"><span>Buy / update</span><h2>{selected.name}</h2><strong>{selectedTotalLabel}<small>{noCheckoutChange ? "" : `/month ${countryMeta.taxLabel}`}</small></strong><p>{noCheckoutChange ? "This is your current plan. Choose an add-on or another plan if you want to change billing." : `Stripe opens securely using ${countryMeta.label} pricing. If this is only an add-on for your current plan, checkout charges the add-on only.`}</p><div className="freshActions"><button className="freshDark" type="button" onClick={startCheckout} disabled={checkoutLoading || authLoading || noCheckoutChange}>{checkoutButtonLabel}</button><button className="freshOrange" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button><button className="freshGhost" type="button" onClick={() => loadPlan({ force: true })} disabled={authLoading || checkingPlan}>{checkingPlan ? "Checking…" : "Reload current plan"}</button></div><div className="freshItem"><b>Checkout total</b><span>{checkoutTotalLabel}</span></div><div className="freshItem"><b>Best default</b><span>Operator is the main plan because AI prepares the admin and the owner approves.</span></div><div className="freshItem need"><b>Command scale</b><span>Command includes up to 50 active team members. Inactive old staff should not count as billable.</span></div></aside>
      </section>

      <section className="freshCard freshPlanLogicCard"><div className="freshPlanLogicHead"><span>Plan logic</span><h2>What opens on each tier</h2><p>One rule set controls the owner workspace: Open, Locked, Add-on, Included, or Growth Pack only.</p></div><div className="freshPlanLogicTable"><div className="head">Area</div><div className="head">Start</div><div className="head">Crew</div><div className="head">Operator</div><div className="head">Command</div>{PLAN_FEATURE_MATRIX.map((row) => <React.Fragment key={row.area}><div className="area">{row.area}</div><div>{row.start}</div><div>{row.crew}</div><div>{row.operator}</div><div>{row.command}</div></React.Fragment>)}</div></section>
      {showDebug && debug && <section className="freshCard freshNotice" style={{ marginTop: 14 }}><b>Checkout diagnostic</b><span style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12 }}>{JSON.stringify(debug, null, 2).slice(0, 1800)}</span></section>}
      <section className="freshCard freshCompareCard freshCompareCardV2"><h2>Simple comparison</h2><div className="freshCompareGrid">{planComparison.map(([name, fit, value]) => <div key={name}><b>{name}</b><span>{fit}</span><p>{value}</p></div>)}</div></section>
    </section>
  );
}
