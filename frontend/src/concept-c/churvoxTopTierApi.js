// CHURVOX_TOP_TIER_FRONTEND_HELPERS_20260528
// Frontend helper layer for the top-tier AI Operator foundations.

const API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function token() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

async function request(path, options = {}) {
  const t = token();
  const res = await fetch(`${cleanBase(API_BASE)}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok || data?.success === false) {
    throw new Error(data?.detail || data?.message || `Request failed (${res.status})`);
  }

  return data;
}

export function getAiAuditLog() {
  return request("/api/ai/audit-log");
}

export function createAiAuditLog(payload) {
  return request("/api/ai/audit-log", {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

export function reopenWorkSlip(jobId) {
  return request(`/api/work-slips/${encodeURIComponent(jobId)}/reopen`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getClientMemory(clientId) {
  return request(`/api/clients/${encodeURIComponent(clientId)}/memory`);
}

export function createProofPackFromJob(jobId, payload = {}) {
  return request(`/api/proof-packs/from-job/${encodeURIComponent(jobId)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listProofPacks() {
  return request("/api/proof-packs");
}

export function draftWorkerVoiceNote(payload = {}) {
  return request("/api/worker/voice-notes/draft", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTradePresets() {
  return request("/api/trade-presets");
}

export function getDispatchBoard() {
  return request("/api/dispatch/board");
}

export function syncOfflineActions(actions = []) {
  return request("/api/offline-sync", {
    method: "POST",
    body: JSON.stringify({ actions }),
  });
}

export const topTierFeatureList = [
  "Proof packs",
  "Customer proof page",
  "AI audit trail",
  "Undo / reopen Work Slip",
  "Client memory",
  "Worker voice notes",
  "Trade presets",
  "Message approval queue",
  "Dispatch board",
  "Offline sync",
];
