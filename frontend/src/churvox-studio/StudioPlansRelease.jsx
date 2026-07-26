import React from "react";
import { Check, CreditCard, ExternalLink, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { ADDONS, PLANS } from "../churvox-product/controlBoardData";

const PLAN_KEYS = {
  start: "solo",
  crew: "team",
  operator: "pro",
  command: "enterprise",
};

const ADDON_KEYS = {
  "Command Growth Pack": "command_growth_pack",
  "Accounting Sync Add-on": "xero_addon",
};

const PLATFORM_OWNER_EMAILS = new Set([
  "hello@churvox.com",
  "howardjennings77@gmail.com",
  "howardjennings777@gmail.com",
]);

function bodyOf(result) {
  return result?.data?.data ?? result?.data ?? result ?? {};
}

function errorOf(result, fallback) {
  const body = bodyOf(result);
  return result?.error || body?.detail || body?.message || body?.error || fallback;
}

function numberText(value) {
  return new Intl.NumberFormat("en-NZ").format(Number(value || 0));
}

function moneyText(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function normalizePlanKey(value) {
  const key = String(value || "").trim().toLowerCase();
  if (["command", "enterprise"].includes(key)) return "command";
  if (["operator", "pro", "professional"].includes(key)) return "operator";
  if (["crew", "team"].includes(key)) return "crew";
  if (["start", "solo", "starter", "basic"].includes(key)) return "start";
  return "none";
}

function activeAddonRows(addons) {
  const rows = bodyOf(addons)?.active;
  return Array.isArray(rows) ? rows : [];
}

function isAddonActive(addons, addonKey) {
  const data = bodyOf(addons);
  if (addonKey === "xero_addon" && (data?.xero_addon_active === true || data?.accounting_sync === true)) return true;
  if (addonKey === "command_growth_pack" && Number(data?.growth_packs || data?.extra_user_blocks || 0) > 0) return true;
  return activeAddonRows(addons).some((row) => {
    const key = String(row?.addon_key || row?.addon || "").trim().toLowerCase();
    const status = String(row?.status || "active").trim().toLowerCase();
    return key === addonKey && !/cancel|inactive|expired|revoked/.test(status);
  });
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
      <header>
        <div><small>Live account truth</small><h2>{usage?.plan_label || "Plan"} usage</h2></div>
        <span className="cvReleaseStatusPill good"><Check size={16} />Verified from live business records</span>
      </header>
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
  const isAddon = selected.kind === "addon";
  return (
    <div className="cvReleaseCheckoutLayer">
      <button type="button" className="cvReleaseCheckoutScrim" onClick={close} aria-label="Close checkout" />
      <section role="dialog" aria-modal="true" aria-label={`${selected.name} Stripe checkout`} className="cvReleaseCheckout">
        <header>
          <div>
            <small>{isAddon ? "Secure add-on checkout" : "Secure plan checkout"}</small>
            <h2>{selected.name}</h2>
            <p>{moneyText(selected.price)}/month + GST. Card details are entered directly in Stripe.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close"><X size={18} /></button>
        </header>
        {isAddon ? (
          <div className="cvReleaseCheckoutAccount">
            <span>Authenticated owner account</span>
            <strong>{email || "Current Churvox owner"}</strong>
          </div>
        ) : (
          <label>
            <span>Owner email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus />
          </label>
        )}
        {error ? <p role="alert" className="cvReleaseCheckoutError">{error}</p> : null}
        <footer>
          <button type="button" onClick={close}>Cancel</button>
          <button type="button" className="primary" onClick={continueToStripe} disabled={busy || (!isAddon && !email.trim())}>
            <CreditCard size={17} />{busy ? "Opening Stripe…" : "Continue to Stripe"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function StudioPlansRelease({ access, user, api }) {
  const [billing, setBilling] = React.useState(user || {});
  const [usage, setUsage] = React.useState(null);
  const [addons, setAddons] = React.useState({});
  const [statusLoading, setStatusLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(null);
  const [email, setEmail] = React.useState(user?.email || "");
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const returnHandled = React.useRef(false);

  const loadAccountTruth = React.useCallback(async () => {
    setStatusLoading(true);
    const results = await Promise.allSettled([
      api.get("/billing/subscription-status"),
      api.get("/plan/usage"),
      api.get("/billing/addons"),
    ]);

    const [billingResult, usageResult, addonsResult] = results;
    if (billingResult.status === "fulfilled" && billingResult.value?.success !== false) {
      const nextBilling = bodyOf(billingResult.value);
      if (nextBilling && typeof nextBilling === "object") setBilling((current) => ({ ...current, ...nextBilling }));
    }
    if (usageResult.status === "fulfilled" && usageResult.value?.success !== false) {
      const nextUsage = bodyOf(usageResult.value);
      setUsage(nextUsage && typeof nextUsage === "object" ? nextUsage : null);
    } else {
      setUsage(null);
    }
    if (addonsResult.status === "fulfilled" && addonsResult.value?.success !== false) {
      const nextAddons = bodyOf(addonsResult.value);
      setAddons(nextAddons && typeof nextAddons === "object" ? nextAddons : {});
    }

    const failed = results.filter((result) => result.status === "rejected" || result.value?.success === false).length;
    if (failed === results.length) setError("Plan, usage and add-on status could not be loaded. Try refresh.");
    setStatusLoading(false);
  }, [api]);

  React.useEffect(() => {
    loadAccountTruth();
  }, [loadAccountTruth]);

  React.useEffect(() => {
    if (returnHandled.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search || "");
    const addon = String(params.get("addon") || "").trim().toLowerCase();
    const sessionId = String(params.get("session_id") || "").trim();
    const addonSuccess = params.get("addon_success") === "1";
    const addonCancelled = String(params.get("addon_cancelled") || "").trim();
    if (!addonSuccess && !addonCancelled) return;
    returnHandled.current = true;

    const cleanReturnUrl = () => {
      const next = new URL(window.location.href);
      ["addon_success", "addon", "quantity", "country", "session_id", "addon_cancelled"].forEach((key) => next.searchParams.delete(key));
      window.history.replaceState({}, document.title, next.toString());
    };

    if (addonCancelled) {
      setNotice("Add-on checkout was cancelled. Nothing changed.");
      cleanReturnUrl();
      return;
    }

    if (!addon || !sessionId) {
      setError("Stripe returned without the add-on confirmation details.");
      cleanReturnUrl();
      return;
    }

    setBusy("confirm-addon");
    api.post("/billing/confirm-addon-checkout", {
      addon,
      session_id: sessionId,
      quantity: Number(params.get("quantity") || 1),
    }).then((result) => {
      if (result?.success === false) throw new Error(errorOf(result, "Add-on activation could not be confirmed."));
      setNotice(bodyOf(result)?.message || "Add-on activated successfully.");
      return loadAccountTruth();
    }).catch((activationError) => {
      setError(activationError?.message || "Add-on activation could not be confirmed.");
    }).finally(() => {
      setBusy("");
      cleanReturnUrl();
    });
  }, [api, loadAccountTruth]);

  const stripeBacked = Boolean(billing?.stripe_customer_id || billing?.stripe_subscription_id || user?.stripe_customer_id || user?.stripe_subscription_id);
  const currentPlan = normalizePlanKey(billing?.plan || billing?.plan_key || billing?.selected_plan || billing?.subscription_plan || access.planKey);
  const userEmail = String(user?.email || billing?.email || "").trim().toLowerCase();
  const userRole = String(user?.role || "").trim().toLowerCase().replace(/\s+/g, "_");
  const platformOwner = PLATFORM_OWNER_EMAILS.has(userEmail) || ["platform_owner", "platform-owner", "platformowner"].includes(userRole);

  const manageBilling = async () => {
    setBusy("portal");
    setError("");
    setNotice("");
    try {
      const result = await api.post("/billing/create-portal-session", {});
      const body = bodyOf(result);
      const url = body?.url || body?.portal_url;
      if (result?.success !== false && url) window.location.assign(url);
      else setError(errorOf(result, "Billing management could not be opened."));
    } catch (portalError) {
      setError(portalError?.message || "Billing management could not be opened.");
    } finally {
      setBusy("");
    }
  };

  const refreshStatus = async () => {
    setBusy("refresh");
    setError("");
    setNotice("");
    await loadAccountTruth();
    setNotice("Plan, usage and add-on status refreshed.");
    setBusy("");
  };

  const startPlanCheckout = (plan) => {
    setSelected({ ...plan, kind: "plan" });
    setEmail(user?.email || billing?.email || "");
    setError("");
    setNotice("");
  };

  const startAddonCheckout = (addon) => {
    const addonKey = ADDON_KEYS[addon.name];
    if (!addonKey) {
      setError("This add-on is not connected to a billing product.");
      return;
    }
    if (addonKey === "command_growth_pack" && currentPlan !== "command") {
      setNotice("Command Growth Pack requires the Command plan first.");
      return;
    }
    if (addonKey === "xero_addon" && isAddonActive(addons, addonKey)) {
      setNotice("Accounting Sync Add-on is already active for this account.");
      return;
    }
    setSelected({ ...addon, kind: "addon", addonKey });
    setEmail(user?.email || billing?.email || "");
    setError("");
    setNotice("");
  };

  const continueToStripe = async () => {
    if (!selected) return;
    setBusy("checkout");
    setError("");
    try {
      const isAddon = selected.kind === "addon";
      const endpoint = isAddon ? "/billing/create-addon-checkout-session" : "/billing/create-checkout-session";
      const payload = isAddon ? {
        addon: selected.addonKey,
        quantity: 1,
        country: "NZ",
      } : {
        plan: PLAN_KEYS[selected.code] || selected.code,
        plan_key: selected.code,
        selected_plan: selected.code,
        email: email.trim().toLowerCase(),
        success_url: `${window.location.origin}/billing/success?plan=${encodeURIComponent(selected.code)}&country=NZ`,
        cancel_url: `${window.location.origin}/plans?checkout=cancelled&plan=${encodeURIComponent(selected.code)}`,
      };
      const result = await api.post(endpoint, payload);
      const body = bodyOf(result);
      const url = body?.url || body?.checkout_url;
      if (result?.success !== false && url) window.location.assign(url);
      else setError(errorOf(result, "Stripe checkout could not be opened."));
    } catch (checkoutError) {
      setError(checkoutError?.message || "Stripe checkout could not be opened.");
    } finally {
      setBusy("");
    }
  };

  const growthPackCount = Number(addons?.growth_packs || addons?.extra_user_blocks || 0);

  return (
    <div className="cvsPage cvReleasePlansRoot">
      <header className="cvsPageLead cvReleasePlansLead">
        <div>
          <span className="cvsEyebrow">Plans & billing</span>
          <h1>See your current access before comparing anything.</h1>
          <p>Pricing stays exactly as set. Churvox shows live usage honestly and sends payment details directly through Stripe.</p>
        </div>
        <div className="cvReleaseHeaderActions">
          <button type="button" className="cvsButton" onClick={refreshStatus} disabled={busy === "refresh" || statusLoading}>
            <RefreshCw size={17} className={busy === "refresh" ? "cvReleaseSpin" : ""} />{busy === "refresh" ? "Refreshing…" : "Refresh status"}
          </button>
          {stripeBacked ? (
            <button type="button" className="cvsButton primary" onClick={manageBilling} disabled={busy === "portal"}>
              <CreditCard size={17} />{busy === "portal" ? "Opening…" : "Manage billing"}
            </button>
          ) : null}
          {platformOwner ? <a className="cvsButton cvReleaseHqLink" href="/admin">Open My HQ <ExternalLink size={16} /></a> : null}
        </div>
      </header>

      {error && !selected ? <p role="alert" className="cvReleasePlansError">{error}</p> : null}
      {notice ? <p role="status" className="cvReleasePlansNotice">{notice}</p> : null}

      <section className="cvReleaseCurrentPlan">
        <div><small>Current access</small><h2>{access.planName}</h2><p>14-day trial, no card. Upgrade only when the business needs the next layer.</p></div>
        <span className="cvReleaseStatusPill dark">OWNER-CONTROLLED BILLING</span>
      </section>

      <UsagePanel usage={usage} loading={statusLoading} />

      <section className="cvsPlansStrip cvReleasePlansGrid" aria-label="Churvox plans">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.code;
          const buttonLabel = isCurrent ? "Current plan" : plan.code === "command" ? "Start Command" : `Choose ${plan.name}`;
          return (
            <article key={plan.code} data-plan-card data-stripe-plan={plan.name} className={isCurrent ? "current" : ""}>
              <small>{isCurrent ? "Current plan" : "Monthly"}</small>
              <h2>{plan.name}</h2>
              <strong>{moneyText(plan.price)}/month + GST</strong>
              <p>{plan.note}</p>
              <ul>{plan.items.map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul>
              <button type="button" disabled={isCurrent} onClick={() => startPlanCheckout(plan)}>{buttonLabel}</button>
              {isCurrent ? <em className="cvReleasePlanPill">CURRENT</em> : null}
            </article>
          );
        })}
      </section>

      <section className="cvsAddons cvReleaseAddons" aria-label="Churvox add-ons">
        {ADDONS.map((addon) => {
          const addonKey = ADDON_KEYS[addon.name];
          const active = isAddonActive(addons, addonKey);
          const isGrowth = addonKey === "command_growth_pack";
          const blocked = isGrowth && currentPlan !== "command";
          const buttonLabel = blocked ? "Command plan required" : active && !isGrowth ? "Already active" : active && isGrowth ? "Add another growth pack" : isGrowth ? "Add growth pack" : "Add accounting sync";
          return (
            <article key={addon.name} data-plan-card data-stripe-plan={addon.stripe}>
              <div>
                <small>Optional capacity</small>
                <h3>{addon.name}</h3>
                <p>{addon.note}</p>
                {active ? <span className="cvReleaseAddonPill good">{isGrowth ? `${growthPackCount} active pack${growthPackCount === 1 ? "" : "s"}` : "Active"}</span> : null}
                {blocked ? <span className="cvReleaseAddonPill warn">Command plan required</span> : null}
              </div>
              <strong>{moneyText(addon.price)}<span>/month + GST</span></strong>
              <button type="button" disabled={blocked || (active && !isGrowth)} onClick={() => startAddonCheckout(addon)}>{buttonLabel}</button>
            </article>
          );
        })}
      </section>

      <CheckoutDialog
        selected={selected}
        email={email}
        setEmail={setEmail}
        close={() => { setSelected(null); setError(""); }}
        continueToStripe={continueToStripe}
        busy={busy === "checkout" || busy === "confirm-addon"}
        error={selected ? error : ""}
      />
    </div>
  );
}
