import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";

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
    limits: ["Up to 35 clients", "Up to 10 users", "Advanced workflow tools", "Priority-ready setup"],
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
  const [currentPlan, setCurrentPlan] = useState("solo");
  const [busyPlan, setBusyPlan] = useState("");
  const [loading, setLoading] = useState(true);

  const getPayload = (res) => {
    if (!res) return null;
    if (res.success === false) return res;
    if (res.data !== undefined) return res.data;
    return res;
  };

  const mergePlans = (apiPlans) => {
    if (!Array.isArray(apiPlans) || apiPlans.length === 0) return fallbackPlans;

    return fallbackPlans.map((fallback) => {
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
    });
  };

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      try {
        const [plansRes, billingRes] = await Promise.all([
          api.get("/plan/all"),
          api.get("/billing/status"),
        ]);

        const plansData = getPayload(plansRes);
        const billingData = getPayload(billingRes);

        if (plansData && Array.isArray(plansData)) {
          setPlans(mergePlans(plansData));
        } else {
          setPlans(fallbackPlans);
        }

        if (billingData && billingData.success === false) {
          setBilling(null);
          setCurrentPlan("solo");
        } else {
          setBilling(billingData || null);
          setCurrentPlan(String(billingData?.plan || "solo").toLowerCase());
        }
      } catch (err) {
        console.error("Failed to load plans:", err);
        setPlans(fallbackPlans);
        setBilling(null);
        setCurrentPlan("solo");
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []); // keep simple and stable

  const banner = useMemo(() => {
    if (billing?.trial_expired) {
      return {
        title: "Your free trial has ended",
        text: "Choose a paid plan to keep using Churvox.",
        classes: "border-amber-500/30 bg-amber-500/10 text-amber-200",
      };
    }

    if (billing?.trial_active) {
      const days = billing?.days_left;
      return {
        title: `Free trial active${days || days === 0 ? ` · ${days} day${days === 1 ? "" : "s"} left` : ""}`,
        text: "No card required during trial. Upgrade any time before it ends.",
        classes: "border-blue-500/30 bg-blue-500/10 text-blue-200",
      };
    }

    return null;
  }, [billing]);

  const handleUpgrade = async (planKey) => {
    if (!planKey || planKey === currentPlan || busyPlan) return;

    try {
      setBusyPlan(planKey);

      const res = await api.post("/stripe/create-checkout-session", {
        plan_type: planKey,
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
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-lg">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="pt-6 md:pt-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            Pick the plan that fits your business
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm md:text-base text-slate-300 leading-relaxed">
            Start with a 14-day free trial. No card required. Upgrade when you&apos;re ready.
          </p>
        </div>

        {banner && (
          <div className={`mx-auto mt-6 mb-8 max-w-3xl rounded-2xl border px-5 py-4 ${banner.classes}`}>
            <div className="font-semibold">{banner.title}</div>
            <div className="mt-1 text-sm opacity-90">{banner.text}</div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            const isBusy = busyPlan === plan.key;

            return (
              <div
                key={plan.key}
                className={`rounded-3xl border p-6 shadow-lg transition ${
                  isCurrent
                    ? "border-blue-500/40 bg-slate-900 ring-1 ring-blue-500/30"
                    : "border-slate-800 bg-slate-900/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">{plan.name}</h2>
                    <p className="mt-2 text-sm text-slate-300 min-h-[40px]">{plan.blurb}</p>
                  </div>

                  {isCurrent ? (
                    <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-300">
                      Current Plan
                    </span>
                  ) : plan.badge ? (
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                      {plan.badge}
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="pb-1 text-sm text-slate-400">{plan.period}</span>
                </div>

                <ul className="mt-6 space-y-3 text-sm text-slate-200">
                  {plan.limits.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={isCurrent || isBusy}
                  className={`mt-8 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isCurrent
                      ? "cursor-not-allowed bg-slate-700 text-slate-300"
                      : "bg-blue-600 text-white hover:bg-blue-500"
                  }`}
                >
                  {isCurrent
                    ? "Current plan"
                    : isBusy
                    ? "Opening checkout..."
                    : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
