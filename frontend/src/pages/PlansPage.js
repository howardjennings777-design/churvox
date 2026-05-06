import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { detectCountryHint } from "../lib/country";
import { CheckCircle2, Sparkles, ShieldCheck, CreditCard, Zap, UsersRound, PlusCircle } from "lucide-react";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { PremiumButton, PremiumBadge } from "../components/premium";

const fallbackPlans = [
  { key: "solo", name: "Solo", price: "$30", period: "/month",
    blurb: "For solo operators getting started.", badge: "",
    limits: ["Up to 20 clients", "1 user included", "Jobs, quotes, invoices", "14-day free trial"] },
  { key: "team", name: "Team", price: "$70", period: "/month",
    blurb: "For growing teams that need staff access.", badge: "Most Popular",
    limits: ["Up to 30 clients", "Up to 5 users", "Scheduling and team workflow", "Upgrade any time"] },
  { key: "pro", name: "Pro", price: "$110", period: "/month",
    blurb: "For busy businesses needing more room.", badge: "",
    limits: ["Up to 40 clients", "Up to 10 users", "Advanced workflow tools", "Priority-ready setup"] },
  { key: "enterprise", name: "Enterprise", price: "$240", period: "/month",
    blurb: "For larger teams with heavier usage.", badge: "",
    limits: ["Includes 50 users", "Buy extra 50-user blocks", "$100 per extra 50 users", "MYOB included by default"] },
];

export default function PlansPage() {
  const api = useApi();
  const [plans, setPlans] = useState(fallbackPlans);
  const [billing, setBilling] = useState(null);
  const [currentPlan, setCurrentPlan] = useState("none");
  const [busyPlan, setBusyPlan] = useState("");
  const [busyAddon, setBusyAddon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutNotice, setCheckoutNotice] = useState(null);
  const [currencyInfo, setCurrencyInfo] = useState(null);

  const getPayload = (res) => { if (!res) return null; if (res.success === false) return res; if (res.data !== undefined) return res.data; return res; };

  const mergePlans = (apiPlans, currencyData) => {
    const base = (Array.isArray(apiPlans) && apiPlans.length > 0)
      ? fallbackPlans.map((fb) => {
          const m = apiPlans.find((p) => String(p?.key || p?.plan_type || p?.name || "").toLowerCase() === fb.key);
          if (!m) return fb;
          return {
            ...fb,
            name: m.name || fb.name, price: m.price || fb.price, period: m.period || fb.period,
            blurb: m.blurb || m.description || fb.blurb,
            limits: Array.isArray(m.limits) && m.limits.length > 0 ? m.limits : fb.limits,
            badge: m.badge || fb.badge,
          };
        })
      : fallbackPlans;
    const priced = currencyData && currencyData.prices ? currencyData.prices : null;
    if (!priced) return base;
    return base.map((p) => {
      const info = priced[p.key];
      if (!info || info.amount === undefined) return p;
      return { ...p, price: info.display, currency: info.currency, symbol: info.symbol };
    });
  };

  useEffect(() => {
    const handleCheckoutReturn = async () => {
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("checkout");
      const plan = (params.get("plan") || "").toLowerCase();
      const addon = (params.get("addon") || "").toLowerCase();
      const sessionId = params.get("session_id") || "";
      if (checkout === "success") {
        try {
          if (plan && sessionId && !addon) {
            await api.post("/billing/confirm-checkout", { session_id: sessionId });
            window.dispatchEvent(new Event("churvox-auth-refresh"));
            setCurrentPlan(plan);
          }
          if (addon === "extra_user_block_50") {
            window.dispatchEvent(new Event("churvox-auth-refresh"));
            setCheckoutNotice({ type: "success", title: "50-user block added", text: "Your extra Enterprise 50-user block checkout completed. Refresh Team if the new capacity is not visible yet." });
          } else {
            setCheckoutNotice({ type: "success", title: "Plan updated", text: `Your ${plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : ""} plan is now active.` });
          }
        } catch (err) {
          console.error("Failed to confirm checkout:", err);
          setCheckoutNotice({ type: "warning", title: "Checkout completed, but plan refresh failed", text: "Refresh the page once. If it still shows the old plan, try the upgrade again once." });
        }
      } else if (checkout === "cancelled") {
        setCheckoutNotice({ type: "warning", title: "Checkout cancelled", text: "No changes were made to your plan or user blocks." });
      }
      if (checkout) window.history.replaceState({}, document.title, window.location.pathname);
    };
    handleCheckoutReturn();
  }, []);

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      try {
        const hintCountry = detectCountryHint();
        const [plansRes, billingRes, currencyRes] = await Promise.all([
          api.get("/plan/all"), api.get("/billing/status"),
          api.get(`/billing/currency?country=${encodeURIComponent(hintCountry || "")}`),
        ]);
        const plansData = getPayload(plansRes);
        const billingData = getPayload(billingRes);
        const currencyData = getPayload(currencyRes);
        if (currencyData && currencyData.currency) setCurrencyInfo(currencyData);
        setPlans(plansData && Array.isArray(plansData) ? mergePlans(plansData, currencyData) : mergePlans(fallbackPlans, currencyData));
        if (billingData && billingData.success === false) { setBilling(null); setCurrentPlan("none"); }
        else { setBilling(billingData || null); setCurrentPlan(billingData?.plan ? String(billingData.plan).toLowerCase() : "none"); }
      } catch (err) {
        console.error("Failed to load plans:", err);
        setPlans(fallbackPlans); setBilling(null); setCurrentPlan("none");
      } finally { setLoading(false); }
    };
    loadPlans();
  }, []);

  const formatDate = (iso) => { if (!iso) return ""; try { return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } };

  const banner = useMemo(() => {
    if (billing?.trial_expired) return null;
    if (billing?.trial_active) {
      const days = billing?.days_left;
      return { title: `Free trial active${days || days === 0 ? ` · ${days} day${days === 1 ? "" : "s"} left` : ""}`, text: "No card required during trial. Upgrade any time before it ends." };
    }
    return null;
  }, [billing]);

  const isTrialExpired = billing?.trial_expired === true;
  const isActiveTrial = billing?.trial_active === true;
  const isPaid = billing?.has_paid_subscription === true;
  const isNewUser = currentPlan === "none" || !currentPlan;
  const isEnterprise = currentPlan === "enterprise";
  const canBuyExtraUserBlock = isEnterprise && !isTrialExpired && (isPaid || isActiveTrial);

  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const getButtonState = (planKey) => {
    const isCurrent = planKey === currentPlan;
    const isBusy = busyPlan === planKey;
    if (isBusy) return { disabled: true, label: isNewUser ? "Starting trial…" : "Opening checkout…" };
    if (isNewUser) return { disabled: false, label: `Start free trial — ${cap(planKey)}` };
    if (isTrialExpired) return { disabled: false, label: isCurrent ? `Continue with ${cap(planKey)}` : `Choose ${cap(planKey)}` };
    if (isPaid && isCurrent) return { disabled: true, label: "Current plan" };
    if (isActiveTrial && isCurrent) return { disabled: true, label: "Current trial" };
    return { disabled: false, label: `Choose ${cap(planKey)}` };
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
          setCheckoutNotice({ type: "success", title: "Trial started!", text: `Your 14-day free trial on the ${cap(planKey)} plan is now active. No card required.` });
          setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
        } else { throw new Error(data.detail || data.error || "Failed to start trial"); }
      } catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Failed to start trial"); }
      finally { setBusyPlan(""); }
      return;
    }
    try {
      setBusyPlan(planKey);
      const res = await api.post("/stripe/create-checkout-session", {
        plan_type: planKey, country: currencyInfo?.country || detectCountryHint() || "",
      });
      if (res?.success === false) throw new Error(res.error || "Failed to start checkout");
      const data = getPayload(res) || {};
      const url = data?.checkout_url || data?.url;
      if (!url) throw new Error("No checkout URL returned by server");
      window.location.assign(url);
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.data?.detail || err?.message || "Failed to start checkout");
    } finally { setBusyPlan(""); }
  };

  const handleBuyExtraUserBlock = async () => {
    if (busyAddon) return;
    if (!isEnterprise) {
      toast.error("Extra 50-user blocks are only available on Enterprise.");
      return;
    }
    if (isTrialExpired) {
      toast.error("Reactivate Enterprise before buying extra user blocks.");
      return;
    }

    try {
      setBusyAddon(true);
      const res = await api.post("/stripe/create-checkout-session", {
        plan_type: "enterprise",
        addon_type: "extra_user_block_50",
        extra_user_blocks: 1,
        quantity: 1,
        country: currencyInfo?.country || detectCountryHint() || "",
      });
      if (res?.success === false) throw new Error(res.error || "Failed to start checkout");
      const data = getPayload(res) || {};
      const url = data?.checkout_url || data?.url;
      if (!url) throw new Error("No checkout URL returned by server for the extra 50-user block");
      window.location.assign(url);
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.data?.detail || err?.message || "Could not open extra 50-user block checkout yet.");
    } finally {
      setBusyAddon(false);
    }
  };

  if (loading) {
    return (
      <div className="px-app min-h-screen flex items-center justify-center px-6">
        <div className="text-[14px] text-[#5b6c87]">Loading plans…</div>
      </div>
    );
  }

  return (
    <div className="px-app min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-center mb-6">
          <ChurvoxLogo size="lg" />
        </div>

        {isTrialExpired ? (
          <div className="pt-2 md:pt-4 space-y-6">
            <div className="mx-auto max-w-2xl text-center space-y-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fef3c7] text-[#b45309] text-[11px] font-bold uppercase tracking-wider">
                Trial ended
              </span>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-[#0d1b34]">Your free trial has ended</h1>
              <p className="text-[14px] md:text-[15px] text-[#5b6c87]">
                Your <span className="text-[#0d1b34] font-semibold">{cap(currentPlan)}</span> trial ended on{" "}
                <span className="text-[#0d1b34] font-semibold">{formatDate(billing?.trial_ends_at)}</span>.
                Subscribe to continue using Churvox — you don't need to sign up again.
              </p>
            </div>
            <div className="mx-auto max-w-md">
              <PremiumButton size="lg" className="w-full" onClick={() => handleSelectPlan(currentPlan)} disabled={busyPlan === currentPlan} dataTestId="continue-plan-button">
                {busyPlan === currentPlan ? "Opening checkout…" : `Continue with ${cap(currentPlan)}`}
              </PremiumButton>
              <p className="mt-3 text-center text-[11.5px] text-[#7d8ba3]">Or choose a different plan below</p>
            </div>
          </div>
        ) : (
          <div className="pt-2 md:pt-4 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dbe7ff] text-[#1d4ed8] text-[11px] font-bold uppercase tracking-wider">
              <CreditCard className="h-3 w-3" /> Plans & billing
            </span>
            <h1 className="font-heading text-3xl md:text-5xl font-bold tracking-tight leading-tight text-[#0d1b34] mt-3">
              Pick the plan that fits your business
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[14px] md:text-[15px] text-[#5b6c87] leading-relaxed">
              Start with a 14-day free trial. No card required. Upgrade when you're ready.
            </p>
            {currencyInfo?.currency && (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-[#d8e3f3] bg-white px-3 py-1 text-[12px] text-[#1a2c4d] shadow-sm" data-testid="currency-badge">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                Billed in <span className="font-semibold text-[#0d1b34]">{currencyInfo.currency}</span>
                <span className="text-[#cbd5e1]">·</span>
                <span className="text-[#5b6c87]">{currencyInfo.country}</span>
              </div>
            )}
          </div>
        )}

        {checkoutNotice && (
          <div className={`mx-auto mt-6 mb-6 max-w-3xl rounded-2xl border px-5 py-4 shadow-sm ${
            checkoutNotice.type === "success" ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]" : "border-[#fde68a] bg-[#fffbeb] text-[#92400e]"}`}>
            <div className="font-bold">{checkoutNotice.title}</div>
            <div className="mt-1 text-[13px] opacity-90">{checkoutNotice.text}</div>
          </div>
        )}

        {banner && (
          <div className="mx-auto mt-6 mb-8 max-w-3xl rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af] px-5 py-4 shadow-sm">
            <div className="font-bold">{banner.title}</div>
            <div className="mt-1 text-[13px] opacity-90">{banner.text}</div>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            const btnState = getButtonState(plan.key);
            const isPopular = (plan.badge || "").toLowerCase().includes("popular");

            return (
              <div
                key={plan.key}
                className={`relative rounded-3xl border p-6 transition-all bg-white ${
                  isCurrent && !isTrialExpired
                    ? "border-[#1d4ed8] ring-2 ring-[#1d4ed8]/20 shadow-[0_24px_60px_rgba(37,99,235,0.18)]"
                    : isPopular
                      ? "border-[#1d4ed8]/40 shadow-[0_20px_50px_rgba(37,99,235,0.15)]"
                      : "border-[#d8e3f3] shadow-[0_10px_30px_rgba(13,27,52,0.08)] hover:border-[#c7dcfb] hover:-translate-y-0.5"
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white text-[10.5px] font-bold uppercase tracking-wider shadow-md">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </span>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-[#0d1b34]">{plan.name}</h2>
                    <p className="mt-2 text-[13px] text-[#5b6c87] min-h-[40px]">{plan.blurb}</p>
                  </div>
                  {isCurrent && !isTrialExpired ? <PremiumBadge tone="soft">Current</PremiumBadge>
                    : isCurrent && isTrialExpired ? <PremiumBadge tone="amber">Trial ended</PremiumBadge>
                    : null}
                </div>

                <div className="mt-6 flex items-end gap-1">
                  <span className="font-heading text-4xl font-bold text-[#0d1b34] tracking-tight">{plan.price}</span>
                  <span className="pb-1 text-[13px] text-[#5b6c87]">{plan.period}</span>
                </div>

                <ul className="mt-6 space-y-3 text-[13.5px] text-[#1a2c4d]">
                  {plan.limits.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0d9488]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 space-y-2">
                  <PremiumButton
                    size="lg"
                    className="w-full"
                    variant={isCurrent && !isTrialExpired ? "secondary" : "primary"}
                    onClick={() => handleSelectPlan(plan.key)}
                    disabled={btnState.disabled}
                    dataTestId={`plan-btn-${plan.key}`}
                    iconLeft={isPopular ? <Zap className="h-4 w-4" /> : null}
                  >
                    {btnState.label}
                  </PremiumButton>

                  {plan.key === "enterprise" && isCurrent && !isTrialExpired && (
                    <button
                      type="button"
                      onClick={handleBuyExtraUserBlock}
                      disabled={!canBuyExtraUserBlock || busyAddon}
                      className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-bold text-[#0f172a] shadow-sm hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
                      data-testid="buy-extra-user-block-button"
                    >
                      {busyAddon ? "Opening block checkout…" : "Buy extra 50-user block — $100"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-3xl border border-[#d8e3f3] bg-white p-5 shadow-[0_10px_30px_rgba(13,27,52,0.08)]" data-testid="enterprise-user-block-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1d4ed8]">
                <UsersRound className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-xl font-bold text-[#0d1b34]">Enterprise extra 50-user block</h2>
                  <PremiumBadge tone="soft">$100 / month</PremiumBadge>
                </div>
                <p className="mt-1 text-[13px] text-[#5b6c87]">
                  Enterprise includes 50 users. Add another 50 users whenever the team grows.
                </p>
                {!isEnterprise && (
                  <p className="mt-2 text-[12px] font-semibold text-[#b45309]">Upgrade to Enterprise first to buy extra user blocks.</p>
                )}
              </div>
            </div>

            <PremiumButton
              size="lg"
              variant={canBuyExtraUserBlock ? "primary" : "secondary"}
              onClick={canBuyExtraUserBlock ? handleBuyExtraUserBlock : () => handleSelectPlan("enterprise")}
              disabled={busyAddon || busyPlan === "enterprise"}
              dataTestId="enterprise-extra-user-block-cta"
              iconLeft={<PlusCircle className="h-4 w-4" />}
            >
              {canBuyExtraUserBlock
                ? (busyAddon ? "Opening checkout…" : "Buy 50-user block")
                : (busyPlan === "enterprise" ? "Opening Enterprise…" : "Choose Enterprise")}
            </PremiumButton>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-[#d8e3f3] bg-white px-4 py-3 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#0d9488]" />
            <p className="text-[13px] text-[#1a2c4d]"><span className="font-semibold">Secure billing</span> via Stripe</p>
          </div>
          <div className="rounded-2xl border border-[#d8e3f3] bg-white px-4 py-3 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#7c3aed]" />
            <p className="text-[13px] text-[#1a2c4d]"><span className="font-semibold">AI assistant</span> on every plan</p>
          </div>
          <div className="rounded-2xl border border-[#d8e3f3] bg-white px-4 py-3 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-[#1d4ed8]" />
            <p className="text-[13px] text-[#1a2c4d]"><span className="font-semibold">Cancel anytime</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
