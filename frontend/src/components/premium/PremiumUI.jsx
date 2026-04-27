import React from "react";
import { Search } from "lucide-react";

export function AppShell({ children, className = "" }) {
  return <div className={`cx-page ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, action, children }) {
  return (
    <section className="cx-page-hero">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="cx-page-title">{title}</h1>
          {description ? <p className="cx-page-subtitle max-w-3xl">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export function StatCard({ label, value, icon: Icon, helper, onClick }) {
  const body = (
    <div className="cx-stat-card text-left">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {Icon ? <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Icon size={16} /></span> : null}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {helper ? <p className="text-xs text-slate-500 mt-1">{helper}</p> : null}
    </div>
  );
  if (!onClick) return body;
  return <button className="w-full" onClick={onClick}>{body}</button>;
}

export function SectionCard({ title, action, children }) {
  return (
    <section className="cx-panel p-4 md:p-5">
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-base md:text-lg font-semibold text-slate-900">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function DataToolbar({ children }) {
  return <div className="cx-toolbar cx-panel p-3 md:p-4">{children}</div>;
}

export function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="relative flex-1 min-w-[220px]">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={onChange} placeholder={placeholder} className="cx-input w-full pl-9 pr-3 py-2.5" />
    </div>
  );
}

export function FilterTabs({ tabs = [], value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 gap-1 overflow-auto">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${value === tab.value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const statusClass = {
  completed: "status-completed",
  in_progress: "status-in-progress",
  paused: "status-paused",
  assigned: "status-assigned",
  cancelled: "status-cancelled",
  draft: "status-assigned",
};

export function StatusBadge({ status }) {
  const key = String(status || "assigned").toLowerCase();
  return <span className={`status-badge ${statusClass[key] || "status-assigned"}`}>{key.replaceAll("_", " ")}</span>;
}

export function EmptyState({ title = "No data yet", description, action }) {
  return <div className="cx-empty-state"><p className="font-semibold text-slate-900">{title}</p>{description ? <p className="text-sm text-slate-500 mt-1">{description}</p> : null}{action ? <div className="mt-4">{action}</div> : null}</div>;
}

export function LoadingState({ title = "Loading" }) {
  return <div className="cx-loading-state"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600 mx-auto mb-3" /><p className="text-slate-600">{title}</p></div>;
}

export function ErrorState({ title = "Something went wrong", message, action }) {
  return <div className="cx-error-state"><p className="font-semibold text-slate-900">{title}</p>{message ? <p className="text-sm text-red-600 mt-1">{message}</p> : null}{action ? <div className="mt-4">{action}</div> : null}</div>;
}

export function PremiumTable({ children }) {
  return <div className="cx-table overflow-x-auto rounded-2xl border border-slate-200 bg-white">{children}</div>;
}

export function MobileCardList({ children }) {
  return <div className="space-y-3 md:hidden">{children}</div>;
}

export function DetailPanel({ title, children }) {
  return <section className="cx-panel p-4 md:p-5"><h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</h3>{children}</section>;
}

export function FormPanel({ title, children }) {
  return <section className="cx-panel p-5"><h2 className="text-lg font-semibold text-slate-900 mb-4">{title}</h2>{children}</section>;
}

export function RoleBadge({ role }) {
  return <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">{String(role || "unknown").replaceAll("_", " ")}</span>;
}
