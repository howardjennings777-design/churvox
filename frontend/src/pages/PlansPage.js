import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";
import { normalizePlan, getPlanFeatures, hasPlanAccess } from "../utils/planRules";
import { detectCountryHint } from "../lib/country";

const fallbackPlans = [
  {
    key: "solo",
    name: "Solo",
    price: "$30",
    period: "/month",
    blurb: "For solo operators getting started.",
    badge: "",
    limits: ["Up to 20 clients", "1 user included", "Jobs, quotes, invoices", "14-day free trial"],
  },
  {
    key: "team",
    name: "Team",
    price: "$70",
    period: "/month",
    blurb: "For growing teams that need staff access.",
    badge: "Most Popular",
    limits: ["Up to 30 clients", "Up to 5 users", "Scheduling and team workflow", "Upgrade any time"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$110",
    period: "/month",
    blurb: "For busy businesses needing more room.",
    badge: "",
    limits: ["Up to 40 clients", "Up to 10 users", "Advanced workflow tools", "Priority-ready setup"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "$240",
    period: "/month",
    blurb: "For larger teams with heavier usage.",
    badge: "",
    limits: ["Includes 50 users", "Extra 50 users = $100", "MYOB-ready billing flow", "Best for larger operations"],
  },
];

export default function PlansPage() {
  const api = useApi();
  const [plans, setPlans] = useState(fallbackPlans);
  const [billing, setBilling] = useState(null);
  const [currentPlan, setCurrentPlan] = useState("none");
  const [busyPlan, setBusyPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutNotice, setCheckoutNotice] = useState(null);
  const [currencyInfo, setCurrencyInfo] = useState(null); // { country, currency, prices, source }

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

    // Overlay currency-aware prices from /billing/currency when available.
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
        setCheckoutNotice({
          type: "warning",
          title: "Checkout cancelled",
          text: "No changes were made to your plan.",
        });
      }

      if (checkout) {
        const cleanUrl = `${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
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

        if (plansData && Array.isArray(plansData)) {
          setPlans(mergePlans(plansData, currencyData));
        } else {
          setPlans(mergePlans(fallbackPlans, currencyData));
        }

        if (billingData && billingData.success === false) {
          setBilling(null);
          setCurrentPlan("none");
        } else {
          setBilling(billingData || null);
          if (billingData?.plan) {
            setCurrentPlan(String(billingData.plan).toLowerCase());
          } else {
            setCurrentPlan("none");
          }
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
    try {
      return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
    } catch { return ""; }
  };

  const banner = useMemo(() => {
    if (billing?.trial_expired) {
      return null;
    }

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

    if (isBusy) {
      return { disabled: true, label: isNewUser ? "Starting trial..." : "Opening checkout..." };
    }

    if (isNewUser) {
      return { disabled: false, label: `Start free trial — ${cap(planKey)}` };
    }

    if (isTrialExpired) {
      return { disabled: false, label: isCurrent ? `Continue with ${cap(planKey)}` : `Choose ${cap(planKey)}` };
    }

    if (isPaid && isCurrent) {
      return { disabled: true, label: "Current plan" };
    }

    if (isActiveTrial && isCurrent) {
      return { disabled: true, label: "Current trial" };
    }

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
            title: "Trial started!",
            text: `Your 14-day free trial on the ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan is now active. No card required.`,
          });
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
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
        // Pass the resolved country as a hint — backend uses saved country first
        // but falls back to this for first-checkout users. Keeps UI-shown
        // currency in lockstep with Stripe checkout currency.
        country: currencyInfo?.country || detectCountryHint() || "",
      });

      if (res?.success === false) {
        throw new Error(res.error || "Failed to start checkout");
      }

      const data = getPayload(res) || {};
      const url = data?.checkout_url || data?.url;

      if (!url) {
        throw new Error("No checkout URL returned by server");
      }

      window.location.assign(url);
    } catch (err) {
      console.error("Checkout failed:", err);
      alert(
        err?.response?.data?.detail ||
          err?.data?.detail ||
          err?.message ||
          "Failed to start checkout"
      );
    } finally {
      setBusyPlan("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-6">
        <div className="text-sm text-slate-500">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {isTrialExpired ? (
          <div className="pt-6 md:pt-10 space-y-6">
            <div className="mx-auto max-w-2xl text-center space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Your free trial has ended</h1>
              <p className="text-sm md:text-base text-slate-600">
                Your <span className="text-slate-900 font-semibold">{cap(currentPlan)}</span> trial ended on{" "}
                <span className="text-slate-900 font-semibold">{formatDate(billing?.trial_ends_at)}</span>.
                Subscribe to continue using Churvox. You don&apos;t need to sign up again.
              </p>
            </div>

            <div className="mx-auto max-w-md">
              <button
                type="button"
                onClick={() => handleSelectPlan(currentPlan)}
                disabled={busyPlan === currentPlan}
                className="w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white hover:bg-blue-700 shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="continue-plan-button"
              >
                {busyPlan === currentPlan ? "Opening checkout..." : `Continue with ${cap(currentPlan)}`}
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Or choose a different plan below
              </p>
            </div>
          </div>
        ) : (
          <div className="pt-6 md:pt-10 text-center">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Pick the plan that fits your business
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm md:text-base text-slate-600 leading-relaxed">
              Start with a 14-day free trial. No card required. Upgrade when you&apos;re ready.
            </p>
            {currencyInfo?.currency && (
              <div
                className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm"
                data-testid="currency-badge"
                title={`Prices shown in ${currencyInfo.currency} (${currencyInfo.country}) — change by setting your business country in Settings.`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Billed in <span className="font-semibold text-slate-900">{currencyInfo.currency}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">{currencyInfo.country}</span>
              </div>
            )}
          </div>
        )}

        {checkoutNotice && (
          <div
            className={`mx-auto mt-6 mb-6 max-w-3xl rounded-xl border px-5 py-4 shadow-sm ${
              checkoutNotice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <div className="font-semibold">{checkoutNotice.title}</div>
            <div className="mt-1 text-sm opacity-90">{checkoutNotice.text}</div>
          </div>
        )}

        {banner && (
          <div className={`mx-auto mt-6 mb-8 max-w-3xl rounded-xl border px-5 py-4 shadow-sm ${banner.classes}`}>
            <div className="font-semibold">{banner.title}</div>
            <div className="mt-1 text-sm opacity-90">{banner.text}</div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            const btnState = getButtonState(plan.key);

            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border p-6 transition-all ${
                  isCurrent && !isTrialExpired
                    ? "border-blue-300 bg-white shadow-md ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{plan.name}</h2>
                    <p className="mt-2 text-sm text-slate-500 min-h-[40px]">{plan.blurb}</p>
                  </div>

                  {isCurrent && !isTrialExpired ? (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700 border border-blue-200">
                      Current plan
                    </span>
                  ) : isCurrent && isTrialExpired ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
                      Trial ended
                    </span>
                  ) : plan.badge ? (
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
                      {plan.badge}
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-bold text-slate-900 tracking-tight">{plan.price}</span>
                  <span className="pb-1 text-sm text-slate-500">{plan.period}</span>
                </div>

                <ul className="mt-6 space-y-3 text-sm text-slate-700">
                  {plan.limits.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={btnState.disabled}
                  className={`mt-8 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    btnState.disabled
                      ? "cursor-not-allowed bg-slate-100 text-slate-500 border border-slate-200"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                  }`}
                  data-testid={`plan-btn-${plan.key}`}
                >
                  {btnState.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
