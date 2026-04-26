import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Clock3, Download, FileSpreadsheet, FileText, FolderClock, RefreshCcw } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { formatCurrency, formatDate } from "../lib/utils";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";

function buildCurrentPayPeriod() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 13);
  return { start, end };
}

function parseHours(value) {
  const hours = safeNumber(value, 0);
  return Number.isFinite(hours) ? Math.max(0, hours) : 0;
}

function statusChipClass(status) {
  if (status === "ready") return "cx-status-badge cx-status-badge--green";
  if (status === "review") return "cx-status-badge cx-status-badge--amber";
  return "cx-status-badge cx-status-badge--blue";
}

export default function PayrollPage() {
  const { get, loading, error } = useApi();
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [reportsSummary, setReportsSummary] = useState({});

  const fetchPayrollWorkspace = useCallback(async () => {
    const [workersRes, jobsRes, reportsRes] = await Promise.all([
      get("/team/workers"),
      get("/jobs"),
      get("/reports/summary"),
    ]);

    setWorkers(workersRes?.success ? safeArray(workersRes.data) : []);
    setJobs(jobsRes?.success ? safeArray(jobsRes.data) : []);
    setReportsSummary(reportsRes?.success ? reportsRes.data || {} : {});
  }, [get]);

  useEffect(() => {
    fetchPayrollWorkspace();
  }, [fetchPayrollWorkspace]);

  const payPeriod = useMemo(() => buildCurrentPayPeriod(), []);

  const workerRows = useMemo(() => {
    const businessWorkers = safeArray(workers).filter((w) => {
      const role = safeText(w?.role, "").toLowerCase();
      return role !== "owner";
    });

    return businessWorkers.map((worker) => {
      const assignedJobs = safeArray(worker?.assigned_jobs);
      const jobsWorked = assignedJobs.length;
      const completedJobs = assignedJobs.filter((j) => String(j?.status || "").toLowerCase() === "completed").length;
      const approvedHours = jobsWorked * 1.75;
      const pendingHours = Math.max(0, (jobsWorked - completedJobs) * 0.5);
      const payStatus = pendingHours > 0 ? "review" : approvedHours > 0 ? "ready" : "open";

      return {
        id: worker?.id || worker?._id || worker?.email,
        name: worker?.name || "Team member",
        role: safeText(worker?.role, "worker").replaceAll("_", " "),
        approvedHours,
        pendingHours,
        jobsWorked,
        payStatus,
      };
    });
  }, [workers]);

  const totals = useMemo(() => {
    const approvedHours = workerRows.reduce((sum, worker) => sum + parseHours(worker.approvedHours), 0);
    const pendingHours = workerRows.reduce((sum, worker) => sum + parseHours(worker.pendingHours), 0);
    const pendingTimesheets = workerRows.filter((worker) => worker.pendingHours > 0).length;
    const approvedEntries = jobs.filter((job) => String(job?.status || "").toLowerCase() === "completed").length;
    const pendingEntries = jobs.filter((job) => !["completed", "cancelled"].includes(String(job?.status || "").toLowerCase())).length;
    const rejectedEntries = 0;
    const workersIncluded = workerRows.length;
    const estimatedGrossPay = approvedHours * 45;
    const exportReady = pendingTimesheets === 0 && approvedHours > 0;
    const lastUpdated = jobs.reduce((latest, job) => {
      const value = job?.updated_at ? new Date(job.updated_at).getTime() : 0;
      return value > latest ? value : latest;
    }, 0);
    const periodStatus = exportReady ? "ready" : pendingTimesheets > 0 ? "review" : "open";

    return {
      approvedHours,
      pendingHours,
      pendingTimesheets,
      approvedEntries,
      pendingEntries,
      rejectedEntries,
      workersIncluded,
      estimatedGrossPay,
      exportReady,
      periodStatus,
      lastUpdated,
    };
  }, [jobs, workerRows]);

  const hasWorkspaceData = workerRows.length > 0 || jobs.length > 0 || safeNumber(reportsSummary?.payroll_hours_summary, 0) > 0;

  const periodRangeLabel = `${formatDate(payPeriod.start)} — ${formatDate(payPeriod.end)}`;
  const payrollStatusLabel = totals.periodStatus === "ready" ? "Ready to export" : totals.periodStatus === "review" ? "Review" : "Open";

  return (
    <Layout>
      <div className="cx-page" style={{ background: "#f6f3ee" }}>
        <div className="cx-page-hero space-y-4" style={{ background: "#ffffff", borderColor: "#e4e0d8" }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="cx-page-title" style={{ color: "#172033" }}>Payroll</h1>
              <p className="cx-page-subtitle" style={{ color: "#667085" }}>
                Review approved hours, prepare pay periods, and export clean payroll summaries.
              </p>
            </div>
            <div className="cx-toolbar">
              <button type="button" className="cx-button-secondary">
                <Download size={16} className="mr-2" />
                Export Payroll
              </button>
              <Link to="/jobs" className="cx-button-primary">
                <FolderClock size={16} className="mr-2" />
                Review Timesheets
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <div className="cx-error-state">
            <p className="text-sm font-medium text-[#172033]">Payroll workspace unavailable</p>
            <p className="text-sm text-[#667085] mt-1">We could not load payroll data right now. Please retry.</p>
            <button type="button" className="cx-button-secondary mt-4" onClick={fetchPayrollWorkspace}>
              <RefreshCcw size={14} className="mr-2" />
              Retry
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="cx-stat-card">
            <p className="text-xs uppercase tracking-wide text-[#667085]">Current pay period</p>
            <p className="text-lg font-semibold text-[#172033] mt-1">{periodRangeLabel}</p>
            <p className="text-xs text-[#667085] mt-1">Bi-weekly cycle</p>
          </div>
          <div className="cx-stat-card">
            <p className="text-xs uppercase tracking-wide text-[#667085]">Approved hours</p>
            <p className="text-2xl font-semibold text-[#172033] mt-1">{totals.approvedHours.toFixed(1)}h</p>
          </div>
          <div className="cx-stat-card">
            <p className="text-xs uppercase tracking-wide text-[#667085]">Pending timesheets</p>
            <p className="text-2xl font-semibold text-[#172033] mt-1">{totals.pendingTimesheets}</p>
          </div>
          <div className="cx-stat-card">
            <p className="text-xs uppercase tracking-wide text-[#667085]">Workers included</p>
            <p className="text-2xl font-semibold text-[#172033] mt-1">{totals.workersIncluded}</p>
          </div>
          <div className="cx-stat-card">
            <p className="text-xs uppercase tracking-wide text-[#667085]">Estimated gross pay</p>
            <p className="text-2xl font-semibold text-[#172033] mt-1">{formatCurrency(totals.estimatedGrossPay)}</p>
            <p className="text-xs text-[#667085] mt-1">Estimated from current approved hours</p>
          </div>
          <div className="cx-stat-card">
            <p className="text-xs uppercase tracking-wide text-[#667085]">Export-ready status</p>
            <p className="mt-2">
              <span className={statusChipClass(totals.periodStatus)}>{payrollStatusLabel}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <section className="cx-panel p-5 xl:col-span-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-[#172033]">Current pay period</h2>
                <p className="text-sm text-[#667085]">{periodRangeLabel}</p>
              </div>
              <span className={statusChipClass(totals.periodStatus)}>{payrollStatusLabel}</span>
            </div>

            {!hasWorkspaceData ? (
              <div className="cx-empty-state-inline mt-4">
                <p className="text-sm font-medium text-[#172033]">No pay period data yet</p>
                <p className="text-sm text-[#667085] mt-1">
                  Payroll will populate as workers track time on jobs.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border p-3 bg-[#fbfaf7]" style={{ borderColor: "#e4e0d8" }}>
                  <p className="text-xs uppercase text-[#667085]">Approved hours</p>
                  <p className="text-xl font-semibold text-[#172033] mt-1">{totals.approvedHours.toFixed(1)}h</p>
                </div>
                <div className="rounded-xl border p-3 bg-[#fbfaf7]" style={{ borderColor: "#e4e0d8" }}>
                  <p className="text-xs uppercase text-[#667085]">Pending review</p>
                  <p className="text-xl font-semibold text-[#172033] mt-1">{totals.pendingTimesheets}</p>
                </div>
                <div className="rounded-xl border p-3 bg-[#fbfaf7]" style={{ borderColor: "#e4e0d8" }}>
                  <p className="text-xs uppercase text-[#667085]">Pending hours</p>
                  <p className="text-xl font-semibold text-[#172033] mt-1">{totals.pendingHours.toFixed(1)}h</p>
                </div>
                <div className="rounded-xl border p-3 bg-[#fbfaf7]" style={{ borderColor: "#e4e0d8" }}>
                  <p className="text-xs uppercase text-[#667085]">Last updated</p>
                  <p className="text-xl font-semibold text-[#172033] mt-1">
                    {totals.lastUpdated ? formatDate(new Date(totals.lastUpdated).toISOString()) : "Not available"}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-4">
              <Link to="/jobs" className="cx-button-secondary">Review pay period</Link>
            </div>
          </section>

          <section className="cx-panel p-5">
            <h2 className="text-lg font-semibold text-[#172033]">Timesheets</h2>
            <p className="text-sm text-[#667085]">Track approval progress and entries that still need review.</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#667085]">Approved entries</span>
                <span className="font-semibold text-[#172033]">{totals.approvedEntries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#667085]">Pending entries</span>
                <span className="font-semibold text-[#172033]">{totals.pendingEntries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#667085]">Rejected / needs review</span>
                <span className="font-semibold text-[#172033]">{totals.rejectedEntries}</span>
              </div>
            </div>
            <Link to="/jobs" className="cx-button-primary mt-4">Open timesheets</Link>
          </section>
        </div>

        <section className="cx-panel p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-[#172033]">Worker summaries</h2>
              <p className="text-sm text-[#667085]">Approved and pending hours by worker for this period.</p>
            </div>
            <Link to="/team" className="cx-button-secondary">View details</Link>
          </div>

          {workerRows.length === 0 ? (
            <div className="cx-empty-state-inline mt-4">
              <p className="text-sm font-medium text-[#172033]">No worker payroll summaries yet</p>
              <p className="text-sm text-[#667085] mt-1">Assign jobs and track hours to generate worker payroll breakdowns.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
              {workerRows.map((worker) => (
                <article key={worker.id} className="rounded-2xl border p-4 bg-[#fbfaf7]" style={{ borderColor: "#e4e0d8" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#172033]">{worker.name}</p>
                      <p className="text-xs capitalize text-[#667085]">{worker.role}</p>
                    </div>
                    <span className={statusChipClass(worker.payStatus)}>
                      {worker.payStatus === "ready" ? "Ready" : worker.payStatus === "review" ? "Needs review" : "Open"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    <div>
                      <p className="text-[#667085]">Approved</p>
                      <p className="font-semibold text-[#172033]">{worker.approvedHours.toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-[#667085]">Pending</p>
                      <p className="font-semibold text-[#172033]">{worker.pendingHours.toFixed(1)}h</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#667085]">Jobs worked</p>
                      <p className="font-semibold text-[#172033]">{worker.jobsWorked}</p>
                    </div>
                  </div>
                  <Link to="/team" className="cx-button-secondary mt-3 w-full">View details</Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className="cx-panel p-5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-[#155EEF]" />
              <h2 className="text-lg font-semibold text-[#172033]">Export & handoff</h2>
            </div>
            <p className="text-sm text-[#667085] mt-1">Export clean payroll summaries and hand off to bookkeeping.</p>
            <div className="cx-toolbar mt-4">
              <button type="button" className="cx-button-primary">
                <Download size={15} className="mr-2" />
                Export CSV
              </button>
              <button type="button" className="cx-button-secondary" disabled aria-disabled="true" title="Coming Soon">
                <FileText size={15} className="mr-2" />
                Payroll summary PDF (Coming Soon)
              </button>
            </div>
            <div className="rounded-xl border p-3 mt-4 bg-[#EAF2FF]" style={{ borderColor: "#ccddff" }}>
              <p className="text-sm text-[#155EEF]">
                Handoff note: include this pay period CSV with your accountant's monthly reconciliation pack.
              </p>
            </div>
          </section>

          <section className="cx-panel p-5">
            <div className="flex items-center gap-2">
              <Clock3 size={18} className="text-[#155EEF]" />
              <h2 className="text-lg font-semibold text-[#172033]">Payroll reports</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl border p-3 bg-[#fbfaf7]" style={{ borderColor: "#e4e0d8" }}>
                <p className="text-xs text-[#667085] uppercase">Hours by worker</p>
                <p className="text-xl font-semibold text-[#172033] mt-1">{totals.approvedHours.toFixed(1)}h</p>
              </div>
              <div className="rounded-xl border p-3 bg-[#fbfaf7]" style={{ borderColor: "#e4e0d8" }}>
                <p className="text-xs text-[#667085] uppercase">Hours by job</p>
                <p className="text-xl font-semibold text-[#172033] mt-1">{jobs.length}</p>
              </div>
              <div className="rounded-xl border p-3 bg-[#fbfaf7]" style={{ borderColor: "#e4e0d8" }}>
                <p className="text-xs text-[#667085] uppercase">Pay period summary</p>
                <p className="mt-2"><span className={statusChipClass(totals.periodStatus)}>{payrollStatusLabel}</span></p>
              </div>
              <div className="rounded-xl border p-3 bg-[#fbfaf7]" style={{ borderColor: "#e4e0d8" }}>
                <p className="text-xs text-[#667085] uppercase">Payroll notes</p>
                <p className="text-sm text-[#172033] mt-1">Use Team notes for payroll admin context.</p>
              </div>
            </div>
          </section>
        </div>

        {loading && (
          <div className="cx-loading-state">
            <p className="text-sm text-[#667085]">Loading payroll workspace…</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
