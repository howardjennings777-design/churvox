import { useNavigate, Link } from "react-router-dom";
import { X } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import useAiDraft from "../hooks/useAiDraft";
import {
  Briefcase, Calendar, CheckCircle, FileText, Users, Plus,
  AlertTriangle, Receipt, Clock3, Send, BellRing,
  ShieldCheck, Radio, Bot, ListChecks,
} from "lucide-react";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import {
  PremiumPage, PremiumCard, PremiumStatCard,
  PremiumButton, PremiumBadge,
  PremiumLoadingState, PremiumErrorState, PremiumEmptyState,
} from "../components/premium";
import PremiumStatusBadge from "../components/premium/PremiumStatusBadge";
import JobCreateForm from "../components/forms/JobCreateForm";
import QuoteCreateForm from "../components/forms/QuoteCreateForm";
import InvoiceCreateForm from "../components/forms/InvoiceCreateForm";
import ClientCreateForm from "../components/forms/ClientCreateForm";
import SmartHubDispatchPanel from "../components/SmartHubDispatchPanel";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, normalizedRole } = useAuth();
  const { get, post } = useApi();
  const runSheetRef = useRef(null);
  const crewRef = useRef(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [stats, setStats] = useState({});
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [hubPanel, setHubPanel] = useState({ open: false, key: null, payload: null });
  const [approvalItems, setApprovalItems] = useState([]);
  const [dailyPlan, setDailyPlan] = useState([]);

  const { loading: aiLoading, draft, llmAvailable, setDraft, generate } = useAiDraft("smart_hub");

  const isAdmin = ["owner", "manager", "office_admin"].includes(normalizedRole);

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    setPageError("");
    try {
      const [statsRes, jobsRes, quotesRes, invoicesRes, workersRes] = await Promise.all([
        get("/dashboard/stats"),
        get("/jobs"),
        get("/quotes"),
        get("/invoices"),
        get("/team/workers"),
      ]);
      setStats(statsRes?.success ? (statsRes.data || {}) : {});
      setJobs(safeArray(jobsRes?.success ? jobsRes.data : []));
      setQuotes(safeArray(quotesRes?.success ? quotesRes.data : []));
      setInvoices(safeArray(invoicesRes?.success ? invoicesRes.data : []));
      setWorkers(safeArray(workersRes?.success ? workersRes.data : []));
    } catch (err) {
      setPageError(safeText(err, "Failed to load Smart Hub"));
    } finally {
      setPageLoading(false);
    }
  }, [get]);

  const fetchApprovals = useCallback(async () => {
    if (!isAdmin) return;
    const res = await get("/ai/operator/approval-items");
    if (res?.success && res.data?.success) setApprovalItems(safeArray(res.data.data));
  }, [get, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);
  const openPanel = (key, payload = null) => setHubPanel({ open: true, key, payload });
  const closePanel = () => setHubPanel({ open: false, key: null, payload: null });

  const smart = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const activeStatuses = ["assigned", "acknowledged", "in_progress", "paused"];
    const activeJobs = jobs.filter((j) => activeStatuses.includes(String(j.status || "")));
    const completedJobs = jobs.filter((j) => String(j.status || "") === "completed");
    const todayJobs = jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === todayKey);
    const unassignedJobs = jobs.filter((j) => !j.assigned_worker_id);
    const overdueInvoices = invoices.filter((inv) => String(inv.status || "") === "overdue");
    const openInvoices = invoices.filter((inv) => ["draft", "sent", "overdue"].includes(String(inv.status || "")));
    const quotesWaiting = quotes.filter((q) => ["sent", "draft"].includes(String(q.status || "")));
    const busyWorkerIds = new Set(activeJobs.map((j) => j.assigned_worker_id).filter(Boolean));

    return { todayJobs, activeJobs, completedJobs, unassignedJobs, overdueInvoices, openInvoices, quotesWaiting, crewOnSite: busyWorkerIds.size, teamCount: safeNumber(stats.team_count, workers.length) };
  }, [jobs, invoices, quotes, stats, workers]);

  const priorityItems = useMemo(() => {
    const items = [];
    smart.unassignedJobs.slice(0, 3).forEach((j) => items.push({ id: `u-${j.id || j._id}`, title: safeText(j.title, "Untitled job"), reason: "Needs assignment", chip: "Needs assignment", action: "Assign", onClick: () => openPanel("assignWorker") }));
    smart.quotesWaiting.slice(0, 1).forEach((q) => items.push({ id: `q-${q.id || q._id}`, title: safeText(q.title || q.subject, "Quote follow-up"), reason: "Waiting for client response", chip: "Quote follow-up", action: "Review", onClick: () => openPanel("quoteFollowup") }));
    smart.openInvoices.slice(0, 1).forEach((inv) => items.push({ id: `i-${inv.id || inv._id}`, title: `Invoice #${safeText(inv.number || inv.id, "-")}`, reason: "Customer reminder pending", chip: "Invoice reminder", action: "Remind", onClick: () => openPanel("invoiceReminder") }));
    smart.completedJobs.slice(0, 1).forEach((j) => items.push({ id: `c-${j.id || j._id}`, title: safeText(j.title, "Completed job"), reason: "Completed and ready to bill", chip: "Ready to invoice", action: "Convert", onClick: () => openPanel("invoiceFromJob") }));
    return items.slice(0, 6);
  }, [smart]);

  const panelConfig = { job: { title: "New job", subtitle: "Create, schedule, and assign work.", src: "/jobs/new" }, quote: { title: "New quote", subtitle: "Create and send quote drafts.", src: "/quotes/new" }, invoice: { title: "New invoice", subtitle: "Create and bill from Smart Hub.", src: "/invoices/new" }, client: { title: "Add client", subtitle: "Create customer records.", src: "/clients/new" }, dispatch: { title: "Dispatch Board", subtitle: "Assign workers and balance today’s schedule.", src: "/dispatch", large: true }, quoteFollowup: { title: "Quote follow-up", subtitle: "Review quotes awaiting response and draft follow-ups.", src: "/quotes" }, invoiceReminder: { title: "Invoice follow-up", subtitle: "Review open/overdue invoices and draft reminders.", src: "/invoices" }, invoiceFromJob: { title: "Convert completed jobs", subtitle: "Create invoices from completed jobs.", src: "/jobs?status=completed" }, assignWorker: { title: "Assign worker", subtitle: "Assign unassigned jobs to available crew.", src: "/dispatch" } };

  const commandCards = [
    { label: "Jobs today", value: smart.todayJobs.length, icon: <Calendar className="h-4 w-4" />, hint: "Open", onClick: () => runSheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) },
    { label: "Unassigned jobs", value: smart.unassignedJobs.length, icon: <Clock3 className="h-4 w-4" />, tone: "amber", hint: "Assign", onClick: () => openPanel("assignWorker") },
    { label: "Active jobs", value: smart.activeJobs.length, icon: <Briefcase className="h-4 w-4" />, tone: "sky", hint: "Open", onClick: () => runSheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) },
    { label: "Quotes waiting", value: smart.quotesWaiting.length, icon: <FileText className="h-4 w-4" />, tone: "amber", hint: "Review", onClick: () => openPanel("quoteFollowup") },
    { label: "Open invoices", value: smart.openInvoices.length, icon: <Receipt className="h-4 w-4" />, tone: "blue", hint: "Open", onClick: () => openPanel("invoiceReminder") },
    { label: "Ready to invoice", value: smart.completedJobs.length, icon: <CheckCircle className="h-4 w-4" />, tone: "violet", hint: "Convert", onClick: () => openPanel("invoiceFromJob") },
    { label: "Overdue invoices", value: smart.overdueInvoices.length, icon: <AlertTriangle className="h-4 w-4" />, tone: "red", hint: "Remind", onClick: () => openPanel("invoiceReminder") },
    { label: "Crew on site", value: smart.crewOnSite, icon: <Users className="h-4 w-4" />, tone: "teal", hint: "Open", onClick: () => crewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) },
  ];

  if (pageLoading) return <Layout><PremiumPage><PremiumLoadingState title="Loading your Smart Hub" subtitle="Pulling jobs, quotes, invoices and team activity…" /></PremiumPage></Layout>;
  if (pageError) return <Layout><PremiumPage><PremiumErrorState title="Smart Hub unavailable" subtitle={pageError} action={<PremiumButton onClick={fetchData}>Retry</PremiumButton>} /></PremiumPage></Layout>;

  const activePanel = hubPanel.key ? panelConfig[hubPanel.key] : null;
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const pendingApprovals = approvalItems.filter((i) => i.status === "pending");

  return <Layout><PremiumPage>
    <div className="rounded-2xl border border-[#dbe7fb] bg-gradient-to-r from-[#ecf3ff] via-white to-[#f3f8ff] px-4 py-4 md:px-5 md:py-4 mb-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#cdddf7] bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#35518a]"><Radio className="h-3.5 w-3.5" />Command Centre</div>
          <h1 className="mt-2 text-xl md:text-2xl font-semibold text-[#0d1b34]">Welcome back, {safeText(user?.name?.split(" ")?.[0], "there")}</h1>
          <p className="mt-1 text-sm text-[#4f6280]">{todayLabel} · {smart.activeJobs.length > 0 ? "Live operations in progress" : "Live status stable"}</p>
          <p className="mt-1 text-sm text-[#223a66]">Live operations: {smart.todayJobs.length} jobs today, {smart.unassignedJobs.length} unassigned, {smart.openInvoices.length} invoices open, {smart.crewOnSite} crew active.</p>
        </div>
        {isAdmin ? <div className="flex flex-wrap gap-2 md:justify-end">
          <PremiumButton onClick={() => openPanel("job")} iconLeft={<Plus className="h-4 w-4" />}>New job</PremiumButton>
          <PremiumButton size="sm" variant="secondary" onClick={() => openPanel("quote")}>New quote</PremiumButton>
          <PremiumButton size="sm" variant="secondary" onClick={() => openPanel("invoice")}>New invoice</PremiumButton>
          <PremiumButton size="sm" variant="secondary" onClick={() => openPanel("client")}>Add client</PremiumButton>
          <PremiumButton size="sm" variant="ghost" onClick={() => openPanel("dispatch")}>Dispatch board</PremiumButton>
        </div> : null}
      </div>
    </div>

    {isAdmin ? <PremiumCard title="AI Operator" icon={<Bot className="h-4 w-4" />} subtitle="I’ve checked your jobs, quotes, invoices, crew, and follow-ups. Review what should happen next." bodyClassName="space-y-3" className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 min-w-[180px]">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#45618d]">Pending approvals</p>
          <p className="text-2xl font-semibold text-[#0d1b34]">{pendingApprovals.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PremiumButton size="sm" onClick={async () => { const res = await post("/ai/operator/run-daily-check", {}); if (res?.success && res.data?.success) { toast.success(`Prepared ${res.data.created} items for approval`); setDailyPlan(safeArray(res.data.daily_plan)); fetchApprovals(); } }}>Run daily check</PremiumButton>
          <PremiumButton size="sm" variant="secondary" onClick={() => fetchApprovals()}>Review approvals</PremiumButton>
          <PremiumButton size="sm" variant="secondary" onClick={() => generate("Prepare today’s actions and approvals")}>Prepare today’s actions</PremiumButton>
          <PremiumButton size="sm" variant="ghost" onClick={() => generate("Operator mode: what needs owner approval today?")}>Ask AI</PremiumButton>
        </div>
      </div>
      {dailyPlan.length > 0 ? <div className="rounded-xl border border-[#d8e3f3] p-3"><p className="text-sm font-semibold mb-2">Daily owner plan</p>{dailyPlan.map((line, idx) => <p key={`${line}-${idx}`} className="text-sm text-[#4f6280]">{idx + 1}. {line}</p>)}</div> : null}
      <PremiumCard title="Approval Queue" icon={<ListChecks className="h-4 w-4" />} subtitle="Prepared for approval" bodyClassName="space-y-2">
        {pendingApprovals.slice(0, 8).map((item) => <div key={item.id || item._id} className="rounded-xl border border-[#d8e3f3] p-3">
          <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{safeText(item.recommendation, safeText(item.title, "AI action"))}</p><PremiumBadge tone={item.risk_level === "high" ? "red" : "amber"}>{safeText(item.risk_level, "medium")}</PremiumBadge></div>
          <p className="text-xs text-[#5b6c87] mt-1"><span className="font-semibold text-[#324a76]">Reason:</span> {safeText(item.reason, safeText(item.summary, "Prepared by AI Operator for owner review."))}</p>
          <p className="text-xs text-[#5b6c87] mt-1"><span className="font-semibold text-[#324a76]">Record:</span> {safeText(item.related_record || item.reference || item.related_type || item.type, "Related job/quote/invoice/client")}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <PremiumButton size="sm" variant="secondary">Approve</PremiumButton>
            <PremiumButton size="sm" variant="ghost">Edit</PremiumButton>
            <PremiumButton size="sm" variant="ghost">Dismiss</PremiumButton>
            <PremiumButton size="sm" variant="ghost">Open record</PremiumButton>
          </div>
        </div>)}
        {pendingApprovals.length === 0 ? <PremiumEmptyState title="No approvals pending" subtitle="Run daily check to prepare operator actions." /> : null}
      </PremiumCard>
    </PremiumCard> : null}

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">{commandCards.map((card) => <div key={card.label} className="space-y-1"><PremiumStatCard label={card.label} value={card.value} icon={card.icon} tone={card.tone} onClick={card.onClick} /><p className="text-[11px] text-[#5b6c87] pl-1">{card.hint}</p></div>)}</div>

    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-5">
        <PremiumCard title="Priority Queue" subtitle="Top 6 urgent actions" icon={<BellRing className="h-4 w-4" />} bodyClassName="space-y-2">
          {priorityItems.length === 0 ? <PremiumEmptyState title="No urgent actions" subtitle="You're fully caught up for now." /> : priorityItems.map((item) => <div key={item.id} className="rounded-xl border border-[#d8e3f3] p-2.5 flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">{item.title}</p><p className="text-xs text-[#5b6c87]">{item.reason}</p></div><div className="text-right"><PremiumBadge tone="sky">{item.chip}</PremiumBadge><PremiumButton size="sm" className="mt-2" onClick={item.onClick}>{item.action}</PremiumButton></div></div>)}
          {smart.unassignedJobs.length + smart.quotesWaiting.length + smart.openInvoices.length + smart.completedJobs.length > 6 ? <PremiumButton size="sm" variant="ghost" onClick={() => openPanel("dispatch")}>View all actions</PremiumButton> : null}
        </PremiumCard>
      </div>

      <div className="xl:col-span-7 space-y-4">
        <div ref={runSheetRef}>
          <PremiumCard title="Today’s run sheet" subtitle={`${smart.todayJobs.length} scheduled today`} icon={<Calendar className="h-4 w-4" />} bodyClassName="space-y-2">
            {smart.todayJobs.length === 0 ? <div className="rounded-xl border border-dashed border-[#d8e3f3] p-4"><p className="text-sm font-semibold">No jobs scheduled today</p><div className="mt-2 flex gap-2"><PremiumButton size="sm" onClick={() => openPanel("job")}>New job</PremiumButton><PremiumButton size="sm" variant="secondary" onClick={() => openPanel("dispatch")}>Open dispatch</PremiumButton></div></div> : smart.todayJobs.slice(0, 8).map((job) => <div key={job.id || job._id} className="rounded-xl border border-[#d8e3f3] p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-xs text-[#5b6c87]">{safeText(job.scheduled_time, "Any time")}</p><p className="text-sm font-semibold">{safeText(job.title, "Untitled job")}</p><p className="text-xs text-[#5b6c87]">{safeText(job.customer_name || job.client_name, "No client")} · {safeText(workers.find((w) => String(w.id) === String(job.assigned_worker_id))?.name, "Unassigned")}</p></div><PremiumStatusBadge status={job.status} /></div><div className="mt-2"><PremiumButton size="sm" variant="secondary" onClick={() => navigate(`/jobs/${job.id || job._id}`)}>Open</PremiumButton></div></div>)}
          </PremiumCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div ref={crewRef}>
            <PremiumCard title="Crew + Dispatch" subtitle="Crew status and assignment flow" icon={<Users className="h-4 w-4" />} bodyClassName="space-y-2">
              <div className="rounded-xl border border-[#d8e3f3] bg-[#f8fbff] p-3 flex items-center justify-between"><p className="text-sm font-semibold">{smart.unassignedJobs.length} unassigned jobs</p><PremiumButton size="sm" onClick={() => openPanel("assignWorker")}>Assign now</PremiumButton></div>
              {workers.slice(0, 4).map((w) => {
                const assignedToday = smart.todayJobs.filter((j) => String(j.assigned_worker_id) === String(w.id)).length;
                return <div key={w.id} className="rounded-xl border border-[#d8e3f3] p-3"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">{safeText(w.name, "Worker")}</p><p className="text-xs text-[#5b6c87]">{assignedToday} jobs today</p></div><PremiumBadge tone={assignedToday > 0 ? "sky" : "slate"}>{assignedToday > 0 ? "Busy" : "Available"}</PremiumBadge></div><PremiumButton size="sm" variant="secondary" className="mt-2" onClick={() => openPanel("assignWorker")}>Quick assign</PremiumButton></div>;
              })}
            </PremiumCard>
          </div>

          <PremiumCard title="AI Assistant helper" icon={<ShieldCheck className="h-4 w-4" />} subtitle="Quick helper while AI Operator runs approvals" bodyClassName="space-y-2">
            <input className="px-input w-full h-10" value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Ask your business" />
            <div className="flex flex-wrap gap-2"><PremiumButton size="sm" variant="secondary" onClick={() => generate("What should I do next?")}>What should I do next?</PremiumButton><PremiumButton size="sm" variant="secondary" onClick={() => generate("Jobs needing attention")}>Jobs needing attention</PremiumButton><PremiumButton size="sm" variant="secondary" onClick={() => generate("Invoice follow-up")}>Invoice follow-up</PremiumButton><PremiumButton size="sm" variant="secondary" onClick={() => generate("Quote follow-up")}>Quote follow-up</PremiumButton></div>
            <PremiumButton size="sm" iconLeft={<Send className="h-4 w-4" />} disabled={aiLoading} onClick={() => generate(aiInput)}>Generate draft</PremiumButton>
            <p className="text-xs text-[#5b6c87]">Approval-first: review drafts before sending to clients.</p>
            {draft ? <div className="rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 text-sm whitespace-pre-wrap">{draft}</div> : null}
            {!llmAvailable ? <p className="text-xs text-amber-700">Fallback mode active - connect AI key for live AI output.</p> : null}
          </PremiumCard>
        </div>

        
      </div>
    </div>

    {hubPanel.open && activePanel ? <div className="fixed inset-0 z-[70] bg-slate-900/20 backdrop-blur-[3px] px-2 md:px-4 py-2 md:py-10" role="dialog" aria-modal="true"><div className={`mx-auto flex h-full w-full ${activePanel?.large ? "max-w-[1220px]" : "max-w-[760px]"} items-center justify-center`}><div className="w-full h-full md:h-auto md:max-h-[85vh] overflow-hidden rounded-none md:rounded-3xl border border-[#dfe7f4] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.24)] flex flex-col"><div className="px-5 py-4 border-b border-[#e6eef9] flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5b6c87]">COMMAND ACTION</p><p className="text-2xl font-semibold text-[#0d1b34] mt-1">{activePanel.title}</p><p className="text-sm text-[#5b6c87] mt-1">{activePanel.subtitle}</p><Link to={activePanel.src} className="mt-3 inline-flex items-center rounded-lg border border-[#d8e3f3] bg-white px-3 py-1.5 text-xs font-semibold text-[#35518a] hover:border-[#b9c9e6]">Open full page</Link></div><button className="text-[#5b6c87]" onClick={closePanel}><X className="h-5 w-5" /></button></div><div className="p-4 md:p-5 overflow-y-auto flex-1 bg-[#f8fbff]">{hubPanel.key === "job" ? <JobCreateForm isWorker={normalizedRole === "worker"} onCancel={closePanel} onSuccess={() => { toast.success("Job created"); closePanel(); fetchData(); }} submitLabel="Create job" /> : null}{hubPanel.key === "quote" ? <QuoteCreateForm onCancel={closePanel} onSuccess={() => { toast.success("Quote created"); closePanel(); fetchData(); }} submitLabel="Create quote" /> : null}{hubPanel.key === "invoice" ? <InvoiceCreateForm onCancel={closePanel} onSuccess={() => { toast.success("Invoice created"); closePanel(); fetchData(); }} submitLabel="Create invoice" /> : null}{hubPanel.key === "client" ? <ClientCreateForm onCancel={closePanel} onSuccess={() => { toast.success("Client created"); closePanel(); fetchData(); }} submitLabel="Add client" /> : null}{hubPanel.key === "dispatch" || hubPanel.key === "assignWorker" ? <SmartHubDispatchPanel canManageDispatch={isAdmin} onAssigned={() => { toast.success("Assignment updated"); fetchData(); }} /> : null}</div></div></div></div> : null}

  </PremiumPage></Layout>;
}
