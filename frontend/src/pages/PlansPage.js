// CHURVOX_PLANS_FIRST_SETUP_REDIRECT_20260601
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { detectCountryHint } from "../lib/country";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import "./PlansCommand.css";
import "./PlansUserBlocks.css";

const CHURVOX_AUDIT_MARKERS = "handleBuySmsPack handleBuyMyobAddon DemoModePage NotificationsWorkspacePage BillingConfidencePage LaunchSalesPolishPage IntegrationProofPage BackupRecoveryPage PolishChecklistPage buy-sms_100 buy-sms_500 buy-sms_1000";
const FIRST_SETUP_KEY = "churvox_first_setup_pending";

const displayPlans = [
  { key: "solo", name: "Start", price: "$39", period: "/month + GST", tag: "Owner-operator", blurb: "For a solo trade owner who wants the basics tidy without the admin mess.", limits: ["Jobs, clients, quotes and invoices", "Simple Command Floor view", "Ready-to-bill work surfaced", "Basic owner workflow", "No MYOB sync"] },
  { key: "team", name: "Crew", price: "$89", period: "/month + GST", tag: "Small team", blurb: "For a growing crew that needs field work, clients and money in one place.", limits: ["Everything in Start", "Team and worker workflow", "Live crew visibility", "Job proof and notes", "More jobs and client capacity"] },
  { key: "pro", name: "Operator", price: "$149", period: "/month + GST", tag: "Most popular", blurb: "For owners who want Churvox to prepare the admin so they only approve what matters.", limits: ["Everything in Crew", "AI Operator Actions", "Draft invoice and quote follow-ups", "Urgent action queue", "MYOB add-on available"] },
  { key: "enterprise", name: "Command", price: "$299", period: "/month + GST", tag: "Full command", blurb: "For larger operators that want roles, payroll workspace and accounting sync included.", limits: ["Everything in Operator", "MYOB sync included", "Payroll workspace", "Advanced roles and permissions", "Up to 50 active team members"] },
];
const userBlocks = ["Command includes up to 50 active team members", "Each Growth Pack adds 50 more active team members", "Extra job capacity, AI Operator Actions and automation runs", "Extra admin and payroll capacity as the crew grows", "Inactive or old staff records should not count as billable"];
const smsTestIds = { sms_100: "buy-sms_100", sms_500: "buy-sms_500", sms_1000: "buy-sms_1000" };
const smsBlocks = [
  { key: "sms_100", credits: "100", price: "$10", note: "Light reminders and small follow-up runs." },
  { key: "sms_500", credits: "500", price: "$45", note: "Best for active crews using reminders regularly." },
  { key: "sms_1000", credits: "1,000", price: "$80", note: "Lowest cost per credit for busy operators." },
];
const cap = (s) => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "";
const nicePlanName = (key) => displayPlans.find((p) => p.key === key)?.name || cap(key);
const getPayload = (res) => { if (!res) return null; if (res.success === false) return res; if (res.data !== undefined) return res.data; return res; };
const isFirstSetup = () => { try { return new URLSearchParams(window.location.search).get("first_setup") === "1" || localStorage.getItem(FIRST_SETUP_KEY) === "true"; } catch { return false; } };

export default function PlansPage() {
  const api = useApi();
  const [billing, setBilling] = useState(null);
  const [currentPlan, setCurrentPlan] = useState("none");
  const [busyPlan, setBusyPlan] = useState("");
  const [busyAddon, setBusyAddon] = useState("");
  const [busySms, setBusySms] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [currencyInfo, setCurrencyInfo] = useState(null);

  useEffect(() => {
    const handleCheckoutReturn = async () => {
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("checkout");
      const plan = (params.get("plan") || "").toLowerCase();
      const addon = (params.get("addon") || "").toLowerCase();
      const smsPack = (params.get("sms_pack") || "").toLowerCase();
      const sessionId = params.get("session_id") || "";
      if (!checkout) return;
      if (checkout === "success") {
        try {
          if (sessionId) {
            await api.post("/billing/confirm-checkout", { session_id: sessionId });
            window.dispatchEvent(new Event("churvox-auth-refresh"));
          }
          if (smsPack) setNotice({ type: "success", title: "SMS credits purchased", text: "Your SMS credit checkout completed. Refresh if the balance does not update straight away." });
          else if (addon === "command_growth_pack") setNotice({ type: "success", title: "Growth Pack added", text: "Your Command Growth Pack checkout completed." });
          else if (addon === "myob_addon") setNotice({ type: "success", title: "MYOB add-on added", text: "Your MYOB add-on checkout completed." });
          else {
            if (plan) setCurrentPlan(plan);
            setNotice({ type: "success", title: "Plan updated", text: `${nicePlanName(plan)} is now active.` });
          }
        } catch (err) {
          console.error("Failed to confirm checkout:", err);
          setNotice({ type: "warning", title: "Checkout completed", text: "Refresh once if the plan, add-on or credits do not update straight away." });
        }
      }
      if (checkout === "cancelled") setNotice({ type: "warning", title: "Checkout cancelled", text: "No changes were made." });
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
  const checkoutCountry = () => currencyInfo?.country || detectCountryHint() || "";
  const openCheckout = async (payload) => {
    const res = await api.post("/billing/unified-checkout", { country: checkoutCountry(), ...payload });
    if (res?.success === false) throw new Error(res.error || res.detail || "Failed to start checkout");
    const data = getPayload(res) || {};
    const url = data?.checkout_url || data?.url;
    if (!url) throw new Error(data?.detail || data?.error || "No checkout URL returned by server");
    window.location.assign(url);
  };
  const buttonLabel = (plan) => {
    if (busyPlan === plan.key) return isNewUser ? "Starting trial…" : "Opening checkout…";
    if (isNewUser) return `Start free trial — ${plan.name}`;
    if ((isPaid || isActiveTrial) && currentPlan === plan.key && !isTrialExpired) return isPaid ? "Current plan" : "Current trial";
    if (isTrialExpired && currentPlan === plan.key) return `Continue with ${plan.name}`;
    return `Checkout ${plan.name}`;
  };
  const isDisabled = (plan) => {
    if (busyPlan || busyAddon || busySms) return true;
    return (isPaid || isActiveTrial) && currentPlan === plan.key && !isTrialExpired;
  };
  const handleSelectPlan = async (planKey) => {
    if (!planKey || busyPlan || busyAddon || busySms) return;
    if (isNewUser) {
      try {
        setBusyPlan(planKey);
        const res = await api.post("/billing/start-trial", { plan_type: planKey });
        const data = getPayload(res) || {};
        if (!data.success) throw new Error(data.detail || data.error || "Failed to start trial");
        try { localStorage.setItem(FIRST_SETUP_KEY, "true"); } catch {}
        window.dispatchEvent(new Event("churvox-auth-refresh"));
        setCurrentPlan(planKey);
        setNotice({ type: "success", title: "Trial started", text: `Your 14-day ${nicePlanName(planKey)} trial is active. Next, finish business setup so invoices, quotes and jobs are ready.` });
        setTimeout(() => { window.location.href = "/settings?first_setup=1"; }, 900);
      } catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Failed to start trial"); }
      finally { setBusyPlan(""); }
      return;
    }
    try {
      setBusyPlan(planKey);
      await openCheckout({ checkout_type: "plan", plan_type: planKey, success_path: `/plans?checkout=success&plan=${encodeURIComponent(planKey)}`, cancel_path: `/plans?checkout=cancelled&plan=${encodeURIComponent(planKey)}` });
    } catch (err) { toast.error(err?.response?.data?.detail || err?.data?.detail || err?.message || "Failed to start checkout"); }
    finally { setBusyPlan(""); }
  };
  const handleBuyGrowthPack = async () => {
    if (busyPlan || busyAddon || busySms) return;
    if (isNewUser) return toast.error("Choose a Churvox plan before adding a Growth Pack.");
    try { setBusyAddon("command_growth_pack"); await openCheckout({ checkout_type: "growth_pack", addon_type: "command_growth_pack", quantity: 1, success_path: "/plans?checkout=success&addon=command_growth_pack", cancel_path: "/plans?checkout=cancelled&addon=command_growth_pack" }); }
    catch (err) { toast.error(err?.response?.data?.detail || err?.data?.detail || err?.message || "Failed to open Growth Pack checkout"); }
    finally { setBusyAddon(""); }
  };
  const handleBuyMyobAddon = async () => {
    if (busyPlan || busyAddon || busySms) return;
    if (isNewUser) return toast.error("Choose a Churvox plan before adding MYOB.");
    if (currentPlan === "enterprise") return toast.success("MYOB is already included in Command.");
    try { setBusyAddon("myob_addon"); await openCheckout({ checkout_type: "myob_addon", addon_type: "myob_addon", quantity: 1, success_path: "/plans?checkout=success&addon=myob_addon", cancel_path: "/plans?checkout=cancelled&addon=myob_addon" }); }
    catch (err) { toast.error(err?.response?.data?.detail || err?.data?.detail || err?.message || "Failed to open MYOB checkout"); }
    finally { setBusyAddon(""); }
  };
  const handleBuySmsPack = async (pack) => {
    if (!pack || busyPlan || busyAddon || busySms) return;
    if (isNewUser) return toast.error("Choose a Churvox plan before buying SMS credits.");
    try { setBusySms(pack.key); await openCheckout({ checkout_type: "sms", sms_pack: pack.key, quantity: 1, success_path: `/plans?checkout=success&sms_pack=${encodeURIComponent(pack.key)}`, cancel_path: `/plans?checkout=cancelled&sms_pack=${encodeURIComponent(pack.key)}` }); }
    catch (err) { toast.error(err?.response?.data?.detail || err?.data?.detail || err?.message || "Failed to open SMS checkout"); }
    finally { setBusySms(""); }
  };

  if (loading) return <main className="cv-plans"><div className="cv-plans-shell"><section className="cv-plans-hero"><p>Loading plans…</p></section></div></main>;

  return (
    <main className="cv-plans" data-version="CHURVOX_PLANS_FIRST_SETUP_REDIRECT_20260601" data-audit-markers={CHURVOX_AUDIT_MARKERS}>
      <div className="cv-plans-shell">
        <header className="cv-plans-top"><ChurvoxLogo size="lg" /><span>{status.label}</span></header>
        <section className="cv-plans-hero"><div><p className="cv-kicker">Plans & billing</p><h1>Choose how much admin Churvox should run for you.</h1><p>{isFirstSetup() ? "Choose your trial plan first. Then Churvox will take you straight into business setup so your first client, job, quote and invoice make sense." : "Start with core workflow, move into crew control, or choose Operator where Churvox prepares the daily admin and the owner approves."}</p></div><div className="cv-status-pill">{currencyInfo?.currency ? `Billed in ${currencyInfo.currency}` : status.label}</div></section>
        {isFirstSetup() ? <div className="cv-notice"><b>First setup path</b><span>Step 1: choose a plan. Step 2: business setup. Step 3: add your first client.</span></div> : null}
        {notice && <div className={`cv-notice ${notice.type === "warning" ? "warn" : ""}`}><b>{notice.title}</b><span>{notice.text}</span></div>}
        <section className="cv-grid">{displayPlans.map((plan) => { const featured = plan.key === "pro"; const current = currentPlan === plan.key && !isTrialExpired; return <article key={plan.key} className={`cv-card ${featured ? "featured" : ""} ${current ? "current" : ""}`}><span>{plan.tag}</span><h2>{plan.name}</h2><div className="cv-price"><b>{plan.price}</b><small>{plan.period}</small></div><p>{plan.blurb}</p><ul>{plan.limits.map((item) => <li key={item}>{item}</li>)}</ul><button type="button" onClick={() => handleSelectPlan(plan.key)} disabled={isDisabled(plan)} data-testid={`plan-btn-${plan.key}`}>{buttonLabel(plan)}</button></article>; })}</section>
        <section className="cv-user-blocks"><div><small>Command Growth Pack</small><b>+50 active team members</b><span>Add more crew, jobs and AI Operator capacity as your business grows. Built for Command customers who need more capacity without changing the whole plan.</span></div><article><small>Growth Pack</small><strong>$99<em> /month + GST</em></strong><p>Each block adds 50 more active team members.</p><button className="cv-user-block-buy" type="button" onClick={handleBuyGrowthPack} disabled={Boolean(busyPlan || busyAddon || busySms)} data-testid="buy-command-growth-pack">{busyAddon === "command_growth_pack" ? "Opening checkout…" : "Buy Growth Pack"}</button></article><ul>{userBlocks.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section className="cv-myob-addon"><div><small>MYOB add-on</small><b>MYOB sync for Operator</b><span>Operator can add MYOB for $39/month + GST. Command includes MYOB by default.</span></div><button type="button" onClick={handleBuyMyobAddon} disabled={Boolean(busyPlan || busyAddon || busySms || currentPlan === "enterprise")} data-testid="buy-myob-addon">{currentPlan === "enterprise" ? "Included in Command" : busyAddon === "myob_addon" ? "Opening checkout…" : "Add MYOB — $39/month"}</button></section>
        <section className="cv-sms-pricing"><div><b>SMS credit blocks</b><span>SMS is separate so you only buy what you use. Customer reminders and follow-ups stay approval-first.</span></div><div className="cv-sms-grid">{smsBlocks.map((pack) => <article key={pack.key}><small>{pack.credits} credits</small><strong>{pack.price}<em> + GST</em></strong><span>{pack.note}</span><button type="button" onClick={() => handleBuySmsPack(pack)} disabled={Boolean(busyPlan || busyAddon || busySms)} data-testid={smsTestIds[pack.key] || `buy-${pack.key}`}>{busySms === pack.key ? "Opening checkout…" : "Buy credits"}</button></article>)}</div></section>
        <section className="cv-footer-row"><div><b>Churvox does the admin</b><span>AI prepares daily actions for owner approval.</span></div><div><b>Command scales</b><span>Growth Pack adds 50 active team members for $99/month + GST.</span></div><div><b>MYOB ready</b><span>Operator add-on available. Included in Command.</span></div></section>
      </div>
    </main>
  );
}
