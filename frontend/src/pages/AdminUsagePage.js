import React, { useEffect, useMemo, useState } from "react";

const API_BASE =
  ((typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_BACKEND_URL) ||
    "").replace(/\/$/, "");

const money = (value) => {
  const n = Number(value || 0);
  return `$${n.toLocaleString()}`;
};

export default function AdminUsagePage() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState("businesses");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError("");

      const urls = [
        API_BASE ? `${API_BASE}/api/admin/platform-stats` : null,
        "/api/admin/platform-stats",
      ].filter(Boolean);

      try {
        let json = null;
        let lastError = null;

        for (const url of urls) {
          try {
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            json = await res.json();
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!json) throw lastError || new Error("No stats response");

        if (!alive) return;
        setData(json);
      } catch (err) {
        if (!alive) return;
        setError("Could not load usage dashboard");
        console.error("Owner usage load failed:", err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const d = data || {};
    return {
      businesses: {
        label: "Businesses",
        value: d.totalBusinesses ?? d.total_businesses ?? d.businesses ?? 0,
        note: "Total businesses on the platform",
      },
      users: {
        label: "Users",
        value: d.totalUsers ?? d.total_users ?? d.users ?? 0,
        note: "All users across all businesses",
      },
      activeToday: {
        label: "Active Today",
        value: d.activeToday ?? d.active_today ?? 0,
        note: "Users active today",
      },
      trialUsers: {
        label: "Trial Users",
        value: d.trialUsers ?? d.trial_users ?? 0,
        note: "Users currently on trial",
      },
      paidUsers: {
        label: "Paid Users",
        value: d.paidUsers ?? d.paid_users ?? 0,
        note: "Users on paid plans",
      },
      monthlyRevenue: {
        label: "Monthly Revenue",
        value: money(d.monthlyRevenue ?? d.monthly_revenue ?? 0),
        note: "Current monthly recurring revenue estimate",
      },
      outstanding: {
        label: "Outstanding Balance",
        value: money(d.outstandingBalance ?? d.outstanding_balance ?? 0),
        note: "Outstanding invoice balance across businesses",
      },
      jobsThisWeek: {
        label: "Jobs This Week",
        value: d.jobsThisWeek ?? d.jobs_this_week ?? 0,
        note: "Jobs scheduled or created this week",
      },
    };
  }, [data]);

  const selectedMetric = metrics[selected];

  const card = (key) => {
    const item = metrics[key];
    const active = selected === key;

    return (
      <button
        key={key}
        type="button"
        onClick={() => setSelected(key)}
        className={`w-full rounded-2xl border p-4 text-left transition ${
          active
            ? "border-cyan-400 bg-slate-800 shadow-lg"
            : "border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800"
        }`}
      >
        <div className="text-sm text-slate-400">{item.label}</div>
        <div className="mt-2 text-3xl font-bold text-white">{item.value}</div>
        <div className="mt-2 text-xs text-slate-500">{item.note}</div>
      </button>
    );
  };

  if (loading) {
    return <div className="p-6 text-white">Loading usage dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Owner Usage Dashboard</h1>
            <p className="mt-1 text-slate-400">
              Real owner/admin snapshot of app usage and growth
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/owner/dashboard"
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
            >
              Back to Owner Dashboard
            </a>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold hover:bg-cyan-500"
            >
              Reload Stats
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            "businesses",
            "users",
            "activeToday",
            "trialUsers",
            "paidUsers",
            "monthlyRevenue",
            "outstanding",
            "jobsThisWeek",
          ].map(card)}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 lg:col-span-2">
            <div className="text-sm text-slate-400">Selected metric</div>
            <h2 className="mt-2 text-2xl font-bold">{selectedMetric?.label}</h2>
            <div className="mt-3 text-4xl font-extrabold text-cyan-400">
              {selectedMetric?.value}
            </div>
            <p className="mt-4 text-slate-300">{selectedMetric?.note}</p>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
              Click any card above to switch between real platform stats.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <div className="text-sm text-slate-400">Quick summary</div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl bg-slate-950 p-3">
                <span className="text-slate-400">Businesses:</span>{" "}
                <span className="font-semibold text-white">{metrics.businesses.value}</span>
              </div>
              <div className="rounded-xl bg-slate-950 p-3">
                <span className="text-slate-400">Users:</span>{" "}
                <span className="font-semibold text-white">{metrics.users.value}</span>
              </div>
              <div className="rounded-xl bg-slate-950 p-3">
                <span className="text-slate-400">Paid Users:</span>{" "}
                <span className="font-semibold text-white">{metrics.paidUsers.value}</span>
              </div>
              <div className="rounded-xl bg-slate-950 p-3">
                <span className="text-slate-400">Monthly Revenue:</span>{" "}
                <span className="font-semibold text-white">{metrics.monthlyRevenue.value}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
