import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Building2,
  Activity,
  CreditCard,
  FileText,
  Briefcase,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  BadgeDollarSign,
} from "lucide-react";

const API_BASE = (
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL)) ||
  (typeof process !== "undefined" &&
    process.env &&
    (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL)) ||
  "https://grassley-backend.onrender.com"
).replace(/\/$/, "");

const money = (n) =>
  new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const num = (n) => Number(n || 0);

const EMPTY_STATS = {
  total_users: 0,
  total_businesses: 0,
  active_today: 0,
  paid_users: 0,
  total_invoices: 0,
  total_jobs: 0,
  monthly_revenue: 0,
  outstanding_balance: 0,
  plan_counts: { solo: 0, team: 0, pro: 0, enterprise: 0 },
  users_list: [],
  businesses_list: [],
  active_today_list: [],
  paid_users_list: [],
  invoices_list: [],
  jobs_list: [],
  raw: {},
};

function normalizeStats(raw) {
  const src = raw || {};
  const stats = src.stats && typeof src.stats === "object" ? src.stats : src;
  const usage = src.usage && typeof src.usage === "object" ? src.usage : {};
  const plans =
    src.plans_in_use ||
    src.plan_counts ||
    stats.plans_in_use ||
    stats.plan_counts ||
    {};

  const usersList =
    src.users_list || stats.users_list || src.users || stats.users || src.recent_users || [];
  const businessesList =
    src.businesses_list || stats.businesses_list || src.businesses || stats.businesses || [];
  const invoicesList =
    src.invoices_list || stats.invoices_list || src.overdue_invoices || stats.overdue_invoices || [];
  const jobsList =
    src.jobs_list || stats.jobs_list || src.jobs || stats.jobs || [];
  const paidUsersList =
    src.paid_users_list || stats.paid_users_list || src.subscribers || stats.subscribers || [];
  const activeTodayList =
    src.active_today_list || stats.active_today_list || src.active_users || stats.active_users || [];

  return {
    total_users: num(
      stats.total_users ??
        stats.users ??
        stats.user_count ??
        src.total_users ??
        src.users ??
        src.user_count
    ),
    total_businesses: num(
      stats.total_businesses ??
        stats.businesses ??
        stats.business_count ??
        src.total_businesses ??
        src.businesses ??
        src.business_count
    ),
    active_today: num(
      stats.active_today ??
        stats.daily_active ??
        stats.activeUsersToday ??
        src.active_today ??
        src.daily_active ??
        src.activeUsersToday
    ),
    paid_users: num(
      stats.paid_users ??
        stats.paidUsers ??
        src.paid_users ??
        src.paidUsers
    ),
    total_invoices: num(
      stats.total_invoices ??
        stats.invoices ??
        stats.invoice_count ??
        src.total_invoices ??
        src.invoices ??
        src.invoice_count
    ),
    total_jobs: num(
      stats.total_jobs ??
        stats.jobs ??
        stats.job_count ??
        src.total_jobs ??
        src.jobs ??
        src.job_count
    ),
    monthly_revenue: num(
      stats.monthly_revenue ??
        stats.monthlyRevenue ??
        stats.revenue_monthly ??
        src.monthly_revenue ??
        src.monthlyRevenue ??
        src.revenue_monthly
    ),
    outstanding_balance: num(
      stats.outstanding_balance ??
        stats.outstandingBalance ??
        src.outstanding_balance ??
        src.outstandingBalance ??
        usage.unpaid_invoice_total
    ),
    plan_counts: {
      solo: num(plans.solo),
      team: num(plans.team),
      pro: num(plans.pro),
      enterprise: num(plans.enterprise),
    },
    users_list: Array.isArray(usersList) ? usersList : [],
    businesses_list: Array.isArray(businessesList) ? businessesList : [],
    active_today_list: Array.isArray(activeTodayList) ? activeTodayList : [],
    paid_users_list: Array.isArray(paidUsersList) ? paidUsersList : [],
    invoices_list: Array.isArray(invoicesList) ? invoicesList : [],
    jobs_list: Array.isArray(jobsList) ? jobsList : [],
    raw: src,
  };
}

function StatCard({ label, value, subtext, icon: Icon, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left shadow-lg transition active:scale-[0.99] ${
        active
          ? "border-cyan-400/70 bg-slate-800/95"
          : "border-blue-500/20 bg-slate-900/80 hover:border-blue-400/50 hover:bg-slate-800/90"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-sm text-slate-300">{label}</div>
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-5 w-5 text-cyan-400" /> : null}
          <ArrowRight className="h-4 w-4 text-slate-500" />
        </div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {subtext ? <div className="mt-1 text-xs text-slate-400">{subtext}</div> : null}
    </button>
  );
}

function Field({ icon: Icon, label, value, moneyValue = false }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
      {Icon ? <Icon className="mt-0.5 h-4 w-4 text-cyan-400" /> : null}
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="break-words text-sm text-white">
          {moneyValue ? money(value) : String(value)}
        </div>
      </div>
    </div>
  );
}

function recordTitle(item) {
  return (
    item?.name ||
    item?.full_name ||
    item?.business_name ||
    item?.company ||
    item?.email ||
    item?.title ||
    item?.client_name ||
    item?.invoice_number ||
    item?.job_number ||
    item?._id ||
    item?.id ||
    "Record"
  );
}

function getDetailType(selected) {
  if (selected === "users_list") return "user";
  if (selected === "paid_users_list") return "paid_user";
  if (selected === "active_today_list") return "active_user";
  if (selected === "businesses_list") return "business";
  if (selected === "invoices_list") return "invoice";
  if (selected === "jobs_list") return "job";
  return "raw";
}

function DetailCard({ item, type }) {
  if (type === "user" || type === "paid_user" || type === "active_user") {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="mb-3 text-sm font-semibold text-white">{recordTitle(item)}</div>
        <div className="grid grid-cols-1 gap-2">
          <Field icon={Mail} label="Email" value={item?.email} />
          <Field icon={Phone} label="Phone" value={item?.phone || item?.mobile} />
          <Field icon={BadgeDollarSign} label="Plan" value={item?.plan || item?.subscription_plan} />
          <Field icon={Activity} label="Status" value={item?.status || item?.account_status} />
          <Field icon={CalendarDays} label="Created" value={item?.created_at || item?.createdAt} />
          <Field icon={CalendarDays} label="Last Active" value={item?.last_active || item?.last_login || item?.updated_at} />
          <Field label="User ID" value={item?._id || item?.id} />
        </div>
      </div>
    );
  }

  if (type === "business") {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="mb-3 text-sm font-semibold text-white">{recordTitle(item)}</div>
        <div className="grid grid-cols-1 gap-2">
          <Field icon={Users} label="Owner" value={item?.owner_name || item?.owner || item?.user_name} />
          <Field icon={Mail} label="Email" value={item?.email} />
          <Field icon={Phone} label="Phone" value={item?.phone} />
          <Field icon={MapPin} label="Address" value={item?.address} />
          <Field icon={BadgeDollarSign} label="Plan" value={item?.plan || item?.subscription_plan} />
          <Field icon={Activity} label="Status" value={item?.status} />
          <Field icon={CalendarDays} label="Created" value={item?.created_at || item?.createdAt} />
          <Field label="Business ID" value={item?._id || item?.id} />
        </div>
      </div>
    );
  }

  if (type === "invoice") {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="mb-3 text-sm font-semibold text-white">{item?.invoice_number || recordTitle(item)}</div>
        <div className="grid grid-cols-1 gap-2">
          <Field icon={Users} label="Client" value={item?.client_name || item?.customer_name} />
          <Field icon={DollarSign} label="Total" value={item?.total || item?.amount_total} moneyValue />
          <Field icon={AlertTriangle} label="Amount Due" value={item?.amount_due || item?.balance_due} moneyValue />
          <Field icon={Activity} label="Status" value={item?.status} />
          <Field icon={CalendarDays} label="Due Date" value={item?.due_date} />
          <Field icon={CalendarDays} label="Created" value={item?.created_at || item?.createdAt} />
          <Field label="Invoice ID" value={item?._id || item?.id} />
        </div>
      </div>
    );
  }

  if (type === "job") {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="mb-3 text-sm font-semibold text-white">{item?.title || item?.job_title || recordTitle(item)}</div>
        <div className="grid grid-cols-1 gap-2">
          <Field icon={Users} label="Client" value={item?.client_name} />
          <Field icon={Building2} label="Business" value={item?.business_name} />
          <Field icon={MapPin} label="Address" value={item?.address || item?.service_address} />
          <Field icon={Activity} label="Status" value={item?.status} />
          <Field icon={CalendarDays} label="Scheduled" value={item?.scheduled_date || item?.start_date} />
          <Field icon={CalendarDays} label="Created" value={item?.created_at || item?.createdAt} />
          <Field label="Job ID" value={item?._id || item?.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200">
      <div className="font-medium text-white">{recordTitle(item)}</div>
      <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-400">
{JSON.stringify(item, null, 2)}
      </pre>
    </div>
  );
}

export default function AppOwnerPage() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [selected, setSelected] = useState("users_list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sourceUsed, setSourceUsed] = useState("");

  async function tryEndpoint(path) {
    const token =
      (typeof window !== "undefined" && window.localStorage && window.localStorage.getItem("token")) || "";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${path} ${res.status}: ${text}`);
      }

      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const endpoints = [
        "/api/admin/usage-summary",
        "/api/admin/platform-stats",
        "/api/admin/stats",
        "/api/owner/stats",
      ];

      let data = null;
      let used = "";

      for (const endpoint of endpoints) {
        try {
          data = await tryEndpoint(endpoint);
          used = endpoint;
          break;
        } catch (err) {
          console.warn("Owner dashboard endpoint failed:", endpoint, err);
        }
      }

      if (!data) {
        setStats(EMPTY_STATS);
        setSourceUsed("");
        setError("Could not load live platform data.");
        return;
      }

      setStats(normalizeStats(data));
      setSourceUsed(used);
    } catch (err) {
      console.error("Owner dashboard load failed:", err);
      setStats(EMPTY_STATS);
      setSourceUsed("");
      setError("Could not load live platform data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const detailType = getDetailType(selected);

  const drilldown = useMemo(() => {
    if (!stats || !selected) return [];
    const value = stats[selected];
    return Array.isArray(value) ? value : [];
  }, [stats, selected]);

  const cards = [
    {
      key: "users_list",
      label: "Total Users",
      value: stats.total_users,
      subtext: null,
      icon: Users,
    },
    {
      key: "businesses_list",
      label: "Total Businesses",
      value: stats.total_businesses,
      subtext: null,
      icon: Building2,
    },
    {
      key: "active_today_list",
      label: "Active Today",
      value: stats.active_today,
      subtext: null,
      icon: Activity,
    },
    {
      key: "paid_users_list",
      label: "Paid Users",
      value: stats.paid_users,
      subtext: null,
      icon: CreditCard,
    },
    {
      key: "invoices_list",
      label: "Total Invoices",
      value: stats.total_invoices,
      subtext: null,
      icon: FileText,
    },
    {
      key: "jobs_list",
      label: "Jobs Today",
      value: stats.total_jobs,
      subtext: null,
      icon: Briefcase,
    },
    {
      key: "invoices_list",
      label: "Monthly Revenue",
      value: money(stats.monthly_revenue),
      subtext: null,
      icon: DollarSign,
    },
    {
      key: "invoices_list",
      label: "Outstanding Balance",
      value: money(stats.outstanding_balance),
      subtext: null,
      icon: AlertTriangle,
    },
  ];

  const selectedLabel =
    cards.find((card) => card.key === selected)?.label || selected;

  const planRows = [
    ["Solo", stats.plan_counts?.solo || 0],
    ["Team", stats.plan_counts?.team || 0],
    ["Pro", stats.plan_counts?.pro || 0],
    ["Enterprise", stats.plan_counts?.enterprise || 0],
  ].filter(([, value]) => value > 0);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Platform Dashboard</h1>
            <p className="text-sm text-slate-400">Live owner/admin data</p>
            {sourceUsed ? (
              <p className="mt-2 text-xs text-cyan-400">Loaded from: {sourceUsed}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-slate-900/80 px-4 py-3 text-sm font-medium text-white hover:border-blue-400/60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh stats
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <StatCard
                  key={`${card.label}-${card.key}`}
                  label={card.label}
                  value={card.value}
                  subtext={card.subtext}
                  icon={card.icon}
                  onClick={() => setSelected(card.key)}
                  active={selected === card.key}
                />
              ))}
            </div>

            {planRows.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-blue-500/20 bg-slate-900/80 p-4 shadow-lg">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-white">Plans In Use</h2>
                </div>

                <div className="space-y-3">
                  {planRows.map(([name, value]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3"
                    >
                      <span className="text-sm text-slate-300">{name}</span>
                      <span className="text-sm font-semibold text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-blue-500/20 bg-slate-900/80 p-4 shadow-lg">
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-white">Details</h2>
                <p className="text-xs text-slate-400">
                  Tap a box to view real records
                </p>
              </div>

              <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                Selected: <span className="font-medium text-white">{selectedLabel}</span>
              </div>

              <div className="max-h-[70vh] space-y-3 overflow-auto pr-1">
                {drilldown.length > 0 ? (
                  drilldown.map((item, index) => (
                    <DetailCard
                      key={item?._id || item?.id || item?.email || item?.invoice_number || index}
                      item={item}
                      type={detailType}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
                    No records returned for this section.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 text-sm text-slate-400">Loading dashboard…</div>
        ) : null}
      </div>
    </div>
  );
}
