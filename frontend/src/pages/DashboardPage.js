import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Briefcase, Calendar, CheckCircle, DollarSign, FileText, Users, Plus, Clock, UserCheck, ArrowRight, CircleDot } from "lucide-react";
import { formatCurrency, formatDate, JOB_STATUS_MAP } from "../lib/utils";

export default function DashboardPage() {
  const { user, isEmployer, isWorker } = useAuth();
  const { get } = useApi();
  const [stats, setStats] = useState(null);
  const [todayJobs, setTodayJobs] = useState([]);
  const [weekJobs, setWeekJobs] = useState([]);

  const fetchData = useCallback(async () => {
    const [statsRes, todayRes, weekRes] = await Promise.all([
      get("/dashboard/stats"),
      get("/jobs/today"),
      get("/jobs/week"),
    ]);
    if (statsRes.success) setStats(statsRes.data);
    if (todayRes.success) setTodayJobs(todayRes.data);
    if (weekRes.success) setWeekJobs(weekRes.data);
  }, [get]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isNewBusiness = stats && isEmployer && (stats.active_clients === 0 && stats.jobs_today === 0 && stats.jobs_this_week === 0 && stats.completed_this_month === 0);

  const statCards = isEmployer
    ? [
        { label: "Today's Jobs", value: stats?.jobs_today || 0, icon: Briefcase, color: "text-blue-400" },
        { label: "This Week", value: stats?.jobs_this_week || 0, icon: Calendar, color: "text-purple-400" },
        { label: "Completed", value: stats?.completed_this_month || 0, icon: CheckCircle, color: "text-green-400" },
        { label: "Revenue", value: formatCurrency(stats?.revenue_this_month), icon: DollarSign, color: "text-emerald-400" },
        { label: "Pending Invoices", value: stats?.pending_invoices || 0, icon: FileText, color: "text-yellow-400" },
        { label: "Clients", value: stats?.active_clients || 0, icon: Users, color: "text-cyan-400" },
      ]
    : [
        { label: "My Jobs Today", value: stats?.jobs_today || 0, icon: Briefcase, color: "text-blue-400" },
        { label: "This Week", value: stats?.jobs_this_week || 0, icon: Calendar, color: "text-purple-400" },
        { label: "Completed", value: stats?.completed_this_month || 0, icon: CheckCircle, color: "text-green-400" },
      ];

  const setupSteps = isNewBusiness ? [
    { label: "Add your first client", path: "/clients/new", done: (stats?.active_clients || 0) > 0, hint: "Your client list is your business backbone" },
    { label: "Create a job", path: "/jobs/new", done: false, hint: "Track work from start to finish" },
    { label: "Send a quote", path: "/quotes/new", done: false, hint: "Win work with professional quotes" },
    { label: "Set your trade type", path: "/settings", done: !!user?.trade_type && user.trade_type !== "other", hint: "Personalise your Churvox experience" },
  ] : null;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6" data-testid="dashboard-page">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="dashboard-greeting">
              {isNewBusiness ? `Welcome to Churvox, ${user?.name?.split(" ")[0]}` : `Welcome back, ${user?.name?.split(" ")[0]}`}
            </h1>
            <p className="text-sm text-churvox-muted mt-1">
              {isWorker ? "Here are your assigned jobs" : isNewBusiness ? "Let's get your business set up" : "Here's your business overview"}
            </p>
          </div>
          {isEmployer && !isNewBusiness && (
            <div className="hidden sm:flex gap-2">
              <Button asChild size="sm" className="bg-churvox-accent hover:bg-churvox-accent/90">
                <Link to="/jobs/new" data-testid="quick-new-job"><Plus size={14} className="mr-1" /> New Job</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Getting Started for new businesses */}
        {setupSteps && (
          <Card className="bg-gradient-to-br from-churvox-accent/10 to-churvox-card border-churvox-accent/20" data-testid="getting-started-card">
            <CardContent className="p-5">
              <h2 className="text-base font-semibold text-white mb-1">Getting started</h2>
              <p className="text-xs text-churvox-muted mb-4">Complete these steps to make the most of Churvox</p>
              <div className="space-y-3">
                {setupSteps.map((step, i) => (
                  <Link key={i} to={step.path} data-testid={`setup-step-${i}`}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${step.done ? "bg-green-500/10" : "bg-white/5 hover:bg-white/10"}`}>
                    <CircleDot size={18} className={step.done ? "text-green-400" : "text-churvox-accent"} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${step.done ? "text-green-400 line-through" : "text-white"}`}>{step.label}</p>
                      <p className="text-[11px] text-churvox-muted">{step.hint}</p>
                    </div>
                    {!step.done && <ArrowRight size={14} className="text-churvox-muted" />}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className={`grid gap-3 ${isEmployer ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`} data-testid="stats-grid">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="bg-churvox-card border-churvox-border" data-testid={`stat-${stat.label.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg bg-white/5 ${stat.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-[22px] font-bold text-white leading-tight">{stat.value}</p>
                    <p className="text-xs text-churvox-muted">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Team Count (employer only) */}
        {isEmployer && stats?.team_count > 0 && (
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserCheck size={20} className="text-churvox-accent" />
                <span className="text-white font-medium">{stats.team_count} team member{stats.team_count !== 1 ? "s" : ""}</span>
              </div>
              <Button asChild variant="outline" size="sm" className="border-churvox-border text-churvox-muted hover:text-white">
                <Link to="/team" data-testid="view-team-link">Manage Team</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions (employer, not new) */}
        {isEmployer && !isNewBusiness && (
          <div className="tap-target grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="quick-actions">
            {[
              { label: "New Job", path: "/jobs/new", icon: Briefcase },
              { label: "New Quote", path: "/quotes/new", icon: FileText },
              { label: "New Client", path: "/clients/new", icon: Users },
              { label: "New Invoice", path: "/invoices/new", icon: DollarSign },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.path} to={action.path} data-testid={`quick-${action.label.toLowerCase().replace(" ", "-")}`}
                  className="flex items-center gap-3 p-4 bg-churvox-card border border-churvox-border rounded-xl hover:border-churvox-accent/50 transition-all">
                  <Icon size={18} className="text-churvox-accent" />
                  <span className="text-sm font-medium text-white">{action.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Today's Jobs */}
        <div data-testid="todays-jobs-section">
          <h2 className="text-base font-semibold text-white mb-3">Today's Jobs</h2>
          {todayJobs.length === 0 ? (
            <Card className="bg-churvox-card border-churvox-border">
              <CardContent className="p-6 text-center">
                <Briefcase size={24} className="mx-auto mb-2 text-churvox-muted/40" />
                <p className="text-churvox-muted text-sm">No jobs scheduled for today</p>
                {isEmployer && <p className="text-xs text-churvox-muted/60 mt-1">Jobs appear here on their scheduled date</p>}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {todayJobs.map((job) => {
                const statusInfo = JOB_STATUS_MAP[job.status];
                return (
                  <Link key={job.id} to={`/jobs/${job.id}`} data-testid={`today-job-${job.id}`}
                    className="block bg-churvox-card border border-churvox-border rounded-xl p-4 hover:border-churvox-accent/50 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{job.title}</p>
                        <p className="text-xs text-churvox-muted mt-0.5">
                          {job.customer_name} {job.scheduled_time && `at ${job.scheduled_time}`}
                        </p>
                        {job.assigned_worker_name && (
                          <p className="text-xs text-churvox-accent mt-0.5 flex items-center gap-1">
                            <UserCheck size={12} /> {job.assigned_worker_name}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-semibold uppercase text-white ${statusInfo?.color || "bg-slate-500"}`}>
                        {statusInfo?.label || job.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* This Week */}
        <div data-testid="week-jobs-section">
          <h2 className="text-base font-semibold text-white mb-3">This Week</h2>
          {weekJobs.length === 0 ? (
            <Card className="bg-churvox-card border-churvox-border">
              <CardContent className="p-6 text-center">
                <Calendar size={24} className="mx-auto mb-2 text-churvox-muted/40" />
                <p className="text-churvox-muted text-sm">No jobs this week</p>
                {isEmployer && <p className="text-xs text-churvox-muted/60 mt-1">Schedule jobs from the Jobs page to see them here</p>}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {weekJobs.slice(0, 5).map((job) => {
                const statusInfo = JOB_STATUS_MAP[job.status];
                return (
                  <Link key={job.id} to={`/jobs/${job.id}`} data-testid={`week-job-${job.id}`}
                    className="block bg-churvox-card border border-churvox-border rounded-xl p-4 hover:border-churvox-accent/50 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{job.title}</p>
                        <p className="text-xs text-churvox-muted mt-0.5 flex items-center gap-1">
                          <Clock size={12} /> {formatDate(job.scheduled_date)} {job.scheduled_time && `at ${job.scheduled_time}`}
                        </p>
                        {job.assigned_worker_name && (
                          <p className="text-xs text-churvox-accent mt-0.5 flex items-center gap-1">
                            <UserCheck size={12} /> {job.assigned_worker_name}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-semibold uppercase text-white ${statusInfo?.color || "bg-slate-500"}`}>
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
