import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Plus, MapPin, Clock, UserCheck, Trash2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, JOB_STATUSES } from "../../lib/utils";
import { AppShell, DataToolbar, EmptyState, LoadingState, PageHeader, SearchInput, StatusBadge } from "../../components/premium/PremiumUI";

export default function JobsPage() {
  const { isEmployer, normalizedRole } = useAuth();
  const { get, del, loading } = useApi();
  const [jobs, setJobs] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);

  const fetchJobs = useCallback(async () => {
    const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    const res = await get(`/jobs${params}`);
    if (res.success) setJobs(res.data || []);
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
    } else toast.error(res.error || "Failed to delete");
  };

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return (j.title?.toLowerCase().includes(q) || j.customer_name?.toLowerCase().includes(q) || j.address?.toLowerCase().includes(q));
  });

  return (
    <Layout>
      <AppShell className="max-w-6xl">
        <PageHeader
          title="Jobs"
          description="The heart of Churvox: track clients, site addresses, worker assignments, schedules, and live status in one premium workflow."
          action={isEmployer ? <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white"><Link to="/jobs/new"><Plus size={16} className="mr-2" /> New Job</Link></Button> : null}
        />

        <DataToolbar>
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client, address, or job title" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 bg-white border-slate-200 text-slate-900"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="bg-white border-slate-200 shadow-sm">
              <SelectItem value="all">All</SelectItem>
              {JOB_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </DataToolbar>

        {pageLoading ? <LoadingState title="Loading jobs" /> : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No jobs match your search" : "No jobs yet"}
            description={search ? "Try a different search term." : "Create your first job to start scheduling and field execution."}
            action={!search && isEmployer ? <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"><Link to="/jobs/new"><Plus size={14} className="mr-1" /> Create First Job</Link></Button> : null}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((job) => (
              <article key={job.id} className="cx-card p-4" data-testid={`job-card-${job.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="text-slate-900 font-semibold truncate">{job.title}</h3>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                      {job.customer_name && <span><span className="font-semibold text-slate-600">Client:</span> {job.customer_name}</span>}
                      {job.address && <span className="flex items-center gap-1"><MapPin size={11} />{job.address}</span>}
                      <span className="flex items-center gap-1"><Clock size={11} />{formatDate(job.scheduled_date)} {job.scheduled_time || ""}</span>
                      {normalizedRole !== "worker" && job.price > 0 && <span className="text-blue-700 font-semibold">{formatCurrency(job.price)}</span>}
                    </div>
                    {job.assigned_worker_name && <p className="text-xs text-slate-600 mt-1.5 inline-flex items-center gap-1"><UserCheck size={12} /> Assigned worker: <span className="font-semibold">{job.assigned_worker_name}</span></p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm"><Link to={`/jobs/${job.id}`}>View details</Link></Button>
                    {isEmployer && <Button variant="ghost" size="sm" onClick={() => setDeleteId(job.id)} className="text-slate-500 hover:text-red-500"><Trash2 size={14} /></Button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!!deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border bg-white border-slate-200 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900">Delete Job</h2>
              <p className="mt-2 text-sm text-slate-500">Are you sure? This cannot be undone.</p>
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
