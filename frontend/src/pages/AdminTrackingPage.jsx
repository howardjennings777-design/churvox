import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  CreditCard,
  DollarSign,
  FileText,
  MousePointerClick,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

const API_BASE = (
  (typeof import.meta !== "undefined" && process.env && (process.env.VITE_BACKEND_URL || process.env.VITE_API_URL)) ||
  (typeof process !== "undefined" && process.env && (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL)) ||
  ""
).replace(/\/$/, "");

const money = (value) =>
  new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));

const asArray = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);

function recordName(item) {
  return item?.business_name || item?.company || item?.name || item?.full_name || item?.email || item?.title || item?.client_name || item?.invoice_number || item?._id || item?.id || "Record";
}

function dateText(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });
}

function getPlan(item) {
  return String(item?.plan || item?.subscription_plan || item?.plan_type || "none").toLowerCase();
}

function searchText(item) {
  return [
    item?.business_name,
    item?.company,
    item?.name,
    item?.full_name,
    item?.email,
    item?.phone,
    item?.title,
    item?.client_name,
    item?.invoice_number,
    item?.status,
    item?.plan,
    item?.subscription_plan,
  ].filter(Boolean).join(" ").toLowerCase();
}

function normalize(raw) {
  const src = raw || {};
  const users = asArray(src.users_list);
  const businesses = asArray(src.businesses_list);
  const paidUsers = asArray(src.paid_users_list);
  const activeToday = asArray(src.active_today_list);
  const invoices = asArray(src.invoices_list);
  const jobs = asArray(src.jobs_list);

  const plans = { start: 0, crew: 0, operator: 0, command: 0, solo: 0, team: 0, pro: 0, enterprise: 0, none: 0 };
  users.forEach((user) => {
    const plan = getPlan(user);
    if (plans[plan] !== undefined) plans[plan] += 1;
    else if (!plan || plan === "none") plans.none += 1;
  });

  const invoiceTotal = invoices.reduce((sum, invoice) => sum + num(invoice?.total || invoice?.amount_total || invoice?.amount || 0), 0);
  const dueTotal = invoices.reduce((sum, invoice) => sum + num(invoice?.amount_due || invoice?.balance_due || 0), 0);

  return {
    users,
    businesses,
    paidUsers,
    activeToday,
    invoices,
    jobs,
    plans,
    totalUsers: users.length || num(src.total_users),
    totalBusinesses: businesses.length || num(src.total_businesses),
    activeCount: activeToday.length || num(src.active_today),
    paidCount: paidUsers.length || num(src.paid_users),
    invoiceCount: invoices.length || num(src.total_invoices),
    jobCount: jobs.length || num(src.total_jobs),
    monthlyRevenue: num(src.monthly_revenue) || invoiceTotal,
    outstandingBalance: num(src.outstanding_balance) || dueTotal,
    raw: src,
  };
}

function Kpi({ icon: Icon, label, value, note }) {
  return (
    <div className="rounded-3xl border border-cyan-300/15 bg-slate-950/65 p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
        <Icon className="h-5 w-5 text-cyan-300" />
      </div>
      <div className="text-4xl font-black leading-none tracking-[-0.06em] text-white">{value}</div>
      <div className="mt-2 text-xs font-semibold leading-5 text-slate-400">{note}</div>
    </div>
  );
}

function Bar({ label, value, max }) {
  const pct = max > 0 ? Math.max(3, Math.round((Number(value || 0) / max) * 100)) : 0;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-sm font-bold text-slate-300">
        <span>{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RecordCard({ item, type }) {
  const title = recordName(item);
  const status = item?.status || item?.account_status || item?.payment_status || getPlan(item);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 text-sm font-black text-white">{title}</div>
        <span className="shrink-0 rounded-full bg-cyan-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-200">{type}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 text-xs font-semibold text-slate-300 sm:grid-cols-2">
        <span className="rounded-xl bg-slate-950/55 px-3 py-2">Email: {item?.email || item?.owner_email || "—"}</span>
        <span className="rounded-xl bg-slate-950/55 px-3 py-2">Status: {status || "—"}</span>
        <span className="rounded-xl bg-slate-950/55 px-3 py-2">Created: {dateText(item?.created_at || item?.createdAt)}</span>
        <span className="rounded-xl bg-slate-950/55 px-3 py-2">ID: {item?._id || item?.id || "—"}</span>
      </div>
    </div>
  );
}

export default function AdminTrackingPage() {
  const [data, setData] = useState(normalize({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("users");
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const token = window.localStorage?.getItem("token") || "";
      const res = await fetch(`${API_BASE}/api/admin/platform-stats`, {
        credentials: "include",
        headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(`Platform stats failed: ${res.status}`);
      const json = await res.json();
      setData(normalize(json));
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Tracking page failed:", err);
      if (!silent) setError(err?.message || "Could not load tracking data.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);
  useEffect(() => {
    const timer = setInterval(() => load(true), 30000);
    return () => clearInterval(timer);
  }, [load]);

  const tabs = useMemo(() => [
    ["users", "Users", data.users, "user"],
    ["businesses", "Businesses", data.businesses, "business"],
    ["paid", "Paid", data.paidUsers, "paid"],
    ["active", "Active today", data.activeToday, "active"],
    ["jobs", "Jobs", data.jobs, "job"],
    ["invoices", "Invoices", data.invoices, "invoice"],
  ], [data]);

  const activeTab = tabs.find(([key]) => key === tab) || tabs[0];
  const records = asArray(activeTab?.[2]);
  const filtered = records.filter((item) => searchText(item).includes(query.trim().toLowerCase())).slice(0, 80);
  const planRows = Object.entries(data.plans).filter(([, value]) => value > 0);
  const maxPlan = Math.max(1, ...planRows.map(([, value]) => value));
  const maxFunnel = Math.max(1, data.totalUsers, data.totalBusinesses, data.activeCount, data.paidCount);

  const conversion = data.totalUsers > 0 ? Math.round((data.paidCount / data.totalUsers) * 100) : 0;
  const activation = data.totalUsers > 0 ? Math.round((data.activeCount / data.totalUsers) * 100) : 0;
  const avgJobs = data.totalBusinesses > 0 ? (data.jobCount / data.totalBusinesses).toFixed(1) : "0";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020817] px-4 py-5 text-white md:px-6">
      <div className="mx-auto grid max-w-[1480px] gap-4">
        <section className="rounded-[2rem] border border-cyan-300/15 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
                Private platform tracking
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.075em] text-white md:text-7xl">
                Churvox command tracking.
              </h1>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-400">
                Owner-only view for signups, plan movement, paid accounts, usage volume, revenue signals, live records and launch risks.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-xs font-bold text-slate-300">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })}` : "Waiting for live data"}
              </span>
              <button onClick={() => load(false)} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-500 px-4 text-sm font-black text-slate-950 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={Users} label="Total users" value={data.totalUsers} note="All live accounts returned by platform stats" />
          <Kpi icon={CreditCard} label="Paid users" value={data.paidCount} note={`${conversion}% signup to paid signal`} />
          <Kpi icon={Activity} label="Active today" value={data.activeCount} note={`${activation}% active today signal`} />
          <Kpi icon={DollarSign} label="Revenue signal" value={money(data.monthlyRevenue)} note={`${money(data.outstandingBalance)} outstanding`} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.6fr_.9fr]">
          <div className="grid gap-4">
            <div className="rounded-[1.75rem] border border-cyan-300/15 bg-slate-950/65 p-5 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Launch funnel</div>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Visitors become accounts, accounts become paid users.</h2>
                </div>
                <TrendingUp className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="grid gap-3 md:grid-cols-5">
                {[
                  ["Users", data.totalUsers],
                  ["Businesses", data.totalBusinesses],
                  ["Active today", data.activeCount],
                  ["Paid", data.paidCount],
                  ["Invoices", data.invoiceCount],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="mt-2 text-3xl font-black tracking-[-0.06em]">{value}</div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-500"
                        style={{ width: `${Math.max(3, Math.round((Number(value || 0) / maxFunnel) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-cyan-300/15 bg-slate-950/65 p-5 shadow-2xl shadow-black/20">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Live records</div>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Drill into what is happening now.</h2>
                </div>
                <label className="relative block min-w-[260px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/80 pl-10 pr-3 text-sm font-bold text-white outline-none placeholder:text-slate-600" />
                </label>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {tabs.map(([key, label, list]) => (
                  <button key={key} onClick={() => setTab(key)} className={`rounded-full px-3 py-2 text-xs font-black ${tab === key ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/[0.05] text-slate-300"}`}>
                    {label} · {asArray(list).length}
                  </button>
                ))}
              </div>
              <div className="grid max-h-[620px] gap-3 overflow-auto pr-1">
                {filtered.length ? filtered.map((item, index) => <RecordCard key={item?._id || item?.id || item?.email || index} item={item} type={activeTab?.[3]} />) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 text-sm font-bold text-slate-400">No matching records returned.</div>
                )}
              </div>
            </div>
          </div>

          
        </section>
      </div>
    </main>
  );
}
