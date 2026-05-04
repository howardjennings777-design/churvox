import { safeArray } from "./smartHubSafety";

export const invoiceBalance = (inv) => {
  const candidates = [inv?.balance_due, inv?.amount_due, inv?.total_due, inv?.total, inv?.amount];
  const picked = candidates.map((v) => Number(v)).find((v) => Number.isFinite(v));
  return Number.isFinite(picked) ? picked : NaN;
};

export const daysOverdue = (inv) => {
  const explicit = Number(inv?.overdue_days ?? inv?.days_overdue);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const dueDate = inv?.due_date || inv?.dueDate;
  if (!dueDate) return null;
  const ms = Date.now() - new Date(dueDate).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

export const quoteAgeDays = (quote) => {
  const source = quote?.sent_at || quote?.sentAt || quote?.created_at || quote?.createdAt || quote?.date;
  if (!source) return null;
  const ms = Date.now() - new Date(source).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

export const hasInvoiceForJob = (job, invoices) => {
  const jobIds = [job?.id, job?._id, job?.job_id].map((id) => String(id || "")).filter(Boolean);
  if (!jobIds.length) return false;
  return safeArray(invoices).some((inv) => {
    const linked = [inv?.job_id, inv?.jobId, inv?.linked_job_id, inv?.source_job_id].map((id) => String(id || "")).filter(Boolean);
    return linked.some((id) => jobIds.includes(id));
  });
};
