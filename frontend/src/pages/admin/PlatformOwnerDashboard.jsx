import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Building2, Activity, DollarSign, UserPlus, CreditCard, Briefcase, AlertTriangle, ArrowRight } from "lucide-react";
import axios from "axios";

axios.defaults.withCredentials = true;

const API_URL = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || "https://grassley-backend.onrender.com").replace(/\/$/, "");

const cardBase =
  "w-full rounded-2xl border border-slate-700/60 bg-slate-800/80 p-5 text-left shadow-lg transition hover:border-cyan-400/50 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400";

const sectionMap = {
  users: "users",
  businesses: "businesses",
  activity: "activity",
  revenue: "revenue",
  trials: "users",
  paid: "users",
  signups: "users",
  outstanding: "revenue",
  jobs: "activity",
};

function money(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(n);
}

function num(value) {
  return Number(value || 0).toLocaleString("en-NZ");
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function PlatformOwnerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`${API_URL}/api/admin/usage-summary`, {
          headers: getAuthHeaders(),
          withCredentials: true,
        });
        if (mounted) setData(res.data || {});
      } catch (err) {
        console.error("Owner dashboard load failed:", err);
        if (mounted) setError("Could not load usage dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const users = data?.users || {};
    const businesses = data?.businesses || {};
    const billing = data?.billing || {};
    const ops = data?.operations || {};
    const plans = data?.plans_in_use || data?.plans || {};

    const totalUsers = users.total ?? data?.totalUsers ?? 0;
    const newUsers7d = users.new_users_7d ?? users.new_this_week ?? data?.newUsersThisWeek ?? 0;
    const activeUsers7d = users.active_users_7d ?? data?.activeToday ?? 0;

    const totalBusinesses = businesses.total ?? data?.totalBusinesses ?? 0;
    const activeBusinesses7d = businesses.active_businesses_7d ?? 0;

    const trialUsers = billing.trial_users ?? data?.trialUsers ?? 0;
    const paidUsers = billing.paid_users ?? data?.paidUsers ?? 0;
    const cancelledUsers = billing.cancelled_or_expired ?? 0;

    const monthlyRevenue = billing.monthly_revenue ?? data?.monthlyRevenue ?? 0;
    const outstandingBalance = billing.outstanding_balance ?? data?.outstandingBalance ?? 0;
    const overdueInvoices = billing.overdue_invoices ?? 0;

    const jobsToday = ops.jobs_today ?? data?.jobsToday ?? 0;

    return {
      totalUsers,
      newUsers7d,
      activeUsers7d,
      totalBusinesses,
      activeBusinesses7d,
      trialUsers,
      paidUsers,
      cancelledUsers,
      monthlyRevenue,
      outstandingBalance,
      overdueInvoices,
      jobsToday,
      plans,
    };
  }, [data]);

  const openSection = (key) => {
    navigate(`/admin/usage?section=${sectionMap[key] || "overview"}`);
  };

  const statCards = [
    {
      key: "users",
      title: "Total Users",
      value: num(stats.totalUsers),
      sub: `${num(stats.newUsers7d)} new this week`,
      icon: Users,
    },
    {
      key: "businesses",
      title: "Total Businesses",
      value: num(stats.totalBusinesses),
      sub: `${num(stats.activeBusinesses7d)} active this week`,
      icon: Building2,
    },
    {
      key: "activity",
      title: "Active Today",
      value: num(stats.activeUsers7d),
      sub: `${num(stats.activeUsers7d)} active this week`,
      icon: Activity,
    },
    {
      key: "revenue",
      title: "Monthly Revenue",
      value: money(stats.monthlyRevenue),
      sub: "Paid invoices this month",
      icon: DollarSign,
    },
    {
      key: "trials",
      title: "Trial Users",
      value: num(stats.trialUsers),
      sub: "On trial now",
      icon: UserPlus,
    },
    {
      key: "paid",
      title: "Paid Users",
      value: num(stats.paidUsers),
      sub: `${num(stats.cancelledUsers)} cancelled/expired`,
      icon: CreditCard,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">Loading platform dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-500/40 bg-slate-900 p-6 text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Platform Dashboard</h1>
            <p className="text-slate-300">Full app overview for Churvox owner/admin</p>
          </div>

          <button
            onClick={() => navigate("/admin/usage")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-400/50 hover:bg-slate-700"
          >
            Open full usage view
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <button key={card.key} onClick={() => openSection(card.key)} className={cardBase}>
                <div className="mb-4 flex items-start justify-between">
                  <div className="text-sm text-slate-300">{card.title}</div>
                  <Icon size={18} className="text-cyan-400" />
                </div>
                <div className="text-4xl font-bold">{card.value}</div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                  <span>{card.sub}</span>
                  <ArrowRight size={16} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <button onClick={() => openSection("signups")} className={`${cardBase} xl:col-span-1`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">New Signups</span>
              <ArrowRight size={16} />
            </div>
            <div className="text-3xl font-bold">{num(stats.newUsers7d)}</div>
            <div className="mt-1 text-sm text-slate-300">This week</div>
          </button>

          <button onClick={() => openSection("outstanding")} className={`${cardBase} xl:col-span-1`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">Outstanding Balance</span>
              <ArrowRight size={16} />
            </div>
            <div className="text-3xl font-bold">{money(stats.outstandingBalance)}</div>
            <div className="mt-1 text-sm text-slate-300">Unpaid invoices</div>
          </button>

          <button onClick={() => openSection("jobs")} className={`${cardBase} xl:col-span-1`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">Jobs Today</span>
              <ArrowRight size={16} />
            </div>
            <div className="text-3xl font-bold">{num(stats.jobsToday)}</div>
            <div className="mt-1 text-sm text-slate-300">Across all businesses</div>
          </button>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-5 shadow-lg xl:col-span-1">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle size={18} className="text-yellow-400" />
              Platform Alerts
            </div>
            <div className="space-y-2 text-sm text-slate-200">
              <div className="rounded-xl bg-slate-700/40 px-3 py-2">{num(stats.overdueInvoices)} overdue invoices need attention</div>
              <div className="rounded-xl bg-slate-700/40 px-3 py-2">{num(stats.cancelledUsers)} cancelled or expired accounts</div>
              <div className="rounded-xl bg-slate-700/40 px-3 py-2">{num(stats.trialUsers)} trial users currently active</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-5 shadow-lg xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Plans In Use</h2>
              <button onClick={() => navigate("/admin/usage?section=plans")} className="text-sm text-cyan-300 hover:text-cyan-200">
                Open usage
              </button>
            </div>

            <div className="space-y-3">
              {Object.keys(stats.plans || {}).length === 0 ? (
                <div className="rounded-xl bg-slate-700/30 px-4 py-3 text-sm text-slate-300">No plan data found yet</div>
              ) : (
                Object.entries(stats.plans).map(([plan, count]) => (
                  <button
                    key={plan}
                    onClick={() => navigate(`/admin/usage?section=plans&plan=${encodeURIComponent(plan)}`)}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-700/30 px-4 py-3 text-left transition hover:bg-slate-700/50"
                  >
                    <span className="capitalize">{String(plan).replace(/_/g, " ")}</span>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-sm">{num(count)}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-5 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">Quick Numbers</h2>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-slate-700/30 px-4 py-3">Outstanding: {money(stats.outstandingBalance)}</div>
              <div className="rounded-xl bg-slate-700/30 px-4 py-3">Monthly Revenue: {money(stats.monthlyRevenue)}</div>
              <div className="rounded-xl bg-slate-700/30 px-4 py-3">Paid Users: {num(stats.paidUsers)}</div>
              <div className="rounded-xl bg-slate-700/30 px-4 py-3">Businesses: {num(stats.totalBusinesses)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
