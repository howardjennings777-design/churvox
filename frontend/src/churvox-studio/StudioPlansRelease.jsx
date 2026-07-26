import React from "react";
import { Check, CreditCard, ShieldCheck, Sparkles, X } from "lucide-react";
import { ADDONS, PLANS } from "../churvox-product/controlBoardData";

const PLAN_KEYS = {
  start: "solo",
  crew: "team",
  operator: "pro",
  command: "enterprise",
};

function bodyOf(result) {
  return result?.data?.data ?? result?.data ?? result ?? {};
}

function numberText(value) {
  return new Intl.NumberFormat("en-NZ").format(Number(value || 0));
}

function UsagePanel({ usage, loading }) {
  const acceptedSource = /^locked_paid_launch_limits_/i.test(String(usage?.limit_source || ""));
  const used = usage?.used || {};
  const limits = usage?.limits || {};
  const verified = usage?.usage_verified === true && acceptedSource && [used.active_team_members, used.clients, used.jobs_this_month, used.ai_actions].every((value) => Number.isFinite(Number(value)));

  if (loading) {
    return (
      <section id="churvox-plan-live-usage" className="cvReleaseUsage cvReleaseUsageLoading">
        <span><Sparkles size={18} /></span>
        <div><h2>Checking live usage</h2><p>Churvox is reading verified business counters.</p></div>
      </section>
    );
  }

  if (!verified) {
    const outdated = usage?.usage_verified === true && !acceptedSource;
    return (
      <section id="churvox-plan-live-usage" className="cvReleaseUsage unavailable">
        <span><ShieldCheck size={20} /></span>
        <div>
          <small>Usage guard</small>
          <h2>Live usage is unavailable</h2>
          <p>{outdated ? "Churvox rejected an outdated plan-limit source. No usage number has been assumed." : "No usage number has been assumed. Refresh after the live counters are available."}</p>
        </div>
      </section>
    );
  }

  const cards = [
    ["Active team", used.active_team_members, limits.active_team_members],
    ["Clients", used.clients, limits.clients],
    ["Jobs this month", used.jobs_this_month, limits.jobs_per_month],
    ["Command actions", used.ai_actions, limits.ai_actions],
  ];

  return (
    <section id="churvox-plan-live-usage" className="cvReleaseUsage verified">
      <header><div><small>Live account truth</small><h2>Operator usage</h2></div><span><Check size={16} />Verified from live business records</span></header>
      <div className="cvReleaseUsageGrid">
        {cards.map(([label, current, limit]) => (
          <article className="cvUsageCard" key={label}>
            <small>{label}</small>
            <strong>{numberText(current)} / {numberText(limit)}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function CheckoutDialog({ selected, email, setEmail, close, continueToStripe, busy, error }) {
  if (!selected) return null;
  return (
    <div className="cvReleaseCheckoutLayer">
      <button type="button" className="cvReleaseCheckoutScrim" onClick={close} aria-label="Close checkout" />
      <section role="dialog" aria-modal="true" aria-label={`${selected.name} Stripe checkout`} className="cvReleaseCheckout">
        <header>
          <div><small>Secure Stripe checkout</small><h2>{selected.name}</h2><p>No card details are entered into Churvox.</p></div>
          <button type="button" onClick={close} aria-label="Close"><X size={18} /></button>
        </header>
        <label>
          <span>Owner email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus />
        </label>
        {error ? <p role="alert" className="cvReleaseCheckoutError">{error}</p> : null}
        <footer>
          <button type="button" onClick={close}>Cancel</button>
          <button type="button" className="primary" onClick={continueToStripe} disabled={busy || !email.trim()}><CreditCard size={17} />{busy ? "Opening Stripe…" : "Continue to Stripe"}</button>
        </footer>
      </section>
    </div>
  );
}

export default function StudioPlansRelease({ access, user, api }) {
  const [billing, setBilling] = React.useState(user || {});
  const [usage, setUsage] = React.useState(null);
  const [usageLoading, setUsageLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(null);
  const [email, setEmail] = React.useState(user?.email || "");
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    Promise.all([api.get("/billing/subscription-status"), api.get("/plan/usage")]).then(([billingResult, usageResult]) => {
      if (!active) return;
      const nextBilling = bodyOf(billingResult);
      const nextUsage = bodyOf(usageResult);
      if (nextBilling && typeof nextBilling === "object") setBilling((current) => ({ ...current, ...nextBilling }));
      setUsage(nextUsage && typeof nextUsage === "object" ? nextUsage : null);
      setUsageLoading(false);
    }).catch(() => {
      if (!active) return;
      setUsage(null);
      setUsageLoading(false);
    });
    return () => { active = false; };
  }, [api]);

  const stripeBacked = Boolean(billing?.stripe_customer_id || billing?.stripe_subscription_id || user?.stripe_customer_id || user?.stripe_subscription_id);
  const currentPlan = access.planKey;

  const manageBilling = async () => {
    setBusy("portal");
    setError("");
    const result = await api.post("/billing/create-portal-session", {});
    const body = bodyOf(result);
    const url = body?.url || body?.portal_url;
    if (result?.success !== false && url) window.location.assign(url);
    else setError(result?.error || body?.detail || "Billing management could not be opened.");
    setBusy("");
  };

  const startCheckout = (item) => {
    setSelected(item);
    setEmail(user?.email || "");
    setError("");
  };

  const continueToStripe = async () => {
    if (!selected) return;
    setBusy("checkout");
    setError("");
    const code = selected.code;
    const payload = {
      plan: PLAN_KEYS[code] || code,
      plan_key: code,
      selected_plan: code,
      email: email.trim().toLowerCase(),
      success_url: `${window.location.origin}/billing/success?plan=${encodeURIComponent(code)}&country=NZ`,
      cancel_url: `${window.location.origin}/plans?checkout=cancelled&plan=${encodeURIComponent(code)}`,
    };
    const result = await api.post("/billing/create-checkout-session", payload);
    const body = bodyOf(result);
    const url = body?.url || body?.checkout_url;
    if (result?.success !== false && url) window.location.assign(url);
    else setError(result?.error || body?.detail || "Stripe checkout could not be opened.");
    setBusy("");
  };

  return (
    <div className="cvsPage cvReleasePlansRoot">
      <header className="cvsPageLead cvReleasePlansLead">
        <div><span className="cvsEyebrow">Plans & billing</span><h1>See your current access before comparing anything.</h1><p>Pricing stays exactly as set. Churvox shows live usage honestly and sends payment details directly through Stripe.</p></div>
        {stripeBacked ? <button type="button" className="cvsButton primary" onClick={manageBilling} disabled={busy === "portal"}><CreditCard size={17} />{busy === "portal" ? "Opening…" : "Manage billing"}</button> : null}
      </header>

      {error && !selected ? <p role="alert" className="cvReleasePlansError">{error}</p> : null}

      <section className="cvReleaseCurrentPlan">
        <div><small>Current access</small><h2>{access.planName}</h2><p>14-day trial, no card. Upgrade only when the business needs the next layer.</p></div>
        <span>OWNER-CONTROLLED BILLING</span>
      </section>

      <UsagePanel usage={usage} loading={usageLoading} />

      <section className="cvsPlansStrip cvReleasePlansGrid">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.code;
          const buttonLabel = isCurrent ? "Current plan" : plan.code === "command" ? "Start Command" : `Choose ${plan.name}`;
          return (
            <article key={plan.code} data-plan-card data-stripe-plan={plan.name} className={isCurrent ? "current" : ""}>
              <small>{isCurrent ? "Current plan" : "Monthly"}</small>
              <h2>{plan.name}</h2>
              <strong>${plan.price}/month + GST</strong>
              <p>{plan.note}</p>
              <ul>{plan.items.map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul>
              <button type="button" disabled={isCurrent} onClick={() => startCheckout({ ...plan, name: plan.name })}>{buttonLabel}</button>
              {isCurrent ? <em>CURRENT</em> : null}
            </article>
          );
        })}
      </section>

      <section className="cvsAddons cvReleaseAddons">
        {ADDONS.map((addon) => {
          const code = addon.name === "Command Growth Pack" ? "command-growth-pack" : "accounting-sync-addon";
          const label = addon.name === "Command Growth Pack" ? "Add growth pack" : "Add accounting sync";
          return (
            <article key={addon.name} data-plan-card data-stripe-plan={addon.stripe}>
              <div><small>Optional capacity</small><h3>{addon.name}</h3><p>{addon.note}</p></div>
              <strong>${addon.price}<span>/month + GST</span></strong>
              <button type="button" onClick={() => startCheckout({ ...addon, code, name: addon.name })}>{label}</button>
            </article>
          );
        })}
      </section>

      <CheckoutDialog selected={selected} email={email} setEmail={setEmail} close={() => setSelected(null)} continueToStripe={continueToStripe} busy={busy === "checkout"} error={selected ? error : ""} />
    </div>
  );
}
