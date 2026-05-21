import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { Briefcase, Clock3, MapPin, Play, ChevronRight, LogOut, Settings, CalendarClock, CheckCircle2, Timer, RefreshCw } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import { PremiumStatusBadge, PremiumButton, PremiumCard } from "@/components/premium";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "@/components/worker/WorkerContactOfficePanel";

const canStart = (status) => ["assigned", "acknowledged", "paused"].includes(String(status || "").toLowerCase());

export default function WorkerJobsPage() {
  const { user, logout } = useAuth();
  const { get, patch } = useApi();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState("");
  const [lastSynced, setLastSynced] = useState(null);
  const [showContactOffice, setShowContactOffice] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await get("/jobs");
    if (res.success) {
      setJobs(Array.isArray(res.data) ? res.data : []);
      setLastSynced(new Date());
    }
    else setError("Could not load your jobs. Please refresh.");
    setLoading(false);
  }, [get]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const today = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => {
    const total = jobs.length;
    const dueToday = jobs.filter((j) => String(j?.scheduled_date || "").slice(0, 10) === today).length;
    const inProgress = jobs.filter((j) => String(j?.status || "").toLowerCase() === "in_progress").length;
    const completed = jobs.filter((j) => String(j?.status || "").toLowerCase() === "completed").length;
    return { total, dueToday, inProgress, completed };
  }, [jobs, today]);

  const nextJob = useMemo(() => jobs.find((j) => String(j?.status || "").toLowerCase() !== "completed"), [jobs]);

  const handleQuickStart = async (jobId) => {
    setStartingId(jobId);
    await patch(`/jobs/${jobId}`, { status: "in_progress" });
    await fetchJobs();
    setStartingId("");
  };

  return (
    <div className="px-app min-h-screen pb-28">
      <header className="px-mobile-header">
        <ChurvoxLogo size="sm" />
        <div className="flex items-center gap-2">
          <button onClick={fetchJobs} className="px-btn px-btn--ghost px-btn--sm" title="Refresh jobs" disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
          <Link to="/worker/settings" className="px-btn px-btn--ghost px-btn--sm" title="Settings"><Settings className="h-4 w-4" /></Link>
          <button onClick={logout} className="px-btn px-btn--ghost px-btn--sm" title="Log out"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className="px-hero" style={{ padding: "20px" }}>
          <span className="px-hero__eyebrow"><Briefcase className="h-3 w-3" /> Today&apos;s Work</span>
          <h1 className="px-hero__title" style={{ fontSize: "24px" }}>Hey {user?.name?.split(" ")[0] || "team"}</h1>
          <p className="px-hero__sub">Your field schedule, actions, and status updates — ready for the day.</p>
        </div>

        <PremiumCard>
          <div className="px-card__body flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-xs font-semibold text-[var(--cx-accent)] uppercase tracking-wide">Ready for dispatch</p>
              <p className="text-xs text-[var(--cx-muted)]">Last synced: {lastSynced ? lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}</p>
            </div>
            <PremiumButton onClick={fetchJobs} disabled={loading} variant="secondary" iconLeft={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}>Refresh jobs</PremiumButton>
          </div>
        </PremiumCard>

        <div className="grid grid-cols-2 gap-2">
          <PremiumCard><div className="px-card__body py-3"><p className="text-xs text-[var(--cx-muted)]">Assigned jobs</p><p className="text-xl font-bold text-[var(--cx-text)]">{stats.total}</p></div></PremiumCard>
          <PremiumCard><div className="px-card__body py-3"><p className="text-xs text-[var(--cx-muted)]">Due today</p><p className="text-xl font-bold text-[var(--cx-text)]">{stats.dueToday}</p></div></PremiumCard>
          <PremiumCard><div className="px-card__body py-3"><p className="text-xs text-[var(--cx-muted)]">In progress</p><p className="text-xl font-bold text-[var(--cx-text)]">{stats.inProgress}</p></div></PremiumCard>
          <PremiumCard><div className="px-card__body py-3"><p className="text-xs text-[var(--cx-muted)]">Completed</p><p className="text-xl font-bold text-[var(--cx-text)]">{stats.completed}</p></div></PremiumCard>
        </div>

        {nextJob && !loading ? (
          <PremiumCard>
            <div className="px-card__body space-y-2">
              <p className="text-xs font-semibold text-[var(--cx-accent)] uppercase tracking-wide">Next job</p>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-[var(--cx-text)] truncate">{nextJob.title || "Untitled Job"}</p>
                  <PremiumStatusBadge status={nextJob.status} />
                </div>
                <Link to={`/worker/jobs/${nextJob.id || nextJob._id}`}><ChevronRight className="h-5 w-5 text-[var(--cx-muted-2)]" /></Link>
              </div>
              {nextJob.address ? <p className="text-xs text-[var(--cx-muted)] flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{nextJob.address}</p> : null}
            </div>
          </PremiumCard>
        ) : null}

        {loading ? <div className="px-loading"><div className="px-loading__spinner" /><p className="text-[13px] text-[var(--cx-muted)]">Loading today&apos;s work…</p></div> : null}
        {error ? <PremiumCard><div className="px-card__body text-sm text-red-600">{error}</div></PremiumCard> : null}

        {!loading && !error && jobs.length === 0 ? (
          <div className="px-empty">
            <div className="px-empty__icon"><Briefcase className="h-6 w-6" /></div>
            <h3 className="px-empty__title">Waiting for dispatch</h3>
            <p className="px-empty__sub">No jobs are assigned yet. Refresh your jobs page or contact the office if something looks wrong.</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
              <PremiumButton onClick={fetchJobs} iconLeft={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}>Refresh jobs</PremiumButton>
              <PremiumButton variant="secondary" className="w-full" onClick={() => setShowContactOffice(true)}>Contact office</PremiumButton>
            </div>
          </div>
        ) : null}

        {!loading && !error ? jobs.map((job) => {
          const id = job.id || job._id;
          const status = String(job.status || "assigned").toLowerCase();
          return (
            <PremiumCard key={id} className="block">
              <div className="px-card__body space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--cx-text)]">{job.title || "Untitled Job"}</p>
                    <PremiumStatusBadge status={status} />
                  </div>
                  <Link to={`/worker/jobs/${id}`}><ChevronRight className="h-5 w-5 text-[var(--cx-muted-2)]" /></Link>
                </div>
                {job.address ? <p className="text-xs text-[var(--cx-muted)] flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.address}</p> : null}
                {job.scheduled_date ? <p className="text-xs text-[var(--cx-muted)] flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{String(job.scheduled_date).slice(0, 10)} {job.scheduled_time ? `• ${job.scheduled_time}` : ""}</p> : null}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Link to={`/worker/jobs/${id}`}><PremiumButton className="w-full" variant="secondary" iconLeft={<Briefcase className="h-4 w-4" />}>View job</PremiumButton></Link>
                  {canStart(status) ? <PremiumButton className="w-full" onClick={() => handleQuickStart(id)} disabled={startingId === id} iconLeft={<Play className="h-4 w-4" />}>{startingId === id ? "Starting..." : "Start job"}</PremiumButton> : <PremiumButton className="w-full" variant="secondary" disabled iconLeft={status === "completed" ? <CheckCircle2 className="h-4 w-4" /> : <Timer className="h-4 w-4" />}>{status === "completed" ? "Completed" : "In progress"}</PremiumButton>}
                  {job.address ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer"><PremiumButton className="w-full" variant="secondary" iconLeft={<MapPin className="h-4 w-4" />}>Directions</PremiumButton></a> : <PremiumButton className="w-full" variant="secondary" disabled iconLeft={<Clock3 className="h-4 w-4" />}>No address</PremiumButton>}
                </div>
              </div>
            </PremiumCard>
          );
        }) : null}
      </main>
      <WorkerContactOfficePanel
        open={showContactOffice}
        onClose={() => setShowContactOffice(false)}
        defaultMessage="I need help with my assigned jobs. No jobs are showing for me."
      />
      <WorkerBottomNav active="today" />
    </div>
  );
}
