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
    setData({
      jobs: listFrom(jobs, ["jobs"]), clients: listFrom(clients, ["clients"]), quotes: listFrom(quotes, ["quotes"]), invoices: listFrom(invoices, ["invoices"]), workers: listFrom(workers, ["workers"]), approvals: listFrom(approvals, ["approval_items"]).filter((a) => APPROVAL_ACTION_TYPES.has(String(a.action_type || "").toLowerCase()) || !a.action_type),
    });
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

  const priority = useMemo(() => {
    const items = [];
    data.jobs.filter((j) => !j.assigned_worker_id && !j.worker_id).slice(0, 3).forEach((j) => items.push({ title: j.title || "Unassigned job", reason: "Needs worker assignment", chip: "unassigned", action: "assign_worker", button: "Assign" }));
    data.quotes.filter((q) => ["sent", "pending"].includes(String(q.status || "").toLowerCase())).slice(0, 1).forEach((q) => items.push({ title: q.title || "Quote waiting", reason: "Awaiting customer response", chip: "quote", action: "quote_followup", button: "Review quotes" }));
    data.invoices.filter((i) => ["open", "overdue"].includes(String(i.status || "").toLowerCase())).slice(0, 1).forEach((i) => items.push({ title: i.invoice_number || "Invoice follow-up", reason: "Payment still outstanding", chip: String(i.status || "open"), action: "invoice_reminder", button: "Draft invoices" }));
    data.jobs.filter((j) => String(j.status || "").toLowerCase() === "completed").slice(0, 1).forEach((j) => items.push({ title: j.title || "Ready to invoice", reason: "Completed job awaiting invoice", chip: "completed", action: "invoice_draft", button: "Draft invoices" }));
    return items.slice(0, 6);
  }, [data]);

  const runDailyCheck = async () => { setBusy((s) => ({ ...s, run: true })); try { await post("/ai/operator/run-daily-check", {}); } catch {} await load(); setBusy((s) => ({ ...s, run: false })); };
  const prepareToday = async () => { setBusy((s) => ({ ...s, prepare: true })); try { await post("/ai/operator/prepare-today", {}); } catch {} await load(); setBusy((s) => ({ ...s, prepare: false })); setActiveWorkspace("ai_plan"); };

  const askAi = async () => {
    setBusy((s) => ({ ...s, ask: true }));
    try {
      const res = await post("/ai/operator/ask", { question: askQuery });
      setAskResponse(res?.answer || res?.data?.answer || "AI response received.");
    } catch {
      setAskResponse(`Suggested next steps: Assign ${stats.unassigned} unassigned jobs, follow up ${stats.quotesWaiting} quotes, and chase ${stats.overdueInvoices} overdue invoices.`);
    }
    setBusy((s) => ({ ...s, ask: false }));
  };

  const renderModalBody = () => {
    if (modal === "job") return <JobCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create job" />;
    if (modal === "quote") return <QuoteCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create quote" />;
    if (modal === "invoice") return <InvoiceCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create invoice" />;
    if (modal === "client") return <ClientCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Add client" />;
    if (["dispatch", "assign_worker"].includes(modal)) return <SmartHubDispatchPanel canManageDispatch={canSeeOwnerControls} onAssigned={() => load()} />;
    if (modal === "invite_worker") return <div className="text-sm text-slate-600">Invite worker from Team page backup view.</div>;
    if (modal === "prepare") return <div className="space-y-2 text-sm">{aiPlan.map((p) => <div key={p.label} className="rounded-lg border p-2">{p.label}</div>)}</div>;
    if (modal === "ask") return <div className="space-y-3"><div className="flex flex-wrap gap-2">{["What should I do next?", "Jobs needing attention", "Invoice follow-up", "Quote follow-up", "Crew workload"].map((chip) => <button key={chip} onClick={() => setAskQuery(chip)} className="text-xs rounded-full border px-3 py-1">{chip}</button>)}</div><textarea value={askQuery} onChange={(e) => setAskQuery(e.target.value)} className="w-full rounded-lg border p-2" rows={3} /><button onClick={askAi} disabled={busy.ask} className="rounded-full bg-[#155EEF] text-white px-4 py-2 text-sm">{busy.ask ? "Generating…" : "Generate"}</button><div className="rounded-lg border p-3 text-sm min-h-16">{askResponse || "Response will appear here."}</div></div>;
    return <div className="text-sm text-slate-600">Action centre ready.</div>;
  };

  if (loading) return <Layout><div className="p-6">Loading Smart Hub Brain…</div></Layout>;

  const workspaceMap = {
    today: { title: "Today", subtitle: "Run sheet and next actions." },
    dispatch: { title: "Dispatch", subtitle: "Assign unassigned jobs." },
    jobs: { title: "Jobs", subtitle: "Track active and completed jobs." },
    quotes: { title: "Quotes", subtitle: "Follow up quotes waiting response." },
    invoices: { title: "Invoices", subtitle: "Open and overdue invoice follow-up." },
    clients: { title: "Clients", subtitle: "Search clients and fix details." },
    crew: { title: "Crew", subtitle: "Availability and workload." },
    approvals: { title: "Approvals", subtitle: "Review AI prepared items." },
    ai_plan: { title: "AI Plan", subtitle: "Detect → Prepare → Approve → Execute → Log." },
  };

  const metricCards = [
    ["Jobs today", stats.jobsToday, "today", CalendarClock],
    ["Unassigned jobs", stats.unassigned, "dispatch", ClipboardList],
    ["Quotes waiting", stats.quotesWaiting, "quotes", FileText],
    ["Open invoices", stats.openInvoices, "invoices", Receipt],
    ["Ready to invoice", stats.readyToInvoice, "invoices", PlusCircle],
    ["Crew active", stats.crewActive, "crew", Users],
  ];

  const queueItems = [
    { title: "Assign worker", reason: `${stats.unassigned} jobs are unassigned.`, risk: stats.unassigned ? "High" : "Low", action: "dispatch" },
    { title: "Draft invoice", reason: `${stats.readyToInvoice} completed jobs are ready to bill.`, risk: "Medium", action: "invoices" },
    { title: "Follow up quote", reason: `${stats.quotesWaiting} quotes are waiting for response.`, risk: "Medium", action: "quotes" },
    { title: "Send invoice reminder", reason: `${stats.overdueInvoices} invoices are overdue.`, risk: stats.overdueInvoices ? "High" : "Low", action: "invoices" },
    { title: "Review schedule conflict", reason: "Check timing overlap and worker capacity.", risk: "Medium", action: "dispatch" },
    { title: "Fix client details", reason: "Missing contact details block approvals.", risk: "Low", action: "clients" },
  ];
  const renderWorkspace = () => {
    if (activeWorkspace === "dispatch") return <SmartHubDispatchPanel canManageDispatch={canSeeOwnerControls} onAssigned={() => load()} />;
    if (activeWorkspace === "quotes") return <div className="space-y-2">{data.quotes.slice(0, 6).map((q, i) => <div key={q.id || i} className="rounded-xl border p-3 bg-[#F8FAFC]"><p className="font-medium">{q.title || "Quote"}</p></div>)}</div>;
    if (activeWorkspace === "invoices") return <div className="space-y-2">{data.invoices.slice(0, 6).map((i, idx) => <div key={i.id || idx} className="rounded-xl border p-3 bg-[#F8FAFC]"><p className="font-medium">{i.invoice_number || "Invoice"}</p></div>)}</div>;
    if (activeWorkspace === "clients") return <div className="space-y-2">{data.clients.slice(0, 6).map((c, i) => <div key={c.id || i} className="rounded-xl border p-3 bg-[#F8FAFC]"><p className="font-medium">{c.name || c.business_name || "Client"}</p></div>)}</div>;
    if (activeWorkspace === "crew") return <div className="space-y-2">{workers.slice(0, 6).map((w, i) => <div key={w.id || i} className="rounded-xl border p-3 bg-[#F8FAFC]"><p className="font-medium">{w.name || "Crew member"}</p></div>)}</div>;
    if (activeWorkspace === "approvals") return <div className="space-y-2">{data.approvals.slice(0, 6).map((a, i) => <div key={a.id || i} className="rounded-xl border p-3 bg-[#F8FAFC]"><p className="font-medium">{a.title || "Approval"}</p></div>)}</div>;
    if (activeWorkspace === "ai_plan") return <div className="space-y-2">{aiPlan.map((p) => <div key={p.label} className="rounded-xl border p-3 bg-[#F8FAFC]"><p className="font-medium">{p.label}</p><p className="text-xs">{p.reason}</p></div>)}</div>;
    return <div className="space-y-2">{data.jobs.slice(0, 8).map((j, i) => <div key={j.id || i} className="rounded-xl border p-3 bg-[#F8FAFC]"><p className="font-medium">{j.title || "Job"}</p></div>)}</div>;
  };

  return <Layout><div className="min-h-screen p-4" style={{ background: "#F4F7FB" }}><div className="mx-auto max-w-7xl space-y-4">
    <section className="bg-white rounded-2xl border p-4">
      <div className="flex flex-wrap justify-between gap-3 items-center">
        <div><span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EAF1FF] text-[#155EEF] inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500"/>AI Command Centre</span><p className="mt-2 text-sm text-slate-600">Business pulse: {stats.jobsToday} jobs today • {stats.unassigned} unassigned</p></div>
        {canSeeOwnerControls ? <div className="flex gap-2"><input value={askQuery} onChange={(e)=>setAskQuery(e.target.value)} placeholder="Ask AI or search your business…" className="rounded-full border px-4 py-2 w-72"/><button onClick={runDailyCheck} className="rounded-full bg-[#155EEF] text-white px-3 py-2 text-sm">Run brain scan</button><button onClick={()=>setCreateMenuOpen((s)=>!s)} className="rounded-full border px-3 py-2 text-sm">Create</button><button onClick={()=>setActiveWorkspace('approvals')} className="rounded-full border px-3 py-2 text-sm">Review approvals</button></div> : null}
      </div>
    </section>
    <section className="grid grid-cols-2 lg:grid-cols-6 gap-2">{metricCards.map(([l,c,w,Icon]) => <button key={l} onClick={()=>setActiveWorkspace(w)} className="bg-white rounded-xl border p-3 text-left"><p className="text-lg font-semibold">{c}</p><p className="text-xs">{l}</p></button>)}</section>
    <section className="grid lg:grid-cols-12 gap-4">
      <aside className="lg:col-span-3 bg-white rounded-2xl border p-3 space-y-2"><h3 className="font-semibold">AI Priority Queue</h3>{queueItems.map((q)=><button key={q.title} onClick={()=>{setActiveWorkspace(q.action); setSelectedContext(q);}} className="w-full text-left rounded-xl border p-3 bg-[#F8FAFC]"><p className="text-sm font-medium">{q.title}</p><p className="text-xs text-slate-500">{q.reason}</p><span className="text-[10px] px-2 py-1 rounded-full bg-white border">{q.risk} risk</span></button>)}</aside>
      <main className="lg:col-span-6 bg-white rounded-2xl border p-4"><div className="flex gap-2 flex-wrap mb-3">{Object.entries(workspaceMap).map(([k,v]) => <button key={k} onClick={()=>setActiveWorkspace(k)} className={`px-3 py-1 rounded-full text-xs border ${activeWorkspace===k? 'bg-[#155EEF] text-white border-[#155EEF]':'bg-white'}`}>{v.title}</button>)}</div><h3 className="font-semibold">{workspaceMap[activeWorkspace].title}</h3><p className="text-xs text-slate-500 mb-3">{workspaceMap[activeWorkspace].subtitle}</p>{renderWorkspace()}</main>
      <aside className="lg:col-span-3 bg-white rounded-2xl border p-4"><h3 className="font-semibold">Context / Approval</h3><p className="text-xs text-slate-500 mt-1">{selectedContext?.reason || "Select a priority item."}</p><div className="mt-3 rounded-xl border p-3 bg-[#F8FAFC]"><p className="text-sm">AI recommendation: {selectedContext?.title || "No item selected"}</p><p className="text-xs mt-2">Draft preview is prepared here before execution.</p></div>{canSeeOwnerControls ? <div className="mt-3 flex flex-wrap gap-2"><button className="rounded-full bg-[#155EEF] text-white px-3 py-1 text-xs">Approve</button><button className="rounded-full border px-3 py-1 text-xs">Edit</button><button className="rounded-full border px-3 py-1 text-xs">Dismiss</button><button onClick={()=>navigate('/jobs')} className="rounded-full border px-3 py-1 text-xs">Open full record</button></div> : null}</aside>
    </section>
  </div></div>
  <SmartModal open={createMenuOpen} title="Create" onClose={() => setCreateMenuOpen(false)}><div className="grid gap-2">{[["New job","job"],["New quote","quote"],["New invoice","invoice"],["Add client","client"],["Invite worker","invite_worker"]].map(([l,k]) => <button key={k} onClick={()=>{setCreateMenuOpen(false);setModal(k);}} className="rounded-lg border p-2 text-left">{l}</button>)}</div></SmartModal>
  <SmartModal open={Boolean(modal)} title="Command Action" onClose={() => setModal(null)}>{renderModalBody()}</SmartModal>
  </Layout>;

}
