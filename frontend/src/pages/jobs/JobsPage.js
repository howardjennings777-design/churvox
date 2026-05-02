import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import {
  Plus, Search, MapPin, Trash2, Briefcase, ClipboardList, CalendarDays,
  UserCheck, Sparkles, ListChecks, AlertTriangle, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, JOB_STATUSES } from "../../lib/utils";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumButton, PremiumBadge,
  PremiumAIBox, PremiumAIDraftPanel, PremiumEmptyState, PremiumLoadingState, PremiumStatusBadge,
} from "../../components/premium";

export default function JobsPage() {
  const navigate = useNavigate();
  const { isEmployer, normalizedRole } = useAuth();
  const { get, del, loading } = useApi();
  const [jobs, setJobs] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);

  const isWorker = normalizedRole === "worker";

  const fetchJobs = useCallback(async () => {
    const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    const res = await get(`/jobs${params}`);
    if (res.success) setJobs(res.data);
    setPageLoading(false);
  }, [get, statusFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

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
    const q = search.toLowerCase();
    return jobs.filter((j) =>
      (j.title?.toLowerCase().includes(q) ||
       j.customer_name?.toLowerCase().includes(q) ||
       j.address?.toLowerCase().includes(q))
    );
  }, [jobs, search]);

  // AI insights
  const aiSuggestions = useMemo(() => {
    const out = [];
    const unassigned = jobs.filter((j) => !j.assigned_worker_id && j.status !== "completed");
    const inProgress = jobs.filter((j) => j.status === "in_progress");
    const paused = jobs.filter((j) => j.status === "paused");
    const completedNoInvoice = jobs.filter((j) => j.status === "completed");

    if (unassigned.length > 0) {
      out.push({
        icon: <UserCheck className="h-4 w-4" />,
        title: `${unassigned.length} unassigned job${unassigned.length === 1 ? "" : "s"}`,
        description: "Open the dispatch board to assign workers.",
        action: <PremiumButton size="sm" variant="secondary" onClick={() => navigate("/dispatch")}>Dispatch</PremiumButton>,
      });
    }
    if (paused.length > 0) {
      out.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        title: `${paused.length} paused job${paused.length === 1 ? "" : "s"} — draft a status update`,
        description: "AI can summarise progress and prepare a customer message — review before sending.",
      });
    }
    if (inProgress.length > 0) {
      out.push({
        icon: <ListChecks className="h-4 w-4" />,
        title: `${inProgress.length} jobs currently in progress`,
        description: "AI can summarise notes, photos and timer activity for any job in seconds.",
      });
    }
    if (completedNoInvoice.length > 0) {
      out.push({
        icon: <Sparkles className="h-4 w-4" />,
        title: `${completedNoInvoice.length} completed job${completedNoInvoice.length === 1 ? "" : "s"} ready to invoice`,
        description: "Convert finished work into invoices and follow up with the customer.",
      });
    }
    if (out.length === 0) {
      out.push({ icon: <Sparkles className="h-4 w-4" />, title: "All clear", description: "No urgent job actions right now." });
    }
    return out.slice(0, 4);
  }, [jobs, navigate]);

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<Briefcase className="h-7 w-7" />}
          eyebrow={<><ClipboardList className="h-3 w-3" /> Work orders</>}
          title="Jobs & Dispatch"
          subtitle="Today's run sheet, in-progress work, ready-to-invoice jobs and crew assignments — in one premium dispatch view."
          actions={
            isEmployer ? (
              <>
                <PremiumButton onClick={() => navigate("/jobs/new")} iconLeft={<Plus className="h-4 w-4" />}>New job</PremiumButton>
                <PremiumButton variant="secondary" onClick={() => navigate("/dispatch")} iconLeft={<CalendarDays className="h-4 w-4" />}>Dispatch board</PremiumButton>
              </>
            ) : null
          }
        />

        {/* AI Assistant — only for non-workers (workers don't see pricing/global summary) */}
        {!isWorker && (
          <PremiumAIBox
            title="AI Job Assistant"
            subtitle="Summarise jobs, draft customer updates, and suggest next actions — review before sending"
            chip="Approval-first"
            suggestions={aiSuggestions}
          />
        {!isWorker && <PremiumAIDraftPanel title="AI Job Drafts" subtitle="Generate concise job summaries, customer updates, and next actions." surface="jobs" context={{ role: normalizedRole, statusFilter, search, visible_jobs: filtered.slice(0, 12).map((j) => ({ title: j.title, status: j.status, customer_name: j.customer_name })) }} quickActions={[{ label: "Job action list", prompt: "Generate a concise job action list for today." }, { label: "Customer message", prompt: "Draft a concise customer update for active jobs." }, { label: "Owner summary", prompt: "Summarise jobs needing owner attention." }]} />}
        )}

        {/* Filters */}
        <PremiumCard noBody bodyClassName="">
          <div className="px-card__body flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8ba3]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, client or address…"
                className="px-input pl-10"
                data-testid="jobs-search"
              />
            </div>
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8ba3] pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-select pl-9 pr-8 min-w-[180px]"
                data-testid="jobs-status-filter"
              >
                <option value="all">All statuses</option>
                {JOB_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </PremiumCard>

        {/* Job list */}
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
          <div className="space-y-3">
            {filtered.map((job) => (
              <div
                key={job.id}
                className="px-card px-card--hover cursor-pointer"
                onClick={() => navigate(`/jobs/${job.id}`)}
                data-testid={`job-card-${job.id}`}
              >
                <div className="px-card__body">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <PremiumBadge tone="soft" icon={<ClipboardList className="h-3 w-3" />}>Work order</PremiumBadge>
                        <h3 className="font-heading font-bold text-[15.5px] text-[#0d1b34] truncate">{job.title}</h3>
                        <PremiumStatusBadge status={job.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[12.5px] text-[#5b6c87]">
                        {job.customer_name && (
                          <span><span className="text-[#1a2c4d] font-semibold">Customer:</span> {job.customer_name}</span>
                        )}
                        {job.address && (
                          <span className="flex items-center gap-1"><MapPin size={11} /><span className="text-[#1a2c4d] font-semibold">Address:</span> {job.address}</span>
                        )}
                        <span className="flex items-center gap-1"><CalendarDays size={11} /><span className="text-[#1a2c4d] font-semibold">Date:</span> {formatDate(job.scheduled_date)}</span>
                        {!isWorker && job.price > 0 && (
                          <span className="text-[#1d4ed8] font-semibold">{formatCurrency(job.price)}</span>
                        )}
                      </div>
                      {job.assigned_worker_name && (
                        <p className="text-[12.5px] text-[#0d9488] mt-2 flex items-center gap-1.5">
                          <UserCheck size={12} /> Assigned to <span className="font-semibold text-[#1a2c4d]">{job.assigned_worker_name}</span>
                        </p>
                      )}
                    </div>
                    {isEmployer && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(job.id); }}
                        className="px-btn px-btn--ghost px-btn--sm text-[#94a3b8] hover:!text-[#dc2626]"
                        data-testid={`delete-job-${job.id}`}
                        title="Delete job"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete modal */}
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
      </PremiumPage>
    </Layout>
  );
}

