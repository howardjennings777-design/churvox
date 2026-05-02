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
  AlertTriangle, Receipt, Clock3, Sparkles, Send, BellRing,
  ShieldCheck, Radio,
} from "lucide-react";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import {
  PremiumPage, PremiumCard, PremiumStatCard,
  PremiumSection, PremiumButton, PremiumBadge,
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
  const { get } = useApi();
  const runSheetRef = useRef(null);
  const activeWorkRef = useRef(null);
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

  useEffect(() => { fetchData(); }, [fetchData]);
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

    return {
      todayJobs,
      activeJobs,
      completedJobs,
      unassignedJobs,
      overdueInvoices,
      openInvoices,
      quotesWaiting,
      crewOnSite: busyWorkerIds.size,
      teamCount: safeNumber(stats.team_count, workers.length),
    };
  }, [jobs, invoices, quotes, stats, workers]);

  const panelConfig = {
    job: { title: "New job", subtitle: "Create, schedule, and assign work.", src: "/jobs/new" },
    quote: { title: "New quote", subtitle: "Create and send quote drafts.", src: "/quotes/new" },
    invoice: { title: "New invoice", subtitle: "Create and bill from Smart Hub.", src: "/invoices/new" },
    client: { title: "Add client", subtitle: "Create customer records.", src: "/clients/new" },
    dispatch: { title: "Dispatch Board", subtitle: "Assign workers and balance today’s schedule.", src: "/dispatch", large: true },
    quoteFollowup: { title: "Quote follow-up", subtitle: "Review quotes awaiting response and draft follow-ups.", src: "/quotes" },
    invoiceReminder: { title: "Invoice follow-up", subtitle: "Review open/overdue invoices and draft reminders.", src: "/invoices" },
    invoiceFromJob: { title: "Convert completed jobs", subtitle: "Create invoices from completed jobs.", src: "/jobs?status=completed" },
    assignWorker: { title: "Assign worker", subtitle: "Assign unassigned jobs to available crew.", src: "/dispatch" },
    crewStatus: { title: "Crew status", subtitle: "See who is available and who is busy.", src: "/team" },
  };

  const commandCards = [
    { label: "Jobs today", value: smart.todayJobs.length, icon: <Calendar className="h-4 w-4" />, onClick: () => runSheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) },
    { label: "Unassigned jobs", value: smart.unassignedJobs.length, icon: <Clock3 className="h-4 w-4" />, tone: "amber", onClick: () => openPanel("assignWorker") },
    { label: "Active jobs", value: smart.activeJobs.length, icon: <Briefcase className="h-4 w-4" />, tone: "sky", onClick: () => activeWorkRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) },
    { label: "Quotes waiting", value: smart.quotesWaiting.length, icon: <FileText className="h-4 w-4" />, tone: "amber", onClick: () => openPanel("quoteFollowup") },
    { label: "Open invoices", value: smart.openInvoices.length, icon: <Receipt className="h-4 w-4" />, tone: "blue", onClick: () => openPanel("invoiceReminder") },
    { label: "Ready to invoice", value: smart.completedJobs.length, icon: <CheckCircle className="h-4 w-4" />, tone: "violet", onClick: () => openPanel("invoiceFromJob") },
    { label: "Overdue invoices", value: smart.overdueInvoices.length, icon: <AlertTriangle className="h-4 w-4" />, tone: "red", onClick: () => openPanel("invoiceReminder") },
    { label: "Crew on site", value: smart.crewOnSite, icon: <Users className="h-4 w-4" />, tone: "teal", onClick: () => crewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) },
  ];

  if (pageLoading) return <Layout><PremiumPage><PremiumLoadingState title="Loading your Smart Hub" subtitle="Pulling jobs, quotes, invoices and team activity…" /></PremiumPage></Layout>;
  if (pageError) return <Layout><PremiumPage><PremiumErrorState title="Smart Hub unavailable" subtitle={pageError} action={<PremiumButton onClick={fetchData}>Retry</PremiumButton>} /></PremiumPage></Layout>;

  const activePanel = hubPanel.key ? panelConfig[hubPanel.key] : null;

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return <Layout><PremiumPage>
    <div className="rounded-2xl border border-[#dbe7fb] bg-gradient-to-r from-[#eff5ff] via-white to-[#f4f8ff] px-4 py-4 md:px-6 md:py-5 mb-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#35518a]"><Radio className="h-3.5 w-3.5" /> SMART HUB COMMAND CENTRE ACTIVE v2</div>
      <h1 className="mt-1 text-xl md:text-2xl font-semibold text-[#0d1b34]">Welcome back, {safeText(user?.name?.split(" ")?.[0], "there")}</h1>
      <p className="mt-1 text-sm text-[#4f6280]">{todayLabel} · {smart.activeJobs.length > 0 ? "Live operations in progress" : "Stable day - no active jobs currently"}</p>
      <p className="mt-2 text-sm text-[#223a66]">Live operations summary: {smart.todayJobs.length} jobs today, {smart.unassignedJobs.length} unassigned, {smart.openInvoices.length} invoices open, {smart.crewOnSite} crew active.</p>
      {isAdmin ? <div className="mt-3 flex flex-wrap gap-2">
        <PremiumButton onClick={() => openPanel("job")} iconLeft={<Plus className="h-4 w-4" />}>New job</PremiumButton>
        <PremiumButton variant="secondary" onClick={() => openPanel("quote")}>New quote</PremiumButton>
        <PremiumButton variant="secondary" onClick={() => openPanel("invoice")}>New invoice</PremiumButton>
        <PremiumButton variant="secondary" onClick={() => openPanel("client")}>Add client</PremiumButton>
        <PremiumButton variant="ghost" onClick={() => openPanel("dispatch")}>Dispatch board</PremiumButton>
      </div> : null}
    </div>

    <div className="px-grid px-grid--4 mb-4">{commandCards.map((card) => <PremiumStatCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} onClick={card.onClick} />)}</div>

    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-3">
        <PremiumCard title="Action queue" subtitle="Urgent actions only" icon={<BellRing className="h-4 w-4" />} bodyClassName="space-y-2">
          {smart.unassignedJobs.slice(0, 3).map((j) => <div key={`u-${j.id || j._id}`} className="rounded-xl border border-[#d8e3f3] p-3"><p className="text-sm font-semibold">{safeText(j.title, "Untitled job")}</p><p className="text-xs text-[#5b6c87]">Needs worker assignment</p><PremiumButton size="sm" className="mt-2" onClick={() => openPanel("assignWorker")}>Assign</PremiumButton></div>)}
          {smart.quotesWaiting.slice(0, 2).map((q) => <div key={`q-${q.id || q._id}`} className="rounded-xl border border-[#d8e3f3] p-3"><p className="text-sm font-semibold">{safeText(q.title || q.subject, "Quote")}</p><PremiumButton size="sm" variant="secondary" className="mt-2" onClick={() => openPanel("quoteFollowup")}>Review</PremiumButton></div>)}
          {smart.completedJobs.slice(0, 2).map((j) => <div key={`c-${j.id || j._id}`} className="rounded-xl border border-[#d8e3f3] p-3"><p className="text-sm font-semibold">{safeText(j.title, "Completed job")}</p><PremiumButton size="sm" variant="secondary" className="mt-2" onClick={() => openPanel("invoiceFromJob")}>Convert</PremiumButton></div>)}
          {smart.openInvoices.slice(0, 2).map((inv) => <div key={`i-${inv.id || inv._id}`} className="rounded-xl border border-[#d8e3f3] p-3"><p className="text-sm font-semibold">Invoice #{safeText(inv.number || inv.id, "-")}</p><PremiumButton size="sm" variant="secondary" className="mt-2" onClick={() => openPanel("invoiceReminder")}>Remind</PremiumButton></div>)}
        </PremiumCard>
      </div>
      <div ref={runSheetRef} className="xl:col-span-5">
        <PremiumCard title="Today's run sheet" subtitle={`${smart.todayJobs.length} scheduled today`} icon={<Calendar className="h-4 w-4" />} bodyClassName="space-y-2">
          {smart.todayJobs.length === 0 ? <PremiumEmptyState title="No jobs scheduled today" subtitle="Create a new job or open dispatch to plan the day." action={<div className="flex gap-2"><PremiumButton onClick={() => openPanel("job")}>New job</PremiumButton><PremiumButton variant="secondary" onClick={() => openPanel("dispatch")}>Open dispatch</PremiumButton></div>} /> : smart.todayJobs.slice(0, 8).map((job) => <div key={job.id || job._id} className="rounded-xl border border-[#d8e3f3] p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">{safeText(job.title, "Untitled job")}</p><p className="text-xs text-[#5b6c87]">{safeText(job.customer_name || job.client_name, "No client")}</p></div><PremiumStatusBadge status={job.status} /></div><div className="mt-2 flex flex-wrap gap-2"><PremiumButton size="sm" variant="secondary" onClick={() => navigate(`/jobs/${job.id || job._id}`)}>Open</PremiumButton>{!job.assigned_worker_id ? <PremiumButton size="sm" onClick={() => openPanel("assignWorker")}>Assign</PremiumButton> : null}{String(job.status) === "completed" ? <PremiumButton size="sm" variant="ghost" onClick={() => openPanel("invoiceFromJob")}>Create invoice</PremiumButton> : null}</div></div>)}
        </PremiumCard>
        <div ref={activeWorkRef} className="mt-4"><PremiumCard title="AI Business Assistant" icon={<ShieldCheck className="h-4 w-4" />} subtitle="Fast drafting for follow-up and daily summaries"><div className="space-y-2"><input className="px-input w-full h-10" value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Ask your business" /><div className="flex flex-wrap gap-2"><PremiumButton size="sm" variant="secondary" onClick={() => generate("Daily owner summary")}>Daily owner summary</PremiumButton><PremiumButton size="sm" variant="secondary" onClick={() => generate("Jobs needing attention")}>Jobs needing attention</PremiumButton><PremiumButton size="sm" variant="secondary" onClick={() => generate("Invoice follow-up")}>Invoice follow-up</PremiumButton><PremiumButton size="sm" variant="secondary" onClick={() => generate("Quote follow-up")}>Quote follow-up</PremiumButton><PremiumButton size="sm" variant="secondary" onClick={() => generate("What should I do next?")}>What should I do next?</PremiumButton></div><PremiumButton iconLeft={<Send className="h-4 w-4" />} disabled={aiLoading} onClick={() => generate(aiInput)}>Generate draft</PremiumButton>{draft ? <div className="rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 text-sm whitespace-pre-wrap">{draft}<div className="mt-2 flex flex-wrap gap-2"><PremiumButton size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(draft)}>Copy</PremiumButton><PremiumButton size="sm" variant="secondary" onClick={() => toast.success("Draft saved")}>Save draft</PremiumButton><PremiumButton size="sm" variant="secondary" onClick={() => openPanel("invoiceReminder")}>Open related record</PremiumButton><PremiumButton size="sm" variant="ghost" onClick={() => setDraft("")}>Dismiss</PremiumButton></div></div> : null}{!llmAvailable ? <p className="text-xs text-amber-700">Fallback mode active - connect AI key for live AI output.</p> : null}</div></PremiumCard></div>
      </div>
      <div ref={crewRef} className="xl:col-span-4">
        <PremiumCard title="Crew + dispatch" subtitle="Worker status and quick assignment" icon={<Users className="h-4 w-4" />} bodyClassName="space-y-2">
          {workers.slice(0, 6).map((w) => {
            const assigned = jobs.filter((j) => String(j.assigned_worker_id) === String(w.id)).length;
            return <div key={w.id} className="rounded-xl border border-[#d8e3f3] p-3"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">{safeText(w.name, "Worker")}</p><p className="text-xs text-[#5b6c87]">{assigned > 0 ? `${assigned} job(s) today` : "No jobs today"}</p></div><PremiumBadge tone={assigned > 0 ? "sky" : "slate"}>{assigned > 0 ? "Busy" : "Available"}</PremiumBadge></div><div className="mt-2"><PremiumButton size="sm" variant="secondary" onClick={() => openPanel("assignWorker")}>Quick assign</PremiumButton></div></div>;
          })}
          <div className="rounded-xl border border-[#d8e3f3] p-3"><p className="text-xs font-semibold uppercase text-[#5b6c87]">Unassigned jobs</p>{smart.unassignedJobs.length === 0 ? <p className="text-xs text-[#5b6c87] mt-1">All jobs assigned.</p> : smart.unassignedJobs.slice(0, 4).map((j) => <div key={`un-${j.id || j._id}`} className="mt-2 flex items-center justify-between gap-2"><span className="text-sm">{safeText(j.title, "Untitled job")}</span><PremiumButton size="sm" onClick={() => openPanel("assignWorker")}>Assign</PremiumButton></div>)}</div>
        </PremiumCard>
        {isAdmin ? <PremiumSection title="Secondary tools" subtitle="Secondary actions only"><div className="grid grid-cols-1 gap-2"><PremiumButton variant="secondary" onClick={() => navigate("/team")}>Invite worker</PremiumButton><PremiumButton variant="secondary" onClick={() => navigate("/communications")}>Communications</PremiumButton><PremiumButton variant="secondary" onClick={() => navigate("/automation")}>Automation</PremiumButton></div></PremiumSection> : null}
      </div>
    </div>

    {hubPanel.open && activePanel ? <div className="fixed inset-0 z-[70] bg-slate-900/20 backdrop-blur-[3px] px-2 md:px-4 py-2 md:py-10" role="dialog" aria-modal="true"><div className={`mx-auto flex h-full w-full ${activePanel?.large ? "max-w-[1220px]" : "max-w-[760px]"} items-center justify-center`}><div className="w-full h-full md:h-auto md:max-h-[85vh] overflow-hidden rounded-none md:rounded-3xl border border-[#dfe7f4] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.24)] flex flex-col"><div className="px-5 py-4 border-b border-[#e6eef9] flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5b6c87]">COMMAND ACTION</p><p className="text-2xl font-semibold text-[#0d1b34] mt-1">{activePanel.title}</p><p className="text-sm text-[#5b6c87] mt-1">{activePanel.subtitle}</p><Link to={activePanel.src} className="mt-3 inline-flex items-center rounded-lg border border-[#d8e3f3] bg-white px-3 py-1.5 text-xs font-semibold text-[#35518a] hover:border-[#b9c9e6]">Open full page</Link></div><button className="text-[#5b6c87]" onClick={closePanel}><X className="h-5 w-5" /></button></div><div className="p-4 md:p-5 overflow-y-auto flex-1 bg-[#f8fbff]">{hubPanel.key === "job" ? <JobCreateForm isWorker={normalizedRole === "worker"} onCancel={closePanel} onSuccess={() => { toast.success("Job created"); closePanel(); fetchData(); }} submitLabel="Create job" /> : null}{hubPanel.key === "quote" ? <QuoteCreateForm onCancel={closePanel} onSuccess={() => { toast.success("Quote created"); closePanel(); fetchData(); }} submitLabel="Create quote" /> : null}{hubPanel.key === "invoice" ? <InvoiceCreateForm onCancel={closePanel} onSuccess={() => { toast.success("Invoice created"); closePanel(); fetchData(); }} submitLabel="Create invoice" /> : null}{hubPanel.key === "client" ? <ClientCreateForm onCancel={closePanel} onSuccess={() => { toast.success("Client created"); closePanel(); fetchData(); }} submitLabel="Add client" /> : null}{hubPanel.key === "dispatch" || hubPanel.key === "assignWorker" ? <SmartHubDispatchPanel canManageDispatch={isAdmin} onAssigned={() => { toast.success("Assignment updated"); fetchData(); }} /> : null}{hubPanel.key === "quoteFollowup" ? <PremiumCard title="Quotes awaiting response" subtitle="Open quote, review details, then follow-up" bodyClassName="space-y-2">{smart.quotesWaiting.slice(0, 8).map((q) => <div key={q.id || q._id} className="rounded-xl border border-[#d8e3f3] p-3 flex items-center justify-between"><div><p className="text-sm font-semibold">{safeText(q.title || q.subject, "Quote")}</p><p className="text-xs text-[#5b6c87]">Status: {safeText(q.status, "sent")}</p></div><PremiumButton size="sm" onClick={() => navigate(`/quotes/${q.id || q._id}`)}>Open</PremiumButton></div>)}{smart.quotesWaiting.length === 0 ? <PremiumEmptyState title="No quotes waiting" subtitle="You're up to date." /> : null}</PremiumCard> : null}{hubPanel.key === "invoiceReminder" ? <PremiumCard title="Invoice follow-up" subtitle="Open invoices needing reminder" bodyClassName="space-y-2">{smart.openInvoices.slice(0, 8).map((inv) => <div key={inv.id || inv._id} className="rounded-xl border border-[#d8e3f3] p-3 flex items-center justify-between"><div><p className="text-sm font-semibold">Invoice #{safeText(inv.number || inv.id, "-")}</p><p className="text-xs text-[#5b6c87]">Status: {safeText(inv.status, "open")}</p></div><PremiumButton size="sm" onClick={() => navigate(`/invoices/${inv.id || inv._id}`)}>Open</PremiumButton></div>)}</PremiumCard> : null}{hubPanel.key === "invoiceFromJob" ? <PremiumCard title="Completed jobs ready to invoice" subtitle="Convert completed work into invoices" bodyClassName="space-y-2">{smart.completedJobs.slice(0, 8).map((j) => <div key={j.id || j._id} className="rounded-xl border border-[#d8e3f3] p-3 flex items-center justify-between"><div><p className="text-sm font-semibold">{safeText(j.title, "Completed job")}</p><p className="text-xs text-[#5b6c87]">{safeText(j.customer_name || j.client_name, "No client")}</p></div><PremiumButton size="sm" onClick={() => openPanel("invoice")}>Convert</PremiumButton></div>)}</PremiumCard> : null}</div></div></div></div> : null}

  </PremiumPage></Layout>;
}
