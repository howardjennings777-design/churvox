import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Button } from "../../components/ui/button";
import { Plus, MapPin, Clock, UserCheck, Trash2, Briefcase, CalendarDays, AlertTriangle, CheckCircle2, PlayCircle, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "../../lib/utils";
import { AppShell, EmptyState, LoadingState, SearchInput, StatusBadge } from "../../components/premium/PremiumUI";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

function extractList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function getJobTitle(job) {
  return job?.title || job?.job_type || job?.type || "Untitled job";
}

function getClientIdFromJob(job) {
  return String(
    job?.client_id ||
    job?.clientId ||
    job?.customer_id ||
    job?.customerId ||
    job?.client?.id ||
    job?.client?._id ||
    job?.customer?.id ||
    job?.customer?._id ||
    ""
  ).trim();
}

function getClientId(client) {
  return String(client?.id || client?._id || client?.client_id || client?.customer_id || "").trim();
}

function getClientDisplayName(client) {
  return (
    client?.name ||
    client?.client_name ||
    client?.customer_name ||
    client?.business_name ||
    client?.company_name ||
    client?.contact_name ||
    client?.full_name ||
    client?.email ||
    ""
  );
}

function getClientName(job, clientLookup = {}) {
  const directName =
    job?.customer_name ||
    job?.client_name ||
    job?.customer?.name ||
    job?.customer?.customer_name ||
    job?.customer?.client_name ||
    job?.client?.name ||
    job?.client?.client_name ||
    job?.client?.customer_name ||
    job?.client?.business_name ||
    job?.client?.company_name;

  if (directName) return directName;

  const id = getClientIdFromJob(job);
  if (id && clientLookup[id]) return clientLookup[id];

  return "No client set";
}

function getWorkerName(job) {
  return job?.assigned_worker_name || job?.worker_name || job?.assigned_to_name || "Unassigned";
}

function getJobDate(job) {
  return job?.scheduled_date || job?.date || job?.start_date || job?.created_at || "";
}

function isSameDay(dateValue, compareDate) {
  if (!dateValue) return false;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toDateString() === compareDate.toDateString();
}

function isOverdue(job) {
  const status = normalise(job?.status);
  if (["completed", "cancelled"].includes(status)) return false;
  const dateValue = getJobDate(job);
  if (!dateValue) return false;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return parsed < today;
}

function StatCard({ icon: Icon, label, value, tone = "blue" }) {
  const toneClass = {
    blue: "bg-blue-500/15 text-blue-100 border-blue-200/20",
    green: "bg-emerald-500/15 text-emerald-100 border-emerald-200/20",
    amber: "bg-amber-500/15 text-amber-100 border-amber-200/20",
    red: "bg-red-500/15 text-red-100 border-red-200/20",
    slate: "bg-white/10 text-slate-100 border-white/15",
  }[tone] || "bg-white/10 text-slate-100 border-white/15";

  return (
    <div className={`rounded-2xl border p-4 backdrop-blur ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-current/75">{label}</p>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <p className="mt-3 text-3xl font-black leading-none text-white">{value}</p>
    </div>
  );
}

export default function JobsPage() {
  const navigate = useNavigate();
  const { isEmployer, normalizedRole } = useAuth();
  const { get, del, post, loading } = useApi();
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);
  const [jobControl, setJobControl] = useState(null);

  const clientLookup = useMemo(() => {
    const lookup = {};
    clients.forEach((client) => {
      const id = getClientId(client);
      const name = getClientDisplayName(client);
      if (id && name) lookup[id] = name;
    });
    return lookup;
  }, [clients]);

  const fetchJobs = useCallback(async () => {
    setPageLoading(true);
    const [jobsRes, clientsRes, jobControlRes] = await Promise.all([
      get("/jobs"),
      get("/clients"),
      get("/ai/job-control"),
    ]);

    if (jobsRes.success) setJobs(extractList(jobsRes.data, ["jobs", "items", "data"]));
    if (clientsRes.success) setClients(extractList(clientsRes.data, ["clients", "items", "data"]));
    if (jobControlRes.success) setJobControl(jobControlRes.data?.snapshot || null);

    setPageLoading(false);
  }, [get]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await del(`/jobs/${deleteId}`);
    if (res.success) {
      toast.success("Job deleted");
      setDeleteId(null);
      fetchJobs();
    } else toast.error(res.error || "Failed to delete");
  };

  const handleCreateJobUpdateDraft = async (jobId) => {
    const res = await post("/ai/drafts/create", {
      type: "customer_update",
      source_record_id: jobId,
      source_record_type: "job",
    });
    if (res?.success) toast.success("AI job update draft created");
    else toast.error(res?.error || "Could not create AI draft");
  };

  const stats = useMemo(() => {
    const today = new Date();
    return {
      total: jobs.length,
      today: jobs.filter((job) => isSameDay(getJobDate(job), today)).length,
      assigned: jobs.filter((job) => normalise(job.status) === "assigned").length,
      inProgress: jobs.filter((job) => normalise(job.status) === "in_progress").length,
      completed: jobs.filter((job) => normalise(job.status) === "completed").length,
      overdue: jobs.filter(isOverdue).length,
    };
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = normalise(search);
    const today = new Date();

    return jobs.filter((job) => {
      const haystack = [
        getJobTitle(job),
        getClientName(job, clientLookup),
        job?.address,
        getWorkerName(job),
        job?.status,
      ].map(normalise).join(" ");

      const matchesSearch = !q || haystack.includes(q);
      if (!matchesSearch) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "today") return isSameDay(getJobDate(job), today);
      if (statusFilter === "overdue") return isOverdue(job);
      return normalise(job.status) === statusFilter;
    });
  }, [jobs, clientLookup, search, statusFilter]);

  const activeDeleteJob = jobs.find((job) => String(job.id || job._id) === String(deleteId));

  return (
    <Layout>
      <AppShell className="max-w-7xl">
        <section className="overflow-hidden rounded-3xl border border-slate-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl lg:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Churvox jobs</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Jobs Command Board</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                Track scheduled, assigned, in-progress, and completed work from one clean operational board.
              </p>
            </div>
            {isEmployer ? (
              <Button asChild className="bg-white text-slate-950 hover:bg-slate-100 shadow-xl">
                <Link to="/jobs/new"><Plus size={16} className="mr-2" /> New Job</Link>
              </Button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard icon={Briefcase} label="Total" value={stats.total} tone="slate" />
            <StatCard icon={CalendarDays} label="Today" value={stats.today} tone="blue" />
            <StatCard icon={ClipboardList} label="Assigned" value={stats.assigned} tone="slate" />
            <StatCard icon={PlayCircle} label="In Progress" value={stats.inProgress} tone="blue" />
            <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} tone="green" />
            <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} tone={stats.overdue ? "red" : "amber"} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/86 p-4 shadow-lg shadow-slate-200/70 backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex-1">
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client, address, worker, or job title" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
              {FILTERS.map((filter) => {
                const active = statusFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={`whitespace-nowrap rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                      active
                        ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {pageLoading ? <LoadingState title="Loading jobs" /> : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No jobs match your search" : "No jobs yet"}
            description={search ? "Try a different search term or filter." : "Create your first job to start scheduling and field execution."}
            action={!search && isEmployer ? <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"><Link to="/jobs/new"><Plus size={14} className="mr-1" /> Create First Job</Link></Button> : null}
          />
        ) : (
          <section className="space-y-3">
            {filtered.map((job) => {
              const jobId = job.id || job._id;
              const title = getJobTitle(job);
              const clientName = getClientName(job, clientLookup);
              const workerName = getWorkerName(job);
              const date = getJobDate(job);
              const overdue = isOverdue(job);
              const price = Number(job.price || job.amount || job.total || 0);

              return (
                <article
                  key={jobId}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/jobs/${jobId}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") navigate(`/jobs/${jobId}`);
                  }}
                  className="group cursor-pointer rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/80 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/90"
                  data-testid={`job-card-${jobId}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-black text-slate-950 sm:text-lg">{title}</h3>
                        <StatusBadge status={job.status} />
                        {overdue ? (
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-red-700">
                            Overdue
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                        <span className="min-w-0 truncate font-semibold text-slate-800">{clientName}</span>
                        <span className="flex min-w-0 items-center gap-1.5 truncate"><MapPin size={14} className="shrink-0 text-slate-400" />{job.address || "No address set"}</span>
                        <span className="flex min-w-0 items-center gap-1.5 truncate"><Clock size={14} className="shrink-0 text-slate-400" />{date ? formatDate(date) : "No date"} {job.scheduled_time || ""}</span>
                        <span className="flex min-w-0 items-center gap-1.5 truncate"><UserCheck size={14} className="shrink-0 text-slate-400" />{workerName}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:justify-end">
                      {normalizedRole !== "worker" && price > 0 ? (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">
                          {formatCurrency(price)}
                        </div>
                      ) : null}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/jobs/${jobId}`);
                        }}
                        className="border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700"
                      >
                        Open Job
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCreateJobUpdateDraft(jobId);
                        }}
                      >
                        AI job update draft
                      </Button>

                      {isEmployer ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteId(jobId);
                          }}
                          className="text-slate-400 opacity-70 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          aria-label={`Delete ${title}`}
                        >
                          <Trash2 size={15} />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {!!deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border bg-white border-slate-200 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900">Delete Job</h2>
              <p className="mt-2 text-sm text-slate-500">
                Delete {activeDeleteJob ? `“${getJobTitle(activeDeleteJob)}”` : "this job"}? This cannot be undone.
              </p>
              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button type="button" onClick={() => setDeleteId(null)} className="cx-button-secondary">Cancel</button>
                <button type="button" disabled={loading} onClick={handleDelete} className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">{loading ? "Deleting…" : "Delete"}</button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </Layout>
  );
}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">AI Job Control Tower</p>
              <p className="text-sm font-semibold text-slate-600">AI highlights job risks. It does not assign workers, change job status, send messages, or create live invoices without approval.</p>
            </div>
            <Button variant="outline" onClick={async()=>{const r=await post('/ai/job-control/generate',{}); if(r?.success){setJobControl(r.data?.snapshot||null); toast.success('Job control generated');} else toast.error(r?.error||'Could not generate job control');}}>Generate job control</Button>
          </div>
          {!jobControl ? <p className="mt-3 text-sm font-semibold text-slate-500">No job risks found yet. Churvox will highlight unassigned, overdue, stuck and completed-not-invoiced jobs here.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{[["Open",jobControl.open_jobs_count],["Unassigned",jobControl.unassigned_jobs_count],["Overdue",jobControl.overdue_jobs_count],["Paused",jobControl.paused_jobs_count],["Completed not invoiced",jobControl.completed_uninvoiced_count],["Risk",jobControl.risk_level]].map(([k,v]) => <div key={k} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-500">{k}</p><p className="text-lg font-black text-slate-950">{String(v ?? 0)}</p></div>)}</div>}
        </section>

