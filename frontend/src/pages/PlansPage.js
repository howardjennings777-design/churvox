import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";
import { normalizePlan, getPlanFeatures, hasPlanAccess } from "../utils/planRules";

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

  const isTrialExpired = billing?.trial_expired === true;
  const isActiveTrial = billing?.trial_active === true;
  const isPaid = billing?.has_paid_subscription === true;
  const isNewUser = currentPlan === "none" || !currentPlan;

  const getButtonState = (planKey) => {
    const isCurrent = planKey === currentPlan;
    const isBusy = busyPlan === planKey;

    if (isBusy) {
      return { disabled: true, label: isNewUser ? "Starting trial..." : "Opening checkout...", style: "busy" };
    }

    if (isNewUser) {
      return { disabled: false, label: `Start free trial — ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}`, style: "primary" };
    }

    if (isTrialExpired) {
      return { disabled: false, label: isCurrent ? `Subscribe to ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}` : `Choose ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}`, style: "primary" };
    }

    if (isPaid && isCurrent) {
      return { disabled: true, label: "Current plan", style: "disabled" };
    }

    if (isActiveTrial && isCurrent) {
      return { disabled: true, label: "Current plan", style: "disabled" };
    }

    return { disabled: false, label: `Choose ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}`, style: "primary" };
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

        {checkoutNotice && (
          <div
            className={`mx-auto mt-6 mb-6 max-w-3xl rounded-2xl border px-5 py-4 ${
              checkoutNotice.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            <div className="font-semibold">{checkoutNotice.title}</div>
            <div className="mt-1 text-sm opacity-90">{checkoutNotice.text}</div>
          </div>
        )}

        {banner && (
          <div className={`mx-auto mt-6 mb-8 max-w-3xl rounded-2xl border px-5 py-4 ${banner.classes}`}>
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
                className={`rounded-3xl border p-6 shadow-lg transition ${
                  isCurrent && !isTrialExpired
                    ? "border-blue-500/40 bg-slate-900 ring-1 ring-blue-500/30"
                    : "border-slate-800 bg-slate-900/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">{plan.name}</h2>
                    <p className="mt-2 text-sm text-slate-300 min-h-[40px]">{plan.blurb}</p>
                  </div>

                  {isCurrent && !isTrialExpired ? (
                    <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-300">
                      Current Plan
                    </span>
                  ) : isCurrent && isTrialExpired ? (
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                      Trial Ended
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
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={btnState.disabled}
                  className={`mt-8 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    btnState.disabled
                      ? "cursor-not-allowed bg-slate-700 text-slate-300"
                      : "bg-blue-600 text-white hover:bg-blue-500"
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
