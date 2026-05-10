import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HardHat,
  LogOut,
  MapPin,
  MessageSquare,
  Navigation,
  Play,
  RefreshCw,
  Settings,
  Sparkles,
  Timer,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "@/components/worker/WorkerContactOfficePanel";
import "./worker-field.css";

const canStart = (status) => ["assigned", "acknowledged", "paused"].includes(String(status || "").toLowerCase());
const isDone = (status) => ["completed", "done", "finished"].includes(String(status || "").toLowerCase());
const jobId = (job) => job?.id || job?._id || job?.uuid || "";

function statusClass(status) {
  return String(status || "assigned").toLowerCase().replace(/\s+/g, "_");
}

function StatusBadge({ status }) {
  const clean = statusClass(status);
  return <span className={`worker-status ${clean}`}>{clean.replace(/_/g, " ")}</span>;
}

function getDateKey(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function todayKey() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function shortTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function WorkerButton({ children, className = "", ...props }) {
  return <button className={`worker-btn ${className}`} {...props}>{children}</button>;
}

function WorkerStat({ label, value }) {
  return (
    <div className="worker-stat">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function JobCard({ job, onStart, starting }) {
  const id = jobId(job);
  const status = statusClass(job?.status || "assigned");
  const title = job?.title || job?.job_title || job?.name || "Untitled job";
  const address = job?.address || job?.job_address || "";
  const scheduled = job?.scheduled_date || job?.date || "";
  const client = job?.client_name || job?.customer_name || "";

  return (
    <article className="worker-card">
      <div className="worker-card-body">
        <div className="worker-card-head">
          <div>
            <p className="worker-card-title">{title}</p>
            <div style= marginTop: 8 ><StatusBadge status={status} /></div>
          </div>
          <Link to={`/worker/jobs/${id}`} className="worker-icon-btn" aria-label="Open job">
            <ChevronRight size={20} />
          </Link>
        </div>

        <div className="worker-meta">
          {client ? <div className="worker-meta-row"><HardHat size={15} /> {client}</div> : null}
          {address ? <div className="worker-meta-row"><MapPin size={15} /> {address}</div> : null}
          {scheduled ? (
            <div className="worker-meta-row">
              <CalendarClock size={15} />
              {getDateKey(scheduled)} {job?.scheduled_time ? `• ${job.scheduled_time}` : ""}
            </div>
          ) : null}
        </div>

        <div className="worker-action-grid">
          <Link to={`/worker/jobs/${id}`} className="worker-btn dark">
            <Briefcase size={17} /> Open job
          </Link>

          {canStart(status) ? (
            <WorkerButton className="primary" onClick={() => onStart(id)} disabled={starting === id}>
              <Play size={17} /> {starting === id ? "Starting..." : "Start"}
            </WorkerButton>
          ) : (
            <WorkerButton disabled>
              {isDone(status) ? <CheckCircle2 size={17} /> : <Timer size={17} />}
              {isDone(status) ? "Done" : "Active"}
            </WorkerButton>
          )}

          {address ? (
            <a className="worker-btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
              <Navigation size={17} /> Maps
            </a>
          ) : (
            <WorkerButton disabled><MapPin size={17} /> No address</WorkerButton>
          )}
        </div>
      </div>
    </article>
  );
}

export default function WorkerJobsPage() {
  const { user, logout } = useAuth();
  const { get, post, patch } = useApi();
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState("");
  const [lastSynced, setLastSynced] = useState(null);
  const [showContactOffice, setShowContactOffice] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await get("/jobs");
    if (res?.success || res?.ok) {
      const data = res.data?.jobs || res.data?.items || res.data?.results || res.data || [];
      setJobs(Array.isArray(data) ? data : []);
      setLastSynced(new Date());
    } else {
      setError("Could not load your jobs. Pull down, refresh, or contact the office.");
    }
    setLoading(false);
  }, [get]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const today = todayKey();

  const stats = useMemo(() => {
    const total = jobs.length;
    const dueToday = jobs.filter((j) => getDateKey(j?.scheduled_date || j?.date) === today).length;
    const inProgress = jobs.filter((j) => statusClass(j?.status) === "in_progress").length;
    const completed = jobs.filter((j) => isDone(j?.status)).length;
    return { total, dueToday, inProgress, completed };
  }, [jobs, today]);

  const filteredJobs = useMemo(() => {
    const open = jobs.filter((j) => !isDone(j?.status));
    if (filter === "today") return open.filter((j) => getDateKey(j?.scheduled_date || j?.date) === today || !j?.scheduled_date);
    if (filter === "active") return open.filter((j) => ["in_progress", "paused", "acknowledged"].includes(statusClass(j?.status)));
    if (filter === "completed") return jobs.filter((j) => isDone(j?.status));
    return jobs;
  }, [jobs, filter, today]);

  const nextJob = useMemo(() => {
    return jobs.find((j) => !isDone(j?.status)) || null;
  }, [jobs]);

  const handleQuickStart = async (id) => {
    setStartingId(id);
    let res = await post(`/jobs/${id}/start`, {});
    if (!(res?.success || res?.ok)) {
      res = await patch(`/jobs/${id}`, { status: "in_progress" });
    }
    await fetchJobs();
    setStartingId("");
  };

  const firstName = user?.name?.split(" ")?.[0] || user?.email?.split("@")?.[0] || "team";

  return (
    <div className="worker-field-app">
      <header className="worker-topbar">
        <div className="worker-topbar-inner">
          <ChurvoxLogo size="sm" />
          <div style= display: "flex", alignItems: "center", gap: 8 >
            <button onClick={fetchJobs} className="worker-icon-btn" title="Refresh jobs" disabled={loading}>
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <Link to="/worker/settings" className="worker-icon-btn" title="Settings"><Settings size={18} /></Link>
            <button onClick={logout} className="worker-icon-btn" title="Log out"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className="worker-field-shell">
        <section className="worker-hero">
          <span className="worker-eyebrow"><Sparkles size={14} /> Worker Field OS</span>
          <h1>Hey {firstName}, your run is ready.</h1>
          <p>
            Today’s jobs, route, proof photos, notes, and completion actions in one clean worker view.
            No owner clutter. Just field work done properly.
          </p>
          <div className="worker-hero-actions">
            <WorkerButton className="primary" onClick={fetchJobs} disabled={loading}>
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} /> Refresh run
            </WorkerButton>
            <WorkerButton onClick={() => setShowContactOffice(true)}>
              <MessageSquare size={17} /> Contact office
            </WorkerButton>
          </div>
        </section>

        <div className="worker-grid-4">
          <WorkerStat label="Assigned" value={stats.total} />
          <WorkerStat label="Today" value={stats.dueToday} />
          <WorkerStat label="Active" value={stats.inProgress} />
          <WorkerStat label="Done" value={stats.completed} />
        </div>

        <section className="worker-card">
          <div className="worker-card-body">
            <div className="worker-route-card">
              <div className="worker-route-icon"><Clock3 size={24} /></div>
              <div>
                <small>Field sync</small>
                <b>{lastSynced ? `Synced ${shortTime(lastSynced)}` : "Waiting for sync"}</b>
              </div>
            </div>
          </div>
        </section>

        {nextJob && !loading ? (
          <section className="worker-card">
            <div className="worker-card-body">
              <span className="worker-eyebrow" style= color: "#ad4d31", background: "rgba(244,91,53,0.10)" >
                <Briefcase size={14} /> Next best job
              </span>
              <div style= marginTop: 14 >
                <JobCard job={nextJob} onStart={handleQuickStart} starting={startingId} />
              </div>
            </div>
          </section>
        ) : null}

        <div className="worker-tabs">
          {[
            ["today", "Today"],
            ["active", "Active"],
            ["all", "All"],
            ["completed", "Completed"],
          ].map(([key, label]) => (
            <button key={key} className={`worker-tab ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="worker-loading"><div className="worker-spinner" /></div>
        ) : null}

        {error ? (
          <div className="worker-card">
            <div className="worker-card-body" style= color: "#b91c1c", fontWeight: 800 >{error}</div>
          </div>
        ) : null}

        {!loading && !error && filteredJobs.length === 0 ? (
          <div className="worker-empty">
            <div className="worker-empty-icon"><Briefcase size={26} /></div>
            <h3>No jobs in this view</h3>
            <p>No work is showing here yet. Refresh your run or contact the office if something looks wrong.</p>
            <div style= display: "grid", gap: 10, marginTop: 16 >
              <WorkerButton className="primary full" onClick={fetchJobs}><RefreshCw size={17} /> Refresh jobs</WorkerButton>
              <WorkerButton className="full" onClick={() => setShowContactOffice(true)}><MessageSquare size={17} /> Contact office</WorkerButton>
            </div>
          </div>
        ) : null}

        {!loading && !error ? filteredJobs.map((job) => (
          <JobCard key={jobId(job)} job={job} onStart={handleQuickStart} starting={startingId} />
        )) : null}
      </main>

      <WorkerContactOfficePanel
        open={showContactOffice}
        onClose={() => setShowContactOffice(false)}
        defaultMessage="I need help with my assigned jobs."
      />

      <WorkerBottomNav active="today" />
    </div>
  );
}
