import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../lib/apiBase";
import "./OfficeTeamPlansScreen.css";
import "./OfficeTeamPlansActions.css";

const COUNTRIES = {
  NZ: { label: "New Zealand", currency: "NZD", symbol: "$", taxName: "GST", taxRate: 0.15, note: "GST is shown before checkout." },
  AU: { label: "Australia", currency: "AUD", symbol: "A$", taxName: "GST", taxRate: 0.10, note: "GST is shown before checkout." },
  US: { label: "United States", currency: "USD", symbol: "US$", taxName: "tax", taxRate: 0, note: "Sales tax, if required, is handled at checkout." },
  UK: { label: "United Kingdom", currency: "GBP", symbol: "£", taxName: "VAT", taxRate: 0.20, note: "VAT is shown before checkout." },
};

const STORAGE_KEY = "churvox:billing-country";
const EMAIL_STORAGE_KEY = "churvox:billing-email";
const GROWTH_PACK_CHECKOUT_MARKER = "churvox-growth-pack-checkout-20260713a";
const CHECKOUT_PLAN_KEYS = { Start: "solo", Crew: "team", Operator: "pro", Command: "enterprise" };
const CHECKOUT_ENDPOINTS = [
  "/billing/create-checkout-session",
  "/stripe/create-checkout-session",
  "/billing/checkout",
  "/stripe/checkout",
];

const plans = [
  {
    name: "Start",
    price: 39,
    tag: "Solo control",
    summary: "For a solo or small service operator who needs the basics tidy.",
    bestFor: "One owner, simple jobs, clear client records.",
    included: ["Clients", "Work tracking", "Basic office queue", "Quotes and invoices", "Owner review before send"],
    locked: ["Workers and team runs", "Timers", "Command queue", "Office Team review", "Xero/accounting approval", "Payroll", "Command Growth Pack"],
  },
  {
    name: "Crew",
    price: 89,
    tag: "Small team",
    summary: "For a small team that needs staff updates and job visibility.",
    bestFor: "Workers, timers, daily run view and simple team control.",
    included: ["Everything in Start", "Team / workers", "Timers", "Daily run view", "Worker updates", "Simple staff visibility"],
    locked: ["Full Command queue", "Office Team review", "Advanced approvals", "Xero/accounting sync approval", "Payroll controls", "Command Growth Pack"],
  },
  {
    name: "Operator",
    price: 149,
    tag: "Most useful",
    summary: "For a busy service business that needs office admin help.",
    bestFor: "Owners who want Churvox preparing admin while they approve the decisions.",
    included: ["Everything in Crew", "Command queue", "Office Team review", "Follow-ups and reminders", "Worker-to-owner updates", "Prepared admin cards"],
    locked: ["Advanced Command", "Accounting export/sync approval", "50 active team members", "Command Growth Pack", "Full owner approval desk capacity"],
  },
  {
    name: "Command",
    price: 299,
    tag: "Full approval desk",
    summary: "For owners who want the full Churvox approval desk and bigger team capacity.",
    bestFor: "Larger teams, deeper owner control, accounting approval and the full Command model.",
    included: ["Everything in Operator", "Advanced Command", "Accounting export/sync approval", "50 active team members", "Full owner approval desk", "More capacity"],
    locked: ["Extra team capacity needs Growth Pack", "Nothing auto-sends", "Nothing auto-syncs", "Nothing auto-charges", "Nothing changes records without owner approval"],
  },
];

const growthPack = {
  name: "Command Growth Pack",
  price: 99,
  summary: "Add more capacity to Command when the business grows.",
  included: ["Extra active team capacity", "More room for larger operations", "Keeps Command as the approval desk"],
  locked: ["Only available with Command", "Does not bypass owner approval", "Does not auto-send, auto-sync or auto-charge"],
};

export default function OfficeTeamPlansScreen() {
  const [country, setCountry] = useState(() => detectCountry());
  const [selected, setSelected] = useState("Operator");
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [billingAccount, setBillingAccount] = useState({ loading: true, hasStripeCustomer: false, hasSubscription: false, status: "", currentPlan: "" });
  const [packQuantity, setPackQuantity] = useState(1);
  const [growthPackBusy, setGrowthPackBusy] = useState(false);
  const [growthPackError, setGrowthPackError] = useState("");
  const [growthPackNotice, setGrowthPackNotice] = useState("");
  const [growthPackStatus, setGrowthPackStatus] = useState(() => ({ loading: true, currentPlan: readStoredPlan(), activePacks: 0 }));
  const meta = COUNTRIES[country] || COUNTRIES.NZ;
  const plan = plans.find((item) => item.name === selected) || plans[2];
  const selectedPricing = priceParts(meta, plan.price);
  const currentPlan = normalizePlanKey(growthPackStatus.currentPlan || readStoredPlan());
  const planKnown = Boolean(currentPlan);
  const commandActive = currentPlan === "command";
  const activePacks = Math.max(0, Number(growthPackStatus.activePacks || 0));
  const packAddsTeam = packQuantity * 50;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, country); } catch {}
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("country") !== country) {
        url.searchParams.set("country", country);
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch {}
  }, [country]);

  const countryOptions = useMemo(() => Object.entries(COUNTRIES), []);

  useEffect(() => {
    let cancelled = false;
    async function loadGrowthPackStatus() {
      const headers = { Accept: "application/json", ...tokenHeaders() };
      const [usageResult, addonResult] = await Promise.allSettled([
        fetch(apiUrl("/plan/usage"), { credentials: "include", headers }),
        fetch(apiUrl("/billing/addons"), { credentials: "include", headers }),
      ]);
      if (cancelled) return;
      let nextPlan = readStoredPlan();
      let nextPacks = 0;
      if (usageResult.status === "fulfilled") {
        const body = await usageResult.value.json().catch(() => ({}));
        if (usageResult.value.ok && body?.success !== false) nextPlan = normalizePlanKey(body?.plan || body?.current_plan || nextPlan);
      }
      if (addonResult.status === "fulfilled") {
        const body = await addonResult.value.json().catch(() => ({}));
        if (addonResult.value.ok && body?.success !== false) nextPacks = Number(body?.extra_user_blocks ?? body?.growth_packs ?? 0) || 0;
      }
      setGrowthPackStatus({ loading: false, currentPlan: nextPlan, activePacks: nextPacks });
    }
    loadGrowthPackStatus().catch(() => {
      if (!cancelled) setGrowthPackStatus((current) => ({ ...current, loading: false }));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadBillingAccount() {
      try {
        const response = await fetch(apiUrl("/billing/subscription-status"), {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", ...tokenHeaders() },
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || "Billing status unavailable");
        const source = billingAccountSource(body);
        if (!cancelled) setBillingAccount({
          loading: false,
          hasStripeCustomer: Boolean(source.stripe_customer_id || source.stripeCustomerId),
          hasSubscription: Boolean(source.stripe_subscription_id || source.stripeSubscriptionId),
          status: String(source.subscription_status || source.billing_status || source.stripe_status || source.status || "").trim().toLowerCase(),
          currentPlan: normalizePlanKey(source.ui_plan || source.current_plan || source.plan || source.subscription_plan || source.billing_plan || source.tier || ""),
        });
      } catch {
        if (!cancelled) setBillingAccount((current) => ({ ...current, loading: false }));
      }
    }
    loadBillingAccount();
    return () => { cancelled = true; };
  }, []);

  async function openBillingPortal() {
    if (billingBusy) return;
    setBillingBusy(true);
    setBillingError("");
    try {
      const response = await fetch(apiUrl("/billing/create-portal-session"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...tokenHeaders() },
        body: JSON.stringify({ return_url: `${window.location.origin}/dashboard#plans`, source: "owner_plans_manage_billing" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || `Billing portal returned HTTP ${response.status}`);
      const portalUrl = body?.url || body?.portal_url || body?.session_url || body?.data?.url;
      if (!portalUrl) throw new Error("Stripe billing portal URL was not returned.");
      const secureUrl = new URL(portalUrl, window.location.origin);
      if (secureUrl.protocol !== "https:") throw new Error("Billing portal did not return a secure URL.");
      window.location.assign(secureUrl.toString());
    } catch (error) {
      setBillingError(error?.message || "Billing management could not open. No plan was changed and nothing was charged.");
      setBillingBusy(false);
    }
  }

  async function openBilling() {
    if (billingBusy) return;
    setBillingBusy(true);
    setBillingError("");

    const displayPlan = plan.name.toLowerCase();
    const stripePlan = CHECKOUT_PLAN_KEYS[plan.name] || displayPlan;
    const ownerEmail = readStoredEmail();

    try {
      localStorage.setItem(STORAGE_KEY, country);
      localStorage.setItem("churvox:selected-plan", displayPlan);
      localStorage.setItem("churvox:billing-plan", displayPlan);
      if (ownerEmail) localStorage.setItem(EMAIL_STORAGE_KEY, ownerEmail);
    } catch {}

    const returnBase = `${window.location.origin}/dashboard`;
    const payload = {
      plan: stripePlan,
      plan_key: displayPlan,
      selected_plan: displayPlan,
      tier: stripePlan,
      plan_name: plan.name,
      action: "start_trial",
      country,
      billing_country: country,
      currency: meta.currency,
      email: ownerEmail,
      billing_interval: "monthly",
      interval: "month",
      success_url: `${returnBase}?checkout=success&plan=${encodeURIComponent(displayPlan)}#plans`,
      cancel_url: `${returnBase}?checkout=cancelled&plan=${encodeURIComponent(displayPlan)}#plans`,
      metadata: {
        display_plan: displayPlan,
        stripe_plan: stripePlan,
        source: "new_owner_plans_screen",
      },
    };

    let lastError = null;
    for (const endpoint of CHECKOUT_ENDPOINTS) {
      try {
        const response = await fetch(apiUrl(endpoint), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...tokenHeaders() },
          body: JSON.stringify(payload),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body?.success === false) {
          throw new Error(body?.detail || body?.error || body?.message || `Billing returned HTTP ${response.status}`);
        }
        const checkoutUrl = body?.url || body?.checkout_url || body?.session_url || body?.checkoutSession?.url || body?.data?.url;
        if (!checkoutUrl) throw new Error("Stripe checkout URL was not returned.");
        const secureUrl = new URL(checkoutUrl, window.location.origin);
        if (secureUrl.protocol !== "https:") throw new Error("Billing did not return a secure checkout URL.");
        window.location.assign(secureUrl.toString());
        return;
      } catch (error) {
        lastError = error;
      }
    }

    setBillingError(lastError?.message || "Secure billing could not open. No plan was changed and nothing was charged.");
    setBillingBusy(false);
  }

  function chooseCommandForPacks() {
    setSelected("Command");
    setGrowthPackError("");
    setGrowthPackNotice("Growth Packs are only available with Command. Command is now selected—complete the Command checkout first, then return here to buy packs.");
    window.setTimeout(() => document.querySelector(".cvPlanBillingAction")?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
  }

  async function openGrowthPackCheckout() {
    if (growthPackBusy) return;
    if (planKnown && !commandActive) {
      chooseCommandForPacks();
      return;
    }
    setGrowthPackBusy(true);
    setGrowthPackError("");
    setGrowthPackNotice("");
    try {
      const response = await fetch(apiUrl("/billing/create-addon-checkout-session"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...tokenHeaders() },
        body: JSON.stringify({
          addon: "command_growth_pack",
          addon_key: "command_growth_pack",
          country,
          quantity: packQuantity,
          growth_packs: packQuantity,
          packs: packQuantity,
          source: "new_owner_plans_screen",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `Growth Pack checkout returned HTTP ${response.status}`);
      const checkoutUrl = body?.url || body?.checkout_url || body?.session_url || body?.data?.url;
      if (!checkoutUrl) throw new Error("Stripe did not return a Growth Pack checkout URL.");
      const secureUrl = new URL(checkoutUrl, window.location.origin);
      if (secureUrl.protocol !== "https:") throw new Error("Growth Pack checkout did not return a secure URL.");
      window.location.assign(secureUrl.toString());
    } catch (error) {
      const message = error?.message || "Growth Pack checkout could not open. Nothing was charged.";
      setGrowthPackError(message);
      if (/Command Growth Pack needs the Command plan|Command plan/i.test(message)) setGrowthPackNotice("Choose Command first, complete that plan checkout, then buy the Growth Pack here.");
      setGrowthPackBusy(false);
    }
  }

  return (
    <section className="cvSiteScreen cvPlansScreen">
      <header className="cvPlansHero">
        <div>
          <span>Plans</span>
          <h2>Choose the level of control Churvox runs for the business.</h2>
          <p>Compare what is included and locked here. Selecting a card does not change billing; Stripe opens only when you continue.</p>
        </div>
        <aside className="cvPlanCountryCard">
          <label>
            <span>Choose billing country</span>
            <select value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))}>
              {countryOptions.map(([code, item]) => <option key={code} value={code}>{item.label} · {item.currency}</option>)}
            </select>
          </label>
          <strong>{meta.currency} pricing</strong>
          <small>{meta.taxRate ? `${meta.taxName} rate shown: ${Math.round(meta.taxRate * 100)}%. ${meta.note}` : meta.note}</small>
        </aside>
      </header>

      <div className="cvPlansGrid">
        {plans.map((item) => {
          const pricing = priceParts(meta, item.price);
          return (
            <button key={item.name} className={`${selected === item.name ? "active" : ""} ${item.name === "Operator" ? "featured" : ""}`} onClick={() => setSelected(item.name)} type="button">
              <em>{item.tag}</em>
              <span>{item.name}</span>
              <PriceBlock pricing={pricing} taxName={meta.taxName} />
              <p>{item.summary}</p>
              <FeatureList title="Included in this plan" items={item.included} tone="included" />
              <FeatureList title="Locked until upgrade" items={item.locked} tone="locked" />
            </button>
          );
        })}
      </div>

      <aside className="cvPlanDetail">
        <div>
          <span>Selected for comparison</span>
          <h3>{plan.name}</h3>
          <PriceBlock pricing={selectedPricing} taxName={meta.taxName} compact />
          <p>{plan.bestFor}</p>
          <small>Country: {meta.label} · Currency: {meta.currency}</small>
        </div>
        <section>
          <b>What you get</b>
          <FeatureList title="Included" items={plan.included} tone="included" />
        </section>
        <section>
          <b>Still locked</b>
          <FeatureList title="Locked" items={plan.locked} tone="locked" />
        </section>
      </aside>

      <section className="cvGrowthPackCard">
        <div>
          <span>Add-on</span>
          <h3>{growthPack.name}</h3>
          <p>{growthPack.summary}</p>
        </div>
        <PriceBlock pricing={priceParts(meta, growthPack.price)} taxName={meta.taxName} compact />
        <FeatureList title="Adds" items={growthPack.included} tone="included" />
        <FeatureList title="Locked rules" items={growthPack.locked} tone="locked" />
        <aside className="cvGrowthPackBuy" data-growth-pack-checkout={GROWTH_PACK_CHECKOUT_MARKER}>
          <div>
            <span>Buy Growth Packs</span>
            <h4>{commandActive ? "Add more Command capacity now" : planKnown ? "Command plan required" : "Add more Command capacity"}</h4>
            <p>Each pack adds 50 active team members, 1,500 jobs per month and 1,000 AI actions. Active packs: <b>{growthPackStatus.loading ? "Checking…" : activePacks}</b>.</p>
          </div>
          <label>
            <span>Number of packs</span>
            <select value={packQuantity} onChange={(event) => setPackQuantity(Math.max(1, Number(event.target.value || 1)))} disabled={growthPackBusy}>
              {[1, 2, 3, 4, 5].map((quantity) => <option key={quantity} value={quantity}>{quantity} pack{quantity === 1 ? "" : "s"} · +{quantity * 50} team</option>)}
            </select>
          </label>
          <div className="cvGrowthPackBuyAction">
            <strong>{priceParts(meta, growthPack.price * packQuantity).ex}<small>/month ex {meta.taxName}</small></strong>
            <button type="button" onClick={openGrowthPackCheckout} disabled={growthPackBusy}>
              {growthPackBusy ? "Opening Stripe…" : planKnown && !commandActive ? "Select Command to buy packs" : `Buy ${packQuantity} Growth Pack${packQuantity === 1 ? "" : "s"}`}
            </button>
            <small>Adds {packAddsTeam} active team member spaces. Stripe opens before any charge.</small>
          </div>
          {growthPackNotice ? <p className="cvGrowthPackNotice" role="status">{growthPackNotice}</p> : null}
          {growthPackError ? <p className="cvGrowthPackError" role="alert">{growthPackError}</p> : null}
        </aside>
      </section>

      <section className="cvPlanBillingAction">
        <div>
          <span>{billingAccount.hasStripeCustomer ? "Current subscription" : "Secure checkout"}</span>
          <h3>{billingAccount.hasStripeCustomer ? `${displayPlanName(billingAccount.currentPlan || currentPlan)} billing` : `Continue with ${plan.name}`}</h3>
          <p>{billingAccount.hasStripeCustomer ? "Open Stripe’s secure customer portal to update payment details, review invoices or manage the current subscription. Churvox does not change the plan until Stripe confirms it." : "Open Stripe Checkout for the selected plan. You return to this new Plans screen after checkout or cancellation."}</p>
          {billingAccount.hasStripeCustomer && billingAccount.status ? <small>Subscription status: {billingAccount.status.replaceAll("_", " ")}</small> : null}
          {billingError ? <small className="cvPlanBillingError" role="alert">{billingError}</small> : null}
        </div>
        {billingAccount.hasStripeCustomer
          ? <button type="button" onClick={openBillingPortal} disabled={billingBusy}>{billingBusy ? "Opening Stripe…" : "Manage billing"}</button>
          : <button type="button" onClick={openBilling} disabled={billingBusy || billingAccount.loading}>{billingBusy ? "Opening Stripe…" : billingAccount.loading ? "Checking billing…" : "Continue to secure checkout"}</button>}
      </section>
    </section>
  );
}

function PriceBlock({ pricing, taxName, compact = false }) {
  return (
    <strong className={`cvPlanPrice ${compact ? "compact" : ""}`}>
      <b>{pricing.ex}</b>
      <small>/month ex {taxName}</small>
      {pricing.tax ? <span>{pricing.inc}/month incl. {taxName}</span> : <span>{pricing.note}</span>}
      {pricing.tax ? <em>{taxName}: {pricing.tax}/month</em> : null}
    </strong>
  );
}

function FeatureList({ title, items, tone }) {
  return (
    <section className={`cvPlanFeatureList ${tone}`}>
      <b>{title}</b>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}

function apiUrl(path) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  return `${base}/api${path}`;
}

function tokenHeaders() {
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function readStoredEmail() {
  try {
    const direct = String(localStorage.getItem(EMAIL_STORAGE_KEY) || "").trim().toLowerCase();
    if (direct) return direct;
    const snapshot = JSON.parse(localStorage.getItem("churvox_auth_session_snapshot_v1") || "{}");
    return String(snapshot?.user?.email || snapshot?.email || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function detectCountry() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const country = params.get("country");
    if (country) return normalizeCountry(country);
  } catch {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeCountry(stored);
  } catch {}
  return "NZ";
}

function normalizeCountry(value) {
  const raw = String(value || "").trim().toUpperCase();
  const aliases = { NZ: "NZ", NZL: "NZ", "NEW ZEALAND": "NZ", AU: "AU", AUS: "AU", AUSTRALIA: "AU", US: "US", USA: "US", UK: "UK", GB: "UK", GBR: "UK" };
  return aliases[raw] || "NZ";
}

function normalizePlanKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  return { solo: "start", start: "start", team: "crew", crew: "crew", pro: "operator", operator: "operator", enterprise: "command", command: "command" }[raw] || "";
}

function displayPlanName(value) {
  const plan = normalizePlanKey(value);
  return { start: "Start", crew: "Crew", operator: "Operator", command: "Command" }[plan] || "Current plan";
}

function billingAccountSource(body = {}) {
  const nested = body?.user || body?.account || body?.subscription || body?.data;
  return nested && typeof nested === "object" ? { ...body, ...nested } : body;
}

function readStoredPlan() {
  try {
    const snapshot = JSON.parse(localStorage.getItem("churvox_auth_session_snapshot_v1") || "{}");
    const user = snapshot?.user || snapshot || {};
    const direct = user?.ui_plan || user?.current_plan || user?.plan || user?.subscription_plan || user?.billing_plan || user?.tier || localStorage.getItem("churvox:stable-current-plan:v1") || localStorage.getItem("churvox:selected-plan") || "";
    return normalizePlanKey(direct);
  } catch {
    return "";
  }
}

function priceParts(meta, amount) {
  const ex = Number(amount || 0);
  const tax = meta.taxRate ? roundMoney(ex * meta.taxRate) : 0;
  const inc = roundMoney(ex + tax);
  return {
    ex: money(meta, ex),
    tax: tax ? money(meta, tax) : "",
    inc: money(meta, inc),
    note: meta.taxRate ? `${meta.taxName} shown before checkout` : "Tax handled at checkout if required",
  };
}

function money(meta, value) {
  const rounded = roundMoney(value);
  return `${meta.symbol}${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}`;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
