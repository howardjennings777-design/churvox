import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Clock, UserCheck, MapPin, Briefcase } from "lucide-react";
import { formatCurrency, JOB_STATUS_MAP } from "../lib/utils";
import Layout from "../components/Layout";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { get } = useApi();
  const { isEmployer } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const fetchJobs = useCallback(async () => {
    const res = await get("/jobs");
    if (res.success) setJobs(res.data);
  }, [get]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Reset selectedDate when month changes
  useEffect(() => {
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() === month) {
      setSelectedDate(today.getDate());
    } else {
      setSelectedDate(1);
    }
  }, [year, month]);

  const getJobsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return jobs.filter((j) => j.scheduled_date?.startsWith(dateStr));
  };

  const selectedJobs = selectedDate ? getJobsForDay(selectedDate) : [];

  const today = new Date();
  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  // Count total jobs this month
  const monthJobCount = Array.from({ length: daysInMonth }, (_, i) => getJobsForDay(i + 1).length).reduce((a, b) => a + b, 0);

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4" data-testid="calendar-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="calendar-heading">Calendar</h1>
            <p className="text-xs text-churvox-muted mt-0.5">{monthJobCount} job{monthJobCount !== 1 ? "s" : ""} this month</p>
          </div>
          {isEmployer && (
          <button
            className="bg-churvox-accent hover:bg-churvox-accent/90 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            onClick={() => { window.location.href="/jobs/new"; }}
          >
            <Plus size={14} className="mr-2" />
            New Job
          </button>
        )}
        </div>

        {/* Month Navigation */}
        <Card className="bg-churvox-card border-churvox-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 text-churvox-muted hover:text-white rounded-lg hover:bg-white/5" data-testid="calendar-prev">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-semibold text-white" data-testid="calendar-month">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 text-churvox-muted hover:text-white rounded-lg hover:bg-white/5" data-testid="calendar-next">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-churvox-muted py-2">{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1" data-testid="calendar-grid">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dayJobs = getJobsForDay(day);
                const hasJobs = dayJobs.length > 0;
                const selected = selectedDate === day;
                return (
                  <button key={day} onClick={() => setSelectedDate(day)} data-testid={`calendar-day-${day}`}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative
                      ${isToday(day) ? "ring-1 ring-churvox-accent" : ""}
                      ${selected ? "bg-churvox-accent text-white" : "hover:bg-white/5 text-white"}
                    `}>
                    {day}
                    {hasJobs && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayJobs.slice(0, 3).map((j, idx) => {
                          const s = JOB_STATUS_MAP[j.status];
                          return <div key={idx} className={`w-1.5 h-1.5 rounded-full ${s?.color || "bg-slate-500"}`} />;
                        })}
                        {dayJobs.length > 3 && <span className="text-[8px] text-churvox-muted">+{dayJobs.length - 3}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Daily Overview */}
        <div data-testid="calendar-day-jobs">
          <h3 className="text-base font-semibold text-white mb-2" data-testid="daily-overview-heading">
            {MONTH_NAMES[month]} {selectedDate} — {selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""}
          </h3>
          {selectedJobs.length === 0 ? (
            <Card className="bg-churvox-card border-churvox-border">
              <CardContent className="p-8 text-center">
                <Briefcase size={24} className="mx-auto mb-2 text-churvox-muted/50" />
                <p className="text-churvox-muted text-sm">No jobs scheduled</p>
                {isEmployer && (
                  <Button asChild size="sm" variant="outline" className="mt-3 border-churvox-border text-churvox-muted hover:text-white">
                    <Link to="/jobs/new">Schedule a Job</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {selectedJobs.map((job) => {
                const statusInfo = JOB_STATUS_MAP[job.status];
                return (
                  <Link key={job.id} to={`/jobs/${job.id}`} data-testid={`calendar-job-${job.id}`}
                    className="block bg-churvox-card border border-churvox-border rounded-xl p-4 hover:border-churvox-accent/50 transition-all group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate group-hover:text-churvox-accent transition-colors">{job.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-churvox-muted">
                          {job.scheduled_time && (
                            <span className="flex items-center gap-1"><Clock size={11} /> {job.scheduled_time}</span>
                          )}
                          {job.customer_name && (
                            <span className="truncate max-w-[140px]">{job.customer_name}</span>
                          )}
                          {job.address && (
                            <span className="flex items-center gap-1 truncate max-w-[160px]"><MapPin size={11} /> {job.address}</span>
                          )}
                          {job.price > 0 && (
                            <span className="text-churvox-accent font-medium">{formatCurrency(job.price)}</span>
                          )}
                        </div>
                        {job.assigned_worker_name && (
                          <p className="text-xs text-churvox-accent/80 mt-1 flex items-center gap-1">
                            <UserCheck size={12} /> {job.assigned_worker_name}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase text-white shrink-0 ${statusInfo?.color || "bg-slate-500"}`} data-testid={`calendar-job-status-${job.id}`}>
                        {statusInfo?.label || job.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
