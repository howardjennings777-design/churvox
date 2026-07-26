import API_BASE from "../lib/apiBase";
import { fetchBackendCommandDecisions } from "../churvox-office-lab/OfficeTeamCommandApi";

export const OFFICE_OS_LIVE_DATA_BUILD = "churvox-office-os-live-data-20260723";

if (typeof window !== "undefined") {
  window.__CHURVOX_OFFICE_OS_LIVE_DATA_BUILD__ = OFFICE_OS_LIVE_DATA_BUILD;
}

const COLLECTIONS = Object.freeze({
  work: {
    endpoints: ["/api/jobs?limit=30", "/api/jobs", "/api/work"],
    keys: ["jobs", "work", "bookings", "items", "results", "data"],
  },
  clients: {
    endpoints: ["/api/clients?limit=30", "/api/clients", "/api/customers"],
    keys: ["clients", "customers", "items", "results", "data"],
  },
  quotes: {
    endpoints: ["/api/quotes?limit=30", "/api/quotes"],
    keys: ["quotes", "items", "results", "data"],
  },
  invoices: {
    endpoints: ["/api/invoices?limit=30", "/api/invoices"],
    keys: ["invoices", "items", "results", "data"],
  },
  messages: {
    endpoints: ["/api/messages?limit=30", "/api/messages", "/api/approved-notifications"],
    keys: ["messages", "threads", "notifications", "items", "results", "data"],
  },
  team: {
    endpoints: ["/api/team/workers", "/api/team", "/api/workers"],
    keys: ["workers", "staff", "team", "items", "results", "data"],
  },
  settings: {
    endpoints: ["/api/business/settings", "/api/settings/business", "/api/auth/me"],
    keys: ["settings", "business", "company", "user", "data"],
    allowObject: true,
  },
});

export const STABLE_OWNER_ROUTES = Object.freeze({
  today: "/dashboard#today",
  command: "/dashboard#command",
  work: "/dashboard#work",
  clients: "/dashboard#clients",
  money: "/dashboard#money",
  messages: "/dashboard#messages",
  team: "/dashboard#staff",
  reports: "/dashboard#invoices",
  settings: "/dashboard#settings",
});

function apiHost() {
  const configured = String(API_BASE || "").replace(/\/+$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return String(window.location.origin || "").replace(/\/+$/, "");
  return "";
}

function token() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

function authHeaders() {
  const currentToken = token();
  return {
    Accept: "application/json",
    ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
  };
}

function clean(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function first(record = {}, keys = [], fallback = "") {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && clean(value)) return clean(value);
  }
  return fallback;
}

function extractArray(value, keys, depth = 0) {
  if (depth > 4 || value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "object") return [];

  for (const key of keys) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested;
    if (nested && typeof nested === "object") {
      const rows = extractArray(nested, keys, depth + 1);
      if (rows.length) return rows;
    }
  }
  return [];
}

function statusText(record = {}) {
  return first(record, ["status", "state", "stage", "workflow_status", "job_status"], "Live record");
}

function amountText(record = {}) {
  const raw = first(record, ["amount_due", "balance_due", "total", "amount", "price", "value"], "");
  if (!raw) return "";
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return `$${numeric.toLocaleString("en-NZ", { maximumFractionDigits: 2 })}`;
  return raw.startsWith("$") ? raw : raw;
}

function recordId(record = {}, index = 0) {
  return first(record, ["id", "_id", "job_id", "client_id", "invoice_id", "quote_id", "message_id", "worker_id"], `record-${index}`);
}

function normaliseRecord(area, record = {}, index = 0) {
  const common = {
    id: recordId(record, index),
    status: statusText(record),
    amount: amountText(record),
    raw: record,
  };

  if (area === "work") {
    return {
      ...common,
      title: first(record, ["title", "job_title", "name", "service", "description"], "Job"),
      subtitle: first(record, ["client_name", "customer_name", "business_name", "address"], "Client not shown"),
      detail: first(record, ["scheduled_date", "date", "start_time", "start", "notes"], "Open the working job screen for full details."),
    };
  }

  if (area === "clients") {
    return {
      ...common,
      title: first(record, ["name", "client_name", "customer_name", "business_name", "email"], "Client"),
      subtitle: first(record, ["email", "phone", "address", "type"], "Client record"),
      detail: first(record, ["notes", "summary", "service", "last_job_status"], "Open the client record for history and property details."),
    };
  }

  if (area === "quotes") {
    return {
      ...common,
      title: first(record, ["title", "quote_title", "client_name", "customer_name", "number"], "Quote"),
      subtitle: first(record, ["client_name", "customer_name", "quote_number", "number"], "Quote record"),
      detail: first(record, ["summary", "description", "notes", "expiry_date"], "Owner approval remains required before sending."),
    };
  }

  if (area === "invoices") {
    return {
      ...common,
      title: first(record, ["title", "invoice_title", "client_name", "customer_name", "number"], "Invoice"),
      subtitle: first(record, ["client_name", "customer_name", "invoice_number", "number"], "Invoice record"),
      detail: first(record, ["summary", "description", "notes", "due_date"], "Payment status must come from trusted evidence."),
    };
  }

  if (area === "messages") {
    return {
      ...common,
      title: first(record, ["subject", "title", "snippet", "message"], "Message"),
      subtitle: first(record, ["from_name", "sender", "channel", "type"], "Conversation"),
      detail: first(record, ["snippet", "body", "message", "summary"], "Open Messages to review the complete thread."),
    };
  }

  if (area === "team") {
    return {
      ...common,
      title: first(record, ["name", "worker_name", "staff_name", "email"], "Team member"),
      subtitle: first(record, ["role", "job_title", "email", "phone"], "Team record"),
      detail: first(record, ["today_status", "availability", "notes", "summary"], "Open Staff for permissions, availability and payroll review."),
    };
  }

  return {
    ...common,
    title: first(record, ["business_name", "company_name", "name", "email"], "Business settings"),
    subtitle: first(record, ["country", "currency", "timezone", "email"], "Business profile"),
    detail: first(record, ["gst_rate", "tax_rate", "phone", "address"], "Open Settings to review or change business rules."),
  };
}

async function requestJson(path, signal) {
  const host = apiHost();
  if (!host) return { state: "unavailable", status: 0, body: {}, path };

  try {
    const response = await fetch(`${host}${path}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
      signal,
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) return { state: "locked", status: response.status, body, path };
    if (response.status === 404) return { state: "missing", status: 404, body, path };
    if (!response.ok || body?.success === false) return { state: "error", status: response.status, body, path };
    return { state: "live", status: response.status, body, path };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return { state: "error", status: 0, body: {}, path, error: error?.message || "Network error" };
  }
}

async function loadCollection(name, { signal } = {}) {
  const config = COLLECTIONS[name];
  if (!config) return { area: name, state: "unavailable", records: [], message: "No read contract for this area." };

  let last = null;
  for (const endpoint of config.endpoints) {
    const result = await requestJson(endpoint, signal);
    last = result;
    if (result.state === "locked") {
      return { area: name, state: "locked", records: [], endpoint, message: "Sign in as an owner to load live records." };
    }
    if (result.state === "missing" || result.state === "error") continue;

    const rows = extractArray(result.body, config.keys);
    const objectRecord = config.allowObject && !rows.length && result.body && typeof result.body === "object"
      ? [result.body.business || result.body.company || result.body.user || result.body.settings || result.body]
      : rows;
    const records = objectRecord.slice(0, 30).map((record, index) => normaliseRecord(name, record, index));
    return {
      area: name,
      state: records.length ? "live" : "empty",
      records,
      endpoint,
      message: records.length ? `${records.length} live record${records.length === 1 ? "" : "s"}` : "No live records found.",
      fetchedAt: new Date().toISOString(),
    };
  }

  return {
    area: name,
    state: "unavailable",
    records: [],
    endpoint: last?.path || "",
    message: "The live read service could not be confirmed. No sample records were substituted.",
  };
}

async function loadCommand() {
  try {
    const result = await fetchBackendCommandDecisions({ timeoutMs: 5000, attempts: 1 });
    const decisions = Array.isArray(result?.decisions) ? result.decisions : [];
    return {
      area: "command",
      state: decisions.length ? "live" : result?.source === "backend-command-clear" ? "empty" : "unavailable",
      records: decisions.map((decision, index) => ({
        id: clean(decision.id, `decision-${index}`),
        title: clean(decision.title, "Owner decision"),
        subtitle: `${clean(decision.roleName, "Office Manager")} · ${clean(decision.level, "Needs check")}`,
        status: clean(decision.tray, "Command"),
        detail: clean(decision.need || decision.happened, "Open Command to inspect the complete evidence and prepared action."),
        amount: "",
        raw: decision,
      })),
      message: decisions.length ? `${decisions.length} owner decision${decisions.length === 1 ? "" : "s"} waiting` : clean(result?.message, "Command is clear."),
      fetchedAt: result?.fetchedAt || new Date().toISOString(),
    };
  } catch (error) {
    return { area: "command", state: "unavailable", records: [], message: error?.message || "Command could not be confirmed." };
  }
}

function combine(area, sections) {
  const records = sections.flatMap((section) => section.records || []);
  const locked = sections.some((section) => section.state === "locked");
  const live = sections.some((section) => section.state === "live");
  const unavailable = sections.every((section) => section.state === "unavailable");
  return {
    area,
    state: locked ? "locked" : live ? "live" : unavailable ? "unavailable" : "empty",
    records,
    sections,
    message: records.length ? `${records.length} connected record${records.length === 1 ? "" : "s"}` : "No connected records found.",
    fetchedAt: new Date().toISOString(),
  };
}

export async function loadOfficeArea(area, options = {}) {
  if (area === "command") return loadCommand(options);
  if (area === "money") {
    const [quotes, invoices] = await Promise.all([
      loadCollection("quotes", options),
      loadCollection("invoices", options),
    ]);
    return combine("money", [quotes, invoices]);
  }
  if (area === "reports" || area === "today") return loadOfficeOverview(options);
  return loadCollection(area, options);
}

export async function loadOfficeOverview(options = {}) {
  const [command, work, clients, quotes, invoices, messages, team] = await Promise.all([
    loadCommand(options),
    loadCollection("work", options),
    loadCollection("clients", options),
    loadCollection("quotes", options),
    loadCollection("invoices", options),
    loadCollection("messages", options),
    loadCollection("team", options),
  ]);

  const sections = { command, work, clients, quotes, invoices, messages, team };
  return {
    area: "today",
    state: Object.values(sections).some((section) => section.state === "live") ? "live" : "empty",
    sections,
    counts: Object.fromEntries(Object.entries(sections).map(([key, section]) => [key, section.records.length])),
    fetchedAt: new Date().toISOString(),
  };
}

export function stableOwnerRoute(area) {
  return STABLE_OWNER_ROUTES[area] || STABLE_OWNER_ROUTES.today;
}
