import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bot, Briefcase, CalendarClock, CheckCircle2, ClipboardList, FileText, PlusCircle, Receipt, Users, X } from "lucide-react";
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

  const today = new Date().toISOString().slice(0, 10);
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
    stats.unassigned ? { label: `Assign ${stats.unassigned} unassigned jobs`, reason: "Prevent schedule delays.", action: "assign_worker" } : null,
    stats.readyToInvoice ? { label: `Create ${stats.readyToInvoice} draft invoices`, reason: "Completed jobs should convert to invoices.", action: "invoice_draft" } : null,
    stats.quotesWaiting ? { label: `Follow up ${stats.quotesWaiting} quotes`, reason: "Increase conversion.", action: "quote_followup" } : null,
    stats.overdueInvoices ? { label: `Chase ${stats.overdueInvoices} overdue invoices`, reason: "Reduce late receivables.", action: "invoice_reminder" } : null,
    workers.length ? { label: "Check crew workload", reason: "Balance dispatch before afternoon peak.", action: "crew" } : null,
  ].filter(Boolean).slice(0, 5);

  const priority = useMemo(() => {
    const items = [];
    data.jobs.filter((j) => !j.assigned_worker_id && !j.worker_id).slice(0, 3).forEach((j) => items.push({ title: j.title || "Unassigned job", reason: "Needs worker assignment", chip: "unassigned job", action: "assign_worker" }));
    data.quotes.filter((q) => ["sent", "pending"].includes(String(q.status || "").toLowerCase())).slice(0, 1).forEach((q) => items.push({ title: q.title || "Quote waiting", reason: "Awaiting customer response", chip: "quote waiting", action: "quote_followup" }));
    data.invoices.filter((i) => ["open", "overdue"].includes(String(i.status || "").toLowerCase())).slice(0, 1).forEach((i) => items.push({ title: i.invoice_number || "Invoice follow-up", reason: "Payment still outstanding", chip: String(i.status || "open"), action: "invoice_reminder" }));
    data.jobs.filter((j) => String(j.status || "").toLowerCase() === "completed").slice(0, 1).forEach((j) => items.push({ title: j.title || "Ready to invoice", reason: "Completed job awaiting invoice", chip: "ready to invoice", action: "invoice_draft" }));
    data.clients.filter((c) => !c.email && !c.phone).slice(0, 1).forEach((c) => items.push({ title: c.name || "Missing client details", reason: "Add contact information", chip: "client cleanup", action: "client" }));
    return items.slice(0, 6);
  }, [data]);

  const runDailyCheck = async () => { setBusy((s) => ({ ...s, run: true })); try { await post("/ai/operator/run-daily-check", {}); } catch {} await load(); setBusy((s) => ({ ...s, run: false })); };
  const prepareToday = async () => { setBusy((s) => ({ ...s, prepare: true })); try { await post("/ai/operator/prepare-today", {}); } catch {} await load(); setBusy((s) => ({ ...s, prepare: false })); setModal("prepare"); };

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
    if (modal === "prepare") return <div className="space-y-2 text-sm">{aiPlan.map((p) => <div key={p.label} className="rounded-lg border p-2">{p.label}</div>)}</div>;
    if (modal === "ask") return <div className="space-y-3"><div className="flex flex-wrap gap-2">{["What should I do next?", "Jobs needing attention", "Invoice follow-up", "Quote follow-up", "Crew workload"].map((chip) => <button key={chip} onClick={() => setAskQuery(chip)} className="text-xs rounded-full border px-3 py-1">{chip}</button>)}</div><textarea value={askQuery} onChange={(e) => setAskQuery(e.target.value)} className="w-full rounded-lg border p-2" rows={3} /><button onClick={askAi} disabled={busy.ask} className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm">{busy.ask ? "Generating…" : "Generate"}</button><div className="rounded-lg border p-3 text-sm min-h-16">{askResponse || "Response will appear here."}</div></div>;
    return <div className="text-sm text-slate-600">Action centre ready.</div>;
  };

  if (loading) return <Layout><div className="p-6">Loading Smart Hub Brain…</div></Layout>;

  return <Layout><div className="min-h-screen bg-slate-100 p-3 sm:p-5"><div className="mx-auto max-w-7xl space-y-4">
    <section className="bg-white rounded-2xl border p-4 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700">AI Command Centre</span><h1 className="mt-2 text-2xl font-semibold">Welcome back, {user?.name || "Owner"}</h1><p className="text-sm text-slate-600">{new Date().toLocaleDateString()} • Status: Online</p><p className="text-sm text-slate-700 mt-1">Today: {stats.jobsToday} jobs, {stats.unassigned} unassigned, {stats.openInvoices} invoices open, {stats.crewActive} crew active.</p></div><div className="flex flex-wrap gap-2">{[["New job", "job"], ["New quote", "quote"], ["New invoice", "invoice"], ["Add client", "client"], ["Dispatch board", "dispatch"]].map(([label, key]) => <button key={key} onClick={() => setModal(key)} className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm">{label}</button>)}<button onClick={runDailyCheck} className="rounded-lg border px-3 py-2 text-sm" disabled={busy.run}>{busy.run ? "Checking…" : "Run AI check"}</button></div></div></section>

    {canSeeOwnerControls ? <section className="bg-white rounded-2xl border p-4 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-semibold flex items-center gap-2"><Bot className="h-4 w-4" />AI Operator</h2><p className="text-sm text-slate-600">Status: {busy.run ? "Checking" : (data.approvals.length ? "Needs approval" : "Ready")} • Pending approvals: {data.approvals.length}</p><p className="text-xs text-slate-500">Checked: jobs, quotes, invoices, crew, clients</p></div><div className="flex flex-wrap gap-2"><button onClick={runDailyCheck} className="rounded-lg bg-blue-600 text-white px-3 py-2 text-xs">Run daily check</button><button onClick={prepareToday} disabled={busy.prepare} className="rounded-lg border px-3 py-2 text-xs">{busy.prepare ? "Preparing…" : "Prepare today’s actions"}</button><button onClick={() => setModal("approvals")} className="rounded-lg border px-3 py-2 text-xs">Review approvals</button><button onClick={() => setModal("ask")} className="rounded-lg border px-3 py-2 text-xs">Ask AI</button></div></div><div className="mt-3 space-y-2">{data.approvals.length ? data.approvals.slice(0, 4).map((a, i) => <div key={a.id || i} className="rounded-lg border p-3"><p className="text-sm font-semibold">{a.action_type || "action"}: {a.title || "Approval needed"}</p><p className="text-xs text-slate-600">{a.reason || "Prepared by AI"}</p><p className="text-xs text-slate-500">Risk: {a.risk_level || "medium"} • Related: {a.related_record || a.record_id || "-"}</p><p className="text-xs text-slate-500">AI recommendation: {a.recommendation || "Review and approve."}</p><div className="mt-2 flex gap-2"><button className="rounded bg-blue-600 text-white px-2 py-1 text-xs">Approve</button><button className="rounded border px-2 py-1 text-xs" onClick={() => setModal("edit_approval")}>Edit</button><button className="rounded border px-2 py-1 text-xs">Dismiss</button><button className="rounded border px-2 py-1 text-xs">Open record</button></div></div>) : <p className="text-sm text-slate-600">No approvals pending. Run daily check to prepare actions.</p>}</div></section> : null}

    <section className="bg-white rounded-2xl border p-4 shadow-sm"><h3 className="font-semibold">Today’s AI Plan</h3><div className="mt-2 space-y-2">{aiPlan.length ? aiPlan.map((item) => <div key={item.label} className="rounded-lg border p-3 flex justify-between"><div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-slate-600">{item.reason}</p></div><button className="rounded bg-blue-600 text-white px-2 py-1 text-xs" onClick={() => setModal(item.action)}>Action</button></div>) : <p className="text-sm text-slate-600">No priority actions right now.</p>}</div></section>

    <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">{[["Jobs today", stats.jobsToday, "Focus run sheet", () => document.getElementById("run-sheet")?.scrollIntoView({ behavior: "smooth" }), CalendarClock], ["Unassigned jobs", stats.unassigned, "Assign worker", () => setModal("assign_worker"), ClipboardList], ["Active jobs", stats.activeJobs, "Open jobs", () => navigate("/jobs"), Briefcase], ["Quotes waiting", stats.quotesWaiting, "Quote follow-up", () => setModal("quote_followup"), FileText], ["Open invoices", stats.openInvoices, "Invoice follow-up", () => setModal("invoice_reminder"), Receipt], ["Ready to invoice", stats.readyToInvoice, "Create drafts", () => setModal("invoice_draft"), PlusCircle], ["Overdue invoices", stats.overdueInvoices, "Send reminders", () => setModal("invoice_reminder"), AlertTriangle], ["Crew active", stats.crewActive, "Focus crew panel", () => document.getElementById("crew-panel")?.scrollIntoView({ behavior: "smooth" }), Users]].map(([label, count, hint, action, Icon]) => <button key={label} onClick={action} className="bg-white rounded-xl border p-3 shadow-sm text-left"><div className="flex justify-between items-center"><p className="text-xl font-semibold">{count}</p><Icon className="h-4 w-4 text-blue-600" /></div><p className="text-sm font-medium">{label}</p><p className="text-xs text-slate-500">{hint}</p></button>)}</section>

    <section className="bg-white rounded-2xl border p-4 shadow-sm"><div className="flex justify-between"><h3 className="font-semibold">Priority Queue</h3>{priority.length >= 6 ? <button className="text-sm text-blue-700">View all actions</button> : null}</div><div className="mt-2 space-y-2">{priority.length ? priority.map((item, i) => <div key={`${item.title}-${i}`} className="rounded-lg border p-3 flex justify-between gap-2"><div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-slate-600">{item.reason}</p></div><div className="flex items-center gap-2"><span className="text-[10px] rounded-full bg-slate-100 px-2 py-1">{item.chip}</span><button className="rounded bg-blue-600 text-white px-2 py-1 text-xs" onClick={() => setModal(item.action)}>Action</button></div></div>) : <p className="text-sm text-slate-600">No urgent items right now.</p>}</div></section>

  </div></div><SmartModal open={Boolean(modal)} title="Command Action" onClose={() => setModal(null)}>{renderModalBody()}</SmartModal></Layout>;
}
