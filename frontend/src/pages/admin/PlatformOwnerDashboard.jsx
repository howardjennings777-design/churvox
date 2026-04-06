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
} from "lucide-react";
import axios from "axios";

const API_BASE = "https://grassley-backend.onrender.com";

const money = (value) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(n);
};

export default function PlatformOwnerDashboard() {
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
      },
      {
        title: "Total Businesses",
        value: d.totalBusinesses ?? 0,
        change: "Live total",
        icon: <Building2 size={20} />,
      },
      {
        title: "Active Today",
        value: d.activeToday ?? 0,
        change: `${d.activeThisWeek ?? 0} active this week`,
        icon: <Activity size={20} />,
      },
      {
        title: "Monthly Revenue",
        value: money(d.monthlyRevenue ?? 0),
        change: "Paid invoices this month",
        icon: <DollarSign size={20} />,
      },
      {
        title: "Trial Users",
        value: d.trialUsers ?? 0,
        change: "On trial now",
        icon: <UserPlus size={20} />,
      },
      {
        title: "Paid Users",
        value: d.paidUsers ?? 0,
        change: `${d.cancelledUsers ?? 0} cancelled/expired`,
        icon: <CreditCard size={20} />,
      },
    ];
  }, [data]);

  const topPlans = useMemo(() => Object.entries(data?.topPlans || {}), [data]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Platform Dashboard</h1>
            <p className="text-slate-400 mt-1">Full app overview for Churvox owner/admin</p>
          </div>
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
            <div key={stat.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="text-slate-400 text-sm">{stat.title}</div>
                <div className="text-blue-400">{stat.icon}</div>
              </div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm text-slate-500 mt-2">{stat.change}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <TrendingUp size={18} />
                  <span className="font-medium">New Signups</span>
                </div>
                <div className="text-2xl font-bold">{data?.newSignupsThisWeek ?? 0}</div>
                <div className="text-sm text-slate-500 mt-1">This week</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <BarChart3 size={18} />
                  <span className="font-medium">Outstanding Balance</span>
                </div>
                <div className="text-2xl font-bold">{money(data?.outstandingBalance ?? 0)}</div>
                <div className="text-sm text-slate-500 mt-1">Unpaid invoices</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <Briefcase size={18} />
                  <span className="font-medium">Jobs Today</span>
                </div>
                <div className="text-2xl font-bold">{data?.jobsToday ?? 0}</div>
                <div className="text-sm text-slate-500 mt-1">Across all businesses</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold mb-4">Plans In Use</h2>
              <div className="space-y-3">
                {topPlans.length === 0 ? (
                  <div className="rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 text-slate-300">
                    No plan data yet
                  </div>
                ) : (
                  topPlans.map(([plan, count]) => (
                    <div key={plan} className="rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 flex items-center justify-between">
                      <span className="capitalize text-slate-200">{plan}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold mb-4">Recent Platform Snapshot</h2>
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 text-slate-300">
                  {data?.activeToday ?? 0} users active today
                </div>
                <div className="rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 text-slate-300">
                  {data?.activeThisWeek ?? 0} users active this week
                </div>
                <div className="rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 text-slate-300">
                  {data?.overdueInvoices ?? 0} overdue invoices across the platform
                </div>
                <div className="rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 text-slate-300">
                  {data?.trialUsers ?? 0} users currently on trial
                </div>
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
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  {data?.overdueInvoices ?? 0} overdue invoices need attention
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  {data?.cancelledUsers ?? 0} cancelled or expired accounts
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  {data?.trialUsers ?? 0} trial users currently active
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold mb-4">Quick Numbers</h2>
              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-xl bg-slate-800 px-4 py-3 border border-slate-700">
                  Outstanding: {money(data?.outstandingBalance ?? 0)}
                </div>
                <div className="rounded-xl bg-slate-800 px-4 py-3 border border-slate-700">
                  Monthly Revenue: {money(data?.monthlyRevenue ?? 0)}
                </div>
                <div className="rounded-xl bg-slate-800 px-4 py-3 border border-slate-700">
                  Businesses: {data?.totalBusinesses ?? 0}
                </div>
                <div className="rounded-xl bg-slate-800 px-4 py-3 border border-slate-700">
                  Users: {data?.totalUsers ?? 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
