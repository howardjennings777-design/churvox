import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bot, Briefcase, CalendarClock, CheckCircle2, ClipboardList, FileText, PlusCircle, Receipt, Sparkles, Users, Wrench, X } from "lucide-react";
import Layout from "../components/Layout";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import JobCreateForm from "../components/forms/JobCreateForm";
import QuoteCreateForm from "../components/forms/QuoteCreateForm";
import InvoiceCreateForm from "../components/forms/InvoiceCreateForm";
import ClientCreateForm from "../components/forms/ClientCreateForm";
import SmartHubDispatchPanel from "../components/SmartHubDispatchPanel";

const OWNER_ROLES = ["owner", "admin", "manager", "office_admin", "platform_owner"];
const APPROVAL_ACTION_TYPES = new Set(["assign_worker", "create_invoice_draft", "invoice_reminder", "quote_follow_up", "job_instruction", "customer_update", "client_cleanup", "schedule_conflict"]);
const workspaces = ["today", "dispatch", "jobs", "quotes", "invoices", "clients", "crew", "approvals"];

const listFrom = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  const src = value?.data ?? value;
  if (Array.isArray(src)) return src;
  if (src && typeof src === "object") {
    for (const key of keys) if (Array.isArray(src[key])) return src[key];
    if (Array.isArray(src.items)) return src.items;
    if (Array.isArray(src.data)) return src.data;
  }
  return [];
};

function SmartModal({ open, title, onClose, children }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true"><div className="w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[95vh] overflow-auto"><div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between"><h3 className="font-semibold text-slate-900">{title}</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div><div className="p-4">{children}</div></div></div>;
}

export default function SmartHubBrainPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canSeeOwnerControls = OWNER_ROLES.includes(role) && role !== "payroll";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ jobs: [], clients: [], quotes: [], invoices: [], workers: [], approvals: [] });
  const [modal, setModal] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState("today");
  const [selectedContext, setSelectedContext] = useState(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [askQuery, setAskQuery] = useState("What should I do next?");
  const [askResponse, setAskResponse] = useState("");
  const [busy, setBusy] = useState({ run: false, prepare: false, ask: false, saving: false });

  const load = useCallback(async () => {
    setLoading(true);
    const safe = async (path) => { try { return await get(path); } catch { return []; } };
    const [jobs, clients, quotes, invoices, workers, approvals] = await Promise.all([
      safe("/jobs"), safe("/clients"), safe("/quotes"), safe("/invoices"), safe("/team/workers"), canSeeOwnerControls ? safe("/ai/operator/approval-items") : Promise.resolve([]),
    ]);
    setData({ jobs: listFrom(jobs, ["jobs"]), clients: listFrom(clients, ["clients"]), quotes: listFrom(quotes, ["quotes"]), invoices: listFrom(invoices, ["invoices"]), workers: listFrom(workers, ["workers"]), approvals: listFrom(approvals, ["approval_items"]).filter((a) => APPROVAL_ACTION_TYPES.has(String(a.action_type || "").toLowerCase()) || !a.action_type) });
    setLoading(false);
  }, [canSeeOwnerControls]);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const workers = useMemo(() => {
    const map = new Map();
    for (const worker of data.workers) {
      const key = String(worker.email || worker.phone || worker.name || worker.id || worker._id || "").toLowerCase();
      if (!key) continue;
      if (!map.has(key) || (map.get(key)?.active !== true && worker.active === true)) map.set(key, worker);
    }
    return [...map.values()];
  }, [data.workers]);

  const stats = useMemo(() => ({
    jobsToday: data.jobs.filter((j) => String(j.scheduled_date || j.date || "").slice(0, 10) === today).length,
    unassigned: data.jobs.filter((j) => !j.assigned_worker_id && !j.worker_id).length,
    activeJobs: data.jobs.filter((j) => ["assigned", "active", "in_progress"].includes(String(j.status || "").toLowerCase())).length,
    quotesWaiting: data.quotes.filter((q) => ["sent", "pending", "draft"].includes(String(q.status || "").toLowerCase())).length,
    openInvoices: data.invoices.filter((i) => ["open", "overdue", "draft", "sent"].includes(String(i.status || "").toLowerCase())).length,
    readyToInvoice: data.jobs.filter((j) => String(j.status || "").toLowerCase() === "completed").length,
    overdueInvoices: data.invoices.filter((i) => String(i.status || "").toLowerCase() === "overdue").length,
    crewActive: workers.filter((w) => ["active", "on_site", "busy"].includes(String(w.status || "").toLowerCase())).length,
  }), [data, today, workers]);

  const aiPlan = [
    stats.unassigned ? { label: `Assign ${stats.unassigned} unassigned jobs`, reason: "Prevent schedule delays.", action: "assign_worker", button: "Assign", icon: ClipboardList, chip: "In progress" } : null,
    stats.readyToInvoice ? { label: `Create ${stats.readyToInvoice} draft invoices`, reason: "Completed jobs should convert to invoices.", action: "invoice_draft", button: "Draft invoices", icon: Receipt, chip: "Available" } : null,
    stats.quotesWaiting ? { label: `Follow up ${stats.quotesWaiting} quotes`, reason: "Increase conversion.", action: "quote_followup", button: "Review quotes", icon: FileText, chip: "Needs review" } : null,
    stats.overdueInvoices ? { label: `Chase ${stats.overdueInvoices} overdue invoices`, reason: "Reduce late receivables.", action: "invoice_reminder", button: "Draft invoices", icon: AlertTriangle, chip: "Warning" } : null,
    workers.length ? { label: "Check crew workload", reason: "Balance dispatch before afternoon peak.", action: "crew", button: "Check crew", icon: Users, chip: "Assigned" } : null,
  ].filter(Boolean).slice(0, 5);

  const runDailyCheck = async () => { setBusy((s) => ({ ...s, run: true })); try { await post("/ai/operator/run-daily-check", {}); } catch {} await load(); setBusy((s) => ({ ...s, run: false })); };
  const prepareToday = async () => { setBusy((s) => ({ ...s, prepare: true })); try { await post("/ai/operator/prepare-today", {}); } catch {} await load(); setBusy((s) => ({ ...s, prepare: false })); setActiveWorkspace("ai_plan"); };
  const askAi = async () => { setBusy((s) => ({ ...s, ask: true })); try { const res = await post("/ai/operator/ask", { question: askQuery }); setAskResponse(res?.answer || res?.data?.answer || "AI response received."); } catch { setAskResponse(`Suggested next steps: Assign ${stats.unassigned} unassigned jobs, follow up ${stats.quotesWaiting} quotes, and chase ${stats.overdueInvoices} overdue invoices.`); } setBusy((s) => ({ ...s, ask: false })); };

  const renderModalBody = () => {
    if (modal === "job") return <JobCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create job" />;
    if (modal === "quote") return <QuoteCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create quote" />;
    if (modal === "invoice") return <InvoiceCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create invoice" />;
    if (modal === "client") return <ClientCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Add client" />;
    if (["dispatch", "assign_worker"].includes(modal)) return <SmartHubDispatchPanel canManageDispatch={canSeeOwnerControls} onAssigned={() => load()} />;
    if (modal === "invite_worker") return <div className="text-sm text-slate-600">Invite worker from Team page backup view.</div>;
    if (modal === "ask") return <div className="space-y-3"><textarea value={askQuery} onChange={(e) => setAskQuery(e.target.value)} className="w-full rounded-xl border border-[#DCE6F3] p-3" rows={3} /><button onClick={askAi} disabled={busy.ask} className="rounded-full bg-[#155EEF] text-white px-4 py-2 text-sm">{busy.ask ? "Generating…" : "Ask AI"}</button><div className="rounded-xl border border-[#DCE6F3] p-3 text-sm min-h-16">{askResponse || "Response will appear here."}</div></div>;
    return <div className="text-sm text-slate-600">Action centre ready.</div>;
  };

  if (loading) return <Layout><div className="p-6">Loading Smart Hub Brain…</div></Layout>;

  const workspaceMap = { today: { title: "Today", subtitle: "Run sheet and next actions." }, dispatch: { title: "Dispatch", subtitle: "Assign and route field work." }, jobs: { title: "Jobs", subtitle: "Track active and completed jobs." }, quotes: { title: "Quotes", subtitle: "Follow up quotes waiting response." }, invoices: { title: "Invoices", subtitle: "Open and overdue invoice actions." }, clients: { title: "Clients", subtitle: "Client data quality and records." }, crew: { title: "Crew", subtitle: "Availability and workload." }, approvals: { title: "Approvals", subtitle: "Review AI prepared actions." }, ai_plan: { title: "AI Plan", subtitle: "Detect → Prepare → Approve → Execute → Log." } };
  const metricCards = [["Jobs today", stats.jobsToday, "today", CalendarClock, "Open run sheet"], ["Unassigned", stats.unassigned, "dispatch", ClipboardList, "Assign now"], ["Quotes waiting", stats.quotesWaiting, "quotes", FileText, "Review quotes"], ["Open invoices", stats.openInvoices, "invoices", Receipt, "Draft invoices"], ["Ready to bill", stats.readyToInvoice, "invoices", PlusCircle, "Prepare billing"], ["Crew active", stats.crewActive, "crew", Users, "Check crew"]];

  const renderWorkspace = () => {
    if (activeWorkspace === "dispatch") return <div className="space-y-3"><div className="rounded-2xl border border-[#CFDBEF] bg-gradient-to-br from-[#F8FBFF] to-[#F3F7FF] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"><div className="grid gap-2 sm:grid-cols-3">{[["Unassigned", stats.unassigned], ["Scheduled today", stats.jobsToday], ["Crew available", workers.length - stats.crewActive]].map(([k, v]) => <div key={k} className="rounded-xl border border-[#D9E4F4] bg-white/90 p-3"><p className="text-[11px] uppercase tracking-wide text-[#475569]">{k}</p><p className="mt-1 text-xl font-semibold text-[#0F172A]">{v < 0 ? 0 : v}</p></div>)}</div><div className="mt-3 flex flex-wrap gap-2">{data.jobs.slice(0, 3).map((j, idx) => <div key={j.id || idx} className="rounded-xl border border-[#D9E4F4] bg-white px-3 py-2 text-sm text-[#1E293B]">{j.title || j.job_name || "Job"} <span className="text-xs text-[#64748B]">· {j.status || "queued"}</span></div>)}</div><div className="mt-3"><button onClick={() => setModal("dispatch")} className="rounded-full bg-[#155EEF] text-white px-4 py-2 text-sm font-semibold shadow-[0_10px_20px_rgba(21,94,239,0.25)]">Assign now</button></div></div><SmartHubDispatchPanel canManageDispatch={canSeeOwnerControls} onAssigned={() => load()} /></div>;
    if (activeWorkspace === "today" && stats.jobsToday === 0) return <div className="rounded-2xl border border-[#CFDBEF] bg-gradient-to-b from-[#F8FBFF] to-white p-6 text-center shadow-[0_10px_24px_rgba(15,23,42,0.06)]"><div className="mx-auto h-14 w-14 rounded-2xl bg-[#EAF1FF] border border-[#D3E0F7] flex items-center justify-center"><CalendarClock className="h-7 w-7 text-[#155EEF]" /></div><p className="mt-4 text-xl font-semibold text-[#0F172A]">No jobs scheduled today</p><p className="mt-2 text-sm text-[#475569]">Create a job or open dispatch to plan the day.</p><div className="mt-5 flex justify-center gap-2"><button onClick={() => setModal("job")} className="rounded-full bg-[#155EEF] text-white px-4 py-2 text-sm font-semibold shadow-[0_10px_20px_rgba(21,94,239,0.25)]">New job</button><button onClick={() => setActiveWorkspace("dispatch")} className="rounded-full border border-[#C8D7EE] bg-white px-4 py-2 text-sm font-medium text-[#1E293B]">Open dispatch</button></div></div>;
    if (activeWorkspace === "today") return <div className="rounded-2xl border border-[#CFDBEF] bg-gradient-to-b from-[#F8FBFF] to-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"><p className="text-sm text-[#334155] font-medium">Run sheet is ready for today&apos;s command cycle.</p><div className="mt-4 flex gap-2"><button onClick={() => setModal("job")} className="rounded-full bg-[#155EEF] text-white px-4 py-2 text-sm font-semibold">New job</button><button onClick={() => setActiveWorkspace("dispatch")} className="rounded-full border border-[#C8D7EE] px-4 py-2 text-sm font-medium text-[#1E293B]">Open dispatch</button></div></div>;
    if (activeWorkspace === "invoices") return <div className="space-y-3"><div className="rounded-2xl border border-[#DCE6F3] bg-[#F8FAFC] p-4"><p className="text-sm">Open invoices: <b>{stats.openInvoices}</b> · Ready to invoice: <b>{stats.readyToInvoice}</b></p></div>{data.invoices.slice(0, 6).map((i, idx) => <div key={i.id || idx} className="rounded-2xl border border-[#DCE6F3] p-3"><p className="font-medium text-[#0F172A]">{i.invoice_number || "Invoice"}</p></div>)}</div>;
    return <div className="space-y-3">{(activeWorkspace === "quotes" ? data.quotes : activeWorkspace === "clients" ? data.clients : activeWorkspace === "crew" ? workers : activeWorkspace === "approvals" ? data.approvals : data.jobs).slice(0, 6).map((x, i) => <div key={x.id || i} className="rounded-2xl border border-[#DCE6F3] bg-[#F8FAFC] p-3"><p className="font-medium text-[#0F172A]">{x.title || x.name || x.business_name || x.invoice_number || "Record"}</p></div>)}</div>;
  };

  return <Layout><div className="min-h-screen p-4 sm:p-6" style={{ background: "radial-gradient(circle at 12% 0%, rgba(21,94,239,0.14), transparent 36%), radial-gradient(circle at 85% 0%, rgba(109,93,246,0.12), transparent 32%), linear-gradient(rgba(21,94,239,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px), #F2F6FD", backgroundSize: "auto, auto, 32px 32px, 32px 32px, auto" }}><div className="mx-auto max-w-[1640px] space-y-5">
    <section className="rounded-3xl border border-[#CDDAEE] bg-gradient-to-r from-white via-[#F9FBFF] to-[#F4F8FF] p-5 shadow-[0_18px_36px_rgba(15,23,42,0.10)]"><div className="flex flex-col xl:flex-row gap-4 justify-between"><div><span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EAF1FF] text-[#155EEF] inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#12B981]" />AI Command Centre <span className="text-[#475569]">LIVE</span></span><h1 className="mt-3 text-[30px] leading-tight font-bold text-[#0B1220]">Welcome back, Random az</h1><p className="mt-2 text-sm text-[#1E293B]">Today: {stats.jobsToday} jobs · {stats.unassigned} unassigned · {stats.openInvoices} invoices open · {stats.crewActive} crew active</p><p className="mt-2 text-xs text-[#475569] inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#12B981]" />READY · Live scan ready</p></div><div className="flex flex-wrap items-start gap-2">{[["New job", "job", "primary"], ["New quote", "quote", "secondary"], ["New invoice", "invoice", "secondary"], ["Add client", "client", "secondary"], ["Dispatch", "dispatch", "secondary"]].map(([label, key, style]) => <button key={key} onClick={() => (key === "dispatch" ? setActiveWorkspace("dispatch") : setModal(key))} className={`rounded-full px-4 py-2 text-sm font-semibold ${style === "primary" ? "bg-[#155EEF] text-white shadow-[0_10px_22px_rgba(21,94,239,0.35)]" : "bg-white border border-[#C9D8EE] text-[#1E293B]"}`}>{label}</button>)}<button onClick={runDailyCheck} disabled={busy.run} className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(109,93,246,0.28)]" style={{ background: "linear-gradient(135deg, #155EEF 0%, #6D5DF6 55%, #0EA5E9 100%)" }}>{busy.run ? "Running…" : "Run AI check"}</button></div></div></section>

    <section className="rounded-3xl border border-[#CDD9EE] bg-white p-0 shadow-[0_18px_34px_rgba(15,23,42,0.11)] overflow-hidden"><div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #155EEF 0%, #6D5DF6 50%, #0EA5E9 100%)" }} /><div className="p-6"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full bg-[#EFF4FF] border border-[#D4E1F6] px-3 py-1 text-xs font-semibold text-[#1E293B]"><Bot className="h-3.5 w-3.5 text-[#155EEF]" />AI Brain Engine <span className="h-2 w-2 rounded-full bg-[#12B981]" /></div><p className="mt-3 text-xl font-semibold text-[#0B1220]">I scan the business, prepare the admin, and wait for your approval.</p><div className="mt-3 flex flex-wrap gap-2 text-xs">{["Approval-first", "Draft-only"].map((c) => <span key={c} className="rounded-full border border-[#CADAF4] bg-[#F8FBFF] px-3 py-1 font-semibold text-[#334155]">{c}</span>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2 max-w-lg"><div className="rounded-xl border border-[#D7E3F6] bg-[#F8FBFF] p-3"><p className="text-[11px] uppercase tracking-wide text-[#64748B]">Pending approvals</p><p className="text-xl font-bold text-[#0B1220]">{data.approvals.length}</p></div><div className="rounded-xl border border-[#D7E3F6] bg-[#F8FBFF] p-3"><p className="text-[11px] uppercase tracking-wide text-[#64748B]">Last scan</p><p className="text-xl font-bold text-[#0B1220]">READY</p></div></div>{!data.approvals.length ? <p className="mt-2 text-sm text-[#475569]">No approvals pending. Run brain scan to prepare actions.</p> : null}</div><div className="flex flex-wrap gap-2"><button onClick={runDailyCheck} className="rounded-full bg-[#155EEF] text-white px-4 py-2 text-sm font-semibold shadow-[0_10px_20px_rgba(21,94,239,0.25)]">Run brain scan</button><button onClick={() => setActiveWorkspace("approvals")} className="rounded-full border border-[#CAD8EC] bg-white px-4 py-2 text-sm font-semibold text-[#1E293B]">Review approvals</button><button onClick={prepareToday} className="rounded-full border border-[#CAD8EC] bg-white px-4 py-2 text-sm font-semibold text-[#1E293B]">Prepare today</button><button onClick={() => setModal("ask")} className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #155EEF 0%, #6D5DF6 55%, #0EA5E9 100%)" }}>Ask AI</button></div></div></div></section>

    <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">{metricCards.map(([label, count, workspace, Icon, hint]) => <button key={label} onClick={() => setActiveWorkspace(workspace)} className="group rounded-2xl border border-[#DCE6F3] bg-white p-4 text-left shadow-sm hover:-translate-y-0.5 transition"><div className="h-1 w-10 rounded-full bg-[#EAF1FF] group-hover:bg-[#155EEF]" /><div className="mt-3 flex items-center justify-between"><p className="text-2xl font-bold text-[#0F172A]">{count}</p><span className="rounded-full bg-[#F8FAFC] p-2"><Icon className="h-4 w-4 text-[#155EEF]" /></span></div><p className="mt-1 text-sm text-[#334155]">{label}</p><p className="text-xs text-[#64748B] mt-1">{hint}</p></button>)}</section>

    <section className="rounded-3xl border border-[#DCE6F3] bg-white p-3"><div className="flex flex-wrap gap-2">{workspaces.map((k) => <button key={k} onClick={() => setActiveWorkspace(k)} className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${activeWorkspace === k ? "bg-[#EAF1FF] text-[#155EEF]" : "text-[#334155] border border-[#DCE6F3] bg-white"}`}>{k}</button>)}</div></section>

    <section className="grid gap-4 xl:grid-cols-[330px_minmax(640px,1fr)_350px]"><aside className="rounded-3xl border border-[#CEDBED] bg-white p-4 shadow-sm"><h3 className="text-lg font-semibold text-[#0F172A]">AI Priority Queue</h3><div className="mt-3 space-y-3">{aiPlan.map((item) => <button key={item.label} onClick={() => { setActiveWorkspace(item.action === "crew" ? "crew" : item.action.includes("quote") ? "quotes" : item.action.includes("invoice") ? "invoices" : "dispatch"); setSelectedContext(item); }} className="w-full text-left rounded-2xl border border-[#D2DFF1] bg-white p-0 shadow-[0_8px_18px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_22px_rgba(15,23,42,0.1)]"><div className="flex"><div className="w-1 rounded-l-2xl bg-gradient-to-b from-[#155EEF] to-[#0EA5E9]" /><div className="p-4 w-full"><p className="font-semibold text-[#0B1220]">{item.label}</p><p className="text-sm text-[#334155] mt-1">{item.reason}</p><div className="mt-2 flex items-center justify-between"><span className="text-xs rounded-full bg-[#F8FAFC] border border-[#D0DEF2] px-2 py-1 font-medium text-[#334155]">{item.chip}</span><span className="text-xs text-[#155EEF] font-semibold">{item.button}</span></div></div></div></button>)}</div></aside>
      <main className="rounded-3xl border border-[#DCE6F3] bg-white p-5"><h3 className="text-xl font-semibold text-[#0F172A]">{workspaceMap[activeWorkspace]?.title || "Workspace"}</h3><p className="text-sm text-[#64748B] mb-4">{workspaceMap[activeWorkspace]?.subtitle}</p>{renderWorkspace()}</main>
      <aside className="rounded-3xl border border-[#CFDBEE] bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold text-[#0F172A]">Context / Approval</h3>{selectedContext ? <><p className="mt-2 text-sm text-[#334155]">{selectedContext.reason || "Selected action details."}</p><div className="mt-3 rounded-2xl border border-[#D0DCF0] bg-gradient-to-b from-[#F8FBFF] to-white p-4"><p className="font-semibold text-[#0F172A]">AI recommendation</p><p className="text-sm text-[#334155] mt-2">{selectedContext.label || selectedContext.title}</p><p className="text-xs text-[#64748B] mt-2">Owner approval required before any execution.</p></div></> : <div className="mt-3 rounded-2xl border border-dashed border-[#D0DDF1] bg-gradient-to-b from-[#F8FBFF] to-white p-5 text-center"><div className="mx-auto h-12 w-12 rounded-2xl border border-[#D5E1F3] bg-[#EFF4FF] flex items-center justify-center"><Sparkles className="h-6 w-6 text-[#155EEF]" /></div><p className="mt-3 font-semibold text-[#0F172A]">Select an action to review</p><p className="text-sm text-[#64748B] mt-2">AI-prepared drafts and approval controls will appear here.</p><div className="mt-3 flex flex-wrap justify-center gap-2 text-[11px]">{["Owner approval required", "Draft only", "No message sent"].map((c) => <span key={c} className="rounded-full border border-[#D3DFF2] bg-white px-2 py-1 text-[#475569]">{c}</span>)}</div></div>}{canSeeOwnerControls ? <div className="mt-4 flex flex-wrap gap-2"><button className="rounded-full bg-[#155EEF] text-white px-4 py-2 text-sm font-semibold">Approve</button><button className="rounded-full border border-[#CDD9EE] px-4 py-2 text-sm font-medium text-[#1E293B]">Edit</button><button className="rounded-full border border-[#CDD9EE] px-4 py-2 text-sm font-medium text-[#1E293B]">Dismiss</button><button onClick={() => navigate("/jobs")} className="rounded-full border border-[#CDD9EE] px-4 py-2 text-sm font-medium text-[#1E293B]">Open full record</button></div> : null}</aside></section>
  </div></div>
  <SmartModal open={createMenuOpen} title="Create" onClose={() => setCreateMenuOpen(false)}><div className="grid gap-2">{[["New job", "job"], ["New quote", "quote"], ["New invoice", "invoice"], ["Add client", "client"], ["Invite worker", "invite_worker"]].map(([l, k]) => <button key={k} onClick={() => { setCreateMenuOpen(false); setModal(k); }} className="rounded-lg border p-2 text-left">{l}</button>)}</div></SmartModal>
  <SmartModal open={Boolean(modal)} title="Command Action" onClose={() => setModal(null)}>{renderModalBody()}</SmartModal>
  </Layout>;
}
