import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { Briefcase, Clock, MapPin, ChevronRight } from "lucide-react";

const STATUS_COLORS = {
  assigned: "bg-blue-100 text-blue-700",
  acknowledged: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  paused: "bg-slate-200 text-slate-600",
  completed: "bg-emerald-100 text-emerald-700",
};

export default function WorkerJobsPage() {
  const { user } = useAuth();
  const { get } = useApi();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const res = await get("/jobs");
    if (res.success) setJobs(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, [get]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Jobs</h1>
            <p className="text-sm text-slate-500">{user?.name || "Worker"}</p>
          </div>
          <Link to="/worker/settings" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Settings</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-slate-500 font-medium">No jobs assigned yet</p>
            <p className="text-sm text-slate-400">Jobs assigned to you will appear here.</p>
          </div>
        ) : (
          jobs.map((job) => {
            const id = job.id || job._id;
            const status = (job.status || "assigned").toLowerCase();
            return (
              <Link
                key={id}
                to={`/worker/jobs/${id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition-colors"
                data-testid={`worker-job-${id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate">{job.title || "Untitled Job"}</h3>
                    {job.client_name && <p className="text-sm text-slate-500 mt-0.5">{job.client_name}</p>}
                    {job.address && (
                      <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />{job.address}
                      </p>
                    )}
                    {job.scheduled_date && (
                      <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {String(job.scheduled_date).slice(0, 10)}
                        {job.scheduled_time ? ` at ${job.scheduled_time}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[status] || "bg-slate-100 text-slate-600"}`}>
                      {status.replace(/_/g, " ")}
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </main>
    </div>
  );
}
