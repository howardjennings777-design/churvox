import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "";

const cardStyle =
  "bg-white rounded-2xl shadow-sm border border-slate-200 p-4 min-h-[120px]";
const btnStyle =
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-slate-300 bg-white hover:bg-slate-50 active:scale-[0.99]";

export default function AppOwnerPage() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState("Checking...");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBusinesses: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    totalJobs: 0,
    totalInvoices: 0,
    monthlyRevenue: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [error, setError] = useState("");

  const api = useMemo(() => {
    if (!API_BASE) return "";
    return API_BASE.replace(/\/$/, "");
  }, []);

  useEffect(() => {
    let mounted = true;

    async function safeJson(url, fallback) {
      try {
        const res = await fetch(url, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch {
        return fallback;
      }
    }

    async function load() {
      try {
        setLoading(true);
        setError("");

        const healthData = await safeJson(
          `${api}/api/health`,
          await safeJson(`${api}/health`, { status: "offline" })
        );

        const statsData = await safeJson(
          `${api}/api/admin/platform/stats`,
          await safeJson(`${api}/api/platform/stats`, {})
        );

        const usersData = await safeJson(
          `${api}/api/admin/platform/users?limit=8`,
          await safeJson(`${api}/api/platform/users?limit=8`, [])
        );

        if (!mounted) return;

        setHealth(
          healthData?.status ||
            healthData?.message ||
            (healthData ? "online" : "offline")
        );

        setStats({
          totalUsers:
            statsData?.totalUsers ??
            statsData?.users ??
            statsData?.total_users ??
            0,
          totalBusinesses:
            statsData?.totalBusinesses ??
            statsData?.businesses ??
            statsData?.total_businesses ??
            0,
          activeSubscriptions:
            statsData?.activeSubscriptions ??
            statsData?.active_subscriptions ??
            statsData?.subscriptions ??
            0,
          trialUsers:
            statsData?.trialUsers ??
            statsData?.trial_users ??
            0,
          totalJobs:
            statsData?.totalJobs ??
            statsData?.jobs ??
            statsData?.total_jobs ??
            0,
          totalInvoices:
            statsData?.totalInvoices ??
            statsData?.invoices ??
            statsData?.total_invoices ??
            0,
          monthlyRevenue:
            statsData?.monthlyRevenue ??
            statsData?.monthly_revenue ??
            statsData?.revenue ??
            0,
        });

        setRecentUsers(Array.isArray(usersData) ? usersData : usersData?.users || []);
      } catch (e) {
        if (!mounted) return;
        setError("Could not load owner data yet.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [api]);

  const cards = [
    { label: "Total Users", value: stats.totalUsers },
    { label: "Businesses", value: stats.totalBusinesses },
    { label: "Active Plans", value: stats.activeSubscriptions },
    { label: "Trial Users", value: stats.trialUsers },
    { label: "Jobs", value: stats.totalJobs },
    { label: "Invoices", value: stats.totalInvoices },
    { label: "Monthly Revenue", value: `$${stats.monthlyRevenue || 0}` },
    { label: "Backend Health", value: String(health) },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">App Owner Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">
              Fresh owner page for platform view and quick checks.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard" className={btnStyle}>User Dashboard</Link>
            <Link to="/jobs" className={btnStyle}>Jobs</Link>
            <Link to="/plans" className={btnStyle}>Plans</Link>
            <button
              onClick={() => window.location.reload()}
              className={`${btnStyle} border-slate-900 bg-slate-900 text-white hover:bg-slate-800`}
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {cards.map((card) => (
            <div key={card.label} className={cardStyle}>
              <div className="text-sm text-slate-500">{card.label}</div>
              <div className="mt-3 text-2xl font-bold break-words">
                {loading ? "..." : card.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Users</h2>
              <span className="text-xs text-slate-500">Latest 8</span>
            </div>

            {loading ? (
              <div className="text-sm text-slate-500">Loading users...</div>
            ) : recentUsers.length === 0 ? (
              <div className="text-sm text-slate-500">No users returned yet.</div>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user, index) => (
                  <div
                    key={user._id || user.id || user.email || index}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="font-semibold text-sm">
                      {user.full_name || user.name || "Unnamed user"}
                    </div>
                    <div className="text-sm text-slate-600 break-all">
                      {user.email || "No email"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Role: {user.role || "user"} {user.is_owner ? "• owner" : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>

            <div className="grid grid-cols-1 gap-3">
              <Link to="/clients" className={btnStyle}>Open Clients</Link>
              <Link to="/settings" className={btnStyle}>Open Settings</Link>
              <Link to="/plans" className={btnStyle}>Open Plans</Link>
              <a href="/owner" className={btnStyle}>Reload Owner Page</a>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-sm font-semibold mb-1">Note</div>
              <div className="text-xs text-slate-600">
                This is a clean new owner page. If platform stats endpoints do not
                exist yet, the page still loads and stays usable.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
