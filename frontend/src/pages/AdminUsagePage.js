import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

axios.defaults.withCredentials = true;

const API_URL = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || "https://grassley-backend.onrender.com").replace(/\/$/, "");

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

export default function AdminUsagePage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const section = params.get("section") || "overview";
  const plan = params.get("plan") || "";

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
        console.error("Admin usage load failed:", err);
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

  const sections = useMemo(() => {
    const users = data?.users || {};
    const businesses = data?.businesses || {};
    const billing = data?.billing || {};
    const operations = data?.operations || {};
    const plans = data?.plans_in_use || data?.plans || {};

    return {
      overview: [
        ["Total Users", num(users.total ?? 0)],
        ["New Users This Week", num(users.new_users_7d ?? users.new_this_week ?? 0)],
        ["Active Users 7d", num(users.active_users_7d ?? 0)],
        ["Total Businesses", num(businesses.total ?? 0)],
        ["Active Businesses 7d", num(businesses.active_businesses_7d ?? 0)],
        ["Paid Users", num(billing.paid_users ?? 0)],
        ["Trial Users", num(billing.trial_users ?? 0)],
        ["Monthly Revenue", money(billing.monthly_revenue ?? 0)],
        ["Outstanding Balance", money(billing.outstanding_balance ?? 0)],
        ["Overdue Invoices", num(billing.overdue_invoices ?? 0)],
        ["Jobs Today", num(operations.jobs_today ?? 0)],
      ],
      users: [
        ["Total Users", num(users.total ?? 0)],
        ["New Users This Week", num(users.new_users_7d ?? users.new_this_week ?? 0)],
        ["Active Users 7d", num(users.active_users_7d ?? 0)],
        ["Paid Users", num(billing.paid_users ?? 0)],
        ["Trial Users", num(billing.trial_users ?? 0)],
        ["Cancelled/Expired", num(billing.cancelled_or_expired ?? 0)],
      ],
      businesses: [
        ["Total Businesses", num(businesses.total ?? 0)],
        ["Active Businesses 7d", num(businesses.active_businesses_7d ?? 0)],
      ],
      revenue: [
        ["Monthly Revenue", money(billing.monthly_revenue ?? 0)],
        ["Outstanding Balance", money(billing.outstanding_balance ?? 0)],
        ["Overdue Invoices", num(billing.overdue_invoices ?? 0)],
      ],
      activity: [
        ["Active Users 7d", num(users.active_users_7d ?? 0)],
        ["Active Businesses 7d", num(businesses.active_businesses_7d ?? 0)],
        ["Jobs Today", num(operations.jobs_today ?? 0)],
      ],
      plans: Object.entries(plans)
        .filter(([name]) => !plan || String(name).toLowerCase() === plan.toLowerCase())
        .map(([name, count]) => [String(name).replace(/_/g, " "), num(count)]),
    };
  }, [data, plan]);

  const rows = sections[section] || sections.overview;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Usage</h1>
          <p className="text-slate-300">Section: {section}{plan ? ` / ${plan}` : ""}</p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">Loading usage data...</div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-slate-900 p-6 text-red-400">{error}</div>
        )}

        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-200">Metric</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-200">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="px-4 py-4 text-slate-300">No data found for this section.</td>
                  </tr>
                ) : (
                  rows.map(([label, value]) => (
                    <tr key={label} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-300">{label}</td>
                      <td className="px-4 py-3 font-medium text-white">{value}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-300">Raw response</div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs text-slate-300">
{JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
