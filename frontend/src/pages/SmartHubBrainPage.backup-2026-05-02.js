import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, CalendarClock, ClipboardList, FileText, Receipt, Users, CheckCircle2, AlertTriangle, PlusCircle, X } from "lucide-react";
import Layout from "../components/Layout";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const OWNER_ROLES = ["owner", "admin", "manager", "office_admin", "platform_owner"];

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

const SmartModal = ({ open, title, onClose, children }) => open ? (
  <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
    <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[95vh] overflow-auto">
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between"><h3 className="font-semibold">{title}</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div>
      <div className="p-4">{children}</div>
    </div>
  </div>
) : null;

export default function SmartHubBrainPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canSeeOperator = OWNER_ROLES.includes(role);
  const isPayroll = role === "payroll";
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState("");
  const [aiText, setAiText] = useState("");
  const [busy, setBusy] = useState({ run: false, prepare: false, ask: false });
  const [data, setData] = useState({ jobs: [], clients: [], quotes: [], invoices: [], workers: [], approvals: [] });

  const load = useCallback(async () => {
    setLoading(true);
    const safe = async (path) => { try { return await get(path); } catch { return []; } };
    const [jobs, clients, quotes, invoices, workers, approvals] = await Promise.all([
      safe("/jobs"), safe("/clients"), safe("/quotes"), safe("/invoices"), safe("/team/workers"), canSeeOperator ? safe("/ai/operator/approval-items") : Promise.resolve([]),
    ]);
    setData({
      jobs: listFrom(jobs, ["jobs"]), clients: listFrom(clients, ["clients"]), quotes: listFrom(quotes, ["quotes"]),
      invoices: listFrom(invoices, ["invoices"]), workers: listFrom(workers, ["workers"]), approvals: listFrom(approvals, ["approval_items"]),
    });
    setLoading(false);
  }, [canSeeOperator]);
  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const workers = useMemo(() => {
    const seen = new Map();
    for (const w of data.workers) {
      const k = String(w.email || w.phone || w.name || w.id || w._id || "").toLowerCase();
      if (!k) continue;
      if (!seen.has(k) || (seen.get(k)?.active !== true && w.active === true)) seen.set(k, w);
    }
    return [...seen.values()];
  }, [data.workers]);

  const stats = useMemo(() => ({
    jobsToday: data.jobs.filter(j => String(j.scheduled_date || j.date || "").slice(0,10) === today).length,
    unassigned: data.jobs.filter(j => !j.assigned_worker_id && !j.worker_id).length,
    active: data.jobs.filter(j => ["in_progress", "active", "assigned"].includes(String(j.status||"").toLowerCase())).length,
    quotesWaiting: data.quotes.filter(q => ["sent", "draft", "pending"].includes(String(q.status||"").toLowerCase())).length,
    openInvoices: data.invoices.filter(i => ["draft", "sent", "open", "overdue"].includes(String(i.status||"").toLowerCase())).length,
    readyToInvoice: data.jobs.filter(j => String(j.status||"").toLowerCase() === "completed").length,
    overdue: data.invoices.filter(i => String(i.status||"").toLowerCase() === "overdue").length,
    crewActive: workers.filter(w => ["active", "on_site", "busy"].includes(String(w.status||"").toLowerCase())).length,
  }), [data, today, workers]);

  const plan = [
    stats.unassigned ? { label: `Assign ${stats.unassigned} unassigned jobs`, reason: "Prevent schedule delays.", action: "assign" } : null,
    stats.readyToInvoice ? { label: `Create ${stats.readyToInvoice} draft invoices`, reason: "Completed work should convert to cash flow.", action: "draftInvoice" } : null,
    stats.quotesWaiting ? { label: `Follow up ${stats.quotesWaiting} quotes`, reason: "Lift quote conversion rates.", action: "quoteFollowup" } : null,
    stats.overdue ? { label: `Chase ${stats.overdue} overdue invoices`, reason: "Reduce receivables risk.", action: "invoiceReminder" } : null,
    workers.length ? { label: "Check crew workload", reason: "Balance assignments across active crew.", action: "crew" } : null,
  ].filter(Boolean).slice(0,5);

  const priority = useMemo(() => {
    const items = [];
    data.jobs.filter(j => !j.assigned_worker_id).forEach(j => items.push({title: j.title || "Unassigned job", reason:"Needs worker", chip:"unassigned job", action:"assign"}));
    data.quotes.filter(q => ["sent", "pending"].includes(String(q.status||"").toLowerCase())).forEach(q => items.push({title: q.title || "Quote waiting", reason:"Awaiting follow-up", chip:"quote waiting", action:"quoteFollowup"}));
    data.invoices.filter(i => ["open", "overdue", "sent"].includes(String(i.status||"").toLowerCase())).forEach(i => items.push({title: i.invoice_number || "Invoice follow-up", reason:"Payment pending", chip:String(i.status||"open"), action:"invoiceReminder"}));
    data.jobs.filter(j => String(j.status||"").toLowerCase() === "completed").forEach(j => items.push({title:j.title||"Ready to invoice", reason:"Completed job", chip:"ready", action:"draftInvoice"}));
    data.clients.filter(c => !c.email && !c.phone).forEach(c => items.push({title:c.name || "Client record", reason:"Missing client details", chip:"client cleanup", action:"client"}));
    return items.slice(0,6);
  }, [data]);

  const runCheck = async () => {
    setBusy(s => ({...s, run:true}));
    try { await post("/ai/operator/run-daily-check", {}); } catch {}
    await load();
    setBusy(s => ({...s, run:false}));
  };

  if (loading) return <Layout><div className="p-6">Loading Smart Hub Brain…</div></Layout>;

  return <Layout><div className="min-h-screen bg-slate-100 p-3 sm:p-5"><div className="mx-auto max-w-7xl space-y-4">
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"><div className="flex flex-wrap justify-between gap-3"><div><span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700">Smart Hub</span><h1 className="mt-2 text-2xl font-semibold">Welcome back, {user?.name || "there"}</h1><p className="text-sm text-slate-600">{new Date().toLocaleDateString()} • Status: Online</p><p className="text-sm text-slate-700 mt-1">Today: {stats.jobsToday} jobs, {stats.unassigned} unassigned, {stats.openInvoices} invoices open, {stats.crewActive} crew active.</p></div>
      <div className="flex flex-wrap gap-2">{[["New job","job"],["New quote","quote"],["New invoice","invoice"],["Add client","client"],["Dispatch board","dispatch"]].map(([label,key]) => <button key={key} onClick={()=>setModal(key)} className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm">{label}</button>)}<button onClick={runCheck} className="rounded-lg border px-3 py-2 text-sm" disabled={busy.run}>{busy.run?"Checking…":"Run AI check"}</button></div>
    </div></section>

    {canSeeOperator && !isPayroll && <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold flex items-center gap-2"><Bot className="h-4 w-4"/>AI Operator</h2><p className="text-sm text-slate-600">Status: {busy.run ? "Checking" : (data.approvals.length ? "Needs approval" : "Ready")} • Pending approvals: {data.approvals.length}</p><p className="text-xs text-slate-500">Checked: jobs, quotes, invoices, crew, clients</p></div><div className="flex flex-wrap gap-2"><button className="rounded-lg bg-blue-600 text-white px-3 py-2 text-xs" onClick={runCheck}>Run daily check</button><button className="rounded-lg border px-3 py-2 text-xs" onClick={()=>setModal("prepare")}>Prepare today’s actions</button><button className="rounded-lg border px-3 py-2 text-xs" onClick={()=>setModal("approvals")}>Review approvals</button><button className="rounded-lg border px-3 py-2 text-xs" onClick={()=>setModal("ask")}>Ask AI</button></div></div>
      <div className="mt-3 space-y-2">{data.approvals.length ? data.approvals.slice(0,4).map((a,i)=><div key={a.id||a._id||i} className="rounded-lg border p-3"><p className="font-medium text-sm">{a.title || a.action_type || "Approval action"}</p><p className="text-xs text-slate-600">{a.reason || "Prepared by AI"}</p><p className="text-xs text-slate-500">Risk: {a.risk_level||"medium"} • Related: {a.related_record||a.record_id||"-"}</p><p className="text-xs text-slate-500">Recommendation: {a.recommendation || "Review and approve."}</p><div className="mt-2 flex gap-2"><button className="rounded bg-blue-600 text-white px-2 py-1 text-xs">Approve</button><button className="rounded border px-2 py-1 text-xs" onClick={()=>setModal("editApproval")}>Edit</button><button className="rounded border px-2 py-1 text-xs">Dismiss</button><button className="rounded border px-2 py-1 text-xs">Open record</button></div></div>) : <p className="text-sm text-slate-600">No approvals pending. Run daily check to prepare actions.</p>}</div>
    </section>}

    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"><h3 className="font-semibold">Today’s AI Plan</h3><p className="text-xs text-slate-500 mb-2">Here’s what I’d do first.</p><div className="space-y-2">{plan.length ? plan.map((p,idx)=><div key={idx} className="rounded-lg border p-3 flex items-center justify-between gap-2"><div><p className="text-sm font-medium">{p.label}</p><p className="text-xs text-slate-600">{p.reason}</p></div><button className="rounded bg-blue-600 text-white px-2 py-1 text-xs" onClick={()=>setModal(p.action)}>Action</button></div>) : <p className="text-sm text-slate-600">No priority actions right now.</p>}</div></section>

    <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">{[
      ["Jobs today",stats.jobsToday,"Focus run sheet",()=>document.getElementById("run-sheet")?.scrollIntoView({behavior:"smooth"}),CalendarClock],
      ["Unassigned jobs",stats.unassigned,"Assign worker",()=>setModal("assign"),ClipboardList],
      ["Active jobs",stats.active,"Open jobs",()=>navigate("/jobs"),CheckCircle2],
      ["Quotes waiting",stats.quotesWaiting,"Follow up quotes",()=>setModal("quoteFollowup"),FileText],
      ["Open invoices",stats.openInvoices,"Invoice follow-up",()=>setModal("invoiceReminder"),Receipt],
      ["Ready to invoice",stats.readyToInvoice,"Create draft invoices",()=>setModal("draftInvoice"),PlusCircle],
      ["Overdue invoices",stats.overdue,"Send reminders",()=>setModal("invoiceReminder"),AlertTriangle],
      ["Crew active",stats.crewActive,"Focus crew panel",()=>document.getElementById("crew")?.scrollIntoView({behavior:"smooth"}),Users],
    ].map(([label,count,hint,fn,Icon]) => <button key={label} onClick={fn} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm text-left"><div className="flex items-center justify-between"><p className="text-xl font-semibold">{count}</p><Icon className="h-4 w-4 text-blue-600"/></div><p className="text-sm font-medium">{label}</p><p className="text-xs text-slate-500">{hint}</p></button>)}
    </section>

  </div></div></Layout>;
}
