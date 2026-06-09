import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { industrialChip } from "../components/industrialCommandTheme";
import {
  CHURVOX_PLANS,
  COMMAND_GROWTH_PACK,
  XERO_ADDON,
  COUNTRY_OPTIONS,
  normaliseCountry,
  getCountryMeta,
  pricingNotesForCountry,
  getPlan,
  hasPlanAtLeast,
  nicePlanName
} from "../config/churvoxPlans";

const colors = {
  solo: "#22d3ee",
  team: "#34d399",
  pro: "#fb923c",
  enterprise: "#a78bfa"
};

const LOCAL_PLAN_PRICES = {
  NZ: { solo: 39, team: 89, pro: 149, enterprise: 299 },
  AU: { solo: 35, team: 79, pro: 129, enterprise: 249 },
  US: { solo: 25, team: 55, pro: 95, enterprise: 189 },
  UK: { solo: 19, team: 45, pro: 75, enterprise: 149 }
};

const LOCAL_ADDON_PRICES = {
  NZ: { xero_addon: 39, command_growth_pack: 99 },
  AU: { xero_addon: 35, command_growth_pack: 79 },
  US: { xero_addon: 25, command_growth_pack: 59 },
  UK: { xero_addon: 19, command_growth_pack: 45 }
};

const COUNTRY_SYMBOLS = {
  NZ: "NZ$",
  AU: "A$",
  US: "US$",
  UK: "£"
};

function checkoutUrl(res) {
  return res?.data?.url || res?.data?.checkout_url || res?.url || res?.checkout_url || "";
}

function isSubscribed(user) {
  return Boolean(user?.stripe_subscription_id || user?.subscription_status === "active");
}

function formatDate(value) {
  if (!value) return "Not set";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

function trialText(user) {
  if (isSubscribed(user)) return "Paid subscription active";
  if (!user?.trial_ends_at) return "Trial status not set";
  const end = new Date(user.trial_ends_at);
  if (Number.isNaN(end.getTime())) return "Trial date not readable";
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  return days < 0
    ? `Trial ended ${formatDate(user.trial_ends_at)}`
    : `${days} day${days === 1 ? "" : "s"} left · ends ${formatDate(user.trial_ends_at)}`;
}

function localSymbol(countryCode) {
  const code = normaliseCountry(countryCode);
  return COUNTRY_SYMBOLS[code] || "NZ$";
}

function localPlan(plan, countryCode) {
  const code = normaliseCountry(countryCode);
  const country = getCountryMeta(code);
  const amount = LOCAL_PLAN_PRICES[code]?.[plan.key] ?? plan.monthly ?? plan.price ?? 0;
  const symbol = localSymbol(code);
  const taxLabel = country.taxLabel || "";
  return {
    ...plan,
    countryCode: code,
    countryLabel: country.label,
    currency: country.currency,
    symbol,
    taxLabel,
    price: amount,
    monthly: amount,
    period: "month",
    interval: "month",
    priceLabel: `${symbol}${amount}/month${taxLabel ? ` ${taxLabel}` : ""}`,
    formattedPrice: `${symbol}${amount}/month${taxLabel ? ` ${taxLabel}` : ""}`
  };
}

function localAddon(addon, countryCode) {
  const code = normaliseCountry(countryCode);
  const country = getCountryMeta(code);
  const key = addon.key || addon.code || "";
  const amount = LOCAL_ADDON_PRICES[code]?.[key] ?? addon.monthly ?? addon.price ?? 0;
  const symbol = localSymbol(code);
  const taxLabel = country.taxLabel || "";
  return {
    ...addon,
    countryCode: code,
    countryLabel: country.label,
    currency: country.currency,
    symbol,
    taxLabel,
    price: amount,
    monthly: amount,
    period: "month",
    interval: "month",
    priceLabel: `${symbol}${amount}/month${taxLabel ? ` ${taxLabel}` : ""}`,
    formattedPrice: `${symbol}${amount}/month${taxLabel ? ` ${taxLabel}` : ""}`
  };
}

function displayPrice(item) {
  const amount = Number(item?.monthly || item?.price || 0);
  return `${item?.symbol || "NZ$"}${amount}`;
}

function displayPeriod(item) {
  return `/month${item?.taxLabel ? ` ${item.taxLabel}` : ""}`;
}

function DarkCard({ children, color = "#fb923c", className = "" }) {
  return (
    <article className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#111827,#070d16)] p-5 pl-8 text-white shadow-[0_22px_62px_rgba(2,6,23,.24)] ${className}`}>
      <span className="absolute left-0 top-0 h-full w-2.5 rounded-l-[30px]" style={{ background: color }} />
      {children}
    </article>
  );
}

export default function PlansCommandPage() {
  const { user, checkAuth, hasAppAccess } = useAuth();
  const { get, post } = useApi();
  const [status, setStatus] = React.useState(null);
  const [addons, setAddons] = React.useState(null);
  const [busy, setBusy] = React.useState("");

  const initialCountry = normaliseCountry(
    localStorage.getItem("churvox_billing_country") ||
      user?.billing_country ||
      user?.business_country ||
      user?.country ||
      "NZ"
  );
  const [country, setCountry] = React.useState(initialCountry);

  const countryMeta = getCountryMeta(country);
  const countryPlans = CHURVOX_PLANS.map((plan) => localPlan(plan, country));
  const pricedXero = localAddon(XERO_ADDON, country);
  const pricedGrowth = localAddon(COMMAND_GROWTH_PACK, country);
  const notes = pricingNotesForCountry(country);
  const currentPlan = String(status?.plan || user?.plan || "solo").toLowerCase();
  const currentPlanData = getPlan(currentPlan);

  const setBillingCountry = (value) => {
    const next = normaliseCountry(value);
    setCountry(next);
    localStorage.setItem("churvox_billing_country", next);
  };

  const refreshPlan = React.useCallback(async () => {
    const [sub, add] = await Promise.allSettled([
      get("/billing/subscription-status"),
      get("/billing/addons")
    ]);

    if (sub.status === "fulfilled" && sub.value?.success) {
      const data = sub.value.data?.data || sub.value.data || {};
      setStatus(data);
      if (data.billing_country || data.country) setBillingCountry(data.billing_country || data.country);
    }

    if (add.status === "fulfilled" && add.value?.success) {
      setAddons(add.value.data || add.value);
    }

    await checkAuth?.();
  }, [get, checkAuth]);

  React.useEffect(() => {
    refreshPlan();
  }, [refreshPlan]);

  async function choosePlan(planKey) {
    if (!planKey) return;
    if (planKey === currentPlan && isSubscribed(user)) {
      toast.info("That is already your active plan");
      return;
    }

    setBusy(planKey);
    const res = await post("/billing/create-checkout-session", { plan: planKey, country });
    setBusy("");

    const url = checkoutUrl(res);
    if (res?.success && url) {
      window.location.href = url;
      return;
    }

    toast.error(res?.error || "Could not open Stripe Checkout. Add matching Stripe Price IDs for this country.");
  }

  async function buyAddon(addonKey) {
    setBusy(addonKey);
    const res = await post("/billing/create-addon-checkout-session", { addon: addonKey, country });
    setBusy("");

    const url = checkoutUrl(res);
    if (res?.success && url) {
      window.location.href = url;
      return;
    }

    toast.error(res?.error || "Could not open add-on checkout. Add matching country add-on Price IDs.");
  }

  const canBuyXero = hasPlanAtLeast(currentPlan, "pro");
  const canBuyGrowth = currentPlan === "enterprise";
  const reviewedAccess = [
    ["Current plan", currentPlanData?.name || nicePlanName(currentPlan) || "Not set"],
    ["Billing country", `${countryMeta.label} · ${countryMeta.currency}`],
    ["Trial", trialText(user || {})],
    ["App access", hasAppAccess ? "Allowed" : "Locked"]
  ];

  return (
    <main className="cv-launch-plans-page min-h-screen bg-[#f7f3ea] p-4 text-slate-950 md:p-6 xl:pl-[320px]" data-command-canvas>
      <section className="mx-auto max-w-7xl space-y-5">
        <section className="plansHero relative isolate overflow-hidden rounded-[34px] border-l-8 border-orange-500 bg-[radial-gradient(circle_at_86%_-24%,rgba(249,115,22,.52),transparent_34%),radial-gradient(circle_at_14%_116%,rgba(34,211,238,.18),transparent_30%),linear-gradient(135deg,#0b1018_0%,#111827_56%,#070b12_100%)] p-6 pl-9 text-white shadow-[0_24px_70px_rgba(2,6,23,.24)] md:p-8 md:pl-10">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.055)_0_1px,transparent_1px_56px),repeating-linear-gradient(0deg,rgba(255,255,255,.035)_0_1px,transparent_1px_46px),linear-gradient(120deg,transparent_0_46%,rgba(251,191,36,.13)_46%_47%,transparent_47%_100%)] opacity-70" />
          <div className="pointer-events-none absolute -right-20 -top-20 z-0 h-[250px] w-[250px] rounded-full border-[36px] border-orange-500/20" />
          <div className="relative z-10">
            <span className={industrialChip}>Plans</span>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox does the admin. You approve.</h1>
            <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-100 md:text-base">Pick your billing country first. Churvox now shows fixed local prices based on conversion-style rounded pricing.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/dashboard" className="rounded-2xl bg-[linear-gradient(135deg,#facc15,#fb923c_55%,#22d3ee)] px-5 py-3 text-sm font-black text-slate-950 no-underline">Command Board</Link>
              <button type="button" onClick={refreshPlan} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white">Refresh plan status</button>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border-2 border-orange-200 bg-[#111827] p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,.10)] md:p-6">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Billing country</div>
          <h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">Show prices for {countryMeta.label}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[320px_1fr]">
            <select
              value={country}
              onChange={(e) => setBillingCountry(e.target.value)}
              className="rounded-2xl border-2 border-orange-300 bg-slate-950 px-4 py-3 text-base font-black text-white outline-none"
              style={{ color: "#ffffff", backgroundColor: "#020617" }}
            >
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code} style={{ color: "#111827", backgroundColor: "#ffffff" }}>
                  {option.label} · {option.currency}{option.taxLabel ? ` ${option.taxLabel}` : ""}
                </option>
              ))}
            </select>
            <p className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black leading-6 text-white">
              Showing {countryMeta.currency} fixed local pricing. Stripe needs matching country Price IDs so checkout charges the same local amount.
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {reviewedAccess.map(([label, value], i) => (
            <DarkCard key={label} color={["#22d3ee", "#34d399", "#facc15", "#fb923c"][i]}>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div>
              <div className="mt-3 text-2xl font-black tracking-[-.05em] text-white">{value}</div>
            </DarkCard>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-4">
          {countryPlans.map((plan) => {
            const current = plan.key === currentPlan;
            return (
              <article key={plan.key} className={`relative overflow-hidden rounded-[30px] border border-slate-800 bg-[#0b1018] p-5 pl-7 text-white shadow-[0_22px_62px_rgba(2,6,23,.22)] ${plan.key === "pro" ? "ring-2 ring-orange-400" : ""}`}>
                <span className="absolute left-0 top-0 h-full w-2.5" style={{ background: plan.key === "pro" ? "#fb923c" : colors[plan.key] }} />
                {plan.key === "pro" ? <div className="absolute right-4 top-4 rounded-full bg-orange-400 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-950">Recommended</div> : null}
                <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-amber-200">{current ? "Current" : plan.tag}</div>
                <h2 className="mt-4 text-3xl font-black tracking-[-.06em]">{plan.name}</h2>
                <div className="mt-3 flex flex-wrap items-end gap-1">
                  <span className="text-5xl font-black tracking-[-.08em]">{displayPrice(plan)}</span>
                  <span className="pb-2 text-sm font-black text-slate-300">{displayPeriod(plan)}</span>
                </div>
                <p className="mt-4 text-sm font-bold leading-6 text-slate-300">{plan.summary}</p>
                <ul className="mt-5 grid gap-3">
                  {(plan.includes || []).slice(0, 7).map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm font-black leading-6">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-300 text-[10px] text-slate-950">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" disabled={busy === plan.key || current} onClick={() => choosePlan(plan.key)} className="mt-6 inline-flex w-full justify-center rounded-2xl bg-orange-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">
                  {busy === plan.key ? "Opening checkout…" : current ? "Current plan" : `Choose ${plan.name}`}
                </button>
              </article>
            );
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <DarkCard color="#22d3ee">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Accounting add-on</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-.05em] text-white">{pricedXero.name}</h2>
            <div className="mt-2 text-2xl font-black text-cyan-200">{displayPrice(pricedXero)} {displayPeriod(pricedXero)}</div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">{pricedXero.description}</p>
            <div className="mt-3 rounded-2xl bg-white/10 p-3 text-sm font-black text-white">Status: {addons?.xero_addon_active ? "Active" : "Not active"}</div>
            <button disabled={!canBuyXero || busy === pricedXero.key || addons?.xero_addon_active} onClick={() => buyAddon(pricedXero.key)} className="mt-4 rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">
              {addons?.xero_addon_active ? "Xero active" : canBuyXero ? "Add Xero" : "Needs Operator or Command"}
            </button>
          </DarkCard>

          <DarkCard color="#fb923c">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Scale add-on</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-.05em] text-white">{pricedGrowth.name}</h2>
            <div className="mt-2 text-2xl font-black text-cyan-200">{displayPrice(pricedGrowth)} {displayPeriod(pricedGrowth)}</div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">{pricedGrowth.description}</p>
            <div className="mt-3 rounded-2xl bg-white/10 p-3 text-sm font-black text-white">Active blocks: {addons?.extra_user_blocks || 0} · Extra team: {addons?.max_extra_team_members || 0}</div>
            <button disabled={!canBuyGrowth || busy === pricedGrowth.key} onClick={() => buyAddon(pricedGrowth.key)} className="mt-4 rounded-2xl bg-orange-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">
              {canBuyGrowth ? "Add Growth Pack" : "Needs Command plan"}
            </button>
          </DarkCard>
        </section>

        <section className="rounded-[30px] border-2 border-slate-300 bg-[#fffaf0] p-5 shadow-[0_18px_50px_rgba(15,23,42,.10)] md:p-6">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-700">Pricing notes</div>
          <h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">Operator is the main selling plan.</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {notes.map((note) => (
              <span key={note} className="rounded-2xl border-2 border-orange-200 bg-slate-950 px-4 py-3 text-xs font-black leading-5 text-white shadow-sm">{note}</span>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
