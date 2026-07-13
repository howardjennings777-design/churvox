import API_BASE from "../lib/apiBase";

export const WORKER_LIVE_READ_BUILD = "churvox-worker-active-jobs-only-v15-20260713";
if (typeof window !== "undefined") window.__CHURVOX_WORKER_LIVE_READ_BUILD__ = WORKER_LIVE_READ_BUILD;

function host() {
  return String(API_BASE || "").replace(/\/$/, "");
}

function token() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function authHeaders({ json = true } = {}) {
  const t = token();
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value, fallback = "") {
  return String(value || fallback || "").trim();
}

function first(item = {}, keys = [], fallback = "") {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && clean(value)) return clean(value);
  }
  return fallback;
}

function money(value, fallback = "") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "number") return value ? `$${value.toLocaleString()}` : "0";
  const raw = clean(value, fallback);
  if (!raw) return fallback;
  return raw.startsWith("$") || raw.includes("invoice") || raw.includes("quote") ? raw : raw;
}

function shortWhen(value, fallback = "Live") {
  const raw = clean(value);
  if (!raw) return fallback;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return raw.length > 22 ? `${raw.slice(0, 22)}…` : raw;
}

function trayFor(item = {}) {
  const source = clean(item.tray || item.department || item.record_type || item.kind || item.type).toLowerCase();
  if (source.includes("invoice") || source.includes("quote") || source.includes("payment") || source.includes("money")) return "Money";
  if (source.includes("job") || source.includes("booking") || source.includes("schedule") || source.includes("recurring")) return "Bookings";
  if (source.includes("worker") || source.includes("staff") || source.includes("team") || source.includes("payroll")) return "Staff";
  if (source.includes("client") || source.includes("customer") || source.includes("message")) return "Clients";
  if (source.includes("proof") || source.includes("quality") || source.includes("record")) return "Quality";
  if (source.includes("operation") || source.includes("capacity") || source.includes("profit") || source.includes("stock")) return "Operations";
  return "Command";
}

function priorityFor(item = {}) {
  const raw = clean(item.priority || item.level || item.severity || "medium").toLowerCase();
  if (raw.includes("high") || raw.includes("urgent")) return "Top priority";
  if (raw.includes("low")) return "Low risk";
  if (raw.includes("pattern")) return "Pattern";
  return "Needs check";
}

export function mapBrainActionToDecision(item = {}, index = 0) {
  const title = clean(item.problem || item.title || item.name, "Owner decision needed");
  const summary = clean(item.why || item.summary || item.suggestion || item.detail, "Churvox prepared this for owner review.");
  const prepared = clean(item.prepared || item.prepared_work || item.suggestion || item.next_step, "Prepared for Command review. Nothing has been sent or changed.");
  const ownerOptions = asArray(item.owner_options || item.actions || item.options).map((option) => clean(option)).filter(Boolean);
  return {
    id: clean(item.id || item.action_id || item._id || `brain-${index}`),
    tray: trayFor(item),
    roleName: clean(item.role || item.mimic || item.source, "Admin Brain"),
    level: priorityFor(item),
    title,
    happened: summary,
    checked: asArray(item.checked || item.checks || item.evidence).map((x) => clean(x)).filter(Boolean).slice(0, 5),
    prepared,
    need: clean(item.owner_question || item.needs || item.decision_needed, "Approve, edit, park, or ask for more information?"),
    actions: ownerOptions.length ? ownerOptions.slice(0, 5) : ["Approve", "Edit", "Park", "Ask staff"],
    raw: item,
  };
}

function countsFromDecisions(decisions = []) {
  const byTray = decisions.reduce((acc, item) => {
    acc[item.tray] = (acc[item.tray] || 0) + 1;
    return acc;
  }, {});
  return {
    total: decisions.length,
    high: decisions.filter((item) => item.level === "Top priority").length,
    byTray,
  };
}

export async function fetchOfficeTeamSnapshot() {
  const base = host();
  if (!base) return { source: "demo", decisions: [] };
  const response = await fetch(`${base}/api/admin-brain/scan`, {
    credentials: "include",
    headers: authHeaders({ json: false }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) return { source: "demo", decisions: [] };
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Admin Brain failed ${response.status}`);
  const rawActions = asArray(body?.actions).length ? body.actions : asArray(body?.items);
  const decisions = rawActions.map(mapBrainActionToDecision);
  const counts = body?.counts || countsFromDecisions(decisions);
  return {
    source: decisions.length ? "admin-brain" : "clear-live",
    decisions,
    counts,
    fetchedAt: new Date().toISOString(),
  };
}

export async function recordOfficeTeamDecision(decision, action) {
  const base = host();
  const actionId = clean(decision?.id || decision?.raw?.id || decision?.raw?.action_id);
  if (!base || !actionId || actionId.startsWith("demo-") || actionId.startsWith("brain-")) {
    return { success: true, localOnly: true, message: "Saved locally in lab preview." };
  }
  const response = await fetch(`${base}/api/admin-brain/decide`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({
      action_id: actionId,
      decision: action,
      source: "office_team_lab",
      prepared_only: true,
      owner_review_only: true,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Decision failed ${response.status}`);
  return body;
}

const READ_ENDPOINTS = {
  work: ["/api/jobs?limit=12", "/api/jobs", "/api/work"],
  schedule: ["/api/jobs?limit=12", "/api/schedule", "/api/calendar/events"],
  clients: ["/api/clients?limit=12", "/api/clients", "/api/customers"],
  messages: ["/api/messages?limit=12", "/api/messages", "/api/approved-notifications", "/api/ai/actions"],
  worker: ["/api/worker/jobs"],
  quotes: ["/api/quotes?limit=12", "/api/quotes"],
  invoices: ["/api/invoices?limit=12", "/api/invoices"],
  money: ["/api/invoices?limit=12", "/api/accounting/health"],
  staff: ["/api/team/workers", "/api/team", "/api/workers"],
  payroll: ["/api/payroll/summary", "/api/payroll", "/api/team/workers"],
  automation: ["/api/ai/actions", "/api/approved-notifications", "/api/admin-brain/scan"],
  branding: ["/api/business/settings", "/api/settings/business", "/api/auth/me"],
};

const ARRAY_KEYS = {
  work: ["jobs", "work", "bookings", "items", "results", "data"],
  schedule: ["jobs", "events", "schedule", "items", "results", "data"],
  clients: ["clients", "customers", "items", "results", "data"],
  messages: ["messages", "threads", "notifications", "actions", "items", "results", "data"],
  worker: ["jobs", "workers", "team", "items", "results", "data"],
  quotes: ["quotes", "items", "results", "data"],
  invoices: ["invoices", "items", "results", "data"],
  money: ["invoices", "payments", "items", "results", "data"],
  staff: ["workers", "staff", "team", "items", "results", "data"],
  payroll: ["workers", "payroll", "periods", "items", "results", "data"],
  automation: ["actions", "rules", "notifications", "items", "results", "data"],
  branding: ["settings", "business", "items", "results", "data"],
};

async function safeRead(path) {
  const base = host();
  if (!base) return { ok: false, locked: true, status: 0, body: {}, path };
  let last = { ok: false, locked: false, status: 0, body: {}, path, error: "network" };
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${base}${path}`, {
        credentials: "include",
        cache: "no-store",
        headers: authHeaders({ json: false }),
      });
      const body = await response.json().catch(() => ({}));
      last = {
        ok: response.ok && body?.success !== false,
        locked: response.status === 401 || response.status === 403,
        status: response.status,
        body,
        path,
      };
      const transient = response.status === 408 || response.status === 429 || response.status >= 500;
      if (!transient || attempt === 3) return last;
    } catch (error) {
      last = { ok: false, locked: false, status: 0, body: {}, path, error: error?.message || "network" };
      if (attempt === 3) return last;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 300 * attempt));
  }
  return last;
}

function extractArray(body, area, depth = 0) {
  if (depth > 3 || body == null) return [];
  if (Array.isArray(body)) return body;
  if (typeof body !== "object") return [];
  const keys = ARRAY_KEYS[area] || ["items", "results", "data"];
  for (const key of keys) {
    const value = body[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = extractArray(value, area, depth + 1);
      if (nested.length) return nested;
    }
  }
  return [];
}

function objectAsRows(area, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];
  if (area === "money" && (body.xero_connected !== undefined || body.tenant_name || body.draft_invoice_sync_ready !== undefined)) {
    return [[
      body.xero_connected ? "Xero" : "Accounting",
      body.xero_connected ? "Connected" : "Not connected",
      body.tenant_name || "Sync locked",
      body.draft_invoice_sync_ready ? "Draft invoice sync is ready, but owner approval is still required." : "No auto-sync. Owner approval is still required.",
    ]];
  }
  if (area === "branding" || area === "settings") {
    const business = body.business || body.company || body.user || body;
    return [[
      "Business profile",
      first(business, ["business_name", "company_name", "name", "email"], "Business settings"),
      first(business, ["gst_rate", "gst", "timezone", "currency"], "Check settings"),
      "Read-only preview. Changes still belong in Settings with owner control.",
    ]];
  }
  return [];
}

function workerRecordActive(item = {}) {
  if (item.archived === true || item.is_archived === true || item.deleted === true || item.is_deleted === true) return false;
  if (item.active === false || item.is_active === false) return false;
  const status = clean(item.status || item.job_status || item.workflow_status || item.state || item.stage).toLowerCase().replace(/[-\s]+/g, "_");
  return !["archived", "deleted", "cancelled", "canceled", "void"].includes(status) && !status.startsWith("archiv");
}


function recordTime(item = {}) {
  const raw = item.updated_at || item.created_at || item.assigned_at || item.scheduled_date || item.date || "";
  const parsed = Date.parse(String(raw || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRows(area, body) {
  const sourceRecords = extractArray(body, area);
  const activeRecords = area === "worker" ? sourceRecords.filter(workerRecordActive) : sourceRecords;
  const ordered = area === "worker"
    ? [...activeRecords].sort((left, right) => recordTime(right) - recordTime(left))
    : activeRecords;
  const records = ordered.slice(0, area === "worker" ? 80 : 12);
  const rows = records.map((item, index) => rowFor(area, item, index)).filter(Boolean);
  if (rows.length) return rows;
  return objectAsRows(area, body);
}

function paymentMeta(item = {}) {
  const paymentLink = first(item, ["payment_link", "payment_url", "stripe_payment_url", "pay_url", "checkout_url", "public_invoice_url", "invoice_url"], "");
  const amountDue = money(first(item, ["amount_due", "balance_due", "balance", "total", "amount", "price"], ""), "");
  return {
    paymentLink,
    amountDue,
    invoiceNumber: first(item, ["invoice_number", "invoice_no", "number", "invoice_id"], ""),
    customerName: first(item, ["customer_name", "client_name", "name", "business_name"], "Customer"),
    jobId: first(item, ["job_id", "id", "_id"], ""),
    invoiceId: first(item, ["invoice_id", "invoiceId"], ""),
  };
}

function rowFor(area, item = {}, index = 0) {
  if (!item || typeof item !== "object") return null;
  const fallbackTitle = `Live ${area} record`;
  if (area === "work" || area === "schedule") {
    return [
      shortWhen(first(item, ["scheduled_date", "date", "start", "start_time", "due_date"], index === 0 ? "Today" : "Upcoming")),
      first(item, ["title", "job_title", "name", "service", "description", "client_name", "customer_name"], fallbackTitle),
      first(item, ["status", "state", "stage"], "Live record"),
      first(item, ["summary", "notes", "address", "client_name", "customer_name"], "Read-only live data. Send any change through Command first."),
    ];
  }
  if (area === "clients") {
    return [
      first(item, ["name", "client_name", "customer_name", "business_name", "email", "phone"], "Client"),
      first(item, ["type", "kind", "status"], "Client record"),
      first(item, ["next_action", "stage", "last_job_status"], "Check details"),
      first(item, ["notes", "summary", "address", "email", "phone"], "Client memory is read-only until approved."),
    ];
  }
  if (area === "messages") {
    return [
      first(item, ["channel", "type", "source", "from_name", "sender"], "Message"),
      first(item, ["subject", "title", "snippet", "body", "message"], "Live message thread"),
      first(item, ["status", "state", "priority"], "Review"),
      first(item, ["summary", "snippet", "body", "message", "detail"], "Reply is prepared-only until owner approval."),
    ];
  }
  if (area === "worker") {
    const meta = paymentMeta(item);
    return [
      shortWhen(first(item, ["scheduled_date", "date", "start", "start_time", "due_date"], index === 0 ? "Today" : "Assigned")),
      first(item, ["title", "job_title", "job_name", "name", "service", "description", "client_name", "customer_name"], "Assigned job"),
      first(item, ["status", "job_status", "workflow_status", "state", "stage"], "Ready"),
      first(item, ["worker_notes", "notes", "summary", "address", "client_name", "customer_name"], "Check the job notes before starting."),
      meta,
    ];
  }
  if (area === "staff") {
    const meta = paymentMeta(item);
    return [
      first(item, ["name", "worker_name", "staff_name", "email", "role"], "Worker"),
      first(item, ["status", "role", "job_title", "today_status", "title", "service", "client_name", "customer_name"], "Live staff record"),
      first(item, ["availability", "timer_status", "assigned_count", "phone", "amount_due", "balance_due"], "Check"),
      first(item, ["notes", "summary", "email", "phone", "address"], "Worker view stays simple and phone-friendly."),
      meta,
    ];
  }
  if (area === "quotes") {
    return [
      first(item, ["status", "state", "stage"], "Quote"),
      first(item, ["title", "quote_title", "client_name", "customer_name", "name"], "Live quote"),
      money(first(item, ["total", "amount", "price", "value"], ""), "Value check"),
      first(item, ["summary", "notes", "description"], "Quote changes must go through owner approval."),
    ];
  }
  if (area === "invoices" || area === "money") {
    return [
      first(item, ["status", "state", "stage"], area === "money" ? "Money" : "Invoice"),
      first(item, ["title", "invoice_title", "client_name", "customer_name", "number", "name"], "Live invoice"),
      money(first(item, ["total", "amount", "balance", "value"], ""), "Value check"),
      first(item, ["summary", "notes", "description"], "No send or sync until owner approval."),
    ];
  }
  if (area === "payroll") {
    return [
      first(item, ["period", "name", "worker_name", "staff_name", "email"], "Payroll review"),
      first(item, ["hours", "total_hours", "gross_hours", "status"], "Hours check"),
      first(item, ["status", "timer_status", "role"], "Review"),
      first(item, ["summary", "notes"], "Gross hours only. No tax filing, no bank file."),
    ];
  }
  if (area === "automation") {
    return [
      first(item, ["type", "kind", "source", "role"], "Rule"),
      first(item, ["title", "problem", "name", "summary"], "Prepared automation"),
      first(item, ["status", "priority", "level"], "Owner approval"),
      first(item, ["prepared", "suggestion", "detail", "summary"], "Automation prepares only. Command approves."),
    ];
  }
  return ["Live", first(item, ["title", "name", "summary"], fallbackTitle), first(item, ["status", "state"], "Review"), "Read-only live data."];
}

export async function fetchOfficeTeamRows(area) {
  const endpoints = READ_ENDPOINTS[area] || [];
  if (!host()) return { source: "demo", rows: [], message: "Demo structure · API base unavailable" };

  for (const endpoint of endpoints) {
    try {
      const requestEndpoint = area === "worker"
        ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}ts=${Date.now()}`
        : endpoint;
      const result = await safeRead(requestEndpoint);
      if (result.locked) return { source: "locked", rows: [], endpoint, message: "Sign in as an owner to load live read-only data" };
      if (!result.ok) continue;
      const rows = normalizeRows(area, result.body);
      if (rows.length) return { source: "live", rows, endpoint, message: `Live read-only · ${rows.length} records` };
    } catch {
      // Keep the hidden lab resilient. Missing endpoints should never break the preview.
    }
  }

  return { source: "demo", rows: [], message: "Demo structure · safe preview" };
}

export function makeStatusCards(rawCounts = {}, fallbackTotal = 35) {
  const counts = rawCounts || {};
  const total = Number(counts.total ?? fallbackTotal) || 0;
  const high = Number(counts.high ?? 6) || 0;
  return [
    { value: String(total), label: "Prepared", note: total ? "Ready for review" : "Office watching" },
    { value: String(high), label: "Needs owner", note: "Ranked by risk" },
    { value: "0", label: "Auto-sent", note: "Approval locked" },
    { value: String(counts.parked ?? 4), label: "Parked", note: "Waiting on info" },
  ];
}
