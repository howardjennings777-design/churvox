import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Briefcase, Calendar, FileText, Receipt, Users, X } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { safeArray, safeText } from "../utils/safeRender";

const OWNER_ROLES = ["owner", "manager", "office_admin"];
const today = () => new Date().toISOString().slice(0, 10);

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
    <div className="w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl">
      <div className="flex items-center justify-between p-3 border-b"><h3 className="font-semibold">{title}</h3><button onClick={onClose}><X className="h-4 w-4"/></button></div>
      <div className="p-4">{children}</div>
    </div>
  </div>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, normalizedRole } = useAuth();
  const { get, post } = useApi();
  const isOwnerHub = OWNER_ROLES.includes(normalizedRole);
  const [state, setState] = useState({ loading: true, error: "", jobs: [], quotes: [], invoices: [], workers: [], approvals: [] });
  const [activeModal, setActiveModal] = useState("");
  const [askInput, setAskInput] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [prepared, setPrepared] = useState([]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const [jobs, quotes, invoices, workers, approvals] = await Promise.all([
        get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers"), isOwnerHub ? get("/ai/operator/approvals") : Promise.resolve({ data: [] }),
      ]);
      setState({ loading: false, error: "", jobs: safeArray(jobs?.data), quotes: safeArray(quotes?.data), invoices: safeArray(invoices?.data), workers: safeArray(workers?.data), approvals: safeArray(approvals?.data) });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: safeText(e, "Failed to load command centre") }));
    }
  }, [get, isOwnerHub]);
  useEffect(() => { load(); }, [load]);

  const d = useMemo(() => {
    const todayJobs = state.jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === today());
    const unassigned = state.jobs.filter((j) => !j.assigned_worker_id);
    const activeJobs = state.jobs.filter((j) => ["assigned", "acknowledged", "in_progress", "paused"].includes(String(j.status || "")));
    const ready = state.jobs.filter((j) => String(j.status || "") === "completed");
    const quotesWaiting = state.quotes.filter((q) => ["sent", "draft"].includes(String(q.status || "")));
    const openInvoices = state.invoices.filter((i) => ["draft", "sent", "overdue"].includes(String(i.status || "")));
    const overdue = state.invoices.filter((i) => String(i.status || "") === "overdue");
    const crew = new Set(activeJobs.map((j) => j.assigned_worker_id).filter(Boolean)).size;
    const workerMap = new Map();
    state.workers.forEach((w) => { const k = String(w.email || w.phone || w.name || w.id || "").toLowerCase(); if (!workerMap.has(k) && w.active !== false) workerMap.set(k, w); });
    const queue = [
      ...unassigned.map((j) => ({ id: `u${j.id || j._id}`, title: safeText(j.title, "Untitled job"), reason: "Needs assignment", action: "Assign", modal: "assign" })),
      ...quotesWaiting.map((q) => ({ id: `q${q.id || q._id}`, title: safeText(q.title || q.reference, "Quote"), reason: "Quote follow-up", action: "Review", modal: "quoteFollowup" })),
      ...overdue.map((i) => ({ id: `i${i.id || i._id}`, title: safeText(i.invoice_number || i.title, "Invoice"), reason: "Invoice reminder", action: "Remind", modal: "invoiceReminder" })),
      ...ready.map((j) => ({ id: `r${j.id || j._id}`, title: safeText(j.title, "Completed job"), reason: "Ready to invoice", action: "Convert", modal: "convert" })),
    ];
    return { todayJobs, unassigned, activeJobs, ready, quotesWaiting, openInvoices, overdue, crew, queue, workers: Array.from(workerMap.values()) };
  }, [state]);

  const metrics = [
    ["Jobs today", d.todayJobs.length, Calendar, "Open", () => document.getElementById("today-run-sheet")?.scrollIntoView({ behavior: "smooth" })],
    ["Unassigned jobs", d.unassigned.length, Briefcase, "Assign", () => setActiveModal("assign")],
    ["Active jobs", d.activeJobs.length, Briefcase, "Open", () => navigate("/jobs")],
    ["Quotes waiting", d.quotesWaiting.length, FileText, "Review", () => setActiveModal("quoteFollowup")],
    ["Open invoices", d.openInvoices.length, Receipt, "Review", () => setActiveModal("invoiceList")],
    ["Ready to invoice", d.ready.length, Receipt, "Convert", () => setActiveModal("convert")],
    ["Overdue invoices", d.overdue.length, AlertTriangle, "Remind", () => setActiveModal("invoiceReminder")],
    ["Crew on site", d.crew, Users, "Open", () => document.getElementById("crew-dispatch")?.scrollIntoView({ behavior: "smooth" })],
  ];

  const runDailyCheck = async () => { try { await post("/ai/operator/run-daily-check", {}); toast.success("Daily check complete"); load(); } catch (e) { toast.error(safeText(e, "Daily check failed")); } };
  const prepareToday = async () => { try { const r = await post("/ai/operator/prepare-today", {}); setPrepared(safeArray(r?.data?.actions || r?.data)); setActiveModal("prepare"); toast.success("Prepared today's actions"); } catch (e) { toast.error(safeText(e, "Unable to prepare actions")); } };
  const askAi = async () => { try { const r = await post("/ai/operator/ask", { prompt: askInput }); setAskAnswer(safeText(r?.data?.answer || r?.data || "No response")); } catch (e) { toast.error(safeText(e, "AI request failed")); } };

  if (state.loading) return <Layout><div className="min-h-screen bg-slate-100 p-4">Loading command centre…</div></Layout>;
  if (state.error) return <Layout><div className="min-h-screen bg-slate-100 p-4"><div className="bg-white rounded-xl p-4 border">{state.error}</div></div></Layout>;

  return <Layout><div className="min-h-screen bg-slate-100 p-3 md:p-5 space-y-4">
    <section className="bg-white rounded-2xl border shadow-sm p-4 space-y-2"><span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Command Centre</span><h1 className="text-2xl font-bold">Welcome back, {safeText(user?.name?.split(" ")?.[0], "there")}</h1><p className="text-sm text-slate-600">Live operations: {d.todayJobs.length} jobs today, {d.unassigned.length} unassigned, {d.openInvoices.length} invoices open, {d.crew} crew active.</p>{isOwnerHub && <div className="flex flex-wrap gap-2"><button className="px-3 py-2 rounded-xl bg-blue-600 text-white" onClick={() => setActiveModal("newJob")}>New job</button><button className="px-3 py-2 rounded-xl bg-blue-600 text-white" onClick={() => setActiveModal("newQuote")}>New quote</button><button className="px-3 py-2 rounded-xl bg-blue-600 text-white" onClick={() => setActiveModal("newInvoice")}>New invoice</button><button className="px-3 py-2 rounded-xl bg-blue-600 text-white" onClick={() => setActiveModal("addClient")}>Add client</button><button className="px-3 py-2 rounded-xl bg-slate-200" onClick={() => setActiveModal("dispatch")}>Dispatch board</button></div>}</section>

    {isOwnerHub && <section className="bg-white rounded-2xl border shadow-sm p-4 space-y-2"><h2 className="font-semibold">AI Operator</h2><p className="text-sm text-slate-600">I check jobs, quotes, invoices, crew, and follow-ups. Review what should happen next.</p><div className="flex gap-2 flex-wrap"><button className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm" onClick={runDailyCheck}>Run daily check</button><button className="px-3 py-2 rounded-lg bg-slate-200 text-sm" onClick={() => document.getElementById("approval-queue")?.scrollIntoView({ behavior: "smooth" })}>Review approvals</button><button className="px-3 py-2 rounded-lg bg-slate-200 text-sm" onClick={prepareToday}>Prepare today’s actions</button><button className="px-3 py-2 rounded-lg bg-slate-200 text-sm" onClick={() => setActiveModal("askAi")}>Ask AI</button></div>{state.approvals.length === 0 ? <p className="text-sm text-slate-600">No approvals pending. Run daily check to prepare actions.</p> : <div id="approval-queue" className="space-y-2">{state.approvals.slice(0, 6).map((a) => <div key={a.id || a._id} className="border rounded-lg p-2"><div className="font-medium text-sm">{safeText(a.title, "Approval")}</div><div className="text-xs text-slate-600">{safeText(a.reason, "Review")}</div><div className="mt-2 flex gap-1 text-xs"><button className="px-2 py-1 rounded bg-green-600 text-white">Approve</button><button className="px-2 py-1 rounded bg-slate-200">Edit</button><button className="px-2 py-1 rounded bg-slate-200">Dismiss</button><button className="px-2 py-1 rounded bg-slate-200">Open record</button></div></div>)}</div>}</section>}

    <section className="grid grid-cols-2 lg:grid-cols-4 gap-2">{metrics.map(([label, count, Icon, hint, onClick]) => <button key={label} onClick={onClick} className="bg-white border rounded-xl p-3 text-left hover:border-blue-300"><div className="flex justify-between"><Icon className="h-4 w-4 text-blue-600"/><span className="text-[11px] text-slate-500">{hint}</span></div><div className="text-xl font-bold">{count}</div><div className="text-xs text-slate-600">{label}</div></button>)}</section>

    <section className="grid grid-cols-1 xl:grid-cols-5 gap-4"><div className="xl:col-span-2 bg-white border rounded-2xl p-4"><h3 className="font-semibold">Priority Queue</h3><div className="mt-2 space-y-2">{d.queue.slice(0, 6).map((q) => <div key={q.id} className="border rounded-lg p-2"><div className="text-sm font-medium">{q.title}</div><div className="text-xs text-slate-600">{q.reason}</div><button className="mt-1 px-2 py-1 rounded bg-blue-600 text-white text-xs" onClick={() => setActiveModal(q.modal)}>{q.action}</button></div>)}{d.queue.length > 6 && <button className="text-sm text-blue-700">View all actions</button>}</div></div><div className="xl:col-span-3 space-y-4"><div id="today-run-sheet" className="bg-white border rounded-2xl p-4"><h3 className="font-semibold">Today’s Run Sheet</h3>{d.todayJobs.length === 0 ? <div className="text-sm text-slate-600 mt-2">No jobs scheduled today <div className="flex gap-2 mt-2"><button className="px-2 py-1 rounded bg-blue-600 text-white" onClick={() => setActiveModal("newJob")}>New job</button><button className="px-2 py-1 rounded bg-slate-200" onClick={() => setActiveModal("dispatch")}>Open dispatch</button></div></div> : <div className="space-y-2 mt-2">{d.todayJobs.slice(0, 6).map((j) => <div key={j.id || j._id} className="grid grid-cols-12 gap-2 text-xs border rounded p-2"><div className="col-span-2">{safeText(j.scheduled_time, "--:--")}</div><div className="col-span-3">{safeText(j.title, "Untitled")}</div><div className="col-span-3">{safeText(j.customer_name || j.client_name, "No client")}</div><div className="col-span-2">{safeText(j.assigned_worker_name, "Unassigned")}</div><button className="col-span-2 text-blue-700" onClick={() => navigate(`/jobs/${j.id || j._id}`)}>Open</button></div>)}</div>}</div><div id="crew-dispatch" className="bg-white border rounded-2xl p-4"><div className="flex justify-between"><h3 className="font-semibold">Crew + Dispatch</h3><button className="px-2 py-1 rounded bg-slate-200 text-sm" onClick={() => setActiveModal("assign")}>Assign now</button></div><p className="text-sm text-slate-600 mt-1">{d.unassigned.length} unassigned jobs</p><div className="space-y-2 mt-2">{d.workers.slice(0, 6).map((w) => <div key={w.id} className="flex justify-between border rounded p-2"><div><div className="text-sm font-medium">{safeText(w.name, "Worker")}</div><div className="text-xs text-slate-600">{state.jobs.filter((j) => j.assigned_worker_id === w.id && String(j.scheduled_date || "").slice(0, 10) === today()).length} jobs today</div></div><button className="px-2 py-1 rounded bg-slate-200 text-xs" onClick={() => setActiveModal("assign")}>Quick assign</button></div>)}</div></div></div></section>

    <Modal open={!!activeModal} title="Command" onClose={() => setActiveModal("")}>{[
      ["newJob", "/jobs/new", "Open the full New Job form."], ["newQuote", "/quotes/new", "Open quote form."], ["newInvoice", "/invoices/new", "Open invoice form."], ["addClient", "/clients/new", "Open add client form."], ["dispatch", "/dispatch", "Open dispatch board."], ["assign", "/dispatch", "Assign workers from dispatch."], ["quoteFollowup", "/quotes", "Review quote follow-ups."], ["invoiceReminder", "/invoices?status=overdue", "Send reminders for overdue invoices."], ["convert", "/jobs?status=completed", "Convert completed jobs to invoices."], ["invoiceList", "/invoices", "Review open invoices."]].filter(([k]) => k === activeModal).map(([k, url, text]) => <div key={k} className="space-y-3"><p className="text-sm text-slate-700">{text}</p><button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => { setActiveModal(""); navigate(url); }}>{url.includes("?") ? "Open workflow" : "Open page"}</button></div>)}{activeModal === "prepare" && <div><p className="text-sm mb-2">Top recommended actions:</p><ul className="list-disc pl-5 text-sm">{prepared.length ? prepared.slice(0, 5).map((a, i) => <li key={i}>{safeText(a.title || a.action || a, "Action")}</li>) : <li>No actions returned.</li>}</ul></div>}{activeModal === "askAi" && <div className="space-y-2"><input className="w-full border rounded p-2 text-sm" placeholder="Ask AI Operator" value={askInput} onChange={(e) => setAskInput(e.target.value)} /><div className="flex gap-2 flex-wrap">{["What should happen next?", "Who needs follow-up?", "What can I invoice today?"].map((s) => <button key={s} className="px-2 py-1 rounded bg-slate-100 text-xs" onClick={() => setAskInput(s)}>{s}</button>)}</div><button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={askAi}>Ask AI</button>{askAnswer && <div className="text-sm border rounded p-2 bg-slate-50 whitespace-pre-wrap">{askAnswer}</div>}</div>}</Modal>
  </div></Layout>;
}
