import React from "react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Start",
    price: "$39",
    note: "+ GST / month",
    badge: "Owner starter",
    summary: "For solo operators who need jobs, clients, invoices and a clean command board.",
    features: ["Command Board", "Jobs and clients", "Quotes and invoices", "Basic AI-prepared slips", "Owner support path"],
  },
  {
    name: "Crew",
    price: "$89",
    note: "+ GST / month",
    badge: "Small crew",
    summary: "For teams that need worker assignment, job visibility and better daily control.",
    features: ["Everything in Start", "Team workspace", "Worker job flow", "Crew Map", "Role-safe access"],
  },
  {
    name: "Operator",
    price: "$149",
    note: "+ GST / month",
    badge: "Most popular",
    summary: "For owners who want Churvox to prepare the admin and bring decisions to them.",
    features: ["Everything in Crew", "More AI Operator Actions", "Approval queue focus", "Invoice/quote follow-up prep", "Xero direction support"],
    featured: true,
  },
  {
    name: "Command",
    price: "$299",
    note: "+ GST / month",
    badge: "Operations control",
    summary: "For larger crews that need payroll workspace, advanced roles, scale and priority support.",
    features: ["Everything in Operator", "Payroll workspace", "Advanced roles", "Up to 50 active team members", "Priority support"],
  },
];

const extras = [
  ["Command Growth Pack", "$99 + GST / month", "Adds 50 more active team members plus extra job, admin, automation and AI Operator capacity."],
  ["Xero accounting direction", "Staged", "Xero is the visible accounting direction for launch polish. Sync should stay approval-first."],
  ["SMS credits", "Separate", "Customer reminders and SMS should stay separate from the core subscription until the SMS flow is stable."],
];

function Tape({ color = "#fb923c" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[30px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.3) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 20px ${color}66` }} />;
}

function DarkCard({ children, color = "#fb923c", className = "" }) {
  return (
    <article className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#111827,#070d16)] p-5 pl-8 text-white shadow-[0_22px_62px_rgba(2,6,23,.24),inset_0_1px_0_rgba(255,255,255,.06)] ${className}`}>
      <Tape color={color} />
      {children}
    </article>
  );
}

export default function PlansCommandPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] p-4 pb-32 text-slate-950 md:p-6 md:pb-28 xl:pl-[320px]">
      <section className="mx-auto max-w-7xl space-y-5">
        <DarkCard className="p-6 pl-9 md:p-8 md:pl-10">
          <div className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Plans</div>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox does the admin. You approve.</h1>
          <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Pricing is built around one clear value: AI Operator Actions that prepare the admin, surface the decisions and keep the owner in control.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/dashboard" className="rounded-2xl bg-[linear-gradient(135deg,#facc15,#fb923c_55%,#22d3ee)] px-5 py-3 text-sm font-black text-slate-950 no-underline shadow-lg shadow-orange-500/20">Command Board</Link>
            <Link to="/support" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline hover:bg-white/15">Ask about plans</Link>
          </div>
        </DarkCard>

        <section className="grid gap-5 xl:grid-cols-4">
          {plans.map((plan, index) => (
            <article key={plan.name} className={`relative overflow-hidden rounded-[30px] border p-5 shadow-[0_18px_50px_rgba(15,23,42,.08)] ${plan.featured ? "border-orange-300 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
              {plan.featured ? <div className="absolute right-4 top-4 rounded-full bg-orange-400 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-950">Recommended</div> : null}
              <div className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] ${plan.featured ? "bg-white/10 text-amber-200" : "bg-orange-50 text-orange-700"}`}>{plan.badge}</div>
              <h2 className="mt-4 text-3xl font-black tracking-[-.06em]">{plan.name}</h2>
              <div className="mt-3 flex items-end gap-1"><span className="text-5xl font-black tracking-[-.08em]">{plan.price}</span><span className={`pb-2 text-sm font-black ${plan.featured ? "text-slate-300" : "text-slate-500"}`}>{plan.note}</span></div>
              <p className={`mt-4 text-sm font-bold leading-6 ${plan.featured ? "text-slate-300" : "text-slate-600"}`}>{plan.summary}</p>
              <ul className="mt-5 grid gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm font-black leading-6">
                    <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${plan.featured ? "bg-emerald-300 text-slate-950" : "bg-emerald-100 text-emerald-700"}`}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to="/support" className={`mt-6 inline-flex w-full justify-center rounded-2xl px-5 py-4 text-sm font-black no-underline ${plan.featured ? "bg-white text-slate-950" : "bg-slate-950 text-white"}`}>Choose {plan.name}</Link>
            </article>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          {extras.map(([title, price, copy], index) => (
            <DarkCard key={title} color={["#fb923c", "#22d3ee", "#34d399"][index]} className="min-h-[180px]">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Add-on / rule</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-.05em] text-white">{title}</h2>
              <div className="mt-2 text-xl font-black text-cyan-200">{price}</div>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-300">{copy}</p>
            </DarkCard>
          ))}
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Launch plan rule</div>
          <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Operator is the main selling plan.</h2>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">Start is for getting going, Crew is for teams, Operator is where the AI Operator value becomes obvious, and Command is for serious operators who need payroll, roles, scale and priority support.</p>
        </section>
      </section>
    </main>
  );
}
