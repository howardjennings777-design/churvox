import { useNavigate, Link } from "react-router-dom";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Button } from "../components/ui/button";
import { Calendar, FileText, Users, Plus, ArrowRight, AlertTriangle, Receipt, UserPlus, RefreshCw, CheckCircle2, ListChecks } from "lucide-react";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import { AppShell, PageHeader, StatCard, SectionCard, EmptyState, LoadingState, ErrorState, StatusBadge } from "../components/premium/PremiumUI";

function itemId(item, fallback) {
  return item?.id || item?._id || fallback;
}

function settledData(result, fallback) {
  if (result?.status !== "fulfilled") return fallback;
  const value = result.value;
  return value?.success ? (value.data ?? fallback) : fallback;
}

function dueText(value) {
  if (!value) return "No due date";
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "No due date";
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = Math.round((startDue - startToday) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff}d`;
}

function isOverdue(value) {
  if (!value) return false;
  const due = new Date(value);
  return !Number.isNaN(due.getTime()) && due < new Date();
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, normalizedRole } = useAuth();
  const { get, post } = useApi();
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [stats, setStats] = useState({});
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [myobSettings, setMyobSettings] = useState(null);
  const [completingFollowUp, setCompletingFollowUp] = useState("");

  const isAdmin = normalizedRole === "owner" || normalizedRole === "manager" || normalizedRole === "office_admin";

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    setPageError("");
    try {
      const [statsRes, jobsRes, quotesRes, invoicesRes, workersRes, followUpsRes, myobRes] = await Promise.allSettled([
        get("/dashboard/stats"),
        get("/jobs"),
        get("/quotes"),
        get("/invoices"),
        get("/team/workers"),
        get("/follow-up-tasks"),
        get("/myob/settings"),
      ]);

      setStats(settledData(statsRes, {}));
      setJobs(safeArray(settledData(jobsRes, [])));
      setQuotes(safeArray(settledData(quotesRes, [])));
      setInvoices(safeArray(settledData(invoicesRes, [])));
      setWorkers(safeArray(settledData(workersRes, [])));
      setFollowUps(safeArray(settledData(followUpsRes, [])));
      setMyobSettings(settledData(myobRes, null));
    } catch (err) {
      setPageError(safeText(err, "Failed to load dashboard"));
    } finally {
      setPageLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCompleteFollowUp = async (taskId) => {
    if (!taskId) return;
    setCompletingFollowUp(taskId);
    try {
      await post(`/follow-up-tasks/${taskId}/complete`);
      await fetchData();
    } finally {
      setCompletingFollowUp("");
    }
  };

  const smart = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayJobs = jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === todayKey);
    const inProgress = jobs.filter((j) => String(j.status || "") === "in_progress");
    const urgentJobs = jobs.filter((j) => ["paused", "cancelled"].includes(String(j.status || "")) || !j.assigned_worker_id);
    const pendingInvoices = invoices.filter((inv) => ["draft", "sent", "overdue"].includes(String(inv.status || "")));
    const quotesWaiting = quotes.filter((q) => ["sent", "draft"].includes(String(q.status || "")));
    const openFollowUps = followUps
      .filter((task) => !["completed", "done", "closed"].includes(String(task.status || "").toLowerCase()))
      .sort((a, b) => new Date(a.due_at || 8640000000000000) - new Date(b.due_at || 8640000000000000));
    const overdueFollowUps = openFollowUps.filter((task) => isOverdue(task.due_at));
    const payrollAlerts = safeNumber(stats.pending_payroll_alerts, 0);
    const automationAlerts = (safeNumber(stats.sms_credits, 0) > 0 && safeNumber(stats.sms_credits, 0) <= 10 ? 1 : 0) + (myobSettings && myobSettings.connected === false ? 1 : 0);

    return {
      todayJobs,
      inProgress,
      urgentJobs,
      pendingInvoices,
      quotesWaiting,
      openFollowUps,
      overdueFollowUps,
      teamCount: safeNumber(stats.team_count, workers.length),
      workersActive: inProgress.filter((j) => j.assigned_worker_id).length,
      payrollAlerts,
      automationAlerts,
      alertsTotal: urgentJobs.length + payrollAlerts + automationAlerts + overdueFollowUps.length,
    };
  }, [jobs, invoices, quotes, followUps, stats, workers, myobSettings]);

  const cockpitCards = [
    { label: "Today", value: smart.todayJobs.length, icon: Calendar, path: "/jobs" },
    { label: "Urgent", value: smart.urgentJobs.length, icon: AlertTriangle, path: "/jobs" },
    { label: "Follow-ups", value: smart.openFollowUps.length, icon: ListChecks, path: "/dashboard" },
    { label: "Quotes", value: smart.quotesWaiting.length, icon: FileText, path: "/quotes" },
    { label: "Invoices", value: smart.pendingInvoices.length, icon: Receipt, path: "/invoices" },
    { label: "Team", value: `${smart.workersActive}/${smart.teamCount}`, icon: Users, path: "/team" },
    { label: "Alerts", value: smart.payrollAlerts + smart.automationAlerts + smart.overdueFollowUps.length, icon: RefreshCw, path: "/automation" },
  ];

  if (pageLoading) return <Layout><LoadingState title="Loading Smart Hub" /></Layout>;
  if (pageError) return <Layout><ErrorState title="Smart Hub unavailable" message={pageError} action={<Button onClick={fetchData}>Retry</Button>} /></Layout>;

  return (
    <Layout>
      <AppShell className="dashboard-compact" data-testid="dashboard-page">
        <PageHeader
          title="Smart Hub"
          description={`Jobs, invoices, team, payroll and automation in one place. Welcome back, ${safeText(user?.name?.split(" ")?.[0], "there")}.`}
          action={isAdmin ? <Button onClick={() => navigate("/jobs/new")} className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-1" />New job</Button> : null}
        >
          {isAdmin && (
            <div className="cx-toolbar dashboard-quickbar">
              <Button onClick={() => navigate("/quotes/new")} variant="outline">New quote</Button>
              <Button onClick={() => navigate("/invoices/new")} variant="outline">New invoice</Button>
              <Button onClick={() => navigate("/clients/new")} variant="outline">Add client</Button>
              <Button onClick={() => navigate("/team")} variant="outline"><UserPlus className="h-4 w-4 mr-1" />Invite worker</Button>
            </div>
          )}
        </PageHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 dashboard-stat-strip">
          {cockpitCards.map((card) => <StatCard key={card.label} {...card} onClick={() => navigate(card.path)} />)}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 dashboard-main-grid">
          <SectionCard title="Today’s jobs" action={<Link to="/jobs" className="text-sm text-blue-600 inline-flex items-center gap-1">Jobs <ArrowRight className="h-3 w-3" /></Link>}>
            <div className="space-y-2">
              {smart.todayJobs.slice(0, 4).map((job, index) => (
                <Link key={itemId(job, index)} to={`/jobs/${itemId(job, index)}`} className="block rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{safeText(job.title, "Untitled job")}</p>
                      <p className="truncate text-xs text-slate-500">{safeText(job.customer_name || job.client_name || job.address, "No client details")}</p>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                </Link>
              ))}
              {!smart.todayJobs.length && <EmptyState title="No jobs today" description="Add or assign work from Jobs." />}
            </div>
          </SectionCard>

          <SectionCard title="Action queue" action={<span className="text-xs font-semibold text-slate-500">{smart.overdueFollowUps.length} overdue</span>}>
            <div className="space-y-2">
              {smart.openFollowUps.slice(0, 5).map((task, index) => {
                const taskId = itemId(task, index);
                const overdue = isOverdue(task.due_at);
                return (
                  <div key={taskId} className={`rounded-xl border p-3 ${overdue ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{safeText(task.title, "Follow-up")}</p>
                        <p className={`truncate text-xs font-semibold ${overdue ? "text-amber-700" : "text-slate-500"}`}>{dueText(task.due_at)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCompleteFollowUp(taskId)}
                        disabled={completingFollowUp === taskId}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                        aria-label="Complete follow-up"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {!smart.openFollowUps.length && <p className="text-sm text-slate-500">No open follow-ups. Automation will add them when invoices or customers need attention.</p>}

              {smart.urgentJobs.slice(0, 2).map((job, index) => (
                <Link key={`urgent-${itemId(job, index)}`} to={`/jobs/${itemId(job, index)}`} className="block rounded-xl border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100/70">
                  <p className="truncate text-sm font-semibold text-slate-900">{safeText(job.title, "Job")}</p>
                  <p className="truncate text-xs text-slate-600">{safeText(job.customer_name || job.address, "No site info")}</p>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Quick actions">
            <div className="grid gap-2 text-sm dashboard-actions">
              <Link to="/jobs/new" className="rounded-xl border border-slate-200 bg-white p-3 font-semibold text-slate-800 hover:bg-slate-50">Create job</Link>
              <Link to="/quotes/new" className="rounded-xl border border-slate-200 bg-white p-3 font-semibold text-slate-800 hover:bg-slate-50">Build quote</Link>
              <Link to="/invoices/new" className="rounded-xl border border-slate-200 bg-white p-3 font-semibold text-slate-800 hover:bg-slate-50">Create invoice</Link>
              <Link to="/automation" className="rounded-xl border border-slate-200 bg-white p-3 font-semibold text-slate-800 hover:bg-slate-50">Review automation</Link>
            </div>
          </SectionCard>
        </div>
      </AppShell>
    </Layout>
  );
}
