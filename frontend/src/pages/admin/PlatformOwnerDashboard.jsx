import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Building2,
  Activity,
  DollarSign,
  UserPlus,
  CreditCard,
  AlertTriangle,
  BarChart3,
  Briefcase,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || "https://grassley-backend.onrender.com").replace(/\/$/, "");

const money = (value) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(n);
};

export default function PlatformOwnerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get(`${API_BASE}/api/admin/platform-stats`, {
          withCredentials: true,
        });
        if (mounted) setData(res.data || {});
      } catch (err) {
        if (mounted) {
          setError(
            err?.response?.data?.detail ||
            err?.message ||
            "Failed to load platform stats"
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => {
    const d = data || {};
    return [
      {
        title: "Total Users",
        value: d.totalUsers ?? 0,
        change: `${d.newSignupsThisWeek ?? 0} new this week`,
        icon: <Users size={20} />,
        onClick: () => navigate("/owner/usage"),
      },
      {
        title: "Total Businesses",
        value: d.totalBusinesses ?? 0,
        change: "Live total",
        icon: <Building2 size={20} />,
        onClick: () => navigate("/owner/usage"),
      },
      {
        title: "Active Today",
        value: d.activeToday ?? 0,
        change: `${d.activeThisWeek ?? 0} active this week`,
        icon: <Activity size={20} />,
        onClick: () => navigate("/owner/usage"),
      },
      {
        title: "Monthly Revenue",
        value: money(d.monthlyRevenue ?? 0),
        change: "Paid invoices this month",
        icon: <DollarSign size={20} />,
        onClick: () => navigate("/invoices"),
      },
      {
        title: "Trial Users",
        value: d.trialUsers ?? 0,
        change: "On trial now",
        icon: <UserPlus size={20} />,
        onClick: () => navigate("/owner/usage"),
      },
      {
        title: "Paid Users",
        value: d.paidUsers ?? 0,
        change: `${d.cancelledUsers ?? 0} cancelled/expired`,
        icon: <CreditCard size={20} />,
        onClick: () => navigate("/owner/usage"),
      },
    ];
  }, [data, navigate]);

  const topPlans = useMemo(() => Object.entries(data?.topPlans || {}), [data]);

  const openUsage = () => navigate("/owner/usage");
  const openInvoices = () => navigate("/invoices");
  const openJobs = () => navigate("/jobs");

  const ClickCard = ({ children, onClick, className = "" }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition hover:border-blue-500/60 hover:bg-slate-900/95 active:scale-[0.99] ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Platform Dashboard</h1>
            <p className="text-slate-400 mt-1">Full app overview for Churvox owner/admin</p>
          </div>

          <button
            type="button"
            onClick={openUsage}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white hover:border-blue-500/60"
          >
            Open full usage view
            <ArrowRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-300">
            Loading platform stats...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-800 bg-red-950/40 p-5 text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <ClickCard key={stat.title} onClick={stat.onClick}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-slate-400 text-sm">{stat.title}</div>
                <div className="text-blue-400">{stat.icon}</div>
              </div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-500">{stat.change}</div>
                <ArrowRight size={16} className="text-slate-500" />
              </div>
            </ClickCard>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ClickCard onClick={openUsage}>
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <TrendingUp size={18} />
                  <span className="font-medium">New Signups</span>
                </div>
                <div className="text-2xl font-bold">{data?.newSignupsThisWeek ?? 0}</div>
                <div className="text-sm text-slate-500 mt-1 flex items-center justify-between">
                  <span>This week</span>
                  <ArrowRight size={16} />
                </div>
              </ClickCard>

              <ClickCard onClick={openInvoices}>
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <BarChart3 size={18} />
                  <span className="font-medium">Outstanding Balance</span>
                </div>
                <div className="text-2xl font-bold">{money(data?.outstandingBalance ?? 0)}</div>
                <div className="text-sm text-slate-500 mt-1 flex items-center justify-between">
                  <span>Unpaid invoices</span>
                  <ArrowRight size={16} />
                </div>
              </ClickCard>

              <ClickCard onClick={openJobs}>
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <Briefcase size={18} />
                  <span className="font-medium">Jobs Today</span>
                </div>
                <div className="text-2xl font-bold">{data?.jobsToday ?? 0}</div>
                <div className="text-sm text-slate-500 mt-1 flex items-center justify-between">
                  <span>Across all businesses</span>
                  <ArrowRight size={16} />
                </div>
              </ClickCard>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Plans In Use</h2>
                <button
                  type="button"
                  onClick={openUsage}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Open usage
                </button>
              </div>

              <div className="space-y-3">
                {topPlans.length === 0 ? (
                  <div className="rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 text-slate-300">
                    No plan data yet
                  </div>
                ) : (
                  topPlans.map(([plan, count]) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={openUsage}
                      className="w-full rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 flex items-center justify-between text-left hover:border-blue-500/60"
                    >
                      <span className="capitalize text-slate-200">{plan}</span>
                      <span className="font-semibold">{count}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Recent Platform Snapshot</h2>
                <button
                  type="button"
                  onClick={openUsage}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Open usage
                </button>
              </div>

              <div className="space-y-3">
                <button type="button" onClick={openUsage} className="w-full rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 text-left text-slate-300 hover:border-blue-500/60">
                  {data?.activeToday ?? 0} users active today
                </button>
                <button type="button" onClick={openUsage} className="w-full rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 text-left text-slate-300 hover:border-blue-500/60">
                  {data?.activeThisWeek ?? 0} users active this week
                </button>
                <button type="button" onClick={openInvoices} className="w-full rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 text-left text-slate-300 hover:border-blue-500/60">
                  {data?.overdueInvoices ?? 0} overdue invoices across the platform
                </button>
                <button type="button" onClick={openUsage} className="w-full rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 text-left text-slate-300 hover:border-blue-500/60">
                  {data?.trialUsers ?? 0} users currently on trial
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-amber-400" size={18} />
                <h2 className="text-xl font-semibold">Platform Alerts</h2>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <button type="button" onClick={openInvoices} className="w-full p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-left hover:border-blue-500/60">
                  {data?.overdueInvoices ?? 0} overdue invoices need attention
                </button>
                <button type="button" onClick={openUsage} className="w-full p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-left hover:border-blue-500/60">
                  {data?.cancelledUsers ?? 0} cancelled or expired accounts
                </button>
                <button type="button" onClick={openUsage} className="w-full p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-left hover:border-blue-500/60">
                  {data?.trialUsers ?? 0} trial users currently active
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold mb-4">Quick Numbers</h2>
              <div className="grid grid-cols-1 gap-3">
                <button type="button" onClick={openInvoices} className="rounded-xl bg-slate-800 px-4 py-3 border border-slate-700 text-left hover:border-blue-500/60">
                  Outstanding: {money(data?.outstandingBalance ?? 0)}
                </button>
                <button type="button" onClick={openInvoices} className="rounded-xl bg-slate-800 px-4 py-3 border border-slate-700 text-left hover:border-blue-500/60">
                  Monthly Revenue: {money(data?.monthlyRevenue ?? 0)}
                </button>
                <button type="button" onClick={openUsage} className="rounded-xl bg-slate-800 px-4 py-3 border border-slate-700 text-left hover:border-blue-500/60">
                  Businesses: {data?.totalBusinesses ?? 0}
                </button>
                <button type="button" onClick={openUsage} className="rounded-xl bg-slate-800 px-4 py-3 border border-slate-700 text-left hover:border-blue-500/60">
                  Users: {data?.totalUsers ?? 0}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
