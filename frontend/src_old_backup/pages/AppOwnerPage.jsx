import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Briefcase,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import API_BASE from "../lib/apiBase";

const PLAN_PRICE = {
  solo: 30,
  team: 70,
  pro: 110,
  enterprise: 240,
};

const EMPTY_STATS = {
  total_users: 0,
  total_businesses: 0,
  active_today: 0,
  paid_users: 0,
  total_jobs: 0,
  total_clients: 0,
  total_quotes: 0,
  total_invoices: 0,
  monthly_revenue: 0,
  outstanding_balance: 0,
  overdue_invoices: 0,
  automation_rules: 0,
  automation_runs: 0,
  plan_counts: { solo: 0, team: 0, pro: 0, enterprise: 0 },
  users_list: [],
  businesses_list: [],
  active_today_list: [],
  paid_users_list: [],
  jobs_list: [],
  clients_list: [],
  quotes_list: [],
  invoices_list: [],
  automation_list: [],
  raw: {},
};

function money(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function unwrap(payload) {
  if (!payload) return {};
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  return payload;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function cleanText(value, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value.$oid || value.id || value.name || JSON.stringify(value);
  return String(value);
}

function recordId(item) {
  const raw = item?.id ?? item?._id ?? item?.business_id ?? item?.user_id;
  if (!raw) return "";
  if (typeof raw === "object") return raw.$oid || raw.oid || raw.id || "";
  return String(raw);
}

function textOf(item) {
  return [
    item?.name,
    item?.full_name,
    item?.business_name,
    item?.company,
    item?.title,
    item?.email,
    item?.owner_email,
    item?.client_name,
    item?.customer_name,
    item?.phone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isFakeRecord(item) {
  const text = textOf(item);
  const real = ["hello@churvox.com", "howardjennings77@gmail.com", "howardjennings77@outlook.com"];
  if (real.some((email) => text.includes(email))) return false;
  return ["test", "demo", "sample", "fake", "mock", "preview", "seed", "example.com", "mailinator", "tempmail"].some((marker) => text.includes(marker));
}

function cleanList(list) {
  return array(list).filter((item) => !isFakeRecord(item));
}

function planOf(user) {
  return String(user?.plan || user?.subscription_plan || user?.plan_type || "").toLowerCase().trim();
}

function countPlans(users, provided = {}) {
  const counts = {
    solo: number(provided.solo),
    team: number(provided.team),
    pro: number(provided.pro),
    enterprise: number(provided.enterprise),
  };

  if (array(users).length) {
    const fresh = { solo: 0, team: 0, pro: 0, enterprise: 0 };
    users.forEach((user) => {
      const plan = planOf(user);
      if (fresh[plan] !== undefined) fresh[plan] += 1;
    });
    return fresh;
  }

  return counts;
}

function inferRevenue(users, providedRevenue) {
  if (number(providedRevenue) > 0) return number(providedRevenue);
  return array(users).reduce((total, user) => {
    const plan = planOf(user);
    const status = String(user?.plan_status || user?.subscription_status || user?.status || "").toLowerCase();
    const isPaid = ["active", "trialing", "paid"].includes(status) || Boolean(user?.stripe_subscription_id);
    return total + (isPaid ? number(PLAN_PRICE[plan]) : 0);
  }, 0);
}

function normalizeStats(input) {
  const src = unwrap(input);
  const users = cleanList(src.users_list || src.users || src.all_users || []);
  const businesses = cleanList(src.businesses_list || src.businesses || src.companies || []);
  const activeToday = cleanList(src.active_today_list || src.active_users_today || []);
  const paidUsers = cleanList(src.paid_users_list || src.paid_users || src.subscribers || []);
  const jobs = cleanList(src.jobs_list || src.jobs || []);
  const clients = cleanList(src.clients_list || src.clients || []);
  const quotes = cleanList(src.quotes_list || src.quotes || []);
  const invoices = cleanList(src.invoices_list || src.invoices || []);
  const automations = cleanList(src.automation_list || src.automation_rules_list || src.rules || []);
  const planCounts = countPlans(users, src.plan_counts || {});

  return {
    total_users: users.length || number(src.total_users || src.user_count),
    total_businesses: businesses.length || number(src.total_businesses || src.business_count),
    active_today: activeToday.length || number(src.active_today || src.active_users_today),
    paid_users: paidUsers.length || number(src.paid_users || src.subscriber_count),
    total_jobs: jobs.length || number(src.total_jobs || src.job_count),
    total_clients: clients.length || number(src.total_clients || src.client_count),
    total_quotes: quotes.length || number(src.total_quotes || src.quote_count),
    total_invoices: invoices.length || number(src.total_invoices || src.invoice_count),
    monthly_revenue: inferRevenue(users, src.monthly_revenue || src.mrr || src.revenue_this_month),
    outstanding_balance: number(src.outstanding_balance || src.outstanding_amount),
    overdue_invoices: number(src.overdue_invoices || invoices.filter((invoice) => String(invoice?.status).toLowerCase() === "overdue").length),
    automation_rules: automations.length || number(src.automation_rules || src.total_automation_rules),
    automation_runs: number(src.automation_runs || src.total_automation_runs || src.runs_count),
    plan_counts: planCounts,
    users_list: users,
    businesses_list: businesses,
    active_today_list: activeToday,
    paid_users_list: paidUsers,
    jobs_list: jobs,
    clients_list: clients,
    quotes_list: quotes,
    invoices_list: invoices,
    automation_list: automations,
    raw: src,
  };
}

function ago(date) {
  if (!date) return "never";
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function MetricCard({ label, value, detail, icon: Icon, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border p-4 text-left shadow-xl transition hover:-translate-y-0.5 ${
        selected
          ? "border-cyan-300/70 bg-cyan-400/15 shadow-cyan-950/40"
          : "border-white/10 bg-white/[0.055] shadow-slate-950/40 hover:border-cyan-300/35 hover:bg-white/[0.08]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
          {detail ? <p className="mt-2 truncate text-xs font-semibold text-slate-400">{detail}</p> : null}
        </div>
        <span className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-2.5 text-cyan-200">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </button>
  );
}

function InfoLine({ icon: Icon, label, value, important = false }) {
  const shown = cleanText(value, "");
  if (!shown) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /> : null}
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <p className={`break-words text-sm ${important ? "font-black text-white" : "font-semibold text-slate-200"}`}>{shown}</p>
      </div>
    </div>
  );
}

function RecordCard({ item, type, onDelete, deleting }) {
  const id = recordId(item);
  const title = firstDefined(
    item?.name,
    item?.full_name,
    item?.business_name,
    item?.company,
    item?.title,
    item?.invoice_number,
    item?.quote_number,
    item?.email,
    id,
    "Record"
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 shadow-lg">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{title}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{type}</p>
        </div>
        {onDelete && id ? (
          <button
            type="button"
            onClick={() => onDelete(id)}
            disabled={deleting === id}
            className="rounded-xl border border-red-400/25 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            title="Delete user"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="grid gap-2">
        <InfoLine icon={Mail} label="Email" value={item?.email || item?.owner_email || item?.customer_email} />
        <InfoLine icon={Phone} label="Phone" value={item?.phone || item?.mobile} />
        <InfoLine icon={Building2} label="Business" value={item?.business_name || item?.company} />
        <InfoLine icon={Users} label="Client" value={item?.client_name || item?.customer_name} />
        <InfoLine icon={MapPin} label="Address" value={item?.address || item?.service_address} />
        <InfoLine icon={BadgeDollarSign} label="Plan" value={item?.plan || item?.subscription_plan || item?.plan_type} important />
        <InfoLine icon={Activity} label="Status" value={item?.status || item?.plan_status || item?.subscription_status} />
        <InfoLine icon={DollarSign} label="Amount" value={item?.total || item?.amount || item?.subtotal ? money(item?.total || item?.amount || item?.subtotal) : ""} important />
        <InfoLine label="ID" value={id} />
      </div>
    </div>
  );
}

function PlanBar({ label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-200">{label}</span>
        <span className="font-black text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AppOwnerPage() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [selected, setSelected] = useState("users_list");
  const [loading, setLoading] = useState(true);
  const [silentLoading, setSilentLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [deleting, setDeleting] = useState("");
  const [tick, setTick] = useState(0);
  const pollRef = useRef(null);

  const endpointChoices = useMemo(
    () => [
      "/api/admin/platform-stats",
      "/api/admin/usage",
      "/api/admin/dashboard",
      "/api/platform/stats",
      "/api/app-owner/stats",
    ],
    []
  );

  const apiFetch = useCallback(async (path, options = {}) => {
    const token = window.localStorage?.getItem("token") || window.localStorage?.getItem("authToken") || "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        signal: controller.signal,
        ...options,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.detail || data?.message || `${path} returned ${response.status}`);
      }

      return data || {};
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setSilentLoading(true);
      else setLoading(true);
      setError("");

      const failures = [];
      try {
        for (const endpoint of endpointChoices) {
          try {
            const payload = await apiFetch(endpoint);
            setStats(normalizeStats(payload));
            setSource(endpoint);
            setLastUpdated(new Date());
            return;
          } catch (err) {
            failures.push(`${endpoint}: ${err.message}`);
          }
        }

        throw new Error(failures.join(" | "));
      } catch (err) {
        if (!silent) {
          setStats(EMPTY_STATS);
          setError(`Live analytics endpoint is not returning data yet. ${err.message || ""}`);
        }
      } finally {
        setLoading(false);
        setSilentLoading(false);
      }
    },
    [apiFetch, endpointChoices]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    pollRef.current = setInterval(() => load(true), 30000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const deleteUser = async (id) => {
    if (!id) return;
    const confirmed = window.confirm("Delete this user from the platform? This cannot be undone.");
    if (!confirmed) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      await load(true);
    } catch (err) {
      alert(err.message || "Could not delete user.");
    } finally {
      setDeleting("");
    }
  };

  const totalPlans = Object.values(stats.plan_counts || {}).reduce((sum, value) => sum + number(value), 0);
  const paidRate = stats.total_users > 0 ? Math.round((stats.paid_users / stats.total_users) * 100) : 0;
  const businessRate = stats.total_users > 0 ? Math.round((stats.total_businesses / stats.total_users) * 100) : 0;

  const metrics = [
    { key: "users_list", label: "Users", value: stats.total_users, detail: `${paidRate}% paid`, icon: Users },
    { key: "businesses_list", label: "Businesses", value: stats.total_businesses, detail: `${businessRate}% user/business ratio`, icon: Building2 },
    { key: "active_today_list", label: "Active today", value: stats.active_today, detail: "Live usage pulse", icon: Activity },
    { key: "paid_users_list", label: "Paid users", value: stats.paid_users, detail: "Active subscriptions", icon: CreditCard },
    { key: "jobs_list", label: "Jobs", value: stats.total_jobs, detail: "Operational volume", icon: Briefcase },
    { key: "clients_list", label: "Clients", value: stats.total_clients, detail: "Customer records", icon: Users },
    { key: "quotes_list", label: "Quotes", value: stats.total_quotes, detail: "Sales pipeline", icon: FileText },
    { key: "invoices_list", label: "Invoices", value: stats.total_invoices, detail: `${stats.overdue_invoices} overdue`, icon: FileText },
    { key: "invoices_list", label: "MRR", value: money(stats.monthly_revenue), detail: "Monthly revenue", icon: DollarSign },
    { key: "invoices_list", label: "Outstanding", value: money(stats.outstanding_balance), detail: "Unpaid balance", icon: AlertTriangle },
    { key: "automation_list", label: "Automation", value: stats.automation_rules, detail: `${stats.automation_runs} runs`, icon: Zap },
  ];

  const selectedRecords = array(stats[selected]);
  const selectedMetric = metrics.find((metric) => metric.key === selected);
  const health = [
    { label: "Live endpoint", ok: Boolean(source), detail: source || "Missing" },
    { label: "Auto refresh", ok: true, detail: "Every 30 seconds" },
    { label: "Revenue signal", ok: stats.monthly_revenue > 0 || stats.paid_users === 0, detail: stats.monthly_revenue > 0 ? "Receiving" : "No paid users yet" },
    { label: "Data freshness", ok: Boolean(lastUpdated), detail: ago(lastUpdated) },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-200/15 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.20),transparent_22rem),linear-gradient(135deg,#020617,#0f172a_55%,#172554)] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan-300">Churvox owner command</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">App Owner Analytics</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
                Real-time platform view for users, businesses, revenue, jobs, invoices, automation, and launch health.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Live {lastUpdated ? ago(lastUpdated) : "loading"}
              </span>
              <button
                type="button"
                onClick={() => load(false)}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15"
              >
                <RefreshCw className={`h-4 w-4 ${loading || silentLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {health.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center gap-2">
                  {item.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4 text-amber-300" />}
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{item.label}</p>
                </div>
                <p className="mt-2 truncate text-sm font-bold text-white">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {error ? (
          <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm font-semibold text-amber-100">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map((metric) => (
                <MetricCard
                  key={`${metric.label}-${metric.key}`}
                  {...metric}
                  selected={selected === metric.key && selectedMetric?.label === metric.label}
                  onClick={() => setSelected(metric.key)}
                />
              ))}
            </div>

            <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/20">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">Plan mix</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-400">Current subscription spread across the platform.</p>
                </div>
                <Sparkles className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(stats.plan_counts || {}).map(([plan, value]) => (
                  <PlanBar key={plan} label={plan.charAt(0).toUpperCase() + plan.slice(1)} value={number(value)} total={totalPlans} />
                ))}
              </div>
            </section>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">Drilldown</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">{selectedMetric?.label || "Records"} · {selectedRecords.length} shown</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="max-h-[72vh] space-y-3 overflow-auto pr-1">
              {selectedRecords.length ? (
                selectedRecords.map((item, index) => (
                  <RecordCard
                    key={recordId(item) || item?.email || item?.invoice_number || index}
                    item={item}
                    type={selectedMetric?.label || selected}
                    onDelete={selected === "users_list" || selected === "paid_users_list" || selected === "active_today_list" ? deleteUser : undefined}
                    deleting={deleting}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 text-sm font-semibold text-slate-400">
                  No records returned for this section yet.
                </div>
              )}
            </div>
          </aside>
        </div>

        <p className="mt-5 text-center text-xs font-semibold text-slate-600">
          Source: {source || "waiting for admin endpoint"} · tick {tick}
        </p>
      </div>
    </div>
  );
}
