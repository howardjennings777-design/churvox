import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { confirmDialog } from "../lib/confirmDialog";
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
  Trash2,
} from "lucide-react";

const API_BASE = (
  (typeof import.meta !== "undefined" &&
    process.env &&
    (process.env.VITE_BACKEND_URL || process.env.VITE_API_URL)) ||
  (typeof process !== "undefined" &&
    process.env &&
    (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL)) ||
  ""
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function textOf(item) {
  return [
    item?.name,
    item?.full_name,
    item?.first_name,
    item?.last_name,
    item?.business_name,
    item?.company,
    item?.title,
    item?.email,
    item?.owner_email,
    item?.client_name,
    item?.phone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isFakeRecord(item) {
  const t = textOf(item);

  const protectedRealEmails = [
    "hello@churvox.com",
    "howardjennings77@gmail.com",
    "howardjennings77@outlook.com",
  ];

  if (protectedRealEmails.some((email) => t.includes(email))) return false;

  const fakeMarkers = [
    "test",
    "demo",
    "sample",
    "fake",
    "mock",
    "preview",
    "seed",
    "john worker",
    "john worier",
    "test user",
    "demo user",
    "sample user",
    "fake user",
    "john@churvox.co",
    "john@churvox.com",
    "johnworker@churvox.com",
    "test@churvox.com",
    "demo@churvox.com",
    "sample@churvox.com",
    "example.com",
    "mailinator",
    "tempmail",
  ];

  return fakeMarkers.some((marker) => t.includes(marker));
}

function filterFake(list) {
  return asArray(list).filter((item) => !isFakeRecord(item));
}

function countPlansFromUsers(users) {
  const counts = { solo: 0, team: 0, pro: 0, enterprise: 0 };

  users.forEach((user) => {
    const rawPlan = String(user?.plan || user?.subscription_plan || "").toLowerCase().trim();
    if (rawPlan === "solo") counts.solo += 1;
    else if (rawPlan === "team") counts.team += 1;
    else if (rawPlan === "pro") counts.pro += 1;
    else if (rawPlan === "enterprise") counts.enterprise += 1;
  });

  return counts;
}

function normalizeStats(raw) {
  const src = raw || {};

  const users_list = filterFake(src.users_list || []);
  const businesses_list = filterFake(src.businesses_list || []);
  const invoices_list = filterFake(src.invoices_list || []);
  const jobs_list = filterFake(src.jobs_list || []);
  const paid_users_list = filterFake(src.paid_users_list || []);
  const active_today_list = filterFake(src.active_today_list || []);

  const plans = src.plan_counts || {};
  const filteredPlanCounts = users_list.length > 0 ? countPlansFromUsers(users_list) : plans;

  return {
    total_users: users_list.length || num(src.total_users),
    total_businesses: businesses_list.length || num(src.total_businesses),
    active_today: active_today_list.length || num(src.active_today),
    paid_users: paid_users_list.length || num(src.paid_users),
    total_invoices: invoices_list.length || num(src.total_invoices),
    total_jobs: jobs_list.length || num(src.total_jobs),
    monthly_revenue: num(src.monthly_revenue),
    outstanding_balance: num(src.outstanding_balance),
    plan_counts: filteredPlanCounts,
    users_list,
    businesses_list,
    active_today_list,
    paid_users_list,
    invoices_list,
    jobs_list,
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

function DetailCard({ item, type, onDelete, deleting }) {
  const itemId = item?._id || item?.id;
  const isDeleting = deleting === itemId;

  if (type === "user" || type === "paid_user" || type === "active_user") {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-white">{recordTitle(item)}</div>
          {onDelete && itemId && (
            <button
              type="button"
              onClick={() => onDelete(itemId)}
              disabled={isDeleting}
              className="shrink-0 rounded-lg border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              data-testid={`delete-user-${itemId}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-white">{recordTitle(item)}</div>
          {onDelete && itemId && (
            <button
              type="button"
              onClick={() => onDelete(itemId)}
              disabled={isDeleting}
              className="shrink-0 rounded-lg border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              data-testid={`delete-business-${itemId}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
  const [lastUpdated, setLastUpdated] = useState(null);
  const [deleting, setDeleting] = useState("");
  const pollRef = useRef(null);

  const tryEndpoint = useCallback(async (path) => {
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
  }, []);

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const data = await tryEndpoint("/api/admin/platform-stats");
      setStats(normalizeStats(data));
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Owner dashboard load failed:", err);
      if (!silent) {
        setStats(EMPTY_STATS);
        setError("Could not load live platform data. " + (err?.message || ""));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tryEndpoint]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    pollRef.current = setInterval(() => loadDashboard(true), 30000);
    return () => clearInterval(pollRef.current);
  }, [loadDashboard]);

  const handleDeleteUser = async (userId) => {
    if (!userId) return;
    const confirmed = await confirmDialog({
      title: "Delete this user account?",
      message: "This cannot be undone. The user will no longer be able to log in.",
      danger: true,
      confirmLabel: "Delete user",
    });
    if (!confirmed) return;

    setDeleting(userId);
    try {
      const token = window.localStorage?.getItem("token") || "";
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        toast.success("User deleted");
        await loadDashboard(true);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.detail || "Failed to delete user");
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeleting("");
    }
  };

  const timeAgo = (date) => {
    if (!date) return "";
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 10) return "just now";
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 10000);
    return () => clearInterval(t);
  }, []);

  const detailType = getDetailType(selected);

  const drilldown = useMemo(() => {
    if (!stats || !selected) return [];
    const value = stats[selected];
    return Array.isArray(value) ? value : [];
  }, [stats, selected]);

  const cards = [
    { key: "users_list", label: "Total Users", value: stats.total_users, icon: Users },
    { key: "businesses_list", label: "Total Businesses", value: stats.total_businesses, icon: Building2 },
    { key: "active_today_list", label: "Active Today", value: stats.active_today, icon: Activity },
    { key: "paid_users_list", label: "Paid Users", value: stats.paid_users, icon: CreditCard },
    { key: "invoices_list", label: "Total Invoices", value: stats.total_invoices, icon: FileText },
    { key: "jobs_list", label: "Total Jobs", value: stats.total_jobs, icon: Briefcase },
    { key: "invoices_list", label: "Monthly Revenue", value: money(stats.monthly_revenue), icon: DollarSign },
    { key: "invoices_list", label: "Outstanding Balance", value: money(stats.outstanding_balance), icon: AlertTriangle },
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
            <p className="text-sm text-slate-400">
              Live data
              {lastUpdated ? (
                <span className="ml-2 text-cyan-400">Updated {timeAgo(lastUpdated)}</span>
              ) : null}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadDashboard(false)}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-slate-900/80 px-4 py-3 text-sm font-medium text-white hover:border-blue-400/60"
            data-testid="refresh-stats-button"
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
                <p className="text-xs text-slate-400">Tap a box to view real records</p>
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
                      onDelete={detailType === "user" || detailType === "paid_user" || detailType === "active_user" || detailType === "business" ? handleDeleteUser : undefined}
                      deleting={deleting}
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

        {loading ? <div className="mt-6 text-sm text-slate-400">Loading dashboard…</div> : null}
      </div>
    </div>
  );
}
