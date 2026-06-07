import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

function niceStatus(value) {
  const text = String(value || "").replaceAll("_", " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Unknown";
}

export default function BillingReturnPage({ cancelled = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { get, post } = useApi();
  const { checkAuth } = useAuth();
  const [status, setStatus] = React.useState("Checking billing status…");
  const [details, setDetails] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      const params = new URLSearchParams(location.search || "");
      const sessionId = params.get("session_id") || "";

      if (cancelled || params.get("canceled") || params.get("cancelled")) {
        if (!alive) return;
        setStatus("Checkout cancelled. No plan changes were made.");
        toast.info("Checkout cancelled — no plan changes made");
        return;
      }

      if (sessionId) {
        const confirm = await post("/billing/confirm-checkout", { session_id: sessionId }, { timeout: 12000 });
        if (confirm?.success) {
          setDetails(confirm.data || null);
          setStatus("Checkout confirmed. Refreshing your plan…");
        } else {
          setStatus("Checkout returned. Waiting for Stripe webhook / plan refresh…");
        }
      }

      const sub = await get("/billing/subscription-status", { timeout: 12000 });
      if (sub?.success) {
        setDetails((current) => ({ ...(current || {}), ...(sub.data || {}) }));
        setStatus(`Plan status: ${niceStatus(sub.data?.plan)}${sub.data?.stripe_subscription_id ? " · subscription active" : ""}`);
      }

      try {
        await checkAuth?.();
        window.dispatchEvent(new Event("churvox-auth-refresh"));
      } catch {}

      toast.success("Billing status refreshed");
    }
    run();
    return () => { alive = false; };
  }, [cancelled, checkAuth, get, location.search, post]);

  return <main className="min-h-screen bg-[#f7f3ea] p-4 text-slate-950 md:p-8">
    <section className="mx-auto grid min-h-[70vh] max-w-4xl place-items-center">
      <article className="w-full rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:p-9">
        <div className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-800">Billing return</div>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.07em] md:text-6xl">{cancelled ? "Checkout cancelled" : "Checking your plan"}</h1>
        <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-slate-600">{status}</p>
        {details ? <div className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800 md:grid-cols-2">
          <div>Plan: {niceStatus(details.plan)}</div>
          <div>Stripe: {details.stripe_subscription_id ? "Subscription saved" : "No subscription ID yet"}</div>
        </div> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate("/plans", { replace: true })} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">Back to Plans</button>
          <Link to="/dashboard" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 no-underline">Command Board</Link>
          <Link to="/support-board" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 no-underline">Need help?</Link>
        </div>
      </article>
    </section>
  </main>;
}
