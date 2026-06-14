import React from "react";

const PLAN_BUCKETS = ["Start", "Crew", "Operator", "Command", "No plan", "Other"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function planName(user) {
  const raw = String(user?.plan || user?.subscription_plan || user?.plan_type || "").toLowerCase();
  const labels = {
    solo: "Start",
    start: "Start",
    team: "Crew",
    crew: "Crew",
    pro: "Operator",
    operator: "Operator",
    enterprise: "Command",
    command: "Command",
    none: "No plan",
    "": "No plan",
  };
  return labels[raw] || "Other";
}

function billingStatus(user) {
  return String(user?.subscription_status || user?.billing_status || user?.stripe_status || user?.status || "").toLowerCase();
}

export default function HQPlanMixPanel({ users = [], planCounts = {} }) {
  const userList = asArray(users);
  const counts = PLAN_BUCKETS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

  if (userList.length) {
    userList.forEach((user) => {
      const bucket = planName(user);
      counts[bucket] = Number(counts[bucket] || 0) + 1;
    });
  } else {
    Object.entries(planCounts || {}).forEach(([label, value]) => {
      const bucket = label === "Choose plan" ? "No plan" : PLAN_BUCKETS.includes(label) ? label : "Other";
      counts[bucket] = Number(counts[bucket] || 0) + Number(value || 0);
    });
  }

  const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
  const trialing = userList.filter((user) => billingStatus(user) === "trialing").length;
  const paidNamedPlans = counts.Start + counts.Crew + counts.Operator + counts.Command;

  return (
    <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-xl font-black text-white">Users by plan</h3>
          <p className="text-sm font-bold text-slate-400">Start, Crew, Operator, Command and accounts still needing a plan.</p>
        </div>
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-right">
          <b className="block text-2xl font-black text-cyan-100">{total}</b>
          <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">total users</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PLAN_BUCKETS.map((label) => {
          const count = Number(counts[label] || 0);
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <article key={label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <b className="text-white">{label}</b>
                <strong className="text-2xl font-black text-orange-200">{count}</strong>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <i className="block h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
              </div>
              <small className="mt-2 block font-black text-slate-500">{pct}% of users</small>
            </article>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <b className="text-emerald-100">{paidNamedPlans}</b>
          <span className="ml-2 text-sm font-bold text-emerald-200">on named plans</span>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <b className="text-amber-100">{trialing}</b>
          <span className="ml-2 text-sm font-bold text-amber-200">trialing now</span>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <b className="text-slate-100">{counts["No plan"]}</b>
          <span className="ml-2 text-sm font-bold text-slate-400">need plan choice</span>
        </div>
      </div>
    </section>
  );
}
