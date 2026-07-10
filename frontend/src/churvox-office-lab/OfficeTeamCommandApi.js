import API_BASE from "../lib/apiBase";

export const BACKEND_COMMAND_EVENT = "churvox-backend-command-slip";
const SAFE_RESULT = "Owner approval recorded. Nothing was sent, synced, charged or changed.";

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

function clean(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function trayForSlip(slip = {}) {
  const text = clean(`${slip.source_type || ""} ${slip.action_type || ""} ${slip.tray || ""}`).toLowerCase();
  if (/accounting|gst|tax|xero|myob|ledger|export/.test(text)) return "Accounting";
  if (/invoice|quote|payment|money/.test(text)) return "Money";
  if (/job|work|booking|schedule|recurring/.test(text)) return "Bookings";
  if (/staff|worker|payroll|team|timer|timesheet/.test(text)) return "Staff";
  if (/client|customer|message|inbox|memory/.test(text)) return "Clients";
  if (/quality|proof|photo/.test(text)) return "Quality";
  if (/operation|automation|branding|setup|pattern/.test(text)) return "Operations";
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
  if (/pattern/.test(raw)) return "Pattern";
  if (/accounting/.test(raw)) return "Accounting check";
  return "Needs check";
}

export function mapCommandSlipToDecision(slip = {}, index = 0) {
  const tray = trayForSlip(slip);
  const id = clean(slip.id || slip._id || `command-slip-${index}`);
  const payload = slip.payload && typeof slip.payload === "object" ? slip.payload : {};
  return {
    id: `command-slip-${id}`,
    tray,
    roleName: clean(slip.roleName || slip.role_name || payload.office_role, roleForTray(tray)),
    level: levelForSlip(slip),
    title: clean(slip.title, "Command decision"),
    happened: clean(slip.found || slip.happened || slip.summary, "Churvox found something that may need owner review."),
    checked: [
      clean(payload.office_role, clean(slip.source_type || slip.sourceType, "backend command slip")),
      clean(slip.action_type || slip.actionType, "owner review"),
      clean(payload.source_collection, "business scoped"),
      "record-only approval",
    ].filter(Boolean).slice(0, 5),
    prepared: clean(slip.prepared, "Prepared for owner review. Nothing has been sent, synced, charged or changed."),
    need: clean(slip.why || slip.need, "Approve record-only, snooze, ignore, or edit before a future real action."),
    actions: ["Approve record", "Snooze", "Ignore"],
    raw: {
      ...slip,
      source: "backend_command_slip",
      command_slip_id: id,
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

export async function runBackendOfficeEngineScan() {
  const base = host();
  if (!base) return { source: "command-scan-unavailable", slips: [], message: "No API host" };
  const response = await fetch(`${base}/api/command/scan`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({ trigger: "owner_workspace", prepared_only: true, owner_review_only: true }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return { source: "command-scan-unavailable", slips: [], message: body?.detail || "Office engine unavailable" };
  }
  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || body?.detail || `Office engine scan failed ${response.status}`);
  }
  try {
    window.dispatchEvent(new CustomEvent(BACKEND_COMMAND_EVENT, { detail: body }));
  } catch {
    // Event refresh should never block the office engine scan.
  }
  return {
    source: "backend-office-engine",
    slips: Array.isArray(body?.slips) ? body.slips : [],
    existing: Array.isArray(body?.existing) ? body.existing : [],
    createdCount: Number(body?.created_count || 0),
    existingCount: Number(body?.existing_count || 0),
    message: body?.message || SAFE_RESULT,
    safety: body?.safety || SAFE_RESULT,
  };
}

export async function fetchBackendCommandDecisions() {
  const base = host();
  if (!base) return { source: "command-unavailable", decisions: [], message: "No API host" };
  const response = await fetch(`${base}/api/command/slips`, {
    credentials: "include",
    headers: authHeaders({ json: false }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return { source: "command-unavailable", decisions: [], message: body?.detail || "Command backend unavailable" };
  }
  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || body?.detail || `Command slips failed ${response.status}`);
  }
  const slips = Array.isArray(body?.slips) ? body.slips : [];
  return {
    source: slips.length ? "backend-command" : "backend-command-clear",
    decisions: slips.map(mapCommandSlipToDecision),
    message: body?.safety || SAFE_RESULT,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchBackendCommandAudit() {
  const base = host();
  if (!base) return { source: "command-audit-unavailable", audit: [], message: "No API host" };
  const response = await fetch(`${base}/api/command/audit`, {
    credentials: "include",
    headers: authHeaders({ json: false }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return { source: "command-audit-unavailable", audit: [], message: body?.detail || "Command audit unavailable" };
  }
  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || body?.detail || `Command audit failed ${response.status}`);
  }
  const audit = Array.isArray(body?.audit) ? body.audit : [];
  return {
    source: audit.length ? "backend-command-audit" : "backend-command-audit-clear",
    audit: audit.map(mapBackendCommandAudit),
    message: body?.safety || SAFE_RESULT,
    fetchedAt: new Date().toISOString(),
  };
}

export async function createBackendCommandSlip({ area = "office", record = [], action = "Prepare Command card" } = {}) {
  const base = host();
  if (!base) throw new Error("Command backend unavailable");
  const recordTitle = record?.[1] || record?.[0] || "selected record";
  const status = record?.[2] || "Prepared-only";
  const detail = record?.[3] || "Prepared for owner review.";
  const response = await fetch(`${base}/api/command/slips`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({
      source_type: area,
      action_type: action,
      sourceType: area,
      actionType: action,
      title: `${labelForArea(area)}: ${recordTitle}`,
      found: `${status}. ${detail}`,
      prepared: `${action} prepared this backend Command slip. Nothing was sent, synced, charged or changed.`,
      why: "Owner approval is required before any real send, sync, charge or record change.",
      urgency: "Owner review",
      payload: {
        area,
        record,
        action,
        prepared_only: true,
        owner_review_only: true,
      },
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || body?.detail || `Command slip failed ${response.status}`);
  }
  try {
    window.dispatchEvent(new CustomEvent(BACKEND_COMMAND_EVENT, { detail: body }));
  } catch {
    // Event refresh should never block Command creation.
  }
  return body;
}

export async function createBackendWorkerPaymentRequest({ title = "Worker payment request", amount = "", invoice = "", customer = "", paymentLink = "" } = {}) {
  const base = host();
  if (!base) throw new Error("Command backend unavailable");
  const response = await fetch(`${base}/api/command/worker-payment-request`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({
      title,
      job_title: title,
      amount,
      amount_due: amount,
      invoice,
      invoice_number: invoice,
      customer,
      customer_name: customer,
      payment_link: paymentLink,
      prepared_only: true,
      owner_review_only: true,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || body?.detail || `Worker payment request failed ${response.status}`);
  }
  try {
    window.dispatchEvent(new CustomEvent(BACKEND_COMMAND_EVENT, { detail: body }));
  } catch {
    // Event refresh should never block worker payment requests.
  }
  return body;
}

export async function createBackendWorkerUpdateRequest({ title = "Worker update", update = "", updateType = "Worker update", status = "Owner review" } = {}) {
  const base = host();
  if (!base) throw new Error("Command backend unavailable");
  const response = await fetch(`${base}/api/command/worker-update-request`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({
      title,
      job_title: title,
      update,
      note: update,
      message: update,
      update_type: updateType,
      status,
      prepared_only: true,
      owner_review_only: true,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || body?.detail || `Worker update request failed ${response.status}`);
  }
  try {
    window.dispatchEvent(new CustomEvent(BACKEND_COMMAND_EVENT, { detail: body }));
  } catch {
    // Event refresh should never block worker update requests.
  }
  return body;
}

export async function recordBackendCommandDecision(decision, action) {
  const base = host();
  const slipId = clean(decision?.raw?.command_slip_id || "");
  if (!base || !slipId) {
    return { success: true, localOnly: true, message: SAFE_RESULT };
  }
  const normalized = clean(action, "Approve record").toLowerCase();
  const endpoint = normalized.includes("snooze")
    ? "snooze"
    : normalized.includes("ignore") || normalized.includes("park")
      ? "ignore"
      : "approve";
  const response = await fetch(`${base}/api/command/slips/${encodeURIComponent(slipId)}/${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify({ action, note: SAFE_RESULT, hours: 24 }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || body?.detail || `Command decision failed ${response.status}`);
  }
  return body;
}

function labelForArea(area = "office") {
  const key = String(area || "office").toLowerCase();
  if (["money", "quotes", "invoices", "integrations", "accounting"].includes(key)) return "Money";
  if (["work", "schedule"].includes(key)) return "Work";
  if (["clients", "messages"].includes(key)) return "Client";
  if (["staff", "worker", "payroll"].includes(key)) return "Staff";
  if (["automation", "branding"].includes(key)) return "Operations";
  return "Office";
}
