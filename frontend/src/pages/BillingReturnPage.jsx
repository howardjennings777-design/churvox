import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

const PLAN_REQUIRED_KEY = "churvox_plan_choice_required";
const FIRST_SETUP_KEY = "churvox_first_setup_pending";

function niceStatus(value) {
  const text = String(value || "").replaceAll("_", " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Unknown";
}

function unwrap(value) {
  return value?.data?.data || value?.data || value || {};
}

function hasUsablePlan(value) {
  const plan = String(value || "").toLowerCase().trim();
  return Boolean(plan && !["none", "free", "null", "undefined"].includes(plan));
}

function subscriptionText(details) {
  if (!details) return "Checking setup status";
  if (details.subscription_status === "trialing") return "14-day trial active";
  if (details.subscription_status === "active") return "Subscription active";
  if (details.billing_lock_reason === "payment_required") return "Payment required";
  if (details.stripe_subscription_id) return "Subscription saved";
  if (hasUsablePlan(details.plan)) return "Plan active";
  return "Waiting for confirmation";
}

export default function BillingReturnPage({ cancelled = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { get, post } = useApi();
  const { updateUser, checkAuth } = useAuth();
  const [status, setStatus] = React.useState("Checking your plan…");
  const [details, setDetails] = React.useState(null);
  const [addonStatus, setAddonStatus] = React.useState("");
  const [checkedAt, setCheckedAt] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const ranOnce = React.useRef(false);
  const redirectTimer = React.useRef(null);

  function openSetupSoon() {
    window.clearTimeout(redirectTimer.current);
    redirectTimer.current = window.setTimeout(() => {
      navigate("/setup-guide?first_setup=1", { replace: true });
    }, 1800);
  }

  function refreshAuthUser() {
    try {
      window.dispatchEvent(new Event("churvox-auth-refresh"));
    } catch {}
    checkAuth?.().catch(() => {});
  }

  async function refreshBilling({ goToSetup = false } = {}) {
    const sub = await get("/billing/subscription-status", { timeout: 12000 });
    if (sub?.success) {
      const data = unwrap(sub);
      const planValue = data?.plan || data?.plan_name || "";
      const hasAccess = data?.has_app_access === true || hasUsablePlan(planValue) || Boolean(data?.stripe_subscription_id);
      setDetails({ ...data, has_app_access: hasAccess });
      setStatus(hasAccess ? "Your plan is active. Opening setup now…" : `Plan status: ${niceStatus(planValue)} · ${subscriptionText(data)}`);
      if (hasAccess) {
        setConfirmed(true);
        updateUser?.({
          plan: planValue,
          subscription_status: data.subscription_status || (data.stripe_subscription_id ? "active" : "trialing"),
          trial_ends_at: data.trial_ends_at,
          stripe_customer_id: data.stripe_customer_id,
          stripe_subscription_id: data.stripe_subscription_id,
          has_app_access: true,
          billing_lock_reason: null,
        });
        refreshAuthUser();
        if (goToSetup) openSetupSoon();
      }
    } else {
      setStatus("Could not refresh your plan yet. Open Plans or Contact if this does not update shortly.");
    }
    setCheckedAt(new Date().toLocaleString("en-NZ"));
  }

  React.useEffect(() => () => window.clearTimeout(redirectTimer.current), []);

  React.useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    let alive = true;
    async function run() {
      const params = new URLSearchParams(location.search || "");
      const sessionId = params.get("session_id") || "";
      const addon = params.get("addon") || "";
      const plan = params.get("plan") || "";
      const country = params.get("country") || "";
      if (cancelled || params.get("canceled") || params.get("cancelled")) {
        if (!alive) return;
        setStatus("Checkout cancelled. No plan or add-on changes were made.");
        toast.info("Checkout cancelled — no changes made");
        setCheckedAt(new Date().toLocaleString("en-NZ"));
        return;
      }
      if (addon && sessionId) {
        setAddonStatus("Confirming add-on checkout…");
        const res = await post("/billing/confirm-addon-checkout", { addon, session_id: sessionId, country }, { timeout: 25000 });
        const result = unwrap(res);
        if (!alive) return;
        if (res?.success) {
          setAddonStatus(result?.message || res?.message || "Add-on activated");
          toast.success("Add-on activated");
          refreshAuthUser();
        } else {
          setAddonStatus(res?.error || "Could not confirm add-on yet. Try refreshing shortly.");
          toast.error(res?.error || "Could not confirm add-on");
        }
      } else if (sessionId) {
        setStatus("Confirming your 14-day trial…");
        const res = await post("/billing/confirm-checkout", { session_id: sessionId, plan, country }, { timeout: 25000 });
        const result = unwrap(res);
        if (!alive) return;
        if (res?.success) {
          const confirmedPlan = result?.plan || result?.data?.plan || plan;
          try {
            window.localStorage.removeItem(PLAN_REQUIRED_KEY);
            window.localStorage.setItem(FIRST_SETUP_KEY, "true");
          } catch {}
          updateUser?.({
            plan: confirmedPlan,
            subscription_status: result?.subscription_status || "trialing",
            trial_ends_at: result?.trial_ends_at,
            stripe_customer_id: result?.stripe_customer_id,
            stripe_subscription_id: result?.stripe_subscription_id,
            has_app_access: true,
            billing_lock_reason: null,
          });
          refreshAuthUser();
          setConfirmed(true);
          toast.success("Trial started");
          setStatus("Your plan is active. Opening setup now…");
        } else {
          toast.error(res?.error || "Could not confirm checkout");
          setStatus(res?.error || "Could not confirm checkout. Refresh shortly or contact support.");
        }
      }
      if (!alive) return;
      await refreshBilling({ goToSetup: true });
      try {
        const cleaned = new URL(window.location.href);
        ["session_id", "plan", "country", "checkout", "success"].forEach((key) => cleaned.searchParams.delete(key));
        window.history.replaceState({}, document.title, cleaned.toString());
      } catch {}
    }
    run();
    return () => { alive = false; };
  }, []);

  const title = cancelled ? "Checkout cancelled" : confirmed ? "Plan active" : "Checking your plan";
  return <main className="min-h-screen bg-[#f7f3ea] p-4 text-slate-950 md:p-8"><section className="mx-auto grid min-h-[70vh] max-w-4xl place-items-center"><article className="w-full rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:p-9"><div className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-800">Plan setup</div><h1 className="mt-4 text-4xl font-black tracking-[-0.07em] md:text-6xl">{title}</h1><p className="mt-4 max-w-2xl text-base font-bold leading-7 text-slate-600">{status}</p>{addonStatus ? <p className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-black text-orange-900">{addonStatus}</p> : null}{details ? <div className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800 md:grid-cols-2"><div>Plan: {niceStatus(details.plan_name || details.plan)}</div><div>Status: {subscriptionText(details)}</div>{details.trial_ends_at ? <div>Trial ends: {new Date(details.trial_ends_at).toLocaleString("en-NZ")}</div> : null}{checkedAt ? <div>Last checked: {checkedAt}</div> : null}</div> : null}<div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => refreshBilling({ goToSetup: true })} className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">Refresh plan status</button><button type="button" onClick={() => navigate("/setup-guide?first_setup=1", { replace: true })} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">Open setup now</button><button type="button" onClick={() => navigate("/plans", { replace: true })} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900">Back to Plans</button><Link to="/contact" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 no-underline">Need help?</Link></div></article></section></main>;
}
