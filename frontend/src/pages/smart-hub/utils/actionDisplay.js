import { findByIds, money, safeArray, statusOf, textOr } from './smartHubSafety';
import { invoiceBalance } from './smartHubCounts';

export const ACTIVE_ACTION_STATUSES = ["pending", "ready", "draft", "drafts", "watching", "needs_decision"];
export const DONE_ACTION_STATUSES = ["completed", "approved", "rejected", "dismissed", "resolved", "archived"];
export const isActiveApproval = (item = {}) => {
  const status = statusOf(item?.status);
  return ACTIVE_ACTION_STATUSES.includes(status) && !DONE_ACTION_STATUSES.includes(status);
};
export const APPROVAL_GROUPS = ["all", "needs_decision", "ready", "drafts", "watching", "completed"];

export const getApprovalGroup = (action = {}) => {
  const group = String(action.group || "").toLowerCase();
  if (APPROVAL_GROUPS.includes(group) && group !== "all") return group;
  const status = String(action.status || "").toLowerCase();
  if (["completed", "approved", "done"].includes(status)) return "completed";
  if (["draft", "edited"].includes(status)) return "drafts";
  if (status === "ready") return "ready";
  if (status === "watching") return "watching";
  return "needs_decision";
};
export const approvalDedupKey = (action = {}) => {
  const actionKey = String(action.action_key || action.actionKey || "").trim();
  if (actionKey) return actionKey;
  const type = String(action.type || "unknown");
  const rel = String(action.relatedId || action.related_id || action.related_entity_id || action.invoice_id || action.job_id || action.quote_id || action.client_id || "");
  return `${type}:${rel}`;
};
export const dedupeApprovalActions = (actions = []) => {
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
export const getFilteredApprovalActions = (actions = [], activeTab = 'all') => safeArray(actions).filter((a) => {
  if (activeTab === 'all') return isActiveApproval(a);
  if (activeTab === 'completed') return DONE_ACTION_STATUSES.includes(statusOf(a?.status));
  return isActiveApproval(a) && a.group === activeTab;
});
export const getBestNextMove = ({ readyToBillCount = 0, unassignedJobsCount = 0, openInvoicesCount = 0, quotesWaitingCount = 0, pendingApprovalActions = [] } = {}) => {
  const pending = safeArray(pendingApprovalActions).filter((item) => isActiveApproval(item));
  const highRiskDecisionCount = pending.filter((item) => item.group === "needs_decision" && String(item?.risk || "").toLowerCase() === "high").length;
  if (highRiskDecisionCount > 0) return { key: "needs_decision", label: `Review ${highRiskDecisionCount} high-risk approval${highRiskDecisionCount === 1 ? "" : "s"} now.`, approvalTab: "needs_decision" };
  if (unassignedJobsCount > 0) return { key: "assign_workers", label: `Assign crew to ${unassignedJobsCount} unassigned job${unassignedJobsCount === 1 ? "" : "s"}.`, drawer: "AI Dispatch", mode: "assign", approvalTab: "ready" };
  if (readyToBillCount > 0) return { key: "invoice_drafts", label: `Create draft invoices for ${readyToBillCount} ready-to-bill job${readyToBillCount === 1 ? "" : "s"}.`, drawer: "Invoices", mode: "readyToBill", approvalTab: "ready" };
  if (openInvoicesCount > 0) return { key: "invoice_reminders", label: `Prepare reminders for ${openInvoicesCount} open invoice${openInvoicesCount === 1 ? "" : "s"}.`, drawer: "Payment Reminders", mode: "reminders", approvalTab: "drafts" };
  if (quotesWaitingCount > 0) return { key: "quote_followups", label: `Review follow-ups for ${quotesWaitingCount} waiting quote${quotesWaitingCount === 1 ? "" : "s"}.`, drawer: "Quote Follow-ups", mode: "followUps", approvalTab: "drafts" };
  return { key: "all_clear", label: "All clear — no urgent actions in Smart Hub.", drawer: "Dashboard", mode: "list", approvalTab: "all" };
};

export const getActionDisplayMeta = (item = {}, { jobs = [], clients = [], invoices = [], quotes = [], workers = [] } = {}) => {
  const payload = item?.actionPayload || {};
  const relatedId = String(item?.relatedId || item?.related_id || item?.related_entity_id || "");
  const actionType = String(item?.type || item?.action_type || "").toLowerCase();
  const invoice = item?.invoice || findByIds(invoices, [item?.invoice_id, payload?.invoice_id, relatedId], ["id", "_id", "invoice_id"]);
  const quote = item?.quote || findByIds(quotes, [item?.quote_id, payload?.quote_id, relatedId], ["id", "_id", "quote_id"]);
  const job = item?.job || findByIds(jobs, [item?.job_id, payload?.job_id, relatedId], ["id", "_id", "job_id"]);
  const worker = item?.worker || findByIds(workers, [item?.worker_id, payload?.worker_id, payload?.recommended_worker_id, job?.assigned_worker_id], ["id", "_id", "worker_id"]);
  const client = item?.client || findByIds(clients, [item?.client_id, payload?.client_id, invoice?.client_id, quote?.client_id, job?.client_id], ["id", "_id", "client_id"]);
  const clientName = textOr(client?.name || invoice?.client_name || quote?.client_name || job?.client_name, "No client linked");
  if (actionType === 'invoice_reminder') return { title: `Prepare reminder for ${clientName}`, subtitle: `Invoice ${textOr(invoice?.invoice_number || invoice?.number, 'Open invoice')} · ${money(invoiceBalance(invoice))} outstanding`, reason: item.reason || 'Invoice is unpaid and ready for reminder review.', dataUsed: item.dataUsed || '', whatHappens: item.whatHappens || '', risk: item.risk || 'medium', status: item.status || 'pending' };
  return { title: item.title || 'Approval action', subtitle: item.dataUsed || '', reason: item.reason || 'Review this action.', dataUsed: item.dataUsed || '', whatHappens: item.whatHappens || 'No further change.', risk: item.risk || 'medium', status: item.status || 'pending' };
};
