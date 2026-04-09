import React, { useEffect, useMemo, useState } from "react";

const backendBase =
  (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL)) ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_URL ||
    "https://grassley-backend.onrender.com"
  ).replace(/\/$/, "");

function StatCard({ title, value, subtitle, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 transition ${
        active
          ? "border-cyan-400 bg-slate-800/95"
          : "border-slate-700 bg-slate-900/70 hover:bg-slate-800/90"
      }`}
    >
      <div className="text-sm text-slate-300">{title}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
    </button>
  );
}

function prettyMoney(value) {
  const num = Number(value || 0);
  return `$${num.toLocaleString()}`;
}

export default function AdminUsagePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState("overview");

  useEffect(() => {
    let ignore = false;

    async function loadStats() {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");
        const url = `${backendBase}/api/admin/platform-stats`;

        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        const raw = await res.text();
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = {};
        }

        if (!res.ok) {
          throw new Error(data.detail || data.message || `Request failed (${res.status})`);
        }

        if (!ignore) {
          setStats(data || {});
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Could not load usage dashboard");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadStats();
    return () => {
      ignore = true;
    };
  }, []);

  const normalized = useMemo(() => {
    const s = stats || {};
    return {
      totalUsers: Number(s.totalUsers ?? s.total_users ?? 0),
      totalBusinesses: Number(s.totalBusinesses ?? s.total_businesses ?? 0),
      activeToday: Number(s.activeToday ?? s.active_today ?? 0),
      monthlyRevenue: Number(s.monthlyRevenue ?? s.monthly_revenue ?? 0),
      trialUsers: Number(s.trialUsers ?? s.trial_users ?? 0),
      paidUsers: Number(s.paidUsers ?? s.paid_users ?? 0),
      totalPlans: Number(s.totalPlans ?? s.total_plans ?? 0),
      outstandingBalance: Number(s.outstandingBalance ?? s.outstanding_balance ?? 0),
      planBreakdown: s.planBreakdown ?? s.plan_breakdown ?? {},
      alerts: Array.isArray(s.alerts) ? s.alerts : [],
      recentBusinesses: Array.isArray(s.recentBusinesses) ? s.recentBusinesses : [],
      recentUsers: Array.isArray(s.recentUsers) ? s.recentUsers : []
    };
  }, [stats]);

  const detailTitle = {
    overview: "Overview",
    users: "Users",
    businesses: "Businesses",
    revenue: "Revenue",
    plans: "Plans",
    alerts: "Alerts"
  }[selected];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Platform Usage</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real platform stats with clickable panels.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-slate-300">
            Loading platform stats...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-800 bg-red-950/40 p-6 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Users"
                value={normalized.totalUsers}
                subtitle={`${normalized.paidUsers} paid users`}
                active={selected === "users"}
                onClick={() => setSelected("users")}
              />
              <StatCard
                title="Total Businesses"
                value={normalized.totalBusinesses}
                subtitle={`${normalized.trialUsers} trial users`}
                active={selected === "businesses"}
                onClick={() => setSelected("businesses")}
              />
              <StatCard
                title="Active Today"
                value={normalized.activeToday}
                subtitle="Across all businesses"
                active={selected === "overview"}
                onClick={() => setSelected("overview")}
              />
              <StatCard
                title="Monthly Revenue"
                value={prettyMoney(normalized.monthlyRevenue)}
                subtitle={`Outstanding ${prettyMoney(normalized.outstandingBalance)}`}
                active={selected === "revenue"}
                onClick={() => setSelected("revenue")}
              />
              <StatCard
                title="Paid Users"
                value={normalized.paidUsers}
                subtitle="Active subscriptions"
                active={selected === "users"}
                onClick={() => setSelected("users")}
              />
              <StatCard
                title="Trial Users"
                value={normalized.trialUsers}
                subtitle="Free / trial accounts"
                active={selected === "businesses"}
                onClick={() => setSelected("businesses")}
              />
              <StatCard
                title="Plans"
                value={normalized.totalPlans}
                subtitle="Tracked plans"
                active={selected === "plans"}
                onClick={() => setSelected("plans")}
              />
              <StatCard
                title="Alerts"
                value={normalized.alerts.length}
                subtitle="Items needing attention"
                active={selected === "alerts"}
                onClick={() => setSelected("alerts")}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{detailTitle}</h2>
                <div className="text-xs text-slate-400">
                  Click any stat card above to switch detail view
                </div>
              </div>

              {selected === "overview" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-800/70 p-4">
                    <div className="text-sm text-slate-400">Users snapshot</div>
                    <div className="mt-2 text-slate-200">
                      {normalized.totalUsers} total users, {normalized.paidUsers} paid, {normalized.trialUsers} on trial.
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-800/70 p-4">
                    <div className="text-sm text-slate-400">Business activity</div>
                    <div className="mt-2 text-slate-200">
                      {normalized.totalBusinesses} businesses, {normalized.activeToday} active today.
                    </div>
                  </div>
                </div>
              )}

              {selected === "users" && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-800/70 p-4">
                    <div className="text-sm text-slate-400">User totals</div>
                    <div className="mt-2 text-slate-200">
                      Total: {normalized.totalUsers} | Paid: {normalized.paidUsers} | Trial: {normalized.trialUsers}
                    </div>
                  </div>

                  {normalized.recentUsers.length > 0 ? (
                    <div className="space-y-2">
                      {normalized.recentUsers.map((user, idx) => (
                        <div key={idx} className="rounded-xl bg-slate-800/50 p-3 text-sm text-slate-200">
                          {user.name || user.email || `User ${idx + 1}`}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-800/50 p-3 text-sm text-slate-400">
                      No recent user list returned by the backend yet.
                    </div>
                  )}
                </div>
              )}

              {selected === "businesses" && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-800/70 p-4 text-slate-200">
                    Total businesses: {normalized.totalBusinesses}
                  </div>

                  {normalized.recentBusinesses.length > 0 ? (
                    <div className="space-y-2">
                      {normalized.recentBusinesses.map((biz, idx) => (
                        <div key={idx} className="rounded-xl bg-slate-800/50 p-3 text-sm text-slate-200">
                          {biz.business_name || biz.name || biz.email || `Business ${idx + 1}`}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-800/50 p-3 text-sm text-slate-400">
                      No recent business list returned by the backend yet.
                    </div>
                  )}
                </div>
              )}

              {selected === "revenue" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-800/70 p-4">
                    <div className="text-sm text-slate-400">Monthly Revenue</div>
                    <div className="mt-2 text-2xl font-bold">{prettyMoney(normalized.monthlyRevenue)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-800/70 p-4">
                    <div className="text-sm text-slate-400">Outstanding Balance</div>
                    <div className="mt-2 text-2xl font-bold">{prettyMoney(normalized.outstandingBalance)}</div>
                  </div>
                </div>
              )}

              {selected === "plans" && (
                <div className="space-y-2">
                  {Object.keys(normalized.planBreakdown).length > 0 ? (
                    Object.entries(normalized.planBreakdown).map(([plan, count]) => (
                      <div key={plan} className="flex items-center justify-between rounded-xl bg-slate-800/50 p-3 text-sm">
                        <span className="capitalize text-slate-200">{plan}</span>
                        <span className="font-semibold text-white">{count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-slate-800/50 p-3 text-sm text-slate-400">
                      No plan breakdown returned by the backend yet.
                    </div>
                  )}
                </div>
              )}

              {selected === "alerts" && (
                <div className="space-y-2">
                  {normalized.alerts.length > 0 ? (
                    normalized.alerts.map((alert, idx) => (
                      <div key={idx} className="rounded-xl bg-slate-800/50 p-3 text-sm text-slate-200">
                        {typeof alert === "string" ? alert : JSON.stringify(alert)}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-slate-800/50 p-3 text-sm text-slate-400">
                      No alerts returned by the backend.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
