import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  FileText, 
  DollarSign, 
  Plus, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Briefcase,
  TrendingUp,
  Loader2
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, getJobTypeLabel } from "@/lib/utils";
import Layout from "@/components/Layout";

export default function DashboardPage() {
  const { user } = useAuth();
  const { get, loading } = useApi();
  const [stats, setStats] = useState(null);
  const [todayJobs, setTodayJobs] = useState([]);
  const [weekJobs, setWeekJobs] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const [statsRes, todayRes, weekRes] = await Promise.all([
      get("/dashboard/stats"),
      get("/jobs/today"),
      get("/jobs/week"),
    ]);

    if (statsRes.success) setStats(statsRes.data);
    if (todayRes.success) setTodayJobs(todayRes.data);
    if (weekRes.success) setWeekJobs(weekRes.data);
  };

  const quickActions = [
    { label: "New Job", icon: Plus, href: "/jobs/new", color: "bg-primary" },
    { label: "New Quote", icon: FileText, href: "/quotes/new", color: "bg-accent" },
    { label: "New Client", icon: Users, href: "/clients/new", color: "bg-green-600" },
    { label: "New Invoice", icon: DollarSign, href: "/invoices/new", color: "bg-purple-600" },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-in" data-testid="dashboard">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white font-heading">
              Welcome back, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your business today.
            </p>
          </div>
          <Link to="/jobs/new">
            <Button className="bg-primary hover:bg-primary/90" data-testid="create-job-button">
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-card border-border" data-testid="stat-jobs-today">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Today</p>
                  <p className="text-2xl font-semibold text-white mt-1">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.jobs_today || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Jobs scheduled</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border" data-testid="stat-jobs-week">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">This Week</p>
                  <p className="text-2xl font-semibold text-white mt-1">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.jobs_this_week || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-accent" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Jobs scheduled</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border" data-testid="stat-completed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
                  <p className="text-2xl font-semibold text-white mt-1">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.completed_this_month || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">This month</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border" data-testid="stat-revenue">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</p>
                  <p className="text-2xl font-semibold text-white mt-1">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(stats?.revenue_this_month || 0)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">This month</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border" data-testid="stat-invoices">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Invoices</p>
                  <p className="text-2xl font-semibold text-white mt-1">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.pending_invoices || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Pending</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border" data-testid="stat-clients">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Clients</p>
                  <p className="text-2xl font-semibold text-white mt-1">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.active_clients || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Link key={action.label} to={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 border-border hover:bg-secondary"
                    data-testid={`quick-action-${action.label.toLowerCase().replace(" ", "-")}`}
                  >
                    <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Jobs Today & This Week */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Jobs Today */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-heading">Jobs Today</CardTitle>
              <Link to="/jobs" className="text-sm text-primary hover:text-primary/80">
                View all <ArrowRight className="inline h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : todayJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No jobs scheduled for today</p>
                  <Link to="/jobs/new">
                    <Button variant="link" className="mt-2 text-primary" data-testid="schedule-job-link">
                      Schedule a job
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayJobs.slice(0, 5).map((job) => (
                    <Link key={job.id} to={`/jobs/${job.id}`}>
                      <div 
                        className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors border-l-4 border-l-primary"
                        data-testid={`today-job-${job.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-white">{job.title}</h4>
                          <span className={`status-badge ${getStatusColor(job.status)}`}>
                            {getStatusLabel(job.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {job.scheduled_time || "All day"}
                          </span>
                          <span>{getJobTypeLabel(job.job_type)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {job.customer_name || job.address}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Jobs This Week */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-heading">This Week</CardTitle>
              <Link to="/jobs" className="text-sm text-primary hover:text-primary/80">
                View all <ArrowRight className="inline h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : weekJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No jobs scheduled this week</p>
                  <Link to="/jobs/new">
                    <Button variant="link" className="mt-2 text-primary" data-testid="schedule-week-job-link">
                      Schedule a job
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {weekJobs.slice(0, 5).map((job) => (
                    <Link key={job.id} to={`/jobs/${job.id}`}>
                      <div 
                        className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                        data-testid={`week-job-${job.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-white">{job.title}</h4>
                          <span className={`status-badge ${getStatusColor(job.status)}`}>
                            {getStatusLabel(job.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(job.scheduled_date)}
                          </span>
                          <span>{getJobTypeLabel(job.job_type)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {job.customer_name || job.address}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
