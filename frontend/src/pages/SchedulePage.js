import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { Button } from "../components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Plus, RefreshCw, User } from "lucide-react";
import { safeArray, safeText } from "../utils/safeRender";

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function readableDay(date) {
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function statusClass(status) {
  const value = String(status || "assigned").toLowerCase();
  if (value === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value === "in_progress") return "bg-blue-50 text-blue-700 border-blue-200";
  if (value === "paused") return "bg-amber-50 text-amber-700 border-amber-200";
  if (value === "cancelled") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function jobDate(job) {
  return String(job?.scheduled_date || job?.date || job?.start_date || job?.created_at || "").slice(0, 10);
}

function jobTime(job) {
  return safeText(job?.scheduled_time || job?.start_time || job?.time, "Any time");
}

function JobScheduleCard({ job }) {
  const id = job?.id || job?._id;
  return (
    <Link to={`/jobs/${id}`} className="block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md" data-testid={`schedule-job-${id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{safeText(job?.title, "Untitled job")}</p>
          <p className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-slate-500"><User className="h-3.5 w-3.5" />{safeText(job?.customer_name || job?.client_name, "No client")}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(job?.status)}`}>{safeText(job?.status, "assigned").replace(/_/g, " ")}</span>
      </div>
      <div className="mt-3 grid gap-1 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{jobTime(job)}</span>
        {job?.address ? <span className="flex items-start gap-1"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span className="truncate">{job.address}</span></span> : null}
      </div>
    </Link>
  );
}

export default function SchedulePage() {
  const { get } = useApi();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await get("/jobs");
    if (res?.success) setJobs(safeArray(res.data));
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  const visibleJobs = useMemo(() => {
    return safeArray(jobs).filter((job) => {
      const matchesStatus = statusFilter === "all" || String(job?.status || "").toLowerCase() === statusFilter;
      return matchesStatus;
    });
  }, [jobs, statusFilter]);

  const jobsByDay = useMemo(() => {
    const map = {};
    days.forEach((day) => { map[isoDay(day)] = []; });
    visibleJobs.forEach((job) => {
      const key = jobDate(job);
      if (map[key]) map[key].push(job);
    });
    Object.keys(map).forEach((key) => map[key].sort((a, b) => String(jobTime(a)).localeCompare(String(jobTime(b)))));
    return map;
  }, [visibleJobs, days]);

  const unscheduledJobs = useMemo(() => visibleJobs.filter((job) => !jobDate(job) || !days.some((day) => isoDay(day) === jobDate(job))).slice(0, 8), [visibleJobs, days]);
  const weekTotal = Object.values(jobsByDay).reduce((sum, list) => sum + list.length, 0);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6" data-testid="schedule-page">
        <section className="overflow-hidden rounded-3xl border border-slate-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Schedule centre</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Weekly Schedule</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">See jobs by day, open the real job card, and keep the week clean without bringing back the old Dispatch board.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="rounded-full bg-blue-600 font-black text-white hover:bg-blue-700"><Link to="/jobs/new"><Plus className="mr-2 h-4 w-4" />New job</Link></Button>
              <Button onClick={load} variant="outline" className="rounded-full border-white/20 bg-white/10 font-black text-white hover:bg-white/15"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">This week</p><p className="mt-2 text-2xl font-black text-slate-950">{weekTotal}</p></div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-blue-700">In progress</p><p className="mt-2 text-2xl font-black text-blue-900">{jobs.filter((j) => String(j.status || "") === "in_progress").length}</p></div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Completed</p><p className="mt-2 text-2xl font-black text-emerald-900">{jobs.filter((j) => String(j.status || "") === "completed").length}</p></div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Unscheduled shown</p><p className="mt-2 text-2xl font-black text-amber-900">{unscheduledJobs.length}</p></div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setWeekOffset((v) => v - 1)} className="rounded-full"><ChevronLeft className="h-4 w-4" /></Button>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-800">
                {readableDay(days[0])} - {readableDay(days[6])}
              </div>
              <Button variant="outline" onClick={() => setWeekOffset((v) => v + 1)} className="rounded-full"><ChevronRight className="h-4 w-4" /></Button>
              {weekOffset !== 0 ? <Button variant="outline" onClick={() => setWeekOffset(0)} className="rounded-full font-black">Today</Button> : null}
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-300">
                <option value="all">All statuses</option>
                <option value="assigned">Assigned</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In progress</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-7">
          {days.map((day) => {
            const key = isoDay(day);
            const dayJobs = jobsByDay[key] || [];
            const isToday = key === isoDay(new Date());
            return (
              <section key={key} className={`min-h-[260px] rounded-3xl border p-3 shadow-sm ${isToday ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-white/80"}`} data-testid={`schedule-day-${key}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className={`text-sm font-black ${isToday ? "text-blue-900" : "text-slate-950"}`}>{readableDay(day)}</p>
                    {isToday ? <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">Today</p> : null}
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-700 shadow-sm">{dayJobs.length}</span>
                </div>
                <div className="space-y-2">
                  {dayJobs.map((job) => <JobScheduleCard key={job?.id || job?._id} job={job} />)}
                  {!dayJobs.length ? <p className="rounded-2xl border border-dashed border-slate-200 bg-white/65 p-4 text-center text-xs font-semibold text-slate-400">No jobs</p> : null}
                </div>
              </section>
            );
          })}
        </div>

        {unscheduledJobs.length ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-amber-950">Unscheduled or outside this week</h2>
                <p className="text-sm font-semibold text-amber-800">These jobs need a scheduled date/time or are outside the selected week.</p>
              </div>
              <Link to="/jobs" className="text-sm font-black text-amber-900 hover:underline">Open Jobs</Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {unscheduledJobs.map((job) => <JobScheduleCard key={job?.id || job?._id} job={job} />)}
            </div>
          </section>
        ) : null}
      </div>
    </Layout>
  );
}
