import React from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { CHURVOX_PLANS, COMMAND_GROWTH_PACK, QUICK_PRICING_NOTES, getPlan, hasPlanAtLeast, nicePlanName } from "../config/churvoxPlans";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

const colors = {
  solo: "#22d3ee",
  team: "#34d399",
  pro: "#fb923c",
  enterprise: "#a78bfa",
};

const planWorkspaces = {
  solo: ["Command Board", "Jobs", "Clients", "Quotes", "Invoices", "Settings", "Support"],
  team: ["Everything in Start", "Team", "Crew Dispatch", "Worker job flow", "Worker photos", "Role-safe job visibility"],
  pro: ["Everything in Crew", "AI Operator Actions", "Approval queue", "Invoice/quote follow-up prep", "Worker assignment suggestions", "MYOB add-on available"],
  enterprise: ["Everything in Operator", "Payroll", "Reports", "Advanced roles", "MYOB included", "Command Growth Packs"],
};

function Tape({ color = "#fb923c" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[30px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.3) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 20px ${color}66` }} />;
}
function DarkCard({ children, color = "#fb923c", className = "" }) {
  return <article className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#111827,#070d16)] p-5 pl-8 text-white shadow-[0_22px_62px_rgba(2,6,23,.24),inset_0_1px_0_rgba(255,255,255,.06)] ${className}`}><Tape color={color} />{children}</article>;
}
function Detail({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 break-words text-sm font-black leading-6 text-white">{value}</div></div>;
}
function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}
function checkoutUrl(res) {
  return res?.data?.url || res?.data?.checkout_url || res?.url || res?.checkout_url || "";
}
function isSubscribed(user) {
  return Boolean(user?.stripe_subscription_id || user?.subscription_status === "active");
}
function trialText(user) {
  if (isSubscribed(user)) return "Paid subscription active";
  if (!user?.trial_ends_at) return "Trial status not set";
  const end = new Date(user.trial_ends_at);
  if (Number.isNaN(end.getTime())) return "Trial date not readable";
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days < 0) return `Trial ended ${formatDate(user.trial_ends_at)}`;
  return `${days} day${days === 1 ? "" : "s"} left · ends ${formatDate(user.trial_ends_at)}`;
}

function PlanSlip({ plan, currentPlan, busyPlan, onClose, onCheckout }) {
  if (!plan) return null;
  const current = currentPlan === plan.key;
  const included = hasPlanAtLeast(currentPlan, plan.key);
  return <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true"><div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]"><header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7"><div><div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Plan review slip</div><h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{plan.name}</h2><p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{plan.blurb}</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button></header><div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7"><section className="space-y-5"><section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Plan details</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Detail label="Price" value={`${plan.price}${plan.period}`} /><Detail label="Best for" value={plan.bestFor} /><Detail label="Client limit" value={`${plan.clientLimit} active clients`} /><Detail label="Team limit" value={String(plan.teamLimit)} /><Detail label="Current access" value={current ? "This is your current plan" : included ? "Your current plan includes this level" : "Upgrade required"} /><Detail label="Plan key" value={plan.key} /></div></section><section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Included workspaces</div><div className="mt-4 grid gap-2 md:grid-cols-2">{(planWorkspaces[plan.key] || plan.includes).map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-sm font-black text-white">✓ {item}</div>)}</div></section>{plan.notIncluded?.length ? <section className="rounded-[28px] border border-amber-300/25 bg-amber-300/10 p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Not included</div><div className="mt-3 grid gap-2">{plan.notIncluded.map((item) => <div key={item} className="text-sm font-bold text-amber-50">• {item}</div>)}</div></section> : null}</section><aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner action</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Plan changes go through Stripe Checkout. After payment, Churvox refreshes the account and returns you to the app.</p>{current ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Current plan</div> : null}<div className="mt-5 grid gap-3"><button type="button" disabled={current || busyPlan === plan.key} onClick={() => onCheckout(plan.key)} className="rounded-2xl bg-gradient-to-r from-amber-300 via-orange-300 to-cyan-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">{busyPlan === plan.key ? "Opening checkout…" : current ? "Current plan" : `Choose ${plan.name}`}</button><Link to="/support-board" onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Ask about this plan</Link><Link to="/dashboard" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-center text-sm font-black text-white no-underline ring-1 ring-white/10">Back to Command Board</Link><button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to plans</button></div></aside></div></div></div>;
}

export default function PlansCommandPage() {
  const location = useLocation();
  const { user, checkAuth, hasAppAccess } = useAuth();
  const { get, post } = useApi();
  const [status, setStatus] = React.useState(null);
  const [busyPlan, setBusyPlan] = React.useState("");
  const [selectedPlan, setSelectedPlan] = React.useState(null);
  const currentPlan = String(status?.plan || user?.plan || "solo").toLowerCase();
  const currentPlanData = getPlan(currentPlan);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("canceled") || params.get("cancelled")) toast.info("Checkout cancelled — no plan changes made");
    if (params.get("success") || params.get("checkout") === "success") toast.success("Checkout finished. Refreshing your plan status.");
  }, [location.search]);

  React.useEffect(() => {
    let alive = true;
    get("/billing/subscription-status").then((res) => {
      if (!alive) return;
      if (res?.success) setStatus(res.data || {});
    });
    return () => { alive = false; };
  }, [get]);

  async function choosePlan(planKey) {
    if (!planKey) return;
    if (planKey === currentPlan && isSubscribed(user)) return toast.info("That is already your active plan");
    setBusyPlan(planKey);
    const res = await post("/billing/create-checkout-session", { plan: planKey });
    setBusyPlan("");
    const url = checkoutUrl(res);
    if (res?.success && url) {
      window.location.href = url;
      return;
    }
    toast.error(res?.error || "Could not open Stripe Checkout. Check Stripe price IDs and try again.");
  }

  async function refreshPlan() {
    const res = await get("/billing/subscription-status");
    if (res?.success) setStatus(res.data || {});
    await checkAuth?.();
    toast.success("Plan status refreshed");
  }

  const reviewedAccess = [
    ["Current plan", currentPlanData?.name || nicePlanName(currentPlan) || "Not set"],
    ["Subscription", isSubscribed({ ...user, ...status }) ? "Active" : "Trial / no Stripe subscription"],
    ["Trial", trialText(user || {})],
    ["App access", hasAppAccess ? "Allowed" : "Locked"],
  ];

  return <main className="cv-launch-plans-page min-h-screen bg-[#f7f3ea] p-4 text-slate-950 md:p-6 xl:pl-[320px]" data-command-canvas><section className="mx-auto max-w-7xl space-y-5"><DarkCard className="p-6 pl-9 md:p-8 md:pl-10"><div className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Plans</div><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox does the admin. You approve.</h1><p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Pricing is built around AI Operator Actions: Churvox prepares admin, surfaces decisions and keeps the owner in control.</p><div className="mt-6 flex flex-wrap gap-3"><Link to="/dashboard" className="rounded-2xl bg-[linear-gradient(135deg,#facc15,#fb923c_55%,#22d3ee)] px-5 py-3 text-sm font-black text-slate-950 no-underline shadow-lg shadow-orange-500/20">Command Board</Link><Link to="/support-board" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline hover:bg-white/15">Ask about plans</Link><button type="button" onClick={refreshPlan} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Refresh plan status</button></div></DarkCard>

    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{reviewedAccess.map(([label, value], index) => <DarkCard key={label} color={["#22d3ee", "#34d399", "#facc15", "#fb923c"][index]}><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><div className="mt-3 text-2xl font-black tracking-[-.05em] text-white">{value}</div></DarkCard>)}</section>

    <section className="grid gap-5 xl:grid-cols-4">{CHURVOX_PLANS.map((plan) => { const current = plan.key === currentPlan; const included = hasPlanAtLeast(currentPlan, plan.key); return <article key={plan.key} className={`cv-launch-plan-card ${plan.featured ? "cv-launch-plan-featured" : ""} relative overflow-hidden rounded-[30px] border p-5 pl-7 text-white`}><Tape color={plan.featured ? "#fb923c" : colors[plan.key]} />{plan.featured ? <div className="absolute right-4 top-4 rounded-full bg-orange-400 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-950">Recommended</div> : null}<div className="cv-launch-plan-badge inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.16em]">{current ? "Current" : included ? "Included" : plan.tag}</div><h2 className="mt-4 text-3xl font-black tracking-[-.06em]">{plan.name}</h2><div className="mt-3 flex items-end gap-1"><span className="cv-launch-plan-price text-5xl font-black tracking-[-.08em]">{plan.price}</span><span className="cv-launch-plan-muted pb-2 text-sm font-black">{plan.period}</span></div><p className="cv-launch-plan-muted mt-4 text-sm font-bold leading-6">{plan.summary}</p><ul className="mt-5 grid gap-3">{plan.includes.slice(0, 6).map((feature) => <li key={feature} className="cv-launch-plan-feature flex items-start gap-3 text-sm font-black leading-6"><span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-300 text-[10px] text-slate-950">✓</span><span>{feature}</span></li>)}</ul><div className="mt-6 grid gap-2"><button type="button" disabled={busyPlan === plan.key || current} onClick={() => choosePlan(plan.key)} className="cv-launch-plan-cta inline-flex w-full justify-center rounded-2xl px-5 py-4 text-sm font-black no-underline disabled:opacity-50">{busyPlan === plan.key ? "Opening checkout…" : current ? "Current plan" : `Choose ${plan.name}`}</button><button type="button" onClick={() => setSelectedPlan(plan)} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white">Review plan</button></div></article>; })}</section>

    <section className="grid gap-5 xl:grid-cols-3"><DarkCard color="#fb923c" className="min-h-[180px]"><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Add-on / scale</div><h2 className="mt-2 text-2xl font-black tracking-[-.05em] text-white">{COMMAND_GROWTH_PACK.name}</h2><div className="mt-2 text-xl font-black text-cyan-200">{COMMAND_GROWTH_PACK.price}{COMMAND_GROWTH_PACK.period}</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{COMMAND_GROWTH_PACK.description}</p><ul className="mt-3 grid gap-2">{COMMAND_GROWTH_PACK.includes.slice(0, 3).map((item) => <li key={item} className="text-sm font-bold text-slate-200">• {item}</li>)}</ul></DarkCard><DarkCard color="#22d3ee" className="min-h-[180px]"><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Accounting</div><h2 className="mt-2 text-2xl font-black tracking-[-.05em] text-white">Xero / MYOB direction</h2><div className="mt-2 text-xl font-black text-cyan-200">Approval-first</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Operator can add accounting sync. Command includes it by default. No accounting records change without owner approval.</p></DarkCard><DarkCard color="#34d399" className="min-h-[180px]"><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">SMS</div><h2 className="mt-2 text-2xl font-black tracking-[-.05em] text-white">SMS credits</h2><div className="mt-2 text-xl font-black text-cyan-200">Separate / coming soon</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">SMS stays separate from core plans until reminders are stable and safe.</p></DarkCard></section>

    <section className="cv-launch-clean-white-card rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6"><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Launch plan rule</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Operator is the main selling plan.</h2><p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">Start is for getting going, Crew is for teams, Operator is where AI Operator value becomes obvious, and Command is for serious operators who need payroll, roles, scale and priority support.</p><div className="mt-4 flex flex-wrap gap-2">{QUICK_PRICING_NOTES.map((note) => <span key={note} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{note}</span>)}</div></section></section><PlanSlip plan={selectedPlan} currentPlan={currentPlan} busyPlan={busyPlan} onClose={() => setSelectedPlan(null)} onCheckout={choosePlan} /></main>;
}
