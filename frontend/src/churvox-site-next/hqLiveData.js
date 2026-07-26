import API_BASE from "../lib/apiBase";

export const HQ_LIVE_DATA_BUILD = "churvox-hq-live-data-20260727";

if (typeof window !== "undefined") {
  window.__CHURVOX_HQ_LIVE_DATA_BUILD__ = HQ_LIVE_DATA_BUILD;
}

const SOURCES = Object.freeze([
  ["Launch", "/api/admin/owner/paid-launch-report"],
  ["Overview", "/api/admin/owner-overview"],
  ["Growth", "/api/admin/owner/growth-report"],
  ["Connection", "/api/admin/owner/connection"],
  ["Plans", "/api/admin/owner/plan-report"],
  ["Control", "/api/admin/owner/control-log"],
  ["Testers", "/api/admin/owner/testers"],
]);

function host() {
  const configured = String(API_BASE || "").replace(/\/+$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return String(window.location.origin || "").replace(/\/+$/, "");
  return "";
}

function token() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
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

function bodyOf(payload = {}) {
  const nested = payload?.data?.data ?? payload?.data;
  if (nested === undefined || nested === null) return payload;
  if (Array.isArray(nested)) return { ...payload, items: nested };
  if (typeof nested === "object") return { ...payload, ...nested };
  return payload;
}

function clean(value, fallback = "") {
  if (value === undefined || value === null || typeof value === "object") return fallback;
  const result = String(value).trim();
  return result || fallback;
}

function findCount(body = {}, keys = []) {
  for (const key of keys) {
    const value = body?.[key];
    if (Array.isArray(value)) return value.length;
    if (Number.isFinite(Number(value))) return Number(value);
    if (value && typeof value === "object") {
      const nested = findCount(value, keys);
      if (nested !== null) return nested;
    }
  }
  return null;
}

function arrayCount(body, depth = 0) {
  if (depth > 4 || body == null) return 0;
  if (Array.isArray(body)) return body.length;
  if (typeof body !== "object") return 0;
  return Math.max(0, ...Object.values(body).map((value) => arrayCount(value, depth + 1)));
}

function sourceSummary(label, payload = {}) {
  const body = bodyOf(payload);
  const explicitCount = findCount(body, [
    "total",
    "count",
    "business_count",
    "paid_businesses",
    "active_businesses",
    "tester_count",
    "active_testers",
    "open_count",
    "items",
    "businesses",
    "users",
    "testers",
    "events",
  ]);
  const inferredCount = arrayCount(body);
  const status = clean(body.status || body.state || body.health || body.result, "Available");
  const message = clean(body.message || body.detail || body.summary || body.source, `${label} source returned successfully.`);
  return {
    count: explicitCount === null ? inferredCount : explicitCount,
    status,
    message,
  };
}

async function fetchSource(label, path, signal) {
  const apiHost = host();
  if (!apiHost) return { label, path, state: "unavailable", count: 0, status: "Unavailable", message: "No API host was available." };

  try {
    const response = await fetch(`${apiHost}${path}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: headers(),
      signal,
    });
    const rawBody = await response.json().catch(() => ({}));
    const body = bodyOf(rawBody);
    if (response.status === 401 || response.status === 403) {
      return { label, path, state: "locked", count: 0, status: "Owner access required", message: clean(body.detail || body.message, "Platform owner access is required.") };
    }
    if (response.status === 404) {
      return { label, path, state: "missing", count: 0, status: "Not connected", message: "This read endpoint is not registered." };
    }
    if (!response.ok || rawBody?.success === false || rawBody?.ok === false || body?.success === false || body?.ok === false) {
      return { label, path, state: "error", count: 0, status: `Error ${response.status}`, message: clean(body.detail || body.message || body.error, "The source failed safely.") };
    }
    return { label, path, state: "live", ...sourceSummary(label, body), fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return { label, path, state: "error", count: 0, status: "Connection error", message: error?.message || "The source failed safely." };
  }
}

export async function loadHqLiveStatus({ signal } = {}) {
  const sources = await Promise.all(SOURCES.map(([label, path]) => fetchSource(label, path, signal)));
  const live = sources.filter((source) => source.state === "live").length;
  const locked = sources.some((source) => source.state === "locked");
  return {
    state: locked ? "locked" : live ? "live" : "unavailable",
    sources,
    connected: live,
    total: sources.length,
    fetchedAt: new Date().toISOString(),
  };
}
