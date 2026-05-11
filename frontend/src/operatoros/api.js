const rawBase =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

export const API_BASE = (() => {
  const clean = String(rawBase).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

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

export async function apiFetch(path, options = {}) {
  const token = readToken();
  const body = options.body;
  const headers = { Accept: "application/json", ...(options.headers || {}) };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
    method: options.method || "GET",
    credentials: "include",
    ...options,
    headers,
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
  });

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
