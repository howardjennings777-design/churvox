import React, { useEffect, useMemo, useState } from "react";
import "./ChurvoxAIShell.css";
import "./ChurvoxOperatorOS.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

const APP_PATHS = {
  dashboard: "/dashboard",
  queue: "/dashboard",
  jobs: "/jobs",
  clients: "/clients",
  team: "/team",
  quotes: "/quotes",
  invoices: "/invoices",
  proof: "/proof-to-paid",
  plans: "/plans",
  settings: "/settings",
};

const NAV = [
  ["dashboard", "Smart Hub", "AI command centre"],
  ["jobs", "Jobs", "Dispatch board"],
  ["clients", "Clients", "Customer history"],
  ["team", "Team", "Crew availability"],
  ["quotes", "Quotes", "Sales pipeline"],
  ["invoices", "Invoices", "Cashflow"],
  ["proof", "Proof-to-Paid", "Completed work"],
  ["plans", "Plans", "Billing and trial"],
  ["settings", "Settings", "Business setup"],
];

const WORKER_NAV = [
  ["dashboard", "My Work", "Today’s assigned jobs"],
  ["jobs", "My Jobs", "Start, note, photo, complete"],
];

const PUBLIC_AI_PREVIEW = [
  {
    type: "Dispatch",
    title: "Unassigned job found",
    body: "AI found the gap, checked workload, area and trade fit, then prepared the best worker match. You approve it.",
    action: "Approve match",
    tone: "blue",
  },
  {
    type: "Invoice",
    title: "Draft invoice prepared",
    body: "AI found completed work, shaped the notes, photos and price into a draft invoice, then waits for your review.",
    action: "Review draft",
    tone: "teal",
  },
  {
    type: "Quote",
    title: "Follow-up ready",
    body: "AI found a quiet quote, wrote the follow-up, and keeps it parked until you approve the send.",
    action: "Approve follow-up",
    tone: "purple",
  },
  {
    type: "Cashflow",
    title: "Payment reminder drafted",
    body: "AI found overdue money, prepared a friendly reminder, and protects you from risky auto-send.",
    action: "Review reminder",
    tone: "amber",
  },
];

const AI_ACTIONS = [];

const JOBS = [];
const CLIENTS = [];
const TEAM = [];
const QUOTES = [];
const INVOICES = [];

const AI_APPROVAL_LOG_KEY = "churvox_ai_shell_approval_log";

function readApprovalLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AI_APPROVAL_LOG_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}


async function publicApiPost(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.detail || payload.message || payload.error || `${path} failed`);
  }

  return payload;
}

async function publicApiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.detail || payload.message || payload.error || `${path} failed`);
  }

  return payload;
}

function saveApprovalLog(items) {
  try {
    localStorage.setItem(AI_APPROVAL_LOG_KEY, JSON.stringify(items.slice(0, 5)));
  } catch {
    // ignore storage errors
  }
}

function clearApprovalLogStorage() {
  try {
    localStorage.removeItem(AI_APPROVAL_LOG_KEY);
  } catch {
    // ignore storage errors
  }
}




const CHURVOX_SETUP_PROFILE_KEY = "churvox_setup_profile";

const DEFAULT_SETUP_PROFILE = {
  businessName: "",
  industry: "",
  region: "",
  serviceArea: "",
  invoiceEmail: "",
  invoicePrefix: "INV",
  quotePrefix: "Q",
  ownerApprovalMode: "approval_first",
};

function readChurvoxSetupProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHURVOX_SETUP_PROFILE_KEY) || "{}");
    return {
      ...DEFAULT_SETUP_PROFILE,
      ...(parsed && typeof parsed === "object" ? parsed : {}),
    };
  } catch {
    return { ...DEFAULT_SETUP_PROFILE };
  }
}

function saveChurvoxSetupProfile(profile) {
  try {
    localStorage.setItem(CHURVOX_SETUP_PROFILE_KEY, JSON.stringify({
      ...DEFAULT_SETUP_PROFILE,
      ...(profile || {}),
    }));
  } catch {
    // ignore
  }
}



function readSavedUser() {
  try {
    const parsed = JSON.parse(localStorage.getItem("churvox_user") || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function currentUserIdentity() {
  const user = readSavedUser();

  return {
    id: String(user.id || user._id || user.user_id || "").trim().toLowerCase(),
    email: String(user.email || localStorage.getItem("churvox_email") || "").trim().toLowerCase(),
    name: String(user.name || user.full_name || user.worker_name || "").trim().toLowerCase(),
    role: String(user.role || localStorage.getItem("churvox_role") || "").trim().toLowerCase(),
  };
}

function isWorkerSession() {
  const role = currentUserIdentity().role;
  return ["worker", "employee", "field_worker"].includes(role);
}

function workerAssignmentValue(job, keys) {
  for (const key of keys) {
    const value = job?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim().toLowerCase();
    }
  }

  return "";
}

function jobHasWorkerAssignment(job) {
  return Boolean(workerAssignmentValue(job, [
    "assigned_worker_id",
    "worker_id",
    "assigned_worker",
    "assigned_to",
    "assigned_worker_email",
    "worker_email",
    "assigned_worker_name",
    "worker_name",
  ]));
}

function jobMatchesWorker(job, identity) {
  if (!job || !identity) return false;

  const assignedId = workerAssignmentValue(job, ["assigned_worker_id", "worker_id", "assigned_worker", "assigned_to"]);
  const assignedEmail = workerAssignmentValue(job, ["assigned_worker_email", "worker_email", "employee_email"]);
  const assignedName = workerAssignmentValue(job, ["assigned_worker_name", "worker_name", "employee_name"]);

  if (identity.id && assignedId && assignedId === identity.id) return true;
  if (identity.email && assignedEmail && assignedEmail === identity.email) return true;
  if (identity.name && assignedName && assignedName === identity.name) return true;

  return false;
}

function workerRowsFromData(data) {
  const identity = currentUserIdentity();
  const rawJobs = Array.isArray(data?.raw?.jobs) ? data.raw.jobs : [];
  const hasAssignmentData = rawJobs.some(jobHasWorkerAssignment);

  if (rawJobs.length) {
    const filtered = hasAssignmentData
      ? rawJobs.filter((job) => jobMatchesWorker(job, identity))
      : rawJobs;

    return filtered.map(jobRow);
  }

  return Array.isArray(data?.jobs) ? data.jobs : [];
}

function rowStatus(row) {
  return String(Array.isArray(row) ? row[3] : row?.status || "").toLowerCase();
}


let churvoxAuthExpiredHandled = false;

function clearSavedSession() {
  try {
    [
      "token",
      "authToken",
      "access_token",
      "churvox_user",
      "churvox_role",
      "churvox_email",
      "churvox_owner_name",
    ].forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage errors
  }
}

function notifyAuthExpired() {
  if (typeof churvoxAuthExpiredHandled !== "undefined" && churvoxAuthExpiredHandled) return;
  try {
    churvoxAuthExpiredHandled = true;
  } catch {
    // ignore
  }

  clearSavedSession();

  try {
    window.dispatchEvent(new CustomEvent("churvox:auth-expired"));
  } catch {
    // ignore browser event errors
  }

  try {
    if (window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
  } catch {
    // ignore history errors
  }
}

function hasSavedLogin() {
  try {
    return Boolean(
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token")
    );
  } catch {
    return false;
  }
}

function saveSession(payload) {
  const data = payload?.data || payload || {};
  const token =
    data.access_token ||
    data.token ||
    data.authToken ||
    data.jwt ||
    data?.user?.token ||
    "";

  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("access_token", token);
  }

  const user = data.user || data.account || data.profile || {};
  if (user && typeof user === "object") {
    localStorage.setItem("churvox_user", JSON.stringify(user));
    if (user.name) localStorage.setItem("churvox_owner_name", user.name);
    if (user.email) localStorage.setItem("churvox_email", user.email);
    if (user.role) localStorage.setItem("churvox_role", user.role);
  }
}

async function authRequest(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!res.ok) {
    throw new Error(payload.detail || payload.message || payload.error || "Could not open Churvox");
  }

  return payload;
}


function readToken() {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      ""
    );
  } catch {
    return "";
  }
}

async function apiGet(path) {
  const token = readToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!res.ok) {
    if (res.status === 401) {
      notifyAuthExpired();
      throw new Error("Session expired. Please log in again.");
    }

    throw new Error(payload.detail || payload.message || payload.error || `${path} failed`);
  }

  return payload;
}


async function apiPost(path, body) {
  const token = readToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });

  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!res.ok) {
    if (res.status === 401) {
      notifyAuthExpired();
      throw new Error("Session expired. Please log in again.");
    }

    throw new Error(payload.detail || payload.message || payload.error || `${path} failed`);
  }

  return payload;
}


function toArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  for (const key of ["data", "items", "results", "records"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return Object.values(payload).find(Array.isArray) || [];
}

function textValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function statusText(item, fallback = "Active") {
  return textValue(item?.status, item?.job_status, item?.payment_status, item?.quote_status, item?.state, fallback)
    .replaceAll("_", " ");
}

function initials(name, fallback = "AI") {
  const parts = String(name || fallback).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback.slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function moneyValue(item) {
  const raw = item?.total ?? item?.amount ?? item?.price ?? item?.balance ?? item?.invoice_total ?? item?.quote_total;
  const value = Number(raw || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(value);
}

function jobRow(item, index) {
  const title = textValue(item?.title, item?.job_title, item?.name, item?.service_type, `Job ${index + 1}`);
  const client = textValue(item?.client_name, item?.customer_name, item?.client?.name, item?.address, "No client attached");
  const time = textValue(item?.scheduled_time, item?.start_time, item?.time, item?.scheduled_date, `${index + 1}`);
  return [time, title, client, statusText(item, item?.assigned_worker_id || item?.assigned_worker ? "Assigned" : "Needs worker")];
}

function clientRow(item, index) {
  const name = textValue(item?.client_name, item?.customer_name, item?.name, item?.business_name, `Client ${index + 1}`);
  const detail = textValue(item?.email, item?.phone, item?.address, item?.notes, "Client record");
  return [initials(name, "CL"), name, detail, statusText(item, "Active")];
}

function workerRow(item, index) {
  const name = textValue(item?.name, item?.full_name, item?.worker_name, item?.email, `Worker ${index + 1}`);
  const detail = [item?.role, item?.region, item?.email].filter(Boolean).join(" · ") || "Team member";
  return [initials(name, "WK"), name, detail, statusText(item, "Available")];
}

function quoteRow(item, index) {
  const title = textValue(item?.quote_number, item?.number, item?.title, `Quote ${index + 1}`);
  const client = textValue(item?.client_name, item?.customer_name, item?.client?.name, "Client");
  const amount = moneyValue(item);
  return [title, client, amount || "Quote", statusText(item, "Draft")];
}

function invoiceRow(item, index) {
  const title = textValue(item?.invoice_number, item?.number, item?.title, `Invoice ${index + 1}`);
  const client = textValue(item?.client_name, item?.customer_name, item?.client?.name, "Client");
  const amount = moneyValue(item);
  return [title, client, amount || "Invoice", statusText(item, "Draft")];
}


function aiActionTone(item) {
  const type = String(item?.type || "").toLowerCase();
  const priority = String(item?.priority || "").toLowerCase();

  if (priority === "urgent") return "amber";
  if (type.includes("dispatch")) return "blue";
  if (type.includes("invoice") || type.includes("proof")) return "teal";
  if (type.includes("quote")) return "purple";
  if (type.includes("cashflow")) return "amber";
  return "blue";
}

function aiActionRow(item) {
  return {
    id: textValue(item?.id, item?._id),
    type: textValue(item?.type, "AI"),
    title: textValue(item?.title, "AI action ready"),
    body: textValue(item?.body, item?.reason, "AI prepared this action for owner review."),
    action: textValue(item?.recommended_action, item?.action, "Review"),
    tone: aiActionTone(item),
    status: textValue(item?.status, "pending"),
    source_type: textValue(item?.source_type),
    source_id: textValue(item?.source_id),
    priority: textValue(item?.priority, "normal"),
  };
}

function buildLiveActions(raw) {
  const jobs = Array.isArray(raw.jobs) ? raw.jobs : [];
  const clients = Array.isArray(raw.clients) ? raw.clients : [];
  const team = Array.isArray(raw.team) ? raw.team : [];
  const invoices = Array.isArray(raw.invoices) ? raw.invoices : [];
  const quotes = Array.isArray(raw.quotes) ? raw.quotes : [];

  const actions = [];
  const seen = new Set();

  function clean(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return "";
  }

  function recordId(item = {}) {
    return clean(item.id, item._id, item.job_id, item.invoice_id, item.quote_id, item.client_id, item.request_id);
  }

  function lower(value) {
    return String(value || "").toLowerCase();
  }

  function sourceKey(type, item, fallback = "") {
    return `${type}:${recordId(item) || fallback}`;
  }

  function addAction(action) {
    const key = clean(action.key, `${action.type}:${action.title}:${action.source_id}`);
    if (seen.has(key)) return;
    seen.add(key);
    actions.push({
      status: "prepared",
      priority: action.priority || "normal",
      ...action,
      key,
    });
  }

  function jobTitle(job, fallback = "job") {
    return clean(job.title, job.job_title, job.name, job.service_type, job.address, fallback);
  }

  function clientName(item, fallback = "the client") {
    return clean(item.client_name, item.customer_name, item.client?.name, item.customer?.name, item.name, fallback);
  }

  function addressText(item) {
    return clean(item.address, item.job_address, item.service_address, item.location, "");
  }

  function jobStatus(job) {
    return lower(clean(job.status, job.job_status, job.workflow_status, job.state));
  }

  function isComplete(job) {
    const status = jobStatus(job);
    return status.includes("complete") || status.includes("done") || job.completed === true || Boolean(job.completed_at);
  }

  function isCancelled(job) {
    const status = jobStatus(job);
    return status.includes("cancel");
  }

  function assignedWorker(job) {
    return clean(job.assigned_worker_id, job.worker_id, job.assigned_worker, job.assigned_worker_name, job.worker_name);
  }

  function countPhotos(item = {}) {
    for (const key of ["photos", "worker_photos", "proof_photos", "job_photos", "images"]) {
      if (Array.isArray(item[key])) return item[key].length;
    }
    return Number(item.photo_count || item.photos_count || item.proof_count || 0) || 0;
  }

  function noteText(item = {}) {
    return clean(item.completion_notes, item.worker_notes, item.job_notes, item.notes, item.description, item.message);
  }

  function priceText(item = {}) {
    const amount = moneyValue(item);
    if (amount) return amount;
    const raw = clean(item.job_price, item.fixed_price, item.price, item.amount, item.total, item.balance);
    return raw ? `$${String(raw).replace(/^\$/, "")}` : "";
  }

  function dateText(item = {}) {
    return clean(
      item.scheduled_date,
      item.scheduled_time,
      item.start_time,
      item.completed_at,
      item.due_date,
      item.created_at,
      item.updated_at,
      ""
    );
  }

  function clientHasContact(item = {}) {
    return Boolean(clean(item.client_email, item.customer_email, item.email, item.client_phone, item.customer_phone, item.phone));
  }

  function workerName(worker, fallback = "worker") {
    return clean(worker.name, worker.full_name, worker.worker_name, worker.email, fallback);
  }

  function workerRegion(worker) {
    return lower(clean(worker.region, worker.service_area, worker.area, worker.location));
  }

  function workerRole(worker) {
    return lower(clean(worker.role, worker.trade, worker.skill, worker.skills, worker.position));
  }

  function chooseWorkerForJob(job) {
    if (!team.length) return null;

    const jobRegion = lower(clean(job.region, job.service_area, job.area, job.suburb, job.city, addressText(job)));
    const jobSkill = lower(clean(job.service_type, job.job_type, job.trade, job.title, job.name));

    const scored = team.map((worker) => {
      let score = 0;
      const status = lower(clean(worker.status, worker.availability, "available"));
      const region = workerRegion(worker);
      const role = workerRole(worker);

      if (!status.includes("busy") && !status.includes("off")) score += 2;
      if (jobRegion && region && jobRegion.includes(region)) score += 3;
      if (jobSkill && role && jobSkill.includes(role)) score += 2;
      if (clean(worker.email, worker.phone)) score += 1;

      return { worker, score };
    }).sort((a, b) => b.score - a.score);

    return scored[0]?.worker || team[0];
  }

  const invoicedJobIds = new Set(
    invoices
      .map((invoice) => clean(invoice.job_id, invoice.source_job_id, invoice.ai_source_job_id))
      .filter(Boolean)
  );

  const unassignedJobs = jobs
    .filter((job) => !isComplete(job) && !isCancelled(job) && !assignedWorker(job))
    .slice(0, 4);

  unassignedJobs.forEach((job, index) => {
    const bestWorker = chooseWorkerForJob(job);
    const title = jobTitle(job, `Job ${index + 1}`);
    const client = clientName(job);
    const address = addressText(job);
    const when = dateText(job);
    const worker = bestWorker ? workerName(bestWorker) : "";
    const region = bestWorker ? clean(bestWorker.region, bestWorker.service_area, bestWorker.area) : "";
    const why = worker
      ? `${worker}${region ? ` is the first worker to check because their area is ${region}` : " is the first worker to check from the team list"}.`
      : "No worker records are loaded yet, so Churvox prepared the assignment but needs a worker selected.";

    addAction({
      key: sourceKey("dispatch", job, title),
      type: "Dispatch",
      title: `Assign worker to ${title}`,
      body: `I checked ${client}${address ? ` at ${address}` : ""}${when ? ` for ${when}` : ""}. ${why} Approving will assign the chosen worker and move this job into the run.`,
      action: "Review assignment",
      tone: "blue",
      source_type: "job",
      source_id: recordId(job),
      priority: "high",
      recommendation: why,
      approval_preview: "Assign selected worker, update job status, and prepare worker instructions.",
      raw: job,
    });
  });

  const completedReadyJobs = jobs
    .filter((job) => {
      if (!isComplete(job)) return false;
      const id = recordId(job);
      return !id || !invoicedJobIds.has(id);
    })
    .slice(0, 4);

  completedReadyJobs.forEach((job, index) => {
    const title = jobTitle(job, `Completed job ${index + 1}`);
    const client = clientName(job);
    const address = addressText(job);
    const photos = countPhotos(job);
    const notes = noteText(job);
    const price = priceText(job);
    const contact = clientHasContact(job);
    const invoiceDescription = typeof cxInvoiceDescription === "function"
      ? cxInvoiceDescription(job, title)
      : clean(notes, `${title} completed${address ? ` at ${address}` : ""}.`);

    addAction({
      key: sourceKey("invoice", job, title),
      type: "Invoice",
      title: `Prepare invoice for ${client}`,
      body: `I checked the completed job "${title}"${address ? ` at ${address}` : ""}. ${photos ? `${photos} proof photo${photos === 1 ? "" : "s"} found. ` : "No proof photos found yet. "}${notes ? "Worker notes are available. " : "No worker completion note yet. "}${price ? `Price source found: ${price}. ` : "Amount still needs owner input. "}${contact ? "Client contact is saved." : "Client contact may need checking."}`,
      action: "Review invoice draft",
      tone: "teal",
      source_type: "completed_job",
      source_id: recordId(job),
      priority: price ? "high" : "normal",
      recommendation: invoiceDescription,
      approval_preview: "Create/edit invoice draft from the completed job, proof, notes, and price source.",
      invoice_description: invoiceDescription,
      raw: job,
    });
  });

  invoices
    .filter((invoice) => {
      const status = lower(clean(invoice.status, invoice.invoice_status, invoice.payment_status));
      return status.includes("overdue") || status.includes("unpaid") || Number(invoice.balance || 0) > 0;
    })
    .slice(0, 4)
    .forEach((invoice, index) => {
      const number = clean(invoice.invoice_number, invoice.number, invoice.title, `Invoice ${index + 1}`);
      const client = clientName(invoice);
      const amount = priceText(invoice);
      const due = clean(invoice.due_date, invoice.payment_due_date, "");

      addAction({
        key: sourceKey("cashflow", invoice, number),
        type: "Cashflow",
        title: `Review payment reminder for ${number}`,
        body: `I checked ${number} for ${client}. ${amount ? `Outstanding amount appears to be ${amount}. ` : "Amount needs checking. "}${due ? `Due date: ${due}. ` : ""}I prepared this as an owner-approved reminder so nothing sends blindly.`,
        action: "Review reminder",
        tone: "amber",
        source_type: "invoice",
        source_id: recordId(invoice),
        priority: "high",
        approval_preview: "Save or send the approved payment reminder and log the follow-up.",
        raw: invoice,
      });
    });

  quotes
    .filter((quote) => {
      const status = lower(clean(quote.status, quote.quote_status, quote.state));
      return status.includes("sent") || status.includes("pending") || status.includes("open") || status.includes("follow");
    })
    .slice(0, 4)
    .forEach((quote, index) => {
      const number = clean(quote.quote_number, quote.number, quote.title, `Quote ${index + 1}`);
      const client = clientName(quote);
      const amount = priceText(quote);
      const sent = clean(quote.sent_at, quote.created_at, quote.updated_at, "");

      addAction({
        key: sourceKey("quote", quote, number),
        type: "Quote",
        title: `Prepare follow-up for ${client}`,
        body: `I checked ${number}${amount ? ` worth ${amount}` : ""}${sent ? ` from ${sent}` : ""}. The quote is still open, so I prepared a follow-up for owner review before anything is sent.`,
        action: "Review follow-up",
        tone: "purple",
        source_type: "quote",
        source_id: recordId(quote),
        priority: "normal",
        approval_preview: "Save or send the approved quote follow-up and update the quote follow-up status.",
        raw: quote,
      });
    });

  const missingClientInfo = clients
    .filter((client) => !clean(client.email, client.phone, client.address))
    .slice(0, 3);

  missingClientInfo.forEach((client, index) => {
    const name = clientName(client, `Client ${index + 1}`);
    const missing = [
      clean(client.email) ? "" : "email",
      clean(client.phone) ? "" : "phone",
      clean(client.address) ? "" : "address",
    ].filter(Boolean).join(", ");

    addAction({
      key: sourceKey("client-cleanup", client, name),
      type: "Client cleanup",
      title: `Complete client details for ${name}`,
      body: `I checked this client record and found missing ${missing || "details"}. Completing this helps Churvox prepare jobs, reminders, quotes and invoices without guessing.`,
      action: "Review client details",
      tone: "blue",
      source_type: "client",
      source_id: recordId(client),
      priority: "normal",
      approval_preview: "Update the client record with owner-approved contact details.",
      raw: client,
    });
  });

  if (!clients.length) {
    addAction({
      key: "setup:clients",
      type: "Setup",
      title: "Prepare client import",
      body: "Churvox needs client data before it can prepare jobs, invoices and quote follow-ups properly. Import CSV or add the first client, then Churvox can start preparing real actions.",
      action: "Import or add clients",
      tone: "blue",
      source_type: "setup",
      source_id: "clients",
      priority: "high",
      approval_preview: "Open client setup/import so Churvox can build real client-linked work.",
    });
  }

  if (!team.length) {
    addAction({
      key: "setup:team",
      type: "Setup",
      title: "Prepare worker setup",
      body: "Churvox needs worker names, roles and regions before it can recommend assignments properly. Add workers so dispatch decisions become specific, not generic.",
      action: "Add workers",
      tone: "blue",
      source_type: "setup",
      source_id: "team",
      priority: "high",
      approval_preview: "Team setup so Churvox can prepare worker matches.",
    });
  }

  return actions.slice(0, 12);
}

function useLiveChurvoxData(authed) {
  const [state, setState] = useState({
    loading: false,
    error: "",
    jobs: [],
    clients: [],
    team: [],
    quotes: [],
    invoices: [],
    actions: [],
    operator: {
      dispatch: null,
      recurring: [],
      templates: [],
      setupAudit: null,
      ownerSummary: null,
      cashflow: null,
      workerReport: null,
      quoteReport: null,
      requests: [],
    },
    stats: {
      jobsToday: "0",
      readyToInvoice: "$0",
      openQuotes: "0",
      crewOnline: "0",
    },
    raw: {
      jobs: [],
      clients: [],
      team: [],
      quotes: [],
      invoices: [],
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!authed) return;

      if (!readToken()) {
        notifyAuthExpired();
        return;
      }

      setState((current) => ({ ...current, loading: true, error: "" }));

      const results = await Promise.allSettled([
        apiGet("/jobs"),
        apiGet("/clients"),
        apiGet("/team/workers"),
        apiGet("/quotes"),
        apiGet("/invoices"),
        apiGet("/ai/actions"),
        apiGet("/dispatch/board"),
        apiGet("/recurring-jobs"),
        apiGet("/service-templates"),
        apiGet("/setup/ai-audit"),
        apiGet("/reports/owner-summary"),
        apiGet("/reports/cashflow"),
        apiGet("/reports/workers"),
        apiGet("/reports/quotes"),
        apiGet("/public-job-requests"),
      ]);

      if (cancelled) return;

      const rawJobs = results[0].status === "fulfilled" ? toArray(results[0].value, ["jobs"]) : [];
      const rawClients = results[1].status === "fulfilled" ? toArray(results[1].value, ["clients"]) : [];
      const rawTeam = results[2].status === "fulfilled" ? toArray(results[2].value, ["workers", "team"]) : [];
      const rawQuotes = results[3].status === "fulfilled" ? toArray(results[3].value, ["quotes"]) : [];
      const rawInvoices = results[4].status === "fulfilled" ? toArray(results[4].value, ["invoices"]) : [];
      const rawAiActions = results[5].status === "fulfilled" ? toArray(results[5].value, ["actions"]) : [];
      const rawDispatch = results[6].status === "fulfilled" ? (results[6].value || {}) : {};
      const rawRecurring = results[7].status === "fulfilled" ? toArray(results[7].value, ["recurring_jobs", "items"]) : [];
      const rawTemplates = results[8].status === "fulfilled" ? toArray(results[8].value, ["templates", "items"]) : [];
      const rawSetupAudit = results[9].status === "fulfilled" ? (results[9].value || null) : null;
      const rawOwnerSummary = results[10].status === "fulfilled" ? (results[10].value || null) : null;
      const rawCashflow = results[11].status === "fulfilled" ? (results[11].value || null) : null;
      const rawWorkerReport = results[12].status === "fulfilled" ? (results[12].value || null) : null;
      const rawQuoteReport = results[13].status === "fulfilled" ? (results[13].value || null) : null;
      const rawPublicRequests = results[14].status === "fulfilled" ? toArray(results[14].value, ["requests", "items"]) : [];

      const mappedJobs = rawJobs.map(jobRow);
      const mappedClients = rawClients.map(clientRow);
      const mappedTeam = rawTeam.map(workerRow);
      const mappedQuotes = rawQuotes.map(quoteRow);
      const mappedInvoices = rawInvoices.map(invoiceRow);
      const generatedActions = buildLiveActions({
        jobs: rawJobs,
        clients: rawClients,
        team: rawTeam,
        quotes: rawQuotes,
        invoices: rawInvoices,
      });

      const backendActions = rawAiActions.map(aiActionRow);
      const liveActions = [
        ...generatedActions,
        ...backendActions.filter((item) => {
          const key = `${String(item.source_type || "").toLowerCase()}-${String(item.source_id || "").toLowerCase()}-${String(item.title || "").toLowerCase()}`;
          return !generatedActions.some((generated) => {
            const generatedKey = `${String(generated.source_type || "").toLowerCase()}-${String(generated.source_id || "").toLowerCase()}-${String(generated.title || "").toLowerCase()}`;
            return generatedKey === key;
          });
        }),
      ].slice(0, 12);

      const readyInvoices = rawInvoices.filter((item) => {
        const status = statusText(item, "").toLowerCase();
        return status.includes("draft") || status.includes("ready") || status.includes("overdue");
      });

      const invoiceTotal = readyInvoices.reduce((sum, item) => {
        const value = Number(item?.total ?? item?.amount ?? item?.price ?? item?.balance ?? 0);
        return Number.isFinite(value) ? sum + value : sum;
      }, 0);

      setState({
        loading: false,
        error: results.some((result) => result.status === "rejected") ? "Some live data is still syncing." : "",
        jobs: mappedJobs,
        clients: mappedClients,
        team: mappedTeam,
        quotes: mappedQuotes,
        invoices: mappedInvoices,
        actions: liveActions,
        operator: {
          dispatch: rawDispatch,
          recurring: rawRecurring,
          templates: rawTemplates,
          setupAudit: rawSetupAudit,
          ownerSummary: rawOwnerSummary,
          cashflow: rawCashflow,
          workerReport: rawWorkerReport,
          quoteReport: rawQuoteReport,
          requests: rawPublicRequests,
        },
        stats: {
          jobsToday: String(rawJobs.length),
          readyToInvoice: invoiceTotal > 0
            ? new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(invoiceTotal)
            : "$0",
          openQuotes: String(rawQuotes.length),
          crewOnline: String(rawTeam.length),
        },
        raw: {
          jobs: rawJobs,
          clients: rawClients,
          team: rawTeam,
          quotes: rawQuotes,
          invoices: rawInvoices,
        },
      });
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [authed]);

  return state;
}


function Logo() {
  return (
    <div className="cx-logo">
      <div className="cx-logo-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div>
        <strong>Churvox</strong>
        <span>AI Operator OS</span>
      </div>
    </div>
  );
}

function PublicNav() {
  return (
    <header className="cx-public-nav">
      <a href="#top" className="cx-logo-link">
        <Logo />
      </a>
      <nav>
        <a href="#operator">AI Operator</a>
        <a href="#flow">How it works</a>
        <a href="#features">Features</a>
      </nav>
    </header>
  );
}

function AuthCard({ authMode, setAuthMode, onLogin }) {
  const [form, setForm] = useState({ name: "", business_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signup = authMode === "signup";

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const payload = signup
        ? await authRequest("/auth/register", {
            name: form.name,
            business_name: form.business_name,
            email: form.email,
            password: form.password,
          })
        : await authRequest("/auth/login", {
            email: form.email,
            password: form.password,
          });

      saveSession(payload);
      onLogin();
    } catch (err) {
      setError(err.message || "Could not open Churvox");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="cx-auth-card" id="login">
      <div className="cx-auth-head">
        <div>
          <span>Secure workspace</span>
          <h2>{signup ? "Create account" : "Open Churvox"}</h2>
        </div>
        <div className="cx-auth-orb" />
      </div>

      {error ? <div className="cx-error">{error}</div> : null}

      <form onSubmit={submit} className="cx-form">
        {signup ? (
          <>
            <label>
              Your name
              <input value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" />
            </label>
            <label>
              Business name
              <input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} autoComplete="organization" />
            </label>
          </>
        ) : null}

        <label>
          Email
          <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            autoComplete={signup ? "new-password" : "current-password"}
          />
        </label>

        <button type="submit" disabled={busy}>
          {busy ? "Opening..." : signup ? "Create AI workspace" : "Open AI workspace"}
        </button>
      </form>

      <button
        type="button"
        className="cx-switch"
        onClick={() => {
          setError("");
          setAuthMode(signup ? "login" : "signup");
        }}
      >
        {signup ? "Already have an account? Login" : "Need an account? Start free trial"}
      </button>
    </aside>
  );
}


function PublicJobRequestPage() {
  const params = new URLSearchParams(window.location.search);
  const businessId = params.get("business_id") || params.get("business") || "";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    service_type: "",
    preferred_date: "",
    notes: "",
  });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("Preparing request...");

    try {
      const result = await publicApiPost("/public/job-request", {
        ...form,
        business_id: businessId,
        source: "public_request_page",
      });

      setStatus(result?.message || "Request received. Churvox will prepare it for owner review.");
      setForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        service_type: "",
        preferred_date: "",
        notes: "",
      });
    } catch (err) {
      setStatus(err.message || "Could not send request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="cx-public cx-public-landing cx-public-tool-page" id="top">
      <PublicNav />
      <section className="cx-public-tool-shell">
        <aside>
          <span>Online job request</span>
          <h1>Customers request work. Churvox prepares the draft job.</h1>
          <p>
            The request is saved for owner review. When connected to a business, Churvox can surface it in Smart Hub as a draft job action.
          </p>

          <div className="cx-public-tool-steps">
            <article><b>1</b><div><strong>Customer sends request</strong><small>Details, address, timing and notes.</small></div></article>
            <article><b>2</b><div><strong>AI prepares admin</strong><small>Draft job, client match and next action.</small></div></article>
            <article><b>3</b><div><strong>Owner approves</strong><small>No work is created blindly.</small></div></article>
          </div>
        </aside>

        <form className="cx-public-request-form" onSubmit={submit}>
          <h2>Request work</h2>

          <label>
            Name
            <input required value={form.name} onChange={(event) => update("name", event.target.value)} />
          </label>

          <label>
            Email
            <input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
          </label>

          <label>
            Phone
            <input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </label>

          <label>
            Address
            <input value={form.address} onChange={(event) => update("address", event.target.value)} />
          </label>

          <label>
            Service type
            <select value={form.service_type} onChange={(event) => update("service_type", event.target.value)}>
              <option value="">Choose service</option>
              <option value="Lawn care">Lawn care</option>
              <option value="Property maintenance">Property maintenance</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Handyman">Handyman</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Preferred date
            <input value={form.preferred_date} onChange={(event) => update("preferred_date", event.target.value)} placeholder="e.g. Friday morning" />
          </label>

          <label className="wide">
            What do you need done?
            <textarea required value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </label>

          <button type="submit" disabled={busy}>{busy ? "Sending..." : "Send request"}</button>
          {status ? <p className="cx-public-form-status">{status}</p> : null}
        </form>
      </section>
    </main>
  );
}

function PublicClientPortalPage({ token }) {
  const [state, setState] = useState({ loading: true, error: "", portal: null });
  const [message, setMessage] = useState({ name: "", email: "", message: "" });
  const [paymentNote, setPaymentNote] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPortal() {
      try {
        const payload = await publicApiGet(`/public/client-portal/${encodeURIComponent(token)}`);
        if (!cancelled) {
          setState({ loading: false, error: "", portal: payload.portal || null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ loading: false, error: err.message || "Portal link could not load.", portal: null });
        }
      }
    }

    loadPortal();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const portal = state.portal || {};
  const record = portal.record || {};
  const job = portal.job || {};
  const quote = portal.quote || {};
  const invoice = portal.invoice || {};
  const proof = portal.proof || {};
  const title = record.title || record.name || record.client_name || record.customer_name || quote.title || invoice.invoice_number || job.title || "Client portal";

  function updateMessage(key, value) {
    setMessage((current) => ({ ...current, [key]: value }));
  }

  async function sendMessage(event) {
    event.preventDefault();
    setStatus("Sending message...");

    try {
      const result = await publicApiPost(`/public/client-portal/${encodeURIComponent(token)}/message`, message);
      setStatus(result?.message || "Message sent.");
      setMessage({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus(err.message || "Could not send message.");
    }
  }

  async function approve(approvalType) {
    setStatus("Saving approval...");

    try {
      const result = await publicApiPost(`/public/client-portal/${encodeURIComponent(token)}/approve`, {
        approval_type: approvalType,
        name: message.name,
        email: message.email,
        note: message.message,
      });
      setStatus(result?.message || "Approval saved.");
    } catch (err) {
      setStatus(err.message || "Could not save approval.");
    }
  }

  async function acceptQuote() {
    setStatus("Accepting quote...");

    try {
      const result = await publicApiPost(`/public/quotes/${encodeURIComponent(token)}/accept`, {
        name: message.name,
        email: message.email,
        note: message.message,
      });
      setStatus(result?.message || "Quote accepted.");
    } catch (err) {
      setStatus(err.message || "Could not accept quote.");
    }
  }

  async function declineQuote() {
    setStatus("Saving quote response...");

    try {
      const result = await publicApiPost(`/public/quotes/${encodeURIComponent(token)}/decline`, {
        name: message.name,
        email: message.email,
        reason: message.message,
      });
      setStatus(result?.message || "Quote response saved.");
    } catch (err) {
      setStatus(err.message || "Could not decline quote.");
    }
  }

  async function reportPayment(reportedPaid = false) {
    setStatus(reportedPaid ? "Reporting payment..." : "Sending payment note...");

    try {
      const result = await publicApiPost(`/public/invoices/${encodeURIComponent(token)}/payment-note`, {
        name: message.name,
        email: message.email,
        note: paymentNote || message.message,
        reported_paid: reportedPaid,
      });
      setStatus(result?.message || "Payment update saved.");
      setPaymentNote("");
    } catch (err) {
      setStatus(err.message || "Could not save payment update.");
    }
  }

  if (state.loading) {
    return (
      <main className="cx-public cx-public-landing cx-public-tool-page">
        <PublicNav />
        <section className="cx-public-tool-shell"><aside><h1>Loading client portal...</h1></aside></section>
      </main>
    );
  }

  if (state.error) {
    return (
      <main className="cx-public cx-public-landing cx-public-tool-page">
        <PublicNav />
        <section className="cx-public-tool-shell"><aside><h1>Portal link not found.</h1><p>{state.error}</p></aside></section>
      </main>
    );
  }

  return (
    <main className="cx-public cx-public-landing cx-public-tool-page" id="top">
      <PublicNav />
      <section className="cx-public-tool-shell">
        <aside>
          <span>Proof-to-paid client link</span>
          <h1>{title}</h1>
          <p>{proof.summary || "Work, quote, invoice and messages are ready for review."}</p>

          <div className="cx-client-portal-actions">
            {portal.actions?.pay_url ? (
              <a href={portal.actions.pay_url} target="_blank" rel="noreferrer">Pay now</a>
            ) : null}
            {portal.actions?.can_accept_quote ? (
              <>
                <button type="button" onClick={acceptQuote}>Accept quote</button>
                <button type="button" className="secondary" onClick={declineQuote}>Decline quote</button>
              </>
            ) : null}
            {portal.actions?.can_approve_work ? (
              <button type="button" onClick={() => approve("work_approved")}>Approve work</button>
            ) : null}
          </div>
        </aside>

        <section className="cx-client-portal-card">
          <div className="cx-client-portal-grid">
            <article>
              <span>Job</span>
              <strong>{job.title || job.name || record.job_title || "Job details"}</strong>
              <p>{job.address || job.description || record.address || "No job address shown."}</p>
            </article>

            <article>
              <span>Quote</span>
              <strong>{quote.quote_number || quote.title || "Quote"}</strong>
              <p>{quote.status || quote.quote_status || "Ready for customer review when attached."}</p>
            </article>

            <article>
              <span>Invoice</span>
              <strong>{invoice.invoice_number || record.invoice_number || "Invoice"}</strong>
              <p>{invoice.status || invoice.payment_status || record.payment_status || "Payment status will show here."}</p>
            </article>

            <article>
              <span>Proof</span>
              <strong>{Array.isArray(proof.photos) ? proof.photos.length : 0} photos</strong>
              <p>{proof.summary || "Job proof will show here once attached."}</p>
            </article>
          </div>

          <section className="cx-client-payment-panel">
            <h2>Payment tracking</h2>
            <p>Use this if you have paid already, need the payment link, or want to send a payment note to the business.</p>
            {portal.actions?.pay_url ? (
              <a href={portal.actions.pay_url} target="_blank" rel="noreferrer">Open Pay Now</a>
            ) : null}
            <textarea
              value={paymentNote}
              onChange={(event) => setPaymentNote(event.target.value)}
              placeholder="Payment note, reference, or question..."
            />
            <div>
              <button type="button" onClick={() => reportPayment(false)}>Send payment note</button>
              <button type="button" className="secondary" onClick={() => reportPayment(true)}>I have paid</button>
            </div>
          </section>

          <form className="cx-client-portal-message" onSubmit={sendMessage}>
            <h2>Send a message</h2>
            <input value={message.name} onChange={(event) => updateMessage("name", event.target.value)} placeholder="Your name" />
            <input type="email" value={message.email} onChange={(event) => updateMessage("email", event.target.value)} placeholder="Email" />
            <textarea required value={message.message} onChange={(event) => updateMessage("message", event.target.value)} placeholder="Message or approval note..." />
            <button type="submit">Send message</button>
            {status ? <p className="cx-public-form-status">{status}</p> : null}
          </form>
        </section>
      </section>
    </main>
  );
}


function Landing({ authMode, setAuthMode, onLogin }) {
  return (
    <main className="cx-public cx-public-landing" id="top">
      <div className="cx-grid-bg" />
      <div className="cx-glow cx-glow-a" />
      <div className="cx-glow cx-glow-b" />

      <PublicNav />

      <section className="cx-hero">
        <div className="cx-hero-copy">
          <p className="cx-pill">
            <span />
            AI command centre for trade and service businesses
          </p>

          <h1>
            AI runs the admin.
            <em>You approve the work.</em>
          </h1>

          <p className="cx-hero-text">
            Churvox watches the busy parts of the business, finds what needs doing, prepares the admin,
            and puts it in one owner-safe approval flow.
          </p>

          <div className="cx-hero-actions">
            <a href="#login" className="cx-primary" onClick={() => setAuthMode("login")}>
              Open Churvox
            </a>
            <a href="#operator" className="cx-secondary">
              See AI Operator
            </a>
            <a href="/request" className="cx-secondary">
              Request work demo
            </a>
          </div>

          <div className="cx-proof-strip">
            <article>
              <strong>1 queue</strong>
              <span>Everything ready for approval</span>
            </article>
            <article>
              <strong>Less admin</strong>
              <span>AI prepares the boring work</span>
            </article>
            <article>
              <strong>Owner safe</strong>
              <span>No risky auto-send</span>
            </article>
          </div>
        </div>

        <div className="cx-hero-side">
          <AuthCard authMode={authMode} setAuthMode={setAuthMode} onLogin={onLogin} />

          <section className="cx-public-control-card" aria-label="How Churvox works">
            <span>Owner-safe AI loop</span>
            <h3>Churvox prepares the day before you touch the admin.</h3>

            <div>
              <article>
                <b>Find</b>
                <p>Jobs, overdue invoices, quiet quotes and worker gaps are spotted automatically.</p>
              </article>

              <article>
                <b>Prepare</b>
                <p>AI drafts the worker match, invoice, follow-up or reminder for review.</p>
              </article>

              <article>
                <b>Approve</b>
                <p>Nothing important sends or changes until the owner says yes.</p>
              </article>
            </div>
          </section>
        </div>
      </section>

      <section className="cx-operator-preview" id="operator">
        <div className="cx-section-title">
          <span>AI Operator</span>
          <h2>Better than a dashboard. Churvox finds the work, prepares the action, and waits for approval.</h2>
        </div>

        <div className="cx-ai-card-grid">
          {PUBLIC_AI_PREVIEW.map((item) => (
            <article className={`cx-ai-card ${item.tone}`} key={item.title}>
              <div className="cx-ai-status">Ready for approval</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <button type="button">{item.action}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="cx-flow" id="flow">
        {[
          ["1", "Work comes in", "Jobs, notes, photos, clients, quotes and invoices stay connected."],
          ["2", "AI checks the day", "It finds missing workers, overdue invoices, quote follow-ups and completed jobs."],
          ["3", "AI prepares actions", "Worker matches, invoice drafts, quote nudges and reminders are prepared for review."],
          ["4", "Owner approves", "Nothing important sends, changes or moves until the owner approves it."],
        ].map(([num, title, body]) => (
          <article key={num}>
            <b>{num}</b>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="cx-features" id="features">
        <div>
          <span>Inside Churvox</span>
          <h2>One AI-powered workspace for the whole business.</h2>
          <p className="cx-features-story">
            Everything connects. Jobs create proof. Proof creates invoices. Invoices create follow-ups.
            AI keeps the owner in control from the first job to the final payment.
          </p>

          <div className="cx-flowline">
            <article>
              <b>Job</b>
              <small>Work starts</small>
            </article>
            <article>
              <b>Proof</b>
              <small>Notes + photos</small>
            </article>
            <article>
              <b>Invoice</b>
              <small>Draft prepared</small>
            </article>
            <article>
              <b>Follow-up</b>
              <small>Owner approves</small>
            </article>
          </div>
        </div>

        <div className="cx-feature-list">
          {["Smart Hub", "Owner approvals", "Jobs", "Clients", "Team", "Quotes", "Invoices", "Proof-to-Paid", "Worker App", "Settings"].map((feature) => (
            <article key={feature}>{feature}</article>
          ))}
        </div>
      </section>
    </main>
  );
}


function cxWorkerJobId(job = {}) {
  return String(job.id || job._id || job.job_id || "").trim();
}

function cxWorkerJobTitle(job = {}, fallback = "Assigned job") {
  return textValue(job.title, job.job_title, job.name, job.service_type, fallback);
}

function cxWorkerJobClient(job = {}) {
  return textValue(job.client_name, job.customer_name, job.client?.name, job.customer?.name, "Client");
}

function cxWorkerJobAddress(job = {}) {
  return textValue(job.address, job.job_address, job.service_address, job.location, "Address not set");
}

function cxWorkerJobStatus(job = {}) {
  return String(textValue(job.status, job.job_status, job.workflow_status, job.state, "Assigned")).toLowerCase();
}

function cxWorkerPhotoCount(job = {}) {
  for (const key of ["photos", "worker_photos", "proof_photos", "job_photos", "images"]) {
    if (Array.isArray(job[key])) return job[key].length;
  }
  const raw = Number(job.photo_count || job.photos_count || job.proof_count || 0);
  return Number.isFinite(raw) ? raw : 0;
}

function cxWorkerHasNote(job = {}) {
  return Boolean(textValue(job.completion_notes, job.worker_notes, job.job_notes, job.notes, job.description));
}

function cxWorkerRawJobs(data = {}) {
  const identity = currentUserIdentity();
  const rawJobs = Array.isArray(data?.raw?.jobs) ? data.raw.jobs : [];
  const hasAssignmentData = rawJobs.some(jobHasWorkerAssignment);

  if (!rawJobs.length) return [];

  return hasAssignmentData
    ? rawJobs.filter((job) => jobMatchesWorker(job, identity))
    : rawJobs;
}

function cxWorkerJobNeeds(job = {}) {
  const status = cxWorkerJobStatus(job);
  const needs = [];

  if (!status.includes("progress") && !status.includes("complete") && !status.includes("done")) {
    needs.push("Start job");
  }

  if (!cxWorkerHasNote(job)) {
    needs.push("Add job note");
  }

  if (!cxWorkerPhotoCount(job)) {
    needs.push("Upload proof photo");
  }

  if (!status.includes("complete") && !status.includes("done")) {
    needs.push("Complete job");
  }

  return needs;
}

async function cxWorkerPostFirst(paths, body = {}) {
  let lastError = null;

  for (const path of paths.filter(Boolean)) {
    try {
      return await apiPost(path, body);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Worker action could not be saved.");
}

function WorkerJobDrawer({ job, onClose, onLocalUpdate }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState("");
  const jobId = cxWorkerJobId(job);
  const title = cxWorkerJobTitle(job);
  const client = cxWorkerJobClient(job);
  const address = cxWorkerJobAddress(job);
  const currentStatus = cxWorkerJobStatus(job);
  const proofCount = cxWorkerPhotoCount(job);
  const needs = cxWorkerJobNeeds(job);

  async function runAction(action) {
    setBusy(action);
    setStatus("");

    try {
      if (!jobId) {
        throw new Error("This job needs to be saved before worker actions can sync.");
      }

      const paths = {
        start: [
          `/jobs/${encodeURIComponent(jobId)}/start`,
          `/jobs/${encodeURIComponent(jobId)}/start-job`,
          `/worker/jobs/${encodeURIComponent(jobId)}/start`,
          `/jobs/${encodeURIComponent(jobId)}/time/start`,
        ],
        pause: [
          `/jobs/${encodeURIComponent(jobId)}/pause`,
          `/worker/jobs/${encodeURIComponent(jobId)}/pause`,
          `/jobs/${encodeURIComponent(jobId)}/time/pause`,
        ],
        resume: [
          `/jobs/${encodeURIComponent(jobId)}/resume`,
          `/worker/jobs/${encodeURIComponent(jobId)}/resume`,
          `/jobs/${encodeURIComponent(jobId)}/time/resume`,
        ],
        complete: [
          `/jobs/${encodeURIComponent(jobId)}/complete`,
          `/worker/jobs/${encodeURIComponent(jobId)}/complete`,
          `/jobs/${encodeURIComponent(jobId)}/status`,
        ],
      }[action];

      const payload = {
        job_id: jobId,
        status: action === "complete" ? "completed" : action === "start" ? "in_progress" : action,
        worker_note: note,
        note,
        source: "worker_my_run",
      };

      const result = await cxWorkerPostFirst(paths, payload);
      setStatus(result?.message || `Saved: ${action}`);
      onLocalUpdate?.(jobId, action, result);
    } catch (err) {
      setStatus(err?.message || "Could not save worker action.");
    } finally {
      setBusy("");
    }
  }

  async function saveNote() {
    const cleanNote = String(note || "").trim();
    if (!cleanNote) {
      setStatus("Add a note first.");
      return;
    }

    setBusy("note");
    setStatus("");

    try {
      if (!jobId) {
        throw new Error("This job needs to be saved before notes can sync.");
      }

      const result = await cxWorkerPostFirst([
        `/jobs/${encodeURIComponent(jobId)}/notes`,
        `/worker/jobs/${encodeURIComponent(jobId)}/notes`,
        `/jobs/${encodeURIComponent(jobId)}/add-note`,
      ], {
        job_id: jobId,
        note: cleanNote,
        notes: cleanNote,
        message: cleanNote,
        source: "worker_my_run",
      });

      setStatus(result?.message || "Note saved for owner review.");
      onLocalUpdate?.(jobId, "note", result);
    } catch (err) {
      setStatus(err?.message || "Could not save note.");
    } finally {
      setBusy("");
    }
  }

  async function uploadPhoto(file) {
    if (!file) return;

    setBusy("photo");
    setStatus("");

    try {
      if (!jobId) {
        throw new Error("This job needs to be saved before photos can sync.");
      }

      const token = readToken();
      const endpoints = [
        `/jobs/${encodeURIComponent(jobId)}/photos`,
        `/worker/jobs/${encodeURIComponent(jobId)}/photos`,
        `/jobs/${encodeURIComponent(jobId)}/upload-photo`,
      ];

      let lastError = null;

      for (const path of endpoints) {
        try {
          const form = new FormData();
          form.append("file", file);
          form.append("photo", file);
          form.append("job_id", jobId);
          form.append("source", "worker_my_run");

          const res = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: form,
          });

          const payload = await res.json().catch(() => ({}));

          if (!res.ok) {
            throw new Error(payload.detail || payload.message || `${path} failed`);
          }

          setStatus(payload?.message || "Photo uploaded for owner approval.");
          onLocalUpdate?.(jobId, "photo", payload);
          setBusy("");
          return;
        } catch (err) {
          lastError = err;
        }
      }

      throw lastError || new Error("Photo upload failed.");
    } catch (err) {
      setStatus(err?.message || "Could not upload photo.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="cx-worker-drawer-backdrop" onClick={onClose}>
      <section className="cx-worker-drawer" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>Worker run</span>
            <h2>{title}</h2>
            <p>{client} · {address}</p>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <section className="cx-worker-job-machine">
          <article>
            <span>Churvox prepared</span>
            <strong>Your job flow</strong>
            <p>Start the job, add proof, complete the work. Churvox turns your notes and photos into owner approval work.</p>
          </article>
          <article>
            <span>Status</span>
            <strong>{currentStatus.replaceAll("_", " ")}</strong>
            <p>{proofCount} proof photo{proofCount === 1 ? "" : "s"} saved.</p>
          </article>
        </section>

        <section className="cx-worker-needs-panel">
          <span>Churvox needs from you</span>
          <div>
            {needs.map((item) => <b key={item}>{item}</b>)}
          </div>
        </section>

        <section className="cx-worker-job-detail-grid">
          <article>
            <span>Instructions</span>
            <p>{textValue(job.description, job.instructions, job.owner_notes, job.notes, "No special instructions added yet.")}</p>
          </article>
          <article>
            <span>Time</span>
            <p>{textValue(job.scheduled_time, job.start_time, job.scheduled_date, "No time set")}</p>
          </article>
        </section>

        <label className="cx-worker-note-box">
          Add job note for owner approval
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What did you do? Any issue? Anything the owner should know before invoice/proof approval?"
          />
        </label>

        <section className="cx-worker-proof-actions">
          <button type="button" disabled={busy === "start"} onClick={() => runAction("start")}>
            {busy === "start" ? "Starting..." : "Start job"}
          </button>
          <button type="button" disabled={busy === "pause"} onClick={() => runAction("pause")}>
            Pause
          </button>
          <button type="button" disabled={busy === "resume"} onClick={() => runAction("resume")}>
            Resume
          </button>
          <button type="button" disabled={busy === "note"} onClick={saveNote}>
            Save note
          </button>
          <label>
            Upload photo
            <input
              type="file"
              accept="image/*"
              onChange={(event) => uploadPhoto(event.target.files?.[0])}
            />
          </label>
          <button type="button" className="complete" disabled={busy === "complete"} onClick={() => runAction("complete")}>
            {busy === "complete" ? "Completing..." : "Complete job"}
          </button>
        </section>

        {status ? <p className="cx-worker-action-status">{status}</p> : null}
      </section>
    </div>
  );
}

function WorkerJobCard({ job, index, onOpen }) {
  const title = cxWorkerJobTitle(job, `Job ${index + 1}`);
  const client = cxWorkerJobClient(job);
  const address = cxWorkerJobAddress(job);
  const status = cxWorkerJobStatus(job);
  const needs = cxWorkerJobNeeds(job);
  const proofCount = cxWorkerPhotoCount(job);

  return (
    <button type="button" className={`cx-worker-job-card status-${status.replace(/[^a-z0-9]+/g, "-")}`} onClick={() => onOpen(job)}>
      <span>{status.includes("complete") ? "Sent to owner" : status.includes("progress") ? "In progress" : "Ready"}</span>
      <strong>{title}</strong>
      <small>{client} · {address}</small>
      <div>
        <b>{proofCount} photo{proofCount === 1 ? "" : "s"}</b>
        <em>{needs[0] || "Owner approval next"}</em>
      </div>
    </button>
  );
}

function WorkerMyRun({ page, setPage, data }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [localEvents, setLocalEvents] = useState([]);
  const jobs = cxWorkerRawJobs(data);
  const statusTextFor = (job) => cxWorkerJobStatus(job);

  const activeJobs = jobs.filter((job) => {
    const status = statusTextFor(job);
    return status.includes("progress") || status.includes("paused");
  });

  const readyJobs = jobs.filter((job) => {
    const status = statusTextFor(job);
    return !status.includes("complete") && !status.includes("done") && !status.includes("cancel") && !status.includes("progress") && !status.includes("paused");
  });

  const proofNeededJobs = jobs.filter((job) => {
    const status = statusTextFor(job);
    return !status.includes("complete") && (!cxWorkerPhotoCount(job) || !cxWorkerHasNote(job));
  });

  const completedJobs = jobs.filter((job) => {
    const status = statusTextFor(job);
    return status.includes("complete") || status.includes("done") || job.completed === true;
  });

  const nextJob = activeJobs[0] || readyJobs[0] || jobs[0];

  function rememberLocalUpdate(jobId, action, result) {
    const title = selectedJob ? cxWorkerJobTitle(selectedJob) : "Job";
    setLocalEvents((current) => [{
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      title,
      action,
      message: result?.message || `${action} saved`,
      jobId,
    }, ...current].slice(0, 5));
  }

  return (
    <section className="cx-worker-run">
      <section className="cx-worker-run-hero">
        <div>
          <span>My Run</span>
          <h1>Churvox has prepared your work.</h1>
          <p>Follow the run, add notes and photos, then complete the job. Your proof feeds the owner approval flow.</p>
        </div>
        <aside>
          <span>Today</span>
          <strong>{jobs.length}</strong>
          <p>{activeJobs.length ? "You have a job in progress." : readyJobs.length ? "Your next job is ready." : "No active job waiting."}</p>
        </aside>
      </section>

      <section className="cx-worker-run-grid">
        <article className="cx-worker-panel cx-worker-next-panel">
          <header>
            <div>
              <span>Ready now</span>
              <h2>{nextJob ? cxWorkerJobTitle(nextJob) : "No assigned job yet"}</h2>
              <p>{nextJob ? `${cxWorkerJobClient(nextJob)} · ${cxWorkerJobAddress(nextJob)}` : "When the owner assigns work, Churvox will show it here."}</p>
            </div>
          </header>

          {nextJob ? (
            <div className="cx-worker-next-actions">
              <button type="button" onClick={() => setSelectedJob(nextJob)}>Open job flow</button>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cxWorkerJobAddress(nextJob))}`} target="_blank" rel="noreferrer">
                Directions
              </a>
            </div>
          ) : null}
        </article>

        <article className="cx-worker-panel">
          <header>
            <span>Churvox needs proof</span>
            <h2>{proofNeededJobs.length} job{proofNeededJobs.length === 1 ? "" : "s"}</h2>
            <p>Notes and photos help Churvox prepare invoice/proof work for owner approval.</p>
          </header>
        </article>

        <article className="cx-worker-panel">
          <header>
            <span>Sent to owner</span>
            <h2>{completedJobs.length} complete</h2>
            <p>Completed work is sent back into the owner approval machine.</p>
          </header>
        </article>
      </section>

      <section className="cx-worker-run-board">
        <div>
          <span>Ready / In progress</span>
          <h2>Today’s assigned jobs</h2>
        </div>

        <div className="cx-worker-job-grid">
          {[...activeJobs, ...readyJobs].length ? (
            [...activeJobs, ...readyJobs].map((job, index) => (
              <WorkerJobCard job={job} index={index} onOpen={setSelectedJob} key={cxWorkerJobId(job) || `${index}-${cxWorkerJobTitle(job)}`} />
            ))
          ) : (
            <EmptyState
              title="No jobs assigned right now."
              body="When the owner assigns work, Churvox will prepare your run here."
            />
          )}
        </div>
      </section>

      <section className="cx-worker-run-board">
        <div>
          <span>Completed</span>
          <h2>Sent for owner approval</h2>
        </div>

        <div className="cx-worker-job-grid">
          {completedJobs.length ? completedJobs.map((job, index) => (
            <WorkerJobCard job={job} index={index} onOpen={setSelectedJob} key={cxWorkerJobId(job) || `done-${index}-${cxWorkerJobTitle(job)}`} />
          )) : (
            <EmptyState
              title="No completed jobs yet."
              body="Completed jobs will show here after you finish them and send proof back to the owner."
            />
          )}
        </div>
      </section>

      {localEvents.length ? (
        <section className="cx-worker-run-log">
          <span>Worker updates</span>
          {localEvents.map((event) => (
            <article key={`${event.time}-${event.title}-${event.action}`}>
              <b>{event.time}</b>
              <strong>{event.title}</strong>
              <small>{event.message}</small>
            </article>
          ))}
        </section>
      ) : null}

      <WorkerJobDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onLocalUpdate={rememberLocalUpdate}
      />
    </section>
  );
}



function Shell({ page, setPage, onLogout, data }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const workerMode = isWorkerSession();
  const navItems = workerMode ? WORKER_NAV : NAV;
  const safePage = workerMode && !["dashboard", "jobs"].includes(page) ? "dashboard" : page;
  const current = navItems.find(([key]) => key === safePage) || navItems[0];

  function choosePage(key) {
    setPage(key);
    setMobileOpen(false);
  }

  return (
    <main className={`cx-app ${workerMode ? "cx-worker-app" : ""}`}>
      <aside className={`cx-sidebar ${mobileOpen ? "open" : ""}`}>
        <Logo />

        <nav className="cx-app-nav">
          {navItems.map(([key, label, sub]) => (
            <button
              type="button"
              key={key}
              className={safePage === key ? "active" : ""}
              onClick={() => choosePage(key)}
            >
              <span>{label}</span>
              <small>{sub}</small>
            </button>
          ))}
        </nav>

        <section className="cx-side-operator">
          <span>{workerMode ? "My Run" : "AI Operator"}</span>
          <strong>
            {workerMode
              ? `${cxWorkerRawJobs(data).length} assigned`
              : `${(data?.actions?.length || 0)} actions ready`}
          </strong>
          <p>
            {workerMode
              ? "Churvox prepared your jobs. Add proof and complete the work."
              : "Prepared for owner approval."}
          </p>
        </section>
      </aside>

      <section className="cx-app-main">
        <header className="cx-topbar">
          <button className="cx-menu" type="button" onClick={() => setMobileOpen(!mobileOpen)}>
            ☰
          </button>

          <div>
            <strong>{current[1]}</strong>
            <span>{current[2]}</span>
          </div>

          <input placeholder={workerMode ? "Search my assigned jobs..." : "Search jobs, clients, invoices..."} />

          <button type="button" className="cx-top-primary" onClick={() => choosePage(workerMode ? "dashboard" : "jobs")}>
            {workerMode ? "Open my run" : "Jobs"}
          </button>
          <button type="button" className="cx-logout" onClick={onLogout}>
            Logout
          </button>
        </header>

        {workerMode ? (
          <WorkerMyRun page={safePage} setPage={setPage} data={data} />
        ) : (
          <Workspace page={safePage} setPage={setPage} data={data} />
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, note }) {
  return (
    <article className="cx-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}


function WorkspaceHero({ kicker, title, body, metric, action, setPage }) {
  return (
    <section className="cx-work-hero">
      <div>
        <span>{kicker}</span>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      <aside>
        <span>AI Operator</span>
        <strong>{metric}</strong>
        <p>{action}</p>
        <button type="button" onClick={() => setPage("dashboard")}>Return to Smart Hub</button>
      </aside>
    </section>
  );
}

function MiniRow({ item }) {
  return (
    <button type="button" className="cx-row">
      <span>{item[0]}</span>
      <strong>{item[1]}</strong>
      <small>{item[2]}</small>
      <b>{item[3]}</b>
    </button>
  );
}

function EmptyState({ title, body, action, onAction }) {
  return (
    <article className="cx-empty-state">
      <span>Ready when you are</span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action ? <button type="button" onClick={onAction}>{action}</button> : null}
    </article>
  );
}

function ActionQueue({ actions = [] }) {
  return (
    <section className="cx-action-board">
      {actions.length ? actions.map((item) => (
        <article className={`cx-work-action ${item.tone || "blue"}`} key={item.title}>
          <span>{item.type}</span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <button type="button">{item.action}</button>
        </article>
      )) : (
        <EmptyState
          title="No AI approvals waiting."
          body="When jobs, invoices, quotes, or payment follow-ups need a decision, Churvox will show them here."
        />
      )}
    </section>
  );
}

function Board({ title, body, columns, setPage }) {
  return (
    <section className="cx-workspace">
      <WorkspaceHero
        kicker="Workspace"
        title={title}
        body={body}
        metric="AI ready"
        action="Smart actions prepared."
        setPage={setPage}
      />

      <section className="cx-board">
        {columns.map(([name, rows]) => (
          <article className="cx-column" key={name}>
            <span>Stage</span>
            <h3>{name}</h3>
            {rows.length ? rows.map((row, index) => (
              <MiniRow item={row} key={`${name}-${index}-${row[1]}`} />
            )) : (
              <EmptyState
                title={`No ${name.toLowerCase()} records yet.`}
                body="Real business records will appear here once they are added or imported."
              />
            )}
          </article>
        ))}
      </section>
    </section>
  );
}

function Dashboard({ setPage, data }) {
  const actions = data?.actions || [];
  const jobs = data?.jobs || [];
  const team = data?.team || [];
  const stats = data?.stats || {};

  return (
    <section className="cx-workspace">
      <WorkspaceHero
        kicker="Smart Hub"
        title="AI has prepared today’s business actions."
        body={data?.loading ? "Syncing your live Churvox workspace..." : data?.error || "Start with decisions, not clutter. Churvox turns admin into a simple approval queue."}
        metric={`${actions.length} ready`}
        action="Dispatch, invoice, quote and cashflow actions prepared."
        setPage={setPage}
      />

      {page !== "dashboard" ? (
        <section className="cx-deep-workspace-brief">
          <div>
            <span>{current.kicker}</span>
            <h2>{current.title}</h2>
            <p>{current.body}</p>
          </div>
          <button type="button" onClick={() => switchPage("dashboard")}>Back to Smart Hub</button>
        </section>
      ) : null}

      {page === "settings" ? (
        <SetupGuide
          profile={setupProfile}
          setupChecks={setupChecks}
          setupScore={setupScore}
          setupSaved={setupSaved}
          onChange={updateSetupProfileField}
          onSave={saveSetupProfileLocal}
          onOpenClients={() => switchPage("clients")}
          onOpenTeam={() => switchPage("team")}
          onOpenJobs={() => switchPage("jobs")}
          onOpenQuotes={() => switchPage("quotes")}
        />
      ) : null}

      <section className={`cx-stats ${page === "dashboard" ? "cx-hide-on-smart-hub" : ""}`}>
        <Stat label="Jobs today" value={stats.jobsToday || String(jobs.length)} note="live workspace count" />
        <Stat label="Ready to invoice" value={stats.readyToInvoice || "$0"} note="drafts and follow-ups" />
        <Stat label="Quotes" value={stats.openQuotes || "0"} note="pipeline watched" />
        <Stat label="Crew online" value={stats.crewOnline || String(team.length)} note="team records" />
      </section>

      <ActionQueue actions={actions} />

      <section className="cx-split">
        <section className="cx-panel">
          <header><div><span>Live field work</span><h2>Today’s run sheet</h2></div></header>
          <div className="cx-panel-list">
            {jobs.length ? jobs.map((item, index) => <MiniRow item={item} key={`job-${index}-${item[1]}`} />) : (
              <EmptyState
                title="No jobs yet."
                body="Create your first job and Churvox will start building today’s run sheet."
                action="Jobs"
                onAction={() => setPage("jobs")}
              />
            )}
          </div>
        </section>

        <section className="cx-panel">
          <header><div><span>AI worker matching</span><h2>Crew status</h2></div></header>
          <div className="cx-panel-list">
            {team.length ? team.map((item, index) => <MiniRow item={item} key={`team-${index}-${item[1]}`} />) : (
              <EmptyState
                title="No workers added yet."
                body="Add workers so Churvox can recommend assignments and show crew capacity."
                action="Team"
                onAction={() => setPage("team")}
              />
            )}
          </div>
        </section>
      </section>
    </section>
  );
}




function SetupGuide({
  profile,
  setupChecks,
  setupScore,
  setupSaved,
  onChange,
  onSave,
  onOpenClients,
  onOpenTeam,
  onOpenJobs,
  onOpenQuotes,
}) {
  const missing = setupChecks.filter((item) => !item.done);

  return (
    <section className="cx-setup-guide">
      <header>
        <div>
          <span>Setup Guide</span>
          <h2>Teach Churvox how your business runs.</h2>
          <p>These details help AI make better worker, invoice, quote and reminder recommendations.</p>
        </div>
        <aside>
          <strong>{setupScore}%</strong>
          <small>setup complete</small>
        </aside>
      </header>

      <section className="cx-setup-grid">
        <label>
          Business name
          <input value={profile.businessName} onChange={(e) => onChange("businessName", e.target.value)} placeholder="Your business name" />
        </label>

        <label>
          Industry / trade
          <select value={profile.industry} onChange={(e) => onChange("industry", e.target.value)}>
            <option value="">Choose industry</option>
            <option value="lawn_care">Lawn Care</option>
            <option value="landscaping">Landscaping</option>
            <option value="cleaning">Cleaning</option>
            <option value="handyman">Handyman</option>
            <option value="painting">Painting</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="pest_control">Pest Control</option>
            <option value="gardening">Gardening</option>
            <option value="property_maintenance">Property Maintenance</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label>
          Main region
          <input value={profile.region} onChange={(e) => onChange("region", e.target.value)} placeholder="e.g. Wellington" />
        </label>

        <label>
          Service area
          <input value={profile.serviceArea} onChange={(e) => onChange("serviceArea", e.target.value)} placeholder="e.g. Lower Hutt, Porirua, Wellington" />
        </label>

        <label>
          Invoice email
          <input type="email" value={profile.invoiceEmail} onChange={(e) => onChange("invoiceEmail", e.target.value)} placeholder="accounts@business.co.nz" />
        </label>

        <label>
          Invoice prefix
          <input value={profile.invoicePrefix} onChange={(e) => onChange("invoicePrefix", e.target.value)} placeholder="INV" />
        </label>

        <label>
          Quote prefix
          <input value={profile.quotePrefix} onChange={(e) => onChange("quotePrefix", e.target.value)} placeholder="Q" />
        </label>

        <label>
          AI approval mode
          <select value={profile.ownerApprovalMode} onChange={(e) => onChange("ownerApprovalMode", e.target.value)}>
            <option value="approval_first">Approval-first</option>
            <option value="draft_only">Draft-only</option>
          </select>
        </label>
      </section>

      <footer>
        <button type="button" onClick={onSave}>Save setup</button>
        {setupSaved ? <p>{setupSaved}</p> : null}
      </footer>

      <section className="cx-setup-checklist">
        <header>
          <span>AI readiness checklist</span>
          <h3>{missing.length ? `${missing.length} setup item${missing.length === 1 ? "" : "s"} left` : "Setup is looking strong"}</h3>
        </header>

        <div>
          {setupChecks.map((item) => (
            <article className={item.done ? "done" : ""} key={item.key}>
              <b>{item.done ? "✓" : "!"}</b>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
              {item.action === "clients" ? <button type="button" onClick={onOpenClients}>Open clients</button> : null}
              {item.action === "team" ? <button type="button" onClick={onOpenTeam}>Team</button> : null}
              {item.action === "jobs" ? <button type="button" onClick={onOpenJobs}>Jobs</button> : null}
              {item.action === "quotes" ? <button type="button" onClick={onOpenQuotes}>Quotes</button> : null}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}


const OWNER_COMMAND_LOG_KEY = "churvox_owner_command_log";

function readOwnerCommandLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OWNER_COMMAND_LOG_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveOwnerCommandLog(items) {
  try {
    localStorage.setItem(OWNER_COMMAND_LOG_KEY, JSON.stringify(items.slice(0, 8)));
  } catch {
    // ignore storage errors
  }
}


const SMART_HUB_ITEM_STATUS_KEY = "churvox_smart_hub_item_status";

function readSmartHubItemStatus() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SMART_HUB_ITEM_STATUS_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveSmartHubItemStatus(items) {
  try {
    localStorage.setItem(SMART_HUB_ITEM_STATUS_KEY, JSON.stringify(items || {}));
  } catch {
    // ignore storage errors
  }
}


function rowText(item, index, fallback = "Record") {
  if (Array.isArray(item)) {
    return {
      lead: textValue(item[0], fallback),
      title: textValue(item[1], `${fallback} ${index + 1}`),
      detail: textValue(item[2], "No details yet"),
      status: textValue(item[3], "Review"),
    };
  }

  const title = textValue(
    item?.title,
    item?.subject,
    item?.job_title,
    item?.name,
    item?.client_name,
    item?.customer_name,
    item?.quote_number,
    item?.invoice_number,
    item?.email,
    item?.kind,
    `${fallback} ${index + 1}`
  );

  const detail = textValue(
    item?.message,
    item?.body,
    item?.description,
    item?.notes,
    item?.address,
    item?.email,
    item?.phone,
    item?.client_name,
    item?.customer_name,
    "No details yet"
  );

  return {
    lead: textValue(item?.type, item?.role, fallback),
    title,
    detail,
    status: statusText(item, "Review"),
  };
}

function draftFromSelection(selection) {
  const row = rowText(selection?.item, 0, selection?.label || "Record");
  return {
    title: row.title,
    detail: row.detail,
    status: row.status,
    ownerNote: "",
    customerMessage: "",
    internalDecision: "",
  };
}

function workspacePathForPage(page) {
  const paths = {
    dashboard: "/dashboard",
    queue: "/dashboard",
    jobs: "/jobs",
    clients: "/clients",
    team: "/team",
    quotes: "/quotes",
    invoices: "/invoices",
    proof: "/proof-to-paid",
    settings: "/settings",
  };
  return paths[page] || "/dashboard";
}

function OwnerCommandModal({ selection, onClose, onSaveDraft, onApprove, setPage }) {
  const [draft, setDraft] = useState(() => draftFromSelection(selection));
  const [portalLinkStatus, setPortalLinkStatus] = useState("");

  useEffect(() => {
    setDraft(draftFromSelection(selection));
    setPortalLinkStatus("");
  }, [selection]);

  if (!selection) return null;

  const row = rowText(selection.item, 0, selection.label || "Record");
  const approvalText = String(selection.group || "").toLowerCase();
  const isApprovalFlow = (
    selection.fromSmartHubModal ||
    approvalText.includes("approve") ||
    approvalText.includes("dispatch") ||
    approvalText.includes("cashflow") ||
    approvalText.includes("ready to invoice") ||
    approvalText.includes("messages ready") ||
    approvalText.includes("to approve")
  );

  const workspaceName = {
    dashboard: "Smart Hub",
    queue: "Smart Hub",
    jobs: "Jobs",
    clients: "Clients",
    team: "Team",
    quotes: "Quotes",
    invoices: "Invoices",
    proof: "Proof-to-Paid",
    settings: "Settings",
  }[selection.page || "dashboard"] || "Workspace";

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function go(page) {
    setPage(page);
    window.history.pushState({}, "", workspacePathForPage(page));
    window.dispatchEvent(new PopStateEvent("popstate"));
    onClose();
  }

  function portalRecordType() {
    const page = selection.page || "";
    const group = String(selection.group || "").toLowerCase();
    const sourceType = String(selection.sourceType || selection.item?.source_type || "").toLowerCase();

    if (page === "quotes" || group.includes("quote") || sourceType.includes("quote")) return "quote";
    if (page === "invoices" || group.includes("invoice") || group.includes("cashflow") || sourceType.includes("invoice")) return "invoice";
    if (page === "jobs" || page === "proof" || group.includes("job") || group.includes("work") || group.includes("dispatch") || sourceType.includes("job")) return "job";

    return "";
  }

  function portalRecordId() {
    const item = selection.item || {};
    if (Array.isArray(item)) return selection.sourceId || selection.actionId || "";
    return (
      selection.sourceId ||
      selection.actionId ||
      item.id ||
      item._id ||
      item.job_id ||
      item.quote_id ||
      item.invoice_id ||
      item.source_id ||
      ""
    );
  }

  const canCreatePortalLink = Boolean(portalRecordType() && portalRecordId());

  async function copyPortalLink() {
    const type = portalRecordType();
    const id = portalRecordId();

    if (!type || !id) {
      setPortalLinkStatus("This record needs to be saved before a portal link can be created.");
      return;
    }

    setPortalLinkStatus("Preparing portal link...");

    try {
      const result = await apiPost(`/portal-links/${encodeURIComponent(type)}/${encodeURIComponent(String(id))}/ensure`, {});
      const path = result?.portal_path || (result?.token ? `/portal/${result.token}` : "");
      const link = path ? `${window.location.origin}${path}` : "";

      if (!link) {
        setPortalLinkStatus("Portal link could not be created.");
        return;
      }

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      }

      setPortalLinkStatus(`Portal link copied: ${link}`);
    } catch (err) {
      setPortalLinkStatus(err?.message || "Could not create portal link.");
    }
  }

  return (
    <div className="cx-command-modal-backdrop" onClick={onClose}>
      <section className="cx-command-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>{isApprovalFlow ? (selection.group || "Owner command") : workspaceName}</span>
            <h2>{draft.title}</h2>
            <p>{row.detail}</p>
          </div>
          <button type="button" aria-label="Close Smart Hub pop-up" onClick={onClose}>×</button>
        </header>

        <section className="cx-command-modal-grid">
          <label>
            Title / summary
            <input value={draft.title} onChange={(event) => update("title", event.target.value)} />
          </label>

          <label>
            Status
            <input value={draft.status} onChange={(event) => update("status", event.target.value)} />
          </label>

          <label className="wide">
            Owner edit / internal note
            <textarea
              value={draft.ownerNote}
              onChange={(event) => update("ownerNote", event.target.value)}
              placeholder="Add your edit, instruction, or approval note..."
            />
          </label>

          <label className="wide">
            Customer / worker message draft
            <textarea
              value={draft.customerMessage}
              onChange={(event) => update("customerMessage", event.target.value)}
              placeholder="Write or edit the message before anything is sent..."
            />
          </label>

          <label className="wide">
            AI decision context
            <textarea
              value={draft.detail}
              onChange={(event) => update("detail", event.target.value)}
            />
          </label>
        </section>

        <section className="cx-command-ai-box">
          <span>{isApprovalFlow ? "AI recommendation" : "Record detail"}</span>
          <strong>
            {selection.recommendation || (
              isApprovalFlow
                ? "Review, edit if needed, then approve only when it looks right."
                : "Review the record here first. Open the full workspace only if you need deeper controls."
            )}
          </strong>
          <p>
            {isApprovalFlow
              ? "This hub keeps you on one page. You can inspect the record, edit the wording, save a command note, approve it, or jump to the exact workspace if you need deeper controls."
              : "This keeps you in context. Tap into the full workspace only when you need to create, delete, or make deeper changes."}
          </p>
        </section>

        {portalLinkStatus ? (
          <section className="cx-portal-link-status">
            <span>Client portal</span>
            <p>{portalLinkStatus}</p>
          </section>
        ) : null}

        <footer className={isApprovalFlow ? "cx-command-footer-approval" : "cx-command-footer-record"}>
          <button type="button" onClick={() => onSaveDraft(selection, draft)}>
            {isApprovalFlow ? "Save edit" : "Save note"}
          </button>
          <button type="button" onClick={() => go(selection.page || "dashboard")}>
            Open {workspaceName}
          </button>
          {canCreatePortalLink ? (
            <button type="button" className="cx-portal-link-btn" onClick={copyPortalLink}>
              Copy portal link
            </button>
          ) : null}
          <button type="button" onClick={onClose}>Close</button>
          {isApprovalFlow ? (
            <button type="button" className="approve" onClick={() => onApprove(selection, draft)}>
              Approve
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

function OwnerCommandRow({ item, index, page, group, onOpen }) {
  const row = rowText(item, index, group);
  const context = cxPreparedActionContext({ item, row, boxKey: page, group });

  return (
    <button
      type="button"
      className={`cx-command-row cx-command-row-ai cx-command-row-${context.mode}`}
      onClick={() => onOpen({
        item,
        page,
        group,
        label: row.title,
        recommendation: `${context.found} ${context.prepared}`,
      })}
    >
      <span>{row.lead}</span>
      <strong>{row.title}</strong>
      <small>{context.found}</small>
      <div className="cx-command-row-ai-mini">
        <b>{context.confidenceLabel}</b>
        <em>{context.prepared}</em>
      </div>
    </button>
  );
}


function cxMoneyValue(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cxMoneyInput(value) {
  const amount = cxMoneyValue(value);
  if (!amount) return "";
  return amount % 1 === 0 ? String(amount) : amount.toFixed(2);
}

function cxInvoiceAmount(item = {}) {
  const values = [
    item.invoice_amount,
    item.amount_due,
    item.balance,
    item.total,
    item.total_amount,
    item.amount,
    item.price,
    item.job_price,
    item.fixed_price,
    item.fixedPrice,
    item.quote_total,
    item.quoted_total,
    item.estimated_price,
  ];

  for (const value of values) {
    const amount = cxMoneyValue(value);
    if (amount > 0) return cxMoneyInput(amount);
  }

  const rate = cxMoneyValue(item.hourly_rate || item.rate || item.labour_rate || item.labor_rate);
  const hours = cxMoneyValue(item.billable_hours || item.worked_hours || item.total_hours || item.hours || item.duration_hours);
  if (rate > 0 && hours > 0) return cxMoneyInput(rate * hours);

  const minutes = cxMoneyValue(item.billable_minutes || item.worked_minutes || item.total_minutes || item.duration_minutes);
  if (rate > 0 && minutes > 0) return cxMoneyInput(rate * (minutes / 60));

  return "";
}

function cxCleanInvoiceText(value) {
  return String(value || "").trim();
}

function cxLooksWeakInvoiceDescription(value) {
  const text = cxCleanInvoiceText(value).toLowerCase();

  if (!text) return true;

  return (
    text.includes("ai can help") ||
    text.includes("turn notes") ||
    text.includes("invoice draft") ||
    text.includes("ready for invoice review") ||
    text.includes("completed work details") ||
    text === "completed job" ||
    text === "service completed"
  );
}

function cxCleanInvoiceTitle(value) {
  const text = cxCleanInvoiceText(value)
    .replace(/^prepare invoice(?: path)? for\s+/i, "")
    .replace(/^invoice draft for\s+/i, "")
    .replace(/^completed service for\s+/i, "")
    .trim();

  return text || "Completed service";
}

function cxCustomerInvoiceWording(item = {}, fallback = "") {
  const client = cxInvoiceClientFromDraftOrItem({}, item, item?.title || item?.name || fallback);
  const line = cxCleanInvoiceTitle(
    item.invoice_line_item ||
    item.line_item ||
    item.service_type ||
    item.job_type ||
    item.title ||
    item.name ||
    fallback ||
    "Completed service"
  );
  const address = cxCleanInvoiceText(item.address || item.job_address || item.service_address);
  const workerNotes = cxCleanInvoiceText(item.completion_notes || item.worker_notes || item.job_notes || item.notes);
  const proofCount = Array.isArray(item.photos || item.worker_photos || item.proof_photos)
    ? (item.photos || item.worker_photos || item.proof_photos).length
    : 0;

  const parts = [];

  parts.push(address ? `${line} completed at ${address}.` : `${line} completed.`);

  if (workerNotes && !cxLooksWeakInvoiceDescription(workerNotes)) {
    parts.push(workerNotes.endsWith(".") ? workerNotes : `${workerNotes}.`);
  }

  if (proofCount > 0) {
    parts.push(`${proofCount} proof photo${proofCount === 1 ? "" : "s"} recorded with the job.`);
  }

  return parts.join(" ").replace(/\s+/g, " ").trim() || `${line} completed for ${client}.`;
}

function cxInvoiceDescription(item = {}, fallback = "") {
  const existing = cxCleanInvoiceText(
    item.ai_invoice_description ||
    item.invoice_description ||
    item.invoiceDescription ||
    item.invoice_description_draft ||
    item.description_for_invoice ||
    item.description
  );

  if (existing && existing.length > 18 && !cxLooksWeakInvoiceDescription(existing)) {
    return existing;
  }

  return cxCustomerInvoiceWording(item, fallback);
}

function cxInvoiceStatus(item = {}) {
  const raw = String(item.invoice_status || item.status || item.payment_status || item.job_status || "").toLowerCase();
  if (raw.includes("approved")) return "approved";
  if (raw.includes("ready")) return "ready";
  return "draft";
}

function cxInvoicePreparedStatus(item = {}) {
  const amount = cxInvoiceAmount(item);
  return amount ? `Prepared $${amount}` : "Needs amount";
}


function cxInvoiceClient(item = {}, title = "") {
  const direct = cxCleanInvoiceText(
    item.client_name ||
    item.customer_name ||
    item.client ||
    item.customer ||
    item.name
  );

  if (direct && !direct.toLowerCase().includes("prepare invoice")) return direct;

  const fromTitle = cxCleanInvoiceText(title)
    .replace(/^prepare invoice(?: path)? for\s+/i, "")
    .replace(/^invoice draft for\s+/i, "");

  return fromTitle || "Client";
}

function cxInvoiceLineItem(item = {}, title = "") {
  const direct = cxCleanInvoiceText(
    item.invoice_line_item ||
    item.line_item ||
    item.service_type ||
    item.job_type ||
    item.title ||
    item.name ||
    title
  );

  const clean = cxCleanInvoiceTitle(direct);
  return clean || "Completed service";
}

function cxInvoiceDueDate(item = {}) {
  const existing = cxCleanInvoiceText(
    item.due_date ||
    item.invoice_due_date ||
    item.payment_due_date
  );

  if (existing) return existing.slice(0, 10);

  const due = new Date();
  due.setDate(due.getDate() + 14);
  return due.toISOString().slice(0, 10);
}


function cxLooksGenericClientName(value) {
  const text = cxCleanInvoiceText(value).toLowerCase();
  return !text || text === "client" || text === "client invoice" || text === "customer" || text === "customer invoice";
}

function cxInvoiceClientFromDraftOrItem(draft = {}, item = {}, title = "") {
  const choices = [
    draft.invoiceClientName,
    draft.invoiceClient,
    item.client_name,
    item.customer_name,
    item.client,
    item.customer,
    item.business_client_name,
    item.name,
  ];

  for (const choice of choices) {
    const clean = cxCleanInvoiceText(choice);
    if (clean && !cxLooksGenericClientName(clean) && !clean.toLowerCase().includes("prepare invoice")) {
      return clean;
    }
  }

  const titleText = cxCleanInvoiceText(title || item.title || item.name || "");
  const parsedTitle = titleText
    .replace(/^prepare invoice(?: path)? for\s+/i, "")
    .replace(/^invoice draft for\s+/i, "")
    .replace(/^completed service for\s+/i, "")
    .trim();

  if (parsedTitle && !cxLooksGenericClientName(parsedTitle)) return parsedTitle;

  const description = cxCleanInvoiceText(item.invoice_description || item.ai_invoice_description || item.description || draft.invoiceDescription || "");
  const match = description.match(/\bfor\s+([A-Za-z0-9][A-Za-z0-9 '&.-]{1,80})\b/i);
  if (match && match[1] && !cxLooksGenericClientName(match[1])) {
    return match[1].replace(/[.]+$/, "").trim();
  }

  return "Client name needed";
}



function cxPreparedActionContext({ item = {}, row = {}, boxKey = "", group = "", controlDraft = {} } = {}) {
  const rowLead = textValue(row.lead, item.type, item.kind, group, boxKey, "AI action");
  const rowTitle = textValue(row.title, item.title, item.name, item.client_name, item.customer_name, "Owner action");
  const rowDetail = textValue(row.detail, item.message, item.body, item.description, item.notes, "");
  const rowStatus = textValue(row.status, item.status, item.invoice_status, item.payment_status, "Review");
  const allText = `${boxKey} ${group} ${rowLead} ${rowTitle} ${rowDetail} ${rowStatus} ${item.source_type || ""}`.toLowerCase();

  function pick(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return "";
  }

  function money(itemValue = {}) {
    if (typeof moneyValue === "function") {
      const formatted = moneyValue(itemValue);
      if (formatted) return formatted;
    }

    const raw = pick(itemValue.total, itemValue.amount, itemValue.balance, itemValue.price, itemValue.job_price, itemValue.fixed_price, itemValue.invoice_amount);
    return raw ? `$${String(raw).replace(/^\$/, "")}` : "";
  }

  function photoCount(itemValue = {}) {
    for (const key of ["photos", "worker_photos", "proof_photos", "job_photos", "images"]) {
      if (Array.isArray(itemValue[key])) return itemValue[key].length;
    }
    const raw = Number(itemValue.photo_count || itemValue.photos_count || itemValue.proof_count || 0);
    return Number.isFinite(raw) ? raw : 0;
  }

  function contactState(itemValue = {}) {
    const email = pick(itemValue.client_email, itemValue.customer_email, itemValue.email);
    const phone = pick(itemValue.client_phone, itemValue.customer_phone, itemValue.phone);
    if (email && phone) return "client email and phone";
    if (email) return "client email";
    if (phone) return "client phone";
    return "missing client contact";
  }

  const client = pick(
    controlDraft.invoiceClientName,
    item.client_name,
    item.customer_name,
    item.client?.name,
    item.customer?.name,
    item.name,
    rowTitle.includes(" for ") ? rowTitle.split(" for ").pop() : "",
    "Client"
  );

  const address = pick(item.address, item.job_address, item.service_address, item.location);
  const worker = pick(item.recommended_worker_name, item.assigned_worker_name, item.worker_name, item.worker, controlDraft.workerChoice);
  const service = pick(item.service_type, item.job_type, item.trade, item.title, item.name, rowTitle);
  const amount = pick(controlDraft.invoiceAmount ? `$${controlDraft.invoiceAmount}` : "", money(item), item.invoice_amount ? `$${item.invoice_amount}` : "");
  const due = pick(controlDraft.invoiceDueDate, item.due_date, item.payment_due_date, item.next_due_date);
  const notes = pick(item.completion_notes, item.worker_notes, item.job_notes, item.notes, item.message, rowDetail);
  const photos = photoCount(item);

  let mode = "review";
  if (allText.includes("dispatch") || allText.includes("assign") || allText.includes("unassigned")) mode = "dispatch";
  else if (allText.includes("invoice") || allText.includes("completed job") || allText.includes("proof-to-paid") || allText.includes("proof")) mode = "invoice";
  else if (allText.includes("cashflow") || allText.includes("payment") || allText.includes("overdue") || allText.includes("collect")) mode = "cashflow";
  else if (allText.includes("quote") || allText.includes("follow-up") || allText.includes("follow up")) mode = "quote";
  else if (allText.includes("client cleanup") || allText.includes("missing client") || allText.includes("duplicate")) mode = "client";
  else if (allText.includes("setup")) mode = "setup";
  else if (allText.includes("request")) mode = "request";
  else if (allText.includes("recurring")) mode = "recurring";
  else if (allText.includes("template")) mode = "template";
  else if (allText.includes("worker") || allText.includes("crew") || allText.includes("team")) mode = "crew";

  const base = {
    mode,
    found: `Churvox found "${rowTitle}" and prepared it for owner review.`,
    checked: [
      "source record",
      "status",
      "owner approval requirement",
    ],
    prepared: rowDetail || "A reviewable owner action is ready.",
    approvalPreview: "Approving saves the owner decision and logs the action.",
    missing: [],
    confidenceLabel: "Owner check",
  };

  if (mode === "dispatch") {
    base.found = `Churvox found an unassigned job: ${service}${address ? ` at ${address}` : ""}.`;
    base.checked = [
      "job status",
      "assigned worker field",
      "team list",
      worker ? `recommended/selected worker: ${worker}` : "worker still needs selection",
      address ? `job location: ${address}` : "job location not fully set",
    ];
    base.prepared = worker
      ? `Prepared a worker assignment for ${worker} with job instructions ready to edit.`
      : "Prepared the dispatch decision, but the owner needs to choose the worker before approval.";
    base.approvalPreview = "Approving assigns the worker, updates the job, and keeps the action in the approval log.";
    if (!worker) base.missing.push("Choose worker before approving");
    base.confidenceLabel = worker ? "Ready" : "Needs worker";
  }

  if (mode === "invoice") {
    const invoiceText = pick(controlDraft.invoiceDescription, item.invoice_description, item.ai_invoice_description, notes, rowDetail);
    base.found = `Churvox found invoice-ready work for ${client}${address ? ` at ${address}` : ""}.`;
    base.checked = [
      "completed job / invoice source",
      contactState(item),
      photos ? `${photos} proof photo${photos === 1 ? "" : "s"}` : "no proof photos found",
      notes ? "worker/job notes found" : "no completion notes found",
      amount ? `amount source: ${amount}` : "amount needs owner input",
    ];
    base.prepared = invoiceText || `Prepared invoice wording for ${service}.`;
    base.approvalPreview = "Approving creates or updates the draft invoice from the job proof, notes and owner-edited wording.";
    if (!amount) base.missing.push("Invoice amount");
    if (!pick(item.client_email, item.customer_email, item.email)) base.missing.push("Client email may need checking");
    base.confidenceLabel = amount ? "Ready" : "Needs amount";
  }

  if (mode === "cashflow") {
    base.found = `Churvox found a payment follow-up for ${rowTitle}.`;
    base.checked = [
      "invoice/payment status",
      amount ? `amount: ${amount}` : "amount needs checking",
      due ? `due date: ${due}` : "due date not found",
      contactState(item),
    ];
    base.prepared = pick(controlDraft.reminderMessage, item.message, rowDetail, `A friendly payment reminder for ${client}.`);
    base.approvalPreview = "Approving saves the reminder draft or marks it ready. Nothing sends without owner approval.";
    if (!pick(item.client_email, item.customer_email, item.email, item.phone)) base.missing.push("Client contact");
    base.confidenceLabel = allText.includes("overdue") ? "Urgent" : "Ready";
  }

  if (mode === "quote") {
    base.found = `Churvox found a quote follow-up opportunity for ${client}.`;
    base.checked = [
      "quote status",
      amount ? `quote value: ${amount}` : "quote value not set",
      pick(item.sent_at, item.created_at, item.updated_at) ? "quote age/date" : "quote date not found",
      contactState(item),
    ];
    base.prepared = pick(controlDraft.quoteMessage, item.message, rowDetail, `A follow-up message for ${client}.`);
    base.approvalPreview = "Approving saves the follow-up draft and updates the quote follow-up workflow.";
    base.confidenceLabel = "Ready";
  }

  if (mode === "client") {
    base.found = `Churvox found client data that needs cleanup for ${client}.`;
    base.checked = [
      "client name",
      pick(item.email) ? "email present" : "email missing",
      pick(item.phone) ? "phone present" : "phone missing",
      pick(item.address) ? "address present" : "address missing",
    ];
    base.prepared = "Prepared a cleanup action so future jobs, invoices and reminders do not rely on guessed details.";
    base.approvalPreview = "Approving or resolving updates the client cleanup state and keeps the owner decision logged.";
    ["email", "phone", "address"].forEach((field) => {
      if (!pick(item[field])) base.missing.push(field);
    });
    base.confidenceLabel = "Needs info";
  }

  if (mode === "setup") {
    base.found = `Churvox found setup context that will improve the AI machine: ${rowTitle}.`;
    base.checked = [
      "business setup",
      "worker/client readiness",
      "AI recommendation quality",
    ];
    base.prepared = rowDetail || "Prepared the next setup improvement so Churvox can make better decisions.";
    base.approvalPreview = "Resolving this improves the data Churvox uses to prepare future actions.";
    base.confidenceLabel = "Setup";
  }

  if (mode === "request") {
    base.found = `Churvox found a customer request: ${rowTitle}.`;
    base.checked = [
      "customer request details",
      address ? `address: ${address}` : "address needs checking",
      contactState(item),
      notes ? "request notes found" : "request notes missing",
    ];
    base.prepared = "Prepared a draft job path from this request so the owner can approve without starting from a blank form.";
    base.approvalPreview = "Approving creates a draft job from the request and logs the owner action.";
    base.confidenceLabel = "Ready";
  }

  if (mode === "recurring") {
    base.found = `Churvox found recurring work due: ${rowTitle}.`;
    base.checked = [
      due ? `next due date: ${due}` : "due date needs checking",
      "repeat schedule",
      "job template/source",
    ];
    base.prepared = "Prepared the next recurring job generation step for owner approval.";
    base.approvalPreview = "Approving generates the next job from this recurring schedule.";
    base.confidenceLabel = "Ready";
  }

  if (mode === "template") {
    base.found = `Churvox found a service template ready to use: ${rowTitle}.`;
    base.checked = [
      "template name",
      "default job notes",
      "proof/invoice wording",
    ];
    base.prepared = "Prepared a job creation form from this template so the owner only fills the missing client/site details.";
    base.approvalPreview = "Approving creates a job from the selected service template.";
    base.confidenceLabel = "Template";
  }

  if (mode === "crew") {
    base.found = `Churvox found team context for ${rowTitle}.`;
    base.checked = [
      pick(item.role) ? `role: ${item.role}` : "worker role",
      pick(item.region, item.service_area, item.area) ? `area: ${pick(item.region, item.service_area, item.area)}` : "worker area missing",
      pick(item.email, item.phone) ? "contact details" : "worker contact missing",
      "assignment readiness",
    ];
    base.prepared = "Prepared worker context for assignment decisions and crew planning.";
    base.approvalPreview = "Reviewing keeps worker data ready for better dispatch decisions.";
    base.confidenceLabel = "Crew";
  }

  base.checked = base.checked.filter(Boolean).slice(0, 5);
  base.missing = [...new Set(base.missing.filter(Boolean))];

  return base;
}


function SmartHubActionControl({ boxKey, row, draft, onChange, team = [] }) {
  const text = `${boxKey || ""} ${row?.lead || ""} ${row?.title || ""} ${row?.detail || ""} ${row?.status || ""}`.toLowerCase();

  const mode = boxKey === "templates"
    ? "template"
    : boxKey === "reports"
      ? "report"
      : boxKey === "dispatch" || text.includes("unassigned") || text.includes("assign")
        ? "dispatch"
        : boxKey === "invoice" || text.includes("invoice") || text.includes("completed job")
          ? "invoice"
          : boxKey === "collect" || text.includes("overdue") || text.includes("payment")
            ? "collect"
            : boxKey === "quotes" || boxKey === "messages" || text.includes("quote") || text.includes("follow")
              ? "message"
              : "review";

  const workerOptions = (Array.isArray(team) ? team : [])
    .map((worker) => {
      const id = String(worker?.id || worker?._id || worker?.user_id || worker?.email || worker?.name || "").trim();
      const name = String(worker?.name || worker?.full_name || worker?.worker_name || worker?.email || "Worker").trim();
      const region = String(worker?.region || worker?.service_area || worker?.area || "").trim();

      return { id, name, region };
    })
    .filter((worker) => worker.id || worker.name);

  if (mode === "template") {
    return (
      <section className="cx-smart-control-panel cx-smart-control-template">
        <header><span>Service template</span><h4>Create a job from this preset</h4></header>
        <div className="cx-smart-control-grid">
          <label>Job title<input value={draft.templateJobTitle} onChange={(e) => onChange("templateJobTitle", e.target.value)} placeholder="Job title" /></label>
          <label>Client name<input value={draft.templateClientName} onChange={(e) => onChange("templateClientName", e.target.value)} placeholder="Client name" /></label>
          <label className="wide">Address<input value={draft.templateAddress} onChange={(e) => onChange("templateAddress", e.target.value)} placeholder="Job address" /></label>
          <label className="wide">Job notes<textarea value={draft.templateNotes} onChange={(e) => onChange("templateNotes", e.target.value)} placeholder="Notes for the new job..." /></label>
        </div>
      </section>
    );
  }

  if (mode === "report") {
    return (
      <section className="cx-smart-control-panel cx-smart-control-report">
        <header><span>Owner report</span><h4>Review the numbers and choose the next action</h4></header>
        <div className="cx-smart-control-grid">
          <label>Decision<select value={draft.reportDecision} onChange={(e) => onChange("reportDecision", e.target.value)}><option value="reviewed">Mark reviewed</option><option value="follow_up_quotes">Follow up quotes</option><option value="collect_money">Collect money</option><option value="check_workers">Check worker load</option></select></label>
          <label>Follow-up<input value={draft.reportFollowUp} onChange={(e) => onChange("reportFollowUp", e.target.value)} placeholder="e.g. Review again Friday" /></label>
          <label className="wide">Owner report note<textarea value={draft.ownerNote} onChange={(e) => onChange("ownerNote", e.target.value)} placeholder="Decision, cashflow note, quote follow-up note, or worker workload note..." /></label>
        </div>
      </section>
    );
  }

  if (mode === "dispatch") {
    return (
      <section className="cx-smart-control-panel">
        <header><span>Worker assignment</span><h4>Assign the worker here</h4></header>
        <div className="cx-smart-control-grid">
          <label>
            Chosen worker
            <select value={draft.workerChoice || ""} onChange={(e) => onChange("workerChoice", e.target.value)}>
              <option value="">Choose worker...</option>
              {workerOptions.map((worker) => (
                <option key={`${worker.id}-${worker.name}`} value={worker.id || worker.name}>
                  {worker.name}{worker.region ? ` · ${worker.region}` : ""}
                </option>
              ))}
            </select>
            {!workerOptions.length ? <small className="cx-worker-picker-note">No workers loaded yet. Add workers in Team first.</small> : null}
          </label>
          <label>Conflict check<select value={draft.conflictStatus} onChange={(e) => onChange("conflictStatus", e.target.value)}><option value="clear">No conflict found</option><option value="check">Needs check</option><option value="conflict">Possible conflict</option></select></label>
          <label className="wide">Worker instruction<textarea value={draft.customerMessage} onChange={(e) => onChange("customerMessage", e.target.value)} placeholder="Instruction for the worker..." /></label>
          <label className="wide">Owner note<textarea value={draft.ownerNote} onChange={(e) => onChange("ownerNote", e.target.value)} placeholder="Access notes, timing, priority..." /></label>
        </div>
      </section>
    );
  }

  if (mode === "invoice") {
    return (
      <section className="cx-smart-control-panel cx-smart-control-invoice cx-smart-control-proof-to-paid">
        <header>
          <span>Invoice draft</span>
          <h4>AI prepared this invoice</h4>
          <p>Owner checks the invoice draft below, edits anything needed, then approves.</p>
        </header>

        <section className="cx-ai-invoice-preview">
          <article>
            <span>Client</span>
            <strong>{draft.invoiceClientName || "Client"}</strong>
          </article>
          <article>
            <span>Amount</span>
            <strong>{draft.invoiceAmount ? `$${draft.invoiceAmount}` : "Needs price"}</strong>
          </article>
          <article>
            <span>Due</span>
            <strong>{draft.invoiceDueDate || "14 days"}</strong>
          </article>
        </section>

        <div className="cx-smart-invoice-simple-grid">
          <label>
            Client
            <input
              value={draft.invoiceClientName || ""}
              onChange={(e) => onChange("invoiceClientName", e.target.value)}
              placeholder="Client name"
            />
          </label>

          <label>
            Amount
            <input
              value={draft.invoiceAmount || ""}
              onChange={(e) => onChange("invoiceAmount", e.target.value)}
              placeholder="Add amount"
            />
          </label>

          <label>
            Due date
            <input
              type="date"
              value={draft.invoiceDueDate || ""}
              onChange={(e) => onChange("invoiceDueDate", e.target.value)}
            />
          </label>

          <label>
            Status
            <select value={draft.invoiceStatus || "draft"} onChange={(e) => onChange("invoiceStatus", e.target.value)}>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="approved">Approved</option>
            </select>
          </label>

          <label className="wide">
            Line item
            <input
              value={draft.invoiceLineItemsText || ""}
              onChange={(e) => onChange("invoiceLineItemsText", e.target.value)}
              placeholder="Service line item"
            />
          </label>

          <label className="wide">
            Invoice wording owner will approve
            <textarea
              value={draft.invoiceDescription || ""}
              onChange={(e) => onChange("invoiceDescription", e.target.value)}
              placeholder="AI invoice wording should be here..."
            />
          </label>

          <label className="wide">
            Owner note
            <textarea
              value={draft.ownerNote || ""}
              onChange={(e) => onChange("ownerNote", e.target.value)}
              placeholder="Optional internal note..."
            />
          </label>
        </div>
      </section>
    );
  }

  if (mode === "collect") {
    return (
      <section className="cx-smart-control-panel">
        <header><span>Payment follow-up</span><h4>Prepare reminder here</h4></header>
        <div className="cx-smart-control-grid">
          <label>Follow-up type<select value={draft.collectAction} onChange={(e) => onChange("collectAction", e.target.value)}><option value="friendly_reminder">Friendly reminder</option><option value="second_notice">Second notice</option><option value="check_payment">Check payment</option><option value="mark_paid">Mark paid</option></select></label>
          <label>Payment status<select value={draft.paymentStatus} onChange={(e) => onChange("paymentStatus", e.target.value)}><option value="unpaid">Unpaid</option><option value="overdue">Overdue</option><option value="part_paid">Part paid</option><option value="paid">Paid</option></select></label>
          <label className="wide">Payment reminder<textarea value={draft.reminderMessage} onChange={(e) => onChange("reminderMessage", e.target.value)} placeholder="Edit reminder before copying or marking ready..." /></label>
          <label className="wide">Internal note<textarea value={draft.ownerNote} onChange={(e) => onChange("ownerNote", e.target.value)} placeholder="Payment context or next follow-up..." /></label>
        </div>
      </section>
    );
  }

  if (mode === "message") {
    return (
      <section className="cx-smart-control-panel">
        <header><span>Quote / message follow-up</span><h4>Edit follow-up here</h4></header>
        <div className="cx-smart-control-grid">
          <label>Status<select value={draft.followupStatus} onChange={(e) => onChange("followupStatus", e.target.value)}><option value="draft">Draft</option><option value="ready">Ready to send/copy</option><option value="followed_up">Followed up</option><option value="snoozed">Snoozed</option></select></label>
          <label>Timing<input value={draft.followupTiming} onChange={(e) => onChange("followupTiming", e.target.value)} placeholder="Today, tomorrow, next week" /></label>
          <label className="wide">Customer message<textarea value={draft.quoteMessage} onChange={(e) => onChange("quoteMessage", e.target.value)} placeholder="Edit the follow-up before approval..." /></label>
          <label className="wide">Owner note<textarea value={draft.ownerNote} onChange={(e) => onChange("ownerNote", e.target.value)} placeholder="Customer preference or internal note..." /></label>
        </div>
      </section>
    );
  }

  return (
    <section className="cx-smart-control-panel">
      <header><span>Owner control</span><h4>Review and decide here</h4></header>
      <div className="cx-smart-control-grid">
        <label className="wide">Owner note<textarea value={draft.ownerNote} onChange={(e) => onChange("ownerNote", e.target.value)} placeholder="Add decision note before approval..." /></label>
      </div>
    </section>
  );
}



function SmartHubBoxModal({
  box,
  rows = [],
  approved = {},
  onClose,
  onOpen,
  onApprove,
  onSnooze,
  onDismiss,
  onResolve,
  onCopyMessage,
  onMarkReady,
  onMarkSent,
  onResetBox,
  onOpenFull,
  team = [],
}) {
  const [editingSelection, setEditingSelection] = useState(null);
  const [editingDraft, setEditingDraft] = useState({
    title: "",
    detail: "",
    status: "",
    ownerNote: "",
    customerMessage: "",
  });
  const [controlDrafts, setControlDrafts] = useState({});

  useEffect(() => {
    if (!box) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key !== "Escape") return;

      if (editingSelection) {
        setEditingSelection(null);
        return;
      }

      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [box, editingSelection, onClose]);

  const workerOptionsForEdit = (Array.isArray(team) ? team : [])
    .map((worker) => {
      const id = String(worker?.id || worker?._id || worker?.user_id || worker?.email || worker?.name || "").trim();
      const name = String(worker?.name || worker?.full_name || worker?.worker_name || worker?.email || "Worker").trim();
      const region = String(worker?.region || worker?.service_area || worker?.area || "").trim();

      return { id, name, region };
    })
    .filter((worker) => worker.id || worker.name);

  function editingNeedsWorkerDropdown() {
    const text = `${editingSelection?.hubBoxKey || ""} ${editingSelection?.group || ""} ${editingDraft?.title || ""} ${editingDraft?.detail || ""} ${editingDraft?.status || ""}`.toLowerCase();
    return text.includes("dispatch") || text.includes("assign") || text.includes("worker");
  }

  function editingNeedsInvoiceDraft() {
    const text = `${editingSelection?.hubBoxKey || ""} ${editingSelection?.group || ""} ${editingSelection?.sourceType || ""} ${editingDraft?.title || ""} ${editingDraft?.detail || ""} ${editingDraft?.status || ""}`.toLowerCase();
    return (
      text.includes("invoice") ||
      text.includes("proof") ||
      text.includes("paid") ||
      Boolean(editingDraft?.invoiceAmount) ||
      Boolean(editingDraft?.invoiceDescription)
    );
  }

  function editingApprovalMode() {
    const text = `${editingSelection?.hubBoxKey || ""} ${editingSelection?.group || ""} ${editingSelection?.sourceType || ""} ${editingDraft?.title || ""} ${editingDraft?.detail || ""} ${editingDraft?.status || ""}`.toLowerCase();

    if (editingNeedsInvoiceDraft()) return "invoice";
    if (text.includes("dispatch") || text.includes("assign") || text.includes("worker")) return "dispatch";
    if (text.includes("cashflow") || text.includes("payment") || text.includes("overdue") || text.includes("collect")) return "cashflow";
    if (text.includes("quote") || text.includes("message") || text.includes("follow")) return "message";
    if (text.includes("request")) return "request";
    if (text.includes("recurring")) return "recurring";
    if (text.includes("template")) return "template";
    if (text.includes("report")) return "report";

    return "review";
  }

  function editingReviewCopy() {
    const mode = editingApprovalMode();

    if (mode === "dispatch") {
      return {
        label: "Dispatch approval",
        title: "AI prepared a worker assignment",
        body: "Choose or confirm the worker, check instructions, then approve. Churvox assigns the job without sending you to another page.",
      };
    }

    if (mode === "cashflow") {
      return {
        label: "Payment follow-up",
        title: "AI prepared a payment reminder",
        body: "Review the reminder wording and payment status. Nothing is sent automatically.",
      };
    }

    if (mode === "message") {
      return {
        label: "Quote / message follow-up",
        title: "AI prepared the customer follow-up",
        body: "Review the message and timing, then approve the draft. You stay in Smart Hub.",
      };
    }

    if (mode === "request") {
      return {
        label: "Request to job",
        title: "AI prepared a draft job from the request",
        body: "Check the customer request summary and approve when it is ready to become a job.",
      };
    }

    if (mode === "recurring") {
      return {
        label: "Recurring job",
        title: "AI prepared the next recurring job",
        body: "Review the job details and approve generation. No page jumping needed.",
      };
    }

    if (mode === "template") {
      return {
        label: "Template to job",
        title: "AI prepared a job from a service template",
        body: "Confirm the job title, client, address and notes before creating it.",
      };
    }

    if (mode === "report") {
      return {
        label: "Owner report",
        title: "AI prepared an owner decision summary",
        body: "Review the recommendation and mark the action handled.",
      };
    }

    return {
      label: "Owner approval",
      title: "AI prepared this action",
      body: "Review what Churvox prepared, adjust only if needed, then approve here.",
    };
  }

  if (!box) return null;

  const workspaceForBox = {
    approvals: "dashboard",
    fix: "dashboard",
    invoice: "invoices",
    messages: "quotes",
    work: "jobs",
    collect: "invoices",
    quotes: "quotes",
    crew: "team",
    requests: "jobs",
    dispatch: "jobs",
    recurring: "jobs",
    templates: "settings",
    reports: "dashboard",
    setup: "settings",
  }[box.key] || "dashboard";

  const intro = {
    approvals: "Churvox prepared these actions for your review. Edit first if needed, then approve.",
    fix: "These are blockers or missing details that may slow the day down.",
    invoice: "Completed work and draft invoices that can turn into money.",
    messages: "Customer follow-ups and reminders prepared for review.",
    work: "Jobs and invoice work worth checking today.",
    collect: "Unpaid or overdue invoices that need follow-up.",
    quotes: "Quotes and follow-ups that may need a nudge.",
    crew: "Worker capacity and team records available for assignment.",
    requests: "Customer requests that can become draft jobs or quotes.",
    dispatch: "Dispatch decisions, unassigned jobs and possible schedule conflicts.",
    recurring: "Recurring jobs that may need the next job generated.",
    templates: "Service templates that can speed up job creation and proof/invoice wording.",
    reports: "Owner summaries for cashflow, quotes, workers and weekly performance.",
    setup: "These setup checks help Churvox make better AI decisions for your business.",
  }[box.key] || "Review the items Churvox found.";

  const modalCount = String(box.count || "").includes("$") || String(box.count || "").includes("%")
    ? box.count
    : rows.length;

  const modalCountLabel = String(box.count || "").includes("$") || String(box.count || "").includes("%")
    ? box.label
    : rows.length === 1
      ? "item remaining"
      : "items remaining";

  function riskFor(row) {
    const text = `${row.lead} ${row.title} ${row.detail} ${row.status}`.toLowerCase();
    if (text.includes("missing") || text.includes("failed")) return "Missing info";
    if (text.includes("overdue") || text.includes("unassigned") || text.includes("block")) return "Urgent";
    if (text.includes("draft") || text.includes("ready") || text.includes("complete")) return "Ready";
    return "Needs owner check";
  }

  function riskClassFor(row) {
    const risk = riskFor(row).toLowerCase();
    if (risk.includes("urgent")) return "urgent";
    if (risk.includes("missing")) return "missing";
    if (risk.includes("ready")) return "ready";
    return "check";
  }

  function reasonFor(row) {
    const text = `${row.lead} ${row.title} ${row.detail} ${row.status}`.toLowerCase();

    if (text.includes("unassigned")) return "AI found work that has not been assigned to a worker yet.";
    if (text.includes("invoice") || text.includes("completed job")) return "AI found completed or draft invoice work that may be ready for owner approval.";
    if (text.includes("quote")) return "AI found a quote or follow-up that may need attention.";
    if (text.includes("payment") || text.includes("overdue") || text.includes("collect")) return "AI found unpaid or overdue money that may need a reminder.";
    if (text.includes("worker") || text.includes("crew")) return "AI found team capacity or worker context that may help with assignment.";
    if (text.includes("setup") || text.includes("business settings") || text.includes("import")) return "AI found setup details that will improve recommendations and reduce manual admin.";
    if (text.includes("message") || text.includes("follow")) return "AI prepared communication for review before anything is sent.";

    return "AI surfaced this because it may need an owner decision.";
  }

  function actionGroupForBox(boxKey, row) {
    const text = `${boxKey || ""} ${row?.lead || ""} ${row?.title || ""} ${row?.detail || ""} ${row?.status || ""}`.toLowerCase();
    if (boxKey === "requests") return "Request inbox";
    if (boxKey === "dispatch") return "Dispatch";
    if (boxKey === "recurring") return "Recurring job";
    if (boxKey === "templates") return "Service template";
    if (boxKey === "reports") return "Owner report";
    if (text.includes("unassigned") || text.includes("assign")) return "Dispatch";
    if (boxKey === "invoice" || text.includes("invoice") || text.includes("completed job")) return "Invoice";
    if (boxKey === "collect" || text.includes("payment") || text.includes("overdue")) return "Cashflow";
    if (boxKey === "quotes" || text.includes("quote")) return "Quote";
    if (boxKey === "messages" || text.includes("message") || text.includes("follow")) return "Message";
    if (boxKey === "crew" || text.includes("worker") || text.includes("crew")) return "Crew";
    return "Owner command";
  }

  function smartControlKey(boxKey, item, index, row) {
    const rawId = item?.id || item?._id || item?.draft_id || item?.job_id || item?.invoice_id || item?.quote_id || "";
    return `${boxKey || "hub"}::${rawId || index}::${row?.title || "item"}`;
  }

  function baseControlDraft(row, item = {}) {
    const title = row?.title || "Owner action";
    const detail = row?.detail || "";
    const preparedInvoiceAmount = cxInvoiceAmount(item);
    const preparedInvoiceDescription = cxInvoiceDescription(item, detail || `Work completed for ${title}.`);
    const preparedInvoiceClientName = cxInvoiceClientFromDraftOrItem({}, item, title);
    const preparedInvoiceDueDate = cxInvoiceDueDate(item);
    const preparedInvoiceLineItem = cxInvoiceLineItem(item, title);
    return {
      title,
      detail,
      status: row?.status || "Review",
      ownerNote: "",
      customerMessage: `Hi, quick update about ${title}.`,
      workerChoice: "",
      conflictStatus: "clear",
      invoiceClientName: preparedInvoiceClientName,
      invoiceTitle: `Invoice draft for ${preparedInvoiceClientName}`,
      invoiceAmount: preparedInvoiceAmount,
      invoiceDueDate: preparedInvoiceDueDate,
      invoiceLineItemsText: preparedInvoiceLineItem,
      invoiceStatus: cxInvoiceStatus(item),
      invoiceDescription: preparedInvoiceDescription,
      collectAction: "friendly_reminder",
      paymentStatus: "unpaid",
      reminderMessage: "Hi, just a friendly reminder that this invoice is still showing as unpaid. Please let us know if you need anything from us.",
      quoteMessage: `Hi, just following up on the quote for ${title}. Happy to answer any questions or help book the work in.`,
      followupStatus: "draft",
      followupTiming: "Today",
      templateJobTitle: title,
      templateClientName: "",
      templateAddress: "",
      templateNotes: detail,
      reportDecision: "reviewed",
      reportFollowUp: "",
    };
  }

  function controlDraftFor(controlKey, row, item = {}) {
    const base = baseControlDraft(row, item);
    const saved = controlDrafts[controlKey] || {};
    const merged = { ...base, ...saved };

    if (cxLooksGenericClientName(merged.invoiceClientName) && !cxLooksGenericClientName(base.invoiceClientName)) {
      merged.invoiceClientName = base.invoiceClientName;
    }

    if (!merged.invoiceTitle || cxLooksGenericClientName(merged.invoiceTitle)) {
      merged.invoiceTitle = `Invoice draft for ${merged.invoiceClientName || base.invoiceClientName || "client"}`;
    }

    return merged;
  }

  function updateControlDraft(controlKey, key, value) {
    setControlDrafts((current) => ({
      ...current,
      [controlKey]: { ...(current[controlKey] || {}), [key]: value },
    }));
  }

  function approvalDraftFromControl(row, controlDraft) {
    return {
      ...controlDraft,
      title: controlDraft.title || row?.title || "Owner action",
      detail: controlDraft.detail || row?.detail || "",
      status: controlDraft.status || row?.status || "approved",
      ownerNote: controlDraft.ownerNote || "",
      customerMessage: controlDraft.customerMessage || controlDraft.quoteMessage || controlDraft.reminderMessage || "",
    };
  }

  function primaryActionLabel(row) {
    const text = `${box.key} ${row.lead} ${row.title} ${row.detail} ${row.status}`.toLowerCase();

    if (text.includes("unassigned") || text.includes("assign")) return "Assign worker";
    if (box.key === "setup") return "Fix setup";
    if (box.key === "fix") return "Fix now";
    if (box.key === "invoice") return "Approve invoice";
    if (box.key === "messages") return "Approve message";
    if (box.key === "collect") return "Prepare reminder";
    if (box.key === "quotes") return "Follow up";
    if (box.key === "crew") return "Review worker";
    if (box.key === "requests") return "Create draft job";
    if (box.key === "dispatch") return "Assign worker";
    if (box.key === "recurring") return "Generate job";
    if (box.key === "templates") return "Create job";
    if (box.key === "reports") return "Mark reviewed";
    if (box.key === "work") return "Review work";

    if (text.includes("worker") || text.includes("assign")) return "Approve worker";
    if (text.includes("invoice")) return "Approve invoice";
    if (text.includes("quote")) return "Approve follow-up";
    if (text.includes("payment") || text.includes("overdue")) return "Approve reminder";

    return "Approve";
  }

  function fullRecordLabel() {
    if (workspaceForBox === "jobs") return "Jobs";
    if (workspaceForBox === "invoices") return "Invoices";
    if (workspaceForBox === "quotes") return "Quotes";
    if (workspaceForBox === "team") return "Team";
    if (workspaceForBox === "settings") return "Settings";
    return "Return to Smart Hub";
  }

  function canResolveBox() {
    return box.key === "fix" || box.key === "setup" || box.key === "work";
  }

  function resolveLabel() {
    if (box.key === "setup") return "Mark improved";
    if (box.key === "work") return "Mark reviewed";
    return "Mark resolved";
  }

  function isMessageBox() {
    return box.key === "messages";
  }

  function messageArea(item) {
    return item?.source_area === "send" ? "send" : "approved";
  }

  function modalEmptyTitle() {
    if (box.key === "approvals") return "No approvals waiting.";
    if (box.key === "fix") return "No blockers right now.";
    if (box.key === "invoice") return "No invoice-ready work right now.";
    if (box.key === "messages") return "No messages ready right now.";
    if (box.key === "collect") return "No collection actions right now.";
    if (box.key === "setup") return "Setup is looking good.";
    if (box.key === "requests") return "No customer requests waiting.";
    if (box.key === "dispatch") return "Dispatch is clear right now.";
    if (box.key === "recurring") return "No recurring jobs due.";
    if (box.key === "templates") return "No service templates found.";
    if (box.key === "reports") return "Reports are ready when live data arrives.";
    return "Nothing here right now.";
  }

  function modalEmptyBody() {
    if (box.key === "setup") return "Churvox will keep checking setup details as the business grows.";
    return "Everything in this box is handled, snoozed, or dismissed for this session.";
  }

  function startEdit(selection, preparedDraft = {}) {
    const row = rowText(selection?.item, 0, selection?.label || "Smart Hub item");
    const item = selection?.item || {};
    const invoiceAmount = preparedDraft.invoiceAmount || cxInvoiceAmount(item);
    const invoiceDescription = preparedDraft.invoiceDescription || cxInvoiceDescription(item, row.detail || "");
    const invoiceStatus = preparedDraft.invoiceStatus || cxInvoiceStatus(item);
    const invoiceClientName = cxInvoiceClientFromDraftOrItem(preparedDraft, item, row.title);
    const invoiceDueDate = preparedDraft.invoiceDueDate || cxInvoiceDueDate(item);
    const invoiceLineItemsText = preparedDraft.invoiceLineItemsText || cxInvoiceLineItem(item, row.title);

    setEditingSelection(selection);
    setEditingDraft({
      ...preparedDraft,
      title: preparedDraft.title || row.title,
      detail: preparedDraft.detail || row.detail,
      status: preparedDraft.status || row.status,
      ownerNote: preparedDraft.ownerNote || "",
      customerMessage: preparedDraft.customerMessage || "",
      workerChoice: preparedDraft.workerChoice || selection?.item?.assigned_worker_id || selection?.item?.worker_id || selection?.item?.recommended_worker_id || "",
      invoiceClientName,
      invoiceTitle: preparedDraft.invoiceTitle || `Invoice draft for ${invoiceClientName}`,
      invoiceAmount,
      invoiceDueDate,
      invoiceLineItemsText,
      invoiceDescription,
      invoiceStatus,
    });
  }

  function updateEditingDraft(key, value) {
    setEditingDraft((current) => ({ ...current, [key]: value }));
  }

  function approveEditedSelection() {
    if (!editingSelection) return;

    const normalizedDraft = {
      ...editingDraft,
      customerMessage: editingDraft.customerMessage || editingDraft.quoteMessage || editingDraft.reminderMessage || editingDraft.workerInstruction || "",
      message: editingDraft.message || editingDraft.customerMessage || editingDraft.quoteMessage || editingDraft.reminderMessage || "",
      description: editingDraft.description || editingDraft.invoiceDescription || editingDraft.detail || "",
      worker_id: editingDraft.workerChoice || editingDraft.worker_id || "",
      invoice_client_name: editingDraft.invoiceClientName || "",
      invoice_line_item: editingDraft.invoiceLineItemsText || "",
    };

    onApprove(editingSelection, normalizedDraft);
    setEditingSelection(null);
  }

  const editingContext = editingSelection
    ? cxPreparedActionContext({
        item: editingSelection.item || {},
        row: rowText(editingSelection.item, 0, editingSelection.label || "Smart Hub item"),
        boxKey: editingSelection.hubBoxKey || box.key,
        group: editingSelection.group || box.title,
        controlDraft: editingDraft,
      })
    : null;

  return (
    <div className="cx-smart-modal-backdrop" onClick={onClose}>
      <section
        className={`cx-smart-modal cx-smart-modal-${box.key}`}
        role="dialog"
        aria-modal="true"
        aria-label={box.title}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>Smart Hub</span>
            <h2>{box.title}</h2>
            <p>{intro}</p>
          </div>
          <div className="cx-smart-modal-header-actions">
            <button type="button" aria-label="Close Smart Hub pop-up" onClick={onClose}>×</button>
          </div>
        </header>

        <section className="cx-smart-modal-summary">
          <article>
            <span>Found</span>
            <strong>{modalCount}</strong>
            <small>{modalCountLabel}</small>
          </article>
          <article>
            <span>Mode</span>
            <strong>Review</strong>
            <small>Owner approves first</small>
          </article>
          <article>
            <span>Safety</span>
            <strong>No auto-send</strong>
            <small>You stay in control</small>
          </article>
        </section>

        <section className="cx-smart-modal-list">
          {rows.length ? rows.map((item, index) => {
            const row = rowText(item, index, box.title);
            const controlKey = smartControlKey(box.key, item, index, row);
            const controlDraft = controlDraftFor(controlKey, row, item);
            const actionGroup = actionGroupForBox(box.key, row);
            const itemKindClass = `cx-smart-modal-item-${String(actionGroup || box.key || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

            const actionId = item?.id || item?._id || item?.action_id || "";
            const sourceType = item?.source_type || item?.kind || item?.type || row.lead;
            const sourceId = item?.source_id || item?.job_id || item?.invoice_id || item?.quote_id || item?.id || item?._id || "";

            const selection = {
              item,
              page: workspaceForBox,
              group: actionGroup,
              hubBoxKey: box.key,
              actionId,
              sourceType,
              sourceId,
              label: row.title,
              recommendation: reasonFor(row),
            };
            const isApproved = approved[row.title];
            const context = cxPreparedActionContext({
              item,
              row,
              boxKey: box.key,
              group: actionGroup,
              controlDraft,
            });

            return (
              <article className={`cx-smart-modal-item ${itemKindClass}`} key={`${box.key}-${index}-${row.title}`}>
                <div>
                  <span>{row.lead}</span>
                  <h3>{row.title}</h3>
                  <p>{row.detail}</p>
                  <div className="cx-smart-modal-tags">
                    <b className={`risk-${riskClassFor(row)}`}>{riskFor(row)}</b>
                    <small>{row.status}</small>
                    {isApproved ? <small>Approved</small> : null}
                  </div>
                </div>

                <aside>
                  <section className="cx-ai-prepared-brief cx-ai-prepared-machine">
                    <span>Churvox prepared</span>
                    <h4>{primaryActionLabel(row)}</h4>
                    <p>{context.found}</p>

                    <div className="cx-ai-context-grid">
                      <article>
                        <b>Checked</b>
                        <ul>
                          {context.checked.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      </article>
                      <article>
                        <b>Prepared</b>
                        <p>{context.prepared}</p>
                      </article>
                      <article>
                        <b>Approval preview</b>
                        <p>{context.approvalPreview}</p>
                      </article>
                    </div>

                    {context.missing.length ? (
                      <div className="cx-ai-missing-strip">
                        <b>Needs owner input</b>
                        <span>{context.missing.join(" · ")}</span>
                      </div>
                    ) : (
                      <small>Ready for owner review. No page jump needed.</small>
                    )}
                  </section>

                  <div className="cx-ai-prepared-actions">
                    <button
                      type="button"
                      className="approve"
                      onClick={() => startEdit(selection, controlDraft)}
                    >
                      Review / approve
                    </button>
                    <button type="button" onClick={() => onSnooze(box, item)}>Later</button>
                    {canResolveBox() ? (
                      <button type="button" className="resolve" onClick={() => onResolve(box, item)}>
                        {resolveLabel()}
                      </button>
                    ) : null}
                  </div>
                </aside>
              </article>
            );
          }) : (
            <div className="cx-smart-modal-empty">
              <h3>{modalEmptyTitle()}</h3>
              <p>{modalEmptyBody()}</p>
            </div>
          )}
        </section>

        {editingSelection ? (
          <section className="cx-smart-modal-edit">
            <header>
              <div>
                <span>{editingNeedsInvoiceDraft() ? "Invoice draft approval" : "Edit before approval"}</span>
                <h3>
                  {editingNeedsInvoiceDraft()
                    ? (editingDraft.invoiceTitle || `Invoice draft for ${editingDraft.invoiceClientName || "client"}`)
                    : editingDraft.title}
                </h3>
                <p>
                  {editingNeedsInvoiceDraft()
                    ? "This is the invoice draft the owner is approving. Check client, amount, due date, line item and wording."
                    : "Review what Churvox prepared, adjust only if needed, then approve here."}
                </p>
              </div>
              <button type="button" onClick={() => setEditingSelection(null)}>Back</button>
            </header>

            {editingContext ? (
              <section className="cx-ai-approval-preview-machine">
                <article>
                  <span>What Churvox found</span>
                  <p>{editingContext.found}</p>
                </article>
                <article>
                  <span>What Churvox checked</span>
                  <ul>
                    {editingContext.checked.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
                <article>
                  <span>What Churvox prepared</span>
                  <p>{editingContext.prepared}</p>
                </article>
                <article>
                  <span>When approved</span>
                  <p>{editingContext.approvalPreview}</p>
                </article>
              </section>
            ) : null}

            {editingNeedsInvoiceDraft() ? (
              <div className="cx-edit-invoice-draft cx-edit-invoice-draft-real cx-invoice-owner-preview-wrap">
                <section className="cx-invoice-owner-preview">
                  <div className="cx-invoice-owner-preview-head">
                    <div>
                      <span>Draft invoice</span>
                      <h4>{editingDraft.invoiceTitle || `Invoice draft for ${editingDraft.invoiceClientName || "client"}`}</h4>
                    </div>
                    <b>{editingDraft.invoiceStatus || "Draft"}</b>
                  </div>

                  <div className="cx-invoice-owner-preview-meta">
                    <article>
                      <span>Bill to</span>
                      <strong>{editingDraft.invoiceClientName || "Client name needed"}</strong>
                    </article>
                    <article>
                      <span>Due date</span>
                      <strong>{String(editingDraft.invoiceDueDate || "").slice(0, 10) || "Set due date"}</strong>
                    </article>
                    <article>
                      <span>Amount due</span>
                      <strong>{editingDraft.invoiceAmount ? `$${editingDraft.invoiceAmount}` : "Add amount"}</strong>
                    </article>
                  </div>

                  <div className="cx-invoice-owner-line">
                    <span>Line item</span>
                    <strong>{editingDraft.invoiceLineItemsText || "Completed service"}</strong>
                    <p>{editingDraft.invoiceDescription || "Invoice wording needed before approval."}</p>
                  </div>

                  <div className="cx-invoice-owner-total">
                    <span>Total</span>
                    <strong>{editingDraft.invoiceAmount ? `$${editingDraft.invoiceAmount}` : "Amount required"}</strong>
                  </div>
                </section>

                <section className="cx-invoice-owner-edit-fields">
                  <label>
                    Client
                    <input
                      value={editingDraft.invoiceClientName || ""}
                      onChange={(event) => {
                        updateEditingDraft("invoiceClientName", event.target.value);
                        updateEditingDraft("invoiceTitle", `Invoice draft for ${event.target.value || "client"}`);
                      }}
                      placeholder="Client name"
                    />
                  </label>

                  <label>
                    Amount
                    <input
                      value={editingDraft.invoiceAmount || ""}
                      onChange={(event) => updateEditingDraft("invoiceAmount", event.target.value)}
                      placeholder="Add amount"
                    />
                  </label>

                  <label>
                    Due date
                    <input
                      type="date"
                      value={String(editingDraft.invoiceDueDate || "").slice(0, 10)}
                      onChange={(event) => updateEditingDraft("invoiceDueDate", event.target.value)}
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={editingDraft.invoiceStatus || "draft"}
                      onChange={(event) => updateEditingDraft("invoiceStatus", event.target.value)}
                    >
                      <option value="draft">Draft</option>
                      <option value="ready">Ready</option>
                      <option value="approved">Approved</option>
                    </select>
                  </label>

                  <label className="wide">
                    Line item
                    <input
                      value={editingDraft.invoiceLineItemsText || ""}
                      onChange={(event) => updateEditingDraft("invoiceLineItemsText", event.target.value)}
                      placeholder="Completed service"
                    />
                  </label>

                  <label className="wide">
                    Invoice wording owner will approve
                    <textarea
                      value={editingDraft.invoiceDescription || ""}
                      onChange={(event) => updateEditingDraft("invoiceDescription", event.target.value)}
                      placeholder="Customer-facing invoice wording..."
                    />
                  </label>

                  <label className="wide">
                    Owner note
                    <textarea
                      value={editingDraft.ownerNote || ""}
                      onChange={(event) => updateEditingDraft("ownerNote", event.target.value)}
                      placeholder="Optional internal note..."
                    />
                  </label>
                </section>
              </div>
            ) : (
              <div className={`cx-action-review cx-action-review-${editingApprovalMode()}`}>
                <section className="cx-action-review-prepared">
                  <span>{editingReviewCopy().label}</span>
                  <h4>{editingReviewCopy().title}</h4>
                  <p>{editingReviewCopy().body}</p>
                </section>

                {editingApprovalMode() === "dispatch" ? (
                  <>
                    <label>
                      Assign worker
                      <select
                        value={editingDraft.workerChoice || ""}
                        onChange={(event) => updateEditingDraft("workerChoice", event.target.value)}
                      >
                        <option value="">Choose worker...</option>
                        {workerOptionsForEdit.map((worker) => (
                          <option key={`${worker.id}-${worker.name}`} value={worker.id || worker.name}>
                            {worker.name}{worker.region ? ` · ${worker.region}` : ""}
                          </option>
                        ))}
                      </select>
                      {!workerOptionsForEdit.length ? <small className="cx-worker-picker-note">No workers loaded yet. Add workers in Team first.</small> : null}
                    </label>

                    <label>
                      Conflict check
                      <select
                        value={editingDraft.conflictStatus || "clear"}
                        onChange={(event) => updateEditingDraft("conflictStatus", event.target.value)}
                      >
                        <option value="clear">No conflict found</option>
                        <option value="check">Needs check</option>
                        <option value="conflict">Possible conflict</option>
                      </select>
                    </label>

                    <label className="wide">
                      Worker instruction
                      <textarea
                        value={editingDraft.customerMessage || ""}
                        onChange={(event) => updateEditingDraft("customerMessage", event.target.value)}
                        placeholder="Instructions for the worker..."
                      />
                    </label>

                    <label className="wide">
                      Owner note
                      <textarea
                        value={editingDraft.ownerNote || ""}
                        onChange={(event) => updateEditingDraft("ownerNote", event.target.value)}
                        placeholder="Access notes, timing, priority..."
                      />
                    </label>
                  </>
                ) : editingApprovalMode() === "cashflow" ? (
                  <>
                    <label>
                      Follow-up type
                      <select
                        value={editingDraft.collectAction || "friendly_reminder"}
                        onChange={(event) => updateEditingDraft("collectAction", event.target.value)}
                      >
                        <option value="friendly_reminder">Friendly reminder</option>
                        <option value="second_notice">Second notice</option>
                        <option value="check_payment">Check payment</option>
                        <option value="mark_paid">Mark paid</option>
                      </select>
                    </label>

                    <label>
                      Payment status
                      <select
                        value={editingDraft.paymentStatus || "unpaid"}
                        onChange={(event) => updateEditingDraft("paymentStatus", event.target.value)}
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="overdue">Overdue</option>
                        <option value="part_paid">Part paid</option>
                        <option value="paid">Paid</option>
                      </select>
                    </label>

                    <label className="wide">
                      Payment reminder owner will approve
                      <textarea
                        value={editingDraft.reminderMessage || editingDraft.customerMessage || ""}
                        onChange={(event) => updateEditingDraft("reminderMessage", event.target.value)}
                        placeholder="Prepared reminder wording..."
                      />
                    </label>

                    <label className="wide">
                      Internal note
                      <textarea
                        value={editingDraft.ownerNote || ""}
                        onChange={(event) => updateEditingDraft("ownerNote", event.target.value)}
                        placeholder="Payment context or next follow-up..."
                      />
                    </label>
                  </>
                ) : editingApprovalMode() === "message" ? (
                  <>
                    <label>
                      Follow-up status
                      <select
                        value={editingDraft.followupStatus || "draft"}
                        onChange={(event) => updateEditingDraft("followupStatus", event.target.value)}
                      >
                        <option value="draft">Draft</option>
                        <option value="ready">Ready to send/copy</option>
                        <option value="followed_up">Followed up</option>
                        <option value="snoozed">Snoozed</option>
                      </select>
                    </label>

                    <label>
                      Timing
                      <input
                        value={editingDraft.followupTiming || ""}
                        onChange={(event) => updateEditingDraft("followupTiming", event.target.value)}
                        placeholder="Today, tomorrow, next week"
                      />
                    </label>

                    <label className="wide">
                      Customer follow-up owner will approve
                      <textarea
                        value={editingDraft.quoteMessage || editingDraft.customerMessage || ""}
                        onChange={(event) => updateEditingDraft("quoteMessage", event.target.value)}
                        placeholder="Prepared quote or customer follow-up..."
                      />
                    </label>

                    <label className="wide">
                      Owner note
                      <textarea
                        value={editingDraft.ownerNote || ""}
                        onChange={(event) => updateEditingDraft("ownerNote", event.target.value)}
                        placeholder="Customer preference or internal note..."
                      />
                    </label>
                  </>
                ) : editingApprovalMode() === "template" ? (
                  <>
                    <label>
                      Job title
                      <input
                        value={editingDraft.templateJobTitle || editingDraft.title || ""}
                        onChange={(event) => updateEditingDraft("templateJobTitle", event.target.value)}
                        placeholder="Job title"
                      />
                    </label>

                    <label>
                      Client
                      <input
                        value={editingDraft.templateClientName || ""}
                        onChange={(event) => updateEditingDraft("templateClientName", event.target.value)}
                        placeholder="Client name"
                      />
                    </label>

                    <label className="wide">
                      Address
                      <input
                        value={editingDraft.templateAddress || ""}
                        onChange={(event) => updateEditingDraft("templateAddress", event.target.value)}
                        placeholder="Job address"
                      />
                    </label>

                    <label className="wide">
                      Job notes
                      <textarea
                        value={editingDraft.templateNotes || editingDraft.detail || ""}
                        onChange={(event) => updateEditingDraft("templateNotes", event.target.value)}
                        placeholder="Notes for the new job..."
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      Decision
                      <input
                        value={editingDraft.status || ""}
                        onChange={(event) => updateEditingDraft("status", event.target.value)}
                        placeholder="Decision"
                      />
                    </label>

                    <label>
                      Follow-up
                      <input
                        value={editingDraft.reportFollowUp || editingDraft.followupTiming || ""}
                        onChange={(event) => updateEditingDraft("reportFollowUp", event.target.value)}
                        placeholder="Optional follow-up"
                      />
                    </label>

                    <label className="wide">
                      AI-prepared detail
                      <textarea
                        value={editingDraft.detail || ""}
                        onChange={(event) => updateEditingDraft("detail", event.target.value)}
                      />
                    </label>

                    <label className="wide">
                      Owner note
                      <textarea
                        value={editingDraft.ownerNote || ""}
                        onChange={(event) => updateEditingDraft("ownerNote", event.target.value)}
                        placeholder="Add decision note before approval..."
                      />
                    </label>
                  </>
                )}
              </div>
            )}

            <footer>
              <button type="button" onClick={() => setEditingSelection(null)}>Back to list</button>
              <button type="button" className="approve" onClick={approveEditedSelection}>
                {editingNeedsInvoiceDraft() ? "Approve invoice draft" : "Approve edited action"}
              </button>
            </footer>
          </section>
        ) : null}
      </section>
    </div>
  );
}



function workspaceOperatorConfig(page, counts = {}) {
  const configs = {
    jobs: {
      label: "Jobs machine",
      title: "Churvox turns job records into prepared owner decisions.",
      watches: [
        "unassigned jobs",
        "schedule conflicts",
        "worker progress",
        "completion notes",
        "proof photos",
      ],
      prepares: [
        "worker assignment recommendations",
        "job instructions",
        "completion summaries",
        "invoice-ready proof",
      ],
      owner: [
        "approve worker assignment",
        "edit job details",
        "review completed work",
      ],
      next: counts.unassignedJobs ? `${counts.unassignedJobs} job${counts.unassignedJobs === 1 ? "" : "s"} need worker assignment.` : "No unassigned jobs waiting right now.",
      primary: "Create or review jobs",
      open: "jobs",
    },
    clients: {
      label: "Client intelligence",
      title: "Churvox keeps client data useful for jobs, invoices and follow-ups.",
      watches: [
        "missing phone/email",
        "duplicate client records",
        "open quotes",
        "unpaid invoices",
        "recent jobs",
      ],
      prepares: [
        "client cleanup actions",
        "next-best follow-up",
        "job/invoice context",
        "CSV import checks",
      ],
      owner: [
        "fix missing details",
        "approve import cleanup",
        "open client history in-place",
      ],
      next: counts.clients ? `${counts.clients} client record${counts.clients === 1 ? "" : "s"} available for Churvox context.` : "Add or import clients so Churvox can prepare real work.",
      primary: "Add or import clients",
      open: "clients",
    },
    team: {
      label: "Crew intelligence",
      title: "Churvox uses team data to recommend the right worker.",
      watches: [
        "worker availability",
        "region / service area",
        "assigned workload",
        "role permissions",
        "job fit",
      ],
      prepares: [
        "best worker match",
        "conflict warning",
        "worker instructions",
        "crew workload context",
      ],
      owner: [
        "approve assignment",
        "edit worker details",
        "add workers or roles",
      ],
      next: counts.team ? `${counts.team} worker${counts.team === 1 ? "" : "s"} available for dispatch context.` : "Add workers so Churvox can recommend assignments.",
      primary: "Add or review workers",
      open: "team",
    },
    quotes: {
      label: "Quote operator",
      title: "Churvox keeps quote follow-up moving without auto-sending.",
      watches: [
        "sent quotes",
        "open quotes",
        "stale quotes",
        "quote value",
        "client contact",
      ],
      prepares: [
        "quote follow-up message",
        "convert-to-job path",
        "customer response summary",
        "owner approval draft",
      ],
      owner: [
        "edit follow-up wording",
        "approve message",
        "convert quote to job",
      ],
      next: counts.quotes ? `${counts.quotes} quote${counts.quotes === 1 ? "" : "s"} in the quote workspace.` : "Create quotes so Churvox can prepare follow-ups.",
      primary: "Review quotes",
      open: "quotes",
    },
    invoices: {
      label: "Invoice operator",
      title: "Churvox turns completed work into owner-approved invoice drafts.",
      watches: [
        "completed jobs",
        "draft invoices",
        "unpaid invoices",
        "overdue payments",
        "missing amounts",
      ],
      prepares: [
        "invoice wording",
        "line item draft",
        "payment reminder",
        "cashflow follow-up",
      ],
      owner: [
        "check amount",
        "edit wording",
        "approve invoice or reminder",
      ],
      next: counts.invoices ? `${counts.invoices} invoice${counts.invoices === 1 ? "" : "s"} available for review.` : "Completed jobs and invoice drafts will appear here.",
      primary: "Review invoices",
      open: "invoices",
    },
    proof: {
      label: "Proof-to-paid",
      title: "Churvox connects worker proof to invoice-ready admin.",
      watches: [
        "completed jobs",
        "worker notes",
        "proof photos",
        "time records",
        "client details",
      ],
      prepares: [
        "completion summary",
        "customer proof message",
        "invoice description",
        "owner approval card",
      ],
      owner: [
        "review proof",
        "edit invoice description",
        "approve draft invoice",
      ],
      next: counts.completedJobs ? `${counts.completedJobs} completed job${counts.completedJobs === 1 ? "" : "s"} can feed proof-to-paid.` : "Worker-completed jobs will feed this workspace.",
      primary: "Review proof",
      open: "proof",
    },
    settings: {
      label: "Teach Churvox",
      title: "Settings teach the AI how the business should run.",
      watches: [
        "business profile",
        "service area",
        "pricing rules",
        "invoice/quote wording",
        "approval rules",
      ],
      prepares: [
        "better job matches",
        "cleaner invoices",
        "safer owner approvals",
        "new-user guidance",
      ],
      owner: [
        "set guardrails",
        "connect integrations",
        "train business context",
      ],
      next: "Complete setup so Churvox prepares specific actions instead of guessing.",
      primary: "Teach Churvox",
      open: "settings",
    },
    plans: {
      label: "Plan control",
      title: "Choose the capacity Churvox can run with.",
      watches: [
        "client limits",
        "team access",
        "AI workflow access",
        "MYOB availability",
      ],
      prepares: [
        "plan selection",
        "upgrade path",
        "feature access clarity",
      ],
      owner: [
        "choose plan",
        "confirm billing",
        "unlock needed workflow",
      ],
      next: "Plan choice controls capacity and integrations.",
      primary: "Review plans",
      open: "plans",
    },
  };

  return configs[page] || configs.jobs;
}

function WorkspaceOperatorPanel({ page, counts, onOpen }) {
  const config = workspaceOperatorConfig(page, counts);

  return (
    <section className={`cx-workspace-operator-panel cx-workspace-operator-${page}`}>
      <header>
        <div>
          <span>{config.label}</span>
          <h2>{config.title}</h2>
          <p>{config.next}</p>
        </div>
        <button type="button" onClick={() => onOpen(config.open)}>
          {config.primary}
        </button>
      </header>

      <div className="cx-workspace-operator-grid">
        <article>
          <span>Churvox watches</span>
          <ul>
            {config.watches.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article>
          <span>Churvox prepares</span>
          <ul>
            {config.prepares.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article>
          <span>Owner approves / edits</span>
          <ul>
            {config.owner.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </div>
    </section>
  );
}

function workspaceMachineEmptyCopy(page) {
  const config = workspaceOperatorConfig(page, {});
  return {
    title: `${config.label} needs real data.`,
    body: config.next || "Add real records so Churvox can prepare useful owner actions.",
  };
}



function Workspace({ page, setPage, data }) {
  const actions = data?.actions || [];
  const jobs = data?.jobs || [];
  const clients = data?.clients || [];
  const team = data?.team || [];
  const quotes = data?.quotes || [];
  const invoices = data?.invoices || [];
  const stats = data?.stats || {};
  const operator = data?.operator || {};
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [approved, setApproved] = useState({});
  const [approvalLog, setApprovalLog] = useState(() => readOwnerCommandLog());
  const [backendApprovalLog, setBackendApprovalLog] = useState([]);
  const [backendApprovalStatus, setBackendApprovalStatus] = useState("");
  const [approvedDrafts, setApprovedDrafts] = useState([]);
  const [approvedDraftsStatus, setApprovedDraftsStatus] = useState("");
  const [sendCenterItems, setSendCenterItems] = useState([]);
  const [sendCenterStatus, setSendCenterStatus] = useState("");
  const [hubFocus, setHubFocus] = useState("");
  const [selectedHubBox, setSelectedHubBox] = useState(null);
  const [hubItemStatus, setHubItemStatus] = useState(() => readSmartHubItemStatus());
  const [hubNotice, setHubNotice] = useState(null);
  const [setupProfile, setSetupProfile] = useState(() => readChurvoxSetupProfile());
  const [setupSaved, setSetupSaved] = useState("");
  const workerMode = isWorkerSession();

  const meta = {
    dashboard: {
      kicker: "Smart Hub",
      title: "AI has prepared today’s business actions.",
      body: data?.loading
        ? "Syncing live Churvox data..."
        : data?.error || "Churvox checks the exact jobs, clients, workers, quotes and invoices, then prepares the next action for owner approval.",
      rows: jobs,
    },
    queue: {
      kicker: "Smart Hub",
      title: "Approvals live inside Smart Hub.",
      body: "Use the To approve box on Smart Hub to review AI-prepared actions.",
      rows: actions.map((item) => [item.type, item.title, item.body, item.action]),
    },
    jobs: {
      kicker: "Jobs",
      title: "Jobs become prepared dispatch and proof-to-paid actions.",
      body: "Churvox checks each job for worker assignment, schedule risk, proof, notes and invoice readiness. Owner reviews/edit/approves in-place.",
      rows: jobs,
    },
    clients: {
      kicker: "Clients",
      title: "Clients feed every prepared job, quote and invoice.",
      body: "Churvox watches missing details, duplicate clients, open quotes and unpaid invoices so owner actions are prepared from real context.",
      rows: clients,
    },
    team: {
      kicker: "Team",
      title: "Team data powers worker recommendations.",
      body: "Churvox checks worker role, region, workload and availability before preparing assignment decisions.",
      rows: team,
    },
    quotes: {
      kicker: "Quotes",
      title: "Quotes turn into prepared follow-ups or jobs.",
      body: "Churvox checks quote age, value, client contact and status, then prepares owner-approved follow-ups.",
      rows: quotes,
    },
    invoices: {
      kicker: "Invoices",
      title: "Invoices are prepared from proof, notes and payment status.",
      body: "Churvox prepares invoice wording, payment reminders and cashflow actions. Owner edits/approves before anything sends.",
      rows: invoices,
    },
    proof: {
      kicker: "Proof-to-Paid",
      title: "Proof-to-paid turns worker proof into owner-approved invoice admin.",
      body: "Worker notes, photos and completion status feed this flow so Churvox prepares the invoice/proof package for approval.",
      rows: [...jobs.slice(0, 4), ...invoices.slice(0, 4)],
    },
    plans: {
      kicker: "Plans",
      title: "Choose your Churvox plan.",
      body: "Simple plans for trade and service businesses. AI runs the admin, owner approves the important parts.",
      rows: [
        ["Solo", "$30 / month", "One operator, simple job control, up to 20 clients.", "Current"],
        ["Team", "$70 / month", "Small crew, jobs, clients, quotes, invoices and team workflow.", "Choose"],
        ["Pro", "$110 / month", "Stronger AI Operator workflows, automation and MYOB add-on option.", "Choose"],
        ["Enterprise", "$240 / month", "Larger teams, advanced controls, MYOB included and more capacity.", "Choose"],
      ],
    },
    settings: {
      kicker: "Settings",
      title: "Teach Churvox how the business should run.",
      body: "Set service area, pricing, roles, approval rules and integrations so AI prepares specific work safely.",
      rows: [
        ["Plan", "Billing", "Roles and owner controls", "Review"],
        ["MYOB", "Integration", "Accounting sync settings", "Review"],
        ["SMS", "Messages", "Credits and sending guardrails", "Review"],
        ["Security", "Permissions", "Team and role access", "Review"],
      ],
    },
  };

  const current = meta[page] || meta.dashboard;

  function updateSetupProfileField(key, value) {
    setSetupProfile((currentProfile) => ({
      ...currentProfile,
      [key]: value,
    }));
    setSetupSaved("");
  }

  async function saveSetupProfileLocal() {
    const cleaned = {
      ...DEFAULT_SETUP_PROFILE,
      ...setupProfile,
      businessName: String(setupProfile.businessName || "").trim(),
      industry: String(setupProfile.industry || "").trim(),
      region: String(setupProfile.region || "").trim(),
      serviceArea: String(setupProfile.serviceArea || "").trim(),
      invoiceEmail: String(setupProfile.invoiceEmail || "").trim(),
      invoicePrefix: String(setupProfile.invoicePrefix || "INV").trim() || "INV",
      quotePrefix: String(setupProfile.quotePrefix || "Q").trim() || "Q",
    };

    setSetupProfile(cleaned);
    saveChurvoxSetupProfile(cleaned);
    setSetupSaved("Saving setup...");

    try {
      const result = await apiPost("/business/setup-profile", cleaned);
      const savedProfile = result?.profile && typeof result.profile === "object"
        ? { ...DEFAULT_SETUP_PROFILE, ...result.profile }
        : cleaned;

      setSetupProfile(savedProfile);
      saveChurvoxSetupProfile(savedProfile);
      setSetupSaved("Setup saved. Churvox recommendations will use this context.");
    } catch {
      setSetupSaved("Setup saved on this device. Backend sync will retry when available.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSetupProfile() {
      if (!readToken()) return;

      try {
        const payload = await apiGet("/business/setup-profile");
        const profile = payload?.profile && typeof payload.profile === "object"
          ? { ...DEFAULT_SETUP_PROFILE, ...payload.profile }
          : readChurvoxSetupProfile();

        if (!cancelled) {
          setSetupProfile(profile);
          saveChurvoxSetupProfile(profile);
        }
      } catch {
        if (!cancelled) {
          setSetupProfile(readChurvoxSetupProfile());
        }
      }
    }

    loadSetupProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveSmartHubItemStatus(hubItemStatus);
  }, [hubItemStatus]);

  useEffect(() => {
    if (!hubNotice) return undefined;
    const timer = window.setTimeout(() => setHubNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [hubNotice]);

  useEffect(() => {
    let cancelled = false;

    async function loadBackendApprovals() {
      if (!readToken()) return;

      try {
        setBackendApprovalStatus("Loading saved approvals...");
        const payload = await apiGet("/ai/owner-command/approvals");
        const approvals = Array.isArray(payload?.approvals) ? payload.approvals : [];
        if (!cancelled) {
          setBackendApprovalLog(approvals.slice(0, 12));
          setBackendApprovalStatus(approvals.length ? "Saved approvals loaded" : "No saved approvals yet");
        }
      } catch (err) {
        if (!cancelled) {
          setBackendApprovalStatus("Saved approvals could not load yet");
        }
      }
    }

    async function loadApprovedDrafts() {
      if (!readToken()) return;

      try {
        setApprovedDraftsStatus("Loading approved drafts...");
        const payload = await apiGet("/ai/owner-command/approved-drafts");
        const drafts = Array.isArray(payload?.drafts) ? payload.drafts : [];
        if (!cancelled) {
          setApprovedDrafts(drafts.slice(0, 10));
          setApprovedDraftsStatus(drafts.length ? "Approved drafts ready" : "No approved drafts yet");
        }
      } catch (err) {
        if (!cancelled) {
          setApprovedDraftsStatus("Approved drafts could not load yet");
        }
      }
    }

    async function loadSendCenter() {
      if (!readToken()) return;

      try {
        setSendCenterStatus("Loading ready-to-send drafts...");
        const payload = await apiGet("/ai/owner-command/send-center");
        const items = Array.isArray(payload?.items) ? payload.items : [];
        if (!cancelled) {
          setSendCenterItems(items.slice(0, 10));
          setSendCenterStatus(items.length ? "Ready-to-send drafts loaded" : "No drafts ready to send");
        }
      } catch (err) {
        if (!cancelled) {
          setSendCenterStatus("Send Center could not load yet");
        }
      }
    }

    loadBackendApprovals();
    loadApprovedDrafts();
    loadSendCenter();

    return () => {
      cancelled = true;
    };
  }, []);


  const todayRows = [
    ...jobs.slice(0, 3),
    ...invoices.slice(0, 2),
  ];

  const preparedMessageRows = [
    ...sendCenterItems.map((item) => ({
      ...item,
      type: item.kind || item.type || "Ready message",
      title: item.client_name || item.customer_name || item.title || "Client message",
      message: item.message || item.body || item.title || "Ready to send",
      status: item.send_status || item.status || "ready_to_send",
      source_area: "send",
    })),
    ...approvedDrafts.map((item) => ({
      ...item,
      type: item.kind || item.type || "Approved draft",
      title: item.client_name || item.customer_name || item.title || "Client message",
      message: item.message || item.body || item.title || "Approved draft",
      status: item.send_status || item.status || "not_sent",
      source_area: "approved",
    })),
  ].slice(0, 6);

  const completedJobs = jobs.filter((job) => {
    const status = String(job?.status || job?.job_status || job?.workflow_status || "").toLowerCase();
    return status.includes("complete") || status.includes("done") || job?.completed === true || Boolean(job?.completed_at);
  });

  const invoicedJobIds = new Set(
    invoices
      .map((invoice) => String(invoice?.job_id || invoice?.source_job_id || invoice?.ai_source_job_id || ""))
      .filter(Boolean)
  );

  const completedJobsReadyToInvoice = completedJobs
    .filter((job) => {
      const jobId = String(job?._id || job?.id || job?.job_id || "");
      return !jobId || !invoicedJobIds.has(jobId);
    })
    .map((job) => ({
      ...job,
      type: "Completed job",
      title: `Prepare invoice for ${job?.client_name || job?.customer_name || job?.title || job?.name || "completed job"}`,
      message: cxInvoiceDescription(job, "Completed job ready for invoice review"),
      status: cxInvoicePreparedStatus(job),
      source_type: "completed_job",
      source_id: job?._id || job?.id || job?.job_id || "",
      invoice_amount: cxInvoiceAmount(job),
      invoice_description: cxInvoiceDescription(job, "Completed job ready for invoice review"),
      invoice_status: "draft",
    }));

  const draftInvoiceRows = invoices
    .filter((invoice) => /draft|ready|pending/i.test(String(invoice?.status || invoice?.invoice_status || invoice?.payment_status || "")))
    .map((invoice) => ({
      ...invoice,
      type: "Invoice draft",
      title: invoice?.client_name || invoice?.customer_name || invoice?.title || "Draft invoice",
      message: cxInvoiceDescription(invoice, "Draft invoice ready for review"),
      status: cxInvoicePreparedStatus(invoice),
      source_type: "invoice",
      source_id: invoice?._id || invoice?.id || invoice?.invoice_id || "",
      invoice_amount: cxInvoiceAmount(invoice),
      invoice_description: cxInvoiceDescription(invoice, "Draft invoice ready for review"),
      invoice_status: cxInvoiceStatus(invoice),
    }));

  const readyInvoiceRows = [
    ...completedJobsReadyToInvoice,
    ...draftInvoiceRows,
  ].slice(0, 6);

  const unassignedJobRows = jobs
    .filter((job) => {
      const status = String(job?.status || job?.job_status || job?.workflow_status || "").toLowerCase();
      const done = status.includes("complete") || status.includes("cancel");
      const assigned = job?.assigned_worker_id || job?.worker_id || job?.assigned_worker || job?.assigned_worker_name;
      return !done && !assigned;
    })
    .map((job) => [
      "Unassigned job",
      job?.title || job?.name || job?.client_name || "Job needs worker",
      job?.address || job?.description || "No worker assigned yet",
      "Assign",
    ]);

  const brokenInvoiceRows = invoices
    .filter((invoice) => {
      const hasClient = invoice?.client_name || invoice?.customer_name || invoice?.client_id || invoice?.customer_id;
      const hasAmount = Number(invoice?.total || invoice?.amount || invoice?.balance || 0) > 0;
      return !hasClient || !hasAmount;
    })
    .map((invoice) => [
      "Invoice issue",
      invoice?.title || invoice?.client_name || "Invoice needs checking",
      !invoice?.client_name && !invoice?.customer_name ? "Missing client details" : "Missing amount or balance",
      "Fix",
    ]);

  const aiBlockerRows = actions
    .filter((item) => {
      const type = String(item.type || "").toLowerCase();
      return type.includes("dispatch") || type.includes("cashflow") || type.includes("payment") || type.includes("overdue");
    })
    .map((item) => [item.type, item.title, item.body, item.action]);

  const attentionRows = [
    ...unassignedJobRows,
    ...brokenInvoiceRows,
    ...aiBlockerRows,
  ].slice(0, 6);

  const collectRows = invoices
    .filter((invoice) => /overdue|unpaid|late/i.test(String(invoice?.status || invoice?.invoice_status || invoice?.payment_status || "")) || Number(invoice?.balance || 0) > 0)
    .slice(0, 6);

  const quoteRows = quotes
    .filter((quote) => /sent|pending|open|follow/i.test(String(quote?.status || quote?.quote_status || quote?.state || "")))
    .slice(0, 6);

  const crewRows = team.slice(0, 6);

  const requestRows = (Array.isArray(operator.requests) ? operator.requests : [])
    .filter((item) => !["converted_to_job", "dismissed", "closed"].includes(String(item?.status || "").toLowerCase()))
    .slice(0, 6)
    .map((item) => ({
      ...item,
      type: "Job request",
      title: item?.service_type || item?.title || `Request from ${item?.name || "customer"}`,
      message: item?.notes || item?.address || "Customer request waiting for owner review",
      status: "Create draft job",
      source_type: "public_job_request",
      source_id: item?.id || item?.request_id || item?._id || "",
    }));

  const dispatchBoard = operator.dispatch || {};
  const dispatchRows = [
    ...((Array.isArray(dispatchBoard.unassigned) ? dispatchBoard.unassigned : []).slice(0, 4).map((item) => ({
      ...item,
      type: "Dispatch",
      title: item?.title || item?.name || item?.client_name || "Unassigned job",
      message: item?.address || item?.description || "Needs worker assignment",
      status: "Assign worker",
      source_type: "dispatch_job",
      source_id: item?.id || item?._id || "",
    }))),
    ...((Array.isArray(dispatchBoard.conflicts) ? dispatchBoard.conflicts : []).slice(0, 2).map((item) => ({
      ...item,
      type: "Schedule conflict",
      title: item?.worker_name || "Worker conflict",
      message: item?.message || "Possible schedule clash",
      status: "Check conflict",
      source_type: "dispatch_conflict",
      source_id: item?.job_a || item?.job_b || "",
    }))),
  ];

  const recurringRows = (Array.isArray(operator.recurring) ? operator.recurring : [])
    .slice(0, 6)
    .map((item) => ({
      ...item,
      type: "Recurring job",
      title: item?.title || item?.client_name || "Recurring job due",
      message: item?.address || item?.notes || item?.ai_summary || "Generate the next scheduled job",
      status: item?.next_due_date ? `Due ${item.next_due_date}` : "Generate next job",
      source_type: "recurring_job",
      source_id: item?.id || item?._id || "",
    }));

  const templateRows = (Array.isArray(operator.templates) ? operator.templates : [])
    .slice(0, 6)
    .map((item) => ({
      ...item,
      type: "Service template",
      title: item?.name || item?.service_type || "Service template",
      message: item?.default_invoice_description || item?.notes || "Reusable job preset",
      status: item?.photo_required ? "Photo proof required" : "Ready",
      source_type: "service_template",
      source_id: item?.id || item?._id || "",
    }));

  const ownerSummary = operator.ownerSummary || {};
  const cashflowReport = operator.cashflow || {};
  const workerReport = operator.workerReport || {};
  const quoteReport = operator.quoteReport || {};
  const reportSummary = ownerSummary.summary || {};
  const cashflowSummary = cashflowReport.summary || {};
  const quoteSummary = quoteReport.summary || {};
  const reportRows = [
    {
      type: "Owner report",
      title: "Weekly business summary",
      message: ownerSummary.ai_summary || "Completed jobs, quotes, invoices and cashflow summary",
      status: `${reportSummary.completed_jobs || 0} completed`,
      source_type: "owner_report",
      source_id: "owner-summary",
    },
    {
      type: "Cashflow",
      title: "Money to collect",
      message: cashflowReport.ai_summary || "Unpaid and overdue invoice summary",
      status: `${cashflowSummary.overdue?.count || 0} overdue`,
      source_type: "cashflow_report",
      source_id: "cashflow",
    },
    {
      type: "Quotes",
      title: "Quote follow-up report",
      message: quoteReport.ai_summary || "Quotes and follow-up opportunities",
      status: `${quoteSummary.needs_followup || 0} follow-ups`,
      source_type: "quote_report",
      source_id: "quotes",
    },
    {
      type: "Workers",
      title: "Worker workload report",
      message: workerReport.ai_summary || "Worker load and completed job summary",
      status: `${workerReport.summary?.worker_rows || 0} workers`,
      source_type: "worker_report",
      source_id: "workers",
    },
  ];

  const backendSetupAudit = operator.setupAudit || {};
  const backendSetupSummary = backendSetupAudit.summary || {};
  const backendSetupRows = [
    ...(backendSetupAudit.client_cleanup?.duplicate_groups || []).slice(0, 3).map((item) => ({
      type: "Setup cleanup",
      title: `${item.count || 2} possible duplicate clients`,
      message: item.ai_recommendation || "Review duplicate clients before merging",
      status: "Review duplicates",
      source_type: "setup_audit",
      source_id: item.match_key || "duplicate-clients",
    })),
    ...(backendSetupAudit.client_cleanup?.missing_phone || []).slice(0, 2).map((item) => ({
      type: "Setup cleanup",
      title: `${item.name || "Client"} missing phone`,
      message: item.email || "Client record needs phone number",
      status: "Missing phone",
      source_type: "setup_audit",
      source_id: item.id || "missing-phone",
    })),
    ...(backendSetupAudit.worker_cleanup?.missing_region || []).slice(0, 2).map((item) => ({
      type: "Setup cleanup",
      title: `${item.name || "Worker"} missing region`,
      message: item.email || "Worker needs service area for better dispatch",
      status: "Missing region",
      source_type: "setup_audit",
      source_id: item.id || "missing-region",
    })),
  ];

  const setupChecks = [
    { key: "business", done: Boolean(setupProfile.businessName), title: "Add business name", body: "This keeps quotes, invoices and messages branded.", action: "settings" },
    { key: "industry", done: Boolean(setupProfile.industry), title: "Choose industry / trade", body: "Trade context helps AI prepare better actions.", action: "settings" },
    { key: "region", done: Boolean(setupProfile.region && setupProfile.serviceArea), title: "Set region and service area", body: "Location context helps worker matching.", action: "settings" },
    { key: "invoice", done: Boolean(setupProfile.invoiceEmail && setupProfile.invoicePrefix && setupProfile.quotePrefix), title: "Set invoice and quote details", body: "Invoice and quote details help AI prepare cleaner drafts.", action: "settings" },
    { key: "clients", done: clients.length > 0, title: "Import or add clients", body: "Clients connect jobs, quotes, invoices and follow-ups.", action: "clients" },
    { key: "team", done: team.length > 0, title: "Add workers", body: "Workers let AI recommend assignments.", action: "team" },
    { key: "jobs", done: jobs.length > 0, title: "Create first job", body: "Jobs are the centre of Smart Hub.", action: "jobs" },
    { key: "quotes", done: quotes.length > 0, title: "Create or import quotes", body: "Quotes let AI prepare follow-ups.", action: "quotes" },
  ];

  const setupRows = setupChecks
    .filter((item) => !item.done)
    .map((item) => ["Setup", item.title, item.body, item.action === "settings" ? "Missing info" : "Needs owner check"])
    .slice(0, 6);

  const setupCompleteChecks = setupChecks.map((item) => item.done);
  const setupScore = Math.round((setupCompleteChecks.filter(Boolean).length / Math.max(setupCompleteChecks.length, 1)) * 100);

  const workspaceCounts = {
    jobs: jobs.length,
    clients: clients.length,
    team: team.length,
    quotes: quotes.length,
    invoices: invoices.length,
    completedJobs: completedJobs.length,
    unassignedJobs: unassignedJobRows.length,
    readyInvoices: readyInvoiceRows.length,
    messages: preparedMessageRows.length,
  };

  const moneyToCollect = collectRows.reduce((sum, invoice) => {
    const raw = invoice?.balance || invoice?.total || invoice?.amount || 0;
    const value = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.-]/g, ""));
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const moneyToCollectLabel = moneyToCollect > 0
    ? new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(moneyToCollect)
    : String(collectRows.length);

  const baseHubBoxes = [
    {
      key: "approvals",
      count: actions.length,
      label: "to approve",
      title: "To approve",
      body: "AI-prepared actions waiting for your decision.",
      action: "Open",
    },
    {
      key: "fix",
      count: attentionRows.length,
      label: "to fix",
      title: "Needs attention",
      body: "Unassigned jobs, invoice issues, overdue items, or cashflow blockers.",
      action: "Check",
    },
    {
      key: "invoice",
      count: readyInvoiceRows.length,
      label: "ready",
      title: "Ready to invoice",
      body: "Completed jobs and draft invoices that can turn into money.",
      action: "Review",
    },
    {
      key: "messages",
      count: preparedMessageRows.length,
      label: "messages",
      title: "Messages ready",
      body: "Quote follow-ups and reminders ready to copy or mark sent.",
      action: "View",
    },
    {
      key: "work",
      count: todayRows.length,
      label: "today",
      title: "Today’s work",
      body: "Jobs and invoices worth checking today.",
      action: "Review",
    },
    {
      key: "collect",
      count: moneyToCollectLabel,
      label: "to collect",
      title: "Money to collect",
      body: "Unpaid or overdue invoices that need attention.",
      action: "Collect",
    },
    {
      key: "quotes",
      count: quoteRows.length,
      label: "waiting",
      title: "Quotes waiting",
      body: "Quotes and follow-ups that may need a nudge.",
      action: "Open",
    },
    {
      key: "crew",
      count: crewRows.length,
      label: "active",
      title: "Crew active",
      body: "Workers and team records available for assignment.",
      action: "View",
    },
    {
      key: "requests",
      count: requestRows.length,
      label: "new",
      title: "Request inbox",
      body: "Customer requests ready to become draft jobs or quotes.",
      action: "Prepare",
    },
    {
      key: "dispatch",
      count: dispatchRows.length,
      label: "dispatch",
      title: "Dispatch board",
      body: "Unassigned jobs, schedule conflicts and dispatch decisions.",
      action: "Assign",
    },
    {
      key: "recurring",
      count: recurringRows.length,
      label: "due",
      title: "Recurring jobs",
      body: "Repeat work ready to generate or schedule.",
      action: "Generate",
    },
    {
      key: "templates",
      count: templateRows.length,
      label: "presets",
      title: "Service templates",
      body: "Reusable job presets, checklist and invoice wording.",
      action: "Use",
    },
    {
      key: "reports",
      count: reportRows.length,
      label: "reports",
      title: "Owner reports",
      body: "Cashflow, quote, worker and weekly business summaries.",
      action: "Review",
    },
  ];

  const setupHealthBox = {
    key: "setup",
    count: `${setupScore}%`,
    label: "complete",
    title: "Setup health",
    body: "Business setup checks that improve AI recommendations.",
    action: "Improve",
  };

  const hubBoxes = setupScore < 100
    ? [...baseHubBoxes, setupHealthBox]
    : baseHubBoxes;


  function hubRemainingCount(key) {
    return hubRowsForKey(key).filter((item) => {
      const status = hubItemStatus[hubItemKey(key, item)];
      return status !== "approved" && status !== "snoozed" && status !== "dismissed" && status !== "resolved";
    }).length;
  }

  const remainingApprovals = hubRemainingCount("approvals");
  const remainingAttention = hubRemainingCount("fix");
  const remainingInvoices = hubRemainingCount("invoice");
  const remainingMessages = hubRemainingCount("messages");
  const remainingCollect = hubRemainingCount("collect");

  const dailyBriefItems = [
    remainingApprovals ? `${remainingApprovals} approval${remainingApprovals === 1 ? "" : "s"}` : "",
    remainingAttention ? `${remainingAttention} blocker${remainingAttention === 1 ? "" : "s"}` : "",
    remainingInvoices ? `${remainingInvoices} ready to invoice` : "",
    remainingMessages ? `${remainingMessages} message${remainingMessages === 1 ? "" : "s"} ready` : "",
    remainingCollect ? `${moneyToCollectLabel} to collect` : "",
  ].filter(Boolean);

  const dailyBriefText = data?.loading
    ? "Churvox is checking today’s jobs, invoices, quotes, messages and crew."
    : data?.error
      ? data.error
      : dailyBriefItems.length
        ? `Churvox found ${dailyBriefItems.join(", ")}. Review the boxes below when you are ready.`
        : "Churvox has checked the workspace. Nothing urgent needs approval right now.";

  const topBriefBox = [
    "approvals",
    "fix",
    "invoice",
    "messages",
    "collect",
    "work",
    "quotes",
    "requests",
    "dispatch",
    "recurring",
    "reports",
    "crew",
    "templates",
    "setup",
  ]
    .map((key) => hubBoxes.find((box) => box.key === key))
    .filter(Boolean)
    .find((box) => {
      if (box.key === "collect") return hubRemainingCount("collect") > 0;
      if (box.key === "setup") return setupScore < 100;
      return hubRemainingCount(box.key) > 0;
    }) || hubBoxes[0];


  const commandSections = page === "dashboard"
    ? hubFocus === "messages"
      ? [["Messages ready", "quotes", preparedMessageRows]]
      : hubFocus === "fix"
        ? [["Needs attention", "queue", attentionRows]]
        : hubFocus === "work"
          ? [["Today’s work", "jobs", todayRows.slice(0, 5)]]
          : hubFocus === "invoice"
            ? [["Ready to invoice", "invoices", readyInvoiceRows]]
            : hubFocus === "collect"
              ? [["Money to collect", "invoices", collectRows]]
              : hubFocus === "quotes"
                ? [["Quotes waiting", "quotes", quoteRows]]
                : hubFocus === "crew"
                  ? [["Crew active", "team", crewRows]]
                  : hubFocus === "requests"
                    ? [["Request inbox", "jobs", requestRows]]
                    : hubFocus === "dispatch"
                      ? [["Dispatch board", "jobs", dispatchRows]]
                      : hubFocus === "recurring"
                        ? [["Recurring jobs", "jobs", recurringRows]]
                        : hubFocus === "templates"
                          ? [["Service templates", "settings", templateRows]]
                          : hubFocus === "reports"
                            ? [["Owner reports", "dashboard", reportRows]]
                            : []
    : page === "queue"
      ? []
      : [[current.kicker, page, current.rows]];



  function hubItemKey(boxKey, item) {
    const row = rowText(item, 0, boxKey || "Smart Hub");
    const rawId = item?.id || item?._id || item?.draft_id || item?.invoice_number || item?.quote_number || "";
    return `${boxKey || "hub"}::${rawId || row.lead}::${row.title}::${row.detail}`;
  }

  function hubRowsForKey(key) {
    if (key === "approvals") {
      return actions;
    }
    if (key === "messages") return preparedMessageRows;
    if (key === "fix") return attentionRows;
    if (key === "work") return todayRows.slice(0, 5);
    if (key === "invoice") return readyInvoiceRows;
    if (key === "collect") return collectRows;
    if (key === "quotes") return quoteRows;
    if (key === "crew") return crewRows;
    if (key === "requests") return requestRows;
    if (key === "dispatch") return dispatchRows;
    if (key === "recurring") return recurringRows;
    if (key === "templates") return templateRows;
    if (key === "reports") return reportRows;
    if (key === "setup") return [...setupRows, ...backendSetupRows];
    return [];
  }


  function visibleHubCount(key, fallback) {
    if (key === "collect" && String(fallback || "").includes("$")) {
      return fallback;
    }
    if (key === "setup" && String(fallback || "").includes("%")) {
      return fallback;
    }

    return hubRowsForKey(key).filter((item) => {
      const status = hubItemStatus[hubItemKey(key, item)];
      return status !== "approved" && status !== "snoozed" && status !== "dismissed" && status !== "resolved";
    }).length;
  }

  function snoozeHubItem(box, item) {
    const row = rowText(item, 0, box?.title || "Smart Hub");
    const key = hubItemKey(box?.key || box?.title, item);
    setHubItemStatus((current) => ({ ...current, [key]: "snoozed" }));
    logCommand(box?.title || "Smart Hub", row.title, "Snoozed");
  }

  function dismissHubItem(box, item) {
    const row = rowText(item, 0, box?.title || "Smart Hub");
    const key = hubItemKey(box?.key || box?.title, item);
    setHubItemStatus((current) => ({ ...current, [key]: "dismissed" }));
    logCommand(box?.title || "Smart Hub", row.title, "Dismissed");
  }

  function resolveHubItem(box, item) {
    const row = rowText(item, 0, box?.title || "Smart Hub");
    const key = hubItemKey(box?.key || box?.title, item);
    setHubItemStatus((current) => ({ ...current, [key]: "resolved" }));
    logCommand(box?.title || "Smart Hub", row.title, box?.key === "setup" ? "Improved" : "Resolved");
  }

  function clearSmartHubSession() {
    setHubItemStatus({});
    saveSmartHubItemStatus({});
    saveOwnerCommandLog([]);
    setApprovalLog([]);
    logCommand("Smart Hub", "Session reset", "Cleared");
  }

  function resetHubBox(box) {
    const key = box?.key || "";
    if (!key) return;

    setHubItemStatus((current) => {
      const next = { ...current };
      Object.keys(next).forEach((itemKey) => {
        if (itemKey.startsWith(`${key}::`)) {
          delete next[itemKey];
        }
      });
      return next;
    });

    logCommand(box?.title || "Smart Hub", "Box reset", "Restored");
  }

  const selectedHubRows = selectedHubBox
    ? hubRowsForKey(selectedHubBox.key).filter((item) => {
        const status = hubItemStatus[hubItemKey(selectedHubBox.key, item)];
        return status !== "approved" && status !== "snoozed" && status !== "dismissed" && status !== "resolved";
      })
    : [];

  const recentDecisionItems = [
    ...backendApprovalLog.map((item, index) => ({
      id: item.id || item._id || `backend-${index}`,
      time: item.approved_at
        ? new Date(item.approved_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
        : "Saved",
      type: item.type || "Approval",
      title: item.title || "Owner command approved",
      status: item.status || "saved",
    })),
    ...approvalLog.map((item, index) => ({
      id: `session-${index}-${item.time || ""}`,
      time: item.time || "Session",
      type: item.type || "Smart Hub",
      title: item.title || "Owner decision",
      status: item.status || "saved",
    })),
  ].slice(0, 6);

  function openCommand(selection) {
    setSelectedRecord(selection);
  }

  function pageForCommandType(type) {
    const text = String(type || "").toLowerCase();
    if (text.includes("invoice") || text.includes("cashflow") || text.includes("payment") || text.includes("collect")) return "invoices";
    if (text.includes("quote")) return "quotes";
    if (text.includes("dispatch") || text.includes("job") || text.includes("work")) return "jobs";
    if (text.includes("crew") || text.includes("worker") || text.includes("team")) return "team";
    if (text.includes("setup") || text.includes("setting")) return "settings";
    if (text.includes("message")) return "quotes";
    return "dashboard";
  }

  function logCommand(type, title, status) {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const targetPage = pageForCommandType(type);
    setHubNotice({ type, title, status, time, targetPage });
    setApprovalLog((currentLog) => {
      const nextLog = [{ type, title, status, time, targetPage }, ...currentLog].slice(0, 8);
      saveOwnerCommandLog(nextLog);
      return nextLog;
    });
  }

  function saveDraft(selection, draft) {
    const isRecordNote = !String(selection.group || "").toLowerCase().includes("approve");
    logCommand(isRecordNote ? "Record note" : "Edited", draft.title, isRecordNote ? "Saved" : "Saved in hub");
    setSelectedRecord({
      ...selection,
      item: [selection.group || "Owner edit", draft.title, draft.ownerNote || draft.detail, "Saved"],
      recommendation: "Your edit has been saved in the command log for this session. Use Open workspace for deeper backend edits if needed.",
    });
  }

  async function approveSelection(selection, draft) {
    const title = draft?.title || selection?.label || "Owner command approved";
    setApproved((currentApproved) => ({ ...currentApproved, [title]: true }));
    logCommand(selection.group || "Approved", title, "Saving...");

    try {
      const payload = {
        type: selection.group || "Owner command",
        group: selection.group || "Owner command",
        title,
        status: draft?.status || "approved",
        page: selection.page || page,
        draft: draft || {},
        action_id: selection.actionId || selection?.item?.id || selection?.item?._id || "",
        source_type: selection.sourceType || selection?.item?.source_type || "",
        source_id: selection.sourceId || selection?.item?.source_id || "",
        selection: {
          label: selection.label,
          group: selection.group,
          page: selection.page,
          hubBoxKey: selection.hubBoxKey,
          actionId: selection.actionId || "",
          sourceType: selection.sourceType || "",
          sourceId: selection.sourceId || "",
          item: selection.item,
        },
      };

      const approvalType = String(selection.group || payload.type || "").toLowerCase();
      const isDispatchApproval = approvalType.includes("dispatch");
      const isInvoiceApproval = approvalType.includes("invoice");
      const isQuoteApproval = approvalType.includes("quote");
      const isCashflowApproval = approvalType.includes("cashflow") || approvalType.includes("payment") || approvalType.includes("overdue") || approvalType.includes("collect");
      const directActionId = selection.hubBoxKey === "approvals"
        ? String(selection.actionId || selection?.item?.id || selection?.item?._id || "").trim()
        : "";

      const selectedSourceId = String(selection.sourceId || selection.actionId || selection?.item?.id || selection?.item?._id || "").trim();

      if (selection.hubBoxKey === "requests" && selectedSourceId) {
        const result = await apiPost(`/public-job-requests/${encodeURIComponent(selectedSourceId)}/create-job`, {
          title,
          notes: draft?.detail || draft?.ownerNote || "",
        });

        logCommand("Request inbox", title, result?.message || "Draft job created");
        return true;
      }

      if (selection.hubBoxKey === "recurring" && selectedSourceId) {
        const result = await apiPost(`/recurring-jobs/${encodeURIComponent(selectedSourceId)}/generate`, {});

        logCommand("Recurring jobs", title, result?.message || "Next job generated");
        return true;
      }

      if (selection.hubBoxKey === "dispatch" && selectedSourceId) {
        const workerChoice = String(
          draft?.workerChoice ||
          selection?.item?.recommended_worker_id ||
          selection?.item?.assigned_worker_id ||
          selection?.item?.worker_id ||
          selection?.item?.recommended_worker_name ||
          selection?.item?.assigned_worker_name ||
          ""
        ).trim();

        if (!workerChoice) {
          throw new Error("Choose a worker before approving dispatch.");
        }

        const result = await apiPost("/dispatch/assign", {
          job_id: selectedSourceId,
          worker_id: workerChoice,
          worker_name: workerChoice,
          scheduled_start: selection?.item?.scheduled_start || selection?.item?.start_time || "",
          scheduled_end: selection?.item?.scheduled_end || selection?.item?.end_time || "",
          force: draft?.conflictStatus === "clear",
        });

        if (result?.conflict) {
          throw new Error(result.message || "Worker has a schedule conflict.");
        }

        logCommand("Dispatch", title, result?.message || "Job assigned");
        return true;
      }

      if (selection.hubBoxKey === "templates" && selectedSourceId) {
        const result = await apiPost("/jobs/from-template", {
          template_id: selectedSourceId,
          title: draft?.templateJobTitle || title,
          client_name: draft?.templateClientName || "",
          address: draft?.templateAddress || "",
          notes: draft?.templateNotes || draft?.detail || "",
          description: draft?.templateNotes || draft?.detail || "",
        });

        logCommand("Service templates", title, result?.message || "Job created from template");
        return true;
      }

      if (selection.hubBoxKey === "reports") {
        logCommand("Owner reports", title, draft?.reportDecision || "Reviewed");
        return true;
      }

      if (selection.hubBoxKey === "invoice" && selectedSourceId) {
        payload.source_id = selectedSourceId;
        payload.source_type = selection.sourceType || selection?.item?.source_type || "completed_job";
        payload.invoice_amount = draft?.invoiceAmount || "";
        payload.invoice_description = draft?.invoiceDescription || draft?.detail || "";
        payload.invoice_status = draft?.invoiceStatus || "draft";
        payload.invoice_client_name = draft?.invoiceClientName || draft?.invoiceClient || "";
        payload.invoice_due_date = draft?.invoiceDueDate || "";
        payload.invoice_line_item = draft?.invoiceLineItemsText || draft?.invoiceLineItem || "";
        payload.draft = {
          ...(payload.draft || {}),
          invoiceAmount: draft?.invoiceAmount || "",
          invoiceDescription: draft?.invoiceDescription || draft?.detail || "",
          invoiceStatus: draft?.invoiceStatus || "draft",
          invoiceClientName: draft?.invoiceClientName || draft?.invoiceClient || "",
          invoiceClient: draft?.invoiceClientName || draft?.invoiceClient || "",
          invoiceDueDate: draft?.invoiceDueDate || "",
          invoiceLineItemsText: draft?.invoiceLineItemsText || draft?.invoiceLineItem || "",
          invoiceLineItem: draft?.invoiceLineItemsText || draft?.invoiceLineItem || "",
          ownerNote: draft?.ownerNote || "",
        };
      }

      const approvalPath = directActionId
        ? `/ai/actions/${encodeURIComponent(directActionId)}/approve`
        : isDispatchApproval
          ? "/ai/owner-command/dispatch/approve"
          : isInvoiceApproval
            ? "/ai/owner-command/invoice/approve"
            : isQuoteApproval
              ? "/ai/owner-command/quote/approve"
              : isCashflowApproval
                ? "/ai/owner-command/cashflow/approve"
                : "/ai/owner-command/approve";

      const result = await apiPost(approvalPath, payload);
      const performedMessage = result?.performed_result?.message || result?.message || "";

      logCommand(
        selection.group || "Approved",
        title,
        isDispatchApproval
          ? (performedMessage || "Worker assigned")
          : isInvoiceApproval
            ? (performedMessage || "Invoice draft created")
            : isQuoteApproval
              ? (performedMessage || "Quote follow-up saved")
              : isCashflowApproval
                ? (performedMessage || "Payment reminder saved")
                : "Saved to backend"
      );

      if (!selection?.fromSmartHubModal) {
        setSelectedRecord({
          ...selection,
          item: [
            selection.group || "Owner approval",
            `${title} approved`,
            performedMessage || result?.message || "Approval saved to backend.",
            "Backend saved",
          ],
          recommendation: String(selection.group || "").toLowerCase().includes("dispatch")
            ? "Dispatch approval completed. Churvox assigned a worker to an unassigned job and saved the owner approval."
            : String(selection.group || "").toLowerCase().includes("invoice")
              ? "Invoice approval completed. Churvox created or updated a draft invoice from a completed job."
              : String(selection.group || "").toLowerCase().includes("quote")
                ? "Quote approval completed. Churvox saved a follow-up draft. Nothing was sent automatically."
                : (String(selection.group || "").toLowerCase().includes("cashflow") || String(selection.group || "").toLowerCase().includes("payment") || String(selection.group || "").toLowerCase().includes("overdue"))
                  ? "Cashflow approval completed. Churvox saved a payment reminder draft. Nothing was sent automatically."
                  : "This approval is now saved on the backend.",
        });
      }

      return true;
    } catch (err) {
      logCommand(selection.group || "Approve failed", title, "Backend error");
      if (!selection?.fromSmartHubModal) {
        setSelectedRecord({
          ...selection,
          item: [
            selection.group || "Owner approval",
            `${title} needs attention`,
            err?.message || "Could not save approval to backend.",
            "Save failed",
          ],
          recommendation: "The front-end stayed safe, but the backend did not accept this approval. Check Render logs if this repeats.",
        });
      }

      return false;
    }
  }

  function switchPage(nextPage) {
    const safePage = nextPage === "queue" ? "dashboard" : nextPage;
    if (safePage !== "dashboard") setHubFocus("");
    setPage(safePage);
    window.history.pushState({}, "", workspacePathForPage(safePage));
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  async function markDraftReadyToSend(item) {
    const draftId = item?.id || item?._id || "";
    if (!draftId) {
      setApprovedDraftsStatus("Draft missing ID");
      return;
    }

    setApprovedDraftsStatus("Marking draft ready to send...");

    try {
      const result = await apiPost("/ai/owner-command/approved-drafts/ready", {
        draft_id: draftId,
        kind: item.kind || item.type || item.source_type,
      });

      setApprovedDrafts((current) => current.map((draft) => {
        const currentId = draft.id || draft._id;
        if (String(currentId) !== String(draftId)) return draft;
        return {
          ...draft,
          send_status: "ready_to_send",
          status: "ready_to_send",
          ready_to_send: true,
        };
      }));

      if (result?.approval) {
        setBackendApprovalLog((current) => [result.approval, ...current].slice(0, 12));
      }

      setSendCenterItems((current) => [
        {
          ...item,
          send_status: "ready_to_send",
          status: "ready_to_send",
        },
        ...current.filter((draft) => String(draft.id || draft._id) !== String(draftId)),
      ].slice(0, 10));

      setApprovedDraftsStatus(result?.message || "Draft marked ready to send");
      setSendCenterStatus("Ready-to-send drafts loaded");
    } catch (err) {
      setApprovedDraftsStatus(err?.message || "Could not mark draft ready to send");
    }
  }

  async function markDraftManuallySent(item) {
    const draftId = item?.id || item?._id || "";
    if (!draftId) {
      setSendCenterStatus("Draft missing ID");
      return;
    }

    setSendCenterStatus("Marking draft manually sent...");

    try {
      const result = await apiPost("/ai/owner-command/send-center/mark-sent", {
        draft_id: draftId,
        kind: item.kind || item.type || item.source_type,
      });

      setSendCenterItems((current) => current.filter((draft) => String(draft.id || draft._id) !== String(draftId)));

      if (result?.approval) {
        setBackendApprovalLog((current) => [result.approval, ...current].slice(0, 12));
      }

      setSendCenterStatus(result?.message || "Draft marked manually sent");
    } catch (err) {
      setSendCenterStatus(err?.message || "Could not mark draft sent");
    }
  }

  async function copyHubMessage(item, area = "approved") {
    const row = rowText(item, 0, "Message");
    await copyDraftMessage(item, area);
    logCommand("Messages ready", row.title, "Copied");
  }

  async function markHubMessageReady(item) {
    const row = rowText(item, 0, "Message");
    await markDraftReadyToSend(item);
    logCommand("Messages ready", row.title, "Marked ready");
  }

  async function markHubMessageSent(item) {
    const row = rowText(item, 0, "Message");
    await markDraftManuallySent(item);
    const key = hubItemKey("messages", item);
    setHubItemStatus((current) => ({ ...current, [key]: "resolved" }));
    logCommand("Messages ready", row.title, "Marked sent");
  }

  async function copyDraftMessage(item, area = "approved") {
    const message = String(item?.message || item?.title || "").trim();

    if (!message) {
      if (area === "send") setSendCenterStatus("No message to copy");
      else setApprovedDraftsStatus("No message to copy");
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = message;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      if (area === "send") setSendCenterStatus("Message copied");
      else setApprovedDraftsStatus("Message copied");
    } catch (err) {
      if (area === "send") setSendCenterStatus("Could not copy message");
      else setApprovedDraftsStatus("Could not copy message");
    }
  }

  return (
    <section className="cx-workspace cx-owner-command-shell">
      <section className="cx-work-hero cx-owner-command-hero">
        <div className={page === "dashboard" ? "cx-smart-hero-copy" : ""}>
          {page === "dashboard" ? (
            <>
              <div className="cx-smart-hero-badge">
                <span>AI Operator</span>
                <b>Daily command brief</b>
              </div>
              <h1>
                AI has lined up
                <em> today’s decisions.</em>
              </h1>
              <p>Approve work, fix blockers, review messages, and keep the day moving from one simple board.</p>
              <div className="cx-smart-hero-pills">
                <small>Approval-first</small>
                <small>Nothing sends itself</small>
                <small>You stay in control</small>
              </div>
            </>
          ) : (
            <>
              <span>{current.kicker}</span>
              <h1>{current.title}</h1>
              <p>{current.body}</p>
            </>
          )}
        </div>

        {page !== "dashboard" ? (
          <aside>
            <span>AI Operator</span>
            <strong>{actions.length} ready</strong>
            <p>Approve/edit from this page first. Open full workspaces only when needed.</p>
            <button type="button" onClick={() => switchPage("dashboard")}>Return to Smart Hub</button>
          </aside>
        ) : null}
      </section>

      {page === "dashboard" ? (
        <section className="cx-ai-daily-brief">
          <div>
            <span>AI Daily Brief</span>
            <h2>Churvox has checked the day.</h2>
            <p>{dailyBriefText}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setHubFocus("");
              setSelectedHubBox(topBriefBox);
            }}
          >
            Review first item
          </button>
        </section>
      ) : null}

      {page === "dashboard" && hubNotice ? (
        <section className="cx-smart-hub-notice">
          <div>
            <span>{hubNotice.type}</span>
            <strong>{hubNotice.title}</strong>
            <p>{hubNotice.status} · {hubNotice.time}</p>
          </div>
          <div className="cx-smart-hub-notice-actions">
            {hubNotice.targetPage && hubNotice.targetPage !== "dashboard" ? (
              <button
                type="button"
                onClick={() => {
                  const nextPage = hubNotice.targetPage;
                  setHubNotice(null);
                  switchPage(nextPage);
                }}
              >
                Open workspace
              </button>
            ) : null}
            <button type="button" onClick={() => setHubNotice(null)}>Dismiss</button>
          </div>
        </section>
      ) : null}

      <section className={`cx-owner-command-strip ${page !== "dashboard" ? "cx-deep-workspace-hidden" : ""}`}>
        <article>
          <span>Approve</span>
          <strong>AI actions, job decisions, invoice drafts</strong>
        </article>
        <article>
          <span>Edit</span>
          <strong>Notes, customer messages, status wording</strong>
        </article>
        <article>
          <span>Navigate</span>
          <strong>Stay in context — no page jumping</strong>
        </article>
      </section>

      <section className={`cx-workspace-command-bar cx-owner-command-tabs cx-deep-workspace-hidden ${page === "dashboard" ? "cx-hide-on-smart-hub" : ""}`}>
        {[
          ["Smart Hub", "dashboard"],
          ["Jobs", "jobs"],
          ["Clients", "clients"],
          ["Team", "team"],
          ["Quotes", "quotes"],
          ["Invoices", "invoices"],
          ["Proof-to-Paid", "proof"],
          ["Settings", "settings"],
        ].map(([label, nextPage]) => (
          <button
            type="button"
            key={label}
            className={page === nextPage ? "active" : ""}
            onClick={() => switchPage(nextPage)}
          >
            {label}
          </button>
        ))}
      </section>

      <section className={`cx-stats ${page === "dashboard" ? "cx-hide-on-smart-hub" : ""}`}>
        <Stat label="Jobs today" value={stats.jobsToday || String(jobs.length)} note="tap jobs below to inspect" />
        <Stat label="Ready to invoice" value={stats.readyToInvoice || "$0"} note="drafts and reminders" />
        <Stat label="Quotes" value={stats.openQuotes || String(quotes.length)} note="follow-ups watched" />
        <Stat label="Crew online" value={stats.crewOnline || String(team.length)} note="assignment context" />
      </section>

      {page === "dashboard" ? (
        <section className="cx-hub-box-grid">
          {hubBoxes.map((box) => (
            <button
              type="button"
              key={box.key}
              className={`cx-hub-box cx-hub-box-${box.key} ${selectedHubBox?.key === box.key ? "active" : ""}`}
              onClick={() => {
                setHubFocus("");
                setSelectedHubBox({ ...box, count: visibleHubCount(box.key, box.count) });
              }}
            >
              <span>{box.title}</span>
              <strong className={String(visibleHubCount(box.key, box.count)).includes("$") ? "money" : ""}>{visibleHubCount(box.key, box.count)}</strong>
              <b>{box.label}</b>
              <small>{box.body}</small>
              <em>{box.action}</em>
            </button>
          ))}
        </section>
      ) : null}

      {page === "dashboard" ? (
        <section className="cx-operator-expansion-panel">
          <header>
            <div>
              <span>Connected work streams</span>
              <h2>Churvox is watching the business from one control board.</h2>
              <p>Requests, dispatch, recurring work, setup health and reports all feed into the same AI approval flow.</p>
            </div>
          </header>

          <div>
            {[
              ["requests", "Request inbox", requestRows.length, "Customer requests waiting"],
              ["dispatch", "Dispatch board", dispatchRows.length, "Unassigned jobs / conflicts"],
              ["recurring", "Recurring jobs", recurringRows.length, "Repeat work due"],
              ["templates", "Service templates", templateRows.length, "Reusable job presets"],
              ["reports", "Owner reports", reportRows.length, "Cashflow and workload"],
              ["setup", "Setup audit", backendSetupSummary.cleanup_action_count || backendSetupRows.length || setupRows.length, "Cleanup actions"],
            ].map(([key, title, count, body]) => (
              <button
                type="button"
                key={key}
                onClick={() => {
                  const box = hubBoxes.find((item) => item.key === key) || {
                    key,
                    title,
                    count,
                    label: "items",
                    body,
                    action: "Review",
                  };
                  setSelectedHubBox({ ...box, count: visibleHubCount(key, count) });
                }}
              >
                <span>{title}</span>
                <strong>{count}</strong>
                <small>{body}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {page === "dashboard" && recentDecisionItems.length ? (
        <section className="cx-ai-decision-history">
          <header>
            <div>
              <span>Recent AI decisions</span>
              <h2>What Churvox has handled</h2>
              <p>Approvals, snoozes and dismissals appear here so the owner can see what changed.</p>
            </div>
            {approvalLog.length ? (
              <button
                type="button"
                onClick={clearSmartHubSession}
              >
                Reset handled items
              </button>
            ) : null}
          </header>

          <div>
            {recentDecisionItems.map((item) => (
              <article key={item.id}>
                <span>{item.time}</span>
                <strong>{item.type}</strong>
                <p>{item.title}</p>
                <b>{item.status}</b>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`cx-owner-command-layout ${page === "dashboard" ? "cx-smart-hub-popup-only" : ""} ${page === "dashboard" && (!hubFocus || hubFocus === "fix" || hubFocus === "work") ? "cx-hub-single-column" : ""}`}>
        <section className="cx-owner-command-main">
          {((page === "dashboard" && hubFocus === "approvals") || page === "queue") ? (
            <section className="cx-owner-queue">
              <header>
                <div>
                  <span>Needs approval now</span>
                  <h2>Review these first</h2>
                </div>
                <button type="button" onClick={() => setHubFocus("approvals")}>Viewing</button>
              </header>

              <div className="cx-owner-queue-grid">
                {actions.map((item) => {
                  const isApproved = approved[item.title];

                  return (
                    <article className={`cx-work-action ${item.tone || "blue"} cx-work-action-ai-machine`} key={item.title}>
                      <span>{item.type}</span>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                      <section className="cx-work-action-context">
                        {(() => {
                          const row = rowText(item, 0, item.type || "AI action");
                          const context = cxPreparedActionContext({ item, row, boxKey: "approvals", group: item.type });
                          return (
                            <>
                              <b>{context.confidenceLabel}</b>
                              <small>{context.prepared}</small>
                            </>
                          );
                        })()}
                      </section>
                      {isApproved ? <small className="cx-approved-note">Approved in this hub</small> : null}
                      <div>
                        <button
                          type="button"
                          onClick={() => openCommand({
                            item: [item.type, item.title, item.body, item.action],
                            page: "queue",
                            group: item.type,
                            label: item.title,
                            recommendation: "Check the AI reason, edit the message or note, then approve only when it looks right.",
                          })}
                        >
                          Details / edit
                        </button>
                        <button
                          type="button"
                          className="approve"
                          onClick={() => approveSelection({
                            item: [item.type, item.title, item.body, item.action],
                            page: "queue",
                            group: item.type,
                          }, {
                            title: item.title,
                            detail: item.body,
                            ownerNote: "",
                          })}
                        >
                          {isApproved ? "Approved" : item.action}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {commandSections.map(([group, sectionPage, rows]) => (
            <section className="cx-panel cx-owner-section" key={`${group}-${sectionPage}`}>
              <header>
                <div>
                  <span>{group}</span>
                  <h2>
                    {page === "dashboard"
                      ? group === "Today’s work"
                        ? "Jobs and invoices needing attention"
                        : sectionPage === "queue"
                          ? "Prepared actions"
                          : "Review, edit, approve in-place"
                      : `Review ${current.kicker.toLowerCase()} records in-place`}
                  </h2>
                </div>
                <button type="button" onClick={() => switchPage(sectionPage)}>View all</button>
              </header>

              <div className="cx-command-list">
                {rows.length ? rows.map((item, index) => (
                  <OwnerCommandRow
                    item={item}
                    index={index}
                    page={sectionPage}
                    group={group}
                    onOpen={openCommand}
                    key={`${group}-${index}-${Array.isArray(item) ? item.join("-") : item?.id || item?._id || item?.title || index}`}
                  />
                )) : (
                  <EmptyState
                    title={workspaceMachineEmptyCopy(page).title}
                    body={workspaceMachineEmptyCopy(page).body}
                    action={page === "dashboard" ? "" : "Return to Smart Hub"}
                    onAction={page === "dashboard" ? undefined : () => switchPage("dashboard")}
                  />
                )}
              </div>
            </section>
          ))}
        </section>

        <aside className="cx-owner-command-side">
          <section className={`cx-panel cx-owner-log cx-owner-prepared-messages ${page === "dashboard" && hubFocus !== "messages" ? "cx-hub-hidden-panel" : ""}`}>
            <header>
              <div>
                <span>Prepared messages</span>
                <h2>Messages waiting</h2>
                <p>
                  {sendCenterItems.length
                    ? sendCenterStatus
                    : approvedDrafts.length
                      ? approvedDraftsStatus
                      : "No prepared messages yet"}
                </p>
              </div>
              <button type="button" onClick={() => switchPage("quotes")}>
                Quotes
              </button>
            </header>

            <div className="cx-prepared-message-group">
              {sendCenterItems.length ? (
                <>
                  <strong className="cx-prepared-message-heading">Ready to send</strong>
                  {sendCenterItems.slice(0, 4).map((item, index) => (
                    <article key={`${item.id || index}-${item.title}`}>
                      <span>{item.kind || "Ready draft"}</span>
                      <strong>{item.client_name || "Client"}</strong>
                      <small>{item.message || item.title || "Ready to send"}</small>
                      <b>{item.send_status || "ready_to_send"}</b>
                      <button
                        type="button"
                        className="cx-owner-draft-copy"
                        onClick={() => copyDraftMessage(item, "send")}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        className="cx-owner-draft-ready"
                        onClick={() => markDraftManuallySent(item)}
                      >
                        Mark sent
                      </button>
                    </article>
                  ))}
                </>
              ) : null}

              {approvedDrafts.length ? (
                <>
                  <strong className="cx-prepared-message-heading">Approved drafts</strong>
                  {approvedDrafts.slice(0, 4).map((item, index) => (
                    <article key={`${item.id || index}-${item.title}`}>
                      <span>{item.kind || "Draft"}</span>
                      <strong>{item.client_name || "Client"}</strong>
                      <small>{item.message || item.title || "Approved draft ready"}</small>
                      <b>{item.send_status || item.status || "not_sent"}</b>
                      <button
                        type="button"
                        className="cx-owner-draft-copy"
                        onClick={() => copyDraftMessage(item, "approved")}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        className="cx-owner-draft-ready"
                        onClick={() => markDraftReadyToSend(item)}
                        disabled={String(item.send_status || item.status || "").includes("ready_to_send")}
                      >
                        {String(item.send_status || item.status || "").includes("ready_to_send") ? "Ready" : "Mark ready"}
                      </button>
                    </article>
                  ))}
                </>
              ) : null}

              {!sendCenterItems.length && !approvedDrafts.length ? (
                <p>No approved message drafts yet. Quote follow-ups and payment reminders will appear here after owner approval.</p>
              ) : null}
            </div>
          </section>

          <section className={`cx-panel cx-owner-log ${page === "dashboard" && hubFocus !== "approvals" ? "cx-hub-hidden-panel" : ""}`}>
            <header>
              <div>
                <span>Recent approvals</span>
                <h2>Saved decisions</h2>
                {backendApprovalStatus ? <p>{backendApprovalStatus}</p> : null}
              </div>
              {(approvalLog.length || backendApprovalLog.length) ? (
                <button
                  type="button"
                  onClick={() => {
                    saveOwnerCommandLog([]);
                    setApprovalLog([]);
                  }}
                >
                  Clear session
                </button>
              ) : null}
            </header>

            <div>
              {backendApprovalLog.length ? backendApprovalLog.map((item, index) => (
                <article key={`${item.id || item._id || index}-${item.title}`}>
                  <span>{item.approved_at ? new Date(item.approved_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Saved"}</span>
                  <strong>{item.type || "Approval"}</strong>
                  <small>{item.title || "Owner command approved"}</small>
                  <b>{item.status || "saved"}</b>
                </article>
              )) : null}

              {approvalLog.length ? approvalLog.map((item) => (
                <article key={`${item.time}-${item.title}`}>
                  <span>{item.time}</span>
                  <strong>{item.type}</strong>
                  <small>{item.title}</small>
                  <b>{item.status}</b>
                </article>
              )) : null}

              {!backendApprovalLog.length && !approvalLog.length ? <p>No owner approvals yet. Once Churvox prepares work and you approve it, the decision trail appears here.</p> : null}
            </div>
          </section>
        </aside>
      </section>

      <SmartHubBoxModal
        box={selectedHubBox}
        rows={selectedHubRows}
        approved={approved}
        team={team}
        onClose={() => setSelectedHubBox(null)}
        onOpen={(selection) => {
          setSelectedHubBox(null);
          openCommand(selection);
        }}
        onApprove={async (selection, draft) => {
          const saved = await approveSelection(
            {
              ...selection,
              fromSmartHubModal: true,
            },
            draft
          );

          if (saved && selection?.hubBoxKey && selection?.item) {
            const key = hubItemKey(selection.hubBoxKey, selection.item);
            setHubItemStatus((current) => ({ ...current, [key]: "approved" }));
          }
        }}
        onSnooze={snoozeHubItem}
        onDismiss={dismissHubItem}
        onResolve={resolveHubItem}
        onCopyMessage={copyHubMessage}
        onMarkReady={markHubMessageReady}
        onMarkSent={markHubMessageSent}
        onResetBox={resetHubBox}
        onOpenFull={(nextPage) => {
          setSelectedHubBox(null);
          switchPage(nextPage);
        }}
      />

      <OwnerCommandModal
        selection={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onSaveDraft={saveDraft}
        onApprove={approveSelection}
        setPage={setPage}
      />
    </section>
  );
}


export default function ChurvoxAIShell() {
  const [authed, setAuthed] = useState(hasSavedLogin);
  const [authMode, setAuthMode] = useState("login");
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    const mapPathToPage = () => {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      const map = {
        "/": "public",
        "/login": "login",
        "/signup": "signup",
        "/register": "signup",
        "/dashboard": "dashboard",
        "/smart-hub": "dashboard",
        "/ai-approvals": "dashboard",
        "/jobs": "jobs",
        "/clients": "clients",
        "/team": "team",
        "/quotes": "quotes",
        "/invoices": "invoices",
        "/proof-to-paid": "proof",
        "/plans": "plans",
        "/billing": "plans",
        "/settings": "settings",
      };

      const next = map[path] || "dashboard";
      if (next === "login" || next === "signup") setAuthMode(next);
      if (!["public", "login", "signup"].includes(next)) setPage(next);
    };

    mapPathToPage();
    window.addEventListener("popstate", mapPathToPage);
    return () => window.removeEventListener("popstate", mapPathToPage);
  }, []);

  useEffect(() => {
    if (!authed) return;
    const nextPath = APP_PATHS[page] || "/dashboard";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }, [authed, page]);

  useEffect(() => {
    function handleAuthExpired() {
      clearSavedSession();
      setAuthed(false);
      setAuthMode("login");
      setPage("dashboard");

      try {
        if (window.location.pathname !== "/") {
          window.history.replaceState({}, "", "/");
        }
      } catch {
        // ignore history errors
      }
    }

    window.addEventListener("churvox:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("churvox:auth-expired", handleAuthExpired);
  }, []);

  const liveData = useLiveChurvoxData(authed);
  const showPublic = useMemo(() => !authed, [authed]);

  function onLogin() {
    setAuthed(true);
    setPage("dashboard");
    window.history.pushState({}, "", "/dashboard");
  }

  function onLogout() {
    clearSavedSession();
    setAuthed(false);
    setAuthMode("login");
    window.history.pushState({}, "", "/");
  }

  if (showPublic) {
    const publicPath = window.location.pathname.replace(/\/+$/, "") || "/";

    if (publicPath === "/request" || publicPath === "/job-request") {
      return <PublicJobRequestPage />;
    }

    if (publicPath.startsWith("/portal/")) {
      const token = decodeURIComponent(publicPath.replace("/portal/", ""));
      return <PublicClientPortalPage token={token} />;
    }

    return <Landing authMode={authMode} setAuthMode={setAuthMode} onLogin={onLogin} />;
  }

  return <Shell page={page} setPage={setPage} onLogout={onLogout} data={liveData} />;
}
