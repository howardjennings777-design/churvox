import React, { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { formatCurrency } from "../lib/utils";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumStatCard, PremiumButton, PremiumAIBox, PremiumBadge,
} from "../components/premium";
import { BarChart3, TrendingUp, Briefcase, Receipt, AlertTriangle, Users, Calendar, FileText, Sparkles, Clock3 } from "lucide-react";

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

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<BarChart3 className="h-7 w-7" />}
          eyebrow={<><TrendingUp className="h-3 w-3" /> Insights</>}
          title="Reports"
          subtitle="Track revenue, job performance, invoice risk and team productivity at a glance."
          actions={
            <div className="inline-flex rounded-2xl border border-[#d8e3f3] bg-white p-1 shadow-sm">
              <button className={`px-3 py-1.5 text-[13px] rounded-xl font-semibold ${range === "this_month" ? "bg-[#1d4ed8] text-white" : "text-[#5b6c87]"}`} onClick={() => setRange("this_month")}>This month</button>
              <button className={`px-3 py-1.5 text-[13px] rounded-xl font-semibold ${range === "last_month" ? "bg-[#1d4ed8] text-white" : "text-[#5b6c87]"}`} onClick={() => setRange("last_month")}>Last month</button>
            </div>
          }
        />

        <PremiumAIBox
          title="AI Reports Summary"
          subtitle="Quick safe summary of business performance. AI never makes legal, tax or payroll compliance decisions."
          chip="Read-only summary"
          notice="AI summaries are informational only. Always cross-check before sharing with accountants, the ATO or HMRC."
          suggestions={[
            { icon: <TrendingUp className="h-4 w-4" />, title: `Revenue this period: ${formatCurrency(summary?.revenue_this_month)}`, description: `Outstanding: ${formatCurrency(summary?.outstanding_invoices)} · Overdue invoices: ${safeNumber(summary?.overdue_invoices, 0)}` },
            { icon: <Briefcase className="h-4 w-4" />, title: `Completed jobs: ${safeNumber(summary?.completed_jobs, 0)}`, description: `Active: ${safeNumber(summary?.active_jobs, 0)} · Worker hours: ${safeNumber(summary?.worker_hours, 0)}` },
            { icon: <FileText className="h-4 w-4" />, title: `Quote win rate: ${Math.round(safeNumber(summary?.quote_win_rate, 0) * 100)}%`, description: "AI checked and can highlight quotes most likely to convert next." },
          ]}
        />

        <div className="px-grid px-grid--4">
          <PremiumStatCard label="Revenue" value={formatCurrency(summary?.revenue_this_month)} icon={<TrendingUp className="h-4 w-4" />} tone="teal" onClick={() => {}} />
          <PremiumStatCard label="Outstanding" value={formatCurrency(summary?.outstanding_invoices)} icon={<Receipt className="h-4 w-4" />} tone="amber" onClick={() => {}} />
          <PremiumStatCard label="Overdue invoices" value={safeNumber(summary?.overdue_invoices, 0)} icon={<AlertTriangle className="h-4 w-4" />} tone="red" onClick={() => {}} />
          <PremiumStatCard label="Paid invoices" value={safeNumber(summary?.paid_invoices, 0)} icon={<Receipt className="h-4 w-4" />} tone="teal" onClick={() => {}} />
          <PremiumStatCard label="Completed jobs" value={safeNumber(summary?.completed_jobs, 0)} icon={<Briefcase className="h-4 w-4" />} tone="sky" onClick={() => {}} />
          <PremiumStatCard label="Active jobs" value={safeNumber(summary?.active_jobs, 0)} icon={<Briefcase className="h-4 w-4" />} onClick={() => {}} />
          <PremiumStatCard label="Worker hours" value={safeNumber(summary?.worker_hours, 0)} icon={<Clock3 className="h-4 w-4" />} tone="violet" onClick={() => {}} />
          <PremiumStatCard label="Quote win rate" value={`${Math.round(safeNumber(summary?.quote_win_rate, 0) * 100)}%`} icon={<FileText className="h-4 w-4" />} tone="violet" onClick={() => {}} />
          <PremiumStatCard label="Recurring jobs due" value={safeNumber(summary?.recurring_jobs_due, 0)} icon={<Calendar className="h-4 w-4" />} onClick={() => {}} />
          <PremiumStatCard label="Payroll hours" value={safeNumber(summary?.payroll_hours_summary, 0)} icon={<Users className="h-4 w-4" />} onClick={() => {}} />
          <PremiumStatCard label="MYOB sync issues" value={safeNumber(summary?.myob_sync_issues, 0)} icon={<AlertTriangle className="h-4 w-4" />} tone={safeNumber(summary?.myob_sync_issues, 0) ? "red" : "blue"} onClick={() => {}} />
          {(accounting?.invoice_mode === "myob_sync" || accounting?.invoice_mode === "myob_external") && (
            <div className="px-stat" style={{ alignItems: 'flex-start' }}>
              <span className="px-stat__label">Accounting source</span>
              <span className="px-stat__value text-[15px]">{accounting?.invoice_mode === "myob_external" ? "MYOB" : "Churvox + MYOB"}</span>
              <PremiumBadge tone="sky">Sync enabled</PremiumBadge>
            </div>
          )}
        </div>

        <div className="px-grid px-grid--3">
          <PremiumCard title="Jobs by status" icon={<Briefcase className="h-4 w-4" />}>
            <div className="space-y-2">
              {Object.entries(summary?.jobs_by_status || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center px-3 py-2 rounded-xl bg-[#f6faff] border border-[#e6eef9] text-[13px]">
                  <span className="capitalize text-[#5b6c87]">{safeText(status, "unknown").replace(/_/g, " ")}</span>
                  <span className="font-bold text-[#0d1b34]">{safeNumber(count, 0)}</span>
                </div>
              ))}
              {Object.keys(summary?.jobs_by_status || {}).length === 0 && <p className="text-[13px] text-[#7d8ba3]">No jobs in this period.</p>}
            </div>
          </PremiumCard>

          <PremiumCard title="Invoice breakdown" icon={<Receipt className="h-4 w-4" />}>
            <div className="space-y-2">
              {Object.entries(summary?.invoice_status_breakdown || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center px-3 py-2 rounded-xl bg-[#f6faff] border border-[#e6eef9] text-[13px]">
                  <span className="capitalize text-[#5b6c87]">{safeText(status, "unknown").replace(/_/g, " ")}</span>
                  <span className="font-bold text-[#0d1b34]">{safeNumber(count, 0)}</span>
                </div>
              ))}
              {Object.keys(summary?.invoice_status_breakdown || {}).length === 0 && <p className="text-[13px] text-[#7d8ba3]">No invoices yet.</p>}
            </div>
          </PremiumCard>

          <PremiumCard title="Quote breakdown" icon={<FileText className="h-4 w-4" />}>
            <div className="space-y-2">
              {Object.entries(summary?.quote_status_breakdown || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center px-3 py-2 rounded-xl bg-[#f6faff] border border-[#e6eef9] text-[13px]">
                  <span className="capitalize text-[#5b6c87]">{safeText(status, "unknown").replace(/_/g, " ")}</span>
                  <span className="font-bold text-[#0d1b34]">{safeNumber(count, 0)}</span>
                </div>
              ))}
              {Object.keys(summary?.quote_status_breakdown || {}).length === 0 && <p className="text-[13px] text-[#7d8ba3]">No quotes yet.</p>}
            </div>
          </PremiumCard>
        </div>

        <PremiumCard title="Top clients" icon={<Users className="h-4 w-4" />}>
          <div className="space-y-2">
            {safeArray(summary?.top_clients).map((c) => (
              <div key={`${c.client_id}-${c.client_name}`} className="flex items-center justify-between rounded-xl border border-[#e6eef9] bg-white px-4 py-3">
                <span className="text-[14px] text-[#0d1b34] font-semibold">{safeText(c.client_name, "Unknown client")}</span>
                <span className="text-[13px] font-bold text-[#1d4ed8]">{formatCurrency(safeNumber(c.revenue, 0))} · {safeNumber(c.jobs, 0)} jobs</span>
              </div>
            ))}
            {safeArray(summary?.top_clients).length === 0 && (
              <p className="text-[13px] text-[#7d8ba3] text-center py-3">Top clients will appear after paid invoices and completed jobs.</p>
            )}
          </div>
        </PremiumCard>
      </PremiumPage>
    </Layout>
  );
}
