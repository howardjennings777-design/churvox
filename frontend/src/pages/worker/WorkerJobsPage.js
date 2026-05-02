import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { Briefcase, Clock, MapPin, ChevronRight, LogOut, Settings, Sparkles } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import { PremiumStatusBadge } from "@/components/premium";

export default function WorkerJobsPage() {
  const { user, logout } = useAuth();
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
    <div className="px-app min-h-screen">
      <header className="px-mobile-header">
        <ChurvoxLogo size="sm" />
        <div className="flex items-center gap-2">
          <Link to="/worker/settings" className="px-btn px-btn--ghost px-btn--sm" title="Settings"><Settings className="h-4 w-4" /></Link>
          <button onClick={logout} className="px-btn px-btn--ghost px-btn--sm" title="Log out"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className="px-hero" style={{ padding: '20px' }}>
          <span className="px-hero__eyebrow"><Briefcase className="h-3 w-3" /> My work</span>
          <h1 className="px-hero__title" style={{ fontSize: '22px' }}>Hello, {user?.name?.split(" ")[0] || "team"}</h1>
          <p className="px-hero__sub">Your assigned jobs, schedule and quick status updates — all in one place.</p>
        </div>

        {loading ? (
          <div className="px-loading"><div className="px-loading__spinner" /><p className="text-[13px] text-[#5b6c87]">Loading your jobs…</p></div>
        ) : jobs.length === 0 ? (
          <div className="px-empty">
            <div className="px-empty__icon"><Briefcase className="h-6 w-6" /></div>
            <h3 className="px-empty__title">No jobs assigned yet</h3>
            <p className="px-empty__sub">Jobs assigned to you will appear here. Check back soon.</p>
          </div>
        ) : (
          jobs.map((job) => {
            const id = job.id || job._id;
            return (
              <Link
                key={id}
                to={`/worker/jobs/${id}`}
                className="px-card px-card--hover block"
                data-testid={`worker-job-${id}`}
              >
                <div className="px-card__body">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[15px] text-[#0d1b34] truncate">{job.title || "Untitled Job"}</h3>
                        <PremiumStatusBadge status={job.status} />
                      </div>
                      {job.client_name && <p className="text-[13px] text-[#5b6c87] mt-1">{job.client_name}</p>}
                      {job.address && (
                        <p className="text-[12.5px] text-[#7d8ba3] mt-1 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />{job.address}
                        </p>
                      )}
                      {job.scheduled_date && (
                        <p className="text-[12.5px] text-[#7d8ba3] mt-1 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {String(job.scheduled_date).slice(0, 10)}
                          {job.scheduled_time ? ` at ${job.scheduled_time}` : ""}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#94a3b8]" />
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
