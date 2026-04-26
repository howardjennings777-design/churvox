import React, { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { formatCurrency } from "../lib/utils";
import { safeNumber } from "../utils/safeRender";

export default function ReportsPage() {
  const { get } = useApi();
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    const res = await get("/reports/summary");
    setSummary(res?.success ? res.data : {});
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const cards = [
    ["Revenue this month", formatCurrency(summary?.revenue_this_month)],
    ["Outstanding invoices", formatCurrency(summary?.outstanding_invoices)],
    ["Completed jobs", safeNumber(summary?.completed_jobs, 0)],
    ["Worker hours", safeNumber(summary?.worker_hours, 0)],
    ["Quote win rate", `${Math.round(safeNumber(summary?.quote_win_rate, 0) * 100)}%`],
    ["Overdue jobs", safeNumber(summary?.overdue_jobs, 0)],
    ["Payroll hours summary", safeNumber(summary?.payroll_hours_summary, 0)],
  ];

  return (
    <Layout>
      <div className="cx-page">
        <div className="cx-page-hero">
          <h1 className="cx-page-title">Reports</h1>
          <p className="cx-page-subtitle">Track revenue, job performance, invoice risk, and team productivity.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map(([label, value]) => (
            <div key={label} className="cx-metric-card">
              <p className="text-xs uppercase text-slate-500">{label}</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
