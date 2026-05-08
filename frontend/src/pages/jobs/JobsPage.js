import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import {
  Plus, Search, MapPin, Trash2, Briefcase, CalendarDays,
  UserCheck, Sparkles, AlertTriangle, Filter, ArrowRight, Clock3, DollarSign,
  Route, CheckCircle2, Users, ReceiptText, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, JOB_STATUSES } from "../../lib/utils";
import EntityDetailModal from "../../components/EntityDetailModal";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumButton, PremiumBadge, PremiumEmptyState,
  PremiumLoadingState, PremiumStatusBadge, PremiumStatCard
} from "../../components/premium";

const safeArray = (v) => (Array.isArray(v) ? v : []);
const safeText = (v, fallback = "—") => {
  const text = String(v || "").trim();
  return text || fallback;
};
const safeNumber = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
};
const dateKey = (v) => String(v || "").slice(0, 10);
const todayKey = () => new Date().toISOString().slice(0, 10);
const jobStatus = (job) => String(job?.status || job?.job_status || job?.workflow_status || "scheduled").toLowerCase();
const isUnassigned = (job) => !job?.assigned_worker_id && !job?.assigned_worker_name && !job?.worker_id;
const isReadyToInvoice = (job) => ["completed", "done"].includes(jobStatus(job)) && !job?.invoice_id && !job?.invoice_created;

export default function JobsPage() {
  const navigate = useNavigate();
  const { isEmployer, normalizedRole } = useAuth();
  const { get, post, del, loading } = useApi();
  const [jobs, setJobs] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);
  const [activeJob, setActiveJob] = useState(null);

  const isWorker = normalizedRole === "worker";

  const fetchJobs = useCallback(async () => {
    setPageLoading(true);
    const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    const res = await get(`/jobs${params}`);
    if (res.success) setJobs(safeArray(res.data));
    setPageLoading(false);
  }, [get, statusFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const runAiJobOperator = async () => {
    setAiBusy(true);
    try {
      const [operatorRes, invoiceRes] = await Promise.all([
        post("/ai/operator/prepare-today", {}),
        post("/invoices/automation/run", {}),
      ]);
      const operatorData = operatorRes?.data || operatorRes || {};
      const invoiceData = invoiceRes?.data || invoiceRes || {};
      const preparedCount = operatorData.count || safeArray(operatorData.actions).length || 0;

      if (operatorRes?.success || operatorRes?.ok || operatorData?.ok) {
        toast.success(`${preparedCount} AI approval action(s) prepared`);
      } else {
        toast.error(operatorRes?.error || operatorData?.message || "AI job operator could not prepare actions");
      }

      if (invoiceRes?.success || invoiceRes?.ok || invoiceData?.ok) {
        toast.success(invoiceData.message || "Invoice automation ran: drafts and reminders prepared");
      } else if (invoiceRes?.error || invoiceData?.message) {
        toast.error(invoiceRes?.error || invoiceData?.message || "Invoice automation failed");
      }
      await fetchJobs();
    } finally {
      setAiBusy(false);
    }
  };

  const runInvoiceHandoff = async () => {
    setAiBusy(true);
    try {
      const r = await post("/invoices/automation/run", {});
      const data = r?.data || r || {};
      if (r?.success || r?.ok || data?.ok) {
        toast.success(data.message || "Invoice handoff complete");
        navigate("/invoices");
      } else {
        toast.error(r?.error || data?.message || "Invoice handoff failed");
      }
    } finally {
      setAiBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await del(`/jobs/${deleteId}`);
    if (res.success) {
      toast.success("Job deleted");
      setDeleteId(null);
      fetchJobs();
    } else {
      toast.error(res.error || "Failed to delete");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return safeArray(jobs).filter((j) => {
      const pool = [j.title, j.customer_name, j.client_name, j.address, j.status, j.assigned_worker_name]
        .map((x) => String(x || "")).join(" ").toLowerCase();
      return !q || pool.includes(q);
    });
  }, [jobs, search]);

  const metrics = useMemo(() => {
    const list = safeArray(jobs);
    const today = todayKey();
    const unassigned = list.filter(isUnassigned);
    const active = list.filter((j) => ["in_progress", "in-progress", "assigned", "acknowledged", "scheduled"].includes(jobStatus(j)));
    const completed = list.filter((j) => ["completed", "done"].includes(jobStatus(j)));
    const readyToInvoice = list.filter(isReadyToInvoice);
    const todayJobs = list.filter((j) => dateKey(j.scheduled_date) === today);
    const moneyReady = readyToInvoice.reduce((sum, j) => sum + safeNumber(j.price || j.job_price || j.fixed_price || j.total), 0);
    return {
      total: list.length,
      today: todayJobs.length,
      unassigned: unassigned.length,
      active: active.length,
      completed: completed.length,
      readyToInvoice: readyToInvoice.length,
      moneyReady,
    };
  }, [jobs]);

  const priorityJobs = useMemo(() => {
    const priority = safeArray(jobs)
      .filter((j) => isUnassigned(j) || isReadyToInvoice(j) || dateKey(j.scheduled_date) === todayKey())
      .sort((a, b) => {
        const ap = isUnassigned(a) ? 3 : isReadyToInvoice(a) ? 2 : 1;
        const bp = isUnassigned(b) ? 3 : isReadyToInvoice(b) ? 2 : 1;
        if (ap !== bp) return bp - ap;
        return String(a.scheduled_date || "9999").localeCompare(String(b.scheduled_date || "9999"));
      })
      .slice(0, 4);
    return priority;
  }, [jobs]);

  const aiHeadline = metrics.unassigned > 0
    ? "Crew decisions ready"
    : metrics.readyToInvoice > 0
      ? "Invoice handoff ready"
      : metrics.today > 0
        ? "Today is under control"
        : "Work board clear";

  const showMoney = !isWorker;

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<Briefcase className="h-7 w-7" />}
          eyebrow={<><Briefcase className="h-3 w-3" /> Work orders</>}
          title="Jobs Command Centre"
          subtitle="A cleaner run sheet for today’s work, unassigned jobs, completed jobs ready for invoices, and the next owner decisions."
          actions={
            isEmployer ? (
              <>
                <PremiumButton onClick={() => navigate("/jobs/new")} iconLeft={<Plus className="h-4 w-4" />}>New job</PremiumButton>
                <PremiumButton onClick={runAiJobOperator} disabled={aiBusy} iconLeft={aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}>Run AI Autopilot</PremiumButton>
                <PremiumButton variant="secondary" onClick={() => navigate("/dispatch")} iconLeft={<Route className="h-4 w-4" />}>Dispatch board</PremiumButton>
              </>
            ) : null
          }
        />

        {!isWorker && (
          <section className="jobs-command-strip">
            <div className="jobs-command-main">
              <span><Sparkles className="h-4 w-4" /> AI job autopilot</span>
              <h2>{aiHeadline}</h2>
              <p>
                {metrics.unassigned > 0
                  ? `${metrics.unassigned} job${metrics.unassigned === 1 ? "" : "s"} still need crew. AI prepares worker matches for owner approval and automatically handles invoice/admin drafts.`
                  : metrics.readyToInvoice > 0
                    ? `${metrics.readyToInvoice} completed job${metrics.readyToInvoice === 1 ? "" : "s"} can move into invoice draft review automatically.`
                    : `${metrics.today} job${metrics.today === 1 ? "" : "s"} scheduled today. AI keeps the admin moving while owner approves risky actions.`}
              </p>
            </div>
            <div className="jobs-command-actions">
              <button onClick={runAiJobOperator} disabled={aiBusy}>{aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Run AI Autopilot</button>
              <button onClick={runInvoiceHandoff} disabled={aiBusy}><ReceiptText className="h-4 w-4" /> Auto invoice handoff</button>
              <button onClick={() => { setStatusFilter("all"); setSearch(""); fetchJobs(); }}><Clock3 className="h-4 w-4" /> Refresh run sheet</button>
            </div>
            <div className="jobs-priority-stack">
              <b>Owner priorities</b>
              {priorityJobs.length ? priorityJobs.map((job) => (
                <button key={job.id || job._id || job.title} onClick={() => setActiveJob(job)}>
                  <span>{safeText(job.title, "Untitled job")}</span>
                  <strong>{isUnassigned(job) ? "Needs crew" : isReadyToInvoice(job) ? "Ready to invoice" : "Today"}</strong>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )) : <small>No urgent job actions right now.</small>}
            </div>
          </section>
        )}

        <div className="px-grid px-grid--4 jobs-stat-grid">
          <PremiumStatCard label="Total jobs" value={metrics.total} icon={<Briefcase className="h-4 w-4" />} onClick={() => setStatusFilter("all")} />
          <PremiumStatCard label="Today" value={metrics.today} icon={<CalendarDays className="h-4 w-4" />} tone="sky" />
          <PremiumStatCard label="Need crew" value={metrics.unassigned} icon={<Users className="h-4 w-4" />} tone={metrics.unassigned ? "amber" : "blue"} onClick={runAiJobOperator} />
          <PremiumStatCard label="In motion" value={metrics.active} icon={<Clock3 className="h-4 w-4" />} tone="teal" />
          <PremiumStatCard label="Completed" value={metrics.completed} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
          <PremiumStatCard label="Ready to invoice" value={metrics.readyToInvoice} icon={<ReceiptText className="h-4 w-4" />} tone="amber" onClick={runInvoiceHandoff} />
          {showMoney ? <PremiumStatCard label="Ready value" value={formatCurrency(metrics.moneyReady)} icon={<DollarSign className="h-4 w-4" />} tone="blue" /> : <PremiumStatCard label="Assigned" value={metrics.total - metrics.unassigned} icon={<UserCheck className="h-4 w-4" />} />}
          <PremiumStatCard label="Attention" value={metrics.unassigned + metrics.readyToInvoice} icon={<AlertTriangle className="h-4 w-4" />} tone={metrics.unassigned + metrics.readyToInvoice ? "red" : "blue"} onClick={runAiJobOperator} />
        </div>

        <PremiumCard noBody>
          <div className="px-card__body jobs-filter-bar">
            <div className="relative jobs-search-field">
              <Search size={16} className="jobs-filter-icon" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search job, client, worker, address or status…"
                className="px-input"
                data-testid="jobs-search"
              />
            </div>
            <div className="relative jobs-select-field">
              <Filter size={14} className="jobs-filter-icon" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-select"
                data-testid="jobs-status-filter"
              >
                <option value="all">All statuses</option>
                {JOB_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </PremiumCard>

        {pageLoading ? (
          <PremiumLoadingState title="Loading jobs…" />
        ) : filtered.length === 0 ? (
          <PremiumEmptyState
            icon={<Briefcase className="h-6 w-6" />}
            title={search ? "No jobs match your search" : "No jobs yet"}
            subtitle={search ? "Try a different search term." : "Create your first job to start tracking work, photos, time and invoicing."}
            action={!search && isEmployer ? (
              <PremiumButton onClick={() => navigate("/jobs/new")} iconLeft={<Plus className="h-4 w-4" />} dataTestId="create-first-job">
                Create your first job
              </PremiumButton>
            ) : null}
          />
        ) : (
          <div className="jobclean-list">
            {filtered.map((job) => {
              const status = jobStatus(job);
              const workerName = job.assigned_worker_name || job.worker_name;
              const needsCrew = isUnassigned(job);
              const readyInvoice = isReadyToInvoice(job);
              return (
                <div
                  key={job.id || job._id || job.title}
                  className={`jobclean-row jobclean-row--${status} ${needsCrew ? "jobclean-row--needs-crew" : ""} ${readyInvoice ? "jobclean-row--ready-invoice" : ""}`}
                  onClick={() => setActiveJob(job)}
                  data-testid={`job-card-${job.id}`}
                >
                  <div className="jobclean-layout">
                    <div className="jobclean-main">
                      <div className="jobclean-topline">
                        <span className="jobclean-title">{safeText(job.title, "Untitled job")}</span>
                        <PremiumStatusBadge status={job.status} />
                        {needsCrew && <PremiumBadge tone="amber">Needs crew</PremiumBadge>}
                        {readyInvoice && <PremiumBadge tone="blue">Ready to invoice</PremiumBadge>}
                      </div>
                      <p className="jobclean-client">{safeText(job.customer_name || job.client_name, "No client")}</p>
                      <div className="jobclean-meta">
                        {job.address && <span><MapPin size={12} />{job.address}</span>}
                        <span><CalendarDays size={12} />{formatDate(job.scheduled_date) || "No date"}</span>
                        {workerName ? <span><UserCheck size={12} />{workerName}</span> : <span><Users size={12} />Unassigned</span>}
                        {showMoney && safeNumber(job.price || job.job_price || job.fixed_price) > 0 && <span className="jobclean-money">{formatCurrency(job.price || job.job_price || job.fixed_price)}</span>}
                      </div>
                    </div>

                    <div className="jobclean-next">
                      <small>Next action</small>
                      <strong>{needsCrew ? "Assign worker" : readyInvoice ? "Draft invoice" : status === "in_progress" ? "Monitor work" : "Open job"}</strong>
                    </div>

                    <div className="jobclean-actions" onClick={(e) => e.stopPropagation()}>
                      <PremiumButton size="sm" variant="secondary" onClick={() => setActiveJob(job)}>Open</PremiumButton>
                      {needsCrew && <PremiumButton size="sm" onClick={runAiJobOperator} disabled={aiBusy}>AI match</PremiumButton>}
                      {readyInvoice && <PremiumButton size="sm" onClick={runInvoiceHandoff} disabled={aiBusy}>Invoice</PremiumButton>}
                      {isEmployer && (
                        <button
                          onClick={() => setDeleteId(job.id)}
                          className="jobclean-delete"
                          data-testid={`delete-job-${job.id}`}
                          title="Delete job"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!!deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="delete-job-dialog">
            <div className="absolute inset-0 bg-[#0d1b34]/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-[#d8e3f3] bg-white p-6 shadow-2xl">
              <h2 className="font-heading text-lg font-bold text-[#0d1b34]">Delete job</h2>
              <p className="mt-2 text-[13.5px] text-[#5b6c87]">Are you sure? This cannot be undone.</p>
              <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <PremiumButton variant="secondary" onClick={() => setDeleteId(null)}>Cancel</PremiumButton>
                <PremiumButton variant="danger" onClick={handleDelete} disabled={loading} dataTestId="confirm-delete-job">
                  {loading ? "Deleting…" : "Delete"}
                </PremiumButton>
              </div>
            </div>
          </div>
        )}
        <EntityDetailModal
          open={Boolean(activeJob)}
          onClose={() => setActiveJob(null)}
          title={activeJob ? `Job details · ${activeJob.title || activeJob.id}` : "Job details"}
          entityType="job" item={activeJob}
          actions={<div className="flex justify-end"><PremiumButton variant="secondary" onClick={() => setActiveJob(null)}>Close</PremiumButton></div>}
        />
      </PremiumPage>
    </Layout>
  );
}
