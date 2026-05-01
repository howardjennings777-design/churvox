import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import API_BASE from "../lib/apiBase";
import { formatCurrency } from "../lib/utils";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import { Activity, AlertTriangle, Briefcase, CheckCircle2, CreditCard, FileText, RefreshCw, TrendingUp, Users } from "lucide-react";

const RANGE_OPTIONS = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "last_90_days", label: "Last 90 days" },
  { key: "year_to_date", label: "Year to date" },
];

const EXPORTS = [
  { key: "invoices", label: "Export invoices CSV", endpoint: "/reports/invoices.csv", roles: "report/admin" },
  { key: "jobs", label: "Export jobs CSV", endpoint: "/reports/jobs.csv", roles: "report/admin" },
  { key: "quotes", label: "Export quotes CSV", endpoint: "/reports/quotes.csv", roles: "report/admin" },
  { key: "payroll", label: "Export payroll CSV", endpoint: "/reports/payroll.csv", roles: "payroll/admin" },
];

const roleLabel = (s) => safeText(s, "unknown").replace(/_/g, " ");

const countBy = (items, key) => safeArray(items).reduce((acc, item) => {
  const v = String(item?.[key] || "unknown").toLowerCase();
  acc[v] = (acc[v] || 0) + 1;
  return acc;
}, {});

function buildFallback({ jobs, invoices, quotes, clients, workers }) {
  const paid = safeArray(invoices).filter((i) => String(i?.status || "").toLowerCase() === "paid");
  const outstanding = safeArray(invoices).filter((i) => !["paid", "cancelled", "void"].includes(String(i?.status || "").toLowerCase()));
  const overdue = safeArray(invoices).filter((i) => String(i?.status || "").toLowerCase() === "overdue");
  const completedJobs = safeArray(jobs).filter((j) => String(j?.status || "").toLowerCase() === "completed");
  const activeJobs = safeArray(jobs).filter((j) => ["assigned", "acknowledged", "in_progress", "paused", "scheduled"].includes(String(j?.status || "").toLowerCase()));
  const acceptedQuotes = safeArray(quotes).filter((q) => String(q?.status || "").toLowerCase() === "accepted");
  const decidedQuotes = safeArray(quotes).filter((q) => ["accepted", "declined", "sent"].includes(String(q?.status || "").toLowerCase()));
  const clientMap = new Map();
  safeArray(invoices).forEach((i) => {
    const key = String(i?.client_id || i?.customer_name || "unknown");
    const row = clientMap.get(key) || { client_name: i?.customer_name || i?.client_name || "Unknown client", revenue: 0, jobs: 0, last_activity: i?.updated_at || i?.created_at || "" };
    row.revenue += safeNumber(i?.total || i?.amount || i?.subtotal, 0);
    clientMap.set(key, row);
  });
  safeArray(jobs).forEach((j) => {
    const key = String(j?.client_id || j?.customer_name || "unknown");
    const row = clientMap.get(key) || { client_name: j?.customer_name || j?.client_name || "Unknown client", revenue: 0, jobs: 0, last_activity: j?.updated_at || j?.created_at || "" };
    row.jobs += 1;
    if (!row.last_activity) row.last_activity = j?.updated_at || j?.created_at || "";
    clientMap.set(key, row);
  });
  const workerHours = safeArray(jobs).reduce((sum, j) => sum + (safeNumber(j?.total_time_seconds, 0) / 3600 || safeNumber(j?.hours_worked, 0)), 0);
  return {
    revenue_this_month: paid.reduce((sum, i) => sum + safeNumber(i?.total || i?.amount || i?.subtotal, 0), 0),
    outstanding_invoices: outstanding.reduce((sum, i) => sum + safeNumber(i?.total || i?.amount || i?.subtotal, 0), 0),
    overdue_invoices: overdue.length,
    paid_invoices: paid.length,
    completed_jobs: completedJobs.length,
    active_jobs: activeJobs.length,
    worker_hours: Number(workerHours.toFixed(2)),
    payroll_hours_summary: Number(workerHours.toFixed(2)),
    quote_win_rate: decidedQuotes.length ? acceptedQuotes.length / decidedQuotes.length : 0,
    recurring_jobs_due: safeArray(jobs).filter((j) => j?.is_recurring || j?.recurring || j?.recurrence).length,
    myob_sync_issues: safeArray(invoices).filter((i) => ["failed", "sync_failed", "setup_required", "error"].includes(String(i?.myob_sync_status || "").toLowerCase())).length,
    jobs_by_status: countBy(jobs, "status"),
    invoice_status_breakdown: countBy(invoices, "status"),
    quote_status_breakdown: countBy(quotes, "status"),
    top_clients: Array.from(clientMap.values()).sort((a, b) => b.revenue - a.revenue || b.jobs - a.jobs).slice(0, 8),
    total_clients: safeArray(clients).length,
    total_workers: safeArray(workers).length,
  };
}

export default function ReportsPage() {
  const { get } = useApi();
  const [summary, setSummary] = useState({});
  const [range, setRange] = useState("this_month");
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState("");
  const [exportState, setExportState] = useState({});
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setErrorBanner("");
    const [summaryRes, jobsRes, invoicesRes, quotesRes, clientsRes, workersRes] = await Promise.allSettled([
      get(`/reports/summary?range=${range}`), get("/jobs"), get("/invoices"), get("/quotes"), get("/clients"), get("/team/workers"),
    ]);

    const fallback = buildFallback({
      jobs: jobsRes.status === "fulfilled" && jobsRes.value?.success ? jobsRes.value.data : [],
      invoices: invoicesRes.status === "fulfilled" && invoicesRes.value?.success ? invoicesRes.value.data : [],
      quotes: quotesRes.status === "fulfilled" && quotesRes.value?.success ? quotesRes.value.data : [],
      clients: clientsRes.status === "fulfilled" && clientsRes.value?.success ? clientsRes.value.data : [],
      workers: workersRes.status === "fulfilled" && workersRes.value?.success ? workersRes.value.data : [],
    });

    if (summaryRes.status === "fulfilled" && summaryRes.value?.success) {
      setSummary({ ...fallback, ...(summaryRes.value.data || {}) });
    } else {
      const detail = summaryRes.status === "fulfilled" ? summaryRes.value?.error : summaryRes.reason?.message;
      if (String(detail || "").toLowerCase().includes("403")) {
        setErrorBanner("Access denied: reports require report/admin access.");
      } else {
        setErrorBanner("Reports summary is unavailable. Showing fallback data from jobs, invoices, quotes, clients, and team.");
      }
      setSummary(fallback);
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, [get, range]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const downloadCsv = useCallback(async (name, endpoint) => {
    setExportState((prev) => ({ ...prev, [name]: "loading" }));
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api${endpoint}`, {
        method: "GET",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        if (response.status === 403 && name === "payroll") {
          throw new Error("Payroll export requires payroll/admin access.");
        }
        const text = await response.text();
        throw new Error(text || `Export failed (${response.status}).`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportState((prev) => ({ ...prev, [name]: "success" }));
      setMessage(`${roleLabel(name)} export downloaded.`);
    } catch (err) {
      setExportState((prev) => ({ ...prev, [name]: "error" }));
      setMessage(safeText(err?.message, "Export failed."));
    }
  }, []);

  const topClients = safeArray(summary?.top_clients);
  const hasData = safeNumber(summary?.total_clients, 0) > 0 || safeNumber(summary?.completed_jobs, 0) > 0 || safeNumber(summary?.paid_invoices, 0) > 0;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black text-slate-950">Reports</h1>
                <p className="mt-1 text-sm text-slate-700">Business reporting centre for revenue, jobs, quotes, invoices, team, payroll export and MYOB connection status.</p>
                <p className="mt-2 text-xs font-semibold text-slate-700">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "Not yet loaded"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((o) => (
                  <button key={o.key} type="button" onClick={() => setRange(o.key)} className={`rounded-full border px-4 py-2 text-sm font-bold ${range === o.key ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-900"}`}>{o.label}</button>
                ))}
                <button type="button" onClick={loadSummary} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
              </div>
            </div>
            {!!errorBanner && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{errorBanner}</div>}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-950">CSV exports</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXPORTS.map((exp) => (
                <button key={exp.key} type="button" onClick={() => downloadCsv(exp.key, exp.endpoint)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900">
                  {exportState?.[exp.key] === "loading" ? `Exporting ${exp.key}...` : exp.label}
                </button>
              ))}
            </div>
            {!!message && <p className="mt-2 text-sm font-semibold text-slate-700">{message}</p>}
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Stat title="Revenue this period" value={formatCurrency(summary?.revenue_this_month)} icon={TrendingUp} />
            <Stat title="Outstanding invoices value" value={formatCurrency(summary?.outstanding_invoices)} icon={CreditCard} />
            <Stat title="Paid invoices count" value={safeNumber(summary?.paid_invoices, 0)} icon={CheckCircle2} />
            <Stat title="Overdue invoices count" value={safeNumber(summary?.overdue_invoices, 0)} icon={AlertTriangle} />
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Breakdown title="Jobs snapshot" chips={[`Completed ${safeNumber(summary?.completed_jobs, 0)}`, `Active ${safeNumber(summary?.active_jobs, 0)}`, `Recurring due ${safeNumber(summary?.recurring_jobs_due, 0)}`]} map={summary?.jobs_by_status} />
            <Breakdown title="Quotes snapshot" chips={[`Win rate ${Math.round(safeNumber(summary?.quote_win_rate, 0) * 100)}%`, `Open ${safeNumber(summary?.quote_status_breakdown?.sent, 0)}`, `Accepted ${safeNumber(summary?.quote_status_breakdown?.accepted, 0)}`, `Declined ${safeNumber(summary?.quote_status_breakdown?.declined, 0)}`]} map={summary?.quote_status_breakdown} />
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Breakdown title="Invoice snapshot" chips={[`Overdue ${safeNumber(summary?.overdue_invoices, 0)}`, `Outstanding ${formatCurrency(summary?.outstanding_invoices)}`, `MYOB sync issues ${safeNumber(summary?.myob_sync_issues, 0)}`]} map={summary?.invoice_status_breakdown} />
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">Team and payroll snapshot</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Info label="Worker hours" value={safeNumber(summary?.worker_hours, 0)} />
                <Info label="Total workers" value={safeNumber(summary?.total_workers, 0)} />
                <Info label="Payroll hours summary" value={safeNumber(summary?.payroll_hours_summary, 0)} />
                <Info label="Payroll export status" value="Export only / Payroll review" />
              </div>
              <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-800">Payroll is export/review only. No bank payout, tax filing, or government submission is performed by this page.</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-950">Top clients</h3>
            {!topClients.length ? <p className="mt-3 text-sm text-slate-700">No client revenue activity yet.</p> : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead><tr className="text-slate-700"><th className="pb-2">Client</th><th className="pb-2">Revenue</th><th className="pb-2">Jobs</th><th className="pb-2">Last activity</th></tr></thead>
                  <tbody>
                    {topClients.map((c, idx) => <tr key={`${safeText(c?.client_name, "client")}-${idx}`} className="border-t border-slate-100"><td className="py-2 text-slate-900">{safeText(c?.client_name, "Unknown client")}</td><td className="py-2 text-slate-800">{formatCurrency(c?.revenue)}</td><td className="py-2 text-slate-800">{safeNumber(c?.jobs, 0)}</td><td className="py-2 text-slate-700">{safeText(c?.last_activity, "-")}</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <LaunchAction title="Overdue invoices to chase" count={safeNumber(summary?.overdue_invoices, 0)} route="/invoices" />
            <LaunchAction title="Quotes to follow up" count={safeNumber(summary?.quote_status_breakdown?.sent, 0)} route="/quotes" />
            <LaunchAction title="Active jobs to review" count={safeNumber(summary?.active_jobs, 0)} route="/jobs" />
            <LaunchAction title="MYOB sync issues to check" count={safeNumber(summary?.myob_sync_issues, 0)} route="/settings" />
            <LaunchAction title="Payroll hours to review" count={safeNumber(summary?.payroll_hours_summary, 0)} route="/timesheets" />
          </section>

          {!hasData && !loading && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h3 className="text-xl font-black text-slate-950">No report data yet</h3>
              <p className="mt-1 text-sm text-slate-700">Start creating records and this reporting centre will populate automatically.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link to="/jobs" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Create/View jobs</Link>
                <Link to="/clients" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900">Create clients</Link>
                <Link to="/quotes" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900">Create quotes</Link>
                <Link to="/invoices" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900">Create invoices</Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Stat({ title, value, icon: Icon }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-700">{title}</p><div className="mt-2 flex items-center justify-between"><p className="text-2xl font-black text-slate-950">{value}</p><Icon className="h-5 w-5 text-blue-600" /></div></div>;
}

function Breakdown({ title, chips, map }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">{title}</h3><div className="mt-2 flex flex-wrap gap-2">{safeArray(chips).map((c) => <span key={c} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">{c}</span>)}</div><div className="mt-3 space-y-2">{Object.entries(map || {}).map(([k, v]) => <div key={k} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-700">{roleLabel(k)}</span><span className="font-black text-slate-950">{safeNumber(v, 0)}</span></div>)}{!Object.keys(map || {}).length && <p className="text-sm text-slate-700">No records in this section.</p>}</div></div>;
}

function Info({ label, value }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-700">{label}</p><p className="mt-1 text-base font-black text-slate-950">{value}</p></div>;
}

function LaunchAction({ title, count, route }) {
  return <Link to={route} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-bold text-slate-700">{title}</p><p className="mt-1 text-2xl font-black text-slate-950">{count}</p><p className="mt-2 text-xs font-semibold text-blue-700">Open</p></Link>;
}
