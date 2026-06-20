import React from "react";
import "./freshPlans.css";
import { PLAN_FEATURE_MATRIX } from "./planRules";
import API_BASE from "../lib/apiBase";
import { useAuth } from "../context/AuthContext";
import { COUNTRY_OPTIONS, addonPriceForCountry, detectCountryCode, getCountryMeta, normalizeCountry, pricePlanForCountry } from "../config/churvoxPlans";

const CHECKOUT_TRACE_MARKER = "stable-current-plan-v40";
const LIVE_BACKEND = API_BASE || "https://grassley-backend.onrender.com";
const PLAN_CACHE_KEY = "churvox:stable-current-plan:v1";
const COUNTRY_CACHE_KEY = "churvox:billing-country";

const accountingAddonText = "Accounting Sync Add-on — $39/month + GST (MYOB or Xero, where available)";

const plans = [
  { id: "start", backendPlan: "solo", name: "Start", price: 39, tag: "Solo", headline: "Get the work under control", summary: "For one owner who wants jobs, clients, quotes and invoices in one place.", limit: "Best for one owner", includes: ["Jobs and client records", "Quotes and draft invoices", "Today view", "Schedule board", "Business setup and GST basics", "Email-ready customer records"], addOns: [accountingAddonText] },
  { id: "crew", backendPlan: "team", name: "Crew", price: 89, tag: "Team", headline: "Run the crew", summary: "For a small team that needs workers, schedule visibility and cleaner handover.", limit: "Up to 5 workers", includes: ["Everything in Start", "Worker app access", "Team invites and worker setup", "Schedule and dispatch workflow", "Time capture workspace", "More job and client capacity"], addOns: [accountingAddonText] },
  { id: "operator", backendPlan: "pro", name: "Operator", price: 149, tag: "Recommended", headline: "Churvox prepares the admin", summary: "For owners who want Churvox to prepare jobs, quotes, invoices and follow-ups for approval.", limit: "Best default plan", includes: ["Everything in Crew", "Tell Churvox", "AI Operator Actions", "Review approval desk", "Quote and invoice admin prepared", "Follow-up watch"], addOns: [accountingAddonText] },
  { id: "command", backendPlan: "enterprise", name: "Command", price: 299, tag: "Scale", headline: "Full control at scale", summary: "For the bigger business that wants AI approval control, payroll workspace and accounting sync included.", limit: "Up to 50 active team members", includes: ["Everything in Operator", "One accounting sync option included — MYOB or Xero, where available", "Payroll workspace", "Advanced roles", "Priority support", "Command Growth Pack available"], addOns: ["Command Growth Pack — $99/month + GST"] },
];

plans.forEach((plan) => { plan.features = plan.includes; });

const backendToUiPlan = { solo: "start", team: "crew", pro: "operator", enterprise: "command", start: "start", crew: "crew", operator: "operator", command: "command" };

function money(value, countryCode = "NZ") { const country = getCountryMeta(countryCode); return `${country.symbol}${Number(value || 0).toFixed(0)}`; }
function planByUiId(id) { return plans.find((plan) => plan.id === id) || plans[2]; }
function readCountry() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return normalizeCountry(params.get("country") || window.localStorage.getItem(COUNTRY_CACHE_KEY) || detectCountryCode());
  } catch {
    return detectCountryCode();
  }
}
function uiPlanFromBackend(value) { const raw = String(value || "").toLowerCase().trim(); if (!raw || raw === "none" || raw === "null" || raw === "undefined") return ""; return backendToUiPlan[raw] || ""; }
function backendUrl(path) { const base = String(LIVE_BACKEND || "").replace(/\/+$/, ""); const cleanPath = String(path || "").replace(/^\/+/, ""); if (/^https?:\/\//i.test(path)) return path; if (!base) return `/${cleanPath}`; return `${base}/api/${cleanPath.replace(/^api\//i, "")}`; }
function authToken(user) { if (user?.token) return user.token; try { return window.localStorage.getItem("token") || window.localStorage.getItem("authToken") || window.localStorage.getItem("access_token") || ""; } catch { return ""; } }
function readCachedPlan() { try { return uiPlanFromBackend(window.localStorage.getItem(PLAN_CACHE_KEY) || ""); } catch { return ""; } }
function saveCachedPlan(planId) { const clean = uiPlanFromBackend(planId); if (!clean) return; try { window.localStorage.setItem(PLAN_CACHE_KEY, clean); } catch {} }
function planFromUser(user) { return uiPlanFromBackend(user?.ui_plan || user?.current_plan || user?.plan || user?.subscription_plan || user?.billing_plan || user?.tier || user?.plan_name || user?.business?.plan || user?.business?.subscription_plan); }
function errorFrom(body, response) { return body?.detail || body?.error || body?.message || body?.data?.detail || body?.data?.error || `Request failed with status ${response?.status || body?.status || "unknown"}`; }
async function readBody(response) { const text = await response.text(); if (!text.trim()) return {}; try { return JSON.parse(text); } catch { return { success: false, detail: `Non-JSON response from backend endpoint (${response.status}).`, body: text.slice(0, 400) }; } }
async function apiRequest(url, options = {}) { const response = await fetch(url, options); const body = await readBody(response); return { response, body }; }
function firstCheckoutUrl(body) { return body?.url || body?.checkout_url || body?.checkoutUrl || body?.session_url || body?.stripe_url || body?.redirect_url || body?.data?.url || body?.data?.checkout_url || body?.session?.url || ""; }

function postCheckoutForm({ token, plan, country, accountingSync = false, growthPacks = 0 }) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = backendUrl("/billing/start-checkout-form");
  form.style.display = "none";
  const fields = { token, plan, ui_plan: plan, country: country || "NZ", accounting_sync: accountingSync ? "1" : "", growth_packs: growthPacks || 0, addons: JSON.stringify({ accounting_sync: Boolean(accountingSync), growth_packs: Number(growthPacks || 0) }), source: "fresh_plans_stable_v40" };
  Object.entries(fields).forEach(([name, value]) => { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = String(value || ""); form.appendChild(input); });
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
  const [notice, setNotice] = React.useState(() => readCachedPlan() ? "Showing saved plan while billing checks." : "Checking account plan.");
  const [error, setError] = React.useState("");
  const [debug, setDebug] = React.useState(null);
  const [country, setCountry] = React.useState(readCountry);

  React.useEffect(() => {
    try { window.localStorage.setItem(COUNTRY_CACHE_KEY, country); } catch {}
  }, [country]);

  React.useEffect(() => {
    const applyCurrentPlanPillContrast = () => {
      document.querySelectorAll(".freshCurrentPlanBox .freshDarkPanelPill").forEach((el) => {
        el.style.setProperty("color", "#ffffff", "important");
        el.style.setProperty("-webkit-text-fill-color", "#ffffff", "important");
        el.style.setProperty("opacity", "1", "important");
        el.style.setProperty("font-weight", "900", "important");
      });
    };

    applyCurrentPlanPillContrast();
    const timer = window.setTimeout(applyCurrentPlanPillContrast, 500);
    return () => window.clearTimeout(timer);
  }, [currentPlan, checkingPlan, authLoading, notice]);


  const countryMeta = getCountryMeta(country);
  const pricedPlans = React.useMemo(() => plans.map((plan) => {
    const priced = pricePlanForCountry(plan.backendPlan, country);
    return { ...plan, price: priced.monthly, monthly: priced.monthly, priceLabel: priced.priceLabel, taxInclusiveLabel: priced.taxInclusiveLabel, currency: priced.currency, taxLabel: priced.taxLabel };
  }), [country]);

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
  const checkoutModeLabel = addonOnlyGrowthCheckout
    ? `${growthPacks} Command Growth Pack${growthPacks === 1 ? "" : "s"} only`
    : addonOnlyAccountingCheckout
      ? "Accounting Sync Add-on only"
      : `${selected.name}${accountingSync && !commandSelected ? " + Accounting Sync" : ""}${growthPacks ? ` + ${growthPacks} Growth Pack${growthPacks === 1 ? "" : "s"}` : ""}`;
  const showDebug = React.useMemo(() => { try { return new URLSearchParams(window.location.search || "").get("debug") === "1"; } catch { return false; } }, []);

  function applyPlan(planId, reason = "Current plan updated.") {
    const clean = uiPlanFromBackend(planId);
    if (!clean) return false;
    setCurrentPlan(clean);
    setSelectedPlan(clean);
    saveCachedPlan(clean);
    setNotice(reason);
    return true;
  }

  const loadPlan = React.useCallback(async ({ force = false } = {}) => {
    if (authLoading || loadingRef.current) return;
    if (loadedOnceRef.current && !force) return;
    loadedOnceRef.current = true;
    loadingRef.current = true;
    setCheckingPlan(true);
    setError("");
    if (!currentPlan && !planFromUser(user)) setNotice("Checking account plan.");
    else setNotice("Checking billing in the background.");

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
        updateUser?.({ ...(user || {}), plan: planByUiId(foundPlan).backendPlan, ui_plan: foundPlan });
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
  }, [authLoading, currentPlan, updateUser, user]);

  React.useEffect(() => {
    const fromUser = planFromUser(user);
    if (fromUser && fromUser !== currentPlan) applyPlan(fromUser, "Loaded from account profile.");
    if (!authLoading) loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.plan, user?.ui_plan, user?.subscription_plan, user?.billing_plan]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search || "");
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    if (checkout === "cancelled" || params.get("canceled") || params.get("cancelled") || params.get("addon_cancelled")) { setNotice("Stripe checkout cancelled."); window.history.replaceState(null, "", "/plans"); return; }
    if (params.get("addon_success") && sessionId) { confirmAddonCheckout(sessionId, params.get("addon") || "", Number(params.get("quantity") || 1), params.get("country") || "NZ"); return; }
    if (checkout === "success" && sessionId) confirmCheckout(sessionId, params.get("plan") || selected.backendPlan, params.get("country") || "NZ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmCheckout(sessionId, plan, country) {
    setCheckingPlan(true);
    try {
      const token = authToken(user);
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const { response, body } = await apiRequest(backendUrl("/billing/confirm-checkout"), { method: "POST", credentials: "include", headers, body: JSON.stringify({ session_id: sessionId, plan, country }) });
      if (!response.ok || body?.success === false) throw new Error(errorFrom(body, response));
      const confirmedPlan = uiPlanFromBackend(body?.plan || body?.data?.plan || plan);
      if (confirmedPlan) applyPlan(confirmedPlan, "Stripe checkout saved. Current plan updated.");
      window.history.replaceState(null, "", "/plans");
      window.dispatchEvent(new Event("churvox-auth-refresh"));
      setDebug((previous) => ({ ...(previous || {}), confirm: { endpoint: backendUrl("/billing/confirm-checkout"), status: response.status, body } }));
      loadPlan({ force: true });
    } catch (err) {
      setNotice("Checkout needs attention.");
      setError(err?.message || "Stripe checkout could not be saved.");
    } finally {
      setCheckingPlan(false);
    }
  }

  async function confirmAddonCheckout(sessionId, addon, quantity = 1, country = "NZ") {
    setCheckingPlan(true);
    try {
      const token = authToken(user);
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const { response, body } = await apiRequest(backendUrl("/billing/confirm-addon-checkout"), {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ session_id: sessionId, addon, quantity, country }),
      });
      if (!response.ok || body?.success === false) throw new Error(errorFrom(body, response));
      setNotice(addon === "command_growth_pack" ? "Command Growth Pack added." : "Accounting Sync Add-on activated.");
      if (addon === "command_growth_pack") setGrowthPacks(0);
      if (addon === "xero_addon" || addon === "xero") setAccountingSync(false);
      window.history.replaceState(null, "", "/plans");
      window.dispatchEvent(new Event("churvox-auth-refresh"));
      setDebug((previous) => ({ ...(previous || {}), addonConfirm: { endpoint: backendUrl("/billing/confirm-addon-checkout"), status: response.status, body } }));
      loadPlan({ force: true });
    } catch (err) {
      setNotice("Add-on checkout needs attention.");
      setError(err?.message || "Add-on checkout could not be saved.");
    } finally {
      setCheckingPlan(false);
    }
  }

  function choosePlan(planId) { setSelectedPlan(planId); if (planId !== "command") setGrowthPacks(0); if (planId === "command") setAccountingSync(false); setError(""); }

  async function tryCheckoutEndpoint(url, payload, token) {
    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const { response, body } = await apiRequest(url, { method: "POST", credentials: "include", headers, body: JSON.stringify(payload) });
    const urlFromBody = firstCheckoutUrl(body);
    return { ok: response.ok && body?.success !== false && Boolean(urlFromBody), checkoutUrl: urlFromBody, status: response.status, body, endpoint: url };
  }

  async function startCheckout() {
    if (authLoading) { setNotice("Loading account."); return; }
    setCheckoutLoading(true);
    setError("");
    setDebug(null);
    setNotice("Opening Stripe checkout.");
    try {
      const token = authToken(user);
      if (!token) throw new Error("Checkout token missing. Please sign in again.");

      if (addonOnlyGrowthCheckout) {
        await postAddonCheckout({ token, addon: "command_growth_pack", country, quantity: Number(growthPacks || 1) });
        return;
      }

      if (addonOnlyAccountingCheckout) {
        await postAddonCheckout({ token, addon: "xero_addon", country, quantity: 1 });
        return;
      }

      postCheckoutForm({ token, plan: selected.backendPlan, country, accountingSync: accountingSelected, growthPacks });
    } catch (err) {
      setNotice("Checkout needs attention.");
      setError(err?.message || "Stripe checkout could not be opened.");
      setCheckoutLoading(false);
    }
  }

  const selectedIncludes = selected.includes || selected.features || [];
  const planComparison = [["Start", "Solo owner", "Run jobs, clients, quotes and invoices."], ["Crew", "Small team", "Add workers, schedule flow and team handover."], ["Operator", "Recommended", "AI prepares admin. You approve."], ["Command", "Bigger crew", "Accounting sync included, payroll workspace and scale controls."]];

  return (
    <section className="freshPricingPage freshPricingPageV2" data-checkout-trace={CHECKOUT_TRACE_MARKER}>
      <header className="freshPricingHero freshPricingHeroV2">
        <div>
          <span className="freshDarkPanelPill">Churvox pricing</span>
          <h1>Plans</h1>
          <p>Choose the plan that fits your business. Start simple, add crew tools, or use Operator where Churvox prepares admin and you approve.</p>
          <div className="freshPricingHeroActions"><button className="freshPrimary" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("support")}>Ask which plan fits</button></div>
          <label className="freshCountrySelect"><span className="freshDarkPanelPill">Pricing country</span><select value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))}>{COUNTRY_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.label} · {item.currency}</option>)}</select></label>
        </div>
        <aside className="freshCurrentPlanBox">
          <small className="freshDarkPanelPill" style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1, fontWeight: 900 }}>Current plan</small>
          <strong>{current ? current.name : checkingPlan || authLoading ? "Checking plan" : "No plan chosen"}</strong>
          <p>{checkingPlan && current ? `${notice} Current plan stays visible.` : notice}</p>
          {current ? <button type="button" onClick={() => choosePlan(current.id)}>View current plan</button> : <button type="button" onClick={() => loadPlan({ force: true })}>Reload current plan</button>}
        </aside>
      </header>

      <section className="freshPlanNotice proper freshPlanNoticeV2"><b>14-day trial</b><span>Start testing Churvox with real jobs, clients, quotes and invoices. Billing actions stay owner-approved.</span></section>
      <section className="freshPlanNotice proper freshPlanNoticeV2"><b>Safe money rules</b><span>Invoices stay draft-only until approved. Accounting sync is owner-approved. Churvox keeps invoices approval-only, mark paid, file tax or create payment files.</span></section>

      {error && !/not authenticated|401|403/i.test(error) && <section className="freshCard freshNotice need"><b>Plans need attention</b><span>{error}</span></section>}

      <section className="freshPricingCards freshPricingCardsV2">
        {pricedPlans.map((plan) => {
          const active = selectedPlan === plan.id;
          const isCurrent = Boolean(displayPlan) && displayPlan === plan.id;
          return <button type="button" key={plan.id} className={`freshPricingCard freshPricingCardV2 ${active ? "active" : ""} ${plan.id === "operator" ? "best" : ""}`} onClick={() => choosePlan(plan.id)}><span className="freshPlanTag">{plan.tag}</span>{isCurrent && <span className="freshCurrentBadge">Current</span>}<strong>{plan.name}</strong><em>{plan.priceLabel}<small>{plan.taxInclusiveLabel ? ` · ${plan.taxInclusiveLabel}` : ""}</small></em><h3>{plan.headline}</h3><p>{plan.summary}</p><small className="freshPlanLimit">{plan.limit}</small><div className="freshPlanIncludedTitle">Included</div><ul>{plan.includes.slice(0, 6).map((feature) => <li key={feature}>✓ {feature}</li>)}</ul></button>;
        })}
      </section>

      <section className="freshPricingDetail freshPricingDetailV2">
        <section className="freshCard freshSelectedPlanCard freshSelectedPlanCardV2">
          <div className="freshSelectedPlanTop"><div><span>Selected plan</span><h2>{selected.name}</h2><p>{selected.summary}</p></div><strong>{money(monthlyTotal, country)}<small>/month {countryMeta.taxLabel}</small></strong></div>
          <div className="freshPlanBreakdown"><div><b>Base plan</b><span>{selected.name}</span><strong>{samePlanSelected ? "Already active" : money(selected.price, country)}</strong></div><div><b>Accounting sync</b><span>{accountingIncluded ? "Included with Command" : accountingSync ? "Add-on selected" : "Optional add-on"}</span><strong>{accountingAddonTotal ? money(accountingAddonTotal, country) : accountingIncluded ? "Included" : money(pricedAccountingAddon.monthly, country)}</strong></div><div><b>Growth packs</b><span>{commandSelected ? `${growthPacks} selected` : "Only for Command"}</span><strong>{growthTotal ? money(growthTotal, country) : money(0, country)}</strong></div></div>
          <section className="freshPlanSection"><h3>What you get on {selected.name}</h3><div className="freshPlanFeatures premium">{selectedIncludes.map((feature) => <div key={feature}><b>✓</b><span>{feature}</span></div>)}</div></section>
          <section className="freshPlanSection"><h3>Add-ons</h3><div className="freshAddOnGrid"><button type="button" className={`freshAddOnCard ${accountingSelected ? "active" : ""}`} onClick={() => { if (!accountingIncluded) setAccountingSync((value) => !value); }}><b>Accounting Sync Add-on</b><span>{accountingIncluded ? "Included with Command" : pricedAccountingAddon.priceLabel}</span><p>MYOB or Xero, where available. Owner-approved draft invoice sync only.</p></button><button type="button" className={`freshAddOnCard ${commandSelected ? "active" : "locked"}`} onClick={() => { if (!commandSelected) choosePlan("command"); }}><b>Command Growth Pack</b><span>{pricedGrowthPack.priceLabel}</span><p>Adds 50 active team members plus extra job, AI action, automation and admin capacity.</p></button></div>{commandSelected && <div className="freshGrowthPack premium freshGrowthPackV2"><div><b>Command Growth Pack</b><span>Command includes 50 active team members. Each pack adds 50 more active team members.</span></div><div className="freshGrowthControls"><button type="button" onClick={() => setGrowthPacks((count) => Math.max(0, count - 1))}>−</button><strong>{growthPacks}</strong><button type="button" onClick={() => setGrowthPacks((count) => count + 1)}>+</button></div></div>}</section>
        </section>
        <aside className="freshCard freshCheckoutCard freshCheckoutCardV2"><span>Buy / update</span><h2>{selected.name}</h2><strong>{money(monthlyTotal, country)}<small>/month {countryMeta.taxLabel}</small></strong><p>Stripe opens securely using {countryMeta.label} pricing. If this is only an add-on for your current plan, checkout charges the add-on only.</p><div className="freshActions"><button className="freshDark" type="button" onClick={startCheckout} disabled={checkoutLoading || authLoading}>{checkoutLoading ? "Opening Stripe..." : "Buy selected plan"}</button><button className="freshOrange" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button><button className="freshGhost" type="button" onClick={() => loadPlan({ force: true })} disabled={authLoading || checkingPlan}>{checkingPlan ? "Checking…" : "Reload current plan"}</button></div><div className="freshItem"><b>Checkout total</b><span>{checkoutModeLabel}</span></div><div className="freshItem"><b>Best default</b><span>Operator is the main plan because AI prepares the admin and the owner approves.</span></div><div className="freshItem need"><b>Command scale</b><span>Command includes up to 50 active team members. Inactive old staff should not count as billable.</span></div></aside>
      </section>

      <section className="freshCard freshPlanLogicCard">
        <div className="freshPlanLogicHead">
          <span>Plan logic</span>
          <h2>What opens on each tier</h2>
          <p>One rule set controls the owner workspace: Open, Locked, Add-on, Included, or Growth Pack only.</p>
        </div>
        <div className="freshPlanLogicTable">
          <div className="head">Area</div>
          <div className="head">Start</div>
          <div className="head">Crew</div>
          <div className="head">Operator</div>
          <div className="head">Command</div>
          {PLAN_FEATURE_MATRIX.map((row) => (
            <React.Fragment key={row.area}>
              <div className="area">{row.area}</div>
              <div>{row.start}</div>
              <div>{row.crew}</div>
              <div>{row.operator}</div>
              <div>{row.command}</div>
            </React.Fragment>
          ))}
        </div>
      </section>

      {showDebug && debug && <section className="freshCard freshNotice" style={{ marginTop: 14 }}><b>Checkout diagnostic</b><span style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12 }}>{JSON.stringify(debug, null, 2).slice(0, 1800)}</span></section>}
      <section className="freshCard freshCompareCard freshCompareCardV2"><h2>Simple comparison</h2><div className="freshCompareGrid">{planComparison.map(([name, fit, value]) => <div key={name}><b>{name}</b><span>{fit}</span><p>{value}</p></div>)}</div></section>
    </section>
  );
}
