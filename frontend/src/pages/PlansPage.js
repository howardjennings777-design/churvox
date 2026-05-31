import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { detectCountryHint } from "../lib/country";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import "./PlansCommand.css";
import "./PlansUserBlocks.css";

const displayPlans = [
  { key: "solo", name: "Start", price: "$39", period: "/month + GST", tag: "Owner-operator", blurb: "For a solo trade owner who wants the basics tidy without the admin mess.", limits: ["Jobs, clients, quotes and invoices", "Simple Command Floor view", "Ready-to-bill work surfaced", "Basic owner workflow", "No MYOB sync"] },
  { key: "team", name: "Crew", price: "$89", period: "/month + GST", tag: "Small team", blurb: "For a growing crew that needs field work, clients and money in one place.", limits: ["Everything in Start", "Team and worker workflow", "Live crew visibility", "Job proof and notes", "More jobs and client capacity"] },
  { key: "pro", name: "Operator", price: "$149", period: "/month + GST", tag: "Most popular", blurb: "For owners who want Churvox to prepare the admin so they only approve what matters.", limits: ["Everything in Crew", "AI Operator Actions", "Draft invoice and quote follow-ups", "Urgent action queue", "MYOB add-on available"] },
  { key: "enterprise", name: "Command", price: "$299", period: "/month + GST", tag: "Full command", blurb: "For larger operators that want roles, payroll workspace and accounting sync included.", limits: ["Everything in Operator", "MYOB sync included", "Payroll workspace", "Advanced roles and permissions", "Up to 50 active team members"] },
];

const userBlocks = [
  "Command includes up to 50 active team members",
  "Each Growth Pack adds 50 more active team members",
  "Extra job capacity, AI Operator Actions and automation runs",
  "Extra admin and payroll capacity as the crew grows",
  "Inactive or old staff records should not count as billable",
];

const smsBlocks = [
  { credits: "100", price: "$10", note: "Light reminders and small follow-up runs." },
  { credits: "500", price: "$45", note: "Best for active crews using reminders regularly." },
  { credits: "1,000", price: "$80", note: "Lowest cost per credit for busy operators." },
];

const cap = (s) => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "";
const nicePlanName = (key) => displayPlans.find((p) => p.key === key)?.name || cap(key);
const getPayload = (res) => { if (!res) return null; if (res.success === false) return res; if (res.data !== undefined) return res.data; return res; };

export default function PlansPage() {
  const api = useApi();
  const [billing, setBilling] = useState(null);
  const [currentPlan, setCurrentPlan] = useState("none");
  const [busyPlan, setBusyPlan] = useState("");
  const [busyAddon, setBusyAddon] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [currencyInfo, setCurrencyInfo] = useState(null);

  useEffect(() => {
    const handleCheckoutReturn = async () => {
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("checkout");
      const plan = (params.get("plan") || "").toLowerCase();
      const addon = (params.get("addon") || "").toLowerCase();
      const sessionId = params.get("session_id") || "";
      if (!checkout) return;
      if (checkout === "success") {
        try {
          if (sessionId) {
            await api.post("/billing/confirm-checkout", { session_id: sessionId });
            window.dispatchEvent(new Event("churvox-auth-refresh"));
          }
          if (addon === "command_growth_pack") setNotice({ type: "success", title: "Growth Pack added", text: "Your Command Growth Pack checkout completed." });
          else {
            if (plan) setCurrentPlan(plan);
            setNotice({ type: "success", title: "Plan updated", text: `${nicePlanName(plan)} is now active.` });
          }
        } catch (err) {
          console.error("Failed to confirm checkout:", err);
          setNotice({ type: "warning", title: "Checkout completed", text: "Refresh once if the plan or add-on does not update straight away." });
        }
      }
      if (checkout === "cancelled") setNotice({ type: "warning", title: "Checkout cancelled", text: "No changes were made to your plan or add-ons." });
      window.history.replaceState({}, document.title, window.location.pathname);
    };
    handleCheckoutReturn();
  }, []);

  useEffect(() => {
    const loadBilling = async () => {
      setLoading(true);
      try {
        const hintCountry = detectCountryHint();
        const [billingRes, currencyRes] = await Promise.allSettled([api.get("/billing/status"), api.get(`/billing/currency?country=${encodeURIComponent(hintCountry || "")}`)]);
        const billingData = billingRes.status === "fulfilled" ? getPayload(billingRes.value) : null;
        const currencyData = currencyRes.status === "fulfilled" ? getPayload(currencyRes.value) : null;
        if (currencyData?.currency) setCurrencyInfo(currencyData);
        if (billingData && billingData.success !== false) { setBilling(billingData); setCurrentPlan(billingData?.plan ? String(billingData.plan).toLowerCase() : "none"); }
        else { setBilling(null); setCurrentPlan("none"); }
      } catch (err) { console.error("Failed to load billing:", err); setBilling(null); setCurrentPlan("none"); }
      finally { setLoading(false); }
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
  // When false, paid Stripe checkout is not wired in this environment.
  // Trials still work (no card needed); paid upgrades show a clear message.
  const billingConfigured = billing?.billing_configured !== false;

  const buttonLabel = (plan) => {
    if (busyPlan === plan.key) return isNewUser ? "Starting trial…" : "Opening checkout…";
    if (isNewUser) return `Start free trial — ${plan.name}`;
    if ((isPaid || isActiveTrial) && currentPlan === plan.key && !isTrialExpired) return isPaid ? "Current plan" : "Current trial";
    if (isTrialExpired && currentPlan === plan.key) return `Continue with ${plan.name}`;
    return `Choose ${plan.name}`;
  };

  const isDisabled = (plan) => { if (busyPlan || busyAddon) return true; return (isPaid || isActiveTrial) && currentPlan === plan.key && !isTrialExpired; };

  const handleSelectPlan = async (planKey) => {
    if (!planKey || busyPlan || busyAddon) return;
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
      } catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Failed to start trial"); }
      finally { setBusyPlan(""); }
      return;
    }

    try {
      setBusyPlan(planKey);
      if (!billingConfigured) {
        setNotice({ type: "warning", title: "Paid checkout not available here", text: "Billing checkout is not configured in this environment. Your plan and trial are unaffected — please contact support to switch to a paid plan." });
        setBusyPlan("");
        return;
      }
      const res = await api.post("/stripe/create-checkout-session", { plan_type: planKey, country: currencyInfo?.country || detectCountryHint() || "" });
      if (res?.success === false) throw new Error(res.error || "Failed to start checkout");
      const data = getPayload(res) || {};
      const url = data?.checkout_url || data?.url;
      if (!url) throw new Error("No checkout URL returned by server");
      window.location.assign(url);
    } catch (err) { toast.error(err?.response?.data?.detail || err?.data?.detail || err?.message || "Failed to start checkout"); }
    finally { setBusyPlan(""); }
  };

  const handleBuyGrowthPack = async () => {
    if (busyPlan || busyAddon) return;
    if (isNewUser) {
      toast.error("Choose a Churvox plan before adding a Growth Pack.");
      return;
    }

    if (!billingConfigured) {
      setNotice({ type: "warning", title: "Paid checkout not available here", text: "Billing checkout is not configured in this environment. The Command Growth Pack can be purchased once paid checkout is enabled — please contact support." });
      return;
    }

    const payload = {
      plan_type: "command_growth_pack",
      addon_type: "command_growth_pack",
      addon: "command_growth_pack",
      quantity: 1,
      country: currencyInfo?.country || detectCountryHint() || "",
      success_path: "/plans?checkout=success&addon=command_growth_pack",
      cancel_path: "/plans?checkout=cancelled&addon=command_growth_pack",
    };

    const attempts = [
      ["/stripe/create-checkout-session", payload],
      ["/billing/create-addon-checkout-session", payload],
      ["/billing/addons/checkout", payload],
    ];

    try {
      setBusyAddon("command_growth_pack");
      let lastError = null;
      for (const [endpoint, body] of attempts) {
        try {
          const res = await api.post(endpoint, body);
          if (res?.success === false) throw new Error(res.error || res.detail || "Checkout failed");
          const data = getPayload(res) || {};
          const url = data?.checkout_url || data?.url;
          if (url) {
            window.location.assign(url);
            return;
          }
          lastError = new Error(data?.detail || data?.error || "No checkout URL returned");
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError || new Error("Could not open Growth Pack checkout");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.data?.detail || err?.message || "Failed to open Growth Pack checkout");
    } finally {
      setBusyAddon("");
    }
  };

  if (loading) return <main className="cv-plans"><div className="cv-plans-shell"><section className="cv-plans-hero"><p>Loading plans…</p></section></div></main>;

  return (
    <main className="cv-plans" data-version="CHURVOX_APP_PLANS_COMMAND_20260524 CHURVOX_SMS_BLOCK_PRICING_20260529 CHURVOX_COMMAND_GROWTH_USER_BLOCKS_20260530 CHURVOX_BUY_GROWTH_PACK_BUTTON_20260530">
      <div className="cv-plans-shell">
        <header className="cv-plans-top"><Link to="/dashboard" className="cv-plans-brand" data-testid="plans-brand-home" aria-label="Back to Command Floor"><ChurvoxLogo size="lg" /></Link><div className="cv-plans-top-actions"><span>{status.label}</span><Link to="/dashboard" className="cv-plans-back-link" data-testid="plans-back-to-dashboard">← Back to Command Floor</Link></div></header>
        <section className="cv-plans-hero"><div><p className="cv-kicker">Plans & billing</p><h1>Choose how much admin Churvox should run for you.</h1><p>Start with core workflow, move into crew control, or choose Operator where Churvox prepares the daily admin and the owner approves.</p></div><div className="cv-status-pill">{currencyInfo?.currency ? `Billed in ${currencyInfo.currency}` : status.label}</div></section>
        {notice && <div className={`cv-notice ${notice.type === "warning" ? "warn" : ""}`}><b>{notice.title}</b><span>{notice.text}</span></div>}
        {!loading && !billingConfigured && <div className="cv-notice warn" data-testid="billing-not-configured-banner"><b>Paid checkout isn't enabled in this environment yet</b><span>You can still start and use a free trial with no card. Switching to a paid plan or buying add-ons will be available once billing is configured — contact support to enable it.</span></div>}
        <section className="cv-grid">{displayPlans.map((plan) => { const featured = plan.key === "pro"; const current = currentPlan === plan.key && !isTrialExpired; return <article key={plan.key} className={`cv-card ${featured ? "featured" : ""} ${current ? "current" : ""}`}><span>{plan.tag}</span><h2>{plan.name}</h2><div className="cv-price"><b>{plan.price}</b><small>{plan.period}</small></div><p>{plan.blurb}</p><ul>{plan.limits.map((item) => <li key={item}>{item}</li>)}</ul><button type="button" onClick={() => handleSelectPlan(plan.key)} disabled={isDisabled(plan)} data-testid={`plan-btn-${plan.key}`}>{buttonLabel(plan)}</button></article>; })}</section>
        <section className="cv-user-blocks"><div><small>Command Growth Pack</small><b>+50 active team members</b><span>Add more crew, jobs and AI Operator capacity as your business grows. Built for Command customers who need more capacity without changing the whole plan.</span></div><article><small>Growth Pack</small><strong>$99<em> /month + GST</em></strong><p>Each block adds 50 more active team members.</p><button className="cv-user-block-buy" type="button" onClick={handleBuyGrowthPack} disabled={Boolean(busyPlan || busyAddon)} data-testid="buy-command-growth-pack">{busyAddon ? "Opening checkout…" : "Buy Growth Pack"}</button></article><ul>{userBlocks.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section className="cv-sms-pricing"><div><b>SMS credit blocks</b><span>SMS is separate so you only buy what you use. Customer reminders and follow-ups stay approval-first.</span></div><div className="cv-sms-grid">{smsBlocks.map((pack) => <article key={pack.credits}><small>{pack.credits} credits</small><strong>{pack.price}<em> + GST</em></strong><span>{pack.note}</span></article>)}</div></section>
        <section className="cv-footer-row"><div><b>Churvox does the admin</b><span>AI prepares daily actions for owner approval.</span></div><div><b>Command scales</b><span>Growth Pack adds 50 active team members for $99/month + GST.</span></div><div><b>MYOB ready</b><span>Operator add-on available. Included in Command.</span></div></section>
      </div>
    </main>
  );
}
