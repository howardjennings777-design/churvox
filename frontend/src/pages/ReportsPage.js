import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { formatCurrency } from "../lib/utils";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import {
  PremiumPage,
  PremiumHero,
  PremiumCard,
  PremiumStatCard,
  PremiumButton,
  PremiumBadge,
  PremiumEmptyState,
} from "../components/premium";
import {
  BarChart3,
  TrendingUp,
  Briefcase,
  Receipt,
  AlertTriangle,
  Users,
  Calendar,
  FileText,
  Clock3,
  RefreshCw,
  DollarSign,
} from "lucide-react";

export default function ReportsPage() {
  const { get } = useApi();
  const [summary, setSummary] = useState(null);
  const [accounting, setAccounting] = useState(null);
  const [range, setRange] = useState("this_month");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [res, accountingRes] = await Promise.all([
      get(`/reports/summary?range=${range}`),
      get("/accounting/settings"),
    ]);
    setSummary(res?.success ? res.data : {});
    if (accountingRes?.success) setAccounting(accountingRes.data || null);
    setLoading(false);
  }, [get, range]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ([
    { label: "Revenue", value: formatCurrency(summary?.revenue_this_month), icon: <TrendingUp className="h-4 w-4" />, tone: "teal" },
    { label: "Outstanding", value: formatCurrency(summary?.outstanding_invoices), icon: <Receipt className="h-4 w-4" />, tone: "amber" },
    { label: "Overdue invoices", value: safeNumber(summary?.overdue_invoices, 0), icon: <AlertTriangle className="h-4 w-4" />, tone: "red" },
    { label: "Paid invoices", value: safeNumber(summary?.paid_invoices, 0), icon: <Receipt className="h-4 w-4" />, tone: "teal" },
    { label: "Completed jobs", value: safeNumber(summary?.completed_jobs, 0), icon: <Briefcase className="h-4 w-4" />, tone: "sky" },
    { label: "Active jobs", value: safeNumber(summary?.active_jobs, 0), icon: <Briefcase className="h-4 w-4" />, tone: "blue" },
    { label: "Worker hours", value: safeNumber(summary?.worker_hours, 0), icon: <Clock3 className="h-4 w-4" />, tone: "violet" },
    { label: "Quote win rate", value: `${Math.round(safeNumber(summary?.quote_win_rate, 0) * 100)}%`, icon: <FileText className="h-4 w-4" />, tone: "violet" },
    { label: "Recurring due", value: safeNumber(summary?.recurring_jobs_due, 0), icon: <Calendar className="h-4 w-4" />, tone: "blue" },
    { label: "Payroll hours", value: safeNumber(summary?.payroll_hours_summary, 0), icon: <Users className="h-4 w-4" />, tone: "blue" },
    { label: "MYOB issues", value: safeNumber(summary?.myob_sync_issues, 0), icon: <AlertTriangle className="h-4 w-4" />, tone: safeNumber(summary?.myob_sync_issues, 0) ? "red" : "blue" },
  ]), [summary]);

  const accountingEnabled = accounting?.invoice_mode === "myob_sync" || accounting?.invoice_mode === "myob_external";

  return (
    <Layout>
      <PremiumPage>
        <div className="reports-v5">
          <PremiumHero
            className="reports-v5-hero"
            icon={<BarChart3 className="h-7 w-7" />}
            eyebrow={<><TrendingUp className="h-3 w-3" /> Insights</>}
            title="Business Insights"
            subtitle="A simple owner snapshot for revenue, invoices, jobs, payroll hours and customer value. Keep it clean for launch."
            actions={
              <div className="reports-v5-hero-actions">
                <div className="reports-v5-range">
                  <button className={range === "this_month" ? "active" : ""} onClick={() => setRange("this_month")}>This month</button>
                  <button className={range === "last_month" ? "active" : ""} onClick={() => setRange("last_month")}>Last month</button>
                </div>
                <PremiumButton variant="secondary" onClick={load} iconLeft={<RefreshCw className="h-4 w-4" />}>Refresh</PremiumButton>
              </div>
            }
          />

          <section className="reports-v5-focus">
            <article>
              <span><DollarSign className="h-4 w-4" /> Cash position</span>
              <h2>{formatCurrency(summary?.outstanding_invoices)}</h2>
              <p>Outstanding invoices waiting to be collected.</p>
            </article>
            <article>
              <span><Briefcase className="h-4 w-4" /> Work completed</span>
              <h2>{safeNumber(summary?.completed_jobs, 0)}</h2>
              <p>Completed jobs in the selected period.</p>
            </article>
            <article>
              <span><Users className="h-4 w-4" /> Payroll signal</span>
              <h2>{safeNumber(summary?.payroll_hours_summary, 0)}h</h2>
              <p>Approved or payroll-ready worker hours.</p>
            </article>
          </section>

          <section className="reports-v5-stats">
            {stats.map((stat) => (
              <PremiumStatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                tone={stat.tone}
                onClick={() => {}}
              />
            ))}
            {accountingEnabled && (
              <div className="reports-v5-accounting-card">
                <span>Accounting source</span>
                <strong>{accounting?.invoice_mode === "myob_external" ? "MYOB" : "Churvox + MYOB"}</strong>
                <PremiumBadge tone="sky">Sync enabled</PremiumBadge>
              </div>
            )}
          </section>

          {loading ? (
            <PremiumEmptyState
              icon={<RefreshCw className="h-6 w-6" />}
              title="Loading insights…"
              subtitle="Checking jobs, invoices, quotes and payroll signals."
            />
          ) : null}

          {!loading && (
            <section className="reports-v5-panels">
              <PremiumCard title="Jobs by status" icon={<Briefcase className="h-4 w-4" />}>
                <div className="reports-v5-list">
                  {Object.entries(summary?.jobs_by_status || {}).map(([status, count]) => (
                    <div key={status}>
                      <span>{safeText(status, "unknown").replace(/_/g, " ")}</span>
                      <b>{safeNumber(count, 0)}</b>
                    </div>
                  ))}
                  {Object.keys(summary?.jobs_by_status || {}).length === 0 && <p>No jobs in this period.</p>}
                </div>
              </PremiumCard>

              <PremiumCard title="Invoice breakdown" icon={<Receipt className="h-4 w-4" />}>
                <div className="reports-v5-list">
                  {Object.entries(summary?.invoice_status_breakdown || {}).map(([status, count]) => (
                    <div key={status}>
                      <span>{safeText(status, "unknown").replace(/_/g, " ")}</span>
                      <b>{safeNumber(count, 0)}</b>
                    </div>
                  ))}
                  {Object.keys(summary?.invoice_status_breakdown || {}).length === 0 && <p>No invoices yet.</p>}
                </div>
              </PremiumCard>

              <PremiumCard title="Quote breakdown" icon={<FileText className="h-4 w-4" />}>
                <div className="reports-v5-list">
                  {Object.entries(summary?.quote_status_breakdown || {}).map(([status, count]) => (
                    <div key={status}>
                      <span>{safeText(status, "unknown").replace(/_/g, " ")}</span>
                      <b>{safeNumber(count, 0)}</b>
                    </div>
                  ))}
                  {Object.keys(summary?.quote_status_breakdown || {}).length === 0 && <p>No quotes yet.</p>}
                </div>
              </PremiumCard>
            </section>
          )}

          <PremiumCard title="Top clients" icon={<Users className="h-4 w-4" />}>
            <div className="reports-v5-clients">
              {safeArray(summary?.top_clients).map((client) => (
                <div key={`${client.client_id}-${client.client_name}`}>
                  <span>{safeText(client.client_name, "Unknown client")}</span>
                  <b>{formatCurrency(safeNumber(client.revenue, 0))} · {safeNumber(client.jobs, 0)} jobs</b>
                </div>
              ))}
              {safeArray(summary?.top_clients).length === 0 && (
                <p>Top clients will appear after paid invoices and completed jobs.</p>
              )}
            </div>
          </PremiumCard>
        </div>
      </PremiumPage>
    </Layout>
  );
}
