import API_BASE from "../lib/apiBase";

export const HQ_LIVE_DATA_BUILD = "churvox-hq-live-data-20260727";

if (typeof window !== "undefined") {
  window.__CHURVOX_HQ_LIVE_DATA_BUILD__ = HQ_LIVE_DATA_BUILD;
}

const SOURCES = Object.freeze([
  { key: "launch", label: "Launch", path: "/api/admin/owner/paid-launch-report" },
  { key: "overview", label: "Overview", path: "/api/admin/owner-overview" },
  { key: "growth", label: "Growth", path: "/api/admin/owner/growth-report" },
  { key: "connection", label: "Connection", path: "/api/admin/owner/connection" },
  { key: "plans", label: "Plans", path: "/api/admin/owner/plan-report" },
  { key: "control", label: "Control", path: "/api/admin/owner/control-log" },
  { key: "testers", label: "Testers", path: "/api/admin/owner/testers" },
]);

function host() {
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

function headers() {
  const currentToken = token();
  return {
    Accept: "application/json",
    ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
  };
}

function unwrap(payload) {
  return payload?.data?.data ?? payload?.data ?? payload ?? {};
}

function clean(value, fallback = "") {
  if (value === undefined || value === null || typeof value === "object") return fallback;
  const result = String(value).trim();
  return result || fallback;
}

function numberAt(body, keys) {
  for (const key of keys) {
    const value = body?.[key];
    if (Array.isArray(value)) return value.length;
    if (value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function firstNumber(body, keyGroups) {
  const queue = [body];
  let depth = 0;
  while (queue.length && depth < 5) {
    const next = queue.splice(0, queue.length);
    for (const value of next) {
      if (!value || typeof value !== "object") continue;
      for (const keys of keyGroups) {
        const found = numberAt(value, keys);
        if (found !== null) return found;
      }
      Object.values(value).forEach((child) => {
        if (child && typeof child === "object") queue.push(child);
      });
    }
    depth += 1;
  }
  return null;
}

function firstText(body, keys, fallback = "") {
  const queue = [body];
  let depth = 0;
  while (queue.length && depth < 5) {
    const next = queue.splice(0, queue.length);
    for (const value of next) {
      if (!value || typeof value !== "object") continue;
      for (const key of keys) {
        const result = clean(value?.[key]);
        if (result) return result;
      }
      Object.values(value).forEach((child) => {
        if (child && typeof child === "object") queue.push(child);
      });
    }
    depth += 1;
  }
  return fallback;
}

function metric(label, value, detail = "") {
  return { label, value: value === null || value === undefined || value === "" ? "—" : value, detail };
}

function sourceMetrics(key, rawBody) {
  const body = unwrap(rawBody);
  if (key === "overview") {
    return [
      metric("Businesses", firstNumber(body, [["business_count", "total_businesses", "businesses", "active_businesses"]])),
      metric("Users", firstNumber(body, [["user_count", "total_users", "users", "active_users"]])),
      metric("Active today", firstNumber(body, [["active_today", "today_active", "daily_active_users", "visits_today"]])),
    ];
  }
  if (key === "growth") {
    return [
      metric("Sign-ups", firstNumber(body, [["signups", "sign_ups", "new_users", "registrations"]])),
      metric("Trials", firstNumber(body, [["trials", "trial_count", "active_trials"]])),
      metric("Paid", firstNumber(body, [["paid_businesses", "paid_count", "active_subscriptions", "subscribers"]])),
    ];
  }
  if (key === "plans") {
    return [
      metric("Start", firstNumber(body, [["start", "solo", "start_count", "solo_count"]])),
      metric("Crew", firstNumber(body, [["crew", "team", "crew_count", "team_count"]])),
      metric("Operator", firstNumber(body, [["operator", "pro", "operator_count", "pro_count"]])),
      metric("Command", firstNumber(body, [["command", "enterprise", "command_count", "enterprise_count"]])),
    ];
  }
  if (key === "testers") {
    return [
      metric("Applications", firstNumber(body, [["applications", "application_count", "tester_applications"]])),
      metric("Active testers", firstNumber(body, [["active_testers", "tester_count", "testers"]])),
      metric("Waiting", firstNumber(body, [["waiting", "pending", "pending_count", "needs_review"]])),
    ];
  }
  if (key === "launch") {
    return [
      metric("Launch state", firstText(body, ["launch_state", "status", "state", "decision"], "Unknown")),
      metric("Passed checks", firstNumber(body, [["passed", "passed_checks", "success_count"]])),
      metric("Open issues", firstNumber(body, [["failed", "open_issues", "failure_count", "blocked"]])),
    ];
  }
  if (key === "connection") {
    return [
      metric("Backend", firstText(body, ["backend", "backend_status", "api_status"], "Unknown")),
      metric("Database", firstText(body, ["database", "database_status", "mongo_status"], "Unknown")),
      metric("Stripe", firstText(body, ["stripe", "stripe_status", "billing_status"], "Unknown")),
      metric("Email", firstText(body, ["email", "email_status", "provider_status"], "Unknown")),
    ];
  }
  if (key === "control") {
    return [
      metric("Recent events", firstNumber(body, [["events", "event_count", "control_log", "items"]])),
      metric("Warnings", firstNumber(body, [["warnings", "warning_count", "alerts"]])),
      metric("Failures", firstNumber(body, [["failures", "failure_count", "errors"]])),
    ];
  }
  return [];
}

function sourceSummary(source, body = {}) {
  const unwrapped = unwrap(body);
  return {
    status: firstText(unwrapped, ["status", "state", "health", "result"], "Available"),
    message: firstText(unwrapped, ["message", "detail", "summary", "source"], `${source.label} source returned successfully.`),
    metrics: sourceMetrics(source.key, unwrapped),
  };
}

async function fetchSource(source, signal) {
  const apiHost = host();
  if (!apiHost) return { ...source, state: "unavailable", status: "Unavailable", message: "No API host was available.", metrics: [] };

  try {
    const response = await fetch(`${apiHost}${source.path}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: headers(),
      signal,
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      return { ...source, state: "locked", status: "Owner access required", message: clean(body.detail || body.message, "Platform owner access is required."), metrics: [] };
    }
    if (response.status === 404) {
      return { ...source, state: "missing", status: "Not connected", message: "This read endpoint is not registered.", metrics: [] };
    }
    if (!response.ok || body?.success === false || body?.ok === false) {
      return { ...source, state: "error", status: `Error ${response.status}`, message: clean(body.detail || body.message || body.error, "The source failed safely."), metrics: [] };
    }
    return { ...source, state: "live", ...sourceSummary(source, body), fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return { ...source, state: "error", status: "Connection error", message: error?.message || "The source failed safely.", metrics: [] };
  }
}

export async function loadHqLiveStatus({ signal } = {}) {
  const sources = await Promise.all(SOURCES.map((source) => fetchSource(source, signal)));
  const live = sources.filter((source) => source.state === "live").length;
  const locked = sources.some((source) => source.state === "locked");
  const errors = sources.filter((source) => ["error", "missing", "unavailable"].includes(source.state)).length;
  return {
    state: locked ? "locked" : live ? "live" : "unavailable",
    sources,
    connected: live,
    errors,
    total: sources.length,
    fetchedAt: new Date().toISOString(),
  };
}
