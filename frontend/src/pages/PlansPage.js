import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { detectCountryHint } from "../lib/country";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import "./PlansCommand.css";

const displayPlans = [
  {
    key: "solo",
    name: "Start",
    price: "$39",
    period: "/month + GST",
    tag: "Owner-operator",
    blurb: "For a solo trade owner who wants the basics tidy without the admin mess.",
    limits: ["Jobs, clients, quotes and invoices", "Simple Command Floor view", "Ready-to-bill work surfaced", "Basic owner workflow", "No MYOB sync"],
  },
  {
    key: "team",
    name: "Crew",
    price: "$89",
    period: "/month + GST",
    tag: "Small team",
    blurb: "For a growing crew that needs field work, clients and money in one place.",
    limits: ["Everything in Start", "Team and worker workflow", "Live crew visibility", "Job proof and notes", "More jobs and client capacity"],
  },
  {
    key: "pro",
    name: "Operator",
    price: "$149",
    period: "/month + GST",
    tag: "Most popular",
    blurb: "For owners who want Churvox to prepare the admin so they only approve what matters.",
    limits: ["Everything in Crew", "AI Operator Actions", "Draft invoice and quote follow-ups", "Urgent action queue", "MYOB add-on available"],
  },
  {
    key: "enterprise",
    name: "Command",
    price: "$299",
    period: "/month + GST",
    tag: "Full command",
    blurb: "For larger operators that want roles, payroll workspace and accounting sync included.",
    limits: ["Everything in Operator", "MYOB sync included", "Payroll workspace", "Advanced roles and permissions", "Up to 50 active team members"],
  },
];

const cap = (s) => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "";
const nicePlanName = (key) => displayPlans.find((p) => p.key === key)?.name || cap(key);
const getPayload = (res) => {
  if (!res) return null;
  if (res.success === false) return res;
  if (res.data !== undefined) return res.data;
  return res;
};

export default function PlansPage() {
  const api = useApi();
  const [billing, setBilling] = useState(null);
  const [currentPlan, setCurrentPlan] = useState("none");
  const [busyPlan, setBusyPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [currencyInfo, setCurrencyInfo] = useState(null);

  useEffect(() => {
    const handleCheckoutReturn = async () => {
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("checkout");
      const plan = (params.get("plan") || "").toLowerCase();
      const sessionId = params.get("session_id") || "";
      if (!checkout) return;
      if (checkout === "success") {
        try {
          if (sessionId) {
            await api.post("/billing/confirm-checkout", { session_id: sessionId });
            window.dispatchEvent(new Event("churvox-auth-refresh"));
          }
          if (plan) setCurrentPlan(plan);
          setNotice({ type: "success", title: "Plan updated", text: `${nicePlanName(plan)} is now active.` });
        } catch (err) {
          console.error("Failed to confirm checkout:", err);
          setNotice({ type: "warning", title: "Checkout completed", text: "Refresh once if the plan does not update straight away." });
        }
      }
      if (checkout === "cancelled") {
        setNotice({ type: "warning", title: "Checkout cancelled", text: "No changes were made to your plan." });
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    };
    handleCheckoutReturn();
  }, []);

  useEffect(() => {
    const loadBilling = async () => {
      setLoading(true);
      try {
        const hintCountry = detectCountryHint();
        const [billingRes, currencyRes] = await Promise.allSettled([
          api.get("/billing/status"),
          api.get(`/billing/currency?country=${encodeURIComponent(hintCountry || "")}`),
        ]);
        const billingData = billingRes.status === "fulfilled" ? getPayload(billingRes.value) : null;
        const currencyData = currencyRes.status === "fulfilled" ? getPayload(currencyRes.value) : null;
        if (currencyData?.currency) setCurrencyInfo(currencyData);
        if (billingData && billingData.success !== false) {
          setBilling(billingData);
          setCurrentPlan(billingData?.plan ? String(billingData.plan).toLowerCase() : "none");
        } else {
          setBilling(null);
          setCurrentPlan("none");
        }
      } catch (err) {
        console.error("Failed to load billing:", err);
        setBilling(null);
        setCurrentPlan("none");
      } finally {
        setLoading(false);
      }
    };
    loadBilling();
  }, []);

  const status = useMemo(() => {
    if (billing?.trial_expired) return { label: "Trial ended", tone: "warn" };
    if (billing?.trial_active) return { label: `Free trial active${billing?.days_left || billing?.days_left === 0 ? ` · ${billing.days_left} day${billing.days_left === 1 ? "" : "s"} left` : ""}`, tone: "ok" };
    if (billing?.has_paid_subscription) return { label: `${nicePlanName(currentPlan)} active`, tone: "ok" };
    return { label: "Choose a plan to open Churvox", tone: "neutral" };
  }, [billing, currentPlan]);

  const isNewUser = currentPlan === "none" || !currentPlan;
  const isTrialExpired = billing?.trial_expired === true;
  const isPaid = billing?.has_paid_subscription === true;
  const isActiveTrial = billing?.trial_active === true;

  const buttonLabel = (plan) => {
    if (busyPlan === plan.key) return isNewUser ? "Starting trial…" : "Opening checkout…";
    if (isNewUser) return `Start free trial — ${plan.name}`;
    if ((isPaid || isActiveTrial) && currentPlan === plan.key && !isTrialExpired) return isPaid ? "Current plan" : "Current trial";
    if (isTrialExpired && currentPlan === plan.key) return `Continue with ${plan.name}`;
    return `Choose ${plan.name}`;
  };

  const isDisabled = (plan) => {
    if (busyPlan) return true;
    return (isPaid || isActiveTrial) && currentPlan === plan.key && !isTrialExpired;
  };

  const handleSelectPlan = async (planKey) => {
    if (!planKey || busyPlan) return;
    if (isNewUser) {
      try {
        setBusyPlan(planKey);
        const res = await api.post("/billing/start-trial", { plan_type: planKey });
        const data = getPayload(res) || {};
        if (!data.success) throw new Error(data.detail || data.error || "Failed to start trial");
        window.dispatchEvent(new Event("churvox-auth-refresh"));
        setCurrentPlan(planKey);
        setNotice({ type: "success", title: "Trial started", text: `Your 14-day ${nicePlanName(planKey)} trial is active. No card required.` });
        setTimeout(() => { window.location.href = "/dashboard"; }, 1100);
      } catch (err) {
        toast.error(err?.response?.data?.detail || err?.message || "Failed to start trial");
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
      toast.error(err?.response?.data?.detail || err?.data?.detail || err?.message || "Failed to start checkout");
    } finally {
      setBusyPlan("");
    }
  };

  if (loading) {
    return <main className="cv-plans"><div className="cv-plans-shell"><section className="cv-plans-hero"><p>Loading plans…</p></section></div></main>;
  }

  return (
    <main className="cv-plans" data-version="CHURVOX_APP_PLANS_COMMAND_20260524">
      <div className="cv-plans-shell">
        <header className="cv-plans-top">
          <ChurvoxLogo size="lg" />
          <span>{status.label}</span>
        </header>

        <section className="cv-plans-hero">
          <div>
            <p className="cv-kicker">Plans & billing</p>
            <h1>Choose how much admin Churvox should run for you.</h1>
            <p>Start with core workflow, move into crew control, or choose Operator where Churvox prepares the daily admin and the owner approves.</p>
          </div>
          <div className="cv-status-pill">{currencyInfo?.currency ? `Billed in ${currencyInfo.currency}` : status.label}</div>
        </section>

        {notice && (
          <div className={`cv-notice ${notice.type === "warning" ? "warn" : ""}`}>
            <b>{notice.title}</b>
            <span>{notice.text}</span>
          </div>
        )}

        <section className="cv-grid">
          {displayPlans.map((plan) => {
            const featured = plan.key === "pro";
            const current = currentPlan === plan.key && !isTrialExpired;
            return (
              <article key={plan.key} className={`cv-card ${featured ? "featured" : ""} ${current ? "current" : ""}`}>
                <span>{plan.tag}</span>
                <h2>{plan.name}</h2>
                <div className="cv-price"><b>{plan.price}</b><small>{plan.period}</small></div>
                <p>{plan.blurb}</p>
                <ul>{plan.limits.map((item) => <li key={item}>{item}</li>)}</ul>
                <button type="button" onClick={() => handleSelectPlan(plan.key)} disabled={isDisabled(plan)} data-testid={`plan-btn-${plan.key}`}>
                  {buttonLabel(plan)}
                </button>
              </article>
            );
          })}
        </section>

        <section className="cv-footer-row">
          <div><b>Churvox does the admin</b><span>AI prepares daily actions for owner approval.</span></div>
          <div><b>Command scales</b><span>Growth Pack adds 50 active team members for $99/month + GST.</span></div>
          <div><b>MYOB ready</b><span>Operator add-on available. Included in Command.</span></div>
        </section>
      </div>
    </main>
  );
}
