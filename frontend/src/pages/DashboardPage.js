import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import useAiDraft from "../hooks/useAiDraft";
import {
  Briefcase, Calendar, FileText, Users, Plus, ArrowRight,
  AlertTriangle, Receipt, Clock3, Sparkles, Send, DollarSign,
  ShieldCheck, FileSignature, UserPlus, CheckCircle2,
} from "lucide-react";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import {
  PremiumPage, PremiumCard, PremiumButton, PremiumBadge, PremiumAIBox,
  PremiumLoadingState, PremiumErrorState, PremiumEmptyState,
} from "../components/premium";
import PremiumStatusBadge from "../components/premium/PremiumStatusBadge";

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
  const [aiInput, setAiInput] = useState("");
  const { loading: aiLoading, draft, llmAvailable, setDraft, generate } = useAiDraft("smart_hub");

  const isAdmin = ["owner", "manager", "office_admin"].includes(normalizedRole);
  const isWorker = normalizedRole === "worker";

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    setPageError("");
    try {
      const [statsRes, jobsRes, quotesRes, invoicesRes, workersRes] = await Promise.all([
        get("/dashboard/stats"), get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers"),
      ]);
      setStats(statsRes?.success ? (statsRes.data || {}) : {});
      setJobs(safeArray(jobsRes?.success ? jobsRes.data : []));
      setQuotes(safeArray(quotesRes?.success ? quotesRes.data : []));
      setInvoices(safeArray(invoicesRes?.success ? invoicesRes.data : []));
      setWorkers(safeArray(workersRes?.success ? workersRes.data : []));
    } catch (err) {
      setPageError(safeText(err, "Failed to load Smart Hub"));
    } finally { setPageLoading(false); }
  }, [get]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const smart = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayList = jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === todayKey);
    const unassigned = jobs.filter((j) => !j.assigned_worker_id);
    const active = jobs.filter((j) => ["assigned", "acknowledged", "in_progress", "paused"].includes(String(j.status || "")));
    const completed = jobs.filter((j) => String(j.status || "") === "completed");
    const quotesWaiting = quotes.filter((q) => ["sent", "draft"].includes(String(q.status || "")));
    const openInvoices = invoices.filter((inv) => ["draft", "sent", "overdue"].includes(String(inv.status || "")));
    const overdue = invoices.filter((inv) => String(inv.status || "") === "overdue");
    const activeCrew = new Set(active.map((j) => j.assigned_worker_id).filter(Boolean)).size;

    const queue = [
      ...unassigned.slice(0, 3).map((j) => ({ id: `u-${j.id || j._id}`, title: safeText(j.title, "Untitled job"), reason: "Needs worker assignment", type: "Needs assignment", cta: "Assign", to: "/dispatch" })),
      ...quotesWaiting.slice(0, 2).map((q) => ({ id: `q-${q.id || q._id}`, title: safeText(q.title || q.reference, "Quote follow-up"), reason: "Waiting for customer response", type: "Quote follow-up", cta: "Review", to: "/quotes" })),
      ...overdue.slice(0, 2).map((i) => ({ id: `i-${i.id || i._id}`, title: safeText(i.invoice_number || i.title, "Invoice reminder"), reason: "Payment overdue", type: "Invoice reminder", cta: "Remind", to: "/invoices?status=overdue" })),
      ...completed.slice(0, 2).map((j) => ({ id: `c-${j.id || j._id}`, title: safeText(j.title, "Completed job"), reason: "Ready to convert to invoice", type: "Ready to invoice", cta: "Convert", to: "/jobs?status=completed" })),
    ].slice(0, 6);

    return { todayList, unassigned, active, completed, quotesWaiting, openInvoices, overdue, activeCrew, queue };
  }, [jobs, quotes, invoices]);

  const metrics = [
    { label: "Jobs today", count: smart.todayList.length, icon: Calendar, hint: "Open", onClick: () => document.getElementById("today-run-sheet")?.scrollIntoView({ behavior: "smooth", block: "start" }) },
    { label: "Unassigned jobs", count: smart.unassigned.length, icon: Clock3, hint: "Assign", onClick: () => navigate("/dispatch") },
    { label: "Active jobs", count: smart.active.length, icon: Briefcase, hint: "Open", onClick: () => navigate("/jobs") },
    { label: "Quotes waiting", count: smart.quotesWaiting.length, icon: FileText, hint: "Review", onClick: () => navigate("/quotes") },
    { label: "Open invoices", count: smart.openInvoices.length, icon: DollarSign, hint: "Review", onClick: () => navigate("/invoices") },
    { label: "Ready to invoice", count: smart.completed.length, icon: Receipt, hint: "Convert", onClick: () => navigate("/jobs?status=completed") },
    { label: "Overdue invoices", count: smart.overdue.length, icon: AlertTriangle, hint: "Remind", onClick: () => navigate("/invoices?status=overdue") },
    { label: "Crew on site", count: smart.activeCrew, icon: Users, hint: "Open", onClick: () => document.getElementById("crew-dispatch")?.scrollIntoView({ behavior: "smooth", block: "start" }) },
  ];

  if (pageLoading) return <Layout><PremiumPage><PremiumLoadingState title="Loading your Smart Hub" subtitle="Pulling jobs, quotes, invoices and team activity…" /></PremiumPage></Layout>;
  if (pageError) return <Layout><PremiumPage><PremiumErrorState title="Smart Hub unavailable" subtitle={pageError} action={<PremiumButton onClick={fetchData}>Retry</PremiumButton>} /></PremiumPage></Layout>;

  return <Layout><PremiumPage>
    <div className="rounded-3xl border border-[#d8e3f3] bg-white p-4 md:p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PremiumBadge tone="blue" icon={<Sparkles className="h-3 w-3" />}>Command Centre</PremiumBadge>
        <p className="text-xs text-[#5b6c87]">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>
      <h1 className="text-2xl font-bold text-[#0d1b34]">Welcome back, {safeText(user?.name?.split(" ")?.[0], "there")}</h1>
      <p className="text-sm text-[#415371]">Live operations: {smart.todayList.length} jobs today, {smart.unassigned.length} unassigned, {smart.openInvoices.length} invoices open, {smart.activeCrew} crew active.</p>
      {isAdmin && <div className="flex flex-wrap gap-2">
        <PremiumButton onClick={() => navigate("/jobs/new")} iconLeft={<Plus className="h-4 w-4" />}>New job</PremiumButton>
        <PremiumButton variant="secondary" onClick={() => navigate("/quotes/new")}>New quote</PremiumButton>
        <PremiumButton variant="secondary" onClick={() => navigate("/invoices/new")}>New invoice</PremiumButton>
        <PremiumButton variant="secondary" onClick={() => navigate("/clients/new")}>Add client</PremiumButton>
        <PremiumButton variant="ghost" onClick={() => navigate("/dispatch")}>Dispatch board</PremiumButton>
      </div>}
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
      {metrics.map((m) => { const I = m.icon; return <button key={m.label} onClick={m.onClick} className="text-left rounded-2xl border border-[#d8e3f3] bg-white p-3 shadow-sm hover:border-[#9ab6e6]"><div className="flex items-center justify-between"><I className="h-4 w-4 text-[#2a5bd7]"/><span className="text-[11px] text-[#5b6c87]">{m.hint}</span></div><p className="text-2xl font-bold mt-2 text-[#0d1b34]">{safeNumber(m.count,0)}</p><p className="text-xs text-[#415371]">{m.label}</p></button>; })}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mt-4">
      <div className="xl:col-span-2"><PremiumCard title="Priority Queue" subtitle="Fix these things now" bodyClassName="space-y-2">
        {smart.queue.length === 0 ? <PremiumEmptyState title="No urgent actions" subtitle="You're clear for now." icon={<CheckCircle2 className="h-5 w-5"/>}/> : smart.queue.map((item) => <div key={item.id} className="rounded-xl border border-[#d8e3f3] p-3 bg-white"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-sm text-[#0d1b34]">{item.title}</p><p className="text-xs text-[#5b6c87]">{item.reason}</p></div><PremiumStatusBadge status={item.type} /></div><div className="mt-2"><PremiumButton size="sm" onClick={() => navigate(item.to)}>{item.cta}</PremiumButton></div></div>)}
        {(smart.unassigned.length + smart.quotesWaiting.length + smart.overdue.length + smart.completed.length) > 6 && <button onClick={() => navigate("/jobs")} className="px-link text-sm inline-flex items-center gap-1">View all actions <ArrowRight className="h-3 w-3"/></button>}
      </PremiumCard></div>

      <div className="xl:col-span-3 space-y-4">
        <PremiumCard id="today-run-sheet" title="Today’s Run Sheet" subtitle={smart.todayList.length ? `${smart.todayList.length} scheduled today` : "No jobs scheduled today"}>
          {smart.todayList.length === 0 ? <div className="flex flex-wrap gap-2 items-center"><p className="text-sm text-[#5b6c87]">No jobs scheduled today</p>{isAdmin && <><PremiumButton size="sm" onClick={() => navigate('/jobs/new')}>New job</PremiumButton><PremiumButton size="sm" variant="secondary" onClick={() => navigate('/dispatch')}>Open dispatch</PremiumButton></>}</div> : <div className="space-y-2">{smart.todayList.slice(0,6).map((job)=><div key={job.id||job._id} className="grid grid-cols-12 gap-2 items-center rounded-xl border border-[#e5edf8] p-2 text-xs"><div className="col-span-2">{safeText(job.scheduled_time || "--:--")}</div><div className="col-span-3 font-medium">{safeText(job.title, "Untitled")}</div><div className="col-span-3">{safeText(job.customer_name || job.client_name, "No client")}</div><div className="col-span-2">{safeText(job.assigned_worker_name, "Unassigned")}</div><div className="col-span-1"><PremiumStatusBadge status={job.status}/></div><div className="col-span-1"><PremiumButton size="sm" variant="ghost" onClick={()=>navigate(`/jobs/${job.id||job._id}`)}>Open</PremiumButton></div></div>)}</div>}
        </PremiumCard>

        <PremiumCard id="crew-dispatch" title="Crew + Dispatch" subtitle="Team availability and assignment control" actions={isAdmin ? <PremiumButton size="sm" onClick={() => navigate('/dispatch')} iconLeft={<UserPlus className="h-4 w-4"/>}>Assign now</PremiumButton> : null}>
          <p className="text-sm text-[#415371] mb-2">{smart.unassigned.length} unassigned jobs</p>
          <div className="space-y-2">{workers.slice(0,6).map((w)=>{ const c = jobs.filter((j)=>j.assigned_worker_id===w.id && String(j.scheduled_date||"").slice(0,10)===new Date().toISOString().slice(0,10)).length; const status = c===0?"available":c>2?"busy":"assigned"; return <div key={w.id} className="rounded-xl border border-[#e5edf8] p-2 flex items-center justify-between"><div><p className="text-sm font-medium">{safeText(w.name,"Worker")}</p><p className="text-xs text-[#5b6c87]">{c} jobs today</p></div><div className="flex items-center gap-2"><PremiumStatusBadge status={status}/>{isAdmin && <PremiumButton size="sm" variant="secondary" onClick={()=>navigate('/dispatch')}>Quick assign</PremiumButton>}</div></div>; })}</div>
        </PremiumCard>

        {!isWorker && <PremiumAIBox title="AI Business Assistant" subtitle="Compact command helper" chip="Approval-first" suggestions={[]} actions={<PremiumBadge tone="violet" icon={<ShieldCheck className="h-3 w-3" />}>Review before approval</PremiumBadge>}>
          <div className="space-y-2">
            <input value={aiInput} onChange={(e)=>setAiInput(e.target.value)} className="px-input w-full" placeholder="Ask your business"/>
            <div className="flex flex-wrap gap-2 text-xs">{["What should I do next?","Jobs needing attention","Invoice follow-up","Quote follow-up","Daily owner summary"].map((c)=><button key={c} className="px-2 py-1 rounded-full bg-[#eef4ff]" onClick={()=>setAiInput(c)}>{c}</button>)}</div>
            <PremiumButton disabled={aiLoading} iconLeft={<Send className="h-4 w-4"/>} onClick={()=>generate(aiInput)}>Generate draft</PremiumButton>
            {draft && <div className="rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 text-sm whitespace-pre-wrap">{draft}</div>}
            <p className="text-[11px] text-[#5b6c87]">AI never auto-sends customer messages and never changes payroll, pricing, or legal/tax/compliance decisions.</p>
            {!llmAvailable && <p className="text-[11px] text-[#b45309]">Fallback draft mode is active.</p>}
            {draft && <PremiumButton size="sm" variant="ghost" onClick={()=>setDraft("")}>Clear</PremiumButton>}
          </div>
        </PremiumAIBox>}
      </div>
    </div>
  </PremiumPage></Layout>;
}
