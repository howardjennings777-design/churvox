import API_BASE from "../lib/apiBase";
import { BACKEND_COMMAND_EVENT } from "./OfficeTeamCommandApi";

export const OWNER_INTELLIGENCE_BUILD = "churvox-owner-intelligence-v1-20260714";
if (typeof window !== "undefined") window.__CHURVOX_OWNER_INTELLIGENCE_BUILD__ = OWNER_INTELLIGENCE_BUILD;

function host() {
  const configured = String(API_BASE || "").replace(/\/$/, "");
  return configured || (typeof window !== "undefined" ? String(window.location.origin || "").replace(/\/$/, "") : "");
}

function token() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}

function requestHeaders(hasBody = false) {
  const auth = token();
  return {
    Accept: "application/json",
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${host()}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: { ...requestHeaders(Boolean(options.body)), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) return { success: false, locked: true, detail: body?.detail || "Sign in to use Churvox Intelligence." };
  if (response.status === 403) return { success: false, tierLocked: true, detail: body?.detail || "This intelligence tool is not included in the current plan.", required_plan: body?.required_plan || "" };
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || `Churvox Intelligence request failed ${response.status}`);
  return body;
}

export async function fetchOwnerIntelligenceSummary() {
  return request("/api/owner-intelligence/summary");
}

export async function prepareMoneyLeftBehind(findingId, ownerNote = "") {
  if (!findingId) throw new Error("Choose a money finding first.");
  const body = await request(`/api/owner-intelligence/money-left-behind/${encodeURIComponent(findingId)}/prepare`, {
    method: "POST",
    body: JSON.stringify({ owner_note: ownerNote, prepared_only: true, owner_review_only: true }),
  });
  try { window.dispatchEvent(new CustomEvent(BACKEND_COMMAND_EVENT, { detail: body })); } catch {}
  return body;
}

export async function savePromiseMemory(payload = {}) {
  return request("/api/owner-intelligence/promise-memory", {
    method: "POST",
    body: JSON.stringify({ ...payload, owner_review_only: true }),
  });
}

export async function prepareVoiceToBusiness(text) {
  return request("/api/owner-intelligence/voice-to-business", {
    method: "POST",
    body: JSON.stringify({ text, prepared_only: true, owner_review_only: true }),
  });
}

export async function saveApprovalBudget(settings = {}) {
  return request("/api/owner-intelligence/approval-budget", {
    method: "POST",
    body: JSON.stringify({ ...settings, owner_review_only: true }),
  });
}

export async function runWhatIfScenario(payload = {}) {
  return request("/api/owner-intelligence/what-if", {
    method: "POST",
    body: JSON.stringify({ ...payload, simulation_only: true, no_records_changed: true }),
  });
}

export async function fetchWorkerProofCoach(jobId) {
  if (!jobId) return { success: false, checklist: [] };
  return request(`/api/worker/proof-coach/${encodeURIComponent(jobId)}`);
}

export async function checkWorkerProofCoach(jobId, payload = {}) {
  if (!jobId) throw new Error("A live assigned job is required.");
  return request(`/api/worker/proof-coach/${encodeURIComponent(jobId)}/check`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
