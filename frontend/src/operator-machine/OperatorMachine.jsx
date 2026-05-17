// PHASE_181_APPROVAL_DESK_NON_BORING_LAYOUT\n// PHASE_178_FIX_DISPATCH_WORDING_PATCH_SYNTAX_BREAK
// PHASE_177_HIDE_DISPATCH_WORDING_BEHIND_AI_CREW_ASSIGNMENT
import React, { useEffect, useMemo, useState } from "react";
import "./OperatorMachine.css";
import CommandSuite from "./CommandSuite";
// PHASE_134_REAL_AI_PREPARED_WORK
// PHASE_130_REAL_INVOICE_LAYOUT
// PHASE_128_INVOICE_OWING_SUMMARY
// PHASE_127_REDO_INVOICE_EMAIL_CONTACT_TEMPLATE
// PHASE_125_FORCE_RENDER_VISIBLE_DEPLOY_20260516112111
// PHASE_122_COMPLETE_REAL_INVOICE_TEMPLATE
// PHASE_121_ONE_INVOICE_ONLY
// PHASE_120_SEND_INVOICE_AS_PDF_ATTACHMENT
// PHASE_118_CLEAN_OWNER_FOCUS_CARD
// PHASE_117_OWNER_FRIENDLY_DASHBOARD_WORDING
// PHASE_116_REMOVE_DUPLICATE_DASHBOARD
import { churvoxRenderDeployMarker } from "./renderDeployMarker";
// PHASE_114_PROPER_INVOICE_DOCUMENT
// PHASE_113_PROPER_INVOICE_TEMPLATE
// PHASE_112_FIX_JOB_BRIEF_SYNTAX
// PHASE_111B_SAFE_JOB_BRIEF_TEMPLATE
// PHASE_110_HARD_FIX_BUSINESS_LOGO_CRASH
// PHASE_108_FIX_BUSINESS_LOGO_URL_SCOPE
// PHASE_107_BUSINESS_LOGO_UPLOAD
// PHASE_105_OWNER_APPROVAL_PERFORMS_REAL_ACTIONS
// PHASE_104_AI_PREFILL_WORK_SLIPS
// PHASE_103_TAPPABLE_DASHBOARD_ADVANCED_TOOLS
// PHASE_102_REMOVE_DASHBOARD_FEATURE_STACK
import TopPlayerFeatureStack from "./TopPlayerFeatureStack";
// PHASE_100_FILL_PUBLIC_ACCESS_EMPTY_BOX
// PHASE_96_MOBILE_RESPONSIVE_INSTALLABLE_PWA
// PHASE_95_REAL_MACHINE_FLOW_COUNTS
// PHASE_94_SMS_CREDIT_GATE
// PHASE_93_TRIAL_PLAN_ENTITLEMENT_BRAIN
// PHASE_92_OPERATOR_APPROVAL_CONFIRMATION_BOX
// PHASE_91_WIRE_PLANS_TO_CHECKOUT
// PHASE_90_FINISH_INVOICES_OPERATOR_MACHINE_ALL_IN_ONE
// PHASE_89_FINISH_LAST_OPERATOR_MACHINE_PAGES
// PHASE_88_FINISH_QUOTES_OPERATOR_MACHINE_ALL_IN_ONE
// PHASE_87_FINISH_TEAM_OPERATOR_MACHINE_ALL_IN_ONE
// PHASE_85_FINISH_CLIENTS_OPERATOR_MACHINE
// PHASE_84_FIX_DUPLICATE_DASHBOARD_HERO_JSX
// PHASE_83_FIX_OLD_JOBS_ORPHAN_CHUNK
// PHASE_82_FIX_OLD_WORKSLIP_ORPHAN_CHUNK
// PHASE_80_FINISH_JOBS_OPERATOR_MACHINE
// PHASE_79_NEW_JOB_INTAKE_SLIP
// PHASE_78_SMART_JOB_WORK_SLIPS
// PHASE_77_COMBINE_FEATURE_HEADERS
// PHASE_74_JOBS_QUEUE_BOARD
// PHASE_73_PLANS_PRICING_BOARD
// PHASE_72_ACTIVE_PLAN_ADDONS_SMS
// PHASE_71_PLAN_FEATURE_LOCKS
// PHASE_70_PROPER_PLAN_SLIP
// PHASE_68_OPERATOR_MACHINE_POLISH

void churvoxRenderDeployMarker;

const CHURVOX_DEPLOY_MARKER = "PHASE_125_FORCE_RENDER_VISIBLE_DEPLOY_20260516112111";
void CHURVOX_DEPLOY_MARKER;

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

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
    throw new Error(payload.detail || payload.message || payload.error || "Could not open Churvox");
  }

  return payload;
}

async function apiPost(path, body = {}) {
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
    throw new Error(payload.detail || payload.message || payload.error || `${path} failed`);
  }

  return payload;
}


function businessLogoFromData(data = {}) {
  const raw = data.raw || {};
  const user = raw.user || data.user || {};
  const business = raw.business || raw.company || data.business || data.company || {};
  const billing = raw.billing || data.billing || {};

  const candidates = [
    raw.business_logo_url,
    raw.logo_url,
    user.business_logo_url,
    user.logo_url,
    business.business_logo_url,
    business.logo_url,
    billing.business_logo_url,
    data.business_logo_url,
    data.logo_url,
  ];

  for (const value of candidates) {
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }

  try {
    return localStorage.getItem("churvox_business_logo_url") || "";
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
    throw new Error(payload.detail || payload.message || payload.error || `${path} failed`);
  }

  return payload;
}

async function apiDelete(path) {
  const token = readToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
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
    throw new Error(payload.detail || payload.message || payload.error || `${path} failed`);
  }

  return payload;
}

async function apiUploadLogo(file) {
  const token = readToken();
  const body = new FormData();
  body.append("logo", file);

  const res = await fetch(`${API_BASE}/business/logo`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });

  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!res.ok) {
    throw new Error(payload.detail || payload.message || payload.error || "Logo upload failed");
  }

  return payload;
}

function BusinessLogoUploader({ data }) {
  const [logoUrl, setLogoUrl] = useState(() => businessLogoFromData(data || {}));
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    apiGet("/business/logo")
      .then((payload) => {
        if (!mounted) return;
        const nextLogo = payload.business_logo_url || payload.logo_url || "";
        if (nextLogo) {
          setLogoUrl(nextLogo);
          try { localStorage.setItem("churvox_business_logo_url", nextLogo); } catch {}
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setStatus("Uploading business logo...");

    try {
      const payload = await apiUploadLogo(file);
      const nextLogo = payload.business_logo_url || payload.logo_url || "";
      setLogoUrl(nextLogo);
      try { localStorage.setItem("churvox_business_logo_url", nextLogo); } catch {}
      setStatus(payload.message || "Business logo saved.");
    } catch (err) {
      setStatus(err.message || "Logo upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function removeLogo() {
    setBusy(true);
    setStatus("Removing logo...");

    try {
      const payload = await apiDelete("/business/logo");
      setLogoUrl("");
      try { localStorage.removeItem("churvox_business_logo_url"); } catch {}
      setStatus(payload.message || "Business logo removed.");
    } catch (err) {
      setStatus(err.message || "Could not remove logo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="om-business-logo-uploader" data-phase="PHASE_107_BUSINESS_LOGO_UPLOAD">
      <div>
        <span>Business branding</span>
        <h2>Upload your business logo.</h2>
        <p>Churvox will place this logo on invoice emails, quotes, customer proof links and future public documents. If no logo is uploaded, Churvox branding stays as the fallback.</p>
      </div>

      <aside>
        <div className="om-logo-preview">
          {logoUrl ? <img src={logoUrl} alt="Business logo preview" /> : <strong>No logo yet</strong>}
        </div>

        <label className="om-logo-upload-button">
          {busy ? "Working..." : logoUrl ? "Replace logo" : "Upload logo"}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={busy} />
        </label>

        {logoUrl ? (
          <button type="button" className="om-logo-remove-button" onClick={removeLogo} disabled={busy}>
            Remove logo
          </button>
        ) : null}

        {status ? <small>{status}</small> : <small>PNG, JPG or WEBP. Max 2MB.</small>}
      </aside>
    </section>
  );
}


function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean).join(", ") || fallback;
  if (typeof value === "object") {
    for (const key of ["title", "name", "label", "message", "body", "description", "status", "summary", "detail"]) {
      if (value[key]) return clean(value[key], fallback);
    }
  }
  return fallback;
}

function money(value) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function arrayFrom(...sources) {
  for (const source of sources) {
    if (Array.isArray(source)) return source;
  }
  return [];
}

function itemId(item = {}, fallback = "") {
  return clean(item.id || item._id || item.job_id || item.quote_id || item.invoice_id || item.source_id || fallback);
}

function statusOf(item = {}) {
  return clean(item.status || item.job_status || item.invoice_status || item.quote_status || item.payment_status || item.state, "new").toLowerCase();
}

function isCompletedJob(job = {}) {
  const status = statusOf(job);
  return status.includes("complete") || status.includes("done") || job.completed === true;
}

function hasWorker(job = {}) {
  return Boolean(clean(
    job.assigned_worker_id ||
    job.worker_id ||
    job.assigned_worker ||
    job.assigned_to ||
    job.assigned_worker_name ||
    job.worker_name
  ));
}

function photoCount(item = {}) {
  for (const key of ["photos", "worker_photos", "proof_photos", "job_photos", "images"]) {
    if (Array.isArray(item[key])) return item[key].length;
  }
  const count = Number(item.photo_count || item.photos_count || item.proof_count || 0);
  return Number.isFinite(count) ? count : 0;
}

function invoiceAmount(item = {}) {
  const direct = [
    item.invoice_amount,
    item.amount_due,
    item.balance,
    item.total,
    item.total_amount,
    item.amount,
    item.price,
    item.job_price,
    item.fixed_price,
    item.quote_total,
    item.estimated_price,
  ];

  for (const value of direct) {
    const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return String(parsed);
  }

  const rate = Number(String(item.hourly_rate || item.rate || "").replace(/[^0-9.-]/g, ""));
  const hours = Number(String(item.billable_hours || item.worked_hours || item.total_hours || item.hours || "").replace(/[^0-9.-]/g, ""));
  if (Number.isFinite(rate) && Number.isFinite(hours) && rate > 0 && hours > 0) {
    return String(Math.round(rate * hours * 100) / 100);
  }

  return "";
}

function completedDate(item = {}) {
  const raw =
    item.completed_at ||
    item.completed_date ||
    item.updated_at ||
    item.finish_time ||
    item.finished_at ||
    item.date_completed ||
    "";
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return clean(raw);
  }
}

function invoiceDescription(item = {}) {
  const client = clean(item.client_name || item.customer_name || item.client?.name || item.customer?.name, "the client");
  const jobTitle = clean(item.title || item.job_title || item.service_type || item.name, "service work");
  const address = clean(item.address || item.job_address || item.service_address || item.location);
  const notes = clean(item.completion_notes || item.worker_notes || item.job_notes || item.notes);
  const done = completedDate(item);
  const photos = photoCount(item);
  const pricingType = clean(item.pricing_type || item.price_type);
  const amount = money(invoiceAmount(item));

  const parts = [];
  parts.push(`${jobTitle} completed for ${client}${address ? ` at ${address}` : ""}.`);
  if (done) parts.push(`Work was completed on ${done}.`);
  if (notes) parts.push(`Worker notes: ${notes.endsWith(".") ? notes : `${notes}.`}`);
  if (photos) parts.push(`Proof photo${photos === 1 ? "" : "s"} uploaded for owner review: ${photos}.`);
  if (pricingType || amount) parts.push(`Pricing context: ${pricingType || "set price"}${amount ? `, ${amount}` : ""}.`);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function reminderMessage(invoice = {}) {
  const client = clean(invoice.client_name || invoice.customer_name || invoice.client?.name || "there");
  const number = clean(invoice.invoice_number || invoice.number || invoice.title, "your invoice");
  const amount = money(invoice.balance || invoice.amount_due || invoice.total || invoice.amount);
  const due = clean(invoice.due_date || invoice.payment_due_date || invoice.invoice_due_date);
  return `Hi ${client}, just a friendly reminder that ${number}${amount ? ` for ${amount}` : ""}${due ? ` was due on ${due}` : " is still awaiting payment"}. Please let us know if you need anything from us.`;
}


function smsCreditBalance(data = {}) {
  const raw = data.raw || {};
  const billing = raw.billing || raw.subscription || data.billing || data.subscription || {};
  const business = raw.business || raw.company || data.business || data.company || {};

  let localCredits = 0;
  try {
    localCredits = Number(String(localStorage.getItem("churvox_sms_credits") || "0").replace(/[^0-9.-]/g, ""));
  } catch {
    localCredits = 0;
  }

  const candidates = [
    billing.sms_credits,
    billing.sms_balance,
    billing.sms_credit_balance,
    raw.sms_credits?.balance,
    raw.sms_balance,
    business.sms_credits,
    business.sms_balance,
    data.sms_credits,
    data.sms_balance,
    localCredits,
  ];

  for (const value of candidates) {
    const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return 0;
}

function smsActionRequested(slip = {}, draft = {}) {
  const channel = clean(
    draft.messageChannel ||
    draft.deliveryChannel ||
    draft.channel ||
    draft.sendChannel ||
    slip.messageChannel ||
    slip.deliveryChannel ||
    slip.channel ||
    ""
  ).toLowerCase();

  return (
    channel === "sms" ||
    channel === "text" ||
    channel.includes("sms") ||
    draft.sendSms === true ||
    draft.send_sms === true ||
    slip.sendSms === true ||
    slip.send_sms === true
  );
}

function slipCanChooseSms(slip = {}, draft = {}) {
  const kind = clean(slip.kind).toLowerCase();
  const hasMessage = Boolean(clean(draft.customerMessage || draft.message || draft.body));
  return hasMessage && ["quote", "cashflow", "invoice", "proof"].includes(kind);
}


function quoteFollowup(quote = {}) {
  const client = clean(quote.client_name || quote.customer_name || quote.client?.name || "there");
  const title = clean(quote.title || quote.quote_number || quote.number || "your quote");
  const amount = money(quote.total || quote.amount || quote.quote_total);
  return `Hi ${client}, just checking in on ${title}${amount ? ` (${amount})` : ""}. Happy to answer questions or adjust details before you approve the work.`;
}

function buildMachine(data = {}) {
  const raw = data.raw || {};
  const jobs = arrayFrom(raw.jobs, data.jobs);
  const clients = arrayFrom(raw.clients, data.clients);
  const team = arrayFrom(raw.team, raw.workers, data.team);
  const quotes = arrayFrom(raw.quotes, data.quotes);
  const invoices = arrayFrom(raw.invoices, data.invoices);

  const input = [];
  const processing = [];
  const approval = [];

  const today = new Date();
  const due14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const invoiceDate = today.toISOString().slice(0, 10);

  function first(...values) {
    for (const value of values) {
      const cleaned = clean(value);
      if (cleaned) return cleaned;
    }
    return "";
  }

  function clientName(item = {}, fallback = "Client") {
    return first(
      item.client_name,
      item.customer_name,
      item.client?.name,
      item.customer?.name,
      item.name,
      fallback
    );
  }

  function clientEmail(item = {}) {
    return first(
      item.client_email,
      item.customer_email,
      item.billing_email,
      item.invoice_email,
      item.email,
      item.client?.email,
      item.customer?.email
    );
  }

  function clientPhone(item = {}) {
    return first(
      item.client_phone,
      item.customer_phone,
      item.phone,
      item.mobile,
      item.client?.phone,
      item.customer?.phone
    );
  }

  function addressOf(item = {}) {
    return first(
      item.address,
      item.job_address,
      item.service_address,
      item.site_address,
      item.client_address,
      item.billing_address,
      item.location
    );
  }

  function serviceOf(item = {}, fallback = "Work completed") {
    return first(
      item.service_type,
      item.job_type,
      item.trade,
      item.category,
      item.title,
      item.job_title,
      item.name,
      fallback
    );
  }

  function dateOf(item = {}) {
    return first(
      item.scheduled_date,
      item.scheduled_time,
      item.start_time,
      item.completed_at,
      item.completed_date,
      item.due_date,
      item.payment_due_date,
      item.created_at
    );
  }

  function pricingSource(item = {}) {
    const direct = [
      ["invoice amount", item.invoice_amount],
      ["amount due", item.amount_due],
      ["balance", item.balance],
      ["total", item.total],
      ["amount", item.amount],
      ["job price", item.job_price],
      ["fixed price", item.fixed_price],
      ["quote total", item.quote_total],
      ["estimated price", item.estimated_price],
    ];

    for (const [label, value] of direct) {
      const amount = invoiceAmount({ amount: value });
      if (amount) return { amount, label };
    }

    const rate = Number(String(item.hourly_rate || item.rate || "").replace(/[^0-9.-]/g, ""));
    const hours = Number(String(item.billable_hours || item.worked_hours || item.total_hours || item.hours || "").replace(/[^0-9.-]/g, ""));

    if (Number.isFinite(rate) && Number.isFinite(hours) && rate > 0 && hours > 0) {
      return {
        amount: String(Math.round(rate * hours * 100) / 100),
        label: `${hours} hours × ${money(rate) || `$${rate}`}`,
      };
    }

    return { amount: "", label: "owner amount required" };
  }

  function workerName(worker = {}, fallback = "Worker") {
    return first(worker.name, worker.full_name, worker.worker_name, worker.email, fallback);
  }

  function workerId(worker = {}, fallback = "") {
    return first(worker.id, worker._id, worker.worker_id, worker.email, worker.name, fallback);
  }

  function scoreWorkersForJob(job = {}) {
    const jobRegion = first(job.region, job.service_area, job.area, job.suburb, job.city, addressOf(job)).toLowerCase();
    const jobSkill = first(job.service_type, job.job_type, job.trade, job.category, job.title, job.job_title).toLowerCase();

    return team.map((worker, index) => {
      const name = workerName(worker, `Worker ${index + 1}`);
      const status = first(worker.status, worker.availability, "available").toLowerCase();
      const region = first(worker.region, worker.service_area, worker.area, worker.suburb, worker.city).toLowerCase();
      const role = first(worker.role, worker.trade, worker.skill, worker.skills, worker.position).toLowerCase();
      const contact = first(worker.email, worker.phone, worker.mobile);

      let score = 0;
      const reasons = [];

      if (!status.includes("busy") && !status.includes("off") && !status.includes("leave")) {
        score += 3;
        reasons.push("available");
      } else {
        reasons.push(`status: ${status || "unknown"}`);
      }

      if (jobRegion && region && (jobRegion.includes(region) || region.includes(jobRegion))) {
        score += 3;
        reasons.push(`area match: ${region}`);
      }

      if (jobSkill && role && (jobSkill.includes(role) || role.includes(jobSkill))) {
        score += 2;
        reasons.push(`skill match: ${role}`);
      }

      if (contact) {
        score += 1;
        reasons.push("contact saved");
      }

      return { worker, name, score, reasons };
    }).sort((a, b) => b.score - a.score);
  }

  function invoiceNumberFor(item = {}, fallback = "") {
    const existing = first(item.invoice_number, item.number, item.invoice_id);
    if (existing) return existing;
    const id = itemId(item, fallback || String(Date.now()));
    const digits = String(id).replace(/\D/g, "").slice(-4) || String(Date.now()).slice(-4);
    return `INV-${new Date().getFullYear()}-${digits.padStart(4, "0")}`;
  }

  function proofSummary(item = {}) {
    const notes = first(item.completion_notes, item.worker_notes, item.job_notes, item.notes);
    const photos = photoCount(item);
    const parts = [];
    if (notes) parts.push(`worker note: ${notes}`);
    if (photos) parts.push(`${photos} proof photo${photos === 1 ? "" : "s"}`);
    return parts.join(" · ");
  }

  function preparationText(lines = []) {
    return lines.filter(Boolean).join("\n");
  }

  const invoicedJobIds = new Set(
    invoices
      .map((invoice) => first(invoice.job_id, invoice.source_job_id, invoice.ai_source_job_id))
      .filter(Boolean)
  );

  jobs.slice(0, 30).forEach((job, index) => {
    const id = itemId(job, `job-${index}`);
    const client = clientName(job);
    const title = serviceOf(job, `Job ${index + 1}`);
    const address = addressOf(job);
    const status = statusOf(job);
    const notes = first(job.completion_notes, job.worker_notes, job.job_notes, job.notes);
    const photos = photoCount(job);
    const when = dateOf(job);
    const price = pricingSource(job);

    input.push({
      id: `input-${id}`,
      sourceId: id,
      kind: "input",
      title,
      eyebrow: "Job input",
      client,
      detail: `${client}${address ? ` · ${address}` : ""}`,
      state: status,
      need: `Job loaded for ${client}${address ? ` at ${address}` : ""}.`,
      prepared: preparationText([
        `Checked client: ${client}`,
        address ? `Checked site: ${address}` : "Site address missing",
        when ? `Checked date/time: ${when}` : "Schedule not confirmed",
        price.amount ? `Found pricing: ${money(price.amount)} from ${price.label}` : "No reliable price found yet",
      ]),
      draft: {
        title,
        clientName: client,
        clientEmail: clientEmail(job),
        clientPhone: clientPhone(job),
        address,
        serviceType: title,
        jobStatus: status || "new",
        amount: price.amount,
        ownerNote: notes || `Check ${client}${address ? ` at ${address}` : ""} before approval.`,
        customerMessage: "",
      },
      item: job,
    });

    if (!hasWorker(job) && !isCompletedJob(job)) {
      const ranked = scoreWorkersForJob(job);
      const best = ranked[0] || {};
      const bestWorker = best.worker || {};
      const bestName = best.name || "Choose worker";
      const reasons = best.reasons?.length ? best.reasons.join(", ") : "no strong worker data yet";
      const workerChoice = workerId(bestWorker);

      approval.push({
        id: `dispatch-${id}`,
        sourceId: id,
        kind: "dispatch",
        title: `Assign ${bestName} to ${title}`,
        eyebrow: "Assign crew prepared",
        client,
        need: `Worker match prepared for ${client}${address ? ` at ${address}` : ""}.`,
        prepared: preparationText([
          `Checked job: ${title}`,
          `Checked client: ${client}`,
          address ? `Checked site: ${address}` : "Site address missing",
          when ? `Checked schedule: ${when}` : "Schedule not confirmed",
          team.length ? `Compared ${team.length} worker${team.length === 1 ? "" : "s"}` : "No workers loaded",
          bestName ? `Recommended worker: ${bestName}` : "",
          `Reason: ${reasons}`,
          "Owner approval will assign the worker and prepare the worker job brief.",
        ]),
        draft: {
          title: `Assign ${bestName} to ${title}`,
          clientName: client,
          clientEmail: clientEmail(job),
          clientPhone: clientPhone(job),
          address,
          serviceType: title,
          workerChoice,
          jobStatus: "assigned",
          ownerNote: `AI recommends ${bestName}. Reason: ${reasons}. Confirm before dispatch.`,
          customerMessage: preparationText([
            `Job brief: ${title}`,
            `Client: ${client}`,
            address ? `Site: ${address}` : "",
            when ? `Scheduled: ${when}` : "",
            notes ? `Notes: ${notes}` : "",
          ]),
        },
        item: job,
      });
    }

    if (isCompletedJob(job)) {
      const alreadyInvoiced = id && invoicedJobIds.has(id);
      const preparedDescription = invoiceDescription(job);
      const proof = proofSummary(job);
      const invoiceClientEmail = clientEmail(job);
      const invoiceClientAddress = addressOf(job);
      const invoiceNumber = invoiceNumberFor(job, id);

      if (!alreadyInvoiced) {
        approval.push({
          id: `invoice-${id}`,
          sourceId: id,
          kind: "invoice",
          title: `Invoice for ${client}`,
          eyebrow: price.amount ? "Invoice ready" : "Amount needed",
          client,
          need: price.amount
            ? `Invoice prepared for ${client} using job, proof and pricing.`
            : `Invoice prepared for ${client}, but the amount needs owner input.`,
          prepared: preparationText([
            `Checked completed job: ${title}`,
            `Checked client: ${client}`,
            invoiceClientEmail ? `Customer email found: ${invoiceClientEmail}` : "Customer email missing",
            invoiceClientAddress ? `Billing/site address found: ${invoiceClientAddress}` : "Address missing",
            proof || "No worker proof note/photo found",
            price.amount ? `Amount found: ${money(price.amount)} from ${price.label}` : "Amount still needs owner input",
            `Draft invoice number: ${invoiceNumber}`,
            `Due date prepared: ${due14}`,
          ]),
          draft: {
            title: `Invoice for ${client}`,
            invoiceNumber,
            issueDate: invoiceDate,
            dueDate: due14,
            reference: id,
            invoiceClientName: client,
            invoiceClientEmail,
            invoiceClientAddress,
            clientName: client,
            clientEmail: invoiceClientEmail,
            clientAddress: invoiceClientAddress,
            invoiceLineItem: title,
            invoiceDescription: preparedDescription,
            quantity: "1",
            unitPrice: price.amount,
            amount: price.amount,
            subtotal: price.amount,
            gstRate: "15",
            gstAmount: "",
            total: price.amount,
            amountPaid: "0",
            amountOwing: price.amount,
            invoiceStatus: price.amount ? "Amount owing" : "Needs amount",
            paymentTerms: "Due on receipt unless agreed otherwise.",
            paymentNote: "Bank account / payment link goes here. Please pay by the due date.",
            ownerNote: preparationText([
              price.amount ? `Price source: ${price.label}` : "Owner must add amount before sending.",
              proof || "",
            ]),
            customerMessage: preparedDescription,
          },
          item: job,
        });
      }

      if (notes || photos) {
        processing.push({
          id: `proof-${id}`,
          sourceId: id,
          kind: "proof",
          title: `Proof package for ${client}`,
          eyebrow: "Proof & Pay",
          client,
          need: "Proof package prepared for invoice wording.",
          prepared: preparationText([
            `Job: ${title}`,
            notes ? `Worker note: ${notes}` : "",
            photos ? `Photos uploaded: ${photos}` : "",
            price.amount ? `Pricing found: ${money(price.amount)}` : "Pricing still needs check",
          ]),
          draft: {
            title: `Proof reviewed for ${title}`,
            ownerNote: proof || "Proof reviewed.",
            customerMessage: preparedDescription,
            invoiceDescription: preparedDescription,
            amount: price.amount,
          },
          item: job,
        });
      }
    }
  });

  invoices.slice(0, 20).forEach((invoice, index) => {
    const status = statusOf(invoice);
    const id = itemId(invoice, `invoice-${index}`);
    const client = clientName(invoice);
    const amount = pricingSource(invoice);
    const number = invoiceNumberFor(invoice, id);
    const due = first(invoice.due_date, invoice.payment_due_date, invoice.invoice_due_date);
    const email = clientEmail(invoice);
    const address = addressOf(invoice);

    if (status.includes("unpaid") || status.includes("overdue") || status.includes("sent")) {
      approval.push({
        id: `reminder-${id}`,
        sourceId: id,
        kind: "cashflow",
        title: `Payment follow-up for ${number}`,
        eyebrow: status.includes("overdue") ? "Overdue invoice" : "Cashflow",
        client,
        need: `Payment follow-up prepared for ${client}.`,
        prepared: preparationText([
          `Checked invoice: ${number}`,
          `Checked customer: ${client}`,
          email ? `Customer email found: ${email}` : "Customer email missing",
          amount.amount ? `Outstanding amount: ${money(amount.amount)}` : "Outstanding amount needs owner check",
          due ? `Due date: ${due}` : "Due date missing",
          `Current status: ${status || "unknown"}`,
          "Owner approval will save/send the follow-up, not auto-send blindly.",
        ]),
        draft: {
          title: `Payment reminder for ${client}`,
          invoiceNumber: number,
          invoiceClientName: client,
          invoiceClientEmail: email,
          invoiceClientAddress: address,
          dueDate: due,
          amount: amount.amount,
          total: amount.amount,
          amountPaid: first(invoice.amount_paid, invoice.paid, "0"),
          amountOwing: amount.amount,
          invoiceStatus: status.includes("overdue") ? "Overdue" : "Amount owing",
          invoiceDescription: first(invoice.description, invoice.invoice_description, `Invoice ${number}`),
          ownerNote: `AI found ${number} for ${client}. ${amount.amount ? `Amount owing: ${money(amount.amount)}.` : "Amount needs checking."}`,
          customerMessage: reminderMessage(invoice),
          messageChannel: "email_draft",
        },
        item: invoice,
      });
    }

    if (status.includes("draft") || status.includes("ready")) {
      approval.push({
        id: `invoice-draft-${id}`,
        sourceId: id,
        kind: "invoice",
        title: `Review draft invoice ${number}`,
        eyebrow: "Invoice draft",
        client,
        need: `Draft invoice prepared for ${client}.`,
        prepared: preparationText([
          `Checked draft invoice: ${number}`,
          email ? `Customer email found: ${email}` : "Customer email missing",
          address ? `Address found: ${address}` : "Address missing",
          amount.amount ? `Amount found: ${money(amount.amount)}` : "Amount missing",
          due ? `Due date: ${due}` : "Due date missing",
        ]),
        draft: {
          title: `Invoice for ${client}`,
          invoiceNumber: number,
          issueDate: first(invoice.issue_date, invoice.created_at, invoiceDate),
          dueDate: due || due14,
          reference: first(invoice.reference, id),
          invoiceClientName: client,
          invoiceClientEmail: email,
          invoiceClientAddress: address,
          invoiceLineItem: first(invoice.line_item, invoice.title, number),
          invoiceDescription: first(invoice.invoice_description, invoice.description, `Invoice ${number}`),
          quantity: first(invoice.quantity, "1"),
          unitPrice: amount.amount,
          amount: amount.amount,
          subtotal: first(invoice.subtotal, amount.amount),
          gstRate: first(invoice.gst_rate, invoice.tax_rate, "15"),
          gstAmount: first(invoice.gst_amount, invoice.tax_amount),
          total: first(invoice.total_due, invoice.total, amount.amount),
          amountPaid: first(invoice.amount_paid, "0"),
          amountOwing: first(invoice.amount_owing, invoice.balance, amount.amount),
          invoiceStatus: first(invoice.invoice_status, invoice.payment_status, "Amount owing"),
          paymentTerms: first(invoice.payment_terms, "Due on receipt unless agreed otherwise."),
          paymentNote: first(invoice.payment_note, "Bank account / payment link goes here. Please pay by the due date."),
        },
        item: invoice,
      });
    }
  });

  quotes.slice(0, 20).forEach((quote, index) => {
    const status = statusOf(quote);
    const id = itemId(quote, `quote-${index}`);
    const client = clientName(quote);
    const amount = pricingSource(quote);
    const number = first(quote.quote_number, quote.number, quote.title, `Quote ${index + 1}`);
    const sent = first(quote.sent_at, quote.created_at, quote.updated_at);
    const email = clientEmail(quote);

    if (!status.includes("accepted") && !status.includes("declined") && !status.includes("won")) {
      approval.push({
        id: `quote-${id}`,
        sourceId: id,
        kind: "quote",
        title: `Quote follow-up for ${client}`,
        eyebrow: "Quote follow-up",
        client,
        need: `Follow-up prepared for open quote ${number}.`,
        prepared: preparationText([
          `Checked quote: ${number}`,
          `Checked client: ${client}`,
          email ? `Customer email found: ${email}` : "Customer email missing",
          amount.amount ? `Quote value: ${money(amount.amount)}` : "Quote amount missing",
          sent ? `Last activity: ${sent}` : "No sent date found",
          `Current status: ${status || "open"}`,
        ]),
        draft: {
          title: `Quote follow-up for ${client}`,
          clientName: client,
          clientEmail: email,
          quoteLineItem: number,
          quoteDescription: first(quote.quote_description, quote.description, quote.scope, ""),
          amount: amount.amount,
          ownerNote: `AI prepared follow-up for ${number}. Check wording before sending.`,
          customerMessage: quoteFollowup(quote),
          messageChannel: "email_draft",
        },
        item: quote,
      });
    }
  });

  clients.slice(0, 12).forEach((client, index) => {
    const id = itemId(client, `client-${index}`);
    const name = clientName(client, `Client ${index + 1}`);
    const email = clientEmail(client);
    const phone = clientPhone(client);
    const address = addressOf(client);
    const missing = [
      email ? "" : "email",
      phone ? "" : "phone",
      address ? "" : "address",
    ].filter(Boolean);

    if (missing.length) {
      processing.push({
        id: `client-${id}`,
        sourceId: id,
        kind: "client",
        title: `Complete client record for ${name}`,
        eyebrow: "Client cleanup",
        client: name,
        need: `Missing ${missing.join(", ")} blocks proper AI prep.`,
        prepared: preparationText([
          `Checked client: ${name}`,
          email ? `Email saved: ${email}` : "Email missing",
          phone ? `Phone saved: ${phone}` : "Phone missing",
          address ? `Address saved: ${address}` : "Address missing",
          "Fixing this helps invoices, quote follow-ups and reminders stop being generic.",
        ]),
        draft: {
          title: `Update client details for ${name}`,
          clientName: name,
          clientEmail: email,
          clientPhone: phone,
          clientAddress: address,
          ownerNote: `Add missing ${missing.join(", ")} for ${name}.`,
          customerMessage: "",
          invoiceDescription: "",
          amount: "",
        },
        item: client,
      });
    }
  });

  return {
    counts: {
      jobs: jobs.length,
      clients: clients.length,
      team: team.length,
      quotes: quotes.length,
      invoices: invoices.length,
      input: input.length,
      processing: processing.length,
      approval: approval.length,
    },
    input,
    processing,
    approval,
  };
}

function smartField(...values) {
  for (const value of values) {
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function smartJobClient(item = {}, fallback = "Client") {
  return smartField(
    item.client_name,
    item.customer_name,
    item.client?.name,
    item.customer?.name,
    item.name,
    fallback
  );
}

function smartJobAddress(item = {}) {
  return smartField(
    item.address,
    item.job_address,
    item.service_address,
    item.site_address,
    item.location
  );
}

function smartJobService(item = {}, fallback = "job") {
  return smartField(
    item.service_type,
    item.job_type,
    item.trade,
    item.category,
    item.title,
    item.job_title,
    fallback
  );
}

function smartWorkerName(item = {}, fallback = "worker") {
  return smartField(
    item.assigned_worker_name,
    item.worker_name,
    item.assigned_worker,
    item.worker?.name,
    item.worker,
    fallback
  );
}

function smartWorkSlipDraft(slip = {}, team = []) {
  const item = slip.item || {};
  const existing = slip.draft && typeof slip.draft === "object" ? slip.draft : {};
  const kind = clean(slip.kind).toLowerCase();

  const title = smartField(
    existing.title,
    slip.title,
    item.title,
    item.job_title,
    item.invoice_title,
    item.quote_title,
    item.name,
    "Approval Slip"
  );

  const client = smartJobClient(item, smartField(existing.clientName, existing.invoiceClientName, existing.quoteClientName, slip.client, "Client"));
  const address = smartJobAddress(item);
  const service = smartJobService(item, title);
  const amount = smartField(existing.amount, invoiceAmount(item));
  const dueDate = smartField(
    existing.dueDate,
    item.due_date,
    item.payment_due_date,
    item.invoice_due_date,
    kind.includes("invoice") || kind.includes("cashflow")
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : ""
  );
  const notes = smartField(
    existing.ownerNote,
    item.owner_note,
    item.internal_note,
    item.completion_notes,
    item.worker_notes,
    item.job_notes,
    item.notes,
    slip.need
  );
  const prepared = smartField(existing.prepared, slip.prepared, slip.need);

  const suggestedWorker = team[0] || {};
  const suggestedWorkerName = smartField(
    existing.workerChoice,
    suggestedWorker.name,
    suggestedWorker.full_name,
    suggestedWorker.worker_name,
    suggestedWorker.email,
    smartWorkerName(item, "")
  );

  const baseOwnerNote = (() => {
    if (kind === "dispatch") {
      return `Churvox checked this job for dispatch. ${client ? `Client: ${client}. ` : ""}${address ? `Site: ${address}. ` : ""}${suggestedWorkerName ? `Suggested worker: ${suggestedWorkerName}. ` : ""}Owner should confirm the worker before the job is assigned.`;
    }

    if (kind === "input") {
      return `Churvox found a new job input. ${client ? `Client: ${client}. ` : ""}${address ? `Address: ${address}. ` : ""}Review the job details, then send it into dispatch or admin prep.`;
    }

    if (kind === "job" || kind === "new-job") {
      return `Churvox prepared this job as clean machine input. ${client ? `Client: ${client}. ` : ""}${address ? `Address: ${address}. ` : ""}${service ? `Work: ${service}. ` : ""}Owner can edit before approval.`;
    }

    if (kind === "invoice" || kind === "cashflow" || kind === "proof") {
      return `Churvox prepared this from job, client, proof and pricing context. ${amount ? `Amount found: ${money(amount)}. ` : "Amount still needs owner check. "}${dueDate ? `Due date: ${dueDate}. ` : ""}Owner should review wording before approval.`;
    }

    if (kind === "quote") {
      return `Churvox prepared quote wording for ${client}. ${amount ? `Estimate: ${money(amount)}. ` : ""}Owner should review the scope and wording before sending or saving.`;
    }

    if (kind === "client") {
      return `Churvox checked this client record. Add missing contact or address details so quotes, invoices and reminders have the right context.`;
    }

    if (kind === "team-member") {
      return `Churvox checked this team record. Confirm role, contact and region so worker matching and invites work cleanly.`;
    }

    return prepared || notes || "Churvox prepared this action for owner review.";
  })();

  const invoiceText = (() => {
    if (kind === "invoice" || kind === "cashflow" || kind === "proof") {
      return smartField(
        existing.invoiceDescription,
        item.invoice_description,
        item.description,
        invoiceDescription(item),
        `${service} completed for ${client}${address ? ` at ${address}` : ""}.`
      );
    }

    return smartField(existing.invoiceDescription, item.invoice_description, item.description, "");
  })();

  const messageText = (() => {
    if (kind === "cashflow") {
      return smartField(existing.customerMessage, reminderMessage(item));
    }

    if (kind === "quote") {
      return smartField(existing.customerMessage, quoteFollowup(item));
    }

    if (kind === "invoice" || kind === "proof") {
      return smartField(
        existing.customerMessage,
        phase113InvoiceEmailText(
          {
            ...existing,
            title,
            invoiceClientName: client,
            clientName: client,
            invoiceLineItem: service || title,
            invoiceDescription: invoiceText,
            amount,
            dueDate,
          },
          slip
        ),
        invoiceText,
        `${service} completed for ${client}${address ? ` at ${address}` : ""}.`
      );
    }

    if (kind === "dispatch" || kind === "input" || kind === "job") {
      return smartField(
        existing.customerMessage,
        `${title}. ${client ? `Client: ${client}. ` : ""}${address ? `Address: ${address}. ` : ""}${service ? `Work: ${service}. ` : ""}Prepared for owner approval.`
      );
    }

    return smartField(existing.customerMessage, prepared, baseOwnerNote);
  })();

  return {
    ...existing,
    title,
    clientName: smartField(existing.clientName, client),
    clientEmail: smartField(
      existing.clientEmail,
      existing.invoiceClientEmail,
      item.client_email,
      item.customer_email,
      item.billing_email,
      item.invoice_email,
      item.email,
      item.client?.email,
      item.customer?.email
    ),
    invoiceClientEmail: smartField(
      existing.invoiceClientEmail,
      existing.clientEmail,
      item.client_email,
      item.customer_email,
      item.billing_email,
      item.invoice_email,
      item.email,
      item.client?.email,
      item.customer?.email
    ),
    invoiceClientName: smartField(existing.invoiceClientName, client),
    quoteClientName: smartField(existing.quoteClientName, client),
    address: smartField(existing.address, address),
    serviceType: smartField(existing.serviceType, service),
    workerChoice: smartField(existing.workerChoice, suggestedWorker.id, suggestedWorker._id, suggestedWorkerName),
    amount,
    dueDate,
    invoiceLineItem: smartField(existing.invoiceLineItem, service, title),
    quoteLineItem: smartField(existing.quoteLineItem, service, title),
    invoiceDescription: invoiceText,
    quoteDescription: smartField(existing.quoteDescription, item.quote_description, item.description, prepared),
    ownerNote: smartField(existing.ownerNote, baseOwnerNote, notes),
    customerMessage: smartField(existing.customerMessage, messageText),
  };
}


function WorkSlip({ slip, team, outputStatus, smsCredits = 0, businessLogoUrl = "", businessName = "", onClose, onSave, onApprove, onChoosePlan }) {
  const [draft, setDraft] = useState(() => smartWorkSlipDraft(slip || {}, team || []));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(smartWorkSlipDraft(slip || {}, team || []));
  }, [slip, team]);

  if (!slip) return null;

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function approve() {
    setBusy(true);
    try {
      await onApprove(slip, draft);
    } finally {
      setBusy(false);
    }
  }

  const isJobIntake = slip.kind === "new-job";
  const isJobReview = slip.kind === "job";
  const isDispatch = slip.kind === "dispatch";
  const isInvoiceLike = slip.kind === "invoice" || slip.kind === "cashflow" || slip.kind === "proof";
  const isNewInvoice = slip.kind === "invoice" && String(slip.id || "").startsWith("new-invoice");
  const showsInvoiceTemplate = phase113ShouldShowInvoiceTemplate(slip);
  const isPayrollLike = slip.kind === "payroll";
  const isSettingsLike = slip.kind === "settings";
  const isQuoteLike = slip.kind === "quote";
  const isNewQuote = isQuoteLike && String(slip.id || "").startsWith("new-quote");
  const canChooseSms = slipCanChooseSms(slip, draft);
  const smsBlocked = smsActionRequested(slip, draft) && Number(smsCredits || 0) <= 0;
  const primaryLabel =
    isJobIntake ? "Create job" :
    isNewInvoice ? "Create invoice draft" :
    isNewQuote ? "Create quote draft" :
    isQuoteLike ? "Approve quote action" :
    isPayrollLike ? "Save payroll review" :
    isSettingsLike ? "Save setting review" :
    isDispatch ? "Approve dispatch" :
    slip.kind === "invoice" ? "Approve & email PDF" :
    slip.kind === "cashflow" ? "Approve follow-up" :
    "Approve";

  if (slip.kind === "plan" || slip.kind === "addon") {
    const features = Array.isArray(slip.features) ? slip.features : [];

    return (
      <div className="om-slip-backdrop" onClick={onClose}>
        <section className="om-slip om-plan-slip" onClick={(event) => event.stopPropagation()}>
          <header className="om-slip-head">
            <div>
              <span>{slip.badge || slip.eyebrow}</span>
              <h2>{slip.title}</h2>
              <p>{slip.need}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close plan slip">×</button>
          </header>

          <section className="om-plan-slip-body">
            <article className="om-plan-price-card">
              <span>{slip.kind === "addon" ? "Add-on price" : "Plan price"}</span>
              <strong>{slip.price}<small>{slip.id === "addon-sms-100" || slip.id === "addon-sms-500" || slip.id === "addon-sms-1000" ? "" : "/month + GST"}</small></strong>
              <p>{slip.prepared}</p>
            </article>

            <article className="om-plan-feature-card">
              <span>Included</span>
              <div>
                {features.map((feature) => (
                  <b key={feature}>{feature}</b>
                ))}
              </div>
            </article>

            <article className="om-plan-machine-note">
              <span>How this fits Churvox</span>
              <p>
                {slip.kind === "addon"
                  ? "Add-ons extend Churvox without changing the main plan. Growth Packs add scale, MYOB adds accounting sync, and SMS credits add prepaid messaging capacity."
                  : "The plan controls how much of the Approval Desk Churvox can run for the business. Owner approval still stays in front of sensitive actions."}
              </p>
            </article>
          </section>

          <footer className="om-slip-actions">
            <button type="button" className="ghost" onClick={onClose}>Back</button>
            <button type="button" className="approve" onClick={() => onChoosePlan?.(slip)}>
              {slip.cta || "Choose plan"}
            </button>
          </footer>
        </section>
      </div>
    );
  }

  if (showsInvoiceTemplate) {
    return (
      <div className="om-slip-backdrop" onClick={onClose}>
        <section className="om-slip om-one-invoice-slip" onClick={(event) => event.stopPropagation()}>
          <header className="om-one-invoice-slip-head">
            <div>
              <span>Invoice ready</span>
              <h2>{draft.invoiceClientName || draft.clientName ? `Invoice for ${draft.invoiceClientName || draft.clientName}` : "Invoice draft"}</h2>
              <p>Fill the invoice, then save or approve.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close invoice slip">×</button>
          </header>

          <InvoiceTemplateCard
            slip={slip}
            draft={draft}
            update={update}
            businessLogoUrl={businessLogoUrl}
            businessName={businessName}
          />

          {outputStatus ? <p className="om-slip-status">{outputStatus}</p> : null}

          <footer className="om-slip-actions om-one-invoice-actions">
            <button type="button" className="ghost" onClick={onClose}>Back</button>
            <button type="button" onClick={() => onSave(slip, draft)}>Save edit</button>
            <button type="button" className="approve" disabled={busy || smsBlocked} onClick={approve}>
              {busy ? "Saving..." : "Approve & email PDF"}
            </button>
          </footer>
        </section>
      </div>
    );
  }

  return (
    <div className="om-slip-backdrop" onClick={onClose}>
      <section className={`om-slip ${isJobIntake ? "om-new-job-slip" : ""}`} onClick={(event) => event.stopPropagation()}>
        <header className="om-slip-head">
          <div>
            <span>{slip.eyebrow}</span>
            <h2>{slip.title}</h2>
            <p>{slip.need}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close approval slip">×</button>
        </header>

        <section className="om-slip-context om-ai-prefill-context">
          <span>AI prepared context</span>
          <p className="om-ai-prep-list">{slip.prepared || draft.ownerNote || "Churvox prepared this Approval Slip for owner review."}</p>
          <button type="button" onClick={() => setDraft(smartWorkSlipDraft(slip || {}, team || []))}>
            Refill with AI prep
          </button>
        </section>

        <section className="om-slip-fields">
          <InvoiceTemplateCard slip={slip} draft={draft} update={update} businessLogoUrl={businessLogoUrl} />
          <JobBriefTemplateCard slip={slip} draft={draft} update={update} />
          <label className={isJobIntake ? "wide" : ""}>
            Clear title
            <input value={draft.title || ""} onChange={(event) => update("title", event.target.value)} placeholder={isJobIntake ? "Example: Lawn mowing at 14 King Street" : ""} />
          </label>

          {isJobIntake ? (
            <>
              <label>
                Client name
                <input value={draft.clientName || ""} onChange={(event) => update("clientName", event.target.value)} placeholder="Client or customer name" />
              </label>

              <label>
                Job address
                <input value={draft.address || ""} onChange={(event) => update("address", event.target.value)} placeholder="Where the job is" />
              </label>

              <label>
                Service type
                <input value={draft.serviceType || ""} onChange={(event) => update("serviceType", event.target.value)} placeholder="Mowing, cleaning, repair..." />
              </label>

              <label>
                Starting status
                <select value={draft.jobStatus || "new"} onChange={(event) => update("jobStatus", event.target.value)}>
                  <option value="new">New</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>

              <label>
                Optional worker
                <select value={draft.workerChoice || ""} onChange={(event) => update("workerChoice", event.target.value)}>
                  <option value="">Choose later</option>
                  {team.map((worker, index) => {
                    const value = clean(worker.id || worker._id || worker.name || worker.full_name || worker.worker_name || `worker-${index}`);
                    const label = clean(worker.name || worker.full_name || worker.worker_name || worker.email || `Worker ${index + 1}`);
                    return <option value={value} key={value}>{label}</option>;
                  })}
                </select>
              </label>

              <label>
                Optional amount
                <input value={draft.amount || ""} onChange={(event) => update("amount", event.target.value)} placeholder="Leave blank if unknown" />
              </label>
            </>
          ) : null}

          {isDispatch ? (
            <label>
              Worker / crew choice
              <select value={draft.workerChoice || ""} onChange={(event) => update("workerChoice", event.target.value)}>
                <option value="">Choose worker</option>
                {team.map((worker, index) => {
                  const value = clean(worker.id || worker._id || worker.name || worker.full_name || worker.worker_name || `worker-${index}`);
                  const label = clean(worker.name || worker.full_name || worker.worker_name || worker.email || `Worker ${index + 1}`);
                  return <option value={value} key={value}>{label}</option>;
                })}
              </select>
            </label>
          ) : null}

          {slip.kind === "team-member" ? (
            <>
              <label>
                Worker name
                <input value={draft.workerName || draft.title || ""} onChange={(event) => update("workerName", event.target.value)} placeholder="Worker or team member name" />
              </label>

              <label>
                Email
                <input value={draft.workerEmail || ""} onChange={(event) => update("workerEmail", event.target.value)} placeholder="Worker email" />
              </label>

              <label>
                Phone
                <input value={draft.workerPhone || ""} onChange={(event) => update("workerPhone", event.target.value)} placeholder="Worker phone" />
              </label>

              <label>
                Role
                <select value={draft.workerRole || "worker"} onChange={(event) => update("workerRole", event.target.value)}>
                  <option value="worker">Worker</option>
                  <option value="manager">Manager</option>
                  <option value="office_admin">Office Admin</option>
                  <option value="payroll">Payroll</option>
                </select>
              </label>

              <label>
                Region / area
                <input value={draft.workerRegion || ""} onChange={(event) => update("workerRegion", event.target.value)} placeholder="Region, suburb, area..." />
              </label>
            </>
          ) : null}

          {slip.kind === "client" ? (
            <>
              <label>
                Client name
                <input value={draft.clientName || draft.title || ""} onChange={(event) => update("clientName", event.target.value)} placeholder="Client or business name" />
              </label>

              <label>
                Email
                <input value={draft.clientEmail || ""} onChange={(event) => update("clientEmail", event.target.value)} placeholder="Client email" />
              </label>

              <label>
                Phone
                <input value={draft.clientPhone || ""} onChange={(event) => update("clientPhone", event.target.value)} placeholder="Client phone" />
              </label>

              <label>
                Service address
                <input value={draft.clientAddress || ""} onChange={(event) => update("clientAddress", event.target.value)} placeholder="Client or job address" />
              </label>
            </>
          ) : null}

          {isJobReview ? (
            <>
              <label>
                Job status / next step
                <input value={draft.jobStatus || ""} onChange={(event) => update("jobStatus", event.target.value)} placeholder="new, assigned, in progress, completed..." />
              </label>

              <label>
                Amount / pricing context
                <input value={draft.amount || ""} onChange={(event) => update("amount", event.target.value)} placeholder="Optional" />
              </label>
            </>
          ) : null}

          {isQuoteLike ? (
            <>
              <label>
                Client name
                <input value={draft.clientName || ""} onChange={(event) => update("clientName", event.target.value)} placeholder="Client or customer name" />
              </label>

              <label>
                Quote line item
                <input value={draft.quoteLineItem || draft.title || ""} onChange={(event) => update("quoteLineItem", event.target.value)} placeholder="Service, job or quote item" />
              </label>

              <label>
                Amount / estimate
                <input value={draft.amount || ""} onChange={(event) => update("amount", event.target.value)} placeholder="Quote amount" />
              </label>

              <label>
                Expiry date
                <input value={draft.expiryDate || ""} onChange={(event) => update("expiryDate", event.target.value)} placeholder="YYYY-MM-DD" />
              </label>

              <label className="wide">
                Quote description
                <textarea value={draft.quoteDescription || ""} onChange={(event) => update("quoteDescription", event.target.value)} placeholder="Describe the scope clearly..." />
              </label>
            </>
          ) : null}

          {isNewInvoice ? (
            <>
              <label>
                Client name
                <input value={draft.invoiceClientName || ""} onChange={(event) => update("invoiceClientName", event.target.value)} placeholder="Client or customer name" />
              </label>

              <label>
                Invoice line item
                <input value={draft.invoiceLineItem || draft.title || ""} onChange={(event) => update("invoiceLineItem", event.target.value)} placeholder="Service, job or invoice item" />
              </label>
            </>
          ) : null}

          {isInvoiceLike ? (
            <>
              <label>
                Amount / owner input
                <input value={draft.amount || ""} onChange={(event) => update("amount", event.target.value)} placeholder="Add amount if missing" />
              </label>

              <label>
                Due date
                <input value={draft.dueDate || ""} onChange={(event) => update("dueDate", event.target.value)} placeholder="YYYY-MM-DD" />
              </label>

              <label className="wide">
                Invoice description
                <textarea value={draft.invoiceDescription || ""} onChange={(event) => update("invoiceDescription", event.target.value)} />
              </label>
            </>
          ) : null}

          {isPayrollLike ? (
            <>
              <label>
                Worker name
                <input value={draft.payrollWorkerName || draft.title || ""} onChange={(event) => update("payrollWorkerName", event.target.value)} placeholder="Worker name" />
              </label>

              <label>
                Role
                <input value={draft.payrollRole || ""} onChange={(event) => update("payrollRole", event.target.value)} placeholder="Role" />
              </label>

              <label>
                Hours
                <input value={draft.payrollHours || ""} onChange={(event) => update("payrollHours", event.target.value)} placeholder="Approved hours" />
              </label>

              <label>
                Rate
                <input value={draft.payrollRate || ""} onChange={(event) => update("payrollRate", event.target.value)} placeholder="Pay rate" />
              </label>
            </>
          ) : null}

          {isSettingsLike ? (
            <>
              <label className="wide">
                Setting / rule
                <input value={draft.title || ""} onChange={(event) => update("title", event.target.value)} placeholder="Setting name" />
              </label>
            </>
          ) : null}

          <label className="wide">
            Owner note / fix
            <textarea value={draft.ownerNote || ""} onChange={(event) => update("ownerNote", event.target.value)} placeholder="Add what matters before approval..." />
          </label>

          {!showsInvoiceTemplate ? (
            <label className="wide">
              Message / prepared wording
              <textarea value={draft.customerMessage || ""} onChange={(event) => update("customerMessage", event.target.value)} placeholder="Edit before anything is copied, saved, or sent..." />
            </label>
          ) : null}

          {canChooseSms ? (
            <label>
              Message delivery
              <select value={draft.messageChannel || "save_only"} onChange={(event) => update("messageChannel", event.target.value)}>
                <option value="save_only">Save draft only</option>
                <option value="email_draft">Prepare email draft</option>
                <option value="sms" disabled={Number(smsCredits || 0) <= 0}>Send SMS</option>
              </select>
            </label>
          ) : null}

          {smsBlocked ? (
            <section className="om-sms-credit-gate">
              <span>SMS locked</span>
              <strong>Buy SMS credits before Churvox can send this as a text.</strong>
              <p>Churvox can still save the message as a draft, but it will not send SMS with 0 credits.</p>
            </section>
          ) : null}
        </section>

        {outputStatus ? <p className="om-slip-status">{outputStatus}</p> : null}

        <footer className="om-slip-actions">
          <button type="button" className="ghost" onClick={onClose}>Back</button>
          <button type="button" onClick={() => onSave(slip, draft)}>Save edit</button>
          <button type="button" className="approve" disabled={busy || smsBlocked} onClick={approve}>
            {busy ? "Saving..." : primaryLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}


function MachineLane({ title, subtitle, items, empty, onOpen, quiet, limit = 5 }) {
  return (
    <section className={`om-lane ${quiet ? "quiet" : ""}`}>
      <header>
        <div>
          <span>{subtitle}</span>
          <h2>{title}</h2>
        </div>
        <b>{items.length}</b>
      </header>

      <div className="om-lane-list">
        {items.length ? items.slice(0, limit).map((item) => (
          <button type="button" key={item.id} onClick={() => onOpen(item)} className={`om-slip-row ${item.kind}`}>
            <span>{item.eyebrow}</span>
            <strong>{item.title}</strong>
            <small>{item.need || item.detail}</small>
          </button>
        )) : <p className="om-empty">{empty}</p>}
      </div>
    </section>
  );
}

const OM_PLAN_DEFS = {
  start: {
    label: "Start",
    price: "$39",
    rank: 1,
    includes: ["Jobs", "Clients", "Quotes", "Invoices", "Basic Approval Desk"],
  },
  crew: {
    label: "Crew",
    price: "$89",
    rank: 2,
    includes: ["Everything in Start", "Team", "Worker workflow", "Proof & Pay", "Time tracking"],
  },
  operator: {
    label: "Operator",
    price: "$149",
    rank: 3,
    includes: ["Everything in Crew", "AI Operator Actions", "Draft invoices", "Quote follow-ups", "Payment reminders", "MYOB add-on available"],
  },
  command: {
    label: "Command",
    price: "$299",
    rank: 4,
    includes: ["Everything in Operator", "Payroll", "MYOB included", "Advanced roles", "Higher limits", "Advanced automation"],
  },
};

const OM_PAGE_PLAN = {
  dashboard: "start",
  jobs: "start",
  clients: "start",
  quotes: "start",
  invoices: "start",
  settings: "start",
  plans: "start",
  team: "crew",
  proof: "crew",
  payroll: "command",
};

function normalisePlanName(value) {
  const raw = clean(value, "start").toLowerCase();
  if (raw.includes("command") || raw.includes("enterprise")) return "command";
  if (raw.includes("operator") || raw.includes("pro")) return "operator";
  if (raw.includes("crew") || raw.includes("team")) return "crew";
  if (raw.includes("start") || raw.includes("solo")) return "start";
  return "start";
}

function currentPlanKey(data = {}) {
  try {
    return planEntitlementSnapshot(data).plan || "start";
  } catch {
    return "start";
  }
}

function planRank(plan) {
  return OM_PLAN_DEFS[normalisePlanName(plan)]?.rank || 1;
}

function planAllows(currentPlan, requiredPlan) {
  return planRank(currentPlan) >= planRank(requiredPlan);
}

function requiredPlanForPage(page) {
  return OM_PAGE_PLAN[page] || "start";
}

function planLabel(plan) {
  return OM_PLAN_DEFS[normalisePlanName(plan)]?.label || "Start";
}

function planPrice(plan) {
  return OM_PLAN_DEFS[normalisePlanName(plan)]?.price || "$39";
}

const OM_PLAN_LIMITS = {
  start: { clients: 20, activeTeam: 1 },
  crew: { clients: 30, activeTeam: 10 },
  operator: { clients: 40, activeTeam: 25 },
  command: { clients: 50, activeTeam: 50 },
};

function firstNumber(...values) {
  for (const value of values) {
    const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function billingContext(data = {}) {
  const raw = data.raw || {};
  const user = raw.user || raw.profile || data.user || data.profile || {};
  const business = raw.business || raw.company || data.business || data.company || {};
  const billing = raw.billing || raw.subscription || data.billing || data.subscription || {};

  let local = {};
  try {
    local = {
      plan: localStorage.getItem("churvox_plan") || "",
      plan_status: localStorage.getItem("churvox_plan_status") || "",
      subscription_status: localStorage.getItem("churvox_subscription_status") || "",
      trial_ends_at: localStorage.getItem("churvox_trial_ends_at") || "",
      growth_packs: localStorage.getItem("churvox_command_growth_packs") || "",
      sms_credits: localStorage.getItem("churvox_sms_credits") || "",
    };
  } catch {
    local = {};
  }

  return {
    plan: normalisePlanName(
      billing.plan ||
      billing.current_plan ||
      billing.plan_name ||
      business.plan ||
      user.plan ||
      data.plan ||
      local.plan ||
      "start"
    ),
    plan_status: clean(
      billing.plan_status ||
      billing.status ||
      business.plan_status ||
      user.plan_status ||
      local.plan_status ||
      ""
    ).toLowerCase(),
    subscription_status: clean(
      billing.subscription_status ||
      business.subscription_status ||
      user.subscription_status ||
      local.subscription_status ||
      ""
    ).toLowerCase(),
    trial_ends_at:
      billing.trial_ends_at ||
      billing.trial_end_date ||
      business.trial_ends_at ||
      business.trial_end_date ||
      user.trial_ends_at ||
      user.trial_end_date ||
      local.trial_ends_at ||
      "",
    growth_packs: firstNumber(
      billing.command_growth_packs,
      billing.growth_packs,
      billing.growth_pack_count,
      business.command_growth_packs,
      business.growth_packs,
      data.command_growth_packs,
      local.growth_packs
    ),
    sms_credits: firstNumber(
      billing.sms_credits,
      billing.sms_balance,
      billing.sms_credit_balance,
      raw.sms_credits?.balance,
      raw.sms_balance,
      business.sms_credits,
      data.sms_credits,
      local.sms_credits
    ),
  };
}

function daysUntil(value) {
  if (!value) return 0;
  const end = new Date(value).getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)));
}

function planEntitlementSnapshot(data = {}, planOverride = "") {
  const billing = billingContext(data);
  const plan = normalisePlanName(planOverride || billing.plan);
  const status = clean(billing.plan_status || billing.subscription_status).toLowerCase();
  const paid = ["active", "paid", "current", "trialing"].some((item) => status.includes(item));
  const trialDaysLeft = daysUntil(billing.trial_ends_at);
  const trialActive = status.includes("trial") && trialDaysLeft > 0;
  const trialExpired = status.includes("trial") && billing.trial_ends_at && trialDaysLeft <= 0;
  const canStartTrial = !paid && !billing.trial_ends_at;

  const base = OM_PLAN_LIMITS[plan] || OM_PLAN_LIMITS.start;
  const growthPacks = plan === "command" ? Math.max(0, billing.growth_packs || 0) : 0;
  const activeTeamLimit = base.activeTeam + (growthPacks * 50);

  return {
    plan,
    status: status || (trialActive ? "trialing" : "none"),
    trial: {
      active: trialActive,
      expired: trialExpired,
      daysLeft: trialDaysLeft,
      canStart: canStartTrial,
      endsAt: billing.trial_ends_at,
    },
    limits: {
      clients: base.clients,
      activeTeam: activeTeamLimit,
      baseActiveTeam: base.activeTeam,
      growthPacks,
    },
    sms: {
      credits: smsCreditBalance(data),
    },
  };
}

function syncCheckoutReturnToLocalStorage() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("checkout") !== "success") return;

    const plan = params.get("plan");
    const addon = params.get("addon");
    const sms = params.get("sms");

    if (plan) {
      localStorage.setItem("churvox_plan", normalisePlanName(plan));
      localStorage.setItem("churvox_plan_status", "active");
      localStorage.setItem("churvox_subscription_status", "active");
    }

    if (addon === "command_growth_pack") {
      const current = firstNumber(localStorage.getItem("churvox_command_growth_packs"));
      localStorage.setItem("churvox_command_growth_packs", String(current + 1));
    }

    if (addon === "myob_operator") {
      localStorage.setItem("churvox_myob_addon", "active");
    }

    if (sms) {
      const current = firstNumber(localStorage.getItem("churvox_sms_credits"));
      localStorage.setItem("churvox_sms_credits", String(current + Number(sms)));
    }
  } catch {
    // ignore local return sync
  }
}

function checkoutUrlFrom(payload = {}) {
  const candidates = [
    payload.url,
    payload.checkout_url,
    payload.checkoutUrl,
    payload.redirect_url,
    payload.redirectUrl,
    payload.session_url,
    payload?.session?.url,
    payload?.data?.url,
    payload?.data?.checkout_url,
    payload?.data?.checkoutUrl,
    payload?.data?.session?.url,
  ];

  return candidates.find((value) => typeof value === "string" && value.startsWith("http")) || "";
}

function checkoutMetaForSlip(slip = {}) {
  const id = clean(slip.id || "").toLowerCase();
  const rawName = clean(slip.planName || slip.eyebrow || slip.title || "").toLowerCase();

  const planMap = {
    "plan-start": { plan: "start", legacy_plan: "solo", plan_name: "Start", price: 39 },
    "plan-crew": { plan: "crew", legacy_plan: "team", plan_name: "Crew", price: 89 },
    "plan-operator": { plan: "operator", legacy_plan: "pro", plan_name: "Operator", price: 149 },
    "plan-command": { plan: "command", legacy_plan: "enterprise", plan_name: "Command", price: 299 },
  };

  if (planMap[id]) {
    return {
      kind: "plan",
      ...planMap[id],
      billing_interval: "month",
      success_url: `${window.location.origin}/dashboard?checkout=success&plan=${planMap[id].plan}`,
      cancel_url: `${window.location.origin}/plans?checkout=cancelled&plan=${planMap[id].plan}`,
    };
  }

  if (id === "addon-growth-pack" || rawName.includes("growth")) {
    return {
      kind: "addon",
      addon: "command_growth_pack",
      addon_name: "Command Growth Pack",
      plan: "command",
      legacy_plan: "enterprise",
      price: 99,
      billing_interval: "month",
      success_url: `${window.location.origin}/plans?checkout=success&addon=command_growth_pack`,
      cancel_url: `${window.location.origin}/plans?checkout=cancelled&addon=command_growth_pack`,
    };
  }

  if (id === "addon-myob-operator" || rawName.includes("myob")) {
    return {
      kind: "addon",
      addon: "myob_operator",
      addon_name: "MYOB add-on",
      plan: "operator",
      legacy_plan: "pro",
      price: 39,
      billing_interval: "month",
      success_url: `${window.location.origin}/plans?checkout=success&addon=myob_operator`,
      cancel_url: `${window.location.origin}/plans?checkout=cancelled&addon=myob_operator`,
    };
  }

  const smsMatch = id.match(/addon-sms-(100|500|1000)/);
  if (smsMatch) {
    const credits = smsMatch[1];
    const price = credits === "100" ? 10 : credits === "500" ? 45 : 80;

    return {
      kind: "sms",
      addon: "sms_credits",
      pack_id: credits,
      pack: credits,
      credits: Number(credits),
      sms_credits: Number(credits),
      price,
      success_url: `${window.location.origin}/plans?checkout=success&sms=${credits}`,
      cancel_url: `${window.location.origin}/plans?checkout=cancelled&sms=${credits}`,
    };
  }

  return {
    kind: slip.kind || "plan",
    plan: normalisePlanName(slip.planName || slip.eyebrow || "start"),
    legacy_plan: normalisePlanName(slip.planName || slip.eyebrow || "start"),
    plan_name: slip.planName || slip.eyebrow || "Start",
    success_url: `${window.location.origin}/dashboard?checkout=success`,
    cancel_url: `${window.location.origin}/plans?checkout=cancelled`,
  };
}

function featureLockedMessage(page) {
  const required = requiredPlanForPage(page);
  const labels = {
    team: "Team and worker workflow starts on Crew.",
    proof: "Proof & Pay starts on Crew because it depends on worker notes, photos and completion flow.",
    payroll: "Payroll is a Command feature because it needs locked-down payroll access, timesheets and pay review.",
  };

  return labels[page] || `${featureConfig(page).label} requires ${planLabel(required)}.`;
}


function rowsForPage(page, machine, data = {}) {
  const raw = data.raw || {};
  const source = {
    jobs: arrayFrom(raw.jobs, data.jobs),
    clients: arrayFrom(raw.clients, data.clients),
    team: arrayFrom(raw.team, raw.workers, data.team),
    quotes: arrayFrom(raw.quotes, data.quotes),
    invoices: arrayFrom(raw.invoices, data.invoices),
    proof: machine.processing.filter((item) => item.kind === "proof"),
    payroll: arrayFrom(raw.team, raw.workers, data.team),
    plans: [],
    settings: [],
  }[page] || [];

  if (page === "proof") return source;

  if (page === "plans") {
    return [
      {
        id: "plan-start",
        eyebrow: "Start",
        title: "Start · $39/month + GST",
        need: "For solo operators who need the basics clean and simple.",
        kind: "plan",
        price: "$39",
        planName: "Start",
        badge: "Solo operators",
        prepared: "Jobs, clients, quotes, invoices and basic Approval Desk. Best for one-person businesses that want the work organised without advanced AI Operator capacity.",
        features: ["Jobs", "Clients", "Quotes", "Invoices", "Basic Approval Desk"],
        cta: "Start checkout",
      },
      {
        id: "plan-crew",
        eyebrow: "Crew",
        title: "Crew · $89/month + GST",
        need: "For small teams that need worker workflow and job proof.",
        kind: "plan",
        price: "$89",
        planName: "Crew",
        badge: "Small teams",
        prepared: "Worker app, job assignment, notes, proof photos and time tracking. Best when the business has crew in the field and the owner needs cleaner updates.",
        features: ["Worker app", "Job assignment", "Notes", "Photos", "Time tracking"],
        cta: "Start checkout",
      },
      {
        id: "plan-operator",
        eyebrow: "Operator",
        title: "Operator · $149/month + GST",
        need: "Most Popular. The plan where Churvox starts preparing the admin.",
        kind: "plan",
        price: "$149",
        planName: "Operator",
        badge: "Most Popular",
        prepared: "AI Operator Actions, draft invoices, quote follow-ups, payment reminders and approval-first admin. Best for owners who want Churvox doing the admin prep.",
        features: ["AI Operator Actions", "Draft invoices", "Quote follow-ups", "Payment reminders", "Approval Desk"],
        cta: "Start checkout",
      },
      {
        id: "plan-command",
        eyebrow: "Command",
        title: "Command · $299/month + GST",
        need: "For growing teams that need the full operating machine.",
        kind: "plan",
        price: "$299",
        planName: "Command",
        badge: "Growing teams",
        prepared: "MYOB included, payroll workspace, advanced roles, higher limits, stronger automation and Command Growth Packs for extra active team members.",
        features: ["MYOB included", "Payroll workspace", "Advanced roles", "Higher limits", "Automation"],
        cta: "Start checkout",
      },
      {
        id: "addon-growth-pack",
        eyebrow: "Growth add-on",
        title: "Command Growth Pack · $99/month + GST",
        need: "Add more active team capacity and more Approval Desk power as the business grows.",
        kind: "addon",
        price: "$99",
        planName: "Command Growth Pack",
        badge: "Active add-on",
        prepared: "Adds 50 extra active team members per Growth Pack, extra job capacity, extra AI Operator Actions, extra automation runs, and extra admin/payroll capacity. The count sticks to the business after checkout; only active team members count, so old or inactive staff records do not increase the bill.",
        features: ["+50 active team members", "Extra job capacity", "Extra AI Operator Actions", "Extra automation runs", "Extra admin/payroll capacity"],
        cta: "Add to checkout",
      },
      {
        id: "addon-myob-operator",
        eyebrow: "MYOB add-on",
        title: "MYOB add-on · $39/month + GST",
        need: "Optional MYOB sync add-on for Operator. Included by default on Command.",
        kind: "addon",
        price: "$39",
        planName: "MYOB add-on",
        badge: "Operator add-on",
        prepared: "Adds MYOB sync capacity to Operator. Command includes MYOB by default. Churvox keeps accounting actions approval-first so invoice/payment sync does not happen blindly.",
        features: ["Operator add-on", "Included on Command", "Invoice sync", "Payment status sync", "Approval-first"],
        cta: "Add to checkout",
      },
      {
        id: "addon-sms-100",
        eyebrow: "SMS credits",
        title: "100 SMS credits · $10",
        need: "Prepaid SMS credits for reminders and customer messages.",
        kind: "addon",
        price: "$10",
        planName: "100 SMS credits",
        badge: "Active add-on",
        prepared: "Buy 100 prepaid SMS credits. SMS credits are separate from the monthly plan. Churvox will not send SMS unless credits have been purchased and are available in the SMS wallet.",
        features: ["100 SMS credits", "Prepaid pack", "Separate from plan", "Use for reminders", "Use for customer updates"],
        cta: "Buy credits",
      },
      {
        id: "addon-sms-500",
        eyebrow: "SMS credits",
        title: "500 SMS credits · $45",
        need: "Better value prepaid SMS credits for regular customer reminders.",
        kind: "addon",
        price: "$45",
        planName: "500 SMS credits",
        badge: "Best value",
        prepared: "Buy 500 prepaid SMS credits. Good for businesses sending regular job reminders, quote nudges, payment reminders and customer updates.",
        features: ["500 SMS credits", "Better value", "Prepaid pack", "Separate from plan", "Regular reminders"],
        cta: "Buy credits",
      },
      {
        id: "addon-sms-1000",
        eyebrow: "SMS credits",
        title: "1000 SMS credits · $80",
        need: "Largest prepaid SMS pack for busy teams.",
        kind: "addon",
        price: "$80",
        planName: "1000 SMS credits",
        badge: "Busy teams",
        prepared: "Buy 1000 prepaid SMS credits. Best for larger teams using SMS heavily for reminders, job updates and payment follow-ups.",
        features: ["1000 SMS credits", "Largest pack", "Prepaid pack", "Separate from plan", "High message volume"],
        cta: "Buy credits",
      },
    ];
  }

  if (page === "settings") {
    return [
      { id: "settings-business", eyebrow: "Business setup", title: "Business details", need: "Business name, trade type, region and invoice wording feed the Approval Desk.", kind: "settings" },
      { id: "settings-guardrails", eyebrow: "Owner controls", title: "Approval guardrails", need: "Churvox prepares admin, but sensitive actions stay owner-approved.", kind: "settings" },
      { id: "settings-integrations", eyebrow: "Connected systems", title: "MYOB, email, SMS and imports", need: "Integrations should feed prepared actions, not send blindly.", kind: "settings" },
    ];
  }

  return source.map((item, index) => {
    const title = clean(
      item.title ||
      item.job_title ||
      item.client_name ||
      item.customer_name ||
      item.name ||
      item.invoice_number ||
      item.quote_number ||
      item.email,
      `${page} record ${index + 1}`
    );

    const detail = clean(
      item.description ||
      item.message ||
      item.notes ||
      item.address ||
      item.email ||
      item.phone ||
      item.status ||
      item.invoice_status ||
      item.quote_status ||
      item.job_status,
      "Open the approval slip to review details."
    );

    return {
      id: `${page}-${itemId(item, index)}`,
      sourceId: itemId(item, index),
      eyebrow:
        page === "jobs" ? "Job" :
        page === "clients" ? "Client" :
        page === "team" ? "Worker" :
        page === "quotes" ? "Quote" :
        page === "invoices" ? "Invoice" :
        page === "payroll" ? "Payroll source" :
        "Record",
      title,
      need: detail,
      kind: page,
      item,
      draft: {
        title,
        ownerNote: detail,
        customerMessage:
          page === "quotes" ? quoteFollowup(item) :
          page === "invoices" ? reminderMessage(item) :
          page === "jobs" ? invoiceDescription(item) :
          "",
        invoiceDescription:
          page === "jobs" || page === "invoices" ? invoiceDescription(item) : "",
        amount: invoiceAmount(item),
        dueDate: "",
      },
    };
  });
}

function featureConfig(page) {
  const configs = {
    jobs: {
      label: "Jobs",
      title: "Jobs feed the Approval Desk.",
      body: "Create, assign and complete work here. Churvox uses the job data to prepare dispatch, proof and pay and invoice actions.",
      primary: "Open job slip",
      empty: "No jobs found yet.",
      machine: ["Assign crew", "Proof", "Invoice prep"],
    },
    clients: {
      label: "Clients",
      title: "Clients power clean jobs, quotes and invoices.",
      body: "Keep client details tidy once. Churvox uses them in prepared messages, invoices and follow-ups.",
      primary: "Open client slip",
      empty: "No clients found yet.",
      machine: ["Contact check", "Duplicate check", "Invoice context"],
    },
    team: {
      label: "Team",
      title: "Team records power worker matching.",
      body: "Roles, regions and availability help Churvox recommend the right worker without dumping decisions on the owner.",
      primary: "Open worker slip",
      empty: "No team records found yet.",
      machine: ["Worker fit", "Region", "Workload"],
    },
    quotes: {
      label: "Quotes",
      title: "Quotes become prepared follow-ups.",
      body: "Churvox watches quote age, client details and status, then prepares owner-approved follow-up wording.",
      primary: "Open quote slip",
      empty: "No quotes found yet.",
      machine: ["Age check", "Follow-up draft", "Convert to job"],
    },
    invoices: {
      label: "Invoices",
      title: "Invoices become cashflow actions.",
      body: "Churvox checks drafts, missing amounts and unpaid invoices, then prepares reminders or owner fixes.",
      primary: "Open invoice slip",
      empty: "No invoices found yet.",
      machine: ["Amount check", "Payment status", "Reminder draft"],
    },
    proof: {
      label: "Proof & Pay",
      title: "Worker proof becomes invoice-ready admin.",
      body: "Notes, photos and completion details feed better invoice descriptions and owner approval.",
      primary: "Open proof slip",
      empty: "No proof packages found yet.",
      machine: ["Notes", "Photos", "Invoice wording"],
    },
    payroll: {
      label: "Payroll",
      title: "Payroll stays controlled and review-first.",
      body: "Timesheets, worker hours and pay summaries should be prepared for review, not blindly changed.",
      primary: "Open payroll source",
      empty: "No payroll source records found yet.",
      machine: ["Timesheets", "Hours", "Review"],
    },
    plans: {
      label: "Plans",
      title: "Pricing stays easy to understand.",
      body: "Start simple. Move into Operator when you want Churvox preparing the admin. Growth Packs, MYOB add-on and SMS credits are active add-ons.",
      primary: "Review",
      empty: "Plan options are loading.",
      machine: ["Start", "Crew", "Operator", "Command", "Growth Pack", "MYOB", "SMS Credits"],
    },
    settings: {
      label: "Settings",
      title: "Teach Churvox how the business should run.",
      body: "Business details, owner controls and integrations feed the machine in the background.",
      primary: "Review setting",
      empty: "Settings are ready.",
      machine: ["Business setup", "Guardrails", "Integrations"],
    },
  };

  return configs[page] || configs.jobs;
}

function ClientsRecordBoard({ data, machine, onOpen }) {
  const clientRows = rowsForPage("clients", machine, data || {});
  const [clientFilter, setClientFilter] = useState("priority");
  const [clientQuery, setClientQuery] = useState("");

  const raw = (data && data.raw) || {};
  const jobs = arrayFrom(raw.jobs, data?.jobs);
  const quotes = arrayFrom(raw.quotes, data?.quotes);
  const invoices = arrayFrom(raw.invoices, data?.invoices);

  function clientName(item = {}) {
    return clean(item.client_name || item.customer_name || item.name || item.business_name || item.company || item.email || item.phone, "Client");
  }

  function hasContact(item = {}) {
    return Boolean(clean(item.email || item.client_email || item.customer_email || item.phone || item.client_phone || item.customer_phone || item.mobile));
  }

  function hasAddress(item = {}) {
    return Boolean(clean(item.address || item.billing_address || item.service_address || item.location));
  }

  function relatedCount(client = {}, records = []) {
    const name = clientName(client).toLowerCase();
    const id = clean(client.id || client._id || client.client_id || client.customer_id).toLowerCase();

    return records.filter((record) => {
      const recordText = [
        record.client_id,
        record.customer_id,
        record.client_name,
        record.customer_name,
        record.client?.name,
        record.customer?.name,
        record.name,
        record.email,
        record.phone,
      ].map((value) => clean(value).toLowerCase()).join(" ");

      return (id && recordText.includes(id)) || (name && recordText.includes(name));
    }).length;
  }

  const missingContactRows = clientRows.filter((row) => !hasContact(row.item || {}));
  const missingAddressRows = clientRows.filter((row) => !hasAddress(row.item || {}));
  const activeRows = clientRows.filter((row) => relatedCount(row.item || {}, jobs) > 0);
  const invoiceRows = clientRows.filter((row) => relatedCount(row.item || {}, invoices) > 0 || relatedCount(row.item || {}, quotes) > 0);

  const priorityRows = [
    ...missingContactRows,
    ...missingAddressRows,
    ...activeRows,
    ...invoiceRows,
    ...clientRows,
  ].filter((row, index, arr) => arr.findIndex((item) => item.id === row.id) === index);

  const sourceRows =
    clientFilter === "contact" ? missingContactRows :
    clientFilter === "address" ? missingAddressRows :
    clientFilter === "active" ? activeRows :
    clientFilter === "all" ? clientRows :
    priorityRows;

  const filteredRows = sourceRows
    .filter((row) => {
      const item = row.item || {};
      const haystack = [
        row.title,
        row.need,
        item.client_name,
        item.customer_name,
        item.name,
        item.business_name,
        item.company,
        item.email,
        item.phone,
        item.mobile,
        item.address,
        item.billing_address,
        item.service_address,
      ].map((value) => clean(value).toLowerCase()).join(" ");

      return !clientQuery.trim() || haystack.includes(clientQuery.trim().toLowerCase());
    })
    .slice(0, 18);

  const clientStats = [
    ["Clients", clientRows.length],
    ["Need contact", missingContactRows.length],
    ["Need address", missingAddressRows.length],
    ["Active", activeRows.length],
  ];

  const machineSteps = [
    ["Record", "Client enters once"],
    ["Check", "Contact and address are checked"],
    ["Use", "Jobs, quotes and invoices stay clean"],
    ["Follow up", "Messages use real client context"],
  ];

  const filters = [
    ["priority", "Priority"],
    ["contact", "Need contact"],
    ["address", "Need address"],
    ["active", "Active"],
    ["all", "All clients"],
  ];

  function makeNewClientSlip() {
    return {
      id: `new-client-${Date.now()}`,
      sourceId: "",
      kind: "client",
      eyebrow: "New client intake",
      title: "Create new client",
      need: "Add the client once. Churvox will reuse it for jobs, quotes, invoices and reminders.",
      prepared: "Churvox will use this client record as clean context across the Approval Desk.",
      draft: {
        title: "",
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        clientAddress: "",
        ownerNote: "",
        customerMessage: "",
        invoiceDescription: "",
      },
    };
  }

  function makeClientSlip(row) {
    const item = row.item || {};
    const name = clientName(item);
    const email = clean(item.email || item.client_email || item.customer_email);
    const phone = clean(item.phone || item.client_phone || item.customer_phone || item.mobile);
    const address = clean(item.address || item.billing_address || item.service_address || item.location);
    const jobsCount = relatedCount(item, jobs);
    const quotesCount = relatedCount(item, quotes);
    const invoicesCount = relatedCount(item, invoices);
    const needsContact = !hasContact(item);
    const needsAddress = !hasAddress(item);

    return {
      ...row,
      kind: "client",
      eyebrow: needsContact ? "Needs contact" : needsAddress ? "Needs address" : "Client record",
      title: name,
      need: needsContact
        ? "Add phone or email so reminders, quotes and invoices can work cleanly."
        : needsAddress
          ? "Add a service address so jobs and worker matching are cleaner."
          : "Review client details and keep the record clean.",
      prepared:
        `Churvox checked this client for machine context. Jobs: ${jobsCount}. Quotes: ${quotesCount}. Invoices: ${invoicesCount}.` +
        `${email ? ` Email: ${email}.` : ""}${phone ? ` Phone: ${phone}.` : ""}${address ? ` Address: ${address}.` : ""}`,
      draft: {
        title: name,
        clientName: name,
        clientEmail: email,
        clientPhone: phone,
        clientAddress: address,
        ownerNote: clean(item.notes || item.internal_note || row.need),
        customerMessage: "",
        invoiceDescription: address ? `Service address: ${address}` : "",
      },
    };
  }

  return (
    <section className="om-clients-board" data-phase="PHASE_85_FINISH_CLIENTS_OPERATOR_MACHINE">
      <header className="om-clients-hero om-clients-hero-final">
        <div>
          <span>Churvox Approval Desk · Clients</span>
          <h1>Clients go in once. Jobs, quotes and invoices stay clean.</h1>
          <p>
            Keep client records simple. Churvox checks contact details, addresses and related work in the background,
            then uses that context to prepare better jobs, invoices and follow-ups.
          </p>

          <button type="button" className="om-client-hero-action inline" onClick={() => onOpen(makeNewClientSlip())}>
            New client intake
          </button>
        </div>

        <aside>
          {clientStats.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </aside>
      </header>

      <section className="om-client-flow-strip compact">
        {machineSteps.map(([label, body], index) => (
          <article key={label} className={index === 1 ? "active" : ""}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
            <small>{body}</small>
          </article>
        ))}
      </section>

      <section className="om-clients-layout">
        <section className="om-client-list">
          <header className="om-client-list-head">
            <div>
              <span>Client Records</span>
              <h2>Who the business works for.</h2>
              <p>Filter the records, then open one Approval Slip to review or fix client details.</p>
            </div>
            <b>{filteredRows.length}</b>
          </header>

          <section className="om-client-tools">
            <div className="om-client-filter-tabs">
              {filters.map(([key, label]) => (
                <button type="button" key={key} className={clientFilter === key ? "active" : ""} onClick={() => setClientFilter(key)}>
                  {label}
                </button>
              ))}
            </div>

            <input
              value={clientQuery}
              onChange={(event) => setClientQuery(event.target.value)}
              placeholder="Search client, phone, email, address..."
            />
          </section>

          <div>
            {filteredRows.length ? filteredRows.map((row) => {
              const item = row.item || {};
              const name = clientName(item);
              const contact = clean(item.email || item.client_email || item.customer_email || item.phone || item.client_phone || item.customer_phone || item.mobile);
              const address = clean(item.address || item.billing_address || item.service_address || item.location);
              const needsContact = !hasContact(item);
              const needsAddress = !hasAddress(item);

              return (
                <button
                  type="button"
                  key={row.id}
                  className={`om-client-ticket ${needsContact ? "needs-contact" : needsAddress ? "needs-address" : "active"}`}
                  onClick={() => onOpen(makeClientSlip(row))}
                >
                  <span>{needsContact ? "Needs contact" : needsAddress ? "Needs address" : "Client"}</span>
                  <strong>{name}</strong>
                  <small>{contact || address || row.need}</small>
                  <em>{needsContact ? "Add contact" : needsAddress ? "Add address" : "Open Approval Slip"}</em>
                </button>
              );
            }) : (
              <article className="om-client-empty">
                <strong>No clients match this view.</strong>
                <p>Try another filter or add a new client intake.</p>
              </article>
            )}
          </div>
        </section>

        <aside className="om-client-side">
          <section>
            <span>Needs contact</span>
            <strong>{missingContactRows.length}</strong>
            <p>Phone or email is needed before reminders, quotes and invoices can work cleanly.</p>
          </section>

          <section>
            <span>Needs address</span>
            <strong>{missingAddressRows.length}</strong>
            <p>Service address helps jobs, worker matching and invoice wording.</p>
          </section>

          <section>
            <span>Machine rule</span>
            <h3>Enter client details once.</h3>
            <p>Churvox reuses clean client context across jobs, quotes, invoices, SMS and proof and pay.</p>
          </section>
        </aside>
      </section>
    </section>
  );
}

function ProofToPaidBoard({ data, machine, onOpen }) {
  const proofRows = rowsForPage("proof", machine, data || {});
  const raw = (data && data.raw) || {};
  const jobs = arrayFrom(raw.jobs, data?.jobs);
  const completedJobs = jobs.filter((job) => isCompletedJob(job));
  const withPhotos = jobs.filter((job) => photoCount(job) > 0);
  const invoiceReady = machine.approval.filter((item) => item.kind === "invoice");
  const [proofFilter, setProofFilter] = useState("priority");
  const [proofQuery, setProofQuery] = useState("");

  const proofFromJobs = completedJobs.map((job, index) => {
    const id = itemId(job, `proof-job-${index}`);
    const client = clean(job.client_name || job.customer_name || job.client?.name, "Client");
    const title = clean(job.title || job.job_title || job.service_type || job.name, `Completed job ${index + 1}`);
    const prepared = invoiceDescription(job);

    return {
      id: `proof-job-${id}`,
      sourceId: id,
      kind: "proof",
      eyebrow: photoCount(job) ? "Proof package" : "Completed work",
      title: `Proof package for ${client}`,
      need: "Completed work can feed invoice wording and owner review.",
      prepared,
      draft: {
        title,
        ownerNote: clean(job.completion_notes || job.worker_notes || job.notes),
        customerMessage: prepared,
        invoiceDescription: prepared,
        amount: invoiceAmount(job),
      },
      item: job,
    };
  });

  const allProofRows = [
    ...proofRows,
    ...proofFromJobs,
  ].filter((row, index, arr) => arr.findIndex((item) => item.id === row.id) === index);

  const withPhotoRows = allProofRows.filter((row) => photoCount(row.item || {}) > 0);
  const needsInvoiceRows = allProofRows.filter((row) => invoiceAmount(row.item || {}) || isCompletedJob(row.item || {}));

  const sourceRows =
    proofFilter === "photos" ? withPhotoRows :
    proofFilter === "invoice" ? needsInvoiceRows :
    proofFilter === "all" ? allProofRows :
    [...needsInvoiceRows, ...withPhotoRows, ...allProofRows].filter((row, index, arr) => arr.findIndex((item) => item.id === row.id) === index);

  const filteredRows = sourceRows
    .filter((row) => {
      const item = row.item || {};
      const haystack = [
        row.title,
        row.need,
        row.prepared,
        item.title,
        item.job_title,
        item.client_name,
        item.customer_name,
        item.address,
        item.notes,
        item.worker_notes,
        item.completion_notes,
      ].map((value) => clean(value).toLowerCase()).join(" ");

      return !proofQuery.trim() || haystack.includes(proofQuery.trim().toLowerCase());
    })
    .slice(0, 18);

  const stats = [
    ["Proof items", allProofRows.length],
    ["Photos", withPhotos.length],
    ["Completed", completedJobs.length],
    ["Invoice ready", invoiceReady.length],
  ];

  const steps = [
    ["Complete", "Worker finishes the job"],
    ["Proof", "Notes and photos are gathered"],
    ["Prepare", "Invoice wording is drafted"],
    ["Approve", "Owner reviews before sending"],
  ];

  const filters = [
    ["priority", "Priority"],
    ["photos", "With photos"],
    ["invoice", "Invoice ready"],
    ["all", "All proof"],
  ];

  return (
    <section className="om-proof-board" data-phase="PHASE_89_FINISH_LAST_OPERATOR_MACHINE_PAGES">
      <header className="om-proof-hero om-proof-hero-final">
        <div>
          <span>Churvox Approval Desk · Proof & Pay</span>
          <h1>Proof goes in. Invoice wording comes out ready.</h1>
          <p>
            Worker notes, completion proof and job context should not sit hidden. Churvox turns proof into owner-approved invoice and customer update drafts.
          </p>
        </div>

        <aside>
          {stats.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </aside>
      </header>

      <section className="om-proof-flow-strip compact">
        {steps.map(([label, body], index) => (
          <article key={label} className={index === 2 ? "active" : ""}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
            <small>{body}</small>
          </article>
        ))}
      </section>

      <section className="om-proof-layout">
        <section className="om-proof-list">
          <header>
            <div>
              <span>Proof Queue</span>
              <h2>Completed work that can become admin.</h2>
              <p>Open one Approval Slip to review proof, wording, amount or invoice context.</p>
            </div>
            <b>{filteredRows.length}</b>
          </header>

          <section className="om-proof-tools">
            <div className="om-proof-filter-tabs">
              {filters.map(([key, label]) => (
                <button type="button" key={key} className={proofFilter === key ? "active" : ""} onClick={() => setProofFilter(key)}>
                  {label}
                </button>
              ))}
            </div>

            <input
              value={proofQuery}
              onChange={(event) => setProofQuery(event.target.value)}
              placeholder="Search proof, client, job, notes..."
            />
          </section>

          <div>
            {filteredRows.length ? filteredRows.map((row) => {
              const photos = photoCount(row.item || {});
              const amount = invoiceAmount(row.item || {});

              return (
                <button type="button" key={row.id} className={`om-proof-ticket ${photos ? "photos" : "ready"}`} onClick={() => onOpen(row)}>
                  <span>{photos ? `${photos} photo${photos === 1 ? "" : "s"}` : "Proof ready"}</span>
                  <strong>{row.title}</strong>
                  <small>{row.need}</small>
                  <em>{amount ? money(amount) : "Review proof"}</em>
                </button>
              );
            }) : (
              <article className="om-proof-empty">
                <strong>No proof items match this view.</strong>
                <p>Completed jobs and worker proof will appear here.</p>
              </article>
            )}
          </div>
        </section>

        <aside className="om-proof-side">
          <section>
            <span>Invoice ready</span>
            <strong>{invoiceReady.length}</strong>
            <p>Completed jobs that can become invoice drafts.</p>
          </section>

          <section>
            <span>Worker proof</span>
            <strong>{withPhotos.length}</strong>
            <p>Photo and note proof gives better invoice wording.</p>
          </section>

          <section>
            <span>Machine rule</span>
            <h3>Proof should feed payment.</h3>
            <p>Churvox should turn job completion evidence into clear invoice and customer update drafts.</p>
          </section>
        </aside>
      </section>
    </section>
  );
}

function PayrollWorkspaceBoard({ data, machine, onOpen }) {
  const raw = (data && data.raw) || {};
  const team = arrayFrom(raw.team, raw.workers, data?.team);
  const jobs = arrayFrom(raw.jobs, data?.jobs);
  const [payrollFilter, setPayrollFilter] = useState("priority");
  const [payrollQuery, setPayrollQuery] = useState("");

  function workerName(item = {}) {
    return clean(item.name || item.full_name || item.worker_name || item.display_name || item.email || item.phone, "Worker");
  }

  function workerRole(item = {}) {
    return clean(item.role || item.worker_role || item.position || item.type, "Worker");
  }

  function hoursFor(worker = {}) {
    const id = clean(worker.id || worker._id || worker.worker_id || worker.user_id).toLowerCase();
    const name = workerName(worker).toLowerCase();
    let total = 0;

    jobs.forEach((job) => {
      const assigned = [
        job.assigned_worker_id,
        job.worker_id,
        job.assigned_worker,
        job.assigned_worker_name,
        job.worker_name,
      ].map((value) => clean(value).toLowerCase()).join(" ");

      if ((id && assigned.includes(id)) || (name && assigned.includes(name))) {
        const hours = Number(String(job.billable_hours || job.worked_hours || job.total_hours || job.hours || 0).replace(/[^0-9.-]/g, ""));
        if (Number.isFinite(hours) && hours > 0) total += hours;
      }
    });

    return Math.round(total * 100) / 100;
  }

  const missingRole = team.filter((worker) => !clean(worker.role || worker.worker_role || worker.position || worker.type));
  const activeWorkers = team.filter((worker) => hoursFor(worker) > 0);
  const payrollReady = team.filter((worker) => clean(worker.pay_rate || worker.hourly_rate || worker.rate) || hoursFor(worker) > 0);

  const sourceRows =
    payrollFilter === "active" ? activeWorkers :
    payrollFilter === "rate" ? payrollReady :
    payrollFilter === "role" ? missingRole :
    payrollFilter === "all" ? team :
    [...activeWorkers, ...payrollReady, ...missingRole, ...team].filter((item, index, arr) => arr.findIndex((worker) => itemId(worker, workerName(worker)) === itemId(item, workerName(item))) === index);

  const filteredWorkers = sourceRows
    .filter((worker) => {
      const haystack = [
        workerName(worker),
        workerRole(worker),
        worker.email,
        worker.phone,
        worker.region,
        worker.area,
        worker.pay_rate,
        worker.hourly_rate,
      ].map((value) => clean(value).toLowerCase()).join(" ");

      return !payrollQuery.trim() || haystack.includes(payrollQuery.trim().toLowerCase());
    })
    .slice(0, 18);

  const stats = [
    ["Workers", team.length],
    ["Active", activeWorkers.length],
    ["Payroll ready", payrollReady.length],
    ["Need role", missingRole.length],
  ];

  const steps = [
    ["Collect", "Time and worker context"],
    ["Check", "Roles, hours and notes"],
    ["Prepare", "Pay summary draft"],
    ["Approve", "Owner/payroll review"],
  ];

  const filters = [
    ["priority", "Priority"],
    ["active", "Active"],
    ["rate", "Payroll ready"],
    ["role", "Need role"],
    ["all", "All workers"],
  ];

  function makePayrollSlip(worker, index) {
    const name = workerName(worker);
    const role = workerRole(worker);
    const hours = hoursFor(worker);
    const rate = clean(worker.pay_rate || worker.hourly_rate || worker.rate);
    const summary = `${name} payroll context. Role: ${role}. Hours found: ${hours}. ${rate ? `Rate: ${rate}.` : "Rate not set."}`;

    return {
      id: `payroll-${itemId(worker, index)}`,
      sourceId: itemId(worker, index),
      kind: "payroll",
      eyebrow: hours ? "Hours found" : "Payroll review",
      title: `Payroll review for ${name}`,
      need: hours ? "Worker has time context ready for payroll review." : "Review payroll setup, role and pay context.",
      prepared: summary,
      draft: {
        title: `Payroll review for ${name}`,
        payrollWorkerName: name,
        payrollRole: role,
        payrollHours: hours ? String(hours) : "",
        payrollRate: rate,
        ownerNote: clean(worker.notes || worker.internal_note || ""),
        customerMessage: "",
        invoiceDescription: "",
      },
      item: worker,
    };
  }

  return (
    <section className="om-payroll-board" data-phase="PHASE_89_FINISH_LAST_OPERATOR_MACHINE_PAGES">
      <header className="om-payroll-hero om-payroll-hero-final">
        <div>
          <span>Churvox Approval Desk · Payroll</span>
          <h1>Payroll stays locked down and review-first.</h1>
          <p>
            Payroll should not be mixed with normal job admin. Churvox prepares hours, roles and pay summaries for approval without exposing payroll to the wrong users.
          </p>
        </div>

        <aside>
          {stats.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </aside>
      </header>

      <section className="om-payroll-flow-strip compact">
        {steps.map(([label, body], index) => (
          <article key={label} className={index === 3 ? "active" : ""}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
            <small>{body}</small>
          </article>
        ))}
      </section>

      <section className="om-payroll-layout">
        <section className="om-payroll-list">
          <header>
            <div>
              <span>Payroll Workspace</span>
              <h2>Worker pay context for review.</h2>
              <p>Open one Approval Slip to review worker hours, rate context and payroll notes.</p>
            </div>
            <b>{filteredWorkers.length}</b>
          </header>

          <section className="om-payroll-tools">
            <div className="om-payroll-filter-tabs">
              {filters.map(([key, label]) => (
                <button type="button" key={key} className={payrollFilter === key ? "active" : ""} onClick={() => setPayrollFilter(key)}>
                  {label}
                </button>
              ))}
            </div>

            <input
              value={payrollQuery}
              onChange={(event) => setPayrollQuery(event.target.value)}
              placeholder="Search worker, role, pay rate..."
            />
          </section>

          <div>
            {filteredWorkers.length ? filteredWorkers.map((worker, index) => {
              const name = workerName(worker);
              const hours = hoursFor(worker);
              const rate = clean(worker.pay_rate || worker.hourly_rate || worker.rate);

              return (
                <button type="button" key={itemId(worker, index)} className={`om-payroll-ticket ${hours ? "active" : "setup"}`} onClick={() => onOpen(makePayrollSlip(worker, index))}>
                  <span>{hours ? "Hours found" : "Setup review"}</span>
                  <strong>{name}</strong>
                  <small>{workerRole(worker)}</small>
                  <em>{hours ? `${hours} hrs` : rate ? `Rate ${rate}` : "Review"}</em>
                </button>
              );
            }) : (
              <article className="om-payroll-empty">
                <strong>No payroll records match this view.</strong>
                <p>Workers and approved time context will appear here.</p>
              </article>
            )}
          </div>
        </section>

        <aside className="om-payroll-side">
          <section>
            <span>Payroll ready</span>
            <strong>{payrollReady.length}</strong>
            <p>Workers with time or pay context ready for review.</p>
          </section>

          <section>
            <span>Locked area</span>
            <strong>Safe</strong>
            <p>Payroll should stay separate from worker and general admin access.</p>
          </section>

          <section>
            <span>Machine rule</span>
            <h3>Prepare, do not pay blindly.</h3>
            <p>Churvox prepares payroll summaries, exports and notes. Owner/payroll approval stays in control.</p>
          </section>
        </aside>
      </section>
    </section>
  );
}

function SettingsMachineBoard({ data, machine, onOpen }) {
  const currentPlan = currentPlanKey(data || {});
  const businessLogoUrl = businessLogoFromData(data || {});
  const raw = (data && data.raw) || {};
  const business = raw.business || raw.company || data?.business || {};
  const user = raw.user || raw.profile || data?.user || {};
  const [settingsFilter, setSettingsFilter] = useState("priority");

  const settingsRows = [
    {
      id: "settings-business",
      kind: "settings",
      eyebrow: "Business setup",
      title: "Business details",
      need: "Business name, industry, region and public contact should be clean.",
      prepared: `Business: ${clean(business.name || business.business_name || user.business_name, "not set")}. Industry: ${clean(business.industry || user.industry, "not set")}.`,
      draft: {
        title: "Business details",
        ownerNote: "Review business name, industry, region and public contact details.",
        customerMessage: "",
        invoiceDescription: "",
      },
    },
    {
      id: "settings-roles",
      kind: "settings",
      eyebrow: "Access",
      title: "Roles and permissions",
      need: "Owner, manager, worker, office admin and payroll access should stay clean.",
      prepared: "Churvox keeps payroll, owner billing, workers and office admin access separated.",
      draft: {
        title: "Roles and permissions",
        ownerNote: "Review role access and make sure sensitive areas are locked.",
        customerMessage: "",
        invoiceDescription: "",
      },
    },
    {
      id: "settings-ai",
      kind: "settings",
      eyebrow: "AI approval",
      title: "AI Operator approval rules",
      need: "Sensitive actions should remain approval-first.",
      prepared: "Churvox can prepare invoices, quotes, reminders and dispatch actions, but owner approval should stay in front of sensitive changes.",
      draft: {
        title: "AI Operator approval rules",
        ownerNote: "Keep customer messages, invoice sending, MYOB sync, pricing and payroll approval-first.",
        customerMessage: "",
        invoiceDescription: "",
      },
    },
    {
      id: "settings-billing",
      kind: "settings",
      eyebrow: "Plan",
      title: `Current plan: ${planLabel(currentPlan)}`,
      need: "Plan, add-ons, MYOB and SMS credits should be easy to review.",
      prepared: `Current Churvox plan is ${planLabel(currentPlan)} at ${planPrice(currentPlan)}/month + GST.`,
      draft: {
        title: `Current plan: ${planLabel(currentPlan)}`,
        ownerNote: "Review plan level, Growth Pack, MYOB add-on and SMS credits.",
        customerMessage: "",
        invoiceDescription: "",
      },
    },
  ];

  const priorityRows = settingsRows;
  const sourceRows =
    settingsFilter === "access" ? settingsRows.filter((row) => row.id.includes("roles")) :
    settingsFilter === "ai" ? settingsRows.filter((row) => row.id.includes("ai")) :
    settingsFilter === "billing" ? settingsRows.filter((row) => row.id.includes("billing")) :
    priorityRows;

  const stats = [
    ["Plan", planLabel(currentPlan)],
    ["Approval", "On"],
    ["Roles", "Locked"],
    ["SMS", "Credits"],
  ];

  const steps = [
    ["Business", "Identity and trade context"],
    ["Access", "Roles and permissions"],
    ["Approval", "AI rules stay safe"],
    ["Billing", "Plan and add-ons"],
  ];

  const filters = [
    ["priority", "Priority"],
    ["access", "Access"],
    ["ai", "AI rules"],
    ["billing", "Billing"],
  ];

  return (
    <section className="om-settings-board" data-phase="PHASE_89_FINISH_LAST_OPERATOR_MACHINE_PAGES">
      <header className="om-settings-hero om-settings-hero-final">
        <div>
          <span>Churvox Approval Desk · Settings</span>
          <h1>Settings control how the machine behaves.</h1>
          <p>
            Keep setup simple, but make the rules strong. Business context, roles, approval rules, plan and add-ons all affect what Churvox can prepare.
          </p>
        </div>

        <aside>
          {stats.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </aside>
      </header>

      <section className="om-settings-flow-strip compact">
        {steps.map(([label, body], index) => (
          <article key={label} className={index === 2 ? "active" : ""}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
            <small>{body}</small>
          </article>
        ))}
      </section>

      <section className="om-settings-layout">
        <section className="om-settings-list">
          <header>
            <div>
              <span>Setup Queue</span>
              <h2>Controls that matter.</h2>
              <p>Open one Approval Slip to review how Churvox should run the business admin.</p>
            </div>
            <b>{sourceRows.length}</b>
          </header>

          <section className="om-settings-tools">
            <div className="om-settings-filter-tabs">
              {filters.map(([key, label]) => (
                <button type="button" key={key} className={settingsFilter === key ? "active" : ""} onClick={() => setSettingsFilter(key)}>
                  {label}
                </button>
              ))}
            </div>
          </section>

          <div>
            {sourceRows.map((row) => (
              <button type="button" key={row.id} className="om-settings-ticket" onClick={() => onOpen(row)}>
                <span>{row.eyebrow}</span>
                <strong>{row.title}</strong>
                <small>{row.need}</small>
                <em>Review</em>
              </button>
            ))}
          </div>
        </section>

        <aside className="om-settings-side">
          <section>
            <span>Safety</span>
            <strong>Approval</strong>
            <p>Customer sends, pricing, payroll and MYOB/accounting actions stay owner-approved.</p>
          </section>

          <section>
            <span>Machine rule</span>
            <h3>Admin prepared in the background.</h3>
            <p>Settings should make Churvox smarter without making the app harder to use.</p>
          </section>
        </aside>
      </section>
    </section>
  );
}

function InvoicesCashflowBoard({ data, machine, onOpen }) {
  const invoiceRows = rowsForPage("invoices", machine, data || {});
  const [invoiceFilter, setInvoiceFilter] = useState("priority");
  const [invoiceQuery, setInvoiceQuery] = useState("");

  function invoiceStatus(row = {}) {
    return statusOf(row.item || {});
  }

  function invoiceClient(item = {}, fallback = "Client") {
    return clean(item.client_name || item.customer_name || item.client?.name || item.customer?.name || item.name, fallback);
  }

  function invoiceTitle(item = {}, fallback = "Invoice") {
    return clean(item.title || item.invoice_number || item.number || item.invoice_title || fallback);
  }

  function isDraft(row) {
    const item = row.item || {};
    const status = invoiceStatus(row);
    return status.includes("draft") || status.includes("pending") || status === "new" || !invoiceAmount(item);
  }

  function isPaid(row) {
    const status = invoiceStatus(row);
    return status.includes("paid") || status.includes("settled") || status.includes("complete");
  }

  function isCollect(row) {
    const status = invoiceStatus(row);
    return !isPaid(row) && (
      status.includes("overdue") ||
      status.includes("unpaid") ||
      status.includes("sent") ||
      status.includes("due") ||
      status.includes("awaiting")
    );
  }

  const draftRows = invoiceRows.filter(isDraft);
  const collectRows = invoiceRows.filter(isCollect);
  const paidRows = invoiceRows.filter(isPaid);
  const missingAmountRows = invoiceRows.filter((row) => !invoiceAmount(row.item || {}));

  const priorityRows = [
    ...missingAmountRows,
    ...draftRows,
    ...collectRows,
    ...invoiceRows,
  ].filter((row, index, arr) => arr.findIndex((item) => item.id === row.id) === index);

  const sourceRows =
    invoiceFilter === "drafts" ? draftRows :
    invoiceFilter === "missing" ? missingAmountRows :
    invoiceFilter === "collect" ? collectRows :
    invoiceFilter === "paid" ? paidRows :
    invoiceFilter === "all" ? invoiceRows :
    priorityRows;

  const filteredRows = sourceRows
    .filter((row) => {
      const item = row.item || {};
      const haystack = [
        row.title,
        row.need,
        item.title,
        item.invoice_title,
        item.invoice_number,
        item.number,
        item.client_name,
        item.customer_name,
        item.status,
        item.invoice_status,
        item.payment_status,
        item.description,
        item.invoice_description,
        item.notes,
      ].map((value) => clean(value).toLowerCase()).join(" ");

      return !invoiceQuery.trim() || haystack.includes(invoiceQuery.trim().toLowerCase());
    })
    .slice(0, 18);

  const approvalRows = machine.approval.filter((item) => item.kind === "invoice" || item.kind === "cashflow");

  const stats = [
    ["Invoices", invoiceRows.length],
    ["Need amount", missingAmountRows.length],
    ["To collect", collectRows.length],
    ["Paid", paidRows.length],
  ];

  const steps = [
    ["Draft", "Invoice is prepared"],
    ["Check", "Amount and client are checked"],
    ["Collect", "Reminder can be prepared"],
    ["Sync", "MYOB stays approval-first"],
  ];

  const filters = [
    ["priority", "Priority"],
    ["drafts", "Drafts"],
    ["missing", "Need amount"],
    ["collect", "To collect"],
    ["paid", "Paid"],
    ["all", "All invoices"],
  ];

  function makeNewInvoiceSlip() {
    return {
      id: `new-invoice-${Date.now()}`,
      sourceId: "",
      kind: "invoice",
      eyebrow: "New invoice draft",
      title: "Create invoice draft",
      need: "Create the invoice once. Churvox keeps sending, payment reminders and MYOB sync approval-first.",
      prepared: "Churvox will use the client, line item, amount, due date and description to prepare a clean invoice draft.",
      draft: {
        title: "New invoice",
        invoiceClientName: "",
        invoiceLineItem: "",
        invoiceDescription: "",
        amount: "",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        ownerNote: "",
        customerMessage: "",
      },
    };
  }

  function makeInvoiceSlip(row) {
    const item = row.item || {};
    const client = invoiceClient(item, row.title);
    const title = invoiceTitle(item, row.title);
    const amount = invoiceAmount(item);
    const status = invoiceStatus(row);
    const description = clean(item.description || item.invoice_description || item.notes || row.need);
    const dueDate = clean(item.due_date || item.payment_due_date || item.invoice_due_date);
    const reminder = reminderMessage(item);
    const paid = isPaid(row);
    const collect = isCollect(row);

    if (collect) {
      return {
        ...row,
        kind: "cashflow",
        eyebrow: status.includes("overdue") ? "Overdue" : "Payment follow-up",
        title: `Review payment follow-up for ${client}`,
        need: "This invoice may need a payment reminder or owner review.",
        prepared: reminder,
        draft: {
          title: `Payment reminder for ${client}`,
          invoiceClientName: client,
          invoiceLineItem: title,
          invoiceDescription: description,
          amount,
          dueDate,
          ownerNote: clean(item.internal_note || item.notes || row.need),
          customerMessage: reminder,
        },
      };
    }

    if (paid) {
      return {
        ...row,
        kind: "invoice",
        eyebrow: "Paid invoice",
        title: `Review paid invoice for ${client}`,
        need: "This invoice appears paid. Review record or MYOB/payment sync context.",
        prepared: description || `Churvox found a paid invoice for ${client}.`,
        draft: {
          title,
          invoiceClientName: client,
          invoiceLineItem: title,
          invoiceDescription: description,
          amount,
          dueDate,
          ownerNote: "Paid invoice reviewed.",
          customerMessage: "",
        },
      };
    }

    return {
      ...row,
      kind: "invoice",
      eyebrow: amount ? "Invoice review" : "Owner input needed",
      title: `Review invoice for ${client}`,
      need: amount ? "Invoice is ready for owner review." : "Invoice amount is missing and needs owner input.",
      prepared: description || `Churvox found ${title} for ${client}. Review the amount, description and due date before approval.`,
      draft: {
        title,
        invoiceClientName: client,
        invoiceLineItem: title,
        invoiceDescription: description || `Invoice prepared for ${client}.`,
        amount,
        dueDate,
        ownerNote: clean(item.internal_note || item.notes || row.need),
        customerMessage: description || "",
      },
    };
  }

  return (
    <section className="om-invoices-board" data-phase="PHASE_90_FINISH_INVOICES_OPERATOR_MACHINE_ALL_IN_ONE">
      <header className="om-invoices-hero om-invoices-hero-final">
        <div>
          <span>Churvox Approval Desk · Invoices</span>
          <h1>Invoices turn work into cashflow without the mess.</h1>
          <p>
            Churvox watches drafts, missing amounts, unpaid invoices and payment follow-ups.
            The owner sees the next cashflow decision, not a confusing invoice wall.
          </p>

          <button type="button" className="om-invoice-hero-action inline" onClick={() => onOpen(makeNewInvoiceSlip())}>
            New invoice draft
          </button>
        </div>

        <aside>
          {stats.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </aside>
      </header>

      <section className="om-invoice-flow-strip compact">
        {steps.map(([label, body], index) => (
          <article key={label} className={index === 2 ? "active" : ""}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
            <small>{body}</small>
          </article>
        ))}
      </section>

      <section className="om-invoices-layout">
        <section className="om-invoice-list">
          <header className="om-invoice-list-head">
            <div>
              <span>Invoice Queue</span>
              <h2>What needs cashflow attention.</h2>
              <p>Filter invoices, then open one Approval Slip to review, edit, collect or approve.</p>
            </div>
            <b>{filteredRows.length}</b>
          </header>

          <section className="om-invoice-tools">
            <div className="om-invoice-filter-tabs">
              {filters.map(([key, label]) => (
                <button type="button" key={key} className={invoiceFilter === key ? "active" : ""} onClick={() => setInvoiceFilter(key)}>
                  {label}
                </button>
              ))}
            </div>

            <input
              value={invoiceQuery}
              onChange={(event) => setInvoiceQuery(event.target.value)}
              placeholder="Search invoice, client, status, amount..."
            />
          </section>

          <div>
            {filteredRows.length ? filteredRows.map((row) => {
              const item = row.item || {};
              const client = invoiceClient(item, row.title);
              const status = invoiceStatus(row);
              const amount = invoiceAmount(item);
              const missing = !amount;
              const collect = isCollect(row);
              const paid = isPaid(row);

              return (
                <button
                  type="button"
                  key={row.id}
                  className={`om-invoice-ticket ${missing ? "missing" : collect ? "collect" : paid ? "paid" : "draft"}`}
                  onClick={() => onOpen(makeInvoiceSlip(row))}
                >
                  <span>{missing ? "Needs amount" : collect ? "Collect" : paid ? "Paid" : status || "Invoice"}</span>
                  <strong>{client}</strong>
                  <small>{row.need}</small>
                  <em>{amount ? money(amount) : "Add amount"}</em>
                </button>
              );
            }) : (
              <article className="om-invoice-empty">
                <strong>No invoices match this view.</strong>
                <p>Try another filter or create a new invoice draft.</p>
              </article>
            )}
          </div>
        </section>

        <aside className="om-invoice-side">
          <section>
            <span>Ready approvals</span>
            <strong>{approvalRows.length}</strong>
            <p>Invoice drafts and payment follow-ups ready for owner review.</p>
          </section>

          <section>
            <span>Money to collect</span>
            <strong>{collectRows.length}</strong>
            <p>Unpaid or overdue invoices that may need a reminder.</p>
          </section>

          <section>
            <span>Machine rule</span>
            <h3>No blind sending.</h3>
            <p>Churvox can prepare invoice wording, payment reminders and MYOB sync actions, but the owner approves sensitive steps.</p>
          </section>
        </aside>
      </section>
    </section>
  );
}


function QuotesPipelineBoard({ data, machine, onOpen }) {
  const quoteRows = rowsForPage("quotes", machine, data || {});
  const [quoteFilter, setQuoteFilter] = useState("priority");
  const [quoteQuery, setQuoteQuery] = useState("");

  function quoteStatus(row = {}) {
    return statusOf(row.item || {});
  }

  function isAccepted(row) {
    const status = quoteStatus(row);
    return status.includes("accepted") || status.includes("approved") || status.includes("won");
  }

  function isLost(row) {
    const status = quoteStatus(row);
    return status.includes("declined") || status.includes("lost") || status.includes("rejected") || status.includes("expired");
  }

  function isOpen(row) {
    return !isAccepted(row) && !isLost(row);
  }

  function quoteAmount(item = {}) {
    return invoiceAmount(item);
  }

  function quoteClient(item = {}, fallback = "Client") {
    return clean(item.client_name || item.customer_name || item.client?.name || item.customer?.name || item.name, fallback);
  }

  function quoteTitle(item = {}, fallback = "Quote") {
    return clean(item.title || item.quote_title || item.quote_number || item.number || item.service_type || fallback);
  }

  const openRows = quoteRows.filter(isOpen);
  const acceptedRows = quoteRows.filter(isAccepted);
  const lostRows = quoteRows.filter(isLost);
  const needsFollowupRows = openRows.filter((row) => {
    const item = row.item || {};
    const status = quoteStatus(row);
    return status.includes("sent") || status.includes("open") || status.includes("draft") || status.includes("pending") || status === "new";
  });

  const priorityRows = [
    ...needsFollowupRows,
    ...openRows,
    ...acceptedRows,
    ...quoteRows,
  ].filter((row, index, arr) => arr.findIndex((item) => item.id === row.id) === index);

  const sourceRows =
    quoteFilter === "open" ? openRows :
    quoteFilter === "followup" ? needsFollowupRows :
    quoteFilter === "accepted" ? acceptedRows :
    quoteFilter === "lost" ? lostRows :
    quoteFilter === "all" ? quoteRows :
    priorityRows;

  const filteredRows = sourceRows
    .filter((row) => {
      const item = row.item || {};
      const haystack = [
        row.title,
        row.need,
        item.title,
        item.quote_title,
        item.quote_number,
        item.number,
        item.client_name,
        item.customer_name,
        item.status,
        item.quote_status,
        item.description,
        item.notes,
        item.service_type,
      ].map((value) => clean(value).toLowerCase()).join(" ");

      return !quoteQuery.trim() || haystack.includes(quoteQuery.trim().toLowerCase());
    })
    .slice(0, 18);

  const quoteStats = [
    ["Quotes", quoteRows.length],
    ["Open", openRows.length],
    ["Follow-up", needsFollowupRows.length],
    ["Accepted", acceptedRows.length],
  ];

  const machineSteps = [
    ["Draft", "Quote is prepared"],
    ["Check", "Price and scope are checked"],
    ["Follow up", "Owner-approved nudge is prepared"],
    ["Convert", "Accepted work can become a job"],
  ];

  const filters = [
    ["priority", "Priority"],
    ["open", "Open"],
    ["followup", "Follow-up"],
    ["accepted", "Accepted"],
    ["lost", "Lost"],
    ["all", "All quotes"],
  ];

  function makeNewQuoteSlip() {
    return {
      id: `new-quote-${Date.now()}`,
      sourceId: "",
      kind: "quote",
      eyebrow: "New quote draft",
      title: "Create quote draft",
      need: "Create the quote once. Churvox keeps wording, price and follow-up approval-first.",
      prepared: "Churvox will use the client, service scope, amount and notes to prepare a clean quote draft.",
      draft: {
        title: "New quote",
        clientName: "",
        quoteLineItem: "",
        quoteDescription: "",
        amount: "",
        expiryDate: "",
        ownerNote: "",
        customerMessage: "",
        invoiceDescription: "",
      },
    };
  }

  function makeQuoteSlip(row) {
    const item = row.item || {};
    const client = quoteClient(item, "Client");
    const title = quoteTitle(item, row.title);
    const amount = quoteAmount(item);
    const status = quoteStatus(row);
    const description = clean(item.description || item.quote_description || item.scope || item.notes || row.need);
    const followup = quoteFollowup(item);
    const accepted = isAccepted(row);
    const lost = isLost(row);

    if (accepted) {
      return {
        ...row,
        kind: "quote",
        eyebrow: "Accepted quote",
        title: `Accepted quote for ${client}`,
        need: "This quote has been accepted and may be ready to become a job or invoice.",
        prepared: `Churvox found an accepted quote. ${description || followup}`,
        draft: {
          title,
          clientName: client,
          quoteLineItem: title,
          quoteDescription: description || followup,
          amount,
          expiryDate: clean(item.expiry_date || item.valid_until || item.expires_at),
          ownerNote: "Review whether this accepted quote should become a job or invoice.",
          customerMessage: "",
          invoiceDescription: description || followup,
        },
      };
    }

    if (lost) {
      return {
        ...row,
        kind: "quote",
        eyebrow: "Closed quote",
        title: `Review closed quote for ${client}`,
        need: "This quote appears closed, lost, declined or expired.",
        prepared: `Churvox found a closed quote. Status: ${status}. ${description || ""}`,
        draft: {
          title,
          clientName: client,
          quoteLineItem: title,
          quoteDescription: description,
          amount,
          expiryDate: clean(item.expiry_date || item.valid_until || item.expires_at),
          ownerNote: "Review why this quote closed and whether follow-up is needed later.",
          customerMessage: "",
          invoiceDescription: "",
        },
      };
    }

    return {
      ...row,
      kind: "quote",
      eyebrow: "Quote follow-up",
      title: `Review quote follow-up for ${client}`,
      need: "This quote is still open. Churvox prepared follow-up wording for owner review.",
      prepared: followup,
      draft: {
        title,
        clientName: client,
        quoteLineItem: title,
        quoteDescription: description || followup,
        amount,
        expiryDate: clean(item.expiry_date || item.valid_until || item.expires_at),
        ownerNote: clean(item.notes || item.internal_note || row.need),
        customerMessage: followup,
        invoiceDescription: "",
      },
    };
  }

  return (
    <section className="om-quotes-board" data-phase="PHASE_88_FINISH_QUOTES_OPERATOR_MACHINE_ALL_IN_ONE">
      <header className="om-quotes-hero om-quotes-hero-final">
        <div>
          <span>Churvox Approval Desk · Quotes</span>
          <h1>Quotes stay simple. Follow-ups come prepared.</h1>
          <p>
            Churvox keeps quote scope, price, status and client context tidy in the background,
            then prepares the next owner-approved quote action.
          </p>

          <button type="button" className="om-quote-hero-action inline" onClick={() => onOpen(makeNewQuoteSlip())}>
            New quote draft
          </button>
        </div>

        <aside>
          {quoteStats.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </aside>
      </header>

      <section className="om-quote-flow-strip compact">
        {machineSteps.map(([label, body], index) => (
          <article key={label} className={index === 2 ? "active" : ""}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
            <small>{body}</small>
          </article>
        ))}
      </section>

      <section className="om-quotes-layout">
        <section className="om-quote-list">
          <header className="om-quote-list-head">
            <div>
              <span>Quote Queue</span>
              <h2>What needs quote attention.</h2>
              <p>Filter quotes, then open one Approval Slip to review, edit, follow up or convert.</p>
            </div>
            <b>{filteredRows.length}</b>
          </header>

          <section className="om-quote-tools">
            <div className="om-quote-filter-tabs">
              {filters.map(([key, label]) => (
                <button type="button" key={key} className={quoteFilter === key ? "active" : ""} onClick={() => setQuoteFilter(key)}>
                  {label}
                </button>
              ))}
            </div>

            <input
              value={quoteQuery}
              onChange={(event) => setQuoteQuery(event.target.value)}
              placeholder="Search quote, client, status, scope..."
            />
          </section>

          <div>
            {filteredRows.length ? filteredRows.map((row) => {
              const item = row.item || {};
              const client = quoteClient(item, row.title);
              const status = quoteStatus(row);
              const amount = quoteAmount(item);
              const accepted = isAccepted(row);
              const lost = isLost(row);

              return (
                <button
                  type="button"
                  key={row.id}
                  className={`om-quote-ticket ${accepted ? "accepted" : lost ? "lost" : "open"}`}
                  onClick={() => onOpen(makeQuoteSlip(row))}
                >
                  <span>{accepted ? "Accepted" : lost ? "Closed" : status || "Open quote"}</span>
                  <strong>{client}</strong>
                  <small>{row.need}</small>
                  <em>{amount ? money(amount) : accepted ? "Convert" : "Follow up"}</em>
                </button>
              );
            }) : (
              <article className="om-quote-empty">
                <strong>No quotes match this view.</strong>
                <p>Try another filter or create a new quote draft.</p>
              </article>
            )}
          </div>
        </section>

        <aside className="om-quote-side">
          <section>
            <span>Open quotes</span>
            <strong>{openRows.length}</strong>
            <p>Quotes waiting on customer approval or owner follow-up.</p>
          </section>

          <section>
            <span>Follow-ups</span>
            <strong>{needsFollowupRows.length}</strong>
            <p>Churvox can prepare quote nudges, but owner approves before sending.</p>
          </section>

          <section>
            <span>Machine rule</span>
            <h3>No generic quote messages.</h3>
            <p>Quote wording should use the client, scope, price and status so the follow-up feels specific.</p>
          </section>
        </aside>
      </section>
    </section>
  );
}


function TeamCrewBoard({ data, machine, onOpen }) {
  const teamRows = rowsForPage("team", machine, data || {});
  const [teamFilter, setTeamFilter] = useState("priority");
  const [teamQuery, setTeamQuery] = useState("");

  const raw = (data && data.raw) || {};
  const jobs = arrayFrom(raw.jobs, data?.jobs);

  function workerName(item = {}) {
    return clean(
      item.name ||
      item.full_name ||
      item.worker_name ||
      item.display_name ||
      item.email ||
      item.phone,
      "Team member"
    );
  }

  function workerRole(item = {}) {
    return clean(item.role || item.worker_role || item.position || item.type, "Worker");
  }

  function workerRegion(item = {}) {
    return clean(item.region || item.area || item.zone || item.location);
  }

  function workerContact(item = {}) {
    return clean(item.email || item.phone || item.mobile);
  }

  function hasContact(item = {}) {
    return Boolean(workerContact(item));
  }

  function hasRole(item = {}) {
    return Boolean(clean(item.role || item.worker_role || item.position || item.type));
  }

  function hasRegion(item = {}) {
    return Boolean(workerRegion(item));
  }

  function assignedCount(worker = {}) {
    const id = clean(worker.id || worker._id || worker.worker_id || worker.user_id).toLowerCase();
    const name = workerName(worker).toLowerCase();

    return jobs.filter((job) => {
      const text = [
        job.assigned_worker_id,
        job.worker_id,
        job.assigned_worker,
        job.assigned_worker_name,
        job.worker_name,
        job.worker?.name,
      ].map((value) => clean(value).toLowerCase()).join(" ");

      return (id && text.includes(id)) || (name && text.includes(name));
    }).length;
  }

  const missingContactRows = teamRows.filter((row) => !hasContact(row.item || {}));
  const missingRoleRows = teamRows.filter((row) => !hasRole(row.item || {}));
  const missingRegionRows = teamRows.filter((row) => !hasRegion(row.item || {}));
  const activeRows = teamRows.filter((row) => assignedCount(row.item || {}) > 0);

  const priorityRows = [
    ...missingContactRows,
    ...missingRoleRows,
    ...missingRegionRows,
    ...activeRows,
    ...teamRows,
  ].filter((row, index, arr) => arr.findIndex((item) => item.id === row.id) === index);

  const sourceRows =
    teamFilter === "contact" ? missingContactRows :
    teamFilter === "role" ? missingRoleRows :
    teamFilter === "region" ? missingRegionRows :
    teamFilter === "active" ? activeRows :
    teamFilter === "all" ? teamRows :
    priorityRows;

  const filteredRows = sourceRows
    .filter((row) => {
      const item = row.item || {};
      const haystack = [
        row.title,
        row.need,
        item.name,
        item.full_name,
        item.worker_name,
        item.email,
        item.phone,
        item.mobile,
        item.role,
        item.worker_role,
        item.position,
        item.region,
        item.area,
        item.zone,
      ].map((value) => clean(value).toLowerCase()).join(" ");

      return !teamQuery.trim() || haystack.includes(teamQuery.trim().toLowerCase());
    })
    .slice(0, 18);

  const teamStats = [
    ["Team", teamRows.length],
    ["Need contact", missingContactRows.length],
    ["Need region", missingRegionRows.length],
    ["Active jobs", activeRows.length],
  ];

  const machineSteps = [
    ["Record", "Worker enters once"],
    ["Check", "Role, region and contact are checked"],
    ["Match", "Jobs can use worker fit"],
    ["Proof", "Worker updates feed owner approval"],
  ];

  const filters = [
    ["priority", "Priority"],
    ["contact", "Need contact"],
    ["role", "Need role"],
    ["region", "Need region"],
    ["active", "Active"],
    ["all", "All team"],
  ];

  function makeNewTeamSlip() {
    return {
      id: `new-team-${Date.now()}`,
      sourceId: "",
      kind: "team-member",
      eyebrow: "New team intake",
      title: "Invite team member",
      need: "Add the worker once. Churvox will use the role, region and contact for job matching.",
      prepared: "Churvox will use this team record for dispatch, worker matching, job proof and owner-approved workflow.",
      draft: {
        title: "",
        workerName: "",
        workerEmail: "",
        workerPhone: "",
        workerRole: "worker",
        workerRegion: "",
        ownerNote: "",
        customerMessage: "",
        invoiceDescription: "",
      },
    };
  }

  function makeTeamSlip(row) {
    const item = row.item || {};
    const name = workerName(item);
    const role = workerRole(item);
    const region = workerRegion(item);
    const contact = workerContact(item);
    const count = assignedCount(item);
    const needsContact = !hasContact(item);
    const needsRole = !hasRole(item);
    const needsRegion = !hasRegion(item);

    return {
      ...row,
      kind: "team-member",
      eyebrow:
        needsContact ? "Needs contact" :
        needsRole ? "Needs role" :
        needsRegion ? "Needs region" :
        "Team record",
      title: name,
      need:
        needsContact ? "Add phone or email so invites, updates and worker workflow can work cleanly." :
        needsRole ? "Add a role so Churvox knows what this person can access." :
        needsRegion ? "Add a region so worker matching is cleaner." :
        "Review team details and keep worker matching clean.",
      prepared:
        `Churvox checked this worker for dispatch context. Role: ${role}. Region: ${region || "not set"}. Assigned jobs found: ${count}.` +
        `${contact ? ` Contact: ${contact}.` : ""}`,
      draft: {
        title: name,
        workerName: name,
        workerEmail: clean(item.email),
        workerPhone: clean(item.phone || item.mobile),
        workerRole: clean(item.role || item.worker_role || item.position || "worker"),
        workerRegion: region,
        ownerNote: clean(item.notes || item.internal_note || row.need),
        customerMessage: "",
        invoiceDescription: "",
      },
    };
  }

  return (
    <section className="om-team-board" data-phase="PHASE_87_FINISH_TEAM_OPERATOR_MACHINE_ALL_IN_ONE">
      <header className="om-team-hero om-team-hero-final">
        <div>
          <span>Churvox Approval Desk · Team</span>
          <h1>Team records power worker matching.</h1>
          <p>
            Keep crew details simple. Churvox checks role, region, contact and active work in the background,
            then uses that context to prepare cleaner dispatch decisions.
          </p>

          <button type="button" className="om-team-hero-action inline" onClick={() => onOpen(makeNewTeamSlip())}>
            New team intake
          </button>
        </div>

        <aside>
          {teamStats.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </aside>
      </header>

      <section className="om-team-flow-strip compact">
        {machineSteps.map(([label, body], index) => (
          <article key={label} className={index === 2 ? "active" : ""}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
            <small>{body}</small>
          </article>
        ))}
      </section>

      <section className="om-team-layout">
        <section className="om-team-list">
          <header className="om-team-list-head">
            <div>
              <span>Team Records</span>
              <h2>Who can do the work.</h2>
              <p>Filter workers, then open one Approval Slip to review role, contact or region.</p>
            </div>
            <b>{filteredRows.length}</b>
          </header>

          <section className="om-team-tools">
            <div className="om-team-filter-tabs">
              {filters.map(([key, label]) => (
                <button type="button" key={key} className={teamFilter === key ? "active" : ""} onClick={() => setTeamFilter(key)}>
                  {label}
                </button>
              ))}
            </div>

            <input
              value={teamQuery}
              onChange={(event) => setTeamQuery(event.target.value)}
              placeholder="Search worker, role, region, phone, email..."
            />
          </section>

          <div>
            {filteredRows.length ? filteredRows.map((row) => {
              const item = row.item || {};
              const name = workerName(item);
              const contact = workerContact(item);
              const role = workerRole(item);
              const region = workerRegion(item);
              const needsContact = !hasContact(item);
              const needsRole = !hasRole(item);
              const needsRegion = !hasRegion(item);

              return (
                <button
                  type="button"
                  key={row.id}
                  className={`om-team-ticket ${needsContact ? "needs-contact" : needsRole ? "needs-role" : needsRegion ? "needs-region" : "active"}`}
                  onClick={() => onOpen(makeTeamSlip(row))}
                >
                  <span>{needsContact ? "Needs contact" : needsRole ? "Needs role" : needsRegion ? "Needs region" : role}</span>
                  <strong>{name}</strong>
                  <small>{contact || region || row.need}</small>
                  <em>{needsContact ? "Add contact" : needsRole ? "Set role" : needsRegion ? "Set region" : "Open Approval Slip"}</em>
                </button>
              );
            }) : (
              <article className="om-team-empty">
                <strong>No team records match this view.</strong>
                <p>Try another filter or add a new team intake.</p>
              </article>
            )}
          </div>
        </section>

        <aside className="om-team-side">
          <section>
            <span>Needs contact</span>
            <strong>{missingContactRows.length}</strong>
            <p>Email or phone is needed for invites, updates and worker workflow.</p>
          </section>

          <section>
            <span>Needs region</span>
            <strong>{missingRegionRows.length}</strong>
            <p>Region helps Churvox suggest better worker matches for jobs.</p>
          </section>

          <section>
            <span>Machine rule</span>
            <h3>Worker fit should be prepared.</h3>
            <p>Churvox should check role, region, workload and job context before the owner approves dispatch.</p>
          </section>
        </aside>
      </section>
    </section>
  );
}


function JobsQueueBoard({ data, machine, onOpen }) {
  const jobRows = rowsForPage("jobs", machine, data || {});
  const team = arrayFrom(data?.raw?.team, data?.raw?.workers, data?.team);
  const [jobFilter, setJobFilter] = useState("priority");
  const [jobQuery, setJobQuery] = useState("");

  const needsWorker = jobRows.filter((row) => !hasWorker(row.item || {}) && !isCompletedJob(row.item || {}));
  const activeJobs = jobRows.filter((row) => hasWorker(row.item || {}) && !isCompletedJob(row.item || {}));
  const completedJobs = jobRows.filter((row) => isCompletedJob(row.item || {}));
  const invoiceReady = machine.approval.filter((item) => item.kind === "invoice");

  const priorityRows = [
    ...needsWorker,
    ...activeJobs,
    ...completedJobs,
    ...jobRows,
  ].filter((row, index, arr) => arr.findIndex((item) => item.id === row.id) === index);

  const sourceRows =
    jobFilter === "dispatch" ? needsWorker :
    jobFilter === "active" ? activeJobs :
    jobFilter === "completed" ? completedJobs :
    jobFilter === "all" ? jobRows :
    priorityRows;

  const filteredRows = sourceRows
    .filter((row) => {
      const item = row.item || {};
      const haystack = [
        row.title,
        row.need,
        item.client_name,
        item.customer_name,
        item.address,
        item.job_address,
        item.service_address,
        item.location,
        item.assigned_worker_name,
        item.worker_name,
        item.status,
        item.job_status,
        item.notes,
      ].map((value) => clean(value).toLowerCase()).join(" ");

      return !jobQuery.trim() || haystack.includes(jobQuery.trim().toLowerCase());
    })
    .slice(0, 18);

  const jobStats = [
    ["Total jobs", jobRows.length],
    ["Need worker", needsWorker.length],
    ["Active", activeJobs.length],
    ["Completed", completedJobs.length],
  ];

  const machineSteps = [
    ["New", "Job enters the tray"],
    ["Assign crew", "AI matched the best worker"],
    ["Proof", "Notes and photos feed admin"],
    ["Invoice", "Completed work becomes approval-ready"],
  ];

  const filters = [
    ["priority", "Priority"],
    ["dispatch", "Needs dispatch"],
    ["active", "Active"],
    ["completed", "Completed"],
    ["all", "All jobs"],
  ];

  function makeNewJobSlip() {
    return {
      id: `new-job-${Date.now()}`,
      sourceId: "",
      kind: "new-job",
      eyebrow: "New job intake",
      title: "Create new job",
      need: "Enter the job once. Churvox will use it for dispatch, proof and invoice prep.",
      prepared: "Churvox will turn this job record into machine input for worker assignment, proof and pay and owner-approved invoice actions.",
      draft: {
        title: "",
        clientName: "",
        address: "",
        serviceType: "",
        ownerNote: "",
        customerMessage: "",
        invoiceDescription: "",
        amount: "",
        jobStatus: "new",
        workerChoice: "",
      },
    };
  }

  function makeJobSlip(row) {
    const item = row.item || {};
    const title = clean(item.title || item.job_title || item.service_type || item.name || row.title, "Job");
    const client = clean(item.client_name || item.customer_name || item.client?.name, "Client");
    const address = clean(item.address || item.job_address || item.service_address || item.location);
    const notes = clean(item.completion_notes || item.worker_notes || item.job_notes || item.notes);
    const completed = isCompletedJob(item);
    const needsDispatch = !hasWorker(item) && !completed;

    if (needsDispatch) {
      const suggestedWorker = team[0] || {};
      const workerLabel = clean(
        suggestedWorker.name ||
        suggestedWorker.full_name ||
        suggestedWorker.worker_name ||
        suggestedWorker.email,
        "choose worker"
      );

      return {
        ...row,
        kind: "dispatch",
        eyebrow: "Needs dispatch",
        title: `Assign worker for ${title}`,
        need: "This job needs a worker before the day can run cleanly.",
        prepared: `Churvox checked the job record${address ? `, address at ${address}` : ""}, client context and available crew. Suggested worker: ${workerLabel}.`,
        draft: {
          title: `Assign worker for ${title}`,
          workerChoice: clean(suggestedWorker.id || suggestedWorker._id || suggestedWorker.name || suggestedWorker.full_name || ""),
          ownerNote: address ? `Assign based on job address: ${address}` : "Assign the best available worker.",
          customerMessage: "",
          invoiceDescription: "",
          amount: "",
        },
      };
    }

    if (completed) {
      const amount = invoiceAmount(item);
      const prepared = invoiceDescription(item);

      return {
        ...row,
        kind: "invoice",
        eyebrow: amount ? "Invoice ready" : "Owner input needed",
        title: `Approve invoice draft for ${client}`,
        need: amount ? "Completed work is ready for invoice approval." : "Completed work is ready, but the amount needs owner input.",
        prepared,
        draft: {
          title: `Invoice for ${title}`,
          invoiceClientName: client,
          invoiceLineItem: title,
          invoiceDescription: prepared,
          amount,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          ownerNote: notes,
          customerMessage: prepared,
        },
      };
    }

    return {
      ...row,
      kind: "job",
      eyebrow: "Job review",
      title,
      need: "Review job details, next step, worker notes or owner instructions.",
      prepared: `Churvox is using this job as machine input.${client ? ` Client: ${client}.` : ""}${address ? ` Address: ${address}.` : ""}`,
      draft: {
        title,
        jobStatus: statusOf(item),
        ownerNote: notes || row.need || "",
        customerMessage: "",
        invoiceDescription: address ? `Job address: ${address}` : "",
        amount: invoiceAmount(item),
      },
    };
  }

  return (
    <section className="om-jobs-board" data-phase="PHASE_80_FINISH_JOBS_OPERATOR_MACHINE">
      <header className="om-jobs-hero om-jobs-hero-final">
        <div>
          <span>Churvox Approval Desk · Jobs</span>
          <h1>Jobs go in. Crew, proof and invoices come out ready.</h1>
          <p>
            Keep the job record simple. Churvox checks worker fit, proof, client context and invoice readiness
            in the background, then shows only the decisions the owner needs to make.
          </p>

          <button type="button" className="om-job-hero-action inline" onClick={() => onOpen(makeNewJobSlip())}>
            New job intake
          </button>
        </div>

        <aside>
          {jobStats.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </aside>
      </header>

      <section className="om-job-flow-strip compact">
        {machineSteps.map(([label, body], index) => (
          <article key={label} className={index === 1 ? "active" : ""}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
            <small>{body}</small>
          </article>
        ))}
      </section>

      <section className="om-jobs-layout">
        <section className="om-job-queue">
          <header className="om-job-queue-head">
            <div>
              <span>Work</span>
              <h2>Search work. Churvox handles the admin flow in the background.</h2>
              <p>Filter the work, then open one Approval Slip to review, edit, dispatch or invoice.</p>
            </div>
            <b>{filteredRows.length}</b>
          </header>

          <section className="om-job-tools">
            <div className="om-job-filter-tabs">
              {filters.map(([key, label]) => (
                <button type="button" key={key} className={jobFilter === key ? "active" : ""} onClick={() => setJobFilter(key)}>
                  {label}
                </button>
              ))}
            </div>

            <input
              value={jobQuery}
              onChange={(event) => setJobQuery(event.target.value)}
              placeholder="Search jobs, clients, address, worker..."
            />
          </section>

          <div>
            {filteredRows.length ? filteredRows.map((row) => {
              const item = row.item || {};
              const status = statusOf(item);
              const worker = clean(item.assigned_worker_name || item.worker_name || item.assigned_worker || item.worker_id);
              const completed = isCompletedJob(item);
              const needsDispatch = !hasWorker(item) && !completed;
              const address = clean(item.address || item.job_address || item.service_address || item.location);

              return (
                <button type="button" key={row.id} className={`om-job-ticket ${needsDispatch ? "needs-worker" : completed ? "completed" : "active"}`} onClick={() => onOpen(makeJobSlip(row))}>
                  <span>{needsDispatch ? "Needs dispatch" : completed ? "Completed" : status || "Active job"}</span>
                  <strong>{row.title}</strong>
                  <small>{address || row.need}</small>
                  <em>{worker ? `Worker: ${worker}` : needsDispatch ? "Choose worker" : completed ? "Prepare invoice" : "Open Approval Slip"}</em>
                </button>
              );
            }) : (
              <article className="om-job-empty">
                <strong>No jobs match this view.</strong>
                <p>Try another filter or add a new job intake.</p>
              </article>
            )}
          </div>
        </section>

        <aside className="om-job-side">
          <section>
            <span>Ready to assign</span>
            <strong>{needsWorker.length}</strong>
            <p>Jobs without a worker should be handled first so the day can run cleanly.</p>
          </section>

          <section>
            <span>Ready to invoice</span>
            <strong>{invoiceReady.length}</strong>
            <p>Completed work can become invoice drafts with job notes, proof and client context.</p>
          </section>

          <section>
            <span>Machine rule</span>
            <h3>One job record feeds many actions.</h3>
            <p>Job details should stay simple. Churvox prepares dispatch, proof and invoice admin behind it.</p>
          </section>
        </aside>
      </section>
    </section>
  );
}


function PlanPricingBoard({ data, currentPlan, onOpen }) {
  const rows = rowsForPage("plans", buildMachine(data || {}), data || {});
  const mainPlans = rows.filter((row) => row.kind === "plan");
  const addOns = rows.filter((row) => row.kind === "addon");
  const current = planLabel(currentPlan);
  const entitlement = planEntitlementSnapshot(data || {}, currentPlan);
  const trialLine = entitlement.trial.active
    ? `Trial active · ${entitlement.trial.daysLeft} day${entitlement.trial.daysLeft === 1 ? "" : "s"} left`
    : entitlement.trial.expired
      ? "Trial expired · choose a paid plan"
      : entitlement.trial.canStart
        ? "14-day free trial available"
        : entitlement.status || "Plan ready";
  const teamLine = currentPlan === "command"
    ? `${entitlement.limits.activeTeam} active team members · ${entitlement.limits.growthPacks} Growth Pack${entitlement.limits.growthPacks === 1 ? "" : "s"}`
    : `${entitlement.limits.activeTeam} active team member limit`;
  const smsLine = `${entitlement.sms.credits} SMS credit${entitlement.sms.credits === 1 ? "" : "s"} available`;

  const smsAddons = addOns.filter((row) => String(row.id || "").includes("sms"));
  const otherAddons = addOns.filter((row) => !String(row.id || "").includes("sms"));

  return (
    <section className="om-plans-board" data-phase="PHASE_73_PLANS_PRICING_BOARD">
      <header className="om-plans-board-hero">
        <div>
          <span>Plans</span>
          <h1>Pricing stays easy to understand.</h1>
          <p>
            Choose the machine level. Add Growth Pack, MYOB or SMS credits when the business needs more power.
          </p>
        </div>

        <aside className="om-plan-entitlement-strip">
          <b>Current plan: {current}</b>
          <b>{trialLine}</b>
          <b>{teamLine}</b>
          <b>{smsLine}</b>
        </aside>
      </header>

      <section className="om-plan-board-section">
        <header>
          <div>
            <span>Main plans</span>
            <h2>Pick the Churvox level.</h2>
          </div>
          <small>Monthly + GST</small>
        </header>

        <div className="om-plan-card-grid">
          {mainPlans.map((plan) => (
            <button
              type="button"
              key={plan.id}
              className={`om-plan-board-card ${plan.planName === "Operator" ? "featured" : ""}`}
              onClick={() => onOpen({ ...plan, trialAvailable: entitlement.trial.canStart })}
            >
              <span>{plan.badge || plan.eyebrow}</span>
              <strong>{plan.planName || plan.eyebrow}</strong>
              <b>{plan.price}<small>/month + GST</small></b>
              <p>{plan.need}</p>
              <em>{entitlement.trial.canStart ? "Start 14-day trial" : plan.cta || "Review plan"}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="om-plan-board-section addons">
        <header>
          <div>
            <span>Growth + Add-ons</span>
            <h2>Add power without confusing the plans.</h2>
          </div>
          <small>Active add-ons</small>
        </header>

        <div className="om-addon-board">
          {otherAddons.map((addon) => (
            <button type="button" key={addon.id} className="om-addon-card" onClick={() => onOpen(addon)}>
              <span>{addon.badge || addon.eyebrow}</span>
              <strong>{addon.planName || addon.eyebrow}</strong>
              <b>{addon.price}<small>{addon.id === "addon-growth-pack" || addon.id === "addon-myob-operator" ? "/month + GST" : ""}</small></b>
              <p>{addon.need}</p>
              <em>{addon.cta || "Review add-on"}</em>
            </button>
          ))}

          <article className="om-sms-pack-card">
            <span>SMS credits</span>
            <strong>Prepaid SMS credit packs</strong>
            <p>SMS credits are separate from the monthly plan and used for reminders, job updates and payment follow-ups.</p>

            <div>
              {smsAddons.map((addon) => (
                <button type="button" key={addon.id} onClick={() => onOpen(addon)}>
                  <b>{addon.planName}</b>
                  <small>{addon.price}</small>
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}


function FeatureWorkspace({ page, machine, data, currentPlan, onOpen, onPlans }) {
  if (page === "plans") {
    return <PlanPricingBoard data={data} currentPlan={currentPlan} onOpen={onOpen} />;
  }

  if (page === "jobs") {
    return <JobsQueueBoard data={data} machine={machine} onOpen={onOpen} />;
  }

  if (page === "clients") {
    return <ClientsRecordBoard data={data} machine={machine} onOpen={onOpen} />;
  }

  const config = featureConfig(page);
  const rows = rowsForPage(page, machine, data);
  const topRows = rows.slice(0, 12);
  const requiredPlan = requiredPlanForPage(page);
  const locked = !planAllows(currentPlan, requiredPlan);

  if (locked) {
    return (
      <section className="om-feature-workspace om-feature-locked" data-phase="PHASE_71_PLAN_FEATURE_LOCKS">
        <header className="om-feature-hero">
          <div>
            <span>{config.label}</span>
            <h1>{config.title}</h1>
            <p>{featureLockedMessage(page)}</p>
          </div>
          <aside>
            <b>Current: {planLabel(currentPlan)}</b>
            <b>Required: {planLabel(requiredPlan)}</b>
            <b>{planPrice(requiredPlan)}/month + GST</b>
          </aside>
        </header>

        <section className="om-plan-lock-card">
          <div>
            <span>Feature locked</span>
            <h2>{config.label} is included in {planLabel(requiredPlan)}.</h2>
            <p>
              Churvox keeps this feature visible so the owner knows where it lives,
              but the actual workspace stays locked until the plan includes it.
            </p>
          </div>

          <article>
            <strong>{planLabel(requiredPlan)} includes</strong>
            {(OM_PLAN_DEFS[requiredPlan]?.includes || []).map((item) => (
              <b key={item}>{item}</b>
            ))}
          </article>

          <button type="button" onClick={onPlans}>
            View plans
          </button>
        </section>
      </section>
    );
  }

  if (page === "team") {
    return <TeamCrewBoard data={data} machine={machine} onOpen={onOpen} />;
  }

  if (page === "quotes") {
    return <QuotesPipelineBoard data={data} machine={machine} onOpen={onOpen} />;
  }

  if (page === "proof") {
    return <ProofToPaidBoard data={data} machine={machine} onOpen={onOpen} />;
  }

  if (page === "payroll") {
    return <PayrollWorkspaceBoard data={data} machine={machine} onOpen={onOpen} />;
  }

  if (page === "settings") {
    return <SettingsMachineBoard data={data} machine={machine} onOpen={onOpen} />;
  }

  if (page === "invoices") {
    return <InvoicesCashflowBoard data={data} machine={machine} onOpen={onOpen} />;
  }

  return (
    <section className="om-feature-workspace" data-phase="PHASE_69_OPERATOR_MACHINE_ALL_PAGES">
      <header className="om-feature-hero">
        <div>
          <span>{config.label}</span>
          <h1>{config.title}</h1>
          <p>{config.body}</p>
        </div>
        <aside>
          {config.machine.map((item) => (
            <b key={item}>{item}</b>
          ))}
        </aside>
      </header>

      <section className="om-feature-layout">
        <section className="om-feature-records">
          <header>
            <div>
              <span>Records</span>
              <h2>{config.label}</h2>
              <p>Simple list first. Details open in one Approval Slip.</p>
            </div>
            <b>{rows.length}</b>
          </header>

          <div>
            {topRows.length ? topRows.map((item) => (
              <button type="button" className={`om-feature-row ${item.kind}`} key={item.id} onClick={() => onOpen(item)}>
                <span>{item.eyebrow}</span>
                <strong>{item.title}</strong>
                <small>{item.need}</small>
                <em>{config.primary}</em>
              </button>
            )) : (
              <article className="om-feature-empty">
                <strong>{config.empty}</strong>
                <p>When records are added, Churvox will use them to prepare owner-approved actions.</p>
              </article>
            )}
          </div>
        </section>

        <aside className="om-feature-machine">
          <span>How this feeds the machine</span>
          <h2>Power stays in the background.</h2>
          <p>
            This page keeps the full feature available, but the Approval Desk only surfaces what needs owner action.
          </p>

          <div>
            <article><b>Input</b><small>Records enter once.</small></article>
            <article><b>Check</b><small>Churvox looks for gaps.</small></article>
            <article><b>Prepare</b><small>Admin is drafted with context.</small></article>
            <article><b>Approve</b><small>Owner stays in control.</small></article>
          </div>
        </aside>
      </section>
    </section>
  );
}

function receiptTimeFromEntry(entry = {}) {
  const raw = String(entry.id || "").split("-")[0];
  const stamp = Number(raw);

  if (Number.isFinite(stamp) && stamp > 1000000000000) {
    try {
      return new Date(stamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "just now";
    }
  }

  return "just now";
}

function OperatorActionReceipt({ entry }) {
  if (!entry) return null;

  const type = clean(entry.type || "Approved");
  const title = clean(entry.title || "Action");
  const detail = clean(entry.detail || "Churvox recorded the approved action.");

  return (
    <section className="om-action-receipt" data-phase="PHASE_92_OPERATOR_APPROVAL_CONFIRMATION_BOX">
      <div>
        <span>Confirmed</span>
        <h2>Churvox sent it to the Done Log.</h2>
        <p>{title}</p>
      </div>

      <aside>
        <b>{type}</b>
        <small>{receiptTimeFromEntry(entry)}</small>
      </aside>

      <em>{detail}</em>
    </section>
  );
}


function ChurvoxInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator?.standalone === true;

    const ios =
      /iphone|ipad|ipod/i.test(window.navigator?.userAgent || "") &&
      !standalone;

    setIsIos(ios);
    setInstalled(Boolean(standalone));

    if (standalone) {
      setShow(false);
      return;
    }

    const hidden = localStorage.getItem("churvox_install_prompt_hidden") === "1";
    if (ios && !hidden) {
      setShow(true);
    }

    function beforeInstall(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      if (!localStorage.getItem("churvox_install_prompt_hidden")) {
        setShow(true);
      }
    }

    function appInstalled() {
      setInstalled(true);
      setShow(false);
      setDeferredPrompt(null);
      try {
        localStorage.setItem("churvox_install_prompt_hidden", "1");
      } catch {}
    }

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, []);

  async function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch {}
      setDeferredPrompt(null);
      setShow(false);
      return;
    }

    setShow(true);
  }

  function hide() {
    setShow(false);
    try {
      localStorage.setItem("churvox_install_prompt_hidden", "1");
    } catch {}
  }

  if (installed || !show) return null;

  return (
    <section className="om-install-prompt" data-phase="PHASE_96_MOBILE_RESPONSIVE_INSTALLABLE_PWA">
      <div>
        <span>Install Churvox</span>
        <strong>{isIos ? "Add Churvox to your iPhone Home Screen." : "Download Churvox to this device."}</strong>
        <p>
          {isIos
            ? "Tap Share in Safari, then Add to Home Screen. It opens like an app after that."
            : "Install the Churvox app for faster access on Android, desktop and supported browsers."}
        </p>
      </div>

      <div className="om-install-actions">
        {deferredPrompt ? <button type="button" onClick={install}>Install app</button> : null}
        {isIos ? <b>Share → Add to Home Screen</b> : null}
        <button type="button" className="ghost" onClick={hide}>Not now</button>
      </div>
    </section>
  );
}

function phase111bValue(...values) {
  for (const value of values) {
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function phase111bIsInvoiceSlip(slip = {}) {
  const kind = clean(slip.kind).toLowerCase();
  const id = clean(slip.id).toLowerCase();
  const title = clean(slip.title).toLowerCase();
  const eyebrow = clean(slip.eyebrow).toLowerCase();
  const need = clean(slip.need).toLowerCase();
  const prepared = clean(slip.prepared).toLowerCase();
  const combined = [kind, id, title, eyebrow, need, prepared].join(" ");

  const hardJobOnly =
    kind === "job" ||
    kind === "new-job" ||
    kind === "dispatch" ||
    kind === "input";

  if (hardJobOnly && !combined.includes("invoice") && !combined.includes("proof")) {
    return false;
  }

  return (
    kind.includes("invoice") ||
    kind.includes("cashflow") ||
    kind.includes("proof") ||
    id.includes("invoice") ||
    title.includes("invoice") ||
    title.includes("payment") ||
    eyebrow.includes("invoice") ||
    combined.includes("amount due") ||
    combined.includes("due date")
  );
}

function phase111bIsJobSlip(slip = {}) {
  const kind = clean(slip.kind).toLowerCase();
  const title = clean(slip.title).toLowerCase();
  const eyebrow = clean(slip.eyebrow).toLowerCase();

  return (
    kind.includes("job") ||
    kind.includes("input") ||
    kind.includes("dispatch") ||
    kind.includes("worker") ||
    title.includes("job") ||
    title.includes("worker") ||
    eyebrow.includes("job")
  );
}


function phase113Money(value) {
  const raw = clean(value);
  if (!raw) return "Amount to confirm";
  if (raw.includes("$")) return raw;

  const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return raw;

  return `$${parsed.toLocaleString(undefined, {
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function phase113FirstName(value) {
  const name = clean(value, "there");
  return name.split(/\s+/).filter(Boolean)[0] || "there";
}

function phase113ShouldShowInvoiceTemplate(slip = {}) {
  const kind = clean(slip.kind).toLowerCase();
  const id = clean(slip.id).toLowerCase();
  const title = clean(slip.title).toLowerCase();
  const eyebrow = clean(slip.eyebrow).toLowerCase();
  const combined = [kind, id, title, eyebrow].join(" ");

  return (
    kind === "invoice" ||
    kind === "proof" ||
    kind === "cashflow" ||
    id.includes("invoice") ||
    combined.includes("invoice")
  );
}

function phase113InvoiceValues(draft = {}, slip = {}) {
  const client = phase111bValue(
    draft.invoiceClientName,
    draft.clientName,
    draft.customerName,
    slip.clientName,
    "Client"
  );

  const lineItem = phase111bValue(
    draft.invoiceLineItem,
    draft.serviceType,
    draft.title,
    slip.title,
    "Completed work"
  );

  const description = phase111bValue(
    draft.invoiceDescription,
    slip.prepared,
    slip.need,
    `${lineItem} completed for ${client}.`
  );

  const amount = phase113Money(
    phase111bValue(draft.amount, draft.invoice_amount, draft.total, slip.amount)
  );

  const dueDate = phase111bValue(draft.dueDate, draft.payment_due_date, slip.dueDate, "Due date to confirm");
  const issueDate = phase111bValue(draft.issueDate, draft.invoiceDate, slip.issueDate, phase114Today());
  const invoiceNumber = phase114InvoiceNumber(slip, draft);
  const businessName = phase114BusinessName(draft, slip);
  const subject = phase111bValue(draft.invoiceSubject, `${invoiceNumber} from ${businessName}`);

  const emailText = [
    `Hi ${phase113FirstName(client)},`,
    "",
    "Thanks for choosing us. Your invoice is ready for review and payment.",
    "",
    `Invoice: ${invoiceNumber}`,
    `Work completed: ${lineItem}`,
    `Amount due: ${amount}`,
    `Due date: ${dueDate}`,
    "",
    description,
    "",
    "Please use the payment link or bank details shown on the invoice. Reply to this email if anything needs checking.",
    "",
    "Thanks,",
    businessName,
  ].join("\n");

  return {
    client,
    lineItem,
    description,
    amount,
    dueDate,
    issueDate,
    invoiceNumber,
    businessName,
    subject,
    emailText,
  };
}


function phase114InvoiceNumber(slip = {}, draft = {}) {
  const raw = phase111bValue(
    draft.invoiceNumber,
    draft.invoice_number,
    slip.invoiceNumber,
    slip.invoice_number,
    slip.sourceId,
    slip.id
  );
  if (!raw) return `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const cleaned = clean(raw).replace(/^invoices?-?/i, "").replace(/^invoice-?/i, "");
  return cleaned.toUpperCase().startsWith("INV") ? cleaned.toUpperCase() : `INV-${cleaned.toUpperCase()}`;
}

function phase114BusinessName(draft = {}, slip = {}) {
  return phase111bValue(
    draft.businessName,
    draft.companyName,
    draft.business_name,
    slip.businessName,
    slip.business_name,
    "Churvox business"
  );
}

function phase114Today() {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch {
    return "";
  }
}


function phase113InvoiceEmailText(draft = {}, slip = {}) {
  return phase113InvoiceValues(draft, slip).emailText;
}

function phase115BusinessNameFromData(data = {}) {
  const raw = data.raw || {};
  const business = raw.business || raw.company || data.business || data.company || {};
  const user = raw.user || raw.profile || data.user || data.profile || {};
  return phase111bValue(
    business.business_name,
    business.name,
    business.company_name,
    user.business_name,
    user.company_name,
    data.business_name,
    data.company_name,
    "Your business"
  );
}

function phase121InvoiceNumber(slip = {}, draft = {}) {
  const existing = phase111bValue(draft.invoiceNumber, draft.invoice_number, slip.invoiceNumber, slip.invoice_number);
  if (existing && /^INV-\d{4}-\d{3,6}$/i.test(existing)) return existing.toUpperCase();

  const source = phase111bValue(slip.sourceId, slip.id, String(Date.now()));
  const digits = clean(source).replace(/\D/g, "");
  const suffix = (digits.slice(-4) || String(Date.now()).slice(-4)).padStart(4, "0");
  return `INV-${new Date().getFullYear()}-${suffix}`;
}

function phase121BusinessName(dataName = "", draft = {}, slip = {}) {
  return phase111bValue(dataName, draft.businessName, draft.companyName, slip.businessName, "Your business");
}

function phase121AmountRaw(value) {
  const raw = clean(value);
  if (!raw) return "";
  return raw.replace(/^\$/, "");
}

function phase122Number(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function phase122MoneyRaw(value) {
  const parsed = phase122Number(value);
  if (!parsed) return "";
  return parsed.toFixed(2).replace(/\.00$/, "");
}

function phase122GstFromTotal(total, rate) {
  const totalNum = phase122Number(total);
  const rateNum = phase122Number(rate);
  if (!totalNum || !rateNum) return "";
  return (totalNum * rateNum / (100 + rateNum)).toFixed(2);
}

function phase122SubtotalFromTotal(total, gstAmount) {
  const totalNum = phase122Number(total);
  const gstNum = phase122Number(gstAmount);
  if (!totalNum) return "";
  return (totalNum - gstNum).toFixed(2).replace(/\.00$/, "");
}

function phase128AmountOwing(total, paid) {
  const owing = Math.max(0, phase122Number(total) - phase122Number(paid));
  return owing.toFixed(2).replace(/\.00$/, "");
}

function InvoiceTemplateCard({ slip, draft, update, businessLogoUrl = "", businessName = "" }) {
  if (!phase113ShouldShowInvoiceTemplate(slip)) return null;

  const invoice = phase113InvoiceValues({ ...draft, businessName: businessName || draft.businessName }, slip);

  const business = phase111bValue(draft.businessName, businessName, invoice.businessName, "Your business");
  const businessAddress = phase111bValue(draft.businessAddress, draft.business_address, "");
  const businessEmail = phase111bValue(draft.businessEmail, draft.business_email, "");
  const businessPhone = phase111bValue(draft.businessPhone, draft.business_phone, "");
  const gstNumber = phase111bValue(draft.gstNumber, draft.gst_number, "");

  const invoiceNumber = draft.invoiceNumber || phase121InvoiceNumber(slip, draft);
  const issueDate = draft.issueDate || invoice.issueDate || new Date().toISOString().slice(0, 10);
  const dueDate = draft.dueDate || invoice.dueDate || "";
  const reference = phase111bValue(draft.reference, draft.jobReference, draft.jobNumber, "");

  const client = draft.invoiceClientName || draft.clientName || invoice.client || "";
  const clientEmail = draft.invoiceClientEmail || draft.clientEmail || draft.customerEmail || "";
  const clientAddress = phase111bValue(draft.invoiceClientAddress, draft.clientAddress, draft.address, "");

  const lineItem = draft.invoiceLineItem || draft.serviceType || invoice.lineItem || "Work completed";
  const description = draft.invoiceDescription || invoice.description || "";
  const quantity = phase111bValue(draft.quantity, draft.invoiceQuantity, "1");
  const unitPrice = phase121AmountRaw(draft.unitPrice || draft.rate || draft.amount || invoice.amount || "");
  const lineAmount = phase121AmountRaw(draft.amount || draft.lineAmount || invoice.amount || "");

  const subtotal = phase121AmountRaw(draft.subtotal || lineAmount || "");
  const gstRate = phase111bValue(draft.gstRate, draft.taxRate, "15");
  const gstAmount = phase121AmountRaw(draft.gstAmount || draft.taxAmount || "");
  const totalDue = phase121AmountRaw(draft.total || draft.totalDue || lineAmount || "");
  const amountPaid = phase121AmountRaw(draft.amountPaid || draft.paidAmount || "0");
  const amountOwing = phase121AmountRaw(draft.amountOwing || phase128AmountOwing(totalDue || lineAmount, amountPaid));
  const invoiceStatus = draft.invoiceStatus || (phase122Number(amountOwing) > 0 ? "Amount owing" : "Paid");
  const paymentTerms = draft.paymentTerms || "Due on receipt unless agreed otherwise.";
  const paymentNote = draft.paymentNote || "Bank account / payment link goes here. Please pay by the due date.";

  return (
    <section className="om-real-invoice" data-phase="PHASE_130_REAL_INVOICE_LAYOUT">
      <header className="om-real-invoice-top">
        <div className="om-real-invoice-brand">
          <div className="om-real-invoice-brand-top">
            {businessLogoUrl ? <img src={businessLogoUrl} alt="" /> : <i />}
            <input
              value={business}
              onChange={(event) => update("businessName", event.target.value)}
              placeholder="Business name"
              aria-label="Business name"
            />
          </div>

          <textarea
            value={businessAddress}
            onChange={(event) => update("businessAddress", event.target.value)}
            placeholder="Business address"
            aria-label="Business address"
          />

          <div className="om-real-invoice-business-grid">
            <label>
              <span>Business email</span>
              <input
                value={businessEmail}
                onChange={(event) => update("businessEmail", event.target.value)}
                placeholder="hello@yourbusiness.co.nz"
              />
            </label>

            <label>
              <span>Business phone</span>
              <input
                value={businessPhone}
                onChange={(event) => update("businessPhone", event.target.value)}
                placeholder="Phone number"
              />
            </label>

            <label>
              <span>GST / tax number</span>
              <input
                value={gstNumber}
                onChange={(event) => update("gstNumber", event.target.value)}
                placeholder="GST / tax number"
              />
            </label>
          </div>
        </div>

        <aside className="om-real-invoice-meta">
          <strong>INVOICE</strong>

          <label>
            <span>Number</span>
            <input
              value={invoiceNumber}
              onChange={(event) => update("invoiceNumber", event.target.value)}
              placeholder="INV-2026-0001"
            />
          </label>

          <label>
            <span>Issue date</span>
            <input
              value={issueDate}
              onChange={(event) => update("issueDate", event.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </label>

          <label>
            <span>Due date</span>
            <input
              value={dueDate}
              onChange={(event) => update("dueDate", event.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </label>

          <label>
            <span>Reference</span>
            <input
              value={reference}
              onChange={(event) => update("reference", event.target.value)}
              placeholder="Job / PO / reference"
            />
          </label>
        </aside>
      </header>

      <section className="om-real-invoice-billrow">
        <article className="om-real-invoice-billto">
          <h4>Bill to</h4>

          <label>
            <span>Client name</span>
            <input
              value={client}
              onChange={(event) => update("invoiceClientName", event.target.value)}
              placeholder="Client name"
            />
          </label>

          <label>
            <span>Customer email</span>
            <input
              value={clientEmail}
              onChange={(event) => update("invoiceClientEmail", event.target.value)}
              placeholder="customer@email.com"
            />
          </label>

          <label>
            <span>Client address</span>
            <textarea
              value={clientAddress}
              onChange={(event) => update("invoiceClientAddress", event.target.value)}
              placeholder="Client billing address"
            />
          </label>
        </article>

        <article className="om-real-invoice-owing">
          <span>Status</span>
          <strong>{invoiceStatus}</strong>

          <div className="om-real-invoice-owing-grid">
            <div>
              <small>Total invoice</small>
              <b>{phase113Money(totalDue || lineAmount)}</b>
            </div>
            <div>
              <small>Paid</small>
              <b>{phase113Money(amountPaid)}</b>
            </div>
            <div className="amount-owing">
              <small>Amount owing</small>
              <b>{phase113Money(amountOwing)}</b>
            </div>
          </div>
        </article>
      </section>

      <section className="om-real-invoice-table">
        <div className="om-real-invoice-table-head">
          <span>Description</span>
          <span>Qty</span>
          <span>Rate</span>
          <span>Amount</span>
        </div>

        <div className="om-real-invoice-table-row">
          <div className="desc">
            <input
              value={lineItem}
              onChange={(event) => update("invoiceLineItem", event.target.value)}
              placeholder="Line item"
            />
            <textarea
              value={description}
              onChange={(event) => update("invoiceDescription", event.target.value)}
              placeholder="Describe the work completed"
            />
          </div>

          <input
            value={quantity}
            onChange={(event) => update("quantity", event.target.value)}
            placeholder="1"
          />

          <input
            value={unitPrice}
            onChange={(event) => update("unitPrice", event.target.value)}
            placeholder="0.00"
          />

          <input
            value={lineAmount}
            onChange={(event) => update("amount", event.target.value)}
            placeholder="0.00"
          />
        </div>
      </section>

      <section className="om-real-invoice-bottom">
        <article className="om-real-invoice-notes">
          <label>
            <span>Payment terms</span>
            <input
              value={paymentTerms}
              onChange={(event) => update("paymentTerms", event.target.value)}
              placeholder="Due on receipt"
            />
          </label>

          <label>
            <span>Payment details / note</span>
            <textarea
              value={paymentNote}
              onChange={(event) => update("paymentNote", event.target.value)}
              placeholder="Bank account, payment link, or invoice note"
            />
          </label>
        </article>

        <article className="om-real-invoice-totals">
          <label>
            <span>Subtotal</span>
            <input
              value={subtotal}
              onChange={(event) => update("subtotal", event.target.value)}
              placeholder="0.00"
            />
          </label>

          <label>
            <span>GST %</span>
            <input
              value={gstRate}
              onChange={(event) => update("gstRate", event.target.value)}
              placeholder="15"
            />
          </label>

          <label>
            <span>GST amount</span>
            <input
              value={gstAmount}
              onChange={(event) => update("gstAmount", event.target.value)}
              placeholder="0.00"
            />
          </label>

          <label>
            <span>Amount paid</span>
            <input
              value={amountPaid}
              onChange={(event) => update("amountPaid", event.target.value)}
              placeholder="0.00"
            />
          </label>

          <label>
            <span>Total invoice</span>
            <input
              value={totalDue}
              onChange={(event) => update("total", event.target.value)}
              placeholder="0.00"
            />
          </label>

          <div className="om-real-invoice-totalbox">
            <small>Amount owing</small>
            <strong>{phase113Money(amountOwing)}</strong>
          </div>
        </article>
      </section>
    </section>
  );
}


function phase111bJobBriefText(draft = {}, slip = {}) {
  const title = phase111bValue(draft.title, slip.title, "Job input");
  const client = phase111bValue(draft.clientName, draft.invoiceClientName, "Client");
  const address = phase111bValue(draft.address, "Address not confirmed");
  const work = phase111bValue(draft.serviceType, draft.invoiceLineItem, "Work details need owner check");
  const worker = phase111bValue(draft.workerChoice, "Worker not chosen yet");

  return [
    `Job: ${title}`,
    `Client: ${client}`,
    `Site: ${address}`,
    `Work: ${work}`,
    `Worker: ${worker}`,
    "",
    "Churvox checked the job input and prepared it for owner review.",
    "Owner should confirm the job details, choose the worker if needed, then approve."
  ].join("\\n");
}

function JobBriefTemplateCard({ slip, draft, update }) {
  if (!phase111bIsJobSlip(slip) || phase111bIsInvoiceSlip(slip)) return null;

  const title = phase111bValue(draft.title, slip.title, "Job input");
  const client = phase111bValue(draft.clientName, "Client");
  const address = phase111bValue(draft.address, "Address not confirmed");
  const work = phase111bValue(draft.serviceType, draft.invoiceLineItem, "Work details need owner check");
  const worker = phase111bValue(draft.workerChoice, "Choose worker before dispatch");

  return (
    <section className="om-job-brief-template" data-phase="PHASE_112_FIX_JOB_BRIEF_SYNTAX">
      <header>
        <span>AI job brief</span>
        <strong>Ready for owner review</strong>
        <small>Churvox prepares the job clearly before it goes to dispatch, worker assignment or admin prep.</small>
      </header>

      <div className="om-job-brief-grid">
        <article><b>Job</b><strong>{title}</strong></article>
        <article><b>Client</b><strong>{client}</strong></article>
        <article><b>Site</b><strong>{address}</strong></article>
        <article><b>Worker</b><strong>{worker}</strong></article>
      </div>

      <label className="wide">
        Job brief / worker instruction
        <textarea
          value={draft.customerMessage || phase111bJobBriefText(draft, slip)}
          onChange={(event) => update("customerMessage", event.target.value)}
          placeholder="AI-prepared job brief..."
        />
      </label>

      <label className="wide">
        Owner check before approval
        <textarea
          value={draft.ownerNote || ""}
          onChange={(event) => update("ownerNote", event.target.value)}
          placeholder="Add anything the owner wants checked before this goes to the worker or admin..."
        />
      </label>

      <footer>
        <b>Approval rule</b>
        <p>Approving a worker assignment should assign the job, show it in the worker app, create a notification and record it in the Done Log.</p>
      </footer>
    </section>
  );
}


export default function OperatorMachine({ page = "dashboard", setPage, onLogout, data }) {
  const currentPlan = currentPlanKey(data || {});
  const machine = useMemo(() => buildMachine(data || {}), [data]);
  const team = arrayFrom(data?.raw?.team, data?.raw?.workers, data?.team);
  const [activeSlip, setActiveSlip] = useState(null);
  const [outputLog, setOutputLog] = useState([]);
  const [outputStatus, setOutputStatus] = useState("");
  const [showAllApprovals, setShowAllApprovals] = useState(false);

  useEffect(() => {
    syncCheckoutReturnToLocalStorage();
  }, []);

  function go(page) {
    const paths = {
      dashboard: "/dashboard",
      jobs: "/jobs",
      clients: "/clients",
      team: "/team",
      quotes: "/quotes",
      invoices: "/invoices",
      proof: "/proof and pay",
      payroll: "/payroll",
      plans: "/plans",
      settings: "/settings",
    };
    setPage(page);
    window.history.pushState({}, "", paths[page] || "/dashboard");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function openSlip(slip) {
    setOutputStatus("");
    setActiveSlip(slip);
  }

  async function choosePlan(slip) {
    const meta = checkoutMetaForSlip(slip);
    const label = meta.addon_name || meta.plan_name || slip.planName || slip.eyebrow || "Plan";

    try {
      if (slip.kind === "addon") {
        localStorage.setItem("churvox_selected_addon", slip.id || slip.planName || slip.eyebrow);
      } else if (meta.kind === "sms") {
        localStorage.setItem("churvox_selected_sms_pack", String(meta.pack_id || meta.credits || ""));
      } else {
        localStorage.setItem("churvox_plan", meta.plan || normalisePlanName(slip.planName || slip.eyebrow));
        localStorage.setItem("churvox_legacy_plan", meta.legacy_plan || "");
      }
    } catch {
      // ignore local preview storage
    }

    setOutputStatus(`Opening checkout for ${label}...`);

    const basePayload = {
      ...meta,
      id: slip.id,
      item_id: slip.id,
      plan_id: meta.plan,
      selected_plan: meta.plan,
      selectedPlan: meta.plan,
      tier: meta.plan,
      legacyPlan: meta.legacy_plan,
      planName: meta.plan_name,
      addon_id: meta.addon,
      addonName: meta.addon_name,
      amount: meta.price,
      price: meta.price,
      return_url: meta.success_url,
      successUrl: meta.success_url,
      cancelUrl: meta.cancel_url,
    };

    if (meta.kind === "plan" && (slip.trialAvailable || planEntitlementSnapshot(data || {}).trial.canStart)) {
      const trialPayload = {
        plan: meta.plan,
        selected_plan: meta.plan,
        tier: meta.plan,
        legacy_plan: meta.legacy_plan,
        trial_days: 14,
        no_card_required: true,
      };

      let trialError = null;
      for (const path of ["/billing/start-trial", "/billing/start_trial"]) {
        try {
          const result = await apiPost(path, trialPayload);
          const trialEnd =
            result?.trial_ends_at ||
            result?.trial_end_date ||
            result?.data?.trial_ends_at ||
            result?.data?.trial_end_date ||
            new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

          localStorage.setItem("churvox_plan", meta.plan);
          localStorage.setItem("churvox_legacy_plan", meta.legacy_plan || "");
          localStorage.setItem("churvox_plan_status", "trialing");
          localStorage.setItem("churvox_subscription_status", "trialing");
          localStorage.setItem("churvox_trial_ends_at", trialEnd);

          const message = `14-day free trial started on ${meta.plan_name}. No card required.`;
          setOutputStatus(message);
          setOutputLog((current) => [
            {
              id: `${Date.now()}-${slip.id}`,
              type: "Trial started",
              title: meta.plan_name,
              detail: message,
            },
            ...current,
          ].slice(0, 8));
          setActiveSlip(null);
          return;
        } catch (err) {
          trialError = err;
        }
      }

      const message = trialError?.message || "Trial could not be started yet.";
      setOutputStatus(message);
      setOutputLog((current) => [
        {
          id: `${Date.now()}-${slip.id}`,
          type: "Trial start blocked",
          title: meta.plan_name,
          detail: message,
        },
        ...current,
      ].slice(0, 8));
      return;
    }

    const checkoutPaths =
      meta.kind === "sms"
        ? [
            ["/sms/buy-credits", { pack_id: meta.pack_id, pack: meta.pack_id, credits: meta.credits, return_url: meta.success_url }],
            ["/billing/sms/buy-credits", basePayload],
            ["/billing/create-checkout-session", basePayload],
            ["/stripe/create-checkout-session", basePayload],
            ["/billing/stripe/create-checkout-session", basePayload],
          ]
        : meta.kind === "addon"
          ? [
              ["/billing/create-addon-checkout-session", basePayload],
              ["/billing/create-checkout-session", basePayload],
              ["/stripe/create-checkout-session", basePayload],
              ["/billing/stripe/create-checkout-session", basePayload],
            ]
          : [
              ["/billing/create-checkout-session", basePayload],
              ["/stripe/create-checkout-session", basePayload],
              ["/billing/stripe/create-checkout-session", basePayload],
              ["/billing/start-checkout", basePayload],
            ];

    let lastError = null;

    for (const [path, payload] of checkoutPaths) {
      try {
        const result = await apiPost(path, payload);
        const url = checkoutUrlFrom(result);

        if (url) {
          setOutputStatus(`Redirecting to checkout for ${label}...`);
          window.location.href = url;
          return;
        }

        if (meta.kind === "sms" && (result?.new_balance !== undefined || result?.balance !== undefined || result?.message)) {
          const balance = result?.new_balance ?? result?.balance ?? result?.data?.new_balance ?? result?.data?.balance;
          if (balance !== undefined) {
            try { localStorage.setItem("churvox_sms_credits", String(balance)); } catch {}
          }
          const message = result?.message || "SMS credits purchased.";
          setOutputStatus(message);
          setOutputLog((current) => [
            {
              id: `${Date.now()}-${slip.id}`,
              type: "SMS credits",
              title: label,
              detail: message,
            },
            ...current,
          ].slice(0, 8));
          setActiveSlip(null);
          return;
        }

        lastError = new Error(result?.message || `${path} did not return a checkout URL.`);
      } catch (err) {
        lastError = err;
      }
    }

    const message =
      lastError?.message ||
      "Checkout is not ready yet. Check the backend billing route and Stripe price IDs.";

    setOutputStatus(message);
    setOutputLog((current) => [
      {
        id: `${Date.now()}-${slip.id}`,
        type: meta.kind === "sms" ? "SMS checkout blocked" : meta.kind === "addon" ? "Add-on checkout blocked" : "Plan checkout blocked",
        title: label,
        detail: message,
      },
      ...current,
    ].slice(0, 8));
  }


  function saveEdit(slip, draft) {
    setOutputStatus("Edit saved in this Approval Desk session.");
    setOutputLog((current) => [
      {
        id: `${Date.now()}-${slip.id}`,
        type: "Saved edit",
        title: draft.title || slip.title,
        detail: "Owner edited the approval slip before approval.",
      },
      ...current,
    ].slice(0, 8));
  }

  async function approveSlip(slip, draft) {
    setOutputStatus("Saving owner-approved action...");

    if (smsActionRequested(slip, draft) && smsCreditBalance(data || {}) <= 0) {
      const message = "SMS credits required. Churvox saved nothing to SMS because this account has 0 SMS credits. Buy a credit pack first, or change delivery to Save draft only.";
      setOutputStatus(message);
      setOutputLog((current) => [
        {
          id: `${Date.now()}-${slip.id}`,
          type: "SMS blocked",
          title: draft.title || slip.title || "SMS action",
          detail: message,
        },
        ...current,
      ].slice(0, 8));
      return;
    }

    if (slip.kind === "team-member" && String(slip.id || "").startsWith("new-team")) {
      const teamPayload = {
        name: draft.workerName || draft.title || "Team member",
        full_name: draft.workerName || draft.title || "Team member",
        worker_name: draft.workerName || draft.title || "Team member",
        email: draft.workerEmail || "",
        phone: draft.workerPhone || "",
        mobile: draft.workerPhone || "",
        role: draft.workerRole || "worker",
        worker_role: draft.workerRole || "worker",
        region: draft.workerRegion || "",
        area: draft.workerRegion || "",
        notes: draft.ownerNote || "",
      };

      let lastError = null;
      for (const path of ["/team/workers", "/team/workers/", "/team/invite", "/owner/team"]) {
        try {
          const result = await apiPost(path, teamPayload);
          const message = result?.message || "Churvox saved the team member and sent it to the Done Log.";
          setOutputStatus(message);
          setOutputLog((current) => [
            {
              id: `${Date.now()}-${slip.id}`,
              type: "Team member created",
              title: teamPayload.name,
              detail: message,
            },
            ...current,
          ].slice(0, 8));
          setActiveSlip(null);
          return;
        } catch (err) {
          lastError = err;
        }
      }

      const message = lastError?.message || "Team member could not be saved yet.";
      setOutputStatus(message);
      setOutputLog((current) => [
        {
          id: `${Date.now()}-${slip.id}`,
          type: "Team create needs backend check",
          title: teamPayload.name,
          detail: message,
        },
        ...current,
      ].slice(0, 8));
      return;
    }

    if (slip.kind === "quote" && String(slip.id || "").startsWith("new-quote")) {
      const quotePayload = {
        title: draft.title || draft.quoteLineItem || "New quote",
        quote_title: draft.title || draft.quoteLineItem || "New quote",
        client_name: draft.clientName || "",
        customer_name: draft.clientName || "",
        line_item: draft.quoteLineItem || draft.title || "",
        service_type: draft.quoteLineItem || draft.title || "",
        description: draft.quoteDescription || draft.ownerNote || "",
        quote_description: draft.quoteDescription || draft.ownerNote || "",
        amount: draft.amount || "",
        total: draft.amount || "",
        quote_total: draft.amount || "",
        expiry_date: draft.expiryDate || "",
        valid_until: draft.expiryDate || "",
        notes: draft.ownerNote || "",
        status: "draft",
      };

      let lastError = null;
      for (const path of ["/quotes", "/quotes/", "/owner/quotes"]) {
        try {
          const result = await apiPost(path, quotePayload);
          const message = result?.message || "Churvox saved the quote draft and sent it to the Done Log.";
          setOutputStatus(message);
          setOutputLog((current) => [
            {
              id: `${Date.now()}-${slip.id}`,
              type: "Quote draft created",
              title: quotePayload.title,
              detail: message,
            },
            ...current,
          ].slice(0, 8));
          setActiveSlip(null);
          return;
        } catch (err) {
          lastError = err;
        }
      }

      const message = lastError?.message || "Quote draft could not be saved yet.";
      setOutputStatus(message);
      setOutputLog((current) => [
        {
          id: `${Date.now()}-${slip.id}`,
          type: "Quote create needs backend check",
          title: quotePayload.title,
          detail: message,
        },
        ...current,
      ].slice(0, 8));
      return;
    }

    if (slip.kind === "invoice" && String(slip.id || "").startsWith("new-invoice")) {
      const invoicePayload = {
        title: draft.title || draft.invoiceLineItem || "New invoice",
        invoice_title: draft.title || draft.invoiceLineItem || "New invoice",
        client_name: draft.invoiceClientName || draft.clientName || "",
        customer_name: draft.invoiceClientName || draft.clientName || "",
        client_email: draft.invoiceClientEmail || draft.clientEmail || draft.customerEmail || "",
        customer_email: draft.invoiceClientEmail || draft.clientEmail || draft.customerEmail || "",
        invoice_number: draft.invoiceNumber || "",
        issue_date: draft.issueDate || "",
        payment_note: draft.paymentNote || "",
        business_name: draft.businessName || "",
        business_address: draft.businessAddress || "",
        business_email: draft.businessEmail || "",
        business_phone: draft.businessPhone || "",
        gst_number: draft.gstNumber || "",
        reference: draft.reference || "",
        client_address: draft.invoiceClientAddress || draft.clientAddress || draft.address || "",
        quantity: draft.quantity || "",
        unit_price: draft.unitPrice || "",
        subtotal: draft.subtotal || "",
        gst_rate: draft.gstRate || "",
        gst_amount: draft.gstAmount || "",
        tax_rate: draft.gstRate || "",
        tax_amount: draft.gstAmount || "",
        total_due: draft.total || draft.amount || "",
        amount_paid: draft.amountPaid || draft.paidAmount || "",
        amount_owing: draft.amountOwing || "",
        payment_terms: draft.paymentTerms || "",
        invoice_status: draft.invoiceStatus || "",
        client_email: draft.invoiceClientEmail || draft.clientEmail || draft.customerEmail || "",
        customer_email: draft.invoiceClientEmail || draft.clientEmail || draft.customerEmail || "",
        invoice_number: draft.invoiceNumber || "",
        payment_note: draft.paymentNote || "",
        line_item: draft.invoiceLineItem || draft.title || "",
        service_type: draft.invoiceLineItem || draft.title || "",
        description: draft.invoiceDescription || draft.ownerNote || "",
        invoice_description: draft.invoiceDescription || draft.ownerNote || "",
        amount: draft.amount || "",
        total: draft.amount || "",
        invoice_amount: draft.amount || "",
        due_date: draft.dueDate || "",
        payment_due_date: draft.dueDate || "",
        notes: draft.ownerNote || "",
        status: "draft",
      };

      let lastError = null;
      for (const path of ["/invoices", "/invoices/", "/owner/invoices"]) {
        try {
          const result = await apiPost(path, invoicePayload);
          let message = result?.message || "Churvox saved the invoice draft and sent it to the Done Log.";

          try {
            const createdInvoiceId =
              result?.id ||
              result?._id ||
              result?.invoice_id ||
              result?.invoice?.id ||
              result?.invoice?._id ||
              result?.data?.id ||
              result?.data?._id ||
              "";

            const approvalResult = await apiPost("/ai/owner-command/invoice/approve", {
              type: "invoice",
              kind: "invoice",
              source_type: "invoice",
              send_pdf_email: true,
              email_pdf: true,
              source_id: createdInvoiceId,
              title: invoicePayload.title,
              draft: {
                ...draft,
                ...invoicePayload,
                title: invoicePayload.title,
                amount: invoicePayload.amount,
                invoice_amount: invoicePayload.invoice_amount,
                invoiceDescription: invoicePayload.invoice_description,
                customerMessage: draft.customerMessage || invoicePayload.invoice_description,
                dueDate: invoicePayload.due_date,
              },
            });

            message =
              approvalResult?.performed_result?.message ||
              approvalResult?.message ||
              message;
          } catch (approvalErr) {
            message = `${message} Owner approval saved, but invoice email needs backend attention: ${approvalErr.message || approvalErr}`;
          }

          setOutputStatus(message);
          setOutputLog((current) => [
            {
              id: `${Date.now()}-${slip.id}`,
              type: message.toLowerCase().includes("emailed") ? "Invoice emailed" : "Invoice approved",
              title: invoicePayload.title,
              detail: message,
            },
            ...current,
          ].slice(0, 8));
          setActiveSlip(null);
          return;
        } catch (err) {
          lastError = err;
        }
      }

      const message = lastError?.message || "Invoice draft could not be saved yet.";
      setOutputStatus(message);
      setOutputLog((current) => [
        {
          id: `${Date.now()}-${slip.id}`,
          type: "Invoice create needs backend check",
          title: invoicePayload.title,
          detail: message,
        },
        ...current,
      ].slice(0, 8));
      return;
    }

    const payload = {
      type: slip.kind,
      send_pdf_email: slip.kind === "invoice" || slip.kind === "proof" || slip.kind === "cashflow",
      email_pdf: slip.kind === "invoice" || slip.kind === "proof" || slip.kind === "cashflow",
      group: slip.eyebrow,
      title: draft.title || slip.title,
      status: "approved",
      page: slip.kind === "dispatch" ? "jobs" : slip.kind === "quote" ? "quotes" : "invoices",
      source_id: slip.sourceId,
      source_type: slip.kind,
      draft: {
        ...draft,
        invoice_amount: draft.amount || "",
        invoice_description: draft.invoiceDescription || draft.customerMessage || "",
        owner_note: draft.ownerNote || "",
        customer_message: draft.customerMessage || "",
        worker_choice: draft.workerChoice || "",
      },
    };

    const paths =
      slip.kind === "dispatch"
        ? ["/ai/owner-command/dispatch/approve", "/ai/owner-command/approve"]
        : slip.kind === "invoice" || slip.kind === "proof"
          ? ["/ai/owner-command/invoice/approve", "/ai/owner-command/approve"]
          : slip.kind === "quote"
            ? ["/ai/owner-command/quote/approve", "/ai/owner-command/approve"]
            : slip.kind === "cashflow"
              ? ["/ai/owner-command/cashflow/approve", "/ai/owner-command/approve"]
              : ["/ai/owner-command/approve"];

    let lastError = null;
    for (const path of paths) {
      try {
        const result = await apiPost(path, payload);
        const message = result?.performed_result?.message || result?.message || "Approved and saved to Churvox.";
        setOutputStatus(message);
        setOutputLog((current) => [
          {
            id: `${Date.now()}-${slip.id}`,
            type: "Approved",
            title: draft.title || slip.title,
            detail: message,
          },
          ...current,
        ].slice(0, 8));
        setActiveSlip(null);
        return;
      } catch (err) {
        lastError = err;
      }
    }

    const message = lastError?.message || "Backend did not accept this approval yet.";
    setOutputStatus(message);
    setOutputLog((current) => [
      {
        id: `${Date.now()}-${slip.id}`,
        type: "Needs backend check",
        title: draft.title || slip.title,
        detail: message,
      },
      ...current,
    ].slice(0, 8));
  }

  const visibleApprovals = showAllApprovals ? machine.approval.slice(0, 24) : machine.approval.slice(0, 5);
  const hiddenApprovalCount = Math.max(machine.approval.length - visibleApprovals.length, 0);

  const dashboardAdvancedTools = [
    {
      id: "advanced-customer-links",
      kind: "settings",
      eyebrow: "Advanced tool",
      title: "Customer links",
      need: "Customer portal links and proof links stay in the background until the owner needs to share or review them.",
      customerMessage: "Churvox can prepare customer-facing links for jobs, quotes, invoices and proof, then the owner approves what gets shared.",
      ownerNote: "Use this when customer access, proof links or portal sharing needs owner review.",
    },
    {
      id: "advanced-growth-loop",
      kind: "cashflow",
      eyebrow: "Advanced tool",
      title: "Growth loop",
      need: "Reviews, referrals and follow-ups can be prepared after completed work.",
      customerMessage: "Churvox can prepare review requests, referral nudges and follow-up wording from real completed job context.",
      ownerNote: "Approval-first. Nothing is sent unless the owner approves.",
    },
    {
      id: "advanced-dispatch",
      kind: "dispatch",
      eyebrow: "Advanced tool",
      title: "Assign crew",
      need: "Unassigned jobs and worker-fit checks can become owner-approved dispatch slips.",
      customerMessage: "Churvox can recommend worker assignment using job context, workload and missing worker checks.",
      ownerNote: "Use this when jobs need workers or schedule attention.",
    },
    {
      id: "advanced-margin-guard",
      kind: "invoice",
      eyebrow: "Advanced tool",
      title: "Margin guard",
      need: "Churvox can flag missing amounts, weak pricing context and invoice risks before approval.",
      customerMessage: "Churvox can prepare invoice checks so the owner sees missing amounts, job proof and pricing notes before approving.",
      ownerNote: "This protects pricing and cashflow. Owner approves before invoice action.",
    },
    {
      id: "advanced-work-packs",
      kind: "proof",
      eyebrow: "Advanced tool",
      title: "Work packs",
      need: "Proof, job notes and invoice wording can be bundled into a clean owner-approved pack.",
      customerMessage: "Churvox can prepare job proof, notes, photos and invoice wording into one reviewable work pack.",
      ownerNote: "Useful for proof and pay admin and customer-ready records.",
    },
  ];

  const nav = [
    ["Dashboard", "dashboard"],
    ["Work", "jobs"],
    ["Clients", "clients"],
    ["Crew", "team"],
    ["Quotes", "quotes"],
    ["Invoices", "invoices"],
    ["Proof & Pay", "proof"],
    ["Payroll", "payroll"],
    ["Plans", "plans"],
    ["Settings", "settings"],
  ];

  return (
    <main className="om-shell" data-render-deploy={churvoxRenderDeployMarker}>
      <aside className="om-nav">
        <button type="button" className="om-brand" onClick={() => go("dashboard")}>
          <i><b /></i>
          <span>
            <strong>Churvox</strong>
            <small>Approval Desk</small>
          </span>
        </button>

        <nav>
          {nav.map(([label, navPage]) => (
            <button type="button" className={navPage === page ? "active" : ""} key={label} onClick={() => go(navPage)}>
              <span>{label}</span>
              {!planAllows(currentPlan, requiredPlanForPage(navPage)) ? <small>Locked</small> : null}
            </button>
          ))}
        </nav>

        <button type="button" className="om-logout" onClick={onLogout}>Log out</button>
      </aside>

      <section className="om-main">
        <CommandSuite
          page={page}
          setPage={setPage}
          data={data}
          machine={machine}
          planName={planLabel(currentPlan)}
          visibleApprovals={visibleApprovals}
          hiddenApprovalCount={hiddenApprovalCount}
          showAllApprovals={showAllApprovals}
          setShowAllApprovals={setShowAllApprovals}
          onOpenSlip={openSlip}
        />
      </section>

      <ChurvoxInstallPrompt />

      <WorkSlip
        slip={activeSlip}
        team={team}
        outputStatus={outputStatus}
        smsCredits={smsCreditBalance(data || {})}
        businessLogoUrl={businessLogoFromData(data || {})}
        businessName={phase115BusinessNameFromData(data || {})}
        onClose={() => setActiveSlip(null)}
        onSave={saveEdit}
        onApprove={approveSlip}
        onChoosePlan={choosePlan}
      />
    </main>
  );
}

function OperatorAuth({ authMode, setAuthMode, onLogin }) {
  const signup = authMode === "signup";
  const [form, setForm] = useState({ name: "", business_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
            email: form.email,word: form.password,
          })
        : await authRequest("/auth/login", {
            email: form.email,word: form.password,
          });

      saveSession(payload);

      if (signup) {
        try {
          const result = await apiPost("/billing/start-trial", {
            plan: "operator",
            selected_plan: "operator",
            tier: "operator",
            legacy_plan: "pro",
            trial_days: 14,
            no_card_required: true,
          });

          const trialEnd =
            result?.trial_ends_at ||
            result?.trial_end_date ||
            result?.data?.trial_ends_at ||
            result?.data?.trial_end_date ||
            new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

          localStorage.setItem("churvox_plan", "operator");
          localStorage.setItem("churvox_legacy_plan", "pro");
          localStorage.setItem("churvox_plan_status", "trialing");
          localStorage.setItem("churvox_subscription_status", "trialing");
          localStorage.setItem("churvox_trial_ends_at", trialEnd);
        } catch {
          // Registration still succeeds; billing guard can ask the owner to start the trial from Plans.
        }
      }

      onLogin();
    } catch (err) {
      setError(err.message || "Could not open Churvox");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="om-auth om-command-auth" id="login">
      <span>{signup ? "14-day free trial" : "Secure owner login"}</span>
      <h2>{signup ? "Create your Command Desk" : "Enter Command Desk"}</h2>
      <section className="om-auth-command-strip" data-phase="PHASE_224_REAL_AUTH_STRIP">
        <strong>{signup ? "No card needed. Trial starts after signup." : "Welcome back to Churvox."}</strong>
        <p>{signup ? "Churvox prepares the admin. You approve the next move." : "Open your AI Operator workspace."}</p>
        <div>
          <span>Work in</span>
          <b>›</b>
          <span>Admin prepared</span>
          <b>›</b>
          <span>Owner approves</span>
        </div>
      </section>

      {error ? <p className="om-auth-error">{error}</p> : null}

      <form onSubmit={submit}>
        {signup ? (
          <>
            <label>Your name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label>Business name<input value={form.business_name} onChange={(event) => update("business_name", event.target.value)} /></label>
          </>
        ) : null}
        <label>Email<input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
        <label>Password<input required type="password" value={form.password} onChange={(event) => update("password", event.target.value)} /></label>
        <button type="submit" disabled={busy}>{busy ? "Opening..." : signup ? "Start 14-day trial" : "Open Command Desk"}</button>
      </form>

      <button
        type="button"
        className="om-auth-switch"
        onClick={() => {
          setError("");
          setAuthMode(signup ? "login" : "signup");
        }}
      >
        {signup ? "Already have an account? Log in" : "New here? Start 14-day trial"}
      </button>
    </section>
  );
}


function OperatorPublicTour({ open, onClose, onSignup }) {
  const [step, setStep] = useState(0);

  const steps = [
    ["01", "Work comes in", "A job, quote, client request, worker update or invoice lands in Churvox.", "Churvox captures the details."],
    ["02", "Churvox prepares", "AI checks client, area, crew, proof, price source and follow-up risk.", "The admin is prepared."],
    ["03", "Owner approves", "The owner opens one clean approval slip, reviews it, edits if needed, then approves.", "Nothing risky happens blindly."],
    ["04", "Everything updates", "Work, crew, proof, invoice, payment and history stay tied together.", "The business keeps moving."],
  ];

  if (!open) return null;

  const active = steps[step] || steps[0];

  return (
    <section className="om-public-tour-backdrop" onClick={onClose}>
      <article className="om-public-tour-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <span>See how Churvox works</span>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <main>
          <aside>
            <b>{active[0]}</b>
            <h2>{active[1]}</h2>
            <p>{active[2]}</p>
          </aside>

          <section>
            <span>Churvox output</span>
            <strong>{active[3]}</strong>
            <p>Public tour first. Real trial and saved business data start after signup.</p>
          </section>
        </main>

        <nav>
          {steps.map((item, index) => (
            <button
              type="button"
              key={item[0]}
              className={index === step ? "active" : ""}
              onClick={() => setStep(index)}
            >
              <b>{item[0]}</b>
              <span>{item[1]}</span>
            </button>
          ))}
        </nav>

        <footer>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
          {step > 0 ? <button type="button" className="ghost" onClick={() => setStep(step - 1)}>Back</button> : null}
          {step < steps.length - 1 ? (
            <button type="button" onClick={() => setStep(step + 1)}>Next</button>
          ) : (
            <button type="button" onClick={onSignup}>Start 14-day trial</button>
          )}
        </footer>
      </article>
    </section>
  );
}

export function OperatorLanding({ authMode, setAuthMode, onLogin }) {
  const prices = [
    ["Start", "$39", "For owner operators"],
    ["Crew", "$89", "For small teams"],
    ["Operator", "$149", "Most Popular"],
    ["Command", "$299", "For growing crews"],
  ];

  const [tourOpen, setTourOpen] = useState(false);

  function signup() {
    setAuthMode("signup");
    setTimeout(() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  return (
    <main className="om-public om-command-public" id="top">
      <OperatorPublicTour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        onSignup={() => {
          setTourOpen(false);
          signup();
        }}
      />
      <header className="om-public-nav">
        <a href="#top" className="om-public-brand">
          <i><b /></i>
          <span><strong>Churvox</strong><small>Approval Desk</small></span>
        </a>
        <nav>
          <a href="#machine">How it works</a>
          <a href="#pricing">Pricing</a>
          <button type="button" className="om-public-tour-nav-button" onClick={() => setTourOpen(true)}>Tour</button>
          <a href="#login">Login</a>
        </nav>
      </header>

      <section className="om-public-hero">
        <div>
          <span>Churvox does the admin. You approve.</span>
          <h1>Turn trade work into owner-approved admin without the dashboard mess.</h1>
          <p>
            Work goes in. Churvox checks it, prepares invoices, reminders, quote follow-ups,
            worker assignments and proof and pay admin. You approve, edit, or fix only what matters.
          </p>
          <div className="om-public-actions">
            <button type="button" className="om-public-tour-cta" onClick={() => setTourOpen(true)}>See how it works</button>
            <button type="button" onClick={signup}>Start 14-day trial</button>
            <a href="#pricing">View pricing</a>
          </div>
        </div>

        <section className="om-public-machine" id="machine">
          {["Work In", "AI Preparing", "Approval Desk", "Done Log"].map((label, index) => (
            <article key={label} className={index === 2 ? "active" : ""}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{label}</strong>
              <small>
                {index === 0
                  ? "Requests, jobs, proof"
                  : index === 1
                    ? "Churvox checks gaps"
                    : index === 2
                      ? "Owner approves"
                      : "Actions recorded"}
              </small>
            </article>
          ))}
        </section>
      </section>

      <section className="om-public-proof">
        <article>
          <span>Not a normal dashboard</span>
          <strong>Complex admin feeds one simple approval desk.</strong>
          <p>Jobs, clients, team, quotes, invoices, proof and pay, payroll, plans and settings stay powerful. The first screen only shows the work that needs owner action.</p>
        </article>
        <article>
          <span>Approval-first AI</span>
          <strong>Nothing risky happens blindly.</strong>
          <p>Churvox can prepare the admin, but owner approval stays in front of messages, invoices, pricing, payroll and accounting actions.</p>
        </article>
      </section>

      <section className="om-public-pricing" id="pricing">
        <header>
          <span>Pricing</span>
          <h2>Easy to understand. Built around AI Operator Actions.</h2>
        </header>
        <div>
          {prices.map(([name, price, body]) => (
            <article key={name} className={name === "Operator" ? "featured" : ""}>
              <span>{body}</span>
              <h3>{name}</h3>
              <strong>{price}<small>/month + GST</small></strong>
              <button type="button" onClick={signup}>{name === "Operator" ? "Choose Operator" : `Choose ${name}`}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="om-public-access" data-phase="PHASE_100_FILL_PUBLIC_ACCESS_EMPTY_BOX">
        <div className="om-public-access-copy">
          <span>Secure workspace</span>
          <h2>Open Churvox.</h2>
          <p>Start a trial or log in. Churvox will keep the powerful admin in the background and show the owner what needs approval.</p>

          <section className="om-public-access-board" aria-label="Churvox trial setup">
            <article>
              <b>14 days</b>
              <strong>Free trial</strong>
              <small>No card needed to start.</small>
            </article>

            <article>
              <b>AI</b>
              <strong>Prepares admin</strong>
              <small>Jobs, quotes, invoices, reminders and proof.</small>
            </article>

            <article>
              <b>Owner</b>
              <strong>Approves first</strong>
              <small>No blind sends, pricing, payroll or MYOB changes.</small>
            </article>

            <article>
              <b>SMS</b>
              <strong>Credit locked</strong>
              <small>Texts only send after SMS credits are bought.</small>
            </article>
          </section>
        </div>

        <OperatorAuth authMode={authMode} setAuthMode={setAuthMode} onLogin={onLogin} />
      </section>
    </main>
  );
}
