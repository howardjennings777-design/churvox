import React, { useEffect, useState } from "react";

export default function AdminUsagePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const backend = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
    const urls = [
      backend ? `${backend}/api/admin/usage-summary` : null,
      "/api/admin/usage-summary",
      backend ? `${backend}/admin/usage-summary` : null,
      "/admin/usage-summary",
    ].filter(Boolean);

    const run = async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url, { credentials: "include",  credentials: "include" }, { credentials: "include" }, { credentials: "include" });
          if (!res.ok) continue;
          const json = await res.json();
          setData(json);
          setLoading(false);
          return;
        } catch (e) {}
      }
      setError("Could not load usage dashboard");
      setLoading(false);
    };

    run();
  }, []);

  const card = (title, value, sub = "") => (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-sm">
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value ?? 0}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );

  if (loading) {
    return <div className="p-6 text-white">Loading usage dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  const plans = data?.plans || {};
  const planEntries = Object.entries(plans);

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Usage Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Simple owner/admin snapshot of app usage and growth
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {card("Total users", data?.users?.total)}
          {card("Worker accounts", data?.users?.workers)}
          {card("Recent signups (7d)", data?.users?.recent_signups_7d)}
          {card("Active users (7d)", data?.users?.active_users_7d, "Uses last_login_at if available")}
          {card("Total businesses", data?.businesses?.total)}
          {card("Active businesses (7d)", data?.businesses?.active_businesses_7d)}
          {card("Clients total", data?.records?.clients_total)}
          {card("Jobs total", data?.records?.jobs_total)}
          {card("Quotes total", data?.records?.quotes_total)}
          {card("Invoices total", data?.records?.invoices_total)}
          {card("Clients added (7d)", data?.records?.clients_7d)}
          {card("Jobs added (7d)", data?.records?.jobs_7d)}
          {card("Quotes added (7d)", data?.records?.quotes_7d)}
          {card("Invoices added (7d)", data?.records?.invoices_7d)}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Plan breakdown</h2>
          {planEntries.length === 0 ? (
            <div className="mt-3 text-slate-400">No plan data found yet.</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {planEntries.map(([name, count]) => (
                <div key={name} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <div className="text-sm capitalize text-slate-400">{name}</div>
                  <div className="mt-2 text-2xl font-bold">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-slate-500">
          Generated at: {data?.generated_at || "unknown"}
        </div>
      </div>
    </div>
  );
}
