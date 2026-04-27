import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { formatCurrency } from "../lib/utils";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import { Activity, AlertTriangle, Briefcase, CreditCard, FileText, RefreshCw, TrendingUp, Users } from "lucide-react";

function withinRange(dateValue, range) {
  if (!dateValue) return true;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  if (range === "last_month") {
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= lastStart && date < lastEnd;
  }
  return date >= start && date < end;
}

function countBy(items, key) {
  return safeArray(items).reduce((acc, item) => {
    const value = safeText(item?.[key], "unknown");
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function idOf(item) {
  return String(item?.id || item?._id || item?.client_id || item?.customer_name || item?.client_name || "unknown");
}

function computeFallbackSummary({ jobs, invoices, quotes, clients, workers, range }) {
  const rangeJobs = safeArray(jobs).filter((job) => withinRange(job.completed_at || job.updated_at || job.created_at || job.scheduled_date, range));
  const rangeInvoices = safeArray(invoices).filter((invoice) => withinRange(invoice.paid_at || invoice.updated_at || invoice.created_at || invoice.due_date, range));
  const rangeQuotes = safeArray(quotes).filter((quote) => withinRange(quote.updated_at || quote.created_at || quote.valid_until, range));
  const paidInvoices = rangeInvoices.filter((invoice) => String(invoice.status || "").toLowerCase() === "paid");
  const outstanding = rangeInvoices.filter((invoice) => !["paid", "cancelled"].includes(String(invoice.status || "").toLowerCase()));
  const overdue = rangeInvoices.filter((invoice) => String(invoice.status || "").toLowerCase() === "overdue");
  const acceptedQuotes = rangeQuotes.filter((quote) => String(quote.status || "").toLowerCase() === "accepted");
  const sentQuotes = rangeQuotes.filter((quote) => ["sent", "accepted", "declined"].includes(String(quote.status || "").toLowerCase()));

  const clientMap = new Map();
  rangeInvoices.forEach((invoice) => {
    const key = idOf(invoice);
    const existing = clientMap.get(key) || {
      client_id: key,
      client_name: invoice.customer_name || invoice.client_name || "Unknown client",
      revenue: 0,
      jobs: 0,
    };
    existing.revenue += safeNumber(invoice.total || invoice.amount || invoice.subtotal, 0);
    clientMap.set(key, existing);
  });
  rangeJobs.forEach((job) => {
    const key = idOf(job);
    const existing = clientMap.get(key) || {
      client_id: key,
      client_name: job.customer_name || job.client_name || "Unknown client",
      revenue: 0,
      jobs: 0,
    };
    existing.jobs += 1;
    clientMap.set(key, existing);
  });

  const workerHours = rangeJobs.reduce((total, job) => {
    const seconds = safeNumber(job.total_time_seconds || job.worked_seconds || job.net_worked_seconds, 0);
    const hours = safeNumber(job.hours_worked, 0);
    return total + (seconds ? seconds / 3600 : hours);
  }, 0);

  return {
    revenue_this_month: paidInvoices.reduce((sum, invoice) => sum + safeNumber(invoice.total || invoice.amount || invoice.subtotal, 0), 0),
    outstanding_invoices: outstanding.reduce((sum, invoice) => sum + safeNumber(invoice.total || invoice.amount || invoice.subtotal, 0), 0),
    overdue_invoices: overdue.length,
    paid_invoices: paidInvoices.length,
    completed_jobs: rangeJobs.filter((job) => String(job.status || "").toLowerCase() === "completed").length,
    active_jobs: rangeJobs.filter((job) => ["assigned", "acknowledged", "in_progress", "paused"].includes(String(job.status || "").toLowerCase())).length,
    worker_hours: Number(workerHours.toFixed(1)),
    payroll_hours_summary: Number(workerHours.toFixed(1)),
    quote_win_rate: sentQuotes.length ? acceptedQuotes.length / sentQuotes.length : 0,
    recurring_jobs_due: rangeJobs.filter((job) => job.is_recurring || job.recurring).length,
    myob_sync_issues: rangeInvoices.filter((invoice) => String(invoice.myob_sync_status || "").toLowerCase() === "sync_failed").length,
    jobs_by_status: countBy(rangeJobs, "status"),
    invoice_status_breakdown: countBy(rangeInvoices, "status"),
    quote_status_breakdown: countBy(rangeQuotes, "status"),
    top_clients: Array.from(clientMap.values()).sort((a, b) => b.revenue - a.revenue || b.jobs - a.jobs).slice(0, 8),
    total_clients: safeArray(clients).length,
    total_workers: safeArray(workers).length,
  };
}

function StatTile({ label, value, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.13em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`rounded-xl border p-2 ${tones[tone] || tones.blue}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function BreakdownCard({ title, items, empty }) {
  const entries = Object.entries(items || {});
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-black text-slate-950">{title}</p>
      <div className="mt-3 space-y-2">
        {entries.map(([status, count]) => (
          <div key={status} className="flex justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
            <span className="capitalize text-slate-600">{safeText(status, "unknown").replace(/_/g, " ")}</span>
            <span className="font-black text-slate-950">{safeNumber(count, 0)}</span>
          </div>
        ))}
        {!entries.length && <p className="text-sm text-slate-500">{empty}</p>}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { get } = useApi();
  const [summary, setSummary] = useState({});
  const [accounting, setAccounting] = useState(null);
  const [range, setRange] = useState("this_month");
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("live");
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [summaryRes, accountingRes, jobsRes, invoicesRes, quotesRes, clientsRes, workersRes] = await Promise.allSettled([
      get(`/reports/summary?range=${range}`),
      get("/accounting/settings"),
      get("/jobs"),
      get("/invoices"),
      get("/quotes"),
      get("/clients"),
      get("/team/workers"),
    ]);

    const liveSummary = summaryRes.status === "fulfilled" && summaryRes.value?.success ? summaryRes.value.data : null;
    const fallback = computeFallbackSummary({
      jobs: jobsRes.status === "fulfilled" && jobsRes.value?.success ? jobsRes.value.data : [],
      invoices: invoicesRes.status === "fulfilled" && invoicesRes.value?.success ? invoicesRes.value.data : [],
      quotes: quotesRes.status === "fulfilled" && quotesRes.value?.success ? quotesRes.value.data : [],
      clients: clientsRes.status === "fulfilled" && clientsRes.value?.success ? clientsRes.value.data : [],
      workers: workersRes.status === "fulfilled" && workersRes.value?.success ? workersRes.value.data : [],
      range,
    });

    setSummary({ ...fallback, ...(liveSummary || {}) });
    setDataSource(liveSummary ? "backend report" : "computed from live records");
    if (accountingRes.status === "fulfilled" && accountingRes.value?.success) setAccounting(accountingRes.value.data || null);
    setLastUpdated(new Date());
    setLoading(false);
  }, [get, range]);

  useEffect(() => { load(); }, [load]);

  const cards = useMemo(() => [
    ["Revenue", formatCurrency(summary?.revenue_this_month), TrendingUp, "green"],
    ["Outstanding", formatCurrency(summary?.outstanding_invoices), CreditCard, "amber"],
    ["Overdue", safeNumber(summary?.overdue_invoices, 0), AlertTriangle, safeNumber(summary?.overdue_invoices, 0) ? "red" : "slate"],
    ["Paid invoices", safeNumber(summary?.paid_invoices, 0), FileText, "green"],
    ["Completed jobs", safeNumber(summary?.completed_jobs, 0), Briefcase, "blue"],
    ["Active jobs", safeNumber(summary?.active_jobs, 0), Activity, "blue"],
    ["Worker hours", safeNumber(summary?.worker_hours, 0), Users, "slate"],
    ["Quote win rate", `${Math.round(safeNumber(summary?.quote_win_rate, 0) * 100)}%`, TrendingUp, "green"],
    ["Recurring due", safeNumber(summary?.recurring_jobs_due, 0), RefreshCw, "blue"],
    ["MYOB issues", safeNumber(summary?.myob_sync_issues, 0), AlertTriangle, safeNumber(summary?.myob_sync_issues, 0) ? "red" : "slate"],
  ], [summary]);

  return (
    <Layout>
      <div className="cx-page">
        <div className="cx-page-hero">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="cx-page-title">Reports</h1>
              <p className="cx-page-subtitle">Live business analytics for revenue, job performance, invoice risk, quote conversion, clients, payroll and MYOB health.</p>
              <p className="mt-2 text-xs font-semibold text-blue-100">Source: {dataSource}{lastUpdated ? ` • updated ${lastUpdated.toLocaleTimeString()}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={`rounded-full px-4 py-2 text-sm font-black ${range === "this_month" ? "bg-blue-600 text-white" : "bg-white/10 text-white"}`} onClick={() => setRange("this_month")}>This month</button>
              <button className={`rounded-full px-4 py-2 text-sm font-black ${range === "last_month" ? "bg-blue-600 text-white" : "bg-white/10 text-white"}`} onClick={() => setRange("last_month")}>Last month</button>
              <button className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white" onClick={load}><RefreshCw className={`mr-1 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
            </div>
          </div>
          {(accounting?.invoice_mode === "myob_sync" || accounting?.invoice_mode === "myob_external") && (
            <p className="mt-3 text-xs font-semibold text-blue-100">Accounting status is synced from MYOB when connected.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map(([label, value, Icon, tone]) => <StatTile key={label} label={label} value={value} icon={Icon} tone={tone} />)}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <BreakdownCard title="Jobs by status" items={summary?.jobs_by_status} empty="No jobs in this period." />
          <BreakdownCard title="Invoices by status" items={summary?.invoice_status_breakdown} empty="No invoices yet." />
          <BreakdownCard title="Quotes by status" items={summary?.quote_status_breakdown} empty="No quotes yet." />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-slate-950">Top clients</p>
            <div className="mt-3 space-y-2">
              {safeArray(summary?.top_clients).map((client) => (
                <div key={`${client.client_id}-${client.client_name}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-700">{safeText(client.client_name, "Unknown client")}</span>
                  <span className="shrink-0 text-sm font-black text-slate-950">{formatCurrency(safeNumber(client.revenue, 0))} • {safeNumber(client.jobs, 0)} jobs</span>
                </div>
              ))}
              {safeArray(summary?.top_clients).length === 0 && <p className="text-sm text-slate-500">Top clients will appear after invoices and completed jobs.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-slate-950">Launch health</p>
            <div className="mt-3 grid gap-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">Invoices unpaid: <strong>{formatCurrency(summary?.outstanding_invoices)}</strong></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">Quote win rate: <strong>{Math.round(safeNumber(summary?.quote_win_rate, 0) * 100)}%</strong></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">Payroll hours source: <strong>{safeNumber(summary?.payroll_hours_summary || summary?.worker_hours, 0)}h</strong></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">Data mode: <strong>{dataSource}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
