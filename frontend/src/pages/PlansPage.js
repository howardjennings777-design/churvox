import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";
import { detectCountryHint } from "../lib/country";

const fallbackPlans = [
  {
    key: "solo",
    name: "Solo",
    price: "$30",
    period: "/month",
    blurb: "Simple tools for owner-operators.",
    badge: "",
    limits: ["Up to 20 clients", "1 user included", "Jobs, quotes and invoices", "14-day free trial"],
  },
  {
    key: "team",
    name: "Team",
    price: "$70",
    period: "/month",
    blurb: "For small teams needing staff workflow.",
    badge: "Popular",
    limits: ["Up to 30 clients", "Up to 5 users", "Scheduling and team workflow", "Upgrade any time"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$110",
    period: "/month",
    blurb: "For busy crews needing more room.",
    badge: "Best value",
    limits: ["Up to 40 clients", "Up to 10 users", "Advanced workflow tools", "Priority-ready setup"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "$240",
    period: "/month",
    blurb: "For larger operations and heavier usage.",
    badge: "",
    limits: ["Includes 50 users", "Extra 50 users = $100", "MYOB-ready billing flow", "Best for larger operations"],
  },
];

function PlanCheck() {
  return <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600 shadow-sm shadow-blue-600/20" />;
}

export default function PlansPage() {
  const api = useApi();
  const [plans, setPlans] = useState(fallbackPlans);
  const [billing, setBilling] = useState(null);
  const [currentPlan, setCurrentPlan] = useState("none");
  const [busyPlan, setBusyPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutNotice, setCheckoutNotice] = useState(null);
  const [currencyInfo, setCurrencyInfo] = useState(null);

  const getPayload = (res) => {
    if (!res) return null;
    if (res.success === false) return res;
    if (res.data !== undefined) return res.data;
    return res;
  };

  const mergePlans = (apiPlans, currencyData) => {
    const base = (Array.isArray(apiPlans) && apiPlans.length > 0)
      ? fallbackPlans.map((fallback) => {
          const match = apiPlans.find((p) => {
            const key = String(p?.key || p?.plan_type || p?.name || "").toLowerCase();
            return key === fallback.key;
          });
          if (!match) return fallback;
          return {
            ...fallback,
            name: match.name || fallback.name,
            price: match.price || fallback.price,
            period: match.period || fallback.period,
            blurb: match.blurb || match.description || fallback.blurb,
            limits: Array.isArray(match.limits) && match.limits.length > 0 ? match.limits : fallback.limits,
            badge: match.badge || fallback.badge,
          };
        })
      : fallbackPlans;

    const priced = currencyData && currencyData.prices ? currencyData.prices : null;
    if (!priced) return base;
    return base.map((p) => {
      const info = priced[p.key];
      if (!info || info.amount === undefined) return p;
      return { ...p, price: info.display, currency: info.currency, symbol: info.symbol };
    });
  };

  useEffect(() => {
    const handleCheckoutReturn = async () => {
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("checkout");
      const plan = (params.get("plan") || "").toLowerCase();
      const sessionId = params.get("session_id") || "";

      if (checkout === "success") {
        try {
          if (plan && sessionId) {
            await api.post("/billing/confirm-checkout", { session_id: sessionId });
            window.dispatchEvent(new Event("churvox-auth-refresh"));
            setCurrentPlan(plan);
          }

          setCheckoutNotice({
            type: "success",
            title: "Plan updated",
            text: `Your ${plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : ""} plan is now active.`,
          });
        } catch (err) {
          console.error("Failed to confirm checkout:", err);
          setCheckoutNotice({
            type: "warning",
            title: "Checkout completed, but plan refresh failed",
            text: "Refresh the page once. If it still shows the old plan, try the upgrade again once.",
          });
        }
      } else if (checkout === "cancelled") {
        setCheckoutNotice({ type: "warning", title: "Checkout cancelled", text: "No changes were made to your plan." });
      }

      if (checkout) window.history.replaceState({}, document.title, `${window.location.pathname}`);
    };

    handleCheckoutReturn();
  }, []);

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      try {
        const hintCountry = detectCountryHint();
        const [plansRes, billingRes, currencyRes] = await Promise.all([
          api.get("/plan/all"),
          api.get("/billing/status"),
          api.get(`/billing/currency?country=${encodeURIComponent(hintCountry || "")}`),
        ]);

        const plansData = getPayload(plansRes);
        const billingData = getPayload(billingRes);
        const currencyData = getPayload(currencyRes);
        if (currencyData && currencyData.currency) setCurrencyInfo(currencyData);

        setPlans(Array.isArray(plansData) ? mergePlans(plansData, currencyData) : mergePlans(fallbackPlans, currencyData));

        if (billingData && billingData.success === false) {
          setBilling(null);
          setCurrentPlan("none");
        } else {
          setBilling(billingData || null);
          setCurrentPlan(billingData?.plan ? String(billingData.plan).toLowerCase() : "none");
        }
      } catch (err) {
        console.error("Failed to load plans:", err);
        setPlans(fallbackPlans);
        setBilling(null);
        setCurrentPlan("none");
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  const formatDate = (iso) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" }); }
    catch { return ""; }
  };

  const banner = useMemo(() => {
    if (billing?.trial_expired) return null;
    if (billing?.trial_active) {
      const days = billing?.days_left;
      return {
        title: `Free trial active${days || days === 0 ? ` · ${days} day${days === 1 ? "" : "s"} left` : ""}`,
        text: "No card required during trial. Upgrade any time before it ends.",
        classes: "border-blue-200 bg-blue-50 text-blue-900",
      };
    }
    return null;
  }, [billing]);

  const isTrialExpired = billing?.trial_expired === true;
  const isActiveTrial = billing?.trial_active === true;
  const isPaid = billing?.has_paid_subscription === true;
  const isNewUser = currentPlan === "none" || !currentPlan;
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const getButtonState = (planKey) => {
    const isCurrent = planKey === currentPlan;
    const isBusy = busyPlan === planKey;
    if (isBusy) return { disabled: true, label: isNewUser ? "Starting trial..." : "Opening checkout..." };
    if (isNewUser) return { disabled: false, label: `Start ${cap(planKey)} trial` };
    if (isTrialExpired) return { disabled: false, label: isCurrent ? `Continue with ${cap(planKey)}` : `Choose ${cap(planKey)}` };
    if (isPaid && isCurrent) return { disabled: true, label: "Current plan" };
    if (isActiveTrial && isCurrent) return { disabled: true, label: "Current trial" };
    return { disabled: false, label: `Choose ${cap(planKey)}` };
  };

  const handleSelectPlan = async (planKey) => {
    if (!planKey || busyPlan) return;
    if (isNewUser) {
      try {
        setBusyPlan(planKey);
        const res = await api.post("/billing/start-trial", { plan_type: planKey });
        const data = getPayload(res) || {};
        if (data.success) {
          window.dispatchEvent(new Event("churvox-auth-refresh"));
          setCurrentPlan(planKey);
          setCheckoutNotice({
            type: "success",
            title: "Trial started",
            text: `Your 14-day ${cap(planKey)} trial is active. No card required.`,
          });
          setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
        } else {
          throw new Error(data.detail || data.error || "Failed to start trial");
        }
      } catch (err) {
        console.error("Trial start failed:", err);
        alert(err?.response?.data?.detail || err?.message || "Failed to start trial");
      } finally {
        setBusyPlan("");
      }
      return;
    }

    try {
      setBusyPlan(planKey);
      const res = await api.post("/stripe/create-checkout-session", {
        plan_type: planKey,
        country: currencyInfo?.country || detectCountryHint() || "",
      });
      if (res?.success === false) throw new Error(res.error || "Failed to start checkout");
      const data = getPayload(res) || {};
      const url = data?.checkout_url || data?.url;
      if (!url) throw new Error("No checkout URL returned by server");
      window.location.assign(url);
    } catch (err) {
      console.error("Checkout failed:", err);
      alert(err?.response?.data?.detail || err?.data?.detail || err?.message || "Failed to start checkout");
    } finally {
      setBusyPlan("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef5ff] text-slate-900 flex items-center justify-center px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-500 shadow-xl">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,0.13),transparent_34%),linear-gradient(180deg,#eef5ff_0%,#f8fbff_48%,#edf3fb_100%)] px-4 py-7 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {isTrialExpired ? (
          <div className="mx-auto max-w-3xl rounded-[2rem] border border-amber-200 bg-white/95 p-6 text-center shadow-[0_24px_65px_rgba(15,23,42,0.10)] md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Trial ended</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Choose a plan to continue</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Your <span className="font-black text-slate-900">{cap(currentPlan)}</span> trial ended on <span className="font-black text-slate-900">{formatDate(billing?.trial_ends_at)}</span>.
            </p>
            <button
              type="button"
              onClick={() => handleSelectPlan(currentPlan)}
              disabled={busyPlan === currentPlan}
              className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="continue-plan-button"
            >
              {busyPlan === currentPlan ? "Opening checkout..." : `Continue with ${cap(currentPlan)}`}
            </button>
          </div>
        ) : (
          <section className="mx-auto max-w-4xl rounded-[2rem] border border-blue-100 bg-white/90 p-6 text-center shadow-[0_24px_65px_rgba(15,23,42,0.10)] backdrop-blur md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.20em] text-blue-600">Churvox plans</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Pick the plan that fits your business</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">Start with a 14-day free trial. No card required. Upgrade when you&apos;re ready.</p>
            {currencyInfo?.currency && (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 shadow-sm" data-testid="currency-badge" title={`Prices shown in ${currencyInfo.currency} (${currencyInfo.country}) — change by setting your business country in Settings.`}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Billed in <span className="font-black text-blue-950">{currencyInfo.currency}</span>
                <span className="text-blue-300">·</span>
                <span>{currencyInfo.country}</span>
              </div>
            )}
          </section>
        )}

        {checkoutNotice && (
          <div className={`mx-auto mt-5 max-w-3xl rounded-2xl border px-5 py-4 text-sm font-semibold shadow-sm ${checkoutNotice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            <div className="font-black">{checkoutNotice.title}</div>
            <div className="mt-1 opacity-90">{checkoutNotice.text}</div>
          </div>
        )}

        {banner && (
          <div className={`mx-auto mt-5 max-w-3xl rounded-2xl border px-5 py-4 text-sm font-semibold shadow-sm ${banner.classes}`}>
            <div className="font-black">{banner.title}</div>
            <div className="mt-1 opacity-90">{banner.text}</div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            const btnState = getButtonState(plan.key);
            const isFeatured = plan.badge && !isCurrent;
            return (
              <article
                key={plan.key}
                className={`relative flex min-h-[430px] flex-col rounded-[1.75rem] border p-5 transition-all ${
                  isCurrent && !isTrialExpired
                    ? "border-blue-300 bg-white shadow-[0_24px_60px_rgba(37,99,235,0.18)] ring-2 ring-blue-500/20"
                    : isFeatured
                      ? "border-blue-200 bg-white shadow-[0_20px_50px_rgba(37,99,235,0.12)]"
                      : "border-slate-200 bg-white/95 shadow-[0_14px_36px_rgba(15,23,42,0.08)] hover:border-blue-200 hover:shadow-[0_20px_50px_rgba(37,99,235,0.12)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">{plan.name}</h2>
                    <p className="mt-2 min-h-[42px] text-sm font-semibold leading-5 text-slate-500">{plan.blurb}</p>
                  </div>
                  {isCurrent && !isTrialExpired ? (
                    <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">Current</span>
                  ) : isCurrent && isTrialExpired ? (
                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">Ended</span>
                  ) : plan.badge ? (
                    <span className="shrink-0 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">{plan.badge}</span>
                  ) : null}
                </div>

                <div className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-black tracking-tight text-slate-950">{plan.price}</span>
                  <span className="pb-1 text-sm font-bold text-slate-500">{plan.period}</span>
                </div>

                <div className="mt-5 h-px bg-slate-100" />

                <ul className="mt-5 flex-1 space-y-3 text-sm font-semibold text-slate-700">
                  {plan.limits.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <PlanCheck />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={btnState.disabled}
                  className={`mt-6 w-full rounded-2xl px-4 py-3 text-sm font-black transition ${
                    btnState.disabled
                      ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500"
                      : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-cyan-600"
                  }`}
                  data-testid={`plan-btn-${plan.key}`}
                >
                  {btnState.label}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
