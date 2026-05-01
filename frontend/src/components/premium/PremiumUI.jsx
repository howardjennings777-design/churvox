import React from "react";
import { PremiumPage as V2Page, PremiumHero as V2Hero, PremiumPanel as V2Panel, PremiumList as V2List, PremiumBadge as V2Badge, PremiumEmptyState as V2Empty, PremiumLoadingState as V2Loading, PremiumSearchInput as V2Search } from "../premiumV2";

export const PremiumPageShell = V2Page;
export const AppShell = V2Page;
export function PremiumPageHeader({ title, subtitle, description, action, secondaryActions, children }) {
  return <V2Hero title={title} subtitle={subtitle || description} action={<div className="flex flex-wrap gap-2">{secondaryActions}{action}</div>}>{children}</V2Hero>;
}
export const PageHeader = PremiumPageHeader;
export const PremiumCard = V2Panel;
export const SectionCard = V2Panel;
export const PremiumSection = V2Panel;
export function PremiumActionBar({ children }) { return <V2Panel>{children}</V2Panel>; }
export const DataToolbar = PremiumActionBar;
export const SearchInput = V2Search;
export const PremiumStatusBadge = V2Badge;
export const StatusBadge = V2Badge;
export const PremiumEmptyState = V2Empty;
export const EmptyState = V2Empty;
export const LoadingState = V2Loading;
export const PremiumLoadingState = V2Loading;
export const PremiumTable = V2List;
export const MobileCardList = ({ children }) => <div className="space-y-3 md:hidden">{children}</div>;
export const RoleBadge = ({ role }) => <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{String(role || "unknown").replaceAll("_", " ")}</span>;
export const ErrorState = ({ title = "Something went wrong", message, action }) => <V2Panel><p className="font-semibold">{title}</p>{message && <p className="text-sm text-rose-600">{message}</p>}{action}</V2Panel>;
export function FilterTabs({ tabs = [], value, onChange }) { return <div className="flex flex-wrap gap-2">{tabs.map((tab)=><button key={tab.value} onClick={()=>onChange(tab.value)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${value===tab.value?"bg-blue-600 text-white":"bg-white border border-slate-300 text-slate-700"}`}>{tab.label}</button>)}</div>; }
export const DetailPanel = ({ title, children }) => <V2Panel title={title}>{children}</V2Panel>;
export const FormPanel = ({ title, children }) => <V2Panel title={title}>{children}</V2Panel>;
export const StatCard = ({ label, value, icon: Icon, helper }) => <V2Panel><div className="flex items-center justify-between"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>{Icon && <Icon size={16} className="text-blue-600" />}</div><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>{helper && <p className="text-xs text-slate-500">{helper}</p>}</V2Panel>;
