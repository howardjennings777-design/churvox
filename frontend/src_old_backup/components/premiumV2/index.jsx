import React from "react";
import { Search } from "lucide-react";

export function PremiumPage({ children, className = "" }) {
  return <div className={`min-h-full bg-slate-100 px-4 py-6 md:px-6 lg:px-8 ${className}`}><div className="mx-auto w-full max-w-7xl space-y-6">{children}</div></div>;
}

export function PremiumHero({ title, subtitle, action, children }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{title}</h1>{subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">{subtitle}</p> : null}</div>{action ? <div className="shrink-0">{action}</div> : null}</div>{children ? <div className="mt-6">{children}</div> : null}</section>;
}

export function PremiumPanel({ children, className = "", title, action }) {
  return <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 ${className}`}>{(title||action) && <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">{title}</h2>{action}</div>}{children}</section>;
}

export function PremiumGrid({ children, className = "" }) { return <div className={`grid grid-cols-1 gap-4 lg:grid-cols-12 ${className}`}>{children}</div>; }

export function PremiumList({ children }) { return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{children}</div>; }

const map={completed:"bg-emerald-100 text-emerald-700",in_progress:"bg-blue-100 text-blue-700",paused:"bg-amber-100 text-amber-700",assigned:"bg-slate-100 text-slate-700",cancelled:"bg-rose-100 text-rose-700",draft:"bg-slate-100 text-slate-700",overdue:"bg-rose-100 text-rose-700",paid:"bg-emerald-100 text-emerald-700",unpaid:"bg-amber-100 text-amber-700"};
export function PremiumBadge({ status }){const k=String(status||"assigned").toLowerCase();return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${map[k]||map.assigned}`}>{k.replaceAll('_',' ')}</span>}

export function PremiumActions({ primary, secondary, danger }) { return <div className="flex flex-wrap items-center gap-2">{primary}{secondary}{danger ? <div className="ml-auto">{danger}</div> : null}</div>; }
export function PremiumEmptyState({ title, description, action }) { return <PremiumPanel className="text-center"><p className="text-lg font-semibold text-slate-900">{title}</p>{description && <p className="mt-1 text-slate-600">{description}</p>}{action && <div className="mt-4">{action}</div>}</PremiumPanel>; }
export function PremiumLoadingState({ title="Loading" }) { return <PremiumPanel><div className="space-y-3"><div className="h-6 w-48 animate-pulse rounded bg-slate-200" /><div className="h-24 animate-pulse rounded-2xl bg-slate-100" /><p className="text-sm text-slate-500">{title}</p></div></PremiumPanel>; }

export function PremiumAppShell({ children }) { return <div className="min-h-screen bg-slate-100 text-slate-900">{children}</div>; }
export function PremiumSearchInput({ value, onChange, placeholder="Search"}){return <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={value} onChange={onChange} placeholder={placeholder} className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"/></div>}
