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
  const [pageLoading, setPageLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);

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

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return (j.title?.toLowerCase().includes(q) || j.customer_name?.toLowerCase().includes(q) || j.address?.toLowerCase().includes(q));
  });

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4" data-testid="jobs-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900" data-testid="jobs-heading">Jobs</h1>
          {isEmployer && (
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="new-job-button">
              <Link to="/jobs/new"><Plus size={16} className="mr-2" /> New Job</Link>
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." className="pl-9 bg-white border-slate-200 text-slate-900" data-testid="jobs-search" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-white border-slate-200 text-slate-900" data-testid="jobs-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 shadow-sm">
              <SelectItem value="all">All</SelectItem>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading state */}
        {pageLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Briefcase size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-900 font-medium mb-1">{search ? "No jobs match your search" : "No jobs yet"}</p>
            <p className="text-xs text-slate-500 mb-4">
              {search ? "Try a different search term" : "Create your first job to start tracking work"}
            </p>
            {!search && isEmployer && (
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Link to="/jobs/new" data-testid="create-first-job"><Plus size={14} className="mr-1" /> Create Your First Job</Link>
                </Button>
              )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((job) => {
              const statusInfo = JOB_STATUS_MAP[job.status];
              return (
                <Card key={job.id} className="bg-white border-slate-200 hover:border-blue-600/40 transition-all" data-testid={`job-card-${job.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <Link to={`/jobs/${job.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-slate-900 font-medium truncate">{job.title}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase text-slate-900 ${statusInfo?.color || "bg-slate-500"}`}>
                            {statusInfo?.label || job.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                          {job.customer_name && <span>{job.customer_name}</span>}
                          {job.address && <span className="flex items-center gap-1"><MapPin size={11} /> {job.address}</span>}
                          <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(job.scheduled_date)}</span>
                          {job.price > 0 && <span className="text-blue-600 font-medium">{formatCurrency(job.price)}</span>}
                        </div>
                        {job.assigned_worker_name && (
                          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <UserCheck size={12} /> {job.assigned_worker_name}
                          </p>
                        )}
                      </Link>
                      {isEmployer && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(job.id)} className="text-slate-500 hover:text-red-400 ml-2" data-testid={`delete-job-${job.id}`}>
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
            <div className="relative z-10 w-full max-w-md mx-4 rounded-lg border bg-white border-slate-200 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white">Delete Job</h2>
              <p className="mt-2 text-sm text-slate-500">Are you sure? This cannot be undone.</p>
              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-blue-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="confirm-delete-job"
                  disabled={loading}
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-slate-900 bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
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
