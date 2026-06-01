import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, Bot, CalendarClock, CheckCircle2, ClipboardList, FileText, Hammer, Receipt, Users, X } from "lucide-react";
import Layout from "../components/Layout";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const pickList = (v, keys = []) => {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") {
    for (const key of keys) if (Array.isArray(v[key])) return v[key];
    if (Array.isArray(v.data)) return v.data;
    if (Array.isArray(v.items)) return v.items;
  }
  return [];
};

const Modal = ({ title, open, onClose, children }) => {
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-2 sm:p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
      <div className="sticky top-0 flex items-center justify-between border-b bg-white/95 px-4 py-3"><h3 className="text-lg font-semibold text-slate-900">{title}</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div>
      <div className="p-4">{children}</div>
    </div>
  </div>;
};

class DashboardErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error("Smart Hub crash", error); }
  render() {
    if (this.state.hasError) {
      return <Layout><div className="min-h-screen bg-slate-100 p-4"><div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 text-center shadow-sm"><h2 className="text-xl font-semibold">Something went wrong loading Smart Hub.</h2><div className="mt-4 flex flex-wrap justify-center gap-2"><button className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white" onClick={() => window.location.reload()}>Reload</button><button className="rounded-lg bg-slate-200 px-3 py-2 text-sm" onClick={() => window.location.assign('/jobs')}>Go to Jobs</button><button className="rounded-lg bg-slate-200 px-3 py-2 text-sm" onClick={() => window.location.assign('/login')}>Go to Login</button></div></div></div></Layout>;
    }
    return this.props.children;
  }
}

function DashboardSmartHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwnerView = ["owner", "admin", "manager", "office_admin", "platform_owner"].includes(String(user?.role || "").toLowerCase());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ jobs: [], clients: [], quotes: [], invoices: [], workers: [], approvals: [] });
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState({ run: false, ask: false });
  const [prepareActions, setPrepareActions] = useState([]);
  const [askInput, setAskInput] = useState("");
  const [askResponse, setAskResponse] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const safeGet = async (path) => { try { return await get(path); } catch { return []; } };
    const [jobsRes, clientsRes, quotesRes, invoicesRes, workersRes, approvalsRes] = await Promise.all([
      safeGet("/jobs"), safeGet("/clients"), safeGet("/quotes"), safeGet("/invoices"), safeGet("/team/workers"), isOwnerView ? safeGet("/ai/operator/approval-items") : Promise.resolve([])
    ]);
    setData({
      jobs: pickList(jobsRes?.data ?? jobsRes, ["jobs"]),
      clients: pickList(clientsRes?.data ?? clientsRes, ["clients"]),
      quotes: pickList(quotesRes?.data ?? quotesRes, ["quotes"]),
      invoices: pickList(invoicesRes?.data ?? invoicesRes, ["invoices"]),
      workers: pickList(workersRes?.data ?? workersRes, ["workers"]),
      approvals: pickList(approvalsRes?.data ?? approvalsRes, ["approval_items"]),
    });
    setLoading(false);
  }, [isOwnerView]);

  useEffect(() => { load(); }, [load]);

  const dedupWorkers = useMemo(() => {
    const map = new Map();
    for (const w of data.workers) {
      const key = String(w.email || w.phone || w.name || w.id || w._id || "").toLowerCase();
      if (key && !map.has(key)) map.set(key, w);
    }
    return [...map.values()];
  }, [data.workers]);

  const today = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => ({
    jobsToday: data.jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === today).length,
    unassigned: data.jobs.filter((j) => !j.assigned_worker_id).length,
    activeJobs: data.jobs.filter((j) => ["in_progress", "active"].includes(String(j.status || "").toLowerCase())).length,
    quotesWaiting: data.quotes.filter((q) => ["sent", "draft"].includes(String(q.status || "").toLowerCase())).length,
    openInvoices: data.invoices.filter((i) => ["sent", "overdue", "draft"].includes(String(i.status || "").toLowerCase())).length,
    readyInvoice: data.jobs.filter((j) => String(j.status || "").toLowerCase() === "completed").length,
    overdue: data.invoices.filter((i) => String(i.status || "").toLowerCase() === "overdue").length,
    crewOnSite: dedupWorkers.filter((w) => ["on_site", "active"].includes(String(w.status || "").toLowerCase())).length,
  }), [data, dedupWorkers, today]);

  const runDailyCheck = async () => {
    setBusy((s) => ({ ...s, run: true }));
    try {
      await post("/ai/operator/run-daily-check", {});
      const approvalsRes = await get("/ai/operator/approval-items");
      setData((s) => ({ ...s, approvals: pickList(approvalsRes?.data ?? approvalsRes, ["approval_items"]) }));
      toast.success("Daily check complete");
    } catch {
      const fallback = [];
      if (stats.unassigned) fallback.push({ id: "local-1", title: `Assign ${stats.unassigned} unassigned jobs`, reason: "Jobs need worker allocation.", type: "assign_worker" });
      if (stats.readyInvoice) fallback.push({ id: "local-2", title: `Convert ${stats.readyInvoice} completed jobs`, reason: "Completed jobs should be invoiced.", type: "ready_to_invoice" });
      if (stats.overdue) fallback.push({ id: "local-3", title: `Send ${stats.overdue} overdue invoice reminders`, reason: "Protect cash flow.", type: "invoice_reminder" });
      setData((s) => ({ ...s, approvals: fallback }));
      toast.error("Operator unavailable. Loaded local approval actions.");
    } finally { setBusy((s) => ({ ...s, run: false })); }
  };

  const priorityQueue = [
    ...data.jobs.filter((j) => !j.assigned_worker_id).map((j) => ({ title: j.title || "Unassigned job", reason: "Needs worker assignment", action: "assign" })),
    ...data.quotes.filter((q) => ["sent", "draft"].includes(String(q.status || "").toLowerCase())).map((q) => ({ title: q.title || "Quote follow-up", reason: "Awaiting client response", action: "quoteFollowup" })),
    ...data.invoices.filter((i) => String(i.status || "").toLowerCase() === "overdue").map((i) => ({ title: i.invoice_number || "Overdue invoice", reason: "Send reminder", action: "reminder" })),
    ...data.jobs.filter((j) => String(j.status || "").toLowerCase() === "completed").map((j) => ({ title: j.title || "Ready to invoice", reason: "Convert to invoice", action: "convert" })),
  ].slice(0, 6);

  if (loading) return <Layout><div className="p-6">Loading Smart Hub…</div></Layout>;
  return <Layout><div className="min-h-screen bg-slate-100 p-3 sm:p-5"><div className="mx-auto max-w-7xl space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Command Centre</span><h1 className="mt-2 text-2xl font-semibold">Welcome back, {user?.name || "there"}</h1><p className="text-sm text-slate-600">{new Date().toLocaleDateString()} • AI Command Centre</p><p className="mt-1 text-sm text-slate-700">{stats.jobsToday} jobs today • {stats.unassigned} unassigned • {stats.openInvoices} open invoices</p></div><div className="flex flex-wrap gap-2">{[["New job", "job"], ["New quote", "newquote"], ["New invoice", "newinvoice"], ["Add client", "client"], ["Dispatch board", "dispatch"]].map(([l, k]) => <button key={k} onClick={() => setModal(k)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">{l}</button>)}</div></div></div>

    {isOwnerView && <div id="ai-operator" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="flex items-center gap-2 font-semibold"><Bot className="h-4 w-4" />AI Operator</p><p className="text-sm">Pending approvals: {data.approvals.length}</p></div><div className="flex flex-wrap gap-2"><button onClick={runDailyCheck} disabled={busy.run} className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white">{busy.run ? "Running…" : "Run daily check"}</button><button onClick={() => document.getElementById("approval-list")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg bg-slate-200 px-3 py-2 text-xs">Review approvals</button><button onClick={() => setModal("prepare")} className="rounded-lg bg-slate-200 px-3 py-2 text-xs">Prepare today’s actions</button><button onClick={() => setModal("ask")} className="rounded-lg bg-slate-200 px-3 py-2 text-xs">Ask AI</button></div></div><div id="approval-list" className="mt-3">{data.approvals.length ? data.approvals.slice(0, 6).map((a) => <div key={a.id || a._id} className="mb-2 rounded-lg border p-3 text-sm"><p className="font-medium">{a.title || "Approval item"}</p><p className="text-xs text-slate-600">{a.reason || "Prepared by AI Operator."}</p></div>) : <p className="text-sm text-slate-600">No approvals pending. Run daily check to prepare actions.</p>}</div></div>}

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Jobs today", stats.jobsToday, <CalendarClock className="h-4 w-4" />, () => document.getElementById("run-sheet")?.scrollIntoView({ behavior: "smooth" })], ["Unassigned jobs", stats.unassigned, <ClipboardList className="h-4 w-4" />, () => setModal("assign")], ["Active jobs", stats.activeJobs, <Hammer className="h-4 w-4" />, () => navigate("/jobs")], ["Quotes waiting", stats.quotesWaiting, <FileText className="h-4 w-4" />, () => setModal("quoteFollowup")], ["Open invoices", stats.openInvoices, <Receipt className="h-4 w-4" />, () => setModal("invoice")], ["Ready to invoice", stats.readyInvoice, <CheckCircle2 className="h-4 w-4" />, () => setModal("convert")], ["Overdue invoices", stats.overdue, <BellRing className="h-4 w-4" />, () => setModal("reminder")], ["Crew on site", stats.crewOnSite, <Users className="h-4 w-4" />, () => document.getElementById("crew-dispatch")?.scrollIntoView({ behavior: "smooth" })]].map(([l, v, icon, click]) => <button key={l} onClick={click} className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm"><div className="flex items-center justify-between"><p className="text-xl font-semibold">{v}</p>{icon}</div><p className="text-sm font-medium">{l}</p></button>)}</div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5"><div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold">Priority Queue</h3><div className="mt-2 space-y-2">{priorityQueue.length ? priorityQueue.map((item, idx) => <div key={`${item.title}-${idx}`} className="rounded-lg border p-3"><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-slate-600">{item.reason}</p><button onClick={() => setModal(item.action)} className="mt-2 rounded bg-blue-600 px-2 py-1 text-xs text-white">Take action</button></div>) : <p className="text-sm text-slate-600">No urgent items right now.</p>}</div></div>
      <div className="lg:col-span-3 space-y-4"><div id="run-sheet" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold">Today’s Run Sheet</h3><div className="mt-2 space-y-2">{data.jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === today).slice(0, 6).length ? data.jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === today).slice(0, 6).map((j) => <div key={j.id || j._id} className="rounded border p-2 text-sm"><p className="font-medium">{j.title || "Job"}</p><p className="text-xs text-slate-600">{j.customer_name || "Client"} • {j.assigned_worker_name || "Unassigned"}</p></div>) : <p className="text-sm text-slate-600">No jobs scheduled today.</p>}</div></div>
      <div id="crew-dispatch" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-semibold">Crew + Dispatch</h3><div className="text-xs text-slate-500">Crew status only</div></div><div className="mt-2 space-y-2">{dedupWorkers.slice(0, 8).map((w) => <div key={w.id || w._id} className="flex items-center justify-between rounded border p-2 text-sm"><p className="font-medium">{w.name || "Worker"}</p><span className="rounded bg-slate-100 px-2 py-1 text-xs">{w.status || "available"}</span></div>)}</div></div></div></div>

    <Modal title="Command" open={!!modal} onClose={() => setModal(null)}>
      {modal === "job" && <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/jobs/new")}>Open New Job</button>}
      {modal === "newquote" && <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/quotes/new")}>Open New Quote</button>}
      {modal === "newinvoice" && <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/invoices/new")}>Open New Invoice</button>}
      {modal === "client" && <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/clients/new")}>Open Add Client</button>}
      {modal === "dispatch" && <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/dispatch")}>Open Dispatch</button>}
      {modal === "assign" && <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/dispatch")}>Assign Worker</button>}
      {modal === "quoteFollowup" && <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/quotes")}>Quote Follow-up</button>}
      {(modal === "invoice" || modal === "reminder") && <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/invoices")}>Invoice Reminder</button>}
      {modal === "convert" && <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/jobs?status=completed")}>Ready to Invoice</button>}
      {modal === "prepare" && <div><p className="text-sm">Prepare today’s actions.</p><button className="mt-2 rounded bg-blue-600 px-3 py-2 text-white" onClick={() => setPrepareActions(priorityQueue.map((p) => ({ title: p.title, reason: p.reason })))}>Prepare</button><div className="mt-2 space-y-2">{prepareActions.map((a, idx) => <div key={idx} className="rounded border p-2 text-sm"><p className="font-medium">{a.title}</p><p className="text-xs text-slate-600">{a.reason}</p></div>)}</div></div>}
      {modal === "ask" && <div><input value={askInput} onChange={(e) => setAskInput(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="Ask AI" /><div className="mt-2 flex flex-wrap gap-2">{["What should I prioritize today?", "Any risky invoices?", "What needs owner approval?"].map((chip) => <button key={chip} className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={() => setAskInput(chip)}>{chip}</button>)}</div><button className="mt-2 rounded bg-blue-600 px-3 py-2 text-white" disabled={busy.ask} onClick={async () => { setBusy((s) => ({ ...s, ask: true })); try { const res = await post("/ai/operator/ask", { question: askInput }); setAskResponse(res?.data?.response || res?.response || "AI response unavailable."); } catch { setAskResponse("AI unavailable right now. Recommended actions: assign unassigned jobs, follow up quotes, and chase overdue invoices."); } finally { setBusy((s) => ({ ...s, ask: false })); } }}>Ask AI</button>{askResponse ? <div className="mt-2 rounded border bg-slate-50 p-2 text-sm">{askResponse}</div> : null}</div>}
    </Modal>
  </div></div></Layout>;
}

export default function DashboardPage() {
  return <DashboardErrorBoundary><DashboardSmartHub /></DashboardErrorBoundary>;
}
