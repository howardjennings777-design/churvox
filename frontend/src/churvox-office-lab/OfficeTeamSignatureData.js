import { useEffect, useMemo, useState } from "react";
import API_BASE from "../lib/apiBase";

const CACHE_MS = 15000;
let signatureCache = { at: 0, value: null, promise: null };

const PREVIEW_JOBS = [
  {
    id: "preview-job-1",
    title: "Smith property tidy-up",
    client_name: "Smith Property",
    worker_name: "Cam",
    status: "completed",
    completed_at: "2026-07-14T01:15:00Z",
    completion_photos: ["photo-1", "photo-2", "photo-3"],
    checklist: [{ done: true }, { done: true }, { done: true }],
    actual_hours: 3.5,
    estimated_hours: 3,
    price: 215,
    extra_amount: 35,
    labour_cost: 92,
    notes: "Green waste removed and side path cleared.",
    recurrence: "fortnightly",
    next_service_date: "2026-07-28",
  },
  {
    id: "preview-job-2",
    title: "Commercial clean closeout",
    client_name: "North Shore Rooms",
    worker_name: "Aroha",
    status: "completed",
    completed_at: "2026-07-13T04:40:00Z",
    completion_photos: [],
    checklist: [{ done: true }, { done: false }],
    actual_hours: 4,
    estimated_hours: 4,
    price: 320,
    labour_cost: 128,
    notes: "Final proof photo still needed from the worker.",
  },
];

const PREVIEW_INVOICES = [
  {
    id: "preview-invoice-1",
    job_id: "preview-job-1",
    invoice_number: "INV-PREVIEW-1",
    customer_name: "Smith Property",
    status: "draft",
    total: 250,
    amount_due: 250,
    due_date: "2026-07-21",
  },
  {
    id: "preview-invoice-2",
    invoice_number: "INV-PREVIEW-2",
    customer_name: "Westside Workshop",
    status: "overdue",
    total: 480,
    amount_due: 480,
    due_date: "2026-07-07",
  },
];

const PREVIEW_QUOTES = [
  { id: "preview-quote-1", customer_name: "Harbour View", status: "viewed", total: 690, updated_at: "2026-07-12" },
];

const PREVIEW_PAYROLL = {
  gross_total: 540,
  period: "This week",
};

function host() {
  const configured = String(API_BASE || "").replace(/\/$/, "");
  if (configured) return configured;
  return typeof window !== "undefined" ? String(window.location.origin || "").replace(/\/$/, "") : "";
}

function token() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}

function headers() {
  const value = token();
  return {
    Accept: "application/json",
    ...(value ? { Authorization: `Bearer ${value}` } : {}),
  };
}

function clean(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function first(item = {}, keys = [], fallback = "") {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && clean(value)) return value;
  }
  return fallback;
}

export function numberValue(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function moneyLabel(value, currency = "NZD") {
  const amount = numberValue(value, 0);
  try {
    return amount.toLocaleString("en-NZ", { style: "currency", currency, maximumFractionDigits: 2 });
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function shortDate(value, fallback = "Not set") {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return clean(value, fallback).slice(0, 24);
  return parsed.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

function normalizedStatus(value, fallback = "review") {
  return clean(value, fallback).toLowerCase().replace(/[-\s]+/g, "_");
}

function extractArray(body, keys, depth = 0) {
  if (depth > 4 || body == null) return [];
  if (Array.isArray(body)) return body;
  if (typeof body !== "object") return [];
  for (const key of keys) {
    const value = body[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = extractArray(value, keys, depth + 1);
      if (nested.length) return nested;
    }
  }
  return [];
}

async function readFirst(paths = [], keys = []) {
  const base = host();
  if (!base) return { body: {}, records: [], source: "unavailable", endpoint: "" };
  let locked = false;
  for (const path of paths) {
    try {
      const response = await fetch(`${base}${path}`, { credentials: "include", cache: "no-store", headers: headers() });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        locked = true;
        continue;
      }
      if (!response.ok || body?.success === false) continue;
      return { body, records: extractArray(body, keys), source: "live", endpoint: path };
    } catch {
      // Try the next compatible endpoint. Empty/error states remain truthful in the UI.
    }
  }
  return { body: {}, records: [], source: locked ? "locked" : "empty", endpoint: "" };
}

function recordId(item = {}, fallback = "record") {
  return clean(first(item, ["id", "_id", "job_id", "invoice_id", "quote_id", "number"], fallback));
}

function evidenceCount(job = {}) {
  const arrays = [job.completion_photos, job.proof_photos, job.photos, job.attachments, job.evidence, job.files];
  return arrays.reduce((highest, value) => Array.isArray(value) ? Math.max(highest, value.filter(Boolean).length) : highest, 0);
}

function checklistProgress(job = {}) {
  const list = [job.checklist, job.checklist_items, job.tasks, job.completion_checklist].find(Array.isArray) || [];
  const total = numberValue(first(job, ["checklist_total", "task_count"], list.length), list.length);
  const completed = list.length
    ? list.filter((item) => item === true || item?.done === true || item?.completed === true || /done|complete|passed/.test(normalizedStatus(item?.status, ""))).length
    : numberValue(first(job, ["checklist_completed", "completed_task_count"], 0), 0);
  return { total, completed };
}

function invoiceForJob(job = {}, invoices = []) {
  const jobId = recordId(job, "");
  const explicitInvoiceId = clean(first(job, ["invoice_id", "invoiceId"], ""));
  const client = clean(first(job, ["client_name", "customer_name", "client", "customer"], "")).toLowerCase();
  return invoices.find((invoice) => {
    const invoiceId = recordId(invoice, "");
    const invoiceJob = clean(first(invoice, ["job_id", "jobId", "source_job_id"], ""));
    const invoiceClient = clean(first(invoice, ["client_name", "customer_name", "client", "customer"], "")).toLowerCase();
    return Boolean(
      (explicitInvoiceId && invoiceId === explicitInvoiceId)
      || (jobId && invoiceJob && invoiceJob === jobId)
      || (client && invoiceClient && client === invoiceClient && /draft|sent|overdue|paid/.test(normalizedStatus(invoice.status, "")))
    );
  }) || null;
}

function normalizeInvoice(item = {}, index = 0) {
  const status = normalizedStatus(first(item, ["status", "payment_status", "state", "stage"], "draft"));
  const total = numberValue(first(item, ["total", "amount", "price", "value", "subtotal"], 0), 0);
  const amountPaid = numberValue(first(item, ["amount_paid", "paid_amount"], 0), 0);
  const amountDue = Math.max(0, numberValue(first(item, ["amount_due", "balance_due", "balance"], total - amountPaid), total - amountPaid));
  const dueDate = first(item, ["due_date", "payment_due", "date_due"], "");
  const dueTime = dueDate ? Date.parse(String(dueDate)) : NaN;
  const now = Date.now();
  const paid = amountDue <= 0 || /paid|settled|complete/.test(status);
  const overdue = !paid && (/overdue/.test(status) || (Number.isFinite(dueTime) && dueTime < now));
  return {
    raw: item,
    id: recordId(item, `invoice-${index}`),
    number: clean(first(item, ["invoice_number", "invoice_no", "number"], `Invoice ${index + 1}`)),
    client: clean(first(item, ["customer_name", "client_name", "customer", "client", "name"], "Customer not found")),
    jobId: clean(first(item, ["job_id", "jobId", "source_job_id"], "")),
    status,
    total,
    amountDue,
    amountPaid,
    dueDate,
    dueTime,
    paid,
    overdue,
    draft: /draft|prepared|pending|unsent/.test(status),
    sent: /sent|viewed|overdue|paid|settled/.test(status),
    description: clean(first(item, ["description", "summary", "notes"], "Owner review required before any send or accounting action.")),
  };
}

function normalizeJob(item = {}, invoices = [], index = 0) {
  const status = normalizedStatus(first(item, ["status", "job_status", "workflow_status", "state", "stage"], "review"));
  const completed = /complete|completed|done|finished|closed/.test(status) || Boolean(first(item, ["completed_at", "completion_date", "finished_at"], ""));
  const proofCount = evidenceCount(item);
  const checklist = checklistProgress(item);
  const actualHours = numberValue(first(item, ["actual_hours", "hours", "total_hours", "duration_hours", "worked_hours"], 0), 0);
  const estimatedHours = numberValue(first(item, ["estimated_hours", "estimate_hours", "quoted_hours", "expected_hours"], 0), 0);
  const extraAmount = numberValue(first(item, ["extra_amount", "extras_total", "additional_amount", "variation_total"], 0), 0);
  const quotedAmount = numberValue(first(item, ["price", "total", "amount", "quoted_total", "quote_total", "invoice_total"], 0), 0);
  const labourCost = numberValue(first(item, ["labour_cost", "labor_cost", "worker_cost", "wage_cost"], 0), 0);
  const materialsCost = numberValue(first(item, ["materials_cost", "material_cost", "supplies_cost"], 0), 0);
  const actualCost = numberValue(first(item, ["actual_cost", "total_cost"], labourCost + materialsCost), labourCost + materialsCost);
  const linkedInvoice = invoiceForJob(item, invoices);
  const client = clean(first(item, ["client_name", "customer_name", "client", "customer", "name"], "Client not found"));
  const worker = clean(first(item, ["worker_name", "assigned_worker_name", "staff_name", "worker", "assigned_to"], ""));
  const blockers = [];
  if (!client || client === "Client not found") blockers.push("Client details are missing");
  if (!worker) blockers.push("Assigned worker is missing");
  if (!proofCount) blockers.push("Completion proof is missing");
  if (checklist.total && checklist.completed < checklist.total) blockers.push(`${checklist.total - checklist.completed} checklist item${checklist.total - checklist.completed === 1 ? " is" : "s are"} incomplete`);
  if (!actualHours) blockers.push("Worker time is missing");
  if (!quotedAmount && !linkedInvoice?.total) blockers.push("Invoice amount is missing");
  const value = linkedInvoice?.total || quotedAmount + extraAmount;
  const profit = value - actualCost;
  return {
    raw: item,
    id: recordId(item, `job-${index}`),
    title: clean(first(item, ["title", "job_title", "job_name", "name", "service", "description"], `Completed job ${index + 1}`)),
    client,
    worker: worker || "Worker not found",
    status,
    completed,
    completedAt: first(item, ["completed_at", "completion_date", "finished_at", "updated_at"], ""),
    scheduledAt: first(item, ["scheduled_date", "date", "start", "start_time"], ""),
    proofCount,
    checklist,
    actualHours,
    estimatedHours,
    extraAmount,
    quotedAmount,
    value,
    actualCost,
    profit,
    notes: clean(first(item, ["completion_notes", "worker_notes", "notes", "summary"], "No completion note was found.")),
    recurrence: clean(first(item, ["recurrence", "frequency", "repeat_rule", "schedule_rule"], "")),
    nextDate: first(item, ["next_service_date", "next_job_date", "next_date"], ""),
    invoice: linkedInvoice,
    blockers,
    ready: completed && blockers.length === 0,
    overEstimate: Boolean(estimatedHours && actualHours > estimatedHours * 1.1),
  };
}

function normalizeQuote(item = {}, index = 0) {
  return {
    raw: item,
    id: recordId(item, `quote-${index}`),
    client: clean(first(item, ["customer_name", "client_name", "customer", "client", "name"], "Customer")),
    status: normalizedStatus(first(item, ["status", "state", "stage"], "draft")),
    total: numberValue(first(item, ["total", "amount", "price", "value"], 0), 0),
    updatedAt: first(item, ["updated_at", "viewed_at", "sent_at", "created_at"], ""),
  };
}

function payrollCost(body = {}, records = []) {
  const candidates = [
    body.gross_total, body.total_gross, body.gross_pay, body.total_pay, body.worker_costs, body.amount,
    body?.summary?.gross_total, body?.summary?.total_gross, body?.data?.gross_total,
  ];
  const direct = candidates.map((value) => numberValue(value, 0)).find((value) => value > 0);
  if (direct) return direct;
  return records.reduce((sum, item) => sum + numberValue(first(item, ["gross_total", "gross_pay", "amount", "cost", "worker_cost"], 0), 0), 0);
}

function buildSnapshot({ jobsSource, invoicesSource, quotesSource, payrollSource, allowFallback }) {
  const usePreview = allowFallback && !jobsSource.records.length && !invoicesSource.records.length && !quotesSource.records.length;
  const rawJobs = usePreview ? PREVIEW_JOBS : jobsSource.records;
  const rawInvoices = usePreview ? PREVIEW_INVOICES : invoicesSource.records;
  const rawQuotes = usePreview ? PREVIEW_QUOTES : quotesSource.records;
  const rawPayrollBody = usePreview ? PREVIEW_PAYROLL : payrollSource.body;
  const rawPayrollRecords = usePreview ? [] : payrollSource.records;
  const invoices = rawInvoices.map(normalizeInvoice);
  const jobs = rawJobs.map((item, index) => normalizeJob(item, invoices, index));
  const quotes = rawQuotes.map(normalizeQuote);
  const workerCosts = payrollCost(rawPayrollBody, rawPayrollRecords);
  const source = usePreview ? "preview" : jobsSource.source === "locked" || invoicesSource.source === "locked" ? "locked" : (jobs.length || invoices.length || quotes.length ? "live" : "empty");
  return {
    source,
    label: source === "live" ? "Live business records" : source === "preview" ? "Example preview records" : source === "locked" ? "Sign in to load live records" : "No live closeout or money records found",
    jobs,
    invoices,
    quotes,
    workerCosts,
    loadedAt: new Date().toISOString(),
  };
}

export async function loadOfficeTeamSignatureData({ allowFallback = false, force = false } = {}) {
  if (!force && signatureCache.value && Date.now() - signatureCache.at < CACHE_MS) return signatureCache.value;
  if (!force && signatureCache.promise) return signatureCache.promise;
  const promise = Promise.all([
    readFirst(["/api/jobs?limit=80", "/api/jobs"], ["jobs", "work", "bookings", "items", "results", "data"]),
    readFirst(["/api/invoices?limit=80", "/api/invoices"], ["invoices", "items", "results", "data"]),
    readFirst(["/api/quotes?limit=80", "/api/quotes"], ["quotes", "items", "results", "data"]),
    readFirst(["/api/payroll/summary", "/api/payroll", "/api/team/workers"], ["payroll", "periods", "workers", "items", "results", "data"]),
  ]).then(([jobsSource, invoicesSource, quotesSource, payrollSource]) => buildSnapshot({ jobsSource, invoicesSource, quotesSource, payrollSource, allowFallback }));
  signatureCache = { ...signatureCache, promise };
  try {
    const value = await promise;
    signatureCache = { at: Date.now(), value, promise: null };
    return value;
  } catch (error) {
    signatureCache = { at: 0, value: null, promise: null };
    throw error;
  }
}

export function useOfficeTeamSignatureData({ allowFallback = false } = {}) {
  const [state, setState] = useState({ source: "loading", label: "Checking completed work and money", jobs: [], invoices: [], quotes: [], workerCosts: 0, loadedAt: "" });
  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, source: "loading", label: "Checking completed work and money" }));
    loadOfficeTeamSignatureData({ allowFallback })
      .then((value) => { if (active) setState(value); })
      .catch(() => { if (active) setState({ source: allowFallback ? "preview" : "error", label: allowFallback ? "Example preview records" : "Live closeout and money records unavailable", jobs: allowFallback ? PREVIEW_JOBS.map((item, index) => normalizeJob(item, PREVIEW_INVOICES.map(normalizeInvoice), index)) : [], invoices: allowFallback ? PREVIEW_INVOICES.map(normalizeInvoice) : [], quotes: allowFallback ? PREVIEW_QUOTES.map(normalizeQuote) : [], workerCosts: allowFallback ? PREVIEW_PAYROLL.gross_total : 0, loadedAt: "" }); });
    return () => { active = false; };
  }, [allowFallback]);
  return state;
}

export function jobDoneCandidates(snapshot = {}) {
  return (snapshot.jobs || []).filter((job) => job.completed).sort((left, right) => Date.parse(right.completedAt || 0) - Date.parse(left.completedAt || 0));
}

export function buildMoneyRadar(snapshot = {}) {
  const jobs = snapshot.jobs || [];
  const invoices = snapshot.invoices || [];
  const quotes = snapshot.quotes || [];
  const completedUninvoiced = jobs.filter((job) => job.completed && !job.invoice);
  const draftInvoices = invoices.filter((invoice) => invoice.draft && !invoice.paid);
  const overdueInvoices = invoices.filter((invoice) => invoice.overdue);
  const now = Date.now();
  const inDays = (days) => now + days * 24 * 60 * 60 * 1000;
  const expected7 = invoices.filter((invoice) => !invoice.paid && invoice.dueTime && invoice.dueTime <= inDays(7)).reduce((sum, invoice) => sum + invoice.amountDue, 0);
  const expected30 = invoices.filter((invoice) => !invoice.paid && (!invoice.dueTime || invoice.dueTime <= inDays(30))).reduce((sum, invoice) => sum + invoice.amountDue, 0)
    + completedUninvoiced.reduce((sum, job) => sum + job.value, 0);
  const workerCosts = numberValue(snapshot.workerCosts, 0);
  const riskJobs = jobs.filter((job) => job.overEstimate || job.extraAmount > 0 || job.blockers.length > 0);
  const quoteFollowups = quotes.filter((quote) => /sent|viewed|follow|pending/.test(quote.status) && !/accepted|declined|expired/.test(quote.status));
  const moneyWaiting = completedUninvoiced.reduce((sum, job) => sum + job.value, 0) + draftInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0);
  const reviewItems = [
    ...completedUninvoiced.map((job) => ({ id: `job-${job.id}`, type: "Completed, not invoiced", title: job.title, client: job.client, value: job.value, status: job.blockers.length ? `${job.blockers.length} closeout checks` : "Ready for invoice draft", detail: job.notes, tone: job.blockers.length ? "warn" : "good", source: job })),
    ...draftInvoices.map((invoice) => ({ id: `invoice-${invoice.id}`, type: "Draft invoice", title: invoice.number, client: invoice.client, value: invoice.amountDue, status: "Waiting for owner approval", detail: invoice.description, tone: "ready", source: invoice })),
    ...overdueInvoices.map((invoice) => ({ id: `overdue-${invoice.id}`, type: "Overdue", title: invoice.number, client: invoice.client, value: invoice.amountDue, status: `Due ${shortDate(invoice.dueDate)}`, detail: "A follow-up can be prepared, but nothing will send without owner approval.", tone: "danger", source: invoice })),
    ...riskJobs.map((job) => ({ id: `risk-${job.id}`, type: "Job margin risk", title: job.title, client: job.client, value: job.profit, status: job.overEstimate ? "Over estimated time" : `${job.blockers.length} closeout checks`, detail: job.extraAmount ? `${moneyLabel(job.extraAmount)} extras detected.` : job.blockers.join(" · "), tone: "warn", source: job })),
    ...quoteFollowups.map((quote) => ({ id: `quote-${quote.id}`, type: "Quote follow-up", title: quote.client, client: quote.client, value: quote.total, status: quote.status.replace(/_/g, " "), detail: "Follow-up can be prepared for owner review.", tone: "neutral", source: quote })),
  ];
  return {
    completedUninvoiced,
    draftInvoices,
    overdueInvoices,
    riskJobs,
    quoteFollowups,
    moneyWaiting,
    expected7,
    expected30,
    workerCosts,
    cash30: expected30 - workerCosts,
    reviewItems,
  };
}

export function signatureOwnerRoute() {
  return typeof window !== "undefined" && String(window.location.pathname || "").includes("dashboard");
}
