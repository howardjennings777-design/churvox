import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, Bot, Briefcase, CalendarClock, CheckCircle2, ClipboardList, FileText, Hammer, Receipt, Users, X } from "lucide-react";
import Layout from "../components/Layout";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const pickList = (v, keys = []) => {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") {
    for (const key of keys) {
      if (Array.isArray(v[key])) return v[key];
    }
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwnerView = ["owner", "admin", "manager", "office_admin", "platform_owner"].includes(String(user?.role || "").toLowerCase());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ jobs: [], clients: [], quotes: [], invoices: [], workers: [], approvals: [] });
  const [modal, setModal] = useState(null);
  const [askInput, setAskInput] = useState("");
  const [askResponse, setAskResponse] = useState("");
  const [prepareActions, setPrepareActions] = useState([]);
  const [busy, setBusy] = useState({ run: false, ask: false, prepare: false });

  const load = useCallback(async () => {
    try {
      setError("");
      const [jobsRes, clientsRes, quotesRes, invoicesRes, workersRes, approvalsRes] = await Promise.all([
        get("/jobs"), get("/clients"), get("/quotes"), get("/invoices"), get("/team/workers"), isOwnerView ? get("/ai/operator/approval-items") : Promise.resolve([])
      ]);
      setData({
        jobs: pickList(jobsRes, ["jobs"]), clients: pickList(clientsRes, ["clients"]), quotes: pickList(quotesRes, ["quotes"]),
        invoices: pickList(invoicesRes, ["invoices"]), workers: pickList(workersRes, ["workers"]), approvals: pickList(approvalsRes, ["approval_items"])
      });
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load Smart Hub data");
    } finally { setLoading(false); }
  }, [isOwnerView]);

  useEffect(() => { load(); }, [load]);

  const dedupWorkers = useMemo(() => {
    const map = new Map();
    for (const w of data.workers) {
      const key = (w.email || w.phone || w.name || w.id || w._id || "").toLowerCase();
      if (!key) continue;
      if (!map.has(key) || String(w.status || "").toLowerCase() === "active") map.set(key, w);
    }
    return [...map.values()];
  }, [data.workers]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const jobsToday = data.jobs.filter(j => String(j.scheduled_date || "").slice(0, 10) === todayStr).length;
    const unassigned = data.jobs.filter(j => !j.assigned_worker_id).length;
    const activeJobs = data.jobs.filter(j => ["in_progress", "active"].includes(String(j.status || ""))).length;
    const quotesWaiting = data.quotes.filter(q => ["sent", "draft"].includes(String(q.status || ""))).length;
    const openInvoices = data.invoices.filter(i => ["sent", "overdue", "draft"].includes(String(i.status || ""))).length;
    const readyInvoice = data.jobs.filter(j => String(j.status || "") === "completed").length;
    const overdue = data.invoices.filter(i => String(i.status || "") === "overdue").length;
    const crewOnSite = dedupWorkers.filter(w => ["on_site", "active"].includes(String(w.status || "").toLowerCase())).length;
    return { jobsToday, unassigned, activeJobs, quotesWaiting, openInvoices, readyInvoice, overdue, crewOnSite };
  }, [data, dedupWorkers]);

  const fallbackApprovals = () => {
    const items = [];
    if (stats.unassigned) items.push({ id: `local-a`, title: `Assign ${stats.unassigned} unassigned jobs`, reason: "Jobs need worker allocation.", type: "assign_worker" });
    if (stats.readyInvoice) items.push({ id: `local-b`, title: `Convert ${stats.readyInvoice} completed jobs`, reason: "Completed jobs should be invoiced.", type: "invoice_draft" });
    if (stats.overdue) items.push({ id: `local-c`, title: `Follow up ${stats.overdue} overdue invoices`, reason: "Protect cash flow.", type: "invoice_reminder" });
    return items;
  };

  const runDaily = async () => {
    setBusy(s => ({ ...s, run: true }));
    try {
      await post("/ai/operator/run-daily-check", {});
      const approvalsRes = await get("/ai/operator/approval-items");
      setData(s => ({ ...s, approvals: pickList(approvalsRes, ["approval_items"]) }));
      toast.success("Daily check complete");
    } catch {
      const local = fallbackApprovals();
      setData(s => ({ ...s, approvals: local }));
      toast.error("Operator service unavailable. Loaded safe local approvals.");
    } finally { setBusy(s => ({ ...s, run: false })); }
  };

  const metrics = [
    ["Jobs today", stats.jobsToday, <CalendarClock className="h-4 w-4" />, "Open run sheet", () => document.getElementById("run-sheet")?.scrollIntoView({ behavior: "smooth" })],
    ["Unassigned jobs", stats.unassigned, <ClipboardList className="h-4 w-4" />, "Assign worker", () => setModal("assign")],
    ["Active jobs", stats.activeJobs, <Hammer className="h-4 w-4" />, "Open jobs", () => navigate("/jobs")],
    ["Quotes waiting", stats.quotesWaiting, <FileText className="h-4 w-4" />, "Follow-up", () => setModal("quote")],
    ["Open invoices", stats.openInvoices, <Receipt className="h-4 w-4" />, "Review", () => setModal("invoice")],
    ["Ready to invoice", stats.readyInvoice, <CheckCircle2 className="h-4 w-4" />, "Convert", () => setModal("convert")],
    ["Overdue invoices", stats.overdue, <BellRing className="h-4 w-4" />, "Remind", () => setModal("reminder")],
    ["Crew on site", stats.crewOnSite, <Users className="h-4 w-4" />, "Focus crew", () => document.getElementById("crew-dispatch")?.scrollIntoView({ behavior: "smooth" })]
  ];

  if (loading) return <Layout><div className="p-6">Loading Smart Hub…</div></Layout>;
  if (error) return <Layout><div className="p-6 text-red-600">{error}</div></Layout>;

  return <Layout><div className="min-h-screen bg-slate-100 p-3 sm:p-5">
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Command Centre</span>
            <h1 className="mt-2 text-2xl font-semibold">Welcome back, {user?.name || "there"}</h1>
            <p className="text-sm text-slate-600">Today • {new Date().toLocaleDateString()} • Status: Live</p>
            <p className="mt-1 text-sm text-slate-700">Live operations: {stats.jobsToday} jobs today, {stats.unassigned} unassigned, {stats.openInvoices} invoices open, {stats.crewOnSite} crew active.</p></div>
          <div className="flex flex-wrap gap-2">{[["New job", "job"], ["New quote", "newquote"], ["New invoice", "newinvoice"], ["Add client", "client"], ["Dispatch board", "dispatch"]].map(([label, key]) => <button key={key} onClick={() => setModal(key)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">{label}</button>)}</div>
        </div>
      </div>

      {isOwnerView && <div id="ai-operator" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="flex items-center gap-2 font-semibold"><Bot className="h-4 w-4" />AI Operator</p><p className="text-sm text-slate-600">I check jobs, quotes, invoices, crew, and follow-ups. Review what should happen next.</p><p className="text-sm mt-1">Pending approvals: {data.approvals.length}</p></div>
          <div className="flex flex-wrap gap-2"><button disabled={busy.run} onClick={runDaily} className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white">{busy.run ? "Running…" : "Run daily check"}</button><button onClick={() => document.getElementById("approval-list")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg bg-slate-200 px-3 py-2 text-xs">Review approvals</button><button onClick={async () => { setBusy(s => ({ ...s, prepare: true })); try { const r = await post("/ai/operator/prepare-today", {}); setPrepareActions(pickList(r, ["actions"])); setModal("prepare"); } catch { toast.error("Failed to prepare actions"); } finally { setBusy(s => ({ ...s, prepare: false })); } }} className="rounded-lg bg-slate-200 px-3 py-2 text-xs">Prepare today’s actions</button><button onClick={() => setModal("ask")} className="rounded-lg bg-slate-200 px-3 py-2 text-xs">Ask AI</button></div></div>
        <div id="approval-list" className="mt-3">{data.approvals.length === 0 ? <p className="text-sm text-slate-600">No approvals pending. Run daily check to prepare actions.</p> : <div className="space-y-2">{data.approvals.slice(0, 8).map((a) => <div key={a.id || a._id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><div><p className="font-medium text-sm">{a.title || "Approval item"}</p><p className="text-xs text-slate-600">{a.reason || a.summary || "Prepared by AI Operator."}</p></div><span className="rounded bg-slate-100 px-2 py-1 text-xs">{a.type || "action"}</span></div><div className="mt-2 flex flex-wrap gap-2"><button className="rounded bg-blue-600 px-2 py-1 text-xs text-white" onClick={async () => { try { await post(`/ai/operator/approval-items/${a.id || a._id}/approve`, {}); load(); toast.success("Approved"); } catch { toast.error("Approve failed"); } }}>Approve</button><button className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={() => setModal("edit")}>Edit</button><button className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={async () => { try { await post(`/ai/operator/approval-items/${a.id || a._id}/dismiss`, {}); load(); toast.success("Dismissed"); } catch { toast.error("Dismiss failed"); } }}>Dismiss</button><button className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={() => a.related_entity_type === "job" ? navigate(`/jobs/${a.related_entity_id}`) : navigate("/jobs")}>Open record</button></div></div>)}</div>}</div>
      </div>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{metrics.map(([label, value, icon, hint, onClick]) => <button key={label} onClick={onClick} className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm"><div className="flex items-center justify-between"><p className="text-xl font-semibold">{value}</p>{icon}</div><p className="text-sm font-medium">{label}</p><p className="text-xs text-slate-500">{hint}</p></button>)}</div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold">Priority Queue</h3>
          <div className="mt-2 space-y-2">{[
            ...data.jobs.filter(j => !j.assigned_worker_id).slice(0, 2).map(j => ({ title: j.title || "Unassigned job", reason: "Needs worker", chip: "Unassigned", action: () => setModal("assign") })),
            ...data.quotes.filter(q => ["sent", "draft"].includes(String(q.status || ""))).slice(0, 2).map(q => ({ title: q.title || "Quote follow-up", reason: "Awaiting response", chip: "Quote", action: () => setModal("quote") })),
            ...data.invoices.filter(i => String(i.status || "") === "overdue").slice(0, 1).map(i => ({ title: i.invoice_number || "Overdue invoice", reason: "Send reminder", chip: "Invoice", action: () => setModal("reminder") })),
            ...data.jobs.filter(j => String(j.status || "") === "completed").slice(0, 1).map(j => ({ title: j.title || "Ready to invoice", reason: "Convert to invoice", chip: "Convert", action: () => setModal("convert") }))
          ].slice(0, 6).map((item, i) => <div key={i} className="rounded-lg border p-3"><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-slate-600">{item.reason}</p><div className="mt-2 flex items-center justify-between"><span className="rounded bg-slate-100 px-2 py-1 text-xs">{item.chip}</span><button onClick={item.action} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Take action</button></div></div>)}</div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div id="run-sheet" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold">Today’s Run Sheet</h3>{data.jobs.filter(j => String(j.scheduled_date || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length === 0 ? <div className="mt-2 text-sm text-slate-600">No jobs scheduled today.<div className="mt-2 flex gap-2"><button className="rounded bg-blue-600 px-3 py-1 text-xs text-white" onClick={() => setModal("job")}>New job</button><button className="rounded bg-slate-200 px-3 py-1 text-xs" onClick={() => setModal("dispatch")}>Open dispatch</button></div></div> : <div className="mt-2 space-y-2">{data.jobs.filter(j => String(j.scheduled_date || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).slice(0, 6).map((j) => <div key={j.id || j._id} className="rounded border p-2 text-sm"><div className="flex justify-between"><p className="font-medium">{j.title || "Job"}</p><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{j.status || "scheduled"}</span></div><p className="text-xs text-slate-600">{j.scheduled_date || "Today"} • {j.customer_name || "Client"} • {j.assigned_worker_name || "Unassigned"}</p><button onClick={() => navigate(`/jobs/${j.id || j._id}`)} className="mt-1 rounded bg-slate-200 px-2 py-1 text-xs">Open</button></div>)}</div>}</div>
          <div id="crew-dispatch" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-semibold">Crew + Dispatch</h3><div className="text-sm">{stats.unassigned} unassigned jobs <button onClick={() => setModal("assign")} className="ml-2 rounded bg-blue-600 px-2 py-1 text-xs text-white">Assign now</button></div></div><div className="mt-2 space-y-2">{dedupWorkers.slice(0, 8).map(w => <div key={w.id || w._id} className="flex items-center justify-between rounded border p-2 text-sm"><div><p className="font-medium">{w.name || "Worker"}</p><p className="text-xs text-slate-600">Jobs today: {data.jobs.filter(j => String(j.assigned_worker_id || "") === String(w.id || w._id)).length}</p></div><div className="flex items-center gap-2"><span className="rounded bg-slate-100 px-2 py-1 text-xs">{w.status || "available"}</span><button onClick={() => setModal("assign")} className="rounded bg-slate-200 px-2 py-1 text-xs">Assign now</button></div></div>)}</div></div>
        </div>
      </div>
    </div>

    <Modal title="Command" open={!!modal} onClose={() => setModal(null)}>
      {modal === "job" && <div><p>Create a new job from command centre.</p><button className="mt-3 rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/jobs/new")}>Open Job Form</button></div>}
      {modal === "newquote" && <div><p>Create a quote quickly.</p><button className="mt-3 rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/quotes/new")}>Open Quote Form</button></div>}
      {modal === "newinvoice" && <div><p>Create an invoice.</p><button className="mt-3 rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/invoices/new")}>Open Invoice Form</button></div>}
      {modal === "client" && <div><p>Add a client record.</p><button className="mt-3 rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/clients/new")}>Open Client Form</button></div>}
      {modal === "dispatch" && <div><p>Open dispatch board for allocations.</p><button className="mt-3 rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/dispatch")}>Open Dispatch</button></div>}
      {modal === "assign" && <div><p>Assign workers to unassigned jobs.</p><button className="mt-3 rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/dispatch")}>Open Assignment Board</button></div>}
      {modal === "quote" && <div><p>Review quotes that need follow-up.</p><button className="mt-3 rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/quotes")}>Open Quotes</button></div>}
      {modal === "invoice" || modal === "reminder" && <div><p>Review open and overdue invoices.</p><button className="mt-3 rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/invoices")}>Open Invoices</button></div>}
      {modal === "convert" && <div><p>Convert completed jobs to invoices.</p><button className="mt-3 rounded bg-blue-600 px-3 py-2 text-white" onClick={() => navigate("/jobs?status=completed")}>Open Completed Jobs</button></div>}
      {modal === "prepare" && <div className="space-y-2">{prepareActions.length ? prepareActions.map((a) => <div key={a.key} className="rounded border p-2"><p className="font-medium text-sm">{a.title}</p><p className="text-xs text-slate-600">{a.reason}</p></div>) : <p>No suggested actions yet.</p>}</div>}
      {modal === "ask" && <div><input className="w-full rounded border px-3 py-2" placeholder="Ask AI about today" value={askInput} onChange={(e) => setAskInput(e.target.value)} /><div className="mt-2 flex flex-wrap gap-2">{["What should I do next?", "Jobs needing attention", "Invoice follow-up", "Quote follow-up"].map(c => <button key={c} className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={() => setAskInput(c)}>{c}</button>)}</div><button disabled={busy.ask} className="mt-3 rounded bg-blue-600 px-3 py-2 text-white" onClick={async () => { setBusy(s => ({ ...s, ask: true })); try { const res = await post("/ai/operator/ask", { question: askInput }); setAskResponse(res?.response || "No response."); } catch { toast.error("AI request failed"); } finally { setBusy(s => ({ ...s, ask: false })); } }}>{busy.ask ? "Asking..." : "Ask AI"}</button>{askResponse ? <div className="mt-2 rounded border bg-slate-50 p-2 text-sm">{askResponse}</div> : null}</div>}
      {modal === "edit" && <div><p>Edit is available from full workspace records.</p></div>}
    </Modal>
  </div></Layout>;
}
