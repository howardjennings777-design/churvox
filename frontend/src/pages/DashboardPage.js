import { useNavigate, Link } from "react-router-dom";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Button } from "../components/ui/button";
import { Calendar, FileText, Users, Plus, ArrowRight, AlertTriangle, Receipt, UserPlus, MessageSquareWarning, RefreshCw } from "lucide-react";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import { AppShell, PageHeader, StatCard, SectionCard, EmptyState, LoadingState, ErrorState, StatusBadge } from "../components/premium/PremiumUI";

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
    const todayJobs = jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === todayKey);
    const inProgress = jobs.filter((j) => String(j.status || "") === "in_progress");
    const urgentJobs = jobs.filter((j) => ["paused", "cancelled"].includes(String(j.status || "")) || !j.assigned_worker_id);
    const pendingInvoices = invoices.filter((inv) => ["draft", "sent", "overdue"].includes(String(inv.status || "")));
    const overdueInvoices = invoices.filter((inv) => String(inv.status || "") === "overdue");
    const quotesWaiting = quotes.filter((q) => ["sent", "draft"].includes(String(q.status || "")));

    return {
      todayJobs,
      inProgress,
      urgentJobs,
      pendingInvoices,
      overdueInvoices,
      quotesWaiting,
      teamCount: safeNumber(stats.team_count, workers.length),
      workersActive: inProgress.filter((j) => j.assigned_worker_id).length,
      payrollAlerts: safeNumber(stats.pending_payroll_alerts, 0),
      automationAlerts: (safeNumber(stats.sms_credits, 0) > 0 && safeNumber(stats.sms_credits, 0) <= 10 ? 1 : 0) + (myobSettings && myobSettings.connected === false ? 1 : 0),
    };
  }, [jobs, invoices, quotes, stats, workers, myobSettings]);

  const cockpitCards = [
    { label: "Today’s jobs", value: smart.todayJobs.length, helper: "Scheduled for today", icon: Calendar, path: "/dispatch" },
    { label: "Urgent actions", value: smart.urgentJobs.length, helper: "Paused/unassigned work", icon: AlertTriangle, path: "/jobs" },
    { label: "Pending quotes", value: smart.quotesWaiting.length, helper: "Awaiting client response", icon: FileText, path: "/quotes" },
    { label: "Unpaid invoices", value: smart.pendingInvoices.length, helper: "Draft, sent, and overdue", icon: Receipt, path: "/invoices" },
    { label: "Team status", value: smart.workersActive, helper: `${smart.teamCount} workers in roster`, icon: Users, path: "/team" },
    { label: "Payroll alerts", value: smart.payrollAlerts, helper: "Timesheets and pay-run checks", icon: Users, path: "/payroll" },
    { label: "Automation alerts", value: smart.automationAlerts, helper: "Rules and integration attention", icon: RefreshCw, path: "/automation" },
  ];

  if (pageLoading) return <Layout><LoadingState title="Loading Smart Hub" /></Layout>;
  if (pageError) return <Layout><ErrorState title="Smart Hub unavailable" message={pageError} action={<Button onClick={fetchData}>Retry</Button>} /></Layout>;

  return (
    <Layout>
      <AppShell>
        <PageHeader
          title="Smart Hub"
          description={`Run jobs, teams, quotes, invoices, time, payroll and automation from one powerful field-service hub. Welcome back, ${safeText(user?.name?.split(" ")?.[0], "there")}.`}
          action={isAdmin ? <Button onClick={() => navigate("/jobs/new")} className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-1" />New job</Button> : null}
        >
          {isAdmin && <div className="cx-toolbar"><Button onClick={() => navigate("/quotes/new")} variant="outline">New quote</Button><Button onClick={() => navigate("/invoices/new")} variant="outline">New invoice</Button><Button onClick={() => navigate("/clients/new")} variant="outline">Add client</Button><Button onClick={() => navigate("/team")} variant="outline"><UserPlus className="h-4 w-4 mr-1" />Invite worker</Button></div>}
        </PageHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cockpitCards.map((card) => <StatCard key={card.label} {...card} onClick={() => navigate(card.path)} />)}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <SectionCard title="Today’s jobs" action={<Link to="/dispatch" className="text-sm text-blue-600 inline-flex items-center gap-1">Open schedule <ArrowRight className="h-3 w-3" /></Link>}>
            <div className="space-y-2">
              {smart.todayJobs.slice(0, 5).map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="block rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
                  <p className="text-sm font-medium text-slate-900">{safeText(job.title, "Untitled job")}</p>
                  <p className="text-xs text-slate-500">{safeText(job.customer_name || job.client_name || job.address, "No client details")}</p>
                  <div className="mt-2"><StatusBadge status={job.status} /></div>
                </Link>
              ))}
              {!smart.todayJobs.length && <EmptyState title="No jobs scheduled today" description="You can add or assign work from the jobs page." />}
            </div>
          </SectionCard>

          <SectionCard title="Urgent actions">
            <div className="space-y-2">
              {smart.urgentJobs.slice(0, 5).map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="block rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">{safeText(job.title, "Job")}</p>
                  <p className="text-xs text-slate-600">{safeText(job.customer_name || job.address, "No site info")}</p>
                </Link>
              ))}
              {!smart.urgentJobs.length && <p className="text-sm text-slate-500">No urgent actions right now.</p>}
            </div>
          </SectionCard>

          <SectionCard title="Quick actions">
            <div className="space-y-2 text-sm">
              <Link to="/jobs/new" className="block rounded-xl border border-slate-200 bg-white p-3 text-slate-800">Create a new job</Link>
              <Link to="/quotes/new" className="block rounded-xl border border-slate-200 bg-white p-3 text-slate-800">Build a quote</Link>
              <Link to="/invoices/new" className="block rounded-xl border border-slate-200 bg-white p-3 text-slate-800">Create an invoice</Link>
              <Link to="/team" className="block rounded-xl border border-slate-200 bg-white p-3 text-slate-800">Invite team member</Link>
              <Link to="/automation" className="block rounded-xl border border-slate-200 bg-white p-3 text-slate-800">Review automation rules</Link>
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SectionCard title="Pending quotes">
            <p className="text-3xl font-semibold text-slate-900">{smart.quotesWaiting.length}</p>
            <p className="text-sm text-slate-500 mt-1">Awaiting client approval.</p>
          </SectionCard>
          <SectionCard title="Unpaid invoices">
            <p className="text-3xl font-semibold text-slate-900">{smart.pendingInvoices.length}</p>
            <p className="text-sm text-slate-500 mt-1">Draft, sent, and overdue invoices.</p>
          </SectionCard>
          <SectionCard title="Team status">
            <p className="text-3xl font-semibold text-slate-900">{smart.workersActive}/{smart.teamCount}</p>
            <p className="text-sm text-slate-500 mt-1">Workers currently active in jobs.</p>
          </SectionCard>
          <SectionCard title="Payroll & automation alerts">
            <p className="text-3xl font-semibold text-slate-900">{smart.payrollAlerts + smart.automationAlerts}</p>
            <p className="text-sm text-slate-500 mt-1">Payroll alerts: {smart.payrollAlerts} · Automation alerts: {smart.automationAlerts}</p>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/payroll" className="cx-panel p-4">Payroll alerts <span className="font-semibold">{smart.payrollAlerts}</span></Link>
          <Link to="/automation" className="cx-panel p-4">Automation alerts <span className="font-semibold">{smart.automationAlerts}</span></Link>
          <Link to="/sms" className="cx-panel p-4 inline-flex items-center gap-2"><MessageSquareWarning className="h-4 w-4" />Communications centre</Link>
        </div>
      </AppShell>
    </Layout>
  );
}
