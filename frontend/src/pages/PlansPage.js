// CHURVOX_PREMIUM_TRADIE_REDESIGN_ACTIVE
// CHURVOX_NEW_FRONTEND_REAL_PAGE
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import ExtraUserBlockCard from "../components/ExtraUserBlockCard";

const fallbackPlans = [
  { key: "solo", name: "Solo", price: "$30", period: "/month", blurb: "For owner-operators.", limits: ["Up to 20 clients", "Solo-only workflow", "Jobs, quotes, invoices, schedule, time tracking", "MYOB: Not included"] },
  { key: "team", name: "Team", price: "$70", period: "/month", blurb: "For growing teams.", limits: ["Up to 30 clients", "Team access", "Core workflow + team tools", "MYOB: Not included"] },
  { key: "pro", name: "Pro", price: "$110", period: "/month", blurb: "Advanced workflows.", limits: ["Up to 40 clients", "Team access", "Advanced workflow tools", "MYOB: Optional add-on"] },
  { key: "enterprise", name: "Enterprise", price: "$240", period: "/month", blurb: "For larger operations.", limits: ["Up to 50 clients", "Includes 50 users", "Extra 50-user block: $100/month", "MYOB: Included"] },
];

export default function PlansPage() {
  const api = useApi();
  const auth = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState(null);
  const [plans] = useState(fallbackPlans);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyPlan, setBusyPlan] = useState("");
  const [notice, setNotice] = useState("");
  const confirmingRef = useRef(false);

  const currentPlan = String(billing?.plan || auth?.user?.plan || "none").toLowerCase();
  const trialExpired = billing?.trial_expired === true || auth?.isTrialExpired;
  const isNewUser = !currentPlan || currentPlan === "none";

  const loadStatus = async () => {
    setLoading(true);
    setError("");
    const res = await api.get("/billing/status");
    if (!res?.success) {
      setError(res?.error || "Could not load billing status.");
      setBilling(null);
    } else {
      setBilling(res.data || null);
    }
    setLoading(false);
  };

  useEffect(() => { loadStatus(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const checkout = (params.get("checkout") || "").toLowerCase();
    const canceled = params.get("cancelled") || params.get("canceled");
    if (canceled || checkout === "cancelled") setNotice("Checkout cancelled. No plan changes were made.");
    if (!sessionId || confirmingRef.current) return;
    confirmingRef.current = true;
    setNotice("Confirming your plan…");
    api.post("/billing/confirm-checkout", { session_id: sessionId }).then((res) => {
      if (res?.success && (res?.data?.success !== false)) {
        setNotice("Plan confirmed. Redirecting to jobs…");
        window.dispatchEvent(new Event("churvox-auth-refresh"));
        setTimeout(() => navigate("/jobs", { replace: true }), 700);
      } else {
        const msg = res?.data?.error || res?.error || "Checkout confirmation failed.";
        setNotice(msg);
      }
    }).finally(() => {
      const clean = window.location.pathname;
      window.history.replaceState({}, document.title, clean);
    });
  }, [navigate]);

  const handleTrial = async (planKey) => {
    setBusyPlan(planKey);
    setError("");
    const res = await api.post("/billing/start-trial", { plan_type: planKey, plan: planKey });
    if (!res?.success) setError(res?.error || "Failed to start trial.");
    else {
      setNotice("Start 14-day trial successful. No card required.");
      window.dispatchEvent(new Event("churvox-auth-refresh"));
      setTimeout(() => navigate("/jobs", { replace: true }), 700);
    }
    setBusyPlan("");
  };

  const handleCheckout = async (planKey) => {
    setBusyPlan(planKey);
    setError("");
    const res = await api.post("/stripe/create-checkout-session", { plan_type: planKey, plan: planKey });
    const payload = res?.data || res;
    if (!res?.success || payload?.success === false) {
      setError(payload?.not_configured ? "Stripe checkout is not configured yet." : (payload?.error || res?.error || "Failed to start checkout."));
      setBusyPlan("");
      return;
    }
    const checkoutUrl = payload?.checkout_url || payload?.url;
    if (!checkoutUrl) {
      setError("Stripe checkout did not return a checkout URL.");
      setBusyPlan("");
      return;
    }
    window.location.assign(checkoutUrl);
  };

  const statusPill = useMemo(() => {
    if (trialExpired) return "Trial expired";
    if (billing?.trial_active) return "Trial active";
    if (billing?.has_paid_subscription) return "Active";
    if (["cancelled", "canceled", "unpaid"].includes(String(billing?.subscription_status || "").toLowerCase())) return "Cancelled/unpaid";
    if (isNewUser) return "No plan";
    return "No plan";
  }, [billing, isNewUser, trialExpired]);

  return <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900"><div className="mx-auto max-w-7xl">
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-black text-slate-950">Choose your Churvox plan</h1>
      <p className="mt-2 text-slate-700">Start 14-day trial. No card required. Upgrade anytime with Stripe checkout.</p>
      <span className="mt-4 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{statusPill}</span>
      {billing?.trial_active && <p className="mt-2 text-sm font-semibold text-slate-800">Trial active until {new Date(billing.trial_ends_at).toLocaleDateString()}</p>}
      {trialExpired && <p className="mt-2 text-sm font-bold text-amber-700">Your trial has ended. Choose a plan to continue.</p>}
      {notice && <p className="mt-3 text-sm font-semibold text-blue-800">{notice}</p>}
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
    {loading ? <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 font-semibold">Loading plans…</div> : <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{plans.map((p) => {
      const isCurrent = p.key === currentPlan;
      const disabled = busyPlan === p.key || (billing?.has_paid_subscription && isCurrent);
      return <article key={p.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black text-slate-950">{p.name}</h2><p className="mt-1 text-sm font-semibold text-slate-700">{p.blurb}</p><div className="mt-3 text-4xl font-black text-slate-950">{p.price}<span className="ml-1 text-sm text-slate-700">{p.period}</span></div><ul className="mt-4 space-y-2 text-sm font-semibold text-slate-800">{p.limits.map((x) => <li key={x}>• {x}</li>)}</ul>{isCurrent && <div className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Current plan</div>}<div className="mt-5 flex gap-2"><button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300" disabled={disabled} onClick={() => handleCheckout(p.key)}>{busyPlan===p.key?"Loading…":"Choose paid plan"}</button>{isNewUser && <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900" disabled={busyPlan===p.key} onClick={() => handleTrial(p.key)}>Start 14-day trial</button>}</div></article>;
    })}</div>}
    <ExtraUserBlockCard currentPlan={currentPlan} billing={billing} />
  </div></div>;
}
