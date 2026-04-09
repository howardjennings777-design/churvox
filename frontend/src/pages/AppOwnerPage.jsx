import React, { useEffect, useMemo, useState } from "react";
import { Users, Building2, Activity, CreditCard, FileText, Briefcase } from "lucide-react";

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

function StatCard({ label, value, subtext, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-blue-500/20 bg-slate-900/80 p-4 text-left shadow-lg transition hover:border-blue-400/50 hover:bg-slate-800/90 active:scale-[0.99]"
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="text-sm text-slate-300">{label}</div>
        {Icon ? <Icon className="h-5 w-5 text-cyan-400" /> : null}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{subtext}</div>
    </button>
  );
}

export default function AppOwnerPage() {
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState("users");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/api/admin/platform-stats`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`platform-stats ${res.status}: ${text}`);
        }

        const data = await res.json();
        if (alive) setStats(data || {});
      } catch (err) {
        if (alive) {
          console.error("Owner dashboard load failed:", err);
          setError("Could not load usage dashboard");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const cards = useMemo(() => {
    const s = stats || {};
    return [
      {
        key: "users",
        label: "Total Users",
        value: num(s.total_users ?? s.users ?? s.user_count),
        subtext: "All platform users",
        icon: Users,
      },
      {
        key: "businesses",
        label: "Total Businesses",
        value: num(s.total_businesses ?? s.businesses ?? s.business_count),
        subtext: "Accounts created",
        icon: Building2,
      },
      {
        key: "active_today",
        label: "Active Today",
        value: num(s.active_today ?? s.daily_active ?? s.activeUsersToday),
        subtext: "Users active today",
        icon: Activity,
      },
      {
        key: "paid_users",
        label: "Paid Users",
        value: num(s.paid_users ?? s.paidUsers),
        subtext: "Subscribed accounts",
        icon: CreditCard,
      },
      {
        key: "invoices",
        label: "Invoices",
        value: num(s.total_invoices ?? s.invoices ?? s.invoice_count),
        subtext: "Invoices across platform",
        icon: FileText,
      },
      {
        key: "jobs",
        label: "Jobs",
        value: num(s.total_jobs ?? s.jobs ?? s.job_count),
        subtext: "Jobs across platform",
        icon: Briefcase,
      },
    ];
  }, [stats]);

  const revenue =
    stats?.monthly_revenue ??
    stats?.monthlyRevenue ??
    stats?.revenue_monthly ??
    0;

  const selectedItems =
    (stats &&
      (stats[selected] ||
        stats[`${selected}_list`] ||
        stats.drilldown?.[selected] ||
        [])) ||
    [];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Platform Dashboard</h1>
          <p className="mt-1 text-slate-400">Real owner stats and clickable overview</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            Loading dashboard...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-slate-900 p-6 text-red-400">
            {error}
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <StatCard
                  key={card.key}
                  label={card.label}
                  value={card.value}
                  subtext={card.subtext}
                  icon={card.icon}
                  onClick={() => setSelected(card.key)}
                />
              ))}

              <div className="rounded-2xl border border-blue-500/20 bg-slate-900/80 p-4 shadow-lg">
                <div className="text-sm text-slate-300">Monthly Revenue</div>
                <div className="mt-2 text-3xl font-bold text-white">{money(revenue)}</div>
                <div className="mt-1 text-xs text-slate-400">Live total from backend stats</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold capitalize">{selected.replaceAll("_", " ")}</h2>
                <div className="text-sm text-slate-400">
                  {Array.isArray(selectedItems) ? selectedItems.length : 0} items
                </div>
              </div>

              {Array.isArray(selectedItems) && selectedItems.length > 0 ? (
                <div className="space-y-2">
                  {selectedItems.map((item, index) => (
                    <div
                      key={item.id || item._id || index}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200"
                    >
                      <pre className="whitespace-pre-wrap break-words">
{JSON.stringify(item, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-slate-400">
                  No drilldown items returned for this stat yet.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
