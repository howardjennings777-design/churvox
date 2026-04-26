import { useNavigate, Link } from "react-router-dom";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Button } from "../components/ui/button";
import { Briefcase, Calendar, CheckCircle, FileText, Users, Plus, ArrowRight, AlertTriangle, Receipt, UserPlus, Clock3, MessageSquareWarning, RefreshCw } from "lucide-react";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import PageState from "../components/ui/PageState";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, normalizedRole } = useAuth();
  const { get } = useApi();
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [stats, setStats] = useState({});
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [myobSettings, setMyobSettings] = useState(null);

  const isAdmin = normalizedRole === "owner" || normalizedRole === "manager" || normalizedRole === "office_admin";

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    setPageError("");
    try {
      const [statsRes, jobsRes, quotesRes, invoicesRes, workersRes, myobRes] = await Promise.all([
        get("/dashboard/stats"),
        get("/jobs"),
        get("/quotes"),
        get("/invoices"),
        get("/team/workers"),
        get("/myob/settings"),
      ]);
      setStats(statsRes?.success ? (statsRes.data || {}) : {});
      setJobs(safeArray(jobsRes?.success ? jobsRes.data : []));
      setQuotes(safeArray(quotesRes?.success ? quotesRes.data : []));
      setInvoices(safeArray(invoicesRes?.success ? invoicesRes.data : []));
      setWorkers(safeArray(workersRes?.success ? workersRes.data : []));
      setMyobSettings(myobRes?.success ? (myobRes.data || null) : null);
    } catch (err) {
      setPageError(safeText(err, "Failed to load dashboard"));
    } finally {
      setPageLoading(false);
    }
  }, [get]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const smart = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const activeJobs = jobs.filter((j) => ["assigned", "acknowledged", "in_progress", "paused"].includes(String(j.status || "")));
    const completedJobs = jobs.filter((j) => String(j.status || "") === "completed");
    const todayJobs = jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === todayKey);
    const unassignedJobs = jobs.filter((j) => !j.assigned_worker_id);
    const overdueInvoices = invoices.filter((inv) => String(inv.status || "") === "overdue");
    const pendingInvoices = invoices.filter((inv) => ["draft", "sent"].includes(String(inv.status || "")));
    const quotesWaiting = quotes.filter((q) => ["sent", "draft"].includes(String(q.status || "")));
    const scheduleConflicts = jobs.filter((job, idx) => {
      const time = `${String(job.scheduled_date || "").slice(0, 10)} ${job.scheduled_time || ""}`;
      return jobs.findIndex((j) => j.assigned_worker_id && j.assigned_worker_id === job.assigned_worker_id && `${String(j.scheduled_date || "").slice(0, 10)} ${j.scheduled_time || ""}` === time) !== idx;
    }).length;

    return {
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      teamCount: safeNumber(stats.team_count, workers.length),
      todayJobs: todayJobs.length,
      unassignedJobs: unassignedJobs.length,
      jobsStartingToday: todayJobs.length,
      overdueInvoices: overdueInvoices.length,
      pendingInvoices: pendingInvoices.length,
      quotesWaiting: quotesWaiting.length,
      scheduleConflicts,
      lowSmsCredits: safeNumber(stats.sms_credits, 0) > 0 && safeNumber(stats.sms_credits, 0) <= 10 ? 1 : 0,
      myobIssues: myobSettings && myobSettings.connected === false ? 1 : 0,
      workersActive: jobs.filter((j) => String(j.status || "") === "in_progress" && j.assigned_worker_id).length,
    };
  }, [jobs, invoices, quotes, stats, workers, myobSettings]);

  const cards = [
    { label: "Active jobs", value: smart.activeJobs, icon: Briefcase, path: "/jobs" },
    { label: "Completed jobs", value: smart.completedJobs, icon: CheckCircle, path: "/jobs?status=completed" },
    { label: "Team count", value: smart.teamCount, icon: Users, path: "/team" },
    { label: "Today's jobs", value: smart.todayJobs, icon: Calendar, path: "/dispatch" },
    { label: "Unassigned jobs", value: smart.unassignedJobs, icon: AlertTriangle, path: "/dispatch" },
    { label: "Jobs starting today", value: smart.jobsStartingToday, icon: Clock3, path: "/dispatch" },
    { label: "Overdue invoices", value: smart.overdueInvoices, icon: Receipt, path: "/invoices" },
    { label: "Pending invoices", value: smart.pendingInvoices, icon: Receipt, path: "/invoices" },
    { label: "Quotes waiting approval", value: smart.quotesWaiting, icon: FileText, path: "/quotes" },
    { label: "Schedule conflicts", value: smart.scheduleConflicts, icon: AlertTriangle, path: "/dispatch" },
    { label: "Low SMS credits", value: smart.lowSmsCredits, icon: MessageSquareWarning, path: "/sms" },
    { label: "MYOB sync issues", value: smart.myobIssues, icon: RefreshCw, path: "/settings" },
    { label: "Workers currently active", value: smart.workersActive, icon: Users, path: "/jobs" },
  ];

  if (pageLoading) return <Layout><PageState type="loading" title="Loading Smart Hub" /></Layout>;
  if (pageError) return <Layout><PageState type="error" title="Smart Hub unavailable" message={pageError} action={<Button onClick={fetchData}>Retry</Button>} /></Layout>;

  return (
    <Layout>
      <div className="cx-page" data-testid="dashboard-page">
        <div className="cx-page-hero">
          <h1 className="cx-page-title">Smart Hub</h1>
          <p className="cx-page-subtitle">Welcome back, {safeText(user?.name?.split(" ")?.[0], "there")}. Monitor jobs, cashflow, and team activity in one place.</p>
          {isAdmin && (
            <div className="cx-toolbar">
              <Button onClick={() => navigate("/jobs/new")} className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-1" />New job</Button>
              <Button onClick={() => navigate("/quotes/new")} variant="outline">New quote</Button>
              <Button onClick={() => navigate("/invoices/new")} variant="outline">New invoice</Button>
              <Button onClick={() => navigate("/clients/new")} variant="outline">Add client</Button>
              <Button onClick={() => navigate("/dispatch")} variant="outline">Open dispatch board</Button>
              <Button onClick={() => navigate("/team")} variant="outline"><UserPlus className="h-4 w-4 mr-1" />Invite worker</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <button key={card.label} onClick={() => navigate(card.path)} className="cx-metric-card text-left border-[#dde6fb] hover:border-[#bdd0ff]" data-testid={`smart-card-${card.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 font-semibold uppercase">{card.label}</span>
                <span className="h-8 w-8 rounded-lg bg-[#eaf2ff] inline-flex items-center justify-center"><card.icon className="h-4 w-4 text-[#155EEF]" /></span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{safeNumber(card.value, 0)}</p>
            </button>
          ))}
        </div>

        <div className="cx-panel p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Today's jobs</h3>
            <Link to="/dispatch" className="text-sm text-blue-600 inline-flex items-center gap-1">Open dispatch board <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="mt-3 space-y-2">
            {jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).slice(0, 5).map((job) => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="block rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                <p className="text-sm font-medium text-slate-900">{safeText(job.title, "Untitled job")}</p>
                <p className="text-xs text-slate-500">{safeText(job.customer_name || job.client_name || job.address, "No client details")}</p>
              </Link>
            ))}
            {jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length === 0 && (
              <p className="text-sm text-slate-500">No jobs scheduled today.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
