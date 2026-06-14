// CHURVOX_HQ_FULL_SCREEN_OWNER_CONTROL_ROOM_20260614

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  Globe2,
  LifeBuoy,
  Mail,
  MousePointerClick,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import API_BASE from "../lib/apiBase";

const OWNER_EMAIL = "hello@churvox.com";

const TABS = [
  { key: "overview", label: "Overview", icon: Globe2 },
  { key: "live", label: "Live Users", icon: Radio },
  { key: "businesses", label: "Businesses", icon: Building2 },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "usage", label: "Usage", icon: BarChart3 },
  { key: "support", label: "Support", icon: LifeBuoy },
  { key: "errors", label: "Errors", icon: AlertTriangle },
  { key: "settings", label: "Settings", icon: Settings },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function money(value) {
  return Number(value || 0).toLocaleString("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  });
}

function dateText(value) {
  if (!value) return "Not set";
  try {
    return new Date(value).toLocaleString("en-NZ");
  } catch {
    return String(value);
  }
}

function toDate(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function minutesAgo(value) {
  const d = toDate(value);
  if (!d) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
}

function short(value, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

function idOf(item) {
  return item?._id || item?.id || item?.business_id || item?.email || "";
}

function businessKey(item) {
  return String(item?.business_id || item?.owner_id || item?.user_id || item?.id || item?._id || "");
}

function recordName(item) {
  return (
    item?.business_name ||
    item?.company ||
    item?.name ||
    item?.full_name ||
    item?.title ||
    item?.email ||
    item?.customer_name ||
    item?.client_name ||
    item?.path ||
    "Record"
  );
}

function planLabel(item) {
  const raw = String(item?.plan || item?.subscription_plan || item?.plan_type || "unknown").toLowerCase();
  const labels = {
    solo: "Start",
    start: "Start",
    team: "Crew",
    crew: "Crew",
    pro: "Operator",
    operator: "Operator",
    enterprise: "Command",
    command: "Command",
    trial: "Trial",
    none: "None",
  };
  return labels[raw] || raw.charAt(0).toUpperCase() + raw.slice(1);
}

function billingStatus(item) {
  return short(item?.subscription_status || item?.billing_status || item?.stripe_status || item?.status, "Unknown");
}

function lastActivity(item) {
  return item?.last_active || item?.last_seen || item?.last_login || item?.updated_at || item?.created_at;
}

function countForBusiness(list, businessId) {
  if (!businessId) return 0;
  const ids = new Set([String(businessId)]);
  return asArray(list).filter((item) => ids.has(String(item?.business_id || item?.owner_id || item?.user_id || item?.client_business_id || ""))).length;
}

function statusPill(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("paid") || value.includes("active")) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (value.includes("trial")) return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (value.includes("fail") || value.includes("past") || value.includes("unpaid") || value.includes("cancel")) return "border-red-500/30 bg-red-500/10 text-red-200";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function healthForBusiness(item, lists) {
  const status = String(billingStatus(item)).toLowerCase();
  const id = businessKey(item);
  const jobs = countForBusiness(lists.jobs, id);
  const clients = countForBusiness(lists.clients, id);
  const invoices = countForBusiness(lists.invoices, id);
  const activeMins = minutesAgo(lastActivity(item));

  if (status.includes("fail") || status.includes("past") || status.includes("unpaid")) {
    return { label: "Payment issue", className: "border-red-500/30 bg-red-500/10 text-red-200" };
  }
  if (!jobs && !clients && !invoices) {
    return { label: "Needs setup help", className: "border-amber-500/30 bg-amber-500/10 text-amber-200" };
  }
  if (activeMins !== null && activeMins <= 60 * 24 * 7) {
    return { label: "Healthy", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" };
  }
  return { label: "At risk", className: "border-orange-500/30 bg-orange-500/10 text-orange-200" };
}

function MetricCard({ label, value, helper, icon: Icon, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    red: "border-red-500/20 bg-red-500/10 text-red-200",
  };

  return (
    <article className="rounded-[26px] border border-slate-800 bg-slate-950/70 p-5 shadow-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
        {Icon ? <span className={`rounded-2xl border p-2 ${tones[tone] || tones.cyan}`}><Icon size={18} /></span> : null}
      </div>
      <strong className="block text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">{value}</strong>
      {helper ? <p className="mt-2 text-xs font-bold leading-5 text-slate-400">{helper}</p> : null}
    </article>
  );
}

function Line({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 border-t border-slate-800 py-2 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-bold text-slate-100">{String(value)}</span>
    </div>
  );
}

function EmptyState({ children = "Nothing returned for this section yet." }) {
  return (
    <div className="rounded-[26px] border border-slate-800 bg-slate-950/70 p-10 text-center text-sm font-bold text-slate-400">
      <CheckCircle className="mx-auto mb-3 text-emerald-300" />
      {children}
    </div>
  );
}

function UserCard({ item, lists, onDeleteUser, busy, showHealth = false }) {
  const id = idOf(item);
  const health = showHealth ? healthForBusiness(item, lists) : null;
  return (
    <article className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-white">{recordName(item)}</h3>
          <p className="truncate text-xs font-semibold text-slate-500">{short(item.email || item.phone || item.mobile)}</p>
        </div>
        {onDeleteUser && id ? (
          <button
            type="button"
            onClick={() => onDeleteUser(id)}
            disabled={busy === id}
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            title="Delete user"
          >
            <Trash2 size={15} />
          </button>
        ) : null}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-200">{planLabel(item)}</span>
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusPill(billingStatus(item))}`}>{billingStatus(item)}</span>
        {health ? <span className={`rounded-full border px-3 py-1 text-xs font-black ${health.className}`}>{health.label}</span> : null}
      </div>

      <Line label="Business" value={item.business_name || item.company} />
      <Line label="Last active" value={dateText(lastActivity(item))} />
      <Line label="Current area" value={item.last_seen_path} />
      <Line label="Stripe customer" value={item.stripe_customer_id} />
      <Line label="Created" value={dateText(item.created_at || item.createdAt)} />
    </article>
  );
}

function BusinessCard({ item, lists, onDeleteBusiness, busy }) {
  const id = idOf(item);
  const health = healthForBusiness(item, lists);
  const key = businessKey(item);
  return (
    <article className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-white">{recordName(item)}</h3>
          <p className="truncate text-xs font-semibold text-slate-500">Owner: {short(item.email)}</p>
        </div>
        {id ? (
          <button
            type="button"
            onClick={() => onDeleteBusiness(id)}
            disabled={busy === id}
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            title="Delete business/workspace"
          >
            <Trash2 size={15} />
          </button>
        ) : null}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${health.className}`}>{health.label}</span>
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-200">{planLabel(item)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-900 p-3"><b className="text-white">{countForBusiness(lists.jobs, key)}</b><small className="block text-slate-500">Jobs</small></div>
        <div className="rounded-2xl bg-slate-900 p-3"><b className="text-white">{countForBusiness(lists.invoices, key)}</b><small className="block text-slate-500">Invoices</small></div>
        <div className="rounded-2xl bg-slate-900 p-3"><b className="text-white">{countForBusiness(lists.clients, key)}</b><small className="block text-slate-500">Clients</small></div>
      </div>

      <Line label="Billing" value={billingStatus(item)} />
      <Line label="Last active" value={dateText(lastActivity(item))} />
      <Line label="Business ID" value={key} />
    </article>
  );
}

function VisitCard({ item }) {
  const ago = minutesAgo(item.last_seen || item.created_at);
  return (
    <article className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-white">{short(item.user_email || item.business_name || item.path, "Visitor")}</h3>
          <p className="truncate text-xs font-semibold text-slate-500">{short(item.ip || item.referrer || item.source)}</p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">
          {ago !== null && ago <= 15 ? "Online" : "Seen"}
        </span>
      </div>
      <Line label="Current area" value={item.path} />
      <Line label="Business" value={item.business_name} />
      <Line label="Last seen" value={dateText(item.last_seen || item.created_at)} />
      <Line label="Device" value={item.user_agent} />
    </article>
  );
}

function EventCard({ item }) {
  return (
    <article className="rounded-[22px] border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-1 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-200"><Activity size={15} /></span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-white">{short(item.title || item.label || item.kind, "Activity")}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">{short(item.meta || item.label)}</p>
          <p className="mt-2 text-xs font-bold text-slate-500">{dateText(item.at || item.created_at)}</p>
        </div>
      </div>
    </article>
  );
}

function InvoiceCard({ item }) {
  return (
    <article className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-white">{short(item.invoice_number || item.customer_name || item.client_name, "Invoice")}</h3>
          <p className="text-xs font-semibold text-slate-500">{dateText(item.created_at || item.updated_at)}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusPill(item.status)}`}>{short(item.status, "Status")}</span>
      </div>
      <Line label="Customer" value={item.customer_name || item.client_name} />
      <Line label="Total" value={money(item.total || item.amount_total || item.subtotal)} />
      <Line label="Business ID" value={item.business_id || item.owner_id} />
    </article>
  );
}

export default function AppOwnerPage() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [cleanup, setCleanup] = useState(null);
  const [query, setQuery] = useState("");

  const token = () => {
    try { return window.localStorage.getItem("token") || ""; } catch { return ""; }
  };

  const request = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(options.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      throw new Error(body?.detail || body?.message || `Request failed: ${res.status}`);
    }
    return body;
  }, []);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const next = await request("/api/admin/owner-overview");
      setData(next);
    } catch (err) {
      setError(err?.message || "Could not load Churvox HQ data");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [request]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setInterval(() => load(true), 30000);
    return () => clearInterval(timer);
  }, [load]);

  async function deleteUser(id) {
    if (!id) return;
    if (!window.confirm("Delete this user account? This cannot be undone.")) return;
    setBusy(id);
    try {
      await request(`/api/admin/owner/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast.success("User deleted");
      await load(true);
    } catch (err) {
      toast.error(err?.message || "Could not delete user");
    } finally {
      setBusy("");
    }
  }

  async function deleteBusiness(id) {
    if (!id) return;
    const confirmText = window.prompt("Type DELETE BUSINESS to remove this business/workspace and its records.");
    if (confirmText !== "DELETE BUSINESS") return;
    setBusy(id);
    try {
      await request(`/api/admin/owner/businesses/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast.success("Business/workspace deleted");
      await load(true);
    } catch (err) {
      toast.error(err?.message || "Could not delete business");
    } finally {
      setBusy("");
    }
  }

  async function previewCleanup() {
    setBusy("cleanup-preview");
    try {
      const res = await request("/api/admin/owner/cleanup-tests", {
        method: "POST",
        body: JSON.stringify({ dry_run: true }),
      });
      setCleanup(res);
      toast.success("Cleanup preview loaded");
    } catch (err) {
      toast.error(err?.message || "Could not preview cleanup");
    } finally {
      setBusy("");
    }
  }

  async function runCleanup() {
    const confirmText = window.prompt("Type DELETE OLD SAMPLE DATA to remove old sample records.");
    if (confirmText !== "DELETE OLD SAMPLE DATA") return;
    setBusy("cleanup-run");
    try {
      const res = await request("/api/admin/owner/cleanup-tests", {
        method: "POST",
        body: JSON.stringify({ dry_run: false }),
      });
      setCleanup(res);
      toast.success("Old sample data cleanup complete");
      await load(true);
    } catch (err) {
      toast.error(err?.message || "Could not run cleanup");
    } finally {
      setBusy("");
    }
  }

  const metrics = data?.metrics || {};
  const lists = data?.lists || {};
  const activeNow = asArray(lists.active_now);
  const activeToday = asArray(lists.active_today);
  const businesses = asArray(lists.businesses);
  const paidUsers = asArray(lists.paid_users);
  const trialUsers = asArray(lists.trial_users);
  const events = asArray(lists.events);
  const invoices = asArray(lists.invoices);
  const cleanupRows = cleanup?.collections || asArray(lists.test_preview);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filter = (items) => !q ? items : asArray(items).filter((item) => JSON.stringify(item).toLowerCase().includes(q));
    return {
      activeNow: filter(activeNow),
      activeToday: filter(activeToday),
      businesses: filter(businesses),
      paidUsers: filter(paidUsers),
      trialUsers: filter(trialUsers),
      invoices: filter(invoices),
      events: filter(events),
    };
  }, [query, activeNow, activeToday, businesses, paidUsers, trialUsers, invoices, events]);

  const supportQueue = useMemo(() => {
    const rows = businesses.map((item) => ({ item, health: healthForBusiness(item, lists) }));
    return rows.filter((row) => row.health.label !== "Healthy").slice(0, 24);
  }, [businesses, lists]);

  const possiblePaymentIssues = useMemo(() => {
    return asArray(lists.users).filter((user) => {
      const status = String(billingStatus(user)).toLowerCase();
      return status.includes("fail") || status.includes("past") || status.includes("unpaid") || status.includes("cancel");
    });
  }, [lists.users]);

  const canSearch = !["overview", "settings"].includes(activeTab);

  return (
    <main className="min-h-screen w-full bg-[#05070b] text-white">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[290px_1fr]">
        <aside className="border-b border-slate-800 bg-slate-950/95 p-4 xl:border-b-0 xl:border-r xl:border-slate-800">
          <div className="mb-5 rounded-[28px] border border-orange-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-5">
            <div className="mb-4 inline-flex rounded-2xl bg-orange-500 p-3 text-slate-950"><Shield size={24} /></div>
            <h1 className="text-3xl font-black tracking-[-0.06em]">Churvox HQ</h1>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-400">Private platform owner control room. Locked to {OWNER_EMAIL}.</p>
          </div>

          <nav className="grid gap-2">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                  activeTab === key ? "bg-orange-500 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon size={17} /> {label}
              </button>
            ))}
          </nav>

          <div className="mt-5 rounded-[24px] border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Status</p>
            <div className="mt-3 space-y-2 text-sm font-bold text-slate-300">
              <div className="flex justify-between gap-3"><span>Auto refresh</span><b className="text-emerald-300">30s</b></div>
              <div className="flex justify-between gap-3"><span>Last loaded</span><b className="text-white">{dateText(data?.generated_at)}</b></div>
              <div className="flex justify-between gap-3"><span>Access</span><b className="text-orange-300">Owner only</b></div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 p-4 md:p-6 xl:p-8">
          <header className="mb-6 flex flex-col gap-4 rounded-[34px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-5 shadow-2xl md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-orange-200">
                <Shield size={14} /> App owner live view
              </div>
              <h2 className="text-4xl font-black tracking-[-0.07em] md:text-6xl">{TABS.find((tab) => tab.key === activeTab)?.label || "Overview"}</h2>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-400">
                See who is on, who is paying, who is using Churvox, who needs help, and what needs your attention.
              </p>
            </div>
            <button
              type="button"
              onClick={() => load(false)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-5 py-3 text-sm font-black text-orange-100 hover:bg-orange-500/20"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh live data
            </button>
          </header>

          {error ? (
            <div className="mb-5 rounded-[24px] border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : null}

          {canSearch ? (
            <label className="relative mb-5 block max-w-xl">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search this section..."
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm font-bold text-white outline-none focus:border-orange-500"
              />
            </label>
          ) : null}

          {activeTab === "overview" ? (
            <div className="space-y-6">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                <MetricCard label="On now" value={metrics.active_now || 0} helper="Visitors active in the last 15 minutes" icon={Eye} tone="green" />
                <MetricCard label="Paid users" value={metrics.paid_users || 0} helper={`${metrics.trial_users || 0} trials being watched`} icon={CreditCard} tone="green" />
                <MetricCard label="MRR estimate" value={money(metrics.monthly_revenue_estimate || 0)} helper="Based on current plan signals" icon={DollarSign} tone="green" />
                <MetricCard label="Businesses" value={metrics.total_businesses || 0} helper={`${metrics.active_today || 0} users active today`} icon={Building2} />
                <MetricCard label="Visitors today" value={metrics.visitors_today || 0} helper={`${metrics.unique_visitors_today || 0} unique · ${metrics.visitors_7d || 0} last 7 days`} icon={Globe2} />
                <MetricCard label="Jobs" value={metrics.total_jobs || 0} helper={`${metrics.total_clients || 0} clients in platform`} icon={MousePointerClick} />
                <MetricCard label="Invoices" value={metrics.total_invoices || 0} helper={`${money(metrics.invoice_value_outstanding || 0)} outstanding`} icon={DollarSign} tone="amber" />
                <MetricCard label="Support queue" value={supportQueue.length} helper="Businesses needing a check-in" icon={LifeBuoy} tone={supportQueue.length ? "amber" : "green"} />
              </section>

              <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[1fr_420px]">
                <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                  <h3 className="mb-4 text-xl font-black">Live activity</h3>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {events.slice(0, 8).map((event, idx) => <EventCard key={`event-${idx}`} item={event} />)}
                    {!events.length ? <EmptyState>No recent activity yet.</EmptyState> : null}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                  <h3 className="mb-4 text-xl font-black">Plan mix</h3>
                  <div className="space-y-3">
                    {Object.entries(metrics.plan_counts || {}).map(([plan, count]) => (
                      <div key={plan} className="rounded-2xl bg-slate-950/70 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <b className="text-white">{plan}</b>
                          <span className="text-2xl font-black text-orange-300">{count}</span>
                        </div>
                      </div>
                    ))}
                    {!Object.keys(metrics.plan_counts || {}).length ? <EmptyState>No plan records yet.</EmptyState> : null}
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "live" ? (
            <div className="space-y-6">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard label="On now" value={filtered.activeNow.length} helper="Active visitors" icon={Radio} tone="green" />
                <MetricCard label="Active today" value={filtered.activeToday.length} helper="Logged-in users active today" icon={UserCheck} />
                <MetricCard label="Visitors 7 days" value={metrics.visitors_7d || 0} helper={`${metrics.unique_visitors_7d || 0} unique`} icon={Globe2} />
              </section>
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {filtered.activeNow.map((item, idx) => <VisitCard key={`visit-${idOf(item) || idx}`} item={item} />)}
                {filtered.activeToday.map((item, idx) => <UserCard key={`today-${idOf(item) || idx}`} item={item} lists={lists} />)}
                {!filtered.activeNow.length && !filtered.activeToday.length ? <EmptyState>No one is active right now.</EmptyState> : null}
              </section>
            </div>
          ) : null}

          {activeTab === "businesses" ? (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {filtered.businesses.map((item, idx) => (
                <BusinessCard key={`biz-${idOf(item) || idx}`} item={item} lists={lists} busy={busy} onDeleteBusiness={deleteBusiness} />
              ))}
              {!filtered.businesses.length ? <EmptyState>No businesses found.</EmptyState> : null}
            </section>
          ) : null}

          {activeTab === "billing" ? (
            <div className="space-y-6">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <MetricCard label="MRR estimate" value={money(metrics.monthly_revenue_estimate || 0)} helper="Plan signal estimate" icon={DollarSign} tone="green" />
                <MetricCard label="Paid users" value={paidUsers.length} helper="Active/buyer signals" icon={CreditCard} tone="green" />
                <MetricCard label="Trials" value={trialUsers.length} helper="Trial accounts" icon={Clock} tone="amber" />
                <MetricCard label="Payment issues" value={possiblePaymentIssues.length} helper="Needs follow-up" icon={XCircle} tone={possiblePaymentIssues.length ? "red" : "green"} />
              </section>
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {[...filtered.paidUsers, ...filtered.trialUsers, ...possiblePaymentIssues].map((item, idx) => (
                  <UserCard key={`billing-${idOf(item) || idx}`} item={item} lists={lists} busy={busy} onDeleteUser={deleteUser} />
                ))}
                {!filtered.paidUsers.length && !filtered.trialUsers.length && !possiblePaymentIssues.length ? <EmptyState>No billing records found.</EmptyState> : null}
              </section>
            </div>
          ) : null}

          {activeTab === "usage" ? (
            <div className="space-y-6">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <MetricCard label="Jobs" value={metrics.total_jobs || 0} helper="Created across Churvox" icon={MousePointerClick} />
                <MetricCard label="Quotes" value={metrics.total_quotes || 0} helper="Quote records" icon={Mail} />
                <MetricCard label="Invoices" value={metrics.total_invoices || 0} helper={money(metrics.invoice_value_total || 0)} icon={DollarSign} tone="green" />
                <MetricCard label="Active 30 days" value={metrics.active_30d || 0} helper="Users with recent activity" icon={Activity} />
              </section>
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {businesses.map((item, idx) => <BusinessCard key={`usage-${idOf(item) || idx}`} item={item} lists={lists} busy={busy} onDeleteBusiness={deleteBusiness} />)}
                {!businesses.length ? <EmptyState>No usage data found yet.</EmptyState> : null}
              </section>
            </div>
          ) : null}

          {activeTab === "support" ? (
            <div className="space-y-6">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard label="Needs help" value={supportQueue.length} helper="Low setup or risk signals" icon={LifeBuoy} tone={supportQueue.length ? "amber" : "green"} />
                <MetricCard label="Payment issues" value={possiblePaymentIssues.length} helper="Billing follow-ups" icon={CreditCard} tone={possiblePaymentIssues.length ? "red" : "green"} />
                <MetricCard label="New trials" value={trialUsers.length} helper="Onboarding opportunities" icon={UserCheck} tone="amber" />
              </section>
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {supportQueue.map(({ item }, idx) => <BusinessCard key={`support-${idOf(item) || idx}`} item={item} lists={lists} busy={busy} onDeleteBusiness={deleteBusiness} />)}
                {!supportQueue.length ? <EmptyState>No support issues showing right now.</EmptyState> : null}
              </section>
            </div>
          ) : null}

          {activeTab === "errors" ? (
            <div className="space-y-6">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard label="Data load" value={error ? "Issue" : "OK"} helper={error || "Owner API responded"} icon={error ? AlertTriangle : CheckCircle} tone={error ? "red" : "green"} />
                <MetricCard label="Collections" value={(data?.collections_seen || []).length} helper="Database areas detected" icon={Wrench} />
                <MetricCard label="Old sample matches" value={cleanupRows.length} helper="Use Settings to clean" icon={AlertTriangle} tone={cleanupRows.length ? "amber" : "green"} />
              </section>
              <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                <h3 className="mb-4 text-xl font-black">Recent system activity</h3>
                <div className="grid gap-3 xl:grid-cols-2">
                  {filtered.events.map((event, idx) => <EventCard key={`error-event-${idx}`} item={event} />)}
                  {!filtered.events.length ? <EmptyState>No error/activity events returned.</EmptyState> : null}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "settings" ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
              <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                <h3 className="mb-2 text-xl font-black">Owner lock</h3>
                <p className="text-sm font-bold leading-6 text-slate-400">Churvox HQ is restricted to the platform owner account only.</p>
                <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm font-black text-orange-100">
                  {OWNER_EMAIL}
                </div>

                <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-black text-amber-100"><AlertTriangle size={16} /> Old sample cleanup</h4>
                  <p className="mt-2 text-xs font-semibold leading-5 text-amber-200/80">Preview first. Protected owner accounts are not removed.</p>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={previewCleanup}
                      disabled={busy === "cleanup-preview"}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-black text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      Preview cleanup
                    </button>
                    <button
                      type="button"
                      onClick={runCleanup}
                      disabled={busy === "cleanup-run"}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-black text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Delete old sample records
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                <h3 className="mb-4 text-xl font-black">Cleanup preview</h3>
                <div className="grid gap-3 xl:grid-cols-2">
                  {cleanupRows.length ? cleanupRows.map((row, idx) => (
                    <article key={`${row.collection}-${idx}`} className="rounded-[22px] border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <b className="text-white">{row.collection}</b>
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
                          {row.count || row.matched || 0} matches
                        </span>
                      </div>
                      {asArray(row.examples).slice(0, 3).map((ex, exIdx) => (
                        <p key={exIdx} className="mt-2 truncate rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-slate-400">
                          {recordName(ex)} {ex.email ? `• ${ex.email}` : ""}
                        </p>
                      ))}
                    </article>
                  )) : <EmptyState>No old sample records found.</EmptyState>}
                </div>
              </section>
            </div>
          ) : null}

          {loading ? <div className="mt-6 text-sm font-bold text-slate-500">Loading Churvox HQ data…</div> : null}
        </section>
      </div>
    </main>
  );
}
