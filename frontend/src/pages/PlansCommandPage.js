import React from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import FirstSetupGuide from "../components/FirstSetupGuide";
import { CHURVOX_PLANS, COMMAND_GROWTH_PACK, XERO_ADDON, QUICK_PRICING_NOTES, getPlan, hasPlanAtLeast, nicePlanName } from "../config/churvoxPlans";

const colors = { solo: "#22d3ee", team: "#34d399", pro: "#fb923c", enterprise: "#a78bfa" };
function checkoutUrl(res) { return res?.data?.url || res?.data?.checkout_url || res?.url || res?.checkout_url || ""; }
function isSubscribed(user) { return Boolean(user?.stripe_subscription_id || user?.subscription_status === "active"); }
function formatDate(value) { if (!value) return "Not set"; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }); }
function trialText(user) { if (isSubscribed(user)) return "Paid subscription active"; if (!user?.trial_ends_at) return "Trial status not set"; const end = new Date(user.trial_ends_at); if (Number.isNaN(end.getTime())) return "Trial date not readable"; const days = Math.ceil((end.getTime() - Date.now()) / 86400000); return days < 0 ? `Trial ended ${formatDate(user.trial_ends_at)}` : `${days} day${days === 1 ? "" : "s"} left · ends ${formatDate(user.trial_ends_at)}`; }
function DarkCard({ children, color = "#fb923c", className = "" }) { return <article className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#111827,#070d16)] p-5 pl-8 text-white shadow-[0_22px_62px_rgba(2,6,23,.24)] ${className}`}><span className="absolute left-0 top-0 h-full w-2.5 rounded-l-[30px]" style={{ background: color }} />{children}</article>; }

export default function PlansCommandPage() {
  const location = useLocation();
  const { user, checkAuth, hasAppAccess } = useAuth();
  const { get, post } = useApi();
  const [status, setStatus] = React.useState(null);
  const [addons, setAddons] = React.useState(null);
  const [busy, setBusy] = React.useState("");
  const currentPlan = String(status?.plan || user?.plan || "solo").toLowerCase();
  const currentPlanData = getPlan(currentPlan);

  const refreshPlan = React.useCallback(async () => {
    const [sub, add] = await Promise.allSettled([get("/billing/subscription-status"), get("/billing/addons")]);
    if (sub.status === "fulfilled" && sub.value?.success) setStatus(sub.value.data || {});
    if (add.status === "fulfilled" && add.value?.success) setAddons(add.value.data || add.value);
    await checkAuth?.();
  }, [get, checkAuth]);

  React.useEffect(() => { refreshPlan(); }, [refreshPlan]);

  React.useEffect(() => {
    let alive = true;
    async function handleReturn() {
      const params = new URLSearchParams(location.search);
      const addon = params.get("addon") || "";
      const sessionId = params.get("session_id") || "";
      if (params.get("canceled") || params.get("cancelled") || params.get("addon_cancelled")) toast.info("Checkout cancelled — no changes made");
      if (!addon || !sessionId) {
        if (params.get("success") || params.get("checkout") === "success") toast.success("Checkout finished. Refreshing your plan status.");
        return;
      }
      setBusy("confirm-addon");
      const res = await post("/billing/confirm-addon-checkout", { addon, session_id: sessionId }, { timeout: 25000 });
      if (!alive) return;
      setBusy("");
      if (res?.success) {
        toast.success(res?.data?.message || res?.message || "Add-on activated");
        await refreshPlan();
        const clean = new URL(window.location.href);
        ["addon", "session_id", "addon_success"].forEach((key) => clean.searchParams.delete(key));
        window.history.replaceState({}, document.title, clean.toString());
      } else {
        toast.error(res?.error || "Could not confirm add-on checkout");
      }
    }
    handleReturn();
    return () => { alive = false; };
  }, [location.search, post, refreshPlan]);

  async function choosePlan(planKey) {
    if (!planKey) return;
    if (planKey === currentPlan && isSubscribed(user)) return toast.info("That is already your active plan");
    setBusy(planKey);
    const res = await post("/billing/create-checkout-session", { plan: planKey });
    setBusy("");
    const url = checkoutUrl(res);
    if (res?.success && url) { window.location.href = url; return; }
    toast.error(res?.error || "Could not open Stripe Checkout. Check Stripe price IDs and try again.");
  }

  async function buyAddon(addonKey) {
    setBusy(addonKey);
    const res = await post("/billing/create-addon-checkout-session", { addon: addonKey });
    setBusy("");
    const url = checkoutUrl(res);
    if (res?.success && url) { window.location.href = url; return; }
    toast.error(res?.error || "Could not open add-on checkout. Check Stripe add-on price IDs.");
  }

  const canBuyXero = hasPlanAtLeast(currentPlan, "pro");
  const canBuyGrowth = currentPlan === "enterprise";
  const reviewedAccess = [["Current plan", currentPlanData?.name || nicePlanName(currentPlan) || "Not set"], ["Subscription", isSubscribed({ ...user, ...status }) ? "Active" : "Trial / no Stripe subscription"], ["Trial", trialText(user || {})], ["App access", hasAppAccess ? "Allowed" : "Locked"]];

  return <main className="cv-launch-plans-page min-h-screen bg-[#f7f3ea] p-4 text-slate-950 md:p-6 xl:pl-[320px]" data-command-canvas><section className="mx-auto max-w-7xl space-y-5"><FirstSetupGuide mode="full" force />
    <DarkCard className="p-6 pl-9 md:p-8 md:pl-10"><div className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Plans</div><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox does the admin. You approve.</h1><p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Pick a plan, then add Xero or Command Growth Packs when your business needs them. MYOB is hidden for now.</p><div className="mt-6 flex flex-wrap gap-3"><Link to="/dashboard" className="rounded-2xl bg-[linear-gradient(135deg,#facc15,#fb923c_55%,#22d3ee)] px-5 py-3 text-sm font-black text-slate-950 no-underline">Command Board</Link><button type="button" onClick={refreshPlan} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white">Refresh plan status</button></div></DarkCard>
    {busy === "confirm-addon" ? <section className="rounded-[24px] border border-cyan-200 bg-cyan-50 p-4 text-sm font-black text-cyan-950">Confirming add-on checkout with Stripe…</section> : null}
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{reviewedAccess.map(([label, value], i) => <DarkCard key={label} color={["#22d3ee", "#34d399", "#facc15", "#fb923c"][i]}><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><div className="mt-3 text-2xl font-black tracking-[-.05em] text-white">{value}</div></DarkCard>)}</section>
    <section className="grid gap-5 xl:grid-cols-4">{CHURVOX_PLANS.map((plan) => { const current = plan.key === currentPlan; return <article key={plan.key} className={`relative overflow-hidden rounded-[30px] border border-slate-800 bg-[#0b1018] p-5 pl-7 text-white shadow-[0_22px_62px_rgba(2,6,23,.22)] ${plan.featured ? "ring-2 ring-orange-400" : ""}`}><span className="absolute left-0 top-0 h-full w-2.5" style={{ background: plan.featured ? "#fb923c" : colors[plan.key] }} />{plan.featured ? <div className="absolute right-4 top-4 rounded-full bg-orange-400 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-950">Recommended</div> : null}<div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-amber-200">{current ? "Current" : plan.tag}</div><h2 className="mt-4 text-3xl font-black tracking-[-.06em]">{plan.name}</h2><div className="mt-3"><span className="text-5xl font-black tracking-[-.08em]">{plan.price}</span><span className="pb-2 text-sm font-black text-slate-300">{plan.period}</span></div><p className="mt-4 text-sm font-bold leading-6 text-slate-300">{plan.summary}</p><ul className="mt-5 grid gap-3">{plan.includes.slice(0, 7).map((feature) => <li key={feature} className="flex gap-3 text-sm font-black leading-6"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-300 text-[10px] text-slate-950">✓</span><span>{feature}</span></li>)}</ul><button type="button" disabled={busy === plan.key || current} onClick={() => choosePlan(plan.key)} className="mt-6 inline-flex w-full justify-center rounded-2xl bg-orange-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">{busy === plan.key ? "Opening checkout…" : current ? "Current plan" : `Choose ${plan.name}`}</button></article>; })}</section>
    <section className="grid gap-5 xl:grid-cols-2"><DarkCard color="#22d3ee"><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Accounting add-on</div><h2 className="mt-2 text-3xl font-black tracking-[-.05em] text-white">{XERO_ADDON.name}</h2><div className="mt-2 text-2xl font-black text-cyan-200">{XERO_ADDON.price}{XERO_ADDON.period}</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{XERO_ADDON.description}</p><div className="mt-3 rounded-2xl bg-white/10 p-3 text-sm font-black text-white">Status: {addons?.xero_addon_active ? "Active" : "Not active"}</div><button disabled={!canBuyXero || busy === XERO_ADDON.key || addons?.xero_addon_active} onClick={() => buyAddon(XERO_ADDON.key)} className="mt-4 rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">{addons?.xero_addon_active ? "Xero active" : canBuyXero ? "Add Xero" : "Needs Operator or Command"}</button></DarkCard>
    <DarkCard color="#fb923c"><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Scale add-on</div><h2 className="mt-2 text-3xl font-black tracking-[-.05em] text-white">{COMMAND_GROWTH_PACK.name}</h2><div className="mt-2 text-2xl font-black text-cyan-200">{COMMAND_GROWTH_PACK.price}{COMMAND_GROWTH_PACK.period}</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{COMMAND_GROWTH_PACK.description}</p><div className="mt-3 rounded-2xl bg-white/10 p-3 text-sm font-black text-white">Active blocks: {addons?.extra_user_blocks || 0} · Extra team: {addons?.max_extra_team_members || 0}</div><button disabled={!canBuyGrowth || busy === COMMAND_GROWTH_PACK.key} onClick={() => buyAddon(COMMAND_GROWTH_PACK.key)} className="mt-4 rounded-2xl bg-orange-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">{canBuyGrowth ? "Add Growth Pack" : "Needs Command plan"}</button></DarkCard></section>
    <section className="rounded-[30px] border-2 border-slate-300 bg-[#fffaf0] p-5 shadow-[0_18px_50px_rgba(15,23,42,.10)] md:p-6"><div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-700">Pricing notes</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">Operator is the main selling plan.</h2><div className="mt-4 flex flex-wrap gap-3">{QUICK_PRICING_NOTES.map((note) => <span key={note} className="rounded-2xl border-2 border-orange-200 bg-slate-950 px-4 py-3 text-xs font-black leading-5 text-white shadow-sm">{note}</span>)}</div></section>
  </section></main>;
}
