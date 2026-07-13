import API_BASE from "../lib/apiBase";

export const BACKEND_COMMAND_EVENT = "churvox-backend-command-slip";
export const COMMAND_FORCE_REFRESH_BUILD = "churvox-command-force-refresh-v4-20260713";
const SAFE_RESULT = "Owner approval recorded. Nothing was sent, synced, charged or changed.";
const COMMAND_QUEUE_CACHE_KEY = "churvox:command:confirmed-queue:v1";
const COMMAND_QUEUE_CACHE_MAX_AGE_MS = 1000 * 60 * 15;

function host() {
  const configured = String(API_BASE || "").replace(/\/$/, "");
  if (configured) return configured;
  // Local, preview and proxied deployments use the frontend /api bridge.
  // An empty build-time API_BASE must never make Command silently unavailable.
  return typeof window !== "undefined" ? String(window.location.origin || "").replace(/\/$/, "") : "";
}

function token() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}

function authHeaders({ json = true } = {}) {
  const t = token();
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, attempts = 2) {
  let lastError = null;
  const { timeoutMs = 8000, ...requestOptions } = options || {};
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(url, { ...requestOptions, signal: controller?.signal });
      const transient = response.status === 408 || response.status === 429 || response.status >= 500;
      if (!transient || attempt === attempts) return response;
      await wait(250 * attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      await wait(250 * attempt);
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }
  throw lastError || new Error("Live Churvox request failed.");
}

function clean(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function textList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clean(typeof item === "object" ? item?.text || item?.detail || item?.value || JSON.stringify(item) : item)).filter(Boolean);
}

function approvalFields(fields = []) {
  if (!Array.isArray(fields)) return [];
  return fields.slice(0, 24).map((field, index) => ({
    label: clean(field?.label || field?.name || field?.key, `Field ${index + 1}`).slice(0, 120),
    value: clean(field?.value, "").slice(0, 2400),
    long: Boolean(field?.long),
  }));
}

function finalActionsForSlip(slip = {}) {
  const supplied = Array.isArray(slip?.payload?.actions) ? slip.payload.actions : [];
  const finalActions = supplied.filter((action) => !/\bedit\b/i.test(clean(action)));
  return finalActions.length ? finalActions : ["Approve record", "Snooze", "Ignore"];
}

function reasoningForSlip(slip = {}) {
  const payload = slip?.payload && typeof slip.payload === "object" ? slip.payload : {};
  const evidence = textList(payload.evidence || slip.evidence);
  const missing = textList(payload.missing || slip.missing);
  const confidence = payload.confidence && typeof payload.confidence === "object" ? payload.confidence : {};
  const rawScore = Number(confidence.score ?? payload.confidence_score ?? slip.confidence_score);
  const score = Number.isFinite(rawScore) && rawScore > 0 ? Math.round((rawScore <= 1 ? rawScore * 100 : rawScore)) : 0;
  const reasons = textList(confidence.why || payload.confidence_reasons);
  const question = clean(payload.owner_question || slip.owner_question || slip.why || slip.need, "What would you like Churvox to do with this prepared draft?");
  const parts = [];
  if (evidence.length) parts.push(`Evidence used: ${evidence.slice(0, 4).join(" · ")}.`);
  if (score) parts.push(`Confidence: ${score}%.`);
  if (reasons.length) parts.push(`Why: ${reasons.slice(0, 3).join(" · ")}.`);
  parts.push(missing.length ? `Owner must check: ${missing.slice(0, 4).join(" · ")}.` : "No critical fact is marked missing, but every field remains editable.");
  parts.push(`Owner question: ${question}`);
  return { evidence, missing, score, reasons, question, summary: parts.join(" ") };
}

function trayForSlip(slip = {}) {
  const text = clean(`${slip.source_type || ""} ${slip.action_type || ""} ${slip.tray || ""}`).toLowerCase();
  if (/accounting|gst|tax|xero|myob|ledger|export/.test(text) || /account/.test(text)) return "Accounting";
  if (/invoice|quote|payment|money/.test(text)) return "Money";
  if (/job|work|booking|schedule|recurring/.test(text)) return "Bookings";
  if (/staff|worker|payroll|team|timer|hours/.test(text)) return "Staff";
  if (/client|customer|message|inbox|note|memory/.test(text)) return "Clients";
  if (/quality|proof|photo/.test(text)) return "Quality";
  if (/operation|automation|branding|setup/.test(text)) return "Operations";
  return "Command";
}

function roleForTray(tray) {
  if (tray === "Accounting") return "Accountant";
  if (tray === "Money") return "Bookkeeper";
  if (tray === "Bookings") return "Receptionist";
  if (tray === "Staff") return "Payroll Clerk";
  if (tray === "Clients") return "Client Memory";
  if (tray === "Quality") return "Quality Checker";
  if (tray === "Operations") return "Operations Manager";
  return "Office Manager";
}

function levelForSlip(slip = {}) {
  const raw = clean(slip.urgency || slip.level || slip.priority || "Owner review").toLowerCase();
  if (/urgent|top|high/.test(raw)) return "Top priority";
  if (/low/.test(raw)) return "Low risk";
  if (/account/.test(raw)) return "Accounting check";
  if (/pattern/.test(raw)) return "Pattern";
  return "Needs check";
}

export function mapCommandSlipToDecision(slip = {}, index = 0) {
  const tray = trayForSlip(slip);
  const id = clean(slip.id || slip._id || `command-slip-${index}`);
  const form = slip?.payload?.prepared_form || slip?.payload?.form || null;
  const willDo = Array.isArray(slip?.payload?.will_do) ? slip.payload.will_do : [];
  const reasoning = reasoningForSlip(slip);
  const finding = clean(slip.found || slip.happened || slip.summary, "Churvox found something that may need owner review.");
  return {
    id: `command-slip-${id}`,
    tray,
    roleName: clean(slip.roleName || slip.role_name || slip.office_role || slip?.payload?.office_role, roleForTray(tray)),
    level: levelForSlip(slip),
    title: clean(slip.title, "Command decision"),
    happened: `${finding} ${reasoning.summary}`.trim(),
    checked: reasoning.evidence.length ? reasoning.evidence.slice(0, 5) : [
      clean(slip.source_type || slip.sourceType, "backend command slip"),
      clean(slip.action_type || slip.actionType, "owner review"),
      "business scoped",
      "owner approval controlled",
    ].filter(Boolean).slice(0, 5),
    prepared: clean(slip.prepared, "Prepared for owner review. Nothing has been sent, synced, charged or changed."),
    need: reasoning.question,
    actions: finalActionsForSlip(slip),
    form,
    willDo,
    reasoning,
    raw: {
      ...slip,
      source: "backend_command_slip",
      command_slip_id: id,
      prepared_form: form,
      will_do: willDo,
      reasoning,
      prepared_only: true,
      owner_review_only: true,
      no_auto_send: true,
      no_auto_sync: true,
      no_auto_charge: true,
      no_auto_record_change: true,
    },
  };
}

export function mapBackendCommandAudit(item = {}, index = 0) {
  return {
    id: clean(item.id || `${item.slip_id || "audit"}-${item.at || index}`),
    status: clean(item.action || item.status, "recorded"),
    action: clean(item.action, "recorded"),
    title: clean(item.title, "Command slip"),
    detail: clean(item.note || item.detail, "Backend Command audit record."),
    safety: clean(item.safety, SAFE_RESULT),
    at: clean(item.at || item.created_at, ""),
    slipId: clean(item.slip_id, ""),
    source: "backend_command_audit",
  };
}

export function readCachedBackendCommandDecisions(maxAgeMs = COMMAND_QUEUE_CACHE_MAX_AGE_MS) {
  try {
    const raw = localStorage.getItem(COMMAND_QUEUE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const at = Number(parsed?.at || 0);
    const payload = parsed?.payload;
    if (!at || Date.now() - at > maxAgeMs || !payload || !Array.isArray(payload.decisions)) return null;
    return { ...payload, source: payload.source || "backend-command-cache", cached: true, cachedAt: new Date(at).toISOString() };
  } catch { return null; }
}

function cacheBackendCommandDecisions(payload) {
  if (!payload || !Array.isArray(payload.decisions)) return;
  try { localStorage.setItem(COMMAND_QUEUE_CACHE_KEY, JSON.stringify({ at: Date.now(), payload })); } catch {}
}

export async function fetchBackendCommandDecisions({ timeoutMs = 3000, attempts = 1, force = false } = {}) {
  const base = host();
  if (!base) return { source: "command-unavailable", decisions: [], message: "No API host" };
  const path = force ? `/api/command/slips?refresh=${Date.now()}` : "/api/command/slips";
  const headers = {
    ...authHeaders({ json: false }),
    ...(force ? { "X-Churvox-Command-Refresh": COMMAND_FORCE_REFRESH_BUILD } : {}),
  };
  const response = await fetchWithRetry(`${base}${path}`, { credentials: "include", headers, timeoutMs }, attempts);
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403 || response.status === 404) return { source: "command-unavailable", decisions: [], message: body?.detail || "Command backend unavailable" };
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Command slips failed ${response.status}`);
  const slips = Array.isArray(body?.slips) ? body.slips : [];
  const payload = { source: slips.length ? "backend-command" : "backend-command-clear", decisions: slips.map(mapCommandSlipToDecision), message: body?.safety || SAFE_RESULT, fetchedAt: new Date().toISOString() };
  cacheBackendCommandDecisions(payload);
  return payload;
}

export async function fetchBackendCommandAudit() {
  const base = host();
  if (!base) return { source: "command-audit-unavailable", audit: [], message: "No API host" };
  const response = await fetchWithRetry(`${base}/api/command/audit`, { credentials: "include", headers: authHeaders({ json: false }), timeoutMs: 5000 }, 1);
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403 || response.status === 404) return { source: "command-audit-unavailable", audit: [], message: body?.detail || "Command audit unavailable" };
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Command audit failed ${response.status}`);
  const audit = Array.isArray(body?.audit) ? body.audit : [];
  return { source: audit.length ? "backend-command-audit" : "backend-command-audit-clear", audit: audit.map(mapBackendCommandAudit), message: body?.safety || SAFE_RESULT, fetchedAt: new Date().toISOString() };
}

export async function runBackendOfficeEngineScan() {
  const base = host();
  if (!base) return { source: "backend-office-engine-unavailable", createdCount: 0, existingCount: 0, message: "No API host" };
  const response = await fetchWithRetry(`${base}/api/command/scan`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({ source: "owner_workspace_load", prepared_only: true, owner_review_only: true }),
    timeoutMs: 15000,
  }, 1);
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403 || response.status === 404) return { source: "backend-office-engine-unavailable", createdCount: 0, existingCount: 0, message: body?.detail || "Office engine unavailable" };
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Office engine scan failed ${response.status}`);
  try { window.dispatchEvent(new CustomEvent(BACKEND_COMMAND_EVENT, { detail: body })); } catch {}
  return {
    source: body?.source || "backend-office-engine",
    slips: Array.isArray(body?.slips) ? body.slips : [],
    existing: Array.isArray(body?.existing) ? body.existing : [],
    createdCount: Number(body?.created_count || 0),
    existingCount: Number(body?.existing_count || 0),
    roleCounts: body?.role_counts || {},
    scanComplete: body?.scan_complete !== false,
    scanErrors: Array.isArray(body?.scan_errors) ? body.scan_errors : [],
    guard: body?.guard || "",
    message: body?.message || body?.safety || SAFE_RESULT,
  };
}

export async function createBackendCommandSlip({ area = "office", record = [], action = "Prepare Command card", slip = {} } = {}) {
  const base = host();
  if (!base) throw new Error("Command backend unavailable");
  const recordTitle = record?.[1] || record?.[0] || "selected record";
  const status = record?.[2] || "Prepared-only";
  const detail = record?.[3] || "Prepared for owner review.";
  const payload = {
    source_type: slip.source_type || area,
    action_type: slip.action_type || action,
    sourceType: slip.source_type || area,
    actionType: slip.action_type || action,
    source_id: slip.source_id || `manual-${Date.now()}`,
    title: slip.title || `${labelForArea(area)}: ${recordTitle}`,
    found: slip.found || `${status}. ${detail}`,
    prepared: slip.prepared || `${action} prepared this backend Command slip. Nothing was sent, synced, charged or changed.`,
    why: slip.why || "Owner approval is required before any real send, sync, charge or record change.",
    urgency: slip.urgency || "Owner review",
    payload: {
      area,
      record,
      action,
      prepared_only: true,
      owner_review_only: true,
      no_auto_send: true,
      no_auto_sync: true,
      no_auto_charge: true,
      no_auto_record_change: true,
      ...(slip.payload || {}),
    },
  };
  const response = await fetch(`${base}/api/command/slips`, { method: "POST", credentials: "include", headers: authHeaders(), body: JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Command slip failed ${response.status}`);
  try { window.dispatchEvent(new CustomEvent(BACKEND_COMMAND_EVENT, { detail: body })); } catch {}
  return body;
}

export async function createBackendWorkerPaymentRequest({ title = "Worker payment request", amount = "", invoice = "", customer = "", paymentLink = "" } = {}) {
  const base = host();
  if (!base) throw new Error("Command backend unavailable");
  const response = await fetch(`${base}/api/command/worker-payment-request`, {
    method: "POST", credentials: "include", headers: authHeaders(), body: JSON.stringify({ title, job_title: title, amount, amount_due: amount, invoice, invoice_number: invoice, customer, customer_name: customer, payment_link: paymentLink, prepared_only: true, owner_review_only: true }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Worker payment request failed ${response.status}`);
  try { window.dispatchEvent(new CustomEvent(BACKEND_COMMAND_EVENT, { detail: body })); } catch {}
  return body;
}

export async function createBackendWorkerUpdateRequest({ title = "Worker update", update = "", updateType = "Worker update", status = "Owner review" } = {}) {
  const base = host();
  if (!base) throw new Error("Command backend unavailable");
  const response = await fetch(`${base}/api/command/worker-update-request`, {
    method: "POST", credentials: "include", headers: authHeaders(), body: JSON.stringify({ title, job_title: title, update, note: update, message: update, update_type: updateType, status, prepared_only: true, owner_review_only: true }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Worker update request failed ${response.status}`);
  try { window.dispatchEvent(new CustomEvent(BACKEND_COMMAND_EVENT, { detail: body })); } catch {}
  return body;
}

export async function recordBackendCommandDecision(decision, action, detail = {}) {
  const base = host();
  const slipId = clean(decision?.raw?.command_slip_id || "");
  if (!base || !slipId) return { success: true, localOnly: true, message: SAFE_RESULT };
  const approval = typeof detail === "string" ? { note: detail } : (detail || {});
  const note = clean(approval.note || approval.ownerNote, SAFE_RESULT);
  const normalized = clean(action, "Approve record").toLowerCase();
  const endpoint = normalized.includes("snooze") ? "snooze" : normalized.includes("ignore") || normalized.includes("park") ? "ignore" : "approve";
  const requestBody = endpoint === "approve" ? {
    action,
    note,
    owner_note: note,
    form_title: clean(approval.formTitle || approval.form_title, "Owner approval form"),
    fields: approvalFields(approval.fields),
    prepared_only: true,
    owner_review_only: true,
    no_auto_send: true,
    no_auto_sync: true,
    no_auto_charge: true,
    no_auto_record_change: true,
  } : { action, note, hours: 24 };
  const response = await fetch(`${base}/api/command/slips/${encodeURIComponent(slipId)}/${endpoint}`, { method: "POST", credentials: "include", headers: authHeaders(), body: JSON.stringify(requestBody) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Command decision failed ${response.status}`);
  return body;
}

function labelForArea(area = "office") {
  const key = String(area || "office").toLowerCase();
  if (["accounting", "xero", "myob"].includes(key)) return "Accounting";
  if (["money", "quotes", "invoices", "integrations"].includes(key)) return "Money";
  if (["work", "jobs", "schedule", "booking"].includes(key)) return "Work";
  if (["clients", "messages", "client_memory"].includes(key)) return "Client";
  if (["staff", "worker", "payroll"].includes(key)) return "Staff";
  if (["automation", "branding", "operations", "settings"].includes(key)) return "Operations";
  return "Office";
}
