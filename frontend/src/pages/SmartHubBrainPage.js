import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { get, patch, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { buildArrivalSmsMessage, buildInvoiceDescription, buildInvoiceReminderMessage, buildJobUpdateMessage, buildQuoteFollowUpMessage } from "../lib/aiMessageBuilders";
import "../styles/smartHubHardTrade.css";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const listFrom = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  const src = value?.data ?? value;
  if (Array.isArray(src)) return src;
  if (src && typeof src === "object") {
    for (const key of keys) {
      if (Array.isArray(src?.[key])) return src[key];
    }
    if (Array.isArray(src?.items)) return src.items;
  }
  return [];
};

const statusOf = (value) => String(value || "").toLowerCase().trim();
const ACTIVE_ACTION_STATUSES = ["pending", "ready", "draft", "drafts", "watching", "needs_decision"];
const DONE_ACTION_STATUSES = ["completed", "approved", "rejected", "dismissed", "resolved", "archived"];
const isActiveApproval = (item = {}) => {
  const status = statusOf(item?.status);
  return ACTIVE_ACTION_STATUSES.includes(status) && !DONE_ACTION_STATUSES.includes(status);
};
const norm = (value) => String(value || "").toLowerCase().trim();
const asDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
};

const money = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, { style: "currency", currency: "AUD" });
};

const REMINDER_ELIGIBLE = ["open", "sent", "unpaid", "overdue", "pending_payment"];
const REMINDER_EXCLUDED = ["paid", "cancelled", "canceled"];

const invoiceBalance = (inv) => {
  const candidates = [inv?.balance_due, inv?.amount_due, inv?.total_due, inv?.total, inv?.amount];
  const picked = candidates.map((v) => Number(v)).find((v) => Number.isFinite(v));
  return Number.isFinite(picked) ? picked : NaN;
};

const daysOverdue = (inv) => {
  const explicit = Number(inv?.overdue_days ?? inv?.days_overdue);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const dueDate = inv?.due_date || inv?.dueDate;
  if (!dueDate) return null;
  const ms = Date.now() - new Date(dueDate).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const QUOTE_FOLLOW_UP_ELIGIBLE = ["sent", "pending", "waiting", "awaiting_response", "viewed"];
const QUOTE_FOLLOW_UP_EXCLUDED = ["accepted", "declined", "rejected", "converted", "invoiced", "cancelled", "canceled", "draft"];

const quoteAgeDays = (quote) => {
  const source = quote?.sent_at || quote?.sentAt || quote?.created_at || quote?.createdAt || quote?.date;
  if (!source) return null;
  const ms = Date.now() - new Date(source).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};


const safeText = (value, fallback = "Not available") => {
  const text = String(value || "").trim();
  return text || fallback;
};

const textOr = safeText;

const findByIds = (list, ids, keys = ["id", "_id"]) => {
  const wanted = safeArray(ids).map((v) => String(v || "")).filter(Boolean);
  if (!wanted.length) return null;
  return safeArray(list).find((item) => keys.some((key) => wanted.includes(String(item?.[key] || "")))) || null;
};

const hasInvoiceForJob = (job, invoices) => {
  const jobIds = [job?.id, job?._id, job?.job_id].map((id) => String(id || "")).filter(Boolean);
  if (!jobIds.length) return false;
  return safeArray(invoices).some((inv) => {
    const linked = [inv?.job_id, inv?.jobId, inv?.linked_job_id, inv?.source_job_id].map((id) => String(id || "")).filter(Boolean);
    return linked.some((id) => jobIds.includes(id));
  });
};



const APPROVAL_GROUPS = ["all", "needs_decision", "ready", "drafts", "watching", "completed"];
const getApprovalGroup = (action = {}) => {
  const group = String(action.group || "").toLowerCase();
  if (APPROVAL_GROUPS.includes(group) && group !== "all") return group;
  const status = String(action.status || "").toLowerCase();
  if (["completed", "approved", "done"].includes(status)) return "completed";
  if (["draft", "edited"].includes(status)) return "drafts";
  if (status === "ready") return "ready";
  if (status === "watching") return "watching";
  return "needs_decision";
};
const normalizeApprovalAction = (action = {}) => ({ ...action, id: String(action.id || action._id || ""), group: getApprovalGroup(action) });
const getFilteredApprovalActions = (actions = [], activeTab = "all") => safeArray(actions).filter((a) => {
  if (activeTab === "all") return isActiveApproval(a);
  if (activeTab === "completed") return DONE_ACTION_STATUSES.includes(statusOf(a?.status));
  return isActiveApproval(a) && a.group === activeTab;
});
const approvalDedupKey = (action = {}) => {
  const actionKey = String(action.action_key || action.actionKey || "").trim();
  if (actionKey) return actionKey;
  const type = String(action.type || "unknown");
  const rel = String(action.relatedId || action.related_id || action.related_entity_id || action.invoice_id || action.job_id || action.quote_id || action.client_id || "");
  return `${type}:${rel}`;
};

const dedupeApprovalActions = (actions = []) => {
  const map = new Map();
  safeArray(actions).forEach((item) => {
    const key = approvalDedupKey(item);
    if (!key) return;
    if (!map.has(key)) { map.set(key, item); return; }
    const prev = map.get(key);
    if (statusOf(prev?.status) === 'completed' && statusOf(item?.status) !== 'completed') map.set(key, item);
  });
  return Array.from(map.values());
};
const getBestNextMove = ({ readyToBillCount = 0, unassignedJobsCount = 0, openInvoicesCount = 0, quotesWaitingCount = 0, pendingApprovalActions = [] } = {}) => {
  const pending = safeArray(pendingApprovalActions).filter((item) => isActiveApproval(item));
  const highRiskDecisionCount = pending.filter((item) => item.group === "needs_decision" && String(item?.risk || "").toLowerCase() === "high").length;
  if (highRiskDecisionCount > 0) return { key: "needs_decision", label: `Review ${highRiskDecisionCount} high-risk approval${highRiskDecisionCount === 1 ? "" : "s"} now.`, approvalTab: "needs_decision" };
  if (unassignedJobsCount > 0) return { key: "assign_workers", label: `Assign crew to ${unassignedJobsCount} unassigned job${unassignedJobsCount === 1 ? "" : "s"}.`, drawer: "AI Dispatch", mode: "assign", approvalTab: "ready" };
  if (readyToBillCount > 0) return { key: "invoice_drafts", label: `Create draft invoices for ${readyToBillCount} ready-to-bill job${readyToBillCount === 1 ? "" : "s"}.`, drawer: "Invoices", mode: "readyToBill", approvalTab: "ready" };
  if (openInvoicesCount > 0) return { key: "invoice_reminders", label: `Prepare reminders for ${openInvoicesCount} open invoice${openInvoicesCount === 1 ? "" : "s"}.`, drawer: "Payment Reminders", mode: "reminders", approvalTab: "drafts" };
  if (quotesWaitingCount > 0) return { key: "quote_followups", label: `Review follow-ups for ${quotesWaitingCount} waiting quote${quotesWaitingCount === 1 ? "" : "s"}.`, drawer: "Quote Follow-ups", mode: "followUps", approvalTab: "drafts" };
  return { key: "all_clear", label: "All clear — no urgent actions in Smart Hub.", drawer: "Dashboard", mode: "list", approvalTab: "all" };
};
const getActionDisplayMeta = (item = {}, { jobs = [], clients = [], invoices = [], quotes = [], workers = [] } = {}) => {
  const payload = item?.actionPayload || {};
  const relatedId = String(item?.relatedId || item?.related_id || item?.related_entity_id || "");
  const actionType = String(item?.type || item?.action_type || "").toLowerCase();
  const invoice = item?.invoice || findByIds(invoices, [item?.invoice_id, payload?.invoice_id, relatedId], ["id", "_id", "invoice_id"]);
  const quote = item?.quote || findByIds(quotes, [item?.quote_id, payload?.quote_id, relatedId], ["id", "_id", "quote_id"]);
  const job = item?.job || findByIds(jobs, [item?.job_id, payload?.job_id, relatedId], ["id", "_id", "job_id"]);
  const worker = item?.worker || findByIds(workers, [item?.worker_id, payload?.worker_id, payload?.recommended_worker_id, job?.assigned_worker_id], ["id", "_id", "worker_id"]);
  const client = item?.client || findByIds(clients, [item?.client_id, payload?.client_id, invoice?.client_id, quote?.client_id, job?.client_id], ["id", "_id", "client_id"]);
  const clientName = textOr(client?.name || invoice?.client_name || quote?.client_name || job?.client_name, "No client linked");
  if (actionType === "invoice_reminder") {
    const hasClient = !!String(client?.name || invoice?.client_name || "").trim();
    const invoiceLabel = textOr(invoice?.invoice_number || invoice?.number, "Open invoice");
    const subtitle = `${hasClient ? `Invoice ${invoiceLabel}` : "Open invoice"} · ${money(invoiceBalance(invoice))} outstanding`;
    return { title: hasClient ? `Prepare reminder for ${clientName}` : "Prepare reminder for invoice with missing client", subtitle, reason: item.reason || "Invoice is unpaid and ready for reminder review.", dataUsed: item.dataUsed || `Due: ${textOr(invoice?.due_date || invoice?.dueDate, "No due date")} · Phone: ${client?.phone || invoice?.client_phone ? "saved" : "No phone saved"} · Email: ${client?.email || invoice?.client_email ? "saved" : "No email saved"}`, whatHappens: item.whatHappens || "Approval sends the reminder via selected channel.", risk: item.risk || "medium", status: item.status || "pending", contactSummary: `Phone: ${client?.phone || invoice?.client_phone || "No phone saved"} · Email: ${client?.email || invoice?.client_email || "No email saved"}` };
  }
  if (actionType === "quote_follow_up") {
    return { title: `Follow up quote with ${clientName}`, subtitle: `Quote ${textOr(quote?.quote_number || quote?.number || quote?.title, "No quote number")} · ${money(quote?.total ?? quote?.amount)} · ${textOr(quote?.status, "unknown")}`, reason: item.reason || "Quote is waiting for a client response.", dataUsed: item.dataUsed || `Phone: ${client?.phone ? "saved" : "No phone saved"} · Email: ${client?.email ? "saved" : "No email saved"}`, whatHappens: item.whatHappens || "Approval saves and/or sends the follow-up draft.", risk: item.risk || "low", status: item.status || "pending" };
  }
  if (actionType === "create_invoice_draft") {
    return { title: `Create draft invoice for ${textOr(job?.title || clientName, "No client linked")}`, subtitle: `${clientName} · ${textOr(job?.address || job?.location, "No address saved")} · Total ${money(job?.total ?? payload?.subtotal ?? job?.subtotal)}`, reason: item.reason || "Completed work is ready for billing.", dataUsed: item.dataUsed || "Using job completion details and saved pricing.", whatHappens: item.whatHappens || "Creates draft invoice only.", risk: item.risk || "medium", status: item.status || "pending" };
  }
  if (actionType === "assign_worker") {
    return { title: `Assign ${textOr(worker?.name, "No worker selected")} to ${textOr(job?.title, "job")}`, subtitle: `${clientName} · ${textOr(job?.address || job?.location, "No address saved")} · Workload ${payload?.jobsToday ?? 0} jobs today`, reason: item.reason || "Worker assignment needs approval.", dataUsed: item.dataUsed || "Recommendation uses worker load and availability.", whatHappens: item.whatHappens || "Updates job assignment.", risk: item.risk || "medium", status: item.status || "pending" };
  }
  if (actionType === "job_arrival_sms") {
    return { title: `Send arrival SMS to ${clientName}`, subtitle: `${textOr(job?.title, "job")} · ${textOr(job?.scheduled_date || job?.scheduled_at, "No scheduled time")} · Worker ${textOr(worker?.name, "No worker selected")}`, reason: item.reason || "Arrival notification is due.", dataUsed: item.dataUsed || `Phone: ${client?.phone || payload?.to_phone || "No phone saved"}`, whatHappens: item.whatHappens || "Sends a 30-minute arrival SMS.", risk: item.risk || "low", status: item.status || "pending", contactSummary: `SMS to ${client?.phone || payload?.to_phone || "No phone saved"}` };
  }
  return { title: item.title || "Approval action", subtitle: item.dataUsed || "", reason: item.reason || "Review this action.", dataUsed: item.dataUsed || "", whatHappens: item.whatHappens || "No further change.", risk: item.risk || "medium", status: item.status || "pending" };
};

const buildSmartHubApprovalItems = ({ jobs, clients, invoices, quotes, workers, activity, dispatchRecs, reminderDrafts, quoteDrafts }) => {
  const items = [];
  safeArray(jobs).forEach((job) => {
    const id = String(job?.id || job?._id || "");
    const client = findByIds(clients, [job?.client_id, job?.clientId], ["id", "_id", "client_id"]);
    const subtotal = Number(job?.subtotal ?? job?.price ?? job?.amount);
    if (["completed", "complete"].includes(statusOf(job?.status)) && !hasInvoiceForJob(job, invoices) && !job?.invoice_id && !job?.draft_invoice_id) {
      items.push({ id: `invoice-${id}`, type: Number.isFinite(subtotal) ? "create_invoice_draft" : "missing_price", group: Number.isFinite(subtotal) ? "ready" : "needs_decision", title: `Create draft invoice for ${textOr(client?.name || job?.title, "client")}`, reason: Number.isFinite(subtotal) ? "Job is completed and has pricing saved." : "Job is completed but pricing is missing.", dataUsed: `Client: ${textOr(client?.name, "Unknown")} • Address: ${textOr(job?.address || job?.location, "Not available")} • Subtotal: ${money(subtotal)}`, whatHappens: Number.isFinite(subtotal) ? "Churvox creates an editable draft invoice. Nothing is sent to the customer." : "Open pricing editor in Smart Hub. Nothing is invoiced until price is saved and approved.", risk: Number.isFinite(subtotal) ? "medium" : "high", status: "pending", relatedType: "job", relatedId: id, client, job, actionPayload: { job_id: id } });
    }
  });
  safeArray(dispatchRecs).forEach((rec) => {
    const jobId = String(rec?.job?.id || rec?.job?._id || "");
    if (!jobId) return;
    items.push({ id: `assign-${jobId}`, type: rec?.recommendation?.conflict ? "schedule_conflict" : "assign_worker", group: rec?.recommendation?.conflict ? "needs_decision" : "ready", title: `Assign ${textOr(rec?.recommendation?.worker?.name, "worker")} to ${textOr(rec?.job?.title, "job")}`, reason: rec?.recommendation?.conflict ? "Possible schedule conflict detected." : "Recommended worker is available and best fit.", dataUsed: `Worker load today: ${rec?.recommendation?.stats?.today ?? 0} • Region match: ${rec?.recommendation?.regionMatch ? "yes" : "no"} • Conflict: ${rec?.recommendation?.conflict ? "yes" : "none"}` , whatHappens: "Churvox assigns the worker and updates the job to assigned.", risk: rec?.recommendation?.conflict ? "high" : "low", status: "pending", relatedType: "job", relatedId: jobId, job: rec?.job, worker: rec?.recommendation?.worker, actionPayload: { job_id: jobId, worker_id: rec?.selectedWorkerId } });
  });
  safeArray(invoices).filter((inv)=>REMINDER_ELIGIBLE.includes(statusOf(inv?.status)) && !REMINDER_EXCLUDED.includes(statusOf(inv?.status))).forEach((inv)=>{ const id=String(inv?.id||inv?._id||""); const client=findByIds(clients,[inv?.client_id,inv?.clientId],["id","_id","client_id"]); const clientName=textOr(client?.name||inv?.client_name,"No client linked"); const invoiceLabel=textOr(inv?.invoice_number||inv?.number,"Open invoice"); const hasClient=!!String(client?.name||inv?.client_name||"").trim(); items.push({id:`reminder-${id}`,type:"invoice_reminder",group:"drafts",title:hasClient?`Prepare reminder for ${clientName}`:"Prepare reminder for invoice with missing client",reason:"Invoice is open/unpaid.",dataUsed:`Invoice ${invoiceLabel} • Amount due: ${money(invoiceBalance(inv))} • Status: ${textOr(inv?.status)}`,whatHappens:"Saves a reminder draft only. No message is sent.",risk:"low",status:"pending",relatedType:"invoice",relatedId:id,invoice:inv,client,actionPayload:{invoice_id:id,message:reminderDrafts?.[id]||""}}) });
  safeArray(quotes).filter((q)=>QUOTE_FOLLOW_UP_ELIGIBLE.includes(statusOf(q?.status))).forEach((q)=>{ const id=String(q?.id||q?._id||""); items.push({id:`quote-${id}`,type:"quote_follow_up",group:"drafts",title:`Prepare quote follow-up for ${textOr(q?.quote_number||q?.title,id)}`,reason:"Quote is waiting for response.",dataUsed:`Status: ${textOr(q?.status)} • Age: ${quoteAgeDays(q) ?? "—"} days`,whatHappens:"Saves a follow-up draft only. No message is sent.",risk:"low",status:"pending",relatedType:"quote",relatedId:id,quote:q,actionPayload:{quote_id:id,message:quoteDrafts?.[id]||""}}) });
  safeArray(activity).filter((a)=>statusOf(a?.status)==='completed').slice(0,5).forEach((a)=>items.push({id:`activity-${a?.id||a?._id}`,type:"info",group:"completed",title:textOr(a?.title,"Completed action"),reason:textOr(a?.message,"Completed in Smart Hub."),dataUsed:"Recorded in Smart Hub activity",whatHappens:"No further action.",risk:"low",status:"completed",relatedType:a?.related_type,relatedId:String(a?.related_id||"")}));
  return items;
};
export default function SmartHubBrainPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspaceDrawer, setWorkspaceDrawer] = useState("");
  const [workspaceMode, setWorkspaceMode] = useState("list");
  const [workspaceRecord, setWorkspaceRecord] = useState(null);
  const [workspaceEditForm, setWorkspaceEditForm] = useState({});
  const [clientSearch, setClientSearch] = useState("");
  const [savingJobId, setSavingJobId] = useState("");
  const [toast, setToast] = useState({ kind: "", message: "" });
  const [data, setData] = useState({ jobs: [], clients: [], quotes: [], invoices: [], workers: [] });
  const [reminderDrafts, setReminderDrafts] = useState({});
  const [editingDraft, setEditingDraft] = useState({});
  const [selectedReminderIds, setSelectedReminderIds] = useState([]);
  const [approvedReminderIds, setApprovedReminderIds] = useState({});
  const [quoteDrafts, setQuoteDrafts] = useState({});
  const [quoteDraftOriginals, setQuoteDraftOriginals] = useState({});
  const [editingQuoteDraft, setEditingQuoteDraft] = useState({});
  const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);
  const [approvedQuoteIds, setApprovedQuoteIds] = useState({});
  const [activity, setActivity] = useState([]);
  const [activityFilter, setActivityFilter] = useState("all");
  const [dispatchOverrides, setDispatchOverrides] = useState({});
  const [rejectedDispatchIds, setRejectedDispatchIds] = useState({});
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [approvalDetail, setApprovalDetail] = useState(null);
  const [approvalCentreOpen, setApprovalCentreOpen] = useState(false);
  const [operatorActions, setOperatorActions] = useState([]);
  const [selectedApprovalIds, setSelectedApprovalIds] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState({});
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const defaultAiSettings = { ai_operator_enabled: true, auto_arrival_sms_enabled: false, arrival_sms_mode: "approval_required", arrival_sms_minutes_before: 30, invoice_reminder_mode: "draft_only", quote_followup_mode: "draft_only", worker_assignment_mode: "approval_required", accounting_changes_locked: true, payroll_changes_locked: true };
  const [aiSettings, setAiSettings] = useState(defaultAiSettings);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const safeGet = async (path) => {
      try {
        return await get(path);
      } catch {
        return [];
      }
    };

    try {
      const [jobsRes, clientsRes, quotesRes, invoicesRes, workersRes, activityRes, actionsRes, settingsRes] = await Promise.all([
        safeGet("/jobs"),
        safeGet("/clients"),
        safeGet("/quotes"),
        safeGet("/invoices"),
        safeGet("/team/workers"),
        safeGet("/smart-hub/activity"),
        safeGet("/ai-operator/actions"),
        safeGet("/api/ai-operator/settings"),
      ]);

      setData({
        jobs: listFrom(jobsRes, ["jobs"]),
        clients: listFrom(clientsRes, ["clients"]),
        quotes: listFrom(quotesRes, ["quotes"]),
        invoices: listFrom(invoicesRes, ["invoices"]),
        workers: listFrom(workersRes, ["workers"]),
      });
      setActivity(listFrom(activityRes, ["activities"]));
      setOperatorActions(listFrom(actionsRes, ["actions"]));
      if (settingsRes && typeof settingsRes === "object") setAiSettings((prev) => ({ ...prev, ...settingsRes }));
    } catch {
      setError("Failed to load Smart Hub data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!approvalCentreOpen) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [approvalCentreOpen]);

  const jobs = safeArray(data?.jobs);
  const clients = safeArray(data?.clients);
  const quotes = safeArray(data?.quotes);
  const invoices = safeArray(data?.invoices);
  const workers = safeArray(data?.workers);

  const readyToBillJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const invoiceStatus = statusOf(job?.invoice_status);
        const hasJobInvoiceFlag =
          !!(job?.invoice_id || job?.draft_invoice_id || job?.invoice_created || job?.invoiced) ||
          ["draft", "sent", "paid", "open", "overdue"].includes(invoiceStatus);
        return ["completed", "complete"].includes(statusOf(job?.status)) && !hasJobInvoiceFlag && !hasInvoiceForJob(job, invoices);
      }),
    [jobs, invoices]
  );

  const unassignedJobs = useMemo(() => jobs.filter((job) => {
    const st = statusOf(job?.status);
    if (["completed", "complete", "cancelled", "canceled", "archived"].includes(st)) return false;
    if ((st === "assigned" || st === "in_progress") && (job?.assigned_worker_id || job?.worker_id || job?.assigned_worker)) return false;
    return !(job?.assigned_worker_id || job?.worker_id || job?.assigned_worker);
  }), [jobs]);

  const workerJobStats = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      const wid = String(j?.assigned_worker_id || j?.worker_id || "").trim();
      if (!wid) return;
      const st = statusOf(j?.status);
      if (!map[wid]) map[wid] = { today: 0, active: 0, jobs: [] };
      const sched = asDate(j?.scheduled_date || j?.date || j?.scheduled_at);
      if (sched && sched.toDateString() === new Date().toDateString()) map[wid].today += 1;
      if (!["completed", "complete", "cancelled", "canceled", "archived"].includes(st)) map[wid].active += 1;
      map[wid].jobs.push(j);
    });
    return map;
  }, [jobs]);

  const dispatchRecs = useMemo(() => unassignedJobs.filter((j) => !rejectedDispatchIds[String(j?.id || j?._id || "")]).map((job) => {
    const jobId = String(job?.id || job?._id || "");
    const jobRegion = norm(job?.region || job?.area || job?.zone || job?.suburb);
    const jobSkill = norm(job?.service_type || job?.job_type || job?.trade);
    let best = null;
    workers.forEach((w) => {
      const role = norm(w?.role);
      if (!["worker", "employee", "field_worker"].includes(role)) return;
      const unavailable = w?.available === false || ["inactive", "deleted", "offboarded"].includes(norm(w?.status));
      if (unavailable) return;
      const wid = String(w?.id || w?._id || "");
      const stats = workerJobStats[wid] || { today: 0, active: 0, jobs: [] };
      const wRegion = norm(w?.region || w?.area || w?.zone);
      const skills = norm([w?.skills, w?.trades, w?.service_types, w?.service_type].flat().join(" "));
      const regionMatch = !!(jobRegion && wRegion && jobRegion === wRegion);
      const skillMatch = !!(jobSkill && skills.includes(jobSkill));
      const sched = asDate(job?.scheduled_date || job?.date || job?.scheduled_at);
      const conflict = stats.jobs.some((wj) => {
        const ws = asDate(wj?.scheduled_date || wj?.date || wj?.scheduled_at);
        if (!sched || !ws) return false;
        return sched.toISOString() === ws.toISOString();
      });
      let score = 0;
      score += 30;
      if (regionMatch) score += 20;
      if (skillMatch) score += 20;
      score += Math.max(0, 15 - (stats.today * 5));
      score += Math.max(0, 15 - (stats.active * 3));
      if (conflict) score -= 20;
      const candidate = { worker: w, score, stats, regionMatch, skillMatch, conflict };
      if (!best || candidate.score > best.score) best = candidate;
    });
    return { job, jobId, recommendation: best, selectedWorkerId: dispatchOverrides[jobId] || String(best?.worker?.id || best?.worker?._id || "") };
  }), [unassignedJobs, workers, workerJobStats, dispatchOverrides, rejectedDispatchIds]);

  const openInvoices = useMemo(
    () => invoices.filter((inv) => ["open", "sent", "overdue"].includes(statusOf(inv?.status))),
    [invoices]
  );

  const reminderInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const st = statusOf(inv?.status);
      if (REMINDER_EXCLUDED.includes(st)) return false;
      if (st === "draft" && !inv?.sent_at && !inv?.sentAt) return false;
      if (!REMINDER_ELIGIBLE.includes(st)) return false;
      const paidFlag = [inv?.paid, inv?.is_paid, inv?.payment_status].some((v) => [true, "paid"].includes(v));
      if (paidFlag) return false;
      const balance = invoiceBalance(inv);
      return !Number.isFinite(balance) || balance > 0;
    });
  }, [invoices]);

  useEffect(() => {
    setReminderDrafts((prev) => {
      const next = { ...prev };
      reminderInvoices.forEach((inv) => {
        const id = String(inv?.id || inv?._id || inv?.invoice_id || "");
        if (!id || next[id]) return;
        const client = findByIds(clients, [inv?.client_id, inv?.clientId], ["id", "_id", "client_id"]);
        const clientName = textOr(client?.name || inv?.client_name || inv?.customer_name, "there");
        const invoiceNo = textOr(inv?.invoice_number || inv?.number || inv?.title || "", "");
        const overdue = daysOverdue(inv);
        next[id] = buildInvoiceReminderMessage({ client, invoice: inv, business: user, channel: "email" });
      });
      return next;
    });
  }, [reminderInvoices, clients]);

  const waitingQuotes = useMemo(
    () =>
      quotes.filter((q) => {
        const st = statusOf(q?.status);
        if (QUOTE_FOLLOW_UP_EXCLUDED.includes(st)) return false;
        return QUOTE_FOLLOW_UP_ELIGIBLE.includes(st);
      }),
    [quotes]
  );

  useEffect(() => {
    const originals = {};
    setQuoteDrafts((prev) => {
      const next = { ...prev };
      waitingQuotes.forEach((quote) => {
        const id = String(quote?.id || quote?._id || quote?.quote_id || "");
        if (!id) return;
        const client = findByIds(clients, [quote?.client_id, quote?.clientId], ["id", "_id", "client_id"]);
        const clientName = textOr(client?.name || quote?.client_name || quote?.customer_name, "there");
        const quoteNo = textOr(quote?.quote_number || quote?.number || quote?.reference || "", "");
        const title = textOr(quote?.title || quote?.name || quote?.description || "", "your requested work");
        const amountText = money(Number(quote?.total ?? quote?.amount ?? quote?.price));
        const message = buildQuoteFollowUpMessage({ client, quote, business: user, channel: "email" });
        originals[id] = message;
        if (!next[id]) next[id] = message;
      });
      return next;
    });
    setQuoteDraftOriginals((prev) => ({ ...prev, ...originals }));
  }, [waitingQuotes, clients]);

  const crewAvailable = useMemo(
    () => workers.filter((w) => w?.available !== false && !["inactive", "offboarded"].includes(statusOf(w?.status))).length,
    [workers]
  );
  const jobsToday = useMemo(() => {
    const today = new Date().toDateString();
    return jobs.filter((job) => {
      const scheduled = asDate(job?.scheduled_date || job?.date || job?.scheduled_at);
      return scheduled && scheduled.toDateString() === today;
    }).length;
  }, [jobs]);

  const approvalItems = useMemo(() => {
    if (safeArray(operatorActions).length) {
      return dedupeApprovalActions(safeArray(operatorActions).map((a) => normalizeApprovalAction({
        id: a.id || a._id,
        type: a.action_type || a.type,
        group: a.group || (a.status === "completed" ? "completed" : "watching"),
        title: a.title,
        reason: a.reason,
        dataUsed: a.data_used,
        whatHappens: a.what_happens,
        risk: a.risk || a.risk_level || "medium",
        status: a.status,
        relatedType: a.related_type || a.related_entity_type,
        relatedId: a.related_id || a.related_entity_id,
        actionPayload: a.payload || a.draft_payload || {},
      })));
    }
    return buildSmartHubApprovalItems({ jobs, clients, invoices, quotes, workers, activity, dispatchRecs, reminderDrafts, quoteDrafts });
  }, [operatorActions, jobs, clients, invoices, quotes, workers, activity, dispatchRecs, reminderDrafts, quoteDrafts]);

  const sortedApprovalItems = useMemo(() => {
    const rank = (item) => {
      if (item.group === "needs_decision" && item.risk === "high") return 1;
      if (item.group === "ready" && item.type === "create_invoice_draft") return 2;
      if (item.group === "ready" && item.type === "assign_worker") return 3;
      if (item.group === "drafts" && item.type === "invoice_reminder") return 4;
      if (item.group === "drafts" && item.type === "quote_follow_up") return 5;
      return 6;
    };
    return [...approvalItems].sort((a,b)=>rank(a)-rank(b));
  }, [approvalItems]);
  const approvalCounts = useMemo(() => {
    const active = approvalItems.filter((item) => isActiveApproval(item));
    return APPROVAL_GROUPS.reduce((acc, group) => {
      if (group === "all") return { ...acc, all: active.length };
      if (group === "completed") return { ...acc, completed: approvalItems.filter((item) => DONE_ACTION_STATUSES.includes(statusOf(item?.status))).length };
      return { ...acc, [group]: active.filter((item) => item.group === group).length };
    }, {});
  }, [approvalItems]);
  const approvalBadgeTone = approvalCounts.needs_decision ? "amber" : approvalCounts.all ? "green" : "slate";
  const openApprovalCentre = useCallback(({ tab = "all", actionId = "" } = {}) => {
    setApprovalFilter(tab);
    setApprovalDetail(actionId ? { actionId } : null);
    setApprovalCentreOpen(true);
  }, []);
  const notificationItems = useMemo(() => {
    const aiApprovals = sortedApprovalItems.filter((item) => isActiveApproval(item)).slice(0, 6).map((item) => ({
      id: `approval-${item.id}`,
      section: "AI approvals",
      title: item.title || "Approval ready",
      subtitle: item.reason || "Ready for review.",
      time: new Date().toLocaleTimeString(),
      action: () => openApprovalCentre({ tab: item.group || "all", actionId: item.id }),
    }));
    const recent = safeArray(activity).slice(0, 5).map((a) => ({
      id: `activity-${a?.id || a?._id}`, section: "Recent AI activity", title: textOr(a?.title, "AI activity"), subtitle: textOr(a?.message, "Recorded in Smart Hub."), time: new Date(a?.created_at || Date.now()).toLocaleString(), action: () => openApprovalCentre({ tab: "all" }),
    }));
    const errors = safeArray(activity).filter((a) => ["failed", "error", "missing_contact"].includes(statusOf(a?.status))).slice(0, 5).map((a) => ({
      id: `error-${a?.id || a?._id}`, section: "Alerts/errors", title: textOr(a?.title, "Action failed"), subtitle: textOr(a?.message, "Needs attention."), time: new Date(a?.created_at || Date.now()).toLocaleString(), action: () => openApprovalCentre({ tab: "needs_decision" }),
    }));
    return [...aiApprovals, ...recent, ...errors];
  }, [sortedApprovalItems, activity, openApprovalCentre]);
  const unreadNotificationCount = notificationItems.filter((item) => !readNotificationIds[item.id]).length;
  const filteredApprovalItems = useMemo(() => getFilteredApprovalActions(sortedApprovalItems, approvalFilter), [sortedApprovalItems, approvalFilter]);
  useEffect(() => {
    const validIds = new Set(sortedApprovalItems.map((item) => String(item.id)));
    setSelectedApprovalIds((prev) => prev.filter((id) => validIds.has(String(id))));
  }, [sortedApprovalItems]);
  const priorityItems = useMemo(
    () =>
      sortedApprovalItems
        .filter((item) => isActiveApproval(item))
        .slice(0, 3)
        .map((item) => ({
          ...item,
          meta: getActionDisplayMeta(item, { jobs, clients, invoices, quotes, workers }),
        })),
    [sortedApprovalItems, jobs, clients, invoices, quotes, workers]
  );
  const toggleApprovalSelection = (id) => setSelectedApprovalIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSelectAllVisible = () => {
    const visible = filteredApprovalItems.map((i) => String(i.id));
    const allSelected = visible.length && visible.every((id) => selectedApprovalIds.includes(id));
    setSelectedApprovalIds((prev) => (allSelected ? prev.filter((id) => !visible.includes(id)) : Array.from(new Set([...prev, ...visible]))));
  };
  const clearApprovalSelection = () => setSelectedApprovalIds([]);
  const runBulkAction = async (path, ids) => post(path, { action_ids: ids });
  const handleBulkApprove = async () => { await runBulkAction("/ai-operator/actions/bulk-approve", selectedApprovalIds); await load(); clearApprovalSelection(); };
  const handleBulkReject = async () => { await runBulkAction("/ai-operator/actions/bulk-reject", selectedApprovalIds); await load(); clearApprovalSelection(); };
  const handleBulkDelete = async () => { await runBulkAction("/ai-operator/actions/bulk-delete", selectedApprovalIds); await load(); clearApprovalSelection(); };
  const handleBulkMarkCompleted = async () => { await runBulkAction("/ai-operator/actions/bulk-complete", selectedApprovalIds); await load(); clearApprovalSelection(); };

  const bestNextMove = useMemo(() => getBestNextMove({
    readyToBillCount: readyToBillJobs.length,
    unassignedJobsCount: unassignedJobs.length,
    openInvoicesCount: openInvoices.length,
    quotesWaitingCount: waitingQuotes.length,
    pendingApprovalActions: sortedApprovalItems,
  }), [readyToBillJobs.length, unassignedJobs.length, openInvoices.length, waitingQuotes.length, sortedApprovalItems]);

  const workspaceButtons = ["Jobs", "Clients", "Invoices", "Quotes", "Crew", "Payroll", "Approvals", "AI Dispatch"];
  const workspaceMeta = {
    Jobs: `${unassignedJobs.length} unassigned`,
    Clients: "Relationship health",
    Invoices: `${readyToBillJobs.length} ready to bill`,
    Quotes: `${waitingQuotes.length} waiting`,
    Crew: `${crewAvailable} available`,
    Payroll: "Weekly review",
    Approvals: "Owner review",
    "AI Dispatch": `${unassignedJobs.length} to assign`,
  };

  const openWorkspace = (name, mode = "list") => {
    setWorkspaceDrawer(name);
    setWorkspaceMode(mode);
    setWorkspaceRecord(null);
    if (name === "Clients") setClientSearch("");
  };

  const runScanNow = async () => {
    try {
      const scanRes = await post("/smart-hub/scan", {});
      console.info("smart_hub_scan_result", scanRes);
      try {
        await post("/smart-hub/process-due-communications", {});
      } catch {}
      await load();
      setToast({ kind: "success", message: "Smart Hub scan complete." });
    } catch {
      setToast({ kind: "error", message: "Scan failed. Please try again." });
    }
  };


  const approveApprovalItem = async (item) => {
    try {
      const res = await post(`/ai-operator/actions/${item.id}/approve`, {});
      console.info("ai_action_approved", { id: item?.id, type: item?.type, result: res?.result });
      await load();
      clearApprovalSelection();
      setToast({ kind: "success", message: "Action approved." });
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Approve failed.";
      setToast({ kind: "error", message: msg });
    }
  };

  const rejectApprovalItem = async (item) => {
    try {
      await post(`/ai-operator/actions/${item.id}/reject`, {});
      await load();
      setToast({ kind: "success", message: "Action rejected." });
      clearApprovalSelection();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Reject failed.";
      setToast({ kind: "error", message: msg });
    }
  };

  const editApprovalItem = async (item, payload) => patch(`/ai-operator/actions/${item.id}`, payload);

  const draftInvoices = useMemo(() => invoices.filter((inv) => statusOf(inv?.status) === "draft"), [invoices]);

  const approveDraft = useCallback(
    async (job) => {
      const jobId = String(job?.id || job?._id || "");
      if (!jobId) return;
      const client = findByIds(clients, [job?.client_id, job?.clientId], ["id", "_id", "client_id"]);
      const subtotal = Number(job?.subtotal ?? job?.price ?? job?.amount ?? 0);
      const gstRate = Number(job?.gst_rate ?? 15);
      const gstAmount = Number(job?.gst_amount ?? job?.gst ?? job?.tax ?? subtotal * (gstRate / 100));
      const total = Number(job?.total ?? subtotal + gstAmount);
      const description = buildInvoiceDescription({ job, client });

      setSavingJobId(jobId);
      setToast({ kind: "", message: "" });
      const res = await post(`/jobs/${jobId}/create-draft-invoice`, {
        description,
        subtotal,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        total,
      });
      if (!res?.success) {
        setToast({ kind: "error", message: res?.error || "Failed to create draft invoice." });
        return;
      }
      setToast({ kind: "success", message: "Draft invoice created and linked to this job." });
      const targetName = textOr(client?.name || job?.title || job?.name, "client");
      await logActivity({ action_type: "invoice_draft_created", title: "Draft invoice created", message: `Draft invoice created for ${targetName}`, related_type: "invoice", related_id: String(res?.invoice?.id || res?.invoice?._id || jobId), status: "completed" });
      await load();
    },
    [clients, load]
  );

  const logActivity = useCallback(async (payload) => {
    try {
      await post("/smart-hub/activity", payload);
      const refreshed = await get("/smart-hub/activity");
      setActivity(listFrom(refreshed, ["activities"]));
    } catch {}
  }, []);

  const renderDrawerContent = () => {
    if (!workspaceDrawer) return null;
    const recordId = String(workspaceRecord?.id || workspaceRecord?._id || "");
    const startEdit = (record) => {
      setWorkspaceRecord(record || null);
      setWorkspaceMode("edit");
      setWorkspaceEditForm({ ...(record || {}) });
    };
    const openDetail = (record) => {
      setWorkspaceRecord(record || null);
      setWorkspaceMode("detail");
    };
    const saveRecord = async (path, payload, key) => {
      const res = await patch(path, payload);
      if (!res?.success) return setToast({ kind: "error", message: res?.error || "Save failed." });
      setData((prev) => ({ ...prev, [key]: safeArray(prev?.[key]).map((r) => String(r?.id || r?._id || "") === recordId ? { ...r, ...payload } : r) }));
      setWorkspaceRecord((prev) => ({ ...(prev || {}), ...payload }));
      setWorkspaceMode("detail");
      setToast({ kind: "success", message: "Saved." });
    };

    if (workspaceDrawer === "Jobs") {
      if (workspaceMode === "list") return <div className="space-y-3">{jobs.map((j) => <button key={String(j?.id || j?._id)} type="button" onClick={() => openDetail(j)} className="block w-full rounded border bg-[#d7d0c4] p-3 text-left"><p className="font-semibold">{safeText(j?.title || j?.name, "Untitled job")}</p><p className="text-sm text-[#5f646b]">{safeText(j?.status, "Unknown")} · {safeText(j?.address || j?.location, "No address")}</p></button>)}</div>;
      if (!workspaceRecord) return <p className="text-sm text-[#111317]">Record details could not load.</p>;
      if (workspaceMode === "edit") return <div className="space-y-2"><input className="w-full rounded border p-2" value={workspaceEditForm.title || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Job title" /><input className="w-full rounded border p-2" value={workspaceEditForm.address || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" /><input className="w-full rounded border p-2" value={workspaceEditForm.status || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, status: e.target.value }))} placeholder="Status" /><textarea className="w-full rounded border p-2" value={workspaceEditForm.notes || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" /><div className="flex gap-2"><button type="button" className="rounded bg-[#f97316] px-3 py-1 text-white" onClick={() => saveRecord(`/jobs/${recordId}`, { title: workspaceEditForm.title, address: workspaceEditForm.address, status: workspaceEditForm.status, notes: workspaceEditForm.notes }, "jobs")}>Save</button><button type="button" className="rounded border px-3 py-1" onClick={() => setWorkspaceMode("detail")}>Back</button></div></div>;
      return <div className="space-y-2"><p className="font-semibold">{safeText(workspaceRecord?.title || workspaceRecord?.name, "Untitled job")}</p><p>Client: {safeText(findByIds(clients, [workspaceRecord?.client_id, workspaceRecord?.clientId], ["id","_id","client_id"])?.name || workspaceRecord?.client_name)}</p><p>Address: {safeText(workspaceRecord?.address || workspaceRecord?.location)}</p><p>Status: {safeText(workspaceRecord?.status)}</p><p>Assigned worker: {safeText(workspaceRecord?.assigned_worker || workspaceRecord?.assigned_worker_name)}</p><p>Scheduled date: {safeText(workspaceRecord?.scheduled_date || workspaceRecord?.date)}</p><p>Completed date: {safeText(workspaceRecord?.completed_at)}</p><p>Service type: {safeText(workspaceRecord?.service_type || workspaceRecord?.job_type)}</p><p>Notes: {safeText(workspaceRecord?.notes)}</p><div className="flex flex-wrap gap-2"><button type="button" className="rounded border px-3 py-1" onClick={() => startEdit(workspaceRecord)}>Edit job details</button><button type="button" className="rounded border px-3 py-1" onClick={() => setWorkspaceMode("list")}>Back</button><button type="button" className="rounded border px-3 py-1" onClick={() => navigate(`/jobs/${recordId}`)}>Open full job page</button></div></div>;
    }

    if (workspaceDrawer === "Clients") {
      const filteredClients = clients.filter((client) => {
        const haystack = `${client?.name || ""} ${client?.email || ""} ${client?.phone || ""} ${client?.address || ""}`.toLowerCase();
        return haystack.includes(clientSearch.toLowerCase());
      });
      const selectedClientId = String(workspaceRecord?.id || workspaceRecord?._id || "");
      const selectedClientJobs = jobs.filter((job) => String(job?.client_id || job?.clientId || "") === selectedClientId);
      const selectedClientInvoices = invoices.filter((inv) => String(inv?.client_id || inv?.clientId || "") === selectedClientId);
      const selectedClientQuotes = quotes.filter((quote) => String(quote?.client_id || quote?.clientId || "") === selectedClientId);

      const makeClientCounts = (client) => {
        const id = String(client?.id || client?._id || "");
        const clientJobs = jobs.filter((job) => String(job?.client_id || job?.clientId || "") === id);
        const clientInvoices = invoices.filter((inv) => String(inv?.client_id || inv?.clientId || "") === id);
        const clientQuotes = quotes.filter((quote) => String(quote?.client_id || quote?.clientId || "") === id);
        return {
          activeJobs: clientJobs.filter((job) => !["completed", "complete", "cancelled", "canceled"].includes(statusOf(job?.status))).length,
          openInvoices: clientInvoices.filter((inv) => !["paid", "cancelled", "canceled"].includes(statusOf(inv?.status))).length,
          quotesCount: clientQuotes.length,
        };
      };

      const addClient = async () => {
        const payload = {
          name: workspaceEditForm?.name || "",
          email: workspaceEditForm?.email || "",
          phone: workspaceEditForm?.phone || "",
          address: workspaceEditForm?.address || "",
          notes: workspaceEditForm?.notes || "",
        };
        const res = await post("/clients", payload);
        if (!res?.success) return setToast({ kind: "error", message: res?.error || "Could not add client." });
        setToast({ kind: "success", message: "Client added." });
        await load();
        const created = res?.client || payload;
        setWorkspaceRecord(created);
        setWorkspaceMode("detail");
      };

      if (workspaceMode === "add") return <div className="space-y-2"><h3 className="text-lg font-semibold text-[#0f1115]">Add client</h3><input className="w-full rounded border p-2" value={workspaceEditForm.name || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Client name" /><input className="w-full rounded border p-2" value={workspaceEditForm.email || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" /><input className="w-full rounded border p-2" value={workspaceEditForm.phone || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" /><input className="w-full rounded border p-2" value={workspaceEditForm.address || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" /><textarea className="w-full rounded border p-2" value={workspaceEditForm.notes || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" /><div className="flex flex-wrap gap-2"><button type="button" className="rounded bg-[#f97316] px-3 py-1 text-white" onClick={addClient}>Save client</button><button type="button" className="rounded border px-3 py-1" onClick={() => setWorkspaceMode("list")}>Cancel</button></div></div>;
      if (workspaceMode === "edit" && workspaceRecord) return <div className="space-y-2"><h3 className="text-lg font-semibold text-[#0f1115]">Edit client</h3><input className="w-full rounded border p-2" value={workspaceEditForm.name || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Client name" /><input className="w-full rounded border p-2" value={workspaceEditForm.email || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" /><input className="w-full rounded border p-2" value={workspaceEditForm.phone || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" /><input className="w-full rounded border p-2" value={workspaceEditForm.address || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" /><textarea className="w-full rounded border p-2" value={workspaceEditForm.notes || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" /><div className="flex flex-wrap gap-2"><button type="button" className="rounded bg-[#f97316] px-3 py-1 text-white" onClick={() => saveRecord(`/clients/${selectedClientId}`, { name: workspaceEditForm.name, email: workspaceEditForm.email, phone: workspaceEditForm.phone, address: workspaceEditForm.address, notes: workspaceEditForm.notes }, "clients")}>Save client</button><button type="button" className="rounded border px-3 py-1" onClick={() => setWorkspaceMode("detail")}>Cancel</button></div></div>;
      if (workspaceMode === "detail" && workspaceRecord) return <div className="space-y-2"><h3 className="text-lg font-semibold text-[#0f1115]">{safeText(workspaceRecord?.name, "Client details")}</h3><p>Email: {safeText(workspaceRecord?.email)}</p><p>Phone: {safeText(workspaceRecord?.phone)}</p><p>Address: {safeText(workspaceRecord?.address)}</p><p>Notes: {safeText(workspaceRecord?.notes)}</p><p>Recent jobs: {selectedClientJobs.slice(0, 3).map((job) => textOr(job?.title || job?.name, "Job")).join(", ") || "None"}</p><p>Open invoices: {selectedClientInvoices.filter((inv) => !["paid", "cancelled", "canceled"].includes(statusOf(inv?.status))).length}</p><p>Quotes: {selectedClientQuotes.length}</p><div className="flex flex-wrap gap-2"><button type="button" className="rounded border px-3 py-1" onClick={() => startEdit(workspaceRecord)}>Edit client</button><button type="button" className="rounded border px-3 py-1" onClick={() => navigate(`/jobs/new?client_id=${selectedClientId}`)}>New job (open full page)</button><button type="button" className="rounded border px-3 py-1" onClick={() => navigate(`/quotes/new?client_id=${selectedClientId}`)}>New quote (open full page)</button><button type="button" className="rounded border px-3 py-1" onClick={() => setWorkspaceMode("list")}>Back to clients</button><button type="button" className="rounded border px-3 py-1" onClick={() => navigate(`/clients/${selectedClientId}`)}>Open full client page</button></div></div>;

      return <div className="space-y-4"><div><h3 className="text-lg font-semibold text-[#0f1115]">Clients Workspace</h3><p className="text-sm text-[#5f646b]">Search, review and update clients without leaving Smart Hub.</p></div><div className="flex flex-wrap gap-2"><input className="min-w-[220px] flex-1 rounded border p-2" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Search clients" /><button type="button" className="rounded bg-[#f97316] px-3 py-2 text-sm text-white" onClick={() => { setWorkspaceEditForm({}); setWorkspaceMode("add"); }}>Add client</button><button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => navigate("/clients")}>Open full clients page</button></div>{!filteredClients.length ? <p className="text-sm text-[#5f646b]">No clients found.</p> : filteredClients.map((client) => { const id = String(client?.id || client?._id || ""); const counts = makeClientCounts(client); return <article key={id} className="rounded-2xl border border-[#7f7668] bg-[#d7d0c4] p-4 shadow-[0_8px_20px_rgba(15,17,21,0.10)] operator-panel operator-card" data-smart-hub-card="true"><p className="font-semibold text-[#0f1115]">{safeText(client?.name, "Unknown client")}</p><p className="text-sm text-[#5f646b]">{safeText(client?.email)}</p><p className="text-sm text-[#5f646b]">{safeText(client?.phone)}</p><p className="text-sm text-[#5f646b]">{safeText(client?.address)}</p><p className="mt-1 text-xs text-[#5f646b]">Active/open jobs: {counts.activeJobs} · Open invoices: {counts.openInvoices} · Quotes: {counts.quotesCount}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => openDetail(client)}>View details</button><button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => startEdit(client)}>Edit</button><button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => navigate(`/jobs/new?client_id=${id}`)}>New job (open full page)</button><button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => navigate(`/quotes/new?client_id=${id}`)}>New quote (open full page)</button><button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => navigate(`/clients/${id}`)}>Open full client page</button></div></article>; })}</div>;
    }

    if (workspaceDrawer === "Invoices") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0f1115]">Invoices Workspace</h3>
            <p className="text-sm text-[#5f646b]">Review ready-to-bill jobs, draft invoices and payment reminders.</p>
          </div>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Ready to bill", readyToBillJobs.length],
              ["Open invoices", openInvoices.length],
              ["Draft invoices", draftInvoices.length],
              ["Quotes waiting", waitingQuotes.length],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border border-[#8c8274] tradie-panel p-3">
                <p className="text-xs uppercase tracking-wide text-[#5f646b]">{label}</p>
                <p className="mt-1 text-xl font-semibold text-[#0f1115]">{value}</p>
              </article>
            ))}
          </section>
          {!readyToBillJobs.length ? (
            <p className="text-sm text-[#5f646b]">No ready-to-bill jobs right now.</p>
          ) : (
            readyToBillJobs.map((job) => {
              const client = findByIds(clients, [job?.client_id, job?.clientId], ["id", "_id", "client_id"]);
              const subtotal = Number(job?.subtotal ?? job?.price ?? job?.amount);
              const gst = Number(job?.gst ?? job?.tax);
              const total = Number(job?.total ?? (Number.isFinite(subtotal) && Number.isFinite(gst) ? subtotal + gst : NaN));

              return (
                <div key={String(job?.id || job?._id || job?.job_id || Math.random())} className="rounded-2xl border border-[#7f7668] bg-[#d7d0c4] p-4 shadow-[0_8px_20px_rgba(15,17,21,0.10)] operator-panel operator-card" data-smart-hub-card="true">
                  <p className="font-semibold text-[#0f1115]">{textOr(job?.title || job?.name, "Untitled job")}</p>
                  <p className="text-sm text-[#5f646b]">Client: {textOr(client?.name, "Unknown client")}</p>
                  <p className="text-sm text-[#5f646b]">Address: {textOr(job?.address || job?.location, "No address saved")}</p>
                  <p className="text-sm text-[#5f646b]">Completed: {textOr(job?.completed_at || job?.updated_at, "Unknown date")}</p>
                  <p className="mt-2 text-sm text-[#111317]">{buildInvoiceDescription({ job, client })}</p>
                  {Number.isFinite(subtotal) ? (
                    <div className="mt-3 grid grid-cols-1 gap-1 text-sm text-[#111317] sm:grid-cols-3">
                      <p>Subtotal: {money(subtotal)}</p>
                      <p>GST: {money(gst)}</p>
                      <p>Total: {money(total)}</p>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-[#c8bfb1] px-3 py-2 text-sm text-[#111317]">Warning: price missing. Confirm pricing before invoicing.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => approveDraft(job)}
                    disabled={savingJobId === String(job?.id || job?._id || "")}
                    className="mt-4 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingJobId === String(job?.id || job?._id || "") ? "Approving..." : "Approve draft"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      );
    }

    if (workspaceDrawer === "Payment Reminders") {
      const draftCount = Object.values(approvedReminderIds).filter(Boolean).length;
      const overdueCount = reminderInvoices.filter((inv) => (daysOverdue(inv) || 0) > 0 || statusOf(inv?.status) === "overdue").length;
      const missingContactCount = reminderInvoices.filter((inv) => {
        const client = findByIds(clients, [inv?.client_id, inv?.clientId], ["id", "_id", "client_id"]);
        return !(client?.email || inv?.client_email || client?.phone || inv?.client_phone);
      }).length;

      const approveOne = async (inv) => {
        const id = String(inv?.id || inv?._id || inv?.invoice_id || "");
        if (!id) return;
        const client = findByIds(clients, [inv?.client_id, inv?.clientId], ["id", "_id", "client_id"]);
        const payload = {
          invoice_id: id,
          client_id: client?.id || client?._id || inv?.client_id || null,
          body: reminderDrafts[id] || "",
          message_type: "invoice_reminder",
          channel: client?.email || inv?.client_email ? "email" : "sms",
          status: "draft",
          source: "ai_operator",
        };
        try { await post("/communications/drafts", payload); } catch {}
        setApprovedReminderIds((prev) => ({ ...prev, [id]: true }));
        await logActivity({ action_type: "reminder_draft_approved", title: "Reminder draft approved", message: `Payment reminder draft approved for ${textOr(client?.name || inv?.client_name || inv?.invoice_number, "client")}`, related_type: "invoice", related_id: id, status: "completed" });
        setToast({ kind: "success", message: "Reminder draft approved." });
      };

      const toggleSelected = (id) => setSelectedReminderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      const approveMany = async (ids) => {
        for (const id of ids) {
          const inv = reminderInvoices.find((item) => String(item?.id || item?._id || item?.invoice_id || "") === id);
          if (inv) await approveOne(inv);
        }
      };

      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0f1115]">Payment Reminders</h3>
            <p className="text-sm text-[#5f646b]">Review AI-prepared reminder drafts for unpaid invoices.</p>
          </div>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Open invoices', reminderInvoices.length], ['Overdue invoices', overdueCount], ['Draft reminders', draftCount], ['Missing contact details', missingContactCount]].map(([label, value]) => <article key={label} className="rounded-xl border border-[#8c8274] tradie-panel p-3"><p className="text-xs uppercase tracking-wide text-[#5f646b]">{label}</p><p className="mt-1 text-xl font-semibold text-[#0f1115]">{value}</p></article>)}
          </section>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => approveMany(selectedReminderIds)} className="rounded-xl bg-[#14532d] px-3 py-2 text-sm font-medium text-white hover:bg-[#166534] operator-approve" data-operator-approve="true">Approve selected reminders</button>
            <button type="button" onClick={() => approveMany(reminderInvoices.map((inv) => String(inv?.id || inv?._id || inv?.invoice_id || "")).filter(Boolean))} className="rounded-xl bg-[#1f242b] px-3 py-2 text-sm text-white hover:bg-[#0d0f12] font-medium text-[#111317]">Approve all ready reminders</button>
            <button type="button" onClick={() => setSelectedReminderIds([])} className="rounded-xl bg-[#1f242b] px-3 py-2 text-sm text-white hover:bg-[#0d0f12] font-medium text-[#111317]">Reject selected</button>
          </div>
          {!reminderInvoices.length ? <p className="text-sm text-[#5f646b]">No unpaid invoices need reminders right now.</p> : reminderInvoices.map((inv) => {
            const id = String(inv?.id || inv?._id || inv?.invoice_id || "");
            const client = findByIds(clients, [inv?.client_id, inv?.clientId], ["id", "_id", "client_id"]);
            const contactEmail = client?.email || inv?.client_email;
            const contactPhone = client?.phone || inv?.client_phone;
            const missingContact = !(contactEmail || contactPhone);
            const isEditing = !!editingDraft[id];
            const due = inv?.due_date || inv?.dueDate;
            return <article key={id} className="rounded-2xl border border-[#7f7668] bg-[#d7d0c4] p-4 shadow-[0_8px_20px_rgba(15,17,21,0.10)] operator-panel operator-card" data-smart-hub-card="true"><div className="flex items-start justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedReminderIds.includes(id)} onChange={() => toggleSelected(id)} />Select</label><p className="text-xs font-medium uppercase tracking-wide text-[#5f646b]">{approvedReminderIds[id] ? "Approved draft" : "Pending approval"}</p></div><p className="mt-2 font-semibold text-[#0f1115]">{textOr(client?.name || inv?.client_name || inv?.customer_name, "Unknown client")}</p><p className="text-sm text-[#5f646b]">Invoice: {textOr(inv?.invoice_number || inv?.number || inv?.title, "Untitled invoice")}</p><p className="text-sm text-[#5f646b]">Amount due: {money(invoiceBalance(inv))}</p><p className="text-sm text-[#5f646b]">Due date: {textOr(due, "No due date")}</p><p className="text-sm text-[#5f646b]">Status: {textOr(inv?.status, "unknown")}</p><p className="text-sm text-[#5f646b]">Overdue days: {daysOverdue(inv) ?? "—"}</p><p className="text-sm text-[#5f646b]">Contact: {contactEmail || "—"} {contactPhone ? ` / ${contactPhone}` : ""}</p>{missingContact ? <p className="mt-2 rounded bg-[#c8bfb1] px-2 py-1 text-xs text-[#111317]">Warning: missing client contact details. You can save/approve this draft, but it is not ready to send.</p> : null}{isEditing ? <textarea className="mt-3 w-full rounded-lg border border-[#8c8274] p-2 text-sm" rows={4} value={reminderDrafts[id] || ""} onChange={(e) => setReminderDrafts((prev) => ({ ...prev, [id]: e.target.value }))} /> : <p className="mt-3 rounded-lg bg-[#c8bfb1] p-3 text-sm text-[#111317] operator-inner" data-smart-hub-inner="true">{reminderDrafts[id]}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setEditingDraft((prev) => ({ ...prev, [id]: true }))} className="rounded border border-[#8c8274] px-3 py-1 text-sm">Edit message</button><button type="button" onClick={() => setEditingDraft((prev) => ({ ...prev, [id]: false }))} className="rounded border border-[#8c8274] px-3 py-1 text-sm">Save message</button><button type="button" onClick={() => { setEditingDraft((prev) => ({ ...prev, [id]: false })); setReminderDrafts((prev) => ({ ...prev, [id]: buildInvoiceReminderMessage({ client, invoice: inv, business: user, channel: "email" }) })); }} className="rounded border border-[#8c8274] px-3 py-1 text-sm">Cancel</button><button type="button" onClick={() => approveOne(inv)} className="rounded bg-[#f97316] px-3 py-1 text-sm text-white">Approve reminder draft</button><button type="button" onClick={() => navigate(`/invoices/${id}`)} className="rounded border border-[#8c8274] px-3 py-1 text-sm">Open full invoice page</button></div></article>;
          })}
        </div>
      );
    }

    if (workspaceDrawer === "Quotes" || workspaceDrawer === "Quote Follow-ups") {
      const preparedCount = Object.values(approvedQuoteIds).filter(Boolean).length;
      const missingContactCount = waitingQuotes.filter((q) => {
        const client = findByIds(clients, [q?.client_id, q?.clientId], ["id", "_id", "client_id"]);
        return !(client?.email || q?.client_email || client?.phone || q?.client_phone);
      }).length;
      const oldestWaiting = waitingQuotes.reduce((max, q) => Math.max(max, quoteAgeDays(q) ?? 0), 0);
      const toggleSelected = (id) => setSelectedQuoteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      const approveOne = async (quote) => {
        const id = String(quote?.id || quote?._id || quote?.quote_id || "");
        if (!id) return;
        const client = findByIds(clients, [quote?.client_id, quote?.clientId], ["id", "_id", "client_id"]);
        const hasContact = !!(client?.email || quote?.client_email || client?.phone || quote?.client_phone);
        const payload = { quote_id: id, client_id: client?.id || client?._id || quote?.client_id || null, body: quoteDrafts[id] || "", message_type: "quote_follow_up", channel: client?.email || quote?.client_email ? "email" : "sms", status: "draft", source: "ai_operator" };
        try { await post("/communications/drafts", payload); } catch {}
        setApprovedQuoteIds((prev) => ({ ...prev, [id]: hasContact ? true : "missing_contact" }));
        await logActivity({ action_type: "quote_followup_approved", title: "Quote follow-up approved", message: `Quote follow-up draft approved for ${textOr(client?.name || quote?.quote_number || quote?.title, "client")}`, related_type: "quote", related_id: id, status: "completed" });
        setToast({ kind: "success", message: "Quote follow-up draft approved." });
      };
      const approveMany = async (ids) => { for (const id of ids) { const quote = waitingQuotes.find((q) => String(q?.id || q?._id || q?.quote_id || "") === id); if (quote) await approveOne(quote); } };
      return (
        <div className="space-y-4">
          <div><h3 className="text-lg font-semibold text-[#0f1115]">Quote Follow-ups</h3><p className="text-sm text-[#5f646b]">Review AI-prepared quote follow-up drafts before anything is sent.</p></div>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Quotes waiting", waitingQuotes.length], ["Follow-ups prepared", preparedCount], ["Missing contact details", missingContactCount], ["Oldest waiting quote", oldestWaiting ? `${oldestWaiting}d` : "—"]].map(([label, value]) => <article key={label} className="rounded-xl border border-[#8c8274] tradie-panel p-3"><p className="text-xs uppercase tracking-wide text-[#5f646b]">{label}</p><p className="mt-1 text-xl font-semibold text-[#0f1115]">{value}</p></article>)}</section>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => approveMany(selectedQuoteIds)} className="rounded-xl bg-[#14532d] px-3 py-2 text-sm font-medium text-white hover:bg-[#166534] operator-approve" data-operator-approve="true">Approve selected follow-ups</button><button type="button" onClick={() => approveMany(waitingQuotes.map((q) => String(q?.id || q?._id || q?.quote_id || "")).filter(Boolean))} className="rounded-xl bg-[#1f242b] px-3 py-2 text-sm text-white hover:bg-[#0d0f12] font-medium text-[#111317]">Approve all ready follow-ups</button><button type="button" onClick={() => setSelectedQuoteIds([])} className="rounded-xl bg-[#1f242b] px-3 py-2 text-sm text-white hover:bg-[#0d0f12] font-medium text-[#111317]">Reject selected</button></div>
          {!waitingQuotes.length ? <p className="text-sm text-[#5f646b]">No quotes are waiting for follow-up right now.</p> : waitingQuotes.map((quote) => {
            const id = String(quote?.id || quote?._id || quote?.quote_id || "");
            const client = findByIds(clients, [quote?.client_id, quote?.clientId], ["id", "_id", "client_id"]);
            const contactEmail = client?.email || quote?.client_email;
            const contactPhone = client?.phone || quote?.client_phone;
            const missingContact = !(contactEmail || contactPhone);
            const age = quoteAgeDays(quote);
            const displayDate = quote?.sent_at || quote?.sentAt || quote?.created_at || quote?.createdAt || quote?.date;
            return <article key={id} className="rounded-2xl border border-[#7f7668] bg-[#d7d0c4] p-4 shadow-[0_8px_20px_rgba(15,17,21,0.10)] operator-panel operator-card" data-smart-hub-card="true"><div className="flex items-start justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedQuoteIds.includes(id)} onChange={() => toggleSelected(id)} />Select</label><p className="text-xs font-medium uppercase tracking-wide text-[#5f646b]">{approvedQuoteIds[id] ? "Approved draft" : "Pending approval"}</p></div><p className="mt-2 font-semibold text-[#0f1115]">{textOr(client?.name || quote?.client_name || quote?.customer_name, "Unknown client")}</p><p className="text-sm text-[#5f646b]">Quote: {textOr(quote?.quote_number || quote?.number || quote?.title, "Untitled quote")}</p><p className="text-sm text-[#5f646b]">Amount: {money(Number(quote?.total ?? quote?.amount ?? quote?.price))}</p><p className="text-sm text-[#5f646b]">Status: {textOr(quote?.status, "unknown")}</p><p className="text-sm text-[#5f646b]">Created/Sent: {textOr(displayDate, "Unknown date")}</p><p className="text-sm text-[#5f646b]">Age: {age ?? "—"} days</p><p className="text-sm text-[#5f646b]">Contact: {contactEmail || "—"} {contactPhone ? ` / ${contactPhone}` : ""}</p>{missingContact ? <p className="mt-2 rounded bg-[#c8bfb1] px-2 py-1 text-xs text-[#111317]">Warning: missing client contact details. You can save this draft, but it is not ready to send.</p> : null}{editingQuoteDraft[id] ? <textarea className="mt-3 w-full rounded-lg border border-[#8c8274] p-2 text-sm" rows={4} value={quoteDrafts[id] || ""} onChange={(e) => setQuoteDrafts((prev) => ({ ...prev, [id]: e.target.value }))} /> : <p className="mt-3 rounded-lg bg-[#c8bfb1] p-3 text-sm text-[#111317] operator-inner" data-smart-hub-inner="true">{quoteDrafts[id]}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setEditingQuoteDraft((prev) => ({ ...prev, [id]: true }))} className="rounded border border-[#8c8274] px-3 py-1 text-sm">Edit message</button><button type="button" onClick={() => setEditingQuoteDraft((prev) => ({ ...prev, [id]: false }))} className="rounded border border-[#8c8274] px-3 py-1 text-sm">Save message</button><button type="button" onClick={() => { setQuoteDrafts((prev) => ({ ...prev, [id]: quoteDraftOriginals[id] || prev[id] })); setEditingQuoteDraft((prev) => ({ ...prev, [id]: false })); }} className="rounded border border-[#8c8274] px-3 py-1 text-sm">Cancel</button><button type="button" onClick={() => approveOne(quote)} className="rounded bg-[#f97316] px-3 py-1 text-sm text-white">Approve follow-up draft</button><button type="button" onClick={() => navigate(`/quotes/${id}`)} className="rounded border border-[#8c8274] px-3 py-1 text-sm">Open full quote page</button></div></article>;
          })}
        </div>
      );
    }
    if (workspaceDrawer === "AI Dispatch") {
      const applyAssign = async (job, workerId) => {
        if (!workerId) return;
        const jobId = String(job?.id || job?._id || "");
        setSavingJobId(jobId);
        const res = await post(`/jobs/${jobId}/assign-worker`, { worker_id: workerId });
        if (!res?.success) {
          setToast({ kind: "error", message: res?.error || "Failed to assign worker." });
        } else {
          setToast({ kind: "success", message: "Worker assignment approved and saved." });
          await logActivity({ action_type: "worker_assigned", title: "Worker assigned", message: `${res?.job?.assigned_worker_name || "Worker"} assigned to ${textOr(job?.title, "job")}`, related_type: "job", related_id: jobId, status: "completed" });
          await load();
        }
        setSavingJobId("");
      };
      const conflicts = dispatchRecs.filter((r) => r?.recommendation?.conflict).length;
      const missingData = dispatchRecs.filter((r) => !(r?.recommendation?.regionMatch && r?.recommendation?.skillMatch)).length;
      return <div className="space-y-4"><div><h3 className="text-lg font-semibold text-[#0f1115]">AI Dispatch</h3><p className="text-sm text-[#5f646b]">Review recommended worker assignments before jobs are updated.</p></div>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Unassigned jobs", dispatchRecs.length],["Crew available", crewAvailable],["Schedule conflicts", conflicts],["Missing job details", missingData]].map(([l,v])=><article key={l} className="rounded-xl border border-[#8c8274] tradie-panel p-3"><p className="text-xs uppercase tracking-wide text-[#5f646b]">{l}</p><p className="mt-1 text-xl font-semibold text-[#0f1115]">{v}</p></article>)}</section>
      {!dispatchRecs.length ? <p className="text-sm text-[#5f646b]">No unassigned jobs require approval right now.</p> : dispatchRecs.map(({ job, jobId, recommendation, selectedWorkerId }) => {
        const selected = workers.find((w) => String(w?.id || w?._id || "") === String(selectedWorkerId));
        const st = recommendation?.stats || { today: 0, active: 0 };
        const reasoning = recommendation ? `AI recommends ${textOr(selected?.name || recommendation?.worker?.name, "this worker")} because ${recommendation.regionMatch ? "they are in the same region, " : ""}${recommendation.skillMatch ? "their skills match, " : ""}and they currently have ${st.today} jobs today (${st.active} active).${recommendation.conflict ? " Possible schedule conflict detected." : " No schedule conflict was detected."}` : "No perfect worker was found. Choose a worker manually.";
        return <article key={jobId} className="rounded-2xl border border-[#7f7668] bg-[#d7d0c4] p-4 shadow-[0_8px_20px_rgba(15,17,21,0.10)] operator-panel operator-card" data-smart-hub-card="true"><p className="font-semibold">{textOr(job?.title, "Untitled job")}</p><p className="text-sm text-[#5f646b]">Client: {textOr(job?.client_name || job?.customer_name, "Unknown")}</p><p className="text-sm text-[#5f646b]">Address: {textOr(job?.address || job?.location, "No address")}</p><p className="text-sm text-[#5f646b]">Scheduled: {textOr(job?.scheduled_date || job?.date || job?.scheduled_at, "Unscheduled")}</p><p className="text-sm text-[#5f646b]">Priority/Status: {textOr(job?.priority, "normal")} / {textOr(job?.status, "new")}</p><p className="mt-2 text-sm text-[#111317]">{reasoning}</p>{recommendation?.conflict ? <p className="mt-2 rounded bg-[#c8bfb1] px-2 py-1 text-xs text-[#111317]">Possible schedule conflict: this worker already has another job scheduled that day.</p> : null}
        <div className="mt-3"><select className="w-full rounded border p-2 text-sm" value={selectedWorkerId} onChange={(e) => setDispatchOverrides((prev) => ({ ...prev, [jobId]: e.target.value }))}><option value="">Choose different worker</option>{workers.filter((w) => !["inactive","deleted","offboarded"].includes(norm(w?.status))).map((w) => <option key={String(w?.id || w?._id)} value={String(w?.id || w?._id)}>{textOr(w?.name, "Worker")} · {textOr(w?.region || w?.area || w?.zone, "No region")}</option>)}</select></div>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!selectedWorkerId || savingJobId===jobId} onClick={() => applyAssign(job, selectedWorkerId)} className="rounded bg-[#f97316] px-3 py-1 text-sm text-white">Approve assignment</button><button type="button" onClick={() => navigate(`/jobs/${jobId}`)} className="rounded border px-3 py-1 text-sm">Open full job page</button><button type="button" onClick={async () => { setRejectedDispatchIds((prev) => ({ ...prev, [jobId]: true })); await logActivity({ action_type: "recommendation_rejected", title: "Recommendation rejected", message: `AI recommendation rejected: ${textOr(job?.title, "Job")}`, related_type: "job", related_id: jobId, status: "rejected" }); }} className="rounded border px-3 py-1 text-sm">Reject recommendation</button></div></article>;
      })}</div>;
    }

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-[#0f1115]">{workspaceDrawer} Workspace</h3>
        <p className="text-sm text-[#5f646b]">Nothing needs attention here.</p>
        <button
          type="button"
          onClick={() => navigate(`/${workspaceDrawer.toLowerCase()}`)}
          className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#ea580c]"
        >
          Open full page
        </button>
      </div>
    );
  };

  return (
    <Layout title="Smart Hub">
      <div className="min-h-screen bg-[#b8afa1] text-[#0f1115] tradie-page-bg smart-hub-hard-trade-v4" style={{ backgroundImage: "linear-gradient(135deg, rgba(15,17,21,0.07) 25%, transparent 25%), linear-gradient(225deg, rgba(15,17,21,0.06) 25%, transparent 25%)", backgroundColor: "#b8afa1", backgroundSize: "30px 30px" }}>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <section
            className="relative overflow-hidden rounded-3xl border p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            style={{ background: "linear-gradient(135deg, #07090b 0%, #111317 45%, #242932 100%)", borderColor: "rgba(255,255,255,0.14)" }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">AI Operator Control Centre</p>
            <span className="mt-2 inline-flex rounded-full border border-[#fdba74] bg-[#f97316] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">HARD TRADE THEME v4</span>
            <h1 className="mt-2 text-3xl font-black">AI Operator Control Centre</h1>
            <p className="mt-2 text-sm text-white/80">Welcome back, {textOr(user?.name || user?.email, "team")}. Keep operations flowing with one clear next move.</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-wide text-[#fdba74]">Best Next Move</p>
              <p className="mt-1 text-base text-slate-100">{bestNextMove.label}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={runScanNow} className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-[#ea580c]">Run today's AI plan</button>
              <button type="button" onClick={() => { openApprovalCentre({ tab: "all" }); }} className="rounded-xl border border-[#242932] bg-[#111317] px-4 py-2 text-sm font-medium text-white hover:bg-[#07090b]">Open Command Queue</button>
              <button type="button" onClick={() => openApprovalCentre({ tab: approvalCounts.needs_decision ? "needs_decision" : "all" })} className={`rounded-full px-3 py-2 text-xs font-semibold ${approvalBadgeTone === "amber" ? "bg-[#f97316]/20 text-[#7c2d12] border border-[#f97316]/40" : approvalBadgeTone === "green" ? "bg-[#14532d] text-[#dcfce7] border border-[#166534]" : "bg-[#111317] text-white border border-[#242932]"}`}>{approvalCounts.all ? `${approvalCounts.all} approvals` : "All clear"}</button>
              <div className="relative">
                <button type="button" onClick={() => setNotificationOpen((v) => !v)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800">🔔 {unreadNotificationCount}</button>
                {notificationOpen ? <div className="absolute right-0 z-20 mt-2 w-[340px] rounded-xl border border-[#8c8274] bg-[#d7d0c4] p-3 text-[#0f1115] shadow-xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5f646b]">Notifications</p>
                  {notificationItems.slice(0, 10).map((item) => <button key={item.id} type="button" onClick={() => { setReadNotificationIds((prev) => ({ ...prev, [item.id]: true })); setNotificationOpen(false); item.action?.(); }} className="mt-2 w-full rounded-lg border border-[#8c8274] p-2 text-left hover:bg-[#c8bfb1]"><p className="text-[11px] font-semibold uppercase text-[#5f646b]">{item.section}</p><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-[#5f646b]">{item.subtitle}</p><p className="text-[11px] text-[#5f646b]">{item.time}</p></button>)}
                </div> : null}
              </div>
            </div>
          </section>

          {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Ready to bill", readyToBillJobs.length],
              ["Unassigned jobs", unassignedJobs.length],
              ["Open invoices", openInvoices.length],
              ["Crew available", crewAvailable],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-[#7f7668] bg-[#d7d0c4] p-4 shadow-[0_8px_20px_rgba(15,17,21,0.10)] operator-panel operator-card" data-smart-hub-card="true">
                <p className="text-xs uppercase tracking-wide text-[#5f646b]">{label}</p>
                <button type="button" onClick={() => ({"Ready to bill":"Invoices","Unassigned jobs":"AI Dispatch","Open invoices":"Payment Reminders","Crew available":"Crew"}[label] ? openWorkspace({"Ready to bill":"Invoices","Unassigned jobs":"AI Dispatch","Open invoices":"Payment Reminders","Crew available":"Crew"}[label], {"Open invoices":"reminders"}[label] || "list") : null)} className="mt-2 text-3xl font-black text-[#0f1115]">
                  {value}
                </button>
              </article>
            ))}
          </section>

          <section className="mt-6 rounded-3xl border border-[#7b7469] bg-[#d7d0c4] p-5 shadow-[0_14px_35px_rgba(15,17,21,0.16)] border-l-4 border-l-[#f97316]">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#5f646b]">AI Approval Centre</h2>
            <p className="mt-1 text-sm text-[#5f646b]">AI has prepared today&apos;s admin. Review everything before anything changes.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => openApprovalCentre({ tab: "all" })} className={`rounded-full px-3 py-1 text-xs font-medium ${approvalBadgeTone === "amber" ? "bg-[#f97316]/20 text-[#7c2d12] border border-[#f97316]/40" : approvalBadgeTone === "green" ? "bg-[#14532d] text-[#dcfce7] border border-[#166534]" : "bg-[#111317] text-white border border-[#242932]"}`}>{approvalCounts.all ? `${approvalCounts.all} approvals` : "All clear"}</button>
              <p className="text-sm text-[#111317]">{approvalCounts.all ? `${approvalCounts.all} approvals waiting` : "AI has checked today’s jobs, invoices, quotes and crew."}</p>
            </div>
            <p className="mt-2 text-sm text-[#5f646b]">{approvalCounts.needs_decision || 0} need decision · {approvalCounts.ready || 0} ready · {approvalCounts.drafts || 0} drafts · {approvalCounts.watching || 0} watching</p>
            {!!priorityItems.length && <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[#111317]">{priorityItems.map((item) => <li key={item.id}><button type="button" onClick={() => { openApprovalCentre({ tab: bestNextMove.approvalTab || "all" }); }} className="text-left hover:text-[#0f1115]">{item.meta?.title || item.title}</button>{item.meta?.subtitle ? <p className="text-xs text-[#5f646b]">{item.meta.subtitle}</p> : null}</li>)}</ol>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => { openApprovalCentre({ tab: "all" }); }} className="rounded-xl bg-[#14532d] px-3 py-2 text-sm font-medium text-white hover:bg-[#166534] operator-approve" data-operator-approve="true">Open Approval Centre</button>
              <button type="button" onClick={runScanNow} className="rounded-xl bg-[#f97316] px-3 py-2 text-sm font-semibold text-white hover:bg-[#ea580c]">Run today's AI plan</button>
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-[#7b7469] bg-[#d7d0c4] p-5 shadow-[0_14px_35px_rgba(15,17,21,0.16)] border-l-4 border-l-[#f97316] operator-hero" data-smart-hub-hero="true">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#5f646b]">Today&apos;s Plan</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {[["Jobs today", jobsToday], ["Unassigned jobs", unassignedJobs.length], ["Ready to bill", readyToBillJobs.length], ["Open invoices", openInvoices.length], ["Quotes waiting", waitingQuotes.length], ["Crew available", crewAvailable]].map(([label, value]) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() =>
                      ({
                        "Jobs today": () => openWorkspace("Jobs", "list"),
                        "Unassigned jobs": () => openWorkspace("AI Dispatch", "assign"),
                        "Ready to bill": () => openApprovalCentre({ tab: "ready" }),
                        "Open invoices": () => openApprovalCentre({ tab: "drafts" }),
                        "Quotes waiting": () => openApprovalCentre({ tab: "drafts" }),
                        "Crew available": () => openWorkspace("Crew", "list"),
                      }[label]?.())
                    }
                    className="rounded-lg bg-[#c8bfb1] border border-[#7f7668] px-3 py-2 text-left operator-inner" data-smart-hub-inner="true"
                  >
                    <p className="text-xs uppercase tracking-wide text-[#5f646b]">{label}</p>
                    <p className="text-lg font-semibold text-[#0f1115]">{value}</p>
                  </button>
                ))}
              </div>
              <p className="mt-4 rounded-lg bg-[#c8bfb1] px-3 py-2 text-sm text-[#111317]">
                AI found {readyToBillJobs.length} {readyToBillJobs.length === 1 ? "job" : "jobs"} ready to bill, {unassignedJobs.length} unassigned {unassignedJobs.length === 1 ? "job" : "jobs"}, {openInvoices.length} open {openInvoices.length === 1 ? "invoice" : "invoices"} and {waitingQuotes.length} {waitingQuotes.length === 1 ? "quote" : "quotes"} waiting. Best next move: {bestNextMove.label}
              </p>
            </article>

            <article className="rounded-3xl border border-[#7b7469] bg-[#d7d0c4] p-5 shadow-[0_14px_35px_rgba(15,17,21,0.16)] border-l-4 border-l-[#f97316] operator-panel operator-card operator-accent-left" data-smart-hub-card="true">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#5f646b]">Business Pulse</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[["Money waiting", openInvoices.length], ["Billing ready", readyToBillJobs.length], ["Dispatch pressure", unassignedJobs.length], ["Pipeline", waitingQuotes.length], ["Crew", crewAvailable]].map(([label, value]) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() =>
                      ({
                        "Money waiting": () => openWorkspace("Payment Reminders", "reminders"),
                        "Billing ready": () => openApprovalCentre({ tab: "ready" }),
                        "Dispatch pressure": () => openWorkspace("AI Dispatch", "assign"),
                        Pipeline: () => openApprovalCentre({ tab: "drafts" }),
                        Crew: () => openWorkspace("Crew", "list"),
                      }[label]?.())
                    }
                    className="rounded-xl border border-[#8c8274] bg-[#d7d0c4] p-3 text-left"
                  >
                    <p className="text-xs uppercase tracking-wide text-[#5f646b]">{label}</p>
                    <p className="mt-1 text-xl font-semibold text-[#0f1115]">{value}</p>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-6 rounded-3xl border border-[#7f7668] bg-[#d7d0c4] p-4 shadow-[0_12px_30px_rgba(15,17,21,0.18)] operator-panel operator-card" data-smart-hub-card="true">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#5f646b]">Workspace Dock</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {workspaceButtons.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => openWorkspace(name)}
                  className="rounded-2xl border border-[#2a2f36] bg-[#1f242b] px-4 py-3 text-left text-sm font-medium text-white shadow transition hover:bg-[#0d0f12] operator-command-key" data-workspace-key="true"
                >
                  <span className="block">{name}</span>
                  <span className="block text-xs text-white/70">{workspaceMeta[name] || "Open workspace"}</span>
                </button>
              ))}
              <button type="button" onClick={() => openWorkspace("Payment Reminders", "reminders")} className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#ea580c] operator-primary" data-operator-primary="true">Prepare reminders</button>
              <button type="button" onClick={() => openWorkspace("Quote Follow-ups", "followUps")} className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#ea580c] operator-primary" data-operator-primary="true">Review follow-ups</button>
              <button type="button" onClick={() => openWorkspace("AI Dispatch", "assign")} className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#ea580c] operator-primary" data-operator-primary="true">Assign workers</button>
            </div>
          </section>


          <section className="mt-6 rounded-3xl border border-[#7f7668] bg-[#d7d0c4] p-4 shadow-[0_12px_30px_rgba(15,17,21,0.18)] operator-panel operator-card" data-smart-hub-card="true">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#5f646b]">AI Operator Settings</h2>
            <p className="mt-1 text-sm text-[#5f646b]">Control what AI can prepare, approve, and send.</p>
            <div className="mt-2 text-sm text-[#111317] space-y-1">
              <p>AI Operator: {aiSettings.ai_operator_enabled ? "On" : "Off"}</p>
              <p>Arrival SMS: {!aiSettings.auto_arrival_sms_enabled ? "Off" : (aiSettings.arrival_sms_mode === "auto_send" ? "Auto-send" : "Approval required")}</p>
              <p>Arrival timing: {aiSettings.arrival_sms_minutes_before} minutes before</p>
              <p>Invoice reminders: {aiSettings.invoice_reminder_mode === "approval_send" ? "Send after approval" : "Draft only"}</p>
              <p>Quote follow-ups: {aiSettings.quote_followup_mode === "approval_send" ? "Send after approval" : "Draft only"}</p>
              <p>Worker assignment: Approval required</p><p>Accounting changes: Locked</p><p>Payroll changes: Locked</p>
            </div>
            <button type="button" onClick={() => setAiSettingsOpen(true)} className="mt-3 rounded-lg bg-[#f97316] px-3 py-2 text-sm text-white">Open AI Settings</button>
          </section>

          <section className="mt-4 rounded-3xl border border-[#7f7668] bg-[#d7d0c4] p-4 shadow-[0_12px_30px_rgba(15,17,21,0.18)]">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5f646b]">Recent Smart Hub activity</h3>
            <div className="mt-2 flex gap-2">{[["all","All"],["completed","Completed"],["rejected","Rejected"],["draft_prepared","Drafts"]].map(([k,l]) => <button key={k} type="button" onClick={() => setActivityFilter(k)} className={`rounded px-2 py-1 text-xs ${activityFilter===k?"bg-[#20242a] text-white":"bg-[#c8bfb1] text-[#111317]"}`}>{l}</button>)}</div>{!activity.length ? <p className="mt-2 text-sm text-[#5f646b]">No AI actions approved yet. Approved work will appear here.</p> : <ul className="mt-3 space-y-2 text-sm text-[#111317]">{activity.filter((a)=>activityFilter==="all"?true:String(a?.status||"")===activityFilter).map((a) => <li key={String(a?.id||a?._id)} className="rounded-lg border border-[#8c8274] p-2"><p>{a?.message || a?.title}</p><p className="text-xs text-[#5f646b]">{textOr(a?.status, "completed")} · {a?.approved_by_name ? `${a.approved_by_name} · ` : ""}{new Date(a?.created_at || Date.now()).toLocaleString()}</p></li>)}</ul>}
          </section>
        </div>

        {workspaceDrawer ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0d0f12]/75 backdrop-blur-sm p-0 sm:items-center sm:p-6">
            <div className="h-[86vh] w-full max-w-3xl rounded-t-2xl bg-[#d7d0c4] sm:h-auto sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-[#8c8274] px-4 py-3">
                <h2 className="font-semibold text-[#0f1115]">{workspaceDrawer}</h2>
                <button type="button" onClick={() => { setWorkspaceDrawer(""); setWorkspaceMode("list"); setWorkspaceRecord(null); }} className="rounded-md border border-[#8c8274] px-3 py-1 text-sm text-[#111317]">
                  Close
                </button>
              </div>
              <div className="max-h-[72vh] overflow-y-auto p-4">{renderDrawerContent()}</div>
            </div>
          </div>
        ) : null}

        {aiSettingsOpen ? (
          <div className="fixed inset-0 z-[70] bg-[#171717]/70 p-4">
            <div className="mx-auto mt-10 max-w-xl rounded-2xl bg-[#d7d0c4] p-4">
              <h3 className="text-lg font-semibold">AI Operator Settings</h3>
              <div className="mt-3 space-y-2 text-sm">
                <label className="block"><input type="checkbox" checked={!!aiSettings.ai_operator_enabled} onChange={(e)=>setAiSettings((p)=>({...p,ai_operator_enabled:e.target.checked}))} className="mr-2"/>AI Operator: On/Off</label>
                <label className="block"><input type="checkbox" checked={!!aiSettings.auto_arrival_sms_enabled} onChange={(e)=>setAiSettings((p)=>({...p,auto_arrival_sms_enabled:e.target.checked}))} className="mr-2"/>Auto arrival SMS: On/Off</label>
                <label className="block">Arrival SMS timing (minutes before)<input type="number" min="30" max="30" value={30} disabled className="mt-1 w-full rounded border p-2 bg-slate-100" /></label>
                <label className="block">Arrival SMS mode<select value={aiSettings.arrival_sms_mode} onChange={(e)=>setAiSettings((p)=>({...p,arrival_sms_mode:e.target.value}))} className="mt-1 w-full rounded border p-2"><option value="approval_required">Approval required</option><option value="auto_send">Auto send</option></select></label>
                <label className="block">Invoice reminders<select value={aiSettings.invoice_reminder_mode} onChange={(e)=>setAiSettings((p)=>({...p,invoice_reminder_mode:e.target.value}))} className="mt-1 w-full rounded border p-2"><option value="draft_only">Draft only</option><option value="approval_send">Send after approval</option></select></label>
                <label className="block">Quote follow-ups<select value={aiSettings.quote_followup_mode} onChange={(e)=>setAiSettings((p)=>({...p,quote_followup_mode:e.target.value}))} className="mt-1 w-full rounded border p-2"><option value="draft_only">Draft only</option><option value="approval_send">Send after approval</option></select></label>
                <label className="block">Worker assignment<input disabled value="Approval required" className="mt-1 w-full rounded border p-2 bg-slate-100" /></label>
                <label className="block">Accounting changes<input disabled value="Locked" className="mt-1 w-full rounded border p-2 bg-slate-100" /></label>
                <label className="block">Payroll changes<input disabled value="Locked" className="mt-1 w-full rounded border p-2 bg-slate-100" /></label>
              </div>
              <div className="mt-4 flex gap-2"><button type="button" className="rounded bg-[#f97316] px-3 py-2 text-white" onClick={async ()=>{ try { const res = await patch('/api/ai-operator/settings', aiSettings); setAiSettings((p)=>({...p,...(res?.settings||{})})); setToast({kind:'success',message:'AI settings saved.'}); setAiSettingsOpen(false);} catch { localStorage.setItem("smart_hub_ai_settings_local", JSON.stringify(aiSettings)); setToast({kind:'success',message:'Saved locally until backend setting is added.'}); setAiSettingsOpen(false); } }}>Save</button><button type="button" className="rounded border px-3 py-2" onClick={()=>setAiSettingsOpen(false)}>Close</button></div>
            </div>
          </div>
        ) : null}

        {approvalCentreOpen ? (
          <div className="fixed inset-0 z-[80] overflow-hidden bg-[#0d0f12]/75 backdrop-blur-sm">
            <div className="mx-auto flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-[#c8bfb1] sm:my-4 sm:h-[94vh] sm:rounded-3xl">
              <div className="flex-none border-b border-[#8c8274] bg-[#d7d0c4] px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-semibold text-[#0f1115]">AI Approval Centre</h2>
                    <p className="mt-1 text-sm text-[#5f646b]">Review, edit or approve everything AI prepared.</p>
                  </div>
                  <button type="button" onClick={() => setApprovalCentreOpen(false)} className="rounded-xl bg-[#f97316] px-3 py-2 text-sm font-semibold text-white hover:bg-[#ea580c]">Close</button>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{APPROVAL_GROUPS.map((g)=><button key={g} type="button" onClick={()=>setApprovalFilter(g)} className={`shrink-0 rounded px-3 py-1 text-xs ${approvalFilter===g?"bg-[#f97316] text-white":"bg-[#c8bfb1] text-[#111317]"}`}>{g === "all" ? "All" : g.replace("_"," ")} ({approvalCounts[g] || 0})</button>)}</div>
                <div className="mt-2 text-xs text-[#5f646b]">Pending approvals: {approvalCounts.needs_decision || 0} · Selected: {selectedApprovalIds.length}</div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 pb-24">
                {!!sortedApprovalItems.length && <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#8c8274] bg-[#d7d0c4] p-2 text-xs"><span>Visible: {filteredApprovalItems.length}</span><span>Selected: {selectedApprovalIds.length}</span><button type="button" onClick={toggleSelectAllVisible} className="rounded border px-2 py-1">Select all visible</button><button type="button" onClick={clearApprovalSelection} className="rounded border px-2 py-1">Clear selection</button><button type="button" onClick={handleBulkApprove} className="rounded bg-[#f97316] px-2 py-1 text-white">Approve selected</button><button type="button" onClick={handleBulkReject} className="rounded border px-2 py-1">Reject selected</button><button type="button" onClick={handleBulkDelete} className="rounded border px-2 py-1">Archive selected</button><button type="button" onClick={handleBulkMarkCompleted} className="rounded border px-2 py-1">Mark completed</button><button type="button" onClick={() => runBulkAction("/ai-operator/actions/bulk-approve", filteredApprovalItems.map((i) => i.id))} className="rounded border px-2 py-1">Approve all visible</button><button type="button" onClick={() => runBulkAction("/ai-operator/actions/bulk-reject", filteredApprovalItems.map((i) => i.id))} className="rounded border px-2 py-1">Reject all visible</button></div>}
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredApprovalItems.map((item) => {
                    const meta = getActionDisplayMeta(item, { jobs, clients, invoices, quotes, workers });
                    return (
                    <article key={item.id} className="rounded-xl border border-[#8c8274] bg-[#d7d0c4] p-4 shadow-[0_12px_30px_rgba(15,17,21,0.18)]">
                      <div className="flex items-start justify-between"><label className="text-xs"><input type="checkbox" checked={selectedApprovalIds.includes(String(item.id))} onChange={() => toggleApprovalSelection(String(item.id))} className="mr-2" />Select</label><span className="text-xs uppercase">{meta.status}</span></div>
                      <p className="font-semibold text-[#0f1115]">{meta.title}</p><p className="mt-1 text-sm text-[#5f646b]">{meta.subtitle}</p><p className="mt-1 text-sm text-[#111317]">{meta.reason}</p><p className="mt-1 text-xs text-[#5f646b]">{meta.dataUsed}</p><p className="mt-1 text-xs text-[#5f646b]">{meta.whatHappens}</p><p className="mt-1 text-xs text-[#5f646b]">Risk: {meta.risk}</p>{meta.contactSummary ? <p className="mt-1 text-xs text-[#5f646b]">{meta.contactSummary}</p> : null}
                      {item.type === "invoice_reminder" ? <><div className="mt-2 flex gap-1 text-[11px]"><span className="rounded bg-[#c8bfb1] px-2 py-0.5">Email</span><span className="rounded bg-[#c8bfb1] px-2 py-0.5">SMS</span></div><p className="mt-2 rounded bg-[#c8bfb1] p-2 text-xs text-[#111317]">{reminderDrafts[item.relatedId] || buildInvoiceReminderMessage({ client: findByIds(clients, [item.invoice?.client_id, item.invoice?.clientId]), invoice: item.invoice, business: user, channel: "email" })}</p></> : null}
                      {item.type === "quote_follow_up" ? <><div className="mt-2 flex gap-1 text-[11px]"><span className="rounded bg-[#c8bfb1] px-2 py-0.5">Email</span><span className="rounded bg-[#c8bfb1] px-2 py-0.5">SMS</span></div><p className="mt-2 rounded bg-[#c8bfb1] p-2 text-xs text-[#111317]">{quoteDrafts[item.relatedId] || buildQuoteFollowUpMessage({ client: findByIds(clients, [item.quote?.client_id, item.quote?.clientId]), quote: item.quote, business: user, channel: "email" })}</p></> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => approveApprovalItem(item)} className="rounded-xl bg-[#14532d] px-3 py-2 text-sm font-medium text-white hover:bg-[#166534] operator-approve" data-operator-approve="true">Approve</button>
                        <button type="button" onClick={()=>setApprovalDetail(item)} className="rounded-xl bg-[#f97316] px-3 py-2 text-sm font-semibold text-white hover:bg-[#ea580c]">Edit</button>
                        <button type="button" onClick={() => rejectApprovalItem(item)} className="rounded-xl bg-[#f97316] px-3 py-2 text-sm font-semibold text-white hover:bg-[#ea580c]">Reject</button>
                        <button type="button" onClick={()=>setApprovalDetail(item)} className="rounded-xl bg-[#f97316] px-3 py-2 text-sm font-semibold text-white hover:bg-[#ea580c]">Details</button>
                      </div>
                    </article>
                  );})}
                  {!filteredApprovalItems.length ? <article className="rounded-xl border border-[#8c8274] bg-[#d7d0c4] p-4 shadow-[0_12px_30px_rgba(15,17,21,0.18)]"><p className="font-semibold text-[#0f1115]">No actions in this section.</p><div className="mt-3 flex gap-2"><button type="button" onClick={runScanNow} className="rounded-lg bg-[#f97316] px-3 py-2 text-sm text-white">Run today's AI plan</button></div></article> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {toast?.message ? (
          <div className={`fixed bottom-4 right-4 z-[60] rounded-lg px-4 py-2 text-sm text-white ${toast.kind === "error" ? "bg-rose-600" : "bg-emerald-600"}`}>
            {toast.message}
          </div>
        ) : null}

        {loading ? <p className="mx-auto max-w-6xl px-4 pb-6 text-sm text-[#5f646b] sm:px-6 lg:px-8">Loading Smart Hub...</p> : null}
      </div>
    </Layout>
  );
}
