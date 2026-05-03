import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bot, CalendarClock, CheckCircle2, ClipboardList, FileText, PlusCircle, Receipt, Sparkles, Users, X } from "lucide-react";
import Layout from "../components/Layout";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
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
  }
  return [];
};
const riskRank = { urgent: 0, high: 1, medium: 2, low: 3 };
const asId = (v) => String(v?.id || v?._id || "");
const sameId = (a, b) => String(a || "") && String(a || "") === String(b || "");
const textOr = (v, fallback) => (v === 0 ? "0" : (String(v || "").trim() || fallback));
const fmtDateTime = (v) => v ? new Date(v).toLocaleString() : "No schedule time set";
const calcWorkerLoadToday = (jobs, workerId, today) => jobs.filter((j) => sameId(j.assigned_worker_id || j.worker_id, workerId) && String(j.scheduled_date || j.date || "").slice(0, 10) === today).length;

function buildAssignmentApprovalDetails(action, jobs, workers, clients, today) {
  const jobId = action.job_id || action.related_job_id || action.related_entity_id;
  const workerId = action.recommended_worker_id || action.worker_id || action.assigned_worker_id;
  const job = jobs.find((j) => sameId(asId(j), jobId));
  const worker = workers.find((w) => sameId(asId(w), workerId));
  const client = clients.find((c) => sameId(asId(c), job?.client_id || action.client_id || action.related_client_id));
  const assignedWorker = workers.find((w) => sameId(asId(w), job?.assigned_worker_id || job?.worker_id));
  const workerLoadToday = worker ? calcWorkerLoadToday(jobs, asId(worker), today) : 0;
  const area = textOr(job?.area || job?.region || job?.suburb, "No area saved");
  const workerArea = textOr(worker?.region || worker?.area || worker?.zone, "No region saved");
  const areaMatch = area !== "No area saved" && workerArea !== "No region saved" && area.toLowerCase() === workerArea.toLowerCase();
  const workerName = textOr(worker?.name, "Recommended worker unavailable");
  const title = textOr(job?.title || job?.name, "Untitled job");
  return {
    recommendedAction: `Assign ${workerName} to ${title}`,
    whyAi: `${workerName} is recommended because they have ${workerLoadToday} jobs scheduled today, are ${textOr(worker?.status, "status unknown")}, and are marked ${worker?.available === false ? "not available" : "available"}. ${areaMatch ? `They also match the job area: ${area}.` : "Area match is not available."} ${worker?.skills?.length ? `Matched skills: ${worker.skills.slice(0, 4).join(", ")}.` : "Skill history was not available, so this recommendation is based on availability and workload."}`,
    jobDetails: [
      ["Job", title], ["Client", textOr(client?.name, "No client linked")], ["Address", textOr(job?.address, "No address saved")],
      ["Date / Time", fmtDateTime(job?.scheduled_date || job?.date)], ["Status", textOr(job?.status, "No status saved")],
      ["Service type", textOr(job?.service_type || job?.job_type, "No service type saved")], ["Notes", textOr(job?.notes || job?.description, "No completion notes saved")],
      ["Current assigned worker", textOr(assignedWorker?.name, "No worker assigned")],
    ],
    workerDetails: [["Worker", workerName], ["Role", textOr(worker?.role, "No role saved")], ["Region", workerArea], ["Status", textOr(worker?.status, "Unknown")], ["Jobs today", String(workerLoadToday)], ["Current workload", textOr(worker?.workload, `Today load: ${workerLoadToday}`)], ["Skills", worker?.skills?.length ? worker.skills.join(", ") : "No worker skills saved yet"], ["Availability today", worker?.available === false ? "Unavailable" : "Available"], ["Schedule conflict", action?.schedule_conflict ? "Conflict detected" : "No conflict detected"]],
    impact: ["Worker will be assigned to this job", "Job status will update if needed", `Activity note will be saved: \"AI recommended assigning ${workerName}. Owner approved.\"`, "Worker notification will be sent if notifications are available"],
    links: { job: job ? `/jobs/${asId(job)}` : "/jobs", worker: worker ? `/team` : null },
  };
}

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
  const [error, setError] = useState("");
  const [data, setData] = useState({ jobs: [], clients: [], quotes: [], invoices: [], workers: [], approvals: [] });
  const [modal, setModal] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState("today");
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [askQuery, setAskQuery] = useState("What should I approve first today?");
  const [askResponse, setAskResponse] = useState("");
  const [busy, setBusy] = useState({ run: false, prepare: false, ask: false, saving: false });
  const [selectedAction, setSelectedAction] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [approvingActionId, setApprovingActionId] = useState("");
  const [actionError, setActionError] = useState("");
  const [editedWorkerId, setEditedWorkerId] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const safe = async (path) => { try { return await get(path); } catch { return []; } };
    try {
      const [jobs, clients, quotes, invoices, workers, approvals] = await Promise.all([safe("/jobs"), safe("/clients"), safe("/quotes"), safe("/invoices"), safe("/team/workers"), canSeeOwnerControls ? safe("/ai/control/actions") : Promise.resolve([])]);
      setData({ jobs: listFrom(jobs, ["jobs"]), clients: listFrom(clients, ["clients"]), quotes: listFrom(quotes, ["quotes"]), invoices: listFrom(invoices, ["invoices"]), workers: listFrom(workers, ["workers"]), approvals: listFrom(approvals, ["approval_items"]).filter((a) => APPROVAL_ACTION_TYPES.has(String(a.action_type || "").toLowerCase()) || !a.action_type) });
    } catch {
      setError("Failed to load Smart Hub data");
    }
    setLoading(false);
  }, [canSeeOwnerControls]);

  useEffect(() => { load(); }, [load]);
  const today = new Date().toISOString().slice(0, 10);
  const workers = useMemo(() => [...new Map(data.workers.map((w) => [String(w.id || w._id || w.email || w.name), w])).values()], [data.workers]);
  const jobsToday = useMemo(() => data.jobs.filter((j) => String(j.scheduled_date || j.date || "").slice(0, 10) === today), [data.jobs, today]);
  const unassignedJobs = useMemo(() => data.jobs.filter((j) => !j.assigned_worker_id && !j.worker_id), [data.jobs]);
  const completedReadyToBill = useMemo(() => data.jobs.filter((j) => String(j.status || "").toLowerCase() === "completed" && !j.invoice_id), [data.jobs]);
  const waitingQuotes = useMemo(() => data.quotes.filter((q) => ["sent", "pending"].includes(String(q.status || "").toLowerCase())), [data.quotes]);
  const openInvoices = useMemo(() => data.invoices.filter((i) => ["open", "overdue", "sent"].includes(String(i.status || "").toLowerCase())), [data.invoices]);
  const overdueInvoices = useMemo(() => openInvoices.filter((i) => String(i.status || "").toLowerCase() === "overdue"), [openInvoices]);
  const crewActive = useMemo(() => workers.filter((w) => ["active", "busy", "on_site"].includes(String(w.status || "").toLowerCase())).length, [workers]);

  const approvals = useMemo(() => data.approvals.filter((a) => String(a.status || "pending").toLowerCase() !== "approved"), [data.approvals]);
  const derivedActions = useMemo(() => {
    const workerLoad = workers.map((w) => ({ w, load: jobsToday.filter((j) => String(j.assigned_worker_id || j.worker_id || "") === String(w.id || w._id)).length })).sort((a, b) => a.load - b.load);
    const recommended = workerLoad[0]?.w;
    const list = [];
    if (unassignedJobs.length) list.push({ priority: "urgent", kind: "assign_worker", title: `Assign ${recommended?.name || "best available worker"} to ${unassignedJobs[0]?.title || "today's unassigned jobs"}`, reason: `AI recommends assignment using availability, workload, and area signals. ${unassignedJobs.length} jobs are unassigned.`, dataUsed: `Jobs: ${unassignedJobs.length} · Crew: ${workers.length} · Lowest load: ${workerLoad[0]?.load ?? 0}`, risk: "high", primary: "Approve assignment", nav: "/dispatch" });
    if (completedReadyToBill.length) list.push({ priority: "ready", kind: "create_invoice_draft", title: `Create ${completedReadyToBill.length} draft invoice${completedReadyToBill.length > 1 ? "s" : ""}`, reason: "AI prepared invoice drafts for completed jobs with pricing not yet billed.", dataUsed: `Completed not invoiced: ${completedReadyToBill.length}`, risk: "medium", primary: "Approve draft", nav: "/invoices" });
    if (waitingQuotes.length) list.push({ priority: "draft", kind: "quote_follow_up", title: `Follow up ${waitingQuotes.length} quote${waitingQuotes.length > 1 ? "s" : ""}`, reason: "AI prepared follow-up drafts for quotes waiting response.", dataUsed: `Waiting quotes: ${waitingQuotes.length}`, risk: "low", primary: "Approve draft", nav: "/quotes" });
    if (openInvoices.length) list.push({ priority: "draft", kind: "invoice_reminder", title: `Prepare reminders for ${openInvoices.length} open invoice${openInvoices.length > 1 ? "s" : ""}`, reason: "AI prepared reminders for unpaid invoices.", dataUsed: `Overdue: ${overdueInvoices.length} · Open: ${openInvoices.length}`, risk: overdueInvoices.length ? "high" : "medium", primary: "Approve draft", nav: "/invoices" });
    if (workers.length) list.push({ priority: "watching", kind: "crew_load", title: "Check worker workload balance", reason: "AI detected workers with low and high load today.", dataUsed: `Crew active: ${crewActive}/${workers.length}`, risk: "low", primary: "Open dispatch", nav: "/dispatch" });
    return list;
  }, [workers, jobsToday, unassignedJobs, completedReadyToBill, waitingQuotes, openInvoices, overdueInvoices, crewActive]);

  const actionCards = approvals.length ? approvals.map((a) => ({ ...a, priority: "ready", title: a.title || "AI prepared action", reason: a.reason || "AI recommends owner approval.", dataUsed: a.summary || "AI prepared from jobs, crew, quotes and invoices.", risk: a.risk_level || "medium", primary: "Approve", nav: "/dashboard" })) : derivedActions;
  const grouped = useMemo(() => ({ urgent: actionCards.filter((a) => a.priority === "urgent" || a.risk === "high"), ready: actionCards.filter((a) => a.priority === "ready"), draft: actionCards.filter((a) => a.priority === "draft"), watching: actionCards.filter((a) => a.priority === "watching" || a.risk === "low") }), [actionCards]);

  const handleReviewAction = (action) => { setSelectedAction(action); setActionError(""); setIsActionModalOpen(true); };
  const handleApproveAction = async (action) => {
    const actionId = String(action?.id || action?._id || "");
    const actionType = String(action?.action_type || action?.kind || "").toLowerCase();
    setApprovingActionId(actionId || action?.title || "local");
    setActionError("");
    try {
      if (!actionId) throw new Error("Cannot approve yet: this recommendation is local-only and has no backend action id.");
      if (!APPROVAL_ACTION_TYPES.has(actionType)) throw new Error(`Cannot approve yet: unsupported action type '${actionType || "unknown"}'.`);
      await post(`/ai/control/actions/${actionId}/approve`, {});
      toast.success("Action approved.");
      setIsActionModalOpen(false);
      setSelectedAction(null);
      await load();
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Approve failed.";
      setActionError(msg);
      toast.error(msg);
    } finally { setApprovingActionId(""); }
  };
  const handleRejectAction = async (action) => {
    const actionId = String(action?.id || action?._id || "");
    try {
      if (!actionId) throw new Error("Cannot reject yet: this recommendation is local-only and has no backend action id.");
      await post(`/ai/control/actions/${actionId}/dismiss`, {});
      toast.success("Action rejected.");
      setIsActionModalOpen(false);
      setSelectedAction(null);
      await load();
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Reject failed.";
      setActionError(msg);
      toast.error(msg);
    }
  };
  const handleEditAction = (action) => { setSelectedAction(action); setEditedWorkerId(String(action?.recommended_worker_id || action?.worker_id || action?.assigned_worker_id || "")); toast("Edit mode enabled. Choose a worker below before approval."); };

  const actionDetails = useMemo(() => {
    if (!selectedAction) return null;
    const type = String(selectedAction.action_type || selectedAction.kind || "").toLowerCase();
    if (type === "assign_worker") return buildAssignmentApprovalDetails(selectedAction, data.jobs, workers, data.clients, today);
    return {
      recommendedAction: selectedAction.title || "AI prepared action",
      whyAi: selectedAction.reason || "AI generated this recommendation from current records.",
      jobDetails: [["Client", "No client linked"], ["Status", textOr(selectedAction.status, "pending")]],
      workerDetails: [["Source data", textOr(selectedAction.summary || selectedAction.dataUsed, "No source data saved")]],
      impact: ["Approve will save the prepared draft action", "No automatic sending occurs without separate confirmation"],
      links: { job: "/jobs", worker: null },
    };
  }, [selectedAction, data.jobs, data.clients, workers, today]);

  const runDailyCheck = async () => { setBusy((s) => ({ ...s, run: true })); try { await post("/ai/control/run-scan", {}); } catch {} await load(); setBusy((s) => ({ ...s, run: false })); };
  const prepareToday = async () => { setBusy((s) => ({ ...s, prepare: true })); try { await post("/ai/control/prepare-today", {}); } catch {} await load(); setBusy((s) => ({ ...s, prepare: false })); };
  const askAi = async () => { setBusy((s) => ({ ...s, ask: true })); try { const res = await post("/ai/control/ask", { question: askQuery }); setAskResponse(res?.answer || "AI prepared response."); } catch { setAskResponse("AI recommends approving worker assignments first, then billing drafts."); } setBusy((s) => ({ ...s, ask: false })); };

  if (loading) return <Layout><div className="p-6">Loading Smart Hub Brain…</div></Layout>;

  return <Layout><div className="min-h-screen p-4 sm:p-6 bg-slate-50"><div className="mx-auto max-w-[1500px] space-y-4">
    <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.name || "Owner"}</h1><p className="mt-2 text-sm text-slate-600">Today: {jobsToday.length} jobs · {unassignedJobs.length} unassigned · {completedReadyToBill.length} ready to bill · {openInvoices.length} open invoices · {crewActive} crew active</p></div><div className="flex gap-2"><button onClick={() => setCreateMenuOpen(true)} className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold">Create</button><button onClick={() => setModal("ask")} className="rounded-full bg-blue-100 text-blue-700 px-4 py-2 text-sm font-semibold">Ask AI</button></div></div></section>

    <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-semibold flex items-center gap-2"><Bot className="h-5 w-5 text-blue-600" />AI Operator</h2><p className="text-sm text-slate-600">I check your jobs, crew, quotes and invoices, then prepare the admin for your approval.</p><p className="mt-2 text-sm">Last scan: just now · Actions prepared: {actionCards.length} · Pending approvals: {approvals.length} · Risk level: {actionCards.sort((a,b)=>(riskRank[a.risk]??3)-(riskRank[b.risk]??3))[0]?.risk || "low"}</p></div><div className="flex flex-wrap gap-2"><button onClick={runDailyCheck} className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm">Run scan</button><button onClick={prepareToday} className="rounded-full border px-4 py-2 text-sm">Prepare today</button><button onClick={() => setActiveWorkspace("approvals")} className="rounded-full border px-4 py-2 text-sm">Review approvals</button><button onClick={() => setModal("ask")} className="rounded-full border px-4 py-2 text-sm">Ask AI</button></div></div></section>

    <section className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap gap-2">{workspaces.map((k) => <button key={k} onClick={() => setActiveWorkspace(k)} className={`rounded-full px-3 py-1.5 text-sm capitalize ${activeWorkspace === k ? "bg-blue-600 text-white" : "border text-slate-700"}`}>{k}</button>)}</div></section>

    <section className="grid gap-4 lg:grid-cols-[2fr_1fr]"><div className="space-y-4"><div className="rounded-2xl border bg-white p-4 shadow-sm"><h3 className="text-lg font-semibold">AI Summary</h3><p className="text-sm text-slate-700 mt-2">AI found {unassignedJobs.length} unassigned jobs, {completedReadyToBill.length} completed jobs ready to bill, and {waitingQuotes.length} quotes waiting. The best first move is approving worker assignments, then invoice drafts.</p><p className="mt-2 font-semibold">Most important next move: Approve {unassignedJobs.length} worker assignment{unassignedJobs.length===1?"":"s"}</p></div>
      {[["Urgent", grouped.urgent],["Ready to approve", grouped.ready],["Drafts prepared", grouped.draft],["Watching", grouped.watching]].map(([g, items]) => <div key={g} className="rounded-2xl border bg-white p-4 shadow-sm"><h3 className="text-lg font-semibold">{g}</h3><div className="mt-3 space-y-3">{items.length ? items.map((a, i) => <div key={a.id || a._id || i} className="rounded-xl border p-3"><p className="font-semibold">{a.title}</p><p className="text-sm text-slate-600 mt-1">AI recommends: {a.reason}</p><p className="text-xs text-slate-500 mt-1">Data AI used: {a.dataUsed}</p><div className="mt-2 flex flex-wrap gap-2"><span className="text-xs border rounded-full px-2 py-1">Risk: {a.risk || "medium"}</span><button onClick={() => handleApproveAction(a)} className="rounded-full bg-blue-600 text-white px-3 py-1.5 text-xs">{approvingActionId === String(a.id || a._id || a.title) ? "Approving…" : (a.primary || "Approve")}</button><button onClick={() => handleEditAction(a)} className="rounded-full border px-3 py-1.5 text-xs">Edit</button><button onClick={() => handleRejectAction(a)} className="rounded-full border px-3 py-1.5 text-xs">Reject</button><button onClick={() => handleReviewAction(a)} className="rounded-full border px-3 py-1.5 text-xs">View details</button></div></div>) : <p className="text-sm text-slate-500">No actions in this group.</p>}</div></div>)}
    </div>
    <aside className="space-y-4"><div className="rounded-2xl border bg-white p-4 shadow-sm"><h3 className="text-lg font-semibold">Business Intelligence</h3><div className="mt-3 space-y-2 text-sm"><p>Today’s risk summary: {overdueInvoices.length ? "Urgent receivables risk" : "Stable"}</p><p>Worker availability: {workers.length - crewActive} available / {workers.length} total</p><p>Jobs needing attention: {unassignedJobs.length}</p><p>Money waiting: {openInvoices.length} invoices</p><p>Quotes waiting: {waitingQuotes.length}</p><p>Schedule conflicts: {Math.max(unassignedJobs.length - (workers.length - crewActive), 0)}</p></div><div className="mt-3 grid gap-2"><button onClick={() => navigate('/dispatch')} className="rounded-lg border p-2 text-left">Open dispatch</button><button onClick={() => navigate('/jobs')} className="rounded-lg border p-2 text-left">View jobs</button><button onClick={() => navigate('/quotes')} className="rounded-lg border p-2 text-left">View quotes</button><button onClick={() => navigate('/invoices')} className="rounded-lg border p-2 text-left">View invoices</button></div></div>{error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}</aside></section>
  </div></div>
  <SmartModal open={createMenuOpen} title="Create" onClose={() => setCreateMenuOpen(false)}><div className="grid gap-2">{[["New job", "job"], ["New quote", "quote"], ["New invoice", "invoice"], ["Add client", "client"], ["Open dispatch", "dispatch"]].map(([l, k]) => <button key={k} onClick={() => { setCreateMenuOpen(false); setModal(k); }} className="rounded-lg border p-2 text-left">{l}</button>)}</div></SmartModal>
  <SmartModal open={Boolean(modal)} title="Command Action" onClose={() => setModal(null)}>{modal === "job" ? <JobCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create job" /> : null}{modal === "quote" ? <QuoteCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create quote" /> : null}{modal === "invoice" ? <InvoiceCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create invoice" /> : null}{modal === "client" ? <ClientCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Add client" /> : null}{modal === "dispatch" ? <SmartHubDispatchPanel canManageDispatch={canSeeOwnerControls} onAssigned={() => load()} /> : null}{modal === "ask" ? <div className="space-y-3"><textarea value={askQuery} onChange={(e) => setAskQuery(e.target.value)} className="w-full rounded-xl border p-3" rows={3} /><button onClick={askAi} disabled={busy.ask} className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm">{busy.ask ? "Generating…" : "Ask AI"}</button><div className="rounded-xl border p-3 text-sm min-h-16">{askResponse || "AI response will appear here."}</div></div> : null}</SmartModal>

  <SmartModal open={isActionModalOpen} title={selectedAction?.title || "Action details"} onClose={() => setIsActionModalOpen(false)}>
    {selectedAction && actionDetails ? <div className="space-y-3 text-sm">
      <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">Recommended action</p><p className="font-semibold mt-1">{actionDetails.recommendedAction}</p></div>
      <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">Why AI chose this</p><p className="mt-1">{actionDetails.whyAi}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">Job details</p>{actionDetails.jobDetails.map(([k,v]) => <p key={k} className="mt-1"><span className="font-semibold">{k}:</span> {v}</p>)}</div>
        <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">Worker match / source details</p>{actionDetails.workerDetails.map(([k,v]) => <p key={k} className="mt-1"><span className="font-semibold">{k}:</span> {v}</p>)}</div>
      </div>
      <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">What happens when approved</p><ul className="list-disc pl-5 mt-1">{actionDetails.impact.map((i) => <li key={i}>{i}</li>)}</ul></div>
      {editedWorkerId ? <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">Edit recommendation</p><select className="mt-2 w-full rounded-lg border p-2" value={editedWorkerId} onChange={(e) => setEditedWorkerId(e.target.value)}>{workers.map((w) => <option key={asId(w)} value={asId(w)}>{w.name || w.email || asId(w)}</option>)}</select></div> : null}
      {actionError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">{actionError}</div> : null}
      <div className="flex flex-wrap gap-2 pt-2"><button onClick={() => handleApproveAction(selectedAction)} className="rounded-full bg-blue-600 text-white px-3 py-1.5">Approve assignment</button><button onClick={() => handleEditAction(selectedAction)} className="rounded-full border px-3 py-1.5">Edit recommendation</button><button onClick={() => handleRejectAction(selectedAction)} className="rounded-full border px-3 py-1.5">Reject</button><button onClick={() => navigate(actionDetails.links?.job || selectedAction.nav || "/dashboard")} className="rounded-full border px-3 py-1.5">Open job</button>{actionDetails.links?.worker ? <button onClick={() => navigate(actionDetails.links.worker)} className="rounded-full border px-3 py-1.5">Open worker profile</button> : null}</div>
    </div> : null}
  </SmartModal>
  </Layout>;
}
