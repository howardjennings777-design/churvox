import React, { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { formatCurrency } from "../lib/utils";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";

export default function ReportsPage() {
  const { get } = useApi();
  const [summary, setSummary] = useState(null);
  const [accounting, setAccounting] = useState(null);
  const [range, setRange] = useState("this_month");

  const load = useCallback(async () => {
    const [res, accountingRes] = await Promise.all([get(`/reports/summary?range=${range}`), get("/accounting/settings")]);
    setSummary(res?.success ? res.data : {});
    if (accountingRes?.success) setAccounting(accountingRes.data || null);
  }, [get, range]);

  useEffect(() => { load(); }, [load]);

  const cards = [
    ["Revenue this month", formatCurrency(summary?.revenue_this_month)],
    ["Outstanding invoices", formatCurrency(summary?.outstanding_invoices)],
    ["Overdue invoices", safeNumber(summary?.overdue_invoices, 0)],
    ["Paid invoices", safeNumber(summary?.paid_invoices, 0)],
    ["Completed jobs", safeNumber(summary?.completed_jobs, 0)],
    ["Active jobs", safeNumber(summary?.active_jobs, 0)],
    ["Worker hours", safeNumber(summary?.worker_hours, 0)],
    ["Payroll hours", safeNumber(summary?.payroll_hours_summary, 0)],
    ["Quote win rate", `${Math.round(safeNumber(summary?.quote_win_rate, 0) * 100)}%`],
    ["Recurring jobs due", safeNumber(summary?.recurring_jobs_due, 0)],
    ["MYOB sync issues", safeNumber(summary?.myob_sync_issues, 0)],
  ];

  return (
    <Layout>
      <div className="cx-page">
        <div className="cx-page-hero">
          <h1 className="cx-page-title">Reports</h1>
          <p className="cx-page-subtitle">Track revenue, job performance, invoice risk, and team productivity.</p>
          <div className="mt-3 inline-flex rounded-lg border border-[#d9dce3] bg-white p-1">
            <button className={`px-3 py-1 text-sm rounded-md ${range === "this_month" ? "bg-blue-600 text-white" : "text-slate-600"}`} onClick={() => setRange("this_month")}>This month</button>
            <button className={`px-3 py-1 text-sm rounded-md ${range === "last_month" ? "bg-blue-600 text-white" : "text-slate-600"}`} onClick={() => setRange("last_month")}>Last month</button>
          </div>
          {(accounting?.invoice_mode === "myob_sync" || accounting?.invoice_mode === "myob_external") && (
            <p className="text-xs text-slate-500 mt-2">Accounting status is synced from MYOB when connected.</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map(([label, value]) => (
            <div key={label} className="cx-metric-card">
              <p className="text-xs uppercase text-slate-500">{label}</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
          <div className="cx-panel p-4">
            <p className="text-sm font-semibold text-slate-900 mb-2">Jobs by status</p>
            <div className="space-y-2">
              {Object.entries(summary?.jobs_by_status || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between text-sm">
                  <span className="capitalize text-slate-600">{safeText(status, "unknown").replace(/_/g, " ")}</span>
                  <span className="font-semibold text-slate-900">{safeNumber(count, 0)}</span>
                </div>
              ))}
              {Object.keys(summary?.jobs_by_status || {}).length === 0 && <p className="text-sm text-slate-500">No jobs in this period.</p>}
            </div>
          </div>

          <div className="cx-panel p-4">
            <p className="text-sm font-semibold text-slate-900 mb-2">Invoice status breakdown</p>
            <div className="space-y-2">
              {Object.entries(summary?.invoice_status_breakdown || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between text-sm">
                  <span className="capitalize text-slate-600">{safeText(status, "unknown").replace(/_/g, " ")}</span>
                  <span className="font-semibold text-slate-900">{safeNumber(count, 0)}</span>
                </div>
              ))}
              {Object.keys(summary?.invoice_status_breakdown || {}).length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
            </div>
          </div>

          <div className="cx-panel p-4">
            <p className="text-sm font-semibold text-slate-900 mb-2">Quote status breakdown</p>
            <div className="space-y-2">
              {Object.entries(summary?.quote_status_breakdown || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between text-sm">
                  <span className="capitalize text-slate-600">{safeText(status, "unknown").replace(/_/g, " ")}</span>
                  <span className="font-semibold text-slate-900">{safeNumber(count, 0)}</span>
                </div>
              ))}
              {Object.keys(summary?.quote_status_breakdown || {}).length === 0 && <p className="text-sm text-slate-500">No quotes yet.</p>}
            </div>
          </div>
        </div>

        <div className="cx-panel p-4 mt-4">
          <p className="text-sm font-semibold text-slate-900 mb-2">Top clients</p>
          <div className="space-y-2">
            {safeArray(summary?.top_clients).map((client) => (
              <div key={`${client.client_id}-${client.client_name}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <span className="text-sm text-slate-700">{safeText(client.client_name, "Unknown client")}</span>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(safeNumber(client.revenue, 0))} • {safeNumber(client.jobs, 0)} jobs</span>
              </div>
            ))}
            {safeArray(summary?.top_clients).length === 0 && <p className="text-sm text-slate-500">Top clients will appear after paid invoices and completed jobs.</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
