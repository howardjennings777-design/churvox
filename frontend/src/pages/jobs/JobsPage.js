import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Plus, Search, MapPin, Clock, UserCheck, Trash2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, JOB_STATUSES, JOB_STATUS_MAP } from "../../lib/utils";
import PageState from "../../components/ui/PageState";

export default function JobsPage() {
  const { isEmployer } = useAuth();
  const { get, del, loading } = useApi();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);

  const fetchJobs = useCallback(async () => {
    const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    const res = await get(`/jobs${params}`);
    if (res.success) setJobs(res.data);
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

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return (j.title?.toLowerCase().includes(q) || j.customer_name?.toLowerCase().includes(q) || j.address?.toLowerCase().includes(q));
  });

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4" data-testid="jobs-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white" data-testid="jobs-heading">Jobs</h1>
          {isEmployer && (
            <Button asChild className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="new-job-button">
              <Link to="/jobs/new"><Plus size={16} className="mr-2" /> New Job</Link>
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-churvox-muted" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." className="pl-9 bg-churvox-card border-churvox-border text-white" data-testid="jobs-search" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-churvox-card border-churvox-border text-white" data-testid="jobs-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-churvox-card border-churvox-border">
              <SelectItem value="all" className="text-white">All</SelectItem>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-white">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Jobs List */}
        {filtered.length === 0 ? (
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-8 text-center">
              <Briefcase size={32} className="mx-auto mb-3 text-churvox-muted/40" />
              <p className="text-white font-medium mb-1">{search ? "No jobs match your search" : "No jobs yet"}</p>
              <p className="text-xs text-churvox-muted mb-4">
                {search ? "Try a different search term or clear filters" : "Create your first job to start tracking work, scheduling, and invoicing"}
              </p>
              {!search && isEmployer && (
                <Button asChild size="sm" className="bg-churvox-accent hover:bg-churvox-accent/90">
                  <Link to="/jobs/new" data-testid="create-first-job"><Plus size={14} className="mr-1" /> Create Your First Job</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((job) => {
              const statusInfo = JOB_STATUS_MAP[job.status];
              return (
                <Card key={job.id} className="bg-churvox-card border-churvox-border hover:border-churvox-accent/40 transition-all" data-testid={`job-card-${job.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <Link to={`/jobs/${job.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium truncate">{job.title}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase text-white ${statusInfo?.color || "bg-slate-500"}`}>
                            {statusInfo?.label || job.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-churvox-muted">
                          {job.customer_name && <span>{job.customer_name}</span>}
                          {job.address && <span className="flex items-center gap-1"><MapPin size={11} /> {job.address}</span>}
                          <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(job.scheduled_date)}</span>
                          {job.price > 0 && <span className="text-churvox-accent font-medium">{formatCurrency(job.price)}</span>}
                        </div>
                        {job.assigned_worker_name && (
                          <p className="text-xs text-churvox-accent mt-1 flex items-center gap-1">
                            <UserCheck size={12} /> {job.assigned_worker_name}
                          </p>
                        )}
                      </Link>
                      {isEmployer && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(job.id)} className="text-churvox-muted hover:text-red-400 ml-2" data-testid={`delete-job-${job.id}`}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation – plain modal, no Radix DismissableLayer */}
        {!!deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="delete-job-dialog">
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteId(null)} />
            {/* modal card */}
            <div className="relative z-10 w-full max-w-md mx-4 rounded-lg border bg-churvox-card border-churvox-border p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white">Delete Job</h2>
              <p className="mt-2 text-sm text-churvox-muted">Are you sure? This cannot be undone.</p>
              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="inline-flex items-center justify-center rounded-md border border-churvox-border px-4 py-2 text-sm font-medium text-churvox-muted hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="confirm-delete-job"
                  disabled={loading}
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
