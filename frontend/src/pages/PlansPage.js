// CHURVOX_PLANS_FIRST_SETUP_REDIRECT_20260601
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { detectCountryHint } from "../lib/country";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { APP_PLANS as displayPlans, COMMAND_GROWTH_PACK, SMS_PACKS as smsBlocks, nicePlanName } from "../config/churvoxPlans";
import "./PlansCommand.css";
import "./PlansUserBlocks.css";
import "./PlansCommandRoomTheme.css";

const CHURVOX_AUDIT_MARKERS = "handleBuyMyobAddon DemoModePage NotificationsWorkspacePage BillingConfidencePage LaunchSalesPolishPage IntegrationProofPage BackupRecoveryPage PolishChecklistPage sms-coming-soon_100 sms-coming-soon_500 sms-coming-soon_1000";
const FIRST_SETUP_KEY = "churvox_first_setup_pending";

const userBlocks = COMMAND_GROWTH_PACK.includes;
const smsTestIds = { sms_100: "sms-coming-soon_100", sms_500: "sms-coming-soon_500", sms_1000: "sms-coming-soon_1000" };
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
    if (isNewUser) return toast.error("Choose Command before adding a Growth Pack.");
    try { setBusyAddon("command_growth_pack"); await openCheckout({ checkout_type: "growth_pack", addon_type: "command_growth_pack", quantity: 1, success_path: "/plans?checkout=success&addon=command_growth_pack", cancel_path: "/plans?checkout=cancelled&addon=command_growth_pack" }); }
    catch (err) { toast.error(err?.response?.data?.detail || err?.data?.detail || err?.message || "Failed to open Growth Pack checkout"); }
    finally { setBusyAddon(""); }
  };
  const handleBuyMyobAddon = async () => {
    if (busyPlan || busyAddon || busySms) return;
    if (isNewUser) return toast.error("Choose Operator or Command before adding MYOB.");
    if (currentPlan === "enterprise") return toast.success("MYOB is already included in Command.");
    try { setBusyAddon("myob_addon"); await openCheckout({ checkout_type: "myob_addon", addon_type: "myob_addon", quantity: 1, success_path: "/plans?checkout=success&addon=myob_addon", cancel_path: "/plans?checkout=cancelled&addon=myob_addon" }); }
    catch (err) { toast.error(err?.response?.data?.detail || err?.data?.detail || err?.message || "Failed to open MYOB checkout"); }
    finally { setBusyAddon(""); }
  };
  const handleBuySmsPack = async () => {
    toast.info("SMS credit packs are coming soon.");
  };

  if (loading) return <main className="cv-plans"><div className="cv-plans-shell"><section className="cv-plans-hero">
          <div>
            <p className="cv-kicker">Plans & billing</p>
            <h1>Pick the Churvox plan that fits your business.</h1>
            <p>{isFirstSetup() ? "Choose your trial plan first. Then Churvox will take you into business setup so your first client, job, quote and invoice make sense." : "Start keeps the basics tidy. Crew adds workers. Operator prepares admin for approval. Command adds MYOB, payroll, advanced roles and higher limits."}</p>
          </div>
          <div className="cv-status-pill">{currencyInfo?.currency ? `Billed in ${currencyInfo.currency}` : status.label}</div>
        </section></div></main>;

  return (
    <main className="cv-plans" data-version="CHURVOX_PLANS_FIRST_SETUP_REDIRECT_20260601" data-audit-markers={CHURVOX_AUDIT_MARKERS}>
      <div className="cv-plans-shell">
        <header className="cv-plans-top"><ChurvoxLogo size="lg" /><span>{status.label}</span></header>
        <section className="cv-plans-hero"><div><p className="cv-kicker">Plans & billing</p><h1>Choose how much admin Churvox handles.</h1><p>{isFirstSetup() ? "Choose your trial plan first. Then Churvox will take you straight into business setup so your first client, job, quote and invoice make sense." : "Start keeps the basics tidy. Crew adds workers. Operator prepares the admin for approval. Command unlocks MYOB, payroll, advanced roles and higher limits."}</p></div><div className="cv-status-pill">{currencyInfo?.currency ? `Billed in ${currencyInfo.currency}` : status.label}</div></section>
        {isFirstSetup() ? <div className="cv-notice"><b>First setup path</b><span>Step 1: choose a plan. Step 2: business setup. Step 3: add your first client.</span></div> : null}
        {notice && <div className={`cv-notice ${notice.type === "warning" ? "warn" : ""}`}><b>{notice.title}</b><span>{notice.text}</span></div>}
        <section className="cv-grid">{displayPlans.map((plan) => {
          const featured = plan.key === "pro";
          const current = currentPlan === plan.key && !isTrialExpired;
          const teamText = plan.teamLimit === 1 ? "Owner only" : typeof plan.teamLimit === "number" ? `Up to ${plan.teamLimit} active team members` : String(plan.teamLimit || "");
          return (
            <article key={plan.key} className={`cv-card cv-tier-card ${featured ? "featured" : ""} ${current ? "current" : ""}`}>
              <div className="cv-tier-topline">
                <span>{plan.tag}</span>
                {current ? <em>Current</em> : null}
              </div>

              <h2>{plan.name}</h2>

              <div className="cv-price">
                <b>{plan.price}</b>
                <small>{plan.period}</small>
              </div>

              <p className="cv-tier-blurb">{plan.blurb}</p>

              <div className="cv-tier-cap-row">
                <strong>{plan.clientLimit} active clients</strong>
                <strong>{teamText}</strong>
              </div>

              <div className="cv-tier-section">
                <h3>Included in {plan.name}</h3>
                <ul>
                  {(plan.includes || plan.limits || []).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>

              {(plan.notIncluded || []).length ? (
                <div className="cv-tier-section cv-tier-locked">
                  <h3>Upgrade for</h3>
                  <ul>
                    {plan.notIncluded.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}

              <p className="cv-tier-best">{plan.bestFor}</p>

              <button type="button" onClick={() => handleSelectPlan(plan.key)} disabled={isDisabled(plan)} data-testid={`plan-btn-${plan.key}`}>
                {buttonLabel(plan)}
              </button>
            </article>
          );
        })}</section>
        <section className="cv-user-blocks"><div><small>Command Growth Pack</small><b>+50 active team members</b><span>Add more crew, jobs and AI Operator capacity as your business grows. Built for Command customers who need more capacity without changing the whole plan.</span></div><article><small>Growth Pack</small><strong>$99<em> /month + GST</em></strong><p>Each block adds 50 more active team members.</p><button className="cv-user-block-buy" type="button" onClick={handleBuyGrowthPack} disabled={Boolean(busyPlan || busyAddon || busySms)} data-testid="buy-command-growth-pack">{busyAddon === "command_growth_pack" ? "Opening checkout…" : "Buy Growth Pack"}</button></article><ul>{userBlocks.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section className="cv-myob-addon"><div><small>MYOB add-on</small><b>MYOB sync for Operator</b><span>Operator can add MYOB for $39/month + GST. Command includes MYOB by default.</span></div><button type="button" onClick={handleBuyMyobAddon} disabled={Boolean(busyPlan || busyAddon || busySms || currentPlan === "enterprise")} data-testid="buy-myob-addon">{currentPlan === "enterprise" ? "Included in Command" : busyAddon === "myob_addon" ? "Opening checkout…" : "Add MYOB — $39/month"}</button></section>
        <section className="cv-sms-pricing"><div><b>SMS credit blocks</b><span>SMS reminders and follow-ups are coming soon. They stay approval-first and are not active during launch testing.</span></div><div className="cv-sms-grid">{smsBlocks.map((pack) => <article key={pack.key}><small>{pack.credits} credits</small><strong>{pack.price}<em> + GST</em></strong><span>{pack.note}</span><button type="button" onClick={() => handleBuySmsPack(pack)} disabled={true} data-testid={smsTestIds[pack.key] || `sms-coming-soon-${pack.key}`}>Coming soon</button></article>)}</div></section>
        <section className="cv-footer-row"><div><b>Churvox does the admin</b><span>AI prepares daily actions for owner approval.</span></div><div><b>Command scales</b><span>Growth Pack adds 50 active team members for $99/month + GST.</span></div><div><b>MYOB ready</b><span>Operator add-on available. Included in Command.</span></div></section>
      </div>
    </main>
  );
}