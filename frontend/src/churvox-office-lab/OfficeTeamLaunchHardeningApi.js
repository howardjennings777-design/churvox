import API_BASE from "../lib/apiBase";

export const LAUNCH_HARDENING_BUILD = "churvox-go-live-trust-v1-20260714";
if (typeof window !== "undefined") window.__CHURVOX_LAUNCH_HARDENING_BUILD__ = LAUNCH_HARDENING_BUILD;

function host() {
  const configured = String(API_BASE || "").replace(/\/$/, "");
  return configured || (typeof window !== "undefined" ? String(window.location.origin || "").replace(/\/$/, "") : "");
}

function token() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}

function headers(hasBody = false) {
  const auth = token();
  return { Accept: "application/json", ...(hasBody ? { "Content-Type": "application/json" } : {}), ...(auth ? { Authorization: `Bearer ${auth}` } : {}) };
}

async function request(path, options = {}) {
  const response = await fetch(`${host()}${path}`, { credentials: "include", cache: "no-store", ...options, headers: { ...headers(Boolean(options.body)), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) return { success: false, locked: true, detail: body?.detail || "Sign in to continue." };
  if (response.status === 403) return { success: false, tierLocked: true, detail: body?.detail || "This action is not included in the current plan." };
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || `Go Live request failed ${response.status}`);
  return body;
}

function post(path, payload) { return request(path, { method: "POST", body: JSON.stringify(payload || {}) }); }

export const fetchLaunchHardeningSummary = () => request("/api/launch-hardening/summary");
export const previewBusinessImport = (kind, csvText) => post("/api/launch-hardening/imports/preview", { kind, csv_text: csvText, preview_only: true });
export const commitBusinessImport = (previewId) => post("/api/launch-hardening/imports/commit", { preview_id: previewId, approved: true, owner_review_only: true });
export const undoBusinessImport = (previewId) => post(`/api/launch-hardening/imports/${encodeURIComponent(previewId)}/undo`, { owner_review_only: true });
export const recordJourneyCheckpoint = (key, screen, metadata = {}) => post("/api/launch-hardening/journey/checkpoint", { key, screen, metadata, idempotency_key: `${key}-${new Date().toISOString().slice(0, 10)}` });
export const saveRolePermissions = (role, actions) => post("/api/launch-hardening/permissions", { role, actions, owner_review_only: true });
export const createCustomerPortal = (payload) => post("/api/launch-hardening/portal-links", { ...payload, owner_review_only: true });
export const revokeCustomerPortal = (portalId) => post(`/api/launch-hardening/portal-links/${encodeURIComponent(portalId)}/revoke`, { owner_review_only: true });
export const undoRecoveryReceipt = (receiptId) => post(`/api/launch-hardening/recovery/${encodeURIComponent(receiptId)}/undo`, { owner_review_only: true });
export const fetchEvidenceOutcomes = () => request("/api/launch-hardening/evidence/outcomes");
export const fetchEvidenceDetail = (evidenceId) => request(`/api/launch-hardening/evidence/${encodeURIComponent(evidenceId)}`);
export const syncWorkerEvents = (events) => post("/api/launch-hardening/worker-sync/batch", { events, idempotent: true });

export function portabilityDownloadUrl() { return `${host()}/api/launch-hardening/portability/download`; }

export async function downloadBusinessPortabilityPack() {
  const response = await fetch(portabilityDownloadUrl(), { credentials: "include", cache: "no-store", headers: headers(false) });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body?.detail || `Export failed ${response.status}`); }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "churvox-business-portability.zip";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return { filename };
}
