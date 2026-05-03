import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import Layout from "../components/Layout";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import NotificationsBell from "../components/NotificationsBell";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { toast } from "sonner";
import JobCreateForm from "../components/forms/JobCreateForm";
import QuoteCreateForm from "../components/forms/QuoteCreateForm";
import InvoiceCreateForm from "../components/forms/InvoiceCreateForm";
import ClientCreateForm from "../components/forms/ClientCreateForm";
import SmartHubDispatchPanel from "../components/SmartHubDispatchPanel";

const OWNER_ROLES = ["owner", "admin", "manager", "office_admin", "platform_owner"];
const APPROVAL_ACTION_TYPES = new Set(["assign_worker", "create_invoice_draft", "invoice_reminder", "quote_follow_up", "job_instruction", "customer_update", "client_cleanup", "schedule_conflict"]);
const workspaces = ["today", "dispatch", "jobs", "clients", "quotes", "invoices", "crew", "payroll", "approvals"];
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
const getAnyId = (v) => String(v?.id || v?._id || v?.job_id || v?.worker_id || v?.client_id || v?.user_id || "");
const textOr = (v, fallback) => (v === 0 ? "0" : (String(v || "").trim() || fallback));
const fmtDateTime = (v) => v ? new Date(v).toLocaleString() : "No schedule time set";
const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "AUD" }) : "—";
};
const firstText = (...vals) => vals.map((v) => String(v || "").trim()).find(Boolean) || "";
const normalizeStatus = (v) => String(v || "").toLowerCase().trim();
const calcWorkerLoadToday = (jobs, workerId, today) => jobs.filter((j) => sameId(j.assigned_worker_id || j.worker_id, workerId) && String(j.scheduled_date || j.date || "").slice(0, 10) === today).length;
const findByAnyId = (list, id, keys = ["id", "_id"]) => list.find((item) => keys.some((k) => sameId(item?.[k], id)));

function buildAssignmentApprovalDetails(action, jobs, workers, clients, today) {
  const jobId = action.job_id || action.related_job_id || action.related_entity_id || action?.job?.id || action?.job?._id || action?.job?.job_id;
  const workerId = action.recommended_worker_id || action.worker_id || action.assigned_worker_id || action?.worker?.id || action?.worker?._id || action?.worker?.user_id;
  const job = action?.job || findByAnyId(jobs, jobId, ["id", "_id", "job_id"]);
  const worker = action?.worker || findByAnyId(workers, workerId, ["id", "_id", "user_id"]);
  const clientId = action.client_id || action.related_client_id || job?.client_id || action?.client?.id || action?.client?._id || action?.client?.client_id;
  const client = action?.client || findByAnyId(clients, clientId, ["id", "_id", "client_id"]);
  const assignedWorker = workers.find((w) => sameId(asId(w), job?.assigned_worker_id || job?.worker_id));
  const workerLoadToday = worker ? calcWorkerLoadToday(jobs, asId(worker), today) : 0;
  const area = textOr(job?.area || job?.region || job?.suburb, "No area saved");
  const workerArea = textOr(worker?.region || worker?.area || worker?.zone, "No region saved");
  const areaMatch = area !== "No area saved" && workerArea !== "No region saved" && area.toLowerCase() === workerArea.toLowerCase();
  const workerName = textOr(worker?.name, "Worker unavailable");
  const title = textOr(job?.title || job?.name, "Job details unavailable");
  return {
    recommendedAction: `Assign ${workerName} to ${title}`,
    whyAi: `${workerName} is recommended because they have ${workerLoadToday} jobs scheduled today, are ${textOr(worker?.status, "status unknown")}, and are marked ${worker?.available === false ? "not available" : "available"}. ${areaMatch ? `They also match the job area: ${area}.` : "Area match is not available."} ${worker?.skills?.length ? `Matched skills: ${worker.skills.slice(0, 4).join(", ")}.` : "Skill history was not available, so this recommendation is based on availability and workload."}`,
    jobDetails: [
      ["Job", title], ["Client", textOr(client?.name, "Client unavailable")], ["Address", textOr(job?.address, "No address saved")],
      ["Date / Time", fmtDateTime(job?.scheduled_date || job?.date)], ["Status", textOr(job?.status, "No status saved")],
      ["Service type", textOr(job?.service_type || job?.job_type, "No service type saved")], ["Notes", textOr(job?.notes || job?.description, "No completion notes saved")],
      ["Current assigned worker", textOr(assignedWorker?.name, "No worker assigned")],
    ],
    workerDetails: [["Worker", workerName], ["Role", textOr(worker?.role, "No role saved")], ["Region", workerArea], ["Status", textOr(worker?.status, "Unknown")], ["Jobs today", String(workerLoadToday)], ["Current workload", textOr(worker?.workload, `Today load: ${workerLoadToday}`)], ["Skills", worker?.skills?.length ? worker.skills.join(", ") : "No worker skills saved yet"], ["Availability today", worker?.available === false ? "Unavailable" : "Available"], ["Schedule conflict", action?.schedule_conflict ? "Conflict detected" : "No conflict detected"]],
    impact: ["Worker will be assigned to this job", "Job status will update if needed", `Activity note will be saved: \"AI recommended assigning ${workerName}. Owner approved.\"`, "Worker notification will be sent if notifications are available"],
    links: { job: job ? `/jobs/${asId(job)}` : "/jobs", worker: worker ? `/team` : null },
  };
}

function SmartModal({ open, title, onClose, children, wide = false, actions = null }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] bg-slate-900/55 backdrop-blur-sm p-0 sm:p-4 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true"><div className={`w-full ${wide ? "sm:max-w-7xl" : "sm:max-w-3xl"} bg-white rounded-none sm:rounded-2xl border border-slate-200 shadow-2xl h-[100dvh] sm:h-[94vh] overflow-hidden pointer-events-auto`}><div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900 capitalize">{title}</h3><div className="flex items-center gap-2">{actions}<button onClick={onClose} className="rounded-full border p-1"><X className="h-5 w-5" /></button></div></div><div className="p-4 h-[calc(100dvh-64px)] sm:h-[calc(94vh-64px)] overflow-y-auto">{children}</div></div></div>;
}

export default function SmartHubBrainPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canSeeOwnerControls = OWNER_ROLES.includes(role) && role !== "payroll";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ jobs: [], clients: [], quotes: [], invoices: [], workers: [], approvals: [] });
  const [modal, setModal] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState("today");
  const [activeSmartHubSection, setActiveSmartHubSection] = useState(null);
  const [workspaceDrawer, setWorkspaceDrawer] = useState(null);
  const [selectedSmartHubAction, setSelectedSmartHubAction] = useState(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState("list");
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [workspaceRecord, setWorkspaceRecord] = useState(null);
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [askQuery, setAskQuery] = useState("What should I approve first today?");
  const [askResponse, setAskResponse] = useState("");
  const [busy, setBusy] = useState({ run: false, prepare: false, ask: false, saving: false });
  const [selectedAction, setSelectedAction] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [approvingActionId, setApprovingActionId] = useState("");
  const [actionError, setActionError] = useState("");
  const [editedWorkerId, setEditedWorkerId] = useState("");
  const [localActionState, setLocalActionState] = useState({});
  const [completedActionState, setCompletedActionState] = useState({});
  const [activityTrail, setActivityTrail] = useState([]);
  const [draftDescriptions, setDraftDescriptions] = useState({});
  const [selectedDrafts, setSelectedDrafts] = useState({});
  const [draftApprovalState, setDraftApprovalState] = useState({});
  const [reviewMode, setReviewMode] = useState("list");
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
  const [reviewEditForm, setReviewEditForm] = useState(null);

  const [selectedReminderDrafts, setSelectedReminderDrafts] = useState({});
  const [selectedQuoteDrafts, setSelectedQuoteDrafts] = useState({});
  const [selectedAssignments, setSelectedAssignments] = useState({});
  const [reminderMessages, setReminderMessages] = useState({});
  const [quoteMessages, setQuoteMessages] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const safe = async (path) => { try { return await get(path); } catch { return []; } };
    try {
      const [jobs, clients, quotes, invoices, workers, approvals] = await Promise.all([safe("/jobs"), safe("/clients"), safe("/quotes"), safe("/invoices"), safe("/team/workers"), canSeeOwnerControls ? safe("/ai/operator/actions") : Promise.resolve([])]);
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
  const isAssignedJob = (j) => Boolean(j?.assigned_worker_id || j?.assigned_worker || j?.worker_id || j?.assignee || ["assigned", "in_progress", "completed"].includes(String(j?.status || "").toLowerCase()));
  const hasInvoiceForJob = (job) => data.invoices.some((inv) => sameId(inv?.job_id || inv?.related_job_id, asId(job)));
  const hasDraftOrInvoice = (j) => Boolean(j?.invoice_id || j?.invoice_created || j?.draft_invoice_id || ["created", "draft", "sent"].includes(String(j?.invoice_status || "").toLowerCase()) || hasInvoiceForJob(j));
  const unassignedJobs = useMemo(() => data.jobs.filter((j) => !isAssignedJob(j)), [data.jobs]);
  const completedReadyToBill = useMemo(() => data.jobs.filter((j) => ["completed","complete"].includes(normalizeStatus(j.status)) && !hasDraftOrInvoice(j)), [data.jobs, data.invoices]);
  const waitingQuotes = useMemo(() => data.quotes.filter((q) => ["sent", "pending"].includes(String(q.status || "").toLowerCase())), [data.quotes]);
  const openInvoices = useMemo(() => data.invoices.filter((i) => ["open", "overdue", "sent"].includes(String(i.status || "").toLowerCase())), [data.invoices]);
  const overdueInvoices = useMemo(() => openInvoices.filter((i) => String(i.status || "").toLowerCase() === "overdue"), [openInvoices]);
  const crewActive = useMemo(() => workers.filter((w) => ["active", "busy", "on_site"].includes(String(w.status || "").toLowerCase())).length, [workers]);
  const needsSetup = useMemo(() => data.clients.length < 1 || workers.length < 1 || data.jobs.length < 1, [data.clients.length, workers.length, data.jobs.length]);

  const approvals = useMemo(() => data.approvals.filter((a) => String(a.status || "pending").toLowerCase() !== "approved"), [data.approvals]);
  const derivedActions = useMemo(() => {
    const rankedUnassigned = [...unassignedJobs].sort((a, b) => {
      const pA = String(a.priority || "").toLowerCase();
      const pB = String(b.priority || "").toLowerCase();
      return (riskRank[pA] ?? 4) - (riskRank[pB] ?? 4);
    });
    const targetJob = rankedUnassigned[0];
    const rankedWorkers = workers.map((w) => {
      const load = jobsToday.filter((j) => String(j.assigned_worker_id || j.worker_id || "") === String(w.id || w._id || w.user_id)).length;
      const status = String(w.status || "").toLowerCase();
      const activeScore = ["active", "available", "on_site", "busy"].includes(status) ? 2 : 0;
      const availabilityScore = w.available === false ? -3 : 1;
      const region = String(w.region || w.area || w.zone || "").toLowerCase();
      const jobRegion = String(targetJob?.area || targetJob?.region || targetJob?.suburb || "").toLowerCase();
      const regionScore = region && jobRegion && region === jobRegion ? 2 : 0;
      return { w, load, score: activeScore + availabilityScore + regionScore - load };
    }).sort((a, b) => b.score - a.score || a.load - b.load);
    const recommended = rankedWorkers[0]?.w;
    const list = [];
    if (targetJob && recommended) list.push({ id: `assign-worker-${getAnyId(targetJob)}-${getAnyId(recommended)}`, type: "assign_worker", action_type: "assign_worker", job_id: getAnyId(targetJob), worker_id: getAnyId(recommended), client_id: targetJob.client_id || "", job: targetJob, worker: recommended, priority: "urgent", kind: "assign_worker", title: `Assign ${recommended?.name || "worker"} to ${targetJob?.title || "job"}`, reason: `AI recommends this assignment based on availability, workload, area match, and schedule checks.`, dataUsed: `Job: ${targetJob?.title || getAnyId(targetJob)} · Worker load today: ${rankedWorkers[0]?.load ?? 0} · Unassigned jobs: ${unassignedJobs.length}`, risk: "high", primary: "Approve", nav: "/dispatch", source: "frontend_recommendation" });
    if (completedReadyToBill.length) list.push({ id: `draft-invoice-${getAnyId(completedReadyToBill[0])}`, priority: "ready", kind: "create_invoice_draft", action_type: "create_invoice_draft", job_id: getAnyId(completedReadyToBill[0]), title: `Create ${completedReadyToBill.length} draft invoice${completedReadyToBill.length > 1 ? "s" : ""}`, reason: "AI prepared invoice drafts for completed jobs with pricing not yet billed.", dataUsed: `Completed not invoiced: ${completedReadyToBill.length}`, risk: "medium", primary: "Approve draft", nav: "/invoices" });
    if (waitingQuotes.length) list.push({ id: `quote-followup-${getAnyId(waitingQuotes[0])}`, priority: "draft", kind: "quote_follow_up", action_type: "quote_follow_up", quote_id: getAnyId(waitingQuotes[0]), title: `Follow up ${waitingQuotes.length} quote${waitingQuotes.length > 1 ? "s" : ""}`, reason: "AI prepared follow-up drafts for quotes waiting response.", dataUsed: `Waiting quotes: ${waitingQuotes.length}`, risk: "low", primary: "Approve draft", nav: "/quotes" });
    if (openInvoices.length) list.push({ id: `invoice-reminder-${getAnyId(openInvoices[0])}`, priority: "draft", kind: "invoice_reminder", action_type: "invoice_reminder", invoice_id: getAnyId(openInvoices[0]), title: `Prepare reminders for ${openInvoices.length} open invoice${openInvoices.length > 1 ? "s" : ""}`, reason: "AI prepared reminders for unpaid invoices.", dataUsed: `Overdue: ${overdueInvoices.length} · Open: ${openInvoices.length}`, risk: overdueInvoices.length ? "high" : "medium", primary: "Approve draft", nav: "/invoices" });
    if (workers.length) list.push({ priority: "watching", kind: "crew_load", title: "Check worker workload balance", reason: "AI detected workers with low and high load today.", dataUsed: `Crew active: ${crewActive}/${workers.length}`, risk: "low", primary: "Open dispatch", nav: "/dispatch" });
    return list;
  }, [workers, jobsToday, unassignedJobs, completedReadyToBill, waitingQuotes, openInvoices, overdueInvoices, crewActive]);

  const reminderRows = useMemo(() => openInvoices.map((inv) => {
    const client = findByAnyId(data.clients, inv.client_id || inv.customer_id, ["id","_id","client_id"]);
    const amount = Number(inv.total || inv.amount_due || inv.balance_due || 0);
    const id = asId(inv);
    const message = reminderMessages[id] || `Hi ${textOr(client?.name, "there")}, just a friendly reminder that invoice ${textOr(inv.number || inv.title || id, "") } for ${fmtMoney(amount)} is still outstanding. Please let us know if you need anything from us.`;
    const due = inv.due_date || inv.due_at;
    const overdueDays = due ? Math.max(Math.floor((Date.now()-new Date(due).getTime())/86400000),0) : 0;
    return { id, inv, client, amount, message, missingContact: !(client?.email || client?.phone), overdueDays };
  }), [openInvoices, data.clients, reminderMessages]);
  const quoteFollowupRows = useMemo(() => waitingQuotes.map((q) => {
    const client = findByAnyId(data.clients, q.client_id || q.customer_id, ["id","_id","client_id"]);
    const id = asId(q);
    const message = quoteMessages[id] || `Hi ${textOr(client?.name, "there")}, just checking in on the quote for ${textOr(q.title, "your project")}. Happy to answer any questions or adjust anything if needed.`;
    const amount = Number(q.total || q.amount || 0);
    const ageDays = q.created_at ? Math.max(Math.floor((Date.now()-new Date(q.created_at).getTime())/86400000),0) : 0;
    return { id, q, client, amount, message, missingContact: !(client?.email || client?.phone), ageDays };
  }), [waitingQuotes, data.clients, quoteMessages]);
  const actionCards = approvals.length ? approvals.map((a) => ({ ...a, priority: "ready", title: a.title || "AI prepared action", reason: a.reason || "AI recommends owner approval.", dataUsed: a.summary || "AI prepared from jobs, crew, quotes and invoices.", risk: a.risk_level || "medium", primary: "Approve", nav: "/dashboard" })) : derivedActions;
  const visibleActionCards = useMemo(() => actionCards.filter((a) => !["rejected","approved"].includes(localActionState[String(a.id || a._id || a.title || "")])), [actionCards, localActionState]);
  const grouped = useMemo(() => ({ urgent: visibleActionCards.filter((a) => a.priority === "urgent" || a.risk === "high"), ready: visibleActionCards.filter((a) => a.priority === "ready"), draft: visibleActionCards.filter((a) => a.priority === "draft"), watching: visibleActionCards.filter((a) => a.priority === "watching" || a.risk === "low") }), [visibleActionCards]);


  const approveReminderDrafts = useCallback(async (rows) => {
    const ready = rows.filter((r) => r && !r.missingContact);
    if (!ready.length) { toast.error("No reminder drafts are ready to approve."); return; }
    let approved = 0;
    for (const row of ready) {
      const action = approvals.find((a) => String(a.action_type || a.type || "").toLowerCase() === "invoice_reminder" && sameId(a.related_entity_id || a.invoice_id, row.id));
      if (action?.id || action?._id) {
        await post(`/ai/operator/actions/${action.id || action._id}/approve`, {});
      }
      approved += 1;
    }
    setActivityTrail((trail) => [{ time: new Date().toISOString(), action: `Payment reminders prepared (${approved})`, result: "Draft prepared only", approvedBy: user?.name || "Owner" }, ...trail].slice(0, 12));
    toast.success(`${approved} reminder draft${approved > 1 ? "s" : ""} prepared.`);
    await load();
  }, [approvals, load, user?.name]);

  const approveQuoteFollowupDrafts = useCallback(async (rows) => {
    const ready = rows.filter((r) => r && !r.missingContact);
    if (!ready.length) { toast.error("No quote follow-up drafts are ready to approve."); return; }
    let approved = 0;
    for (const row of ready) {
      const action = approvals.find((a) => String(a.action_type || a.type || "").toLowerCase() === "quote_follow_up" && sameId(a.related_entity_id || a.quote_id, row.id));
      if (action?.id || action?._id) {
        await post(`/ai/operator/actions/${action.id || action._id}/approve`, {});
      }
      approved += 1;
    }
    setActivityTrail((trail) => [{ time: new Date().toISOString(), action: `Quote follow-ups prepared (${approved})`, result: "Draft prepared only", approvedBy: user?.name || "Owner" }, ...trail].slice(0, 12));
    toast.success(`${approved} quote follow-up draft${approved > 1 ? "s" : ""} prepared.`);
    await load();
  }, [approvals, load, user?.name]);

  const refreshSmartHubAfterAction = useCallback(async () => {
    await load();
    setSelectedSmartHubAction(null);
    setSelectedAction(null);
    setIsActionModalOpen(false);
    setActiveSmartHubSection((prev) => prev);
  }, [load]);

  const markActionCompleted = (action, message) => {
    const key = String(action?.id || action?._id || action?.title || "");
    if (!key) return;
    setCompletedActionState((s) => ({ ...s, [key]: message || "Approved" }));
    setLocalActionState((s) => ({ ...s, [key]: "approved" }));
    setActivityTrail((trail) => [{
      time: new Date().toISOString(),
      action: action?.title || "AI action approved",
      result: message || "Approved",
      approvedBy: user?.name || "Owner",
    }, ...trail].slice(0, 12));
  };

  const handleReviewAction = (action) => { setSelectedAction(action); setSelectedSmartHubAction(action); setActionError(""); setIsActionModalOpen(true); };
  const handleApproveAction = async (action) => {
    const actionId = String(action?.id || action?._id || "");
    const actionType = String(action?.action_type || action?.kind || "").toLowerCase();
    setApprovingActionId(actionId || action?.title || "local");
    setActionError("");
    try {
      if (actionType === "assign_worker" && (action?.job_id || action?.worker_id || editedWorkerId)) {
        const workerId = editedWorkerId || action?.worker_id || action?.recommended_worker_id;
        const jobId = action?.job_id || action?.related_job_id;
        if (!jobId || !workerId) throw new Error("Cannot approve assignment: missing job or worker id.");
        await post(`/jobs/${jobId}/assign-worker`, { worker_id: workerId, workerId });
        markActionCompleted(action, "Approved — worker assigned");
        setData((prev) => ({ ...prev, jobs: prev.jobs.map((j) => sameId(asId(j), jobId) ? { ...j, assigned_worker_id: workerId, status: ["assigned","in_progress","completed"].includes(String(j.status||"").toLowerCase()) ? j.status : "assigned" } : j) }));
        toast.success("Approved — worker assigned");
        setEditedWorkerId("");
        await refreshSmartHubAfterAction();
        return;
      }
      if (!actionId) throw new Error("Cannot approve yet: missing action id.");
      if (!APPROVAL_ACTION_TYPES.has(actionType)) throw new Error(`Cannot approve yet: unsupported action type '${actionType || "unknown"}'.`);
      if (actionType === "create_invoice_draft") {
        const draftJobId = action?.job_id || completedReadyToBill?.[0]?.id || completedReadyToBill?.[0]?._id;
        if (!draftJobId) throw new Error("Cannot approve draft invoice: missing job id.");
        await post(`/jobs/${draftJobId}/create-draft-invoice`);
      } else {
        await post(`/ai/operator/actions/${actionId}/approve`, {});
      }
      markActionCompleted(action, actionType === "create_invoice_draft" ? "Approved — draft invoice created" : "Approved");
      toast.success(actionType === "create_invoice_draft" ? "Approved — draft invoice created" : "Action approved.");
      await refreshSmartHubAfterAction();
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Approve failed.";
      setActionError(msg);
      toast.error(msg);
    } finally { setApprovingActionId(""); }
  };
  const handleRejectAction = async (action) => {
    const actionId = String(action?.id || action?._id || "");
    try {
      if (!actionId) {
        const localId = String(action?.id || action?.title || Math.random());
        setLocalActionState((s) => ({ ...s, [localId]: "rejected" }));
        toast.success("Recommendation rejected.");
        await refreshSmartHubAfterAction();
        return;
      }
      await post(`/ai/operator/actions/${actionId}/reject`, {});
      setLocalActionState((s) => ({ ...s, [actionId]: "rejected" }));
      setActivityTrail((trail) => [{
        time: new Date().toISOString(),
        action: action?.title || "AI action",
        result: "Rejected",
        approvedBy: user?.name || "Owner",
      }, ...trail].slice(0, 12));
      toast.success("Action rejected.");
      await refreshSmartHubAfterAction();
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Reject failed.";
      setActionError(msg);
      toast.error(msg);
    }
  };
  const handleEditAction = (action) => { setSelectedAction(action); setEditedWorkerId(String(action?.recommended_worker_id || action?.worker_id || action?.assigned_worker_id || "")); toast("Edit mode enabled. Choose a worker below before approval."); };
  const openWorkspace = (section, mode = "list", record = null) => {
    setActiveWorkspace(section);
    setActiveSmartHubSection(section);
    setWorkspaceDrawer(section);
    setWorkspaceMode(mode);
    setWorkspaceRecord(record);
  };

  const workspaceRoute = (section, mode = "list", record = null) => {
    const recordId = asId(record);
    if (section === "jobs") {
      if (mode === "create") return "/jobs/new";
      if (mode === "edit" && recordId) return `/jobs/${recordId}/edit`;
      if (mode === "detail" && recordId) return `/jobs/${recordId}`;
      return "/jobs";
    }
    if (section === "clients") {
      if (mode === "create") return "/clients/new";
      if (mode === "edit" && recordId) return `/clients/${recordId}/edit`;
      if (mode === "detail" && recordId) return `/clients/${recordId}`;
      return "/clients";
    }
    if (section === "quotes") {
      if (mode === "create") return "/quotes/new";
      if (mode === "edit" && recordId) return `/quotes/${recordId}/edit`;
      if (mode === "detail" && recordId) return `/quotes/${recordId}`;
      return "/quotes";
    }
    if (section === "invoices") {
      if (mode === "create") return "/invoices/new";
      if (mode === "edit" && recordId) return `/invoices/${recordId}/edit`;
      if (mode === "detail" && recordId) return `/invoices/${recordId}`;
      return "/invoices";
    }
    if (section === "crew") return "/team";
    if (section === "dispatch") return "/dispatch";
    if (section === "payroll") return "/payroll";
    if (section === "automation") return "/automation";
    if (section === "reports") return "/reports";
    if (section === "communications") return "/communications";
    if (section === "approvals") return "/dashboard";
    return "/dashboard";
  };


  const filteredWorkspaceRows = useMemo(() => {
    const base = activeSmartHubSection === "clients" ? data.clients : activeSmartHubSection === "jobs" ? data.jobs : activeSmartHubSection === "quotes" ? data.quotes : activeSmartHubSection === "invoices" ? data.invoices : activeSmartHubSection === "crew" ? workers : activeSmartHubSection === "approvals" ? visibleActionCards : [];
    const q = workspaceQuery.toLowerCase();
    let rows = base.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
    if (activeSmartHubSection === "jobs") {
      if (workspaceFilter === "today") rows = rows.filter((j) => String(j.scheduled_date || j.date || "").slice(0,10) === today);
      if (workspaceFilter === "unassigned") rows = rows.filter((j) => !isAssignedJob(j));
      if (workspaceFilter === "completed") rows = rows.filter((j) => String(j.status||"").toLowerCase() === "completed");
      if (workspaceFilter === "ready_to_bill") rows = rows.filter((j) => String(j.status||"").toLowerCase() === "completed" && !hasDraftOrInvoice(j));
    }
    return rows.slice(0,50);
  }, [activeSmartHubSection, data.clients, data.jobs, data.quotes, data.invoices, workers, visibleActionCards, workspaceQuery, workspaceFilter, today]);

  const saveWorkspaceEdit = async () => {
    if (!workspaceRecord || !activeSmartHubSection) return;
    try {
      const id = asId(workspaceRecord);
      const payload = { ...workspaceRecord };
      await post(`/${activeSmartHubSection}/${id}`, payload);
      toast.success("Saved changes");
      await load();
      setWorkspaceMode("detail");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save changes");
    }
  };

  const clientsById = useMemo(() => new Map(data.clients.map((c) => [String(c.id || c._id || c.client_id || ""), c])), [data.clients]);
  const invoiceDraftRows = useMemo(() => completedReadyToBill.map((job) => {
    const jobId = asId(job);
    const clientId = String(job.client_id || job.clientId || job.customer_id || job.client?.id || job.client?._id || "");
    const client = clientsById.get(clientId) || job.client || null;
    const clientName = firstText(client?.name, job.client_name, job.customer_name, "No client linked");
    const description = firstText(job.ai_invoice_description, job.invoice_description_draft, job.worker_completion_notes, job.completion_notes, job.notes, `${job.title || job.name || "Service work"} at ${job.address || "site"} for ${clientName}.`, `Service work completed for ${clientName}.`);
    const subtotal = Number(job.subtotal ?? job.price ?? job.total_ex_gst);
    const gst = Number(job.gst ?? job.tax ?? (Number.isFinite(subtotal) ? subtotal * 0.1 : NaN));
    const total = Number(job.total ?? (Number.isFinite(subtotal) && Number.isFinite(gst) ? subtotal + gst : NaN));
    const missingPrice = !Number.isFinite(total) || total <= 0;
    return { job, jobId, clientName, description, subtotal, gst, total, missingPrice };
  }), [completedReadyToBill, clientsById]);
  useEffect(() => {
    const next = {};
    const selected = {};
    invoiceDraftRows.forEach((r) => { next[r.jobId] = draftDescriptions[r.jobId] || r.description; selected[r.jobId] = selectedDrafts[r.jobId] ?? !r.missingPrice; });
    setDraftDescriptions(next);
    setSelectedDrafts(selected);
  }, [isActionModalOpen, selectedAction?.action_type]);
  useEffect(() => {
    if (!isActionModalOpen) {
      setReviewMode("list");
      setSelectedReviewItem(null);
      setReviewEditForm(null);
    }
  }, [isActionModalOpen]);

  const openReviewJobEdit = (row) => {
    setSelectedReviewItem(row);
    setReviewMode("jobEdit");
    setReviewEditForm({
      title: row.job.title || row.job.name || "",
      address: row.job.address || row.job.job_address || "",
      scheduled_date: row.job.scheduled_date || row.job.date || "",
      assigned_worker_id: row.job.assigned_worker_id || row.job.worker_id || "",
      pricing_type: row.job.pricing_type || row.job.price_type || "",
      subtotal: Number.isFinite(row.subtotal) ? row.subtotal : "",
      gst: Number.isFinite(row.gst) ? row.gst : "",
      invoice_description_draft: draftDescriptions[row.jobId] || row.description || "",
      notes: row.job.notes || row.job.description || "",
      completion_notes: row.job.completion_notes || row.job.worker_completion_notes || "",
    });
  };
  const openReviewJobDetail = (row) => { setSelectedReviewItem(row); setReviewMode("jobDetail"); };
  const saveReviewJobEdit = async () => {
    if (!selectedReviewItem || !reviewEditForm) return;
    await post(`/jobs/${selectedReviewItem.jobId}`, reviewEditForm);
    setDraftDescriptions((s) => ({ ...s, [selectedReviewItem.jobId]: reviewEditForm.invoice_description_draft || "" }));
    toast.success("Job details updated");
    await load();
    setReviewMode("list");
    setSelectedReviewItem(null);
  };

  const approveDraftInvoice = useCallback(async (row) => {
    await post(`/jobs/${row.jobId}/create-draft-invoice`, { description: draftDescriptions[row.jobId] || row.description, invoice_description: draftDescriptions[row.jobId] || row.description, client_id: row.job.client_id || row.job.clientId || row.job.customer_id || undefined });
    setDraftApprovalState((s) => ({ ...s, [row.jobId]: "approved" }));
    setActivityTrail((trail) => [{ time: new Date().toISOString(), action: `Draft invoice created for ${row.clientName}`, result: `Job: ${row.job.title || row.job.name || "Service job"}`, approvedBy: user?.name || "Owner" }, ...trail].slice(0, 12));
  }, [draftDescriptions, user?.name]);

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
  const bestNextMove = unassignedJobs.length > 0
    ? "Approve worker assignments"
    : completedReadyToBill.length > 0
      ? "Approve invoice drafts"
      : openInvoices.length > 0
        ? "Prepare payment reminders"
        : waitingQuotes.length > 0
          ? "Review quote follow-ups"
          : "All clear";
  const missionText = (unassignedJobs.length || completedReadyToBill.length || openInvoices.length || waitingQuotes.length)
    ? `AI found ${completedReadyToBill.length} completed jobs ready to bill, ${openInvoices.length} open invoices, and ${waitingQuotes.length} quotes waiting. The best first move is ${bestNextMove.toLowerCase()}.`
    : "AI checked today’s work. There are no urgent approvals waiting right now.";
  const inboxGroups = useMemo(() => ({
    needsDecision: visibleActionCards.filter((a) => (a.priority === "urgent" || a.risk === "high") && !completedActionState[String(a.id || a._id || a.title || "")]),
    readyDrafts: visibleActionCards.filter((a) => (a.priority === "ready" || a.priority === "draft") && !completedActionState[String(a.id || a._id || a.title || "")]),
    monitoring: visibleActionCards.filter((a) => (a.priority === "watching" || a.risk === "low") && !completedActionState[String(a.id || a._id || a.title || "")]),
    completedToday: actionCards.filter((a) => completedActionState[String(a.id || a._id || a.title || "")]).map((a) => ({ ...a, completedLabel: completedActionState[String(a.id || a._id || a.title || "")] })),
  }), [visibleActionCards, completedActionState]);

  if (loading) return <Layout><div className="p-6">Loading Smart Hub Brain…</div></Layout>;

  const heroRisk = actionCards.sort((a, b) => (riskRank[a.risk] ?? 3) - (riskRank[b.risk] ?? 3))[0]?.risk || "medium";
  const invoicesWaitingText = openInvoices.length ? `${openInvoices.length} invoices waiting` : "No invoices waiting";
  const bestMove = unassignedJobs.length > 0
    ? "Approve worker assignments"
    : completedReadyToBill.length > 0
      ? "Approve invoice drafts"
      : openInvoices.length > 0
        ? "Prepare payment reminders"
        : waitingQuotes.length > 0
          ? "Review quote follow-ups"
          : "All clear";
  const decisionCards = [
    completedReadyToBill.length > 0 ? { key: "invoice_drafts", type: "create_invoice_draft", title: `Create ${completedReadyToBill.length} draft invoice${completedReadyToBill.length > 1 ? "s" : ""}`, reason: `${completedReadyToBill.length} completed jobs are ready for billing.`, whatHappens: "Churvox will create editable draft invoices. Nothing is sent until you approve sending.", dataUsed: completedReadyToBill.length > 3 ? `${completedReadyToBill.length} completed jobs ready to bill` : `Jobs ready: ${completedReadyToBill.slice(0, 3).map((j) => j.title || j.name || "Job").join(", ")}`, primary: "Approve drafts", action: () => handleApproveAction({ id: `draft-invoice-${getAnyId(completedReadyToBill[0])}`, action_type: "create_invoice_draft", job_id: getAnyId(completedReadyToBill[0]), title: `Create ${completedReadyToBill.length} draft invoice${completedReadyToBill.length > 1 ? "s" : ""}` }), detailAction: () => handleReviewAction({ id: `draft-invoice-${getAnyId(completedReadyToBill[0])}`, action_type: "create_invoice_draft", title: `Invoice drafts review`, reason: "Completed jobs are ready to bill.", dataUsed: "Review each completed job and draft details before approval." }) } : null,
    openInvoices.length > 0 ? { key: "invoice_reminders", type: "invoice_reminder", title: `Prepare reminders for ${openInvoices.length} open invoice${openInvoices.length > 1 ? "s" : ""}`, reason: overdueInvoices.length > 0 ? `${overdueInvoices.length} are overdue and need follow-up.` : "Unpaid invoices are ready for reminder drafts.", whatHappens: "AI prepares reminder drafts for owner approval. Messages are not sent automatically.", dataUsed: `${openInvoices.length} open invoices waiting for payment`, primary: "Prepare reminders", action: () => handleApproveAction({ id: `invoice-reminder-${getAnyId(openInvoices[0])}`, action_type: "invoice_reminder", invoice_id: getAnyId(openInvoices[0]), title: `Prepare reminders for ${openInvoices.length} open invoices` }), detailAction: () => handleReviewAction({ id: `invoice-reminder-${getAnyId(openInvoices[0])}`, action_type: "invoice_reminder", title: "Invoice reminders review", reason: "Open invoices need follow-up." }) } : null,
    waitingQuotes.length > 0 ? { key: "quote_followups", type: "quote_follow_up", title: `Follow up ${waitingQuotes.length} quote${waitingQuotes.length > 1 ? "s" : ""}`, reason: "Quotes are waiting on customer response.", whatHappens: "AI drafts a follow-up for review. No message is sent without approval.", dataUsed: `${waitingQuotes.length} quote${waitingQuotes.length > 1 ? "s" : ""} waiting for client response`, primary: "Review follow-ups", action: () => handleApproveAction({ id: `quote-followup-${getAnyId(waitingQuotes[0])}`, action_type: "quote_follow_up", quote_id: getAnyId(waitingQuotes[0]), title: `Follow up ${waitingQuotes.length} quote${waitingQuotes.length > 1 ? "s" : ""}` }), detailAction: () => handleReviewAction({ id: `quote-followup-${getAnyId(waitingQuotes[0])}`, action_type: "quote_follow_up", title: "Quote follow-ups review", reason: "Quotes are awaiting response." }) } : null,
  ].filter(Boolean).slice(0, 3);

  return (<><Layout smartHubMode><div className="min-h-screen bg-[#f4f1ea]"><div className="mx-auto max-w-[1300px] space-y-5 p-4 sm:p-6">
    <section className="rounded-2xl border border-slate-200/70 bg-[#fbf8f1] px-4 py-3 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><ChurvoxLogo size="sm" /><div><p className="text-xs uppercase tracking-[0.24em] text-slate-500">AI Command Centre</p><p className="text-sm font-semibold text-slate-800">Business pulse: {jobsToday.length} jobs · {openInvoices.length} invoices · {waitingQuotes.length} quotes</p></div></div><div className="flex items-center gap-2"><NotificationsBell /><button onClick={() => setModal("ask")} className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow">Ask AI</button><details className="relative"><summary className="list-none cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">{(user?.name || "Profile").split(" ")[0]}</summary><div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white p-2 shadow-xl z-20"><p className="px-2 py-1 text-xs text-slate-500">{user?.email}</p><Link to="/settings" className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-100">Settings</Link><Link to="/account" className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-100">Account</Link><button onClick={async () => { await logout(); navigate("/login"); }} className="mt-1 w-full text-left rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50">Log out</button></div></details></div></div></section>
    <section className="rounded-3xl border border-slate-700/70 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-7 text-slate-100 shadow-2xl"><div className="grid gap-6 lg:grid-cols-[2fr_1fr]"><div><h2 className="text-3xl font-bold">AI is running today’s admin</h2><p className="mt-2 text-sm text-slate-300">Churvox has checked the day and prepared the next moves for approval.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["actions prepared", actionCards.length], ["need approval", approvals.length], ["$ / invoices waiting", invoicesWaitingText], ["risk", heroRisk]].map(([k, v]) => <div key={k} className="rounded-2xl border border-slate-700 bg-slate-800/70 p-3"><p className="text-xs uppercase tracking-wide text-slate-400">{k}</p><p className="mt-1 text-lg font-semibold">{v}</p></div>)}</div></div><div className="rounded-2xl border border-amber-300/30 bg-slate-800/80 p-4"><p className="text-xs uppercase tracking-wide text-amber-300">Best next move</p><p className="mt-2 text-xl font-semibold text-white">{bestMove}</p><p className="mt-2 text-sm text-slate-300">{bestMove === "Approve invoice drafts" ? `${completedReadyToBill.length} completed jobs are ready to bill.` : bestMove === "Approve worker assignments" ? `${unassignedJobs.length} jobs are waiting for assignment.` : bestMove === "Prepare payment reminders" ? `${openInvoices.length} open invoices need follow-up.` : bestMove === "Review quote follow-ups" ? `${waitingQuotes.length} quotes are waiting on response.` : "All clear. AI has no urgent decisions waiting."}</p><button onClick={() => openWorkspace(bestMove === "Approve invoice drafts" ? "invoices" : bestMove === "Approve worker assignments" ? "jobs" : bestMove === "Prepare payment reminders" ? "invoices" : "quotes")} className="mt-3 rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white">{bestMove === "All clear" ? "View workspaces" : "Review drafts"}</button></div></div><p className="mt-5 text-xs text-slate-300">AI prepares the work. You approve before anything is sent, assigned, charged, or changed.</p></section>
    <section className="grid gap-4 lg:grid-cols-3">{decisionCards.length ? decisionCards.map((card) => <article key={card.key} className="rounded-3xl border border-slate-200/70 bg-[#f9f6ef] p-5 shadow-lg"><p className="text-xl font-semibold text-slate-900">{card.title}</p><p className="mt-2 text-sm text-slate-600"><span className="font-semibold">Reason:</span> {card.reason}</p><p className="mt-1 text-sm text-slate-600"><span className="font-semibold">What happens:</span> {card.whatHappens}</p><p className="mt-1 text-xs text-slate-500">{card.dataUsed || "Using current live records"}</p><div className="mt-4 flex gap-2"><button onClick={card.action} className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white">{card.primary}</button><button onClick={card.detailAction || card.action} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Details</button></div></article>) : <article className="rounded-3xl border border-slate-200/70 bg-[#f9f6ef] p-5 shadow-lg"><p className="text-xl font-semibold text-slate-900">All clear</p><p className="mt-2 text-sm text-slate-600">All clear. AI has no urgent decisions waiting.</p></article>}</section>
    <section className="rounded-2xl border border-slate-200/80 bg-[#fbf8f1] p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Ready to bill", completedReadyToBill.length], ["Open invoices", openInvoices.length], ["Quotes waiting", waitingQuotes.length], ["Crew available", Math.max(workers.length - crewActive, 0)]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="text-lg font-semibold text-slate-900">{value}</p></div>)}</div></section>
    <section className="rounded-3xl border border-slate-300/80 bg-white/80 p-4 shadow-md"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["Jobs", "Clients", "Invoices", "Quotes", "Crew", "Payroll", "Approvals"].map((name) => <button key={name} onClick={() => openWorkspace(name.toLowerCase())} className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5"><p className="text-sm font-semibold text-slate-800">{name}</p></button>)}</div></section>
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm"><h3 className="text-sm font-semibold text-slate-900">AI activity</h3>{activityTrail.length ? <div className="mt-2 space-y-2">{activityTrail.map((item, idx) => <div key={`${item.time}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"><p className="font-semibold text-slate-800">{item.action}</p><p className="text-slate-600">{item.result} · {item.approvedBy}</p><p className="text-slate-500">{new Date(item.time).toLocaleString()}</p></div>)}</div> : <p className="mt-2 text-sm text-slate-600">No AI actions approved yet. Approved work will appear here.</p>}</section>{error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
  </div></div>
  <SmartModal open={Boolean(workspaceDrawer)} wide title={`${activeSmartHubSection || ""} workspace`} onClose={() => { setActiveSmartHubSection(null); setWorkspaceDrawer(null); setWorkspaceMode("list"); setWorkspaceRecord(null); }} actions={<button onClick={() => navigate(workspaceRoute(activeSmartHubSection, workspaceMode, workspaceRecord))} className="rounded-full border px-3 py-1 text-xs">Open full page</button>}>

    <div className="space-y-4 text-sm">
      <div className="rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-slate-100 shadow-lg">
        <p className="text-lg font-semibold capitalize">{activeSmartHubSection || "Workspace"}</p>
        <p className="mt-1 text-sm text-slate-300">{activeSmartHubSection === "invoices" ? "Review drafts, open invoices, and AI-prepared billing actions." : "Embedded Smart Hub workspace with no duplicate sidebar or route shell."}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={workspaceQuery} onChange={(e) => setWorkspaceQuery(e.target.value)} placeholder="Search workspace…" className="min-w-[220px] flex-1 rounded-lg border px-3 py-2" />
        {["clients","jobs","quotes","invoices"].includes(activeSmartHubSection) ? <button onClick={() => setWorkspaceMode("create")} className="rounded-full bg-teal-700 text-white px-3 py-2 text-xs">Create</button> : null}
        {workspaceMode !== "list" ? <button onClick={() => { setWorkspaceMode("list"); setWorkspaceRecord(null); }} className="rounded-full border px-3 py-2 text-xs">Back to list</button> : null}
      </div>
      {workspaceMode === "create" && modal !== activeSmartHubSection ? <div className="rounded-xl border p-3">
        {activeSmartHubSection === "clients" ? <ClientCreateForm onCancel={() => setWorkspaceMode("list")} onSuccess={() => { setWorkspaceMode("list"); load(); }} submitLabel="Add client" /> : null}
        {activeSmartHubSection === "jobs" ? <JobCreateForm onCancel={() => setWorkspaceMode("list")} onSuccess={() => { setWorkspaceMode("list"); load(); }} submitLabel="Create job" /> : null}
        {activeSmartHubSection === "quotes" ? <QuoteCreateForm onCancel={() => setWorkspaceMode("list")} onSuccess={() => { setWorkspaceMode("list"); load(); }} submitLabel="Create quote" /> : null}
        {activeSmartHubSection === "invoices" ? <InvoiceCreateForm onCancel={() => setWorkspaceMode("list")} onSuccess={() => { setWorkspaceMode("list"); load(); }} submitLabel="Create invoice" /> : null}
      </div> : null}
      {workspaceMode === "list" ? <div className="space-y-3">
        {activeSmartHubSection === "jobs" ? <div className="flex flex-wrap gap-2"><button onClick={() => setWorkspaceFilter("all")} className="rounded-full border px-3 py-1 text-xs">All</button><button onClick={() => setWorkspaceFilter("today")} className="rounded-full border px-3 py-1 text-xs">Today</button><button onClick={() => setWorkspaceFilter("unassigned")} className="rounded-full border px-3 py-1 text-xs">Unassigned</button><button onClick={() => setWorkspaceFilter("completed")} className="rounded-full border px-3 py-1 text-xs">Completed</button><button onClick={() => setWorkspaceFilter("ready_to_bill")} className="rounded-full border px-3 py-1 text-xs">Ready to bill</button></div> : null}
        <div className="grid gap-3 md:grid-cols-2">
        {filteredWorkspaceRows.map((row, idx) => <div key={asId(row) || row.id || idx} className="rounded-xl border p-3">
          <p className="font-semibold">{row.name || row.title || row.number || row.email || row.subject || `Record ${idx + 1}`}</p>
          <p className="text-xs text-slate-600 mt-1">Status: {row.status || row.risk || "n/a"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => { setWorkspaceMode("detail"); setWorkspaceRecord(row); }} className="rounded-full border px-2 py-1 text-xs">View</button>
            {activeSmartHubSection === "approvals" ? <>
              <button onClick={() => handleApproveAction(row)} className="rounded-full border px-2 py-1 text-xs">Approve</button>
              <button onClick={() => handleRejectAction(row)} className="rounded-full border px-2 py-1 text-xs">Reject</button>
            </> : null}
            {["jobs","clients","quotes","invoices"].includes(activeSmartHubSection) ? <button onClick={() => { setWorkspaceMode("edit"); setWorkspaceRecord(row); }} className="rounded-full border px-2 py-1 text-xs">Edit</button> : null}
            {activeSmartHubSection === "jobs" ? <button onClick={() => { setWorkspaceMode("assign"); setWorkspaceRecord(row); }} className="rounded-full border px-2 py-1 text-xs">Assign</button> : null}
          </div>
        </div>)}
      </div></div> : null}
      {workspaceMode === "detail" && workspaceRecord ? <div className="rounded-xl border p-3 bg-white space-y-2"><p className="font-semibold text-base">{workspaceRecord.title || workspaceRecord.name || "Record detail"}</p><p>Status: {workspaceRecord.status || "n/a"}</p><p>Client: {workspaceRecord.client_name || workspaceRecord.customer_name || workspaceRecord.email || "n/a"}</p><p>Address: {workspaceRecord.address || "n/a"}</p><p>Notes: {workspaceRecord.notes || workspaceRecord.description || "n/a"}</p><div className="flex flex-wrap gap-2"><button onClick={() => setWorkspaceMode("edit")} className="rounded-full border px-3 py-1 text-xs">Edit</button>{activeSmartHubSection === "jobs" ? <button onClick={() => setWorkspaceMode("assign")} className="rounded-full border px-3 py-1 text-xs">Assign/change worker</button> : null}<button onClick={() => navigate(workspaceRoute(activeSmartHubSection, workspaceMode, workspaceRecord))} className="rounded-full border px-3 py-1 text-xs">Open full page</button></div></div> : null}
      {workspaceMode === "assign" && workspaceRecord ? <div className="rounded-xl border p-3 bg-white space-y-2"><p className="font-semibold">Assign worker</p><select className="w-full rounded-lg border p-2" value={editedWorkerId} onChange={(e) => setEditedWorkerId(e.target.value)}><option value="">Select worker</option>{workers.map((w) => <option key={asId(w)} value={asId(w)}>{w.name || w.email}</option>)}</select><button onClick={async () => { if (!editedWorkerId) return; await post(`/jobs/${asId(workspaceRecord)}/assign-worker`, { worker_id: editedWorkerId }); toast.success("Worker assigned"); await load(); setWorkspaceMode("detail"); }} className="rounded-full bg-teal-700 text-white px-3 py-1 text-xs">Save assignment</button></div> : null}
      {workspaceMode === "edit" && workspaceRecord ? <div className="rounded-xl border p-3 bg-white space-y-2"><input className="w-full rounded-lg border p-2" value={workspaceRecord.title || workspaceRecord.name || ""} onChange={(e) => setWorkspaceRecord((r) => ({ ...r, title: e.target.value, name: e.target.value }))} /><textarea className="w-full rounded-lg border p-2" rows={4} value={workspaceRecord.notes || workspaceRecord.description || ""} onChange={(e) => setWorkspaceRecord((r) => ({ ...r, notes: e.target.value, description: e.target.value }))} /><button onClick={saveWorkspaceEdit} className="rounded-full bg-teal-700 text-white px-3 py-1 text-xs">Save changes</button></div> : null}
      {activeSmartHubSection === "today" ? <><p>Mission digest: {unassignedJobs.length} unassigned, {approvals.length} pending approvals, {overdueInvoices.length} overdue invoices.</p><p>Priority actions: {grouped.urgent.length} · Risks: {overdueInvoices.length ? "Receivables" : "Low"}</p><div className="flex flex-wrap gap-2"><button onClick={() => openWorkspace("approvals")} className="rounded-full border px-3 py-1.5">View approvals</button><button onClick={runDailyCheck} className="rounded-full border px-3 py-1.5">Run scan</button><button onClick={prepareToday} className="rounded-full border px-3 py-1.5">Prepare today</button><button onClick={() => setModal("ask")} className="rounded-full border px-3 py-1.5">Ask AI</button></div></> : null}
      {activeSmartHubSection === "dispatch" ? <><p>Unassigned jobs: {unassignedJobs.length} · Available workers: {workers.length - crewActive}</p><p>AI recommended matches: {derivedActions.filter((a) => a.kind === "assign_worker").length} · Schedule conflicts: {Math.max(unassignedJobs.length - (workers.length - crewActive), 0)}</p><div className="flex flex-wrap gap-2">{visibleActionCards.filter((a) => String(a.kind || a.action_type).toLowerCase() === "assign_worker").slice(0, 3).map((a) => <button key={a.id || a.title} onClick={() => handleReviewAction(a)} className="rounded-full border px-3 py-1.5">View details</button>)}</div><div className="flex flex-wrap gap-2"><button onClick={() => navigate("/dispatch")} className="rounded-full border px-3 py-1.5">Open dispatch board</button><button onClick={() => openWorkspace("jobs", "create")} className="rounded-full border px-3 py-1.5">Create job</button></div></> : null}
      {activeSmartHubSection === "jobs" ? <><p>Today jobs: {jobsToday.length} · Unassigned: {unassignedJobs.length} · Recently completed: {completedReadyToBill.length} · Ready to bill: {completedReadyToBill.length}</p><div className="flex flex-wrap gap-2"><button onClick={() => openWorkspace("jobs", "create")} className="rounded-full border px-3 py-1.5">Create job</button><button onClick={() => navigate("/jobs")} className="rounded-full border px-3 py-1.5">Open full jobs page</button></div></> : null}
      {activeSmartHubSection === "clients" ? <><p>Recent clients: {data.clients.length} · Active job clients: {new Set(data.jobs.filter((j) => j.client_id).map((j) => String(j.client_id))).size}</p><p>Clients with open invoices: {new Set(openInvoices.map((i) => String(i.client_id || i.customer_id || ""))).size}</p><div className="flex flex-wrap gap-2"><button onClick={() => openWorkspace("clients", "create")} className="rounded-full border px-3 py-1.5">Add client</button><button onClick={() => navigate("/clients")} className="rounded-full border px-3 py-1.5">Open full clients page</button></div></> : null}
      {activeSmartHubSection === "quotes" ? <><p>Quotes waiting: {waitingQuotes.length} · AI follow-up drafts: {derivedActions.filter((a) => a.kind === "quote_follow_up").length}</p><div className="flex flex-wrap gap-2"><button onClick={() => openWorkspace("quotes", "create")} className="rounded-full border px-3 py-1.5">Create quote</button><button onClick={() => navigate("/quotes")} className="rounded-full border px-3 py-1.5">Open full quotes page</button></div></> : null}
      {activeSmartHubSection === "invoices" ? <><p>Ready to bill jobs: {completedReadyToBill.length} · Open invoices: {openInvoices.length} · Overdue: {overdueInvoices.length}</p><p>Draft invoices prepared: {derivedActions.filter((a) => a.kind === "create_invoice_draft").length}</p><div className="flex flex-wrap gap-2"><button onClick={() => openWorkspace("invoices", "create")} className="rounded-full border px-3 py-1.5">Create invoice</button><button onClick={() => navigate("/invoices")} className="rounded-full border px-3 py-1.5">Open full invoices page</button></div></> : null}
      {activeSmartHubSection === "crew" ? <><p>Active crew: {crewActive} / {workers.length}</p><p>Workers with no jobs: {workers.filter((w) => calcWorkerLoadToday(data.jobs, asId(w), today)===0).length} · Overloaded: {workers.filter((w) => calcWorkerLoadToday(data.jobs, asId(w), today)>4).length}</p><div className="flex flex-wrap gap-2"><button onClick={() => navigate("/team")} className="rounded-full border px-3 py-1.5">Open team page</button><button onClick={() => openWorkspace("dispatch")} className="rounded-full border px-3 py-1.5">Assign worker</button></div></> : null}
      {activeSmartHubSection === "payroll" ? <><p>Pay period summary proxy: approved hours from active crew status ({crewActive}). Pending timesheets should be reviewed in payroll workspace.</p><div className="flex flex-wrap gap-2"><button onClick={() => navigate("/payroll")} className="rounded-full border px-3 py-1.5">Open payroll</button><button onClick={() => navigate("/payroll")} className="rounded-full border px-3 py-1.5">Review timesheets</button></div></> : null}
      {activeSmartHubSection === "automation" ? <><p>Active automation rules and run history are managed in automation. Suggested automations: follow-up drafts and invoice reminders.</p><div className="flex flex-wrap gap-2"><button onClick={() => navigate("/automation")} className="rounded-full border px-3 py-1.5">Open automation</button></div></> : null}
      {activeSmartHubSection === "reports" ? <><p>Jobs completed: {completedReadyToBill.length} · Invoices open: {openInvoices.length} · Quotes waiting: {waitingQuotes.length} · Ready to bill: {completedReadyToBill.length}</p><div className="flex flex-wrap gap-2"><button onClick={() => navigate("/reports")} className="rounded-full border px-3 py-1.5">Open reports</button></div></> : null}
      {activeSmartHubSection === "communications" ? <><p>Quote follow-up drafts: {derivedActions.filter((a) => a.kind === "quote_follow_up").length} · Invoice reminder drafts: {derivedActions.filter((a) => a.kind === "invoice_reminder").length}</p><p>No messages are auto-sent without explicit confirmation.</p><div className="flex flex-wrap gap-2"><button onClick={() => navigate("/communications")} className="rounded-full border px-3 py-1.5">Open communications</button></div></> : null}
      {activeSmartHubSection === "approvals" ? <><p>Pending approvals: {approvals.length} · Rejected locally: {Object.values(localActionState).filter((v) => v === "rejected").length}</p><div className="space-y-2">{visibleActionCards.slice(0, 5).map((a) => <div key={a.id || a.title} className="rounded-lg border p-2"><p className="font-medium">{a.title}</p><div className="mt-1 flex flex-wrap gap-2"><button onClick={() => { setSelectedSmartHubAction(a); handleApproveAction(a); }} className="rounded-full border px-3 py-1">Approve</button><button onClick={() => handleEditAction(a)} className="rounded-full border px-3 py-1">Edit</button><button onClick={() => handleRejectAction(a)} className="rounded-full border px-3 py-1">Reject</button><button onClick={() => handleReviewAction(a)} className="rounded-full border px-3 py-1">View details</button></div></div>)}</div></> : null}
    </div>
  </SmartModal>
  <SmartModal open={createMenuOpen} title="Create" onClose={() => setCreateMenuOpen(false)}><div className="grid gap-2">{[["New job", "job"], ["New quote", "quote"], ["New invoice", "invoice"], ["Add client", "client"], ["Open dispatch", "dispatch"]].map(([l, k]) => <button key={k} onClick={() => { setCreateMenuOpen(false); setModal(k); }} className="rounded-lg border p-2 text-left">{l}</button>)}</div></SmartModal>
  <SmartModal open={Boolean(modal)} title="Command Action" onClose={() => setModal(null)}>{modal === "job" ? <JobCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create job" /> : null}{modal === "quote" ? <QuoteCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create quote" /> : null}{modal === "invoice" ? <InvoiceCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Create invoice" /> : null}{modal === "client" ? <ClientCreateForm onCancel={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} submitLabel="Add client" /> : null}{modal === "dispatch" ? <SmartHubDispatchPanel canManageDispatch={canSeeOwnerControls} onAssigned={() => load()} /> : null}{modal === "ask" ? <div className="space-y-3"><textarea value={askQuery} onChange={(e) => setAskQuery(e.target.value)} className="w-full rounded-xl border p-3" rows={3} /><button onClick={askAi} disabled={busy.ask} className="rounded-full bg-teal-700 text-white px-4 py-2 text-sm">{busy.ask ? "Generating…" : "Ask AI"}</button><div className="rounded-xl border p-3 text-sm min-h-16">{askResponse || "AI response will appear here."}</div></div> : null}</SmartModal>

  <SmartModal open={isActionModalOpen} wide title={String(selectedAction?.action_type || "").toLowerCase() === "create_invoice_draft" ? "Review invoice drafts" : (selectedAction?.title || "Action details")} onClose={() => setIsActionModalOpen(false)}>
    {String(selectedAction?.action_type || "").toLowerCase() === "create_invoice_draft" ? <div className="space-y-4 text-sm"> 
      <div className="rounded-2xl border border-slate-700/80 bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-slate-100"><p className="text-xl font-semibold">Review invoice drafts</p><p className="text-sm text-slate-300 mt-1">AI found {invoiceDraftRows.length} completed jobs ready to bill. Review the draft details before creating invoices.</p><p className="mt-2 text-xs text-emerald-200">Nothing is sent to customers until you approve sending.</p></div>
      <div className="grid gap-3 sm:grid-cols-4">{[["Ready to bill", invoiceDraftRows.length],["Drafts selected", Object.values(selectedDrafts).filter(Boolean).length],["Missing prices", invoiceDraftRows.filter((r)=>r.missingPrice).length],["Estimated total", fmtMoney(invoiceDraftRows.filter((r)=>!r.missingPrice).reduce((sum,r)=>sum+(Number.isFinite(r.total)?r.total:0),0))]].map(([k,v]) => <div key={k} className="rounded-xl border bg-[#f9f6ef] p-3"><p className="text-xs uppercase text-slate-500">{k}</p><p className="text-base font-semibold">{v}</p></div>)}</div>
      {reviewMode === "list" ? <div className="space-y-3">{invoiceDraftRows.map((row) => <div key={row.jobId} className="rounded-2xl border border-slate-200 bg-[#fdfaf4] p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-lg font-semibold text-slate-900">{row.job.title || row.job.name || "Completed job"}</p><label className="text-xs flex items-center gap-1"><input type="checkbox" checked={Boolean(selectedDrafts[row.jobId])} onChange={(e)=>setSelectedDrafts((s)=>({...s,[row.jobId]:e.target.checked}))}/>Select</label></div><p className="mt-1 text-slate-700">{row.clientName}</p><p className="text-xs text-slate-500">{row.job.address || row.job.job_address || "No address saved"} · Completed: {fmtDateTime(row.job.completed_at || row.job.completed_date || row.job.updated_at)} · Status: {textOr(row.job.status, "completed")}</p><textarea className="mt-3 w-full rounded-xl border p-3" rows={3} value={draftDescriptions[row.jobId] || ""} onChange={(e)=>setDraftDescriptions((s)=>({...s,[row.jobId]:e.target.value}))} />
      <div className="mt-3 grid gap-2 sm:grid-cols-4"><div><p className="text-xs text-slate-500">Pricing type</p><p>{textOr(row.job.pricing_type || row.job.price_type, "Standard")}</p></div><div><p className="text-xs text-slate-500">Subtotal</p><p>{fmtMoney(row.subtotal)}</p></div><div><p className="text-xs text-slate-500">GST</p><p>{fmtMoney(row.gst)}</p></div><div><p className="text-xs text-slate-500">Total</p><p className="font-semibold">{fmtMoney(row.total)}</p></div></div>
      {row.missingPrice ? <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">Missing price — add price before creating invoice.</div> : null}
      <div className="mt-3 flex flex-wrap gap-2"><button disabled={row.missingPrice || draftApprovalState[row.jobId]==='approved'} onClick={async()=>{await approveDraftInvoice(row);toast.success('Draft invoice created');await load();}} className="rounded-full bg-teal-700 px-3 py-1.5 text-white disabled:opacity-50">{draftApprovalState[row.jobId]==='approved'?'Approved':'Approve draft'}</button><button onClick={()=>openReviewJobEdit(row)} className="rounded-full border px-3 py-1.5">Edit details</button><button onClick={()=>setSelectedDrafts((s)=>({...s,[row.jobId]:false}))} className="rounded-full border px-3 py-1.5">Reject</button><button onClick={()=>openReviewJobDetail(row)} className="rounded-full border px-3 py-1.5">Open job</button></div></div>)}</div> : null}
      {reviewMode === "jobDetail" && selectedReviewItem ? <div className="rounded-2xl border bg-[#fdfaf4] p-4 space-y-2"><p className="text-lg font-semibold">{selectedReviewItem.job.title || selectedReviewItem.job.name || "Job detail"}</p><p>Client: {selectedReviewItem.clientName}</p><p>Address: {selectedReviewItem.job.address || selectedReviewItem.job.job_address || "n/a"}</p><p>Status: {textOr(selectedReviewItem.job.status, "completed")}</p><p>Scheduled: {fmtDateTime(selectedReviewItem.job.scheduled_date || selectedReviewItem.job.date)}</p><p>Assigned worker: {textOr(workers.find((w) => sameId(asId(w), selectedReviewItem.job.assigned_worker_id || selectedReviewItem.job.worker_id))?.name, "Unassigned")}</p><p>Notes: {textOr(selectedReviewItem.job.notes || selectedReviewItem.job.description, "n/a")}</p><p>Completion notes: {textOr(selectedReviewItem.job.completion_notes || selectedReviewItem.job.worker_completion_notes, "n/a")}</p><div className="flex flex-wrap gap-2 pt-2"><button onClick={() => openReviewJobEdit(selectedReviewItem)} className="rounded-full bg-teal-700 px-3 py-1.5 text-white">Edit details</button><button onClick={() => setReviewMode("list")} className="rounded-full border px-3 py-1.5">Back to drafts</button><button onClick={() => navigate(`/jobs/${selectedReviewItem.jobId}`)} className="rounded-full border px-3 py-1.5">Open full job page</button></div></div> : null}
      {reviewMode === "jobEdit" && selectedReviewItem && reviewEditForm ? <div className="rounded-2xl border bg-[#fdfaf4] p-4 space-y-3"><p className="text-lg font-semibold">Edit job details</p><input className="w-full rounded-lg border p-2" value={reviewEditForm.title} onChange={(e)=>setReviewEditForm((s)=>({...s,title:e.target.value}))} placeholder="Job title" /><input className="w-full rounded-lg border p-2" value={reviewEditForm.address} onChange={(e)=>setReviewEditForm((s)=>({...s,address:e.target.value}))} placeholder="Address" /><input type="datetime-local" className="w-full rounded-lg border p-2" value={String(reviewEditForm.scheduled_date || "").slice(0,16)} onChange={(e)=>setReviewEditForm((s)=>({...s,scheduled_date:e.target.value}))} /><select className="w-full rounded-lg border p-2" value={reviewEditForm.assigned_worker_id} onChange={(e)=>setReviewEditForm((s)=>({...s,assigned_worker_id:e.target.value}))}><option value="">Unassigned</option>{workers.map((w)=><option key={asId(w)} value={asId(w)}>{w.name || w.email}</option>)}</select><div className="grid gap-2 sm:grid-cols-2"><input className="rounded-lg border p-2" value={reviewEditForm.pricing_type} onChange={(e)=>setReviewEditForm((s)=>({...s,pricing_type:e.target.value}))} placeholder="Pricing type" /><input type="number" className="rounded-lg border p-2" value={reviewEditForm.subtotal} onChange={(e)=>setReviewEditForm((s)=>({...s,subtotal:e.target.value}))} placeholder="Subtotal" /></div><input type="number" className="w-full rounded-lg border p-2" value={reviewEditForm.gst} onChange={(e)=>setReviewEditForm((s)=>({...s,gst:e.target.value}))} placeholder="GST" /><textarea className="w-full rounded-lg border p-2" rows={3} value={reviewEditForm.invoice_description_draft} onChange={(e)=>setReviewEditForm((s)=>({...s,invoice_description_draft:e.target.value}))} placeholder="Invoice description draft" /><div className="flex flex-wrap gap-2"><button onClick={saveReviewJobEdit} className="rounded-full bg-teal-700 px-3 py-1.5 text-white">Save changes</button><button onClick={() => setReviewMode("list")} className="rounded-full border px-3 py-1.5">Back to drafts</button><button onClick={() => navigate(`/jobs/${selectedReviewItem.jobId}/edit`)} className="rounded-full border px-3 py-1.5">Open full edit page</button></div></div> : null}
      <div className="sticky bottom-0 bg-white/95 border-t pt-3 flex flex-wrap gap-2"><button onClick={async()=>{const rows=invoiceDraftRows.filter((r)=>selectedDrafts[r.jobId] && !r.missingPrice);const skipped=invoiceDraftRows.filter((r)=>selectedDrafts[r.jobId] && r.missingPrice).length;let created=0;for (const r of rows){await approveDraftInvoice(r);created++;} await load(); toast.success(`${created} draft invoices created.${skipped?` ${skipped} need missing prices.`:''}`);}} className="rounded-full bg-teal-700 px-4 py-2 text-white">Approve selected</button><button onClick={async()=>{const rows=invoiceDraftRows.filter((r)=>!r.missingPrice);const skipped=invoiceDraftRows.filter((r)=>r.missingPrice).length;let created=0;for (const r of rows){await approveDraftInvoice(r);created++;} await load(); toast.success(`${created} draft invoices created.${skipped?` ${skipped} need missing prices.`:''}`);}} className="rounded-full border px-4 py-2">Approve all ready drafts</button><button onClick={()=>setSelectedDrafts({})} className="rounded-full border px-4 py-2">Reject selected</button><button onClick={()=>setIsActionModalOpen(false)} className="rounded-full border px-4 py-2">Close</button></div>
    </div> : String(selectedAction?.action_type || "").toLowerCase() === "invoice_reminder" ? <div className="space-y-4 text-sm"><div className="rounded-2xl border border-slate-700/80 bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-slate-100"><p className="text-xl font-semibold">Review payment reminders</p><p className="text-sm text-slate-300 mt-1">AI found {openInvoices.length} open invoices. Review reminder drafts before sending or saving.</p><p className="mt-2 text-xs text-emerald-200">No reminders are sent until you approve sending.</p></div><div className="grid gap-3 sm:grid-cols-4">{[["Open invoices", reminderRows.length],["Drafts selected", Object.values(selectedReminderDrafts).filter(Boolean).length],["Missing contacts", reminderRows.filter((r)=>r.missingContact).length],["Total outstanding", fmtMoney(reminderRows.reduce((s,r)=>s+r.amount,0))]].map(([k,v]) => <div key={k} className="rounded-xl border bg-[#f9f6ef] p-3"><p className="text-xs uppercase text-slate-500">{k}</p><p className="text-base font-semibold">{v}</p></div>)}</div>{reminderRows.map((row)=><div key={row.id} className="rounded-2xl border p-4"><div className="flex justify-between"><p className="font-semibold">{textOr(row.client?.name,"Unknown client")} · {textOr(row.inv.number||row.inv.title,"Invoice")}</p><input type="checkbox" checked={Boolean(selectedReminderDrafts[row.id])} onChange={(e)=>setSelectedReminderDrafts((s)=>({...s,[row.id]:e.target.checked}))}/></div><p className="text-xs text-slate-500">{textOr(row.inv.status,"open")} · Due {fmtDateTime(row.inv.due_date)} {row.overdueDays?`· ${row.overdueDays} days overdue`:""}</p><p className="text-xs">{row.client?.email || "No email"} · {row.client?.phone || "No phone"}</p>{row.missingContact?<div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">Missing contact details — add client contact before sending.</div>:null}<textarea className="mt-2 w-full rounded-lg border p-2" rows={3} value={row.message} onChange={(e)=>setReminderMessages((s)=>({...s,[row.id]:e.target.value}))}/></div>)}<div className="sticky bottom-0 bg-white/95 border-t pt-3 flex gap-2"><button className="rounded-full bg-teal-700 px-4 py-2 text-white" onClick={async()=>{const rows=reminderRows.filter((r)=>selectedReminderDrafts[r.id]);await approveReminderDrafts(rows);}}>Approve selected</button><button className="rounded-full border px-4 py-2" onClick={async()=>{await approveReminderDrafts(reminderRows);}}>Approve all ready reminders</button><button className="rounded-full border px-4 py-2" onClick={()=>setSelectedReminderDrafts({})}>Reject selected</button></div></div> : String(selectedAction?.action_type || "").toLowerCase() === "quote_follow_up" ? <div className="space-y-4 text-sm"><div className="rounded-2xl border border-slate-700/80 bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-slate-100"><p className="text-xl font-semibold">Review quote follow-ups</p><p className="text-sm text-slate-300 mt-1">AI found {waitingQuotes.length} quotes waiting for client response.</p></div><div className="grid gap-3 sm:grid-cols-4">{[["Waiting quotes", quoteFollowupRows.length],["Drafts selected", Object.values(selectedQuoteDrafts).filter(Boolean).length],["Missing contacts", quoteFollowupRows.filter((r)=>r.missingContact).length],["Estimated pipeline", fmtMoney(quoteFollowupRows.reduce((s,r)=>s+r.amount,0))]].map(([k,v])=><div key={k} className="rounded-xl border bg-[#f9f6ef] p-3"><p className="text-xs uppercase text-slate-500">{k}</p><p className="text-base font-semibold">{v}</p></div>)}</div>{quoteFollowupRows.map((row)=><div key={row.id} className="rounded-2xl border p-4"><div className="flex justify-between"><p className="font-semibold">{textOr(row.client?.name,"Unknown client")} · {textOr(row.q.number||row.q.title,"Quote")}</p><input type="checkbox" checked={Boolean(selectedQuoteDrafts[row.id])} onChange={(e)=>setSelectedQuoteDrafts((s)=>({...s,[row.id]:e.target.checked}))}/></div><p className="text-xs text-slate-500">{textOr(row.q.status,"sent")} · Created {fmtDateTime(row.q.created_at)} {row.ageDays?`· ${row.ageDays} days ago`:""}</p><p className="text-xs">{row.client?.email || "No email"} · {row.client?.phone || "No phone"}</p>{row.missingContact?<div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">Missing contact details — add client contact before sending.</div>:null}<textarea className="mt-2 w-full rounded-lg border p-2" rows={3} value={row.message} onChange={(e)=>setQuoteMessages((s)=>({...s,[row.id]:e.target.value}))}/></div>)}<div className="sticky bottom-0 bg-white/95 border-t pt-3 flex gap-2"><button className="rounded-full bg-teal-700 px-4 py-2 text-white" onClick={async()=>{const rows=quoteFollowupRows.filter((r)=>selectedQuoteDrafts[r.id]);await approveQuoteFollowupDrafts(rows);}}>Approve selected</button><button className="rounded-full border px-4 py-2" onClick={async()=>{await approveQuoteFollowupDrafts(quoteFollowupRows);}}>Approve all ready follow-ups</button><button className="rounded-full border px-4 py-2" onClick={()=>setSelectedQuoteDrafts({})}>Reject selected</button></div></div> : selectedAction && actionDetails ? <div className="space-y-3 text-sm">
      <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">Recommended action</p><p className="font-semibold mt-1">{actionDetails.recommendedAction}</p></div>
      <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">Why AI chose this</p><p className="mt-1">{actionDetails.whyAi}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">Job details</p>{actionDetails.jobDetails.map(([k,v]) => <p key={k} className="mt-1"><span className="font-semibold">{k}:</span> {v}</p>)}</div>
        <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">Worker match / source details</p>{actionDetails.workerDetails.map(([k,v]) => <p key={k} className="mt-1"><span className="font-semibold">{k}:</span> {v}</p>)}</div>
      </div>
      <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">What happens when approved</p><ul className="list-disc pl-5 mt-1">{actionDetails.impact.map((i) => <li key={i}>{i}</li>)}</ul></div>
      {editedWorkerId ? <div className="rounded-xl border p-3"><p className="text-xs uppercase text-slate-500">Edit recommendation</p><select className="mt-2 w-full rounded-lg border p-2" value={editedWorkerId} onChange={(e) => setEditedWorkerId(e.target.value)}>{workers.map((w) => <option key={asId(w)} value={asId(w)}>{w.name || w.email || asId(w)}</option>)}</select></div> : null}
      {actionError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">{actionError}</div> : null}
      <div className="flex flex-wrap gap-2 pt-2"><button onClick={() => handleApproveAction(selectedAction)} className="rounded-full bg-teal-700 text-white px-3 py-1.5">Approve</button><button onClick={() => handleEditAction(selectedAction)} className="rounded-full border px-3 py-1.5">Edit recommendation</button><button onClick={() => handleRejectAction(selectedAction)} className="rounded-full border px-3 py-1.5">Reject</button><button onClick={() => navigate(actionDetails.links?.job || selectedAction.nav || "/dashboard")} className="rounded-full border px-3 py-1.5">Open job</button>{actionDetails.links?.worker ? <button onClick={() => navigate(actionDetails.links.worker)} className="rounded-full border px-3 py-1.5">Open worker profile</button> : null}</div>
    </div> : null}
  </SmartModal>
  </Layout></>);
}
