import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import {
  Briefcase,
  Clock,
  MapPin,
  ChevronRight,
  CheckCircle2,
  CircleDot,
  PauseCircle,
  PlayCircle,
  Settings,
  Sparkles,
  RefreshCw,
  CalendarDays,
  Bell,
} from "lucide-react";

const STATUS_META = {
  assigned: {
    label: "Assigned",
    next: "Accept job",
    icon: CircleDot,
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  acknowledged: {
    label: "Accepted",
    next: "Start job",
    icon: CheckCircle2,
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  in_progress: {
    label: "In progress",
    next: "Pause or complete",
    icon: PlayCircle,
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  paused: {
    label: "Paused",
    next: "Resume job",
    icon: PauseCircle,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  completed: {
    label: "Completed",
    next: "Review job",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

const TABS = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

function normalStatus(value) {
  return String(value || "assigned").toLowerCase().replace(/\s+/g, "_");
}

function dateKey(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(value).slice(0, 10);
  }
}

function jobDate(job) {
  const raw = job?.scheduled_date || job?.date || job?.start_date;
  if (!raw) return "No date set";
  try {
    return new Date(raw).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return String(raw).slice(0, 10);
  }
}

function jobTime(job) {
  if (job?.scheduled_time) return job.scheduled_time;
  const raw = job?.scheduled_date || job?.date || job?.start_date;
  if (!raw || !String(raw).includes("T")) return "Time to confirm";
  try {
    return new Date(raw).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Time to confirm";
  }
}

function isTodayJob(job) {
  const today = new Date().toISOString().slice(0, 10);
  const raw = job?.scheduled_date || job?.date || job?.start_date;
  return dateKey(raw) === today;
}

function jobSort(a, b) {
  const av = a?.scheduled_date || a?.date || a?.start_date || "9999-12-31";
  const bv = b?.scheduled_date || b?.date || b?.start_date || "9999-12-31";
  return String(av).localeCompare(String(bv));
}

export default function WorkerJobsPage() {
  const { user } = useAuth();
  const { get } = useApi();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  const fetchJobs = useCallback(async () => {
    setRefreshing(true);
    setLoading((prev) => prev && jobs.length === 0);
    const res = await get("/jobs");
    if (res.success) setJobs(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
    setRefreshing(false);
  }, [get, jobs.length]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((job) => ["assigned", "acknowledged", "in_progress", "paused"].includes(normalStatus(job.status))).length;
    const complete = jobs.filter((job) => normalStatus(job.status) === "completed").length;
    return { total, active, complete };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const sorted = [...jobs].sort(jobSort);
    if (activeTab === "completed") return sorted.filter((job) => normalStatus(job.status) === "completed");
    if (activeTab === "today") return sorted.filter((job) => normalStatus(job.status) !== "completed" && isTodayJob(job));
    return sorted.filter((job) => normalStatus(job.status) !== "completed" && !isTodayJob(job));
  }, [jobs, activeTab]);

  const tabCounts = useMemo(() => ({
    today: jobs.filter((job) => normalStatus(job.status) !== "completed" && isTodayJob(job)).length,
    upcoming: jobs.filter((job) => normalStatus(job.status) !== "completed" && !isTodayJob(job)).length,
    completed: jobs.filter((job) => normalStatus(job.status) === "completed").length,
  }), [jobs]);

  return (
    <div className="chx-worker-shell worker-premium-shell">
      <header className="worker-premium-header sticky top-0 z-20 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">Churvox Worker</p>
            <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-white">Assigned Work</h1>
            <p className="text-sm font-semibold text-slate-300">{user?.name || "Worker"} · Jobs ready for action</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchJobs}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-sm backdrop-blur transition hover:bg-white/15"
              aria-label="Refresh jobs"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Link
              to="/worker/settings"
              className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-sm backdrop-blur transition hover:bg-white/15"
              aria-label="Worker settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="worker-premium-page mx-auto max-w-3xl px-4 pb-28 pt-5">
        <section className="worker-premium-hero mb-5 overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
                <Sparkles className="h-3.5 w-3.5" /> Live job board
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Today’s work, clear and ready.</h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-600">
                Open a job to accept it, start work, add notes, upload photos, or complete the job from your phone.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[260px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                <p className="text-2xl font-black text-slate-950">{stats.total}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center shadow-sm">
                <p className="text-2xl font-black text-blue-700">{stats.active}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Active</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center shadow-sm">
                <p className="text-2xl font-black text-emerald-700">{stats.complete}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">Done</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-4 grid grid-cols-3 gap-2 rounded-[1.35rem] border border-slate-200 bg-white/90 p-1.5 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-2xl px-2.5 py-2.5 text-xs font-black transition ${activeTab === tab.key ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {tab.label} <span className="ml-1 opacity-70">{tabCounts[tab.key]}</span>
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          <Bell className="h-4 w-4 shrink-0" />
          New assignment and schedule-change alerts are supported when notifications are enabled on this device.
        </div>

        {loading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <p className="mt-4 text-sm font-bold text-slate-500">Loading your assigned work…</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/90 p-10 text-center shadow-xl">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-slate-500">
              <Briefcase className="h-8 w-8" />
            </div>
            <p className="mt-4 text-lg font-black text-slate-900">No assigned work yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-slate-500">When your employer assigns jobs, they will appear here with the next action ready.</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 text-center shadow-xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-blue-50 text-blue-600">
              <CalendarDays className="h-7 w-7" />
            </div>
            <p className="mt-4 text-lg font-black text-slate-900">Nothing in {TABS.find((tab) => tab.key === activeTab)?.label}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-slate-500">Switch tabs to see other assigned, upcoming, or completed jobs.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => {
              const id = job.id || job._id;
              const status = normalStatus(job.status);
              const meta = STATUS_META[status] || STATUS_META.assigned;
              const StatusIcon = meta.icon;
              return (
                <Link
                  key={id}
                  to={`/worker/jobs/${id}`}
                  className="group block rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(37,99,235,0.16)]"
                  data-testid={`worker-job-${id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${meta.badge}`}>
                          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          {meta.next}
                        </span>
                      </div>
                      <h3 className="truncate text-lg font-black tracking-tight text-slate-950 group-hover:text-blue-700">{job.title || "Untitled Job"}</h3>
                      {job.client_name && <p className="mt-1 text-sm font-semibold text-slate-600">{job.client_name}</p>}
                      <div className="mt-3 grid gap-2 text-sm font-medium text-slate-500">
                        {job.address && (
                          <p className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                            <span className="line-clamp-2">{job.address}</span>
                          </p>
                        )}
                        <p className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-blue-500" />
                          <span>{jobDate(job)} · {jobTime(job)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20">
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
