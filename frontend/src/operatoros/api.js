const KNOWN_BACKEND_BASE = "https://grassley-backend.onrender.com/api";

function normaliseBaseUrl(value) {
  let raw = String(value || "").trim();
  if (!raw) raw = KNOWN_BACKEND_BASE;

  if (raw.startsWith("//")) raw = `https:${raw}`;
  if (!/^https?:\/\//i.test(raw) && !raw.startsWith("/")) raw = `https://${raw}`;

  const clean = raw.replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

const rawBase =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  KNOWN_BACKEND_BASE;

export const API_BASE = normaliseBaseUrl(rawBase);

function candidateApiBases() {
  const bases = [API_BASE, KNOWN_BACKEND_BASE].map(normaliseBaseUrl);
  return [...new Set(bases)];
}

export function readToken() {
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

async function parseResponse(res, path) {
  const text = await res.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    throw new Error(payload?.detail || payload?.message || payload?.error || `${path} failed`);
  }

  return payload;
}

export async function apiFetch(path, options = {}) {
  const token = readToken();
  const body = options.body;
  const headers = { Accept: "application/json", ...(options.headers || {}) };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const cleanPath = String(path).replace(/^\/+/, "");
  let lastError = null;

  for (const base of candidateApiBases()) {
    try {
      const res = await fetch(`${base}/${cleanPath}`, {
        method: options.method || "GET",
        credentials: "include",
        ...options,
        headers,
        body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
      });

      return await parseResponse(res, path);
    } catch (error) {
      lastError = error;

      const isNetworkError =
        error instanceof TypeError ||
        String(error?.message || "").toLowerCase().includes("failed to fetch") ||
        String(error?.message || "").toLowerCase().includes("networkerror");

      if (!isNetworkError) throw error;
    }
  }

  throw new Error(
    `Backend could not be reached for ${path}. Check Render backend deploy/CORS, then refresh. Last error: ${lastError?.message || "network error"}`
  );
}

export function toArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;

  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }

  for (const key of ["items", "results", "rows", "data"]) {
    if (Array.isArray(data[key])) return data[key];
  }

  return Object.values(data).find(Array.isArray) || [];
}

export function idOf(item) {
  return item?.id || item?._id || item?.uuid || item?.job_id || item?.invoice_id || item?.quote_id || "";
}

export function titleOf(item, fallback = "Untitled") {
  return (
    item?.title ||
    item?.name ||
    item?.job_title ||
    item?.client_name ||
    item?.customer_name ||
    item?.business_name ||
    item?.invoice_number ||
    item?.quote_number ||
    item?.email ||
    fallback
  );
}

export function clientOf(item) {
  return (
    item?.client_name ||
    item?.customer_name ||
    item?.client?.name ||
    item?.customer?.name ||
    item?.business_name ||
    item?.email ||
    "No client set"
  );
}

export function statusOf(item, fallback = "open") {
  return String(
    item?.status ||
      item?.job_status ||
      item?.workflow_status ||
      item?.payment_status ||
      item?.quote_status ||
      item?.state ||
      fallback
  )
    .replaceAll("_", " ")
    .trim();
}

export function statusSlug(item, fallback = "open") {
  return statusOf(item, fallback).toLowerCase().replace(/\s+/g, "_");
}

export function moneyOf(item) {
  const value = Number(item?.total || item?.amount || item?.price || item?.balance_due || item?.balance || 0);
  if (!Number.isFinite(value) || value <= 0) return "—";

  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function readLocalList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

export function saveLocalList(key, rows, max = 100) {
  try {
    localStorage.setItem(key, JSON.stringify(rows.slice(0, max)));
  } catch {}
}

export async function tryApi(paths, options = {}) {
  let lastError = null;

  for (const path of Array.isArray(paths) ? paths : [paths]) {
    try {
      return await apiFetch(path, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Request failed");
}

export function addActivity(row) {
  const rows = readLocalList("churvox_operator_activity_log");
  rows.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: new Date().toISOString(),
    ...row,
  });
  saveLocalList("churvox_operator_activity_log", rows);
}

export function saveOperatorDraft(row) {
  const rows = readLocalList("churvox_operator_drafts");
  rows.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    saved_at: new Date().toISOString(),
    ...row,
  });
  saveLocalList("churvox_operator_drafts", rows);
}


export function normalizeRole(role) {
  const raw = String(role || "").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "employer", "business_owner", "admin"].includes(raw)) return "owner";
  if (["manager"].includes(raw)) return "manager";
  if (["office_admin", "office", "admin_staff"].includes(raw)) return "office_admin";
  if (["payroll", "payroll_admin"].includes(raw)) return "payroll";
  if (["worker", "field_worker", "staff", "employee"].includes(raw)) return "worker";
  return "";
}

export function readStoredUser() {
  const keys = ["churvox_user", "user", "auth_user", "current_user", "profile"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed.user || parsed.profile || parsed;
    } catch {}
  }

  try {
    const email = localStorage.getItem("email") || localStorage.getItem("user_email") || "";
    const role = localStorage.getItem("role") || localStorage.getItem("user_role") || "";
    if (email || role) return { email, role };
  } catch {}

  return {};
}

export function currentUserRole() {
  const user = readStoredUser();
  const fromUser = normalizeRole(user.role || user.user_role || user.account_type || user.type);
  if (fromUser) return fromUser;

  try {
    const saved = normalizeRole(localStorage.getItem("churvox_role") || localStorage.getItem("role") || localStorage.getItem("user_role"));
    if (saved) return saved;
  } catch {}

  const path = window.location.pathname.toLowerCase();
  if (path.startsWith("/worker")) return "worker";
  if (path.startsWith("/payroll")) return "payroll";
  return "owner";
}

export function currentUserName() {
  const user = readStoredUser();
  return (
    user.name ||
    user.full_name ||
    user.first_name ||
    user.business_name ||
    user.email ||
    "Owner"
  );
}

export function canSwitchRoleForTesting() {
  try {
    return localStorage.getItem("churvox_allow_role_switch") === "true";
  } catch {
    return false;
  }
}

export function isOwnerLike(role) {
  return ["owner", "manager", "office_admin"].includes(normalizeRole(role));
}

export function isWorkerRole(role) {
  return normalizeRole(role) === "worker";
}

export function isPayrollRole(role) {
  return normalizeRole(role) === "payroll";
}

