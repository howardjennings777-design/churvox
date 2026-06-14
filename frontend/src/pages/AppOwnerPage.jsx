import React from "react";
import { Activity, AlertTriangle, BarChart3, Building2, CheckCircle, CreditCard, DollarSign, Eye, Globe2, LifeBuoy, Radio, RefreshCw, Search, Settings, Shield, Trash2, Users, X } from "lucide-react";
import API_BASE from "../lib/apiBase";
import RemoveCustomerDataCard from "./admin/RemoveCustomerDataCard";

const TABS = [
  ["overview", "Overview", Globe2],
  ["users", "All Users", Users],
  ["live", "Live Users", Radio],
  ["businesses", "Businesses", Building2],
  ["billing", "Billing", CreditCard],
  ["usage", "Usage", BarChart3],
  ["support", "Support", LifeBuoy],
  ["attention", "Attention", AlertTriangle],
  ["settings", "Settings", Settings],
];

function asArray(value) { return Array.isArray(value) ? value : []; }
function money(value) { return Number(value || 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }); }
function dateText(value) { if (!value) return "Not set"; try { return new Date(value).toLocaleString("en-NZ"); } catch { return String(value); } }
function short(value, fallback = "—") { const text = String(value || "").trim(); return text || fallback; }
function recordName(item) { return item?.business_name || item?.company || item?.name || item?.full_name || item?.email || item?.customer_name || item?.client_name || item?.path || "Record"; }
function idOf(item) { return item?._id || item?.id || item?.business_id || item?.email || Math.random().toString(36).slice(2); }
function businessKey(item) { return String(item?.business_id || item?.owner_id || item?.user_id || item?.id || item?._id || ""); }
function planLabel(item) { const raw = String(item?.plan || item?.subscription_plan || item?.plan_type || "unknown").toLowerCase(); const labels = { solo: "Start", start: "Start", team: "Crew", crew: "Crew", pro: "Operator", operator: "Operator", enterprise: "Command", command: "Command", trial: "Trial", none: "Choose plan" }; return labels[raw] || raw.charAt(0).toUpperCase() + raw.slice(1); }
function billingStatus(item) { return short(item?.subscription_status || item?.billing_status || item?.stripe_status || item?.status, "Unknown"); }
function lastActivity(item) { return item?.last_active || item?.last_seen || item?.last_login || item?.updated_at || item?.created_at; }
function token() { try { return window.localStorage.getItem("token") || ""; } catch { return ""; } }
function countForBusiness(list, businessId) { if (!businessId) return 0; return asArray(list).filter((item) => String(item?.business_id || item?.owner_id || item?.user_id || "") === String(businessId)).length; }
function toneClass(status) { const value = String(status || "").toLowerCase(); if (value.includes("active") || value.includes("paid") || value.includes("healthy")) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"; if (value.includes("trial") || value.includes("help") || value.includes("risk") || value.includes("internal")) return "border-amber-500/30 bg-amber-500/10 text-amber-200"; if (value.includes("fail") || value.includes("past") || value.includes("unpaid") || value.includes("cancel") || value.includes("required")) return "border-red-500/30 bg-red-500/10 text-red-200"; return "border-slate-700 bg-slate-900 text-slate-300"; }
function healthFor(item, lists) { const status = String(billingStatus(item)).toLowerCase(); const key = businessKey(item); const usage = countForBusiness(lists.jobs, key) + countForBusiness(lists.clients, key) + countForBusiness(lists.invoices, key); if (status.includes("fail") || status.includes("past") || status.includes("unpaid") || status.includes("required")) return "Payment issue"; if (usage === 0) return "Needs setup help"; return "Healthy"; }
function userIdentifier(item) { return String(item?.id || item?._id || item?.email || "").trim(); }
function canRemoveUser(item) { return item?.hq_can_remove !== false && userIdentifier(item); }

async function deleteUserRecord(identifier, confirmText) {
  const res = await fetch(`${API_BASE}/api/admin/owner/delete-user`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
    body: JSON.stringify({ identifier, confirm: confirmText }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) throw new Error(body?.detail || body?.message || `Delete failed: ${res.status}`);
  return body;
}

function Metric({ label, value, helper, icon: Icon, tone = "cyan" }) {
  const tones = { cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200", green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200", amber: "border-amber-500/20 bg-amber-500/10 text-amber-200", red: "border-red-500/20 bg-red-500/10 text-red-200" };
  return <article className="rounded-[26px] border border-slate-800 bg-slate-950/70 p-5 shadow-xl"><div className="mb-4 flex items-start justify-between gap-3"><span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>{Icon ? <span className={`rounded-2xl border p-2 ${tones[tone] || tones.cyan}`}><Icon size={18} /></span> : null}</div><strong className="block text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">{value}</strong>{helper ? <p className="mt-2 text-xs font-bold leading-5 text-slate-400">{helper}</p> : null}</article>;
}
function Line({ label, value }) { if (value === undefined || value === null || value === "") return null; return <div className="flex items-start justify-between gap-4 border-t border-slate-800 py-2 text-sm"><span className="shrink-0 text-slate-500">{label}</span><span className="min-w-0 break-words text-right font-bold text-slate-100">{String(value)}</span></div>; }
function Empty({ children = "No records returned yet." }) { return <div className="rounded-[26px] border border-slate-800 bg-slate-950/70 p-10 text-center text-sm font-bold text-slate-400"><CheckCircle className="mx-auto mb-3 text-emerald-300" />{children}</div>; }

function UserCard({ item, onDelete }) {
  const removable = canRemoveUser(item);
  return <article className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-4"><div className="mb-3 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-base font-black text-white">{recordName(item)}</h3><p className="truncate text-xs font-semibold text-slate-500">{short(item.email || item.phone || item.mobile)}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass(item.hq_record_type || billingStatus(item))}`}>{item.hq_record_type || billingStatus(item)}</span></div><Line label="User ID" value={item.id || item._id} /><Line label="Role" value={item.role} /><Line label="Plan" value={planLabel(item)} /><Line label="Billing" value={billingStatus(item)} /><Line label="Business" value={item.business_name || item.company || item.business_id} /><Line label="Trial ends" value={dateText(item.trial_ends_at)} /><Line label="Last active" value={dateText(lastActivity(item))} /><button type="button" disabled={!removable} onClick={() => onDelete?.(item)} className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${removable ? "border border-red-500/40 bg-red-500/15 text-red-100 hover:bg-red-500/25" : "border border-slate-700 bg-slate-900 text-slate-500"}`}><Trash2 size={16} /> {removable ? "Delete account" : "Protected account"}</button></article>;
}

function BusinessCard({ item, lists }) { const key = businessKey(item); const health = healthFor(item, lists); return <article className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-4"><div className="mb-3 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-base font-black text-white">{recordName(item)}</h3><p className="truncate text-xs font-semibold text-slate-500">Owner: {short(item.email)}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass(health)}`}>{health}</span></div><div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-200">{planLabel(item)}</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass(billingStatus(item))}`}>{billingStatus(item)}</span></div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-slate-900 p-3"><b className="text-white">{countForBusiness(lists.jobs, key)}</b><small className="block text-slate-500">Jobs</small></div><div className="rounded-2xl bg-slate-900 p-3"><b className="text-white">{countForBusiness(lists.invoices, key)}</b><small className="block text-slate-500">Invoices</small></div><div className="rounded-2xl bg-slate-900 p-3"><b className="text-white">{countForBusiness(lists.clients, key)}</b><small className="block text-slate-500">Clients</small></div></div><Line label="Business ID" value={key} /><Line label="Last active" value={dateText(lastActivity(item))} /></article>; }
function VisitCard({ item }) { return <article className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-4"><h3 className="truncate text-base font-black text-white">{short(item.user_email || item.business_name || item.path, "Visitor")}</h3><p className="truncate text-xs font-semibold text-slate-500">{short(item.ip || item.referrer || item.source)}</p><Line label="Current area" value={item.path} /><Line label="Last seen" value={dateText(item.last_seen || item.created_at)} /></article>; }
function EventCard({ item }) { return <article className="rounded-[22px] border border-slate-800 bg-slate-950/70 p-4"><div className="flex items-start gap-3"><span className="mt-1 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-200"><Activity size={15} /></span><div className="min-w-0"><h3 className="truncate text-sm font-black text-white">{short(item.title || item.label || item.kind, "Activity")}</h3><p className="mt-1 text-xs font-semibold text-slate-400">{short(item.meta || item.label)}</p><p className="mt-2 text-xs font-bold text-slate-500">{dateText(item.at || item.created_at)}</p></div></div></article>; }

function DeleteAccountModal({ target, onClose, onDeleted }) {
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  if (!target) return null;
  const identifier = userIdentifier(target);
  async function runDelete() {
    setBusy(true); setError("");
    try {
      await deleteUserRecord(identifier, confirm);
      onDeleted?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || "Could not delete this account.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/75 p-4"><section className="w-full max-w-xl rounded-[30px] border border-red-500/30 bg-slate-950 p-5 text-white shadow-2xl"><div className="mb-4 flex items-start justify-between gap-4"><div><div className="mb-2 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-red-200">Delete account</div><h2 className="text-3xl font-black tracking-[-0.06em]">Remove {recordName(target)}?</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-400">This will remove the user and connected Churvox records matched to their email/user ID.</p></div><button type="button" onClick={onClose} className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-slate-300"><X size={18} /></button></div><div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm font-bold text-slate-300"><Line label="Email" value={target.email} /><Line label="User ID" value={target.id || target._id} /><Line label="Identifier" value={identifier} /></div><label className="mt-4 block"><span className="text-xs font-black uppercase tracking-[0.16em] text-red-200">Type DELETE to confirm</span><input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" className="mt-2 w-full rounded-2xl border border-red-500/30 bg-black px-4 py-3 text-sm font-black text-white outline-none" /></label>{error ? <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-black text-red-100">{error}</p> : null}<div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={runDelete} disabled={busy || confirm !== "DELETE"} className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white disabled:opacity-40"><Trash2 size={16} /> {busy ? "Deleting…" : "Delete account and data"}</button><button type="button" onClick={onClose} className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-black text-slate-200">Cancel</button></div></section></div>;
}

export default function AppOwnerPage() {
  const [data, setData] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState(null);

  const load = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/admin/owner-overview`, { credentials: "include", headers: { Accept: "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.ok === false) throw new Error(body?.detail || body?.message || `Request failed: ${res.status}`);
      setData(body);
    } catch (err) { setError(err?.message || "Could not load Churvox HQ data"); }
    finally { if (!silent) setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { const timer = setInterval(() => load(true), 30000); return () => clearInterval(timer); }, [load]);

  const metrics = data?.metrics || {};
  const lists = data?.lists || {};
  const allUsers = asArray(lists.all_users || lists.users);
  const businesses = asArray(lists.businesses);
  const paidUsers = asArray(lists.paid_users);
  const trialUsers = asArray(lists.trial_users);
  const activeNow = asArray(lists.active_now);
  const activeToday = asArray(lists.active_today);
  const events = asArray(lists.events);
  const paymentIssues = React.useMemo(() => allUsers.filter((user) => String(billingStatus(user)).toLowerCase().match(/fail|past|unpaid|cancel|required/)), [allUsers]);
  const supportQueue = React.useMemo(() => businesses.filter((item) => healthFor(item, lists) !== "Healthy"), [businesses, lists]);
  const filterRows = React.useCallback((rows) => { const q = query.trim().toLowerCase(); if (!q) return rows; return asArray(rows).filter((item) => JSON.stringify(item).toLowerCase().includes(q)); }, [query]);
  const currentTitle = TABS.find(([key]) => key === activeTab)?.[1] || "Overview";
  const userCard = (item, prefix, idx) => <UserCard key={`${prefix}-${idOf(item)}-${idx}`} item={item} onDelete={setDeleteTarget} />;

  return <main className="min-h-screen w-full bg-[#05070b] text-white"><DeleteAccountModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => load(true)} /><div className="grid min-h-screen grid-cols-1 xl:grid-cols-[290px_1fr]"><aside className="border-b border-slate-800 bg-slate-950/95 p-4 xl:border-b-0 xl:border-r xl:border-slate-800"><div className="mb-5 rounded-[28px] border border-orange-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-5"><div className="mb-4 inline-flex rounded-2xl bg-orange-500 p-3 text-slate-950"><Shield size={24} /></div><h1 className="text-3xl font-black tracking-[-0.06em]">Churvox HQ</h1><p className="mt-2 text-xs font-bold leading-5 text-slate-400">Private app-owner control room. All users visible.</p></div><nav className="grid gap-2">{TABS.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${activeTab === key ? "bg-orange-500 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}><Icon size={17} /> {label}</button>)}</nav><div className="mt-5 rounded-[24px] border border-slate-800 bg-slate-900/80 p-4 text-sm font-bold text-slate-300"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Status</p><div className="mt-3 flex justify-between gap-3"><span>HQ mode</span><b className="text-emerald-300">All users</b></div><div className="mt-2 flex justify-between gap-3"><span>Auto refresh</span><b className="text-emerald-300">30s</b></div><div className="mt-2 flex justify-between gap-3"><span>Last loaded</span><b className="text-white">{dateText(data?.generated_at)}</b></div></div></aside><section className="min-w-0 p-4 md:p-6 xl:p-8"><header className="mb-6 flex flex-col gap-4 rounded-[34px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-5 shadow-2xl md:flex-row md:items-center md:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-orange-200"><Shield size={14} /> All users visible</div><h2 className="text-4xl font-black tracking-[-0.07em] md:text-6xl">{currentTitle}</h2><p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-400">See every user, who is paying, who is using Churvox, and who needs help.</p></div><button type="button" onClick={() => load(false)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-5 py-3 text-sm font-black text-orange-100 hover:bg-orange-500/20"><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</button></header>{error ? <div className="mb-5 rounded-[24px] border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div> : null}{activeTab !== "overview" ? <label className="relative mb-5 block max-w-xl"><Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this section..." className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm font-bold text-white outline-none focus:border-orange-500" /></label> : null}{activeTab === "overview" ? <div className="space-y-6"><section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4"><Metric label="All users" value={metrics.total_users || allUsers.length || 0} helper={`${metrics.customer_users || 0} customer · ${metrics.internal_users || 0} internal`} icon={Users} tone="green" /><Metric label="On now" value={metrics.active_now || 0} helper="Visitors active in the last 15 minutes" icon={Eye} tone="green" /><Metric label="Paid users" value={metrics.paid_users || 0} helper={`${metrics.trial_users || 0} trials watched`} icon={CreditCard} tone="green" /><Metric label="MRR estimate" value={money(metrics.monthly_revenue_estimate || 0)} helper="Based on current plan signals" icon={DollarSign} tone="green" /><Metric label="Businesses" value={metrics.total_businesses || 0} helper={`${metrics.active_today || 0} active today`} icon={Building2} /><Metric label="Visitors today" value={metrics.visitors_today || 0} helper={`${metrics.unique_visitors_today || 0} unique · ${metrics.visitors_7d || 0} last 7 days`} icon={Globe2} /><Metric label="Invoices" value={metrics.total_invoices || 0} helper={`${money(metrics.invoice_value_outstanding || 0)} outstanding`} icon={DollarSign} tone="amber" /><Metric label="Support queue" value={supportQueue.length} helper="Businesses needing a check-in" icon={LifeBuoy} tone={supportQueue.length ? "amber" : "green"} /></section><section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5"><h3 className="mb-4 text-xl font-black">Recent activity</h3><div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">{events.slice(0, 9).map((item, idx) => <EventCard key={`event-${idx}`} item={item} />)}{!events.length ? <Empty /> : null}</div></section></div> : null}{activeTab === "users" ? <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">{filterRows(allUsers).map((item, idx) => userCard(item, "user", idx))}{!filterRows(allUsers).length ? <Empty>No users returned yet.</Empty> : null}</section> : null}{activeTab === "live" ? <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">{filterRows([...activeNow, ...activeToday]).map((item, idx) => item.path ? <VisitCard key={`live-${idOf(item)}-${idx}`} item={item} /> : userCard(item, "live", idx))}{!filterRows([...activeNow, ...activeToday]).length ? <Empty>No one is active right now.</Empty> : null}</section> : null}{activeTab === "businesses" ? <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">{filterRows(businesses).map((item, idx) => <BusinessCard key={`biz-${idOf(item)}-${idx}`} item={item} lists={lists} />)}{!filterRows(businesses).length ? <Empty>No businesses returned yet.</Empty> : null}</section> : null}{activeTab === "billing" ? <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">{filterRows([...paidUsers, ...trialUsers, ...paymentIssues]).map((item, idx) => userCard(item, "billing", idx))}{!filterRows([...paidUsers, ...trialUsers, ...paymentIssues]).length ? <Empty>No billing records returned yet.</Empty> : null}</section> : null}{activeTab === "usage" ? <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">{filterRows(businesses).map((item, idx) => <BusinessCard key={`usage-${idOf(item)}-${idx}`} item={item} lists={lists} />)}{!filterRows(businesses).length ? <Empty>No usage records returned yet.</Empty> : null}</section> : null}{activeTab === "support" ? <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">{filterRows(supportQueue).map((item, idx) => <BusinessCard key={`support-${idOf(item)}-${idx}`} item={item} lists={lists} />)}{!filterRows(supportQueue).length ? <Empty>No support issues showing right now.</Empty> : null}</section> : null}{activeTab === "attention" ? <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">{filterRows([...paymentIssues, ...supportQueue]).map((item, idx) => item.email ? userCard(item, "attention", idx) : <BusinessCard key={`attention-${idOf(item)}-${idx}`} item={item} lists={lists} />)}{!filterRows([...paymentIssues, ...supportQueue]).length ? <Empty>Nothing needs attention right now.</Empty> : null}</section> : null}{activeTab === "settings" ? <div className="grid gap-5"><section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5"><h3 className="mb-2 text-xl font-black">HQ access</h3><p className="max-w-2xl text-sm font-bold leading-6 text-slate-400">HQ now shows every user returned by the backend. Each user card has a direct delete account button where removal is allowed.</p><div className="mt-5 grid gap-3 md:grid-cols-3"><Metric label="Mode" value="All users" helper="Customers and internal records visible" icon={Shield} tone="green" /><Metric label="Collections" value={(data?.collections_seen || []).length} helper="Database areas detected" icon={Activity} /><Metric label="API" value={data?.hq_mode === "all_users_visible" ? "Locked" : "Check"} helper="Backend status" icon={CheckCircle} tone={data?.hq_mode === "all_users_visible" ? "green" : "amber"} /></div></section><RemoveCustomerDataCard onRemoved={() => load(true)} /></div> : null}{loading ? <div className="mt-6 text-sm font-bold text-slate-500">Loading Churvox HQ data…</div> : null}</section></div></main>;
}
