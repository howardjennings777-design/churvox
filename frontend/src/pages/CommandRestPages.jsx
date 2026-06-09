import React from "react";
import { Link, Navigate } from "react-router-dom";

function SimpleCommandNotice({ title, subtitle, primaryHref = "/dashboard", primaryLabel = "Back to Command", secondaryHref = "/support-board", secondaryLabel = "Open Support" }) {
  return (
    <main className="min-h-screen bg-[#f6f1e7] px-4 py-6 text-slate-950 md:px-8">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:p-9">
        <div className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-800">
          Churvox support
        </div>
        <h1 className="mt-5 text-4xl font-black leading-none tracking-[-0.06em] md:text-6xl">
          {title}
        </h1>
        <p className="mt-4 text-base font-bold leading-7 text-slate-600">
          {subtitle}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={primaryHref} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline">
            {primaryLabel}
          </Link>
          <Link to={secondaryHref} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 no-underline">
            {secondaryLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}

export function OnboardingCommandPage() {
  return <Navigate to="/support-board" replace />;
}

export function TradePresetsCommandPage() {
  return <Navigate to="/settings-board" replace />;
}

export function OperatorToolsCommandPage() {
  return <Navigate to="/dashboard" replace />;
}

export function BillingCommandPage() {
  return <Navigate to="/plans" replace />;
}

export function CrewOpsCommandPage() {
  return <Navigate to="/team-board" replace />;
}

export function LaunchCommandPage() {
  return <Navigate to="/support-board" replace />;
}

export function WorkerCommandPage() {
  return (
    <SimpleCommandNotice
      title="Worker settings live in the worker area."
      subtitle="Keep workers out of owner setup pages. Use My Jobs for assigned work, job notes and photos."
      primaryHref="/worker/jobs"
      primaryLabel="Open My Jobs"
      secondaryHref="/worker/jobs"
      secondaryLabel="Back to worker jobs"
    />
  );
}
