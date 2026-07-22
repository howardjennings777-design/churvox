import API_BASE from "../lib/apiBase";

export const PREPARED_RECORD_PROOF_BUILD = "churvox-prepared-record-proof-20260723";

if (typeof window !== "undefined") {
  window.__CHURVOX_PREPARED_RECORD_PROOF_BUILD__ = PREPARED_RECORD_PROOF_BUILD;
}

function apiHost() {
  const configured = String(API_BASE || "").replace(/\/+$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return String(window.location.origin || "").replace(/\/+$/, "");
  return "";
}

function authHeaders() {
  let token = "";
  try {
    token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {}
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function rowsFrom(body = {}) {
  for (const value of [body.records, body.items, body.data, body.results]) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

export async function loadPreparedCommandRecords(collectionName, { signal, limit = 50 } = {}) {
  const collection = String(collectionName || "").trim();
  const host = apiHost();
  if (!host || !collection) return { state: "unavailable", records: [], message: "Prepared record read is unavailable." };

  const response = await fetch(`${host}/api/command/prepared-records/${encodeURIComponent(collection)}?limit=${Math.max(1, Math.min(Number(limit) || 50, 100))}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: authHeaders(),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    return { state: "locked", records: [], message: "Owner sign-in is required to confirm prepared records." };
  }
  if (!response.ok || body?.success === false) {
    return { state: "unavailable", records: [], message: body?.detail || body?.message || "Prepared record proof could not be confirmed." };
  }
  const records = rowsFrom(body);
  return {
    state: records.length ? "live" : "empty",
    records,
    collection: body.collection || collection,
    message: records.length ? `${records.length} prepared record${records.length === 1 ? "" : "s"} confirmed` : "No prepared records found.",
  };
}
