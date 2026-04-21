import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Button } from "../components/ui/button";
import {
  Briefcase, Calendar, CheckCircle, DollarSign, FileText, Users,
  Plus, Clock, UserCheck, ArrowRight, AlertTriangle, Receipt, CalendarDays,
} from "lucide-react";
import { formatCurrency, JOB_STATUS_MAP } from "../lib/utils";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isEmployer, isWorker } = useAuth();
  const { get } = useApi();
  const [stats, setStats] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [todayJobs, setTodayJobs] = useState([]);
  const [weekJobs, setWeekJobs] = useState([]);

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    const [statsRes, todayRes, weekRes] = await Promise.all([
      get("/dashboard/stats"),
      get("/jobs/today"),
      get("/jobs/week"),
    ]);
    if (statsRes.success) setStats(statsRes.data);
    if (todayRes.success) setTodayJobs(todayRes.data);
    if (weekRes.success) setWeekJobs(weekRes.data);
    setPageLoading(false);
  }, [get]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  if (pageLoading) return (
    <Layout>
      <div className="flex items-center justify-center py-24" data-testid="dashboard-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
      </div>
    </Layout>
  );

  const s = stats || {};

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8" data-testid="dashboard-page">

        {/* Hero Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight" data-testid="dashboard-greeting">
                Run your business with clarity
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm md:text-base max-w-xl">
                Estimate, schedule, manage jobs and invoice — keep track of jobs, team updates, and plan your day efficiently.
              </p>
            </div>
            {isEmployer && (
              <div className="flex gap-2 shrink-0">
                <Button onClick={() => navigate("/jobs/new")} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 shadow-sm" data-testid="hero-new-job">
                  <Plus className="h-4 w-4 mr-1.5" /> New job
                </Button>
                <Button variant="outline" onClick={() => navigate("/calendar")} className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50" data-testid="hero-calendar">
                  <CalendarDays className="h-4 w-4 mr-1.5" /> Today
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Greeting + Stats Row */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {greeting}, {user?.name?.split(" ")[0] || "there"}
            </h2>
            <Link to="/jobs" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1" data-testid="view-jobs-link">
              View jobs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Active Jobs — blue gradient */}
            <button onClick={() => navigate("/jobs")}
              className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all hover:shadow-lg bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md"
              data-testid="stat-active-jobs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Active jobs</span>
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Briefcase className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-bold">{s.jobs_today || 0}</div>
              <p className="text-sm opacity-75 mt-1">Jobs currently active</p>
            </button>

            {/* Card 2: Completed — green tint */}
            <button onClick={() => navigate("/jobs")}
              className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all hover:shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 shadow-sm"
              data-testid="stat-completed">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Completed</span>
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">{s.completed_this_month || 0}</div>
              <p className="text-sm text-slate-500 mt-1">Completed this month</p>
            </button>

            {/* Card 3: Team — neutral tint */}
            <button onClick={() => navigate("/team")}
              className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all hover:shadow-lg bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 shadow-sm"
              data-testid="stat-team">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Team</span>
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-slate-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">{s.team_count || 0}</div>
              <p className="text-sm text-slate-500 mt-1">On-site and available</p>
            </button>
          </div>
        </div>

        {/* Two-column: Today's Focus + Needs Attention */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Today's Focus */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-900">Today's focus</h3>
              <Link to="/jobs" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                View jobs <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-5">Jobs awaiting assignment and action</p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-md bg-amber-100 flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs font-semibold text-amber-700">Pending</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{s.pending_invoices || 0}</div>
                <p className="text-xs text-slate-500 mt-0.5">Awaiting action</p>
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs font-semibold text-blue-700">This week</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{s.jobs_this_week || 0}</div>
                <p className="text-xs text-slate-500 mt-0.5">Scheduled ahead</p>
              </div>

              <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-md bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  <span className="text-xs font-semibold text-red-700">Overdue</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">0</div>
                <p className="text-xs text-slate-500 mt-0.5">Past due tasks</p>
              </div>

              <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-md bg-violet-100 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-violet-600" />
                  </div>
                  <span className="text-xs font-semibold text-violet-700">Quotes</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">0</div>
                <p className="text-xs text-slate-500 mt-0.5">Awaiting approval</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/calendar")} className="flex-1 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
                <CalendarDays className="h-4 w-4 mr-1.5" /> Open calendar
              </Button>
              <Button variant="outline" onClick={() => navigate("/jobs/new")} className="flex-1 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
                <Plus className="h-4 w-4 mr-1.5" /> Quick actions
              </Button>
            </div>
          </div>

          {/* Needs Attention */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-900">Needs attention</h3>
              <Link to="/invoices" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-5">{isEmployer ? "Items that need your attention" : "Your pending items"}</p>

            <div className="space-y-3">
              {[
                { label: "Active jobs", sub: "Jobs in progress or assigned", icon: Briefcase, color: "text-blue-600 bg-blue-50", count: s.jobs_today || 0 },
                { label: "Pending invoices", sub: "Invoices awaiting payment", icon: Receipt, color: "text-amber-600 bg-amber-50", count: s.pending_invoices || 0 },
                { label: "This week's schedule", sub: "Upcoming scheduled work", icon: Calendar, color: "text-violet-600 bg-violet-50", count: s.jobs_this_week || 0 },
                { label: "Active clients", sub: "Current client relationships", icon: Users, color: "text-emerald-600 bg-emerald-50", count: s.active_clients || 0 },
                { label: "Monthly revenue", sub: "Revenue earned this month", icon: DollarSign, color: "text-slate-600 bg-slate-50", count: formatCurrency(s.revenue_this_month), isCurrency: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.sub}</p>
                  </div>
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                    item.isCurrency ? "text-slate-700 bg-slate-100" :
                    item.count > 0 ? "text-blue-700 bg-blue-50" : "text-slate-400 bg-slate-100"
                  }`}>
                    {item.isCurrency ? item.count : item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Jobs */}
        {todayJobs.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Today's jobs</h3>
            <div className="space-y-2">
              {todayJobs.slice(0, 5).map((job) => {
                const id = job.id || job._id;
                const st = JOB_STATUS_MAP[job.status];
                return (
                  <Link key={id} to={`/jobs/${id}`} className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors" data-testid={`today-job-${id}`}>
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${st?.color || "bg-slate-300"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{job.title || "Untitled Job"}</p>
                      <p className="text-xs text-slate-400">{job.client_name || job.address || ""}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st?.bg || "bg-slate-100 text-slate-500"}`}>
                      {(job.status || "").replace(/_/g, " ")}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
